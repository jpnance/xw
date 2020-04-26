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

	width = width || process.stdout.columns;
	indent = indent || 0;
	padLines = padLines || 1;

	words.forEach(function(word) {
		if (line.length + 1 + word.length > width) {
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
		lines.push(line);
	}

	while (lines.length < padLines) {
		lines.push('');
	}

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].length < width) {
			lines[i] += ' '.repeat(width - lines[i].length);
		}
	}

	return lines.join("\n");
};

Util.dateFormat = function(date, format) {
	let output = format;

	if (!date) {
		date = new Date();
	}

	if (output.includes('%b')) {
		let month = date.getMonth();
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

	output = output.replace('%d', (date.getDate() < 10 ? '0' : '') + date.getDate());
	output = output.replace('%m', (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1));
	output = output.replace('%y', date.getFullYear().toString().substring(2));
	output = output.replace('%Y', date.getFullYear());

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

module.exports = Util;
