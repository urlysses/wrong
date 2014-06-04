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
        Markdown,
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

                if (tabslen === 1) {
                    var closethis = tabsbar.children[0];
                    constructDefaultPreview();
                    closeTab(closethis);
                } else {
                    var i;
                    for (i = 0; i < tabslen; i++) {
                        var tab = tabsbar.children[i];
                        closeTab(tab);
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
                window.top.addEventListener("fullscreenchange", fullscreenchange, false);
                window.top.addEventListener("msfullscreenchange", fullscreenchange, false);
                window.top.addEventListener("mozfullscreenchange", fullscreenchange, false);
                window.top.addEventListener("webkitfullscreenchange", fullscreenchange, false);

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
