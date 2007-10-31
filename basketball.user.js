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

revision
2006-Nov-05: don't rely on hard coded offset to find boxscore link

*/

(function () {
    if (!location.href.match(/^http\:\/\/basketball\.fantasysports\.yahoo\.com\/nba\/\d+\/(team\?mid=)?\d+.*/i)) {
        return;
    }

    const HIDDEN_DIV_ID = 'robobruinDiv';
    const MODAL_DIV_ID = 'robobruinModal';
    const STAT_BODY_ID = 'robobruinTableBody';
    const BUTTON_LABEL   = 'Show Freebie Stats!';

    const STAT_BUTTON_ID = 'robobruinStatBtn';
//
//    function Baller() {
//        this._playerId = '';
//        this._name     = '';
//        this._displayName = '';
//        this._position = '';
//        this._min = 0;
//        this._fga = 0;
//        this._fgm = 0;
//        this._tpa = 0;
//        this._tpm = 0;
//        this._fta = 0;
//        this._ftm = 0;
//        this._oreb = 0;
//        this._reb = 0;
//        this._assists = 0;
//        this._to = 0;
//        this._steals = 0;
//        this._blk = 0;
//        this._pf = 0;
//        this._pts = 0;
//    }
//    Baller.prototype.isOnBench   = function ()    {return (this._position == 'BN' || this._position == 'DL');}
//
//    var TotalBaller = new Baller();



    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    function getDocument(url, playerId, position) {
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
                s = s.replace(/^.*<style.*<\/style>/gi, ' ');
                s = s.replace(/^.*<body[^>]*>(.*)<\/body>.*$/gi, "$1");
                var row = processBoxscore(s, playerId);
                printStats(row, position);
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

        if (!i) {
            return null;
        } else {
            var node = nodes.snapshotItem(i - 1).parentNode.parentNode.cloneNode(true);
            return node;
        }
    }

    function printStats(row, position) {
        var statBody = document.getElementById(STAT_BODY_ID);
        if (!statBody) {
            statBody = addModalOverlay();
            addShowStatsButton();
        }

        if (row) {
            var tr = document.createElement("tr").appendChild(row);
            var className = (statBody.childNodes.length % 2 == 0) ? 'odd' : 'even';
            tr.className = className;
            if (position == 'BN') {
                tr.className = 'bench';
            }
            statBody.appendChild(tr);
        }
    }

    function addModalOverlay() {
        if (document.getElementById(MODAL_DIV_ID)) {
            document.body.removeChild(document.getElementById(MODAL_DIV_ID));
        }

        var div = document.createElement("div");
        document.body.appendChild(div);
        div.id = MODAL_DIV_ID;

        div.innerHTML =
        '<div><table id="roboTable" width="100%">' +
            '<thead><tr><td width="18%" height="18" align="left">&nbsp;Name</td><td width="6%">Min</td><td width="8%">FG</td><td width="8%">3Pt</td><td width="8%">FT</td><td width="8%">Off</td><td width="6%">Reb</td><td width="6%">Ast</td><td width="6%">TO</td><td width="6%">Stl</td><td width="6%">Blk</td><td width="6%">PF</td><td width="8%">Pts&nbsp;</td></tr></thead>' +
            '<tbody id="'+ STAT_BODY_ID+'">' +
            '</tbody>' +
        '</table></div>';

        GM_addStyle('#' + MODAL_DIV_ID + " {position: absolute;left: 0px;top: 0px;width:100%;height:100%;text-align:center;z-index: 200;background: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%002%00%00%002%01%03%00%00%00%24%F1%1A%F2%00%00%00%06PLTE%9D%BF%C4%FF%FF%FFo%99%7C%D4%00%00%00%02tRNS%FF%00%E5%B70J%00%00%00%01bKGD%01%FF%02-%DE%00%00%00%09pHYs%00%00%00H%00%00%00H%00F%C9k%3E%00%00%00yIDATx%01%05%C1%01%01%00%00%08%02%20%1C%D9I%07u%A2%13A%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A%F6%01%90%ADD%F3%BDe%02%17%00%00%00%00IEND%AEB%60%82\");}");
        GM_addStyle('#' + MODAL_DIV_ID + ' div {width:700px;margin: 100px auto;background-color:#fff;border:1px solid #000;padding:15px;text-align:center;z-index:201;}');
        GM_addStyle('#roboTable {padding:3px;border-collapse:collapse;border: 1px solid #000;} tr.even {background-color:#f1f2ed;} thead tr {background-color:#ABAB9E;border-bottom:1px solid #000;} td {text-align:center;} tr.bench {background-color: #666;}');
        addCloseAndRefresh();
        return document.getElementById(STAT_BODY_ID);
    }

        /**
     Add a close link and refresh to the modal
     */
    function addCloseAndRefresh() {
        var div = document.getElementById(MODAL_DIV_ID).childNodes[0];

        var close = document.createElement("a");
        close.id ="roboClose";
        close.href = "#";
        close.innerHTML = "[close]";
        div.appendChild(close);
        close.addEventListener('click', function(e) { removeOverlay(); }, false);

        var refresh = document.createElement("a");
        refresh.id = "roboRefresh";
        refresh.href = "#";
        refresh.innerHTML = "[refresh]";
        refresh.addEventListener('click', function(e) { removeOverlay(); getStats();},false);
        div.appendChild(refresh);
        GM_addStyle('#roboRefresh {padding-left:10px;}');
    }

    function processFantasyHome(nodes) {
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var userIdNode = nodes.snapshotItem(i);
            var playerId = userIdNode.getAttribute('href');
            playerId = playerId.replace(/[^0-9]/g, '');

            var row = userIdNode.parentNode.parentNode.parentNode;
            var position = row.childNodes[0].innerHTML;

            //iterate columns to find the boxscore column
            //start at 1 since we know 0 is BN or position
            for(var j=1; j < row.childNodes.length; j++) {
                var column = row.childNodes[j];
                if (column.className && column.className == 'gametime') {
                    if (column.childNodes.length && column.childNodes[0].nodeName == 'A') {
                        var boxscoreLink = column.childNodes[0].getAttribute("href");
                        boxscoreLink = new String(boxscoreLink).replace('recap', 'boxscore');
                        column.childNodes[0].setAttribute("href", boxscoreLink);
                        getDocument(boxscoreLink, playerId, position);
                    }
                    break;
                }
            }
        }
    }

    /**
     Remove modal window overlay
     */
    function removeOverlay() {
        if (document.getElementById(MODAL_DIV_ID)) {
            document.body.removeChild(document.getElementById(MODAL_DIV_ID));
        }
    }

    function addShowStatsButton() {
        if (document.getElementById(STAT_BUTTON_ID)) {
            return;
        }
        var nodes = xpath(document, "//a[contains(@href,'stattracker')]");

        if (nodes.snapshotItem(0)) {
            var a = nodes.snapshotItem(0);
            a.href = '#';
            a.target = null;
            a.innerHTML = BUTTON_LABEL;
            a.id = STAT_BUTTON_ID;
            a.addEventListener('click', function(e) {getStats(); return false;},false);
        }
        else {
            //left this here just in case stattracker button disappears
            var button = document.createElement("button");
            document.body.appendChild(button);
            button.id = STAT_BUTTON_ID;
            button.innerHTML = BUTTON_LABEL;
            button.addEventListener('click', function(e) {getStats();}, false);
            GM_addStyle('#' + STAT_BUTTON_ID + '{position:fixed;top:80px;right:80px;z-index:200;background-color:#0781C8;color:#fff;}');
        }
    }

    function getStats() {
        var nodes = xpath(document, "//table[@id='statTable0']/tbody/tr/td[@class='player']/div/a[@class='name' and @href]");
        processFantasyHome(nodes);
    }
    addShowStatsButton();
})();