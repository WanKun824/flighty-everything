import AppKit
import Foundation

// Check actual content pixels, not only DOM attributes or simulator preferences.
guard CommandLine.arguments.count == 3,
      let bitmap = NSBitmapImageRep(contentsOfFile: CommandLine.arguments[1]) else {
    exit(2)
}
let theme = CommandLine.arguments[2]
var dark = 0, light = 0, total = 0
for y in stride(from: Int(Double(bitmap.pixelsHigh) * 0.68), to: Int(Double(bitmap.pixelsHigh) * 0.88), by: 4) {
    for x in stride(from: Int(Double(bitmap.pixelsWide) * 0.10), to: Int(Double(bitmap.pixelsWide) * 0.90), by: 4) {
        guard let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else { continue }
        let luminance = 0.2126 * color.redComponent + 0.7152 * color.greenComponent + 0.0722 * color.blueComponent
        if luminance < 0.4 { dark += 1 }
        if luminance > 0.65 { light += 1 }
        total += 1
    }
}
let darkRatio = Double(dark) / Double(max(total, 1))
let lightRatio = Double(light) / Double(max(total, 1))
let valid = theme == "dark" ? darkRatio > 0.6 && lightRatio > 0.005 : lightRatio > 0.6 && darkRatio > 0.005
print("\(theme) screenshot pixels: dark=\(darkRatio), light=\(lightRatio), valid=\(valid)")
exit(valid ? 0 : 1)
