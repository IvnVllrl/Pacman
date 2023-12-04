"use strict";
if (!Date.now)
  Date.now = function () {
    return new Date().getTime();
  };
(function () {
  "use strict";
  let vendors = ["webkit", "moz"];
  for (let i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    let vp = vendors[i];
    window.requestAnimationFrame = window[vp + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[vp + "CancelAnimationFrame"] ||
      window[vp + "CancelRequestAnimationFrame"];
  }
  if (
    /iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) ||
    !window.requestAnimationFrame ||
    !window.cancelAnimationFrame
  ) {
    let lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      let now = Date.now();
      let nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback((lastTime = nextTime));
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

class Game {
  constructor(id, params) {
    let _ = this;
    let settings = {
      width: 960,
      height: 640,
    };
    Object.assign(_, settings, params);
    let $canvas = document.getElementById(id);
    $canvas.width = _.width;
    $canvas.height = _.height;
    let _context = $canvas.getContext("2d");
    let _stages = [];
    let _events = {};
    let _index = 0,
      _hander;

    class Item {
      constructor(params) {
        this._params = params || {};
        this._id = 0;
        this._stage = null;
        this._settings = {
          x: 0,
          y: 0,
          width: 20,
          height: 20,
          type: 0,
          color: "#F00",
          status: 1,
          orientation: 0,
          speed: 0,

          location: null,
          coord: null,
          path: [],
          vector: null,

          frames: 1,
          times: 0,
          timeout: 0,
          control: {},
          update: function () {},
          draw: function () {},
        };
        Object.assign(this, this._settings, this._params);
      }
      bind(eventType, callback) {
        if (!_events[eventType]) {
          _events[eventType] = {};
          $canvas.addEventListener(eventType, function (e) {
            let position = _.getPosition(e);
            _stages[_index].items.forEach(function (item) {
              if (
                item.x <= position.x &&
                position.x <= item.x + item.width &&
                item.y <= position.y &&
                position.y <= item.y + item.height
              ) {
                let key = "s" + _index + "i" + item._id;
                if (_events[eventType][key]) {
                  _events[eventType][key](e);
                }
              }
            });
            e.preventDefault();
          });
        }
        _events[eventType]["s" + this._stage.index + "i" + this._id] =
          callback.bind(this);
      }
    }

    class Map {
      constructor(params) {
        this._params = params || {};
        this._id = 0;
        this._stage = null;
        this._settings = {
          x: 0,
          y: 0,
          size: 20,
          data: [],
          x_length: 0,
          y_length: 0,
          frames: 1,
          times: 0,
          cache: false,
          update: function () {},
          draw: function () {},
        };
        Object.assign(this, this._settings, this._params);
      }
      get(x, y) {
        if (this.data[y] && typeof this.data[y][x] != "undefined") {
          return this.data[y][x];
        }
        return -1;
      }
      set(x, y, value) {
        if (this.data[y]) {
          this.data[y][x] = value;
        }
      }
      coord2position(cx, cy) {
        return {
          x: this.x + cx * this.size + this.size / 2,
          y: this.y + cy * this.size + this.size / 2,
        };
      }
      position2coord(x, y) {
        let fx = (Math.abs(x - this.x) % this.size) - this.size / 2;
        let fy = (Math.abs(y - this.y) % this.size) - this.size / 2;
        return {
          x: Math.floor((x - this.x) / this.size),
          y: Math.floor((y - this.y) / this.size),
          offset: Math.sqrt(fx * fx + fy * fy),
        };
      }
      finder(params) {
        let defaults = {
          map: null,
          start: {},
          end: {},
          type: "path",
        };
        let options = Object.assign({}, defaults, params);
        if (
          options.map[options.start.y][options.start.x] ||
          options.map[options.end.y][options.end.x]
        ) {
          return [];
        }
        let finded = false;
        let result = [];
        let y_length = options.map.length;
        let x_length = options.map[0].length;
        let steps = Array(y_length)
          .fill(0)
          .map(() => Array(x_length).fill(0));
        let _getValue = function (x, y) {
          if (options.map[y] && typeof options.map[y][x] != "undefined") {
            return options.map[y][x];
          }
          return -1;
        };
        let _next = function (to) {
          let value = _getValue(to.x, to.y);
          if (value < 1) {
            if (value == -1) {
              to.x = (to.x + x_length) % x_length;
              to.y = (to.y + y_length) % y_length;
              to.change = 1;
            }
            if (!steps[to.y][to.x]) {
              result.push(to);
            }
          }
        };
        let _render = function (list) {
          let new_list = [];
          let next = function (from, to) {
            let value = _getValue(to.x, to.y);
            if (value < 1) {
              if (value == -1) {
                to.x = (to.x + x_length) % x_length;
                to.y = (to.y + y_length) % y_length;
                to.change = 1;
              }
              if (to.x == options.end.x && to.y == options.end.y) {
                steps[to.y][to.x] = from;
                finded = true;
              } else if (!steps[to.y][to.x]) {
                steps[to.y][to.x] = from;
                new_list.push(to);
              }
            }
          };
          list.forEach(function (current) {
            next(current, { y: current.y + 1, x: current.x });
            next(current, { y: current.y, x: current.x + 1 });
            next(current, { y: current.y - 1, x: current.x });
            next(current, { y: current.y, x: current.x - 1 });
          });
          if (!finded && new_list.length) {
            _render(new_list);
          }
        };
        _render([options.start]);
        if (finded) {
          let current = options.end;
          if (options.type == "path") {
            while (
              current.x != options.start.x ||
              current.y != options.start.y
            ) {
              result.unshift(current);
              current = steps[current.y][current.x];
            }
          } else if (options.type == "next") {
            _next({ x: current.x + 1, y: current.y });
            _next({ x: current.x, y: current.y + 1 });
            _next({ x: current.x - 1, y: current.y });
            _next({ x: current.x, y: current.y - 1 });
          }
        }
        return result;
      }
    }

    class Stage {
      constructor(params) {
        this._params = params || {};
        this._settings = {
          index: 0,
          status: 0,
          maps: [],
          audio: [],
          images: [],
          items: [],
          timeout: 0,
          update: function () {},
        };
        Object.assign(this, this._settings, this._params);
      }
      createItem(options) {
        let item = new Item(options);

        if (item.location) {
          Object.assign(
            item,
            item.location.coord2position(item.coord.x, item.coord.y)
          );
        }

        item._stage = this;
        item._id = this.items.length;
        this.items.push(item);
        return item;
      }
      resetItems() {
        this.status = 1;
        this.items.forEach(function (item, index) {
          Object.assign(item, item._settings, item._params);
          if (item.location) {
            Object.assign(
              item,
              item.location.coord2position(item.coord.x, item.coord.y)
            );
          }
        });
      }
      getItemsByType(type) {
        return this.items.filter(function (item) {
          return item.type == type;
        });
      }
      createMap(options) {
        let map = new Map(options);

        map.data = JSON.parse(JSON.stringify(map._params.data));
        map.y_length = map.data.length;
        map.x_length = map.data[0].length;
        map.imageData = null;

        map._stage = this;
        map._id = this.maps.length;
        this.maps.push(map);
        return map;
      }
      resetMaps() {
        this.status = 1;
        this.maps.forEach(function (map) {
          Object.assign(map, map._settings, map._params);
          map.data = JSON.parse(JSON.stringify(map._params.data));
          map.y_length = map.data.length;
          map.x_length = map.data[0].length;
          map.imageData = null;
        });
      }
      reset() {
        Object.assign(this, this._settings, this._params);
        this.resetItems();
        this.resetMaps();
      }
      bind(eventType, callback) {
        if (!_events[eventType]) {
          _events[eventType] = {};
          window.addEventListener(eventType, function (e) {
            let key = "s" + _index;
            if (_events[eventType][key]) {
              _events[eventType][key](e);
            }
            e.preventDefault();
          });
        }
        _events[eventType]["s" + this.index] = callback.bind(this);
      }
    }

    this.start = function () {
      let f = 0;
      let timestamp = new Date().getTime();
      let fn = function () {
        let now = new Date().getTime();
        if (now - timestamp < 16) {
          _hander = requestAnimationFrame(fn);
          return false;
        }
        timestamp = now;
        let stage = _stages[_index];
        _context.clearRect(0, 0, _.width, _.height);
        _context.fillStyle = "#000000";
        _context.fillRect(0, 0, _.width, _.height);
        f++;
        if (stage.timeout) {
          stage.timeout--;
        }
        if (stage.update() != false) {
          stage.maps.forEach(function (map) {
            if (!(f % map.frames)) {
              map.times = f / map.frames;
            }
            if (map.cache) {
              if (!map.imageData) {
                _context.save();
                map.draw(_context);
                map.imageData = _context.getImageData(0, 0, _.width, _.height);
                _context.restore();
              } else {
                _context.putImageData(map.imageData, 0, 0);
              }
            } else {
              map.update();
              map.draw(_context);
            }
          });
          stage.items.forEach(function (item) {
            if (!(f % item.frames)) {
              item.times = f / item.frames;
            }
            if (stage.status == 1 && item.status != 2) {
              if (item.location) {
                item.coord = item.location.position2coord(item.x, item.y);
              }
              if (item.timeout) {
                item.timeout--;
              }
              item.update();
            }
            item.draw(_context);
          });
        }
        _hander = requestAnimationFrame(fn);
      };
      _hander = requestAnimationFrame(fn);
    };

    this.stop = function () {
      _hander && cancelAnimationFrame(_hander);
    };

    this.getPosition = function (e) {
      let box = $canvas.getBoundingClientRect();
      return {
        x: e.clientX - box.left * (_.width / box.width),
        y: e.clientY - box.top * (_.height / box.height),
      };
    };

    this.createStage = function (options) {
      let stage = new Stage(options);
      stage.index = _stages.length;
      _stages.push(stage);
      return stage;
    };

    this.setStage = function (index) {
      _stages[_index].status = 0;
      _index = index;
      _stages[_index].status = 1;
      _stages[_index].reset();
      return _stages[_index];
    };

    this.nextStage = function () {
      if (_index < _stages.length - 1) {
        return this.setStage(++_index);
      } else {
        throw new Error("unfound new stage.");
      }
    };
    this.getStages = function () {
      return _stages;
    };
    this.init = function () {
      _index = 0;
      this.start();
    };
  }
}
