const dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

const { http, https } = require('follow-redirects');
const fs = require('fs');
const path = require('path');

const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let cliArgs = {
	date: new Date(),
	shortName: null,
	url: null,
	strategy: null
};

let puzzleServices = [];

process.argv.forEach((argument, i) => {
	if (i < 2) {
		return;
	}

	if (argument == '--date') {
		cliArgs.date = 'expect';
	}
	else if (argument == '--short-name') {
		cliArgs.shortName = 'expect';
	}
	else if (argument == '--url') {
		cliArgs.url = 'expect';
	}
	else if (argument == '--strategy') {
		cliArgs.strategy = 'expect';
	}
	else if (cliArgs.date == 'expect') {
		cliArgs.date = new Date(argument + ' 00:00:00') || new Date();
	}
	else if (cliArgs.shortName == 'expect') {
		cliArgs.shortName = argument;
	}
	else if (cliArgs.url == 'expect') {
		cliArgs.url = argument;
	}
	else if (cliArgs.strategy == 'expect') {
		cliArgs.strategy = argument;
	}
});

let puzzleDatabase = Util.openJsonFile(path.resolve(__dirname, '../puzzles.json'));

if (cliArgs.shortName && cliArgs.url && cliArgs.strategy) {
	puzzleServices.push({
		shortName: cliArgs.shortName,
		url: cliArgs.url,
		strategy: cliArgs.strategy
	});
}
else {
	puzzleServices = [
		// puz files
		{
			shortName: 'nyt',
			url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/' + Util.dateFormat(cliArgs.date, '%b%d%y') + '.puz', // nyt
			strategy: 'puz',
			headers: {
				'Cookie': process.env.NYT_COOKIE
			}
		},
		{
			shortName: 'nyt-variety',
			url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/' + Util.dateFormat(cliArgs.date, '%b%d%y') + '.2.puz', // nyt-variety
			strategy: 'puz',
			headers: {
				'Cookie': process.env.NYT_COOKIE
			}
		},
		{
			shortName: 'wsj',
			url: 'http://herbach.dnsalias.com/wsj/wsj' + Util.dateFormat(cliArgs.date, '%y%m%d') + '.puz', // wsj
			strategy: 'puz'
		},
		{
			shortName: 'universal',
			url: 'http://herbach.dnsalias.com/uc/uc' + Util.dateFormat(cliArgs.date, '%y%m%d') + '.puz', // universal
			strategy: 'puz'
		},

		// amuselabs json
		{
			shortName: 'lat',
			parameters: {
				id: 'tca' + Util.dateFormat(cliArgs.date, '%y%m%d'),
				set: 'latimes'
			},
			url: 'https://cdn4.amuselabs.com/lat/crossword', // lat
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'wapo-sunday',
			parameters: {
				id: 'ebirnholz_' + Util.dateFormat(cliArgs.date, '%y%m%d'),
				set: 'wapo-eb'
			},
			url: 'https://cdn1.amuselabs.com/wapo/crossword', // wapo sunday
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'vox',
			parameters: {
				id: 'vox_' + Util.dateFormat(cliArgs.date, '%Y%m%d') + '_1000',
				set: 'vox'
			},
			url: 'https://cdn3.amuselabs.com/vox/crossword', // vox
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'vox',
			parameters: {
				id: 'vox_' + Util.dateFormat(cliArgs.date, '%Y%m0%d') + '_1000',
				set: 'vox'
			},
			url: 'https://cdn3.amuselabs.com/vox/crossword', // vox backup because their numbering scheme is insane
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'newsday',
			parameters: {
				id: 'Creators_WEB_' + Util.dateFormat(cliArgs.date, '%Y%m%d'),
				set: 'creatorsweb'
			},
			url: 'https://cdn2.amuselabs.com/pmm/crossword', // newsday
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'atlantic',
			parameters: {
				id: 'atlantic_' + Util.dateFormat(cliArgs.date, '%Y%m%d'),
				set: 'atlantic'
			},
			url: 'https://cdn3.amuselabs.com/atlantic/crossword', // atlantic
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'lat-mini',
			parameters: {
				id: 'latimes-mini-' + Util.dateFormat(cliArgs.date, '%Y%m%d'),
				set: 'latimes-mini'
			},
			url: 'https://cdn4.amuselabs.com/lat/crossword',
			strategy: 'amuselabs-json'
		},
		{
			shortName: 'new-yorker',
			url: 'https://www.newyorker.com/crossword/puzzles-dept/' + Util.dateFormat(cliArgs.date, '%Y/%m/%d'),
			regExp: /https?:\/\/cdn\d.amuselabs.com\/tny\/crossword.*?set=tny-weekly/,
			strategy: 'scrape',
			postScrapeStrategy: 'amuselabs-json'
		},

		// jsonp
		{
			shortName: 'usa-today',
			url: 'https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX18CR3EauHsCV8JgqcLh1ptpjBeQ%2Bnjkzhu8zNO00WYK6b%2BaiZHnKcAD%0A9vwtmWJp2uHE9XU1bRw2gA%3D%3D/g/usaon/d/' + Util.dateFormat(cliArgs.date, '%Y-%m-%d') + '/data.json', // usa today
			strategy: 'usa-today-json'
		},

		// rss feeds
		{
			shortName: 'beq',
			url: 'https://feeds.feedburner.com/BrendanEmmettQuigley--CanIHaveAWordWithYou',
			strategy: 'rss'
		},
		{
			shortName: 'square-pursuit',
			url: 'https://squarepursuit.com/feed/',
			strategy: 'rss'
		},
		{
			shortName: 'tough-as-nails',
			url: 'https://toughasnails.net/feed/',
			strategy: 'rss'
		},
		{
			shortName: 'club72',
			url: 'https://club72.wordpress.com/feed/',
			strategy: 'rss'
		},
		{
			shortName: 'sids-grids',
			url: 'https://www.sidsgrids.com/blog-feed.xml',
			strategy: 'rss'
		},
		{
			shortName: 'cruzzles',
			url: 'https://cruzzles.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'grid-therapy',
			url: 'https://trentevans.com/crosswords/?feed=rss2',
			strategy: 'rss'
		},
		{
			shortName: 'bywaters',
			url: 'https://www.davidalfredbywaters.com/blog?format=rss',
			strategy: 'rss',
			headers: {
				'User-Agent': 'Nonzero something.'
			}
		},
		{
			shortName: 'rossword',
			url: 'https://rosswordpuzzles.com/feed/',
			strategy: 'rss'
		},
		{
			shortName: 'arctanxwords',
			url: 'http://arctanxwords.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'luckystreak',
			url: 'https://luckyxwords.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'datalexic',
			url: 'http://datalexic.com/feed/',
			strategy: 'rss'
		},
		{
			shortName: 'ptnah',
			url: 'https://puzzlesthatneedahome.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'grids-these-days',
			url: 'http://gridsthesedays.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'happy-little-puzzles',
			url: 'https://www.happylittlepuzzles.com/blog-feed.xml',
			strategy: 'rss'
		},
		{
			shortName: 'brain-candy',
			url: 'https://amandarafkin.blogspot.com/feeds/posts/default',
			strategy: 'rss'
		},
		{
			shortName: 'bewilderingly',
			url: 'http://blog.bewilderinglypuzzles.com/feeds/posts/default',
			strategy: 'rss'
		}
	];
}

let servicePromises = [];

puzzleServices.forEach(fetchPuzzle);

function fetchPuzzle(puzzleService) {
	if (cliArgs.shortName && cliArgs.shortName != puzzleService.shortName) {
		return;
	}

	if (!['puz', 'amuselabs-json', 'usa-today-json', 'rss', 'scrape'].includes(puzzleService.strategy)) {
		return;
	}

	servicePromises.push(new Promise(function(resolve, reject) {
		try {
			fs.accessSync('puzzles/' + puzzleService.shortName + '-' + (puzzleService.date || Util.dateFormat(cliArgs.date, '%Y-%m-%d')) + '.puz');
			resolve();
			return;
		} catch (error) { }

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
			method: 'GET',
			headers: puzzleService.headers
		};

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
					body = body.replace(/&lt;/g, '<');
					body = body.replace(/&gt;/g, '>');
					body = body.replace(/&amp;/g, '&');
					body = body.replace(/&amp;/g, '&');
					body = body.replace(/&quot;/g, '"');

					let entryRegexp = /<(?:entry|item)>(.*?)<\/(?:entry|item)>/g;
					let entryMatch;
					let delay = 0;

					while ((entryMatch = entryRegexp.exec(body)) !== null) {
						let linkRegexp = /<a.*?href="(.*?)".*?>(.*?)<\/a>/g;
						let linkMatch;

						while ((linkMatch = linkRegexp.exec(entryMatch[1])) !== null) {
							if (linkMatch[2].match(/(^puz$)|(^PUZ$)|(\.puz)|( PUZ )|(<.*?>puz<.*?>)|(Across Lite)|(ACROSS LITE)/) && linkMatch[1].match(/(drive\.google\.com)|(\.puz)/)) {
								let entryDate = new Date();

								let dateRegexp = /<(?:pubDate|published)>(.*?)<\/(?:pubDate|published)>/;
								let dateMatch = dateRegexp.exec(entryMatch[1]);

								if (dateMatch[1]) {
									entryDate = new Date(dateMatch[1]);
								}

								let puzzleUrl = linkMatch[1];
								let puzzleGoogleMatch = puzzleUrl.match(/(?:https:\/\/drive\.google\.com\/open\?id=(.*))|(?:https:\/\/drive\.google\.com\/file\/d\/(.*)\/view.*)/);

								if (puzzleGoogleMatch) {
									puzzleUrl = 'https://drive.google.com/uc?export=download&id=' + (puzzleGoogleMatch[1] || puzzleGoogleMatch[2]);
								}
								else if (puzzleUrl.includes('https://www.dropbox.com/')) {
									puzzleUrl = puzzleUrl.replace('https://www.dropbox.com/', 'https://dl.dropbox.com/');
								}

								fetchPuzzle({
									shortName: puzzleService.shortName,
									url: puzzleUrl,
									date: Util.dateFormat(entryDate, '%Y-%m-%d'),
									strategy: 'puz',
									headers: puzzleService.headers
								});

								break; // only be willing to fetch one puzzle per post (for now)
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

				let useDate = puzzleService.date || Util.dateFormat(cliArgs.date, '%Y-%m-%d');

				console.log('\x1b[32m\u2713\x1b[0m ' + puzzleService.shortName + ': ' + puzzleService.shortName + '-' + useDate + '.puz');
				puzzle.writeToFile('puzzles/' + puzzleService.shortName + '-' + useDate + '.puz');

				let checksum = puzzle.checksumSignature();

				if (!puzzleDatabase.find(puzzleRecord => puzzleRecord._id == checksum)) {
					puzzleDatabase.push({
						_id: checksum,
						filename: puzzle.filename,
						title: puzzle.filename,
						author: puzzle.author,
						copyright: puzzle.copyright,
						date: useDate
					});
				}

				resolve();
			});
		});

		request.on('error', (error) => {
			console.error(error);
		});

		request.end();
	}));
}

Promise.all(servicePromises).then(() => {
	Util.saveJsonFile(path.resolve(__dirname, '../puzzles.json'), puzzleDatabase);
	process.exit();
});
