// Render-only per docs/04_COMPONENT_RULES.MD's bucket-2 contract -- all
// hover-lerp/annotation-reveal effect logic lives in useCardHover.ts, this
// component only maps project data to real elements carrying the
// `data-mark`/`data-mk`/`data-pid`/`data-rot`/`data-lift` attributes that
// hook queries every frame (mirrors the decoded source's own `ref="{{
// setMark }}"` marking scheme, translated to plain data attributes since
// React doesn't need the original's manual ref-collection step).
//
// Accessibility (docs/05, resolved per this batch's item 5): name,
// description, tags, and the repo link/"private repository" label are
// always-rendered real content, never hover-gated -- only the extra
// handwritten annotation aside and the doodle rings/arrows/underlines are
// hover/focus-reveal enhancement layered on top.
import type { CSSProperties } from 'react';
import type { ProjectData } from './projectsData';

interface FocusHandlers {
  onFocus: () => void;
  onBlur: () => void;
}

interface ProjectCardProps {
  project: ProjectData;
  bindFocus: (id: string) => FocusHandlers;
}

function ProjectCard({ project, bindFocus }: ProjectCardProps) {
  const {
    id,
    name,
    metaLine,
    photo,
    photoAlt,
    rotation,
    lift,
    cardZIndex,
    photoSize,
    cardWidth,
    left,
    top,
    flagship,
    eyebrowIndex,
    eyebrowLabel,
    title,
    titleFontSize,
    description,
    descriptionFontSize,
    copyLeft,
    copyTop,
    copyWidth,
    tags,
    tagsLeft,
    tagsTop,
    tagsWidth,
    repo,
    privateLabel,
    annotation,
  } = project;

  return (
    <>
      <div
        className="projects-card"
        data-mark={id}
        data-mk="group"
        data-pid={id}
        data-rot={rotation}
        data-lift={lift}
        style={{ left, top, width: cardWidth, zIndex: cardZIndex, transform: `rotate(${rotation}deg)` }}
      >
        <div className="projects-card__photo" data-mark={id} data-mk="photo" style={{ width: photoSize, height: photoSize }}>
          <img src={photo} alt={photoAlt} />
        </div>
        <div className="projects-card__meta">
          <span className="projects-card__name">{name}</span>
          <span className="projects-card__metaline">{metaLine}</span>
        </div>
      </div>

      {flagship && (
        <div
          className="projects-flagship-badge"
          data-mark={id}
          data-mk="group"
          data-rot={rotation - 1.2}
          data-lift={lift}
          style={{ transform: `rotate(${rotation - 1.2}deg)` }}
        >
          flagship
        </div>
      )}

      <div
        className="projects-copy"
        data-mark={id}
        data-mk="group"
        data-pid={id}
        data-rot={0}
        data-lift={5}
        style={{ left: copyLeft, top: copyTop, width: copyWidth }}
      >
        <div className="projects-copy__eyebrow">
          <span>{eyebrowIndex}</span>
          <span className="projects-copy__rule" aria-hidden="true" />
          <span>{eyebrowLabel}</span>
        </div>
        <h3 className="projects-copy__title" data-mark={id} data-mk="title" style={{ fontSize: titleFontSize }}>
          {title}
        </h3>
        <p className="projects-copy__description" style={{ fontSize: descriptionFontSize }}>
          {description}
        </p>
      </div>

      <div
        className="projects-tags"
        data-mark={id}
        data-mk="group"
        data-rot={0}
        data-lift={5}
        style={{ left: tagsLeft, top: tagsTop, width: tagsWidth }}
      >
        {tags.map((tag) => (
          <span key={tag} className="projects-tags__pill" data-mark={id} data-mk="tag">
            {tag}
          </span>
        ))}
      </div>

      {repo && (
        <a
          className="projects-repo-link"
          data-mark={id}
          data-mk="group"
          data-rot={0}
          data-lift={5}
          href={repo.href}
          style={
            {
              left: repo.left,
              top: repo.top,
              '--repo-hover-radius': repo.hoverRadius,
            } as CSSProperties
          }
          {...bindFocus(id)}
        >
          Repository ↗
        </a>
      )}

      {privateLabel && (
        <div
          className="projects-private-label"
          data-mark={id}
          data-mk="group"
          data-rot={0}
          data-lift={5}
          style={{ left: privateLabel.left, top: privateLabel.top, width: privateLabel.width }}
        >
          <span>private repository</span>
          <span className="projects-private-label__rule" aria-hidden="true" />
        </div>
      )}

      <div
        className="projects-annotation"
        data-mark={id}
        data-mk="note"
        style={{ left: annotation.left, top: annotation.top, width: annotation.width, opacity: 0 }}
      >
        {annotation.text}
      </div>
    </>
  );
}

export default ProjectCard;
