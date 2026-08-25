import UIKit
import Capacitor

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
    private let topSystemChrome = UIVisualEffectView(effect: nil)
    private let bottomSystemChrome = UIVisualEffectView(effect: nil)

    override func viewDidLoad() {
        super.viewDidLoad()
        configureSystemChrome()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        view.backgroundColor = .systemBackground
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.underPageBackgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        webView?.scrollView.decelerationRate = .fast
        webView?.scrollView.keyboardDismissMode = .interactive
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.automaticallyAdjustsScrollIndicatorInsets = false
        webView?.allowsLinkPreview = false
        view.bringSubviewToFront(topSystemChrome)
        view.bringSubviewToFront(bottomSystemChrome)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        traitCollection.userInterfaceStyle == .dark ? .lightContent : .darkContent
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        guard previousTraitCollection?.userInterfaceStyle != traitCollection.userInterfaceStyle else { return }
        view.backgroundColor = .systemBackground
        setNeedsStatusBarAppearanceUpdate()
    }

    private func configureSystemChrome() {
        for chrome in [topSystemChrome, bottomSystemChrome] {
            chrome.translatesAutoresizingMaskIntoConstraints = false
            chrome.isUserInteractionEnabled = false
            chrome.accessibilityElementsHidden = true
            view.addSubview(chrome)
        }

        if #available(iOS 27.0, *) {
            let topGlass = UIGlassEffect(style: .regular)
            topGlass.isInteractive = false
            topSystemChrome.effect = topGlass

            let bottomGlass = UIGlassEffect(style: .regular)
            bottomGlass.isInteractive = false
            bottomSystemChrome.effect = bottomGlass
        } else {
            topSystemChrome.effect = UIBlurEffect(style: .systemUltraThinMaterial)
            bottomSystemChrome.effect = UIBlurEffect(style: .systemUltraThinMaterial)
        }

        NSLayoutConstraint.activate([
            topSystemChrome.topAnchor.constraint(equalTo: view.topAnchor),
            topSystemChrome.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topSystemChrome.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topSystemChrome.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            bottomSystemChrome.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            bottomSystemChrome.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomSystemChrome.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomSystemChrome.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }
}
