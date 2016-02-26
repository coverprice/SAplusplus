/**
 * Within the ThreadView page, contains information about a single post
 */
Post = function(table, postbody, post_id, author_name, author_id) {
  var obj = {
    table: table        // DOM "TABLE" object - Reference to the Table that contains this post.
    , postbody: postbody    // DOM "DIV" object - Reference to the DIV containing the post contents.
    , post_id: post_id      // Unique ID for each post (assigned by SA server)
    , author_name: author_name  // String - The name of the user who made this post
    , author_id: author_id    // Integer - The user ID of the user who made this post
    , visible: true        // Boolean - is this Post visible?
    
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
      for(let image of images) {
        if(!Util.isEmoticon(image)) {
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
      for(let child_node of this.postbody.childNodes) {
        var node_type = Util.getNodeType(child_node);
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
      for(let quote of this.getQuotes()) {
        Util.trimWhitespace(quote);
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
