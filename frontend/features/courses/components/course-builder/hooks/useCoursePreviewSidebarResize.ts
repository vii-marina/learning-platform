/**
 * Drag-to-resize for the course-preview sidebar.
 *
 * Uses pointer events rather than mouse events so a touch drag works, and listens on
 * `window` rather than the handle: once the drag starts the pointer routinely leaves the
 * 8px grip, and a handle-scoped listener would drop the drag the moment it did.
 */

import { useState, type PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_SIDEBAR_WIDTH = 380;

export function useCoursePreviewSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  function handleSidebarResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    function handlePointerMove(pointerEvent: PointerEvent) {
      const nextWidth = startWidth + pointerEvent.clientX - startX;

      setSidebarWidth(Math.min(520, Math.max(240, nextWidth)));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return { sidebarWidth, handleSidebarResizeStart };
}
