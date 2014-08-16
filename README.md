SAplusplus
==========

Something Awful Greasemonkey extension

Description
===========
Implements various enhancements to Something Awful forums browsing. Enhancements include:

User Control Panel:
- Button that will open all unread threads in new tabs.

Thread List:
- Move ratings next to thread title, to more easily scan for gold threads.
- Hide threads by hellbanned users
- Only show ratings for threads if a minimum number of people have voted (useful for FYAD where the threshold is
  very low)

Thread View:
- Hellban users. A hellbanned user is effectively erased from your browsing experience. Their posts will be removed,
  including responses to their posts by non-hellbanned users.
- Hide posts that don't contain images. Useful for image threads where too many people just comment without posting
  content.
- Prevent image spamming. Any more than 3 images in a quote are removed, to prevent the case where people quote a
  large post full of images and just add a one line comment.
- Filter low content posts. Hides post that are just empty quotes or single-emoticon posts.
- Streamline view. For quickly skimming a long thread. Strips the page of any extraneous content, showing more posts
  per-page.
- Hide avatars. Client-side preference for scrubbing avatars/custom-titles, so you can (for example) show avatars
  at home but not at work.

Using this script
=================
After installation, each page will have a small bar near the bottom "SA++ preferences". Click the "Edit" button to alter
preferences. Some preferences are site-wide (e.g. "Hide Avatars"), some are thread-specific (e.g. "Hide posts with no text or images").

Hellbanning
-----------
Hellbanning a user will erase them from your browsing experience. All their posts, threads, and even their quotes in other posts, will
be removed.
- To hellban a user, click "Hellban" under one of their posts.
- To unhellban a user, click "Edit" in the preferences bar at the bottom of the page, click "View Hellbanned users"
  and then click "Unhellban" next to the name of the user.


Usage Notes
===========

Known issues:
- The preference state is stored in RAM on each page, so if you (say) hellban a user in one tab, then
  move to another tab and hellban another, the prefs will be completely overwritten and you'll lose the first pref.
  This can be fixed by reloading the prefs before tweaking and saving them but I haven't gotten around to it.

*IMPORTANT*: This code depends on the following environment:
- SA Last Read FF extension (SALR) is installed.
- Adblock is installed
- SA user configuration is set up in a particular way.

For me, this script works when each of the above has the following settings. Failure to follow this configuration MAY
mean that the script doesn't work at all, but as far as I know there isn't any conflict with ANY settings. I
haven't tested user sigs though.

SALR config:
- General options:
  Hide forum header/footer [UNCHECKED]
- Forums:
  All features [UNCHECKED]

Adblock config:
 |http://forums.somethingawful.com/css/rfa.css
 |http://forums.somethingawful.com/css/fyad.css
 These shouldn't affect the script, but failing to block these may have unexpected results when streamlining.

SA user options: http://forums.somethingawful.com/member.php?action=editoptions
- Mark posts on pages I've already seen in a different color: YES
- Show user's signatures in their posts? : NO
- Show member ad banners? : NO - I have "No Ads", so I don't know if this script works when Ads are enabled.
