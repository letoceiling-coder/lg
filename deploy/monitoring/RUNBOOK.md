# Monitoring Runbook

## Stack

- Prometheus: `http://<host>:9090`
- Grafana: `http://<host>:3001`
- API metrics endpoint: `GET /api/v1/metrics`

## Deployment

1. Set environment variables in server `.env`:
   - `METRICS_BEARER_TOKEN`
   - `GF_SECURITY_ADMIN_USER`
   - `GF_SECURITY_ADMIN_PASSWORD`
2. Run `bash deploy/deploy-full.sh`.
3. Script starts monitoring profile in Docker Compose and runs runtime checks.

## Quick Health Checks

- `curl -sf http://127.0.0.1:9090/-/ready`
- `curl -sf http://127.0.0.1:3001/api/health`
- `curl -sf -H "Authorization: Bearer $METRICS_BEARER_TOKEN" http://127.0.0.1:3000/api/v1/metrics`

## Alerts

- `LgApiDown`: API scrape is down >2m.
- `LgApiHigh5xxRate`: 5xx rate too high for 10m.

## Incident Steps

1. Check PM2: `pm2 status lg-api`, `pm2 logs lg-api --lines 200`.
2. Check API health: `curl -sf http://127.0.0.1:3000/api/v1/health`.
3. Check Prometheus targets: `http://127.0.0.1:9090/targets`.
4. If metrics auth fails, verify `deploy/monitoring/secrets/metrics_bearer.txt` and `.env`.
5. Restart stack if needed: `docker compose --profile monitoring up -d --force-recreate`.

