#!/bin/bash
# Sync web_path_aspirantus static files to VPS nginx root
set -euo pipefail

PATH_DIR="${PATH_DIR:-/opt/web_path_aspirantus}"
TARGET="${TARGET:-/opt/web_path_aspirantus_live}"

cd "$PATH_DIR"
git pull origin main
rsync -a --delete ./ "$TARGET/"
echo "Path UI synced to $TARGET"
