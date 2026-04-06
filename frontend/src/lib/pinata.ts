export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed");

  const { uri } = await res.json();
  return uri;
}

export async function uploadMetadata(metadata: {
  image: string;
  website?: string;
  socials?: { twitter?: string; github?: string };
  documents?: string[];
  category?: string;
}): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) throw new Error("Metadata upload failed");

  const { uri } = await res.json();
  return uri;
}

export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri || !ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const cid = ipfsUri.replace("ipfs://", "");
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}
