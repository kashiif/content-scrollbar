'use strict';
var EXPORTED_SYMBOLS = ['utils'];

var utils = {
	_handleStartup: function (url) {
		var oldVersion = '__version__';
		var currVersion = '__version__';
		
		try {
			oldVersion = this._prefService.getCharPref('version');
		}
		catch(e) {}
		
		if (oldVersion != currVersion) {
			this._prefService.setCharPref('version', currVersion);
			try {
				setTimeout(function() { 
					try {
						openUILinkIn( url, 'tab');
					} 
					catch(e) {}
				;},100);
			}
			catch(e) {}
		}
	},

	_getPrefService: function(key) {
		var prefService = null;
		try 
		{
			prefService = gPrefService;
		}
		catch(err)
		{
			// gPrefService not available in SeaMonkey
			prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService);
		}
		
		prefService = prefService.getBranch(key);
		return prefService;
	},
}