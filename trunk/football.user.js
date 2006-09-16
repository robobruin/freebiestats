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


            /*
            GM_log(playerName);
            GM_log(boxScoreLink);
            GM_log(fantasyPtsColumn.innerHTML);
              */

            getDocument(boxScoreUrl, playerName, fantasyPtsColumn);
        }
    }

    var nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@class='name']");
    processFantasyHome(nodes);

    //nodes = xpath(document, "//table[@id='statTable1']/tbody/tr/td[@class='player']/div/a[@href]");
    //processFantasyHome(nodes);
})();