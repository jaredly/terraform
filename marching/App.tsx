import * as React from 'react';
import { BlurInput, BlurNumber } from './BlurInput';
import { isValidHex, renderLevel } from './render';

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
                </div>
                <div>
                    <div>
                        Width (in mm):
                        <BlurNumber
                            value={settings.width}
                            onChange={(width) =>
                                setSettings((s) => ({ ...s, width }))
                            }
                        />
                    </div>
                    <div>
                        Thickness (in mm):
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

function renderTopoMap(
    canvas: HTMLCanvasElement,
    dataset: Dataset,
    { width: widthInMM, thickness, skip, scale, tweak, margin }: Settings,
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

    const pixelsPerMM = (scale * lines[0].length) / widthInMM;
    const marginPX = margin * pixelsPerMM;
    const wmargin = (marginPX * 2) / Math.sqrt(3);

    const w = scale * lines[0].length + wmargin * 2;
    const h = scale * lines.length + marginPX * 2;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w / 2}px`;
    canvas.style.height = `${h / 2}px`;
    const ctx = canvas.getContext('2d')!;

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'green';
    drawBorder(
        ctx,
        lines[0].length,
        lines.length,
        scale,
        marginPX,
        dataset.shape === 'hex',
        false,
    );

    ctx.save();
    ctx.translate(wmargin, marginPX);

    if (false) {
        ctx.globalAlpha = 0.1;
        dataset.rows.forEach((line, y) => {
            line.forEach((v, x) => {
                if (dataset.shape !== 'hex' || isValidHex(x, y, lines)) {
                    ctx.fillStyle = `hsl(${
                        (((v - min) / (max - min)) * 360 * 10) % 360
                    }, 100%, 50%)`;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            });
        });
        ctx.globalAlpha = 1;
    }

    const renderAt = (at: number) => {
        const th = ((max - min) / steps) * at;
        if (at % skip === 0) {
            // ctx.strokeStyle = `hsl(${(at / steps) * 360}, 100%, 50%)`;
            ctx.strokeStyle = `#aaa`;
        } else {
            ctx.strokeStyle = `#555`;
        }
        renderLevel(ctx, th, lines, scale, dataset.shape === 'hex');
    };

    for (let at = 0; at < steps; at++) {
        renderAt(at);
    }

    if (trail) {
        ctx.strokeStyle = 'red';
        trail.data.trackData.forEach((track) => {
            const points = track.map((p) => {
                const x = p.lon - Math.floor(p.lon);
                const y = 1 - (p.lat - Math.floor(p.lat));
                return {
                    x: (x * dataset.ow - dataset.x) * scale,
                    y: (y * dataset.oh - dataset.y) * scale,
                };
            });
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    }
    ctx.restore();
}

const drawBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    margin: number,
    isHex: boolean,
    fakeHex: boolean,
) => {
    if (!isHex) {
        ctx.strokeRect(
            1,
            1,
            w * scale + margin * 2 - 2,
            h * scale + margin * 2 - 2,
        );
    } else {
        // console.log(
        //     w,
        //     h,
        //     w / h,
        //     Math.sqrt(3),
        //     2 / Math.sqrt(3),
        //     Math.sqrt(3) / 2,
        //     (w / 2) * Math.sqrt(3),
        //     (h * 2) / Math.sqrt(3),
        // );
        // const hh = (h * scale) / 2 + margin;
        // const ww = w * scale + (margin * 2 * 2) / Math.sqrt(3);
        // const sq3 = Math.sqrt(3);

        // OH NOOOOO I haven't been actually cutting hexes???? Devastating.
        // oh wait I think I have.

        // const points = [
        //     [0, hh],
        //     [ww / 4, 1],
        //     [(ww * 3) / 4, 1],
        //     [ww, hh],
        //     [(ww * 3) / 4, hh * 2 - 1],
        //     [ww / 4, hh * 2 - 1],
        // ];

        // if (fakeHex) {
        //     const points = [
        //         [0, hh],
        //         [ww / 4, 1],
        //         [(ww * 3) / 4, 1],
        //         [ww, hh],
        //         [(ww * 3) / 4, hh * 2 - 1],
        //         [ww / 4, hh * 2 - 1],
        //     ];

        //     ctx.beginPath();
        //     ctx.moveTo(
        //         points[points.length - 1][0],
        //         points[points.length - 1][1],
        //     );
        //     points.forEach(([x, y]) => ctx.lineTo(x, y));
        //     ctx.stroke();
        // } else {
        const hpx = h * scale + margin * 2;
        const wpx = w * scale + (margin * 2 * 2) / Math.sqrt(3);
        ctx.beginPath();
        hex(
            ctx,
            wpx / 2,
            hpx / 2,
            (((h - 1.0) * scale) / 2 / Math.sqrt(3)) * 2,
        );
        ctx.stroke();
        ctx.beginPath();
        hex(ctx, wpx / 2, hpx / 2, (hpx / 2 / Math.sqrt(3)) * 2 - 1);
        ctx.stroke();
        // }
    }
};

const hex = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
) => {
    const h = (r / 2) * Math.sqrt(3);
    const points = [
        [cx - r, cy],
        [cx - r / 2, cy - h],
        [cx + r / 2, cy - h],
        [cx + r, cy],
        [cx + r / 2, cy + h],
        [cx - r / 2, cy + h],
    ];
    ctx.moveTo(points[points.length - 1][0], points[points.length - 1][1]);
    points.forEach(([x, y]) => ctx.lineTo(x, y));
};
