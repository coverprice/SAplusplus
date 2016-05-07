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
    let url = window.location.href;
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
    let links = Util.getNodes('.//div[@class="breadcrumbs"]//a');
    for(let i = 0; i < links.length; i++) {
      let r = links[i].href.match(/forumid=([0-9]+)/);
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
    let div = document.createElement('div');
    div.id = "SAplusplus_config";

    // add global rows
    rows.unshift('<input type="checkbox" id="hellban_enabled"> Hide threads, posts and quotes from hellbanned users.' +
      ' <a href="javascript:void(0);" id="view_hb_users">View hellbanned users</a>');
    
    // Render rows
    let out = '';
    for(let i = 0; i < rows.length; i++) {
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

    let checkbox = document.getElementById('hellban_enabled');
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
    let rows = Util.getNodes('.//tr', document.getElementById('SApp_prefs_table'));
    for(let row of rows) {
      row.style.display = "";
    }
  }

  // Give the [code] tag more contrast
  , fixupCss: function() {
    GM_addStyle(".postbody code { color: black }");
  }

  /**
  * Scale down images that are wider than the page so they fit on the page.
  */
  , shrinkGiantImages: function() {
    let imgs = Util.getNodes('.//img');
    let window_width = window.innerWidth;
    for(let img of imgs) {
      // If it goes off the right, and the left is visible, and it's not a zero-width image
      // Note: naturalWidth is used here because for some darn reason, accessing width directly gave
      // a value that was not the intrinsic width of the image (it was something smaller). No idea why.
      if(img.x+img.naturalWidth > window_width && img.x < window_width && img.naturalWidth > 0) {
        // Item is wider than the screen, so let's shrink it.
        let scale = (window_width - img.x) / img.naturalWidth;
        img.style.width = (window_width - img.x)+"px";
        img.style.height = Math.floor(img.naturalHeight * scale)+"px";
      }
    }
  }

  /**
  * Change the "<" / ">" buttons to "Prev" / "Next" to give a bigger click target
  */
  , fixPrevNextButtons: function(class_name) {
    let n = Util.getNodes('.//div[@class="' + class_name + '"]');
    if(n.length === 0 || !n[0].firstElementChild) {
      return;
    }
    n = n[0];
    n.firstElementChild.innerHTML = "« First";
    n.firstElementChild.nextElementSibling.innerHTML = "‹ Prev";
    n.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.innerHTML = "Next ›";
    let last = n.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
    let pagenumber = last.textContent.match(/\d+/)[0];
    last.innerHTML = "Last (" + pagenumber + ") »";
  }

  /**
  * Event handler for when user clicks the Hellban enable checkbox.
  */
  , hellbanToggleHandler: function(e) {
    let new_hbe = e.target.checked;
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
    let link = document.getElementById('view_hb_users');
    // Build the table listing all the currently hellbanned users    
    let div = document.createElement('div');
    div.style.paddingLeft = "4em";
    div.style.paddingTop = "1em";

    let out = '', cnt = 0, i = Users.users.length;
    for(let u of Users.users) {
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
    for(let u of User.users) {
      if(u.isHellbanned) {
        document.getElementById('unhellban' + u.id).addEventListener('click', Util.bindAsEventHandler(this.unbanUser, this), false);
      }
    }
  }

  /**
  * Called when the user clicks the "unban" link
  */
  , unbanUser: function(e) {
    let user_id = parseInt(e.target.id.substr(9));
    Util.removeElement(document.getElementById('unhellbanrow' + user_id));
    if(Users.isHellbanned(user_id)) {
      let u = Users.getUser(user_id);
      u.isHellbanned = false;
      Prefs.saveHellbanPrefs();
    }
  }
};
