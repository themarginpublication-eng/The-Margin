'use client';

import { useState } from 'react';
import RichEditor from '@/components/rich-editor/RichEditor';
import { isRichTextEmpty } from '@/lib/rich-text';

export default function BroadcastComposer({ series }: { series: { id: string; title: string }[] }) {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [customEmails, setCustomEmails] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function send() {
    if (!subject.trim() || isRichTextEmpty(bodyHtml)) {
      setStatus('Subject and body are required.');
      return;
    }
    if (!confirm(`Send "${subject}" to ${recipientFilter === 'all' ? 'ALL subscribers' : recipientFilter === 'custom' ? 'the custom list' : 'the selected series'}?`)) {
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/broadcasts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyHtml,
          recipientFilter,
          customEmails:
            recipientFilter === 'custom'
              ? customEmails
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; scheduled?: boolean; sent?: number; failed?: number };
      if (!res.ok) {
        setStatus(json.error || 'Failed to send.');
      } else if (json.scheduled) {
        setStatus(`Scheduled for ${scheduledAt}.`);
      } else {
        setStatus(`Sent: ${json.sent} ok, ${json.failed} failed.`);
        window.location.reload();
      }
    } catch {
      setStatus('Failed to send.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-block">
      <div className="field">
        <label>Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label>Body</label>
        <RichEditor minHeight={200} value={bodyHtml} onChange={setBodyHtml} placeholder="What today's send says…" />
        <p className="hint">Highlights, circles, and their margin notes are converted to email-safe styling automatically when this sends.</p>
      </div>
      <div className="field">
        <label>Recipients</label>
        <select value={recipientFilter} onChange={(e) => setRecipientFilter(e.target.value)}>
          <option value="all">All subscribers</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              Readers of "{s.title}"
            </option>
          ))}
          <option value="custom">Custom list</option>
        </select>
      </div>
      {recipientFilter === 'custom' && (
        <div className="field">
          <label>Emails (comma or newline separated)</label>
          <textarea value={customEmails} onChange={(e) => setCustomEmails(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Schedule for later (ISO timestamp, blank = send now)</label>
        <input value={scheduledAt} placeholder="2026-01-01T12:00:00.000Z" onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <div className="admin-block__actions">
        <button className="btn" disabled={busy} onClick={send}>
          {scheduledAt ? 'Schedule' : 'Send now'}
        </button>
        <span className="admin-block__saved">{status}</span>
      </div>
    </div>
  );
}
