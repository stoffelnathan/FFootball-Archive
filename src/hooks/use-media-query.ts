"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `md` — viewport narrower than 768px. */
export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean | null {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}
