import * as React from 'react';
import { BlurInput, BlurNumber } from './BlurInput';
import { renderLevel } from './render';

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
};

const defaultSettings = {
    set: Object.keys(data)[0],
    width: 200,
    thickness: 3,
    skip: 4,
    scale: 5,
    title: '',
    tweak: 0,
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
    { width: widthInMM, thickness, skip, scale, tweak }: Settings,
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

    canvas.width = scale * lines[0].length;
    canvas.height = scale * lines.length;
    canvas.style.width = `${(scale * lines[0].length) / 2}px`;
    canvas.style.height = `${(scale * lines.length) / 2}px`;
    const ctx = canvas.getContext('2d')!;

    ctx.lineWidth = 0.5;

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
                // console.log(
                //     x,
                //     p.lon,
                //     y,
                //     p.lat,
                //     x * dataset.ow,
                //     y * dataset.oh,
                //     dataset.x,
                //     dataset.y,
                // );
                return {
                    x: (x * dataset.ow - dataset.x) * scale,
                    y: (y * dataset.oh - dataset.y) * scale,
                };
            });
            console.log(points);
            console.log(points.slice(0, 10));
            console.log(track.slice(0, 10));
            console.log(dataset.x, dataset.y, dataset.ow, dataset.oh);
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    }
}
