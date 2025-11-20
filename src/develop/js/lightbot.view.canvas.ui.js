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
    showSandboxScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'sandboxScreen'});
      $('title').text('SapoBot - Map Editor');

      $('.ui-screen').hide();
      $('#sandboxScreen').show();
    },
    showCommunityScreen: function(hist) {
      lightBot.ui.media.playMenuAudio();

      if (hist == null && lightBot.ui.History) lightBot.ui.History.pushState({page: 'communityScreen'});
      $('title').text('SapoBot - Community');

      $('.ui-screen').hide();
      $('#communityScreen').show();

      if (!window.lightBot || !lightBot.community || !lightBot.community.listMaps) {
        $('#communityList').empty().append('<li>Community is unavailable.</li>');
        return;
      }

      $('#communityList').empty().append('<li>Loading maps...</li>');

      lightBot.community.listMaps().then(function(result) {
        $('#communityList').empty();
        if (!result || result.error) {
          $('#communityList').append('<li>Error loading community maps.</li>');
          return;
        }
        var data = result.data || [];
        if (!data.length) {
          $('#communityList').append('<li>No community maps yet.</li>');
          return;
        }

        // make the list a flex grid container once
        $('#communityList').css({
          display: 'flex',
          'flex-wrap': 'wrap',
          'justify-content': 'flex-start',
          'gap': '10px'
        });
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          var name = item.name || ('Map ' + item.id);
          var $li = $('<li class="community-level ui-state-default" data-id="' + item.id + '" data-name="' + name.replace(/"/g, '&quot;') + '"><span class="level-number">' + name + '</span></li>');
          // tarjeta cuadrada: ancho fijo, alto mínimo similar, centrado del texto
          $li.css({
            width: '160px',
            height: '120px',
            padding: '10px',
            'text-align': 'center',
            'background-color': '#2c2c2c',
            'border-radius': '4px',
            'border': '1px solid #444',
            'box-sizing': 'border-box',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            cursor: 'pointer',
            color: '#ffffff',
            'font-weight': 'bold',
            'font-size': '14px',
            'line-height': '1.2',
            'overflow': 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'normal'
          });
          $li.appendTo('#communityList');
        }

        // simple search filter
        $('#communitySearch').off('keyup').on('keyup', function() {
          var q = $(this).val().toLowerCase();
          $('#communityList li.community-level').each(function() {
            var name = ($(this).data('name') || '').toLowerCase();
            if (!q || name.indexOf(q) !== -1) {
              $(this).show();
            } else {
              $(this).hide();
            }
          });
        });

        // click handler: load and play community map in normal game UI
        $('#communityList li.community-level').off('click').on('click', function() {
          var id = $(this).data('id');
          if (!id || !lightBot.community || !lightBot.community.getMapById) {
            return;
          }
          // load map by id
          lightBot.community.getMapById(id).then(function(result) {
            if (!result || result.error || !result.data || !result.data.map) {
              alert('Error loading community map.');
              return;
            }

            if (!lightBot.map || !lightBot.map.loadCommunityMap) {
              alert('Community maps are not supported in this build.');
              return;
            }

            // mark that we are in a community map
            if (!window.lightBot) {
              window.lightBot = {};
            }
            lightBot.currentCommunityMap = true;

            // prepare the map
            lightBot.map.loadCommunityMap(result.data.map, result.data.name);

            // show game screen with a special label
            lightBot.ui.media.playGameAudio();

            // use the same flow as showGameScreen but without levelNumber
            if (lightBot.updateProjection) {
              setTimeout(function() {
                lightBot.updateProjection();
              }, 10);
            }

            if (lightBot.ui.editor && lightBot.ui.editor.cleanup) {
              lightBot.ui.editor.cleanup();
            }

            $('#programContainer ul').html('');
            $('#programContainer ul').append('<li class="ui-state-default placeholder"><p class="placeholder">Drop your instructions here</p></li>');
            if (lightBot.ui.editor && lightBot.ui.editor.makeDroppable) {
              lightBot.ui.editor.makeDroppable();
            }

            $('#runButton').button('option', {label: 'Run', icons: {primary: 'ui-icon-play'}}).removeClass('ui-state-highlight');
            $('#gameScreen .level-indicator').text('Community map: ' + (result.data.name || id));

            $('.ui-screen').hide();
            $('#gameScreen').show();
          });
        });
      });
    },
    showGameScreen: function(level, hist) {
      lightBot.ui.media.playGameAudio();

      // entering a normal level, not a community map
      if (!window.lightBot) {
        window.lightBot = {};
      }
      lightBot.currentCommunityMap = false;

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