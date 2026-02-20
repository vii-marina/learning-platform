import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

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

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-2">
        {toolbarButton("Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {toolbarButton(
          "Italic",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic")
        )}
        {toolbarButton(
          "Bullet",
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList")
        )}
        {toolbarButton(
          "Numbered",
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList")
        )}
        {toolbarButton("Undo", () => editor.chain().focus().undo().run())}
        {toolbarButton("Redo", () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[180px] px-3 py-2 text-sm text-slate-700"
      />
    </div>
  );
}
