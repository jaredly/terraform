import {
    calculateTopographicalLine,
    polyLines,
} from './calculateTopographicalLine';
import { Dataset, Trail } from '../App';
import { Settings } from '../App';
import { borderHexes } from './hex';
import { Point } from './marchingSquares';
import { trailPoints } from './assembleLinesForBlank';

export type TopographicalLines = {
    steps: number;
    allLines: Point[][][];
    hits: Point[];
    lines: number[][];
    each: number;
    min: number;
    trailData: null | Array<Array<{ x: number; y: number }>>;
    vmargin: number;
    pixelsPerMM: number;
    wmargin: number;
    max: number;
};

export function calculateTopographicalLines(
    dataset: Dataset,
    trail: undefined | Trail,
    {
        tweak,
        width: widthInMM,
        thickness,
        skip,
        horizontalMargin: hmargin,
        scale,
    }: Settings,
): TopographicalLines {
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

    const verticalMargin = (hmargin * Math.sqrt(3)) / 2;

    // Why minus 1? Because we're drawing these topo lines from the centers
    // of pixels. so between 3 pixels, the topo lines only extend 2 units.
    const horizontalPixels = ((scale * (lines.length - 1)) / Math.sqrt(3)) * 2;
    // const pixelsPerMM = 3;
    const pixelsPerMM = horizontalPixels / widthInMM;
    const vmargin = verticalMargin * pixelsPerMM;
    const wmargin = hmargin * pixelsPerMM;

    const polyPoints =
        dataset.shape === 'hex'
            ? borderHexes(lines[0].length, lines.length, scale, 0)[0].map(
                  ([x, y]): Point => [x - scale / 2, y - scale / 2],
              )
            : rectClip(lines, scale);
    const clipPoly = polyLines(polyPoints);
    const hits: Array<Point> = polyPoints.slice();
    const each = (max - min) / steps;

    const allLines = [];

    for (let at = 0; at < steps; at++) {
        const th = each * (at + 1) + min;
        const rendered: Array<Array<[number, number]>> =
            calculateTopographicalLine(th, lines, scale, clipPoly, hits).map(
                (line) => line.map(([x, y]) => [x + wmargin, y + vmargin]),
            );

        allLines.push(rendered);
    }
    const trailData = trail
        ? trailPoints(trail, dataset, scale).map((line) =>
              line.map(({ x, y }) => ({
                  x: x + wmargin,
                  y: y + vmargin,
              })),
          )
        : null;
    return {
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
    };
}
function rectClip(
    lines: number[][],
    scale: number,
): import('./marchingSquares').Point[] {
    return [
        [0, 0],
        [0, lines.length * scale],
        [lines[0].length * scale, lines.length * scale],
        [lines[0].length * scale, 0],
    ];
}
