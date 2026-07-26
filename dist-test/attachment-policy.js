export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);
function startsWith(bytes, signature) {
    return signature.every((value, index) => bytes[index] === value);
}
export function safeAttachmentName(value) {
    const normalized = value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]+/g, "-").replace(/\s+/g, " ").trim();
    return (normalized || "tep-dinh-kem").slice(0, 160);
}
export function validateAttachment(input) {
    const { bytes, declaredType } = input;
    if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES)
        return { ok: false, error: "ATTACHMENT_SIZE_INVALID" };
    if (!allowedTypes.has(declaredType))
        return { ok: false, error: "ATTACHMENT_TYPE_UNSUPPORTED" };
    const isPdf = startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    const isPng = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isJpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
    const matchesType = declaredType === "application/pdf" ? isPdf : declaredType === "image/png" ? isPng : declaredType === "image/jpeg" ? isJpeg : !bytes.includes(0);
    if (!matchesType)
        return { ok: false, error: "ATTACHMENT_CONTENT_MISMATCH" };
    const inspection = new TextDecoder("latin1").decode(bytes);
    if (/X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE/i.test(inspection))
        return { ok: false, error: "ATTACHMENT_THREAT_DETECTED" };
    if (declaredType === "application/pdf" && /\/(JavaScript|JS|OpenAction|Launch)\b/i.test(inspection))
        return { ok: false, error: "ATTACHMENT_ACTIVE_CONTENT" };
    return { ok: true };
}
