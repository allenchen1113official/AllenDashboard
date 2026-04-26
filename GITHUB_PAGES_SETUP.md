# GitHub Pages 部署說明

本文件說明如何將 Allen Dashboard 部署至 GitHub Pages，實現公開網址存取並保持 Appwrite 憑證安全。

---

## 目錄

1. [部署架構概覽](#1-部署架構概覽)
2. [前置條件](#2-前置條件)
3. [步驟一：Fork / Push 至 GitHub](#3-步驟一fork--push-至-github)
4. [步驟二：開啟 GitHub Pages](#4-步驟二開啟-github-pages)
5. [步驟三：產生加密設定](#5-步驟三產生加密設定)
6. [步驟四：設定 GitHub Secrets](#6-步驟四設定-github-secrets)
7. [步驟五：觸發部署](#7-步驟五觸發部署)
8. [步驟六：開啟網站並解鎖](#8-步驟六開啟網站並解鎖)
9. [更新與重新部署](#9-更新與重新部署)
10. [無 Appwrite 模式（純展示）](#10-無-appwrite-模式純展示)
11. [常見問題](#11-常見問題)

---

## 1. 部署架構概覽

```
本機 setup.html
  ↓ 產生 APPWRITE_SALT + APPWRITE_CIPHER
GitHub Secrets（加密存放）
  ↓ 推送 / 手動觸發
GitHub Actions
  ↓ 讀取 Secrets → 動態產生 config.js → 上傳靜態檔案
GitHub Pages（公開網址）
  ↓ 使用者開啟網站
瀏覽器
  ↓ 輸入密碼短語 → AES-256-GCM 解密 → 連線 Appwrite
```

**安全保證**

| 環節 | 保護方式 |
|------|---------|
| Appwrite 憑證 | 加密為密文，明文永遠不離開本機 |
| GitHub Secrets | GitHub 加密存放，Action log 不顯示值 |
| 部署產物 | `config.js` 只含 Salt + Cipher（密文），可公開 |
| 瀏覽器執行期 | `sessionKey` 僅在記憶體，關閉頁面即消失 |

---

## 2. 前置條件

- GitHub 帳號與目標 Repository（Public 或 Private 皆可）
- 已依 [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) 建立 Appwrite 資料庫
- 本機可執行 `npx serve .`（需安裝 Node.js）

---

## 3. 步驟一：Fork / Push 至 GitHub

若尚未將專案推送至 GitHub：

```bash
# 在 GitHub 建立空白 Repository（不要勾選初始化 README）
# 回到本機執行：

git remote add origin https://github.com/<你的帳號>/<Repo名稱>.git
git push -u origin main
```

若使用 Fork，直接在 GitHub 上操作後，clone 至本機即可。

---

## 4. 步驟二：開啟 GitHub Pages

1. 進入 GitHub Repository 頁面
2. 點選上方 **「Settings」** 標籤
3. 左側選單找到 **「Pages」**
4. 在 **「Build and deployment」** 區塊：
   - **Source**：選擇 **「GitHub Actions」**
5. 頁面出現 **「GitHub Actions」** 確認訊息即完成

> ⚠️ **注意**：Source 必須選 **「GitHub Actions」**，不可選 **「Deploy from a branch」**，否則工作流程無法運作。

---

## 5. 步驟三：產生加密設定

在**本機**執行（勿在公共電腦操作）：

```bash
cd AllenDashboard
npx serve .
```

開啟瀏覽器前往：

```
http://localhost:3000/setup.html
```

### 填寫欄位

| 欄位 | 值 |
|------|----|
| **Endpoint** | `https://cloud.appwrite.io/v1`（預設，通常不用改） |
| **Project ID** | Appwrite Console → Settings → Overview |
| **Database ID** | Appwrite Console → Databases |
| **Collection ID — dashboard_config** | 對應 Collection 的 ID |
| **Collection ID — calendar_events** | 對應 Collection 的 ID |
| **Collection ID — personal_history** | 對應 Collection 的 ID |
| **密碼短語** | 自訂，至少 12 字元（含大小寫與數字） |
| **確認密碼短語** | 同上 |

### 操作流程

1. 填寫完成後點選 **「產生加密設定」**
2. 等待約 1–2 秒（PBKDF2 運算）
3. 畫面出現輸出方塊後，點選 **「複製全部」**
4. 分別記下 `APPWRITE_SALT` 的值與 `APPWRITE_CIPHER` 的值

> 💡 **密碼短語請妥善保管**。忘記後需重新執行 `setup.html` 產生新的 Salt + Cipher，並更新 GitHub Secrets，舊資料仍可讀取（因為 Appwrite 中的加密資料不受影響，只是換了新的金鑰）。

---

## 6. 步驟四：設定 GitHub Secrets

1. 進入 GitHub Repository → **「Settings」**
2. 左側選單 → **「Secrets and variables」** → **「Actions」**
3. 點選 **「New repository secret」**，依序新增以下 Secret：

### Secret 1：APPWRITE_SALT

| 欄位 | 值 |
|------|----|
| **Name** | `APPWRITE_SALT` |
| **Secret** | 貼上 setup.html 產生的 Salt 值（32 位 hex 字串） |

點選 **「Add secret」**

### Secret 2：APPWRITE_CIPHER

| 欄位 | 值 |
|------|----|
| **Name** | `APPWRITE_CIPHER` |
| **Secret** | 貼上 setup.html 產生的 Cipher 值（base64 字串） |

點選 **「Add secret」**

### Secret 3：APPWRITE_ENDPOINT（選填）

僅在使用**自架 Appwrite**（非 Cloud）時需要設定：

| 欄位 | 值 |
|------|----|
| **Name** | `APPWRITE_ENDPOINT` |
| **Secret** | `https://your-appwrite-domain.com/v1` |

> 使用 Appwrite Cloud 預設網址者**不需要**新增此 Secret。

### 確認結果

設定完成後，Secrets 清單應顯示：

```
APPWRITE_CIPHER   ••••••  Updated just now
APPWRITE_SALT     ••••••  Updated just now
```

---

## 7. 步驟五：觸發部署

### 方法 A：推送程式碼（自動觸發）

```bash
# 任何對 main branch 的 push 都會自動觸發部署
git push origin main
```

### 方法 B：手動觸發

1. 進入 GitHub Repository → **「Actions」** 標籤
2. 左側選單找到 **「Deploy to GitHub Pages」**
3. 點選右側 **「Run workflow」** → **「Run workflow」**

### 查看部署進度

1. Repository → **「Actions」** 標籤
2. 點選最新一筆 workflow run
3. 展開 **「deploy」** job 查看各步驟狀態
4. 出現綠色勾勾 ✅ 代表部署成功

部署通常需要 **30 秒 – 2 分鐘**。

---

## 8. 步驟六：開啟網站並解鎖

### 取得網址

部署成功後，網址格式為：

```
https://<GitHub帳號>.github.io/<Repository名稱>/
```

例如：`https://allenchen1113official.github.io/AllenDashboard/`

也可在 Repository → **「Settings」→「Pages」** 頁面找到網址連結。

### 解鎖流程

1. 開啟網址，畫面顯示**密碼短語輸入框**
2. 輸入在 `setup.html` 設定的密碼短語
3. 點選 **「解鎖」**（或按 Enter）
4. 驗證成功後，Dashboard 自動載入並連線 Appwrite

> 🔒 密碼短語**不會被儲存**至瀏覽器。每次開啟頁面（或重新整理）都需重新輸入。

---

## 9. 更新與重新部署

### 更新程式碼

```bash
# 修改任意檔案後推送即自動重新部署
git add .
git commit -m "更新說明"
git push origin main
```

### 更換密碼短語

1. 本機執行 `setup.html`，使用**新密碼短語**產生新的 Salt + Cipher
2. 進入 GitHub → Settings → Secrets，分別更新 `APPWRITE_SALT` 和 `APPWRITE_CIPHER`
3. 手動觸發 Actions 重新部署（或 push 任意更新）
4. 下次開啟網站時使用新密碼短語

> ⚠️ 更換密碼短語後，Appwrite 中的舊加密資料需要重新讀取與更新（重新儲存一次即可用新金鑰加密）。建議搭配全新部署時使用。

---

## 10. 無 Appwrite 模式（純展示）

若不需要連接 Appwrite，**不設定任何 Secret** 即可：

- 工作流程偵測到 Secrets 未設定，自動產生帶有佔位符的 `config.js`
- Dashboard 以 **localStorage 模式**運行
- 所有功能正常，資料存於瀏覽器本地
- 不顯示密碼短語輸入框
- 直接存取 `/demo.html` 可看到完整 Mock 資料展示

---

## 11. 常見問題

### Q1：Actions 出現「Error: Get Pages site failed」

**原因**：GitHub Pages 尚未開啟，或 Source 未設為 GitHub Actions。

**解法**：
1. Repository → Settings → Pages
2. Source 確認為 **「GitHub Actions」**
3. 重新觸發 workflow

---

### Q2：部署成功但開啟網站顯示 404

**原因**：GitHub Pages 的快取尚未更新，或 URL 路徑不正確。

**解法**：
- 等待 1–3 分鐘後重新整理
- 確認 URL 末尾加上 `/`，例如 `https://user.github.io/AllenDashboard/`
- 確認 `index.html` 在 Repository 根目錄

---

### Q3：輸入密碼短語後顯示「密碼短語錯誤」

**可能原因**：
1. 輸入錯誤
2. GitHub Secrets 中的 APPWRITE_SALT 或 APPWRITE_CIPHER 與 setup.html 產生的值不一致

**解法**：
1. 重新執行 `setup.html`（使用**完全相同的** Appwrite IDs 與密碼短語）
2. 更新 GitHub Secrets 中的 APPWRITE_SALT 與 APPWRITE_CIPHER
3. 重新觸發部署

---

### Q4：不想每次開啟都輸入密碼短語

目前設計為每次開啟頁面均需輸入，以保護資料安全。

若在受信任的個人裝置上使用，可考慮使用**無加密的明文模式**（config.example.js 的 Option B），在 GitHub Actions 中直接以 Secrets 存放明文 ID，並移除 `APPWRITE_CIPHER`。但此做法不建議公開 Repository 使用。

---

### Q5：Private Repository 可以使用 GitHub Pages 嗎？

GitHub Free 帳號的 Private Repository **不支援** GitHub Pages。需要以下其中一種方案：

- 升級至 **GitHub Pro / Team**
- 將 Repository 設為 **Public**（因為加密保護，公開 config.js 密文是安全的）
- 改用其他靜態部署服務（Vercel、Cloudflare Pages 等），設定方式與本文類似

---

*最後更新：2026-04-26*
