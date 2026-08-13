'use client';

import { useState } from 'react';

interface SeriesRow {
  id: string;
  title: string;
  subtitle: string | null;
  total_days: number;
  kind: 'book' | 'person' | 'passage' | 'idea';
  status: 'live' | 'scheduled' | 'draft' | 'retired';
}

const KIND_BADGE: Record<SeriesRow['kind'], string> = {
  book: 'badge--book',
  person: 'badge--person',
  passage: 'badge--passage',
  idea: 'badge--idea',
};

const STATUS_BADGE: Record<SeriesRow['status'], string> = {
  live: 'badge--live',
  scheduled: 'badge--sched',
  draft: 'badge--draft',
  retired: '',
};

export default function SeriesList({ series }: { series: SeriesRow[] }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = series.filter((s) => !q.trim() || s.title.toLowerCase().includes(q.trim().toLowerCase()));

  async function create() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled series' }),
      });
      const json = (await res.json()) as { series?: { id: string } };
      if (json.series) window.location.href = `/admin/series/${json.series.id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="toolbar">
        <input type="search" placeholder="Search series…" aria-label="Search series" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        <button className="btn" disabled={busy} onClick={create}>
          + New series
        </button>
      </div>
      {filtered.map((s) => (
        <div className="row" key={s.id}>
          <span className={`badge ${KIND_BADGE[s.kind]}`}>{s.kind}</span>
          <div className="row__main">
            <div className="row__t">{s.title}</div>
            <div className="row__s">
              {s.total_days} day{s.total_days === 1 ? '' : 's'}
              {s.subtitle ? ` · ${s.subtitle}` : ''}
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[s.status]}`}>{s.status}</span>
          <a className="btn btn--ghost btn--sm" href={`/admin/series/${s.id}`}>
            Edit
          </a>
        </div>
      ))}
      {filtered.length === 0 && <p className="note">No series found.</p>}
    </div>
  );
}
