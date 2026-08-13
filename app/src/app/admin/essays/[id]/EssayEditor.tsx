'use client';

import { useEffect, useState } from 'react';
import RichEditor from '@/components/rich-editor/RichEditor';

interface Essay {
  id: string;
  slug: string;
  title: string;
  passage_ref: string | null;
  topic: string | null;
  summary: string | null;
  search_keywords: string | null;
  substack_url: string | null;
  status: 'draft' | 'published';
  body: string | null;
  passage_text: string | null;
  annotations_json: string;
  scheduled_at: string | null;
  archived_at: string | null;
}

export default function EssayEditor({ id }: { id: string }) {
  const [essay, setEssay] = useState<Essay | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`/api/admin/essays/${id}`)
      .then((r) => r.json() as Promise<{ essay?: Essay }>)
      .then((json) => json.essay && setEssay(json.essay));
  }, [id]);

  function set<K extends keyof Essay>(key: K, value: Essay[K]) {
    setEssay((e) => (e ? { ...e, [key]: value } : e));
  }

  async function save() {
    if (!essay) return;
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/essays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(essay),
      });
      setStatus(res.ok ? 'Saved.' : 'Failed to save.');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm('Delete this essay permanently?')) return;
    await fetch(`/api/admin/essays/${id}`, { method: 'DELETE' });
    window.location.href = '/admin/essays';
  }

  if (!essay) return <div className="center-loading">Loading…</div>;

  return (
    <div className="admin">
      <h1>{essay.title || 'Untitled essay'}</h1>
      <div className="admin__nav">
        <a href="/admin/essays">← All essays</a>
      </div>

      <div className="admin-group">
        <div className="field">
          <label>Title</label>
          <input value={essay.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="field">
          <label>Slug</label>
          <input value={essay.slug} onChange={(e) => set('slug', e.target.value)} />
        </div>
        <div className="field">
          <label>Passage reference</label>
          <input value={essay.passage_ref || ''} onChange={(e) => set('passage_ref', e.target.value)} />
        </div>
        <div className="field">
          <label>Topic</label>
          <input value={essay.topic || ''} onChange={(e) => set('topic', e.target.value)} />
        </div>
        <div className="field">
          <label>Summary</label>
          <textarea value={essay.summary || ''} onChange={(e) => set('summary', e.target.value)} />
        </div>
        <div className="field">
          <label>Search keywords</label>
          <input value={essay.search_keywords || ''} onChange={(e) => set('search_keywords', e.target.value)} />
        </div>
        <div className="field">
          <label>Substack URL</label>
          <input value={essay.substack_url || ''} onChange={(e) => set('substack_url', e.target.value)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={essay.status} onChange={(e) => set('status', e.target.value as Essay['status'])}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="field">
          <label>Scheduled publish (ISO timestamp, blank = none)</label>
          <input
            value={essay.scheduled_at || ''}
            placeholder="2026-01-01T12:00:00.000Z"
            onChange={(e) => set('scheduled_at', e.target.value || null)}
          />
        </div>
        <div className="field">
          <label>Passage text</label>
          <textarea style={{ minHeight: 100 }} value={essay.passage_text || ''} onChange={(e) => set('passage_text', e.target.value)} />
        </div>
        <div className="field">
          <label>Body</label>
          <RichEditor minHeight={300} value={essay.body || ''} onChange={(html) => set('body', html)} placeholder="The essay itself…" />
          <p className="hint">
            Use Highlight or Circle with &ldquo;+ Margin note&rdquo; to attach a margin annotation directly to a phrase — that
            replaces hand-writing the JSON below.
          </p>
        </div>
        <div className="field">
          <label>Legacy annotations (JSON array of {'{ anchor, note, type }'})</label>
          <textarea
            style={{ minHeight: 100, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
            value={essay.annotations_json}
            onChange={(e) => set('annotations_json', e.target.value)}
          />
        </div>

        <div className="admin-block__actions">
          <button className="btn" disabled={busy} onClick={save}>
            Save
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={del}>
            Delete
          </button>
          <span className="admin-block__saved">{status}</span>
        </div>
      </div>
    </div>
  );
}
