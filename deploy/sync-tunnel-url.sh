#!/bin/bash
# Sync Tunnel URL to Cloudflare Worker KV
# Called by systemd timer every 60 seconds

TUNNEL_URL=$(docker logs bing-cloudflared-1 --tail 50 2>&1 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "$(date): No tunnel URL found"
  exit 1
fi

# Read current stored URL
STORED_URL=$(cat /opt/tunnel-sync/current-url.txt 2>/dev/null)

if [ "$TUNNEL_URL" = "$STORED_URL" ]; then
  exit 0  # No change
fi

echo "$(date): Tunnel URL changed: $TUNNEL_URL"
echo "$TUNNEL_URL" > /opt/tunnel-sync/current-url.txt

# Update Cloudflare Worker KV
if [ -f /opt/tunnel-sync/.env ]; then
  source /opt/tunnel-sync/.env

  if [ -n "$CF_ACCOUNT_ID" ] && [ -n "$CF_API_TOKEN" ] && [ -n "$KV_NAMESPACE_ID" ]; then
    curl -s -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/tunnel_url" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: text/plain" \
      -d "$TUNNEL_URL"

    echo "$(date): KV updated with $TUNNEL_URL"
  else
    echo "$(date): Missing Cloudflare credentials in /opt/tunnel-sync/.env"
  fi
fi
