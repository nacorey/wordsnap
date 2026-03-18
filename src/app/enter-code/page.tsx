import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { isAllowedUser } from "@/lib/allowed-user";
import { EnterCodeForm } from "./enter-code-form";
import { KeyRound } from "lucide-react";

export default async function EnterCodePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const allowed = await isAllowedUser(supabase, user);
  if (allowed) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <section className="w-full max-w-sm space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <KeyRound className="size-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                가입 코드 입력
              </h1>
              <p className="text-sm text-muted-foreground">
                사용 권한을 위해 코드를 입력해 주세요.
              </p>
            </div>
            <EnterCodeForm />
          </div>
        </section>
      </main>
    </div>
  );
}
