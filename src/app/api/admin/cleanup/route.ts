import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedUser } from "@/lib/allowed-user";

type VocabRow = { id: string; word: string; created_at: string };

/**
 * GET /api/admin/cleanup
 * 1) 중복 단어 삭제 (case-insensitive, 최신 유지)
 * 2) 단어 소문자 정규화
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

  const summary = { deduplicated: 0, normalized: 0 };

  // 1. 전체 단어 조회 (최신순)
  const { data: vocabs, error: fetchError } = await supabase
    .from("vocabularies")
    .select("id, word, created_at")
    .order("created_at", { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: "조회 실패", detail: fetchError.message }, { status: 500 });
  }
  if (!vocabs || vocabs.length === 0) {
    return NextResponse.json({ message: "단어가 없습니다.", summary });
  }

  // 2. 중복 삭제: 같은 단어(대소문자 무관) 중 최신 하나만 유지
  const groups = new Map<string, VocabRow[]>();
  for (const v of vocabs as VocabRow[]) {
    const key = v.word.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  const deleteIds: string[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length > 1) {
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
    if (error) {
      return NextResponse.json({
        error: "중복 삭제 실패 — RLS DELETE 권한을 확인하세요.",
        detail: error.message,
        deleteIds,
      }, { status: 500 });
    }
    summary.deduplicated = deleteIds.length;
  }

  // 3. 소문자 정규화
  const { data: remaining } = await supabase
    .from("vocabularies")
    .select("id, word");

  if (remaining) {
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
  }

  return NextResponse.json({
    message: "정리 완료",
    summary,
    totalAfterCleanup: (remaining?.length ?? vocabs.length) - summary.deduplicated,
  });
}
