'use client';

import { useEffect, useState } from 'react';

interface SeriesDay {
  day: number;
  title: string;
  ref: string;
  verse: string;
  move: string;
  reading: { context: string; closeRead: string; scholars: string; forYou: string } | null;
}

interface SeriesOption {
  id: string;
  title: string;
}

const emptyReading = { context: '', closeRead: '', scholars: '', forYou: '' };

export default function NotesEditor({ seriesOptions, initialSeriesId }: { seriesOptions: SeriesOption[]; initialSeriesId: string }) {
  const [seriesId, setSeriesId] = useState(initialSeriesId || seriesOptions[0]?.id || '');
  const [days, setDays] = useState<SeriesDay[] | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!seriesId) return;
    setDays(null);
    setOpenDay(null);
    fetch(`/api/admin/series/${seriesId}`)
      .then((r) => r.json() as Promise<{ series?: { days_json: string } }>)
      .then((json) => {
        if (!json.series) return;
        try {
          setDays(JSON.parse(json.series.days_json));
        } catch {
          setDays([]);
        }
      });
  }, [seriesId]);

  function updateDay(i: number, fn: (d: SeriesDay) => SeriesDay) {
    setDays((prev) => (prev ? prev.map((d, j) => (j === i ? fn(d) : d)) : prev));
  }

  async function save() {
    if (!days) return;
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/series/${seriesId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_json: JSON.stringify(days) }),
      });
      const json = (await res.json()) as { error?: string };
      setStatus(res.ok ? 'Saved & queued.' : json.error || 'Failed to save.');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  function addDay() {
    setDays((prev) => {
      const next = prev ? [...prev] : [];
      next.push({ day: next.length + 1, title: '', ref: '', verse: '', move: '', reading: { ...emptyReading } });
      return next;
    });
    setOpenDay((days?.length ?? 0));
  }

  const day = openDay != null && days ? days[openDay] : null;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <select aria-label="Series" value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button className="btn" onClick={addDay} disabled={!days}>
            + New note
          </button>
        </div>
        {!days && <p className="note">Loading…</p>}
        {days &&
          days.map((d, i) => {
            const empty = !d.verse && !d.reading?.context;
            return (
              <div className="row" key={i}>
                <div className="row__main">
                  <div className="row__t">
                    Day {d.day} · {d.title || '(untitled)'}
                  </div>
                  <div className="row__s">{d.ref || 'no reference'}</div>
                </div>
                <span className={`badge${empty ? ' badge--draft' : ' badge--live'}`}>{empty ? 'Empty' : 'Written'}</span>
                <button className="btn btn--ghost btn--sm" onClick={() => setOpenDay(i)}>
                  {empty ? 'Write it' : 'Edit'}
                </button>
              </div>
            );
          })}
        {days && days.length === 0 && <p className="note">No days yet — add one above.</p>}
      </div>

      {day && openDay != null && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Edit note — Day {day.day}</h3>
          <p className="hint">Passage, reading beats, and the margin note itself.</p>
          <div className="grid grid--2">
            <div className="field">
              <label>Title</label>
              <input value={day.title} onChange={(e) => updateDay(openDay, (d) => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="field">
              <label>Passage reference</label>
              <input value={day.ref} onChange={(e) => updateDay(openDay, (d) => ({ ...d, ref: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Passage text</label>
            <textarea value={day.verse} onChange={(e) => updateDay(openDay, (d) => ({ ...d, verse: e.target.value }))} />
          </div>
          <div className="field">
            <label>Move / frame</label>
            <input value={day.move} onChange={(e) => updateDay(openDay, (d) => ({ ...d, move: e.target.value }))} />
          </div>
          <div className="grid grid--2">
            <div className="field">
              <label>Context</label>
              <textarea
                value={day.reading?.context || ''}
                onChange={(e) => updateDay(openDay, (d) => ({ ...d, reading: { ...(d.reading || emptyReading), context: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>Close read</label>
              <textarea
                value={day.reading?.closeRead || ''}
                onChange={(e) => updateDay(openDay, (d) => ({ ...d, reading: { ...(d.reading || emptyReading), closeRead: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>What scholars see</label>
              <textarea
                value={day.reading?.scholars || ''}
                onChange={(e) => updateDay(openDay, (d) => ({ ...d, reading: { ...(d.reading || emptyReading), scholars: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>For you</label>
              <textarea
                value={day.reading?.forYou || ''}
                onChange={(e) => updateDay(openDay, (d) => ({ ...d, reading: { ...(d.reading || emptyReading), forYou: e.target.value } }))}
              />
            </div>
          </div>
          <div className="qa">
            <button className="btn" disabled={busy} onClick={save}>
              Save &amp; queue
            </button>
            <span className="note">{status}</span>
          </div>
        </div>
      )}
    </>
  );
}
