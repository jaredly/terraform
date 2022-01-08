import { Point } from './calculateLines';

// if (dataset.shape === 'hex') {
//     lines.forEach((line, y) => {
//         line.forEach((_, x) => {
//             if (!isValid(x, y)) {
//                 line[x] = -1000;
//             }
//         });
//     });
// }
// ctx.globalAlpha = 0.2;
// lines.forEach((line, y) => {
//     line.forEach((v, x) => {
//         const to = (v - min) / (max - min);
//         ctx.fillStyle = `hsl(${(to * 360 * 10) % 360}, 100%, 50%)`;
//         ctx.fillRect(x * scale, y * scale, scale, scale);
//     });
// });
// ctx.globalAlpha = 1;
export const polyfy = (lines: Array<[Point, Point]>): Array<Array<Point>> => {
    const map: { [key: string]: Array<Point> } = {};
    const res: Array<Array<Point>> = [];

    const keys: Array<[string, Point]> = [];

    lines.forEach(([p1, p2], i) => {
        const k1 = coordKey(p1);
        const k2 = coordKey(p2);
        keys.push([k1, p1], [k2, p2]);
        if (!map[k1]) {
            map[k1] = [p1, p2];
        } else {
            map[k1].push(p2);
        }
        if (!map[k2]) {
            map[k2] = [p2, p1];
        } else {
            map[k2].push(p1);
        }
    });

    const singles = Object.keys(map).filter((k) => map[k].length === 2);

    const followPath = (k: string, p: Point) => {
        const points = [p];
        const covered: { [key: string]: true } = { [k]: true };
        while (map[k]) {
            const good = map[k].find((p, i) => i > 0 && !covered[coordKey(p)]);
            delete map[k];
            if (!good) {
                break;
            }
            k = coordKey(good);
            covered[k] = true;
            points.push(good);
        }
        return points;
    };

    // Any lines that are open ended, handle those first
    singles.forEach((k) => {
        if (map[k]) {
            res.push(followPath(k, map[k][0]));
        }
    });

    // For everything else, start & end point is arbitrary,
    // but make sure to connect the loop at the end.
    keys.forEach(([k, p]) => {
        if (map[k]) {
            const points = followPath(k, p);
            points.push(p);
            res.push(points);
        }
    });

    return res;
};
const numKey = (n: number) => n.toFixed(3);
const coordKey = ([x, y]: Point) => `${numKey(x)},${numKey(y)}`;
