const Util = require('../models/util');
const Puzzle = require('../models/puzzle');

let options = process.argv.filter(function(option) { return option.startsWith('--'); });
let nonOptions = process.argv.filter(function(option) { return !option.startsWith('--'); });

let puzzle = new Puzzle();
puzzle.loadFromFile(nonOptions.pop());

console.log('in-file checksums');
console.log('-----------------');
console.log('checksum:', '0x' + puzzle.checksum.toString(16));
console.log('cib:', '0x' + puzzle.cibChecksum.toString(16));
console.log('mask1:', '0x' + ((puzzle.maskedLowChecksum & 0xFF000000) >> 24).toString(16));
console.log('mask2:', '0x' + ((puzzle.maskedLowChecksum & 0x00FF0000) >> 16).toString(16));
console.log('mask3:', '0x' + ((puzzle.maskedLowChecksum & 0x0000FF00) >> 8).toString(16));
console.log('mask4:', '0x' + (puzzle.maskedLowChecksum & 0x000000FF).toString(16));
console.log('mask1:', '0x' + ((puzzle.maskedHighChecksum & 0xFF000000) >> 24).toString(16));
console.log('mask2:', '0x' + ((puzzle.maskedHighChecksum & 0x00FF0000) >> 16).toString(16));
console.log('mask3:', '0x' + ((puzzle.maskedHighChecksum & 0x0000FF00) >> 8).toString(16));
console.log('mask4:', '0x' + (puzzle.maskedHighChecksum & 0x000000FF).toString(16));

puzzle.writeToFile('testo.puz');

console.log();

console.log('regenerated checksums');
console.log('---------------------');
console.log('checksum:', '0x' + puzzle.checksum.toString(16));
console.log('cib:', '0x' + puzzle.cibChecksum.toString(16));
console.log('mask1:', '0x' + ((puzzle.maskedLowChecksum & 0xFF000000) >> 24).toString(16));
console.log('mask2:', '0x' + ((puzzle.maskedLowChecksum & 0x00FF0000) >> 16).toString(16));
console.log('mask3:', '0x' + ((puzzle.maskedLowChecksum & 0x0000FF00) >> 8).toString(16));
console.log('mask4:', '0x' + (puzzle.maskedLowChecksum & 0x000000FF).toString(16));
console.log('mask1:', '0x' + ((puzzle.maskedHighChecksum & 0xFF000000) >> 24).toString(16));
console.log('mask2:', '0x' + ((puzzle.maskedHighChecksum & 0x00FF0000) >> 16).toString(16));
console.log('mask3:', '0x' + ((puzzle.maskedHighChecksum & 0x0000FF00) >> 8).toString(16));
console.log('mask4:', '0x' + (puzzle.maskedHighChecksum & 0x000000FF).toString(16));

process.exit();
