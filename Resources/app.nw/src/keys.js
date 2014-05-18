/*jslint node: true, browser: true, devel:true, white: false*/
/*global define*/
define(["view", "control", "settings", "files"], function (View, Control, Settings) {
    View = new View();
    Control = new Control();
    Settings = new Settings();
    function Keys() {
    }
    Keys.prototype.bindEditorShortcuts = function (el, Files) {
        var Key = this;
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
                    if (window.win) {
                        window.win.showDevTools();
                    }
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
                    window.Wrong.saveFile(window.filePath);
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
                    Control.find(Key, Files, tm);
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
                    Control.replace(Key, Files, tm);
                }
                // Shift-Cmd-Alt-F
                if (alt && shift && k === 70) {
                    Control.replaceAll(Key, Files, tm);
                }
                // Cmd-D
                if (!alt && !shift && k === 68) {
                    Control.define(Key, Files, tm);
                }
                // Cmd-/
                if (!alt && !shift && k === 191) {
                    Control.toggle(Key, Files, tm);
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
                    View.goToPrevTab(Files);
                }
                // Cmd-Alt-[Right Arrow]
                if (alt && !shift && k === 39) {
                    View.goToNextTab(Files);
                }
            }
            // Esc
            if (!cmd && !alt && !shift && k === 27) {
                if (View.isFullscreen() === true) {
                    View.toggleFullscreen();
                }
            }
        });
    };
    return Keys;
});
