import { PROJECTS } from './projects/projectsData';
import ProjectCard from './projects/ProjectCard';
import StrokeGlyphTitle from './projects/StrokeGlyphTitle';
import CrayonMascot from './projects/CrayonMascot';
import { useCardHover } from './projects/useCardHover';
import './projects/projects.css';

// Real Projects screen (Phase 8). Layout, copy, and effect math verified
// against docs/_decoded/projects-section-v2-standalone/template.html in
// full -- see src/pages/projects/projectsData.ts, glyphStrokes.ts,
// mascotStrokes.ts, and useCardHover.ts for the per-value citations.
//
// Colors match 02_DESIGN_SYSTEM.MD's Projects row exactly (this screen's
// own defaults, no app-shell override needed): doodle/mascot color
// `--color-projects-accent` (#586a30), annotation-doodle "hot" color
// `--color-projects-hot` (#c9351d). Hardcoded here rather than read from
// the CSS custom properties at runtime since the stroke-math modules need
// plain string values, not a DOM lookup.
const PROJECT_IDS = PROJECTS.map((project) => project.id);
const DOODLE_COLOR = '#586a30';
const HOT_COLOR = '#c9351d';

// Heading level/treatment matches the decoded template's own choice: a
// visually-hidden <h2> (template.html line 383) is the real accessible
// title, since the visible "PROJECTS" lettering is decorative SVG strokes
// (docs/04, docs/05) that a screen reader gets nothing from directly.
function Projects() {
  const { containerRef, valuesRef, handlePointerOver, handlePointerOut, bindFocus } = useCardHover(PROJECT_IDS);

  return (
    <main data-testid="screen-projects" className="projects-screen">
      <h2 data-screen-heading tabIndex={-1} className="projects-sr-heading">
        Projects
      </h2>

      <div className="projects-eyebrow">
        <span className="projects-eyebrow__rule" aria-hidden="true" />
        <span>selected work</span>
        <span className="projects-eyebrow__index">03</span>
      </div>

      <StrokeGlyphTitle color={DOODLE_COLOR} />

      <div
        ref={containerRef}
        className="projects-cards-layer"
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {PROJECTS.map((project) => (
          <ProjectCard key={project.id} project={project} bindFocus={bindFocus} />
        ))}
      </div>

      <CrayonMascot containerRef={containerRef} valuesRef={valuesRef} blueColor={DOODLE_COLOR} hotColor={HOT_COLOR} />
    </main>
  );
}

export default Projects;
