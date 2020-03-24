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

let timer = new Date();
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

	if (acrossIndex < 0) {
		acrossIndex = 0;
	}

	if (downIndex < 0) {
		downIndex = 0;
	}

	let clue, across;

	if (mode == 'across') {
		clue = puzzle.acrosses[acrossIndex];
		words = puzzle.getAcrossWord(clue.origin.x, clue.origin.y);
	}
	else if (mode == 'down') {
		clue = puzzle.downs[downIndex];
		words = puzzle.getDownWord(clue.origin.x, clue.origin.y);
	}

	console.log();
	puzzle.showSolverState(mode, clue, words);
	console.log();

	let query = "";

	query += words.guess + ' (' + words.answer.length + ') ' + "\n\n";
	query += clue.clue + "\n";
	query += "> ";

	rl.question(query, function(guess) {
		if (guess[0] == '!') {
			if (mode == 'across') {
				acrossIndex -= 1;
			}
			else if (mode == 'down') {
				downIndex -= 1;
			}
		}
		else if (guess[0] == '/') {
			if (guess.length > 1) {
				let jumpClueMatches = guess.substring(1).match(/(\d+)([AaDd])?/);
				let searchFor = mode;

				if (jumpClueMatches[2] && jumpClueMatches[2].toUpperCase() == 'A') {
					searchFor = 'across';
				}
				else if (jumpClueMatches[2] && jumpClueMatches[2].toUpperCase() == 'D') {
					searchFor = 'down';
				}

				if (jumpClueMatches[1]) {
					let found = false;

					if (searchFor == 'across') {
						for (let i = 0; i < puzzle.acrosses.length; i++) {
							if (puzzle.acrosses[i].clue.startsWith(jumpClueMatches[1] + '.')) {
								mode = 'across';
								acrossIndex = i;
								found = true;
							}
						}
					}
					else if (searchFor == 'down') {
						for (let i = 0; i < puzzle.downs.length; i++) {
							if (puzzle.downs[i].clue.startsWith(jumpClueMatches[1] + '.')) {
								mode = 'down';
								downIndex = i;
								found = true;
							}
						}
					}

					if (!found) {
						for (let i = 0; i < puzzle.acrosses.length; i++) {
							if (puzzle.acrosses[i].clue.startsWith(jumpClueMatches[1] + '.')) {
								mode = 'across';
								acrossIndex = i;
								found = true;
							}
						}
					}

					if (!found) {
						for (let i = 0; i < puzzle.downs.length; i++) {
							if (puzzle.downs[i].clue.startsWith(jumpClueMatches[1] + '.')) {
								mode = 'down';
								downIndex = i;
								found = true;
							}
						}
					}
				}
			}
		}
		else {
			if (mode == 'across') {
				acrossIndex += 1;
			}
			else if (mode == 'down') {
				downIndex += 1;
			}

			correctOrNot(mode, clue, guess);
		}

		nextClue(mode, Math.floor(Math.random() * puzzle.acrosses.length));
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

	if (puzzle.isComplete()) {
		timer = (new Date()) - timer;
		timer = Math.floor(timer / 1000);

		console.log();
		puzzle.showSolverState(mode, clue, words);
		console.log();
		console.log('Completed in ' + formatTimer(timer) + '!');
		process.exit();
	}
}

function formatTimer(timer) {
	let hours = Math.floor(timer / 3600);
	let minutes = Math.floor((timer - (3600 * hours)) / 60);
	let seconds = timer % 60;

	let formattedTimer = '';

	if (hours > 0) {
		formattedTimer += hours + ':';

		if (minutes < 10) {
			formattedTimer += '0';
		}
	}

	formattedTimer += minutes + ':';

	if (seconds < 10) {
		formattedTimer += '0';
	}

	formattedTimer += seconds;

	return formattedTimer;
}
