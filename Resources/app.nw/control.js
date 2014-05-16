/*jslint node: true, browser: true, devel:true, white: false*/
/*global $, Event, Audio, define*/
define([], function () {
    function CMD() {
        // Control & Control Pack
        this.controlpack = document.createElement("iframe");
        this.controlpack.id = "tm-wr-control";
        this.controlpack.src = "control.html";
        this.control = document.createElement("input");
        this.control.type = "text";
        this.control.id = "tm-control";
        this.controlCloseButton = document.createElement("button");
        this.controlCloseButton.id = "tm-control-close-button";
        this.controlCloseButton.innerText = "x";
        this.controlOpened = false;
        // Query Misc
        this.findquery = "";
        this.replacequeryfrom = "";
        this.replacequeryto = "";
        this.definequery = "";
    }
    CMD.prototype.show = function (Keys, machine) {
        if (this.controlOpened === false) {
            machine.doc.parentNode.insertBefore(this.controlpack, machine.doc);
            machine.doc.classList.add("tm-control-on");
            var runtimeCss = document.getElementById("wr-runtime-style").cloneNode(true).childNodes[0],
                extraThemeCss = document.getElementById("wr-link-extra-theme").href;
            var cmd = this;
            this.controlpack.onload = function () {
                // css
                var runtime = cmd.controlpack.contentDocument.getElementById("wr-runtime-style-frame"),
                    extra = cmd.controlpack.contentDocument.getElementById("wr-link-extra-theme-frame");
                if (runtimeCss) {
                    runtime.appendChild(runtimeCss);
                }
                extra.href = extraThemeCss;

                // body
                cmd.controlpack.contentDocument.body.id = "tm-control-body";
                cmd.controlpack.contentDocument.body.appendChild(cmd.control);
                cmd.controlpack.contentDocument.body.appendChild(cmd.controlCloseButton);
                if (window.win.isFullscreen) {
                    cmd.controlpack.contentDocument.body.classList.add("wr-tm-control-fullscreen");
                }

                // bind general editor shortcuts here too so no functionality is 
                // lost.
                Keys.bindEditorShortcuts(cmd.controlpack.contentDocument);
                cmd.control.focus();
                cmd.controlOpened = true;
            };
            this.control.addEventListener("keypress", function (e) {
                var forAll = false;
                if (e.keyCode === 13) {
                    if (this.value.toLowerCase().indexOf("replace") === 0) {
                        if (this.value.toLowerCase().indexOf("replace all") === 0
                                || this.value.toLowerCase().indexOf("replaceall") === 0) {
                            forAll = true;
                        }
                        cmd.modifyForReplace(machine, forAll);
                    } else {
                        cmd.parse(machine, this.value, e);
                    }
                } else if (e.keyCode === 32) {
                    if (this.value.toLowerCase().indexOf("replace") === 0) {
                        e.preventDefault();
                        if (this.value.toLowerCase().indexOf("replace all") === 0
                                || this.value.toLowerCase().indexOf("replaceall") === 0) {
                            forAll = true;
                        }
                        cmd.modifyForReplace(machine, forAll);
                    }
                }
            });
            this.controlCloseButton.onclick = function () {
                cmd.hide(machine);
            };
            this.controlpack.contentWindow.addEventListener("blur", function (e) {
                cmd.hide(machine);
            });

        }
    };
    CMD.prototype.hide = function (machine) {
        if (this.controlOpened === true) {
            if (this.controlpack.parentNode === machine.doc.parentNode) {
                machine.doc.parentNode.removeChild(this.controlpack);
            }
            machine.doc.classList.remove("tm-control-on");
            machine.focus();
            this.control = this.control.cloneNode(true); // remove eventlistener
            this.control.value = ""; // clear input
            this.controlpack = this.controlpack.cloneNode(true);
            this.controlOpened = false;
        }
    };
    CMD.prototype.toggle = function (K, machine) {
        if (this.controlOpened === true) {
            this.hide(machine);
        } else {
            this.show(K, machine);
        }
    };
    CMD.prototype.updateFullscreenStyle = function (isOn) {
        var copack = this.controlpack.contentDocument;
        if (isOn) {
            var runtimeCss = document.getElementById("wr-runtime-style").cloneNode(true).childNodes[0],
                runtime = copack.getElementById("wr-runtime-style-frame");
            if (runtimeCss) {
                runtime.appendChild(runtimeCss);
            }
            copack.body.classList.add("wr-tm-control-fullscreen");
        } else {
            copack.body.classList.remove("wr-tm-control-fullscreen");
        }
    };
    CMD.prototype.find = function (K, machine) {
        this.show(K, machine);
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
        this.controlpack.contentDocument.body.insertBefore(this.replControl, this.controlCloseButton);
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
    CMD.prototype.replace = function (K, machine) {
        this.show(K, machine);
        this.control.value = "replace";
    };
    CMD.prototype.replaceAll = function (K, machine) {
        this.show(machine);
        this.control.value = "replace all";
    };
    CMD.prototype.define = function (K, machine) {
        this.show(machine);
        this.control.value = "define ";
        // yeah idk how i'm going to do this.
    };
    CMD.prototype.parse = function (machine, query, keyEvent) {
        var commands = ["find", "define"],
            lowerquery = query.toLowerCase(),
            i,
            backwards = false;

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
                    if (keyEvent !== undefined) {
                        if (keyEvent.which === 13 && keyEvent.shiftKey === true) {
                            // User has pressed shift-enter while searching, so 
                            // go reverse.
                            backwards = true;
                        }
                    }
                }
                // Execute query via tm[command](query) (e.g., tm.find("word"))
                machine[command](q, backwards);
                // Stop looping.
                break;
            }
        }
    };
    return CMD;
});
