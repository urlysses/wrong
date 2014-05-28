/*jslint node: true, browser: true, devel:true, white: false*/
/*global PROMPT, $, Audio, Event, requirejs*/
(function (global) {
    "use strict";

    var TM,
        Files,
        History,
        View,
        Keys,
        Control,
        Settings,
        tm,
        tabDragging,
        newFile,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        closeTab,
        closeAllTabs,
        constructDefaultPreview,
        completeInit;

    requirejs(["history", "view", "tm", "files", "keys", "control", "settings"],
        function (H, V, T, F, K, C, S) {
            History = new H();
            View = new V();
            TM = new T();
            Files = new F();
            Keys = new K();
            Control = new C();
            Settings = new S();
            tm = TM.init();
            global.tm = tm;
            global.Keys = Keys;
            global.View = View;
            global.Files = Files;
            global.TM = TM;
            global.History = History;
            global.Settings = Settings;

            newFile = function (data, callback) {
                // I attempted to put this into files.js but I'm afraid
                // I'm at a loss for how to get it work
                // (broke while clicking between tabs).
                var tabsbar = document.getElementById("wr-tabs"),
                    currentTab = document.getElementById("wr-tab-selected"),
                    newTab = document.createElement("li"),
                    newTabCloseButton = document.createElement("button"),
                    file;

                if (typeof data === "function") {
                    callback = data;
                    data = null;
                }

                newTab.id = "wr-tab-selected";
                newTab.innerHTML = "<span>Untitled</span><span></span>";
                newTab.setAttribute("draggable", "true");

                newTabCloseButton.classList.add("wr-tab-close-button");
                newTabCloseButton.textContent = "x";
                newTab.appendChild(newTabCloseButton);
                newTabCloseButton.onclick = function (e) {
                    e.stopPropagation();
                    closeTab(e.target.parentNode);
                };

                file = "untitled-" + Math.floor(Math.random() * Math.pow(10, 17));
                Files.updateTabs(file, data);
                if (currentTab) {
                    currentTab.removeAttribute("id");
                    Files.tabs[currentTab.dataset.file] = tm.clone();
                }
                tabsbar.appendChild(newTab);
                tm.upgrade(Files.tabs[file]);
                tm = Files.tabs[file];
                tm.store = tm.value;
                tm.update();
                tm.focus();
                View.setFileDirty(false);
                if (callback) {
                    callback();
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

            global.Wrong = {newFile: newFile};

            closeTab = function (closethis) {
                var currentTab = document.getElementById("wr-tab-selected"),
                    oldCurrent;

                if (currentTab) {
                    oldCurrent = currentTab;
                }

                if (closethis) {
                    currentTab = closethis;
                }

                var tabsbar = currentTab.parentElement,
                    nextTab = $(currentTab).next()[0];

                if (nextTab === undefined) {
                    nextTab = $(currentTab).prev()[0];
                }

                if (nextTab) {
                    tm.upgrade(Files.tabs[nextTab.dataset.file]);
                    tm = Files.tabs[nextTab.dataset.file];
                    tm.update();
                    tm.focus();
                    View.getFileDirty(nextTab);
                    View.toggleSuperfluous(false);
                    currentTab.removeAttribute("id");
                    if (oldCurrent) {
                        oldCurrent.removeAttribute("id");
                    }
                    tabsbar.removeChild(currentTab);
                    nextTab.id = "wr-tab-selected";
                } else {
                    closeWindow();
                }

                delete Files.tabs[currentTab.dataset.file];
                return true;
            };

            closeAllTabs = function () {
                var i,
                    allFilesClean = true,
                    tabsbar = document.getElementById("wr-tabs"),
                    tabslen = tabsbar.children.length;
<<<<<<< HEAD
                for (i = 0; i < tabslen; i++) {
                    var tab = tabsbar.children[i];
                    if (tab && tab.children[1].innerText !== "") {
                        allFilesClean = false;
=======
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
>>>>>>> e0a9140b6638167669e27e7d9bbe97f1a4ccafa4
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
                            closeWindow(tabsbar, tabslen);
                        },
                        type: "btn-red"
                    });
                    P.show();
                } else {
                    closeWindow(tabsbar, tabslen);
                }
            };

            closeWindow = function (tabsbar, tabslen) {
                // Just close every tab for this preview.
                if (tabslen === undefined) {
                    if (tabsbar === undefined) {
                        tabsbar = document.getElementById("wr-tabs");
                    }
                    tabslen = tabsbar.children.length;
                }

<<<<<<< HEAD
                if (tabslen === 1) {
                    var closethis = tabsbar.children[0];
                    constructDefaultPreview();
                    closeTab(closethis);
                } else {
                    var i;
                    for (i = 0; i < tabslen; i++) {
                        var tab = tabsbar.children[i];
                        closeTab(tab);
=======
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
>>>>>>> e0a9140b6638167669e27e7d9bbe97f1a4ccafa4
                    }
                }
            };

            minimizeWindow = function () {
                // You can do stuff here. Not useful for this preview though.
            };

            maximizeWindow = function () {
                // You can do stuff here. Not useful for this preview though.
            };

            constructDefaultPreview = function () {
                newFile("Hi");
                View.setPageTitle("Welcome.wro");
            };

            completeInit = function (path) {
                var defaultTheme, themeSelector;
                if (path === undefined) {
                    constructDefaultPreview();
                }
                View.toggleAudio();
                View.displayWordCount();
                defaultTheme = Settings.getDefaultTheme();
                themeSelector = document.getElementById("wr-theme-" + defaultTheme.name);
                if (themeSelector) {
                    themeSelector.selected = true;
                }
                tm.focus();

                // Window & Document Events.
                window.onfocus = function () {
                    document.body.id = "";
                    // tm.focus();
                    View.toggleAudio();
                    View.focusWindowButtons();
                };

                window.onblur = function () {
                    document.body.id = "blurred";
                    // tm.blur();
                    View.toggleAudio(false);
                    View.blurWindowButtons();
                };

                View.fullscreenbutton.onclick = function () {
                    View.toggleFullscreen();
                };
                function fullscreenchange() {
                    if (View.isFullscreen()) {
                        View.toggleTitlebar();
                        View.toggleAudio();
                        View.fullscreenbutton.parentNode.style.visibility = "visible";
                        View.fullscreenbutton.parentNode.style.paddingRight = "8px";
                    } else {
                        View.toggleAudio();
                        View.toggleTitlebar();
                        View.toggleSuperfluous(false, true);
                        View.fullscreenbutton.parentNode.style.paddingRight = "0px";
                    }
                }
                View.tmWebEditor.addEventListener("fullscreenchange", fullscreenchange, false);
                View.tmWebEditor.addEventListener("msfullscreenchange", fullscreenchange, false);
                View.tmWebEditor.addEventListener("mozfullscreenchange", fullscreenchange, false);
                View.tmWebEditor.addEventListener("webkitfullscreenchange", fullscreenchange, false);

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
                    minimizeWindow();
                };
                document.getElementById("wr-maximize-button").onclick = function () {
                    maximizeWindow();
                };

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
            };

            window.onmouseover = function () {
                View.displayWordCount();
                View.toggleSuperfluous(false);
            };
            Keys.bindEditorShortcuts(document, Files);

            // FOR DOC LOAD
            var audiosrc;

            Settings.loadDefaultTheme(Settings);
            Settings.fetchParcelStyle(Settings);


            if (Settings.parcel.audio) {
                audiosrc = Settings.parcel.audio;
            } else {
                audiosrc = "Audio/0.ogg";
            }

            View.audio.src = audiosrc;
            View.toggleAudio();

            completeInit();
        });
}(this));
