import { useRef, useState } from 'react';
import VoronoiCellField from './distinctions/VoronoiCellField';
import type { FocusableTrigger } from './distinctions/VoronoiCellField';
import ScanModal from './distinctions/ScanModal';
import { CERTIFICATIONS_BY_ID } from './distinctions/distinctionsData';
import './distinctions/distinctions.css';

// Real Distinctions screen (Phase 8, the largest/most complex of the five --
// weighted-Voronoi cell field + crayon-doodle overlay + certificate
// lightbox). Layout, the 9 real certifications' data, the power-diagram
// math, the breathing frequencies, and the lightbox contract are all
// verified against
// docs/_decoded/distinction-section-v4-standalone/template.html in full --
// see src/pages/distinctions/voronoi.ts, distinctionsData.ts,
// doodleStrokes.ts, VoronoiCellField.tsx, and ScanModal.tsx for the
// per-value citations. `data-screen-heading` (Shell.tsx's route-change
// focus target) lives on the real "Distinctions" H2 inside
// VoronoiCellField's title-cell label, matching this repo's established
// Contact/Projects/Profile precedent of one real h2 per screen.
//
// The lightbox's open/close state and the triggering-cell focus-restoration
// ref both live here, at the page level -- neither VoronoiCellField (which
// only knows "a cell wants to open X, here's its DOM node") nor ScanModal
// (which only knows "I'm open or not") owns enough context to coordinate
// the docs/05 contract ("focus returns to the triggering cell on close")
// by itself.
function Distinctions() {
  const [openCellId, setOpenCellId] = useState<string | null>(null);
  const triggerRef = useRef<FocusableTrigger | null>(null);

  function handleOpenCell(id: string, trigger: FocusableTrigger) {
    triggerRef.current = trigger;
    setOpenCellId(id);
  }

  function handleClose() {
    setOpenCellId(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }

  const openCert = openCellId ? CERTIFICATIONS_BY_ID[openCellId] : null;

  return (
    <main data-testid="screen-distinction" className="distinctions-screen">
      <VoronoiCellField onOpenCell={handleOpenCell} />
      <ScanModal
        isOpen={openCert != null}
        title={openCert?.title ?? ''}
        meta={openCert?.lightboxMeta ?? ''}
        imageSrc={openCert?.certificateImage}
        imageAlt={openCert ? `${openCert.title} certificate scan` : ''}
        onClose={handleClose}
      />
    </main>
  );
}

export default Distinctions;
