/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { recordDiagnostic } from "../lib/diagnostics";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    try {
      return await handler.fetch(request, env, ctx);
    } catch (error) {
      const incoming = request.headers.get("x-correlation-id")?.trim();
      const correlationId = incoming && /^[a-zA-Z0-9._:-]{8,120}$/.test(incoming) ? incoming : crypto.randomUUID();
      const traceId = crypto.randomUUID().replaceAll("-", "");
      let diagnosticId = crypto.randomUUID();
      try { diagnosticId = (await recordDiagnostic(env.DB,{error,correlationId,traceId,route:new URL(request.url).pathname})).id; } catch { /* Database outage must not hide the original failure. */ }
      return Response.json({error:"INTERNAL_ERROR",diagnosticId,correlationId},{status:500,headers:{"x-correlation-id":correlationId,"traceparent":`00-${traceId}-0000000000000001-01`,"cache-control":"no-store"}});
    }
  },
};

export default worker;
