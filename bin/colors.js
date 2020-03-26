let output = '';

for (let i = 0; i < 256; i++) {
	if (i % 8 == 0) {
		output += "\x1b[0m";
		console.log(output);
		output = '';
	}

	output += "\u001b[48;5;" + i + "m ";

	if (i < 100) {
		output += ' ';
	}

	if (i < 10) {
		output += ' ';
	}

	output += i;
}

output += "\x1b[0m";
console.log(output);
output = '';

let colors = [
	{ r: 0xf0, g: 0x65, b: 0x43 },
	{ r: 0xf9, g: 0xa0, b: 0x3f },
	{ r: 0xf7, g: 0xd4, b: 0x88 },
	{ r: 0xea, g: 0xef, b: 0xb1 },
	{ r: 0xe9, g: 0xf7, b: 0xca }
];

for (let i = 0; i < colors.length; i++) {
	output += "\u001b[48;2;" + colors[i].r + ";" + colors[i].g + ";" + colors[i].b + "m    ";
}

output += "\x1b[0m";
console.log(output);
console.log(output);
output = '';

for (let i = 128; i < 256; i++) {
	if (i % 8 == 0) {
		output += "\x1b[0m";
		console.log(output);
		output = '';
	}

	output += "\u001b[48;2;255;" + i + ";" + i + "m    ";
}

output += "\x1b[0m";
console.log(output);
console.log(output);
output = '';

process.exit();
