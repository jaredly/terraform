// Ok

const fs = require('fs');

const [_, __, infile, outfile] = process.argv;

if (!infile || !outfile) {
    console.log('usage: json-to-csv.js somefile.js somefile.csv');
    process.exit(1);
}

const {
    data: {
        trackData: [track],
    },
} = JSON.parse(fs.readFileSync(infile, 'utf8'));

fs.writeFileSync(
    outfile,
    `lat,lon,ele\n` +
        track
            .map(
                (item) =>
                    `${item.lat.toFixed(6)},${item.lon.toFixed(
                        6,
                    )},${item.ele.toFixed(6)}`,
            )
            .join('\n'),
);
