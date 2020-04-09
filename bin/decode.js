const dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

const { http, https } = require('follow-redirects');

const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let dateArg = process.argv[2] ? new Date(process.argv[2] + ' 00:00:00') : new Date();

let puzzleServices = [
	// puz files
	{
		shortName: 'nyt',
		url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/' + Util.dateFormat(dateArg, '%b%d%y') + '.puz', // nyt
		cookie: process.env.NYT_COOKIE,
		strategy: 'puz'
	},
	{
		shortName: 'wsj',
		url: 'http://herbach.dnsalias.com/wsj/wsj' + Util.dateFormat(dateArg, '%y%m%d') + '.puz', // wsj
		strategy: 'puz'
	},
	{
		shortName: 'universal',
		url: 'http://herbach.dnsalias.com/uc/uc' + Util.dateFormat(dateArg, '%y%m%d') + '.puz', // universal
		strategy: 'puz'
	},

	// amuselabs json
	{
		shortName: 'lat',
		parameters: {
			id: 'tca' + Util.dateFormat(dateArg, '%y%m%d'),
			set: 'latimes'
		},
		url: 'https://cdn4.amuselabs.com/lat/crossword', // lat
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'wapo-sunday',
		parameters: {
			id: 'ebirnholz_' + Util.dateFormat(dateArg, '%y%m%d'),
			set: 'wapo-eb'
		},
		url: 'https://cdn1.amuselabs.com/wapo/crossword', // wapo sunday
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'vox',
		parameters: {
			id: 'vox_' + Util.dateFormat(dateArg, '%Y%m%d') + '_1000',
			set: 'vox'
		},
		url: 'https://cdn3.amuselabs.com/vox/crossword', // vox
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'newsday',
		parameters: {
			id: 'Creators_WEB_' + Util.dateFormat(dateArg, '%Y%m%d'),
			set: 'creatorsweb'
		},
		url: 'https://cdn2.amuselabs.com/pmm/crossword', // newsday
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'atlantic',
		parameters: {
			id: 'atlantic_' + Util.dateFormat(dateArg, '%Y%m%d'),
			set: 'atlantic'
		},
		url: 'https://cdn3.amuselabs.com/atlantic/crossword', // atlantic
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'new-yorker',
		url: 'https://www.newyorker.com/crossword/puzzles-dept/' + Util.dateFormat(dateArg, '%Y/%m/%d'),
		regExp: /https?:\/\/cdn\d.amuselabs.com\/tny\/crossword.*?set=tny-weekly/,
		strategy: 'scrape',
		postScrapeStrategy: 'amuselabs-json'
	},

	// jsonp
	{
		shortName: 'usa-today',
		url: 'https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX18CR3EauHsCV8JgqcLh1ptpjBeQ%2Bnjkzhu8zNO00WYK6b%2BaiZHnKcAD%0A9vwtmWJp2uHE9XU1bRw2gA%3D%3D/g/usaon/d/' + Util.dateFormat(dateArg, '%Y-%m-%d') + '/data.json', // usa today
		strategy: 'usa-today-json'
	},

	// rss feeds
	{
		shortName: 'beq',
		url: 'https://feeds.feedburner.com/BrendanEmmettQuigley--CanIHaveAWordWithYou',
		regExps: {
			item: /<entry>(.*?)<\/entry>/g,
			date: /<published>(.*?)<\/published>/,
			puzzle: /(http:\/\/www.brendanemmettquigley.com\/files\/.*?\.puz)/,
		},
		strategy: 'rss'
	},
	{
		shortName: 'square-pursuit',
		url: 'https://squarepursuit.com/feed/',
		regExps: {
			item: /<item>(.*?)<\/item>/g,
			date: /<pubDate>(.*?)<\/pubDate>/,
			puzzle: /<a href="(https:\/\/drive.google.com\/open\?id=(.*?))">\.puz<\/a>/
		},
		strategy: 'rss',
		subStrategy: 'google'
	}
];

let servicePromises = [];

puzzleServices.forEach(fetchPuzzle);

function fetchPuzzle(puzzleService) {
	if (!['puz', 'amuselabs-json', 'usa-today-json', 'rss', 'scrape'].includes(puzzleService.strategy)) {
		return;
	}

	servicePromises.push(new Promise(function(resolve, reject) {
		let hostname = puzzleService.url.match(/https?:\/\/(.*?)\/.*/)[1];
		let path = puzzleService.url.match(/https?:\/\/.*?(\/.*)/)[1];
		let protocol = puzzleService.url.startsWith('https') ? https : http;

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
			port: puzzleService.url.startsWith('https') ? 443 : 80,
			path: path,
			method: 'GET'
		};

		if (puzzleService.cookie) {
			options.headers = {
				'Cookie': puzzleService.cookie
			};
		}

		let body = '';
		let encodedPuzzle, jsonPuzzle;

		let puzzle = new Puzzle();

		const request = protocol.request(options, (response) => {
			if (response.statusCode != 200) {
				console.log(puzzleService.shortName + ': status code ' + response.statusCode);
				resolve();
				return;
			}

			if (puzzleService.strategy == 'puz') {
				response.setEncoding('binary');
			}
			else {
				response.setEncoding('utf8');
			}

			response.on('data', (chunk) => {
				body += chunk;
			});

			response.on('end', () => {
				if (puzzleService.strategy == 'amuselabs-json') {
					encodedPuzzle = body.match(/window.rawc = '(.*?)';/);

					if (!encodedPuzzle || !encodedPuzzle[1]) {
						console.log(puzzleService.shortName + ': no puzzle found');
						resolve();
						return;
					}

					puzzle.loadFromAmuseLabsJson(JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8')));
				}
				else if (puzzleService.strategy == 'usa-today-json') {
					puzzle.loadFromUsaTodayJson(JSON.parse(body));
				}
				else if (puzzleService.strategy == 'rss') {
					body = body.replace(/\r\n/g, '');
					body = body.replace(/\n/g, '');
					let itemMatch;

					while ((itemMatch = puzzleService.regExps.item.exec(body)) !== null) {
						let dateMatch = puzzleService.regExps.date.exec(itemMatch[1]);

						if (dateMatch[1]) {
							let date = new Date(dateMatch[1]);

							if (Util.dateFormat(date, '%Y-%m-%d') == Util.dateFormat(dateArg, '%Y-%m-%d')) {
								let puzzleMatch = puzzleService.regExps.puzzle.exec(itemMatch[1]);
								let puzzleUrl = puzzleMatch[1];


								if (puzzleService.subStrategy == 'google') {
									puzzleUrl = 'https://drive.google.com/uc?export=download&id=' + puzzleMatch[2];
								}

								fetchPuzzle({
									shortName: puzzleService.shortName,
									url: puzzleUrl,
									strategy: 'puz'
								});

							}
						}
					}

					return;
				}
				else if (puzzleService.strategy == 'scrape') {
					let urlMatch = body.match(puzzleService.regExp);

					fetchPuzzle({
						shortName: puzzleService.shortName,
						url: urlMatch[0],
						strategy: puzzleService.postScrapeStrategy
					});

					return;
				}
				else if (puzzleService.strategy == 'puz') {
					let puzFile = new Uint8Array(body.length);

					for (let i = 0; i < body.length; i++) {
						puzFile[i] = body.charCodeAt(i);
					}

					puzzle.loadFromPuzFile(puzFile);
				}

				puzzle.writeToFile('puzzles/' + puzzleService.shortName + '-' + Util.dateFormat(dateArg, '%Y-%m-%d.puz'));
			});
		});

		request.on('error', (error) => {
			console.error(error);
		});

		request.end();
	}));
}

Promise.all(servicePromises).then(() => {
	process.exit();
});
