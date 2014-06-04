/*jslint node: true, browser: true, devel:true, white: false*/
/*global define*/
// Markdown Parser
// Very loosely modeled on chjj's marked (regexps mostly).
//
// NOTICE: This module is pretty broken & slow. 
// Currently only parses inline syntax (bold, itals, comments).
define([], function () {
    function Markdown() {
        this.HTML = "";
    }

    /*
     * Parses the plaintext and returns an object
     * containing both expected HTML and the editor's
     * HTML, which includes the user's syntax.
     */
    Markdown.prototype.blockParse = function (value) {
        // HTML-escape "<" so it doesn't fall into innerHTML.
        value = value.replace(/</gm, "&lt;");
        var html = value,
            editorhtml = value,
            match,
            rand,
            repl,
            specialcharsopen,
            syntaxmap = [],
            md = this;

        // Paragraphs.
        /*var paragraph = /^((?:[^\n|#|>]+\n?)+)(\n|$)/gm;
        editorhtml = editorhtml.replace(paragraph, function (match, p1, p2) {
            if (p2 !== "") {
                match = match.slice(0, -p2.length);
            }

            return "<p>" + md.inlineParse(match).editorhtml + "</p>" + p2;
        });*/

        // Headings.
        // # to ###### (h1 to h6), only at start of line.
        var heading = /^ *(#{1,6}) *([^\n]+?) *#* *(\n+|$)/gm;
        editorhtml = editorhtml.replace(heading, function (match, p1, p2, p3) {
            var nl = "";
            if (p3.length > 1) {
                match = match.slice(0, -p3.length);
                nl = p3;
            }
            return "<h" + p1.length + ">" + md.inlineParse(match).editorhtml +
                "</h" + p1.length + ">" + nl;
        });

        // Horizontal rules.
        // Three or more hyphens, underscores, or asterisks.
        // Don't do anything stylistically with it in toEditorHTML. 

        // Blockquotes
        // Line begins with >
        var blockquote = /^( *>([^\n]+?) *(\n+|$))+/gm;
        editorhtml = editorhtml.replace(blockquote, function (match, _p1, p2) {
            return "<blockquote>" + md.inlineParse(match).editorhtml + "</blockquote>";
        });

        // Lists
        /*var list = /^(?: *)((?:[*+\-]|\d+\.)) ([\s\S]+?(?:( *[\-*_]){3,} *(?:\n+|$)|\n{2,}(?! )(?!\1(?:[*+\-]|\d+\.) )\n*|\s*$))+/gm;
        editorhtml = editorhtml.replace(list, function (match, p1, p2) {
            var listType = "ul", li = "";
            if (p1.match(/[0-9]./)) {
                listType = "ol";
            }
            li += "<" + listType + ">";
            match.split("\n").forEach(function (el) {
                var bullet = el.split(" ")[0] + " ";
                console.log(el);
                li += "<li>" + bullet +
                        md.inlineParse(el.substr(bullet.length)).editorhtml +
                        "</li>";
            });
            li += "</" + listType + ">\n";
            return li;
        });*/

        // Text
        // Any block of text that hasn't been sorted gets thrown back into
        // <p>.
        // TODO: really get rid of this. fix your regular expressions.
        var doc = document.createElement("div"), i;
        doc.innerHTML = editorhtml;
        for (i = 0; i < doc.childNodes.length; i++) {
            var node = doc.childNodes[i];
            if (node.nodeType === 3) {
                var m = document.createElement("p");
                m.innerHTML = md.inlineParse(node.textContent).editorhtml;
                doc.insertBefore(m, node);
                doc.removeChild(node);
            }
        }
        editorhtml = doc.innerHTML;

        return {html: html, editorhtml: editorhtml};
    };
    /*
     * Inline styling (anything that fits within a larger block)
     */
    Markdown.prototype.inlineParse = function (value) {
        // HTML-escape "<" so it doesn't fall into innerHTML.
        // Also html-escape other important characters so no glitches
        // are had.
        value = value.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/"/g, "&#34;")
                .replace(/'/g, "&#39;");
        var html = value,
            editorhtml = value,
            rand,
            repl,
            specialcharsopen,
            specialcharsclose,
            syntaxmap = [];

        // Escaped chars
        var escapenames = {"*": "ASTERISK", "`": "BACKTICK", "\\": "BACKSLASH",
                            "{": "OPENBRACE", "}": "CLOSEBRACE",
                            "[": "OPENBRACKET", "]": "CLOSEBRACKET",
                            "(": "OPENPAREN", ")": "CLOSEPAREN", "#": "HASH",
                            "+": "PLUS", "-": "MINUS", ".": "PERIOD", "!": "BANG",
                            "_": "UNDERSCORE", ">": "GT"};
        var escaped = /\\([\\`*{}\[\]()#+\-.!_>])/g;
        editorhtml = editorhtml.replace(escaped, function (match, chara) {
            var rand = Math.random();
            var repl = "ESCAPED" + escapenames[chara] + rand;
            syntaxmap.push({str: match, chars: repl});
            return repl;
        });

        // Custom: inline comments
        // [(inline comment)] (also <!--html comments-->?)
        var comment = /(\[\()([\s\S]*?)(\)\])/g;
        rand = Math.random();
        specialcharsopen = "OPENBRACKETCOMMENT" + rand;
        specialcharsclose = "CLOSEBRACKETCOMMENT" + rand;
        syntaxmap.push({str: "[(", chars: specialcharsopen});
        syntaxmap.push({str: ")]", chars: specialcharsclose});
        //repl = "<i>$2</i>";
        //html = html.replace(comment, repl);
        repl = "<i>" + specialcharsopen + "$2" + specialcharsclose + "</i>";
        editorhtml = editorhtml.replace(comment, repl);
        // css-style comments 
        comment = /(\/\*)([\s\S]*?)(\*\/)/g;
        rand = Math.random();
        specialcharsopen = "CSSOPENCOMMENT" + rand;
        specialcharsclose = "CSSCLOSECOMMENT" + rand;
        syntaxmap.push({str: "/*", chars: specialcharsopen});
        syntaxmap.push({str: "*/", chars: specialcharsclose});
        //repl = "<i>$2</i>";
        //html = html.replace(comment, repl);
        repl = "<i>" + specialcharsopen + "$2" + specialcharsclose + "</i>";
        editorhtml = editorhtml.replace(comment, repl);

        // Strong
        // **word** or __word__
        var strong = /(__)([\s\S]+?)(__(?!_))/g;
        rand = Math.random();
        specialcharsopen = "UNDERSCORESTRONG" + rand;
        syntaxmap.push({str: "__", chars: specialcharsopen});
        //repl = "<strong>$2</strong>";
        //html = html.replace(strong, repl);
        repl = "<strong>" + specialcharsopen + "$2" + specialcharsopen + "</strong>";
        editorhtml = editorhtml.replace(strong, repl);
        // Asterisk strong
        strong = /(\*\*)([\s\S]+?)(\*\*(?!\*))/g;
        rand = Math.random();
        specialcharsopen = "ASTERISKSTRONG" + rand;
        syntaxmap.push({str: "**", chars: specialcharsopen});
        //repl = "<strong>$2</strong>";
        //html = html.replace(strong, repl);
        repl = "<strong>" + specialcharsopen + "$2" + specialcharsopen + "</strong>";
        editorhtml = editorhtml.replace(strong, repl);

        // Em
        // *word* or _word_
        var em = /(\b_)((?:__|[\s\S])+?)(_\b)/g;
        rand = Math.random();
        specialcharsopen = "UNDERSCOREITALICS" + rand;
        syntaxmap.push({str: "_", chars: specialcharsopen});
        //repl = "<em>$2</em>";
        //html = html.replace(em, repl);
        repl = "<em>" + specialcharsopen + "$2" + specialcharsopen + "</em>";
        editorhtml = editorhtml.replace(em, repl);
        // Asterisk em
        em = /(\*)((?:\*\*|[\s\S])+?)(\*(?!\*))/g;
        rand = Math.random();
        specialcharsopen = "ASTERISKITALICS" + rand;
        syntaxmap.push({str: "*", chars: specialcharsopen});
        //repl = "<em>$2</em>";
        //html = html.replace(em, repl);
        repl = "<em>" + specialcharsopen + "$2" + specialcharsopen + "</em>";
        editorhtml = editorhtml.replace(em, repl);

        // Code
        // `code` or ``code with backtick (`) in it``
        var code = /(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/g;
        editorhtml = editorhtml.replace(code, "<code>$&</code>");

        // Links
        // [value](href "title")
        var link = /!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\(\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*\)/g;
        editorhtml = editorhtml.replace(link, function (match, text, href) {
            syntaxmap.forEach(function (el) {
                href = href.split(el.chars).join(el.str.substr(1));
                // substr(1) cuts the escape char.
            });
            return "<a href='" + href + "'>" + match + "</a>";
        });

        // Images
        // ![Alt Text](imgSrc "title idk")

        // Loop through syntaxmap and replace specialchars with appropriate.
        syntaxmap.forEach(function (el) {
            editorhtml = editorhtml.split(el.chars).join(el.str);
        });

        // Done.
        return {html: html, editorhtml: editorhtml};
    };

    /*
     * For showing the formatting as the user types
     * without replacing the formatting syntax (!!).
     */
    Markdown.prototype.toEditorHTML = function (value) {
        return this.inlineParse(value).editorhtml;
    };

    /*
     * For exporting the text to .html file type
     */
    Markdown.prototype.toHTML = function (value) {
        return this.inlineParse(value).html;
    };

    return Markdown;
});
