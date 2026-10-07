import Capacitor

final class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(ScriptureNativePlugin.self)
    }
}
