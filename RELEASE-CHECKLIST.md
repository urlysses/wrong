I need to run through this checklist before publishing new version releases.
* * *
# Checklist
+ Duplicate local Wrong.app/ directory.
+ Move Wrong\ copy.app/ into ~/Downloads (or anywhere other than /Applications),
  and rename dir to Wrong.app/.
+ IMPORTANT: Delete the .git dir **in the *****new***** Wrong.app/ dir** to
  shave off ~75+MB.
+ Run Keka (or any other compression software) and set Zip method to
  "Slowest, more compression."
+ Drag Wrong.app into Keka and save the resulting .zip for upload.
+ Now, go to [Wrong's releases page](https://github.com/handstrings/wrong/releases)
  and click "Draft a new release."
+ ALWAYS (!!!) set the Tag version to `v[versionNumber]`. For example, **v0.17.0**.
  DO NOT MAKE THE MISTAKE OF USING **v.**0.17.0. This is crucial for the in-app
  update check to work.
+ Add some release info if necessary. 
+ Upload the .zip containing the app. The .zip should be ~half the size of the app.
+ Publish release.
