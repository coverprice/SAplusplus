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
    let i = 0;
    for(let p of this.posts) {
      $('<li></li>')
        .html('<a id="postindex' + (i++) + '" href="javascript:void(0)">'
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
    let p = this.posts[parseInt(e.target.id.substr(9))];
    let ok;
    let hb = Users.isHellbanned(p.author_id);
    if(hb) {
      ok = confirm("Unban '" + p.author_name + "'?");
    } else {
      ok = confirm("Hide all posts and quotes by " + p.author_name + "?");
    }
    if(!ok) {
      return;
    }
    let u = Users.getOrCreateUser(p.author_id, p.author_name);
    u.isHellbanned = !hb;
    Prefs.saveHellbanPrefs();
    this.refresh();
  }

  /**
   * Parses the Thread View page to build the array of Posts, so that they can be more easily manipulated.
   */
  , buildPostList: function() {
    this.posts = [];
    let post_tables = Util.getNodes('.//div[@id="thread"]/table');
    for(let i = 0; i < post_tables.length; i++) {
      this.posts.push(this.parsePost(post_tables[i]));
    }
  }

  /**
   * @param table - the DOM <table> element that contains a post
   * @return Post - a new Post object that contains information about that post
   */
  , parsePost: function(table) {
    let author_id, postbody, author_name, name_node;
    let post_id_re = /^post(\d+)$/;
    let user_id_re = /userid-(\d+)/;
    let post_id = (table.id && post_id_re.test(table.id)) ? parseInt(table.id.match(post_id_re)[1]) : '';

    let td = Util.getNodes('.//td', table)[0];
      // Find author ID, author_name node and postbody
    if(Page.forumIsFyad() || Page.forumIsFyadGoldmine()) {
      let uinfo = td.firstElementChild.nextElementSibling;
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
    let num_hidden_posts = 0;
    let posts_changed = false;
    let is_image_thread = Prefs.isImageThread(this.thread_id);
    let is_quotes_thread = (/quote/i.test(this.thread_title));
    // Disable low-content filtering in the PYF SA Quotes thread, because people often post just the quotes.
    let enable_low_content_filtering = Prefs.lowcontentposts_filtering_enabled && !is_quotes_thread;
    for(let i = 0; i < this.posts.length; i++) {
      let is_visible = this.posts[i].isVisible(is_image_thread, enable_low_content_filtering);
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
    let toggle = 1;
    let base_class_name = 'seen';

    for(let i = 0, j = this.posts.length; i < j ; i++) {
      if(!this.posts[i].visible) {
        continue;
      }
      let post = this.posts[i].table;
      let tr = post.firstElementChild.firstElementChild;
      if(tr.className.indexOf('altcolor') === 0) {
        base_class_name = 'altcolor';
      }
      let new_class_name = base_class_name + toggle;
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
    let imgs = Util.getNodes('.//img');
    let re = new RegExp('/([^/]+)/?$'); // Get the characters after the last forward slash
    for(let img of imgs) {
      if(!img.title) {
        img.title = img.src.match(re)[1];
      }
    }
  }

  /**
  * Strips images from quotes.
  * @param integer max_num - The maximum number of images allowed in a quote (removes from the end of the post)
  */
  , removeImagesFromQuotes: function(max_num) {
    let p, i, j, k, nodes, skip, images, images_removed;
    for(let p of this.posts) {
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
    let nodes = Util.getNodes('.//td[@class="postdate"]');
    for(let node of nodes) {
      Util.removeElement(node.parentNode);
    }

    nodes = Util.getNodes('.//dl[@class="userinfo"]/dd[@class="registered"]');
    for(let node of nodes) {
      Util.removeElement(node);
    }
  }

  /**
  * Strips each post of the "Edited by..." paragraph
  */
  , removeEditedBy: function() {
    let nodes = Util.getNodes('.//p[@class="editedby"]');
    for(let node of nodes) {
      Util.removeElement(node);
    }
  }

  /**
  * Strips a page of custom titles.
  */
  , removeAvatars: function() {
    let nodes = Util.getNodes('.//dl[@class="userinfo"]/dd[@class="title"]');
    for(let node of nodes) {
      Util.removeElement(node);
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
    for(let post of this.posts) {
      post.trimWhitespace();
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
    let cb = document.getElementById('image_thread');
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
    let new_value = e.target.checked;
    let in_list = Prefs.isImageThread(this.thread_id);
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
      let hash = window.location.hash;
    if(!(/#post\d+/.test(hash))) {
      return;
    }
    let post_id = parseInt(hash.substr(5));
    if(this.highlightedPost !== null) {
      this.highlightedPost.highlight(false);
    }
    for(let i = 0, l = this.posts.length; i < l; i++) {
      if(this.posts[i].post_id === post_id) {
        this.highlightedPost = this.posts[i];
        this.highlightedPost.highlight(true);
        break;
      }
    }
  }
  
  , calculateQuoteCount: function() {
    let post_re = /#post(\d+)$/;
    let post_id_counts = {}; // map of post_id -> number of times quoted

    for(let i = 0; i < this.posts.length; i++) {
      let nodes = this.posts[i].postbody.childNodes;
      for(let j = 0, len = nodes.length; j < len; j++) {
        if(Util.getNodeType(nodes[j]) === 'quote') {
          // Once we've found a quote, attempt to find the ID of the post it's quoting
          let a = $('a', nodes[j]);
          if(a.length) {
            let res = a.attr('href').match(post_re);
            if(res) {
              // Increment the count for that post_id
              let post_id = res[1];
              if(post_id_counts[post_id] === undefined) {
                post_id_counts[post_id] = 0;
              }
              post_id_counts[post_id]++;
            }
          }
        }
      }
    }

    for(let i = 0; i < this.posts.length; i++) {
      let p = this.posts[i];
      let count = post_id_counts[p.post_id.toString()];
      if(count > 1) {  // Needs at least 2 quotes for this to be useful.
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

    let page_changed = false;
    this.showImageFilename();
    Page.fixPrevNextButtons("pages top");
    Page.fixPrevNextButtons("pages bottom");
    Page.fixupCss();
    Page.shrinkGiantImages();
    this.removeNiceButton();
    page_changed |= this.removeImagesFromQuotes(3);

    this.addPerPostUi(); // i.e. add Hellban button
    
    this.calculateQuoteCount();
    
    if(Prefs.is_hellbanning_enabled) {
      for(let i = 0; i < this.posts.length; i++) {
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
        let post = $(window.location.hash);
        if(post.length) {
          let coords = post.offset();
          $("html,body").animate({
            scrollTop: coords.top,
            scrollLeft: coords.left
          });
        }
      }
    }
  }
};
