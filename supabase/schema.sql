-- WordSnap PRD 스키마 (Supabase SQL Editor에서 실행)
-- 실행 순서:
-- 1) 아래 스키마 실행
-- 2) Dashboard > Storage > New bucket 이름 'scans' 생성
--    - Public bucket 체크 시 업로드 이미지 공개 URL 사용 가능
--    - Policies: Authenticated 사용자 INSERT 허용 (bucket 'scans', path: user_id/*)

-- profiles: Auth 연동 사용자 (필요 시 확장)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- scans: 업로드 이미지 및 소유자
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- vocabularies: 단어별 콜로케이션·예문 (data에 JSON 저장)
CREATE TABLE IF NOT EXISTS public.vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책: 본인 데이터만 접근
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scans_select_own" ON public.scans;
CREATE POLICY "scans_select_own" ON public.scans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "scans_insert_own" ON public.scans;
CREATE POLICY "scans_insert_own" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vocabularies_select_own" ON public.vocabularies;
CREATE POLICY "vocabularies_select_own" ON public.vocabularies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "vocabularies_insert_own" ON public.vocabularies;
CREATE POLICY "vocabularies_insert_own" ON public.vocabularies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND s.user_id = auth.uid()));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabularies_scan_id ON public.vocabularies(scan_id);
