'use strict';

/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');
var errorMessages = StorageError.messages;

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String} type
 * @param {String|Number|*} val
 * @inherits StorageError
 * @api private
 */

function ValidatorError (path, msg, type, val) {
  if ( !msg ) {
    msg = errorMessages.general.default;
  }

  var message = this.formatMessage(msg, path, type, val);
  StorageError.call(this, message);

  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
}

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from StorageError
 */
ValidatorError.prototype = Object.create( StorageError.prototype );
ValidatorError.prototype.constructor = ValidatorError;

/*!
 * exports
 */

module.exports = ValidatorError;
