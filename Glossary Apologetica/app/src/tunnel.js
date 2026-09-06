/**
 * REMOTE ACCESS STATUS
 * ---------------------
 * The application server never manages the Cloudflare tunnel process itself —
 * that runs as its own independent Windows background task (see
 * "Set Up Remote Access.ps1"), so it keeps running even if this app is
 * closed and restarted. This module only reads the small log file that
 * background task writes to, to answer one question for the Settings page:
 * "what is my current web address, and is the tunnel currently connected?"
 */

import fs from 'node:fs';

const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export function readTunnelStatus(logFile) {
  if (!logFile || !fs.existsSync(logFile)) {
    return { configured: false, connected: false, url: null };
  }

  let text = '';
  try {
    // The log can grow over a long uptime; only the tail matters.
    const stat = fs.statSync(logFile);
    const start = Math.max(0, stat.size - 20000);
    const fd = fs.openSync(logFile, 'r');
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    text = buf.toString('utf8');
  } catch {
    return { configured: true, connected: false, url: null };
  }

  const matches = text.match(new RegExp(URL_PATTERN, 'gi'));
  const url = matches && matches.length ? matches[matches.length - 1] : null;

  // cloudflared prints "Registered tunnel connection" once live, and logs a
  // connection-loss line if it drops; a URL present near the end of a
  // recently-written log is a good enough signal for a Settings-page status.
  const recentlyWritten = Date.now() - fs.statSync(logFile).mtimeMs < 2 * 60 * 1000;
  const looksConnected = /Registered tunnel connection/i.test(text.slice(-4000));

  return {
    configured: true,
    connected: !!url && (looksConnected || recentlyWritten),
    url,
  };
}
