// Central EN/ES UI dictionary (docs/03, design `sdd/profile-acrostic-i18n`).
// `en` is the source of truth: `Dictionary` (types.ts) is `typeof en`, so a
// missing/extra key in `es.ts` is a TypeScript error, not a runtime gap.
//
// Phase 1 (i18n foundation) seeded strings that already existed verbatim in
// the code -- the old route registry's `navLabel` (pill nav) and
// `labelEn`/`labelEs` (Home's numbered list) -- plus the pill chrome's
// language-group `aria-label`. Phase 2 wires the pill nav, Shell's section
// aria-label/live text, and Home's list to these keys, adds `shell.screens`
// (the pill nav landmark's own aria-label) and `shell.sections` (Home's nav
// landmark), and strips `navLabel`/`labelEn`/`labelEs` from the registry,
// which is now structural only (hash + pageId). Section copy
// (Profile/Distinctions/Projects/Contact) is Phase 4.
export const en = {
  nav: {
    pill: {
      home: 'Home',
      profile: 'Profile',
      distinction: 'Distinctions',
      projects: 'Projects',
      contact: 'Contact',
    },
    homeList: {
      profile: 'Who me?',
      distinction: 'Distinction',
      projects: 'Projects',
      contact: 'Reach out',
    },
  },
  shell: {
    screens: 'Screens',
    sections: 'Sections',
    language: 'Language',
  },
  profile: {
    headline: ['Junior', 'software', 'engineer'],
    bio: 'Just graduated from Universidad Veracruzana. Small projects so far — and the appetite for one that makes a change.',
    footerNote: 'Always learning · open to travel',
    cta: 'Get in touch →',
    status: 'Looking for an opportunity',
    chamberStatus: {
      separate: 'separate',
      binding: 'binding',
      bonded: 'bonded',
    },
  },
  distinctions: {
    heading: 'Distinctions',
    intro:
      'Honors, language certification and coursework, packed as one colony. Each cell holds its own scan.',
    openScanAriaLabel: 'Open scan — {title}',
    scanCertificateAlt: '{title} certificate scan',
    scanNotAvailable: 'Scan not yet available',
    openFullSize: 'Open full size',
    opensInNewTab: '(opens in new tab)',
    closeViewer: 'Close scan viewer',
    closeViewerShort: 'close · esc',
    scanViewerLabel: 'scan viewer',
  },
  projects: {
    heading: 'Projects',
    eyebrow: 'selected work',
    flagshipBadge: 'flagship',
    repositoryLink: 'Repository ↗',
    privateRepository: 'private repository',
  },
  contact: {
    headline: 'Reach out',
    status: 'open to work',
    quote: 'The smallest acts of kindness can change someone’s day.',
  },
};
