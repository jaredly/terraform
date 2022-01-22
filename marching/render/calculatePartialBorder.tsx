import { Dataset } from '../App';
import { Point } from './marchingSquares';

// Calculates the parts of the inner border that need to be cut.

export const calculatePartialBorder = (
    hits: Array<Point>,
    lines: Dataset['rows'],
    scale: number,
    isGood: (v: number) => boolean,
): Array<Array<Point>> => {
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
    const res: Array<Array<Point>> = [];
    let lastHit = false;
    hangles.forEach((pos, i) => {
        const prevIdx = i === 0 ? hangles.length - 1 : i - 1;
        const prev = hangles[prevIdx];
        const dx = prev[0] - pos[0];
        const dy = prev[1] - pos[1];
        const hit = [0.25, 0.5, 0.75].some((z) => {
            const mid = [pos[0] + dx * z, pos[1] + dy * z];

            const x = mid[0] / scale;
            const y = mid[1] / scale;
            const v = lines[y | 0][x | 0];
            return isGood(v);
        });
        // const mid = [p[0] + dx / 2, p[1] + dy / 2];
        // const x = mid[0] / scale;
        // const y = mid[1] / scale;
        // const v = lines[y | 0][x | 0];
        // if (isGood(v)) {
        if (hit) {
            const posShifted: Point = [pos[0] + scale / 2, pos[1] + scale / 2];
            const prevShifted: Point = [
                prev[0] + scale / 2,
                prev[1] + scale / 2,
            ];

            // // Maybe join it to the previous one
            // if (res.length) {
            //     const last = res[res.length - 1];
            //     if (closePos(last[last.length - 1], prevShifted)) {
            //         last.push(posShifted);
            //         return;
            //     }
            // }
            if (lastHit) {
                res[res.length - 1].push(posShifted);
            } else {
                res.push([prevShifted, posShifted]);
            }
        }
        lastHit = hit;
    });

    return res;
};
