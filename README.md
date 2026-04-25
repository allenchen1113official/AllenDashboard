# ⚡ Allen's Dashboard

個人專屬戰情表 — 純前端 SPA，以 Appwrite Cloud 作為後端資料庫。

![展示模式](https://img.shields.io/badge/demo-available-58a6ff?style=flat-square)
![前端技術](https://img.shields.io/badge/frontend-HTML%20%2F%20CSS%20%2F%20JS-orange?style=flat-square)
![後端](https://img.shields.io/badge/backend-Appwrite%20Cloud-fd366e?style=flat-square)

---

## 功能一覽

| 區塊 | 說明 |
|------|------|
| 🎓 英文學習 | 50 張單字卡，支援翻轉動畫、前後切換、學習筆記 |
| 📅 行事曆 | 月曆檢視、新增 / 刪除事件、近期事件清單 |
| 🔖 常用連結 | 分類連結管理，支援即時搜尋篩選 |
| 📰 新聞訂閱 | 關鍵字標籤 + RSS Feed，透過 rss2json 代理抓取 |
| 🎧 Podcast | RSS Feed 訂閱，顯示最新集數摘要 |
| 🏛 歷史上的今天 | 每日自動從 Wikipedia REST API 抓取世界歷史事件 |
| 📖 艾倫歷史上的今天 | 個人記事，依當日月份 / 日期顯示對應年份的記憶 |

---

## 快速開始

### 1. 展示模式（無需 Appwrite）

```bash
git clone https://github.com/allenchen1113official/AllenDashboard.git
cd AllenDashboard
npx serve .
# 開啟 http://localhost:3000/demo.html
```

`demo.html` 內含完整 Mock 資料，所有功能皆可互動，不需任何後端設定。

### 2. 正式使用（連接 Appwrite）

```bash
# 1. 複製專案
git clone https://github.com/allenchen1113official/AllenDashboard.git
cd AllenDashboard

# 2. 依說明建立 Appwrite 資料庫
#    → 詳見 APPWRITE_SETUP.md

# 3. 填寫 config.js（已列入 .gitignore，不會被提交）
cp config.example.js config.js
# 編輯 config.js，填入 Project ID、Database ID、Collection IDs

# 4. 啟動本地伺服器
npx serve .
# 開啟 http://localhost:3000
```

---

## 檔案結構

```
AllenDashboard/
├── index.html          # 正式版主頁（連接 Appwrite）
├── demo.html           # 展示頁面（Mock 資料，無需後端）
├── app.js              # 全部業務邏輯（約 790 行）
├── style.css           # 深色主題樣式（約 1150 行）
├── config.js           # ⚠️ Appwrite 金鑰（列入 .gitignore）
├── config.example.js   # config.js 範本
├── schema.sql          # Appwrite Collection 結構參考
└── APPWRITE_SETUP.md   # Appwrite 建立步驟詳細說明（繁體中文）
```

---

## Appwrite 資料庫結構

| Collection | 用途 |
|------------|------|
| `dashboard_config` | 關鍵字、連結、Podcast 等設定（JSON 字串） |
| `calendar_events`  | 行事曆事件 |
| `personal_history` | 個人記事（依月 / 日查詢） |

完整建立步驟請見 [APPWRITE_SETUP.md](./APPWRITE_SETUP.md)。

---

## 技術架構

- **純前端 SPA**：HTML + CSS + Vanilla JavaScript，無任何框架
- **樣式**：CSS Grid 三列深色主題，CSS perspective 翻牌動畫
- **資料庫**：[Appwrite Cloud](https://cloud.appwrite.io) Web SDK v16
- **新聞 / Podcast**：[rss2json.com](https://rss2json.com) RSS → JSON 代理
- **歷史事件**：[Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) `/feed/onthisday`
- **快取**：localStorage 30 分鐘 TTL（RSS、Wikipedia）
- **字典**：[Free Dictionary API](https://dictionaryapi.dev)

---

## 連線狀態說明

| Badge 顏色 | 說明 |
|------------|------|
| 🟡 黃色「連線中…」 | 正在初始化 Appwrite |
| 🟢 綠色「Appwrite ✓」 | 連線成功，資料同步至雲端 |
| 🔴 紅色「未連線」 | config.js 未設定，資料存於 localStorage |
| 🔵 藍色「展示模式」 | demo.html 使用 Mock 資料 |

---

## License

[MIT](./LICENSE)
