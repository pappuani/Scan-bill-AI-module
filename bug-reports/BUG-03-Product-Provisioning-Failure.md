# 🐛 BUG-03 — Product Provisioning Fails for Uncatalogued AI-Scanned Items

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-03 |
| **Severity** | 🟠 Medium |
| **Module** | Scan Bill AI → Complete & Receive Stock → Product Provisioning |
| **Trigger** | Clicking "Complete & Receive Stock" with a `__NEW__` item in the list |
| **Found During** | TC-06 — Direct Complete & Receive Stock Workflow |
| **Status** | 🔴 Open — Needs Backend + Frontend Fix |

---

## 📋 Description

When an AI-scanned line item does not match any existing product in the catalog, the system tags it as:
> `+ Treat as New Item` (internal value: `__NEW__`)

Clicking **"Complete & Receive Stock"** then fails because auto-provisioning requires **UOM** and **Category** — which are never collected from the user before submission.

---

## 🔁 Steps to Reproduce

1. Open the Scan Bill AI modal
2. Upload an invoice containing a **new/unknown product** not in your catalog
3. AI scan completes — the unknown item is tagged `+ Treat as New Item`
4. Click **"Complete & Receive Stock"**
5. Observe the error

---

## ❌ Actual Behavior

The operation fails with:
```
"Failed to provision product for '{item_name}'. 
Please map it to an existing product."
```
- The entire stock reception fails — even for items that **were** in the catalog
- No partial save occurs
- User loses all progress

---

## ✅ Expected Behavior

Before triggering `POST /api/v1/purchase/orders`:
1. Detect all items with `__NEW__` type
2. Show an **inline mapper** or **quick-map modal** asking for:
   - **Category** (required dropdown)
   - **UOM — Unit of Measure** (required dropdown)
3. Only proceed after all required fields are filled

---

## 💡 Recommended Fix

### Frontend
```jsx
// Validate before submission
const hasNewItems = lineItems.some(item => item.productId === '__NEW__');
if (hasNewItems) {
  setShowNewItemMapper(true); // Show mapping modal
  return;
}
```

### Backend
```json
// Return structured validation error instead of 500
{
  "success": false,
  "error": "UNPROVISIONED_ITEMS",
  "items": ["Organic Honey 500g", "New Product XYZ"],
  "message": "The following items need to be mapped to existing products or given a category and UOM."
}
```

---

## 📊 Business Impact

- Owner cannot receive stock from invoices that contain even **one** new product
- Workaround: manually switch all `__NEW__` items to existing products before submitting — very tedious for large invoices

---

## 🧪 Test Reference

- **File:** `tests/scan-bill-ai.spec.ts`
- **Test Case:** TC-06 — Direct Complete & Receive Stock Workflow
