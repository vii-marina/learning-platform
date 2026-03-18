import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Redo2, Undo2 } from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-text-editor__content",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const toolbarButton = (label: string, onClick: () => void, isActive = false) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </button>
  );

  const toolbarIconButton = (
    label: string,
    onClick: () => void,
    icon: ReactNode,
    isDisabled = false
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      className={`rounded p-2 ${
        isDisabled
          ? "cursor-not-allowed bg-slate-100 text-slate-300"
          : "bg-slate-100 text-slate-600 transition hover:bg-slate-200"
      }`}
    >
      {icon}
    </button>
  );

  const canUndo = editor.can().chain().focus().undo().run();
  const canRedo = editor.can().chain().focus().redo().run();

  return (
    <div className="rich-text-editor rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
        {toolbarButton("Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {toolbarButton(
          "Italic",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic")
        )}
        {toolbarIconButton(
          "Undo",
          () => editor.chain().focus().undo().run(),
          <Undo2 className="h-4 w-4" />,
          !canUndo
        )}
        {toolbarIconButton(
          "Redo",
          () => editor.chain().focus().redo().run(),
          <Redo2 className="h-4 w-4" />,
          !canRedo
        )}
      </div>
      <div
        role="presentation"
        onClick={() => editor.chain().focus().run()}
        className="min-h-[240px] cursor-text"
      >
        <EditorContent editor={editor} className="text-sm text-slate-700" />
      </div>
    </div>
  );
}
