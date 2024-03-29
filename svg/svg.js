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

const showPath = (
    points,
    color,
    scale,
    showEndPoints,
    i,
) => `<path d="${pathSmoothD(points.map(([x, y]) => [x * scale, y * scale]))}"
        fill="none"
        ${color === 'red' ? `laser_group="${i}"` : ''}
        style="stroke-width: 0.1"
        stroke="${color}"
    />
${
    showEndPoints
        ? pointKey(points[0]) !== pointKey(points[points.length - 1])
            ? `<circle cx="${points[0][0] * scale}" cy="${points[0][1] * scale}"
                r="0.5" stroke="black" fill="none" style="stroke-width:0.1"/>
            <circle cx="${points[points.length - 1][0] * scale}" cy="${
                  points[points.length - 1][1] * scale
              }" r="0.5" stroke="black" fill="none" style="stroke-width:0.1"/>
                `
            : `
            <circle cx="${points[points.length - 1][0] * scale}" cy="${
                  points[points.length - 1][1] * scale
              }" r="0.3" stroke="none" fill="green" style="stroke-width:0.1"/>
        `
        : ''
}
`;

const showTrail = (trail, sx, sy) => {
    return pathSmoothD(trail.map((p) => [p.x * sx, p.y * sy]));
};

const svgNode = (width, height, contents) => `
<svg
xmlns="http://www.w3.org/2000/svg"
width="${width}mm"
height="${height.toFixed(2)}mm"
viewBox="0 0 ${width} ${height}"
>
${contents}
</svg>
`;

const showTile = (
    title,
    paths,
    trail,
    boundaryPaths,
    fullBoundryPath,
    starPoints,
    { ow, oh, width, margin },
    getColor,
) => {
    const vMargin = (oh / ow) * margin;
    const showEndPoints = false;
    const fullScale = width / ow;
    const scale = (width - margin * 2) / ow;
    return `
<g transform="translate(${margin} ${vMargin})">
${Object.keys(paths)
    .map((k, i) => {
        const color = getColor(i);
        if (!color) return '';

        return paths[k]
            .filter((points) => points.length >= 3)
            .map((points) => showPath(points, color, scale, showEndPoints, i))
            .join('\n');
    })
    // inner ones first, they should be cut first
    .reverse()
    .join('\n')}
    ${
        trail
            ? `<path d="${showTrail(trail, scale * ow, scale * oh)}"
                fill="none" style="stroke-width: 0.5" stroke="orange" />`
            : ''
    }
    ${boundaryPaths
        .map(
            (path) =>
                `<path d="${pathD(
                    path.map(({ x, y }) => [x * scale, y * scale]),
                )}" 
                fill="none" style="stroke-width: 0.1" stroke="green" />`,
        )
        .join('\n')}
    ${
        starPoints
            ? starPoints.map(
                  ({ x, y }) =>
                      //   `<circle cx="${center.x * scale * ow}" cy="${
                      //       center.y * scale * oh
                      //   }" r="2" />`,
                      `<path d="${pathD(
                          starPath(
                              { x: x * scale * ow, y: y * scale * oh },
                              2,
                              0.6,
                          ).map(({ x, y }) => [x, y]),
                      )} z"
                  fill="black" style="stroke-width: 0.5; 
                  stroke-linecap: round;
                  stroke-linejoin: round;" stroke="black" />`,
              )
            : ''
    }
    </g>
    <path d="${pathD(
        fullBoundryPath.map(({ x, y }) => [x * fullScale, y * fullScale]),
    )}" fill="none" style="stroke-width: 0.1" stroke="green" />
    <text x="${width / 2}" y="${
        (width / ow) * oh - vMargin / 4
    }" text-anchor="middle" font-size="${2}" font-family="Helvetica">${title}</text>
`;
};

const off = ({ x, y }, angle, amount) => {
    return {
        x: x + Math.cos(angle) * amount,
        y: y + Math.sin(angle) * amount,
    };
};

const starPath = (center, size, size2) => {
    const points = [];
    const by = (Math.PI * 2) / 5;
    const ini = -Math.PI / 2;
    for (let i = 0; i < 5; i++) {
        points.push(off(center, ini + i * by, size));
        points.push(off(center, ini + (i + 0.5) * by, size2));
    }
    return points;
};
