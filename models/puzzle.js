const BACKGROUND_BLACK = "\033[48;5;0m";
const BACKGROUND_PALE_TURQUOISE = "\033[48;5;159m";
const BACKGROUND_DARK_SLATE_GRAY = "\033[48;5;87m";
const BACKGROUND_WHITE = "\033[48;5;15m";
const BACKGROUND_LIGHT_PINK = "\033[48;5;217m";
const BACKGROUND_MISTY_ROSE = "\033[48;5;224m";
const BACKGROUND_GRAY_93 = "\033[48;5;255m";
const FOREGROUND_BLACK = "\033[38;5;0m";
const FOREGROUND_TEAL = "\033[38;5;6m";
const FOREGROUND_WHITE = "\033[38;5;15m";
const FOREGROUND_DARK_ORANGE = "\033[38;5;208m";
const FOREGROUND_GRAY_74 = "\033[38;5;250m";
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

	this.grid = [];

	for (let y = 0; y < this.height; y++) {
		this.grid[y] = [];

		for (let x = 0; x < this.width; x++) {
			this.grid[y][x] = {
				answer: String.fromCharCode(puzFile[0x34 + x + (y * this.width)]),
				guess: String.fromCharCode(puzFile[0x34 + x + (y * this.width) + (this.width * this.height)])
			};
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

	stringIndex++;

	while (puzFile[stringIndex]) {
		let sectionName = String.fromCharCode(puzFile[stringIndex]) + String.fromCharCode(puzFile[stringIndex + 1]) + String.fromCharCode(puzFile[stringIndex + 2]) + String.fromCharCode(puzFile[stringIndex + 3]);
		stringIndex += 4;

		let sectionLength = (puzFile[stringIndex + 1] << 4) | puzFile[stringIndex];

		stringIndex += 2;

		let sectionChecksum = (puzFile[stringIndex + 1] << 4) | puzFile[stringIndex];

		stringIndex += 2;

		if (sectionName == 'GEXT') {
			for (let i = 0; i < sectionLength; i++) {
				if (puzFile[stringIndex + i] == 0x80) {
					for (let y = 0; y < this.grid.length; y++) {
						for (let x = 0; x < this.grid[y].length; x++) {
							if ((x + (y * this.width)) == i) {
								this.grid[y][x].circled = true;
							}
						}
					}
				}
			}

			stringIndex += sectionLength + 1;
		}

		if (sectionName == 'GRBS') {
			for (let i = 0; i < sectionLength; i++) {
				if (puzFile[stringIndex + i] != 0x00) {
					let rebusId = puzFile[stringIndex + i] - 1;

					for (let y = 0; y < this.grid.length; y++) {
						for (let x = 0; x < this.grid[y].length; x++) {
							if ((x + (y * this.width)) == i) {
								if (!this.grid[y][x].rebus) {
									this.grid[y][x].rebus = {};
								}

								this.grid[y][x].rebus.id = rebusId;
							}
						}
					}
				}
			}

			stringIndex += sectionLength + 1;
		}

		if (sectionName == 'RTBL') {
			let gridIndex = 0;
			let rawRebuses = '';
			let rebuses = [];

			for (let i = 0; i < sectionLength; i++) {
				rawRebuses += String.fromCharCode(puzFile[stringIndex + i]);
			}

			rawRebuses.split(/;/).forEach(function(rawRebus) {
				if (rawRebus.length) {
					let splitRebus = rawRebus.split(/:/);
					let rebusId = parseInt(splitRebus[0]);
					let rebusText = splitRebus[1];

					rebuses.push({ id: rebusId, text: rebusText });
				}
			});

			for (let y = 0; y < this.grid.length; y++) {
				for (let x = 0; x < this.grid[y].length; x++) {
					if (this.grid[y][x].rebus) {
						for (let i = 0; i < rebuses.length; i++) {
							let rebus = rebuses[i];

							if (this.grid[y][x].rebus.id == rebus.id) {
								this.grid[y][x].rebus.text = rebus.text;
								this.grid[y][x].answer = rebus.text.toUpperCase();
							}
						};
					}
				}
			}

			stringIndex += sectionLength;
		}
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

	this.guessCount = 0;
}

Puzzle.prototype.blackCellAt = function(x, y) {
	return this.grid[y][x].answer == '.';
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
		if (this.grid[y][x].guess.length > 1) {
			solverWord += '[' + this.grid[y][x].guess + ']';
		}
		else {
			solverWord += this.grid[y][x].guess;
		}

		answerWord += this.grid[y][x].answer[0];
		x++;
	} while (x < this.width && this.grid[y][x].answer != '.');

	return { guess: solverWord, answer: answerWord };
}

Puzzle.prototype.getDownWord = function(x, y) {
	let solverWord = "";
	let answerWord = "";

	do {
		if (this.grid[y][x].guess.length > 1) {
			solverWord += '[' + this.grid[y][x].guess + ']';
		}
		else {
			solverWord += this.grid[y][x].guess;
		}

		answerWord += this.grid[y][x].answer[0];
		y++;
	} while (y < this.height && this.grid[y][x].answer != '.');

	return { guess: solverWord, answer: answerWord };
}

Puzzle.prototype.logAcrossGuess = function(clue, guess) {
	let wordIndex = 0;
	let openRebus = false;
	let rebusGuess = '';

	for (let i = 0; i < guess.length; i++) {
		if (guess[i] != '?' && guess[i] != '!' && (clue.origin.x + wordIndex >= this.width || this.grid[clue.origin.y][clue.origin.x + wordIndex].guess == '.')) {
			break;
		}

		if (guess[i] == ' ') {
			continue;
		}

		if (guess[i] == '?') {
			this.grid[clue.origin.y][clue.origin.x + wordIndex - 1].unsure = true;
			continue;
		}

		if (guess[i] == '!') {
			delete this.grid[clue.origin.y][clue.origin.x + wordIndex - 1].unsure;
			continue;
		}

		if (guess[i] == '[') {
			openRebus = true;
			continue;
		}

		if (guess[i] == ']') {
			if (this.grid[clue.origin.y][clue.origin.x + wordIndex].guess != rebusGuess) {
				this.grid[clue.origin.y][clue.origin.x + wordIndex].order = ++(this.guessCount);
				this.grid[clue.origin.y][clue.origin.x + wordIndex].guess = rebusGuess;
			}

			openRebus = false;
			rebusGuess = '';

			wordIndex++;

			continue;
		}

		if (openRebus) {
			rebusGuess += guess[i].toUpperCase();
			continue;
		}

		if (this.grid[clue.origin.y][clue.origin.x + wordIndex].guess != guess[i].toUpperCase()) {
			this.grid[clue.origin.y][clue.origin.x + wordIndex].order = ++(this.guessCount);
			this.grid[clue.origin.y][clue.origin.x + wordIndex].guess = guess[i].toUpperCase();
		}

		wordIndex++;
	}
};

Puzzle.prototype.logDownGuess = function(clue, guess) {
	let wordIndex = 0;
	let openRebus = false;
	let rebusGuess = '';

	for (let i = 0; i < guess.length; i++) {
		if (guess[i] != '?' && guess[i] != '!' && (clue.origin.y + wordIndex >= this.height || this.grid[clue.origin.y + wordIndex][clue.origin.x].guess == '.')) {
			break;
		}

		if (guess[i] == ' ') {
			continue;
		}

		if (guess[i] == '?') {
			this.grid[clue.origin.y + wordIndex - 1][clue.origin.x].unsure = true;
			continue;
		}

		if (guess[i] == '!') {
			delete this.grid[clue.origin.y + wordIndex][clue.origin.x].unsure;
			continue;
		}

		if (guess[i] == '[') {
			openRebus = true;
			continue;
		}

		if (guess[i] == ']') {
			if (this.grid[clue.origin.y + wordIndex][clue.origin.x].guess != rebusGuess) {
				this.grid[clue.origin.y + wordIndex][clue.origin.x].order = ++(this.guessCount);
				this.grid[clue.origin.y + wordIndex][clue.origin.x].guess = rebusGuess;
			}

			openRebus = false;
			rebusGuess = '';

			wordIndex++;

			continue;
		}

		if (openRebus) {
			rebusGuess += guess[i].toUpperCase();
			continue;
		}

		if (this.grid[clue.origin.y + wordIndex][clue.origin.x].guess != guess[i].toUpperCase()) {
			this.grid[clue.origin.y + wordIndex][clue.origin.x].order = ++(this.guessCount);
			this.grid[clue.origin.y + wordIndex][clue.origin.x].guess = guess[i].toUpperCase();
		}

		wordIndex++;
	}
};

Puzzle.prototype.showSolverState = function(mode, clue, words, finalize) {
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

	if (finalize) {
		let guessOrders = [];

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].answer != '.') {
					guessOrders.push(this.grid[y][x].order);
				}
			}
		}

		guessOrders.sort(function(a, b) {
			let aInt = parseInt(a);
			let bInt = parseInt(b);

			if (aInt < bInt) {
				return -1;
			}
			else if (aInt > bInt) {
				return 1;
			}
			else {
				return 0;
			}
		});

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].answer != '.') {
					this.grid[y][x].percentile = guessOrders.indexOf(this.grid[y][x].order) / guessOrders.length;
				}
			}
		}
	}

	let clues = 1;

	for (let y = 0; y < this.grid.length; y++) {
		let outputLine1 = '';
		let outputLine2 = '';

		for (let x = 0; x < this.grid[y].length; x++) {
			if (!finalize && mode == 'across' && y == clue.origin.y && x >= clue.origin.x && x < clue.origin.x + words.answer.length) {
				if (this.grid[y][x].circled) {
					colorLine1 = BACKGROUND_DARK_SLATE_GRAY + FOREGROUND_TEAL;
					colorLine2 = BACKGROUND_DARK_SLATE_GRAY + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
				else {
					colorLine1 = BACKGROUND_PALE_TURQUOISE + FOREGROUND_TEAL;
					colorLine2 = BACKGROUND_PALE_TURQUOISE + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
			}
			else if (!finalize && mode == 'down' && x == clue.origin.x && y >= clue.origin.y && y < clue.origin.y + words.answer.length) {
				if (this.grid[y][x].circled) {
					colorLine1 = BACKGROUND_DARK_SLATE_GRAY + FOREGROUND_TEAL;
					colorLine2 = BACKGROUND_DARK_SLATE_GRAY + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
				else {
					colorLine1 = BACKGROUND_PALE_TURQUOISE + FOREGROUND_TEAL;
					colorLine2 = BACKGROUND_PALE_TURQUOISE + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
			}
			else {
				if (this.grid[y][x].circled) {
					colorLine1 = BACKGROUND_GRAY_93 + FOREGROUND_GRAY_74;
					colorLine2 = BACKGROUND_GRAY_93 + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
				else if (finalize) {
					if (this.grid[y][x].percentile < 0.5) {
						colorLine1 = BACKGROUND_WHITE;
						colorLine2 = BACKGROUND_WHITE;
					}
					else if (this.grid[y][x].percentile < 0.9) {
						colorLine1 = BACKGROUND_MISTY_ROSE;
						colorLine2 = BACKGROUND_MISTY_ROSE;
					}
					else {
						colorLine1 = BACKGROUND_LIGHT_PINK;
						colorLine2 = BACKGROUND_LIGHT_PINK;
					}

					colorLine1 += FOREGROUND_GRAY_74;
					colorLine2 += (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
				else {
					colorLine1 = BACKGROUND_WHITE + FOREGROUND_GRAY_74;
					colorLine2 = BACKGROUND_WHITE + (this.grid[y][x].unsure ? FOREGROUND_DARK_ORANGE : FOREGROUND_BLACK);
				}
			}

			if (this.grid[y][x].guess == '.') {
				outputLine1 += BACKGROUND_BLACK + FOREGROUND_WHITE + '   ' + RESET;
			}
			else if (this.needsAcrossNumber(x, y) || this.needsDownNumber(x, y)) {
				outputLine1 += colorLine1 + clues + (clues < 10 ? ' ' : '') + (clues < 100 ? ' ' : '') + RESET;
				clues++;
			}
			else {
				outputLine1 += colorLine1 + '   ' + RESET;
			}

			if (this.grid[y][x].guess.length > 1) {
				outputLine2 += colorLine2 + ' * ' + RESET;
			}
			else {
				switch (this.grid[y][x].guess) {
					case '.':
						outputLine2 += BACKGROUND_BLACK + '   ' + RESET;
						break;

					case '-':
						outputLine2 += colorLine2 + '   ' + RESET;
						break;

					default:
						outputLine2 += colorLine2 + ' ' + this.grid[y][x].guess + ' ' + RESET;
						break;
				}
			}
		}

		console.log(outputLine1);
		console.log(outputLine2);
	}
};

Puzzle.prototype.isComplete = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].guess != this.grid[y][x].answer) {
				return false;
			}
		}
	}

	return true;
};

Puzzle.prototype.fillIn = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].guess != this.grid[y][x].answer && Math.random() < 0.50) {
				this.grid[y][x].guess = this.grid[y][x].answer;
				this.grid[y][x].order = ++(this.guessCount);
			}
		}
	}
};
module.exports = Puzzle;
