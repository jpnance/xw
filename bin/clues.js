#!/usr/bin/env node

const CURSOR_POSITION = (x, y) => { return "\033[" + x + ";" + y + "H"; };
const CLEAR_SCREEN = "\033[2J";
const SAVE_CURSOR = "\033[s";
const RESTORE_CURSOR = "\033[u";

const fs = require('fs');
const path = require('path');

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

let timer = null;

let solverMode = {
	primary: 'title-screen',
	secondary: null,
	tertiary: null
};

let puzzleOptions = { title: true };

if (options.includes('--downs-only')) {
	puzzleOptions.downsOnly = true;
}

let anchor;
let lastLineCommand;

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(key) {
	if (solverMode.primary == 'title-screen') {
		switch (key) {
			case '\r':
				solverMode.primary = 'command';
				timer = new Date();

				if (puzzleOptions.downsOnly) {
					puzzle.switchDirection();
				}

				puzzleOptions.title = false;

				break;

			default:
				break;
		}
	}
	else if (solverMode.primary == 'command') {
		switch (key) {
			case '\r':
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'a':
			case 'o':
				puzzle.moveCursor();
				solverMode.primary = 'insert';
				solverMode.secondary = 'blanks';
				break;

			case 'b':
				puzzle.cursorToPreviousClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'h':
			case '\u001b\u005b\u0044':
				puzzle.moveCursor('left');
				break;

			case 'i':
				solverMode.primary = 'insert';
				solverMode.secondary = 'blanks';
				break;

			case 'I':
				solverMode.primary = 'insert';
				solverMode.secondary = 'blanks';
				puzzle.cursorToFirstBlank();
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

			case 'w':
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'x':
				puzzle.logGuess('-');
				puzzle.moveCursor(null, true);
				break;

			case '^':
				puzzle.cursorToFirstSquare();
				break;

			case '$':
				puzzle.cursorToLastSquare();
				break;

			case ':':
				solverMode.primary = 'last-line';
				lastLineCommand = ':';
				process.stdout.write(key);
				break;

			case '/':
				solverMode.primary = 'last-line';
				lastLineCommand = '/';
				process.stdout.write(key);
				break;

			case '*':
				solverMode.primary = 'last-line';
				solverMode.tertiary = 'command';
				lastLineCommand = '*';
				process.stdout.write(key);
				break;

			case ' ':
				puzzle.switchDirection();
				break;
		}
	}
	else if (solverMode.primary == 'insert') {
		if ('0123456789abcdefghijklmnopqrstuvwxyz-'.includes(key)) {
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
		else if (key == '*') {
				solverMode.primary = 'last-line';
				solverMode.tertiary = 'insert';
				lastLineCommand = '*';
		}
		else if (key == '/') {
			anchor = { x: puzzle.cursor.x, y: puzzle.cursor.y };

			if (puzzle.direction == 'across') {
				anchor.direction = 'down';
			}
			else if (puzzle.direction == 'down') {
				anchor.directino = 'across';
			}
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

			if (anchor) {
				puzzle.moveCursorTo(anchor.x, anchor.y);
				puzzle.switchDirection(anchor.direction);
				puzzle.cursorToFirstBlank();

				anchor = null;
			}
			else {
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

			if (lastLineCommand.startsWith('*')) {
				let rebus = lastLineCommand.substring(1);

				solverMode.primary = solverMode.tertiary; // this is a small abuse of the tertiary field but we want to return whence we came
				solverMode.tertiary = null;

				puzzle.logGuess(rebus);

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
			else if (lastLineCommand == ':x') {
				puzzle.saveProgress();
				process.exit();
			}
			else if (lastLineCommand == ':w') {
				puzzle.saveProgress();
			}
			else if (lastLineCommand == ':q') {
				process.exit();
			}
			else if (lastLineCommand == ':reveal') {
				puzzle.reveal();
			}
			else if (lastLineCommand == ':check') {
				puzzle.check();
			}
			else {
				let lastLineMatch = lastLineCommand.match(/\/(\d\d?\d?)(a|d)?/);

				if (lastLineMatch) {
					let number = lastLineMatch[1];
					let direction = null;

					if (lastLineMatch[2] && lastLineMatch[2].toLowerCase() == 'a') {
						direction = 'across';
					}
					else if (lastLineMatch[2] && lastLineMatch[2].toLowerCase() == 'd') {
						direction = 'down';
					}

					puzzle.cursorToClue(number, direction);
					puzzle.cursorToFirstBlank();
				}
			}
		}
		else if ('0123456789abcdefghijklmnopqrstuvwxyz'.includes(key)) {
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

			puzzle.showSolverState(puzzleOptions);
			console.log();
			puzzle.showMinimaps();

			console.log();
			console.log('Completed in ' + Util.formatTimer(timer) + '!');

			solverMode.primary = 'command';
			solverMode.secondary = 'done';
		}
		else {
			puzzle.showSolverState(puzzleOptions);
		}
	}
});

process.stdout.write(CLEAR_SCREEN);
process.stdout.write(CURSOR_POSITION(0, 0));
process.stdout.write(SAVE_CURSOR);

puzzle.showSolverState(puzzleOptions);
