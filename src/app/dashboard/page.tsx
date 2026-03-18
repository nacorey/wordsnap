import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { isAllowedUser } from "@/lib/allowed-user";
import {
  VocabularyCard,
  type VocabularyWithScan,
} from "./vocabulary-card";
import { DashboardUpload } from "./dashboard-upload";
import { QuizPdfSection } from "./quiz-pdf-section";
import { BookOpen } from "lucide-react";

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

        {/* 단어 추가 + 퀴즈 만들기 (2단 그리드) */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              새 단어 추가
            </h2>
            <DashboardUpload />
          </section>

          <QuizPdfSection vocabularies={vocabularies} />
        </div>

        {/* 저장된 단어 */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              저장된 단어
            </h2>
            {vocabularies.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {vocabularies.length}
              </span>
            )}
          </div>
          {vocabularies.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                아직 저장된 단어가 없습니다. 위에서 단어를 추가해 보세요.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vocabularies.map((item) => (
                <VocabularyCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
