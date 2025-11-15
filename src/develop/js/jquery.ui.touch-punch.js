/**
 * jQuery UI Touch Punch - Simple Touch Support
 * 
 * Converts touch events to mouse events for jQuery UI draggable/sortable
 */

(function($) {
  // Detect touch support
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) {
    return; // No touch support
  }

  var touchHandler = {
    touchStartX: 0,
    touchStartY: 0,
    isDragging: false,
    isScrolling: false,
    $target: null,
    $scrollContainer: null
  };

  // Convert touch events to mouse events
  $(document).on('touchstart', '.ui-draggable, .ui-sortable li, #instructionsContainer li, #programContainer li', function(e) {
    var touch = e.originalEvent.touches[0];
    if (!touch) return;
    
    var $target = $(this);
    touchHandler.touchStartX = touch.clientX;
    touchHandler.touchStartY = touch.clientY;
    touchHandler.isDragging = false;
    touchHandler.isScrolling = false;
    touchHandler.$target = $target;
    
    // Check if we're in a scrollable container
    touchHandler.$scrollContainer = $target.closest('.ui-widget-content[style*="overflow"], [style*="overflow-y"]');
    if (!touchHandler.$scrollContainer.length) {
      touchHandler.$scrollContainer = $target.closest('#instructionsContainer > div');
    }
    
    // Don't prevent default immediately - let the first move determine if it's scroll or drag
  });

  $(document).on('touchmove', '.ui-draggable, .ui-sortable li, #instructionsContainer li, #programContainer li', function(e) {
    if (!touchHandler.$target || !touchHandler.$target.length) return;
    
    var touch = e.originalEvent.touches[0];
    if (!touch) return;
    
    // Calculate movement
    var deltaX = touch.clientX - touchHandler.touchStartX;
    var deltaY = touch.clientY - touchHandler.touchStartY;
    var absDeltaX = Math.abs(deltaX);
    var absDeltaY = Math.abs(deltaY);
    
    // Check if this is an element in the program container (sortable)
    var isInProgram = touchHandler.$target.closest('#programContainer').length > 0;
    
    // If we haven't determined the intent yet
    if (!touchHandler.isDragging && !touchHandler.isScrolling) {
      // For elements in program container, allow smaller movement to start sorting
      var minDistance = isInProgram ? 5 : 10;
      
      // If movement is primarily vertical and we're in a scrollable container, it's scrolling
      // But only if it's NOT in the program container (program container items should be sortable, not scrollable)
      if (!isInProgram && absDeltaY > absDeltaX && absDeltaY > 10 && touchHandler.$scrollContainer.length) {
        var scrollTop = touchHandler.$scrollContainer.scrollTop();
        var scrollHeight = touchHandler.$scrollContainer[0].scrollHeight;
        var clientHeight = touchHandler.$scrollContainer[0].clientHeight;
        
        // Check if we can scroll in this direction
        if ((deltaY > 0 && scrollTop < scrollHeight - clientHeight) ||
            (deltaY < 0 && scrollTop > 0)) {
          touchHandler.isScrolling = true;
          return; // Allow native scroll
        }
      }
      
      // If movement is significant, start dragging/sorting
      if (absDeltaX > minDistance || absDeltaY > minDistance) {
        touchHandler.isDragging = true;
        
        // Now dispatch the initial mousedown event
        var mouseDownEvent;
        if (document.createEvent) {
          mouseDownEvent = document.createEvent('MouseEvents');
          mouseDownEvent.initMouseEvent('mousedown', true, true, window, 1, 
            touch.screenX, touch.screenY, touch.clientX, touch.clientY,
            false, false, false, false, 0, null);
        } else {
          mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: touch.screenX,
            screenY: touch.screenY,
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            buttons: 1
          });
        }
        
        touchHandler.$target[0].dispatchEvent(mouseDownEvent);
        e.preventDefault();
      } else {
        return; // Too small movement, wait
      }
    }
    
    // If we're scrolling, don't interfere
    if (touchHandler.isScrolling) {
      return;
    }
    
    // If we're dragging, convert to mouse events
    if (touchHandler.isDragging) {
      // Create and dispatch mousemove event
      var mouseEvent;
      if (document.createEvent) {
        mouseEvent = document.createEvent('MouseEvents');
        mouseEvent.initMouseEvent('mousemove', true, true, window, 0,
          touch.screenX, touch.screenY, touch.clientX, touch.clientY,
          false, false, false, false, 0, null);
      } else {
        mouseEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 0,
          screenX: touch.screenX,
          screenY: touch.screenY,
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0,
          buttons: 1
        });
      }
      
      document.dispatchEvent(mouseEvent);
      
      // Prevent default scrolling during drag
      e.preventDefault();
    }
  });

  $(document).on('touchend touchcancel', '.ui-draggable, .ui-sortable li, #instructionsContainer li, #programContainer li', function(e) {
    if (!touchHandler.$target || !touchHandler.$target.length) {
      // Reset if no target
      touchHandler.isDragging = false;
      touchHandler.isScrolling = false;
      touchHandler.$target = null;
      touchHandler.$scrollContainer = null;
      return;
    }
    
    // Only dispatch mouseup if we were dragging (not scrolling)
    if (touchHandler.isDragging) {
      var touch = e.originalEvent.changedTouches[0];
      if (!touch) touch = e.originalEvent.touches[0];
      if (touch) {
        // Create and dispatch mouseup event
        var mouseEvent;
        if (document.createEvent) {
          mouseEvent = document.createEvent('MouseEvents');
          mouseEvent.initMouseEvent('mouseup', true, true, window, 1,
            touch.screenX, touch.screenY, touch.clientX, touch.clientY,
            false, false, false, false, 0, null);
        } else {
          mouseEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: touch.screenX,
            screenY: touch.screenY,
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            buttons: 0
          });
        }
        
        document.dispatchEvent(mouseEvent);
        e.preventDefault();
      }
    }
    
    // Reset handler
    touchHandler.isDragging = false;
    touchHandler.isScrolling = false;
    touchHandler.$target = null;
    touchHandler.$scrollContainer = null;
  });

})(jQuery);

