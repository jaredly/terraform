import { calculateLines } from './calculateLines';
import { polyfy } from './polyfy';
// import { dataset } from './run';

export const renderLevel = (
    ctx: CanvasRenderingContext2D,
    threshhold: number,
    lines: Array<Array<number>>,
    scale: number,
    isHex: boolean,
) => {
    // console.log(lines.length, lines[0].length);
    const rendered = calculateLines(true, lines, threshhold, scale, (x, y) =>
        isHex ? isValidHex(x, y, lines) : true,
    );

    const p = polyfy(rendered);
    p.forEach((points) => {
        ctx.beginPath();
        ctx.moveTo(points[0][0] + scale / 2, points[0][1] + scale / 2);
        points.slice(1).forEach(([x, y]) => {
            ctx.lineTo(x + scale / 2, y + scale / 2);
        });
        ctx.stroke();
    });
};

export const isValidHex = (
    x: number,
    y: number,
    lines: Array<Array<number>>,
) => {
    const iw = lines.length / 2 / Math.sqrt(3);

    x += 0.5;
    y += 0.5;

    const ax = Math.abs(x - lines[0].length / 2) - iw - 1;
    const ay = Math.abs(y - lines.length / 2);

    // const p1 = [0, lines.length / 2];
    // const p2 = [iw, 0];

    const mm = -lines.length / 2 / iw;
    const bb = lines.length / 2;

    const y2 = mm * ax + bb;
    return y2 >= ay;

    // const hh = lines.length / 2;
    // const indent = lines[0].length / 4;
    // const m = -hh / indent;
    // const b = hh;
    // const offset = Math.abs((y - b) / m);
    // if (x < offset || x > lines[0].length - offset) {
    //     return false;
    // }
    // return true;
};
