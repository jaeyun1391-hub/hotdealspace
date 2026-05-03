import sellerSpecialData from "@/data/seller-special-scrape.json";
import type { CoupangProduct } from "@/lib/coupang";

type ScrapedSellerSpecialProduct = {
  productId: string;
  productName: string;
  productImage: string;
  productUrl: string;
  affiliateUrl?: string;
  salePrice?: number;
  originalPrice?: number;
  discountRate?: number;
  reviewCount?: number;
  deliveryText?: string;
};

type ScrapedSellerSpecialData = {
  scrapedAt?: string;
  products?: ScrapedSellerSpecialProduct[];
};

const filterNames: Record<string, string> = {
  seller: "판매자특가",
  seller_under20000: "2만원 이하",
  seller_under10000: "만원 이하",
  seller_discount70: "70% 이상",
  seller_discount50: "50% 이상",
  seller_popular: "인기 특가",
};

function sortByPrice(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (a.productPrice ?? Number.MAX_SAFE_INTEGER) - (b.productPrice ?? Number.MAX_SAFE_INTEGER));
}

function sortByDiscount(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
}

function sortByReview(products: CoupangProduct[]) {
  return [...products].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
}

function applySellerFilter(products: CoupangProduct[], filterId: string) {
  if (filterId === "seller_under10000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 10000));
  }

  if (filterId === "seller_under20000") {
    return sortByPrice(products.filter((product) => (product.productPrice ?? 0) > 0 && (product.productPrice ?? 0) <= 20000));
  }

  if (filterId === "seller_discount70") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 70));
  }

  if (filterId === "seller_discount50") {
    return sortByDiscount(products.filter((product) => (product.discountRate ?? 0) >= 50));
  }

  if (filterId === "seller_popular") {
    return sortByReview(products);
  }

  return products;
}

export function isSellerSpecialFilter(filterId: string) {
  return filterId in filterNames;
}

export function getScrapedSellerSpecialProducts(filterId = "seller") {
  const data = sellerSpecialData as ScrapedSellerSpecialData;
  const filterName = filterNames[filterId];

  const products: CoupangProduct[] = (data.products ?? [])
    .filter((product) => product.productName && product.productImage && (product.affiliateUrl || product.productUrl))
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productPrice: product.salePrice,
      originalPrice: product.originalPrice,
      discountRate: product.discountRate,
      reviewCount: product.reviewCount,
      deliveryText: product.deliveryText,
      dealLabels: ["판매자특가", filterName].filter(Boolean),
      productImage: product.productImage,
      productUrl: product.affiliateUrl ?? product.productUrl,
      categoryName: filterName ?? "판매자특가",
    }));

  return {
    products: applySellerFilter(products, filterId),
    scrapedAt: data.scrapedAt,
  };
}
