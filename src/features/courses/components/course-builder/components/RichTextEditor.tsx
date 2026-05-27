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
import { LessonContentImage } from "../editor-extensions/LessonContentImage";
import { LessonCodeBlockVariant } from "../editor-extensions/LessonCodeBlockVariant";
import { LessonTextColor } from "../editor-extensions/LessonTextColor";

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
  placeholder = "Напишіть контент...",
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
      "Вставте URL ресурсу. Залиште порожнім, щоб видалити посилання.",
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
      setEditorMessage("Оберіть файл зображення.");
      return;
    }

    if (!onImageUpload) {
      setEditorMessage("Завантаження зображень зараз недоступне.");
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
        setEditorMessage("Не вдалося завантажити зображення.");
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
          "Жирний",
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
          disabled
        )}
        {toolbarButton(
          "Курсив",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
          disabled
        )}
        {toolbarButton(
          "Код",
          () => editor.chain().focus().toggleCode().run(),
          editor.isActive("code"),
          disabled || editor.isActive("codeBlock")
        )}
        {toolbarIconButton(
          "Підкреслення",
          () => editor.chain().focus().toggleUnderline().run(),
          <Underline className="h-4 w-4" />,
          editor.isActive("underline"),
          disabled
        )}
        {toolbarIconButton(
          "Блок коду",
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
          "Маркований список",
          () => editor.chain().focus().toggleBulletList().run(),
          <List className="h-4 w-4" />,
          editor.isActive("bulletList"),
          disabled
        )}
        {toolbarIconButton(
          "Нумерований список",
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListOrdered className="h-4 w-4" />,
          editor.isActive("orderedList"),
          disabled
        )}
        <div className="h-6 w-px bg-slate-200" />
        {toolbarIconButton(
          hasLink ? "Редагувати посилання" : "Додати посилання",
          handleToggleLink,
          <Link2 className="h-4 w-4" />,
          hasLink,
          disabled
        )}
        {toolbarButton(
          "Червоний",
          () => editor.chain().focus().setTextColor("#dc2626").run(),
          activeTextColor === "#dc2626",
          disabled
        )}
        {toolbarButton(
          "Синій",
          () => editor.chain().focus().setTextColor("#2563eb").run(),
          activeTextColor === "#2563eb",
          disabled
        )}
        {toolbarButton(
          "За замовчуванням",
          () => editor.chain().focus().unsetTextColor().run(),
          !activeTextColor,
          disabled
        )}
        {toolbarIconButton(
          isUploadingImage ? "Завантаження зображення..." : "Додати зображення",
          () => imageInputRef.current?.click(),
          <ImagePlus className="h-4 w-4" />,
          false,
          disabled || isUploadingImage
        )}
        <div className="ml-auto flex items-center gap-2">
          {toolbarIconButton(
            isExpanded ? "Згорнути редактор" : "Розгорнути редактор",
            () => setIsExpanded((currentValue) => !currentValue),
            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />,
            isExpanded,
            disabled
          )}
          {toolbarIconButton(
            "Скасувати",
            () => editor.chain().focus().undo().run(),
            <Undo2 className="h-4 w-4" />,
            false,
            disabled || !canUndo
          )}
          {toolbarIconButton(
            "Повторити",
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
