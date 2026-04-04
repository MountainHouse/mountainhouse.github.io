/*\
title: $:/plugins/mhwiki/fs-watch-reload/watch-reload.js
type: application/javascript
module-type: startup
\*/
(function() {
"use strict";

var fs = require("fs");
var path = require("path");

exports.name = "mhwiki-fs-watch-reload";
exports.platforms = ["node"];
exports.after = ["startup"];
exports.synchronous = true;

function hasListenArg() {
	var argv = ($tw.boot && $tw.boot.argv) || [];
	return argv.indexOf("--listen") !== -1;
}

function buildTitleListForFile(filepath) {
	var titles = [];
	$tw.utils.each($tw.boot.files,function(fileInfo,title) {
		if(fileInfo && path.resolve(fileInfo.filepath) === filepath) {
			titles.push(title);
		}
	});
	return titles;
}

function deleteFileTiddlers(filepath) {
	var titles = buildTitleListForFile(filepath);
	$tw.utils.each(titles,function(title) {
		delete $tw.boot.files[title];
		$tw.wiki.deleteTiddler(title);
	});
	return titles.length;
}

function reloadFile(filepath,logger) {
	var fileData;
	var previousTitles = buildTitleListForFile(filepath);
	var incomingTitles = Object.create(null);
	try {
		fileData = $tw.loadTiddlersFromFile(filepath,{title: filepath});
	} catch (error) {
		logger.log("Ignoring change for non-tiddler or unreadable file:",filepath,error.message || error);
		return;
	}
	if(!fileData || !fileData.tiddlers || !fileData.tiddlers.length) {
		return;
	}
	$tw.utils.each(fileData.tiddlers,function(tiddlerFields) {
		if(!tiddlerFields.title) {
			return;
		}
		incomingTitles[tiddlerFields.title] = true;
		$tw.wiki.addTiddler(new $tw.Tiddler(tiddlerFields));
		$tw.boot.files[tiddlerFields.title] = {
			filepath: filepath,
			type: fileData.type,
			hasMetaFile: fileData.hasMetaFile,
			isEditableFile: true
		};
	});
	$tw.utils.each(previousTitles,function(title) {
		if(!incomingTitles[title]) {
			delete $tw.boot.files[title];
			$tw.wiki.deleteTiddler(title);
		}
	});
	logger.log("Reloaded tiddlers from file:",filepath);
}

exports.startup = function() {
	if(!hasListenArg()) {
		return;
	}
	if(!$tw.boot || !$tw.boot.wikiTiddlersPath) {
		return;
	}
	var logger = new $tw.utils.Logger("mhwiki-fs-watch-reload",{colour: "green"});
	var rootPath = path.resolve($tw.boot.wikiTiddlersPath);
	var eventTimers = Object.create(null);
	var suppressUntilByPath = Object.create(null);
	var suppressWindowMs = 2000;

	function suppressPath(filepath) {
		suppressUntilByPath[path.resolve(filepath)] = Date.now() + suppressWindowMs;
	}

	function shouldSuppressPath(filepath) {
		var absolutePath = path.resolve(filepath);
		var until = suppressUntilByPath[absolutePath] || 0;
		if(until <= Date.now()) {
			delete suppressUntilByPath[absolutePath];
			return false;
		}
		return true;
	}

	$tw.wiki.addEventListener("change",function(changes) {
		$tw.utils.each(changes,function(change,title) {
			if(!change || change.deleted) {
				return;
			}
			var fileInfo = $tw.boot.files[title];
			if(fileInfo && fileInfo.filepath) {
				suppressPath(fileInfo.filepath);
			}
		});
	});

	function queueFile(filepath) {
		var absolutePath = path.resolve(filepath);
		if(absolutePath.indexOf(rootPath + path.sep) !== 0 && absolutePath !== rootPath) {
			return;
		}
		if(shouldSuppressPath(absolutePath)) {
			return;
		}
		if(eventTimers[absolutePath]) {
			clearTimeout(eventTimers[absolutePath]);
		}
		eventTimers[absolutePath] = setTimeout(function() {
			delete eventTimers[absolutePath];
			try {
				if(fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
					reloadFile(absolutePath,logger);
				} else {
					var deletedCount = deleteFileTiddlers(absolutePath);
					if(deletedCount > 0) {
						logger.log("Removed tiddlers for deleted file:",absolutePath);
					}
				}
			} catch (error) {
				logger.log("Watch processing failed for",absolutePath,error.message || error);
			}
		},120);
	}

	function onWatchEvent(eventType,filename) {
		if(!filename) {
			return;
		}
		var fullPath = path.resolve(rootPath,filename.toString());
		queueFile(fullPath);
		if(eventType === "rename") {
			// Directory changes can hide nested edits; queue a conservative pass.
			try {
				if(fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
					var children = fs.readdirSync(fullPath);
					$tw.utils.each(children,function(child) {
						queueFile(path.resolve(fullPath,child));
					});
				}
			} catch (error) {
				// Ignore transient path races during editor save/rename sequences.
			}
		}
	}

	try {
		fs.watch(rootPath,{recursive: true},onWatchEvent);
		logger.log("Watching tiddlers folder for external file edits:",rootPath);
	} catch (error) {
		logger.log("Could not start filesystem watcher:",error.message || error);
	}
};

})();
