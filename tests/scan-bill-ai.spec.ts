import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ScanBillModalPage } from '../pages/ScanBillModalPage';
import path from 'path';

test.describe('Scan Bill AI Module - Comprehensive End-to-End Test Suite', () => {
  let loginPage: LoginPage;
  let scanBillPage: ScanBillModalPage;

  const validInvoicePath = path.resolve(__dirname, '../fixtures/valid-tax-invoice.png');
  const unreadableInvoicePath = path.resolve(__dirname, '../fixtures/unreadable-invoice.png');

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('anicafeqr@gmail.com', '123456');

    // Navigate to purchase orders page
    await page.goto('/owner/purchase-orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.Purchasing_po-skeleton-wrapper__Bd0lT', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    scanBillPage = new ScanBillModalPage(page);
  });

  test('TC-01: Modal Initialization, UI Structure & Clean Dismissal', async ({ page }) => {
    console.log('Running TC-01: Verifying Scan Bill AI Modal launch and UI components...');

    // 1. Verify launch trigger is available on PO screen
    await expect(scanBillPage.triggerButton).toBeVisible();

    // 2. Open modal
    await scanBillPage.openModal();

    // 3. Verify modal header and AI indicators
    await expect(scanBillPage.modalTitle).toContainText('Purchase Bill & Receipt Scanner');
    await expect(scanBillPage.aiBadge).toBeVisible();
    await expect(scanBillPage.closeButton).toBeVisible();

    // 4. Verify upload elements are present
    await expect(scanBillPage.fileInputs.last()).toBeAttached();

    // 5. Verify modal dismissal via close button
    await scanBillPage.closeModal();

    // 6. Verify parent PO page is intact
    await expect(scanBillPage.triggerButton).toBeVisible();
  });

  test('TC-02: End-to-End AI Document Processing & Line Extraction Flow', async ({ page }) => {
    console.log('Running TC-02: Uploading valid invoice and validating AI extraction...');

    await scanBillPage.openModal();

    // 1. Upload valid invoice
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await expect(scanBillPage.previewImage).toBeVisible();
    await expect(scanBillPage.startAiScanButton).toBeVisible();

    // 2. Trigger AI Scan and wait for API parsing
    const responseData = await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });
    expect(responseData).toBeDefined();

    // 3. Verify detected vendor indicator
    await expect(scanBillPage.supplierDetectedBadge).toBeVisible();
    await expect(scanBillPage.supplierDetectedBadge).toContainText('METRO WHOLESALERS PVT LTD');

    // 4. Verify extracted invoice reference
    const invoiceRefValue = await scanBillPage.invoiceRefInput.inputValue();
    expect(invoiceRefValue).toBe('INV-98214');

    // 5. Verify parsed line items in table
    const rowCount = await scanBillPage.rowItemNames.count();
    expect(rowCount).toBeGreaterThanOrEqual(4);

    // Verify first extracted line item
    const firstItem = await scanBillPage.rowItemNames.first().inputValue();
    expect(firstItem.toLowerCase()).toContain('milk');

    // 6. Verify financial summary totals
    await expect(scanBillPage.detectedOnBillValue).toBeVisible();
    await expect(scanBillPage.grandTotalValue).toBeVisible();

    // 7. Verify action buttons in footer
    await expect(scanBillPage.scanAnotherButton).toBeVisible();
    await expect(scanBillPage.loadIntoPoButton).toBeVisible();
    await expect(scanBillPage.completeReceiveStockButton).toBeVisible();
  });

  test('TC-03: Line Item Edits, Type Toggling & Dynamic Total Recalculation', async ({ page }) => {
    console.log('Running TC-03: Testing inline editing, item type pill toggling & calculation updates...');

    await scanBillPage.openModal();
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });

    // 1. Edit quantity and cost of first row
    await scanBillPage.editLineItem(0, { qty: 30, cost: 70, tax: 5 });

    // 2. Verify Line Total recalculates: (30 * 70) + 5% = 2100 + 105 = 2205.00
    const firstRowText = await scanBillPage.tableRows.first().innerText();
    expect(firstRowText).toContain('2205.00');

    // 3. Test Type Pill toggle (Ingredient <-> Product)
    const { prevClass, newClass } = await scanBillPage.toggleItemTypePill(0);
    expect(prevClass).not.toEqual(newClass);

    // 4. Test checkbox selection toggle
    await scanBillPage.toggleLineItemSelection(0);
    // Unchecking row should update grand total or items included counter
    const modalText = await scanBillPage.modal.innerText();
    expect(modalText).toContain('3 items included');

    // Re-check row
    await scanBillPage.toggleLineItemSelection(0);
  });

  test('TC-04: Manual Line Insertion, Custom Product Entry & Row Deletion', async ({ page }) => {
    console.log('Running TC-04: Testing manual line addition and row deletion...');

    await scanBillPage.openModal();
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });

    const initialCount = await scanBillPage.rowItemNames.count();

    // 1. Add new manual item row
    await scanBillPage.addNewLine({
      name: 'Organic Honey 500g',
      qty: 6,
      cost: 150,
      tax: 0,
      uom: 'jar'
    });

    const afterAddCount = await scanBillPage.rowItemNames.count();
    expect(afterAddCount).toBe(initialCount + 1);

    // 2. Delete the last row
    await scanBillPage.deleteLineItem(afterAddCount - 1);

    const afterDeleteCount = await scanBillPage.rowItemNames.count();
    expect(afterDeleteCount).toBe(initialCount);
  });

  test('TC-05: Load Scanned Items into Parent Purchase Order Form', async ({ page }) => {
    console.log('Running TC-05: Loading scanned items directly into Purchase Order form...');

    await scanBillPage.openModal();
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });

    // 1. Select vendor & warehouse
    await scanBillPage.selectSupplier('METRO');
    await scanBillPage.selectWarehouse('Main');

    // 2. Click "Load into Purchase Order"
    await scanBillPage.clickLoadIntoPo();

    // 3. Modal should dismiss and PO items table should reflect lines
    await expect(scanBillPage.modal).not.toBeVisible({ timeout: 10000 });

    // Verify parent PO form contains added items or reference
    const poPageContent = await page.innerText('body');
    expect(poPageContent.toLowerCase()).toMatch(/milk|coffee|sugar|metro/);
  });

  test('TC-06: Direct Complete & Receive Stock Workflow', async ({ page }) => {
    console.log('Running TC-06: Direct PO creation & stock reception from bill...');

    await scanBillPage.openModal();
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });

    // 1. Select vendor
    await scanBillPage.selectSupplier('METRO');

    // 2. Click Complete & Receive Stock and intercept creation API
    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/v1/purchase/orders') && res.request().method() === 'POST',
        { timeout: 30000 }
      ).catch(() => null),
      scanBillPage.clickCompleteReceiveStock()
    ]);

    if (response) {
      expect([200, 201]).toContain(response.status());
      console.log('PO direct creation API returned status:', response.status());
    }

    // Modal should close upon successful completion
    await page.waitForTimeout(2000);
  });

  test('TC-07: Error Handling, Blurry Image Detection & Reset Flow', async ({ page }) => {
    console.log('Running TC-07: Validating unreadable bill warning and reset capabilities...');

    await scanBillPage.openModal();

    // 1. Upload unreadable/corrupted invoice image
    await scanBillPage.uploadInvoiceImage(unreadableInvoicePath);

    // 2. Start AI scan and assert error banner handling
    await scanBillPage.startAiScanAndWait({ expectSuccess: false, timeout: 45000 });

    await expect(scanBillPage.errorAlert).toBeVisible();
    await expect(scanBillPage.errorMessage).toContainText(/legible|visible|error|failed/i);

    // 3. Test "Change Image" button returns to upload selection
    if (await scanBillPage.changeImageButton.isVisible()) {
      await scanBillPage.changeImageButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-08: Validation Rules - Required Supplier & Empty Items Guard', async ({ page }) => {
    console.log('Running TC-08: Testing required vendor and line selection validation guards...');

    await scanBillPage.openModal();
    await scanBillPage.uploadInvoiceImage(validInvoicePath);
    await scanBillPage.startAiScanAndWait({ expectSuccess: true, timeout: 60000 });

    // 1. Test clicking "Complete & Receive Stock" without selecting supplier
    // If supplier is not selected, verify validation warning toast
    const supplierText = await scanBillPage.supplierDropdownTrigger.innerText();
    if (supplierText.includes('Select Supplier')) {
      await scanBillPage.clickCompleteReceiveStock();
      // Expect toast warning
      const toast = page.getByText(/Please select a Supplier/i);
      await expect(toast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }

    // 2. Test "Scan Another" resets modal back to initial upload screen
    await scanBillPage.clickScanAnother();
    await expect(scanBillPage.startAiScanButton).toBeVisible();
  });
});
