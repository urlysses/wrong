/*jslint node: true, browser: true, devel:true, white: false*/
/*global CodeMirror, PROMPT, $, Audio*/
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
        cm,
        saveFile,
        filePath,
        fileDirty,
        setFileDirty,
        newFile,
        openFileDialog,
        openFile,
        toggleFullscreen,
        toggleAudio,
        closeWindow,
        saveAndClose,
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
        $scrollbar,
        $counter,
        playClicks;

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

    if (localStorage.parcel) {
        parcel = JSON.parse(localStorage.parcel);
    } else {
        parcel = {};
    }

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
            //  loadDefaultTheme();)
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

    cm = new CodeMirror(document.body, {
        autofocus: true,
        lineWrapping: true,
        pollInterval: 1,
        extraKeys: {
            // DEV STUFF
            "Cmd-Alt-J": function (instance) { win.showDevTools(); },
            // END DEV STUFF
            "Cmd-S": function (instance) { saveFile(filePath); },
            "Shift-Cmd-S": function (instance) { saveFile(); },
            "Cmd-N": function (instance) { newFile(); },
            "Shift-Cmd-F": function (instance) { toggleFullscreen(); },
            "Cmd-Enter": function (instance) { toggleFullscreen(); },
            "Esc": function (instance) {
                if (win.isFullscreen === true) {
                    toggleFullscreen();
                }
            },
            "Cmd-O": function (instance) { openFileDialog(); }
        }
    });

    cm.on("change", function () {
        setFileDirty(true);
        displayWordCount();
    });

    cm.on("cursorActivity", function () {
        displayWordCount();
    });

    cm.on("keydown", function () {
        toggleSuperfluous(true);
    });

    cm.on("keypress", function () {
        playClicks();
    });

    window.onmousemove = function () {
        toggleSuperfluous(false);
    };

    getWordCount = function () {
        var doc = cm.getValue().match(/\S+/g),
            selection = cm.getSelection().match(/\S+/g),
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
        duration = 200;
        if (win.isFullscreen || override === true) {
            scrollCss = $scrollbar.css("opacity");
            counterCss = $counter.css("display");
            if (hide) {
                if (counterCss === "block" || scrollCss === 1) {
                    $scrollbar.fadeOut(duration, function () {
                        // gotta set the scrollbar opacity to 0 since cm 
                        // automatically sets vscrollbar to block on key event,
                        // making the fadeout useless.
                        $scrollbar.css("opacity", 0);
                    });
                    $counter.fadeOut(duration);
                }
            } else {
                if (counterCss === "none" || scrollCss === 0) {
                    $scrollbar.css("display", "none");
                    $scrollbar.css("opacity", 1);
                    $scrollbar.fadeIn(duration, function () {
                        // redundant but at least it fades in nicely for the 
                        // user.
                        $scrollbar.css("opacity", 1);
                    });
                    if (win.isFullscreen) {
                        $counter.fadeIn(duration);
                    }
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
        var customizer, themes, close, save, hider, updateTheme, updateElement,
            styleDiv, bgimg, bgimgy, bgimgx, bgimgcover, bgcolor, textfont,
            textsize, textsizeunit, textweight, textstyle, textcolor,
            texthighlight, scrollcolor, scrolltrackcolor, saveTheme, allowaudio,
            allowclicks, audioselect, clickselect;

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
            var bod = "body {", cem = ".cm-s-default {", oth = "",
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
                        cm.refresh();
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
                        cm.refresh();
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
                        cm.refresh();
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
        themes.onchange = function () {
            var css = themes.value,
                link,
                custom = document.getElementById("wr-customtheme");

            link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            if (themes.selectedOptions[0].parentNode.id === "wr-themes-custom") {
                link.href = gui.App.dataPath + "/Themes/" + css + "/" + css + ".css";
            } else {
                link.href = "Themes/" + css + "/" + css + ".css";
            }
            styleDiv.innerHTML = "";
            unloadDefaultTheme();
            if (css !== "Light") {
                styleDiv.appendChild(link);
            }
        };
        bgcolor = document.getElementById("wr-bg-color");
        $("#wr-bg-color").spectrum({
            color: bgcolor.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("body", theme.body, "background-color",
                    color.toPercentageRgbString());
                updateTheme();
            },
            hide: function (color) {
                updateElement("body", theme.body, "background-color",
                    color.toPercentageRgbString());
                updateTheme();
            },
            change: function (color) {
                updateElement("body", theme.body, "background-color",
                    color.toPercentageRgbString());
                updateTheme();
            }
        });
        bgimg = document.getElementById("wr-bg-img");
        bgimg.onchange = function () {
            var img = bgimg.value;
            if (img !== "") {
                updateElement("body", theme.body, "background-image",
                        "url('" + img + "')");
                theme.bgImg = img;
            } else {
                updateElement("body", theme.body, "background-image");
                if (theme.bgImg) {
                    delete theme.bgImg;
                }
            }
            updateTheme();
        };
        bgimgy = document.getElementById("wr-bg-repeat-y");
        bgimgx = document.getElementById("wr-bg-repeat-x");
        bgimgy.onchange = function () {
            if (!bgimgy.checked) {
                if (!bgimgx.checked) {
                    updateElement("body", theme.body, "background-repeat",
                            "no-repeat");
                } else {
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-x");
                }
            } else {
                if (bgimgx.checked) {
                    updateElement("body", theme.body, "background-repeat");
                } else {
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-y");
                }
            }
            updateTheme();
        };
        bgimgx.onchange = function () {
            if (!bgimgx.checked) {
                if (!bgimgy.checked) {
                    updateElement("body", theme.body, "background-repeat",
                            "no-repeat");
                } else {
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-y");
                }
            } else {
                if (bgimgy.checked) {
                    updateElement("body", theme.body, "background-repeat");
                } else {
                    updateElement("body", theme.body, "background-repeat",
                            "repeat-x");
                }
            }
            updateTheme();
        };
        bgimgcover = document.getElementById("wr-bg-stretch");
        bgimgcover.onchange = function () {
            if (bgimgcover.checked) {
                updateElement("body", theme.body, "background-size", "cover");
            } else {
                updateElement("body", theme.body, "background-size");
            }
            updateTheme();
        };
        textcolor = document.getElementById("wr-text-color");
        $("#wr-text-color").spectrum({
            color: textcolor.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("text", theme.cm, "color",
                    color.toPercentageRgbString());
                updateTheme();
            },
            hide: function (color) {
                updateElement("text", theme.cm, "color",
                    color.toPercentageRgbString());
                updateTheme();
            },
            change: function (color) {
                updateElement("text", theme.cm, "color",
                    color.toPercentageRgbString());
                updateTheme();
            }
        });
        textfont = document.getElementById("wr-text-font");
        textfont.onchange = function () {
            updateElement("text", theme.cm, "font-family", "'" +
                    textfont.value + "'");
            updateTheme();
        };
        textsize = document.getElementById("wr-text-size");
        textsizeunit = document.getElementById("wr-text-size-unit");
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
        textweight.onchange = function () {
            updateElement("text", theme.cm, "font-weight", textweight.value);
            updateTheme();
        };
        textstyle = document.getElementById("wr-text-style");
        textstyle.onchange = function () {
            if (textstyle.checked) {
                updateElement("text", theme.cm, "font-style", "italic");
            } else {
                updateElement("text", theme.cm, "font-style");
            }
            updateTheme();
        };
        texthighlight = document.getElementById("wr-highlight-color");
        $("#wr-highlight-color").spectrum({
            color: texthighlight.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default.CodeMirror-focused span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default .activeline");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default div.CodeMirror-selected");
                updateTheme();
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default.CodeMirror-focused span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default .activeline");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default div.CodeMirror-selected");
                updateTheme();
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default.CodeMirror-focused span.CodeMirror-matchhighlight");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default .activeline");
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    ".cm-s-default div.CodeMirror-selected");
                updateTheme();
            }
        });
        scrollcolor = document.getElementById("wr-scroll-color");
        $("#wr-scroll-color").spectrum({
            color: scrollcolor.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-thumb");
                updateTheme();
            }
        });
        scrolltrackcolor = document.getElementById("wr-scrolltrack-color");
        $("#wr-scrolltrack-color").spectrum({
            color: scrolltrackcolor.value,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
            },
            hide: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
            },
            change: function (color) {
                updateElement("other", theme.other, "background",
                    color.toPercentageRgbString(),
                    "::-webkit-scrollbar-track");
                updateTheme();
            }
        });
        allowaudio = document.getElementById("wr-audio-play");
        if (parcel.playaudio === false) {
            allowaudio.checked = false;
        }
        allowaudio.onchange = function () {
            if (allowaudio.checked) {
                updateParcel("playaudio", true);
                toggleAudio();
            } else {
                toggleAudio();
                updateParcel("playaudio", false);
            }
        };
        allowclicks = document.getElementById("wr-audio-clicks-play");
        if (parcel.playclicks === false) {
            allowclicks.checked = false;
        }
        allowclicks.onchange = function () {
            if (allowclicks.checked) {
                updateParcel("playclicks", true);
            } else {
                updateParcel("playclicks", false);
            }
        };

        saveTheme = function (themeName, themesPath) {
            var compileCss, writeCss, fullPath;

            fullPath = themesPath + themeName + "/";

            compileCss = function (fullPath, callback) {
                var i, bod, cem, oth, allCss, fileName, bgThemePath;
                bod = cem = oth = allCss = "";
                if (theme.body.length !== 0) {
                    bod += "body {";
                    for (i = 0; i < theme.body.length; i += 1) {
                        if (theme.body[i].name === "background-image") {
                            fileName = theme.bgImg.split("/").pop();
                            bgThemePath = fullPath + "img/" + fileName;
                            bod += theme.body[i].name + ":url('" +
                                bgThemePath + "');";
                        } else {
                            bod += theme.body[i].name + ":" +
                                theme.body[i].value + ";";
                        }
                    }
                    bod += "} ";
                }

                if (theme.cm.length !== 0) {
                    cem += ".cm-s-default {";
                    for (i = 0; i < theme.cm.length; i += 1) {
                        cem += theme.cm[i].name + ":" + theme.cm[i].value + ";";
                    }
                    cem += "} ";
                }

                for (i = 0; i < theme.other.length; i += 1) {
                    oth += theme.other[i].selector + " { ";
                    oth += theme.other[i].name + ":" +
                        theme.other[i].value + ";";
                    oth += "} ";
                }

                allCss += "@media (min-width: 800px) { ";
                allCss += bod + cem + oth;
                allCss += "}";
                callback(allCss);
            };
            writeCss = function (fullPath, themeName, css, callback) {
                var cssName = themeName + ".css",
                    cssPath = fullPath + cssName,
                    fileName,
                    imgThemePath,
                    bgThemePath,
                    getImgStr,
                    putImgStr;
                if (theme.bgImg) {
                    fileName = theme.bgImg.split("/").pop();
                    imgThemePath = fullPath + "img/";
                    bgThemePath = imgThemePath + fileName;

                    fs.exists(imgThemePath, function (exists) {
                        if (exists) {
                            getImgStr = fs.createReadStream(theme.bgImg);
                            putImgStr = fs.createWriteStream(bgThemePath);
                            putImgStr.on("open", function (fd) {
                                fs.writeFile(bgThemePath, "");
                            });
                            getImgStr.pipe(putImgStr);
                        } else {
                            fs.mkdir(imgThemePath, function (e) {
                                if (e) {
                                    alert("Couldn't save theme: " + e);
                                    return false;
                                }
                                getImgStr = fs.createReadStream(theme.bgImg);
                                putImgStr = fs.createWriteStream(bgThemePath);
                                putImgStr.on("open", function (fd) {
                                    fs.writeFile(bgThemePath, "");
                                });
                                getImgStr.pipe(putImgStr);
                            });
                        }
                    });
                }

                fs.writeFile(cssPath, css, function (err) {
                    if (err) {
                        alert("Couldn't save theme: " + err);
                        return false;
                    }
                    callback();
                });
            };

            fs.exists(fullPath, function (exists) {
                if (exists) {
                    var overwrite = confirm("There is already a theme under that name. Overwrite?");
                    if (overwrite) {
                        compileCss(fullPath, function (css) {
                            writeCss(fullPath, themeName, css, function () {
                                alert("Your theme has been saved!");
                                theme.saved = true;
                                setDefaultTheme(themeName, true);
                            });
                        });
                    } else {
                        alert("Theme not overwritten. Try giving this one a different name.");
                    }
                } else {
                    fs.mkdir(fullPath, function (e) {
                        if (e) {
                            alert("Couldn't save theme: " + e);
                            return false;
                        }
                        compileCss(fullPath, function (css) {
                            writeCss(fullPath, themeName, css, function () {
                                alert("Your theme has been saved!");
                                theme.saved = true;
                                setDefaultTheme(themeName, true);
                            });
                        });
                    });
                }
            });
        };

        save = document.getElementById("wr-save");
        save.onclick = function () {
            if (themes.value === "wr34743") {
                if (theme.saved === false && theme.customized === true) {
                    var themeName = prompt("What should we call this theme?"),
                        themesPath = gui.App.dataPath[0] + "/Themes/";
                    if (themeName) {
                        fs.exists(themesPath, function (exists) {
                            if (exists) {
                                saveTheme(themeName, themesPath);
                            } else {
                                fs.mkdir(themesPath, function (e) {
                                    if (e) {
                                        alert("Couldn't save theme: " + e);
                                        return false;
                                    }
                                    saveTheme(themeName, themesPath);
                                });
                            }
                        });
                    }
                }
            } else {
                if (theme.changed === true) {
                    setDefaultTheme(themes.value, false);
                    theme.changed = false;
                }
            }
        };
        close = document.getElementById("wr-close");
        close.onclick = function () {
            var P;
            if (themes.value === "wr34743") {
                if (theme.saved === false && theme.customized === true) {
                    P = new PROMPT.init("Themer",
                        "Your custom theme remains unsaved. Close without saving?");
                    P.addBtn({
                        text: "Save Theme",
                        onclick: function (e) {
                            save.click();
                            customizer.style.display = "none";
                            cm.focus();
                        },
                        type: "btn-red",
                        focus: true
                    }).addBtn({
                        text: "Cancel",
                        onclick: function (e) {
                            customizer.focus();
                            return false;
                        }
                    }).addBtn({
                        text: "Discard Theme",
                        onclick: function (e) {
                            customizer.style.display = "none";
                            theme.body = [];
                            theme.cm = [];
                            theme.other = [];
                            theme.customized = false;
                            styleDiv.innerHTML = "";
                            loadDefaultTheme();
                            cm.focus();
                        },
                        type: "btn-blue"
                    });
                    P.show();
                } else {
                    customizer.style.display = "none";
                    loadDefaultTheme();
                    cm.focus();
                }
            } else {
                if (theme.changed === true) {
                    P = new PROMPT.init("Themer",
                        "Close themer without saving customized settings?");
                    P.addBtn({
                        text: "Save Settings",
                        onclick: function (e) {
                            save.click();
                            customizer.style.display = "none";
                            cm.focus();
                        },
                        type: "btn-red",
                        focus: true
                    }).addBtn({
                        text: "Cancel",
                        onclick: function (e) {
                            customizer.focus();
                            return false;
                        }
                    }).addBtn({
                        text: "Discard Changed Settings",
                        onclick: function (e) {
                            customizer.style.display = "none";
                            loadDefaultTheme();
                            cm.focus();
                        },
                        type: "btn-blue"
                    });
                    P.show();
                } else {
                    customizer.style.display = "none";
                    loadDefaultTheme();
                    cm.focus();
                }
            }
        };
        hider = document.getElementById("wr-hider");
        hider.onclick = function () {
            // customizer.style.display = "none";
            if (hider.className.indexOf("wr-close-closed") === -1) {
                customizer.style.left = "-281px";
                hider.innerHTML = "&gt;";
                hider.className = "wr-close-closed";
                cm.focus();
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
                    var docVal = cm.doc.getValue();
                    if (filePath) {
                        newFile(element);
                    } else {
                        if (docVal !== "") {
                            newFile(element);
                        } else {
                            openFile(element);
                        }
                    }
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
            saveFile(filePath);
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

    menu.append(new gui.MenuItem({
        label: "File",
        submenu: filemenu
    }));

    // (Menus) Edit >
    editmenu = new gui.Menu();
    editmenu.append(new gui.MenuItem({
        label: "Undo  (\u2318Z)",
        click: function () {
            CodeMirror.commands.undo(cm);
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Redo  (\u2318Y)",
        click: function () {
            CodeMirror.commands.redo(cm);
        }
    }));

    editmenu.append(new gui.MenuItem({
        type: "separator"
    }));

    editmenu.append(new gui.MenuItem({
        label: "Cut  (\u2318X)",
        click: function () {
            clip.set(cm.getSelection());
            cm.replaceSelection("");
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Copy  (\u2318C)",
        click: function () {
            clip.set(cm.getSelection());
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Paste (\u2318P)",
        click: function () {
            cm.replaceSelection(clip.get());
        }
    }));
    editmenu.append(new gui.MenuItem({
        label: "Select All (\u2318A)",
        click: function () {
            CodeMirror.commands.selectAll(cm);
        }
    }));

    editmenu.append(new gui.MenuItem({
        type: "separator"
    }));

    // (Menus) Edit > Find >
    findmenu = new gui.Menu();
    findmenu.append(new gui.MenuItem({
        label: "Find  (\u2318F)",
        click: function () {
            CodeMirror.commands.find(cm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find Next  (\u2318G)",
        click: function () {
            CodeMirror.commands.findNext(cm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find Previous  (\u21E7\u2318G)",
        click: function () {
            CodeMirror.commands.findPrev(cm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Find & Replace  (\u2325\u2318F)",
        click: function () {
            CodeMirror.commands.replace(cm);
        }
    }));

    findmenu.append(new gui.MenuItem({
        label: "Replace All  (\u21E7\u2325\u2318F)",
        click: function () {
            CodeMirror.commands.replaceAll(cm);
        }
    }));

    editmenu.append(new gui.MenuItem({
        label: "Find",
        submenu: findmenu
    }));

    menu.append(new gui.MenuItem({
        label: "Edit",
        submenu: editmenu
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

    menu.append(new gui.MenuItem({
        label: "View",
        submenu: viewmenu
    }));

    document.body.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        menu.popup(e.x, e.y);
        return false;
    });
    /* END MENUS */

    toggleAudio = function () {
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
            if (cm.doc.getHistory().done.length !== 0) {
                // not at oldest document change
                fd = true;
            }
        }

        fileDirty = fd;
        updateTitleDirt(fileDirty);
        updateCounterDirt(fileDirty);
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
    };

    updateTitleDirt = function (isDirty) {
        var dirt, oldTitle, newTitle, oldDirt;
        dirt = "\u2022 ";
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
        }

        document.title = newTitle;
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

    saveFile = function (path, callback) {
        if (path !== undefined && typeof path !== "function") {
            fs.writeFile(path, cm.getValue(), function (err) {
                if (err) {
                    alert("Couldn't save file: " + err);
                }

                setFileDirty(false);
                if (callback) {
                    callback();
                }
            });
        } else {
            var saveButton = document.getElementById("save");
            saveButton.click();

            saveButton.onchange = function () {
                filePath = saveButton.value;
                if (callback) {
                    saveFile(filePath, function () {
                        callback();
                    });
                } else {
                    saveFile(filePath);
                }
            };
        }
    };

    saveAndClose = function () {
        saveFile(filePath, function () {
            closeWindow();
        });
    };

    newFile = function (file) {
        var x = win.x + 15,
            y = win.y + 15,
            width   = 717,
            height  = 419,
            winNext = gui.Window.open("index.html", {
                x: x,
                y: y,
                show: true,
                width: width,
                min_width: 400,
                height: height,
                min_height: 200,
                toolbar: false
            });

        winNext.on("loaded", function () {
            if (file) {
                winNext.window.wreathe.openFile(file);
                winNext.window.madeNew = true;
                win.window.madeNew = true;
            }
        });
    };

    openFileDialog = function () {
        var openButton = document.getElementById("open");
        openButton.click();
        openButton.onchange = function () {
            openFile(openButton.value);
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
            filePath = path;
            // update the recentFiles list for the "Open Recent >" submenu
            updateRecentFiles(path);
            // update document title
            setPageTitle(path);
            // add data to codemirror
            cm.setValue(String(data));
            // reset undo history so that cmd-z doesn't undo the entire file.
            cm.doc.clearHistory();
            // clear the dirt
            setFileDirty(false);
            if (callback) {
                callback();
            }
        });
    };

    closeWindow = function () {
        if (filePath && !win.window.madeNew) {
            // save filePath for when the user reopens the app
            // (only 1 path can be saved since Cmd-Q skips this call and Cmd-W
            // will only close 1 file at a time)
            localStorage.filePath = filePath;
        }

        win.close(true);
    };

    toggleFullscreen = function () {
        win.toggleFullscreen();
        cm.refresh();
    };

    win.on("enter-fullscreen", function () {
        toggleAudio();
    });

    win.on("leave-fullscreen", function () {
        toggleAudio();
        toggleSuperfluous(false, true);
    });

    // deal with the audio player on blur and focus
    win.on("focus", function () {
        document.body.id = "";
        cm.focus();
        toggleAudio();
    });

    win.on("blur", function () {
        document.body.id = "blurred";
        cm.getInputField().blur();
        toggleAudio();
    });

    // load file into the textarea
    gui.App.on("open", function (path) {
        openFile(path);
    });

    // Save some data on close.
    win.on("close", function () {
        // if file has been dirtied & codemirror history is not already at 
        // oldest undo
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
                    cm.focus();
                    return false;
                }
            }).addBtn({
                text: "Don't Save",
                onclick: function (e) {
                    closeWindow();
                },
                type: "btn-red"
            });
            P.show();
        } else {
            closeWindow();
        }
    });

    completeInit = function (path) {
        var defaultTheme, themeSelector;
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
        $scrollbar = $(".CodeMirror-vscrollbar");
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
                            openFile(file, function () {
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
            fs.exists(lsfp, function (exists) {
                if (exists) {
                    openFile(lsfp, function () {
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

    global.cm = cm;
    global.CodeMirror = CodeMirror;
    global.win = win;
    global.menu = menu;
    global.wreathe = {openFile: openFile, newFile: newFile, saveFile: saveFile,
        openFileDialog: openFileDialog};
}(this));
