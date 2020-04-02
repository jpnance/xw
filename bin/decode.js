const https = require('https');

let uris = [
	'https://www.nytimes.com/svc/crosswords/v2/puzzle/Apr0120.puz', // nyt
	'https://herbach.dnsalias.com/wsj/wsj200331.puz', // wsj
	'http://herbach.dnsalias.com/uc/uc200331.puz', // universal

	'https://cdn4.amuselabs.com/lat/crossword?id=tca200401&set=latimes', // lat
	'https://cdn1.amuselabs.com/wapo/crossword?id=ebirnholz_200329&set=wapo-eb', // wapo sunday
	'https://cdn3.amuselabs.com/vox/crossword?id=vox_20200325_1000&set=vox', // vox
	'https://cdn2.amuselabs.com/pmm/crossword?id=Creators_WEB_20200401&set=creatorsweb', // newsday
	'https://cdn3.amuselabs.com/atlantic/crossword?id=atlantic_20200401&set=atlantic' // atlantic
];

let options = {
	hostname: 'cdn4.amuselabs.com',
	port: 443,
	path: '/lat/crossword?id=tca200401&set=latimes',
	method: 'GET'
};

let body = '';
let encodedPuzzle, jsonPuzzle;
let grid = [];

const request = https.request(options, (response) => {
	response.setEncoding('utf-8');

	response.on('data', (chunk) => {
		body += chunk;
	});

	response.on('end', () => {
		encodedPuzzle = body.match(/window.rawc = '(.*?)';/);

		jsonPuzzle = JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8'));

		for (let i = 0; i < jsonPuzzle.box[0].length; i++) {
			grid[i] = '';
		}

		jsonPuzzle.box.forEach(boxRow => {
			boxRow.forEach((boxRowChar, i) => {
				if (boxRowChar == '\u0000') {
					grid[i] += '.';
				}
				else {
					grid[i] += boxRowChar;
				}
			});
		});

		console.log(grid);

		process.exit();
	});
});

request.on('error', (error) => {
	console.error(error);
});

request.end();

//console.log(JSON.parse(Buffer.from(puzzles[1], 'base64').toString('ascii')));
