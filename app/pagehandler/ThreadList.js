/**
 * ----------------------------------
 * ThreadList
 * ----------------------------------
 * Contains function that deal with the Thread List page (the one that shows a list of threads)
 */
ThreadList= {
	threads: []                      // List of Thread objects in the Thread List page

	/**
	* Parses the Thread List page to build the array of Threads, so that they can be more easily manipulated.
	*/
	, buildThreadList: function() {
		this.threads = [];
		var thread_re = /^thread([0-9]+)$/;
		var author_id_re = /userid=([0-9]+)/;
		var vote_re = new RegExp('^(\\d+) votes - ([.\\d]+) average$');

		var rows = Util.getNodes('.//table[@id="forum"]/tbody/tr');
		for(var i = 0; i < rows.length; i++) {
			row = rows[i];
			var id = (row.id) ? parseInt(row.id.match(thread_re)[1]) : null;
			var author_node = Util.getNodes('.//td[@class="author"]', row)[0];
			if(!author_node.firstChild) {
				continue;
			}
			var author_name = author_node.firstChild.textContent;
			var author_id = parseInt(author_node.firstChild.href.match(author_id_re)[1]);

			// Determine this thread's rating
			var num_votes = 0;
			var rating = 0;
			var rating_img = Util.getNodes('.//td[@class="rating"]//img', row)[0];
			if(rating_img) {
				var res = rating_img.title.match(vote_re);
				num_votes = parseInt(res[1]);
				rating = parseFloat(res[2]);
			}

			var thread = new Thread(id, row, author_name, author_id, rating_img, num_votes, rating);
			this.threads.push(thread);
		}
	}

	/**
	* Called whenever the hellban preference changes.
	* Shows/hides each thread depending on hellbanned status
	* @return Boolean - true if refreshing caused any threads to be hidden
	*/
	, refresh: function() {
		var num_hidden_threads = 0;
		var i = this.threads.length;
		while(i--) {
			var thread = this.threads[i];
			if(!Prefs.is_hellbanning_enabled) {
				thread.showHide(true);
				continue;
			}
			if(Users.isHellbanned(thread.author_id)) {
				num_hidden_threads++;
			}
			thread.showHide(!Users.isHellbanned(thread.author_id));
		}
		document.getElementById('num_blocked_elements').innerHTML = num_hidden_threads + " threads";
		return (num_hidden_threads > 0);
	}

	/**
	* In forums such as FYAD, the minimum number of ratings required to show the ratings image is very low which
	* makes it hard to find worthwhile threads. This function will hide the ratings image in threads that don't
	* have enough votes.
	*/
	, fixUpRatings: function() {
		var i = this.threads.length;
		while(i--) {
			var t = this.threads[i];
			if(t.num_votes <= 5 && t.vote_img) {
				t.vote_img.style.display = "none";
			}
		}
	}

	/**
	* Moves the ratings column over to the left of the thread title, to make it easier to see a thread's rating.
	*/
	, moveRatings: function() {
		var forum_table = document.getElementById('forum');

		var title_idx = 2;
		var rating_idx = 6;
		if(Page.forumIsAskTell()) { // Ask/Tell has an extra column
			title_idx++;
			rating_idx++;
		}

		// Move the header
		var tr = Util.getNodes('.//tr', forum_table)[0];
		title = tr.children[title_idx];
		rating = tr.children[rating_idx];
		title.parentNode.insertBefore(Util.removeElement(rating), title);

		// Move the thread columns
		var i = this.threads.length;
		while(i--) {
			var t = this.threads[i];
			title = t.row.children[title_idx];
			rating = t.row.children[rating_idx];
			title.parentNode.insertBefore(Util.removeElement(rating), title);
		}
	}

	/**
	* Run from main. This is where the page is adjusted as it sees fit.
	*/
	, handle: function () {
		this.buildThreadList();
  
		Page.fixPrevNextButtons("pages");
		Page.fixPrevNextButtons("pages bottom");
		this.fixUpRatings();
		this.moveRatings();

		Page.addConfigUi([], true);

		this.refresh();
	}
};
