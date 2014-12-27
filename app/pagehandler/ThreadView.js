/**
 * ----------------------------------
 * ThreadView
 * ----------------------------------
 * Deals with the Thread View page (the one that shows posts)
 */
ThreadView = {
	/**
	 * List of Post objects in the Thread View page
	 */
	posts: []

	/**
	 * integer - this thread's ID
	 */
	, thread_id: null
	
	/**
	 * string - this thread's title
	 */
	, thread_title: null

	/**
	* Adds the UI to each post that allows the user to manipulate this post/poster
	*/
	, addPerPostUi: function() {
		var i = this.posts.length;
		while(i--) {
			var p = this.posts[i];
			$('<li></li>')
				.html('<a id="postindex' + i + '" href="javascript:void(0)">'
					+ (Users.isHellbanned(p.author_id) ? "<b>Unhellban</b>" : "Hellban")
					+ '</a>')
				.on('click', Util.bindAsEventHandler(this.toggleHellbanHandler, this))
				.appendTo($('ul.profilelinks', p.table));
		}  
	}

	/**
	* Event handler for when the user clicks on the link to ban/unban someone
	* @param Event e - the click target
	*/
	, toggleHellbanHandler: function (e) {
		var p = this.posts[parseInt(e.target.id.substr(9))];
		var ok;
		var hb = Users.isHellbanned(p.author_id);
		if(hb) {
			ok = confirm("Unban '" + p.author_name + "'?");
		} else {
			ok = confirm("Hide all posts and quotes by " + p.author_name + "?");
		}
		if(!ok) {
			return;
		}
		var u = Users.getOrCreateUser(p.author_id, p.author_name);
		u.isHellbanned = !hb;
		Prefs.saveHellbanPrefs();
		this.refresh();
	}

	/**
	 * Parses the Thread View page to build the array of Posts, so that they can be more easily manipulated.
	 */
	, buildPostList: function() {
		this.posts = [];
		var post_tables = Util.getNodes('.//div[@id="thread"]/table');
		for(var i = 0; i < post_tables.length; i++) {
			this.posts.push(this.parsePost(post_tables[i]));
		}
	}

	/**
	 * @param table - the DOM <table> element that contains a post
	 * @return Post - a new Post object that contains information about that post
	 */
	, parsePost: function(table) {
		var author_id, postbody, author_name, name_node;
		var post_id_re = /^post(\d+)$/;
		var user_id_re = /userid-(\d+)/;
		var post_id = (table.id && post_id_re.test(table.id)) ? parseInt(table.id.match(post_id_re)[1]) : '';

		var td = Util.getNodes('.//td', table)[0];
			// Find author ID, author_name node and postbody
		if(Page.forumIsFyad() || Page.forumIsFyadGoldmine()) {
			var uinfo = td.firstElementChild.nextElementSibling;
			author_id = parseInt(uinfo.className.match(user_id_re)[1]);
			postbody = td.firstElementChild;
			name_node = uinfo.firstElementChild.firstElementChild.nextElementSibling;
		} else {
			author_id = parseInt(td.className.match(user_id_re)[1]);
			postbody = td.nextElementSibling;
			if(postbody.firstElementChild
				&& postbody.firstElementChild.tagName === "DIV"
				&& postbody.firstElementChild.className === "cancerous") {
					postbody = postbody.firstElementChild;
			}
			name_node = td.firstElementChild.firstElementChild;
		}
		
		// Parse author name
		if(name_node.firstChild && name_node.firstChild.tagName === "IMG") { // Deal with Moderator stars
			author_name = name_node.childNodes[1].textContent.replace(/^\s+/, "");
		} else {
			author_name = name_node.firstChild.textContent;
		}
		return new Post(table, postbody, post_id, author_name, author_id);
	}

	/**
	 * Called whenever the hellban preference changes
	 * Examines each post and decide whether to show/hide it.
	 * @return Boolean - true if refreshing caused any posts to be hidden
	 */
	, refresh: function() {
		var num_hidden_posts = 0;
		var posts_changed = false;
		var is_image_thread = Prefs.isImageThread(this.thread_id);
		var is_quotes_thread = (/quote/i.test(this.thread_title));
		var enable_low_content_filtering = Prefs.lowcontentposts_filtering_enabled && !is_quotes_thread;
		for(var i = 0; i < this.posts.length; i++) {
			var is_visible = this.posts[i].isVisible(is_image_thread, enable_low_content_filtering);
			posts_changed |= this.posts[i].showHide(is_visible);
			if(!is_visible) {
				num_hidden_posts++;
			}
		}
		if(posts_changed) {
			this.restripePosts();
		}
		$('#num_blocked_elements').html(num_hidden_posts + " posts");
		return (posts_changed);
	}

	/**
	* Re-adjust the seen/unseen CSS so that the alternating post coloring isn't affected by invisible posts
	*/
	, restripePosts: function () {
		var toggle = 1;
		var base_class_name = 'seen';

		for(var i = 0, j = this.posts.length; i < j ; i++) {
			if(!this.posts[i].visible) {
				continue;
			}
			var post = this.posts[i].table;
			var tr = post.firstElementChild.firstElementChild;
			if(tr.className.indexOf('altcolor') === 0) {
				base_class_name = 'altcolor';
			}
			var new_class_name = base_class_name + toggle;
			if(tr.className != new_class_name) {
				tr.className = new_class_name;
				if(tr.nextElementSibling) {
					tr.nextElementSibling.className = new_class_name;
				}
			}
			toggle ^= 3; // Toggle between 1 and 2
		}
	}

	/**
	* Adds the image filename to the images title so that it can be easily viewed by mousing over it.
	* This is useful for when a punchline or other useful info is
	* hidden within the filename.
	*/
	, showImageFilename: function() {
		var imgs = Util.getNodes('.//img');
		var re = new RegExp('/([^/]+)/?$'); // Get the characters after the last forward slash
		var i = imgs.length;
		while(i--) {
			if(!imgs[i].title) {
				imgs[i].title = imgs[i].src.match(re)[1];
			}
		}
	}

	/**
	* Strips images from quotes.
	* @param integer max_num - The maximum number of images allowed in a quote (removes from the end of the post)
	*/
	, removeImagesFromQuotes: function(max_num) {
		var p, i, j, k, nodes, skip, images, images_removed;
		i = this.posts.length;
		while(i--) {
			p = this.posts[i];
			nodes = p.getQuotes();
			j = nodes.length;
			while(j--) {
				skip = max_num;
				images = Util.getNodes('.//img', nodes[j]);
				images_removed = false;
				for(k = 0; k < images.length; k++) {
					if(!Util.isEmoticon(images[k])) {
						if(skip) {
							skip--;
						} else {
							Util.removeElement(images[k]);
							images_removed = true;
						}
					}
				}
			}
			if(images_removed) {
				p.trimWhitespace();
			}
		}
	}

	/**
	* Strips a page of the information/links line beneath each post, and the User's regdate
	*/
	, removePostInfo: function() {
		var nodes = Util.getNodes('.//td[@class="postdate"]');
		var i = nodes.length;
		while(i--) {
			Util.removeElement(nodes[i].parentNode);
		}

		nodes = Util.getNodes('.//dl[@class="userinfo"]/dd[@class="registered"]');
		i = nodes.length;
		while(i--) {
			Util.removeElement(nodes[i]);
		}
	}

	/**
	* Strips each post of the "Edited by..." paragraph
	*/
	, removeEditedBy: function() {
		var nodes = Util.getNodes('.//p[@class="editedby"]');
		var i = nodes.length;
		while(i--) {
			Util.removeElement(nodes[i]);
		}
	}

	/**
	* Strips a page of custom titles.
	*/
	, removeAvatars: function() {
		var nodes = Util.getNodes('.//dl[@class="userinfo"]/dd[@class="title"]');
		var i = nodes.length;
		while(i--) {
			Util.removeElement(nodes[i]);
		}
	}

	/**
	* Removes many elements from the page in an effort to make it easier to skimread the thread.
	* TODO: collapse large quotes.
	*/
	, streamlinePage: function() {
		this.removeAvatars();
		this.removePostInfo();
		this.removeEditedBy();
		this.removeImagesFromQuotes(0);
		var i = this.posts.length;
		while(i--) {
			this.posts[i].trimWhitespace();
		}
	}

	/**
	* Add title/body rows to the configuration UI.
	* @param rows Array - Array of config rows that will be on every page
	*/
	, getUiRows: function () {
		return [
			'<input type="checkbox" id="image_thread"> Hide non-image posts in this thread (preference is stored per-thread).'

			, '<input type="checkbox" id="low_content_posts"> Hide posts with no text or images.'

			, '<input type="checkbox" id="hide_avatars"> Hide avatars and custom titles. ' +
				'<span id="avatars_warning" style="color:red; display:none">Refresh the page to see avatars</span>'

			, '<input type="checkbox" id="streamline_enabled"> Strip out extraneous content for quick thread skimming. ' +
				'<span id="streamline_warning" style="color:red; display:none">Refresh the page to re-display content</span>'
		];
	}

	/**
	* Called from Page.buildConfigUi once the UI has been displayed. This is where we initialize the
	* widget values and attach event handlers.
	*/
	, initConfigUi: function() {
		var cb = document.getElementById('image_thread');
		cb.checked = Prefs.isImageThread(this.thread_id);
		cb.addEventListener('click', Util.bindAsEventHandler(this.imageThreadHandler, this), false);

		cb = document.getElementById('low_content_posts');
		cb.checked = Prefs.lowcontentposts_filtering_enabled;
		cb.addEventListener('click', Util.bindAsEventHandler(this.lowContentPostsHandler, this), false);

		cb = document.getElementById('hide_avatars');
		cb.checked = !Prefs.avatars_enabled;
		cb.addEventListener('click', Util.bindAsEventHandler(this.hideAvatarsHandler, this), false);

		cb = document.getElementById('streamline_enabled');
		cb.checked = Prefs.streamline_enabled;
		cb.addEventListener('click', Util.bindAsEventHandler(this.streamlineHandler, this), false);
	}

	/**
	* Event handler for when user clicks the Image Thread enable checkbox.
	*/
	, imageThreadHandler: function(e) {
		var new_value = e.target.checked;
		var in_list = Prefs.isImageThread(this.thread_id);
		if(new_value && !in_list) {
			Prefs.addImageThread(this.thread_id);
		} else if(!new_value && in_list) {
			Prefs.removeImageThread(this.thread_id);
		}
		if(new_value != in_list) {
			Prefs.saveImageThreadPrefs();
			this.refresh();
		}
	}

	/**
	* Event handler for when user clicks the Low Content Posts filter checkbox.
	*/
	, lowContentPostsHandler: function(e) {
		Prefs.lowcontentposts_filtering_enabled = e.target.checked;
		Prefs.saveLowContentPostsPrefs();
		this.refresh();
	}

	/**
	* Event handler for when user clicks the "Hide Avatars" filter checkbox.
	*/
	, hideAvatarsHandler: function(e) {
		Prefs.avatars_enabled = !e.target.checked;
		if(Prefs.avatars_enabled) {
			// It was previously disabled, which means avatars were stripped. They won't see the avatars until they refresh
			// so warn them.
			$('#avatars_warning').show();
		} else {
			this.removeAvatars();
		}
		Prefs.saveAvatarPrefs();
	}

	/**
	* Event handler for when user clicks the "Streamline page" filter checkbox.
	*/
	, streamlineHandler: function(e) {
		Prefs.streamline_enabled = e.target.checked;
		if(Prefs.streamline_enabled) {
			this.streamlinePage();
		} else {
			// It was previously enabled, which means posts were streamlined. They won't see the stripped content until they refresh
			// so warn them.
			$('#streamline_warning').show();
		}
		Prefs.saveStreamlinePrefs();
	}
	
	/**
	* The currently highlighted Post
	*/
	, highlightedPost: null
	/**
	* Event handler for when the window URL's hash function changes
	* Note: This is also called once when the page inits, so don't use the 'event' parameter.
	*/
	, hashChangeHandler: function(event) {
	    var hash = window.location.hash;
		if(!(/#post\d+/.test(hash))) {
			return;
		}
		var post_id = parseInt(hash.substr(5));
		if(this.highlightedPost !== null) {
			this.highlightedPost.highlight(false);
		}
		for(var i = 0, l = this.posts.length; i < l; i++) {
			if(this.posts[i].post_id === post_id) {
				this.highlightedPost = this.posts[i];
				this.highlightedPost.highlight(true);
				break;
			}
		}
	}
	
	, calculateQuoteCount: function() {
		var post_re = /#post(\d+)$/;
		var post_id_counts = {}; // map of post_id -> number of times quoted

		for(var i = 0; i < this.posts.length; i++) {
			var nodes = this.posts[i].postbody.childNodes;
			for(var j = 0, len = nodes.length; j < len; j++) {
				if(Util.getNodeType(nodes[j]) === 'quote') {
					// Once we've found a quote, attempt to find the ID of the post it's quoting
					var a = $('a', nodes[j]);
					if(a.length) {
						var res = a.attr('href').match(post_re);
						if(res) {
							// Increment the count for that post_id
							var post_id = res[1];
							if(post_id_counts[post_id] === undefined) {
								post_id_counts[post_id] = 0;
							}
							post_id_counts[post_id]++;
						}
					}
				}
			}
		}

		for(var i = 0; i < this.posts.length; i++) {
			var p = this.posts[i];
			var count = post_id_counts[p.post_id.toString()];
			if(count > 1) {	// Needs at least 2 quotes for this to be useful.
				$('<li></li>')
					.html('<img src="http://i.somethingawful.com/forumsystem/emoticons/emot-h.png"> ' + count)
					.appendTo($('ul.profilelinks', p.table));
			}
		}
	}

	// Remove the "Nice!" button from Yospos threads.
	, removeNiceButton: function() {
		// We need to wait for the forum JS that adds the button to complete.
		setTimeout(function() {
			$('button.nice').parent().remove();
			}
			, 50); // Wait 50ms
	}
	
	/**
	* Run by Page once, immediately after the page loads.
	*/
	, handle: function () {
		this.thread_id = parseInt(/threadid=([0-9]+)/.exec(window.location)[1]);
		this.thread_title = $('.breadcrumbs a.bclast').first().text();
		this.buildPostList();

		Page.addConfigUi(this.getUiRows(), true);
		this.initConfigUi();

		var page_changed = false;
		this.showImageFilename();
		Page.fixPrevNextButtons("pages top");
		Page.fixPrevNextButtons("pages bottom");
		Page.fixupCss();
		this.removeNiceButton();
		page_changed |= this.removeImagesFromQuotes(3);

		this.addPerPostUi(); // i.e. add Hellban button
		
		this.calculateQuoteCount();
		
		if(Prefs.is_hellbanning_enabled) {
			for(var i = 0; i < this.posts.length; i++) {
				page_changed |= this.posts[i].stripHellbannedQuotes();
			}
		}

		if(!Prefs.avatars_enabled) {
			this.removeAvatars();
			page_changed = true;
		}

		if(Prefs.streamline_enabled) {
			this.streamlinePage();
		}

		page_changed |= this.refresh();
		
		$(window).on('hashchange', $.proxy(this.hashChangeHandler, this));
		this.hashChangeHandler(); // highlight the anchored post, if there is one.

		if(page_changed) {
			//re-anchor to the hash since the page will have jiggled about with all this element removing.
	        if(window.location.hash) {
				var post = $(window.location.hash);
				if(post.length) {
					var coords = post.offset();
					$("html,body").animate({
						scrollTop: coords.top,
						scrollLeft: coords.left
					});
				}
			}
		}
	}
};
