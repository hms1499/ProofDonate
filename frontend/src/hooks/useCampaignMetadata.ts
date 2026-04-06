"use client";

import { useEffect, useState } from "react";
import { ipfsToHttp } from "@/lib/pinata";
import type { CampaignMetadata } from "@/types";

export function useCampaignMetadata(metadataURI: string | undefined) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metadataURI) return;

    let cancelled = false;
    setIsLoading(true);

    fetch(ipfsToHttp(metadataURI))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMetadata(data);
      })
      .catch(() => {
        if (!cancelled) setMetadata(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [metadataURI]);

  return { metadata, isLoading };
}
