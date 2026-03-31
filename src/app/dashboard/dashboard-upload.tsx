"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Check, AlertCircle } from "lucide-react";

export function DashboardUpload() {
  const router = useRouter();
  const [wordInput, setWordInput] = useState("");
  const [wordStatus, setWordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wordMessage, setWordMessage] = useState("");

  const handleWordsSubmit = async () => {
    const list = wordInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      setWordMessage("단어를 입력해 주세요.");
      setWordStatus("error");
      return;
    }
    setWordStatus("loading");
    setWordMessage("");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: list }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWordStatus("error");
        setWordMessage((data?.error as string) ?? "저장에 실패했습니다.");
        return;
      }
      setWordStatus("success");
      const saved = data.words?.length ?? 0;
      const skipped = data.skippedCount ?? 0;
      if (skipped > 0 && saved > 0) {
        setWordMessage(`${saved}개 저장됨. (${skipped}개는 이미 존재)`);
      } else if (skipped > 0 && saved === 0) {
        setWordMessage(`모두 이미 저장된 단어입니다.`);
      } else {
        setWordMessage(`${saved}개 단어 저장됨.`);
      }
      setWordInput("");
      router.refresh();
    } catch {
      setWordStatus("error");
      setWordMessage("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        단어를 입력하면 AI가 콜로케이션과 예문을 만들어 저장합니다. (줄바꿈 또는 쉼표로 구분)
      </p>
      <textarea
        value={wordInput}
        onChange={(e) => setWordInput(e.target.value)}
        placeholder="예: precise, measurement, accurate"
        rows={5}
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
        disabled={wordStatus === "loading"}
      />
      <Button
        type="button"
        size="sm"
        onClick={handleWordsSubmit}
        disabled={wordStatus === "loading"}
        className="gap-1.5"
      >
        {wordStatus === "loading" ? (
          <>
            <div className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            분석 중...
          </>
        ) : (
          <>
            <Send className="size-3.5" />
            단어 추가
          </>
        )}
      </Button>
      <StatusMessage status={wordStatus} message={wordMessage} />
    </div>
  );
}

function StatusMessage({
  status,
  message,
}: {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}) {
  if (status === "loading" && !message) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        AI가 콜로케이션과 예문을 생성하고 있어요...
      </div>
    );
  }
  if (status === "success" && message) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <Check className="size-3.5" />
        {message}
      </p>
    );
  }
  if (status === "error" && message) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="size-3.5" />
        {message}
      </p>
    );
  }
  return null;
}
