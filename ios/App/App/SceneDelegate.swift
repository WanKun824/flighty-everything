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
    private var observesWindowAppearance = false
    private let chromeHost = FlightyPassthroughView()
    private let qaMarker = UILabel()
    private var qaTrail: [[String: Any]] = []
    private var lastQAFingerprint = ""
    private var chromeBars: [String: FlightyGlassBar] = [:]
    private lazy var chromeHandler = FlightyChromeHandler(owner: self)
    private lazy var backGesture = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleBackGesture(_:)))
    private var canNavigateBack = false
    private var isUIQA: Bool { ProcessInfo.processInfo.environment["FLIGHTY_UI_QA"] == "1" }
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
        chromeHost.frame = view.bounds
        chromeHost.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        if isUIQA {
            // Keep simulator interaction checks fast and deterministic. The web UI is
            // still rendered and receives real touches, but XCTest only snapshots this
            // compact native state marker instead of the entire Mapbox accessibility tree.
            webView?.accessibilityElementsHidden = true
            qaMarker.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
            qaMarker.autoresizingMask = [.flexibleRightMargin, .flexibleBottomMargin]
            qaMarker.text = " "
            qaMarker.textColor = .clear
            qaMarker.backgroundColor = .clear
            qaMarker.isUserInteractionEnabled = false
            qaMarker.isAccessibilityElement = true
            qaMarker.accessibilityIdentifier = "flighty-native-chrome"
            qaMarker.accessibilityLabel = "Flighty native chrome"
            qaMarker.accessibilityValue = "loading"
            try? FileManager.default.removeItem(at: interactionAuditURL)
        }
        view.addSubview(chromeHost)
        if isUIQA { view.addSubview(qaMarker) }
        webView?.configuration.userContentController.add(chromeHandler, name: "flightyChrome")
        notifyWebChromeReady()
        backGesture.edges = .left
        backGesture.delegate = self
        view.addGestureRecognizer(backGesture)
        NotificationCenter.default.addObserver(self, selector: #selector(publishPresentation), name: UIAccessibility.reduceTransparencyStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(publishPresentation), name: UIAccessibility.darkerSystemColorsStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(publishPresentation), name: UIApplication.didBecomeActiveNotification, object: nil)
        registerForTraitChanges([UITraitUserInterfaceStyle.self], action: #selector(publishPresentation))
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
        if !observesWindowAppearance, let window = view.window {
            observesWindowAppearance = true
            window.registerForTraitChanges([UITraitUserInterfaceStyle.self]) { [weak self] (_: UIWindow, _: UITraitCollection) in
                self?.publishPresentation()
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            self?.publishPresentation()
            self?.notifyWebChromeReady()
        }
        if isUIQA {
            captureLayoutAudit(attempt: 0)
        }
    }

    @objc private func publishPresentation() {
        let insets = view.safeAreaInsets
        let systemStyle = view.window?.windowScene?.traitCollection.userInterfaceStyle ?? traitCollection.userInterfaceStyle
        webView?.evaluateJavaScript("""
          document.documentElement.style.setProperty('--native-safe-top', '\(insets.top)px');
          document.documentElement.style.setProperty('--native-safe-bottom', '\(insets.bottom)px');
          document.documentElement.dataset.reduceTransparency = '\(UIAccessibility.isReduceTransparencyEnabled)';
          document.documentElement.dataset.increaseContrast = '\(UIAccessibility.isDarkerSystemColorsEnabled)';
          (() => {
            const root = document.documentElement;
            const theme = '\(systemStyle == .dark ? "dark" : "light")';
            if (root.dataset.nativeSystemTheme !== theme) {
              root.dataset.nativeSystemTheme = theme;
              window.dispatchEvent(new Event('flighty-native-appearance-change'));
            }
          })();
        """, completionHandler: nil)
    }

    private func notifyWebChromeReady() {
        webView?.evaluateJavaScript("window.dispatchEvent(new Event('flighty-native-ready'));", completionHandler: nil)
    }

    fileprivate func updateChrome(_ message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.webView === webView,
              webView?.url?.scheme == "capacitor",
              let payload = message.body as? [String: Any],
              let bars = payload["bars"] as? [[String: Any]] else { return }
        canNavigateBack = payload["backEnabled"] as? Bool ?? false
        chromeHost.overrideUserInterfaceStyle = payload["theme"] as? String == "dark" ? .dark : .light
        let identifiers = Set(bars.compactMap { $0["id"] as? String })
        for (id, bar) in chromeBars where !identifiers.contains(id) { bar.isHidden = true }
        for item in bars {
            guard let id = item["id"] as? String, ["tabs", "search", "map", "follow"].contains(id),
                  let frame = FlightyGlassBar.rect(item["rect"]),
                  let buttons = item["buttons"] as? [[String: Any]] else { continue }
            let bar: FlightyGlassBar
            if let existing = chromeBars[id] { bar = existing }
            else {
                bar = FlightyGlassBar()
                bar.onAction = { [weak self] id in
                    guard let data = try? JSONEncoder().encode(id), let encoded = String(data: data, encoding: .utf8) else { return }
                    self?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('flighty-native-chrome-action', {detail: \(encoded)}));", completionHandler: nil)
                }
                chromeBars[id] = bar
                chromeHost.addSubview(bar)
            }
            bar.isHidden = false
            bar.frame = frame
            bar.update(buttons)
        }
        if isUIQA {
            var state = payload["qa"] as? [String: Any] ?? [:]
            state["ready"] = true
            state["backEnabled"] = canNavigateBack
            state["bars"] = bars.compactMap { $0["id"] as? String }.sorted()
            if let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]),
               let value = String(data: data, encoding: .utf8) {
                qaMarker.accessibilityValue = value
                recordInteractionState(state, fingerprint: value)
            }
        }
        webView?.evaluateJavaScript("document.documentElement.dataset.nativeChrome = 'true';", completionHandler: nil)
    }

    private var interactionAuditURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("interaction-audit.json")
    }

    private func recordInteractionState(_ state: [String: Any], fingerprint: String) {
        guard fingerprint != lastQAFingerprint else { return }
        lastQAFingerprint = fingerprint
        var entry = state
        entry["capturedAt"] = Date().timeIntervalSince1970
        qaTrail.append(entry)
        if qaTrail.count > 400 { qaTrail.removeFirst(qaTrail.count - 400) }
        let audit: [String: Any] = [
            "version": 1,
            "states": qaTrail,
            "latest": entry,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: audit, options: [.sortedKeys]) else { return }
        try? data.write(to: interactionAuditURL, options: .atomic)
    }

    @objc private func handleBackGesture(_ recognizer: UIScreenEdgePanGestureRecognizer) {
        let distance = max(0, recognizer.translation(in: view).x)
        let velocity = recognizer.velocity(in: view).x
        let phase: String
        switch recognizer.state {
        case .began, .changed: phase = "change"
        case .ended: phase = distance > min(120, view.bounds.width * 0.28) || (distance > 24 && velocity > 600) ? "end" : "cancel"
        default: phase = "cancel"
        }
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('flighty-native-back', {detail: {phase: '\(phase)', distance: \(distance)}}));", completionHandler: nil)
    }

    // CI-only geometry evidence from a running Simulator, never enabled in normal use.
    private func captureLayoutAudit(attempt: Int) {
        // iOS 27 runners can spend several minutes warming MapKit/SnapshotService.
        // Keep sampling for the whole QA step so a delayed screenshot retry cannot
        // exhaust the appearance-switch audit window before dark mode is applied.
        guard attempt < 600 else { return }
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
                  nativeTheme: document.documentElement.dataset.nativeSystemTheme,
                  pageTheme: document.querySelector('.flighty-page').dataset.theme,
                  panelBackground: getComputedStyle(document.querySelector('.primary-panel')).backgroundColor,
                  panel: document.querySelector('.primary-panel').getBoundingClientRect().toJSON(),
                  tab: document.querySelector('.primary-panel').dataset.tab,
                  titleSize: getComputedStyle(document.querySelector('.panel-titlebar h1')).fontSize,
                  titleRect: document.querySelector('.panel-titlebar h1').getBoundingClientRect().toJSON(),
                  nativeGlass: document.documentElement.dataset.nativeChrome === 'true',
                  mapReady: document.querySelector('.flight-globe-map')?.dataset.mapReady === 'true',
                  viewportScale: visualViewport?.scale ?? 1,
                  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
                  appearanceMode: document.documentElement.dataset.appearance,
                  mediaDark: matchMedia('(prefers-color-scheme: dark)').matches,
                  sceneStyle: \(self.view.window?.windowScene?.traitCollection.userInterfaceStyle.rawValue ?? -1),
                  controllerStyle: \(self.traitCollection.userInterfaceStyle.rawValue),
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
                if let audit = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let theme = audit["pageTheme"] as? String, ["light", "dark"].contains(theme) {
                    try? data.write(to: directory.appendingPathComponent("layout-\(theme).json"), options: .atomic)
                    if let tab = audit["tab"] as? String, ["flights", "friends", "passport"].contains(tab) {
                        try? data.write(to: directory.appendingPathComponent("layout-\(theme)-\(tab).json"), options: .atomic)
                    }
                }
                self.captureLayoutAudit(attempt: attempt + 1)
            }
        }
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}

extension FlightyBridgeViewController: UIGestureRecognizerDelegate {
    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        gestureRecognizer !== backGesture || canNavigateBack
    }
}

private final class FlightyChromeHandler: NSObject, WKScriptMessageHandler {
    weak var owner: FlightyBridgeViewController?
    init(owner: FlightyBridgeViewController) { self.owner = owner }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) { owner?.updateChrome(message) }
}

private final class FlightyPassthroughView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let hit = super.hitTest(point, with: event)
        return hit === self ? nil : hit
    }
}

// Real UIKit glass above the WKWebView, not a CSS blur pretending to be Liquid Glass.
// The host is always alpha 1; only the material itself controls translucency.
private final class FlightyGlassBar: UIVisualEffectView {
    var onAction: ((String) -> Void)?
    private var controls: [String: UIButton] = [:]
    init() {
        let material: UIVisualEffect
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: .clear)
            glass.isInteractive = true
            material = glass
        } else { material = UIBlurEffect(style: .systemUltraThinMaterial) }
        super.init(effect: material)
        clipsToBounds = true
        layer.cornerCurve = .continuous
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    static func rect(_ value: Any?) -> CGRect? {
        guard let value = value as? [String: NSNumber], let x = value["x"], let y = value["y"], let w = value["width"], let h = value["height"],
              [x, y, w, h].allSatisfy({ $0.doubleValue.isFinite }), w.doubleValue > 0, h.doubleValue > 0 else { return nil }
        return CGRect(x: x.doubleValue, y: y.doubleValue, width: w.doubleValue, height: h.doubleValue)
    }
    func update(_ items: [[String: Any]]) {
        layer.cornerRadius = min(bounds.width, bounds.height) / 2
        backgroundColor = UIAccessibility.isReduceTransparencyEnabled ? .secondarySystemBackground : .clear
        let ids = Set(items.compactMap { $0["id"] as? String })
        for (id, button) in controls where !ids.contains(id) { button.isHidden = true }
        for item in items {
            guard let id = item["id"] as? String, let frame = Self.rect(item["rect"]), let symbol = item["symbol"] as? String else { continue }
            let button: UIButton
            if let existing = controls[id] { button = existing }
            else {
                button = UIButton(type: .system)
                button.accessibilityIdentifier = id
                button.isAccessibilityElement = true
                button.addAction(UIAction { [weak self] _ in self?.onAction?(id) }, for: .touchUpInside)
                controls[id] = button
                contentView.addSubview(button)
            }
            let title = item["title"] as? String ?? ""
            let active = item["active"] as? Bool ?? false
            var configuration = UIButton.Configuration.plain()
            configuration.image = UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: title.isEmpty ? 23 : 24, weight: .medium))
            if !title.isEmpty {
                var label = AttributedString(title)
                label.font = UIFont.systemFont(ofSize: 11, weight: active ? .semibold : .medium)
                configuration.attributedTitle = label
            }
            configuration.imagePlacement = .top
            configuration.imagePadding = 3
            configuration.contentInsets = .zero
            configuration.baseForegroundColor = active ? .systemBlue : .label
            configuration.background.backgroundColor = active ? UIColor.tertiarySystemFill : .clear
            configuration.background.cornerRadius = min(frame.width, frame.height) / 2
            button.configuration = configuration
            button.frame = frame
            button.isHidden = false
            button.isEnabled = item["enabled"] as? Bool ?? true
            button.accessibilityLabel = item["label"] as? String
            button.accessibilityTraits = active ? [.button, .selected] : .button
        }
    }
}
