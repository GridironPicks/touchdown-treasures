# Helmet Logo: App Header + Home Screen Icon

Generate one custom football helmet logo and use it in two places: the app header next to "GRIDIRON CONFIDENCE", and as the phone home screen (PWA) icon.

## What you'll see

- A stylized football helmet mark in the Gridiron Glory palette (stadium navy, field green, metallic silver).
- **In the app header**: the helmet sits immediately to the left of the "GRIDIRON CONFIDENCE" wordmark, sized to match the text height and part of the same link back to Picks. It scales down slightly on phones so the header stays on one line with no horizontal scroll.
- **On the phone home screen**: adding the app to your home screen now shows the helmet instead of the current generic icon, on both iPhone and Android.

## Technical details

1. **Generate source artwork**
   - Create a 1024x1024 transparent-background helmet logo PNG at `src/assets/helmet-logo.png`, centered with padding so it survives circular/squircle cropping.

2. **Header logo — `src/components/AppShell.tsx`**
   - Import the helmet asset and render an `<img>` inside the existing `<Link to="/picks">`, ahead of the wordmark.
   - Wrap logo + text in a flex row with a small gap; `alt="Gridiron Confidence helmet logo"`, `h-7 w-7 sm:h-8 sm:w-8`, `shrink-0`, `object-contain`.
   - Keep the existing `truncate` behavior on the text so long headers still clip cleanly.

3. **Home screen icons — `public/icons/`**
   - Downscale the source into `icon-64.png`, `icon-180.png` (Apple touch), `icon-192.png`, `icon-512.png`, and a padded `icon-maskable.png` (512x512) for Android adaptive icons.

4. **`public/manifest.webmanifest`**
   - Point the `any` icons at the new 192/512 files and add a dedicated `maskable` entry using `icon-maskable.png`. Keep `#0B162A` theme/background colors.

5. **`src/routes/__root.tsx`**
   - Add `<link rel="apple-touch-icon" href="/icons/icon-180.png" />` to `head().links` so iOS picks up the helmet on "Add to Home Screen".

6. No database or server changes required.
