# Appwrite 資料庫設定說明

本文件說明如何在 Appwrite Cloud 建立 Allen Dashboard 所需的資料庫與三個 Table。

---

## 目錄

1. [建立 Appwrite 帳號與專案](#1-建立-appwrite-帳號與專案)
2. [建立 Database](#2-建立-database)
3. [建立 Table：dashboard_config](#3-建立-table-dashboard_config)
4. [建立 Table：calendar_events](#4-建立-table-calendar_events)
5. [建立 Table：personal_history](#5-建立-table-personal_history)
6. [填寫 config.js](#6-填寫-configjs)
7. [驗證連線](#7-驗證連線)
8. [常見問題](#8-常見問題)

---

## 1. 建立 Appwrite 帳號與專案

1. 前往 **https://cloud.appwrite.io** 點選「Sign Up」註冊  
   （已有帳號直接登入）

2. 登入後點選右上角 **「Create project」**

3. 填寫：
   - **Project name**：`AllenDashboard`（可自訂）
   - **Region**：選擇離你最近的地區（例如 `Frankfurt`）

4. 點選 **「Create」**

5. 進入專案後，左側選單點選 **「Settings」→「Overview」**  
   複製並記錄 **Project ID**（格式類似 `abc123def456`）

---

## 2. 建立 Database

1. 左側選單點選 **「Databases」**

2. 點選右上角 **「Create database」**

3. 填寫：
   - **Database ID**：點旁邊鉛筆圖示，輸入 `allen-dashboard`（或保留自動產生）
   - **Name**：`AllenDashboard DB`

4. 點選 **「Create」**

5. 複製並記錄畫面上的 **Database ID**

---

## 3. 建立 Table：dashboard_config

> 儲存儀表板設定，包含關鍵字、連結、Podcast 清單等。

### 3-1 建立 Table

1. 進入剛建立的 Database，點選 **「Create table」**
2. 填寫：
   - **Table ID**：`dashboard_config`
   - **Name**：`Dashboard Config`
3. 點選 **「Create」**

### 3-2 新增欄位（Columns）

點選 **「Columns」** 標籤，依序新增以下兩個欄位：

#### 欄位 1：key

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `key` |
| **Size** | `100` |
| **Required** | ✅ 勾選 |
| **Default** | （空白） |
| **Array** | ❌ 不勾選 |

點選 **「Create」**，等待狀態變成 `Available`

#### 欄位 2：value

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `text` |
| **Column ID** | `value` |
| **Required** | ✅ 勾選 |
| **Default** | （空白） |
| **Array** | ❌ 不勾選 |

點選 **「Create」**，等待狀態變成 `Available`

### 3-3 新增 Index

點選 **「Indexes」** 標籤，點選 **「Create index」**：

| 設定項目 | 值 |
|----------|----|
| **Index ID** | `key_unique` |
| **Type** | `Unique` |
| **Columns** | 選擇 `key`，Order 選 `ASC` |

點選 **「Create」**

### 3-4 設定 Permissions

點選 **「Settings」** 標籤，找到 **「Permissions」** 區塊：

1. 點選 **「Add Role」** → 選 **「Any」**
2. 勾選全部四個權限：
   - ✅ `Create`
   - ✅ `Read`
   - ✅ `Update`
   - ✅ `Delete`
3. 點選 **「Update」** 儲存

### 3-5 記錄 Table ID

從頁面頂端或 Settings 複製 **Table ID**（即 `dashboard_config` 或自動產生的 ID）

---

## 4. 建立 Table：calendar_events

> 儲存行事曆事件。

### 4-1 建立 Table

1. 回到 Database 頁面，點選 **「Create table」**
2. 填寫：
   - **Table ID**：`calendar_events`
   - **Name**：`Calendar Events`
3. 點選 **「Create」**

### 4-2 新增欄位（Columns）

點選 **「Columns」** 標籤，依序新增以下五個欄位：

#### 欄位 1：title

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `title` |
| **Size** | `500` |
| **Required** | ✅ 勾選 |

#### 欄位 2：date

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `date` |
| **Size** | `10` |
| **Required** | ✅ 勾選 |

> 格式為 `YYYY-MM-DD`，例如 `2025-04-25`

#### 欄位 3：time

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `time` |
| **Size** | `10` |
| **Required** | ❌ 不勾選 |
| **Default** | （空白） |

#### 欄位 4：note

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `text` |
| **Column ID** | `note` |
| **Required** | ❌ 不勾選 |
| **Default** | （空白） |

#### 欄位 5：color

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `color` |
| **Size** | `20` |
| **Required** | ❌ 不勾選 |
| **Default** | `#58a6ff` |

### 4-3 設定 Permissions

同 dashboard_config，將 **Role: Any** 設為 Create / Read / Update / Delete 全開。

### 4-4 記錄 Table ID

---

## 5. 建立 Table：personal_history

> 儲存「艾倫歷史上的今天」個人記事。

### 5-1 建立 Table

1. 回到 Database 頁面，點選 **「Create table」**
2. 填寫：
   - **Table ID**：`personal_history`
   - **Name**：`Personal History`
3. 點選 **「Create」**

### 5-2 新增欄位（Columns）

#### 欄位 1：title

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `varchar` |
| **Column ID** | `title` |
| **Size** | `500` |
| **Required** | ✅ 勾選 |

#### 欄位 2：description

| 設定項目 | 值 |
|----------|----|
| **Type** | `Text` |
| **Sub-type** | `text` |
| **Column ID** | `description` |
| **Required** | ❌ 不勾選 |
| **Default** | （空白） |

#### 欄位 3：year

| 設定項目 | 值 |
|----------|----|
| **Type** | `Integer` |
| **Column ID** | `year` |
| **Required** | ✅ 勾選 |
| **Min** | `1900` |
| **Max** | `2099` |

#### 欄位 4：month

| 設定項目 | 值 |
|----------|----|
| **Type** | `Integer` |
| **Column ID** | `month` |
| **Required** | ✅ 勾選 |
| **Min** | `1` |
| **Max** | `12` |

#### 欄位 5：day

| 設定項目 | 值 |
|----------|----|
| **Type** | `Integer` |
| **Column ID** | `day` |
| **Required** | ✅ 勾選 |
| **Min** | `1` |
| **Max** | `31` |

### 5-3 新增 Index

點選 **「Indexes」** 標籤，點選 **「Create index」**：

| 設定項目 | 值 |
|----------|----|
| **Index ID** | `month_day` |
| **Type** | `Key` |
| **Columns** | 先選 `month`（ASC），再點 **「+ Add column」** 選 `day`（ASC） |

點選 **「Create」**

### 5-4 設定 Permissions

同前，**Role: Any** → Create / Read / Update / Delete 全開。

### 5-5 記錄 Table ID

---

## 6. 填寫 config.js

開啟專案根目錄的 `config.js`，將收集到的 ID 填入對應位置：

```javascript
const APPWRITE_ENDPOINT   = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '貼上 Project ID';        // Settings → Overview
const APPWRITE_DB_ID      = '貼上 Database ID';       // Databases 頁面
const APPWRITE_COL_CONFIG  = '貼上 dashboard_config 的 Table ID';
const APPWRITE_COL_EVENTS  = '貼上 calendar_events 的 Table ID';
const APPWRITE_COL_HISTORY = '貼上 personal_history 的 Table ID';
```

> ⚠️ **安全提醒**：`config.js` 包含 Appwrite 憑證，請勿提交至公開的 GitHub Repository。  
> 建議將 `config.js` 加入 `.gitignore`，或改用伺服器端環境變數注入。

---

## 7. 驗證連線

1. 用瀏覽器開啟 `index.html`（需透過 HTTP Server，不可直接雙擊開啟）

   ```bash
   # 快速啟動本地伺服器（擇一）
   npx serve .
   python3 -m http.server 8080
   ```

2. 觀察右上角 DB badge 狀態：

   | 顏色 | 文字 | 說明 |
   |------|------|------|
   | 🟡 黃色 | 連線中… | 正在初始化，請稍候 |
   | 🟢 綠色 | Appwrite ✓ | 連線成功，資料已同步至雲端 |
   | 🔴 紅色 | 未連線 | 請重新確認 `config.js` 的 ID |

3. 若頁面頂端出現黃色警示列，表示 `config.js` 中仍有 `YOUR_` 字樣尚未替換。

---

## 8. 常見問題

### Q1：出現 401 Unauthorized

**原因**：Table 的 Permissions 未正確設定，或 Project 未加入 Platform。

**解法**：
1. 左側選單 → **「Settings」** → **「Platforms」**
2. 點選 **「Add platform」** → 選 **「Web」**
3. **Name**：`Local` / **Hostname**：`localhost`
4. 若部署至外部網址，再新增對應 Hostname

---

### Q2：出現 403 Forbidden

**原因**：Table Permissions 未包含 `Read`。

**解法**：進入對應 Table → **「Settings」** → **「Permissions」** → 確認 `Any` 角色已勾選 `Read`。

---

### Q3：儲存設定後重整資料消失

**原因**：`dashboard_config` 的 `key` 欄位未建立 **Unique Index**。

**解法**：進入 dashboard_config → **「Indexes」** → 確認存在 `key_unique`（Type: Unique）。

---

### Q4：自架 Appwrite（Self-hosted）

若使用自架版本，修改 `config.js` 中的 endpoint：

```javascript
const APPWRITE_ENDPOINT = 'https://your-appwrite-domain.com/v1';
```

其餘步驟完全相同。

---

*最後更新：2025-04-25*
