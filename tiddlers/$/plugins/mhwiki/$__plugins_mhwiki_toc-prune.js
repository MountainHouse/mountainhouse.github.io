(function() {
	"use strict";

	function getFieldList(wiki,title,fieldName) {
		var tiddler = wiki.getTiddler(title);
		if(!tiddler) {
			return [];
		}
		return $tw.utils.parseStringArray(tiddler.fields[fieldName]) || [];
	}

	function isReachable(wiki,fromTitle,toTitle,fieldName) {
		if(fromTitle === toTitle) {
			return true;
		}
		var stack = [fromTitle],
			visited = Object.create(null);
		while(stack.length) {
			var current = stack.pop();
			if(visited[current]) {
				continue;
			}
			visited[current] = true;
			var neighbors = getFieldList(wiki,current,fieldName);
			for(var i = 0; i < neighbors.length; i++) {
				var next = neighbors[i];
				if(next === toTitle) {
					return true;
				}
				if(!visited[next]) {
					stack.push(next);
				}
			}
		}
		return false;
	}

	exports.tocprune = function(source,operator,options) {
		var siblings = [],
			results = [],
			fieldName = "tags";

		source(function(tiddler,title) {
			siblings.push(title);
		});

		for(var i = 0; i < siblings.length; i++) {
			var item = siblings[i],
				blocked = false;
			for(var j = 0; j < siblings.length; j++) {
				if(i === j) {
					continue;
				}
				var peer = siblings[j];
				var itemToPeer = isReachable(options.wiki,item,peer,fieldName);
				if(!itemToPeer) {
					continue;
				}
				var peerToItem = isReachable(options.wiki,peer,item,fieldName);
				if(!peerToItem) {
					blocked = true;
					break;
				}
			}
			if(!blocked) {
				results.push(item);
			}
		}

		return results;
	};
})();

