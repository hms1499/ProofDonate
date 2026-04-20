"use client";

import { useEffect, useState } from "react";
import { ipfsToHttp } from "@/lib/pinata";
import type { CampaignMetadata } from "@/types";

const metadataCache = new Map<string, CampaignMetadata>();

export function useCampaignMetadata(metadataURI: string | undefined) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(() =>
    metadataURI ? (metadataCache.get(metadataURI) ?? null) : null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metadataURI) return;

    if (metadataCache.has(metadataURI)) {
      setMetadata(metadataCache.get(metadataURI)!);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(ipfsToHttp(metadataURI))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          metadataCache.set(metadataURI, data);
          setMetadata(data);
        }
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
