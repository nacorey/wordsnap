"use client";

import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { ImagePlus, ClipboardPaste } from "lucide-react";

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
        "group relative flex min-h-[220px] w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
        "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragActive && "border-primary bg-primary/5 shadow-md shadow-primary/10",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input {...getInputProps()} aria-label="이미지 업로드" />
      <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
        <div className={cn(
          "flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors",
          "group-hover:bg-primary/15",
          isDragActive && "bg-primary/20"
        )}>
          <ImagePlus className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/80">
            {isDragActive
              ? "여기에 놓으세요"
              : "이미지를 끌어다 놓거나 클릭"}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, GIF (최대 10MB)
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <ClipboardPaste className="size-3" />
          <span>Ctrl+V 붙여넣기 가능</span>
        </div>
      </div>
    </div>
  );
}
