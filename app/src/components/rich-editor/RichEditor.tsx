'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { CircleMark, HighlightMark } from './marks';
import { toDisplayHtml } from '@/lib/rich-text';
import './rich-editor.css';

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rte__btn${active ? ' on' : ''}`}
      aria-label={label}
      aria-pressed={!!active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [notePanel, setNotePanel] = useState<{ style: 'highlight' | 'circle' } | null>(null);
  const [noteText, setNoteText] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
      HighlightMark,
      CircleMark,
      TextAlign.configure({ types: ['paragraph'], defaultAlignment: 'left' }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content: toDisplayHtml(value),
    editorProps: {
      attributes: { class: 'rte__content' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // RichEditor instances are often reused across a field that switches subject (e.g. picking a
  // different day) without remounting — TipTap's `content` option only applies on mount, so keep
  // the document synced when `value` changes from outside the editor's own onUpdate.
  useEffect(() => {
    if (!editor) return;
    const next = toDisplayHtml(value);
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return <div className="rte rte--loading" style={{ minHeight }} />;

  function openNotePanel(style: 'highlight' | 'circle') {
    if (!editor || editor.state.selection.empty) return;
    setNoteText('');
    setNotePanel({ style });
  }

  function confirmNote() {
    if (!editor || !notePanel) return;
    const text = noteText.trim();
    const attrs = text ? { note: text, noteId: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` } : {};
    const chain = editor.chain().focus();
    if (notePanel.style === 'highlight') chain.setHighlightMark(attrs).run();
    else chain.setCircleMark(attrs).run();
    setNotePanel(null);
    setNoteText('');
  }

  return (
    <div className="rte">
      <div className="rte__toolbar">
        <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </ToolButton>
        <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          I
        </ToolButton>
        <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          U
        </ToolButton>
        <span className="rte__sep" />
        <ToolButton
          label="Highlight"
          active={editor.isActive('highlightMark')}
          onClick={() =>
            editor.isActive('highlightMark')
              ? editor.chain().focus().unsetHighlightMark().run()
              : editor.chain().focus().setHighlightMark().run()
          }
        >
          Highlight
        </ToolButton>
        <ToolButton
          label="Circle"
          active={editor.isActive('circleMark')}
          onClick={() =>
            editor.isActive('circleMark') ? editor.chain().focus().unsetCircleMark().run() : editor.chain().focus().setCircleMark().run()
          }
        >
          Circle
        </ToolButton>
        <ToolButton label="Add margin note on highlight" onClick={() => openNotePanel('highlight')}>
          + Margin note
        </ToolButton>
        <span className="rte__sep" />
        <ToolButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          ⟸
        </ToolButton>
        <ToolButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          ⟺
        </ToolButton>
        <ToolButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          ⟹
        </ToolButton>
      </div>

      {notePanel && (
        <div className="rte__panel">
          <label>Margin note for the selected text</label>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What should the margin say about this?"
          />
          <div className="rte__panel-acts">
            <button type="button" className="btn btn--sm" onClick={confirmNote} disabled={!noteText.trim()}>
              {notePanel.style === 'highlight' ? 'Highlight & attach note' : 'Circle & attach note'}
            </button>
            {notePanel.style === 'highlight' ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setNotePanel({ style: 'circle' })}
              >
                Circle instead
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setNotePanel({ style: 'highlight' })}
              >
                Highlight instead
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setNotePanel(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
}
