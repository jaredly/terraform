import { calculateLines } from './calculateLines';
import { polyfy } from './polyfy';
// import { dataset } from './run';

export const levelPoints = (
    threshhold: number,
    lines: Array<Array<number>>,
    scale: number,
    isHex: boolean,
): Array<Array<[number, number]>> => {
    const rendered = calculateLines(true, lines, threshhold, scale, (x, y) =>
        isHex ? isValidHex(x, y, lines) : true,
    );

    const p = polyfy(rendered);
    return p.map((points) => {
        return points.map(([x, y]) => [x + scale / 2, y + scale / 2]);
    });
};

export const renderLevel = (
    ctx: CanvasRenderingContext2D,
    threshhold: number,
    lines: Array<Array<number>>,
    scale: number,
    isHex: boolean,
) => {
    levelPoints(threshhold, lines, scale, isHex).forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line[0][0], line[0][1]);
        line.slice(1).forEach(([x, y]) => {
            ctx.lineTo(x, y);
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
