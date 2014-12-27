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
