"use strict";
/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2013, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

(function() {

  window.OSjs   = window.OSjs   || {};
  OSjs.Handlers = OSjs.Handlers || {};

  /////////////////////////////////////////////////////////////////////////////
  // DEFAULT HANDLING CODE
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Storage
   */
  var DefaultStorage = function() {
    if ( !OSjs.Utils.getCompability().localStorage ) {
      throw "Your browser does not support localStorage :(";
    }
    this.prefix = 'andersevenrud.github.io/OS.js-v2/';
  };

  DefaultStorage.prototype.set = function(k, v) {
    localStorage.setItem(this.prefix + k, JSON.stringify(v));
  };

  DefaultStorage.prototype.get = function(k) {
    var val = localStorage.getItem(this.prefix + k);
    return val ? JSON.parse(val) : null;
  };

  /**
   * Handler
   */
  var DefaultHandler = function() {
    this.storage  = new DefaultStorage();
    this.packages = {};
    this.config   = OSjs.Settings.DefaultConfig();
    this.userData = {};
  };

  DefaultHandler.prototype.call = function(opts, cok, cerror) {
    return OSjs.Utils.Ajax(this.config.Core.APIURI, function(response, httpRequest, url) {
      cok.apply(this, arguments);
    }, function(error, response, httpRequest, url) {
      cerror.apply(this, arguments);
    }, opts);
  };

  DefaultHandler.prototype.init = function(callback) {
    var self      = this;
    var container = document.getElementById('Login');
    var login     = document.getElementById('LoginForm');
    var u         = document.getElementById('LoginUsername');
    var p         = document.getElementById('LoginPassword');
    var s         = document.getElementById('LoginSubmit');

    var _restore = function() {
      s.removeAttribute("disabled");
      u.removeAttribute("disabled");
      p.removeAttribute("disabled");
    };

    var _lock = function() {
      s.setAttribute("disabled", "disabled");
      u.setAttribute("disabled", "disabled");
      p.setAttribute("disabled", "disabled");
    };

    var _login = function(username, password) {
      self.login(username, password, function(result, error) {
        if ( error ) {
          alert(error);
          _restore();
          return;
        }
        self.userData = result;

        container.parentNode.removeChild(container);
        callback();
      });
    };

    /*
    login.onsubmit = function(ev) {
      _lock();
      if ( ev ) ev.preventDefault();
      _login(u.value, p.value);
    };
    */

    _login("demo", "demo");
  };

  DefaultHandler.prototype.boot = function(callback) {
    callback = callback || {};
    var self = this;

    this.pollPackages(function(result, error) {
      if ( error ) {
        callback(false, error);
        return;
      }

      if ( result ) {
        self.packages = result;
        callback(true);
        return;
      }

      callback(false);
    });
  };

  DefaultHandler.prototype.login = function(username, password, callback) {
    if ( username === 'demo' && password === 'demo' ) {
      var userData = {
        id:         1,
        username:   'demo',
        name:       'Demo User',
        groups:     ['demo']
      };

      callback(userData);
      return;
    }
    callback(false, "Invalid login");
  };

  DefaultHandler.prototype.logout = function(session, callback) {
    if ( session !== null ) {
      this.setUserSession(session, function() {
        callback(true);
      });
      return;
    }
    callback(true);
  };

  DefaultHandler.prototype.pollPackages = function(callback) {
    callback = callback || function() {};

    var uri = this.getConfig('Core').PACKAGEURI;
    return OSjs.Utils.Ajax(uri, function(response, httpRequest, url) {
      if ( response ) {
        callback(response);
      } else {
        callback(false, "No packages found!");
      }
    }, function(error) {
      callback(false, error);
    }, {method: 'GET', parse: true});
  };

  DefaultHandler.prototype.getApplicationsMetadata = function() {
    return this.packages;
  };

  DefaultHandler.prototype.getApplicationNameByMime = function(mime, fname) {
    var j, i, a;
    var list = [];
    for ( i in this.packages ) {
      if ( this.packages.hasOwnProperty(i) ) {
        a = this.packages[i];
        if ( a && a.mime ) {
          for ( j = 0; j < a.mime.length; j++ ) {
            if ( (new RegExp(a.mime[j])).test(mime) === true ) {
              list.push(i);
            }
          }
        }
      }
    }

    return list;
  };

  DefaultHandler.prototype.getApplicationMetadata = function(name) {
    if ( this.packages[name] ) {
      return this.packages[name];
    }
    return false;
  };

  DefaultHandler.prototype.setUserSettings = function(settings, callback) {
    callback = callback || function() {};
    this.storage.set("userSettings", settings);
    callback(true);
  };

  DefaultHandler.prototype.getUserSettings = function(callback) {
    callback = callback || function() {};
    var s = this.storage.get("userSettings");
    callback(s);
  };

  DefaultHandler.prototype.setUserSession = function(session, callback) {
    callback = callback || function() {};
    this.storage.set("userSession", session);
    callback(true);
  };

  DefaultHandler.prototype.getUserSession = function(callback) {
    callback = callback || function() {};
    var s = this.storage.get("userSession");
    callback(s);
  };

  DefaultHandler.prototype.getConfig = function(key) {
    return key ? this.config[key] : this.config;
  };

  DefaultHandler.prototype.getUserData = function() {
    return this.userData;
  };

  OSjs.Handlers.Default = DefaultHandler;

})();

