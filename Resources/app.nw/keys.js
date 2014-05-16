/*jslint node: true, browser: true, devel:true, white: false*/
/*global $, Event, Audio, define*/
define(["view", "control", "settings"], function (View, Control, Settings) {
    View = new View();
    Control = new Control();
    Settings = new Settings();
    function Keys() {
    }
    Keys.prototype.bindEditorShortcuts = function (el) {
        el.addEventListener("keydown", function (e) {
            var k = e.keyCode,
                cmd = e.metaKey,
                alt = e.altKey,
                shift = e.shiftKey;
            if (cmd === true) {
                var tm = window.tm;
                // All shortcuts here include "cmd" so no need to check for it.
                /* Dev shortcuts */
                // Cmd-Alt-J
                if (alt && !shift && k === 74) {
                    window.win.showDevTools();
                }
                /* Editor shortcuts */
                // Cmd-,
                if (!alt && !shift && k === 188) {
                    Settings.openSettings();
                }
                // Cmd-O
                if (!alt && !shift && k === 79) {
                    window.Wrong.openFileDialog();
                }
                // Cmd-S
                if (!alt && !shift && k === 83) {
                    e.preventDefault();
                    View.toggleSuperfluous(false);
                    window.Wrong.saveFile(global.filePath);
                }
                // Shift-Cmd-S 
                if (!alt && shift && k === 83) {
                    e.preventDefault();
                    View.toggleSuperfluous(false);
                    window.Wrong.saveFile();
                }
                // Cmd-N OR Cmd-T
                if ((!alt && !shift && k === 78) || (!alt && !shift && k === 84)) {
                    window.Wrong.newFile();
                }
                // Shift-Cmd-F OR Cmd-[Enter]
                if ((!alt && shift && k === 70) || (!alt && !shift && k === 13)) {
                    View.toggleFullscreen();
                }
                // Cmd-F
                if (!alt && !shift && k === 70) {
                    Control.find(Keys, tm);
                }
                // Cmd-G
                if (!alt && !shift && k === 71) {
                    Control.findNext(tm);
                }
                // Shift-Cmd-G
                if (!alt && shift && k === 71) {
                    Control.findPrev(tm);
                }
                // Cmd-Alt-F
                if (alt && !shift && k === 70) {
                    Control.replace(Keys, tm);
                }
                // Shift-Cmd-Alt-F
                if (alt && shift && k === 70) {
                    Control.replaceAll(Keys, tm);
                }
                // Cmd-D
                if (!alt && !shift && k === 68) {
                    Control.define(Keys, tm);
                }
                // Cmd-/
                if (!alt && !shift && k === 191) {
                    Control.toggle(Keys, tm);
                }
                // Cmd-Z
                if (!alt && !shift && k === 90) {
                    if (tm.isFocused()) {
                        e.preventDefault();
                        tm.history.undo(tm);
                        if ((!tm.hasSaved && !tm.history.canUndo(tm))
                                || (tm.hasSaved && tm.checkpoint === tm.value)) {
                            View.setFileDirty(false);
                        } else {
                            View.setFileDirty(true);
                        }
                    }
                }
                // Shift-Cmd-Z
                if (!alt && shift && k === 90) {
                    if (tm.isFocused()) {
                        e.preventDefault();
                        tm.history.redo(tm);
                        if (tm.hasSaved && tm.checkpoint === tm.value) {
                            View.setFileDirty(false);
                        } else {
                            View.setFileDirty(true);
                        }
                    }
                }
                // Cmd-Alt-[Left Arrow]
                if (alt && !shift && k === 37) {
                    View.goToPrevTab();
                }
                // Cmd-Alt-[Right Arrow]
                if (alt && !shift && k === 39) {
                    View.goToNextTab();
                }
            }
            // Esc
            if (!cmd && !alt && !shift && k === 27) {
                if (window.win.isFullscreen === true) {
                    window.toggleFullscreen();
                }
            }
        });
    };
    return Keys;
});
