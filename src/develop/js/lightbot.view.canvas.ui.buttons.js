/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {

  // show help screen button
  $('.helpButton').button({
    icons: {
      primary: "ui-icon-help"
    }
  }).click(function() {
    lightBot.ui.showHelpScreen();
  });

  // show welcome screen button
  $('.mainMenuButton').button({
    icons: {
      primary: "ui-icon-home"
    }
  }).click(function() {
    lightBot.ui.showWelcomeScreen();
  });

  // show achievements screen button
  $('.achievementsButton').button({
    icons: {
      primary: "ui-icon-flag"
    }
  }).click(function() {
    lightBot.ui.showAchievementsScreen();
  });

  // show level select screen button
  $('.levelSelectButton').button({
    icons: {
      primary: "ui-icon-power"
    }
  }).click(function() {
    lightBot.ui.showLevelSelectScreen();
  });
  $('#gameScreen .levelSelectButton').button('option', {icons: {primary: 'ui-icon-home'}});

  // show game screen buttons
  $('#levelList li').live({
    'mouseover':  function() {$(this).addClass('ui-state-hover');},
    'mouseout': function() {$(this).removeClass('ui-state-hover');},
    'click': function () {
      // Get level number from data attribute or from the level-number span
      var levelNum = $(this).data('level');
      if (levelNum === undefined) {
        levelNum = $(this).find('.level-number').text() || $(this).text().replace(/[^0-9]/g, '');
      }
      lightBot.ui.showGameScreen(levelNum);
    }
  });

  // audio toggle buttons
  $('.audioToggleButton').button({
    icons: {
      primary: "ui-icon-volume-on"
    },
    text: false
  }).click(function() {
    lightBot.ui.media.toggleAudio();
  });

  // run program button
  $('#runButton').button({
    icons: {
      primary: "ui-icon-play"
    }
  }).click(function() {
    if (lightBot.bot.isInExecutionMode()) {
      // reset the map (resets the bot as well)
      lightBot.map.reset();

      $(this).button('option', {label: 'Run', icons: {primary: 'ui-icon-play'}}).removeClass('ui-state-highlight');
    } else {
      var instructions = lightBot.ui.editor.getInstructions($('#programContainer > div > ul > li'));
      lightBot.bot.queueInstructions(instructions);
      lightBot.bot.execute();

      $(this).button('option', {label: 'Stop', icons: {primary: 'ui-icon-stop'}}).addClass('ui-state-highlight');
    }
  });

  // speed button
  $('#speedButton').button({
    icons: {
      primary: "ui-icon-arrow-2-n-s"
    }
  }).click(function() {
    var currentSpeed = lightBot.bot.getSpeedMultiplier();
    var newSpeed;
    if (currentSpeed >= 3.0) {
      newSpeed = 1.0;
    } else if (currentSpeed >= 2.0) {
      newSpeed = 3.0;
    } else {
      newSpeed = 2.0;
    }
    lightBot.bot.setSpeedMultiplier(newSpeed);
    $(this).button('option', {label: 'Speed: x' + newSpeed.toFixed(1)});
  });

  // clear program button
  $('#clearButton').button({
    icons: {
      primary: "ui-icon-document"
    }
  }).click(function() {
    if (confirm('Are you sure you want to clear all instructions? This action cannot be undone.')) {
      $('#programContainer ul').empty();
      lightBot.ui.editor.saveProgram();
    }
  });

  // export/import data buttons
  $('#exportDataButton, #importDataButton').button({
    icons: {
      primary: "ui-icon-disk"
    }
  });
  $('#importDataButton').button('option', {icons: {primary: 'ui-icon-folder-open'}});

  // help screen accordion (header buttons)
  $('#helpScreenAccordion').accordion({
    autoHeight: false,
    navigation: true,
    icons: false,
    change: function(event, ui) {
      lightBot.ui.media.playVideo($('#helpScreenAccordion h3').index(ui.newHeader));
    }
  });
});