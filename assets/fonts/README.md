# Pin rendering fonts

These `.woff` files are copied from the `@fontsource/*` npm packages and are used
server-side by the pin renderer (`lib/render`). They are committed so that
serverless deployments can bundle them without resolving `node_modules` at runtime.

All fonts are licensed under the SIL Open Font License 1.1:
Newsreader, Instrument Sans, Caveat, Playfair Display, Space Grotesk.
Paper grain texture in assets/textures/grain.png is generated noise (no third-party asset).
