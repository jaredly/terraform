import * as React from 'react';
import { renderLevel } from './render';
import { RenderSvg, RenderSvgs } from './RenderSvg';
import { renderToCanvas } from './renderToCanvas';
import { SettingsForm } from './SettingsForm';

export type Dataset = {
    rows: Array<Array<number>>;
    shape: 'rect' | 'hex';
    x: number;
    y: number;
    w: number;
    h: number;
    ow: number;
    oh: number;
};

export const data: {
    [key: string]: Dataset;
} = (window as any).data;

export type Trail = {
    data: {
        trackData: Array<Array<{ lat: number; lon: number; ele: number }>>;
    };
};

export const trails: {
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
    showReference: boolean;
    rows: number;
    columns: number;
    rowsFirst: boolean;
    svg: boolean;
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
    rows: 0,
    rowsFirst: true,
    columns: 0,
    showReference: false,
    rainbow: false,
    svg: false,
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

        if (ref.current && !settings.svg) {
            renderToCanvas(
                ref.current,
                data[settings.set],
                settings,
                settings.hike ? trails[settings.hike] : undefined,
            );
        }
    }, [settings]);

    // const svgs = [];
    // if (settings.svg) {
    //     for (let i = 0; i < settings.blanks; i++) {
    //         svgs.push(
    //             <RenderSvg
    //                 dataset={data[settings.set]}
    //                 trail={settings.hike ? trails[settings.hike] : undefined}
    //                 settings={settings}
    //                 blank={i}
    //                 key={i}
    //             />,
    //         );
    //     }
    // }

    return (
        <div>
            <SettingsForm setSettings={setSettings} settings={settings} />
            {settings.svg ? (
                <RenderSvgs
                    dataset={data[settings.set]}
                    trail={settings.hike ? trails[settings.hike] : undefined}
                    settings={settings}
                />
            ) : (
                <canvas ref={ref} />
            )}
        </div>
    );
};
