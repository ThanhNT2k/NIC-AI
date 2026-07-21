import assert from "node:assert/strict";
import test from "node:test";
import { canCustomerCancelRequest, canTransitionRequest, canTransitionWorkOrder, validBookingWindow } from "../dist-test/operations-policy.js";

test("request status transitions reject invalid jumps",()=>{
  assert.equal(canTransitionRequest("submitted","in_progress"),true);
  assert.equal(canTransitionRequest("submitted","resolved"),false);
  assert.equal(canTransitionRequest("cancelled","in_progress"),false);
});

test("customer cancellation stops once fulfillment starts",()=>{
  assert.equal(canCustomerCancelRequest("submitted"),true);
  assert.equal(canCustomerCancelRequest("triaged"),true);
  assert.equal(canCustomerCancelRequest("in_progress"),false);
  assert.equal(canCustomerCancelRequest("waiting_customer"),false);
  assert.equal(canCustomerCancelRequest("resolved"),false);
});

test("work order requires an explicit operational lifecycle",()=>{
  assert.equal(canTransitionWorkOrder("open","scheduled"),true);
  assert.equal(canTransitionWorkOrder("open","completed"),false);
  assert.equal(canTransitionWorkOrder("in_progress","completed"),true);
});

test("booking windows must be future, ordered and at most one day",()=>{
  assert.equal(validBookingWindow(2_000,3_000,1_000),true);
  assert.equal(validBookingWindow(2_000,2_000,1_000),false);
  assert.equal(validBookingWindow(2_000,90_000,1_000),false);
  assert.equal(validBookingWindow(500,1_500,1_000),false);
});
