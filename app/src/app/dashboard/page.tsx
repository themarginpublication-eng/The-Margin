'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReadingModal from '@/components/ReadingModal';
import { MOVES, moveOf } from '@/lib/moves';

interface Me {
  id: string;
  name: string;
  series: { id: string; title: string; subtitle: string | null; totalDays: number } | null;
}

interface Progress {
  seriesId: string;
  totalDays: number;
  currentDay: number;
  completedDays: number[];
  percent: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [meRes, progressRes] = await Promise.all([fetch('/api/me'), fetch('/api/me/progress')]);
    if (meRes.status === 401) {
      router.push('/login');
      return;
    }
    setMe(await meRes.json());
    setProgress(await progressRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function handleComplete(day: number) {
    setOpenDay(null);
    load();
    showToast(
      progress && day >= progress.totalDays ? 'The whole psalm — kept. Well done.' : `Morning kept. Day ${day + 1} is ready.`
    );
  }

  if (loading || !me || !progress || !me.series) {
    return <div className="center-loading">Loading…</div>;
  }

  const totalDays = progress.totalDays;
  const finished = progress.currentDay > totalDays;
  const cur = finished ? totalDays : progress.currentDay;
  const mv = moveOf(cur, totalDays);
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const done = progress.completedDays.length;
  const firstName = me.name.split(' ')[0];

  return (
    <>
      <div className="appbar">
        <div className="appbar__in">
          <div className="wm">
            <span className="wm__bar"></span>
            <span className="wm__lock">
              <span className="wm__type">the margin</span>
              <span className="wm__tag">Your reading</span>
            </span>
          </div>
          <div className="appbar__r">
            <span className="who">
              Signed in as <b>{me.name}</b>
            </span>
            <button className="linkbtn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="greet">
          Good {tod}, <em>{firstName}.</em>
        </div>
        <p className="greet__sub">
          {finished
            ? 'You’ve walked the whole psalm. Read it once more, cold — and see what changed.'
            : 'Your reading is waiting. Pick up where you left off.'}
        </p>

        <div className="jcard">
          <div className="jcard__top">
            <div>
              <span className="jcard__lane">Your journey · in progress</span>
              <h2>{me.series.title}</h2>
              <div className="jcard__sub">{me.series.subtitle}</div>
            </div>
            <div className="bigday">
              <div className="n">{finished ? '✦' : cur}</div>
              <div className="of">{finished ? 'Complete' : `of ${totalDays} mornings`}</div>
            </div>
          </div>

          <div className="track">
            <div className="track__movs">
              {MOVES.map((m) => (
                <div className={`seg ${m === mv && !finished ? 'cur' : ''}`} key={m.name}>
                  <div className="nm">{m.name}</div>
                </div>
              ))}
            </div>
            <div className="dots">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                const cls = progress.completedDays.includes(d) ? 'done' : d === cur && !finished ? 'cur' : '';
                return (
                  <div className={`dot ${cls}`} key={d} title={`Day ${d}`}>
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="jcard__foot">
            <button className="btn" onClick={() => setOpenDay(cur)}>
              {finished ? 'Read it again, cold →' : done ? 'Continue' : 'Begin'} {finished ? '' : `· Day ${cur}`}
            </button>
            <div className="now">
              {finished ? (
                <>
                  <b>{totalDays} of {totalDays}</b> mornings kept
                </>
              ) : (
                <>
                  Today: <b>Day {cur}</b> · {mv.name}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="v">{done}</div>
            <div className="k">Mornings kept</div>
          </div>
          <div className="stat">
            <div className="v">{Math.max(0, totalDays - done)}</div>
            <div className="k">Mornings to go</div>
          </div>
          <div className="stat">
            <div className="v">{progress.percent}%</div>
            <div className="k">Through the psalm</div>
          </div>
        </div>
      </div>

      {openDay !== null && (
        <ReadingModal
          seriesId={me.series.id}
          day={openDay}
          totalDays={totalDays}
          alreadyCompleted={progress.completedDays.includes(openDay)}
          onClose={() => setOpenDay(null)}
          onComplete={handleComplete}
        />
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
