import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.hotdealspace.com"),
  title: {
    default: "핫딜우주",
    template: "%s | 핫딜우주",
  },
  applicationName: "핫딜우주",
  description:
    "핫딜우주에서 펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 특가 상품, 응모 정보를 빠르게 확인하세요.",
  keywords: [
    "핫딜우주",
    "핫딜",
    "핫딜 커뮤니티",
    "펨코 핫딜",
    "퀘이사존 핫딜",
    "뽐뿌 핫딜",
    "루리웹 핫딜",
    "쿠팡 특가",
    "오늘의 응모",
  ],
  verification: {
    other: {
      "naver-site-verification": "459c8a15a08d84c2579a8d6d706a07b26549633b",
    },
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/rss",
    },
  },
  openGraph: {
    title: "핫딜우주 - 핫딜 채널 모음",
    description:
      "펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 쿠팡 특가, 응모 정보를 한 번에 확인하세요.",
    type: "website",
    locale: "ko_KR",
    url: "https://www.hotdealspace.com",
    siteName: "핫딜우주",
  },
  twitter: {
    card: "summary_large_image",
    title: "핫딜우주 - 핫딜 채널 모음",
    description:
      "펨코, 퀘이사존, 뽐뿌, 루리웹 등 주요 커뮤니티 핫딜 흐름과 쿠팡 특가, 응모 정보를 한 번에 확인하세요.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
