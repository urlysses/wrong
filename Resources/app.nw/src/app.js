/*jslint node: true, browser: true, devel:true, white: false*/
/*global PROMPT, $, Audio, Event, tinycolor, requirejs*/
(function (global) {
    "use strict";

    var gui = require("nw.gui"),
        fs = require("fs"),
        win = gui.Window.get(),
        menu = new gui.Menu(),
        clip = gui.Clipboard.get(),
        TM,
        Files,
        History,
        View,
        Keys,
        Control,
        Settings,
        Markdown,
        tm,
        tabDragging,
        saveFile,
        filePath,
        newFile,
        openFileDialog,
        readFile,
        closeWindow,
        closeTab,
        closeAllTabs,
        saveAndClose,
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
        programCheckForUpdates;

    global.filePath = filePath;

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

    global.Wrong = {};
    global.Wrong.win = win;
    global.Wrong.menu = menu;
    global.Wrong.clip = clip;
    global.Wrong.gui = gui;
    requirejs(["history", "view", "tm", "files", "keys", "control", "settings", "markdown"],
        function (H, V, T, F, K, C, S, M) {
            History = new H();
            View = new V();
            TM = new T();
            Files = new F();
            Keys = new K();
            Control = new C();
            Settings = new S();
            Markdown = new M();
            tm = TM.init();
            global.tm = tm;
            global.Wrong.Keys = Keys;
            global.Wrong.View = View;
            global.Wrong.Files = Files;
            global.Wrong.TM = TM;
            global.Wrong.History = History;
            global.Wrong.Settings = Settings;
            global.Wrong.Control = Control;

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
                    var data = View.makeUTF8(tm.value);
                    fs.writeFile(path, data, function (err) {
                        if (err) {
                            var P = new PROMPT.init("Error", "Couldn't save file: " + err);
                            P.addBtn({
                                text: "Ok",
                                onclick: function () {
                                    tm.focus();
                                    return false;
                                },
                                type: "btn-blue"
                            });
                            P.show();

                            return false;
                        }

                        View.setFileDirty(false);
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
                                View.setPageTitle(global.filePath);
                                callback();
                            });
                        } else {
                            saveFile(global.filePath);
                            View.setPageTitle(global.filePath);
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
                // I attempted to put this into files.js but I'm afraid
                // I'm at a loss for how to get it work
                // (broke while clicking between tabs).
                var tabsbar = document.getElementById("wr-tabs"),
                    currentTab = document.getElementById("wr-tab-selected"),
                    newTab = document.createElement("li"),
                    newTabCloseButton = document.createElement("button"),
                    fileSuccess = true;

                newTab.id = "wr-tab-selected";
                newTab.innerHTML = "<span>Untitled</span><span></span>";
                newTab.setAttribute("draggable", "true");

                newTabCloseButton.classList.add("wr-tab-close-button");
                newTabCloseButton.textContent = "x";
                newTab.appendChild(newTabCloseButton);
                newTabCloseButton.onclick = function () {
                    // The tab closes automatically since click falls within
                    // click listener initiated below.
                    win.close();
                };

                if (file) {
                    // The gates of callback hell.
                    // All hope abandon ye who enter here.
                    Files.exists(file, function (exists, element, err) {
                        if (err) {
                            return false;
                        }

                        if (exists === true) {
                            var el = tabsbar.querySelector("[data-file='" + file + "']");
                            el.dispatchEvent(new Event("click"));
                            fileSuccess = false;
                        } else {
                            fs.readFile(file, function (err, data) {
                                if (err) {
                                    var errmsg = "";
                                    if (err.code === "ENOENT") {
                                        errmsg = "The file \"" + file + "\" doesn't exist.\n\nDid you rename it or move it somewhere else?";
                                    } else {
                                        errmsg = "Couldn't open file:\n\n" + err + ".";
                                    }
                                    var P = new PROMPT.init("Error", errmsg);
                                    P.addBtn({
                                        text: "Ok",
                                        onclick: function () {
                                            tm.focus();
                                            return false;
                                        },
                                        type: "btn-blue"
                                    });
                                    P.show();

                                    removeRecentFile(file);
                                    return false;
                                }

                                if (global.tm.value.length > 0
                                        || currentTab.dataset.file.indexOf("untitled-") !== 0) {
                                    // Current tab is either being used or already a saved file
                                    currentTab.removeAttribute("id");
                                    tabsbar.appendChild(newTab);
                                    Files.tabs[currentTab.dataset.file] = tm.clone();
                                } else {
                                    // Current tab untitled and unused.
                                    // Open file within this tab.
                                    delete Files.tabs[currentTab.dataset.file];
                                    currentTab.dataset.file = file;
                                }

                                readFile(file, data, callback);
                            });
                        }
                    });
                } else {
                    file = "untitled-" + Math.floor(Math.random() * Math.pow(10, 17));
                    Files.updateTabs(file);
                    if (currentTab) {
                        currentTab.removeAttribute("id");
                        Files.tabs[currentTab.dataset.file] = tm.clone();
                    }
                    tabsbar.appendChild(newTab);
                    tm.upgrade(Files.tabs[file]);
                    tm = Files.tabs[file];
                    tm.update();
                    tm.focus();
                    View.setFileDirty(false);
                    if (callback) {
                        callback();
                    }
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
                        Files.tabs[currentTab.dataset.file] = tm.clone();
                        this.id = "wr-tab-selected";
                        global.filePath = file;
                        tm.upgrade(Files.tabs[file]);
                        tm = Files.tabs[file];
                        tm.update();
                        tm.focus();
                        View.getFileDirty(this);
                    }
                };
                // Tab dragging.
                var dragTimer;
                newTab.addEventListener("dragstart", function (e) {
                    tabDragging = this;
                    this.classList.add("is-being-dragged");
                }, false);
                newTab.addEventListener("dragover", function (e) {
                    e.preventDefault();
                    this.classList.add("is-being-dragged-over");
                    return false;
                }, false);
                newTab.addEventListener("dragenter", function (e) {
                    this.classList.add("is-being-dragged-over");
                    var data = e.dataTransfer.getData("text");
                    var btn = this;
                    if (data.length > 0) {
                        // User is attempting to drag text between
                        // tabs. Select the tab.
                        dragTimer = window.setTimeout(function () {
                            btn.dispatchEvent(new Event("click"));
                        }, 500);
                    }
                }, false);
                newTab.addEventListener("dragleave", function () {
                    this.classList.remove("is-being-dragged-over");
                    // Cancel tab timer.
                    window.clearTimeout(dragTimer);
                }, false);
                newTab.addEventListener("drop", function (e) {
                    e.stopPropagation();
                    var data = e.dataTransfer.getData("text");
                    if (data.length === 0) {
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
                    } else {
                        this.dispatchEvent(new Event("click"));
                        this.classList.remove("is-being-dragged-over");
                        tm.insertText(data, true);
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
            global.Wrong.newFile = newFile;
            global.Wrong.saveFile = saveFile;
            global.Wrong.openFileDialog = openFileDialog;

            readFile = function (path, data, callback) {
                // set global filePath to this new path
                global.filePath = path;
                // update the recentFiles list for the "Open Recent >" submenu
                updateRecentFiles(path);
                // update document title
                View.setPageTitle(path);
                // data
                var dataUTF8 = View.makeUTF8(data.toString("utf8"));
                // tabs
                Files.updateTabs(path, dataUTF8);
                // add data to textarea
                tm.upgrade(Files.tabs[path]);
                tm = Files.tabs[path];
                tm.store = tm.value;
                tm.update();
                tm.focus();
                // clear the dirt
                View.setFileDirty(false);
                if (callback) {
                    callback();
                }
            };

            closeTab = function () {
                var currentTab = document.getElementById("wr-tab-selected"),
                    tabsbar = currentTab.parentElement,
                    nextTab = $(currentTab).next()[0];

                if (nextTab === undefined) {
                    nextTab = $(currentTab).prev()[0];
                }

                delete Files.tabs[currentTab.dataset.file];
                currentTab.removeAttribute("id");
                tabsbar.removeChild(currentTab);
                if (nextTab) {
                    nextTab.id = "wr-tab-selected";
                    global.filePath = nextTab.dataset.file;
                    tm.upgrade(Files.tabs[nextTab.dataset.file]);
                    tm = Files.tabs[nextTab.dataset.file];
                    tm.update();
                    tm.focus();
                    View.getFileDirty(nextTab);
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
                        if (tab && tab.children[1].textContent !== "") {
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
                global.Wrong.editmenu = editmenu;

                // (Menus) Find >
                findmenu = new gui.Menu();
                findmenu.append(new gui.MenuItem({
                    label: "Find  (\u2318F)",
                    click: function () {
                        Control.find(Keys, Files, View, tm);
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
                        Control.replace(Keys, Files, View, tm);
                    }
                }));

                findmenu.append(new gui.MenuItem({
                    label: "Replace All  (\u21E7\u2325\u2318F)",
                    click: function () {
                        Control.replaceAll(Keys, Files, View, tm);
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

                Settings.theme.presets.forEach(function (skin, index) {
                    var defaultTheme = Settings.getDefaultTheme(),
                        iteminfo;
                    iteminfo = {
                        label: skin.name,
                        type: "checkbox",
                        click: function () {
                            Settings.submenuLoadTheme(Settings, thememenu,
                                skin.name, skin.custom);
                        }
                    };
                    if (defaultTheme.name === skin.name) {
                        iteminfo.checked = true;
                    }
                    thememenu.append(new gui.MenuItem(iteminfo));
                });
                /*
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
                                opt.textContent = fileName;
                                opt.id = "wr-theme-" + fileName;
                                themesSelector.appendChild(opt);
                            }
                        });
                    }
                });
                */
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
                        View.goToNextTab(Files);
                    }
                }));

                viewmenu.append(new gui.MenuItem({
                    label: "Go to Previous Tab (\u2325\u2318\u2190)",
                    click: function () {
                        View.goToPrevTab(Files);
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
                buildAppMenu();
                var defaultTheme, themeSelector;
                if (path === undefined) {
                    newFile();
                }
                win.show();
                win.focus();
                View.toggleAudio();
                View.setPageTitle(path);
                View.displayWordCount();
                defaultTheme = Settings.getDefaultTheme();
                themeSelector = document.getElementById("wr-theme-" + defaultTheme.name);
                if (themeSelector) {
                    themeSelector.selected = true;
                }
                tm.focus();

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

                    if (global.Wrong.fileDirty) {
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
            };

            promptForUpdate = function () {
                var P = new PROMPT.init("Updates Available",
                        "There's a new version of Wrong available for download.");
                P.addBtn({
                    text: "Update",
                    onclick: function () {
                        delete localStorage.hasIgnoredUpdate;
                        gui.Shell.openExternal("http://handstrings.github.io/wrong#dl");
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
                                    localStorage.hasIgnoredUpdate = true;
                                }
                            }
                            localStorage.lastUpdateCheck = timeNow;
                        }
                    });
                } else if (localStorage.hasIgnoredUpdate) {
                    // User ignored the update prompt sometime earlier. Prompt again.
                    promptForUpdate();
                }
            };

            window.onmouseover = function () {
                View.displayWordCount();
                View.toggleSuperfluous(false);
            };
            Keys.bindEditorShortcuts(document, Files);

            // FOR DOC LOAD
            var argv = gui.App.argv,
                lsfp,
                audiosrc;

            Settings.loadDefaultTheme(Settings);
            Settings.fetchParcelStyle(Settings);

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

            if (Settings.parcel.audio) {
                audiosrc = Settings.parcel.audio;
            } else {
                audiosrc = "Audio/0.ogg";
            }

            View.audio.src = audiosrc;
            View.toggleAudio();

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
}(this));
