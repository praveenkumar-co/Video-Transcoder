#!/usr/bin/env bash
# ==============================================================================
# logs.sh — Live streaming logs from all pods (worker + api + redis)
#
# Usage:
#   ./logs.sh          → streams worker + api logs together (color-coded)
#   ./logs.sh worker   → only worker logs
#   ./logs.sh api      → only api logs
#   ./logs.sh status   → quick pod status + KEDA scaler state
# ==============================================================================

TARGET="${1:-all}"

show_status() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  📦  POD STATUS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl get pods -o wide
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚖️   KEDA SCALER (min=1, max=1 — MacBook Air safe)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl get scaledobject 2>/dev/null || echo "KEDA not installed"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🖥️   NODE RESOURCES"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl top nodes 2>/dev/null || echo "(metrics-server not available)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  📊  POD RESOURCE USAGE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl top pods 2>/dev/null || echo "(metrics-server not available)"
  echo ""
}

stream_worker() {
  echo "🎬  [WORKER] Live log stream — Ctrl+C to stop"
  echo "──────────────────────────────────────────────"
  kubectl logs -f -l app=worker --tail=50 2>&1
}

stream_api() {
  echo "🌐  [API] Live log stream — Ctrl+C to stop"
  echo "──────────────────────────────────────────────"
  kubectl logs -f -l app=api --tail=50 2>&1
}

stream_all() {
  echo ""
  echo "🔴  Streaming ALL logs (worker + api) — Ctrl+C to stop"
  echo "  💡 Tip: run ./logs.sh status to see pod/resource usage"
  echo "──────────────────────────────────────────────────────────"

  # Stream both simultaneously, prefix each line with source label
  (kubectl logs -f -l app=worker --tail=50 2>&1 | sed 's/^/[WORKER] /') &
  WORKER_PID=$!

  (kubectl logs -f -l app=api --tail=50 2>&1 | sed 's/^/[API]    /') &
  API_PID=$!

  # Wait and clean up both on Ctrl+C
  trap "kill $WORKER_PID $API_PID 2>/dev/null; exit 0" INT TERM
  wait $WORKER_PID $API_PID
}

case "$TARGET" in
  status)  show_status ;;
  worker)  stream_worker ;;
  api)     stream_api ;;
  all|*)   show_status; stream_all ;;
esac
