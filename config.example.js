// ═══════════════════════════════════════════════════════════
//  Appwrite 設定範本
//
//  使用步驟：
//  1. 複製本檔案並命名為 config.js
//     cp config.example.js config.js
//  2. 前往 https://cloud.appwrite.io 建立帳號與專案
//  3. 依 APPWRITE_SETUP.md 建立 Database 與 3 個 Collection
//  4. 將所有 ID 填入下方對應欄位後儲存
//
//  ⚠️  config.js 已列入 .gitignore，不會被提交至版本控制
// ═══════════════════════════════════════════════════════════

const APPWRITE_ENDPOINT   = 'https://cloud.appwrite.io/v1'; // 自架可改為自己的域名
const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';              // Settings → Overview
const APPWRITE_DB_ID      = 'YOUR_DATABASE_ID';             // Databases 頁面

const APPWRITE_COL_CONFIG  = 'YOUR_CONFIG_COLLECTION_ID';   // dashboard_config
const APPWRITE_COL_EVENTS  = 'YOUR_EVENTS_COLLECTION_ID';   // calendar_events
const APPWRITE_COL_HISTORY = 'YOUR_HISTORY_COLLECTION_ID';  // personal_history
