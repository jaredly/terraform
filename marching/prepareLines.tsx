import { levelPoints } from './render';
import { Dataset, Trail } from './App';
import { Settings } from './App';

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
    min: number;
    max: number;
    pixelsPerMM: number;
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

    for (let at = 0; at < steps; at++) {
        const th = ((max - min) / steps) * at;
        const rendered: Array<Array<[number, number]>> = levelPoints(
            th,
            lines,
            scale,
            dataset.shape === 'hex',
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
const borderHexes = (w: number, h: number, scale: number, vmargin: number) => {
    const hpx = h * scale + vmargin * 2;
    const wpx = w * scale + (vmargin * 2 * 2) / Math.sqrt(3);
    return [
        hex(wpx / 2, hpx / 2, (((h - 1.0) * scale) / 2 / Math.sqrt(3)) * 2),
        hex(wpx / 2, hpx / 2, (hpx / 2 / Math.sqrt(3)) * 2 - 1),
    ];
};
const hex = (cx: number, cy: number, r: number): Array<[number, number]> => {
    const h = (r / 2) * Math.sqrt(3);
    return [
        [cx - r, cy],
        [cx - r / 2, cy - h],
        [cx + r / 2, cy - h],
        [cx + r, cy],
        [cx + r / 2, cy + h],
        [cx - r / 2, cy + h],
    ];
};
