@echo off
chcp 65001 >nul
echo WordSnap -> GitHub push
echo.

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [오류] Git이 PATH에 없습니다. Git 설치 후 다시 실행하세요.
  pause
  exit /b 1
)

if not exist .git (
  git init
  git remote add origin https://github.com/nacorey/wordsnap.git
)

git add .
git status
echo.
echo .env.local이 위 목록에 있으면 커밋하지 마세요.
pause

git commit -m "feat: WordSnap 초기 구현 (Next.js 14, Supabase Auth, GPT-4o-mini, 대시보드)"
if errorlevel 1 (
  echo 변경 사항이 없거나 이미 커밋되었을 수 있습니다.
  pause
  exit /b 0
)

git branch -M main
git push -u origin main

echo.
echo 완료.
pause
