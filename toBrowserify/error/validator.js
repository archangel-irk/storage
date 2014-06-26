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
 * @param {String|Number|any} val
 * @inherits MongooseError
 * @api private
 */

function ValidatorError (path, msg, type, val) {
  if (!msg) msg = errorMessages.general.default;
  var message = this.formatMessage(msg, path, type, val);
  StorageError.call(this, message);
  this.name = 'ValidatorError';
  this.path = path;
  this.kind = type;
  this.value = val;
}

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = StorageError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;
