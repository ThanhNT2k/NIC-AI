import { currentUser, database } from "@/lib/d1-auth";
import { recordDiagnostic } from "@/lib/diagnostics";
import { observedJson, requestContext } from "@/lib/observability";

type ChatTurn = { role: "user" | "assistant"; text: string };
type CopilotReply = { answer: string; sources: string[]; suggestedService?: "space_booking" | "support" | "event_registration" | "access_card" };
type KnowledgeDocument = { serviceType: CopilotReply["suggestedService"]; title: string; content: string; sourceUri: string; version: number };
type Grounding = { documents: KnowledgeDocument[]; availability: string | null };

const knowledge = {
  space_booking: { sources: ["Danh mục không gian NIC", "Quy trình đặt chỗ"], answer: "Để chọn không gian phù hợp, cần biết ngày, giờ bắt đầu/kết thúc, số người và thiết bị cần dùng. Với nhóm khoảng 20 người, phòng hội thảo nhỏ hoặc không gian làm việc chung thường phù hợp." },
  access_card: { sources: ["Hướng dẫn thẻ và quyền ra vào"], answer: "Đăng ký khách hoặc thẻ ra vào cần họ tên, thông tin liên hệ, ngày hiệu lực và loại quyền cần cấp. Nên đăng ký trước thời điểm sử dụng để bộ phận vận hành kiểm tra." },
  support: { sources: ["Danh mục hỗ trợ vận hành"], answer: "Yêu cầu hỗ trợ cần nêu nhóm vấn đề, mức độ ưu tiên, vị trí và thời gian mong muốn. Nếu là sự cố đang ảnh hưởng hoạt động, hãy mô tả tác động để bộ phận vận hành phân loại đúng." },
  event_registration: { sources: ["Hướng dẫn đăng ký sự kiện"], answer: "Đăng ký sự kiện cần tên sự kiện, ngày tham dự, số người và vai trò của đoàn. Các nhu cầu hỗ trợ đặc biệt nên được ghi rõ trong phần thông tin bổ sung." },
} as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

async function retrieveGrounding(message: string): Promise<Grounding> {
  const db = await database(), normalized = normalize(message), terms = [...new Set(normalized.split(" ").filter(term=>term.length>2))].slice(0,20);
  const documents = (await db.prepare("SELECT service_type AS serviceType,title,content,source_uri AS sourceUri,version FROM knowledge_documents WHERE status='active' ORDER BY updated_at DESC LIMIT 100").all<KnowledgeDocument>()).results;
  const ranked = documents.map(document=>({document,score:terms.reduce((score,term)=>score+(normalize(`${document.title} ${document.content}`).includes(term)?1:0),0)})).sort((a,b)=>b.score-a.score);
  const selected = ranked.filter(item=>item.score>0).slice(0,3).map(item=>item.document);
  const relevant = selected.length ? selected : documents.slice(0,2);
  const people = Number(normalized.match(/\b(\d{1,4})\s*(?:nguoi|khach|cho)\b/)?.[1] ?? 0);
  let availability: string | null = null;
  if ((relevant[0]?.serviceType === "space_booking" || /phong|khong gian|dat cho/.test(normalized)) && people > 0) {
    const spaces = (await db.prepare("SELECT name,location,capacity FROM spaces WHERE status='active' AND capacity>=? ORDER BY capacity LIMIT 3").bind(people).all<{name:string;location:string;capacity:number}>()).results;
    availability = spaces.length ? `Không gian đủ sức chứa ${people} người: ${spaces.map(space=>`${space.name} (${space.capacity}, ${space.location})`).join("; ")}. Cần ngày và khung giờ để kiểm tra xung đột lịch.` : `Chưa có không gian active đủ sức chứa ${people} người.`;
  }
  return {documents:relevant,availability};
}

function groundedFallback(message:string,history:ChatTurn[],grounding:Grounding):CopilotReply {
  const base=localUnderstanding(message,history),best=grounding.documents[0];
  if(!best)return base;
  return {answer:[best.content,grounding.availability].filter(Boolean).join(" "),sources:grounding.documents.map(document=>`${document.title} · v${document.version} · ${document.sourceUri}`),suggestedService:best.serviceType};
}

function localUnderstanding(message: string, history: ChatTurn[]): CopilotReply {
  const context = normalize([...history.slice(-4).map(turn => turn.text), message].join(" "));
  const intents: Array<[keyof typeof knowledge, string[]]> = [
    ["space_booking", ["phong", "khong gian", "dat cho", "cho ngoi", "bao nhieu nguoi", "hoi thao", "hop", "con trong", "dia diem"]],
    ["access_card", ["khach", "ra vao", "the", "bao mat", "cap lai", "gia han", "quyen truy cap"]],
    ["support", ["ho tro", "thiet bi", "ky thuat", "su co", "hong", "khong hoat dong", "can nguoi", "bao tri"]],
    ["event_registration", ["su kien", "workshop", "tham du", "dang ky chuong trinh", "dien gia", "trien lam"]],
  ];
  const ranked = intents.map(([intent, phrases]) => ({ intent, score: phrases.reduce((score, phrase) => score + (context.includes(phrase) ? phrase.split(" ").length : 0), 0) })).sort((a, b) => b.score - a.score);
  if (ranked[0].score > 0) { const intent = ranked[0].intent; return { ...knowledge[intent], suggestedService: intent }; }
  if (/xin chao|chao ban|hello|hi\b/.test(context)) return { answer: "Chào bạn. Bạn có thể mô tả nhu cầu theo cách tự nhiên, ví dụ số người, thời gian hoặc vấn đề đang gặp. Tôi sẽ giúp xác định đúng dịch vụ và chuẩn bị bước tiếp theo.", sources: ["Trung tâm trợ giúp NIC"] };
  return { answer: "Tôi chưa đủ thông tin để xác định đúng nhu cầu. Bạn đang muốn đặt không gian, đăng ký sự kiện, làm thẻ ra vào hay cần hỗ trợ vận hành? Bạn có thể trả lời bằng một câu ngắn theo cách của mình.", sources: ["Trung tâm trợ giúp NIC"] };
}

async function languageModelUnderstanding(message: string, history: ChatTurn[], grounding: Grounding): Promise<CopilotReply | null> {
  const { env } = await import("cloudflare:workers") as unknown as { env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };
  if (!env.GEMINI_API_KEY) return null;
  const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!/^[a-z0-9._-]+$/i.test(model)) throw new Error("Invalid Gemini model name");
  const requestBody = {
    systemInstruction: { parts: [{ text: `Bạn là NIC Copilot, trợ lý tiếng Việt cho cổng dịch vụ Trung tâm Đổi mới sáng tạo Quốc gia. Hiểu cách diễn đạt tự nhiên, lỗi chính tả nhẹ và tham chiếu theo ngữ cảnh. Chỉ được: giải thích hướng dẫn, xác định một trong bốn dịch vụ, hoặc đề xuất mở form để người dùng tự kiểm tra. Không được tuyên bố đã đặt chỗ, đã gửi, đã phê duyệt; không được tự submit. Chỉ dùng nguồn trong KNOWLEDGE. Nếu thiếu dữ kiện, hỏi đúng một câu làm rõ. Trả lời ngắn, cụ thể bằng tiếng Việt.

KNOWLEDGE RETRIEVED FROM DATABASE:
${grounding.documents.map(document=>`[${document.serviceType}] ${document.title} v${document.version} (${document.sourceUri}): ${document.content}`).join("\n")}
${grounding.availability ? `AVAILABILITY CHECK: ${grounding.availability}` : ""}`,
    } ] },
    contents: [...history.slice(-8).map(turn => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] })), { role: "user", parts: [{ text: message }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", additionalProperties: false, properties: { answer: { type: "string" }, sources: { type: "array", items: { type: "string" } }, suggestedService: { type: ["string", "null"], enum: ["space_booking", "support", "event_registration", "access_card", null] } }, required: ["answer", "sources", "suggestedService"] } },
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify(requestBody) });
  if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const outputText = result.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("");
  if (!outputText) throw new Error("Gemini API returned no text");
  const parsed = JSON.parse(outputText) as CopilotReply & { suggestedService?: CopilotReply["suggestedService"] | null };
  const allowedSources=new Set(grounding.documents.map(document=>`${document.title} · v${document.version} · ${document.sourceUri}`));
  const sources=parsed.sources.filter(source=>allowedSources.has(source));
  return { answer: parsed.answer, sources:sources.length?sources:[...allowedSources], ...(parsed.suggestedService ? { suggestedService: parsed.suggestedService } : {}) };
}

export async function POST(request: Request) {
  const ctx=requestContext(request);
  const user = await currentUser(request);
  if (!user) return observedJson({ error: "AUTH_REQUIRED" },401,ctx.correlationId,ctx.traceId);
  const body = await request.json().catch(() => null) as { message?: string; history?: ChatTurn[] } | null;
  const message = body?.message?.trim().slice(0, 500) ?? "";
  const history = Array.isArray(body?.history) ? body.history.filter(turn => (turn.role === "user" || turn.role === "assistant") && typeof turn.text === "string").slice(-8).map(turn => ({ role: turn.role, text: turn.text.slice(0, 500) })) : [];
  if (!message) return observedJson({ error: "EMPTY_MESSAGE" },400,ctx.correlationId,ctx.traceId);
  let grounding:Grounding;
  try { grounding=await retrieveGrounding(message); }
  catch(error){const db=await database();const report=await recordDiagnostic(db,{error,correlationId:ctx.correlationId,traceId:ctx.traceId,route:"/api/copilot",actorId:user.id});return observedJson({...localUnderstanding(message,history),diagnosticId:report.id},200,ctx.correlationId,ctx.traceId)}
  try {
    const modelReply = await languageModelUnderstanding(message, history, grounding);
    return observedJson(modelReply ?? groundedFallback(message,history,grounding),200,ctx.correlationId,ctx.traceId);
  } catch (error) {
    const db=await database();const report=await recordDiagnostic(db,{error,correlationId:ctx.correlationId,traceId:ctx.traceId,route:"/api/copilot",actorId:user.id});
    return observedJson({...groundedFallback(message,history,grounding),diagnosticId:report.id},200,ctx.correlationId,ctx.traceId);
  }
}
