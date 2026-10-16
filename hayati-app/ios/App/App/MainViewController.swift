// يسجّل إضافاتنا بجسر Capacitor (DW-044: ودجت الآيفون · DW-046: «شارك ← حياتي»)
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetPlugin())
        bridge?.registerPluginInstance(ShareInPlugin())
    }
}
