import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * Shared shape for the two margin-annotation marks: both a highlight and a
 * circle can optionally carry a note, which is what turns a plain style
 * mark into a margin annotation. `noteId` orders multiple notes in the same
 * document for the published footnote list / rail.
 */
function annotationAttributes() {
  return {
    note: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) => el.getAttribute('data-note'),
      renderHTML: (attrs: { note: string | null }) => (attrs.note ? { 'data-note': attrs.note } : {}),
    },
    noteId: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) => el.getAttribute('data-note-id'),
      renderHTML: (attrs: { noteId: string | null }) => (attrs.noteId ? { 'data-note-id': attrs.noteId } : {}),
    },
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlightMark: {
      setHighlightMark: (attrs?: { note?: string | null; noteId?: string | null }) => ReturnType;
      unsetHighlightMark: () => ReturnType;
    };
    circleMark: {
      setCircleMark: (attrs?: { note?: string | null; noteId?: string | null }) => ReturnType;
      unsetCircleMark: () => ReturnType;
    };
  }
}

export const HighlightMark = Mark.create({
  name: 'highlightMark',
  addAttributes() {
    return annotationAttributes();
  },
  parseHTML() {
    return [{ tag: 'mark.tm-hl' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: 'tm-hl' }), 0];
  },
  addCommands() {
    return {
      setHighlightMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetHighlightMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const CircleMark = Mark.create({
  name: 'circleMark',
  addAttributes() {
    return annotationAttributes();
  },
  parseHTML() {
    return [{ tag: 'span.tm-circle' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'tm-circle' }), 0];
  },
  addCommands() {
    return {
      setCircleMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetCircleMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
