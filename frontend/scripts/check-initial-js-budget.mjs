import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

const budgetKbEnv = process.env.INITIAL_ROUTE_JS_BUDGET_KB;
const budgetKb = Number(budgetKbEnv || "800");

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  console.error(`Invalid INITIAL_ROUTE_JS_BUDGET_KB value: ${budgetKbEnv}`);
  process.exit(2);
}

if (!fs.existsSync(INDEX_HTML)) {
  console.error(`Missing build output: ${INDEX_HTML}`);
  console.error("Run 'npm run build' before running budget check.");
  process.exit(2);
}

const html = fs.readFileSync(INDEX_HTML, "utf8");

const assetPattern = /(script[^>]+type="module"[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+)"/g;
const assets = new Set();
let match;
while ((match = assetPattern.exec(html)) !== null) {
  const href = match[2];
  if (href.endsWith(".js")) {
    assets.add(href.replace(/^\//, ""));
  }
}

if (assets.size === 0) {
  console.error("No initial JS assets found in dist/index.html");
  process.exit(2);
}

let totalBytes = 0;
const detail = [];
for (const relativeAsset of assets) {
  const absoluteAsset = path.join(DIST_DIR, relativeAsset);
  if (!fs.existsSync(absoluteAsset)) {
    console.error(`Referenced asset missing: ${relativeAsset}`);
    process.exit(2);
  }

  const size = fs.statSync(absoluteAsset).size;
  totalBytes += size;
  detail.push({ file: relativeAsset, bytes: size });
}

detail.sort((a, b) => b.bytes - a.bytes);

const totalKb = totalBytes / 1024;
console.log("Initial Route JS Budget Report");
console.log("-".repeat(36));
console.log(`Budget: ${budgetKb.toFixed(2)} KB`);
console.log(`Actual: ${totalKb.toFixed(2)} KB`);
console.log("Assets:");
for (const item of detail) {
  console.log(`  - ${item.file}: ${(item.bytes / 1024).toFixed(2)} KB`);
}

if (totalKb > budgetKb) {
  console.error(`\nFAIL: initial route JS budget exceeded by ${(totalKb - budgetKb).toFixed(2)} KB`);
  process.exit(1);
}

console.log("\nPASS: initial route JS is within budget.");
