import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const COUPANG_HOST = "https://api-gateway.coupang.com";
const COUPANG_BASE_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1";
const SELLER_SPECIAL_URL = "https://www.coupang.com/np/omp";
const DEFAULT_OUTPUT = path.join(process.cwd(), "data", "seller-special-scrape.json");

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const nodePath = process.env.NODE_PATH?.split(path.delimiter).find(Boolean);

    if (!nodePath) {
      throw new Error("Playwright를 찾을 수 없습니다. npm install 후 다시 실행해 주세요.");
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
  const results = [];

  for (let index = 0; index < products.length; index += 10) {
    const chunk = products.slice(index, index + 10);
    const response = await fetch(`${COUPANG_HOST}${pathWithQuery}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        coupangUrls: chunk.map((product) => product.productUrl),
        subId: process.env.COUPANG_SUB_ID,
      }),
    });

    if (!response.ok) {
      results.push(...chunk);
      continue;
    }

    const result = await response.json();
    const links = Array.isArray(result.data) ? result.data : [];

    results.push(
      ...chunk.map((product, chunkIndex) => ({
        ...product,
        affiliateUrl: links[chunkIndex]?.shortenUrl ?? links[chunkIndex]?.landingUrl ?? product.productUrl,
      })),
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return results;
}

function parsePrice(value) {
  const numberText = value?.replace(/[^\d]/g, "");
  return numberText ? Number(numberText) : undefined;
}

function parsePercent(value) {
  const numberText = value?.match(/(\d+)/)?.[1];
  return numberText ? Number(numberText) : undefined;
}

function parseReviewCount(value) {
  const numberText = value?.replace(/[^\d]/g, "");
  return numberText ? Number(numberText) : undefined;
}

function createStableProductId(product) {
  const source = `${product.productName}-${product.salePrice ?? ""}-${product.productImage}`;
  return crypto.createHash("sha1").update(source).digest("hex").slice(0, 16);
}

async function scrapeSellerSpecial() {
  const { chromium } = await loadPlaywright();
  const executablePath = process.env.CHROME_PATH;
  const userDataDir = process.env.COUPANG_SCRAPE_PROFILE ?? path.join(process.env.TEMP ?? process.cwd(), "coupang-seller-special-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: process.env.COUPANG_SCRAPE_HEADLESS === "true",
    ...(executablePath ? { executablePath } : {}),
    locale: "ko-KR",
    viewport: { width: 1440, height: 1000 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(SELLER_SPECIAL_URL, { waitUntil: "domcontentloaded", timeout: 40_000 });
    await page.waitForTimeout(5_000);

    const rawProductsByKey = new Map();

    for (let step = 0; step < 24; step += 1) {
      const productsOnScreen = await page.evaluate(() => {
        const getText = (root, selector) => root.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const cards = Array.from(document.querySelectorAll('[class*="promotion_item"]')).filter(
          (card) => card.querySelector('[class*="item_title"]') && card.querySelector('[class*="sale_price_value"]'),
        );

        return cards.map((card) => {
          const cover = card.querySelector('[class*="cover_box"]');
          const style = cover?.getAttribute("style") ?? "";
          const backgroundMatch = style.match(/url\((.*?)\)/);
          const backgroundUrl = backgroundMatch?.[1]?.replace(/["']/g, "") ?? "";
          const dataImage = cover?.getAttribute("data-img") ?? "";
          const productImage =
            backgroundUrl ||
            (dataImage ? `https://thumbnail6.coupangcdn.com/thumbnails/remote/492x492q65ex/image/${dataImage}` : "");
          const productName = getText(card, '[class*="item_title"]');
          const salePriceText = getText(card, '[class*="sale_price_value"]');
          const originalPriceText = getText(card, '[class*="original_price"]');
          const discountText = getText(card, '[class*="discount_rate"]');
          const reviewText = getText(card, '[class*="rating_count"]');
          const deliveryText = getText(card, '[class*="delivery_info"]');
          const salePrefix = getText(card, '[class*="sale_prefix"]');

          return {
            productName,
            productImage,
            salePriceText,
            originalPriceText,
            discountText,
            reviewText,
            deliveryText,
            salePrefix,
          };
        });
      });

      productsOnScreen.forEach((product) => {
        const key = `${product.productName}-${product.salePriceText}`;

        if (product.productName && product.productImage) {
          rawProductsByKey.set(key, product);
        }
      });

      await page.mouse.wheel(0, 950);
      await page.waitForTimeout(700);
    }

    return Array.from(rawProductsByKey.values()).map((item) => {
      const salePrice = parsePrice(item.salePriceText);
      const originalPrice = parsePrice(item.originalPriceText);
      const discountRate =
        parsePercent(item.discountText) ??
        (originalPrice && salePrice && originalPrice > salePrice
          ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
          : undefined);
      const productUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(item.productName)}`;
      const product = {
        productName: item.productName,
        productImage: item.productImage,
        productUrl,
        salePrice,
        originalPrice,
        discountRate,
        reviewCount: parseReviewCount(item.reviewText),
        deliveryText: item.deliveryText,
        salePrefix: item.salePrefix,
      };

      return {
        productId: createStableProductId(product),
        ...product,
      };
    });
  } finally {
    await context.close();
  }
}

async function main() {
  await readDotEnvLocal();

  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT;
  const scrapedProducts = await scrapeSellerSpecial();
  const products = await createAffiliateLinks(scrapedProducts);
  const payload = {
    source: SELLER_SPECIAL_URL,
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
