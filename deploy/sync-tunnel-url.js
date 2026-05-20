/**
 * Unified Tunnel URL Sync Script
 * Monitors cloudflared logs for tunnel URL changes and updates Worker KV
 *
 * Usage:
 *   node sync-tunnel-url.js
 *
 * Or as a background process:
 *   Start-Process -NoNewWindow -FilePath "node" -ArgumentList "scripts/sync-tunnel-url.js"
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID   - Your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN    - API token with Workers KV edit permissions
 *   KV_NAMESPACE_ID         - Workers KV namespace ID
 *   SSH_KEY_PATH            - Path to SSH key for Oracle instance
 *   SSH_HOST                - Oracle instance hostname
 *   SSH_USER                - SSH username (default: ubuntu)
 */

const { execSync } = require('child_process');
const https = require('https');

const CONFIG = {
  sshKey: process.env.SSH_KEY_PATH || `${process.env.USERPROFILE}/.ssh/id_rsa_oci`,
  sshHost: process.env.SSH_HOST || '129.213.35.8',
  sshUser: process.env.SSH_USER || 'ubuntu',
  cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  cfApiToken: process.env.CLOUDFLARE_API_TOKEN,
  kvNamespaceId: process.env.KV_NAMESPACE_ID,
  checkInterval: 60_000, // 60 seconds
};

let lastKnownUrl = null;

function ssh(command) {
  const cmd = `ssh -i "${CONFIG.sshKey}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${CONFIG.sshUser}@${CONFIG.sshHost} "${command}"`;
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function getTunnelUrl() {
  try {
    const logs = ssh('docker logs bing-cloudflared-1 --tail 50 2>&1');
    const match = logs.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    return match ? match[0] : null;
  } catch (err) {
    console.error('SSH error:', err.message);
    return null;
  }
}

async function updateKv(key, value) {
  if (!CONFIG.cfAccountId || !CONFIG.cfApiToken || !CONFIG.kvNamespaceId) {
    console.error('Missing Cloudflare config. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID');
    return false;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.cfAccountId}/storage/kv/namespaces/${CONFIG.kvNamespaceId}/values/${key}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CONFIG.cfApiToken}`,
        'Content-Type': 'text/plain',
      },
    }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.error(`KV update failed: ${res.statusCode} ${body}`);
          resolve(false);
        });
      }
    });
    req.on('error', reject);
    req.write(value);
    req.end();
  });
}

async function checkAndUpdate() {
  const currentUrl = getTunnelUrl();
  if (!currentUrl) {
    console.log('No tunnel URL found, skipping...');
    return;
  }

  if (currentUrl !== lastKnownUrl) {
    console.log(`[${new Date().toISOString()}] Tunnel URL changed: ${currentUrl}`);

    // Update KV
    const success = await updateKv('tunnel_url', currentUrl);
    if (success) {
      console.log('  ✓ Worker KV updated');
      lastKnownUrl = currentUrl;
    } else {
      console.log('  ✗ Failed to update Worker KV');
    }
  }
}

async function main() {
  console.log('🔄 Tunnel URL Sync started');
  console.log(`   Checking every ${CONFIG.checkInterval / 1000}s`);
  console.log(`   SSH: ${CONFIG.sshUser}@${CONFIG.sshHost}`);
  console.log(`   KV:  ${CONFIG.kvNamespaceId || 'not configured'}`);
  console.log('');

  // Initial check
  await checkAndUpdate();

  // Periodic checks
  setInterval(checkAndUpdate, CONFIG.checkInterval);
}

main().catch(console.error);
