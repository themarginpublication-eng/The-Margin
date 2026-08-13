'use client';

import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

interface NavSection {
  sep: string;
  links: NavLink[];
}

const SECTIONS: NavSection[] = [
  {
    sep: 'Content',
    links: [
      { href: '/admin/series', label: 'Series' },
      { href: '/admin/notes', label: 'Daily notes' },
      { href: '/admin/essays', label: 'Essays' },
      { href: '/admin/studio', label: 'Content Studio' },
    ],
  },
  {
    sep: 'Audience',
    links: [
      { href: '/admin/subscribers', label: 'Subscribers' },
      { href: '/admin/email-templates', label: 'Emails' },
      { href: '/admin/broadcasts', label: 'Broadcasts' },
    ],
  },
  {
    sep: 'Money',
    links: [{ href: '/admin/donations', label: 'Donations' }],
  },
  {
    sep: 'Site',
    links: [{ href: '/admin/site', label: 'Site copy' }],
  },
  {
    sep: 'Plan',
    links: [{ href: '/admin/development', label: 'Development' }],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="side">
      <div className="side__mark">
        <span className="side__bar" />
        <span>
          <span className="side__type">the margin</span>
          <span className="side__tag">Admin</span>
        </span>
      </div>
      <nav className="snav">
        <a href="/admin" className={pathname === '/admin' ? 'on' : ''}>
          Dashboard
        </a>
        {SECTIONS.map((section) => (
          <div key={section.sep}>
            <span className="sep">{section.sep}</span>
            {section.links.map((link) => (
              <a key={link.href} href={link.href} className={isActive(pathname, link.href) ? 'on' : ''}>
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="side__foot">
        Signed in as {adminEmail}
        <br />
        <a href="https://readthemargin.net">View site &rarr;</a>
      </div>
    </aside>
  );
}
