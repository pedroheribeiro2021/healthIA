#!/bin/sh
# CI local simples: roda lint + testes de cada app do monorepo.
# Uso: ./scripts/ci.sh [server|dashboard|sync-app]  (sem argumento roda tudo)
set -e

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

run_server() {
  echo "== server: ruff check =="
  (cd "$root_dir/server" && uv run ruff check .)
  echo "== server: pytest =="
  (cd "$root_dir/server" && uv run pytest)
}

run_dashboard() {
  echo "== dashboard: build (tsc + vite) =="
  (cd "$root_dir/dashboard" && npm run build)
}

run_sync_app() {
  echo "== sync-app: typecheck =="
  (cd "$root_dir/sync-app" && npx tsc --noEmit)
}

target="${1:-all}"
case "$target" in
  server) run_server ;;
  dashboard) run_dashboard ;;
  sync-app) run_sync_app ;;
  all)
    run_server
    run_dashboard
    run_sync_app
    ;;
  *)
    echo "Alvo desconhecido: $target (use server|dashboard|sync-app)" >&2
    exit 1
    ;;
esac

echo "OK"
