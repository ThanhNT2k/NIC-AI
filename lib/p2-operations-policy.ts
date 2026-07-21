export type CostLineInput = {
  quantityMilli: number;
  unitPriceMinor: number;
  taxBps?: number;
  discountBps?: number;
};

function assertInteger(value: number, minimum: number, maximum: number, code: string) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(code);
}

function roundRatio(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / 2n) / denominator;
}

export function calculateCostLine(input: CostLineInput) {
  const taxBps = input.taxBps ?? 0;
  const discountBps = input.discountBps ?? 0;
  assertInteger(input.quantityMilli, 1, 1_000_000_000, "QUANTITY_INVALID");
  assertInteger(input.unitPriceMinor, 0, 1_000_000_000_000, "UNIT_PRICE_INVALID");
  assertInteger(taxBps, 0, 10_000, "TAX_INVALID");
  assertInteger(discountBps, 0, 10_000, "DISCOUNT_INVALID");
  const subtotal = roundRatio(BigInt(input.quantityMilli) * BigInt(input.unitPriceMinor), 1_000n);
  const discount = roundRatio(subtotal * BigInt(discountBps), 10_000n);
  const taxable = subtotal - discount;
  const tax = roundRatio(taxable * BigInt(taxBps), 10_000n);
  const total = taxable + tax;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("TOTAL_OVERFLOW");
  return { subtotalMinor: Number(subtotal), discountMinor: Number(discount), taxMinor: Number(tax), totalMinor: Number(total) };
}

export function nextMaintenanceDue(currentDueAt: number, recurrenceDays: number) {
  assertInteger(currentDueAt, 1, Number.MAX_SAFE_INTEGER, "DUE_AT_INVALID");
  assertInteger(recurrenceDays, 1, 3_650, "RECURRENCE_INVALID");
  return currentDueAt + recurrenceDays * 86_400;
}

export function maintenanceRunKey(planId: string, dueAt: number) {
  if (!planId.trim() || !Number.isSafeInteger(dueAt) || dueAt < 1) throw new Error("RUN_KEY_INVALID");
  return `${planId}:${dueAt}`;
}

export function canCompleteEventTask(dependencyStatus: string | null) {
  return dependencyStatus === null || dependencyStatus === "completed";
}

export function requiresBudgetApproval(estimateMinor: number, thresholdMinor: number) {
  assertInteger(estimateMinor, 0, Number.MAX_SAFE_INTEGER, "BUDGET_INVALID");
  assertInteger(thresholdMinor, 0, Number.MAX_SAFE_INTEGER, "THRESHOLD_INVALID");
  return estimateMinor > thresholdMinor;
}

export function isMasterRecordEffective(status: string, effectiveFrom: number, effectiveTo: number | null, at: number) {
  return status === "approved" && effectiveFrom <= at && (effectiveTo === null || effectiveTo > at);
}

export function slaAttainment(met: number, failed: number) {
  assertInteger(met, 0, Number.MAX_SAFE_INTEGER, "KPI_INVALID");
  assertInteger(failed, 0, Number.MAX_SAFE_INTEGER, "KPI_INVALID");
  const measured = met + failed;
  return measured === 0 ? null : Math.round((met / measured) * 10_000) / 100;
}

export function averageDurationSeconds(durations: readonly number[]) {
  if (durations.length === 0) return null;
  if (durations.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error("DURATION_INVALID");
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}
