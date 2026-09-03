import XCTest

final class MobileInteractionTests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["FLIGHTY_UI_QA"] = "1"
        app.launch()
        XCTAssertTrue(app.buttons["tabs-0"].waitForExistence(timeout: 60), "Native glass navigation must be present")
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
    func testNativeTabsPanelDragAndEdgeBack() throws {
        let nav = app.buttons["tabs-0"].frame
        for index in 0...2 {
            app.buttons["tabs-\(index)"].tap()
            XCTAssertEqual(app.buttons["tabs-\(index)"].frame.height, nav.height, accuracy: 1)
            XCTAssertLessThan(app.buttons["tabs-\(index)"].frame.maxY, app.frame.height - 20)
            screenshot("tab-\(index)")
        }
        app.buttons["tabs-0"].tap()
        let title = app.staticTexts["My Flights"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        let before = title.frame.minY
        let start = title.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.25))
        start.press(forDuration: 0.1, thenDragTo: end)
        XCTAssertLessThan(title.frame.minY, before - 60)
        screenshot("expanded-by-header-drag")
        app.buttons["map-0"].tap()
        XCTAssertTrue(app.staticTexts["Airports"].firstMatch.waitForExistence(timeout: 15))
        edgeBack()
        XCTAssertTrue(app.buttons["follow-0"].waitForExistence(timeout: 10), "Edge back must restore the itinerary without tapping X")
        screenshot("edge-back-to-trip")
    }
    func testDetailStopsAtMinimumAndKeyboardDoesNotZoom() throws {
        let detail = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND label ENDSWITH %@", "打开 ", " 详情")).firstMatch
        XCTAssertTrue(detail.waitForExistence(timeout: 20))
        detail.tap()
        let close = app.buttons["关闭详情"]
        XCTAssertTrue(close.waitForExistence(timeout: 10))
        func pullHeaderDown() {
            let y = close.frame.midY / app.frame.height
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: y))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.30, dy: 0.91))
            start.press(forDuration: 0.12, thenDragTo: end)
        }
        pullHeaderDown()
        let minimumY = close.frame.midY
        pullHeaderDown()
        XCTAssertTrue(close.exists, "Dragging below the minimum must never dismiss the detail")
        XCTAssertEqual(close.frame.midY, minimumY, accuracy: 8)
        screenshot("detail-minimum-locked")
        edgeBack()
        XCTAssertTrue(app.buttons["search-0"].waitForExistence(timeout: 10))
        app.buttons["search-0"].tap()
        let input = app.webViews.textFields.firstMatch
        XCTAssertTrue(input.waitForExistence(timeout: 15))
        let width = input.frame.width
        input.tap()
        input.typeText("HKG")
        XCTAssertEqual(input.frame.width, width, accuracy: 2, "Focusing input must not zoom the phone viewport")
        screenshot("search-keyboard-no-zoom")
        edgeBack()
        XCTAssertTrue(input.exists, "First back dismisses keyboard, not the search form")
        screenshot("search-keyboard-dismissed")
    }
}
