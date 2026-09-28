import type { Dictionary } from './types';

// Neutral Latin American Spanish, no voseo (decision #522). `homeList`
// values are the registry's existing `labelEs` strings verbatim (docs/03's
// old "Home numbered list" dictionary), not new copy.
export const es: Dictionary = {
  nav: {
    pill: {
      home: 'Inicio',
      profile: 'Perfil',
      distinction: 'Distinciones',
      projects: 'Proyectos',
      contact: 'Contacto',
    },
    homeList: {
      profile: '¿Yo?',
      distinction: 'Distinción',
      projects: 'Proyectos',
      contact: 'Contacto',
    },
  },
  shell: {
    screens: 'Pantallas',
    sections: 'Secciones',
    language: 'Idioma',
  },
  profile: {
    headline: ['Ingeniero', 'de software', 'junior'],
    bio: 'Recién egresado de la Universidad Veracruzana. Proyectos pequeños por ahora — y las ganas de hacer uno que marque la diferencia.',
    footerNote: 'Siempre aprendiendo · disponible para viajar',
    cta: 'Contáctame →',
    status: 'En búsqueda de una oportunidad',
    chamberStatus: {
      separate: 'separado',
      binding: 'uniendo',
      bonded: 'unido',
    },
  },
  distinctions: {
    heading: 'Distinciones',
    intro:
      'Reconocimientos, certificaciones de idiomas y cursos, reunidos en una sola colonia. Cada celda guarda su propio documento.',
    openScanAriaLabel: 'Ver documento — {title}',
    scanCertificateAlt: 'Documento de {title}',
    scanNotAvailable: 'Documento aún no disponible',
    openFullSize: 'Ver tamaño completo',
    opensInNewTab: '(se abre en una pestaña nueva)',
    closeViewer: 'Cerrar visor de documentos',
    closeViewerShort: 'cerrar · esc',
    scanViewerLabel: 'visor de documentos',
  },
  projects: {
    heading: 'Proyectos',
    eyebrow: 'trabajo seleccionado',
    flagshipBadge: 'destacado',
    repositoryLink: 'Repositorio ↗',
    privateRepository: 'repositorio privado',
  },
  contact: {
    headline: 'Contáctame',
    status: 'disponible para trabajar',
    quote: 'Los actos más pequeños de bondad pueden cambiar el día de alguien.',
  },
};
