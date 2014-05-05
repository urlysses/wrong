/*jslint node: true, browser: true, devel:true, white: false*/
/*global PROMPT, $, Audio, Event*/
(function (global) {
    "use strict";

    var gui   = require("nw.gui"),
        fs    = require("fs"),
        win   = gui.Window.get(),
        menu  = new gui.Menu(),
        clip  = gui.Clipboard.get(),
        audio = document.getElementById("wr-audio"),
        sounds,
        theme,
        parcel,
        updateParcel,
        tm,
        initTM,
        titlebar,
        tabs,
        updateTabs,
        fullscreenbutton,
        windowbuttons,
        addtabsbutton,
        makeUTF8,
        saveFile,
        filePath,
        fileDirty,
        setFileDirty,
        getFileDirty,
        newFile,
        openFileDialog,
        openFile,
        toggleFullscreen,
        toggleAudio,
        toggleTitlebar,
        focusWindowButtons,
        blurWindowButtons,
        closeWindow,
        closeTab,
        closeAllTabs,
        saveAndClose,
        goToNextTab,
        goToPrevTab,
        menubar,
        findmenu,
        filemenu,
        viewmenu,
        thememenu,
        editmenu,
        openmenu,
        openrecents,
        recentFiles,
        updateRecentFiles,
        clearRecentFiles,
        hasRecentFiles,
        removeRecentFile,
        completeInit,
        setPageTitle,
        updateCloseDirt,
        updateTitleDirt,
        openSettings,
        displayWordCount,
        getWordCount,
        loadDefaultTheme,
        unloadDefaultTheme,
        loadTheme,
        setDefaultTheme,
        getDefaultTheme,
        submenuLoadTheme,
        updateCounterDirt,
        toggleSuperfluous,
        bindEditorShortcuts,
        $counter,
        playClicks;

    var History = require("./history.js");

    global.filePath = filePath;

    theme = {};
    theme.body = [];
    theme.cm = [];
    theme.other = [];
    theme.updated = {};
    theme.customized = false;
    theme.saved = true;
    theme.loaded = false;
    theme.submenu = {};
    theme.presets = [
        {name: "Light", custom: false},
        {name: "Dark", custom: false},
        {name: "Terminal", custom: false},
        {name: "Blue Yonder", custom: false}
    ];

    sounds = {};
    sounds.mood = [];
    sounds.clicks = [{name: "switch", len: 8, format: "wav"}];

    // User settings are stored in localStorage under "parcel"
    if (localStorage.parcel) {
        parcel = JSON.parse(localStorage.parcel);
    } else {
        parcel = {};
    }

    tabs = {};

    updateParcel = function (name, value) {
        parcel[name] = value;
        localStorage.parcel = JSON.stringify(parcel);
    };

    setDefaultTheme = function (themeName, custom) {
        localStorage.defaultTheme = JSON.stringify({name: themeName, custom: custom});
    };

    getDefaultTheme = function () {
        var ret;
        if (localStorage.defaultTheme) {
            ret = JSON.parse(localStorage.defaultTheme);
        } else {
            ret = {name: "Light", custom: false};
        }

        return ret;
    };

    loadTheme = function (themeName, custom) {
        var themeLink, themePath;
        if (custom) {
            themePath = gui.App.dataPath + "/Themes/" + themeName + "/" + themeName + ".css";
        } else {
            themePath = "Themes/" + themeName + "/" + themeName + ".css";
        }
        themeLink = document.createElement("link");
        themeLink.rel = "stylesheet";
        themeLink.type = "text/css";
        themeLink.href = themePath;
        document.getElementsByTagName("head")[0].appendChild(themeLink);
    };

    loadDefaultTheme = function () {
        var defTheme;

        if (localStorage.defaultTheme && theme.loaded === false) {
            defTheme = getDefaultTheme();
            loadTheme(defTheme.name, defTheme.custom);
            theme.loaded = true;
        }
    };

    unloadDefaultTheme = function () {
        if (localStorage.defaultTheme && theme.loaded === true) {
            // there's a defaultTheme. css link will always be HEAD's lastchild
            // (we don't add to HEAD except during global.onload or in calling 
            // loadDefaultTheme();)
            document.getElementsByTagName("head")[0].lastChild.remove();
            theme.loaded = false;
        }
    };

    submenuLoadTheme = function (themeName, custom) {
        unloadDefaultTheme();
        setDefaultTheme(themeName, custom);
        loadDefaultTheme();
        thememenu.items.forEach(function (item, index) {
            if (item.label !== themeName) {
                item.checked = false;
            }
        });
        themeName = themeName.replace(" ", "-");
        document.getElementById("wr-theme-" + themeName).selected = true;
    };

    function TM(val) {
        if (val === undefined) {
            val = "";
        }

        this.doc = document.createElement("pre");
        this.doc.id = "TextMap";
        this.doc.className += "tm-w-default";
        this.doc.contentEditable = "plaintext-only";
        document.getElementById("TextMapHolder").appendChild(this.doc);
        this.value = val;
        this.store = val;
        this.selectionStart = 0;
        this.selectionEnd = 0;
        this.searchPos = 0;
        this.storedScrollTop = 0;
        this.lastInput = null;
        this.lastCursor = {selectionStart: 0, selectionEnd: 0};
        this.history = new History.History();
        this.hasSaved = false;
        this.checkpoint = null;
    }
    TM.prototype = {
        get value() {
            this._value = this.doc.textContent;
            return this._value;
        },
        set value(value) {
            this.doc.textContent = value;
            this._value = value;
        },
        get text() {
            // this.text and this.value are now essentially
            // the same thing since we've switched from <div> to <pre>.
            return this.doc.textContent;
        },
        set text(value) {
            this.value = value;
        },
        get innerText() {
            return this.doc.innerText;
        },
        set innerText(value) {
            this.doc.innerText = value;
        },
        get selectionStart() {
            this._selection();
            return this._selectionStart;
        },
        set selectionStart(value) {
            this._selectionStart = value;
            this._updateSelection();
        },
        get selectionEnd() {
            this._selection();
            return this._selectionEnd;
        },
        set selectionEnd(value) {
            this._selectionEnd = value;
            this._updateSelection();
        }
    };
    TM.prototype.insertText = function (text) {
        var val = this.value,
            start = this.selectionStart,
            end = this.selectionEnd;
        this.value = [val.slice(0, start), text, val.slice(end)].join("");
        this.selectionEnd = end + text.length;
        this.selectionStart = start + text.length;
        // Dispatch input event to update history.
        var e = new Event("input");
        this.doc.dispatchEvent(e);
    };
    TM.prototype.clone = function () {
        var ntm = initTM(this.value);
        var sel = this.getSelection();
        ntm.selectionEnd = sel.selectionEnd;
        ntm.selectionStart = sel.selectionStart;
        ntm.history = this.history;
        ntm.checkpoint = this.checkpoint;
        ntm.hasSaved = this.hasSaved;
        ntm.lastInput = this.lastInput;
        ntm.lastCursor = this.lastCursor;
        this.blur();
        ntm.storedScrollTop = this.storedScrollTop;
        return ntm;
    };
    TM.prototype.update = function () {
        global.tm = this;
    };
    TM.prototype.upgrade = function (tm) {
        var tmholder = document.getElementById("TextMapHolder");
        while (tmholder.lastChild) {
            tmholder.removeChild(tmholder.lastChild);
        }
        tmholder.appendChild(tm.doc);
    };
    TM.prototype.blur = function () {
        this.handleBlur();
        this.doc.blur();
    };
    TM.prototype.handleBlur = function () {
        this.storedScrollTop = this.doc.scrollTop;
    };
    TM.prototype.focus = function () {
        this.doc.focus();
        this.handleFocus();
    };
    TM.prototype.handleFocus = function () {
        this.doc.scrollTop = this.storedScrollTop;
        this.restoreSelection();
    };
    TM.prototype.isFocused = function () {
        return document.activeElement === this.doc;
    };
    TM.prototype.getSelection = function () {
        var selStart = this.selectionStart,
            selEnd = this.selectionEnd;
        return {selectionStart: selStart, selectionEnd: selEnd};
    };
    TM.prototype.restoreSelection = function () {
        this.selectionEnd = this.lastCursor.selectionEnd;
        this.selectionStart = this.lastCursor.selectionStart;
    };
    TM.prototype._selection = function () {
        // range fix.
        window.getSelection().addRange(document.createRange());
        // regular stuff.
        var range = window.getSelection().getRangeAt(0);
        var rangeClone = range.cloneRange();
        rangeClone.selectNodeContents(this.doc);
        rangeClone.setEnd(range.startContainer, range.startOffset);
        this._selectionStart = rangeClone.toString().length;
        rangeClone.setEnd(range.endContainer, range.endOffset);
        this._selectionEnd = rangeClone.toString().length;
    };
    TM.prototype._updateSelection = function () {
        // TODO: Rewrite this.
        var range = document.createRange(),
            winselection = window.getSelection(),
            charIndex = 0,
            nodeStack = [this.doc],
            node,
            foundStart = false,
            start = this._selectionStart,
            end = this._selectionEnd,
            stop = false;
        range.setStart(this.doc, 0);
        range.collapse(true);
        while (!stop && (nodeStack.length > 0)) {
            node = nodeStack.pop();
            if (node.nodeType === 3) {
                var nextCharIndex = charIndex + node.length;
                if (!foundStart && start >= charIndex && start <= nextCharIndex) {
                    range.setStart(node, start - charIndex);
                    foundStart = true;
                }
                if (foundStart && end >= charIndex && end <= nextCharIndex) {
                    range.setEnd(node, end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                var i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }
        winselection.removeAllRanges();
        winselection.addRange(range);
    };
    TM.prototype.select = function () {
        // selects whole document (textarea default functionality).
        this.selectionStart = 0;
        this.selectionEnd = this.text.length;
    };
    TM.prototype.find = function (value, backward, looping) {
        var pos;
        if (backward) { // findPrev
            var cal;
            if (this.searchPos === 0 || this.searchPos === value.length) {
                // at top, search from bottom
                cal = this.text.length;
            } else { // search above position.
                cal = this.searchPos - (value.length + 1);
            }
            pos =  this.text.lastIndexOf(value, cal);
        } else { // findNext
            pos = this.text.indexOf(value, this.searchPos);
            if (backward === undefined) {
                backward = false;
            }
        }

        if (pos !== -1) {
            this.selectionStart = pos;
            this.selectionEnd = pos + value.length;
            this.searchPos = pos + value.length;
            this.scrollToSelection();
            return true;
        }

        // Query not anywhere found after current position. Loop back to start
        // once.
        this.searchPos = 0;
        if (looping === undefined) {
            // loop once to go back to start of document if at bottom.
            return this.find(value, backward, true);
        }

        // Looped and still nothing found.
        alert("'" + value + "' not found");
        return false;
    };
    TM.prototype.findAll = function (value) {
        return this.text.split(value).length - 1;
    };
    TM.prototype.replace = function (value, replacement, backward) {
        if (value !== "") {
            var found = this.find(value, backward); // find and select thing
            if (found) {
                // replace selected text through insertText
                var oldContent = this.value;
                this.insertText(replacement);
                return true;
            }
        }

        return false;
    };
    TM.prototype.replaceAll = function (value, replacement) {
        if (value !== "") {
            var oldContent = this.value;
            this.value = oldContent.split(value).join(replacement);
            this.history.change(
                this,
                {from: oldContent, to: this.value},
                this.getSelection()
            );
        }
    };
    TM.prototype.scrollToSelection = function () {
        var range = window.getSelection().getRangeAt(0),
            t = range.getBoundingClientRect().top;
        this.doc.scrollTop += t - window.innerHeight / 2;
    };
    function CMD() {
        // Control & Control Pack
        this.controlpack = document.createElement("iframe");
        this.controlpack.id = "tm-wr-control";
        this.control = document.createElement("input");
        this.control.type = "text";
        this.control.id = "tm-control";
        this.controlOpened = false;
        // Query Misc
        this.findquery = "";
        this.replacequeryfrom = "";
        this.replacequeryto = "";
        this.definequery = "";
    }
    CMD.prototype.show = function (machine) {
        if (this.controlOpened === false) {
            machine.doc.parentNode.insertBefore(this.controlpack, machine.doc);
            machine.doc.classList.add("tm-control-on");
            var cssFile = document.createElement("link");
            cssFile.href = "public/css/app.css";
            cssFile.type = "text/css";
            cssFile.rel = "stylesheet";
            this.controlpack.contentDocument.head.appendChild(cssFile);
            this.controlpack.contentDocument.body.appendChild(this.control);
            var cmd = this;
            this.control.addEventListener("keypress", function (e) {
                if (e.keyCode === 13) {
                    if (this.value.toLowerCase().indexOf("replace") === 0) {
                        cmd.modifyForReplace(machine);
                    } else {
                        cmd.parse(machine, this.value);
                    }
                } else if (e.keyCode === 32) {
                    if (this.value.toLowerCase().indexOf("replace") === 0) {
                        e.preventDefault();
                        cmd.modifyForReplace(machine);
                    }
                }
            });
            this.controlpack.contentWindow.addEventListener("blur", function (e) {
                cmd.hide(machine);
            });
            // bind general editor shortcuts here too so no functionality is 
            // lost.
            bindEditorShortcuts(this.controlpack.contentDocument);
            this.control.focus();
            this.controlOpened = true;
        }
    };
    CMD.prototype.hide = function (machine) {
        if (this.controlOpened === true) {
            machine.doc.parentNode.removeChild(this.controlpack);
            machine.doc.classList.remove("tm-control-on");
            machine.focus();
            this.control = this.control.cloneNode(true); // remove eventlistener
            this.control.value = ""; // clear input
            this.controlpack = this.controlpack.cloneNode(true);
            this.controlOpened = false;
        }
    };
    CMD.prototype.toggle = function (machine) {
        if (this.controlOpened === true) {
            this.hide(machine);
        } else {
            this.show(machine);
        }
    };
    CMD.prototype.find = function (machine) {
        this.show(machine);
        this.control.value = "find " + this.findquery;
    };
    CMD.prototype.findNext = function (machine) {
        machine.find(this.findquery);
    };
    CMD.prototype.findPrev = function (machine) {
        machine.find(this.findquery, true);
    };
    CMD.prototype.modifyForReplace = function (machine, forAll) {
        this.replControl = document.createElement("div");
        this.replValue = document.createElement("input");
        this.replReplacement = document.createElement("input");
        this.replAll = document.createElement("button");

        this.replValue.id = "tm-control-replace-value";
        this.replValue.type = "text";
        this.replReplacement.id = "tm-control-replace-replacement";
        this.replReplacement.type = "text";

        this.replAll.id = "tm-control-replace-all";
        this.replAll.innerHTML = "all <strong>?</strong>";

        this.replControl.id = "tm-control";
        this.replControl.innerHTML = "replace ";
        this.replControl.appendChild(this.replAll);
        this.replControl.appendChild(this.replValue);
        this.replControl.innerHTML += " with ";
        this.replControl.appendChild(this.replReplacement);

        this.controlpack.contentDocument.body.removeChild(this.control);
        this.controlpack.contentDocument.body.appendChild(this.replControl);
        var cDocument = this.controlpack.contentDocument;
        var replValue = cDocument.getElementById("tm-control-replace-value"),
            replReplacement = cDocument.getElementById("tm-control-replace-replacement"),
            replAll = cDocument.getElementById("tm-control-replace-all"),
            cmd = this;
        if (forAll === true) {
            replAll.classList.add("tm-control-replace-all-on");
            replAll.innerHTML = "all &#10004;";
            replAll.dataset.replaceAll = true;
        }
        replAll.addEventListener("click", function () {
            if (this.classList.length === 1) {
                this.classList.remove("tm-control-replace-all-on");
                this.innerHTML = "all <strong>?</strong>";
                delete this.dataset.replaceAll;
            } else {
                this.classList.add("tm-control-replace-all-on");
                this.innerHTML = "all &#10004;";
                this.dataset.replaceAll = true;
            }
        }, false);
        replValue.focus();
        var repquery = this.replacequeryfrom;
        if (repquery !== undefined && repquery !== " ") {
            replValue.value = repquery;
        } else {
            replValue.value = "";
        }
        replValue.addEventListener("keypress", function (e) {
            if (e.keyCode === 13 || e.keyCode === 9) {
                replReplacement.focus();
            }
        });

        replReplacement.value = this.replacequeryto;
        replReplacement.addEventListener("keypress", function (e) {
            if (e.keyCode === 13) {
                cmd.replacequeryfrom = replValue.value;
                cmd.findquery = cmd.replacequeryfrom;
                cmd.replacequeryto = replReplacement.value;
                if (replAll.dataset.replaceAll === "true") {
                    machine.replaceAll(replValue.value, replReplacement.value);
                } else {
                    machine.replace(replValue.value, replReplacement.value);
                }
            }
        });
    };
    CMD.prototype.replace = function (machine) {
        this.show(machine);
        this.control.value = "replace ";
        this.modifyForReplace(machine);
    };
    CMD.prototype.replaceAll = function (machine) {
        this.show(machine);
        this.control.value = "replace all";
        this.modifyForReplace(machine, true);
    };
    CMD.prototype.define = function (machine) {
        this.show(machine);
        this.control.value = "define ";
        // yeah idk how i'm going to do this.
    };
    CMD.prototype.parse = function (machine, query) {
        var commands = ["find", "define"],
            lowerquery = query.toLowerCase(),
            i;

        if (query.length === 0) {
            // Pressed enter in empty control. Probably looking to close it.
            this.hide(machine);
            return true;
        }

        for (i = 0; i < commands.length; i++) {
            var command = commands[i];
            if (lowerquery.indexOf(command) === 0) {
                // Get query after command.
                var q = query.slice(command.length + 1);
                // Store the query for later reuse.
                this[command + "query"] = q;
                if (command === "find") {
                    this.replacequeryfrom = this.findquery;
                }
                // Execute query via tm[command](query) (e.g., tm.find("word"))
                machine[command](q);
                // Stop looping.
                break;
            }
        }
    };
    TM.control = new CMD();

    initTM = function (val) {
        var tm = new TM(val);
        tm.doc.addEventListener("input", function () {
            var store = global.tm.store,
                value = global.tm.value;
            global.tm.history.change(
                global.tm,
                {from: store, to: value},
                global.tm.getSelection()
            );
            setFileDirty(true);
            displayWordCount();
            global.tm.store = global.tm.value;
        });
        tm.doc.addEventListener("keydown", function (e) {
            toggleSuperfluous(true);

            if (!e.metaKey && !e.altKey && e.keyIdentifier !== "Shift") {
                tm.lastInput = e.which;
            }

            // Insert tab.
            if (tm.isFocused() && e.which === 9) {
                tm.insertText("\t");
                e.preventDefault();
            }

            // store the cursor position/selection.
            tm.lastCursor = tm.getSelection();
        });
        tm.doc.addEventListener("keypress", function () {
            playClicks();
        });
        tm.doc.addEventListener("mouseup", function () {
            displayWordCount();

            // store the cursor position/selection.
            tm.lastCursor = tm.getSelection();
        });
        tm.doc.onpaste = function (e) {
            e.preventDefault();
            var content = e.clipboardData.getData("text/plain");
            var oldContent = global.tm.value;
            global.tm.insertText(content);
        };
        return tm;
    };

    tm = initTM();

    document.onmousemove = function () {
        displayWordCount();
    };
    // Keyboard Shortcuts
    bindEditorShortcuts = function (el) {
        el.addEventListener("keydown", function (e) {
            var k = e.keyCode,
                cmd = e.metaKey,
                alt = e.altKey,
                shift = e.shiftKey;
            if (cmd === true) {
                // All shortcuts here include "cmd" so no need to check for it.
                /* Dev shortcuts */
                // Cmd-Alt-J
                if (alt && !shift && k === 74) {
                    win.showDevTools();
                }
                /* Editor shortcuts */
                // Cmd-,
                if (!alt && !shift && k === 188) {
                    openSettings();
                }
                // Cmd-O
                if (!alt && !shift && k === 79) {
                    openFileDialog();
                }
                // Cmd-S
                if (!alt && !shift && k === 83) {
                    saveFile(global.filePath);
                }
                // Shift-Cmd-S 
                if (!alt && shift && k === 83) {
                    saveFile();
                }
                // Cmd-N OR Cmd-T
                if ((!alt && !shift && k === 78) || (!alt && !shift && k === 84)) {
                    newFile();
                }
                // Shift-Cmd-F OR Cmd-[Enter]
                if ((!alt && shift && k === 70) || (!alt && !shift && k === 13)) {
                    toggleFullscreen();
                }
                // Cmd-F
                if (!alt && !shift && k === 70) {
                    TM.control.find(tm);
                }
                // Cmd-G
                if (!alt && !shift && k === 71) {
                    TM.control.findNext(tm);
                }
                // Shift-Cmd-G
                if (!alt && shift && k === 71) {
                    TM.control.findPrev(tm);
                }
                // Cmd-Alt-F
                if (alt && !shift && k === 70) {
                    TM.control.replace(tm);
                }
                // Shift-Cmd-Alt-F
                if (alt && shift && k === 70) {
                    TM.control.replaceAll(tm);
                }
                // Cmd-D
                if (!alt && !shift && k === 68) {
                    TM.control.define(tm);
                }
                // Cmd-/
                if (!alt && !shift && k === 191) {
                    TM.control.toggle(tm);
                }
                // Cmd-Z
                if (!alt && !shift && k === 90) {
                    if (tm.isFocused()) {
                        e.preventDefault();
                        tm.history.undo(tm);
                        if ((!tm.hasSaved && !tm.history.canUndo(tm))
                                || (tm.hasSaved && tm.checkpoint === tm.value)) {
                            setFileDirty(false);
                        } else {
                            setFileDirty(true);
                        }
                    }
                }
                // Shift-Cmd-Z
                if (!alt && shift && k === 90) {
                    if (tm.isFocused()) {
                        e.preventDefault();
                        tm.history.redo(tm);
                        if (tm.hasSaved && tm.checkpoint === tm.value) {
                            setFileDirty(false);
                        } else {
                            setFileDirty(true);
                        }
                    }
                }
                // Cmd-Alt-[Left Arrow]
                if (alt && !shift && k === 37) {
                    goToPrevTab();
                }
                // Cmd-Alt-[Right Arrow]
                if (alt && !shift && k === 39) {
                    goToNextTab();
                }
            }
            // Esc
            if (!cmd && !alt && !shift && k === 27) {
                if (win.isFullscreen === true) {
                    toggleFullscreen();
                }
            }
        });
    };
    bindEditorShortcuts(document);

    window.onmousemove = function () {
        toggleSuperfluous(false);
    };

    getWordCount = function () {
        var doc = tm.value.match(/\S+/g),
            subdoc = tm.value.substring(tm.selectionStart, tm.selectionEnd),
            selection = subdoc.match(/\S+/g),
            docCount,
            selectCount;
        if (selection) {
            selectCount = selection.length;
        } else {
            selectCount = 0;
        }

        if (doc) {
            docCount = doc.length;
        } else {
            docCount = 0;
        }

        return {doc: docCount, selection: selectCount};
    };

    displayWordCount = function () {
        var wordCount = getWordCount(),
            counterText = "",
            wordS = "words",
            counter = document.getElementById("wr-wc");

        if (wordCount.doc === 1) {
            wordS = "word";
        }

        if (wordCount.selection !== 0) {
            counterText = wordCount.selection + " of " + wordCount.doc + " " + wordS;
        } else {
            counterText = wordCount.doc + " " + wordS;
        }

        counter.innerText = counterText;
    };

    toggleSuperfluous = function (hide, override) {
        // "override" is for special case when app leaves fullscreen and needs
        // to unhide all superfluous.
        var duration, scrollCss, counterCss;
        duration = 0;
        if (win.isFullscreen || override === true) {
            scrollCss = $(tm.doc).css("overflow-y");
            counterCss = $counter.css("display");
            if (hide) {
                $(tm.doc).css("overflow-y", "hidden");
                $counter.fadeOut(duration);
            } else {
                $(tm.doc).css("overflow-y", "overlay");
                if (win.isFullscreen) {
                    $counter.fadeIn(duration);
                }

                if (override) {
                    $counter.fadeOut(duration);
                }
            }
        }
    };

    recentFiles = localStorage.recentFiles ? JSON.parse(localStorage.recentFiles) : [];

    clearRecentFiles = function () {
        recentFiles = [];
        delete localStorage.recentFiles;
    };

    removeRecentFile = function (path) {
        var index = recentFiles.indexOf(path);
        if (index >= 0) {
            recentFiles.splice(index, 1);
            localStorage.recentFiles = JSON.stringify(recentFiles);
        }
    };

    updateRecentFiles = function (path) {
        if (recentFiles === undefined) {
            recentFiles = [];
        }

        if (recentFiles.length === 10) {
            recentFiles.pop();
        }

        // locate path within recentFiles list
        var index = recentFiles.indexOf(path);
        if (index >= 0) {
            // path found. remove it from list.
            recentFiles.splice(index, 1);
        }

        // place element at the top of the array by using unshift instead of 
        // push.
        recentFiles.unshift(path);
        localStorage.recentFiles = JSON.stringify(recentFiles);
    };

    hasRecentFiles = function () {
        var ret;
        if (recentFiles !== undefined) {
            if (recentFiles.length !== 0) {
                ret = true;
            } else {
                ret = false;
            }
        } else {
            ret = false;
        }
        return ret;
    };

    openSettings = function () {
        var customizer, closer, hider, colorSpectrum,
            themes, saveTheme, updateTheme, updateElement,
            styleDiv, bgimg, bgimgy, bgimgx, bgimgcover, bgcolor,
            textfont, textsize, textsizes, textsizer, textsizeunit,
            textweight, textstyle, textcolor, texthighlight,
            textsizetoggle,
            scrollcolor, scrolltrackcolor, allowaudio,
            allowclicks, audioselect, clickselect, reset, oldCss;

        styleDiv = document.getElementById("user-css");

        updateElement = function (cat, array, name, value, selector) {
            var exists;
            exists = array.filter(function (element, index) {
                if (selector) {
                    if (element.selector === selector) {
                        array.splice(index, 1);
                    }
                } else {
                    if (element.name === name) {
                        array.splice(index, 1);
                    }
                }
            });

            if (value) {
                if (selector) {
                    array.push({selector: selector, name: name, value: value});
                } else {
                    array.push({name: name, value: value});
                }
            }
            theme.updated[cat] = true;
            theme.customized = true;
            theme.saved = false;
        };

        updateTheme = function () {
            var bod = "body {", cem = ".tm-w-default {", oth = "",
                bodAll = "", cemAll = "", othAll = "";
            if (theme.updated.body) {
                theme.updated.body = false;
                theme.body.forEach(function (style, index) {
                    bod += style.name + ":" + style.value + ";";
                    if (index === theme.body.length - 1) {
                        bod += "}";
                        var oldBod = document.getElementById("wr-bod-style");
                        if (oldBod) {
                            styleDiv.removeChild(oldBod);
                        }
                        bodAll += "<div id='wr-bod-style'><style>";
                        bodAll += "@media (min-width: 800px) {" + bod;
                        bodAll += "}</style></div>";
                        styleDiv.innerHTML += bodAll;
                    }
                });
            }
            if (theme.updated.text) {
                theme.updated.text = false;
                theme.cm.forEach(function (style, index) {
                    cem += style.name + ":" + style.value + ";";
                    if (index === theme.cm.length - 1) {
                        cem += "}";
                        var oldCem = document.getElementById("wr-cem-style");
                        if (oldCem) {
                            styleDiv.removeChild(oldCem);
                        }
                        cemAll += "<div id='wr-cem-style'><style>";
                        cemAll += "@media (min-width: 800px) {" + cem;
                        cemAll += "}</style></div>";
                        styleDiv.innerHTML += cemAll;
                    }
                });
            }
            if (theme.updated.other) {
                theme.updated.other = false;
                theme.other.forEach(function (style, index) {
                    oth += style.selector + " {";
                    oth += style.name + ":" + style.value + ";";
                    oth += style.selector + "}";
                    if (index === theme.other.length - 1) {
                        var oldOth = document.getElementById("wr-oth-style");
                        if (oldOth) {
                            styleDiv.removeChild(oldOth);
                        }
                        othAll += "<div id='wr-oth-style'><style>";
                        othAll += "@media (min-width: 800px) {" + oth;
                        othAll += "}</style></div>";
                        styleDiv.innerHTML += othAll;
                    }
                });
            }
        };

        if (win.isFullscreen === false) {
            toggleFullscreen();
        }

        customizer = document.getElementById("wr-customizer");
        customizer.style.display = "block";
        themes = document.getElementById("wr-themes");
        $(themes.children).click(function (ev) {
            var theme = this,
                css = theme.dataset.value,
                link,
                custom = document.getElementById("wr-customtheme");

            link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            if (theme.parentNode.id === "wr-themes-custom") {
                link.href = gui.App.dataPath + "/Themes/" + css + "/" + css + ".css";
            } else {
                link.href = "Themes/" + css + "/" + css + ".css";
            }
            styleDiv.innerHTML = "";
            unloadDefaultTheme();
            if (css !== "Light") {
                styleDiv.appendChild(link);
            }
        });
        colorSpectrum = function (type, where, cssName, color) {
            updateElement(type, where, cssName,
                color.toPercentageRgbString());
            updateTheme();
            if (type === "text") {
                texthighlight.style.color = color;
                textcolor.children[0].style.color = color;
                // find contrast by calculating the YIQ and compare against
                // half of white (255 / 2 ~= 128).
                // (http://24ways.org/2010/calculating-color-contrast/)
                var col = color.toHex(),
                    r = parseInt(col.substr(0, 2), 16),
                    g = parseInt(col.substr(2, 2), 16),
                    b = parseInt(col.substr(4, 2), 16),
                    yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                if (yiq >= 128) {
                    textcolor.style.backgroundColor = "rgba(0,0,0,0.7)";
                    textcolor.style.borderColor = "transparent";
                } else {
                    textcolor.style.backgroundColor = "rgba(255,255,255,0.9)";
                    textcolor.style.borderColor = "black";
                }
            }

            if (cssName === "background-color") {
                bgcolor.style.backgroundColor = color;
            }
        };
        bgcolor = document.getElementById("wr-bg-color");
        $(bgcolor).spectrum({
            color: bgcolor.dataset.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                colorSpectrum("body", theme.body, "background-color", color);
            },
            hide: function (color) {
                colorSpectrum("body", theme.body, "background-color", color);
            },
            change: function (color) {
                colorSpectrum("body", theme.body, "background-color", color);
            }
        });
        bgimg = document.getElementById("wr-bg-img");
        bgimg.onchange = function () {
            var img = bgimg.value;
            if (img !== "") {
                updateElement("body", theme.body, "background-image",
                        "url('" + img + "')");
                theme.bgImg = img;
                bgimg.style.backgroundImage = "url('" + img + "')";
            } else {
                updateElement("body", theme.body, "background-image", "none");
                bgimg.style.backgroundImage = "none";
                if (theme.bgImg) {
                    delete theme.bgImg;
                }
            }
            updateTheme();
        };
        bgimgy = document.getElementById("wr-bg-repeat-y");
        bgimgx = document.getElementById("wr-bg-repeat-x");
        bgimgy.onclick = function () {
            if (bgimgy.dataset.checked === "true") {
                // button WAS selected, now being deselected.
                if (bgimgx.dataset.checked === "false") {
                    // no repeat selected.
                    updateElement("body", theme.body, "background-repeat",
                            "no-repeat");
                } else {
                    // repeat-x selected.
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-x");
                }
                bgimgy.dataset.checked = false;
            } else {
                if (bgimgx.dataset.checked === "true") {
                    // repeat all.
                    updateElement("body", theme.body, "background-repeat", "repeat");
                } else {
                    // repeat-y only.
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-y");
                }
                bgimgy.dataset.checked = true;
            }
            updateTheme();
        };
        bgimgx.onclick = function () {
            if (bgimgx.dataset.checked === "true") {
                // button WAS selected, now deselected.
                if (bgimgy.dataset.checked === "false") {
                    // none selected.
                    updateElement("body", theme.body, "background-repeat",
                            "no-repeat");
                } else {
                    // repeat y selected.
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-y");
                }
                bgimgx.dataset.checked = false;
            } else {
                if (bgimgy.dataset.checked === "true") {
                    // all selected.
                    updateElement("body", theme.body, "background-repeat", "repeat");
                } else {
                    // repeat-x only.
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-x");
                }
                bgimgx.dataset.checked = true;
            }
            updateTheme();
        };
        bgimgcover = document.getElementById("wr-bg-stretch");
        bgimgcover.onclick = function () {
            if (bgimgcover.dataset.checked === "false") {
                // button wasn't selected. clicked, so select it.
                bgimgcover.dataset.checked = true;
                updateElement("body", theme.body, "background-size", "cover");
            } else {
                bgimgcover.dataset.checked = false;
                updateElement("body", theme.body, "background-size", "auto");
            }
            updateTheme();
        };
        textcolor = document.getElementById("wr-text-color");
        $(textcolor).spectrum({
            color: textcolor.dataset.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                colorSpectrum("text", theme.cm, "color", color);
            },
            hide: function (color) {
                colorSpectrum("text", theme.cm, "color", color);
            },
            change: function (color) {
                colorSpectrum("text", theme.cm, "color", color);
            }
        });
        textfont = document.getElementById("wr-text-font");
        $(textfont.children).each(function (index) {
            var font = this.dataset.value;
            this.style.fontFamily = font;
        }).click(function () {
            var font = this;
            if (font.dataset.value !== "...") {
                updateElement("text", theme.cm, "font-family", "'" +
                    font.dataset.value + "'");
                updateTheme();
            }
        });
        textsizes = document.getElementById("wr-text-sizes");
        textsizer = document.getElementById("wr-text-sizer");
        textsize = document.getElementById("wr-text-size");
        textsizeunit = document.getElementById("wr-text-size-unit");
        $(textsizes.children).click(function () {
            var size = this.dataset.value;
            textsizetoggle = this;
            if (size !== "...") {
                textsize.value = size;
                $(textsize).change();
                if (textsizetoggle.style.display === "none") {
                    textsizetoggle.style.display = "inline-table";
                    textsizer.style.display = "none";
                }
            } else {
                textsizetoggle.style.display = "none";
                textsizer.style.display = "inline-table";
            }
        });
        textsize.onchange = function () {
            updateElement("text", theme.cm, "font-size",
                textsize.value + textsizeunit.value);
            updateTheme();
        };
        textsizeunit.onchange = function () {
            updateElement("text", theme.cm, "font-size",
                    textsize.value + textsizeunit.value);
            updateTheme();
        };
        textweight = document.getElementById("wr-text-weight");
        $(textweight.children).each(function () {
            this.style.fontWeight = this.dataset.value;
        }).click(function () {
            updateElement("text", theme.cm, "font-weight", this.dataset.value);
            updateTheme();
        });
        textstyle = document.getElementById("wr-text-style");
        $(textstyle.children).click(function () {
            var styl = this.dataset.value;
            updateElement("text", theme.cm, "font-style", styl);
            updateTheme();
        });
        texthighlight = document.getElementById("wr-highlight-color");
        $(texthighlight).spectrum({
            color: texthighlight.dataset.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::selection");
                updateTheme();
                texthighlight.children[0].style.backgroundColor = color;
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::selection");
                updateTheme();
                texthighlight.children[0].style.backgroundColor = color;
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::selection");
                updateTheme();
                texthighlight.children[0].style.backgroundColor = color;
            }
        });
        scrollcolor = document.getElementById("wr-scroll-color");
        $(scrollcolor).spectrum({
            color: scrollcolor.dataset.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
                scrollcolor.style.backgroundColor = color;
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
                scrollcolor.style.backgroundColor = color;
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
                scrollcolor.style.backgroundColor = color;
            }
        });
        scrolltrackcolor = document.getElementById("wr-scrolltrack-color");
        $(scrolltrackcolor).spectrum({
            color: scrolltrackcolor.dataset.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
                scrolltrackcolor.style.backgroundColor = color;
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
                scrolltrackcolor.style.backgroundColor = color;
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
                scrolltrackcolor.style.backgroundColor = color;
            }
        });
        allowaudio = document.getElementById("wr-audio-stop");
        if (parcel.playaudio === false) {
            allowaudio.className += "is-chosen";
        }
        audioselect = document.getElementById("wr-fullscreen-audio");
        $(audioselect.children).click(function () {
            if (this.className.indexOf("wr-noclick") === -1) {
                var audio = this.dataset.value;
                if (audio !== "off") {
                    updateParcel("playaudio", true);
                    toggleAudio(true);
                    // play song choice
                } else {
                    toggleAudio(false);
                    updateParcel("playaudio", false);
                }
            }
        });
        allowclicks = document.getElementById("wr-clicks-stop");
        if (parcel.playclicks === false) {
            allowclicks.className += "is-chosen";
        }
        clickselect = document.getElementById("wr-fullscreen-clicks");
        $(clickselect.children).click(function () {
            if (this.className.indexOf("wr-noclick") === -1) {
                var clicks = this.dataset.value;
                if (clicks !== "off") {
                    updateParcel("playclicks", true);
                } else {
                    updateParcel("playclicks", false);
                }
            }
        });

        saveTheme = function () {
        };

        reset = document.getElementById("wr-reset");
        reset.onclick = function () {
        };
        closer = document.getElementById("wr-close");
        closer.onclick = function () {
            customizer.style.display = "none";
            loadDefaultTheme();
            tm.focus();
        };
        hider = document.getElementById("wr-hider");
        hider.onclick = function () {
            // customizer.style.display = "none";
            if (hider.className.indexOf("wr-close-closed") === -1) {
                customizer.style.left = "-260px";
                hider.innerHTML = "&gt;";
                hider.className = "wr-close-closed";
                tm.focus();
            } else {
                customizer.style.left = "0";
                hider.innerHTML = "&lt;";
                hider.className = "";
                customizer.focus();
            }
        };
    };

    /**
    * charcodes
    * Cmd:    \u2318
    * Shift:  \u21E7
    * Alt:    \u2325
    * ESC:    \u238B
    * Caps:   \u21EA
    * Enter:  \u21A9
    * Delete: \u232B
    **/

    menubar = new gui.Menu({type: "menubar"});
    win.menu = menubar;

    /* MENUS */
    // (Menus) File >
    filemenu = new gui.Menu();

    filemenu.append(new gui.MenuItem({
        label: "New  (\u2318N)",
        click: function () {
            newFile();
        }
    }));

    filemenu.append(new gui.MenuItem({
        label: "Open...  (\u2318O)",
        click: function () {
            openFileDialog();
        }
    }));

    openmenu = new gui.Menu();

    openrecents = new gui.MenuItem({
        label: "Open Recent",
        enabled: false
    });

    if (hasRecentFiles() === true) {
        /* iterate through recentFiles. */
        recentFiles.forEach(function (element, index, array) {
            openmenu.append(new gui.MenuItem({
                label: element,
                click: function () {
                    newFile(element);
                }
            }));
        });
        openmenu.append(new gui.MenuItem({
            type: "separator"
        }));
        openmenu.append(new gui.MenuItem({
            label: "Clear List",
            click: function () {
                clearRecentFiles();
            }
        }));
        openrecents.enabled = true;
    }

    openrecents.submenu = openmenu;

    filemenu.append(openrecents);

    filemenu.append(new gui.MenuItem({
        type: "separator"
    }));

    filemenu.append(new gui.MenuItem({
        label: "Save  (\u2318S)",
        click: function () {
            saveFile(global.filePath);
        }
    }));

    filemenu.append(new gui.MenuItem({
        label: "Save As...  (\u21E7\u2318S)",
        click: function () {
            saveFile();
        }
    }));

    filemenu.append(new gui.MenuItem({
        label: "Close  (\u2318W)",
        click: function () {
            win.close();
        }
    }));

    // (Right-click menus) Edit >
    editmenu = new gui.Menu();
    editmenu.append(new gui.MenuItem({
        label: "Cut",
        click: function () {
            var selection = tm.value.substring(tm.selectionStart, tm.selectionEnd);
            clip.set(selection);
            // replace selection with ""
            tm.value = tm.value.slice(0, tm.selectionStart) +
                tm.value.slice(tm.selectionEnd, tm.value.length - 1);
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Copy",
        click: function () {
            clip.set(tm.value.substring(tm.selectionStart, tm.selectionEnd));
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Paste",
        click: function () {
            var selection = tm.value.substring(tm.selectionStart, tm.selectionEnd);
            // replace selection with clipboard content.
            tm.value = tm.value.slice(0, tm.selectionStart) + clip.get() +
                tm.value.slice(tm.selectionEnd, tm.value.length - 1);
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Select All",
        click: function () {
            tm.select();
        }
    }));

    // (Menus) Find >
    findmenu = new gui.Menu();
    findmenu.append(new gui.MenuItem({
        label: "Find  (\u2318F)",
        click: function () {
            TM.control.find(tm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find Next  (\u2318G)",
        click: function () {
            TM.control.findNext(tm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find Previous  (\u21E7\u2318G)",
        click: function () {
            TM.control.findPrev(tm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find & Replace  (\u2325\u2318F)",
        click: function () {
            TM.control.replace(tm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Replace All  (\u21E7\u2325\u2318F)",
        click: function () {
            TM.control.replaceAll(tm);
        }
    }));

    // (Menus) View >
    viewmenu = new gui.Menu();

    viewmenu.append(new gui.MenuItem({
        label: "Toggle Full Screen  (\u2318\u21A9 or \u21E7\u2318F)",
        click: function () {
            toggleFullscreen();
        }
    }));

    viewmenu.append(new gui.MenuItem({
        type: "separator"
    }));

    thememenu = new gui.Menu();

    theme.presets.forEach(function (skin, index) {
        var defaultTheme = getDefaultTheme(),
            iteminfo;
        iteminfo = {
            label: skin.name,
            type: "checkbox",
            click: function () {
                submenuLoadTheme(skin.name, skin.custom);
            }
        };
        if (defaultTheme.name === skin.name) {
            iteminfo.checked = true;
        }
        thememenu.append(new gui.MenuItem(iteminfo));
    });

    fs.readdir(gui.App.dataPath + "/Themes/", function (err, files) {
        if (files) {
            var themesSelector = document.getElementById("wr-themes-custom");
            files.forEach(function (fileName, index) {
                var opt, defaultTheme, iteminfo;
                if (fileName.charAt(0) !== ".") {
                    defaultTheme = getDefaultTheme();
                    iteminfo = {
                        label: fileName,
                        type: "checkbox",
                        click: function () {
                            submenuLoadTheme(fileName, true);
                        }
                    };
                    if (defaultTheme.name === fileName) {
                        iteminfo.checked = true;
                    }
                    thememenu.append(new gui.MenuItem(iteminfo));

                    opt = document.createElement("option");
                    opt.value = fileName;
                    opt.innerText = fileName;
                    opt.id = "wr-theme-" + fileName;
                    themesSelector.appendChild(opt);
                }
            });
        }
    });

    viewmenu.append(new gui.MenuItem({
        label: "Themes",
        submenu: thememenu
    }));

    viewmenu.append(new gui.MenuItem({
        label: "Settings",
        click: function () {
            openSettings();
        }
    }));

    viewmenu.append(new gui.MenuItem({
        type: "separator"
    }));

    viewmenu.append(new gui.MenuItem({
        label: "Go to Next Tab (\u2325\u2318\u2192)",
        click: function () {
            goToNextTab();
        }
    }));

    viewmenu.append(new gui.MenuItem({
        label: "Go to Previous Tab (\u2325\u2318\u2190)",
        click: function () {
            goToNextTab();
        }
    }));

    // Insert these submenus into the app menu.
    // Should give:
    // App | File | Edit | Find | View | Window
    win.menu.insert(new gui.MenuItem({
        label: "File",
        submenu: filemenu
    }), 1);
    win.menu.insert(new gui.MenuItem({
        label: "View",
        submenu: viewmenu
    }), 3);
    win.menu.insert(new gui.MenuItem({
        label: "Find",
        submenu: findmenu
    }), 3);

    // Insert editmenu on right-click.
    tm.doc.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        editmenu.popup(e.x, e.y);
        return false;
    });
    /* END MENUS */

    /* TITLEBAR */
    titlebar = document.getElementById("titlebar");
    fullscreenbutton = document.getElementById("wr-fullscreen-button");
    windowbuttons = document.getElementById("wr-window-buttons");
    addtabsbutton = document.getElementById("wr-add-tab");
    fullscreenbutton.onclick = function () {
        toggleFullscreen();
    };
    windowbuttons.addEventListener("mouseover", function () {
        var i;
        for (i = 0; i < windowbuttons.children.length; i++) {
            windowbuttons.children[i].classList.add("wr-window-button-hover");
        }
    });
    windowbuttons.addEventListener("mouseout", function () {
        var i;
        for (i = 0; i < windowbuttons.children.length; i++) {
            windowbuttons.children[i].classList.remove("wr-window-button-hover");
        }
    });
    addtabsbutton.onclick = function () {
        newFile();
    };
    document.getElementById("wr-close-button").onclick = function () {
        closeAllTabs();
    };
    document.getElementById("wr-minimize-button").onclick = function () {
        win.minimize();
    };
    document.getElementById("wr-maximize-button").onclick = function () {
        win.maximize();
    };

    /* MISC FULLSCREEN & WINDOW FUNCTIONS */
    toggleAudio = function (playAudio) {
        if (playAudio === undefined) {
            if (parcel.playaudio !== false) {
                if (win.isFullscreen === true) {
                    if (audio.paused === true) {
                        audio.play();
                    } else {
                        audio.pause();
                    }
                } else {
                    audio.pause();
                }
            }
        } else {
            if (playAudio === true) {
                if (audio.paused === true) {
                    audio.play();
                }
            } else {
                if (audio.paused !== true) {
                    audio.pause();
                }
            }
        }
    };

    playClicks = function () {
        if (parcel.playclicks !== false) {
            if (win.isFullscreen) {
                var id, name, len, format, path, rand, sound;
                if (parcel.clicks) {
                    id = parcel.clicks;
                } else {
                    id = 0;
                }
                name = sounds.clicks[id].name;
                len  = sounds.clicks[id].len - 1;
                format = sounds.clicks[id].format;
                path = "Audio Clicks/" + name + "/";
                rand = Math.floor(Math.random() * len) + 1;
                sound = new Audio(path + rand + "." + format);

                sound.play();
            }
        }
    };

    setFileDirty = function (isDirty) {
        var fd = false;
        if (isDirty === true) {
            // file edited
            if ((!tm.hasSaved && tm.history.canUndo(tm) === true)
                    || (tm.hasSaved && tm.checkpoint !== tm.value)) {
                fd = true;
            }
        }

        fileDirty = fd;
        updateCloseDirt(fileDirty);
        updateTitleDirt(fileDirty);
        updateCounterDirt(fileDirty);
    };

    getFileDirty = function (tab) {
        var dirty = false,
            di = tab.children[1];

        // if the tab's second span contains anything (e.g., "- Edited")
        // then the tab is dirty.
        if (di.innerText.length > 0) {
            dirty = true;
        }

        setFileDirty(dirty);
    };

    setPageTitle = function (path) {
        var docName, oldTitle, newTitle;
        if (path) {
            docName = path.split("/").pop();
        } else {
            docName = "Untitled";
        }

        oldTitle = document.title;
        newTitle = docName;

        document.title = newTitle;
        document.getElementById("wr-tab-selected").children[0].innerText = newTitle;
    };

    updateCloseDirt = function (isDirty) {
        var closer = document.getElementById("wr-close-button");
        if (isDirty) {
            closer.classList.add("wr-window-dirty");
        } else {
            closer.classList.remove("wr-window-dirty");
        }
    };

    updateTitleDirt = function (isDirty) {
        var dirt, oldTitle, newTitle, oldDirt, tabDirt;
        dirt = "\u2022 ";
        tabDirt = " &mdash; Edited";
        oldTitle = document.title;

        // document title contains the dirt char
        if (oldTitle.indexOf(dirt) >= 0) {
            if (oldTitle.slice(0, dirt.length) === dirt) {
                // dirt char found at start of doc title. assume this is 
                // indication of dirt and not just user's own file name.
                oldDirt = true;
                newTitle = oldTitle.slice(dirt.length);
            }
        }

        if (isDirty) {
            if (!oldDirt) {
                newTitle = dirt + oldTitle;
            } else {
                newTitle = dirt + newTitle;
            }
        } else {
            if (!oldDirt) {
                newTitle = oldTitle;
            }
            tabDirt = "";
        }

        document.title = newTitle;
        document.getElementById("wr-tab-selected").children[1].innerHTML = tabDirt;
    };

    updateCounterDirt = function (isDirty) {
        var dirt;
        if (isDirty) {
            dirt = "[+]";
        } else {
            dirt = "";
        }

        document.getElementById("wr-dirt").innerText = dirt;
    };

    updateTabs = function (file, data) {
        tabs[file] = initTM();
        if (data) {
            tabs[file].value = data;
        }
    };

    makeUTF8 = function (data) {
        // Sanitizes the txt contents.
        return JSON.parse(new Buffer(JSON.stringify(data)).toString("utf8"));
    };

    saveFile = function (path, callback) {
        if (path !== undefined && path.indexOf("untitled-") === 0) {
            // file path begins with "untitled-". We can assume that this
            // is an undefined file since users wont be saving directly
            // to the app's root while also saving with the prefix "untitled-".
            // If this becomes a problem later on, implement some check to see
            // whether the current tab is a file or a file-to-be.
            path = undefined;
        }

        if (path !== undefined && typeof path !== "function") {
            var data = makeUTF8(tm.value);
            fs.writeFile(path, data, function (err) {
                if (err) {
                    alert("Couldn't save file: " + err);
                }

                setFileDirty(false);
                global.tm.hasSaved = true;
                global.tm.checkpoint = global.tm.value;
                if (callback) {
                    callback();
                }
            });
        } else {
            var saveButton = document.getElementById("save");
            saveButton.click();

            saveButton.onchange = function () {
                global.filePath = saveButton.value;
                if (callback) {
                    saveFile(global.filePath, function () {
                        setPageTitle(global.filePath);
                        callback();
                    });
                } else {
                    saveFile(global.filePath);
                    setPageTitle(global.filePath);
                }
            };
        }
    };

    saveAndClose = function () {
        saveFile(global.filePath, function () {
            closeTab();
        });
    };

    newFile = function (file, callback) {
        var tabsbar = document.getElementById("wr-tabs"),
            currentTab = document.getElementById("wr-tab-selected"),
            newTab = document.createElement("li");

        newTab.id = "wr-tab-selected";
        newTab.innerHTML = "<span>Untitled</span><span></span>";

        if (file) {
            if (tm.value.length > 0
                    || currentTab.dataset.file.indexOf("untitled-") !== 0) {
                // Current tab is either being used or already a saved file
                currentTab.removeAttribute("id");
                tabsbar.appendChild(newTab);
                tabs[currentTab.dataset.file] = tm.clone();
            } else {
                // Current tab untitled and unused. Open file within this tab.
                delete tabs[currentTab.dataset.file];
                currentTab.dataset.file = file;
            }

            openFile(file, callback); // updateTabs() appears within this fn.
        } else {
            file = "untitled-" + Math.floor(Math.random() * Math.pow(10, 17));
            updateTabs(file);
            if (currentTab) {
                currentTab.removeAttribute("id");
                tabs[currentTab.dataset.file] = tm.clone();
            }
            tabsbar.appendChild(newTab);
            tm.upgrade(tabs[file]);
            tm = tabs[file];
            tm.update();
            tm.focus();
            setFileDirty(false);
        }


        newTab.dataset.file = file;
        newTab.onclick = function () {
            var file = this.dataset.file,
                currentTab = document.getElementById("wr-tab-selected");
            if (this !== currentTab) {
                currentTab.removeAttribute("id");
                tabs[currentTab.dataset.file] = tm.clone();
                this.id = "wr-tab-selected";
                global.filePath = file;
                tm.upgrade(tabs[file]);
                tm = tabs[file];
                tm.update();
                tm.focus();
                getFileDirty(this);
            }
        };
    };

    openFileDialog = function () {
        var openButton = document.getElementById("open");
        openButton.click();
        openButton.onchange = function () {
            newFile(openButton.value);
        };
    };

    openFile = function (path, callback) {
        fs.readFile(path, function (err, data) {
            if (err) {
                alert("Couldn't open file: " + err);
                removeRecentFile(path);
                var ret;
                if (callback) {
                    ret = callback();
                } else {
                    ret = false;
                }

                return ret;
            }

            // set global filePath to this new path
            global.filePath = path;
            // update the recentFiles list for the "Open Recent >" submenu
            updateRecentFiles(path);
            // update document title
            setPageTitle(path);
            // data
            var dataUTF8 = makeUTF8(data.toString("utf8"));
            // tabs
            updateTabs(path, dataUTF8);
            // add data to textarea
            tm.upgrade(tabs[path]);
            tm = tabs[path];
            tm.update();
            tm.focus();
            tm.store = tm.value;
            // clear the dirt
            setFileDirty(false);
            if (callback) {
                callback();
            }
        });
    };

    goToNextTab = function () {
        if (Object.keys(tabs).length > 1) {
            var tabsbar = document.getElementById("wr-tabs"),
                currentTab = document.getElementById("wr-tab-selected"),
                e = new Event("click"),
                nextTab = $(currentTab).next()[0];

            if (nextTab === undefined) {
                // Current tab is last child. Loop back to start.
                nextTab = tabsbar.children[0];
            }

            nextTab.dispatchEvent(e);
        }
    };

    goToPrevTab = function () {
        if (Object.keys(tabs).length > 1) {
            var tabsbar = document.getElementById("wr-tabs"),
                currentTab = document.getElementById("wr-tab-selected"),
                e = new Event("click"),
                prevTab = $(currentTab).prev()[0];

            if (prevTab === undefined) {
                // Current tab is first child. Loop back to end.
                prevTab = tabsbar.children[tabsbar.children.length - 1];
            }

            prevTab.dispatchEvent(e);
        }
    };

    closeTab = function () {
        var currentTab = document.getElementById("wr-tab-selected"),
            tabsbar = currentTab.parentElement,
            nextTab = $(currentTab).next()[0];

        if (nextTab === undefined) {
            nextTab = $(currentTab).prev()[0];
        }

        delete tabs[currentTab.dataset.file];
        currentTab.removeAttribute("id");
        tabsbar.removeChild(currentTab);
        if (nextTab) {
            nextTab.id = "wr-tab-selected";
            global.filePath = nextTab.dataset.file;
            tm.upgrade(tabs[nextTab.dataset.file]);
            tm = tabs[nextTab.dataset.file];
            tm.update();
            tm.focus();
            getFileDirty(nextTab);
        } else {
            closeWindow();
        }

        return true;
    };

    closeAllTabs = function () {
        var i,
            allFilesClean = true,
            tabsbar = document.getElementById("wr-tabs"),
            tabslen = tabsbar.children.length;
        if (tabslen > 1) {
            for (i = 0; i < tabslen; i++) {
                var tab = tabsbar.children[i];
                if (tab && tab.children[1].innerText !== "") {
                    allFilesClean = false;
                }
            }

            if (allFilesClean === false) {
                var P = new PROMPT.init("Notice",
                        "Some files contain unsaved changes.\n\nClose all without saving?");
                P.addBtn({
                    text: "Cancel",
                    onclick: function () {
                        tm.focus();
                        return false;
                    },
                }).addBtn({
                    text: "Don't Save",
                    onclick: function () {
                        win.close(true);
                    },
                    type: "btn-red"
                });
                P.show();
            } else {
                win.close(true);
            }
        } else {
            // Only one tab open. Just close regularly.
            win.close();
        }
    };

    closeWindow = function () {
        if (global.filePath) {
            // save filePath for when the user reopens the app
            // (only 1 path can be saved since Cmd-Q skips this call and Cmd-W
            // will only close 1 file at a time)
            localStorage.filePath = global.filePath;
        }

        win.close(true);
    };

    toggleFullscreen = function () {
        win.toggleFullscreen();
    };

    toggleTitlebar = function () {
        if (titlebar.style.display !== "none") {
            titlebar.style.display = "none";
        } else {
            titlebar.style.display = "flex";
        }
    };

    focusWindowButtons = function () {
        var i;
        for (i = 0; i < windowbuttons.children.length; i++) {
            windowbuttons.children[i].classList.remove("wr-window-blurred");
        }
        fullscreenbutton.classList.remove("wr-window-blurred");
    };

    blurWindowButtons = function () {
        var i;
        for (i = 0; i < windowbuttons.children.length; i++) {
            windowbuttons.children[i].classList.add("wr-window-blurred");
        }
        fullscreenbutton.classList.add("wr-window-blurred");
    };

    win.on("enter-fullscreen", function () {
        toggleTitlebar();
        toggleAudio();
    });

    win.on("leave-fullscreen", function () {
        toggleAudio();
        toggleTitlebar();
        toggleSuperfluous(false, true);
    });

    // deal with the audio player on blur and focus
    win.on("focus", function () {
        document.body.id = "";
        // tm.focus();
        toggleAudio();
        focusWindowButtons();
    });

    win.on("blur", function () {
        document.body.id = "blurred";
        // tm.blur();
        toggleAudio();
        blurWindowButtons();
    });

    // load file into the textarea
    gui.App.on("open", function (path) {
        newFile(path);
        return false;
    });
    document.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);
    document.addEventListener("drop", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var files = e.dataTransfer.files,
            i;
        for (i = 0; i < files.length; i++) {
            newFile(files[i].path);
        }
    }, false);

    // Save some data on close.
    win.on("close", function (quit) {
        if (quit) {
            // Closing with cmd-q instead of cmd-w.
            // Loop through all tabs and close them.
            closeAllTabs();
        }

        if (fileDirty) {
            var P = new PROMPT.init("Notice", "Close file without saving?");
            P.addBtn({
                text: "Save",
                onclick: function (e) {
                    saveAndClose();
                },
                type: "btn-blue",
                focus: true
            }).addBtn({
                text: "Cancel",
                onclick: function (e) {
                    tm.focus();
                    return false;
                }
            }).addBtn({
                text: "Don't Save",
                onclick: function (e) {
                    closeTab();
                },
                type: "btn-red"
            });
            P.show();
        } else {
            closeTab();
        }
    });

    completeInit = function (path) {
        var defaultTheme, themeSelector;
        if (path === undefined) {
            newFile();
        }
        win.show();
        toggleAudio();
        setPageTitle(path);
        displayWordCount();
        defaultTheme = getDefaultTheme();
        themeSelector = document.getElementById("wr-theme-" + defaultTheme.name);
        if (themeSelector) {
            themeSelector.selected = true;
        }
    };

    // Restore some data on startup.
    global.onload = function () {
    // SUPERFLUOUS
    // might as well use jQuery for fading here since we've already imported 
    // it for the color picker
        $counter = $("#counter");

        var argv = gui.App.argv,
            lsfp,
            audiosrc;

        loadDefaultTheme();

        if (argv.length !== 0) {
            delete localStorage.filePath;
            argv.forEach(function (file, index) {
                fs.exists(file, function (exists) {
                    if (exists) {
                        if (index === 0) {
                            newFile(file, function () {
                                gui.App.argv.splice(index, 1);
                            });
                        } else {
                            newFile(file);
                            gui.App.argv.splice(index, 1);
                        }
                    }
                });
            });
        }

        if (parcel.audio) {
            audiosrc = parcel.audio;
        } else {
            audiosrc = "Audio/1.ogg";
        }

        audio.src = audiosrc;
        toggleAudio();

        if (localStorage.filePath) {
            lsfp = localStorage.filePath;
            lsfp = "";
            fs.exists(lsfp, function (exists) {
                if (exists) {
                    newFile(lsfp, function () {
                        // clear localStorage to allow for new, blank documents
                        delete localStorage.filePath;
                        // show window
                        completeInit(lsfp);
                    });
                } else {
                    removeRecentFile(lsfp);
                    delete localStorage.filePath;
                    completeInit();
                }
            });
        } else {
            completeInit();
        }
    };

    global.tm = tm;
    global.TM = TM;
    global.win = win;
    global.menu = menu;
    global.tabs = tabs;
    global.Wreathe = {newFile: newFile, saveFile: saveFile,
        openFileDialog: openFileDialog};
}(this));
