'use strict';

/*!
 * Module requirements.
 */

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function DateSchema (key, options) {
  SchemaType.call(this, key, options);
}

/*!
 * Inherits from SchemaType.
 */
DateSchema.prototype = Object.create( SchemaType.prototype );
DateSchema.prototype.constructor = DateSchema;

/**
 * Required validator for date
 *
 * @api private
 */
DateSchema.prototype.checkRequired = function (value) {
  return value instanceof Date;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */
DateSchema.prototype.cast = function (value) {
  // If null or undefined
  if (value == null || value === '')
    return value;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (typeof value !== 'undefined') {
    if (value instanceof Number || 'number' == typeof value
      || String(value) == Number(value)) {
      date = new Date(Number(value));
    } else if (value.toString) {
      // support for date strings
      date = new Date(value.toString());
    }

    if (date.toString() != 'Invalid Date') {
      return date;
    }
  }

  throw new CastError('date', value, this.path);
};

/*!
 * Module exports.
 */

module.exports = DateSchema;
