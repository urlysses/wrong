# todo before releasing v1.0.0
+ make changes to node-webkit allowing for 
  [this](https://github.com/rogerwang/node-webkit/issues/367)?
  [lighttable's nw implements this](https://github.com/LightTable/node-webkit).
+ quiet backups =>
  (into ~/Library/Application Support/Wrong/Backups/filename(date).wrong)
+ allow users to upload own sounds (ambient only? e.g. can't upload click sounds
  from settings ui?)
+ iCloud & file nav implementation (see that lua HN post or w/e)
  (if want into App Store).
+ save background image to app path (Library/Application\ Support/Wrong/etc.)
+ text dragging works between tabs (not online?). just be careful about dragging
  files into the app and dropping them onto the tabs bar (breaks app).
+ Should redefine edit & window menu tabs. they use fns that could break app.
+ Add testing, which is a pretty important thing to do & which I should have
  done from the beginning but I was younger and more care-free in those days.
+ Inline comments can optionally be removed from the export. export as html comments?
