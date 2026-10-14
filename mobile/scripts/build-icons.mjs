/**
 * Renders the app icon and splash image from assets/source/*.svg.
 * The App Store icon must be 1024×1024 with no transparency, so it is flattened onto an opaque background.
 * Run from the repository root (uses the web app's sharp): node mobile/scripts/build-icons.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const src = (f) => path.join(dir, "source", f);

await sharp(src("icon.svg"), { density: 300 }).resize(1024, 1024).flatten({ background: "#167a4a" }).removeAlpha().png().toFile(path.join(dir, "icon.png"));
await sharp(src("splash-icon.svg"), { density: 300 }).resize(1024, 1024).png().toFile(path.join(dir, "splash-icon.png"));
await sharp(src("icon.svg"), { density: 72 }).resize(48, 48).png().toFile(path.join(dir, "favicon.png"));
console.log("icons written");
