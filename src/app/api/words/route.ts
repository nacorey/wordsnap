import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { AnalyzeWordItem, CollocationItem } from "@/lib/analyze-types";
import { isAllowedUser } from "@/lib/allowed-user";
import { createClient } from "@/lib/supabase/server";

const WORDS_SYSTEM_PROMPT = `You are an English vocabulary and collocation expert. Given a list of English words, for EACH word provide:
- word: the same word (base form)
- collocations: exactly 3 items. Each must have "phrase" (English collocation) and "meaningKo" (short Korean meaning, e.g. "정확한 측정" for "precise measurements").
- examples: exactly 2 natural example sentences using the word or its collocations.

Respond only with valid JSON, no markdown or extra text:
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawWords = body?.words;
    if (!Array.isArray(rawWords) || rawWords.length === 0) {
      return NextResponse.json(
        { error: "words 배열을 보내주세요. (예: { \"words\": [\"word1\", \"word2\"] })" },
        { status: 400 }
      );
    }

    const wordsList = rawWords
      .filter((w): w is string => typeof w === "string")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (wordsList.length === 0) {
      return NextResponse.json(
        { error: "유효한 단어가 없습니다." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const prompt = `For each of these words, provide collocations and examples as specified: ${wordsList.join(", ")}`;

    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3.6-plus:free",
      messages: [
        { role: "system", content: WORDS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
    });

    let raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No content in model response." },
        { status: 502 }
      );
    }

    // Strip markdown code block wrappers if present
    raw = raw.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
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

    // 기존 단어 조회 (case-insensitive 중복 체크)
    const { data: existingRows } = await supabase
      .from("vocabularies")
      .select("word");
    const existingWords = new Set(
      (existingRows ?? []).map((r: { word: string }) => r.word.toLowerCase())
    );

    const newWords = words.filter((w) => !existingWords.has(w.word.toLowerCase()));
    const skippedCount = words.length - newWords.length;

    if (newWords.length > 0) {
      const { data: scanRow, error: scanError } = await supabase
        .from("scans")
        .insert({ user_id: user.id, image_url: "" })
        .select("id")
        .single();
      if (scanError || !scanRow) {
        console.error("[api/words] Scan insert failed:", scanError);
        return NextResponse.json(
          { error: "저장에 실패했습니다." },
          { status: 500 }
        );
      }

      const rows = newWords.map((w) => ({
        scan_id: scanRow.id,
        word: w.word,
        data: { collocations: w.collocations, examples: w.examples },
      }));
      const { error: vocabError } = await supabase
        .from("vocabularies")
        .insert(rows);
      if (vocabError) {
        console.error("[api/words] Vocabularies insert failed:", vocabError);
        return NextResponse.json(
          { error: "단어 저장에 실패했습니다." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ words: newWords, skippedCount });
  } catch (err) {
    console.error("[api/words]", err);
    const message = err instanceof Error ? err.message : "Failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
