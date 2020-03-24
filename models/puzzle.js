const BACKGROUND_BLACK = "\x1b[40m";
const BACKGROUND_BRIGHT_CYAN = "\x1b[106m";
const BACKGROUND_BRIGHT_WHITE = "\x1b[107m";
const FOREGROUND_BLACK = "\x1b[30m";
const FOREGROUND_CYAN = "\x1b[36m";
const FOREGROUND_WHITE = "\x1b[37m";
const FOREGROUND_GRAY = "\u001b[38;5;250m";
const RESET = "\x1b[0m";

function Puzzle(puzFile) {
	this.checksum = (puzFile[0x01] << 4) | puzFile[0x00];
	this.fileMagic = puzFile.slice(0x02, 0x0C + 1);

	if (this.fileMagic != 'ACROSS&DOWN') {
		console.error('Invalid puzzle file.');
		process.exit(1);
	}

	this.cibChecksum = (puzFile[0x0F] << 4) | puzFile[0x0E];
	this.maskedLowChecksum = puzFile[0x10] & puzFile[0x11] & puzFile[0x12] & puzFile[0x13];
	this.maskedHighChecksum = puzFile[0x14] & puzFile[0x15] & puzFile[0x16] & puzFile[0x17];

	this.versionString = String.fromCharCode(puzFile[0x18]) + String.fromCharCode(puzFile[0x19]) + String.fromCharCode(puzFile[0x1A]);
	this.reserved1C = (puzFile[0x1D] << 4) | puzFile[0x1C];
	this.scrambledChecksum = (puzFile[0x1F] << 4) | puzFile[0x1E];
	this.reserved20 = 0; // bytes from 0x20 to 0x2B; probably garbage
	this.width = puzFile[0x2C];
	this.height = puzFile[0x2D];
	this.numberOfClues = (puzFile[0x2F] << 4) | puzFile[0x2E];
	this.unknownBitmask = (puzFile[0x31] << 4) | puzFile[0x30];
	this.scrambledTag = (puzFile[0x33] << 4) | puzFile[0x32];

	this.answerGrid = [];
	this.solverGrid = [];

	for (let y = 0; y < this.height; y++) {
		this.answerGrid[y] = ""
		this.solverGrid[y] = ""

		for (let x = 0; x < this.width; x++) {
			this.answerGrid[y] += String.fromCharCode(puzFile[0x34 + x + (y * this.width)]);
			this.solverGrid[y] += String.fromCharCode(puzFile[0x34 + x + (y * this.width) + (this.width * this.height)]);
		}
	}

	let puzzleStateOffset = 0x34 + (2 * this.width * this.height);
	let stringIndex = puzzleStateOffset - 1;

	this.title = "";

	while (puzFile[++stringIndex] != 0x00) {
		this.title += String.fromCharCode(puzFile[stringIndex]);
	}

	this.author = "";

	while (puzFile[++stringIndex] != 0x00) {
		this.author += String.fromCharCode(puzFile[stringIndex]);
	}

	this.copyright = "";

	while (puzFile[++stringIndex] != 0x00) {
		this.copyright += String.fromCharCode(puzFile[stringIndex]);
	}

	let clues = [];

	for (let i = 0; i < this.numberOfClues; i++) {
		clues[i] = "";

		while (puzFile[++stringIndex] != 0x00) {
			clues[i] += String.fromCharCode(puzFile[stringIndex]);
		}
	}

	this.notes = "";

	while (puzFile[++stringIndex] != 0x00) {
		this.notes += String.fromCharCode(puzFile[stringIndex]);
	}

	this.acrosses = [];
	this.downs = [];

	let clueNumber = 1;

	for (let y = 0; y < this.height; y++) {
		for (let x = 0; x < this.width; x++) {
			let newClue = false;

			if (this.blackCellAt(x, y)) {
				continue;
			}

			if (this.needsAcrossNumber(x, y)) {
				let clue = clues.shift();
				this.acrosses.push({
					clue: clueNumber + '. ' + clue,
					origin: { x: x, y: y }
				});

				newClue = true;
			}

			if (this.needsDownNumber(x, y)) {
				let clue = clues.shift();
				this.downs.push({
					clue: clueNumber + '. ' + clue,
					origin: { x: x, y: y }
				});

				newClue = true;
			}

			if (newClue) {
				clueNumber++;
			}
		}
	}
}

Puzzle.prototype.blackCellAt = function(x, y) {
	return this.answerGrid[y][x] == '.';
}

Puzzle.prototype.needsAcrossNumber = function(x, y) {
	if (x == 0 || this.blackCellAt(x - 1, y)) {
		return true;
	}

	return false;
}

Puzzle.prototype.needsDownNumber = function(x, y) {
	if (y == 0 || this.blackCellAt(x, y - 1)) {
		return true;
	}

	return false;
}

Puzzle.prototype.getAcrossWord = function(x, y) {
	let solverWord = "";
	let answerWord = "";

	do {
		solverWord += this.solverGrid[y][x];
		answerWord += this.answerGrid[y][x];
		x++;
	} while (x < this.width && this.answerGrid[y][x] != '.');

	return { guess: solverWord, answer: answerWord };
}

Puzzle.prototype.getDownWord = function(x, y) {
	let solverWord = "";
	let answerWord = "";

	do {
		solverWord += this.solverGrid[y][x];
		answerWord += this.answerGrid[y][x];
		y++;
	} while (y < this.height && this.answerGrid[y][x] != '.');

	return { guess: solverWord, answer: answerWord };
}

Puzzle.prototype.logAcrossGuess = function(clue, guess) {
	for (let i = 0; i < guess.length; i++) {
		if (this.solverGrid[clue.origin.y][clue.origin.x + i] == '.' || clue.origin.x + i >= this.width) {
			break;
		}

		if (guess[i] == ' ') {
			continue;
		}

		this.solverGrid[clue.origin.y] = this.solverGrid[clue.origin.y].substring(0, clue.origin.x + i) + guess[i].toUpperCase() + this.solverGrid[clue.origin.y].substring(clue.origin.x + i + 1, this.solverGrid[clue.origin.y].length);
	}
};

Puzzle.prototype.logDownGuess = function(clue, guess) {
	for (let i = 0; i < guess.length; i++) {
		if (this.solverGrid[clue.origin.y + i][clue.origin.x] == '.' || clue.origin.y + i >= this.height) {
			break;
		}

		if (guess[i] == ' ') {
			continue;
		}

		this.solverGrid[clue.origin.y + i] = this.solverGrid[clue.origin.y + i].substring(0, clue.origin.x) + guess[i].toUpperCase() + this.solverGrid[clue.origin.y + i].substring(clue.origin.x + 1, this.solverGrid[clue.origin.y + i].length);
	}
};

Puzzle.prototype.showSolverState = function(mode, clue, words) {
	let colorLine1;
	let colorLine2;

	console.log(this.title);
	console.log(this.author);
	console.log(this.copyright);

	console.log();

	if (this.notes.length > 0) {
		console.log(this.notes);
		console.log();
	}

	let clues = 1;

	for (let y = 0; y < this.solverGrid.length; y++) {
		let outputLine1 = '';
		let outputLine2 = '';

		for (let x = 0; x < this.solverGrid[y].length; x++) {
			if (mode == 'across' && y == clue.origin.y && x >= clue.origin.x && x < clue.origin.x + words.answer.length) {
				colorLine1 = BACKGROUND_BRIGHT_CYAN + FOREGROUND_CYAN;
				colorLine2 = BACKGROUND_BRIGHT_CYAN + FOREGROUND_BLACK;
			}
			else if (mode == 'down' && x == clue.origin.x && y >= clue.origin.y && y < clue.origin.y + words.answer.length) {
				colorLine1 = BACKGROUND_BRIGHT_CYAN + FOREGROUND_CYAN;
				colorLine2 = BACKGROUND_BRIGHT_CYAN + FOREGROUND_BLACK;
			}
			else {
				colorLine1 = BACKGROUND_BRIGHT_WHITE + FOREGROUND_GRAY;
				colorLine2 = BACKGROUND_BRIGHT_WHITE + FOREGROUND_BLACK;
			}

			if (this.solverGrid[y][x] == '.') {
				outputLine1 += BACKGROUND_BLACK + FOREGROUND_WHITE + '   ' + RESET;
			}
			else if (this.needsAcrossNumber(x, y) || this.needsDownNumber(x, y)) {
				outputLine1 += colorLine1 + clues + (clues < 10 ? ' ' : '') + (clues < 100 ? ' ' : '') + RESET;
				clues++;
			}
			else {
				outputLine1 += colorLine1 + '   ' + RESET;
			}

			switch (this.solverGrid[y][x]) {
				case '.':
					outputLine2 += BACKGROUND_BLACK + '   ' + RESET;
					break;

				case '-':
					outputLine2 += colorLine2 + '   ' + RESET;
					break;

				default:
					outputLine2 += colorLine2 + ' ' + this.solverGrid[y][x] + ' ' + RESET;
					break;
			}
		}

		console.log(outputLine1);
		console.log(outputLine2);
	}
};

Puzzle.prototype.isComplete = function() {
	let solverGridString = this.solverGrid.join('');
	let answerGridString = this.answerGrid.join('');

	return solverGridString == answerGridString;
};

module.exports = Puzzle;
