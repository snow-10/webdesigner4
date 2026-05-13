# OpenSpec: 鮮奶通膨觀測站 (Milk Inflation Tracker)

## 階段一：探索 (Explore) 紀錄

**目標：** 建立一個能查詢主計處鮮奶通膨指數，並允許使用者記錄實際物價的網頁應用程式。
**技術棧：** Node.js, Express.js, SQLite, Vanilla JavaScript (Frontend)

**核心技術決策與挑戰排除：**

1. **模組系統轉換：** 將 Express 預設的 CommonJS (`require`) 全面轉換為 ES Modules (`type: module`)，並修復 `__dirname` 路徑問題。
2. **資料庫架構分離：**
* 政府客觀數據與使用者輸入數據性質不同，決定分為兩張資料表：`milk_cpi` (通膨指數) 與 `milk_prices` (使用者回報價格)。


3. **主計處 JSON 資料清洗：**
* 解決平行陣列 (row 與 outdata) 的對應問題。
* 實作資料轉換邏輯：民國年轉西元年 (+1911)、處理「無月份」的年平均數據 (設定 month 為 0)。


4. **防呆與防重複機制：**
* 針對使用者輸入的資料，在 `milk_prices` 設定 `UNIQUE(date, product_name)`。
* API 寫入時使用 `INSERT OR REPLACE` (UPSERT) 語法，達成「存在則更新，不存在則新增」的目標。


5. **UI/UX 版面重構：** 為解決首頁版面過度空白的問題，決定引入 CSS 雙欄排版（Flexbox/Grid）。將「靜態歷史資料」與「動態資料輸入」左右分離，並將「核心推估功能」置頂，符合使用者視覺動線。
6. **推估演算法實作：** 確立 CPI 轉換為實體價格的數學模型。基準點設為民國 110 年（實價 166 元），透過公式 `目標價格 = 166 * (目標CPI / 100)` 動態推算，並於前端使用 `Math.round()` 處理浮點數，確保顯示符合現實貨幣單位的整數。
7. **前端防呆與錯誤捕捉：** 實作 `fetch` 錯誤處理機制，精準捕捉 API 回傳的 500 錯誤（如 SQLite 的 Duplicate entry）及 404/空資料（如查無該月 CPI），並將生硬的錯誤代碼轉化為友善的 UI 文字提示。

---

## 階段二：提案 (Propose) - 系統規格與任務

### Database Schema (資料庫結構)

* **Table 1: `milk_cpi` (鮮奶通膨指數表)**
* `year` (INTEGER): 西元年
* `month` (INTEGER): 月份 (1-12)，0 代表該年度總指數
* `cpi` (REAL): 通膨指數


* **Table 2: `milk_prices` (使用者物價紀錄表)**
* `id` (INTEGER PRIMARY KEY)
* `date` (TEXT): 記錄日期
* `product_name` (TEXT): 商品名稱
* `price` (INTEGER): 價格
* *Constraint: `UNIQUE(date, product_name)*`



### API Endpoints (路由設計)

1. **`GET /api/cpi`**
* 功能：取得所有歷史通膨指數。
* 排序：依據 `year` 與 `month` 遞增排序 (ASC)。


2. **`GET /api/cpi/search`**
* 功能：根據特定年月查詢指數。
* 參數：`year` (必填), `month` (選填，預設為 0)。


3. **`POST /api/insert`**
* 功能：新增或更新使用者回報的鮮奶價格。
* 參數：`date`, `product_name`, `price` (放在 `req.body`)。



### UI Layout & Client-Side Logic (前端介面與業務邏輯)

* **UI 網頁版面配置:**
* **Top Section (頂部區塊):** 鮮奶價格推估搜尋表單 (`year`, `month` 輸入框)，以及動態生成的推估結果表格（顯示 CPI 與 轉換後的推估價格）。
* **Bottom Section (底部雙欄區塊):**
* **Left Column (左欄):** 歷年鮮奶指數資料呈現 (Table)。
* **Right Column (右欄):** 新增鮮奶指數表單 (Data Entry)。




* **前端業務邏輯:**
* **搜尋與推估 (`GET` Request):** 攔截表單 submit 事件，若 `month` 留空則預設賦值為 `0`。透過 `fetch` 呼叫 `/api/cpi/search`。價格換算公式：`Math.round(166 * (fetched_cpi / 100))`。
* **資料寫入 (`POST` Request):** 攔截右下角表單 submit 事件，將資料打包為 JSON 發送至 `/api/insert`。捕捉後端 `UNIQUE` 限制拋出的錯誤，並在 UI 渲染紅色錯誤提示（例如：Duplicate entry）。



---

## 階段三：實作 (Apply) - 執行清單 (Checklist)

* [x] **環境建置**
* [x] 初始化 Node.js 專案並安裝 Express generator (`--no-view`)。
* [x] 修改 `package.json` 加入 `"type": "module"`。
* [x] 將 `app.js` 與 `./bin/www.js` 的 `require` 重構為 `import`。


* [x] **資料庫建置 (`db.js`)**
* [x] 安裝 `sqlite3` 套件。
* [x] 撰寫建立 `milk_cpi` 與 `milk_prices` 資料表的 SQL 邏輯。
* [x] 撰寫讀取主計處 JSON 檔案 (`fs` 模組)，並透過迴圈與 `db.prepare` 批次寫入資料的腳本。


* [x] **後端 API 開發 (`app.js`)**
* [x] 實作 `GET /api/cpi`。
* [x] 實作 `GET /api/cpi/search` 條件查詢。
* [x] 實作 `POST /api/insert` 與 UPSERT 覆蓋邏輯。
* [x] 透過 Thunder Client 測試 API 端點，確認無 Server Refused 錯誤。


* [x] **前端介面優化與邏輯實作 (`index.html` & `style.css`)**
* [x] 劃分 Top, Bottom-Left, Bottom-Right 三大區塊，應用 CSS 雙欄佈局將歷史資料與新增表單並排。
* [x] 調整「新增鮮奶指數」與「所有鮮奶指數資料」的 `<h2>` 標題樣式 (取消粗體 `font-weight: normal`，調整字體大小 `font-size`)。
* [x] **推估搜尋功能實作：** 完成 `GET /api/cpi/search` 串接，實作 CPI to Price 的轉換公式與 `Math.round()` 四捨五入處理，並完成查無資料的 UI 防呆提示。
* [x] **寫入功能與錯誤處理：** 完成 `POST /api/insert` 串接，成功捕捉並顯示資料庫層級的重複輸入錯誤（Duplicate entry）。



---

## 階段四：歸檔 (Archive) 狀態

* **目前狀態：** 系統 MVP (Minimum Viable Product，最小可行性產品) 已 100% 完成。前後端 API 串接順利，資料庫讀寫與運算邏輯皆符合規格 (A1~A6)。
* **專案總結：** 成功從 CommonJS 遷移至 ES Modules，並完成包含 SQLite 資料庫建置、RESTful API 設計、純原生 JavaScript (Vanilla JS) 非同步串接、以及響應式前端排版的完整全端 (Full-Stack) 實作。待全數功能測試完畢後，即可將此文件移入 `archive/` 資料夾。