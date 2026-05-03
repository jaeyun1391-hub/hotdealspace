import goldboxData from "@/data/goldbox-scrape.json";
import sellerSpecialData from "@/data/seller-special-scrape.json";
import type { CoupangProduct } from "@/lib/coupang";

type ScrapedProduct = {
  productId: string;
  productName: string;
  productImage: string;
  productUrl: string;
  affiliateUrl?: string;
  salePrice?: number;
  originalPrice?: number;
  discountRate?: number;
  soldRate?: number;
  reviewCount?: number;
  deliveryText?: string;
};

type ScrapedData = {
  scrapedAt?: string;
  products?: ScrapedProduct[];
};

const REPOSITORY = "jaeyun1391-hub/hotdealspace";
const BRANCH = "main";

const sellerFilterNames: Record<string, string> = {
  seller: "판매자특가",
  seller_under20000: "2만원 이하",
  seller_under10000: "만원 이하",
  seller_discount70: "70% 이상",
  seller_discount50: "50% 이상",
  seller_popular: "인기 특가",
};

const currentFilterNames: Record<string, string> = {
  current: "현재 특가 상품",
  current_under20000: "2만원 이하",
  current_under10000: "만원 이하",
  current_discount70: "70% 이상",
  current_discount50: "50% 이상",
  current_popular: "인기 특가",
};

async function fetchRemoteData(path: string, fallback: ScrapedData) {
  const githubHeaders: HeadersInit = {
    Accept: "application/vnd.github.raw",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_DATA_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_DATA_TOKEN}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/contents/${path}?ref=${BRANCH}`, {
      headers: githubHeaders,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (response.ok) {
      const text = await response.text();
      return JSON.parse(text) as ScrapedData;
    }
  } catch {
    // Fall back to the public raw URL below.
  }

  try {
    const response = await fetch(`https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}?t=${Date.now()}`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as ScrapedData;
  } catch {
    return fallback;
  }
}

function sortByPrice(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (a.productPrice ?? Number.MAX_SAFE_INTEGER) - (b.productPrice ?? Number.MAX_SAFE_INTEGER));
}

function sortByDiscount(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
}

function sortByPopularity(products: CoupangProduct[]) {
  return [...products].sort((a, b) => {
    const reviewGap = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);

    if (reviewGap !== 0) {
      return reviewGap;
    }

    return (b.soldRate ?? 0) - (a.soldRate ?? 0);
  });
}

function applyDealFilter(products: CoupangProduct[], filterId: string) {
  if (filterId.endsWith("_under10000")) {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 10000));
  }

  if (filterId.endsWith("_under20000")) {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 20000));
  }

  if (filterId.endsWith("_discount70")) {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 70));
  }

  if (filterId.endsWith("_discount50")) {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 50));
  }

  if (filterId.endsWith("_popular")) {
    return sortByPopularity(products);
  }

  return products;
}

function uniqueProducts(products: CoupangProduct[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = String(product.productId || product.productName);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toProducts(data: ScrapedData, label: string, categoryName: string): CoupangProduct[] {
  return (data.products ?? [])
    .filter((product) => product.productName && product.productImage && (product.affiliateUrl || product.productUrl))
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productPrice: product.salePrice,
      originalPrice: product.originalPrice,
      discountRate: product.discountRate,
      soldRate: product.soldRate,
      reviewCount: product.reviewCount,
      deliveryText: product.deliveryText,
      dealLabels: [label],
      productImage: product.productImage,
      productUrl: product.affiliateUrl ?? product.productUrl,
      categoryName,
      isRocket: label === "골드박스" ? true : undefined,
    }));
}

export function isGoldboxFilter(filterId: string) {
  return filterId === "goldbox";
}

export function isSellerSpecialFilter(filterId: string) {
  return filterId in sellerFilterNames;
}

export function isCurrentDealFilter(filterId: string) {
  return filterId in currentFilterNames;
}

export async function getGoldboxDeals() {
  const data = await fetchRemoteData("data/goldbox-scrape.json", goldboxData as ScrapedData);

  return {
    products: toProducts(data, "골드박스", "골드박스"),
    scrapedAt: data.scrapedAt,
  };
}

export async function getSellerSpecialDeals(filterId = "seller") {
  const data = await fetchRemoteData("data/seller-special-scrape.json", sellerSpecialData as ScrapedData);
  const filterName = sellerFilterNames[filterId] ?? "판매자특가";
  const products = toProducts(data, "판매자특가", filterName);

  return {
    products: applyDealFilter(products, filterId),
    scrapedAt: data.scrapedAt,
  };
}

export async function getCurrentDeals(filterId = "current") {
  const goldbox = await getGoldboxDeals();
  const seller = await getSellerSpecialDeals("seller");
  const categoryName = currentFilterNames[filterId] ?? "현재 특가 상품";
  const products = uniqueProducts([...goldbox.products, ...seller.products]).map((product) => ({
    ...product,
    dealLabels: ["현재 특가"],
    categoryName,
  }));

  return {
    products: applyDealFilter(products, filterId),
    scrapedAt: [goldbox.scrapedAt, seller.scrapedAt].filter(Boolean).sort().at(-1),
  };
}
