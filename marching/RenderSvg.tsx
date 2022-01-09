import * as React from 'react';
import { Dataset, Settings, Trail } from './App';
import { Lines, prepareLines } from './prepareLines';

export const RenderSvgContents = ({
    rendered,
    settings,
    blank,
}: {
    rendered: Lines;
    settings: Settings;
    blank: number;
}) => {
    return (
        <>
            {rendered.borders.map((border, i) =>
                i === 0 || blank === 0 || true ? (
                    <polyline
                        key={i}
                        points={border
                            .concat([border[0]])
                            .map(([x, y]) => `${x},${y}`)
                            .join(' ')}
                        stroke={'red'}
                        fill="none"
                        strokeWidth={0.5}
                    />
                ) : null,
            )}
            {rendered.innerCut.map(([p1, p2], i) => (
                <>
                    <circle
                        key={i + 'c'}
                        fill="green"
                        strokeWidth={0}
                        r={2}
                        cx={p1[0] + rendered.wmargin}
                        cy={p1[1] + rendered.vmargin}
                    />
                    <line
                        key={i}
                        stroke="green"
                        strokeWidth={1}
                        x1={p1[0] + rendered.wmargin}
                        y1={p1[1] + rendered.vmargin}
                        x2={p2[0] + rendered.wmargin}
                        y2={p2[1] + rendered.vmargin}
                    />
                </>
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
                    stroke={'blue'}
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
                          stroke={'blue'}
                          fill="none"
                          strokeWidth={0.5}
                      />
                  ))
                : null}
            {settings.title.trim() ? (
                <text
                    x={rendered.w / 2}
                    y={rendered.h - rendered.vmargin / 3}
                    textAnchor={'middle'}
                    fontSize={rendered.vmargin * 0.5}
                    fontFamily="sans-serif"
                >
                    {settings.title}
                </text>
            ) : null}
        </>
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
        const lines = [];
        for (let i = 0; i < settings.blanks; i++) {
            lines.push(prepareLines(dataset, settings, i, trail));
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

    // const fullRows = (settings.rows + 1) / 2
    // const fullColums = (settings.blanks / fullRows)
    const columns = Math.round(settings.blanks / settings.rows);

    // 1 -> blanks / 1
    // 2 -> blanks + 1) / 2
    // 3 -> (blanks + 2) / 3?

    const between = 1;

    const widthToHeight = Math.sqrt(3) / 2;

    const one = allLines[0];

    // const mmToPx = allLines[0].w / (settings.width + settings.margin * widthToHeight * 2);
    const mmToPx = allLines[0].pixelsPerMM;

    // const widthToHeight = allLines[0].w / allLines[0].h;

    const oneHeightMM = one.h / mmToPx;
    const oneWidthMM = one.w / mmToPx;
    // const oneHeightMM =
    //     settings.width / widthToHeight
    // const oneWidthMM = settings.width

    // const totalHeightMM =
    //     (oneHeightMM + between) * Math.ceil((settings.rows * 2) / 3);
    // const totalWidthMM = (oneWidthMM + between) * Math.ceil((columns * 3) / 4);
    // const totalHeightMM = oneHeightMM * settings.rows;
    // const totalWidthMM = oneWidthMM * columns * 2;

    const inners = [];

    let maxx = 0;
    let maxy = 0;

    for (let i = 0; i < settings.blanks; i++) {
        let xa, ya;
        if (settings.rows >= settings.blanks) {
            xa = 0;
            ya = i * (oneHeightMM + between);
        } else if (settings.rows === 1) {
            xa = i * (oneWidthMM + between);
            ya = 0;
        } else {
            const x = i % columns;
            const y = Math.floor(i / columns);
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
            <g transform={`translate(${xa * mmToPx} ${ya * mmToPx})`}>
                <RenderSvgContents
                    rendered={allLines[i]}
                    settings={settings}
                    blank={i}
                    key={i}
                />
            </g>,
        );
    }

    const totalWidthMM = maxx;
    const totalHeightMM = maxy;

    return (
        <svg
            width={totalWidthMM + 'mm'}
            height={totalHeightMM + 'mm'}
            viewBox={`0 0 ${totalWidthMM * mmToPx} ${totalHeightMM * mmToPx}`}
            xmlns="http://www.w3.org/2000/svg"
            ref={(node) => (ref.current = node)}
            onClick={(evt) => {
                const blob = new Blob([ref.current!.outerHTML], {
                    type: 'image/svg+xml',
                });
                const url = URL.createObjectURL(blob);
                const node = document.createElement('a');
                node.download = `full.svg`;
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
            {inners}
            {/* <RenderSvgContents
                rendered={rendered}
                settings={settings}
                blank={blank}
            /> */}
        </svg>
    );
};

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
    rendered: Lines;
}) => {
    // const rendered = React.useMemo(
    //     () => prepareLines(dataset, settings, blank, trail),
    //     [dataset, settings, trail, blank],
    // );
    const ref = React.useRef(null as null | SVGElement);

    return (
        <svg
            width={settings.width + 'mm'}
            height={(settings.width / rendered.w) * rendered.h + 'mm'}
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
                blank={blank}
            />
        </svg>
    );
};
