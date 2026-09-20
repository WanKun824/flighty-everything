# fly everything — icon

Created with the built-in image generation tool, 2026-09-20. Original FLY lettering, inspired by the angular artistic lettering requested with the Robotaxi reference: https://www.tesla.com/robotaxi

The master for this project is `public/brand/fly-icon.png` (opaque 1024 × 1024 PNG), also installed in the iOS AppIcon asset catalog. Small exports are `public/apple-touch-icon.png` and `public/favicon.png`. System-applied icon corner masks are not baked in. The application identifier and storage keys remain unchanged.

## Generation prompt

Use case: logo-brand. Create a production iOS app icon for fly everything. Exactly square 1024 x 1024 pixels, opaque solid pure black (#000000) full-bleed background, no rounded corners pre-applied. Only the exact white word "FLY" (F L Y), centered optically, filling about 75% of the width and 40% of the height. Custom artistic lettering inspired by the Tesla Robotaxi wordmark: bold energetic futuristic hand-drawn angular brush-cut graffiti strokes, slightly forward leaning, sharp chiseled ends, confident irregular connected rhythm, but clearly readable F L Y. Design an original FLY mark, not the Tesla or Robotaxi wordmark itself. Premium minimal Apple-app-icon simplicity, immaculate high contrast and generous black space. Flat black and white artwork. No additional words, no logo of Tesla, no airplane, no globe, no border, no gradients, no shadows, no glow, no texture, no mockup or presentation sheet. Single final icon only.

Packaging uses the existing device-only unsigned workflow with `skip_tests=true`. No functional, simulator, or visual tests are requested for this export.
