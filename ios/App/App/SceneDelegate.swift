import UIKit
import Capacitor

class DiagnosticBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            self?.webView?.evaluateJavaScript("""
                window.__cloudkiDiagnostic = 'running';
                void (async () => {
                  const cap = window.Capacitor;
                  const report = {platform: cap?.getPlatform(), available: cap?.isPluginAvailable('LiveUpdate')};
                  const plugin = cap?.Plugins?.LiveUpdate;
                  if (!plugin) { report.error = 'plugin not registered'; window.__cloudkiDiagnostic = JSON.stringify(report); return; }
                  for (const name of ['ready','getCurrentBundle','getNextBundle','getVersionName','getDownloadedBundles']) {
                    report[name] = await Promise.race([
                      plugin[name]().then(value => ({ok:true,value}), error => ({error:String(error)})),
                      new Promise(resolve => setTimeout(() => resolve({timeout:true}), 2000))
                    ]);
                  }
                  window.__cloudkiDiagnostic = JSON.stringify(report);
                })();
                'started';
                """, completionHandler: nil)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
            self?.webView?.evaluateJavaScript("window.__cloudkiDiagnostic || 'missing'") { value, error in
                let output = String(describing: value ?? error?.localizedDescription ?? "no response")
                let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("cloudki-diagnostic.txt")
                try? output.write(to: url, atomically: true, encoding: .utf8)
            }
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
