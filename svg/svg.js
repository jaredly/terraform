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

const showPaths = (width, stepped, paths, getColor, rawData) => {
    const scale = width / stepped[0].length;
    const showEndPoints = true;
    return `
<svg
xmlns="http://www.w3.org/2000/svg"
width="${width}"
height="${scale * stepped.length}"
viewBox="0 0 ${stepped[0].length * 2} ${stepped.length * 2}"
>
${Object.keys(paths)
    .map((k, i) =>
        paths[k]
            .filter((points) => points.length >= 3)
            .map(
                (points) =>
                    `<path d="${pathSmoothD(points)}"
                        fill="none"
                        style="stroke-width: ${(2 / scale).toFixed(2)}"
                        stroke="${getColor(i)}"
                    />
                ${
                    showEndPoints
                        ? pointKey(points[0]) !==
                          pointKey(points[points.length - 1])
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
                        : ''
                }
    `,
            )

            .join('\n'),
    )
    .join('\n')}
    <path d="M 0 0 ${showTrail(trail, rawData, stepped)}"
    fill="none"
    style="stroke-width: ${(4 / scale).toFixed(2)}"
    stroke="red"
    />
</svg>
`;
};
