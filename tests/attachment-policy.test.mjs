import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ATTACHMENT_BYTES, safeAttachmentName, validateAttachment } from "../dist-test/attachment-policy.js";

test("attachment validation accepts matching safe formats", () => {
  assert.equal(validateAttachment({ bytes:new TextEncoder().encode("ghi chú vận hành"),declaredType:"text/plain" }).ok,true);
  assert.equal(validateAttachment({ bytes:Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),declaredType:"image/png" }).ok,true);
  assert.equal(MAX_ATTACHMENT_BYTES,8*1024*1024);
  assert.equal(safeAttachmentName("../bien-ban.pdf"),"..-bien-ban.pdf");
});

test("attachment validation rejects spoofed and active content", () => {
  assert.equal(validateAttachment({ bytes:new TextEncoder().encode("not a pdf"),declaredType:"application/pdf" }).error,"ATTACHMENT_CONTENT_MISMATCH");
  assert.equal(validateAttachment({ bytes:new TextEncoder().encode("%PDF-1.7 /OpenAction"),declaredType:"application/pdf" }).error,"ATTACHMENT_ACTIVE_CONTENT");
  assert.equal(validateAttachment({ bytes:Uint8Array.from([0x4d,0x5a,0,0]),declaredType:"text/plain" }).error,"ATTACHMENT_CONTENT_MISMATCH");
});
