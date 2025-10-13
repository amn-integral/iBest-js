import { useEffect, useRef, useState } from "react";

export const useChartResize = (minWidth = 240) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.floor(entry.contentRect.width);
      if (nextWidth > 0) {
        setContainerWidth((prev) => {
          const clamped = Math.max(minWidth, nextWidth);
          return Math.abs(prev - clamped) > 1 ? clamped : prev;
        });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [minWidth]);

  return { wrapperRef, containerWidth };
};
