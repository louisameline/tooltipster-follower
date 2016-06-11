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
		 * Contains the HTML markup of the tooltip.
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
			
			this.instance.$tooltip
				.css({
					left: coord.left,
					top: coord.top
				});
			
			this.instance._trigger({
				coord: coord,
				event: event,
				type: 'followed'
			});
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
		 *
		 */
		_reposition: function(event, helper) {
			
			var self = this,
				$clone = self.instance.$tooltip.clone(),
				// start position tests session
				ruler = $.tooltipster._getRuler($clone),
				rulerResults = ruler.free().measure();
			
			ruler.destroy();
			
			self.size = rulerResults.size;
			
			// pass to _follow()
			self.helper = helper;
			
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
			
			// set the size here, the position in _follow()
			self.instance.$tooltip
				.css({
					height: self.size.height,
					width: self.size.width
				});
			
			// if an event triggered this method, we can tell where the mouse is.
			// Otherwise, it's a method call which is actually not supposed to happen
			if (event) {
				self._follow(event);
			}
			
			// append the tooltip HTML element to its parent
			self.instance.$tooltip.appendTo(self.instance.options.parent);
			
			self.instance._trigger({
				type: 'repositioned',
				event: event,
				position: {
					// won't be used anyway since we enabled repositionOnScroll
					coord: {
						left: 0,
						top: 0
					},
					size: self.size
				}
			});
		}
	}
});

/* a build task will add "return $;" here for UMD */
