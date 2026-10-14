# PinNudge for iPhone

A native iOS app (Expo SDK 57, React Native, Expo Router) for PinNudge. It uses the same account, data and pin renderer as the website, through the JSON API at `/api/mobile/v1` on the web app.

**To publish it on the App Store, follow [`docs/APP_STORE.md`](../docs/APP_STORE.md).** This file covers development.

## What the app does

- Sign in, create an account, or use the demo (local demo servers only)
- Product library: add products with photos from the photo library (HEIC is converted to JPEG), edit, delete, or try a sample product
- Campaign builder: goal, number of pins and angles, tone, pin design
- Review angles (switch them on or off, edit them), then generate the pins
- Pin editor with a live preview rendered by the server (the same renderer as the website export): copy, template, colour presets, typography, photo placement, Pinterest title, description, link and alt text
- Save pins to Photos at full size (1000 × 1500) or share them with the iOS share sheet (for example to the Pinterest app)
- Approve pins, mark them as published (PinNudge never posts for you), plan dates in a monthly calendar
- Rewrite copy (keeps your hand edits), duplicate and delete pins
- Account: profile, plan usage (read-only), privacy policy, terms, sign out, **in-app account deletion**

The app has no purchases and no purchase prompts. Plan limits are shown in neutral wording. See `docs/APP_STORE.md` for why.

## Project layout

```
mobile/
  app.json             Expo config (name, bundle id, permissions, privacy manifest)
  eas.json             EAS Build / Submit profiles (sets EXPO_PUBLIC_API_URL)
  assets/              App icon (1024×1024, opaque), splash image, favicon; sources in assets/source/*.svg
  scripts/             sync-shared.mjs (copies shared web types), build-icons.mjs
  src/app/             Screens (Expo Router: every file is a route)
  src/components/      UI kit (same editorial look as the website), images, illustrations
  src/lib/             API client, auth/session (Keychain), data hook, theme, file/photo helpers
  src/shared/          GENERATED copies of the web app's domain types and option lists
```

`src/shared/` is generated from `types/domain.ts`, `lib/constants.ts` and `lib/pins/design.ts`. After changing those files, run `npm run sync-shared` here. A unit test in the web app fails if the copies drift.

## Run it on your iPhone with Expo Go (fastest)

You need: Node.js 20+, the **Expo Go** app from the App Store on your iPhone (it must support SDK 57), and the phone and computer on the same Wi-Fi.

1. Start the web app so the API is reachable from your phone. Use your computer's LAN address, not `localhost`:
   ```bash
   # in the repository root
   npm run dev -- -H 0.0.0.0
   ```
   Find your computer's IP address (Windows: `ipconfig`, look for "IPv4 Address", for example `192.168.1.20`).
2. Point the app at it. Create `mobile/.env.local`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
   ```
   Or use your deployed web app's URL, for example `https://app.yourdomain.com`.
3. Start the app:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
4. Scan the QR code with the iPhone camera. It opens in Expo Go.

In local demo mode the welcome screen shows **Try the demo**. With Supabase configured it shows sign in / create account.

## Commands

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint (expo config)
npm run sync-shared   # refresh src/shared from the web app
npm run export:ios    # production JS bundle for iOS (checks that it compiles)
npm run web           # browser preview (development only; Photos and sharing are iPhone-only)
```

For the browser preview against a local API, also set `API_CORS_ORIGINS=http://localhost:8081` in the web app's environment. The native app doesn't need CORS.

## Security notes

- Session tokens are stored in the iOS Keychain (`expo-secure-store`, this device only, readable when unlocked). They are never put in `EXPO_PUBLIC_*` variables or in the bundle.
- The app only knows the public API URL. All secrets (Supabase service role, Anthropic, Stripe) stay on the server.
- Every API call is authorised server-side with the user's token. In Supabase mode the token is validated with Supabase Auth and Row Level Security applies exactly as on the website.
- Uploaded images are checked by their file signature on the server (PNG/JPEG only, 5 MB max).
