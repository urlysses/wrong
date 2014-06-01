/*jslint node: true, browser: true, devel:true, white: false*/
/*global define*/
// Markdown Parser
// Influenced by chjj's marked.
define([], function () {
    function Markdown() {
        this.HTML = "";
    }

    /*
     * Parses the plaintext and returns an array of
     * style & content information.
     */
    Markdown.prototype.parse = function (value, parsed) {
        // HTML-escape "<" so it doesn't fall into innerHTML.
        value = value.replace(/</gm, "&lt;");
        if (!parsed) {
            parsed = [];
        }
        var tmp = value,
            match,
            syntax,
            pos,
            repl,
            isParagraph = true;
        // automatically escape special characters (excluding html tags)?

        // Headings.
        // # to ###### (h1 to h6), only at start of line.
        var heading = /^ *(#{1,6}) *([^\n]+?) *#*(?:\n|$)/;
        match = tmp.match(heading);
        if (match) {
            if (match[1]) {
                // This regex swallows a new line at end of line so append one in syntax
                syntax = "<h" + match[1].length + ">%</h" + match[1].length + ">\n";
                value = match[2];
                pos = tmp.search(heading);
                repl = syntax.split("%")[0] + value + syntax.split("%")[1];
                tmp = tmp.replace(heading, repl);
                // Set syntax back to # for the editorParser
                syntax = match[1];
                value = match[0].substr(syntax.length);
                parsed.push({type: "heading", tag: "h" + syntax.length,
                    syntax: syntax, value: value, nl: "\n"});
                isParagraph = false;
            }
        }

        // Blockquotes. Screw them for now?
        // >\space or >\space>\space (for nested elements).

        // Code Blocks (screw them, mainly).

        // Horizontal rules.
        // Three or more hyphens, underscores, or asterisks.
        // Don't do anything stylistically with it in toEditorHTML. 
        var hr = /^( *[\-*_]){3,} *(?:\n+|$)/;
        match = tmp.match(hr);
        if (match) {
            syntax = "";
            value = match[0];
            pos = tmp.search(hr);
            repl = "<hr>\n";
            tmp = tmp.replace(hr, repl);
            parsed.push({type: "hr", tag: "hr", syntax: syntax, value: value, nl: "\n"});
            isParagraph = false;
        }

        // Lists
        // // Unordered lists: *\space, +\space, -\space
        // // Ordered lists: [0-9]\.\space.
        var list = /^( *)((?:[*+\-]|\d+\.)) [\s\S]+?(?:\n+(?=\1?(?:[\-*_] *){3,}(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+\-]|\d+\.) )\n*|\s*$)/;
        match = tmp.match(list);
        if (match) {
            syntax = match[2];
            value = match[0].substr(syntax.length);
            var listType = /[*+\-]/.test(syntax) ? "ul" : "ol";
            var items = /^( *)((?:[*+\-]|\d+\.)) [^\n]*(?:\n(?!\1(?:[*+\-]|\d+\.) )[^\n]*)*/gm;
            items = match[0].match(items);
            var tmpInner = "";
            var valueInner = [];
            items.forEach(function (el) {
                var val = el.substr(el.indexOf(" "));
                tmpInner += "<li>" + el.substr(1) + "</li>";
                // TODO: nested lists?
                // the type should be "li list" if nested.
                valueInner.push({type: "li", tag: "li",
                    syntax: el.substr(0, el.indexOf(" ")), value: val});
            });
            pos = tmp.search(list);
            repl = "<" + listType + ">" + tmpInner + "</" + listType + ">";
            tmp = tmp.replace(list, repl);
            // Value is an array containing all li elements.
            parsed.push({type: "list", tag: listType, syntax: syntax, value: valueInner, nl: "\n"});
            isParagraph = false;
        }

        // Paragraphs
        var paragraph = /^((?:[^\n]+\n?(?!hr|heading))+)\n*/;
        if (isParagraph) {
            match = tmp.match(paragraph);
            if (match) {
                syntax = "";
                value = match[0];
                pos = tmp.search(paragraph);
                repl = "<p>" + value + "</p>\n";
                tmp = tmp.replace(paragraph, repl);
                parsed.push({type: "paragraph", tag: "p", syntax: syntax, value: value, nl: "\n"});
            }
        }

        // We want to loop through the text recursively until
        // there isn't any text left to parse.
        if (repl) {
            var next = tmp.substr(pos + repl.length);
            if (next.length > 0) {
                return this.parse(next, parsed);
            }
        }

        // Done
        return parsed;
    };

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
            isParagraph = true,
            md = this;

        // Headings.
        // # to ###### (h1 to h6), only at start of line.
        var heading = /^ *(#{1,6}) *([^\n]+?) *(#*)(?:\n|$)/gm;
        match = html.match(heading);
        if (match) {
            html = html.replace(heading, function (_match, p1, p2) {
                return "<h" + p1.length + ">" + md.inlineParse(p2).html +
                    "</h" + p1.length + ">";
            });
            editorhtml = editorhtml.replace(heading, function (match, p1, p2, p3) {
                return "<h" + p1.length + ">" + md.inlineParse(match).editorhtml +
                    "</h" + p1.length + ">";
            });
            isParagraph = false;
        }
        // Horizontal rules.
        // Three or more hyphens, underscores, or asterisks.
        // Don't do anything stylistically with it in toEditorHTML. 
        var hr = /^( *[\-*_]){3,} *(?:\n+|$)/gm;
        match = html.match(hr);
        if (match) {
            html = html.replace(hr, "<hr>\n");
            isParagraph = false;
        }

        var paragraph = /^((?:[^\n]+\n?)+)\n*/gm;
        if (isParagraph) {
            match = html.match(paragraph);
            if (match) {
                html = html.replace(paragraph,
                    function (_match, p1) {
                        return "<p>" + md.inlineParse(p1).html + "</p>";
                    });
                editorhtml = editorhtml.replace(paragraph,
                    function (match, p1) {
                        return "<p>" + md.inlineParse(match).editorhtml + "</p>";
                    });
            }
        }

        return {html: html, editorhtml: editorhtml};
    };
    /*
     * Inline styling (anything that fits within a larger block)
     */
    Markdown.prototype.inlineParse = function (value) {
        // HTML-escape "<" so it doesn't fall into innerHTML.
        value = value.replace(/</gm, "&lt;");
        var html = value,
            editorhtml = value,
            match,
            rand,
            repl,
            specialcharsopen,
            specialcharsclose,
            syntaxmap = [];

        // Custom: inline comments
        // [(inline comment)] (also <!--html comments-->?)
        var comment = /(\[\()([\s\S]*?)(\)\])/;
        match = html.match(comment);
        if (match) {
            rand = Math.random();
            specialcharsopen = "OPENBRACKET\u0186O\u019C\u019C\u018F\u019DT" + rand;
            specialcharsclose = "CLOSEBRACKET\u0186O\u019C\u019C\u018F\u019DT" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            syntaxmap.push({str: match[3], chars: specialcharsclose});
            value = match[2];
            comment = new RegExp(comment.source, "g");
            repl = "<i>$2</i>";
            html = html.replace(comment, repl);
            repl = "<i>" + specialcharsopen + "$2" + specialcharsclose + "</i>";
            editorhtml = editorhtml.replace(comment, repl);
        }
        // html-style comments 
        comment = /(&lt;\!\-\-)([\s\S]*?)(\-\->)/;
        match = html.match(comment);
        if (match) {
            rand = Math.random();
            specialcharsopen = "HTMLOPEN\u0186O\u019C\u019C\u018F\u019DT" + rand;
            specialcharsclose = "HTMLCLOSE\u0186O\u019C\u019C\u018F\u019DT" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            syntaxmap.push({str: match[3], chars: specialcharsclose});
            value = match[2];
            comment = new RegExp(comment.source, "g");
            repl = "<i>$2</i>";
            html = html.replace(comment, repl);
            repl = "<i>" + specialcharsopen + "$2" + specialcharsclose + "</i>";
            editorhtml = editorhtml.replace(comment, repl);
        }

        // Strong
        // **word** or __word__
        var strong = /(__)([\s\S]+?)(__(?!_))/;
        match = html.match(strong);
        if (match) {
            rand = Math.random();
            specialcharsopen = "UNDERSCORE\u01A7\u01AC\u01A6\u0298N\u0262" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            value = match[2];
            strong = new RegExp(strong.source, "g");
            repl = "<strong>$2</strong>";
            html = html.replace(strong, repl);
            repl = "<strong>" + specialcharsopen + "$2" + specialcharsopen + "</strong>";
            editorhtml = editorhtml.replace(strong, repl);
        }
        // Asterisk strong
        strong = /(\*\*)([\s\S]+?)(\*\*(?!\*))/;
        match = html.match(strong);
        if (match) {
            rand = Math.random();
            specialcharsopen = "ASTERISK\u01A7\u01AC\u01A6\u0298N\u0262" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            value = match[2];
            strong = new RegExp(strong.source, "g");
            repl = "<strong>$2</strong>";
            html = html.replace(strong, repl);
            repl = "<strong>" + specialcharsopen + "$2" + specialcharsopen + "</strong>";
            editorhtml = editorhtml.replace(strong, repl);
        }

        // Em
        // *word* or _word_
        var em = /(\b_)((?:__|[\s\S])+?)(_\b)/;
        match = html.match(em);
        if (match) {
            rand = Math.random();
            specialcharsopen = "UNDERSCOREI\u023E\u023A\u023DI\u023B" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            value = match[2];
            em = new RegExp(em.source, "g");
            repl = "<em>$2</em>";
            html = html.replace(em, repl);
            repl = "<em>" + specialcharsopen + "$2" + specialcharsopen + "</em>";
            editorhtml = editorhtml.replace(em, repl);
        }
        em = /(\*)((?:\*\*|[\s\S])+?)(\*(?!\*))/;
        match = html.match(em);
        if (match) {
            rand = Math.random();
            specialcharsopen = "ASTERISKI\u023E\u023A\u023DI\u023B" + rand;
            syntaxmap.push({str: match[1], chars: specialcharsopen});
            value = match[2];
            em = new RegExp(em.source, "g");
            repl = "<em>$2</em>";
            html = html.replace(em, repl);
            repl = "<em>" + specialcharsopen + "$2" + specialcharsopen + "</em>";
            editorhtml = editorhtml.replace(em, repl);
        }

        // Code
        // `code` or ``code with backtick (`) in it``

        // Links
        // [value](href "title")

        // Reference links?
        // [value][id#] then at bottom of text [id#]: href "title"

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
        /* var parsed = this.parse(value);
        var html = "";
        var md = this;
        parsed.forEach(function (el, index, array) {
            var type = el.type, tag = el.tag, syntax = el.syntax, value = el.value,
                nl = el.nl, i, inlineparsed, inlinevalue, inline;
            if (type !== "hr") {
                if (type === "list") {
                    var val = "";
                    for (i = 0; i < value.length; i++) {
                        var li = value[i];
                        inlinevalue = "";
                        // Parse li.value for inline text.
                        inlineparsed = md.inlineParse(li.value);
                        inlinevalue = inlineparsed.editorhtml;
                        val += "<" + li.tag + ">" + li.syntax +
                            inlinevalue + "</" + li.tag + ">";
                    }
                    value = val;
                    syntax = "";
                } else {
                    inlineparsed = md.inlineParse(value);
                    value = inlineparsed.editorhtml;
                }

                // Don't add <p> tags if is paragraph.
                if (type === "paragraph") {
                    value = syntax + value;
                } else {
                    value = "<" + tag + ">" + syntax + value + "</" + tag + ">" + nl;
                }
                html += value;
            } else {
                html += value;
            }
        });
        // Note: do not include paragraph formatting (no <p> tags)?
        return html;*/
        return this.blockParse(value).editorhtml;
    };

    /*
     * For exporting the text to .html file type
     */
    Markdown.prototype.toHTML = function (value) {
        var parsed = this.parse(value);
        var html;
        return html;
    };
    return Markdown;
});
