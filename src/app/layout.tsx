import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WordSnap - 이미지로 배우는 콜로케이션",
  description:
    "촬영·캡처한 텍스트에서 AI가 핵심 단어와 원어민 표현을 추출해 드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("font-sans", notoSansKr.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
