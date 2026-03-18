"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { BookOpen, LogOut } from "lucide-react";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:text-primary"
        >
          <BookOpen className="size-5 text-primary" />
          <span className="text-lg tracking-tight">WordSnap</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            by 예윤대디
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="size-7 rounded-full ring-2 ring-primary/20"
                />
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.user_metadata?.full_name || user.email}
              </span>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </form>
            </div>
          ) : (
            <form action={signInWithGoogle}>
              <Button type="submit" size="sm" className="gap-1.5">
                Google 로그인
              </Button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
