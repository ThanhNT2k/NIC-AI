import assert from "node:assert/strict";
import test from "node:test";
import { canApprovePurchaseOrder, procurementLineTotal, purchaseOrderApproval, remainingReceiptQuantity, threeWayMatch } from "../dist-test/procurement-policy.js";

test("procurement money and approval threshold use deterministic integers",()=>{
  assert.equal(procurementLineTotal(1500,10001),15002);
  assert.equal(purchaseOrderApproval(50_000_000,50_000_000),"approved");
  assert.equal(purchaseOrderApproval(50_000_001,50_000_000),"pending_approval");
  assert.throws(()=>procurementLineTotal(0,100),/QUANTITY_INVALID/);
});

test("receipt cannot exceed ordered quantity",()=>{
  assert.equal(remainingReceiptQuantity(1000,650),350);
  assert.throws(()=>remainingReceiptQuantity(1000,1001),/RECEIPT_EXCEEDS_PO/);
});

test("three-way match applies price and quantity tolerances per line",()=>{
  const base={purchaseOrderLineId:"line-1",orderedQuantityMilli:1000,receivedQuantityMilli:1000,invoicedQuantityMilli:1000,orderedUnitPriceMinor:10000};
  assert.equal(threeWayMatch([{...base,invoicedUnitPriceMinor:10499}],500,0).status,"matched");
  const exception=threeWayMatch([{...base,invoicedQuantityMilli:1001,invoicedUnitPriceMinor:10501}],500,0);
  assert.equal(exception.status,"exception");
  assert.equal(exception.lines[0].matched,false);
});

test("purchase order approval enforces maker-checker",()=>{
  assert.equal(canApprovePurchaseOrder("maker","checker"),true);
  assert.equal(canApprovePurchaseOrder("maker","maker"),false);
});
