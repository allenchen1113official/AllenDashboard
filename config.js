// ═══════════════════════════════════════════════════════════
//  Appwrite 設定
//
//  設定步驟：
//  1. 前往 https://cloud.appwrite.io 建立帳號與專案
//  2. 建立 Database，取得 Database ID
//  3. 依下方說明建立 3 個 Collection，取得各 Collection ID
//  4. 將所有 ID 填入下方對應欄位後儲存
// ═══════════════════════════════════════════════════════════

const APPWRITE_ENDPOINT   = 'https://cloud.appwrite.io/v1'; // 自架可改為自己的域名
const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';
const APPWRITE_DB_ID      = 'YOUR_DATABASE_ID';

// ── Collection: dashboard_config ──────────────────────────
//  Attributes（String, required）：
//    key   (size: 100)
//    value (size: 65535)
//  Index：key（unique）
//  Permissions：Role: any → Create / Read / Update / Delete
const APPWRITE_COL_CONFIG  = 'YOUR_CONFIG_COLLECTION_ID';

// ── Collection: calendar_events ───────────────────────────
//  Attributes：
//    title (String, size 500, required)
//    date  (String, size 10,  required)  ← YYYY-MM-DD
//    time  (String, size 10)
//    note  (String, size 2000)
//    color (String, size 20)
//  Permissions：Role: any → Create / Read / Update / Delete
const APPWRITE_COL_EVENTS  = 'YOUR_EVENTS_COLLECTION_ID';

// ── Collection: personal_history ──────────────────────────
//  Attributes：
//    title       (String,  size 500, required)
//    description (String,  size 2000)
//    year        (Integer, required)
//    month       (Integer, required)
//    day         (Integer, required)
//  Index：month + day（key）
//  Permissions：Role: any → Create / Read / Update / Delete
const APPWRITE_COL_HISTORY = 'YOUR_HISTORY_COLLECTION_ID';
