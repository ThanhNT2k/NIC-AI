function integer(value, minimum, maximum, code) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
        throw new Error(code);
}
function roundedRatio(numerator, denominator) {
    return (numerator + denominator / 2n) / denominator;
}
export function procurementLineTotal(quantityMilli, unitPriceMinor) {
    integer(quantityMilli, 1, 1_000_000_000, "QUANTITY_INVALID");
    integer(unitPriceMinor, 0, 1_000_000_000_000, "UNIT_PRICE_INVALID");
    const value = roundedRatio(BigInt(quantityMilli) * BigInt(unitPriceMinor), 1000n);
    if (value > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error("LINE_TOTAL_OVERFLOW");
    return Number(value);
}
export function purchaseOrderApproval(totalMinor, thresholdMinor) {
    integer(totalMinor, 0, Number.MAX_SAFE_INTEGER, "TOTAL_INVALID");
    integer(thresholdMinor, 0, Number.MAX_SAFE_INTEGER, "THRESHOLD_INVALID");
    return totalMinor > thresholdMinor ? "pending_approval" : "approved";
}
export function remainingReceiptQuantity(orderedMilli, receivedMilli) {
    integer(orderedMilli, 1, Number.MAX_SAFE_INTEGER, "ORDERED_QUANTITY_INVALID");
    integer(receivedMilli, 0, Number.MAX_SAFE_INTEGER, "RECEIVED_QUANTITY_INVALID");
    if (receivedMilli > orderedMilli)
        throw new Error("RECEIPT_EXCEEDS_PO");
    return orderedMilli - receivedMilli;
}
export function threeWayMatch(lines, priceToleranceBps, quantityToleranceBps) {
    integer(priceToleranceBps, 0, 10_000, "PRICE_TOLERANCE_INVALID");
    integer(quantityToleranceBps, 0, 10_000, "QUANTITY_TOLERANCE_INVALID");
    if (lines.length === 0 || lines.length > 200)
        throw new Error("MATCH_LINES_INVALID");
    let varianceMinor = 0;
    const results = lines.map((line) => {
        integer(line.orderedQuantityMilli, 1, Number.MAX_SAFE_INTEGER, "ORDERED_QUANTITY_INVALID");
        integer(line.receivedQuantityMilli, 0, Number.MAX_SAFE_INTEGER, "RECEIVED_QUANTITY_INVALID");
        integer(line.invoicedQuantityMilli, 1, Number.MAX_SAFE_INTEGER, "INVOICE_QUANTITY_INVALID");
        integer(line.orderedUnitPriceMinor, 0, Number.MAX_SAFE_INTEGER, "ORDERED_PRICE_INVALID");
        integer(line.invoicedUnitPriceMinor, 0, Number.MAX_SAFE_INTEGER, "INVOICE_PRICE_INVALID");
        const quantityLimit = Number(roundedRatio(BigInt(line.receivedQuantityMilli) * BigInt(10_000 + quantityToleranceBps), 10000n));
        const priceLimit = Number(roundedRatio(BigInt(line.orderedUnitPriceMinor) * BigInt(10_000 + priceToleranceBps), 10000n));
        const quantityMatched = line.invoicedQuantityMilli <= quantityLimit;
        const priceMatched = line.invoicedUnitPriceMinor <= priceLimit;
        const expected = procurementLineTotal(line.invoicedQuantityMilli, line.orderedUnitPriceMinor);
        const invoiced = procurementLineTotal(line.invoicedQuantityMilli, line.invoicedUnitPriceMinor);
        const lineVarianceMinor = invoiced - expected;
        varianceMinor += Math.abs(lineVarianceMinor);
        return { purchaseOrderLineId: line.purchaseOrderLineId, quantityMatched, priceMatched, lineVarianceMinor, matched: quantityMatched && priceMatched };
    });
    return { status: results.every((line) => line.matched) ? "matched" : "exception", varianceMinor, lines: results };
}
export function canApprovePurchaseOrder(makerId, checkerId) {
    return Boolean(makerId && checkerId && makerId !== checkerId);
}
