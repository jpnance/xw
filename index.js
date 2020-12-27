#!/usr/bin/env node

const CURSOR_POSITION = (x, y) => { return "\033[" + x + ";" + y + "H"; };
const CURSOR_LEFT = "\033[1D";
const CURSOR_TO_BOTTOM = "\033[1000B";
const CLEAR_SCREEN = "\033[2J";
const SAVE_CURSOR = "\033[s";
const RESTORE_CURSOR = "\033[u";
const HIDE_CURSOR = "\033[?25l";
const SHOW_CURSOR = "\033[?25h";

const fs = require('fs');
const path = require('path');

const Util = require('./models/util');
const Grabber = require('./models/grabber');
const Puzzle = require('./models/puzzle');

let cliArgs = {
	date: new Date(),
	downsOnly: false,
	filename: null,
	shortName: null,
	strategy: null,
	url: null
};

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
	else if (argument == '--downs-only') {
		cliArgs.downsOnly = true;
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
	else {
		cliArgs.filename = argument;
	}
});

if (cliArgs.filename) {
	let puzzleService = Grabber.findService(cliArgs.filename);

	if (puzzleService) {
		puzzleService.date = cliArgs.date;

		Grabber.grabPuzzle(puzzleService).then(launchPuzzle).catch(displayError);
	}
	else if (cliArgs.filename.match(/https?:\/\//)) {
		Grabber.grabPuzzle({ url: cliArgs.filename, strategy: 'puz' }).then(launchPuzzle).catch(displayError);
	}
	else {
		let puzFilename = cliArgs.filename;

		try {
			fs.accessSync(puzFilename);
		} catch (error) {
			console.log(error);
			process.exit();
		}

		let puzzle = new Puzzle();

		puzzle.loadFromFile(puzFilename);
		launchPuzzle(puzzle);
	}
}

function launchPuzzle(puzzle) {
	let timer = null;

	let puzzleOptions = {
		downsOnly: false,
		title: true,

		solverMode: {
			primary: 'title-screen',
			secondary: null,
			tertiary: null
		}
	};

	puzzleOptions.downsOnly = cliArgs.downsOnly;

	let lastLineCommand;

	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', function(key) {
		if (puzzleOptions.solverMode.primary == 'title-screen') {
			switch (key) {
				case '\r':
					puzzleOptions.solverMode.primary = 'normal';
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
		else if (puzzleOptions.solverMode.primary == 'normal') {
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

				case '?':
					puzzle.markUnsure();
					break;

				case '^':
					puzzle.cursorToFirstSquare();
					break;

				case '$':
					puzzle.cursorToLastSquare();
					break;

				case ':':
					puzzleOptions.solverMode.primary = 'command';
					lastLineCommand = ':';
					process.stdout.write(CURSOR_TO_BOTTOM + SHOW_CURSOR + key);
					break;

				case '/':
					puzzleOptions.solverMode.primary = 'command';
					lastLineCommand = '/';
					process.stdout.write(CURSOR_TO_BOTTOM + SHOW_CURSOR + key);
					break;

				case '*':
					puzzleOptions.solverMode.primary = 'command';
					puzzleOptions.solverMode.tertiary = 'normal';
					lastLineCommand = '*';
					process.stdout.write(CURSOR_TO_BOTTOM + SHOW_CURSOR + key);
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
					puzzleOptions.solverMode.primary = 'normal';
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
					puzzleOptions.solverMode.primary = 'command';
					puzzleOptions.solverMode.tertiary = 'insert';
					lastLineCommand = '*';
			}
			else if (key == '?') {
				puzzle.markUnsure();
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
			else if (key == '\x07' || key == '\x1b' || key == '\x03') {
				// esc or ^C
				puzzleOptions.solverMode.primary = 'normal';
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
				puzzleOptions.solverMode.primary = 'normal';

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
			else if (key == '^') {
				puzzle.cursorToFirstSquare();
			}
			else if (key == '$') {
				puzzle.cursorToLastSquare();
			}
		}
		else if (puzzleOptions.solverMode.primary == 'command') {
			if (key == '\r') {
				puzzleOptions.solverMode.primary = 'normal';

				if (lastLineCommand.startsWith('*')) {
					let rebus = lastLineCommand.substring(1);

					if (rebus == '') {
						rebus = '-';
					}

					puzzleOptions.solverMode.primary = puzzleOptions.solverMode.tertiary; // this is a small abuse of the tertiary field but we want to return whence we came
					puzzleOptions.solverMode.tertiary = null;

					puzzle.logGuess(rebus);

					if (puzzleOptions.solverMode.secondary == 'one-character') {
						puzzleOptions.solverMode.primary = 'normal';
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
					quit();
				}
				else if (lastLineCommand == ':w') {
					puzzle.saveProgress();
				}
				else if (lastLineCommand == ':q') {
					quit();
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
			else if (key.charCodeAt(0) == 127 && lastLineCommand.length > 1) {
				lastLineCommand = lastLineCommand.substring(0, lastLineCommand.length - 1);
				process.stdout.write(CURSOR_LEFT);
				process.stdout.write(' ');
				process.stdout.write(CURSOR_LEFT);
			}
		}

		if (puzzleOptions.solverMode.primary != 'command') {
			process.stdout.write(HIDE_CURSOR);

			if (puzzle.isComplete()) {
				if (puzzleOptions.solverMode.secondary != 'done') {
					timer = (new Date()) - timer;
					timer = Math.floor(timer / 1000);
					puzzle.tabulateStats();
				}

				puzzle.showSolverState(puzzleOptions);
				console.log(Util.formatString(''));
				puzzle.showMinimaps(puzzleOptions);

				console.log(Util.formatString(''));
				console.log('Completed in ' + Util.formatTimer(timer) + '!');

				puzzleOptions.solverMode.primary = 'normal';
				puzzleOptions.solverMode.secondary = 'done';
			}
			else {
				puzzle.tabulateStats();
				puzzle.showSolverState(puzzleOptions);
				console.log(Util.formatString(''));
				puzzle.showMinimaps(puzzleOptions);
			}
		}
	});

	process.stdout.write(CLEAR_SCREEN);
	process.stdout.write(CURSOR_POSITION(0, 0));
	process.stdout.write(SAVE_CURSOR);
	process.stdout.write(HIDE_CURSOR);

	puzzle.showSolverState(puzzleOptions);
	puzzle.showMinimaps(puzzleOptions);
}

function displayError(error) {
	console.log(error);
}

function quit() {
	console.log(Util.formatString(''));
	process.exit();
}
