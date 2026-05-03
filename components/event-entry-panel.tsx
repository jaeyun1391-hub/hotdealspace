const kakaoChatUrl =
  process.env.NEXT_PUBLIC_KAKAO_CHAT_URL || "https://open.kakao.com/o/gob65dti";

export default function EventEntryPanel() {
  return (
    <section className="mt-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold text-orange-600">매일 응모</p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">단톡방 입장 후 응모하기</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        매일 응모 이벤트는 카카오톡 단톡방에서 진행합니다. 단톡방에 입장한 뒤 공지에
        올라오는 응모 버튼이나 안내 메시지를 확인해 주세요.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p className="font-bold text-slate-800">운영 방식</p>
        <p className="mt-1">1. 단톡방 입장</p>
        <p>2. 공지에 올라온 응모 안내 확인</p>
        <p>3. 단톡방 안에서 응모 참여</p>
        <p>4. 당첨 발표는 단톡방 공지로 확인</p>
      </div>

      {kakaoChatUrl ? (
        <a
          href={kakaoChatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-yellow-300 px-4 text-sm font-bold text-zinc-900"
        >
          카카오톡 단톡방 입장하기
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 min-h-12 w-full rounded-lg bg-slate-200 px-4 text-sm font-bold text-slate-500"
        >
          단톡방 링크 준비 중
        </button>
      )}

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        단톡방 링크가 준비되면 이 버튼이 바로 입장 링크로 바뀝니다.
      </p>
    </section>
  );
}
