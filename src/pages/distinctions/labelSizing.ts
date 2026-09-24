// Pure label-box sizing for the Voronoi colony, extracted from
// VoronoiCellField's inline `labelSizing` useMemo so it is unit-testable and
// reusable (molecularDoodles.test.ts derives real label boxes from it to
// prove the new doodles stay clear of the certificate labels).
//
// Width / cert-name font-size are derived from each cell's RESTING area
// (breathe: false, no hover growth) at the section's ACTUAL `height` --
// docs/07's "breathing never reflows copy" intent: sized once per height,
// not per animation frame.
import {
  DEFAULT_GAP,
  DEFAULT_ROUNDNESS,
  computeCellGeometry,
  computeLiveSeeds,
} from './voronoi';

export interface LabelSize {
  width: number;
  fontSize: number;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeLabelSizing(height: number): Record<string, LabelSize> {
  const restSeeds = computeLiveSeeds(0, height, { breathe: false, hoverGrowth: 0, hoverValues: {} });
  const restCells = computeCellGeometry(restSeeds, height, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });
  const sizing: Record<string, LabelSize> = {};
  restCells.forEach((cell) => {
    const isEye = cell.id === 'count' || cell.id === 'span';
    const s = Math.sqrt(cell.area || 10000);
    const widthFactor = isEye ? 0.95 : 0.74;
    const width = Math.round(clamp(120, isEye ? 400 : 330, s * widthFactor));
    const fontSize = Math.round(clamp(15, 27, s / 13.5));
    sizing[cell.id] = { width, fontSize };
  });
  return sizing;
}
