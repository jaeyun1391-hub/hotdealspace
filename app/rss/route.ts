const siteUrl = "https://www.hotdealspace.com";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const now = new Date().toUTCString();
  const title = "핫딜우주";
  const description =
    "핫딜우주에서 펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 쿠팡 특가, 응모 정보를 확인하세요.";
  const items = [
    {
      title: "핫딜우주 메인",
      link: `${siteUrl}/`,
      guid: `${siteUrl}/`,
      description:
        "핫딜우주 메인 화면에서 커뮤니티 핫딜 흐름, 쿠팡 특가, 응모 정보를 한 번에 확인할 수 있습니다.",
    },
    {
      title: "핫딜우주 핫딜 채널 모음",
      link: `${siteUrl}/hot-deals`,
      guid: `${siteUrl}/hot-deals`,
      description:
        "펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 쿠팡 특가 상품을 빠르게 살펴볼 수 있습니다.",
    },
    {
      title: "핫딜우주 단톡방 입장 후 응모하기",
      link: `${siteUrl}/daily-entry`,
      guid: `${siteUrl}/daily-entry`,
      description:
        "핫딜우주 매일 응모 이벤트는 카카오톡 단톡방 입장 후 공지 안내에 따라 참여할 수 있습니다.",
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(description)}</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${now}</pubDate>
      <guid>${item.guid}</guid>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
