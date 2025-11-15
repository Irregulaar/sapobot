/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

var canvasView = function(canvas) {
  // set the rendering context
  lightBot.ctx = canvas.get(0).getContext('2d');

  // refresh rate and rendering loop
  var fps = 30;
  var fpsDelay = 1000 / fps;
  var fpsTimer = window.setInterval(update, fpsDelay);

  // distance between lowest point in the map and the bottom edge
  var offsetY = 50;

  // create projection - will be updated when map loads
  lightBot.projection = new lightBot.Projection(canvas.get(0).height, canvas.get(0).width / 2, offsetY);
  
  // Function to update projection when map is loaded
  lightBot.updateProjection = function() {
    var offsetX = canvas.get(0).width / 2;
    // If map is loaded, center based on robot's starting position
    if (lightBot.map && lightBot.map.getLevelSize && lightBot.map.getMapRef && lightBot.bot) {
      var levelSize = lightBot.map.getLevelSize();
      if (levelSize && levelSize.x > 0 && levelSize.y > 0) {
        // Get edge length from first tile
        var firstTile = lightBot.map.getMapRef()[0][0];
        if (firstTile && firstTile.getEdgeLength) {
          var edgeLength = firstTile.getEdgeLength();
          // Get robot's starting position
          var botPos = lightBot.bot.startingPos || lightBot.bot.currentPos;
          if (botPos) {
            // Calculate robot position in world coordinates
            var botWorldX = botPos.x * edgeLength;
            var botWorldZ = botPos.y * edgeLength;
            // Project robot position to screen coordinates using isometric projection
            // Formula: x_screen = offsetX + 0.707*x - 0.707*z
            // We want the robot to be at canvas.width / 2, so:
            // canvas.width / 2 = offsetX + 0.707*botWorldX - 0.707*botWorldZ
            // Therefore: offsetX = canvas.width / 2 - (0.707*botWorldX - 0.707*botWorldZ)
            var projectedBotX = 0.707 * botWorldX - 0.707 * botWorldZ;
            offsetX = canvas.get(0).width / 2 - projectedBotX;
          }
        }
      }
    }
    lightBot.projection = new lightBot.Projection(canvas.get(0).height, offsetX, offsetY);
  };

  // create canvas background pattern
  var bg = null;

  var tmp = new Image();
  tmp.src = 'img/pattern.png';
  tmp.onload = function() {
    bg = lightBot.ctx.createPattern(tmp, 'repeat');
  };

  function update() {
    // check if we can execute the next bot instruction here?
    if (lightBot.bot.isInExecutionMode() && lightBot.bot.isReadyForNextInstruction() && lightBot.bot.hasNextInstruction()) {
      var oldPos = $.extend({}, lightBot.bot.currentPos); // copy old position
      var instruction = lightBot.bot.executeNextInstruction(); // execute the next instruction
      var newPos = lightBot.bot.currentPos; // get the new position
      lightBot.bot.animate(instruction, oldPos, newPos);
    }
    // check if map has been completed here
    if (lightBot.map.ready() && lightBot.map.state.check(lightBot.map.state.allLightsOn)) {

      // stop the bot
      lightBot.bot.clearExecutionQueue();

      // award medals
      var medal = lightBot.medals.awardMedal();
      lightBot.medals.display(medal); // show medal dialog

      // award achievements
      var achievements = lightBot.achievements.awardAchievements();
      lightBot.achievements.display(achievements);

      // set the map as complete
      lightBot.map.complete();

      // return to map selection screen
    }
    lightBot.step();
    lightBot.draw();
  }

  function step() {
    lightBot.bot.step();
    lightBot.map.step();
  }

  function draw() {
    //clear main canvas
    lightBot.ctx.clearRect(0,0, canvas.width(), canvas.height());

    // background
    lightBot.ctx.fillStyle = bg;
    lightBot.ctx.fillRect(0,0, canvas.width(), canvas.height());

    // draw the map and the bot in the correct order
    switch (lightBot.bot.direction) {
      case lightBot.directions.se:
        for (var i = lightBot.map.getLevelSize().x - 1; i >= 0; i--) {
          for (var j = lightBot.map.getLevelSize().y - 1; j >= 0; j--) {
            lightBot.map.getMapRef()[i][j].draw();
            if (lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j) {
              lightBot.bot.draw();
            }
          }
        }
        break;
      case lightBot.directions.nw:
        for (i = lightBot.map.getLevelSize().x - 1; i >= 0; i--) {
          for (j = lightBot.map.getLevelSize().y - 1; j >= 0; j--) {
            lightBot.map.getMapRef()[i][j].draw();
            switch (lightBot.bot.getAnimation().name) {
              case lightBot.bot.animations.jumpUp.name:
              case lightBot.bot.animations.jumpDown.name:
                if (lightBot.bot.getMovement().dZ !== 0 && lightBot.bot.getCurrentStep() / lightBot.bot.getAnimation().duration <= 0.5) {
                  if (lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j+1) {
                    lightBot.bot.draw();
                  }
                } else {
                  if (lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j) {
                    lightBot.bot.draw();
                  }
                }
                break;
              case lightBot.bot.animations.walk.name:
                if (lightBot.bot.getMovement().dZ !== 0 && lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j+1) {
                  lightBot.bot.draw();
                } else if (lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j) {
                  lightBot.bot.draw();
                }
                break;
              default:
                if (lightBot.bot.currentPos.x === i && lightBot.bot.currentPos.y === j) {
                  lightBot.bot.draw();
                }
                break;
            }
          }
        }
        break;
      case lightBot.directions.ne:
        for (i = lightBot.map.getLevelSize().y - 1; i >= 0; i--) {
          for (j = lightBot.map.getLevelSize().x - 1; j >= 0; j--) {
            lightBot.map.getMapRef()[j][i].draw();
            switch (lightBot.bot.getAnimation().name) {
              case lightBot.bot.animations.jumpUp.name:
              case lightBot.bot.animations.jumpDown.name:
                if (lightBot.bot.getMovement().dX !== 0 && lightBot.bot.getCurrentStep() / lightBot.bot.getAnimation().duration <= 0.5) {
                  if (lightBot.bot.currentPos.x === j+1 && lightBot.bot.currentPos.y === i) {
                    lightBot.bot.draw();
                  }
                } else {
                  if (lightBot.bot.currentPos.x === j && lightBot.bot.currentPos.y === i) {
                    lightBot.bot.draw();
                  }
                }
                break;
              case lightBot.bot.animations.walk.name:
                if (lightBot.bot.getMovement().dX !== 0 && lightBot.bot.currentPos.x === j+1 && lightBot.bot.currentPos.y === i) {
                  lightBot.bot.draw();
                } else if (lightBot.bot.currentPos.x === j && lightBot.bot.currentPos.y === i) {
                  lightBot.bot.draw();
                }
                break;
              default:
                if (lightBot.bot.currentPos.x === j && lightBot.bot.currentPos.y === i) {
                  lightBot.bot.draw();
                }
                break;
            }
          }
        }
        break;
      case lightBot.directions.sw:
        for (i = lightBot.map.getLevelSize().y - 1; i >= 0; i--) {
          for (j = lightBot.map.getLevelSize().x - 1; j >= 0; j--) {
            lightBot.map.getMapRef()[j][i].draw();
            if (lightBot.bot.currentPos.x === j && lightBot.bot.currentPos.y === i) {
              lightBot.bot.draw();
            }
          }
        }
        break;
      default:
        console.error('canvasView draw: unknown direction "' + lightBot.bot.direction + '"');
        break;
    }

  }


  lightBot.step = step;
  lightBot.draw = draw;

  return {};
};