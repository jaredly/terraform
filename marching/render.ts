import { calculateLines, Point } from './calculateLines';
import { polyfy } from './polyfy';

export const levelPoints = (
    threshhold: number,
    lines: Array<Array<number>>,
    scale: number,
    clipPolygon: Array<LineSlope>,
    hits: Array<Point>,
): Array<Array<[number, number]>> => {
    const rendered = calculateLines(true, lines, threshhold, scale);

    const p = polyfy(clipToPolygon(rendered, clipPolygon, hits));
    return p.map((points) => {
        return points.map(([x, y]) => [x + scale / 2, y + scale / 2]);
    });
};

export const EPSILON = 0.1;
export const closeEnough = (a: number, b: number) => Math.abs(a - b) < EPSILON;

export type LineSlope = {
    m: number;
    b: number;
    t: number;
    // true if above/left is "inside"
    aboveLeft: boolean;
    limit: [number, number];
};

export const lineToSlope = (p1: Point, p2: Point): LineSlope => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const t = Math.atan2(dy, dx);
    if (closeEnough(p1[0], p2[0])) {
        return {
            m: Infinity,
            b: p1[0],
            t,
            aboveLeft: p2[1] < p2[0],
            limit: [Math.min(p1[1], p2[1]), Math.max(p1[1], p2[1])],
        };
    }
    const m = dy / dx;
    const b = p1[1] - m * p1[0];
    return {
        m,
        b,
        t,
        aboveLeft: p2[0] < p1[0],
        limit: [Math.min(p1[0], p2[0]), Math.max(p1[0], p2[0])],
    };
};

export const intersection = (
    one: LineSlope,
    two: LineSlope,
): boolean | Point => {
    if (closeEnough(one.m, two.m)) {
        return closeEnough(one.b, two.b);
    }
    if (two.m === Infinity) {
        return intersection(two, one);
    }
    if (one.m === Infinity) {
        const x = one.b;
        const y = two.m * x + two.b;
        return [x, y];
    } else {
        // y = mx + b
        // y = m2x + b2
        // mx + b = m2x + b2
        // mx - m2x = b2 - b
        // x (m - m2) = b2 - b
        // x = (b2 - b) / (m - m2)
        const x = (two.b - one.b) / (one.m - two.m);
        const y = one.m * x + one.b;
        return [x, y];
    }
};

export const isInside = (p: Point, clip: LineSlope) => {
    if (clip.m === Infinity) {
        const left = p[0] <= clip.b + EPSILON;
        return left === clip.aboveLeft;
    } else {
        const y = clip.m * p[0] + clip.b;
        const above = p[1] <= y + EPSILON;
        return above === clip.aboveLeft;
    }
};

export const polyLines = (poly: Array<Point>) => {
    const res: Array<LineSlope> = [];
    for (let i = 0; i < poly.length; i++) {
        const next = i === 0 ? poly.length - 1 : i - 1;
        res.push(lineToSlope(poly[next], poly[i]));
    }
    return res;
};

export const withinLimit = (v: number, [low, high]: [number, number]) =>
    low - EPSILON < v && v < high + EPSILON;

export const withinLine = (point: Point, line: LineSlope) => {
    return line.m === Infinity
        ? withinLimit(point[1], line.limit)
        : withinLimit(point[0], line.limit);
};

// clip [p1, p2] to be on the clockwise side of the clip line
export const clipToLine = (
    [p1, p2]: [Point, Point],
    clip: LineSlope,
    hits: Array<Point>,
): null | [Point, Point] => {
    const p1i = isInside(p1, clip);
    const p2i = isInside(p2, clip);
    if (!p1i && !p2i) {
        return null;
    }
    if (p1i && p2i) {
        return [p1, p2];
    }
    const slope = lineToSlope(p1, p2);
    const hit = intersection(clip, slope);
    if (hit === false) {
        return null;
    }
    if (hit === true) {
        return [p1, p2];
    }
    if (withinLine(hit, clip)) {
        hits.push(hit);
    }
    return p1i ? [p1, hit] : [hit, p2];
};

export const clipToPolygon = (
    lines: Array<[Point, Point]>,
    polygon: Array<LineSlope>,
    hits: Array<Point>,
) => {
    const result: Array<[Point, Point]> = [];
    lines.forEach((line) => {
        for (let clip of polygon) {
            const res = clipToLine(line, clip, hits);
            if (!res) {
                return;
            }
            line = res;
        }
        result.push(line);
        // polygon.forEach(clip => {
        //     const res = clipToLine(line, clip)
        //     if (res)
        // })
    });
    return result;
    // const clipped: Array<[Point, Point]> = [];
    // rendered.forEach(([p1, p2]) => {
    //     clipped.push([p1, p2]);
    // });
};

export const renderLevel = (
    ctx: CanvasRenderingContext2D,
    threshhold: number,
    lines: Array<Array<number>>,
    scale: number,
    clipPolygon: Array<LineSlope>,
    hits: Array<Point>,
) => {
    levelPoints(threshhold, lines, scale, clipPolygon, hits).forEach((line) => {
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
