import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();

  const utils = render(
    <Modal isOpen onClose={onClose} ariaLabel="Тестове вікно" {...props}>
      <button type="button">Перший</button>
      <button type="button">Другий</button>
    </Modal>
  );

  return { onClose, ...utils };
}

describe("rendering", () => {
  it("renders nothing when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes an accessible dialog when open", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Тестове вікно");
  });

  it("can take its name from an element inside it", () => {
    render(
      <Modal isOpen onClose={vi.fn()} labelledById="modal-heading">
        <h2 id="modal-heading">Створити модуль</h2>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Створити модуль");
  });
});

// A dialog that leaves the page scrollable behind it, or drops focus back into the page,
// is the specific failure this primitive exists to prevent.
describe("focus and scroll management", () => {
  it("moves focus into the dialog on open", () => {
    renderModal();

    expect(screen.getByRole("button", { name: "Перший" })).toHaveFocus();
  });

  it("locks background scrolling while open", () => {
    const { unmount } = renderModal();

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("returns focus to the trigger after closing", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Відкрити
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} ariaLabel="Вікно">
            <button type="button" onClick={() => setIsOpen(false)}>
              Закрити
            </button>
          </Modal>
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Відкрити" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Закрити" }));

    expect(trigger).toHaveFocus();
  });
});

describe("dismissal", () => {
  it("closes on Escape by default", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when closing on escape is disabled", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ closeOnEscape: false });

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  // Guards a half-finished submit from being thrown away by a stray keypress.
  it("ignores Escape while dismissal is disabled", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ dismissDisabled: true });

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on an overlay click unless asked to", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole("dialog").parentElement!.parentElement!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on an overlay click when enabled", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ closeOnOverlayClick: true });

    await user.click(screen.getByRole("dialog").parentElement!.parentElement!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when the click started inside the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ closeOnOverlayClick: true });

    await user.click(screen.getByRole("button", { name: "Перший" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});

// Without a trap, Tab walks out of the dialog into the page behind it, which for a
// keyboard or screen-reader user means the dialog silently stops being modal.
describe("focus trap", () => {
  it("wraps from the last focusable back to the first", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.tab();
    expect(screen.getByRole("button", { name: "Другий" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Перший" })).toHaveFocus();
  });

  it("wraps backwards from the first focusable to the last", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Другий" })).toHaveFocus();
  });
});
