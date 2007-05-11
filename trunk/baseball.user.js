// ==UserScript==
// @name            Yahoo Fantasy Baseball
// @namespace       http://robobruin.com/greasemonkey/fantasysports
// @description     Live baseball fantasy scoring
// @include         http://baseball.fantasysports.yahoo.com/*
//
// --------------------------------------------------------------------
// This is a Greasemonkey user script.
// It provides live scoring updates for Yahoo Fantasy Baseball leagues.
//
// --------------------------------------------------------------------
// This script is released under Mozilla Public License 1.1
// http://www.mozilla.org/MPL/
//
// To install, you need Greasemonkey: 
// http://greasemonkey.mozdev.org/
//
// Then restart Firefox and revisit this script:
// http://userscripts.org/scripts/show/5143
//
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "Yahoo Fantasy Baseball", and click Uninstall.
//
// --------------------------------------------------------------------
// For code enhancements, feature requests, or to report bugs, visit:
// http://code.google.com/p/freebiestats/issues/list
//
// --------------------------------------------------------------------
// Credits for modal dialog inspiration:
// http://gabrito.com/files/subModal/
// http://www.sitening.com/blog/2006/03/29/create-a-modal-dialog-using-css-and-javascript/
//
// --------------------------------------------------------------------


const VERSION    = 2.2-2;
const SCRIPT_URL = 'http://userscripts.org/scripts/show/5143';


(function () {
    const YAHOO_MLB_BASEURL = 'http://baseball.fantasysports.yahoo.com';

    const BUTTON_LABEL   = 'Show Freebie Stats!';

    const HIDDEN_DIV_ID  = 'robobruinDiv';
    const MODAL_DIV_ID   = 'robobruinModal';
    const STAT_BODY_ID   = 'robobruinTableBody';
    const STAT_BUTTON_ID = 'robobruinStatBtn';
    
    const BATTER  = 'batter';
    const PITCHER = 'pitcher';
    const TOTALER = 'total';
    const TEAM    = 'team';
    const LEAGUE  = 'league';

    /* run in team mode, league mode, or don't runt at all */
    var SCRIPT_MODE = null;

    if (location.href.match(/^http\:\/\/baseball\.fantasysports\.yahoo\.com\/b\d\/\d+\/(team\?mid=)?\d+.*/i)) {
        SCRIPT_MODE = TEAM;
    }
    else if (location.href.match(/^http\:\/\/baseball\.fantasysports\.yahoo\.com\/b\d\/\d+./i)) {
        SCRIPT_MODE = LEAGUE;
    }
    else return;

/**********************************************************************************************/
    /* all players */
    function Player() {
        this._playerId = '';
        this._name     = '';
        this._displayName = '';
        this._position = '';
        this._gameinfo = '';
        this._order    = 0;

        this._h  = 0;
        this._bb = 0;

        this._isBatter = null;
    }
    Player.prototype.playerId    = function (arg) {if (arguments.length) this._playerId    = arg; else return this._playerId;}
    Player.prototype.name        = function (arg) {if (arguments.length) this._name        = arg; else return this._name;}
    Player.prototype.displayName = function (arg) {if (arguments.length) this._displayName = arg; else return this._displayName;}
    Player.prototype.position    = function (arg) {if (arguments.length) this._position    = arg; else return this._position;}
    Player.prototype.gameinfo    = function (arg) {if (arguments.length) this._gameinfo    = arg; else return this._gameinfo;}
    Player.prototype.order       = function (arg) {if (arguments.length) this._order = parseInt(arg); else return this._order;}

    Player.prototype.isOnBench   = function ()    {return (this._position == 'BN' || this._position == 'DL');}
    Player.prototype.isBatter    = function ()    {return this._isBatter;}

    Player.prototype.h           = function (arg) {if (arguments.length) this._h  = parseInt(arg); else return this._h;}
    Player.prototype.bb          = function (arg) {if (arguments.length) this._bb = parseInt(arg); else return this._bb;}

    function Batter() {
        this._ab  = 0;
        this._r   = 0;
        this._hr  = 0;
        this._rbi = 0;
        this._sb  = 0;
        this._isBatter = true;
    }

    /* batters */
    Batter.prototype = new Player();
    Batter.prototype.ab  = function (arg) {if (arguments.length) this._ab = parseInt(arg); else return this._ab;}
    Batter.prototype.r   = function (arg) {if (arguments.length) this._r  = parseInt(arg); else return this._r;}
    Batter.prototype.hr  = function (arg) {if (arguments.length) this._hr = parseInt(arg); else return this._hr;}
    Batter.prototype.rbi = function (arg) {if (arguments.length) this._rbi= parseInt(arg); else return this._rbi;}
    Batter.prototype.sb  = function (arg) {if (arguments.length) this._sb = parseInt(arg); else return this._sb}

    Batter.prototype.avg = function () {
        if (this._ab > 0) {
            var avg = (this._h / this._ab).toFixed(3);
            avg = (new String(avg).charAt(0) != '1') ? (avg.substring(1, avg.length)) : avg;
            return avg;
        } 
        else return '-';
    }
    /* on base percentage ignores hit-by-pitch and sac flys */
    Batter.prototype.obp = function () {
        if ((this._ab + this._bb) > 0) {
            var obp = ((this._h + this._bb) / (this._ab + this._bb)).toFixed(3);
            obp = (new String(obp).charAt(0) != '1') ? (obp.substring(1, obp.length)) : obp;
            return obp;
        } 
        else return '-';
    }
    Batter.prototype.hab = function () {
        return this._h + '/' + this._ab;
    }

    /* pitchers */
    function Pitcher() {
        this._displayIP = '-';
        /* keep track of full IP and partial IP 
         * from which the IP is calculated
         */
        this._fullIP = 0;
        this._partIP = 0;

        this._er = 0;
        this._k  = 0;

        this._w  = 0;
        this._l  = 0;
        this._s  = 0;
        this._isBatter = false;
    }

    Pitcher.prototype = new Player();
    Pitcher.prototype.displayIP = function (arg) {
        if (arguments.length) {
            this._displayIP = arg; 
            this._fullIP += parseInt(arg);
            this._partIP += (arg * 10) % 10;
        }
        else return this._displayIP;
    }
    Pitcher.prototype.er = function (arg) {if (arguments.length) this._er = parseInt(arg); else return this._er;}
    Pitcher.prototype.w  = function (arg) {if (arguments.length) this._w  = parseInt(arg); else return this._w;}
    Pitcher.prototype.l  = function (arg) {if (arguments.length) this._l  = parseInt(arg); else return this._l;}
    Pitcher.prototype.s  = function (arg) {if (arguments.length) this._s  = parseInt(arg); else return this._s;}
    Pitcher.prototype.k  = function (arg) {if (arguments.length) this._k  = parseInt(arg); else return this._k;}

    /* ip() is used to calculate era and whip */
    Pitcher.prototype.ip = function () {
        /* calculate IP from raw full and partial IP stats */
        var ip  = this._fullIP + (this._partIP / 3);
        return ip;
    }
    Pitcher.prototype.era = function () {
        var ip = this.ip();
        if (ip != 0) {
            var era = this._er * 9 / ip;
            return era.toFixed(2);
        } 
        else return '-';
    }
    Pitcher.prototype.whip = function () {
        var ip = this.ip();
        if (ip != 0) {
            var whip = (this._bb + this._h) / ip;
            return whip.toFixed(2);
        } 
        else return '-';
    }

    function TotalBatter(label, order)  {
        this._position = TOTALER; 

        if (arguments.length) {
            this._displayName = label;
            this._order = order;
        }
        else {
            this._displayName = 'total'; 
            this._order = 0;
        }
    }
    function TotalPitcher(label, order)  {
        this._position = TOTALER; 

        if (arguments.length) {
            this._displayName = label;
            this._order = order;
        }
        else {
            this._displayName = 'total'; 
            this._order = 0;
        }
    }

    TotalBatter.prototype = new Batter();
    TotalPitcher.prototype = new Pitcher();

    TotalBatter.prototype.add = function (player) {
        this._ab  += player.ab();
        this._h   += player.h();
        this._bb  += player.bb();
        this._r   += player.r();
        this._hr  += player.hr();
        this._sb  += player.sb();
        this._rbi += player.rbi();
    }

    TotalPitcher.prototype.add = function (player) {
        this._fullIP += player._fullIP;
        this._partIP += player._partIP;
        this._h  += player.h();
        this._bb += player.bb();
        this._er += player.er();
        this._w  += player.w();
        this._l  += player.l();
        this._s  += player.s();
        this._k  += player.k();
    }

    TotalPitcher.prototype.displayIP = function () {
        return ((this._fullIP + parseInt(this._partIP / 3)) + '.' + (this._partIP % 3));
    }
/**********************************************************************************************/

/**********************************************************************************************/
    /**
     Setup the modal window
     @date   replace refresh button with date if date is not null

     @return no return value
     */
    function setUpModal(date) {
        if (document.getElementById(MODAL_DIV_ID)) {
            document.body.removeChild(document.getElementById(MODAL_DIV_ID));
        }
        var div = document.createElement("div");
        div.appendChild(document.createElement("div"));
        document.body.appendChild(div);
        div.id = MODAL_DIV_ID;

        /* remove the background image since the auto-scrolling is now
         * disabled to get around continous auto scrolling in a short
         * browser window; change table baground to a light tint instead
         */
        GM_addStyle('#' + MODAL_DIV_ID + " {text-align:center;position:absolute;left: 0px;top: 0px;width:100%;height:100%;text-align:center;z-index: 200;}");//background: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%002%00%00%002%01%03%00%00%00%24%F1%1A%F2%00%00%00%06PLTE%9D%BF%C4%FF%FF%FFo%99%7C%D4%00%00%00%02tRNS%FF%00%E5%B70J%00%00%00%01bKGD%01%FF%02-%DE%00%00%00%09pHYs%00%00%00H%00%00%00H%00F%C9k%3E%00%00%00yIDATx%01%05%C1%01%01%00%00%08%02%20%1C%D9I%07u%A2%13A%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A6%03.%05%9B%01%97%82%CD%80K%C1f%C0%A5%603%E0R%B0%19p)%D8%0C%B8%14l%06%5C%0A%F6%01%90%ADD%F3%BDe%02%17%00%00%00%00IEND%AEB%60%82\");}");

        //GM_addStyle('#' + MODAL_DIV_ID + ' div {width:500px;margin:100px auto;background-color:#fff;border:1px solid #000;padding:15px;text-align:center;z-index:201;}');
        GM_addStyle('#' + MODAL_DIV_ID + ' div {width:500px;margin:100px auto;background-color:#F1F2ED;border:1px solid #000;padding:20px;text-align:center;z-index:201;}');

        GM_addStyle('.roboTable {width:100%;margin-bottom:20px;padding:3px;border-collapse:collapse;border: 1px solid #000;} tr.odd {background-color:white;font-weight:bold;} tr.even {background-color:beige;font-weight:bold;} thead tr {background-color:#ABAB9E;border-bottom:1px solid #000;} td {text-align:center;} tr.bench {background-color:#f1f2ed;font-weight:normal;} tr.total {background-color:yellow;font-weight:bold}');

        addCloseAndRefresh(date);
    }

    /**
     Add a close link and refresh to the modal
     */
    function addCloseAndRefresh(date) {
        var div = document.getElementById(MODAL_DIV_ID).childNodes[0];

        var close = document.createElement("a");
        close.id ="roboClose";
        close.href = "#";
        close.innerHTML = "[close]";
        div.appendChild(close);

        close.addEventListener('click',
                           function(e) { removeOverlay(); },
                           false);

        var refresh = document.createElement("a");
        refresh.id = "roboRefresh";
        refresh.href = "#";

        /* there is no need to display refresh button when in league
         * wide stats mode so instead display the date for which the
         * stats are reported 
         */
        if (date) {
            refresh.innerHTML = date;
        }
        else {
            refresh.innerHTML = "[refresh]";
            refresh.addEventListener('click',
                                     function(e) { removeOverlay(); getStats();},
                                     false);
        }

        div.appendChild(refresh);

        GM_addStyle('#roboRefresh {padding-left:10px;}');
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
     Attach getStats function to date range menu items
     */
    function addDateToMenuItem(menuItem, n) {
        menuItem.addEventListener('click', function(e) {hideDateRange(); getStats(new Date(), n);}, false);
    }
 
    /**
     Show date range for league summary 0-6 days ago
     */
    function showDateRange() {
        var id = STAT_BUTTON_ID;
        var rangeId = id + 'daterange';

        if (document.getElementById(rangeId)) {
            hideDateRange(); // doesn't work, why?
        }

        /* replace button with pull down menu to show date range */
        dateRange = document.createElement("div");
        dateRange.id = rangeId;
        dateRange.className = 'menulist';

        GM_addStyle('#' + dateRange.id + '{position:absolute;top:207px;right:100px;z-index:200;background-color:#0781c8;color:#fff;text-align:left;}');
        
        for (n = 0; n < 7; n++) {
            var menuItem = document.createElement("a");

            if (n == 0) {
                menuItem.innerHTML = 'today';
            }
            else if (n == 1) {
                menuItem.innerHTML = 'yesterday';
            }
            else {
                menuItem.innerHTML = n + ' days ago';
            }

            addDateToMenuItem(menuItem, n);

            var br = document.createElement("br");
            dateRange.appendChild(menuItem);
            dateRange.appendChild(br);
        }
        document.body.appendChild(dateRange);
    }

    /**
     Hide date range for league summary
     */
    function hideDateRange() {
        var id = STAT_BUTTON_ID;
        var rangeId = id + 'daterange';

        var dateRange = document.getElementById(rangeId);
        if (dateRange) {
            dateRange.style.display = 'none';
        }
    }

    /**
     Add the blue show stats button
     */
    function addShowStatsButton() {
        var id = STAT_BUTTON_ID;

        if (document.getElementById(id)) {
            return;
        }
        var nodes = xpath(document, "//a[contains(@href,'stattracker')]");
        var promoText = BUTTON_LABEL + (SCRIPT_MODE == LEAGUE ? ' (e)' : '');
        
        if (nodes.snapshotItem(0)) {
            var a = nodes.snapshotItem(0);
            a.href = '#';
            a.target = null;
            a.innerHTML = promoText;
            a.id = id;

            if (SCRIPT_MODE == TEAM) {
                a.addEventListener('click', function(e) {getStats(); return false;},false);
            }
            else {
                /* in league mode, show a date range that allows user
                 * to pick the date they want to see the stats for 
                 */
                a.addEventListener('click', function(e) {showDateRange(); return false;},false);
            }
        } 
        else {
            var button = document.createElement("button");
            document.body.appendChild(button);
            button.id = id;
            button.innerHTML = promoText;
            
            if (SCRIPT_MODE == TEAM) {
                button.addEventListener('click', function(e) {getStats();}, false);
            }
            else {
                /* in league mode, show a date range that allows user
                 * to pick the date they want to see the stats for 
                 */
                button.addEventListener('click', function(e) {showDateRange(); return false;},false);
            }
            GM_addStyle('#' + id + '{position:fixed;top:80px;right:80px;z-index:200;background-color:#0781C8;color:#fff;}');
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
/**********************************************************************************************/

/**********************************************************************************************/
    /**
     TODO: issue 1
     Set up the team stat table headers
     */
    function setUpTable(tableId, pitcherOrBatter) {
        var div = document.getElementById(MODAL_DIV_ID).childNodes[0];
        var table = document.createElement("table");
        table.className = "roboTable";

        /* add space between buttons and table rows */
        table.innerHTML += '<thead><tr height="10"></tr></thead>';

        if (pitcherOrBatter == BATTER) {
            table.innerHTML +=
                '<thead><tr><td width="23%" height="18" align="left">&nbsp;Name</td><td width="12%">Status</td><td width="8%">H/AB</td><td width="8%">R</td><td width="8%">HR</td><td width="8%">RBI</td><td width="8%">SB</td><td width="8%">AVG</td></tr></thead>' +
                '<tbody id="'+ tableId+'">' +
                '</tbody>';
        } else {
            table.innerHTML +=
                '<thead><tr><td width="23%" height="18" align="left">&nbsp;Name</td><td width="12%">Status</td><td width="7%">IP</td><td width="7%">W</td><td width="7%">L</td><td width="7%">S</td><td width="7%">K</td><td width="7%">ERA</td><td width="7%">WHIP</td></tr></thead>' +
                '<tbody id="'+ tableId+'">' +
                '</tbody>';
        }
        div.appendChild(table);
        return document.getElementById(tableId);
    }
/**********************************************************************************************/

/**********************************************************************************************/
    /**
     Find all nodes matching an xpath expression
     @doc    document
     @xpath  xpath expression

     @return in-order resulting nodes
     */
    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    /**
     Wrap greasemonkey's ajax request
     @url         page to request
     @player      batter or pitcher object
     @statNames   stats categories
     @totalPlayer  total stats for pitchers and battre

     @return no return value
     */
    function getDocument(url, player, statNames, totalPlayer) {
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
                setPlayerStats(url, document, player, statNames, totalPlayer);
            }
        });
    }

    /**
     Add hidden content to the DOM so we can run xpath on it
     @html   the raw html that will be part of the DOM

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
     @document  document to parse
     @player    batter or pitcher object

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
/**********************************************************************************************/

/**********************************************************************************************/
    /**
     HR and SB stats appear at the bottom of the boxscore table.
     We need to do a string match on the player since the playerId does not appear.
     @type        SB or HR
     @playerName  name of player
     @document    document to parse

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
     @url         link to box score
     @document    current document
     @player      batter or pitcher object
     @statNames   stats categories
     @totalPlayer  total stats for pitchers and battre

     @return no return value
     */
    function setPlayerStats(url, document, player, statNames, totalPlayer) {
        var row = processBoxscore(document, player);

        if (row) {
            var columns = row.getElementsByTagName("TD");
            var statNames;

            var href = columns[0].childNodes[1].getAttribute('href');
            //columns[0].childNodes[1].setAttribute('href','http://sports.yahoo.com'+ href + '/gamelog');
            columns[0].childNodes[1].setAttribute('href', url);
            columns[0].childNodes[1].setAttribute('target','_blank');

            if (player.isBatter()) {
                var hitter = columns[0].childNodes[1].text.replace(/(.).+ (.+)/,"$1 $2");
                player.name(hitter);
                player.displayName(columns[0].innerHTML);

                player.ab(columns[1].innerHTML);
                player.r(columns[2].innerHTML);
                player.h(columns[3].innerHTML);
                player.rbi(columns[4].innerHTML);
                player.bb(columns[5].innerHTML);
                player.hr(getHRorSB('HR', hitter, document));
                player.sb(getHRorSB('SB', hitter, document));
            } else {
                var pitcherName = columns[0].innerHTML;
                player.displayName(pitcherName);
                player.displayIP(columns[1].innerHTML);
                player.h(columns[2].innerHTML);
                player.er(columns[4].innerHTML);
                player.bb(columns[5].innerHTML);
                player.k(columns[6].innerHTML);

                player.w((pitcherName.indexOf("(W") > -1) ? 1 : 0);
                player.l((pitcherName.indexOf("(L") > -1) ? 1 : 0);
                player.s((pitcherName.indexOf("(S") > -1) ? 1 : 0);
            }

            if (!player.isOnBench()) {
                totalPlayer.add(player);
            }

            if (SCRIPT_MODE == TEAM) {
                updateStatsRow(player, statNames);
            }
            updateStatsRow(totalPlayer, statNames);
        }
    }

    /**
     Updates player stat's table.
     @player      player object
     @statNames   stat categories

     @return no return value
     */
    function updateStatsRow(player, statNames) {
        var tr = document.createElement("tr");

        for (var i=0; i<statNames.length; i++) {
            var name = statNames[i];
            var td = document.createElement("td");

            td.innerHTML = eval('player.' + name + '()');
            tr.appendChild(td);
        }

        var pitcherOrBatter = player.isBatter() ? BATTER : PITCHER;
        var tableId = STAT_BODY_ID + pitcherOrBatter;
        var statBody = document.getElementById(tableId);
        var rows = statBody.getElementsByTagName("TR");

        /* for regular players, color the rows in alternating colors */
        if (player.position() != TOTALER) {
            tr.className = player.isOnBench() ? 'bench' : (player.order() % 2 == 0) ? 'even' : 'odd';
            statBody.replaceChild(tr, rows[player.order()]);
        } 
        /* for total stats players, either highlight the row in yellow
         * or use alternating colors if in league mode
         */
        else {
            if (SCRIPT_MODE == TEAM) {
                tr.className = 'total';
                statBody.replaceChild(tr, rows[rows.length-1]);
            }
            else {
                statBody.replaceChild(tr, rows[player.order()]);
            }
        }

        /* fix up row colors */
        var trActive = 0;
        for (i = 0; i < rows.length; i++) {
            if (rows[i].childNodes.length && (rows[i].className != 'bench') && (rows[i].className != 'total')) {
                trActive++;
                rows[i].className = (trActive % 2) ? 'even' : 'odd';
            }
        }
    }

    /**
     From the daily management page, visit each boxscore link if it exists and fire off the processing.
     Create placeholders in the stat table to be filled in after boxscore is processed.
     @nodes            the player nodes
     @pitcherOrBatter  PITCHER or BATTER
     @statNames        stats categories
     @totalPlayer      total stats for pitchers and batters

     @return no return value
     */
    function processFantasyTeamHome(nodes, pitcherOrBatter, statNames, totalPlayer) {
        var iBoxScore = 0;
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var userIdNode = nodes.snapshotItem(i);
            var playerId = userIdNode.getAttribute('href');
            playerId = playerId.replace(/[^0-9]/g, '');

            var row = userIdNode.parentNode.parentNode.parentNode;
            var position = row.childNodes[0].innerHTML;

            //iterate columns to find the boxscore column
            //start at 1 since we know 0 is BN/DL or position
            for(var j=1; j < row.childNodes.length; j++) {
                var column = row.childNodes[j];
                if (column.className && column.className == 'gametime') {
                    if (column.childNodes.length && column.childNodes[0].nodeName == 'A') {
                        var boxscoreLink = column.childNodes[0].getAttribute("href");
                        var gameinfo = column.childNodes[0].innerHTML;
                        boxscoreLink = new String(boxscoreLink).replace('recap', 'boxscore');
                        if (boxscoreLink.indexOf("preview")> -1) {break;}
                        column.childNodes[0].setAttribute("href", boxscoreLink);

                        if (SCRIPT_MODE == TEAM) {
                            var statBody;
                            var tableId = STAT_BODY_ID + pitcherOrBatter;

                            if (iBoxScore == 0) {
                                statBody = setUpTable(tableId, pitcherOrBatter);
                                var totalRow = document.createElement("tr");
                                totalRow.className = 'total';
                                statBody.appendChild(totalRow);
                            }

                            statBody = document.getElementById(tableId);
                            var rows = statBody.getElementsByTagName("TR");
                            var lastRow = rows[rows.length-1];
                            var statRow = document.createElement("tr");
                            statBody.insertBefore(statRow, lastRow);
                        }

                        var player = (pitcherOrBatter == BATTER) ? new Batter() : new Pitcher();
                        player.playerId(playerId);
                        player.position(position);
                        player.gameinfo(gameinfo);
                        player.order(iBoxScore);

                        iBoxScore++;
                        getDocument(boxscoreLink, player, statNames, totalPlayer);
                    }
                    break;
                }
            }
        }
    }

    /**
     Parse document to retrieve team players and their 
     stats then start processing the team data       
     */
    function getTeamStats(statsDocument, statNames, pitcherOrBatter, totalPlayer) {
        var nodes;

        if (pitcherOrBatter == BATTER) {
            nodes = xpath(statsDocument, "//table[@id='statTable0']/tbody/tr/td[@class='player']/div/a[@class='name' and @href]");
        } else {
            nodes = xpath(statsDocument, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@class='name' and @href]");
        }

        processFantasyTeamHome(nodes, pitcherOrBatter, statNames, totalPlayer);
    }


    /**
     Fetch document for team, and start processing team data
     */
    function updateTeamStats(teamURL, statNames, pitcherOrBatter, totalPlayer) {
        GM_xmlhttpRequest({
            method:"GET",
            url:teamURL,
            onload:function(details) {
                var s = new String(details.responseText);
                s = s.replace(/\n/g, ' ');
                s = s.replace(/^.*<style.*<\/style>/gi, ' ');
                s = s.replace(/^.*<body[^>]*>(.*)<\/body>.*$/gi, "$1");
                // parsing isn't working if response text is not appended to document
                var scope = appendToDocument(s);
                
                getTeamStats(scope, statNames, pitcherOrBatter, totalPlayer);
            }
        });
    }

    /**
     Parse league standings and retrieve team name. Then for each
     team create a total batter and pitcher and update the stats
     for the team
     */
    function getLeagueStats(date, batterStatNames, pitcherStatNames) {
        var nodes = xpath(document, "//table[@id='standingstable']/tbody/tr/td[@class='team']");

        var tableId = STAT_BODY_ID + BATTER;
        setUpTable(tableId, BATTER);

        tableId = STAT_BODY_ID + PITCHER;
        setUpTable(tableId, PITCHER);

        for (var i = 0; i < nodes.snapshotLength; i++) {
            /* team name and url */
            var teamURL  = YAHOO_MLB_BASEURL + nodes.snapshotItem(i).childNodes[0].getAttribute("href") + date;
            var teamName = '<a href=\"' + teamURL + '\">' + nodes.snapshotItem(i).childNodes[0].innerHTML + '</a>';
            
            tableId = STAT_BODY_ID + BATTER;
            statBody = document.getElementById(tableId);
            totalRow = document.createElement("tr");
            statBody.appendChild(totalRow);
            var totalTeamBatter = new TotalBatter(teamName, i);
            updateStatsRow(totalTeamBatter, batterStatNames);
            updateTeamStats(teamURL, batterStatNames, BATTER, totalTeamBatter);

            tableId = STAT_BODY_ID + PITCHER;
            statBody = document.getElementById(tableId);
            totalRow = document.createElement("tr");
            statBody.appendChild(totalRow);
            var totalTeamPitcher = new TotalPitcher(teamName, i);
            updateStatsRow(totalTeamPitcher, pitcherStatNames);
            updateTeamStats(teamURL, pitcherStatNames, PITCHER, totalTeamPitcher);
        }
    }
    
    /** 
     Format date to match yahoo format
     */
    function formatDate(today, daysAgo) {
        var date  = new Date(today.getTime() - (daysAgo * 24 /* hrs */ * 60 /* min */ * 60 /* sec */ * 1000 /* msec */));
        var month = date.getMonth() + 1; /* months start at Jan == 0 */
        var day   = date.getDate();
        
        month = month < 10 ? ('0' + month) : month;
        day   = day   < 10 ? ('0' + day)   : day;

        var postfix = date.getFullYear() + '-' + month + '-' + day;
        return postfix;
    }

    /**
     Wrapper function to show stats.
     */
    function getStats(today, daysAgo) {
        var batterStatNames  = new Array('displayName','gameinfo','hab','r','hr','rbi','sb','avg');
        var pitcherStatNames = new Array('displayName','gameinfo','displayIP','w','l','s','k','era','whip');
        
        if (SCRIPT_MODE == TEAM) {
            setUpModal(null);
            getTeamStats(document, batterStatNames, BATTER, new TotalBatter());
            getTeamStats(document, pitcherStatNames, PITCHER, new TotalPitcher());
        }
        else { /* league mode */
            var day = ''; /* today */
            if ((arguments.length == 0) || (daysAgo == 0)) {
                setUpModal(null);
                getLeagueStats(day, batterStatNames, pitcherStatNames);
            }
            else {
                /* in league mode, replace the refresh button with
                 * date corresponding to user selection
                 */
                day = formatDate(today, daysAgo);
                setUpModal(day);
                getLeagueStats(('?date=' + day), batterStatNames, pitcherStatNames);
            }
        }

        centerPopWin();
        addEvent(window, "resize", centerPopWin);
        /* disabled auto scrolling to get around issue in a short
         * browser window which will always clip button of stats table
         */
        // addEvent(window, "scroll", centerPopWin);
    }
/**********************************************************************************************/

    addShowStatsButton();
})();


//Change Log
//2007-04-18: Fixed Issues 4 and 5. Reported by Ethan Herbertson
//2007-04-19: Code cleanup and documentation.  Lots of suggestions from Rodric Rabbah. Beginnings of issue 3.
//2007-04-21: Refactor- Create batter and pitcher classes.
//2007-04-23: Issue 3,6  Added total stats summary, preserve order of player list, replaced stat tracker link.
//2007-04-23: DL players should be treated like BN players
//2007-05-04: Changed table formatting (better choice of colors, bold for active players, highlight total row, relabel buttons) (RMR)
//2007-05-04: Fixed bug which previously required extra row to be created so that totals row doesn't overwrite player stats (RMR)
//2007-05-04: Added loss category for pitchers (RMR)
//2007-05-04: Fixed Issue 12. Accumulate stats from players who don't record an AB but do record other stats (RMR)
//2007-05-04: Replaced global TOTAL_PITCHER/BATTER objects with local objects created on every refresh (RMR)
//2007-05-04: Link player to box score rather than game log (RMR)
//2007-05-04: Added OBP place holder (calculate it but don't display it; it ignored HBP and Sac Fly so not sure if want to do display it yet) (RMR)
//2007-05-04: Verify that pitcher stats accumulated correctly (track full and partial IP seperately) (RMR)
//2007-05-05: Fix row coloring so that advacent rows for active roster players are never the same color (RMR)
//2007-05-06: Some refactoring (RMR)
//2007-05-06: Added hooks for league wide total stats view (RMR)
//2007-05-09: League wide total stats functional (RMR)
//2007-05-09: Show pop up menu to select date (today-6 days ago) for which to summarize league stats (RMR)
//2007-05-09: In league wide view, replace refresh button with date unless viewing stats for current day (RMR)
//2007-05-10: Show game status in stats table (RMR)
//2007-05-11: Some refactoring (RMR)

//Bug Log
//2007-05-04: Need to terminate pending events to properly clean up and delete old handles to rows (FIXME)
//2007-05-04: Handle double header games (FIXME)
//2007-05-09: Need to speed up league wide stats processing (delete attached documents?) (FIXME)

//Suggestions Log
//2007-05-09: Replace pop up menu will pull down menu or something nicer
//2007-05-09: Show completion meter
//2007-05-09: Improve date label as table header in league summary view
//2007-05-11: Add script auto-update feature
