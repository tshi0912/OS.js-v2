(function(WindowManager, GUI) {

  OSjs.CoreWM       = OSjs.CoreWM       || {};
  OSjs.Applications = OSjs.Applications || {};

  function DefaultSettings(defaults) {
    var cfg = {
      animations      : OSjs.Compability.css.animation,
      fullscreen      : false,
      taskbar         : {position: 'top', ontop: true},
      desktop         : {margin: 5},
      wallpaper       : '/themes/wallpapers/noise_red.png',
      theme           : 'default',
      background      : 'image-repeat',
      menuCategories  : true,
      enableSwitcher  : true,
      enableHotkeys   : true,
      moveOnResize    : true,       // Move windows into viewport on resize
      style           : {
        backgroundColor  : '#0B615E',
        fontFamily       : 'OSjsFont'
      }
    };

    var _check = function(iter) {
      for ( var i in iter ) {
        if ( cfg.hasOwnProperty(i) ) {
          if ( typeof cfg[i] === 'object' ) {
            _check(iter[i]);
          } else {
            cfg[i] = iter[i];
          }
        }
      }
    };

    if ( defaults ) {
      _check(defaults);
    }

    return cfg;
  }

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application
   */
  var CoreWM = function(args, metadata) {
    WindowManager.apply(this, ['CoreWM', this, args, metadata]);

    this._settings      = DefaultSettings(args.defaults || {});
    this.panels         = [];
    this.switcher       = null;
  };

  CoreWM.prototype = Object.create(WindowManager.prototype);

  CoreWM.prototype.init = function() {
    WindowManager.prototype.init.apply(this, arguments);

    this.initDesktop();
    this.initPanels();
    this.initWM();

    this.switcher = new OSjs.CoreWM.WindowSwitcher();
    this.switcher.init();
  };

  CoreWM.prototype.destroy = function(kill) {
    if ( kill && !confirm("Killing this process will stop things from working!") ) {
      return false;
    }

    if ( this.switcher ) {
      this.switcher.destroy();
      this.switcher = null;
    }

    if ( this.panels.length ) {
      for ( var i = 0; i < this.panels.length; i++ ) {
        this.panels[i].destroy();
      }
      this.panels = [];
    }

    // Reset styles
    this.applySettings(DefaultSettings(), true);

    return WindowManager.prototype.destroy.apply(this, []);
  };

  //
  // Initialization
  //

  CoreWM.prototype.initWM = function() {
    var self = this;
    OSjs.API.getHandlerInstance().getUserSettings('WindowManager', function(s) {
      if ( s ) {
        self.applySettings(s);
      } else {
        self.applySettings(DefaultSettings(), true);
      }
    });

    var back = document.getElementById("Background");
    if ( back ) {
      var _addBlink = function() {
        if ( !back.className.match(/Blinking/) ) {
          back.className += ' Blinking';
        }
      };
      var _remBlink = function() {
        if ( back.className.match(/Blinking/) ) {
          back.className = back.className.replace(/\s?Blinking/, '');
        }
      };

      OSjs.GUI.createDroppable(back, {
        onOver: function(ev, el, args) {
          _addBlink();
        },

        onLeave : function() {
          _remBlink();
        },

        onDrop : function() {
          _remBlink();
        },

        onItemDropped: function(ev, el, item, args) {
          _remBlink();
          if ( item ) {
            var data = item.data;
            if ( data && data.type === 'file' && data.mime && data.mime.match(/^image/) ) {
              self.applySettings({wallpaper: data.path});
            }
          }
        }
      });
    }
  };

  CoreWM.prototype.initDesktop = function() {
    var _openDesktopSettings = function() {
      OSjs.API.launch('ApplicationSettings');
    };

    var _openDesktopMenu = function(ev) {
      var h = OSjs.API.getHandlerInstance();
      if ( h ) {
        var app = h.getApplicationMetadata('ApplicationSettings');
        if ( app ) {
          OSjs.GUI.createMenu([{title: 'Open settings', onClick: function(ev) {_openDesktopSettings();}}], {x: ev.clientX, y: ev.clientY});
        }
      }
    };

    var background = document.getElementById('Background');
    if ( background ) {
      background.oncontextmenu = function(ev) {
        ev.preventDefault();
        _openDesktopMenu(ev);
        return false;
      };
    };
  };

  CoreWM.prototype.initPanels = function() {
    var self = this;
    var p = new OSjs.CoreWM.Panel('Default');

    p.init(document.body);
    p.addItem(new OSjs.CoreWM.PanelItems.Buttons());
    p.addItem(new OSjs.CoreWM.PanelItems.WindowList());
    p.addItem(new OSjs.CoreWM.PanelItems.Clock());

    this.panels.push(p);
  };

  //
  // Events
  //

  CoreWM.prototype.resize = function(ev, rect) {
    if ( !this.getSetting('moveOnResize') ) { return; }

    var space = this.getWindowSpace();
    var margin = 10;
    var i = 0, l = this._windows.length, iter, wrect;
    var mx, my, mw, mh, moved;

    for ( i; i < l; i++ ) {
      iter = this._windows[i];
      if ( !iter ) { continue; }
      wrect = iter._getViewRect();
      if ( wrect === null ) { continue; }
      if ( iter._state.mimimized ) { continue; }

      // Move the window into view if outside of view
      mx = iter._position.x;
      my = iter._position.y;
      moved = false;

      if ( (wrect.left + margin) > rect.width ) {
        mx = space.width - iter._dimension.w;
        moved = true;
      }
      if ( (wrect.top + margin) > rect.height ) {
        my = space.height - iter._dimension.h;
        moved = true;
      }

      if ( moved ) {
        if ( mx < space.left ) { mx = space.left; }
        if ( my < space.top  ) { my = space.top;  }
        iter._move(mx, my);
      }

      // Restore maximized windows
      if ( iter._state.maximized ) {
        iter._restore(true, false);
        /* FIXME Better solution
        mw = (iter._position.x + iter._dimension.w);
        mh = (iter._position.y + iter._dimension.h);
        console.log([mw, mh], [space.width, space.height]);
        if ( mw > space.width || mh > space.height ) {
        } else {
          iter._state.maximized = false;
        }
        */
      }
    }
  };

  CoreWM.prototype.onKeyUp = function(ev, win) {
    if ( !ev ) { return; }

    if ( !ev.shiftKey ) {
      if ( this.switcher ) {
        this.switcher.hide(ev, win, this);
      }
    }
  };

  CoreWM.prototype.onKeyDown = function(ev, win) {
    if ( !ev ) { return; }
    // TODO: Custom key bindings

    if ( ev.shiftKey && ev.keyCode === 9 ) { // Toggle Window switcher
      if ( !this.getSetting('enableSwitcher') ) { return; }

      if ( this.switcher ) {
        this.switcher.show(ev, win, this);
      }
    } else if ( ev.altKey ) {
      if ( !this.getSetting('enableHotkeys') ) { return; }

      if ( win && win._properties.allow_hotkeys ) {
        if ( ev.keyCode === 72 ) { // Hide window [H]
          win._minimize();
        } else if ( ev.keyCode === 77 ) { // Maximize window [M]
          win._maximize();
        } else if ( ev.keyCode === 82 ) { // Restore window [R]
          win._restore();
        } else if ( ev.keyCode === 37 ) { // Pin Window Left [Left]
          win._moveTo('left');
        } else if ( ev.keyCode === 39 ) { // Pin Window Right [Right]
          win._moveTo('right');
        } else if ( ev.keyCode === 38 ) { // Pin Window Top [Up]
          win._moveTo('top');
        } else if ( ev.keyCode === 40 ) { // Pin Window Bottom [Down]
          win._moveTo('bottom');
        }
      }
    }
  };

  CoreWM.prototype.eventWindow = function(ev, win) {
    var panelItem = this.panels[0] ? this.panels[0].getItem(OSjs.CoreWM.PanelItems.WindowList) : null;
    if ( panelItem ) {
      panelItem.update(ev, win);
    }
  };

  CoreWM.prototype.applySettings = function(settings, force, save) {
    if ( !WindowManager.prototype.applySettings.apply(this, arguments) ) {
      return false;
    }
    console.group("OSjs::Applications::CoreWM::applySettings");

    // Styles
    var opts = this.getSetting('style');
    console.log("Styles", opts);
    for ( var i in opts ) {
      if ( opts.hasOwnProperty(i) ) {
        document.body.style[i] = opts[i];
      }
    }

    // Wallpaper and Background
    var name = this.getSetting('wallpaper');
    var type = this.getSetting('background');

    var className = 'Color';
    var back      = 'none';

    if ( name && type.match(/^image/) ) {
      back = "url('" + OSjs.API.getResourceURL(name) + "')";
      switch ( type ) {
        case     'image' :        className = 'Normal';   break;
        case     'image-center':  className = 'Center';   break;
        case     'image-fill' :   className = 'Fill';     break;
        case     'image-strech':  className = 'Strech';   break;
        default:                  className = 'Default';  break;
      }
    }

    console.log("Wallpaper name", name);
    console.log("Wallpaper type", type);
    console.log("Wallpaper className", className);

    var cn = document.body.className;
    var nc = 'Wallpaper' + className + ' ';
    document.body.className             = cn.replace(/(Wallpaper(.*)\s?)?/, nc);
    document.body.style.backgroundImage = back;

    // Theme
    var theme = this.getSetting('theme');
    var tlink = document.getElementById("_OSjsTheme");
    console.log("theme", theme);
    tlink.setAttribute('href', OSjs.API.getThemeCSS(theme));

    // Animations
    var anim  = this.getSetting('animations');
    var alink = document.getElementById("_OSjsAnimations");
    console.log("animations", anim);
    if ( anim ) {
      alink.setAttribute('href', OSjs.API.getApplicationResource(this, 'animations.css'));
    } else {
      alink.setAttribute('href', OSjs.API.getResourceURL('/frontend/blank.css'));
    }

    // Misc
    var classNames = [];
    var opts = this.getSetting('taskbar');
    if ( opts ) {
      if ( opts.ontop ) {
        classNames.push('Ontop');
      }
      classNames.push(opts.position == 'top' ? 'Top' : 'Bottom');

      // Workaround for windows appearing behind panel
      if ( opts.position === 'top' ) {
        var iter;
        var space = this.getWindowSpace();
        for ( var i = 0; i < this._windows.length; i++ ) {
          iter = this._windows[i];
          if ( !iter ) { continue; }
          if ( iter._position.y < space.top ) {
            console.warn("CoreWM::applySettings()", "I moved this window because it overlapped with a panel!", iter);
            iter._move(iter._position.x, space.top);
          }
        }
      }
    }

    if ( this.panels.length ) {
      this.panels[0].getRoot().className = 'WMPanel ' + classNames.join(' ');
    }

    if ( save ) {
      OSjs.API.getHandlerInstance().setUserSettings('WindowManager', this.getSettings());
    }

    console.groupEnd();
    return true;
  };


  //
  // Getters / Setters
  //

  CoreWM.prototype.getWindowSpace = function() {
    var s = WindowManager.prototype.getWindowSpace.apply(this, arguments);
    var t = this.getSetting('taskbar');
    var d = this.getSetting('desktop');

    if ( t.ontop ) {
      if ( t.position == 'top' ) {
        s.top    += 35;
        s.height -= 35;
      } else {
        s.height -= 35;
      }
    }

    if ( d.margin ) {
      s.top    += d.margin;
      s.left   += d.margin;
      s.width  -= (d.margin * 2);
      s.height -= (d.margin * 2);
    }

    return s;
  };

  CoreWM.prototype.getWindowPosition = function(borders) {
    borders = (typeof borders === 'undefined') || (borders === true);

    var t   = this.getSetting('taskbar');
    var b   = borders ? 10 : 0;
    var pos = {x: b, y: b};
    if ( t.ontop ) {
      if ( t.position == 'top' ) {
        if ( t.ontop ) {
          pos.y += 35;
        }
      }
    }
    return pos;
  };

  CoreWM.prototype.getSetting = function(k) {
    var val = WindowManager.prototype.getSetting.apply(this, arguments);
    if ( typeof val === 'undefined' || val === null ) {
      return DefaultSettings()[k];
    }
    return val;
  };


  //
  // EXPORTS
  //
  OSjs.Applications.CoreWM = CoreWM;

})(OSjs.Core.WindowManager, OSjs.GUI);
