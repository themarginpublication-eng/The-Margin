'use client';

import { useState } from 'react';

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
  name: string | null;
  tags: string | null;
  notes: string | null;
  status: 'active' | 'unsubscribed';
}

export default function SubscriberList({ initial }: { initial: WaitlistRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WaitlistRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return r.email.toLowerCase().includes(needle) || (r.name || '').toLowerCase().includes(needle) || (r.tags || '').toLowerCase().includes(needle);
  });

  function open(r: WaitlistRow) {
    setOpenId(r.id);
    setDraft({ ...r });
    setStatus('');
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/subscribers/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draft.email, name: draft.name, tags: draft.tags, notes: draft.notes, status: draft.status }),
      });
      const json = (await res.json()) as { subscriber?: WaitlistRow; error?: string };
      if (res.ok && json.subscriber) {
        setRows((prev) => prev.map((r) => (r.id === draft.id ? json.subscriber! : r)));
        setStatus('Saved.');
      } else {
        setStatus(json.error || 'Failed to save.');
      }
    } catch {
      setStatus('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm('Remove this subscriber permanently?')) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (openId === id) {
        setOpenId(null);
        setDraft(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const openRow = openId ? rows.find((r) => r.id === openId) : null;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search email, name, or tag…" aria-label="Search subscribers" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filtered.map((r) => (
          <div className="row" key={r.id}>
            <span className={`badge${r.status === 'unsubscribed' ? '' : ' badge--live'}`}>{r.status === 'unsubscribed' ? 'Unsubscribed' : 'Active'}</span>
            <div className="row__main">
              <div className="row__t">{r.name ? `${r.name} · ${r.email}` : r.email}</div>
              <div className="row__s">
                Joined {new Date(r.created_at).toLocaleDateString()} · {r.source || 'unknown source'}
                {r.tags ? ` · ${r.tags}` : ''}
              </div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => open(r)}>
              Edit
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="note">No subscribers found.</p>}
      </div>

      {openRow && draft && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Edit subscriber</h3>
          <div className="grid grid--2">
            <div className="field">
              <label>Email</label>
              <input value={draft.email} onChange={(e) => setDraft((d) => (d ? { ...d, email: e.target.value } : d))} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={draft.name || ''} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
            </div>
          </div>
          <div className="grid grid--2">
            <div className="field">
              <label>Tags</label>
              <input
                placeholder="comma, separated, tags"
                value={draft.tags || ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, tags: e.target.value } : d))}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={draft.status} onChange={(e) => setDraft((d) => (d ? { ...d, status: e.target.value as WaitlistRow['status'] } : d))}>
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Internal notes</label>
            <textarea value={draft.notes || ''} onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))} />
          </div>
          <div className="qa">
            <button className="btn" disabled={busy} onClick={save}>
              Save
            </button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => del(draft.id)}>
              Delete
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setOpenId(null);
                setDraft(null);
              }}
            >
              Close
            </button>
            <span className="note">{status}</span>
          </div>
        </div>
      )}
    </>
  );
}
