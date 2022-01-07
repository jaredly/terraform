// let gridValues: Array<Array<number>> = [];
// let inputValues: Array<Array<number>> = [];

export function generateMap(width: number, height: number) {
    const inputValues = new Array(0 | (1 + height));
    //the grid is one smaller in x and y direction than the input
    const gridValues = new Array(inputValues.length - 1);
    for (var y = 0; y < inputValues.length; y++)
        inputValues[y] = new Array(0 | (1 + width));

    for (var y = 0; y < gridValues.length; y++)
        gridValues[y] = new Array(inputValues[0].length - 1);

    return { inputValues, gridValues };
}

// I don't think this is necessary...
export const populateGrid = (
    threshhold: number,
    gridValues: Array<Array<number>>,
    inputValues: Array<Array<number>>,
) => {
    for (var y = 0; y < gridValues.length; y++) {
        for (var x = 0; x < gridValues[y].length; x++) {
            gridValues[y][x] = stateForGridPosition(
                inputValues,
                y,
                x,
                threshhold,
            );
        }
    }
};

export function stateForGridPosition(
    inputValues: number[][],
    y: number,
    x: number,
    threshhold: number,
): number {
    return binaryToType(
        inputValues[y][x] > threshhold ? 1 : 0,
        inputValues[y][x + 1] > threshhold ? 1 : 0,
        inputValues[y + 1][x + 1] > threshhold ? 1 : 0,
        inputValues[y + 1][x] > threshhold ? 1 : 0,
    );
}

function binaryToType(nw: number, ne: number, se: number, sw: number) {
    let a = [nw, ne, se, sw];
    // if (nw != 0 || ne != 0 || se != 0 || sw != 0) {
    //     console.log(a);
    // }
    // fila;
    return a.reduce((res, x) => (res << 1) | x);
}

type Point = [number, number];

export function calculateLines(
    interpolation: boolean,
    // gridValues: Array<Array<number>>,
    inputValues: Array<Array<number>>,
    threshhold: number,
    rez: number,
    isValid: (x: number, y: number) => boolean,
) {
    // const rez = 1;
    const lines: Array<[Point, Point]> = [];

    const addLine = (p1: Point, p2: Point) => lines.push([p1, p2]);

    let missed = 0;

    for (var y = 0; y < inputValues.length - 1; y++) {
        for (var x = 0; x < inputValues[y].length - 1; x++) {
            if (
                !isValid(x, y) ||
                !isValid(x + 1, y + 1) ||
                !isValid(x + 1, y - 1) ||
                !isValid(x - 1, y + 1)
            ) {
                continue;
            }
            let a: Point, b: Point, c: Point, d: Point;
            if (!interpolation) {
                //abcd uninterpolated
                a = [x * rez + rez / 2, y * rez];
                b = [x * rez + rez, y * rez + rez / 2];
                c = [x * rez + rez / 2, y * rez + rez];
                d = [x * rez, y * rez + rez / 2];
            } else {
                //abcd interpolated
                const nw = inputValues[y][x];
                const ne = inputValues[y][x + 1];
                const se = inputValues[y + 1][x + 1];
                const sw = inputValues[y + 1][x];
                a = [x * rez + rez * lerp(threshhold, nw, ne), y * rez];
                b = [x * rez + rez, y * rez + rez * lerp(threshhold, ne, se)];
                c = [x * rez + rez * lerp(threshhold, sw, se), y * rez + rez];
                d = [x * rez, y * rez + rez * lerp(threshhold, nw, sw)];
            }

            const v = stateForGridPosition(inputValues, y, x, threshhold);
            switch (v) {
                case 1:
                case 14:
                    addLine(d, c);
                    break;

                case 2:
                case 13:
                    addLine(b, c);
                    break;

                case 3:
                case 12:
                    addLine(d, b);
                    break;

                case 11:
                case 4:
                    addLine(a, b);
                    break;

                case 5:
                    addLine(d, a);
                    addLine(c, b);
                    break;
                case 6:
                case 9:
                    addLine(c, a);
                    break;

                case 7:
                case 8:
                    addLine(d, a);
                    break;

                case 10:
                    addLine(a, b);
                    addLine(c, d);
                    break;
                case 0:
                    missed++;
                default:
                    // console.log('what', v);
                    break;
            }
        }
    }
    console.log('missed', missed);
    // ctx.stroke();
    return lines;
}

function lerp(x: number, x0: number, x1: number, y0 = 0, y1 = 1) {
    if (x0 === x1) {
        return x0;
    }

    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

import '../exports/timp_hex.js';
import '../exports/tn_rect.js';
import '../exports/cec.js';
import '../exports/cec2.js';
import '../exports/arenal.js';
import '../exports/arenal-small.js';
import '../exports/arenal-large.js';
import '../exports/arenal-hex.js';

const data: {
    [key: string]: {
        rows: Array<Array<number>>;
        shape: 'rect' | 'hex';
        x: number;
        y: number;
        w: number;
        h: number;
        ow: number;
        oh: number;
    };
} = (window as any).data;

// const dataset =
//     data['/Users/jared/clone/exploration/terraform/tn_rect.js'];
// const dataset = data['/Users/jared/clone/exploration/terraform/timp_hex.js'];
// const dataset =
//     data['/Users/jared/clone/exploration/terraform/cec.js'];
// const dataset = data['/Users/jared/Downloads/cec2.js'];
// const dataset =
//     data['/Users/jared/Downloads/arenal.js'];
// const dataset =
//     data['/Users/jared/Downloads/arenal-small.js'];
// const dataset = data['/Users/jared/Downloads/arenal-large.js'];

const dataset = data['/Users/jared/Downloads/arenal-hex.js'];

const lines = dataset.rows;

let max = -Infinity;
let min = Infinity;
lines.forEach((line) =>
    line.forEach((v) => {
        max = Math.max(v, max);
        min = Math.min(v, min);
    }),
);

// TWEAK THESE
const widthInMM = 152;
const thickness = 3;

const skip = 1;

const heightInMM = max * widthInMM;
const materialLayers = Math.round(heightInMM / thickness);
const layers = (materialLayers + 1) * skip - 1;
console.log(heightInMM / thickness, materialLayers, heightInMM, layers);

const scale = 10;
const steps = layers;

const canvas = document.createElement('canvas');
canvas.width = scale * lines[0].length;
canvas.height = scale * lines.length;
canvas.style.width = `${(scale * lines[0].length) / 2}px`;
canvas.style.height = `${(scale * lines.length) / 2}px`;
const ctx = canvas.getContext('2d')!;

const isValid = (x: number, y: number) => {
    if (dataset.shape === 'hex') {
        const hh = lines.length / 2;
        const indent = lines[0].length / 4;
        const m = -hh / indent;
        const b = hh;
        const offset = Math.abs((y - b) / m);
        if (x < offset || x > lines[0].length - offset) {
            return false;
        }
    }
    return true;
};

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

const numKey = (n: number) => n.toFixed(3);
const coordKey = ([x, y]: Point) => `${numKey(x)},${numKey(y)}`;

const polyfy = (lines: Array<[Point, Point]>): Array<Array<Point>> => {
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

ctx.lineWidth = 0.5;

const render = (threshhold: number) => {
    console.log(lines.length, lines[0].length);
    const rendered = calculateLines(true, lines, threshhold, scale, isValid);

    const p = polyfy(rendered);
    p.forEach((points) => {
        ctx.beginPath();
        points.forEach(([x, y], i) => {
            if (i === 0) {
                ctx.moveTo(x + scale / 2, y + scale / 2);
            } else {
                ctx.lineTo(x + scale / 2, y + scale / 2);
            }
        });
        // ctx.lineTo(points[0][0], points[0][1]);
        ctx.stroke();
    });

    // ctx.beginPath();
    // rendered.forEach((line) => {
    //     ctx.moveTo(line[0][0] + scale / 2, line[0][1] + scale / 2);
    //     ctx.lineTo(line[1][0] + scale / 2, line[1][1] + scale / 2);
    // });
    // ctx.stroke();
};

// const inp = document.createElement('input');
// inp.type = 'range';
// inp.min = min.toFixed(4);
// inp.max = max.toFixed(4);
// inp.step = '0.001';
// inp.width = 200;
// inp.onchange = (evt) => {
//     render(+inp.value);
// };
// inp.value = ((min + max) / 2).toFixed(4);
// document.body.append(inp);

document.body.append(canvas);

const renderAt = (at: number) => {
    const th = ((max - min) / steps) * at;
    ctx.strokeStyle = `hsl(${(at / steps) * 360}, 100%, 50%)`;
    render(th);
};

// for (let at = 0; at < steps; at++) {
//     renderAt(at)
// }

let at = 0;
const fn = () => {
    if (at++ > steps) return;
    // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    renderAt(at);
    requestAnimationFrame(fn);
    // setTimeout(fn, 100)
};
fn();
