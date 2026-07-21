import assert from "node:assert/strict";
import test from "node:test";
import { addBusinessMinutes, canApproveOwnChange, canRequestWorkOrderClosure, escalationKey, hasRequiredSkills, nextProviderResponseVersion, overlaps } from "../dist-test/p1-operations-policy.js";

test("mandatory tasks gate closure and maker cannot self-approve",()=>{
  assert.equal(canRequestWorkOrderClosure([{required:true,status:"pending"}]),false);
  assert.equal(canRequestWorkOrderClosure([{required:true,status:"completed"},{required:false,status:"pending"}]),true);
  assert.equal(canApproveOwnChange("maker","maker"),false);
  assert.equal(canApproveOwnChange("maker","checker"),true);
});

test("business deadline skips weekend",()=>{
  const windows=[1,2,3,4,5].map(weekday=>({weekday,startsMinute:8*60,endsMinute:17*60}));
  const friday=Date.parse("2026-07-24T09:00:00+07:00")/1000;
  assert.equal(addBusinessMinutes(friday,8*60,windows,new Set()),Date.parse("2026-07-27T08:00:00+07:00")/1000);
});

test("resource, escalation and provider policies are deterministic",()=>{
  assert.equal(hasRequiredSkills(["hvac","electrical"],["electrical","hvac"]),true);
  assert.equal(hasRequiredSkills(["hvac"],["electrical"]),false);
  assert.equal(overlaps(10,20,19,30),true);
  assert.equal(overlaps(10,20,20,30),false);
  assert.equal(escalationKey("sla-1","warning",100),"sla-1:warning:100");
  assert.deepEqual(nextProviderResponseVersion(2,"accept_with_change"),{version:3,requiresNicConfirmation:true});
});
