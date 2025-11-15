/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {

  var ui = {
    showWelcomeScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      // save in history if parameter hist is not set and then set the new page title
      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'welcomeScreen'});
      $('title').text('SapoBot - zKeven');

      $('.ui-screen').hide();
      $('#welcomeScreen').show();
    },
    showHelpScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      // save in history if parameter hist is not set and then set the new page title
      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'helpScreen'});
      $('title').text('SapoBot - Help');

      $('.ui-screen').hide();
      $('#helpScreen').show();
    },
    showAchievementsScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      var enabled = false;

      $('#achievementsList').empty();
      var achievements = lightBot.achievements.getAchievementsList();
      for (var i = 0; i < achievements.length; i++) {
        enabled = lightBot.achievements.hasAchievement(achievements[i].name) ? true : false;
        $('<li class="' + ((enabled) ? '' : 'ui-state-disabled') + '"><img src="img/achievements/'+achievements[i].name+'.png"><h3>'+achievements[i].title+'</h3><p>'+achievements[i].message+'</p></li>').appendTo('#achievementsList');
      }

      // save in history if parameter hist is not set and then set the new page title
      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'achievementsScreen'});
      $('title').text('SapoBot - Achievements');

      $('.ui-screen').hide();
      $('#achievementsScreen').show();
    },
    showLevelSelectScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      $('#levelList').empty();
      for (var i = 0; i < lightBot.map.getNbrOfLevels(); i++) {
        var item = parseInt(localStorage.getItem('lightbot_level_'+i), 10);
        var medal = '';
        if (item) {
          switch (item) {
            case lightBot.medals.gold:
              medal = 'medal-gold';
              break;
            case lightBot.medals.silver:
              medal = 'medal-silver';
              break;
            case lightBot.medals.bronze:
              medal = 'medal-bronze';
              break;
            case lightBot.medals.noMedal:
              break;
            default:
              console.error('Unknown medal "' + medal + '"');
              break;
          }
        }
        
        // Get medal requirements for this level
        var levelMedals = lightBot.map.getLevelMedals(i);
        var medalInfo = '';
        if (levelMedals) {
          medalInfo = '<div class="medal-requirements">' +
            '<span class="medal-req gold">G: ' + levelMedals.gold + '</span>' +
            '<span class="medal-req silver">S: ' + levelMedals.silver + '</span>' +
            '<span class="medal-req bronze">B: ' + levelMedals.bronze + '</span>' +
            '</div>';
        }
        
        if (item) {
          $('<li class="ui-state-highlight" data-level="'+i+'"><span class="medal '+medal+'" style="position: absolute; top: 2px; right: 2px"></span><span class="level-number">'+i+'</span>' + medalInfo + '</li>').appendTo('#levelList');
        } else {
          $('<li data-level="'+i+'"><span class="level-number">'+i+'</span>' + medalInfo + '</li>').appendTo('#levelList');
        }
      }

      // save in history if parameter hist is not set and then set the new page title
      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'levelSelectScreen'});
      $('title').text('SapoBot - Level Select');

      $('.ui-screen').hide();
      $('#levelSelectScreen').show();
    },
    showGameScreen: function(level, hist) {
      lightBot.ui.media.playGameAudio();

      // load the map
      lightBot.map.loadMap(level);
      
      // Update projection to center the map (with a small delay to ensure map is loaded)
      setTimeout(function() {
        if (lightBot.updateProjection) {
          lightBot.updateProjection();
        }
      }, 10);

      // save in history if parameter hist is not set and then set the new page title
      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'gameScreen', 'level': level});
      $('title').text('SapoBot - Level ' + level);

      $('.ui-screen').hide();

      // Clean up all draggable/droppable/sortable instances before removing elements
      lightBot.ui.editor.cleanup();

      //clear all instructions in main program
      $('#programContainer ul').html('');

      if (localStorage.getItem('lightbot_program_level_' + level)) {
        lightBot.ui.editor.loadProgram();
      } else {
        //append placeholder instruction
        $('#programContainer ul').append('<li class="ui-state-default placeholder"><p class="placeholder">Drop your instructions here</p></li>');
        // Reinitialize droppable for the placeholder
        lightBot.ui.editor.makeDroppable();
      }

      // reset the run button
      $('#runButton').button('option', {label: 'Run', icons: {primary: 'ui-icon-play'}}).removeClass('ui-state-highlight');

      // Update level indicator
      $('#gameScreen .level-indicator').text('Level ' + level);

      // show the game screen
      $('#gameScreen').show();
    }
  };

  lightBot.ui = ui;
})();