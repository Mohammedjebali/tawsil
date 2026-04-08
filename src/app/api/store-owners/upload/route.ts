import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/sentry";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.CF_R2_ACCOUNT_ID!;
const R2_ACCESS_KEY = process.env.CF_R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY = process.env.CF_R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.CF_R2_BUCKET_NAME || "tawsil-images";

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const storeId = formData.get("storeId") as string;
    const itemName = (formData.get("itemName") as string) || "item";

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    if (storeId && !/^[0-9a-f-]{36}$/i.test(storeId)) {
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `${storeId}/${Date.now()}-${itemName.replace(/\s+/g, "-")}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
      })
    );

    // Public URL — requires r2.dev subdomain to be enabled on the bucket
    const publicUrl = `${process.env.CF_R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
