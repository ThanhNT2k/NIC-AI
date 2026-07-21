import assert from "node:assert/strict";
import test from "node:test";
import { averageDurationSeconds, calculateCostLine, canCompleteEventTask, isMasterRecordEffective, maintenanceRunKey, nextMaintenanceDue, requiresBudgetApproval, slaAttainment } from "../dist-test/p2-operations-policy.js";

test("cost calculation uses integer minor units and deterministic rounding",()=>{
  assert.deepEqual(calculateCostLine({quantityMilli:1500,unitPriceMinor:10001,taxBps:1000,discountBps:500}),{subtotalMinor:15002,discountMinor:750,taxMinor:1425,totalMinor:15677});
  assert.throws(()=>calculateCostLine({quantityMilli:0,unitPriceMinor:1000}),/QUANTITY_INVALID/);
});

test("preventive maintenance recurrence and idempotency key are stable",()=>{
  assert.equal(nextMaintenanceDue(1_000_000,90),1_000_000+90*86_400);
  assert.equal(maintenanceRunKey("plan-1",1_000_000),"plan-1:1000000");
  assert.throws(()=>nextMaintenanceDue(1_000_000,0),/RECURRENCE_INVALID/);
});

test("event dependency, effective master data and approval threshold are enforced",()=>{
  assert.equal(canCompleteEventTask(null),true);
  assert.equal(canCompleteEventTask("pending"),false);
  assert.equal(canCompleteEventTask("completed"),true);
  assert.equal(requiresBudgetApproval(50_000_001,50_000_000),true);
  assert.equal(isMasterRecordEffective("approved",100,200,150),true);
  assert.equal(isMasterRecordEffective("draft",100,null,150),false);
});

test("KPI formulas use explicit denominators and empty datasets",()=>{
  assert.equal(slaAttainment(9,1),90);
  assert.equal(slaAttainment(0,0),null);
  assert.equal(averageDurationSeconds([100,200,301]),200);
  assert.equal(averageDurationSeconds([]),null);
});
