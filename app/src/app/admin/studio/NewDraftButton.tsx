'use client';

import { useState } from 'react';

export default function NewDraftButton() {
  const [busy, setBusy] = useState(false);

  async function create(worked: boolean) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: worked ? 'Empty and Full' : 'Untitled series', worked }),
      });
      const json = (await res.json()) as { draft?: { id: string } };
      if (json.draft) window.location.href = `/admin/studio/${json.draft.id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-block__actions">
      <button className="btn" disabled={busy} onClick={() => create(false)}>
        New draft
      </button>
      <button className="btn btn--ghost" disabled={busy} onClick={() => create(true)}>
        Start from the worked example
      </button>
    </div>
  );
}
