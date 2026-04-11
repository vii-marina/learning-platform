import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  ImagePlus,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { LessonContentImage } from "./LessonContentImage";
import { LessonCodeBlockVariant } from "./LessonCodeBlockVariant";
import { LessonTextColor } from "./LessonTextColor";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
  disabled = false,
  onImageUpload,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [editorMessage, setEditorMessage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      UnderlineExtension,
      Placeholder.configure({
        placeholder,
      }),
      LessonContentImage,
      LessonCodeBlockVariant,
      LessonTextColor,
    ],
    content: value,
    editable: !disabled,
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

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  const toolbarButton = (
    label: string,
    onClick: () => void,
    isActive = false,
    isDisabled = false
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`rounded-xl px-3 py-2 text-xs border font-semibold transition ${
        isDisabled
          ? "cursor-not-allowed bg-white text-slate-300"
        : isActive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {label}
    </button>
  );

  const toolbarIconButton = (
    label: string,
    onClick: () => void,
    icon: ReactNode,
    isActive = false,
    isDisabled = false
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      className={`rounded-xl p-2 ${
        isActive
          ? "bg-emerald-100 text-emerald-800"
          : isDisabled
          ? "cursor-not-allowed bg-white text-slate-300"
          : "bg-white text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {icon}
    </button>
  );

  const canUndo = editor.can().chain().focus().undo().run();
  const canRedo = editor.can().chain().focus().redo().run();
  const hasLink = editor.isActive("link");
  const activeTextColor = (editor.getAttributes("textColor").color as string) || "";
  const activeCodeVariant =
    typeof editor.getAttributes("codeBlock").codeVariant === "string"
      ? (editor.getAttributes("codeBlock").codeVariant as string)
      : "example";

  const handleToggleLink = () => {
    if (disabled) {
      return;
    }

    const currentHref =
      typeof editor.getAttributes("link").href === "string"
        ? (editor.getAttributes("link").href as string)
        : "";

    const nextHref = window.prompt(
      "Paste the resource URL. Leave empty to remove the link.",
      currentHref || "https://"
    );

    if (nextHref === null) {
      return;
    }

    const trimmedHref = nextHref.trim();

    if (!trimmedHref) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setEditorMessage("");
      return;
    }

    const normalizedHref = /^(https?:\/\/|mailto:|tel:)/i.test(trimmedHref)
      ? trimmedHref
      : `https://${trimmedHref}`;

    editor.chain().focus().extendMarkRange("link").setLink({ href: normalizedHref }).run();
    setEditorMessage("");
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setEditorMessage("Please choose an image file.");
      return;
    }

    if (!onImageUpload) {
      setEditorMessage("Image upload is not available right now.");
      return;
    }

    try {
      setIsUploadingImage(true);
      setEditorMessage("");
      const imageUrl = await onImageUpload(file);
      editor
        .chain()
        .focus()
        .setLessonContentImage({
          src: imageUrl,
          alt: file.name,
          title: file.name,
        })
        .run();
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setEditorMessage(error.message);
      } else {
        setEditorMessage("Unable to upload image.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="rich-text-editor overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#f9fbfd] px-3 py-3">
        {toolbarButton(
          "Bold",
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
          disabled
        )}
        {toolbarButton(
          "Italic",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
          disabled
        )}
        {toolbarButton(
          "Code",
          () => editor.chain().focus().toggleCode().run(),
          editor.isActive("code"),
          disabled || editor.isActive("codeBlock")
        )}
        {toolbarIconButton(
          "Underline",
          () => editor.chain().focus().toggleUnderline().run(),
          <Underline className="h-4 w-4" />,
          editor.isActive("underline"),
          disabled
        )}
        {toolbarIconButton(
          "Code block",
          () => editor.chain().focus().toggleCodeBlock().run(),
          <Code2 className="h-4 w-4" />,
          editor.isActive("codeBlock"),
          disabled
        )}
        {toolbarButton(
          "Input",
          () => editor.chain().focus().setLessonCodeBlockVariant("input").run(),
          editor.isActive("codeBlock") && activeCodeVariant === "input",
          disabled
        )}
        {toolbarButton(
          "Output",
          () => editor.chain().focus().setLessonCodeBlockVariant("output").run(),
          editor.isActive("codeBlock") && activeCodeVariant === "output",
          disabled
        )}
        <div className="h-6 w-px bg-slate-200" />
        {toolbarIconButton(
          "Bullet list",
          () => editor.chain().focus().toggleBulletList().run(),
          <List className="h-4 w-4" />,
          editor.isActive("bulletList"),
          disabled
        )}
        {toolbarIconButton(
          "Numbered list",
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListOrdered className="h-4 w-4" />,
          editor.isActive("orderedList"),
          disabled
        )}
        <div className="h-6 w-px bg-slate-200" />
        {toolbarIconButton(
          hasLink ? "Edit link" : "Add link",
          handleToggleLink,
          <Link2 className="h-4 w-4" />,
          hasLink,
          disabled
        )}
        {toolbarButton(
          "Red",
          () => editor.chain().focus().setTextColor("#dc2626").run(),
          activeTextColor === "#dc2626",
          disabled
        )}
        {toolbarButton(
          "Blue",
          () => editor.chain().focus().setTextColor("#2563eb").run(),
          activeTextColor === "#2563eb",
          disabled
        )}
        {toolbarButton(
          "Default",
          () => editor.chain().focus().unsetTextColor().run(),
          !activeTextColor,
          disabled
        )}
        {toolbarIconButton(
          isUploadingImage ? "Uploading image..." : "Add image",
          () => imageInputRef.current?.click(),
          <ImagePlus className="h-4 w-4" />,
          false,
          disabled || isUploadingImage
        )}
        <div className="ml-auto flex items-center gap-2">
          {toolbarIconButton(
            isExpanded ? "Collapse editor" : "Expand editor",
            () => setIsExpanded((currentValue) => !currentValue),
            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />,
            isExpanded,
            disabled
          )}
          {toolbarIconButton(
            "Undo",
            () => editor.chain().focus().undo().run(),
            <Undo2 className="h-4 w-4" />,
            false,
            disabled || !canUndo
          )}
          {toolbarIconButton(
            "Redo",
            () => editor.chain().focus().redo().run(),
            <Redo2 className="h-4 w-4" />,
            false,
            disabled || !canRedo
          )}
        </div>
      </div>

      {editorMessage ? (
        <div className="border-b border-slate-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
          {editorMessage}
        </div>
      ) : null}

      <div
        role="presentation"
        onClick={() => {
          if (!disabled) {
            editor.chain().focus().run();
          }
        }}
        className={`bg-white ${
          isExpanded
            ? "min-h-[320px]"
            : "max-h-[30rem] min-h-[320px] overflow-y-auto"
        } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-text"}`}
      >
        <EditorContent editor={editor} className="text-base text-slate-700" />
      </div>
    </div>
  );
}
