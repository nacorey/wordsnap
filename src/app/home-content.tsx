"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ImageDropzone } from "@/components/image-dropzone";

export function HomeContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setStatus("error");
        setErrorMessage("로그인 후 이미지 분석 및 저장을 이용할 수 있습니다.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMessage((data?.error as string) ?? "분석에 실패했습니다.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={null} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <section className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              이미지를 업로드하세요
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              책이나 뉴스레터를 촬영·캡처하면 AI가 핵심 단어와 콜로케이션을
              만들어 드립니다.
            </p>
          </div>
          <ImageDropzone
            onFilesAccepted={handleFilesAccepted}
            disabled={status === "loading"}
          />
          {status === "loading" && (
            <p className="text-center text-sm text-muted-foreground">
              이미지 분석 중…
            </p>
          )}
          {status === "error" && errorMessage && (
            <p className="text-center text-sm text-destructive">
              {errorMessage} (상단에서 Google 로그인 후 다시 시도해 주세요.)
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
