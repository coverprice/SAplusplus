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
    for(let image_thread of this.image_threads) {
      if(image_thread === thread_id) {
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
    for(let image_thread of Prefs.image_threads) {
      if(image_thread === thread_id) {
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
