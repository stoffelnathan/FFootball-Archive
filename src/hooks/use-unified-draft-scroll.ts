import { useCallback, useEffect, useState, type RefObject } from "react";

export type UnifiedDraftScrollMetrics = {
  stickyTop: number;
  workspaceHeight: number;
  trackHeight: number;
  boardScrollRange: number;
  boardOffset: number;
};

const DEFAULT_METRICS: UnifiedDraftScrollMetrics = {
  stickyTop: 0,
  workspaceHeight: 600,
  trackHeight: 600,
  boardScrollRange: 0,
  boardOffset: 0,
};

export function useUnifiedDraftScroll({
  enabled,
  trackRef,
  boardViewportRef,
  boardContentRef,
  remeasureKey = 0,
}: {
  enabled: boolean;
  trackRef: RefObject<HTMLElement | null>;
  boardViewportRef: RefObject<HTMLElement | null>;
  boardContentRef: RefObject<HTMLElement | null>;
  remeasureKey?: number;
}) {
  const [metrics, setMetrics] = useState<UnifiedDraftScrollMetrics>(DEFAULT_METRICS);

  const measure = useCallback(() => {
    const siteHeader = document.querySelector("header");
    const stickyTop = siteHeader?.getBoundingClientRect().height ?? 0;
    const workspaceHeight = Math.max(320, window.innerHeight - stickyTop);

    const boardViewport = boardViewportRef.current;
    const boardContent = boardContentRef.current;
    const boardViewportHeight = boardViewport?.clientHeight ?? 0;
    const boardContentHeight = boardContent?.scrollHeight ?? 0;
    const boardScrollRange = Math.max(0, boardContentHeight - boardViewportHeight);
    const trackHeight = workspaceHeight + boardScrollRange;

    return {
      stickyTop,
      workspaceHeight,
      trackHeight,
      boardScrollRange,
    };
  }, [boardContentRef, boardViewportRef]);

  const updateFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const base = measure();
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const pinStart = trackTop - base.stickyTop;
    const boardOffset = Math.min(
      base.boardScrollRange,
      Math.max(0, window.scrollY - pinStart),
    );

    setMetrics({
      ...base,
      boardOffset,
    });
  }, [measure, trackRef]);

  useEffect(() => {
    if (!enabled) return;

    updateFromScroll();

    const boardViewport = boardViewportRef.current;
    const boardContent = boardContentRef.current;

    const observer = new ResizeObserver(() => {
      updateFromScroll();
    });

    if (boardViewport) observer.observe(boardViewport);
    if (boardContent) observer.observe(boardContent);
    observer.observe(document.documentElement);

    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [
    boardContentRef,
    boardViewportRef,
    enabled,
    measure,
    remeasureKey,
    trackRef,
    updateFromScroll,
  ]);

  return metrics;
}
