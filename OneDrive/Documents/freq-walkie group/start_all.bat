@echo off

REM Go to the project directory
cd /d "C:\Users\Anik Das\OneDrive\Documents\freq-walkie group"

REM Start the Node server in background
start "" node server.js

REM Wait a few seconds so server starts
timeout /t 7

REM Start ngrok on port 5500
ngrok http 5500