// ==UserScript==
// @name            Yahoo Fantasy Baseball
// @namespace       http://robobruin.com/greasemonkey/fantasysports
// @description     Live baseball fantasy scoring
// @include         http://baseball.fantasysports.yahoo.com/*
//
/*
This script is released under Mozilla Public License 1.1, http://www.mozilla.org/MPL/
The purpose is to provide live scoring updates for your default yahoo fantasy baseball team.

For code enhancements, feature requests, or to report bugs, visit:
http://code.google.com/p/freebiestats/issues/list

Why does baseball rock? http://robobruin.blogspot.com/2007/02/fresh-start.html

credits for modal dialog inspiration:
http://gabrito.com/files/subModal/
http://www.sitening.com/blog/2006/03/29/create-a-modal-dialog-using-css-and-javascript/
*/

(function () {
    if (!location.href.match(/^http\:\/\/baseball\.fantasysports\.yahoo\.com\/b\d\/\d+\/\d+.*/i)) {
        return;
    }
    //Globals
    var HIDDEN_DIV_ID = 'robobruinDiv';
    var MODAL_DIV_ID = 'robobruinModal';
    var STAT_BODY_ID = 'robobruinTableBody';
    var BATTER = 'batter';
    var PITCHER = 'pitcher';

    function Player() {
        this._playerId = '';
        this._name = '';
        this._displayName = '';
        this._position = '';
        this._order = '';
        this._h = '';
        this._isBatter = null;
    }
    Player.prototype.playerId = function (arg) {if (arguments.length) this._playerId = arg; else return this._playerId;}
    Player.prototype.name = function (arg) {if (arguments.length) this._name = arg; else return this._name;}
    Player.prototype.displayName = function (arg) {if (arguments.length) this._displayName = arg; else return this._displayName;}
    Player.prototype.position = function (arg) {if (arguments.length) this._position = arg; else return this._position};
    Player.prototype.order = function (arg) {if (arguments.length) this._order = arg; else return this._order};
    Player.prototype.h = function (arg) {if (arguments.length) this._h = arg; else return this._h;}
    Player.prototype.isBatter = function () {return this._isBatter;}

    function Batter() {
        this._ab = '';
        this._r = '';
        this._hr = '';
        this._rbi = '';
        this._sb = '';
        this._isBatter = true;
    }
    Batter.prototype = new Player();
    Batter.prototype.ab = function (arg) {if (arguments.length) this._ab = arg; else return this._ab;}
    Batter.prototype.hab = function (arg) {return this._h + '/' + this._ab;}
    Batter.prototype.r = function (arg) {if (arguments.length) this._r = arg; else return this._r;}
    Batter.prototype.hr = function (arg) {if (arguments.length) this._hr = arg; else return this._hr;}
    Batter.prototype.rbi = function (arg) {if (arguments.length) this._rbi= arg; else return this._rbi;}
    Batter.prototype.sb = function (arg) {if (arguments.length) this._sb = arg; else return this._sb}
    Batter.prototype.avg = function () {
        if (this._ab != '' && this._ab != 0) {
            var avg = (this._h / this._ab).toFixed(3);
            avg = (new String(avg).charAt(0) != '1') ? (avg.substring(1, avg.length)) : avg;
            return avg;
        } else return '-';
    }

    function Pitcher() {
        this._displayIP = '';
        this._ip = 0;
        this._er = '';
        this._w = '';
        this._l = '';
        this._s = '';
        this._k = '';
        this._bb = '';
        this._isBatter = false;
    }

    Pitcher.prototype = new Player();
    Pitcher.prototype.ip = function (arg) {if (arguments.length) this._displayIP = arg; else return this._displayIP;}
    Pitcher.prototype.er = function (arg) {if (arguments.length) this._er = arg; else return this._er;}
    Pitcher.prototype.w = function (arg) {if (arguments.length) this._w = arg; else return this._w;}
    Pitcher.prototype.l = function (arg) {if (arguments.length) this._l = arg; else return this._l;}
    Pitcher.prototype.s = function (arg) {if (arguments.length) this._s = arg; else return this._s;}
    Pitcher.prototype.k = function (arg) {if (arguments.length) this._k = arg; else return this._k;}
    Pitcher.prototype.bb = function (arg) {if (arguments.length) this._bb = arg; else return this._bb;}
    Pitcher.prototype.realIP = function () {
        if (this._ip != 0) {return this._ip;}
        if (this._displayIP != '-' && this._displayIP != '0') {
            var partialIP = ((this._displayIP * 10) % 10);
            var ip = (partialIP / 3) + parseInt(this._displayIP);
            this._ip = ip;
            return ip;
        }
        return 0;
    }
    Pitcher.prototype.era = function () {
        var ip = this.realIP();
        if (ip != 0) {
            var era = this._er * 9 / ip;
            return era.toFixed(2);
        } else
            return '-';
    }
    Pitcher.prototype.whip = function () {
        var ip = this.realIP();
        if (ip != 0) {
            var whip = (parseInt(this._bb) + parseInt(this._h)) / ip;
            GM_log(whip);
            return whip.toFixed(2);
        } else
            return '-';
    }

    /**
     Find all nodes matching an xpath expression
     @doc document
     @xpath xpath expression

     @return in-order resulting nodes
     */
    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    /**
     Wrap greasemonkey's ajax request
     @url                page to request
     @player             batter or pitcher object

     @return no return value
     */
    function getDocument(url, player) {
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
                var document = appendToDocument(s);
                addStatRow(document, player);
            }
        });
    }

    /**
     Add hidden content to the DOM so we can run xpath on it
     @html the raw html that will be part of the DOM

     @return current document
     */
    function appendToDocument(html) {
        var div = document.getElementById(HIDDEN_DIV_ID);
        if (!div) {
            div = document.createElement("div");
            document.body.appendChild(div);
            div.id = HIDDEN_DIV_ID;
            div.style.display = 'none';
        }
        div.innerHTML = html;
        return document;
    }

    /**
     Find a player's stat row from the boxscore based on their playerId.
     We can use playerId since their name is hyperlinked and that contains the playerId.
     Return the last match to insure we don't get a pitcher's batting stats.
     @document document to parse
     @player batter or pitcher object

     @return null if no matches, or the last node that matched.
     */
    function processBoxscore(document, player) {
        var nodes = xpath(document, "//tr[contains(@class,'ysprow')]/td/a[contains(@href,'" + player.playerId() + "')]");
        var i = nodes.snapshotLength;

        if (!i) {
            return null;
        } else {
            var node = nodes.snapshotItem(i - 1).parentNode.parentNode.cloneNode(true);
            return node;
        }
    }

    /**
     HR and SB stats appear at the bottom of the boxscore table.
     We need to do a string match on the player since the playerId does not appear.
     @type SB or HR
     @playerName name of player
     @document document to parse

     @return number of HR or SB
     */
    function getHRorSB(type, playerName, document) {
        var nodes = xpath(document, "//td[@class='yspscores' and contains(.,'" + type + "') and contains(.,'" + playerName + "')]");
        var j = nodes.snapshotLength;
        var numStat = 0;

        if (j) {
            var statLine = nodes.snapshotItem(j - 1).textContent;
            //Remove everything in parentheses since that may create false matches
            statLine = statLine.replace(/\([^\)].+?\)/gi,'');
            if (statLine.indexOf(playerName) > -1) {
                var re = new RegExp(".*(" + playerName + " *\\d?).+", 'gi');
                statLine = statLine.replace(re, "$1");
                statLine = statLine.replace(/[^\d]+/, '');
                numStat = (statLine == '') ? 1 : statLine;
            }
        }
        return numStat;
    }

    /**
     Calculates and appends a player's stats to the resulting table.
     @document current document
     @player batter or pitcher object

     @return no return value
     */
    function addStatRow(document, player) {
        var row = processBoxscore(document, player);

        if (row) {
            var pitcherOrBatter = (player.isBatter() ? BATTER : PITCHER);
            var tableId = STAT_BODY_ID + pitcherOrBatter;
            var statBody = document.getElementById(tableId);

            if (!statBody) {
                statBody = setUpTable(tableId, pitcherOrBatter);
            }

            var columns = row.getElementsByTagName("TD");
            var statNames;

            if (player.isBatter()) {
                var hitter = columns[0].childNodes[1].text.replace(/(.).+ (.+)/,"$1 $2");
                player.name(hitter);
                player.displayName(columns[0].innerHTML);
                player.h(columns[3].innerHTML);
                player.ab(columns[1].innerHTML);
                player.r(columns[2].innerHTML);
                player.rbi(columns[4].innerHTML);
                player.sb(getHRorSB('SB', hitter, document));
                player.hr(getHRorSB('HR', hitter, document));

                statNames = new Array('displayName','hab','r','hr','rbi','sb','avg');
            } else {
                var pitcherName = columns[0].innerHTML;
                player.displayName(pitcherName);
                player.ip(columns[1].innerHTML);
                player.h(columns[2].innerHTML);
                player.er(columns[4].innerHTML);
                player.bb(columns[5].innerHTML);
                player.k(columns[6].innerHTML);

                player.w((pitcherName.indexOf("(W") > -1) ? '1' : '0');
                player.l((pitcherName.indexOf("(L") > -1) ? '1' : '0');
                player.s((pitcherName.indexOf("(S") > -1) ? '1' : '0');

                statNames = new Array('displayName','ip','w','s','k','era','whip');
            }

            var tr = document.createElement("tr");
            tr.className = (statBody.childNodes.length % 2 == 0) ? 'odd' : 'even';
            if (player.position() == 'BN') {
                tr.className = 'bench';
            }

            for (var i=0; i<statNames.length; i++) {
                var name = statNames[i];
                var td = document.createElement("td");
                td.innerHTML = eval('player.' + name + '()');
                tr.appendChild(td);
            }
            statBody.appendChild(tr);
        }
    }

    /**
     Enable or disable the modal window overlay
     */
    function removeOverlay() {
        if (document.getElementById(MODAL_DIV_ID)) {
            document.body.removeChild(document.getElementById(MODAL_DIV_ID));
        }
    }

    /**
     Setup the modal window
     */
    function setUpModal() {
        if (document.getElementById(MODAL_DIV_ID)) {
            document.body.removeChild(document.getElementById(MODAL_DIV_ID));
        }
        var div = document.createElement("div");
        div.appendChild(document.createElement("div"));
        document.body.appendChild(div);
        div.id = MODAL_DIV_ID;
        GM_addStyle('#' + MODAL_DIV_ID + " {text-align:center;position:absolute;left: 0px;top: 0px;width:100%;height:100%;text-align:center;z-index: 200;background: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%002%00%00%002%01%03%00%00%00%24%F1%1A%F2%00%00%00%06PLTE%9D%BF%C4%FF%FF%FFo%99%7C%D4%00%00%00%02tRNS%FF%00%E5%B70J%00%00%00%01bKGD%01%FF%02-%DE%00%00%00%09pHYs%00%00%00H%00%00%00H%00F%C9k%3E%00%00%00yIDATx%01%05%C1%01%01%00%00%08%02%20%1C%D9I%07u%A2%13A%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A%F6%01%90%ADD%F3%BDe%02%17%00%00%00%00IEND%AEB%60%82\");}");
        GM_addStyle('#' + MODAL_DIV_ID + ' div {width:500px;margin:100px auto;background-color:#fff;border:1px solid #000;padding:15px;text-align:center;z-index:201;}');
        GM_addStyle('.roboTable {width:100%;margin-bottom:20px;padding:3px;border-collapse:collapse;border: 1px solid #000;} tr.even {background-color:#f1f2ed;} thead tr {background-color:#ABAB9E;border-bottom:1px solid #000;} td {text-align:center;} tr.bench {background-color: #666;}');

        addClose();
    }

    /**
     Add a close link to the modal
     */
    function addClose() {
        var div = document.getElementById(MODAL_DIV_ID).childNodes[0];
        var close = document.createElement("a");
        close.id ="roboClose";
        close.href = "#";
        close.innerHTML = "close";
        div.appendChild(close);

        var closeLink = document.getElementById('roboClose');
        closeLink.addEventListener('click',
                           function(e) { removeOverlay(); },
                           false);
    }

    /**

    */
    function setUpTable(tableId, pitcherOrBatter) {
        var div = document.getElementById(MODAL_DIV_ID).childNodes[0];
        var table = document.createElement("table");
        table.className = "roboTable";

        if (pitcherOrBatter == BATTER) {
            table.innerHTML +=
                '<thead><tr><td width="23%" height="18" align="left">&nbsp;Name</td><td width="8%">H/AB</td><td width="8%">R</td><td width="8%">HR</td><td width="8%">RBI</td><td width="8%">SB</td><td width="8%">AVG</td></tr></thead>' +
                '<tbody id="'+ tableId+'">' +
                '</tbody>';
        } else {
            table.innerHTML +=
                '<thead><tr><td width="23%" height="18" align="left">&nbsp;Name</td><td width="7%">IP</td><td width="7%">W</td><td width="7%">S</td><td width="7%">K</td><td width="7%">ERA</td><td width="7%">WHIP</td></tr></thead>' +
                '<tbody id="'+ tableId+'">' +
                '</tbody>';
        }
        div.appendChild(table);
        return document.getElementById(tableId);
    }

    /**
     From the daily management page, visit each boxscore link if it exists and fire off the processing.
     @nodes              the player nodes
     @pitcherOrBatter    PITCHER or BATTER

     @returns no return value
     */
    function processFantasyHome(nodes, pitcherOrBatter) {
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
                        if (boxscoreLink.indexOf("preview")> -1) {break;}
                        column.childNodes[0].setAttribute("href", boxscoreLink);

                        var player;

                        if (pitcherOrBatter == BATTER)
                            player = new Batter();
                        else
                            player = new Pitcher();

                        player.playerId(playerId);
                        player.position(position);
                        player.order(i);

                        getDocument(boxscoreLink, player);
                    }
                    break;
                }
            }
        }
    }

    /**
     Modal window code
     */
    function getViewportHeight() {
        if (window.innerHeight!=window.undefined) return window.innerHeight;
        if (document.compatMode=='CSS1Compat') return document.documentElement.clientHeight;
        if (document.body) return document.body.clientHeight;
        return window.undefined;
    }

    /**
     Modal window code
     */
    function getViewportWidth() {
        if (window.innerWidth!=window.undefined) return window.innerWidth;
        if (document.compatMode=='CSS1Compat') return document.documentElement.clientWidth;
        if (document.body) return document.body.clientWidth;
        return window.undefined;
    }

    /**
     Modal window code
     */
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

    /**
     Attach functions to events
     */
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

    /**
     Add the blue show stats button
     */
    function addShowStatsButton() {
        if (document.getElementById('robobruinStatBtn')) {
            return;
        }
        var button = document.createElement("button");
        document.body.appendChild(button);
        button.id = 'robobruinStatBtn';
        button.innerHTML = "Show Freebie Stats!";

        button.addEventListener('click',
                           function(e) {getStats();},
                           false);
        GM_addStyle('#robobruinStatBtn {position:fixed;top:80px;left:80px;z-index:200;background-color:#0781C8;color:#fff;}');
    }

    /**
    Wrapper function to show stats.
    */
    function getStats() {
        setUpModal();
        var nodes = xpath(document, "//table[@id='statTable0']/tbody/tr/td[@class='player']/div/a[@class='name' and @href]");
        processFantasyHome(nodes, BATTER);

        nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@class='name' and @href]");
        processFantasyHome(nodes, PITCHER);
        centerPopWin();
        addEvent(window, "resize", centerPopWin);
        addEvent(window, "scroll", centerPopWin);
    }

    addShowStatsButton();
})();

//Change Log
//2007-04-18: Fixed Issues 4 and 5. Reported by Ethan Herbertson
//2007-04-19: Code cleanup and documentation.  Lots of suggestions from Rodric Rabbah. Beginnings of issue 3.
//2007-04-21: Refactor- Create batter and pitcher classes.

