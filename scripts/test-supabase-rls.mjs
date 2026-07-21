import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!publishableKey||!serviceKey)throw new Error("Thiếu cấu hình Supabase staging.");

const timedFetch=(input,init={})=>fetch(input,{...init,signal:AbortSignal.timeout(20_000)});
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}});
const runId=randomUUID().slice(0,8),password=`Stg-${randomBytes(18).toString("base64url")}!9a`;
const organizationA=randomUUID(),organizationB=randomUUID(),organizationNic=randomUUID();
const users=[];
const ids={draftA:randomUUID(),draftB:randomUUID(),requestA:randomUUID(),requestB:randomUUID(),commentA:randomUUID(),commentB:randomUUID(),attachmentA:randomUUID(),attachmentB:randomUUID(),quarantined:randomUUID()};

async function must(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
async function createUser(label){
  const email=`nic-rls-${label}-${runId}@example.invalid`;
  const data=await must(await admin.auth.admin.createUser({email,password,email_confirm:true}),`create ${label}`);
  users.push(data.user.id);return{email,id:data.user.id};
}
function client(){return createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}});}
async function login(identity){const value=client();await must(await value.auth.signInWithPassword({email:identity.email,password}),`login ${identity.email}`);return value;}
async function idsFrom(value,table){const data=await must(await value.from(table).select("id"),`select ${table}`);return data.map(item=>item.id).sort();}

try{
  const customerA=await createUser("customer-a"),customerB=await createUser("customer-b"),facility=await createUser("facility"),event=await createUser("event");
  await must(await admin.from("organizations").insert([{id:organizationA,code:`A-${runId}`,name:"RLS Tenant A"},{id:organizationB,code:`B-${runId}`,name:"RLS Tenant B"},{id:organizationNic,code:`NIC-${runId}`,name:"RLS NIC Operations"}]),"seed organizations");
  await must(await admin.from("app_profiles").insert([customerA,customerB,facility,event].map(user=>({user_id:user.id,display_name:user.email,account_status:"active"}))),"seed profiles");
  await must(await admin.from("organization_memberships").insert([
    {organization_id:organizationA,user_id:customerA.id,role:"customer_admin",status:"active"},
    {organization_id:organizationB,user_id:customerB.id,role:"customer_admin",status:"active"},
    {organization_id:organizationNic,user_id:facility.id,role:"facility_manager",status:"active"},
    {organization_id:organizationNic,user_id:event.id,role:"event_manager",status:"active"},
  ]),"seed memberships");
  await must(await admin.from("request_drafts").insert([
    {id:ids.draftA,owner_id:customerA.id,request_type:"facility",payload:{title:"A"},status:"submitted"},
    {id:ids.draftB,owner_id:customerB.id,request_type:"facility",payload:{title:"B"},status:"submitted"},
  ]),"seed drafts");
  await must(await admin.from("service_requests").insert([
    {id:ids.requestA,draft_id:ids.draftA,owner_id:customerA.id,organization_id:organizationA,service_type:"support",title:"Request A",details:"Tenant A",target_department:"facility",requester_role:"customer_admin",visibility:"organization",idempotency_key:`a-${runId}`},
    {id:ids.requestB,draft_id:ids.draftB,owner_id:customerB.id,organization_id:organizationB,service_type:"support",title:"Request B",details:"Tenant B",target_department:"facility",requester_role:"customer_admin",visibility:"organization",idempotency_key:`b-${runId}`},
  ]),"seed requests");
  await must(await admin.from("request_comments").insert([{id:ids.commentA,request_id:ids.requestA,author_id:customerA.id,body:"Comment A"},{id:ids.commentB,request_id:ids.requestB,author_id:customerB.id,body:"Comment B"}]),"seed comments");
  await must(await admin.from("request_attachments").insert([
    {id:ids.attachmentA,request_id:ids.requestA,uploaded_by:customerA.id,object_key:`rls/${runId}/a`,original_name:"a.txt",content_type:"text/plain",size_bytes:1,sha256:"a".repeat(64),validation_status:"validated"},
    {id:ids.attachmentB,request_id:ids.requestB,uploaded_by:customerB.id,object_key:`rls/${runId}/b`,original_name:"b.txt",content_type:"text/plain",size_bytes:1,sha256:"b".repeat(64),validation_status:"validated"},
    {id:ids.quarantined,request_id:ids.requestA,uploaded_by:customerA.id,object_key:`rls/${runId}/q`,original_name:"q.txt",content_type:"text/plain",size_bytes:1,sha256:"c".repeat(64),validation_status:"quarantined"},
  ]),"seed attachments");

  const a=await login(customerA),b=await login(customerB),facilityClient=await login(facility),eventClient=await login(event);
  assert.deepEqual(await idsFrom(a,"service_requests"),[ids.requestA]);
  assert.deepEqual(await idsFrom(b,"service_requests"),[ids.requestB]);
  assert.deepEqual(await idsFrom(a,"request_comments"),[ids.commentA]);
  assert.deepEqual(await idsFrom(a,"request_attachments"),[ids.attachmentA]);
  assert.deepEqual(await idsFrom(facilityClient,"service_requests"),[ids.requestA,ids.requestB].sort());
  assert.deepEqual(await idsFrom(eventClient,"service_requests"),[]);
  const directWrite=await a.from("request_comments").insert({request_id:ids.requestA,author_id:customerA.id,body:"Must fail"});
  assert.ok(directWrite.error,"Authenticated direct write must be rejected");
  const anonymous=client();
  assert.deepEqual(await idsFrom(anonymous,"service_requests"),[]);
  console.log("Supabase staging RLS isolation: PASS");
}finally{
  await admin.from("request_attachments").delete().in("id",[ids.attachmentA,ids.attachmentB,ids.quarantined]);
  await admin.from("request_comments").delete().in("id",[ids.commentA,ids.commentB]);
  await admin.from("service_requests").delete().in("id",[ids.requestA,ids.requestB]);
  await admin.from("request_drafts").delete().in("id",[ids.draftA,ids.draftB]);
  await admin.from("organization_memberships").delete().in("user_id",users);
  await admin.from("app_profiles").delete().in("user_id",users);
  await admin.from("organizations").delete().in("id",[organizationA,organizationB,organizationNic]);
  await Promise.all(users.map(id=>admin.auth.admin.deleteUser(id)));
}
