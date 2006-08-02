// ==UserScript==
// @name          fantasysports
// @namespace     http://robobruin.com/greasemonkey/fantasysports
// @description   open box score as a modal
// @include       http://*
// @include       https://*
// ==/UserScript==

(function() {

    var gPopupContainer,gPopFrame;

    function selectNodes(doc, context, xpath) {
	   var nodes = doc.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	   var result = new Array( nodes.snapshotLength );

        for (var x=0; x<result.length; x++)  {
	      result[x] = nodes.snapshotItem(x);
	   }

	   return result;
	}

    function createDiv(doc) {
        var body = doc.getElementsByTagName('body')[0];
        var popcont = doc.createElement('div');
        popcont.id = 'popupContainer';
        popcont.setAttribute('style', 'display:none');
        popcont.innerHTML = '' +
            '<div id="popupInner">' +
                '<div id="popupControls">' +
                    '<a onclick="onclick="function(){this.parentNode.style.display=none;}"><span>Close</span></a>' +
                '</div>' +
                '<iframe src="" style="width:100%;height:100%;background-color:transparent;" scrolling="yes" frameborder="0" allowtransparency="true" id="popupFrame" name="popupFrame" width="100%" height="100%"></iframe>' +
                '<div style="position:center;"><a onclick="function(){this.parentNode.style.display=none;}"><span>Close</span></a></div>' +
            '</div>';
        body.appendChild(popcont);
        gPopupContainer = document.getElementById("popupContainer");
        gPopFrame = document.getElementById("popupFrame");
    }

    function showPopWin(url, width, height) {
        gPopupContainer.style.display = "block";
        gPopupContainer.style.position = 'absolute';

        gPopupContainer.style.zIndex = 201;
        gPopupContainer.style.padding= '0px';

        gPopupContainer.style.top = window.innerHeight/2 + "px";
        gPopupContainer.style.left =  window.innerWidth/3 + "px";

        gPopupContainer.style.width = width + "px";
        gPopupContainer.style.height = height + "px";

        gPopFrame.style.margin = '0px';
        gPopFrame.style.width = '100%';
        gPopFrame.style.heigh = '100%';
        gPopFrame.style.position = 'relative';
        gPopFrame.style.zIndex = '202';

        gPopFrame.src = url;
    }

    var doc = window.document;
    createDiv(doc);

    var aLinks = selectNodes(doc, doc.body, "//td[@class='gametime']/a[@href]");
    for (var i=0; i<aLinks.length; i++) {
        var link = aLinks[i];
        link.addEventListener('click', function(event) {
            showPopWin(event.target.href, 400, 500);
            event.stopPropagation();
            event.preventDefault();
            return false;
            }, false
        );
    }

})();