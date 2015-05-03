'use strict';

/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');
var errorMessages = StorageError.messages;

/**
 * Schema validator error
 *
 * @param {Object} properties
 * @inherits StorageError
 * @api private
 */
function ValidatorError (properties) {
  var msg = properties.message;
  if (!msg) {
    msg = errorMessages.general.default;
  }

  this.properties = properties;
  var message = this.formatMessage(msg, properties);

  StorageError.call(this, message);

  this.name = 'ValidatorError';
  this.type = properties.type;
  this.path = properties.path;
  this.value = properties.value;
}


/*!
 * Inherits from StorageError
 */
ValidatorError.prototype = Object.create( StorageError.prototype );
ValidatorError.prototype.constructor = ValidatorError;


/*!
 * Formats error messages
 */
ValidatorError.prototype.formatMessage = function (msg, properties) {
  var propertyNames = Object.keys(properties);
  for (var i = 0; i < propertyNames.length; ++i) {
    var propertyName = propertyNames[i];
    if (propertyName === 'message') {
      continue;
    }
    msg = msg.replace('{' + propertyName.toUpperCase() + '}', properties[propertyName]);
  }
  return msg;
};


/*!
 * toString helper
 */
ValidatorError.prototype.toString = function () {
  return this.message;
};


/*!
 * exports
 */
module.exports = ValidatorError;
