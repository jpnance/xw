const https = require('https');

let uris = [
	'https://www.nytimes.com/svc/crosswords/v2/puzzle/Apr0120.puz', // nyt
	'https://herbach.dnsalias.com/wsj/wsj200331.puz', // wsj
	'http://herbach.dnsalias.com/uc/uc200331.puz', // universal

	'https://cdn4.amuselabs.com/lat/crossword?id=tca200401&set=latimes', // lat
	'https://cdn1.amuselabs.com/wapo/crossword?id=ebirnholz_200329&set=wapo-eb', // wapo sunday
	'https://cdn3.amuselabs.com/vox/crossword?id=vox_20200325_1000&set=vox', // vox
	'https://cdn2.amuselabs.com/pmm/crossword?id=Creators_WEB_20200401&set=creatorsweb', // newsday
	'https://cdn3.amuselabs.com/atlantic/crossword?id=atlantic_20200401&set=atlantic', // atlantic
	'https://cdn3.amuselabs.com/tny/crossword?id=23de3efb&set=tny-weekly', // new yorker
];

let options = {
	hostname: 'cdn4.amuselabs.com',
	port: 443,
	path: '/lat/crossword?id=tca200401&set=latimes',
	method: 'GET'
};

let body = '';
let encodedPuzzle, jsonPuzzle;

let puzzle = {};

const request = https.request(options, (response) => {
	response.setEncoding('utf-8');

	response.on('data', (chunk) => {
		body += chunk;
	});

	response.on('end', () => {
		encodedPuzzle = body.match(/window.rawc = '(.*?)';/);

		jsonPuzzle = JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8'));

		puzzle.title = jsonPuzzle.title;
		puzzle.author = jsonPuzzle.author;
		puzzle.copyright = jsonPuzzle.copyright;

		puzzle.width = jsonPuzzle.w;
		puzzle.height = jsonPuzzle.h;

		puzzle.grid = [];

		for (let i = 0; i < jsonPuzzle.box[0].length; i++) {
			puzzle.grid[i] = '';
		}

		jsonPuzzle.box.forEach(boxRow => {
			boxRow.forEach((boxRowChar, i) => {
				if (boxRowChar == '\u0000') {
					puzzle.grid[i] += '.';
				}
				else {
					puzzle.grid[i] += boxRowChar;
				}
			});
		});

		let maxClueNumber = 0;

		jsonPuzzle.clueNums.forEach(clueNumRow => {
			let clueNumRowMax = Math.max(...clueNumRow);

			if (clueNumRowMax > maxClueNumber) {
				maxClueNumber = clueNumRowMax;
			}
		});

		puzzle.clues = [];

		for (let i = 1; i <= maxClueNumber; i++) {
			let acrossClue = jsonPuzzle.placedWords.find(element => element.clueNum == i && element.acrossNotDown);
			let downClue = jsonPuzzle.placedWords.find(element => element.clueNum == i && !element.acrossNotDown);

			if (acrossClue) {
				puzzle.clues.push(acrossClue.clue.clue);
			}

			if (downClue) {
				puzzle.clues.push(downClue.clue.clue);
			}
		}

		//console.log(JSON.stringify(jsonPuzzle, null, "\t"));
		console.log(puzzle);

		process.exit();
	});
});

request.on('error', (error) => {
	console.error(error);
});

request.end();

//console.log(JSON.parse(Buffer.from(puzzles[1], 'base64').toString('ascii')));
