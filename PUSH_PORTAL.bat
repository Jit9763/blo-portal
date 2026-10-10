@echo off
chcp 65001 >nul
title पंचायती राज चुनाव 2026 - 1-क्लिक त्रि-पोर्टल सिंक (Pan, BLO, Voter)
color 0A
cls

echo =========================================================================
echo   🗳️ पंचायत चुनाव 2026 | 1-क्लिक मास्टर GitHub डिप्लॉय एवं ऑटो-सिंक इंजन
echo   Deploying Latest Code, Users & Settings to All 3 Repositories
echo =========================================================================
echo.

cd /d "C:\Users\jiten\Desktop\panchayat chunav"

echo [1/3] डेटाबेस को सत्यापित व सिंक किया जा रहा है...
python build_tri_portal_repos.py

echo.
echo [2/3] तीनों GitHub रिपॉजिटरी (pan, blo-portal, voter-portal) पर पुश जारी...
python deploy_tri_portals.py

echo.
echo =========================================================================
echo   ✓ बधाई! तीनों पोर्टल्स GitHub पर सफलतापूर्वक लाइव हो चुके हैं।
echo   1. मास्टर एडमिन (Pan)    : https://jit9763.github.io/pan/
echo   2. बी.एल.ओ. पोर्टल (BLO) : https://jit9763.github.io/blo-portal/
echo   3. वोटर पोर्टल (Voter)   : https://jit9763.github.io/voter-portal/
echo =========================================================================
echo.
pause
