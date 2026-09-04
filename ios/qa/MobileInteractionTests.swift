import XCTest

final class MobileInteractionTests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["FLIGHTY_UI_QA"] = "1"
        app.launch()
        // iOS 27 beta ships duplicate WebKit accessibility bundles which can make
        // transparent marker queries disappear. Exercise the real screen by
        // coordinates and let the app persist the resulting state trail instead.
        pause(8)
    }
    private func pause(_ seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }
    private func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func edgeBack() {
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.005, dy: 0.56))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.78, dy: 0.56))
        start.press(forDuration: 0.08, thenDragTo: end)
    }
    private func tap(_ x: CGFloat, _ y: CGFloat) {
        app.coordinate(withNormalizedOffset: CGVector(dx: x, dy: y)).tap()
        pause(2)
    }
    func testMobileGlassTabsDetailsSearchAndEdgeBack() throws {
        tap(0.175, 0.918)
        tap(0.86, 0.82)
        func pullHeaderDown(from y: CGFloat) {
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: y))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: 0.90))
            start.press(forDuration: 0.12, thenDragTo: end)
            pause(2)
        }
        pullHeaderDown(from: 0.47)
        pullHeaderDown(from: 0.45)
        pullHeaderDown(from: 0.72)
        screenshot("detail-minimum-locked")
        edgeBack()
        pause(2)
        tap(0.873, 0.918)
        screenshot("search-fixed-over-map")
        edgeBack()
        pause(2)

        let tabs: [(CGFloat, String)] = [(0.175, "flights"), (0.417, "friends"), (0.658, "passport")]
        for (x, tab) in tabs {
            tap(x, 0.918)
            screenshot("tab-\(tab)")
        }
        tap(0.175, 0.918)
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.65))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.25))
        start.press(forDuration: 0.1, thenDragTo: end)
        pause(2)
        screenshot("expanded-by-header-drag")
        tap(0.90, 0.095)
        edgeBack()
        pause(2)
        screenshot("edge-back-to-trip")
    }
}
