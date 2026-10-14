"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--brand)] text-white"
          : "text-slate-600 hover:bg-white hover:text-[var(--brand)]"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    content: value,

    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-72 rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        <ToolbarButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </ToolbarButton>

        <ToolbarButton
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </ToolbarButton>

        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>

        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          • List
        </ToolbarButton>

        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          1. List
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
        >
          Left
        </ToolbarButton>

        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
        >
          Center
        </ToolbarButton>

        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
        >
          Right
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        <label
          title="Text color"
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white hover:text-[var(--brand)]"
        >
          <span>A</span>

          <input
            type="color"
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            onChange={(event) => {
              editor
                .chain()
                .focus()
                .setColor(event.target.value)
                .run();
            }}
          />
        </label>

        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          Undo
        </ToolbarButton>

        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          Redo
        </ToolbarButton>
      </div>

      <div className="relative">
        {!editor.getText().trim() && (
          <div className="pointer-events-none absolute left-5 top-5 z-10 text-sm text-slate-400">
            {placeholder}
          </div>
        )}

        <EditorContent
          editor={editor}
          className="doc-body min-h-72 p-5"
        />
      </div>
    </div>
  );
}