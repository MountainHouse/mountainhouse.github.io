(function() {
	"use strict";

	exports.fieldis = function(source,operator,options) {
		var fieldName = operator.operand || "",
			expected = operator.suffix || "",
			results = [];

		if(!fieldName) {
			return results;
		}

		source(function(tiddler,title) {
			var t = options.wiki.getTiddler(title);
			if(!t || !Object.prototype.hasOwnProperty.call(t.fields,fieldName)) {
				return;
			}
			if((t.fields[fieldName] || "") === expected) {
				results.push(title);
			}
		});

		return results;
	};

	exports.fieldvar = function(source,operator,options) {
		var fieldName = operator.operand || "",
			varName = operator.suffix || "",
			expected = options.widget && varName ? options.widget.getVariable(varName,"") : "",
			results = [];

		if(!fieldName) {
			return results;
		}

		source(function(tiddler,title) {
			var t = options.wiki.getTiddler(title);
			if(!t || !Object.prototype.hasOwnProperty.call(t.fields,fieldName)) {
				return;
			}
			if((t.fields[fieldName] || "") === expected) {
				results.push(title);
			}
		});

		return results;
	};
})();
