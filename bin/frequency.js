let frequencies = {
	//a: 0.08167,
	b: 0.01492,
	c: 0.02202,
	d: 0.04253,
	//e: 0.12702,
	f: 0.02228,
	g: 0.02015,
	h: 0.06094,
	//i: 0.06966,
	j: 0.00153,
	k: 0.01292,
	l: 0.04025,
	m: 0.02406,
	n: 0.06749,
	//o: 0.07507,
	p: 0.01929,
	//q: 0.00095,
	r: 0.05987,
	s: 0.06327,
	t: 0.09356,
	//u: 0.02758,
	v: 0.00978,
	w: 0.02560,
	x: 0.00150,
	y: 0.01994,
	z: 0.00077
};

let withinFirst = {};
let characters = Object.keys(frequencies).length;

Object.keys(frequencies).forEach((character, i) => {
	let frequencyValues = Object.values(frequencies);

	withinFirst[character] = {};

	for (let n = 0; n < characters; n++) {
		withinFirst[character][n + 1] = 0;
	}

	for (let j = 0; j < characters; j++) {
		for (let k = j; k < characters; k++) {
			withinFirst[character][k + 1] += frequencyValues[(i + j) % characters];
		}
	}

});

let best = {};

for (let n = 1; n <= characters; n++) {
	let bestValue = 0;

	Object.keys(withinFirst).forEach(character => {
		if (withinFirst[character][n] > bestValue) {
			bestValue = withinFirst[character][n];
			best[n] = character;
		}
	});
}

console.log(best);
process.exit();
