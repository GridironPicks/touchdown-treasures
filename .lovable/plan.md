# Add Helmet PWA Home Screen Icon

Generate a custom football helmet logo and wire it in as the phone home screen icon for the Gridiron Confidence PWA.

## What you'll see

- A new stylized football helmet icon in the Gridiron Glory palette (stadium navy, field green, metallic silver) appears when users add the app to their iPhone/Android home screen.
- All required icon sizes are produced so the icon looks crisp on every device/launcher.
- The web manifest is updated to point at the new icons, with a separate maskable version so Android adaptive icons crop cleanly.

## Technical details

1. **Generate source artwork**
   - Create a 1024x1024 square helmet logo PNG with the Gridiron Glory color scheme.
   - Keep the helmet centered with enough padding so it survives circular/squircle cropping.

2. **Produce icon sizes**
   - `public/icons/icon-64.png` — small launcher/favicon use.
   - `public/icons/icon-180.png` — Apple touch icon.
   - `public/icons/icon-192.png` — PWA default.
   - `public/icons/icon-512.png` — PWA splash/launcher large icon.
   - `public/icons/icon-maskable.png` — 512x512 with extra safe-zone padding for Android maskable adaptive icons.

3. **Update `public/manifest.webmanifest`**
   - Point `icons` at the new 192 and 512 files.
   - Add a dedicated `maskable` entry using `icon-maskable.png`.
   - Keep `background_color`/`theme_color` as `#0B162A`.

4. **Update `src/routes/__root.tsx`**
   - Add `<link rel="apple-touch-icon" href="/icons/icon-180.png" />` to the root `head().links` so iOS uses the helmet icon when the app is saved.

5. **No database or server changes required.**
