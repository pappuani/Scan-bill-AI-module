# 🤖 Scan Bill AI — Playwright Automation Suite

End-to-end (E2E) automated testing suite for the **Scan Bill AI** module of the Cafe QR Management System. Built with **TypeScript**, **Playwright**, and the **Page Object Model (POM)** pattern.

The Scan Bill AI feature allows owners to upload purchase invoices, auto-extract line items via AI/OCR, review & edit extracted data, and directly create Purchase Orders or receive stock — all without manual data entry.

---

## 🧾 Application Details

- **Base URL:** `https://cafe-test-qr-frontend.vercel.app`
- **Login URL:** `https://cafe-test-qr-frontend.vercel.app/login`
- **Module URL:** `https://cafe-test-qr-frontend.vercel.app/owner/purchase-orders`
- **AI Parse Endpoint:** `/api/ai/parse-purchase-bill`

### 🔐 Test Credentials
| Field    | Value                  |
|----------|------------------------|
| Email    | `anicafeqr@gmail.com`  |
| Password | `123456`               |
| Role     | Owner                  |

---

## 📁 Project Structure

```
Scan-Bill-AI-Automation/
├── pages/
│   ├── LoginPage.ts             # POM for authentication & session handling
│   └── ScanBillModalPage.ts     # POM for Scan Bill AI modal (upload, AI scan, review, submit)
├── tests/
│   └── scan-bill-ai.spec.ts     # 8-scenario comprehensive E2E test suite
├── fixtures/
│   ├── valid-tax-invoice.png    # High-resolution legible invoice fixture
│   └── unreadable-invoice.png   # Blurry/illegible invoice for error-handling tests
├── test-results/                # Auto-generated screenshots and trace artifacts
├── playwright.config.ts         # Playwright runner configuration
├── package.json                 # Dependencies and npm scripts
└── README.md                    # This file
```

---

## ✅ Test Scenarios & Coverage Matrix

| Test ID | Scenario | Expected Outcome | Status |
|---------|----------|------------------|--------|
| **TC-01** | **Modal Initialization & UI Structure** | Trigger button (`.btn-scan-ai`) launches modal; headers, AI badge, file inputs render; clean dismiss via Close (×). | ✅ **PASSED** |
| **TC-02** | **End-to-End AI Document Processing & OCR** | Uploads invoice; AI parse API returns 200 OK; extracts supplier (`METRO WHOLESALERS PVT LTD`), invoice ref (`INV-98214`), line items (Milk, Coffee, Sugar, Cocoa), and totals. | ✅ **PASSED** |
| **TC-03** | **Real-Time Line Edits & Dynamic Calculations** | Inline qty, cost, and tax edits recalculate Line Total & Grand Total dynamically. Pill toggles between `Ingredient` / `Product`. | ✅ **PASSED** |
| **TC-04** | **Manual Line Addition & Row Deletion** | "Add Line" appends custom items; delete button removes row and updates calculations. | ✅ **PASSED** |
| **TC-05** | **Load into Purchase Order Flow** | "Load into PO" transfers all parsed lines into the parent Purchase Order creation form. | ✅ **PASSED** |
| **TC-06** | **Direct Complete & Stock Reception** | "Complete & Receive Stock" triggers `POST /api/v1/purchase/orders` with `COMPLETED` status and updates inventory. | ✅ **PASSED** |
| **TC-07** | **Error Handling & Illegible Bill Alert** | Uploading an unreadable image shows user-friendly warning; "Change Image" resets the upload state. | ✅ **PASSED** |
| **TC-08** | **Validation Guards & Empty Submission Prevention** | Guards against submitting without supplier selection; verifies toast alerts and "Scan Another" state reset. | ✅ **PASSED** |

---

## 🐛 Bug & Defect Discoveries

### Bug #1 — Backend HTTP 500 on Illegible Bill (Severity: Medium)
- **Endpoint:** `POST /api/ai/parse-purchase-bill`
- **Issue:** Unreadable images return `500 Internal Server Error` instead of a client-facing `400/422` validation error.
- **Impact:** Front-end falls back to a generic warning instead of specific user guidance.
- **Recommendation:** Return `{ success: false, message: "..." }` with `400` or `422` status.

### Bug #2 — Responsive DOM Element Duplication (Severity: Low)
- **Issue:** The review modal renders dual input sets (desktop table + mobile card) simultaneously.
- **Automation Fix:** Page Object locators are explicitly scoped to `.bill-scan-modal table tbody` to avoid strict-mode collisions.

### Bug #3 — Product Provisioning Error for Uncatalogued Items (Severity: Medium)
- **Issue:** When a new/unknown item is classified as `+ Treat as New Item`, "Complete & Receive Stock" fails with:
  > `"Failed to provision product for '{item}'. Please map it to an existing product."`
- **Recommendation:** Provide inline dropdowns or a quick-map modal for category/UOM assignment before submission.

### Bug #4 — Skeleton Overlay Race Condition (Severity: Low)
- **Issue:** Page hydration skeleton (`.Purchasing_po-skeleton-wrapper__Bd0lT`) remains visible for 400–1200ms while remote catalogs load; interactions during this phase are silently ignored.
- **Fix Applied:** POM uses `waitForSelector` to await skeleton detachment before clicking.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- npm / npx

### Installation
```bash
npm install
npx playwright install chromium
```

### Run Tests

**Scan Bill AI Suite (Headless):**
```bash
npm run test:ai
# or
npx playwright test tests/scan-bill-ai.spec.ts
```

**Headed Mode (Visual Browser):**
```bash
npx playwright test tests/scan-bill-ai.spec.ts --headed
```

**Interactive UI Mode:**
```bash
npx playwright test --ui
```

**All Tests:**
```bash
npx playwright test
```

### View Reports
```bash
npx playwright show-report
```

---

## 🔧 Configuration

Key settings in `playwright.config.ts`:
- **Browser:** Chromium (Google Chrome)
- **Timeout:** 180 seconds per test
- **Video:** Recorded on failure
- **Retries:** 1 retry on CI
- **Workers:** 1 (sequential — auth-dependent)

---

## 📸 Screenshots & Evidence

| Screenshot | Description |
|------------|-------------|
| `scan-bill-modal.png` | Scan Bill AI modal — upload screen |
| `after-ai-scan.png` | Modal after successful AI scan & data extraction |
| `scan-ai-result-waited.png` | Full review state with extracted line items |

---

## 🏗️ Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Playwright | ^1.49.0 | E2E test automation |
| TypeScript | ^5.x | Type-safe test authoring |
| Node.js | 18+ | Runtime |
| Page Object Model | — | Test architecture pattern |
