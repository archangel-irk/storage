'use strict';

/*!
 * Storage documents using schema
 * inspired by mongoose 3.8.4 (fixed bugs for 3.8.16)
 *
 * Storage implementation
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 * проследить за багом gh-1638 (3.8.16)
 */

/*!
 * Module dependencies.
 */
var Collection = require('./collection')
  , Schema = require('./schema')
  , SchemaType = require('./schematype')
  , VirtualType = require('./virtualtype')
  , Types = require('./types')
  , Document = require('./document')
  , utils = require('./utils')
  , pkg = require('../package.json');


/**
 * Storage constructor.
 *
 * The exports object of the `storage` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * @api public
 */
function Storage () {
  this.collectionNames = [];
}

/**
 * Create a collection and get it
 *
 * @example
 *
 * @param {string} name - collection name
 * @param {storage.Schema|undefined} schema
 * @param {Object} [api] - ссылка на апи ресурс
 * @returns {Collection|undefined}
 * @api public
 */
Storage.prototype.createCollection = function( name, schema, api ){
  if ( this[ name ] ){
    console.info('storage::collection: `' + name + '` already exist');
    return this[ name ];
  }

  if ( name == null ){
    throw new TypeError('storage.createCollection( name, schema ) - `name` must be exist, `schema` must be Schema instance');
  }

  if ( schema == null || 'Schema' !== utils.getFunctionName( schema.constructor ) ){
    throw new TypeError('storage.createCollection( name, schema ) - `schema` must be Schema instance');
  }

  this.collectionNames.push( name );

  this[ name ] = new Collection( name, schema, api );

  return this[ name ];
};

/**
 * Alias for createCollection
 *
 * @see Storage.createCollection #index_Storage-createCollection
 * @method createCollection
 * @api public
 */
Storage.prototype.addCollection = Storage.prototype.createCollection;

/**
 * To obtain the names of the collections in an array
 *
 * @returns {Array.<string>} An array containing all collections in the storage.
 */
Storage.prototype.getCollectionNames = function(){
  return this.collectionNames;
};

/**
 * The Storage Collection constructor
 *
 * @method Collection
 * @api public
 */
Storage.prototype.Collection = Collection;

/**
 * The Storage version
 *
 * @property version
 * @api public
 */
Storage.prototype.version = pkg.version;

/**
 * The Storage constructor
 *
 * The exports of the storage module is an instance of this class.
 *
 * ####Example:
 *
 *     var storage2 = new storage.Storage();
 *
 * @method Storage
 * @api public
 */
Storage.prototype.Storage = Storage;

/**
 * The Storage [Schema](#schema_Schema) constructor
 *
 * ####Example:
 *
 *     var Schema = storage.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */
Storage.prototype.Schema = Schema;

/**
 * The Storage [SchemaType](#schematype_SchemaType) constructor
 *
 * @method SchemaType
 * @api public
 */
Storage.prototype.SchemaType = SchemaType;

/**
 * The various Storage SchemaTypes.
 *
 * ####Note:
 *
 * _Alias of storage.Schema.Types for backwards compatibility._
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema.Types
 * @api public
 */
Storage.prototype.SchemaTypes = Schema.Types;

/**
 * The Storage [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */
Storage.prototype.VirtualType = VirtualType;

/**
 * The various Storage Types.
 *
 * ####Example:
 *
 *     var array = storage.Types.Array;
 *
 * ####Types:
 *
 * - [ObjectId](#types-objectid-js)
 * - [Buffer](#types-buffer-js)
 * - [SubDocument](#types-embedded-js)
 * - [Array](#types-array-js)
 * - [DocumentArray](#types-documentarray-js)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = storage.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */
Storage.prototype.Types = Types;

/**
 * The Storage [Document](#document-js) constructor.
 *
 * @method Document
 * @api public
 */
Storage.prototype.Document = Document;

/**
 * The [StorageError](#error_StorageError) constructor.
 *
 * @method Error
 * @api public
 */
Storage.prototype.Error = require('./error');


Storage.prototype.Deferred = require('./deferred');
Storage.prototype.events = require('./events');
Storage.prototype.StateMachine = require('./statemachine');
Storage.prototype.utils = utils;
Storage.prototype.ObjectId = Types.ObjectId;
Storage.prototype.schemas = Schema.schemas;

Storage.prototype.setAdapter = function( adapterHooks ){
  Document.prototype.adapterHooks = adapterHooks;
};


/*!
 * The exports object is an instance of Storage.
 *
 * @api public
 */
module.exports = new Storage();

window.Buffer = Buffer;
