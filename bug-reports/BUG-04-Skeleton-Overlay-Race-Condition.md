# 🐛 BUG-04 — Page Skeleton Overlay Race Condition Causes Silent Click Failures

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-04 |
| **Severity** | 🟡 Low |
| **Module** | Purchase Orders Page → Page Hydration → Scan Bill AI Trigger |
| **Trigger** | Clicking "Scan Bill AI" button immediately after page navigation |
| **Found During** | TC-01 to TC-08 — All tests (intermittent via `beforeEach`) |
| **Status** | 🟡 Open — Automation Workaround Applied |

---

## 📋 Description

When navigating to `/owner/purchase-orders`, a **skeleton loader overlay** (`.Purchasing_po-skeleton-wrapper__Bd0lT`) is displayed while remote product catalogs and vendor data are being fetched from the API.

During this hydration window (**400–1200ms**), clicking any button — including **"Scan Bill AI"** — is **silently ignored**. No error is shown, no feedback is given. The button visually appears clickable but does nothing.

---

## 🔁 Steps to Reproduce

1. Navigate to `https://cafe-test-qr-frontend.vercel.app/owner/purchase-orders`
2. **Immediately** (within ~1 second) click the **"Scan Bill AI"** button
3. Observe: modal does **not** open — no response whatsoever
4. Wait 1–2 seconds, click again → modal opens successfully

---

## ❌ Actual Behavior

```
Skeleton overlay: VISIBLE (pointer-events blocking)
Button state: Appears enabled / clickable (no visual indication)
Click result: IGNORED — modal does not open
User feedback: NONE
```

This caused **intermittent test failures** across all 8 test cases in automation.

---

## ✅ Expected Behavior

One of the following:
1. The **button should appear disabled** (grayed out with cursor `not-allowed`) during hydration
2. A **loading tooltip** should appear: *"Loading catalog data, please wait..."*
3. Clicks during this phase should be **queued** and executed post-hydration

---

## 💡 Recommended Fix

### Option 1 — Disable Button During Loading (Recommended)
```jsx
<button
  className="btn-scan-ai"
  disabled={isCatalogLoading}
  title={isCatalogLoading ? "Loading catalog..." : "Scan Bill AI"}
>
  {isCatalogLoading ? <Spinner size="sm" /> : "🤖 Scan Bill AI"}
</button>
```

### Option 2 — Add Pointer-Events Block on Action Bar
```css
.po-action-bar.loading {
  pointer-events: none;
  opacity: 0.6;
}
```

---

## 🔧 Automation Workaround Applied

```typescript
// ScanBillModalPage.ts — openModal()
async openModal() {
  // Wait for skeleton to fully detach before interacting
  await this.page.waitForSelector(
    '.Purchasing_po-skeleton-wrapper__Bd0lT',
    { state: 'detached', timeout: 30000 }
  ).catch(() => {});

  await this.triggerButton.waitFor({ state: 'visible', timeout: 30000 });
  await this.triggerButton.click();
  await expect(this.modal).toBeVisible({ timeout: 15000 });
}
```

---

## 📊 Frequency

- **Automation:** Affected all 8 test cases intermittently
- **Manual Testing:** Reproducible consistently when navigating fast (e.g., browser back/forward)
- **CI Impact:** Caused flaky test failures without workaround

---

## 🧪 Test Reference

- **File:** `tests/scan-bill-ai.spec.ts`
- **Affected:** TC-01 to TC-08 (all via `test.beforeEach`)
- **POM:** `pages/ScanBillModalPage.ts` → `openModal()` method
