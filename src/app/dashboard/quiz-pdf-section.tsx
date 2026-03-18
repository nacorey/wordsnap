"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { VocabularyWithScan, CollocationDisplay } from "./vocabulary-card";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";

/** 콜로케이션 목록 (phrase + 한글 뜻). 한글 뜻이 있는 것만 퀴즈에 사용 */
function getPhrasesWithMeaning(item: VocabularyWithScan): { phrase: string; meaningKo: string }[] {
  const raw = item.data?.collocations ?? [];
  return raw
    .map((c: CollocationDisplay) => {
      if (typeof c === "string") return { phrase: c, meaningKo: "" };
      const o = c as { phrase?: string; meaningKo?: string };
      return { phrase: o.phrase ?? "", meaningKo: o.meaningKo ?? "" };
    })
    .filter((x) => x.phrase.length > 0);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

/** 나눔고딕 폰트 로드 후 resolve */
function ensureNanumGothic(): Promise<void> {
  const id = "pdf-nanum-gothic";
  if (document.getElementById(id)) return document.fonts.ready.then(() => {});
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap";
  document.head.appendChild(link);
  return new Promise((resolve) => {
    link.onload = () => document.fonts.ready.then(() => resolve());
    link.onerror = () => resolve();
    setTimeout(resolve, 1500);
  });
}

/** 단답형: 영문 보여주고 한글 뜻 쓰기. 정답은 PDF에 포함하지 않음 */
type QuizItem = { word: string; phrase: string; answer: string };

const A4_MM = { w: 210, h: 297 };
const SCALE = 2;
const A4_HEIGHT_PX = Math.round((A4_MM.h / 25.4) * 96 * SCALE);

export function QuizPdfSection({
  vocabularies,
}: {
  vocabularies: VocabularyWithScan[];
}) {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    const withMeaning = vocabularies
      .map((v) => ({ item: v, list: getPhrasesWithMeaning(v).filter((x) => x.meaningKo.length > 0) }))
      .filter((x) => x.list.length >= 1);
    if (withMeaning.length === 0) {
      alert("한글 뜻이 저장된 콜로케이션이 없습니다. 새로 이미지를 분석하면 한글 뜻이 포함됩니다.");
      return;
    }
    const pool = withMeaning.flatMap(({ item, list }) =>
      list.map(({ phrase, meaningKo }) => ({ word: item.word, phrase, answer: meaningKo }))
    );
    const n = Math.min(Math.max(1, count), pool.length);
    const shuffled = shuffle(pool).slice(0, n);
    const quizItems: QuizItem[] = shuffled.map((x) => ({ word: x.word, phrase: x.phrase, answer: x.answer }));

    setLoading(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      await ensureNanumGothic();

      iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;left:0;top:0;width:794px;min-height:100px;border:0;opacity:0;pointer-events:none;z-index:-1;";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("iframe document not ready");

      const gridHtml = quizItems
        .map(
          (q, i) =>
            `<div style="font-size:13px;line-height:1.5;color:#111;">` +
            `<strong>Q${i + 1}. [${escapeHtml(q.word)}]</strong><br/>` +
            `${escapeHtml(q.phrase)}<br/>_______________________</div>`
        )
        .join("");

      doc.open();
      doc.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8">` +
          `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap">` +
          `</head><body style="margin:0;padding:24px;background:#ffffff;color:#111111;font-family:'Nanum Gothic',sans-serif;box-sizing:border-box;">` +
          `<h1 style="margin:0 0 20px 0;font-size:22px;font-weight:bold;color:#111;">WordSnap 퀴즈</h1>` +
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px 32px;margin-top:8px;">${gridHtml}</div>` +
          `</body></html>`
      );
      doc.close();

      await new Promise((r) => setTimeout(r, 400));

      const contentHeight = doc.body.scrollHeight || doc.body.offsetHeight || 400;
      iframe.style.height = `${contentHeight + 24}px`;

      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));

      const target = doc.body;
      const canvas = await html2canvas(target, {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = null;

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("캔버스 생성 실패");
      }

      const pdfDoc = new jsPDF({ unit: "mm" });
      const imgW = canvas.width;
      const imgH = canvas.height;
      const wMm = A4_MM.w;
      let drawn = 0;

      while (drawn < imgH) {
        if (drawn > 0) pdfDoc.addPage();
        const sliceH = Math.min(A4_HEIGHT_PX, imgH - drawn);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, imgW, sliceH);
          ctx.drawImage(canvas, 0, drawn, imgW, sliceH, 0, 0, imgW, sliceH);
        }
        const hMm = (sliceH / imgW) * wMm;
        const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
        pdfDoc.addImage(dataUrl, "JPEG", 0, 0, wMm, hMm);
        drawn += sliceH;
      }

      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      pdfDoc.save(`wordsnap-quiz_${yy}${mm}${dd}.pdf`);
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`PDF 생성 중 오류가 났습니다. 다시 시도해 주세요. (${msg})`);
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      setLoading(false);
    }
  };

  const maxCount = vocabularies.flatMap((v) =>
    getPhrasesWithMeaning(v).filter((x) => x.meaningKo.length > 0)
  ).length;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="size-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          퀴즈 만들기
        </h2>
      </div>
      {maxCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          저장된 단어가 있으면 콜로케이션 퀴즈를 PDF로 만들 수 있습니다.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            영문 콜로케이션을 보여주고 한글 뜻을 쓰는 단답형 퀴즈입니다. (최대 {maxCount}문제)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">퀴즈 개수</span>
              <input
                type="number"
                min={1}
                max={maxCount}
                value={count}
                onChange={(e) => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-16 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileDown className="size-3.5" />
                  PDF 다운로드
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
