//* TITLE       Retags **//
//* DEVELOPER   alexhong **//
//* VERSION     0.6.7 **//
//* DESCRIPTION Adds tags to reblog notes **//
//* FRAME       false **//
//* SLOW        false **//
//* BETA        false **//

var retags = {
	api_key: '3DFxEZm0tGISOmdvWe9Fl1QsQMo1LFqEatnc8GQ68wgF1YTZ4w',
	selectors: '.reblog,.is_reblog,.notification_reblog',
	blog_name: "",
	observer: new MutationObserver(function(ms){
		ms.forEach(function(m){
			retags.tag($(m.addedNodes).filter(retags.selectors));
		});
	}),
	run: function(){
		try {
			retags.blog_name = $('body').data('new-root').split('/').pop();
		} catch(e) {

		}
		retags.add_toggle();
		retags.observer.observe($('body')[0],{childList:true,subtree:true});
		retags.tag(retags.selectors);
	},
	destroy: function(){
		retags.css.detach();
		retags.css_toggle.detach();
		retags.html_toggle.detach();
		retags.observer.disconnect();
		$('.retags').remove();
		$('body').off('.retags');
	},
	add_toggle: function(){
		var toggle = 'retags_toggle_'+retags.blog_name;
		retags.html_toggle.appendTo('.ui_notes_switcher .part-toggle');
		$('#retags-toggle').change(function(){
			if ($(this).prop('checked')) {
				localStorage.setItem(toggle,'true');
				retags.css_toggle.appendTo('head');
			} else {
				localStorage.setItem(toggle,'false');
				retags.css_toggle.detach();
			}
		});
		if (localStorage.getItem(toggle) === 'true') {
			$('#retags-toggle').click();
		}
	},
	tag: function(el){
		$(el).each(function(){
			var $t = $(this), cls, $c, url;
			if ($t.find('div.retags').length) {
				return false;
			}
			// popover
			if ($t.hasClass('note')) {
				cls = 'with_commentary';
				$c = $t;
				url = $c.find('.action').data('post-url');
			// Activity
			} else if ($t.hasClass('ui_note')) {
				if ($t.find('.part_response').length) {
					$t.addClass('is_response');
				}
				cls = 'is_retags';
				$c = $t.find('.stage');
				url = $c.find('.part_glass').attr('href');
			// dashboard
			} else if ($t.hasClass('notification')) {
				$c = $t.find('.notification_sentence');
				url = $c.find('.notification_target').attr('href');
			}
			if (url) {
				url = url.split('/');
				var host = url[2], id = url[4], cache = 'retags_'+id;
				if (localStorage.getItem(cache) !== null) {
					retags.append($t,cls,$c,JSON.parse(localStorage.getItem(cache)));
				} else {
					retags.request($t,cls,$c,cache,'https://api.tumblr.com/v2/blog/'+host+'/posts/info?id='+id+'&api_key='+retags.api_key);
				}
			}
		});
	},
	request:
		(typeof GM_xmlhttpRequest !== 'undefined')
		// if userscript or XKit
		? function($t,cls,$c,cache,url) {
			GM_xmlhttpRequest({
				method: 'GET',
				url: url,
				onload: function(data){
					var tags = JSON.parse(data.responseText).response.posts[0].tags;
					localStorage.setItem(cache,JSON.stringify(tags));
					retags.append($t,cls,$c,tags);
				},
				onerror: function(data){
					retags.append($t,cls,$c,'ERROR: '+data.status);
				}
			});
		}
		// if Chrome extension
		: function($t,cls,$c,cache,url) {
			$.getJSON(url,function(data){
				var tags = data.response.posts[0].tags;
				localStorage.setItem(cache,JSON.stringify(tags));
				retags.append($t,cls,$c,tags);
			}).fail(function(jqXHR,status,error){
				retags.append($t,cls,$c,status.toUpperCase()+': '+(error||jqXHR.status));
			});
		}
	,
	append: function($t,cls,$c,tags){
		if (tags.length) {
			var $retags = $('<div class="retags">');
			if (typeof tags === 'string') {
				$retags.append(tags).addClass('error');
			} else {
				tags.forEach(function(tag){
					$retags.append('<a href="//tumblr.com/tagged/'+tag.replace(/ /g,'-')+'">#'+tag+'</a>');
				});
			}
			$t.addClass(cls);
			$c.append($retags);
		}
	},
	css_toggle:
	$('<style class="retags">\
		.ui_note { display: none; }\
		.ui_note.is_retags, .ui_note.is_response, .ui_note.is_user_mention { display: block; }\
	</style>')
	,
	html_toggle:
	$('<label class="retags binary_switch">\
		<input id="retags-toggle" type="checkbox">\
		<span class="binary_switch_track"></span>\
		<span class="binary_switch_button"></span>\
		<span class="binary_switch_label">Show only retags / responses</span>\
	</label>')
};

XKit.extensions.retags = {
 	running: false,
	run: function(){
		this.running = true;
		XKit.tools.init_css("retags");
		retags.run();
	},
	destroy: function(){
		this.running = false;
		XKit.tools.remove_css("retags");
		retags.destroy();
	}
};
