/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {
  var edgeLength = 50; // keep same base size as game tiles
  var heightScale = 0.5;

  var sandbox = {
    width: 9,
    height: 8,
    tiles: [],
    spawn: { x: 4, y: 4, direction: 0 },
    tool: 'block', // 'block' | 'lamp' | 'spawn' | 'erase'
    canvas: null,
    ctx: null,
    projection: null,
    rotation: 0, // 0: default, 1: 90deg, 2: 180deg, 3: 270deg

    init: function() {
      this.canvas = $('#sandboxCanvas').get(0);
      if (!this.canvas) {
        return;
      }
      this.ctx = this.canvas.getContext('2d');
      // base projection (offsets will be updated dynamically in updateProjectionForCenter)
      this.projection = new lightBot.Projection(this.canvas.height, this.canvas.width / 2, 150);
      this.initTiles(this.width, this.height);
      this.updateProjectionForCenter();
      this.bindUI();
      this.draw();
    },

    initTiles: function(w, h) {
      this.width = w;
      this.height = h;
      this.tiles = [];
      for (var y = 0; y < h; y++) {
        var row = [];
        for (var x = 0; x < w; x++) {
          row.push({ h: 0, t: 'b' });
        }
        this.tiles.push(row);
      }
      this.spawn = { x: Math.floor(w / 2), y: Math.floor(h / 2), direction: 0 };
      this.updateProjectionForCenter();
    },

    updateProjectionForCenter: function() {
      if (!this.canvas) {
        return;
      }

      // world center of the map before rotation
      var cx = this.width * edgeLength * 0.5;
      var cz = this.height * edgeLength * 0.5;

      // apply the same 90° step rotation as projectPoint would
      var rx = cx;
      var rz = cz;
      switch (this.rotation) {
        case 1: // 90°
          rx = cz;
          rz = -cx;
          break;
        case 2: // 180°
          rx = -cx;
          rz = -cz;
          break;
        case 3: // 270°
          rx = -cz;
          rz = cx;
          break;
      }

      // target position for the center of the map in screen space
      var targetX = this.canvas.width / 2;
      var targetY = this.canvas.height * 0.55; // a bit below vertical center

      // Projection math (same as lightBot.Projection):
      // x_screen = offsetX + 0.707*x - 0.707*z
      // y_screen = canvasHeight - (offsetY + 0.321*x + 0.891*y + 0.321*z)
      // with y = 0 for ground level
      var projectedX = 0.707 * rx - 0.707 * rz;
      var projectedYTerm = 0.321 * rx + 0.321 * rz;

      var offsetX = targetX - projectedX;
      var offsetY = this.canvas.height - targetY - projectedYTerm;

      this.projection = new lightBot.Projection(this.canvas.height, offsetX, offsetY);
    },

    bindUI: function() {
      var self = this;

      $('#toolBlockButton').button().click(function() {
        self.tool = 'block';
      });
      $('#toolLampButton').button().click(function() {
        self.tool = 'lamp';
      });
      $('#toolSpawnButton').button().click(function() {
        self.tool = 'spawn';
      });

      $('#sandboxResizeButton').button().click(function() {
        var w = parseInt($('#sandboxWidth').val(), 10) || self.width;
        var h = parseInt($('#sandboxHeight').val(), 10) || self.height;
        w = Math.max(3, Math.min(12, w));
        h = Math.max(3, Math.min(12, h));
        self.initTiles(w, h);
        self.draw();
      });

      $('#sandboxClearButton').button().click(function() {
        self.initTiles(self.width, self.height);
        self.draw();
      });

      $('#sandboxSaveButton').button().click(function() {
        self.saveAsJSON();
      });

      $('#sandboxImportButton').button().click(function() {
        self.importFromJSON();
      });

      $('#sandboxPublishButton').button().click(function() {
        if (!window.lightBot || !lightBot.community || !lightBot.community.publishMap) {
          alert('Community publishing is not available (missing Supabase client).');
          return;
        }

        var name = window.prompt('Map name to publish:', 'My map');
        if (!name) {
          return;
        }

        // require at least one lamp before allowing publish
        var hasLamp = false;
        for (var yy = 0; yy < self.height && !hasLamp; yy++) {
          for (var xx = 0; xx < self.width; xx++) {
            var tt = self.tiles[yy][xx];
            if (tt && tt.h > 0 && tt.t === 'l') {
              hasLamp = true;
              break;
            }
          }
        }
        if (!hasLamp) {
          alert('The map must have at least one lamp to be published.');
          return;
        }

        var mapObj = self.toMapObject();
        var $btn = $('#sandboxPublishButton');
        $btn.button('option', 'disabled', true);

        lightBot.community.publishMap(name, mapObj).then(function(result) {
          $btn.button('option', 'disabled', false);
          if (result && !result.error && result.data) {
            alert('Map published successfully!');
          } else {
            var msg = (result && result.error && result.error.message) || result && result.error || 'Unknown error';
            alert('Error publishing map: ' + msg);
          }
        });
      });

      // camera rotation buttons (4 fixed angles)
      $('#sandboxRotateLeftButton').button().click(function() {
        self.rotation = (self.rotation + 3) % 4;
        self.updateProjectionForCenter();
        self.draw();
      });
      $('#sandboxRotateRightButton').button().click(function() {
        self.rotation = (self.rotation + 1) % 4;
        self.updateProjectionForCenter();
        self.draw();
      });

      // keyboard shortcuts for tools in sandbox: 1=block, 2=lamp, 3=spawn, 4=erase
      $(document).keydown(function(e) {
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          return;
        }
        if (e.key === '1') {
          self.tool = 'block';
          $('#toolBlockButton').focus();
        } else if (e.key === '2') {
          self.tool = 'lamp';
          $('#toolLampButton').focus();
        } else if (e.key === '3') {
          self.tool = 'spawn';
          $('#toolSpawnButton').focus();
        } else if (e.key === '4') {
          self.tool = 'erase';
        }
      });

      $(this.canvas).on('click', function(e) {
        var rect = self.canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        self.handleClick(x, y);
      });

      // coordinate overlay on hover
      var $overlay = $('#sandboxCoordsOverlay');
      $(this.canvas).on('mousemove', function(e) {
        if (!$overlay.length) return;
        var rect = self.canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var hit = self.pickTile(x, y);
        if (hit) {
          var tile = self.tiles[hit.y][hit.x];
          var h = tile.h || 0;
          var type = tile.t || 'b';
          $overlay.text('x: ' + hit.x + '  y: ' + hit.y + '  h: ' + h + '  t: ' + type);
          $overlay.show();
        } else {
          $overlay.hide();
        }
      });
      $(this.canvas).on('mouseleave', function() {
        if ($overlay.length) {
          $overlay.hide();
        }
      });
    },

    handleClick: function(screenX, screenY) {
      var hit = this.pickTile(screenX, screenY);
      if (!hit) return;
      var x = hit.x;
      var y = hit.y;
      var tile = this.tiles[y][x];

      if (this.tool === 'block') {
        if (tile.h <= 0) {
          tile.h = 1;
          tile.t = 'b';
        } else {
          tile.h += 1;
          tile.t = 'b';
        }
      } else if (this.tool === 'lamp') {
        if (tile.h <= 0) {
          tile.h = 1;
        }
        tile.t = 'l';
      } else if (this.tool === 'spawn') {
        this.spawn.x = x;
        this.spawn.y = y;
        this.spawn.direction = parseInt($('#spawnDirectionSelect').val(), 10) || 0;
      } else if (this.tool === 'erase') {
        tile.h = 0;
        tile.t = 'b';
      }

      this.draw();
    },

    pickTile: function(screenX, screenY) {
      // brute-force: compute polygon for each tile and test point-in-polygon
      for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
          var poly = this.getTilePolygon(x, y, this.tiles[y][x].h);
          if (this.pointInPolygon(screenX, screenY, poly)) {
            return { x: x, y: y };
          }
        }
      }
      return null;
    },

    getTilePolygon: function(x, y, h) {
      var heightWorld = h * heightScale * edgeLength;
      var p1 = this.projectPoint((x) * edgeLength, heightWorld, (y) * edgeLength);
      var p2 = this.projectPoint((x + 1) * edgeLength, heightWorld, (y) * edgeLength);
      var p3 = this.projectPoint((x + 1) * edgeLength, heightWorld, (y + 1) * edgeLength);
      var p4 = this.projectPoint((x) * edgeLength, heightWorld, (y + 1) * edgeLength);
      return [p1, p2, p3, p4];
    },

    pointInPolygon: function(x, y, poly) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i].x, yi = poly[i].y;
        var xj = poly[j].x, yj = poly[j].y;
        var intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-6) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    },

    projectPoint: function(wx, hWorld, wz) {
      // apply simple 90° step rotation around the origin; centering is handled
      // by updateProjectionForCenter via the projection offsets
      var rx = wx;
      var rz = wz;
      switch (this.rotation) {
        case 1: // 90°
          rx = wz;
          rz = -wx;
          break;
        case 2: // 180°
          rx = -wx;
          rz = -wz;
          break;
        case 3: // 270°
          rx = -wz;
          rz = wx;
          break;
      }
      // Projection already handles centering on the canvas
      return this.projection.project(rx, hWorld, rz);
    },

    draw: function() {
      if (!this.ctx) return;
      // ensure projection is in sync with current rotation and map size
      this.updateProjectionForCenter();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // background
      this.ctx.fillStyle = '#6f8a99';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // build a depth-sorted list of tiles so faces don't overlap incorrectly when rotating
      var list = [];
      for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
          var center = this.projectPoint(x * edgeLength + edgeLength * 0.5, 0, y * edgeLength + edgeLength * 0.5);
          list.push({ x: x, y: y, depth: center.y });
        }
      }
      list.sort(function(a, b) {
        return a.depth - b.depth;
      });

      // draw ground and tiles in depth order
      for (var i = 0; i < list.length; i++) {
        var cell = list[i];
        this.drawGroundTile(cell.x, cell.y);
        this.drawTile(cell.x, cell.y, this.tiles[cell.y][cell.x]);
      }

      this.drawSpawn();
    },

    drawGroundTile: function(x, y) {
      var baseHeight = 0; // flat ground at y=0
      var colorTop = '#b2c2cc';
      var colorFront = '#8a99a1';
      var colorSide = '#c4d4de';
      var strokeColor = '#445059';

      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 0.4;

      // front face (very shallow to give sense of volume)
      var p1 = this.projectPoint(x * edgeLength, 0, y * edgeLength);
      var p2 = this.projectPoint((x + 1) * edgeLength, 0, y * edgeLength);
      var p3 = this.projectPoint((x + 1) * edgeLength, baseHeight, y * edgeLength);
      var p4 = this.projectPoint(x * edgeLength, baseHeight, y * edgeLength);
      this.ctx.fillStyle = colorFront;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.lineTo(p4.x, p4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // side face
      var s1 = this.projectPoint(x * edgeLength, 0, y * edgeLength);
      var s2 = this.projectPoint(x * edgeLength, baseHeight, y * edgeLength);
      var s3 = this.projectPoint(x * edgeLength, baseHeight, (y + 1) * edgeLength);
      var s4 = this.projectPoint(x * edgeLength, 0, (y + 1) * edgeLength);
      this.ctx.fillStyle = colorSide;
      this.ctx.beginPath();
      this.ctx.moveTo(s1.x, s1.y);
      this.ctx.lineTo(s2.x, s2.y);
      this.ctx.lineTo(s3.x, s3.y);
      this.ctx.lineTo(s4.x, s4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // top face
      var t1 = this.projectPoint(x * edgeLength, baseHeight, y * edgeLength);
      var t2 = this.projectPoint((x + 1) * edgeLength, baseHeight, y * edgeLength);
      var t3 = this.projectPoint((x + 1) * edgeLength, baseHeight, (y + 1) * edgeLength);
      var t4 = this.projectPoint(x * edgeLength, baseHeight, (y + 1) * edgeLength);
      this.ctx.fillStyle = colorTop;
      this.ctx.beginPath();
      this.ctx.moveTo(t1.x, t1.y);
      this.ctx.lineTo(t2.x, t2.y);
      this.ctx.lineTo(t3.x, t3.y);
      this.ctx.lineTo(t4.x, t4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    },

    drawTile: function(x, y, tile) {
      if (tile.h <= 0) return;
      var h = tile.h;
      var heightWorld = h * heightScale * edgeLength;

      // faces colors similar to box
      var colorTop = tile.t === 'l' ? '#FFE545' : '#c9d3d9';
      var colorFront = '#adb8bd';
      var colorSide = '#e5f0f5';
      var strokeColor = '#485256';
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 0.5;

      // front face
      var p1 = this.projectPoint(x * edgeLength, 0, y * edgeLength);
      var p2 = this.projectPoint((x + 1) * edgeLength, 0, y * edgeLength);
      var p3 = this.projectPoint((x + 1) * edgeLength, heightWorld, y * edgeLength);
      var p4 = this.projectPoint(x * edgeLength, heightWorld, y * edgeLength);
      this.ctx.fillStyle = colorFront;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.lineTo(p4.x, p4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // side face
      var s1 = this.projectPoint(x * edgeLength, 0, y * edgeLength);
      var s2 = this.projectPoint(x * edgeLength, heightWorld, y * edgeLength);
      var s3 = this.projectPoint(x * edgeLength, heightWorld, (y + 1) * edgeLength);
      var s4 = this.projectPoint(x * edgeLength, 0, (y + 1) * edgeLength);
      this.ctx.fillStyle = colorSide;
      this.ctx.beginPath();
      this.ctx.moveTo(s1.x, s1.y);
      this.ctx.lineTo(s2.x, s2.y);
      this.ctx.lineTo(s3.x, s3.y);
      this.ctx.lineTo(s4.x, s4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // top face
      var t1 = this.projectPoint(x * edgeLength, heightWorld, y * edgeLength);
      var t2 = this.projectPoint((x + 1) * edgeLength, heightWorld, y * edgeLength);
      var t3 = this.projectPoint((x + 1) * edgeLength, heightWorld, (y + 1) * edgeLength);
      var t4 = this.projectPoint(x * edgeLength, heightWorld, (y + 1) * edgeLength);
      this.ctx.fillStyle = colorTop;
      this.ctx.beginPath();
      this.ctx.moveTo(t1.x, t1.y);
      this.ctx.lineTo(t2.x, t2.y);
      this.ctx.lineTo(t3.x, t3.y);
      this.ctx.lineTo(t4.x, t4.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    },

    drawSpawn: function() {
      var tile = this.tiles[this.spawn.y][this.spawn.x];
      var h = Math.max(1, tile.h);
      var heightWorld = h * heightScale * edgeLength + 10;
      var p = this.projectPoint(this.spawn.x * edgeLength + edgeLength / 2, heightWorld, this.spawn.y * edgeLength + edgeLength / 2);

      this.ctx.fillStyle = '#00ff66';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2, false);
      this.ctx.closePath();
      this.ctx.fill();
    },

    saveAsJSON: function() {
      var mapObj = this.toMapObject();
      var json = JSON.stringify(mapObj, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sapo_map_' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    importFromJSON: function() {
      var self = this;
      var $input = $('<input type="file" accept="application/json" style="display:none;">');
      $('body').append($input);
      $input.on('change', function(e) {
        var file = e.target.files[0];
        if (!file) {
          $input.remove();
          return;
        }
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var data = JSON.parse(ev.target.result);
            self.fromMapObject(data);
            self.draw();
          } catch (err) {
            alert('Error loading JSON map: ' + err.message);
          }
          $input.remove();
        };
        reader.readAsText(file);
      });
      $input.click();
    },

    toMapObject: function() {
      // Game map files are defined as map[y][x] (rows, then columns).
      // The engine mirrors Y when building mapRef, so here export the map
      // with rows flipped vertically, but keep spawn.y as-is so spawn
      // coordinates are identical between editor and game.
      var map = [];
      for (var y = this.height - 1; y >= 0; y--) {
        var row = [];
        for (var x = 0; x < this.width; x++) {
          var t = this.tiles[y][x];
          var hh = t.h > 0 ? t.h : 0;
          row.push({ h: hh, t: t.t });
        }
        map.push(row);
      }

      // Camera rotation is purely visual; use rotation 0 when designing if you
      // want it to match the game.
      return {
        direction: this.spawn.direction || 0,
        position: { x: this.spawn.x, y: this.spawn.y },
        map: map,
        medals: { gold: 0, silver: 0, bronze: 0 }
      };
    },

    fromMapObject: function(obj) {
      if (!obj || !obj.map || !obj.position) {
        throw new Error('Invalid map object');
      }
      // obj.map viene en formato [y][x] pero con filas ya volteadas por el
      // editor. Deshacemos ese flip vertical al cargar.
      var h = obj.map.length;
      var w = obj.map[0].length;
      this.width = w;
      this.height = h;
      this.tiles = [];
      for (var y = 0; y < h; y++) {
        var row = [];
        var srcY = h - 1 - y;
        for (var x = 0; x < w; x++) {
          var cell = obj.map[srcY][x];
          row.push({ h: (cell && cell.h) || 0, t: (cell && cell.t) || 'b' });
        }
        this.tiles.push(row);
      }

      var px = (obj.position && obj.position.x) || 0;
      var py = (obj.position && obj.position.y) || 0;

      this.spawn = {
        x: px,
        y: py,
        direction: obj.direction || 0
      };
      $('#sandboxWidth').val(w);
      $('#sandboxHeight').val(h);
      $('#spawnDirectionSelect').val(String(this.spawn.direction));
    }
  };

  $(document).ready(function() {
    // Only init when sandbox screen exists
    if ($('#sandboxCanvas').length) {
      sandbox.init();
    }
  });

  if (!window.lightBot) {
    window.lightBot = {};
  }
  lightBot.sandbox = sandbox;
})();
