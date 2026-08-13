'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_MOVES,
  FRAMES,
  MoveKey,
  QT,
  QTKey,
  SEED_STATE,
  SEEDS,
  SeedType,
  StudioState,
  plan as planFor,
} from '@/lib/studio-data';
import RichEditor from '@/components/rich-editor/RichEditor';
import { isRichTextEmpty } from '@/lib/rich-text';
import './studio.css';

type Tab = 'series' | MoveKey | 'free' | 'essays';
type Overlay = 'method' | 'checks' | null;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function onMoves(s: StudioState) {
  return s.moves.filter((m) => m.on);
}

function hasMove(s: StudioState, k: MoveKey) {
  return s.mode === 'guided' && s.moves.some((m) => m.k === k && m.on);
}

function exeg(s: StudioState) {
  const subject = (s.subject || '').trim();
  const complement = (s.complement || '').trim();
  return subject && complement ? `${subject} ${complement}.` : '';
}

function usedIds(s: StudioState) {
  return s.days.map((d) => d.obs).filter((x): x is number => x != null);
}

function moveInfo(s: StudioState, k: MoveKey) {
  const dealt = s.days.filter((d) => d.obs).length;
  const composed = s.days.filter((d) => !isRichTextEmpty(d.hook) && !isRichTextEmpty(d.book) && !isRichTextEmpty(d.look) && !isRichTextEmpty(d.took)).length;
  switch (k) {
    case 'unit':
      return {
        done: !!(s.unit.start && s.unit.end),
        note: s.unit.start && s.unit.end ? `${s.unit.start} – ${s.unit.end}` : 'No boundaries set',
      };
    case 'obs':
      return { done: s.obs.length >= 6, note: `${s.obs.length} observations · target 3× a single post` };
    case 'idea':
      return {
        done: !!(exeg(s) && s.homiletical),
        note: exeg(s) && s.homiletical ? 'Exegetical and homiletical set' : 'Subject + complement incomplete',
      };
    case 'end':
      return {
        done: !!(s.capability && s.dayCount),
        note: s.capability ? `${s.dayCount} days · capability named` : 'No capability named',
      };
    case 'days':
      return { done: s.days.length > 0 && dealt === s.days.length, note: `${dealt} of ${s.days.length} days carry one observation` };
    case 'compose':
      return { done: s.days.length > 0 && composed === s.days.length, note: `${composed} of ${s.days.length} days fully shaped` };
  }
}

function targetDayCount(s: StudioState) {
  return hasMove(s, 'end') ? planFor(s.dayCount).length : Math.max(s.days.length, 1);
}

function syncDays(s: StudioState): StudioState {
  const n = targetDayCount(s);
  const d = [...s.days];
  while (d.length < n) d.push({ obs: null, hook: '', book: '', look: '', took: '', frame: FRAMES[d.length % FRAMES.length] });
  return { ...s, days: d.slice(0, n) };
}

const TAB_TITLES: Record<MoveKey, string> = {
  unit: 'Cut the unit',
  obs: 'Observe',
  idea: 'The idea',
  end: 'The last day',
  days: 'Deal the days',
  compose: 'Shape the day',
};

const CHECK_DEFS: { owner: MoveKey; title: string; note: string; pass: (s: StudioState) => boolean }[] = [
  {
    owner: 'days',
    title: 'Every day carries one observation',
    note: 'Move 05 assigns exactly one per day.',
    pass: (s) => s.days.length > 0 && s.days.every((d) => d.obs),
  },
  {
    owner: 'obs',
    title: 'Every observation has a reference',
    note: 'A day without a verbatim citation is a day about you.',
    pass: (s) => s.obs.length > 0 && s.obs.every((o) => o.ref),
  },
  {
    owner: 'days',
    title: 'No observation used twice',
    note: 'Repeats read as one long post nobody finishes.',
    pass: (s) => {
      const used = usedIds(s);
      return new Set(used).size === used.length;
    },
  },
  {
    owner: 'idea',
    title: 'The homiletical idea is under 16 words',
    note: 'A bullet, not buckshot.',
    pass: (s) => !!s.homiletical && (s.homiletical || '').trim().split(/\s+/).filter(Boolean).length <= 16,
  },
  {
    owner: 'end',
    title: 'The last day points outside the seed',
    note: 'If the hand-over stays inside the passage you taught a passage, not a skill.',
    pass: (s) => /read|name|find|count|try|another|elsewhere/i.test(s.capability || ''),
  },
  {
    owner: 'compose',
    title: 'Frames vary across the series',
    note: 'Five pull-quotes in a row is one long post.',
    pass: (s) => new Set(s.days.map((d) => d.frame)).size >= Math.min(3, s.days.length),
  },
  {
    owner: 'compose',
    title: 'Day one needs no further research',
    note: 'If day one still needs work the series is queued, not cut.',
    pass: (s) => s.days.length > 0 && (['hook', 'book', 'look', 'took'] as const).every((f) => !isRichTextEmpty(s.days[0][f])),
  },
];

interface DraftListItem {
  id: string;
  title: string;
  updated_at: string;
}

interface SeriesRecord {
  id: string;
  title: string;
  subtitle: string | null;
  kind: 'book' | 'person' | 'passage' | 'idea';
  status: 'live' | 'scheduled' | 'draft' | 'retired';
  description: string | null;
}

export default function StudioEditor({ id }: { id: string }) {
  const [s, setS] = useState<StudioState | null>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('series');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [status, setStatus] = useState('');
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cDay, setCDay] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/studio/${id}`)
      .then((r) => r.json() as Promise<{ draft?: { title: string; data_json: string; series_id: string | null } }>)
      .then((json) => {
        if (!json.draft) return;
        const state = JSON.parse(json.draft.data_json) as StudioState;
        setS(state);
        setSeriesId(json.draft.series_id ?? null);
      });
    fetch('/api/admin/studio')
      .then((r) => r.json() as Promise<{ drafts?: DraftListItem[] }>)
      .then((json) => setDrafts(json.drafts || []));
  }, [id]);

  function update(fn: (s: StudioState) => StudioState) {
    setS((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      queueSave(next);
      return next;
    });
  }

  function queueSave(next: StudioState) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus('Saving…');
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/studio/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: (next.mode === 'free' ? next.free.title : next.title) || 'Untitled series', data: next }),
        });
        setStatus(res.ok ? 'Saved' : 'Failed to save');
      } catch {
        setStatus('Failed to save');
      }
    }, 500);
  }

  const free = s?.mode === 'free';
  const moveList = useMemo(() => (s ? onMoves(s) : []), [s]);

  useEffect(() => {
    if (!s) return;
    const okTabs: Tab[] = ['series', 'essays', ...(free ? (['free'] as Tab[]) : moveList.map((m) => m.k as Tab))];
    if (!okTabs.includes(tab)) setTab('series');
  }, [s, free, moveList, tab]);

  useEffect(() => {
    if (tab === 'days' || tab === 'compose') update((prev) => syncDays(prev));
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function addStandaloneEssay() {
    const res = await fetch('/api/admin/essays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled essay' }),
    });
    if (res.ok) {
      setOverlay(null);
      setTab('essays');
    }
  }

  if (!s) return <div className="center-loading">Loading…</div>;

  return (
    <div className="studio-main">
      <div className="studio-toolbar">
        <select
          className="studio-draftsel"
          value={id}
          onChange={(e) => {
            window.location.href = `/admin/studio/${e.target.value}`;
          }}
        >
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <span className="studio-badge">{free ? 'Free' : SEEDS[s.seedType].label}</span>
        <span className="studio-spacer" />
        <button className="btn btn--ghost" onClick={() => setOverlay('method')}>
          Method settings
        </button>
        <button className="btn btn--ghost" onClick={addStandaloneEssay}>
          + Standalone essay
        </button>
        <button className="btn btn--ghost" onClick={() => setOverlay('checks')}>
          Readiness
        </button>
      </div>

      {overlay ? (
        <div className="studio-st">
          {overlay === 'method' && <MethodPanel s={s} update={update} />}
          {overlay === 'checks' && <ChecksPanel s={s} />}
          <button className="studio-ghost" style={{ marginTop: 22 }} onClick={() => setOverlay(null)}>
            ← Back to workspace
          </button>
        </div>
      ) : (
        <div className="studio-st">
          <div className="studio-eye">Content Studio · {free ? s.free.title || 'Untitled' : s.title || 'Untitled'}</div>
          <h1>
            Series, days and essays, <em>in one place.</em>
          </h1>
          <p className="studio-lede">
            One workspace for the whole thing — the series itself, its days, and its essays, made in the same place. Six moves carry a
            series from a seed to a day-by-day plan; essays sit outside the method and can be written any time, attached to this series or
            standalone. Everything saved here appears on the Series, Daily notes, and Essays pages for quick edits.
          </p>

          <div className="studio-tabs">
            <button className={tab === 'series' ? 'on' : ''} onClick={() => setTab('series')}>
              <span className="n n--w">Series</span>
              <span className="t">Name &amp; description</span>
            </button>
            {free ? (
              <button className={tab === 'free' ? 'on' : ''} onClick={() => setTab('free')}>
                <span className="n n--w">Draft</span>
                <span className="t">No moves, no gates</span>
              </button>
            ) : (
              moveList.map((m, i) => {
                const info = moveInfo(s, m.k)!;
                return (
                  <button
                    key={m.k}
                    className={`${tab === m.k ? 'on' : ''} ${info.done ? 'done' : ''}`}
                    onClick={() => setTab(m.k as Tab)}
                  >
                    <span className="n">{pad(i + 1)}</span>
                    <span className="t">{m.t}</span>
                  </button>
                );
              })
            )}
            <button className={tab === 'essays' ? 'on' : ''} onClick={() => setTab('essays')}>
              <span className="n n--w">Essays</span>
              <span className="t">Outside the method</span>
            </button>
          </div>

          <div className="studio-tabpanel">
            {tab === 'series' && <SeriesTab draftId={id} s={s} seriesId={seriesId} onLinked={setSeriesId} onGoUnit={() => setTab('unit')} />}
            {tab === 'free' && <FreePanel s={s} update={update} />}
            {tab === 'unit' && <UnitPanel s={s} update={update} />}
            {tab === 'obs' && <ObsPanel s={s} update={update} />}
            {tab === 'idea' && <IdeaPanel s={s} update={update} />}
            {tab === 'end' && <EndPanel s={s} update={update} />}
            {tab === 'days' && <DaysPanel s={s} update={update} />}
            {tab === 'compose' && <ComposePanel s={s} update={update} cDay={cDay} setCDay={setCDay} />}
            {tab === 'essays' && <EssaysTab seriesId={seriesId} />}
          </div>
        </div>
      )}

      <p className="studio-save-status">{status}</p>
    </div>
  );
}

type Update = (fn: (s: StudioState) => StudioState) => void;

function SeriesTab({
  draftId,
  s,
  seriesId,
  onLinked,
  onGoUnit,
}: {
  draftId: string;
  s: StudioState;
  seriesId: string | null;
  onLinked: (id: string) => void;
  onGoUnit: () => void;
}) {
  const [form, setForm] = useState({
    name: s.mode === 'free' ? s.free.title : s.title,
    kind: (s.seedType === 'book' ? 'book' : s.seedType === 'person' ? 'person' : s.seedType === 'passage' ? 'passage' : 'idea') as
      | 'book'
      | 'person'
      | 'passage'
      | 'idea',
    subtitle: '',
    status: 'draft' as 'live' | 'scheduled' | 'draft' | 'retired',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [publishMsg, setPublishMsg] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    fetch(`/api/admin/series/${seriesId}`)
      .then((r) => r.json() as Promise<{ series?: SeriesRecord }>)
      .then((json) => {
        if (!json.series) return;
        const r = json.series;
        setForm({ name: r.title, kind: r.kind, subtitle: r.subtitle || '', status: r.status, description: r.description || '' });
      });
  }, [seriesId]);

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/studio/${draftId}/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { series?: { id: string }; error?: string };
      if (res.ok && json.series) {
        onLinked(json.series.id);
        setMsg('Saved.');
      } else {
        setMsg(json.error || 'Failed to save.');
      }
    } catch {
      setMsg('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setPublishMsg('');
    try {
      const res = await fetch(`/api/admin/studio/${draftId}/publish`, { method: 'POST' });
      const json = (await res.json()) as { series?: { title: string }; error?: string };
      setPublishMsg(res.ok && json.series ? `Days published to “${json.series.title}”.` : json.error || 'Failed to publish.');
    } catch {
      setPublishMsg('Failed to publish.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="studio-grid">
      <div className="studio-card">
        <h2 className="studio-h2">
          What the series <em>is.</em>
        </h2>
        <p className="studio-sub">
          The words a reader meets before they read a single day — on the series page, in the subscribe picker, and in the welcome
          email.
        </p>
        <div className="studio-do">
          <b>Set once, used everywhere</b>
          Changing anything here updates the site, the picker, and the welcome email together. Nothing needs re-entering on the Series
          page.
        </div>
        <div className="studio-row2">
          <div className="studio-field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="studio-field">
            <label>Seed</label>
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as typeof f.kind }))}>
              <option value="book">A whole book</option>
              <option value="passage">A single passage</option>
              <option value="person">A single person</option>
              <option value="idea">A single idea</option>
            </select>
          </div>
        </div>
        <div className="studio-row2">
          <div className="studio-field">
            <label>One-line subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div className="studio-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="scheduled">Scheduled</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
        <div className="studio-field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="studio-qa">
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save series'}
          </button>
          <button className="btn btn--ghost" onClick={onGoUnit}>
            Begin move 01 →
          </button>
          {seriesId && (
            <button className="btn btn--ghost" disabled={publishing} onClick={publish}>
              {publishing ? 'Publishing…' : 'Publish days to series'}
            </button>
          )}
        </div>
        {msg && <p className="studio-hint">{msg}</p>}
        {publishMsg && <p className="studio-hint">{publishMsg}</p>}
        {!seriesId && <p className="studio-hint">Save the series once before publishing days or attaching essays to it.</p>}
      </div>
      <div className="studio-card">
        <h3>Why save the series first</h3>
        <p className="studio-hint">One workspace, one record.</p>
        <p>
          Saving here creates the same row the Series admin page edits — status starts as Draft, so nothing shows on the site until you
          flip it. Essays can attach to this series as soon as it exists, before a single day is written.
        </p>
      </div>
    </div>
  );
}

interface EssayRecord {
  id: string;
  title: string;
  slug: string;
  passage_ref: string | null;
  series_id: string | null;
  topic: string | null;
  summary: string | null;
  body: string | null;
  status: 'draft' | 'published';
}

function EssaysTab({ seriesId }: { seriesId: string | null }) {
  const [essays, setEssays] = useState<EssayRecord[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [essay, setEssay] = useState<EssayRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');

  function reload() {
    fetch(`/api/admin/essays?seriesId=${seriesId ?? ''}`)
      .then((r) => r.json() as Promise<{ essays?: EssayRecord[] }>)
      .then((json) => setEssays(json.essays || []));
  }

  useEffect(reload, [seriesId]);

  useEffect(() => {
    if (!openId) {
      setEssay(null);
      return;
    }
    fetch(`/api/admin/essays/${openId}`)
      .then((r) => r.json() as Promise<{ essay?: EssayRecord }>)
      .then((json) => json.essay && setEssay(json.essay));
  }, [openId]);

  const filtered = essays.filter((e) => !q.trim() || e.title.toLowerCase().includes(q.trim().toLowerCase()));

  function set<K extends keyof EssayRecord>(key: K, value: EssayRecord[K]) {
    setEssay((e) => (e ? { ...e, [key]: value } : e));
  }

  async function saveEssay(status?: 'draft' | 'published') {
    if (!essay) return;
    setBusy(true);
    setMsg('');
    try {
      const body = status ? { ...essay, status } : essay;
      const res = await fetch(`/api/admin/essays/${essay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setMsg(res.ok ? 'Saved.' : 'Failed to save.');
      reload();
    } catch {
      setMsg('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-grid">
      <div className="studio-col" style={{ gridColumn: '1 / -1' }}>
        <div className="studio-card">
          <h2 className="studio-h2">
            Essays, <em>on their own terms.</em>
          </h2>
          <p className="studio-sub">
            No moves, no gates, no question types. Write an essay whenever one arrives — attached to this series, or standalone and
            belonging to nothing.
          </p>
          <div className="studio-do">
            <b>Outside the method by design</b>
            An essay does not need a dealt day or a tagged observation.
          </div>
          <div className="studio-row2" style={{ marginBottom: 8 }}>
            <input placeholder="Search essays…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span />
          </div>
          {filtered.map((e) => (
            <div className="studio-row" key={e.id}>
              <span className={`studio-badge${e.series_id ? ' studio-badge--book' : ''}`}>{e.series_id ? 'This series' : 'Standalone'}</span>
              <div className="studio-row__main">
                <div className="studio-row__t">{e.title}</div>
                <div className="studio-row__s">
                  {e.passage_ref || 'No reference'} · {e.status}
                </div>
              </div>
              <button className="btn btn--ghost" onClick={() => setOpenId(e.id)}>
                Open
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="studio-note">Nothing yet.</p>}
        </div>

        {essay && (
          <div className="studio-card" style={{ marginTop: 16 }}>
            <h3>{essay.title || 'Untitled essay'}</h3>
            <div className="studio-row2">
              <div className="studio-field">
                <label>Title</label>
                <input value={essay.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="studio-field">
                <label>Passage reference</label>
                <input value={essay.passage_ref || ''} onChange={(e) => set('passage_ref', e.target.value)} />
              </div>
            </div>
            <div className="studio-row2">
              <div className="studio-field">
                <label>Belongs to</label>
                <select
                  value={essay.series_id ?? ''}
                  onChange={(e) => set('series_id', e.target.value || null)}
                >
                  <option value="">— standalone —</option>
                  {seriesId && <option value={seriesId}>This series</option>}
                </select>
              </div>
              <div className="studio-field">
                <label>Topic</label>
                <input value={essay.topic || ''} onChange={(e) => set('topic', e.target.value)} />
              </div>
            </div>
            <div className="studio-field">
              <label>One-line summary</label>
              <input value={essay.summary || ''} onChange={(e) => set('summary', e.target.value)} />
            </div>
            <div className="studio-field">
              <label>Essay</label>
              <RichEditor minHeight={220} value={essay.body || ''} onChange={(html) => set('body', html)} placeholder="The essay itself…" />
            </div>
            <div className="studio-qa">
              <button className="btn" disabled={busy} onClick={() => saveEssay('published')}>
                Publish
              </button>
              <button className="btn btn--ghost" disabled={busy} onClick={() => saveEssay('draft')}>
                Save draft
              </button>
              <a className="btn btn--ghost" href={`/admin/essays/${essay.id}`} target="_blank" rel="noreferrer">
                Open full editor
              </a>
            </div>
            {msg && <p className="studio-hint">{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function FreePanel({ s, update }: { s: StudioState; update: Update }) {
  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-field">
          <label>Series title</label>
          <input value={s.free.title} onChange={(e) => update((p) => ({ ...p, free: { ...p.free, title: e.target.value } }))} />
        </div>
        <div className="studio-field">
          <label>Working notes</label>
          <textarea
            style={{ minHeight: 180 }}
            value={s.free.notes}
            onChange={(e) => update((p) => ({ ...p, free: { ...p.free, notes: e.target.value } }))}
          />
        </div>
        <div className="studio-lab">Days</div>
        {s.free.days.map((d, i) => (
          <div className="studio-fday" key={i}>
            <div className="studio-fday__n">{pad(i + 1)}</div>
            <div>
              <input
                type="text"
                placeholder="What this day is"
                value={d.t}
                onChange={(e) =>
                  update((p) => ({ ...p, free: { ...p.free, days: p.free.days.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)) } }))
                }
              />
              <RichEditor
                placeholder="The day itself"
                value={d.b}
                onChange={(html) =>
                  update((p) => ({ ...p, free: { ...p.free, days: p.free.days.map((x, j) => (j === i ? { ...x, b: html } : x)) } }))
                }
              />
            </div>
            <button
              className="studio-xbtn"
              aria-label="Delete day"
              onClick={() =>
                update((p) => {
                  const days = p.free.days.filter((_, j) => j !== i);
                  return { ...p, free: { ...p.free, days: days.length ? days : [{ t: '', b: '' }] } };
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <button className="studio-ghost" onClick={() => update((p) => ({ ...p, free: { ...p.free, days: [...p.free.days, { t: '', b: '' }] } }))}>
          Add a day
        </button>
      </div>
      <div className="studio-col">
        <div className="studio-card">
          <h3>Why free mode exists</h3>
          <p className="studio-hint">
            Not every seed needs the six-move method. Free mode keeps your guided series data untouched underneath — switch modes any time
            without losing either.
          </p>
        </div>
      </div>
    </div>
  );
}

function UnitPanel({ s, update }: { s: StudioState; update: Update }) {
  const sd = SEEDS[s.seedType];
  const markers = [
    ['speaker', 'Change of speaker'],
    ['place', 'Change of place'],
    ['time', 'Change of time'],
    ['audience', 'Change of audience'],
    ['genre', 'Change of genre'],
    ['inclusio', 'Inclusio'],
  ];
  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-row2">
          <div className="studio-field">
            <label>Series title</label>
            <input value={s.title} onChange={(e) => update((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="studio-field">
            <label>Seed type</label>
            <select value={s.seedType} onChange={(e) => update((p) => ({ ...p, seedType: e.target.value as SeedType }))}>
              {Object.entries(SEEDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="studio-field">
          <label>The seed</label>
          <input value={s.seed} onChange={(e) => update((p) => ({ ...p, seed: e.target.value }))} placeholder="e.g. Ruth" />
        </div>
        <div className="studio-row2">
          <div className="studio-field">
            <label>Starts at</label>
            <input value={s.unit.start} onChange={(e) => update((p) => ({ ...p, unit: { ...p.unit, start: e.target.value } }))} />
          </div>
          <div className="studio-field">
            <label>Ends at</label>
            <input value={s.unit.end} onChange={(e) => update((p) => ({ ...p, unit: { ...p.unit, end: e.target.value } }))} />
          </div>
        </div>
        <div className="studio-field">
          <label>Which markers justify the cut</label>
          <div className="studio-chips studio-chips--wrap">
            {markers.map(([k, label]) => (
              <button
                key={k}
                className={`studio-chip${s.unit.markers.includes(k) ? ' on' : ''}`}
                onClick={() =>
                  update((p) => {
                    const has = p.unit.markers.includes(k);
                    return { ...p, unit: { ...p.unit, markers: has ? p.unit.markers.filter((m) => m !== k) : [...p.unit.markers, k] } };
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-field">
          <label>Where others cut it differently</label>
          <textarea value={s.unit.seam} onChange={(e) => update((p) => ({ ...p, unit: { ...p.unit, seam: e.target.value } }))} />
          <p className="studio-hint">There is no unified standard for pericope division, so this field is evidence, not pedantry.</p>
        </div>
      </div>
      <div className="studio-card studio-card--rust">
        <div className="studio-lab">Cut by</div>
        <p>{sd.cut}</p>
        <div className="studio-lab" style={{ marginTop: 12 }}>
          One day is
        </div>
        <p>{sd.day}</p>
        <div className="studio-lab studio-lab--warn" style={{ marginTop: 12 }}>
          The trap
        </div>
        <p>{sd.trap}</p>
      </div>
    </div>
  );
}

function ObsPanel({ s, update }: { s: StudioState; update: Update }) {
  const [text, setText] = useState('');
  const [ref, setRef] = useState('');
  const used = usedIds(s);
  const n = s.obs.length;

  function capture() {
    const tx = text.trim();
    if (!tx) return;
    update((p) => ({ ...p, obs: [...p.obs, { id: Date.now(), text: tx, ref: ref.trim(), qt: null }] }));
    setText('');
    setRef('');
  }

  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-field">
          <label>What is there</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="studio-row2">
          <input placeholder="Reference" value={ref} onChange={(e) => setRef(e.target.value)} />
          <button className="btn" onClick={capture}>
            Capture
          </button>
        </div>

        <div className="studio-gauge">
          <div className="studio-gauge__track">
            <div className="studio-gauge__fill" style={{ width: `${Math.min(100, (n / 12) * 100)}%` }} />
          </div>
          <div className="studio-gauge__l">
            {n} captured · {n < 6 ? 'thin' : n < 12 ? 'workable' : 'surplus'} — aim past 12 so the cut is a choice, not a scrape
          </div>
        </div>

        {s.obs.length === 0 && <p className="studio-note">Nothing captured yet. Observation comes before interpretation — write what is there, not what it means.</p>}
        {s.obs.map((o) => (
          <div key={o.id} className={`studio-ob${o.qt ? ` studio-ob--${QT[o.qt].cls}` : ''}`}>
            <div className="studio-ob__body">
              <div className="studio-ob__t">{o.text}</div>
              <div className="studio-ob__r">
                {o.ref || 'no reference'}
                {used.includes(o.id) ? (
                  <>
                    {' '}
                    · <b>on a day</b>
                  </>
                ) : null}
              </div>
            </div>
            <div className="studio-ob__acts">
              {(Object.keys(QT) as QTKey[]).map((k) => (
                <button
                  key={k}
                  className={`studio-qbtn studio-qbtn--${QT[k].cls}${o.qt === k ? ' on' : ''}`}
                  title={QT[k].label}
                  onClick={() => update((p) => ({ ...p, obs: p.obs.map((x) => (x.id === o.id ? { ...x, qt: x.qt === k ? null : k } : x)) }))}
                >
                  {QT[k].short}
                </button>
              ))}
              <button
                className="studio-xbtn"
                aria-label="Delete"
                onClick={() =>
                  update((p) => ({
                    ...p,
                    obs: p.obs.filter((x) => x.id !== o.id),
                    days: p.days.map((d) => (d.obs === o.id ? { ...d, obs: null } : d)),
                  }))
                }
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="studio-card">
        <h3>Tagging rules</h3>
        <p><b>{QT.mean.label}</b> — meaning: what the text itself says, before any application.</p>
        <p><b>{QT.true.label}</b> — truth: a claim the text stakes, that could be checked against reality.</p>
        <p><b>{QT.diff.label}</b> — difference: what changes if the claim is true.</p>
      </div>
    </div>
  );
}

function IdeaPanel({ s, update }: { s: StudioState; update: Update }) {
  const e = exeg(s);
  const w = (s.homiletical || '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-field">
          <label>Subject — what am I talking about</label>
          <input value={s.subject} onChange={(ev) => update((p) => ({ ...p, subject: ev.target.value }))} />
        </div>
        <div className="studio-field">
          <label>Complement — what am I saying about it</label>
          <textarea value={s.complement} onChange={(ev) => update((p) => ({ ...p, complement: ev.target.value }))} />
        </div>
        <div className="studio-assembled">{e || <span className="studio-muted">Subject + complement will assemble here.</span>}</div>

        <div className="studio-field" style={{ marginTop: 16 }}>
          <label>Homiletical idea — the same thing, for your reader</label>
          <textarea value={s.homiletical} onChange={(ev) => update((p) => ({ ...p, homiletical: ev.target.value }))} />
        </div>
        {w > 0 && <div className={`studio-fh${w > 16 ? ' studio-fh--warn' : ''}`}>{w} words · {w > 16 ? 'over the cap' : 'within the cap'}</div>}
      </div>
      <div className="studio-card">
        <h3>Exegetical vs. homiletical</h3>
        <p className="studio-hint">
          The exegetical idea is what the text meant. The homiletical idea is the same claim, stated for a reader who wasn&rsquo;t there —
          capped at 16 words so it fits in a single line of copy.
        </p>
      </div>
    </div>
  );
}

function EndPanel({ s, update }: { s: StudioState; update: Update }) {
  const p = planFor(s.dayCount);
  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-field">
          <label>Capability</label>
          <textarea value={s.capability} onChange={(e) => update((prev) => ({ ...prev, capability: e.target.value }))} />
          <p className="studio-hint">A verb they perform on a text you never covered. &ldquo;Appreciate Ruth&rdquo; is not a capability.</p>
        </div>
        <div className="studio-field">
          <label>Length</label>
          <select
            value={s.dayCount}
            onChange={(e) => update((prev) => syncDays({ ...prev, dayCount: Number(e.target.value) }))}
          >
            {[3, 5, 7, 10, 14].map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </div>

        <div className="studio-plan">
          {p.map((k, i) => (
            <div key={i} className={`studio-dslot studio-dslot--${QT[k].cls}`}>
              <div className="studio-dslot__n">Day {i + 1}</div>
              <div className="studio-dslot__q">{QT[k].short}</div>
            </div>
          ))}
        </div>
        <p className="studio-hint">
          {p.filter((x) => x === 'mean').length} meaning · {p.filter((x) => x === 'true').length} truth · {p.filter((x) => x === 'diff').length} difference
        </p>
      </div>
      <div className="studio-card">
        <h3>Why the order is fixed</h3>
        <p className="studio-hint">Meaning before truth before difference — you can&rsquo;t apply what you haven&rsquo;t verified, and can&rsquo;t verify what you haven&rsquo;t understood. 10 and 14 repeat the cycle rather than extending it.</p>
      </div>
    </div>
  );
}

function DaysPanel({ s, update }: { s: StudioState; update: Update }) {
  const typed = hasMove(s, 'end');
  const p = typed ? planFor(s.dayCount) : [];
  const used = usedIds(s);

  return (
    <div className="studio-grid">
      <div className="studio-col">
        <div className="studio-days-board">
          {s.days.map((d, i) => {
            const k = typed ? p[i] : null;
            const o = d.obs ? s.obs.find((x) => x.id === d.obs) : null;
            const pool = k ? s.obs.filter((x) => x.qt === k || x.id === d.obs) : s.obs;
            return (
              <div key={i} className={`studio-dcard${k ? ` studio-dcard--${QT[k].cls}` : ''}`}>
                <div className="studio-dcard__hd">
                  <span>Day {i + 1}</span>
                  <span className={`studio-qtag${k ? ` studio-qtag--${QT[k].cls}` : ''}`}>{k ? QT[k].label : 'Any observation'}</span>
                </div>
                <select
                  value={d.obs ?? ''}
                  onChange={(e) =>
                    update((prev) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      return { ...prev, days: prev.days.map((x, j) => (j === i ? { ...x, obs: val } : x)) };
                    })
                  }
                >
                  <option value="">— choose an observation —</option>
                  {pool.map((x) => (
                    <option key={x.id} value={x.id} disabled={used.includes(x.id) && x.id !== d.obs}>
                      {x.text.slice(0, 70)}
                      {x.text.length > 70 ? '…' : ''}
                    </option>
                  ))}
                </select>
                {o ? (
                  <div className="studio-dcard__ref">{o.ref}</div>
                ) : (
                  <div className="studio-dcard__warn">Nothing assigned{k && !s.obs.some((x) => x.qt === k) ? ` — none tagged ${QT[k].short.toLowerCase()} yet` : ''}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="studio-col">
        <div className="studio-lab">What is left over</div>
        {(Object.keys(QT) as QTKey[]).map((k) => {
          const items = s.obs.filter((o) => o.qt === k && !used.includes(o.id));
          return (
            <div className="studio-pool" key={k}>
              <div className={`studio-pool__h studio-qtag studio-qtag--${QT[k].cls}`}>
                {QT[k].short} · {items.length} spare
              </div>
              {items.length ? items.map((o) => <div className="studio-pool__i" key={o.id}>{o.text}</div>) : <div className="studio-pool__e">none spare</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComposePanel({ s, update, cDay, setCDay }: { s: StudioState; update: Update; cDay: number; setCDay: (n: number) => void }) {
  const typed = hasMove(s, 'end');
  const p = typed ? planFor(s.dayCount) : [];
  const i = Math.min(Math.max(cDay, 0), s.days.length - 1);
  const d = s.days[i];
  if (!d) return null;
  const o = d.obs ? s.obs.find((x) => x.id === d.obs) : null;

  function setField(f: 'hook' | 'book' | 'look' | 'took' | 'frame', v: string) {
    update((prev) => ({ ...prev, days: prev.days.map((x, j) => (j === i ? { ...x, [f]: v } : x)) }));
  }

  return (
    <div className="studio-grid">
      <div className="studio-card">
        <div className="studio-row2">
          <select value={i} onChange={(e) => setCDay(Number(e.target.value))}>
            {s.days.map((_, idx) => (
              <option key={idx} value={idx}>
                Day {idx + 1}
                {typed ? ` · ${QT[p[idx]].short}` : ''}
              </option>
            ))}
          </select>
          <select value={d.frame} onChange={(e) => setField('frame', e.target.value)}>
            {FRAMES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="studio-assembled">
          {o ? (
            <>
              <div className="studio-lab">The observation this day carries</div>
              <p>{o.text}</p>
              <div className="studio-ob__r">{o.ref}</div>
            </>
          ) : (
            <p className="studio-note">No observation assigned to this day yet.</p>
          )}
        </div>

        <div className="studio-field">
          <label>Hook — the detail that should not be there</label>
          <RichEditor value={d.hook} onChange={(html) => setField('hook', html)} placeholder="The detail that should not be there…" />
        </div>
        <div className="studio-field">
          <label>Book — the text, quoted</label>
          <RichEditor value={d.book} onChange={(html) => setField('book', html)} placeholder="The text, quoted…" />
        </div>
        <div className="studio-field">
          <label>Look — what follows from it</label>
          <RichEditor value={d.look} onChange={(html) => setField('look', html)} placeholder="What follows from it…" />
        </div>
        <div className="studio-field">
          <label>Took — what the reader does today</label>
          <RichEditor value={d.took} onChange={(html) => setField('took', html)} placeholder="One instruction…" />
          <p className="studio-hint">One instruction. Never &ldquo;share this.&rdquo;</p>
        </div>
      </div>

      <div className="studio-col">
        <div className="studio-card">
          <div className="studio-card__head">
            {(['hook', 'book', 'look', 'took'] as const).filter((f) => !isRichTextEmpty(d[f])).length} of 4 moves written
          </div>
          <div className="studio-pv">
            <div className="studio-pv__k">{d.frame || '—'} · Day {i + 1}</div>
            {isRichTextEmpty(d.hook) ? (
              <div className="studio-pv__hook"><span className="studio-muted">Hook — the detail that should not be there</span></div>
            ) : (
              <div className="studio-pv__hook" dangerouslySetInnerHTML={{ __html: d.hook }} />
            )}
            {isRichTextEmpty(d.book) ? (
              <div className="studio-pv__book"><span className="studio-muted">Book — the text, quoted</span></div>
            ) : (
              <div className="studio-pv__book" dangerouslySetInnerHTML={{ __html: d.book }} />
            )}
            {isRichTextEmpty(d.look) ? (
              <div className="studio-pv__look"><span className="studio-muted">Look — what follows from it</span></div>
            ) : (
              <div className="studio-pv__look" dangerouslySetInnerHTML={{ __html: d.look }} />
            )}
            <div className="studio-pv__took">
              <b>Today</b>{' '}
              {isRichTextEmpty(d.took) ? (
                <span className="studio-muted">Took — one instruction</span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: d.took }} />
              )}
            </div>
          </div>
        </div>
        <div className="studio-card">
          <h3>Why four</h3>
          <p className="studio-hint">Hook / Book / Look / Took keeps a single post from becoming a lecture: one surprising detail, one verbatim text, one implication, one instruction.</p>
        </div>
      </div>
    </div>
  );
}

function ChecksPanel({ s }: { s: StudioState }) {
  const all = CHECK_DEFS.filter((c) => hasMove(s, c.owner)).map((c) => ({ ...c, ok: c.pass(s) }));
  const n = all.filter((x) => x.ok).length;
  return (
    <div className="studio-grid">
      <div className="studio-card">
        {all.length === 0 && <p className="studio-note">Every move that carries a check is turned off. Nothing to verify.</p>}
        {all.map((c, idx) => (
          <div key={idx} className={`studio-chk${c.ok ? ' studio-chk--ok' : ''}`}>
            <span className="studio-chk__bx">{c.ok ? '✓' : ''}</span>
            <div>
              <b>{c.title}</b>
              <p>{c.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="studio-col">
        <div className="studio-card">
          <div className="studio-card__head">{all.length ? `${n} of ${all.length} clear` : '—'}</div>
          <div className="studio-progress__track">
            <div className="studio-progress__fill studio-progress__fill--green" style={{ width: `${all.length ? (n / all.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodPanel({ s, update }: { s: StudioState; update: Update }) {
  let n = 0;
  return (
    <div className="studio-grid">
      <div className="studio-card">
        <h3>Mode</h3>
        <div className="studio-chips">
          <button className={`studio-chip${s.mode === 'guided' ? ' on' : ''}`} onClick={() => update((p) => ({ ...p, mode: 'guided' }))}>
            Guided — the six moves
          </button>
          <button className={`studio-chip${s.mode === 'free' ? ' on' : ''}`} onClick={() => update((p) => ({ ...p, mode: 'free' }))}>
            Free — do it myself
          </button>
        </div>

        <div className="studio-lab" style={{ marginTop: 20 }}>
          Moves
        </div>
        {s.moves.map((m, i) => {
          if (m.on) n++;
          return (
            <div className={`studio-mrow ${m.on ? 'on' : 'off'}`} key={m.k}>
              <div className="studio-mrow__n">{m.on ? pad(n) : '—'}</div>
              <input
                type="text"
                value={m.t}
                onChange={(e) => update((p) => ({ ...p, moves: p.moves.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)) }))}
              />
              <div className="studio-ord">
                <button
                  disabled={i === 0}
                  aria-label="Move up"
                  onClick={() =>
                    update((p) => {
                      const a = [...p.moves];
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                      return { ...p, moves: a };
                    })
                  }
                >
                  ↑
                </button>
                <button
                  disabled={i === s.moves.length - 1}
                  aria-label="Move down"
                  onClick={() =>
                    update((p) => {
                      const a = [...p.moves];
                      [a[i + 1], a[i]] = [a[i], a[i + 1]];
                      return { ...p, moves: a };
                    })
                  }
                >
                  ↓
                </button>
              </div>
              <button
                className={`studio-tgl${m.on ? ' on' : ''}`}
                aria-label={`Toggle ${m.t}`}
                onClick={() => update((p) => ({ ...p, moves: p.moves.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) }))}
              />
            </div>
          );
        })}

        <div className="studio-chips" style={{ marginTop: 16 }}>
          <button className="studio-chip" onClick={() => update((p) => ({ ...p, moves: p.moves.map((m) => ({ ...m, on: true })) }))}>
            Turn all on
          </button>
          <button className="studio-chip" onClick={() => update((p) => ({ ...p, moves: JSON.parse(JSON.stringify(DEFAULT_MOVES)) }))}>
            Restore default names and order
          </button>
        </div>
      </div>

      <div className="studio-col">
        <div className="studio-card studio-card--rust">
          <h3>What turning a move off does</h3>
          <p className="studio-hint">It leaves the tab bar, is excluded from progress, and its readiness checks stop appearing. Nothing is deleted — the data persists and reappears when re-enabled.</p>
        </div>
        <div className="studio-card">
          <h3>Dependency behaviour</h3>
          <p className="studio-hint">Move 04 off → day cards accept any observation. Move 02 off → the observation selects are empty; the day still composes.</p>
        </div>
        <div className="studio-card">
          <h3>Readiness checks</h3>
          <div className="studio-chips">
            <button className={`studio-chip${s.showChecks ? ' on' : ''}`} onClick={() => update((p) => ({ ...p, showChecks: true }))}>
              Show
            </button>
            <button className={`studio-chip${!s.showChecks ? ' on' : ''}`} onClick={() => update((p) => ({ ...p, showChecks: false }))}>
              Hide
            </button>
          </div>
        </div>
        <button
          className="studio-ghost"
          onClick={() => {
            if (!confirm('Reset the workspace to the worked Ruth example? Your method settings are kept.')) return;
            update((prev) => {
              const worked = JSON.parse(JSON.stringify(SEED_STATE)) as StudioState;
              return { ...worked, mode: prev.mode, moves: prev.moves, showChecks: prev.showChecks, free: prev.free };
            });
          }}
        >
          Reset to the worked example
        </button>
      </div>
    </div>
  );
}
