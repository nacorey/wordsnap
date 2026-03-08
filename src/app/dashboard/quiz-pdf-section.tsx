"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import type { VocabularyWithScan, CollocationDisplay } from "./vocabulary-card";
import { Button } from "@/components/ui/button";

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

/** 단답형: 영문 보여주고 한글 뜻 쓰기 */
type QuizItem = {
  word: string;
  phrase: string; // 영문 콜로케이션
  answer: string; // 한글 뜻 (정답)
};

export function QuizPdfSection({
  vocabularies,
}: {
  vocabularies: VocabularyWithScan[];
}) {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
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
    const quizItems: QuizItem[] = shuffled.map((x) => ({
      word: x.word,
      phrase: x.phrase,
      answer: x.answer,
    }));

    setLoading(true);
    try {
      const doc = new jsPDF({ unit: "mm" });
      const margin = 20;
      const lineHeight = 7;
      let y = 20;

      doc.setFontSize(16);
      doc.text("WordSnap 퀴즈", margin, y);
      y += lineHeight * 2;

      doc.setFontSize(11);
      quizItems.forEach((q, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`Q${i + 1}. [${q.word}]`, margin, y);
        y += lineHeight;
        doc.setFont("helvetica", "normal");
        doc.text(`   ${q.phrase}`, margin, y);
        y += lineHeight + 2;
        doc.text("   한글 뜻: _______________________", margin, y);
        y += lineHeight * 1.5;
      });

      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text("정답", margin, y);
      y += lineHeight;
      doc.setFont("helvetica", "normal");
      quizItems.forEach((q, i) => {
        doc.text(`Q${i + 1}: ${q.answer}`, margin, y);
        y += lineHeight;
      });

      doc.save("wordsnap-quiz.pdf");
    } finally {
      setLoading(false);
    }
  };

  if (vocabularies.length === 0) return null;

  const maxCount = vocabularies.flatMap((v) =>
    getPhrasesWithMeaning(v).filter((x) => x.meaningKo.length > 0)
  ).length;
  if (maxCount === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
      <h2 className="mb-3 text-base font-medium text-foreground">
        퀴즈 만들기
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        영문 콜로케이션을 보여주고 한글 뜻을 쓰는 단답형 퀴즈입니다. (최대 {maxCount}문제)
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span>퀴즈 개수</span>
          <input
            type="number"
            min={1}
            max={maxCount}
            value={count}
            onChange={(e) => setCount(Math.min(maxCount, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? "생성 중…" : "PDF 다운로드"}
        </Button>
      </div>
    </section>
  );
}
