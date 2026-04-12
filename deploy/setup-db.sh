#!/usr/bin/env bash
set -euo pipefail

DB_NAME="lg_production"
DB_USER="lg_admin"
DB_PASS="lg_$(openssl rand -hex 12)"

echo "[setup-db] Creating PostgreSQL user and database..."

sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "[setup-db] Done."
echo "[setup-db] DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo ""
echo "Save this connection string to .env:"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
