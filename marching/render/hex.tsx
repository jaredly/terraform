// Utility stuff probably

// Functions for calculating haxagon polylines

export const hex = (
    cx: number,
    cy: number,
    radius: number,
): Array<[number, number]> => {
    const halfHeight = (radius / 2) * Math.sqrt(3);
    return [
        [cx - radius, cy],
        [cx - radius / 2, cy - halfHeight],
        [cx + radius / 2, cy - halfHeight],
        [cx + radius, cy],
        [cx + radius / 2, cy + halfHeight],
        [cx - radius / 2, cy + halfHeight],
    ];
};

export const borderHexes = (
    w: number,
    h: number,
    scale: number,
    vmargin: number,
): Array<Array<[number, number]>> => {
    const heightPx = h * scale + vmargin * 2;
    const widthMargin = (vmargin * 2) / Math.sqrt(3);
    const widthPx = w * scale + widthMargin * 2;
    return [
        hex(
            widthPx / 2,
            heightPx / 2,
            (((h - 1.0) * scale) / 2 / Math.sqrt(3)) * 2,
        ),
        hex(widthPx / 2, heightPx / 2, (heightPx / 2 / Math.sqrt(3)) * 2 - 1),
    ];
};
