/*jslint node: true, browser: true, devel:true, white: false*/
/*global PROMPT, $, Audio, Event, tinycolor, requirejs*/
(function (global) {
    "use strict";

    var gui = require("nw.gui"),
        fs = require("fs"),
        win = gui.Window.get(),
        menu = new gui.Menu(),
        clip = gui.Clipboard.get(),
        audio = document.getElementById("wr-audio"),
        sounds,
        theme,
        parcel,
        updateParcel,
        clearParcel,
        clearThemeInParcel,
        TM,
        History,
        View,
        Keys,
        Control,
        Settings,
        tm,
        initTM,
        tabs,
        tabDragging,
        updateTabs,
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
        focusWindowButtons,
        blurWindowButtons,
        closeWindow,
        closeTab,
        closeAllTabs,
        saveAndClose,
        compileRuntimeCss,
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
        buildAppMenu,
        completeInit,
        promptForUpdate,
        programCheckForUpdates,
        setPageTitle,
        updateCloseDirt,
        updateTitleDirt,
        fetchParcelStyle,
        settingsHaveOpened,
        displayWordCount,
        getWordCount,
        loadDefaultTheme,
        unloadDefaultTheme,
        loadTheme,
        setDefaultTheme,
        getDefaultTheme,
        submenuLoadTheme,
        updateCounterDirt,
        bindEditorShortcuts,
        $counter,
        playClicks;

    win.showDevTools();

    global.filePath = filePath;

    settingsHaveOpened = false;

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
    sounds.clicks = [{name: "revolver", len: 8, format: "wav"},
        {name: "typewriter", len: 8, format: "wav"}];

    // User settings are stored in localStorage under "parcel"
    if (localStorage.parcel) {
        parcel = JSON.parse(localStorage.parcel);
    } else {
        parcel = {};
    }

    tabs = {};

    updateParcel = function (name, value) {
        global.parcel[name] = value;
        parcel[name] = value;
        localStorage.parcel = JSON.stringify(parcel);
    };

    clearParcel = function () {
        global.parcel = {};
        parcel = {};
        delete localStorage.parcel;
    };

    clearThemeInParcel = function () {
        Object.keys(parcel).forEach(function (key, index) {
            // Keys with "," are theme keys.
            if (key.indexOf(",") !== -1) {
                delete parcel[key];
                delete localStorage.parcel[key];
            }
        });
    };

    // @custom is for user uploads in later versions. Will be
    // stored in gui.App.dataPath.
    // (/Users/[name]/Library/Application Support/Wrong/[etc.])
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
        var themePath;
        if (custom) {
            themePath = gui.App.dataPath + "/Themes/" + themeName + "/" + themeName + ".css";
        } else {
            themePath = "Themes/" + themeName + "/" + themeName + ".css";
        }
        document.getElementById("wr-link-extra-theme").href = themePath;
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
            // there's a defaultTheme. remove it.
            document.getElementById("wr-link-extra-theme").href = "";
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

    fetchParcelStyle = function () {
        var bodStlye = "#TM {", tmStyle = ".tm-w-default {", miscStyle = "",
            parcelStyle = "@media (min-width: 800px) {",
            parcelContainer = document.getElementById("wr-parcel-style");
        Object.keys(parcel).forEach(function (key, index) {
            var selector = key.split(",")[0],
                name = key.split(",")[1],
                value = parcel[key];
            if (selector && name && value) {
                if (selector === "#TM") {
                    if (name.indexOf("background") === -1) {
                        tmStyle += name + ": " + value + ";";
                    } else {
                        bodStlye += name + ": " + value + ";";
                    }
                } else {
                    miscStyle += selector + " {" + name + ": " + value + ";" + "}";
                }
            }
        });
        bodStlye += "}";
        tmStyle += "}";
        parcelStyle += bodStlye + tmStyle + miscStyle;
        parcelStyle += "}";
        parcelContainer.appendChild(document.createTextNode(parcelStyle));
    };

    compileRuntimeCss = function (color, rgb, yiq) {
        var minorColor, mainColor, halfColor, r, g, b,
            sName = "#titlebar.wr-titlebar-fullscreen.wr-runtime-fullscreen-css",
            controlName = "body.wr-tm-control-fullscreen",
            styl = document.getElementById("wr-runtime-style"),
            endstyle = "";

        if (color === undefined && rgb === undefined && yiq === undefined) {
            mainColor = window.getComputedStyle(tm.doc).color;
            var col;
            if (mainColor.indexOf("rgb") === 0) {
                col = mainColor.match(/\d+/g);
                r = col[0];
                g = col[1];
                b = col[2];
            } else if (mainColor.indexOf("#") === 0 && mainColor.length > 4) {
                col = mainColor.substring(1);
                r = parseInt(col.substr(0, 2), 16);
                g = parseInt(col.substr(2, 2), 16);
                b = parseInt(col.substr(4, 2), 16);
            }

            if (r && g && b) {
                yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            } else {
                // Using some other color format. Welp, too bad I guess.
                yiq = 128;
            }
        } else {
            mainColor = color;
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        }

        if (yiq >= 128) {
            // main is light. use dark for text.
            minorColor = "rgba(0, 0, 0, 0.9)";
        } else {
            // main is dark. use light for text.
            minorColor = "rgba(255, 255, 255, 0.9)";
        }
        halfColor = "rgba(" + r + ", " + g + ", " + b + ", 0.2)";

        // for tabs bar
        endstyle += sName + " {";
        endstyle += "color: " + minorColor + ";";
        endstyle += "border-color: " + mainColor + ";";
        endstyle += "}";
        endstyle += sName + " #wr-tabs {";
        endstyle += "border-color: " + mainColor + ";";
        endstyle += "}";
        endstyle += sName + " #wr-tabs li {";
        endstyle += "background-color: transparent;";
        endstyle += "color: inherit;";
        endstyle += "border-right-color: inherit;";
        endstyle += "}";
        endstyle += sName + " #wr-tabs li:active {";
        endstyle += "background-color: " + halfColor + ";";
        endstyle += "}";
        endstyle += sName + " li#wr-tab-selected, " + sName + " li#wr-tab-selected:active {";
        endstyle += "background-color: " + mainColor + ";";
        endstyle += "color: " + minorColor + ";";
        endstyle += "}";
        endstyle += sName + " #wr-add-tab-button {";
        endstyle += "background-color: " + mainColor + ";";
        endstyle += "color: inherit;";
        endstyle += "border-color: " + mainColor + ";";
        endstyle += "}";
        // for Control
        endstyle += ".wr-tm-fullscreen #tm-wr-control {";
        endstyle += "background-color: " + halfColor + ";";
        endstyle += "}";
        endstyle += controlName + " #tm-control {";
        endstyle += "color: " + minorColor + ";";
        endstyle += "background-color: " + mainColor + ";";
        endstyle += "}";
        endstyle += controlName + " #tm-control-close-button {";
        endstyle += "color: " + mainColor + ";";
        endstyle += "}";
        endstyle += controlName + " #tm-control-close-button:active {";
        endstyle += "color: " + minorColor + ";";
        endstyle += "}";
        while (styl.firstChild) {
            styl.removeChild(styl.firstChild);
        }
        styl.appendChild(document.createTextNode(endstyle));
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
        tabs[file] = TM.init();
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

            var home = process.env.HOME;
            if (home) {
                saveButton.setAttribute("nwworkingdir", home + "/Desktop");
            }

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

            saveButton.click();
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
            newTab = document.createElement("li"),
            newTabCloseButton = document.createElement("button");

        newTab.id = "wr-tab-selected";
        newTab.innerHTML = "<span>Untitled</span><span></span>";
        newTab.setAttribute("draggable", "true");

        newTabCloseButton.classList.add("wr-tab-close-button");
        newTabCloseButton.innerText = "x";
        newTab.appendChild(newTabCloseButton);
        newTabCloseButton.onclick = function () {
            // The tab closes automatically since click falls within
            // click listener initiated below.
            win.close();
        };

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


        View.toggleSuperfluous(false);
        newTab.style.flexShrink = "1";
        newTab.dataset.file = file;
        // Tab clicking.
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
        // Tab dragging.
        newTab.addEventListener("dragstart", function (e) {
            tabDragging = this;
            this.classList.add("is-being-dragged");
        }, false);
        newTab.addEventListener("dragover", function (e) {
            e.preventDefault();
            this.classList.add("is-being-dragged-over");
            return false;
        }, false);
        newTab.addEventListener("dragenter", function () {
            this.classList.add("is-being-dragged-over");
        }, false);
        newTab.addEventListener("dragleave", function () {
            this.classList.remove("is-being-dragged-over");
        }, false);
        newTab.addEventListener("drop", function (e) {
            e.stopPropagation();
            if (tabDragging !== this) {
                var targetPos = $(this).index(),
                    originPos = $(tabDragging).index(),
                    tabsBar = this.parentNode;
                // Insert the tab before the target.
                tabsBar.insertBefore(tabDragging, this);
                // Move the target to either before or after
                // the tab depending on points of origin.
                if (originPos > targetPos) {
                    tabsBar.insertBefore(this, tabDragging.nextSibling);
                } else {
                    tabsBar.insertBefore(this, tabDragging);
                }
                // Select the tab being dragged.
                tabDragging.dispatchEvent(new Event("click"));
                this.classList.remove("is-being-dragged-over");
            }
            return false;
        }, false);
        newTab.addEventListener("dragend", function () {
            this.classList.remove("is-being-dragged");
            this.classList.remove("is-being-dragged-over");
        }, false);
    };

    openFileDialog = function () {
        var openButton = document.getElementById("open");
        openButton.click();
        openButton.onchange = function () {
            if (openButton.value !== "") {
                newFile(openButton.value);
            }
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
            View.toggleSuperfluous(false);
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

    buildAppMenu = function () {
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
            label: "Undo",
            click: function () {
                global.tm.history.undo(global.tm);
                if ((!global.tm.hasSaved && !global.tm.history.canUndo(global.tm))
                        || (global.tm.hasSaved
                            && global.tm.checkpoint === global.tm.value)) {
                    View.setFileDirty(false);
                } else {
                    View.setFileDirty(true);
                }
            }
        }));
        editmenu.append(new gui.MenuItem({
            label: "Redo",
            click: function () {
                global.tm.history.redo(global.tm);
                if (global.tm.hasSaved
                        && global.tm.checkpoint === global.tm.value) {
                    View.setFileDirty(false);
                } else {
                    View.setFileDirty(true);
                }
            }
        }));
        editmenu.append(new gui.MenuItem({
            type: "separator"
        }));
        editmenu.append(new gui.MenuItem({
            label: "Cut",
            click: function () {
                var T = global.tm;
                var selection = T.value.substring(T.selectionStart, T.selectionEnd);
                clip.set(selection);
                // replace selection with ""
                T.insertText("");
            }
        }));
        editmenu.append(new gui.MenuItem({
            label: "Copy",
            click: function () {
                var T = global.tm;
                clip.set(T.value.substring(T.selectionStart, T.selectionEnd));
            }
        }));
        editmenu.append(new gui.MenuItem({
            label: "Paste",
            click: function () {
                var T = global.tm;
                var e = new Event("paste");
                T.doc.dispatchEvent(e);
            }
        }));
        editmenu.append(new gui.MenuItem({
            label: "Delete",
            click: function () {
                global.tm.insertText("");
            }
        }));
        editmenu.append(new gui.MenuItem({
            type: "separator"
        }));
        editmenu.append(new gui.MenuItem({
            label: "Select All",
            click: function () {
                global.tm.select();
            }
        }));

        // (Menus) Find >
        findmenu = new gui.Menu();
        findmenu.append(new gui.MenuItem({
            label: "Find  (\u2318F)",
            click: function () {
                Control.find(tm);
            }
        }));

        findmenu.append(new gui.MenuItem({
            label: "Find Next  (\u2318G)",
            click: function () {
                Control.findNext(tm);
            }
        }));

        findmenu.append(new gui.MenuItem({
            label: "Find Previous  (\u21E7\u2318G)",
            click: function () {
                Control.findPrev(tm);
            }
        }));

        findmenu.append(new gui.MenuItem({
            label: "Find & Replace  (\u2325\u2318F)",
            click: function () {
                Control.replace(tm);
            }
        }));

        findmenu.append(new gui.MenuItem({
            label: "Replace All  (\u21E7\u2325\u2318F)",
            click: function () {
                Control.replaceAll(tm);
            }
        }));

        // (Menus) View >
        viewmenu = new gui.Menu();

        viewmenu.append(new gui.MenuItem({
            label: "Toggle Full Screen  (\u2318\u21A9 or \u21E7\u2318F)",
            click: function () {
                View.toggleFullscreen();
            }
        }));

        viewmenu.append(new gui.MenuItem({
            type: "separator"
        }));

        thememenu = new gui.Menu();

        theme.presets.forEach(function (skin, index) {
            var defaultTheme = Settings.getDefaultTheme(),
                iteminfo;
            iteminfo = {
                label: skin.name,
                type: "checkbox",
                click: function () {
                    Settings.submenuLoadTheme(Settings, skin.name, skin.custom);
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
                        defaultTheme = Settings.getDefaultTheme();
                        iteminfo = {
                            label: fileName,
                            type: "checkbox",
                            click: function () {
                                Settings.submenuLoadTheme(Settings, fileName, true);
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
                Settings.openSettings();
            }
        }));

        viewmenu.append(new gui.MenuItem({
            type: "separator"
        }));

        viewmenu.append(new gui.MenuItem({
            label: "Go to Next Tab (\u2325\u2318\u2192)",
            click: function () {
                View.goToNextTab();
            }
        }));

        viewmenu.append(new gui.MenuItem({
            label: "Go to Previous Tab (\u2325\u2318\u2190)",
            click: function () {
                View.goToNextTab();
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
        /* END MENUS */
    };

    completeInit = function (path) {
        var defaultTheme, themeSelector;
        if (path === undefined) {
            newFile();
        }
        win.show();
        View.toggleAudio();
        View.setPageTitle(path);
        View.displayWordCount();
        defaultTheme = Settings.getDefaultTheme();
        themeSelector = document.getElementById("wr-theme-" + defaultTheme.name);
        if (themeSelector) {
            themeSelector.selected = true;
        }

        buildAppMenu();

        // Window & Document Events.
        win.on("enter-fullscreen", function () {
            window.setTimeout(View.toggleTitlebar, 1000);
            View.toggleAudio();
        });

        win.on("leave-fullscreen", function () {
            View.toggleAudio();
            View.toggleTitlebar();
            View.toggleSuperfluous(false, true);
        });

        win.on("focus", function () {
            document.body.id = "";
            // tm.focus();
            View.toggleAudio();
            View.focusWindowButtons();
        });

        win.on("blur", function () {
            document.body.id = "blurred";
            // tm.blur();
            View.toggleAudio(false);
            View.blurWindowButtons();
        });

        View.fullscreenbutton.onclick = function () {
            View.toggleFullscreen();
        };

        View.windowbuttons.addEventListener("mouseover", function () {
            var i, windowbuttons = View.windowbuttons;
            for (i = 0; i < windowbuttons.children.length; i++) {
                windowbuttons.children[i].classList.add("wr-window-button-hover");
            }
        });
        View.windowbuttons.addEventListener("mouseout", function () {
            var i, windowbuttons = View.windowbuttons;
            for (i = 0; i < windowbuttons.children.length; i++) {
                windowbuttons.children[i].classList.remove("wr-window-button-hover");
            }
        });
        View.addtabsbutton.onclick = function () {
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
    };

    promptForUpdate = function () {
        var P = new PROMPT.init("Updates Available",
                "There's a new version of Wrong available for download.");
        P.addBtn({
            text: "Update",
            onclick: function () {
                // TODO: go to download page
                // or just let the app download on its own?
                // Also, clear hasIgnoredUpdate ?
                delete localStorage.hasIgnoredUpdate;
                gui.Shell.openExternal("http://handstrings.github.io/wrong");
            },
            type: "btn-blue",
            focus: true
        }).addBtn({
            text: "Later",
            onclick: function () {
                tm.focus();
                return false;
            },
        });
        P.show();
    };

    programCheckForUpdates = function () {
        // Store date of last check. Don't check if last check was within 24 hours.
        var timeNow = new Date().getTime(),
            ADAY = 24 * 60 * 60 * 1000,
            currentVersion = gui.App.manifest.version;
        if ((!localStorage.lastUpdateCheck
                || parseInt(localStorage.lastUpdateCheck, 10) + ADAY < timeNow)
                && !localStorage.hasIgnoredUpdate) {
            var json = $.ajax({
                dataType: "json",
                url: "https://api.github.com/repos/handstrings/wrong/releases",
                success: function (data) {
                    if (data[0] && data[0].tag_name) {
                        // Remove starting "v" from tag_name to get version number.
                        var latestVersion = data[0].tag_name.substring(1);
                        if (latestVersion > currentVersion) {
                            promptForUpdate();
                        }
                    }
                    localStorage.lastUpdateCheck = timeNow;
                    localStorage.hasIgnoredUpdate = true;
                }
            });
        } else if (localStorage.hasIgnoredUpdate) {
            // User ignored the update prompt sometime earlier. Prompt again.
            promptForUpdate();
        }
    };

    global.tm = tm;
    global.TM = TM;
    global.win = win;
    global.menu = menu;
    global.tabs = tabs;
    global.clip = clip;
    global.gui = gui;
    global.editmenu = editmenu;
    global.fileDirty = fileDirty;
    global.sounds = sounds;
    global.parcel = parcel;
    global.Wrong = {newFile: newFile, saveFile: saveFile,
        openFileDialog: openFileDialog};
    // Restore some data on startup.
    global.onload = function () {
        requirejs(["history", "view", "tm", "keys", "control", "settings"],
            function (H, V, T, K, C, S) {
                History = new H();
                View = new V();
                TM = new T();
                Keys = new K();
                Control = new C();
                Settings = new S();
                tm = TM.init();
                global.tm = tm;
                global.Keys = Keys;
                global.Settings = Settings;

                // FOR SUPERFLUOUS
                // might as well use jQuery for fading here since we've already imported 
                // it for the color picker
                $counter = $("#counter");

                window.onmouseover = function () {
                    View.displayWordCount();
                    View.toggleSuperfluous(false);
                };
                Keys.bindEditorShortcuts(document);

                // FOR DOC LOAD
                var argv = gui.App.argv,
                    lsfp,
                    audiosrc;

                loadDefaultTheme();
                fetchParcelStyle();

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
                    audiosrc = "Audio/0.ogg";
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

                programCheckForUpdates();
            });
    };
}(this));
