import goldboxData from "@/data/goldbox-scrape.json";
import type { CoupangProduct } from "@/lib/coupang";

type ScrapedGoldboxProduct = {
  productId: string;
  productName: string;
  productImage: string;
  productUrl: string;
  affiliateUrl?: string;
  salePrice?: number;
  originalPrice?: number;
  discountRate?: number;
  soldRate?: number;
};

type ScrapedGoldboxData = {
  scrapedAt?: string;
  products?: ScrapedGoldboxProduct[];
};

const filterNames: Record<string, string> = {
  goldbox: "전체 특가",
  under20000: "2만원 이하",
  under10000: "만원 이하",
  discount60: "60% 이상 할인",
  discount50: "50% 이상 할인",
  popular: "인기 특가",
};

function sortByPrice(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (a.productPrice ?? Number.MAX_SAFE_INTEGER) - (b.productPrice ?? Number.MAX_SAFE_INTEGER));
}

function sortByDiscount(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
}

function sortBySoldRate(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (b.soldRate ?? 0) - (a.soldRate ?? 0));
}

function applyGoldboxFilter(products: CoupangProduct[], filterId: string) {
  if (filterId === "under10000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 10000));
  }

  if (filterId === "under20000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 20000));
  }

  if (filterId === "discount60") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 60));
  }

  if (filterId === "discount50") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 50));
  }

  if (filterId === "popular") {
    return sortBySoldRate(products.filter((product) => (product.soldRate ?? 0) >= 70));
  }

  return products;
}

export function isGoldboxFilter(filterId: string) {
  return filterId in filterNames;
}

export function getScrapedGoldboxProducts(filterId = "goldbox") {
  const data = goldboxData as ScrapedGoldboxData;
  const filterName = filterNames[filterId];

  const products: CoupangProduct[] = (data.products ?? [])
    .filter((product) => product.productName && product.productImage && (product.affiliateUrl || product.productUrl))
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productPrice: product.salePrice,
      originalPrice: product.originalPrice,
      discountRate: product.discountRate,
      soldRate: product.soldRate,
      dealLabels: ["골드박스", filterName].filter(Boolean),
      productImage: product.productImage,
      productUrl: product.affiliateUrl ?? product.productUrl,
      categoryName: filterName ?? "골드박스",
      isRocket: true,
    }));

  return {
    products: applyGoldboxFilter(products, filterId),
    scrapedAt: data.scrapedAt,
  };
}
