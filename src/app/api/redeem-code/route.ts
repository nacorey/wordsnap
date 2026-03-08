import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json(
        { error: "코드를 입력해 주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("redeem_code", { p_code: code });
    if (error) {
      console.error("[api/redeem-code]", error);
      return NextResponse.json(
        { error: "코드 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const result = data as { ok?: boolean; error?: string } | null;
    if (result?.ok === true) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { ok: false, error: result?.error ?? "유효하지 않은 코드입니다." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/redeem-code]", err);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
