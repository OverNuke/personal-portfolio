import { Fragment } from 'react';
import { channels } from './channels';
import { useMagneticDock } from './useMagneticDock';

// Render-only per docs/04_COMPONENT_RULES.MD's bucket-2 contract -- all
// effect logic lives in useMagneticDock, this component only maps channel
// data to real elements and wires up the refs the hook needs.
function Dock() {
  const { containerRef, cardRefs } = useMagneticDock(channels.length);

  return (
    <div ref={containerRef} className="contact-dock">
      {channels.map((channel, i) => {
        const cardClassName =
          `contact-dock__card contact-dock__card--${channel.id}` +
          (channel.accentBg ? ' contact-dock__card--accent' : '');

        const inner = (
          <>
            {/* Pure CSS decoration (docs/04) -- no component logic. */}
            <span className="contact-dock__corner contact-dock__corner--tl" aria-hidden="true" />
            <span className="contact-dock__corner contact-dock__corner--tr" aria-hidden="true" />
            <span className="contact-dock__corner contact-dock__corner--bl" aria-hidden="true" />
            <span className="contact-dock__corner contact-dock__corner--br" aria-hidden="true" />

            <div className="contact-dock__header">
              <span className="contact-dock__label" style={{ fontSize: channel.headlineSize }}>
                {channel.label}
              </span>
              <span className="contact-dock__index" aria-hidden="true">
                ({channel.index})
              </span>
            </div>

            {channel.qrPlaceholder && (
              // No real QR asset exists in the decoded manifest yet (see
              // channels.ts) -- an empty placeholder carries no information
              // the real `href` above doesn't already provide.
              <div className="contact-dock__qr" aria-hidden="true" />
            )}

            <div className="contact-dock__footer">
              {channel.detailLines && (
                <span className="contact-dock__detail">
                  {channel.detailLines.map((line, lineIndex) => (
                    <Fragment key={line}>
                      {lineIndex > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </span>
              )}
              <span className="contact-dock__divider" aria-hidden="true" />
              <div className="contact-dock__cta">
                <span className="contact-dock__cta-label">{channel.ctaLabel}</span>
                <span
                  className="contact-dock__badge"
                  aria-hidden="true"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <span className="contact-dock__badge-arrow">↗</span>
                </span>
              </div>
            </div>
          </>
        );

        if (channel.disabled) {
          return (
            <button
              key={channel.id}
              type="button"
              disabled
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`${cardClassName} contact-dock__card--disabled`}
            >
              {inner}
            </button>
          );
        }

        return (
          <a
            key={channel.id}
            href={channel.href}
            target={channel.external ? '_blank' : undefined}
            rel={channel.external ? 'noreferrer' : undefined}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={cardClassName}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export default Dock;
