import XCTest

final class MobileInteractionTests: XCTestCase {
    private var app: XCUIApplication!
    private var chrome: XCUIElement!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["FLIGHTY_UI_QA"] = "1"
        app.launch()
        chrome = app.otherElements["flighty-native-chrome"]
        XCTAssertTrue(chrome.waitForExistence(timeout: 25), "Native glass state marker must be present")
        XCTAssertTrue(waitForState({ ($0["ready"] as? Bool) == true }), "Native glass navigation must be ready")
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
    private func state() -> [String: Any] {
        guard let value = chrome.value as? String,
              let data = value.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
        return json
    }
    @discardableResult
    private func waitForState(timeout: TimeInterval = 12, _ condition: ([String: Any]) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if condition(state()) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.12))
        } while Date() < deadline
        return false
    }
    private func tap(_ x: CGFloat, _ y: CGFloat) {
        app.coordinate(withNormalizedOffset: CGVector(dx: x, dy: y)).tap()
    }
    private func number(_ key: String, in value: [String: Any]? = nil) -> Double {
        (value ?? state())[key] as? Double ?? -1
    }
    func testNativeTabsPanelDragAndEdgeBack() throws {
        let tabs: [(CGFloat, String)] = [(0.175, "flights"), (0.417, "friends"), (0.658, "passport")]
        for (x, tab) in tabs {
            tap(x, 0.918)
            XCTAssertTrue(waitForState { ($0["panelTab"] as? String) == tab }, "Native tab \(tab) must switch the unified panel")
            screenshot("tab-\(tab)")
        }
        tap(0.175, 0.918)
        XCTAssertTrue(waitForState { ($0["panelTab"] as? String) == "flights" })
        let before = number("panelTop")
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.65))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.25))
        start.press(forDuration: 0.1, thenDragTo: end)
        XCTAssertTrue(waitForState { self.number("panelTop", in: $0) < before - 60 }, "Dragging the information header must expand the sheet")
        screenshot("expanded-by-header-drag")
        tap(0.90, 0.095)
        XCTAssertTrue(waitForState { (($0["screenKey"] as? String) ?? "").contains("airports") })
        edgeBack()
        XCTAssertTrue(waitForState { ($0["backEnabled"] as? Bool) == false }, "Edge back must restore the itinerary without tapping X")
        screenshot("edge-back-to-trip")
    }
    func testDetailStopsAtMinimumAndSearchKeepsPhoneScale() throws {
        tap(0.175, 0.918)
        tap(0.86, 0.78)
        XCTAssertTrue(waitForState { ($0["detailDetent"] as? String) == "maximum" }, "The selected segment must open its detail")
        func pullHeaderDown(from y: CGFloat) {
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: y))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: 0.90))
            start.press(forDuration: 0.12, thenDragTo: end)
        }
        pullHeaderDown(from: 0.21)
        if !waitForState(timeout: 3, { ($0["detailDetent"] as? String) == "minimum" }) {
            pullHeaderDown(from: 0.45)
        }
        XCTAssertTrue(waitForState { ($0["detailDetent"] as? String) == "minimum" })
        let minimumY = number("detailTop")
        pullHeaderDown(from: 0.72)
        XCTAssertTrue(waitForState { ($0["detailDetent"] as? String) == "minimum" }, "Dragging below the minimum must never dismiss the detail")
        XCTAssertEqual(number("detailTop"), minimumY, accuracy: 8)
        screenshot("detail-minimum-locked")
        edgeBack()
        XCTAssertTrue(waitForState { ($0["detailDetent"] as? String) == "" })
        tap(0.873, 0.918)
        XCTAssertTrue(waitForState { (($0["screenKey"] as? String) ?? "").contains("add-journey") })
        XCTAssertEqual(number("viewportScale"), 1, accuracy: 0.01, "Opening search must preserve the phone viewport scale")
        screenshot("search-fixed-over-map")
    }
}
