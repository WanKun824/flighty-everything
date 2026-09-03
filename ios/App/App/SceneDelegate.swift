import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = .systemBackground
        window?.rootViewController = FlightyBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class FlightyBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // The WKWebView is the root view. Do not add glass strips to its safe areas:
        // the map extends edge-to-edge while CSS insets only the interactive UI.
        view.backgroundColor = .black
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.underPageBackgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.decelerationRate = .fast
        webView?.scrollView.keyboardDismissMode = .interactive
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.automaticallyAdjustsScrollIndicatorInsets = false
        webView?.allowsLinkPreview = false
        webView?.scrollView.contentInset = .zero
        webView?.scrollView.scrollIndicatorInsets = .zero
        NotificationCenter.default.addObserver(self, selector: #selector(publishPresentation), name: UIAccessibility.reduceTransparencyStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(publishPresentation), name: UIAccessibility.darkerSystemColorsStatusDidChangeNotification, object: nil)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishPresentation()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishPresentation()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.publishPresentation() }
        if ProcessInfo.processInfo.environment["FLIGHTY_UI_QA"] == "1" {
            captureLayoutAudit(attempt: 0)
        }
    }

    @objc private func publishPresentation() {
        let insets = view.safeAreaInsets
        webView?.evaluateJavaScript("""
          document.documentElement.style.setProperty('--native-safe-top', '\(insets.top)px');
          document.documentElement.style.setProperty('--native-safe-bottom', '\(insets.bottom)px');
          document.documentElement.dataset.reduceTransparency = '\(UIAccessibility.isReduceTransparencyEnabled)';
          document.documentElement.dataset.increaseContrast = '\(UIAccessibility.isDarkerSystemColorsEnabled)';
        """, completionHandler: nil)
    }

    // CI-only geometry evidence from a running Simulator, never enabled in normal use.
    private func captureLayoutAudit(attempt: Int) {
        guard attempt < 20 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self else { return }
            self.publishPresentation()
            self.webView?.evaluateJavaScript("""
              (() => {
                const device = document.querySelector('.flighty-device');
                const nav = document.querySelector('.flight-tabbar');
                if (!device || !nav) return null;
                const r = device.getBoundingClientRect(), n = nav.getBoundingClientRect();
                const row = document.querySelector('.mobile-segment-card');
                return JSON.stringify({
                  viewport: { width: innerWidth, height: innerHeight },
                  device: { x: r.x, y: r.y, width: r.width, height: r.height },
                  nav: { top: n.top, bottom: n.bottom },
                  firstRowBottom: row?.getBoundingClientRect().bottom ?? 0,
                  safeBottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--native-safe-bottom')) || 0,
                  nativeShell: document.documentElement.hasAttribute('data-native-shell'),
                  rowBackground: row ? getComputedStyle(row).backgroundColor : null,
                  rowShadow: row ? getComputedStyle(row).boxShadow : null,
                  systemChromeDuplicates: getComputedStyle(document.querySelector('.ios-status')).display !== 'none'
                });
              })()
            """) { result, _ in
                guard let json = result as? String, let data = json.data(using: .utf8) else {
                    self.captureLayoutAudit(attempt: attempt + 1)
                    return
                }
                let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                try? data.write(to: directory.appendingPathComponent("layout-audit.json"), options: .atomic)
            }
        }
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}
