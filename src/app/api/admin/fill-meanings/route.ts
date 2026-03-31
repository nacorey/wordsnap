import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { isAllowedUser } from "@/lib/allowed-user";

type CollEntry = string | { phrase?: string; meaningKo?: string };
type VocabData = { collocations?: CollEntry[]; examples?: string[] };
type VocabRow = { id: string; word: string; data: VocabData };

/**
 * GET /api/admin/fill-meanings
 * 한글 뜻이 없는 콜로케이션을 AI로 채웁니다.
 * 한 번에 최대 20개씩 처리 (Vercel 타임아웃 대비).
 * 남은 게 있으면 다시 접속하세요.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }
  const allowed = await isAllowedUser(supabase, user);
  if (!allowed) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY 없음" }, { status: 500 });
  }

  // 1. 전체 단어 조회
  const { data: vocabs } = await supabase
    .from("vocabularies")
    .select("id, word, data") as { data: VocabRow[] | null };

  if (!vocabs || vocabs.length === 0) {
    return NextResponse.json({ message: "단어가 없습니다." });
  }

  // 2. 한글 뜻 없는 콜로케이션 찾기
  const needsMeaning: {
    vocabId: string;
    word: string;
    phrase: string;
    collIndex: number;
  }[] = [];

  for (const v of vocabs) {
    const colls = v.data?.collocations ?? [];
    colls.forEach((c: CollEntry, i: number) => {
      if (typeof c === "string" && c.length > 0) {
        needsMeaning.push({ vocabId: v.id, word: v.word, phrase: c, collIndex: i });
      } else if (c && typeof c === "object") {
        if (c.phrase && (!c.meaningKo || c.meaningKo.trim() === "")) {
          needsMeaning.push({
            vocabId: v.id,
            word: v.word,
            phrase: c.phrase,
            collIndex: i,
          });
        }
      }
    });
  }

  if (needsMeaning.length === 0) {
    return NextResponse.json({ message: "모든 콜로케이션에 한글 뜻이 있습니다.", filled: 0, remaining: 0 });
  }

  // 3. 최대 20개만 처리 (타임아웃 방지)
  const batch = needsMeaning.slice(0, 20);
  const lines = batch
    .map((m, i) => `${i + 1}. [${m.word}] ${m.phrase}`)
    .join("\n");

  const openai = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });

  let filled = 0;
  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3.6-plus-preview:free",
      messages: [
        {
          role: "system",
          content: `Translate each English collocation to a short Korean meaning (2-4 words).\nRespond ONLY with a valid JSON array, no markdown:\n[{"index": 1, "meaningKo": "한글 뜻"}, {"index": 2, "meaningKo": "한글 뜻"}, ...]`,
        },
        { role: "user", content: lines },
      ],
      max_tokens: 2048,
    });

    let raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const meanings = JSON.parse(raw) as { index: number; meaningKo: string }[];

    // vocabId별로 data 업데이트 준비
    const vocabUpdates = new Map<string, VocabData>();

    for (const m of meanings) {
      const item = batch[m.index - 1];
      if (!item || !m.meaningKo) continue;

      if (!vocabUpdates.has(item.vocabId)) {
        const vocab = vocabs.find((v) => v.id === item.vocabId);
        if (!vocab) continue;
        vocabUpdates.set(item.vocabId, JSON.parse(JSON.stringify(vocab.data)));
      }

      const data = vocabUpdates.get(item.vocabId)!;
      const coll = data.collocations?.[item.collIndex];
      if (typeof coll === "string") {
        data.collocations![item.collIndex] = { phrase: coll, meaningKo: m.meaningKo };
      } else if (coll && typeof coll === "object") {
        (coll as { meaningKo?: string }).meaningKo = m.meaningKo;
      }
    }

    for (const [id, data] of Array.from(vocabUpdates.entries())) {
      const { error } = await supabase
        .from("vocabularies")
        .update({ data })
        .eq("id", id);
      if (!error) filled++;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      error: "AI 호출 실패",
      detail: msg,
      filled,
      remaining: needsMeaning.length - batch.length,
    }, { status: 502 });
  }

  const remainingCount = needsMeaning.length - batch.length;
  return NextResponse.json({
    message: remainingCount > 0
      ? `${filled}개 단어 한글 뜻 채움. 아직 ${remainingCount}개 남음 — 다시 접속하세요.`
      : `${filled}개 단어 한글 뜻 채움. 완료!`,
    filled,
    remaining: remainingCount,
  });
}
