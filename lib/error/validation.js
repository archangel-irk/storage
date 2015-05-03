'use strict';

/*!
 * Module requirements
 */

var StorageError = require('../error.js');
var utils = require('../utils.js');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits StorageError
 */

function ValidationError (instance) {
  StorageError.call(this, 'Validation failed');
  this.name = 'ValidationError';
  this.errors = instance.errors = {};

  if (instance && utils.getFunctionName(instance.constructor) === 'model') {
    //todo
    //StorageError.call(this, instance.constructor.modelName + " validation failed");
  } else {
    StorageError.call(this, "Validation failed");
  }

  this.name = 'ValidationError';
  this.errors = {};
  if (instance) {
    instance.errors = this.errors;
  }
}

/*!
 * Inherits from StorageError.
 */
ValidationError.prototype = Object.create( StorageError.prototype );
ValidationError.prototype.constructor = ValidationError;

/*!
 * Module exports
 */

module.exports = ValidationError;
