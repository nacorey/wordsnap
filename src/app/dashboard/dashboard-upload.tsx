"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDropzone } from "@/components/image-dropzone";

export function DashboardUpload() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setStatus("loading");
    setMessage("");

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
        setStatus("error");
        setMessage(data?.error ?? "분석에 실패했습니다.");
        return;
      }
      setStatus("success");
      setMessage("저장되었습니다. 목록을 불러오는 중…");
      router.refresh();
      setMessage("저장되었습니다.");
    } catch {
      setStatus("error");
      setMessage("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-2">
      <ImageDropzone
        onFilesAccepted={handleFilesAccepted}
        disabled={status === "loading"}
      />
      {status === "loading" && (
        <p className="text-center text-sm text-muted-foreground">
          이미지 분석 중…
        </p>
      )}
      {status === "success" && message && (
        <p className="text-center text-sm text-primary">{message}</p>
      )}
      {status === "error" && message && (
        <p className="text-center text-sm text-destructive">{message}</p>
      )}
    </div>
  );
}
