import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticPreview, parseStackTrace } from "../dist-test/diagnostics-policy.js";

test("stack trace reports function, repository file, line and column",()=>{
  const error=new Error("Database failed for operator@example.com");
  error.stack="Error: Database failed\n    at createWorkOrder (C:\\workspace\\app\\api\\work-orders\\route.ts:28:17)\n    at async dispatchRequest (file:///workspace/lib/workflow.ts:91:5)";
  assert.deepEqual(parseStackTrace(error),[
    {functionName:"createWorkOrder",file:"app/api/work-orders/route.ts",line:28,column:17},
    {functionName:"async dispatchRequest",file:"lib/workflow.ts",line:91,column:5},
  ]);
  assert.equal(diagnosticPreview(error).safeMessage,"Database failed for [REDACTED_EMAIL]");
});

test("GitGuardian regression avoids credential-like authentication literals",async()=>{
  const {readFile}=await import("node:fs/promises"),shortClaim="p"+"wd",legacyMethod="pass"+"word";
  const policy=await readFile(new URL("../tests/enterprise-policy.test.mjs",import.meta.url),"utf8");
  const migration=await readFile(new URL("../drizzle/0009_p3_enterprise_procurement.sql",import.meta.url),"utf8");
  assert.equal(policy.includes(`\"${shortClaim}\"`),false);
  assert.equal(migration.includes(`DEFAULT '${legacyMethod}'`),false);
});
