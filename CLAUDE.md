# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WordSnap** — 이미지 속 영어 텍스트를 GPT-4o-mini로 분석해 핵심 단어, 콜로케이션(한국어 뜻 포함), 예문을 자동 생성하는 AI 영어 학습 플랫폼. UI는 한국어.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
```

테스트 프레임워크 미설정 — 테스트 스크립트·의존성 없음.

## Tech Stack

Next.js 14 (App Router, `src/`) · Supabase (Auth + PostgreSQL + Storage) · OpenRouter (google/gemma-4-31b-it:free) · Tailwind CSS + shadcn/ui · html2canvas + jsPDF · Noto Sans KR (앱) + Nanum Gothic (PDF)

## Architecture

```
사용자 → Google OAuth → Supabase Auth
                          ↓
                    invite code 검증 (/enter-code)
                          ↓
                    /dashboard (메인)
                     ├─ 이미지 업로드 → POST /api/analyze → GPT-4o-mini (Vision) → DB 저장
                     ├─ 단어 직접 입력 → POST /api/words   → GPT-4o-mini          → DB 저장
                     └─ 퀴즈 PDF 생성 (클라이언트: iframe → html2canvas → jsPDF)
```

### 페이지 라우팅

| 경로 | 종류 | 동작 |
|------|------|------|
| `/` | Server Page | 로그인 시 `/dashboard`로 리다이렉트, 미로그인 시 랜딩 |
| `/dashboard` | Server Page | 메인 — 단어 추가·퀴즈 PDF·저장된 단어 목록 |
| `/enter-code` | Client Page | 초대 코드 입력 (allowed_users 미등록 시 리다이렉트) |
| `/auth/callback` | Route Handler | OAuth 코드 → 세션 교환 후 `/dashboard`로 이동 |

### 인증 흐름

Google OAuth → `/auth/callback` 토큰 교환 → 미들웨어(`src/middleware.ts`)가 매 요청마다 세션 갱신. 로그인 후 `allowed_users` 테이블에 없으면 `/enter-code`로 리다이렉트. 초대 코드 입력 시 `redeem_code` Supabase RPC 함수(SECURITY DEFINER)가 `invite_codes` 검증 후 `allowed_users`에 등록.

`isAllowedUser()` (`src/lib/allowed-user.ts`) — 페이지 수준 리다이렉트와 API 라우트 가드 양쪽에서 사용.

Server Actions: `signInWithGoogle()`, `signOut()` → `src/app/auth/actions.ts`

### Supabase 클라이언트

| 환경 | 파일 | 패턴 |
|------|------|------|
| Server (RSC, Route Handler) | `src/lib/supabase/server.ts` | `cookies()` 기반 `createServerClient` |
| Browser (Client Component) | `src/lib/supabase/client.ts` | `createBrowserClient` |

모든 테이블에 RLS 적용 — 본인 데이터만 접근 가능.

### API Routes

| 엔드포인트 | 입력 | 동작 |
|-----------|------|------|
| `POST /api/analyze` | `FormData` (`image` 필드) | Storage 업로드 → GPT-4o-mini Vision 분석 → `scans` + `vocabularies` 저장 |
| `POST /api/words` | `{ words: string[] }` | 수동 입력 단어 → GPT-4o-mini 콜로케이션 생성 → `scans`(image_url="") + `vocabularies` 저장 |
| `POST /api/redeem-code` | `{ code: string }` | `redeem_code` RPC로 초대 코드 검증 |

두 API 모두 `scans` 행을 생성한 뒤 `vocabularies`를 연결. 수동 입력(`/api/words`)도 `scans`에 빈 `image_url`로 행 생성.

### DB Schema (`supabase/schema.sql`)

```
profiles ← auth.users (1:1)
scans ← user_id (사용자별 업로드 세션, 수동 입력 시 image_url="")
vocabularies ← scan_id (단어별 JSONB data: { collocations: [{phrase, meaningKo}], examples: [str] })
invite_codes / allowed_users (초대 코드 접근 제어, redeem_code RPC로만 등록)
```

### 핵심 타입

- `AnalyzeWordItem`, `CollocationItem` → `src/lib/analyze-types.ts`
- `CollocationDisplay` (`vocabulary-card.tsx`) — 레거시 `string` 또는 `{ phrase, meaningKo }` 두 형태 모두 처리. 새 데이터는 항상 `{ phrase, meaningKo }` 형태.
- `VocabularyWithScan` — `vocabularies` + `scans` 조인 결과 타입

### 퀴즈 PDF 생성 (클라이언트 전용)

`quiz-pdf-section.tsx`에서 처리. Nanum Gothic 웹폰트를 동적 로드 → 숨겨진 iframe에 퀴즈 HTML 렌더링 → `html2canvas`로 캡처 → `jsPDF`로 A4 분할 출력. 서버 API 호출 없음.

## Environment Variables

`.env.example` 참고:

```
OPENROUTER_API_KEY=sk-or-v1-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Google OAuth 설정: Supabase Dashboard > Authentication > Providers > Google에 Google Cloud OAuth 클라이언트 ID/비밀번호 등록. Redirect URL에 `/auth/callback` 경로 추가 필요.

## Deployment

Vercel — `main` 브랜치 push 시 자동 배포. 환경 변수는 Vercel 대시보드에서 관리.
