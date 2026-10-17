import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // DW-048: MainViewController (مو CAPBridgeViewController) عشان تتسجّل إضافاتنا: الودجت، المشاركة، التسجيل ← نص
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        // فتح بارد من اختصار الأيقونة: بعد ما ينبني الجسر
        if let item = connectionOptions.shortcutItem { DispatchQueue.main.async { self.openShortcut(item) } }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    // DW-048: اختصارات الأيقونة ← نفس روابط الودجت (bh.hayati.app://widget/…)، والواجهة تمسكها من appUrlOpen
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(openShortcut(shortcutItem))
    }

    @discardableResult
    private func openShortcut(_ item: UIApplicationShortcutItem) -> Bool {
        let prefix = "bh.hayati.app."
        guard item.type.hasPrefix(prefix), let url = URL(string: "bh.hayati.app://widget/" + item.type.dropFirst(prefix.count)) else { return false }
        return ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
}
