'use client';

import { useState } from 'react';

export default function NewEssayButton() {
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled essay' }),
      });
      const json = (await res.json()) as { essay?: { id: string } };
      if (json.essay) window.location.href = `/admin/essays/${json.essay.id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-block__actions">
      <button className="btn" disabled={busy} onClick={create}>
        New essay
      </button>
    </div>
  );
}
