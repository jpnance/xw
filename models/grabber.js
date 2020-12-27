const { http, https } = require('follow-redirects');
const fs = require('fs');
const path = require('path');

const Util = require('./util');
const Puzzle = require('./puzzle');

const configFilename = path.resolve(process.env.HOME, '.xw.conf');

let configFile;

try {
	fs.accessSync(path.resolve(configFilename), fs.constants.R_OK);
	configFile = JSON.parse(fs.readFileSync(path.resolve(configFilename)));

	if (configFile.nytCookie) {
		process.env.NYT_COOKIE = configFile.nytCookie;
	}
} catch (error) {
}

let puzzleServices = [
	// puz files
	{
		shortName: 'nyt',
		url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/#DATE#.puz',
		dateFormat: '%b%d%y',
		strategy: 'puz',
		headers: {
			'Cookie': configFile && configFile.nytCookie ? configFile.nytCookie : ''
		}
	},
	/*
	{
		shortName: 'nyt-variety',
		url: 'https://www.nytimes.com/svc/crosswords/v2/puzzle/' + Util.dateFormat(cliArgs.date, '%b%d%y') + '.2.puz', // nyt-variety
		strategy: 'puz',
		headers: {
			'Cookie': process.env.NYT_COOKIE
		}
	},
	*/
	{
		shortName: 'wsj',
		url: 'http://herbach.dnsalias.com/wsj/wsj#DATE#.puz',
		dateFormat: '%y%m%d',
		strategy: 'puz'
	},
	{
		shortName: 'universal',
		url: 'http://herbach.dnsalias.com/uc/uc#DATE#.puz',
		dateFormat: '%y%m%d',
		strategy: 'puz'
	},

	// amuselabs json
	{
		shortName: 'lat',
		parameters: {
			id: 'tca#DATE#',
			set: 'latimes'
		},
		dateFormat: '%y%m%d',
		url: 'https://cdn4.amuselabs.com/lat/crossword',
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'lat-mini',
		parameters: {
			id: 'latimes-mini-#DATE#',
			set: 'latimes-mini'
		},
		dateFormat: '%Y%m%d',
		url: 'https://cdn4.amuselabs.com/lat/crossword',
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'wapo-sunday',
		parameters: {
			id: 'ebirnholz_#DATE#',
			set: 'wapo-eb'
		},
		dateFormat: '%y%m%d',
		url: 'https://cdn1.amuselabs.com/wapo/crossword',
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'newsday',
		parameters: {
			id: 'Creators_WEB_#DATE#',
			set: 'creatorsweb'
		},
		dateFormat: '%Y%m%d',
		url: 'https://cdn2.amuselabs.com/pmm/crossword', // newsday
		strategy: 'amuselabs-json'
	},
	{
		shortName: 'atlantic',
		parameters: {
			id: 'atlantic_#DATE#',
			set: 'atlantic'
		},
		dateFormat: '%Y%m%d',
		url: 'https://cdn3.amuselabs.com/atlantic/crossword', // atlantic
		strategy: 'amuselabs-json'
	},
	/*
	{
		shortName: 'vox',
		parameters: {
			id: 'PBvox_' + Util.dateFormat(cliArgs.date, '%Y%m%d') + '_1000',
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
	*/
	{
		shortName: 'new-yorker',
		url: 'https://www.newyorker.com/puzzles-and-games-dept/crossword/#DATE#',
		dateFormat: '%Y/%m/%d',
		regExp: /https?:\/\/cdn\d.amuselabs.com\/tny\/crossword.*?set=tny-weekly/,
		strategy: 'scrape',
		postScrapeStrategy: 'amuselabs-json'
	},
	/*

	// amuselabs widget
	{
		shortName: 'daily-beast',
		parameters: {
			set: 'tdb'
		},
		url: 'https://cdn3.amuselabs.com/tdb/date-picker',
		nextUrl: 'https://cdn3.amuselabs.com/tdb/crossword',
		strategy: 'amuselabs-widget'
	},
	*/

	// jsonp
	{
		shortName: 'usa-today',
		url: 'https://gamedata.services.amuniversal.com/c/uupuz/l/U2FsdGVkX18CR3EauHsCV8JgqcLh1ptpjBeQ%2Bnjkzhu8zNO00WYK6b%2BaiZHnKcAD%0A9vwtmWJp2uHE9XU1bRw2gA%3D%3D/g/usaon/d/#DATE#/data.json',
		dateFormat: '%Y-%m-%d',
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
		url: 'https://datalexic.com/feed/',
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
	},
	{
		shortName: 'southern-crosswords',
		url: 'https://southerncrosswords.blogspot.com/feeds/posts/default',
		strategy: 'rss'
	}
];

let findService = function(shortName) {
	return puzzleServices.find(puzzleService => { return puzzleService.shortName == shortName; });
};

let grabPuzzle = function(puzzleService) {
	return new Promise(function(resolve, reject) {
		if (!['puz', 'amuselabs-json', 'amuselabs-widget', 'usa-today-json', 'rss', 'scrape'].includes(puzzleService.strategy)) {
			return;
		}

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

		if (puzzleService.dateFormat) {
			path = path.replace(/#DATE#/, Util.dateFormat(puzzleService.date, puzzleService.dateFormat));
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
				reject({ status: response.statusCode, puzzleService: puzzleService });
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
						reject({ status: response.statusCode, puzzleService: puzzleService });
						return;
					}

					puzzle.loadFromAmuseLabsJson(JSON.parse(Buffer.from(encodedPuzzle[1], 'base64').toString('utf-8')));
				}
				else if (puzzleService.strategy == 'amuselabs-widget') {
					body = body.replace(/\r\n/g, '');
					body = body.replace(/\n/g, '');
					body = body.replace(/&lt;/g, '<');
					body = body.replace(/&gt;/g, '>');
					body = body.replace(/&amp;/g, '&');
					body = body.replace(/&amp;/g, '&');
					body = body.replace(/&quot;/g, '"');

					let puzzleIdRegexp = /<li data-id="(.*?)".*?>(.*?)<\/li>/g;
					let puzzleIdMatch;

					while ((puzzleIdMatch = puzzleIdRegexp.exec(body)) !== null) {
						let dateRegexp = /<strong>(.*?)<\/strong>/;
						let dateMatch;

						dateMatch = dateRegexp.exec(puzzleIdMatch[0]);

						fetchPuzzle({
							shortName: puzzleService.shortName,
							parameters: {
								id: puzzleIdMatch[1],
								set: puzzleService.parameters.set
							},
							url: puzzleService.nextUrl,
							date: Util.dateFormat(new Date(dateMatch[1]), '%Y-%m-%d'),
							strategy: 'amuselabs-json'
						});
					}

					return;
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

					while ((entryMatch = entryRegexp.exec(body)) !== null) {
						let linkRegexp = /<a.*?href="(.*?)".*?>(.*?)<\/a>/g;
						let linkMatch;

						while ((linkMatch = linkRegexp.exec(entryMatch[1])) !== null) {
							if (linkMatch[2].match(/(^puz$)|(^PUZ$)|(\.puz)|( PUZ )|(<.*?>puz<.*?>)|(download puz)|(Across Lite)|(ACROSS LITE)/) && linkMatch[1].match(/(drive\.google\.com)|(\.puz)/)) {
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

								grabPuzzle({
									shortName: puzzleService.shortName,
									url: puzzleUrl,
									date: Util.dateFormat(entryDate, '%Y-%m-%d'),
									strategy: 'puz',
									headers: puzzleService.headers
								}).then(function(puzzle) {
									resolve(puzzle);
								});

								return; // only be willing to fetch one puzzle per post per feed
							}
						}
					}

					return;
				}
				else if (puzzleService.strategy == 'scrape') {
					let urlMatch = body.match(puzzleService.regExp);

					grabPuzzle({
						shortName: puzzleService.shortName,
						url: urlMatch[0],
						strategy: puzzleService.postScrapeStrategy
					}).then(function(puzzle) {
						resolve(puzzle);
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

				resolve(puzzle);
			});
		});

		request.on('error', (error) => {
			console.error(error);
		});

		request.end();
	});
};

module.exports.findService = findService;
module.exports.grabPuzzle = grabPuzzle;
