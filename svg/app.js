const getFirstColor = (i) => (i % 2 == 0 ? 'red' : 'blue');
const getSecondColor = (i) => (i % 2 == 1 ? 'red' : 'blue');

const defaultSettings = {
    color: false,
    data: Object.keys(window.data)[0],
    layers: 7,
    size: 500,
    sub: 4,
    first: true,
};

const getSubColor = (num, first, fn) => (i) => {
    let band = parseInt(i / num);
    let off = i % num;
    if (off == 0) {
        return fn(band);
    } else if (band % 2 !== (first ? 0 : 1)) {
        return fn(band + 1);
        // return 'rgba(0,0,0,0.1)';
    }
};

const app = (root, settings) => {
    const update = (settings) => {
        window.location.hash = JSON.stringify(settings);
        app(root, { ...defaultSettings, ...settings });
    };

    const canvas = div({});
    const image = createImage(
        window.data[settings.data],
        getSubColor(
            settings.sub || 3,
            settings.first,
            settings.color ? getFirstColor : getColor,
        ),
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
