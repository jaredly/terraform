const fs = require('fs');
const [_, __, fname, layersRaw, outfile = 'out.csv'] = process.argv;
const layers = layersRaw ? parseInt(layersRaw) : 5;

const csv = fs
    .readFileSync(fname, 'utf8')
    .split('\n')
    .map((line) => line.split(',').map((item) => parseFloat(item)));
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

fs.writeFileSync(
    outfile,
    stepped.map((line) => line.map((x) => x + '').join(',')).join('\n'),
    'utf8',
);

const borders = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
];

const isValid = (x, y) =>
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

const segments = {};
stepped.forEach((line, y) => {
    line.forEach((cell, x) => {
        borders.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny)) {
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

const canon = ([[x1, y1], [x2, y2]]) =>
    x1 < x2 || (x1 === x2 && y1 < y2)
        ? [
              [x1, y1],
              [x2, y2],
          ]
        : [
              [x2, y2],
              [x1, y1],
          ];
const toKey = ([[x1, y1], [x2, y2]]) => `${x1}:${y1}:${x2}:${y2}`;
const pointKey = ([x, y]) => `${x}:${y}`;

const organizeLevel = (segments) => {
    console.log('level', segments.length, segments[0].length);
    const paths = {};
    const byEndPoint = {};
    const add = (i, p) => {
        const k = pointKey(p);
        if (!byEndPoint[k]) {
            byEndPoint[k] = [];
        }
        if (!byEndPoint[k].includes(i)) {
            byEndPoint[k].push(i);
        }
    };
    segments.forEach((points, i) => {
        add(i, points[0]);
        add(i, points[points.length - 1]);
        paths[i] = points;
    });
    const waiting = Object.keys(segments).slice();
    // To simplify, we only add to the end
    while (waiting.length) {
        const current = +waiting.shift();
        // console.log('Looking at', current);
        const points = paths[current];
        const p2 = points[points.length - 1];
        const p = byEndPoint[pointKey(p2)];
        if (!p.includes(current)) {
            console.log(current, p);
            throw new Error('Current not in p');
        }
        if (p.length === 2) {
            const other = p.filter((i) => i != current)[0];
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
                (i) => i !== current,
            );

            // remove other
            // console.log('Remvoe', other);
            byEndPoint[pointKey(o1)] = byEndPoint[pointKey(o1)].filter(
                (i) => i !== other,
            );
            byEndPoint[pointKey(o2)] = byEndPoint[pointKey(o2)].filter(
                (i) => i !== other,
            );
            delete paths[other];
            const idx = waiting.indexOf(other + '');
            if (idx !== -1) {
                waiting.splice(idx, 1);
            }

            // join up
            if (pointKey(o1) === pointKey(p2)) {
                points.push(...otherPoints.slice(1));
                if (!byEndPoint[pointKey(o2)].includes(current)) {
                    byEndPoint[pointKey(o2)].push(current);
                }
            } else if (pointKey(o2) === pointKey(p2)) {
                points.push(...otherPoints.slice(0, -1).reverse());
                if (!byEndPoint[pointKey(o1)].includes(current)) {
                    byEndPoint[pointKey(o1)].push(current);
                }
            } else {
                throw new Error('other end point not matching p2');
            }
            waiting.unshift(current);
        } else {
            // can't join it, sorry
        }
    }
    return Object.keys(paths).map((k) => paths[k]);
};

const paths = {};
Object.keys(segments).forEach(
    (level) =>
        (paths[level] = organizeLevel(
            organizeLevel(segments[level]).map((points) => points.reverse()),
        )),
);

let total = 0;
Object.keys(paths).forEach((k) => (total += paths[k].length));
console.log(`All paths: ${total}`);

const colors = 'red,green,blue,orange,purple,black,pink,magenta'.split(',');
const getColor = (i) => colors[i % colors.length];

const pathD = ([p0, ...rest]) =>
    `M${p0[0]} ${p0[1]} ${rest.map((p) => `L${p[0]} ${p[1]}`).join(' ')}`;

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
            .map(
                (points) =>
                    `<path d="${pathD(points)}"
                        fill="none"
                        style="stroke-width: 0.1"
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

// fs.writeFileSync('./out.svg', showBasic(segments));
fs.writeFileSync('./out.svg', showPaths(paths));
