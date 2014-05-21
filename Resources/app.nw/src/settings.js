/*jslint node: true, browser: true, devel:true, white: false*/
/*global $, Event, define*/
define(["view"], function (View) {
    View = new View();
    function Settings() {
        this.theme = {};
        this.theme.body = [];
        this.theme.cm = [];
        this.theme.other = [];
        this.theme.updated = {};
        this.theme.customized = false;
        this.theme.saved = true;
        this.theme.loaded = false;
        this.theme.submenu = {};
        this.theme.presets = [
            {name: "Light", custom: false},
            {name: "Dark", custom: false},
            {name: "Terminal", custom: false},
            {name: "Blue Yonder", custom: false}
        ];

        this.sounds = {};
        this.sounds.mood = [];
        this.sounds.clicks = [{name: "revolver", len: 8, format: "wav"},
            {name: "typewriter", len: 8, format: "wav"}];

        this.settingsHaveOpened = false;

        if (localStorage.parcel) {
            this.parcel = JSON.parse(localStorage.parcel);
        } else {
            this.parcel = {};
        }

        this.audio = document.getElementById("wr-audio");
        this.parcelContainer = document.getElementById("wr-parcel-style");
        this.runtimeContainer = document.getElementById("wr-runtime-style");
        this.styleDiv = document.getElementById("user-css");
        this.customizer = document.getElementById("wr-customizer");
        this.customizerButtons = document.getElementById("wr-customizer-buttons");
        this.themes = document.getElementById("wr-themes");
        this.bgcolor = document.getElementById("wr-bg-color");
        this.bgimg = document.getElementById("wr-bg-img");
        this.bgimgy = document.getElementById("wr-bg-repeat-y");
        this.bgimgx = document.getElementById("wr-bg-repeat-x");
        this.bgimgcover = document.getElementById("wr-bg-stretch");
        this.textcolor = document.getElementById("wr-text-color");
        this.textfont = document.getElementById("wr-text-font");
        this.textsizes = document.getElementById("wr-text-sizes");
        this.textsizer = document.getElementById("wr-text-sizer");
        this.textsize = document.getElementById("wr-text-size");
        this.textsizeunit = document.getElementById("wr-text-size-unit");
        this.textsizetoggle = document.getElementById("wr-text-size-toggle");
        this.textweight = document.getElementById("wr-text-weight");
        this.textstyle = document.getElementById("wr-text-style");
        this.texthighlight = document.getElementById("wr-highlight-color");
        this.scroller = document.getElementById("wr-scroller");
        this.scrollcolor = document.getElementById("wr-scroll-color");
        this.scrolltrackcolor = document.getElementById("wr-scrolltrack-color");
        this.allowaudio = document.getElementById("wr-audio-stop");
        this.audioselect = document.getElementById("wr-fullscreen-audio");
        this.allowclicks = document.getElementById("wr-clicks-stop");
        this.clickselect = document.getElementById("wr-fullscreen-clicks");
        this.loadeddefaults = {};
    }

    // @custom is for user uploads in later versions. Will be
    // stored in gui.App.dataPath.
    // (/Users/[name]/Library/Application Support/Wrong/[etc.])
    Settings.prototype.setDefaultTheme = function (themeName, custom) {
        localStorage.defaultTheme = JSON.stringify({name: themeName, custom: custom});
    };

    Settings.prototype.getDefaultTheme = function () {
        var ret;
        if (localStorage.defaultTheme) {
            ret = JSON.parse(localStorage.defaultTheme);
        } else {
            ret = {name: "Light", custom: false};
        }

        return ret;
    };

    Settings.prototype.updateLocalParcel = function () {
        if (localStorage.parcel) {
            this.parcel = JSON.parse(localStorage.parcel);
        } else {
            this.parcel = {};
        }
    };

    Settings.prototype.updateParcel = function (settings, name, value) {
        settings.parcel[name] = value;
        localStorage.parcel = JSON.stringify(settings.parcel);
        this.updateLocalParcel();
    };

    Settings.prototype.clearParcel = function (settings) {
        settings.parcel = {};
        delete localStorage.parcel;
        this.updateLocalParcel();
    };

    Settings.prototype.clearThemeInParcel = function (settings) {
        Object.keys(settings.parcel).forEach(function (key, index) {
            // Keys with "," are theme keys.
            if (key.indexOf(",") !== -1) {
                delete settings.parcel[key];
                delete localStorage.parcel[key];
                this.updateLocalParcel();
            }
        });
    };

    Settings.prototype.compileRuntimeCss = function (color, rgb, yiq) {
        var minorColor, mainColor, halfColor, r, g, b,
            sName = "#titlebar.wr-titlebar-fullscreen.wr-runtime-fullscreen-css",
            controlName = "body.wr-tm-control-fullscreen",
            styl = document.getElementById("wr-runtime-style"),
            endstyle = "";

        if (color === undefined && rgb === undefined && yiq === undefined) {
            mainColor = window.getComputedStyle(window.tm.doc).color;
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

    Settings.prototype.loadTheme = function (themeName, custom) {
        var themePath;
        if (custom) {
            themePath = window.Wrong.gui.App.dataPath + "/Themes/" + themeName + "/" + themeName + ".css";
        } else {
            themePath = "Themes/" + themeName + "/" + themeName + ".css";
        }
        document.getElementById("wr-link-extra-theme").href = themePath;
    };

    Settings.prototype.loadDefaultTheme = function (settings) {
        var defTheme;

        if (localStorage.defaultTheme && settings.theme.loaded === false) {
            defTheme = settings.getDefaultTheme();
            settings.loadTheme(defTheme.name, defTheme.custom);
            settings.theme.loaded = true;
        }
    };

    Settings.prototype.unloadDefaultTheme = function (settings) {
        if (localStorage.defaultTheme && this.theme.loaded === true) {
            // there's a defaultTheme. remove it.
            document.getElementById("wr-link-extra-theme").href = "";
            settings.theme.loaded = false;
        }
    };

    Settings.prototype.submenuLoadTheme = function (settings, thememenu, themeName, custom) {
        settings.unloadDefaultTheme(settings);
        settings.setDefaultTheme(themeName, custom);
        settings.loadDefaultTheme(settings);
        thememenu.items.forEach(function (item, index) {
            if (item.label !== themeName) {
                item.checked = false;
            }
        });
        themeName = themeName.replace(" ", "-");
        document.getElementById("wr-theme-" + themeName).selected = true;
    };

    Settings.prototype.fetchParcelStyle = function (settings) {
        var bodStlye = "#TM {", tmStyle = ".tm-w-default {", miscStyle = "",
            parcelStyle = "@media (min-width: 800px) {",
            parcelContainer = document.getElementById("wr-parcel-style");
        Object.keys(settings.parcel).forEach(function (key, index) {
            var selector = key.split(",")[0],
                name = key.split(",")[1],
                value = settings.parcel[key];
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

    Settings.prototype.swapChecked = function (clicked) {
        var clickedParent = clicked.parentNode,
            currSelect = clickedParent.querySelector("[data-checked~='true']");
        if (currSelect && currSelect !== clicked) {
            delete currSelect.dataset.checked;
        }
        clicked.dataset.checked = true;
    };

    Settings.prototype.updateElement = function (settings, cat, array, name, value, selector) {
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
        settings.theme.updated[cat] = true;
        settings.theme.customized = true;
        settings.theme.saved = false;
    };

    Settings.prototype.updateTheme = function (settings) {
        var bod = "#TM {", cem = ".tm-w-default {", oth = "",
            bodAll = "", cemAll = "", othAll = "", theme = settings.theme;
        if (theme.updated.body) {
            theme.updated.body = false;
            theme.body.forEach(function (style, index) {
                bod += style.name + ":" + style.value + ";";
                if (index === theme.body.length - 1) {
                    bod += "}";
                    var oldBod = document.getElementById("wr-bod-style"),
                        styleBod = document.createElement("style");
                    if (oldBod) {
                        settings.styleDiv.removeChild(oldBod);
                    }
                    oldBod = document.createElement("div");
                    oldBod.id = "wr-bod-style";
                    bodAll += "@media (min-width: 800px) {" + bod;
                    bodAll += "}";
                    styleBod.appendChild(document.createTextNode(bodAll));
                    oldBod.appendChild(styleBod);
                    settings.styleDiv.appendChild(oldBod);
                }
            });
        }
        if (theme.updated.text) {
            theme.updated.text = false;
            theme.cm.forEach(function (style, index) {
                cem += style.name + ":" + style.value + ";";
                if (index === theme.cm.length - 1) {
                    cem += "}";
                    var oldCem = document.getElementById("wr-cem-style"),
                        styleCem = document.createElement("style");
                    if (oldCem) {
                        settings.styleDiv.removeChild(oldCem);
                    }
                    oldCem = document.createElement("div");
                    oldCem.id = "wr-cem-style";
                    cemAll += "@media (min-width: 800px) {" + cem;
                    cemAll += "}";
                    styleCem.appendChild(document.createTextNode(cemAll));
                    oldCem.appendChild(styleCem);
                    settings.styleDiv.appendChild(oldCem);
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
                    var oldOth = document.getElementById("wr-oth-style"),
                        styleOth = document.createElement("style");
                    if (oldOth) {
                        settings.styleDiv.removeChild(oldOth);
                    }
                    oldOth = document.createElement("div");
                    oldOth.id = "wr-oth-style";
                    othAll += "@media (min-width: 800px) {" + oth;
                    othAll += "}";
                    styleOth.appendChild(document.createTextNode(othAll));
                    oldOth.appendChild(styleOth);
                    settings.styleDiv.appendChild(oldOth);
                }
            });
        }
    };

    Settings.prototype.setSpectrum = function (set, el, type, where, cssName, setColor) {
        $(el).spectrum({
            color: setColor,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                set.colorSpectrum(set, type, where, cssName, color);
            },
            hide: function (color) {
                set.colorSpectrum(set, type, where, cssName, color);
            },
            change: function (color) {
                set.colorSpectrum(set, type, where, cssName, color);
            }
        });
    };

    Settings.prototype.setSpectrumMisc = function (set, el, type, where, cssName, cssClass, setColor) {
        var elt = el;
        if (el === set.texthighlight) {
            elt = el.children[0];
        }
        $(el).spectrum({
            color: setColor,
            showAlpha: true,
            clickoutFiresChange: true,
            showInput: true,
            move: function (color) {
                set.updateElement(set, type, where, cssName,
                    color.toRgbString(),
                    cssClass);
                set.updateTheme(set);
                elt.style.backgroundColor = color;
            },
            hide: function (color) {
                set.updateElement(set, type, where, cssName,
                    color.toRgbString(),
                    cssClass);
                set.updateTheme(set);
                elt.style.backgroundColor = color;
            },
            change: function (color) {
                set.updateElement(set, type, where, cssName,
                    color.toRgbString(),
                    cssClass);
                set.updateTheme(set);
                elt.style.backgroundColor = color;
            }
        });
    };

    Settings.prototype.colorSpectrum = function (settings, type, where, cssName, color) {
        settings.updateElement(settings, type, where, cssName, color.toRgbString());
        settings.updateTheme(settings);

        // find contrast by calculating the YIQ and compare against
        // half of white (255 / 2 ~= 128).
        // (http://24ways.org/2010/calculating-color-contrast/)
        var col = color.toHex(),
            r = parseInt(col.substr(0, 2), 16),
            g = parseInt(col.substr(2, 2), 16),
            b = parseInt(col.substr(4, 2), 16),
            yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        if (type === "text") {
            settings.texthighlight.style.color = color;
            settings.textcolor.children[0].style.color = color;

            if (yiq >= 128) {
                // light color so use dark.
                settings.textcolor.style.backgroundColor = "rgba(0,0,0,0.7)";
                settings.textcolor.style.borderColor = "transparent";
            } else {
                // dark color so use light.
                settings.textcolor.style.backgroundColor = "rgba(255,255,255,0.9)";
                settings.textcolor.style.borderColor = "black";
            }
            settings.compileRuntimeCss(color, {r: r, g: g, b: b}, yiq);
        }

        if (cssName === "background-color") {
            settings.bgcolor.style.backgroundColor = color;
            settings.scroller.style.backgroundColor = color;
            if (yiq >= 128) {
                settings.bgcolor.style.borderColor = "black";
                settings.bgimg.style.borderColor = "black";
            } else {
                settings.bgcolor.style.borderColor = "white";
                settings.bgimg.style.borderColor = "white";
            }
        }
    };

    Settings.prototype.loadDefaults = function (ignoreCustom, settings) {
        var dTheme = settings.getDefaultTheme(),
            openDTheme = settings.themes.querySelector("[data-value='" + dTheme.name + "']"),
            parcel = settings.parcel;
        // Theme selector.
        if (openDTheme) {
            settings.swapChecked(openDTheme);
        }

        if (parcel.playaudio === false) {
            settings.swapChecked(settings.audioselect.querySelector("[data-value='off']"));
        }

        if (parcel.playclicks === false) {
            settings.swapChecked(settings.clickselect.querySelector("[data-value='off']"));
        } else if (parcel.playclicks === true) {
            var clicks = parcel.clicks;
            settings.swapChecked(settings.clickselect.querySelector("[data-value='" + clicks + "']"));
        }

        if (!ignoreCustom && parcel.themeCustomized === true) {
            // load custom values into the customizer.
            Object.keys(parcel).forEach(function (key, index) {
                var selector = key.split(",")[0],
                    name = key.split(",")[1],
                    value = parcel[key];
                if (selector && name && value) {
                    if (selector === "#TM") {
                        switch (name) {
                        case "background-color":
                            settings.bgcolor.dataset.value = value;
                            settings.colorSpectrum(settings, "body", settings.theme.body,
                                name, window.tinycolor(value));
                            settings.setSpectrum(settings, settings.bgcolor, "body", settings.theme.body,
                                name, value);
                            break;
                        case "background-image":
                            settings.bgimg.style.backgroundImage = value;
                            break;
                        case "background-size":
                            settings.bgimgcover.dataset.checked = "true";
                            break;
                        case "background-repeat":
                            if (value === "no-repeat") {
                                settings.bgimgy.dataset.check = "false";
                                settings.bgimgx.dataset.check = "false";
                            } else if (value === "repeat-y") {
                                settings.bgimgy.dataset.check = "true";
                                settings.bgimgx.dataset.check = "false";
                            } else if (value === "repeat-x") {
                                settings.bgimgy.dataset.check = "false";
                                settings.bgimgx.dataset.check = "true";
                            } else {
                                settings.bgimgy.dataset.check = "true";
                                settings.bgimgx.dataset.check = "true";
                            }
                            break;
                        case "color":
                            settings.textcolor.dataset.value = value;
                            settings.colorSpectrum(settings, "text", settings.theme.cm, name,
                                    window.tinycolor(value));
                            settings.setSpectrum(settings, settings.textcolor, "text", settings.theme.cm, name,
                                    value);
                            break;
                        case "font-family":
                            settings.swapChecked(settings.textfont.querySelector("[data-value=" + value + "]"));
                            break;
                        case "font-size":
                            var size = value.match(/[\d.]+/)[0],
                                unit = value.substring(size.length),
                                button = settings.textsizes.querySelector("[data-value='" + size + "']");
                            if (unit === "px" && button) {
                                settings.swapChecked(button);
                            } else {
                                button = settings.textsizes.querySelector("[data-value='...']");
                                button.dispatchEvent(new Event("click"));
                                settings.textsize.value = size;
                                $(settings.textsizeunit).val(unit);
                            }
                            break;
                        case "font-weight":
                            settings.swapChecked(settings.textweight.querySelector("[data-value='" + value + "']"));
                            break;
                        case "font-style":
                            settings.swapChecked(settings.textstyle.querySelector("[data-value='" + value + "']"));
                            break;
                        }
                    } else if (selector === "::selection") {
                        settings.texthighlight.dataset.value = value;
                        settings.texthighlight.children[0].style.backgroundColor = value;
                        settings.setSpectrumMisc(settings, settings.texthighlight, "other", settings.theme.other,
                            "background", selector, value);
                    } else if (selector === "::-webkit-scrollbar-thumb") {
                        settings.scrollcolor.dataset.value = value;
                        settings.scrollcolor.style.backgroundColor = value;
                        settings.setSpectrumMisc(settings, settings.scrollcolor, "other", settings.theme.other, "background",
                            selector, value);
                    } else if (selector === "::-webkit-scrollbar-track") {
                        settings.scrolltrackcolor.dataset.value = value;
                        settings.scrolltrackcolor.style.backgroundColor = value;
                        settings.setSpectrumMisc(settings, settings.scrolltrackcolor, "other", settings.theme.other,
                            "background", selector, value);
                    }
                }
            });
        } else {
            // Not a custom theme. Use whatever exists on screen.
            var styles = window.getComputedStyle(window.tm.doc),
                bColor = styles.backgroundColor,
                bImg = styles.backgroundImage,
                tColor = styles.color,
                i,
                j,
                // Default values from light.css
                selectColor = "rgba(0, 133, 255, 0.32)",
                thumbColor = "rgba(0, 0, 0, 0.35)",
                trackColor = "rgba(0, 0, 0, 0.19)",
                styleSheet = document.styleSheets[5] || document.styleSheets[3];

            // 1. background color + image
            settings.bgcolor.dataset.value = bColor;
            settings.colorSpectrum(settings, "body", settings.theme.body, "background-color", window.tinycolor(bColor));
            settings.setSpectrum(settings, settings.bgcolor, "body", settings.theme.body, "background-color", bColor);
            settings.bgimgcover.dataset.checked = "false";

            // 2. text stuff
            settings.textcolor.dataset.value = tColor;
            settings.colorSpectrum(settings, "text", settings.theme.cm, "color", window.tinycolor(tColor));
            settings.setSpectrum(settings, settings.textcolor, "text", settings.theme.cm, "color", tColor);
            settings.swapChecked(settings.textfont.querySelector("[data-value='Vera Mono']"));
            settings.swapChecked(settings.textsizes.querySelector("[data-value='12']"));
            settings.textsizetoggle.style.display = "inline-table";
            settings.textsizer.style.display = "none";
            settings.swapChecked(settings.textweight.querySelector("[data-value='400']"));
            settings.swapChecked(settings.textstyle.querySelector("[data-value='normal']"));

            // selection color (and scroller color while we're at it)
            for (i = 0; i < styleSheet.rules.length; i++) {
                var sRule = styleSheet.rules[i];
                if (sRule.type !== 1) {
                    for (j = 0; j < sRule.cssRules.length; j++) {
                        var cssRule = sRule.cssRules[j];
                        if (cssRule.selectorText.indexOf(":selection") !== -1) {
                            selectColor = cssRule.style.background;
                        } else if (cssRule.selectorText.indexOf(":-webkit-scrollbar-thumb")
                                !== -1) {
                            thumbColor = cssRule.style.background;
                        } else if (cssRule.selectorText.indexOf(":-webkit-scrollbar-track")
                                !== -1) {
                            trackColor = cssRule.style.background;
                        }
                    }
                } else {
                    if (sRule.selectorText.indexOf(":selection") !== -1) {
                        selectColor = sRule.style.backgroundColor;
                    } else if (sRule.selectorText.indexOf(":-webkit-scrollbar-thumb")
                            !== -1) {
                        thumbColor = sRule.style.background;
                    } else if (sRule.selectorText.indexOf(":-webkit-scrollbar-track")
                            !== -1) {
                        trackColor = sRule.style.background;
                    }
                }
            }

            // 3. selection color
            settings.texthighlight.dataset.value = selectColor;
            settings.texthighlight.children[0].style.backgroundColor = selectColor;
            settings.setSpectrumMisc(settings, settings.texthighlight, "other", settings.theme.other,
                    "background", "::selection", selectColor);

            // 4. scroll color
            // Scroll thumb
            settings.scrollcolor.dataset.value = thumbColor;
            settings.scrollcolor.style.backgroundColor = thumbColor;
            settings.setSpectrumMisc(settings, settings.scrollcolor, "other", settings.theme.other, "background",
                "::-webkit-scrollbar-thumb", thumbColor);
            // Scroll track
            settings.scrolltrackcolor.dataset.value = trackColor;
            settings.scrolltrackcolor.style.backgroundColor = trackColor;
            settings.setSpectrumMisc(settings, settings.scrolltrackcolor, "other", settings.theme.other,
                "background", "::-webkit-scrollbar-track", trackColor);

            settings.loadeddefaults.backgroundColor = bColor;
            settings.loadeddefaults.color = tColor;
            settings.loadeddefaults.selection = selectColor;
            settings.loadeddefaults.scrollthumbColor = thumbColor;
            settings.loadeddefaults.scrolltrackColor = trackColor;
        }
    };

    Settings.prototype.saveTheme = function (settings) {
        // Fires on "Ok done" click.
        // collect all the data in the customizer and
        // push to parcel with updateParcel();
        var theme = settings.theme;
        if (theme.saved !== true && theme.customized === true) {
            var body = theme.body,
                text = theme.cm,
                other = theme.other;
            body.forEach(function (rule) {
                var name = rule.name,
                    selector = "#TM",
                    value = rule.value;
                if (name !== "background-color"
                        || (name === "background-color" &&
                            value !== settings.loadeddefaults.backgroundColor)) {
                    settings.updateParcel(settings, selector + "," + name, value);
                }
            });
            text.forEach(function (rule) {
                var name = rule.name,
                    selector = "#TM",
                    value = rule.value;
                if (name !== "color"
                        || (name === "color" &&
                            value !== settings.loadeddefaults.color)) {
                    settings.updateParcel(settings, selector + "," + name, value);
                }
            });
            other.forEach(function (rule) {
                var name = rule.name,
                    selector = rule.selector,
                    value = rule.value;
                if (selector === "::selection"
                        && value !== settings.loadeddefaults.selection) {
                    settings.updateParcel(settings, selector + "," + name, value);
                } else if (selector === "::-webkit-scrollbar-track"
                        && value !== settings.loadeddefaults.scrolltrackColor) {
                    settings.updateParcel(settings, selector + "," + name, value);
                } else if (selector === "::-webkit-scrollbar-thumb"
                        && value !== settings.loadeddefaults.scrollthumbColor) {
                    settings.updateParcel(settings, selector + "," + name, value);
                } // no need for an else, these are all the "other"s so far.
            });
            settings.updateParcel(settings, "themeCustomized", true);
            settings.theme.saved = true;
            settings.theme.customized = false;
        }
    };

    Settings.prototype.openSettings = function () {
        var customizer, closer, customizerButtons, hider, colorSpectrum,
            themes, saveTheme, updateTheme, updateElement,
            styleDiv, bgimg, bgimgy, bgimgx, bgimgcover, bgcolor,
            textfont, textsize, textsizes, textsizer, textsizeunit,
            textweight, textstyle, textcolor, texthighlight, textsizetoggle,
            openDTheme, setSpectrum, setSpectrumMisc,
            scroller, scrollcolor, scrolltrackcolor, allowaudio,
            allowclicks, audioselect, clickselect, loadeddefaults,
            reset, oldCss, initialTheme, parcelContainer, runtimeContainer, settings;

        initialTheme = this.getDefaultTheme();

        customizer = this.customizer;
        customizerButtons = this.customizerButtons;
        colorSpectrum = this.colorSpectrum;
        themes = this.themes;
        saveTheme = this.saveTheme;
        updateTheme = this.updateTheme;
        updateElement = this.updateElement;
        styleDiv = this.styleDiv;
        bgimg = this.bgimg;
        bgimgy = this.bgimgy;
        bgimgx = this.bgimgx;
        bgimgcover = this.bgimgcover;
        bgcolor = this.bgcolor;
        textfont = this.textfont;
        textsize = this.textsize;
        textsizes = this.textsizes;
        textsizer = this.textsizer;
        textsizeunit = this.textsizeunit;
        textweight = this.textweight;
        textstyle = this.textstyle;
        textcolor = this.textcolor;
        texthighlight = this.texthighlight;
        textsizetoggle = this.textsizetoggle;
        openDTheme = this.openDTheme;
        setSpectrum = this.setSpectrum;
        setSpectrumMisc = this.setSpectrumMisc;
        scroller = this.scroller;
        scrollcolor = this.scrollcolor;
        scrolltrackcolor = this.scrolltrackcolor;
        allowaudio = this.allowaudio;
        allowclicks = this.allowclicks;
        audioselect = this.audioselect;
        clickselect = this.clickselect;
        loadeddefaults = this.loadeddefaults;
        parcelContainer = this.parcelContainer;
        runtimeContainer = this.runtimeContainer;

        settings = this;

        // Open settings viewer.
        customizer.style.display = "block";
        customizerButtons.style.display = "block";
        if (View.isFullscreen() === false) {
            View.toggleFullscreen();
        }

        // If settingsHaveOpened.
        if (settings.settingsHaveOpened === false) {
            window.setTimeout(function () {
                settings.loadDefaults(true, settings);
            }, 100);
            settings.settingsHaveOpened = true;
            $(themes.children).click(function (ev) {
                var theme = this,
                    css = theme.dataset.value,
                    link;

                link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = "text/css";
                if (theme.parentNode.id === "wr-themes-custom") {
                    link.href = window.Wrong.gui.App.dataPath + "/Themes/" + css + "/" + css + ".css";
                } else {
                    link.href = "Themes/" + css + "/" + css + ".css";
                }
                document.getElementById("wr-link-extra-theme").href = "";
                settings.unloadDefaultTheme(settings);
                settings.setDefaultTheme(css, false);
                link.onload = function () {
                    while (parcelContainer.firstChild) {
                        parcelContainer.removeChild(parcelContainer.firstChild);
                    }
                    while (runtimeContainer.firstChild) {
                        runtimeContainer.removeChild(runtimeContainer.firstChild);
                    }
                    settings.compileRuntimeCss();
                    settings.loadDefaults(true, settings);
                    while (styleDiv.firstChild) {
                        // Remove everything from styleDiv.
                        styleDiv.removeChild(styleDiv.firstChild);
                    }
                };
                if (css !== "Light") {
                    document.getElementById("wr-link-extra-theme").href = link.href;
                    styleDiv.appendChild(link);
                } else {
                    // Compile for Light theme.
                    while (parcelContainer.firstChild) {
                        parcelContainer.removeChild(parcelContainer.firstChild);
                    }
                    while (runtimeContainer.firstChild) {
                        runtimeContainer.removeChild(runtimeContainer.firstChild);
                    }
                    settings.compileRuntimeCss();
                    settings.loadDefaults(true, settings);
                    while (styleDiv.firstChild) {
                        // Remove everything from styleDiv.
                        styleDiv.removeChild(styleDiv.firstChild);
                    }
                }
                settings.swapChecked(this);
            });

            setSpectrum(settings, bgcolor, "body", settings.theme.body, "background-color", bgcolor.dataset.value);
            bgimg.onchange = function () {
                var img = bgimg.value;
                if (img !== "") {
                    updateElement(settings, "body", settings.theme.body, "background-image",
                            "url('" + img + "')");
                    settings.theme.bgImg = img;
                    bgimg.style.backgroundImage = "url('" + img + "')";
                } else {
                    updateElement(settings, "body", settings.theme.body, "background-image", "none");
                    bgimg.style.backgroundImage = "none";
                    if (settings.theme.bgImg) {
                        delete settings.theme.bgImg;
                    }
                }
                updateTheme(settings);
            };
            bgimgy.onclick = function () {
                if (bgimgy.dataset.checked === "true") {
                    // button WAS selected, now being deselected.
                    if (bgimgx.dataset.checked === "false") {
                        // no repeat selected.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "no-repeat");
                    } else {
                        // repeat-x selected.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "repeat-x");
                    }
                    bgimgy.dataset.checked = false;
                } else {
                    if (bgimgx.dataset.checked === "true") {
                        // repeat all.
                        updateElement(settings, "body", settings.theme.body, "background-repeat", "repeat");
                    } else {
                        // repeat-y only.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "repeat-y");
                    }
                    bgimgy.dataset.checked = true;
                }
                updateTheme(settings);
            };
            bgimgx.onclick = function () {
                if (bgimgx.dataset.checked === "true") {
                    // button WAS selected, now deselected.
                    if (bgimgy.dataset.checked === "false") {
                        // none selected.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "no-repeat");
                    } else {
                        // repeat y selected.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "repeat-y");
                    }
                    bgimgx.dataset.checked = false;
                } else {
                    if (bgimgy.dataset.checked === "true") {
                        // all selected.
                        updateElement(settings, "body", settings.theme.body, "background-repeat", "repeat");
                    } else {
                        // repeat-x only.
                        updateElement(settings, "body", settings.theme.body, "background-repeat",
                                "repeat-x");
                    }
                    bgimgx.dataset.checked = true;
                }
                updateTheme(settings);
            };
            bgimgcover.onclick = function () {
                if (bgimgcover.dataset.checked === "false") {
                    // button wasn't selected. clicked, so select it.
                    bgimgcover.dataset.checked = true;
                    updateElement(settings, "body", settings.theme.body, "background-size", "cover");
                } else {
                    bgimgcover.dataset.checked = false;
                    updateElement(settings, "body", settings.theme.body, "background-size", "auto");
                }
                updateTheme(settings);
            };
            setSpectrum(settings, textcolor, "text", settings.theme.cm, "color", textcolor.dataset.value);
            $(textfont.children).each(function (index) {
                var font = this.dataset.value;
                this.style.fontFamily = font;
            }).click(function () {
                var font = this;
                settings.swapChecked(this);
                if (font.dataset.value !== "...") {
                    updateElement(settings, "text", settings.theme.cm, "font-family", "'" +
                        font.dataset.value + "'");
                    updateTheme(settings);
                }
            });
            $(textsizes.children).click(function () {
                var size = this.dataset.value;
                settings.swapChecked(this);
                if (size !== "...") {
                    if (this.id !== "wr-text-sizer") {
                        textsize.value = size;
                        $(textsize).change();
                        if (textsizetoggle.style.display === "none") {
                            textsizetoggle.style.display = "inline-table";
                            textsizer.style.display = "none";
                        }
                    }
                } else {
                    if (textsizetoggle.style.display !== "none") {
                        textsizetoggle.style.display = "none";
                        textsizer.style.display = "inline-table";
                    }
                }
            });
            textsize.onchange = function () {
                updateElement(settings, "text", settings.theme.cm, "font-size",
                    textsize.value + textsizeunit.value);
                updateTheme(settings);
            };
            textsizeunit.onchange = function () {
                updateElement(settings, "text", settings.theme.cm, "font-size",
                        textsize.value + textsizeunit.value);
                updateTheme(settings);
            };
            $(textweight.children).each(function () {
                this.style.fontWeight = this.dataset.value;
            }).click(function () {
                settings.swapChecked(this);
                updateElement(settings, "text", settings.theme.cm, "font-weight", this.dataset.value);
                updateTheme(settings);
            });
            $(textstyle.children).click(function () {
                var styl = this.dataset.value;
                settings.swapChecked(this);
                updateElement(settings, "text", settings.theme.cm, "font-style", styl);
                updateTheme(settings);
            });
            setSpectrumMisc(settings, texthighlight, "other", settings.theme.other, "background",
                    "::selection", texthighlight.dataset.value);
            setSpectrumMisc(settings, scrollcolor, "other", settings.theme.other, "background",
                    "::-webkit-scrollbar-thumb", scrollcolor.dataset.value);
            setSpectrumMisc(settings, scrolltrackcolor, "other", settings.theme.other, "background",
                    "::-webkit-scrollbar-track", scrolltrackcolor.dataset.value);
            $(audioselect.children).click(function () {
                settings.swapChecked(this);
                var track = this.dataset.value;
                if (track !== "off") {
                    var trackURL = "Audio/" + track + ".ogg";
                    settings.updateParcel(settings, "playaudio", true);
                    settings.updateParcel(settings, "audio", trackURL);
                    settings.audio.src = trackURL;
                    View.toggleAudio(true);
                } else {
                    View.toggleAudio(false);
                    settings.updateParcel(settings, "playaudio", false);
                }
            });
            $(clickselect.children).click(function () {
                settings.swapChecked(this);
                var clicks = this.dataset.value;
                if (clicks !== "off") {
                    settings.updateParcel(settings, "clicks", clicks);
                    settings.updateParcel(settings, "playclicks", true);
                } else {
                    settings.updateParcel(settings, "playclicks", false);
                }
            });

            reset = document.getElementById("wr-reset");
            reset.onclick = function () {
                // Order of actions important here.
                if (initialTheme.name !== settings.getDefaultTheme().name) {
                    themes.querySelector("[data-value='" + initialTheme.name
                            + "']").dispatchEvent(new Event("click"));
                }
                settings.compileRuntimeCss();
                settings.loadDefaults(false, settings);
                while (styleDiv.firstChild) {
                    // Remove everything from styleDiv.
                    styleDiv.removeChild(styleDiv.firstChild);
                }
                settings.fetchParcelStyle(settings);
                settings.theme.customized = false;
            };
            closer = document.getElementById("wr-close");
            closer.onclick = function () {
                customizer.style.display = "none";
                customizerButtons.style.display = "none";
                settings.clearThemeInParcel(settings);
                saveTheme(settings);
                window.tm.focus();
            };
            hider = document.getElementById("wr-hider");
            hider.onclick = function () {
                if (hider.className.indexOf("wr-close-closed") === -1) {
                    customizer.style.left = "-254px";
                    customizerButtons.style.left = "-254px";
                    hider.children[0].innerText = "show settings";
                    hider.className = "wr-close-closed";
                    window.tm.focus();
                } else {
                    customizer.style.left = "0";
                    customizerButtons.style.left = "0";
                    hider.children[0].innerText = "hide settings";
                    hider.className = "";
                    customizer.focus();
                }
            };
        }
    };
    return Settings;
});
