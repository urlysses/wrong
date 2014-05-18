/*jslint node: true, browser: true, devel:true, white: false*/
/*global define*/
define(["tm"], function (TM) {
    TM = new TM();

    function Files() {
        this.tabs = {};
    }

    Files.prototype.updateTabs = function (file, data) {
        this.tabs[file] = TM.init();
        if (data) {
            this.tabs[file].value = data;
        }
    };

    Files.prototype.exists = function (filename, callback) {
        var tabs = this.tabs;
        var isOpen = false;
        Object.keys(this.tabs).forEach(function (key) {
            if (key === filename) {
                // File already exists (is already open)
                isOpen = true;
            }
        });

        return callback(isOpen);
    };

    return Files;
});
