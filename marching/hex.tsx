// Utility stuff probably

export const hex = (
    cx: number,
    cy: number,
    r: number,
): Array<[number, number]> => {
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

export const borderHexes = (
    w: number,
    h: number,
    scale: number,
    vmargin: number,
): Array<Array<[number, number]>> => {
    const hpx = h * scale + vmargin * 2;
    const wpx = w * scale + (vmargin * 2 * 2) / Math.sqrt(3);
    return [
        hex(wpx / 2, hpx / 2, (((h - 1.0) * scale) / 2 / Math.sqrt(3)) * 2),
        hex(wpx / 2, hpx / 2, (hpx / 2 / Math.sqrt(3)) * 2 - 1),
    ];
};
