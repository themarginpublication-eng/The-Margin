'use client';

import { useEffect, useState } from 'react';
import { moveOf } from '@/lib/moves';
import MarginProse from './MarginProse';
import { isRichTextEmpty } from '@/lib/rich-text';

interface DayReading {
  context: string;
  closeRead: string;
  scholars: string;
  forYou: string;
}

interface Day {
  day: number;
  title: string;
  ref: string;
  verse: string;
  move: string;
  reading: DayReading | null;
}

export default function ReadingModal({
  seriesId,
  day,
  totalDays,
  alreadyCompleted,
  onClose,
  onComplete,
}: {
  seriesId: string;
  day: number;
  totalDays: number;
  alreadyCompleted: boolean;
  onClose: () => void;
  onComplete: (day: number) => void;
}) {
  const [data, setData] = useState<Day | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/series/${seriesId}/day/${day}`)
      .then((r) => r.json())
      .then((json) => {
        const parsed = json as { day?: Day };
        if (!cancelled) setData(parsed.day ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [seriesId, day]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleComplete() {
    setBusy(true);
    try {
      await fetch('/api/me/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day }),
      });
      onComplete(day);
    } finally {
      setBusy(false);
    }
  }

  const mv = moveOf(day, totalDays);

  return (
    <div className="modal open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet__head">
          <div className="dn">
            Day {day} · <em>{data?.title ?? '…'}</em>
          </div>
          <button className="sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sheet__body">
          <div className="sheet__ref">
            {data?.ref ?? ''} · {mv.name}
          </div>
          <div className="sheet__verse">{data?.verse ?? ''}</div>

          {data?.reading && !isRichTextEmpty(data.reading.context) ? (
            <>
              <div className="beat">
                <h4>Read in context.</h4>
                <MarginProse html={data.reading.context} ariaLabel="Read in context" />
              </div>
              <div className="beat">
                <h4>Read closely.</h4>
                <MarginProse html={data.reading.closeRead} ariaLabel="Read closely" />
              </div>
              <div className="beat">
                <h4>What scholars see.</h4>
                <MarginProse html={data.reading.scholars} ariaLabel="What scholars see" />
              </div>
              <div className="beat beat--you">
                <h4>For you</h4>
                <MarginProse html={data.reading.forYou} ariaLabel="For you" />
              </div>
            </>
          ) : data ? (
            <>
              <div className="beat">
                <h4>Read in context.</h4>
                <p>Read the verse in its surrounding lines first — what comes just before and after it?</p>
              </div>
              <div className="beat">
                <h4>Read closely.</h4>
                <p>Read it word by word. Which single word is doing the most work today?</p>
              </div>
              <div className="beat beat--you">
                <h4>For you</h4>
                <p>Sit with this one line this morning. What is it asking of you?</p>
              </div>
              <div className="placeholder">
                This morning&rsquo;s full reading is still being written. In the live ministry, each day carries a
                complete note — this is where it will live.
              </div>
            </>
          ) : null}
        </div>
        <div className="sheet__foot">
          <span className="pg">
            Day {day} of {totalDays}
            {alreadyCompleted ? ' · already kept' : ''}
          </span>
          <button className="btn" onClick={handleComplete} disabled={busy}>
            {alreadyCompleted ? 'Done for today' : day >= totalDays ? 'Finish the journey ✦' : 'Mark complete · next morning →'}
          </button>
        </div>
      </div>
    </div>
  );
}
