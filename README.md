# some-userjs-n-usercss

Some of my userscript/userjs and userstyle/usercss, made primarily for personal use.

## MangaDex - New Comment Section Skipper

[mangadex--new-comment-section-skipper.user.js](mangadex--new-comment-section-skipper.user.js)

The new comment section annoys me, this script try to skip the need to click another button to get to the "old" comment page.

I don't know if a userscript that can just bypass this completely is possible, (I'm not really a webdev) 
but for this script, it will wait for the button that link to forum thread to appear (using [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)), 
then add custom click event to "outer comment button" that's in the sidebar of chapter reading page, 
or automatically redirect to forum thread if you click "comment icon" from outside the chapter reading page (when there's `?comments=1` in url).
