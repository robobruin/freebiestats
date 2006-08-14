// ==UserScript==
// @name            Yahoo Fantasy Baseball
// @namespace       http://robobruin.com/greasemonkey/fantasysports
// @description     Live baseball fantasy scoring
// @include         http://baseball.fantasysports.yahoo.com/*
//
// ==/UserScript==

/*
This script is released under Mozilla Public License 1.1, http://www.mozilla.org/MPL/
The purpose is to provide live scoring updates for your default yahoo fantasy baseball team.

For code enhancements or feature requests, visit:
http://code.google.com/p/freebiestats/issues/list

*--!Important!--*
The script is set to run on all urls that match
http://baseball.fantasysports.yahoo.com/*
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

                var boxScoreStatColumn = processBoxscore(s, playerId);
                printStats(homeStatColumn, boxScoreStatColumn, offset, playerType);
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
        var nodes = xpath(document, "//td[@align='left']/a[@href]");
        var columns = null;
        for (var i = 0; i < nodes.snapshotLength; i++) {
            var playerLink = nodes.snapshotItem(i).getAttribute("href");
            var _playerId = new String(playerLink);
            _playerId = _playerId.replace(/[^0-9]/g, '');

            if (_playerId == playerId) {
                columns = nodes.snapshotItem(i).parentNode.parentNode.childNodes;
            }
        }
        return columns;
    }

    function printStats(homeStatColumn, boxScoreStatColumn, offset, playerType) {
        if (boxScoreStatColumn && playerType == BATTER) {
            // H/AB
            homeStatColumn[(8 + offset * 2)].innerHTML = boxScoreStatColumn[7].innerHTML + '/' + boxScoreStatColumn[3].innerHTML;
            // R
            homeStatColumn[(10 + offset * 2)].innerHTML = boxScoreStatColumn[5].innerHTML;
            // HR
            //children[12].innerHTML = stats.HR;
            // RBI
            homeStatColumn[(14 + offset * 2)].innerHTML = boxScoreStatColumn[9].innerHTML;
            //avg
            var avg = (boxScoreStatColumn[7].innerHTML*1 / boxScoreStatColumn[3].innerHTML*1).toFixed(3);
            avg = (new String(avg).charAt(0) != '1') ? (avg.substring(1,avg.length)) : avg;
            homeStatColumn[(18 + offset * 2)].innerHTML = avg;
        }

        if (boxScoreStatColumn && playerType == PITCHER) {
            // IP
            homeStatColumn[(8 + offset * 2)].innerHTML = boxScoreStatColumn[3].innerHTML;
            // W
            var pitcherName = new String(boxScoreStatColumn[1].innerHTML);
            if (pitcherName.indexOf("W") > -1) {
                homeStatColumn[(10 + offset * 2)].innerHTML = '1';
            }
            // S
            //children[12].innerHTML = stats.HR;
            if (pitcherName.indexOf("S") > -1) {
                homeStatColumn[(12 + offset * 2)].innerHTML = '1';
            }

            // K
            homeStatColumn[(14 + offset * 2)].innerHTML = boxScoreStatColumn[13].innerHTML;

            //ERA
            var era = boxScoreStatColumn[7].innerHTML * 9 / boxScoreStatColumn[3].innerHTML;
            homeStatColumn[(16 + offset * 2)].innerHTML = era.toFixed(2);

            //whip
            var whip = (boxScoreStatColumn[5].innerHTML * 1 + boxScoreStatColumn[11].innerHTML * 1) / boxScoreStatColumn[3].innerHTML;
            homeStatColumn[(18 + offset * 2)].innerHTML = whip.toFixed(2);
        }
    }

    function processFantasyHome(nodes, playerType) {
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
    processFantasyHome(nodes, BATTER);

    nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@href]");
    processFantasyHome(nodes, PITCHER);
})();