#!/bin/bash
cd "$(dirname "$0")"
while true; do
  echo "[$(date)] Starting bot..."
  BOT_TOKEN="8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0" PORT=3001 bun index.ts 2>&1 | tee -a bot.log
  EXIT_CODE=$?
  echo "[$(date)] Bot exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done