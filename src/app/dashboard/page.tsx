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

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="container mx-auto flex-1 px-4 py-8">
        <section className="mb-10">
          <h1 className="mb-2 text-2xl font-semibold text-foreground">
            하루 한 번씩, 쌓이면 능력이 됩니다
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            매일 조금씩 성장하는 예윤을 응원합니다.
          </p>
        </section>

        <DashboardUpload />

        <QuizPdfSection vocabularies={vocabularies} />

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            저장된 단어
          </h2>
          {vocabularies.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              아직 저장된 단어가 없습니다. 위에서 이미지를 업로드해 보세요.
            </p>
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
