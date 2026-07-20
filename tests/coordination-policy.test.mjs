import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionEventService, canTransitionVisitor } from "../dist-test/coordination-policy.js";

test("visitor lifecycle requires approval before check-in",()=>{
  assert.equal(canTransitionVisitor("pending","approved"),true);
  assert.equal(canTransitionVisitor("pending","checked_in"),false);
  assert.equal(canTransitionVisitor("checked_in","checked_out"),true);
});

test("event service lifecycle requires coordination before confirmation",()=>{
  assert.equal(canTransitionEventService("requested","coordinating"),true);
  assert.equal(canTransitionEventService("requested","completed"),false);
  assert.equal(canTransitionEventService("confirmed","completed"),true);
});
