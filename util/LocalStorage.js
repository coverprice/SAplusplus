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
   * @param <mixed> default_val - the default value to return if the key isn't present in the local store. Defaults to null.
   * @return - the value of the key in the local store, or default if it isn't present.
   */
  , get: function(key, default_val) {
    var value = GM_getValue(this.getKey(key), null);
    if (null !== value && typeof(value) === 'string') { // Was set in localStorage and looks like it might be JSON.parse-able
      try {
        return JSON.parse(value);
      } catch(err) {
        // do nothing, drop through to pass back the default.
      }
    }
    // Return the default
    return (typeof(default_val) === 'undefined') ? null : default_val;
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
