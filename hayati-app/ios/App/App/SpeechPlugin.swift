// تحويل تسجيل المحاضرة لنص (DW-047): على الجهاز بس (requiresOnDeviceRecognition)، الصوت ما يطلع من الجوال.
// الواجهة تسأل available() أول؛ لو الجهاز ما يدعم اللغة بدون نت، الزر ما يطلع.
import Capacitor
import Foundation
import Speech

@objc(SpeechPlugin)
public class SpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeechPlugin"
    public let jsName = "HayatiSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transcribe", returnType: CAPPluginReturnPromise),
    ]
    static let maxBytes = 25_000_000
    private var recognizer: SFSpeechRecognizer?
    private var task: SFSpeechRecognitionTask?

    private static func locale(_ lang: String?) -> Locale { Locale(identifier: lang == "en" ? "en-US" : "ar-SA") }

    @objc func available(_ call: CAPPluginCall) {
        let r = SFSpeechRecognizer(locale: SpeechPlugin.locale(call.getString("lang")))
        call.resolve(["onDevice": r?.supportsOnDeviceRecognition ?? false])
    }

    @objc func transcribe(_ call: CAPPluginCall) {
        guard task == nil else { call.reject("busy"); return }
        guard let b64 = call.getString("data"), let data = Data(base64Encoded: b64) else { call.reject("bad"); return }
        guard data.count <= SpeechPlugin.maxBytes else { call.reject("big"); return }
        let mime = call.getString("mime") ?? ""
        let ext = mime.contains("mp4") || mime.contains("m4a") || mime.contains("aac") ? "m4a" : mime.contains("wav") ? "wav" : ""
        guard !ext.isEmpty else { call.reject("format"); return }
        let lang = call.getString("lang")
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                guard status == .authorized else { call.reject("denied"); return }
                self.run(call, data: data, ext: ext, lang: lang)
            }
        }
    }

    private func run(_ call: CAPPluginCall, data: Data, ext: String, lang: String?) {
        guard let r = SFSpeechRecognizer(locale: SpeechPlugin.locale(lang)), r.supportsOnDeviceRecognition else { call.reject("unsupported"); return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "." + ext)
        do { try data.write(to: url, options: .completeFileProtection) } catch { call.reject("bad"); return }
        let req = SFSpeechURLRecognitionRequest(url: url)
        req.requiresOnDeviceRecognition = true   // ما نستخدم سيرفرات Apple أبداً
        req.shouldReportPartialResults = false
        if #available(iOS 16.0, *) { req.addsPunctuation = true }
        var done = false
        let finish: (String?, String?) -> Void = { text, err in
            if done { return }
            done = true
            try? FileManager.default.removeItem(at: url)
            self.task = nil; self.recognizer = nil
            if let text = text { call.resolve(["text": text]) } else { call.reject(err ?? "failed") }
        }
        recognizer = r
        task = r.recognitionTask(with: req) { result, error in
            DispatchQueue.main.async {
                if let result = result, result.isFinal { finish(result.bestTranscription.formattedString, nil) }
                else if error != nil { finish(nil, "failed") }
            }
        }
    }
}
