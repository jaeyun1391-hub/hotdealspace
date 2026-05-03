"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import EventEntryPanel from "@/components/event-entry-panel";

type Product = {
  productId: number | string;
  productName: string;
  productPrice?: number;
  originalPrice?: number;
  discountRate?: number;
  soldRate?: number;
  reviewCount?: number;
  deliveryText?: string;
  dealLabels?: string[];
  productImage: string;
  productUrl: string;
  categoryName?: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
};

type ApiResponse = {
  products: Product[];
  source: "coupang" | "sample" | "scraped";
  message?: string;
  scrapedAt?: string;
};

const categories = [
  { id: "goldbox", name: "골드박스" },
  { id: "seller", name: "판매자특가" },
  { id: "seller_under20000", name: "2만원 이하" },
  { id: "seller_under10000", name: "만원 이하" },
  { id: "seller_discount70", name: "70% 이상" },
  { id: "seller_discount50", name: "50% 이상" },
  { id: "seller_popular", name: "인기 특가" },
];

const tabs = [
  { id: "hot", label: "🔥 실시간 핫딜" },
  { id: "event", label: "🎁 매일 응모" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatPrice(price?: number) {
  if (!price) {
    return "가격 확인";
  }

  return `${price.toLocaleString("ko-KR")}원`;
}

function formatCount(count?: number) {
  if (!count) {
    return "";
  }

  return count.toLocaleString("ko-KR");
}

function getDiscountRate(product: Product) {
  if (product.discountRate && product.discountRate > 0) {
    return Math.round(product.discountRate);
  }

  if (!product.originalPrice || !product.productPrice || product.originalPrice <= product.productPrice) {
    return undefined;
  }

  return Math.round(((product.originalPrice - product.productPrice) / product.originalPrice) * 100);
}

export default function DealTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<ApiResponse["source"]>("sample");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === selectedCategory)?.name ?? "추천",
    [selectedCategory],
  );

  async function loadProducts(nextKeyword = keyword, nextCategory = selectedCategory) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    setProducts([]);
    setMessage("");

    const params = new URLSearchParams({
      view: nextKeyword.trim() ? "search" : "category",
      categoryId: nextCategory,
      keyword: nextKeyword.trim(),
      limit: nextKeyword.trim() ? "10" : "100",
      refresh: String(Date.now()),
    });

    try {
      const response = await fetch(`/api/coupang/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ApiResponse;

      if (requestId !== requestIdRef.current) {
        return;
      }

      setProducts(data.products);
      setSource(data.source);
      setMessage(data.message ?? "");
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setProducts([]);
      setSource("sample");
      setMessage("상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProducts("", selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadProducts(keyword, selectedCategory);
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategory(categoryId);
    setKeyword("");
    loadProducts("", categoryId);
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav
        aria-label="콘텐츠 탭"
        role="tablist"
        className="grid grid-cols-2 gap-2 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 rounded-md px-3 text-sm font-bold transition ${
                isActive ? "bg-slate-950 text-white shadow-sm" : "bg-transparent text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "hot" ? (
        <section className="mt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <label className="sr-only" htmlFor="product-search">
              쿠팡 상품 검색
            </label>
            <input
              id="product-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="상품명이나 브랜드명을 입력하세요"
              className="min-h-12 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-slate-950"
            />
            <button
              type="submit"
              className="min-h-12 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"
            >
              검색
            </button>
          </form>

          <div className="mt-4">
            <p className="text-xs font-bold text-orange-600">카테고리</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => {
                const isActive = category.id === selectedCategory;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.id)}
                    className={`shrink-0 rounded-md border px-3 py-2 text-xs font-bold ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">
                {keyword.trim() ? `"${keyword.trim()}" 검색 결과` : `${selectedCategoryName} 특가`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {source === "coupang" || source === "scraped"
                  ? `${products.length}개 상품을 불러왔습니다`
                  : "API 설정 전 샘플 화면"}
              </p>
            </div>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {message}
            </p>
          ) : null}

          <div key={`${selectedCategory}-${keyword.trim()}`} className="mt-3 grid grid-cols-2 gap-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
                  />
                ))
              : products.map((product) => {
                  const discountRate = getDiscountRate(product);
                  const hasDiscount = Boolean(discountRate && product.originalPrice && product.productPrice);

                  return (
                    <a
                      key={product.productId}
                      href={product.productUrl}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
                    >
                      <div className="aspect-square bg-slate-100">
                        <img
                          src={product.productImage}
                          alt={product.productName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3">
                        <div className="mb-2 flex min-h-5 flex-wrap gap-1">
                          {product.dealLabels?.map((label) => (
                            <span
                              key={label}
                              className="rounded bg-red-50 px-1.5 py-1 text-[10px] font-bold text-red-700"
                            >
                              {label}
                            </span>
                          ))}
                          {product.isRocket ? (
                            <span className="rounded bg-blue-50 px-1.5 py-1 text-[10px] font-bold text-blue-700">
                              로켓
                            </span>
                          ) : null}
                          {product.isFreeShipping ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-700">
                              무료배송
                            </span>
                          ) : null}
                        </div>
                        <h2 className="line-clamp-2 min-h-10 text-xs leading-5 text-slate-800">
                          {product.productName}
                        </h2>
                        <div className="mt-3 text-right">
                          {hasDiscount ? (
                            <p className="text-[11px] text-slate-400 line-through">
                              정가 {formatPrice(product.originalPrice)}
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-slate-400">현재 판매가</p>
                          )}
                          <p className="mt-0.5 flex items-baseline justify-end gap-1.5">
                            {hasDiscount ? (
                              <span className="text-sm font-extrabold text-red-600">{discountRate}%</span>
                            ) : null}
                            <span className="text-sm font-extrabold text-red-600">
                              {formatPrice(product.productPrice)}
                            </span>
                          </p>
                          {product.reviewCount ? (
                            <p className="mt-1 text-[10px] font-bold text-slate-500">
                              리뷰 {formatCount(product.reviewCount)}개
                            </p>
                          ) : null}
                          {product.deliveryText ? (
                            <p className="mt-1 truncate text-[10px] font-bold text-blue-600">
                              {product.deliveryText}
                            </p>
                          ) : null}
                          {product.soldRate ? (
                            <div className="mt-2">
                              <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
                                <div
                                  className="h-full rounded-full bg-orange-400"
                                  style={{ width: `${Math.min(product.soldRate, 100)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-right text-[10px] font-bold text-orange-600">
                                {product.soldRate}% 판매됨
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </a>
                  );
                })}
          </div>
        </section>
      ) : (
        <EventEntryPanel />
      )}
    </div>
  );
}
