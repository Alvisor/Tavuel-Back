#!/bin/sh
set -e

echo "=== ENV CHECK ==="
echo "JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo YES || echo NO)"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "=== END ENV CHECK ==="

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Tavuel API..."
node dist/main.js
