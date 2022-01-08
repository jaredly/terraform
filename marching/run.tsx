const data2 = require('../exports/timp_hex.js');
import '../exports/timp_hex.js';
import '../exports/tn_rect.js';
import '../exports/cec.js';
import '../exports/cec2.js';
import '../exports/arenal.js';
import '../exports/arenal-small.js';
import '../exports/arenal-large.js';
import '../exports/arenal-hex.js';
import '../exports/arenal_hike.js';
import '../exports/timp_trail.js';
import { renderLevel } from './render';
import { render } from 'react-dom';
import React from 'react';
import { App } from './App.js';

type Dataset = {
    rows: Array<Array<number>>;
    shape: 'rect' | 'hex';
    x: number;
    y: number;
    w: number;
    h: number;
    ow: number;
    oh: number;
};

const data: {
    [key: string]: Dataset;
} = (window as any).data;

// const dataset =
//     data['/Users/jared/clone/exploration/terraform/tn_rect.js'];
// const dataset = data['/Users/jared/clone/exploration/terraform/timp_hex.js'];
// const dataset =
//     data['/Users/jared/clone/exploration/terraform/cec.js'];
// const dataset = data['/Users/jared/Downloads/cec2.js'];
// const dataset =
//     data['/Users/jared/Downloads/arenal.js'];
// const dataset =
//     data['/Users/jared/Downloads/arenal-small.js'];
// const dataset = data['/Users/jared/Downloads/arenal-large.js'];

// export const dataset = data['/Users/jared/Downloads/arenal-hex.js'];

// // TWEAK THESE
const widthInMM = 203;
const thickness = 3;
const skip = 4;
const scale = 10;

// renderTopoMap({ dataset, thickness, widthInMM, skip, scale });

render(<App />, document.getElementById('root'));

// function renderTopoMap({
//     dataset,
//     widthInMM,
//     thickness,
//     skip,
//     scale,
// }: {
//     dataset: Dataset;
//     widthInMM: number;
//     thickness: number;
//     skip: number;
//     scale: number;
// }) {
//     const lines = dataset.rows;

//     let max = -Infinity;
//     let min = Infinity;
//     lines.forEach((line) =>
//         line.forEach((v) => {
//             max = Math.max(v, max);
//             min = Math.min(v, min);
//         }),
//     );

//     const heightInMM = max * widthInMM;
//     const materialLayers = Math.round(heightInMM / thickness);
//     const layers = (materialLayers + 1) * skip - 1;
//     // console.log(heightInMM / thickness, materialLayers, heightInMM, layers);

//     const steps = layers;

//     const canvas = document.createElement('canvas');
//     canvas.width = scale * lines[0].length;
//     canvas.height = scale * lines.length;
//     canvas.style.width = `${(scale * lines[0].length) / 2}px`;
//     canvas.style.height = `${(scale * lines.length) / 2}px`;
//     const ctx = canvas.getContext('2d')!;

//     ctx.lineWidth = 0.5;

//     document.body.append(canvas);

//     const renderAt = (at: number) => {
//         const th = ((max - min) / steps) * at;
//         ctx.strokeStyle = `hsl(${(at / steps) * 360}, 100%, 50%)`;
//         renderLevel(ctx, th, lines, scale, dataset.shape === 'hex');
//     };

//     for (let at = 0; at < steps; at++) {
//         renderAt(at);
//     }
// }
// let at = 0;
// const fn = () => {
//     if (at++ > steps) return;
//     // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//     renderAt(at);
//     requestAnimationFrame(fn);
//     // setTimeout(fn, 100)
// };
// fn();
