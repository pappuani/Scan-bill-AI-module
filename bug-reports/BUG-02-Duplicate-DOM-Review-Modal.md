# 🐛 BUG-02 — Duplicate DOM Elements in Review Modal Table

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-02 |
| **Severity** | 🟡 Low (breaks test automation) |
| **Module** | Scan Bill AI → Review Modal → Line Items Table |
| **Trigger** | Opening review screen after AI scan completes |
| **Found During** | TC-02, TC-03, TC-04 — Review Mode Tests |
| **Status** | 🟡 Open — Workaround Applied in Automation |

---

## 📋 Description

After AI scan completes and the review modal renders, **two complete sets of input elements** exist in the DOM simultaneously:
- One for the **desktop table layout** (`table tbody`)
- One for the **mobile card layout** (`.mobile-card`)

Both are **visible in the DOM at the same time**, causing ambiguous element targeting.

---

## 🔁 Steps to Reproduce

1. Open the Scan Bill AI modal
2. Upload `fixtures/valid-tax-invoice.png`
3. Click **"Start AI Scan"** and wait for extraction to complete
4. Open **DevTools → Elements** tab
5. Search for `item-name-input` — you will find **duplicate inputs**:
   - One inside `table tbody tr`
   - One inside `.mobile-card` section

---

## ❌ Actual Behavior

```html
<!-- DESKTOP TABLE (visible) -->
<table>
  <tbody>
    <tr>
      <input class="item-name-input" value="Milk 1L" />
    </tr>
  </tbody>
</table>

<!-- MOBILE CARD (also visible simultaneously) -->
<div class="mobile-card">
  <input class="item-name-input" value="Milk 1L" />
</div>
```

Playwright strict mode throws:
```
Error: strict mode violation: locator('input.item-name-input') resolved to 8 elements
```

---

## ✅ Expected Behavior

Only **one set** of inputs should be in the DOM — responsive layout should use CSS `display: none` or conditional rendering, not dual DOM rendering.

---

## 💡 Recommended Fix

```jsx
// Option 1: CSS Media Query (hide, not remove)
@media (max-width: 768px) {
  .bill-scan-modal table { display: none; }
}
@media (min-width: 769px) {
  .mobile-card { display: none; }
}

// Option 2: Conditional Rendering
{isMobile ? <MobileCardView items={items} /> : <DesktopTableView items={items} />}
```

---

## 🔧 Automation Workaround Applied

POM locators explicitly scoped to desktop table only:
```typescript
// ScanBillModalPage.ts
this.rowItemNames = page.locator('.bill-scan-modal table tbody input.item-name-input');
this.rowQuantities = page.locator('.bill-scan-modal table tbody input.cell-input.qty');
this.rowCosts     = page.locator('.bill-scan-modal table tbody input.cell-input.cost');
```

---

## 🧪 Test Reference

- **File:** `tests/scan-bill-ai.spec.ts`
- **Test Cases:** TC-02, TC-03, TC-04
- **POM:** `pages/ScanBillModalPage.ts`
