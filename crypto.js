'use strict';
// ═══════════════════════════════════════════════════════════
//  AW_CRYPTO  —  AES-256-GCM helpers via Web Crypto API
//
//  Key derivation : PBKDF2-SHA256, 100 000 iterations
//  Encryption     : AES-256-GCM, random 12-byte IV per call
//  Wire format    : base64( iv[12] || ciphertext )
//
//  Loaded by index.html BEFORE config.js and app.js.
// ═══════════════════════════════════════════════════════════

const AW_CRYPTO = (() => {

  // ── hex ↔ Uint8Array ─────────────────────────────────────
  function hexToBytes(hex) {
    const b = new Uint8Array(hex.length / 2);
    for (let i = 0; i < b.length; i++)
      b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return b;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── base64 ↔ Uint8Array ──────────────────────────────────
  function b64Encode(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function b64Decode(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }

  // ── Key derivation ───────────────────────────────────────
  async function deriveKey(passphrase, saltHex) {
    const enc  = new TextEncoder();
    const salt = hexToBytes(saltHex);
    const raw  = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ── Encrypt plaintext → base64(iv||ciphertext) ──────────
  async function encrypt(plaintext, key) {
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(String(plaintext))
    );
    const buf = new Uint8Array(12 + ct.byteLength);
    buf.set(iv);
    buf.set(new Uint8Array(ct), 12);
    return b64Encode(buf.buffer);
  }

  // ── Decrypt base64(iv||ciphertext) → plaintext ──────────
  async function decrypt(b64, key) {
    const buf = b64Decode(b64);
    const iv  = buf.slice(0, 12);
    const ct  = buf.slice(12);
    const pt  = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ct
    );
    return new TextDecoder().decode(pt);
  }

  // ── Random hex salt (16 bytes = 32 hex chars) ───────────
  async function generateSalt() {
    return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  }

  return { deriveKey, encrypt, decrypt, generateSalt, bytesToHex, hexToBytes };
})();
