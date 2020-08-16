// const toKey = ([[x1, y1], [x2, y2]]) => `${x1}:${y1}:${x2}:${y2}`;
const pointKey = ([x, y]) => `${x}:${y}`;

const organizeLevel = (segments) => {
    const paths = {};
    const byEndPoint = {};
    const add = (i, p, start) => {
        const k = pointKey(p);
        if (!byEndPoint[k]) {
            byEndPoint[k] = [];
        }
        byEndPoint[k].push({ i, start });
    };
    segments.forEach((points, i) => {
        add(i, points[0], true);
        add(i, points[points.length - 1], false);
        paths[i] = points;
    });
    const waiting = Object.keys(segments).slice();
    // To simplify, we only add to the end
    while (waiting.length) {
        const current = +waiting.shift();
        const points = paths[current];
        const p2 = points[points.length - 1];
        const p = byEndPoint[pointKey(p2)];
        if (!p.some((i) => i.i == current)) {
            console.log(current, p);
            throw new Error('Current not in p');
        }
        if (p.length === 2 && !p.every((i) => i.i == current)) {
            const other = p.filter((i) => i.i != current)[0].i;
            const otherPoints = paths[other];
            if (!otherPoints) {
                throw new Error(
                    `${other} found in points ${pointKey(
                        p2,
                    )} but has been removed`,
                );
            }
            const o1 = otherPoints[0];
            const o2 = otherPoints[otherPoints.length - 1];

            // move this end point
            byEndPoint[pointKey(p2)] = byEndPoint[pointKey(p2)].filter(
                (i) => i.i !== current,
            );

            // remove other
            byEndPoint[pointKey(o1)] = byEndPoint[pointKey(o1)].filter(
                (i) => i.i !== other,
            );
            byEndPoint[pointKey(o2)] = byEndPoint[pointKey(o2)].filter(
                (i) => i.i !== other,
            );
            delete paths[other];
            const idx = waiting.indexOf(other + '');
            if (idx !== -1) {
                waiting.splice(idx, 1);
            }

            // join up
            if (pointKey(o1) === pointKey(p2)) {
                points.push(...otherPoints.slice(1));
                byEndPoint[pointKey(o2)].push({ i: current, start: false });
            } else if (pointKey(o2) === pointKey(p2)) {
                points.push(...otherPoints.slice(0, -1).reverse());
                byEndPoint[pointKey(o1)].push({ i: current, start: false });
            } else {
                throw new Error('other end point not matching p2');
            }
            waiting.unshift(current);
        } else if (p.length === 4) {
            // console.log('4p');
            // const find = (at) =>
            //     p.find((m) => {
            //         const point = m.start
            //             ? paths[m.i][1]
            //             : paths[m.i][paths[m.i].length - 2];
            //         if (point[0] === at[0] && point[1] === at[1]) {
            //             return m;
            //         }
            //         // console.log(m, point, at);
            //     });
            // // console.log('sides of', p2);
            // const top = find([p2[0], p2[1] - 2]);
            // const left = find([p2[0] - 2, p2[1]]);
            // const bottom = find([p2[0], p2[1] + 2]);
            // const right = find([p2[0] + 2, p2[1]]);
            // // console.log(top, left, bottom, right);
            // // STOPHSIP START HERE
            // if (top.i === left.i || bottom.i === right.i) {
            //     // join top to right
            //     // join bottom to left
            // } else {
            //     // the other one
            // }
            // waiting.unshift(current);
            // Two options:
            // top and left should connect, bottom and right should connect
            // top and right should connect, bottom and left should connect
            // How to distinguish? Whichever doesn't form a cycle. If top and left are same, then split them.
        } else {
            // can't join it, sorry
        }
    }
    return Object.keys(paths).map((k) => paths[k]);
};

const midPoint = ([a, b], [c, d]) => [(a + c) / 2, (b + d) / 2];
const simplifyPath = (points) =>
    simplify(
        points.map(([x, y]) => ({ x, y })),
        2,
        true,
    ).map((p) => [p.x, p.y]);

const colors = 'red,green,blue,orange,purple,black,pink,magenta'.split(',');
const getColor = (i) => colors[i % colors.length];

const borderingCells = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
];

const segmentFor = (x, y, dx, dy) => {
    if (dx === -1) {
        return [
            [x * 2 - 1, y * 2 - 1],
            [x * 2 - 1, y * 2 + 1],
        ];
    }
    if (dx === 1) {
        return [
            [x * 2 + 1, y * 2 - 1],
            [x * 2 + 1, y * 2 + 1],
        ];
    }
    if (dy === -1) {
        return [
            [x * 2 - 1, y * 2 - 1],
            [x * 2 + 1, y * 2 - 1],
        ];
    }
    return [
        [x * 2 - 1, y * 2 + 1],
        [x * 2 + 1, y * 2 + 1],
    ];
};

const boundaryPolygon = (stepped, shape) => {
    const w = stepped[0].length * 2;
    const h = stepped.length * 2;
    if (shape === 'hex') {
        const hh = h / 2;
        const indent = w / 4;
        return [
            { x: indent, y: 0 },
            { x: w - indent, y: 0 },
            { x: w, y: hh },
            { x: w - indent, y: h },
            { x: indent, y: h },
            { x: 0, y: hh },
        ];
    } else {
        return [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
        ];
    }
};

const isValid = (stepped, x, y, shape) => {
    if (shape === 'hex') {
        const hh = stepped.length / 2;
        const indent = stepped[0].length / 4;
        const m = -hh / indent;
        const b = hh;
        const offset = Math.abs((y - b) / m);
        if (x < offset || x > stepped[0].length - offset) {
            return false;
        }
    }
    return x > 0 && y > 0 && x < stepped[0].length && y < stepped.length;
};

const makeInitialSegments = (stepped, shape) => {
    const segments = {};
    stepped.forEach((line, y) => {
        line.forEach((cell, x) => {
            borderingCells.forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = y + dy;
                if (isValid(stepped, nx, ny, shape)) {
                    const adjacent = stepped[ny][nx];
                    for (let i = cell; i < adjacent; i++) {
                        if (!segments[i]) {
                            segments[i] = [];
                        }
                        segments[i].push(segmentFor(x, y, dx, dy));
                    }
                }
            });
        });
    });

    return segments;
};

const processLevel = (paths) => {
    paths = organizeLevel(paths);
    paths = organizeLevel(paths.map((points) => points.reverse()));
    paths = paths.filter(
        (points) =>
            points.length > 10 ||
            pointKey(points[0]) !== pointKey(points[points.length - 1]),
    );
    paths = paths.map(simplifyPath);
    paths = paths.filter(
        (points) =>
            points.length > 10 ||
            pointKey(points[0]) !== pointKey(points[points.length - 1]),
    );
    paths = organizeLevel(paths);
    paths = paths.filter(
        (points) =>
            points.length > 10 ||
            pointKey(points[0]) !== pointKey(points[points.length - 1]),
    );
    return paths;
};

const getSubColor = (num, first, skip) => (i) => {
    // 'red' is cut, 'blue' is trace
    // "first" means "the one that's connected to the bottom,
    // where 0 through num are blue,
    // num through num * 2 are skipped, then num * 2 is red.
    if (!first) {
        if (i < num) {
            return;
        }
        i = i - num;
    }
    const im = i % (num * 2);
    if (i === 0 && first) {
        return 'blue';
    }
    if (im === 0) {
        return 'red';
    }
    if (im <= num) {
        return 'blue';
    }
};

const generic = (p1, p2) => {
    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const b = p1.y - m * p1.x;
    return [m, b];
};

const dist = (a, b) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
const angleTo = (p0, p1) => Math.atan2(p1.y - p0.y, p1.x - p0.x);

const lineToLine = (ap1, ap2, bp1, bp2) => {
    let [m1, b1] = generic(ap1, ap2);
    let av = Math.abs(ap1.x - ap2.x) < 0.001;
    let [m2, b2] = generic(bp1, bp2);
    let bv = Math.abs(bp1.x - bp2.x) < 0.001;
    if (av && bv) {
        return null;
    } else if (av) {
        return { x: ap2.x, y: ap2.x * m2 + b2 };
    } else if (bv) {
        return { x: bp1.x, y: bp1.x * m1 + b1 };
    } else if (m1 == m2) {
        return null;
    } else {
        let x = (b2 - b1) / (m1 - m2);
        let y = m1 * x + b1;
        return { x, y };
    }
};

const push = (p, t, m) => ({
    x: p.x + Math.cos(t) * m,
    y: p.y + Math.sin(t) * m,
});

const toObj = ([x, y]) => ({ x, y });
const toArr = ({ x, y }) => [x, y];

const lineToPoint = (p0, p1, p2) => {
    const theta = angleTo(p0, p1);
    // console.log(theta, p2);
    const p3 = push(p2, theta + Math.PI / 2, 10);
    // console.log(p2, p3);
    const p = lineToLine(p0, p1, p2, p3);
    if (p) {
        return dist(p2, p);
    } else {
        return Infinity;
    }
};

const minDist = 4;

const getBoundaryPoints = (paths, polygon, firstCut) => {
    const pointsAlongBoundary = [];
    // console.log('Paths', Object.keys(paths));
    polygon.forEach((point, i) => {
        // console.log('side', i);
        pointsAlongBoundary.push({ point, corner: true });
        const next = polygon[i === polygon.length - 1 ? 0 : i + 1];
        const closeEnough = [];
        Object.keys(paths).forEach((k, ki) => {
            paths[k].forEach((path, i) => {
                const first = toObj(path[0]);
                const last = toObj(path[path.length - 1]);
                const d1 = lineToPoint(point, next, first);
                if (d1 < minDist) {
                    closeEnough.push({
                        point: first,
                        k: ki,
                        i,
                        dist: dist(point, first),
                    });
                    // } else if (ki == firstCut) {
                    //     console.log(d1, first, ki, firstCut, k);
                }
                const d2 = lineToPoint(point, next, last);
                if (d2 < minDist) {
                    closeEnough.push({
                        point: last,
                        k: ki,
                        i,
                        dist: dist(point, last),
                    });
                    // } else if (ki == firstCut) {
                    //     console.log(d2, last, ki, firstCut, k);
                }
                // console.log(d1, d2);
            });
        });
        closeEnough.sort((a, b) => a.dist - b.dist);
        pointsAlongBoundary.push(...closeEnough);
    });

    return pointsAlongBoundary;
};

const makeBoundary = (paths, polygon, firstCut) => {
    const pointsAlongBoundary = getBoundaryPoints(paths, polygon, firstCut);
    // console.log(pointsAlongBoundary);
    // ok, so what we want is: "spans of firstCut to firstCut, and whether there are other things in between them."
    const spans = [];
    let initialPoint = null;
    let current = null;
    // let firstPoint = null
    // let hasOthers = false
    // console.log(firstCut);
    pointsAlongBoundary.forEach((point, i) => {
        if (point.k == firstCut) {
            if (!initialPoint) {
                initialPoint = point;
            }
            if (current) {
                spans.push({
                    i0: current.i0,
                    hasOthers: current.hasOthers,
                    i1: i,
                    path: current.path.concat([point.point]),
                });
            }
            current = { i0: i, path: [point.point], hasOthers: null };
            return;
        }
        if (point.corner) {
            if (current) {
                current.path.push(point.point);
            }
            return;
        }
        if (current) {
            if (+point.k > firstCut) {
                current.hasOthers = true;
            }
            if (+point.k < firstCut) {
                current.hasOthers = false;
            }
        }
    });

    if (current) {
        pointsAlongBoundary.some((point, i) => {
            if (point.k == firstCut) {
                if (current) {
                    spans.push({
                        i0: current.i0,
                        i1: i,
                        hasOthers: current.hasOthers,
                        path: current.path.concat([point.point]),
                    });
                }
                current = { i0: i, path: [point.point], hasOthers: null };
                return true;
            }
            if (point.corner) {
                if (current) {
                    current.path.push(point.point);
                }
                return;
            }
            if (current && +point.k > firstCut) {
                current.hasOthers = true;
            }
        });
    }

    let lastHad = null;
    const runIt = () => {
        spans.forEach((span) => {
            if (lastHad !== null) {
                // if (span.hasOthers != null && span.hasOthers === lastHad) {
                //     console.log(spans, span, lastHad);
                //     throw new Error('Oh noes');
                // }
                span.hasOthers = !lastHad;
            }
            lastHad = span.hasOthers;
        });
    };

    runIt();
    runIt();

    // console.log(spans);
    return spans.filter((span) => span.hasOthers).map((span) => span.path);
};

const normalizeTrail = (trail, rawData) => {
    // TODO this won't work if a trail spans multiple tiles ....
    // But it works for now
    const tileBounds = {
        x: Math.floor(trail[0].lon),
        y: Math.ceil(trail[0].lat),
        w: 1,
        h: -1,
    };
    const innerBounds = {
        x: tileBounds.x + (rawData.x / rawData.ow) * tileBounds.w,
        y: tileBounds.y + (rawData.y / rawData.oh) * tileBounds.h,
        w: (rawData.w / rawData.ow) * tileBounds.w,
        h: (rawData.h / rawData.oh) * tileBounds.h,
    };
    let points = trail.map((item) => {
        let x = (item.lon - innerBounds.x) / innerBounds.w;
        let y = (item.lat - innerBounds.y) / innerBounds.h;
        return { x, y };
    });
    return simplify(points, 1 / 400, true);
};

const createImage = (
    title,
    rawData,
    trail,
    { sub, first, minStep, thickness, width, margin },
) => {
    const csv = rawData.rows;
    let min = Infinity;
    let max = -Infinity;

    csv.forEach((line) =>
        line.forEach((item) => {
            min = Math.min(min, item);
            max = Math.max(max, item);
        }),
    );

    // TODO I'd rather terraform didn't pre-normalize this to the "longest side"
    // would rather have it just be "in the same units as the x/y plane"
    const heightInMM = max * width;
    const materialLayers = Math.round(heightInMM / thickness);
    const layers = (materialLayers + 1) * sub - 1;
    console.log(heightInMM / thickness, materialLayers, heightInMM);
    // console.log(heightInMM, materialLayers, layers);

    const step = (max - min) / layers;
    const stepped = csv.map((line) =>
        line.map((item) => parseInt((item - min) / step)),
    );
    const segments = makeInitialSegments(stepped, rawData.shape);

    const paths = {};
    Object.keys(segments).forEach(
        (level) => (paths[level] = processLevel(segments[level])),
    );

    let total = 0;
    Object.keys(paths).forEach((k) => (total += paths[k].length));
    console.log(`All paths: ${total}`);
    const trailPath = trail
        ? normalizeTrail(trail.data.trackData[0], rawData)
        : null;

    width = parseInt(width);
    const ow = stepped[0].length * 2;
    const oh = stepped.length * 2;
    const height = (width / ow) * oh;

    const getColor = getSubColor(sub, first, minStep);
    const polygon = boundaryPolygon(stepped, rawData.shape);
    const fullBoundryPath = closePath(polygon);

    const internalMargin = 2;

    const firstTile = showTile(
        title,
        paths,
        trailPath,
        makeBoundary(paths, polygon, sub * 2),
        fullBoundryPath,
        {
            ow,
            oh,
            width,
            margin,
        },
        getSubColor(sub, true, minStep),
    );

    const secondTile = showTile(
        title,
        paths,
        trailPath,
        [fullBoundryPath],
        fullBoundryPath,
        {
            ow,
            oh,
            width,
            margin,
        },
        getSubColor(sub, false, minStep),
    );

    return svgNode(
        width * 2 + internalMargin,
        height,
        `<g>${firstTile}</g>
    <g transform="translate(${width + internalMargin} 0)">${secondTile}</g>`,
    );
};

const closePath = (path) => path.concat([path[0]]);
