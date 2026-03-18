"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function EnterCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setMessage("코드를 입력해 주세요.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage((data?.error as string) ?? "코드 사용에 실패했습니다.");
        return;
      }
      if (data?.ok === true) {
        router.refresh();
        router.push("/dashboard");
        return;
      }
      setStatus("error");
      setMessage((data?.error as string) ?? "유효하지 않은 코드입니다.");
    } catch {
      setStatus("error");
      setMessage("요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="가입 코드를 입력하세요"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-sm tracking-widest transition-colors placeholder:text-muted-foreground placeholder:tracking-normal focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
        disabled={status === "loading"}
        autoComplete="off"
      />
      <Button
        type="submit"
        className="w-full"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <div className="flex items-center gap-2">
            <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            확인 중...
          </div>
        ) : (
          "확인"
        )}
      </Button>
      {status === "error" && message && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-3.5" />
          {message}
        </p>
      )}
    </form>
  );
}
