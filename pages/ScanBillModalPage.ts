import { Locator, Page, expect } from '@playwright/test';

export interface ScannedLineItemData {
  name?: string;
  qty?: number | string;
  uom?: string;
  cost?: number | string;
  tax?: number | string;
}

export class ScanBillModalPage {
  readonly page: Page;

  // Launch Trigger & Overlay
  readonly triggerButton: Locator;
  readonly modalOverlay: Locator;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly modalTitle: Locator;
  readonly aiBadge: Locator;

  // Upload State Elements
  readonly fileInputs: Locator;
  readonly previewImage: Locator;
  readonly changeImageButton: Locator;
  readonly startAiScanButton: Locator;
  readonly errorAlert: Locator;
  readonly errorMessage: Locator;

  // Review State Form Metadata
  readonly supplierDropdownTrigger: Locator;
  readonly supplierDetectedBadge: Locator;
  readonly warehouseDropdownTrigger: Locator;
  readonly invoiceRefInput: Locator;
  readonly orderDateTimeInput: Locator;
  readonly addLineButton: Locator;

  // Review State Table & Items
  readonly tableRows: Locator;
  readonly rowCheckboxes: Locator;
  readonly rowItemNames: Locator;
  readonly rowTypePills: Locator;
  readonly rowQuantities: Locator;
  readonly rowUOMs: Locator;
  readonly rowCosts: Locator;
  readonly rowTaxes: Locator;
  readonly rowDeleteButtons: Locator;

  // Totals & Footer Elements
  readonly subtotalValue: Locator;
  readonly taxTotalValue: Locator;
  readonly grandTotalValue: Locator;
  readonly detectedOnBillValue: Locator;
  readonly scanAnotherButton: Locator;
  readonly loadIntoPoButton: Locator;
  readonly completeReceiveStockButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Launch & Modal Frame
    this.triggerButton = page.locator('button.btn-scan-ai').first();
    this.modalOverlay = page.locator('.bill-scan-overlay');
    this.modal = page.locator('.bill-scan-modal');
    this.closeButton = page.locator('.bill-scan-modal .close-btn');
    this.modalTitle = page.locator('.bill-scan-modal h2');
    this.aiBadge = page.locator('.bill-scan-modal .ai-badge-icon');

    // Upload Mode
    this.fileInputs = page.locator('.bill-scan-modal input[type="file"]');
    this.previewImage = page.locator('.preview-media-box img');
    this.changeImageButton = page.locator('.bill-scan-modal button.toolbar-btn.secondary, button:has-text("Change Image")');
    this.startAiScanButton = page.locator('.bill-scan-modal button.toolbar-btn.primary, button:has-text("Start AI Scan")');
    this.errorAlert = page.locator('.scan-alert-error');
    this.errorMessage = page.locator('.scan-alert-error span');

    // Review Mode - Header fields
    this.supplierDropdownTrigger = page.locator('.bill-scan-modal .nice-select-trigger').first();
    this.supplierDetectedBadge = page.locator('.bill-scan-modal').getByText(/Detected:/i);
    this.warehouseDropdownTrigger = page.locator('.bill-scan-modal .nice-select-trigger').nth(1);
    this.invoiceRefInput = page.locator('.bill-scan-modal input.text-input');
    this.orderDateTimeInput = page.locator('.bill-scan-modal input.dt-input');
    this.addLineButton = page.locator('.bill-scan-modal button.add-line-btn');

    // Table rows & inputs (scoped to table tbody for desktop)
    this.tableRows = page.locator('.bill-scan-modal table tbody tr');
    this.rowCheckboxes = page.locator('.bill-scan-modal table tbody input.checkbox-input');
    this.rowItemNames = page.locator('.bill-scan-modal table tbody input.item-name-input');
    this.rowTypePills = page.locator('.bill-scan-modal table tbody button.type-pill');
    this.rowQuantities = page.locator('.bill-scan-modal table tbody input.cell-input.qty');
    this.rowUOMs = page.locator('.bill-scan-modal table tbody input.cell-input.uom');
    this.rowCosts = page.locator('.bill-scan-modal table tbody input.cell-input.cost');
    this.rowTaxes = page.locator('.bill-scan-modal table tbody input.cell-input.tax');
    this.rowDeleteButtons = page.locator('.bill-scan-modal table tbody button.delete-row-btn');

    // Totals & Actions
    this.subtotalValue = page.locator('.bill-scan-modal').getByText(/BILL SUBTOTAL:/i).locator('..');
    this.taxTotalValue = page.locator('.bill-scan-modal').getByText(/TAX TOTAL:/i).locator('..');
    this.grandTotalValue = page.locator('.bill-scan-modal').getByText(/ORDER GRAND TOTAL:/i).locator('..');
    this.detectedOnBillValue = page.locator('.bill-scan-modal').getByText(/Detected on Bill:/i);
    this.scanAnotherButton = page.locator('.bill-scan-modal button.btn-footer-back');
    this.loadIntoPoButton = page.locator('.bill-scan-modal button.btn-footer-apply');
    this.completeReceiveStockButton = page.locator('.bill-scan-modal button.btn-footer-direct');
  }

  async openModal() {
    await this.page.waitForSelector('.Purchasing_po-skeleton-wrapper__Bd0lT', { state: 'detached', timeout: 30000 }).catch(() => {});
    await this.triggerButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.triggerButton.click();
    await expect(this.modal).toBeVisible({ timeout: 15000 });
  }

  async closeModal() {
    await this.closeButton.click();
    await expect(this.modal).not.toBeVisible({ timeout: 5000 });
  }

  async uploadInvoiceImage(filePath: string) {
    const fileInput = this.fileInputs.last();
    await fileInput.setInputFiles(filePath);
    await expect(this.previewImage).toBeVisible({ timeout: 10000 });
  }

  async startAiScanAndWait(options: { expectSuccess?: boolean; timeout?: number } = {}) {
    const { expectSuccess = true, timeout = 60000 } = options;

    const [response] = await Promise.all([
      this.page.waitForResponse(
        res => res.url().includes('/api/ai/parse-purchase-bill'),
        { timeout }
      ),
      this.startAiScanButton.click(),
    ]);

    if (expectSuccess) {
      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      // Wait for review state to render
      await expect(this.loadIntoPoButton).toBeVisible({ timeout: 10000 });
      return json;
    } else {
      // Expect failure alert or 4xx/5xx status
      await this.page.waitForTimeout(2000);
      await expect(this.errorAlert).toBeVisible({ timeout: 10000 });
      return null;
    }
  }

  async selectSupplier(supplierName: string) {
    await this.supplierDropdownTrigger.click();
    await this.page.waitForTimeout(400);
    const option = this.page.locator('div, li, button').filter({ hasText: new RegExp(supplierName, 'i') }).first();
    if (await option.isVisible()) {
      await option.click();
    } else {
      // Select first available vendor
      const firstAvailable = this.page.locator('.nice-select-option, [role="option"]').nth(1);
      if (await firstAvailable.isVisible()) {
        await firstAvailable.click();
      }
    }
    await this.page.waitForTimeout(300);
  }

  async selectWarehouse(warehouseName: string) {
    await this.warehouseDropdownTrigger.click();
    await this.page.waitForTimeout(400);
    const option = this.page.locator('div, li, button').filter({ hasText: new RegExp(warehouseName, 'i') }).first();
    if (await option.isVisible()) {
      await option.click();
    }
    await this.page.waitForTimeout(300);
  }

  async toggleLineItemSelection(rowIndex: number) {
    await this.rowCheckboxes.nth(rowIndex).click();
    await this.page.waitForTimeout(300);
  }

  async editLineItem(rowIndex: number, data: ScannedLineItemData) {
    if (data.name !== undefined) {
      await this.rowItemNames.nth(rowIndex).fill(data.name);
    }
    if (data.qty !== undefined) {
      await this.rowQuantities.nth(rowIndex).fill(String(data.qty));
    }
    if (data.uom !== undefined) {
      await this.rowUOMs.nth(rowIndex).fill(data.uom);
    }
    if (data.cost !== undefined) {
      await this.rowCosts.nth(rowIndex).fill(String(data.cost));
    }
    if (data.tax !== undefined) {
      await this.rowTaxes.nth(rowIndex).fill(String(data.tax));
    }
    await this.page.waitForTimeout(300);
  }

  async toggleItemTypePill(rowIndex: number) {
    const pill = this.rowTypePills.nth(rowIndex);
    const prevClass = await pill.getAttribute('class');
    await pill.click();
    await this.page.waitForTimeout(300);
    const newClass = await pill.getAttribute('class');
    return { prevClass, newClass };
  }

  async deleteLineItem(rowIndex: number) {
    await this.rowDeleteButtons.nth(rowIndex).click();
    await this.page.waitForTimeout(500);
  }

  async addNewLine(data: ScannedLineItemData) {
    const countBefore = await this.rowItemNames.count();
    await this.addLineButton.click();
    await this.page.waitForTimeout(500);
    const countAfter = await this.rowItemNames.count();
    expect(countAfter).toBe(countBefore + 1);

    const newRowIndex = countAfter - 1;
    await this.editLineItem(newRowIndex, data);
  }

  async clickScanAnother() {
    await this.scanAnotherButton.click();
    await expect(this.startAiScanButton).toBeVisible({ timeout: 5000 });
  }

  async clickLoadIntoPo() {
    await this.loadIntoPoButton.click();
    await this.page.waitForTimeout(1000);
  }

  async clickCompleteReceiveStock() {
    await this.completeReceiveStockButton.click();
    await this.page.waitForTimeout(1500);
  }
}
