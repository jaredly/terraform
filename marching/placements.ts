const col = (x: number, y: number) => x * 2 + (y % 2 === 1 ? 1 : 0);

export const rowsFirst = (cells: number, columns: number) => {
    let x = 0;
    let y = 0;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < cells; i++) {
        positions.push({ x, y });
        x += 1;
        while (col(x, y) >= columns) {
            x = 0;
            y += 1;
        }
        // let col = x * 2 + (y % 2 === 1 ? 1 : 0);
        // if (col >= columns) {
        //     x = 0;
        //     y += 1;
        // }
    }
    return positions;
};

export const colsFirst = (cells: number, rows: number) => {
    let x = 0;
    let y = 0;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < cells; i++) {
        positions.push({ x, y });
        y += 2;
        while (y >= rows) {
            if (y % 2 === 0) {
                y = 1;
            } else {
                x += 1;
                y = 0;
            }
        }
    }
    return positions;
};
