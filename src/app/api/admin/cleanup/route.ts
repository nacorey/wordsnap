import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { isAllowedUser } from "@/lib/allowed-user";

type CollEntry = string | { phrase?: string; meaningKo?: string };
type VocabData = { collocations?: CollEntry[]; examples?: string[] };
type VocabRow = { id: string; word: string; data: VocabData; created_at: string };

/**
 * GET /api/admin/cleanup
 * 로그인 상태에서 브라우저로 접속하면 실행됩니다.
 * 1) 중복 단어 삭제 (case-insensitive, 최신 유지)
 * 2) 단어 소문자 정규화
 * 3) 빈 한글 뜻 AI로 채우기
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

  const summary = { deduplicated: 0, normalized: 0, meaningsFilled: 0 };

  // ── 1. 전체 단어 조회 (최신순) ──
  const { data: vocabs } = await supabase
    .from("vocabularies")
    .select("id, word, data, created_at")
    .order("created_at", { ascending: false });

  if (!vocabs || vocabs.length === 0) {
    return NextResponse.json({ message: "단어가 없습니다.", summary });
  }

  // ── 2. 중복 삭제: 같은 단어(대소문자 무관) 중 최신 하나만 유지 ──
  const groups = new Map<string, VocabRow[]>();
  for (const v of vocabs as VocabRow[]) {
    const key = v.word.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  const deleteIds: string[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length > 1) {
      // index 0 = 최신 (이미 created_at desc 정렬)
      for (let i = 1; i < group.length; i++) {
        deleteIds.push(group[i].id);
      }
    }
  }

  if (deleteIds.length > 0) {
    const { error } = await supabase
      .from("vocabularies")
      .delete()
      .in("id", deleteIds);
    if (!error) summary.deduplicated = deleteIds.length;
    else console.error("[cleanup] Dedup delete failed:", error);
  }

  // ── 3. 남은 단어 재조회 ──
  const { data: remaining } = await supabase
    .from("vocabularies")
    .select("id, word, data") as { data: VocabRow[] | null };

  if (!remaining) {
    return NextResponse.json({ message: "재조회 실패", summary });
  }

  // ── 4. 소문자 정규화 ──
  for (const v of remaining) {
    const lower = v.word.toLowerCase();
    if (v.word !== lower) {
      const { error } = await supabase
        .from("vocabularies")
        .update({ word: lower })
        .eq("id", v.id);
      if (!error) summary.normalized++;
    }
  }

  // ── 5. 한글 뜻 없는 콜로케이션 찾기 ──
  const needsMeaning: {
    vocabId: string;
    word: string;
    phrase: string;
    collIndex: number;
  }[] = [];

  for (const v of remaining) {
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

  // ── 6. AI로 한글 뜻 채우기 ──
  if (needsMeaning.length > 0) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const openai = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const BATCH = 30;
      for (let b = 0; b < needsMeaning.length; b += BATCH) {
        const batch = needsMeaning.slice(b, b + BATCH);
        const lines = batch
          .map((m, i) => `${i + 1}. [${m.word}] ${m.phrase}`)
          .join("\n");

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
            raw = raw
              .replace(/^```(?:json)?\s*\n?/, "")
              .replace(/\n?```\s*$/, "");
          }

          const meanings = JSON.parse(raw) as {
            index: number;
            meaningKo: string;
          }[];

          // vocabId별로 data 업데이트 준비
          const vocabUpdates = new Map<string, VocabData>();

          for (const m of meanings) {
            const item = batch[m.index - 1];
            if (!item || !m.meaningKo) continue;

            if (!vocabUpdates.has(item.vocabId)) {
              const vocab = remaining.find((v) => v.id === item.vocabId);
              if (!vocab) continue;
              vocabUpdates.set(
                item.vocabId,
                JSON.parse(JSON.stringify(vocab.data))
              );
            }

            const data = vocabUpdates.get(item.vocabId)!;
            const coll = data.collocations?.[item.collIndex];
            if (typeof coll === "string") {
              data.collocations![item.collIndex] = {
                phrase: coll,
                meaningKo: m.meaningKo,
              };
            } else if (coll && typeof coll === "object") {
              (coll as { meaningKo?: string }).meaningKo = m.meaningKo;
            }
          }

          // DB 업데이트
          for (const [id, data] of Array.from(vocabUpdates.entries())) {
            const { error } = await supabase
              .from("vocabularies")
              .update({ data })
              .eq("id", id);
            if (!error) {
              // 이 vocab에서 채워진 콜로케이션 수 카운트
              const filled = batch.filter((b) => b.vocabId === id).length;
              summary.meaningsFilled += filled;
            }
          }
        } catch (e) {
          console.error("[cleanup] AI meanings batch failed:", e);
        }
      }
    }
  }

  return NextResponse.json({
    message: "정리 완료",
    summary,
    details: {
      totalWords: remaining.length - summary.deduplicated,
      phrasesNeededMeaning: needsMeaning.length,
    },
  });
}
