## 📄 PRD: WordSnap by 예윤아빠빠 (v2.0)

**"보는 즉시 내 단어가 되는 AI 시각 학습 플랫폼"**

### 1. 프로젝트 아키텍처 (System Architecture)

* **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn/UI
* **Backend:** Next.js Route Handlers (Serverless Functions)
* **AI Engine:** OpenAI GPT-4o (Vision + Language Model)
* **Database & Auth:** Supabase (PostgreSQL, Googe OAuth)
* **Storage:** Supabase Storage (업로드 이미지 관리)
* **Deployment:** Vercel (CI/CD 자동화)

---

### 2. 주요 기능 요구사항 (Detailed Features)

#### 2.1. 사용자 인증 (Authentication)

* **구글 소셜 로그인:** Supabase Auth를 이용한 간편 로그인.
* **세션 관리:** 로그인한 사용자만 본인의 학습 데이터를 저장하고 조회 가능.

#### 2.2. 이미지 분석 및 AI 생성 (Core Engine)

* **멀티모달 OCR:** GPT-4o Vision API를 사용하여 이미지 내 텍스트 인식.
* **지능형 콜로케이션 추출:** * 이미지 내 핵심 단어 3~5개 자동 선정.
* 각 단어별 **원어민 빈출 조합(Collocation)** 3개 생성.
* 실생활 활용 **예문(Example)** 2개 생성.


* **데이터 정형화:** AI 응답을 JSON 형태로 받아 DB에 즉시 저장 가능한 구조로 처리.

#### 2.3. 개인 학습 라이브러리 (History & Dashboard)

* **히스토리 저장:** 분석된 모든 단어 카드를 Supabase DB에 자동 저장.
* **조회 및 필터링:** 과거에 스캔했던 단어들을 날짜별로 확인.
* **이미지 보관:** 스캔했던 원본 이미지를 Supabase Storage에 보관하여 필요 시 대조 확인.

#### 2.4. 배포 인프라 (Vercel)

* **환경 변수 관리:** `OPENAI_API_KEY`, `SUPABASE_URL` 등을 Vercel에서 안전하게 관리.
* **자동 배포:** GitHub Main 브랜치 푸시 시 실서비스 즉시 반영.

---

### 3. 데이터베이스 스키마 설계 (DB Schema)

| 테이블명 | 컬럼명 | 타입 | 설명 |
| --- | --- | --- | --- |
| **profiles** | `id`, `email`, `avatar_url` | UUID, Text | 사용자 기본 정보 (Auth 연동) |
| **scans** | `id`, `user_id`, `image_url` | UUID, Text | 업로드된 이미지 정보 및 소유자 |
| **vocabularies** | `id`, `scan_id`, `word`, `data` | UUID, JSONB | 단어, 콜로케이션, 예문 등의 JSON 데이터 |

---

### 4. 사용자 흐름 (Updated User Flow)

1. **로그인:** 사용자가 구글 계정으로 로그인.
2. **캡처/업로드:** 공부하고 싶은 텍스트 이미지를 업로드 (`Ctrl+V` 지원).
3. **AI 프로세싱:** * Vercel Serverless Function 호출.
* GPT-4o가 이미지 분석 -> JSON 결과 반환.


4. **자동 저장:** 결과값이 화면에 뿌려짐과 동시에 Supabase DB에 기록.
5. **복습:** '내 단어장' 메뉴에서 언제든 과거 학습 내역 확인.

---

### 5. Cursor 코딩을 위한 단계별 지침 (Implementation Roadmap)

#### **Step 1: 환경 설정**

> "Next.js 14 프로젝트를 생성하고, Supabase 클라이언트 라이브러리를 설치해줘. `.env.local` 파일에 Supabase와 OpenAI API 키 설정을 위한 가이드를 작성해줘."

#### **Step 2: 구글 로그인 구현**

> "Supabase Auth를 사용하여 구글 로그인 기능을 구현해줘. 로그인 여부에 따라 `/dashboard`로 리다이렉트되게 만들고, 로그아웃 버튼도 추가해줘."

#### **Step 3: 이미지 업로드 및 API 연동**

> "이미지를 업로드하면 OpenAI GPT-4o Vision API에 전달하는 Route Handler를 만들어줘. 응답은 `{ word, collocations, examples }`를 포함한 JSON 배열 형태여야 해."

#### **Step 4: 데이터베이스 연동**

> "AI가 생성한 결과를 Supabase의 `vocabularies` 테이블에 저장하는 로직을 추가해줘. 그리고 저장된 데이터를 불러와서 세련된 카드 UI로 보여주는 대시보드 페이지를 만들어줘."

