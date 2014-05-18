/*jslint node: true, browser: true, devel:true, white: false*/
/*global Event, define*/
define(["history", "view"], function (History, View) {
    View = new View();
    function TM(val) {
        if (val === undefined) {
            val = "";
        }

        this.doc = document.createElement("pre");
        this.doc.id = "TM";
        this.doc.className += "tm-w-default";
        try {
            this.doc.contentEditable = "plaintext-only";
        } catch (e) {
            this.doc.contentEditable = "";
        }
        document.getElementById("TMHolder").appendChild(this.doc);
        this.value = val;
        this.store = val;
        this.selectionStart = 0;
        this.selectionEnd = 0;
        this.searchPos = 0;
        this.storedScrollTop = 0;
        this.lastInput = null;
        this.lastCursor = {selectionStart: 0, selectionEnd: 0};
        this.history = new History();
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
        var ntm = this.init(this.value);
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
        window.tm = this;
    };
    TM.prototype.upgrade = function (tm) {
        var tmholder = document.getElementById("TMHolder");
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
                // Select the new word.
                this.selectionEnd = this.selectionStart;
                this.selectionStart -= replacement.length;
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
            // Dispatch input event to update history.
            var e = new Event("input");
            this.doc.dispatchEvent(e);
        }
    };
    TM.prototype.scrollToSelection = function () {
        var range = window.getSelection().getRangeAt(0),
            t = range.getBoundingClientRect().top;
        this.doc.scrollTop += t - window.innerHeight / 2;
    };
    TM.prototype.getWordCount = function () {
        var doc = this.value.match(/\S+/g),
            subdoc = this.value.substring(this.selectionStart, this.selectionEnd),
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
    TM.prototype.init = function (val) {
        var tm = new TM(val);
        tm.doc.addEventListener("input", function () {
            var store = window.tm.store,
                value = window.tm.value;
            window.tm.history.change(
                window.tm,
                {from: store, to: value},
                window.tm.getSelection()
            );
            View.setFileDirty(true);
            View.displayWordCount();
            window.tm.store = window.tm.value;
        });
        tm.doc.addEventListener("keydown", function (e) {
            View.toggleSuperfluous(true);

            if (!e.metaKey && !e.altKey && e.keyIdentifier !== "Shift") {
                window.tm.lastInput = e.which;
            }

            // Insert tab.
            if (window.tm.isFocused() && e.which === 9) {
                window.tm.insertText("\t");
                e.preventDefault();
            }

            // store the cursor position/selection.
            window.tm.lastCursor = window.tm.getSelection();
        });
        tm.doc.addEventListener("keypress", function () {
            View.playClicks();
        });
        tm.doc.addEventListener("mouseup", function () {
            View.displayWordCount();

            // store the cursor position/selection.
            window.tm.lastCursor = window.tm.getSelection();
        });
        tm.doc.onpaste = function (e) {
            e.preventDefault();
            var content;
            if (e.clipboardData) {
                // cmd-paste
                content = e.clipboardData.getData("text/plain");
            } else {
                // Right-click > paste
                content = window.clip.get();
            }
            var oldContent = window.tm.value;
            window.tm.insertText(content);
        };
        tm.doc.addEventListener("contextmenu", function (e) {
            // Insert editmenu on right-click.
            window.editmenu.popup(e.x, e.y);
        });
        return tm;
    };
    return TM;
});
