// open database
// list all puz files
// for each puz file
	// check if it exists in the database already
	// if not, add it

const fs = require('fs');
const path = require('path');

const Puzzle = require('../models/puzzle');
const Util = require('../models/util');

let files = fs.readdirSync(path.resolve('puzzles/'));
let puzzleDatabase = Util.openJsonFile(path.resolve(__dirname, '../puzzles.json'));

files.forEach(filename => {
	if (!filename.endsWith('.puz')) {
		return;
	}

	let filenameMatch = filename.match(/(.*)-(\d\d\d\d-\d\d-\d\d)\.puz/);

	if (filenameMatch) {
		let shortName = filenameMatch[1];
		let date = filenameMatch[2];

		let puzzle = new Puzzle();
		puzzle.loadFromFile(path.resolve('puzzles/', filename));

		let checksum = puzzle.checksumSignature();

		if (!puzzleDatabase.find(puzzleRecord => puzzleRecord._id == checksum)) {
			puzzleDatabase.push({
				_id: checksum,
				filename: filename,
				title: puzzle.filename,
				author: puzzle.author,
				copyright: puzzle.copyright,
				date: date
			});
		}
	}
});

Util.saveJsonFile(path.resolve(__dirname, '../puzzles.json'), puzzleDatabase);
