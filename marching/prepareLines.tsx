import { levelPoints, polyLines } from './render';
import { Dataset, Trail } from './App';
import { Settings } from './App';
import { borderHexes, hex } from './hex';
import { Point } from '/Users/jared/clone/exploration/terraform/marching/calculateLines';

export type Lines = {
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
    innerCut: Array<[Point, Point]>;
    min: number;
    max: number;
    pixelsPerMM: number;
};

export const arrangeCut = (
    hits: Array<Point>,
    lines: Dataset['rows'],
    scale: number,
    isGood: (v: number) => boolean,
    // threshold: number,
): Array<[Point, Point]> => {
    const h = lines.length * scale;
    const w = lines[0].length * scale;
    const cx = w / 2;
    const cy = h / 2;
    // Sorted clockwise!
    const hangles = hits
        .map((p) => ({ p, t: Math.atan2(p[1] - cy, p[0] - cx) }))
        .sort((a, b) => a.t - b.t)
        .map((d) => d.p);
    // const hpx = h * scale,
    // const wpx = w * scale + (vmargin * 2 * 2) / Math.sqrt(3);
    const res: Array<[Point, Point]> = [];
    hangles.forEach((p, i) => {
        const next = i === 0 ? hangles.length - 1 : i - 1;
        const p2 = hangles[next];
        const dx = p2[0] - p[0];
        const dy = p2[1] - p[1];
        const mid = [p[0] + dx / 2, p[1] + dy / 2];

        const x = mid[0] / scale;
        const y = mid[1] / scale;
        const v = lines[y | 0][x | 0];
        if (isGood(v)) {
            // res.push([p, p2]);
            res.push([
                [p[0] + scale / 2, p[1] + scale / 2],
                [p2[0] + scale / 2, p2[1] + scale / 2],
            ]);
        }
    });
    console.log(res);
    return res;
};

export function prepareLines(
    dataset: Dataset,
    {
        width: widthInMM,
        thickness,
        skip,
        scale,
        tweak,
        margin: hmargin,
        blanks,
    }: Settings,
    blank?: number,
    trail?: Trail,
): Lines {
    const lines = dataset.rows;

    let max = -Infinity;
    let min = Infinity;
    lines.forEach((line) =>
        line.forEach((v) => {
            max = Math.max(v, max);
            min = Math.min(v, min);
        }),
    );
    min += tweak;

    const heightInMM = max * widthInMM;
    const materialLayers = Math.round(heightInMM / thickness);
    const layers = (materialLayers + 1) * skip - 1;

    const steps = layers;

    const margin = (hmargin * Math.sqrt(3)) / 2;

    const pixelsPerMM = (scale * lines[0].length) / widthInMM;
    const vmargin = margin * pixelsPerMM;
    const wmargin = (vmargin * 2) / Math.sqrt(3);

    const w = scale * lines[0].length + wmargin * 2;
    const h = scale * lines.length + vmargin * 2;

    const borders = borderHexes(lines[0].length, lines.length, scale, vmargin);

    const cuts = [];
    const alts = [];
    const skips = [];
    const reference = [];

    let innerCut: Array<[Point, Point]> = [];

    const polyPoints =
        dataset.shape === 'hex'
            ? borderHexes(lines[0].length, lines.length, scale, 0)[0].map(
                  ([x, y]): Point => [x - scale / 2, y - scale / 2],
              )
            : rectClip(lines, scale);

    const clipPoly = polyLines(polyPoints);

    const hits: Array<Point> = polyPoints.slice();
    const each = (max - min) / steps;
    for (let at = 0; at < steps; at++) {
        const th = each * (at + 1) + min;
        const rendered: Array<Array<[number, number]>> = levelPoints(
            th,
            lines,
            scale,
            clipPoly,
            hits,
        ).map((line) => line.map(([x, y]) => [x + wmargin, y + vmargin]));

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
    innerCut = arrangeCut(
        hits,
        lines,
        scale,
        blank === 1
            ? (v) => v >= each * 2 + min || v <= each + min
            : blank === 0
            ? (v) => v >= each + min
            : (_) => true,
        // each + min
    );
    // }

    return {
        w,
        h,
        vmargin,
        pixelsPerMM,
        trail: trail
            ? trailPoints(trail, dataset, scale).map((line) =>
                  line.map(({ x, y }) => ({
                      x: x + wmargin,
                      y: y + vmargin,
                  })),
              )
            : null,
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
const trailPoints = (trail: Trail, dataset: Dataset, scale: number) => {
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
function rectClip(
    lines: number[][],
    scale: number,
): import('/Users/jared/clone/exploration/terraform/marching/calculateLines').Point[] {
    return [
        [0, 0],
        [0, lines.length * scale],
        [lines[0].length * scale, lines.length * scale],
        [lines[0].length * scale, 0],
    ];
}
