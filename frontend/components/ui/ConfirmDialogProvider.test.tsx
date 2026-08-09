import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ConfirmDialogProvider } from "./ConfirmDialogProvider";
import {
  useConfirmDialog,
  type ConfirmOptions,
  type PromptOptions,
} from "./confirmDialogContext";

/**
 * Renders a button that opens a dialog and records what the promise resolved to. The
 * resolved value is the whole contract here — a dialog that renders correctly but leaves
 * its promise pending would hang the caller with no visible symptom.
 */
function Harness({
  confirmOptions,
  promptOptions,
}: {
  confirmOptions?: ConfirmOptions;
  promptOptions?: PromptOptions;
}) {
  const { confirm, prompt } = useConfirmDialog();

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const result = confirmOptions
            ? await confirm(confirmOptions)
            : await prompt(promptOptions!);

          document.body.setAttribute("data-result", JSON.stringify(result));
        }}
      >
        Запустити
      </button>
      <span data-testid="result" />
    </>
  );
}

function renderHarness(props: Parameters<typeof Harness>[0]) {
  document.body.removeAttribute("data-result");

  return render(
    <ConfirmDialogProvider>
      <Harness {...props} />
    </ConfirmDialogProvider>
  );
}

async function resolvedValue(): Promise<unknown> {
  await waitFor(() => expect(document.body.getAttribute("data-result")).not.toBeNull());
  return JSON.parse(document.body.getAttribute("data-result")!);
}

const CONFIRM: ConfirmOptions = {
  title: "Видалити модуль?",
  description: "Цю дію не можна скасувати.",
  confirmLabel: "Видалити",
  tone: "danger",
};

describe("confirm", () => {
  it("shows nothing until it is called", () => {
    renderHarness({ confirmOptions: CONFIRM });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title and description as an accessible dialog", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: CONFIRM });

    await user.click(screen.getByRole("button", { name: "Запустити" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveAccessibleName("Видалити модуль?");
    expect(dialog).toHaveAccessibleDescription("Цю дію не можна скасувати.");
  });

  it("resolves true when confirmed", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: CONFIRM });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Видалити" }));

    expect(await resolvedValue()).toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: CONFIRM });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Скасувати" }));

    expect(await resolvedValue()).toBe(false);
  });

  // Dismissing by Escape must resolve too. A dropped resolver leaves the caller awaiting
  // forever, which looks like the app freezing rather than like an error.
  it("resolves false when dismissed with Escape", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: CONFIRM });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(await resolvedValue()).toBe(false);
  });

  it("closes the dialog once answered", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: CONFIRM });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("uses default labels when none are given", async () => {
    const user = userEvent.setup();
    renderHarness({ confirmOptions: { title: "Продовжити?" } });

    await user.click(screen.getByRole("button", { name: "Запустити" }));

    expect(await screen.findByRole("button", { name: "Підтвердити" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Скасувати" })).toBeInTheDocument();
  });
});

const PROMPT: PromptOptions = {
  title: "Посилання",
  label: "URL ресурсу",
  defaultValue: "https://",
  confirmLabel: "Зберегти",
};

describe("prompt", () => {
  it("labels its input programmatically, not just visually", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: PROMPT });

    await user.click(screen.getByRole("button", { name: "Запустити" }));

    expect(await screen.findByLabelText("URL ресурсу")).toBeInTheDocument();
  });

  it("starts from the default value", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: PROMPT });

    await user.click(screen.getByRole("button", { name: "Запустити" }));

    expect(await screen.findByLabelText("URL ресурсу")).toHaveValue("https://");
  });

  it("resolves the typed value", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: { ...PROMPT, defaultValue: "" } });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.type(await screen.findByLabelText("URL ресурсу"), "https://educat.app");
    await user.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await resolvedValue()).toBe("https://educat.app");
  });

  it("resolves null when cancelled, which is distinct from an empty string", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: PROMPT });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Скасувати" }));

    expect(await resolvedValue()).toBeNull();
  });

  it("resolves an empty string when the field is cleared and submitted", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: PROMPT });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.clear(await screen.findByLabelText("URL ресурсу"));
    await user.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await resolvedValue()).toBe("");
  });

  it("submits on Enter", async () => {
    const user = userEvent.setup();
    renderHarness({ promptOptions: { ...PROMPT, defaultValue: "https://a.example" } });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.type(await screen.findByLabelText("URL ресурсу"), "{Enter}");

    expect(await resolvedValue()).toBe("https://a.example");
  });

  it("blocks submission and announces the reason when validation fails", async () => {
    const user = userEvent.setup();
    renderHarness({
      promptOptions: {
        ...PROMPT,
        defaultValue: "not-a-url",
        validate: (value) => (value.startsWith("http") ? null : "Введіть коректне посилання."),
      },
    });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Зберегти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Введіть коректне посилання.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.getAttribute("data-result")).toBeNull();
  });

  it("marks the field invalid for assistive technology while it is rejected", async () => {
    const user = userEvent.setup();
    renderHarness({
      promptOptions: { ...PROMPT, defaultValue: "bad", validate: () => "Помилка." },
    });

    await user.click(screen.getByRole("button", { name: "Запустити" }));
    await user.click(await screen.findByRole("button", { name: "Зберегти" }));

    expect(await screen.findByLabelText("URL ресурсу")).toHaveAttribute("aria-invalid", "true");
  });
});
