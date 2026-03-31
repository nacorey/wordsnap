import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { isAllowedUser } from "@/lib/allowed-user";
import { type VocabularyWithScan } from "./vocabulary-card";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const allowed = await isAllowedUser(supabase, user);
  if (!allowed) {
    redirect("/enter-code");
  }

  const { data: rows } = await supabase
    .from("vocabularies")
    .select("id, word, data, created_at, scans(created_at, image_url)")
    .order("created_at", { ascending: false });

  const vocabularies = (rows ?? []) as VocabularyWithScan[];

  const firstName = user.user_metadata?.full_name?.split(" ")[0] || "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header user={user} />
      <main className="container mx-auto flex-1 space-y-10 px-4 py-8">
        {/* 인사 섹션 */}
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `${firstName}님, ` : ""}하루 한 번씩, 쌓이면 능력이 됩니다
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            매일 조금씩 성장하는 예윤을 응원합니다.
          </p>
        </section>

        <DashboardClient vocabularies={vocabularies} />
      </main>
    </div>
  );
}
