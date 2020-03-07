window.onerror = function(e) {
	if(e == 'Script error.') return;
    alert('Произошла ошибка JavaScript!\n\nОшибка: ' + e);
}

var self = this, pageUpdating, pageLoading, tasksList = {}, windows = {};

self.page = new Page();
self.progress = new Progress();
self.loader = new Loader();
self.message = new Message();
self.captcha = new Captcha();
self.modal = new Modal();
self.require = new Require();

var handlerFlag = false;
self.setHandler = function(selector, callback, action) {
	action = action || 'click';
	
	$(selector).off();
	$(selector).on(action, function(e){
		if(handlerFlag)
			return;
			
		handlerFlag = true;
		setTimeout(function(){ handlerFlag = false; }, 100);
		
		e = e || window.event;
		
		callback.call($(this), e);
	});
}

self.bindDatePicker  = function(obj) {
	$('body').find('.daterangepicker').remove();
	
	self.require.load('/assets/js/moment.min.js', function() {
		self.require.load('/assets/js/daterangepicker.js', function() {
			var now = new Date();
			
			function addTime(time, type) {
				var date = new Date();
				
				if(type == 'month')
					date.setMonth(date.getMonth() + time);
				else if(type == 'year')
					date.setYear(date.getFullYear() + time);
				else
					date.setDate(date.getDate() + time);
					
				return date;
			}
			
			$(obj.selector).off();
			$(obj.selector).daterangepicker({
				"timePicker": true,
				"timePicker24Hour": true,
				"singleDatePicker": obj.isSingle ? true : false,
				"startDate": obj.startDate || now,
				"minDate": obj.minDate ? obj.minDate : now,
				"maxDate": obj.maxDate ? obj.maxDate : addTime(1, 'year'),
				"drops": obj.drops ? obj.drops : 'up',
				"ranges": obj.ranges !== undefined ? obj.ranges : {
					"1 день": [
						now,
						addTime(1)
					],
					"3 дня": [
						now,
						addTime(3)
					],
					"5 дней": [
						now,
						addTime(5)
					],
					"1 неделя": [
						now,
						addTime(7)
					],
					"2 недели": [
						now,
						addTime(14)
					],
					"1 месяц": [
						now,
						addTime(1, 'month')
					]
				},
				"locale": {
					"direction": "ltr",
					"format": "DD.MM.YYYY HH:mm",
					"separator": " - ",
					"applyLabel": "Применить",
					"cancelLabel": "Закрыть",
					"fromLabel": "From",
					"toLabel": "To",
					"customRangeLabel": "Другой",
					"daysOfWeek": [
						"Вс",
						"Пн",
						"Вт",
						"Ср",
						"Чт",
						"Пт",
						"Сб"
					],
					"monthNames": [
						"Январь",
						"Февраль",
						"Март",
						"Апрель",
						"Май",
						"Июнь",
						"Июль",
						"Август",
						"Сентябрь",
						"Октябрь",
						"Ноябрь",
						"Декабрь"
					],
					"firstDay": 1
				}
			});
		});
	});
}

self.query = query;

function query(obj) {	
	var force_progress = true;
	if(obj.hideprogress) force_progress = false;
	var ajax = {
		type: obj.type || 'GET',
		url: obj.url,
		data: obj.data,
		success: function(data) {
			if(force_progress) {
				setTimeout(function(){
					self.progress.change(100);
				}, 200);
			}
			if(obj.OnlyJson) {
				if(!IsJson(data)) {
					console.log(data);
					self.modal.show({title: 'Произошла ошибка!', content: 'Был получен неизвестный ответ! Обратитесь к администрации сайта!'});
					return;
				}
			}
			obj.success(data);
		},
		beforeSend: function(data) {
			if(obj.beforeSend != undefined) obj.beforeSend(data);
		},
		error: function(data) {
			if(data.status == 503) {
				var error = 'Пожалуйста, обновите страницу!';
			} else if(data.status == 500) {
				var error = 'Код-ошибки: 500<br>Сообщите о данной ошибке администрации сайта!';
			} else if(data.status == 413 ) {
				var error = 'Ваш запрос имеет слишком большой размер!';
			} else if(data.status == 0) {
				var error = 'Проверьте соединение с интернетом!';
			} else {
				var error = 'Произошла неизвестная ошиба! Сообщите о ней администрации сайта!';
			}
			if(obj.consoleerror) {
				console.log('error');
			} else {
				self.modal.show({title: 'Произошла ошибка!', content: error});
			}
		}
	}
	
	if(obj.contentType != undefined) ajax['contentType'] = obj.contentType;
	if(obj.processData != undefined) ajax['processData'] = obj.processData;
	
	if(!obj.hideprogress) {
		ajax['xhr'] = function() {
			var xhr = new window.XMLHttpRequest();
			xhr.addEventListener('progress', function(e) {
				e = e || window.event;
				
				if(e.lengthComputable) {
					force_progress = false;
					self.progress.change(e.loaded / e.total * 100);
				}
			}, false);
			
			return xhr;
		}
	}
	
	$.ajax(ajax);
}

function Page() {
	var p = this;
		
	p.load = function(href, replace, folow) {
		if(href[0] == '#') return;
		if(href[0] == '/' && !folow && href.split('/')[1] != 'oferta' && (href.split('/')[1] != 'auth' && document.location.pathname.split('/')[1] != 'auth' || (document.location.pathname.split('/')[1] == 'auth' && href.split('/')[1] == 'auth'))) {
			if(!pageLoading) {
				var getHref = href.split('?')[1], getHash = '', get = [];
				if(getHref != undefined) {
					getHash = '?';
					getHref.split('&').forEach(function(element) {
						var key = element.split('=')[0], value = element.split('=')[1];
						get.push(key + '=' + value);
					});
					getHash += get.join('&');
				}
				
				query({
					type: 'POST',
					url: '/api/pages' + getHash,
					data: {
						'page': href.split('?')[0]
					},
					success: function(data) {
						if(!IsJson(data)) {
							window.location.href = href;
							return;
						}
						data = $.parseJSON(data);
						pageLoading = false;
						if(data.status == 'error') {
							if(data.error == 'bad_token') {
								modal.show({title: 'Ошибка авторизации!', content: 'Для доступа к данному разделу, Вы должны быть авторизированы!', type: 'error', buttons: 'off'});
								setTimeout('redirect("/auth")', 1000);
							} else if(data.error == 'ip_confirmation') {
								modal.show({title: 'Произошла ошибка!', content: 'Чтобы продолжить работу с данного аккаунта, Вам необходимо подтвердить IP-Адрес!', type: 'error', buttons: 'off'});
								setTimeout('redirect("/account/ipconfirmation")', 1000);
							} else if(data.error == 'bad_access') {
								modal.show({title: 'Ошибка доступа!', content: 'У Вас нет доступа к данному разделу!', type: 'error'});
							}
						} else {
							if(data.guest == 'true' || !data.logged) {
								$('body').addClass('guest-page');
								$('header').addClass('locked-hide');
								$('menu').addClass('locked-hide');
							} else {
								$('body').removeClass('guest-page');
								$('header').removeClass('locked-hide');
								$('menu').removeClass('locked-hide');
								$('[data-option=user-balance]').html(data.user.balance + '₽');
							}
							Object.keys(tasksList).forEach(function(e) {
								clearInterval(tasksList[e]);
							});
							tasksList = {};
							$('html, body').scrollTop(0);
							$('content').removeClass('updating-page');
							$('content').html(data.content);
							$('menu > a').removeClass('current');
							$('menu > a[data-section=' + data.section + ']').addClass('current');
							$('.window').each(LoadWindows);
							document.title = data.title;
							$('.DoLoadWindow').addClass('animate');
							setTimeout(function() {
								$('.DoLoadWindow').addClass('locked-hide');
							}, 150);
							if(replace) {
								window.history.replaceState({}, '', href);
								return;
							}
							history.pushState({}, '', href);
						}
					},
					beforeSend: function() {
						pageLoading = true;
						if($('.profile-dropdown').hasClass('open')) $('.profile-dropdown').removeClass('open');
						$("body").removeClass("opened-menu");
						$('content').addClass('updating-page');
						$("content").html('<div class="loading"></div>');
						modal.hide();
						loader.hide();
					},
					error: function(data) {
						if(data.status == 503) {
							window.location.href = href;
						} else {
							pageLoading = false;
							if(data.status == 500) {
								var error = 'Код-ошибки: 500<br>Сообщите о данной ошибке администрации сайта!';
							} else if(data.status == 413) {
								var error = 'Ваш запрос имеет слишком большой размер!';
							} else if(data.status == 0) {
								var error = 'Проверьте соединение с интернетом!';
							} else {
								var error = 'Произошла неизвестная ошиба! Сообщите о ней администрации сайта!';
							}
							self.modal.show({title: 'Произошла ошибка!', content: error});
						}
					}
				});
			}
		} else {
			window.location.href = href;
		}
	}
	
	p.refresh = function() {
		p.load(window.location.href.replace(window.location.protocol + '//' + window.location.hostname, ''), true);
	}
}

function Progress() {
	var isVisible = false;
	
	this.change = function(percent) {
		if(!isVisible) show();
	
		$('.progress').animate({'width': percent + '%'}, 500);
		
		if(percent >= 100) hide();
	}
	
	function show() {
		$('.progress').show();
		isVisible = true;
	}
	
	function hide() {
		$('.progress').fadeOut(100, function() {
			$(this).css('width', 0);
			isVisible = false;
		});
	}
}

function Message() {
	this.show = function(obj) {
		var messageClasses = 'message',
			messageIcon = 'notifications',
			Top = 10;
		
		if($('.message').length > 0) {
			var Elements = document.getElementsByClassName('message');
			for(var i = 0; i < Elements.length; i++) {				
				Top += Elements[i].scrollHeight + 10;
			}
		}
		
		if(obj.type) {
			if(obj.type == 'success') {
				messageClasses += ' success';
				messageIcon = 'done';
			} else if(obj.type == 'error') {
				messageClasses += ' error';
				messageIcon = 'priority_high';
			}
		}
		
		var message = '<div class="' + messageClasses + '" style="top: ' + Top + 'px"><i class="material-icons">' + messageIcon + '</i><div class="text">' + (obj.content || '') + '</div></div>';

		var element = $(message).prependTo('body');
		
		setTimeout(function() {
			self.message.hide($(element));
		}, 1000 * 5);
	}
	
	this.correctTop = function() {
		var elements = [];
		$('.message').each(function(index, element) {
			elements.push(element);
		});
		
		elements.reverse().forEach(function(element, index) {
			var Top = 10
			if(index > 0) {
				for(var isd = 0; isd < $('.message').length; isd++) {
					if(isd < index) {
						Top += element.scrollHeight + 10;
					}
				}
			}
			$(element).css('top', Top + 'px');
		});
	}
	
	this.hide = function(element) {
		element.addClass('animate');
		setTimeout(function() {
			element.remove();
			self.message.correctTop();
		}, 150);
	}
}

function Loader() {
	this.show = function(obj) {
		var loaderClasses = 'loader';
		
		$('html').addClass('modal-active');
		
		var loaderContent = '<div class="loader-content"><div class="loader-circle"></div><div class="loader-text">' + (obj.content || '') + '</div></div>',
			loader = '<div class="' + loaderClasses + '"><div class="loader-filter"></div>' + loaderContent + '</div>';
		
		if($('.loader').length == 1) $('.loader').remove();
		if($('.modal').length == 1) $('.modal').remove();
		$('body').append(loader);
		self.loader.correctHeight();
		if(obj.callback) obj.callback();
	}
	
	this.correctHeight = function() {
		if($('.loader').length > 0) {
			if($('.loader .loader-content').height() < $(window).height()) 
				$('.loader .loader-content').attr('style', 'top: calc(50% - ' + ($('.loader .loader-content').height() / 2 ) + 'px);');
		}
	}
	
	this.hide = function() {
		$('.loader').addClass('animate');
		setTimeout(function() {
			$('.loader').remove();
			$('html').removeClass('modal-active');
		}, 150);
	}
}

function Captcha() {
	this.show = function(obj) {
		self.modal.show({title: 'Подтвердите действие!', content: '<div class="reCaptcha" id="reCaptcha"></div>'});
		grecaptcha.render("reCaptcha", {
			sitekey: obj.key,
			callback: function(captcha) {
				query({ 
					url: '/api/recaptcha',
					type: 'POST',
					OnlyJson: true,
					data: {
						'response': captcha
					},
					success: function(data) {
						data = $.parseJSON(data);
						switch(data.status) {
							
							case 'error':
								self.message.show({content: data.error, type: "error"});
								if(grecaptcha.getResponse() != "") grecaptcha.reset();
							break;
							
							case 'success':
								self.modal.hide();
								if(obj.action != undefined) eval(obj.action);
							break;
							
						}
					}
				});
			}
		});
		reCaptchaRESIZE();
	}
}

function Modal() {
	this.show = function(obj) {
		var modalClasses = 'modal', modalFooter = '';
		
		$('html').addClass('modal-active');
		
		if(obj.type) {
			if(obj.type == 'success') {
				modalClasses += ' success';
			} else if(obj.type == 'error') {
				modalClasses += ' error';
			}
		}
		
		if(obj.large) {
			modalClasses += ' full-w';
		}
		
		if(obj.buttons == 'off') {
			modalClasses += ' no-closing';
		} else if(Array.isArray(obj.buttons)) {
			var modalButtons = '';
			
			obj.buttons.forEach(function(element, index) {
				if(index < 3) {
					var buttonClasses = 'modal-button', buttonParameters = '';
					
					if(obj.buttons.length == 1) {
						if(element.full) buttonClasses += ' full';
					} else {
						if(index == 0) buttonClasses += ' first';
						if(index == 1) buttonClasses += ' second';
						if(index == 2) buttonClasses += ' third';
					}
					if(element.action) {
						 buttonParameters += ' onClick="' + (element.action.replace(/"/g, "'") || 'modal.hide()') + '"';
					}
					if(element.id) {
						 buttonParameters += ' id="' + (element.id || 'modalButton_' + (index + 1)) + '"';
					}
					modalButtons += '<div class="' + buttonClasses + '"' + buttonParameters + '>' + (element.text || 'Modal-button') + '</div>';
				}
			});
			
			modalFooter = '<div class="modal-footer">' + modalButtons + '</div>';
		}
		
		var modalHeader = '<div class="modal-header"><span class="modal-title">' + (obj.title || '') + '</span><i class="material-icons modal-close">close</i></div>',
			modalBody = '<div class="modal-body">' + (obj.content || '') + '</div>',
			modalContent = '<div class="modal-content">' + modalHeader + modalBody + modalFooter + '</div>',
			modal = '<div class="' + modalClasses + '"><div class="modal-filter"></div>' + modalContent + '</div>';
		
		if($('.modal').length == 1) $('.modal').remove();
		if($('.loader').length == 1) $('.loader').remove();
		
		$('body').append(modal);
		self.modal.correctHeight();
		if(obj.callback) obj.callback();
	}
	
	this.correctHeight = function() {
		if($('.modal').length > 0) {
			if($('.modal .modal-content').height() < $(window).height()) 
				$('.modal .modal-content').attr('style', 'top: calc(50% - ' + ($('.modal .modal-content').height() / 2 ) + 'px);');
		}
	}
	
	this.hide = function() {
		if($('.modal').length == 1) {
			$('.modal').addClass('animate');
			setTimeout(function() {
				$('.modal').remove();
				$('html').removeClass('modal-active');
			}, 150);
		} else {
			var m = this;
			$(m).parents('.modal').addClass('animate');
			setTimeout(function() {
				$(m).parents('.modal').remove();
				if($('.modal').length == 0) $('html').removeClass('modal-active');
			}, 150);
		}
	}
}

function Require() {
	var list = [];
	
	this.load = function(path, callback){
		if(get(path)) {
			if(callback) callback();
			return;
		}
		
		var script = document.createElement('script');
		script.setAttribute('src', path);
		
		document.getElementsByTagName('head')[0].appendChild(script);
		
		script.onload = function(){
			if(callback) callback();
		}
		
		list.push(path);
	}
	
	this.getList = function(){
		return list;
	}
	
	function get(path){
		for(var i = 0; i < list.length; i++) {
			if(list[i] == path) return true;
		}
		return false;
	}
}

setInterval(function() {
	if($('.loader').length == 0 && $('.modal').length == 0) {
		if($('html').hasClass('modal-active')) $('html').removeClass('modal-active');
	} else if($('.loader').length != 0 || $('.modal').length != 0) {
		if(!$('html').hasClass('modal-active')) $('html').addClass('modal-active');
	}
}, 1);

$(document).on('click', '.modal:not(.no-closing) .modal-close, .modal:not(.no-closing) .modal-filter', self.modal.hide);

$(document).on('click', '.message', function() {
	self.message.hide($(this));
});

$(document).on('keydown', function(e) {
	if(e.keyCode == 9) {
		e = e || window.event;
		e.preventDefault();
	}
});

$(document).on('click', 'ul > li[data-open-page]', function() {
	if(!$(this).hasClass('active')) {
		var index = $(this).index(), left = 0, width = $(this).innerWidth();
		
		$(this).parent().find('li').each(function() {
			if($(this).index() < index) {
				left += $(this).innerWidth() + 20;
			}
		});
		
		$(this).parent().find('li').removeClass('active');
		$(this).addClass('active');
		$(this).parent().find('.active-slider').css({'left': left, 'width': width});
		
		$('.pages > .page').removeClass('active');
		$('.pages > .page[data-page=' + $(this).attr('data-open-page') + ']').addClass('active');
		
		var page = document.location.href;
		if(page.indexOf('?openpage') > -1) {
			var pageData = page.split('?openpage')[1];
			if(page.split('?openpage')[1].indexOf('&') != -1) {
				pageData = page.split('?openpage')[0] + '?' + page.split('?openpage')[1].split('&').slice(1).join('&');
			}
			page = pageData;
		} else if(page.indexOf('&openpage') > -1) {
			var pageData = page.split('&openpage')[0];
			if(page.split('&openpage')[1].indexOf('&') != -1) {
				pageData = page.split('&openpage')[0] + '&' + page.split('&openpage')[1].split('&').slice(1).join('&');
			}
			page = pageData;
		}
		if($(this).index() > 0) {
			if(page.indexOf('?') == -1) {
				page += '?openpage=' + $(this).attr('data-open-page');
			} else page += '&openpage=' + $(this).attr('data-open-page');
		}
		window.history.replaceState({}, '', page);
	}
});

$(document).on('click', '*[href], *[link]', function(e) {
	e = e || window.event;
	e.preventDefault();

	if($(this).attr('link') != null) {
		var href = $(this).attr('link');
	} else if($(this).attr('href') != null) {
		var href = $(this).attr('href');
	}
	
	if($(this).attr('data-link') != "folow") {
		self.page.load(href);
	} else {
		self.page.load(href, false, true);
	}
});

$(document).on('click', function(e) {
	if($(e.target).parents('.profile-dropdown').length > 0 && $(e.target).parents('.content').parents('.profile-dropdown').length <= 0) {
		if($(e.target).parents('.profile-dropdown').hasClass('open')) {
			$('.profile-dropdown').removeClass('open');
		} else {
			$('.profile-dropdown').addClass('open');
		}
	} else if($(e.target).parents('.content').parents('.profile-dropdown').length <= 0 && $('.profile-dropdown').hasClass('open')) $('.profile-dropdown').removeClass('open');
});

$(document).on('click', 'header > .toggle', function() {
	$('body').toggleClass('opened-menu');
});

$(document).on('click', 'legend .checkbox', function() {
	var ts = $(this);
	setTimeout(function() {
		if(!ts.hasClass('active')) {
			ts.parents('fieldset').find('.checkbox-label span').removeClass('active');
			ts.parents('fieldset').find('.checkbox-label span input').val('0');
		} else {
			ts.parents('fieldset').find('.checkbox-label span').addClass('active');
			ts.parents('fieldset').find('.checkbox-label span input').val('1');
		}
	}, 1);
});

$(document).on('click', 'fieldset .checkbox-label .checkbox', function() {
	var ts = $(this);
	setTimeout(function() {
		if(ts.parents('fieldset').find('.checkbox-label .checkbox').length == ts.parents('fieldset').find('.checkbox-label .checkbox.active').length) {
			ts.parents('fieldset').find('legend .checkbox').addClass('active');
		} else {
			ts.parents('fieldset').find('legend .checkbox').removeClass('active');
		}
	}, 1);
});

$(document).on('click', '.checkbox', function(e) {
	e = e || window.event;
	e.stopPropagation();
	
	var value = 0,
		id = $(this).attr('data-id') ? 'id="' + $(this).attr('data-id') + '"' : '',
		name = $(this).attr('data-id') ? 'name="' + $(this).attr('data-id') + '"' : '';
	
	if(!$(this).hasClass('active'))
		value = 1;
	
	$(this).html('<input type="hidden" ' + id + ' ' + name + ' value="' + value + '">').toggleClass('active');
});

$(document).on('click', '.radiobox', function(e) {
	e = e || window.event;
	e.stopPropagation();
	
	$(this).parents('.radiobox-labels').find('.radiobox').removeClass('active');
	$(this).addClass('active');
	$(this).parents('.radiobox-labels').find('input').val($(this).attr('data-value'));
});

$(document).on('click', '.radiobox-label', function(e) {
	if(e.target.tagName != 'a')	$(this).find('.radiobox').click();
});

$(document).on('click', '.checkbox-label', function(e) {
	if(e.target.tagName != 'a') $(this).find('.checkbox').click();
});

$(document).on('click', '.select', function(e) {
	e = e || window.event;
	e.stopPropagation();
	
	if($(this).hasClass('selected')) {
		$('.select').removeClass('selected');
	} else {
		$('.select').removeClass('selected');
		if($(this).find('.select-list > span').length > 0) {
			$(this).addClass('selected');
			var list = $(this).find('.select-list > span'),
				input = $(this).find('input');
			list.removeClass('current');
			list.each(function(i, e) {
				if(input.val() == $(e).attr('data-value')) {
					$(e).addClass('current');
				}
			});
		}
	}
	
	if(!$(e.target).parents('.select-list').hasClass('select-list')) return;
		
	var el = $(e.target);
	if(el.hasClass('description')) el = el.parents('span');

	var parent = el.parents('.select');
	
	parent.find('.select-text').html(el.html());
	parent.find('[id=' + parent.attr('data-id') + ']').remove();
	parent.append('<input type="hidden" id="' + parent.attr('data-id') + '" name="' + parent.attr('data-id') + '" value="' + el.attr('data-value') + '">');
});

$(document).on('click', function(e) {
	$('.select').removeClass('selected');
});

$(window).resize(reCaptchaRESIZE);
$(window).on('popstate', function() {
	self.page.load(window.location.href.replace(window.location.protocol + '//' + window.location.hostname, ''), true);
});

var TouchData = {
	'Start': {
		'x': 0,
		'y': 0,
		'left': 0
	},
	'Active': false,
	'Touched': false
}

$(window).on('load', function() {
	var body = document.getElementsByTagName('body')[0];
	
	window.addEventListener('scroll', function(e) {
		console.log('scrolling');
	}, false);
	
	body.addEventListener('touchstart', function(e) {
		var touchobj = e.changedTouches[0];
		if($('body').hasClass('guest-page') || $('.modal, .loader').length > 0 || $(e.target).attr('type') == 'range') return;
		$('.wrapper').addClass('animating');
		TouchData['Start']['x'] = parseInt(touchobj.pageX);
		TouchData['Start']['y'] = parseInt(touchobj.pageY);
		TouchData['Start']['left'] = parseInt($('.wrapper').css('left'));
		TouchData['Start']['Touched'] = true;
	}, false);
  
	body.addEventListener('touchmove', function(e) {
		var touchobj = e.changedTouches[0],
			maxWidth = window.innerWidth - 50;
		if(TouchData['Start']['Touched']) {
			var dist = TouchData['Start']['left'] + parseInt(touchobj.pageX) - TouchData['Start']['x'],
				diff = parseInt(touchobj.pageX) - TouchData['Start']['x'],
				diffY = parseInt(touchobj.pageY) - TouchData['Start']['y'],
				left = parseInt($('.wrapper').css('left'));
				
			if((left >= 10 || TouchData['Start']['x'] <= 10) || TouchData['Start']['Active']) {
				TouchData['Start']['Active'] = true;
				
				if(maxWidth > 350) {
					if(dist > 0 && dist <= 350) {
						$('.wrapper').css({'left': dist});
					} else if(dist <= 0) {
						$('.wrapper').css({'left': ''});
					} else if(dist >= 350) {
						$('.wrapper').css({'left': 350});
					}
					if(parseInt($('.wrapper').css('left')) <= 175) {
						$('body').removeClass('opened-menu');
					} else {
						$('body').addClass('opened-menu');
					}
				} else {
					if(dist > 0 && dist <= maxWidth) {
						$('.wrapper').css({'left': dist});
					} else if(dist <= 0) {
						$('.wrapper').css({'left': ''});
					} else if(dist >= maxWidth) {
						$('.wrapper').css({'left': maxWidth});
					}
					if(parseInt($('.wrapper').css('left')) <= maxWidth / 2) {
						$('body').removeClass('opened-menu');
					} else {
						$('body').addClass('opened-menu');
					}
				}
			} else if(diffY > 10 || diffY < -10) {
				TouchData['Start']['Touched'] = false;
			}
		}
	}, false);
  
	body.addEventListener('touchend', function(e) {
		$('.wrapper').removeClass('animating');
		var left = parseInt($('.wrapper').css('left')),
			maxWidth = window.innerWidth - 50;
			
		if(maxWidth > 350) {
			$('.wrapper').css({'left': ''});
			if(left >= 175) {
				$('body').addClass('opened-menu');
			}
		} else {
			$('.wrapper').css({'left': ''});
			if(left >= maxWidth / 2) {
				$('body').addClass('opened-menu');
			}
		}
		TouchData['Start']['Active'] = false;
		TouchData['Start']['Touched'] = false;
	}, false);
});

$(window).on('load', function() {
	$('.DoLoadWindow').addClass('animate');
	setTimeout(function() {
		$('.DoLoadWindow').addClass('locked-hide');
		pageLoading = false;
	}, 150);
});

function LoadWindows() {
	var key = '',
		words = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
		max_position = words.length - 1;
		
	for(var i = 0; i < 16; ++i) {
		position = Math.floor(Math.random() * max_position);
		key += words.substring(position, position + 1);
	}
	
	key = key + '_' + $(this).attr('id');
	
	windows[key] = {
		'move': false,
		'resize': {
			'active': false,
			'type': false
		},
		'position': {
			'mouse': {
				'x': 0,
				'y': 0
			},
			'left': 0,
			'top': 0
		},
		'size': {
			'width': 600,
			'height': 500
		}
	}
	
	$(this).css({width: 400, height: 300, top: 'calc(50% - 150px)', left: 'calc(50% - 200px)'});
	$(this).attr('data-window', key);
	if(isMobile()) $(this).addClass('large');
	
	$('ul > li[data-open-page].active').each(function() {
		var index = $(this).index(), left = 0, width = $(this).innerWidth();
		
		$(this).parent().find('li').each(function() {
			if($(this).index() < index) {
				left += $(this).innerWidth() + 20;
			}
		});
		
		$(this).parent().find('.active-slider').css({'left': left, 'width': width});
	});
	
	setTimeout(function() {
		if(getPageParams()['openpage'] != undefined) {
			$('ul > li[data-open-page=' + getPageParams()['openpage'] + ']').click();
		}
	}, 10);
}

$(window).on('load', function() {
	if($('body').hasClass('winter')) {
		require.load("/assets/js/snow/snow-3d-vendor.min.js", function() {
			require.load("/assets/js/snow/snow-3d.min.js", function() {
				$("body").snow3d({
					url: "/assets/img/snow/black/",
					images: ['flake1.png', 'flake2.png', 'flake3.png'],
					num: 80,//120
					closeButton: 0,
					disableMouse: !0,
					enableMobile: !0,
					minScale: 10,
					maxScale: 20,
					speed: 0.3
				});
			});
		});
	}
	
	$('.window').each(LoadWindows);
	
	$(document).on('click', '.window > .header > .hide', function() {
		var div = $(this).parents('.window');
		div.css({'will-change': ''});
		message.show({content: 'Данная функция находится в разработке!', type: 'warning'});
	});

	$(document).on('click', '.window > .header > .full', function() {
		var div = $(this).parents('.window');
		div.css({'will-change': 'transform, bottom, right, left, top, width, height'});
		if(!div.hasClass('full')) {
			$(this).html('filter_none');
			div.addClass('full');
			setTimeout(function() {
				div.css({'will-change': ''});
			}, 50);
		} else {
			$(this).html('crop_din');
			div.css({width: 400, height: 300, top: 'calc(50% - 150px)', left: 'calc(50% - 200px)'});
			div.removeClass('full'); //.css({'top': 10});
			setTimeout(function() {
				div.css({'will-change': ''});
			}, 50);
		}
	});

	$(document).on('click', '.window > .header > .close', function() {
		var div = $(this).parents('.window');
		if(div.hasClass('active')) {
			div.css({'will-change': 'transform, opacity, left, top'});
			setTimeout(function() {
				div.addClass('close');
				setTimeout(function() {
					div.removeClass('active close');
					div.css({'will-change': ''});
				}, 400);
			}, 0);
		}
	});

	$(document).on('mousedown', '.window', function(e) {
		var key = $(this).attr('data-window');
		if($(this).hasClass('full') || $(this).hasClass('large')) return;
		//$('.window[data-window=' + key + ']').css({'will-change': 'transform, opacity, bottom, right, left, top'});
		$('.window').css({'z-index': ''});
		$('.window[data-window=' + key + ']').css({'z-index': '102'});
		if($(e.target).hasClass('border')) {
			windows[key]['execute'] = true;
			windows[key]['resize']['active'] = true;
			if($(e.target).hasClass('left')) {
				windows[key]['resize']['type'] = 'left';
			} else if($(e.target).hasClass('top')) {
				windows[key]['resize']['type'] = 'top';
			} else if($(e.target).hasClass('right')) {
				windows[key]['resize']['type'] = 'right';
			} else if($(e.target).hasClass('bottom')) {
				windows[key]['resize']['type'] = 'bottom';
			} else if($(e.target).hasClass('lt')) {
				windows[key]['resize']['type'] = 'lt';
			} else if($(e.target).hasClass('tr')) {
				windows[key]['resize']['type'] = 'tr';
			} else if($(e.target).hasClass('rb')) {
				windows[key]['resize']['type'] = 'rb';
			} else if($(e.target).hasClass('bl')) {
				windows[key]['resize']['type'] = 'bl';
			}
		} else if($(e.target).hasClass('header') || $(e.target).parent().hasClass('header') && e.target.tagName != 'I') {
			windows[key]['execute'] = true;
			windows[key]['move'] = true;
		}
		if($(e.target).hasClass('border') || ($(e.target).hasClass('header') || $(e.target).parent().hasClass('header') && e.target.tagName != 'I')) {
			windows[key]['position']['mouse']['y'] = e.clientY;
			windows[key]['position']['mouse']['x'] = e.clientX;
			windows[key]['position']['top'] = Number($(this).css('top').replace('px', ''));
			windows[key]['position']['left'] = Number($(this).css('left').replace('px', ''));
			windows[key]['size']['width'] = Number($(this).css('width').replace('px', ''));
			windows[key]['size']['height'] = Number($(this).css('height').replace('px', ''));
			$('html').attr('style', '-webkit-user-select: none');
			$(this).addClass('noanim');
		}
	});

	$(document).on('mouseup', function() {
		for(key in windows) {
			if(windows[key]['execute']) {
				windows[key]['execute'] = false;
				windows[key]['move'] = false;
				windows[key]['resize']['active'] = false;
				windows[key]['resize']['type'] = false;
				//$('.window[data-window=' + key + ']').css({'will-change': ''});
				if(Number($('.window[data-window=' + key + ']').css('top').replace('px', '')) <= 0) {
					$('.window[data-window=' + key + '] > .header > .full').click();
				}
			}
		}
		$('html').attr('style', '-webkit-user-select: auto');
		$('.window').removeClass('noanim');
	});

	$(document).on('mousemove', function(e) {
		var pageY = e.clientY,
			pageX = e.clientX;
		
		for(key in windows) {
			if(windows[key]['execute']) {
				if(windows[key]['move']) {
					//if($('.window[data-window=' + key + ']').hasClass('full')) $('.window[data-window=' + key + ']').removeClass('full');
					var MovepageX = (windows[key]['position']['left'] + (pageX - windows[key]['position']['mouse']['x']));
					var MovepageY = (windows[key]['position']['top'] + (pageY - windows[key]['position']['mouse']['y']));
					if(MovepageX >= $(window).width() - $('.window[data-window=' + key + ']').innerWidth()) {
						$('.window[data-window=' + key + ']').css({'left': $(window).width() - $('.window[data-window=' + key + ']').innerWidth()});
					} else if(MovepageX <= 0) {
						$('.window[data-window=' + key + ']').css({'left': 0});
					} else {
						$('.window[data-window=' + key + ']').css({'left': MovepageX});
					}
					if(MovepageY >= $(window).height() - $('.window[data-window=' + key + ']').innerHeight()) {
						$('.window[data-window=' + key + ']').css({'top': $(window).height() - $('.window[data-window=' + key + ']').innerHeight()});
					} else if(MovepageY <= 0) {
						$('.window[data-window=' + key + ']').css({'top': 0});
					} else {
						 $('.window[data-window=' + key + ']').css({'top': MovepageY});
					}
				} else if(windows[key]['resize']['active']) {
					if(windows[key]['resize']['type'] == 'left' || windows[key]['resize']['type'] == 'bl' || windows[key]['resize']['type'] == 'lt') {
						var width = (windows[key]['position']['mouse']['x'] - pageX) + windows[key]['size']['width'];
						var left = windows[key]['position']['left'] + (windows[key]['size']['width'] - width);
						if(width <= 400) {
							$('.window[data-window=' + key + ']').css({'width': 400, 'left': windows[key]['position']['left'] + (windows[key]['size']['width'] - 400)});
						} else if(left > 0) {
							$('.window[data-window=' + key + ']').css({'width': width, 'left': windows[key]['position']['left'] + (windows[key]['size']['width'] - width)});
						} else {
							$('.window[data-window=' + key + ']').css({'width': windows[key]['size']['width'] + (0 - windows[key]['position']['left']) * (-1), 'left': 0});
						}
					}
					if(windows[key]['resize']['type'] == 'top' || windows[key]['resize']['type'] == 'lt' || windows[key]['resize']['type'] == 'tr') {
						var height = (windows[key]['position']['mouse']['y'] - pageY) + windows[key]['size']['height'];
						var top = windows[key]['position']['top'] + (windows[key]['size']['height'] - height);
						if(height <= 300) {
							$('.window[data-window=' + key + ']').css({'height': 300, 'top': windows[key]['position']['top'] + (windows[key]['size']['height'] - 300)});
						} else if(top > 0) {
							$('.window[data-window=' + key + ']').css({'height': height, 'top': windows[key]['position']['top'] + (windows[key]['size']['height'] - height)});
						} else {
							$('.window[data-window=' + key + ']').css({'height': windows[key]['size']['height'] + (0 - windows[key]['position']['top']) * (-1), 'top': 0});
						}
					}
					if(windows[key]['resize']['type'] == 'right' || windows[key]['resize']['type'] == 'tr' || windows[key]['resize']['type'] == 'rb') {
						var width = (pageX - windows[key]['position']['mouse']['x']) + windows[key]['size']['width'];
						if(width <= 400) {
							width = 400;
						} else if(pageX >= $(window).width() - 1) {
							width = $(window).width() - windows[key]['position']['left'];
						}
						$('.window[data-window=' + key + ']').css({'width': width});
					}
					if(windows[key]['resize']['type'] == 'bottom' || windows[key]['resize']['type'] == 'rb' || windows[key]['resize']['type'] == 'bl') {
						var height = (pageY - windows[key]['position']['mouse']['y']) + windows[key]['size']['height'];
						if(height <= 300) {
							height = 300;
						} else if(pageY >= $(window).height() - 1) {
							height = $(window).height() - windows[key]['position']['top'];
						}
						$('.window[data-window=' + key + ']').css({'height': height});
					}
				}
			}
		}
	});

	setInterval(function() {
		$('.window').each(function() {
			if(!$(this).hasClass('full')) {
				if(!isMobile()) {
					var large;
					var widthDiff = $(window).width() - ($(this).innerWidth() + Number($(this).css('left').replace('px', '')));
					var heightDiff = $(window).height() - ($(this).innerHeight() + Number($(this).css('top').replace('px', '')));
					if(widthDiff < 0) {
						var left = Number($(this).css('left').replace('px', ''));
						if(left - widthDiff * (-1) <= 0) {
							var widthLeft = left - widthDiff * (-1);
							if($(this).innerWidth() - widthLeft * (-1) <= 400) {
								large = true;
							} else {
								$(this).css({'width': $(this).innerWidth() - widthLeft * (-1)});
							}
						} else {
							$(this).css({'left': left - widthDiff * (-1)});
						}
					} else if(Number($(this).css('left').replace('px', '')) < 0) {
						$(this).css({'left': 0});
					}
					if(heightDiff < 0) {
						var top = Number($(this).css('top').replace('px', ''));
						if(top - heightDiff * (-1) <= 0) {
							var heightTop = top - heightDiff * (-1);
							if($(this).innerHeight() - heightTop * (-1) <= 300) {
								large = true;
							} else {
								$(this).css({'height': $(this).innerHeight() - heightTop * (-1)});
							}
						} else {
							$(this).css({'top': top - heightDiff * (-1)});
						}
					} else if(Number($(this).css('top').replace('px', '')) < 0) {
						$(this).css({'top': 0});
					}
					if(large) {
						$(this).addClass('large');
					} else {
						$(this).removeClass('large');
					}
				} else {
					$(this).addClass('large');
				}
			}
		});
	}, 100);
});

function openWindow(idWindow) {
	idWindow = $(idWindow);
	setTimeout(function() {
		$('.window').css({'z-index': ''});
		idWindow.css({'transform': 'scale(0.4)', 'opacity': 0, 'will-change': 'transform, opacity, left, top', 'z-index': '102'});
		idWindow.addClass('open active');
		setTimeout(function() {
			idWindow.removeClass('open');
			idWindow.css({'transform': '', 'opacity': '', 'will-change': ''});
		}, 400);
	}, 0);
}

function reCaptchaRESIZE(islarge) {
	var reCaptchaWidth = $('.reCaptcha iframe').width();
	var containerWidth = $('.reCaptcha').parents().eq(0).width() + 2;
	if(reCaptchaWidth > containerWidth || islarge) {
		var reCaptchaScale = containerWidth / reCaptchaWidth;
		$('.reCaptcha').css({
			'transform': 'scale(' + reCaptchaScale + ')'
		});
	} else {
		$('.reCaptcha').css({
			'transform': 'scale(1)'
		});
	}
}
	
function getPageParams() {
	var url = window.location.href,
		params = url.split('?'),
		result = {};

	if(params[1] != undefined) {
		params = params[1].split('&');
		result[params[0].split('=')[0]] = (params[0].split('=')[1] == undefined ? '' : params[0].split('=')[1]);
		if(params[1] != undefined) {
			params.forEach(function(value) {
				result[decodeURIComponent(value.split('=')[0])] = (value.split('=')[1] == undefined ? '' : decodeURIComponent(value.split('=')[1]));
			});
		}
	}
	return result;
}

function redirect(href, folow) {
	self.page.load(href, false, folow);
}

function reload(noforce) {
	if(noforce) {
		self.page.load(document.location.href.split(document.location.host)[1]);
	} else {
		document.location.reload();
	}
}

function IsJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function reloadImage(img) {
	var src = $(img).attr('src');
	if(src.indexOf('?') == -1) {
		$(img).attr('src', src + '?' + Math.random());
	} else {
		$(img).attr('src', src + '&' + Math.random());
	}
}

function isMobile() {
	try { 
		document.createEvent("TouchEvent");
		return true;
	} catch(e) {
		return false;
	}
}
