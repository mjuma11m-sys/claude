// يوصل لقطة الودجت من الواجهة (Extras.Widget.push) للودجت عن طريق App Group (DW-044)
import Capacitor
import Foundation
import WidgetKit

@objc(WidgetPlugin)
public class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetPlugin"
    public let jsName = "HayatiWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "take", returnType: CAPPluginReturnPromise),
    ]
    static let maxBytes = 20000

    @objc func update(_ call: CAPPluginCall) {
        guard let data = call.getString("data"), data.utf8.count <= WidgetPlugin.maxBytes else { call.reject("bad data"); return }
        UserDefaults(suiteName: "group.bh.hayati.app")?.set(data, forKey: "data")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // أزرار الودجت بالآيفون تفتح رابط (bh.hayati.app://widget/…) والواجهة تمسكه من appUrlOpen، فهني ما فيه شي ينتظر
    @objc func take(_ call: CAPPluginCall) { call.resolve([:]) }
}
