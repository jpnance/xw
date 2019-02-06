var editor = {
	mode: 'command',

	grid: {
		height: 15,
		width: 15,

		cursorPosition: 0
	},

	keyHandler: (e) => {
		console.log(e.keyCode);

		if (editor.mode == 'command') {
			switch (e.keyCode) {
				// j is for 'up'
				case 74:
					if (editor.grid.cursorPosition + editor.grid.height < editor.grid.height * editor.grid.width) {
						editor.grid.cursorPosition += editor.grid.height;
					}

					break;

				// k is for 'down'
				case 75:
					if (editor.grid.cursorPosition - editor.grid.height >= 0) {
						editor.grid.cursorPosition -= editor.grid.height;
					}

					break;

				// h is for 'left'
				case 72:
					if (editor.grid.cursorPosition % editor.grid.width > 0) {
						editor.grid.cursorPosition -= 1;
					}

					break;

				// l is for 'right'
				case 76:
					if (editor.grid.cursorPosition % editor.grid.width < editor.grid.width - 1) {
						editor.grid.cursorPosition += 1;
					}

					break;
			}
		}

		editor.renderGrid();
	},

	renderGrid: () => {
		var domGrid = $('<div>').addClass('grid');

		for (var i = 0; i < editor.grid.height; i++) {
			var gridRow = $('<div>').addClass('row');

			for (var j = 0; j < editor.grid.width; j++) {
				var gridCell = $('<div>').addClass('cell');

				if (i * editor.grid.height + j == editor.grid.cursorPosition) {
					gridCell.addClass('cursor');
				}

				gridRow.append(gridCell);
			}

			domGrid.append(gridRow);
		}

		$('body div.grid').replaceWith(domGrid);
	}
};

$(document).ready(function() {
	editor.renderGrid();

	$('body').on('keydown', editor.keyHandler);
});
