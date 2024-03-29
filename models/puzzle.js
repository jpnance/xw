const fs = require('fs');
const path = require('path');

const CURSOR_POSITION = (x, y) => { return "\033[" + y + ";" + x + "H"; };
const CLEAR_SCREEN = "\033[2J";
const CLEAR_REST_OF_SCREEN = "\033[J";
const SAVE_CURSOR = "\033[s";
const RESTORE_CURSOR = "\033[u";
const CURSOR_UP = "\033[1A";

const BACKGROUND_BLACK = "\033[48;5;0m";

const FOREGROUND_BLACK = "\033[38;5;0m";
const FOREGROUND_GRAY_58 = "\033[38;5;246m";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const FOREGROUND = (foreground) => {
	return "\033[38;5;" + foreground + 'm';
};

const BACKGROUND = (background) => {
	return "\033[48;5;" + background + 'm';
};

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
				changes: 0,
				percentile: -1
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
					number: clueNumber,
					direction: 'A',
					clue: Util.sanitizeClue(clue),
					origin: { x: x, y: y }
				});

				newClue = true;
			}

			if (this.needsDownNumber(x, y)) {
				let clue = this.clues[this.acrosses.length + this.downs.length];

				this.downs.push({
					number: clueNumber,
					direction: 'D',
					clue: Util.sanitizeClue(clue),
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

	this.cursor = null;
	this.direction = 'across';

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (!this.blackCellAt(x, y)) {
				this.cursor = { x: x, y: y };
				break;
			}
		}

		if (this.cursor) {
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

	let rebuses = [];

	jsonPuzzle.box.forEach((boxRow, x) => {
		boxRow.forEach((boxRowChar, y) => {
			if (boxRowChar == '\u0000') {
				this.grid[y].push({ answer: '.' });
			}
			else {
				if (boxRowChar.length > 1) {
					if (!rebuses.includes(boxRowChar)) {
						rebuses.push(boxRowChar);
					}

					let rebusId = rebuses.indexOf(boxRowChar);

					this.grid[y].push({ answer: boxRowChar, rebus: { id: rebusId, text: boxRowChar } });
				}
				else {
					this.grid[y].push({ answer: boxRowChar });
				}
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
			let clue = Util.sanitizeClue(acrossClue.clue.clue);
			this.clues.push(clue);
		}

		if (downClue) {
			let clue = Util.sanitizeClue(downClue.clue.clue);
			this.clues.push(clue);
		}
	}

	this.width = this.grid[0].length;
	this.height = this.grid.length;

	this.notes = '';

	this.loadFromPuzFile(this.generatePuzFileData());
};

Puzzle.prototype.loadFromNytJson = function(jsonPuzzle) {
	this.puzzleType = 1;

	let publishDate = new Date(jsonPuzzle.puzzle_meta.printDate + ' 00:00:01');
	let formattedDate = Util.dateFormat(publishDate, '%A, %B %-d, %Y');

	this.title = jsonPuzzle.puzzle_meta.title || formattedDate;
	this.author = jsonPuzzle.puzzle_meta.author;
	this.copyright = jsonPuzzle.puzzle_meta.copyright;

	this.grid = [];

	this.width = jsonPuzzle.puzzle_meta.width;
	this.height = jsonPuzzle.puzzle_meta.height;

	let rebuses = [];

	jsonPuzzle.puzzle_data.answers.forEach((answer, i) => {
		let row = Math.floor(i / this.width);
		let column = i % this.width;

		let circled = jsonPuzzle.puzzle_data.layout[i] == 3 || jsonPuzzle.puzzle_data.layout[i] == 9;

		if (!this.grid[row]) {
			this.grid[row] = [];
		}

		if (!answer) {
			this.grid[row].push({ answer: '.' });
		}
		else if (answer.length > 1) {
			let mainAnswer = answer[0];

			if (!rebuses.includes(mainAnswer)) {
				rebuses.push(mainAnswer);
			}

			let rebusId = rebuses.indexOf(mainAnswer);

			this.grid[row].push({ answer: mainAnswer, rebus: { id: rebusId, text: mainAnswer }, circled: circled });
		}
		else {
			this.grid[row].push({ answer: answer, circled: circled });
		}
	});

	this.clues = [];

	let acrosses = [];
	let downs = [];

	let maxClueNumber = 0;

	['A', 'D'].forEach((clueType) => {
		jsonPuzzle.puzzle_data.clues[clueType].forEach((clue) => {
			if (clue.clueNum > maxClueNumber) {
				maxClueNumber = clue.clueNum;
			}

			if (clueType == 'A') {
				acrosses.push(clue);
			}
			else if (clueType == 'D') {
				downs.push(clue);
			}
		});
	});

	for (let i = 0; i <= maxClueNumber; i++) {
		let acrossClue = acrosses.find(element => element.clueNum == i);
		let downClue = downs.find(element => element.clueNum == i);

		if (acrossClue) {
			this.clues.push(acrossClue.value);
		}

		if (downClue) {
			this.clues.push(downClue.value);
		}
	}

	this.notes = '';

	if (jsonPuzzle.puzzle_meta.notes.length) {
		let noteObject = jsonPuzzle.puzzle_meta.notes.find((note) => note.platforms.web);

		if (noteObject) {
			this.notes = noteObject.txt;
		}
	}

	this.loadFromPuzFile(this.generatePuzFileData());
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

	this.loadFromPuzFile(this.generatePuzFileData());
};

Puzzle.prototype.generatePuzFileData = function(filename) {
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
	let rebuses = false;

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			data[offset++] = this.grid[y][x].answer.charCodeAt(0);

			if (this.grid[y][x].circled) {
				circledSquares = true;
			}

			if (this.grid[y][x].rebus) {
				rebuses = true;
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

	if (rebuses) {
		data[offset++] = 'G'.charCodeAt(0);
		data[offset++] = 'R'.charCodeAt(0);
		data[offset++] = 'B'.charCodeAt(0);
		data[offset++] = 'S'.charCodeAt(0);

		data[offset++] = (this.width * this.height) & 0x00FF;
		data[offset++] = ((this.width * this.height) & 0xFF00) >> 8;

		let grbsChecksumOffset = offset;

		data[offset++] = 0x00;
		data[offset++] = 0x00;

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].rebus) {
					data[offset++] = (1 + this.grid[y][x].rebus.id) & 0xFF;
				}
				else {
					data[offset++] = 0x00;
				}
			}
		}

		let grbsChecksum = Util.computeChecksum(data.slice(grbsChecksumOffset + 2, grbsChecksumOffset + 2 + (this.width * this.height)), 0x0000);

		data[grbsChecksumOffset] = grbsChecksum & 0x00FF;
		data[grbsChecksumOffset + 1] = (grbsChecksum & 0xFF00) >> 8;

		data[offset++] = 0x00;

		data[offset++] = 'R'.charCodeAt(0);
		data[offset++] = 'T'.charCodeAt(0);
		data[offset++] = 'B'.charCodeAt(0);
		data[offset++] = 'L'.charCodeAt(0);

		let rtblLength = 0;

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].rebus) {
					rtblLength += 4 + this.grid[y][x].rebus.text.length;
				}
			}
		}

		data[offset++] = (rtblLength) & 0x00FF;
		data[offset++] = ((rtblLength) & 0xFF00) >> 8;

		let rtblChecksumOffset = offset;

		data[offset++] = 0x00;
		data[offset++] = 0x00;

		for (let y = 0; y < this.grid.length; y++) {
			for (let x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x].rebus) {
					if (this.grid[y][x].rebus.id < 10) {
						data[offset++] = ' '.charCodeAt(0);
						data[offset++] = this.grid[y][x].rebus.id.toString().charCodeAt(0);
					}
					else {
						data[offset++] = this.grid[y][x].rebus.id.toString().charCodeAt(0);
						data[offset++] = this.grid[y][x].rebus.id.toString().charCodeAt(1);
					}

					data[offset++] = ':'.charCodeAt(0);

					for (let i = 0; i < this.grid[y][x].rebus.text.length; i++) {
						data[offset++] = this.grid[y][x].rebus.text.charCodeAt(i);
					}

					data[offset++] = ';'.charCodeAt(0);
				}
			}
		}

		let rtblChecksum = Util.computeChecksum(data.slice(rtblChecksumOffset + 2, rtblChecksumOffset + 2 + (this.width * this.height)), 0x0000);

		data[rtblChecksumOffset] = rtblChecksum & 0x00FF;
		data[rtblChecksumOffset + 1] = (rtblChecksum & 0xFF00) >> 8;

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

	return data;
	//fs.writeFileSync(path.resolve(filename), Uint8Array.from(data), { encoding: 'utf8' });
};

Puzzle.prototype.blackCellAt = function(x, y) {
	if (x >= this.width || y >= this.height) {
		return true;
	}

	return this.grid[y][x].answer == '.';
}

Puzzle.prototype.guessAt = function(x, y) {
	return this.grid[y][x].guess;
}

Puzzle.prototype.guessAtCursor = function() {
	return this.guessAt(this.cursor.x, this.cursor.y);
};

Puzzle.prototype.firstBlankIndexIn = function(clue) {
	let firstBlankIndex;

	if (clue.direction == 'A') {
		for (let i = clue.origin.x; i < this.width; i++) {
			if (this.blackCellAt(i, clue.origin.y)) {
				return firstBlankIndex;
			}
			else if (this.guessAt(i, clue.origin.y) == '-') {
				return i;
			}
		}
	}
	else if (clue.direction == 'D') {
		for (let i = clue.origin.y; i < this.height; i++) {
			if (this.blackCellAt(clue.origin.x, i)) {
				return firstBlankIndex;
			}
			else if (this.guessAt(clue.origin.x, i) == '-') {
				return i;
			}
		}
	}

	return firstBlankIndex;
}

Puzzle.prototype.firstIndexIn = function(clue) {
	if (clue.direction == 'A') {
		return clue.origin.x;
	}
	else if (clue.direction == 'D') {
		return clue.origin.y;
	}
}

Puzzle.prototype.lastBlankIndexIn = function(clue) {
	let lastBlankIndex;

	if (clue.direction == 'A') {
		for (let i = clue.origin.x; i < this.width; i++) {
			if (this.blackCellAt(i, clue.origin.y)) {
				return lastBlankIndex;
			}
			else if (this.guessAt(i, clue.origin.y) == '-') {
				lastBlankIndex = i;
			}
		}
	}
	else if (clue.direction == 'D') {
		for (let i = clue.origin.y; i < this.height; i++) {
			if (this.blackCellAt(clue.origin.x, i)) {
				return lastBlankIndex;
			}
			else if (this.guessAt(clue.origin.x, i) == '-') {
				lastBlankIndex = i;
			}
		}
	}

	return lastBlankIndex;
}

Puzzle.prototype.lastIndexIn = function(clue) {
	if (clue.direction == 'A') {
		for (let i = clue.origin.x; i < this.width; i++) {
			if (this.blackCellAt(i, clue.origin.y)) {
				return i - 1;
			}
		}

		return this.width - 1;
	}
	else if (clue.direction == 'D') {
		for (let i = clue.origin.y; i < this.height; i++) {
			if (this.blackCellAt(clue.origin.x, i)) {
				return i - 1;
			}
		}

		return this.height - 1;
	}
}

Puzzle.prototype.needsAcrossNumber = function(x, y) {
	if (x == 0 || this.blackCellAt(x - 1, y)) {
		if (!this.blackCellAt(x + 1, y)) {
			return true;
		}
	}

	return false;
}

Puzzle.prototype.needsDownNumber = function(x, y) {
	if (y == 0 || this.blackCellAt(x, y - 1)) {
		if (!this.blackCellAt(x, y + 1)) {
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

Puzzle.prototype.logGuess = function(guess) {
	if (this.grid[this.cursor.y][this.cursor.x].guess != guess.toUpperCase()) {
		if (guess != '-') {
			this.grid[this.cursor.y][this.cursor.x].order = ++(this.guessCount);
			this.grid[this.cursor.y][this.cursor.x].changes += 1;
		}

		this.grid[this.cursor.y][this.cursor.x].guess = guess.toUpperCase();

		delete this.grid[this.cursor.y][this.cursor.x].incorrect;
	}
};

Puzzle.prototype.markUnsure = function() {
	this.grid[this.cursor.y][this.cursor.x].unsure = !this.grid[this.cursor.y][this.cursor.x].unsure;
};

Puzzle.prototype.showSolverState = function(options) {
	options = options || {};

	process.stdout.write(CURSOR_POSITION(1, 1));

	let mode = this.direction;
	let thisClue = null;
	let crossClue = null;
	let words = null;

	if (mode == 'across') {
		thisClue = this.getClueFor(this.cursor, mode);
		crossClue = this.getClueFor(this.cursor, 'down');
		words = this.getAcrossWord(thisClue.origin.x, thisClue.origin.y);
	}
	else if (mode == 'down') {
		thisClue = this.getClueFor(this.cursor, mode);
		crossClue = this.getClueFor(this.cursor, 'across');
		words = this.getDownWord(thisClue.origin.x, thisClue.origin.y);
	}

	let colorLine1;
	let colorLine2;

	try {
		console.log(Util.formatString(decodeURIComponent(this.title)));
	} catch (e) {
		console.log(Util.formatString(this.title));
	}

	console.log(Util.formatString(decodeURIComponent(this.author)));
	console.log(Util.formatString(decodeURIComponent(this.copyright)));

	console.log(Util.formatString(''));

	if (this.notes.length > 0) {
		this.notes.split(/\n\n/).forEach((paragraph) => {
			console.log(Util.formatString(paragraph, this.width * 3 + 3 + this.width, 0));
			console.log(Util.formatString(''));
		});
	}

	let clues = 1;

	let solverMode = options.solverMode.primary;
	let squareType = 'standard';
	let squareVariation = 'uncircled';

	for (let y = 0; y < this.grid.length; y++) {
		let outputLine1 = '';
		let outputLine2 = '';

		for (let x = 0; x < this.grid[y].length; x++) {
			if (options.title) {
				outputLine1 += BACKGROUND(options.colors.squares.standard.uncircled.normal.background) + '   ' + RESET;
				outputLine2 += BACKGROUND(options.colors.squares.standard.uncircled.normal.background) + '   ' + RESET;
			}
			else if (this.grid[y][x].answer == '.') {
				outputLine1 += BACKGROUND(options.colors.squares.empty) + '   ' + RESET;
				outputLine2 += BACKGROUND(options.colors.squares.empty) + '   ' + RESET;
			}
			else {
				if (this.grid[y][x].circled) {
					squareVariation = 'circled';
				}
				else {
					squareVariation = 'uncircled';
				}

				if (this.anchor && x == this.anchor.x && y == this.anchor.y) {
					squareType = 'anchor';
				}
				else if (x == this.cursor.x && y == this.cursor.y) {
					squareType = 'cursor';
				}
				else if ((mode == 'across' && y == thisClue.origin.y && x >= thisClue.origin.x && x < thisClue.origin.x + words.answer.length) || (mode == 'down' && x == thisClue.origin.x && y >= thisClue.origin.y && y < thisClue.origin.y + words.answer.length)) {
					squareType = 'highlighted';
				}
				else {
					squareType = 'standard';
				}

				colorLine1 = BACKGROUND(options.colors.squares[squareType][squareVariation][solverMode].background) + FOREGROUND(options.colors.squares[squareType][squareVariation][solverMode].clueNumber);
				colorLine2 = BOLD + BACKGROUND(options.colors.squares[squareType][squareVariation][solverMode].background);

				if (this.grid[y][x].revealed) {
					colorLine2 += FOREGROUND(options.colors.guesses.revealed);
				}
				else if (this.grid[y][x].incorrect) {
					colorLine2 += FOREGROUND(options.colors.guesses.incorrect);
				}
				else if (this.grid[y][x].unsure) {
					colorLine2 += FOREGROUND(options.colors.guesses.unsure);
				}
				else {
					colorLine2 += FOREGROUND(options.colors.guesses.standard);
				}

				if (this.needsAcrossNumber(x, y) || this.needsDownNumber(x, y)) {
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
							outputLine2 += BACKGROUND(options.colors.squares.empty) + '   ' + RESET;
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

	if (!options.title) {
		let clueIndentation = Math.max(thisClue.number.toString().length, crossClue.number.toString().length);
		let clueIndentationDifference = thisClue.number.toString().length - crossClue.number.toString().length;

		console.log(Util.formatString(''));
		console.log(Util.formatString(words.guess + ' (' + words.answer.length + ')'));
		console.log(Util.formatString(''));

		if (options.downsOnly) {
			if (this.direction == 'down') {
				console.log(BOLD + ' '.repeat(clueIndentationDifference < 0 ? Math.abs(clueIndentationDifference) : 0) + Util.formatString(thisClue.number.toString().padStart(clueIndentation, ' ') + thisClue.direction + '. ' + thisClue.clue, this.width * 3, clueIndentation + 3) + RESET);
			}
			else {
				console.log(FOREGROUND_GRAY_58 + ' '.repeat(clueIndentationDifference > 0 ? Math.abs(clueIndentationDifference) : 0) + Util.formatString(crossClue.number.toString().padStart(clueIndentation, ' ') + crossClue.direction + '. ' + crossClue.clue, this.width * 3, clueIndentation + 3) + RESET);
			}
		}
		else {
			console.log(BOLD + ' '.repeat(clueIndentationDifference < 0 ? Math.abs(clueIndentationDifference) : 0) + Util.formatString(thisClue.number.toString().padStart(clueIndentation, ' ') + thisClue.direction + '. ' + thisClue.clue, this.width * 3, clueIndentation + 3) + RESET);
			console.log(Util.formatString(''));
			console.log(FOREGROUND_GRAY_58 + ' '.repeat(clueIndentationDifference > 0 ? Math.abs(clueIndentationDifference) : 0) + Util.formatString(crossClue.number.toString().padStart(clueIndentation, ' ') + crossClue.direction + '. ' + crossClue.clue, this.width * 3, clueIndentation + 3) + RESET);
		}

		console.log(CLEAR_REST_OF_SCREEN);

		process.stdout.write(CURSOR_UP);
	}
	else {
		console.log(CLEAR_REST_OF_SCREEN);

		console.log('Press ENTER to begin.');
	}
};

Puzzle.prototype.mostlyFillIn = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (!this.grid[y][x].rebus) {
				this.grid[y][x].guess = this.grid[y][x].answer;
			}
		}
	}
};

Puzzle.prototype.isComplete = function() {
	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {
			if (this.grid[y][x].rebus && this.grid[y][x].guess != '-') {
				continue;
			}
			else if (this.grid[y][x].guess != this.grid[y][x].answer) {
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
	let totalSquares = 0;

	for (let y = 0; y < this.grid.length; y++) {
		for (let x = 0; x < this.grid[y].length; x++) {

			if (this.grid[y][x].answer != '.') {
				totalSquares += 1;

				if (this.grid[y][x].order != undefined && this.grid[y][x].order != 0) {
					guessOrders.push(this.grid[y][x].order);
				}
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
				this.grid[y][x].percentile = guessOrders.indexOf(this.grid[y][x].order) / totalSquares;
			}
		}
	}
};

Puzzle.prototype.showMinimaps = function(options) {
	process.stdout.write(SAVE_CURSOR);

	let changesLine = '';
	let orderLine = '';

	let notesLines = 1;

	if (this.notes.length > 0) {
		this.notes.split(/\n\n/).forEach((paragraph) => {
			notesLines += Util.formatString(paragraph, this.width * 3 + 3 + this.width, 0).split('\n').length + 1;
		});
	}


	for (let y = 0; y < this.grid.length; y++) {
		changesLine = '';
		orderLine = '';

		for (let x = 0; x < this.grid[y].length; x++) {
			if (options.solverMode.primary == 'title-screen') {
				changesLine += BACKGROUND(options.colors.squares.standard.uncircled.normal.background);
				orderLine += BACKGROUND(options.colors.squares.standard.uncircled.normal.background);
			}
			else if (this.grid[y][x].answer == '.') {
				changesLine += BACKGROUND(options.colors.squares.empty);
				orderLine += BACKGROUND(options.colors.squares.empty);
			}
			else if (this.grid[y][x].revealed) {
				changesLine += BACKGROUND(options.colors.guesses.revealed);
				orderLine += BACKGROUND(options.colors.guesses.revealed);
			}
			else {
				if (this.grid[y][x].changes <= 1) {
					changesLine += BACKGROUND(options.colors.minimaps.changes[0]);
				}
				else if (this.grid[y][x].changes == 2) {
					changesLine += BACKGROUND(options.colors.minimaps.changes[1]);
				}
				else {
					changesLine += BACKGROUND(options.colors.minimaps.changes[2]);
				}

				if (this.grid[y][x].percentile == undefined || this.grid[y][x].percentile < 0) {
					orderLine += BACKGROUND(options.colors.squares.standard.uncircled.normal.background);
				}
				else if (this.grid[y][x].percentile < options.colors.minimaps.solveOrder.percentiles[0].value) {
					orderLine += BACKGROUND(options.colors.minimaps.solveOrder.percentiles[0].color);
				}
				else if (this.grid[y][x].percentile < options.colors.minimaps.solveOrder.percentiles[1].value) {
					orderLine += BACKGROUND(options.colors.minimaps.solveOrder.percentiles[1].color);
				}
				else if (this.grid[y][x].percentile < options.colors.minimaps.solveOrder.percentiles[2].value) {
					orderLine += BACKGROUND(options.colors.minimaps.solveOrder.percentiles[2].color);
				}
				else if (this.grid[y][x].percentile < options.colors.minimaps.solveOrder.percentiles[3].value) {
					orderLine += BACKGROUND(options.colors.minimaps.solveOrder.percentiles[3].color);
				}
			}

			changesLine += (y == this.grid.length - 1) ? '▁' : ' ';
			orderLine += (y == 0) ? '▔' : ' ';
		}

		changesLine += RESET;
		orderLine += RESET;

		process.stdout.write(CURSOR_POSITION((this.grid[0].length * 3) + 1, 4 + notesLines + y));
		console.log(BACKGROUND_BLACK + FOREGROUND_GRAY_58 + ' │ ' + FOREGROUND_BLACK + changesLine);
		process.stdout.write(CURSOR_POSITION((this.grid[0].length * 3) + 1, 4 + notesLines + y + this.grid.length));
		console.log(BACKGROUND_BLACK + FOREGROUND_GRAY_58 + ' │ ' + FOREGROUND_BLACK + orderLine);
	}

	process.stdout.write(RESTORE_CURSOR);
};

Puzzle.prototype.moveCursor = function(direction, stopAtBlackCell, reverse, jumpToBlank) {
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

		for (candidateX; candidateX >= 0; candidateX--) {
			if (stopAtBlackCell && this.blackCellAt(candidateX, this.cursor.y)) {
				if (jumpToBlank) {
					this.cursorToFirstBlank();
				}

				return;
			}

			if (!this.blackCellAt(candidateX, this.cursor.y)) {
				if (!jumpToBlank || this.grid[this.cursor.y][candidateX].guess == '-') {
					break;
				}
			}
		}

		if (candidateX >= 0) {
			this.cursor.x = candidateX;
		}
		else {
			if (jumpToBlank) {
				this.cursorToFirstBlank();
			}
		}
	}
	else if (direction == 'right') {
		let candidateX = this.cursor.x + 1;

		for (candidateX; candidateX < this.grid[this.cursor.y].length; candidateX++) {
			if (stopAtBlackCell && this.blackCellAt(candidateX, this.cursor.y)) {
				if (jumpToBlank) {
					this.cursorToFirstBlank();
				}

				return;
			}

			if (!this.blackCellAt(candidateX, this.cursor.y)) {
				if (!jumpToBlank || this.grid[this.cursor.y][candidateX].guess == '-') {
					break;
				}
			}
		}

		if (candidateX < this.grid[this.cursor.y].length) {
			this.cursor.x = candidateX;
		}
		else {
			if (jumpToBlank) {
				this.cursorToFirstBlank();
			}
		}
	}
	else if (direction == 'up') {
		let candidateY = this.cursor.y - 1;

		for (candidateY; candidateY >= 0; candidateY--) {
			if (stopAtBlackCell && this.blackCellAt(this.cursor.x, candidateY)) {
				if (jumpToBlank) {
					this.cursorToFirstBlank();
				}

				return;
			}

			if (!this.blackCellAt(this.cursor.x, candidateY)) {
				if (!jumpToBlank || this.grid[candidateY][this.cursor.x].guess == '-') {
					break;
				}
			}
		}

		if (candidateY >= 0) {
			this.cursor.y = candidateY;
		}
		else {
			if (jumpToBlank) {
				this.cursorToFirstBlank();
			}
		}
	}
	else if (direction == 'down') {
		let candidateY = this.cursor.y + 1;

		for (candidateY; candidateY < this.grid.length; candidateY++) {
			if (stopAtBlackCell && this.blackCellAt(this.cursor.x, candidateY)) {
				if (jumpToBlank) {
					this.cursorToFirstBlank();
				}

				return;
			}

			if (!this.blackCellAt(this.cursor.x, candidateY)) {
				if (!jumpToBlank || this.grid[candidateY][this.cursor.x].guess == '-') {
					break;
				}
			}
		}

		if (candidateY < this.grid.length) {
			this.cursor.y = candidateY;
		}
		else {
			if (jumpToBlank) {
				this.cursorToFirstBlank();
			}
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

Puzzle.prototype.switchDirection = function(direction) {
	if (direction) {
		this.direction = direction;
	}
	else if (this.direction == 'across') {
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

Puzzle.prototype.cursorToNextClue = function() {
	if (this.direction == 'across') {
		let acrossIndex = this.grid[this.cursor.y][this.cursor.x].clues.across;

		acrossIndex++;

		if (acrossIndex >= this.acrosses.length) {
			this.switchDirection();
			this.moveCursorTo(this.downs[0].origin.x, this.downs[0].origin.y);
		}
		else {
			this.moveCursorTo(this.acrosses[acrossIndex].origin.x, this.acrosses[acrossIndex].origin.y);
		}
	}
	else if (this.direction == 'down') {
		let downIndex = this.grid[this.cursor.y][this.cursor.x].clues.down;

		downIndex++;

		if (downIndex >= this.downs.length) {
			this.switchDirection();
			this.moveCursorTo(this.acrosses[0].origin.x, this.acrosses[0].origin.y);
		}
		else {
			this.moveCursorTo(this.downs[downIndex].origin.x, this.downs[downIndex].origin.y);
		}
	}
};

Puzzle.prototype.cursorToPreviousClue = function() {
	if (this.direction == 'across') {
		let acrossIndex = this.grid[this.cursor.y][this.cursor.x].clues.across;

		acrossIndex--;

		if (acrossIndex < 0) {
			this.switchDirection();
			this.moveCursorTo(this.downs[this.downs.length - 1].origin.x, this.downs[this.downs.length - 1].origin.y);
		}
		else {
			this.moveCursorTo(this.acrosses[acrossIndex].origin.x, this.acrosses[acrossIndex].origin.y);
		}
	}
	else if (this.direction == 'down') {
		let downIndex = this.grid[this.cursor.y][this.cursor.x].clues.down;

		downIndex--;

		if (downIndex < 0) {
			this.switchDirection();
			this.moveCursorTo(this.acrosses[this.acrosses.length - 1].origin.x, this.acrosses[this.acrosses.length - 1].origin.y);
		}
		else {
			this.moveCursorTo(this.downs[downIndex].origin.x, this.downs[downIndex].origin.y);
		}
	}
}

Puzzle.prototype.cursorToFirstBlank = function() {
	let clue = this.getClueFor(this.cursor, this.direction);

	if (this.direction == 'across') {
		for (let i = 0; i < this.width; i++) {
			if (this.blackCellAt(clue.origin.x + i, clue.origin.y)) {
				return;
			}
			else if (this.grid[clue.origin.y][clue.origin.x + i].guess == '-') {
				this.cursor.x = clue.origin.x + i;
				return;
			}
		}
	}
	else if (this.direction == 'down') {
		for (let i = 0; i < this.height; i++) {
			if (this.blackCellAt(clue.origin.x, clue.origin.y + i)) {
				return;
			}
			else if (this.grid[clue.origin.y + i][clue.origin.x].guess == '-') {
				this.cursor.y = clue.origin.y + i;
				return;
			}
		}
	}
};

Puzzle.prototype.cursorToClue = function(number, direction) {
	direction = direction || this.direction;

	let acrossClue = this.acrosses.find(clue => clue.number == number);
	let downClue = this.downs.find(clue => clue.number == number);
	let clue;

	if (acrossClue && !downClue) {
		clue = acrossClue;
		direction = 'across';
	}
	else if (!acrossClue && downClue) {
		clue = downClue;
		direction = 'down';
	}
	else if (acrossClue && downClue) {
		if (direction == 'across') {
			clue = acrossClue;
		}
		else if (direction == 'down') {
			clue = downClue;
		}
	}
	
	if (clue) {
		this.moveCursorTo(clue.origin.x, clue.origin.y);
		this.direction = direction;
	}
};

Puzzle.prototype.cursorToFirstSquare = function() {
	let clue = this.getClueFor(this.cursor, this.direction);
	let firstBlankIndexInClue = this.firstBlankIndexIn(clue);
	let firstIndexInClue = this.firstIndexIn(clue);

	if (this.direction == 'across') {
		if (this.cursor.x == firstBlankIndexInClue || !firstBlankIndexInClue) {
			this.moveCursorTo(firstIndexInClue, clue.origin.y)
		}
		else if (this.cursor.x != firstIndexInClue) {
			this.moveCursorTo(firstBlankIndexInClue, clue.origin.y)
		}
	}
	else if (this.direction == 'down') {
		if (this.cursor.y == firstBlankIndexInClue || !firstBlankIndexInClue) {
			this.moveCursorTo(clue.origin.x, firstIndexInClue)
		}
		else if (this.cursor.y != firstIndexInClue) {
			this.moveCursorTo(clue.origin.x, firstBlankIndexInClue)
		}
	}
};

Puzzle.prototype.cursorToLastSquare = function() {
	let clue = this.getClueFor(this.cursor, this.direction);
	let lastBlankIndexInClue = this.lastBlankIndexIn(clue);
	let lastIndexInClue = this.lastIndexIn(clue);

	if (this.direction == 'across') {
		if (this.cursor.x == lastBlankIndexInClue || !lastBlankIndexInClue) {
			this.moveCursorTo(lastIndexInClue, clue.origin.y)
		}
		else if (this.cursor.x != lastIndexInClue) {
			this.moveCursorTo(lastBlankIndexInClue, clue.origin.y)
		}
	}
	else if (this.direction == 'down') {
		if (this.cursor.y == lastBlankIndexInClue || !lastBlankIndexInClue) {
			this.moveCursorTo(clue.origin.x, lastIndexInClue)
		}
		else if (this.cursor.y != lastIndexInClue) {
			this.moveCursorTo(clue.origin.x, lastBlankIndexInClue)
		}
	}
};

Puzzle.prototype.checksumSignature = function() {
	let signature = '';

	signature += ((this.checksum >> 12) & 0xF).toString(16);
	signature += ((this.checksum >> 8) & 0xF).toString(16);
	signature += ((this.checksum >> 4) & 0xF).toString(16);
	signature += ((this.checksum >> 0) & 0xF).toString(16);

	signature += ((this.cibChecksum >> 12) & 0xF).toString(16);
	signature += ((this.cibChecksum >> 8) & 0xF).toString(16);
	signature += ((this.cibChecksum >> 4) & 0xF).toString(16);
	signature += ((this.cibChecksum >> 0) & 0xF).toString(16);

	signature += ((this.maskedHighChecksum >> 28) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 24) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 20) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 16) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 12) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 8) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 4) & 0xF).toString(16);
	signature += ((this.maskedHighChecksum >> 0) & 0xF).toString(16);

	signature += ((this.maskedLowChecksum >> 28) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 24) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 20) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 16) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 12) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 8) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 4) & 0xF).toString(16);
	signature += ((this.maskedLowChecksum >> 0) & 0xF).toString(16);

	return signature;
};

Puzzle.prototype.saveProgress = function() {
	return;
	let puzzleDatabase = Util.openJsonFile(path.resolve(__dirname, '../puzzles.json'));
	let checksum = this.checksumSignature();

	let puzzle = puzzleDatabase.find(puzzleRecord => puzzleRecord._id == checksum);

	puzzle.complete = true;

	Util.saveJsonFile(path.resolve(__dirname, '../puzzles.json'), puzzleDatabase);
};

Puzzle.prototype.dropAnchor = function(x, y, direction) {
	this.anchor = { x: x, y: y, direction: direction };
};

Puzzle.prototype.weighAnchor = function() {
	if (this.anchor) {
		this.moveCursorTo(this.anchor.x, this.anchor.y);
		this.switchDirection(this.anchor.direction);

		this.removeAnchor();
	}
};

Puzzle.prototype.removeAnchor = function() {
	this.anchor = null;
};

module.exports = Puzzle;
