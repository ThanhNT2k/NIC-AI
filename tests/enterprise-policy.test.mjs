import assert from "node:assert/strict";
import test from "node:test";
import { hasMfaClaim, redactForLog, requiresEnterpriseMfa, retentionCutoff, safeReturnTo } from "../dist-test/enterprise-policy.js";

test("enterprise return targets remain same-origin paths",()=>{
  assert.equal(safeReturnTo("/portal/procurement"),"/portal/procurement");
  assert.equal(safeReturnTo("https://evil.example"),"/portal");
  assert.equal(safeReturnTo("//evil.example"),"/portal");
});

test("privileged roles require a recognized MFA claim",()=>{
  assert.equal(requiresEnterpriseMfa("finance_manager"),true);
  assert.equal(requiresEnterpriseMfa("customer_member"),false);
  assert.equal(hasMfaClaim(["fido","webauthn"]),true);
  assert.equal(hasMfaClaim(["sms"]),false);
});

test("structured logging redacts secrets and PII by key",()=>{
  assert.deepEqual(redactForLog({route:"/api",authorization:"credential-placeholder",nested:{email:"person@example.com",count:2}}),{route:"/api",authorization:"[REDACTED]",nested:{email:"[REDACTED]",count:2}});
});

test("retention cutoff is deterministic and bounded",()=>{
  assert.equal(retentionCutoff(10_000_000,30),10_000_000-30*86_400);
  assert.throws(()=>retentionCutoff(10_000_000,0),/RETENTION_POLICY_INVALID/);
});
