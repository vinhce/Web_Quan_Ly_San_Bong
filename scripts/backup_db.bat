@echo off
:: ===============================================================
:: SÂN BÓNG PRO - TỰ ĐỘNG SAO LƯU CƠ SỞ DỮ LIỆU (Mục 6.2)
:: ===============================================================
setlocal

set "MYSQLDUMP=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe"
set "DB_NAME=quan_ly_san_bong"
set "DB_USER=root"
set "BACKUP_DIR=%~dp0..\backups"

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%"
set "OUTFILE=%BACKUP_DIR%\backup_%DB_NAME%_%TIMESTAMP%.sql"

echo [1/2] Dang sao luu co so du lieu %DB_NAME%...
"%MYSQLDUMP%" -u %DB_USER% --single-transaction --quick --routines %DB_NAME% > "%OUTFILE%"

if %ERRORLEVEL% equ 0 (
    echo [2/2] Sao luu thanh cong! File luu tai: %OUTFILE%
) else (
    echo [LOI] Sao luu that bai! Ma loi: %ERRORLEVEL%
)

endlocal
