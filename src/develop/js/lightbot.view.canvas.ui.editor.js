/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {

  // save the program when the value of input[type=number] changes
  $("#programContainer").delegate(':input[type="number"]', "change", function() {
    lightBot.ui.editor.saveProgram();
  });

  // delete icon for instructions in the program
  $("#programContainer").delegate(".ui-icon-close", "click", function() {
    $(this).parent().parent().remove();
    lightBot.ui.editor.saveProgram();
  });

  // make instructions in the instruction set draggable
  $("#instructionsContainer li").draggable({
    revert: "invalid",
    appendTo: "body",
    helper: "clone",
    cursor: "move",
    // Enable touch support
    distance: 5, // Minimum distance to start dragging (helps with touch)
    delay: 0, // No delay for touch devices
    // Make it follow mouse instantly
    refreshPositions: true, // Update positions immediately
    // Prevent text selection while dragging on touch devices
    start: function(event, ui) {
      if (event.originalEvent && event.originalEvent.touches) {
        event.preventDefault();
      }
      // Make helper follow mouse instantly
      if (ui.helper) {
        ui.helper.css({
          'transition': 'none',
          'animation': 'none'
        });
      }
    },
    drag: function(event, ui) {
      // Update position instantly on every mouse move
      ui.position.left = event.clientX - $(this).data('draggable').offset.click.left;
      ui.position.top = event.clientY - $(this).data('draggable').offset.click.top;
    }
  }).addClass('ui-state-default');

  // hover effect for instructions
  $('#instructionsContainer, #programContainer').delegate('li', 'hover', function() {
    $(this).toggleClass('ui-state-hover');
  });

  // make instructions droppable and sortable
  lightBot.ui.editor.makeDroppable();
  
  // make instructions in the program draggable as well
  lightBot.ui.editor.makeProgramInstructionsDraggable();
});

(function() {

  var editor = {
    // Clean up all draggable/droppable/sortable instances
    cleanup: function() {
      // Destroy all draggables
      $('#programContainer li').each(function() {
        if ($(this).data('draggable')) {
          $(this).draggable('destroy');
        }
      });
      
      // Destroy all droppables and sortables
      var $allAreas = $("#programContainer ul, #programContainer .droppable ul");
      $allAreas.droppable('destroy').sortable('destroy');
    },
    // this function saves the current program in the localStorage
    saveProgram: function() {
      $('#programContainer ul').find(':input[type="number"]').each(function(){
        $(this).attr('value', $(this).val());
      });
      localStorage.setItem('lightbot_program_level_' + lightBot.map.getLevelNumber(), $('#programContainer ul').html());
    },
    loadProgram: function() {
      // First, clean up all existing draggable instances
      $('#programContainer li').each(function() {
        if ($(this).data('draggable')) {
          $(this).draggable('destroy');
        }
      });
      
      // Clear the container and load the saved program
      var savedProgram = localStorage.getItem('lightbot_program_level_' + lightBot.map.getLevelNumber());
      if (savedProgram) {
        console.log("Loading program, HTML length:", savedProgram.length);
        $('#programContainer ul').html(savedProgram);
        // Remove all UI state classes that might interfere
        $('#programContainer ul').find('*').removeClass('ui-state-hover ui-state-droppable ui-draggable ui-draggable-dragging ui-sortable-helper');
        
        // Force visibility and proper display for all elements
        var $allLis = $('#programContainer ul li');
        console.log("Found", $allLis.length, "list items after loading");
        $allLis.each(function(index) {
          var $li = $(this);
          var $p = $li.find('> p');
          console.log("Item", index, "has class:", $li.attr('class'), "p class:", $p.attr('class'));
          
          $li.css({
            display: 'block',
            visibility: 'visible',
            opacity: '1'
          });
          // Ensure the paragraph inside is visible
          $p.css({
            display: 'block',
            visibility: 'visible',
            opacity: '1'
          });
          // Make sure all nested content in repeats is visible
          $li.find('.droppable').css({
            display: 'block',
            visibility: 'visible'
          });
          
          // Mark elements in main program as no-draggable (they use sortable only)
          // Elements in repeats will be handled by makeProgramInstructionsDraggable
          var $parentList = $li.closest('ul');
          var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                                $parentList.closest('.droppable').length === 0;
          if (isInMainProgram) {
            $li.data('no-draggable', true);
            $li.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
            $li.removeData('draggable');
            $li.removeData('should-be-draggable');
          }
        });
      }
      
      // Use a small delay to ensure DOM is ready before reinitializing
      var self = this;
      setTimeout(function() {
        // Reinitialize droppable and sortable
        self.makeDroppable();
        // Make all instructions draggable
        self.makeProgramInstructionsDraggable();
      }, 10);
    },
    // this function makes "repeat" instructions a droppable area
    makeDroppable: function() {
      // Get all droppable areas (main program and all repeat containers)
      var allDroppableAreas = $("#programContainer ul, #programContainer .droppable ul");
      
      // Save sortable options before destroying
      var savedSortableOptions = {};
      allDroppableAreas.each(function() {
        var $el = $(this);
        if ($el.data('sortable')) {
          try {
            savedSortableOptions[this] = $el.sortable('option');
          } catch(e) {
            console.log("Error saving sortable options:", e);
          }
        }
      });
      
      // Destroy existing droppable and sortable instances to avoid duplicates
      allDroppableAreas.droppable('destroy').sortable('destroy');
      
      // Make all areas droppable (accept both new instructions and existing ones from program)
      allDroppableAreas.droppable({
        greedy: true, // Changed back to true to ensure droppable works even when sortable is disabled
        tolerance: "pointer", // Use pointer for better precision
        activeClass: "ui-state-droppable",
        hoverClass: "ui-state-droppable-hover",
        accept: function(draggable) {
          // Only accept new instructions from instructionsContainer
          // Do NOT accept existing instructions from programContainer (they use sortable)
          var isFromInstructions = draggable.closest('#instructionsContainer').length > 0;
          var isFromProgram = draggable.closest('#programContainer').length > 0;
          
          // Only accept if it's from instructions container
          // OR if it's from program but is inside a repeat (needs to be draggable to move between repeats)
          var isInRepeat = isFromProgram && draggable.closest('.droppable').length > 0;
          var isInMainProgram = isFromProgram && !isInRepeat;
          
          // Reject if it's from main program (not in repeat) - these use sortable only
          if (isInMainProgram) {
            console.log("Droppable REJECT - Element from main program (use sortable):", draggable[0]);
            return false;
          }
          
          var isAccepted = isFromInstructions || isInRepeat;
          console.log("Droppable accept check:", isAccepted, "fromInstructions:", isFromInstructions, "fromProgram:", isFromProgram, "inRepeat:", isInRepeat, draggable[0]);
          return isAccepted;
        },
        scope: "default",
        over: function(event, ui) {
          // Don't handle if sortable is active
          if (ui.draggable && ui.draggable.data('sortable-active')) {
            return;
          }
          console.log("Droppable OVER - Element:", ui.draggable[0], "Target:", $(this)[0]);
        },
        drop: function( event, ui ) {
          // Don't handle if sortable is active (sortable handles reordering)
          if (ui.draggable && ui.draggable.data('sortable-active')) {
            console.log("DROPPABLE DROP - Sortable is active, ignoring");
            return;
          }
          
          // Only handle drops from instructionsContainer (new instructions)
          // Existing instructions in program are handled by sortable via connectWith
          var isFromInstructions = $(ui.draggable).closest('#instructionsContainer').length > 0;
          if (!isFromInstructions) {
            // This is an existing instruction being moved - let sortable handle it
            console.log("DROPPABLE DROP - Existing instruction, letting sortable handle via connectWith");
            // Also ensure the element is not draggable if it's in the main program
            var $targetList = $(this);
            var isTargetInMainProgram = $targetList.closest('#programContainer').length > 0 && 
                                        $targetList.closest('.droppable').length === 0;
            if (isTargetInMainProgram && ui.draggable.data('draggable')) {
              // Use setTimeout to ensure draggable cleanup is complete
              // Only destroy if not currently being dragged
              var $draggable = ui.draggable;
              setTimeout(function() {
                // Check if element still exists and is not being dragged
                if ($draggable.length && $draggable.data('draggable') && !$draggable.data('dragging-element')) {
                  try {
                    $draggable.draggable('destroy');
                    $draggable.removeClass('ui-draggable');
                    $draggable.removeData('draggable');
                    console.log("Destroyed draggable for element being moved to main program");
                  } catch(e) {
                    console.log("Error destroying draggable (may be in use):", e);
                  }
                }
              }, 100);
            }
            return;
          }
          
          console.log("DROPPABLE DROP EXECUTED! Element:", ui.draggable[0], "Target:", $(this)[0]);
          $( this ).children( ".placeholder" ).remove();
          
          console.log("Is from instructions:", isFromInstructions);
          
          if (isFromInstructions) {
            // It's a new instruction from the instructions container, clone it
            var clone = $(ui.draggable.clone());
            // Remove all draggable-related classes and data to ensure clean state
            clone.removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled");
            clone.removeData("draggable");
            clone.removeData("should-be-draggable");
            // Ensure it has the correct state class for sortable
            if (!clone.hasClass('ui-state-default')) {
              clone.addClass('ui-state-default');
            }
            // Remove placeholder class if present
            clone.removeClass('placeholder');
            
            // Insert the element in the correct position based on mouse position
            var $targetList = $(this);
            var $existingItems = $targetList.children('li:not(.placeholder)');
            var insertPosition = null;
            
            // Get mouse position - try multiple sources
            var mouseY = null;
            if (event && event.pageY) {
              mouseY = event.pageY;
            } else if (event && event.originalEvent) {
              if (event.originalEvent.pageY) {
                mouseY = event.originalEvent.pageY;
              } else if (event.originalEvent.touches && event.originalEvent.touches.length > 0) {
                mouseY = event.originalEvent.touches[0].pageY;
              } else if (event.originalEvent.changedTouches && event.originalEvent.changedTouches.length > 0) {
                mouseY = event.originalEvent.changedTouches[0].pageY;
              }
            }
            
            // If we have mouse position and existing items, find insertion point
            if (mouseY && $existingItems.length > 0) {
              // Find the closest item to insert before
              $existingItems.each(function() {
                var $item = $(this);
                var itemOffset = $item.offset();
                if (itemOffset) {
                  var itemTop = itemOffset.top;
                  var itemHeight = $item.outerHeight();
                  var itemCenter = itemTop + itemHeight / 2;
                  
                  // If mouse is above the center of this item, insert before it
                  if (mouseY < itemCenter) {
                    insertPosition = $item;
                    return false; // break
                  }
                }
              });
            }
            
            // Insert in the correct position
            if (insertPosition) {
              clone.insertBefore(insertPosition);
            } else {
              // If no position found or list is empty, append to end
              clone.appendTo($targetList);
            }
            
            // Check if the target is in the main program or in a repeat
            var $targetList = $(this);
            // A repeat is when the ul is inside a .droppable that is inside an li (the repeat instruction)
            // The main program ul is directly inside #programContainer > .droppable > ul
            // Check if the .droppable parent is inside an li (repeat) or directly in #programContainer (main)
            var $droppableParent = $targetList.closest('.droppable');
            var isTargetInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
            var isTargetInMainProgram = $targetList.closest('#programContainer').length > 0 && 
                                       $droppableParent.length > 0 && 
                                       $droppableParent.parent().is('#programContainer');
            
            console.log("Target analysis - isTargetInMainProgram:", isTargetInMainProgram, "isTargetInRepeat:", isTargetInRepeat);
            console.log("Target list:", $targetList[0], "droppable parent:", $droppableParent[0], "droppable parent's parent:", $droppableParent.parent()[0]);
            
            // Only make draggable if it's inside a repeat
            // Elements in main program use sortable only
            if (isTargetInRepeat) {
              console.log("Target is in repeat, making draggable");
              lightBot.ui.editor.makeInstructionDraggable(clone);
            } else if (isTargetInMainProgram) {
              console.log("Target is in main program, setting up for sortable");
              // Ensure it's NOT draggable in main program
              clone.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
              clone.removeData('draggable');
              clone.removeData('should-be-draggable');
              // Mark explicitly that this should NOT be draggable
              clone.data('no-draggable', true);
              
              // Ensure the element is properly set up for sortable
              clone.css({
                cursor: 'move',
                display: 'block',
                visibility: 'visible',
                opacity: '1',
                position: 'relative'
              });
              
              // CRITICAL: Force sortable to recognize new item immediately
              // We need to refresh multiple times and ensure the element is properly set up
              console.log("Setting up new instruction for sortable, target list:", $targetList[0]);
              
              // First, ensure clone is a direct child and has correct structure
              if (clone.parent()[0] !== $targetList[0]) {
                console.log("Warning: Clone parent mismatch, fixing...");
                clone.detach().appendTo($targetList);
              }
              
              // Force multiple refreshes to ensure recognition
              var refreshCount = 0;
              var doRefresh = function() {
                refreshCount++;
                try {
                  if ($targetList.data('sortable')) {
                    $targetList.sortable('refresh');
                    $targetList.sortable('refreshPositions');
                    $targetList.sortable('enable');
                    
                    // Verify the element is recognized
                    var $items = $targetList.children('li:not(.placeholder)');
                    var cloneIndex = $items.index(clone);
                    console.log("Refresh attempt", refreshCount, "- Items:", $items.length, "Clone index:", cloneIndex);
                    
                    // If still not recognized after 3 attempts, recreate sortable
                    if (cloneIndex === -1 && refreshCount >= 3) {
                      console.log("Element not recognized after", refreshCount, "attempts, recreating sortable...");
                      lightBot.ui.editor.makeDroppable();
                      return; // Stop trying
                    }
                    
                    // If recognized, we're done
                    if (cloneIndex !== -1) {
                      console.log("SUCCESS: New instruction recognized by sortable at index", cloneIndex);
                      return; // Stop trying
                    }
                    
                    // Try again if not recognized yet
                    if (refreshCount < 5) {
                      setTimeout(doRefresh, 10);
                    }
                  } else {
                    console.log("Error: Sortable not found, recreating...");
                    lightBot.ui.editor.makeDroppable();
                  }
                } catch(e) {
                  console.log("Error in refresh attempt", refreshCount, ":", e);
                  if (refreshCount < 3) {
                    setTimeout(doRefresh, 10);
                  }
                }
              };
              
              // Start refreshing immediately
              doRefresh();
            }
            
            // make the area within repeat instructions droppable
            if (clone.children("div").hasClass("droppable")) {
              lightBot.ui.editor.makeDroppable();
              // Also make any existing instructions inside the repeat draggable
              clone.find('.droppable ul li').each(function() {
                lightBot.ui.editor.makeInstructionDraggable($(this));
              });
            }
          }
          // Note: Existing instructions are now handled by sortable via connectWith
          // No need for the else block anymore

          // if the target area was the "main" programContainer ul, scroll to the bottom
          var tmp = $(this).parent();
          if (tmp.parent().is('#programContainer')) {
            tmp.animate({ scrollTop: tmp.height() }, "slow");
          }
          
          // Refresh sortable on all areas to ensure new items are recognized
          // Use setTimeout to ensure DOM is fully updated first
          var $allSortables = $("#programContainer ul, #programContainer .droppable ul");
          setTimeout(function() {
            try {
              $allSortables.each(function() {
                var $sortable = $(this);
                if ($sortable.data('sortable')) {
                  // Ensure sortable is enabled
                  $sortable.sortable('enable');
                  // Force a complete refresh of the sortable
                  $sortable.sortable('refresh');
                  $sortable.sortable('refreshPositions');
                  console.log("Refreshed and enabled sortable:", $sortable[0]);
                }
              });
            } catch(e) {
              console.log("Error refreshing sortables after drop:", e);
            }
          }, 100);

          // save the program
          lightBot.ui.editor.saveProgram();
        }
      });
      
      // Make all areas sortable and connect them so items can move between them
      allDroppableAreas.sortable({
        items: "> li:not(.placeholder)",
        placeholder: "ui-state-highlight",
        cursor: "move",
        connectWith: "#programContainer ul, #programContainer .droppable ul",
        distance: 1, // Minimum distance to start sorting
        delay: 0, // No delay - sortable should activate immediately
        // Make sure sortable works even when elements are not draggable
        handle: false, // Allow dragging from anywhere on the item
        tolerance: "intersect", // More permissive - allows dropping when items overlap
        // Allow dropping into empty lists (important for repeats)
        dropOnEmpty: true,
        axis: false,
        cancel: ".ui-icon-close, input",
        forcePlaceholderSize: true, // Ensure placeholder is visible
        // Make it easier to drop items
        scroll: true,
        scrollSensitivity: 40,
        scrollSpeed: 20,
        helper: "original", // Use original element, not clone
        // Make it follow mouse instantly
        refreshPositions: true, // Update positions immediately
        // Allow receiving items from instructions container or from other sortable lists
        receive: function(event, ui) {
          console.log("SORTABLE RECEIVE - Item:", ui.item[0], "Sender:", ui.sender ? ui.sender[0] : "none");
          
          // Check where the item came from and where it's going
          var $parentList = ui.item.closest('ul');
          var $droppableParent = $parentList.closest('.droppable');
          var isInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
          var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                               $droppableParent.length > 0 && 
                               $droppableParent.parent().is('#programContainer');
          
          // If item is from instructions container, it's a new instruction
          var isFromInstructions = ui.sender && ui.sender.closest('#instructionsContainer').length > 0;
          if (isFromInstructions) {
            // Mark that this was handled by sortable
            ui.item.data('sortable-received', true);
            // Ensure it's not draggable in main program
            if (isInMainProgram) {
              ui.item.data('no-draggable', true);
              ui.item.removeClass('ui-draggable');
              ui.item.removeData('draggable');
            }
          } else if (ui.sender) {
            // Item is being moved from another sortable list (program to repeat or vice versa)
            console.log("Item moved between lists - isInRepeat:", isInRepeat, "isInMainProgram:", isInMainProgram);
            
            // If moved to a repeat, make it draggable
            if (isInRepeat) {
              // Remove no-draggable flag and make it draggable
              ui.item.removeData('no-draggable');
              // Use setTimeout to ensure DOM is updated first
              setTimeout(function() {
                lightBot.ui.editor.makeInstructionDraggable(ui.item);
                // Also refresh the sortable to recognize the new item
                if ($parentList.data('sortable')) {
                  $parentList.sortable('refresh');
                  $parentList.sortable('refreshPositions');
                  console.log("Refreshed repeat list sortable after receiving item");
                }
              }, 0);
            } else if (isInMainProgram) {
              // If moved to main program, ensure it's NOT draggable
              ui.item.data('no-draggable', true);
              if (ui.item.data('draggable')) {
                try {
                  ui.item.draggable('destroy');
                } catch(e) {
                  console.log("Error destroying draggable:", e);
                }
              }
              ui.item.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
              ui.item.removeData('draggable');
              ui.item.removeData('should-be-draggable');
            }
          }
        },
        start: function(event, ui) {
          console.log("SORTABLE START - Item:", ui.item[0]);
          // Mark that sortable is handling this
          ui.item.data('sortable-active', true);
          
          // Ensure the item has proper CSS and classes for sortable to work
          ui.item.css({
            cursor: 'move',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            'transition': 'none',
            'animation': 'none'
          });
          
          // Make helper follow mouse instantly
          if (ui.helper) {
            ui.helper.css({
              'transition': 'none',
              'animation': 'none'
            });
          }
          
          // Ensure it has the correct state class
          if (!ui.item.hasClass('ui-state-default')) {
            ui.item.addClass('ui-state-default');
          }
          
          // Remove placeholder class if present
          ui.item.removeClass('placeholder');
          
          // Check if item is in main program or in repeat
          var $parentList = ui.item.closest('ul');
          var $droppableParent = $parentList.closest('.droppable');
          var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                                $parentList.closest('.droppable').length === 0;
          var isInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
          
          // If the item is draggable, destroy it if in main program or repeat, otherwise disable it
          if (ui.item.data('draggable')) {
            if (isInMainProgram || isInRepeat) {
              // Destroy draggable completely for main program items and repeat items
              // Sortable handles movement within the same list
              try {
                ui.item.draggable('destroy');
                ui.item.removeClass('ui-draggable ui-draggable-disabled');
                ui.item.removeData('draggable');
                ui.item.removeData('should-be-draggable');
                console.log("Destroyed draggable in sortable start for", isInMainProgram ? "main program" : "repeat", "item");
              } catch(e) {
                console.log("Error destroying draggable in sortable start:", e);
                // Force remove classes and data even if destroy fails
                ui.item.removeClass('ui-draggable ui-draggable-disabled');
                ui.item.removeData('draggable');
                ui.item.removeData('should-be-draggable');
              }
            } else {
              // Just disable for other cases
              try {
                if (ui.item.data('draggable')) {
                  ui.item.draggable('disable');
                  ui.item.data('draggable-was-enabled', true);
                  console.log("Disabled draggable during sortable");
                }
              } catch(e) {
                console.log("Error disabling draggable in sortable start:", e);
                ui.item.data('draggable-was-enabled', true);
              }
            }
          } else if (isInMainProgram || isInRepeat) {
            // Ensure it's not draggable even if data says otherwise
            ui.item.removeClass('ui-draggable ui-draggable-disabled');
            ui.item.removeData('draggable');
            ui.item.removeData('should-be-draggable');
          }
        },
        over: function(event, ui) {
          // When dragging over a repeat's inner list, mark it so we can prioritize it
          // This prevents items from being inserted above/below the repeat
          if (!ui.item) return;
          
          var $currentList = $(this);
          var $droppableParent = $currentList.closest('.droppable');
          var isRepeatList = $droppableParent.length > 0 && $droppableParent.parent().is('li');
          
          if (isRepeatList) {
            // Mark that we're over a repeat list
            ui.item.data('over-repeat-list', true);
            console.log("Over repeat list - will prioritize repeat over main list");
          }
        },
        out: function(event, ui) {
          // Clear the flag when leaving repeat area
          if (ui.item && ui.item.data('over-repeat-list')) {
            ui.item.removeData('over-repeat-list');
            console.log("Left repeat list area");
          }
        },
        sort: function(event, ui) {
          // gets added unintentionally by droppable interacting with sortable
          allDroppableAreas.removeClass( "ui-state-droppable" );
        },
        receive: function(event, ui) {
          // If the item was dropped by droppable, prevent sortable from processing it
          if (ui.item.data('dropped-by-droppable')) {
            console.log("Sortable receive cancelled - handled by droppable");
            return false;
          }
        },
        stop: function( event, ui ) {
          console.log("SORTABLE STOP - Item:", ui.item[0]);
          
          // Clean up flags
          if (ui.item) {
            ui.item.removeData('over-repeat-list');
          }
          
          // Only process if the item was actually moved by sortable (not by droppable)
          if (ui.item.data('dropped-by-droppable')) {
            console.log("Sortable stop cancelled - handled by droppable");
            ui.item.removeData('dropped-by-droppable');
            ui.item.removeData('sortable-active');
            return;
          }
          
          // Clean up
          ui.item.removeData('sortable-active');
          
          // Ensure the item has proper CSS for sortable to work
          ui.item.css({
            cursor: 'move',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            position: 'relative'
          });
          
          // Ensure it has the correct state class
          if (!ui.item.hasClass('ui-state-default')) {
            ui.item.addClass('ui-state-default');
          }
          
          // Check where the item is now
          var $parentList = ui.item.closest('ul');
          // Use the same logic as in drop to correctly detect main program vs repeat
          var $droppableParent = $parentList.closest('.droppable');
          var isInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
          var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                               $droppableParent.length > 0 && 
                               $droppableParent.parent().is('#programContainer');
          
          console.log("SORTABLE STOP - Location check - isInMainProgram:", isInMainProgram, "isInRepeat:", isInRepeat);
          
          // If item is in main program, make sure it's NOT draggable (only sortable)
          if (isInMainProgram) {
            // Destroy draggable immediately if it exists
            if (ui.item.data('draggable')) {
              try {
                ui.item.draggable('destroy');
              } catch(e) {
                console.log("Error destroying draggable:", e);
              }
            }
            // Remove ALL draggable-related classes and data
            ui.item.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
            ui.item.removeData('draggable');
            ui.item.removeData('draggable-was-enabled');
            ui.item.removeData('should-be-draggable');
            // Mark explicitly that this should NOT be draggable
            ui.item.data('no-draggable', true);
            console.log("Ensured main program item is not draggable");
            
            // Force refresh sortable to ensure the item remains sortable
            // Use setTimeout to ensure DOM is fully updated
            setTimeout(function() {
              try {
                if ($parentList.data('sortable')) {
                  // Ensure sortable is enabled
                  $parentList.sortable('enable');
                  // Refresh to recognize new items
                  $parentList.sortable('refresh');
                  $parentList.sortable('refreshPositions');
                  console.log("Sortable refreshed and enabled after stop in main program");
                  
                  // Verify all items are still sortable and NOT draggable
                  var $allItems = $parentList.find('li:not(.placeholder)');
                  console.log("Total sortable items after refresh:", $allItems.length);
                  
                  // Double-check each item is properly configured
                  $allItems.each(function(index) {
                    var $item = $(this);
                    if ($item.hasClass('placeholder')) {
                      console.log("Warning: Item", index, "has placeholder class");
                    }
                    if (!$item.hasClass('ui-state-default')) {
                      $item.addClass('ui-state-default');
                    }
                    // Ensure NO item in main program is draggable
                    if ($item.data('draggable')) {
                      try {
                        $item.draggable('destroy');
                      } catch(e) {
                        console.log("Error destroying draggable on item", index, ":", e);
                      }
                    }
                    $item.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
                    $item.removeData('draggable');
                    $item.removeData('should-be-draggable');
                    $item.data('no-draggable', true);
                  });
                  
                  // Double-check: ensure NO element in main program becomes draggable
                  // This is critical to prevent elements from becoming draggable after sortable stop
                  setTimeout(function() {
                    $allItems.each(function() {
                      var $item = $(this);
                      if ($item.data('draggable')) {
                        console.log("WARNING: Found draggable element in main program after stop, destroying it");
                        try {
                          $item.draggable('destroy');
                        } catch(e) {
                          console.log("Error destroying draggable:", e);
                        }
                        $item.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
                        $item.removeData('draggable');
                        $item.removeData('should-be-draggable');
                        $item.data('no-draggable', true);
                      }
                    });
                  }, 50);
                } else {
                  console.log("Warning: Sortable not found on parent list after stop");
                }
              } catch(e) {
                console.log("Error refreshing sortable after stop:", e);
              }
            }, 10);
          } else if (isInRepeat) {
            // If item is in a repeat, DON'T make it draggable
            // Sortable handles movement within the same repeat
            // Draggable is only needed when moving between different repeats
            // Remove no-draggable flag first
            ui.item.removeData('no-draggable');
            
            // Ensure it's NOT draggable - sortable handles it
            if (ui.item.data('draggable')) {
              try {
                ui.item.draggable('destroy');
                ui.item.removeClass('ui-draggable ui-draggable-disabled');
                ui.item.removeData('draggable');
                ui.item.removeData('should-be-draggable');
                console.log("Removed draggable from repeat item - sortable handles it");
              } catch(e) {
                console.log("Error removing draggable:", e);
              }
            }
            
            // CRITICAL: Refresh the sortable of the repeat list to recognize the moved item
            // This is essential for items to remain sortable after being moved within a repeat
            var refreshRepeatSortable = function() {
              try {
                if ($parentList.data('sortable')) {
                  $parentList.sortable('enable');
                  $parentList.sortable('refresh');
                  $parentList.sortable('refreshPositions');
                  console.log("Refreshed repeat list sortable after moving item");
                  
                  // Verify the item is recognized
                  var $items = $parentList.children('li:not(.placeholder)');
                  var itemIndex = $items.index(ui.item);
                  console.log("Item index in repeat list after refresh:", itemIndex, "Total items:", $items.length);
                } else {
                  console.log("Warning: Sortable not found on repeat list");
                }
              } catch(e) {
                console.log("Error refreshing repeat list sortable:", e);
              }
            };
            
            // Refresh immediately and also after a delay to ensure it works
            refreshRepeatSortable();
            setTimeout(refreshRepeatSortable, 10);
            setTimeout(refreshRepeatSortable, 50);
          }
          
          // If it's a repeat, make sure its inner area is still droppable and all its children are draggable
          if (ui.item.children("div").hasClass("droppable")) {
            lightBot.ui.editor.makeDroppable();
            // Make all instructions inside the repeat draggable (recursively)
            ui.item.find('.droppable ul li').each(function() {
              lightBot.ui.editor.makeInstructionDraggable($(this));
              // If it's a nested repeat, also handle its children
              if ($(this).children("div").hasClass("droppable")) {
                $(this).find('.droppable ul li').each(function() {
                  lightBot.ui.editor.makeInstructionDraggable($(this));
                });
              }
            });
          }
          
          // Refresh all sortables to ensure everything is in sync
          // This is especially important for repeat lists where items need to remain sortable
          setTimeout(function() {
            try {
              var $allSortables = $("#programContainer ul, #programContainer .droppable ul");
              $allSortables.each(function() {
                var $sortable = $(this);
                if ($sortable.data('sortable')) {
                  // Ensure sortable is enabled
                  $sortable.sortable('enable');
                  // Refresh to recognize all items - CRITICAL for repeat lists
                  $sortable.sortable('refresh');
                  $sortable.sortable('refreshPositions');
                  console.log("Refreshed and enabled sortable:", $sortable[0]);
                  
                  // Double-check: if this is a repeat list, verify all items are recognized
                  var $droppableParent = $sortable.closest('.droppable');
                  var isRepeatList = $droppableParent.length > 0 && $droppableParent.parent().is('li');
                  if (isRepeatList) {
                    var $items = $sortable.children('li:not(.placeholder)');
                    console.log("Repeat list has", $items.length, "items after refresh");
                    // Ensure all items in repeat are properly configured
                    $items.each(function() {
                      var $item = $(this);
                      if (!$item.hasClass('ui-state-default')) {
                        $item.addClass('ui-state-default');
                      }
                    });
                  }
                }
              });
            } catch(e) {
              console.log("Error refreshing all sortables after stop:", e);
            }
          }, 50);
          
          // save the program
          lightBot.ui.editor.saveProgram();
        }
      });
    },
    
    // Make instructions in the program draggable (recursively)
    // NOTE: Elements in the main program container are NOT made draggable
    // They use sortable for reordering. Only elements inside repeat blocks need draggable.
    makeProgramInstructionsDraggable: function() {
      // Recursive function to make instructions draggable only inside repeat blocks
      var makeDraggableRecursive = function($container, isInRepeat) {
        $container.find('> li').each(function() {
          var $li = $(this);
          
          // Only make draggable if it's inside a repeat block
          // Elements in main program use sortable only
          if (isInRepeat) {
            lightBot.ui.editor.makeInstructionDraggable($li);
          }
          
          // If it's a repeat, recursively make its children draggable
          var $repeatUl = $li.find('> .droppable > .ui-widget-content > ul, > .droppable > ul');
          if ($repeatUl.length > 0) {
            makeDraggableRecursive($repeatUl, true); // Children are in a repeat
          }
        });
      };
      
      // Start with the main program container (not in repeat)
      makeDraggableRecursive($("#programContainer ul"), false);
    },
    
    // Make a single instruction draggable
    makeInstructionDraggable: function($instruction) {
      // Check if the instruction is in the main program (not in a repeat)
      // Elements in main program should NOT be draggable (they use sortable only)
      var $parentList = $instruction.closest('ul');
      var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                            $parentList.closest('.droppable').length === 0;
      
      // Check if element is explicitly marked as no-draggable
      if ($instruction.data('no-draggable')) {
        console.log("Skipping draggable - element marked as no-draggable");
        // Ensure it's not draggable
        if ($instruction.data('draggable')) {
          try {
            $instruction.draggable('destroy');
          } catch(e) {
            console.log("Error destroying draggable:", e);
          }
        }
        $instruction.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
        $instruction.removeData('draggable');
        $instruction.removeData('should-be-draggable');
        return;
      }
      
      if (isInMainProgram) {
        // Don't make it draggable if it's in the main program
        console.log("Skipping draggable for main program item");
        // Mark it explicitly as no-draggable
        $instruction.data('no-draggable', true);
        // Ensure it's not draggable
        if ($instruction.data('draggable')) {
          try {
            $instruction.draggable('destroy');
          } catch(e) {
            console.log("Error destroying draggable:", e);
          }
        }
        $instruction.removeClass('ui-draggable ui-draggable-dragging ui-draggable-disabled');
        $instruction.removeData('draggable');
        $instruction.removeData('should-be-draggable');
        return;
      }
      
      // Only make it draggable if it's not already draggable and it's not a placeholder
      if (!$instruction.hasClass('ui-draggable') && !$instruction.hasClass('placeholder')) {
        // Destroy any existing draggable instance first
        if ($instruction.data('draggable')) {
          try {
            $instruction.draggable('destroy');
          } catch(e) {
            console.log("Error destroying existing draggable:", e);
          }
        }
        
        // Add a data attribute to mark this as potentially draggable
        // We'll check this before making it draggable
        $instruction.data('should-be-draggable', true);
        
        // Use a function to check if element should be draggable before initializing
        var checkIfDraggable = function() {
          var $parentList = $instruction.closest('ul');
          var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                                $parentList.closest('.droppable').length === 0;
          return !isInMainProgram;
        };
        
        // Only make draggable if check passes
        if (checkIfDraggable()) {
          // Check if element is in a repeat - if so, don't make it draggable
          // Sortable will handle movement within the same repeat
          var $parentList = $instruction.closest('ul');
          var $droppableParent = $parentList.closest('.droppable');
          var isInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
          
          if (isInRepeat) {
            // Don't make it draggable if it's in a repeat - sortable handles it
            console.log("Skipping draggable for repeat item - sortable will handle it");
            return;
          }
          
          $instruction.draggable({
            revert: "invalid",
            appendTo: "body",
            helper: "clone",
            cursor: "move",
            scope: "default",
            // Cancel if element is in main program - this prevents activation
            cancel: function() {
              var $parentList = $instruction.closest('ul');
              var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                                    $parentList.closest('.droppable').length === 0;
              return isInMainProgram;
            },
            // Enable touch support
            distance: 1, // Minimum distance to start dragging
            delay: 0, // No delay - immediate response
            // Make it follow mouse instantly
            refreshPositions: true, // Update positions immediately
            // Disable iframe fix which can cause elementFromPoint issues
            iframeFix: false,
            start: function(event, ui) {
              console.log("DRAGGABLE START - Element:", ui.helper ? (ui.helper[0] || ui.helper) : "no helper");
              
              var $element = $(this);
              
              // Make helper follow mouse instantly
              if (ui.helper) {
                ui.helper.css({
                  'transition': 'none',
                  'animation': 'none'
                });
              }
              
              // Double-check: if element is in main program, cancel immediately
              var $parentList = $element.closest('ul');
              var isInMainProgram = $parentList.closest('#programContainer').length > 0 && 
                                    $parentList.closest('.droppable').length === 0;
              
              if (isInMainProgram) {
                console.log("Element is in main program, canceling draggable - use sortable instead");
                // Prevent the drag from starting
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
              
              // Prevent default behavior on touch devices
              if (event.originalEvent && event.originalEvent.touches) {
                event.preventDefault();
              }
              // Check if element is in a repeat
              var $parentList = $element.closest('ul');
              var $droppableParent = $parentList.closest('.droppable');
              var isInRepeat = $droppableParent.length > 0 && $droppableParent.parent().is('li');
              
              // Only disable sortable if NOT moving within the same repeat
              // If moving within the same repeat, let sortable handle it (cancel draggable)
              if (!isInRepeat) {
                // Disable sortable when dragging program instructions to let droppable handle drops
                // This allows dropping into repeat containers
                var $allSortables = $("#programContainer ul, #programContainer .droppable ul");
                $allSortables.sortable('disable');
                console.log("Sortable disabled for droppable priority (moving between lists)");
              } else {
                // If in a repeat, cancel draggable and let sortable handle it
                console.log("Element is in repeat - canceling draggable, let sortable handle it");
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
              
              // Store reference to the element being dragged for later verification
              $element.data('dragging-element', $element);
            },
            stop: function(event, ui) {
              console.log("DRAGGABLE STOP - Element:", ui.helper ? (ui.helper[0] || ui.helper) : "no helper");
              
              // Clean up helper if it exists and is still in DOM
              if (ui.helper && ui.helper.length && ui.helper.parent().length) {
                try {
                  ui.helper.remove();
                } catch(e) {
                  console.log("Error removing helper:", e);
                }
              }
              
              // Small delay before re-enabling to ensure drop handler has finished
              var self = this;
              var $allSortables = $("#programContainer ul, #programContainer .droppable ul");
              setTimeout(function() {
                $allSortables.sortable('enable');
                console.log("Sortable re-enabled");
                $(self).removeData('dragging-element');
              }, 100);
            }
          });
        } else {
          // Element is in main program, ensure it's not draggable
          $instruction.removeClass('ui-draggable');
          $instruction.removeData('draggable');
          $instruction.removeData('should-be-draggable');
        }
      }
    },
    // recursively get all the instructions within a repeat instruction
    getInstructions: function(source) {
      var instructions = [];

      source.each(function(index) {
        switch ($(this).children('p').attr('class')) {
          case 'walk':
            instructions.push(new lightBot.bot.instructions.WalkInstruction());
            break;
          case 'jump':
            instructions.push(new lightBot.bot.instructions.JumpInstruction());
            break;
          case 'light':
            instructions.push(new lightBot.bot.instructions.LightInstruction());
            break;
          case 'turnLeft':
            instructions.push(new lightBot.bot.instructions.TurnLeftInstruction());
            break;
          case 'turnRight':
            instructions.push(new lightBot.bot.instructions.TurnRightInstruction());
            break;
          case 'repeat':
            var counter = $(this).children('p').children('span').children('input').val();
            var body = lightBot.ui.editor.getInstructions($(this).children('div').children('div').children('ul').children('li'));
            instructions.push(new lightBot.bot.instructions.RepeatInstruction(counter, body));
            break;
          default:
            break;
        }
      });
      return instructions;
    }
  };

  lightBot.ui.editor = editor;
})();