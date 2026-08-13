'use client';

import { useEffect, useState } from 'react';

interface Block {
  key: string;
  label: string;
  page: string;
  pageTitle: string;
  defaultHtml: string;
  injection?: 'head' | 'body';
  override: string | null;
}

export default function SiteContentEditor() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/admin/site-content')
      .then((r) => r.json() as Promise<{ blocks: Block[] }>)
      .then((json) => {
        setBlocks(json.blocks);
        const initial: Record<string, string> = {};
        for (const b of json.blocks) initial[b.key] = b.override ?? b.defaultHtml;
        setDrafts(initial);
      });
  }, []);

  async function save(key: string) {
    setBusy((b) => ({ ...b, [key]: true }));
    setStatus((s) => ({ ...s, [key]: '' }));
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: drafts[key] }),
      });
      setStatus((s) => ({ ...s, [key]: res.ok ? 'Saved.' : 'Failed to save.' }));
    } catch {
      setStatus((s) => ({ ...s, [key]: 'Failed to save.' }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  async function reset(key: string, defaultHtml: string) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: null }),
      });
      setDrafts((d) => ({ ...d, [key]: defaultHtml }));
      setBlocks((prev) => prev?.map((b) => (b.key === key ? { ...b, override: null } : b)) ?? prev);
      setStatus((s) => ({ ...s, [key]: 'Reset to default.' }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  if (!blocks) {
    return <div className="center-loading">Loading…</div>;
  }

  const pages = Array.from(new Set(blocks.map((b) => b.pageTitle)));

  return (
    <>
      <p className="crumb">Site</p>
      <h1>Site copy</h1>
      <p className="sub">
        Each block below is a section of the live marketing site. Edit the wording directly, or replace a block
        entirely with your own HTML — whatever you paste in becomes exactly what renders. Leave a block untouched and
        it keeps using the copy that&rsquo;s already in the code.
      </p>

      {pages.map((pageTitle) => (
        <div className="admin-group" key={pageTitle}>
          <h2>{pageTitle}</h2>
          {blocks
            .filter((b) => b.pageTitle === pageTitle)
            .map((b) => (
              <div className="admin-block" key={b.key}>
                <div className="admin-block__head">
                  <span className="admin-block__label">
                    {b.label}
                    {b.injection ? ` (raw code, injected before </${b.injection === 'head' ? 'head' : 'body'}>)` : ''}
                  </span>
                  {b.override !== null && <span className="admin-block__flag">Customized</span>}
                </div>
                <textarea
                  value={drafts[b.key] ?? ''}
                  placeholder={b.injection ? 'e.g. <script>…</script> or extra markup' : undefined}
                  onChange={(e) => setDrafts((d) => ({ ...d, [b.key]: e.target.value }))}
                />
                <div className="admin-block__actions">
                  <button className="btn" disabled={busy[b.key]} onClick={() => save(b.key)}>
                    Save
                  </button>
                  {b.override !== null && (
                    <button
                      className="btn btn--ghost"
                      disabled={busy[b.key]}
                      onClick={() => reset(b.key, b.defaultHtml)}
                    >
                      Reset to default
                    </button>
                  )}
                  <span className="admin-block__saved">{status[b.key]}</span>
                </div>
              </div>
            ))}
        </div>
      ))}
    </>
  );
}
