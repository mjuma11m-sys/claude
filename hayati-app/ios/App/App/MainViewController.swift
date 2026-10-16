// يسجّل إضافاتنا (DW-044: ودجت الآيفون) بجسر Capacitor
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetPlugin())
    }
}
