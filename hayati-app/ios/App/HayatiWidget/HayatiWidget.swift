// «ودجت حياتي» على آيفون (DW-044): نفس لقطة ودجت الأندرويد (Extras.Widget.snapshot)،
// التطبيق يكتبها بـ App Group «group.bh.hayati.app» والودجت يقراها. حجمين: صغير (الميزانية) ومتوسط (الجاي + الميزانية).
// DW-055: ودجت ثاني «جدول اليوم» (متوسط/كبير) + شاشة القفل (مستطيل وسطر)، من نفس اللقطة (sched).
// الخصوصية: المبالغ مخفية إلا لو فعّلها المستخدم، ووقت قفل التطبيق 🔒 بس (نفس قرار DW-031).
import SwiftUI
import WidgetKit

let hayatiGroup = "group.bh.hayati.app"

struct Snap {
    var locked = false
    var rtl = true
    var labels: [String: String] = [:]
    var budgetLine = ""
    var budgetPct = -1
    var smallBig = ""
    var smallCap = ""
    var items: [(t: Date, title: String, sub: String, time: String)] = []
    var sched: [SchedItem] = []
    var empty = true

    func label(_ k: String, _ d: String) -> String { labels[k] ?? d }

    static func load() -> Snap {
        var s = Snap()
        guard let raw = UserDefaults(suiteName: hayatiGroup)?.string(forKey: "data"),
              let obj = try? JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any] else { return s }
        s.empty = false
        s.locked = obj["locked"] as? Bool ?? false
        s.rtl = obj["rtl"] as? Bool ?? true
        s.labels = obj["labels"] as? [String: String] ?? [:]
        if let b = obj["budget"] as? [String: Any] { s.budgetLine = b["line"] as? String ?? ""; s.budgetPct = b["pct"] as? Int ?? -1 }
        if let m = obj["small"] as? [String: Any] { s.smallBig = m["big"] as? String ?? ""; s.smallCap = m["cap"] as? String ?? "" }
        for it in obj["items"] as? [[String: Any]] ?? [] {
            guard let ms = it["t"] as? Double else { continue }
            s.items.append((Date(timeIntervalSince1970: ms / 1000), it["title"] as? String ?? "", it["sub"] as? String ?? "", it["time"] as? String ?? ""))
        }
        for it in obj["sched"] as? [[String: Any]] ?? [] {
            guard let a = it["s"] as? Double, let b = it["e"] as? Double else { continue }
            s.sched.append(SchedItem(start: Date(timeIntervalSince1970: a / 1000), end: Date(timeIntervalSince1970: b / 1000),
                                     title: it["title"] as? String ?? "", sub: it["sub"] as? String ?? "",
                                     time: it["time"] as? String ?? "", color: Color(hex: it["c"] as? String ?? "")))
        }
        return s
    }

    // جدول اليوم؛ لو خلص كله (أو فاضي) نعرض بكرة
    func day(at d: Date) -> (items: [SchedItem], tomorrow: Bool) {
        let cal = Calendar.current
        let today = sched.filter { cal.isDate($0.start, inSameDayAs: d) }
        if today.contains(where: { $0.end > d }) { return (today, false) }
        guard let t = cal.date(byAdding: .day, value: 1, to: d) else { return (today, false) }
        let next = sched.filter { cal.isDate($0.start, inSameDayAs: t) }
        return next.isEmpty ? (today, false) : (next, true)
    }

    // أقرب شي من الوقت (اللي بدأ قبل أقل من نص ساعة يظل)، نفس منطق HayatiWidget.java
    func next(at d: Date) -> (t: Date, title: String, sub: String, time: String)? {
        items.first { $0.t > d.addingTimeInterval(-30 * 60) }
    }
}

struct SchedItem {
    let start: Date
    let end: Date
    let title: String
    let sub: String
    let time: String
    let color: Color
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        if h.count == 6, Scanner(string: h).scanHexInt64(&v) {
            self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
        } else {
            self.init(red: 0.561, green: 0.839, blue: 0.820)
        }
    }
}

struct HayatiEntry: TimelineEntry {
    let date: Date
    let snap: Snap
}

struct HayatiProvider: TimelineProvider {
    func placeholder(in context: Context) -> HayatiEntry { HayatiEntry(date: Date(), snap: Snap()) }
    func getSnapshot(in context: Context, completion: @escaping (HayatiEntry) -> Void) { completion(HayatiEntry(date: Date(), snap: Snap.load())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<HayatiEntry>) -> Void) {
        let snap = Snap.load(), now = Date()
        // نقطة كل نص ساعة لين 6 ساعات، عشان «الجاي» يتغيّر مع الوقت حتى لو التطبيق مسكّر
        // + نقطة عند بداية ونهاية كل حصة عشان «الحين» يتحرك بوقته
        let limit = now.addingTimeInterval(6 * 3600)
        var times = Set((0..<12).map { now.addingTimeInterval(Double($0) * 1800) })
        for it in snap.sched { for t in [it.start, it.end] where t > now && t < limit { times.insert(t) } }
        let entries = times.sorted().map { HayatiEntry(date: $0, snap: snap) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(6 * 3600))))
    }
}

let sea = Color(red: 0.075, green: 0.388, blue: 0.420)
let sea2 = Color(red: 0.055, green: 0.290, blue: 0.314)
let mint = Color(red: 0.561, green: 0.839, blue: 0.820)
let addURL = URL(string: "bh.hayati.app://widget/add-tx")!
let pasteURL = URL(string: "bh.hayati.app://widget/paste-sms")!

struct Bar: View {
    let pct: Int
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.2))
                Capsule().fill(mint).frame(width: g.size.width * CGFloat(max(0, min(100, pct))) / 100)
            }
        }.frame(height: 6)
    }
}

struct Btn: View {
    let text: String
    let url: URL
    var body: some View {
        Link(destination: url) {
            Text(text).font(.system(size: 14, weight: .bold)).lineLimit(1).minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity).padding(.vertical, 9)
                .background(Color.white.opacity(0.15)).clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

struct SmallView: View {
    let e: HayatiEntry
    var body: some View {
        let s = e.snap
        VStack(spacing: 6) {
            if s.empty {
                Text("حياتي").font(.system(size: 22, weight: .bold))
                Text(s.label("open", "افتح حياتي مرة")).font(.system(size: 12)).opacity(0.8)
            } else if s.locked {
                Text("🔒").font(.system(size: 34))
                Text(s.label("locked", "")).font(.system(size: 12)).opacity(0.8).multilineTextAlignment(.center)
            } else {
                Text(s.smallBig.isEmpty ? "+" : s.smallBig).font(.system(size: 34, weight: .bold)).lineLimit(1).minimumScaleFactor(0.5)
                Text(s.smallCap).font(.system(size: 12)).opacity(0.85).multilineTextAlignment(.center).lineLimit(2)
                if s.budgetPct >= 0 { Bar(pct: s.budgetPct) }
            }
            Spacer(minLength: 0)
            Btn(text: s.label("add", "+ مصروف"), url: addURL)
        }
        .foregroundColor(.white)
    }
}

struct MediumView: View {
    let e: HayatiEntry
    var body: some View {
        let s = e.snap
        VStack(alignment: .leading, spacing: 4) {
            if s.empty {
                Text("افتح حياتي مرة عشان يتعبّى الودجت").font(.system(size: 15, weight: .bold))
            } else if s.locked {
                Text(s.label("locked", "🔒")).font(.system(size: 17, weight: .bold))
            } else {
                if let n = s.next(at: e.date) {
                    let tomorrow = !Calendar.current.isDate(n.t, inSameDayAs: e.date)
                    Text(s.label("next", "") + " · " + (tomorrow ? s.label("tomorrow", "") + " · " : "") + n.time).font(.system(size: 12)).opacity(0.72)
                    Text(n.title).font(.system(size: 17, weight: .bold)).lineLimit(1)
                    if !n.sub.isEmpty { Text(n.sub).font(.system(size: 12)).opacity(0.8).lineLimit(1) }
                } else {
                    Text(s.label("next", "")).font(.system(size: 12)).opacity(0.72)
                    Text(s.label("none", "")).font(.system(size: 16, weight: .bold)).lineLimit(1)
                }
                Text(s.budgetLine).font(.system(size: 13)).padding(.top, 4).lineLimit(1)
                if s.budgetPct >= 0 { Bar(pct: s.budgetPct) }
            }
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                Btn(text: s.label("add", "+ مصروف"), url: addURL)
                Btn(text: s.label("paste", "الصق رسالة"), url: pasteURL)
            }
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct HayatiWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: HayatiEntry
    var body: some View {
        Group {
            if family == .systemSmall { SmallView(e: entry) } else { MediumView(e: entry) }
        }
        .environment(\.layoutDirection, entry.snap.rtl ? .rightToLeft : .leftToRight)
        .containerBackground(for: .widget) { LinearGradient(colors: [sea, sea2], startPoint: .topLeading, endPoint: .bottomTrailing) }
        .widgetURL(URL(string: "bh.hayati.app://widget/open"))
    }
}

// ================= «جدول اليوم» (DW-055) =================
struct SchedRow: View {
    let it: SchedItem
    let now: Date
    let nowLabel: String
    var body: some View {
        let past = it.end <= now, live = it.start <= now && now < it.end
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2).fill(it.color).frame(width: 4)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(it.time).font(.system(size: 11, weight: .medium)).opacity(0.75).lineLimit(1)
                    if live { Text(nowLabel).font(.system(size: 10, weight: .bold)).padding(.horizontal, 6).padding(.vertical, 1).background(mint.opacity(0.35)).clipShape(Capsule()) }
                }
                Text(it.title).font(.system(size: 14, weight: .bold)).lineLimit(1)
                if !it.sub.isEmpty { Text(it.sub).font(.system(size: 11)).opacity(0.75).lineLimit(1) }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 3).padding(.horizontal, 6)
        .background(live ? Color.white.opacity(0.14) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .opacity(past ? 0.45 : 1)
    }
}

struct ScheduleView: View {
    let e: HayatiEntry
    let rows: Int
    var body: some View {
        let s = e.snap
        let d = s.day(at: e.date)
        // نبدأ من الحالي أو الجاي، ونخلي وحدة خالصة قبله لو فيه مكان
        let first = d.items.firstIndex { $0.end > e.date } ?? max(0, d.items.count - rows)
        let from = max(0, min(first - (rows > 3 ? 1 : 0), d.items.count - rows))
        let shown = Array(d.items.dropFirst(from).prefix(rows))
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(d.tomorrow ? s.label("schedTomorrow", "جدول بكرة") : s.label("schedToday", "جدول اليوم")).font(.system(size: 13, weight: .bold)).opacity(0.85)
                Spacer()
                if !d.items.isEmpty { Text("\(d.items.count)").font(.system(size: 12, weight: .bold)).opacity(0.6) }
            }
            if s.empty {
                Text(s.label("open", "افتح حياتي مرة عشان يتعبّى الودجت")).font(.system(size: 14, weight: .bold))
            } else if s.locked {
                Text(s.label("locked", "🔒")).font(.system(size: 17, weight: .bold))
            } else if shown.isEmpty {
                Spacer(minLength: 0)
                Text(s.label("free", "ما فيه شي اليوم وبكرة 🎉")).font(.system(size: 15, weight: .bold))
            } else {
                ForEach(Array(shown.enumerated()), id: \.offset) { _, it in SchedRow(it: it, now: e.date, nowLabel: s.label("now", "الحين")) }
            }
            Spacer(minLength: 0)
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// شاشة القفل: الحالي أو الجاي
struct LockView: View {
    @Environment(\.widgetFamily) var family
    let e: HayatiEntry
    var body: some View {
        let s = e.snap
        let n = s.locked ? nil : s.sched.first { $0.end > e.date }
        let live = n.map { $0.start <= e.date } ?? false
        if family == .accessoryInline {
            Text(n.map { (live ? s.label("now", "الحين") : $0.time.components(separatedBy: " – ").first ?? "") + " · " + $0.title } ?? (s.locked ? "🔒" : s.label("free", "")))
        } else {
            VStack(alignment: .leading, spacing: 1) {
                if let n = n {
                    Text(live ? s.label("now", "الحين") + " · " + n.time : n.time).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                    Text(n.title).font(.system(size: 15, weight: .bold)).lineLimit(1)
                    if !n.sub.isEmpty { Text(n.sub).font(.system(size: 12)).lineLimit(1) }
                } else {
                    Text(s.locked ? "🔒" : s.label("free", "")).font(.system(size: 13, weight: .semibold)).lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct ScheduleWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: HayatiEntry
    var body: some View {
        Group {
            switch family {
            case .accessoryRectangular, .accessoryInline: LockView(e: entry).containerBackground(for: .widget) { Color.clear }
            default:
                ScheduleView(e: entry, rows: family == .systemLarge ? 7 : 3)
                    .containerBackground(for: .widget) { LinearGradient(colors: [sea, sea2], startPoint: .topLeading, endPoint: .bottomTrailing) }
            }
        }
        .environment(\.layoutDirection, entry.snap.rtl ? .rightToLeft : .leftToRight)
        .widgetURL(URL(string: "bh.hayati.app://widget/open"))
    }
}

struct HayatiScheduleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HayatiSchedule", provider: HayatiProvider()) { e in ScheduleWidgetView(entry: e) }
            .configurationDisplayName("جدول اليوم")
            .description("جدولك اليوم كامل، والحين والجاي، حتى على شاشة القفل")
            .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

@main
struct HayatiWidgets: WidgetBundle {
    var body: some Widget {
        HayatiWidget()
        HayatiScheduleWidget()
    }
}

struct HayatiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HayatiWidget", provider: HayatiProvider()) { e in HayatiWidgetView(entry: e) }
            .configurationDisplayName("حياتي")
            .description("الجاي اليوم وبكرة، والميزانية، وزر «+ مصروف»")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
