!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Binary Parser.
 * Jonas Raoni Soares Silva
 * http://jsfromhell.com/classes/binary-parser [v1.0]
 *
 * @see https://github.com/mongodb/js-bson/blob/master/lib/bson/binary_parser.js
 */
var chr = String.fromCharCode;

var maxBits = [];
for (var i = 0; i < 64; i++) {
	maxBits[i] = Math.pow(2, i);
}

function BinaryParser (bigEndian, allowExceptions) {
  if(!(this instanceof BinaryParser)) return new BinaryParser(bigEndian, allowExceptions);
  
	this.bigEndian = bigEndian;
	this.allowExceptions = allowExceptions;
}

BinaryParser.warn = function warn (msg) {
	if (this.allowExceptions) {
		throw new Error(msg);
  }

	return 1;
};

BinaryParser.decodeInt = function decodeInt (data, bits, signed, forceBigEndian) {
  var b = new this.Buffer(this.bigEndian || forceBigEndian, data)
      , x = b.readBits(0, bits)
      , max = maxBits[bits]; //max = Math.pow( 2, bits );
  
  return signed && x >= max / 2
      ? x - max
      : x;
};

BinaryParser.encodeInt = function encodeInt (data, bits, signed, forceBigEndian) {
	var max = maxBits[bits];

  if (data >= max || data < -(max / 2)) {
    this.warn("encodeInt::overflow");
    data = 0;
  }

	if (data < 0) {
    data += max;
  }

	for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));

	for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");

  return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
};

BinaryParser.toSmall    = function( data ){ return this.decodeInt( data,  8, true  ); };
BinaryParser.fromSmall  = function( data ){ return this.encodeInt( data,  8, true  ); };
BinaryParser.toByte     = function( data ){ return this.decodeInt( data,  8, false ); };
BinaryParser.fromByte   = function( data ){ return this.encodeInt( data,  8, false ); };
BinaryParser.toShort    = function( data ){ return this.decodeInt( data, 16, true  ); };
BinaryParser.fromShort  = function( data ){ return this.encodeInt( data, 16, true  ); };
BinaryParser.toWord     = function( data ){ return this.decodeInt( data, 16, false ); };
BinaryParser.fromWord   = function( data ){ return this.encodeInt( data, 16, false ); };
BinaryParser.toInt      = function( data ){ return this.decodeInt( data, 32, true  ); };
BinaryParser.fromInt    = function( data ){ return this.encodeInt( data, 32, true  ); };
BinaryParser.toLong     = function( data ){ return this.decodeInt( data, 64, true  ); };
BinaryParser.fromLong   = function( data ){ return this.encodeInt( data, 64, true  ); };
BinaryParser.toDWord    = function( data ){ return this.decodeInt( data, 32, false ); };
BinaryParser.fromDWord  = function( data ){ return this.encodeInt( data, 32, false ); };
BinaryParser.toQWord    = function( data ){ return this.decodeInt( data, 64, true ); };
BinaryParser.fromQWord  = function( data ){ return this.encodeInt( data, 64, true ); };

/**
 * BinaryParser buffer constructor.
 */
function BinaryParserBuffer (bigEndian, buffer) {
  this.bigEndian = bigEndian || 0;
  this.buffer = [];
  this.setBuffer(buffer);
}

BinaryParserBuffer.prototype.setBuffer = function setBuffer (data) {
  var l, i, b;

	if (data) {
    i = l = data.length;
    b = this.buffer = new Array(l);
		for (; i; b[l - i] = data.charCodeAt(--i));
		this.bigEndian && b.reverse();
	}
};

BinaryParserBuffer.prototype.hasNeededBits = function hasNeededBits (neededBits) {
	return this.buffer.length >= -(-neededBits >> 3);
};

BinaryParserBuffer.prototype.checkBuffer = function checkBuffer (neededBits) {
	if (!this.hasNeededBits(neededBits)) {
		throw new Error("checkBuffer::missing bytes");
  }
};

BinaryParserBuffer.prototype.readBits = function readBits (start, length) {
	//shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)

	function shl (a, b) {
		for (; b--; a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1);
		return a;
	}

	if (start < 0 || length <= 0) {
		return 0;
  }

	this.checkBuffer(start + length);

  var offsetLeft
    , offsetRight = start % 8
    , curByte = this.buffer.length - ( start >> 3 ) - 1
    , lastByte = this.buffer.length + ( -( start + length ) >> 3 )
    , diff = curByte - lastByte
    , sum = ((this.buffer[ curByte ] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1)) + (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[lastByte++] & ((1 << offsetLeft) - 1)) << (diff-- << 3) - offsetRight : 0);

	for(; diff; sum += shl(this.buffer[lastByte++], (diff-- << 3) - offsetRight));

	return sum;
};

/**
 * Expose.
 */
BinaryParser.Buffer = BinaryParserBuffer;

exports.BinaryParser = BinaryParser;

},{}],2:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var Schema = require('./schema')
  , Document = require('./document');

//TODO: написать метод .upsert( doc ) - обновление документа, а если его нет, то создание

//TODO: доделать логику с apiResource (сохранять ссылку на него и использовть при методе doc.save)
/**
 * Конструктор коллекций.
 *
 * @example
 *
 * @param {string} name - название коллекции
 * @param {Schema} schema - Схема или объект описания схемы
 * @param {Object} [api] - ссылка на api ресурс
 * @constructor
 */
function Collection ( name, schema, api ){
  // Сохраним название пространства имён
  this.name = name;
  // Хранилище для документов
  this.documents = {};

  if ( _.isObject( schema ) && !( schema instanceof Schema ) ) {
    schema = new Schema( schema );
  }

  // Сохраним ссылку на api для метода .save()
  this.api = api;

  // Используемая схема для коллекции
  this.schema = schema;

  // Отображение объекта documents в виде массива (для нокаута)
  this.array = [];
  // Нужно для обновления привязок к этому свойству для knockoutjs
  window.ko && ko.track( this, ['array'] );
}

Collection.prototype = {
  /**
   * Добавить документ или массив документов.
   *
   * @example
   * storage.collection.add({ type: 'jelly bean' });
   * storage.collection.add([{ type: 'jelly bean' }, { type: 'snickers' }]);
   * storage.collection.add({ _id: '*****', type: 'jelly bean' }, true);
   *
   * @param {object|Array.<object>} [doc] - Документ
   * @param {object} [fields] - выбранные поля при запросе (не реализовано в документе)
   * @param {boolean} [init] - hydrate document - наполнить документ данными (используется в api-client)
   * @param {boolean} [_storageWillMutate] - Флаг добавления массива документов. только для внутреннего использования
   * @returns {storage.Document|Array.<storage.Document>}
   */
  add: function( doc, fields, init, _storageWillMutate ){
    var self = this;

    // Если документа нет, значит будет пустой
    if ( doc == null ) doc = null;

    // Массив документов
    if ( _.isArray( doc ) ){
      var savedDocs = [];

      _.each( doc, function( doc ){
        savedDocs.push( self.add( doc, fields, init, true ) );
      });

      this.storageHasMutated();

      return savedDocs;
    }

    var id = doc && doc._id;

    // Если документ уже есть, то просто установить значения
    if ( id && this.documents[ id ] ){
      this.documents[ id ].set( doc );

    } else {
      var discriminatorMapping = this.schema
        ? this.schema.discriminatorMapping
        : null;

      var key = discriminatorMapping && discriminatorMapping.isRoot
        ? discriminatorMapping.key
        : null;

      // Выбираем схему, если есть дискриминатор
      var schema;
      if (key && doc && doc[key] && this.schema.discriminators && this.schema.discriminators[doc[key]]) {
        schema = this.schema.discriminators[doc[key]];

      } else {
        schema = this.schema;
      }

      var newDoc = new Document( doc, this.name, schema, fields, init );
      id = newDoc._id.toString();
    }

    // Для одиночных документов тоже нужно  вызвать storageHasMutated
    if ( !_storageWillMutate ){
      this.storageHasMutated();
    }

    return this.documents[ id ];
  },

  /**
   * Удаленить документ.
   *
   * @example
   * storage.collection.remove( Document );
   * storage.collection.remove( uuid );
   *
   * @param {object|number} document - Сам документ или его id.
   * @returns {boolean}
   */
  remove: function( document ){
    return delete this.documents[ document._id || document ];
  },

  /**
   * Найти документы.
   *
   * @example
   * // named john
   * storage.collection.find({ name: 'john' });
   * storage.collection.find({ author: 'Shakespeare', year: 1611 });
   *
   * @param conditions
   * @returns {Array.<storage.Document>}
   */
  find: function( conditions ){
    return _.where( this.documents, conditions );
  },

  /**
   * Найти один документ по id.
   *
   * @example
   * storage.collection.findById( id );
   *
   * @param _id
   * @returns {storage.Document|undefined}
   */
  findById: function( _id ){
    return this.documents[ _id ];
  },

  /**
   * Найти по id документ и удалить его.
   *
   * @example
   * storage.collection.findByIdAndRemove( id ) // returns сollection
   *
   * @see Collection.findById
   * @see Collection.remove
   *
   * @param _id
   * @returns {Collection}
   */
  findByIdAndRemove: function( _id ){
    this.remove( this.findById( _id ) );
    return this;
  },

  /**
   * Найти по id документ и обновить его.
   *
   * @see Collection.findById
   * @see Collection.update
   *
   * @param _id
   * @param {string|object} path
   * @param {object|boolean|number|string|null|undefined} value
   * @returns {storage.Document|undefined}
   */
  findByIdAndUpdate: function( _id, path, value ){
    return this.update( this.findById( _id ), path, value );
  },

  /**
   * Найти один документ.
   *
   * @example
   * // find one iphone adventures
   * storage.adventure.findOne({ type: 'iphone' });
   *
   * @param conditions
   * @returns {storage.Document|undefined}
   */
  findOne: function( conditions ){
    return _.findWhere( this.documents, conditions );
  },

  /**
   * Найти по условию один документ и удалить его.
   *
   * @example
   * storage.collection.findOneAndRemove( conditions ) // returns сollection
   *
   * @see Collection.findOne
   * @see Collection.remove
   *
   * @param {object} conditions
   * @returns {Collection}
   */
  findOneAndRemove: function( conditions ){
    this.remove( this.findOne( conditions ) );
    return this;
  },

  /**
   * Найти документ по условию и обновить его.
   *
   * @see Collection.findOne
   * @see Collection.update
   *
   * @param {object} conditions
   * @param {string|object} path
   * @param {object|boolean|number|string|null|undefined} value
   * @returns {storage.Document|undefined}
   */
  findOneAndUpdate: function( conditions, path, value ){
    return this.update( this.findOne( conditions ), path, value );
  },

  /**
   * Обновить существующие поля в документе.
   *
   * @example
   * storage.places.update( storage.places.findById( 0 ), {
   *   name: 'Irkutsk'
   * });
   *
   * @param {number|object} document
   * @param {string|object} path
   * @param {object|boolean|number|string|null|undefined} value
   * @returns {storage.Document|Boolean}
   */
  update: function( document, path, value ){
    var doc = this.documents[ document._id || document ];

    if ( doc == null ){
      console.warn('storage::update: Document is not found.');
      return false;
    }

    return doc.set( path, value );
  },

  /**
   * Обработчик на изменения (добавление, удаление) данных в коллекции
   */
  storageHasMutated: function(){
    // Обновим массив документов (специальное отображение для перебора нокаутом)
    this.array = _.toArray( this.documents );
  }
};

/*!
 * Module exports.
 */

module.exports = Collection;

},{"./document":3,"./schema":14}],3:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var Events = require('./events')
  , StorageError = require('./error')
  , MixedSchema = require('./schema/mixed')
  , ObjectId = require('./types/objectid')
  , Schema = require('./schema')
  , ValidatorError = require('./schematype').ValidatorError
  , utils = require('./utils')
  , clone = utils.clone
  , ValidationError = StorageError.ValidationError
  , InternalCache = require('./internal')
  , deepEqual = utils.deepEqual
  , DocumentArray
  , SchemaArray
  , Embedded;

/**
 * Конструктор документа.
 *
 * @param {object} data - значения, которые нужно установить
 * @param {string|undefined} [collectionName] - коллекция в которой будет находится документ
 * @param {Schema} schema - схема по которой будет создан документ
 * @param {object} [fields] - выбранные поля в документе (не реализовано)
 * @param {Boolean} [init] - hydrate document - наполнить документ данными (используется в api-client)
 * @constructor
 */
function Document ( data, collectionName, schema, fields, init ){
  this.$__ = new InternalCache;
  this.isNew = true;

  // Создать пустой документ с флагом init
  // new TestDocument(true);
  if ( 'boolean' === typeof data ){
    init = data;
    data = null;
  }

  if ( _.isObject( schema ) && !( schema instanceof Schema )) {
    schema = new Schema( schema );
  }

  // Создать пустой документ по схеме
  if ( data instanceof Schema ){
    schema = data;
    data = null;

    if ( schema.options._id ){
      data = { _id: new ObjectId() };
    }

  } else {
    // При создании EmbeddedDocument, в нём уже есть схема и ему не нужен _id
    schema = this.schema || schema;
    // Сгенерировать ObjectId, если он отсутствует, но его требует схема
    if ( !this.schema && schema.options._id ){
      data = data || {};

      if ( data._id === undefined ){
        data._id = new ObjectId();
      }
    }
  }

  if ( !schema ){
    throw new StorageError.MissingSchemaError();
  }

  // Создать документ с флагом init
  // new TestDocument({ test: 'boom' }, true);
  if ( 'boolean' === typeof collectionName ){
    init = collectionName;
    collectionName = undefined;
  }

  // Создать документ с strict: true
  // collection.add({...}, true);
  if ('boolean' === typeof fields) {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = schema.options && schema.options.strict;
    this.$__.selected = fields;
  }

  this.schema = schema;
  this.collection = window.storage[ collectionName ];
  this.collectionName = collectionName;

  if ( this.collection ){
    if ( data == null || !data._id ){
      throw new TypeError('Для помещения в коллекцию необходимо, чтобы у документа был _id');
    }
    // Поместить документ в коллекцию
    this.collection.documents[ data._id ] = this;
  }

  var required = schema.requiredPaths();
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require( required[i] );
  }

  this.$__setSchema( schema );

  this._doc = this.$__buildDoc( data, init );

  if ( init ){
    this.init( data );
  } else if ( data ) {
    this.set( data, undefined, true );
  }

  // apply methods
  for ( var m in schema.methods ){
    this[ m ] = schema.methods[ m ];
  }
  // apply statics
  for ( var s in schema.statics ){
    this[ s ] = schema.statics[ s ];
  }
}

/*!
 * Inherits from EventEmitter.
 */
Document.prototype = Object.create( Events.prototype );
Document.prototype.constructor = Document;

/**
 * The documents schema.
 *
 * @api public
 * @property schema
 */
Document.prototype.schema;

/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property isNew
 */
Document.prototype.isNew;

/**
 * The string version of this documents _id.
 *
 * ####Note:
 *
 * This getter exists on all documents by default. The getter can be disabled by setting the `id` [option](/docs/guide.html#id) of its `Schema` to false at construction time.
 *
 *     new Schema({ name: String }, { id: false });
 *
 * @api public
 * @see Schema options /docs/guide.html#options
 * @property id
 */
Document.prototype.id;

/**
 * Hash containing current validation errors.
 *
 * @api public
 * @property errors
 */
Document.prototype.errors;

Document.prototype.adapterHooks = {
  documentDefineProperty: $.noop,
  documentSetInitialValue: $.noop,
  documentGetValue: $.noop,
  documentSetValue: $.noop
};

/**
 * Builds the default doc structure
 *
 * @param {Object} obj
 * @param {Boolean} [skipId]
 * @return {Object}
 * @api private
 * @method $__buildDoc
 * @memberOf Document
 */
Document.prototype.$__buildDoc = function ( obj, skipId ) {
  var doc = {}
    , self = this;

  var paths = Object.keys( this.schema.paths )
    , plen = paths.length
    , ii = 0;

  for ( ; ii < plen; ++ii ) {
    var p = paths[ii];

    if ( '_id' == p ) {
      if ( skipId ) continue;
      if ( obj && '_id' in obj ) continue;
    }

    var type = this.schema.paths[ p ]
      , path = p.split('.')
      , len = path.length
      , last = len - 1
      , doc_ = doc
      , i = 0;

    for ( ; i < len; ++i ) {
      var piece = path[ i ]
        , defaultVal;

      if ( i === last ) {
        defaultVal = type.getDefault( self, true );

        if ('undefined' !== typeof defaultVal ) {
          doc_[ piece ] = defaultVal;
          self.$__.activePaths.default( p );
        }
      } else {
        doc_ = doc_[ piece ] || ( doc_[ piece ] = {} );
      }
    }
  }

  return doc;
};

/**
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from server.
 *
 * @param {Object} data document returned by server
 * @api private
 */
Document.prototype.init = function ( data ) {
  this.isNew = false;

  //todo: сдесь всё изменится, смотреть коммент метода this.populated
  // handle docs with populated paths
  /*if ( doc._id && opts && opts.populated && opts.populated.length ) {
    var id = String( doc._id );
    for (var i = 0; i < opts.populated.length; ++i) {
      var item = opts.populated[ i ];
      this.populated( item.path, item._docs[id], item );
    }
  }*/

  init( this, data, this._doc );

  return this;
};

/*!
 * Init helper.
 *
 * @param {Object} self document instance
 * @param {Object} obj raw server doc
 * @param {Object} doc object we are initializing
 * @api private
 */
function init (self, obj, doc, prefix) {
  prefix = prefix || '';

  var keys = Object.keys(obj)
    , len = keys.length
    , schema
    , path
    , i;

  while (len--) {
    i = keys[len];
    path = prefix + i;
    schema = self.schema.path(path);

    if (!schema && _.isPlainObject( obj[ i ] ) &&
        (!obj[i].constructor || 'Object' == utils.getFunctionName(obj[i].constructor))) {
      // assume nested object
      if (!doc[i]) doc[i] = {};
      init(self, obj[i], doc[i], path + '.');
    } else {
      if (obj[i] === null) {
        doc[i] = null;
      } else if (obj[i] !== undefined) {
        if (schema) {
          self.$__try(function(){
            doc[i] = schema.cast(obj[i], self, true);
          });
        } else {
          doc[i] = obj[i];
        }

        self.adapterHooks.documentSetInitialValue.call( self, self, path, doc[i] );
      }
      // mark as hydrated
      self.$__.activePaths.init(path);
    }
  }
}

/**
 * Sets the value of a path, or many paths.
 *
 * ####Example:
 *
 *     // path, value
 *     doc.set(path, value)
 *
 *     // object
 *     doc.set({
 *         path  : value
 *       , path2 : {
 *            path  : value
 *         }
 *     })
 *
 *     // only-the-fly cast to number
 *     doc.set(path, value, Number)
 *
 *     // only-the-fly cast to string
 *     doc.set(path, value, String)
 *
 *     // changing strict mode behavior
 *     doc.set(path, value, { strict: false });
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Mixed} val the value to set
 * @param {Schema|String|Number|etc..} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 * @api public
 */
Document.prototype.set = function (path, val, type, options) {
  if (type && 'Object' == utils.getFunctionName(type.constructor)) {
    options = type;
    type = undefined;
  }

  var merge = options && options.merge
    , adhoc = type && true !== type
    , constructing = true === type
    , adhocs;

  var strict = options && 'strict' in options
    ? options.strict
    : this.$__.strictMode;

  if (adhoc) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type);
  }

  if ('string' !== typeof path) {
    // new Document({ key: val })

    if (null === path || undefined === path) {
      var _temp = path;
      path = val;
      val = _temp;

    } else {
      var prefix = val
        ? val + '.'
        : '';

      if (path instanceof Document) path = path._doc;

      var keys = Object.keys(path)
        , i = keys.length
        , pathtype
        , key;


      while (i--) {
        key = keys[i];
        pathtype = this.schema.pathType(prefix + key);
        if (null != path[key]
            // need to know if plain object - no Buffer, ObjectId, ref, etc
            && _.isPlainObject(path[key])
            && ( !path[key].constructor || 'Object' == utils.getFunctionName(path[key].constructor) )
            && 'virtual' != pathtype
            && !( this.$__path( prefix + key ) instanceof MixedSchema )
            && !( this.schema.paths[key] && this.schema.paths[key].options.ref )
          ){

          this.set(path[key], prefix + key, constructing);

        } else if (strict) {
          if ('real' === pathtype || 'virtual' === pathtype) {
            this.set(prefix + key, path[key], constructing);

          } else if ('throw' == strict) {
            throw new Error("Field `" + key + "` is not in schema.");
          }

        } else if (undefined !== path[key]) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  // ensure _strict is honored for obj props
  // docschema = new Schema({ path: { nest: 'string' }})
  // doc.set('path', obj);
  var pathType = this.schema.pathType(path);
  if ('nested' == pathType && val && _.isPlainObject(val) &&
      (!val.constructor || 'Object' == utils.getFunctionName(val.constructor))) {
    if (!merge) this.setValue(path, null);
    this.set(val, path, constructing);
    return this;
  }

  var schema;
  var parts = path.split('.');
  var subpath;

  if ('adhocOrUndefined' == pathType && strict) {

    // check for roots that are Mixed types
    var mixed;

    for (var i = 0; i < parts.length; ++i) {
      subpath = parts.slice(0, i+1).join('.');
      schema = this.schema.path(subpath);
      if (schema instanceof MixedSchema) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }
    }

    if (!mixed) {
      if ('throw' == strict) {
        throw new Error("Field `" + path + "` is not in schema.");
      }
      return this;
    }

  } else if ('virtual' == pathType) {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  } else {
    schema = this.$__path(path);
  }

  var pathToMark;

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    for ( i = 0; i < parts.length; ++i ) {
      subpath = parts.slice(0, i + 1).join('.');
      if (this.isDirectModified(subpath) // earlier prefixes that are already
                                         // marked as dirty have precedence
          || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) pathToMark = path;
  }

  // if this doc is being constructed we should not trigger getters
  var priorVal = constructing
    ? undefined
    : this.getValue(path);

  if (!schema || undefined === val) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
    return this;
  }

  var self = this;
  var shouldSet = this.$__try(function(){
    val = schema.applySetters(val, self, false, priorVal);
  });

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  return this;
};

/**
 * Determine if we should mark this change as modified.
 *
 * @return {Boolean}
 * @api private
 * @method $__shouldModify
 * @memberOf Document
 */
Document.prototype.$__shouldModify = function (
    pathToMark, path, constructing, parts, schema, val, priorVal) {

  if (this.isNew) return true;

  if ( undefined === val && !this.isSelected(path) ) {
    // when a path is not selected in a query, its initial
    // value will be undefined.
    return true;
  }

  if (undefined === val && path in this.$__.activePaths.states.default) {
    // we're just unsetting the default value which was never saved
    return false;
  }

  if (!utils.deepEqual(val, priorVal || this.get(path))) {
    return true;
  }

  //тест не проходит из-за наличия лишнего поля в states.default (comments)
  // На самом деле поле вроде и не лишнее
  //console.info( path, path in this.$__.activePaths.states.default );
  //console.log( this.$__.activePaths );

  // Когда мы устанавливаем такое же значение как default
  // Не понятно зачем мангуст его обновлял
  /*if (!constructing &&
      null != val &&
      path in this.$__.activePaths.states.default &&
      utils.deepEqual(val, schema.getDefault(this, constructing)) ) {

    //console.log( pathToMark, this.$__.activePaths.states.modify );

    // a path with a default was $unset on the server
    // and the user is setting it to the same value again
    return true;
  }*/

  return false;
};

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 *
 * @api private
 * @method $__set
 * @memberOf Document
 */
Document.prototype.$__set = function ( pathToMark, path, constructing, parts, schema, val, priorVal ) {
  var shouldModify = this.$__shouldModify.apply(this, arguments);

  if (shouldModify) {
    this.markModified(pathToMark, val);
  }

  var obj = this._doc
    , i = 0
    , l = parts.length;

  for (; i < l; i++) {
    var next = i + 1
      , last = next === l;

    if ( last ) {
      obj[parts[i]] = val;

      this.adapterHooks.documentSetValue.call( this, this, path, val );

    } else {
      if (obj[parts[i]] && 'Object' === utils.getFunctionName(obj[parts[i]].constructor)) {
        obj = obj[parts[i]];

      } else if (obj[parts[i]] && 'EmbeddedDocument' === utils.getFunctionName(obj[parts[i]].constructor) ) {
        obj = obj[parts[i]];

      } else if (obj[parts[i]] && Array.isArray(obj[parts[i]])) {
        obj = obj[parts[i]];

      } else {
        obj = obj[parts[i]] = {};
      }
    }
  }
};

/**
 * Gets a raw value from a path (no getters)
 *
 * @param {String} path
 * @api private
 */
Document.prototype.getValue = function (path) {
  return utils.getValue(path, this._doc);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */
Document.prototype.setValue = function (path, value) {
  utils.setValue(path, value, this._doc);
  return this;
};

/**
 * Returns the value of a path.
 *
 * ####Example
 *
 *     // path
 *     doc.get('age') // 47
 *
 *     // dynamic casting to a string
 *     doc.get('age', String) // "47"
 *
 * @param {String} path
 * @param {Schema|String|Number} [type] optionally specify a type for on-the-fly attributes
 * @api public
 */
Document.prototype.get = function (path, type) {
  var adhocs;
  if (type) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type);
  }

  var schema = this.$__path(path) || this.schema.virtualpath(path)
    , pieces = path.split('.')
    , obj = this._doc;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = undefined === obj || null === obj
      ? undefined
      : obj[pieces[i]];
  }

  if (schema) {
    obj = schema.applyGetters(obj, this);
  }

  this.adapterHooks.documentGetValue.call( this, this, path );

  return obj;
};

/**
 * Returns the schematype for the given `path`.
 *
 * @param {String} path
 * @api private
 * @method $__path
 * @memberOf Document
 */
Document.prototype.$__path = function (path) {
  var adhocs = this.$__.adhocPaths
    , adhocType = adhocs && adhocs[path];

  if (adhocType) {
    return adhocType;
  } else {
    return this.schema.path(path);
  }
};

/**
 * Marks the path as having pending changes to write to the db.
 *
 * _Very helpful when using [Mixed](./schematypes.html#mixed) types._
 *
 * ####Example:
 *
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *     doc.save() // changes to mixed.type are now persisted
 *
 * @param {String} path the path to mark modified
 * @api public
 */
Document.prototype.markModified = function (path) {
  this.$__.activePaths.modify(path);
};

/**
 * Catches errors that occur during execution of `fn` and stores them to later be passed when `save()` is executed.
 *
 * @param {Function} fn function to execute
 * @param {Object} [scope] the scope with which to call fn
 * @api private
 * @method $__try
 * @memberOf Document
 */
Document.prototype.$__try = function (fn, scope) {
  var res;
  try {
    fn.call(scope);
    res = true;
  } catch (e) {
    this.$__error(e);
    res = false;
  }
  return res;
};

/**
 * Returns the list of paths that have been modified.
 *
 * @return {Array}
 * @api public
 */
Document.prototype.modifiedPaths = function () {
  var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);

  return directModifiedPaths.reduce(function (list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function (chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []));
  }, []);
};

/**
 * Returns true if this document was modified, else false.
 *
 * If `path` is given, checks if a path or any full path containing `path` as part of its path chain has been modified.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isModified()                    // true
 *     doc.isModified('documents')         // true
 *     doc.isModified('documents.0.title') // true
 *     doc.isDirectModified('documents')   // false
 *
 * @param {String} [path] optional
 * @return {Boolean}
 * @api public
 */
Document.prototype.isModified = function (path) {
  return path
    ? !!~this.modifiedPaths().indexOf(path)
    : this.$__.activePaths.some('modify');
};

/**
 * Returns true if `path` was directly set and modified, else false.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isDirectModified('documents.0.title') // true
 *     doc.isDirectModified('documents') // false
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */
Document.prototype.isDirectModified = function (path) {
  return (path in this.$__.activePaths.states.modify);
};

/**
 * Checks if `path` was initialized.
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */
Document.prototype.isInit = function (path) {
  return (path in this.$__.activePaths.states.init);
};

/**
 * Checks if `path` was selected in the source query which initialized this document.
 *
 * ####Example
 *
 *     Thing.findOne().select('name').exec(function (err, doc) {
 *        doc.isSelected('name') // true
 *        doc.isSelected('age')  // false
 *     })
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isSelected = function isSelected (path) {
  if (this.$__.selected) {

    if ('_id' === path) {
      return 0 !== this.$__.selected._id;
    }

    var paths = Object.keys(this.$__.selected)
      , i = paths.length
      , inclusive = false
      , cur;

    if (1 === i && '_id' === paths[0]) {
      // only _id was selected.
      return 0 === this.$__.selected._id;
    }

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;
      inclusive = !! this.$__.selected[cur];
      break;
    }

    if (path in this.$__.selected) {
      return inclusive;
    }

    i = paths.length;
    var pathDot = path + '.';

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;

      if (0 === cur.indexOf(pathDot)) {
        return inclusive;
      }

      if (0 === pathDot.indexOf(cur + '.')) {
        return inclusive;
      }
    }

    return ! inclusive;
  }

  return true;
};

/**
 * Executes registered validation rules for this document.
 *
 * ####Note:
 *
 * This method is called `pre` save and if a validation rule is violated, [save](#model_Model-save) is aborted and the error is returned to your `callback`.
 *
 * ####Example:
 *
 *     doc.validate(function (err) {
 *       if (err) handleError(err);
 *       else // validation passed
 *     });
 *
 * @param {Function} cb called after validation completes, passing an error if one occurred
 * @api public
 */
Document.prototype.validate = function (cb) {
  var self = this;

  // only validate required fields when necessary
  var paths = Object.keys(this.$__.activePaths.states.require).filter(function (path) {
    if (!self.isSelected(path) && !self.isModified(path)) return false;
    return true;
  });

  paths = paths.concat(Object.keys(this.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.default));

  if (0 === paths.length) {
    complete();
    return this;
  }

  var validating = {}
    , total = 0;

  paths.forEach(validatePath);
  return this;

  function validatePath (path) {
    if (validating[path]) return;

    validating[path] = true;
    total++;

    utils.setImmediate(function(){
      var p = self.schema.path(path);
      if (!p) return --total || complete();

      var val = self.getValue(path);
      p.doValidate(val, function (err) {
        if (err) {
          self.invalidate(
              path
            , err
            , undefined
            //, true // embedded docs
            );
        }
        --total || complete();
      }, self);
    });
  }

  function complete () {
    var err = self.$__.validationError;
    self.$__.validationError = undefined;
    cb && cb(err);
  }
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * The `errorMsg` argument will become the message of the `ValidationError`.
 *
 * The `value` argument (if passed) will be available through the `ValidationError.value` property.
 *
 *     doc.invalidate('size', 'must be less than 20', 14);

 *     doc.validate(function (err) {
 *       console.log(err)
 *       // prints
 *       { message: 'Validation failed',
 *         name: 'ValidationError',
 *         errors:
 *          { size:
 *             { message: 'must be less than 20',
 *               name: 'ValidatorError',
 *               path: 'size',
 *               type: 'user defined',
 *               value: 14 } } }
 *     })
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} errorMsg the error which states the reason `path` was invalid
 * @param {Object|String|Number|any} value optional invalid value
 * @api public
 */
Document.prototype.invalidate = function (path, errorMsg, value) {
  if (!this.$__.validationError) {
    this.$__.validationError = new ValidationError(this);
  }

  if (!errorMsg || 'string' === typeof errorMsg) {
    errorMsg = new ValidatorError(path, errorMsg, 'user defined', value);
  }

  if (this.$__.validationError == errorMsg) return;

  this.$__.validationError.errors[path] = errorMsg;
};

/**
 * Resets the internal modified state of this document.
 *
 * @api private
 * @return {Document}
 * @method $__reset
 * @memberOf Document
 */

Document.prototype.$__reset = function reset () {
  var self = this;

  this.$__.activePaths
  .map('init', 'modify', function (i) {
    return self.getValue(i);
  })
  .filter(function (val) {
    return val && val.isStorageDocumentArray && val.length;
  })
  .forEach(function (array) {
    var i = array.length;
    while (i--) {
      var doc = array[i];
      if (!doc) continue;
      doc.$__reset();
    }
  });

  // Clear 'modify'('dirty') cache
  this.$__.activePaths.clear('modify');
  this.$__.validationError = undefined;
  this.errors = undefined;
  //console.log( self.$__.activePaths.states.require );
  //TODO: тут
  this.schema.requiredPaths().forEach(function (path) {
    self.$__.activePaths.require(path);
  });

  return this;
};


/**
 * Returns this documents dirty paths / vals.
 *
 * @api private
 * @method $__dirty
 * @memberOf Document
 */

Document.prototype.$__dirty = function () {
  var self = this;

  var all = this.$__.activePaths.map('modify', function (path) {
    return { path: path
           , value: self.getValue( path )
           , schema: self.$__path( path ) };
  });

  // Sort dirty paths in a flat hierarchy.
  all.sort(function (a, b) {
    return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
  });

  // Ignore "foo.a" if "foo" is dirty already.
  var minimal = []
    , lastPath
    , top;

  all.forEach(function( item ){
    lastPath = item.path + '.';
    minimal.push(item);
    top = item;
  });

  top = lastPath = null;
  return minimal;
};

/*!
 * Compiles schemas.
 * (установить геттеры/сеттеры на поля документа)
 */
function compile (self, tree, proto, prefix) {
  var keys = Object.keys(tree)
    , i = keys.length
    , limb
    , key;

  while (i--) {
    key = keys[i];
    limb = tree[key];

    define(self
        , key
        , (('Object' === utils.getFunctionName(limb.constructor)
               && Object.keys(limb).length)
               && (!limb.type || limb.type.type)
               ? limb
               : null)
        , proto
        , prefix
        , keys);
  }
}

// gets descriptors for all properties of `object`
// makes all properties non-enumerable to match previous behavior to #2211
function getOwnPropertyDescriptors(object) {
  var result = {};

  Object.getOwnPropertyNames(object).forEach(function(key) {
    result[key] = Object.getOwnPropertyDescriptor(object, key);
    result[key].enumerable = false;
  });

  return result;
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 * там же, поля документа сделаем наблюдаемыми
 */
function define (self, prop, subprops, prototype, prefix, keys) {
  prefix = prefix || '';
  var path = (prefix ? prefix + '.' : '') + prop;

  if (subprops) {
    Object.defineProperty(prototype, prop, {
        enumerable: true
      , configurable: true
      , get: function () {
          if (!this.$__.getters)
            this.$__.getters = {};

          if (!this.$__.getters[path]) {
            var nested = Object.create(Object.getPrototypeOf(this), getOwnPropertyDescriptors(this));

            // save scope for nested getters/setters
            if (!prefix) nested.$__.scope = this;

            // shadow inherited getters from sub-objects so
            // thing.nested.nested.nested... doesn't occur (gh-366)
            var i = 0
              , len = keys.length;

            for (; i < len; ++i) {
              // over-write the parents getter without triggering it
              Object.defineProperty(nested, keys[i], {
                  enumerable: false   // It doesn't show up.
                , writable: true      // We can set it later.
                , configurable: true  // We can Object.defineProperty again.
                , value: undefined    // It shadows its parent.
              });
            }

            nested.toObject = function () {
              return this.get(path);
            };

            compile( self, subprops, nested, path );
            this.$__.getters[path] = nested;
          }

          return this.$__.getters[path];
        }
      , set: function (v) {
          if (v instanceof Document) v = v.toObject();
          return (this.$__.scope || this).set( path, v );
        }
    });

  } else {
    Object.defineProperty( prototype, prop, {
        enumerable: true
      , configurable: true
      , get: function ( ) { return this.get.call(this.$__.scope || this, path); }
      , set: function (v) { return this.set.call(this.$__.scope || this, path, v); }
    });
  }

  self.adapterHooks.documentDefineProperty.call( self, self, prototype, prop, prefix, path );
  //self.adapterHooks.documentDefineProperty.call( self, self, path, prototype );
}

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 * @method $__setSchema
 * @memberOf Document
 */
Document.prototype.$__setSchema = function ( schema ) {
  this.schema = schema;
  compile( this, schema.tree, this );
};

/**
 * Get all subdocs (by bfs)
 *
 * @api private
 * @method $__getAllSubdocs
 * @memberOf Document
 */
Document.prototype.$__getAllSubdocs = function () {
  DocumentArray || (DocumentArray = require('./types/documentarray'));
  Embedded = Embedded || require('./types/embedded');

  function docReducer(seed, path) {
    var val = this[path];
    if (val instanceof Embedded) seed.push(val);
    if (val instanceof DocumentArray)
      val.forEach(function _docReduce(doc) {
        if (!doc || !doc._doc) return;
        if (doc instanceof Embedded) seed.push(doc);
        seed = Object.keys(doc._doc).reduce(docReducer.bind(doc._doc), seed);
      });
    return seed;
  }

  return Object.keys(this._doc).reduce(docReducer.bind(this), []);
};

/**
 * Handle generic save stuff.
 * to solve #1446 use use hierarchy instead of hooks
 *
 * @api private
 * @method $__presaveValidate
 * @memberOf Document
 */
Document.prototype.$__presaveValidate = function $__presaveValidate() {
  // if any doc.set() calls failed

  var docs = this.$__getArrayPathsToValidate();

  var e2 = docs.map(function (doc) {
    return doc.$__presaveValidate();
  });
  var e1 = [this.$__.saveError].concat(e2);
  var err = e1.filter(function (x) {return x})[0];
  this.$__.saveError = null;

  return err;
};

/**
 * Get active path that were changed and are arrays
 *
 * @api private
 * @method $__getArrayPathsToValidate
 * @memberOf Document
 */
Document.prototype.$__getArrayPathsToValidate = function () {
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  // validate all document arrays.
  return this.$__.activePaths
    .map('init', 'modify', function (i) {
      return this.getValue(i);
    }.bind(this))
    .filter(function (val) {
      return val && val instanceof DocumentArray && val.length;
    }).reduce(function(seed, array) {
      return seed.concat(array);
    }, [])
    .filter(function (doc) {return doc});
};

/**
 * Registers an error
 *
 * @param {Error} err
 * @api private
 * @method $__error
 * @memberOf Document
 */
Document.prototype.$__error = function (err) {
  this.$__.saveError = err;
  return this;
};

/**
 * Produces a special query document of the modified properties used in updates.
 *
 * @api private
 * @method $__delta
 * @memberOf Document
 */
Document.prototype.$__delta = function () {
  var dirty = this.$__dirty();

  var delta = {}
    , len = dirty.length
    , d = 0;

  for (; d < len; ++d) {
    var data = dirty[ d ];
    var value = data.value;

    value = utils.clone(value, { depopulate: 1 });
    delta[ data.path ] = value;
  }

  return delta;
};

Document.prototype.$__handleSave = function(){
  // Получаем ресурс коллекции, куда будем сохранять данные
  var resource;
  if ( this.collection ){
    resource = this.collection.api;
  }

  var innerPromise = new $.Deferred();

  if ( this.isNew ) {
    // send entire doc
    var obj = this.toObject({ depopulate: 1 });

    if ( ( obj || {} ).hasOwnProperty('_id') === false ) {
      // documents must have an _id else mongoose won't know
      // what to update later if more changes are made. the user
      // wouldn't know what _id was generated by mongodb either
      // nor would the ObjectId generated my mongodb necessarily
      // match the schema definition.
      innerPromise.reject(new Error('document must have an _id before saving'));
      return innerPromise;
    }

    // Проверка на окружение тестов
    // Хотя можно таким образом просто делать валидацию, даже если нет коллекции или api
    if ( !resource ){
      innerPromise.resolve( this );
    } else {
      resource.create( obj ).always( innerPromise.resolve );
    }

    this.$__reset();
    this.isNew = false;
    this.trigger('isNew', false);
    // Make it possible to retry the insert
    this.$__.inserting = true;

  } else {
    // Make sure we don't treat it as a new object on error,
    // since it already exists
    this.$__.inserting = false;

    var delta = this.$__delta();

    if ( !_.isEmpty( delta ) ) {
      this.$__reset();
      // Проверка на окружение тестов
      // Хотя можно таким образом просто делать валидацию, даже если нет коллекции или api
      if ( !resource ){
        innerPromise.resolve( this );
      } else {
        resource( this.id ).update( delta ).always( innerPromise.resolve );
      }
    } else {
      this.$__reset();
      innerPromise.resolve( this );
    }

    this.trigger('isNew', false);
  }

  return innerPromise;
};

/**
 * @description Saves this document.
 *
 * @example:
 *
 *     product.sold = Date.now();
 *     product.save(function (err, product, numberAffected) {
 *       if (err) ..
 *     })
 *
 * @description The callback will receive three parameters, `err` if an error occurred, `product` which is the saved `product`, and `numberAffected` which will be 1 when the document was found and updated in the database, otherwise 0.
 *
 * The `fn` callback is optional. If no `fn` is passed and validation fails, the validation error will be emitted on the connection used to create this model.
 * @example:
 *     var db = mongoose.createConnection(..);
 *     var schema = new Schema(..);
 *     var Product = db.model('Product', schema);
 *
 *     db.on('error', handleError);
 *
 * @description However, if you desire more local error handling you can add an `error` listener to the model and handle errors there instead.
 * @example:
 *     Product.on('error', handleError);
 *
 * @description As an extra measure of flow control, save will return a Promise (bound to `fn` if passed) so it could be chained, or hook to recive errors
 * @example:
 *     product.save().then(function (product, numberAffected) {
 *        ...
 *     }).onRejected(function (err) {
 *        assert.ok(err)
 *     })
 *
 * @param {function(err, product, Number)} [done] optional callback
 * @return {Promise} Promise
 * @api public
 * @see middleware http://mongoosejs.com/docs/middleware.html
 */
Document.prototype.save = function ( done ) {
  var self = this;
  var finalPromise = new $.Deferred().done( done );

  // Сохранять документ можно только если он находится в коллекции
  if ( !this.collection ){
    finalPromise.reject( arguments );
    console.error('Document.save api handle is not implemented.');
    return finalPromise;
  }

  // Check for preSave errors (точо знаю, что она проверяет ошибки в массивах (CastError))
  var preSaveErr = self.$__presaveValidate();
  if ( preSaveErr ) {
    finalPromise.reject( preSaveErr );
    return finalPromise;
  }

  // Validate
  var p0 = new $.Deferred();
  self.validate(function( err ){
    if ( err ){
      p0.reject( err );
      finalPromise.reject( err );
    } else {
      p0.resolve();
    }
  });

  // Сначала надо сохранить все поддокументы и сделать resolve!!!
  // Call save hooks on subdocs
  var subDocs = self.$__getAllSubdocs();
  var whenCond = subDocs.map(function (d) {return d.save();});
  whenCond.push( p0 );

  // Так мы передаём массив promise условий
  var p1 = $.when.apply( $, whenCond );

  // Handle save and results
  p1
    .then( this.$__handleSave.bind( this ) )
    .then(function(){
      return finalPromise.resolve( self );
    }, function ( err ) {
      // If the initial insert fails provide a second chance.
      // (If we did this all the time we would break updates)
      if (self.$__.inserting) {
        self.isNew = true;
        self.emit('isNew', true);
      }
      finalPromise.reject( err );
    });

  return finalPromise;
};

/*function all (promiseOfArr) {
  var pRet = new Promise;
  this.then(promiseOfArr).then(
    function (promiseArr) {
      var count = 0;
      var ret = [];
      var errSentinel;
      if (!promiseArr.length) pRet.resolve();
      promiseArr.forEach(function (promise, index) {
        if (errSentinel) return;
        count++;
        promise.then(
          function (val) {
            if (errSentinel) return;
            ret[index] = val;
            --count;
            if (count == 0) pRet.fulfill(ret);
          },
          function (err) {
            if (errSentinel) return;
            errSentinel = err;
            pRet.reject(err);
          }
        );
      });
      return pRet;
    }
    , pRet.reject.bind(pRet)
  );
  return pRet;
}*/


/**
 * Converts this document into a plain javascript object, ready for storage in MongoDB.
 *
 * Buffers are converted to instances of [mongodb.Binary](http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html) for proper storage.
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters)
 * - `virtuals` apply virtual getters (can override `getters` option)
 * - `minimize` remove empty objects (defaults to true)
 * - `transform` a transform function to apply to the resulting document before returning
 *
 * ####Getters/Virtuals
 *
 * Example of only applying path getters
 *
 *     doc.toObject({ getters: true, virtuals: false })
 *
 * Example of only applying virtual getters
 *
 *     doc.toObject({ virtuals: true })
 *
 * Example of applying both path and virtual getters
 *
 *     doc.toObject({ getters: true })
 *
 * To apply these options to every document of your schema by default, set your [schemas](#schema_Schema) `toObject` option to the same argument.
 *
 *     schema.set('toObject', { virtuals: true })
 *
 * ####Transform
 *
 * We may need to perform a transformation of the resulting object based on some criteria, say to remove some sensitive information or return a custom object. In this case we set the optional `transform` function.
 *
 * Transform functions receive three arguments
 *
 *     function (doc, ret, options) {}
 *
 * - `doc` The mongoose document which is being converted
 * - `ret` The plain object representation which has been converted
 * - `options` The options in use (either schema options or the options passed inline)
 *
 * ####Example
 *
 *     // specify the transform schema option
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       // remove the _id of every document before returning the result
 *       delete ret._id;
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { name: 'Wreck-it Ralph' }
 *
 * With transformations we can do a lot more than remove properties. We can even return completely new customized objects:
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       return { movie: ret.name }
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { movie: 'Wreck-it Ralph' }
 *
 * _Note: if a transform function returns `undefined`, the return value will be ignored._
 *
 * Transformations may also be applied inline, overridding any transform set in the options:
 *
 *     function xform (doc, ret, options) {
 *       return { inline: ret.name, custom: true }
 *     }
 *
 *     // pass the transform as an inline option
 *     doc.toObject({ transform: xform }); // { inline: 'Wreck-it Ralph', custom: true }
 *
 * _Note: if you call `toObject` and pass any options, the transform declared in your schema options will __not__ be applied. To force its application pass `transform: true`_
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.hide = '_id';
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       if (options.hide) {
 *         options.hide.split(' ').forEach(function (prop) {
 *           delete ret[prop];
 *         });
 *       }
 *     }
 *
 *     var doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id' });                  // { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }
 *
 * Transforms are applied to the document _and each of its sub-documents_. To determine whether or not you are currently operating on a sub-document you might use the following guard:
 *
 *     if ('function' == typeof doc.ownerDocument) {
 *       // working with a sub doc
 *     }
 *
 * Transforms, like all of these options, are also available for `toJSON`.
 *
 * See [schema options](/docs/guide.html#toObject) for some more details.
 *
 * _During save, no custom options are applied to the document before being sent to the database._
 *
 * @param {Object} [options]
 * @return {Object} js object
 * @see mongodb.Binary http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html
 * @api public
 */
Document.prototype.toObject = function (options) {
  if (options && options.depopulate && this.$__.wasPopulated) {
    // populated paths that we set to a document
    return utils.clone(this._id, options);
  }

  // When internally saving this document we always pass options,
  // bypassing the custom schema options.
  var optionsParameter = options;
  if (!(options && 'Object' == utils.getFunctionName(options.constructor)) ||
    (options && options._useSchemaOptions)) {
    options = this.schema.options.toObject
      ? clone(this.schema.options.toObject)
      : {};
  }

  if ( options.minimize === undefined ){
    options.minimize = this.schema.options.minimize;
  }

  if (!optionsParameter) {
    options._useSchemaOptions = true;
  }

  var ret = utils.clone(this._doc, options);

  if (options.virtuals || options.getters && false !== options.virtuals) {
    applyGetters(this, ret, 'virtuals', options);
  }

  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
    // applyGetters for paths will add nested empty objects;
    // if minimize is set, we need to remove them.
    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  // In the case where a subdocument has its own transform function, we need to
  // check and see if the parent has a transform (options.transform) and if the
  // child schema has a transform (this.schema.options.toObject) In this case,
  // we need to adjust options.transform to be the child schema's transform and
  // not the parent schema's
  if (true === options.transform ||
      (this.schema.options.toObject && options.transform)) {
    var opts = options.json
      ? this.schema.options.toJSON
      : this.schema.options.toObject;
    if (opts) {
      options.transform = opts.transform;
    }
  }

  if ('function' == typeof options.transform) {
    var xformed = options.transform(this, ret, options);
    if ('undefined' != typeof xformed) ret = xformed;
  }

  return ret;
};

/*!
 * Minimizes an object, removing undefined values and empty objects
 *
 * @param {Object} object to minimize
 * @return {Object}
 */

function minimize (obj) {
  var keys = Object.keys(obj)
    , i = keys.length
    , hasKeys
    , key
    , val;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if ( _.isPlainObject(val) ) {
      obj[key] = minimize(val);
    }

    if (undefined === obj[key]) {
      delete obj[key];
      continue;
    }

    hasKeys = true;
  }

  return hasKeys
    ? obj
    : undefined;
}

/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @param {String} type either `virtuals` or `paths`
 * @return {Object} `json`
 */

function applyGetters (self, json, type, options) {
  var schema = self.schema
    , paths = Object.keys(schema[type])
    , i = paths.length
    , path;

  while (i--) {
    path = paths[i];

    var parts = path.split('.')
      , plen = parts.length
      , last = plen - 1
      , branch = json
      , part;

    for (var ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      if (ii === last) {
        branch[part] = utils.clone(self.get(path), options);
      } else {
        branch = branch[part] || (branch[part] = {});
      }
    }
  }

  return json;
}

/**
 * The return value of this method is used in calls to JSON.stringify(doc).
 *
 * This method accepts the same options as [Document#toObject](#document_Document-toObject). To apply the options to every document of your schema by default, set your [schemas](#schema_Schema) `toJSON` option to the same argument.
 *
 *     schema.set('toJSON', { virtuals: true })
 *
 * See [schema options](/docs/guide.html#toJSON) for details.
 *
 * @param {Object} options
 * @return {Object}
 * @see Document#toObject #document_Document-toObject
 * @api public
 */

Document.prototype.toJSON = function (options) {
  // check for object type since an array of documents
  // being stringified passes array indexes instead
  // of options objects. JSON.stringify([doc, doc])
  // The second check here is to make sure that populated documents (or
  // subdocuments) use their own options for `.toJSON()` instead of their
  // parent's
  if (!(options && 'Object' == utils.getFunctionName(options.constructor))
      || ((!options || options.json) && this.schema.options.toJSON)) {

    options = this.schema.options.toJSON
      ? utils.clone(this.schema.options.toJSON)
      : {};
  }
  options.json = true;

  return this.toObject(options);
};

/**
 * Returns true if the Document stores the same data as doc.
 *
 * Documents are considered equal when they have matching `_id`s, unless neither
 * document has an `_id`, in which case this function falls back to using
 * `deepEqual()`.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 */

Document.prototype.equals = function (doc) {
  var tid = this.get('_id');
  var docid = doc.get('_id');
  if (!tid && !docid) {
    return deepEqual(this, doc);
  }
  return tid && tid.equals
    ? tid.equals(docid)
    : tid === docid;
};

/**
 * Gets _id(s) used during population of the given `path`.
 *
 * ####Example:
 *
 *     Model.findOne().populate('author').exec(function (err, doc) {
 *       console.log(doc.author.name)         // Dr.Seuss
 *       console.log(doc.populated('author')) // '5144cf8050f071d979c118a7'
 *     })
 *
 * If the path was not populated, undefined is returned.
 *
 * @param {String} path
 * @return {Array|ObjectId|Number|Buffer|String|undefined}
 * @api public
 */
Document.prototype.populated = function (path, val, options) {
  // val and options are internal

  //TODO: доделать эту проверку, она должна опираться не на $__.populated, а на то, что наш объект имеет родителя
  // и потом уже выставлять свойство populated == true
  if (null == val) {
    if (!this.$__.populated) return undefined;
    var v = this.$__.populated[path];
    if (v) return v.value;
    return undefined;
  }

  // internal

  if (true === val) {
    if (!this.$__.populated) return undefined;
    return this.$__.populated[path];
  }

  this.$__.populated || (this.$__.populated = {});
  this.$__.populated[path] = { value: val, options: options };
  return val;
};

/**
 * Returns the full path to this document.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf Document
 */
Document.prototype.$__fullPath = function (path) {
  // overridden in SubDocuments
  return path || '';
};

/**
 * Удалить документ и вернуть коллекцию.
 *
 * @example
 * storage.collection.document.remove();
 * document.remove();
 *
 * @see Collection.remove
 * @returns {boolean}
 */
Document.prototype.remove = function(){
  if ( this.collection ){
    return this.collection.remove( this );
  }

  return delete this;
};


/**
 * Очищает документ (выставляет значение по умолчанию или undefined)
 */
Document.prototype.empty = function(){
  var doc = this
    , self = this
    , paths = Object.keys( this.schema.paths )
    , plen = paths.length
    , ii = 0;

  for ( ; ii < plen; ++ii ) {
    var p = paths[ii];

    if ( '_id' == p ) continue;

    var type = this.schema.paths[ p ]
      , path = p.split('.')
      , len = path.length
      , last = len - 1
      , doc_ = doc
      , i = 0;

    for ( ; i < len; ++i ) {
      var piece = path[ i ]
        , defaultVal;

      if ( i === last ) {
        defaultVal = type.getDefault( self, true );

        doc_[ piece ] = defaultVal || undefined;
        self.$__.activePaths.default( p );
      } else {
        doc_ = doc_[ piece ] || ( doc_[ piece ] = {} );
      }
    }
  }
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = Document;

},{"./error":4,"./events":10,"./internal":12,"./schema":14,"./schema/mixed":20,"./schematype":24,"./types/documentarray":27,"./types/embedded":28,"./types/objectid":30,"./utils":31}],4:[function(require,module,exports){
//todo: портировать все ошибки!!!
/**
 * StorageError constructor
 *
 * @param {String} msg - Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 * http://stackoverflow.com/questions/783818/how-do-i-create-a-custom-error-in-javascript
 */
function StorageError ( msg ) {
  this.message = msg;
  this.name = 'StorageError';
}
StorageError.prototype = new Error();


/*!
 * Formats error messages
 */
StorageError.prototype.formatMessage = function (msg, path, type, val) {
  if (!msg) throw new TypeError('message is required');

  return msg.replace(/{PATH}/, path)
            .replace(/{VALUE}/, String(val||''))
            .replace(/{TYPE}/, type || 'declared type');
};

/*!
 * Module exports.
 */

module.exports = StorageError;

/**
 * The default built-in validator error messages.
 *
 * @see Error.messages #error_messages_MongooseError-messages
 * @api public
 */

StorageError.messages = require('./error/messages');

/*!
 * Expose subclasses
 */

StorageError.CastError = require('./error/cast');
StorageError.ValidationError = require('./error/validation');
StorageError.ValidatorError = require('./error/validator');
//todo:
//StorageError.VersionError = require('./error/version');
//StorageError.OverwriteModelError = require('./error/overwriteModel');
StorageError.MissingSchemaError = require('./error/missingSchema');
//StorageError.DivergentArrayError = require('./error/divergentArray');

},{"./error/cast":5,"./error/messages":6,"./error/missingSchema":7,"./error/validation":8,"./error/validator":9}],5:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @param {String} path
 * @inherits StorageError
 * @api private
 */

function CastError (type, value, path) {
  StorageError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
}

/*!
 * Inherits from MongooseError.
 */
CastError.prototype = Object.create( StorageError.prototype );
CastError.prototype.constructor = CastError;

/*!
 * exports
 */

module.exports = CastError;

},{"../error.js":4}],6:[function(require,module,exports){

/**
 * The default built-in validator error messages. These may be customized.
 *
 *     // customize within each schema or globally like so
 *     var mongoose = require('mongoose');
 *     mongoose.Error.messages.String.enum  = "Your custom message for {PATH}.";
 *
 * As you might have noticed, error messages support basic templating
 *
 * - `{PATH}` is replaced with the invalid document path
 * - `{VALUE}` is replaced with the invalid value
 * - `{TYPE}` is replaced with the validator type such as "regexp", "min", or "user defined"
 * - `{MIN}` is replaced with the declared min value for the Number.min validator
 * - `{MAX}` is replaced with the declared max value for the Number.max validator
 *
 * Click the "show code" link below to see all defaults.
 *
 * @property messages
 * @receiver MongooseError
 * @api public
 */

var msg = module.exports = {};

msg.general = {};
msg.general.default = "Validator failed for path `{PATH}` with value `{VALUE}`";
msg.general.required = "Path `{PATH}` is required.";

msg.Number = {};
msg.Number.min = "Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).";
msg.Number.max = "Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).";

msg.String = {};
msg.String.enum = "`{VALUE}` is not a valid enum value for path `{PATH}`.";
msg.String.match = "Path `{PATH}` is invalid ({VALUE}).";


},{}],7:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits MongooseError
 */

function MissingSchemaError(){
  var msg = 'Schema hasn\'t been registered for document.\n'
    + 'Use storage.Document(name, schema)';
  StorageError.call(this, msg);

  this.name = 'MissingSchemaError';
}

/*!
 * Inherits from MongooseError.
 */

MissingSchemaError.prototype = Object.create(StorageError.prototype);
MissingSchemaError.prototype.constructor = StorageError;

/*!
 * exports
 */

module.exports = MissingSchemaError;
},{"../error.js":4}],8:[function(require,module,exports){

/*!
 * Module requirements
 */

var StorageError = require('../error.js');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits MongooseError
 */

function ValidationError (instance) {
  StorageError.call(this, "Validation failed");
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
}

/*!
 * Inherits from MongooseError.
 */
ValidationError.prototype = Object.create( StorageError.prototype );
ValidationError.prototype.constructor = ValidationError;

/*!
 * Module exports
 */

module.exports = ValidationError;

},{"../error.js":4}],9:[function(require,module,exports){
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
  this.type = type;
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
ValidatorError.prototype = Object.create( StorageError.prototype );
ValidatorError.prototype.constructor = ValidatorError;

/*!
 * exports
 */

module.exports = ValidatorError;

},{"../error.js":4}],10:[function(require,module,exports){
// Backbone.Events
// ---------------

// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback
// functions to an event; `trigger`-ing an event fires all callbacks in
// succession.
//
//     var object = {};
//     _.extend(object, Events.prototype);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//
function Events() {}

Events.prototype = {

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on: function(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events || (this._events = {});
    var events = this._events[name] || (this._events[name] = []);
    events.push({callback: callback, context: context, ctx: context || this});
    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, it will be removed.
  once: function(name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
    var self = this;
    var once = _.once(function() {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    return this.on(name, once, context);
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off: function(name, callback, context) {
    var retain, ev, events, names, i, l, j, k;
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
    if (!name && !callback && !context) {
      this._events = {};
      return this;
    }
    names = name ? [name] : _.keys(this._events);
    for (i = 0, l = names.length; i < l; i++) {
      name = names[i];
      if (events = this._events[name]) {
        this._events[name] = retain = [];
        if (callback || context) {
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
              (context && context !== ev.context)) {
              retain.push(ev);
            }
          }
        }
        if (!retain.length) delete this._events[name];
      }
    }

    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function(name) {
    if (!this._events) return this;
    var args = Array.prototype.slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) return this;
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, arguments);
    return this;
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening: function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;
    var remove = !name && !callback;
    if (!callback && typeof name === 'object') callback = this;
    if (obj) (listeningTo = {})[obj._listenId] = obj;
    for (var id in listeningTo) {
      obj = listeningTo[id];
      obj.off(name, callback, this);
      if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
    }
    return this;
  }
};

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// Implement fancy features of the Events API such as multiple event
// names `"change blur"` and jQuery-style event maps `{change: action}`
// in terms of the existing API.
var eventsApi = function(obj, action, name, rest) {
  if (!name) return true;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
};

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
var triggerEvents = function(events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
  switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
  }
};

var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
_.each(listenMethods, function(implementation, method) {
  Events[method] = function(obj, name, callback) {
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    listeningTo[id] = obj;
    if (!callback && typeof name === 'object') callback = this;
    obj[implementation](name, callback, this);
    return this;
  };
});

module.exports = Events;

},{}],11:[function(require,module,exports){
/**
 * Хранилище документов по схемам
 * вдохновлён mongoose 3.8.4 (исправлены баги по 3.8.15)
 *
 * Реализации хранилища
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 * browserify lib/ --standalone storage > storage.js -d
 */

'use strict';

/*!
 * Module dependencies.
 */

var Collection = require('./collection')
  , Schema = require('./schema')
  , SchemaType = require('./schematype')
  , VirtualType = require('./virtualtype')
  , Types = require('./types')
  , Document = require('./document')
  , utils = require('./utils');


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
 * Создать коллекцию и получить её.
 *
 * @example
 *
 * @param {string} name
 * @param {storage.Schema|undefined} schema
 * @param {Object} [api] - ссылка на апи ресурс
 * @returns {Collection|undefined}
 */
Storage.prototype.createCollection = function( name, schema, api ){
  if ( this[ name ] ){
    console.info('storage::collection: `' + name + '` already exist');
    return this[ name ];
  }

  if ( 'Schema' !== utils.getFunctionName( schema.constructor ) ){
    throw new TypeError('`schema` must be Schema instance');
  }

  this.collectionNames.push( name );

  return this[ name ] = new Collection( name, schema, api );
};

/**
 * Получить название коллекций в виде массива строк.
 *
 * @returns {Array.<string>} An array containing all collections in the storage.
 */
Storage.prototype.getCollectionNames = function(){
  return this.collectionNames;
};

/**
 * The Mongoose Collection constructor
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
//todo:
//Storage.prototype.version = pkg.version;

/**
 * The Storage [Schema](#schema_Schema) constructor
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var Schema = mongoose.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */

Storage.prototype.Schema = Schema;

/**
 * The Mongoose [SchemaType](#schematype_SchemaType) constructor
 *
 * @method SchemaType
 * @api public
 */

Storage.prototype.SchemaType = SchemaType;

/**
 * The various Mongoose SchemaTypes.
 *
 * ####Note:
 *
 * _Alias of mongoose.Schema.Types for backwards compatibility._
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema.Types
 * @api public
 */

Storage.prototype.SchemaTypes = Schema.Types;

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */

Storage.prototype.VirtualType = VirtualType;

/**
 * The various Mongoose Types.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var array = mongoose.Types.Array;
 *
 * ####Types:
 *
 * - [ObjectId](#types-objectid-js)
 * - [SubDocument](#types-embedded-js)
 * - [Array](#types-array-js)
 * - [DocumentArray](#types-documentarray-js)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = mongoose.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */

Storage.prototype.Types = Types;

/**
 * The Mongoose [Document](#document-js) constructor.
 *
 * @method Document
 * @api public
 */

Storage.prototype.Document = Document;

/**
 * The [MongooseError](#error_MongooseError) constructor.
 *
 * @method Error
 * @api public
 */

Storage.prototype.Error = require('./error');



Storage.prototype.StateMachine = require('./statemachine');
Storage.prototype.utils = utils;
Storage.prototype.ObjectId = Types.ObjectId;
Storage.prototype.schemas = Schema.schemas;

Storage.prototype.setAdapter = function( adapterHooks ){
  Document.prototype.adapterHooks = adapterHooks;
};

/*
 * Generate a random uuid.
 * http://www.broofa.com/Tools/Math.uuid.htm
 * fork Math.uuid.js (v1.4)
 *
 * http://www.broofa.com/2008/09/javascript-uuid-function/
 */
/*uuid: {
  // Private array of chars to use
  CHARS: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),

  // returns RFC4122, version 4 ID
  generate: function(){
    var chars = this.CHARS, uuid = new Array( 36 ), rnd = 0, r;
    for ( var i = 0; i < 36; i++ ) {
      if ( i == 8 || i == 13 || i == 18 || i == 23 ) {
        uuid[i] = '-';
      } else if ( i == 14 ) {
        uuid[i] = '4';
      } else {
        if ( rnd <= 0x02 ) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('').toLowerCase();
  }
}*/


/*!
 * The exports object is an instance of Storage.
 *
 * @api public
 */

module.exports = new Storage;

},{"./collection":2,"./document":3,"./error":4,"./schema":14,"./schematype":24,"./statemachine":25,"./types":29,"./utils":31,"./virtualtype":32}],12:[function(require,module,exports){
// Машина состояний используется для пометки, в каком состоянии находятся поле
// Например: если поле имеет состояние default - значит его значением является значение по умолчанию
// Примечание: для массивов в общем случае это означает пустой массив

/*!
 * Dependencies
 */

var StateMachine = require('./statemachine');

var ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default');

module.exports = InternalCache;

function InternalCache () {
  this.strictMode = undefined;
  this.selected = undefined;
  this.saveError = undefined;
  this.validationError = undefined;
  this.adhocPaths = undefined;
  this.removing = undefined;
  this.inserting = undefined;
  this.version = undefined;
  this.getters = {};
  this._id = undefined;
  this.populate = undefined; // what we want to populate in this doc
  this.populated = undefined;// the _ids that have been populated
  this.wasPopulated = false; // if this doc was the result of a population
  this.scope = undefined;
  this.activePaths = new ActiveRoster;

  // embedded docs
  this.ownerDocument = undefined;
  this.fullPath = undefined;
}

},{"./statemachine":25}],13:[function(require,module,exports){
/**
 * Returns the value of object `o` at the given `path`.
 *
 * ####Example:
 *
 *     var obj = {
 *         comments: [
 *             { title: 'exciting!', _doc: { title: 'great!' }}
 *           , { title: 'number dos' }
 *         ]
 *     }
 *
 *     mpath.get('comments.0.title', o)         // 'exciting!'
 *     mpath.get('comments.0.title', o, '_doc') // 'great!'
 *     mpath.get('comments.title', o)           // ['exciting!', 'number dos']
 *
 *     // summary
 *     mpath.get(path, o)
 *     mpath.get(path, o, special)
 *     mpath.get(path, o, map)
 *     mpath.get(path, o, special, map)
 *
 * @param {String} path
 * @param {Object} o
 * @param {String} [special] When this property name is present on any object in the path, walking will continue on the value of this property.
 * @param {Function} [map] Optional function which receives each individual found value. The value returned from `map` is used in the original values place.
 */

exports.get = function (path, o, special, map) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? path.split('.')
    : path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  var obj = o
    , part;

  for (var i = 0; i < parts.length; ++i) {
    part = parts[i];

    if (Array.isArray(obj) && !/^\d+$/.test(part)) {
      // reading a property from the array items
      var paths = parts.slice(i);

      return obj.map(function (item) {
        return item
          ? exports.get(paths, item, special || lookup, map)
          : map(undefined);
      });
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      obj = special && obj[special]
        ? obj[special][part]
        : obj[part];
    }

    if (!obj) return map(obj);
  }

  return map(obj);
};

/**
 * Sets the `val` at the given `path` of object `o`.
 *
 * @param {String} path
 * @param {*} val
 * @param {Object} o
 * @param {String} [special] When this property name is present on any object in the path, walking will continue on the value of this property.
 * @param {Function} [map] Optional function which is passed each individual value before setting it. The value returned from `map` is used in the original values place.
 */

exports.set = function (path, val, o, special, map, _copying) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? path.split('.')
    : path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  if (null == o) return;

  // the existance of $ in a path tells us if the user desires
  // the copying of an array instead of setting each value of
  // the array to the one by one to matching positions of the
  // current array.
  var copy = _copying || /\$/.test(path)
    , obj = o
    , part;

  for (var i = 0, len = parts.length - 1; i < len; ++i) {
    part = parts[i];

    if ('$' == part) {
      if (i == len - 1) {
        break;
      } else {
        continue;
      }
    }

    if (Array.isArray(obj) && !/^\d+$/.test(part)) {
      var paths = parts.slice(i);
      if (!copy && Array.isArray(val)) {
        for (var j = 0; j < obj.length && j < val.length; ++j) {
          // assignment of single values of array
          exports.set(paths, val[j], obj[j], special || lookup, map, copy);
        }
      } else {
        for (var j = 0; j < obj.length; ++j) {
          // assignment of entire value
          exports.set(paths, val, obj[j], special || lookup, map, copy);
        }
      }
      return;
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      obj = special && obj[special]
        ? obj[special][part]
        : obj[part];
    }

    if (!obj) return;
  }

  // process the last property of the path

  part = parts[len];

  // use the special property if exists
  if (special && obj[special]) {
    obj = obj[special];
  }

  // set the value on the last branch
  if (Array.isArray(obj) && !/^\d+$/.test(part)) {
    if (!copy && Array.isArray(val)) {
      for (var item, j = 0; j < obj.length && j < val.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val[j]));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val[j]);
          }
        }
      }
    } else {
      for (var j = 0; j < obj.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val);
          }
        }
      }
    }
  } else {
    if (lookup) {
      lookup(obj, part, map(val));
    } else {
      obj[part] = map(val);
    }
  }
};

/*!
 * Returns the value passed to it.
 */

function K (v) {
  return v;
}
},{}],14:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var Events = require('./events')
  , VirtualType = require('./virtualtype')
  , utils = require('./utils')
  , Types
  , schemas;

/**
 * Schema constructor.
 *
 * ####Example:
 *
 *     var child = new Schema({ name: String });
 *     var schema = new Schema({ name: String, age: Number, children: [child] });
 *     var Tree = mongoose.model('Tree', schema);
 *
 *     // setting schema options
 *     new Schema({ name: String }, { _id: false, autoIndex: false })
 *
 * ####Options:
 *
 * - [collection](/docs/guide.html#collection): string - no default
 * - [id](/docs/guide.html#id): bool - defaults to true
 * - `minimize`: bool - controls [document#toObject](#document_Document-toObject) behavior when called manually - defaults to true
 * - [strict](/docs/guide.html#strict): bool - defaults to true
 * - [toJSON](/docs/guide.html#toJSON) - object - no default
 * - [toObject](/docs/guide.html#toObject) - object - no default
 * - [versionKey](/docs/guide.html#versionKey): bool - defaults to "__v"
 *
 * ####Note:
 *
 * _When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into is parent._
 *
 * @param {String|undefined} [name] Название схемы
 * @param {Schema} [baseSchema] Базовая схема при наследовании
 * @param {Object} obj Схема
 * @param {Object} [options]
 * @api public
 */
function Schema ( name, baseSchema, obj, options ) {
  if ( !(this instanceof Schema) )
    return new Schema( name, baseSchema, obj, options );

  // Если это именованая схема
  if ( typeof name === 'string' ){
    this.name = name;
    schemas[ name ] = this;
  } else {
    options = obj;
    obj = baseSchema;
    baseSchema = name;
    name = undefined;
  }

  if ( !(baseSchema instanceof Schema) ){
    options = obj;
    obj = baseSchema;
    baseSchema = undefined;
  }

  // Сохраним описание схемы для поддержки дискриминаторов
  this.source = obj;

  this.paths = {};
  this.subpaths = {};
  this.virtuals = {};
  this.nested = {};
  this.inherits = {};
  this.callQueue = [];
  this.methods = {};
  this.statics = {};
  this.tree = {};
  this._requiredpaths = undefined;
  this.discriminatorMapping = undefined;

  this.options = this.defaultOptions( options );

  if ( baseSchema instanceof Schema ){
    baseSchema.discriminator( name, this );
  }

  // build paths
  if ( obj ) {
    this.add( obj );
  }

  // ensure the documents get an auto _id unless disabled
  var auto_id = !this.paths['_id'] && (!this.options.noId && this.options._id);
  if (auto_id) {
    this.add({ _id: {type: Schema.ObjectId, auto: true} });
  }

  // ensure the documents receive an id getter unless disabled
  var autoid = !this.paths['id'] && this.options.id;
  if ( autoid ) {
    this.virtual('id').get( idGetter );
  }
}

/*!
 * Returns this documents _id cast to a string.
 */
function idGetter () {
  if (this.$__._id) {
    return this.$__._id;
  }

  return this.$__._id = null == this._id
    ? null
    : String(this._id);
}

/*!
 * Inherit from EventEmitter.
 */
Schema.prototype = Object.create( Events.prototype );
Schema.prototype.constructor = Schema;

/**
 * Schema as flat paths
 *
 * ####Example:
 *     {
 *         '_id'        : SchemaType,
 *       , 'nested.key' : SchemaType,
 *     }
 *
 * @api private
 * @property paths
 */
Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * ####Example:
 *     {
 *         '_id'     : ObjectId
 *       , 'nested'  : {
 *             'key' : String
 *         }
 *     }
 *
 * @api private
 * @property tree
 */
Schema.prototype.tree;

/**
 * Returns default options for this schema, merged with `options`.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */
Schema.prototype.defaultOptions = function (options) {
  options = $.extend({
      strict: true
    , versionKey: '__v'
    , discriminatorKey: '__t'
    , minimize: true
    // the following are only applied at construction time
    , _id: true
    , id: true
  }, options );

  return options;
};

/**
 * Adds key path / schema type pairs to this schema.
 *
 * ####Example:
 *
 *     var ToySchema = new Schema;
 *     ToySchema.add({ name: 'string', color: 'string', price: 'number' });
 *
 * @param {Object} obj
 * @param {String} prefix
 * @api public
 */
Schema.prototype.add = function add ( obj, prefix ) {
  prefix = prefix || '';
  var keys = Object.keys( obj );

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if (null == obj[ key ]) {
      throw new TypeError('Invalid value for schema path `'+ prefix + key +'`');
    }

    if ( _.isPlainObject(obj[key] )
      && ( !obj[ key ].constructor || 'Object' == utils.getFunctionName(obj[key].constructor) )
      && ( !obj[ key ].type || obj[ key ].type.type ) ){

      if ( Object.keys(obj[ key ]).length ) {
        // nested object { last: { name: String }}
        this.nested[ prefix + key ] = true;
        this.add( obj[ key ], prefix + key + '.');

      } else {
        this.path( prefix + key, obj[ key ] ); // mixed type
      }

    } else {
      this.path( prefix + key, obj[ key ] );
    }
  }
};

/**
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected in schema declarations b/c they conflict with mongoose functionality. Using these key name will throw an error.
 *
 *      on, emit, _events, db, get, set, init, isNew, errors, schema, options, modelName, collection, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var schema = new Schema(..);
 *      schema.methods.init = function () {} // potentially breaking
 */
Schema.reserved = Object.create( null );
var reserved = Schema.reserved;
reserved.on =
reserved.db =
reserved.get =
reserved.set =
reserved.init =
reserved.isNew =
reserved.errors =
reserved.schema =
reserved.options =
reserved.modelName =
reserved.collection =
reserved.toObject =
reserved.domain =
reserved.emit =    // EventEmitter
reserved._events = // EventEmitter
reserved._pres = reserved._posts = 1; // hooks.js

/**
 * Gets/sets schema paths.
 *
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * ####Example
 *
 *     schema.path('name') // returns a SchemaType
 *     schema.path('name', Number) // changes the schemaType of `name` to Number
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */
Schema.prototype.path = function (path, obj) {
  if (obj == undefined) {
    if (this.paths[path]) return this.paths[path];
    if (this.subpaths[path]) return this.subpaths[path];

    // subpaths?
    return /\.\d+\.?.*$/.test(path)
      ? getPositionalPath(this, path)
      : undefined;
  }

  // some path names conflict with document methods
  if (reserved[path]) {
    throw new Error("`" + path + "` may not be used as a schema pathname");
  }

  // update the tree
  var subpaths = path.split(/\./)
    , last = subpaths.pop()
    , branch = this.tree;

  subpaths.forEach(function(sub, i) {
    if (!branch[sub]) branch[sub] = {};
    if ('object' != typeof branch[sub]) {
      var msg = 'Cannot set nested path `' + path + '`. '
              + 'Parent path `'
              + subpaths.slice(0, i).concat([sub]).join('.')
              + '` already set to type ' + branch[sub].name
              + '.';
      throw new Error(msg);
    }
    branch = branch[sub];
  });

  branch[last] = utils.clone(obj);

  this.paths[path] = Schema.interpretAsType(path, obj);
  return this;
};

/**
 * Converts type arguments into Schema Types.
 *
 * @param {String} path
 * @param {Object} obj constructor
 * @api private
 */
Schema.interpretAsType = function (path, obj) {
  var constructorName = utils.getFunctionName(obj.constructor);
  if (constructorName != 'Object'){
    obj = { type: obj };
  }

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if ('Object' == utils.getFunctionName(type.constructor) || 'mixed' == type) {
    return new Types.Mixed(path, obj);
  }

  if (Array.isArray(type) || Array == type || 'array' == type) {
    // if it was specified through { type } look for `cast`
    var cast = (Array == type || 'array' == type)
      ? obj.cast
      : type[0];

    if (cast instanceof Schema) {
      return new Types.DocumentArray(path, cast, obj);
    }

    if ('string' == typeof cast) {
      cast = Types[cast.charAt(0).toUpperCase() + cast.substring(1)];
    } else if (cast && (!cast.type || cast.type.type)
                    && 'Object' == utils.getFunctionName(cast.constructor)
                    && Object.keys(cast).length) {
      return new Types.DocumentArray(path, new Schema(cast), obj);
    }

    return new Types.Array(path, cast || Types.Mixed, obj);
  }

  var name = 'string' == typeof type
    ? type
    // If not string, `type` is a function. Outside of IE, function.name
    // gives you the function name. In IE, you need to compute it
    : utils.getFunctionName(type);

  if (name) {
    name = name.charAt(0).toUpperCase() + name.substring(1);
  }

  if (undefined == Types[name]) {
    throw new TypeError('Undefined type at `' + path +
        '`\n  Did you try nesting Schemas? ' +
        'You can only nest using refs or arrays.');
  }

  return new Types[name](path, obj);
};

/**
 * Iterates the schemas paths similar to Array#forEach.
 *
 * The callback is passed the pathname and schemaType as arguments on each iteration.
 *
 * @param {Function} fn callback function
 * @return {Schema} this
 * @api public
 */
Schema.prototype.eachPath = function (fn) {
  var keys = Object.keys(this.paths)
    , len = keys.length;

  for (var i = 0; i < len; ++i) {
    fn(keys[i], this.paths[keys[i]]);
  }

  return this;
};

/**
 * Returns an Array of path strings that are required by this schema.
 *
 * @api public
 * @return {Array}
 */
Schema.prototype.requiredPaths = function requiredPaths () {
  if (this._requiredpaths) return this._requiredpaths;

  var paths = Object.keys(this.paths)
    , i = paths.length
    , ret = [];

  while (i--) {
    var path = paths[i];
    if (this.paths[path].isRequired) ret.push(path);
  }

  return this._requiredpaths = ret;
};

/**
 * Returns the pathType of `path` for this schema.
 *
 * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */
Schema.prototype.pathType = function (path) {
  if (path in this.paths) return 'real';
  if (path in this.virtuals) return 'virtual';
  if (path in this.nested) return 'nested';
  if (path in this.subpaths) return 'real';

  if (/\.\d+\.|\.\d+$/.test(path) && getPositionalPath(this, path)) {
    return 'real';
  } else {
    return 'adhocOrUndefined'
  }
};

/*!
 * ignore
 */
function getPositionalPath (self, path) {
  var subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
  if (subpaths.length < 2) {
    return self.paths[subpaths[0]];
  }

  var val = self.path(subpaths[0]);
  if (!val) return val;

  var last = subpaths.length - 1
    , subpath
    , i = 1;

  for (; i < subpaths.length; ++i) {
    subpath = subpaths[i];

    if (i === last && val && !val.schema && !/\D/.test(subpath)) {
      if (val instanceof Types.Array) {
        // StringSchema, NumberSchema, etc
        val = val.caster;
      } else {
        val = undefined;
      }
      break;
    }

    // ignore if its just a position segment: path.0.subpath
    if (!/\D/.test(subpath)) continue;

    if (!(val && val.schema)) {
      val = undefined;
      break;
    }

    val = val.schema.path(subpath);
  }

  return self.subpaths[path] = val;
}

/**
 * Adds a method call to the queue.
 *
 * @param {String} name name of the document method to call later
 * @param {Array} args arguments to pass to the method
 * @api private
 */
Schema.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre hook for the document.
 *
 * ####Example
 *
 *     var toySchema = new Schema(..);
 *
 *     toySchema.pre('save', function (next) {
 *       if (!this.created) this.created = new Date;
 *       next();
 *     })
 *
 *     toySchema.pre('validate', function (next) {
 *       if (this.name != 'Woody') this.name = 'Woody';
 *       next();
 *     })
 *
 * @param {String} method
 * @param {Function} callback
 * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
 * @api public
 */
Schema.prototype.pre = function(){
  return this.queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * Post hooks fire `on` the event emitted from document instances of Models compiled from this schema.
 *
 *     var schema = new Schema(..);
 *     schema.post('save', function (doc) {
 *       console.log('this fired after a document was saved');
 *     });
 *
 *     var Model = mongoose.model('Model', schema);
 *
 *     var m = new Model(..);
 *     m.save(function (err) {
 *       console.log('this fires after the `post` hook');
 *     });
 *
 * @param {String} method name of the method to hook
 * @param {Function} fn callback
 * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
 * @api public
 */
Schema.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

/**
 * Registers a plugin for this schema.
 *
 * @param {Function} plugin callback
 * @param {Object} opts
 * @see plugins
 * @api public
 */
Schema.prototype.plugin = function (fn, opts) {
  fn(this, opts);
  return this;
};

/**
 * Adds an instance method to documents constructed from Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = kittySchema = new Schema(..);
 *
 *     schema.method('meow', function () {
 *       console.log('meeeeeoooooooooooow');
 *     })
 *
 *     var Kitty = mongoose.model('Kitty', schema);
 *
 *     var fizz = new Kitty;
 *     fizz.meow(); // meeeeeooooooooooooow
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
 *
 *     schema.method({
 *         purr: function () {}
 *       , scratch: function () {}
 *     });
 *
 *     // later
 *     fizz.purr();
 *     fizz.scratch();
 *
 * @param {String|Object} method name
 * @param {Function} [fn]
 * @api public
 */
Schema.prototype.method = function (name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.methods[i] = name[i];
  else
    this.methods[name] = fn;
  return this;
};

/**
 * Adds static "class" methods to Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = new Schema(..);
 *     schema.static('findByName', function (name, callback) {
 *       return this.find({ name: name }, callback);
 *     });
 *
 *     var Drink = mongoose.model('Drink', schema);
 *     Drink.findByName('sanpellegrino', function (err, drinks) {
 *       //
 *     });
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */
Schema.prototype.static = function(name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.statics[i] = name[i];
  else
    this.statics[name] = fn;
  return this;
};

/**
 * Sets/gets a schema option.
 *
 * @param {String} key option name
 * @param {Object} [value] if not passed, the current option value is returned
 * @api public
 */
Schema.prototype.set = function (key, value) {
  if (1 === arguments.length) {
    return this.options[key];
  }

  this.options[key] = value;

  return this;
};

/**
 * Gets a schema option.
 *
 * @param {String} key option name
 * @api public
 */

Schema.prototype.get = function (key) {
  return this.options[key];
};

/**
 * Creates a virtual type with the given name.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {VirtualType}
 */

Schema.prototype.virtual = function (name, options) {
  var virtuals = this.virtuals;
  var parts = name.split('.');
  return virtuals[name] = parts.reduce(function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1)
                            ? new VirtualType(options, name)
                            : {});
    return mem[part];
  }, this.tree);
};

/**
 * Returns the virtual type with the given `name`.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

/**
 * Registered discriminators for this schema.
 *
 * @property discriminators
 * @api public
 */
Schema.discriminators;

/**
 * Наследование от схемы.
 * this - базовая схема!!!
 *
 * ####Example:
 *     var PersonSchema = new Schema('Person', {
 *       name: String,
 *       createdAt: Date
 *     });
 *
 *     var BossSchema = new Schema('Boss', PersonSchema, { department: String });
 *
 * @param {String} name   discriminator name
 * @param {Schema} schema discriminator schema
 * @api public
 */
Schema.prototype.discriminator = function discriminator (name, schema) {
  if (!(schema instanceof Schema)) {
    throw new Error("You must pass a valid discriminator Schema");
  }

  if ( this.discriminatorMapping && !this.discriminatorMapping.isRoot ) {
    throw new Error("Discriminator \"" + name + "\" can only be a discriminator of the root model");
  }

  var key = this.options.discriminatorKey;
  if ( schema.path(key) ) {
    throw new Error("Discriminator \"" + name + "\" cannot have field with name \"" + key + "\"");
  }

  // merges base schema into new discriminator schema and sets new type field.
  (function mergeSchemas(schema, baseSchema) {
    utils.merge(schema, baseSchema);

    var obj = {};
    obj[key] = { type: String, default: name };
    schema.add(obj);
    schema.discriminatorMapping = { key: key, value: name, isRoot: false };

    if (baseSchema.options.collection) {
      schema.options.collection = baseSchema.options.collection;
    }

      // throws error if options are invalid
    (function validateOptions(a, b) {
      a = utils.clone(a);
      b = utils.clone(b);
      delete a.toJSON;
      delete a.toObject;
      delete b.toJSON;
      delete b.toObject;

      if (!utils.deepEqual(a, b)) {
        throw new Error("Discriminator options are not customizable (except toJSON & toObject)");
      }
    })(schema.options, baseSchema.options);

    var toJSON = schema.options.toJSON
      , toObject = schema.options.toObject;

    schema.options = utils.clone(baseSchema.options);
    if (toJSON)   schema.options.toJSON = toJSON;
    if (toObject) schema.options.toObject = toObject;

    //schema.callQueue = baseSchema.callQueue.concat(schema.callQueue);
    schema._requiredpaths = undefined; // reset just in case Schema#requiredPaths() was called on either schema
  })(schema, this);

  if (!this.discriminators) {
    this.discriminators = {};
  }

  if (!this.discriminatorMapping) {
    this.discriminatorMapping = { key: key, value: null, isRoot: true };
  }

  if (this.discriminators[name]) {
    throw new Error("Discriminator with name \"" + name + "\" already exists");
  }

  this.discriminators[name] = schema;
};

/*!
 * exports
 */

module.exports = Schema;
window.Schema = Schema;

// require down here because of reference issues

/**
 * The various built-in Mongoose Schema Types.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var ObjectId = mongoose.Schema.Types.ObjectId;
 *
 * ####Types:
 *
 * - [String](#schema-string-js)
 * - [Number](#schema-number-js)
 * - [Boolean](#schema-boolean-js) | Bool
 * - [Array](#schema-array-js)
 * - [Date](#schema-date-js)
 * - [ObjectId](#schema-objectid-js) | Oid
 * - [Mixed](#schema-mixed-js) | Object
 *
 * Using this exposed access to the `Mixed` SchemaType, we can use them in our schema.
 *
 *     var Mixed = mongoose.Schema.Types.Mixed;
 *     new mongoose.Schema({ _user: Mixed })
 *
 * @api public
 */
Schema.Types = require('./schema/index');

// Хранилище схем
Schema.schemas = schemas = {};


/*!
 * ignore
 */

Types = Schema.Types;
var ObjectId = Schema.ObjectId = Types.ObjectId;

},{"./events":10,"./schema/index":19,"./utils":31,"./virtualtype":32}],15:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , Types = {
        Boolean: require('./boolean')
      , Date: require('./date')
      , Number: require('./number')
      , String: require('./string')
      , ObjectId: require('./objectid')
    }
  , StorageArray = require('../types/array')
  , Mixed = require('./mixed')
  , utils = require('../utils')
  , EmbeddedDoc;

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */
function SchemaArray (key, cast, options) {
  if (cast) {
    var castOptions = {};

    if ('Object' === utils.getFunctionName( cast.constructor ) ) {
      if (cast.type) {
        // support { type: Woot }
        castOptions = _.clone( cast ); // do not alter user arguments
        delete castOptions.type;
        cast = cast.type;
      } else {
        cast = Mixed;
      }
    }

    // support { type: 'String' }
    var name = 'string' == typeof cast
      ? cast
      : utils.getFunctionName( cast );

    var caster = name in Types
      ? Types[name]
      : cast;

    this.casterConstructor = caster;
    this.caster = new caster(null, castOptions);

    // lazy load
    EmbeddedDoc || (EmbeddedDoc = require('../types/embedded'));

    if (!(this.caster instanceof EmbeddedDoc)) {
      this.caster.path = key;
    }
  }

  SchemaType.call(this, key, options);

  var self = this
    , defaultArr
    , fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = 'function' == typeof defaultArr;
  }

  this.default(function(){
    var arr = fn ? defaultArr() : defaultArr || [];
    return new StorageArray(arr, self.path, this);
  });
}


/*!
 * Inherits from SchemaType.
 */
SchemaArray.prototype = Object.create( SchemaType.prototype );
SchemaArray.prototype.constructor = SchemaArray;

/**
 * Check required
 *
 * @param {Array} value
 * @api private
 */
SchemaArray.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */
SchemaArray.prototype.applyGetters = function (value, scope) {
  if (this.caster.options && this.caster.options.ref) {
    // means the object id was populated
    return value;
  }

  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Casts values for set().
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */
SchemaArray.prototype.cast = function ( value, doc, init ) {
  if (Array.isArray(value)) {
    if (!(value.isStorageArray)) {
      value = new StorageArray(value, this.path, doc);
    }

    if (this.caster) {
      try {
        for (var i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], doc, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError(e.type, value, this.path);
      }
    }

    return value;
  } else {
    return this.cast([value], doc, init);
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaArray;

},{"../schematype":24,"../types/array":26,"../types/embedded":28,"../utils":31,"./boolean":16,"./date":17,"./mixed":20,"./number":21,"./objectid":22,"./string":23}],16:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */
function BooleanSchema (path, options) {
  SchemaType.call(this, path, options);
}

/*!
 * Inherits from SchemaType.
 */
BooleanSchema.prototype = Object.create( SchemaType.prototype );
BooleanSchema.prototype.constructor = BooleanSchema;

/**
 * Required validator
 *
 * @api private
 */
BooleanSchema.prototype.checkRequired = function (value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @api private
 */
BooleanSchema.prototype.cast = function (value) {
  if (null === value) return value;
  if ('0' === value) return false;
  if ('true' === value) return true;
  if ('false' === value) return false;
  return !! value;
};

/*!
 * Module exports.
 */

module.exports = BooleanSchema;

},{"../schematype":24}],17:[function(require,module,exports){
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
  if (value === null || value === '')
    return null;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (value instanceof Number || 'number' == typeof value
      || String(value) == Number(value))
    date = new Date(Number(value));

  // support for date strings
  else if (value.toString)
    date = new Date(value.toString());

  if (date.toString() != 'Invalid Date')
    return date;

  throw new CastError('date', value, this.path );
};

/*!
 * Module exports.
 */

module.exports = DateSchema;

},{"../schematype":24}],18:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , StorageDocumentArray = require('../types/documentarray')
  , Subdocument = require('../types/embedded')
  , Document = require('../document');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api private
 */
function DocumentArray (key, schema, options) {

  // compile an embedded document for this schema
  function EmbeddedDocument () {
    Subdocument.apply( this, arguments );
  }

  EmbeddedDocument.prototype = Object.create( Subdocument.prototype );
  EmbeddedDocument.prototype.constructor = EmbeddedDocument;
  EmbeddedDocument.prototype.$__setSchema( schema );

  // apply methods
  for (var i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (var j in schema.statics) {
    EmbeddedDocument[j] = schema.statics[j];
  }

  EmbeddedDocument.options = options;
  this.schema = schema;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  var path = this.path;
  var fn = this.defaultValue;

  this.default(function(){
    var arr = fn.call(this);
    if (!Array.isArray(arr)) arr = [arr];
    return new StorageDocumentArray(arr, path, this);
  });
}

/*!
 * Inherits from ArrayType.
 */
DocumentArray.prototype = Object.create( ArrayType.prototype );
DocumentArray.prototype.constructor = DocumentArray;

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */
DocumentArray.prototype.doValidate = function (array, fn, scope) {
  var self = this;

  SchemaType.prototype.doValidate.call(this, array, function (err) {
    if (err) return fn(err);

    var count = array && array.length
      , error;

    if (!count) return fn();

    // handle sparse arrays, do not use array.forEach which does not
    // iterate over sparse elements yet reports array.length including
    // them :(

    for (var i = 0, len = count; i < len; ++i) {
      // sidestep sparse entries
      var doc = array[i];
      if (!doc) {
        --count || fn();
        continue;
      }

      !(function (i) {
        doc.validate(function (err) {
          if (err && !error) {
            // rewrite the key
            err.key = self.key + '.' + i + '.' + err.key;
            return fn(error = err);
          }
          --count || fn();
        });
      })(i);
    }
  }, scope);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} doc that triggers the casting
 * @param {Boolean} init flag
 * @api private
 */
DocumentArray.prototype.cast = function (value, doc, init, prev) {
  var selected
    , subdoc
    , i;

  if (!Array.isArray(value)) {
    return this.cast([value], doc, init, prev);
  }

  if (!(value.isStorageDocumentArray)) {
    value = new StorageDocumentArray(value, this.path, doc);
    if (prev && prev._handlers) {
      for (var key in prev._handlers) {
        doc.off(key, prev._handlers[key]);
      }
    }
  }

  i = value.length;

  while (i--) {
    if (!(value[i] instanceof Subdocument) && value[i]) {
      if (init) {
        selected || (selected = scopePaths(this, doc.$__.selected, init));
        subdoc = new this.casterConstructor(null, value, true, selected);
        value[i] = subdoc.init(value[i]);
      } else {
        try {
          subdoc = prev.id(value[i]._id);
        } catch(e) {}

        if (prev && subdoc) {
          // handle resetting doc with existing id but differing data
          // doc.array = [{ doc: 'val' }]
          subdoc.set(value[i]);
        } else {
          subdoc = new this.casterConstructor(value[i], value);
        }

        // if set() is hooked it will have no return value
        // see gh-746
        value[i] = subdoc;
      }
    }
  }

  return value;
};

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArray} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */
function scopePaths (array, fields, init) {
  if (!(init && fields)) return undefined;

  var path = array.path + '.'
    , keys = Object.keys(fields)
    , i = keys.length
    , selected = {}
    , hasKeys
    , key;

  while (i--) {
    key = keys[i];
    if (0 === key.indexOf(path)) {
      hasKeys || (hasKeys = true);
      selected[key.substring(path.length)] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * Module exports.
 */

module.exports = DocumentArray;

},{"../document":3,"../schematype":24,"../types/documentarray":27,"../types/embedded":28,"./array":15}],19:[function(require,module,exports){

/*!
 * Module exports.
 */

exports.String = require('./string');

exports.Number = require('./number');

exports.Boolean = require('./boolean');

exports.DocumentArray = require('./documentarray');

exports.Array = require('./array');

exports.Date = require('./date');

exports.ObjectId = require('./objectid');

exports.Mixed = require('./mixed');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;

},{"./array":15,"./boolean":16,"./date":17,"./documentarray":18,"./mixed":20,"./number":21,"./objectid":22,"./string":23}],20:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');

/**
 * Mixed SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */
function Mixed (path, options) {
  if (options && options.default) {
    var def = options.default;
    if (Array.isArray(def) && 0 === def.length) {
      // make sure empty array defaults are handled
      options.default = Array;
    } else if (!options.shared &&
               _.isPlainObject(def) &&
               0 === Object.keys(def).length) {
      // prevent odd "shared" objects between documents
      options.default = function () {
        return {}
      }
    }
  }

  SchemaType.call(this, path, options);
}

/*!
 * Inherits from SchemaType.
 */
Mixed.prototype = Object.create( SchemaType.prototype );
Mixed.prototype.constructor = Mixed;

/**
 * Required validator
 *
 * @api private
 */
Mixed.prototype.checkRequired = function (val) {
  return (val !== undefined) && (val !== null);
};

/**
 * Casts `val` for Mixed.
 *
 * _this is a no-op_
 *
 * @param {Object} value to cast
 * @api private
 */
Mixed.prototype.cast = function (value) {
  return value;
};

/*!
 * Module exports.
 */

module.exports = Mixed;

},{"../schematype":24}],21:[function(require,module,exports){
/*!
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = require('../error').messages;

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */
function NumberSchema (key, options) {
  SchemaType.call(this, key, options, 'Number');
}

/*!
 * Inherits from SchemaType.
 */
NumberSchema.prototype = Object.create( SchemaType.prototype );
NumberSchema.prototype.constructor = NumberSchema;

/**
 * Required validator for number
 *
 * @api private
 */
NumberSchema.prototype.checkRequired = function ( value ) {
  if ( SchemaType._isRef( this, value ) ) {
    return null != value;
  } else {
    return typeof value == 'number' || value instanceof Number;
  }
};

/**
 * Sets a minimum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, min: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 9 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ n: { type: Number, min: min })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
 *     })
 *
 * @param {Number} value minimum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */
NumberSchema.prototype.min = function (value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.minValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.Number.min;
    msg = msg.replace(/{MIN}/, value);
    this.validators.push([this.minValidator = function (v) {
      return v === null || v >= value;
    }, msg, 'min']);
  }

  return this;
};

/**
 * Sets a maximum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, max: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 11 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ n: { type: Number, max: max })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
 *     })
 *
 * @param {Number} value maximum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */
NumberSchema.prototype.max = function (value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v){
      return v[0] != this.maxValidator;
    }, this);
  }

  if (null != value) {
    var msg = message || errorMessages.Number.max;
    msg = msg.replace(/{MAX}/, value);
    this.validators.push([this.maxValidator = function(v){
      return v === null || v <= value;
    }, msg, 'max']);
  }

  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value value to cast
 * @api private
 */
NumberSchema.prototype.cast = function ( value ) {
  var val = value && value._id
    ? value._id // documents
    : value;

  if (!isNaN(val)){
    if (null === val) return val;
    if ('' === val) return null;
    if ('string' == typeof val) val = Number(val);
    if (val instanceof Number) return val;
    if ('number' == typeof val) return val;
    if (val.toString && !Array.isArray(val) &&
        val.toString() == Number(val)) {
      return new Number(val);
    }
  }

  throw new CastError('number', value, this.path);
};

/*!
 * Module exports.
 */

module.exports = NumberSchema;

},{"../error":4,"../schematype":24}],22:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , oid = require('../types/objectid')
  , utils = require('../utils')
  , Document;

/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function ObjectId (key, options) {
  SchemaType.call(this, key, options, 'ObjectId');
}

/*!
 * Inherits from SchemaType.
 */
ObjectId.prototype = Object.create( SchemaType.prototype );
ObjectId.prototype.constructor = ObjectId;

/**
 * Adds an auto-generated ObjectId default if turnOn is true.
 * @param {Boolean} turnOn auto generated ObjectId defaults
 * @api public
 * @return {SchemaType} this
 */
ObjectId.prototype.auto = function ( turnOn ) {
  if ( turnOn ) {
    this.default( defaultId );
    this.set( resetId )
  }

  return this;
};

/**
 * Check required
 *
 * @api private
 */
ObjectId.prototype.checkRequired = function ( value ) {
  if (SchemaType._isRef( this, value )) {
    return null != value;
  } else {
    return value instanceof oid;
  }
};

/**
 * Casts to ObjectId
 *
 * @param {Object} value
 * @api private
 */
ObjectId.prototype.cast = function ( value ) {
  if ( SchemaType._isRef( this, value ) ) {
    // wait! we may need to cast this to a document

    if (null == value) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (value instanceof oid ) {
      return value;
    } else if ( !_.isPlainObject( value ) ) {
      throw new CastError('ObjectId', value, this.path);
    }

    // Нужно создать документ по схеме, указанной в ссылке
    var schema = this.options.ref;
    if ( !schema ){
      throw new TypeError('При ссылке (ref) на документ ' +
        'нужно указывать схему, по которой этот документ создавать');
    }

    if ( !storage.schemas[ schema ] ){
      throw new TypeError('При ссылке (ref) на документ ' +
        'нужно указывать название схемы на которую ссылаемся при её создании ( new Schema("name", schemaObject) )');
    }

    // init doc
    var doc = new Document( value, undefined, storage.schemas[ schema ], undefined, true );
    doc.$__.wasPopulated = true;

    return doc;
  }

  if (value === null) return value;

  if (value instanceof oid)
    return value;

  if ( value._id && value._id instanceof oid )
    return value._id;

  if (value.toString) {
    try {
      return oid.createFromHexString(value.toString());
    } catch (err) {
      throw new CastError('ObjectId', value, this.path);
    }
  }

  throw new CastError('ObjectId', value, this.path);
};

/*!
 * ignore
 */
function defaultId () {
  return new oid();
}

function resetId (v) {
  this.$__._id = null;
  return v;
}

/*!
 * Module exports.
 */

module.exports = ObjectId;

},{"../schematype":24,"../types/objectid":30,"../utils":31,"./../document":3}],23:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = require('../error').messages;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function StringSchema (key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options, 'String');
}

/*!
 * Inherits from SchemaType.
 */
StringSchema.prototype = Object.create( SchemaType.prototype );
StringSchema.prototype.constructor = StringSchema;

/**
 * Adds an enum validator
 *
 * ####Example:
 *
 *     var states = 'opening open closing closed'.split(' ')
 *     var s = new Schema({ state: { type: String, enum: states }})
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: `invalid` is not a valid enum value for path `state`.
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 *     // or with custom error messages
 *     var enu = {
 *       values: 'opening open closing closed'.split(' '),
 *       message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
 *     }
 *     var s = new Schema({ state: { type: String, enum: enu })
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: enum validator failed for path `state` with value `invalid`
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 * @param {String|Object} [args...] enumeration values
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */
StringSchema.prototype.enum = function () {
  if (this.enumValidator) {
    this.validators = this.validators.filter(function(v){
      return v[0] != this.enumValidator;
    }, this);
    this.enumValidator = false;
  }

  if (undefined === arguments[0] || false === arguments[0]) {
    return this;
  }

  var values;
  var errorMessage;

  if (_.isPlainObject(arguments[0])) {
    values = arguments[0].values;
    errorMessage = arguments[0].message;
  } else {
    values = arguments;
    errorMessage = errorMessages.String.enum;
  }

  for (var i = 0; i < values.length; i++) {
    if (undefined !== values[i]) {
      this.enumValues.push(this.cast(values[i]));
    }
  }

  var vals = this.enumValues;
  this.enumValidator = function (v) {
    return undefined === v || ~vals.indexOf(v);
  };
  this.validators.push([this.enumValidator, errorMessage, 'enum']);

  return this;
};

/**
 * Adds a lowercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ email: { type: String, lowercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *
 * @api public
 * @return {SchemaType} this
 */
StringSchema.prototype.lowercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.toLowerCase();
    return v;
  });
};

/**
 * Adds an uppercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ caps: { type: String, uppercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *
 * @api public
 * @return {SchemaType} this
 */
StringSchema.prototype.uppercase = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.toUpperCase();
    return v;
  });
};

/**
 * Adds a trim setter.
 *
 * The string value will be trimmed when set.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, trim: true }})
 *     var M = db.model('M', s)
 *     var string = ' some name '
 *     console.log(string.length) // 11
 *     var m = new M({ name: string })
 *     console.log(m.name.length) // 9
 *
 * @api public
 * @return {SchemaType} this
 */
StringSchema.prototype.trim = function () {
  return this.set(function (v, self) {
    if ('string' != typeof v) v = self.cast(v);
    if (v) return v.trim();
    return v;
  });
};

/**
 * Sets a regexp validator.
 *
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, match: /^a/ }})
 *     var M = db.model('M', s)
 *     var m = new M({ name: 'I am invalid' })
 *     m.validate(function (err) {
 *       console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 *     // using a custom error message
 *     var match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
 *     var s = new Schema({ file: { type: String, match: match }})
 *     var M = db.model('M', s);
 *     var m = new M({ file: 'invalid' });
 *     m.validate(function (err) {
 *       console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
 *     })
 *
 * Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.
 *
 *     var s = new Schema({ name: { type: String, match: /^a/, required: true }})
 *
 * @param {RegExp} regExp regular expression to test against
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */
StringSchema.prototype.match = function match (regExp, message) {
  // yes, we allow multiple match validators

  var msg = message || errorMessages.String.match;

  function matchValidator (v){
    return null != v && '' !== v
      ? regExp.test(v)
      : true
  }

  this.validators.push([matchValidator, msg, 'regexp']);
  return this;
};

/**
 * Check required
 *
 * @param {String|null|undefined} value
 * @api private
 */
StringSchema.prototype.checkRequired = function checkRequired (value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return null != value;
  } else {
    return (value instanceof String || typeof value == 'string') && value.length;
  }
};

/**
 * Casts to String
 *
 * @api private
 */
StringSchema.prototype.cast = function ( value ) {
  if ( value === null ) {
    return value;
  }

  if ('undefined' !== typeof value) {
    // handle documents being passed
    if (value._id && 'string' == typeof value._id) {
      return value._id;
    }
    if ( value.toString ) {
      return value.toString();
    }
  }

  throw new CastError('string', value, this.path);
};

/*!
 * Module exports.
 */

module.exports = StringSchema;

},{"../error":4,"../schematype":24}],24:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var error = require('./error')
  , utils = require('./utils');

var errorMessages = error.messages;
var CastError = error.CastError;
var ValidatorError = error.ValidatorError;

/**
 * SchemaType constructor
 *
 * @param {String} path
 * @param {Object} [options]
 * @param {String} [instance]
 * @api public
 */

function SchemaType (path, options, instance) {
  this.path = path;
  this.instance = instance;
  this.validators = [];
  this.setters = [];
  this.getters = [];
  this.options = options;

  for (var i in options) if (this[i] && 'function' == typeof this[i]) {
    var opts = Array.isArray(options[i])
      ? options[i]
      : [options[i]];

    this[i].apply(this, opts);
  }
}

/**
 * Sets a default value for this SchemaType.
 *
 * ####Example:
 *
 *     var schema = new Schema({ n: { type: Number, default: 10 })
 *     var M = db.model('M', schema)
 *     var m = new M;
 *     console.log(m.n) // 10
 *
 * Defaults can be either `functions` which return the value to use as the default or the literal value itself. Either way, the value will be cast based on its schema type before being set during document creation.
 *
 * ####Example:
 *
 *     // values are cast:
 *     var schema = new Schema({ aNumber: Number, default: "4.815162342" })
 *     var M = db.model('M', schema)
 *     var m = new M;
 *     console.log(m.aNumber) // 4.815162342
 *
 *     // default unique objects for Mixed types:
 *     var schema = new Schema({ mixed: Schema.Types.Mixed });
 *     schema.path('mixed').default(function () {
 *       return {};
 *     });
 *
 *     // if we don't use a function to return object literals for Mixed defaults,
 *     // each document will receive a reference to the same object literal creating
 *     // a "shared" object instance:
 *     var schema = new Schema({ mixed: Schema.Types.Mixed });
 *     schema.path('mixed').default({});
 *     var M = db.model('M', schema);
 *     var m1 = new M;
 *     m1.mixed.added = 1;
 *     console.log(m1.mixed); // { added: 1 }
 *     var m2 = new M;
 *     console.log(m2.mixed); // { added: 1 }
 *
 * @param {Function|any} val the default value
 * @return {defaultValue}
 * @api public
 */
SchemaType.prototype.default = function (val) {
  if (1 === arguments.length) {
    this.defaultValue = typeof val === 'function'
      ? val
      : this.cast( val );

    return this;

  } else if ( arguments.length > 1 ) {
    this.defaultValue = _.toArray( arguments );
  }
  return this.defaultValue;
};

/**
 * Adds a setter to this schematype.
 *
 * ####Example:
 *
 *     function capitalize (val) {
 *       if ('string' != typeof val) val = '';
 *       return val.charAt(0).toUpperCase() + val.substring(1);
 *     }
 *
 *     // defining within the schema
 *     var s = new Schema({ name: { type: String, set: capitalize }})
 *
 *     // or by retreiving its SchemaType
 *     var s = new Schema({ name: String })
 *     s.path('name').set(capitalize)
 *
 * Setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * Suppose you are implementing user registration for a website. Users provide an email and password, which gets saved to mongodb. The email is a string that you will want to normalize to lower case, in order to avoid one email having more than one account -- e.g., otherwise, avenue@q.com can be registered for 2 accounts via avenue@q.com and AvEnUe@Q.CoM.
 *
 * You can set up email lower case normalization easily via a Mongoose setter.
 *
 *     function toLower (v) {
 *       return v.toLowerCase();
 *     }
 *
 *     var UserSchema = new Schema({
 *       email: { type: String, set: toLower }
 *     })
 *
 *     var User = db.model('User', UserSchema)
 *
 *     var user = new User({email: 'AVENUE@Q.COM'})
 *     console.log(user.email); // 'avenue@q.com'
 *
 *     // or
 *     var user = new User
 *     user.email = 'Avenue@Q.com'
 *     console.log(user.email) // 'avenue@q.com'
 *
 * As you can see above, setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * _NOTE: we could have also just used the built-in `lowercase: true` SchemaType option instead of defining our own function._
 *
 *     new Schema({ email: { type: String, lowercase: true }})
 *
 * Setters are also passed a second argument, the schematype on which the setter was defined. This allows for tailored behavior based on options passed in the schema.
 *
 *     function inspector (val, schematype) {
 *       if (schematype.options.required) {
 *         return schematype.path + ' is required';
 *       } else {
 *         return val;
 *       }
 *     }
 *
 *     var VirusSchema = new Schema({
 *       name: { type: String, required: true, set: inspector },
 *       taxonomy: { type: String, set: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusSchema);
 *     var v = new Virus({ name: 'Parvoviridae', taxonomy: 'Parvovirinae' });
 *
 *     console.log(v.name);     // name is required
 *     console.log(v.taxonomy); // Parvovirinae
 *
 * @param {Function} fn
 * @return {SchemaType} this
 * @api public
 */
SchemaType.prototype.set = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter to this schematype.
 *
 * ####Example:
 *
 *     function dob (val) {
 *       if (!val) return val;
 *       return (val.getMonth() + 1) + "/" + val.getDate() + "/" + val.getFullYear();
 *     }
 *
 *     // defining within the schema
 *     var s = new Schema({ born: { type: Date, get: dob })
 *
 *     // or by retreiving its SchemaType
 *     var s = new Schema({ born: Date })
 *     s.path('born').get(dob)
 *
 * Getters allow you to transform the representation of the data as it travels from the raw mongodb document to the value that you see.
 *
 * Suppose you are storing credit card numbers and you want to hide everything except the last 4 digits to the mongoose user. You can do so by defining a getter in the following way:
 *
 *     function obfuscate (cc) {
 *       return '****-****-****-' + cc.slice(cc.length-4, cc.length);
 *     }
 *
 *     var AccountSchema = new Schema({
 *       creditCardNumber: { type: String, get: obfuscate }
 *     });
 *
 *     var Account = db.model('Account', AccountSchema);
 *
 *     Account.findById(id, function (err, found) {
 *       console.log(found.creditCardNumber); // '****-****-****-1234'
 *     });
 *
 * Getters are also passed a second argument, the schematype on which the getter was defined. This allows for tailored behavior based on options passed in the schema.
 *
 *     function inspector (val, schematype) {
 *       if (schematype.options.required) {
 *         return schematype.path + ' is required';
 *       } else {
 *         return schematype.path + ' is not';
 *       }
 *     }
 *
 *     var VirusSchema = new Schema({
 *       name: { type: String, required: true, get: inspector },
 *       taxonomy: { type: String, get: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusSchema);
 *
 *     Virus.findById(id, function (err, virus) {
 *       console.log(virus.name);     // name is required
 *       console.log(virus.taxonomy); // taxonomy is not
 *     })
 *
 * @param {Function} fn
 * @return {SchemaType} this
 * @api public
 */
SchemaType.prototype.get = function (fn) {
  if ('function' != typeof fn)
    throw new TypeError('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * Adds validator(s) for this document path.
 *
 * Validators always receive the value to validate as their first argument and must return `Boolean`. Returning `false` means validation failed.
 *
 * The error message argument is optional. If not passed, the [default generic error message template](#error_messages_MongooseError-messages) will be used.
 *
 * ####Examples:
 *
 *     // make sure every value is equal to "something"
 *     function validator (val) {
 *       return val == 'something';
 *     }
 *     new Schema({ name: { type: String, validate: validator }});
 *
 *     // with a custom error message
 *
 *     var custom = [validator, 'Uh oh, {PATH} does not equal "something".']
 *     new Schema({ name: { type: String, validate: custom }});
 *
 *     // adding many validators at a time
 *
 *     var many = [
 *         { validator: validator, msg: 'uh oh' }
 *       , { validator: anotherValidator, msg: 'failed' }
 *     ]
 *     new Schema({ name: { type: String, validate: many }});
 *
 *     // or utilizing SchemaType methods directly:
 *
 *     var schema = new Schema({ name: 'string' });
 *     schema.path('name').validate(validator, 'validation of `{PATH}` failed with value `{VALUE}`');
 *
 * ####Error message templates:
 *
 * From the examples above, you may have noticed that error messages support baseic templating. There are a few other template keywords besides `{PATH}` and `{VALUE}` too. To find out more, details are available [here](#error_messages_MongooseError-messages)
 *
 * ####Asynchronous validation:
 *
 * Passing a validator function that receives two arguments tells mongoose that the validator is an asynchronous validator. The first argument passed to the validator function is the value being validated. The second argument is a callback function that must called when you finish validating the value and passed either `true` or `false` to communicate either success or failure respectively.
 *
 *     schema.path('name').validate(function (value, respond) {
 *       doStuff(value, function () {
 *         ...
 *         respond(false); // validation failed
 *       })
*      }, '{PATH} failed validation.');
*
 * You might use asynchronous validators to retreive other documents from the database to validate against or to meet other I/O bound validation needs.
 *
 * Validation occurs `pre('save')` or whenever you manually execute [document#validate](#document_Document-validate).
 *
 * If validation fails during `pre('save')` and no callback was passed to receive the error, an `error` event will be emitted on your Models associated db [connection](#connection_Connection), passing the validation error object along.
 *
 *     var conn = mongoose.createConnection(..);
 *     conn.on('error', handleError);
 *
 *     var Product = conn.model('Product', yourSchema);
 *     var dvd = new Product(..);
 *     dvd.save(); // emits error on the `conn` above
 *
 * If you desire handling these errors at the Model level, attach an `error` listener to your Model and the event will instead be emitted there.
 *
 *     // registering an error listener on the Model lets us handle errors more locally
 *     Product.on('error', handleError);
 *
 * @param {RegExp|Function|Object} obj validator
 * @param {String} [message] optional error message
 * @return {SchemaType} this
 * @api public
 */
SchemaType.prototype.validate = function (obj, message, type) {
  if ('function' == typeof obj || obj && 'RegExp' === utils.getFunctionName( obj.constructor )) {
    if (!message) message = errorMessages.general.default;
    if (!type) type = 'user defined';
    this.validators.push([obj, message, type]);
    return this;
  }

  var i = arguments.length
    , arg;

  while (i--) {
    arg = arguments[i];
    if (!(arg && 'Object' == utils.getFunctionName( arg.constructor ) )) {
      var msg = 'Invalid validator. Received (' + typeof arg + ') '
        + arg
        + '. See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate';

      throw new Error(msg);
    }
    this.validate(arg.validator, arg.msg, arg.type);
  }

  return this;
};

/**
 * Adds a required validator to this schematype.
 *
 * ####Example:
 *
 *     var s = new Schema({ born: { type: Date, required: true })
 *
 *     // or with custom error message
 *
 *     var s = new Schema({ born: { type: Date, required: '{PATH} is required!' })
 *
 *     // or through the path API
 *
 *     Schema.path('name').required(true);
 *
 *     // with custom error messaging
 *
 *     Schema.path('name').required(true, 'grrr :( ');
 *
 *
 * @param {Boolean} required enable/disable the validator
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */
SchemaType.prototype.required = function (required, message) {
  if (false === required) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.requiredValidator;
    }, this);

    this.isRequired = false;
    return this;
  }

  var self = this;
  this.isRequired = true;

  this.requiredValidator = function (v) {
    // in here, `this` refers to the validating document.
    // no validation when this path wasn't selected in the query.
    if (this !== undefined && // специальная проверка из-за strict mode и особенности .call(undefined)
        'isSelected' in this &&
        !this.isSelected(self.path) &&
        !this.isModified(self.path)) return true;

    return self.checkRequired(v, this);
  };

  if ('string' == typeof required) {
    message = required;
    required = undefined;
  }

  var msg = message || errorMessages.general.required;
  this.validators.push([this.requiredValidator, msg, 'required']);

  return this;
};


/**
 * Gets the default value
 *
 * @param {Object} scope the scope which callback are executed
 * @param {Boolean} init
 * @api private
 */
SchemaType.prototype.getDefault = function (scope, init) {
  var ret = 'function' === typeof this.defaultValue
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  if (null !== ret && undefined !== ret) {
    return this.cast(ret, scope, init);
  } else {
    return ret;
  }
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} init
 * @api private
 */

SchemaType.prototype.applySetters = function (value, scope, init, priorVal) {
  if (SchemaType._isRef( this, value )) {
    return init
      ? value
      : this.cast(value, scope, init, priorVal);
  }

  var v = value
    , setters = this.setters
    , len = setters.length
    , caster = this.caster;

  if (Array.isArray(v) && caster && caster.setters) {
    for (var i = 0; i < v.length; i++) {
      v[i] = caster.applySetters(v[i], scope, init, priorVal);
    }
  }

  if (!len) {
    if (null === v || undefined === v) return v;
    return this.cast(v, scope, init, priorVal);
  }

  while (len--) {
    v = setters[len].call(scope, v, this);
  }

  if (null === v || undefined === v) return v;

  // do not cast until all setters are applied #665
  v = this.cast(v, scope, init, priorVal);

  return v;
};

/**
 * Applies getters to a value
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */
SchemaType.prototype.applyGetters = function( value, scope ){
  if ( SchemaType._isRef( this, value ) ) return value;

  var v = value
    , getters = this.getters
    , len = getters.length;

  if ( !len ) {
    return v;
  }

  while ( len-- ) {
    v = getters[ len ].call(scope, v, this);
  }

  return v;
};

/**
 * Performs a validation of `value` using the validators declared for this SchemaType.
 *
 * @param {*} value
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */
SchemaType.prototype.doValidate = function (value, callback, scope) {
  var err = false
    , path = this.path
    , count = this.validators.length;

  if (!count) return callback(null);

  function validate (ok, message, type, val) {
    if (err) return;
    if (ok === undefined || ok) {
      --count || callback(null);
    } else {
      callback(err = new ValidatorError(path, message, type, val));
    }
  }

  this.validators.forEach(function (v) {
    var validator = v[0]
      , message = v[1]
      , type = v[2];

    if (validator instanceof RegExp) {
      validate(validator.test(value), message, type, value);
    } else if ('function' === typeof validator) {
      if (2 === validator.length) {
        validator.call(scope, value, function (ok) {
          validate(ok, message, type, value);
        });
      } else {
        validate(validator.call(scope, value), message, type, value);
      }
    }
  });
};

/**
 * Determines if value is a valid Reference.
 *
 * На клиенте в качестве ссылки можно хранить как id, так и полные документы
 *
 * @param {SchemaType} self
 * @param {Object} value
 * @return {Boolean}
 * @api private
 */
SchemaType._isRef = function( self, value ){
  // fast path
  var ref = self.options && self.options.ref;

  if ( ref ) {
    if ( null == value ) return true;
    if ( _.isObject( value ) ) {
      return true;
    }
  }

  return false;
};

/*!
 * Module exports.
 */

module.exports = SchemaType;

SchemaType.CastError = CastError;

SchemaType.ValidatorError = ValidatorError;

},{"./error":4,"./utils":31}],25:[function(require,module,exports){
/*!
 * StateMachine represents a minimal `interface` for the
 * constructors it builds via StateMachine.ctor(...).
 *
 * @api private
 */

var StateMachine = module.exports = function StateMachine () {
  this.paths = {};
  this.states = {};
};

/*!
 * StateMachine.ctor('state1', 'state2', ...)
 * A factory method for subclassing StateMachine.
 * The arguments are a list of states. For each state,
 * the constructor's prototype gets state transition
 * methods named after each state. These transition methods
 * place their path argument into the given state.
 *
 * @param {String} state
 * @param {String} [state]
 * @return {Function} subclass constructor
 * @private
 */

StateMachine.ctor = function () {
  var states = _.toArray(arguments);

  var ctor = function () {
    StateMachine.apply(this, arguments);
    this.stateNames = states;

    var i = states.length
      , state;

    while (i--) {
      state = states[i];
      this.states[state] = {};
    }
  };

  ctor.prototype = Object.create( StateMachine.prototype );
  ctor.prototype.constructor = ctor;

  states.forEach(function (state) {
    // Changes the `path`'s state to `state`.
    ctor.prototype[state] = function (path) {
      this._changeState(path, state);
    }
  });

  return ctor;
};

/*!
 * This function is wrapped by the state change functions:
 *
 * - `require(path)`
 * - `modify(path)`
 * - `init(path)`
 *
 * @api private
 */

StateMachine.prototype._changeState = function _changeState (path, nextState) {
  var prevBucket = this.states[this.paths[path]];
  if (prevBucket) delete prevBucket[path];

  this.paths[path] = nextState;
  this.states[nextState][path] = true;
};

/*!
 * ignore
 */

StateMachine.prototype.clear = function clear (state) {
  var keys = Object.keys(this.states[state])
    , i = keys.length
    , path;

  while (i--) {
    path = keys[i];
    delete this.states[state][path];
    delete this.paths[path];
  }
};

/*!
 * Checks to see if at least one path is in the states passed in via `arguments`
 * e.g., this.some('required', 'inited')
 *
 * @param {String} state that we want to check for.
 * @private
 */

StateMachine.prototype.some = function some () {
  var self = this;
  var what = arguments.length ? arguments : this.stateNames;
  return Array.prototype.some.call(what, function (state) {
    return Object.keys(self.states[state]).length;
  });
};

/*!
 * This function builds the functions that get assigned to `forEach` and `map`,
 * since both of those methods share a lot of the same logic.
 *
 * @param {String} iterMethod is either 'forEach' or 'map'
 * @return {Function}
 * @api private
 */

StateMachine.prototype._iter = function _iter (iterMethod) {
  return function () {
    var numArgs = arguments.length
      , states = _.toArray(arguments).slice(0, numArgs-1)
      , callback = arguments[numArgs-1];

    if (!states.length) states = this.stateNames;

    var self = this;

    var paths = states.reduce(function (paths, state) {
      return paths.concat(Object.keys(self.states[state]));
    }, []);

    return paths[iterMethod](function (path, i, paths) {
      return callback(path, i, paths);
    });
  };
};

/*!
 * Iterates over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @private
 */

StateMachine.prototype.forEach = function forEach () {
  this.forEach = this._iter('forEach');
  return this.forEach.apply(this, arguments);
};

/*!
 * Maps over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @return {Array}
 * @private
 */

StateMachine.prototype.map = function map () {
  this.map = this._iter('map');
  return this.map.apply(this, arguments);
};


},{}],26:[function(require,module,exports){
//TODO: почистить код

/*!
 * Module dependencies.
 */

var EmbeddedDocument = require('./embedded');
var Document = require('../document');
var ObjectId = require('./objectid');
var utils = require('../utils');

/**
 * Storage Array constructor.
 *
 * ####NOTE:
 *
 * _Values always have to be passed to the constructor to initialize, otherwise `StorageArray#push` will mark the array as modified._
 *
 * @param {Array} values
 * @param {String} path
 * @param {Document} doc parent document
 * @api private
 * @inherits Array
 * @see http://bit.ly/f6CnZU
 */
function StorageArray (values, path, doc) {
  var arr = [];
  arr.push.apply(arr, values);
  _.mixin( arr, StorageArray.mixin );

  arr.validators = [];
  arr._path = path;
  arr.isStorageArray = true;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
}

StorageArray.mixin = {
  /**
   * Parent owner document
   *
   * @property _parent
   * @api private
   */
  _parent: undefined,

  /**
   * Casts a member based on this arrays schema.
   *
   * @param {*} value
   * @return value the casted value
   * @api private
   */
  _cast: function ( value ) {
    var owner = this._owner;
    var populated = false;

    if (this._parent) {
      // if a populated array, we must cast to the same model
      // instance as specified in the original query.
      if (!owner) {
        owner = this._owner = this._parent.ownerDocument
          ? this._parent.ownerDocument()
          : this._parent;
      }

      populated = owner.populated(this._path, true);
    }

    if (populated && null != value) {
      // cast to the populated Models schema
      var Model = populated.options.model;

      // only objects are permitted so we can safely assume that
      // non-objects are to be interpreted as _id
      if ( value instanceof ObjectId || !_.isObject(value) ) {
        value = { _id: value };
      }

      value = new Model(value);
      return this._schema.caster.cast(value, this._parent, true)
    }

    return this._schema.caster.cast(value, this._parent, false)
  },

  /**
   * Marks this array as modified.
   *
   * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
   *
   * @param {EmbeddedDocument} embeddedDoc the embedded doc that invoked this method on the Array
   * @param {String} embeddedPath the path which changed in the embeddedDoc
   * @api private
   */
  _markModified: function (elem, embeddedPath) {
    var parent = this._parent
      , dirtyPath;

    if (parent) {
      dirtyPath = this._path;

      if (arguments.length) {
        if (null != embeddedPath) {
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + this.indexOf(elem) + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + elem;
        }
      }

      parent.markModified(dirtyPath);
    }

    return this;
  },

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {Object} [args...]
   * @api public
   */
  push: function () {
    var values = [].map.call(arguments, this._cast, this)
      , ret = [].push.apply(this, values);

    this._markModified();
    return ret;
  },

  /**
   * Wraps [`Array#pop`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/pop) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified which will pass the entire thing to $set potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @see StorageArray#$pop #types_array_MongooseArray-%24pop
   * @api public
   */
  pop: function () {
    var ret = [].pop.call(this);

    this._markModified();
    return ret;
  },

  /**
   * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Example:
   *
   *     doc.array = [2,3];
   *     var res = doc.array.shift();
   *     console.log(res) // 2
   *     console.log(doc.array) // [3]
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   */
  shift: function () {
    var ret = [].shift.call(this);

    this._markModified();
    return ret;
  },

  /**
   * Pulls items from the array atomically.
   *
   * ####Examples:
   *
   *     doc.array.pull(ObjectId)
   *     doc.array.pull({ _id: 'someId' })
   *     doc.array.pull(36)
   *     doc.array.pull('tag 1', 'tag 2')
   *
   * To remove a document from a subdocument array we may pass an object with a matching `_id`.
   *
   *     doc.subdocs.push({ _id: 4815162342 })
   *     doc.subdocs.pull({ _id: 4815162342 }) // removed
   *
   * Or we may passing the _id directly and let mongoose take care of it.
   *
   *     doc.subdocs.push({ _id: 4815162342 })
   *     doc.subdocs.pull(4815162342); // works
   *
   * @param {*} arguments
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
   * @api public
   */
  pull: function () {
    var values = [].map.call(arguments, this._cast, this)
      , cur = this._parent.get(this._path)
      , i = cur.length
      , mem;

    while (i--) {
      mem = cur[i];
      if (mem instanceof EmbeddedDocument) {
        if (values.some(function (v) { return v.equals(mem); } )) {
          [].splice.call(cur, i, 1);
        }
      } else if (~cur.indexOf.call(values, mem)) {
        [].splice.call(cur, i, 1);
      }
    }

    this._markModified();
    return this;
  },

  /**
   * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   */
  splice: function splice () {
    var ret, vals, i;

    if (arguments.length) {
      vals = [];
      for (i = 0; i < arguments.length; ++i) {
        vals[i] = i < 2
          ? arguments[i]
          : this._cast(arguments[i]);
      }
      ret = [].splice.apply(this, vals);

      this._markModified();
    }

    return ret;
  },

  /**
   * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   */
  unshift: function () {
    var values = [].map.call(arguments, this._cast, this);
    [].unshift.apply(this, values);

    this._markModified();
    return this.length;
  },

  /**
   * Wraps [`Array#sort`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) with proper change tracking.
   *
   * ####NOTE:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   */
  sort: function () {
    var ret = [].sort.apply(this, arguments);

    this._markModified();
    return ret;
  },

  /**
   * Adds values to the array if not already present.
   *
   * ####Example:
   *
   *     console.log(doc.array) // [2,3,4]
   *     var added = doc.array.addToSet(4,5);
   *     console.log(doc.array) // [2,3,4,5]
   *     console.log(added)     // [5]
   *
   * @param {*} arguments
   * @return {Array} the values that were added
   * @api public
   */
  addToSet: function addToSet () {
    var values = [].map.call(arguments, this._cast, this)
      , added = []
      , type = values[0] instanceof EmbeddedDocument ? 'doc' :
               values[0] instanceof Date ? 'date' :
               '';

    values.forEach(function (v) {
      var found;
      switch (type) {
        case 'doc':
          found = this.some(function(doc){ return doc.equals(v) });
          break;
        case 'date':
          var val = +v;
          found = this.some(function(d){ return +d === val });
          break;
        default:
          found = ~this.indexOf(v);
      }

      if (!found) {
        [].push.call(this, v);

        this._markModified();
        [].push.call(added, v);
      }
    }, this);

    return added;
  },

  /**
   * Sets the casted `val` at index `i` and marks the array modified.
   *
   * ####Example:
   *
   *     // given documents based on the following
   *     var Doc = mongoose.model('Doc', new Schema({ array: [Number] }));
   *
   *     var doc = new Doc({ array: [2,3,4] })
   *
   *     console.log(doc.array) // [2,3,4]
   *
   *     doc.array.set(1,"5");
   *     console.log(doc.array); // [2,5,4] // properly cast to number
   *     doc.save() // the change is saved
   *
   *     // VS not using array#set
   *     doc.array[1] = "5";
   *     console.log(doc.array); // [2,"5",4] // no casting
   *     doc.save() // change is not saved
   *
   * @return {Array} this
   * @api public
   */
  set: function (i, val) {
    this[i] = this._cast(val);
    this._markModified(i);
    return this;
  },

  /**
   * Returns a native js Array.
   *
   * @param {Object} options
   * @return {Array}
   * @api public
   */
  toObject: function (options) {
    if (options && options.depopulate) {
      return this.map(function (doc) {
        return doc instanceof Document
          ? doc.toObject(options)
          : doc
      });
    }

    return this.slice();
  },

  /**
   * Return the index of `obj` or `-1` if not found.
   *
   * @param {Object} obj the item to look for
   * @return {Number}
   * @api public
   */
  indexOf: function indexOf (obj) {
    if (obj instanceof ObjectId) obj = obj.toString();
    for (var i = 0, len = this.length; i < len; ++i) {
      if (obj == this[i])
        return i;
    }
    return -1;
  }
};

/**
 * Alias of [pull](#types_array_MongooseArray-pull)
 *
 * @see StorageArray#pull #types_array_MongooseArray-pull
 * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
 * @api public
 * @memberOf StorageArray
 * @method remove
 */
StorageArray.mixin.remove = StorageArray.mixin.pull;

/*!
 * Module exports.
 */

module.exports = StorageArray;

},{"../document":3,"../utils":31,"./embedded":28,"./objectid":30}],27:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var StorageArray = require('./array')
  , ObjectId = require('./objectid')
  , ObjectIdSchema = require('../schema/objectid')
  , utils = require('../utils')
  , Document = require('../document');

/**
 * DocumentArray constructor
 *
 * @param {Array} values
 * @param {String} path the path to this array
 * @param {Document} doc parent document
 * @api private
 * @return {StorageDocumentArray}
 * @inherits StorageArray
 * @see http://bit.ly/f6CnZU
 * TODO: подчистить код
 *
 * Весь нужный код скопирован
 */
function StorageDocumentArray (values, path, doc) {
  var arr = [];

  // Values always have to be passed to the constructor to initialize, since
  // otherwise StorageArray#push will mark the array as modified to the parent.
  arr.push.apply(arr, values);
  _.mixin( arr, StorageDocumentArray.mixin );

  arr.validators = [];
  arr._path = path;
  arr.isStorageArray = true;
  arr.isStorageDocumentArray = true;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    arr._handlers = {
      isNew: arr.notify('isNew'),
      save: arr.notify('save')
    };

    // Проброс изменения состояния в поддокумент
    doc.on('save', arr._handlers.save);
    doc.on('isNew', arr._handlers.isNew);
  }

  return arr;
}

/*!
 * Inherits from StorageArray
 */
StorageDocumentArray.mixin = Object.create( StorageArray.mixin );

/**
 * Overrides StorageArray#cast
 *
 * @api private
 */
StorageDocumentArray.mixin._cast = function (value) {
  if (value instanceof this._schema.casterConstructor) {
    if (!(value.__parent && value.__parentArray)) {
      // value may have been created using array.create()
      value.__parent = this._parent;
      value.__parentArray = this;
    }
    return value;
  }

  // handle cast('string') or cast(ObjectId) etc.
  // only objects are permitted so we can safely assume that
  // non-objects are to be interpreted as _id
  if ( value instanceof ObjectId || !_.isObject(value) ) {
    value = { _id: value };
  }

  return new this._schema.casterConstructor(value, this);
};

/**
 * Searches array items for the first document with a matching _id.
 *
 * ####Example:
 *
 *     var embeddedDoc = m.array.id(some_id);
 *
 * @return {EmbeddedDocument|null} the subdocument or null if not found.
 * @param {ObjectId|String|Number} id
 * @TODO cast to the _id based on schema for proper comparison
 * @api public
 */
StorageDocumentArray.mixin.id = function (id) {
  var casted
    , sid
    , _id;

  try {
    var casted_ = ObjectIdSchema.prototype.cast.call({}, id);
    if (casted_) casted = String(casted_);
  } catch (e) {
    casted = null;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    _id = this[i].get('_id');

    if (_id instanceof Document) {
      sid || (sid = String(id));
      if (sid == _id._id) return this[i];
    } else if (!(_id instanceof ObjectId)) {
      sid || (sid = String(id));
      if (sid == _id) return this[i];
    } else if (casted == _id) {
      return this[i];
    }
  }

  return null;
};

/**
 * Returns a native js Array of plain js objects
 *
 * ####NOTE:
 *
 * _Each sub-document is converted to a plain object by calling its `#toObject` method._
 *
 * @param {Object} [options] optional options to pass to each documents `toObject` method call during conversion
 * @return {Array}
 * @api public
 */

StorageDocumentArray.mixin.toObject = function (options) {
  return this.map(function (doc) {
    return doc && doc.toObject(options) || null;
  });
};

/**
 * Creates a subdocument casted to this schema.
 *
 * This is the same subdocument constructor used for casting.
 *
 * @param {Object} obj the value to cast to this arrays SubDocument schema
 * @api public
 */

StorageDocumentArray.mixin.create = function (obj) {
  return new this._schema.casterConstructor(obj);
};

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */
StorageDocumentArray.mixin.notify = function notify (event) {
  var self = this;
  return function notify (val) {
    var i = self.length;
    while (i--) {
      if (!self[i]) continue;
      self[i].trigger(event, val);
    }
  }
};

/*!
 * Module exports.
 */

module.exports = StorageDocumentArray;

},{"../document":3,"../schema/objectid":22,"../utils":31,"./array":26,"./objectid":30}],28:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var Document = require('../document');

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} data js object returned from the db
 * @param {MongooseDocumentArray} parentArr the parent array of this document
 * @inherits Document
 * @api private
 */
function EmbeddedDocument ( data, parentArr ) {
  if (parentArr) {
    this.__parentArray = parentArr;
    this.__parent = parentArr._parent;
  } else {
    this.__parentArray = undefined;
    this.__parent = undefined;
  }

  Document.call( this, data, undefined );

  // Нужно для проброса изменения значения из родительского документа, например при сохранении
  var self = this;
  this.on('isNew', function (val) {
    self.isNew = val;
  });
}

/*!
 * Inherit from Document
 */
EmbeddedDocument.prototype = Object.create( Document.prototype );
EmbeddedDocument.prototype.constructor = EmbeddedDocument;

/**
 * Marks the embedded doc modified.
 *
 * ####Example:
 *
 *     var doc = blogpost.comments.id(hexstring);
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *
 * @param {String} path the path which changed
 * @api public
 */
EmbeddedDocument.prototype.markModified = function (path) {
  if (!this.__parentArray) return;

  this.$__.activePaths.modify(path);

  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.__parentArray._markModified();
  } else
    this.__parentArray._markModified(this, path);
};

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

EmbeddedDocument.prototype.save = function (fn) {
  var promise = $.Deferred().done(fn);
  promise.resolve();
  return promise;
}

/**
 * Removes the subdocument from its parent array.
 *
 * @param {Function} [fn]
 * @api public
 */
EmbeddedDocument.prototype.remove = function (fn) {
  if (!this.__parentArray) return this;

  var _id;
  if (!this.willRemove) {
    _id = this._doc._id;
    if (!_id) {
      throw new Error('For your own good, Mongoose does not know ' +
                      'how to remove an EmbeddedDocument that has no _id');
    }
    this.__parentArray.pull({ _id: _id });
    this.willRemove = true;
  }

  if (fn)
    fn(null);

  return this;
};

/**
 * Override #update method of parent documents.
 * @api private
 */
EmbeddedDocument.prototype.update = function () {
  throw new Error('The #update method is not available on EmbeddedDocuments');
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err error which states the reason `path` was invalid
 * @return {Boolean}
 * @api public
 */
EmbeddedDocument.prototype.invalidate = function (path, err, val, first) {
  if (!this.__parent) {
    var msg = 'Unable to invalidate a subdocument that has not been added to an array.'
    throw new Error(msg);
  }

  var index = this.__parentArray.indexOf(this);
  var parentPath = this.__parentArray._path;
  var fullPath = [parentPath, index, path].join('.');

  // sniffing arguments:
  // need to check if user passed a value to keep
  // our error message clean.
  if (2 < arguments.length) {
    this.__parent.invalidate(fullPath, err, val);
  } else {
    this.__parent.invalidate(fullPath, err);
  }

  if (first)
    this.$__.validationError = this.ownerDocument().$__.validationError;
  return true;
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */
EmbeddedDocument.prototype.ownerDocument = function () {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  var parent = this.__parent;
  if (!parent) return this;

  while (parent.__parent) {
    parent = parent.__parent;
  }

  return this.$__.ownerDocument = parent;
};

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf EmbeddedDocument
 */
EmbeddedDocument.prototype.$__fullPath = function (path) {
  if (!this.$__.fullPath) {
    var parent = this;
    if (!parent.__parent) return path;

    var paths = [];
    while (parent.__parent) {
      paths.unshift(parent.__parentArray._path);
      parent = parent.__parent;
    }

    this.$__.fullPath = paths.join('.');

    if (!this.$__.ownerDocument) {
      // optimization
      this.$__.ownerDocument = parent;
    }
  }

  return path
    ? this.$__.fullPath + '.' + path
    : this.$__.fullPath;
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */
EmbeddedDocument.prototype.parent = function () {
  return this.__parent;
};

/**
 * Returns this sub-documents parent array.
 *
 * @api public
 */
EmbeddedDocument.prototype.parentArray = function () {
  return this.__parentArray;
};

/*!
 * Module exports.
 */

module.exports = EmbeddedDocument;

},{"../document":3}],29:[function(require,module,exports){

/*!
 * Module exports.
 */

exports.Array = require('./array');

exports.Embedded = require('./embedded');

exports.DocumentArray = require('./documentarray');
exports.ObjectId = require('./objectid');

},{"./array":26,"./documentarray":27,"./embedded":28,"./objectid":30}],30:[function(require,module,exports){
(function (process){
/**
 * Module dependencies.
 * @ignore
 */
var BinaryParser = require('../binary_parser').BinaryParser;

/**
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don't bother.
 * @ignore
 */
var MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);

// Regular expression that checks for hex value
var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

/**
 * Create a new ObjectId instance
 *
 * @see https://github.com/mongodb/js-bson/blob/master/lib/bson/objectid.js
 * @class Represents a BSON ObjectId type.
 * @param {(string|number)} id Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @property {number} generationTime The generation time of this ObjectId instance
 * @return {ObjectId} instance of ObjectId.
 */
function ObjectId(id) {
  if(!(this instanceof ObjectId)) return new ObjectId(id);
  if((id instanceof ObjectId)) return id;

  this._bsontype = 'ObjectId';
  var valid = ObjectId.isValid(id);

  // Throw an error if it's not a valid setup
  if(!valid && id != null){
    throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
  } else if(valid && typeof id == 'string' && id.length == 24) {
    return ObjectId.createFromHexString(id);
  } else if(id == null || typeof id == 'number') {
    // convert to 12 byte binary string
    this.id = this.generate(id);
  } else if(id != null && id.length === 12) {
    // assume 12 byte string
    this.id = id;
  }

  if(ObjectId.cacheHexString) this.__id = this.toHexString();
}

// Precomputed hex table enables speedy hex string conversion
var hexTable = [];
for (var i = 0; i < 256; i++) {
  hexTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}

/**
 * Return the ObjectId id as a 24 byte hex string representation
 *
 * @method
 * @return {string} return the 24 byte hex string representation.
 */
ObjectId.prototype.toHexString = function() {
  if(ObjectId.cacheHexString && this.__id) return this.__id;

  var hexString = '';

  for (var i = 0; i < this.id.length; i++) {
    hexString += hexTable[this.id.charCodeAt(i)];
  }

  if(ObjectId.cacheHexString) this.__id = hexString;
  return hexString;
};

/**
 * Update the ObjectId index used in generating new ObjectId's on the driver
 *
 * @method
 * @return {number} returns next index value.
 * @ignore
 */
ObjectId.prototype.get_inc = function() {
  return ObjectId.index = (ObjectId.index + 1) % 0xFFFFFF;
};

/**
 * Update the ObjectId index used in generating new ObjectId's on the driver
 *
 * @method
 * @return {number} returns next index value.
 * @ignore
 */
ObjectId.prototype.getInc = function() {
  return this.get_inc();
};

/**
 * Generate a 12 byte id string used in ObjectId's
 *
 * @method
 * @param {number} [time] optional parameter allowing to pass in a second based timestamp.
 * @return {string} return the 12 byte id binary string.
 */
ObjectId.prototype.generate = function(time) {
  if ('number' != typeof time) {
    time = parseInt(Date.now()/1000,10);
  }

  var time4Bytes = BinaryParser.encodeInt(time, 32, true, true);
  /* for time-based ObjectId the bytes following the time will be zeroed */
  var machine3Bytes = BinaryParser.encodeInt(MACHINE_ID, 24, false);
  var pid2Bytes = BinaryParser.fromShort(typeof process === 'undefined' ? Math.floor(Math.random() * 100000) : process.pid);
  var index3Bytes = BinaryParser.encodeInt(this.get_inc(), 24, false, true);

  return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
};

/**
 * Converts the id into a 24 byte hex string for printing
 *
 * @return {String} return the 24 byte hex string representation.
 * @ignore
 */
ObjectId.prototype.toString = function() {
  return this.toHexString();
};

/**
 * Converts to its JSON representation.
 *
 * @return {String} return the 24 byte hex string representation.
 * @ignore
 */
ObjectId.prototype.toJSON = function() {
  return this.toHexString();
};

/**
 * Compares the equality of this ObjectId with `otherID`.
 *
 * @method
 * @param {object} otherID ObjectId instance to compare against.
 * @return {boolean} the result of comparing two ObjectId's
 */
ObjectId.prototype.equals = function equals (otherID) {
  if(otherID == null) return false;
  var id = (otherID instanceof ObjectId || otherID.toHexString)
    ? otherID.id
    : ObjectId.createFromHexString(otherID).id;

  return this.id === id;
};

/**
 * Returns the generation date (accurate up to the second) that this ID was generated.
 *
 * @method
 * @return {date} the generation date
 */
ObjectId.prototype.getTimestamp = function() {
  var timestamp = new Date();
  timestamp.setTime(Math.floor(BinaryParser.decodeInt(this.id.substring(0,4), 32, true, true)) * 1000);
  return timestamp;
};

/**
 * @ignore
 */
ObjectId.index = parseInt(Math.random() * 0xFFFFFF, 10);

/**
 * @ignore
 */
ObjectId.createPk = function createPk () {
  return new ObjectId();
};

/**
 * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
 *
 * @method
 * @param {number} time an integer number representing a number of seconds.
 * @return {ObjectId} return the created ObjectId
 */
ObjectId.createFromTime = function createFromTime (time) {
  var id = BinaryParser.encodeInt(time, 32, true, true) +
    BinaryParser.encodeInt(0, 64, true, true);
  return new ObjectId(id);
};

/**
 * Creates an ObjectId from a hex string representation of an ObjectId.
 *
 * @method
 * @param {string} hexString create a ObjectId from a passed in 24 byte hexstring.
 * @return {ObjectId} return the created ObjectId
 */
ObjectId.createFromHexString = function createFromHexString (hexString) {
  // Throw an error if it's not a valid setup
  if(typeof hexString === 'undefined' || hexString != null && hexString.length != 24)
    throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

  var len = hexString.length;

  if(len > 12*2) {
    throw new Error('Id cannot be longer than 12 bytes');
  }

  var result = ''
    , string
    , number;

  for (var index = 0; index < len; index += 2) {
    string = hexString.substr(index, 2);
    number = parseInt(string, 16);
    result += BinaryParser.fromByte(number);
  }

  return new ObjectId(result, hexString);
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @method
 * @return {boolean} return true if the value is a valid bson ObjectId, return false otherwise.
 */
ObjectId.isValid = function isValid(id) {
  if(id == null) return false;

  if(id != null && 'number' != typeof id && (id.length != 12 && id.length != 24)) {
    return false;
  } else {
    // Check specifically for hex correctness
    if(typeof id == 'string' && id.length == 24) return checkForHexRegExp.test(id);
    return true;
  }
};

/**
 * @ignore
 */
Object.defineProperty(ObjectId.prototype, "generationTime", {
  enumerable: true
  , get: function () {
    return Math.floor(BinaryParser.decodeInt(this.id.substring(0,4), 32, true, true));
  }
  , set: function (value) {
    var value = BinaryParser.encodeInt(value, 32, true, true);
    this.id = value + this.id.substr(4);
    // delete this.__id;
    this.toHexString();
  }
});

/**
 * Expose.
 */
module.exports = ObjectId;
module.exports.ObjectId = ObjectId;
}).call(this,require('_process'))
},{"../binary_parser":1,"_process":33}],31:[function(require,module,exports){
(function (process,global){
/*!
 * Module dependencies.
 */

var ObjectId = require('./types/objectid')
  , mpath = require('./mpath')
  , StorageArray
  , Document;

exports.mpath = mpath;

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `pluralize`.
 *
 */
exports.pluralization = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(kn|w|l)ife$/gi, '$1ives'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/([^a-z])$/, '$1'],
  [/$/gi, 's']
];
var rules = exports.pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `pluralize`.
 * @api public
 */
exports.uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paper',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news',
  'expertise',
  'status',
  'media'
];
var uncountables = exports.uncountables;

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

exports.pluralize = function (str) {
  var found;
  if (!~uncountables.indexOf(str.toLowerCase())){
    found = rules.filter(function(rule){
      return str.match(rule[0]);
    });
    if (found[0]) return str.replace(found[0][0], found[0][1]);
  }
  return str;
};

/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 * Modified from mongoose/utils.js
 *
 * @param {*} a a value to compare to `b`
 * @param {*} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */
exports.deepEqual = function deepEqual (a, b) {
  if (isStorageObject(a)) a = a.toObject();
  if (isStorageObject(b)) b = b.toObject();

  return _.isEqual(a, b);
};



var toString = Object.prototype.toString;

function isRegExp (o) {
  return 'object' == typeof o
      && '[object RegExp]' == toString.call(o);
}

function cloneRegExp (regexp) {
  if (!isRegExp(regexp)) {
    throw new TypeError('Not a RegExp');
  }

  var flags = [];
  if (regexp.global) flags.push('g');
  if (regexp.multiline) flags.push('m');
  if (regexp.ignoreCase) flags.push('i');
  return new RegExp(regexp.source, flags.join(''));
}

/*!
 * Object clone with Storage natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */
exports.clone = function clone (obj, options) {
  if (obj === undefined || obj === null)
    return obj;

  if ( _.isArray( obj ) ) {
    return cloneArray( obj, options );
  }

  if ( isStorageObject( obj ) ) {
    if (options && options.json && 'function' === typeof obj.toJSON) {
      return obj.toJSON( options );
    } else {
      return obj.toObject( options );
    }
  }

  if ( obj.constructor ) {
    switch ( getFunctionName( obj.constructor )) {
      case 'Object':
        return cloneObject(obj, options);
      case 'Date':
        return new obj.constructor( +obj );
      case 'RegExp':
        return cloneRegExp( obj );
      default:
        // ignore
        break;
    }
  }

  if ( obj instanceof ObjectId ) {
    return new ObjectId( obj.id );
  }

  if ( !obj.constructor && _.isObject( obj ) ) {
    // object created with Object.create(null)
    return cloneObject( obj, options );
  }

  if ( obj.valueOf ){
    return obj.valueOf();
  }
};
var clone = exports.clone;

/*!
 * ignore
 */
function cloneObject (obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder
    , minimize = options && options.minimize
    , ret = {}
    , hasKeys
    , keys
    , val
    , k
    , i;

  if ( retainKeyOrder ) {
    for (k in obj) {
      val = clone( obj[k], options );

      if ( !minimize || ('undefined' !== typeof val) ) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys( obj );
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        if (!hasKeys) hasKeys = true;
        ret[k] = val;
      }
    }
  }

  return minimize
    ? hasKeys && ret
    : ret;
}

function cloneArray (arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    ret.push( clone( arr[i], options ) );
  }
  return ret;
}

/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */
exports.merge = function merge (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key;

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      to[key] = from[key];
    } else if ( _.isObject(from[key]) ) {
      merge(to[key], from[key]);
    }
  }
};

/*!
 * Generates a random string
 *
 * @api private
 */

exports.random = function () {
  return Math.random().toString().substr(3);
};


/*!
 * Returns if `v` is a storage object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {*} v
 * @api private
 */
exports.isStorageObject = function ( v ) {
  Document || (Document = require('./document'));
  //StorageArray || (StorageArray = require('./types/array'));

  return v instanceof Document ||
       ( v && v.isStorageArray );
};
var isStorageObject = exports.isStorageObject;

/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */

exports.getValue = function (path, obj, map) {
  return mpath.get(path, obj, '_doc', map);
};

/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */

exports.setValue = function (path, val, obj, map) {
  mpath.set(path, val, obj, '_doc', map);
};

var rFunctionName = /^function\s*([^\s(]+)/;

function getFunctionName( ctor ){
  if (ctor.name) {
    return ctor.name;
  }
  return (ctor.toString().trim().match( rFunctionName ) || [])[1];
}

exports.getFunctionName = getFunctionName;

exports.setImmediate = (function() {
  // Для поддержки тестов (окружение node.js)
  if ( typeof global === 'object' && process.nextTick ) return process.nextTick;
  // Если в браузере уже реализован этот метод
  if ( window.setImmediate ) return window.setImmediate;

  var head = { }, tail = head; // очередь вызовов, 1-связный список

  var ID = Math.random(); // уникальный идентификатор

  function onmessage(e) {
    if(e.data != ID) return; // не наше сообщение
    head = head.next;
    var func = head.func;
    delete head.func;
    func();
  }

  if(window.addEventListener) { // IE9+, другие браузеры
    window.addEventListener('message', onmessage, false);
  } else { // IE8
    window.attachEvent( 'onmessage', onmessage );
  }

  return window.postMessage ? function(func) {
    tail = tail.next = { func: func };
    window.postMessage(ID, "*");
  } :
  function(func) { // IE<8
    setTimeout(func, 0);
  };
}());


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./document":3,"./mpath":13,"./types/objectid":30,"_process":33}],32:[function(require,module,exports){

/**
 * VirtualType constructor
 *
 * This is what mongoose uses to define virtual attributes via `Schema.prototype.virtual`.
 *
 * ####Example:
 *
 *     var fullname = schema.virtual('fullname');
 *     fullname instanceof mongoose.VirtualType // true
 *
 * @parma {Object} options
 * @api public
 */

function VirtualType (options, name) {
  this.path = name;
  this.getters = [];
  this.setters = [];
  this.options = options || {};
}

/**
 * Defines a getter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.get(function () {
 *       return this.name.first + ' ' + this.name.last;
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.get = function (fn) {
  this.getters.push(fn);
  return this;
};

/**
 * Defines a setter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.set(function (v) {
 *       var parts = v.split(' ');
 *       this.name.first = parts[0];
 *       this.name.last = parts[1];
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.set = function (fn) {
  this.setters.push(fn);
  return this;
};

/**
 * Applies getters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {*} the value after applying all getters
 * @api public
 */

VirtualType.prototype.applyGetters = function (value, scope) {
  var v = value;
  for (var l = this.getters.length - 1; l >= 0; l--) {
    v = this.getters[l].call(scope, v, this);
  }
  return v;
};

/**
 * Applies setters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {*} the value after applying all setters
 * @api public
 */

VirtualType.prototype.applySetters = function (value, scope) {
  var v = value;
  for (var l = this.setters.length - 1; l >= 0; l--) {
    v = this.setters[l].call(scope, v, this);
  }
  return v;
};

/*!
 * exports
 */

module.exports = VirtualType;

},{}],33:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[11])(11)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9iaW5hcnlfcGFyc2VyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9kb2N1bWVudC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL2Nhc3QuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL21lc3NhZ2VzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci9taXNzaW5nU2NoZW1hLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0b3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2V2ZW50cy5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvaW5kZXguanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2ludGVybmFsLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9tcGF0aC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9ib29sZWFuLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvZGF0ZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL21peGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvbnVtYmVyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9zdHJpbmcuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYXR5cGUuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3N0YXRlbWFjaGluZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2VtYmVkZGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi92aXJ0dWFsdHlwZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3IxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzV5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBCaW5hcnkgUGFyc2VyLlxuICogSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBodHRwOi8vanNmcm9taGVsbC5jb20vY2xhc3Nlcy9iaW5hcnktcGFyc2VyIFt2MS4wXVxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21vbmdvZGIvanMtYnNvbi9ibG9iL21hc3Rlci9saWIvYnNvbi9iaW5hcnlfcGFyc2VyLmpzXG4gKi9cbnZhciBjaHIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG52YXIgbWF4Qml0cyA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG5cdG1heEJpdHNbaV0gPSBNYXRoLnBvdygyLCBpKTtcbn1cblxuZnVuY3Rpb24gQmluYXJ5UGFyc2VyIChiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCaW5hcnlQYXJzZXIpKSByZXR1cm4gbmV3IEJpbmFyeVBhcnNlcihiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucyk7XG4gIFxuXHR0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbjtcblx0dGhpcy5hbGxvd0V4Y2VwdGlvbnMgPSBhbGxvd0V4Y2VwdGlvbnM7XG59XG5cbkJpbmFyeVBhcnNlci53YXJuID0gZnVuY3Rpb24gd2FybiAobXNnKSB7XG5cdGlmICh0aGlzLmFsbG93RXhjZXB0aW9ucykge1xuXHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cblx0cmV0dXJuIDE7XG59O1xuXG5CaW5hcnlQYXJzZXIuZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG4gIHZhciBiID0gbmV3IHRoaXMuQnVmZmVyKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuLCBkYXRhKVxuICAgICAgLCB4ID0gYi5yZWFkQml0cygwLCBiaXRzKVxuICAgICAgLCBtYXggPSBtYXhCaXRzW2JpdHNdOyAvL21heCA9IE1hdGgucG93KCAyLCBiaXRzICk7XG4gIFxuICByZXR1cm4gc2lnbmVkICYmIHggPj0gbWF4IC8gMlxuICAgICAgPyB4IC0gbWF4XG4gICAgICA6IHg7XG59O1xuXG5CaW5hcnlQYXJzZXIuZW5jb2RlSW50ID0gZnVuY3Rpb24gZW5jb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG5cdHZhciBtYXggPSBtYXhCaXRzW2JpdHNdO1xuXG4gIGlmIChkYXRhID49IG1heCB8fCBkYXRhIDwgLShtYXggLyAyKSkge1xuICAgIHRoaXMud2FybihcImVuY29kZUludDo6b3ZlcmZsb3dcIik7XG4gICAgZGF0YSA9IDA7XG4gIH1cblxuXHRpZiAoZGF0YSA8IDApIHtcbiAgICBkYXRhICs9IG1heDtcbiAgfVxuXG5cdGZvciAodmFyIHIgPSBbXTsgZGF0YTsgcltyLmxlbmd0aF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGEgJSAyNTYpLCBkYXRhID0gTWF0aC5mbG9vcihkYXRhIC8gMjU2KSk7XG5cblx0Zm9yIChiaXRzID0gLSgtYml0cyA+PiAzKSAtIHIubGVuZ3RoOyBiaXRzLS07IHJbci5sZW5ndGhdID0gXCJcXDBcIik7XG5cbiAgcmV0dXJuICgodGhpcy5iaWdFbmRpYW4gfHwgZm9yY2VCaWdFbmRpYW4pID8gci5yZXZlcnNlKCkgOiByKS5qb2luKFwiXCIpO1xufTtcblxuQmluYXJ5UGFyc2VyLnRvU21hbGwgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TbWFsbCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvQnl0ZSAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21CeXRlICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvU2hvcnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TaG9ydCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvV29yZCAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Xb3JkICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvSW50ICAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21JbnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvTG9uZyAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Mb25nICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRFdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21EV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvUVdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVFXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcblxuLyoqXG4gKiBCaW5hcnlQYXJzZXIgYnVmZmVyIGNvbnN0cnVjdG9yLlxuICovXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXJCdWZmZXIgKGJpZ0VuZGlhbiwgYnVmZmVyKSB7XG4gIHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuIHx8IDA7XG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG59XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gc2V0QnVmZmVyIChkYXRhKSB7XG4gIHZhciBsLCBpLCBiO1xuXG5cdGlmIChkYXRhKSB7XG4gICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICBiID0gdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkobCk7XG5cdFx0Zm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuXHRcdHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuXHR9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmhhc05lZWRlZEJpdHMgPSBmdW5jdGlvbiBoYXNOZWVkZWRCaXRzIChuZWVkZWRCaXRzKSB7XG5cdHJldHVybiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0gLSgtbmVlZGVkQml0cyA+PiAzKTtcbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuY2hlY2tCdWZmZXIgPSBmdW5jdGlvbiBjaGVja0J1ZmZlciAobmVlZGVkQml0cykge1xuXHRpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcImNoZWNrQnVmZmVyOjptaXNzaW5nIGJ5dGVzXCIpO1xuICB9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnJlYWRCaXRzID0gZnVuY3Rpb24gcmVhZEJpdHMgKHN0YXJ0LCBsZW5ndGgpIHtcblx0Ly9zaGwgZml4OiBIZW5yaSBUb3JnZW1hbmUgfjE5OTYgKGNvbXByZXNzZWQgYnkgSm9uYXMgUmFvbmkpXG5cblx0ZnVuY3Rpb24gc2hsIChhLCBiKSB7XG5cdFx0Zm9yICg7IGItLTsgYSA9ICgoYSAlPSAweDdmZmZmZmZmICsgMSkgJiAweDQwMDAwMDAwKSA9PSAweDQwMDAwMDAwID8gYSAqIDIgOiAoYSAtIDB4NDAwMDAwMDApICogMiArIDB4N2ZmZmZmZmYgKyAxKTtcblx0XHRyZXR1cm4gYTtcblx0fVxuXG5cdGlmIChzdGFydCA8IDAgfHwgbGVuZ3RoIDw9IDApIHtcblx0XHRyZXR1cm4gMDtcbiAgfVxuXG5cdHRoaXMuY2hlY2tCdWZmZXIoc3RhcnQgKyBsZW5ndGgpO1xuXG4gIHZhciBvZmZzZXRMZWZ0XG4gICAgLCBvZmZzZXRSaWdodCA9IHN0YXJ0ICUgOFxuICAgICwgY3VyQnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtICggc3RhcnQgPj4gMyApIC0gMVxuICAgICwgbGFzdEJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggKyAoIC0oIHN0YXJ0ICsgbGVuZ3RoICkgPj4gMyApXG4gICAgLCBkaWZmID0gY3VyQnl0ZSAtIGxhc3RCeXRlXG4gICAgLCBzdW0gPSAoKHRoaXMuYnVmZmVyWyBjdXJCeXRlIF0gPj4gb2Zmc2V0UmlnaHQpICYgKCgxIDw8IChkaWZmID8gOCAtIG9mZnNldFJpZ2h0IDogbGVuZ3RoKSkgLSAxKSkgKyAoZGlmZiAmJiAob2Zmc2V0TGVmdCA9IChzdGFydCArIGxlbmd0aCkgJSA4KSA/ICh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSAmICgoMSA8PCBvZmZzZXRMZWZ0KSAtIDEpKSA8PCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQgOiAwKTtcblxuXHRmb3IoOyBkaWZmOyBzdW0gKz0gc2hsKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdLCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQpKTtcblxuXHRyZXR1cm4gc3VtO1xufTtcblxuLyoqXG4gKiBFeHBvc2UuXG4gKi9cbkJpbmFyeVBhcnNlci5CdWZmZXIgPSBCaW5hcnlQYXJzZXJCdWZmZXI7XG5cbmV4cG9ydHMuQmluYXJ5UGFyc2VyID0gQmluYXJ5UGFyc2VyO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50Jyk7XG5cbi8vVE9ETzog0L3QsNC/0LjRgdCw0YLRjCDQvNC10YLQvtC0IC51cHNlcnQoIGRvYyApIC0g0L7QsdC90L7QstC70LXQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwLCDQsCDQtdGB0LvQuCDQtdCz0L4g0L3QtdGCLCDRgtC+INGB0L7Qt9C00LDQvdC40LVcblxuLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC70L7Qs9C40LrRgyDRgSBhcGlSZXNvdXJjZSAo0YHQvtGF0YDQsNC90Y/RgtGMINGB0YHRi9C70LrRgyDQvdCwINC90LXQs9C+INC4INC40YHQv9C+0LvRjNC30L7QstGC0Ywg0L/RgNC4INC80LXRgtC+0LTQtSBkb2Muc2F2ZSlcbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC4XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0KHRhdC10LzQsCDQuNC70Lgg0L7QsdGK0LXQutGCINC+0L/QuNGB0LDQvdC40Y8g0YHRhdC10LzRi1xuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICAvLyDQodC+0YXRgNCw0L3QuNC8INC90LDQt9Cy0LDQvdC40LUg0L/RgNC+0YHRgtGA0LDQvdGB0YLQstCwINC40LzRkdC9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgdGhpcy5kb2N1bWVudHMgPSB7fTtcblxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDRgdGB0YvQu9C60YMg0L3QsCBhcGkg0LTQu9GPINC80LXRgtC+0LTQsCAuc2F2ZSgpXG4gIHRoaXMuYXBpID0gYXBpO1xuXG4gIC8vINCY0YHQv9C+0LvRjNC30YPQtdC80LDRjyDRgdGF0LXQvNCwINC00LvRjyDQutC+0LvQu9C10LrRhtC40LhcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8g0J7RgtC+0LHRgNCw0LbQtdC90LjQtSDQvtCx0YrQtdC60YLQsCBkb2N1bWVudHMg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAgKNC00LvRjyDQvdC+0LrQsNGD0YLQsClcbiAgdGhpcy5hcnJheSA9IFtdO1xuICAvLyDQndGD0LbQvdC+INC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDQv9GA0LjQstGP0LfQvtC6INC6INGN0YLQvtC80YMg0YHQstC+0LnRgdGC0LLRgyDQtNC70Y8ga25vY2tvdXRqc1xuICB3aW5kb3cua28gJiYga28udHJhY2soIHRoaXMsIFsnYXJyYXknXSApO1xufVxuXG5Db2xsZWN0aW9uLnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgdHlwZTogJ2plbGx5IGJlYW4nIH0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKFt7IHR5cGU6ICdqZWxseSBiZWFuJyB9LCB7IHR5cGU6ICdzbmlja2VycycgfV0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgX2lkOiAnKioqKionLCB0eXBlOiAnamVsbHkgYmVhbicgfSwgdHJ1ZSk7XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fEFycmF5LjxvYmplY3Q+fSBbZG9jXSAtINCU0L7QutGD0LzQtdC90YJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINC/0YDQuCDQt9Cw0L/RgNC+0YHQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+INCyINC00L7QutGD0LzQtdC90YLQtSlcbiAgICogQHBhcmFtIHtib29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtfc3RvcmFnZVdpbGxNdXRhdGVdIC0g0KTQu9Cw0LMg0LTQvtCx0LDQstC70LXQvdC40Y8g0LzQsNGB0YHQuNCy0LAg0LTQvtC60YPQvNC10L3RgtC+0LIuINGC0L7Qu9GM0LrQviDQtNC70Y8g0LLQvdGD0YLRgNC10L3QvdC10LPQviDQuNGB0L/QvtC70YzQt9C+0LLQsNC90LjRj1xuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHxBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKCBkb2MsIGZpZWxkcywgaW5pdCwgX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgtCwINC90LXRgiwg0LfQvdCw0YfQuNGCINCx0YPQtNC10YIg0L/Rg9GB0YLQvtC5XG4gICAgaWYgKCBkb2MgPT0gbnVsbCApIGRvYyA9IG51bGw7XG5cbiAgICAvLyDQnNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgICBpZiAoIF8uaXNBcnJheSggZG9jICkgKXtcbiAgICAgIHZhciBzYXZlZERvY3MgPSBbXTtcblxuICAgICAgXy5lYWNoKCBkb2MsIGZ1bmN0aW9uKCBkb2MgKXtcbiAgICAgICAgc2F2ZWREb2NzLnB1c2goIHNlbGYuYWRkKCBkb2MsIGZpZWxkcywgaW5pdCwgdHJ1ZSApICk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xuXG4gICAgICByZXR1cm4gc2F2ZWREb2NzO1xuICAgIH1cblxuICAgIHZhciBpZCA9IGRvYyAmJiBkb2MuX2lkO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgiDRg9C20LUg0LXRgdGC0YwsINGC0L4g0L/RgNC+0YHRgtC+INGD0YHRgtCw0L3QvtCy0LjRgtGMINC30L3QsNGH0LXQvdC40Y9cbiAgICBpZiAoIGlkICYmIHRoaXMuZG9jdW1lbnRzWyBpZCBdICl7XG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXS5zZXQoIGRvYyApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXNjcmltaW5hdG9yTWFwcGluZyA9IHRoaXMuc2NoZW1hXG4gICAgICAgID8gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmdcbiAgICAgICAgOiBudWxsO1xuXG4gICAgICB2YXIga2V5ID0gZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290XG4gICAgICAgID8gZGlzY3JpbWluYXRvck1hcHBpbmcua2V5XG4gICAgICAgIDogbnVsbDtcblxuICAgICAgLy8g0JLRi9Cx0LjRgNCw0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQtdGB0YLRjCDQtNC40YHQutGA0LjQvNC40L3QsNGC0L7RgFxuICAgICAgdmFyIHNjaGVtYTtcbiAgICAgIGlmIChrZXkgJiYgZG9jICYmIGRvY1trZXldICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzW2RvY1trZXldXSkge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmV3RG9jID0gbmV3IERvY3VtZW50KCBkb2MsIHRoaXMubmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKTtcbiAgICAgIGlkID0gbmV3RG9jLl9pZC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIC8vINCU0LvRjyDQvtC00LjQvdC+0YfQvdGL0YUg0LTQvtC60YPQvNC10L3RgtC+0LIg0YLQvtC20LUg0L3Rg9C20L3QviAg0LLRi9C30LLQsNGC0Ywgc3RvcmFnZUhhc011dGF0ZWRcbiAgICBpZiAoICFfc3RvcmFnZVdpbGxNdXRhdGUgKXtcbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kb2N1bWVudHNbIGlkIF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCj0LTQsNC70LXQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24ucmVtb3ZlKCBEb2N1bWVudCApO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24ucmVtb3ZlKCB1dWlkICk7XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fG51bWJlcn0gZG9jdW1lbnQgLSDQodCw0Lwg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LXQs9C+IGlkLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oIGRvY3VtZW50ICl7XG4gICAgcmV0dXJuIGRlbGV0ZSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgtGLLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBuYW1lZCBqb2huXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgbmFtZTogJ2pvaG4nIH0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IGF1dGhvcjogJ1NoYWtlc3BlYXJlJywgeWVhcjogMTYxMSB9KTtcbiAgICpcbiAgICogQHBhcmFtIGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge0FycmF5LjxzdG9yYWdlLkRvY3VtZW50Pn1cbiAgICovXG4gIGZpbmQ6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8ud2hlcmUoIHRoaXMuZG9jdW1lbnRzLCBjb25kaXRpb25zICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWQoIGlkICk7XG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWQ6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICByZXR1cm4gdGhpcy5kb2N1bWVudHNbIF9pZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4gaWQg0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kQnlJZEFuZFJlbW92ZSggaWQgKSAvLyByZXR1cm5zINGBb2xsZWN0aW9uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gICAqL1xuICBmaW5kQnlJZEFuZFJlbW92ZTogZnVuY3Rpb24oIF9pZCApe1xuICAgIHRoaXMucmVtb3ZlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSApO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4gaWQg0LTQvtC60YPQvNC10L3RgiDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRCeUlkXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kQnlJZEFuZFVwZGF0ZTogZnVuY3Rpb24oIF9pZCwgcGF0aCwgdmFsdWUgKXtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoIHRoaXMuZmluZEJ5SWQoIF9pZCApLCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIGZpbmQgb25lIGlwaG9uZSBhZHZlbnR1cmVzXG4gICAqIHN0b3JhZ2UuYWR2ZW50dXJlLmZpbmRPbmUoeyB0eXBlOiAnaXBob25lJyB9KTtcbiAgICpcbiAgICogQHBhcmFtIGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICByZXR1cm4gXy5maW5kV2hlcmUoIHRoaXMuZG9jdW1lbnRzLCBjb25kaXRpb25zICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviDRg9GB0LvQvtCy0LjRjiDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCINC4INGD0LTQsNC70LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRPbmVBbmRSZW1vdmUoIGNvbmRpdGlvbnMgKSAvLyByZXR1cm5zINGBb2xsZWN0aW9uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gICAqL1xuICBmaW5kT25lQW5kUmVtb3ZlOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHRoaXMucmVtb3ZlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSApO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviDRg9GB0LvQvtCy0LjRjiDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRPbmVcbiAgICogQHNlZSBDb2xsZWN0aW9uLnVwZGF0ZVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZGl0aW9uc1xuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kT25lQW5kVXBkYXRlOiBmdW5jdGlvbiggY29uZGl0aW9ucywgcGF0aCwgdmFsdWUgKXtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoIHRoaXMuZmluZE9uZSggY29uZGl0aW9ucyApLCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0L3QvtCy0LjRgtGMINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UucGxhY2VzLnVwZGF0ZSggc3RvcmFnZS5wbGFjZXMuZmluZEJ5SWQoIDAgKSwge1xuICAgKiAgIG5hbWU6ICdJcmt1dHNrJ1xuICAgKiB9KTtcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ8b2JqZWN0fSBkb2N1bWVudFxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHxCb29sZWFufVxuICAgKi9cbiAgdXBkYXRlOiBmdW5jdGlvbiggZG9jdW1lbnQsIHBhdGgsIHZhbHVlICl7XG4gICAgdmFyIGRvYyA9IHRoaXMuZG9jdW1lbnRzWyBkb2N1bWVudC5faWQgfHwgZG9jdW1lbnQgXTtcblxuICAgIGlmICggZG9jID09IG51bGwgKXtcbiAgICAgIGNvbnNvbGUud2Fybignc3RvcmFnZTo6dXBkYXRlOiBEb2N1bWVudCBpcyBub3QgZm91bmQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvYy5zZXQoIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC90LAg0LjQt9C80LXQvdC10L3QuNGPICjQtNC+0LHQsNCy0LvQtdC90LjQtSwg0YPQtNCw0LvQtdC90LjQtSkg0LTQsNC90L3Ri9GFINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgKi9cbiAgc3RvcmFnZUhhc011dGF0ZWQ6IGZ1bmN0aW9uKCl7XG4gICAgLy8g0J7QsdC90L7QstC40Lwg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyICjRgdC/0LXRhtC40LDQu9GM0L3QvtC1INC+0YLQvtCx0YDQsNC20LXQvdC40LUg0LTQu9GPINC/0LXRgNC10LHQvtGA0LAg0L3QvtC60LDRg9GC0L7QvClcbiAgICB0aGlzLmFycmF5ID0gXy50b0FycmF5KCB0aGlzLmRvY3VtZW50cyApO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuICAsIE1peGVkU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEvbWl4ZWQnKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIFZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJykuVmFsaWRhdG9yRXJyb3JcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIGNsb25lID0gdXRpbHMuY2xvbmVcbiAgLCBWYWxpZGF0aW9uRXJyb3IgPSBTdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yXG4gICwgSW50ZXJuYWxDYWNoZSA9IHJlcXVpcmUoJy4vaW50ZXJuYWwnKVxuICAsIGRlZXBFcXVhbCA9IHV0aWxzLmRlZXBFcXVhbFxuICAsIERvY3VtZW50QXJyYXlcbiAgLCBTY2hlbWFBcnJheVxuICAsIEVtYmVkZGVkO1xuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LTQvtC60YPQvNC10L3RgtCwLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0g0LfQvdCw0YfQtdC90LjRjywg0LrQvtGC0L7RgNGL0LUg0L3Rg9C20L3QviDRg9GB0YLQsNC90L7QstC40YLRjFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY29sbGVjdGlvbk5hbWVdIC0g0LrQvtC70LvQtdC60YbQuNGPINCyINC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0L3QsNGF0L7QtNC40YLRgdGPINC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDRgdGF0LXQvNCwINC/0L4g0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDRgdC+0LfQtNCw0L0g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+KVxuICogQHBhcmFtIHtCb29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERvY3VtZW50ICggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICl7XG4gIHRoaXMuJF9fID0gbmV3IEludGVybmFsQ2FjaGU7XG4gIHRoaXMuaXNOZXcgPSB0cnVlO1xuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQodHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgZGF0YSApe1xuICAgIGluaXQgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1XG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG5cbiAgICBpZiAoIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IHsgX2lkOiBuZXcgT2JqZWN0SWQoKSB9O1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hIHx8IHNjaGVtYTtcbiAgICAvLyDQodCz0LXQvdC10YDQuNGA0L7QstCw0YLRjCBPYmplY3RJZCwg0LXRgdC70Lgg0L7QvSDQvtGC0YHRg9GC0YHRgtCy0YPQtdGCLCDQvdC+INC10LPQviDRgtGA0LXQsdGD0LXRgiDRgdGF0LXQvNCwXG4gICAgaWYgKCAhdGhpcy5zY2hlbWEgJiYgc2NoZW1hLm9wdGlvbnMuX2lkICl7XG4gICAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgICAgaWYgKCBkYXRhLl9pZCA9PT0gdW5kZWZpbmVkICl7XG4gICAgICAgIGRhdGEuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCAhc2NoZW1hICl7XG4gICAgdGhyb3cgbmV3IFN0b3JhZ2VFcnJvci5NaXNzaW5nU2NoZW1hRXJyb3IoKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEg0YTQu9Cw0LPQvtC8IGluaXRcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh7IHRlc3Q6ICdib29tJyB9LCB0cnVlKTtcbiAgaWYgKCAnYm9vbGVhbicgPT09IHR5cGVvZiBjb2xsZWN0aW9uTmFtZSApe1xuICAgIGluaXQgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEgc3RyaWN0OiB0cnVlXG4gIC8vIGNvbGxlY3Rpb24uYWRkKHsuLi59LCB0cnVlKTtcbiAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIGZpZWxkcykge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBmaWVsZHM7XG4gICAgZmllbGRzID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBzY2hlbWEub3B0aW9ucyAmJiBzY2hlbWEub3B0aW9ucy5zdHJpY3Q7XG4gICAgdGhpcy4kX18uc2VsZWN0ZWQgPSBmaWVsZHM7XG4gIH1cblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdGhpcy5jb2xsZWN0aW9uID0gd2luZG93LnN0b3JhZ2VbIGNvbGxlY3Rpb25OYW1lIF07XG4gIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcblxuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIGlmICggZGF0YSA9PSBudWxsIHx8ICFkYXRhLl9pZCApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0JTQu9GPINC/0L7QvNC10YnQtdC90LjRjyDQsiDQutC+0LvQu9C10LrRhtC40Y4g0L3QtdC+0LHRhdC+0LTQuNC80L4sINGH0YLQvtCx0Ysg0YMg0LTQvtC60YPQvNC10L3RgtCwINCx0YvQuyBfaWQnKTtcbiAgICB9XG4gICAgLy8g0J/QvtC80LXRgdGC0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LIg0LrQvtC70LvQtdC60YbQuNGOXG4gICAgdGhpcy5jb2xsZWN0aW9uLmRvY3VtZW50c1sgZGF0YS5faWQgXSA9IHRoaXM7XG4gIH1cblxuICB2YXIgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWRQYXRocygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcXVpcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgdGhpcy4kX18uYWN0aXZlUGF0aHMucmVxdWlyZSggcmVxdWlyZWRbaV0gKTtcbiAgfVxuXG4gIHRoaXMuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICB0aGlzLl9kb2MgPSB0aGlzLiRfX2J1aWxkRG9jKCBkYXRhLCBpbml0ICk7XG5cbiAgaWYgKCBpbml0ICl7XG4gICAgdGhpcy5pbml0KCBkYXRhICk7XG4gIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgdGhpcy5zZXQoIGRhdGEsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICB9XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKCB2YXIgbSBpbiBzY2hlbWEubWV0aG9kcyApe1xuICAgIHRoaXNbIG0gXSA9IHNjaGVtYS5tZXRob2RzWyBtIF07XG4gIH1cbiAgLy8gYXBwbHkgc3RhdGljc1xuICBmb3IgKCB2YXIgcyBpbiBzY2hlbWEuc3RhdGljcyApe1xuICAgIHRoaXNbIHMgXSA9IHNjaGVtYS5zdGF0aWNzWyBzIF07XG4gIH1cbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIGRvY3VtZW50cyBzY2hlbWEuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBzY2hlbWFcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNjaGVtYTtcblxuLyoqXG4gKiBCb29sZWFuIGZsYWcgc3BlY2lmeWluZyBpZiB0aGUgZG9jdW1lbnQgaXMgbmV3LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgaXNOZXdcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTmV3O1xuXG4vKipcbiAqIFRoZSBzdHJpbmcgdmVyc2lvbiBvZiB0aGlzIGRvY3VtZW50cyBfaWQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBnZXR0ZXIgZXhpc3RzIG9uIGFsbCBkb2N1bWVudHMgYnkgZGVmYXVsdC4gVGhlIGdldHRlciBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyB0aGUgYGlkYCBbb3B0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2lkKSBvZiBpdHMgYFNjaGVtYWAgdG8gZmFsc2UgYXQgY29uc3RydWN0aW9uIHRpbWUuXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBpZDogZmFsc2UgfSk7XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgU2NoZW1hIG9wdGlvbnMgL2RvY3MvZ3VpZGUuaHRtbCNvcHRpb25zXG4gKiBAcHJvcGVydHkgaWRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlkO1xuXG4vKipcbiAqIEhhc2ggY29udGFpbmluZyBjdXJyZW50IHZhbGlkYXRpb24gZXJyb3JzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgZXJyb3JzXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lcnJvcnM7XG5cbkRvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSB7XG4gIGRvY3VtZW50RGVmaW5lUHJvcGVydHk6ICQubm9vcCxcbiAgZG9jdW1lbnRTZXRJbml0aWFsVmFsdWU6ICQubm9vcCxcbiAgZG9jdW1lbnRHZXRWYWx1ZTogJC5ub29wLFxuICBkb2N1bWVudFNldFZhbHVlOiAkLm5vb3Bcbn07XG5cbi8qKlxuICogQnVpbGRzIHRoZSBkZWZhdWx0IGRvYyBzdHJ1Y3R1cmVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtza2lwSWRdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fYnVpbGREb2NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fYnVpbGREb2MgPSBmdW5jdGlvbiAoIG9iaiwgc2tpcElkICkge1xuICB2YXIgZG9jID0ge31cbiAgICAsIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09IHAgKSB7XG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xuICAgICAgaWYgKCBvYmogJiYgJ19pZCcgaW4gb2JqICkgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcbiAgICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvYztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRvY3VtZW50IHdpdGhvdXQgc2V0dGVycyBvciBtYXJraW5nIGFueXRoaW5nIG1vZGlmaWVkLlxuICpcbiAqIENhbGxlZCBpbnRlcm5hbGx5IGFmdGVyIGEgZG9jdW1lbnQgaXMgcmV0dXJuZWQgZnJvbSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XG4gIHRoaXMuaXNOZXcgPSBmYWxzZTtcblxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcbiAgLy8gaGFuZGxlIGRvY3Mgd2l0aCBwb3B1bGF0ZWQgcGF0aHNcbiAgLyppZiAoIGRvYy5faWQgJiYgb3B0cyAmJiBvcHRzLnBvcHVsYXRlZCAmJiBvcHRzLnBvcHVsYXRlZC5sZW5ndGggKSB7XG4gICAgdmFyIGlkID0gU3RyaW5nKCBkb2MuX2lkICk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLnBvcHVsYXRlZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGl0ZW0gPSBvcHRzLnBvcHVsYXRlZFsgaSBdO1xuICAgICAgdGhpcy5wb3B1bGF0ZWQoIGl0ZW0ucGF0aCwgaXRlbS5fZG9jc1tpZF0sIGl0ZW0gKTtcbiAgICB9XG4gIH0qL1xuXG4gIGluaXQoIHRoaXMsIGRhdGEsIHRoaXMuX2RvYyApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyohXG4gKiBJbml0IGhlbHBlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9iaiByYXcgc2VydmVyIGRvY1xuICogQHBhcmFtIHtPYmplY3R9IGRvYyBvYmplY3Qgd2UgYXJlIGluaXRpYWxpemluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXQgKHNlbGYsIG9iaiwgZG9jLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAsIHNjaGVtYVxuICAgICwgcGF0aFxuICAgICwgaTtcblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICBpID0ga2V5c1tsZW5dO1xuICAgIHBhdGggPSBwcmVmaXggKyBpO1xuICAgIHNjaGVtYSA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG5cbiAgICBpZiAoIXNjaGVtYSAmJiBfLmlzUGxhaW5PYmplY3QoIG9ialsgaSBdICkgJiZcbiAgICAgICAgKCFvYmpbaV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtpXS5jb25zdHJ1Y3RvcikpKSB7XG4gICAgICAvLyBhc3N1bWUgbmVzdGVkIG9iamVjdFxuICAgICAgaWYgKCFkb2NbaV0pIGRvY1tpXSA9IHt9O1xuICAgICAgaW5pdChzZWxmLCBvYmpbaV0sIGRvY1tpXSwgcGF0aCArICcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbaV0gPT09IG51bGwpIHtcbiAgICAgICAgZG9jW2ldID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAob2JqW2ldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgIHNlbGYuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkb2NbaV0gPSBzY2hlbWEuY2FzdChvYmpbaV0sIHNlbGYsIHRydWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvY1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0SW5pdGlhbFZhbHVlLmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIGRvY1tpXSApO1xuICAgICAgfVxuICAgICAgLy8gbWFyayBhcyBoeWRyYXRlZFxuICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuaW5pdChwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHBhdGgsIG9yIG1hbnkgcGF0aHMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIC8vIHBhdGgsIHZhbHVlXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSlcbiAqXG4gKiAgICAgLy8gb2JqZWN0XG4gKiAgICAgZG9jLnNldCh7XG4gKiAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICwgcGF0aDIgOiB7XG4gKiAgICAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICAgfVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIG51bWJlclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIE51bWJlcilcbiAqXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gc3RyaW5nXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgU3RyaW5nKVxuICpcbiAqICAgICAvLyBjaGFuZ2luZyBzdHJpY3QgbW9kZSBiZWhhdmlvclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIHsgc3RyaWN0OiBmYWxzZSB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhdGggcGF0aCBvciBvYmplY3Qgb2Yga2V5L3ZhbHMgdG8gc2V0XG4gKiBAcGFyYW0ge01peGVkfSB2YWwgdGhlIHZhbHVlIHRvIHNldFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcnxldGMuLn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIFwib24tdGhlLWZseVwiIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWxseSBzcGVjaWZ5IG9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGJlaGF2aW9yIG9mIHRoZSBzZXRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCB0eXBlLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlLmNvbnN0cnVjdG9yKSkge1xuICAgIG9wdGlvbnMgPSB0eXBlO1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcbiAgICAsIGFkaG9jID0gdHlwZSAmJiB0cnVlICE9PSB0eXBlXG4gICAgLCBjb25zdHJ1Y3RpbmcgPSB0cnVlID09PSB0eXBlXG4gICAgLCBhZGhvY3M7XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMgJiYgJ3N0cmljdCcgaW4gb3B0aW9uc1xuICAgID8gb3B0aW9ucy5zdHJpY3RcbiAgICA6IHRoaXMuJF9fLnN0cmljdE1vZGU7XG5cbiAgaWYgKGFkaG9jKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgcGF0aCkge1xuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXG5cbiAgICBpZiAobnVsbCA9PT0gcGF0aCB8fCB1bmRlZmluZWQgPT09IHBhdGgpIHtcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XG4gICAgICBwYXRoID0gdmFsO1xuICAgICAgdmFsID0gX3RlbXA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHByZWZpeCA9IHZhbFxuICAgICAgICA/IHZhbCArICcuJ1xuICAgICAgICA6ICcnO1xuXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGgpXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgICAgICwgcGF0aHR5cGVcbiAgICAgICAgLCBrZXk7XG5cblxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBwYXRodHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHByZWZpeCArIGtleSk7XG4gICAgICAgIGlmIChudWxsICE9IHBhdGhba2V5XVxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXG4gICAgICAgICAgICAmJiBfLmlzUGxhaW5PYmplY3QocGF0aFtrZXldKVxuICAgICAgICAgICAgJiYgKCAhcGF0aFtrZXldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShwYXRoW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPSBwYXRodHlwZVxuICAgICAgICAgICAgJiYgISggdGhpcy4kX19wYXRoKCBwcmVmaXggKyBrZXkgKSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hIClcbiAgICAgICAgICAgICYmICEoIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0gJiYgdGhpcy5zY2hlbWEucGF0aHNba2V5XS5vcHRpb25zLnJlZiApXG4gICAgICAgICAgKXtcblxuICAgICAgICAgIHRoaXMuc2V0KHBhdGhba2V5XSwgcHJlZml4ICsga2V5LCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgaWYgKCdyZWFsJyA9PT0gcGF0aHR5cGUgfHwgJ3ZpcnR1YWwnID09PSBwYXRodHlwZSkge1xuICAgICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG5cbiAgICAgICAgICB9IGVsc2UgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBrZXkgKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkICE9PSBwYXRoW2tleV0pIHtcbiAgICAgICAgICB0aGlzLnNldChwcmVmaXggKyBrZXksIHBhdGhba2V5XSwgY29uc3RydWN0aW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICAvLyBlbnN1cmUgX3N0cmljdCBpcyBob25vcmVkIGZvciBvYmogcHJvcHNcbiAgLy8gZG9jc2NoZW1hID0gbmV3IFNjaGVtYSh7IHBhdGg6IHsgbmVzdDogJ3N0cmluZycgfX0pXG4gIC8vIGRvYy5zZXQoJ3BhdGgnLCBvYmopO1xuICB2YXIgcGF0aFR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwYXRoKTtcbiAgaWYgKCduZXN0ZWQnID09IHBhdGhUeXBlICYmIHZhbCAmJiBfLmlzUGxhaW5PYmplY3QodmFsKSAmJlxuICAgICAgKCF2YWwuY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHZhbC5jb25zdHJ1Y3RvcikpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT0gcGF0aFR5cGUgJiYgc3RyaWN0KSB7XG5cbiAgICAvLyBjaGVjayBmb3Igcm9vdHMgdGhhdCBhcmUgTWl4ZWQgdHlwZXNcbiAgICB2YXIgbWl4ZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSsxKS5qb2luKCcuJyk7XG4gICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICAgICAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hKSB7XG4gICAgICAgIC8vIGFsbG93IGNoYW5nZXMgdG8gc3ViIHBhdGhzIG9mIG1peGVkIHR5cGVzXG4gICAgICAgIG1peGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtaXhlZCkge1xuICAgICAgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpZWxkIGBcIiArIHBhdGggKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgfSBlbHNlIGlmICgndmlydHVhbCcgPT0gcGF0aFR5cGUpIHtcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKTtcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xuICB9XG5cbiAgdmFyIHBhdGhUb01hcms7XG5cbiAgLy8gV2hlbiB1c2luZyB0aGUgJHNldCBvcGVyYXRvciB0aGUgcGF0aCB0byB0aGUgZmllbGQgbXVzdCBhbHJlYWR5IGV4aXN0LlxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxuXG4gIGlmIChwYXJ0cy5sZW5ndGggPD0gMSkge1xuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9IGVsc2Uge1xuICAgIGZvciAoIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcbiAgICAgIGlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQoc3VicGF0aCkgLy8gZWFybGllciBwcmVmaXhlcyB0aGF0IGFyZSBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmtlZCBhcyBkaXJ0eSBoYXZlIHByZWNlZGVuY2VcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xuICAgICAgICBwYXRoVG9NYXJrID0gc3VicGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfVxuXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXG4gIHZhciBwcmlvclZhbCA9IGNvbnN0cnVjdGluZ1xuICAgID8gdW5kZWZpbmVkXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xuXG4gIGlmICghc2NoZW1hIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNob3VsZFNldCA9IHRoaXMuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XG4gIH0pO1xuXG4gIGlmIChzaG91bGRTZXQpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSBzaG91bGQgbWFyayB0aGlzIGNoYW5nZSBhcyBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXG4gICAgcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKSB7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xuXG4gIGlmICggdW5kZWZpbmVkID09PSB2YWwgJiYgIXRoaXMuaXNTZWxlY3RlZChwYXRoKSApIHtcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcbiAgICAvLyB2YWx1ZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IHZhbCAmJiBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSB7XG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF1dGlscy5kZWVwRXF1YWwodmFsLCBwcmlvclZhbCB8fCB0aGlzLmdldChwYXRoKSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8v0YLQtdGB0YIg0L3QtSDQv9GA0L7RhdC+0LTQuNGCINC40Lct0LfQsCDQvdCw0LvQuNGH0LjRjyDQu9C40YjQvdC10LPQviDQv9C+0LvRjyDQsiBzdGF0ZXMuZGVmYXVsdCAoY29tbWVudHMpXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XG4gIC8vY29uc29sZS5pbmZvKCBwYXRoLCBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICk7XG4gIC8vY29uc29sZS5sb2coIHRoaXMuJF9fLmFjdGl2ZVBhdGhzICk7XG5cbiAgLy8g0JrQvtCz0LTQsCDQvNGLINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INGC0LDQutC+0LUg0LbQtSDQt9C90LDRh9C10L3QuNC1INC60LDQuiBkZWZhdWx0XG4gIC8vINCd0LUg0L/QvtC90Y/RgtC90L4g0LfQsNGH0LXQvCDQvNCw0L3Qs9GD0YHRgiDQtdCz0L4g0L7QsdC90L7QstC70Y/Qu1xuICAvKmlmICghY29uc3RydWN0aW5nICYmXG4gICAgICBudWxsICE9IHZhbCAmJlxuICAgICAgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCAmJlxuICAgICAgdXRpbHMuZGVlcEVxdWFsKHZhbCwgc2NoZW1hLmdldERlZmF1bHQodGhpcywgY29uc3RydWN0aW5nKSkgKSB7XG5cbiAgICAvL2NvbnNvbGUubG9nKCBwYXRoVG9NYXJrLCB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5ICk7XG5cbiAgICAvLyBhIHBhdGggd2l0aCBhIGRlZmF1bHQgd2FzICR1bnNldCBvbiB0aGUgc2VydmVyXG4gICAgLy8gYW5kIHRoZSB1c2VyIGlzIHNldHRpbmcgaXQgdG8gdGhlIHNhbWUgdmFsdWUgYWdhaW5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSovXG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBhY3R1YWwgc2V0dGluZyBvZiB0aGUgdmFsdWUgYW5kIG1hcmtpbmcgdGhlIHBhdGggbW9kaWZpZWQgaWYgYXBwcm9wcmlhdGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXQgPSBmdW5jdGlvbiAoIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCApIHtcbiAgdmFyIHNob3VsZE1vZGlmeSA9IHRoaXMuJF9fc2hvdWxkTW9kaWZ5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKHNob3VsZE1vZGlmeSkge1xuICAgIHRoaXMubWFya01vZGlmaWVkKHBhdGhUb01hcmssIHZhbCk7XG4gIH1cblxuICB2YXIgb2JqID0gdGhpcy5fZG9jXG4gICAgLCBpID0gMFxuICAgICwgbCA9IHBhcnRzLmxlbmd0aDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaSArIDFcbiAgICAgICwgbGFzdCA9IG5leHQgPT09IGw7XG5cbiAgICBpZiAoIGxhc3QgKSB7XG4gICAgICBvYmpbcGFydHNbaV1dID0gdmFsO1xuXG4gICAgICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGgsIHZhbCApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbcGFydHNbaV1dICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmICdFbWJlZGRlZERvY3VtZW50JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IpICkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgQXJyYXkuaXNBcnJheShvYmpbcGFydHNbaV1dKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSByYXcgdmFsdWUgZnJvbSBhIHBhdGggKG5vIGdldHRlcnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUocGF0aCwgdGhpcy5fZG9jKTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJhdyB2YWx1ZSBmb3IgYSBwYXRoIChubyBjYXN0aW5nLCBzZXR0ZXJzLCB0cmFuc2Zvcm1hdGlvbnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWx1ZSkge1xuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGEgcGF0aC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBwYXRoXG4gKiAgICAgZG9jLmdldCgnYWdlJykgLy8gNDdcbiAqXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXG4gKiAgICAgZG9jLmdldCgnYWdlJywgU3RyaW5nKSAvLyBcIjQ3XCJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIG9uLXRoZS1mbHkgYXR0cmlidXRlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoLCB0eXBlKSB7XG4gIHZhciBhZGhvY3M7XG4gIGlmICh0eXBlKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgdmFyIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKSB8fCB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKVxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgLCBvYmogPSB0aGlzLl9kb2M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkID09PSBvYmogfHwgbnVsbCA9PT0gb2JqXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcbiAgfVxuXG4gIGlmIChzY2hlbWEpIHtcbiAgICBvYmogPSBzY2hlbWEuYXBwbHlHZXR0ZXJzKG9iaiwgdGhpcyk7XG4gIH1cblxuICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudEdldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGggKTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzY2hlbWF0eXBlIGZvciB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHNcbiAgICAsIGFkaG9jVHlwZSA9IGFkaG9jcyAmJiBhZGhvY3NbcGF0aF07XG5cbiAgaWYgKGFkaG9jVHlwZSkge1xuICAgIHJldHVybiBhZGhvY1R5cGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgdGhlIHBhdGggYXMgaGF2aW5nIHBlbmRpbmcgY2hhbmdlcyB0byB3cml0ZSB0byB0aGUgZGIuXG4gKlxuICogX1ZlcnkgaGVscGZ1bCB3aGVuIHVzaW5nIFtNaXhlZF0oLi9zY2hlbWF0eXBlcy5odG1sI21peGVkKSB0eXBlcy5fXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZXMgdG8gbWl4ZWQudHlwZSBhcmUgbm93IHBlcnNpc3RlZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIG1hcmsgbW9kaWZpZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG59O1xuXG4vKipcbiAqIENhdGNoZXMgZXJyb3JzIHRoYXQgb2NjdXIgZHVyaW5nIGV4ZWN1dGlvbiBvZiBgZm5gIGFuZCBzdG9yZXMgdGhlbSB0byBsYXRlciBiZSBwYXNzZWQgd2hlbiBgc2F2ZSgpYCBpcyBleGVjdXRlZC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXSB0aGUgc2NvcGUgd2l0aCB3aGljaCB0byBjYWxsIGZuXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fdHJ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3RyeSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgdmFyIHJlcztcbiAgdHJ5IHtcbiAgICBmbi5jYWxsKHNjb3BlKTtcbiAgICByZXMgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy4kX19lcnJvcihlKTtcbiAgICByZXMgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsaXN0IG9mIHBhdGhzIHRoYXQgaGF2ZSBiZWVuIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1vZGlmaWVkUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJlY3RNb2RpZmllZFBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG5cbiAgcmV0dXJuIGRpcmVjdE1vZGlmaWVkUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChsaXN0LCBwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHJldHVybiBsaXN0LmNvbmNhdChwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKGNoYWlucywgcGFydCwgaSkge1xuICAgICAgcmV0dXJuIGNoYWlucy5jb25jYXQocGFydHMuc2xpY2UoMCwgaSkuY29uY2F0KHBhcnQpLmpvaW4oJy4nKSk7XG4gICAgfSwgW10pKTtcbiAgfSwgW10pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhpcyBkb2N1bWVudCB3YXMgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogSWYgYHBhdGhgIGlzIGdpdmVuLCBjaGVja3MgaWYgYSBwYXRoIG9yIGFueSBmdWxsIHBhdGggY29udGFpbmluZyBgcGF0aGAgYXMgcGFydCBvZiBpdHMgcGF0aCBjaGFpbiBoYXMgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoKSAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMnKSAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpICAgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdIG9wdGlvbmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aFxuICAgID8gISF+dGhpcy5tb2RpZmllZFBhdGhzKCkuaW5kZXhPZihwYXRoKVxuICAgIDogdGhpcy4kX18uYWN0aXZlUGF0aHMuc29tZSgnbW9kaWZ5Jyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgcGF0aGAgd2FzIGRpcmVjdGx5IHNldCBhbmQgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0RpcmVjdE1vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBpbml0aWFsaXplZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0luaXQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBzZWxlY3RlZCBpbiB0aGUgc291cmNlIHF1ZXJ5IHdoaWNoIGluaXRpYWxpemVkIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgVGhpbmcuZmluZE9uZSgpLnNlbGVjdCgnbmFtZScpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ25hbWUnKSAvLyB0cnVlXG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ2FnZScpICAvLyBmYWxzZVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gaXNTZWxlY3RlZCAocGF0aCkge1xuICBpZiAodGhpcy4kX18uc2VsZWN0ZWQpIHtcblxuICAgIGlmICgnX2lkJyA9PT0gcGF0aCkge1xuICAgICAgcmV0dXJuIDAgIT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5zZWxlY3RlZClcbiAgICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICAgLCBpbmNsdXNpdmUgPSBmYWxzZVxuICAgICAgLCBjdXI7XG5cbiAgICBpZiAoMSA9PT0gaSAmJiAnX2lkJyA9PT0gcGF0aHNbMF0pIHtcbiAgICAgIC8vIG9ubHkgX2lkIHdhcyBzZWxlY3RlZC5cbiAgICAgIHJldHVybiAwID09PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY3VyID0gcGF0aHNbaV07XG4gICAgICBpZiAoJ19pZCcgPT0gY3VyKSBjb250aW51ZTtcbiAgICAgIGluY2x1c2l2ZSA9ICEhIHRoaXMuJF9fLnNlbGVjdGVkW2N1cl07XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICB9XG5cbiAgICBpID0gcGF0aHMubGVuZ3RoO1xuICAgIHZhciBwYXRoRG90ID0gcGF0aCArICcuJztcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XG5cbiAgICAgIGlmICgwID09PSBjdXIuaW5kZXhPZihwYXRoRG90KSkge1xuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgICAgfVxuXG4gICAgICBpZiAoMCA9PT0gcGF0aERvdC5pbmRleE9mKGN1ciArICcuJykpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gISBpbmNsdXNpdmU7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRXhlY3V0ZXMgcmVnaXN0ZXJlZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGlzIGRvY3VtZW50LlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBgcHJlYCBzYXZlIGFuZCBpZiBhIHZhbGlkYXRpb24gcnVsZSBpcyB2aW9sYXRlZCwgW3NhdmVdKCNtb2RlbF9Nb2RlbC1zYXZlKSBpcyBhYm9ydGVkIGFuZCB0aGUgZXJyb3IgaXMgcmV0dXJuZWQgdG8geW91ciBgY2FsbGJhY2tgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgaWYgKGVycikgaGFuZGxlRXJyb3IoZXJyKTtcbiAqICAgICAgIGVsc2UgLy8gdmFsaWRhdGlvbiBwYXNzZWRcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBjYWxsZWQgYWZ0ZXIgdmFsaWRhdGlvbiBjb21wbGV0ZXMsIHBhc3NpbmcgYW4gZXJyb3IgaWYgb25lIG9jY3VycmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIG9ubHkgdmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzIHdoZW4gbmVjZXNzYXJ5XG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlKS5maWx0ZXIoZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBpZiAoIXNlbGYuaXNTZWxlY3RlZChwYXRoKSAmJiAhc2VsZi5pc01vZGlmaWVkKHBhdGgpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5pbml0KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpKTtcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpKTtcblxuICBpZiAoMCA9PT0gcGF0aHMubGVuZ3RoKSB7XG4gICAgY29tcGxldGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB2YWxpZGF0aW5nID0ge31cbiAgICAsIHRvdGFsID0gMDtcblxuICBwYXRocy5mb3JFYWNoKHZhbGlkYXRlUGF0aCk7XG4gIHJldHVybiB0aGlzO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlUGF0aCAocGF0aCkge1xuICAgIGlmICh2YWxpZGF0aW5nW3BhdGhdKSByZXR1cm47XG5cbiAgICB2YWxpZGF0aW5nW3BhdGhdID0gdHJ1ZTtcbiAgICB0b3RhbCsrO1xuXG4gICAgdXRpbHMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgcCA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgICBpZiAoIXApIHJldHVybiAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XG5cbiAgICAgIHZhciB2YWwgPSBzZWxmLmdldFZhbHVlKHBhdGgpO1xuICAgICAgcC5kb1ZhbGlkYXRlKHZhbCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgc2VsZi5pbnZhbGlkYXRlKFxuICAgICAgICAgICAgICBwYXRoXG4gICAgICAgICAgICAsIGVyclxuICAgICAgICAgICAgLCB1bmRlZmluZWRcbiAgICAgICAgICAgIC8vLCB0cnVlIC8vIGVtYmVkZGVkIGRvY3NcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuICAgICAgfSwgc2VsZik7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21wbGV0ZSAoKSB7XG4gICAgdmFyIGVyciA9IHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgICBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgY2IgJiYgY2IoZXJyKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogVGhlIGBlcnJvck1zZ2AgYXJndW1lbnQgd2lsbCBiZWNvbWUgdGhlIG1lc3NhZ2Ugb2YgdGhlIGBWYWxpZGF0aW9uRXJyb3JgLlxuICpcbiAqIFRoZSBgdmFsdWVgIGFyZ3VtZW50IChpZiBwYXNzZWQpIHdpbGwgYmUgYXZhaWxhYmxlIHRocm91Z2ggdGhlIGBWYWxpZGF0aW9uRXJyb3IudmFsdWVgIHByb3BlcnR5LlxuICpcbiAqICAgICBkb2MuaW52YWxpZGF0ZSgnc2l6ZScsICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsIDE0KTtcblxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gKiAgICAgICAvLyBwcmludHNcbiAqICAgICAgIHsgbWVzc2FnZTogJ1ZhbGlkYXRpb24gZmFpbGVkJyxcbiAqICAgICAgICAgbmFtZTogJ1ZhbGlkYXRpb25FcnJvcicsXG4gKiAgICAgICAgIGVycm9yczpcbiAqICAgICAgICAgIHsgc2l6ZTpcbiAqICAgICAgICAgICAgIHsgbWVzc2FnZTogJ211c3QgYmUgbGVzcyB0aGFuIDIwJyxcbiAqICAgICAgICAgICAgICAgbmFtZTogJ1ZhbGlkYXRvckVycm9yJyxcbiAqICAgICAgICAgICAgICAgcGF0aDogJ3NpemUnLFxuICogICAgICAgICAgICAgICB0eXBlOiAndXNlciBkZWZpbmVkJyxcbiAqICAgICAgICAgICAgICAgdmFsdWU6IDE0IH0gfSB9XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVycm9yTXNnIHRoZSBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ3xOdW1iZXJ8YW55fSB2YWx1ZSBvcHRpb25hbCBpbnZhbGlkIHZhbHVlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnJvck1zZywgdmFsdWUpIHtcbiAgaWYgKCF0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IpIHtcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSBuZXcgVmFsaWRhdGlvbkVycm9yKHRoaXMpO1xuICB9XG5cbiAgaWYgKCFlcnJvck1zZyB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIGVycm9yTXNnKSB7XG4gICAgZXJyb3JNc2cgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgZXJyb3JNc2csICd1c2VyIGRlZmluZWQnLCB2YWx1ZSk7XG4gIH1cblxuICBpZiAodGhpcy4kX18udmFsaWRhdGlvbkVycm9yID09IGVycm9yTXNnKSByZXR1cm47XG5cbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yLmVycm9yc1twYXRoXSA9IGVycm9yTXNnO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIGludGVybmFsIG1vZGlmaWVkIHN0YXRlIG9mIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqIEBtZXRob2QgJF9fcmVzZXRcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19yZXNldCA9IGZ1bmN0aW9uIHJlc2V0ICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gc2VsZi5nZXRWYWx1ZShpKTtcbiAgfSlcbiAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHZhbCAmJiB2YWwuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICB9KVxuICAuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykgY29udGludWU7XG4gICAgICBkb2MuJF9fcmVzZXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsZWFyICdtb2RpZnknKCdkaXJ0eScpIGNhY2hlXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLmNsZWFyKCdtb2RpZnknKTtcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmVycm9ycyA9IHVuZGVmaW5lZDtcbiAgLy9jb25zb2xlLmxvZyggc2VsZi4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUgKTtcbiAgLy9UT0RPOiDRgtGD0YJcbiAgdGhpcy5zY2hlbWEucmVxdWlyZWRQYXRocygpLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKHBhdGgpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIGRpcnR5IHBhdGhzIC8gdmFscy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGlydHlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBhbGwgPSB0aGlzLiRfXy5hY3RpdmVQYXRocy5tYXAoJ21vZGlmeScsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxuICAgICAgICAgICAsIHZhbHVlOiBzZWxmLmdldFZhbHVlKCBwYXRoIClcbiAgICAgICAgICAgLCBzY2hlbWE6IHNlbGYuJF9fcGF0aCggcGF0aCApIH07XG4gIH0pO1xuXG4gIC8vIFNvcnQgZGlydHkgcGF0aHMgaW4gYSBmbGF0IGhpZXJhcmNoeS5cbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gKGEucGF0aCA8IGIucGF0aCA/IC0xIDogKGEucGF0aCA+IGIucGF0aCA/IDEgOiAwKSk7XG4gIH0pO1xuXG4gIC8vIElnbm9yZSBcImZvby5hXCIgaWYgXCJmb29cIiBpcyBkaXJ0eSBhbHJlYWR5LlxuICB2YXIgbWluaW1hbCA9IFtdXG4gICAgLCBsYXN0UGF0aFxuICAgICwgdG9wO1xuXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XG4gICAgbGFzdFBhdGggPSBpdGVtLnBhdGggKyAnLic7XG4gICAgbWluaW1hbC5wdXNoKGl0ZW0pO1xuICAgIHRvcCA9IGl0ZW07XG4gIH0pO1xuXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcbiAgcmV0dXJuIG1pbmltYWw7XG59O1xuXG4vKiFcbiAqIENvbXBpbGVzIHNjaGVtYXMuXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHNlbGYsIHRyZWUsIHByb3RvLCBwcmVmaXgpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBsaW1iXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgbGltYiA9IHRyZWVba2V5XTtcblxuICAgIGRlZmluZShzZWxmXG4gICAgICAgICwga2V5XG4gICAgICAgICwgKCgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGxpbWIuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAmJiAoIWxpbWIudHlwZSB8fCBsaW1iLnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgID8gbGltYlxuICAgICAgICAgICAgICAgOiBudWxsKVxuICAgICAgICAsIHByb3RvXG4gICAgICAgICwgcHJlZml4XG4gICAgICAgICwga2V5cyk7XG4gIH1cbn1cblxuLy8gZ2V0cyBkZXNjcmlwdG9ycyBmb3IgYWxsIHByb3BlcnRpZXMgb2YgYG9iamVjdGBcbi8vIG1ha2VzIGFsbCBwcm9wZXJ0aWVzIG5vbi1lbnVtZXJhYmxlIHRvIG1hdGNoIHByZXZpb3VzIGJlaGF2aW9yIHRvICMyMjExXG5mdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgcmVzdWx0W2tleV0uZW51bWVyYWJsZSA9IGZhbHNlO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiFcbiAqIERlZmluZXMgdGhlIGFjY2Vzc29yIG5hbWVkIHByb3Agb24gdGhlIGluY29taW5nIHByb3RvdHlwZS5cbiAqINGC0LDQvCDQttC1LCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LAg0YHQtNC10LvQsNC10Lwg0L3QsNCx0LvRjtC00LDQtdC80YvQvNC4XG4gKi9cbmZ1bmN0aW9uIGRlZmluZSAoc2VsZiwgcHJvcCwgc3VicHJvcHMsIHByb3RvdHlwZSwgcHJlZml4LCBrZXlzKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIHBhdGggPSAocHJlZml4ID8gcHJlZml4ICsgJy4nIDogJycpICsgcHJvcDtcblxuICBpZiAoc3VicHJvcHMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnMgPSB7fTtcblxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSBzY29wZSBmb3IgbmVzdGVkIGdldHRlcnMvc2V0dGVyc1xuICAgICAgICAgICAgaWYgKCFwcmVmaXgpIG5lc3RlZC4kX18uc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBzaGFkb3cgaW5oZXJpdGVkIGdldHRlcnMgZnJvbSBzdWItb2JqZWN0cyBzb1xuICAgICAgICAgICAgLy8gdGhpbmcubmVzdGVkLm5lc3RlZC5uZXN0ZWQuLi4gZG9lc24ndCBvY2N1ciAoZ2gtMzY2KVxuICAgICAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgICAgICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgLy8gb3Zlci13cml0ZSB0aGUgcGFyZW50cyBnZXR0ZXIgd2l0aG91dCB0cmlnZ2VyaW5nIGl0XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXN0ZWQsIGtleXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlICAgLy8gSXQgZG9lc24ndCBzaG93IHVwLlxuICAgICAgICAgICAgICAgICwgd3JpdGFibGU6IHRydWUgICAgICAvLyBXZSBjYW4gc2V0IGl0IGxhdGVyLlxuICAgICAgICAgICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlICAvLyBXZSBjYW4gT2JqZWN0LmRlZmluZVByb3BlcnR5IGFnYWluLlxuICAgICAgICAgICAgICAgICwgdmFsdWU6IHVuZGVmaW5lZCAgICAvLyBJdCBzaGFkb3dzIGl0cyBwYXJlbnQuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXN0ZWQudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChwYXRoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbXBpbGUoIHNlbGYsIHN1YnByb3BzLCBuZXN0ZWQsIHBhdGggKTtcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnNbcGF0aF0gPSBuZXN0ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuJF9fLmdldHRlcnNbcGF0aF07XG4gICAgICAgIH1cbiAgICAgICwgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgRG9jdW1lbnQpIHYgPSB2LnRvT2JqZWN0KCk7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLiRfXy5zY29wZSB8fCB0aGlzKS5zZXQoIHBhdGgsIHYgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoICkgeyByZXR1cm4gdGhpcy5nZXQuY2FsbCh0aGlzLiRfXy5zY29wZSB8fCB0aGlzLCBwYXRoKTsgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzLnNldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgsIHYpOyB9XG4gICAgfSk7XG4gIH1cblxuICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHByb3RvdHlwZSwgcHJvcCwgcHJlZml4LCBwYXRoICk7XG4gIC8vc2VsZi5hZGFwdGVySG9va3MuZG9jdW1lbnREZWZpbmVQcm9wZXJ0eS5jYWxsKCBzZWxmLCBzZWxmLCBwYXRoLCBwcm90b3R5cGUgKTtcbn1cblxuLyoqXG4gKiBBc3NpZ25zL2NvbXBpbGVzIGBzY2hlbWFgIGludG8gdGhpcyBkb2N1bWVudHMgcHJvdG90eXBlLlxuICpcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zZXRTY2hlbWFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hID0gZnVuY3Rpb24gKCBzY2hlbWEgKSB7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICBjb21waWxlKCB0aGlzLCBzY2hlbWEudHJlZSwgdGhpcyApO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHN1YmRvY3MgKGJ5IGJmcylcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QWxsU3ViZG9jc1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBbGxTdWJkb2NzID0gZnVuY3Rpb24gKCkge1xuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xuICBFbWJlZGRlZCA9IEVtYmVkZGVkIHx8IHJlcXVpcmUoJy4vdHlwZXMvZW1iZWRkZWQnKTtcblxuICBmdW5jdGlvbiBkb2NSZWR1Y2VyKHNlZWQsIHBhdGgpIHtcbiAgICB2YXIgdmFsID0gdGhpc1twYXRoXTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaCh2YWwpO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5KVxuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gX2RvY1JlZHVjZShkb2MpIHtcbiAgICAgICAgaWYgKCFkb2MgfHwgIWRvYy5fZG9jKSByZXR1cm47XG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKGRvYyk7XG4gICAgICAgIHNlZWQgPSBPYmplY3Qua2V5cyhkb2MuX2RvYykucmVkdWNlKGRvY1JlZHVjZXIuYmluZChkb2MuX2RvYyksIHNlZWQpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHNlZWQ7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKHRoaXMpLCBbXSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBnZW5lcmljIHNhdmUgc3R1ZmYuXG4gKiB0byBzb2x2ZSAjMTQ0NiB1c2UgdXNlIGhpZXJhcmNoeSBpbnN0ZWFkIG9mIGhvb2tzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3ByZXNhdmVWYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wcmVzYXZlVmFsaWRhdGUgPSBmdW5jdGlvbiAkX19wcmVzYXZlVmFsaWRhdGUoKSB7XG4gIC8vIGlmIGFueSBkb2Muc2V0KCkgY2FsbHMgZmFpbGVkXG5cbiAgdmFyIGRvY3MgPSB0aGlzLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlKCk7XG5cbiAgdmFyIGUyID0gZG9jcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgIHJldHVybiBkb2MuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIH0pO1xuICB2YXIgZTEgPSBbdGhpcy4kX18uc2F2ZUVycm9yXS5jb25jYXQoZTIpO1xuICB2YXIgZXJyID0gZTEuZmlsdGVyKGZ1bmN0aW9uICh4KSB7cmV0dXJuIHh9KVswXTtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gbnVsbDtcblxuICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIHBhdGggdGhhdCB3ZXJlIGNoYW5nZWQgYW5kIGFyZSBhcnJheXNcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG5cbiAgLy8gdmFsaWRhdGUgYWxsIGRvY3VtZW50IGFycmF5cy5cbiAgcmV0dXJuIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gICAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUoaSk7XG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XG4gICAgfSkucmVkdWNlKGZ1bmN0aW9uKHNlZWQsIGFycmF5KSB7XG4gICAgICByZXR1cm4gc2VlZC5jb25jYXQoYXJyYXkpO1xuICAgIH0sIFtdKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKGRvYykge3JldHVybiBkb2N9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGVycm9yXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZXJyb3JcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gIHRoaXMuJF9fLnNhdmVFcnJvciA9IGVycjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByb2R1Y2VzIGEgc3BlY2lhbCBxdWVyeSBkb2N1bWVudCBvZiB0aGUgbW9kaWZpZWQgcHJvcGVydGllcyB1c2VkIGluIHVwZGF0ZXMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2RlbHRhXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RlbHRhID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZGlydHkgPSB0aGlzLiRfX2RpcnR5KCk7XG5cbiAgdmFyIGRlbHRhID0ge31cbiAgICAsIGxlbiA9IGRpcnR5Lmxlbmd0aFxuICAgICwgZCA9IDA7XG5cbiAgZm9yICg7IGQgPCBsZW47ICsrZCkge1xuICAgIHZhciBkYXRhID0gZGlydHlbIGQgXTtcbiAgICB2YXIgdmFsdWUgPSBkYXRhLnZhbHVlO1xuXG4gICAgdmFsdWUgPSB1dGlscy5jbG9uZSh2YWx1ZSwgeyBkZXBvcHVsYXRlOiAxIH0pO1xuICAgIGRlbHRhWyBkYXRhLnBhdGggXSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIGRlbHRhO1xufTtcblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2hhbmRsZVNhdmUgPSBmdW5jdGlvbigpe1xuICAvLyDQn9C+0LvRg9GH0LDQtdC8INGA0LXRgdGD0YDRgSDQutC+0LvQu9C10LrRhtC40LgsINC60YPQtNCwINCx0YPQtNC10Lwg0YHQvtGF0YDQsNC90Y/RgtGMINC00LDQvdC90YvQtVxuICB2YXIgcmVzb3VyY2U7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmVzb3VyY2UgPSB0aGlzLmNvbGxlY3Rpb24uYXBpO1xuICB9XG5cbiAgdmFyIGlubmVyUHJvbWlzZSA9IG5ldyAkLkRlZmVycmVkKCk7XG5cbiAgaWYgKCB0aGlzLmlzTmV3ICkge1xuICAgIC8vIHNlbmQgZW50aXJlIGRvY1xuICAgIHZhciBvYmogPSB0aGlzLnRvT2JqZWN0KHsgZGVwb3B1bGF0ZTogMSB9KTtcblxuICAgIGlmICggKCBvYmogfHwge30gKS5oYXNPd25Qcm9wZXJ0eSgnX2lkJykgPT09IGZhbHNlICkge1xuICAgICAgLy8gZG9jdW1lbnRzIG11c3QgaGF2ZSBhbiBfaWQgZWxzZSBtb25nb29zZSB3b24ndCBrbm93XG4gICAgICAvLyB3aGF0IHRvIHVwZGF0ZSBsYXRlciBpZiBtb3JlIGNoYW5nZXMgYXJlIG1hZGUuIHRoZSB1c2VyXG4gICAgICAvLyB3b3VsZG4ndCBrbm93IHdoYXQgX2lkIHdhcyBnZW5lcmF0ZWQgYnkgbW9uZ29kYiBlaXRoZXJcbiAgICAgIC8vIG5vciB3b3VsZCB0aGUgT2JqZWN0SWQgZ2VuZXJhdGVkIG15IG1vbmdvZGIgbmVjZXNzYXJpbHlcbiAgICAgIC8vIG1hdGNoIHRoZSBzY2hlbWEgZGVmaW5pdGlvbi5cbiAgICAgIGlubmVyUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdkb2N1bWVudCBtdXN0IGhhdmUgYW4gX2lkIGJlZm9yZSBzYXZpbmcnKSk7XG4gICAgICByZXR1cm4gaW5uZXJQcm9taXNlO1xuICAgIH1cblxuICAgIC8vINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQvtC60YDRg9C20LXQvdC40LUg0YLQtdGB0YLQvtCyXG4gICAgLy8g0KXQvtGC0Y8g0LzQvtC20L3QviDRgtCw0LrQuNC8INC+0LHRgNCw0LfQvtC8INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4INC40LvQuCBhcGlcbiAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb3VyY2UuY3JlYXRlKCBvYmogKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XG4gICAgfVxuXG4gICAgdGhpcy4kX19yZXNldCgpO1xuICAgIHRoaXMuaXNOZXcgPSBmYWxzZTtcbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICAgIC8vIE1ha2UgaXQgcG9zc2libGUgdG8gcmV0cnkgdGhlIGluc2VydFxuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3QgdHJlYXQgaXQgYXMgYSBuZXcgb2JqZWN0IG9uIGVycm9yLFxuICAgIC8vIHNpbmNlIGl0IGFscmVhZHkgZXhpc3RzXG4gICAgdGhpcy4kX18uaW5zZXJ0aW5nID0gZmFsc2U7XG5cbiAgICB2YXIgZGVsdGEgPSB0aGlzLiRfX2RlbHRhKCk7XG5cbiAgICBpZiAoICFfLmlzRW1wdHkoIGRlbHRhICkgKSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxuICAgICAgLy8g0KXQvtGC0Y8g0LzQvtC20L3QviDRgtCw0LrQuNC8INC+0LHRgNCw0LfQvtC8INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4INC40LvQuCBhcGlcbiAgICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvdXJjZSggdGhpcy5pZCApLnVwZGF0ZSggZGVsdGEgKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgfVxuXG4gIHJldHVybiBpbm5lclByb21pc2U7XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBTYXZlcyB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBleGFtcGxlOlxuICpcbiAqICAgICBwcm9kdWN0LnNvbGQgPSBEYXRlLm5vdygpO1xuICogICAgIHByb2R1Y3Quc2F2ZShmdW5jdGlvbiAoZXJyLCBwcm9kdWN0LCBudW1iZXJBZmZlY3RlZCkge1xuICogICAgICAgaWYgKGVycikgLi5cbiAqICAgICB9KVxuICpcbiAqIEBkZXNjcmlwdGlvbiBUaGUgY2FsbGJhY2sgd2lsbCByZWNlaXZlIHRocmVlIHBhcmFtZXRlcnMsIGBlcnJgIGlmIGFuIGVycm9yIG9jY3VycmVkLCBgcHJvZHVjdGAgd2hpY2ggaXMgdGhlIHNhdmVkIGBwcm9kdWN0YCwgYW5kIGBudW1iZXJBZmZlY3RlZGAgd2hpY2ggd2lsbCBiZSAxIHdoZW4gdGhlIGRvY3VtZW50IHdhcyBmb3VuZCBhbmQgdXBkYXRlZCBpbiB0aGUgZGF0YWJhc2UsIG90aGVyd2lzZSAwLlxuICpcbiAqIFRoZSBgZm5gIGNhbGxiYWNrIGlzIG9wdGlvbmFsLiBJZiBubyBgZm5gIGlzIHBhc3NlZCBhbmQgdmFsaWRhdGlvbiBmYWlscywgdGhlIHZhbGlkYXRpb24gZXJyb3Igd2lsbCBiZSBlbWl0dGVkIG9uIHRoZSBjb25uZWN0aW9uIHVzZWQgdG8gY3JlYXRlIHRoaXMgbW9kZWwuXG4gKiBAZXhhbXBsZTpcbiAqICAgICB2YXIgZGIgPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgdmFyIFByb2R1Y3QgPSBkYi5tb2RlbCgnUHJvZHVjdCcsIHNjaGVtYSk7XG4gKlxuICogICAgIGRiLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAZGVzY3JpcHRpb24gSG93ZXZlciwgaWYgeW91IGRlc2lyZSBtb3JlIGxvY2FsIGVycm9yIGhhbmRsaW5nIHlvdSBjYW4gYWRkIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8gdGhlIG1vZGVsIGFuZCBoYW5kbGUgZXJyb3JzIHRoZXJlIGluc3RlYWQuXG4gKiBAZXhhbXBsZTpcbiAqICAgICBQcm9kdWN0Lm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAZGVzY3JpcHRpb24gQXMgYW4gZXh0cmEgbWVhc3VyZSBvZiBmbG93IGNvbnRyb2wsIHNhdmUgd2lsbCByZXR1cm4gYSBQcm9taXNlIChib3VuZCB0byBgZm5gIGlmIHBhc3NlZCkgc28gaXQgY291bGQgYmUgY2hhaW5lZCwgb3IgaG9vayB0byByZWNpdmUgZXJyb3JzXG4gKiBAZXhhbXBsZTpcbiAqICAgICBwcm9kdWN0LnNhdmUoKS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0LCBudW1iZXJBZmZlY3RlZCkge1xuICogICAgICAgIC4uLlxuICogICAgIH0pLm9uUmVqZWN0ZWQoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgIGFzc2VydC5vayhlcnIpXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGVyciwgcHJvZHVjdCwgTnVtYmVyKX0gW2RvbmVdIG9wdGlvbmFsIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBtaWRkbGV3YXJlIGh0dHA6Ly9tb25nb29zZWpzLmNvbS9kb2NzL21pZGRsZXdhcmUuaHRtbFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uICggZG9uZSApIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZmluYWxQcm9taXNlID0gbmV3ICQuRGVmZXJyZWQoKS5kb25lKCBkb25lICk7XG5cbiAgLy8g0KHQvtGF0YDQsNC90Y/RgtGMINC00L7QutGD0LzQtdC90YIg0LzQvtC20L3QviDRgtC+0LvRjNC60L4g0LXRgdC70Lgg0L7QvSDQvdCw0YXQvtC00LjRgtGB0Y8g0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gIGlmICggIXRoaXMuY29sbGVjdGlvbiApe1xuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGFyZ3VtZW50cyApO1xuICAgIGNvbnNvbGUuZXJyb3IoJ0RvY3VtZW50LnNhdmUgYXBpIGhhbmRsZSBpcyBub3QgaW1wbGVtZW50ZWQuJyk7XG4gICAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGZvciBwcmVTYXZlIGVycm9ycyAo0YLQvtGH0L4g0LfQvdCw0Y4sINGH0YLQviDQvtC90LAg0L/RgNC+0LLQtdGA0Y/QtdGCINC+0YjQuNCx0LrQuCDQsiDQvNCw0YHRgdC40LLQsNGFIChDYXN0RXJyb3IpKVxuICB2YXIgcHJlU2F2ZUVyciA9IHNlbGYuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIGlmICggcHJlU2F2ZUVyciApIHtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBwcmVTYXZlRXJyICk7XG4gICAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlXG4gIHZhciBwMCA9IG5ldyAkLkRlZmVycmVkKCk7XG4gIHNlbGYudmFsaWRhdGUoZnVuY3Rpb24oIGVyciApe1xuICAgIGlmICggZXJyICl7XG4gICAgICBwMC5yZWplY3QoIGVyciApO1xuICAgICAgZmluYWxQcm9taXNlLnJlamVjdCggZXJyICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHAwLnJlc29sdmUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vINCh0L3QsNGH0LDQu9CwINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQstGB0LUg0L/QvtC00LTQvtC60YPQvNC10L3RgtGLINC4INGB0LTQtdC70LDRgtGMIHJlc29sdmUhISFcbiAgLy8gQ2FsbCBzYXZlIGhvb2tzIG9uIHN1YmRvY3NcbiAgdmFyIHN1YkRvY3MgPSBzZWxmLiRfX2dldEFsbFN1YmRvY3MoKTtcbiAgdmFyIHdoZW5Db25kID0gc3ViRG9jcy5tYXAoZnVuY3Rpb24gKGQpIHtyZXR1cm4gZC5zYXZlKCk7fSk7XG4gIHdoZW5Db25kLnB1c2goIHAwICk7XG5cbiAgLy8g0KLQsNC6INC80Ysg0L/QtdGA0LXQtNCw0ZHQvCDQvNCw0YHRgdC40LIgcHJvbWlzZSDRg9GB0LvQvtCy0LjQuVxuICB2YXIgcDEgPSAkLndoZW4uYXBwbHkoICQsIHdoZW5Db25kICk7XG5cbiAgLy8gSGFuZGxlIHNhdmUgYW5kIHJlc3VsdHNcbiAgcDFcbiAgICAudGhlbiggdGhpcy4kX19oYW5kbGVTYXZlLmJpbmQoIHRoaXMgKSApXG4gICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBmaW5hbFByb21pc2UucmVzb2x2ZSggc2VsZiApO1xuICAgIH0sIGZ1bmN0aW9uICggZXJyICkge1xuICAgICAgLy8gSWYgdGhlIGluaXRpYWwgaW5zZXJ0IGZhaWxzIHByb3ZpZGUgYSBzZWNvbmQgY2hhbmNlLlxuICAgICAgLy8gKElmIHdlIGRpZCB0aGlzIGFsbCB0aGUgdGltZSB3ZSB3b3VsZCBicmVhayB1cGRhdGVzKVxuICAgICAgaWYgKHNlbGYuJF9fLmluc2VydGluZykge1xuICAgICAgICBzZWxmLmlzTmV3ID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5lbWl0KCdpc05ldycsIHRydWUpO1xuICAgICAgfVxuICAgICAgZmluYWxQcm9taXNlLnJlamVjdCggZXJyICk7XG4gICAgfSk7XG5cbiAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbn07XG5cbi8qZnVuY3Rpb24gYWxsIChwcm9taXNlT2ZBcnIpIHtcbiAgdmFyIHBSZXQgPSBuZXcgUHJvbWlzZTtcbiAgdGhpcy50aGVuKHByb21pc2VPZkFycikudGhlbihcbiAgICBmdW5jdGlvbiAocHJvbWlzZUFycikge1xuICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgIHZhciBlcnJTZW50aW5lbDtcbiAgICAgIGlmICghcHJvbWlzZUFyci5sZW5ndGgpIHBSZXQucmVzb2x2ZSgpO1xuICAgICAgcHJvbWlzZUFyci5mb3JFYWNoKGZ1bmN0aW9uIChwcm9taXNlLCBpbmRleCkge1xuICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgY291bnQrKztcbiAgICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICAgIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIGlmIChlcnJTZW50aW5lbCkgcmV0dXJuO1xuICAgICAgICAgICAgcmV0W2luZGV4XSA9IHZhbDtcbiAgICAgICAgICAgIC0tY291bnQ7XG4gICAgICAgICAgICBpZiAoY291bnQgPT0gMCkgcFJldC5mdWxmaWxsKHJldCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgICAgIGVyclNlbnRpbmVsID0gZXJyO1xuICAgICAgICAgICAgcFJldC5yZWplY3QoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwUmV0O1xuICAgIH1cbiAgICAsIHBSZXQucmVqZWN0LmJpbmQocFJldClcbiAgKTtcbiAgcmV0dXJuIHBSZXQ7XG59Ki9cblxuXG4vKipcbiAqIENvbnZlcnRzIHRoaXMgZG9jdW1lbnQgaW50byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0LCByZWFkeSBmb3Igc3RvcmFnZSBpbiBNb25nb0RCLlxuICpcbiAqIEJ1ZmZlcnMgYXJlIGNvbnZlcnRlZCB0byBpbnN0YW5jZXMgb2YgW21vbmdvZGIuQmluYXJ5XShodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sKSBmb3IgcHJvcGVyIHN0b3JhZ2UuXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBgZ2V0dGVyc2AgYXBwbHkgYWxsIGdldHRlcnMgKHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVycylcbiAqIC0gYHZpcnR1YWxzYCBhcHBseSB2aXJ0dWFsIGdldHRlcnMgKGNhbiBvdmVycmlkZSBgZ2V0dGVyc2Agb3B0aW9uKVxuICogLSBgbWluaW1pemVgIHJlbW92ZSBlbXB0eSBvYmplY3RzIChkZWZhdWx0cyB0byB0cnVlKVxuICogLSBgdHJhbnNmb3JtYCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB0byB0aGUgcmVzdWx0aW5nIGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmdcbiAqXG4gKiAjIyMjR2V0dGVycy9WaXJ0dWFsc1xuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyBwYXRoIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSwgdmlydHVhbHM6IGZhbHNlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIEV4YW1wbGUgb2YgYXBwbHlpbmcgYm90aCBwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSB9KVxuICpcbiAqIFRvIGFwcGx5IHRoZXNlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9PYmplY3RgIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9PYmplY3QnLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogIyMjI1RyYW5zZm9ybVxuICpcbiAqIFdlIG1heSBuZWVkIHRvIHBlcmZvcm0gYSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdCBiYXNlZCBvbiBzb21lIGNyaXRlcmlhLCBzYXkgdG8gcmVtb3ZlIHNvbWUgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIG9yIHJldHVybiBhIGN1c3RvbSBvYmplY3QuIEluIHRoaXMgY2FzZSB3ZSBzZXQgdGhlIG9wdGlvbmFsIGB0cmFuc2Zvcm1gIGZ1bmN0aW9uLlxuICpcbiAqIFRyYW5zZm9ybSBmdW5jdGlvbnMgcmVjZWl2ZSB0aHJlZSBhcmd1bWVudHNcbiAqXG4gKiAgICAgZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7fVxuICpcbiAqIC0gYGRvY2AgVGhlIG1vbmdvb3NlIGRvY3VtZW50IHdoaWNoIGlzIGJlaW5nIGNvbnZlcnRlZFxuICogLSBgcmV0YCBUaGUgcGxhaW4gb2JqZWN0IHJlcHJlc2VudGF0aW9uIHdoaWNoIGhhcyBiZWVuIGNvbnZlcnRlZFxuICogLSBgb3B0aW9uc2AgVGhlIG9wdGlvbnMgaW4gdXNlIChlaXRoZXIgc2NoZW1hIG9wdGlvbnMgb3IgdGhlIG9wdGlvbnMgcGFzc2VkIGlubGluZSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBzcGVjaWZ5IHRoZSB0cmFuc2Zvcm0gc2NoZW1hIG9wdGlvblxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICAvLyByZW1vdmUgdGhlIF9pZCBvZiBldmVyeSBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZXN1bHRcbiAqICAgICAgIGRlbGV0ZSByZXQuX2lkO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBXaXRoIHRyYW5zZm9ybWF0aW9ucyB3ZSBjYW4gZG8gYSBsb3QgbW9yZSB0aGFuIHJlbW92ZSBwcm9wZXJ0aWVzLiBXZSBjYW4gZXZlbiByZXR1cm4gY29tcGxldGVseSBuZXcgY3VzdG9taXplZCBvYmplY3RzOlxuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgbW92aWU6IHJldC5uYW1lIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbW92aWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIF9Ob3RlOiBpZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgaWdub3JlZC5fXG4gKlxuICogVHJhbnNmb3JtYXRpb25zIG1heSBhbHNvIGJlIGFwcGxpZWQgaW5saW5lLCBvdmVycmlkZGluZyBhbnkgdHJhbnNmb3JtIHNldCBpbiB0aGUgb3B0aW9uczpcbiAqXG4gKiAgICAgZnVuY3Rpb24geGZvcm0gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBpbmxpbmU6IHJldC5uYW1lLCBjdXN0b206IHRydWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gcGFzcyB0aGUgdHJhbnNmb3JtIGFzIGFuIGlubGluZSBvcHRpb25cbiAqICAgICBkb2MudG9PYmplY3QoeyB0cmFuc2Zvcm06IHhmb3JtIH0pOyAvLyB7IGlubGluZTogJ1dyZWNrLWl0IFJhbHBoJywgY3VzdG9tOiB0cnVlIH1cbiAqXG4gKiBfTm90ZTogaWYgeW91IGNhbGwgYHRvT2JqZWN0YCBhbmQgcGFzcyBhbnkgb3B0aW9ucywgdGhlIHRyYW5zZm9ybSBkZWNsYXJlZCBpbiB5b3VyIHNjaGVtYSBvcHRpb25zIHdpbGwgX19ub3RfXyBiZSBhcHBsaWVkLiBUbyBmb3JjZSBpdHMgYXBwbGljYXRpb24gcGFzcyBgdHJhbnNmb3JtOiB0cnVlYF9cbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC5oaWRlID0gJ19pZCc7XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICBpZiAob3B0aW9ucy5oaWRlKSB7XG4gKiAgICAgICAgIG9wdGlvbnMuaGlkZS5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAqICAgICAgICAgICBkZWxldGUgcmV0W3Byb3BdO1xuICogICAgICAgICB9KTtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfSk7XG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHsgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnIH0pOyAgICAgICAgICAgICAgICAgIC8vIHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJywgdHJhbnNmb3JtOiB0cnVlIH0pOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IF9hbmQgZWFjaCBvZiBpdHMgc3ViLWRvY3VtZW50c18uIFRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB5b3UgYXJlIGN1cnJlbnRseSBvcGVyYXRpbmcgb24gYSBzdWItZG9jdW1lbnQgeW91IG1pZ2h0IHVzZSB0aGUgZm9sbG93aW5nIGd1YXJkOlxuICpcbiAqICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZG9jLm93bmVyRG9jdW1lbnQpIHtcbiAqICAgICAgIC8vIHdvcmtpbmcgd2l0aCBhIHN1YiBkb2NcbiAqICAgICB9XG4gKlxuICogVHJhbnNmb3JtcywgbGlrZSBhbGwgb2YgdGhlc2Ugb3B0aW9ucywgYXJlIGFsc28gYXZhaWxhYmxlIGZvciBgdG9KU09OYC5cbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSBmb3Igc29tZSBtb3JlIGRldGFpbHMuXG4gKlxuICogX0R1cmluZyBzYXZlLCBubyBjdXN0b20gb3B0aW9ucyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgYmVmb3JlIGJlaW5nIHNlbnQgdG8gdGhlIGRhdGFiYXNlLl9cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtPYmplY3R9IGpzIG9iamVjdFxuICogQHNlZSBtb25nb2RiLkJpbmFyeSBodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUgJiYgdGhpcy4kX18ud2FzUG9wdWxhdGVkKSB7XG4gICAgLy8gcG9wdWxhdGVkIHBhdGhzIHRoYXQgd2Ugc2V0IHRvIGEgZG9jdW1lbnRcbiAgICByZXR1cm4gdXRpbHMuY2xvbmUodGhpcy5faWQsIG9wdGlvbnMpO1xuICB9XG5cbiAgLy8gV2hlbiBpbnRlcm5hbGx5IHNhdmluZyB0aGlzIGRvY3VtZW50IHdlIGFsd2F5cyBwYXNzIG9wdGlvbnMsXG4gIC8vIGJ5cGFzc2luZyB0aGUgY3VzdG9tIHNjaGVtYSBvcHRpb25zLlxuICB2YXIgb3B0aW9uc1BhcmFtZXRlciA9IG9wdGlvbnM7XG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9wdGlvbnMuY29uc3RydWN0b3IpKSB8fFxuICAgIChvcHRpb25zICYmIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3RcbiAgICAgID8gY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdClcbiAgICAgIDoge307XG4gIH1cblxuICBpZiAoIG9wdGlvbnMubWluaW1pemUgPT09IHVuZGVmaW5lZCApe1xuICAgIG9wdGlvbnMubWluaW1pemUgPSB0aGlzLnNjaGVtYS5vcHRpb25zLm1pbmltaXplO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zUGFyYW1ldGVyKSB7XG4gICAgb3B0aW9ucy5fdXNlU2NoZW1hT3B0aW9ucyA9IHRydWU7XG4gIH1cblxuICB2YXIgcmV0ID0gdXRpbHMuY2xvbmUodGhpcy5fZG9jLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy52aXJ0dWFscyB8fCBvcHRpb25zLmdldHRlcnMgJiYgZmFsc2UgIT09IG9wdGlvbnMudmlydHVhbHMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAndmlydHVhbHMnLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmdldHRlcnMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAncGF0aHMnLCBvcHRpb25zKTtcbiAgICAvLyBhcHBseUdldHRlcnMgZm9yIHBhdGhzIHdpbGwgYWRkIG5lc3RlZCBlbXB0eSBvYmplY3RzO1xuICAgIC8vIGlmIG1pbmltaXplIGlzIHNldCwgd2UgbmVlZCB0byByZW1vdmUgdGhlbS5cbiAgICBpZiAob3B0aW9ucy5taW5pbWl6ZSkge1xuICAgICAgcmV0ID0gbWluaW1pemUocmV0KSB8fCB7fTtcbiAgICB9XG4gIH1cblxuICAvLyBJbiB0aGUgY2FzZSB3aGVyZSBhIHN1YmRvY3VtZW50IGhhcyBpdHMgb3duIHRyYW5zZm9ybSBmdW5jdGlvbiwgd2UgbmVlZCB0b1xuICAvLyBjaGVjayBhbmQgc2VlIGlmIHRoZSBwYXJlbnQgaGFzIGEgdHJhbnNmb3JtIChvcHRpb25zLnRyYW5zZm9ybSkgYW5kIGlmIHRoZVxuICAvLyBjaGlsZCBzY2hlbWEgaGFzIGEgdHJhbnNmb3JtICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBJbiB0aGlzIGNhc2UsXG4gIC8vIHdlIG5lZWQgdG8gYWRqdXN0IG9wdGlvbnMudHJhbnNmb3JtIHRvIGJlIHRoZSBjaGlsZCBzY2hlbWEncyB0cmFuc2Zvcm0gYW5kXG4gIC8vIG5vdCB0aGUgcGFyZW50IHNjaGVtYSdzXG4gIGlmICh0cnVlID09PSBvcHRpb25zLnRyYW5zZm9ybSB8fFxuICAgICAgKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgJiYgb3B0aW9ucy50cmFuc2Zvcm0pKSB7XG4gICAgdmFyIG9wdHMgPSBvcHRpb25zLmpzb25cbiAgICAgID8gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgIDogdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdDtcbiAgICBpZiAob3B0cykge1xuICAgICAgb3B0aW9ucy50cmFuc2Zvcm0gPSBvcHRzLnRyYW5zZm9ybTtcbiAgICB9XG4gIH1cblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICB2YXIgeGZvcm1lZCA9IG9wdGlvbnMudHJhbnNmb3JtKHRoaXMsIHJldCwgb3B0aW9ucyk7XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiB4Zm9ybWVkKSByZXQgPSB4Zm9ybWVkO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qIVxuICogTWluaW1pemVzIGFuIG9iamVjdCwgcmVtb3ZpbmcgdW5kZWZpbmVkIHZhbHVlcyBhbmQgZW1wdHkgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdG8gbWluaW1pemVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBtaW5pbWl6ZSAob2JqKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlcbiAgICAsIHZhbDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YWwgPSBvYmpba2V5XTtcblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KHZhbCkgKSB7XG4gICAgICBvYmpba2V5XSA9IG1pbmltaXplKHZhbCk7XG4gICAgfVxuXG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gb2JqW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGhhc0tleXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGhhc0tleXNcbiAgICA/IG9ialxuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIEFwcGxpZXMgdmlydHVhbHMgcHJvcGVydGllcyB0byBganNvbmAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IGpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIGVpdGhlciBgdmlydHVhbHNgIG9yIGBwYXRoc2BcbiAqIEByZXR1cm4ge09iamVjdH0gYGpzb25gXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlHZXR0ZXJzIChzZWxmLCBqc29uLCB0eXBlLCBvcHRpb25zKSB7XG4gIHZhciBzY2hlbWEgPSBzZWxmLnNjaGVtYVxuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyhzY2hlbWFbdHlwZV0pXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0gcGF0aHNbaV07XG5cbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAgICwgcGxlbiA9IHBhcnRzLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gcGxlbiAtIDFcbiAgICAgICwgYnJhbmNoID0ganNvblxuICAgICAgLCBwYXJ0O1xuXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHBsZW47ICsraWkpIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpaV07XG4gICAgICBpZiAoaWkgPT09IGxhc3QpIHtcbiAgICAgICAgYnJhbmNoW3BhcnRdID0gdXRpbHMuY2xvbmUoc2VsZi5nZXQocGF0aCksIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoW3BhcnRdIHx8IChicmFuY2hbcGFydF0gPSB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGpzb247XG59XG5cbi8qKlxuICogVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIG1ldGhvZCBpcyB1c2VkIGluIGNhbGxzIHRvIEpTT04uc3RyaW5naWZ5KGRvYykuXG4gKlxuICogVGhpcyBtZXRob2QgYWNjZXB0cyB0aGUgc2FtZSBvcHRpb25zIGFzIFtEb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KS4gVG8gYXBwbHkgdGhlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9KU09OYCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvSlNPTicsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgZm9yIGRldGFpbHMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBzZWUgRG9jdW1lbnQjdG9PYmplY3QgI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBjaGVjayBmb3Igb2JqZWN0IHR5cGUgc2luY2UgYW4gYXJyYXkgb2YgZG9jdW1lbnRzXG4gIC8vIGJlaW5nIHN0cmluZ2lmaWVkIHBhc3NlcyBhcnJheSBpbmRleGVzIGluc3RlYWRcbiAgLy8gb2Ygb3B0aW9ucyBvYmplY3RzLiBKU09OLnN0cmluZ2lmeShbZG9jLCBkb2NdKVxuICAvLyBUaGUgc2Vjb25kIGNoZWNrIGhlcmUgaXMgdG8gbWFrZSBzdXJlIHRoYXQgcG9wdWxhdGVkIGRvY3VtZW50cyAob3JcbiAgLy8gc3ViZG9jdW1lbnRzKSB1c2UgdGhlaXIgb3duIG9wdGlvbnMgZm9yIGAudG9KU09OKClgIGluc3RlYWQgb2YgdGhlaXJcbiAgLy8gcGFyZW50J3NcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob3B0aW9ucy5jb25zdHJ1Y3RvcikpXG4gICAgICB8fCAoKCFvcHRpb25zIHx8IG9wdGlvbnMuanNvbikgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pKSB7XG5cbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pXG4gICAgICA6IHt9O1xuICB9XG4gIG9wdGlvbnMuanNvbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMudG9PYmplY3Qob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgRG9jdW1lbnQgc3RvcmVzIHRoZSBzYW1lIGRhdGEgYXMgZG9jLlxuICpcbiAqIERvY3VtZW50cyBhcmUgY29uc2lkZXJlZCBlcXVhbCB3aGVuIHRoZXkgaGF2ZSBtYXRjaGluZyBgX2lkYHMsIHVubGVzcyBuZWl0aGVyXG4gKiBkb2N1bWVudCBoYXMgYW4gYF9pZGAsIGluIHdoaWNoIGNhc2UgdGhpcyBmdW5jdGlvbiBmYWxscyBiYWNrIHRvIHVzaW5nXG4gKiBgZGVlcEVxdWFsKClgLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBhIGRvY3VtZW50IHRvIGNvbXBhcmVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoZG9jKSB7XG4gIHZhciB0aWQgPSB0aGlzLmdldCgnX2lkJyk7XG4gIHZhciBkb2NpZCA9IGRvYy5nZXQoJ19pZCcpO1xuICBpZiAoIXRpZCAmJiAhZG9jaWQpIHtcbiAgICByZXR1cm4gZGVlcEVxdWFsKHRoaXMsIGRvYyk7XG4gIH1cbiAgcmV0dXJuIHRpZCAmJiB0aWQuZXF1YWxzXG4gICAgPyB0aWQuZXF1YWxzKGRvY2lkKVxuICAgIDogdGlkID09PSBkb2NpZDtcbn07XG5cbi8qKlxuICogR2V0cyBfaWQocykgdXNlZCBkdXJpbmcgcG9wdWxhdGlvbiBvZiB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBNb2RlbC5maW5kT25lKCkucG9wdWxhdGUoJ2F1dGhvcicpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MuYXV0aG9yLm5hbWUpICAgICAgICAgLy8gRHIuU2V1c3NcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5wb3B1bGF0ZWQoJ2F1dGhvcicpKSAvLyAnNTE0NGNmODA1MGYwNzFkOTc5YzExOGE3J1xuICogICAgIH0pXG4gKlxuICogSWYgdGhlIHBhdGggd2FzIG5vdCBwb3B1bGF0ZWQsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7QXJyYXl8T2JqZWN0SWR8TnVtYmVyfEJ1ZmZlcnxTdHJpbmd8dW5kZWZpbmVkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnBvcHVsYXRlZCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9wdGlvbnMpIHtcbiAgLy8gdmFsIGFuZCBvcHRpb25zIGFyZSBpbnRlcm5hbFxuXG4gIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDRjdGC0YMg0L/RgNC+0LLQtdGA0LrRgywg0L7QvdCwINC00L7Qu9C20L3QsCDQvtC/0LjRgNCw0YLRjNGB0Y8g0L3QtSDQvdCwICRfXy5wb3B1bGF0ZWQsINCwINC90LAg0YLQviwg0YfRgtC+INC90LDRiCDQvtCx0YrQtdC60YIg0LjQvNC10LXRgiDRgNC+0LTQuNGC0LXQu9GPXG4gIC8vINC4INC/0L7RgtC+0Lwg0YPQttC1INCy0YvRgdGC0LDQstC70Y/RgtGMINGB0LLQvtC50YHRgtCy0L4gcG9wdWxhdGVkID09IHRydWVcbiAgaWYgKG51bGwgPT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgdmFyIHYgPSB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XG4gICAgaWYgKHYpIHJldHVybiB2LnZhbHVlO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBpbnRlcm5hbFxuXG4gIGlmICh0cnVlID09PSB2YWwpIHtcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICB9XG5cbiAgdGhpcy4kX18ucG9wdWxhdGVkIHx8ICh0aGlzLiRfXy5wb3B1bGF0ZWQgPSB7fSk7XG4gIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXSA9IHsgdmFsdWU6IHZhbCwgb3B0aW9uczogb3B0aW9ucyB9O1xuICByZXR1cm4gdmFsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICAvLyBvdmVycmlkZGVuIGluIFN1YkRvY3VtZW50c1xuICByZXR1cm4gcGF0aCB8fCAnJztcbn07XG5cbi8qKlxuICog0KPQtNCw0LvQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuCDQstC10YDQvdGD0YLRjCDQutC+0LvQu9C10LrRhtC40Y4uXG4gKlxuICogQGV4YW1wbGVcbiAqIHN0b3JhZ2UuY29sbGVjdGlvbi5kb2N1bWVudC5yZW1vdmUoKTtcbiAqIGRvY3VtZW50LnJlbW92ZSgpO1xuICpcbiAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oKXtcbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLnJlbW92ZSggdGhpcyApO1xuICB9XG5cbiAgcmV0dXJuIGRlbGV0ZSB0aGlzO1xufTtcblxuXG4vKipcbiAqINCe0YfQuNGJ0LDQtdGCINC00L7QutGD0LzQtdC90YIgKNCy0YvRgdGC0LDQstC70Y/QtdGCINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y4g0LjQu9C4IHVuZGVmaW5lZClcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGRvYyA9IHRoaXNcbiAgICAsIHNlbGYgPSB0aGlzXG4gICAgLCBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09IHAgKSBjb250aW51ZTtcblxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXG4gICAgICAsIGxlbiA9IHBhdGgubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXG4gICAgICAsIGRvY18gPSBkb2NcbiAgICAgICwgaSA9IDA7XG5cbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcbiAgICAgIHZhciBwaWVjZSA9IHBhdGhbIGkgXVxuICAgICAgICAsIGRlZmF1bHRWYWw7XG5cbiAgICAgIGlmICggaSA9PT0gbGFzdCApIHtcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xuXG4gICAgICAgIGRvY19bIHBpZWNlIF0gPSBkZWZhdWx0VmFsIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jXyA9IGRvY19bIHBpZWNlIF0gfHwgKCBkb2NfWyBwaWVjZSBdID0ge30gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuRG9jdW1lbnQuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yO1xubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudDtcbiIsIi8vdG9kbzog0L/QvtGA0YLQuNGA0L7QstCw0YLRjCDQstGB0LUg0L7RiNC40LHQutC4ISEhXG4vKipcbiAqIFN0b3JhZ2VFcnJvciBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBFcnJvciBtZXNzYWdlXG4gKiBAaW5oZXJpdHMgRXJyb3IgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRXJyb3JcbiAqIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzgzODE4L2hvdy1kby1pLWNyZWF0ZS1hLWN1c3RvbS1lcnJvci1pbi1qYXZhc2NyaXB0XG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VFcnJvciAoIG1zZyApIHtcbiAgdGhpcy5tZXNzYWdlID0gbXNnO1xuICB0aGlzLm5hbWUgPSAnU3RvcmFnZUVycm9yJztcbn1cblN0b3JhZ2VFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuXG4vKiFcbiAqIEZvcm1hdHMgZXJyb3IgbWVzc2FnZXNcbiAqL1xuU3RvcmFnZUVycm9yLnByb3RvdHlwZS5mb3JtYXRNZXNzYWdlID0gZnVuY3Rpb24gKG1zZywgcGF0aCwgdHlwZSwgdmFsKSB7XG4gIGlmICghbXNnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdtZXNzYWdlIGlzIHJlcXVpcmVkJyk7XG5cbiAgcmV0dXJuIG1zZy5yZXBsYWNlKC97UEFUSH0vLCBwYXRoKVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tWQUxVRX0vLCBTdHJpbmcodmFsfHwnJykpXG4gICAgICAgICAgICAucmVwbGFjZSgve1RZUEV9LywgdHlwZSB8fCAnZGVjbGFyZWQgdHlwZScpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VFcnJvcjtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBidWlsdC1pbiB2YWxpZGF0b3IgZXJyb3IgbWVzc2FnZXMuXG4gKlxuICogQHNlZSBFcnJvci5tZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRXJyb3IubWVzc2FnZXMgPSByZXF1aXJlKCcuL2Vycm9yL21lc3NhZ2VzJyk7XG5cbi8qIVxuICogRXhwb3NlIHN1YmNsYXNzZXNcbiAqL1xuXG5TdG9yYWdlRXJyb3IuQ2FzdEVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9jYXN0Jyk7XG5TdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0aW9uJyk7XG5TdG9yYWdlRXJyb3IuVmFsaWRhdG9yRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZhbGlkYXRvcicpO1xuLy90b2RvOlxuLy9TdG9yYWdlRXJyb3IuVmVyc2lvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92ZXJzaW9uJyk7XG4vL1N0b3JhZ2VFcnJvci5PdmVyd3JpdGVNb2RlbEVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9vdmVyd3JpdGVNb2RlbCcpO1xuU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xuLy9TdG9yYWdlRXJyb3IuRGl2ZXJnZW50QXJyYXlFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvZGl2ZXJnZW50QXJyYXknKTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDYXN0RXJyb3IgKHR5cGUsIHZhbHVlLCBwYXRoKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xuICB0aGlzLm5hbWUgPSAnQ2FzdEVycm9yJztcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnBhdGggPSBwYXRoO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gTW9uZ29vc2VFcnJvci5cbiAqL1xuQ2FzdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcbkNhc3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYXN0RXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FzdEVycm9yO1xuIiwiXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy4gVGhlc2UgbWF5IGJlIGN1c3RvbWl6ZWQuXG4gKlxuICogICAgIC8vIGN1c3RvbWl6ZSB3aXRoaW4gZWFjaCBzY2hlbWEgb3IgZ2xvYmFsbHkgbGlrZSBzb1xuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgbW9uZ29vc2UuRXJyb3IubWVzc2FnZXMuU3RyaW5nLmVudW0gID0gXCJZb3VyIGN1c3RvbSBtZXNzYWdlIGZvciB7UEFUSH0uXCI7XG4gKlxuICogQXMgeW91IG1pZ2h0IGhhdmUgbm90aWNlZCwgZXJyb3IgbWVzc2FnZXMgc3VwcG9ydCBiYXNpYyB0ZW1wbGF0aW5nXG4gKlxuICogLSBge1BBVEh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIGRvY3VtZW50IHBhdGhcbiAqIC0gYHtWQUxVRX1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqIC0gYHtUWVBFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgdmFsaWRhdG9yIHR5cGUgc3VjaCBhcyBcInJlZ2V4cFwiLCBcIm1pblwiLCBvciBcInVzZXIgZGVmaW5lZFwiXG4gKiAtIGB7TUlOfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWluIHZhbHVlIGZvciB0aGUgTnVtYmVyLm1pbiB2YWxpZGF0b3JcbiAqIC0gYHtNQVh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtYXggdmFsdWUgZm9yIHRoZSBOdW1iZXIubWF4IHZhbGlkYXRvclxuICpcbiAqIENsaWNrIHRoZSBcInNob3cgY29kZVwiIGxpbmsgYmVsb3cgdG8gc2VlIGFsbCBkZWZhdWx0cy5cbiAqXG4gKiBAcHJvcGVydHkgbWVzc2FnZXNcbiAqIEByZWNlaXZlciBNb25nb29zZUVycm9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBtc2cgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5tc2cuZ2VuZXJhbCA9IHt9O1xubXNnLmdlbmVyYWwuZGVmYXVsdCA9IFwiVmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YFwiO1xubXNnLmdlbmVyYWwucmVxdWlyZWQgPSBcIlBhdGggYHtQQVRIfWAgaXMgcmVxdWlyZWQuXCI7XG5cbm1zZy5OdW1iZXIgPSB7fTtcbm1zZy5OdW1iZXIubWluID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBsZXNzIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlICh7TUlOfSkuXCI7XG5tc2cuTnVtYmVyLm1heCA9IFwiUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbW9yZSB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZSAoe01BWH0pLlwiO1xuXG5tc2cuU3RyaW5nID0ge307XG5tc2cuU3RyaW5nLmVudW0gPSBcImB7VkFMVUV9YCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGB7UEFUSH1gLlwiO1xubXNnLlN0cmluZy5tYXRjaCA9IFwiUGF0aCBge1BBVEh9YCBpcyBpbnZhbGlkICh7VkFMVUV9KS5cIjtcblxuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKiFcbiAqIE1pc3NpbmdTY2hlbWEgRXJyb3IgY29uc3RydWN0b3IuXG4gKlxuICogQGluaGVyaXRzIE1vbmdvb3NlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBNaXNzaW5nU2NoZW1hRXJyb3IoKXtcbiAgdmFyIG1zZyA9ICdTY2hlbWEgaGFzblxcJ3QgYmVlbiByZWdpc3RlcmVkIGZvciBkb2N1bWVudC5cXG4nXG4gICAgKyAnVXNlIHN0b3JhZ2UuRG9jdW1lbnQobmFtZSwgc2NoZW1hKSc7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1zZyk7XG5cbiAgdGhpcy5uYW1lID0gJ01pc3NpbmdTY2hlbWFFcnJvcic7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yLlxuICovXG5cbk1pc3NpbmdTY2hlbWFFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN0b3JhZ2VFcnJvci5wcm90b3R5cGUpO1xuTWlzc2luZ1NjaGVtYUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0b3JhZ2VFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBNaXNzaW5nU2NoZW1hRXJyb3I7IiwiXG4vKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHNcbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBEb2N1bWVudCBWYWxpZGF0aW9uIEVycm9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBpbnN0YW5jZVxuICogQGluaGVyaXRzIE1vbmdvb3NlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IgKGluc3RhbmNlKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIFwiVmFsaWRhdGlvbiBmYWlsZWRcIik7XG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0aW9uRXJyb3InO1xuICB0aGlzLmVycm9ycyA9IGluc3RhbmNlLmVycm9ycyA9IHt9O1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gTW9uZ29vc2VFcnJvci5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcbnZhciBlcnJvck1lc3NhZ2VzID0gU3RvcmFnZUVycm9yLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFNjaGVtYSB2YWxpZGF0b3IgZXJyb3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZ1xuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfGFueX0gdmFsXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdG9yRXJyb3IgKHBhdGgsIG1zZywgdHlwZSwgdmFsKSB7XG4gIGlmICghbXNnKSBtc2cgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcbiAgdmFyIG1lc3NhZ2UgPSB0aGlzLmZvcm1hdE1lc3NhZ2UobXNnLCBwYXRoLCB0eXBlLCB2YWwpO1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRvckVycm9yJztcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbDtcbn1cblxuLyohXG4gKiB0b1N0cmluZyBoZWxwZXJcbiAqL1xuXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2U7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yXG4gKi9cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRvckVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvckVycm9yO1xuIiwiLy8gQmFja2JvbmUuRXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbi8vIHN1Y2Nlc3Npb24uXG4vL1xuLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbi8vICAgICBfLmV4dGVuZChvYmplY3QsIEV2ZW50cy5wcm90b3R5cGUpO1xuLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbi8vXG5mdW5jdGlvbiBFdmVudHMoKSB7fVxuXG5FdmVudHMucHJvdG90eXBlID0ge1xuXG4gIC8vIEJpbmQgYW4gZXZlbnQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLiBQYXNzaW5nIGBcImFsbFwiYCB3aWxsIGJpbmRcbiAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgIGV2ZW50cy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY29udGV4dCB8fCB0aGlzfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gQmluZCBhbiBldmVudCB0byBvbmx5IGJlIHRyaWdnZXJlZCBhIHNpbmdsZSB0aW1lLiBBZnRlciB0aGUgZmlyc3QgdGltZVxuICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbmNlJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXRhaW4ubGVuZ3RoKSBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAvLyBwYXNzZWQgdGhlIHNhbWUgYXJndW1lbnRzIGFzIGB0cmlnZ2VyYCBpcywgYXBhcnQgZnJvbSB0aGUgZXZlbnQgbmFtZVxuICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xuICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gIC8vIHRvIGV2ZXJ5IG9iamVjdCBpdCdzIGN1cnJlbnRseSBsaXN0ZW5pbmcgdG8uXG4gIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbztcbiAgICBpZiAoIWxpc3RlbmluZ1RvKSByZXR1cm4gdGhpcztcbiAgICB2YXIgcmVtb3ZlID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgaWYgKG9iaikgKGxpc3RlbmluZ1RvID0ge30pW29iai5fbGlzdGVuSWRdID0gb2JqO1xuICAgIGZvciAodmFyIGlkIGluIGxpc3RlbmluZ1RvKSB7XG4gICAgICBvYmogPSBsaXN0ZW5pbmdUb1tpZF07XG4gICAgICBvYmoub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIGlmIChyZW1vdmUgfHwgXy5pc0VtcHR5KG9iai5fZXZlbnRzKSkgZGVsZXRlIHRoaXMuX2xpc3RlbmluZ1RvW2lkXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxuLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbi8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbi8vIGluIHRlcm1zIG9mIHRoZSBleGlzdGluZyBBUEkuXG52YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cbiAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtrZXksIG5hbWVba2V5XV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4vLyB0cmlnZ2VyaW5nIGV2ZW50cy4gVHJpZXMgdG8ga2VlcCB0aGUgdXN1YWwgY2FzZXMgc3BlZWR5IChtb3N0IGludGVybmFsXG4vLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG52YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICB2YXIgZXYsIGkgPSAtMSwgbCA9IGV2ZW50cy5sZW5ndGgsIGExID0gYXJnc1swXSwgYTIgPSBhcmdzWzFdLCBhMyA9IGFyZ3NbMl07XG4gIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgIGNhc2UgMTogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExKTsgcmV0dXJuO1xuICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgIGRlZmF1bHQ6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmFwcGx5KGV2LmN0eCwgYXJncyk7XG4gIH1cbn07XG5cbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4vLyBsaXN0ZW5pbmcgdG8uXG5fLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSB7fSk7XG4gICAgdmFyIGlkID0gb2JqLl9saXN0ZW5JZCB8fCAob2JqLl9saXN0ZW5JZCA9IF8udW5pcXVlSWQoJ2wnKSk7XG4gICAgbGlzdGVuaW5nVG9baWRdID0gb2JqO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG4iLCIvKipcbiAqINCl0YDQsNC90LjQu9C40YnQtSDQtNC+0LrRg9C80LXQvdGC0L7QsiDQv9C+INGB0YXQtdC80LDQvFxuICog0LLQtNC+0YXQvdC+0LLQu9GR0L0gbW9uZ29vc2UgMy44LjQgKNC40YHQv9GA0LDQstC70LXQvdGLINCx0LDQs9C4INC/0L4gMy44LjE1KVxuICpcbiAqINCg0LXQsNC70LjQt9Cw0YbQuNC4INGF0YDQsNC90LjQu9C40YnQsFxuICogaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jc2VsZWN0b3JzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cbiAqXG4gKiBicm93c2VyaWZ5IGxpYi8gLS1zdGFuZGFsb25lIHN0b3JhZ2UgPiBzdG9yYWdlLmpzIC1kXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4g0Lgg0L/QvtC70YPRh9C40YLRjCDQtdGRLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RvcmFnZS5TY2hlbWF8dW5kZWZpbmVkfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoICdTY2hlbWEnICE9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIHNjaGVtYS5jb25zdHJ1Y3RvciApICl7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcblxuICByZXR1cm4gdGhpc1sgbmFtZSBdID0gbmV3IENvbGxlY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICk7XG59O1xuXG4vKipcbiAqINCf0L7Qu9GD0YfQuNGC0Ywg0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40Lkg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAg0YHRgtGA0L7Qui5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59IEFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIGNvbGxlY3Rpb25zIGluIHRoZSBzdG9yYWdlLlxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5nZXRDb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uTmFtZXM7XG59O1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBDb2xsZWN0aW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkNvbGxlY3Rpb24gPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIHZlcnNpb25cbiAqXG4gKiBAcHJvcGVydHkgdmVyc2lvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuLy90b2RvOlxuLy9TdG9yYWdlLnByb3RvdHlwZS52ZXJzaW9uID0gcGtnLnZlcnNpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYV0oI3NjaGVtYV9TY2hlbWEpIGNvbnN0cnVjdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIFNjaGVtYSA9IG1vbmdvb3NlLlNjaGVtYTtcbiAqICAgICB2YXIgQ2F0U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogQG1ldGhvZCBTY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hID0gU2NoZW1hO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZSA9IFNjaGVtYVR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgU2NoZW1hVHlwZXMuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX0FsaWFzIG9mIG1vbmdvb3NlLlNjaGVtYS5UeXBlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuX1xuICpcbiAqIEBwcm9wZXJ0eSBTY2hlbWFUeXBlc1xuICogQHNlZSBTY2hlbWEuU2NoZW1hVHlwZXMgI3NjaGVtYV9TY2hlbWEuVHlwZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIFtWaXJ0dWFsVHlwZV0oI3ZpcnR1YWx0eXBlX1ZpcnR1YWxUeXBlKSBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgVmlydHVhbFR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuVmlydHVhbFR5cGUgPSBWaXJ0dWFsVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBNb25nb29zZSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgYXJyYXkgPSBtb25nb29zZS5UeXBlcy5BcnJheTtcbiAqXG4gKiAjIyMjVHlwZXM6XG4gKlxuICogLSBbT2JqZWN0SWRdKCN0eXBlcy1vYmplY3RpZC1qcylcbiAqIC0gW1N1YkRvY3VtZW50XSgjdHlwZXMtZW1iZWRkZWQtanMpXG4gKiAtIFtBcnJheV0oI3R5cGVzLWFycmF5LWpzKVxuICogLSBbRG9jdW1lbnRBcnJheV0oI3R5cGVzLWRvY3VtZW50YXJyYXktanMpXG4gKlxuICogVXNpbmcgdGhpcyBleHBvc2VkIGFjY2VzcyB0byB0aGUgYE9iamVjdElkYCB0eXBlLCB3ZSBjYW4gY29uc3RydWN0IGlkcyBvbiBkZW1hbmQuXG4gKlxuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkO1xuICogICAgIHZhciBpZDEgPSBuZXcgT2JqZWN0SWQ7XG4gKlxuICogQHByb3BlcnR5IFR5cGVzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlR5cGVzID0gVHlwZXM7XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIFtEb2N1bWVudF0oI2RvY3VtZW50LWpzKSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAbWV0aG9kIERvY3VtZW50XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkRvY3VtZW50ID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIFtNb25nb29zZUVycm9yXSgjZXJyb3JfTW9uZ29vc2VFcnJvcikgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcblxuXG5cblN0b3JhZ2UucHJvdG90eXBlLlN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5TdG9yYWdlLnByb3RvdHlwZS51dGlscyA9IHV0aWxzO1xuU3RvcmFnZS5wcm90b3R5cGUuT2JqZWN0SWQgPSBUeXBlcy5PYmplY3RJZDtcblN0b3JhZ2UucHJvdG90eXBlLnNjaGVtYXMgPSBTY2hlbWEuc2NoZW1hcztcblxuU3RvcmFnZS5wcm90b3R5cGUuc2V0QWRhcHRlciA9IGZ1bmN0aW9uKCBhZGFwdGVySG9va3MgKXtcbiAgRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IGFkYXB0ZXJIb29rcztcbn07XG5cbi8qXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSB1dWlkLlxuICogaHR0cDovL3d3dy5icm9vZmEuY29tL1Rvb2xzL01hdGgudXVpZC5odG1cbiAqIGZvcmsgTWF0aC51dWlkLmpzICh2MS40KVxuICpcbiAqIGh0dHA6Ly93d3cuYnJvb2ZhLmNvbS8yMDA4LzA5L2phdmFzY3JpcHQtdXVpZC1mdW5jdGlvbi9cbiAqL1xuLyp1dWlkOiB7XG4gIC8vIFByaXZhdGUgYXJyYXkgb2YgY2hhcnMgdG8gdXNlXG4gIENIQVJTOiAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKSxcblxuICAvLyByZXR1cm5zIFJGQzQxMjIsIHZlcnNpb24gNCBJRFxuICBnZW5lcmF0ZTogZnVuY3Rpb24oKXtcbiAgICB2YXIgY2hhcnMgPSB0aGlzLkNIQVJTLCB1dWlkID0gbmV3IEFycmF5KCAzNiApLCBybmQgPSAwLCByO1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IDM2OyBpKysgKSB7XG4gICAgICBpZiAoIGkgPT0gOCB8fCBpID09IDEzIHx8IGkgPT0gMTggfHwgaSA9PSAyMyApIHtcbiAgICAgICAgdXVpZFtpXSA9ICctJztcbiAgICAgIH0gZWxzZSBpZiAoIGkgPT0gMTQgKSB7XG4gICAgICAgIHV1aWRbaV0gPSAnNCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIHJuZCA8PSAweDAyICkgcm5kID0gMHgyMDAwMDAwICsgKE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDApIHwgMDtcbiAgICAgICAgciA9IHJuZCAmIDB4ZjtcbiAgICAgICAgcm5kID0gcm5kID4+IDQ7XG4gICAgICAgIHV1aWRbaV0gPSBjaGFyc1soaSA9PSAxOSkgPyAociAmIDB4MykgfCAweDggOiByXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHV1aWQuam9pbignJykudG9Mb3dlckNhc2UoKTtcbiAgfVxufSovXG5cblxuLyohXG4gKiBUaGUgZXhwb3J0cyBvYmplY3QgaXMgYW4gaW5zdGFuY2Ugb2YgU3RvcmFnZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFN0b3JhZ2U7XG4iLCIvLyDQnNCw0YjQuNC90LAg0YHQvtGB0YLQvtGP0L3QuNC5INC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0L/QvtC80LXRgtC60LgsINCyINC60LDQutC+0Lwg0YHQvtGB0YLQvtGP0L3QuNC4INC90LDRhdC+0LTRj9GC0YHRjyDQv9C+0LvQtVxuLy8g0J3QsNC/0YDQuNC80LXRgDog0LXRgdC70Lgg0L/QvtC70LUg0LjQvNC10LXRgiDRgdC+0YHRgtC+0Y/QvdC40LUgZGVmYXVsdCAtINC30L3QsNGH0LjRgiDQtdCz0L4g0LfQvdCw0YfQtdC90LjQtdC8INGP0LLQu9GP0LXRgtGB0Y8g0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjlxuLy8g0J/RgNC40LzQtdGH0LDQvdC40LU6INC00LvRjyDQvNCw0YHRgdC40LLQvtCyINCyINC+0LHRidC10Lwg0YHQu9GD0YfQsNC1INGN0YLQviDQvtC30L3QsNGH0LDQtdGCINC/0YPRgdGC0L7QuSDQvNCw0YHRgdC40LJcblxuLyohXG4gKiBEZXBlbmRlbmNpZXNcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcblxudmFyIEFjdGl2ZVJvc3RlciA9IFN0YXRlTWFjaGluZS5jdG9yKCdyZXF1aXJlJywgJ21vZGlmeScsICdpbml0JywgJ2RlZmF1bHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcm5hbENhY2hlO1xuXG5mdW5jdGlvbiBJbnRlcm5hbENhY2hlICgpIHtcbiAgdGhpcy5zdHJpY3RNb2RlID0gdW5kZWZpbmVkO1xuICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICB0aGlzLnNhdmVFcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWRob2NQYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5yZW1vdmluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5pbnNlcnRpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmVyc2lvbiA9IHVuZGVmaW5lZDtcbiAgdGhpcy5nZXR0ZXJzID0ge307XG4gIHRoaXMuX2lkID0gdW5kZWZpbmVkO1xuICB0aGlzLnBvcHVsYXRlID0gdW5kZWZpbmVkOyAvLyB3aGF0IHdlIHdhbnQgdG8gcG9wdWxhdGUgaW4gdGhpcyBkb2NcbiAgdGhpcy5wb3B1bGF0ZWQgPSB1bmRlZmluZWQ7Ly8gdGhlIF9pZHMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXG4gIHRoaXMud2FzUG9wdWxhdGVkID0gZmFsc2U7IC8vIGlmIHRoaXMgZG9jIHdhcyB0aGUgcmVzdWx0IG9mIGEgcG9wdWxhdGlvblxuICB0aGlzLnNjb3BlID0gdW5kZWZpbmVkO1xuICB0aGlzLmFjdGl2ZVBhdGhzID0gbmV3IEFjdGl2ZVJvc3RlcjtcblxuICAvLyBlbWJlZGRlZCBkb2NzXG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5mdWxsUGF0aCA9IHVuZGVmaW5lZDtcbn1cbiIsIi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2Ygb2JqZWN0IGBvYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgb2JqID0ge1xuICogICAgICAgICBjb21tZW50czogW1xuICogICAgICAgICAgICAgeyB0aXRsZTogJ2V4Y2l0aW5nIScsIF9kb2M6IHsgdGl0bGU6ICdncmVhdCEnIH19XG4gKiAgICAgICAgICAgLCB7IHRpdGxlOiAnbnVtYmVyIGRvcycgfVxuICogICAgICAgICBdXG4gKiAgICAgfVxuICpcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvKSAgICAgICAgIC8vICdleGNpdGluZyEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbywgJ19kb2MnKSAvLyAnZ3JlYXQhJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMudGl0bGUnLCBvKSAgICAgICAgICAgLy8gWydleGNpdGluZyEnLCAnbnVtYmVyIGRvcyddXG4gKlxuICogICAgIC8vIHN1bW1hcnlcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbylcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgbWFwKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsLCBtYXApXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgZWFjaCBpbmRpdmlkdWFsIGZvdW5kIHZhbHVlLiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cblxuZXhwb3J0cy5nZXQgPSBmdW5jdGlvbiAocGF0aCwgbywgc3BlY2lhbCwgbWFwKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHNwZWNpYWwpIHtcbiAgICBpZiAoc3BlY2lhbC5sZW5ndGggPCAyKSB7XG4gICAgICBtYXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9va3VwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgbWFwIHx8IChtYXAgPSBLKTtcblxuICB2YXIgcGFydHMgPSAnc3RyaW5nJyA9PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgLy8gcmVhZGluZyBhIHByb3BlcnR5IGZyb20gdGhlIGFycmF5IGl0ZW1zXG4gICAgICB2YXIgcGF0aHMgPSBwYXJ0cy5zbGljZShpKTtcblxuICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1cbiAgICAgICAgICA/IGV4cG9ydHMuZ2V0KHBhdGhzLCBpdGVtLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwKVxuICAgICAgICAgIDogbWFwKHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybiBtYXAob2JqKTtcbiAgfVxuXG4gIHJldHVybiBtYXAob2JqKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYHZhbGAgYXQgdGhlIGdpdmVuIGBwYXRoYCBvZiBvYmplY3QgYG9gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCBpcyBwYXNzZWQgZWFjaCBpbmRpdmlkdWFsIHZhbHVlIGJlZm9yZSBzZXR0aW5nIGl0LiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cblxuZXhwb3J0cy5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvLCBzcGVjaWFsLCBtYXAsIF9jb3B5aW5nKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHNwZWNpYWwpIHtcbiAgICBpZiAoc3BlY2lhbC5sZW5ndGggPCAyKSB7XG4gICAgICBtYXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9va3VwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgbWFwIHx8IChtYXAgPSBLKTtcblxuICB2YXIgcGFydHMgPSAnc3RyaW5nJyA9PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICBpZiAobnVsbCA9PSBvKSByZXR1cm47XG5cbiAgLy8gdGhlIGV4aXN0YW5jZSBvZiAkIGluIGEgcGF0aCB0ZWxscyB1cyBpZiB0aGUgdXNlciBkZXNpcmVzXG4gIC8vIHRoZSBjb3B5aW5nIG9mIGFuIGFycmF5IGluc3RlYWQgb2Ygc2V0dGluZyBlYWNoIHZhbHVlIG9mXG4gIC8vIHRoZSBhcnJheSB0byB0aGUgb25lIGJ5IG9uZSB0byBtYXRjaGluZyBwb3NpdGlvbnMgb2YgdGhlXG4gIC8vIGN1cnJlbnQgYXJyYXkuXG4gIHZhciBjb3B5ID0gX2NvcHlpbmcgfHwgL1xcJC8udGVzdChwYXRoKVxuICAgICwgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFydHMubGVuZ3RoIC0gMTsgaSA8IGxlbjsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKCckJyA9PSBwYXJ0KSB7XG4gICAgICBpZiAoaSA9PSBsZW4gLSAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG4gICAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aCAmJiBqIDwgdmFsLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBzaW5nbGUgdmFsdWVzIG9mIGFycmF5XG4gICAgICAgICAgZXhwb3J0cy5zZXQocGF0aHMsIHZhbFtqXSwgb2JqW2pdLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwLCBjb3B5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBhc3NpZ25tZW50IG9mIGVudGlyZSB2YWx1ZVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWwsIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybjtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgdGhlIGxhc3QgcHJvcGVydHkgb2YgdGhlIHBhdGhcblxuICBwYXJ0ID0gcGFydHNbbGVuXTtcblxuICAvLyB1c2UgdGhlIHNwZWNpYWwgcHJvcGVydHkgaWYgZXhpc3RzXG4gIGlmIChzcGVjaWFsICYmIG9ialtzcGVjaWFsXSkge1xuICAgIG9iaiA9IG9ialtzcGVjaWFsXTtcbiAgfVxuXG4gIC8vIHNldCB0aGUgdmFsdWUgb24gdGhlIGxhc3QgYnJhbmNoXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBmb3IgKHZhciBpdGVtLCBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICBpdGVtID0gb2JqW2pdO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGlmIChsb29rdXApIHtcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsW2pdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpdGVtW3NwZWNpYWxdKSBpdGVtID0gaXRlbVtzcGVjaWFsXTtcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsW2pdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChsb29rdXApIHtcbiAgICAgIGxvb2t1cChvYmosIHBhcnQsIG1hcCh2YWwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIFJldHVybnMgdGhlIHZhbHVlIHBhc3NlZCB0byBpdC5cbiAqL1xuXG5mdW5jdGlvbiBLICh2KSB7XG4gIHJldHVybiB2O1xufSIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBUeXBlc1xuICAsIHNjaGVtYXM7XG5cbi8qKlxuICogU2NoZW1hIGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgY2hpbGQgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nLCBhZ2U6IE51bWJlciwgY2hpbGRyZW46IFtjaGlsZF0gfSk7XG4gKiAgICAgdmFyIFRyZWUgPSBtb25nb29zZS5tb2RlbCgnVHJlZScsIHNjaGVtYSk7XG4gKlxuICogICAgIC8vIHNldHRpbmcgc2NoZW1hIG9wdGlvbnNcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgX2lkOiBmYWxzZSwgYXV0b0luZGV4OiBmYWxzZSB9KVxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gW2NvbGxlY3Rpb25dKC9kb2NzL2d1aWRlLmh0bWwjY29sbGVjdGlvbik6IHN0cmluZyAtIG5vIGRlZmF1bHRcbiAqIC0gW2lkXSgvZG9jcy9ndWlkZS5odG1sI2lkKTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gYG1pbmltaXplYDogYm9vbCAtIGNvbnRyb2xzIFtkb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KSBiZWhhdmlvciB3aGVuIGNhbGxlZCBtYW51YWxseSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3N0cmljdF0oL2RvY3MvZ3VpZGUuaHRtbCNzdHJpY3QpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbdG9KU09OXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt0b09iamVjdF0oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt2ZXJzaW9uS2V5XSgvZG9jcy9ndWlkZS5odG1sI3ZlcnNpb25LZXkpOiBib29sIC0gZGVmYXVsdHMgdG8gXCJfX3ZcIlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9XaGVuIG5lc3Rpbmcgc2NoZW1hcywgKGBjaGlsZHJlbmAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLCBhbHdheXMgZGVjbGFyZSB0aGUgY2hpbGQgc2NoZW1hIGZpcnN0IGJlZm9yZSBwYXNzaW5nIGl0IGludG8gaXMgcGFyZW50Ll9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3x1bmRlZmluZWR9IFtuYW1lXSDQndCw0LfQstCw0L3QuNC1INGB0YXQtdC80YtcbiAqIEBwYXJhbSB7U2NoZW1hfSBbYmFzZVNjaGVtYV0g0JHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCDQv9GA0Lgg0L3QsNGB0LvQtdC00L7QstCw0L3QuNC4XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqINCh0YXQtdC80LBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYSAoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApIHtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBTY2hlbWEpIClcbiAgICByZXR1cm4gbmV3IFNjaGVtYSggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICk7XG5cbiAgLy8g0JXRgdC70Lgg0Y3RgtC+INC40LzQtdC90L7QstCw0L3QsNGPINGB0YXQtdC80LBcbiAgaWYgKCB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgKXtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHNjaGVtYXNbIG5hbWUgXSA9IHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSBuYW1lO1xuICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoICEoYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkgKXtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXG4gIHRoaXMuc291cmNlID0gb2JqO1xuXG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdWJwYXRocyA9IHt9O1xuICB0aGlzLnZpcnR1YWxzID0ge307XG4gIHRoaXMubmVzdGVkID0ge307XG4gIHRoaXMuaW5oZXJpdHMgPSB7fTtcbiAgdGhpcy5jYWxsUXVldWUgPSBbXTtcbiAgdGhpcy5tZXRob2RzID0ge307XG4gIHRoaXMuc3RhdGljcyA9IHt9O1xuICB0aGlzLnRyZWUgPSB7fTtcbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHVuZGVmaW5lZDtcblxuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmRlZmF1bHRPcHRpb25zKCBvcHRpb25zICk7XG5cbiAgaWYgKCBiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICl7XG4gICAgYmFzZVNjaGVtYS5kaXNjcmltaW5hdG9yKCBuYW1lLCB0aGlzICk7XG4gIH1cblxuICAvLyBidWlsZCBwYXRoc1xuICBpZiAoIG9iaiApIHtcbiAgICB0aGlzLmFkZCggb2JqICk7XG4gIH1cblxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyBnZXQgYW4gYXV0byBfaWQgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvX2lkID0gIXRoaXMucGF0aHNbJ19pZCddICYmICghdGhpcy5vcHRpb25zLm5vSWQgJiYgdGhpcy5vcHRpb25zLl9pZCk7XG4gIGlmIChhdXRvX2lkKSB7XG4gICAgdGhpcy5hZGQoeyBfaWQ6IHt0eXBlOiBTY2hlbWEuT2JqZWN0SWQsIGF1dG86IHRydWV9IH0pO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgcmVjZWl2ZSBhbiBpZCBnZXR0ZXIgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvaWQgPSAhdGhpcy5wYXRoc1snaWQnXSAmJiB0aGlzLm9wdGlvbnMuaWQ7XG4gIGlmICggYXV0b2lkICkge1xuICAgIHRoaXMudmlydHVhbCgnaWQnKS5nZXQoIGlkR2V0dGVyICk7XG4gIH1cbn1cblxuLyohXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIF9pZCBjYXN0IHRvIGEgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBpZEdldHRlciAoKSB7XG4gIGlmICh0aGlzLiRfXy5faWQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18uX2lkO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuJF9fLl9pZCA9IG51bGwgPT0gdGhpcy5faWRcbiAgICA/IG51bGxcbiAgICA6IFN0cmluZyh0aGlzLl9pZCk7XG59XG5cbi8qIVxuICogSW5oZXJpdCBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50cy5wcm90b3R5cGUgKTtcblNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2hlbWE7XG5cbi8qKlxuICogU2NoZW1hIGFzIGZsYXQgcGF0aHNcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICAgICA6IFNjaGVtYVR5cGUsXG4gKiAgICAgICAsICduZXN0ZWQua2V5JyA6IFNjaGVtYVR5cGUsXG4gKiAgICAgfVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHByb3BlcnR5IHBhdGhzXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aHM7XG5cbi8qKlxuICogU2NoZW1hIGFzIGEgdHJlZVxuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHtcbiAqICAgICAgICAgJ19pZCcgICAgIDogT2JqZWN0SWRcbiAqICAgICAgICwgJ25lc3RlZCcgIDoge1xuICogICAgICAgICAgICAgJ2tleScgOiBTdHJpbmdcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSB0cmVlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUudHJlZTtcblxuLyoqXG4gKiBSZXR1cm5zIGRlZmF1bHQgb3B0aW9ucyBmb3IgdGhpcyBzY2hlbWEsIG1lcmdlZCB3aXRoIGBvcHRpb25zYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZGVmYXVsdE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBvcHRpb25zID0gJC5leHRlbmQoe1xuICAgICAgc3RyaWN0OiB0cnVlXG4gICAgLCB2ZXJzaW9uS2V5OiAnX192J1xuICAgICwgZGlzY3JpbWluYXRvcktleTogJ19fdCdcbiAgICAsIG1pbmltaXplOiB0cnVlXG4gICAgLy8gdGhlIGZvbGxvd2luZyBhcmUgb25seSBhcHBsaWVkIGF0IGNvbnN0cnVjdGlvbiB0aW1lXG4gICAgLCBfaWQ6IHRydWVcbiAgICAsIGlkOiB0cnVlXG4gIH0sIG9wdGlvbnMgKTtcblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogQWRkcyBrZXkgcGF0aCAvIHNjaGVtYSB0eXBlIHBhaXJzIHRvIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgVG95U2NoZW1hID0gbmV3IFNjaGVtYTtcbiAqICAgICBUb3lTY2hlbWEuYWRkKHsgbmFtZTogJ3N0cmluZycsIGNvbG9yOiAnc3RyaW5nJywgcHJpY2U6ICdudW1iZXInIH0pO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkICggb2JqLCBwcmVmaXggKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGtleSA9IGtleXNbaV07XG5cbiAgICBpZiAobnVsbCA9PSBvYmpbIGtleSBdKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHZhbHVlIGZvciBzY2hlbWEgcGF0aCBgJysgcHJlZml4ICsga2V5ICsnYCcpO1xuICAgIH1cblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KG9ialtrZXldIClcbiAgICAgICYmICggIW9ialsga2V5IF0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtrZXldLmNvbnN0cnVjdG9yKSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLnR5cGUgfHwgb2JqWyBrZXkgXS50eXBlLnR5cGUgKSApe1xuXG4gICAgICBpZiAoIE9iamVjdC5rZXlzKG9ialsga2V5IF0pLmxlbmd0aCApIHtcbiAgICAgICAgLy8gbmVzdGVkIG9iamVjdCB7IGxhc3Q6IHsgbmFtZTogU3RyaW5nIH19XG4gICAgICAgIHRoaXMubmVzdGVkWyBwcmVmaXggKyBrZXkgXSA9IHRydWU7XG4gICAgICAgIHRoaXMuYWRkKCBvYmpbIGtleSBdLCBwcmVmaXggKyBrZXkgKyAnLicpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApOyAvLyBtaXhlZCB0eXBlXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXRoKCBwcmVmaXggKyBrZXksIG9ialsga2V5IF0gKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogUmVzZXJ2ZWQgZG9jdW1lbnQga2V5cy5cbiAqXG4gKiBLZXlzIGluIHRoaXMgb2JqZWN0IGFyZSBuYW1lcyB0aGF0IGFyZSByZWplY3RlZCBpbiBzY2hlbWEgZGVjbGFyYXRpb25zIGIvYyB0aGV5IGNvbmZsaWN0IHdpdGggbW9uZ29vc2UgZnVuY3Rpb25hbGl0eS4gVXNpbmcgdGhlc2Uga2V5IG5hbWUgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqXG4gKiAgICAgIG9uLCBlbWl0LCBfZXZlbnRzLCBkYiwgZ2V0LCBzZXQsIGluaXQsIGlzTmV3LCBlcnJvcnMsIHNjaGVtYSwgb3B0aW9ucywgbW9kZWxOYW1lLCBjb2xsZWN0aW9uLCBfcHJlcywgX3Bvc3RzLCB0b09iamVjdFxuICpcbiAqIF9OT1RFOl8gVXNlIG9mIHRoZXNlIHRlcm1zIGFzIG1ldGhvZCBuYW1lcyBpcyBwZXJtaXR0ZWQsIGJ1dCBwbGF5IGF0IHlvdXIgb3duIHJpc2ssIGFzIHRoZXkgbWF5IGJlIGV4aXN0aW5nIG1vbmdvb3NlIGRvY3VtZW50IG1ldGhvZHMgeW91IGFyZSBzdG9tcGluZyBvbi5cbiAqXG4gKiAgICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICAgc2NoZW1hLm1ldGhvZHMuaW5pdCA9IGZ1bmN0aW9uICgpIHt9IC8vIHBvdGVudGlhbGx5IGJyZWFraW5nXG4gKi9cblNjaGVtYS5yZXNlcnZlZCA9IE9iamVjdC5jcmVhdGUoIG51bGwgKTtcbnZhciByZXNlcnZlZCA9IFNjaGVtYS5yZXNlcnZlZDtcbnJlc2VydmVkLm9uID1cbnJlc2VydmVkLmRiID1cbnJlc2VydmVkLmdldCA9XG5yZXNlcnZlZC5zZXQgPVxucmVzZXJ2ZWQuaW5pdCA9XG5yZXNlcnZlZC5pc05ldyA9XG5yZXNlcnZlZC5lcnJvcnMgPVxucmVzZXJ2ZWQuc2NoZW1hID1cbnJlc2VydmVkLm9wdGlvbnMgPVxucmVzZXJ2ZWQubW9kZWxOYW1lID1cbnJlc2VydmVkLmNvbGxlY3Rpb24gPVxucmVzZXJ2ZWQudG9PYmplY3QgPVxucmVzZXJ2ZWQuZG9tYWluID1cbnJlc2VydmVkLmVtaXQgPSAgICAvLyBFdmVudEVtaXR0ZXJcbnJlc2VydmVkLl9ldmVudHMgPSAvLyBFdmVudEVtaXR0ZXJcbnJlc2VydmVkLl9wcmVzID0gcmVzZXJ2ZWQuX3Bvc3RzID0gMTsgLy8gaG9va3MuanNcblxuLyoqXG4gKiBHZXRzL3NldHMgc2NoZW1hIHBhdGhzLlxuICpcbiAqIFNldHMgYSBwYXRoIChpZiBhcml0eSAyKVxuICogR2V0cyBhIHBhdGggKGlmIGFyaXR5IDEpXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKSAvLyByZXR1cm5zIGEgU2NoZW1hVHlwZVxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJywgTnVtYmVyKSAvLyBjaGFuZ2VzIHRoZSBzY2hlbWFUeXBlIG9mIGBuYW1lYCB0byBOdW1iZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGggPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIGlmIChvYmogPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnBhdGhzW3BhdGhdO1xuICAgIGlmICh0aGlzLnN1YnBhdGhzW3BhdGhdKSByZXR1cm4gdGhpcy5zdWJwYXRoc1twYXRoXTtcblxuICAgIC8vIHN1YnBhdGhzP1xuICAgIHJldHVybiAvXFwuXFxkK1xcLj8uKiQvLnRlc3QocGF0aClcbiAgICAgID8gZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aClcbiAgICAgIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gc29tZSBwYXRoIG5hbWVzIGNvbmZsaWN0IHdpdGggZG9jdW1lbnQgbWV0aG9kc1xuICBpZiAocmVzZXJ2ZWRbcGF0aF0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJgXCIgKyBwYXRoICsgXCJgIG1heSBub3QgYmUgdXNlZCBhcyBhIHNjaGVtYSBwYXRobmFtZVwiKTtcbiAgfVxuXG4gIC8vIHVwZGF0ZSB0aGUgdHJlZVxuICB2YXIgc3VicGF0aHMgPSBwYXRoLnNwbGl0KC9cXC4vKVxuICAgICwgbGFzdCA9IHN1YnBhdGhzLnBvcCgpXG4gICAgLCBicmFuY2ggPSB0aGlzLnRyZWU7XG5cbiAgc3VicGF0aHMuZm9yRWFjaChmdW5jdGlvbihzdWIsIGkpIHtcbiAgICBpZiAoIWJyYW5jaFtzdWJdKSBicmFuY2hbc3ViXSA9IHt9O1xuICAgIGlmICgnb2JqZWN0JyAhPSB0eXBlb2YgYnJhbmNoW3N1Yl0pIHtcbiAgICAgIHZhciBtc2cgPSAnQ2Fubm90IHNldCBuZXN0ZWQgcGF0aCBgJyArIHBhdGggKyAnYC4gJ1xuICAgICAgICAgICAgICArICdQYXJlbnQgcGF0aCBgJ1xuICAgICAgICAgICAgICArIHN1YnBhdGhzLnNsaWNlKDAsIGkpLmNvbmNhdChbc3ViXSkuam9pbignLicpXG4gICAgICAgICAgICAgICsgJ2AgYWxyZWFkeSBzZXQgdG8gdHlwZSAnICsgYnJhbmNoW3N1Yl0ubmFtZVxuICAgICAgICAgICAgICArICcuJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2hbc3ViXTtcbiAgfSk7XG5cbiAgYnJhbmNoW2xhc3RdID0gdXRpbHMuY2xvbmUob2JqKTtcblxuICB0aGlzLnBhdGhzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCBvYmopO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdHlwZSBhcmd1bWVudHMgaW50byBTY2hlbWEgVHlwZXMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogY29uc3RydWN0b3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEuaW50ZXJwcmV0QXNUeXBlID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICB2YXIgY29uc3RydWN0b3JOYW1lID0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9iai5jb25zdHJ1Y3Rvcik7XG4gIGlmIChjb25zdHJ1Y3Rvck5hbWUgIT0gJ09iamVjdCcpe1xuICAgIG9iaiA9IHsgdHlwZTogb2JqIH07XG4gIH1cblxuICAvLyBHZXQgdGhlIHR5cGUgbWFraW5nIHN1cmUgdG8gYWxsb3cga2V5cyBuYW1lZCBcInR5cGVcIlxuICAvLyBhbmQgZGVmYXVsdCB0byBtaXhlZCBpZiBub3Qgc3BlY2lmaWVkLlxuICAvLyB7IHR5cGU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnZnJlc2hjdXQnIH0gfVxuICB2YXIgdHlwZSA9IG9iai50eXBlICYmICFvYmoudHlwZS50eXBlXG4gICAgPyBvYmoudHlwZVxuICAgIDoge307XG5cbiAgaWYgKCdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlLmNvbnN0cnVjdG9yKSB8fCAnbWl4ZWQnID09IHR5cGUpIHtcbiAgICByZXR1cm4gbmV3IFR5cGVzLk1peGVkKHBhdGgsIG9iaik7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSB8fCBBcnJheSA9PSB0eXBlIHx8ICdhcnJheScgPT0gdHlwZSkge1xuICAgIC8vIGlmIGl0IHdhcyBzcGVjaWZpZWQgdGhyb3VnaCB7IHR5cGUgfSBsb29rIGZvciBgY2FzdGBcbiAgICB2YXIgY2FzdCA9IChBcnJheSA9PSB0eXBlIHx8ICdhcnJheScgPT0gdHlwZSlcbiAgICAgID8gb2JqLmNhc3RcbiAgICAgIDogdHlwZVswXTtcblxuICAgIGlmIChjYXN0IGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgY2FzdCwgb2JqKTtcbiAgICB9XG5cbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIGNhc3QpIHtcbiAgICAgIGNhc3QgPSBUeXBlc1tjYXN0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY2FzdC5zdWJzdHJpbmcoMSldO1xuICAgIH0gZWxzZSBpZiAoY2FzdCAmJiAoIWNhc3QudHlwZSB8fCBjYXN0LnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgICAgICAgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGNhc3QuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKGNhc3QpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIG5ldyBTY2hlbWEoY2FzdCksIG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBUeXBlcy5BcnJheShwYXRoLCBjYXN0IHx8IFR5cGVzLk1peGVkLCBvYmopO1xuICB9XG5cbiAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PSB0eXBlb2YgdHlwZVxuICAgID8gdHlwZVxuICAgIC8vIElmIG5vdCBzdHJpbmcsIGB0eXBlYCBpcyBhIGZ1bmN0aW9uLiBPdXRzaWRlIG9mIElFLCBmdW5jdGlvbi5uYW1lXG4gICAgLy8gZ2l2ZXMgeW91IHRoZSBmdW5jdGlvbiBuYW1lLiBJbiBJRSwgeW91IG5lZWQgdG8gY29tcHV0ZSBpdFxuICAgIDogdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUpO1xuXG4gIGlmIChuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT0gVHlwZXNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmRlZmluZWQgdHlwZSBhdCBgJyArIHBhdGggK1xuICAgICAgICAnYFxcbiAgRGlkIHlvdSB0cnkgbmVzdGluZyBTY2hlbWFzPyAnICtcbiAgICAgICAgJ1lvdSBjYW4gb25seSBuZXN0IHVzaW5nIHJlZnMgb3IgYXJyYXlzLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUeXBlc1tuYW1lXShwYXRoLCBvYmopO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aGUgc2NoZW1hcyBwYXRocyBzaW1pbGFyIHRvIEFycmF5I2ZvckVhY2guXG4gKlxuICogVGhlIGNhbGxiYWNrIGlzIHBhc3NlZCB0aGUgcGF0aG5hbWUgYW5kIHNjaGVtYVR5cGUgYXMgYXJndW1lbnRzIG9uIGVhY2ggaXRlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtTY2hlbWF9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZWFjaFBhdGggPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGZuKGtleXNbaV0sIHRoaXMucGF0aHNba2V5c1tpXV0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gQXJyYXkgb2YgcGF0aCBzdHJpbmdzIHRoYXQgYXJlIHJlcXVpcmVkIGJ5IHRoaXMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5yZXF1aXJlZFBhdGhzID0gZnVuY3Rpb24gcmVxdWlyZWRQYXRocyAoKSB7XG4gIGlmICh0aGlzLl9yZXF1aXJlZHBhdGhzKSByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcmV0ID0gW107XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHZhciBwYXRoID0gcGF0aHNbaV07XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0uaXNSZXF1aXJlZCkgcmV0LnB1c2gocGF0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocyA9IHJldDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGF0aFR5cGUgb2YgYHBhdGhgIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBHaXZlbiBhIHBhdGgsIHJldHVybnMgd2hldGhlciBpdCBpcyBhIHJlYWwsIHZpcnR1YWwsIG5lc3RlZCwgb3IgYWQtaG9jL3VuZGVmaW5lZCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhUeXBlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKHBhdGggaW4gdGhpcy5wYXRocykgcmV0dXJuICdyZWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy52aXJ0dWFscykgcmV0dXJuICd2aXJ0dWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy5uZXN0ZWQpIHJldHVybiAnbmVzdGVkJztcbiAgaWYgKHBhdGggaW4gdGhpcy5zdWJwYXRocykgcmV0dXJuICdyZWFsJztcblxuICBpZiAoL1xcLlxcZCtcXC58XFwuXFxkKyQvLnRlc3QocGF0aCkgJiYgZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aCkpIHtcbiAgICByZXR1cm4gJ3JlYWwnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnYWRob2NPclVuZGVmaW5lZCdcbiAgfVxufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZ2V0UG9zaXRpb25hbFBhdGggKHNlbGYsIHBhdGgpIHtcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuKFxcZCspXFwufFxcLihcXGQrKSQvKS5maWx0ZXIoQm9vbGVhbik7XG4gIGlmIChzdWJwYXRocy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHNlbGYucGF0aHNbc3VicGF0aHNbMF1dO1xuICB9XG5cbiAgdmFyIHZhbCA9IHNlbGYucGF0aChzdWJwYXRoc1swXSk7XG4gIGlmICghdmFsKSByZXR1cm4gdmFsO1xuXG4gIHZhciBsYXN0ID0gc3VicGF0aHMubGVuZ3RoIC0gMVxuICAgICwgc3VicGF0aFxuICAgICwgaSA9IDE7XG5cbiAgZm9yICg7IGkgPCBzdWJwYXRocy5sZW5ndGg7ICsraSkge1xuICAgIHN1YnBhdGggPSBzdWJwYXRoc1tpXTtcblxuICAgIGlmIChpID09PSBsYXN0ICYmIHZhbCAmJiAhdmFsLnNjaGVtYSAmJiAhL1xcRC8udGVzdChzdWJwYXRoKSkge1xuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFR5cGVzLkFycmF5KSB7XG4gICAgICAgIC8vIFN0cmluZ1NjaGVtYSwgTnVtYmVyU2NoZW1hLCBldGNcbiAgICAgICAgdmFsID0gdmFsLmNhc3RlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBpZiBpdHMganVzdCBhIHBvc2l0aW9uIHNlZ21lbnQ6IHBhdGguMC5zdWJwYXRoXG4gICAgaWYgKCEvXFxELy50ZXN0KHN1YnBhdGgpKSBjb250aW51ZTtcblxuICAgIGlmICghKHZhbCAmJiB2YWwuc2NoZW1hKSkge1xuICAgICAgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFsID0gdmFsLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGYuc3VicGF0aHNbcGF0aF0gPSB2YWw7XG59XG5cbi8qKlxuICogQWRkcyBhIG1ldGhvZCBjYWxsIHRvIHRoZSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBkb2N1bWVudCBtZXRob2QgdG8gY2FsbCBsYXRlclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xuICB0aGlzLmNhbGxRdWV1ZS5wdXNoKFtuYW1lLCBhcmdzXSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcHJlIGhvb2sgZm9yIHRoZSBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgdG95U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3NhdmUnLCBmdW5jdGlvbiAobmV4dCkge1xuICogICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuY3JlYXRlZCA9IG5ldyBEYXRlO1xuICogICAgICAgbmV4dCgpO1xuICogICAgIH0pXG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3ZhbGlkYXRlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICh0aGlzLm5hbWUgIT0gJ1dvb2R5JykgdGhpcy5uYW1lID0gJ1dvb2R5JztcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ3ByZScsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBwb3N0IGZvciB0aGUgZG9jdW1lbnRcbiAqXG4gKiBQb3N0IGhvb2tzIGZpcmUgYG9uYCB0aGUgZXZlbnQgZW1pdHRlZCBmcm9tIGRvY3VtZW50IGluc3RhbmNlcyBvZiBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5wb3N0KCdzYXZlJywgZnVuY3Rpb24gKGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZWQgYWZ0ZXIgYSBkb2N1bWVudCB3YXMgc2F2ZWQnKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIE1vZGVsID0gbW9uZ29vc2UubW9kZWwoJ01vZGVsJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgdmFyIG0gPSBuZXcgTW9kZWwoLi4pO1xuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlcyBhZnRlciB0aGUgYHBvc3RgIGhvb2snKTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBob29rXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbihtZXRob2QsIGZuKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ29uJywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwbHVnaW4gY2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gKiBAc2VlIHBsdWdpbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGx1Z2luID0gZnVuY3Rpb24gKGZuLCBvcHRzKSB7XG4gIGZuKHRoaXMsIG9wdHMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBpbnN0YW5jZSBtZXRob2QgdG8gZG9jdW1lbnRzIGNvbnN0cnVjdGVkIGZyb20gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IGtpdHR5U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHNjaGVtYS5tZXRob2QoJ21lb3cnLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnbWVlZWVlb29vb29vb29vb29vdycpO1xuICogICAgIH0pXG4gKlxuICogICAgIHZhciBLaXR0eSA9IG1vbmdvb3NlLm1vZGVsKCdLaXR0eScsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBmaXp6ID0gbmV3IEtpdHR5O1xuICogICAgIGZpenoubWVvdygpOyAvLyBtZWVlZWVvb29vb29vb29vb29vd1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBtZXRob2RzLlxuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKHtcbiAqICAgICAgICAgcHVycjogZnVuY3Rpb24gKCkge31cbiAqICAgICAgICwgc2NyYXRjaDogZnVuY3Rpb24gKCkge31cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gbGF0ZXJcbiAqICAgICBmaXp6LnB1cnIoKTtcbiAqICAgICBmaXp6LnNjcmF0Y2goKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG1ldGhvZCBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKVxuICAgICAgdGhpcy5tZXRob2RzW2ldID0gbmFtZVtpXTtcbiAgZWxzZVxuICAgIHRoaXMubWV0aG9kc1tuYW1lXSA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBzdGF0aWMgXCJjbGFzc1wiIG1ldGhvZHMgdG8gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5zdGF0aWMoJ2ZpbmRCeU5hbWUnLCBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmZpbmQoeyBuYW1lOiBuYW1lIH0sIGNhbGxiYWNrKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIERyaW5rID0gbW9uZ29vc2UubW9kZWwoJ0RyaW5rJywgc2NoZW1hKTtcbiAqICAgICBEcmluay5maW5kQnlOYW1lKCdzYW5wZWxsZWdyaW5vJywgZnVuY3Rpb24gKGVyciwgZHJpbmtzKSB7XG4gKiAgICAgICAvL1xuICogICAgIH0pO1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBzdGF0aWNzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5zdGF0aWMgPSBmdW5jdGlvbihuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKVxuICAgICAgdGhpcy5zdGF0aWNzW2ldID0gbmFtZVtpXTtcbiAgZWxzZVxuICAgIHRoaXMuc3RhdGljc1tuYW1lXSA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cy9nZXRzIGEgc2NoZW1hIG9wdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbiBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBpZiBub3QgcGFzc2VkLCB0aGUgY3VycmVudCBvcHRpb24gdmFsdWUgaXMgcmV0dXJuZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgaWYgKDEgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zW2tleV07XG4gIH1cblxuICB0aGlzLm9wdGlvbnNba2V5XSA9IHZhbHVlO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIGEgc2NoZW1hIG9wdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbiBuYW1lXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblNjaGVtYS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gdGhpcy5vcHRpb25zW2tleV07XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSB2aXJ0dWFsIHR5cGUgd2l0aCB0aGUgZ2l2ZW4gbmFtZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHJldHVybiB7VmlydHVhbFR5cGV9XG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsID0gZnVuY3Rpb24gKG5hbWUsIG9wdGlvbnMpIHtcbiAgdmFyIHZpcnR1YWxzID0gdGhpcy52aXJ0dWFscztcbiAgdmFyIHBhcnRzID0gbmFtZS5zcGxpdCgnLicpO1xuICByZXR1cm4gdmlydHVhbHNbbmFtZV0gPSBwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKG1lbSwgcGFydCwgaSkge1xuICAgIG1lbVtwYXJ0XSB8fCAobWVtW3BhcnRdID0gKGkgPT09IHBhcnRzLmxlbmd0aC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gbmV3IFZpcnR1YWxUeXBlKG9wdGlvbnMsIG5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB7fSk7XG4gICAgcmV0dXJuIG1lbVtwYXJ0XTtcbiAgfSwgdGhpcy50cmVlKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7VmlydHVhbFR5cGV9XG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFscGF0aCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHJldHVybiB0aGlzLnZpcnR1YWxzW25hbWVdO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcmVkIGRpc2NyaW1pbmF0b3JzIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAcHJvcGVydHkgZGlzY3JpbWluYXRvcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5kaXNjcmltaW5hdG9ycztcblxuLyoqXG4gKiDQndCw0YHQu9C10LTQvtCy0LDQvdC40LUg0L7RgiDRgdGF0LXQvNGLLlxuICogdGhpcyAtINCx0LDQt9C+0LLQsNGPINGB0YXQtdC80LAhISFcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB2YXIgUGVyc29uU2NoZW1hID0gbmV3IFNjaGVtYSgnUGVyc29uJywge1xuICogICAgICAgbmFtZTogU3RyaW5nLFxuICogICAgICAgY3JlYXRlZEF0OiBEYXRlXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBCb3NzU2NoZW1hID0gbmV3IFNjaGVtYSgnQm9zcycsIFBlcnNvblNjaGVtYSwgeyBkZXBhcnRtZW50OiBTdHJpbmcgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgICBkaXNjcmltaW5hdG9yIG5hbWVcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgZGlzY3JpbWluYXRvciBzY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZGlzY3JpbWluYXRvciA9IGZ1bmN0aW9uIGRpc2NyaW1pbmF0b3IgKG5hbWUsIHNjaGVtYSkge1xuICBpZiAoIShzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG11c3QgcGFzcyBhIHZhbGlkIGRpc2NyaW1pbmF0b3IgU2NoZW1hXCIpO1xuICB9XG5cbiAgaWYgKCB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nICYmICF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdCApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIFxcXCJcIiArIG5hbWUgKyBcIlxcXCIgY2FuIG9ubHkgYmUgYSBkaXNjcmltaW5hdG9yIG9mIHRoZSByb290IG1vZGVsXCIpO1xuICB9XG5cbiAgdmFyIGtleSA9IHRoaXMub3B0aW9ucy5kaXNjcmltaW5hdG9yS2V5O1xuICBpZiAoIHNjaGVtYS5wYXRoKGtleSkgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGNhbm5vdCBoYXZlIGZpZWxkIHdpdGggbmFtZSBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XG4gIH1cblxuICAvLyBtZXJnZXMgYmFzZSBzY2hlbWEgaW50byBuZXcgZGlzY3JpbWluYXRvciBzY2hlbWEgYW5kIHNldHMgbmV3IHR5cGUgZmllbGQuXG4gIChmdW5jdGlvbiBtZXJnZVNjaGVtYXMoc2NoZW1hLCBiYXNlU2NoZW1hKSB7XG4gICAgdXRpbHMubWVyZ2Uoc2NoZW1hLCBiYXNlU2NoZW1hKTtcblxuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmpba2V5XSA9IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiBuYW1lIH07XG4gICAgc2NoZW1hLmFkZChvYmopO1xuICAgIHNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBuYW1lLCBpc1Jvb3Q6IGZhbHNlIH07XG5cbiAgICBpZiAoYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb24pIHtcbiAgICAgIHNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb24gPSBiYXNlU2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbjtcbiAgICB9XG5cbiAgICAgIC8vIHRocm93cyBlcnJvciBpZiBvcHRpb25zIGFyZSBpbnZhbGlkXG4gICAgKGZ1bmN0aW9uIHZhbGlkYXRlT3B0aW9ucyhhLCBiKSB7XG4gICAgICBhID0gdXRpbHMuY2xvbmUoYSk7XG4gICAgICBiID0gdXRpbHMuY2xvbmUoYik7XG4gICAgICBkZWxldGUgYS50b0pTT047XG4gICAgICBkZWxldGUgYS50b09iamVjdDtcbiAgICAgIGRlbGV0ZSBiLnRvSlNPTjtcbiAgICAgIGRlbGV0ZSBiLnRvT2JqZWN0O1xuXG4gICAgICBpZiAoIXV0aWxzLmRlZXBFcXVhbChhLCBiKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIG9wdGlvbnMgYXJlIG5vdCBjdXN0b21pemFibGUgKGV4Y2VwdCB0b0pTT04gJiB0b09iamVjdClcIik7XG4gICAgICB9XG4gICAgfSkoc2NoZW1hLm9wdGlvbnMsIGJhc2VTY2hlbWEub3B0aW9ucyk7XG5cbiAgICB2YXIgdG9KU09OID0gc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICAsIHRvT2JqZWN0ID0gc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XG5cbiAgICBzY2hlbWEub3B0aW9ucyA9IHV0aWxzLmNsb25lKGJhc2VTY2hlbWEub3B0aW9ucyk7XG4gICAgaWYgKHRvSlNPTikgICBzY2hlbWEub3B0aW9ucy50b0pTT04gPSB0b0pTT047XG4gICAgaWYgKHRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHRvT2JqZWN0O1xuXG4gICAgLy9zY2hlbWEuY2FsbFF1ZXVlID0gYmFzZVNjaGVtYS5jYWxsUXVldWUuY29uY2F0KHNjaGVtYS5jYWxsUXVldWUpO1xuICAgIHNjaGVtYS5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDsgLy8gcmVzZXQganVzdCBpbiBjYXNlIFNjaGVtYSNyZXF1aXJlZFBhdGhzKCkgd2FzIGNhbGxlZCBvbiBlaXRoZXIgc2NoZW1hXG4gIH0pKHNjaGVtYSwgdGhpcyk7XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JzKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9ycyA9IHt9O1xuICB9XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBudWxsLCBpc1Jvb3Q6IHRydWUgfTtcbiAgfVxuXG4gIGlmICh0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciB3aXRoIG5hbWUgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBhbHJlYWR5IGV4aXN0c1wiKTtcbiAgfVxuXG4gIHRoaXMuZGlzY3JpbWluYXRvcnNbbmFtZV0gPSBzY2hlbWE7XG59O1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYTtcbndpbmRvdy5TY2hlbWEgPSBTY2hlbWE7XG5cbi8vIHJlcXVpcmUgZG93biBoZXJlIGJlY2F1c2Ugb2YgcmVmZXJlbmNlIGlzc3Vlc1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIGJ1aWx0LWluIE1vbmdvb3NlIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQ7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW1N0cmluZ10oI3NjaGVtYS1zdHJpbmctanMpXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxuICogLSBbQm9vbGVhbl0oI3NjaGVtYS1ib29sZWFuLWpzKSB8IEJvb2xcbiAqIC0gW0FycmF5XSgjc2NoZW1hLWFycmF5LWpzKVxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxuICogLSBbT2JqZWN0SWRdKCNzY2hlbWEtb2JqZWN0aWQtanMpIHwgT2lkXG4gKiAtIFtNaXhlZF0oI3NjaGVtYS1taXhlZC1qcykgfCBPYmplY3RcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgTWl4ZWRgIFNjaGVtYVR5cGUsIHdlIGNhbiB1c2UgdGhlbSBpbiBvdXIgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XG4gKiAgICAgbmV3IG1vbmdvb3NlLlNjaGVtYSh7IF91c2VyOiBNaXhlZCB9KVxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5UeXBlcyA9IHJlcXVpcmUoJy4vc2NoZW1hL2luZGV4Jyk7XG5cbi8vINCl0YDQsNC90LjQu9C40YnQtSDRgdGF0LXQvFxuU2NoZW1hLnNjaGVtYXMgPSBzY2hlbWFzID0ge307XG5cblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcbnZhciBPYmplY3RJZCA9IFNjaGVtYS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBUeXBlcyA9IHtcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcbiAgICAgICwgRGF0ZTogcmVxdWlyZSgnLi9kYXRlJylcbiAgICAgICwgTnVtYmVyOiByZXF1aXJlKCcuL251bWJlcicpXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxuICAgICAgLCBPYmplY3RJZDogcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICAgfVxuICAsIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2FycmF5JylcbiAgLCBNaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIEVtYmVkZGVkRG9jO1xuXG4vKipcbiAqIEFycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYVR5cGV9IGNhc3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYUFycmF5IChrZXksIGNhc3QsIG9wdGlvbnMpIHtcbiAgaWYgKGNhc3QpIHtcbiAgICB2YXIgY2FzdE9wdGlvbnMgPSB7fTtcblxuICAgIGlmICgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBjYXN0LmNvbnN0cnVjdG9yICkgKSB7XG4gICAgICBpZiAoY2FzdC50eXBlKSB7XG4gICAgICAgIC8vIHN1cHBvcnQgeyB0eXBlOiBXb290IH1cbiAgICAgICAgY2FzdE9wdGlvbnMgPSBfLmNsb25lKCBjYXN0ICk7IC8vIGRvIG5vdCBhbHRlciB1c2VyIGFyZ3VtZW50c1xuICAgICAgICBkZWxldGUgY2FzdE9wdGlvbnMudHlwZTtcbiAgICAgICAgY2FzdCA9IGNhc3QudHlwZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhc3QgPSBNaXhlZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IHsgdHlwZTogJ1N0cmluZycgfVxuICAgIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIGNhc3RcbiAgICAgID8gY2FzdFxuICAgICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QgKTtcblxuICAgIHZhciBjYXN0ZXIgPSBuYW1lIGluIFR5cGVzXG4gICAgICA/IFR5cGVzW25hbWVdXG4gICAgICA6IGNhc3Q7XG5cbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gY2FzdGVyO1xuICAgIHRoaXMuY2FzdGVyID0gbmV3IGNhc3RlcihudWxsLCBjYXN0T3B0aW9ucyk7XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBFbWJlZGRlZERvYyB8fCAoRW1iZWRkZWREb2MgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpKTtcblxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XG4gICAgICB0aGlzLmNhc3Rlci5wYXRoID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xuXG4gIHZhciBzZWxmID0gdGhpc1xuICAgICwgZGVmYXVsdEFyclxuICAgICwgZm47XG5cbiAgaWYgKHRoaXMuZGVmYXVsdFZhbHVlKSB7XG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuICAgIGZuID0gJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGVmYXVsdEFycjtcbiAgfVxuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbiA/IGRlZmF1bHRBcnIoKSA6IGRlZmF1bHRBcnIgfHwgW107XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlQXJyYXkoYXJyLCBzZWxmLnBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblNjaGVtYUFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUFycmF5O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGVzIHRoZSBnZXR0ZXJzIGFwcGxpY2F0aW9uIGZvciB0aGUgcG9wdWxhdGlvbiBzcGVjaWFsLWNhc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIGlmICh0aGlzLmNhc3Rlci5vcHRpb25zICYmIHRoaXMuY2FzdGVyLm9wdGlvbnMucmVmKSB7XG4gICAgLy8gbWVhbnMgdGhlIG9iamVjdCBpZCB3YXMgcG9wdWxhdGVkXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIFNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycy5jYWxsKHRoaXMsIHZhbHVlLCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIHZhbHVlcyBmb3Igc2V0KCkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0IHdoZXRoZXIgdGhpcyBpcyBhbiBpbml0aWFsaXphdGlvbiBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQgKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmICghKHZhbHVlLmlzU3RvcmFnZUFycmF5KSkge1xuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FzdGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhbHVlW2ldID0gdGhpcy5jYXN0ZXIuY2FzdCh2YWx1ZVtpXSwgZG9jLCBpbml0KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyByZXRocm93XG4gICAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoZS50eXBlLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQpO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogQm9vbGVhbiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBwYXRoLCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9vbGVhblNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG52YXIgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3I7XG5cbi8qKlxuICogRGF0ZSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEYXRlU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgZGF0ZVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIERhdGU7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGRhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJylcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICB2YXIgZGF0ZTtcblxuICAvLyBzdXBwb3J0IGZvciB0aW1lc3RhbXBzXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSlcbiAgICBkYXRlID0gbmV3IERhdGUoTnVtYmVyKHZhbHVlKSk7XG5cbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXG4gIGVsc2UgaWYgKHZhbHVlLnRvU3RyaW5nKVxuICAgIGRhdGUgPSBuZXcgRGF0ZSh2YWx1ZS50b1N0cmluZygpKTtcblxuICBpZiAoZGF0ZS50b1N0cmluZygpICE9ICdJbnZhbGlkIERhdGUnKVxuICAgIHJldHVybiBkYXRlO1xuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ2RhdGUnLCB2YWx1ZSwgdGhpcy5wYXRoICk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVNjaGVtYTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQXJyYXlUeXBlID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgU3RvcmFnZURvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9kb2N1bWVudGFycmF5JylcbiAgLCBTdWJkb2N1bWVudCA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaiBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbal0gPSBzY2hlbWEuc3RhdGljc1tqXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50QXJyYXk7XG5cbi8qKlxuICogUGVyZm9ybXMgbG9jYWwgdmFsaWRhdGlvbnMgZmlyc3QsIHRoZW4gdmFsaWRhdGlvbnMgb24gZWFjaCBlbWJlZGRlZCBkb2NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgZm4sIHNjb3BlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBTY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlLmNhbGwodGhpcywgYXJyYXksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcblxuICAgIHZhciBjb3VudCA9IGFycmF5ICYmIGFycmF5Lmxlbmd0aFxuICAgICAgLCBlcnJvcjtcblxuICAgIGlmICghY291bnQpIHJldHVybiBmbigpO1xuXG4gICAgLy8gaGFuZGxlIHNwYXJzZSBhcnJheXMsIGRvIG5vdCB1c2UgYXJyYXkuZm9yRWFjaCB3aGljaCBkb2VzIG5vdFxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzcGFyc2UgZWxlbWVudHMgeWV0IHJlcG9ydHMgYXJyYXkubGVuZ3RoIGluY2x1ZGluZ1xuICAgIC8vIHRoZW0gOihcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgIShmdW5jdGlvbiAoaSkge1xuICAgICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XG4gICAgICAgICAgICAvLyByZXdyaXRlIHRoZSBrZXlcbiAgICAgICAgICAgIGVyci5rZXkgPSBzZWxmLmtleSArICcuJyArIGkgKyAnLicgKyBlcnIua2V5O1xuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKGkpO1xuICAgIH1cbiAgfSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyBjb250ZW50c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCBmbGFnXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jLCBpbml0LCBwcmV2KSB7XG4gIHZhciBzZWxlY3RlZFxuICAgICwgc3ViZG9jXG4gICAgLCBpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCwgcHJldik7XG4gIH1cblxuICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VEb2N1bWVudEFycmF5KSkge1xuICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgaWYgKHByZXYgJiYgcHJldi5faGFuZGxlcnMpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgICBkb2Mub2ZmKGtleSwgcHJldi5faGFuZGxlcnNba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaSA9IHZhbHVlLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKCEodmFsdWVbaV0gaW5zdGFuY2VvZiBTdWJkb2N1bWVudCkgJiYgdmFsdWVbaV0pIHtcbiAgICAgIGlmIChpbml0KSB7XG4gICAgICAgIHNlbGVjdGVkIHx8IChzZWxlY3RlZCA9IHNjb3BlUGF0aHModGhpcywgZG9jLiRfXy5zZWxlY3RlZCwgaW5pdCkpO1xuICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3RvcihudWxsLCB2YWx1ZSwgdHJ1ZSwgc2VsZWN0ZWQpO1xuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYy5pbml0KHZhbHVlW2ldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3ViZG9jID0gcHJldi5pZCh2YWx1ZVtpXS5faWQpO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICAgICAgaWYgKHByZXYgJiYgc3ViZG9jKSB7XG4gICAgICAgICAgLy8gaGFuZGxlIHJlc2V0dGluZyBkb2Mgd2l0aCBleGlzdGluZyBpZCBidXQgZGlmZmVyaW5nIGRhdGFcbiAgICAgICAgICAvLyBkb2MuYXJyYXkgPSBbeyBkb2M6ICd2YWwnIH1dXG4gICAgICAgICAgc3ViZG9jLnNldCh2YWx1ZVtpXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3ViZG9jID0gbmV3IHRoaXMuY2FzdGVyQ29uc3RydWN0b3IodmFsdWVbaV0sIHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHNldCgpIGlzIGhvb2tlZCBpdCB3aWxsIGhhdmUgbm8gcmV0dXJuIHZhbHVlXG4gICAgICAgIC8vIHNlZSBnaC03NDZcbiAgICAgICAgdmFsdWVbaV0gPSBzdWJkb2M7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiBTY29wZXMgcGF0aHMgc2VsZWN0ZWQgaW4gYSBxdWVyeSB0byB0aGlzIGFycmF5LlxuICogTmVjZXNzYXJ5IGZvciBwcm9wZXIgZGVmYXVsdCBhcHBsaWNhdGlvbiBvZiBzdWJkb2N1bWVudCB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudEFycmF5fSBhcnJheSAtIHRoZSBhcnJheSB0byBzY29wZSBgZmllbGRzYCBwYXRoc1xuICogQHBhcmFtIHtPYmplY3R8dW5kZWZpbmVkfSBmaWVsZHMgLSB0aGUgcm9vdCBmaWVsZHMgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5XG4gKiBAcGFyYW0ge0Jvb2xlYW58dW5kZWZpbmVkfSBpbml0IC0gaWYgd2UgYXJlIGJlaW5nIGNyZWF0ZWQgcGFydCBvZiBhIHF1ZXJ5IHJlc3VsdFxuICovXG5mdW5jdGlvbiBzY29wZVBhdGhzIChhcnJheSwgZmllbGRzLCBpbml0KSB7XG4gIGlmICghKGluaXQgJiYgZmllbGRzKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICB2YXIgcGF0aCA9IGFycmF5LnBhdGggKyAnLidcbiAgICAsIGtleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIHNlbGVjdGVkID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoMCA9PT0ga2V5LmluZGV4T2YocGF0aCkpIHtcbiAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcbiAgICAgIHNlbGVjdGVkW2tleS5zdWJzdHJpbmcocGF0aC5sZW5ndGgpXSA9IGZpZWxkc1trZXldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoYXNLZXlzICYmIHNlbGVjdGVkIHx8IHVuZGVmaW5lZDtcbn1cblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50QXJyYXk7XG4iLCJcbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5TdHJpbmcgPSByZXF1aXJlKCcuL3N0cmluZycpO1xuXG5leHBvcnRzLk51bWJlciA9IHJlcXVpcmUoJy4vbnVtYmVyJyk7XG5cbmV4cG9ydHMuQm9vbGVhbiA9IHJlcXVpcmUoJy4vYm9vbGVhbicpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxuZXhwb3J0cy5EYXRlID0gcmVxdWlyZSgnLi9kYXRlJyk7XG5cbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG5cbmV4cG9ydHMuTWl4ZWQgPSByZXF1aXJlKCcuL21peGVkJyk7XG5cbi8vIGFsaWFzXG5cbmV4cG9ydHMuT2lkID0gZXhwb3J0cy5PYmplY3RJZDtcbmV4cG9ydHMuT2JqZWN0ID0gZXhwb3J0cy5NaXhlZDtcbmV4cG9ydHMuQm9vbCA9IGV4cG9ydHMuQm9vbGVhbjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBNaXhlZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBNaXhlZCAocGF0aCwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHQpIHtcbiAgICB2YXIgZGVmID0gb3B0aW9ucy5kZWZhdWx0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRlZikgJiYgMCA9PT0gZGVmLmxlbmd0aCkge1xuICAgICAgLy8gbWFrZSBzdXJlIGVtcHR5IGFycmF5IGRlZmF1bHRzIGFyZSBoYW5kbGVkXG4gICAgICBvcHRpb25zLmRlZmF1bHQgPSBBcnJheTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNoYXJlZCAmJlxuICAgICAgICAgICAgICAgXy5pc1BsYWluT2JqZWN0KGRlZikgJiZcbiAgICAgICAgICAgICAgIDAgPT09IE9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSB7XG4gICAgICAvLyBwcmV2ZW50IG9kZCBcInNoYXJlZFwiIG9iamVjdHMgYmV0d2VlbiBkb2N1bWVudHNcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTWl4ZWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk1peGVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1peGVkO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICh2YWwgIT09IHVuZGVmaW5lZCkgJiYgKHZhbCAhPT0gbnVsbCk7XG59O1xuXG4vKipcbiAqIENhc3RzIGB2YWxgIGZvciBNaXhlZC5cbiAqXG4gKiBfdGhpcyBpcyBhIG5vLW9wX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTWl4ZWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGVkO1xuIiwiLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlcztcblxuLyoqXG4gKiBOdW1iZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBOdW1iZXJTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnTnVtYmVyJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJTY2hlbWE7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yIGZvciBudW1iZXJcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyO1xuICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSBtaW5pbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDkgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNSU59IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtaW4gPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKHtNSU59KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IG1pbiB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1pbmltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWluID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1pblZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMubWluVmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLk51bWJlci5taW47XG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNSU59LywgdmFsdWUpO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLm1pblZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2ID49IHZhbHVlO1xuICAgIH0sIG1zZywgJ21pbiddKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgbWF4aW11bSBudW1iZXIgdmFsaWRhdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuOiAxMSB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXG4gKiAgICAgICBtLm4gPSAxMDtcbiAqICAgICAgIG0uc2F2ZSgpIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01BWH0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAgICAgdmFyIG1heCA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBleGNlZWRzIHRoZSBsaW1pdCAoe01BWH0pLiddO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogbWF4IH0pXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XG4gKiAgICAgcy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGV4Y2VlZHMgdGhlIGxpbWl0ICgxMCkuXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWF4aW11bSBudW1iZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5tYXggPSBmdW5jdGlvbiAodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMubWF4VmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMubWF4VmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLk51bWJlci5tYXg7XG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNQVh9LywgdmFsdWUpO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLm1heFZhbGlkYXRvciA9IGZ1bmN0aW9uKHYpe1xuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA8PSB2YWx1ZTtcbiAgICB9LCBtc2csICdtYXgnXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gbnVtYmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICB2YXIgdmFsID0gdmFsdWUgJiYgdmFsdWUuX2lkXG4gICAgPyB2YWx1ZS5faWQgLy8gZG9jdW1lbnRzXG4gICAgOiB2YWx1ZTtcblxuICBpZiAoIWlzTmFOKHZhbCkpe1xuICAgIGlmIChudWxsID09PSB2YWwpIHJldHVybiB2YWw7XG4gICAgaWYgKCcnID09PSB2YWwpIHJldHVybiBudWxsO1xuICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgdmFsKSB2YWwgPSBOdW1iZXIodmFsKTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gdmFsO1xuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICh2YWwudG9TdHJpbmcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSAmJlxuICAgICAgICB2YWwudG9TdHJpbmcoKSA9PSBOdW1iZXIodmFsKSkge1xuICAgICAgcmV0dXJuIG5ldyBOdW1iZXIodmFsKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdudW1iZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJTY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBPYmplY3RJZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnT2JqZWN0SWQnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5PYmplY3RJZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPYmplY3RJZDtcblxuLyoqXG4gKiBBZGRzIGFuIGF1dG8tZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHQgaWYgdHVybk9uIGlzIHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmF1dG8gPSBmdW5jdGlvbiAoIHR1cm5PbiApIHtcbiAgaWYgKCB0dXJuT24gKSB7XG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcbiAgICB0aGlzLnNldCggcmVzZXRJZCApXG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBvaWQ7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgLy8gd2FpdCEgd2UgbWF5IG5lZWQgdG8gY2FzdCB0aGlzIHRvIGEgZG9jdW1lbnRcblxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gbGF6eSBsb2FkXG4gICAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi8uLi9kb2N1bWVudCcpKTtcblxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERvY3VtZW50KSB7XG4gICAgICB2YWx1ZS4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQgKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBlbHNlIGlmICggIV8uaXNQbGFpbk9iamVjdCggdmFsdWUgKSApIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgLy8g0J3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtSwg0YPQutCw0LfQsNC90L3QvtC5INCyINGB0YHRi9C70LrQtVxuICAgIHZhciBzY2hlbWEgPSB0aGlzLm9wdGlvbnMucmVmO1xuICAgIGlmICggIXNjaGVtYSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDRgdGF0LXQvNGDLCDQv9C+INC60L7RgtC+0YDQvtC5INGN0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YHQvtC30LTQsNCy0LDRgtGMJyk7XG4gICAgfVxuXG4gICAgaWYgKCAhc3RvcmFnZS5zY2hlbWFzWyBzY2hlbWEgXSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDQvdCw0LfQstCw0L3QuNC1INGB0YXQtdC80Ysg0L3QsCDQutC+0YLQvtGA0YPRjiDRgdGB0YvQu9Cw0LXQvNGB0Y8g0L/RgNC4INC10ZEg0YHQvtC30LTQsNC90LjQuCAoIG5ldyBTY2hlbWEoXCJuYW1lXCIsIHNjaGVtYU9iamVjdCkgKScpO1xuICAgIH1cblxuICAgIC8vIGluaXQgZG9jXG4gICAgdmFyIGRvYyA9IG5ldyBEb2N1bWVudCggdmFsdWUsIHVuZGVmaW5lZCwgc3RvcmFnZS5zY2hlbWFzWyBzY2hlbWEgXSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gICAgZG9jLiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIGRvYztcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZClcbiAgICByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKCB2YWx1ZS5faWQgJiYgdmFsdWUuX2lkIGluc3RhbmNlb2Ygb2lkIClcbiAgICByZXR1cm4gdmFsdWUuX2lkO1xuXG4gIGlmICh2YWx1ZS50b1N0cmluZykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gb2lkLmNyZWF0ZUZyb21IZXhTdHJpbmcodmFsdWUudG9TdHJpbmcoKSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG59O1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5mdW5jdGlvbiBkZWZhdWx0SWQgKCkge1xuICByZXR1cm4gbmV3IG9pZCgpO1xufVxuXG5mdW5jdGlvbiByZXNldElkICh2KSB7XG4gIHRoaXMuJF9fLl9pZCA9IG51bGw7XG4gIHJldHVybiB2O1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFN0cmluZyBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gU3RyaW5nU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgdGhpcy5lbnVtVmFsdWVzID0gW107XG4gIHRoaXMucmVnRXhwID0gbnVsbDtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ1N0cmluZycpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nU2NoZW1hO1xuXG4vKipcbiAqIEFkZHMgYW4gZW51bSB2YWxpZGF0b3JcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHN0YXRlcyA9ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJylcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IHN0YXRlcyB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGBpbnZhbGlkYCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGBzdGF0ZWAuXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvciB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIHZhciBlbnUgPSB7XG4gKiAgICAgICB2YWx1ZXM6ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJyksXG4gKiAgICAgICBtZXNzYWdlOiAnZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gJ1xuICogICAgIH1cbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IGVudSB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGBzdGF0ZWAgd2l0aCB2YWx1ZSBgaW52YWxpZGBcbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBbYXJncy4uLl0gZW51bWVyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuZW51bSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZW51bVZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLmVudW1WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZmFsc2U7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0gfHwgZmFsc2UgPT09IGFyZ3VtZW50c1swXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbHVlcztcbiAgdmFyIGVycm9yTWVzc2FnZTtcblxuICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZ3VtZW50c1swXSkpIHtcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHNbMF0udmFsdWVzO1xuICAgIGVycm9yTWVzc2FnZSA9IGFyZ3VtZW50c1swXS5tZXNzYWdlO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLlN0cmluZy5lbnVtO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZXNbaV0pIHtcbiAgICAgIHRoaXMuZW51bVZhbHVlcy5wdXNoKHRoaXMuY2FzdCh2YWx1ZXNbaV0pKTtcbiAgICB9XG4gIH1cblxuICB2YXIgdmFscyA9IHRoaXMuZW51bVZhbHVlcztcbiAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2IHx8IH52YWxzLmluZGV4T2Yodik7XG4gIH07XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLmVudW1WYWxpZGF0b3IsIGVycm9yTWVzc2FnZSwgJ2VudW0nXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBsb3dlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGVtYWlsOiAnU29tZUVtYWlsQGV4YW1wbGUuQ09NJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmVtYWlsKSAvLyBzb21lZW1haWxAZXhhbXBsZS5jb21cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiB2O1xuICB9KTtcbn07XG5cbi8qKlxuICogQWRkcyBhbiB1cHBlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBjYXBzOiB7IHR5cGU6IFN0cmluZywgdXBwZXJjYXNlOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgY2FwczogJ2FuIGV4YW1wbGUnIH0pO1xuICogICAgIGNvbnNvbGUubG9nKG0uY2FwcykgLy8gQU4gRVhBTVBMRVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudXBwZXJjYXNlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvVXBwZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdHJpbSBzZXR0ZXIuXG4gKlxuICogVGhlIHN0cmluZyB2YWx1ZSB3aWxsIGJlIHRyaW1tZWQgd2hlbiBzZXQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB0cmltOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBzdHJpbmcgPSAnIHNvbWUgbmFtZSAnXG4gKiAgICAgY29uc29sZS5sb2coc3RyaW5nLmxlbmd0aCkgLy8gMTFcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogc3RyaW5nIH0pXG4gKiAgICAgY29uc29sZS5sb2cobS5uYW1lLmxlbmd0aCkgLy8gOVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudHJpbSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50cmltKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmVnZXhwIHZhbGlkYXRvci5cbiAqXG4gKiBBbnkgdmFsdWUgdGhhdCBkb2VzIG5vdCBwYXNzIGByZWdFeHBgLnRlc3QodmFsKSB3aWxsIGZhaWwgdmFsaWRhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiAnSSBhbSBpbnZhbGlkJyB9KVxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFBhdGggYG5hbWVgIGlzIGludmFsaWQgKEkgYW0gaW52YWxpZCkuXCJcbiAqICAgICAgIG0ubmFtZSA9ICdhcHBsZXMnXG4gKiAgICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICAgYXNzZXJ0Lm9rKGVycikgLy8gc3VjY2Vzc1xuICogICAgICAgfSlcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyB1c2luZyBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiAgICAgdmFyIG1hdGNoID0gWyAvXFwuaHRtbCQvLCBcIlRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoe1ZBTFVFfSlcIiBdO1xuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGZpbGU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogbWF0Y2ggfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBmaWxlOiAnaW52YWxpZCcgfSk7XG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoaW52YWxpZClcIlxuICogICAgIH0pXG4gKlxuICogRW1wdHkgc3RyaW5ncywgYHVuZGVmaW5lZGAsIGFuZCBgbnVsbGAgdmFsdWVzIGFsd2F5cyBwYXNzIHRoZSBtYXRjaCB2YWxpZGF0b3IuIElmIHlvdSByZXF1aXJlIHRoZXNlIHZhbHVlcywgZW5hYmxlIHRoZSBgcmVxdWlyZWRgIHZhbGlkYXRvciBhbHNvLlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8sIHJlcXVpcmVkOiB0cnVlIH19KVxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSByZWdFeHAgcmVndWxhciBleHByZXNzaW9uIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gbWF0Y2ggKHJlZ0V4cCwgbWVzc2FnZSkge1xuICAvLyB5ZXMsIHdlIGFsbG93IG11bHRpcGxlIG1hdGNoIHZhbGlkYXRvcnNcblxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLlN0cmluZy5tYXRjaDtcblxuICBmdW5jdGlvbiBtYXRjaFZhbGlkYXRvciAodil7XG4gICAgcmV0dXJuIG51bGwgIT0gdiAmJiAnJyAhPT0gdlxuICAgICAgPyByZWdFeHAudGVzdCh2KVxuICAgICAgOiB0cnVlXG4gIH1cblxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbbWF0Y2hWYWxpZGF0b3IsIG1zZywgJ3JlZ2V4cCddKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gY2hlY2tSZXF1aXJlZCAodmFsdWUsIGRvYykge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYodGhpcywgdmFsdWUsIGRvYywgdHJ1ZSkpIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nIHx8IHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykgJiYgdmFsdWUubGVuZ3RoO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIFN0cmluZ1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoIHZhbHVlID09PSBudWxsICkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgLy8gaGFuZGxlIGRvY3VtZW50cyBiZWluZyBwYXNzZWRcbiAgICBpZiAodmFsdWUuX2lkICYmICdzdHJpbmcnID09IHR5cGVvZiB2YWx1ZS5faWQpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5faWQ7XG4gICAgfVxuICAgIGlmICggdmFsdWUudG9TdHJpbmcgKSB7XG4gICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdzdHJpbmcnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdTY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlcnJvck1lc3NhZ2VzID0gZXJyb3IubWVzc2FnZXM7XG52YXIgQ2FzdEVycm9yID0gZXJyb3IuQ2FzdEVycm9yO1xudmFyIFZhbGlkYXRvckVycm9yID0gZXJyb3IuVmFsaWRhdG9yRXJyb3I7XG5cbi8qKlxuICogU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge1N0cmluZ30gW2luc3RhbmNlXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBTY2hlbWFUeXBlIChwYXRoLCBvcHRpb25zLCBpbnN0YW5jZSkge1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gIHRoaXMudmFsaWRhdG9ycyA9IFtdO1xuICB0aGlzLnNldHRlcnMgPSBbXTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSBpZiAodGhpc1tpXSAmJiAnZnVuY3Rpb24nID09IHR5cGVvZiB0aGlzW2ldKSB7XG4gICAgdmFyIG9wdHMgPSBBcnJheS5pc0FycmF5KG9wdGlvbnNbaV0pXG4gICAgICA/IG9wdGlvbnNbaV1cbiAgICAgIDogW29wdGlvbnNbaV1dO1xuXG4gICAgdGhpc1tpXS5hcHBseSh0aGlzLCBvcHRzKTtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgYSBkZWZhdWx0IHZhbHVlIGZvciB0aGlzIFNjaGVtYVR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIGRlZmF1bHQ6IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSlcbiAqICAgICB2YXIgbSA9IG5ldyBNO1xuICogICAgIGNvbnNvbGUubG9nKG0ubikgLy8gMTBcbiAqXG4gKiBEZWZhdWx0cyBjYW4gYmUgZWl0aGVyIGBmdW5jdGlvbnNgIHdoaWNoIHJldHVybiB0aGUgdmFsdWUgdG8gdXNlIGFzIHRoZSBkZWZhdWx0IG9yIHRoZSBsaXRlcmFsIHZhbHVlIGl0c2VsZi4gRWl0aGVyIHdheSwgdGhlIHZhbHVlIHdpbGwgYmUgY2FzdCBiYXNlZCBvbiBpdHMgc2NoZW1hIHR5cGUgYmVmb3JlIGJlaW5nIHNldCBkdXJpbmcgZG9jdW1lbnQgY3JlYXRpb24uXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIC8vIHZhbHVlcyBhcmUgY2FzdDpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IGFOdW1iZXI6IE51bWJlciwgZGVmYXVsdDogXCI0LjgxNTE2MjM0MlwiIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSlcbiAqICAgICB2YXIgbSA9IG5ldyBNO1xuICogICAgIGNvbnNvbGUubG9nKG0uYU51bWJlcikgLy8gNC44MTUxNjIzNDJcbiAqXG4gKiAgICAgLy8gZGVmYXVsdCB1bmlxdWUgb2JqZWN0cyBmb3IgTWl4ZWQgdHlwZXM6XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBtaXhlZDogU2NoZW1hLlR5cGVzLk1peGVkIH0pO1xuICogICAgIHNjaGVtYS5wYXRoKCdtaXhlZCcpLmRlZmF1bHQoZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuIHt9O1xuICogICAgIH0pO1xuICpcbiAqICAgICAvLyBpZiB3ZSBkb24ndCB1c2UgYSBmdW5jdGlvbiB0byByZXR1cm4gb2JqZWN0IGxpdGVyYWxzIGZvciBNaXhlZCBkZWZhdWx0cyxcbiAqICAgICAvLyBlYWNoIGRvY3VtZW50IHdpbGwgcmVjZWl2ZSBhIHJlZmVyZW5jZSB0byB0aGUgc2FtZSBvYmplY3QgbGl0ZXJhbCBjcmVhdGluZ1xuICogICAgIC8vIGEgXCJzaGFyZWRcIiBvYmplY3QgaW5zdGFuY2U6XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBtaXhlZDogU2NoZW1hLlR5cGVzLk1peGVkIH0pO1xuICogICAgIHNjaGVtYS5wYXRoKCdtaXhlZCcpLmRlZmF1bHQoe30pO1xuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpO1xuICogICAgIHZhciBtMSA9IG5ldyBNO1xuICogICAgIG0xLm1peGVkLmFkZGVkID0gMTtcbiAqICAgICBjb25zb2xlLmxvZyhtMS5taXhlZCk7IC8vIHsgYWRkZWQ6IDEgfVxuICogICAgIHZhciBtMiA9IG5ldyBNO1xuICogICAgIGNvbnNvbGUubG9nKG0yLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbnxhbnl9IHZhbCB0aGUgZGVmYXVsdCB2YWx1ZVxuICogQHJldHVybiB7ZGVmYXVsdFZhbHVlfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZGVmYXVsdCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgaWYgKDEgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbidcbiAgICAgID8gdmFsXG4gICAgICA6IHRoaXMuY2FzdCggdmFsICk7XG5cbiAgICByZXR1cm4gdGhpcztcblxuICB9IGVsc2UgaWYgKCBhcmd1bWVudHMubGVuZ3RoID4gMSApIHtcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IF8udG9BcnJheSggYXJndW1lbnRzICk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuZGVmYXVsdFZhbHVlO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgc2V0dGVyIHRvIHRoaXMgc2NoZW1hdHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZnVuY3Rpb24gY2FwaXRhbGl6ZSAodmFsKSB7XG4gKiAgICAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gJyc7XG4gKiAgICAgICByZXR1cm4gdmFsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsLnN1YnN0cmluZygxKTtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIGRlZmluaW5nIHdpdGhpbiB0aGUgc2NoZW1hXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHNldDogY2FwaXRhbGl6ZSB9fSlcbiAqXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9KVxuICogICAgIHMucGF0aCgnbmFtZScpLnNldChjYXBpdGFsaXplKVxuICpcbiAqIFNldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgZGF0YSBiZWZvcmUgaXQgZ2V0cyB0byB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgYW5kIGlzIHNldCBhcyBhIHZhbHVlIG9uIGFuIGFjdHVhbCBrZXkuXG4gKlxuICogU3VwcG9zZSB5b3UgYXJlIGltcGxlbWVudGluZyB1c2VyIHJlZ2lzdHJhdGlvbiBmb3IgYSB3ZWJzaXRlLiBVc2VycyBwcm92aWRlIGFuIGVtYWlsIGFuZCBwYXNzd29yZCwgd2hpY2ggZ2V0cyBzYXZlZCB0byBtb25nb2RiLiBUaGUgZW1haWwgaXMgYSBzdHJpbmcgdGhhdCB5b3Ugd2lsbCB3YW50IHRvIG5vcm1hbGl6ZSB0byBsb3dlciBjYXNlLCBpbiBvcmRlciB0byBhdm9pZCBvbmUgZW1haWwgaGF2aW5nIG1vcmUgdGhhbiBvbmUgYWNjb3VudCAtLSBlLmcuLCBvdGhlcndpc2UsIGF2ZW51ZUBxLmNvbSBjYW4gYmUgcmVnaXN0ZXJlZCBmb3IgMiBhY2NvdW50cyB2aWEgYXZlbnVlQHEuY29tIGFuZCBBdkVuVWVAUS5Db00uXG4gKlxuICogWW91IGNhbiBzZXQgdXAgZW1haWwgbG93ZXIgY2FzZSBub3JtYWxpemF0aW9uIGVhc2lseSB2aWEgYSBNb25nb29zZSBzZXR0ZXIuXG4gKlxuICogICAgIGZ1bmN0aW9uIHRvTG93ZXIgKHYpIHtcbiAqICAgICAgIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVXNlclNjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IHRvTG93ZXIgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBVc2VyID0gZGIubW9kZWwoJ1VzZXInLCBVc2VyU2NoZW1hKVxuICpcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyKHtlbWFpbDogJ0FWRU5VRUBRLkNPTSd9KVxuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpOyAvLyAnYXZlbnVlQHEuY29tJ1xuICpcbiAqICAgICAvLyBvclxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXJcbiAqICAgICB1c2VyLmVtYWlsID0gJ0F2ZW51ZUBRLmNvbSdcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKSAvLyAnYXZlbnVlQHEuY29tJ1xuICpcbiAqIEFzIHlvdSBjYW4gc2VlIGFib3ZlLCBzZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIGRhdGEgYmVmb3JlIGl0IGdldHMgdG8gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IGFuZCBpcyBzZXQgYXMgYSB2YWx1ZSBvbiBhbiBhY3R1YWwga2V5LlxuICpcbiAqIF9OT1RFOiB3ZSBjb3VsZCBoYXZlIGFsc28ganVzdCB1c2VkIHRoZSBidWlsdC1pbiBgbG93ZXJjYXNlOiB0cnVlYCBTY2hlbWFUeXBlIG9wdGlvbiBpbnN0ZWFkIG9mIGRlZmluaW5nIG91ciBvd24gZnVuY3Rpb24uX1xuICpcbiAqICAgICBuZXcgU2NoZW1hKHsgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBsb3dlcmNhc2U6IHRydWUgfX0pXG4gKlxuICogU2V0dGVycyBhcmUgYWxzbyBwYXNzZWQgYSBzZWNvbmQgYXJndW1lbnQsIHRoZSBzY2hlbWF0eXBlIG9uIHdoaWNoIHRoZSBzZXR0ZXIgd2FzIGRlZmluZWQuIFRoaXMgYWxsb3dzIGZvciB0YWlsb3JlZCBiZWhhdmlvciBiYXNlZCBvbiBvcHRpb25zIHBhc3NlZCBpbiB0aGUgc2NoZW1hLlxuICpcbiAqICAgICBmdW5jdGlvbiBpbnNwZWN0b3IgKHZhbCwgc2NoZW1hdHlwZSkge1xuICogICAgICAgaWYgKHNjaGVtYXR5cGUub3B0aW9ucy5yZXF1aXJlZCkge1xuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyByZXF1aXJlZCc7XG4gKiAgICAgICB9IGVsc2Uge1xuICogICAgICAgICByZXR1cm4gdmFsO1xuICogICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFZpcnVzU2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUsIHNldDogaW5zcGVjdG9yIH0sXG4gKiAgICAgICB0YXhvbm9teTogeyB0eXBlOiBTdHJpbmcsIHNldDogaW5zcGVjdG9yIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVmlydXMgPSBkYi5tb2RlbCgnVmlydXMnLCBWaXJ1c1NjaGVtYSk7XG4gKiAgICAgdmFyIHYgPSBuZXcgVmlydXMoeyBuYW1lOiAnUGFydm92aXJpZGFlJywgdGF4b25vbXk6ICdQYXJ2b3ZpcmluYWUnIH0pO1xuICpcbiAqICAgICBjb25zb2xlLmxvZyh2Lm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxuICogICAgIGNvbnNvbGUubG9nKHYudGF4b25vbXkpOyAvLyBQYXJ2b3ZpcmluYWVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiBmbilcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIHNldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIHRoaXMuc2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBnZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBkb2IgKHZhbCkge1xuICogICAgICAgaWYgKCF2YWwpIHJldHVybiB2YWw7XG4gKiAgICAgICByZXR1cm4gKHZhbC5nZXRNb250aCgpICsgMSkgKyBcIi9cIiArIHZhbC5nZXREYXRlKCkgKyBcIi9cIiArIHZhbC5nZXRGdWxsWWVhcigpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIGdldDogZG9iIH0pXG4gKlxuICogICAgIC8vIG9yIGJ5IHJldHJlaXZpbmcgaXRzIFNjaGVtYVR5cGVcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiBEYXRlIH0pXG4gKiAgICAgcy5wYXRoKCdib3JuJykuZ2V0KGRvYilcbiAqXG4gKiBHZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkYXRhIGFzIGl0IHRyYXZlbHMgZnJvbSB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgdG8gdGhlIHZhbHVlIHRoYXQgeW91IHNlZS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgc3RvcmluZyBjcmVkaXQgY2FyZCBudW1iZXJzIGFuZCB5b3Ugd2FudCB0byBoaWRlIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBsYXN0IDQgZGlnaXRzIHRvIHRoZSBtb25nb29zZSB1c2VyLiBZb3UgY2FuIGRvIHNvIGJ5IGRlZmluaW5nIGEgZ2V0dGVyIGluIHRoZSBmb2xsb3dpbmcgd2F5OlxuICpcbiAqICAgICBmdW5jdGlvbiBvYmZ1c2NhdGUgKGNjKSB7XG4gKiAgICAgICByZXR1cm4gJyoqKiotKioqKi0qKioqLScgKyBjYy5zbGljZShjYy5sZW5ndGgtNCwgY2MubGVuZ3RoKTtcbiAqICAgICB9XG4gKlxuICogICAgIHZhciBBY2NvdW50U2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBjcmVkaXRDYXJkTnVtYmVyOiB7IHR5cGU6IFN0cmluZywgZ2V0OiBvYmZ1c2NhdGUgfVxuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgQWNjb3VudCA9IGRiLm1vZGVsKCdBY2NvdW50JywgQWNjb3VudFNjaGVtYSk7XG4gKlxuICogICAgIEFjY291bnQuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIGZvdW5kKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhmb3VuZC5jcmVkaXRDYXJkTnVtYmVyKTsgLy8gJyoqKiotKioqKi0qKioqLTEyMzQnXG4gKiAgICAgfSk7XG4gKlxuICogR2V0dGVycyBhcmUgYWxzbyBwYXNzZWQgYSBzZWNvbmQgYXJndW1lbnQsIHRoZSBzY2hlbWF0eXBlIG9uIHdoaWNoIHRoZSBnZXR0ZXIgd2FzIGRlZmluZWQuIFRoaXMgYWxsb3dzIGZvciB0YWlsb3JlZCBiZWhhdmlvciBiYXNlZCBvbiBvcHRpb25zIHBhc3NlZCBpbiB0aGUgc2NoZW1hLlxuICpcbiAqICAgICBmdW5jdGlvbiBpbnNwZWN0b3IgKHZhbCwgc2NoZW1hdHlwZSkge1xuICogICAgICAgaWYgKHNjaGVtYXR5cGUub3B0aW9ucy5yZXF1aXJlZCkge1xuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyByZXF1aXJlZCc7XG4gKiAgICAgICB9IGVsc2Uge1xuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyBub3QnO1xuICogICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFZpcnVzU2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUsIGdldDogaW5zcGVjdG9yIH0sXG4gKiAgICAgICB0YXhvbm9teTogeyB0eXBlOiBTdHJpbmcsIGdldDogaW5zcGVjdG9yIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVmlydXMgPSBkYi5tb2RlbCgnVmlydXMnLCBWaXJ1c1NjaGVtYSk7XG4gKlxuICogICAgIFZpcnVzLmZpbmRCeUlkKGlkLCBmdW5jdGlvbiAoZXJyLCB2aXJ1cykge1xuICogICAgICAgY29uc29sZS5sb2codmlydXMubmFtZSk7ICAgICAvLyBuYW1lIGlzIHJlcXVpcmVkXG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy50YXhvbm9teSk7IC8vIHRheG9ub215IGlzIG5vdFxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB0aGlzLmdldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHZhbGlkYXRvcihzKSBmb3IgdGhpcyBkb2N1bWVudCBwYXRoLlxuICpcbiAqIFZhbGlkYXRvcnMgYWx3YXlzIHJlY2VpdmUgdGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIHRoZWlyIGZpcnN0IGFyZ3VtZW50IGFuZCBtdXN0IHJldHVybiBgQm9vbGVhbmAuIFJldHVybmluZyBgZmFsc2VgIG1lYW5zIHZhbGlkYXRpb24gZmFpbGVkLlxuICpcbiAqIFRoZSBlcnJvciBtZXNzYWdlIGFyZ3VtZW50IGlzIG9wdGlvbmFsLiBJZiBub3QgcGFzc2VkLCB0aGUgW2RlZmF1bHQgZ2VuZXJpYyBlcnJvciBtZXNzYWdlIHRlbXBsYXRlXSgjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlcykgd2lsbCBiZSB1c2VkLlxuICpcbiAqICMjIyNFeGFtcGxlczpcbiAqXG4gKiAgICAgLy8gbWFrZSBzdXJlIGV2ZXJ5IHZhbHVlIGlzIGVxdWFsIHRvIFwic29tZXRoaW5nXCJcbiAqICAgICBmdW5jdGlvbiB2YWxpZGF0b3IgKHZhbCkge1xuICogICAgICAgcmV0dXJuIHZhbCA9PSAnc29tZXRoaW5nJztcbiAqICAgICB9XG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogdmFsaWRhdG9yIH19KTtcbiAqXG4gKiAgICAgLy8gd2l0aCBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKlxuICogICAgIHZhciBjdXN0b20gPSBbdmFsaWRhdG9yLCAnVWggb2gsIHtQQVRIfSBkb2VzIG5vdCBlcXVhbCBcInNvbWV0aGluZ1wiLiddXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogY3VzdG9tIH19KTtcbiAqXG4gKiAgICAgLy8gYWRkaW5nIG1hbnkgdmFsaWRhdG9ycyBhdCBhIHRpbWVcbiAqXG4gKiAgICAgdmFyIG1hbnkgPSBbXG4gKiAgICAgICAgIHsgdmFsaWRhdG9yOiB2YWxpZGF0b3IsIG1zZzogJ3VoIG9oJyB9XG4gKiAgICAgICAsIHsgdmFsaWRhdG9yOiBhbm90aGVyVmFsaWRhdG9yLCBtc2c6ICdmYWlsZWQnIH1cbiAqICAgICBdXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogbWFueSB9fSk7XG4gKlxuICogICAgIC8vIG9yIHV0aWxpemluZyBTY2hlbWFUeXBlIG1ldGhvZHMgZGlyZWN0bHk6XG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogJ3N0cmluZycgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZSh2YWxpZGF0b3IsICd2YWxpZGF0aW9uIG9mIGB7UEFUSH1gIGZhaWxlZCB3aXRoIHZhbHVlIGB7VkFMVUV9YCcpO1xuICpcbiAqICMjIyNFcnJvciBtZXNzYWdlIHRlbXBsYXRlczpcbiAqXG4gKiBGcm9tIHRoZSBleGFtcGxlcyBhYm92ZSwgeW91IG1heSBoYXZlIG5vdGljZWQgdGhhdCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2VpYyB0ZW1wbGF0aW5nLiBUaGVyZSBhcmUgYSBmZXcgb3RoZXIgdGVtcGxhdGUga2V5d29yZHMgYmVzaWRlcyBge1BBVEh9YCBhbmQgYHtWQUxVRX1gIHRvby4gVG8gZmluZCBvdXQgbW9yZSwgZGV0YWlscyBhcmUgYXZhaWxhYmxlIFtoZXJlXSgjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlcylcbiAqXG4gKiAjIyMjQXN5bmNocm9ub3VzIHZhbGlkYXRpb246XG4gKlxuICogUGFzc2luZyBhIHZhbGlkYXRvciBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHR3byBhcmd1bWVudHMgdGVsbHMgbW9uZ29vc2UgdGhhdCB0aGUgdmFsaWRhdG9yIGlzIGFuIGFzeW5jaHJvbm91cyB2YWxpZGF0b3IuIFRoZSBmaXJzdCBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIHZhbGlkYXRvciBmdW5jdGlvbiBpcyB0aGUgdmFsdWUgYmVpbmcgdmFsaWRhdGVkLiBUaGUgc2Vjb25kIGFyZ3VtZW50IGlzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBtdXN0IGNhbGxlZCB3aGVuIHlvdSBmaW5pc2ggdmFsaWRhdGluZyB0aGUgdmFsdWUgYW5kIHBhc3NlZCBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWAgdG8gY29tbXVuaWNhdGUgZWl0aGVyIHN1Y2Nlc3Mgb3IgZmFpbHVyZSByZXNwZWN0aXZlbHkuXG4gKlxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykudmFsaWRhdGUoZnVuY3Rpb24gKHZhbHVlLCByZXNwb25kKSB7XG4gKiAgICAgICBkb1N0dWZmKHZhbHVlLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICAgIC4uLlxuICogICAgICAgICByZXNwb25kKGZhbHNlKTsgLy8gdmFsaWRhdGlvbiBmYWlsZWRcbiAqICAgICAgIH0pXG4qICAgICAgfSwgJ3tQQVRIfSBmYWlsZWQgdmFsaWRhdGlvbi4nKTtcbipcbiAqIFlvdSBtaWdodCB1c2UgYXN5bmNocm9ub3VzIHZhbGlkYXRvcnMgdG8gcmV0cmVpdmUgb3RoZXIgZG9jdW1lbnRzIGZyb20gdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlIGFnYWluc3Qgb3IgdG8gbWVldCBvdGhlciBJL08gYm91bmQgdmFsaWRhdGlvbiBuZWVkcy5cbiAqXG4gKiBWYWxpZGF0aW9uIG9jY3VycyBgcHJlKCdzYXZlJylgIG9yIHdoZW5ldmVyIHlvdSBtYW51YWxseSBleGVjdXRlIFtkb2N1bWVudCN2YWxpZGF0ZV0oI2RvY3VtZW50X0RvY3VtZW50LXZhbGlkYXRlKS5cbiAqXG4gKiBJZiB2YWxpZGF0aW9uIGZhaWxzIGR1cmluZyBgcHJlKCdzYXZlJylgIGFuZCBubyBjYWxsYmFjayB3YXMgcGFzc2VkIHRvIHJlY2VpdmUgdGhlIGVycm9yLCBhbiBgZXJyb3JgIGV2ZW50IHdpbGwgYmUgZW1pdHRlZCBvbiB5b3VyIE1vZGVscyBhc3NvY2lhdGVkIGRiIFtjb25uZWN0aW9uXSgjY29ubmVjdGlvbl9Db25uZWN0aW9uKSwgcGFzc2luZyB0aGUgdmFsaWRhdGlvbiBlcnJvciBvYmplY3QgYWxvbmcuXG4gKlxuICogICAgIHZhciBjb25uID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XG4gKiAgICAgY29ubi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogICAgIHZhciBQcm9kdWN0ID0gY29ubi5tb2RlbCgnUHJvZHVjdCcsIHlvdXJTY2hlbWEpO1xuICogICAgIHZhciBkdmQgPSBuZXcgUHJvZHVjdCguLik7XG4gKiAgICAgZHZkLnNhdmUoKTsgLy8gZW1pdHMgZXJyb3Igb24gdGhlIGBjb25uYCBhYm92ZVxuICpcbiAqIElmIHlvdSBkZXNpcmUgaGFuZGxpbmcgdGhlc2UgZXJyb3JzIGF0IHRoZSBNb2RlbCBsZXZlbCwgYXR0YWNoIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8geW91ciBNb2RlbCBhbmQgdGhlIGV2ZW50IHdpbGwgaW5zdGVhZCBiZSBlbWl0dGVkIHRoZXJlLlxuICpcbiAqICAgICAvLyByZWdpc3RlcmluZyBhbiBlcnJvciBsaXN0ZW5lciBvbiB0aGUgTW9kZWwgbGV0cyB1cyBoYW5kbGUgZXJyb3JzIG1vcmUgbG9jYWxseVxuICogICAgIFByb2R1Y3Qub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBwYXJhbSB7UmVnRXhwfEZ1bmN0aW9ufE9iamVjdH0gb2JqIHZhbGlkYXRvclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChvYmosIG1lc3NhZ2UsIHR5cGUpIHtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9iaiB8fCBvYmogJiYgJ1JlZ0V4cCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggb2JqLmNvbnN0cnVjdG9yICkpIHtcbiAgICBpZiAoIW1lc3NhZ2UpIG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcbiAgICBpZiAoIXR5cGUpIHR5cGUgPSAndXNlciBkZWZpbmVkJztcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbb2JqLCBtZXNzYWdlLCB0eXBlXSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZztcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgYXJnID0gYXJndW1lbnRzW2ldO1xuICAgIGlmICghKGFyZyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGFyZy5jb25zdHJ1Y3RvciApICkpIHtcbiAgICAgIHZhciBtc2cgPSAnSW52YWxpZCB2YWxpZGF0b3IuIFJlY2VpdmVkICgnICsgdHlwZW9mIGFyZyArICcpICdcbiAgICAgICAgKyBhcmdcbiAgICAgICAgKyAnLiBTZWUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvYXBpLmh0bWwjc2NoZW1hdHlwZV9TY2hlbWFUeXBlLXZhbGlkYXRlJztcblxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIHRoaXMudmFsaWRhdGUoYXJnLnZhbGlkYXRvciwgYXJnLm1zZywgYXJnLnR5cGUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXF1aXJlZCB2YWxpZGF0b3IgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiB0cnVlIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogJ3tQQVRIfSBpcyByZXF1aXJlZCEnIH0pXG4gKlxuICogICAgIC8vIG9yIHRocm91Z2ggdGhlIHBhdGggQVBJXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSk7XG4gKlxuICogICAgIC8vIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2luZ1xuICpcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUsICdncnJyIDooICcpO1xuICpcbiAqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIGVuYWJsZS9kaXNhYmxlIHRoZSB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUucmVxdWlyZWQgPSBmdW5jdGlvbiAocmVxdWlyZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGZhbHNlID09PSByZXF1aXJlZCkge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMucmVxdWlyZWRWYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLmlzUmVxdWlyZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5pc1JlcXVpcmVkID0gdHJ1ZTtcblxuICB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAvLyBpbiBoZXJlLCBgdGhpc2AgcmVmZXJzIHRvIHRoZSB2YWxpZGF0aW5nIGRvY3VtZW50LlxuICAgIC8vIG5vIHZhbGlkYXRpb24gd2hlbiB0aGlzIHBhdGggd2Fzbid0IHNlbGVjdGVkIGluIHRoZSBxdWVyeS5cbiAgICBpZiAodGhpcyAhPT0gdW5kZWZpbmVkICYmIC8vINGB0L/QtdGG0LjQsNC70YzQvdCw0Y8g0L/RgNC+0LLQtdGA0LrQsCDQuNC3LdC30LAgc3RyaWN0IG1vZGUg0Lgg0L7RgdC+0LHQtdC90L3QvtGB0YLQuCAuY2FsbCh1bmRlZmluZWQpXG4gICAgICAgICdpc1NlbGVjdGVkJyBpbiB0aGlzICYmXG4gICAgICAgICF0aGlzLmlzU2VsZWN0ZWQoc2VsZi5wYXRoKSAmJlxuICAgICAgICAhdGhpcy5pc01vZGlmaWVkKHNlbGYucGF0aCkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIHNlbGYuY2hlY2tSZXF1aXJlZCh2LCB0aGlzKTtcbiAgfTtcblxuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHJlcXVpcmVkKSB7XG4gICAgbWVzc2FnZSA9IHJlcXVpcmVkO1xuICAgIHJlcXVpcmVkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5nZW5lcmFsLnJlcXVpcmVkO1xuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5yZXF1aXJlZFZhbGlkYXRvciwgbXNnLCAncmVxdWlyZWQnXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgZGVmYXVsdCB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZSB0aGUgc2NvcGUgd2hpY2ggY2FsbGJhY2sgYXJlIGV4ZWN1dGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNjb3BlLCBpbml0KSB7XG4gIHZhciByZXQgPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5kZWZhdWx0VmFsdWVcbiAgICA/IHRoaXMuZGVmYXVsdFZhbHVlLmNhbGwoc2NvcGUpXG4gICAgOiB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICBpZiAobnVsbCAhPT0gcmV0ICYmIHVuZGVmaW5lZCAhPT0gcmV0KSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChyZXQsIHNjb3BlLCBpbml0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5U2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xuICAgIHJldHVybiBpbml0XG4gICAgICA/IHZhbHVlXG4gICAgICA6IHRoaXMuY2FzdCh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHZhciB2ID0gdmFsdWVcbiAgICAsIHNldHRlcnMgPSB0aGlzLnNldHRlcnNcbiAgICAsIGxlbiA9IHNldHRlcnMubGVuZ3RoXG4gICAgLCBjYXN0ZXIgPSB0aGlzLmNhc3RlcjtcblxuICBpZiAoQXJyYXkuaXNBcnJheSh2KSAmJiBjYXN0ZXIgJiYgY2FzdGVyLnNldHRlcnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZbaV0gPSBjYXN0ZXIuYXBwbHlTZXR0ZXJzKHZbaV0sIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFsZW4pIHtcbiAgICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xuICAgIHJldHVybiB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHdoaWxlIChsZW4tLSkge1xuICAgIHYgPSBzZXR0ZXJzW2xlbl0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xuXG4gIC8vIGRvIG5vdCBjYXN0IHVudGlsIGFsbCBzZXR0ZXJzIGFyZSBhcHBsaWVkICM2NjVcbiAgdiA9IHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuXG4gIHJldHVybiB2O1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYSB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24oIHZhbHVlLCBzY29wZSApe1xuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkgcmV0dXJuIHZhbHVlO1xuXG4gIHZhciB2ID0gdmFsdWVcbiAgICAsIGdldHRlcnMgPSB0aGlzLmdldHRlcnNcbiAgICAsIGxlbiA9IGdldHRlcnMubGVuZ3RoO1xuXG4gIGlmICggIWxlbiApIHtcbiAgICByZXR1cm4gdjtcbiAgfVxuXG4gIHdoaWxlICggbGVuLS0gKSB7XG4gICAgdiA9IGdldHRlcnNbIGxlbiBdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIGEgdmFsaWRhdGlvbiBvZiBgdmFsdWVgIHVzaW5nIHRoZSB2YWxpZGF0b3JzIGRlY2xhcmVkIGZvciB0aGlzIFNjaGVtYVR5cGUuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUgPSBmdW5jdGlvbiAodmFsdWUsIGNhbGxiYWNrLCBzY29wZSkge1xuICB2YXIgZXJyID0gZmFsc2VcbiAgICAsIHBhdGggPSB0aGlzLnBhdGhcbiAgICAsIGNvdW50ID0gdGhpcy52YWxpZGF0b3JzLmxlbmd0aDtcblxuICBpZiAoIWNvdW50KSByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGUgKG9rLCBtZXNzYWdlLCB0eXBlLCB2YWwpIHtcbiAgICBpZiAoZXJyKSByZXR1cm47XG4gICAgaWYgKG9rID09PSB1bmRlZmluZWQgfHwgb2spIHtcbiAgICAgIC0tY291bnQgfHwgY2FsbGJhY2sobnVsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGVyciA9IG5ldyBWYWxpZGF0b3JFcnJvcihwYXRoLCBtZXNzYWdlLCB0eXBlLCB2YWwpKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLnZhbGlkYXRvcnMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgIHZhciB2YWxpZGF0b3IgPSB2WzBdXG4gICAgICAsIG1lc3NhZ2UgPSB2WzFdXG4gICAgICAsIHR5cGUgPSB2WzJdO1xuXG4gICAgaWYgKHZhbGlkYXRvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgdmFsaWRhdGUodmFsaWRhdG9yLnRlc3QodmFsdWUpLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdmFsaWRhdG9yKSB7XG4gICAgICBpZiAoMiA9PT0gdmFsaWRhdG9yLmxlbmd0aCkge1xuICAgICAgICB2YWxpZGF0b3IuY2FsbChzY29wZSwgdmFsdWUsIGZ1bmN0aW9uIChvaykge1xuICAgICAgICAgIHZhbGlkYXRlKG9rLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsaWRhdGUodmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdmFsdWUgaXMgYSB2YWxpZCBSZWZlcmVuY2UuXG4gKlxuICog0J3QsCDQutC70LjQtdC90YLQtSDQsiDQutCw0YfQtdGB0YLQstC1INGB0YHRi9C70LrQuCDQvNC+0LbQvdC+INGF0YDQsNC90LjRgtGMINC60LDQuiBpZCwg0YLQsNC6INC4INC/0L7Qu9C90YvQtSDQtNC+0LrRg9C80LXQvdGC0YtcbiAqXG4gKiBAcGFyYW0ge1NjaGVtYVR5cGV9IHNlbGZcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLl9pc1JlZiA9IGZ1bmN0aW9uKCBzZWxmLCB2YWx1ZSApe1xuICAvLyBmYXN0IHBhdGhcbiAgdmFyIHJlZiA9IHNlbGYub3B0aW9ucyAmJiBzZWxmLm9wdGlvbnMucmVmO1xuXG4gIGlmICggcmVmICkge1xuICAgIGlmICggbnVsbCA9PSB2YWx1ZSApIHJldHVybiB0cnVlO1xuICAgIGlmICggXy5pc09iamVjdCggdmFsdWUgKSApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFUeXBlO1xuXG5TY2hlbWFUeXBlLkNhc3RFcnJvciA9IENhc3RFcnJvcjtcblxuU2NoZW1hVHlwZS5WYWxpZGF0b3JFcnJvciA9IFZhbGlkYXRvckVycm9yO1xuIiwiLyohXG4gKiBTdGF0ZU1hY2hpbmUgcmVwcmVzZW50cyBhIG1pbmltYWwgYGludGVyZmFjZWAgZm9yIHRoZVxuICogY29uc3RydWN0b3JzIGl0IGJ1aWxkcyB2aWEgU3RhdGVNYWNoaW5lLmN0b3IoLi4uKS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBTdGF0ZU1hY2hpbmUgKCkge1xuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3RhdGVzID0ge307XG59O1xuXG4vKiFcbiAqIFN0YXRlTWFjaGluZS5jdG9yKCdzdGF0ZTEnLCAnc3RhdGUyJywgLi4uKVxuICogQSBmYWN0b3J5IG1ldGhvZCBmb3Igc3ViY2xhc3NpbmcgU3RhdGVNYWNoaW5lLlxuICogVGhlIGFyZ3VtZW50cyBhcmUgYSBsaXN0IG9mIHN0YXRlcy4gRm9yIGVhY2ggc3RhdGUsXG4gKiB0aGUgY29uc3RydWN0b3IncyBwcm90b3R5cGUgZ2V0cyBzdGF0ZSB0cmFuc2l0aW9uXG4gKiBtZXRob2RzIG5hbWVkIGFmdGVyIGVhY2ggc3RhdGUuIFRoZXNlIHRyYW5zaXRpb24gbWV0aG9kc1xuICogcGxhY2UgdGhlaXIgcGF0aCBhcmd1bWVudCBpbnRvIHRoZSBnaXZlbiBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gc3ViY2xhc3MgY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcblxuICB2YXIgY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICBTdGF0ZU1hY2hpbmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnN0YXRlTmFtZXMgPSBzdGF0ZXM7XG5cbiAgICB2YXIgaSA9IHN0YXRlcy5sZW5ndGhcbiAgICAgICwgc3RhdGU7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbiAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXSA9IHt9O1xuICAgIH1cbiAgfTtcblxuICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0YXRlTWFjaGluZS5wcm90b3R5cGUgKTtcbiAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXG4gIHN0YXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIC8vIENoYW5nZXMgdGhlIGBwYXRoYCdzIHN0YXRlIHRvIGBzdGF0ZWAuXG4gICAgY3Rvci5wcm90b3R5cGVbc3RhdGVdID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKHBhdGgsIHN0YXRlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjdG9yO1xufTtcblxuLyohXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHdyYXBwZWQgYnkgdGhlIHN0YXRlIGNoYW5nZSBmdW5jdGlvbnM6XG4gKlxuICogLSBgcmVxdWlyZShwYXRoKWBcbiAqIC0gYG1vZGlmeShwYXRoKWBcbiAqIC0gYGluaXQocGF0aClgXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5fY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiBfY2hhbmdlU3RhdGUgKHBhdGgsIG5leHRTdGF0ZSkge1xuICB2YXIgcHJldkJ1Y2tldCA9IHRoaXMuc3RhdGVzW3RoaXMucGF0aHNbcGF0aF1dO1xuICBpZiAocHJldkJ1Y2tldCkgZGVsZXRlIHByZXZCdWNrZXRbcGF0aF07XG5cbiAgdGhpcy5wYXRoc1twYXRoXSA9IG5leHRTdGF0ZTtcbiAgdGhpcy5zdGF0ZXNbbmV4dFN0YXRlXVtwYXRoXSA9IHRydWU7XG59O1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhciAoc3RhdGUpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnN0YXRlc1tzdGF0ZV0pXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIHBhdGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHBhdGggPSBrZXlzW2ldO1xuICAgIGRlbGV0ZSB0aGlzLnN0YXRlc1tzdGF0ZV1bcGF0aF07XG4gICAgZGVsZXRlIHRoaXMucGF0aHNbcGF0aF07XG4gIH1cbn07XG5cbi8qIVxuICogQ2hlY2tzIHRvIHNlZSBpZiBhdCBsZWFzdCBvbmUgcGF0aCBpcyBpbiB0aGUgc3RhdGVzIHBhc3NlZCBpbiB2aWEgYGFyZ3VtZW50c2BcbiAqIGUuZy4sIHRoaXMuc29tZSgncmVxdWlyZWQnLCAnaW5pdGVkJylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGUgdGhhdCB3ZSB3YW50IHRvIGNoZWNrIGZvci5cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5zb21lID0gZnVuY3Rpb24gc29tZSAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHdoYXQgPSBhcmd1bWVudHMubGVuZ3RoID8gYXJndW1lbnRzIDogdGhpcy5zdGF0ZU5hbWVzO1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNvbWUuY2FsbCh3aGF0LCBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKS5sZW5ndGg7XG4gIH0pO1xufTtcblxuLyohXG4gKiBUaGlzIGZ1bmN0aW9uIGJ1aWxkcyB0aGUgZnVuY3Rpb25zIHRoYXQgZ2V0IGFzc2lnbmVkIHRvIGBmb3JFYWNoYCBhbmQgYG1hcGAsXG4gKiBzaW5jZSBib3RoIG9mIHRob3NlIG1ldGhvZHMgc2hhcmUgYSBsb3Qgb2YgdGhlIHNhbWUgbG9naWMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGl0ZXJNZXRob2QgaXMgZWl0aGVyICdmb3JFYWNoJyBvciAnbWFwJ1xuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLl9pdGVyID0gZnVuY3Rpb24gX2l0ZXIgKGl0ZXJNZXRob2QpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbnVtQXJncyA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgICwgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMCwgbnVtQXJncy0xKVxuICAgICAgLCBjYWxsYmFjayA9IGFyZ3VtZW50c1tudW1BcmdzLTFdO1xuXG4gICAgaWYgKCFzdGF0ZXMubGVuZ3RoKSBzdGF0ZXMgPSB0aGlzLnN0YXRlTmFtZXM7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcGF0aHMgPSBzdGF0ZXMucmVkdWNlKGZ1bmN0aW9uIChwYXRocywgc3RhdGUpIHtcbiAgICAgIHJldHVybiBwYXRocy5jb25jYXQoT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKSk7XG4gICAgfSwgW10pO1xuXG4gICAgcmV0dXJuIHBhdGhzW2l0ZXJNZXRob2RdKGZ1bmN0aW9uIChwYXRoLCBpLCBwYXRocykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHBhdGgsIGksIHBhdGhzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qIVxuICogSXRlcmF0ZXMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2ggKCkge1xuICB0aGlzLmZvckVhY2ggPSB0aGlzLl9pdGVyKCdmb3JFYWNoJyk7XG4gIHJldHVybiB0aGlzLmZvckVhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogTWFwcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHByb2ZpbGUgY2FuIGxvb2sgbGlrZTpcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXG4gKiB0aGlzLmZvckVhY2goZm4pOyAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gYWxsIHN0YXRlc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIG1hcCAoKSB7XG4gIHRoaXMubWFwID0gdGhpcy5faXRlcignbWFwJyk7XG4gIHJldHVybiB0aGlzLm1hcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuIiwiLy9UT0RPOiDQv9C+0YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1iZWRkZWREb2N1bWVudCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcbnZhciBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIFN0b3JhZ2UgQXJyYXkgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1ZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIG90aGVyd2lzZSBgU3RvcmFnZUFycmF5I3B1c2hgIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQuX1xuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQGluaGVyaXRzIEFycmF5XG4gKiBAc2VlIGh0dHA6Ly9iaXQubHkvZjZDblpVXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIF8ubWl4aW4oIGFyciwgU3RvcmFnZUFycmF5Lm1peGluICk7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcbiAgYXJyLmlzU3RvcmFnZUFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG5TdG9yYWdlQXJyYXkubWl4aW4gPSB7XG4gIC8qKlxuICAgKiBQYXJlbnQgb3duZXIgZG9jdW1lbnRcbiAgICpcbiAgICogQHByb3BlcnR5IF9wYXJlbnRcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfcGFyZW50OiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhc3RzIGEgbWVtYmVyIGJhc2VkIG9uIHRoaXMgYXJyYXlzIHNjaGVtYS5cbiAgICpcbiAgICogQHBhcmFtIHsqfSB2YWx1ZVxuICAgKiBAcmV0dXJuIHZhbHVlIHRoZSBjYXN0ZWQgdmFsdWVcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfY2FzdDogZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgICB2YXIgb3duZXIgPSB0aGlzLl9vd25lcjtcbiAgICB2YXIgcG9wdWxhdGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAvLyBpZiBhIHBvcHVsYXRlZCBhcnJheSwgd2UgbXVzdCBjYXN0IHRvIHRoZSBzYW1lIG1vZGVsXG4gICAgICAvLyBpbnN0YW5jZSBhcyBzcGVjaWZpZWQgaW4gdGhlIG9yaWdpbmFsIHF1ZXJ5LlxuICAgICAgaWYgKCFvd25lcikge1xuICAgICAgICBvd25lciA9IHRoaXMuX293bmVyID0gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICA/IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50KClcbiAgICAgICAgICA6IHRoaXMuX3BhcmVudDtcbiAgICAgIH1cblxuICAgICAgcG9wdWxhdGVkID0gb3duZXIucG9wdWxhdGVkKHRoaXMuX3BhdGgsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChwb3B1bGF0ZWQgJiYgbnVsbCAhPSB2YWx1ZSkge1xuICAgICAgLy8gY2FzdCB0byB0aGUgcG9wdWxhdGVkIE1vZGVscyBzY2hlbWFcbiAgICAgIHZhciBNb2RlbCA9IHBvcHVsYXRlZC5vcHRpb25zLm1vZGVsO1xuXG4gICAgICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gICAgICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gICAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgICAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IG5ldyBNb2RlbCh2YWx1ZSk7XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZW1hLmNhc3Rlci5jYXN0KHZhbHVlLCB0aGlzLl9wYXJlbnQsIHRydWUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCBmYWxzZSlcbiAgfSxcblxuICAvKipcbiAgICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cbiAgICpcbiAgICogSWYgaXQgYnViYmxlcyB1cCBmcm9tIGFuIGVtYmVkZGVkIGRvY3VtZW50IGNoYW5nZSwgdGhlbiBpdCB0YWtlcyB0aGUgZm9sbG93aW5nIGFyZ3VtZW50cyAob3RoZXJ3aXNlLCB0YWtlcyAwIGFyZ3VtZW50cylcbiAgICpcbiAgICogQHBhcmFtIHtFbWJlZGRlZERvY3VtZW50fSBlbWJlZGRlZERvYyB0aGUgZW1iZWRkZWQgZG9jIHRoYXQgaW52b2tlZCB0aGlzIG1ldGhvZCBvbiB0aGUgQXJyYXlcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVtYmVkZGVkUGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkIGluIHRoZSBlbWJlZGRlZERvY1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9tYXJrTW9kaWZpZWQ6IGZ1bmN0aW9uIChlbGVtLCBlbWJlZGRlZFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XG4gICAgICAsIGRpcnR5UGF0aDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIGRpcnR5UGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChudWxsICE9IGVtYmVkZGVkUGF0aCkge1xuICAgICAgICAgIC8vIGFuIGVtYmVkZGVkIGRvYyBidWJibGVkIHVwIHRoZSBjaGFuZ2VcbiAgICAgICAgICBkaXJ0eVBhdGggPSBkaXJ0eVBhdGggKyAnLicgKyB0aGlzLmluZGV4T2YoZWxlbSkgKyAnLicgKyBlbWJlZGRlZFBhdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlyZWN0bHkgc2V0IGFuIGluZGV4XG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgZWxlbTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJlbnQubWFya01vZGlmaWVkKGRpcnR5UGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcHVzaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3B1c2gpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IFthcmdzLi4uXVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVzaDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIHJldCA9IFtdLnB1c2guYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcG9wYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcG9wKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCB3aGljaCB3aWxsIHBhc3MgdGhlIGVudGlyZSB0aGluZyB0byAkc2V0IHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQHNlZSBTdG9yYWdlQXJyYXkjJHBvcCAjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS0lMjRwb3BcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHBvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5wb3AuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5ID0gWzIsM107XG4gICAqICAgICB2YXIgcmVzID0gZG9jLmFycmF5LnNoaWZ0KCk7XG4gICAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzNdXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzaGlmdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5zaGlmdC5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAgICpcbiAgICogIyMjI0V4YW1wbGVzOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoT2JqZWN0SWQpXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCh7IF9pZDogJ3NvbWVJZCcgfSlcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoJ3RhZyAxJywgJ3RhZyAyJylcbiAgICpcbiAgICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAgICpcbiAgICogT3Igd2UgbWF5IHBhc3NpbmcgdGhlIF9pZCBkaXJlY3RseSBhbmQgbGV0IG1vbmdvb3NlIHRha2UgY2FyZSBvZiBpdC5cbiAgICpcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1bGwoNDgxNTE2MjM0Mik7IC8vIHdvcmtzXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gYXJndW1lbnRzXG4gICAqIEBzZWUgbW9uZ29kYiBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZy8jVXBkYXRpbmctJTI0cHVsbFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVsbDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIGN1ciA9IHRoaXMuX3BhcmVudC5nZXQodGhpcy5fcGF0aClcbiAgICAgICwgaSA9IGN1ci5sZW5ndGhcbiAgICAgICwgbWVtO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgbWVtID0gY3VyW2ldO1xuICAgICAgaWYgKG1lbSBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jdW1lbnQpIHtcbiAgICAgICAgaWYgKHZhbHVlcy5zb21lKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2LmVxdWFscyhtZW0pOyB9ICkpIHtcbiAgICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKH5jdXIuaW5kZXhPZi5jYWxsKHZhbHVlcywgbWVtKSkge1xuICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NwbGljZWBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NwbGljZSkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nIGFuZCBjYXN0aW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKCkge1xuICAgIHZhciByZXQsIHZhbHMsIGk7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdmFscyA9IFtdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YWxzW2ldID0gaSA8IDJcbiAgICAgICAgICA/IGFyZ3VtZW50c1tpXVxuICAgICAgICAgIDogdGhpcy5fY2FzdChhcmd1bWVudHNbaV0pO1xuICAgICAgfVxuICAgICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xuXG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB1bnNoaWZ0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XG4gICAgW10udW5zaGlmdC5hcHBseSh0aGlzLCB2YWx1ZXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NvcnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zb3J0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOT1RFOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzb3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldCA9IFtdLnNvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgdmFsdWVzIHRvIHRoZSBhcnJheSBpZiBub3QgYWxyZWFkeSBwcmVzZW50LlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICAgKiAgICAgdmFyIGFkZGVkID0gZG9jLmFycmF5LmFkZFRvU2V0KDQsNSk7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNCw1XVxuICAgKiAgICAgY29uc29sZS5sb2coYWRkZWQpICAgICAvLyBbNV1cbiAgICpcbiAgICogQHBhcmFtIHsqfSBhcmd1bWVudHNcbiAgICogQHJldHVybiB7QXJyYXl9IHRoZSB2YWx1ZXMgdGhhdCB3ZXJlIGFkZGVkXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBhZGRUb1NldDogZnVuY3Rpb24gYWRkVG9TZXQgKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIGFkZGVkID0gW11cbiAgICAgICwgdHlwZSA9IHZhbHVlc1swXSBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jdW1lbnQgPyAnZG9jJyA6XG4gICAgICAgICAgICAgICB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBEYXRlID8gJ2RhdGUnIDpcbiAgICAgICAgICAgICAgICcnO1xuXG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBmb3VuZDtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdkb2MnOlxuICAgICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGRvYyl7IHJldHVybiBkb2MuZXF1YWxzKHYpIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICB2YXIgdmFsID0gK3Y7XG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZCl7IHJldHVybiArZCA9PT0gdmFsIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGZvdW5kID0gfnRoaXMuaW5kZXhPZih2KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICBbXS5wdXNoLmNhbGwodGhpcywgdik7XG5cbiAgICAgICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgICAgIFtdLnB1c2guY2FsbChhZGRlZCwgdik7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICByZXR1cm4gYWRkZWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGNhc3RlZCBgdmFsYCBhdCBpbmRleCBgaWAgYW5kIG1hcmtzIHRoZSBhcnJheSBtb2RpZmllZC5cbiAgICpcbiAgICogIyMjI0V4YW1wbGU6XG4gICAqXG4gICAqICAgICAvLyBnaXZlbiBkb2N1bWVudHMgYmFzZWQgb24gdGhlIGZvbGxvd2luZ1xuICAgKiAgICAgdmFyIERvYyA9IG1vbmdvb3NlLm1vZGVsKCdEb2MnLCBuZXcgU2NoZW1hKHsgYXJyYXk6IFtOdW1iZXJdIH0pKTtcbiAgICpcbiAgICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgYXJyYXk6IFsyLDMsNF0gfSlcbiAgICpcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnNldCgxLFwiNVwiKTtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLDUsNF0gLy8gcHJvcGVybHkgY2FzdCB0byBudW1iZXJcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gdGhlIGNoYW5nZSBpcyBzYXZlZFxuICAgKlxuICAgKiAgICAgLy8gVlMgbm90IHVzaW5nIGFycmF5I3NldFxuICAgKiAgICAgZG9jLmFycmF5WzFdID0gXCI1XCI7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpOyAvLyBbMixcIjVcIiw0XSAvLyBubyBjYXN0aW5nXG4gICAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZSBpcyBub3Qgc2F2ZWRcbiAgICpcbiAgICogQHJldHVybiB7QXJyYXl9IHRoaXNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNldDogZnVuY3Rpb24gKGksIHZhbCkge1xuICAgIHRoaXNbaV0gPSB0aGlzLl9jYXN0KHZhbCk7XG4gICAgdGhpcy5fbWFya01vZGlmaWVkKGkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5LlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtBcnJheX1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvT2JqZWN0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmV0dXJuIGRvYyBpbnN0YW5jZW9mIERvY3VtZW50XG4gICAgICAgICAgPyBkb2MudG9PYmplY3Qob3B0aW9ucylcbiAgICAgICAgICA6IGRvY1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBpbmRleCBvZiBgb2JqYCBvciBgLTFgIGlmIG5vdCBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgaXRlbSB0byBsb29rIGZvclxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBpbmRleE9mOiBmdW5jdGlvbiBpbmRleE9mIChvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgT2JqZWN0SWQpIG9iaiA9IG9iai50b1N0cmluZygpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBpZiAob2JqID09IHRoaXNbaV0pXG4gICAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cbn07XG5cbi8qKlxuICogQWxpYXMgb2YgW3B1bGxdKCN0eXBlc19hcnJheV9Nb25nb29zZUFycmF5LXB1bGwpXG4gKlxuICogQHNlZSBTdG9yYWdlQXJyYXkjcHVsbCAjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS1wdWxsXG4gKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAqIEBhcGkgcHVibGljXG4gKiBAbWVtYmVyT2YgU3RvcmFnZUFycmF5XG4gKiBAbWV0aG9kIHJlbW92ZVxuICovXG5TdG9yYWdlQXJyYXkubWl4aW4ucmVtb3ZlID0gU3RvcmFnZUFycmF5Lm1peGluLnB1bGw7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlQXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICwgT2JqZWN0SWRTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEvb2JqZWN0aWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBEb2N1bWVudEFycmF5IGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byB0aGlzIGFycmF5XG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge1N0b3JhZ2VEb2N1bWVudEFycmF5fVxuICogQGluaGVyaXRzIFN0b3JhZ2VBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICogVE9ETzog0L/QvtC00YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG4gKlxuICog0JLQtdGB0Ywg0L3Rg9C20L3Ri9C5INC60L7QtCDRgdC60L7Qv9C40YDQvtCy0LDQvVxuICovXG5mdW5jdGlvbiBTdG9yYWdlRG9jdW1lbnRBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuXG4gIC8vIFZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIHNpbmNlXG4gIC8vIG90aGVyd2lzZSBTdG9yYWdlQXJyYXkjcHVzaCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkIHRvIHRoZSBwYXJlbnQuXG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG4gIGFyci5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgYXJyLl9oYW5kbGVycyA9IHtcbiAgICAgIGlzTmV3OiBhcnIubm90aWZ5KCdpc05ldycpLFxuICAgICAgc2F2ZTogYXJyLm5vdGlmeSgnc2F2ZScpXG4gICAgfTtcblxuICAgIC8vINCf0YDQvtCx0YDQvtGBINC40LfQvNC10L3QtdC90LjRjyDRgdC+0YHRgtC+0Y/QvdC40Y8g0LIg0L/QvtC00LTQvtC60YPQvNC10L3RglxuICAgIGRvYy5vbignc2F2ZScsIGFyci5faGFuZGxlcnMuc2F2ZSk7XG4gICAgZG9jLm9uKCdpc05ldycsIGFyci5faGFuZGxlcnMuaXNOZXcpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VBcnJheVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5fY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoISh2YWx1ZS5fX3BhcmVudCAmJiB2YWx1ZS5fX3BhcmVudEFycmF5KSkge1xuICAgICAgLy8gdmFsdWUgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIHVzaW5nIGFycmF5LmNyZWF0ZSgpXG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgIHZhbHVlLl9fcGFyZW50QXJyYXkgPSB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBoYW5kbGUgY2FzdCgnc3RyaW5nJykgb3IgY2FzdChPYmplY3RJZCkgZXRjLlxuICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICB9XG5cbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IodmFsdWUsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBTZWFyY2hlcyBhcnJheSBpdGVtcyBmb3IgdGhlIGZpcnN0IGRvY3VtZW50IHdpdGggYSBtYXRjaGluZyBfaWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBlbWJlZGRlZERvYyA9IG0uYXJyYXkuaWQoc29tZV9pZCk7XG4gKlxuICogQHJldHVybiB7RW1iZWRkZWREb2N1bWVudHxudWxsfSB0aGUgc3ViZG9jdW1lbnQgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gKiBAcGFyYW0ge09iamVjdElkfFN0cmluZ3xOdW1iZXJ9IGlkXG4gKiBAVE9ETyBjYXN0IHRvIHRoZSBfaWQgYmFzZWQgb24gc2NoZW1hIGZvciBwcm9wZXIgY29tcGFyaXNvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uaWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgdmFyIGNhc3RlZFxuICAgICwgc2lkXG4gICAgLCBfaWQ7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY2FzdGVkXyA9IE9iamVjdElkU2NoZW1hLnByb3RvdHlwZS5jYXN0LmNhbGwoe30sIGlkKTtcbiAgICBpZiAoY2FzdGVkXykgY2FzdGVkID0gU3RyaW5nKGNhc3RlZF8pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FzdGVkID0gbnVsbDtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBfaWQgPSB0aGlzW2ldLmdldCgnX2lkJyk7XG5cbiAgICBpZiAoX2lkIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZC5faWQpIHJldHVybiB0aGlzW2ldO1xuICAgIH0gZWxzZSBpZiAoIShfaWQgaW5zdGFuY2VvZiBPYmplY3RJZCkpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmIChjYXN0ZWQgPT0gX2lkKSB7XG4gICAgICByZXR1cm4gdGhpc1tpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheSBvZiBwbGFpbiBqcyBvYmplY3RzXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX0VhY2ggc3ViLWRvY3VtZW50IGlzIGNvbnZlcnRlZCB0byBhIHBsYWluIG9iamVjdCBieSBjYWxsaW5nIGl0cyBgI3RvT2JqZWN0YCBtZXRob2QuX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWwgb3B0aW9ucyB0byBwYXNzIHRvIGVhY2ggZG9jdW1lbnRzIGB0b09iamVjdGAgbWV0aG9kIGNhbGwgZHVyaW5nIGNvbnZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3Iob2JqKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZuIHRoYXQgbm90aWZpZXMgYWxsIGNoaWxkIGRvY3Mgb2YgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLm5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSAoZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gbm90aWZ5ICh2YWwpIHtcbiAgICB2YXIgaSA9IHNlbGYubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGlmICghc2VsZltpXSkgY29udGludWU7XG4gICAgICBzZWxmW2ldLnRyaWdnZXIoZXZlbnQsIHZhbCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZURvY3VtZW50QXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBFbWJlZGRlZERvY3VtZW50IGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGpzIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoZSBkYlxuICogQHBhcmFtIHtNb25nb29zZURvY3VtZW50QXJyYXl9IHBhcmVudEFyciB0aGUgcGFyZW50IGFycmF5IG9mIHRoaXMgZG9jdW1lbnRcbiAqIEBpbmhlcml0cyBEb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVtYmVkZGVkRG9jdW1lbnQgKCBkYXRhLCBwYXJlbnRBcnIgKSB7XG4gIGlmIChwYXJlbnRBcnIpIHtcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkgPSBwYXJlbnRBcnI7XG4gICAgdGhpcy5fX3BhcmVudCA9IHBhcmVudEFyci5fcGFyZW50O1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9fcGFyZW50ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgRG9jdW1lbnQuY2FsbCggdGhpcywgZGF0YSwgdW5kZWZpbmVkICk7XG5cbiAgLy8g0J3Rg9C20L3QviDQtNC70Y8g0L/RgNC+0LHRgNC+0YHQsCDQuNC30LzQtdC90LXQvdC40Y8g0LfQvdCw0YfQtdC90LjRjyDQuNC3INGA0L7QtNC40YLQtdC70YzRgdC60L7Qs9C+INC00L7QutGD0LzQtdC90YLQsCwg0L3QsNC/0YDQuNC80LXRgCDQv9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40LhcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLm9uKCdpc05ldycsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICBzZWxmLmlzTmV3ID0gdmFsO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gRG9jdW1lbnRcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBEb2N1bWVudC5wcm90b3R5cGUgKTtcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcblxuLyoqXG4gKiBNYXJrcyB0aGUgZW1iZWRkZWQgZG9jIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZG9jID0gYmxvZ3Bvc3QuY29tbWVudHMuaWQoaGV4c3RyaW5nKTtcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybjtcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHtcbiAgICAvLyBNYXJrIHRoZSBXSE9MRSBwYXJlbnQgYXJyYXkgYXMgbW9kaWZpZWRcbiAgICAvLyBpZiB0aGlzIGlzIGEgbmV3IGRvY3VtZW50IChpLmUuLCB3ZSBhcmUgaW5pdGlhbGl6aW5nXG4gICAgLy8gYSBkb2N1bWVudCksXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQoKTtcbiAgfSBlbHNlXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQodGhpcywgcGF0aCk7XG59O1xuXG4vKipcbiAqIFVzZWQgYXMgYSBzdHViIGZvciBbaG9va3MuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzMpXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1RoaXMgaXMgYSBuby1vcC4gRG9lcyBub3QgYWN0dWFsbHkgc2F2ZSB0aGUgZG9jIHRvIHRoZSBkYi5fXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZWQgUHJvbWlzZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgcHJvbWlzZSA9ICQuRGVmZXJyZWQoKS5kb25lKGZuKTtcbiAgcHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHN1YmRvY3VtZW50IGZyb20gaXRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBfaWQ7XG4gIGlmICghdGhpcy53aWxsUmVtb3ZlKSB7XG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcbiAgICBpZiAoIV9pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3IgeW91ciBvd24gZ29vZCwgTW9uZ29vc2UgZG9lcyBub3Qga25vdyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnaG93IHRvIHJlbW92ZSBhbiBFbWJlZGRlZERvY3VtZW50IHRoYXQgaGFzIG5vIF9pZCcpO1xuICAgIH1cbiAgICB0aGlzLl9fcGFyZW50QXJyYXkucHVsbCh7IF9pZDogX2lkIH0pO1xuICAgIHRoaXMud2lsbFJlbW92ZSA9IHRydWU7XG4gIH1cblxuICBpZiAoZm4pXG4gICAgZm4obnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlICN1cGRhdGUgbWV0aG9kIG9mIHBhcmVudCBkb2N1bWVudHMuXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSAjdXBkYXRlIG1ldGhvZCBpcyBub3QgYXZhaWxhYmxlIG9uIEVtYmVkZGVkRG9jdW1lbnRzJyk7XG59O1xuXG4vKipcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVyciBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVyciwgdmFsLCBmaXJzdCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnQpIHtcbiAgICB2YXIgbXNnID0gJ1VuYWJsZSB0byBpbnZhbGlkYXRlIGEgc3ViZG9jdW1lbnQgdGhhdCBoYXMgbm90IGJlZW4gYWRkZWQgdG8gYW4gYXJyYXkuJ1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fX3BhcmVudEFycmF5LmluZGV4T2YodGhpcyk7XG4gIHZhciBwYXJlbnRQYXRoID0gdGhpcy5fX3BhcmVudEFycmF5Ll9wYXRoO1xuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcblxuICAvLyBzbmlmZmluZyBhcmd1bWVudHM6XG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXG4gIC8vIG91ciBlcnJvciBtZXNzYWdlIGNsZWFuLlxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVycik7XG4gIH1cblxuICBpZiAoZmlyc3QpXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvcCBsZXZlbCBkb2N1bWVudCBvZiB0aGlzIHN1Yi1kb2N1bWVudC5cbiAqXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSB0aGlzLl9fcGFyZW50O1xuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XG5cbiAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdGhpcyBkb2N1bWVudC4gSWYgb3B0aW9uYWwgYHBhdGhgIGlzIHBhc3NlZCwgaXQgaXMgYXBwZW5kZWQgdG8gdGhlIGZ1bGwgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcbiAqIEBtZW1iZXJPZiBFbWJlZGRlZERvY3VtZW50XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLiRfXy5mdWxsUGF0aCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIGlmICghcGFyZW50Ll9fcGFyZW50KSByZXR1cm4gcGF0aDtcblxuICAgIHZhciBwYXRocyA9IFtdO1xuICAgIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcbiAgICAgIHBhdGhzLnVuc2hpZnQocGFyZW50Ll9fcGFyZW50QXJyYXkuX3BhdGgpO1xuICAgICAgcGFyZW50ID0gcGFyZW50Ll9fcGFyZW50O1xuICAgIH1cblxuICAgIHRoaXMuJF9fLmZ1bGxQYXRoID0gcGF0aHMuam9pbignLicpO1xuXG4gICAgaWYgKCF0aGlzLiRfXy5vd25lckRvY3VtZW50KSB7XG4gICAgICAvLyBvcHRpbWl6YXRpb25cbiAgICAgIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGhcbiAgICA/IHRoaXMuJF9fLmZ1bGxQYXRoICsgJy4nICsgcGF0aFxuICAgIDogdGhpcy4kX18uZnVsbFBhdGg7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgYXJyYXkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50QXJyYXk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1iZWRkZWREb2N1bWVudDtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkVtYmVkZGVkID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICogQGlnbm9yZVxuICovXG52YXIgQmluYXJ5UGFyc2VyID0gcmVxdWlyZSgnLi4vYmluYXJ5X3BhcnNlcicpLkJpbmFyeVBhcnNlcjtcblxuLyoqXG4gKiBNYWNoaW5lIGlkLlxuICpcbiAqIENyZWF0ZSBhIHJhbmRvbSAzLWJ5dGUgdmFsdWUgKGkuZS4gdW5pcXVlIGZvciB0aGlzXG4gKiBwcm9jZXNzKS4gT3RoZXIgZHJpdmVycyB1c2UgYSBtZDUgb2YgdGhlIG1hY2hpbmUgaWQgaGVyZSwgYnV0XG4gKiB0aGF0IHdvdWxkIG1lYW4gYW4gYXN5YyBjYWxsIHRvIGdldGhvc3RuYW1lLCBzbyB3ZSBkb24ndCBib3RoZXIuXG4gKiBAaWdub3JlXG4gKi9cbnZhciBNQUNISU5FX0lEID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IGNoZWNrcyBmb3IgaGV4IHZhbHVlXG52YXIgY2hlY2tGb3JIZXhSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlswLTlhLWZBLUZdezI0fSRcIik7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IE9iamVjdElkIGluc3RhbmNlXG4gKlxuICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vbW9uZ29kYi9qcy1ic29uL2Jsb2IvbWFzdGVyL2xpYi9ic29uL29iamVjdGlkLmpzXG4gKiBAY2xhc3MgUmVwcmVzZW50cyBhIEJTT04gT2JqZWN0SWQgdHlwZS5cbiAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBnZW5lcmF0aW9uVGltZSBUaGUgZ2VuZXJhdGlvbiB0aW1lIG9mIHRoaXMgT2JqZWN0SWQgaW5zdGFuY2VcbiAqIEByZXR1cm4ge09iamVjdElkfSBpbnN0YW5jZSBvZiBPYmplY3RJZC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SWQoaWQpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgaWYoKGlkIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gaWQ7XG5cbiAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICB2YXIgdmFsaWQgPSBPYmplY3RJZC5pc1ZhbGlkKGlkKTtcblxuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKCF2YWxpZCAmJiBpZCAhPSBudWxsKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG4gIH0gZWxzZSBpZih2YWxpZCAmJiB0eXBlb2YgaWQgPT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoID09IDI0KSB7XG4gICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICB9IGVsc2UgaWYoaWQgPT0gbnVsbCB8fCB0eXBlb2YgaWQgPT0gJ251bWJlcicpIHtcbiAgICAvLyBjb252ZXJ0IHRvIDEyIGJ5dGUgYmluYXJ5IHN0cmluZ1xuICAgIHRoaXMuaWQgPSB0aGlzLmdlbmVyYXRlKGlkKTtcbiAgfSBlbHNlIGlmKGlkICE9IG51bGwgJiYgaWQubGVuZ3RoID09PSAxMikge1xuICAgIC8vIGFzc3VtZSAxMiBieXRlIHN0cmluZ1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfVxuXG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB0aGlzLl9faWQgPSB0aGlzLnRvSGV4U3RyaW5nKCk7XG59XG5cbi8vIFByZWNvbXB1dGVkIGhleCB0YWJsZSBlbmFibGVzIHNwZWVkeSBoZXggc3RyaW5nIGNvbnZlcnNpb25cbnZhciBoZXhUYWJsZSA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7IGkrKykge1xuICBoZXhUYWJsZVtpXSA9IChpIDw9IDE1ID8gJzAnIDogJycpICsgaS50b1N0cmluZygxNik7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBPYmplY3RJZCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge3N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0hleFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZyAmJiB0aGlzLl9faWQpIHJldHVybiB0aGlzLl9faWQ7XG5cbiAgdmFyIGhleFN0cmluZyA9ICcnO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pZC5sZW5ndGg7IGkrKykge1xuICAgIGhleFN0cmluZyArPSBoZXhUYWJsZVt0aGlzLmlkLmNoYXJDb2RlQXQoaSldO1xuICB9XG5cbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHRoaXMuX19pZCA9IGhleFN0cmluZztcbiAgcmV0dXJuIGhleFN0cmluZztcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge251bWJlcn0gcmV0dXJucyBuZXh0IGluZGV4IHZhbHVlLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0X2luYyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0SWQuaW5kZXggPSAoT2JqZWN0SWQuaW5kZXggKyAxKSAlIDB4RkZGRkZGO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7bnVtYmVyfSByZXR1cm5zIG5leHQgaW5kZXggdmFsdWUuXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZXRJbmMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZ2V0X2luYygpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIDEyIGJ5dGUgaWQgc3RyaW5nIHVzZWQgaW4gT2JqZWN0SWQnc1xuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7bnVtYmVyfSBbdGltZV0gb3B0aW9uYWwgcGFyYW1ldGVyIGFsbG93aW5nIHRvIHBhc3MgaW4gYSBzZWNvbmQgYmFzZWQgdGltZXN0YW1wLlxuICogQHJldHVybiB7c3RyaW5nfSByZXR1cm4gdGhlIDEyIGJ5dGUgaWQgYmluYXJ5IHN0cmluZy5cbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAoJ251bWJlcicgIT0gdHlwZW9mIHRpbWUpIHtcbiAgICB0aW1lID0gcGFyc2VJbnQoRGF0ZS5ub3coKS8xMDAwLDEwKTtcbiAgfVxuXG4gIHZhciB0aW1lNEJ5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gIC8qIGZvciB0aW1lLWJhc2VkIE9iamVjdElkIHRoZSBieXRlcyBmb2xsb3dpbmcgdGhlIHRpbWUgd2lsbCBiZSB6ZXJvZWQgKi9cbiAgdmFyIG1hY2hpbmUzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KE1BQ0hJTkVfSUQsIDI0LCBmYWxzZSk7XG4gIHZhciBwaWQyQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZnJvbVNob3J0KHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCk7XG4gIHZhciBpbmRleDNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGhpcy5nZXRfaW5jKCksIDI0LCBmYWxzZSwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHRpbWU0Qnl0ZXMgKyBtYWNoaW5lM0J5dGVzICsgcGlkMkJ5dGVzICsgaW5kZXgzQnl0ZXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHRoZSBpZCBpbnRvIGEgMjQgYnl0ZSBoZXggc3RyaW5nIGZvciBwcmludGluZ1xuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0byBpdHMgSlNPTiByZXByZXNlbnRhdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElkIHdpdGggYG90aGVySURgLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvdGhlcklEIE9iamVjdElkIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJZCdzXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKG90aGVySUQpIHtcbiAgaWYob3RoZXJJRCA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIHZhciBpZCA9IChvdGhlcklEIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgb3RoZXJJRC50b0hleFN0cmluZylcbiAgICA/IG90aGVySUQuaWRcbiAgICA6IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcob3RoZXJJRCkuaWQ7XG5cbiAgcmV0dXJuIHRoaXMuaWQgPT09IGlkO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge2RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldFRpbWVzdGFtcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgdGltZXN0YW1wLnNldFRpbWUoTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsNCksIDMyLCB0cnVlLCB0cnVlKSkgKiAxMDAwKTtcbiAgcmV0dXJuIHRpbWVzdGFtcDtcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQuY3JlYXRlUGsgPSBmdW5jdGlvbiBjcmVhdGVQayAoKSB7XG4gIHJldHVybiBuZXcgT2JqZWN0SWQoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24gY3JlYXRlRnJvbVRpbWUgKHRpbWUpIHtcbiAgdmFyIGlkID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSkgK1xuICAgIEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoMCwgNjQsIHRydWUsIHRydWUpO1xuICByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElkIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbiBjcmVhdGVGcm9tSGV4U3RyaW5nIChoZXhTdHJpbmcpIHtcbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZih0eXBlb2YgaGV4U3RyaW5nID09PSAndW5kZWZpbmVkJyB8fCBoZXhTdHJpbmcgIT0gbnVsbCAmJiBoZXhTdHJpbmcubGVuZ3RoICE9IDI0KVxuICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICB2YXIgbGVuID0gaGV4U3RyaW5nLmxlbmd0aDtcblxuICBpZihsZW4gPiAxMioyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJZCBjYW5ub3QgYmUgbG9uZ2VyIHRoYW4gMTIgYnl0ZXMnKTtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSAnJ1xuICAgICwgc3RyaW5nXG4gICAgLCBudW1iZXI7XG5cbiAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbjsgaW5kZXggKz0gMikge1xuICAgIHN0cmluZyA9IGhleFN0cmluZy5zdWJzdHIoaW5kZXgsIDIpO1xuICAgIG51bWJlciA9IHBhcnNlSW50KHN0cmluZywgMTYpO1xuICAgIHJlc3VsdCArPSBCaW5hcnlQYXJzZXIuZnJvbUJ5dGUobnVtYmVyKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgT2JqZWN0SWQocmVzdWx0LCBoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtib29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkLCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG5PYmplY3RJZC5pc1ZhbGlkID0gZnVuY3Rpb24gaXNWYWxpZChpZCkge1xuICBpZihpZCA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYoaWQgIT0gbnVsbCAmJiAnbnVtYmVyJyAhPSB0eXBlb2YgaWQgJiYgKGlkLmxlbmd0aCAhPSAxMiAmJiBpZC5sZW5ndGggIT0gMjQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIC8vIENoZWNrIHNwZWNpZmljYWxseSBmb3IgaGV4IGNvcnJlY3RuZXNzXG4gICAgaWYodHlwZW9mIGlkID09ICdzdHJpbmcnICYmIGlkLmxlbmd0aCA9PSAyNCkgcmV0dXJuIGNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdElkLnByb3RvdHlwZSwgXCJnZW5lcmF0aW9uVGltZVwiLCB7XG4gIGVudW1lcmFibGU6IHRydWVcbiAgLCBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsNCksIDMyLCB0cnVlLCB0cnVlKSk7XG4gIH1cbiAgLCBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciB2YWx1ZSA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodmFsdWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgICB0aGlzLmlkID0gdmFsdWUgKyB0aGlzLmlkLnN1YnN0cig0KTtcbiAgICAvLyBkZWxldGUgdGhpcy5fX2lkO1xuICAgIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgfVxufSk7XG5cbi8qKlxuICogRXhwb3NlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xubW9kdWxlLmV4cG9ydHMuT2JqZWN0SWQgPSBPYmplY3RJZDtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIG1wYXRoID0gcmVxdWlyZSgnLi9tcGF0aCcpXG4gICwgU3RvcmFnZUFycmF5XG4gICwgRG9jdW1lbnQ7XG5cbmV4cG9ydHMubXBhdGggPSBtcGF0aDtcblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIHJ1bGVzLlxuICpcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICpcbiAqL1xuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xuICBbLyhtKWFuJC9naSwgJyQxZW4nXSxcbiAgWy8ocGUpcnNvbiQvZ2ksICckMW9wbGUnXSxcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXG4gIFsvXihveCkkL2dpLCAnJDFlbiddLFxuICBbLyhheHx0ZXN0KWlzJC9naSwgJyQxZXMnXSxcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxuICBbLyhhbGlhc3xzdGF0dXMpJC9naSwgJyQxZXMnXSxcbiAgWy8oYnUpcyQvZ2ksICckMXNlcyddLFxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxuICBbLyhbdGldKXVtJC9naSwgJyQxYSddLFxuICBbL3NpcyQvZ2ksICdzZXMnXSxcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXG4gIFsvKGhpdmUpJC9naSwgJyQxcyddLFxuICBbLyhbXmFlaW91eV18cXUpeSQvZ2ksICckMWllcyddLFxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXG4gIFsvKG1hdHJ8dmVydHxpbmQpaXh8ZXgkL2dpLCAnJDFpY2VzJ10sXG4gIFsvKFttfGxdKW91c2UkL2dpLCAnJDFpY2UnXSxcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcbiAgWy8ocXVpeikkL2dpLCAnJDF6ZXMnXSxcbiAgWy9zJC9naSwgJ3MnXSxcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcbiAgWy8kL2dpLCAncyddXG5dO1xudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xuXG4vKipcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxuICpcbiAqIFRoZXNlIHdvcmRzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0cy51bmNvdW50YWJsZXMgPSBbXG4gICdhZHZpY2UnLFxuICAnZW5lcmd5JyxcbiAgJ2V4Y3JldGlvbicsXG4gICdkaWdlc3Rpb24nLFxuICAnY29vcGVyYXRpb24nLFxuICAnaGVhbHRoJyxcbiAgJ2p1c3RpY2UnLFxuICAnbGFib3VyJyxcbiAgJ21hY2hpbmVyeScsXG4gICdlcXVpcG1lbnQnLFxuICAnaW5mb3JtYXRpb24nLFxuICAncG9sbHV0aW9uJyxcbiAgJ3Nld2FnZScsXG4gICdwYXBlcicsXG4gICdtb25leScsXG4gICdzcGVjaWVzJyxcbiAgJ3NlcmllcycsXG4gICdyYWluJyxcbiAgJ3JpY2UnLFxuICAnZmlzaCcsXG4gICdzaGVlcCcsXG4gICdtb29zZScsXG4gICdkZWVyJyxcbiAgJ25ld3MnLFxuICAnZXhwZXJ0aXNlJyxcbiAgJ3N0YXR1cycsXG4gICdtZWRpYSdcbl07XG52YXIgdW5jb3VudGFibGVzID0gZXhwb3J0cy51bmNvdW50YWJsZXM7XG5cbi8qIVxuICogUGx1cmFsaXplIGZ1bmN0aW9uLlxuICpcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0byBwbHVyYWxpemVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGx1cmFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgZm91bmQ7XG4gIGlmICghfnVuY291bnRhYmxlcy5pbmRleE9mKHN0ci50b0xvd2VyQ2FzZSgpKSl7XG4gICAgZm91bmQgPSBydWxlcy5maWx0ZXIoZnVuY3Rpb24ocnVsZSl7XG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xuICAgIH0pO1xuICAgIGlmIChmb3VuZFswXSkgcmV0dXJuIHN0ci5yZXBsYWNlKGZvdW5kWzBdWzBdLCBmb3VuZFswXVsxXSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbi8qIVxuICogRGV0ZXJtaW5lcyBpZiBgYWAgYW5kIGBiYCBhcmUgZGVlcCBlcXVhbC5cbiAqXG4gKiBNb2RpZmllZCBmcm9tIG5vZGUvbGliL2Fzc2VydC5qc1xuICogTW9kaWZpZWQgZnJvbSBtb25nb29zZS91dGlscy5qc1xuICpcbiAqIEBwYXJhbSB7Kn0gYSBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGJgXG4gKiBAcGFyYW0geyp9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09IHR5cGVvZiBvXG4gICAgICAmJiAnW29iamVjdCBSZWdFeHBdJyA9PSB0b1N0cmluZy5jYWxsKG8pO1xufVxuXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cCAocmVnZXhwKSB7XG4gIGlmICghaXNSZWdFeHAocmVnZXhwKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhIFJlZ0V4cCcpO1xuICB9XG5cbiAgdmFyIGZsYWdzID0gW107XG4gIGlmIChyZWdleHAuZ2xvYmFsKSBmbGFncy5wdXNoKCdnJyk7XG4gIGlmIChyZWdleHAubXVsdGlsaW5lKSBmbGFncy5wdXNoKCdtJyk7XG4gIGlmIChyZWdleHAuaWdub3JlQ2FzZSkgZmxhZ3MucHVzaCgnaScpO1xuICByZXR1cm4gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBmbGFncy5qb2luKCcnKSk7XG59XG5cbi8qIVxuICogT2JqZWN0IGNsb25lIHdpdGggU3RvcmFnZSBuYXRpdmVzIHN1cHBvcnQuXG4gKlxuICogSWYgb3B0aW9ucy5taW5pbWl6ZSBpcyB0cnVlLCBjcmVhdGVzIGEgbWluaW1hbCBkYXRhIG9iamVjdC4gRW1wdHkgb2JqZWN0cyBhbmQgdW5kZWZpbmVkIHZhbHVlcyB3aWxsIG5vdCBiZSBjbG9uZWQuIFRoaXMgbWFrZXMgdGhlIGRhdGEgcGF5bG9hZCBzZW50IHRvIE1vbmdvREIgYXMgc21hbGwgYXMgcG9zc2libGUuXG4gKlxuICogRnVuY3Rpb25zIGFyZSBuZXZlciBjbG9uZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIGNsb25lXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fSB0aGUgY2xvbmVkIG9iamVjdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSAob2JqLCBvcHRpb25zKSB7XG4gIGlmIChvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGwpXG4gICAgcmV0dXJuIG9iajtcblxuICBpZiAoIF8uaXNBcnJheSggb2JqICkgKSB7XG4gICAgcmV0dXJuIGNsb25lQXJyYXkoIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgaWYgKCBpc1N0b3JhZ2VPYmplY3QoIG9iaiApICkge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuanNvbiAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqLnRvSlNPTikge1xuICAgICAgcmV0dXJuIG9iai50b0pTT04oIG9wdGlvbnMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9iai50b09iamVjdCggb3B0aW9ucyApO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqLmNvbnN0cnVjdG9yICkge1xuICAgIHN3aXRjaCAoIGdldEZ1bmN0aW9uTmFtZSggb2JqLmNvbnN0cnVjdG9yICkpIHtcbiAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgIHJldHVybiBjbG9uZU9iamVjdChvYmosIG9wdGlvbnMpO1xuICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgIHJldHVybiBuZXcgb2JqLmNvbnN0cnVjdG9yKCArb2JqICk7XG4gICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICByZXR1cm4gY2xvbmVSZWdFeHAoIG9iaiApO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqIGluc3RhbmNlb2YgT2JqZWN0SWQgKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJZCggb2JqLmlkICk7XG4gIH1cblxuICBpZiAoICFvYmouY29uc3RydWN0b3IgJiYgXy5pc09iamVjdCggb2JqICkgKSB7XG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgcmV0dXJuIGNsb25lT2JqZWN0KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggb2JqLnZhbHVlT2YgKXtcbiAgICByZXR1cm4gb2JqLnZhbHVlT2YoKTtcbiAgfVxufTtcbnZhciBjbG9uZSA9IGV4cG9ydHMuY2xvbmU7XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGNsb25lT2JqZWN0IChvYmosIG9wdGlvbnMpIHtcbiAgdmFyIHJldGFpbktleU9yZGVyID0gb3B0aW9ucyAmJiBvcHRpb25zLnJldGFpbktleU9yZGVyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxuICAgICwgcmV0ID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleXNcbiAgICAsIHZhbFxuICAgICwga1xuICAgICwgaTtcblxuICBpZiAoIHJldGFpbktleU9yZGVyICkge1xuICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgIHZhbCA9IGNsb25lKCBvYmpba10sIG9wdGlvbnMgKTtcblxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcbiAgICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGZhc3RlclxuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcbiAgICBpID0ga2V5cy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrID0ga2V5c1tpXTtcbiAgICAgIHZhbCA9IGNsb25lKG9ialtrXSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xuICAgICAgICBpZiAoIWhhc0tleXMpIGhhc0tleXMgPSB0cnVlO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbmltaXplXG4gICAgPyBoYXNLZXlzICYmIHJldFxuICAgIDogcmV0O1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyohXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdG9ba2V5XSkge1xuICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KGZyb21ba2V5XSkgKSB7XG4gICAgICBtZXJnZSh0b1trZXldLCBmcm9tW2tleV0pO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gc3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDMpO1xufTtcblxuXG4vKiFcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXG4gKlxuICogVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGxpYnMgbGlrZSBEYXRlLmpzIHdoaWNoIGRvIGZvb2xpc2ggdGhpbmdzIHRvIE5hdGl2ZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3QgPSBmdW5jdGlvbiAoIHYgKSB7XG4gIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKSk7XG4gIC8vU3RvcmFnZUFycmF5IHx8IChTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2FycmF5JykpO1xuXG4gIHJldHVybiB2IGluc3RhbmNlb2YgRG9jdW1lbnQgfHxcbiAgICAgICAoIHYgJiYgdi5pc1N0b3JhZ2VBcnJheSApO1xufTtcbnZhciBpc1N0b3JhZ2VPYmplY3QgPSBleHBvcnRzLmlzU3RvcmFnZU9iamVjdDtcblxuLyohXG4gKiBSZXR1cm4gdGhlIHZhbHVlIG9mIGBvYmpgIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLmdldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIG9iaiwgbWFwKSB7XG4gIHJldHVybiBtcGF0aC5nZXQocGF0aCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG4vKiFcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGBvYmpgIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7QW55dGhpbmd9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICovXG5cbmV4cG9ydHMuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvYmosIG1hcCkge1xuICBtcGF0aC5zZXQocGF0aCwgdmFsLCBvYmosICdfZG9jJywgbWFwKTtcbn07XG5cbnZhciByRnVuY3Rpb25OYW1lID0gL15mdW5jdGlvblxccyooW15cXHMoXSspLztcblxuZnVuY3Rpb24gZ2V0RnVuY3Rpb25OYW1lKCBjdG9yICl7XG4gIGlmIChjdG9yLm5hbWUpIHtcbiAgICByZXR1cm4gY3Rvci5uYW1lO1xuICB9XG4gIHJldHVybiAoY3Rvci50b1N0cmluZygpLnRyaW0oKS5tYXRjaCggckZ1bmN0aW9uTmFtZSApIHx8IFtdKVsxXTtcbn1cblxuZXhwb3J0cy5nZXRGdW5jdGlvbk5hbWUgPSBnZXRGdW5jdGlvbk5hbWU7XG5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gKGZ1bmN0aW9uKCkge1xuICAvLyDQlNC70Y8g0L/QvtC00LTQtdGA0LbQutC4INGC0LXRgdGC0L7QsiAo0L7QutGA0YPQttC10L3QuNC1IG5vZGUuanMpXG4gIGlmICggdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayApIHJldHVybiBwcm9jZXNzLm5leHRUaWNrO1xuICAvLyDQldGB0LvQuCDQsiDQsdGA0LDRg9C30LXRgNC1INGD0LbQtSDRgNC10LDQu9C40LfQvtCy0LDQvSDRjdGC0L7RgiDQvNC10YLQvtC0XG4gIGlmICggd2luZG93LnNldEltbWVkaWF0ZSApIHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuXG4gIHZhciBoZWFkID0geyB9LCB0YWlsID0gaGVhZDsgLy8g0L7Rh9C10YDQtdC00Ywg0LLRi9C30L7QstC+0LIsIDEt0YHQstGP0LfQvdGL0Lkg0YHQv9C40YHQvtC6XG5cbiAgdmFyIElEID0gTWF0aC5yYW5kb20oKTsgLy8g0YPQvdC40LrQsNC70YzQvdGL0Lkg0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YBcblxuICBmdW5jdGlvbiBvbm1lc3NhZ2UoZSkge1xuICAgIGlmKGUuZGF0YSAhPSBJRCkgcmV0dXJuOyAvLyDQvdC1INC90LDRiNC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgdmFyIGZ1bmMgPSBoZWFkLmZ1bmM7XG4gICAgZGVsZXRlIGhlYWQuZnVuYztcbiAgICBmdW5jKCk7XG4gIH1cblxuICBpZih3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikgeyAvLyBJRTkrLCDQtNGA0YPQs9C40LUg0LHRgNCw0YPQt9C10YDRi1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25tZXNzYWdlLCBmYWxzZSk7XG4gIH0gZWxzZSB7IC8vIElFOFxuICAgIHdpbmRvdy5hdHRhY2hFdmVudCggJ29ubWVzc2FnZScsIG9ubWVzc2FnZSApO1xuICB9XG5cbiAgcmV0dXJuIHdpbmRvdy5wb3N0TWVzc2FnZSA/IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB0YWlsID0gdGFpbC5uZXh0ID0geyBmdW5jOiBmdW5jIH07XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKElELCBcIipcIik7XG4gIH0gOlxuICBmdW5jdGlvbihmdW5jKSB7IC8vIElFPDhcbiAgICBzZXRUaW1lb3V0KGZ1bmMsIDApO1xuICB9O1xufSgpKTtcblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlxuLyoqXG4gKiBWaXJ0dWFsVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIFRoaXMgaXMgd2hhdCBtb25nb29zZSB1c2VzIHRvIGRlZmluZSB2aXJ0dWFsIGF0dHJpYnV0ZXMgdmlhIGBTY2hlbWEucHJvdG90eXBlLnZpcnR1YWxgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZnVsbG5hbWUgPSBzY2hlbWEudmlydHVhbCgnZnVsbG5hbWUnKTtcbiAqICAgICBmdWxsbmFtZSBpbnN0YW5jZW9mIG1vbmdvb3NlLlZpcnR1YWxUeXBlIC8vIHRydWVcbiAqXG4gKiBAcGFybWEge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBWaXJ0dWFsVHlwZSAob3B0aW9ucywgbmFtZSkge1xuICB0aGlzLnBhdGggPSBuYW1lO1xuICB0aGlzLmdldHRlcnMgPSBbXTtcbiAgdGhpcy5zZXR0ZXJzID0gW107XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG59XG5cbi8qKlxuICogRGVmaW5lcyBhIGdldHRlci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHZpcnR1YWwgPSBzY2hlbWEudmlydHVhbCgnZnVsbG5hbWUnKTtcbiAqICAgICB2aXJ0dWFsLmdldChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5uYW1lLmZpcnN0ICsgJyAnICsgdGhpcy5uYW1lLmxhc3Q7XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5nZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHNldHRlci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHZpcnR1YWwgPSBzY2hlbWEudmlydHVhbCgnZnVsbG5hbWUnKTtcbiAqICAgICB2aXJ0dWFsLnNldChmdW5jdGlvbiAodikge1xuICogICAgICAgdmFyIHBhcnRzID0gdi5zcGxpdCgnICcpO1xuICogICAgICAgdGhpcy5uYW1lLmZpcnN0ID0gcGFydHNbMF07XG4gKiAgICAgICB0aGlzLm5hbWUubGFzdCA9IHBhcnRzWzFdO1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHRoaXMuc2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgZ2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4geyp9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgZ2V0dGVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICB2YXIgdiA9IHZhbHVlO1xuICBmb3IgKHZhciBsID0gdGhpcy5nZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XG4gICAgdiA9IHRoaXMuZ2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogQXBwbGllcyBzZXR0ZXJzIHRvIGB2YWx1ZWAgdXNpbmcgb3B0aW9uYWwgYHNjb3BlYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHJldHVybiB7Kn0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBzZXR0ZXJzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIHZhciB2ID0gdmFsdWU7XG4gIGZvciAodmFyIGwgPSB0aGlzLnNldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcbiAgICB2ID0gdGhpcy5zZXR0ZXJzW2xdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG4gIHJldHVybiB2O1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVHlwZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
