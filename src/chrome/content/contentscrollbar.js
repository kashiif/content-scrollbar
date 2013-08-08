'use strict';
var contentScrollbar = {
	WINDOW_SCROLL_DURATION: 800, //-// Not used
	MAX_HEADING_SIZE: 3,
	FILTER_HEADINGS: false,
	MIN_MARKER_Z_INDEX:100001,
	_prefService: null,
	_headingMarkers: null,
	_reservedYPosition: null,
	_resevervedYPositionLength: 28,
	_resizeTimeout: null,
	_g:null,
  _appId: null,

	init: function(evt) {
		window.removeEventListener('load', contentScrollbar.init);
		window.setTimeout(function() {
			contentScrollbar._delayedInit();
		}, 50);
	},

	_delayedInit: function() {
		Components.utils.import('resource://content-scrollbar/common/kashiif-shared.jsm', this);

		if (typeof(gBrowser) == undefined) {
			// gBrowser is not available in Seamonkey
			this._g = doc.getElementById('content');			
		} else {
			this._g = gBrowser;
		}

    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                            .getService(Components.interfaces.nsIXULAppInfo);
    this._appId = appInfo.ID;
                            
		this._g.addEventListener('load', this.handleContentDocLoad, true);
		this._g.tabContainer.addEventListener('TabSelect', this.handleTabSelected, false);

		window.addEventListener('resize', this.windowResizeHandlerDirect, false);
		window.addEventListener('unload', this.unload, false);

		this._prefService = this.utils._getPrefService('extensions.contentscrollbar.');
	    this._prefService.QueryInterface(Components.interfaces.nsIPrefBranch2).addObserver('',this,false);

		this._stringBundle = Components.classes['@mozilla.org/intl/stringbundle;1']  
						        .getService(Components.interfaces.nsIStringBundleService)  
						        .createBundle('chrome://content-scrollbar/locale/contentscrollbar.properties');

	},
  
  _isSeaMonkey: function() {
    const SEAMONKEY_APP_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
    return (this._appId == SEAMONKEY_APP_ID);
  },

	observe: function(subject, topic, data){
		if (topic != 'nsPref:changed'){
		  return;
		}
		if (data == 'textlength'){
			//Components.utils.reportError('textlegth changed');
		}
		else if (data == 'status'){
			//Components.utils.reportError('status changed');
		}
		else if (data == 'backgroundcolor'){
			//Components.utils.reportError('backgroundcolor changed');
		}
		else if (data == 'color'){
			//Components.utils.reportError('color changed');
		}
	},

	unload: function(evt) {
		contentScrollbar._g.removeEventListener('load', contentScrollbar.handleContentDocLoad);
		contentScrollbar._g.tabContainer.removeEventListener('TabSelect', contentScrollbar.handleTabSelected);
		window.removeEventListener('resize', contentScrollbar.windowResizeHandlerDirect);
		window.removeEventListener('unload', contentScrollbar.unload);
		contentScrollbar._g = null;
	}, 

	handleTabSelected: function(evt) {
		contentScrollbar._updateButton();
	},

	_updateButton: function() {
		var brdcaster = document.getElementById('contentscrollbar-broadcaster');

		var filter = 'url(chrome://content-scrollbar/skin/filter.svg#grayscale)';

  		//contentWin is the XUL element of the browser that's just been selected
		var contentWin = contentScrollbar._g.selectedBrowser;
		
    var isSeamonkey = this._isSeaMonkey();
    
		if (! this._isValidScheme(contentWin.contentDocument.location.href)) {
			if (isSeamonkey) {
        brdcaster.setAttribute('disabled', true);
      }
			brdcaster.setAttribute('tooltiptext', this._stringBundle.GetStringFromName('unavailabletooltip'));
			// Seamonkey greys out toolbar button by putting images dynamically, so grayscale the button
			brdcaster.style.filter = filter;
			return;
		}
		if (isSeamonkey) {
      brdcaster.setAttribute('disabled', false);
    }

		var keyLabel = 'disabledlabel';
		var keyTooltip = 'disabledtooltip';
		if((contentWin.__soc_options == undefined && this._prefService.getBoolPref('autoenabledonnewtab')) 
			|| contentWin.__soc_options.enabled) {
				filter= 'none';
				keyLabel = 'enabledlabel';
				keyTooltip = 'enabledtooltip';
		}
		brdcaster.style.filter = filter;
		brdcaster.setAttribute('label', this._stringBundle.GetStringFromName(keyLabel));
		brdcaster.setAttribute('tooltiptext', this._stringBundle.GetStringFromName(keyTooltip));
	},

	handleContentDocLoad: function(evt) {
		var doc = contentScrollbar._getContentDoc(evt.originalTarget);
		if (doc) {
			var contentWin = contentScrollbar._g.getBrowserForDocument(contentScrollbar._g.contentDocument);
			if(contentWin.__soc_options == undefined) {
				// Must be new tab
				contentWin.__soc_options = { enabled:contentScrollbar._prefService.getBoolPref('autoenabledonnewtab')};
				contentScrollbar._updateButton();
			}			
			if (doc.head) {
				if (contentWin.__soc_options.enabled) {
					contentScrollbar._createHeadingMarkers(doc);
				}
			}
		}
	},
	
	_isValidScheme: function(href) {		
		var loc = href.trim().toLowerCase();
		var scheme = '';

		var index = loc.indexOf('://');
		if (index > 0) {
			var start = index-5;
			if (start>=0) {
				//5 characters extracted
				scheme = loc.substring(start, index);
				if (scheme == 'https') return true;
				if (start == 0) return false;
			}
			start = index-4;
			if (start>=0) {
	 			scheme = loc.substring(start, index);
				return (scheme == 'http' || scheme=='file');
			}
		}
		return false;
	},

	/*
	Returns the content document of the loaded page.
	*/
	_getContentDoc: function(doc) {		
		if (doc instanceof HTMLDocument) {					
			if (this._isValidScheme(doc.location.href)) {
				// is this an inner frame?  
				if (doc.defaultView.frameElement) {  
				  // Frame within a tab was loaded.  
				  // Find the root document:  
				  while (doc.defaultView.frameElement) {  
					doc = doc.defaultView.frameElement.ownerDocument;  
				  }  
				}
			}
			else {
				doc = null;
			}
		}
		else {
			doc = null;
		}
		return doc;
	},
		
	_getCsbStylesheet: function(doc) {
		var styleSheet = null;
		for(var i=0 ; i<doc.styleSheets.length; i++) {
			var s1 = doc.styleSheets[i];
			if (s1.href == 'resource://content-scrollbar/skin/cs-client.css') {
				styleSheet = s1;
				break;
			}
		}
		return styleSheet;
	},

	_createHeadingMarkers: function(doc)	{
		contentScrollbar._removeExistingMarkers(doc);
		
		var status = contentScrollbar._prefService.getCharPref('status').toLowerCase();
		if (status == 'disabled') {
			return;
		}

		if(doc.__soc_processed == undefined) {	
			// insert css file
			var nodeToInsert = doc.createElement('link');
			nodeToInsert.setAttribute('rel', 'stylesheet');
			nodeToInsert.setAttribute('type', 'text/css');
			nodeToInsert.setAttribute('href', 'resource://content-scrollbar/skin/cs-client.css');
			doc.head.appendChild(nodeToInsert);

			doc.__soc_processed = true;
		}
		else {
			//Delete existing heading markers if they already exist
			delete contentScrollbar._headingMarkers;
		}
		
		
		var targetStyleSheet = contentScrollbar._getCsbStylesheet(doc);
		if (targetStyleSheet) {
			window.setTimeout( function() {
				var d = doc;
				var ss = contentScrollbar._getCsbStylesheet(d);
				contentScrollbar._setBgColor(d);
				contentScrollbar._setColor(d);

				if (status == 'minimized') {
					var rule = ss.cssRules[3]; // .kashiif_soc_marker_span
					rule.style.display = 'none';
				}
			}, 200);
		}
				
		contentScrollbar._headingMarkers = new contentScrollbar.HeadingMarkers();

		// Check if headings exist on the page and create markers if they do.
		var maxHeadingSize = contentScrollbar._prefService.getIntPref('maxheadingsize');
		for( var i = 1; i <= maxHeadingSize; i++ ) {
			var headingTagName = 'h' + i;
			var headings = doc.getElementsByTagName(headingTagName);
			if(headings.length > 0)
				contentScrollbar._headingMarkers.init(doc, headingTagName, headings );
		}
		
		/*------------------------------------------------
		  Set initial markers position and reposition them if window is resized or document 
		  height changes.
		------------------------------------------------*/
		
		contentScrollbar._headingMarkers.setPosition(doc);
	},
	
	_removeExistingMarkers: function(doc) {
		var nodeList = doc.body.querySelectorAll('.kashiif_soc_marker');
		
		for (var i=0 ; i<nodeList.length; i++) {
			var c = doc.getElementById(nodeList[i].id);
			if (c) { doc.body.removeChild(c); }
		}	
	},
	
	_getBackGroundColor: function(factor) {
		if (!factor) {
			factor = '0.78';
		}
		var bgColor = 'rgba(' + contentScrollbar._prefService.getCharPref('backgroundcolor') + ', ' + factor + ' )' ;
		return bgColor;
	},
	
	setMarkersVisibility: function(doc, isHidden) {
		var nodeList = doc.body.querySelectorAll('.kashiif_soc_marker');

		var visibility = 'visible';
		var opacity = '100';

		if (isHidden) {
			visibility = 'hidden';
			opacity = '0';
		}

		for (var i=0 ; i<nodeList.length; i++) {
			var s = nodeList[i].style;
			s.opacity = opacity;			
			s.visibility = visibility;
		}
	},
	
	_setBgColor: function(doc) {
		var styleSheet = this._getCsbStylesheet(doc);
		var bg = this._getBackGroundColor();

		var rule = styleSheet.cssRules[0]; // .kashiif_soc_marker
		rule.style.backgroundColor = bg;
		rule.style.boxShadow = '0px 0px 4px rgba(' + this._prefService.getCharPref('backgroundcolor') + ', 0.7)';
		rule.style.fill = bg; // to be inherited by .kashiif_soc_marker_arrow
		
		rule = styleSheet.cssRules[1]; //.kashiif_soc_marker:hover
		rule.style.backgroundColor = this._getBackGroundColor('1.0');
	},

	_setColor: function(doc) {
		var styleSheet = this._getCsbStylesheet(doc);

		var rule = styleSheet.cssRules[0]; // .kashiif_soc_marker
		rule.style.color = 'rgb(' + this._prefService.getCharPref('color') + ')'; // to be inherited by .kashiif_soc_marker_arrow
	},

	windowResizeHandlerDirect: function(evt) {
		//alert('resize ' + evt.target + ' ' + evt.originalTarget.document);
		var doc = contentScrollbar._getContentDoc(evt.originalTarget.document);
		if (doc) {
			//contentScrollbar._targetDoc = doc;
			if (contentScrollbar._resizeTimeout) {
				clearTimeout(contentScrollbar._resizeTimeout);
			}
			contentScrollbar._resizeTimeout = setTimeout( function() { if (contentScrollbar._headingMarkers) { contentScrollbar._headingMarkers.windowResizeHandler(doc);} }, 500);
		}
	},
	
	/*------------------------------------------------
	  creates a new canvas element, draws an arrow 
	  pointer, and returns it.
	------------------------------------------------*/
	_createArrow: function (doc, markerBackgroundColor) {
		var xmlns = "http://www.w3.org/2000/svg";
	    var arrowCanvas = doc.createElementNS(xmlns, 'svg');
	    arrowCanvas.setAttributeNS(null, 'width', '6px');
	    arrowCanvas.setAttributeNS(null, 'height', '10px');
	    arrowCanvas.setAttribute('class', 'kashiif_soc_marker_arrow');

	    var polygon = doc.createElementNS(xmlns, 'polygon');
	    polygon.setAttributeNS(null, 'points', '0,0 5,4 5,6 0,10');

	    var path = doc.createElementNS(xmlns, 'path');
	    path.setAttributeNS(null, 'd', 'M5,4 Q7,5 5,6');

	    polygon.appendChild(path);
	    arrowCanvas.appendChild(polygon);

	    return arrowCanvas;
	},
	
	HeadingMarkers: function() {
		var socMarkerIDArray = new Array();
		
		this.init = function(doc, headingTagName, headings) {
		
			var textLength = contentScrollbar._prefService.getCharPref('textlength');
			var markerBackgroundColor = contentScrollbar._getBackGroundColor();
			
      var container = doc.getElementById('kashiif_soc_marker_container');

      if (!container) {
        container = doc.createElement('div');
        container.setAttribute('id', 'kashiif_soc_marker_container');
      }
      
			for( var i = 0; i < headings.length; i++ ) {
				var headingText = headings[i].textContent.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s{2,}/, ' ');
				
				/*------------------------------------------------
				  Filter heading
				------------------------------------------------*/
				var filteredHeading = null;
				if(contentScrollbar.FILTER_HEADINGS == true)
					filteredHeading = headingFilters.filterHeading( headings[ i ] );
				else
					filteredHeading = { markHeading: true, filteredHeadingText: headingText };
				
				var markerText = filteredHeading.filteredHeadingText;
				switch(textLength) {
					case 'firstThreeWords':
						var lastIndex = 0;
						var appendDots = '';
						var count=0;
						for (; count<3; count++) {
							var temp = lastIndex;
							lastIndex = markerText.indexOf(' ', lastIndex+1);
							if (lastIndex == -1) {
								lastIndex = markerText.length;
								break;								
							}
						}
						
						if (lastIndex < markerText.length) {
							appendDots = '...';
						}
						
						markerText = markerText.substring(0, lastIndex) + appendDots;
						break;
					
					case 'firstTenCharacters':
						if(markerText.length > 10)
							markerText = markerText.substr(0, 10) + '...';
						break;
				}
				
				if( filteredHeading.markHeading == true ) {
					var markerID = 'soc_' + headingTagName + '_' + ( i + 1 );
					//-*-//var headingY = contentScrollbar._headingMarkers.findPosition( headings[ i ] ).topPos;
					
					/*------------------------------------------------
					  Store each marker's info
					------------------------------------------------*/
					
					socMarkerIDArray.push( markerID );
					
					contentScrollbar._headingMarkers[ markerID ] = { domObject: headings[ i ],
													markerID: markerID,
													tagName: headingTagName,
													headingText: filteredHeading.filteredHeadingText,
													markerText: markerText,
													targetY: 0
													};
					
					/*------------------------------------------------
					  Create a new marker
					------------------------------------------------*/
					
					var newMarker = contentScrollbar._headingMarkers.create(doc, markerID );
					var markerArrow = contentScrollbar._createArrow(doc, markerBackgroundColor);
					
					newMarker.appendChild( markerArrow );
										
					/*------------------------------------------------
					  Add new marker to document
					------------------------------------------------*/
					
					container.appendChild( newMarker );
				}
			}
      
      doc.body.appendChild(container);
		}
		
		this.create = function(doc, markerID) {
			var currentHeading = contentScrollbar._headingMarkers[ markerID ];
			var newMarker = doc.createElement( 'div' );
			newMarker.setAttribute( 'id', markerID );
			newMarker.setAttribute( 'class', 'kashiif_soc_marker' );
			
			var spanElement = doc.createElement('span');
			spanElement.setAttribute( 'class', 'kashiif_soc_marker_span' );
			spanElement.textContent = currentHeading.markerText;

			newMarker.appendChild(spanElement);
			
			//-//if( socMarkerDisplay == "minimized" )
				//-//$(newMarker).find(".soc_marker_span").css( { "display": "none" } );
			
			var headingHierarchy = currentHeading.tagName.split('h')[ 1 ];
			var newMarkerZIndex = contentScrollbar.MIN_MARKER_Z_INDEX + contentScrollbar._prefService.getIntPref('maxheadingsize') - headingHierarchy;
			
			//-// newMarker.style = 'z-index:' + newMarkerZIndex + ';display:none;';
			newMarker.style.zIndex = newMarkerZIndex;
			
			
			// Store new marker z-index
			currentHeading.zIndex = newMarkerZIndex;
			
			return newMarker;
		}
		
		/*------------------------------------------------
		  findPosition()
		  
		  Finds an html element's position relative to 
		  the document.
		------------------------------------------------*/
		
		this.findPosition = function( obj ) {
			var leftPos, topPos;
			leftPos = topPos = 0;
			
			do {
				leftPos += obj.offsetLeft;
				topPos += obj.offsetTop;
			}
			while (obj = obj.offsetParent);
			
			return { 'leftPos': leftPos, 'topPos': topPos };
		}
		
		this.setPosition = function(doc) {
			// Components.util.reportError('setPosition: ' + doc);

			var windowHeight = doc.defaultView.innerHeight; //window.innerHeight;
			var winToDocHeightRatio = windowHeight / doc.documentElement.scrollHeight;
			var markerNum = socMarkerIDArray.length;
			
			/*
			alert(  'doc.body.clientHeight: ' + doc.body.clientHeight
				  + '\ndoc.body.scrollHeight: ' + doc.body.scrollHeight
				  + '\nwindow.innerHeight: ' + window.innerHeight 
				  + '\ndoc.defaultView.innerHeight: ' + doc.defaultView.innerHeight
				  + '\nwinToDocHeightRatio doc element: ' + windowHeight / doc.documentElement.scrollHeight
				  + '\nwinToDocHeightRatio body element: ' + windowHeight / doc.body.scrollHeight);
			//*/

			var preventOverlap = contentScrollbar._prefService.getBoolPref('preventoverlap');
			
			if( preventOverlap )
				contentScrollbar._reservedYPosition = new Array();
			
			for( var i = 0; i < markerNum; i++ ) {
				var markerID = socMarkerIDArray[ i ];
				
				/*------------------------------------------------
				  Update each marker's targetY
				------------------------------------------------*/
				var currentHeadingMarker = contentScrollbar._headingMarkers[ markerID ];
				var newTargetY = contentScrollbar._headingMarkers.findPosition( currentHeadingMarker.domObject ).topPos;
				
				currentHeadingMarker.targetY = newTargetY;
				/*------------------------------------------------
				  Reserve y positions then place each marker
				------------------------------------------------*/
				
				var markerY = Number( ( winToDocHeightRatio * currentHeadingMarker.targetY ).toFixed() );
				//var markerY = currentHeadingMarker.targetY;
				var preventOverlap = contentScrollbar._prefService.getBoolPref('preventoverlap');
				if( preventOverlap ) {
					// Check if y position is reserved
					for( var j = 0; j < contentScrollbar._reservedYPosition.length; j++ )
					{
						if( markerY == contentScrollbar._reservedYPosition[ j ] )
							markerY = markerY + 1;
					}
					
					currentHeadingMarker.reservedY = new Array();
					
					for( var k = 0; k < contentScrollbar._resevervedYPositionLength; k++ )
					{
						currentHeadingMarker.reservedY.push( markerY + k );
						contentScrollbar._reservedYPosition.push( markerY + k );
					}					
				}
				
				//alert(markerID + ', newTargetY: ' + newTargetY + ', markerY:'+markerY + ', winToDocHeightRatio: '+ winToDocHeightRatio);
				var markerObject = doc.getElementById(markerID);
				markerObject.style.top = markerY + 'px';
				markerObject.setAttribute('data-newTargetY', newTargetY);
				markerObject.addEventListener('click', function(evt) { 
						var newEvt = this.ownerDocument.createEvent('Events');  
						newEvt.initEvent('contentScrollbar_MarkerClicked', true, true);  
						this.dispatchEvent(newEvt);
					}, false );
			}
		}
		
		this.windowResizeHandler= function(doc) {
			contentScrollbar._headingMarkers.setPosition(doc);
			contentScrollbar._resizeTimeout = null;
		}		
	
		this.getMarkerIds = function() {
			return socMarkerIDArray;
		}
	},

	handleToolbarButtonClick: function(evt) {
		var doc = contentScrollbar._g.contentDocument; 
		var win = contentScrollbar._g.getBrowserForDocument(doc);
		var winOptions = win.__soc_options;
		winOptions.enabled = !winOptions.enabled;

		if (winOptions.enabled) {
			if (doc.__soc_processed) {
				// markers already present, simply show them
				contentScrollbar.setMarkersVisibility(doc, false);
			}
			else {
				contentScrollbar._createHeadingMarkers(doc);
			}
		}
		else {
			contentScrollbar.setMarkersVisibility(doc, true);
		}
		contentScrollbar._updateButton();
	},

	HeadingFilters: function(){
		this.filterHeading = function(currentHeading) {
			var headingText = currentHeading.innerText.toLowerCase();
			var locationHost = location.host;
			var markHeading, filteredHeadingText;
						
			if(headingText == "")	{
				// Don't create marker for empty headings
						
				markHeading = false;
			}
			else if(locationHost.indexOf('wikipedia.org') != -1)
			{
				// Remove "[Edit]" and its equivalent in other languages in wikipedia headings
						
				var newHeadingText = headingText.replace( /\[\w*\]/, '' );
				filteredHeadingText = newHeadingText;
				
				markHeading = true;
			}
			else if(locationHost.indexOf( 'yahoo' ) != -1)
			{
				var attrClass = currentHeading.getAttribute( 'class' );
				if(attrClass)
				{
					if( attrClass.indexOf('oops') != -1)
						markHeading = false;
					else if( attrClass.indexOf('y-ftr-txt-hdr') != -1)
						markHeading = false;
					else if( attrClass.indexOf('title-date') != -1 )
						markHeading = false;
					else if( attrClass.indexOf('y-txt-1') != -1 && attrClass.indexOf('title') != -1 )
						markHeading = false;
					else if( attrClass.indexOf('y-txt-5') != -1 && attrClass.indexOf('alt-title') != -1 )
						markHeading = false;
					/* replaced by a more specific condition below
					else if( attrClass.indexOf('y-txt-modhdr') )
						markHeading = false;*/
					else if( attrClass.indexOf('y-txt-modhdr') != -1 && currentHeading.getElementsByTagName( "div" )[ 0 ] != undefined )
						markHeading = false;
					else if( currentHeading.getAttribute('id') )
					{
						if( currentHeading.getAttribute('id').indexOf('u_2588582-p-lbl') != -1 )
							markHeading = false;
						else
						{
							filteredHeadingText = headingText;
							markHeading = true;
						}
					}
					else
					{
						filteredHeadingText = headingText;
						markHeading = true;
					}
				}
				else
				{
					filteredHeadingText = headingText;
					markHeading = true;
				}
			}
			else if(locationHost.indexOf('wikia.com') != -1)
			{
				// Remove "Edit" in wikia.com's wikis headings
						
				var newHeadingText = headingText.replace( /edit/i, '');
				filteredHeadingText = newHeadingText;
				
				markHeading = true;
			}
			else
			{	
				filteredHeadingText = headingText;
				markHeading = true;
			}
			
			return { markHeading: markHeading, filteredHeadingText: filteredHeadingText };
		}
	},

	handleMarkerClicked: function(evt) {
    var scrollTarget = evt.target.getAttribute('data-newTargetY'),
        clientWin = evt.target.ownerDocument.defaultView;
    if (this._prefService.getBoolPref('animatedscroll')) {
      this.clientWindowScroller.beginScroll(scrollTarget, clientWin);
    }
    else {
      clientWin.scrollBy(0,scrollTarget - clientWin.pageYOffset);
    }
	},


	clientWindowScroller : {
	  step: 30,
	  interval: 60,
	  activeScrollTarget: null,
	  activeTimeout: null,
	  beginScroll: function(scrollTarget, clientWin) {
      if (this.activeScrollTarget != scrollTarget) {
        window.clearTimeout(this.activeTimeout);
          this.activeScrollTarget = scrollTarget;
      }
      this.animatedScroll(scrollTarget, this.step, clientWin);
    },
    animatedScroll: function (scrollTarget, theStep, clientWin) {
      var t = null;
      var scrollAmount = scrollTarget - clientWin.pageYOffset;
      
      if (scrollAmount>0) {
        if (clientWin.pageYOffset + clientWin.innerHeight >= clientWin.document.documentElement.scrollHeight) {
          // scroll has reached at its maximum value. No More Scrolling possible
          this.activeTimeout = t;
          return;
        }
      }

			var scrollAmountAbs = Math.abs(scrollAmount);
	    if (scrollAmountAbs>theStep) {
        scrollAmount = (scrollAmount<0?-theStep:theStep);
        t = window.setTimeout( function(e) { contentScrollbar.clientWindowScroller.animatedScroll(scrollTarget,theStep+10, clientWin); },this.interval);
	    }
	    clientWin.scrollBy(0,scrollAmount);
      this.activeTimeout = t;
	  }
}	
	
};

/*
gBrowser.addEventListener
(
  'load', 
  function (e) { contentScrollbar.init(e); },
  true
);
*/

window.addEventListener
(
  'load', 
  contentScrollbar.init,
  true
);


// Reference: https://developer.mozilla.org/en/Code_snippets/Interaction_between_privileged_and_non-privileged_pages
// The last value is a Mozilla-specific value to indicate untrusted content is allowed to trigger the event.  
window.addEventListener('contentScrollbar_MarkerClicked', function(e) { contentScrollbar.handleMarkerClicked(e); }, false, true); 

//*/
contentScrollbar._headingFilters = new contentScrollbar.HeadingFilters();