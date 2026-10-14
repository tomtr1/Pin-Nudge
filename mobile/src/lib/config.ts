/**
 * Build-time configuration. EXPO_PUBLIC_* variables are inlined into the app
 * bundle, so they must never contain secrets. Only the public API URL lives here.
 *
 * Set EXPO_PUBLIC_API_URL to your deployed PinNudge web app (for example
 * https://app.example.com). eas.json sets it per build profile.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const APP_NAME = "PinNudge";
export const TAGLINE = "Create smarter. Pin with purpose.";
export const DISCLAIMER = "PinNudge is an independent product and is not affiliated with, endorsed by, or sponsored by Pinterest or Etsy.";

/** Public pages on the website (opened in an in-app browser). */
export const LEGAL_URLS = {
  privacy: `${API_URL}/privacy`,
  terms: `${API_URL}/terms`,
  help: `${API_URL}/help`,
};
