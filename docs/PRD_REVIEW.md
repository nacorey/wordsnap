# PRD v2.0 최종 검토

## 1. 프로젝트 아키텍처 ✅

| 항목 | PRD | 구현 |
|------|-----|------|
| Frontend | Next.js 14+ App Router, Tailwind, Shadcn/UI | ✅ `src/app` App Router, Tailwind, Shadcn (Button, Card) |
| Backend | Next.js Route Handlers | ✅ `src/app/api/analyze/route.ts` |
| AI Engine | OpenAI GPT-4o (Vision + LM) | ✅ GPT-4o Vision, JSON 응답 |
| DB & Auth | Supabase, Google OAuth | ✅ Supabase Auth Google, `scans` / `vocabularies` |
| Storage | Supabase Storage | ✅ 이미지 업로드 후 `scans` 이미지 URL 저장 |
| Deployment | Vercel | ✅ 배포 준비 (환경 변수 가이드 포함) |

---

## 2. 주요 기능 요구사항 ✅

### 2.1 사용자 인증 ✅
- 구글 소셜 로그인: Supabase Auth Google 연동 (`/auth/callback`, Server Actions)
- 세션 관리: 로그인 사용자만 `/api/analyze` 호출·저장·대시보드 조회 가능 (401 미로그인)

### 2.2 이미지 분석 및 AI 생성 ✅
- 멀티모달 OCR: GPT-4o Vision으로 이미지 텍스트 인식
- 핵심 단어 3~5개: 프롬프트에 3–5개 명시
- 단어별 Collocation 3개, Example 2개: 응답 및 DB `data` 필드에 저장
- 데이터 정형화: `{ word, collocations, examples }[]` JSON → DB 즉시 저장

### 2.3 개인 학습 라이브러리 ✅
- 히스토리 저장: 분석 결과를 `vocabularies` + `scans`에 자동 저장
- 조회·필터링: 대시보드에서 저장된 단어 카드 목록, 최신순
- 이미지 보관: Supabase Storage 버킷 `scans` 업로드, `scans.image_url` 저장

### 2.4 배포 인프라 ✅
- 환경 변수: `.env.example` 및 Vercel 설정 가이드
- 자동 배포: GitHub 연동 시 Main 푸시로 배포 가능

---

## 3. 데이터베이스 스키마 ✅

| 테이블 | 컬럼 | 구현 |
|--------|------|------|
| profiles | id, email, avatar_url | ✅ `supabase/schema.sql` |
| scans | id, user_id, image_url | ✅ 생성 및 RLS |
| vocabularies | id, scan_id, word, data (JSONB) | ✅ 생성, `data`: { collocations, examples } |

---

## 4. 사용자 흐름 ✅

1. **로그인** → Google 로그인 후 `/dashboard` 리다이렉트 ✅  
2. **캡처/업로드** → Dropzone + Ctrl+V, 홈/대시보드 업로드 ✅  
3. **AI 프로세싱** → `POST /api/analyze` → GPT-4o → JSON 배열 반환 ✅  
4. **자동 저장** → 동일 API에서 Storage 업로드, `scans`/`vocabularies` insert ✅  
5. **복습** → 대시보드 "저장된 단어" 카드 UI ✅  

---

## 5. 구현 로드맵 (Step 1–4) ✅

- **Step 1** 환경 설정: Next.js, Supabase, `.env` 가이드 ✅  
- **Step 2** 구글 로그인: Supabase Auth, 리다이렉트, 로그아웃 ✅  
- **Step 3** Route Handler: 이미지 → GPT-4o Vision → `{ word, collocations, examples }[]` ✅  
- **Step 4** DB 연동: vocabularies 저장, 대시보드 카드 UI ✅  

---

## 배포 전 체크리스트

- [ ] Supabase SQL Editor에서 `supabase/schema.sql` 실행
- [ ] Supabase Storage에 버킷 `scans` 생성 및 정책 설정 (Authenticated INSERT)
- [ ] Vercel 환경 변수: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase Auth Redirect URL에 배포 도메인 `/auth/callback` 추가
