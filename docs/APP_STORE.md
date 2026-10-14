# Publishing PinNudge on the App Store

This guide takes you from this repository to an app in Apple's review queue. It is written for a Windows PC: you don't need a Mac. Apple's servers can't be reached from here, so the steps that need your Apple account are yours to do. Everything in the code is ready.

**Time and cost:** about a day of setup the first time, plus Apple's review (often 1–3 days). Apple charges **$99 per year** for the Developer Program. Expo's free plan is enough to build and submit.

---

## 0. Before you start: the app needs a live backend

The iPhone app is a client for your PinNudge web app. Reviewers and customers will use the server you deploy, so do this first:

1. Deploy the web app with a hosted Supabase project (see the root `README.md`, sections "Supabase setup" and "Production build & deployment"). Note its public URL, for example `https://app.yourdomain.com`.
2. Check that these pages load on that URL: `/privacy`, `/terms` and `/api/mobile/v1/status`. The status endpoint should report `"auth":"password"`.
3. Create a **reviewer account** on the live site (any email you control, a strong password), add a product, and run one campaign so the reviewer sees real content. Keep that account on the Free plan. Apple only needs to see the app work.

Local demo mode isn't suitable for review: it has no real accounts.

---

## 1. Accounts

1. **Apple Developer Program**: enrol at <https://developer.apple.com/programs/enroll/> with your Apple ID.
   - *Individual*: quickest. Your own name is shown as the seller.
   - *Organisation*: shows your company name, but needs a D-U-N-S number (free, can take days).
2. **Expo account** (free): sign up at <https://expo.dev/signup>.

## 2. Configure the app

Open `mobile/app.json` and `mobile/eas.json` in a text editor.

| Setting | File | Change it to |
| --- | --- | --- |
| `ios.bundleIdentifier` | `app.json` | A unique reverse-domain id you control, e.g. `com.yourdomain.pinnudge`. You can't change it after the first upload. |
| `EXPO_PUBLIC_API_URL` (both `preview` and `production`) | `eas.json` | Your deployed web app URL, e.g. `https://app.yourdomain.com` (no trailing slash) |
| `name` | `app.json` | The name under the icon. "PinNudge" is fine if it's free on the App Store. |
| `version` | `app.json` | `1.0.0` for the first release. Raise it for each new App Store version. |

The build number goes up automatically on every production build (`autoIncrement`).

## 3. Install the tools (Windows PowerShell)

Install Node.js 20 LTS or newer from <https://nodejs.org>, then:

```powershell
cd C:\Users\<you>\Pin-Nudge\mobile
npm install
npx eas-cli@latest login            # your Expo account
npx eas-cli@latest init             # links this folder to a new Expo project (adds extra.eas.projectId to app.json)
```

Commit the `app.json` change that `init` makes.

## 4. Try it on your iPhone first (optional, recommended)

Follow "Run it on your iPhone with Expo Go" in `mobile/README.md`, with `EXPO_PUBLIC_API_URL` set to your live URL. Sign in with the reviewer account and go through the flow: add a product with a photo, create a campaign, generate pins, edit one, **Save to Photos**, **Share**, and **Delete account** (use a throwaway account for that last one).

## 5. Build the iOS app in the cloud

```powershell
npx eas-cli@latest build --platform ios --profile production
```

- When it asks, sign in with your **Apple ID**. EAS creates the distribution certificate, provisioning profile and the app's identifier for you. Accept the defaults.
- The build runs on Expo's Macs and takes roughly 15–30 minutes. You get a link to follow it.

## 6. Create the app in App Store Connect

1. Go to <https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**.
2. Platform **iOS**. Name **PinNudge** (or your alternative). Primary language. Choose the **bundle ID** from step 2. SKU: anything, e.g. `pinnudge-ios`.
3. Under **Pricing and Availability**, set the price to **Free**.

## 7. Upload the build (TestFlight)

```powershell
npx eas-cli@latest submit --platform ios --latest
```

It asks which App Store Connect app to use (pick the one from step 6) and uploads the build. After Apple processes it (10–30 minutes) it appears under **TestFlight**. Install the **TestFlight** app on your iPhone to test the exact build reviewers will get.

## 8. Fill in the App Store listing

All of this is in App Store Connect under your app. Suggested text is in the [Store listing text](#store-listing-text) section below.

- **Screenshots**: required for the 6.9" iPhone display (1320 × 2868 or 1290 × 2796 pixels, portrait). Take them on a large iPhone running the TestFlight build (side button + volume up), or in an iOS simulator if you have access to a Mac. Use 3–6 screens: home, campaign with pins, pin editor, angles, calendar. The app is iPhone-only (`supportsTablet: false`), so no iPad screenshots are needed.
- **Description, keywords, subtitle, promotional text**: see below.
- **Support URL**: a page where people can reach you, e.g. `https://app.yourdomain.com/help`. Add a contact email to it.
- **Privacy Policy URL**: `https://app.yourdomain.com/privacy` (required).
- **Category**: Business (primary), Productivity (secondary).
- **Age rating**: fill in the questionnaire. Answer "None" to everything; the result is 4+.
- **App Privacy**: see [App privacy answers](#app-privacy-answers).
- **App Review Information**: sign-in required → **yes**. Enter the reviewer account's email and password, and paste the [review notes](#notes-for-app-review).
- **Build**: choose the TestFlight build. **Export compliance** is already answered in the app (`usesNonExemptEncryption: false`: the app only uses standard HTTPS).

Then press **Add for Review** → **Submit to App Review**.

## 9. Updates later

1. Change the code, raise `version` in `app.json` (e.g. `1.0.1`).
2. `npx eas-cli@latest build --platform ios --profile production`
3. `npx eas-cli@latest submit --platform ios --latest`
4. In App Store Connect, create the new version, pick the build, submit.

Server-side changes (new templates, better AI copy) reach the app immediately without a new build, as long as the API stays compatible.

---

## How the app follows the App Review Guidelines

| Guideline | What the app does |
| --- | --- |
| **3.1.1 / 3.1.3(f)** In-app purchase | PinNudge is sold as a subscription on the website. The iOS app is a **free companion** to that paid web tool: it contains **no purchasing, no prices and no calls to action to buy elsewhere**. The API rewrites plan-limit messages for the app into neutral wording ("You've reached your plan's limit for…", "Not included in your current plan: …"), and never sends upgrade targets to the app. Unit and E2E tests check this. Don't add "upgrade", pricing or links to the pricing page in the app; that would require In-App Purchase. |
| **4.2** Minimum functionality | A native app, not a wrapped website. It uses the photo picker, saving to Photos, the share sheet, the Keychain and haptics, with native navigation. |
| **5.1.1(v)** Account deletion | Account → Delete account permanently deletes the account and all data, and cancels any Stripe subscription first. |
| **5.1.1** Permissions | Photo-library access is requested only when choosing product photos, and add-only access only when saving a pin. The purpose strings are in `app.json`. The camera and microphone are not used. |
| **4.8** Login services | Email and password only. No third-party or social login, so Sign in with Apple isn't required. |
| **5.2.1 / 2.3.7** Trademarks and metadata | The app states that PinNudge is independent and not affiliated with Pinterest or Etsy. **Don't put "Pinterest" or "Etsy" in the app name, subtitle or keywords.** Mention them only in the description, in plain descriptive use, with the disclaimer. |
| **2.1** Completeness | The reviewer needs a working live server and the reviewer account from step 0. A server that's down is the most common reason for rejection. |
| **Privacy manifest** | `app.json` declares the required-reason API the app uses (UserDefaults, reason CA92.1). The Expo modules include their own manifests. |

Apple decides each review case by case. If a reviewer questions the subscription model, reply in Resolution Center that the app is a free stand-alone companion to a paid web-based tool under guideline 3.1.3(f), and that it has no purchase options or purchase prompts.

---

## Store listing text

**Name:** PinNudge

**Subtitle (30 characters max):** Pin ideas for digital sellers

**Promotional text:**
Turn one product into a whole set of pin designs, each with its own marketing angle. Edit them on your phone and save them to Photos.

**Description:**
```
PinNudge helps independent sellers of digital products (printables, planners, templates and wall art) plan pin campaigns.

Pick one of your products and PinNudge suggests several different marketing angles: who it's for, what problem it solves, and what to say. Keep the angles you like, then get a set of ready-to-edit pin designs with titles, descriptions and alt text.

• Product library with your own photos
• Distinct angles, so your pins don't all say the same thing
• Six editable pin designs at 1000 × 1500
• Live preview as you edit the copy, colours and typography
• Save pins to Photos or share them straight to another app
• Approve pins, plan dates and mark what you've posted
• Works with your PinNudge account on the web

PinNudge doesn't post on your behalf and never makes up statistics. You decide what to publish.

PinNudge is an independent product and is not affiliated with, endorsed by, or sponsored by Pinterest or Etsy.
```

**Keywords (100 characters max, comma-separated, no spaces needed):**
`pins,marketing,printables,planner,digital products,seller,templates,social media,campaign,content`

### Notes for App Review

```
PinNudge is a free companion app for the PinNudge web service, which helps
sellers of digital products plan pin marketing campaigns.

Sign in with the demo account provided above. It already contains a product and a campaign.

Suggested path:
1. Campaigns tab → open the campaign → tap a pin to open the editor.
2. Change the headline or colours: the preview updates. Tap "Save changes".
3. Tap "Photos" to save the pin image (asks for add-only photo access) or the share icon to share it.
4. Home → New campaign → Generate marketing angles → Generate pins to create a new set.
5. Account → Delete account shows in-app account deletion (please use a separate account if you test it).

Subscriptions for higher limits are sold only on our website. This app contains no purchases,
prices or links to buy, as allowed for free stand-alone companion apps (guideline 3.1.3(f)).

The app does not post to Pinterest; users save or share images themselves.
PinNudge is not affiliated with Pinterest or Etsy.
```

### App privacy answers

In App Store Connect → App Privacy, answer **"Yes, we collect data"** and declare:

| Data type | Linked to the user | Used for tracking | Purpose |
| --- | --- | --- | --- |
| Contact Info → Email Address | Yes | No | App Functionality |
| Contact Info → Name (optional display name) | Yes | No | App Functionality |
| User Content → Photos or Videos (product photos you upload) | Yes | No | App Functionality |
| User Content → Other User Content (product details, pin copy) | Yes | No | App Functionality |
| Identifiers → User ID | Yes | No | App Functionality |
| Usage Data → Product Interaction (generation counts for plan limits) | Yes | No | App Functionality |

The app has no advertising, analytics SDKs or tracking, so the answer to "Do you or your third-party partners use data for tracking?" is **No**. Product details are sent to the AI provider configured on your server (Anthropic) to write pin copy. Say so in your privacy policy, which the website's `/privacy` page already covers. Review it before launch.
