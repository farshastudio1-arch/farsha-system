'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor, type Content, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
} from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import type { TiptapDoc } from '@/lib/blog-content';

type BlogTiptapEditorProps = {
  value: TiptapDoc;
  onChange: (doc: TiptapDoc) => void;
};

const buttonBase =
  'flex h-9 min-w-9 items-center justify-center gap-1 border border-neutral-200 px-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900';
const buttonActive = 'bg-neutral-900 text-white hover:bg-neutral-900';

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`${buttonBase} ${active ? buttonActive : ''}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const input = window.prompt('Link URL (leave empty to remove)', previous ?? 'https://');

    if (input === null) {
      return;
    }

    const href = input.trim();

    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-2">
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="font-semibold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <span className="font-semibold">H3</span>
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={onPickImage}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export default function BlogTiptapEditor({ value, onChange }: BlogTiptapEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    // Tiptap must not render during SSR in the App Router (hydration mismatch).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // The public renderer's allowlist only emits bold/italic/link + the block
        // nodes below, so keep the editor honest by disabling the rest.
        code: false,
        codeBlock: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'nofollow noopener noreferrer', target: '_blank' },
      }),
      Image,
    ],
    content: value as Content,
    editorProps: {
      attributes: {
        class:
          'prose-none min-h-[320px] max-w-none px-4 py-4 text-sm leading-relaxed text-neutral-900 focus:outline-none',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as TiptapDoc);
    },
  });

  // Reset the document when the edited post changes (e.g. navigating between
  // posts) without clobbering in-progress edits on the same post.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const incoming = JSON.stringify(value ?? {});
    const current = JSON.stringify(editor.getJSON());

    if (incoming !== current) {
      editor.commands.setContent((value ?? { type: 'doc', content: [] }) as Content);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[380px] border border-neutral-200 bg-neutral-50" aria-hidden />
    );
  }

  return (
    <div className="border border-neutral-200 bg-white">
      <Toolbar editor={editor} onPickImage={() => setPickerOpen(true)} />
      <EditorContent editor={editor} />

      <MediaLibraryPicker
        open={pickerOpen}
        title="Insert image"
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />
    </div>
  );
}
