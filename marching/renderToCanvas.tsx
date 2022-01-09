import { isValidHex } from './render';
import { Dataset, Trail, Settings } from './App';
import { prepareLines } from './prepareLines';

export function renderToCanvas(
    canvas: HTMLCanvasElement,
    dataset: Dataset,
    settings: Settings,
    trail?: Trail,
) {
    const rendered = prepareLines(dataset, settings, undefined, trail);
    canvas.width = rendered.w;
    canvas.height = rendered.h;
    canvas.style.width = `${rendered.w / 2}px`;
    canvas.style.height = `${rendered.h / 2}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'green';

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'green';
    rendered.borders.forEach((border) => {
        ctx.beginPath();
        strokePoints(ctx, border, true);
        ctx.stroke();
    });

    if (settings.rainbow) {
        ctx.globalAlpha = 0.1;
        dataset.rows.forEach((line, y) => {
            line.forEach((v, x) => {
                if (dataset.shape !== 'hex' || isValidHex(x, y, dataset.rows)) {
                    ctx.fillStyle = `hsl(${
                        (((v - rendered.min) / (rendered.max - rendered.min)) *
                            360 *
                            10) %
                        360
                    }, 100%, 50%)`;
                    ctx.fillRect(
                        x * settings.scale + rendered.wmargin,
                        y * settings.scale + rendered.vmargin,
                        settings.scale,
                        settings.scale,
                    );
                }
            });
        });
        ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = `#f00`;
    rendered.cuts.forEach((cut) => {
        ctx.beginPath();
        strokePoints(ctx, cut);
        ctx.stroke();
    });

    if (settings.skip === 1) {
        ctx.strokeStyle = `#777`;
    } else {
        ctx.strokeStyle = `#999`;
    }

    rendered.alts.forEach((line) => {
        ctx.beginPath();
        strokePoints(ctx, line);
        ctx.stroke();
    });

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `#777`;
    rendered.skips.forEach((alt) => {
        ctx.beginPath();
        strokePoints(ctx, alt);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = 'green';
    ctx.lineWidth = 5;
    rendered.innerCut.forEach(([[x0, y0], [x1, y1]]) => {
        ctx.beginPath();
        ctx.moveTo(x0 + rendered.wmargin, y0 + rendered.vmargin);
        ctx.lineTo(x1 + rendered.wmargin, y1 + rendered.vmargin);
        ctx.stroke();
    });
    if (rendered.trail) {
        ctx.strokeStyle = '#faa';
        rendered.trail.forEach((points) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    }
    if (settings.title) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = `${rendered.vmargin * 0.6}px sans-serif`;
        ctx.fillText(
            settings.title,
            canvas.width / 2,
            canvas.height - rendered.vmargin / 3,
        );
    }
}
const strokePoints = (
    ctx: CanvasRenderingContext2D,
    points: Array<[number, number]>,
    loop = false,
) => {
    if (loop) {
        ctx.moveTo(points[points.length - 1][0], points[points.length - 1][1]);
        points.forEach(([x, y]) => ctx.lineTo(x, y));
    } else {
        ctx.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    }
};
