// The bones of marching squares

export function calculateLines(
    interpolation: boolean,
    inputValues: Array<Array<number>>,
    threshhold: number,
    scale: number,
    // For discarding points outside of the clip
    // isValid: (x: number, y: number) => boolean,
) {
    // const rez = 1;
    const lines: Array<[Point, Point]> = [];

    const addLine = (p1: Point, p2: Point) => {
        lines.push([p1, p2]);
    };

    let missed = 0;

    for (var y = 0; y < inputValues.length - 1; y++) {
        for (var x = 0; x < inputValues[y].length - 1; x++) {
            // if (
            //     !isValid(x, y) ||
            //     !isValid(x + 1, y + 1) ||
            //     !isValid(x + 1, y - 1) ||
            //     !isValid(x - 1, y + 1)
            // ) {
            //     continue;
            // }
            let a: Point, b: Point, c: Point, d: Point;
            if (!interpolation) {
                //abcd uninterpolated
                a = [x * scale + scale / 2, y * scale];
                b = [x * scale + scale, y * scale + scale / 2];
                c = [x * scale + scale / 2, y * scale + scale];
                d = [x * scale, y * scale + scale / 2];
            } else {
                //abcd interpolated
                const nw = inputValues[y][x];
                const ne = inputValues[y][x + 1];
                const se = inputValues[y + 1][x + 1];
                const sw = inputValues[y + 1][x];
                a = [x * scale + scale * lerp(threshhold, nw, ne), y * scale];
                b = [
                    x * scale + scale,
                    y * scale + scale * lerp(threshhold, ne, se),
                ];
                c = [
                    x * scale + scale * lerp(threshhold, sw, se),
                    y * scale + scale,
                ];
                d = [x * scale, y * scale + scale * lerp(threshhold, nw, sw)];
            }

            const v = stateForGridPosition(inputValues, y, x, threshhold);
            switch (v) {
                case 1:
                case 14:
                    addLine(d, c);
                    break;

                case 2:
                case 13:
                    addLine(b, c);
                    break;

                case 3:
                case 12:
                    addLine(d, b);
                    break;

                case 11:
                case 4:
                    addLine(a, b);
                    break;

                case 5:
                    addLine(d, a);
                    addLine(c, b);
                    break;
                case 6:
                case 9:
                    addLine(c, a);
                    break;

                case 7:
                case 8:
                    addLine(d, a);
                    break;

                case 10:
                    addLine(a, b);
                    addLine(c, d);
                    break;
                case 0:
                    missed++;
                default:
                    // console.log('what', v);
                    break;
            }
        }
    }
    return lines;
}

export function stateForGridPosition(
    inputValues: number[][],
    y: number,
    x: number,
    threshhold: number,
): number {
    return binaryToType(
        inputValues[y][x] > threshhold ? 1 : 0,
        inputValues[y][x + 1] > threshhold ? 1 : 0,
        inputValues[y + 1][x + 1] > threshhold ? 1 : 0,
        inputValues[y + 1][x] > threshhold ? 1 : 0,
    );
}

export function binaryToType(nw: number, ne: number, se: number, sw: number) {
    let a = [nw, ne, se, sw];
    // if (nw != 0 || ne != 0 || se != 0 || sw != 0) {
    //     console.log(a);
    // }
    // fila;
    return a.reduce((res, x) => (res << 1) | x);
}

export type Point = [number, number];
function lerp(x: number, x0: number, x1: number, y0 = 0, y1 = 1) {
    if (x0 === x1) {
        return x0;
    }

    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}
