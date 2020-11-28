#!/usr/bin/env node

const CURSOR_POSITION = (x, y) => { return "\033[" + x + ";" + y + "H"; };
const CURSOR_LEFT = "\033[1D";
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

let puzzleOptions = {
	title: true,

	solverMode: {
		primary: 'title-screen',
		secondary: null,
		tertiary: null
	}
};

if (options.includes('--downs-only')) {
	puzzleOptions.downsOnly = true;
}

let lastLineCommand;

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(key) {
	if (puzzleOptions.solverMode.primary == 'title-screen') {
		switch (key) {
			case '\r':
				puzzleOptions.solverMode.primary = 'command';
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
	else if (puzzleOptions.solverMode.primary == 'command') {
		switch (key) {
			case '\r':
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'a':
			case 'o':
				if (puzzle.isComplete()) {
					break;
				}

				puzzle.moveCursor();
				puzzleOptions.solverMode.primary = 'insert';
				puzzleOptions.solverMode.secondary = 'blanks';
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
				if (puzzle.isComplete()) {
					break;
				}

				puzzleOptions.solverMode.primary = 'insert';
				puzzleOptions.solverMode.secondary = 'blanks';
				break;

			case 'I':
				if (puzzle.isComplete()) {
					break;
				}

				puzzleOptions.solverMode.primary = 'insert';
				puzzleOptions.solverMode.secondary = 'blanks';
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
				if (puzzle.isComplete()) {
					break;
				}

				puzzleOptions.solverMode.primary = 'insert';
				puzzleOptions.solverMode.secondary = 'one-character';
				break;

			case 'R':
				if (puzzle.isComplete()) {
					break;
				}

				puzzleOptions.solverMode.primary = 'insert';
				puzzleOptions.solverMode.secondary = 'overwrite';
				break;

			case 'w':
				puzzle.cursorToNextClue();
				puzzle.cursorToFirstBlank();
				break;

			case 'x':
				if (puzzle.isComplete()) {
					break;
				}

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
				puzzleOptions.solverMode.primary = 'last-line';
				lastLineCommand = ':';
				process.stdout.write(key);
				break;

			case '/':
				puzzleOptions.solverMode.primary = 'last-line';
				lastLineCommand = '/';
				process.stdout.write(key);
				break;

			case '*':
				puzzleOptions.solverMode.primary = 'last-line';
				puzzleOptions.solverMode.tertiary = 'command';
				lastLineCommand = '*';
				process.stdout.write(key);
				break;

			case ' ':
				puzzle.switchDirection();
				break;
		}
	}
	else if (puzzleOptions.solverMode.primary == 'insert') {
		if ('0123456789abcdefghijklmnopqrstuvwxyz-'.includes(key)) {
			puzzle.logGuess(key);

			if (puzzleOptions.solverMode.secondary == 'one-character') {
				puzzleOptions.solverMode.primary = 'command';
				puzzleOptions.solverMode.secondary = null;
			}
			else if (puzzleOptions.solverMode.secondary == 'overwrite') {
				puzzle.moveCursor(null, true, false, false);
			}
			else {
				puzzle.moveCursor(null, true, false, true);
			}
		}
		else if (key == '*') {
				puzzleOptions.solverMode.primary = 'last-line';
				puzzleOptions.solverMode.tertiary = 'insert';
				lastLineCommand = '*';
		}
		else if (key == '/') {
			if (puzzle.direction == 'across') {
				puzzle.dropAnchor(puzzle.cursor.x, puzzle.cursor.y, 'down' );
			}
			else if (puzzle.direction == 'down') {
				puzzle.dropAnchor(puzzle.cursor.x, puzzle.cursor.y, 'across' );
			}
		}
		else if (key == ' ') {
			puzzle.switchDirection();
		}
		else if (key == '\x07' || key == '\x1b') {
			// esc
			puzzleOptions.solverMode.primary = 'command';
			puzzle.removeAnchor();
		}
		else if (key == '\x7f') {
			// backspace
			puzzleOptions.solverMode.secondary = 'overwrite';
			puzzle.moveCursor(null, true, true);
			puzzle.logGuess('-');
		}
		else if (key == '\r') {
			// enter
			puzzleOptions.solverMode.primary = 'command';

			puzzle.weighAnchor();
			puzzle.cursorToFirstBlank();
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
		else if (key == 'W') {
			puzzle.cursorToNextClue();
			puzzle.cursorToFirstBlank();
		}
		else if (key == 'B') {
			puzzle.cursorToPreviousClue();
			puzzle.cursorToFirstBlank();
		}
		else if (key == 'R') {
			if (puzzleOptions.solverMode.secondary != 'overwrite') {
				puzzleOptions.solverMode.secondary = 'overwrite';
			}
			else {
				puzzleOptions.solverMode.secondary = null;
			}
		}
	}
	else if (puzzleOptions.solverMode.primary == 'last-line') {
		if (key == '\r') {
			puzzleOptions.solverMode.primary = 'command';

			if (lastLineCommand.startsWith('*')) {
				let rebus = lastLineCommand.substring(1);

				puzzleOptions.solverMode.primary = puzzleOptions.solverMode.tertiary; // this is a small abuse of the tertiary field but we want to return whence we came
				puzzleOptions.solverMode.tertiary = null;

				puzzle.logGuess(rebus);

				if (puzzleOptions.solverMode.secondary == 'one-character') {
					puzzleOptions.solverMode.primary = 'command';
					puzzleOptions.solverMode.secondary = null;
				}
				else if (puzzleOptions.solverMode.secondary == 'overwrite') {
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
		else if (key.charCodeAt(0) == 127) {
			lastLineCommand = lastLineCommand.substring(0, lastLineCommand.length - 1);
			process.stdout.write(CURSOR_LEFT);
			process.stdout.write(' ');
			process.stdout.write(CURSOR_LEFT);
		}
	}

	if (puzzleOptions.solverMode.primary != 'last-line') {
		if (puzzle.isComplete()) {
			if (puzzleOptions.solverMode.secondary != 'done') {
				timer = (new Date()) - timer;
				timer = Math.floor(timer / 1000);
				puzzle.tabulateStats();
			}

			puzzle.showSolverState(puzzleOptions);
			console.log();
			puzzle.showMinimaps();

			console.log();
			console.log('Completed in ' + Util.formatTimer(timer) + '!');

			puzzleOptions.solverMode.primary = 'command';
			puzzleOptions.solverMode.secondary = 'done';
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
