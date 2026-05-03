import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "핫딜우주 단톡방 입장 후 응모하기",
  description:
    "핫딜우주 매일 응모 이벤트는 카카오톡 단톡방 입장 후 공지 안내에 따라 참여할 수 있습니다.",
  alternates: {
    canonical: "/daily-entry",
  },
};

export default function DailyEntryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <section className="mx-auto max-w-[680px]">
        <p className="text-sm font-bold text-orange-600">매일 응모</p>
        <h1 className="mt-2 text-3xl font-extrabold">단톡방 입장 후 응모하기</h1>
        <p className="mt-4 leading-7 text-slate-700">
          핫딜우주 매일 응모 이벤트는 카카오톡 단톡방에서 진행합니다. 단톡방에 입장한 뒤
          공지에 올라오는 응모 안내를 확인하고 참여하면 됩니다.
        </p>
        <p className="mt-4 leading-7 text-slate-700">
          당첨 발표는 단톡방 공지로 안내하고, 운영자는 카카오톡 단톡방 기능을 활용해
          당첨자를 선정할 수 있습니다.
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
