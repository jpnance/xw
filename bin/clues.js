const path = require('path');
const fs = require('fs');

const Puzzle = require('../models/puzzle');

let puzFile = fs.readFileSync(path.resolve(process.argv[2]));
let puzzle = new Puzzle(puzFile);

console.log(puzzle.acrosses);
console.log(puzzle.downs);
