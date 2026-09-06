#!/bin/bash
# run.sh - Start OpusFlow AI Web Application
cd "$(dirname "$0")"

PORT=${PORT:-4000}

echo "================================================================="
echo "  🎬 OpusFlow AI – Viral Video Clipping Studio (OpusClip Clone) "
echo "================================================================="
echo "  Server startet auf: http://localhost:$PORT"
echo "  Öffne deinen Browser auf: http://localhost:$PORT"
echo "================================================================="

ruby server.rb
