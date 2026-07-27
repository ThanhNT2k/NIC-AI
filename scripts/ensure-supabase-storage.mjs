import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_ATTACHMENT_BUCKET ?? "nic-attachments";
if (!url || !key) throw new Error("Supabase URL and service-role key are required.");

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await client.storage.getBucket(bucket);
if (error && !/not found/i.test(error.message)) throw error;
if (!data) {
  const { error: createError } = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "text/plain"],
  });
  if (createError) throw createError;
  console.log(JSON.stringify({ bucket, created: true, public: false }));
} else {
  if (data.public) throw new Error(`Bucket ${bucket} must remain private.`);
  console.log(JSON.stringify({ bucket, created: false, public: false }));
}
