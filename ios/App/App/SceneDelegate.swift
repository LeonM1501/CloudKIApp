import UIKit
import Capacitor

class DiagnosticBridgeViewController: CAPBridgeViewController {
    private func save(_ name: String, script: String) {
        webView?.evaluateJavaScript(script) { value, error in
            let output = String(describing: value ?? error?.localizedDescription ?? "no response")
            let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent(name)
            try? output.write(to: url, atomically: true, encoding: .utf8)
        }
    }
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            self?.webView?.evaluateJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Nach Update suchen'))?.click()", completionHandler: nil)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 28) { [weak self] in
            self?.save("cloudki-before.txt", script: "document.body.innerText")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 90) { [weak self] in
            self?.webView?.evaluateJavaScript("window.__simCurrent='waiting'; window.Capacitor.Plugins.LiveUpdate.getCurrentBundle().then(x => window.__simCurrent=JSON.stringify(x), e => window.__simCurrent=String(e)); 'started'", completionHandler: nil)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 96) { [weak self] in
            self?.save("cloudki-after.txt", script: "JSON.stringify({stored:sessionStorage.getItem('cloudki.simulator.result'),current:window.__simCurrent})")
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = DiagnosticBridgeViewController()
        window?.makeKeyAndVisible()
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) { SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts) }
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) { SceneDelegateProxy.shared.scene(scene, continue: userActivity) }
}
