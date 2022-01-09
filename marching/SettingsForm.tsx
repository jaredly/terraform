import * as React from 'react';
import { BlurInput, BlurNumber } from './BlurInput';
import { Settings, data, trails } from './App';

export const SettingsForm = ({
    settings,
    setSettings,
}: {
    settings: Settings;
    setSettings: (fn: (s: Settings) => Settings) => void;
}) => {
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
                        SVG Mode
                        <input
                            type="checkbox"
                            checked={settings.svg}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    svg: evt.target.checked,
                                }));
                            }}
                        />{' '}
                    </div>
                    {!settings.svg && (
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
                    )}
                    {settings.svg ? (
                        <div>
                            Rows
                            <input
                                type="range"
                                min="0"
                                max={settings.blanks * 2 - 1}
                                step="1"
                                value={settings.rows}
                                onChange={(evt) => {
                                    setSettings((s) => ({
                                        ...s,
                                        rows: +evt.target.value,
                                    }));
                                }}
                            />{' '}
                            {settings.rows}
                        </div>
                    ) : null}
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
                    <div>
                        Show reference
                        <input
                            type="checkbox"
                            checked={settings.showReference}
                            onChange={(evt) => {
                                setSettings((s) => ({
                                    ...s,
                                    showReference: evt.target.checked,
                                }));
                            }}
                        />{' '}
                    </div>
                </div>
            </div>
        </div>
    );
};
