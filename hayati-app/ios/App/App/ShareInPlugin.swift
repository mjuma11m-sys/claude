// يسلّم نص «شارك ← حياتي» من امتداد المشاركة بالآيفون للواجهة (DW-046)، بنفس شكل إضافة الأندرويد:
// take() ← {text} مرة وحدة، وحدث "shared" لو التطبيق كان مفتوح ورجع للواجهة.
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

    // الرسالة تنقرا مرة وحدة وتنمسح؛ أقدم من يوم = تنمسح بدون ما تنقرا
    static func pop() -> String? {
        guard let d = UserDefaults(suiteName: "group.bh.hayati.app") else { return nil }
        let v = d.dictionary(forKey: "share")
        d.removeObject(forKey: "share")
        guard let text = v?["text"] as? String, let at = v?["at"] as? Double,
              Date().timeIntervalSince1970 - at < maxAge, !text.isEmpty else { return nil }
        return text
    }

    @objc func active() {
        guard hasListeners("shared"), let text = ShareInPlugin.pop() else { return }
        notifyListeners("shared", data: ["text": text])
    }

    @objc func take(_ call: CAPPluginCall) {
        if let text = ShareInPlugin.pop() { call.resolve(["text": text]) } else { call.resolve([:]) }
    }
}
