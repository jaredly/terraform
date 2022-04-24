import * as React from 'react';
import { Dataset, Settings, Trail } from '../App';
import { colsFirst, rowsFirst } from './placements';
import { LinesForBlank, assembleLinesForBlank } from './assembleLinesForBlank';
import { calculateTopographicalLines } from './calculateTopographicalLines';
// import * as shapefile from 'shapefile';
// import JSZip from 'jszip';
// const get = (url: string) => fetch(url).then((res) => res.arrayBuffer());

// export async function getPlaces() {
//     const shp = await
// }

// export async function getShape(name: string) {
//     const shp = await get(
//         `https://cdn.rawgit.com/jaredly/naturalearth-mirror/master/${name}.shp`,
//     );
//     const dbf = await get(
//         `https://cdn.rawgit.com/jaredly/naturalearth-mirror/master/${name}.dbf`,
//     );
//     const geojson = shapefile.read(shp, dbf, { encoding: 'utf-8' });
//     return geojson;
// }

// type Names = any;

export const RenderSvgContents = ({
    rendered,
    settings,
}: {
    rendered: LinesForBlank;
    settings: Settings;
}) => {
    const fontSize = rendered.vmargin * 0.7;
    return (
        <>
            {rendered.borders.map((border, i) =>
                i === 1 ? (
                    <polyline
                        key={i}
                        points={border
                            .concat([border[0]])
                            .map(([x, y]) => `${x},${y}`)
                            .join(' ')}
                        stroke={i === 1 ? 'red' : 'blue'}
                        fill="none"
                        strokeWidth={0.5}
                    />
                ) : null,
            )}
            {rendered.innerCut.map((points, i) => (
                <polyline
                    key={i}
                    stroke="red"
                    fill="none"
                    strokeWidth={0.5}
                    points={points
                        .map(
                            ([x, y]) =>
                                `${x + rendered.wmargin},${
                                    y + rendered.vmargin
                                }`,
                        )
                        .join(' ')}
                />
            ))}
            {settings.showReference
                ? rendered.reference.map((line, i) => (
                      <polyline
                          key={i}
                          points={line.map(([x, y]) => `${x},${y}`).join(' ')}
                          stroke={'#aaa'}
                          fill="none"
                          strokeWidth={0.5}
                      />
                  ))
                : null}
            {rendered.cuts.map((cut, i) => (
                <polyline
                    key={i}
                    points={cut.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke="red"
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.alts.map((cut, i) => (
                <polyline
                    key={i}
                    points={cut.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke={'#aaf'}
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.skips.map((skip, i) => (
                <polyline
                    key={i}
                    points={skip.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke={'blue'}
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.trail
                ? rendered.trail.map((trail, i) => (
                      <polyline
                          key={i}
                          points={trail
                              .map(({ x, y }) => `${x},${y}`)
                              .join(' ')}
                          stroke={'green'}
                          fill="none"
                          strokeWidth={0.5}
                      />
                  ))
                : null}
            <Scale
                pixelsPerMM={rendered.pixelsPerMM}
                scale={settings.scale}
                x={rendered.w / 2}
                sideLength={(rendered.w - rendered.wmargin * 2) / 2}
                y={rendered.vmargin * 0.8}
                fontSize={fontSize * 0.7}
            />
            {settings.title.trim() ? (
                <text
                    x={rendered.w / 2}
                    y={rendered.h - fontSize / 2}
                    textAnchor={'middle'}
                    fontSize={fontSize}
                    fontFamily="sans-serif"
                >
                    {settings.title}
                </text>
            ) : null}
        </>
    );
};

export const Scale = ({
    pixelsPerMM,
    x,
    y,
    fontSize,
    scale,
    sideLength,
}: {
    pixelsPerMM: number;
    sideLength: number;
    x: number;
    y: number;
    fontSize: number;
    scale: number;
}) => {
    // How far is 1km?
    // one ~pixel (scale) is 1 arc-second, so 30 meters.
    // 1km would be 1000/30 = 33px
    const kmPixels = (scale * 1000) / 30;
    const kilometer = 1000000 / (kmPixels / pixelsPerMM);
    let kms = Math.max(1, Math.floor(sideLength / 2 / kmPixels));
    const km = kms;
    const w = kmPixels * km;
    return (
        <g>
            <text
                x={x - w / 2 - pixelsPerMM}
                y={y}
                fontSize={fontSize}
                textAnchor="end"
            >
                {km}km
            </text>
            <polyline
                points={`
                ${x - w / 2},${y - fontSize / 2}
                ${x - w / 2},${y}
                ${x + w / 2},${y}
                ${x + w / 2},${y - fontSize / 2}
            `}
                fill="none"
                strokeWidth={1}
                stroke="blue"
            />
            <text x={x + w / 2 + pixelsPerMM} y={y} fontSize={fontSize}>
                1:{kilometer.toFixed(0)}
            </text>
        </g>
    );
};

export const RenderSvgs = ({
    dataset,
    settings,
    trail,
}: {
    dataset: Dataset;
    settings: Settings;
    trail?: Trail;
}) => {
    const allLines = React.useMemo(() => {
        const allData = calculateTopographicalLines(dataset, trail, settings);
        const lines = [];
        for (let i = 0; i < settings.blanks; i++) {
            lines.push(assembleLinesForBlank(allData, settings, i));
        }
        return lines;
    }, [dataset, settings, trail]);

    const ref = React.useRef(null as null | SVGElement);

    if (settings.rows === 0) {
        const svgs = [];
        for (let i = 0; i < settings.blanks; i++) {
            svgs.push(
                <RenderSvg
                    dataset={dataset}
                    trail={trail}
                    settings={settings}
                    rendered={allLines[i]}
                    blank={i}
                    key={i}
                />,
            );
        }

        return <>{svgs}</>;
    }

    const between = 1;
    const one = allLines[0];
    const mmToPx = allLines[0].pixelsPerMM;
    const oneHeightMM = one.h / mmToPx;
    const oneWidthMM = one.w / mmToPx;

    const inners = [];

    let maxx = 0;
    let maxy = 0;

    const positions = (settings.rowsFirst ? rowsFirst : colsFirst)(
        settings.blanks,
        settings.rows,
    );

    for (let i = 0; i < settings.blanks; i++) {
        let { x, y } = positions[i];
        let xa, ya;
        if (
            (settings.rowsFirst && settings.rows > settings.blanks) ||
            (!settings.rowsFirst && settings.rows === 1)
        ) {
            xa = i * (oneWidthMM + between);
            ya = 0;
        } else if (!settings.rowsFirst && settings.rows > settings.blanks * 2) {
            xa = 0;
            ya = i * (oneHeightMM + between);
        } else {
            xa =
                ((oneWidthMM + between) *
                    (x + (y % 2 === 1 ? 0.5 : 0)) *
                    2 *
                    3) /
                4;
            ya = ((oneHeightMM + between * 2) * y) / 2;
        }
        maxx = Math.max(maxx, xa + oneWidthMM);
        maxy = Math.max(maxy, ya + oneHeightMM);
        inners.push(
            <g transform={`translate(${xa * mmToPx} ${ya * mmToPx})`} key={i}>
                <RenderSvgContents
                    rendered={allLines[i]}
                    settings={settings}
                    // blank={i}
                />
            </g>,
        );
    }

    const totalWidthMM = maxx;
    const totalHeightMM = maxy;

    const rwidth = settings.rotate ? totalHeightMM : totalWidthMM;
    const rheight = settings.rotate ? totalWidthMM : totalHeightMM;

    return (
        <svg
            width={rwidth + 'mm'}
            height={rheight + 'mm'}
            viewBox={`0 0 ${rwidth * mmToPx} ${rheight * mmToPx}`}
            xmlns="http://www.w3.org/2000/svg"
            ref={(node) => (ref.current = node)}
            onClick={(evt) => {
                const blob = new Blob([ref.current!.outerHTML], {
                    type: 'image/svg+xml',
                });
                const url = URL.createObjectURL(blob);
                const node = document.createElement('a');
                node.download = `${settings.title || 'full'}_${
                    settings.width
                }mm wide_${settings.thickness}mm thick.svg`;
                node.href = url;
                document.body.append(node);
                node.click();
            }}
            style={{
                margin: 4,
                cursor: 'pointer',
                backgroundColor: 'white',
            }}
        >
            <g
                transform={
                    settings.rotate
                        ? `translate(0 ${totalWidthMM * mmToPx}) rotate(${-90})`
                        : ''
                }
            >
                {inners}
            </g>
        </svg>
    );
};

let namesCache: null | any = null;

export const RenderSvg = ({
    dataset,
    settings,
    trail,
    blank,
    rendered,
}: {
    dataset: Dataset;
    settings: Settings;
    trail?: Trail;
    blank: number;
    rendered: LinesForBlank;
}) => {
    // const rendered = React.useMemo(
    //     () => prepareLines(dataset, settings, blank, trail),
    //     [dataset, settings, trail, blank],
    // );
    const ref = React.useRef(null as null | SVGElement);

    const mmToPx = rendered.pixelsPerMM;
    const oneHeightMM = rendered.h / mmToPx;
    const oneWidthMM = rendered.w / mmToPx;

    return (
        <svg
            width={oneWidthMM + 'mm'}
            height={oneHeightMM + 'mm'}
            viewBox={`0 0 ${rendered.w} ${rendered.h}`}
            xmlns="http://www.w3.org/2000/svg"
            ref={(node) => (ref.current = node)}
            onClick={(evt) => {
                const blob = new Blob([ref.current!.outerHTML], {
                    type: 'image/svg+xml',
                });
                const url = URL.createObjectURL(blob);
                const node = document.createElement('a');
                node.download = `blank-${blank}.svg`;
                node.href = url;
                document.body.append(node);
                node.click();
            }}
            style={{
                margin: 4,
                cursor: 'pointer',
                backgroundColor: 'white',
            }}
        >
            <RenderSvgContents
                rendered={rendered}
                settings={settings}
                // blank={blank}
            />
        </svg>
    );
};
