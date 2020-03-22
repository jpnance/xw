function Puzzle(puzFile) {
	this.checksum = (puzFile[0x01] << 4) | puzFile[0x00];
	this.fileMagic = puzFile.slice(0x02, 0x0C + 1);

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
	let stringIndex = puzzleStateOffset + 1;

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
					clue: clueNumber + '. ' + clue
				});

				newClue = true;
			}

			if (this.needsDownNumber(x, y)) {
				let clue = clues.shift();
				this.downs.push({
					clue: clueNumber + '. ' + clue
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
		solverWord += this.solverGrid[y][x++];
		answerWord += this.answerGrid[y][x++];
	} while (x < this.width && this.answerGrid[y][x] != '.');

	return { guess: solverWord, answer: answerWord };
}

Puzzle.prototype.getDownWord = function(x, y) {
	let solverWord = "";
	let answerWord = "";

	do {
		solverWord += this.solverGrid[y++][x];
		answerWord += this.answerGrid[y++][x];
	} while (y < this.height && this.answerGrid[y][x] != '.');

	return { guess: solverWord, answer: answerWord };
}

module.exports = Puzzle;
