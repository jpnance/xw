var editor = {
	mode: 'command',

	grid: {
		height: 15,
		width: 15
	},

	keyHandler: (e) => {
	},

	renderGrid: () => {
		var domGrid = $('<div>').addClass('grid');

		for (var i = 0; i < editor.grid.height; i++) {
			var gridRow = $('<div>').addClass('row');

			for (var j = 0; j < editor.grid.width; j++) {
				var gridCell = $('<div>').addClass('cell');

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
