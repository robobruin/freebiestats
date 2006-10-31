// ==UserScript==
// @name            Yahoo Fantasy Basketball
// @namespace       http://robobruin.com/greasemonkey/fantasysports
// @description     Live basketball fantasy scoring
// @include         http://basketball.fantasysports.yahoo.com/*
//
// ==/UserScript==

/*
This script is released under Mozilla Public License 1.1, http://www.mozilla.org/MPL/
The purpose is to provide live scoring updates for your default yahoo fantasy baseball team.

For code enhancements or feature requests, visit:
http://code.google.com/p/freebiestats/issues/list

*--!Important!--*
The script is set to run on all urls that match
http://basketball.fantasysports.yahoo.com/*
So if you're not on you daily stats page, disable it by right-clicking
on the monkey in the lower right and unchecking the script.

credits:-
http://gabrito.com/files/subModal/
http://www.sitening.com/blog/2006/03/29/create-a-modal-dialog-using-css-and-javascript/

*/

(function () {

    var HIDDEN_DIV_ID = 'robobruinDiv';
    var MODAL_DIV_ID = 'robobruinModal';
    var STAT_BODY_ID = 'robobruinTableBody';

    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    function getDocument(url, playerId) {
        GM_xmlhttpRequest({
            method:"GET",
            url:url,
            headers:{
                "User-Agent":"monkeyagent",
                "Accept":"text/monkey,text/xml"
            },
            onload:function(details) {
                var s = new String(details.responseText);
                s = s.replace(/\n/g, ' ');
                s = s.replace(/^.*<body[^>]*>(.*)<\/body>.*$/gi, "$1");

                var stats = processBoxscore(s, playerId);
                printStats(stats);
            }
        });
    }

    function processBoxscore(html, playerId) {
        var div = document.getElementById(HIDDEN_DIV_ID);
        if (!div) {
            div = document.createElement("div");
            document.body.appendChild(div);
            div.id = HIDDEN_DIV_ID;
            div.style.display = 'none';
        }

        div.innerHTML = html;
        var nodes = xpath(document, "//tr[contains(@class,'ysprow')]/td/a[contains(@href,'" + playerId + "')]");
        var i = nodes.snapshotLength;

        var stats = null;

        if (!i) {
            return stats;
        } else {
            stats = new Object();
            var boxScoreStatColumn = nodes.snapshotItem(i - 1).parentNode.parentNode.childNodes;
            var playerName = nodes.snapshotItem(i - 1).text.replace('.', '');

            stats.HPAB = boxScoreStatColumn[7].innerHTML + '/' + boxScoreStatColumn[3].innerHTML;
            stats.R = boxScoreStatColumn[5].innerHTML;
            stats.RBI = boxScoreStatColumn[9].innerHTML;

            return stats;
        }
    }

    function printStats(stats) {
        var statBody = document.getElementById(STAT_BODY_ID);
        if (!statBody) {
            statBody = addModalOverlay();
        }

        var tr = null;
        if (stats) {
            tr = document.createElement("tr").appendChild(document.createElement("td").appendChild(document.createTextNode(stats.name)));
        }

        if (tr) {
            statBody.appendChild(tr);
        }
    }

    function showOverlay() {
        var div = document.getElementById(MODAL_DIV_ID);
        div.style.visibility = (div.style.visibility == "visible") ? "hidden" : "visible";
    }

    function addModalOverlay() {
        addListenerStatTracker();
        var div = document.createElement("div");
        document.body.appendChild(div);
        div.id = MODAL_DIV_ID;

        div.innerHTML =
        '<div><table>' +
            '<tbody id="'+ STAT_BODY_ID+'">' +
            '</tbody>' +
        '</table><a id="roboClose" href="#">close</a></div>';

        addGlobalStyle('#' + MODAL_DIV_ID + " {visibility: hidden;position: absolute;left: 0px;top: 0px;width:100%;height:100%;text-align:center;z-index: 200;background: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%002%00%00%002%01%03%00%00%00%24%F1%1A%F2%00%00%00%06PLTE%9D%BF%C4%FF%FF%FFo%99%7C%D4%00%00%00%02tRNS%FF%00%E5%B70J%00%00%00%01bKGD%01%FF%02-%DE%00%00%00%09pHYs%00%00%00H%00%00%00H%00F%C9k%3E%00%00%00yIDATx%01%05%C1%01%01%00%00%08%02%20%1C%D9I%07u%A2%13A%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A%F6%01%90%ADD%F3%BDe%02%17%00%00%00%00IEND%AEB%60%82\");}");
        addGlobalStyle('#' + MODAL_DIV_ID + ' div {width:700px;margin: 100px auto;background-color:#fff;border:1px solid #000;padding:15px;text-align:center;z-index:201;}');
        showOverlay();

        var close = document.getElementById('roboClose');
        close.addEventListener('click',
                           function(e) { showOverlay(); },
                           false);
        centerPopWin();
        return document.getElementById(STAT_BODY_ID);
    }

    function addListenerStatTracker() {
        var nodes = xpath(document, "//a[contains(@target, 'stattracker')]");
        if (nodes.snapshotLength) {
            var a = nodes.snapshotItem(0);
            a.innerHTML = 'Launch FreebieStats!';
            a.eventListener=null;
            a.addEventListener('click',
                           function(e) { showOverlay();return false; },
                           false);
        }
    }

    function addGlobalStyle(css) {
        var style = document.createElement("style");
	    style.type = "text/css";
        style.innerHTML = css;
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    /*
    function processFantasyHome(nodes) {
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var userIdNode = nodes.snapshotItem(i);
            var playerId = userIdNode.getAttribute('href');
            playerId = playerId.replace(/[^0-9]/g, '');

            var statColumn = userIdNode.parentNode.parentNode.parentNode.childNodes;
            var offset = (statColumn.length == 22) ? 1 : 0;

            if (statColumn[(6 + offset * 2)].childNodes[0].nodeName == 'A') {
                var boxscoreLink = statColumn[(6 + offset * 2)].childNodes[0].getAttribute("href");
                boxscoreLink = new String(boxscoreLink).replace('recap', 'boxscore');
                statColumn[(6 + offset * 2)].childNodes[0].setAttribute("href", boxscoreLink);

                getDocument(boxscoreLink, playerId);
            }
        }
    }
    */
    function getViewportHeight() {
        if (window.innerHeight!=window.undefined) return window.innerHeight;
        if (document.compatMode=='CSS1Compat') return document.documentElement.clientHeight;
        if (document.body) return document.body.clientHeight;
        return window.undefined;
    }

    function getViewportWidth() {
        if (window.innerWidth!=window.undefined) return window.innerWidth;
        if (document.compatMode=='CSS1Compat') return document.documentElement.clientWidth;
        if (document.body) return document.body.clientWidth;
        return window.undefined;
    }

    function centerPopWin() {
        var popMask = document.getElementById(MODAL_DIV_ID);

        var width = popMask.offsetWidth;
        var height = popMask.offsetHeight;

        var fullHeight = getViewportHeight();
        var fullWidth = getViewportWidth();
        var scLeft,scTop;
        if (self.pageYOffset) {
            scLeft = self.pageXOffset;
            scTop = self.pageYOffset;
        } else if (document.documentElement && document.documentElement.scrollTop) {
            scLeft = document.documentElement.scrollLeft;
            scTop = document.documentElement.scrollTop;
        } else if (document.body) {
            scLeft = document.body.scrollLeft;
            scTop = document.body.scrollTop;
        }

        popMask.style.height = fullHeight + "px";
        popMask.style.width = fullWidth + "px";
        popMask.style.top = scTop + "px";
        popMask.style.left = scLeft + "px";

        //check that user's screen is big enough for auto centering...
        if (fullHeight > height) {
            popMask.style.top = (scTop + ((fullHeight - height) / 2)) + "px";
        }
        if (fullWidth > width) {
            popMask.style.left =  (scLeft + ((fullWidth - width) / 2)) + "px";
        }
    }

    function addEvent(obj, evType, fn) {
        if (obj.addEventListener) {
            obj.addEventListener(evType, fn, false);
            return true;
        } else if (obj.attachEvent) {
            var r = obj.attachEvent("on" + evType, fn);
            return r;
        } else {
            return false;
        }
    }

    addEvent(window, "resize", centerPopWin);
    addEvent(window, "scroll", centerPopWin);

    var nodes = xpath(document, "//table[@id='statTable0']/tbody/tr/td[@class='player']/div/a[@href]");
    processFantasyHome(nodes);

    function processFantasyHome(nodes) {
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var userIdNode = nodes.snapshotItem(i);
            var playerId = userIdNode.getAttribute('href');
            playerId = playerId.replace(/[^0-9]/g, '');

            var playerName = userIdNode.text;
            var stats = new Object();
            stats.name = playerName;
            stats.id = playerId;

            printStats(stats);
        }
    }

})();