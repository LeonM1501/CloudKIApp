@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================================
echo   CLOUD-KI BRIDGE - IPA BUILDER MIT GITHUB ACTIONS
echo ============================================================================
echo.
echo GitHub Actions baut eine unsignierte IPA auf einem macOS-Runner.
echo Gib die URL deines GitHub-Repositorys ein.
echo.
set "REPO_URL=%~1"
if not defined REPO_URL set /p "REPO_URL=GitHub-Repo-URL: "
if not defined REPO_URL goto error

echo [1/3] Bereite lokales Git-Repository vor...
git init || goto error
git branch -m main || goto error
git add . || goto error
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Build CloudKIBridge iPadOS IPA" || goto error
)

echo [2/3] Verbinde mit GitHub...
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    git remote add origin "%REPO_URL%" || goto error
) else (
    git remote set-url origin "%REPO_URL%" || goto error
)

echo [3/3] Lade Code hoch und starte den IPA-Workflow...
git push -u origin main || goto error
echo.
echo Upload erfolgreich. Der IPA-Build laeuft jetzt in GitHub Actions.
echo Warte dort auf einen erfolgreichen Build und lade unter Artifacts
echo das Paket CloudKIBridge-iPadOS-IPA herunter.
echo Die IPA muss vor der Installation z.B. mit Sideloadly signiert werden.
if "%~1"=="" pause
exit /b 0

:error
echo.
echo FEHLER: Upload nicht abgeschlossen. Bitte die Git-Fehlermeldung oben pruefen.
if "%~1"=="" pause
exit /b 1
