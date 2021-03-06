var editor = {
	mode: 'command',
	direction: 'horizontal',

	grid: {
		height: 15,
		width: 15,

		solution: '',

		cursorPosition: 0,

		cursorDown: () => {
			if (editor.grid.cursorPosition + editor.grid.height < editor.grid.height * editor.grid.width) {
				editor.grid.cursorPosition += editor.grid.height;
			}
		},

		cursorLeft: () => {
			if (editor.grid.cursorPosition % editor.grid.width > 0) {
				editor.grid.cursorPosition -= 1;
			}
		},

		cursorRight: () => {
			if (editor.grid.cursorPosition % editor.grid.width < editor.grid.width - 1) {
				editor.grid.cursorPosition += 1;
			}
		},

		cursorUp: () => {
			if (editor.grid.cursorPosition - editor.grid.height >= 0) {
				editor.grid.cursorPosition -= editor.grid.height;
			}
		},

		placeCharacter: (character) => {
			var newSolution = editor.grid.solution.slice(0, editor.grid.cursorPosition) + character + editor.grid.solution.slice(editor.grid.cursorPosition + 1, editor.grid.height * editor.grid.width);

			editor.grid.solution = newSolution;
		}
	},

	initialize: () => {
		if (editor.grid.solution.length < editor.grid.height * editor.grid.width) {
			editor.grid.solution = '';

			for (var i = 0; i < editor.grid.height * editor.grid.width; i++) {
				editor.grid.solution += '-';
			}
		}
	},

	keyHandler: (e) => {
		//console.log(e);
		console.log(e.keyCode);

		if (editor.mode == 'command') {
			switch (e.keyCode) {
				// j is for 'down'
				case 74:
				case 40:
					editor.grid.cursorDown();
					break;

				// k is for 'up'
				case 75:
				case 38:
					editor.grid.cursorUp();
					break;

				// h is for 'left'
				case 72:
				case 37:
					editor.grid.cursorLeft();
					break;

				// l is for 'right'
				case 76:
				case 39:
					editor.grid.cursorRight();
					break;

				// i is for 'switch to insert mode'
				case 73:
					editor.mode = 'insert';
					break;

				case 88:
					editor.grid.placeCharacter('-');

					if (editor.direction == 'horizontal') {
						editor.grid.cursorRight();
					}
					else if (editor.direction == 'vertical') {
						editor.grid.cursorDown();
					}

					break;

				// space is for 'change editor direction'
				case 32:
					if (editor.direction == 'horizontal') {
						editor.direction = 'vertical';
					}
					else {
						editor.direction = 'horizontal';
					}

					break;

				// v is for 'switch to vertical insert mode'
				case 86:
					editor.mode = 'insert';
					editor.direction = 'vertical';
					break;
			}
		}
		else if (editor.mode == 'insert') {
			switch (e.keyCode) {
				// esc is for 'exit insert mode and re-enter command mode'
				case 27:
					editor.mode = 'command';
					break;

				case 48:
				case 49:
				case 50:
				case 51:
				case 52:
				case 53:
				case 54:
				case 55:
				case 56:
				case 57:
				case 65:
				case 66:
				case 67:
				case 68:
				case 69:
				case 70:
				case 71:
				case 72:
				case 73:
				case 74:
				case 75:
				case 76:
				case 77:
				case 78:
				case 79:
				case 80:
				case 81:
				case 82:
				case 83:
				case 84:
				case 85:
				case 86:
				case 87:
				case 88:
				case 89:
				case 90:
				case 173:
				case 190:
					editor.grid.placeCharacter(e.originalEvent.key);

					if (editor.direction == 'horizontal') {
						editor.grid.cursorRight();
					}
					else if (editor.direction == 'vertical') {
						editor.grid.cursorDown();
					}

					break;

				case 40:
					if (editor.grid.cursorPosition + editor.grid.height < editor.grid.height * editor.grid.width) {
						editor.grid.cursorPosition += editor.grid.height;
					}

					break;

				case 38:
					if (editor.grid.cursorPosition - editor.grid.height >= 0) {
						editor.grid.cursorPosition -= editor.grid.height;
					}

					break;

				case 37:
					if (editor.grid.cursorPosition % editor.grid.width > 0) {
						editor.grid.cursorPosition -= 1;
					}

					break;

				case 39:
					if (editor.grid.cursorPosition % editor.grid.width < editor.grid.width - 1) {
						editor.grid.cursorPosition += 1;
					}

					break;

				case 8:
					if (editor.direction == 'horizontal') {
						editor.grid.cursorLeft();
					}
					else {
						editor.grid.cursorUp();
					}

					editor.grid.placeCharacter('-');
					break;
			}
		}

		editor.renderGrid();
	},

	renderGrid: () => {
		var domGrid = $('<div>').addClass('grid');

		if (editor.mode == 'insert') {
			domGrid.addClass('editing');
		}

		for (var i = 0; i < editor.grid.height; i++) {
			var gridRow = $('<div>').addClass('row');

			for (var j = 0; j < editor.grid.width; j++) {
				var gridCell = $('<div>').addClass('cell');
				var cellIndex = i * editor.grid.height + j;

				if (cellIndex == editor.grid.cursorPosition) {
					gridCell.addClass('cursor');
				}

				if (editor.direction == 'horizontal' && Math.floor(cellIndex / editor.grid.width) == Math.floor(editor.grid.cursorPosition / editor.grid.width)) {
					gridCell.addClass('shaded');
				}
				else if (editor.direction == 'vertical' && Math.floor(cellIndex % editor.grid.height) == Math.floor(editor.grid.cursorPosition % editor.grid.height)) {
					gridCell.addClass('shaded');
				}

				if (editor.grid.solution[cellIndex] == '-') {
					gridCell.append('&nbsp;');
				}
				else if (editor.grid.solution[cellIndex] == '.') {
					gridCell.addClass('filled');
					gridCell.append('&nbsp;');
				}
				else {
					gridCell.text(editor.grid.solution[cellIndex]);
				}

				gridRow.append(gridCell);
			}

			domGrid.append(gridRow);
		}

		$('body div.grid').replaceWith(domGrid);
	}
};

$(document).ready(function() {
	editor.initialize();
	editor.renderGrid();

	$('body').on('keydown', editor.keyHandler);
});
