#!/usr/bin/env node

const CURSOR_POSITION = (x, y) => { return "\033[" + x + ";" + y + "H"; };
const CLEAR_SCREEN = "\033[2J";
const SAVE_CURSOR = "\033[s";
const RESTORE_CURSOR = "\033[u";

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let options = process.argv.filter(function(option) { return option.startsWith('--'); });
let nonOptions = process.argv.filter(function(option) { return !option.startsWith('--'); });

let puzFile;
let puzFilename = nonOptions[nonOptions.length - 1];

try {
	fs.accessSync(path.resolve('puzzles/', puzFilename));
} catch (error) {
	try {
		let puzFilenames = fs.readdirSync(path.resolve('./puzzles')).filter(filename => filename.length == puzFilename.length + 15 && filename.startsWith(puzFilename)).sort().reverse();
		puzFilename = puzFilenames[0];
	} catch (error) {
	}
}

let puzzle = new Puzzle();
puzzle.loadFromFile(path.resolve('puzzles/', puzFilename));

let index = 0;
let timer = null;

let solverMode = {
	primary: 'titleScreen',
	secondary: null
};

let downsOnly = false;

if (options.includes('--downs-only')) {
	downsOnly = true;
}

let nextCursor;

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(key) {
	if (key == '\x03') {
		process.exit();
	}
	else if (solverMode.primary == 'titleScreen') {
		switch (key) {
			case '\r':
				solverMode.primary = 'command';
				timer = new Date();
				nextClue(downsOnly ? 'down' : 'across');
				break;

			default:
				break;
		}
	}
	else if (solverMode.primary == 'command') {
		switch (key) {
			case '^': // jump to beginning of line
			case '$': // jump to end of line
			case 'I': // begin editing at beginning of line (or maybe first unfilled square?)
			case 'w': // jump to next answer
			case 'b': // jump to previous answer
				break;

			case '\r':
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'a':
				puzzle.moveCursor();
				solverMode.primary = 'insert';
				solverMode.secondary = 'blanks';
				break;

			case 'h':
			case '\u001b\u005b\u0044':
				puzzle.moveCursor('left');
				break;

			case 'i':
				solverMode.primary = 'insert';
				solverMode.secondary = 'blanks';
				break;

			case 'j':
			case '\u001b\u005b\u0042':
				puzzle.moveCursor('down');
				break;

			case 'k':
			case '\u001b\u005b\u0041':
				puzzle.moveCursor('up');
				break;

			case 'l':
			case '\u001b\u005b\u0043':
				puzzle.moveCursor('right');
				break;

			case 'r':
				solverMode.primary = 'insert';
				solverMode.secondary = 'one-character';
				break;

			case 'R':
				solverMode.primary = 'insert';
				solverMode.secondary = 'overwrite';
				break;

			case 'x':
				puzzle.logGuess('-');
				puzzle.moveCursor(null, true);
				break;

			case ':':
				solverMode.primary = 'last-line';
				process.stdout.write(':');
				lastLineCommand = '';
				break;

			case ' ':
				puzzle.switchDirection();
				break;
		}
	}
	else if (solverMode.primary == 'insert') {
		if ('abcdefghijklmnopqrstuvwxyz-'.includes(key)) {
			puzzle.logGuess(key);

			if (solverMode.secondary == 'one-character') {
				solverMode.primary = 'command';
				solverMode.secondary = null;
			}
			else if (solverMode.secondary == 'overwrite') {
				puzzle.moveCursor(null, true, false, false);
			}
			else {
				puzzle.moveCursor(null, true, false, true);
			}
		}
		else if (key == '/') {
			nextCursor = { x: puzzle.cursor.x, y: puzzle.cursor.y };
		}
		else if (key == ' ') {
			puzzle.switchDirection();
		}
		else if (key == '\x07' || key == '\x1b') {
			// esc
			solverMode.primary = 'command';
		}
		else if (key == '\x7f') {
			// backspace
			solverMode.secondary = 'overwrite';
			puzzle.moveCursor(null, true, true);
			puzzle.logGuess('-');
		}
		else if (key == '\r') {
			// enter
			solverMode.primary = 'command';

			if (nextCursor) {
				puzzle.moveCursorTo(nextCursor.x, nextCursor.y);
				puzzle.switchDirection();
				puzzle.cursorToFirstBlank();

				nextCursor = null;
			}
			else {
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
			}
		}
		else if (key == 'K' || key == '\u001b\u005b\u0041') {
			puzzle.moveCursor('up');
		}
		else if (key == 'J' || key == '\u001b\u005b\u0042') {
			puzzle.moveCursor('down');
		}
		else if (key == 'L' || key == '\u001b\u005b\u0043') {
			puzzle.moveCursor('right');
		}
		else if (key == 'H' || key == '\u001b\u005b\u0044') {
			puzzle.moveCursor('left');
		}
	}
	else if (solverMode.primary == 'last-line') {
		if (key == '\r') {
			solverMode.primary = 'command';

			if (lastLineCommand == 'reveal') {
				puzzle.reveal();
			}
			else if (lastLineCommand == 'check') {
				puzzle.check();
			}
		}
		else if ('abcdefghijklmnopqrstuvwxyz'.includes(key)) {
			lastLineCommand += key;
			process.stdout.write(key);
		}
	}

	if (solverMode.primary != 'last-line') {
		if (puzzle.isComplete()) {
			if (solverMode.secondary != 'done') {
				timer = (new Date()) - timer;
				timer = Math.floor(timer / 1000);
				puzzle.tabulateStats();
			}

			puzzle.showSolverState();
			console.log();
			puzzle.showMinimaps();

			console.log();
			console.log('Completed in ' + Util.formatTimer(timer) + '!');

			solverMode.primary = 'command';
			solverMode.secondary = 'done';
		}
		else {
			puzzle.showSolverState();
		}
	}
});

process.stdout.write(CLEAR_SCREEN);
process.stdout.write(CURSOR_POSITION(0, 0));
process.stdout.write(SAVE_CURSOR);

titleScreen();

function titleScreen() {
	process.stdout.write(RESTORE_CURSOR);
	puzzle.showSolverState('title');

	console.log();
	console.log();
	console.log();
	console.log();
	console.log();
	console.log();

	console.log('Press ENTER to begin.');
}

function nextClue(mode) {
	if (mode == 'across' && index >= puzzle.acrosses.length) {
		mode = 'down';
		index = 0;
	}
	else if (mode == 'down' && index >= puzzle.downs.length) {
		mode = 'across';
		index = 0;
	}

	if (mode == 'across' && index < 0) {
		mode = 'down';
		index = puzzle.downs.length - 1;
	}
	else if (mode == 'down' && index < 0) {
		mode = 'across';
		index = puzzle.acrosses.length - 1;
	}

	let clue, words;

	if (mode == 'across') {
		clue = puzzle.acrosses[index];
		words = puzzle.getAcrossWord(clue.origin.x, clue.origin.y);
	}
	else if (mode == 'down') {
		clue = puzzle.downs[index];
		words = puzzle.getDownWord(clue.origin.x, clue.origin.y);
	}

	process.stdout.write(RESTORE_CURSOR);
	puzzle.showSolverState(mode);
	console.log();

	let query = "";
	let clueIndentation = clue.clue.indexOf(' ') + 1;

	query += words.guess + ' (' + words.answer.length + ') ' + "\n\n";

	if (!downsOnly || mode == 'down') {
		query += Util.formatString(clue.clue, puzzle.width * 3, clueIndentation, 3) + "\n";
	}
	else {
		query += Util.formatString('', puzzle.width * 3, clueIndentation, 3) + "\n";
	}

	query += "> ";

	/*
	rl.question(query, function(input) {
		if (input == '/reveal') {
			puzzle.reveal();
		}
		else if (input == '/check') {
			puzzle.check();
		}
		else if (input[0] == '!') {
			index -= 1;
		}
		else if (input == '/exit') {
			process.exit();
		}
		else {
			let slashIndex = input.indexOf('/');
			let guess = input;

			if (slashIndex != -1) {
				guess = input.substring(0, slashIndex);
			}

			correctOrNot(mode, clue, guess, words);

			if (slashIndex != -1) {
				let jumpClueMatches = input.substring(slashIndex).match(/(\d+)([AaDd])?/);
				let searchFor = mode;

				if (!jumpClueMatches) {
					if (mode == 'across') {
						mode = 'down';
					}
					else if (mode == 'down') {
						mode = 'across';
					}
				}
				else {
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
									index = i;
									found = true;
								}
							}
						}
						else if (searchFor == 'down') {
							for (let i = 0; i < puzzle.downs.length; i++) {
								if (puzzle.downs[i].clue.startsWith(jumpClueMatches[1] + '.')) {
									mode = 'down';
									index = i;
									found = true;
								}
							}
						}

						if (!found) {
							for (let i = 0; i < puzzle.acrosses.length; i++) {
								if (puzzle.acrosses[i].clue.startsWith(jumpClueMatches[1] + '.')) {
									mode = 'across';
									index = i;
									found = true;
								}
							}
						}

						if (!found) {
							for (let i = 0; i < puzzle.downs.length; i++) {
								if (puzzle.downs[i].clue.startsWith(jumpClueMatches[1] + '.')) {
									mode = 'down';
									index = i;
									found = true;
								}
							}
						}
					}
				}
			}
			else {
				index += 1;
			}
		}

		nextClue(mode, Math.floor(Math.random() * puzzle.acrosses.length));
	});
	*/
}

function correctOrNot(mode, clue, guess, words) {
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
		puzzle.tabulateStats();

		process.stdout.write(RESTORE_CURSOR);
		puzzle.showSolverState(mode, clue, words);
		console.log();
		puzzle.showMinimaps();

		console.log();
		console.log('Completed in ' + Util.formatTimer(timer) + '!');

		process.exit();
	}
}
