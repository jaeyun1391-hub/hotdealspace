import type { Metadata } from "next";
import DealTabs from "@/components/deal-tabs";

export const metadata: Metadata = {
  title: "핫딜우주 - 핫딜 채널 모음 펨코 퀘이사존 뽐뿌 루리웹",
  description:
    "핫딜우주에서 펨코, 퀘이사존, 뽐뿌, 루리웹 등 인기 핫딜 채널 흐름과 쿠팡 특가, 매일 응모 이벤트를 빠르게 확인하세요.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="fixed left-0 right-0 top-0 z-50 bg-zinc-200 px-3 py-2 text-center text-[11px] leading-snug text-zinc-700">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공합니다.
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pb-8 pt-12">
        <header className="py-5">
          <p className="text-sm font-semibold text-orange-600">핫딜 채널 모음</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">
            핫딜우주
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            펨코, 퀘이사존, 뽐뿌, 루리웹 흐름을 참고해 쿠팡 특가와 매일 응모 정보를
            빠르게 보는 화면입니다.
          </p>
        </header>

        <DealTabs />
      </section>
    </main>
  );
}
