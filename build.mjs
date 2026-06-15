// Build: compile src/app.jsx (JSX) and inline React + the app into a single
// fully-offline dist/index.html. No CDN, no external requests.
import { transformSync } from "@babel/core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// React 18's "exports" map hides the umd/ subpath, so resolve via the package dir.
const umd = (pkg, file) => join(dirname(require.resolve(`${pkg}/package.json`)), "umd", file);

const src = readFileSync("src/app.jsx", "utf8");
const { code } = transformSync(src, {
  presets: [["@babel/preset-react", { runtime: "classic" }]], // app uses global React, classic JSX
  filename: "app.jsx",
  compact: false,
});

const react = readFileSync(umd("react", "react.production.min.js"), "utf8");
const reactDom = readFileSync(umd("react-dom", "react-dom.production.min.js"), "utf8");
const head = readFileSync("src/head.html", "utf8"); // <head> + CSS, ends right before #root

const esc = (js) => js.replace(/<\/script>/g, "<\\/script>");
const body =
  '<div id="root"><div class="boot">Loading Name\u00b7Off\u2026</div></div>\n' +
  `<script>${esc(react)}</script>\n` +
  `<script>${esc(reactDom)}</script>\n` +
  `<script>${esc(code)}</script>\n` +
  "</body>\n</html>\n";

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", head + body);
console.log(`built dist/index.html (${(head + body).length} bytes)`);
