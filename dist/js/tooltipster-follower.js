/**
 * tooltipster-follower v0.1.0
 * https://github.com/louisameline/tooltipster-follower/
 * Developed by Louis Ameline
 * MIT license
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define(["tooltipster"], function (a0) {
      return (factory(a0));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("tooltipster"));
  } else {
    factory(jQuery);
  }
}(this, function ($) {

$.tooltipster.plugin({
	name: 'laa.follower',
	instance: {
		/**
		 * @return {object} An object with the defaults options
		 */
		_defaults: function() {
			
			return {
				anchor: 'top-left',
				maxWidth: null,
				minWidth: 0,
				offset: [15, -15]
			};
		},
		
		/**
		 * Run once at instantiation of the plugin
		 *
		 * @param {object} instance The tooltipster object that instantiated this plugin
		 */
		_init: function(instance) {
			
			var self = this;
			
			// list of instance variables
			
			self.pointerPosition;
			self.helper;
			// the inition repositionOnScroll option value
			self.initialROS = instance.option('repositionOnScroll');
			self.instance = instance;
			self.latestMousemove;
			self.namespace = self.instance.namespace + '-follower';
			self.options;
			self.previousState = 'closed';
			self.size;
			
			// enable ROS (scrolling forces us to re-evaluate the window geometry)
			if (!self.initialROS) {
				self.instance.option('repositionOnScroll', true);
			}
			
			// initial formatting
			self._optionsFormat();
			
			// reformat every time the options are changed
			self.instance._on('destroyed.'+ self.namespace, function() {
				self._destroy();
			});
			
			// reformat every time the options are changed
			self.instance._on('options.'+ self.namespace, function() {
				self._optionsFormat();
			});
			
			self.instance._on('reposition.'+ self.namespace, function(event) {
				self._reposition(event.event, event.helper);
			});
			
			// we need to register the mousemove events before the tooltip is actually
			// opened, because the event that will be passed to _reposition at opening
			// will be the mouseenter event, which is too old and does not reflect the
			// current position of the mouse
			self.instance._on('start.'+ self.namespace, function(event) {
				
				self.instance.$origin.on('mousemove.'+ self.namespace, function(e) {
					self.latestMousemove = e;
				});
			});
			
			// undo the previous binding
			self.instance._one('startend.'+ self.namespace +' startcancel.'+ self.namespace, function(event){
				
				self.instance.$origin.off('mousemove.'+ self.namespace);
				
				// forget the event
				if (event.type == 'startcancel') {
					self.latestMousemove = null;
				}
			});
			
			self.instance._on('state.'+ self.namespace, function(event) {
				
				if (event.state == 'closed') {
					self._close();
				}
				else if (event.state == 'appearing' && self.previousState == 'closed') {
					self._create();
				}
				
				self.previousState = event.state;
			});
		},
		
		/**
		 * Called when the tooltip has closed
		 */
		_close: function() {
			
			// detach our content object first, so the next jQuery's remove()
			// call does not unbind its event handlers
			if (typeof this.instance.Content == 'object' && this.instance.Content !== null) {
				this.instance.Content.detach();
			}
			
			// remove the tooltip from the DOM
			this.instance.$tooltip.remove();
			this.instance.$tooltip = null;
			
			// stop listening to mouse moves
			$($.tooltipster.env.window.document).off('.'+ this.namespace);
		},
		
		/**
		 * Contains the HTML markup of the tooltip and the bindings the should
		 * exist as long as the tooltip is open
		 *
		 * @return {object} The tooltip, as a jQuery-wrapped HTML element
		 */
		_create: function() {
			
			var self = this,
				// note: we wrap with a .tooltipster-box div to be able to set a margin on it
				// (.tooltipster-base must not have one)
				$html = $(
					'<div class="tooltipster-base tooltipster-follower">' +
						'<div class="tooltipster-box">' +
							'<div class="tooltipster-content"></div>' +
						'</div>' +
					'</div>'
				);
			
			// apply min/max width if asked
			if (self.options.minWidth) {
				$html.css('min-width', self.options.minWidth + 'px');
			}
			if (self.options.maxWidth) {
				$html.css('max-width', self.options.maxWidth + 'px');
			}
			
			self.instance.$tooltip = $html;
			
			$($.tooltipster.env.window.document).on('mousemove.'+ self.namespace, function(event) {
				self._follow(event);
			});
			
			// tell the instance that the tooltip element has been created
			self.instance._trigger('created');
		},
		
		/**
		 * Called upon the destruction of the tooltip or the destruction of the plugin
		 */
		_destroy: function() {
			
			this.instance.off('.'+ this.namespace);
			
			if (!this.initialROS) {
				this.instance.option('repositionOnScroll', false);
			}
		},
		
		/**
		 * Called when the mouse has moved.
		 * 
		 * Note: this is less "smart" than sideTip, which tests scenarios before choosing one.
		 * Here we have to be fast so the moving animation can stay fluid. So there will be no
		 * constrained widths for example.
		 */
		_follow: function(event) {
			
			// use the latest mousemove event if we were recording them before the tooltip was
			// opened, and then let it go (see the comment on the `start` listener).
			if (this.latestMousemove) {
				event = this.latestMousemove;
				this.latestMousemove = null;
			}
			
			var coord = {},
				anchor = this.options.anchor,
				offset = $.merge([], this.options.offset);
			
			// the scroll data of the helper must be updated manually on mousemove when the
			// origin is fixed, because Tooltipster will not call _reposition on scroll, so
			// it's out of date. Even though the tooltip will be fixed too, we need to know
			// the scroll distance to determine the position of the pointer relatively to the
			// viewport
			this.helper.geo.window.scroll = {
				left: $.tooltipster.env.window.scrollX || $.tooltipster.env.window.document.documentElement.scrollLeft,
				top: $.tooltipster.env.window.scrollY || $.tooltipster.env.window.document.documentElement.scrollTop
			};
			
			// coord left
			switch (anchor) {
				
				case 'top-left':
				case 'left-center':
				case 'bottom-left':
					coord.left = event.pageX + offset[0];
					break;
				
				case 'top-center':
				case 'bottom-center':
					coord.left = event.pageX + offset[0] - this.size.width / 2;
					break;
				
				case 'top-right':
				case 'right-center':
				case 'bottom-right':
					coord.left = event.pageX + offset[0] - this.size.width;
					break;
				
				default:
					console.log('Wrong anchor value');
					break;
			}
			
			// coord top
			switch (anchor) {
				
				case 'top-left':
				case 'top-center':
				case 'top-right':
					// minus because the Y axis is reversed (pos above the X axis, neg below)
					coord.top = event.pageY - offset[1];
					break;
				
				case 'left-center':
				case 'right-center':
					coord.top = event.pageY - offset[1] - this.size.height / 2;
					break;
				
				case 'bottom-left':
				case 'bottom-center':
				case 'bottom-right':
					coord.top = event.pageY - offset[1] - this.size.height;
					break;
			}
			
			// if the tooltip does not fit on the given side, see if it could fit on the
			// opposite one, otherwise put at the bottom (which may be moved again to the
			// top by the rest of the script below)
			if (	anchor == 'left-center'
				||	anchor == 'right-center'
			){
				
				// if the tooltip is on the left of the cursor
				if (anchor == 'right-center') {
					
					// if it overflows the viewport on the left side
					if (coord.left < this.helper.geo.window.scroll.left) {
						
						// if it wouldn't overflow on the right
						if (event.pageX - offset[0] + this.size.width <= this.helper.geo.window.scroll.left + this.helper.geo.window.size.width) {
							
							// move to the right
							anchor = 'left-center';
							// reverse the offset as well
							offset[0] = -offset[0];
							coord.left = event.pageX + offset[0];
						}
						else {
							// move to the bottom left
							anchor = 'top-right';
							// we'll use the X offset to move the tooltip on the Y axis. Maybe
							// we'll make this configurable at some point
							offset[1] = offset[0];
							coord = {
								left: 0,
								top: event.pageY - offset[1]
							};
						}
					}
				}
				else {
					
					// if it overflows the viewport on the right side
					if (coord.left + this.size.width > this.helper.geo.window.scroll.left + this.helper.geo.window.size.width) {
						
						var coordLeft = event.pageX - offset[0] - this.size.width;
						
						// if it wouldn't overflow on the left
						if (coordLeft >= 0) {
							
							// move to the left
							anchor = 'right-center';
							// reverse the offset as well
							offset[0] = -offset[0];
							coord.left = coordLeft;
						}
						else {
							// move to the bottom right
							anchor = 'top-left';
							offset[1] = -offset[0];
							coord = {
								left: event.pageX + offset[0],
								top: event.pageY - offset[1]
							};
						}
					}
				}
				
				// if it overflows the viewport at the bottom
				if (coord.top + this.size.height > this.helper.geo.window.scroll.top + this.helper.geo.window.size.height) {
					
					// move up
					coord.top = this.helper.geo.window.scroll.top + this.helper.geo.window.size.height - this.size.height;
				}
				// if it overflows the viewport at the top
				if (coord.top < this.helper.geo.window.scroll.top) {
					
					// move down
					coord.top = this.helper.geo.window.scroll.top;
				}
				// if it overflows the document at the bottom
				if (coord.top + this.size.height > this.helper.geo.document.size.height) {
					
					// move up
					coord.top = this.helper.geo.document.size.height - this.size.height;
				}
				// if it overflows the document at the top
				if (coord.top < 0) {
					
					// no top document overflow
					coord.top = 0;
				}
			}
			
			// when the tooltip is not on a side, it may freely move horizontally because
			// it won't go under the pointer
			if (	anchor != 'left-center'
				&&	anchor != 'right-center'
			){
				
				// left and right overflow
				
				if (coord.left + this.size.width > this.helper.geo.window.scroll.left + this.helper.geo.window.size.width) {
					coord.left = this.helper.geo.window.scroll.left + this.helper.geo.window.size.width - this.size.width;
				}
				
				// don't ever let document overflow on the left, only on the right, so the user
				// can scroll. Note: right overflow should not happen often because when
				// measuring the natural width, text is already broken to fit into the viewport.
				if (coord.left < 0) {
					coord.left = 0;
				}
				
				// top and bottom overflow
				
				var pointerViewportY = event.pageY - this.helper.geo.window.scroll.top;
				
				// if the tooltip is above the pointer
				if (anchor.indexOf('bottom') == 0) {
					
					// if it overflows the viewport on top
					if (coord.top < this.helper.geo.window.scroll.top) {
						
						// if the tooltip overflows the document at the top
						if (	coord.top < 0
							// if there is more space in the viewport below the pointer and that it won't
							// overflow the document, switch to the bottom. In the latter case, it might
							// seem odd not to switch to the bottom while there is more space, but the
							// idea is that the user couldn't close the tooltip, scroll down and try to
							// open it again, whereas he can do that at the top
							||	(	pointerViewportY < this.helper.geo.window.size.height - pointerViewportY
								&&	event.pageY + offset[1] + this.size.height <= this.helper.geo.document.size.height
							)
						) {
							coord.top = event.pageY + offset[1];
						}
					}
				}
				// similar logic
				else {
					
					var coordBottom = coord.top + this.size.height;
					
					// if it overflows at the bottom
					if (coordBottom > this.helper.geo.window.scroll.top + this.helper.geo.window.size.height) {
						
						// if there is more space above the pointer or if it overflows the document
						if (	pointerViewportY > this.helper.geo.window.size.height - pointerViewportY
							||	pointerViewportY - offset[1] + this.size.height <= this.helper.geo.document.size.height
						) {
							
							// move it unless it would overflow the document at the top too
							var coordTop = event.pageY + offset[1] - this.size.height;
							
							if (coordTop >= 0) {
								coord.top = coordTop;
							}
						}
					}
				}
			}
			
			// ignore the scroll distance if the origin is fixed
			if (this.helper.geo.origin.fixedLineage) {
				coord.left -= this.helper.geo.window.scroll.left;
				coord.top -= this.helper.geo.window.scroll.top;
			}
			
			var position = { coord: coord };
			
			this.instance._trigger({
				edit: function(p) {
					position = p;
				},
				event: event,
				helper: this.helper,
				position: $.extend(true, {}, position),
				type: 'follow'
			});
			
			this.instance.$tooltip
				.css({
					left: position.coord.left,
					top: position.coord.top
				})
				.show();
		},
		
		/**
		 * (Re)compute this.options from the options declared to the instance
		 */
		_optionsFormat: function() {
			
			var defaults = this._defaults(),
				// if the plugin options were isolated in a property named after the
				// plugin, use them (prevents conflicts with other plugins)
				pluginOptions = this.instance.options[this.name] || this.instance.options;
			
			this.options = $.extend(true, {}, defaults, pluginOptions);
		},
		
		/**
		 * Called when Tooltipster thinks the tooltip should be repositioned/resized
		 * (there can be many reasons for that). Tooltipster does not take mouse moves
		 * into account, for that we have our own listeners that will adjust the
		 * position (see _follow())
		 */
		_reposition: function(event, helper) {
			
			var self = this,
				$clone = self.instance.$tooltip.clone(),
				// start position tests session
				ruler = $.tooltipster._getRuler($clone),
				rulerResults = ruler.free().measure(),
				position = {
					size: rulerResults.size
				};
			
			// set position values on the original tooltip element
			
			if (helper.geo.origin.fixedLineage) {
				self.instance.$tooltip
					.css('position', 'fixed');
			}
			else {
				// CSS default
				self.instance.$tooltip
					.css('position', '');
			}
			
			self.instance._trigger({
				edit: function(p) {
					position = p;
				},
				event: event,
				helper: helper,
				position: $.extend(true, {}, position),
				tooltipClone: $clone[0],
				type: 'position'
			});
			
			// the clone won't be needed anymore
			ruler.destroy();
			
			// pass to _follow()
			self.helper = helper;
			self.size = position.size;
			
			// set the size here, the position in _follow()
			self.instance.$tooltip
				.css({
					height: position.size.height,
					width: position.size.width
				});
			
			// if an event triggered this method, we can tell where the mouse is.
			// Otherwise, it's a method call (which is a bit weird)
			if (event) {
				self._follow(event);
			}
			else {
				// hide until a mouse event fires _follow()
				self.instance.$tooltip
					.hide();
			}
			
			// append the tooltip HTML element to its parent
			self.instance.$tooltip.appendTo(self.instance.options.parent);
			
			// Currently, this event is meant to give the size of the tooltip to
			// Tooltipster. In the future, if it were also about its coordinates, we may
			// have to fire it at each mousemove
			self.instance._trigger({
				type: 'repositioned',
				event: event,
				position: {
					// won't be used anyway since we enabled repositionOnScroll
					coord: {
						left: 0,
						top: 0
					},
					// may be used by the tooltip tracker
					size: position.size
				}
			});
		}
	}
});

/* a build task will add "return $;" here for UMD */
return $;

}));
