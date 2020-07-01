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
) => `<path d="${pathSmoothD(points.map(([x, y]) => [x * scale, y * scale]))}"
        fill="none"
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

const showTrail = (trail, rawData, sx, sy) => {
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
    points = simplify(points, 1 / 400, true);
    return pathSmoothD(points.map((p) => [p.x * sx, p.y * sy]));
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

const showPaths = (
    trail,
    stepped,
    paths,
    getColor,
    rawData,
    boundaryPaths,
    fullBoundryPath,
    { width, margin },
) => {
    width = parseInt(width);
    const ow = stepped[0].length * 2;
    const oh = stepped.length * 2;
    const height = (width / ow) * oh;
    const scale = (width - margin * 2) / ow;
    const fullScale = width / ow;
    const vMargin = (oh / ow) * margin;
    console.log(margin);
    const showEndPoints = false;
    return svgNode(
        width,
        height,
        `
<g transform="translate(${margin} ${vMargin})">
${Object.keys(paths)
    .map((k, i) => {
        const color = getColor(i);
        if (!color) return '';

        return paths[k]
            .filter((points) => points.length >= 3)
            .map((points) => showPath(points, color, scale, showEndPoints))
            .join('\n');
    })
    .join('\n')}
    ${
        trail
            ? `<path d="${showTrail(trail, rawData, scale * ow, scale * oh)}"
                fill="none" style="stroke-width: 0.5" stroke="red" />`
            : ''
    }
    ${boundaryPaths
        .map(
            (path) =>
                `<path d="${pathD(
                    path.map(({ x, y }) => [x * scale, y * scale]),
                )}" 
                fill="none" style="stroke-width: 0.1" stroke="red" />`,
        )
        .join('\n')}
    </g>
    <path d="${pathD(
        fullBoundryPath.map(({ x, y }) => [x * fullScale, y * fullScale]),
    )}" fill="none" style="stroke-width: 0.1" stroke="red" />
`,
    );
};
