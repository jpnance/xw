const fs = require('fs');
const path = require('path');

const CLEAR_SCREEN = "\033[2J";
const RESTORE_CURSOR = "\033[u";

const BACKGROUND_BLACK = "\033[48;5;0m";
const BACKGROUND_WHITE = "\033[48;5;15m";
const BACKGROUND_DARK_SLATE_GRAY = "\033[48;5;87m";
const BACKGROUND_PALE_TURQUOISE = "\033[48;5;159m";
const BACKGROUND_RED = "\033[48;5;196m";
const BACKGROUND_LIGHT_PINK = "\033[48;5;217m";
const BACKGROUND_GOLD = "\033[48;5;220m";
const BACKGROUND_LIGHT_GOLDENROD = "\033[48;5;227m";
const BACKGROUND_MISTY_ROSE = "\033[48;5;224m";
const BACKGROUND_GRAY_93 = "\033[48;5;255m";
const FOREGROUND_BLACK = "\033[38;5;0m";
const FOREGROUND_TEAL = "\033[38;5;6m";
const FOREGROUND_WHITE = "\033[38;5;15m";
const FOREGROUND_RED = "\033[38;5;196m";
const FOREGROUND_DARK_ORANGE = "\033[38;5;208m";
const FOREGROUND_ORANGE = "\033[38;5;214m";
const FOREGROUND_GRAY_74 = "\033[38;5;250m";
const RESET = "\x1b[0m";

const Util = require('./util');

function Puzzle() {
}

Puzzle.prototype.loadFromFile = function(filename) {
	let puzFile = fs.readFileSync(path.resolve(filename));
	this.loadFromPuzFile(puzFile);
};

Puzzle.prototype.loadFromPuzFile = function(puzFile) {
	this.checksum = (puzFile[0x01] << 8) | puzFile[0x00];
	this.fileMagic = '';
	
	for (let i = 0; i < 0xB; i++) {
		this.fileMagic += String.fromCharCode(puzFile[0x02 + i]);
	}

	if (this.fileMagic != 'ACROSS&DOWN') {
		console.error('Invalid puzzle file.');
		process.exit(1);
	}

	this.cibChecksum = (puzFile[0x0F] << 8) | puzFile[0x0E];
	this.maskedLowChecksum = (puzFile[0x10] << 24) | (puzFile[0x11] << 16) | (puzFile[0x12] << 8) | puzFile[0x13];
	this.maskedHighChecksum = (puzFile[0x14] << 24) | (puzFile[0x15] << 16) | (puzFile[0x16] << 8) | puzFile[0x17];

	this.versionString = String.fromCharCode(puzFile[0x18]) + String.fromCharCode(puzFile[0x19]) + String.fromCharCode(puzFile[0x1A]);
	this.reserved1C = (puzFile[0x1D] << 8) | puzFile[0x1C];
	this.scrambledChecksum = (puzFile[0x1F] << 8) | puzFile[0x1E];
	this.reserved20 = 0; // bytes from 0x20 to 0x2B; probably garbage
	this.width = puzFile[0x2C];
	this.height = puzFile[0x2D];
	this.numberOfClues = (puzFile[0x2F] << 8) | puzFile[0x2E];
	this.puzzleType = (puzFile[0x31] << 8) | puzFile[0x30];
	this.scrambledTag = (puzFile[0x33] << 8) | puzFile[0x32];

	this.grid = [];

	for (let y = 0; y < this.height; y++) {
		this.grid[y] = [];

		for (let x = 0; x < this.width; x++) {
			this.grid[y][x] = {
				clues: {},
				answer: String.fromCharCode(puzFile[0x34 + x + (y * this.width)]),
				guess: String.fromCharCode(puzFile[0x34 + x + (y * this.width) + (this.width * this.height)]),
				order: 0,
				changes: 0
			};
		}
	}

	let puzzleStateOffset = 0x34 + (2 * this.width * this.height);
	let stringIndex = puzzleStateOffset - 1;

	this.title = '';

	while (puzFile[++stringIndex] != 0x00) {
		this.title += String.fromCharCode(puzFile[stringIndex]);
	}

	this.author = '';

	while (puzFile[++stringIndex] != 0x00) {
		this.author += String.fromCharCode(puzFile[stringIndex]);
	}

	this.copyright = '';

	while (puzFile[++stringIndex] != 0x00) {
		this.copyright += String.fromCharCode(puzFile[stringIndex]);
	}

	this.clues = [];

	for (let i = 0; i < this.numberOfClues; i++) {
		this.clues[i] = '';

		while (puzFile[++stringIndex] != 0x00) {
			this.clues[i] += String.fromCharCode(puzFile[stringIndex]);
		}
	}

	this.notes = '';

	while (puzFile[++stringIndex] != 0x00) {
		this.notes += String.fromCharCode(puzFile[stringIndex]);
	}

	stringIndex++;

	while (puzFile[stringIndex]) {
		let sectionName = String.fromCharCode(puzFile[stringIndex]) + String.fromCharCode(puzFile[stringIndex + 1]) + String.fromCharCode(puzFile[stringIndex + 2]) + String.fromCharCode(puzFile[stringIndex + 3]);
		stringIndex += 4;

		let sectionLength = (puzFile[stringIndex + 1] << 8) | puzFile[stringIndex];

		stringIndex += 2;

		let sectionChecksum = (puzFile[stringIndex + 1] << 8) | puzFile[stringIndex];

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
		}

		stringIndex += sectionLength + 1;
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
				let clue = this.clues[this.acrosses.length + this.downs.length];

				this.acrosses.push({
					clue: clueNumber + '. ' + clue,
					origin: { x: x, y: y }
				});

				newClue = true;
			}

			if (this.needsDownNumber(x, y)) {
				let clue = this.clues[this.acrosses.length + this.downs.length];

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

	let acrossIndex = -1;
	let downIndex = -1;

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.blackCellAt(x, y)) {
				continue;
			}

			if (this.needsAcrossNumber(x, y)) {
				acrossIndex++;
			}

			if (this.needsDownNumber(x, y)) {
				downIndex++;
				this.grid[y][x].clues.down = downIndex;
			}

			this.grid[y][x].clues.across = acrossIndex;
		}
	}

	for (let x = 0; x < this.grid[0].length; x++) {
		for (let y = 0; y < this.grid.length; y++) {
			if (this.blackCellAt(x, y)) {
				continue;
			}

			if (this.grid[y][x].clues.down != undefined) {
				downIndex = this.grid[y][x].clues.down;
			}

			this.grid[y][x].clues.down = downIndex;
		}
	}

	this.guessCount = 0;

	this.cursor = { x: 0, y: 0 };
	this.direction = 'across';

	for (let x = 0; x < this.grid[0].length; x++) {
		if (!this.blackCellAt(x, 0)) {
			this.cursor.x = x;
			break;
		}
	}
};

Puzzle.prototype.loadFromAmuseLabsJson = function(jsonPuzzle) {
	this.puzzleType = 1;

	this.title = jsonPuzzle.title;
	this.author = jsonPuzzle.author;
	this.copyright = jsonPuzzle.copyright;

	this.grid = [];

	for (let i = 0; i < jsonPuzzle.box[0].length; i++) {
		this.grid[i] = [];
	}

	jsonPuzzle.box.forEach((boxRow, x) => {
		boxRow.forEach((boxRowChar, y) => {
			if (boxRowChar == '\u0000') {
				this.grid[y].push({ answer: '.' });
			}
			else {
				this.grid[y].push({ answer: boxRowChar });
			}

			if (jsonPuzzle.cellInfos) {
				let cellInfo = jsonPuzzle.cellInfos.find(element => { return element.x == x && element.y == y; })

				if (cellInfo) {
					if (cellInfo.isCircled) {
						this.grid[y][x].circled = true;
					}
				}
			}
		});
	});

	let maxClueNumber = 0;

	jsonPuzzle.clueNums.forEach(clueNumRow => {
		let clueNumRowMax = Math.max(...clueNumRow);

		if (clueNumRowMax > maxClueNumber) {
			maxClueNumber = clueNumRowMax;
		}
	});

	this.clues = [];

	for (let i = 1; i <= maxClueNumber; i++) {
		let acrossClue = jsonPuzzle.placedWords.find(element => element.clueNum == i && element.acrossNotDown);
		let downClue = jsonPuzzle.placedWords.find(element => element.clueNum == i && !element.acrossNotDown);

		if (acrossClue) {
			this.clues.push(acrossClue.clue.clue);
		}

		if (downClue) {
			this.clues.push(downClue.clue.clue);
		}
	}

	this.width = this.grid[0].length;
	this.height = this.grid.length;

	this.notes = '';
};

Puzzle.prototype.loadFromUsaTodayJson = function(jsonPuzzle) {
	this.puzzleType = 1;

	this.title = jsonPuzzle.Title;
	this.author = jsonPuzzle.Author;
	this.copyright = jsonPuzzle.Copyright;

	this.grid = [];

	Object.keys(jsonPuzzle.Solution).forEach((rowKey, y) => {
		let row = jsonPuzzle.Solution[rowKey];

		this.grid[y] = [];

		for (let x = 0; x < row.length; x++) {
			if (row[x] == ' ') {
				this.grid[y].push({ answer: '.' });
			}
			else {
				this.grid[y].push({ answer: row[x] });
			}
		}
	});

	this.clues = [];

	let acrosses = [];
	let downs = [];

	let rawAcrosses = jsonPuzzle.AcrossClue.split("\n");
	let rawDowns = jsonPuzzle.DownClue.split("\n");

	let maxClueNumber = 0;

	for (let i = 0; i < rawAcrosses.length; i++) {
		let clueSplit = rawAcrosses[i].split(/(\d\d\d?)\|(.*)/);
		let clueNumber = parseInt(clueSplit[1]);
		let clueText = clueSplit[2];

		if (clueNumber > maxClueNumber) {
			maxClueNumber = clueNumber;
		}

		acrosses.push({ number: clueNumber, clue: clueText });
	}

	for (let i = 0; i < rawDowns.length; i++) {
		let clueSplit = rawDowns[i].split(/(\d\d\d?)\|(.*)/);
		let clueNumber = parseInt(clueSplit[1]);
		let clueText = clueSplit[2];

		if (clueNumber) {
			if (clueNumber > maxClueNumber) {
				maxClueNumber = clueNumber;
			}

			downs.push({ number: clueNumber, clue: clueText });
		}
	}

	for (let i = 0; i <= maxClueNumber; i++) {
		let acrossClue = acrosses.find(element => element.number == i);
		let downClue = downs.find(element => element.number == i);

		if (acrossClue) {
			this.clues.push(acrossClue.clue);
		}

		if (downClue) {
			this.clues.push(downClue.clue);
		}
	}

	this.width = this.grid[0].length;
	this.height = this.grid.length;

	this.notes = '';
};

Puzzle.prototype.writeToFile = function(filename) {
	let data = [];

	data[0x00] = 0x00; // checksum0
	data[0x01] = 0x00; // checksum1

	data[0x02] = 'A'.charCodeAt(0);
	data[0x03] = 'C'.charCodeAt(0);
	data[0x04] = 'R'.charCodeAt(0);
	data[0x05] = 'O'.charCodeAt(0);
	data[0x06] = 'S'.charCodeAt(0);
	data[0x07] = 'S'.charCodeAt(0);
	data[0x08] = '&'.charCodeAt(0);
	data[0x09] = 'D'.charCodeAt(0);
	data[0x0A] = 'O'.charCodeAt(0);
	data[0x0B] = 'W'.charCodeAt(0);
	data[0x0C] = 'N'.charCodeAt(0);
	data[0x0D] = 0x00;

	data[0x0E] = 0x00; // cibChecksum0
	data[0x0F] = 0x00; // cibChecksum1

	data[0x10] = 0x00; // maskedLowChecksum0
	data[0x11] = 0x00; // maskedLowChecksum1
	data[0x12] = 0x00; // maskedLowChecksum2
	data[0x13] = 0x00; // maskedLowChecksum3

	data[0x14] = 0x00; // maskedHighChecksum0
	data[0x15] = 0x00; // maskedHighChecksum1
	data[0x16] = 0x00; // maskedHighChecksum2
	data[0x17] = 0x00; // maskedHighChecksum3

	data[0x18] = this.versionString ? this.versionString.charCodeAt(0) : 0x31;
	data[0x19] = this.versionString ? this.versionString.charCodeAt(1) : 0x2E;
	data[0x1A] = this.versionString ? this.versionString.charCodeAt(2) : 0x33;
	data[0x1B] = 0x00;

	data[0x1C] = 0x00; // reserved1C0
	data[0x1D] = 0x00; // reserved1C1

	data[0x1E] = 0x00; // scrambledChecksum0
	data[0x1F] = 0x00; // scrambledChecksum1

	data[0x20] = 0x00; // reserved200
	data[0x21] = 0x00; // reserved201
	data[0x22] = 0x00; // reserved202
	data[0x23] = 0x00; // reserved203
	data[0x24] = 0x00; // reserved204
	data[0x25] = 0x00; // reserved205
	data[0x26] = 0x00; // reserved206
	data[0x27] = 0x00; // reserved207
	data[0x28] = 0x00; // reserved208
	data[0x29] = 0x00; // reserved209
	data[0x2A] = 0x00; // reserved210
	data[0x2B] = 0x00; // reserved211

	data[0x2C] = this.width;
	data[0x2D] = this.height;

	data[0x2E] = this.clues.length & 0x00FF;
	data[0x2F] = (this.clues.length & 0xFF00) >> 8;

	data[0x30] = this.puzzleType & 0x00FF;
	data[0x31] = (this.puzzleType & 0xFF00) >> 8;

	data[0x32] = 0x00; // scrambledTag0
	data[0x33] = 0x00; // scrambledTag0

	let offset = 0x34;
	let solutionOffset = 0x34;

	let circledSquares = false;

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			data[offset++] = this.grid[y][x].answer.charCodeAt(0);

			if (this.grid[y][x].circled) {
				circledSquares = true;
			}
		}
	}

	let gridOffset = offset;

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].answer != '.') {
				data[offset++] = '-'.charCodeAt(0);
			}
			else {
				data[offset++] = '.'.charCodeAt(0);
			}
		}
	}

	let titleOffset = offset;

	for (let i = 0; i < this.title.length; i++) {
		data[offset++] = this.title.charCodeAt(i);
	}

	data[offset++] = 0x00;

	let authorOffset = offset;

	for (let i = 0; i < this.author.length; i++) {
		data[offset++] = this.author.charCodeAt(i);
	}

	data[offset++] = 0x00;

	let copyrightOffset = offset;

	for (let i = 0; i < this.copyright.length; i++) {
		data[offset++] = this.copyright.charCodeAt(i);
	}

	data[offset++] = 0x00;

	let cluesOffset = offset;

	for (let i = 0; i < this.clues.length; i++) {
		for (let j = 0; j < this.clues[i].length; j++) {
			data[offset++] = this.clues[i].charCodeAt(j);
		}

		data[offset++] = 0x00;
	}

	let notesOffset = offset;

	for (let i = 0; i < this.notes.length; i++) {
		data[offset++] = this.notes.charCodeAt(i);
	}

	data[offset++] = 0x00;

	if (circledSquares) {
		data[offset++] = 'G'.charCodeAt(0);
		data[offset++] = 'E'.charCodeAt(0);
		data[offset++] = 'X'.charCodeAt(0);
		data[offset++] = 'T'.charCodeAt(0);

		data[offset++] = (this.width * this.height) & 0x00FF;
		data[offset++] = ((this.width * this.height) & 0xFF00) >> 8;

		let gextChecksumOffset = offset;

		data[offset++] = 0x00;
		data[offset++] = 0x00;

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].circled) {
					data[offset++] = 0x80;
				}
				else {
					data[offset++] = 0x00;
				}
			}
		}

		let gextChecksum = Util.computeChecksum(data.slice(gextChecksumOffset + 2, gextChecksumOffset + 2 + (this.width * this.height)), 0x0000);

		data[gextChecksumOffset] = gextChecksum & 0x00FF;
		data[gextChecksumOffset + 1] = (gextChecksum & 0xFF00) >> 8;

		data[offset++] = 0x00;
	}

	this.cibChecksum = Util.computeChecksum(data.slice(0x2C, 0x2C + 8), 0x0000);

	data[0x0E] = this.cibChecksum & 0x00FF;
	data[0x0F] = (this.cibChecksum & 0xFF00) >> 8;

	this.checksum = this.cibChecksum;

	this.checksum = Util.computeChecksum(data.slice(solutionOffset, solutionOffset + (this.width * this.height)), this.checksum);
	this.solutionChecksum = Util.computeChecksum(data.slice(solutionOffset, solutionOffset + (this.width * this.height)), 0x0000);

	this.checksum = Util.computeChecksum(data.slice(gridOffset, gridOffset + (this.width * this.height)), this.checksum);
	this.gridChecksum = Util.computeChecksum(data.slice(gridOffset, gridOffset + (this.width * this.height)), 0x0000);

	this.partialChecksum = 0x0000;

	if (this.title.length) {
		this.checksum = Util.computeChecksum(data.slice(titleOffset, titleOffset + this.title.length + 1), this.checksum);
		this.partialChecksum = Util.computeChecksum(data.slice(titleOffset, titleOffset + this.title.length + 1), this.partialChecksum);
	}

	if (this.author.length) {
		this.checksum = Util.computeChecksum(data.slice(authorOffset, authorOffset + this.author.length + 1), this.checksum);
		this.partialChecksum = Util.computeChecksum(data.slice(authorOffset, authorOffset + this.author.length + 1), this.partialChecksum);
	}

	if (this.copyright.length) {
		this.checksum = Util.computeChecksum(data.slice(copyrightOffset, copyrightOffset + this.copyright.length + 1), this.checksum);
		this.partialChecksum = Util.computeChecksum(data.slice(copyrightOffset, copyrightOffset + this.copyright.length + 1), this.partialChecksum);
	}

	for (let i = 0; i < this.clues.length; i++) {
		let clue = this.clues[i];
		let clueCharCodes = [];

		for (let j = 0; j < clue.length; j++) {
			clueCharCodes.push(clue.charCodeAt(j) & 0xFF);
		}

		this.checksum = Util.computeChecksum(clueCharCodes, this.checksum);
		this.partialChecksum = Util.computeChecksum(clueCharCodes, this.partialChecksum);
	}

	if (this.notes.length) {
		this.checksum = Util.computeChecksum(data.slice(notesOffset, notesOffset + this.notes.length + 1), this.checksum);
		this.partialChecksum = Util.computeChecksum(data.slice(notesOffset, notesOffset + this.notes.length + 1), this.partialChecksum);
	}

	data[0x00] = this.checksum & 0xFF;
	data[0x01] = (this.checksum & 0xFF00) >> 8;

	data[0x10] = 0x49 ^ (this.cibChecksum & 0xFF);
	data[0x11] = 0x43 ^ (this.solutionChecksum & 0xFF);
	data[0x12] = 0x48 ^ (this.gridChecksum & 0xFF);
	data[0x13] = 0x45 ^ (this.partialChecksum & 0xFF);
	data[0x14] = 0x41 ^ ((this.cibChecksum & 0xFF00) >> 8);
	data[0x15] = 0x54 ^ ((this.solutionChecksum & 0xFF00) >> 8);
	data[0x16] = 0x45 ^ ((this.gridChecksum & 0xFF00) >> 8);
	data[0x17] = 0x44 ^ ((this.partialChecksum & 0xFF00) >> 8);

	fs.writeFileSync(path.resolve(filename), Uint8Array.from(data), { encoding: 'utf8' });
};

Puzzle.prototype.blackCellAt = function(x, y) {
	if (x >= this.width || y >= this.height) {
		return true;
	}

	return this.grid[y][x].answer == '.';
}

Puzzle.prototype.needsAcrossNumber = function(x, y) {
	if (x == 0 || this.blackCellAt(x - 1, y)) {
		if (!this.blackCellAt(x + 1, y) && !this.blackCellAt(x + 2, y)) {
			return true;
		}
	}

	return false;
}

Puzzle.prototype.needsDownNumber = function(x, y) {
	if (y == 0 || this.blackCellAt(x, y - 1)) {
		if (!this.blackCellAt(x, y + 1) && !this.blackCellAt(x, y + 2)) {
			return true;
		}
	}

	return false;
}

Puzzle.prototype.getAcrossWord = function(x, y) {
	let solverWord = '';
	let answerWord = '';

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
	let solverWord = '';
	let answerWord = '';

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
				this.grid[clue.origin.y][clue.origin.x + wordIndex].changes += 1;
				this.grid[clue.origin.y][clue.origin.x + wordIndex].guess = rebusGuess;

				delete this.grid[clue.origin.y][clue.origin.x + wordIndex].incorrect;
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
			this.grid[clue.origin.y][clue.origin.x + wordIndex].changes += 1;
			this.grid[clue.origin.y][clue.origin.x + wordIndex].guess = guess[i].toUpperCase();

			delete this.grid[clue.origin.y][clue.origin.x + wordIndex].incorrect;
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
				this.grid[clue.origin.y + wordIndex][clue.origin.x].changes += 1;
				this.grid[clue.origin.y + wordIndex][clue.origin.x].guess = rebusGuess;

				delete this.grid[clue.origin.y + wordIndex][clue.origin.x].incorrect;
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
			this.grid[clue.origin.y + wordIndex][clue.origin.x].changes += 1;
			this.grid[clue.origin.y + wordIndex][clue.origin.x].guess = guess[i].toUpperCase();

			delete this.grid[clue.origin.y + wordIndex][clue.origin.x].incorrect;
		}

		wordIndex++;
	}
};

Puzzle.prototype.logGuess = function(guess) {
	if (this.grid[this.cursor.y][this.cursor.x].guess != guess.toUpperCase()) {
		this.grid[this.cursor.y][this.cursor.x].order = ++(this.guessCount);
		this.grid[this.cursor.y][this.cursor.x].changes += 1;
		this.grid[this.cursor.y][this.cursor.x].guess = guess.toUpperCase();

		delete this.grid[this.cursor.y][this.cursor.x].incorrect;
	}
};

Puzzle.prototype.showSolverState = function(title) {
	process.stdout.write(CLEAR_SCREEN);
	process.stdout.write(RESTORE_CURSOR);

	let mode = this.direction;
	let clue = null;
	let words = null;

	if (mode == 'across') {
		clue = this.getClueFor(this.cursor, mode);
		words = this.getAcrossWord(clue.origin.x, clue.origin.y);
	}
	else if (mode == 'down') {
		clue = this.getClueFor(this.cursor, mode);
		words = this.getDownWord(clue.origin.x, clue.origin.y);
	}

	let colorLine1;
	let colorLine2;

	console.log(this.title);
	console.log(this.author);
	console.log(this.copyright);

	console.log();

	if (this.notes.length > 0) {
		console.log(Util.formatString(this.notes, this.width * 3, 0));
		console.log();
	}

	let clueIndentation = clue.clue.indexOf(' ') + 1;

	if (title) {
		console.log();
		console.log();
		console.log();
		console.log();
	}
	else {
		console.log(Util.formatString(clue.clue, this.width * 3, clueIndentation, 3));
		console.log();
	}

	let clues = 1;

	for (let y = 0; y < this.grid.length; y++) {
		let outputLine1 = '';
		let outputLine2 = '';

		for (let x = 0; x < this.grid[y].length; x++) {
			if (title == 'title') {
				outputLine1 += BACKGROUND_WHITE + '   ' + RESET;
				outputLine2 += BACKGROUND_WHITE + '   ' + RESET;
			}
			else {
				if (x == this.cursor.x && y == this.cursor.y) {
					if (this.grid[y][x].circled) {
						colorLine1 = BACKGROUND_GOLD + FOREGROUND_ORANGE;
						colorLine2 = BACKGROUND_GOLD + FOREGROUND_ORANGE;
					}
					else {
						colorLine1 = BACKGROUND_LIGHT_GOLDENROD + FOREGROUND_ORANGE;
						colorLine2 = BACKGROUND_LIGHT_GOLDENROD + FOREGROUND_ORANGE;
					}
				}
				else if (mode == 'across' && y == clue.origin.y && x >= clue.origin.x && x < clue.origin.x + words.answer.length) {
					if (this.grid[y][x].circled) {
						colorLine1 = BACKGROUND_DARK_SLATE_GRAY + FOREGROUND_TEAL;
						colorLine2 = BACKGROUND_DARK_SLATE_GRAY
					}
					else {
						colorLine1 = BACKGROUND_PALE_TURQUOISE + FOREGROUND_TEAL;
						colorLine2 = BACKGROUND_PALE_TURQUOISE;
					}
				}
				else if (mode == 'down' && x == clue.origin.x && y >= clue.origin.y && y < clue.origin.y + words.answer.length) {
					if (this.grid[y][x].circled) {
						colorLine1 = BACKGROUND_DARK_SLATE_GRAY + FOREGROUND_TEAL;
						colorLine2 = BACKGROUND_DARK_SLATE_GRAY;
					}
					else {
						colorLine1 = BACKGROUND_PALE_TURQUOISE + FOREGROUND_TEAL;
						colorLine2 = BACKGROUND_PALE_TURQUOISE;
					}
				}
				else {
					if (this.grid[y][x].circled) {
						colorLine1 = BACKGROUND_GRAY_93 + FOREGROUND_GRAY_74;
						colorLine2 = BACKGROUND_GRAY_93;
					}
					else {
						colorLine1 = BACKGROUND_WHITE + FOREGROUND_GRAY_74;
						colorLine2 = BACKGROUND_WHITE;
					}

				}

				if (this.grid[y][x].answer == '.') {
					outputLine1 += BACKGROUND_BLACK + FOREGROUND_WHITE + '   ' + RESET;
				}
				else {
					if (this.grid[y][x].revealed) {
						colorLine2 += FOREGROUND_RED;
					}
					else if (this.grid[y][x].incorrect) {
						colorLine2 += FOREGROUND_DARK_ORANGE;
					}
					else if (this.grid[y][x].unsure) {
						colorLine2 += FOREGROUND_ORANGE;
					}
					else {
						colorLine2 += FOREGROUND_BLACK;
					}

					if (this.needsAcrossNumber(x, y) || this.needsDownNumber(x, y)) {
						outputLine1 += colorLine1 + clues + (clues < 10 ? ' ' : '') + (clues < 100 ? ' ' : '') + RESET;
						clues++;
					}
					else {
						outputLine1 += colorLine1 + '   ' + RESET;
					}
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

Puzzle.prototype.reveal = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].answer == '.') {
				continue;
			}

			if (this.grid[y][x].guess != this.grid[y][x].answer) {
				this.grid[y][x].guess = this.grid[y][x].answer;

				this.grid[y][x].revealed = true;

				delete this.grid[y][x].order;
				delete this.grid[y][x].changes;
			}
		}
	}
};

Puzzle.prototype.check = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].answer == '.') {
				continue;
			}

			if (this.grid[y][x].guess != this.grid[y][x].answer) {
				this.grid[y][x].checked = true;
				this.grid[y][x].incorrect = true;
			}
		}
	}
};

Puzzle.prototype.tabulateStats = function() {
	let guessOrders = [];

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].answer != '.' && this.grid[y][x].order != undefined) {
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
			if (this.grid[y][x].answer != '.' && this.grid[y][x].order != undefined) {
				this.grid[y][x].percentile = guessOrders.indexOf(this.grid[y][x].order) / guessOrders.length;
			}
		}
	}
};

Puzzle.prototype.showMinimaps = function() {
	let changesLine = '';
	let orderLine = '';

	for (let y = 0; y < this.grid.length; y++) {
		changesLine = '';
		orderLine = '';

		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].answer == '.') {
				changesLine += BACKGROUND_BLACK;
				orderLine += BACKGROUND_BLACK;
			}
			else if (this.grid[y][x].revealed) {
				changesLine += BACKGROUND_RED;
				orderLine += BACKGROUND_RED;
			}
			else {
				if (this.grid[y][x].changes == 1) {
					changesLine += BACKGROUND_WHITE;
				}
				else if (this.grid[y][x].changes == 2) {
					changesLine += BACKGROUND_MISTY_ROSE;
				}
				else {
					changesLine += BACKGROUND_LIGHT_PINK;
				}

				if (this.grid[y][x].percentile < 0.67) {
					orderLine += BACKGROUND_WHITE;
				}
				else if (this.grid[y][x].percentile < 0.89) {
					orderLine += BACKGROUND_MISTY_ROSE;
				}
				else {
					orderLine += BACKGROUND_LIGHT_PINK;
				}
			}

			changesLine += ' ';
			orderLine += ' ';
		}

		changesLine += RESET;
		orderLine += RESET;

		console.log(changesLine + '   ' + orderLine);
	}
};

Puzzle.prototype.moveCursor = function(direction, stopAtBlackCell, reverse) {
	if (!direction) {
		if (this.direction == 'across') {
			if (reverse) {
				direction = 'left';
			}
			else {
				direction = 'right';
			}
		}
		else if (this.direction == 'down') {
			if (reverse) {
				direction = 'up';
			}
			else {
				direction = 'down';
			}
		}
	}

	if (direction == 'left') {
		let candidateX = this.cursor.x - 1;

		if (stopAtBlackCell && this.blackCellAt(candidateX, this.cursor.y)) {
			return;
		}

		for (candidateX; candidateX >= 0; candidateX--) {
			if (!this.blackCellAt(candidateX, this.cursor.y)) {
				break;
			}
		}

		if (candidateX >= 0) {
			this.cursor.x = candidateX;
		}
	}
	else if (direction == 'right') {
		let candidateX = this.cursor.x + 1;

		if (stopAtBlackCell && this.blackCellAt(candidateX, this.cursor.y)) {
			return;
		}

		for (candidateX; candidateX < this.grid[this.cursor.y].length; candidateX++) {
			if (!this.blackCellAt(candidateX, this.cursor.y)) {
				break;
			}
		}

		if (candidateX < this.grid[this.cursor.y].length) {
			this.cursor.x = candidateX;
		}
	}
	else if (direction == 'up') {
		let candidateY = this.cursor.y - 1;

		if (stopAtBlackCell && this.blackCellAt(this.cursor.x, candidateY)) {
			return;
		}

		for (candidateY; candidateY >= 0; candidateY--) {
			if (!this.blackCellAt(this.cursor.x, candidateY)) {
				break;
			}
		}

		if (candidateY >= 0) {
			this.cursor.y = candidateY;
		}
	}
	else if (direction == 'down') {
		let candidateY = this.cursor.y + 1;

		if (stopAtBlackCell && this.blackCellAt(this.cursor.x, candidateY)) {
			return;
		}

		for (candidateY; candidateY < this.grid.length; candidateY++) {
			if (!this.blackCellAt(this.cursor.x, candidateY)) {
				break;
			}
		}

		if (candidateY < this.grid.length) {
			this.cursor.y = candidateY;
		}
	}
};

Puzzle.prototype.getClueFor = function(position, direction) {
	if (direction == 'across') {
		return this.acrosses[this.grid[position.y][position.x].clues.across];
	}
	else if (direction == 'down') {
		return this.downs[this.grid[position.y][position.x].clues.down];
	}
};

Puzzle.prototype.switchDirection = function() {
	if (this.direction == 'across') {
		this.direction = 'down';
	}
	else if (this.direction = 'down') {
		this.direction = 'across';
	}
};

Puzzle.prototype.moveCursorTo = function(x, y) {
	if (x >= 0 && x < this.width && y >= 0 && y < this.height && !this.blackCellAt(x, y)) {
		this.cursor.x = x;
		this.cursor.y = y;
	}
};

module.exports = Puzzle;
