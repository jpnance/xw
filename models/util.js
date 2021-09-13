const fs = require('fs');
const path = require('path');

const CLEAR_LINE = "\033[K";

const UNDERLINE = "\x1b[4m";
const NO_UNDERLINE = "\x1b[24m";

function Util() {
}

Util.formatTimer = function(timer) {
	let hours = Math.floor(timer / 3600);
	let minutes = Math.floor((timer - (3600 * hours)) / 60);
	let seconds = timer % 60;

	let formattedTimer = '';

	if (hours > 0) {
		formattedTimer += hours + ':';

		if (minutes < 10) {
			formattedTimer += '0';
		}
	}

	formattedTimer += minutes + ':';

	if (seconds < 10) {
		formattedTimer += '0';
	}

	formattedTimer += seconds;

	return formattedTimer;
};

Util.formatString = function(string, width, indent, padLines) {
	let words = string.split(/ /);
	let line = '';
	let lines = [];

	width = Math.max(30, width || process.stdout.columns);
	indent = indent || 0;
	padLines = padLines || 1;

	words.forEach(function(word) {
		if (Util.realLength(line) + 1 + Util.realLength(word) > width) {
			line += CLEAR_LINE;
			lines.push(line);
			line = ' '.repeat(indent) + word;
		}
		else if (Util.realLength(line) == 0) {
			line += word;
		}
		else {
			line += ' ' + word;
		}
	});

	if (Util.realLength(line) > indent) {
		line += CLEAR_LINE;
		lines.push(line);
	}

	while (lines.length < padLines) {
		line += CLEAR_LINE;
		lines.push('');
	}

	for (let i = 0; i < lines.length; i++) {
		if (Util.realLength(lines[i]) < width) {
			lines[i] += ' '.repeat(width - Util.realLength(lines[i]));
		}
	}

	return lines.join("\n");
};

Util.dateFormat = function(date, format, adjustment) {
	let output = format;
	let localDate = new Date(date);

	if (adjustment != undefined) {
		localDate.setDate(localDate.getDate() + adjustment);
	}

	if (output.includes('%a')) {
		let day = localDate.getDay();
		let dayString;

		switch (day) {
			case 0: dayString = 'Sun'; break;
			case 1: dayString = 'Mon'; break;
			case 2: dayString = 'Tue'; break;
			case 3: dayString = 'Wed'; break;
			case 4: dayString = 'Thu'; break;
			case 5: dayString = 'Fri'; break;
			case 6: dayString = 'Sat'; break;
		}

		output = output.replace('%a', dayString);
	}

	if (output.includes('%A')) {
		let day = localDate.getDay();
		let dayString;

		switch (day) {
			case 0: dayString = 'Sunday'; break;
			case 1: dayString = 'Monday'; break;
			case 2: dayString = 'Tuesday'; break;
			case 3: dayString = 'Wednesday'; break;
			case 4: dayString = 'Thursday'; break;
			case 5: dayString = 'Friday'; break;
			case 6: dayString = 'Saturday'; break;
		}

		output = output.replace('%A', dayString);
	}

	if (output.includes('%b')) {
		let month = localDate.getMonth();
		let monthString;

		switch (month) {
			case 0: monthString = 'Jan'; break;
			case 1: monthString = 'Feb'; break;
			case 2: monthString = 'Mar'; break;
			case 3: monthString = 'Apr'; break;
			case 4: monthString = 'May'; break;
			case 5: monthString = 'Jun'; break;
			case 6: monthString = 'Jul'; break;
			case 7: monthString = 'Aug'; break;
			case 8: monthString = 'Sep'; break;
			case 9: monthString = 'Oct'; break;
			case 10: monthString = 'Nov'; break;
			case 11: monthString = 'Dec'; break;
		}

		output = output.replace('%b', monthString);
	}

	if (output.includes('%B')) {
		let month = localDate.getMonth();
		let monthString;

		switch (month) {
			case 0: monthString = 'January'; break;
			case 1: monthString = 'Febuary'; break;
			case 2: monthString = 'March'; break;
			case 3: monthString = 'April'; break;
			case 4: monthString = 'May'; break;
			case 5: monthString = 'June'; break;
			case 6: monthString = 'July'; break;
			case 7: monthString = 'August'; break;
			case 8: monthString = 'September'; break;
			case 9: monthString = 'October'; break;
			case 10: monthString = 'November'; break;
			case 11: monthString = 'December'; break;
		}

		output = output.replace('%B', monthString);
	}

	output = output.replace('%d', (localDate.getDate() < 10 ? '0' : '') + localDate.getDate());
	output = output.replace('%-d', localDate.getDate());
	output = output.replace('%m', (localDate.getMonth() < 9 ? '0' : '') + (localDate.getMonth() + 1));
	output = output.replace('%y', localDate.getFullYear().toString().substring(2));
	output = output.replace('%Y', localDate.getFullYear());

	return output;
};

Util.computeChecksum = function(data, checksum, debug) {
	if (debug) {
		console.log(data);
		console.log(String.fromCharCode.apply(null, data));
	}

	for (let i = 0; i < data.length; i++) {
		checksum = checksum & 0xFFFF;

		if (checksum & 0x0001) {
			checksum = (checksum >> 1) + 0x8000
		}
		else {
			checksum = checksum >> 1;
		}

		checksum += data[i];
	}

	return checksum;
};

Util.openJsonFile = function(filename) {
	let jsonFile;

	try {
		fs.accessSync(path.resolve(filename), fs.constants.R_OK);
	} catch (error) {
		fs.writeFileSync(path.resolve(filename), JSON.stringify([]));
	}

	jsonFile = fs.readFileSync(path.resolve(filename));

	return JSON.parse(jsonFile);
};

Util.saveJsonFile = function(filename, data) {
	fs.writeFileSync(path.resolve(filename), JSON.stringify(data));
};

Util.sanitizeClue = function(clue) {
	clue = clue.replace('‘', '\'');
	clue = clue.replace('’', '\'');
	clue = clue.replace('“', '"');
	clue = clue.replace('”', '"');
	clue = clue.replace('\'\'', '"');

	let italicizations = clue.match(/<i>(.*?)<\/i>/g);

	if (italicizations) {
		italicizations.forEach(function(italicization) {
			let words = italicization.replace(/<(\/)?i>/g, '').split(/ /);
			let replacementWords = [];

			words.forEach(function(word) {
				replacementWords.push(UNDERLINE + word + NO_UNDERLINE);
			});

			let replacementString = replacementWords.join(' ');

			clue = clue.replace(italicization, replacementString);
		});
	}

	clue = clue.replace(/<\/?.*?>/g, '');

	return clue;
};

Util.realLength = function(string) {
	return string.replace(UNDERLINE, '').replace(NO_UNDERLINE, '').length;
};

module.exports = Util;
