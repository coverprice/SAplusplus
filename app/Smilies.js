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
      let item = results[i];
      let title = item.smiley.macro || (':'+item.name+':')
      resp.push({
        label: '<img src="' + item.smiley.url + '"> ' + title,
        value: title,
      });
    };
    if(resp.length === 0) {
      resp.push({
        label: '<i>No results found</i>',
        value: null,
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
      return;  // No results found, so ignore this event.
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
