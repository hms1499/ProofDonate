import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
});

export async function uploadImage(file: File): Promise<string> {
  const result = await pinata.upload.public.file(file);
  return `ipfs://${result.cid}`;
}

export async function uploadMetadata(metadata: {
  image: string;
  website?: string;
  socials?: { twitter?: string; github?: string };
  documents?: string[];
  category?: string;
}): Promise<string> {
  const result = await pinata.upload.public.json(metadata);
  return `ipfs://${result.cid}`;
}

export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri || !ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const cid = ipfsUri.replace("ipfs://", "");
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}
