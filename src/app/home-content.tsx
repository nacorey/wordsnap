"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ImageDropzone } from "@/components/image-dropzone";
import { Sparkles } from "lucide-react";

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
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <section className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              보는 즉시,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                내 단어가 되는
              </span>
            </h1>
            <p className="mx-auto max-w-md text-base text-muted-foreground">
              책이나 뉴스레터를 촬영하면 AI가 핵심 단어와
              원어민 콜로케이션을 만들어 드립니다.
            </p>
          </div>

          <p className="text-sm text-muted-foreground/80">
            매일 조금씩 성장하는 예윤을 응원합니다.
          </p>

          <ImageDropzone
            onFilesAccepted={handleFilesAccepted}
            disabled={status === "loading"}
          />

          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              이미지 분석 중...
            </div>
          )}
          {status === "error" && errorMessage && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
              {errorMessage} (상단에서 Google 로그인 후 다시 시도해 주세요.)
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
