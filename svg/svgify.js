// const simplify = require('simplify-js');
// const fs = require('fs');
// const [_, __, fname, layersRaw, outfile = 'out.csv'] = process.argv;

// fs.writeFileSync(
//     outfile,
//     stepped.map((line) => line.map((x) => x + '').join(',')).join('\n'),
//     'utf8',
// );

const borders = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
];

const isValid = (stepped, x, y) =>
    x > 0 && y > 0 && x < stepped[0].length && y < stepped.length;

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

const toKey = ([[x1, y1], [x2, y2]]) => `${x1}:${y1}:${x2}:${y2}`;
const pointKey = ([x, y]) => `${x}:${y}`;

const organizeLevel = (segments) => {
    // console.log('level', segments.length, segments[0].length);
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
const midPoints = ([a, b], [c, d]) => [
    [
        a + ((c - a) / 3) * Math.random() * 0.9,
        b + ((d - b) / 3) * Math.random() * 0.9,
    ],
    [
        a + ((c - a) / 3) * (1.1 + Math.random() * 0.9),
        b + ((d - b) * (1.1 + Math.random() * 0.9)) / 3,
    ],
];

const simplifyPath = (points) =>
    simplify(
        points.map(([x, y]) => ({ x, y })),
        2,
        true,
    ).map((p) => [p.x, p.y]);

const smoothPath = (points) => {
    const newPoints = [points[0]];
    points.forEach((p, i) => {
        if (i === 0) return;
        const prev = points[i - 1];
        if (Math.random() < 0.5) {
            newPoints.push(...midPoints(prev, p));
        } else {
            newPoints.push(midPoint(prev, p));
        }
    });
    newPoints.push(points[points.length - 1]);
    return newPoints;
};

const colors = 'red,green,blue,orange,purple,black,pink,magenta'.split(',');
const getColor = (i) => colors[i % colors.length];

const s = ([x, y]) => `${x} ${y}`;

const spaths = (rest) => {
    let i = 0;
    const parts = [];
    for (; i < rest.length - 2; i += 2) {
        parts.push(`S ${s(rest[i])}, ${s(rest[i + 1])}`);
    }
    if (i < rest.length - 1) {
        parts.push(`L ${s(rest[rest.length - 1])}`);
    }
    return parts.join(' ');
};

// const pathSmoothD = ([p0, ...rest]) =>
//     `M${s(p0)} ` + rest.map((p) => 'T ' + s(p)).join(' ');
// const pathSmoothD = ([p0, p1, p2, ...rest]) =>
//     `M${s(p0)} C ${s(p0)}, ${s(p1)}, ${s(p2)} ${spaths(rest)}`;

// const pathSmoothD = (points) => {
//     const parts = [`M${s(points[0])}`];
//     for (let i = 2; i < points.length; i++) {
//         const p0 = points[i - 2];
//         const prev = points[i - 1];
//         const m0 = midPoint(p0, prev);
//         const mid = midPoint(prev, points[i]);
//         parts.push(`Q ${s(prev)} ${s(mid)}`);
//     }
//     parts.push(`L ${s(points[points.length - 1])}`);
//     return parts.join(' ');
// };

const pathSmoothD = (points) => {
    const parts = [`M${s(points[0])}`];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const mid = midPoint(prev, points[i]);
        parts.push(`Q ${s(prev)} ${s(mid)}`);
    }
    parts.push(`L ${s(points[points.length - 1])}`);
    return parts.join(' ');
};

const pathD = ([p0, ...rest]) =>
    `M${s(p0)} ${rest.map((p) => `L${s(p)}`).join(' ')}`;

const showPaths = (paths) => {
    return `
<svg
xmlns="http://www.w3.org/2000/svg"
width="${1000}"
height="${(1000 / stepped[0].length) * stepped.length}"
viewBox="0 0 ${stepped[0].length * 2} ${stepped.length * 2}"
>
${Object.keys(paths)
    .map((k, i) =>
        paths[k]
            .filter((points) => points.length >= 3)
            .map(
                (points) =>
                    // `<path d="${pathD(points)}"
                    //     fill="none"
                    //     style="stroke-width: 1; opacity: 0.5"
                    //     stroke-dasharray="2 1"
                    //     stroke="${getColor(i)}"
                    // />` +
                    `
                    <path d="${pathSmoothD(points)}"
                        fill="none"
                        style="stroke-width: 1"
                        stroke="${getColor(i)}"
                    />
    ${
        pointKey(points[0]) !== pointKey(points[points.length - 1])
            ? `<circle cx="${points[0][0]}" cy="${points[0][1]}"
                    r="0.5" stroke="black" fill="none" style="stroke-width:0.1"/>
                <circle cx="${points[points.length - 1][0]}" cy="${
                  points[points.length - 1][1]
              }" r="0.5" stroke="black" fill="none" style="stroke-width:0.1"/>
                    `
            : `
                <circle cx="${points[points.length - 1][0]}" cy="${
                  points[points.length - 1][1]
              }" r="0.3" stroke="none" fill="green" style="stroke-width:0.1"/>
            `
    }
    `,
            )

            .join('\n'),
    )
    .join('\n')}
</svg>
`;
};

const showBasic = (segments) => {
    return `
<svg
xmlns="http://www.w3.org/2000/svg"
width="${1000}"
height="${(1000 / stepped[0].length) * stepped.length}"
viewBox="0 0 ${stepped[0].length} ${stepped.length}"
>
${Object.keys(segments)
    .map((k, i) =>
        segments[k]
            .map(
                ([[x1, y1], [x2, y2]]) =>
                    `<line x1="${x1}"
    y1="${y1}"
    x2="${x2}"
    y2="${y2}"
    style="stroke-width: 0.5"
    stroke="${getColor(i)}"
    />
    `,
            )

            .join('\n'),
    )
    .join('\n')}
</svg>
`;
};

const container = document.createElement('div');
document.body.appendChild(container);

const layers = 9;
const csv = window.data
    .split('\n')
    .map((line) => line.split(',').map((item) => parseFloat(item)));

// const csv = fs
//     .readFileSync(fname, 'utf8')
//     .split('\n')
//     .map((line) => line.split(',').map((item) => parseFloat(item)));
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

const segments = {};
stepped.forEach((line, y) => {
    line.forEach((cell, x) => {
        borders.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(stepped, nx, ny)) {
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

const process = (paths) => {
    paths = organizeLevel(paths);
    paths = organizeLevel(paths.map((points) => points.reverse()));
    paths = paths.filter(
        (points) =>
            points.length > 10 ||
            pointKey(points[0]) !== pointKey(points[points.length - 1]),
    );
    // .map(smoothPath)
    // paths = paths.map(smoothPath);
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

const paths = {};
Object.keys(segments).forEach(
    (level) => (paths[level] = process(segments[level])),
);

let total = 0;
Object.keys(paths).forEach((k) => (total += paths[k].length));
console.log(`All paths: ${total}`);

container.innerHTML = showPaths(paths);
// fs.writeFileSync('./out.svg', showBasic(segments));
// fs.writeFileSync('./out.svg', showPaths(paths));
