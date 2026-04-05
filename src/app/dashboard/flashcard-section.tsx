"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  ListChecks,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VocabularyWithScan, CollocationDisplay } from "./vocabulary-card";

/* ── helpers ─────────────────────────────────────────── */

function formatCollocation(c: CollocationDisplay) {
  if (typeof c === "string") return { phrase: c, meaningKo: "" };
  return { phrase: c.phrase ?? "", meaningKo: c.meaningKo ?? "" };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── fullscreen overlay ──────────────────────────────── */

function FlashcardOverlay({
  words,
  onClose,
}: {
  words: VocabularyWithScan[];
  onClose: () => void;
}) {
  const shuffled = useMemo(() => shuffle(words), [words]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const current = shuffled[index];
  const collocations =
    current?.data?.collocations?.map(formatCollocation) ?? [];
  const examples = current?.data?.examples ?? [];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return shuffled.length - 1;
        if (next >= shuffled.length) return 0;
        return next;
      });
      setShowAnswer(false);
    },
    [shuffled.length],
  );

  /* keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === " ") {
        e.preventDefault();
        setShowAnswer((p) => !p);
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, onClose]);

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            플래시카드
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {index + 1} / {shuffled.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* card area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          {/* word card */}
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-border/40 bg-card px-6 py-10 shadow-sm">
            <p className="text-4xl font-bold uppercase tracking-wide text-primary sm:text-5xl">
              {current?.word}
            </p>

            {showAnswer && (
              <div className="mt-8 w-full space-y-3">
                {collocations.length > 0 && (
                  <ul className="space-y-1.5">
                    {collocations.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-2 text-base"
                      >
                        <span className="font-medium text-foreground">
                          {c.phrase}
                        </span>
                        {c.meaningKo && (
                          <span className="text-sm text-muted-foreground">
                            {c.meaningKo}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {examples.length > 0 && (
                  <ul className="space-y-1.5 border-t border-border/40 pt-3">
                    {examples.map((ex, i) => (
                      <li
                        key={i}
                        className="text-sm leading-relaxed text-muted-foreground"
                      >
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full"
              onClick={() => go(-1)}
              aria-label="이전 단어"
            >
              <ChevronLeft className="size-5" />
            </Button>

            <Button
              type="button"
              variant={showAnswer ? "secondary" : "default"}
              size="default"
              className="gap-2 px-5"
              onClick={() => setShowAnswer((p) => !p)}
            >
              {showAnswer ? (
                <>
                  <EyeOff className="size-4" />
                  숨기기
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  정답 확인
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full"
              onClick={() => go(1)}
              aria-label="다음 단어"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            ← → 화살표 키로 이동 · Space로 정답 확인 · Esc로 닫기
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── dashboard card ──────────────────────────────────── */

export function FlashcardSection({
  vocabularies,
  selectedIds,
}: {
  vocabularies: VocabularyWithScan[];
  selectedIds: Set<string>;
}) {
  const [mode, setMode] = useState<"all" | "selected" | null>(null);

  const selectedVocabularies = useMemo(
    () => vocabularies.filter((v) => selectedIds.has(v.id)),
    [vocabularies, selectedIds],
  );

  const activeWords = mode === "selected" ? selectedVocabularies : vocabularies;

  return (
    <>
      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            플래시카드
          </h2>
        </div>

        {vocabularies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            저장된 단어가 있으면 플래시카드로 학습할 수 있습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-2.5 px-3.5 py-2.5"
              onClick={() => setMode("all")}
            >
              <Layers className="size-4 shrink-0 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">전체 단어 복습</p>
                <p className="text-xs text-muted-foreground">
                  {vocabularies.length}개 단어를 랜덤 순서로 학습
                </p>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-2.5 px-3.5 py-2.5"
              onClick={() => setMode("selected")}
              disabled={selectedIds.size === 0}
            >
              <ListChecks className="size-4 shrink-0 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">선택 단어 복습</p>
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size}개 선택된 단어만 학습`
                    : "아래에서 단어를 선택해 주세요"}
                </p>
              </div>
            </Button>
          </div>
        )}
      </section>

      {mode && activeWords.length > 0 && (
        <FlashcardOverlay words={activeWords} onClose={() => setMode(null)} />
      )}
    </>
  );
}
