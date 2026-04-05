"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VocabularyWithScan, CollocationDisplay } from "./vocabulary-card";

function formatCollocation(c: CollocationDisplay): {
  phrase: string;
  meaningKo: string;
} {
  if (typeof c === "string") return { phrase: c, meaningKo: "" };
  return { phrase: c.phrase ?? "", meaningKo: c.meaningKo ?? "" };
}

export function FlashcardSection({
  vocabularies,
}: {
  vocabularies: VocabularyWithScan[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const goTo = useCallback(
    (dir: -1 | 1) => {
      if (vocabularies.length === 0) return;
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return vocabularies.length - 1;
        if (next >= vocabularies.length) return 0;
        return next;
      });
      setShowAnswer(false);
    },
    [vocabularies.length],
  );

  const safeIndex =
    vocabularies.length === 0
      ? -1
      : currentIndex >= vocabularies.length
        ? 0
        : currentIndex;
  const current = safeIndex >= 0 ? vocabularies[safeIndex] : null;

  const collocations = current?.data?.collocations?.map(formatCollocation) ?? [];
  const examples = current?.data?.examples ?? [];

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="size-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">플래시카드</h2>
        {vocabularies.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {safeIndex + 1} / {vocabularies.length}
          </span>
        )}
      </div>

      {vocabularies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          저장된 단어가 있으면 플래시카드로 학습할 수 있습니다.
        </p>
      ) : (
        <>
          {/* Card area */}
          <div className="relative mb-4 flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/30 px-4 py-6">
            <p className="text-2xl font-bold uppercase tracking-wide text-primary">
              {current?.word}
            </p>

            {showAnswer && (
              <div className="mt-4 w-full space-y-2">
                {collocations.length > 0 && (
                  <ul className="space-y-1">
                    {collocations.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {c.phrase}
                        </span>
                        {c.meaningKo && (
                          <span className="text-xs text-muted-foreground">
                            {c.meaningKo}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {examples.length > 0 && (
                  <ul className="space-y-1 border-t border-border/40 pt-2">
                    {examples.map((ex, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-muted-foreground"
                      >
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => goTo(-1)}
              aria-label="이전 단어"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Button
              type="button"
              variant={showAnswer ? "secondary" : "default"}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowAnswer((prev) => !prev)}
            >
              <Eye className="size-3.5" />
              {showAnswer ? "숨기기" : "정답 확인"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => goTo(1)}
              aria-label="다음 단어"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
