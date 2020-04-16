let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

let counter = 0;

stdin.on('data', key => {
	switch(key) {
		case '\u0003':
			process.exit();
			break;

		case 'u':
			break;

		default:
			process.stdout.write(key);
			break;
	}
});
