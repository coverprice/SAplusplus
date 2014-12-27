/**
 * Class definition for a thread listed in the Thread List page or the User Control Panel.
 */
Thread = function(id, row, author_name, author_id, vote_img, num_votes, rating) {
	var obj = {
		id: id							// Integer - Unique ID that identifies this Thread
		, row: row						// DOM "TR" object - Points to the table row in the DOM for this thread
		, author_name: author_name		// String - User name who made this thread
		, author_id: author_id			// Integer - User ID of the user who made this thread
		, visible: true					// Boolean - is this Thread currently visible?
		, vote_img: vote_img			// null | DOM "IMG" object that contains the 1-5 voting image.
		, num_votes: num_votes			// Integer - number of people that have voted on this thread
		, rating: rating				// Integer - average vote value (between 1 and 5)

		/**
		* Shows or hides a Thread, and marks it as such.
		* @param Boolean showHide - true to show, false to hide
		* @return Boolean - whether this changed the actual visiblity or not
		*/
		, showHide: function(showHide) {
			if(showHide != this.visible) {
				$(this.row).toggle(showHide);
				this.visible = showHide;
				return true;
			}
			return false;
		}
	};
	return obj;
};
