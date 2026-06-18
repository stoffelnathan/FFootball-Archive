import { useLayoutEffect, type RefObject } from "react";

/**
 * Ensures mouse wheel scrolling works inside nested overflow containers
 * when ancestor elements lock document scroll (common in Chrome).
 */
export function useContainedWheelScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true,
  captureRef?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const container = ref.current;
    if (!container) return;

    const captureEl = captureRef?.current ?? container;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !captureEl.contains(target)) return;

      const {
        scrollTop,
        scrollLeft,
        scrollHeight,
        scrollWidth,
        clientHeight,
        clientWidth,
      } = container;

      const canScrollY = scrollHeight > clientHeight;
      const canScrollX = scrollWidth > clientWidth;
      if (!canScrollY && !canScrollX) return;

      const { deltaY, deltaX } = event;
      let consumed = false;

      if (canScrollY && Math.abs(deltaY) >= Math.abs(deltaX)) {
        const maxTop = scrollHeight - clientHeight;
        const nextTop = scrollTop + deltaY;
        if (
          (deltaY > 0 && scrollTop < maxTop) ||
          (deltaY < 0 && scrollTop > 0)
        ) {
          container.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
          consumed = true;
        }
      } else if (canScrollX) {
        const maxLeft = scrollWidth - clientWidth;
        const nextLeft = scrollLeft + deltaX;
        if (
          (deltaX > 0 && scrollLeft < maxLeft) ||
          (deltaX < 0 && scrollLeft > 0)
        ) {
          container.scrollLeft = Math.max(0, Math.min(maxLeft, nextLeft));
          consumed = true;
        }
      }

      if (consumed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    captureEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => captureEl.removeEventListener("wheel", handleWheel);
  }, [captureRef, enabled, ref]);
}
