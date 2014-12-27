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