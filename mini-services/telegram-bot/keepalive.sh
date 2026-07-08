#!/bin/bash
# Check if bot is running, if not start it
BOT_PID=$(pgrep -f "bot.mjs" | head -1)
if [ -z "$BOT_PID" ]; then
  echo "$(date) Bot not running, starting..."
  cd /home/z/my-project/mini-services/telegram-bot
  nohup node bot.mjs >> bot.log 2>&1 &
  echo "$(date) Started bot PID: $!"
else
  echo "$(date) Bot running (PID: $BOT_PID)"
fi