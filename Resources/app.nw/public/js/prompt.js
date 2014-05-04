/*jslint node: true, browser: true, devel:true, white: false*/
(function (global) {
    var PROMPT  = {},
        p = document.getElementById("prompt"),
        pTitle = document.getElementById("prompt-title"),
        pText = document.getElementById("prompt-text"),
        pButtons = document.getElementById("prompt-buttons");

    PROMPT.show = function () {
        p.style.display = "block";
    };

    PROMPT.hide = function () {
        p.style.display = "none";
    };

    PROMPT.clear = function () {
        pButtons.innerHTML = "";
        pTitle.innerText = "";
        pText.innerText = "";
    };

    PROMPT.init = function (title, text) {
        if (text === undefined) {
            text = title;
            title = "";
        }

        pTitle.innerText = title;
        pText.innerText = text;
        pButtons.innerHTML = "";
    };

    PROMPT.init.prototype.addBtn = function (opts) {
        if (typeof opts === "object") {
            var text = opts.text || "",
                id   = opts.id || "",
                call = opts.onclick,
                type = opts.type || "",
                focus = opts.focus || false,
                disabled = opts.disabled ? true : false,
                autofocus,
                btn;

            if (focus === true) {
                autofocus = "autofocus='autofocus'";
            } else {
                autofocus = "";
            }

            btn           = document.createElement("button");
            btn.className = "btn " + type;
            btn.id        = id;
            if (focus) {
                btn.autofocus = autofocus;
            }
            if (disabled) {
                btn.disabled = "disabled";
            }
            btn.innerText = text;

            pButtons.appendChild(btn);

            if (call !== undefined) {
                btn.addEventListener("click", function (e) {
                    call(e);
                    PROMPT.hide();
                    PROMPT.clear();
                });
            }
        }
        return this;
    };

    PROMPT.init.prototype.show = function () {
        PROMPT.show();
    };

    PROMPT.init.prototype.hide = function () {
        PROMPT.hide();
    };

    PROMPT.init.prototype.clear = function () {
        PROMPT.clear();
    };

    global.PROMPT = PROMPT;
}(this));
