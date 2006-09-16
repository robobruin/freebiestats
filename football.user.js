// ==UserScript==
// @name            Yahoo Fantasy Football
// @namespace       http://robobruin.com/greasemonkey/fantasysports
// @description     Live football fantasy scoring
// @include         http://football.fantasysports.yahoo.com/*
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

/*
Passing Yards (50 yards per point)
Passing Touchdowns (6)
Interceptions (-2)

Rushing Yards (20 yards per point)
Rushing Touchdowns (6)

Reception Yards (20 yards per point)
Reception Touchdowns (6)
Return Touchdowns (6)
2-Point Conversions (2)
Fumbles Lost (-2)
Offensive Fumble Return TD (6)

Field Goals 0-19 Yards (3)
Field Goals 20-29 Yards (3)
Field Goals 30-39 Yards (3)
Field Goals 40-49 Yards (4)
Field Goals 50+ Yards (5)
Point After Attempt Made (1)

Sack (1)
Interception (2)
Fumble Recovery (2)
Touchdown (6)
Safety (2)
Block Kick (2)

Points Allowed 0 points (10)
Points Allowed 1-6 points (7)
Points Allowed 7-13 points (4)
Points Allowed 14-20 points (1)
Points Allowed 21-27 points (0)
Points Allowed 28-34 points (-1)
Points Allowed 35+ points (-4)
*/

(function () {

    var HIDDEN_DIV_ID = 'robobruinDiv';
    var BATTER = 'batter';
    var PITCHER = 'pitcher';

    function xpath(doc, xpath) {
        return doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    function getDocument(url, playerName, fantasyPtsColumn) {
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

                var stats = processBoxscore(s, playerName);
                //fantasyPtsColumn.innerHTML = stats;
            }
        });
    }

    function processBoxscore(html, playerName) {
        var div = document.getElementById(HIDDEN_DIV_ID);
        if (!div) {
            div = document.createElement("div");
            document.body.appendChild(div);
            div.id = HIDDEN_DIV_ID;
            div.style.display = 'none';
        }

        //tr[@class='yspsctbg']/td[@class='ysptblhdr' and contains(text(),'Rushing')]
        //tr[@class='yspsctbg']/td[@class='ysptblhdr' and contains(text(),'Receiving')]
        //tr[@class='yspsctbg']/td[@class='ysptblhdr' and contains(text(),'Kicking')]
        div.innerHTML = html;

        var nodes = xpath(document, "//tr[@class='yspsctbg']/td[@class='ysptblhdr' and contains(text(),'Passing')]");
        var i = nodes.snapshotLength;
        var stats = null;

        //passing
        if (!i) {
            return stats;
        } else {
            stats = new Object();
            var table = nodes.snapshotItem(0).parentNode.parentNode;
            var rows = table.childNodes;

            for (var j=0; j < rows.length; j++) {
                if (rows[j].childNodes[1]) {
                    var name = rows[j].childNodes[1].innerHTML;

                    if (name.indexOf(playerName) > -1) {
                        /*
                            comp - 3
                            att - 5
                            yds - 7
                            pct - 9
                            yds/att - 11
                            sack - 13
                            yds lost - 15
                            td - 17
                            int - 19
                        */
                        stats.TD = rows[j].childNodes[17];
                        break;
                    }
                }
                /*
                for (var k=0; k < rows[j].childNodes.length; k++ ) {
                    GM_log(j);
                    GM_log(rows[j].childNodes[k].innerHTML);
                }
                */
            }

            return stats;
        }

    }

    function processFantasyHome(nodes) {
        for (var i = 0; i < 1; i++) {
        //for (var i = 0; i < nodes.snapshotLength; i++) {

            var playerNode = nodes.snapshotItem(i);
            var playerName = playerNode.text;
            var playerRow = playerNode.parentNode.parentNode.parentNode;

            var boxScoreUrl = playerRow.childNodes[6]
                    .getElementsByTagName("A")[0]
                    .getAttribute("href").replace('recap','boxscore');

            var fantasyPtsColumn = playerRow.childNodes[10];
            getDocument(boxScoreUrl, playerName, fantasyPtsColumn);
        }
    }

    var nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@class='name']");
    processFantasyHome(nodes);

    //nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@href]");
    //processFantasyHome(nodes);
})();