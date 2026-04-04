(function() {
	"use strict";

	function SingleStoryView(listWidget) {
		this.listWidget = listWidget;
		this.normalizeSidebarTab();
		this.enforceSingle();
	}

	SingleStoryView.prototype.getStoryManager = function() {
		return new $tw.Story({
			wiki: this.listWidget.wiki,
			storyTitle: "$:/StoryList",
			historyTitle: "$:/HistoryList"
		});
	};

	SingleStoryView.prototype.normalizeSidebarTab = function() {
		var wiki = this.listWidget.wiki,
			sidebarStateTitle = "$:/state/tab/sidebar",
			openTabTitle = "$:/core/ui/SideBar/Open",
			fallbackTabTitle = "$:/core/ui/SideBar/Recent",
			sidebarState = wiki.getTiddlerText(sidebarStateTitle,"");
		if(sidebarState === openTabTitle) {
			wiki.setText(sidebarStateTitle,"text",undefined,fallbackTabTitle);
		}
	};

	SingleStoryView.prototype.enforceSingle = function(preferredTitle) {
		var story = this.getStoryManager(),
			storyList = story.getStoryList(),
			keepTitle;
		if(storyList.length <= 1) {
			return;
		}
		keepTitle = preferredTitle && storyList.indexOf(preferredTitle) !== -1 ? preferredTitle : storyList[storyList.length - 1];
		if(storyList.length === 1 && storyList[0] === keepTitle) {
			return;
		}
		if(keepTitle) {
			story.saveStoryList([keepTitle]);
		}
	};

	SingleStoryView.prototype.navigateTo = function(historyInfo) {
		if(!historyInfo || !historyInfo.title) {
			return;
		}
		this.enforceSingle(historyInfo.title);
		var listElementIndex = this.listWidget.findListItem(0,historyInfo.title);
		if(listElementIndex === undefined) {
			return;
		}
		var listItemWidget = this.listWidget.children[listElementIndex],
			targetElement = listItemWidget.findFirstDomNode();
		if(!targetElement || targetElement.nodeType === Node.TEXT_NODE) {
			return;
		}
		this.listWidget.dispatchEvent({type: "tm-scroll", target: targetElement});
	};

	SingleStoryView.prototype.insert = function(widget) {
		if(widget && widget.parseTreeNode) {
			this.enforceSingle(widget.parseTreeNode.itemTitle);
		} else {
			this.enforceSingle();
		}
	};

	SingleStoryView.prototype.refreshEnd = function() {
		this.normalizeSidebarTab();
		this.enforceSingle();
	};

	exports.single = SingleStoryView;
})();
