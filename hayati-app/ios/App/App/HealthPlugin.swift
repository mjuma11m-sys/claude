// DW-053: تطبيق الصحة (Apple Health) — قراءة بس: النوم ومراحله، نبض الراحة، HRV، والخطوات.
// يجي من Apple Watch أو أي ساعة/تطبيق يكتب بتطبيق الصحة. ما نكتب شي فيه، والأرقام تنحفظ بيوميات «صحتي».
import Capacitor
import Foundation
import HealthKit

@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "HayatiHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
    ]
    private let store = HKHealthStore()

    private var readTypes: Set<HKObjectType> {
        var s = Set<HKObjectType>()
        if let t = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { s.insert(t) }
        for id in [HKQuantityTypeIdentifier.stepCount, .restingHeartRate, .heartRateVariabilitySDNN] {
            if let t = HKObjectType.quantityType(forIdentifier: id) { s.insert(t) }
        }
        return s
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    // iOS ما يقول إذا المستخدم رفض القراءة (خصوصية)؛ لو رفض، read يرجع أيام فاضية بس
    @objc func authorize(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("unavailable"); return }
        store.requestAuthorization(toShare: nil, read: readTypes) { ok, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["ok": ok])
        }
    }

    // آخر N يوم (الافتراضي 7): [{date, steps, rhr, hrv, sleep, deep, rem, core, awake}] — النوم بالساعات، ينحسب لليوم اللي صحيت فيه
    @objc func read(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("unavailable"); return }
        let days = max(1, min(30, call.getInt("days") ?? 7))
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard let start = cal.date(byAdding: .day, value: -(days - 1), to: today),
              let sleepFrom = cal.date(byAdding: .hour, value: -12, to: start) else { call.reject("date"); return }
        let end = Date()
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.timeZone = cal.timeZone
        fmt.dateFormat = "yyyy-MM-dd"

        var out: [String: [String: Any]] = [:]
        let lock = NSLock()
        func put(_ key: String, _ field: String, _ value: Double) {
            lock.lock(); defer { lock.unlock() }
            var d = out[key] ?? [:]
            d[field] = value
            out[key] = d
        }
        let group = DispatchGroup()

        // مجموع أو معدل لكل يوم (HealthKit يشيل التكرار بين الساعة والجوال)
        func perDay(_ id: HKQuantityTypeIdentifier, _ unit: HKUnit, _ options: HKStatisticsOptions, _ field: String) {
            guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
            group.enter()
            let q = HKStatisticsCollectionQuery(
                quantityType: type,
                quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end),
                options: options, anchorDate: today, intervalComponents: DateComponents(day: 1))
            q.initialResultsHandler = { _, results, _ in
                results?.enumerateStatistics(from: start, to: end) { s, _ in
                    let qty = options.contains(.cumulativeSum) ? s.sumQuantity() : s.averageQuantity()
                    if let qty = qty { put(fmt.string(from: s.startDate), field, qty.doubleValue(for: unit)) }
                }
                group.leave()
            }
            store.execute(q)
        }
        perDay(.stepCount, HKUnit.count(), .cumulativeSum, "steps")
        perDay(.restingHeartRate, HKUnit.count().unitDivided(by: HKUnit.minute()), .discreteAverage, "rhr")
        perDay(.heartRateVariabilitySDNN, HKUnit.secondUnit(with: .milli), .discreteAverage, "hrv")

        // النوم: لو فيه أكثر من مصدر (ساعتين، أو ساعة + خاتم) ناخذ المصدر اللي سجّل أطول نوم بدال ما نجمعهم
        if let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            group.enter()
            let q = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: sleepFrom, end: end),
                                  limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let inBed = HKCategoryValueSleepAnalysis.inBed.rawValue, awake = HKCategoryValueSleepAnalysis.awake.rawValue
                var acc: [String: [String: [Int: Double]]] = [:]   // اليوم ← المصدر ← المرحلة ← ثواني
                for case let s as HKCategorySample in samples ?? [] {
                    let key = fmt.string(from: s.endDate.addingTimeInterval(6 * 3600))   // نوم يخلص قبل 6 المسا = ليلة هاليوم
                    let src = s.sourceRevision.source.bundleIdentifier
                    acc[key, default: [:]][src, default: [:]][s.value, default: 0] += s.endDate.timeIntervalSince(s.startDate)
                }
                func asleep(_ v: [Int: Double]) -> Double { v.filter { $0.key != inBed && $0.key != awake }.values.reduce(0, +) }
                for (key, bySource) in acc {
                    guard let best = bySource.values.max(by: { asleep($0) < asleep($1) }), asleep(best) > 0 else { continue }
                    put(key, "sleep", asleep(best) / 3600)
                    if let v = best[awake] { put(key, "awake", v / 3600) }
                    if #available(iOS 16.0, *) {
                        if let v = best[HKCategoryValueSleepAnalysis.asleepDeep.rawValue] { put(key, "deep", v / 3600) }
                        if let v = best[HKCategoryValueSleepAnalysis.asleepREM.rawValue] { put(key, "rem", v / 3600) }
                        if let v = best[HKCategoryValueSleepAnalysis.asleepCore.rawValue] { put(key, "core", v / 3600) }
                    }
                }
                group.leave()
            }
            store.execute(q)
        }

        group.notify(queue: .main) {
            let list: [[String: Any]] = out.keys.sorted().compactMap { key in
                guard var d = out[key] else { return nil }
                d["date"] = key
                return d
            }
            call.resolve(["days": list])
        }
    }
}
