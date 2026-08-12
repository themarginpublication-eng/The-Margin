'use client';

import { useState } from 'react';

export default function TemplateEditor({
  templateKey,
  initialSubject,
  initialIntro,
}: {
  templateKey: string;
  initialSubject: string;
  initialIntro: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [introHtml, setIntroHtml] = useState(initialIntro);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function save() {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: templateKey, subject, intro_html: introHtml }),
      });
      setStatus(res.ok ? 'Saved.' : 'Failed to save.');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-block">
      <div className="admin-block__head">
        <span className="admin-block__label">{templateKey}</span>
      </div>
      <div className="field">
        <label>Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="(built-in default)" />
      </div>
      <div className="field">
        <label>Intro HTML</label>
        <textarea value={introHtml} onChange={(e) => setIntroHtml(e.target.value)} placeholder="(none)" />
      </div>
      <div className="admin-block__actions">
        <button className="btn" disabled={busy} onClick={save}>
          Save
        </button>
        <span className="admin-block__saved">{status}</span>
      </div>
    </div>
  );
}
