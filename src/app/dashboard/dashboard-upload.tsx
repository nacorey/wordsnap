"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";

export function DashboardUpload() {
  const router = useRouter();
  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [imgMessage, setImgMessage] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [wordStatus, setWordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wordMessage, setWordMessage] = useState("");

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setImgStatus("loading");
    setImgMessage("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setImgStatus("error");
        setImgMessage(data?.error ?? "분석에 실패했습니다.");
        return;
      }
      setImgStatus("success");
      setImgMessage("저장되었습니다. 목록을 불러오는 중…");
      router.refresh();
      setImgMessage("저장되었습니다.");
    } catch {
      setImgStatus("error");
      setImgMessage("요청 중 오류가 발생했습니다.");
    }
  };

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
      setWordMessage(`${Array.isArray(data) ? data.length : list.length}개 단어 저장됨.`);
      setWordInput("");
      router.refresh();
    } catch {
      setWordStatus("error");
      setWordMessage("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">이미지로 추가</p>
        <ImageDropzone
          onFilesAccepted={handleFilesAccepted}
          disabled={imgStatus === "loading"}
        />
        {imgStatus === "loading" && (
          <p className="text-sm text-muted-foreground">이미지 분석 중…</p>
        )}
        {imgStatus === "success" && imgMessage && (
          <p className="text-sm text-primary">{imgMessage}</p>
        )}
        {imgStatus === "error" && imgMessage && (
          <p className="text-sm text-destructive">{imgMessage}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">단어로 추가</p>
        <p className="text-xs text-muted-foreground">
          단어를 입력하면 AI가 콜로케이션과 예문을 만들어 저장합니다. (줄바꿈 또는 쉼표로 구분)
        </p>
        <textarea
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          placeholder="예: precise, measurement, accurate"
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={wordStatus === "loading"}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleWordsSubmit}
          disabled={wordStatus === "loading"}
        >
          {wordStatus === "loading" ? "처리 중…" : "단어 추가"}
        </Button>
        {wordStatus === "success" && wordMessage && (
          <p className="text-sm text-primary">{wordMessage}</p>
        )}
        {wordStatus === "error" && wordMessage && (
          <p className="text-sm text-destructive">{wordMessage}</p>
        )}
      </div>
    </div>
  );
}
