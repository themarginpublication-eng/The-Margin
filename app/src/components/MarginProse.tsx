'use client';

import { useEffect, useRef } from 'react';
import { escapeHtml } from '@/lib/rich-text';
import './margin-prose.css';

/**
 * Renders admin-authored rich HTML (from RichEditor) for readers, and turns
 * any highlight/circle mark that carries a `data-note-id` into a margin
 * annotation: a note in a side rail on wide viewports, connected to its
 * anchor with a wire, or shown inline right after the marked phrase on
 * narrow ones. Ported from the reading-view.html design prototype.
 */
export default function MarginProse({ html, ariaLabel }: { html: string; ariaLabel?: string }) {
  const textRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const railEl = railRef.current;
    const spreadEl = spreadRef.current;
    if (!textEl || !railEl || !spreadEl) return;

    railEl.innerHTML = '';
    const anchors = Array.from(textEl.querySelectorAll<HTMLElement>('[data-note-id]'));
    if (anchors.length === 0) return;

    const notes = new Map<string, HTMLElement>();
    const wires = new Map<string, HTMLElement>();

    anchors.forEach((a) => {
      const id = a.dataset.noteId!;
      const note = a.dataset.note || '';

      const inline = document.createElement('div');
      inline.className = 'mp__inline';
      inline.innerHTML = `<p>${escapeHtml(note)}</p>`;
      a.insertAdjacentElement('afterend', inline);

      const n = document.createElement('div');
      n.className = 'mp__note';
      n.dataset.noteId = id;
      n.innerHTML = `<p>${escapeHtml(note)}</p>`;
      railEl.appendChild(n);
      notes.set(id, n);

      const w = document.createElement('div');
      w.className = 'mp__wire';
      spreadEl.appendChild(w);
      wires.set(id, w);

      a.classList.add('mp__anchor');
    });

    function marginMode() {
      return railEl!.offsetParent !== null;
    }

    function layout() {
      if (!marginMode()) return;
      const railTop = railEl!.getBoundingClientRect().top;
      const spreadRect = spreadEl!.getBoundingClientRect();
      let minY = 0;
      anchors.forEach((a) => {
        const id = a.dataset.noteId!;
        const n = notes.get(id);
        const w = wires.get(id);
        if (!n || !w) return;
        const r = a.getBoundingClientRect();
        const y = Math.max(r.top - railTop, minY);
        n.style.top = `${y}px`;
        minY = y + n.offsetHeight + 24;
        const x1 = r.right - spreadRect.left + 8;
        const x2 = railEl!.getBoundingClientRect().left - spreadRect.left;
        w.style.top = `${r.top - spreadRect.top + r.height * 0.55}px`;
        w.style.left = `${x1}px`;
        w.style.width = `${Math.max(0, x2 - x1)}px`;
      });
      railEl!.style.minHeight = `${minY}px`;
    }

    function setActive(id: string | null) {
      anchors.forEach((a) => a.classList.toggle('active', a.dataset.noteId === id));
      notes.forEach((n, k) => n.classList.toggle('active', k === id));
      wires.forEach((w, k) => w.classList.toggle('on', k === id));
    }

    function onAnchorClick(this: HTMLElement, e: Event) {
      e.preventDefault();
      const id = this.dataset.noteId!;
      setActive(this.classList.contains('active') ? null : id);
    }
    anchors.forEach((a) => a.addEventListener('click', onAnchorClick));

    function onRailClick(e: Event) {
      const target = e.target as HTMLElement;
      const n = target.closest<HTMLElement>('.mp__note');
      if (!n) return;
      const id = n.dataset.noteId!;
      setActive(n.classList.contains('active') ? null : id);
    }
    railEl.addEventListener('click', onRailClick);

    window.addEventListener('resize', layout);
    if (document.fonts?.ready) document.fonts.ready.then(layout);
    layout();

    return () => {
      window.removeEventListener('resize', layout);
      anchors.forEach((a) => a.removeEventListener('click', onAnchorClick));
      railEl.removeEventListener('click', onRailClick);
      textEl.querySelectorAll('.mp__inline').forEach((el) => el.remove());
      spreadEl.querySelectorAll('.mp__wire').forEach((el) => el.remove());
    };
  }, [html]);

  return (
    <div className="mp__spread" ref={spreadRef}>
      <div className="mp__text" ref={textRef} role="region" aria-label={ariaLabel} dangerouslySetInnerHTML={{ __html: html }} />
      <aside className="mp__rail" ref={railRef} aria-label="Margin notes" />
    </div>
  );
}
