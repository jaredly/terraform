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

// STOPSHIP get this from the xml file or something, don't hard-code
const tileBounds = { x: -112, y: 41, w: 1, h: -1 }; // 41 to 40, -112 to -111

const showTrail = (trail, rawData, stepped) => {
    const innerBounds = {
        x: tileBounds.x + (rawData.x / rawData.ow) * tileBounds.w,
        y: tileBounds.y + (rawData.y / rawData.oh) * tileBounds.h,
        w: (rawData.w / rawData.ow) * tileBounds.w,
        h: (rawData.h / rawData.oh) * tileBounds.h,
    };
    let points = trail.data.trackData[0].map((item) => {
        let x =
            ((item.lon - innerBounds.x) / innerBounds.w) *
            stepped[0].length *
            2;
        let y =
            ((item.lat - innerBounds.y) / innerBounds.h) * stepped.length * 2;
        return { x, y };
    });
    points = simplify(points, stepped[0].length / 400, true);
    return pathSmoothD(points.map((p) => [p.x, p.y]));
};

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
                    if (adjacent > cell) {
                        if (!segments[cell]) {
                            segments[cell] = [];
                        }
                        segments[cell].push(segmentFor(x, y, dx, dy));
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

const createImage = (
    rawData,
    sub,
    first,
    minStep,
    layers = 9,
    width = 1000,
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
    return showPaths(
        width,
        stepped,
        paths,
        getSubColor(sub, first, minStep),
        rawData,
    );
};
