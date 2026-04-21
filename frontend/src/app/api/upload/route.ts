import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
});

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // JSON metadata upload
      const metadata = await req.json();
      const result = await pinata.upload.public.json(metadata);
      return NextResponse.json({ uri: `ipfs://${result.cid}` });
    }

    // File upload
    const formData = await req.formData();
    const file = formData.get("file") as unknown as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await pinata.upload.public.file(file);
    return NextResponse.json({ uri: `ipfs://${result.cid}` });
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
