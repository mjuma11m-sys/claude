// DW-069: تسجيل المحاضرة يكمل لو طلعت من التطبيق أو قفلت الشاشة.
// تسجيل الويب (MediaRecorder) يوقف أول ما التطبيق يروح للخلفية، فهني نسجّل بـ AVAudioRecorder
// مع UIBackgroundModes=audio. الملف يظل بالجوال (ما ينرفع)، ولما يوقف نرجعه للواجهة وتحفظه مثل قبل وننحذف نسختنا.
// مكالمة أو Siri توقف المايك مؤقتاً، وبعدها نكمل التسجيل بنفس الملف.
import AVFoundation
import Capacitor
import Foundation

@objc(RecorderPlugin)
public class RecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RecorderPlugin"
    public let jsName = "HayatiRecorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discard", returnType: CAPPluginReturnPromise),
    ]
    static let maxSeconds: TimeInterval = 3 * 3600   // 3 ساعات ≈ 32MB بهالجودة
    private var recorder: AVAudioRecorder?
    private var startedAt: Date?
    private var observer: NSObjectProtocol?

    private static var dir: URL {
        let d = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }
    private static var file: URL { dir.appendingPathComponent("current.m4a") }

    @objc func start(_ call: CAPPluginCall) {
        guard recorder == nil else { call.reject("busy"); return }
        AVAudioSession.sharedInstance().requestRecordPermission { ok in
            DispatchQueue.main.async {
                guard ok else { call.reject("denied"); return }
                self.begin(call)
            }
        }
    }

    private func begin(_ call: CAPPluginCall) {
        let s = AVAudioSession.sharedInstance()
        do {
            try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try s.setActive(true)
        } catch { call.reject("session"); return }
        focusForward(s)
        try? FileManager.default.removeItem(at: RecorderPlugin.file)
        // صوت كلام: AAC أحادي 16kHz ≈ 11MB بالساعة
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 24000,
        ]
        do {
            let r = try AVAudioRecorder(url: RecorderPlugin.file, settings: settings)
            guard r.record(forDuration: RecorderPlugin.maxSeconds) else { call.reject("failed"); return }
            recorder = r
            startedAt = Date()
            // الجوال مقفول: الملف لازم ينكتب، فالحماية «لين أول فتح» مو «كاملة»
            try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: RecorderPlugin.file.path)
            observer = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: s, queue: .main) { [weak self] n in
                guard let self = self, let r = self.recorder,
                      let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                      AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
                try? AVAudioSession.sharedInstance().setActive(true)
                if !r.isRecording { r.record() }
            }
            call.resolve(["startedAt": Int(startedAt!.timeIntervalSince1970 * 1000)])
        } catch { call.reject("failed") }
    }

    // السوالف الجانبية: نختار مايك ظهر الجوال باتجاه «cardioid» (يلقط اللي قدامه أكثر من اللي وراه وجنبه).
    // الجوال على الطاولة وظهره للدكتور ← صوت الدكتور أوضح والكلام اللي جنب الطالب يخف. يخفّف، ما يمسح.
    // لو الجوال ما يدعمها (أو مايك بلوتوث) نكمل بالمايك العادي.
    private func focusForward(_ s: AVAudioSession) {
        guard let mic = s.availableInputs?.first(where: { $0.portType == .builtInMic }) else { return }
        try? s.setPreferredInput(mic)
        guard let back = mic.dataSources?.first(where: { $0.orientation == .back }) else { return }
        if back.supportedPolarPatterns?.contains(.cardioid) == true { try? back.setPreferredPolarPattern(.cardioid) }
        try? mic.setPreferredDataSource(back)
    }

    @objc func status(_ call: CAPPluginCall) {
        guard let at = startedAt, recorder != nil else { call.resolve(["recording": false]); return }
        call.resolve(["recording": true, "startedAt": Int(at.timeIntervalSince1970 * 1000)])
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard let r = recorder else { call.reject("idle"); return }
        let dur = r.currentTime > 0 ? r.currentTime : Date().timeIntervalSince(startedAt ?? Date())
        r.stop()
        finish()
        guard let data = try? Data(contentsOf: RecorderPlugin.file) else { call.reject("failed"); return }
        try? FileManager.default.removeItem(at: RecorderPlugin.file)
        call.resolve(["data": data.base64EncodedString(), "mime": "audio/mp4", "dur": Int(dur.rounded())])
    }

    @objc func discard(_ call: CAPPluginCall) {
        recorder?.stop()
        finish()
        try? FileManager.default.removeItem(at: RecorderPlugin.file)
        call.resolve()
    }

    private func finish() {
        if let o = observer { NotificationCenter.default.removeObserver(o) }
        observer = nil
        recorder = nil
        startedAt = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
