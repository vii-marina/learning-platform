import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  RESIZABLE_SIDEBAR_MAX_WIDTH,
  RESIZABLE_SIDEBAR_MIN_WIDTH,
} from "./constants";

export function useSidebarResize(isResizable: boolean, defaultWidth: number) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);

  useEffect(() => {
    if (!isResizable || !isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = resizeStartRef.current;

      if (!resizeStart) {
        return;
      }

      const nextWidth = resizeStart.width + event.clientX - resizeStart.pointerX;
      setSidebarWidth(
        Math.min(
          RESIZABLE_SIDEBAR_MAX_WIDTH,
          Math.max(RESIZABLE_SIDEBAR_MIN_WIDTH, nextWidth)
        )
      );
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizable, isResizing]);

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      pointerX: event.clientX,
      width: sidebarWidth,
    };
    setIsResizing(true);
  };

  return { sidebarWidth, handleResizePointerDown };
}
