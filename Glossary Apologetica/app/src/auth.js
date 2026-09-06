/**
 * AUTHENTICATION
 * --------------
 * This application is single-user. There is one password, set on first run,
 * and one class of session: logged in or not. Nothing here talks to any
 * external identity provider — the password and every session live only in
 * this application's own database and memory.
 *
 * This module matters more once the server is reachable over the internet
 * through a tunnel (see cloudflare.js) rather than only from 127.0.0.1.
 */

import crypto from 'node:crypto';
import { getDb, getSetting, setSetting } from './db.js';

const SESSION_COOKIE = 'ga_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, renewed on use

/** token -> { expires } */
const sessions = new Map();

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export function hasPassword() {
  return !!getSetting('auth_password_hash', null);
}

export function setPassword(password) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  setSetting('auth_password_hash', `${salt.toString('hex')}:${hash.toString('hex')}`);
  // Changing the password invalidates every existing session, including
  // (deliberately) the one making this request — everyone re-authenticates.
  sessions.clear();
}

export function verifyPassword(password) {
  const stored = getSetting('auth_password_hash', null);
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password || ''), salt, 64);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function passwordProblem(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Use a password of at least 8 characters.';
  return null;
}

/* ------------------------------------------------------------------ */
/* Brute-force protection on the login attempt itself                  */
/* ------------------------------------------------------------------ */

const LOCKOUT_AFTER = 8;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
/** key (ip) -> array of failure timestamps */
const failures = new Map();

export function isLockedOut(key) {
  const list = (failures.get(key) || []).filter((t) => Date.now() - t < LOCKOUT_WINDOW_MS);
  failures.set(key, list);
  return list.length >= LOCKOUT_AFTER;
}

export function recordFailure(key) {
  const list = failures.get(key) || [];
  list.push(Date.now());
  failures.set(key, list);
}

export function clearFailures(key) {
  failures.delete(key);
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + SESSION_TTL_MS });
  return token;
}

export function touchSession(token) {
  const s = sessions.get(token);
  if (!s) return false;
  if (Date.now() > s.expires) {
    sessions.delete(token);
    return false;
  }
  s.expires = Date.now() + SESSION_TTL_MS; // sliding expiration
  return true;
}

export function destroySession(token) {
  sessions.delete(token);
}

export function destroyAllSessions() {
  sessions.clear();
}

export function sessionCount() {
  return sessions.size;
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

export function readSessionToken(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

export function isAuthenticated(req) {
  const token = readSessionToken(req);
  return token ? touchSession(token) : false;
}

export function setSessionCookie(res, token, { clear = false } = {}) {
  const attrs = [
    `${SESSION_COOKIE}=${clear ? '' : token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    clear ? 'Max-Age=0' : `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

/** Best-effort client identity for rate limiting — no external lookup. */
export function clientKey(req) {
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim()
    || req.socket.remoteAddress
    || 'unknown';
}
