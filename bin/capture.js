let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

let counter = 0;

stdin.on('data', key => {
	for (let i = 0; i < key.length; i++) {
		console.log(key.charCodeAt(i));
	}

	switch(key) {
		case '\x03':
			process.exit();
			break;

		case 'u':
			break;

		default:
			process.stdout.write(key);
			break;
	}
});
