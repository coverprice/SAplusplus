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
