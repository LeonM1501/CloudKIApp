@echo off
chcp 65001 >nul
echo ============================================================================
echo   CLOUD-KI BRIDGE - AUTOMATISCHER .IPA BUILDER OHNE MAC (GITHUB CLOUD MAC)
echo ============================================================================
echo.
echo Da Apple Xcode nur auf macOS erlaubt, baut dieses Skript deine .ipa-Datei
echo kostenlos ueber die GitHub Actions macOS-Cloud-Server!
echo.
echo 1. Erstelle auf https://github.com/new ein neues (leeres) Repository
echo    (z.B. "CloudKIApp" - kann privat oder oeffentlich sein).
echo 2. Kopiere die URL deines neuen GitHub-Repos (z.B. https://github.com/DEIN_NAME/CloudKIApp.git)
echo.
set /p REPO_URL="Fuege hier deine GitHub-Repo-URL ein und druecke ENTER: "

if "%REPO_URL%"=="" (
    echo Keine URL eingegeben. Abbruch.
    pause
    exit /b
)

echo.
echo [1/3] Bereite lokales Git-Repository vor...
git init
git config user.name "xLeonTTV"
git config user.email "xleonttv@users.noreply.github.com"
git branch -M main
git add .
git commit -m "Build CloudKIBridge iPadOS IPA" 2>nul

echo [2/3] Verbinde mit GitHub (%REPO_URL%)...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [3/3] Lade Code hoch -> GitHub macOS Runner startet sofort den Xcode .ipa Build!
git push -u origin main --force

echo.
echo ============================================================================
echo FERTIG!
echo Oeffne jetzt dein GitHub-Repository im Browser, klicke oben auf den Tab
echo "Actions" -> nach ca. 2-3 Minuten kannst du dort unten unter "Artifacts"
echo die fertige Datei "CloudKIBridge-iPadOS-IPA" (.ipa) herunterladen und mit
echo Sideloadly, AltStore oder SideStore auf dein iPad installieren!
echo ============================================================================
pause
