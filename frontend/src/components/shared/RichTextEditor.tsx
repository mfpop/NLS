import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/core";
import { uploadImage } from "@/utils/imageUpload";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Undo2,
  Redo2,
  Minus,
  RemoveFormatting,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex items-center justify-center h-7 w-7 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 stroke-current" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-border/40 shrink-0" />;
}

function ContextMenuItem({
  icon: Icon,
  label,
  destructive,
  emphasized,
  onClick,
}: {
  icon: typeof Trash2;
  label: string;
  destructive?: boolean;
  emphasized?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted"
      } ${emphasized ? "font-medium" : ""}`}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = globalThis.prompt("Enter URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Image upload failed:", err);
    }
    e.target.value = "";
  }, [editor]);

  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/50 shrink-0">
      {/* Undo / Redo */}
      <ToolbarButton icon={Undo2} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
      <ToolbarButton icon={Redo2} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        icon={Bold}
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={UnderlineIcon}
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={RemoveFormatting}
        label="Clear formatting"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      />
      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        icon={List}
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarButton
        icon={LinkIcon}
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      />
      <ToolbarDivider />

      <ToolbarButton
        icon={Quote}
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        icon={Code}
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolbarButton
        icon={ImageIcon}
        label="Image"
        onClick={addImage}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <ToolbarDivider />

      {/* Table */}
      <ToolbarButton
        icon={TableIcon}
        label="Insert table"
        active={editor.isActive("table")}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      />

      <ToolbarButton
        icon={Minus}
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false, // added separately with custom config
        underline: false, // added separately with custom config
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          style: 'max-width: 480px; height: auto;',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-3 py-2 text-xs leading-relaxed",
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            uploadImage(file).then((url) => {
              editor?.chain().focus().setImage({ src: url }).run();
            }).catch((err) => {
              console.error("Image upload failed:", err);
            });
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          if (editor?.isActive("table")) {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY });
            return true;
          }
          return false;
        },
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) {
                uploadImage(file).then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                }).catch((err) => {
                  console.error("Image upload failed:", err);
                });
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  // ── Right-click context menu for table operations ──
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Close context menu on Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contextMenu]);

  // Sync external content changes into the editor (e.g., when inserting a template)
  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full border border-border bg-card">
      <EditorToolbar editor={editor} />

      <div className="flex-1 min-h-0 overflow-y-auto">
      <EditorContent editor={editor} />
      </div>

      {/* ── Right-click context menu for table operations ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            className="absolute min-w-[180px] bg-popover border border-border rounded-md shadow-xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
              Table
            </div>
            <ContextMenuItem
              icon={TableCellsMerge}
              label="Merge cells"
              onClick={() => { editor?.chain().focus().mergeCells().run(); setContextMenu(null); }}
            />
            <ContextMenuItem
              icon={TableCellsSplit}
              label="Split cell"
              onClick={() => { editor?.chain().focus().splitCell().run(); setContextMenu(null); }}
            />
            <div className="h-px bg-border/60 my-1 mx-2" />
            <ContextMenuItem
              icon={TableCellsMerge}
              label="Add column before"
              onClick={() => { editor?.chain().focus().addColumnBefore().run(); setContextMenu(null); }}
            />
            <ContextMenuItem
              icon={TableCellsMerge}
              label="Add column after"
              onClick={() => { editor?.chain().focus().addColumnAfter().run(); setContextMenu(null); }}
            />
            <ContextMenuItem
              icon={TableCellsSplit}
              label="Add row before"
              onClick={() => { editor?.chain().focus().addRowBefore().run(); setContextMenu(null); }}
            />
            <ContextMenuItem
              icon={TableCellsSplit}
              label="Add row after"
              onClick={() => { editor?.chain().focus().addRowAfter().run(); setContextMenu(null); }}
            />
            <div className="h-px bg-border/60 my-1 mx-2" />
            <ContextMenuItem
              icon={Trash2}
              label="Delete row"
              destructive
              onClick={() => { editor?.chain().focus().deleteRow().run(); setContextMenu(null); }}
            />
            <ContextMenuItem
              icon={Trash2}
              label="Delete column"
              destructive
              onClick={() => { editor?.chain().focus().deleteColumn().run(); setContextMenu(null); }}
            />
            <div className="h-px bg-border/60 my-1 mx-2" />
            <ContextMenuItem
              icon={Trash2}
              label="Delete table"
              destructive
              emphasized
              onClick={() => { editor?.chain().focus().deleteTable().run(); setContextMenu(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
