const fs = require('fs');
const path = require('path');
const [_, __, fname] = process.argv;
fs.writeFileSync(
    path.basename(fname) + '.js',
    `window.data[${JSON.stringify(path.basename(fname))}] = ${JSON.stringify(
        fs.readFileSync(fname, 'utf8'),
    )}`,
    'utf8',
);
