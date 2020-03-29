#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let puzFile = fs.readFileSync(path.resolve(process.argv[2]));
let puzzle = new Puzzle(puzFile);

let index = 0;
let timer = null;

titleScreen();

function titleScreen() {
	puzzle.showSolverState('title');
	console.log();

	rl.question('Press ENTER to begin.', function() {
		timer = new Date();
		nextClue('across');
	});
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

	console.log();
	puzzle.showSolverState(mode, clue, words);
	console.log();

	let query = "";
	let clueIndentation = clue.clue.indexOf(' ') + 1;

	query += words.guess + ' (' + words.answer.length + ') ' + "\n\n";
	query += Util.formatString(clue.clue, puzzle.width * 3, clueIndentation) + "\n";
	query += "> ";

	rl.question(query, function(input) {
		if (input == '!@#$%') {
			puzzle.fillIn();
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

		console.log();

		puzzle.showSolverState(mode, clue, words);
		console.log();
		puzzle.showMinimaps();

		console.log();
		console.log('Completed in ' + Util.formatTimer(timer) + '!');

		process.exit();
	}
}
