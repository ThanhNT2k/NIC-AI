import { currentUser } from "@/lib/d1-auth";

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: string } | null;
  const message = body?.message?.trim().slice(0, 500) ?? "";
  if (!message) return Response.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  const normalized = message.toLocaleLowerCase("vi");
  if (/phòng|không gian|đặt chỗ|20 người/.test(normalized)) return Response.json({ answer: "Với nhóm khoảng 20 người, bạn có thể chọn phòng hội thảo nhỏ hoặc không gian làm việc chung. Hãy cung cấp ngày, giờ bắt đầu/kết thúc và thiết bị cần dùng; hệ thống sẽ lưu thành bản nháp để bạn kiểm tra trước khi gửi.", sources: ["Danh mục không gian NIC", "Quy trình đặt chỗ"], suggestedService: "space_booking" });
  if (/khách|ra vào|thẻ/.test(normalized)) return Response.json({ answer: "Đăng ký khách hoặc thẻ ra vào cần họ tên, thông tin liên hệ, ngày hiệu lực và loại quyền cần cấp. Nên gửi trước thời điểm sử dụng để bộ phận vận hành có thời gian kiểm tra.", sources: ["Hướng dẫn thẻ và quyền ra vào"], suggestedService: "access_card" });
  if (/thiết bị|kỹ thuật|hỗ trợ|sự cố/.test(normalized)) return Response.json({ answer: "Bạn hãy cho biết nhóm hỗ trợ, mức độ ưu tiên, vị trí và thời gian mong muốn. Tôi có thể mở form hỗ trợ để bạn hoàn thiện thông tin; chỉ bạn mới có thể xác nhận và gửi yêu cầu.", sources: ["Danh mục hỗ trợ vận hành"], suggestedService: "support" });
  if (/sự kiện|workshop|tham dự/.test(normalized)) return Response.json({ answer: "Để đăng ký sự kiện, cần tên sự kiện, ngày tham dự, số người và vai trò của đoàn. Bạn có thể chuẩn bị form ngay và kiểm tra bản nháp trước khi gửi.", sources: ["Hướng dẫn đăng ký sự kiện"], suggestedService: "event_registration" });
  return Response.json({ answer: "Tôi chưa tìm thấy hướng dẫn đủ cụ thể. Bạn có thể hỏi về đặt không gian, hỗ trợ vận hành, sự kiện hoặc thẻ ra vào. Tôi sẽ chỉ tra cứu và chuẩn bị form, không tự gửi yêu cầu.", sources: ["Trung tâm trợ giúp NIC"] });
}
