# Vehicle follow performance — 2026-08-27

Scope: follow-camera frame pacing only; retain the UI, upper-right arrow, vehicle assets, user-selected zoom/pitch/bearing, and route timing.

## Observed cause

The old `1000 / 30` elapsed-time gate limited camera updates independently of the display clock. A followed Mapbox marker was also updated through `setLngLat`, `move`, and `moveend`, despite staying centered on screen.

## Change

- Update the camera once per available animation frame; no extra 30 Hz timer or easing.
- Pin the same model host at the viewport center during follow, removing repeated geographic marker projection and pixel rounding. Reattach that same marker when follow is disabled or the user zooms.
- Yield to active zoom gestures so `jumpTo` does not cancel wheel/pinch zoom easing. Resume at the chosen zoom.
- Only update the trail style when it changes. Preserve marker classes when the vehicle mode changes.
- Skip camera work for identical stationary coordinates.

## Local browser measurements

Five-second sampling windows on the same desktop browser, without changing the map style or model quality. A temporary local-only probe counted actual animation callbacks, camera updates, and Mapbox render events; it was removed before release.

| Sample | Animation callbacks/s | Camera updates/s | Map render events/s | 95th percentile callback gap |
| --- | ---: | ---: | ---: | ---: |
| Before, car, zoom 2.05 | 165.2 | 27.6 | 28.4 | 6.2 ms |
| After, car, zoom 2.05 | 163.4 | 163.4 | 163.4 | 6.2 ms |
| After, car, zoom 3.954263 | 165.0 | 165.0 | 165.0 | 6.2 ms |

Zoom remained exactly 3.954263110839647 over the last steady sample; bearing remained 0. On/off was tested through the visible button with exactly one marker retained. Flight and train samples also kept pace with the display. The follow anchor's CSS size and position are independent of zoom.

These are desktop callback/render-event measurements, not GPU presentation timings or an iPhone FPS guarantee. Physical-device rendering still requires loading the unsigned IPA on the user's device.

Regression tests cover each 60/90/120/165 Hz update, center-only camera writes, preservation of live user settings, pause, repeated toggling, one-time marker pin/unpin, and class preservation between modes.
