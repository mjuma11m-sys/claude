// يسجّل إضافاتنا بجسر Capacitor (DW-044: ودجت الآيفون · DW-046: «شارك ← حياتي» · DW-047: تسجيل ← نص · DW-053: تطبيق الصحة)
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetPlugin())
        bridge?.registerPluginInstance(ShareInPlugin())
        bridge?.registerPluginInstance(SpeechPlugin())
        bridge?.registerPluginInstance(HealthPlugin())
        bridge?.registerPluginInstance(RecorderPlugin())
    }
}
