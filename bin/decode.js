const https = require('https');

const Puzzle = require('../models/puzzle');

let uris = [
	// puz files
	'https://www.nytimes.com/svc/crosswords/v2/puzzle/Apr0120.puz', // nyt
	'https://herbach.dnsalias.com/wsj/wsj200331.puz', // wsj
	'http://herbach.dnsalias.com/uc/uc200331.puz', // universal

	// amuselabs json
	'https://cdn4.amuselabs.com/lat/crossword?id=tca200401&set=latimes', // lat
	'https://cdn1.amuselabs.com/wapo/crossword?id=ebirnholz_200329&set=wapo-eb', // wapo sunday
	'https://cdn3.amuselabs.com/vox/crossword?id=vox_20200325_1000&set=vox', // vox
	'https://cdn2.amuselabs.com/pmm/crossword?id=Creators_WEB_20200401&set=creatorsweb', // newsday
	'https://cdn3.amuselabs.com/atlantic/crossword?id=atlantic_20200401&set=atlantic', // atlantic
	'https://cdn3.amuselabs.com/tny/crossword?id=23de3efb&set=tny-weekly', // new yorker

	// jsonp
	'https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX18CR3EauHsCV8JgqcLh1ptpjBeQ%2Bnjkzhu8zNO00WYK6b%2BaiZHnKcAD%0A9vwtmWJp2uHE9XU1bRw2gA%3D%3D/g/usaon/d/2020-04-01/data.json?callback=jQuery17204215043047595478_1585850392401&_=1585850393396' // usa today
];

let options = {
	hostname: 'cdn4.amuselabs.com',
	port: 443,
	path: '/lat/crossword?id=tca200401&set=latimes',
	method: 'GET'
};

let body = '';
let encodedPuzzle, jsonPuzzle;

let puzzle = new Puzzle();

const request = https.request(options, (response) => {
	response.setEncoding('utf-8');

	response.on('data', (chunk) => {
		body += chunk;
	});

	response.on('end', () => {
		encodedPuzzle = body.match(/window.rawc = '(.*?)';/);

		puzzle.loadFromAmuseLabsJson(JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8')));

		process.exit();
	});
});

request.on('error', (error) => {
	console.error(error);
});

request.end();

//console.log(JSON.parse(Buffer.from(puzzles[1], 'base64').toString('ascii')));
