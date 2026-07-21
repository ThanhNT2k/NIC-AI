export type DiagnosticFrame = { functionName: string; file: string; line: number; column: number };

function safeText(value: string, limit = 300) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/((?:credential|secret|token|passphrase)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, "$1[REDACTED]")
    .slice(0, limit);
}

function normalizedFile(value: string) {
  const clean = decodeURIComponent(value.replace(/^file:\/\//, "").replaceAll("\\", "/").split("?")[0]);
  const sourceMarker = clean.match(/(?:^|\/)(app|lib|worker|db)\/.+$/)?.[0];
  if (sourceMarker) return sourceMarker.replace(/^\//, "");
  const distMarker = clean.match(/(?:^|\/)dist\/.+$/)?.[0];
  if (distMarker) return distMarker.replace(/^\//, "");
  const pieces = clean.split("/").filter(Boolean);
  return pieces.slice(-3).join("/") || "unknown";
}

export function parseStackTrace(error: unknown): DiagnosticFrame[] {
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const frames: DiagnosticFrame[] = [];
  for (const raw of stack.split("\n").slice(1, 31)) {
    const match = raw.match(/^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/);
    if (!match) continue;
    frames.push({ functionName: safeText(match[1] || "<anonymous>", 160), file: normalizedFile(match[2]), line: Number(match[3]), column: Number(match[4]) });
  }
  return frames.slice(0, 20);
}

export function diagnosticPreview(error: unknown) {
  const source = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown runtime failure");
  return {
    errorClass: safeText(source.name || "Error", 80),
    errorCode: safeText((source as Error & { code?: unknown }).code ? String((source as Error & { code?: unknown }).code) : "UNHANDLED_RUNTIME_ERROR", 100),
    safeMessage: safeText(source.message || "Unexpected runtime failure"),
    frames: parseStackTrace(source),
  };
}
