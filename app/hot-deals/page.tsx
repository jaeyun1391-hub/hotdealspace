import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "핫딜우주 핫딜 채널 모음 - 펨코 퀘이사존 뽐뿌 루리웹",
  description:
    "펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 쿠팡 특가 상품을 확인하는 핫딜우주 안내 페이지입니다.",
  alternates: {
    canonical: "/hot-deals",
  },
};

export default function HotDealsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <section className="mx-auto max-w-[680px]">
        <p className="text-sm font-bold text-orange-600">핫딜 채널 모음</p>
        <h1 className="mt-2 text-3xl font-extrabold">핫딜우주 핫딜 채널 모음</h1>
        <p className="mt-4 leading-7 text-slate-700">
          핫딜우주는 펨코, 퀘이사존, 뽐뿌, 루리웹 등 여러 커뮤니티에서 사람들이 많이
          확인하는 핫딜 흐름을 참고해 쿠팡 특가 상품과 카테고리별 인기 상품을 빠르게
          살펴볼 수 있도록 만든 모바일 쇼핑 체크 페이지입니다.
        </p>
        <p className="mt-4 leading-7 text-slate-700">
          메인 화면에서는 전체 특가, 식품, 뷰티, 주방용품, 생활용품, 가전디지털 등
          카테고리별 상품을 확인하고 상품명이나 브랜드명으로 검색할 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"
        >
          핫딜우주 메인으로 가기
        </Link>
      </section>
    </main>
  );
}
