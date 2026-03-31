import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedUser } from "@/lib/allowed-user";

/** DELETE /api/vocabularies  body: { ids: string[] } */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const allowed = await isAllowedUser(supabase, user);
  if (!allowed) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 배열을 보내주세요." }, { status: 400 });
  }

  const { data: deleted, error } = await supabase
    .from("vocabularies")
    .delete()
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "삭제 실패", detail: error.message }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json(
      { error: "삭제되지 않았습니다. Supabase에 DELETE RLS 정책을 추가하세요." },
      { status: 403 }
    );
  }

  return NextResponse.json({ deleted: deleted.length });
}
