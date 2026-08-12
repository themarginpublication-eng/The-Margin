import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listEmailTemplates } from '@/lib/repo';
import TemplateEditor from './TemplateEditor';

const KNOWN_KEYS = ['daily-note', 'welcome-later'];

export default async function EmailTemplatesHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const templates = await listEmailTemplates();
  const byKey = new Map(templates.map((t) => [t.key, t]));
  const keys = Array.from(new Set([...KNOWN_KEYS, ...templates.map((t) => t.key)]));

  return (
    <div className="admin">
      <h1>Email templates</h1>
      <p className="admin__lede">
        Subject and intro copy for the mailer&rsquo;s transactional emails. Leave a key untouched and its built-in default
        applies. Subject supports <code>{'{{seriesTitle}}'}</code>, <code>{'{{day}}'}</code>, <code>{'{{total}}'}</code>,{' '}
        <code>{'{{dayTitle}}'}</code>.
      </p>
      <div className="admin__nav">
        <a href="/admin">← Admin home</a>
      </div>

      <div className="admin-group">
        {keys.map((key) => (
          <TemplateEditor
            key={key}
            templateKey={key}
            initialSubject={byKey.get(key)?.subject || ''}
            initialIntro={byKey.get(key)?.intro_html || ''}
          />
        ))}
      </div>
    </div>
  );
}
