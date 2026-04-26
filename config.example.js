// ═══════════════════════════════════════════════════════════
//  Allen Dashboard — config.js 範本
//
//  從本檔案複製後重命名為 config.js：
//    cp config.example.js config.js
//
//  config.js 已列入 .gitignore，不會被提交至版本控制。
// ═══════════════════════════════════════════════════════════

// ── 選項 A：加密模式（建議）────────────────────────────────
//
//  1. 開啟 setup.html（npx serve . → http://localhost:3000/setup.html）
//  2. 填入 Appwrite 各項 ID 與密碼短語
//  3. 複製產生的 APPWRITE_SALT 與 APPWRITE_CIPHER 值貼至此處
//  4. 開啟 index.html，輸入相同密碼短語即可解鎖
//
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_SALT     = 'PASTE_SALT_FROM_SETUP_HTML';    // 32 hex chars
const APPWRITE_CIPHER   = 'PASTE_CIPHER_FROM_SETUP_HTML';  // base64 blob


// ── 選項 B：明文模式（快速測試）────────────────────────────
//
//  直接填入各項 ID，無需輸入密碼短語。
//  ⚠️  憑證以明文存在瀏覽器可讀取，建議僅用於本機測試。
//
// const APPWRITE_ENDPOINT   = 'https://cloud.appwrite.io/v1';
// const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';
// const APPWRITE_DB_ID      = 'YOUR_DATABASE_ID';
// const APPWRITE_COL_CONFIG  = 'YOUR_CONFIG_COLLECTION_ID';
// const APPWRITE_COL_EVENTS  = 'YOUR_EVENTS_COLLECTION_ID';
// const APPWRITE_COL_HISTORY = 'YOUR_HISTORY_COLLECTION_ID';
