import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const logoDir = path.join(publicDir, "logo");

const SOURCE_CANDIDATES = ["logo.png", "Nlogo.png"];

async function resolveSource() {
  for (const name of SOURCE_CANDIDATES) {
    const candidate = path.join(logoDir, name);
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    `No source logo found. Place logo.png in ${logoDir}`,
  );
}

async function squareIconBuffer(sourcePath) {
  const image = sharp(sourcePath);
  const { width, height } = await image.metadata();
  if (!width || !height) {
    throw new Error("Unable to read logo dimensions");
  }

  const size = Math.min(width, height);
  const left = Math.round((width - size) / 2);
  const top = Math.round((height - size) / 2);

  return image
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, { fit: "fill" })
    .png()
    .toBuffer();
}

async function writePng(buffer, size, outPath) {
  await sharp(buffer).resize(size, size).png().toFile(outPath);
}

async function main() {
  await mkdir(logoDir, { recursive: true });
  const sourcePath = await resolveSource();
  const canonicalLogo = path.join(logoDir, "logo.png");
  if (path.basename(sourcePath) !== "logo.png") {
    await copyFile(sourcePath, canonicalLogo);
  }

  const square = await squareIconBuffer(canonicalLogo);
  await writeFile(path.join(logoDir, "icon-square.png"), square);

  const sizes = [256, 48, 32, 16];
  const pngPaths = [];
  for (const size of sizes) {
    const out = path.join(publicDir, `favicon-${size}.png`);
    await writePng(square, size, out);
    pngPaths.push(out);
  }

  const icoBuffer = await toIco(
    await Promise.all(pngPaths.map((p) => readFile(p))),
  );
  await writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);

  const favicon256 = await readFile(path.join(publicDir, "favicon-256.png"));
  const favicon256Base64 = favicon256.toString("base64");
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="LeanSynk">
  <image width="256" height="256" href="data:image/png;base64,${favicon256Base64}"/>
</svg>`;
  await writeFile(path.join(publicDir, "favicon.svg"), faviconSvg);

  await writePng(square, 192, path.join(logoDir, "icon-192.png"));
  await writePng(square, 128, path.join(logoDir, "icon-128.png"));

  const leansynkLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 720 240" role="img" aria-labelledby="title desc">
  <title id="title">LeanSynk Logo</title>
  <desc id="desc">LeanSynk symbol with logotype and tagline</desc>
  <rect width="720" height="240" fill="#f8faf9"/>
  <image xlink:href="/logo/icon-128.png" x="28" y="56" width="128" height="128" />
  <text x="188" y="118" font-size="56" font-family="Poppins, Montserrat, Segoe UI, Arial, sans-serif" font-weight="700" fill="#426B54">LeanSynk</text>
  <text x="189" y="162" font-size="22" letter-spacing="2.5" font-family="Montserrat, Segoe UI, Arial, sans-serif" font-weight="500" fill="#5c6b63">LEAN MANUFACTURING</text>
</svg>`;
  await writeFile(path.join(publicDir, "leansynk-logo.svg"), leansynkLogoSvg);

  console.log("Brand assets generated from", canonicalLogo);
  console.log("  public/favicon-{256,48,32,16}.png");
  console.log("  public/favicon.ico, favicon.svg");
  console.log("  public/leansynk-logo.svg");
  console.log("  public/logo/icon-{128,192,square}.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
