echo off
set exe=%1
set src=%2
set dst=%3
ping -n 2 127.0.0.1
xcopy /e /y /i %src% %dst%
rmdir /s /q %src%
start "" %exe%
