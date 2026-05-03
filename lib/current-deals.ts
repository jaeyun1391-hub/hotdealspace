import type { CoupangProduct } from "@/lib/coupang";
import { getScrapedGoldboxProducts } from "@/lib/scraped-goldbox";
import { getScrapedSellerSpecialProducts } from "@/lib/scraped-seller-special";

const filterNames: Record<string, string> = {
  current: "현재 특가 상품",
  current_under20000: "2만원 이하",
  current_under10000: "만원 이하",
  current_discount70: "70% 이상",
  current_discount50: "50% 이상",
  current_popular: "인기 특가",
};

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

function applyCurrentDealFilter(products: CoupangProduct[], filterId: string) {
  if (filterId === "current_under10000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 10000));
  }

  if (filterId === "current_under20000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 20000));
  }

  if (filterId === "current_discount70") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 70));
  }

  if (filterId === "current_discount50") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 50));
  }

  if (filterId === "current_popular") {
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

export function isCurrentDealFilter(filterId: string) {
  return filterId in filterNames;
}

export function getCurrentDeals(filterId = "current") {
  const goldbox = getScrapedGoldboxProducts();
  const seller = getScrapedSellerSpecialProducts("seller");
  const products = uniqueProducts([...goldbox.products, ...seller.products]).map((product) => ({
    ...product,
    dealLabels: ["현재 특가"],
    categoryName: filterNames[filterId] ?? "현재 특가 상품",
  }));

  return {
    products: applyCurrentDealFilter(products, filterId),
    scrapedAt: [goldbox.scrapedAt, seller.scrapedAt].filter(Boolean).sort().at(-1),
  };
}
