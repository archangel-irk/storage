'use strict';

/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits StorageError
 */

function MissingSchemaError(){
  var msg = 'Schema hasn\'t been registered for document.\n'
    + 'Use storage.Document(data, schema)';
  StorageError.call(this, msg);

  this.name = 'MissingSchemaError';
}

/*!
 * Inherits from StorageError.
 */

MissingSchemaError.prototype = Object.create(StorageError.prototype);
MissingSchemaError.prototype.constructor = StorageError;

/*!
 * exports
 */

module.exports = MissingSchemaError;