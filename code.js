/**
 * =================
 * CLASS DEFINITIONS
 * =================
 */

/**
 * Class definition for a SA User
 */
function User(id, name) {
	this.id = id;					// Integer - User ID
	this.name = name;				// String - this user's name
	this.isHellbanned = false;		// Boolean - true if the user is Hellbanned.
}

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

/**
 * Within the ThreadView page, contains information about a single post
 */
Post = function(table, postbody, post_id, author_name, author_id) {
	var obj = {
		table: table				// DOM "TABLE" object - Points to the Table object in the DOM that contains this post.
		, postbody: postbody		// DOM "TD" object - Points to the TD object containing the actual post.
		, post_id: post_id			// Unique ID for each post (assigned by SA server)
		, author_name: author_name	// String - The name of the user who made this post
		, author_id: author_id		// Integer - The user ID of the user who made this post
		, visible: true				// Boolean - is this Post visible?
		
		/**
		 * Shows or hides a Post, and marks it as such.
		 * @param Boolean showHide - true to show, false to hide
		 * @return Boolean - whether this changed the actual visiblity or not
		 */
		, showHide: function(showHide) {
			if(showHide != this.visible) {
				$(this.table).toggle(showHide);
				this.visible = showHide;
				return true;
			}
			return false;
		}
		/**
		 * Returns true if the Post has an image attachment
		 * @return Boolean
		 */
		, hasImageAttachment: function() {
			return (Util.getNodes('./p[@class="attachment"]/img', this.postbody).length > 0);
		}

		/**
		 * Returns true if the Post contains images (not counting emoticons, not within quoted sections)
		 * or links.
		 * @return Boolean
		 */
		, containsImagesOrLinks: function() {
			var images = Util.getNodes('./img', this.postbody);
			var i = images.length;
			while(i--) {
				if(!Util.isEmoticon(images[i])) {
					return true;
				}
			}
			if(this.hasImageAttachment()) {
				return true;
			}
			var links = Util.getNodes('./a', this.postbody);
			return (links.length > 0);
		}

		/**
		 * Returns true if the Post is "low content", meaning that it doesn't contain any images or text (i.e. just quotes/emoticons)
		 * @return Boolean
		 */
		, isLowContent: function() {
			var cn = this.postbody.childNodes;
			var i = cn.length;
			while(i--) {
				var node_type = Util.getNodeType(cn[i]);
				switch(node_type) {
				case 'image':
				case 'link':
				case 'text':
					return false;
				}
			}
			// Couldn't find any content.
			return !this.hasImageAttachment();
		}

		, trimWhitespace: function() {
			Util.trimWhitespace(this.postbody);

			// Trim all sub quotes
			var quotes = this.getQuotes();
			var i = quotes.length;
			while(i--) {
				Util.trimWhitespace(quotes[i]);
			}
		}

		, getQuotes: function() {
			return Util.getNodes('.//div[contains(@class, "bbc-block")]/blockquote', this.postbody);
		}

		/**
		 * Highlights/De-highlights a post
		 */
		, highlight: function(is_enable) {
			var td = Util.getNodes('.//td', this.table);
			$(td).attr('style', is_enable ? 'background-color:#EE0' : '');
		}
		
		/**
		 * @param boolean only_show_images - true if this Post is in an Image Thread
		 * @param boolean enable_low_content_filtering - true if this Post is in the PYF Quotes thread
		 * @return boolean - true if the post should be visible, false otherwise
		 */ 
		, isVisible: function(only_show_images, enable_low_content_filtering) {
			// Don't hide posts in the PYF SA Quotes thread
			if(enable_low_content_filtering && this.isLowContent()) {
				return false;
			}
			// In "Image Threads", hide any posts that don't contain images.
			if(only_show_images && !this.containsImagesOrLinks()) {
				return false;
			}

			// Check for hellbanning here
			if(Prefs.is_hellbanning_enabled) {
				if(Users.isHellbanned(this.author_id)) {
					return false;
				}

				// If a non-hellbanned user quoted a hellbanned post, then their post MAY be empty now. If so, hide that post.
				if(/^\s*$/.test(this.postbody.textContent) && !this.containsImagesOrLinks()) {
					return false;
				}
			}
			return true;
		}
		
		/**
		 * If a post contains a quote from a Hellbanned user, then strip the quote and any text underneath it (until the end or the next quote).
		 *
		 * Note: Because this actually removes content permanently, this is somewhat incompatible with
		 * the notion that you can toggle showing/hiding hellbanned content with a mouseclick. A better but
		 * more complex solution would be to shuffle all this content into a DIV, which we can then just show/hide.
		 *
		 * @return boolean - true if any changes were made to the post
		 */
		, stripHellbannedQuotes: function() {
			var posted_by_re = new RegExp('^(.+) posted:$');
			var post_nodes = this.postbody.childNodes;
			var under_banned_quote = false;
			var element_ids_to_remove = [];
			var i;
			for(i = 0; i < post_nodes.length; i++) {
				// Is this a quote?
				var node_type = Util.getNodeType(post_nodes[i]);
				if(node_type === 'edit') {
					// There's no text after a "Edited by..." section so end here.
					break;
				} else if(node_type === 'quote') {
					// Is this a quote made by a hellbanned User?
					var res = post_nodes[i].firstElementChild.textContent.match(posted_by_re); // Determine quotee
					under_banned_quote = res && Users.isHellbanned(res[1]);
				}
				if(under_banned_quote) {
					element_ids_to_remove.push(i);
				}
			}
			// Remove any quotes and the text underneath it.
			if(element_ids_to_remove.length) {
				while(element_ids_to_remove.length) {
					Util.removeElement(post_nodes[element_ids_to_remove.pop()]);
				}
				return true;
			}
			return false;
		}
	};
	return obj;
};


/**
 * =================
 * CONTAINER OBJECTS
 * =================
 *
 * The following objects act as namespaces/singletons.
 */

/**
 * ----------------------------------
 * LocalStorage
 * ----------------------------------
 * Various utility functions
 */
LocalStorage = {
	/**
	 * Adds a prefix to any localStorage key name so that we don't stomp on other app's localStorage items.
	 * @param <string> key - a localStorage key name
	 * @return <string> the key to use when accessing localStorage
	 */
	getKey: function(key) {
		return '***SA***SAplusplus***' + key;
	}

	/**
	 * Returns the string from Firefox's local storage.
	 *
	 * @param String key - the name of the value to return
	 * @param <mixed> def - the default value to return if the key isn't present in the local store. Defaults to null.
	 * @return - the value of the key in the local store, or default if it isn't present.
	 */
	, get: function(key, def) {
		var value = GM_getValue(this.getKey(key), null);
		if (null !== value && typeof(value) === 'string') { // Was set in localStorage and looks like it might be JSON.parse-able
			try {
				return JSON.parse(value);
			} catch(err) {
				// do nothing, drop through to pass back the default.
			}
		}
		// Return the default
		return (typeof(def) === 'undefined') ? null : def;
	}

	/**
	 * Sets the given string into Firefox's local storage.
	 *
	 * @param <string> key - the name of the key to store this under
	 * @param Array|String|Integer|Boolean value - the value of the string to store. NOTE: This MUST be JSON'izeable, i.e. Objects that don't
	 *                  have toString methods are not supported.
	 * @return void
	 */
	, set: function(key, value) {
		GM_setValue(this.getKey(key), JSON.stringify(value));
	}

	/**
	 * Removes a locally stored string from Firefox's local storage
	 *
	 * @param <string> key - the name of the key to remove
	 * @return void
	 */
	, remove: function(key, value) {
		GM_setValue(this.getKey(key), null);
	}
};

/**
 * ----------------------------------
 * Util
 * ----------------------------------
 * Various utility functions related to the DOM and manipulating elements
 */
Util = {
	/**
	 * @param DOM img - DOM IMG element
	 * @return Boolean - true if this IMG element is an emoticon.
	 */
	isEmoticon: function(img) {
		var re = new RegExp('(/forumsystem/emoticons/|/images/smilies/|/safs/smilies/)');
		return img.src && re.test(img.src);
	}

	/**
	 * Returns an array of DOM elements that match a given XPath expression.
	 *
	 * @param path string - Xpath expression to search for
	 * @param from DOM Element - DOM element to search under. If not specified, document is used
	 * @return Array - Array of selected nodes (if any)
	 */
	, getNodes: function(path, from) {
		from = from || document;
		var item, ret = [];
		var iterator = document.evaluate(path, from, null, XPathResult.ANY_TYPE, null);
		while(item = iterator.iterateNext()) {
			ret.push(item);
		}
		return ret;
	}

	/**
	 * Deletes a DOM element
	 * @param DOM element - DOM element to remove
	 * @return DOM element - the removed element
	 */
	, removeElement: function(element) {
		return element.parentNode.removeChild(element);
	}

	/**
	 * Binds an event handler function to an object context, so that the handler can be executed as if it
	 * was called using "this.<methodname>(event)", i.e. it can use "this.foo" inside it.
	 *
	 * @param function method - a function to execute as an event handler
	 * @param Object context - the object that will be used as context for the function, as if the function had been
	 *          called as context.method(event);
	 * @return function - the function to pass to addEventListener
	 */
	, bindAsEventHandler: function(method, context) {
		var __method = method;
		return function (event) {
			return __method.apply(context, [event]);
		}
	}

	/**
	 * Examines a childnode of an object and returns its "type". This type is used to determine whether it's
	 * whitespace or another type that requires different processing. "Whitespace" means:
	 * - TextContent that is just whitespace (\n, \t, space, etc)
	 * - A comment node or other non-tag
	 * - <BR> tag
	 *
	 * The return string will be one of:
	 * - 'whitespace' (whitespace TextNode, comment node)
	 * - 'text' (text content, etc)
	 * - 'quote' (means a DIV containing a blockquote)
	 * - 'edit' (The <P> "edited by..." at the end of a post)
	 * - 'link' (<A>)
	 * - 'image' (<IMG> (not an emoticon))
	 * - 'emoticon' (<IMG>)
	 * - 'br' (<br>)
	 * @param Object node - the child node to check
	 * @return string - the node type (see above).
	 */
	, getNodeType: function(node, debug) {
		if(typeof(node.isElementContentWhitespace) !== "undefined") {
			// This is a TextContent Node
			if(node.isElementContentWhitespace) {
				return 'whitespace';
			}
			return 'text';
		}

		if(typeof(node.tagName) !== "undefined") {
			switch(node.tagName) {
			case 'P':
				return 'edit';  // This is the "Edited by" paragraph.

			case 'DIV':
				// Probably a block quote
				if(node.firstElementChild
						&& node.firstElementChild.nextElementSibling
						&& node.firstElementChild.nextElementSibling.tagName === 'BLOCKQUOTE') {
					return 'quote';
				}
				return 'text2';

			case 'BR':
				return 'br';

			case 'IMG':
				return Util.isEmoticon(node) ? 'emoticon' : 'image';

			case 'A':
				return 'link';
			}
		} else if(node.nodeName && (node.nodeName === '#comment' || (node.nodeName == "#text" && /^\s*$/.test(node.textContent)))) {
			return 'whitespace';
		}
		return 'text'; // Unknown node type or tagName, assume it's text.
	}

	/**
	 * removes leading and trailing whitespace from a post.
	 * @param element - a postbody or blockquote inside a quote
	 * @return boolean - true if any part of the post was altered
	 */
	, trimWhitespace: function (el) {
		var cn = el.childNodes;
		var j, i = cn.length;
		var all_whitespace_re = /^\s+$/;
		var node_type, remove_ids = [];
		var post_altered = false;

		// First trim the end
		while(i--) {
			node_type = this.getNodeType(cn[i]);
			if(node_type === 'br' || node_type === 'whitespace') {
				remove_ids.unshift(i);
			} else if(node_type === 'edit') {
				//ignore
			} else {
				// Text or some other type.
				break;
			}
		}

		// Now trim from the beginning
		for(j = 0; j < i && j < cn.length; j++) {
			node_type = this.getNodeType(cn[i]);
			if(node_type === 'br' || node_type === 'whitespace') {
				remove_ids.unshift(j);
			} else if(node_type === 'edit') {
				//ignore
			} else {
				// Text or some other type.
				break;
			}
		}

		if(remove_ids.length) {
			post_altered = true;
		}
		while(remove_ids.length) {
			this.removeElement(cn[remove_ids.pop()]);
		}

		// Now we look for too many <br> tags in a row. Max allowed is 3.
		i = cn.length;
		var cnt = 0;
		var in_br = false;
		remove_ids = [];
		while(i--) {
			node_type = Util.getNodeType(cn[i]);
			if(node_type === 'br') {
				cnt++;
				in_br = true;
			}
			if(in_br) {
				if(node_type === 'whitespace' || node_type === 'br') {
					if(cnt >= 3) {
						remove_ids.push(i);
					}
				} else {
					in_br = false;
					cnt = 0;
				}
			}
		}

		if(remove_ids.length) {
			post_altered = true;
		}
		while(remove_ids.length) {
			Util.removeElement(cn[remove_ids.shift()]);
		}
		return post_altered;
	}
};

/**
 * ----------------------------------
 * Prefs
 * ----------------------------------
 * Handles preference information
 */
Prefs = {
	// boolean - Is hellbanning currently enabled?
	is_hellbanning_enabled: false

	// array - list of thread_ids that are considered image threads
	, image_threads: []

	// Boolean - are lowcontent posts filtered?
	, lowcontentposts_filtering_enabled: false

	// Boolean - are avatars enabled?
	, avatars_enabled: true

	// Boolean - Is the ThreadView streamlined?
	, streamline_enabled: false

	/**
	 * Adds a thread to the list of those considered "Image threads" (primarily about images)
	 * @param integer thread_id
	 */
	, addImageThread: function(thread_id) {
		this.image_threads.push(thread_id);
	}

	/**
	 * Removes a thread from the list of those considered "Image threads"
	 * @param integer thread_id
	 */
	, removeImageThread: function(thread_id) {
		var i = this.image_threads.length;
		while(i--) {
			if(this.image_threads[i] === thread_id) {
				this.image_threads.splice(i, 1);
				break;
			}
		}
	}

	/**
	 * @param integer thread_id - The ID of the thread
	 * @return Boolean - true if the given thread_id is considered an image thread (primarily for the posting of images)
	 */
	, isImageThread: function(thread_id) {
		var i = this.image_threads.length;
		while(i--) {
			if(Prefs.image_threads[i] === thread_id) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Loads the preferences for this page type into a global variable.
	 */
	, loadPrefs: function() {
		Users.initialize(LocalStorage.get('users', []));

		this.is_hellbanning_enabled = LocalStorage.get('hellbanning_enabled', false);
		this.lowcontentposts_filtering_enabled = LocalStorage.get('lowcontentposts_filtered', false);
		this.avatars_enabled = LocalStorage.get('avatars_enabled', true);
		this.streamline_enabled =  LocalStorage.get('streamline_enabled', false);
		this.image_threads = LocalStorage.get('image_threads', []);
	}

	/**
	 * Serializes and persists the global prefs
	 */
	, saveHellbanPrefs: function () {
		LocalStorage.set('users', Users.users);
		LocalStorage.set('hellbanning_enabled', this.is_hellbanning_enabled);
	}
	, saveLowContentPostsPrefs: function() {
		LocalStorage.set('lowcontentposts_filtered', this.lowcontentposts_filtering_enabled);
	}
	, saveAvatarPrefs: function() {
		LocalStorage.set('avatars_enabled', this.avatars_enabled);
	}
	, saveStreamlinePrefs: function() {
		LocalStorage.set('streamline_enabled', this.streamline_enabled);
	}
	, saveImageThreadPrefs: function() {
		LocalStorage.set('image_threads', this.image_threads);
	}
};

/**
 * Methods related to the current page, regardless of the page's function.
 * E.g. which forum we're in, determining the page handler, etc.
 */
Page = {
	// string - the handler for the type of page we're looking at. Refers to one of the ThreadList, ThreadView objects.
	page_handler: null

	// integer - forum_id we're currently looking at
	, forum_id: null

	// string - the name of the forum we're currently looking at
	, forum_name: null

	/**
	* Is the current Forum we're looking at Ask/Tell?
	*/
	, forumIsAskTell: function() {
		return (this.forum_id === 158);
	}

	/**
	* Is the current Forum we're looking at FYAD?
	*/
	, forumIsFyad: function() {
		return (this.forum_id === 26);
	}

	/**
	* Is the current Forum we're looking at the FYAD Goldmine?
	*/
	, forumIsFyadGoldmine: function() {
		return (this.forum_id === 115);
	}

	/**
	* Called at the beginning of the page. Loads global preferences and initializes various attributes
	*/
	, init: function() {
		Prefs.loadPrefs();

		// Determine the page type
		var url = window.location.href;
		if(/forumdisplay\.php/.test(url)) {
			this.page_handler = ThreadList;
		} else if(/showthread\.php/.test(url)) {
			this.page_handler = ThreadView;
		} else if(/(usercp|bookmarkthreads)\.php/.test(url)) {
			this.page_handler = UserControlPanel;
		} else if(/newreply\.php/.test(url)) {
			this.page_handler = ThreadReply;
		} else if(/private\.php.*action=newmessage/.test(url)) {
			this.page_handler = PrivateMessageEntry;
		} else if(/newthread\.php/.test(url)) {
			this.page_handler = NewThread;
		}
	
		if(this.page_handler === null) {
			return;
		}
   
		this.determineForum();
		this.page_handler.handle();
	}

	/**
	* parses the page to determine the ID/Name of the forum we're looking at
	*/
	, determineForum: function() {
		var links = Util.getNodes('.//div[@class="breadcrumbs"]//a');
		for(var i = 0; i < links.length; i++) {
			var r = links[i].href.match(/forumid=([0-9]+)/);
			if(r !== null) {
				this.forum_id = parseInt(r[1]);
				this.forum_name = links[i].textContent;
			}
		}
	}

	/**
	* Builds the configuration UI.
	*/
	, addConfigUi: function (rows, show_hidden_count) {
		rows = rows || [];
		var div = document.createElement('div');
		div.id = "SAplusplus_config";

		// add global rows
		rows.unshift('<input type="checkbox" id="hellban_enabled"> Hide threads, posts and quotes from hellbanned users.' +
			' <a href="javascript:void(0);" id="view_hb_users">View hellbanned users</a>');
    
		// Render rows
		var out = '';
		for(var i = 0; i < rows.length; i++) {
			out += '<tr style="display:none"><td colspan="2">' + rows[i] + '</td></tr>';
		}
		div.innerHTML = '<table class="standard" id="SApp_prefs_table" style="min-width:600px"><tbody>' +
			'<tr>' +
			'<th style="width:50%">SA++ preferences <a href="javascript:void(0);" id="SApp_prefs" style="color:white">Edit</a></th>' +
			'<th>' + (show_hidden_count ? 'Currently hiding <span id="num_blocked_elements">x</span>' : '') + '</th>' +
			'</tr>' +
			out +
			'</tbody></table>';
		document.getElementById('container').insertBefore(div, document.getElementById('copyright'));

		// initialize the global preferences
		document.getElementById('SApp_prefs').addEventListener('click', Util.bindAsEventHandler(this.showPrefsHandler, this), false);

		var checkbox = document.getElementById('hellban_enabled');
		checkbox.checked = Prefs.is_hellbanning_enabled;
		checkbox.addEventListener('click', Util.bindAsEventHandler(this.hellbanToggleHandler, this), false);
		document.getElementById('view_hb_users').addEventListener('click', Util.bindAsEventHandler(this.manageHellbanUsersHandler, this), false);
	}

	/**
	* Handler called when the user clicks the "Edit prefs" button.
	* Shows the preferences and removes the edit link
	*/
	, showPrefsHandler: function(e) {
		Util.removeElement(document.getElementById('SApp_prefs')); // Remove link so the user can't click it again.
		var rows = Util.getNodes('.//tr', document.getElementById('SApp_prefs_table'));
		var i = rows.length;
		while(i--) {
			rows[i].style.display = "";
		}
	}

	// Give the [code] tag more contrast
	, fixupCss: function() {
		GM_addStyle(".postbody code { color: black }");
	}

	/**
	* Change the "<" / ">" buttons to "Prev" / "Next" to give a bigger click target
	*/
	, fixPrevNextButtons: function(class_name) {
		var n = Util.getNodes('.//div[@class="' + class_name + '"]');
		if(n.length === 0 || !n[0].firstElementChild) {
			return;
		}
		n = n[0];
		n.firstElementChild.innerHTML = "« First";
		n.firstElementChild.nextElementSibling.innerHTML = "‹ Prev";
		n.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.innerHTML = "Next ›";
		var last = n.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
		var pagenumber = last.textContent.match(/\d+/)[0];
		last.innerHTML = "Last (" + pagenumber + ") »";
	}

	/**
	* Event handler for when user clicks the Hellban enable checkbox.
	*/
	, hellbanToggleHandler: function(e) {
		var new_hbe = e.target.checked;
		if(new_hbe != Prefs.is_hellbanning_enabled) {
			Prefs.is_hellbanning_enabled = new_hbe;
			Prefs.saveHellbanPrefs();
			this.page_handler.refresh();
		}
	}

	/**
	* Event handler for when user clicks the "View Hellban Users" link
	*/
	, manageHellbanUsersHandler: function(e) {
		var link = document.getElementById('view_hb_users');
		// Build the table listing all the currently hellbanned users    
		var div = document.createElement('div');
		div.style.paddingLeft = "4em";
		div.style.paddingTop = "1em";

		var out = '', cnt = 0, i = Users.users.length;
		while(i--) {
			u = Users.users[i];
			if(u.isHellbanned) {
				out += '<tr id="unhellbanrow' + u.id + '">' +
					'<td><a href="http://forums.somethingawful.com/member.php?action=getinfo&userid=' + u.id + '">' + u.name + '</a></td>' +
					'<td>' + u.id + '</td>' +
					'<td><a href="javascript:void(0);" id="unhellban' + u.id + '">Unhellban</a></td>' +
					'</tr>';
				cnt++;
			}
		}
		if(cnt === 0) {
			out = '<tr><td colspan="3">No users are hellbanned.</td></tr>';
		}
		div.innerHTML = '<table class="standard"><tbody>' +
			'<tr><th>User name</th><th>User ID</th><th></th>' +
			out +
			'</tbody></table>';

		link.parentNode.insertBefore(div, link);
		// Remove the link so they can't click it again
		Util.removeElement(link);

		// Now that the elements have been created, add handlers for all those links
		i = Users.users.length;
		while(i--) {
			u = Users.users[i];
			if(u.isHellbanned) {
				document.getElementById('unhellban' + u.id).addEventListener('click', Util.bindAsEventHandler(this.unbanUser, this), false);
			}
		}
	}

	/**
	* Called when the user clicks the "unban" link
	*/
	, unbanUser: function(e) {
		var user_id = parseInt(e.target.id.substr(9));
		Util.removeElement(document.getElementById('unhellbanrow' + user_id));
		if(Users.isHellbanned(user_id)) {
			var u = Users.getUser(user_id);
			u.isHellbanned = false;
			Prefs.saveHellbanPrefs();
		}
	}
};

/**
 * ----------------------------------
 * Users
 * ----------------------------------
 * Stores the list of User objects, and provides functions to manipulate them
 */
Users = {
	/**
	* Array - list of allowed preference names for users
	*/
	pref_names: ['isHellbanned']

	/**
	* Array - array of User objects, from preferences
	*/
	, users: []

	/**
	* Initializes the array of users, using the serialized value from the preferences.
	*/
	, initialize: function (prefs) {
		this.users = [];
		var user_array = prefs;
		var i = user_array.length;
		while(i--) {
			var user_obj = user_array[i];
			var user = new User(user_obj.id, user_obj.name);

			// Only copy over properties we know about
			var j = this.pref_names.length;
			while(j--) {
				var name = this.pref_names[j];
				if(typeof(user_obj[name]) !== "undefined") {
					user[name] = user_obj[name];
				}
			}
			this.users.push(user);
		}
	}

	/**
	* @param integer|String id - the User ID or the User Name of the author to check
	* @return Boolean - true if the given author ID is currently listed as "hellbanned".
	*/
	, isHellbanned: function(id) {
		var u = this.getUser(id);
		if(u === null) {
			return false;
		}
		return u.isHellbanned;
	}

	/**
	* @param integer|string user_id - The user ID or user name to search for
	* @return User|null - Returns a User object for the given author_id. Null if it doesn't exist;
	*/
	, getUser: function (id) {
		var i = this.users.length;
		while(i--) {
			var u = this.users[i];
			if((typeof(id) === "number" && u.id == id) || (typeof(id) === "string" && u.name == id)) {
				return u;
			}
		}
		return null;
	}

	/**
	* Returns a User object for the given author_id. Creates it if it doesn't already exist;
	* @param integer user_id - The user ID to search for
	* @param string name - The name of the user to get. Used when creating the User.
	* @return User
	*/
	, getOrCreateUser: function (user_id, name) {
		var user = this.getUser(user_id);
		if(user === null) {
			user = new User(user_id, name);
			this.users.push(user);
		}
		return user;
	}
};

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

/**
 * ----------------------------------
 * UserControlPanel
 * ----------------------------------
 * Contain functions that handle the forum's User Control Panel page
 */
UserControlPanel = {
	/**
	* Adds a button to the control panel that will open all threads in new tabs when clicked
	*/
	initOpenAllUnread: function() {
		var title = Util.getNodes('.//th[@class="title"]')[0];
		var e = document.createElement('a');
		e.href = "javascript:void(0)";
		e.id = "openall";
		e.style.cssFloat = "right";
		e.style.fontSize = '12px';
		e.style.background = '#F7F7F7';
		e.style.padding = '2px';
		e.style.border = '1px solid #D5D5D5';
		e.style.textShadow = '0px 0px 0px';
		e.style.color = '#555';
		e.style.cursor = 'pointer';
		e.style.textDecoration = "none";
		e.innerHTML = 'Open unread threads into new tabs';

		title.insertBefore(e, title.firstChild);
		e.addEventListener('click', Util.bindAsEventHandler(this.handleOpenAllClick, this), false);
	}

	/**
	* Handler for the Open All Unread In New Tabs button. Removes the button and opens the threads.
	*/
	, handleOpenAllClick: function(e) {
		Util.removeElement(document.getElementById("openall"));

		var links = Util.getNodes('.//a[@class="count"]');
		var i = links.length;
		while(i--) {
			GM_openInTab(links[i].href);
		}
	}

	/**
	* Called whenever a preference changes
	*/
	, refresh: function() {
		// Nothing to do
	}

	/**
	* Run from main. This is where the page is adjusted as it sees fit.
	*/
	, handle: function() {
		this.initOpenAllUnread();
		Page.addConfigUi([], false);
	}
};

/**
* ----------------------------------
* NewThread
* ----------------------------------
* For the Reply To Thread page
*/
NewThread = {
	handle: function() {
		Smilies.init();
		Page.fixupCss();
	}
};

/**
 * ----------------------------------
 * ThreadReply
 * ----------------------------------
 * For the Reply To Thread page
 */
ThreadReply = {
	handle: function() {
		Smilies.init();
		Page.fixupCss();
	}
};

/**
 * ----------------------------------
 * PrivateMessageEntry
 * ----------------------------------
 * For the New/Reply To Private Message page
 */
PrivateMessageEntry = {
	handle: function() {
		Smilies.init();
		Page.fixupCss();
	}
};


Smilies = {
	search: function(request, response) {
		var terms = [];
		$(request.term.split(' ')).each(function (x, term) {
			if(term.length) {
				terms.unshift({
					term: term.toLowerCase()
					, regex: new RegExp('^' + $.ui.autocomplete.escapeRegex(term), 'i')
				});
			}
		});
		var results = this.findSmilies(terms);
		results.sort(function(a, b) {
			return (b.relevancy - a.relevancy);
		});

		var resp = [];
		for(var i = 0; i < Math.min(results.length, 12); i++) {
			var item = results[i];
			resp.push({
				label: '<img src="' + item.smiley.url + '">'
				, value: (item.smiley.macro || (':'+item.name+':'))
				});
		};
		if(resp.length === 0) {
			resp.push({
				label: '<i>No results found</i>'
				, value: null
				});
		}
		response(resp);
	}
	, findSmilies: function(terms) {
		var resp = [];
		if(!terms.length) {
			return resp;
		}

		$.each(SmilyData, function (name, data) {
			var relevancy = 0;
			for(var i = 0; i < terms.length; i++) {
				var term = terms[i];
				for(var j = 0; j < data.keys.length; j++) {
					if(term.term === data.keys[j]) {
						relevancy += 5; // An exact match is worth more than a partial match
					} else if(term.regex.test(data.keys[j])) {
						relevancy++;
					}
				}
			}
			if(relevancy) {
				resp.push({
					relevancy: relevancy
					, name: name
					, smiley: data
				});
			}
		});
		return resp;
	}
  
	, init: function() {
		$('a[class="show_bbcode"]')
			.after($('<input style="margin-left: 1em" type="text" name="smiley_ac" id="smiley_ac" value="" placeholder="Enter smiley search terms" size="25">'))
		this.$textarea = $('textarea[name="message"]');
		this.$textarea.blur($.proxy(this.textareaBlur, this));

		this.$searchbox = $("#smiley_ac");
		this.$searchbox
			.on('focus', $.proxy(Smilies.searchFocus, this))
			.autocomplete({
				source: $.proxy(Smilies.search, this)
				, html: true
				, select: $.proxy(Smilies.select,this)
				, close: $.proxy(Smilies.close,this)
			});
	}
	, $textarea: null
	, $searchbox: null
	, selectionStart: null
	, selectionEnd: null
	// Called when the text area receives the blur event
	, textareaBlur: function(event) {
		var ele = this.$textarea[0];
		this.selectionStart = ele.selectionStart;
		this.selectionEnd = ele.selectionEnd;
	}
	// called when the user focuses on the Smiley search box
	, searchFocus: function(event) {
	  this.$searchbox.attr('value', '');
	}
	, select : function(event, item) {
		if(item.item.value === null) {
			return;	// No results found, so ignore this event.
		}
		if(this.selectionStart === null) {
			this.selectionStart = this.selectionEnd = 0;
		}
		// insert the text
		var t = this.$textarea.val();
		var start = t.slice(0, this.selectionStart);
		var end = t.slice(this.selectionEnd);
		this.$textarea.val(start + item.item.value + end);
		this.$textarea[0].selectionStart = this.$textarea[0].selectionEnd = start.length + item.item.value.length;
	}
	, close: function(event) {
		this.$searchbox.attr('value', '');
		if(this.selectionStart === null) {
			return;
		}
		this.$textarea.trigger('focus');
	}
};


// Execution begins here

try {

/*
* jQuery UI Autocomplete HTML Extension
*
* Copyright 2010, Scott González (http://scottgonzalez.com)
* Dual licensed under the MIT or GPL Version 2 licenses.
*
* http://github.com/scottgonzalez/jquery-ui-extensions
*/

(function($) {
var proto = $.ui.autocomplete.prototype,
  initSource = proto._initSource;
  function filter( array, term ) {
    var matcher = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
    return $.grep( array, function(value) {
      return matcher.test( $( "<div>" ).html( value.label || value.value || value ).text() );
    });
  }

  $.extend( proto, {
    _initSource: function() {
      if ( this.options.html && $.isArray(this.options.source) ) {
        this.source = function( request, response ) {
          response( filter( this.options.source, request.term ) );
        };
      } else {
        initSource.call( this );
      }
    },

    _renderItem: function( ul, item) {
      return $( "<li></li>" )
        .data( "item.autocomplete", item )
        .append( $( "<a></a>" )[ this.options.html ? "html" : "text" ]( item.label ) )
        .appendTo( ul );
      }
    });
    })( $ );
// -- End autocomplete extension

  Page.init();
} catch (e) {
  console.log(e);
}


