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
        closeTab,
        closeAllTabs,
        constructDefaultPreview,
        completeInit;

    global.Wrong = {};
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

            global.Wrong.newFile = newFile;

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

            constructDefaultPreview = function () {
                var homeText = "Hi, this is Wrong. You write in it.\n\nWrong is an app for Mac, but you can try it online too. Here: this one's yours, give it a whirl.\n\nYou can start by clicking the green fullscreen button on the top left. Headphones are recommended but not required. Take your time.\n\nWow, well listen to that. We've got a fire going in the background and there are some nice sounds that echo your keystrokes as you type too. (You can exit fullscreen mode at any time by typing the `Esc` key or by clicking the green fullscreen button at the top left again.)\n\nTo bring up the settings customizer, you can type `⌘-,` (Cmd+Comma). If you're not using a Mac or if `⌘-,` isn't working for you, [hold Alt and click here to open Wrong's preferences](javascript:Wrong.Settings.openSettings(\\)). /*That's how you make links, by the way, [text](http://url). Oh, and this is a comment!*/\n\nNow that you're in the customizer, you can change almost anything about Wrong. There are even different sound options too. Have a look and see if you can select another theme or customize this one to make it your own.\n\nGood? Good.\n\n";
                homeText += "So what's the point of Wrong? Well, it's a distraction-free writing environment. When you write, you create a mental map of your text, its characters, its plot, &c.. There's no real point in trying to recreate a complex, virtual or physical representation of this mental map while you're writing: that's distracting and distractions are the spilling of metaphysical coffee on such mental maps.\n\nAfter being distracted, you'll have to sit and recreate your mental map or wait for the metaphysical coffee to dry before you can start writing again, regardless of whether or not you spent time making that virtual/physical representation. You could call this refractory period getting in the mood, getting into the zone, acquiring flow, channelling inspiration. Whatever you call it, Wrong helps you reduce the time it takes to get you there.\n\nWrong does away with distractions by making everything about you and your text. You don't need to worry about styles and formatting in Wrong. Just write.\n\n";
                homeText += "So yes, this is only plain text. You can open a .wro (or .wrong) file in any text editor and it'll look exactly like this, except without computed styles (the bold, the italics, &c.). Wrong highlights the important details as you specify them with [Markdown](http://en.wikipedia.org/wiki/Markdown). Essentially, you surround the significant parts of your text with special characters and Wrong will take care of making them look nice while you type.\n\nThe styling syntax is *loosely* based on Markdown, with the addition of support for inline comments like this one: [(you'll have the option to export your text without the comments in the future)]. If you want to use a special character without affecting your text's style, just escape the character by using a backslash (e.g., *italic* \\*not italic\\*. You can even escape the backslash: *italics!\\\\*).\n\n/*Wrong's not really a Markdown editor, by the way. It's just a text editor that supports *some* Markdown syntax. The important thing is that you use Wrong for writing, and to heck with formatting for the most part. You can use Word, LibreOffice, or a dedicated Markdown editor for formatting once your masterpiece is complete.*/\n\n";
                homeText += "Similarly, you communicate with Wrong through text by sending messages to Control. You can get to Control by typing `⌘-/` (Cmd-Slash)/*[Alt-Click here to open Control](javascript:Wrong.Control.show(Wrong.Keys, Wrong.Files, Wrong.View, tm\\))*/. Control's a little naive at the moment, but he's very sweet at heart. Right now, he can find things in your text and even replace them with whatever you want.\n\nControl can help with all kinds of tasks. Let's say I want to find the man who killed my father. I just have to open up Control (`⌘-/`) and type `find Count Rugen` (pressing `⌘-F` will open Control and type \"find \" automatically). I can then cycle through the results by hitting Enter to go forwards and Shift-Enter to go backwards. If I want to obliterate Count Rugen from this document, I open up Control, type `replaceAll ` (or `replace ` and check the \"all\" button) and Control will give me two new text boxes. The first box will read `Count Rugen` and I'll leave the second one blank so Control knows that I mean to replace all matches with nothing, which is what he is.\n\nSo that's Wrong in a nutshell. It's great. Have fun with it.\n\nBye!\n\n------------\nTestimonials\n*\"If I try your app will you finally let me take this empty chair over to my table?\"*\n\t__ – A good friend of mine __\n\n*\"What the heck is this?\"*\n\t__ – Grandpa __\n\n*\"We regret to inform you that your app has not been added to the App Store for the following reasons:\"*\n\t__ – Large computer software and hardware company! Wow! __\n\n";
                newFile(homeText);
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
