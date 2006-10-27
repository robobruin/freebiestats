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
*/

(function () {

    var HIDDEN_DIV_ID = 'robobruinDiv';
    var BATTER = 'batter';
    var PITCHER = 'pitcher';

    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    function getDocument(url, playerId, homeStatColumn, offset, playerType) {
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

                var stats = processBoxscore(s, playerId, playerType);
                printStats(homeStatColumn, stats, offset, playerType);
            }
        });
    }

    function processBoxscore(html, playerId, playerType) {
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

                stats.HR = getHRorSB('HR', playerName, document);
                stats.SB = getHRorSB('SB', playerName, document);
                stats.HPAB = boxScoreStatColumn[7].innerHTML + '/' + boxScoreStatColumn[3].innerHTML;
                stats.R = boxScoreStatColumn[5].innerHTML;
                stats.RBI = boxScoreStatColumn[9].innerHTML;

                if (boxScoreStatColumn[3].innerHTML * 1 > 0) {
                    var avg = (boxScoreStatColumn[7].innerHTML * 1 / boxScoreStatColumn[3].innerHTML * 1).toFixed(3);
                    stats.AVG = (new String(avg).charAt(0) != '1') ? (avg.substring(1, avg.length)) : avg;
                } else {
                    stats.AVG = '-';
                }
            return stats;
        }
    }

    function getHRorSB(type, playerName, document) {
        var nodes = xpath(document, "//td[@class='yspscores' and contains(.,'" + type + "') and contains(.,'" + playerName + "')]");
        var j = nodes.snapshotLength;
        var numStat = 0;

        if (j) {
            var statLine = nodes.snapshotItem(j - 1).textContent;
            var re = new RegExp(".*(" + playerName + " *\\d?).+", 'gi');
            statLine = statLine.replace(re, "$1");
            statLine = statLine.replace(/[^\d]+/, '');
            numStat = (statLine == '') ? 1 : statLine;
        }
        return numStat;
    }


    function printStats(homeStatColumn, stats, offset, playerType) {
        if (stats) {
            // H/AB
            homeStatColumn[(8 + offset * 2)].innerHTML = stats.HPAB;
            // R
            homeStatColumn[(10 + offset * 2)].innerHTML = stats.R;
            // HR
            homeStatColumn[(12 + offset * 2)].innerHTML = stats.HR;
            // RBI
            homeStatColumn[(14 + offset * 2)].innerHTML = stats.RBI;
            // sb
            homeStatColumn[(16 + offset * 2)].innerHTML = stats.SB;
            //avg
            homeStatColumn[(18 + offset * 2)].innerHTML = stats.AVG;
        }
    }

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

                getDocument(boxscoreLink,
                        playerId,
                        statColumn,
                        offset, playerType);
            }
        }
    }

    var nodes = xpath(document, "//table[@id='statTable0']/tbody/tr/td[@class='player']/div/a[@href]");
    processFantasyHome(nodes);
})();