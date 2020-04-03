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

	return lines.join("\n");
};

Util.dateFormat = function(date, format) {
	let output = format;

	if (!date) {
		date = Date.now();
	}

	output = output.replace('%y', date.getFullYear().toString().substring(2));
	output = output.replace('%Y', date.getFullYear());
	output = output.replace('%m', (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1));
	output = output.replace('%d', (date.getDate() < 10 ? '0' : '') + date.getDate());

	return output;
};

module.exports = Util;
