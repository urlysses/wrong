/*jslint node: true, browser: true, devel:true, white: false*/
/*global $, Event, Audio, Element, define*/
define(["control"], function (Control) {
    Control = new Control();
    function View() {
        this.$counter = $("#counter");
        this.fileDirty = false;
        this.audio = document.getElementById("wr-audio");
        this.titlebar = document.getElementById("titlebar");
        this.windowbuttons = document.getElementById("wr-window-buttons");
        this.fullscreenbutton = document.getElementById("wr-fullscreen-button");
        this.addtabsbutton = document.getElementById("wr-add-tab-button");
        this.tmWebEditor = document.getElementById("tmWebEditor");
    }

    View.prototype.toggleFullscreen = function () {
        if (window.win) {
            window.win.toggleFullscreen();
        } else {
            if (this.tmWebEditor) {
                if (document.webkitIsFullscreen === false) {
                    this.tmWebEditor.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                } else {
                    document.webkitExitFullscreen();
                }
            }
        }
    };

    View.prototype.isFullscreen = function () {
        var fullscreen;
        if (window.win) {
            fullscreen = window.win.isFullscreen;
        } else {
            fullscreen = document.webkitIsFullscreen;
        }
    };

    View.prototype.makeUTF8 = function (data) {
        // Sanitizes the txt contents.
        return JSON.parse(new Buffer(JSON.stringify(data)).toString("utf8"));
    };

    View.prototype.toggleTitlebar = function () {
        if (this.titlebar.classList.contains("wr-titlebar-fullscreen") === false) {
            this.titlebar.classList.add("wr-titlebar-fullscreen");
            window.tm.doc.parentNode.classList.add("wr-tm-fullscreen");
            if (this.titlebar.classList.contains("wr-runtime-fullscreen-css") === false) {
                this.titlebar.classList.add("wr-runtime-fullscreen-css");
                window.Settings.compileRuntimeCss();
            }
            if (Control.controlOpened) {
                Control.updateFullscreenStyle(true);
            }
        } else {
            window.tm.doc.parentNode.classList.remove("wr-tm-fullscreen");
            this.titlebar.classList.remove("wr-titlebar-fullscreen");
            if (Control.controlOpened) {
                Control.updateFullscreenStyle(false);
            }
        }
    };

    View.prototype.updateCloseDirt = function (isDirty) {
        var closer = document.getElementById("wr-close-button");
        if (isDirty) {
            closer.classList.add("wr-window-dirty");
        } else {
            closer.classList.remove("wr-window-dirty");
        }
    };

    View.prototype.updateTitleDirt = function (isDirty) {
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

    View.prototype.updateCounterDirt = function (isDirty) {
        var dirt;
        if (isDirty) {
            dirt = "[+]";
        } else {
            dirt = "";
        }

        document.getElementById("wr-dirt").innerText = dirt;
    };

    View.prototype.setPageTitle = function (path) {
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



    View.prototype.setFileDirty = function (isDirty) {
        var fd = false;
        if (isDirty === true) {
            var tm = window.tm;
            // file edited
            if ((!tm.hasSaved && tm.history.canUndo(tm) === true)
                    || (tm.hasSaved && tm.checkpoint !== tm.value)) {
                fd = true;
            }
        }

        this.fileDirty = fd;
        window.fileDirty = this.fileDirty;
        this.updateCloseDirt(this.fileDirty);
        this.updateTitleDirt(this.fileDirty);
        this.updateCounterDirt(this.fileDirty);
    };

    View.prototype.getFileDirty = function (tab) {
        var dirty = false,
            di = tab.children[1];

        // if the tab's second span contains anything (e.g., "- Edited")
        // then the tab is dirty.
        if (di.innerText.length > 0) {
            dirty = true;
        }

        this.setFileDirty(dirty);
    };

    View.prototype.focusWindowButtons = function () {
        var i;
        for (i = 0; i < this.windowbuttons.children.length; i++) {
            this.windowbuttons.children[i].classList.remove("wr-window-blurred");
        }
        this.fullscreenbutton.classList.remove("wr-window-blurred");
    };

    View.prototype.blurWindowButtons = function () {
        var i;
        for (i = 0; i < this.windowbuttons.children.length; i++) {
            this.windowbuttons.children[i].classList.add("wr-window-blurred");
        }
        this.fullscreenbutton.classList.add("wr-window-blurred");
    };


    View.prototype.displayWordCount = function () {
        var wordCount = window.tm.getWordCount(),
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

    View.prototype.toggleSuperfluous = function (hide, override) {
        // "override" is for special case when app leaves fullscreen and needs
        // to unhide all superfluous.
        var duration, $titlebar = $("#titlebar");
        duration = 100;
        if (this.isFullscreen() || override === true) {
            if (hide) {
                window.tm.doc.classList.add("hideScroll");
                this.$counter.fadeOut(duration);
                $titlebar.fadeOut(duration);
            } else {
                window.tm.doc.classList.remove("hideScroll");
                if (this.isFullscreen()) {
                    this.$counter.fadeIn(duration);
                    $titlebar.fadeIn(duration);
                }

                if (override) {
                    this.$counter.fadeOut(duration);
                    $titlebar.fadeIn(0);
                }
            }
        }
    };

    View.prototype.goToNextTab = function (Files) {
        if (Object.keys(Files.tabs).length > 1) {
            var tabsbar = document.getElementById("wr-tabs"),
                currentTab = document.getElementById("wr-tab-selected"),
                e = new Event("click"),
                nextTab = $(currentTab).next()[0];

            if (nextTab === undefined) {
                // Current tab is last child. Loop back to start.
                nextTab = tabsbar.children[0];
            }

            this.toggleSuperfluous(false);
            nextTab.dispatchEvent(e);
        }
    };

    View.prototype.goToPrevTab = function (Files) {
        if (Object.keys(Files.tabs).length > 1) {
            var tabsbar = document.getElementById("wr-tabs"),
                currentTab = document.getElementById("wr-tab-selected"),
                e = new Event("click"),
                prevTab = $(currentTab).prev()[0];

            if (prevTab === undefined) {
                // Current tab is first child. Loop back to end.
                prevTab = tabsbar.children[tabsbar.children.length - 1];
            }

            this.toggleSuperfluous(false);
            prevTab.dispatchEvent(e);
        }
    };


    View.prototype.playClicks = function () {
        var parcel = window.Settings.parcel,
            sounds = window.Settings.sounds;
        if (parcel.playclicks !== false) {
            if (this.isFullscreen()) {
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

    View.prototype.toggleAudio = function (playAudio) {
        var parcel = window.Settings.parcel;
        if (playAudio === undefined) {
            if (parcel.playaudio !== false) {
                if (this.isFullscreen() === true) {
                    if (this.audio.paused === true) {
                        this.audio.play();
                    } else {
                        this.audio.pause();
                    }
                } else {
                    this.audio.pause();
                }
            }
        } else {
            if (playAudio === true) {
                if (this.audio.paused === true) {
                    this.audio.play();
                }
            } else {
                if (this.audio.paused !== true) {
                    this.audio.pause();
                }
            }
        }
    };

    return View;
});
