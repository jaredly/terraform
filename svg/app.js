const defaultSettings = {
    color: false,
    data: Object.keys(window.data)[0],
    layers: 7,
    size: 500,
    sub: 4,
    first: true,
    minStep: 0,
};

const app = (root, settings) => {
    const update = (settings) => {
        window.location.hash = JSON.stringify(settings);
        app(root, { ...defaultSettings, ...settings });
    };

    const canvas = div({});
    const image = createImage(
        window.data[settings.data],
        settings.sub,
        settings.first,
        settings.minStep,
        settings.layers,
        settings.size,
    );
    canvas.innerHTML = image;
    render(
        root,
        div({}, [
            div({}, [
                button(
                    {
                        onclick: () =>
                            update({ ...settings, color: !settings.color }),
                    },
                    settings.color ? 'Multicolor' : 'Laser colors',
                ),
                node('input', {
                    type: 'checkbox',
                    checked: settings.first,
                    onchange: (evt) =>
                        update({ ...settings, first: evt.target.checked }),
                }),
                'first',
                button(
                    {
                        onclick: () =>
                            update({
                                ...settings,
                                layers: +settings.layers - 1,
                            }),
                    },
                    '- layer',
                ),
                blurInput(settings.layers, (layers) =>
                    update({ ...settings, layers }),
                ),
                button(
                    {
                        onclick: () =>
                            update({
                                ...settings,
                                layers: +settings.layers + 1,
                            }),
                    },
                    '+ layer',
                ),
                'Skip:',
                blurInput(settings.sub, (sub) => update({ ...settings, sub })),
                'Min Step:',
                blurInput(settings.minStep, (minStep) =>
                    update({ ...settings, minStep }),
                ),
                button({ onclick: () => update(settings) }, 'Re-run'),
            ]),
            canvas,
            div({}, [
                div(
                    {},
                    Object.keys(window.data).map((num) =>
                        button(
                            {
                                onclick: () => {
                                    update({ ...settings, data: num });
                                },
                            },
                            `Load data ${num}`,
                        ),
                    ),
                ),
            ]),
            node('img', { src: `data:image/svg+xml,` + image }),
        ]),
    );
};

const blurInput = (value, onChange) => {
    const dom = node('input', {
        style: { width: '20px' },
        onchange: () => onChange(dom.value),
        value,
    });
    return dom;
};

const root = document.createElement('div');
document.body.appendChild(root);

app(
    root,
    window.location.hash.length
        ? JSON.parse(decodeURIComponent(window.location.hash.slice(1)))
        : defaultSettings,
);
