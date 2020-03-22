const path = require('path');
const fs = require('fs');

let puzFile = fs.readFileSync(path.resolve(process.argv[2]));

parsePuzFile(puzFile);

function parsePuzFile(puzFile) {
	let checksum = (puzFile[0x01] << 4) | puzFile[0x00];
	let fileMagic = puzFile.slice(0x02, 0x0C + 1);

	let cibChecksum = (puzFile[0x0F] << 4) | puzFile[0x0E];
	let maskedLowChecksum = puzFile[0x10] & puzFile[0x11] & puzFile[0x12] & puzFile[0x13];
	let maskedHighChecksum = puzFile[0x14] & puzFile[0x15] & puzFile[0x16] & puzFile[0x17];

	let versionString = String.fromCharCode(puzFile[0x18]) + String.fromCharCode(puzFile[0x19]) + String.fromCharCode(puzFile[0x1A]);
	let reserved1C = (puzFile[0x1D] << 4) | puzFile[0x1C];
	let scrambledChecksum = (puzFile[0x1F] << 4) | puzFile[0x1E];
	let reserved20 = 0; // bytes from 0x20 to 0x2B; probably garbage
	let width = puzFile[0x2C];
	let height = puzFile[0x2D];
	let numberOfClues = (puzFile[0x2F] << 4) | puzFile[0x2E];
	let unknownBitmask = (puzFile[0x31] << 4) | puzFile[0x30];
	let scrambledTag = (puzFile[0x33] << 4) | puzFile[0x32];

	let answerGrid = [];
	let solverGrid = [];

	for (let y = 0; y < height; y++) {
		answerGrid[y] = ""
		solverGrid[y] = ""

		for (let x = 0; x < width; x++) {
			answerGrid[y] += String.fromCharCode(puzFile[0x34 + x + (y * width)]);
			solverGrid[y] += String.fromCharCode(puzFile[0x34 + x + (y * width) + (width * height)]);
		}
	}

	let puzzleStateOffset = 0x34 + (2 * width * height);
	let stringIndex = puzzleStateOffset + 1;

	let title = "";

	while (puzFile[++stringIndex] != 0x00) {
		title += String.fromCharCode(puzFile[stringIndex]);
	}

	let author = "";

	while (puzFile[++stringIndex] != 0x00) {
		author += String.fromCharCode(puzFile[stringIndex]);
	}

	let copyright = "";

	while (puzFile[++stringIndex] != 0x00) {
		copyright += String.fromCharCode(puzFile[stringIndex]);
	}

	let clues = [];

	for (let i = 0; i < numberOfClues; i++) {
		clues[i] = "";

		while (puzFile[++stringIndex] != 0x00) {
			clues[i] += String.fromCharCode(puzFile[stringIndex]);
		}
	}

	let notes = "";

	while (puzFile[++stringIndex] != 0x00) {
		notes += String.fromCharCode(puzFile[stringIndex]);
	}

	let acrosses = [];
	let downs = [];
	let clueNumber = 1;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let newClue = false;

			if (isBlackCell(solverGrid, x, y)) {
				continue;
			}

			if (needsAcrossNumber(solverGrid, x, y)) {
				let clue = clues.shift();
				acrosses.push(clueNumber + '. ' + clue);
				newClue = true;
			}

			if (needsDownNumber(solverGrid, x, y)) {
				let clue = clues.shift();
				downs.push(clueNumber + '. ' + clue);
				newClue = true;
			}

			if (newClue) {
				clueNumber++;
			}
		}
	}

	console.log(acrosses);
	console.log(downs);
}

function isBlackCell(grid, x, y) {
	return grid[y][x] == '.';
}

function needsAcrossNumber(grid, x, y) {
	if (x == 0 || isBlackCell(grid, x - 1, y)) {
		return true;
	}

	return false;
}

function needsDownNumber(grid, x, y) {
	if (y == 0 || isBlackCell(grid, x, y - 1)) {
		return true;
	}

	return false;
}
