#!/usr/bin/env bash
#
# ollama-hints.sh — spin up a local Ollama server for admin hint generation.
#
# Run this in a SECOND terminal window, leave it open, then come back to the app:
#   1. ./scripts/ollama-hints.sh
#   2. Add  HINT_PROVIDER=ollama  to .env.local  (one time)
#   3. Restart `pnpm dev`, open /add-hints, generate as usual.
#
# Nothing here is wired into the app build — it just runs the Ollama engine that
# the env-gated add-hints path talks to over HTTP. Stop it with Ctrl-C anytime;
# remove HINT_PROVIDER from .env.local to go back to OpenRouter.
#
# Override the model:  OLLAMA_MODEL=llama3.2:3b ./scripts/ollama-hints.sh
#   - qwen2.5-coder:7b  (default) ~4.7GB — best hint quality, tight on 8GB RAM
#   - llama3.2:3b                 ~2GB   — lighter/faster, weaker on hard problems

set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
BASE="http://${HOST}"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

# 1. Ollama installed?
if ! command -v ollama >/dev/null 2>&1; then
  red "Ollama is not installed."
  echo "Install it (then re-run this script):"
  echo "  brew install --cask ollama-app   # full build WITH the runner binary"
  echo "  # NOTE: the plain 'brew install ollama' formula (0.30.x) ships WITHOUT"
  echo "  #       llama-server and fails on generation — use the cask above."
  echo "  # or download from https://ollama.com/download"
  exit 1
fi

# 2. Server up? Start it if not.
SERVE_PID=""
if ! curl -fsS --max-time 2 "${BASE}/api/tags" >/dev/null 2>&1; then
  bold "Starting Ollama server (${BASE})…"
  OLLAMA_HOST="${HOST}" ollama serve >/tmp/ollama-hints.log 2>&1 &
  SERVE_PID=$!
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 2 "${BASE}/api/tags" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  if ! curl -fsS --max-time 2 "${BASE}/api/tags" >/dev/null 2>&1; then
    red "Server did not come up — see /tmp/ollama-hints.log"
    exit 1
  fi
else
  bold "Ollama server already running at ${BASE}."
fi

# 3. Model present? Pull if not.
if ! ollama list 2>/dev/null | awk '{print $1}' | grep -qx "${MODEL}"; then
  bold "Pulling ${MODEL} (one-time download)…"
  ollama pull "${MODEL}"
fi

# 4. Warm the model so the first real hint isn't a cold start.
bold "Warming ${MODEL}…"
curl -fsS --max-time 120 "${BASE}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with ok\"}],\"stream\":false}" \
  >/dev/null && green "Model ready."

echo
green "READY — Ollama is serving ${MODEL} at ${BASE}"
echo "Next:"
echo "  1. Ensure .env.local has:  HINT_PROVIDER=ollama"
echo "     (optional)             OLLAMA_MODEL=${MODEL}"
echo "  2. Restart the dev server, then use /add-hints as normal."
echo
bold "Leave this window open. Ctrl-C to stop."

# Keep the window alive so the server stays up.
if [ -n "${SERVE_PID}" ]; then
  wait "${SERVE_PID}"
else
  # Server was already running elsewhere; just idle until interrupted.
  tail -f /dev/null
fi
