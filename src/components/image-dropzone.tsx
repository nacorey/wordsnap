"use client";

import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export interface ImageDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export function ImageDropzone({
  onFilesAccepted,
  className,
  disabled = false,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled,
    noClick: disabled,
  });

  // Ctrl+V 클립보드 붙여넣기 지원
  useEffect(() => {
    if (disabled) return;
    const handlePaste = (e: ClipboardEvent) => {
      const item = e.clipboardData?.items?.[0];
      if (item?.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) onFilesAccepted([file]);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, onFilesAccepted]);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex min-h-[280px] w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
        "border-input bg-muted/30 hover:bg-muted/50 hover:border-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragActive && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input {...getInputProps()} aria-label="이미지 업로드" />
      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
        <svg
          className="size-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm font-medium">
          {isDragActive
            ? "여기에 놓으세요"
            : "이미지를 끌어다 놓거나 클릭하여 선택"}
        </p>
        <p className="text-xs">JPG, PNG, WebP, GIF (최대 10MB)</p>
        <p className="text-xs text-muted-foreground/80">
          캡처한 경우 Ctrl+V로 붙여넣기 가능
        </p>
      </div>
    </div>
  );
}
