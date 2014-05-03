var History = (function() {
    function History () {
        this.undone = [];
        this.done = [];
        this.undoDepth = Infinity;
    }

    History.prototype.change = function (tm, change, selection) {
        this.clearRedos();
        this.done.push({change: change, selection: selection});
    };

    History.prototype.redo = function (tm, selection) {
        var last = this.undone.pop();
        if (last) {
            tm.value = last.change.to;
            tm.selectionStart = last.selection.selectionStart;
            tm.selectionEnd = last.selection.selectionEnd;
            this.done.push(last);
        }
    };
    History.prototype.undo = function (tm, selection) {
        var last = this.done.pop();
        if (last) {
            var prev = this.done[this.done.length - 1];
            if (prev) {
                tm.store = prev.change.to;
            } else {
                tm.store = "";
            }
            tm.value = last.change.from;
            tm.selectionStart = last.selection.selectionStart;
            tm.selectionEnd = last.selection.selectionEnd;
            this.undone.push(last);
        }
    };

    History.prototype.canUndo = function () {
        return this.done.length > 0;
    };

    History.prototype.canRedo = function () {
        return this.undone.length > 0;
    };

    History.prototype.clear = function () {
        this.done = [];
    };

    History.prototype.clearRedos = function () {
        this.undone = [];
    };
    return History;
}());

module.exports.History = History;
