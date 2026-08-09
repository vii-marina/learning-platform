import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Styling stays with the caller so each modal keeps its exact look: `panelClassName`
  // is applied to the dialog panel, `overlayClassName` to the backdrop (usually just a
  // z-index). The primitive only adds the accessible dialog behavior around them.
  panelClassName?: string;
  overlayClassName?: string;
  labelledById?: string;
  describedById?: string;
  ariaLabel?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  // Block Escape / overlay dismissal while a submit is in flight.
  dismissDisabled?: boolean;
  children: ReactNode;
};

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  panelClassName = "",
  overlayClassName = "z-50",
  labelledById,
  describedById,
  ariaLabel,
  closeOnOverlayClick = false,
  closeOnEscape = true,
  dismissDisabled = false,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialog)?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape && !dismissDisabled) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.offsetParent !== null);

      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, closeOnEscape, dismissDisabled, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 overflow-y-auto bg-slate-950/60 backdrop-blur-sm ${overlayClassName}`}
      onMouseDown={(event) => {
        if (
          closeOnOverlayClick &&
          !dismissDisabled &&
          dialogRef.current &&
          !dialogRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledById}
          aria-describedby={describedById}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={panelClassName}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
