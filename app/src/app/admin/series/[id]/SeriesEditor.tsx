'use client';

import { useEffect, useState } from 'react';

interface SeriesRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  passage: string | null;
  total_days: number;
  days_json: string;
}

export default function SeriesEditor({ id }: { id: string }) {
  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [passage, setPassage] = useState('');
  const [daysJson, setDaysJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`/api/admin/series/${id}`)
      .then((r) => r.json() as Promise<{ series?: SeriesRow }>)
      .then((json) => {
        if (!json.series) return;
        setSeries(json.series);
        setTitle(json.series.title);
        setSubtitle(json.series.subtitle ?? '');
        setPassage(json.series.passage ?? '');
        setDaysJson(JSON.stringify(JSON.parse(json.series.days_json), null, 2));
      });
  }, [id]);

  async function save() {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/series/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtitle, passage, days_json: daysJson }),
      });
      const json = (await res.json()) as { error?: string };
      setStatus(res.ok ? 'Saved.' : json.error || 'Failed to save.');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  if (!series) return <div className="center-loading">Loading…</div>;

  return (
    <div className="admin">
      <h1>{series.title}</h1>
      <p className="admin__lede">
        Days is raw JSON — an array of {'{ day, title, ref, verse, move, reading: { context, closeRead, scholars,'}
        {' forYou } }'} objects, one per morning. Edit text in place, or add/remove days by editing the array.
      </p>
      <div className="admin__nav">
        <a href="/admin/series">← All series</a>
      </div>

      <div className="admin-group">
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Subtitle</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Passage</label>
          <input value={passage} onChange={(e) => setPassage(e.target.value)} />
        </div>
        <div className="field">
          <label>Days (JSON)</label>
          <textarea
            style={{ minHeight: 420, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
            value={daysJson}
            onChange={(e) => setDaysJson(e.target.value)}
          />
        </div>
        <div className="admin-block__actions">
          <button className="btn" disabled={busy} onClick={save}>
            Save
          </button>
          <span className="admin-block__saved">{status}</span>
        </div>
      </div>
    </div>
  );
}
