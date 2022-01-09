import * as React from 'react';
import { Dataset, Settings, Trail } from './App';
import { Lines, prepareLines } from './prepareLines';

export const RenderSvgContents = ({
    rendered,
    settings,
}: {
    rendered: Lines;
    settings: Settings;
}) => {
    return (
        <>
            {rendered.borders.map((border, i) => (
                <polyline
                    key={i}
                    points={border
                        .concat([border[0]])
                        .map(([x, y]) => `${x},${y}`)
                        .join(' ')}
                    stroke="green"
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.cuts.map((cut, i) => (
                <polyline
                    key={i}
                    points={cut.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke="#f00"
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.alts.map((cut, i) => (
                <polyline
                    key={i}
                    points={cut.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke={settings.skip === 1 ? '#555' : '#777'}
                    fill="none"
                    strokeWidth={0.5}
                />
            ))}
            {rendered.skips.map((skip, i) => (
                <polyline
                    key={i}
                    points={skip.map(([x, y]) => `${x},${y}`).join(' ')}
                    stroke={'#555'}
                    strokeDasharray={'5 5'}
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
                          stroke={'#faa'}
                          fill="none"
                          strokeWidth={0.5}
                      />
                  ))
                : null}
        </>
    );
};

export const RenderSvg = ({
    dataset,
    settings,
    trail,
    blank,
}: {
    dataset: Dataset;
    settings: Settings;
    trail?: Trail;
    blank: number;
}) => {
    const rendered = React.useMemo(
        () => prepareLines(dataset, settings, blank, trail),
        [dataset, settings, trail, blank],
    );
    const ref = React.useRef(null as null | SVGElement);

    return (
        <svg
            // width={rendered.w / 2}
            // height={rendered.h / 2}
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
            }}
        >
            <RenderSvgContents rendered={rendered} settings={settings} />
        </svg>
    );
};
