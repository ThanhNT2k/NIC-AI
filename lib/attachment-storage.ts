import { createClient } from "@supabase/supabase-js";

export interface StoredAttachment {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface AttachmentStorage {
  put(
    key: string,
    value: Uint8Array,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<void>;
  get(key: string): Promise<StoredAttachment | null>;
  delete(key: string): Promise<void>;
}

function supabaseStorage(): AttachmentStorage | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const bucket = process.env.SUPABASE_ATTACHMENT_BUCKET ?? "nic-attachments";

  return {
    async put(key, value, options) {
      const { error } = await client.storage.from(bucket).upload(key, value, {
        contentType: options?.httpMetadata?.contentType,
        upsert: false,
        metadata: options?.customMetadata,
      });
      if (error) throw new Error(`ATTACHMENT_UPLOAD_FAILED:${error.message}`);
    },
    async get(key) {
      const { data, error } = await client.storage.from(bucket).download(key);
      if (error) {
        if (/not found|does not exist/i.test(error.message)) return null;
        throw new Error(`ATTACHMENT_DOWNLOAD_FAILED:${error.message}`);
      }
      return {
        body: data.stream() as ReadableStream<Uint8Array>,
        arrayBuffer: () => data.arrayBuffer(),
      };
    },
    async delete(key) {
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) throw new Error(`ATTACHMENT_DELETE_FAILED:${error.message}`);
    },
  };
}

export async function attachmentStorage(): Promise<AttachmentStorage> {
  const supabase = supabaseStorage();
  if (supabase) return supabase;

  const { env } = await import("cloudflare:workers");
  const storage = (env as typeof env & { ATTACHMENTS?: AttachmentStorage }).ATTACHMENTS;
  if (!storage) throw new Error("ATTACHMENT_STORAGE_UNAVAILABLE");
  return storage;
}
