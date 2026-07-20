import { currentUser } from "@/lib/d1-auth";

type ChatTurn = { role: "user" | "assistant"; text: string };
type CopilotReply = { answer: string; sources: string[]; suggestedService?: "space_booking" | "support" | "event_registration" | "access_card" };

const knowledge = {
  space_booking: { sources: ["Danh mục không gian NIC", "Quy trình đặt chỗ"], answer: "Để chọn không gian phù hợp, cần biết ngày, giờ bắt đầu/kết thúc, số người và thiết bị cần dùng. Với nhóm khoảng 20 người, phòng hội thảo nhỏ hoặc không gian làm việc chung thường phù hợp." },
  access_card: { sources: ["Hướng dẫn thẻ và quyền ra vào"], answer: "Đăng ký khách hoặc thẻ ra vào cần họ tên, thông tin liên hệ, ngày hiệu lực và loại quyền cần cấp. Nên đăng ký trước thời điểm sử dụng để bộ phận vận hành kiểm tra." },
  support: { sources: ["Danh mục hỗ trợ vận hành"], answer: "Yêu cầu hỗ trợ cần nêu nhóm vấn đề, mức độ ưu tiên, vị trí và thời gian mong muốn. Nếu là sự cố đang ảnh hưởng hoạt động, hãy mô tả tác động để bộ phận vận hành phân loại đúng." },
  event_registration: { sources: ["Hướng dẫn đăng ký sự kiện"], answer: "Đăng ký sự kiện cần tên sự kiện, ngày tham dự, số người và vai trò của đoàn. Các nhu cầu hỗ trợ đặc biệt nên được ghi rõ trong phần thông tin bổ sung." },
} as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

async function languageModelUnderstanding(message: string, history: ChatTurn[]): Promise<CopilotReply | null> {
  const { env } = await import("cloudflare:workers") as unknown as { env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };
  if (!env.GEMINI_API_KEY) return null;
  const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!/^[a-z0-9._-]+$/i.test(model)) throw new Error("Invalid Gemini model name");
  const requestBody = {
    systemInstruction: { parts: [{ text: `Bạn là NIC Copilot, trợ lý tiếng Việt cho cổng dịch vụ Trung tâm Đổi mới sáng tạo Quốc gia. Hiểu cách diễn đạt tự nhiên, lỗi chính tả nhẹ và tham chiếu theo ngữ cảnh. Chỉ được: giải thích hướng dẫn, xác định một trong bốn dịch vụ, hoặc đề xuất mở form để người dùng tự kiểm tra. Không được tuyên bố đã đặt chỗ, đã gửi, đã phê duyệt; không được tự submit. Chỉ dùng nguồn trong KNOWLEDGE. Nếu thiếu dữ kiện, hỏi đúng một câu làm rõ. Trả lời ngắn, cụ thể bằng tiếng Việt.

KNOWLEDGE:
space_booking: ${knowledge.space_booking.answer}
support: ${knowledge.support.answer}
event_registration: ${knowledge.event_registration.answer}
access_card: ${knowledge.access_card.answer}`,
    } ] },
    contents: [...history.slice(-8).map(turn => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] })), { role: "user", parts: [{ text: message }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", additionalProperties: false, properties: { answer: { type: "string" }, sources: { type: "array", items: { type: "string", enum: ["Danh mục không gian NIC", "Quy trình đặt chỗ", "Hướng dẫn thẻ và quyền ra vào", "Danh mục hỗ trợ vận hành", "Hướng dẫn đăng ký sự kiện", "Trung tâm trợ giúp NIC"] } }, suggestedService: { type: ["string", "null"], enum: ["space_booking", "support", "event_registration", "access_card", null] } }, required: ["answer", "sources", "suggestedService"] } },
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify(requestBody) });
  if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const outputText = result.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("");
  if (!outputText) throw new Error("Gemini API returned no text");
  const parsed = JSON.parse(outputText) as CopilotReply & { suggestedService?: CopilotReply["suggestedService"] | null };
  return { answer: parsed.answer, sources: parsed.sources, ...(parsed.suggestedService ? { suggestedService: parsed.suggestedService } : {}) };
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: string; history?: ChatTurn[] } | null;
  const message = body?.message?.trim().slice(0, 500) ?? "";
  const history = Array.isArray(body?.history) ? body.history.filter(turn => (turn.role === "user" || turn.role === "assistant") && typeof turn.text === "string").slice(-8).map(turn => ({ role: turn.role, text: turn.text.slice(0, 500) })) : [];
  if (!message) return Response.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  try {
    const modelReply = await languageModelUnderstanding(message, history);
    return Response.json(modelReply ?? localUnderstanding(message, history));
  } catch (error) {
    console.error("copilot_model_fallback", error instanceof Error ? error.message : "unknown");
    return Response.json(localUnderstanding(message, history));
  }
}
