/*!
 * yowl
 * Copyright(c) 2016 Brian Brunner
 * MIT Licensed
 */

'use strict';

/**
 * Module Dependencies
 * @private
 */

var Route = require("yowl").Route;

/**
 * Module exports.
 * @public
 */

module.exports = Dialog;

function Dialog(id, options) {
  if (!(this instanceof Dialog)) {
    return new Dialog(id, options);
  }

  this.id = id;
  this.character_delay = (typeof options.character_delay !== "undefined") ? options.character_delay : 30;
  this.cascade = (typeof options.cascade !== "undefined") ? options.cascade : false;
  this.test = (typeof options.test !== "undefined") ? options.test : false;
  this.messages = options.messages;
  this.onresponse = options.onresponse;
  this.before = options.before;
  this.after = options.after;
  this.route_options = (typeof options.route_options !== "undefined") ? options.route_options : {};
  this.route = (typeof options.route !== "undefined") ? options.route
                                                      : Route(this.test, this.route_options, this.play.bind(this));
}

/**
 * Check if this dialog should be played.
 *
 * @return {Boolean}
 * @api private
 */

Dialog.prototype.should_run = function(context, event, next) {
  this.route.should_run(context, event, next);
};


Dialog.prototype.play_inner = function play_inner(context, event, cb, prevIndex) {

  if (context._leftover_dialog_delay) {
    setTimeout(function() {
      this.play_inner(context, event, cb);
    }.bind(this), context._leftover_dialog_delay);
    delete context._leftover_dialog_delay;
    return;
  }

  var index = (typeof prevIndex != "undefined") ? prevIndex + 1 : 0;
  var message = this.messages[index];
  var is_last = (index == this.messages.length - 1);

  if (typeof message === "undefined") {
    cb();
    return;
  }

  var response = {
    message: message,
  };

  if (is_last && this.actions) {
    response.actions = this.actions;
    event.send(response, function(err) {
      if (typeof this.after === "function") {
        this.after(context, event, cb);
      } else {
        cb(err);
      }
    });
  } else {
    var typeDelay = this.character_delay*message.length;
    var readDelay = this.character_delay*message.length/2;
    setTimeout(function() {
      event.send(response, function(err) {
        if (err) {
          cb(err);
        } else {
          if (!is_last) {
            setTimeout(function() {
              this.play_inner(context, event, cb, index);
            }.bind(this), readDelay);
          } else {
            context._leftover_dialog_delay = readDelay;
            if (this.onresponse) {
              context.session.open_dialog = this.id;
            } 
            if (typeof this.after === "function") {
              this.after(context, event, function(err) {
                if (err) {
                  cb(err);
                } else {
                  this.finish(context, event, cb);
                }
              }.bind(this));
            } else {
              this.finish(context, event, cb);
            }
          }
        }
      }.bind(this));
    }.bind(this), typeDelay);
  }
};

Dialog.prototype.finish = function(context, event, cb) {
  if (this.cascade) {
    cb();
  } else if (typeof cb.done === "function") {
    cb.done();
  } else {
    cb();
  }
};

Dialog.prototype.play = Dialog.prototype.handle = function play(context, event, cb) {
  if (typeof this.before === "function") {
    this.before(context, event, function(err) {
      if (err) {
        cb(err);
      } else {
        this.play_inner(context, event, cb);
      }
    });
  } else {
    this.play_inner(context, event, cb);
  }
};
