'use strict';
var contentScrollbarOptions = {
	init: function(evt) {
		window.removeEventListener('load', contentScrollbarOptions.init);
		window.addEventListener('unload', contentScrollbarOptions.uninit, false);
		
		contentScrollbarOptions._processColorField('contentscrollbar-btnmarkercolor', 'contentscrollbar-txtmarkercolor');
		contentScrollbarOptions._processColorField('contentscrollbar-btnfontcolor', 'contentscrollbar-txtfontcolor');

		var headings = document.getElementById('contentscrollbar-txtheadings').value.split(',');
		var chkHeadings = [];

		for (var i=1 ; i<7; i++) {
			chkHeadings.push(document.getElementById('contentscrollbar-chkh' + i));
		}

		for (i=0 ; i<headings.length; i++) {
			var index = (headings[i].charAt(1)) | 0;
			chkHeadings[index].checked = true;
		}
			
		for (i=0 ; i<headings.length; i++) {
			chkHeadings[i].addEventListener('click', contentScrollbarOptions._handleHeadingChanged, false);
		}
	},

	_processColorField: function(colorFieldId, txtBoxId) {
		var c = document.getElementById(txtBoxId).value.split(',');
		var ctrl = document.getElementById(colorFieldId)
		ctrl.color = '#' + contentScrollbarOptions.convertRGBtoHEX(c[0],c[1],c[2]);
		ctrl.addEventListener('change', contentScrollbarOptions._handleColorChanged, false);
	},

	uninit: function(evt) {
		window.removeEventListener('unload', contentScrollbarOptions.uninit);
		ctrl.removeEventListener('change', contentScrollbarOptions._handleColorChanged);
		ctrl.removeEventListener('change', contentScrollbarOptions._handleColorChanged);	

		for (var i=1 ; i<7; i++) {
			var c = document.getElementById('contentscrollbar-chkh' + i);
			c.removeEventListener('click', contentScrollbarOptions._handleHeadingChanged);
		}

	},

	_handleColorChanged: function(evt) {
		var colorField = evt.target;

		var element = colorField.nextElementSibling;
		var rgb = contentScrollbarOptions.convertHEXtoRGB(colorField.color.substring(1));
		element.value = rgb.join(',');

    var customEvt = document.createEvent('Events');
    customEvt.initEvent('change', true, true);
    element.dispatchEvent(customEvt);
	},

	_handleHeadingChanged: function(evt) {
	},

	convertHEXtoRGB: function(hexCode) {		
		var R = Math.round(parseInt(hexCode.substring(0,2),16));
		var G = Math.round(parseInt(hexCode.substring(2,4),16));
		var B = Math.round(parseInt(hexCode.substring(4,6),16));

		R = R<0?0:R;
		G = R<0?0:G;
		B = R<0?0:B;
		
		return new Array(R,G,B);
	},

	convertRGBtoHEX: function(R,G,B) {
		var hexCode = this.toHexCode(R)+this.toHexCode(G)+this.toHexCode(B);
		return hexCode;
	},

	toHexCode: function(x) {
		var str = '0123456789ABCDEF';
		x = Math.round(Math.min(Math.max(0,parseInt(x)),255));
		x = str.charAt((x-x%16)/16) + str.charAt(x%16);
	 	return x;
	}	
}
window.addEventListener('load', contentScrollbarOptions.init, false);