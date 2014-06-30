/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError (type, value, path) {
  StorageError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  this.name = 'CastError';
  this.kind = type;
  this.value = value;
  this.path = path;
};

/*!
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = StorageError.prototype;

/*!
 * exports
 */

module.exports = CastError;
