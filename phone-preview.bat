@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title 一杯 · 手机预览

echo.
echo  ================================================================
echo    一杯 · 校园奶茶点单    手机预览
echo  ================================================================
echo.

rem ---------- 1. 找一个可用的 Python 3 ----------
set "PY="
for %%C in (python py python3) do (
  if not defined PY (
    "%%C" -c "import sys;assert sys.version_info[0] == 3" >nul 2>nul && set "PY=%%C"
  )
)

rem ---------- 2. 没有 Python 就解释一下 ----------
if not defined PY goto no_python
"%PY%" "tools\preview.py" %*
echo.
echo  服务器已停止。按任意键关闭窗口。
pause >nul
exit /b 0

:no_python
echo  [X] 没有找到可用的 Python 3，手机预览需要它来做本地服务器。
echo.
echo      解决办法（二选一）：
echo        - 装一个 Python：https://www.python.org/downloads/
echo          安装时务必勾选 Add python.exe to PATH；
echo        - 只在这台电脑上演示：直接双击 index.html，不用手机预览。
echo.
pause
exit /b 1