(function() {
	"use strict";

	function parseList(value) {
		return $tw.utils.parseStringArray(value || "") || [];
	}

	function getField(ctx,wiki,title,field) {
		if(!field) {
			return "";
		}
		var key = title + "\u0000" + field;
		if(ctx.fieldCache[key] !== undefined) {
			return ctx.fieldCache[key];
		}
		var t = wiki.getTiddler(title);
		if(!t) {
			ctx.fieldCache[key] = "";
			return "";
		}
		var v = t.getFieldString(field);
		var out = (v || "").trim();
		ctx.fieldCache[key] = out;
		return out;
	}

	function escHtml(text) {
		return String(text || "")
			.replace(/&/g,"&amp;")
			.replace(/</g,"&lt;")
			.replace(/>/g,"&gt;")
			.replace(/\"/g,"&quot;");
	}

	function escAttr(text) {
		return escHtml(text);
	}

	function isUnlinkedInToc(wiki,title) {
		var t = wiki.getTiddler(title);
		if(!t) {
			return false;
		}
		if((t.getFieldString("toc-link") || "") === "no") {
			return true;
		}
		if((t.getFieldString("type") || "") === "text/vnd.tiddlywiki") {
			var text = t.fields.text;
			if(text === undefined || text === null) {
				return true;
			}
			if(String(text).trim() === "") {
				return true;
			}
		}
		return false;
	}

	function renderTitleLabel(ctx,wiki,title) {
		if(ctx.labelCache[title] !== undefined) {
			return ctx.labelCache[title];
		}
		var safe = escHtml(title);
		if(isUnlinkedInToc(wiki,title)) {
			ctx.labelCache[title] = '<span class="toc-item-muted">' + safe + '</span>';
			return ctx.labelCache[title];
		}
		ctx.labelCache[title] = '<$link to="' + safe + '">' + safe + '</$link>';
		return ctx.labelCache[title];
	}

	function renderTocCaption(labelMarkup) {
		return '<span class="tc-toc-caption tc-tiny-gap-left">' + labelMarkup + '</span>';
	}

	function wrapOl(itemsMarkup) {
		return '<ol class="tc-toc toc-selective-expandable toc-selective-expandable-pruned mh-facet-tree">' + (itemsMarkup || "") + '</ol>';
	}

	function getScopeId(ctx,scope) {
		var id = ctx.scopeIds.get(scope);
		if(id) {
			return id;
		}
		ctx.nextScopeId += 1;
		id = String(ctx.nextScopeId);
		ctx.scopeIds.set(scope,id);
		return id;
	}

	function axisBuckets(ctx,wiki,scope,field) {
		var cacheKey = field + "\u0000" + getScopeId(ctx,scope);
		if(ctx.bucketCache[cacheKey]) {
			return ctx.bucketCache[cacheKey];
		}
		var map = Object.create(null), hasUndefined = false, undefinedTitles = [];
		scope.forEach(function(title) {
			var v = getField(ctx,wiki,title,field);
			if(v) {
				if(!map[v]) { map[v] = []; }
				map[v].push(title);
			} else {
				hasUndefined = true;
				undefinedTitles.push(title);
			}
		});
		var values = Object.keys(map).sort(function(a,b){return a.localeCompare(b);});
		ctx.bucketCache[cacheKey] = {map: map, values: values, hasUndefined: hasUndefined, undefinedTitles: undefinedTitles};
		return ctx.bucketCache[cacheKey];
	}

	function isAxisUseful(buckets) {
		if(buckets.values.length >= 2) {
			return true;
		}
		if(buckets.values.length === 1 && buckets.hasUndefined) {
			return true;
		}
		return false;
	}

	function renderRecords(ctx,scope) {
		var scopeId = getScopeId(ctx,scope);
		if(ctx.recordsCache[scopeId] !== undefined) {
			return ctx.recordsCache[scopeId];
		}
		var out = [];
		scope.slice().sort(function(a,b){return a.localeCompare(b);}).forEach(function(title) {
			out.push('<li class="toc-item">' + renderTitleLabel(ctx,$tw.wiki,title) + '</li>');
		});
		ctx.recordsCache[scopeId] = out.join("\n");
		return ctx.recordsCache[scopeId];
	}

	function makeStateTitle(ctx,path) {
		ctx.counter += 1;
		return "$:/state/facet-tree/" + ctx.stateRoot + "/" + path.join("/") + "/" + ctx.counter;
	}

	function makeChildMacroCall(ctx,scopeTitles,remainingFields,path) {
		var scopeList = $tw.utils.stringifyList(scopeTitles || []);
		var fieldsList = $tw.utils.stringifyList(remainingFields || []);
		var pathList = $tw.utils.stringifyList(path || []);
		return '<$macrocall $name="facet-tree-js" domain="' + escAttr(ctx.domain) + '" scope="' + escAttr(scopeList) + '" fields="' + escAttr(fieldsList) + '" path="' + escAttr(pathList) + '"/>';
	}

	function renderExpandable(labelMarkup,childMarkup,stateTitle) {
		var state = escAttr(stateTitle);
		var caption = renderTocCaption(labelMarkup);
		var out = [];
		out.push('<li class="toc-item mh-facet-item">');
		out.push('<$reveal type="nomatch" stateTitle="' + state + '" text="open">');
		out.push('<$button setTitle="' + state + '" setTo="open" class="tc-btn-invisible tc-popup-keep">');
		out.push('<$transclude tiddler=<<toc-closed-icon>> />' + caption + '</$button>');
		out.push('</$reveal>');
		out.push('<$reveal type="match" stateTitle="' + state + '" text="open">');
		out.push('<$button setTitle="' + state + '" setTo="close" class="tc-btn-invisible tc-popup-keep">');
		out.push('<$transclude tiddler=<<toc-open-icon>> />' + caption + '</$button>');
		out.push('</$reveal>');
		out.push('<$reveal type="match" stateTitle="' + state + '" text="open">');
		out.push(childMarkup || "");
		out.push('</$reveal>');
		out.push('</li>');
		return out.join("\n");
	}

	function renderValuesLayer(wiki,scope,axis,remainingAxes,ctx,path,buckets) {
		var out = [];
		buckets.values.forEach(function(v) {
			var child = buckets.map[v] || [];
			if(!child.length) { return; }
			var nextPath = path.concat(["value",axis.field,v]);
			var macro = makeChildMacroCall(ctx,child,remainingAxes.map(function(a){ return a.field; }),nextPath);
			out.push(renderExpandable(renderTitleLabel(ctx,wiki,v),macro,makeStateTitle(ctx,nextPath)));
		});
		if(buckets.hasUndefined) {
			var undef = buckets.undefinedTitles;
			if(undef.length) {
				var undefPath = path.concat(["value",axis.field,"__undef__"]);
				var undefMacro = makeChildMacroCall(ctx,undef,remainingAxes.map(function(a){ return a.field; }),undefPath);
				out.push(renderExpandable("&lt;not defined&gt;",undefMacro,makeStateTitle(ctx,undefPath)));
			}
		}
		return out.join("\n");
	}

	function renderNode(wiki,scope,axes,ctx,path) {
		if(!scope.length) {
			return "";
		}
		var useful = [];
		axes.forEach(function(axis) {
			var buckets = axisBuckets(ctx,wiki,scope,axis.field);
			if(isAxisUseful(buckets)) {
				useful.push({axis: axis, buckets: buckets});
			}
		});
		if(useful.length === 0) {
			return renderRecords(ctx,scope);
		}
		var out = [];
		out.push(renderExpandable("All",wrapOl(renderRecords(ctx,scope)),makeStateTitle(ctx,path.concat(["all"]))));
		useful.forEach(function(info) {
			var axis = info.axis;
			var remaining = axes.filter(function(a){ return a.field !== axis.field; });
			var axisPath = path.concat(["axis",axis.field]);
			var axisBody = renderValuesLayer(wiki,scope,axis,remaining,ctx,axisPath,info.buckets);
			if(axisBody) {
				out.push(renderExpandable(escHtml(axis.caption),wrapOl(axisBody),makeStateTitle(ctx,axisPath)));
			}
		});
		return out.join("\n");
	}

	exports.name = "facet-tree-js";
	exports.params = [
		{name: "domain"},
		{name: "scope"},
		{name: "fields"},
		{name: "path"}
	];

	exports.run = function(domain,scopeParam,fieldsParam,pathParam) {
		var wiki = this.wiki;
		if(!domain) {
			return "";
		}
		var domainTid = wiki.getTiddler(domain);
		if(!domainTid) {
			return "";
		}
		var facetType = domainTid.getFieldString("facet-type");
		if(!facetType) {
			return "";
		}
		var vectors = parseList(domainTid.getFieldString("facet-vectors"));
		var fieldAllow = parseList(fieldsParam || "");
		var allowMap = Object.create(null);
		fieldAllow.forEach(function(f){ allowMap[f] = true; });
		var axes = vectors.map(function(vt) {
			var t = wiki.getTiddler(vt);
			if(!t) { return null; }
			var field = t.getFieldString("facet-field");
			if(!field) { return null; }
			if(fieldAllow.length && !allowMap[field]) { return null; }
			return {
				field: field,
				caption: t.getFieldString("facet-caption") || field
			};
		}).filter(Boolean);

		var scope = parseList(scopeParam || "");
		if(!scope.length) {
			wiki.each(function(tiddler,title) {
				if((tiddler.getFieldString("facet-item") || "") === facetType) {
					scope.push(title);
				}
			});
		}
		var currentTiddler = this.getVariable("currentTiddler") || "";
		var ctx = {
			counter: 0,
			stateRoot: encodeURIComponent(domain) + "/" + encodeURIComponent(currentTiddler),
			domain: domain,
			fieldCache: Object.create(null),
			labelCache: Object.create(null),
			bucketCache: Object.create(null),
			recordsCache: Object.create(null),
			scopeIds: new WeakMap(),
			nextScopeId: 0
		};
		var path = parseList(pathParam || "");
		if(!path.length) {
			path = ["root"];
		}
		var body = renderNode(wiki,scope,axes,ctx,path);
		return wrapOl(body);
	};
})();
