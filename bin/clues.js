const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const Puzzle = require('../models/puzzle');

let puzFile = fs.readFileSync(path.resolve(process.argv[2]));
let puzzle = new Puzzle(puzFile);

let acrossIndex = 0;
let downIndex = 0;

nextClue('across');

function nextClue(mode) {
	if (acrossIndex >= puzzle.acrosses.length) {
		mode = 'down';
		acrossIndex = 0;
	}

	if (downIndex >= puzzle.downs.length) {
		mode = 'across';
		downIndex = 0;
	}

	let clue, across;

	if (mode == 'across') {
		clue = puzzle.acrosses[acrossIndex++];
		words = puzzle.getAcrossWord(clue.origin.x, clue.origin.y);
	}
	else if (mode == 'down') {
		clue = puzzle.downs[downIndex++];
		words = puzzle.getDownWord(clue.origin.x, clue.origin.y);
	}

	console.log();
	puzzle.showSolverState(mode, clue, words);
	console.log();

	let query = "";

	query += words.guess + ' (' + words.answer.length + ' letters) ' + "\n\n";
	query += clue.clue + "\n";
	query += "> ";

	rl.question(query, function(guess) {
		correctOrNot(mode, clue, guess);
	});
}

function correctOrNot(mode, clue, guess) {
	if (guess.length > 0) {
		if (mode == 'across') {
			puzzle.logAcrossGuess(clue, guess);
		}
		else if (mode == 'down') {
			puzzle.logDownGuess(clue, guess);
		}
	}

	nextClue(mode, Math.floor(Math.random() * puzzle.acrosses.length));
}
