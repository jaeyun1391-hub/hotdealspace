const GOLD_BOX_URL = "https://pages.coupang.com/p/121237?sourceType=gm_crm_goldbox&subSourceType=gm_crm_gwsrtcut";
const SELLER_URL = "https://www.coupang.com/np/omp";

const siteUrlInput = document.querySelector("#siteUrl");
const adminTokenInput = document.querySelector("#adminToken");
const statusEl = document.querySelector("#status");

let lastScrape = null;

function setStatus(message) {
  statusEl.textContent = message;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(["siteUrl", "adminToken", "lastScrape"]);
  siteUrlInput.value = settings.siteUrl || "https://www.hotdealspace.com";
  adminTokenInput.value = settings.adminToken || "";
  lastScrape = settings.lastScrape || null;

  if (lastScrape?.products?.length) {
    setStatus(`마지막 수집: ${lastScrape.source} ${lastScrape.products.length}개`);
  }
}

async function saveSettings() {
  await chrome.storage.local.set({
    siteUrl: siteUrlInput.value.trim() || "https://www.hotdealspace.com",
    adminToken: adminTokenInput.value.trim(),
  });
  setStatus("설정을 저장했습니다.");
}

function parsePrice(value) {
  const numberText = String(value || "").replace(/[^\d]/g, "");
  return numberText ? Number(numberText) : undefined;
}

function parsePercent(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function scrapePage() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const parsePriceInPage = (value) => {
    const numberText = String(value || "").replace(/[^\d]/g, "");
    return numberText ? Number(numberText) : undefined;
  };
  const parsePercentInPage = (value) => {
    const match = String(value || "").match(/(\d+)/);
    return match ? Number(match[1]) : undefined;
  };
  const stableId = (value) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return `ext-${Math.abs(hash)}`;
  };
  const text = (root, selector) => root.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || "";

  async function scrapeSeller() {
    const byKey = new Map();

    for (let step = 0; step < 24; step += 1) {
      const cards = Array.from(document.querySelectorAll('[class*="promotion_item"]')).filter(
        (card) => card.querySelector('[class*="item_title"]') && card.querySelector('[class*="sale_price_value"]'),
      );

      cards.forEach((card) => {
        const cover = card.querySelector('[class*="cover_box"]');
        const style = cover?.getAttribute("style") || "";
        const backgroundMatch = style.match(/url\((.*?)\)/);
        const backgroundUrl = backgroundMatch?.[1]?.replace(/["']/g, "") || "";
        const dataImage = cover?.getAttribute("data-img") || "";
        const productImage =
          backgroundUrl ||
          (dataImage ? `https://thumbnail6.coupangcdn.com/thumbnails/remote/492x492q65ex/image/${dataImage}` : "");
        const productName = text(card, '[class*="item_title"]');
        const salePrice = parsePriceInPage(text(card, '[class*="sale_price_value"]'));
        const originalPrice = parsePriceInPage(text(card, '[class*="original_price"]'));
        const discountRate =
          parsePercentInPage(text(card, '[class*="discount_rate"]')) ||
          (originalPrice && salePrice && originalPrice > salePrice
            ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
            : undefined);
        const productUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(productName)}`;

        if (productName && productImage && salePrice) {
          byKey.set(`${productName}-${salePrice}`, {
            productId: stableId(`${productName}-${salePrice}-${productImage}`),
            productName,
            productImage,
            productUrl,
            salePrice,
            originalPrice,
            discountRate,
            reviewCount: parsePriceInPage(text(card, '[class*="rating_count"]')),
            deliveryText: text(card, '[class*="delivery_info"]'),
          });
        }
      });

      window.scrollBy(0, 950);
      await sleep(450);
    }

    return { source: "seller", products: Array.from(byKey.values()) };
  }

  function parseGoldboxText(rawText) {
    const compact = rawText.replace(/\s+/g, " ").trim();
    const percentMatches = [...compact.matchAll(/(\d+)%/g)];
    const priceMatches = [...compact.matchAll(/([\d,]+)원/g)];
    const firstPriceIndex = priceMatches[0]?.index ?? compact.length;
    const discountMatch = percentMatches.filter((match) => (match.index ?? compact.length) < firstPriceIndex).at(-1);
    const discountRate = Number(discountMatch?.[1] || "") || undefined;
    const salePrice = parsePriceInPage(priceMatches[0]?.[1]);
    const originalPrice = discountMatch && priceMatches[1] ? parsePriceInPage(priceMatches[1][1]) : undefined;
    const nameEndIndex = discountMatch?.index ?? firstPriceIndex;

    return {
      productName: compact.slice(0, nameEndIndex).trim(),
      salePrice,
      originalPrice,
      discountRate,
      soldRate: Number(compact.match(/(\d+)%\s*판매/)?.[1] || "") || undefined,
    };
  }

  async function scrapeGoldbox() {
    const byUrl = new Map();

    for (let step = 0; step < 18; step += 1) {
      Array.from(document.querySelectorAll("a"))
        .map((anchor) => ({
          text: anchor.textContent || "",
          productUrl: anchor.href,
          productImage: anchor.querySelector("img")?.src || "",
        }))
        .filter(
          (item) =>
            (item.productUrl.includes("/vp/products/") || item.productUrl.includes("/np/products/")) &&
            item.productImage &&
            /\d+%|[\d,]+원/.test(item.text),
        )
        .forEach((item) => {
          const parsed = parseGoldboxText(item.text);

          if (parsed.productName && parsed.salePrice) {
            byUrl.set(item.productUrl, {
              productId: item.productUrl.match(/\/(?:vp\/)?products\/(\d+)/)?.[1] || stableId(item.productUrl),
              productImage: item.productImage,
              productUrl: item.productUrl,
              ...parsed,
            });
          }
        });

      window.scrollBy(0, 850);
      await sleep(450);
    }

    return { source: "goldbox", products: Array.from(byUrl.values()) };
  }

  if (location.href.includes("/np/omp")) {
    return scrapeSeller();
  }

  return scrapeGoldbox();
}

async function scrapeCurrentTab() {
  const tab = await getActiveTab();

  if (!tab?.id || !tab.url?.includes("coupang.com")) {
    setStatus("쿠팡 페이지를 먼저 열어주세요.");
    return;
  }

  setStatus("수집 중입니다. 쿠팡 탭을 그대로 두세요.");
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapePage,
  });

  lastScrape = result.result;
  await chrome.storage.local.set({ lastScrape });
  setStatus(`${lastScrape.source === "goldbox" ? "골드박스" : "판매자특가"} ${lastScrape.products.length}개 수집 완료`);
}

async function sendProducts() {
  const settings = await chrome.storage.local.get(["siteUrl", "adminToken", "lastScrape"]);
  const scrape = lastScrape || settings.lastScrape;

  if (!settings.adminToken) {
    setStatus("관리자 토큰을 먼저 저장하세요.");
    return;
  }

  if (!scrape?.products?.length) {
    setStatus("먼저 현재 탭 수집을 눌러주세요.");
    return;
  }

  setStatus("사이트로 전송 중입니다.");
  const response = await fetch(`${settings.siteUrl.replace(/\/$/, "")}/api/admin/deals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": settings.adminToken,
    },
    body: JSON.stringify(scrape),
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    setStatus(`전송 실패: ${data.message || response.status}`);
    return;
  }

  setStatus(`전송 완료: ${data.count}개. Vercel 배포까지 잠시 기다리면 됩니다.`);
}

document.querySelector("#saveSettings").addEventListener("click", saveSettings);
document.querySelector("#openGoldbox").addEventListener("click", () => chrome.tabs.create({ url: GOLD_BOX_URL }));
document.querySelector("#openSeller").addEventListener("click", () => chrome.tabs.create({ url: SELLER_URL }));
document.querySelector("#scrapeCurrent").addEventListener("click", scrapeCurrentTab);
document.querySelector("#sendProducts").addEventListener("click", sendProducts);

loadSettings();
