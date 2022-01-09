import * as React from 'react';
import { BlurInput, BlurNumber } from './BlurInput';
import { isValidHex, levelPoints, renderLevel } from './render';

type Dataset = {
    rows: Array<Array<number>>;
    shape: 'rect' | 'hex';
    x: number;
    y: number;
    w: number;
    h: number;
    ow: number;
    oh: number;
};

const data: {
    [key: string]: Dataset;
} = (window as any).data;

type Trail = {
    data: {
        trackData: Array<Array<{ lat: number; lon: number; ele: number }>>;
    };
};

const trails: {
    [key: string]: Trail;
} = (window as any).trails;

export type Settings = {
    set: string;
    hike?: string;
    width: number;
    thickness: number;
    skip: number;
    scale: number;
    title: string;
    tweak: number;
    margin: number;
    blanks: number;
    rainbow: boolean;
};

const defaultSettings: Settings = {
    set: Object.keys(data)[0],
    width: 200,
    thickness: 3,
    skip: 4,
    scale: 5,
    title: '',
    tweak: 0,
    margin: 5,
    blanks: 2,
    rainbow: false,
};

const initialSettings: Settings = ((): Settings => {
    const loc = window.location.search.slice(1);
    if (!loc) {
        return defaultSettings;
    }

    const parsed = JSON.parse(decodeURIComponent(loc));
    return { ...defaultSettings, ...parsed };
})();

export const App = () => {
    const [settings, setSettings] = React.useState(initialSettings);
    const ref = React.useRef(null as null | HTMLCanvasElement);

    React.useEffect(() => {
        if (settings) {
            history.replaceState(null, '', '?' + JSON.stringify(settings));
        }

        if (ref.current) {
            renderTopoMap(
                ref.current,
                data[settings.set],
                settings,
                settings.hike ? trails[settings.hike] : undefined,
            );
        }
    }, [settings]);

    return (
        <div>
            <div
                style={{
                    padding: 16,
                    paddingBottom: 0,
                }}
            >
                <select
                    value={settings.set}
                    onChange={(evt) => {
                        setSettings((s) => ({
                            ...s,
                            set: evt.target.value,
                        }));
                    }}
                >
                    {Object.keys(data).map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>
                <select
                    value={settings.hike || ''}
                    onChange={(evt) => {
                        setSettings((s) => ({
                            ...s,
                            hike: evt.target.value,
                        }));
                    }}
                >
                    <option value="">No trail</option>
                    {Object.keys(trails).map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>
            </div>
            <div
                style={{
                    color: 'white',
                    padding: 16,
                    paddingTop: 8,
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <div>
                    <div>
                        Scale:
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={settings.scale}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    scale: +evt.target.value,
                                }));
                            }}
                        />{' '}
                        {settings.scale}
                    </div>
                    <div>
                        Skip:
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={settings.skip}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    skip: +evt.target.value,
                                }));
                            }}
                        />{' '}
                        {settings.skip}
                    </div>
                    <div>
                        Blanks:
                        <input
                            type="range"
                            min="2"
                            max="20"
                            value={settings.blanks}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    blanks: +evt.target.value,
                                }));
                            }}
                        />{' '}
                        {settings.blanks}
                    </div>
                    <div>
                        Tweak
                        <input
                            type="range"
                            min="-0.01"
                            max="0.01"
                            step="0.001"
                            value={settings.tweak}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    tweak: +evt.target.value,
                                }));
                            }}
                        />{' '}
                        {settings.tweak}
                    </div>
                    <div>
                        Color Elevation
                        <input
                            type="checkbox"
                            checked={settings.rainbow}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    rainbow: evt.target.checked,
                                }));
                            }}
                        />{' '}
                    </div>
                </div>
                <div>
                    <div>
                        Width (mm):
                        <BlurNumber
                            value={settings.width}
                            onChange={(width) =>
                                setSettings((s) => ({ ...s, width }))
                            }
                        />
                    </div>
                    <div>
                        Thickness (mm):
                        <BlurNumber
                            value={settings.thickness}
                            validate={(v) => v > 0.001}
                            onChange={(thickness) =>
                                setSettings((s) => ({
                                    ...s,
                                    thickness,
                                }))
                            }
                        />
                    </div>
                    <div>
                        Margin (mm):
                        <BlurNumber
                            value={settings.margin}
                            onChange={(margin) =>
                                setSettings((s) => ({
                                    ...s,
                                    margin,
                                }))
                            }
                        />
                    </div>
                    <div>
                        Title{' '}
                        <BlurInput
                            value={settings.title}
                            onChange={(title) =>
                                setSettings((s) => ({ ...s, title }))
                            }
                        />
                    </div>
                </div>
            </div>
            <canvas ref={ref} />
        </div>
    );
};

function prepareLines(
    dataset: Dataset,
    {
        width: widthInMM,
        thickness,
        skip,
        scale,
        tweak,
        margin: hmargin,
        blanks,
    }: Settings,
    trail?: Trail,
) {
    const lines = dataset.rows;

    let max = -Infinity;
    let min = Infinity;
    lines.forEach((line) =>
        line.forEach((v) => {
            max = Math.max(v, max);
            min = Math.min(v, min);
        }),
    );
    min += tweak;

    const heightInMM = max * widthInMM;
    const materialLayers = Math.round(heightInMM / thickness);
    const layers = (materialLayers + 1) * skip - 1;

    const steps = layers;

    const margin = (hmargin * Math.sqrt(3)) / 2;

    const pixelsPerMM = (scale * lines[0].length) / widthInMM;
    const vmargin = margin * pixelsPerMM;
    const wmargin = (vmargin * 2) / Math.sqrt(3);

    const w = scale * lines[0].length + wmargin * 2;
    const h = scale * lines.length + vmargin * 2;

    const borders = borderHexes(lines[0].length, lines.length, scale, vmargin);

    const cuts = [];
    const alts = [];
    const skips = [];

    for (let at = 0; at < steps; at++) {
        const th = ((max - min) / steps) * at;
        const rendered: Array<Array<[number, number]>> = levelPoints(
            th,
            lines,
            scale,
            dataset.shape === 'hex',
        ).map((line) => line.map(([x, y]) => [x + wmargin, y + vmargin]));

        if (at % skip === 0) {
            if ((at / skip) % blanks === 0) {
                cuts.push(...rendered);
            } else {
                alts.push(...rendered);
            }
        } else {
            skips.push(...rendered);
        }
    }

    return {
        w,
        h,
        vmargin,
        trail: trail ? trailPoints(trail, dataset, scale) : null,
        cuts,
        alts,
        skips,
        borders,
        wmargin,
        min,
        max,
    };
}

function renderTopoMap(
    canvas: HTMLCanvasElement,
    dataset: Dataset,
    settings: Settings,
    trail?: Trail,
) {
    const rendered = prepareLines(dataset, settings, trail);
    canvas.width = rendered.w;
    canvas.height = rendered.h;
    canvas.style.width = `${rendered.w / 2}px`;
    canvas.style.height = `${rendered.h / 2}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'green';

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'green';
    rendered.borders.forEach((border) => {
        ctx.beginPath();
        strokePoints(ctx, border, true);
        ctx.stroke();
    });

    if (settings.rainbow) {
        ctx.globalAlpha = 0.1;
        dataset.rows.forEach((line, y) => {
            line.forEach((v, x) => {
                if (dataset.shape !== 'hex' || isValidHex(x, y, dataset.rows)) {
                    ctx.fillStyle = `hsl(${
                        (((v - rendered.min) / (rendered.max - rendered.min)) *
                            360 *
                            10) %
                        360
                    }, 100%, 50%)`;
                    ctx.fillRect(
                        x * settings.scale + rendered.wmargin,
                        y * settings.scale + rendered.vmargin,
                        settings.scale,
                        settings.scale,
                    );
                }
            });
        });
        ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = `#f00`;
    rendered.cuts.forEach((cut) => {
        ctx.beginPath();
        strokePoints(ctx, cut);
        ctx.stroke();
    });

    if (settings.skip === 1) {
        ctx.strokeStyle = `#555`;
    } else {
        ctx.strokeStyle = `#777`;
    }

    rendered.alts.forEach((line) => {
        ctx.beginPath();
        strokePoints(ctx, line);
        ctx.stroke();
    });

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `#555`;
    rendered.skips.forEach((alt) => {
        ctx.beginPath();
        strokePoints(ctx, alt);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    if (rendered.trail) {
        ctx.strokeStyle = '#faa';
        rendered.trail.forEach((points) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    }
    if (settings.title) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = `${rendered.vmargin * 0.6}px sans-serif`;
        ctx.fillText(
            settings.title,
            canvas.width / 2,
            canvas.height - rendered.vmargin / 3,
        );
    }
}

const trailPoints = (trail: Trail, dataset: Dataset, scale: number) => {
    return trail.data.trackData.map((track) => {
        return track.map((p) => {
            const x = p.lon - Math.floor(p.lon);
            const y = 1 - (p.lat - Math.floor(p.lat));
            return {
                x: (x * dataset.ow - dataset.x) * scale,
                y: (y * dataset.oh - dataset.y) * scale,
            };
        });
    });
};

const borderHexes = (w: number, h: number, scale: number, vmargin: number) => {
    const hpx = h * scale + vmargin * 2;
    const wpx = w * scale + (vmargin * 2 * 2) / Math.sqrt(3);
    return [
        hex(wpx / 2, hpx / 2, (((h - 1.0) * scale) / 2 / Math.sqrt(3)) * 2),
        hex(wpx / 2, hpx / 2, (hpx / 2 / Math.sqrt(3)) * 2 - 1),
    ];
};

const drawBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    margin: number,
    isHex: boolean,
) => {
    if (!isHex) {
        ctx.strokeRect(
            1,
            1,
            w * scale + margin * 2 - 2,
            h * scale + margin * 2 - 2,
        );
    } else {
        const [inner, outer] = borderHexes(w, h, scale, margin);
        ctx.beginPath();
        strokePoints(ctx, inner, true);
        ctx.stroke();
        ctx.beginPath();
        strokePoints(ctx, outer, true);
        ctx.stroke();
    }
};

const strokePoints = (
    ctx: CanvasRenderingContext2D,
    points: Array<[number, number]>,
    loop = false,
) => {
    if (loop) {
        ctx.moveTo(points[points.length - 1][0], points[points.length - 1][1]);
        points.forEach(([x, y]) => ctx.lineTo(x, y));
    } else {
        ctx.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    }
};

const hex = (cx: number, cy: number, r: number): Array<[number, number]> => {
    const h = (r / 2) * Math.sqrt(3);
    return [
        [cx - r, cy],
        [cx - r / 2, cy - h],
        [cx + r / 2, cy - h],
        [cx + r, cy],
        [cx + r / 2, cy + h],
        [cx - r / 2, cy + h],
    ];
};
