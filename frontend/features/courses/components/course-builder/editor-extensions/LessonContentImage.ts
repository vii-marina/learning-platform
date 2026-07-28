import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lessonContentImage: {
      setLessonContentImage: (attributes: {
        src: string;
        alt?: string | null;
        title?: string | null;
      }) => ReturnType;
    };
  }
}

export const LessonContentImage = Node.create({
  name: "lessonContentImage",

  group: "block",

  atom: true,

  draggable: true,

  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(
        {
          class: "rich-text-editor__image",
        },
        HTMLAttributes
      ),
    ];
  },

  addCommands() {
    return {
      setLessonContentImage:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
