"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { DashboardUpload } from "./dashboard-upload";
import { QuizPdfSection } from "./quiz-pdf-section";
import { VocabularyCard, type VocabularyWithScan } from "./vocabulary-card";

export function DashboardClient({
  vocabularies,
}: {
  vocabularies: VocabularyWithScan[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === vocabularies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vocabularies.map((v) => v.id)));
    }
  };

  const quizVocabularies =
    selectedIds.size > 0
      ? vocabularies.filter((v) => selectedIds.has(v.id))
      : vocabularies;

  return (
    <>
      {/* 단어 추가 + 퀴즈 만들기 (2단 그리드) */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            새 단어 추가
          </h2>
          <DashboardUpload />
        </section>

        <QuizPdfSection
          vocabularies={quizVocabularies}
          selectedCount={selectedIds.size}
        />
      </div>

      {/* 저장된 단어 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">저장된 단어</h2>
          {vocabularies.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {vocabularies.length}
            </span>
          )}
          {vocabularies.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {selectedIds.size === vocabularies.length
                ? "전체 해제"
                : "전체 선택"}
            </button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <p className="mb-3 text-xs text-primary">
            {selectedIds.size}개 선택됨 — 퀴즈에 선택한 단어만 포함됩니다.
          </p>
        )}
        {vocabularies.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              아직 저장된 단어가 없습니다. 위에서 단어를 추가해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vocabularies.map((item) => (
              <VocabularyCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
