// Undo Manager for TM.
var History = (function() {
    function History (depth, histDelay) {
        if (depth === undefined) {
            depth = Infinity;
        }

        if (histDelay === undefined) {
            histDelay = 1250;
        }

        this.undone = [];
        this.done = [];
        this.undoDepth = depth;
        this.historyChangeDelay = histDelay;
        this.lastChangeTime = 0;
    }

    History.prototype.change = function (tm, change, selection) {
        var hist = tm.history,
            currTime = +new Date(); // syntactic sugar for seconds
        hist.clearRedos(tm);

        if (hist.done.length === hist.undoDepth) {
            hist.done.shift();
        }

        // TODO: register event on specific inputs:
        //       space?, punctuation?, new line, delete, etc.
        //       (all merge with prev if multiple occurances of same char).
        //       Also be sure to ignore '[punctuation][space]' but break at
        //       '[punctuation][new line]' and '[punctuation][delete]' but
        //       join '[delete][delete]' etc.
        if (hist.lastChangeTime === 0
                || hist.lastChangeTime < currTime - hist.historyChangeDelay) {
            console.log(hist.lastChangeTime);
            hist.done.push({change: change, selection: selection});
        }

        hist.lastChangeTime = currTime;
    };

    History.prototype.redo = function (tm, selection) {
        var last = tm.history.undone.pop();
        if (last) {
            tm.value = last.change.to;
            if (last.selection.selectionStart <= last.change.to.length) {
                tm.selectionStart = last.selection.selectionStart;
                tm.selectionEnd = last.selection.selectionEnd;
            } else {
                tm.selectionStart = last.change.to.length;
                tm.selectionEnd = last.change.to.length;
            }
            tm.history.done.push(last);
        }
    };
    History.prototype.undo = function (tm, selection) {
        var last = tm.history.done.pop(),
            undoLast = last;
        undoLast.change.to = tm.value;
        if (last) {
            var prev = this.done[this.done.length - 1];
            if (prev) {
                tm.store = prev.change.to;
            } else {
                tm.store = "";
            }
            tm.value = last.change.from;

            if (last.selection.selectionStart <= last.change.from.length) {
                tm.selectionStart = last.selection.selectionStart;
                tm.selectionEnd = last.selection.selectionEnd;
            } else {
                tm.selectionStart = last.change.from.length;
                tm.selectionEnd = last.change.from.length;
            }

            tm.history.undone.push(undoLast);
        }
    };

    History.prototype.canUndo = function (tm) {
        return tm.history.done.length > 0;
    };

    History.prototype.canRedo = function (tm) {
        return tm.history.undone.length > 0;
    };

    History.prototype.clear = function (tm) {
        tm.history.done = [];
    };

    History.prototype.clearRedos = function (tm) {
        tm.history.undone = [];
    };
    return History;
}());

module.exports.History = History;
