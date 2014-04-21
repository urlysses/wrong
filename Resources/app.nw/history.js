// FROM: https://gist.github.com/NoxArt/2692147
var History = (function() {
    function History(config) {
        this.config = {
            limit: Infinity,
            onUndo: function() {},
            onRedo: function() {},
            onChange: function() {}
        };
        var i;
        for (i in config) {
            if (config.hasOwnProperty(i)) {
                this.config[i] = config[i];
            }
        }

        this.actions = [];
        this.current = -1;
    }

    History.prototype.happened = function(name, actionDo, actionUndo, id) {
        this.clearFuture();
        this.actions.push({
            name: name,
            identifier: id || "",
            undo: actionUndo,
            redo: actionDo
        });
        this.current++;
        this.config.onChange.call(this, "happened", this.actions.length);
        if (this.config.limit !== Infinity) {
            while (this.actions.length > this.config.limit) {
                this.actions.shift();
                this.current--;
            }
        }
    };

    History.prototype.happen = function(name, actionDo, actionUndo, id) {
        this.happened(name, actionDo, actionUndo, id || "");
        return actionDo();
    };

    History.prototype.undo = function(steps) {
        var self = this,
        step = 0;

        steps = steps || 0;
        if (steps === 0) {
            return this.undoOne();
        }

        while (step++ < steps) {
            self.undoOne();
            self.config.onUndo();
            self.config.onChange.call(self, "undo", self.current + 1);
        }
    };

    History.prototype.undoOne = function() {
        if (this.actions[this.current]) {
            this.actions[this.current].undo();
            this.config.onChange.call(this, "undo", this.current);
            return this.current--;
        }
    };

    History.prototype.redo = function(steps) {
        var self = this,
        step = 0;

        steps = steps || 0;

        if (steps === 0) {
            return this.redoOne();
        }

        while (step++ < steps) {
            self.redoOne();
            self.config.onRedo();
            self.config.onChange.call(this, "redo", self.current + 1);
        }
    };

    History.prototype.redoOne = function() {
        if (this.actions[this.current + 1]) {
            this.current++;
            this.config.onChange.call(this, "redo", this.current + 1);
            return this.actions[this.current].redo();
        }
    };

    History.prototype.goTo = function(val) {
        return this.actions[val];
    };


    History.prototype.getHistory = function() {
        var past;
        if (this.current === -1) {
            past = [];
        } else {
            past = this.actions.slice(0, this.current + 1);
        }
        return past;
    };

    History.prototype.getFuture = function() {
        var future;
        if (this.current + 1 >= this.actions.length) {
            future = [];
        } else {
            future = this.actions.slice(this.current + 1, this.actions.length);
        }
        return future;
    };


    History.prototype.hasHistory = function() {
        return this.current > -1;
    };


    History.prototype.hasFuture = function() {
        return this.current + 1 < this.actions.length;
    };

    History.prototype.clear = function() {
        this.current = -1;
        this.actions = [];
    };

    History.prototype.clearFuture = function() {
        if (this.current + 1 < this.actions.length) {
            this.actions.splice(this.current + 1, this.actions.length - this.current - 1);
            return History;
        }
    };

    return History;
}());

module.exports.History = History;
