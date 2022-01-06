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

export function calculateLines(
    interpolation: boolean,
    // gridValues: Array<Array<number>>,
    inputValues: Array<Array<number>>,
    threshhold: number,
    rez: number,
) {
    // const rez = 1;
    const lines: Array<[Point, Point]> = [];
    type Point = [number, number];

    const addLine = (p1: Point, p2: Point) => lines.push([p1, p2]);

    let missed = 0;

    for (var y = 0; y < inputValues.length - 1; y++) {
        for (var x = 0; x < inputValues[y].length - 1; x++) {
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

const data: { [key: string]: { rows: Array<Array<number>> } } = (window as any)
    .data;

// const lines: Array<Array<number>> =
//     data['/Users/jared/clone/exploration/terraform/tn_rect.js'].rows;
// const lines: Array<Array<number>> =
//     data['/Users/jared/clone/exploration/terraform/timp_hex.js'].rows;
// const lines: Array<Array<number>> =
//     data['/Users/jared/clone/exploration/terraform/cec.js'].rows;
// const lines: Array<Array<number>> =
//     data['/Users/jared/Downloads/cec2.js'].rows;
// const lines: Array<Array<number>> =
//     data['/Users/jared/Downloads/arenal.js'].rows;
const lines: Array<Array<number>> =
    data['/Users/jared/Downloads/arenal-large.js'].rows;

const scale = 10;

const canvas = document.createElement('canvas');
canvas.width = scale * lines[0].length;
canvas.height = scale * lines.length;
canvas.style.width = `${(scale * lines[0].length) / 2}px`;
canvas.style.height = `${(scale * lines.length) / 2}px`;
const ctx = canvas.getContext('2d')!;

let max = -Infinity;
let min = Infinity;
lines.forEach((line) =>
    line.forEach((v) => {
        max = Math.max(v, max);
        min = Math.min(v, min);
    }),
);

// ctx.globalAlpha = 0.2;
// lines.forEach((line, y) => {
//     line.forEach((v, x) => {
//         const to = (v - min) / (max - min);
//         ctx.fillStyle = `hsl(${(to * 360 * 10) % 360}, 100%, 50%)`;
//         ctx.fillRect(x * scale, y * scale, scale, scale);
//     });
// });
// ctx.globalAlpha = 1;

const render = (threshhold: number) => {
    console.log(lines.length, lines[0].length);
    const rendered = calculateLines(true, lines, threshhold, scale);
    ctx.beginPath();
    // ctx.strokeStyle = 'red';
    ctx.lineWidth = 0.5;
    rendered.forEach((line) => {
        ctx.moveTo(line[0][0] + scale / 2, line[0][1] + scale / 2);
        ctx.lineTo(line[1][0] + scale / 2, line[1][1] + scale / 2);
    });
    ctx.stroke();
    // window.rendered = rendered;
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

const steps = 300;

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
