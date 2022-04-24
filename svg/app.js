const defaultSettings = {
    title: '',
    color: false,
    data: Object.keys(window.data)[0],
    trail: null,
    thickness: 3,
    // layers: 7,
    size: 500,
    sub: 4,
    first: true,
    minStep: 0,
    margin: 5,
    stars: '',
};

const drawData = (title, rawData) => {
    const csv = rawData.rows;
    let min = Infinity;
    let max = -Infinity;

    csv.forEach((line) =>
        line.forEach((item) => {
            min = Math.min(min, item);
            max = Math.max(max, item);
        }),
    );

    const canvas = document.createElement('canvas');
    const size = 500;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    csv.forEach((line, y) => {
        const w = Math.floor(size / line.length);
        const h = Math.floor(size / csv.length);
        line.forEach((val, x) => {
            const scaled = (val - min) / (max - min);
            ctx.fillStyle = `rgba(0,0,255,${scaled})`;
            ctx.fillRect(x * w, y * h, w, h);
        });
    });
    return canvas;
};

const app = (root, settings) => {
    const update = (settings) => {
        window.location.hash = JSON.stringify(settings);
        app(root, { ...defaultSettings, ...settings });
    };

    // This is for debugging the export, to see if things make sense.
    // const canvas = drawData(settings.title, window.data[settings.data]);
    // const image = 'ehllo';

    const canvas = div({});
    const image = createImage(
        settings.title,
        window.data[settings.data],
        window.trails[settings.trail],
        {
            sub: settings.sub,
            first: settings.first,
            minStep: settings.minStep,
            thickness: settings.thickness,
            width: settings.size,
            margin: settings.margin,
            stars: settings.stars,
        },
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
                'first. ',
                'Material thickness',
                blurInput(settings.thickness, (thickness) =>
                    update({ ...settings, thickness }),
                ),
                'mm. Skip:',
                blurInput(settings.sub, (sub) => update({ ...settings, sub })),
                'Width:',
                blurInput(
                    settings.size,
                    (size) => update({ ...settings, size }),
                    40,
                ),
                'mm. Horizontal Margin:',
                blurInput(settings.margin, (margin) =>
                    update({ ...settings, margin }),
                ),
                'mm',
                button({ onclick: () => update(settings) }, 'Re-run'),
                'Title:',
                blurInput(
                    settings.title,
                    (title) => update({ ...settings, title }),
                    100,
                ),
                'Stars:',
                blurInput(
                    settings.stars,
                    (stars) => update({ ...settings, stars }),
                    100,
                ),
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
                div(
                    {},
                    Object.keys(window.trails).map((name) =>
                        button(
                            {
                                onclick: () => {
                                    update({ ...settings, trail: name });
                                },
                            },
                            `Load trail ${name}`,
                        ),
                    ),
                ),
            ]),
            node('img', { src: `data:image/svg+xml,` + image }),
        ]),
    );
};

const blurInput = (value, onChange, width = 20) => {
    const dom = node('input', {
        style: { width: width + 'px' },
        onchange: () => onChange(dom.value),
        value,
    });
    return dom;
};

const root = document.createElement('div');
document.body.appendChild(root);

app(root, {
    ...defaultSettings,
    ...(window.location.hash.length
        ? JSON.parse(decodeURIComponent(window.location.hash.slice(1)))
        : {}),
});
