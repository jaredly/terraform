import { closeEnough, closePos } from './calculateTopographicalLine';
import { Dataset, Trail } from '../App';
import { Settings } from '../App';
import { borderHexes, hex } from './hex';
import { Point } from './marchingSquares';
import { calculatePartialBorder } from './calculatePartialBorder';
import { TopographicalLines } from './calculateTopographicalLines';

export type LinesForBlank = {
    // in px, including margins
    w: number;
    h: number;
    // in px
    vmargin: number;
    wmargin: number;
    trail:
        | {
              x: number;
              y: number;
          }[][]
        | null;
    cuts: [number, number][][];
    alts: [number, number][][];
    skips: [number, number][][];
    reference: [number, number][][];
    borders: [number, number][][];
    innerCut: Array<Array<Point>>;
    min: number;
    max: number;
    pixelsPerMM: number;
};

export function assembleLinesForBlank(
    allData: TopographicalLines,
    { skip, scale, blanks }: Settings,
    blank?: number,
): LinesForBlank {
    const {
        steps,
        allLines,
        hits,
        lines,
        each,
        min,
        vmargin,
        pixelsPerMM,
        trailData,
        wmargin,
        max,
    } = allData;

    const h = scale * lines.length + vmargin * 2;
    // const w = ((scale * lines.length) / Math.sqrt(3)) * 2 + wmargin * 2;
    const w = scale * lines[0].length + wmargin * 2;

    const borders = borderHexes(lines[0].length, lines.length, scale, vmargin);

    const cuts = [];
    const alts = [];
    const skips = [];
    const reference = [];
    for (let at = 0; at < steps; at++) {
        const rendered = allLines[at];
        if (at % skip === 0) {
            if (blank != null && (at / skip) % blanks === blank) {
                cuts.push(...rendered);
            } else if (
                blank == null ||
                (at / skip) % blanks === (blank + 1) % blanks
            ) {
                alts.push(...rendered);
            } else {
                reference.push(...rendered);
            }
        } else {
            if (blank == null || Math.floor(at / skip) % blanks === blank) {
                skips.push(...rendered);
            } else {
                reference.push(...rendered);
            }
        }
    }

    // if (at === 0) {

    const innerCut = calculatePartialBorder(
        hits,
        lines,
        scale,
        blank != null
            ? // ugh do I just want  this to be tweakable?
              // seems like there ought to be some analytical solution
              blank === 0
                ? (v) => v >= each * ((blank + 2) * skip + 1) + min
                : (v) => v >= each * (blank * skip + 1) + min
            : // fallback
              (_) => true,
        // blank === 1
        //     ? (v) => v >= each * 2 + min // || v <= each + min
        //     : blank === 0
        //     ? (v) => v >= each + min
        //     : (v) => true,
        // : (v) => v >= each + min,
        // each + min
    );
    // }

    return {
        w,
        h,
        vmargin,
        pixelsPerMM,
        trail: trailData,
        cuts,
        alts,
        skips,
        reference,
        borders,
        innerCut,
        wmargin,
        min,
        max,
    };
}

export const trailPoints = (trail: Trail, dataset: Dataset, scale: number) => {
    return trail.data.trackData.map((track) => {
        return track.map((p) => {
            const x = p.lon - Math.floor(p.lon);
            const y = 1 - (p.lat - Math.floor(p.lat));
            return {
                x: (x * dataset.ow - dataset.x) * scale,
                y: (y * dataset.oh - dataset.y) * scale,
            };
        });
    });
};
