# WordSnap 배포 설정 체크리스트

**최종 도메인:** https://wordsnap-daddy.vercel.app

---

## 1. Supabase 설정

### 1.1 Authentication → URL Configuration

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Authentication** → **URL Configuration**

| 항목 | 설정값 |
|------|--------|
| **Site URL** | `https://wordsnap-daddy.vercel.app` |
| **Redirect URLs** | 아래 목록이 **모두** 포함되어 있는지 확인 |

**Redirect URLs에 추가할 주소 (한 줄에 하나씩):**

```
https://wordsnap-daddy.vercel.app/auth/callback
https://wordsnap-daddy.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

- `**` 는 와일드카드(해당 경로 하위 모두 허용)입니다.
- 로컬 개발용 `localhost` 도 함께 두면 편합니다.

### 1.2 Google Provider (이미 했다면 스킵)

- **Authentication** → **Providers** → **Google** 활성화
- Google Cloud Console에서 발급한 Client ID / Client Secret 입력

### 1.3 DB / Storage (이미 했다면 스킵)

- **SQL Editor**에서 `supabase/schema.sql` 실행 완료
- **Storage**에 버킷 `scans` 생성 및 정책 설정

---

## 2. Vercel 설정

### 2.1 도메인

- 프로젝트 **Settings** → **Domains**
- `wordsnap-daddy.vercel.app` 이 나열되어 있으면 OK (기본 할당 도메인)

### 2.2 Environment Variables

**Settings** → **Environment Variables** 에 아래 3개가 **Production** (필요 시 Preview/Development) 에 설정되어 있는지 확인:

| Name | Value | 비고 |
|------|--------|------|
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI API 키 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://htyqazbofuyeskykublh.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon public 키 |

- 값을 수정했다면 **Redeploy** 한 번 실행하는 것이 안전합니다.

### 2.3 빌드 설정 (기본값이면 생략 가능)

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (기본)
- **Output Directory:** 기본값 유지
- **Install Command:** `npm install` (기본)

---

## 3. 동작 확인

1. **로그인:** https://wordsnap-daddy.vercel.app 접속 → Google 로그인 → `/dashboard` 로 이동하는지
2. **이미지 분석:** 대시보드에서 이미지 업로드 → 분석 후 단어 카드가 저장·표시되는지
3. **로그아웃:** 로그아웃 후 메인으로 돌아오는지

---

## 4. 문제 발생 시

- **로그인 후 "Invalid redirect" / 무한 리다이렉트**  
  → Supabase **Redirect URLs**에 `https://wordsnap-daddy.vercel.app/auth/callback` 이 정확히 들어갔는지 확인.

- **이미지 분석 401 / 500**  
  → Vercel **Environment Variables**에 `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_*` 가 설정돼 있는지, 설정 후 **Redeploy** 했는지 확인.

- **CORS / 네트워크 에러**  
  → Supabase **Site URL**이 `https://wordsnap-daddy.vercel.app` 로 되어 있는지 확인.
