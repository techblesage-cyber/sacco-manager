#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it first, or run: set -a; source .env.local; set +a"
  exit 1
fi

for file in schema 002_multitenant management-features documents 003_licensing 004_share_price; do
  echo "Applying db/${file}.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "db/${file}.sql"
done

echo "Database is up to date."
