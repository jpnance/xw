const https = require('https');

const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let now = new Date();

let puzzleServices = [
	// puz files
	{
		url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/Apr0120.puz', // nyt
		strategy: 'puz'
	},
	{
		url: 'https://herbach.dnsalias.com/wsj/wsj200331.puz', // wsj
		strategy: 'puz'
	},
	{
		url: 'https://herbach.dnsalias.com/uc/uc200331.puz', // universal
		strategy: 'puz'
	},

	// amuselabs json
	{
		shortName: 'lat',
		parameters: {
			id: 'tca' + Util.dateFormat(now, '%y%m%d'),
			set: 'latimes'
		},
		url: 'https://cdn4.amuselabs.com/lat/crossword', // lat
		strategy: 'aljson'
	},
	{
		shortName: 'wapo-sunday',
		parameters: {
			id: 'ebirnholz_' + Util.dateFormat(now, '%y%m%d'),
			set: 'wapo-eb'
		},
		url: 'https://cdn1.amuselabs.com/wapo/crossword', // wapo sunday
		strategy: 'aljson'
	},
	{
		shortName: 'vox',
		parameters: {
			id: 'vox_' + Util.dateFormat(now, '%Y%m%d') + '_1000',
			set: 'vox'
		},
		url: 'https://cdn3.amuselabs.com/vox/crossword', // vox
		strategy: 'aljson'
	},
	{
		shortName: 'newsday',
		parameters: {
			id: 'Creators_WEB_' + Util.dateFormat(now, '%Y%m%d'),
			set: 'creatorsweb'
		},
		url: 'https://cdn2.amuselabs.com/pmm/crossword', // newsday
		strategy: 'aljson'
	},
	{
		shortName: 'atlantic',
		parameters: {
			id: 'atlantic_' + Util.dateFormat(now, '%Y%m%d'),
			set: 'atlantic'
		},
		url: 'https://cdn3.amuselabs.com/atlantic/crossword', // atlantic
		strategy: 'aljson'
	},
	{
		shortName: 'new-yorker',
		url: 'https://cdn3.amuselabs.com/tny/crossword?id=23de3efb&set=tny-weekly', // new yorker
		strategy: 'aljson-but-more-complicated'
	},

	// jsonp
	{
		url: 'https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX18CR3EauHsCV8JgqcLh1ptpjBeQ%2Bnjkzhu8zNO00WYK6b%2BaiZHnKcAD%0A9vwtmWJp2uHE9XU1bRw2gA%3D%3D/g/usaon/d/2020-04-01/data.json?callback=jQuery17204215043047595478_1585850392401&_=1585850393396', // usa today
		strategy: 'somethingelse'
	}
];

let servicePromises = [];

puzzleServices.forEach(puzzleService => {
	if (puzzleService.strategy != 'aljson') {
		return;
	}

	servicePromises.push(new Promise(function(resolve, reject) {
		let hostname = puzzleService.url.match(/https:\/\/(.*?)\/.*/)[1];
		let path = puzzleService.url.match(/https:\/\/.*?(\/.*)/)[1];

		if (puzzleService.parameters) {
			path += '?';

			Object.keys(puzzleService.parameters).forEach((key, i) => {
				if (i > 0) {
					path += '&';
				}

				path += key + '=' + puzzleService.parameters[key];
			});
		}

		let options = {
			hostname: hostname,
			port: 443,
			path: path,
			method: 'GET'
		};

		let body = '';
		let encodedPuzzle, jsonPuzzle;

		let puzzle = new Puzzle();

		const request = https.request(options, (response) => {
			if (response.statusCode != 200) {
				console.log(puzzleService.shortName + ': status code ' + response.statusCode);
				resolve();
				return;
			}

			response.setEncoding('utf-8');

			response.on('data', (chunk) => {
				body += chunk;
			});

			response.on('end', () => {
				encodedPuzzle = body.match(/window.rawc = '(.*?)';/);

				puzzle.loadFromAmuseLabsJson(JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8')));
				puzzle.writeToFile('puzzles/' + puzzleService.shortName + '-' + Util.dateFormat(now, '%Y-%m-%d.puz'));
			});
		});

		request.on('error', (error) => {
			console.error(error);
		});

		request.end();
	}));
});

Promise.all(servicePromises).then(() => {
	process.exit();
});
