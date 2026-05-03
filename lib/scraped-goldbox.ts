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

export function getScrapedGoldboxProducts() {
  const data = goldboxData as ScrapedGoldboxData;

  const products: CoupangProduct[] = (data.products ?? [])
    .filter((product) => product.productName && product.productImage && (product.affiliateUrl || product.productUrl))
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productPrice: product.salePrice,
      originalPrice: product.originalPrice,
      discountRate: product.discountRate,
      soldRate: product.soldRate,
      dealLabels: ["골드박스"],
      productImage: product.productImage,
      productUrl: product.affiliateUrl ?? product.productUrl,
      categoryName: "골드박스",
      isRocket: true,
    }));

  return {
    products,
    scrapedAt: data.scrapedAt,
  };
}
