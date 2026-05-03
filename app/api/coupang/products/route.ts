import { NextResponse } from "next/server";
import { fetchCoupangProducts, sampleProducts } from "@/lib/coupang";
import { getCurrentDeals, isCurrentDealFilter } from "@/lib/current-deals";
import { getScrapedGoldboxProducts, isGoldboxFilter } from "@/lib/scraped-goldbox";
import { getScrapedSellerSpecialProducts, isSellerSpecialFilter } from "@/lib/scraped-seller-special";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "category";
  const categoryId = searchParams.get("categoryId") ?? "goldbox";
  const keyword = searchParams.get("keyword") ?? "";
  const requestedLimit = Number(searchParams.get("limit") ?? 100);
  const limit = Math.min(requestedLimit, 100);

  try {
    if (view === "category" && !keyword.trim()) {
      if (isCurrentDealFilter(categoryId)) {
        const currentDeals = getCurrentDeals(categoryId);

        return NextResponse.json({
          products: currentDeals.products,
          source: "scraped",
          scrapedAt: currentDeals.scrapedAt,
          message: "",
        });
      }

      if (isGoldboxFilter(categoryId)) {
        const scrapedGoldbox = getScrapedGoldboxProducts();

        return NextResponse.json({
          products: scrapedGoldbox.products,
          source: "scraped",
          scrapedAt: scrapedGoldbox.scrapedAt,
          message: "",
        });
      }

      if (isSellerSpecialFilter(categoryId)) {
        const sellerSpecial = getScrapedSellerSpecialProducts(categoryId);

        return NextResponse.json({
          products: sellerSpecial.products,
          source: "scraped",
          scrapedAt: sellerSpecial.scrapedAt,
          message: "",
        });
      }
    }

    const data = await fetchCoupangProducts({
      view,
      categoryId,
      keyword,
      limit,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      products: sampleProducts,
      source: "sample",
      message: "쿠팡 API 호출에 실패해서 샘플 상품을 보여주고 있습니다. API 설정 상태를 확인해 주세요.",
    });
  }
}
