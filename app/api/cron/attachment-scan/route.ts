import { database } from "@/lib/d1-auth";
import { scanAttachment } from "@/lib/malware-scanner";
import { attachmentStorage } from "@/lib/attachment-storage";

type ScanRow={id:string;requestId:string;uploadedBy:string;objectKey:string;contentType:string;sha256:string;scanAttempts:number};

export async function POST(request:Request){
  const secret=process.env.ATTACHMENT_SCAN_CRON_SECRET;
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"CRON_UNAUTHORIZED"},{status:401});
  const storage=await attachmentStorage().catch(()=>null);
  if(!storage)return Response.json({error:"ATTACHMENT_STORAGE_UNAVAILABLE"},{status:503});
  const db=await database(),now=Math.floor(Date.now()/1000);
  const rows=(await db.prepare("SELECT id,request_id AS requestId,uploaded_by AS uploadedBy,object_key AS objectKey,content_type AS contentType,sha256,scan_attempts AS scanAttempts FROM request_attachments WHERE validation_status='quarantined' AND scan_attempts<5 ORDER BY created_at LIMIT 20").all<ScanRow>()).results;
  let clean=0,infected=0,deferred=0;
  for(const item of rows){
    const claim=await db.prepare("UPDATE request_attachments SET scan_attempts=scan_attempts+1,last_scan_error=NULL WHERE id=? AND validation_status='quarantined' AND scan_attempts=?").bind(item.id,item.scanAttempts).run();
    if(!claim.meta.changes)continue;
    try{
      const object=await storage.get(item.objectKey);
      if(!object)throw new Error("OBJECT_NOT_FOUND");
      const bytes=new Uint8Array(await object.arrayBuffer());
      const verdict=await scanAttachment(bytes,{attachmentId:item.id,contentType:item.contentType,sha256:item.sha256});
      if(verdict.verdict==="clean"){
        await db.batch([
          db.prepare("UPDATE request_attachments SET validation_status='validated',scanned_at=?,last_scan_error=NULL WHERE id=? AND validation_status='quarantined'").bind(now,item.id),
          db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),item.uploadedBy,"request.attachment_validated","service_request",item.requestId,JSON.stringify({attachmentId:item.id,sha256:item.sha256}),now),
          db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING").bind(crypto.randomUUID(),item.uploadedBy,"attachment_validated","service_request",item.requestId,`attachment-validated:${item.id}`,"Tệp đính kèm đã sẵn sàng","Tệp đã qua kiểm tra an toàn và có thể tải xuống.",now),
        ]);clean+=1;
      }else{
        await storage.delete(item.objectKey);
        await db.batch([
          db.prepare("UPDATE request_attachments SET validation_status='rejected',scanned_at=?,last_scan_error='THREAT_DETECTED' WHERE id=? AND validation_status='quarantined'").bind(now,item.id),
          db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),item.uploadedBy,"request.attachment_rejected","service_request",item.requestId,JSON.stringify({attachmentId:item.id,signature:verdict.signature??null}),now),
          db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING").bind(crypto.randomUUID(),item.uploadedBy,"attachment_rejected","service_request",item.requestId,`attachment-rejected:${item.id}`,"Tệp đính kèm bị từ chối","Hệ thống phát hiện nội dung không an toàn; object đã bị xóa.",now),
        ]);infected+=1;
      }
    }catch(error){
      const code=error instanceof Error?error.message.slice(0,100):"SCAN_FAILED";
      await db.prepare("UPDATE request_attachments SET last_scan_error=? WHERE id=? AND validation_status='quarantined'").bind(code,item.id).run();deferred+=1;
    }
  }
  const exhausted=(await db.prepare("SELECT id,request_id AS requestId,last_scan_error AS lastError FROM request_attachments WHERE validation_status='quarantined' AND scan_attempts>=5").all<{id:string;requestId:string;lastError:string|null}>()).results;
  for(const item of exhausted)await db.batch([
    db.prepare("INSERT INTO operational_incidents (id,correlation_id,severity,title,status,runbook,dedupe_key,created_at) VALUES (?,?,? ,?,'open',?,?,?) ON CONFLICT(dedupe_key) DO NOTHING").bind(crypto.randomUUID(),crypto.randomUUID(),"warning","Attachment scan vượt quá số lần thử","docs/attachment-malware-scanning.md",`attachment-scan-exhausted:${item.id}`,now),
    db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) SELECT lower(hex(randomblob(16))),id,'attachment_scan_failed','service_request',?,'attachment-scan-failed:'||?||':'||id,'Quét tệp đính kèm cần xử lý',?,? FROM users WHERE role='system_admin' ON CONFLICT(dedupe_key) DO NOTHING").bind(item.requestId,item.id,`Attachment ${item.id} · ${item.lastError??"SCAN_FAILED"}`,now),
  ]);
  return Response.json({processed:rows.length,clean,infected,deferred,exhausted:exhausted.length,ranAt:now});
}
