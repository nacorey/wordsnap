"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, signOut } from "@/app/auth/actions";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <span className="text-lg">WordSnap by 예윤대디</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                로그아웃
              </Button>
            </form>
          ) : (
            <form action={signInWithGoogle}>
              <Button type="submit" size="sm">
                Google 로그인
              </Button>
            </form>
          )}
          <Button variant="ghost" size="sm" type="button" aria-label="언어 설정">
            한/영
          </Button>
        </nav>
      </div>
    </header>
  );
}
