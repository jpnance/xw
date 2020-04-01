const SAVE_CURSOR = "\033[s";
const RESTORE_CURSOR = "\033[u";
const CURSOR_UP = (lines) => { return "\033[" + lines + "A"; };
const CURSOR_DOWN = (lines) => { return "\033[" + lines + "B"; };
const CURSOR_LEFT = (columns) => { return "\033[" + columns + "C"; };
const CURSOR_RIGHT = (columns) => { return "\033[" + columns + "D"; };

let progresses = [ 0, 0, 0, 0, 0 ];

progresses.forEach((progress, i) => {
	setInterval(() => {
		if (progresses[i] == 10) {
			return;
		}

		progresses[i] += 1;
		printProgresses(progresses);
	}, Math.random() * 500);
});

printProgresses(progresses, true);

function printProgresses(progresses, initial) {
	process.stdout.write(SAVE_CURSOR);

	progresses.forEach((progress, i) => {
		console.log('Test ' + i + ': [' + '*'.repeat(progress) + ' '.repeat(10 - progress) + ']');
	});

	console.log();

	process.stdout.write(RESTORE_CURSOR);
	process.stdout.write(CURSOR_DOWN(progresses.length));

	let allDone = true;

	for (let i = 0; i < progresses.length; i++) {
		if (progresses[i] != 10) {
			allDone = false;
		}
	}

	if (allDone) {
		process.exit();
	}
};
