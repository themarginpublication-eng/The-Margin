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
import './studio.css';

type Panel = 'home' | 'free' | 'unit' | 'obs' | 'idea' | 'end' | 'days' | 'compose' | 'checks' | 'method';

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
  const composed = s.days.filter((d) => d.hook && d.book && d.look && d.took).length;
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
    pass: (s) => s.days.length > 0 && (['hook', 'book', 'look', 'took'] as const).every((f) => s.days[0][f]),
  },
];

export default function StudioEditor({ id }: { id: string }) {
  const [s, setS] = useState<StudioState | null>(null);
  const [panel, setPanel] = useState<Panel>('home');
  const [status, setStatus] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cDay, setCDay] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/studio/${id}`)
      .then((r) => r.json() as Promise<{ draft?: { title: string; data_json: string } }>)
      .then((json) => {
        if (!json.draft) return;
        const state = JSON.parse(json.draft.data_json) as StudioState;
        setS(state);
        if (state.mode === 'free') setPanel('free');
      });
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
  const moveList = useMemo(() => (s ? (free ? [] : onMoves(s)) : []), [s, free]);

  useEffect(() => {
    if (!s) return;
    const okPanels: string[] = ['home', 'checks', 'method', ...(free ? ['free'] : moveList.map((m) => m.k))];
    if (!okPanels.includes(panel)) setPanel(free ? 'free' : 'home');
  }, [s, free, moveList, panel]);

  useEffect(() => {
    if (panel === 'days' || panel === 'compose') {
      update((prev) => syncDays(prev));
    }
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  if (!s) return <div className="center-loading">Loading…</div>;

  const done = free ? 0 : onMoves(s).filter((m) => moveInfo(s, m.k)!.done).length;
  const total = free ? 0 : onMoves(s).length;

  return (
    <div className="studio-app">
      <aside className="studio-rail">
        <div className="studio-wm">
          <div className="studio-wm__bar" />
          <div>
            <div className="studio-wm__type">the margin</div>
            <div className="studio-wm__tag">Studio</div>
          </div>
        </div>

        <div className="studio-progress">
          <div className="studio-progress__row">
            <span>Series progress</span>
            <span>{free ? 'Free' : `${done} / ${total}`}</span>
          </div>
          <div className="studio-progress__track">
            <div className="studio-progress__fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="studio-sep">{free ? 'Free mode' : 'The method'}</div>
        <nav className="studio-nav">
          {free ? (
            <button className={panel === 'free' ? 'on' : ''} onClick={() => setPanel('free')}>
              Draft
            </button>
          ) : (
            moveList.map((m, i) => {
              const info = moveInfo(s, m.k)!;
              return (
                <button key={m.k} className={`${panel === m.k ? 'on' : ''} ${info.done ? 'ok' : ''}`} onClick={() => setPanel(m.k as Panel)}>
                  {pad(i + 1)} · {m.t}
                </button>
              );
            })
          )}
        </nav>

        <div className="studio-sep">Setup</div>
        <nav className="studio-nav">
          {s.showChecks && !free && (
            <button className={panel === 'checks' ? 'on' : ''} onClick={() => setPanel('checks')}>
              Readiness
            </button>
          )}
          <button className={panel === 'method' ? 'on' : ''} onClick={() => setPanel('method')}>
            Method settings
          </button>
        </nav>

        <div className="studio-footer">
          <a href="/admin/studio">← All drafts</a>
          <span className="studio-save">{status}</span>
        </div>
      </aside>

      <main className="studio-main">
        {panel === 'home' && <Home s={s} update={update} setPanel={setPanel} id={id} />}
        {panel === 'free' && <FreePanel s={s} update={update} />}
        {panel === 'unit' && <UnitPanel s={s} update={update} />}
        {panel === 'obs' && <ObsPanel s={s} update={update} />}
        {panel === 'idea' && <IdeaPanel s={s} update={update} />}
        {panel === 'end' && <EndPanel s={s} update={update} />}
        {panel === 'days' && <DaysPanel s={s} update={update} />}
        {panel === 'compose' && <ComposePanel s={s} update={update} cDay={cDay} setCDay={setCDay} />}
        {panel === 'checks' && <ChecksPanel s={s} />}
        {panel === 'method' && <MethodPanel s={s} update={update} />}
      </main>
    </div>
  );
}

type Update = (fn: (s: StudioState) => StudioState) => void;

function Home({ s, update, setPanel, id }: { s: StudioState; update: Update; setPanel: (p: Panel) => void; id: string }) {
  const free = s.mode === 'free';
  const list = free ? [] : onMoves(s);
  const counts: Record<QTKey, number> = { mean: 0, true: 0, diff: 0 };
  s.obs.forEach((o) => {
    if (o.qt) counts[o.qt]++;
  });
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState('');

  async function publish() {
    setPublishing(true);
    setPublishMsg('');
    try {
      const res = await fetch(`/api/admin/studio/${id}/publish`, { method: 'POST' });
      const json = (await res.json()) as { series?: { slug: string; title: string }; error?: string };
      setPublishMsg(res.ok && json.series ? `Published as a draft series: “${json.series.title}”.` : json.error || 'Failed to publish.');
    } catch {
      setPublishMsg('Failed to publish.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="studio-grid studio-grid--home">
      <div className="studio-col">
        {free ? (
          <button className="studio-mv" onClick={() => setPanel('free')}>
            <span className="studio-mv__n">—</span>
            <span className="studio-mv__b">
              <span className="studio-mv__t">Open the draft</span>
              <span className="studio-mv__s">
                {s.free.days.length} day{s.free.days.length === 1 ? '' : 's'} · no gates, no checks
              </span>
            </span>
            <span className="studio-mv__k">Open</span>
          </button>
        ) : (
          <>
            {list.map((m, i) => {
              const info = moveInfo(s, m.k)!;
              return (
                <button key={m.k} className={`studio-mv${info.done ? ' studio-mv--done' : ''}`} onClick={() => setPanel(m.k as Panel)}>
                  <span className="studio-mv__n">{pad(i + 1)}</span>
                  <span className="studio-mv__b">
                    <span className="studio-mv__t">{m.t}</span>
                    <span className="studio-mv__s">{info.note}</span>
                  </span>
                  <span className="studio-mv__k">{info.done ? 'Done' : 'Open'}</span>
                </button>
              );
            })}
            {list.length < s.moves.length && (
              <button className="studio-mv" onClick={() => setPanel('method')}>
                <span className="studio-mv__n">+</span>
                <span className="studio-mv__b">
                  <span className="studio-mv__t">{s.moves.length - list.length} moves turned off</span>
                  <span className="studio-mv__s">Nothing was deleted — turn them back on any time</span>
                </span>
                <span className="studio-mv__k">Method</span>
              </button>
            )}
          </>
        )}
      </div>

      <div className="studio-col">
        <div className="studio-card studio-card--rust">
          <div className="studio-lab">Exegetical idea</div>
          <p>{free ? '—' : exeg(s) || <span className="studio-muted">Not yet assembled.</span>}</p>
          <div className="studio-lab" style={{ marginTop: 12 }}>
            Reader can, by the last day
          </div>
          <p>{free ? '—' : s.capability || <span className="studio-muted">Not yet named.</span>}</p>
        </div>

        <div className="studio-card">
          <h3>Observation pool</h3>
          <div className="studio-qc-grid">
            {(Object.keys(QT) as QTKey[]).map((k) => (
              <div key={k} className={`studio-qc studio-qc--${QT[k].cls}`}>
                <div className="studio-qc__n">{counts[k]}</div>
                <div className="studio-qc__l">{QT[k].short}</div>
              </div>
            ))}
            <div className="studio-qc">
              <div className="studio-qc__n">{s.obs.filter((o) => !o.qt).length}</div>
              <div className="studio-qc__l">Untagged</div>
            </div>
          </div>
        </div>

        <div className="studio-card">
          <h3>Mode</h3>
          <p className="studio-hint">{free ? 'Free — you are working without the method.' : `Guided — ${onMoves(s).length} of ${s.moves.length} moves active.`}</p>
          <div className="studio-chips">
            <button className={`studio-chip${!free ? ' on' : ''}`} onClick={() => update((prev) => ({ ...prev, mode: 'guided' }))}>
              Guided
            </button>
            <button className={`studio-chip${free ? ' on' : ''}`} onClick={() => update((prev) => ({ ...prev, mode: 'free' }))}>
              Do it myself
            </button>
          </div>
        </div>

        <div className="studio-card">
          <h3>Publish</h3>
          <p className="studio-hint">Writes this draft into the shared series table as a draft (same list the admin&rsquo;s Reading Series page uses) — it won&rsquo;t go live on the site until someone flips its status there.</p>
          <button className="btn" disabled={publishing} onClick={publish} style={{ marginTop: 10 }}>
            {publishing ? 'Publishing…' : 'Publish to series'}
          </button>
          {publishMsg && <p className="studio-hint" style={{ marginTop: 8 }}>{publishMsg}</p>}
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
              <textarea
                placeholder="The day itself"
                value={d.b}
                onChange={(e) =>
                  update((p) => ({ ...p, free: { ...p.free, days: p.free.days.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)) } }))
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
          <textarea value={d.hook} onChange={(e) => setField('hook', e.target.value)} />
        </div>
        <div className="studio-field">
          <label>Book — the text, quoted</label>
          <textarea value={d.book} onChange={(e) => setField('book', e.target.value)} />
        </div>
        <div className="studio-field">
          <label>Look — what follows from it</label>
          <textarea value={d.look} onChange={(e) => setField('look', e.target.value)} />
        </div>
        <div className="studio-field">
          <label>Took — what the reader does today</label>
          <textarea value={d.took} onChange={(e) => setField('took', e.target.value)} />
          <p className="studio-hint">One instruction. Never &ldquo;share this.&rdquo;</p>
        </div>
      </div>

      <div className="studio-col">
        <div className="studio-card">
          <div className="studio-card__head">{['hook', 'book', 'look', 'took'].filter((f) => d[f as keyof typeof d]).length} of 4 moves written</div>
          <div className="studio-pv">
            <div className="studio-pv__k">{d.frame || '—'} · Day {i + 1}</div>
            <div className="studio-pv__hook">{d.hook || <span className="studio-muted">Hook — the detail that should not be there</span>}</div>
            <div className="studio-pv__book">{d.book || <span className="studio-muted">Book — the text, quoted</span>}</div>
            <div className="studio-pv__look">{d.look || <span className="studio-muted">Look — what follows from it</span>}</div>
            <div className="studio-pv__took"><b>Today</b> {d.took || <span className="studio-muted">Took — one instruction</span>}</div>
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
        <div className="studio-card">
          <h3>What turning a move off does</h3>
          <p className="studio-hint">It leaves the rail, is excluded from progress, and its readiness checks stop appearing. Nothing is deleted — the data persists and reappears when re-enabled.</p>
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
      </div>
    </div>
  );
}
