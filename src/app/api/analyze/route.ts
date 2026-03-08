import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { AnalyzeWordItem, CollocationItem } from "@/lib/analyze-types";
import { isAllowedUser } from "@/lib/allowed-user";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "scans";

const SYSTEM_PROMPT = `You are an English vocabulary and collocation expert. Your task is to analyze an image that contains English text (e.g. from a book, article, newsletter, or PDF).

Do the following in one response:
1. OCR: Extract and read ALL English text visible in the image. Do not skip or omit any word or phrase.
2. From that full text, list every word or short phrase that is useful for learners. Include ALL important vocabulary—do not limit to a few. If the image has 10+ distinct words/phrases, include at least 5–10; if it has fewer, include every one. Prioritize: verbs, nouns, adjectives, and common collocations (e.g. verb+noun, adjective+noun).
3. For each word/phrase you include, provide:
   - word: the target word or phrase (exactly as it appears or in base form)
   - collocations: exactly 3 items. Each item must have "phrase" (the English collocation) and "meaningKo" (short Korean meaning, e.g. "정확한 측정" for "precise measurements").
   - examples: exactly 2 natural, realistic example sentences that a native might say or write (using the word or its collocations)

Important: Do not omit any English vocabulary that appears in the image. Prefer more entries over fewer when the image contains many words.

Respond only with valid JSON in this exact shape, no markdown or extra text:
{
  "words": [
    {
      "word": "target word",
      "collocations": [
        {"phrase": "precise measurements", "meaningKo": "정확한 측정"},
        {"phrase": "another phrase", "meaningKo": "한글 의미"},
        {"phrase": "third phrase", "meaningKo": "한글 의미"}
      ],
      "examples": ["Example sentence 1.", "Example sentence 2."]
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const allowed = await isAllowedUser(supabase, user);
    if (!allowed) {
      return NextResponse.json(
        { error: "가입 코드를 먼저 입력해 주세요." },
        { status: 403 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.size) {
      return NextResponse.json(
        { error: "No image provided. Send a form field named 'image'." },
        { status: 400 }
      );
    }

    const type = file.type;
    if (!type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image (e.g. image/jpeg, image/png)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${type};base64,${base64}`;

    // 1) 이미지를 Supabase Storage에 업로드
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: type,
        upsert: false,
      });
    let imageUrl = "";
    if (uploadError) {
      console.warn("[api/analyze] Storage upload failed:", uploadError);
      // 업로드 실패해도 분석은 진행 (image_url 빈 값으로 scan 저장)
    } else {
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);
      imageUrl = urlData.publicUrl;
    }

    // 2) scans 테이블에 기록 (image_url 없으면 빈 문자열)
    const { data: scanRow, error: scanError } = await supabase
      .from("scans")
      .insert({ user_id: user.id, image_url: imageUrl || "" })
      .select("id")
      .single();
    if (scanError || !scanRow) {
      console.error("[api/analyze] Scan insert failed:", scanError);
      return NextResponse.json(
        { error: "스캔 저장에 실패했습니다." },
        { status: 500 }
      );
    }
    const scanId = scanRow.id;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and return the JSON with key words, collocations, and examples as specified.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 8192,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No content in model response." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as { words?: unknown[] };
    if (!Array.isArray(parsed.words)) {
      return NextResponse.json(
        { error: "Invalid response shape: missing or invalid 'words' array." },
        { status: 502 }
      );
    }

    const words: AnalyzeWordItem[] = parsed.words
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const word = typeof o.word === "string" ? o.word : "";
        const rawColl = Array.isArray(o.collocations) ? o.collocations : [];
        const collocations: CollocationItem[] = rawColl.slice(0, 3).map((c) => {
          if (c && typeof c === "object" && "phrase" in c && typeof (c as Record<string, unknown>).phrase === "string")
            return {
              phrase: (c as Record<string, unknown>).phrase as string,
              meaningKo: typeof (c as Record<string, unknown>).meaningKo === "string" ? (c as Record<string, unknown>).meaningKo as string : "",
            };
          return { phrase: typeof c === "string" ? c : "", meaningKo: "" };
        });
        const examples = Array.isArray(o.examples)
          ? o.examples.filter((e): e is string => typeof e === "string")
          : [];
        if (!word || collocations.length === 0) return null;
        return {
          word,
          collocations: [
            collocations[0] ?? { phrase: "", meaningKo: "" },
            collocations[1] ?? { phrase: "", meaningKo: "" },
            collocations[2] ?? { phrase: "", meaningKo: "" },
          ] as [CollocationItem, CollocationItem, CollocationItem],
          examples: [examples[0] ?? "", examples[1] ?? ""] as [string, string],
        };
      })
      .filter((w): w is AnalyzeWordItem => w !== null);

    // 3) vocabularies 테이블에 단어별 저장 (data: { collocations, examples })
    if (words.length > 0) {
      const rows = words.map((w) => ({
        scan_id: scanId,
        word: w.word,
        data: { collocations: w.collocations, examples: w.examples },
      }));
      const { error: vocabError } = await supabase
        .from("vocabularies")
        .insert(rows);
      if (vocabError) {
        console.error("[api/analyze] Vocabularies insert failed:", vocabError);
        // 저장 실패해도 분석 결과는 반환
      }
    }

    // 응답: { word, collocations, examples }를 포함한 JSON 배열
    return NextResponse.json(words satisfies AnalyzeWordItem[]);
  } catch (err) {
    console.error("[api/analyze]", err);
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
