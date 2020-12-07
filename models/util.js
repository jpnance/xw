const fs = require('fs');
const path = require('path');

const CLEAR_LINE = "\033[K";

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
		if (line.length + 1 + word.length > width) {
			line += CLEAR_LINE;
			lines.push(line);
			line = ' '.repeat(indent) + word;
		}
		else if (line.length == 0) {
			line += word;
		}
		else {
			line += ' ' + word;
		}
	});

	if (line.length > indent) {
		line += CLEAR_LINE;
		lines.push(line);
	}

	while (lines.length < padLines) {
		line += CLEAR_LINE;
		lines.push('');
	}

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].length < width) {
			lines[i] += ' '.repeat(width - lines[i].length);
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

	if (output.includes('%b')) {
		let month = localDate.getMonth();
		let monthString;

		if (month == 0) {
			monthString = 'Jan';
		}
		else if (month == 1) {
			monthString = 'Feb';
		}
		else if (month == 2) {
			monthString = 'Mar';
		}
		else if (month == 3) {
			monthString = 'Apr';
		}
		else if (month == 4) {
			monthString = 'May';
		}
		else if (month == 5) {
			monthString = 'Jun';
		}
		else if (month == 6) {
			monthString = 'Jul';
		}
		else if (month == 7) {
			monthString = 'Aug';
		}
		else if (month == 8) {
			monthString = 'Sep';
		}
		else if (month == 9) {
			monthString = 'Oct';
		}
		else if (month == 10) {
			monthString = 'Nov';
		}
		else if (month == 11) {
			monthString = 'Dec';
		}

		output = output.replace('%b', monthString);
	}

	output = output.replace('%d', (localDate.getDate() < 10 ? '0' : '') + localDate.getDate());
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

module.exports = Util;
