#!/usr/bin/env bash
# ==============================================================================
# Cloud-GPTX-Antigravity Bridge - Linux VPS Setup Script (GPU & CPU-VPS Auto-Detect)
# ==============================================================================
set -e

echo "=== [1/4] Prüfe Server-Hardware & Grafikkarte (GPU vs. normaler VPS) ==="
if command -v nvidia-smi &> /dev/null && nvidia-smi &> /dev/null; then
  echo "[GPU ERKANNT] Dedizierte NVIDIA-Grafikkarte gefunden -> Aktiviere VirtualGL Hardware-Beschleunigung!"
  export RENDER_MODE="GPU_VIRTUALGL"
else
  echo "[VPS OHNE GPU ERKANNT] Keine dedizierte GPU gefunden -> Aktiviere Xvfb + Mesa LLVMpipe (CPU Software OpenGL/Vulkan)!"
  export RENDER_MODE="CPU_LLVMPPIPE"
  export LIBGL_ALWAYS_SOFTWARE=1
  export GALLIUM_DRIVER=llvmpipe
fi

echo "=== [2/4] Installiere Xvfb, Mesa LLVMpipe, Xpra (Single-Window Streamer) & Browser ==="
if command -v apt-get &> /dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y xvfb mesa-utils libgl1-mesa-dri xpra chromium-browser nodejs npm curl git
fi

echo "=== [3/4] Richte isolierte Multi-Account Verzeichnisse für Codex, Antigravity & OpenCode ein ==="
mkdir -p ~/.cloudki-bridge/accounts/{codex-1,codex-2,antigravity-1,antigravity-2,antigravity-3,opencode-1}

echo "=== [4/4] Starte CloudKI Bridge Daemon auf Port 3001 ==="
npm install
nohup npm run dev:server > ~/.cloudki-bridge/bridge.log 2>&1 &
echo "Fertig! Deine iPad-App kann sich jetzt direkt mit $(hostname -I | awk '{print $1}'):3001 verbinden."
