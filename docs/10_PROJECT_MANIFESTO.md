# 10. Project Manifesto

> Rewritten 2026-09-21 from the decoded mockup. This is the "why" behind the
> rules the other docs enforce — it is personal and opinionated, not a spec.
> It is not enforceable, and it is not site copy. If you're looking for exact
> values, read `01_ART_DIRECTION.MD` and `02_DESIGN_SYSTEM.MD` instead; if
> you're looking for what ships, read the decoded templates directly.

## Why a doodle mascot instead of a clean icon set

Every hover on Distinctions or Projects gets a small performance: a
hand-drawn character blinks, waves an arm, and points a wobbling
Bézier-and-barb arrow at whatever you're looking at. That character is
deliberately unpolished — its outline is redrawn every frame with a seeded
noise function so the line never quite sits still, the way a hand holding a
crayon doesn't. A production icon set would have been faster to ship and
would look "more professional" in the boring sense. It would also be
completely forgettable, and it would say nothing about who made it. The
mascot exists because Profile's own copy says the honest thing out loud —
*"Junior software engineer... small projects so far — and the appetite for
one that makes a change"* — and a portfolio that admits it's early-career
shouldn't try to borrow the visual confidence of a design system built by a
50-person team. The doodle is confidence of a different, truer kind: I can't
fake ten years of shipped products, but I can make one small character that's
clearly mine and put real craft into making it move well.

## Why the dark/paper duality, and why Profile is the hinge

Home and Contact are dark. Profile, Distinctions, and Projects are paper. This
isn't a random palette split — it maps directly onto what each screen is
*for*. Home and Contact are the two moments where something is being asked of
the visitor: pay attention (Home) or take an action (Contact). Dark,
high-contrast, headline-driven screens are the right register for that — they
read as confident and immediate. Profile, Distinctions, and Projects are the
three "prove it" screens, and they're built to feel like pages of an actual
paper dossier being turned: warm off-white, grain, ink, hand annotation. You
don't riffle through a portfolio binder in the dark.

Profile isn't paper *or* dark — it's a single gradient that runs from one
into the other across the same 1440px, with the honest biographical copy
sitting in the paper zone and the interactive skill chambers sitting in the
dark zone. That's not a compromise between two palettes; it's the literal
visual argument that the "who I am" screen has to bridge the confident dark
identity of Home to the paper-and-proof screens that follow it. If Profile
were flat paper or flat dark, the sequence Home → Profile → Distinctions
would just be an arbitrary palette swap instead of a controlled transition.

## Why Voronoi cells, not a grid, for credentials

A grid of equal-size credential tiles makes a silent claim: every credential
here mattered the same amount. That's not true, and pretending otherwise
wastes the one thing a hand-built layout can do that a template can't —
communicate judgment. The Distinctions colony is computed as a weighted
Voronoi (power) diagram: each certificate is a seed point with a weight in
px², and the cell literally grows or shrinks based on that weight before any
hover interaction happens. An academic honor gets more territory than a
single online course, on the strength of the number in the source code, not
a manually eyeballed layout. It also means the cells tile with zero gaps and
zero overlap by construction — the "no forced grid" is not just an aesthetic
choice, it's the actual output of a real computational geometry technique
(clipping half-planes against every other seed, then re-inseting and
corner-rounding by actual joint angle so nothing spikes). That effort matters
here specifically: this is a portfolio, and choosing to hand-roll a power
diagram instead of dropping a CSS grid is itself one of the pieces of
evidence Distinctions is supposed to be presenting.

## Why the fixed 1440×900 stage

> **Updated 2026-09-23.** The argument below still holds for the fixed
> 1440px *width*: one committed design width, no breakpoints, no reflow. What
> changed is the stage's shape — it is now one continuously scrollable stack
> of five 1440-wide sections with a 900px design floor each, scaled by
> viewport width alone (`00_PROJECT_VISION.MD`'s dated decision), and
> "letterboxed everywhere else" no longer describes it (there are no bars; the
> stage fills the width and the page scrolls). Read "the 1440×900 stage" below
> as "the 1440px-wide, 900px-floor section". The reasoning is unedited.

This isn't a fluid marketing site and it isn't trying to be. Committing to
one exact canvas size, rendered at that size and letterboxed everywhere else,
is a bet that a small number of screens built with real depth beats a
responsive layout built with the caution that "it also has to work at
375px." Every custom effect in this rebuild — the goo-filter chambers, the
weighted Voronoi, the canvas ink-bloom, the magnetic dock — is expensive
enough in both compute and design attention that trying to also make it
gracefully reflow at every breakpoint from day one would have meant doing
less of it, worse. Treating this as a deliberate, stated scope decision (see
`00_PROJECT_VISION.MD`) rather than a quiet limitation is the point: a
responsive pass is a real future project, not a bug in this one.

## The throughline

Every choice above is really the same choice made five times: pick the
option that requires more craft and says something true, instead of the
option that's faster and says nothing. A junior engineer's portfolio that
looks like a Fortune-500 design system is a portfolio that's lying a little.
This one doesn't.
