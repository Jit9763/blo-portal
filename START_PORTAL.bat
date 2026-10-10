@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title पंचायत चुनाव 2026 - मास्टर एडमिन पोर्टल एवं ऑटो-सिंक सर्वर
color 0B
cls

echo =========================================================================
echo   🗳️ पंचायत चुनाव 2026 - मुख्य व्यवस्थापक (Super Admin) कंट्रोल सर्वर
echo   Panchayat Chunav Portal - Live Server, Auto-Save & Tri-Repo Sync Engine
echo =========================================================================
echo   लोकल एडमिन URL (Local URL)  : http://localhost:3000
echo   मास्टर एडमिन पोर्टल (Pan)   : https://jit9763.github.io/pan/
echo   बी.एल.ओ. पोर्टल (BLO)        : https://jit9763.github.io/blo-portal/
echo   पब्लिक वोटर पोर्टल (Voter)   : https://jit9763.github.io/voter-portal/
echo   जिला: अजमेर (AJMER)          : समस्त 30 ग्राम पंचायतें
echo =========================================================================
echo.

:: 1. Set environment & PATH
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\jiten\AppData\Roaming\npm"

:: 2. Target canonical voter_portal directory
set "PORTAL_DIR=C:\Users\jiten\Desktop\panchayat chunav\voter_portal"
if not exist "!PORTAL_DIR!\server.js" (
    if exist "C:\Users\jiten\Desktop\panchyt order\voter_portal\server.js" (
        set "PORTAL_DIR=C:\Users\jiten\Desktop\panchyt order\voter_portal"
    )
)
cd /d "!PORTAL_DIR!"

:: 3. Verify Node.js Environment
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js आपके सिस्टम में नहीं मिला!
    echo कृपया https://nodejs.org/ से Node.js इनस्टॉल करें।
    echo सीधे ऑनलाइन मास्टर पोर्टल खोला जा रहा है...
    start "" "https://jit9763.github.io/pan/"
    pause
    exit /b 1
)

:: 4. Clean lingering process on Port 3000
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 5. Open browser after brief pause
start /b "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: 6. Start Live Server in foreground with auto-push logs
echo [STARTING] पंचायत चुनाव 2026 मास्टर सर्वर चालू हो रहा है...
echo [AUTO-SYNC] सुपर एडमिन द्वारा यूजर परमिशन, पासवर्ड या सेटिंग्स बदलने पर
echo [AUTO-SYNC] यह स्वतः तीनों गिटहब पोर्टल्स (pan, blo-portal, voter-portal) पर लाइव अपडेट हो जाएगा।
echo.
echo =========================================================================
echo   सर्वर चालू है! (Port: 3000)
echo   सेटिंग्स बदलने के दौरान कृपया यह काली विंडो बंद न करें।
echo =========================================================================
echo.

node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [SERVER STOPPED] सर्वर बंद हो गया है। पुनः चालू करने के लिए कोई की दबाएं...
    pause
)
