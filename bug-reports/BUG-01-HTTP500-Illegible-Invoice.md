# 🐛 BUG-01 — Backend Returns HTTP 500 on Illegible Invoice Image

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-01 |
| **Severity** | 🟠 Medium |
| **Module** | Scan Bill AI → AI Document Processing |
| **Endpoint** | `POST /api/ai/parse-purchase-bill` |
| **Found During** | TC-07 — Error Handling & Blurry Image Detection |
| **Status** | 🔴 Open — Needs Backend Fix |

---

## 📋 Description

When an unreadable, blurry, or non-invoice image is uploaded and **"Start AI Scan"** is clicked, the backend crashes with a **500 Internal Server Error** instead of returning a proper client-facing validation error.

---

## 🔁 Steps to Reproduce

1. Open the **Scan Bill AI** modal on Purchase Orders page
2. Upload a blurry or unreadable image (not a valid invoice)
3. Click **"Start AI Scan"**
4. Check the API response in browser DevTools → Network tab

---

## ❌ Actual Behavior

```
HTTP Status: 500 Internal Server Error
Response: { error: "Internal Server Error" }
```
Front-end shows a **generic fallback warning** — no specific reason for failure.

---

## ✅ Expected Behavior

```json
HTTP Status: 400 Bad Request
{
  "success": false,
  "message": "The uploaded image is not legible. Please upload a clear invoice image with visible item names, quantities, and rates."
}
```

---

## 💡 Recommended Fix

Add input validation in the AI parse endpoint:
- Pre-validate image quality / readability before passing to OCR
- Return `400` or `422` with a descriptive error payload
- Never expose `500` errors to client for expected failure scenarios

---

## 🧪 Test Reference

- **File:** `tests/scan-bill-ai.spec.ts`
- **Test Case:** TC-07
- **Fixture:** `fixtures/unreadable-invoice.png`

---

## 📸 Evidence

The automation test uploads `fixtures/unreadable-invoice.png` and intercepts the API response.  
The `500` status was confirmed via `page.waitForResponse()` in TC-07.
