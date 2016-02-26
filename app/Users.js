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
    for(let user_obj of user_array) {
      let user = new User(user_obj.id, user_obj.name);

      // Only copy over properties we know about
      let j = this.pref_names.length;
      while(j--) {
        let name = this.pref_names[j];
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
    for(let u of this.users) {
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
