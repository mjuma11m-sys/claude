// يسلّم نص «شارك ← حياتي» من امتداد المشاركة بالآيفون للواجهة (DW-046)، بنفس شكل إضافة الأندرويد:
// take() ← {text} مرة وحدة، وحدث "shared" لو التطبيق كان مفتوح ورجع للواجهة.
// DW-062: أو {file, data (base64)} لملف انشارك (كشف حساب…)، والملف ينمسح من App Group بعد ما ينقرا.
import Capacitor
import Foundation
import UIKit

@objc(ShareInPlugin)
public class ShareInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareInPlugin"
    public let jsName = "ShareIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "take", returnType: CAPPluginReturnPromise),
    ]
    static let maxAge: TimeInterval = 24 * 3600

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(active), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    // الرسالة أو الملف ينقرا مرة وحدة وينمسح؛ أقدم من يوم = ينمسح بدون ما ينقرا
    static func pop() -> [String: Any]? {
        guard let d = UserDefaults(suiteName: "group.bh.hayati.app") else { return nil }
        let v = d.dictionary(forKey: "share")
        d.removeObject(forKey: "share")
        guard let at = v?["at"] as? Double, Date().timeIntervalSince1970 - at < maxAge else { clearFiles(); return nil }
        if let text = v?["text"] as? String, !text.isEmpty { return ["text": text] }
        guard let name = v?["file"] as? String,
              let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.bh.hayati.app")?.appendingPathComponent("share", isDirectory: true) else { return nil }
        let url = dir.appendingPathComponent((name as NSString).lastPathComponent)
        defer { clearFiles() }
        guard let data = try? Data(contentsOf: url), data.count <= 15 * 1024 * 1024 else { return nil }
        return ["file": url.lastPathComponent, "data": data.base64EncodedString()]
    }
    static func clearFiles() {
        if let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.bh.hayati.app")?.appendingPathComponent("share", isDirectory: true) {
            try? FileManager.default.removeItem(at: dir)
        }
    }

    @objc func active() {
        guard hasListeners("shared"), let v = ShareInPlugin.pop() else { return }
        notifyListeners("shared", data: v)
    }

    @objc func take(_ call: CAPPluginCall) {
        call.resolve(ShareInPlugin.pop() ?? [:])
    }
}
