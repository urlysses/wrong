/*jslint node: true, browser: true, devel:true, white: false*/
/*global define*/
define(["view", "control", "settings", "files"], function (View, Control, Settings) {
    View = new View();
    Control = new Control();
    Settings = new Settings();
    function Keys() {
        return this;
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
                // Cmd-Alt-I
                if (alt && !shift && k === 73) {
                    if (window.Wrong.win) {
                        window.Wrong.win.showDevTools();
                    }
                }
                /* Editor shortcuts */
                // Cmd-,
                if (!alt && !shift && k === 188) {
                    e.preventDefault();
                    Settings.openSettings();
                }
                // Cmd-O
                if (!alt && !shift && k === 79) {
                    e.preventDefault();
                    window.Wrong.openFileDialog();
                }
                // Cmd-S
                if (!alt && !shift && k === 83) {
                    e.preventDefault();
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
                    e.preventDefault();
                    window.Wrong.newFile();
                }
                // Shift-Cmd-F OR Cmd-[Enter]
                if ((!alt && shift && k === 70) || (!alt && !shift && k === 13)) {
                    e.preventDefault();
                    View.toggleFullscreen();
                }
                // Cmd-F
                if (!alt && !shift && k === 70) {
                    e.preventDefault();
                    Control.find(Key, Files, View, tm);
                }
                // Cmd-G
                if (!alt && !shift && k === 71) {
                    e.preventDefault();
                    Control.findNext(tm);
                }
                // Shift-Cmd-G
                if (!alt && shift && k === 71) {
                    e.preventDefault();
                    Control.findPrev(tm);
                }
                // Cmd-Alt-F
                if (alt && !shift && k === 70) {
                    e.preventDefault();
                    Control.replace(Key, Files, View, tm);
                }
                // Shift-Cmd-Alt-F
                if (alt && shift && k === 70) {
                    e.preventDefault();
                    Control.replaceAll(Key, Files, View, tm);
                }
                // Cmd-D
                if (!alt && !shift && k === 68) {
                    e.preventDefault();
                    Control.define(Key, Files, View, tm);
                }
                // Cmd-/
                if (!alt && !shift && k === 191) {
                    e.preventDefault();
                    Control.toggle(Key, Files, View, tm);
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
                    e.preventDefault();
                    View.goToPrevTab(Files);
                }
                // Cmd-Alt-[Right Arrow]
                if (alt && !shift && k === 39) {
                    e.preventDefault();
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
