# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WordSnap** — 이미지 속 영어 텍스트를 GPT-4o Vision으로 분석해 핵심 단어, 콜로케이션(한국어 뜻 포함), 예문을 자동 생성하는 AI 영어 학습 플랫폼. UI는 한국어.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm start        # 프로덕션 서빙
```

## Tech Stack

Next.js 14 (App Router, `src/`) · Supabase (Auth + PostgreSQL + Storage) · OpenAI GPT-4o-mini · Tailwind CSS + shadcn/ui · html2canvas + jsPDF

## Architecture

```
사용자 → Google OAuth → Supabase Auth
                          ↓
                    invite code 검증 (/enter-code)
                          ↓
                    /dashboard (메인)
                     ├─ 이미지 업로드 → POST /api/analyze → GPT-4o Vision → DB 저장
                     ├─ 단어 직접 입력 → POST /api/words   → GPT-4o-mini  → DB 저장
                     └─ 퀴즈 PDF 생성 (html2canvas + jsPDF, 클라이언트)
```

### 인증 흐름

Google OAuth → `/auth/callback` 토큰 교환 → 미들웨어(`src/middleware.ts`)가 매 요청마다 세션 갱신. 로그인 후 `allowed_users` 테이블에 없으면 `/enter-code`로 리다이렉트. 초대 코드 입력 시 `redeem_code` Supabase RPC 함수가 `invite_codes` 검증 후 `allowed_users`에 등록.

`isAllowedUser()` (`src/lib/allowed-user.ts`) — 페이지 수준 리다이렉트와 API 라우트 가드 양쪽에서 사용.

### Supabase 클라이언트

| 환경 | 파일 | 패턴 |
|------|------|------|
| Server (RSC, Route Handler) | `src/lib/supabase/server.ts` | `cookies()` 기반 `createServerClient` |
| Browser (Client Component) | `src/lib/supabase/client.ts` | `createBrowserClient` |

모든 테이블에 RLS 적용 — 본인 데이터만 접근 가능.

### API Routes

| 엔드포인트 | 입력 | 동작 |
|-----------|------|------|
| `POST /api/analyze` | `FormData` (`image` 필드) | Storage 업로드 → GPT-4o Vision 분석 → `scans` + `vocabularies` 저장 |
| `POST /api/words` | `{ words: string[] }` | 수동 입력 단어 → GPT-4o-mini 콜로케이션 생성 → DB 저장 |
| `POST /api/redeem-code` | `{ code: string }` | `redeem_code` RPC로 초대 코드 검증 |

### DB Schema (`supabase/schema.sql`)

```
profiles ← auth.users (1:1)
scans ← user_id (사용자별 업로드 세션)
vocabularies ← scan_id (단어별 JSONB data: { collocations: [{phrase, meaningKo}], examples: [str] })
invite_codes / allowed_users (초대 코드 접근 제어)
```

### 핵심 타입

`AnalyzeWordItem`, `CollocationItem` → `src/lib/analyze-types.ts`

## Environment Variables

`.env.example` 참고:

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Deployment

Vercel — `main` 브랜치 push 시 자동 배포. 환경 변수는 Vercel 대시보드에서 관리.
