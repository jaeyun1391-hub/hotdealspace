import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const COUPANG_HOST = "https://api-gateway.coupang.com";
const COUPANG_BASE_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1";
const GOLD_BOX_URL = "https://pages.coupang.com/p/121237?sourceType=gm_crm_goldbox&subSourceType=gm_crm_gwsrtcut";
const DEFAULT_OUTPUT = path.join(process.cwd(), "data", "goldbox-scrape.json");

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const nodePath = process.env.NODE_PATH?.split(path.delimiter).find(Boolean);

    if (!nodePath) {
      throw new Error("Playwright를 찾을 수 없습니다. npm install 후 다시 실행해주세요.");
    }

    return createRequire(path.join(nodePath, "noop.js"))("playwright");
  }
}

async function readDotEnvLocal() {
  try {
    const content = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");

    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  } catch {
    // GitHub Actions uses repository secrets instead of .env.local.
  }
}

function createAuthorization(method, pathWithQuery, accessKey, secretKey) {
  const signedDate = new Date().toISOString().slice(2, 19).replace(/[-:]/g, "") + "Z";
  const [requestPath, query = ""] = pathWithQuery.split("?");
  const message = `${signedDate}${method}${requestPath}${query}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

async function createAffiliateLinks(products) {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  if (!accessKey || !secretKey || products.length === 0) {
    return products;
  }

  const pathWithQuery = `${COUPANG_BASE_PATH}/deeplink`;
  const authorization = createAuthorization("POST", pathWithQuery, accessKey, secretKey);
  const response = await fetch(`${COUPANG_HOST}${pathWithQuery}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      coupangUrls: products.map((product) => product.productUrl),
      subId: process.env.COUPANG_SUB_ID,
    }),
  });

  if (!response.ok) {
    return products;
  }

  const result = await response.json();
  const links = Array.isArray(result.data) ? result.data : [];

  return products.map((product, index) => ({
    ...product,
    affiliateUrl: links[index]?.shortenUrl ?? links[index]?.landingUrl ?? product.productUrl,
  }));
}

function parsePrice(value) {
  const numberText = value?.replace(/[^\d]/g, "");
  return numberText ? Number(numberText) : undefined;
}

function parseProductText(text) {
  const compactText = text.replace(/\s+/g, " ").trim();
  const percentMatches = [...compactText.matchAll(/(\d+)%/g)];
  const priceMatches = [...compactText.matchAll(/([\d,]+)원/g)];
  const firstPriceIndex = priceMatches[0]?.index ?? compactText.length;
  const discountMatch = percentMatches.find((match) => (match.index ?? compactText.length) < firstPriceIndex);
  const soldRate = Number(compactText.match(/(\d+)%\s*판매됨/)?.[1] ?? "") || undefined;
  const discountRate = Number(discountMatch?.[1] ?? "") || undefined;
  const salePrice = parsePrice(priceMatches[0]?.[1]);
  const originalPrice = discountMatch && priceMatches[1] ? parsePrice(priceMatches[1][1]) : undefined;
  const nameEndIndex = discountMatch?.index ?? firstPriceIndex;
  const productName = compactText.slice(0, nameEndIndex).trim();

  return {
    productName,
    discountRate,
    salePrice,
    originalPrice,
    soldRate,
  };
}

function getProductId(productUrl) {
  return productUrl.match(/\/(?:vp\/)?products\/(\d+)/)?.[1];
}

async function scrapeGoldBox() {
  const { chromium } = await loadPlaywright();
  const executablePath = process.env.CHROME_PATH;
  const userDataDir = process.env.COUPANG_SCRAPE_PROFILE ?? path.join(process.env.TEMP ?? process.cwd(), "coupang-scrape-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: process.env.COUPANG_SCRAPE_HEADLESS === "true",
    ...(executablePath ? { executablePath } : {}),
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(GOLD_BOX_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(5_000);

    const rawProductsByUrl = new Map();

    for (let step = 0; step < 14; step += 1) {
      const productsOnScreen = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a"))
          .map((anchor) => {
            const text = (anchor.textContent || "").replace(/\s+/g, " ").trim();
            const image = anchor.querySelector("img")?.src || "";

            return {
              text,
              productUrl: anchor.href,
              productImage: image,
            };
          })
          .filter(
            (item) =>
              (item.productUrl.includes("/vp/products/") || item.productUrl.includes("/np/products/")) &&
              /\d+%|\d{1,2}:\d{2}:\d{2}\s*남음/.test(item.text),
          ),
      );

      productsOnScreen.forEach((product) => rawProductsByUrl.set(product.productUrl, product));

      await page.mouse.wheel(0, 850);
      await page.waitForTimeout(700);
    }

    const seen = new Set();

    return Array.from(rawProductsByUrl.values())
      .map((item) => ({
        productId: getProductId(item.productUrl) ?? item.productUrl,
        productImage: item.productImage,
        productUrl: item.productUrl,
        ...parseProductText(item.text),
      }))
      .filter((product) => {
        if (!product.productName || seen.has(product.productId)) {
          return false;
        }

        seen.add(product.productId);
        return true;
      });
  } finally {
    await context.close();
  }
}

async function main() {
  await readDotEnvLocal();

  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT;
  const scrapedProducts = await scrapeGoldBox();
  const products = await createAffiliateLinks(scrapedProducts);
  const payload = {
    source: GOLD_BOX_URL,
    scrapedAt: new Date().toISOString(),
    count: products.length,
    products,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ count: payload.count, scrapedAt: payload.scrapedAt }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
