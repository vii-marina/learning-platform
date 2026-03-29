import { Extension } from "@tiptap/core";

export type LessonCodeBlockVariantName = "example" | "input" | "output";

function isLessonCodeBlockVariantName(value: unknown): value is LessonCodeBlockVariantName {
  return value === "example" || value === "input" || value === "output";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lessonCodeBlockVariant: {
      setLessonCodeBlockVariant: (variant: LessonCodeBlockVariantName) => ReturnType;
    };
  }
}

export const LessonCodeBlockVariant = Extension.create({
  name: "lessonCodeBlockVariant",

  addGlobalAttributes() {
    return [
      {
        types: ["codeBlock"],
        attributes: {
          codeVariant: {
            default: "example",
            parseHTML: (element) => {
              const value = element.getAttribute("data-code-variant");

              return isLessonCodeBlockVariantName(value) ? value : "example";
            },
            renderHTML: (attributes) => {
              const codeVariant = isLessonCodeBlockVariantName(attributes.codeVariant)
                ? attributes.codeVariant
                : "example";

              return {
                "data-code-variant": codeVariant,
                class: `lesson-code-block lesson-code-block--${codeVariant}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLessonCodeBlockVariant:
        (variant) =>
        ({ chain, editor }) => {
          if (!isLessonCodeBlockVariantName(variant)) {
            return false;
          }

          if (editor.isActive("codeBlock")) {
            return chain().focus().updateAttributes("codeBlock", { codeVariant: variant }).run();
          }

          return chain()
            .focus()
            .toggleCodeBlock()
            .updateAttributes("codeBlock", { codeVariant: variant })
            .run();
        },
    };
  },
});
