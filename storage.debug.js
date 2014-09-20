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
 * @see Error.messages #error_messages_StorageError-messages
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
 * Inherits from StorageError.
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
 * @receiver StorageError
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
 * @inherits StorageError
 */

function MissingSchemaError(){
  var msg = 'Schema hasn\'t been registered for document.\n'
    + 'Use storage.Document(name, schema)';
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
 * @inherits StorageError
 */

function ValidationError (instance) {
  StorageError.call(this, "Validation failed");
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
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
 * @inherits StorageError
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
 * Inherits from StorageError
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
 * Storage documents using schema
 * inspired by mongoose 3.8.4 (fixed bugs for 3.8.15)
 *
 * Storage implementation
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
 * Create a collection and get it
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
 * The various built-in Storage Schema Types.
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
 * @see Customized Error Messages #error_messages_StorageError-messages
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
 * @see Customized Error Messages #error_messages_StorageError-messages
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
 * @see Customized Error Messages #error_messages_StorageError-messages
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
 * @see Customized Error Messages #error_messages_StorageError-messages
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
 * You can set up email lower case normalization easily via a Storage setter.
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
 * The error message argument is optional. If not passed, the [default generic error message template](#error_messages_StorageError-messages) will be used.
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
 * From the examples above, you may have noticed that error messages support baseic templating. There are a few other template keywords besides `{PATH}` and `{VALUE}` too. To find out more, details are available [here](#error_messages_StorageError-messages)
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
 * @see Customized Error Messages #error_messages_StorageError-messages
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
   * @see StorageArray#$pop #types_array_StorageArray-%24pop
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
   * Or we may passing the _id directly and let storage take care of it.
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
   *     var docs = storage.createCollection('Doc', new Schema({ array: [Number] }));
   *
   *     var doc = docs.add({ array: [2,3,4] })
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
 * Alias of [pull](#types_array_StorageArray-pull)
 *
 * @see StorageArray#pull #types_array_StorageArray-pull
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
 * @param {StorageDocumentArray} parentArr the parent array of this document
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
      throw new Error('For your own good, Storage does not know ' +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9iaW5hcnlfcGFyc2VyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9kb2N1bWVudC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL2Nhc3QuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL21lc3NhZ2VzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci9taXNzaW5nU2NoZW1hLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0b3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2V2ZW50cy5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvaW5kZXguanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2ludGVybmFsLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9tcGF0aC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9ib29sZWFuLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvZGF0ZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL21peGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvbnVtYmVyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9zdHJpbmcuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYXR5cGUuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3N0YXRlbWFjaGluZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2VtYmVkZGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi92aXJ0dWFsdHlwZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3IxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1eUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25qQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQmluYXJ5IFBhcnNlci5cbiAqIEpvbmFzIFJhb25pIFNvYXJlcyBTaWx2YVxuICogaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBbdjEuMF1cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb25nb2RiL2pzLWJzb24vYmxvYi9tYXN0ZXIvbGliL2Jzb24vYmluYXJ5X3BhcnNlci5qc1xuICovXG52YXIgY2hyID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxudmFyIG1heEJpdHMgPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgNjQ7IGkrKykge1xuXHRtYXhCaXRzW2ldID0gTWF0aC5wb3coMiwgaSk7XG59XG5cbmZ1bmN0aW9uIEJpbmFyeVBhcnNlciAoYmlnRW5kaWFuLCBhbGxvd0V4Y2VwdGlvbnMpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmluYXJ5UGFyc2VyKSkgcmV0dXJuIG5ldyBCaW5hcnlQYXJzZXIoYmlnRW5kaWFuLCBhbGxvd0V4Y2VwdGlvbnMpO1xuICBcblx0dGhpcy5iaWdFbmRpYW4gPSBiaWdFbmRpYW47XG5cdHRoaXMuYWxsb3dFeGNlcHRpb25zID0gYWxsb3dFeGNlcHRpb25zO1xufVxuXG5CaW5hcnlQYXJzZXIud2FybiA9IGZ1bmN0aW9uIHdhcm4gKG1zZykge1xuXHRpZiAodGhpcy5hbGxvd0V4Y2VwdGlvbnMpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuXG5cdHJldHVybiAxO1xufTtcblxuQmluYXJ5UGFyc2VyLmRlY29kZUludCA9IGZ1bmN0aW9uIGRlY29kZUludCAoZGF0YSwgYml0cywgc2lnbmVkLCBmb3JjZUJpZ0VuZGlhbikge1xuICB2YXIgYiA9IG5ldyB0aGlzLkJ1ZmZlcih0aGlzLmJpZ0VuZGlhbiB8fCBmb3JjZUJpZ0VuZGlhbiwgZGF0YSlcbiAgICAgICwgeCA9IGIucmVhZEJpdHMoMCwgYml0cylcbiAgICAgICwgbWF4ID0gbWF4Qml0c1tiaXRzXTsgLy9tYXggPSBNYXRoLnBvdyggMiwgYml0cyApO1xuICBcbiAgcmV0dXJuIHNpZ25lZCAmJiB4ID49IG1heCAvIDJcbiAgICAgID8geCAtIG1heFxuICAgICAgOiB4O1xufTtcblxuQmluYXJ5UGFyc2VyLmVuY29kZUludCA9IGZ1bmN0aW9uIGVuY29kZUludCAoZGF0YSwgYml0cywgc2lnbmVkLCBmb3JjZUJpZ0VuZGlhbikge1xuXHR2YXIgbWF4ID0gbWF4Qml0c1tiaXRzXTtcblxuICBpZiAoZGF0YSA+PSBtYXggfHwgZGF0YSA8IC0obWF4IC8gMikpIHtcbiAgICB0aGlzLndhcm4oXCJlbmNvZGVJbnQ6Om92ZXJmbG93XCIpO1xuICAgIGRhdGEgPSAwO1xuICB9XG5cblx0aWYgKGRhdGEgPCAwKSB7XG4gICAgZGF0YSArPSBtYXg7XG4gIH1cblxuXHRmb3IgKHZhciByID0gW107IGRhdGE7IHJbci5sZW5ndGhdID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhICUgMjU2KSwgZGF0YSA9IE1hdGguZmxvb3IoZGF0YSAvIDI1NikpO1xuXG5cdGZvciAoYml0cyA9IC0oLWJpdHMgPj4gMykgLSByLmxlbmd0aDsgYml0cy0tOyByW3IubGVuZ3RoXSA9IFwiXFwwXCIpO1xuXG4gIHJldHVybiAoKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuKSA/IHIucmV2ZXJzZSgpIDogcikuam9pbihcIlwiKTtcbn07XG5cbkJpbmFyeVBhcnNlci50b1NtYWxsICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAgOCwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tU21hbGwgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAgOCwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci50b0J5dGUgICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAgOCwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tQnl0ZSAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAgOCwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci50b1Nob3J0ICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAxNiwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tU2hvcnQgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAxNiwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci50b1dvcmQgICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAxNiwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tV29yZCAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAxNiwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci50b0ludCAgICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAzMiwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tSW50ICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAzMiwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci50b0xvbmcgICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCA2NCwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tTG9uZyAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCA2NCwgdHJ1ZSAgKTsgfTtcbkJpbmFyeVBhcnNlci50b0RXb3JkICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCAzMiwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tRFdvcmQgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCAzMiwgZmFsc2UgKTsgfTtcbkJpbmFyeVBhcnNlci50b1FXb3JkICAgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZGVjb2RlSW50KCBkYXRhLCA2NCwgdHJ1ZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21RV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG5cbi8qKlxuICogQmluYXJ5UGFyc2VyIGJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAqL1xuZnVuY3Rpb24gQmluYXJ5UGFyc2VyQnVmZmVyIChiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbiB8fCAwO1xuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xufVxuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIHNldEJ1ZmZlciAoZGF0YSkge1xuICB2YXIgbCwgaSwgYjtcblxuXHRpZiAoZGF0YSkge1xuICAgIGkgPSBsID0gZGF0YS5sZW5ndGg7XG4gICAgYiA9IHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KGwpO1xuXHRcdGZvciAoOyBpOyBiW2wgLSBpXSA9IGRhdGEuY2hhckNvZGVBdCgtLWkpKTtcblx0XHR0aGlzLmJpZ0VuZGlhbiAmJiBiLnJldmVyc2UoKTtcblx0fVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5oYXNOZWVkZWRCaXRzID0gZnVuY3Rpb24gaGFzTmVlZGVkQml0cyAobmVlZGVkQml0cykge1xuXHRyZXR1cm4gdGhpcy5idWZmZXIubGVuZ3RoID49IC0oLW5lZWRlZEJpdHMgPj4gMyk7XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmNoZWNrQnVmZmVyID0gZnVuY3Rpb24gY2hlY2tCdWZmZXIgKG5lZWRlZEJpdHMpIHtcblx0aWYgKCF0aGlzLmhhc05lZWRlZEJpdHMobmVlZGVkQml0cykpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJjaGVja0J1ZmZlcjo6bWlzc2luZyBieXRlc1wiKTtcbiAgfVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5yZWFkQml0cyA9IGZ1bmN0aW9uIHJlYWRCaXRzIChzdGFydCwgbGVuZ3RoKSB7XG5cdC8vc2hsIGZpeDogSGVucmkgVG9yZ2VtYW5lIH4xOTk2IChjb21wcmVzc2VkIGJ5IEpvbmFzIFJhb25pKVxuXG5cdGZ1bmN0aW9uIHNobCAoYSwgYikge1xuXHRcdGZvciAoOyBiLS07IGEgPSAoKGEgJT0gMHg3ZmZmZmZmZiArIDEpICYgMHg0MDAwMDAwMCkgPT0gMHg0MDAwMDAwMCA/IGEgKiAyIDogKGEgLSAweDQwMDAwMDAwKSAqIDIgKyAweDdmZmZmZmZmICsgMSk7XG5cdFx0cmV0dXJuIGE7XG5cdH1cblxuXHRpZiAoc3RhcnQgPCAwIHx8IGxlbmd0aCA8PSAwKSB7XG5cdFx0cmV0dXJuIDA7XG4gIH1cblxuXHR0aGlzLmNoZWNrQnVmZmVyKHN0YXJ0ICsgbGVuZ3RoKTtcblxuICB2YXIgb2Zmc2V0TGVmdFxuICAgICwgb2Zmc2V0UmlnaHQgPSBzdGFydCAlIDhcbiAgICAsIGN1ckJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggLSAoIHN0YXJ0ID4+IDMgKSAtIDFcbiAgICAsIGxhc3RCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoICsgKCAtKCBzdGFydCArIGxlbmd0aCApID4+IDMgKVxuICAgICwgZGlmZiA9IGN1ckJ5dGUgLSBsYXN0Qnl0ZVxuICAgICwgc3VtID0gKCh0aGlzLmJ1ZmZlclsgY3VyQnl0ZSBdID4+IG9mZnNldFJpZ2h0KSAmICgoMSA8PCAoZGlmZiA/IDggLSBvZmZzZXRSaWdodCA6IGxlbmd0aCkpIC0gMSkpICsgKGRpZmYgJiYgKG9mZnNldExlZnQgPSAoc3RhcnQgKyBsZW5ndGgpICUgOCkgPyAodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10gJiAoKDEgPDwgb2Zmc2V0TGVmdCkgLSAxKSkgPDwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0IDogMCk7XG5cblx0Zm9yKDsgZGlmZjsgc3VtICs9IHNobCh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0KSk7XG5cblx0cmV0dXJuIHN1bTtcbn07XG5cbi8qKlxuICogRXhwb3NlLlxuICovXG5CaW5hcnlQYXJzZXIuQnVmZmVyID0gQmluYXJ5UGFyc2VyQnVmZmVyO1xuXG5leHBvcnRzLkJpbmFyeVBhcnNlciA9IEJpbmFyeVBhcnNlcjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpO1xuXG4vL1RPRE86INC90LDQv9C40YHQsNGC0Ywg0LzQtdGC0L7QtCAudXBzZXJ0KCBkb2MgKSAtINC+0LHQvdC+0LLQu9C10L3QuNC1INC00L7QutGD0LzQtdC90YLQsCwg0LAg0LXRgdC70Lgg0LXQs9C+INC90LXRgiwg0YLQviDRgdC+0LfQtNCw0L3QuNC1XG5cbi8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQu9C+0LPQuNC60YMg0YEgYXBpUmVzb3VyY2UgKNGB0L7RhdGA0LDQvdGP0YLRjCDRgdGB0YvQu9C60YMg0L3QsCDQvdC10LPQviDQuCDQuNGB0L/QvtC70YzQt9C+0LLRgtGMINC/0YDQuCDQvNC10YLQvtC00LUgZG9jLnNhdmUpXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LrQvtC70LvQtdC60YbQuNC5LlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSDQvdCw0LfQstCw0L3QuNC1INC60L7Qu9C70LXQutGG0LjQuFxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINCh0YXQtdC80LAg0LjQu9C4INC+0LHRitC10LrRgiDQvtC/0LjRgdCw0L3QuNGPINGB0YXQtdC80YtcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwIGFwaSDRgNC10YHRg9GA0YFcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDb2xsZWN0aW9uICggbmFtZSwgc2NoZW1hLCBhcGkgKXtcbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDQvdCw0LfQstCw0L3QuNC1INC/0YDQvtGB0YLRgNCw0L3RgdGC0LLQsCDQuNC80ZHQvVxuICB0aGlzLm5hbWUgPSBuYW1lO1xuICAvLyDQpdGA0LDQvdC40LvQuNGJ0LUg0LTQu9GPINC00L7QutGD0LzQtdC90YLQvtCyXG4gIHRoaXMuZG9jdW1lbnRzID0ge307XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSApIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0YHRgdGL0LvQutGDINC90LAgYXBpINC00LvRjyDQvNC10YLQvtC00LAgLnNhdmUoKVxuICB0aGlzLmFwaSA9IGFwaTtcblxuICAvLyDQmNGB0L/QvtC70YzQt9GD0LXQvNCw0Y8g0YHRhdC10LzQsCDQtNC70Y8g0LrQvtC70LvQtdC60YbQuNC4XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIC8vINCe0YLQvtCx0YDQsNC20LXQvdC40LUg0L7QsdGK0LXQutGC0LAgZG9jdW1lbnRzINCyINCy0LjQtNC1INC80LDRgdGB0LjQstCwICjQtNC70Y8g0L3QvtC60LDRg9GC0LApXG4gIHRoaXMuYXJyYXkgPSBbXTtcbiAgLy8g0J3Rg9C20L3QviDQtNC70Y8g0L7QsdC90L7QstC70LXQvdC40Y8g0L/RgNC40LLRj9C30L7QuiDQuiDRjdGC0L7QvNGDINGB0LLQvtC50YHRgtCy0YMg0LTQu9GPIGtub2Nrb3V0anNcbiAgd2luZG93LmtvICYmIGtvLnRyYWNrKCB0aGlzLCBbJ2FycmF5J10gKTtcbn1cblxuQ29sbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LjQu9C4INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7Qsi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IHR5cGU6ICdqZWxseSBiZWFuJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZChbeyB0eXBlOiAnamVsbHkgYmVhbicgfSwgeyB0eXBlOiAnc25pY2tlcnMnIH1dKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxBcnJheS48b2JqZWN0Pn0gW2RvY10gLSDQlNC+0LrRg9C80LXQvdGCXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAgICogQHBhcmFtIHtib29sZWFufSBbX3N0b3JhZ2VXaWxsTXV0YXRlXSAtINCk0LvQsNCzINC00L7QsdCw0LLQu9C10L3QuNGPINC80LDRgdGB0LjQstCwINC00L7QutGD0LzQtdC90YLQvtCyLiDRgtC+0LvRjNC60L4g0LTQu9GPINCy0L3Rg9GC0YDQtdC90L3QtdCz0L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Y9cbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggZG9jLCBmaWVsZHMsIGluaXQsIF9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YLQsCDQvdC10YIsINC30L3QsNGH0LjRgiDQsdGD0LTQtdGCINC/0YPRgdGC0L7QuVxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xuXG4gICAgLy8g0JzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XG4gICAgICB2YXIgc2F2ZWREb2NzID0gW107XG5cbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XG4gICAgICAgIHNhdmVkRG9jcy5wdXNoKCBzZWxmLmFkZCggZG9jLCBmaWVsZHMsIGluaXQsIHRydWUgKSApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcblxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YIg0YPQttC1INC10YHRgtGMLCDRgtC+INC/0YDQvtGB0YLQviDRg9GB0YLQsNC90L7QstC40YLRjCDQt9C90LDRh9C10L3QuNGPXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0uc2V0KCBkb2MgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlzY3JpbWluYXRvck1hcHBpbmcgPSB0aGlzLnNjaGVtYVxuICAgICAgICA/IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nXG4gICAgICAgIDogbnVsbDtcblxuICAgICAgdmFyIGtleSA9IGRpc2NyaW1pbmF0b3JNYXBwaW5nICYmIGRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdFxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxuICAgICAgICA6IG51bGw7XG5cbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcbiAgICAgIHZhciBzY2hlbWE7XG4gICAgICBpZiAoa2V5ICYmIGRvYyAmJiBkb2Nba2V5XSAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9ycyAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV0pIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gICAgICBpZCA9IG5ld0RvYy5faWQudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCBNaXhlZFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL21peGVkJylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBWYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vc2NoZW1hdHlwZScpLlZhbGlkYXRvckVycm9yXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBjbG9uZSA9IHV0aWxzLmNsb25lXG4gICwgVmFsaWRhdGlvbkVycm9yID0gU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvclxuICAsIEludGVybmFsQ2FjaGUgPSByZXF1aXJlKCcuL2ludGVybmFsJylcbiAgLCBkZWVwRXF1YWwgPSB1dGlscy5kZWVwRXF1YWxcbiAgLCBEb2N1bWVudEFycmF5XG4gICwgU2NoZW1hQXJyYXlcbiAgLCBFbWJlZGRlZDtcblxuLyoqXG4gKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC00L7QutGD0LzQtdC90YLQsC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtINC30L3QsNGH0LXQvdC40Y8sINC60L7RgtC+0YDRi9C1INC90YPQttC90L4g0YPRgdGC0LDQvdC+0LLQuNGC0YxcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gW2NvbGxlY3Rpb25OYW1lXSAtINC60L7Qu9C70LXQutGG0LjRjyDQsiDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINC90LDRhdC+0LTQuNGC0YHRjyDQtNC+0LrRg9C80LXQvdGCXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0YHRhdC10LzQsCDQv9C+INC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0YHQvtC30LTQsNC9INC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QvilcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEb2N1bWVudCAoIGRhdGEsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWEsIGZpZWxkcywgaW5pdCApe1xuICB0aGlzLiRfXyA9IG5ldyBJbnRlcm5hbENhY2hlO1xuICB0aGlzLmlzTmV3ID0gdHJ1ZTtcblxuICAvLyDQodC+0LfQtNCw0YLRjCDQv9GD0YHRgtC+0Lkg0LTQvtC60YPQvNC10L3RgiDRgSDRhNC70LDQs9C+0LwgaW5pdFxuICAvLyBuZXcgVGVzdERvY3VtZW50KHRydWUpO1xuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGRhdGEgKXtcbiAgICBpbml0ID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmICggXy5pc09iamVjdCggc2NoZW1hICkgJiYgISggc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICkpIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtVxuICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBzY2hlbWEgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuXG4gICAgaWYgKCBzY2hlbWEub3B0aW9ucy5faWQgKXtcbiAgICAgIGRhdGEgPSB7IF9pZDogbmV3IE9iamVjdElkKCkgfTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcbiAgICAvLyDQn9GA0Lgg0YHQvtC30LTQsNC90LjQuCBFbWJlZGRlZERvY3VtZW50LCDQsiDQvdGR0Lwg0YPQttC1INC10YHRgtGMINGB0YXQtdC80LAg0Lgg0LXQvNGDINC90LUg0L3Rg9C20LXQvSBfaWRcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYSB8fCBzY2hlbWE7XG4gICAgLy8g0KHQs9C10L3QtdGA0LjRgNC+0LLQsNGC0YwgT2JqZWN0SWQsINC10YHQu9C4INC+0L0g0L7RgtGB0YPRgtGB0YLQstGD0LXRgiwg0L3QviDQtdCz0L4g0YLRgNC10LHRg9C10YIg0YHRhdC10LzQsFxuICAgIGlmICggIXRoaXMuc2NoZW1hICYmIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAgIGlmICggZGF0YS5faWQgPT09IHVuZGVmaW5lZCApe1xuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICggIXNjaGVtYSApe1xuICAgIHRocm93IG5ldyBTdG9yYWdlRXJyb3IuTWlzc2luZ1NjaGVtYUVycm9yKCk7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQoeyB0ZXN0OiAnYm9vbScgfSwgdHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgY29sbGVjdGlvbk5hbWUgKXtcbiAgICBpbml0ID0gY29sbGVjdGlvbk5hbWU7XG4gICAgY29sbGVjdGlvbk5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBIHN0cmljdDogdHJ1ZVxuICAvLyBjb2xsZWN0aW9uLmFkZCh7Li4ufSwgdHJ1ZSk7XG4gIGlmICgnYm9vbGVhbicgPT09IHR5cGVvZiBmaWVsZHMpIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gZmllbGRzO1xuICAgIGZpZWxkcyA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gc2NoZW1hLm9wdGlvbnMgJiYgc2NoZW1hLm9wdGlvbnMuc3RyaWN0O1xuICAgIHRoaXMuJF9fLnNlbGVjdGVkID0gZmllbGRzO1xuICB9XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHRoaXMuY29sbGVjdGlvbiA9IHdpbmRvdy5zdG9yYWdlWyBjb2xsZWN0aW9uTmFtZSBdO1xuICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG5cbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBpZiAoIGRhdGEgPT0gbnVsbCB8fCAhZGF0YS5faWQgKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9CU0LvRjyDQv9C+0LzQtdGJ0LXQvdC40Y8g0LIg0LrQvtC70LvQtdC60YbQuNGOINC90LXQvtCx0YXQvtC00LjQvNC+LCDRh9GC0L7QsdGLINGDINC00L7QutGD0LzQtdC90YLQsCDQsdGL0LsgX2lkJyk7XG4gICAgfVxuICAgIC8vINCf0L7QvNC10YHRgtC40YLRjCDQtNC+0LrRg9C80LXQvdGCINCyINC60L7Qu9C70LXQutGG0LjRjlxuICAgIHRoaXMuY29sbGVjdGlvbi5kb2N1bWVudHNbIGRhdGEuX2lkIF0gPSB0aGlzO1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkUGF0aHMoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXF1aXJlZC5sZW5ndGg7ICsraSkge1xuICAgIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnJlcXVpcmUoIHJlcXVpcmVkW2ldICk7XG4gIH1cblxuICB0aGlzLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgdGhpcy5fZG9jID0gdGhpcy4kX19idWlsZERvYyggZGF0YSwgaW5pdCApO1xuXG4gIGlmICggaW5pdCApe1xuICAgIHRoaXMuaW5pdCggZGF0YSApO1xuICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgIHRoaXMuc2V0KCBkYXRhLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgfVxuXG4gIC8vIGFwcGx5IG1ldGhvZHNcbiAgZm9yICggdmFyIG0gaW4gc2NoZW1hLm1ldGhvZHMgKXtcbiAgICB0aGlzWyBtIF0gPSBzY2hlbWEubWV0aG9kc1sgbSBdO1xuICB9XG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICggdmFyIHMgaW4gc2NoZW1hLnN0YXRpY3MgKXtcbiAgICB0aGlzWyBzIF0gPSBzY2hlbWEuc3RhdGljc1sgcyBdO1xuICB9XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEV2ZW50cy5wcm90b3R5cGUgKTtcbkRvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50O1xuXG4vKipcbiAqIFRoZSBkb2N1bWVudHMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgc2NoZW1hXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zY2hlbWE7XG5cbi8qKlxuICogQm9vbGVhbiBmbGFnIHNwZWNpZnlpbmcgaWYgdGhlIGRvY3VtZW50IGlzIG5ldy5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IGlzTmV3XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc05ldztcblxuLyoqXG4gKiBUaGUgc3RyaW5nIHZlcnNpb24gb2YgdGhpcyBkb2N1bWVudHMgX2lkLlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIFRoaXMgZ2V0dGVyIGV4aXN0cyBvbiBhbGwgZG9jdW1lbnRzIGJ5IGRlZmF1bHQuIFRoZSBnZXR0ZXIgY2FuIGJlIGRpc2FibGVkIGJ5IHNldHRpbmcgdGhlIGBpZGAgW29wdGlvbl0oL2RvY3MvZ3VpZGUuaHRtbCNpZCkgb2YgaXRzIGBTY2hlbWFgIHRvIGZhbHNlIGF0IGNvbnN0cnVjdGlvbiB0aW1lLlxuICpcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgaWQ6IGZhbHNlIH0pO1xuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAc2VlIFNjaGVtYSBvcHRpb25zIC9kb2NzL2d1aWRlLmh0bWwjb3B0aW9uc1xuICogQHByb3BlcnR5IGlkXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pZDtcblxuLyoqXG4gKiBIYXNoIGNvbnRhaW5pbmcgY3VycmVudCB2YWxpZGF0aW9uIGVycm9ycy5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IGVycm9yc1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZXJyb3JzO1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuYWRhcHRlckhvb2tzID0ge1xuICBkb2N1bWVudERlZmluZVByb3BlcnR5OiAkLm5vb3AsXG4gIGRvY3VtZW50U2V0SW5pdGlhbFZhbHVlOiAkLm5vb3AsXG4gIGRvY3VtZW50R2V0VmFsdWU6ICQubm9vcCxcbiAgZG9jdW1lbnRTZXRWYWx1ZTogJC5ub29wXG59O1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgZGVmYXVsdCBkb2Mgc3RydWN0dXJlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtCb29sZWFufSBbc2tpcElkXVxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2J1aWxkRG9jXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2J1aWxkRG9jID0gZnVuY3Rpb24gKCBvYmosIHNraXBJZCApIHtcbiAgdmFyIGRvYyA9IHt9XG4gICAgLCBzZWxmID0gdGhpcztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkge1xuICAgICAgaWYgKCBza2lwSWQgKSBjb250aW51ZTtcbiAgICAgIGlmICggb2JqICYmICdfaWQnIGluIG9iaiApIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXG4gICAgICAsIGxlbiA9IHBhdGgubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXG4gICAgICAsIGRvY18gPSBkb2NcbiAgICAgICwgaSA9IDA7XG5cbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcbiAgICAgIHZhciBwaWVjZSA9IHBhdGhbIGkgXVxuICAgICAgICAsIGRlZmF1bHRWYWw7XG5cbiAgICAgIGlmICggaSA9PT0gbGFzdCApIHtcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xuXG4gICAgICAgIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRlZmF1bHRWYWwgKSB7XG4gICAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWw7XG4gICAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkb2M7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBkb2N1bWVudCB3aXRob3V0IHNldHRlcnMgb3IgbWFya2luZyBhbnl0aGluZyBtb2RpZmllZC5cbiAqXG4gKiBDYWxsZWQgaW50ZXJuYWxseSBhZnRlciBhIGRvY3VtZW50IGlzIHJldHVybmVkIGZyb20gc2VydmVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGRvY3VtZW50IHJldHVybmVkIGJ5IHNlcnZlclxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCBkYXRhICkge1xuICB0aGlzLmlzTmV3ID0gZmFsc2U7XG5cbiAgLy90b2RvOiDRgdC00LXRgdGMINCy0YHRkSDQuNC30LzQtdC90LjRgtGB0Y8sINGB0LzQvtGC0YDQtdGC0Ywg0LrQvtC80LzQtdC90YIg0LzQtdGC0L7QtNCwIHRoaXMucG9wdWxhdGVkXG4gIC8vIGhhbmRsZSBkb2NzIHdpdGggcG9wdWxhdGVkIHBhdGhzXG4gIC8qaWYgKCBkb2MuX2lkICYmIG9wdHMgJiYgb3B0cy5wb3B1bGF0ZWQgJiYgb3B0cy5wb3B1bGF0ZWQubGVuZ3RoICkge1xuICAgIHZhciBpZCA9IFN0cmluZyggZG9jLl9pZCApO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0cy5wb3B1bGF0ZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBpdGVtID0gb3B0cy5wb3B1bGF0ZWRbIGkgXTtcbiAgICAgIHRoaXMucG9wdWxhdGVkKCBpdGVtLnBhdGgsIGl0ZW0uX2RvY3NbaWRdLCBpdGVtICk7XG4gICAgfVxuICB9Ki9cblxuICBpbml0KCB0aGlzLCBkYXRhLCB0aGlzLl9kb2MgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qIVxuICogSW5pdCBoZWxwZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNlbGYgZG9jdW1lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogcmF3IHNlcnZlciBkb2NcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2Mgb2JqZWN0IHdlIGFyZSBpbml0aWFsaXppbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBpbml0IChzZWxmLCBvYmosIGRvYywgcHJlZml4KSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoXG4gICAgLCBzY2hlbWFcbiAgICAsIHBhdGhcbiAgICAsIGk7XG5cbiAgd2hpbGUgKGxlbi0tKSB7XG4gICAgaSA9IGtleXNbbGVuXTtcbiAgICBwYXRoID0gcHJlZml4ICsgaTtcbiAgICBzY2hlbWEgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFzY2hlbWEgJiYgXy5pc1BsYWluT2JqZWN0KCBvYmpbIGkgXSApICYmXG4gICAgICAgICghb2JqW2ldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbaV0uY29uc3RydWN0b3IpKSkge1xuICAgICAgLy8gYXNzdW1lIG5lc3RlZCBvYmplY3RcbiAgICAgIGlmICghZG9jW2ldKSBkb2NbaV0gPSB7fTtcbiAgICAgIGluaXQoc2VsZiwgb2JqW2ldLCBkb2NbaV0sIHBhdGggKyAnLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW2ldID09PSBudWxsKSB7XG4gICAgICAgIGRvY1tpXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG9ialtpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICBzZWxmLiRfX3RyeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG9jW2ldID0gc2NoZW1hLmNhc3Qob2JqW2ldLCBzZWxmLCB0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb2NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldEluaXRpYWxWYWx1ZS5jYWxsKCBzZWxmLCBzZWxmLCBwYXRoLCBkb2NbaV0gKTtcbiAgICAgIH1cbiAgICAgIC8vIG1hcmsgYXMgaHlkcmF0ZWRcbiAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmluaXQocGF0aCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwYXRoLCBvciBtYW55IHBhdGhzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICAvLyBwYXRoLCB2YWx1ZVxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUpXG4gKlxuICogICAgIC8vIG9iamVjdFxuICogICAgIGRvYy5zZXQoe1xuICogICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAsIHBhdGgyIDoge1xuICogICAgICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAgIH1cbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvbmx5LXRoZS1mbHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBOdW1iZXIpXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIHN0cmluZ1xuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIFN0cmluZylcbiAqXG4gKiAgICAgLy8gY2hhbmdpbmcgc3RyaWN0IG1vZGUgYmVoYXZpb3JcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCB7IHN0cmljdDogZmFsc2UgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXRoIHBhdGggb3Igb2JqZWN0IG9mIGtleS92YWxzIHRvIHNldFxuICogQHBhcmFtIHtNaXhlZH0gdmFsIHRoZSB2YWx1ZSB0byBzZXRcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ8ZXRjLi59IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBcIm9uLXRoZS1mbHlcIiBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbmFsbHkgc3BlY2lmeSBvcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBiZWhhdmlvciBvZiB0aGUgc2V0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgdHlwZSwgb3B0aW9ucykge1xuICBpZiAodHlwZSAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZS5jb25zdHJ1Y3RvcikpIHtcbiAgICBvcHRpb25zID0gdHlwZTtcbiAgICB0eXBlID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1lcmdlID0gb3B0aW9ucyAmJiBvcHRpb25zLm1lcmdlXG4gICAgLCBhZGhvYyA9IHR5cGUgJiYgdHJ1ZSAhPT0gdHlwZVxuICAgICwgY29uc3RydWN0aW5nID0gdHJ1ZSA9PT0gdHlwZVxuICAgICwgYWRob2NzO1xuXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zICYmICdzdHJpY3QnIGluIG9wdGlvbnNcbiAgICA/IG9wdGlvbnMuc3RyaWN0XG4gICAgOiB0aGlzLiRfXy5zdHJpY3RNb2RlO1xuXG4gIGlmIChhZGhvYykge1xuICAgIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHMgfHwgKHRoaXMuJF9fLmFkaG9jUGF0aHMgPSB7fSk7XG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcbiAgfVxuXG4gIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIHBhdGgpIHtcbiAgICAvLyBuZXcgRG9jdW1lbnQoeyBrZXk6IHZhbCB9KVxuXG4gICAgaWYgKG51bGwgPT09IHBhdGggfHwgdW5kZWZpbmVkID09PSBwYXRoKSB7XG4gICAgICB2YXIgX3RlbXAgPSBwYXRoO1xuICAgICAgcGF0aCA9IHZhbDtcbiAgICAgIHZhbCA9IF90ZW1wO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBwcmVmaXggPSB2YWxcbiAgICAgICAgPyB2YWwgKyAnLidcbiAgICAgICAgOiAnJztcblxuICAgICAgaWYgKHBhdGggaW5zdGFuY2VvZiBEb2N1bWVudCkgcGF0aCA9IHBhdGguX2RvYztcblxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwYXRoKVxuICAgICAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICAgICAsIHBhdGh0eXBlXG4gICAgICAgICwga2V5O1xuXG5cbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgcGF0aHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwcmVmaXggKyBrZXkpO1xuICAgICAgICBpZiAobnVsbCAhPSBwYXRoW2tleV1cbiAgICAgICAgICAgIC8vIG5lZWQgdG8ga25vdyBpZiBwbGFpbiBvYmplY3QgLSBubyBCdWZmZXIsIE9iamVjdElkLCByZWYsIGV0Y1xuICAgICAgICAgICAgJiYgXy5pc1BsYWluT2JqZWN0KHBhdGhba2V5XSlcbiAgICAgICAgICAgICYmICggIXBhdGhba2V5XS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUocGF0aFtrZXldLmNvbnN0cnVjdG9yKSApXG4gICAgICAgICAgICAmJiAndmlydHVhbCcgIT0gcGF0aHR5cGVcbiAgICAgICAgICAgICYmICEoIHRoaXMuJF9fcGF0aCggcHJlZml4ICsga2V5ICkgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSApXG4gICAgICAgICAgICAmJiAhKCB0aGlzLnNjaGVtYS5wYXRoc1trZXldICYmIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0ub3B0aW9ucy5yZWYgKVxuICAgICAgICAgICl7XG5cbiAgICAgICAgICB0aGlzLnNldChwYXRoW2tleV0sIHByZWZpeCArIGtleSwgY29uc3RydWN0aW5nKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICAgIGlmICgncmVhbCcgPT09IHBhdGh0eXBlIHx8ICd2aXJ0dWFsJyA9PT0gcGF0aHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgICAgfSBlbHNlIGlmICgndGhyb3cnID09IHN0cmljdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmllbGQgYFwiICsga2V5ICsgXCJgIGlzIG5vdCBpbiBzY2hlbWEuXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCAhPT0gcGF0aFtrZXldKSB7XG4gICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgLy8gZW5zdXJlIF9zdHJpY3QgaXMgaG9ub3JlZCBmb3Igb2JqIHByb3BzXG4gIC8vIGRvY3NjaGVtYSA9IG5ldyBTY2hlbWEoeyBwYXRoOiB7IG5lc3Q6ICdzdHJpbmcnIH19KVxuICAvLyBkb2Muc2V0KCdwYXRoJywgb2JqKTtcbiAgdmFyIHBhdGhUeXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocGF0aCk7XG4gIGlmICgnbmVzdGVkJyA9PSBwYXRoVHlwZSAmJiB2YWwgJiYgXy5pc1BsYWluT2JqZWN0KHZhbCkgJiZcbiAgICAgICghdmFsLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh2YWwuY29uc3RydWN0b3IpKSkge1xuICAgIGlmICghbWVyZ2UpIHRoaXMuc2V0VmFsdWUocGF0aCwgbnVsbCk7XG4gICAgdGhpcy5zZXQodmFsLCBwYXRoLCBjb25zdHJ1Y3RpbmcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNjaGVtYTtcbiAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICB2YXIgc3VicGF0aDtcblxuICBpZiAoJ2FkaG9jT3JVbmRlZmluZWQnID09IHBhdGhUeXBlICYmIHN0cmljdCkge1xuXG4gICAgLy8gY2hlY2sgZm9yIHJvb3RzIHRoYXQgYXJlIE1peGVkIHR5cGVzXG4gICAgdmFyIG1peGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkrMSkuam9pbignLicpO1xuICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSkge1xuICAgICAgICAvLyBhbGxvdyBjaGFuZ2VzIHRvIHN1YiBwYXRocyBvZiBtaXhlZCB0eXBlc1xuICAgICAgICBtaXhlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWl4ZWQpIHtcbiAgICAgIGlmICgndGhyb3cnID09IHN0cmljdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBwYXRoICsgXCJgIGlzIG5vdCBpbiBzY2hlbWEuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoJ3ZpcnR1YWwnID09IHBhdGhUeXBlKSB7XG4gICAgc2NoZW1hID0gdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aCk7XG4gICAgc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKTtcbiAgfVxuXG4gIHZhciBwYXRoVG9NYXJrO1xuXG4gIC8vIFdoZW4gdXNpbmcgdGhlICRzZXQgb3BlcmF0b3IgdGhlIHBhdGggdG8gdGhlIGZpZWxkIG11c3QgYWxyZWFkeSBleGlzdC5cbiAgLy8gRWxzZSBtb25nb2RiIHRocm93czogXCJMRUZUX1NVQkZJRUxEIG9ubHkgc3VwcG9ydHMgT2JqZWN0XCJcblxuICBpZiAocGFydHMubGVuZ3RoIDw9IDEpIHtcbiAgICBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpICkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkgKyAxKS5qb2luKCcuJyk7XG4gICAgICBpZiAodGhpcy5pc0RpcmVjdE1vZGlmaWVkKHN1YnBhdGgpIC8vIGVhcmxpZXIgcHJlZml4ZXMgdGhhdCBhcmUgYWxyZWFkeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrZWQgYXMgZGlydHkgaGF2ZSBwcmVjZWRlbmNlXG4gICAgICAgICAgfHwgdGhpcy5nZXQoc3VicGF0aCkgPT09IG51bGwpIHtcbiAgICAgICAgcGF0aFRvTWFyayA9IHN1YnBhdGg7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcGF0aFRvTWFyaykgcGF0aFRvTWFyayA9IHBhdGg7XG4gIH1cblxuICAvLyBpZiB0aGlzIGRvYyBpcyBiZWluZyBjb25zdHJ1Y3RlZCB3ZSBzaG91bGQgbm90IHRyaWdnZXIgZ2V0dGVyc1xuICB2YXIgcHJpb3JWYWwgPSBjb25zdHJ1Y3RpbmdcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogdGhpcy5nZXRWYWx1ZShwYXRoKTtcblxuICBpZiAoIXNjaGVtYSB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgIHRoaXMuJF9fc2V0KHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBzaG91bGRTZXQgPSB0aGlzLiRfX3RyeShmdW5jdGlvbigpe1xuICAgIHZhbCA9IHNjaGVtYS5hcHBseVNldHRlcnModmFsLCBzZWxmLCBmYWxzZSwgcHJpb3JWYWwpO1xuICB9KTtcblxuICBpZiAoc2hvdWxkU2V0KSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2Ugc2hvdWxkIG1hcmsgdGhpcyBjaGFuZ2UgYXMgbW9kaWZpZWQuXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zaG91bGRNb2RpZnlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2hvdWxkTW9kaWZ5ID0gZnVuY3Rpb24gKFxuICAgIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCkge1xuXG4gIGlmICh0aGlzLmlzTmV3KSByZXR1cm4gdHJ1ZTtcblxuICBpZiAoIHVuZGVmaW5lZCA9PT0gdmFsICYmICF0aGlzLmlzU2VsZWN0ZWQocGF0aCkgKSB7XG4gICAgLy8gd2hlbiBhIHBhdGggaXMgbm90IHNlbGVjdGVkIGluIGEgcXVlcnksIGl0cyBpbml0aWFsXG4gICAgLy8gdmFsdWUgd2lsbCBiZSB1bmRlZmluZWQuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09PSB2YWwgJiYgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCkge1xuICAgIC8vIHdlJ3JlIGp1c3QgdW5zZXR0aW5nIHRoZSBkZWZhdWx0IHZhbHVlIHdoaWNoIHdhcyBuZXZlciBzYXZlZFxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICghdXRpbHMuZGVlcEVxdWFsKHZhbCwgcHJpb3JWYWwgfHwgdGhpcy5nZXQocGF0aCkpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvL9GC0LXRgdGCINC90LUg0L/RgNC+0YXQvtC00LjRgiDQuNC3LdC30LAg0L3QsNC70LjRh9C40Y8g0LvQuNGI0L3QtdCz0L4g0L/QvtC70Y8g0LIgc3RhdGVzLmRlZmF1bHQgKGNvbW1lbnRzKVxuICAvLyDQndCwINGB0LDQvNC+0Lwg0LTQtdC70LUg0L/QvtC70LUg0LLRgNC+0LTQtSDQuCDQvdC1INC70LjRiNC90LXQtVxuICAvL2NvbnNvbGUuaW5mbyggcGF0aCwgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCApO1xuICAvL2NvbnNvbGUubG9nKCB0aGlzLiRfXy5hY3RpdmVQYXRocyApO1xuXG4gIC8vINCa0L7Qs9C00LAg0LzRiyDRg9GB0YLQsNC90LDQstC70LjQstCw0LXQvCDRgtCw0LrQvtC1INC20LUg0LfQvdCw0YfQtdC90LjQtSDQutCw0LogZGVmYXVsdFxuICAvLyDQndC1INC/0L7QvdGP0YLQvdC+INC30LDRh9C10Lwg0LzQsNC90LPRg9GB0YIg0LXQs9C+INC+0LHQvdC+0LLQu9GP0LtcbiAgLyppZiAoIWNvbnN0cnVjdGluZyAmJlxuICAgICAgbnVsbCAhPSB2YWwgJiZcbiAgICAgIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgJiZcbiAgICAgIHV0aWxzLmRlZXBFcXVhbCh2YWwsIHNjaGVtYS5nZXREZWZhdWx0KHRoaXMsIGNvbnN0cnVjdGluZykpICkge1xuXG4gICAgLy9jb25zb2xlLmxvZyggcGF0aFRvTWFyaywgdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSApO1xuXG4gICAgLy8gYSBwYXRoIHdpdGggYSBkZWZhdWx0IHdhcyAkdW5zZXQgb24gdGhlIHNlcnZlclxuICAgIC8vIGFuZCB0aGUgdXNlciBpcyBzZXR0aW5nIGl0IHRvIHRoZSBzYW1lIHZhbHVlIGFnYWluXG4gICAgcmV0dXJuIHRydWU7XG4gIH0qL1xuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB0aGUgYWN0dWFsIHNldHRpbmcgb2YgdGhlIHZhbHVlIGFuZCBtYXJraW5nIHRoZSBwYXRoIG1vZGlmaWVkIGlmIGFwcHJvcHJpYXRlLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zZXRcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0ID0gZnVuY3Rpb24gKCBwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwgKSB7XG4gIHZhciBzaG91bGRNb2RpZnkgPSB0aGlzLiRfX3Nob3VsZE1vZGlmeS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIGlmIChzaG91bGRNb2RpZnkpIHtcbiAgICB0aGlzLm1hcmtNb2RpZmllZChwYXRoVG9NYXJrLCB2YWwpO1xuICB9XG5cbiAgdmFyIG9iaiA9IHRoaXMuX2RvY1xuICAgICwgaSA9IDBcbiAgICAsIGwgPSBwYXJ0cy5sZW5ndGg7XG5cbiAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgbmV4dCA9IGkgKyAxXG4gICAgICAsIGxhc3QgPSBuZXh0ID09PSBsO1xuXG4gICAgaWYgKCBsYXN0ICkge1xuICAgICAgb2JqW3BhcnRzW2ldXSA9IHZhbDtcblxuICAgICAgdGhpcy5hZGFwdGVySG9va3MuZG9jdW1lbnRTZXRWYWx1ZS5jYWxsKCB0aGlzLCB0aGlzLCBwYXRoLCB2YWwgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW3BhcnRzW2ldXSAmJiAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IpKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSBpZiAob2JqW3BhcnRzW2ldXSAmJiAnRW1iZWRkZWREb2N1bWVudCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbcGFydHNbaV1dLmNvbnN0cnVjdG9yKSApIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmIEFycmF5LmlzQXJyYXkob2JqW3BhcnRzW2ldXSkpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBHZXRzIGEgcmF3IHZhbHVlIGZyb20gYSBwYXRoIChubyBnZXR0ZXJzKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHV0aWxzLmdldFZhbHVlKHBhdGgsIHRoaXMuX2RvYyk7XG59O1xuXG4vKipcbiAqIFNldHMgYSByYXcgdmFsdWUgZm9yIGEgcGF0aCAobm8gY2FzdGluZywgc2V0dGVycywgdHJhbnNmb3JtYXRpb25zKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsdWUpIHtcbiAgdXRpbHMuc2V0VmFsdWUocGF0aCwgdmFsdWUsIHRoaXMuX2RvYyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBhIHBhdGguXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gcGF0aFxuICogICAgIGRvYy5nZXQoJ2FnZScpIC8vIDQ3XG4gKlxuICogICAgIC8vIGR5bmFtaWMgY2FzdGluZyB0byBhIHN0cmluZ1xuICogICAgIGRvYy5nZXQoJ2FnZScsIFN0cmluZykgLy8gXCI0N1wiXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ9IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBvbi10aGUtZmx5IGF0dHJpYnV0ZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocGF0aCwgdHlwZSkge1xuICB2YXIgYWRob2NzO1xuICBpZiAodHlwZSkge1xuICAgIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHMgfHwgKHRoaXMuJF9fLmFkaG9jUGF0aHMgPSB7fSk7XG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcbiAgfVxuXG4gIHZhciBzY2hlbWEgPSB0aGlzLiRfX3BhdGgocGF0aCkgfHwgdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aClcbiAgICAsIHBpZWNlcyA9IHBhdGguc3BsaXQoJy4nKVxuICAgICwgb2JqID0gdGhpcy5fZG9jO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGllY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIG9iaiA9IHVuZGVmaW5lZCA9PT0gb2JqIHx8IG51bGwgPT09IG9ialxuICAgICAgPyB1bmRlZmluZWRcbiAgICAgIDogb2JqW3BpZWNlc1tpXV07XG4gIH1cblxuICBpZiAoc2NoZW1hKSB7XG4gICAgb2JqID0gc2NoZW1hLmFwcGx5R2V0dGVycyhvYmosIHRoaXMpO1xuICB9XG5cbiAgdGhpcy5hZGFwdGVySG9va3MuZG9jdW1lbnRHZXRWYWx1ZS5jYWxsKCB0aGlzLCB0aGlzLCBwYXRoICk7XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2NoZW1hdHlwZSBmb3IgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3BhdGhcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzXG4gICAgLCBhZGhvY1R5cGUgPSBhZGhvY3MgJiYgYWRob2NzW3BhdGhdO1xuXG4gIGlmIChhZGhvY1R5cGUpIHtcbiAgICByZXR1cm4gYWRob2NUeXBlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBwYXRoIGFzIGhhdmluZyBwZW5kaW5nIGNoYW5nZXMgdG8gd3JpdGUgdG8gdGhlIGRiLlxuICpcbiAqIF9WZXJ5IGhlbHBmdWwgd2hlbiB1c2luZyBbTWl4ZWRdKC4vc2NoZW1hdHlwZXMuaHRtbCNtaXhlZCkgdHlwZXMuX1xuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKiAgICAgZG9jLnNhdmUoKSAvLyBjaGFuZ2VzIHRvIG1peGVkLnR5cGUgYXJlIG5vdyBwZXJzaXN0ZWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byBtYXJrIG1vZGlmaWVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMubW9kaWZ5KHBhdGgpO1xufTtcblxuLyoqXG4gKiBDYXRjaGVzIGVycm9ycyB0aGF0IG9jY3VyIGR1cmluZyBleGVjdXRpb24gb2YgYGZuYCBhbmQgc3RvcmVzIHRoZW0gdG8gbGF0ZXIgYmUgcGFzc2VkIHdoZW4gYHNhdmUoKWAgaXMgZXhlY3V0ZWQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV0gdGhlIHNjb3BlIHdpdGggd2hpY2ggdG8gY2FsbCBmblxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3RyeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX190cnkgPSBmdW5jdGlvbiAoZm4sIHNjb3BlKSB7XG4gIHZhciByZXM7XG4gIHRyeSB7XG4gICAgZm4uY2FsbChzY29wZSk7XG4gICAgcmVzID0gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRoaXMuJF9fZXJyb3IoZSk7XG4gICAgcmVzID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbGlzdCBvZiBwYXRocyB0aGF0IGhhdmUgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tb2RpZmllZFBhdGhzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZGlyZWN0TW9kaWZpZWRQYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xuXG4gIHJldHVybiBkaXJlY3RNb2RpZmllZFBhdGhzLnJlZHVjZShmdW5jdGlvbiAobGlzdCwgcGF0aCkge1xuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICByZXR1cm4gbGlzdC5jb25jYXQocGFydHMucmVkdWNlKGZ1bmN0aW9uIChjaGFpbnMsIHBhcnQsIGkpIHtcbiAgICAgIHJldHVybiBjaGFpbnMuY29uY2F0KHBhcnRzLnNsaWNlKDAsIGkpLmNvbmNhdChwYXJ0KS5qb2luKCcuJykpO1xuICAgIH0sIFtdKSk7XG4gIH0sIFtdKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoaXMgZG9jdW1lbnQgd2FzIG1vZGlmaWVkLCBlbHNlIGZhbHNlLlxuICpcbiAqIElmIGBwYXRoYCBpcyBnaXZlbiwgY2hlY2tzIGlmIGEgcGF0aCBvciBhbnkgZnVsbCBwYXRoIGNvbnRhaW5pbmcgYHBhdGhgIGFzIHBhcnQgb2YgaXRzIHBhdGggY2hhaW4gaGFzIGJlZW4gbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc01vZGlmaWVkKCkgICAgICAgICAgICAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzJykgICAgICAgICAvLyB0cnVlXG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoJ2RvY3VtZW50cy4wLnRpdGxlJykgLy8gdHJ1ZVxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAgIC8vIGZhbHNlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXSBvcHRpb25hbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGhcbiAgICA/ICEhfnRoaXMubW9kaWZpZWRQYXRocygpLmluZGV4T2YocGF0aClcbiAgICA6IHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnNvbWUoJ21vZGlmeScpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHBhdGhgIHdhcyBkaXJlY3RseSBzZXQgYW5kIG1vZGlmaWVkLCBlbHNlIGZhbHNlLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpIC8vIGZhbHNlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNEaXJlY3RNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAocGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBwYXRoYCB3YXMgaW5pdGlhbGl6ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNJbml0ID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5pbml0KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBwYXRoYCB3YXMgc2VsZWN0ZWQgaW4gdGhlIHNvdXJjZSBxdWVyeSB3aGljaCBpbml0aWFsaXplZCB0aGlzIGRvY3VtZW50LlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIFRoaW5nLmZpbmRPbmUoKS5zZWxlY3QoJ25hbWUnKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgIGRvYy5pc1NlbGVjdGVkKCduYW1lJykgLy8gdHJ1ZVxuICogICAgICAgIGRvYy5pc1NlbGVjdGVkKCdhZ2UnKSAgLy8gZmFsc2VcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNTZWxlY3RlZCA9IGZ1bmN0aW9uIGlzU2VsZWN0ZWQgKHBhdGgpIHtcbiAgaWYgKHRoaXMuJF9fLnNlbGVjdGVkKSB7XG5cbiAgICBpZiAoJ19pZCcgPT09IHBhdGgpIHtcbiAgICAgIHJldHVybiAwICE9PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uc2VsZWN0ZWQpXG4gICAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAgICwgaW5jbHVzaXZlID0gZmFsc2VcbiAgICAgICwgY3VyO1xuXG4gICAgaWYgKDEgPT09IGkgJiYgJ19pZCcgPT09IHBhdGhzWzBdKSB7XG4gICAgICAvLyBvbmx5IF9pZCB3YXMgc2VsZWN0ZWQuXG4gICAgICByZXR1cm4gMCA9PT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xuICAgIH1cblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XG4gICAgICBpbmNsdXNpdmUgPSAhISB0aGlzLiRfXy5zZWxlY3RlZFtjdXJdO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBhdGggaW4gdGhpcy4kX18uc2VsZWN0ZWQpIHtcbiAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgfVxuXG4gICAgaSA9IHBhdGhzLmxlbmd0aDtcbiAgICB2YXIgcGF0aERvdCA9IHBhdGggKyAnLic7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PSBjdXIpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoMCA9PT0gY3VyLmluZGV4T2YocGF0aERvdCkpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKDAgPT09IHBhdGhEb3QuaW5kZXhPZihjdXIgKyAnLicpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICEgaW5jbHVzaXZlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGVzIHJlZ2lzdGVyZWQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYHByZWAgc2F2ZSBhbmQgaWYgYSB2YWxpZGF0aW9uIHJ1bGUgaXMgdmlvbGF0ZWQsIFtzYXZlXSgjbW9kZWxfTW9kZWwtc2F2ZSkgaXMgYWJvcnRlZCBhbmQgdGhlIGVycm9yIGlzIHJldHVybmVkIHRvIHlvdXIgYGNhbGxiYWNrYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGlmIChlcnIpIGhhbmRsZUVycm9yKGVycik7XG4gKiAgICAgICBlbHNlIC8vIHZhbGlkYXRpb24gcGFzc2VkXG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGVkIGFmdGVyIHZhbGlkYXRpb24gY29tcGxldGVzLCBwYXNzaW5nIGFuIGVycm9yIGlmIG9uZSBvY2N1cnJlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBvbmx5IHZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkcyB3aGVuIG5lY2Vzc2FyeVxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSkuZmlsdGVyKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKCFzZWxmLmlzU2VsZWN0ZWQocGF0aCkgJiYgIXNlbGYuaXNNb2RpZmllZChwYXRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcblxuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSk7XG5cbiAgaWYgKDAgPT09IHBhdGhzLmxlbmd0aCkge1xuICAgIGNvbXBsZXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsaWRhdGluZyA9IHt9XG4gICAgLCB0b3RhbCA9IDA7XG5cbiAgcGF0aHMuZm9yRWFjaCh2YWxpZGF0ZVBhdGgpO1xuICByZXR1cm4gdGhpcztcblxuICBmdW5jdGlvbiB2YWxpZGF0ZVBhdGggKHBhdGgpIHtcbiAgICBpZiAodmFsaWRhdGluZ1twYXRoXSkgcmV0dXJuO1xuXG4gICAgdmFsaWRhdGluZ1twYXRoXSA9IHRydWU7XG4gICAgdG90YWwrKztcblxuICAgIHV0aWxzLnNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgICAgdmFyIHAgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuICAgICAgaWYgKCFwKSByZXR1cm4gLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuXG4gICAgICB2YXIgdmFsID0gc2VsZi5nZXRWYWx1ZShwYXRoKTtcbiAgICAgIHAuZG9WYWxpZGF0ZSh2YWwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHNlbGYuaW52YWxpZGF0ZShcbiAgICAgICAgICAgICAgcGF0aFxuICAgICAgICAgICAgLCBlcnJcbiAgICAgICAgICAgICwgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLywgdHJ1ZSAvLyBlbWJlZGRlZCBkb2NzXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC0tdG90YWwgfHwgY29tcGxldGUoKTtcbiAgICAgIH0sIHNlbGYpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGUgKCkge1xuICAgIHZhciBlcnIgPSBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gICAgc2VsZi4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICAgIGNiICYmIGNiKGVycik7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIFRoZSBgZXJyb3JNc2dgIGFyZ3VtZW50IHdpbGwgYmVjb21lIHRoZSBtZXNzYWdlIG9mIHRoZSBgVmFsaWRhdGlvbkVycm9yYC5cbiAqXG4gKiBUaGUgYHZhbHVlYCBhcmd1bWVudCAoaWYgcGFzc2VkKSB3aWxsIGJlIGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgVmFsaWRhdGlvbkVycm9yLnZhbHVlYCBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgZG9jLmludmFsaWRhdGUoJ3NpemUnLCAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLCAxNCk7XG5cbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coZXJyKVxuICogICAgICAgLy8gcHJpbnRzXG4gKiAgICAgICB7IG1lc3NhZ2U6ICdWYWxpZGF0aW9uIGZhaWxlZCcsXG4gKiAgICAgICAgIG5hbWU6ICdWYWxpZGF0aW9uRXJyb3InLFxuICogICAgICAgICBlcnJvcnM6XG4gKiAgICAgICAgICB7IHNpemU6XG4gKiAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsXG4gKiAgICAgICAgICAgICAgIG5hbWU6ICdWYWxpZGF0b3JFcnJvcicsXG4gKiAgICAgICAgICAgICAgIHBhdGg6ICdzaXplJyxcbiAqICAgICAgICAgICAgICAgdHlwZTogJ3VzZXIgZGVmaW5lZCcsXG4gKiAgICAgICAgICAgICAgIHZhbHVlOiAxNCB9IH0gfVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnJvck1zZyB0aGUgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd8TnVtYmVyfGFueX0gdmFsdWUgb3B0aW9uYWwgaW52YWxpZCB2YWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyb3JNc2csIHZhbHVlKSB7XG4gIGlmICghdGhpcy4kX18udmFsaWRhdGlvbkVycm9yKSB7XG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzKTtcbiAgfVxuXG4gIGlmICghZXJyb3JNc2cgfHwgJ3N0cmluZycgPT09IHR5cGVvZiBlcnJvck1zZykge1xuICAgIGVycm9yTXNnID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIGVycm9yTXNnLCAndXNlciBkZWZpbmVkJywgdmFsdWUpO1xuICB9XG5cbiAgaWYgKHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9PSBlcnJvck1zZykgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvci5lcnJvcnNbcGF0aF0gPSBlcnJvck1zZztcbn07XG5cbi8qKlxuICogUmVzZXRzIHRoZSBpbnRlcm5hbCBtb2RpZmllZCBzdGF0ZSBvZiB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHJldHVybiB7RG9jdW1lbnR9XG4gKiBAbWV0aG9kICRfX3Jlc2V0XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcmVzZXQgPSBmdW5jdGlvbiByZXNldCAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRoc1xuICAubWFwKCdpbml0JywgJ21vZGlmeScsIGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIHNlbGYuZ2V0VmFsdWUoaSk7XG4gIH0pXG4gIC5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB2YWwgJiYgdmFsLmlzU3RvcmFnZURvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcbiAgfSlcbiAgLmZvckVhY2goZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgdmFyIGkgPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIGNvbnRpbnVlO1xuICAgICAgZG9jLiRfX3Jlc2V0KCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDbGVhciAnbW9kaWZ5JygnZGlydHknKSBjYWNoZVxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5jbGVhcignbW9kaWZ5Jyk7XG4gIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy5lcnJvcnMgPSB1bmRlZmluZWQ7XG4gIC8vY29uc29sZS5sb2coIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlICk7XG4gIC8vVE9ETzog0YLRg9GCXG4gIHRoaXMuc2NoZW1hLnJlcXVpcmVkUGF0aHMoKS5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgc2VsZi4kX18uYWN0aXZlUGF0aHMucmVxdWlyZShwYXRoKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBkaXJ0eSBwYXRocyAvIHZhbHMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2RpcnR5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGlydHkgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgYWxsID0gdGhpcy4kX18uYWN0aXZlUGF0aHMubWFwKCdtb2RpZnknLCBmdW5jdGlvbiAocGF0aCkge1xuICAgIHJldHVybiB7IHBhdGg6IHBhdGhcbiAgICAgICAgICAgLCB2YWx1ZTogc2VsZi5nZXRWYWx1ZSggcGF0aCApXG4gICAgICAgICAgICwgc2NoZW1hOiBzZWxmLiRfX3BhdGgoIHBhdGggKSB9O1xuICB9KTtcblxuICAvLyBTb3J0IGRpcnR5IHBhdGhzIGluIGEgZmxhdCBoaWVyYXJjaHkuXG4gIGFsbC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIChhLnBhdGggPCBiLnBhdGggPyAtMSA6IChhLnBhdGggPiBiLnBhdGggPyAxIDogMCkpO1xuICB9KTtcblxuICAvLyBJZ25vcmUgXCJmb28uYVwiIGlmIFwiZm9vXCIgaXMgZGlydHkgYWxyZWFkeS5cbiAgdmFyIG1pbmltYWwgPSBbXVxuICAgICwgbGFzdFBhdGhcbiAgICAsIHRvcDtcblxuICBhbGwuZm9yRWFjaChmdW5jdGlvbiggaXRlbSApe1xuICAgIGxhc3RQYXRoID0gaXRlbS5wYXRoICsgJy4nO1xuICAgIG1pbmltYWwucHVzaChpdGVtKTtcbiAgICB0b3AgPSBpdGVtO1xuICB9KTtcblxuICB0b3AgPSBsYXN0UGF0aCA9IG51bGw7XG4gIHJldHVybiBtaW5pbWFsO1xufTtcblxuLyohXG4gKiBDb21waWxlcyBzY2hlbWFzLlxuICogKNGD0YHRgtCw0L3QvtCy0LjRgtGMINCz0LXRgtGC0LXRgNGLL9GB0LXRgtGC0LXRgNGLINC90LAg0L/QvtC70Y8g0LTQvtC60YPQvNC10L3RgtCwKVxuICovXG5mdW5jdGlvbiBjb21waWxlIChzZWxmLCB0cmVlLCBwcm90bywgcHJlZml4KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModHJlZSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgbGltYlxuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGxpbWIgPSB0cmVlW2tleV07XG5cbiAgICBkZWZpbmUoc2VsZlxuICAgICAgICAsIGtleVxuICAgICAgICAsICgoJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShsaW1iLmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMobGltYikubGVuZ3RoKVxuICAgICAgICAgICAgICAgJiYgKCFsaW1iLnR5cGUgfHwgbGltYi50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICA/IGxpbWJcbiAgICAgICAgICAgICAgIDogbnVsbClcbiAgICAgICAgLCBwcm90b1xuICAgICAgICAsIHByZWZpeFxuICAgICAgICAsIGtleXMpO1xuICB9XG59XG5cbi8vIGdldHMgZGVzY3JpcHRvcnMgZm9yIGFsbCBwcm9wZXJ0aWVzIG9mIGBvYmplY3RgXG4vLyBtYWtlcyBhbGwgcHJvcGVydGllcyBub24tZW51bWVyYWJsZSB0byBtYXRjaCBwcmV2aW91cyBiZWhhdmlvciB0byAjMjIxMVxuZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmplY3QpIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICByZXN1bHRba2V5XSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBrZXkpO1xuICAgIHJlc3VsdFtrZXldLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyohXG4gKiBEZWZpbmVzIHRoZSBhY2Nlc3NvciBuYW1lZCBwcm9wIG9uIHRoZSBpbmNvbWluZyBwcm90b3R5cGUuXG4gKiDRgtCw0Lwg0LbQtSwg0L/QvtC70Y8g0LTQvtC60YPQvNC10L3RgtCwINGB0LTQtdC70LDQtdC8INC90LDQsdC70Y7QtNCw0LXQvNGL0LzQuFxuICovXG5mdW5jdGlvbiBkZWZpbmUgKHNlbGYsIHByb3AsIHN1YnByb3BzLCBwcm90b3R5cGUsIHByZWZpeCwga2V5cykge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBwYXRoID0gKHByZWZpeCA/IHByZWZpeCArICcuJyA6ICcnKSArIHByb3A7XG5cbiAgaWYgKHN1YnByb3BzKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuJF9fLmdldHRlcnMpXG4gICAgICAgICAgICB0aGlzLiRfXy5nZXR0ZXJzID0ge307XG5cbiAgICAgICAgICBpZiAoIXRoaXMuJF9fLmdldHRlcnNbcGF0aF0pIHtcbiAgICAgICAgICAgIHZhciBuZXN0ZWQgPSBPYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKSwgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyh0aGlzKSk7XG5cbiAgICAgICAgICAgIC8vIHNhdmUgc2NvcGUgZm9yIG5lc3RlZCBnZXR0ZXJzL3NldHRlcnNcbiAgICAgICAgICAgIGlmICghcHJlZml4KSBuZXN0ZWQuJF9fLnNjb3BlID0gdGhpcztcblxuICAgICAgICAgICAgLy8gc2hhZG93IGluaGVyaXRlZCBnZXR0ZXJzIGZyb20gc3ViLW9iamVjdHMgc29cbiAgICAgICAgICAgIC8vIHRoaW5nLm5lc3RlZC5uZXN0ZWQubmVzdGVkLi4uIGRvZXNuJ3Qgb2NjdXIgKGdoLTM2NilcbiAgICAgICAgICAgIHZhciBpID0gMFxuICAgICAgICAgICAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBmb3IgKDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICAgIC8vIG92ZXItd3JpdGUgdGhlIHBhcmVudHMgZ2V0dGVyIHdpdGhvdXQgdHJpZ2dlcmluZyBpdFxuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmVzdGVkLCBrZXlzW2ldLCB7XG4gICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSAgIC8vIEl0IGRvZXNuJ3Qgc2hvdyB1cC5cbiAgICAgICAgICAgICAgICAsIHdyaXRhYmxlOiB0cnVlICAgICAgLy8gV2UgY2FuIHNldCBpdCBsYXRlci5cbiAgICAgICAgICAgICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZSAgLy8gV2UgY2FuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBhZ2Fpbi5cbiAgICAgICAgICAgICAgICAsIHZhbHVlOiB1bmRlZmluZWQgICAgLy8gSXQgc2hhZG93cyBpdHMgcGFyZW50LlxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmVzdGVkLnRvT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQocGF0aCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb21waWxlKCBzZWxmLCBzdWJwcm9wcywgbmVzdGVkLCBwYXRoICk7XG4gICAgICAgICAgICB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdID0gbmVzdGVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdO1xuICAgICAgICB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIERvY3VtZW50KSB2ID0gdi50b09iamVjdCgpO1xuICAgICAgICAgIHJldHVybiAodGhpcy4kX18uc2NvcGUgfHwgdGhpcykuc2V0KCBwYXRoLCB2ICk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICB9IGVsc2Uge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggcHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCApIHsgcmV0dXJuIHRoaXMuZ2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCk7IH1cbiAgICAgICwgc2V0OiBmdW5jdGlvbiAodikgeyByZXR1cm4gdGhpcy5zZXQuY2FsbCh0aGlzLiRfXy5zY29wZSB8fCB0aGlzLCBwYXRoLCB2KTsgfVxuICAgIH0pO1xuICB9XG5cbiAgc2VsZi5hZGFwdGVySG9va3MuZG9jdW1lbnREZWZpbmVQcm9wZXJ0eS5jYWxsKCBzZWxmLCBzZWxmLCBwcm90b3R5cGUsIHByb3AsIHByZWZpeCwgcGF0aCApO1xuICAvL3NlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50RGVmaW5lUHJvcGVydHkuY2FsbCggc2VsZiwgc2VsZiwgcGF0aCwgcHJvdG90eXBlICk7XG59XG5cbi8qKlxuICogQXNzaWducy9jb21waWxlcyBgc2NoZW1hYCBpbnRvIHRoaXMgZG9jdW1lbnRzIHByb3RvdHlwZS5cbiAqXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2V0U2NoZW1hXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSA9IGZ1bmN0aW9uICggc2NoZW1hICkge1xuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgY29tcGlsZSggdGhpcywgc2NoZW1hLnRyZWUsIHRoaXMgKTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCBzdWJkb2NzIChieSBiZnMpXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2dldEFsbFN1YmRvY3NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QWxsU3ViZG9jcyA9IGZ1bmN0aW9uICgpIHtcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcbiAgRW1iZWRkZWQgPSBFbWJlZGRlZCB8fCByZXF1aXJlKCcuL3R5cGVzL2VtYmVkZGVkJyk7XG5cbiAgZnVuY3Rpb24gZG9jUmVkdWNlcihzZWVkLCBwYXRoKSB7XG4gICAgdmFyIHZhbCA9IHRoaXNbcGF0aF07XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2godmFsKTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSlcbiAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uIF9kb2NSZWR1Y2UoZG9jKSB7XG4gICAgICAgIGlmICghZG9jIHx8ICFkb2MuX2RvYykgcmV0dXJuO1xuICAgICAgICBpZiAoZG9jIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaChkb2MpO1xuICAgICAgICBzZWVkID0gT2JqZWN0LmtleXMoZG9jLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQoZG9jLl9kb2MpLCBzZWVkKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBzZWVkO1xuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2RvYykucmVkdWNlKGRvY1JlZHVjZXIuYmluZCh0aGlzKSwgW10pO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgZ2VuZXJpYyBzYXZlIHN0dWZmLlxuICogdG8gc29sdmUgIzE0NDYgdXNlIHVzZSBoaWVyYXJjaHkgaW5zdGVhZCBvZiBob29rc1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19wcmVzYXZlVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcHJlc2F2ZVZhbGlkYXRlID0gZnVuY3Rpb24gJF9fcHJlc2F2ZVZhbGlkYXRlKCkge1xuICAvLyBpZiBhbnkgZG9jLnNldCgpIGNhbGxzIGZhaWxlZFxuXG4gIHZhciBkb2NzID0gdGhpcy4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSgpO1xuXG4gIHZhciBlMiA9IGRvY3MubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICByZXR1cm4gZG9jLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICB9KTtcbiAgdmFyIGUxID0gW3RoaXMuJF9fLnNhdmVFcnJvcl0uY29uY2F0KGUyKTtcbiAgdmFyIGVyciA9IGUxLmZpbHRlcihmdW5jdGlvbiAoeCkge3JldHVybiB4fSlbMF07XG4gIHRoaXMuJF9fLnNhdmVFcnJvciA9IG51bGw7XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBwYXRoIHRoYXQgd2VyZSBjaGFuZ2VkIGFuZCBhcmUgYXJyYXlzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xuXG4gIC8vIHZhbGlkYXRlIGFsbCBkb2N1bWVudCBhcnJheXMuXG4gIHJldHVybiB0aGlzLiRfXy5hY3RpdmVQYXRoc1xuICAgIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFZhbHVlKGkpO1xuICAgIH0uYmluZCh0aGlzKSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICAgIH0pLnJlZHVjZShmdW5jdGlvbihzZWVkLCBhcnJheSkge1xuICAgICAgcmV0dXJuIHNlZWQuY29uY2F0KGFycmF5KTtcbiAgICB9LCBbXSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uIChkb2MpIHtyZXR1cm4gZG9jfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBlcnJvclxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Vycm9yXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBlcnI7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcm9kdWNlcyBhIHNwZWNpYWwgcXVlcnkgZG9jdW1lbnQgb2YgdGhlIG1vZGlmaWVkIHByb3BlcnRpZXMgdXNlZCBpbiB1cGRhdGVzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19kZWx0YVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kZWx0YSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcnR5ID0gdGhpcy4kX19kaXJ0eSgpO1xuXG4gIHZhciBkZWx0YSA9IHt9XG4gICAgLCBsZW4gPSBkaXJ0eS5sZW5ndGhcbiAgICAsIGQgPSAwO1xuXG4gIGZvciAoOyBkIDwgbGVuOyArK2QpIHtcbiAgICB2YXIgZGF0YSA9IGRpcnR5WyBkIF07XG4gICAgdmFyIHZhbHVlID0gZGF0YS52YWx1ZTtcblxuICAgIHZhbHVlID0gdXRpbHMuY2xvbmUodmFsdWUsIHsgZGVwb3B1bGF0ZTogMSB9KTtcbiAgICBkZWx0YVsgZGF0YS5wYXRoIF0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBkZWx0YTtcbn07XG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19oYW5kbGVTYXZlID0gZnVuY3Rpb24oKXtcbiAgLy8g0J/QvtC70YPRh9Cw0LXQvCDRgNC10YHRg9GA0YEg0LrQvtC70LvQtdC60YbQuNC4LCDQutGD0LTQsCDQsdGD0LTQtdC8INGB0L7RhdGA0LDQvdGP0YLRjCDQtNCw0L3QvdGL0LVcbiAgdmFyIHJlc291cmNlO1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJlc291cmNlID0gdGhpcy5jb2xsZWN0aW9uLmFwaTtcbiAgfVxuXG4gIHZhciBpbm5lclByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpO1xuXG4gIGlmICggdGhpcy5pc05ldyApIHtcbiAgICAvLyBzZW5kIGVudGlyZSBkb2NcbiAgICB2YXIgb2JqID0gdGhpcy50b09iamVjdCh7IGRlcG9wdWxhdGU6IDEgfSk7XG5cbiAgICBpZiAoICggb2JqIHx8IHt9ICkuaGFzT3duUHJvcGVydHkoJ19pZCcpID09PSBmYWxzZSApIHtcbiAgICAgIC8vIGRvY3VtZW50cyBtdXN0IGhhdmUgYW4gX2lkIGVsc2UgbW9uZ29vc2Ugd29uJ3Qga25vd1xuICAgICAgLy8gd2hhdCB0byB1cGRhdGUgbGF0ZXIgaWYgbW9yZSBjaGFuZ2VzIGFyZSBtYWRlLiB0aGUgdXNlclxuICAgICAgLy8gd291bGRuJ3Qga25vdyB3aGF0IF9pZCB3YXMgZ2VuZXJhdGVkIGJ5IG1vbmdvZGIgZWl0aGVyXG4gICAgICAvLyBub3Igd291bGQgdGhlIE9iamVjdElkIGdlbmVyYXRlZCBteSBtb25nb2RiIG5lY2Vzc2FyaWx5XG4gICAgICAvLyBtYXRjaCB0aGUgc2NoZW1hIGRlZmluaXRpb24uXG4gICAgICBpbm5lclByb21pc2UucmVqZWN0KG5ldyBFcnJvcignZG9jdW1lbnQgbXVzdCBoYXZlIGFuIF9pZCBiZWZvcmUgc2F2aW5nJykpO1xuICAgICAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxuICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc291cmNlLmNyZWF0ZSggb2JqICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgIH1cblxuICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgICAvLyBNYWtlIGl0IHBvc3NpYmxlIHRvIHJldHJ5IHRoZSBpbnNlcnRcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHRyZWF0IGl0IGFzIGEgbmV3IG9iamVjdCBvbiBlcnJvcixcbiAgICAvLyBzaW5jZSBpdCBhbHJlYWR5IGV4aXN0c1xuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IGZhbHNlO1xuXG4gICAgdmFyIGRlbHRhID0gdGhpcy4kX19kZWx0YSgpO1xuXG4gICAgaWYgKCAhXy5pc0VtcHR5KCBkZWx0YSApICkge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdCwINC+0LrRgNGD0LbQtdC90LjQtSDRgtC10YHRgtC+0LJcbiAgICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UoIHRoaXMuaWQgKS51cGRhdGUoIGRlbHRhICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gaW5uZXJQcm9taXNlO1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gU2F2ZXMgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAZXhhbXBsZTpcbiAqXG4gKiAgICAgcHJvZHVjdC5zb2xkID0gRGF0ZS5ub3coKTtcbiAqICAgICBwcm9kdWN0LnNhdmUoZnVuY3Rpb24gKGVyciwgcHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgIGlmIChlcnIpIC4uXG4gKiAgICAgfSlcbiAqXG4gKiBAZGVzY3JpcHRpb24gVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSB0aHJlZSBwYXJhbWV0ZXJzLCBgZXJyYCBpZiBhbiBlcnJvciBvY2N1cnJlZCwgYHByb2R1Y3RgIHdoaWNoIGlzIHRoZSBzYXZlZCBgcHJvZHVjdGAsIGFuZCBgbnVtYmVyQWZmZWN0ZWRgIHdoaWNoIHdpbGwgYmUgMSB3aGVuIHRoZSBkb2N1bWVudCB3YXMgZm91bmQgYW5kIHVwZGF0ZWQgaW4gdGhlIGRhdGFiYXNlLCBvdGhlcndpc2UgMC5cbiAqXG4gKiBUaGUgYGZuYCBjYWxsYmFjayBpcyBvcHRpb25hbC4gSWYgbm8gYGZuYCBpcyBwYXNzZWQgYW5kIHZhbGlkYXRpb24gZmFpbHMsIHRoZSB2YWxpZGF0aW9uIGVycm9yIHdpbGwgYmUgZW1pdHRlZCBvbiB0aGUgY29ubmVjdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGlzIG1vZGVsLlxuICogQGV4YW1wbGU6XG4gKiAgICAgdmFyIGRiID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHZhciBQcm9kdWN0ID0gZGIubW9kZWwoJ1Byb2R1Y3QnLCBzY2hlbWEpO1xuICpcbiAqICAgICBkYi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEhvd2V2ZXIsIGlmIHlvdSBkZXNpcmUgbW9yZSBsb2NhbCBlcnJvciBoYW5kbGluZyB5b3UgY2FuIGFkZCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHRoZSBtb2RlbCBhbmQgaGFuZGxlIGVycm9ycyB0aGVyZSBpbnN0ZWFkLlxuICogQGV4YW1wbGU6XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEFzIGFuIGV4dHJhIG1lYXN1cmUgb2YgZmxvdyBjb250cm9sLCBzYXZlIHdpbGwgcmV0dXJuIGEgUHJvbWlzZSAoYm91bmQgdG8gYGZuYCBpZiBwYXNzZWQpIHNvIGl0IGNvdWxkIGJlIGNoYWluZWQsIG9yIGhvb2sgdG8gcmVjaXZlIGVycm9yc1xuICogQGV4YW1wbGU6XG4gKiAgICAgcHJvZHVjdC5zYXZlKCkudGhlbihmdW5jdGlvbiAocHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgICAuLi5cbiAqICAgICB9KS5vblJlamVjdGVkKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICBhc3NlcnQub2soZXJyKVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbihlcnIsIHByb2R1Y3QsIE51bWJlcil9IFtkb25lXSBvcHRpb25hbCBjYWxsYmFja1xuICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZVxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgbWlkZGxld2FyZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9taWRkbGV3YXJlLmh0bWxcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoIGRvbmUgKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZpbmFsUHJvbWlzZSA9IG5ldyAkLkRlZmVycmVkKCkuZG9uZSggZG9uZSApO1xuXG4gIC8vINCh0L7RhdGA0LDQvdGP0YLRjCDQtNC+0LrRg9C80LXQvdGCINC80L7QttC90L4g0YLQvtC70YzQutC+INC10YHQu9C4INC+0L0g0L3QsNGF0L7QtNC40YLRgdGPINCyINC60L7Qu9C70LXQutGG0LjQuFxuICBpZiAoICF0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBhcmd1bWVudHMgKTtcbiAgICBjb25zb2xlLmVycm9yKCdEb2N1bWVudC5zYXZlIGFwaSBoYW5kbGUgaXMgbm90IGltcGxlbWVudGVkLicpO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcHJlU2F2ZSBlcnJvcnMgKNGC0L7Rh9C+INC30L3QsNGOLCDRh9GC0L4g0L7QvdCwINC/0YDQvtCy0LXRgNGP0LXRgiDQvtGI0LjQsdC60Lgg0LIg0LzQsNGB0YHQuNCy0LDRhSAoQ2FzdEVycm9yKSlcbiAgdmFyIHByZVNhdmVFcnIgPSBzZWxmLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICBpZiAoIHByZVNhdmVFcnIgKSB7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggcHJlU2F2ZUVyciApO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBWYWxpZGF0ZVxuICB2YXIgcDAgPSBuZXcgJC5EZWZlcnJlZCgpO1xuICBzZWxmLnZhbGlkYXRlKGZ1bmN0aW9uKCBlcnIgKXtcbiAgICBpZiAoIGVyciApe1xuICAgICAgcDAucmVqZWN0KCBlcnIgKTtcbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0gZWxzZSB7XG4gICAgICBwMC5yZXNvbHZlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyDQodC90LDRh9Cw0LvQsCDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LLRgdC1INC/0L7QtNC00L7QutGD0LzQtdC90YLRiyDQuCDRgdC00LXQu9Cw0YLRjCByZXNvbHZlISEhXG4gIC8vIENhbGwgc2F2ZSBob29rcyBvbiBzdWJkb2NzXG4gIHZhciBzdWJEb2NzID0gc2VsZi4kX19nZXRBbGxTdWJkb2NzKCk7XG4gIHZhciB3aGVuQ29uZCA9IHN1YkRvY3MubWFwKGZ1bmN0aW9uIChkKSB7cmV0dXJuIGQuc2F2ZSgpO30pO1xuICB3aGVuQ29uZC5wdXNoKCBwMCApO1xuXG4gIC8vINCi0LDQuiDQvNGLINC/0LXRgNC10LTQsNGR0Lwg0LzQsNGB0YHQuNCyIHByb21pc2Ug0YPRgdC70L7QstC40LlcbiAgdmFyIHAxID0gJC53aGVuLmFwcGx5KCAkLCB3aGVuQ29uZCApO1xuXG4gIC8vIEhhbmRsZSBzYXZlIGFuZCByZXN1bHRzXG4gIHAxXG4gICAgLnRoZW4oIHRoaXMuJF9faGFuZGxlU2F2ZS5iaW5kKCB0aGlzICkgKVxuICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZmluYWxQcm9taXNlLnJlc29sdmUoIHNlbGYgKTtcbiAgICB9LCBmdW5jdGlvbiAoIGVyciApIHtcbiAgICAgIC8vIElmIHRoZSBpbml0aWFsIGluc2VydCBmYWlscyBwcm92aWRlIGEgc2Vjb25kIGNoYW5jZS5cbiAgICAgIC8vIChJZiB3ZSBkaWQgdGhpcyBhbGwgdGhlIHRpbWUgd2Ugd291bGQgYnJlYWsgdXBkYXRlcylcbiAgICAgIGlmIChzZWxmLiRfXy5pbnNlcnRpbmcpIHtcbiAgICAgICAgc2VsZi5pc05ldyA9IHRydWU7XG4gICAgICAgIHNlbGYuZW1pdCgnaXNOZXcnLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0pO1xuXG4gIHJldHVybiBmaW5hbFByb21pc2U7XG59O1xuXG4vKmZ1bmN0aW9uIGFsbCAocHJvbWlzZU9mQXJyKSB7XG4gIHZhciBwUmV0ID0gbmV3IFByb21pc2U7XG4gIHRoaXMudGhlbihwcm9taXNlT2ZBcnIpLnRoZW4oXG4gICAgZnVuY3Rpb24gKHByb21pc2VBcnIpIHtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICB2YXIgcmV0ID0gW107XG4gICAgICB2YXIgZXJyU2VudGluZWw7XG4gICAgICBpZiAoIXByb21pc2VBcnIubGVuZ3RoKSBwUmV0LnJlc29sdmUoKTtcbiAgICAgIHByb21pc2VBcnIuZm9yRWFjaChmdW5jdGlvbiAocHJvbWlzZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHByb21pc2UudGhlbihcbiAgICAgICAgICBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgICAgIHJldFtpbmRleF0gPSB2YWw7XG4gICAgICAgICAgICAtLWNvdW50O1xuICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHBSZXQuZnVsZmlsbChyZXQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgICAgICBlcnJTZW50aW5lbCA9IGVycjtcbiAgICAgICAgICAgIHBSZXQucmVqZWN0KGVycik7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcFJldDtcbiAgICB9XG4gICAgLCBwUmV0LnJlamVjdC5iaW5kKHBSZXQpXG4gICk7XG4gIHJldHVybiBwUmV0O1xufSovXG5cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGlzIGRvY3VtZW50IGludG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCwgcmVhZHkgZm9yIHN0b3JhZ2UgaW4gTW9uZ29EQi5cbiAqXG4gKiBCdWZmZXJzIGFyZSBjb252ZXJ0ZWQgdG8gaW5zdGFuY2VzIG9mIFttb25nb2RiLkJpbmFyeV0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbCkgZm9yIHByb3BlciBzdG9yYWdlLlxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gYGdldHRlcnNgIGFwcGx5IGFsbCBnZXR0ZXJzIChwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnMpXG4gKiAtIGB2aXJ0dWFsc2AgYXBwbHkgdmlydHVhbCBnZXR0ZXJzIChjYW4gb3ZlcnJpZGUgYGdldHRlcnNgIG9wdGlvbilcbiAqIC0gYG1pbmltaXplYCByZW1vdmUgZW1wdHkgb2JqZWN0cyAoZGVmYXVsdHMgdG8gdHJ1ZSlcbiAqIC0gYHRyYW5zZm9ybWAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gdGhlIHJlc3VsdGluZyBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nXG4gKlxuICogIyMjI0dldHRlcnMvVmlydHVhbHNcbiAqXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgcGF0aCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUsIHZpcnR1YWxzOiBmYWxzZSB9KVxuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBFeGFtcGxlIG9mIGFwcGx5aW5nIGJvdGggcGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUgfSlcbiAqXG4gKiBUbyBhcHBseSB0aGVzZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvT2JqZWN0YCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvT2JqZWN0JywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqICMjIyNUcmFuc2Zvcm1cbiAqXG4gKiBXZSBtYXkgbmVlZCB0byBwZXJmb3JtIGEgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHJlc3VsdGluZyBvYmplY3QgYmFzZWQgb24gc29tZSBjcml0ZXJpYSwgc2F5IHRvIHJlbW92ZSBzb21lIHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiBvciByZXR1cm4gYSBjdXN0b20gb2JqZWN0LiBJbiB0aGlzIGNhc2Ugd2Ugc2V0IHRoZSBvcHRpb25hbCBgdHJhbnNmb3JtYCBmdW5jdGlvbi5cbiAqXG4gKiBUcmFuc2Zvcm0gZnVuY3Rpb25zIHJlY2VpdmUgdGhyZWUgYXJndW1lbnRzXG4gKlxuICogICAgIGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge31cbiAqXG4gKiAtIGBkb2NgIFRoZSBtb25nb29zZSBkb2N1bWVudCB3aGljaCBpcyBiZWluZyBjb252ZXJ0ZWRcbiAqIC0gYHJldGAgVGhlIHBsYWluIG9iamVjdCByZXByZXNlbnRhdGlvbiB3aGljaCBoYXMgYmVlbiBjb252ZXJ0ZWRcbiAqIC0gYG9wdGlvbnNgIFRoZSBvcHRpb25zIGluIHVzZSAoZWl0aGVyIHNjaGVtYSBvcHRpb25zIG9yIHRoZSBvcHRpb25zIHBhc3NlZCBpbmxpbmUpXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gc3BlY2lmeSB0aGUgdHJhbnNmb3JtIHNjaGVtYSBvcHRpb25cbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgLy8gcmVtb3ZlIHRoZSBfaWQgb2YgZXZlcnkgZG9jdW1lbnQgYmVmb3JlIHJldHVybmluZyB0aGUgcmVzdWx0XG4gKiAgICAgICBkZWxldGUgcmV0Ll9pZDtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogV2l0aCB0cmFuc2Zvcm1hdGlvbnMgd2UgY2FuIGRvIGEgbG90IG1vcmUgdGhhbiByZW1vdmUgcHJvcGVydGllcy4gV2UgY2FuIGV2ZW4gcmV0dXJuIGNvbXBsZXRlbHkgbmV3IGN1c3RvbWl6ZWQgb2JqZWN0czpcbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIHJldHVybiB7IG1vdmllOiByZXQubmFtZSB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgX2lkOiAnYW5JZCcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IG1vdmllOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBfTm90ZTogaWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBgdW5kZWZpbmVkYCwgdGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuX1xuICpcbiAqIFRyYW5zZm9ybWF0aW9ucyBtYXkgYWxzbyBiZSBhcHBsaWVkIGlubGluZSwgb3ZlcnJpZGRpbmcgYW55IHRyYW5zZm9ybSBzZXQgaW4gdGhlIG9wdGlvbnM6XG4gKlxuICogICAgIGZ1bmN0aW9uIHhmb3JtIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgaW5saW5lOiByZXQubmFtZSwgY3VzdG9tOiB0cnVlIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHBhc3MgdGhlIHRyYW5zZm9ybSBhcyBhbiBpbmxpbmUgb3B0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdHJhbnNmb3JtOiB4Zm9ybSB9KTsgLy8geyBpbmxpbmU6ICdXcmVjay1pdCBSYWxwaCcsIGN1c3RvbTogdHJ1ZSB9XG4gKlxuICogX05vdGU6IGlmIHlvdSBjYWxsIGB0b09iamVjdGAgYW5kIHBhc3MgYW55IG9wdGlvbnMsIHRoZSB0cmFuc2Zvcm0gZGVjbGFyZWQgaW4geW91ciBzY2hlbWEgb3B0aW9ucyB3aWxsIF9fbm90X18gYmUgYXBwbGllZC4gVG8gZm9yY2UgaXRzIGFwcGxpY2F0aW9uIHBhc3MgYHRyYW5zZm9ybTogdHJ1ZWBfXG4gKlxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QuaGlkZSA9ICdfaWQnO1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgaWYgKG9wdGlvbnMuaGlkZSkge1xuICogICAgICAgICBvcHRpb25zLmhpZGUuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gKiAgICAgICAgICAgZGVsZXRlIHJldFtwcm9wXTtcbiAqICAgICAgICAgfSk7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH0pO1xuICogICAgIGRvYy50b09iamVjdCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7IHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJyB9KTsgICAgICAgICAgICAgICAgICAvLyB7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqICAgICBkb2MudG9PYmplY3QoeyBoaWRlOiAnc2VjcmV0IF9pZCcsIHRyYW5zZm9ybTogdHJ1ZSB9KTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBUcmFuc2Zvcm1zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBfYW5kIGVhY2ggb2YgaXRzIHN1Yi1kb2N1bWVudHNfLiBUbyBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgeW91IGFyZSBjdXJyZW50bHkgb3BlcmF0aW5nIG9uIGEgc3ViLWRvY3VtZW50IHlvdSBtaWdodCB1c2UgdGhlIGZvbGxvd2luZyBndWFyZDpcbiAqXG4gKiAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRvYy5vd25lckRvY3VtZW50KSB7XG4gKiAgICAgICAvLyB3b3JraW5nIHdpdGggYSBzdWIgZG9jXG4gKiAgICAgfVxuICpcbiAqIFRyYW5zZm9ybXMsIGxpa2UgYWxsIG9mIHRoZXNlIG9wdGlvbnMsIGFyZSBhbHNvIGF2YWlsYWJsZSBmb3IgYHRvSlNPTmAuXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgZm9yIHNvbWUgbW9yZSBkZXRhaWxzLlxuICpcbiAqIF9EdXJpbmcgc2F2ZSwgbm8gY3VzdG9tIG9wdGlvbnMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IGJlZm9yZSBiZWluZyBzZW50IHRvIHRoZSBkYXRhYmFzZS5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHJldHVybiB7T2JqZWN0fSBqcyBvYmplY3RcbiAqIEBzZWUgbW9uZ29kYi5CaW5hcnkgaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlICYmIHRoaXMuJF9fLndhc1BvcHVsYXRlZCkge1xuICAgIC8vIHBvcHVsYXRlZCBwYXRocyB0aGF0IHdlIHNldCB0byBhIGRvY3VtZW50XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFdoZW4gaW50ZXJuYWxseSBzYXZpbmcgdGhpcyBkb2N1bWVudCB3ZSBhbHdheXMgcGFzcyBvcHRpb25zLFxuICAvLyBieXBhc3NpbmcgdGhlIGN1c3RvbSBzY2hlbWEgb3B0aW9ucy5cbiAgdmFyIG9wdGlvbnNQYXJhbWV0ZXIgPSBvcHRpb25zO1xuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvcHRpb25zLmNvbnN0cnVjdG9yKSkgfHxcbiAgICAob3B0aW9ucyAmJiBvcHRpb25zLl91c2VTY2hlbWFPcHRpb25zKSkge1xuICAgIG9wdGlvbnMgPSB0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0XG4gICAgICA/IGNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpXG4gICAgICA6IHt9O1xuICB9XG5cbiAgaWYgKCBvcHRpb25zLm1pbmltaXplID09PSB1bmRlZmluZWQgKXtcbiAgICBvcHRpb25zLm1pbmltaXplID0gdGhpcy5zY2hlbWEub3B0aW9ucy5taW5pbWl6ZTtcbiAgfVxuXG4gIGlmICghb3B0aW9uc1BhcmFtZXRlcikge1xuICAgIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMgPSB0cnVlO1xuICB9XG5cbiAgdmFyIHJldCA9IHV0aWxzLmNsb25lKHRoaXMuX2RvYywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMudmlydHVhbHMgfHwgb3B0aW9ucy5nZXR0ZXJzICYmIGZhbHNlICE9PSBvcHRpb25zLnZpcnR1YWxzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3ZpcnR1YWxzJywgb3B0aW9ucyk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5nZXR0ZXJzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3BhdGhzJywgb3B0aW9ucyk7XG4gICAgLy8gYXBwbHlHZXR0ZXJzIGZvciBwYXRocyB3aWxsIGFkZCBuZXN0ZWQgZW1wdHkgb2JqZWN0cztcbiAgICAvLyBpZiBtaW5pbWl6ZSBpcyBzZXQsIHdlIG5lZWQgdG8gcmVtb3ZlIHRoZW0uXG4gICAgaWYgKG9wdGlvbnMubWluaW1pemUpIHtcbiAgICAgIHJldCA9IG1pbmltaXplKHJldCkgfHwge307XG4gICAgfVxuICB9XG5cbiAgLy8gSW4gdGhlIGNhc2Ugd2hlcmUgYSBzdWJkb2N1bWVudCBoYXMgaXRzIG93biB0cmFuc2Zvcm0gZnVuY3Rpb24sIHdlIG5lZWQgdG9cbiAgLy8gY2hlY2sgYW5kIHNlZSBpZiB0aGUgcGFyZW50IGhhcyBhIHRyYW5zZm9ybSAob3B0aW9ucy50cmFuc2Zvcm0pIGFuZCBpZiB0aGVcbiAgLy8gY2hpbGQgc2NoZW1hIGhhcyBhIHRyYW5zZm9ybSAodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCkgSW4gdGhpcyBjYXNlLFxuICAvLyB3ZSBuZWVkIHRvIGFkanVzdCBvcHRpb25zLnRyYW5zZm9ybSB0byBiZSB0aGUgY2hpbGQgc2NoZW1hJ3MgdHJhbnNmb3JtIGFuZFxuICAvLyBub3QgdGhlIHBhcmVudCBzY2hlbWEnc1xuICBpZiAodHJ1ZSA9PT0gb3B0aW9ucy50cmFuc2Zvcm0gfHxcbiAgICAgICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ICYmIG9wdGlvbnMudHJhbnNmb3JtKSkge1xuICAgIHZhciBvcHRzID0gb3B0aW9ucy5qc29uXG4gICAgICA/IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA6IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XG4gICAgaWYgKG9wdHMpIHtcbiAgICAgIG9wdGlvbnMudHJhbnNmb3JtID0gb3B0cy50cmFuc2Zvcm07XG4gICAgfVxuICB9XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgdmFyIHhmb3JtZWQgPSBvcHRpb25zLnRyYW5zZm9ybSh0aGlzLCByZXQsIG9wdGlvbnMpO1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgeGZvcm1lZCkgcmV0ID0geGZvcm1lZDtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuXG4vKiFcbiAqIE1pbmltaXplcyBhbiBvYmplY3QsIHJlbW92aW5nIHVuZGVmaW5lZCB2YWx1ZXMgYW5kIGVtcHR5IG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IHRvIG1pbmltaXplXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gbWluaW1pemUgKG9iaikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgaGFzS2V5c1xuICAgICwga2V5XG4gICAgLCB2YWw7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgdmFsID0gb2JqW2tleV07XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdCh2YWwpICkge1xuICAgICAgb2JqW2tleV0gPSBtaW5pbWl6ZSh2YWwpO1xuICAgIH1cblxuICAgIGlmICh1bmRlZmluZWQgPT09IG9ialtrZXldKSB7XG4gICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBoYXNLZXlzID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBoYXNLZXlzXG4gICAgPyBvYmpcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuLyohXG4gKiBBcHBsaWVzIHZpcnR1YWxzIHByb3BlcnRpZXMgdG8gYGpzb25gLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IHNlbGZcbiAqIEBwYXJhbSB7T2JqZWN0fSBqc29uXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBlaXRoZXIgYHZpcnR1YWxzYCBvciBgcGF0aHNgXG4gKiBAcmV0dXJuIHtPYmplY3R9IGBqc29uYFxuICovXG5cbmZ1bmN0aW9uIGFwcGx5R2V0dGVycyAoc2VsZiwganNvbiwgdHlwZSwgb3B0aW9ucykge1xuICB2YXIgc2NoZW1hID0gc2VsZi5zY2hlbWFcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoc2NoZW1hW3R5cGVdKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcGF0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgcGF0aCA9IHBhdGhzW2ldO1xuXG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgICAsIHBsZW4gPSBwYXJ0cy5sZW5ndGhcbiAgICAgICwgbGFzdCA9IHBsZW4gLSAxXG4gICAgICAsIGJyYW5jaCA9IGpzb25cbiAgICAgICwgcGFydDtcblxuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBwbGVuOyArK2lpKSB7XG4gICAgICBwYXJ0ID0gcGFydHNbaWldO1xuICAgICAgaWYgKGlpID09PSBsYXN0KSB7XG4gICAgICAgIGJyYW5jaFtwYXJ0XSA9IHV0aWxzLmNsb25lKHNlbGYuZ2V0KHBhdGgpLCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaFtwYXJ0XSB8fCAoYnJhbmNoW3BhcnRdID0ge30pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBqc29uO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgaXMgdXNlZCBpbiBjYWxscyB0byBKU09OLnN0cmluZ2lmeShkb2MpLlxuICpcbiAqIFRoaXMgbWV0aG9kIGFjY2VwdHMgdGhlIHNhbWUgb3B0aW9ucyBhcyBbRG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkuIFRvIGFwcGx5IHRoZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvSlNPTmAgb3B0aW9uIHRvIHRoZSBzYW1lIGFyZ3VtZW50LlxuICpcbiAqICAgICBzY2hlbWEuc2V0KCd0b0pTT04nLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIGZvciBkZXRhaWxzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAc2VlIERvY3VtZW50I3RvT2JqZWN0ICNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgLy8gY2hlY2sgZm9yIG9iamVjdCB0eXBlIHNpbmNlIGFuIGFycmF5IG9mIGRvY3VtZW50c1xuICAvLyBiZWluZyBzdHJpbmdpZmllZCBwYXNzZXMgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkXG4gIC8vIG9mIG9wdGlvbnMgb2JqZWN0cy4gSlNPTi5zdHJpbmdpZnkoW2RvYywgZG9jXSlcbiAgLy8gVGhlIHNlY29uZCBjaGVjayBoZXJlIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IHBvcHVsYXRlZCBkb2N1bWVudHMgKG9yXG4gIC8vIHN1YmRvY3VtZW50cykgdXNlIHRoZWlyIG93biBvcHRpb25zIGZvciBgLnRvSlNPTigpYCBpbnN0ZWFkIG9mIHRoZWlyXG4gIC8vIHBhcmVudCdzXG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9wdGlvbnMuY29uc3RydWN0b3IpKVxuICAgICAgfHwgKCghb3B0aW9ucyB8fCBvcHRpb25zLmpzb24pICYmIHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKSkge1xuXG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA/IHV0aWxzLmNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKVxuICAgICAgOiB7fTtcbiAgfVxuICBvcHRpb25zLmpzb24gPSB0cnVlO1xuXG4gIHJldHVybiB0aGlzLnRvT2JqZWN0KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIERvY3VtZW50IHN0b3JlcyB0aGUgc2FtZSBkYXRhIGFzIGRvYy5cbiAqXG4gKiBEb2N1bWVudHMgYXJlIGNvbnNpZGVyZWQgZXF1YWwgd2hlbiB0aGV5IGhhdmUgbWF0Y2hpbmcgYF9pZGBzLCB1bmxlc3MgbmVpdGhlclxuICogZG9jdW1lbnQgaGFzIGFuIGBfaWRgLCBpbiB3aGljaCBjYXNlIHRoaXMgZnVuY3Rpb24gZmFsbHMgYmFjayB0byB1c2luZ1xuICogYGRlZXBFcXVhbCgpYC5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgYSBkb2N1bWVudCB0byBjb21wYXJlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGRvYykge1xuICB2YXIgdGlkID0gdGhpcy5nZXQoJ19pZCcpO1xuICB2YXIgZG9jaWQgPSBkb2MuZ2V0KCdfaWQnKTtcbiAgaWYgKCF0aWQgJiYgIWRvY2lkKSB7XG4gICAgcmV0dXJuIGRlZXBFcXVhbCh0aGlzLCBkb2MpO1xuICB9XG4gIHJldHVybiB0aWQgJiYgdGlkLmVxdWFsc1xuICAgID8gdGlkLmVxdWFscyhkb2NpZClcbiAgICA6IHRpZCA9PT0gZG9jaWQ7XG59O1xuXG4vKipcbiAqIEdldHMgX2lkKHMpIHVzZWQgZHVyaW5nIHBvcHVsYXRpb24gb2YgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgTW9kZWwuZmluZE9uZSgpLnBvcHVsYXRlKCdhdXRob3InKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coZG9jLmF1dGhvci5uYW1lKSAgICAgICAgIC8vIERyLlNldXNzXG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MucG9wdWxhdGVkKCdhdXRob3InKSkgLy8gJzUxNDRjZjgwNTBmMDcxZDk3OWMxMThhNydcbiAqICAgICB9KVxuICpcbiAqIElmIHRoZSBwYXRoIHdhcyBub3QgcG9wdWxhdGVkLCB1bmRlZmluZWQgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fE9iamVjdElkfE51bWJlcnxCdWZmZXJ8U3RyaW5nfHVuZGVmaW5lZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5wb3B1bGF0ZWQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvcHRpb25zKSB7XG4gIC8vIHZhbCBhbmQgb3B0aW9ucyBhcmUgaW50ZXJuYWxcblxuICAvL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0Y3RgtGDINC/0YDQvtCy0LXRgNC60YMsINC+0L3QsCDQtNC+0LvQttC90LAg0L7Qv9C40YDQsNGC0YzRgdGPINC90LUg0L3QsCAkX18ucG9wdWxhdGVkLCDQsCDQvdCwINGC0L4sINGH0YLQviDQvdCw0Ygg0L7QsdGK0LXQutGCINC40LzQtdC10YIg0YDQvtC00LjRgtC10LvRj1xuICAvLyDQuCDQv9C+0YLQvtC8INGD0LbQtSDQstGL0YHRgtCw0LLQu9GP0YLRjCDRgdCy0L7QudGB0YLQstC+IHBvcHVsYXRlZCA9PSB0cnVlXG4gIGlmIChudWxsID09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHZhciB2ID0gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICAgIGlmICh2KSByZXR1cm4gdi52YWx1ZTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gaW50ZXJuYWxcblxuICBpZiAodHJ1ZSA9PT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgfVxuXG4gIHRoaXMuJF9fLnBvcHVsYXRlZCB8fCAodGhpcy4kX18ucG9wdWxhdGVkID0ge30pO1xuICB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF0gPSB7IHZhbHVlOiB2YWwsIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgLy8gb3ZlcnJpZGRlbiBpbiBTdWJEb2N1bWVudHNcbiAgcmV0dXJuIHBhdGggfHwgJyc7XG59O1xuXG4vKipcbiAqINCj0LTQsNC70LjRgtGMINC00L7QutGD0LzQtdC90YIg0Lgg0LLQtdGA0L3Rg9GC0Ywg0LrQvtC70LvQtdC60YbQuNGOLlxuICpcbiAqIEBleGFtcGxlXG4gKiBzdG9yYWdlLmNvbGxlY3Rpb24uZG9jdW1lbnQucmVtb3ZlKCk7XG4gKiBkb2N1bWVudC5yZW1vdmUoKTtcbiAqXG4gKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCl7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoIHRoaXMgKTtcbiAgfVxuXG4gIHJldHVybiBkZWxldGUgdGhpcztcbn07XG5cblxuLyoqXG4gKiDQntGH0LjRidCw0LXRgiDQtNC+0LrRg9C80LXQvdGCICjQstGL0YHRgtCw0LLQu9GP0LXRgiDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOINC40LvQuCB1bmRlZmluZWQpXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBkb2MgPSB0aGlzXG4gICAgLCBzZWxmID0gdGhpc1xuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkgY29udGludWU7XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cbiAgICAgICwgcGF0aCA9IHAuc3BsaXQoJy4nKVxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxuICAgICAgLCBkb2NfID0gZG9jXG4gICAgICAsIGkgPSAwO1xuXG4gICAgZm9yICggOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cbiAgICAgICAgLCBkZWZhdWx0VmFsO1xuXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcblxuICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbCB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmRlZmF1bHQoIHAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbkRvY3VtZW50LlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnQ7XG4iLCIvL3RvZG86INC/0L7RgNGC0LjRgNC+0LLQsNGC0Ywg0LLRgdC1INC+0YjQuNCx0LrQuCEhIVxuLyoqXG4gKiBTdG9yYWdlRXJyb3IgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIC0gRXJyb3IgbWVzc2FnZVxuICogQGluaGVyaXRzIEVycm9yIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yXG4gKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc4MzgxOC9ob3ctZG8taS1jcmVhdGUtYS1jdXN0b20tZXJyb3ItaW4tamF2YXNjcmlwdFxuICovXG5mdW5jdGlvbiBTdG9yYWdlRXJyb3IgKCBtc2cgKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1zZztcbiAgdGhpcy5uYW1lID0gJ1N0b3JhZ2VFcnJvcic7XG59XG5TdG9yYWdlRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cblxuLyohXG4gKiBGb3JtYXRzIGVycm9yIG1lc3NhZ2VzXG4gKi9cblN0b3JhZ2VFcnJvci5wcm90b3R5cGUuZm9ybWF0TWVzc2FnZSA9IGZ1bmN0aW9uIChtc2csIHBhdGgsIHR5cGUsIHZhbCkge1xuICBpZiAoIW1zZykgdGhyb3cgbmV3IFR5cGVFcnJvcignbWVzc2FnZSBpcyByZXF1aXJlZCcpO1xuXG4gIHJldHVybiBtc2cucmVwbGFjZSgve1BBVEh9LywgcGF0aClcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VkFMVUV9LywgU3RyaW5nKHZhbHx8JycpKVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tUWVBFfS8sIHR5cGUgfHwgJ2RlY2xhcmVkIHR5cGUnKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRXJyb3I7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLlxuICpcbiAqIEBzZWUgRXJyb3IubWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRXJyb3IubWVzc2FnZXMgPSByZXF1aXJlKCcuL2Vycm9yL21lc3NhZ2VzJyk7XG5cbi8qIVxuICogRXhwb3NlIHN1YmNsYXNzZXNcbiAqL1xuXG5TdG9yYWdlRXJyb3IuQ2FzdEVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9jYXN0Jyk7XG5TdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0aW9uJyk7XG5TdG9yYWdlRXJyb3IuVmFsaWRhdG9yRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZhbGlkYXRvcicpO1xuLy90b2RvOlxuLy9TdG9yYWdlRXJyb3IuVmVyc2lvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92ZXJzaW9uJyk7XG4vL1N0b3JhZ2VFcnJvci5PdmVyd3JpdGVNb2RlbEVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9vdmVyd3JpdGVNb2RlbCcpO1xuU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xuLy9TdG9yYWdlRXJyb3IuRGl2ZXJnZW50QXJyYXlFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvZGl2ZXJnZW50QXJyYXknKTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDYXN0RXJyb3IgKHR5cGUsIHZhbHVlLCBwYXRoKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xuICB0aGlzLm5hbWUgPSAnQ2FzdEVycm9yJztcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnBhdGggPSBwYXRoO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUVycm9yLlxuICovXG5DYXN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuQ2FzdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhc3RFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBDYXN0RXJyb3I7XG4iLCJcbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLiBUaGVzZSBtYXkgYmUgY3VzdG9taXplZC5cbiAqXG4gKiAgICAgLy8gY3VzdG9taXplIHdpdGhpbiBlYWNoIHNjaGVtYSBvciBnbG9iYWxseSBsaWtlIHNvXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICBtb25nb29zZS5FcnJvci5tZXNzYWdlcy5TdHJpbmcuZW51bSAgPSBcIllvdXIgY3VzdG9tIG1lc3NhZ2UgZm9yIHtQQVRIfS5cIjtcbiAqXG4gKiBBcyB5b3UgbWlnaHQgaGF2ZSBub3RpY2VkLCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2ljIHRlbXBsYXRpbmdcbiAqXG4gKiAtIGB7UEFUSH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgZG9jdW1lbnQgcGF0aFxuICogLSBge1ZBTFVFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogLSBge1RZUEV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSB2YWxpZGF0b3IgdHlwZSBzdWNoIGFzIFwicmVnZXhwXCIsIFwibWluXCIsIG9yIFwidXNlciBkZWZpbmVkXCJcbiAqIC0gYHtNSU59YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtaW4gdmFsdWUgZm9yIHRoZSBOdW1iZXIubWluIHZhbGlkYXRvclxuICogLSBge01BWH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1heCB2YWx1ZSBmb3IgdGhlIE51bWJlci5tYXggdmFsaWRhdG9yXG4gKlxuICogQ2xpY2sgdGhlIFwic2hvdyBjb2RlXCIgbGluayBiZWxvdyB0byBzZWUgYWxsIGRlZmF1bHRzLlxuICpcbiAqIEBwcm9wZXJ0eSBtZXNzYWdlc1xuICogQHJlY2VpdmVyIFN0b3JhZ2VFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgbXNnID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxubXNnLmdlbmVyYWwgPSB7fTtcbm1zZy5nZW5lcmFsLmRlZmF1bHQgPSBcIlZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWBcIjtcbm1zZy5nZW5lcmFsLnJlcXVpcmVkID0gXCJQYXRoIGB7UEFUSH1gIGlzIHJlcXVpcmVkLlwiO1xuXG5tc2cuTnVtYmVyID0ge307XG5tc2cuTnVtYmVyLm1pbiA9IFwiUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbGVzcyB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZSAoe01JTn0pLlwiO1xubXNnLk51bWJlci5tYXggPSBcIlBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIG1vcmUgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUgKHtNQVh9KS5cIjtcblxubXNnLlN0cmluZyA9IHt9O1xubXNnLlN0cmluZy5lbnVtID0gXCJge1ZBTFVFfWAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBge1BBVEh9YC5cIjtcbm1zZy5TdHJpbmcubWF0Y2ggPSBcIlBhdGggYHtQQVRIfWAgaXMgaW52YWxpZCAoe1ZBTFVFfSkuXCI7XG5cbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyohXG4gKiBNaXNzaW5nU2NoZW1hIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBNaXNzaW5nU2NoZW1hRXJyb3IoKXtcbiAgdmFyIG1zZyA9ICdTY2hlbWEgaGFzblxcJ3QgYmVlbiByZWdpc3RlcmVkIGZvciBkb2N1bWVudC5cXG4nXG4gICAgKyAnVXNlIHN0b3JhZ2UuRG9jdW1lbnQobmFtZSwgc2NoZW1hKSc7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1zZyk7XG5cbiAgdGhpcy5uYW1lID0gJ01pc3NpbmdTY2hlbWFFcnJvcic7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlRXJyb3IuXG4gKi9cblxuTWlzc2luZ1NjaGVtYUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3RvcmFnZUVycm9yLnByb3RvdHlwZSk7XG5NaXNzaW5nU2NoZW1hRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RvcmFnZUVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pc3NpbmdTY2hlbWFFcnJvcjsiLCJcbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50c1xuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIERvY3VtZW50IFZhbGlkYXRpb24gRXJyb3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGluc3RhbmNlXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yIChpbnN0YW5jZSkge1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBcIlZhbGlkYXRpb24gZmFpbGVkXCIpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9yJztcbiAgdGhpcy5lcnJvcnMgPSBpbnN0YW5jZS5lcnJvcnMgPSB7fTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvci5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcbnZhciBlcnJvck1lc3NhZ2VzID0gU3RvcmFnZUVycm9yLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFNjaGVtYSB2YWxpZGF0b3IgZXJyb3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZ1xuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfGFueX0gdmFsXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0b3JFcnJvciAocGF0aCwgbXNnLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIG1zZyA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICB2YXIgbWVzc2FnZSA9IHRoaXMuZm9ybWF0TWVzc2FnZShtc2csIHBhdGgsIHR5cGUsIHZhbCk7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdG9yRXJyb3InO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsO1xufVxuXG4vKiFcbiAqIHRvU3RyaW5nIGhlbHBlclxuICovXG5cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvclxuICovXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlRXJyb3IucHJvdG90eXBlICk7XG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0b3JFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIi8vIEJhY2tib25lLkV2ZW50c1xuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcbi8vIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcbi8vIGZ1bmN0aW9ucyB0byBhbiBldmVudDsgYHRyaWdnZXJgLWluZyBhbiBldmVudCBmaXJlcyBhbGwgY2FsbGJhY2tzIGluXG4vLyBzdWNjZXNzaW9uLlxuLy9cbi8vICAgICB2YXIgb2JqZWN0ID0ge307XG4vLyAgICAgXy5leHRlbmQob2JqZWN0LCBFdmVudHMucHJvdG90eXBlKTtcbi8vICAgICBvYmplY3Qub24oJ2V4cGFuZCcsIGZ1bmN0aW9uKCl7IGFsZXJ0KCdleHBhbmRlZCcpOyB9KTtcbi8vICAgICBvYmplY3QudHJpZ2dlcignZXhwYW5kJyk7XG4vL1xuZnVuY3Rpb24gRXZlbnRzKCkge31cblxuRXZlbnRzLnByb3RvdHlwZSA9IHtcblxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXG4gIC8vIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuICBvbjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcbiAgLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cbiAgb25jZTogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbmNlID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0pO1xuICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIHRoaXMub24obmFtZSwgb25jZSwgY29udGV4dCk7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gIC8vIGNhbGxiYWNrcyB3aXRoIHRoYXQgZnVuY3Rpb24uIElmIGBjYWxsYmFja2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgLy8gY2FsbGJhY2tzIGZvciB0aGUgZXZlbnQuIElmIGBuYW1lYCBpcyBudWxsLCByZW1vdmVzIGFsbCBib3VuZFxuICAvLyBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXG4gIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB2YXIgcmV0YWluLCBldiwgZXZlbnRzLCBuYW1lcywgaSwgbCwgaiwgaztcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrIHx8IGNvbnRleHQpIHtcbiAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgZXYgPSBldmVudHNbal07XG4gICAgICAgICAgICBpZiAoKGNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2suX2NhbGxiYWNrKSB8fFxuICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICByZXRhaW4ucHVzaChldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBUcmlnZ2VyIG9uZSBvciBtYW55IGV2ZW50cywgZmlyaW5nIGFsbCBib3VuZCBjYWxsYmFja3MuIENhbGxiYWNrcyBhcmVcbiAgLy8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcbiAgLy8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG4gIC8vIHJlY2VpdmUgdGhlIHRydWUgbmFtZSBvZiB0aGUgZXZlbnQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50KS5cbiAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgaWYgKGFsbEV2ZW50cykgdHJpZ2dlckV2ZW50cyhhbGxFdmVudHMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gVGVsbCB0aGlzIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBlaXRoZXIgc3BlY2lmaWMgZXZlbnRzIC4uLiBvclxuICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG87XG4gICAgaWYgKCFsaXN0ZW5pbmdUbykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIHJlbW92ZSA9ICFuYW1lICYmICFjYWxsYmFjaztcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgIGlmIChvYmopIChsaXN0ZW5pbmdUbyA9IHt9KVtvYmouX2xpc3RlbklkXSA9IG9iajtcbiAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgb2JqID0gbGlzdGVuaW5nVG9baWRdO1xuICAgICAgb2JqLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICBpZiAocmVtb3ZlIHx8IF8uaXNFbXB0eShvYmouX2V2ZW50cykpIGRlbGV0ZSB0aGlzLl9saXN0ZW5pbmdUb1tpZF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzLlxudmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbi8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4vLyBuYW1lcyBgXCJjaGFuZ2UgYmx1clwiYCBhbmQgalF1ZXJ5LXN0eWxlIGV2ZW50IG1hcHMgYHtjaGFuZ2U6IGFjdGlvbn1gXG4vLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxudmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gIGlmICghbmFtZSkgcmV0dXJuIHRydWU7XG5cbiAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gIGlmIChldmVudFNwbGl0dGVyLnRlc3QobmFtZSkpIHtcbiAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtuYW1lc1tpXV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBBIGRpZmZpY3VsdC10by1iZWxpZXZlLCBidXQgb3B0aW1pemVkIGludGVybmFsIGRpc3BhdGNoIGZ1bmN0aW9uIGZvclxuLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxudmFyIHRyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGFyZ3MpIHtcbiAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgY2FzZSAwOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCk7IHJldHVybjtcbiAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgY2FzZSAzOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyLCBhMyk7IHJldHVybjtcbiAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xuICB9XG59O1xuXG52YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xuXG4vLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xuLy8gbGlzdGVuIHRvIGFuIGV2ZW50IGluIGFub3RoZXIgb2JqZWN0IC4uLiBrZWVwaW5nIHRyYWNrIG9mIHdoYXQgaXQnc1xuLy8gbGlzdGVuaW5nIHRvLlxuXy5lYWNoKGxpc3Rlbk1ldGhvZHMsIGZ1bmN0aW9uKGltcGxlbWVudGF0aW9uLCBtZXRob2QpIHtcbiAgRXZlbnRzW21ldGhvZF0gPSBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0ge30pO1xuICAgIHZhciBpZCA9IG9iai5fbGlzdGVuSWQgfHwgKG9iai5fbGlzdGVuSWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgIGxpc3RlbmluZ1RvW2lkXSA9IG9iajtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuIiwiLyoqXG4gKiBTdG9yYWdlIGRvY3VtZW50cyB1c2luZyBzY2hlbWFcbiAqIGluc3BpcmVkIGJ5IG1vbmdvb3NlIDMuOC40IChmaXhlZCBidWdzIGZvciAzLjguMTUpXG4gKlxuICogU3RvcmFnZSBpbXBsZW1lbnRhdGlvblxuICogaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jc2VsZWN0b3JzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cbiAqXG4gKiBicm93c2VyaWZ5IGxpYi8gLS1zdGFuZGFsb25lIHN0b3JhZ2UgPiBzdG9yYWdlLmpzIC1kXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBjb2xsZWN0aW9uIGFuZCBnZXQgaXRcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge3N0b3JhZ2UuU2NoZW1hfHVuZGVmaW5lZH0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gW2FwaV0gLSDRgdGB0YvQu9C60LAg0L3QsCDQsNC/0Lgg0YDQtdGB0YPRgNGBXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbnx1bmRlZmluZWR9XG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLmNyZWF0ZUNvbGxlY3Rpb24gPSBmdW5jdGlvbiggbmFtZSwgc2NoZW1hLCBhcGkgKXtcbiAgaWYgKCB0aGlzWyBuYW1lIF0gKXtcbiAgICBjb25zb2xlLmluZm8oJ3N0b3JhZ2U6OmNvbGxlY3Rpb246IGAnICsgbmFtZSArICdgIGFscmVhZHkgZXhpc3QnKTtcbiAgICByZXR1cm4gdGhpc1sgbmFtZSBdO1xuICB9XG5cbiAgaWYgKCAnU2NoZW1hJyAhPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBzY2hlbWEuY29uc3RydWN0b3IgKSApe1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BzY2hlbWFgIG11c3QgYmUgU2NoZW1hIGluc3RhbmNlJyk7XG4gIH1cblxuICB0aGlzLmNvbGxlY3Rpb25OYW1lcy5wdXNoKCBuYW1lICk7XG5cbiAgcmV0dXJuIHRoaXNbIG5hbWUgXSA9IG5ldyBDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApO1xufTtcblxuLyoqXG4gKiBUbyBvYnRhaW4gdGhlIG5hbWVzIG9mIHRoZSBjb2xsZWN0aW9ucyBpbiBhbiBhcnJheVxuICpcbiAqIEByZXR1cm5zIHtBcnJheS48c3RyaW5nPn0gQW4gYXJyYXkgY29udGFpbmluZyBhbGwgY29sbGVjdGlvbnMgaW4gdGhlIHN0b3JhZ2UuXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLmdldENvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lcztcbn07XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5Db2xsZWN0aW9uID0gQ29sbGVjdGlvbjtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSB2ZXJzaW9uXG4gKlxuICogQHByb3BlcnR5IHZlcnNpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cbi8vdG9kbzpcbi8vU3RvcmFnZS5wcm90b3R5cGUudmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtTY2hlbWFdKCNzY2hlbWFfU2NoZW1hKSBjb25zdHJ1Y3RvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBTY2hlbWEgPSBtb25nb29zZS5TY2hlbWE7XG4gKiAgICAgdmFyIENhdFNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqIEBtZXRob2QgU2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYSA9IFNjaGVtYTtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZSA9IFNjaGVtYVR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgU3RvcmFnZSBTY2hlbWFUeXBlcy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfQWxpYXMgb2Ygc3RvcmFnZS5TY2hlbWEuVHlwZXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5Ll9cbiAqXG4gKiBAcHJvcGVydHkgU2NoZW1hVHlwZXNcbiAqIEBzZWUgU2NoZW1hLlNjaGVtYVR5cGVzICNzY2hlbWFfU2NoZW1hLlR5cGVzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGVzID0gU2NoZW1hLlR5cGVzO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtWaXJ0dWFsVHlwZV0oI3ZpcnR1YWx0eXBlX1ZpcnR1YWxUeXBlKSBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgVmlydHVhbFR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuVmlydHVhbFR5cGUgPSBWaXJ0dWFsVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBTdG9yYWdlIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgYXJyYXkgPSBzdG9yYWdlLlR5cGVzLkFycmF5O1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtPYmplY3RJZF0oI3R5cGVzLW9iamVjdGlkLWpzKVxuICogLSBbU3ViRG9jdW1lbnRdKCN0eXBlcy1lbWJlZGRlZC1qcylcbiAqIC0gW0FycmF5XSgjdHlwZXMtYXJyYXktanMpXG4gKiAtIFtEb2N1bWVudEFycmF5XSgjdHlwZXMtZG9jdW1lbnRhcnJheS1qcylcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgT2JqZWN0SWRgIHR5cGUsIHdlIGNhbiBjb25zdHJ1Y3QgaWRzIG9uIGRlbWFuZC5cbiAqXG4gKiAgICAgdmFyIE9iamVjdElkID0gc3RvcmFnZS5UeXBlcy5PYmplY3RJZDtcbiAqICAgICB2YXIgaWQxID0gbmV3IE9iamVjdElkO1xuICpcbiAqIEBwcm9wZXJ0eSBUeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5UeXBlcyA9IFR5cGVzO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtEb2N1bWVudF0oI2RvY3VtZW50LWpzKSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAbWV0aG9kIERvY3VtZW50XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkRvY3VtZW50ID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIFtTdG9yYWdlRXJyb3JdKCNlcnJvcl9TdG9yYWdlRXJyb3IpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxuXG5TdG9yYWdlLnByb3RvdHlwZS5TdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xuU3RvcmFnZS5wcm90b3R5cGUudXRpbHMgPSB1dGlscztcblN0b3JhZ2UucHJvdG90eXBlLk9iamVjdElkID0gVHlwZXMuT2JqZWN0SWQ7XG5TdG9yYWdlLnByb3RvdHlwZS5zY2hlbWFzID0gU2NoZW1hLnNjaGVtYXM7XG5cblN0b3JhZ2UucHJvdG90eXBlLnNldEFkYXB0ZXIgPSBmdW5jdGlvbiggYWRhcHRlckhvb2tzICl7XG4gIERvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSBhZGFwdGVySG9va3M7XG59O1xuXG5cbi8qIVxuICogVGhlIGV4cG9ydHMgb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIFN0b3JhZ2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdG9yYWdlO1xuIiwiLy8g0JzQsNGI0LjQvdCwINGB0L7RgdGC0L7Rj9C90LjQuSDQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINC/0L7QvNC10YLQutC4LCDQsiDQutCw0LrQvtC8INGB0L7RgdGC0L7Rj9C90LjQuCDQvdCw0YXQvtC00Y/RgtGB0Y8g0L/QvtC70LVcbi8vINCd0LDQv9GA0LjQvNC10YA6INC10YHQu9C4INC/0L7Qu9C1INC40LzQtdC10YIg0YHQvtGB0YLQvtGP0L3QuNC1IGRlZmF1bHQgLSDQt9C90LDRh9C40YIg0LXQs9C+INC30L3QsNGH0LXQvdC40LXQvCDRj9Cy0LvRj9C10YLRgdGPINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y5cbi8vINCf0YDQuNC80LXRh9Cw0L3QuNC1OiDQtNC70Y8g0LzQsNGB0YHQuNCy0L7QsiDQsiDQvtCx0YnQtdC8INGB0LvRg9GH0LDQtSDRjdGC0L4g0L7Qt9C90LDRh9Cw0LXRgiDQv9GD0YHRgtC+0Lkg0LzQsNGB0YHQuNCyXG5cbi8qIVxuICogRGVwZW5kZW5jaWVzXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5cbnZhciBBY3RpdmVSb3N0ZXIgPSBTdGF0ZU1hY2hpbmUuY3RvcigncmVxdWlyZScsICdtb2RpZnknLCAnaW5pdCcsICdkZWZhdWx0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJuYWxDYWNoZTtcblxuZnVuY3Rpb24gSW50ZXJuYWxDYWNoZSAoKSB7XG4gIHRoaXMuc3RyaWN0TW9kZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zYXZlRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmFkaG9jUGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMucmVtb3ZpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMuaW5zZXJ0aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLnZlcnNpb24gPSB1bmRlZmluZWQ7XG4gIHRoaXMuZ2V0dGVycyA9IHt9O1xuICB0aGlzLl9pZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5wb3B1bGF0ZSA9IHVuZGVmaW5lZDsgLy8gd2hhdCB3ZSB3YW50IHRvIHBvcHVsYXRlIGluIHRoaXMgZG9jXG4gIHRoaXMucG9wdWxhdGVkID0gdW5kZWZpbmVkOy8vIHRoZSBfaWRzIHRoYXQgaGF2ZSBiZWVuIHBvcHVsYXRlZFxuICB0aGlzLndhc1BvcHVsYXRlZCA9IGZhbHNlOyAvLyBpZiB0aGlzIGRvYyB3YXMgdGhlIHJlc3VsdCBvZiBhIHBvcHVsYXRpb25cbiAgdGhpcy5zY29wZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hY3RpdmVQYXRocyA9IG5ldyBBY3RpdmVSb3N0ZXI7XG5cbiAgLy8gZW1iZWRkZWQgZG9jc1xuICB0aGlzLm93bmVyRG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZnVsbFBhdGggPSB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIG9iamVjdCBgb2AgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG9iaiA9IHtcbiAqICAgICAgICAgY29tbWVudHM6IFtcbiAqICAgICAgICAgICAgIHsgdGl0bGU6ICdleGNpdGluZyEnLCBfZG9jOiB7IHRpdGxlOiAnZ3JlYXQhJyB9fVxuICogICAgICAgICAgICwgeyB0aXRsZTogJ251bWJlciBkb3MnIH1cbiAqICAgICAgICAgXVxuICogICAgIH1cbiAqXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbykgICAgICAgICAvLyAnZXhjaXRpbmchJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8sICdfZG9jJykgLy8gJ2dyZWF0ISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLnRpdGxlJywgbykgICAgICAgICAgIC8vIFsnZXhjaXRpbmchJywgJ251bWJlciBkb3MnXVxuICpcbiAqICAgICAvLyBzdW1tYXJ5XG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8pXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwpXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIG1hcClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbCwgbWFwKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIGVhY2ggaW5kaXZpZHVhbCBmb3VuZCB2YWx1ZS4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxuICovXG5cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIG8sIHNwZWNpYWwsIG1hcCkge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT0gdHlwZW9mIHBhdGhcbiAgICA/IHBhdGguc3BsaXQoJy4nKVxuICAgIDogcGF0aDtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocGFydHMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBgcGF0aGAuIE11c3QgYmUgZWl0aGVyIHN0cmluZyBvciBhcnJheScpO1xuICB9XG5cbiAgdmFyIG9iaiA9IG9cbiAgICAsIHBhcnQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIC8vIHJlYWRpbmcgYSBwcm9wZXJ0eSBmcm9tIHRoZSBhcnJheSBpdGVtc1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG5cbiAgICAgIHJldHVybiBvYmoubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtXG4gICAgICAgICAgPyBleHBvcnRzLmdldChwYXRocywgaXRlbSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcClcbiAgICAgICAgICA6IG1hcCh1bmRlZmluZWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm4gbWFwKG9iaik7XG4gIH1cblxuICByZXR1cm4gbWFwKG9iaik7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGB2YWxgIGF0IHRoZSBnaXZlbiBgcGF0aGAgb2Ygb2JqZWN0IGBvYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggaXMgcGFzc2VkIGVhY2ggaW5kaXZpZHVhbCB2YWx1ZSBiZWZvcmUgc2V0dGluZyBpdC4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxuICovXG5cbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbywgc3BlY2lhbCwgbWFwLCBfY29weWluZykge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT0gdHlwZW9mIHBhdGhcbiAgICA/IHBhdGguc3BsaXQoJy4nKVxuICAgIDogcGF0aDtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocGFydHMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBgcGF0aGAuIE11c3QgYmUgZWl0aGVyIHN0cmluZyBvciBhcnJheScpO1xuICB9XG5cbiAgaWYgKG51bGwgPT0gbykgcmV0dXJuO1xuXG4gIC8vIHRoZSBleGlzdGFuY2Ugb2YgJCBpbiBhIHBhdGggdGVsbHMgdXMgaWYgdGhlIHVzZXIgZGVzaXJlc1xuICAvLyB0aGUgY29weWluZyBvZiBhbiBhcnJheSBpbnN0ZWFkIG9mIHNldHRpbmcgZWFjaCB2YWx1ZSBvZlxuICAvLyB0aGUgYXJyYXkgdG8gdGhlIG9uZSBieSBvbmUgdG8gbWF0Y2hpbmcgcG9zaXRpb25zIG9mIHRoZVxuICAvLyBjdXJyZW50IGFycmF5LlxuICB2YXIgY29weSA9IF9jb3B5aW5nIHx8IC9cXCQvLnRlc3QocGF0aClcbiAgICAsIG9iaiA9IG9cbiAgICAsIHBhcnQ7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPCBsZW47ICsraSkge1xuICAgIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgIGlmICgnJCcgPT0gcGFydCkge1xuICAgICAgaWYgKGkgPT0gbGVuIC0gMSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuICAgICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgb2Ygc2luZ2xlIHZhbHVlcyBvZiBhcnJheVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWxbal0sIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBlbnRpcmUgdmFsdWVcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm47XG4gIH1cblxuICAvLyBwcm9jZXNzIHRoZSBsYXN0IHByb3BlcnR5IG9mIHRoZSBwYXRoXG5cbiAgcGFydCA9IHBhcnRzW2xlbl07XG5cbiAgLy8gdXNlIHRoZSBzcGVjaWFsIHByb3BlcnR5IGlmIGV4aXN0c1xuICBpZiAoc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF0pIHtcbiAgICBvYmogPSBvYmpbc3BlY2lhbF07XG4gIH1cblxuICAvLyBzZXQgdGhlIHZhbHVlIG9uIHRoZSBsYXN0IGJyYW5jaFxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgZm9yICh2YXIgaXRlbSwgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbFtqXSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbFtqXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGl0ZW0gPSBvYmpbal07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xuICAgICAgICAgICAgbG9va3VwKGl0ZW0sIHBhcnQsIG1hcCh2YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xuICAgICAgICAgICAgaXRlbVtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBsb29rdXAob2JqLCBwYXJ0LCBtYXAodmFsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuXG4gKi9cblxuZnVuY3Rpb24gSyAodikge1xuICByZXR1cm4gdjtcbn0iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgVHlwZXNcbiAgLCBzY2hlbWFzO1xuXG4vKipcbiAqIFNjaGVtYSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGNoaWxkID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9KTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZywgYWdlOiBOdW1iZXIsIGNoaWxkcmVuOiBbY2hpbGRdIH0pO1xuICogICAgIHZhciBUcmVlID0gbW9uZ29vc2UubW9kZWwoJ1RyZWUnLCBzY2hlbWEpO1xuICpcbiAqICAgICAvLyBzZXR0aW5nIHNjaGVtYSBvcHRpb25zXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IF9pZDogZmFsc2UsIGF1dG9JbmRleDogZmFsc2UgfSlcbiAqXG4gKiAjIyMjT3B0aW9uczpcbiAqXG4gKiAtIFtjb2xsZWN0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2NvbGxlY3Rpb24pOiBzdHJpbmcgLSBubyBkZWZhdWx0XG4gKiAtIFtpZF0oL2RvY3MvZ3VpZGUuaHRtbCNpZCk6IGJvb2wgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIGBtaW5pbWl6ZWA6IGJvb2wgLSBjb250cm9scyBbZG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkgYmVoYXZpb3Igd2hlbiBjYWxsZWQgbWFudWFsbHkgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIFtzdHJpY3RdKC9kb2NzL2d1aWRlLmh0bWwjc3RyaWN0KTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3RvSlNPTl0oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdG9PYmplY3RdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdmVyc2lvbktleV0oL2RvY3MvZ3VpZGUuaHRtbCN2ZXJzaW9uS2V5KTogYm9vbCAtIGRlZmF1bHRzIHRvIFwiX192XCJcbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfV2hlbiBuZXN0aW5nIHNjaGVtYXMsIChgY2hpbGRyZW5gIGluIHRoZSBleGFtcGxlIGFib3ZlKSwgYWx3YXlzIGRlY2xhcmUgdGhlIGNoaWxkIHNjaGVtYSBmaXJzdCBiZWZvcmUgcGFzc2luZyBpdCBpbnRvIGlzIHBhcmVudC5fXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8dW5kZWZpbmVkfSBbbmFtZV0g0J3QsNC30LLQsNC90LjQtSDRgdGF0LXQvNGLXG4gKiBAcGFyYW0ge1NjaGVtYX0gW2Jhc2VTY2hlbWFdINCR0LDQt9C+0LLQsNGPINGB0YXQtdC80LAg0L/RgNC4INC90LDRgdC70LXQtNC+0LLQsNC90LjQuFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiDQodGF0LXQvNCwXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTY2hlbWEgKCBuYW1lLCBiYXNlU2NoZW1hLCBvYmosIG9wdGlvbnMgKSB7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgU2NoZW1hKSApXG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApO1xuXG4gIC8vINCV0YHQu9C4INGN0YLQviDQuNC80LXQvdC+0LLQsNC90LDRjyDRgdGF0LXQvNCwXG4gIGlmICggdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnICl7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICBzY2hlbWFzWyBuYW1lIF0gPSB0aGlzO1xuICB9IGVsc2Uge1xuICAgIG9wdGlvbnMgPSBvYmo7XG4gICAgb2JqID0gYmFzZVNjaGVtYTtcbiAgICBiYXNlU2NoZW1hID0gbmFtZTtcbiAgICBuYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCAhKGJhc2VTY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpICl7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0YXRgNCw0L3QuNC8INC+0L/QuNGB0LDQvdC40LUg0YHRhdC10LzRiyDQtNC70Y8g0L/QvtC00LTQtdGA0LbQutC4INC00LjRgdC60YDQuNC80LjQvdCw0YLQvtGA0L7QslxuICB0aGlzLnNvdXJjZSA9IG9iajtcblxuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3VicGF0aHMgPSB7fTtcbiAgdGhpcy52aXJ0dWFscyA9IHt9O1xuICB0aGlzLm5lc3RlZCA9IHt9O1xuICB0aGlzLmluaGVyaXRzID0ge307XG4gIHRoaXMuY2FsbFF1ZXVlID0gW107XG4gIHRoaXMubWV0aG9kcyA9IHt9O1xuICB0aGlzLnN0YXRpY3MgPSB7fTtcbiAgdGhpcy50cmVlID0ge307XG4gIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB1bmRlZmluZWQ7XG5cbiAgdGhpcy5vcHRpb25zID0gdGhpcy5kZWZhdWx0T3B0aW9ucyggb3B0aW9ucyApO1xuXG4gIGlmICggYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIGJhc2VTY2hlbWEuZGlzY3JpbWluYXRvciggbmFtZSwgdGhpcyApO1xuICB9XG5cbiAgLy8gYnVpbGQgcGF0aHNcbiAgaWYgKCBvYmogKSB7XG4gICAgdGhpcy5hZGQoIG9iaiApO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgZ2V0IGFuIGF1dG8gX2lkIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b19pZCA9ICF0aGlzLnBhdGhzWydfaWQnXSAmJiAoIXRoaXMub3B0aW9ucy5ub0lkICYmIHRoaXMub3B0aW9ucy5faWQpO1xuICBpZiAoYXV0b19pZCkge1xuICAgIHRoaXMuYWRkKHsgX2lkOiB7dHlwZTogU2NoZW1hLk9iamVjdElkLCBhdXRvOiB0cnVlfSB9KTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIHJlY2VpdmUgYW4gaWQgZ2V0dGVyIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b2lkID0gIXRoaXMucGF0aHNbJ2lkJ10gJiYgdGhpcy5vcHRpb25zLmlkO1xuICBpZiAoIGF1dG9pZCApIHtcbiAgICB0aGlzLnZpcnR1YWwoJ2lkJykuZ2V0KCBpZEdldHRlciApO1xuICB9XG59XG5cbi8qIVxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBfaWQgY2FzdCB0byBhIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gaWRHZXR0ZXIgKCkge1xuICBpZiAodGhpcy4kX18uX2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLl9pZDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5faWQgPSBudWxsID09IHRoaXMuX2lkXG4gICAgPyBudWxsXG4gICAgOiBTdHJpbmcodGhpcy5faWQpO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBmbGF0IHBhdGhzXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgICAgOiBTY2hlbWFUeXBlLFxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSBwYXRoc1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBhIHRyZWVcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICA6IE9iamVjdElkXG4gKiAgICAgICAsICduZXN0ZWQnICA6IHtcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgdHJlZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnRyZWU7XG5cbi8qKlxuICogUmV0dXJucyBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoaXMgc2NoZW1hLCBtZXJnZWQgd2l0aCBgb3B0aW9uc2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLmRlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9ICQuZXh0ZW5kKHtcbiAgICAgIHN0cmljdDogdHJ1ZVxuICAgICwgdmVyc2lvbktleTogJ19fdidcbiAgICAsIGRpc2NyaW1pbmF0b3JLZXk6ICdfX3QnXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIG9ubHkgYXBwbGllZCBhdCBjb25zdHJ1Y3Rpb24gdGltZVxuICAgICwgX2lkOiB0cnVlXG4gICAgLCBpZDogdHJ1ZVxuICB9LCBvcHRpb25zICk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZHMga2V5IHBhdGggLyBzY2hlbWEgdHlwZSBwYWlycyB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIFRveVNjaGVtYSA9IG5ldyBTY2hlbWE7XG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKG51bGwgPT0gb2JqWyBrZXkgXSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB2YWx1ZSBmb3Igc2NoZW1hIHBhdGggYCcrIHByZWZpeCArIGtleSArJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdChvYmpba2V5XSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpba2V5XS5jb25zdHJ1Y3RvcikgKVxuICAgICAgJiYgKCAhb2JqWyBrZXkgXS50eXBlIHx8IG9ialsga2V5IF0udHlwZS50eXBlICkgKXtcblxuICAgICAgaWYgKCBPYmplY3Qua2V5cyhvYmpbIGtleSBdKS5sZW5ndGggKSB7XG4gICAgICAgIC8vIG5lc3RlZCBvYmplY3QgeyBsYXN0OiB7IG5hbWU6IFN0cmluZyB9fVxuICAgICAgICB0aGlzLm5lc3RlZFsgcHJlZml4ICsga2V5IF0gPSB0cnVlO1xuICAgICAgICB0aGlzLmFkZCggb2JqWyBrZXkgXSwgcHJlZml4ICsga2V5ICsgJy4nKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wYXRoKCBwcmVmaXggKyBrZXksIG9ialsga2V5IF0gKTsgLy8gbWl4ZWQgdHlwZVxuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFJlc2VydmVkIGRvY3VtZW50IGtleXMuXG4gKlxuICogS2V5cyBpbiB0aGlzIG9iamVjdCBhcmUgbmFtZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaW4gc2NoZW1hIGRlY2xhcmF0aW9ucyBiL2MgdGhleSBjb25mbGljdCB3aXRoIG1vbmdvb3NlIGZ1bmN0aW9uYWxpdHkuIFVzaW5nIHRoZXNlIGtleSBuYW1lIHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKlxuICogICAgICBvbiwgZW1pdCwgX2V2ZW50cywgZGIsIGdldCwgc2V0LCBpbml0LCBpc05ldywgZXJyb3JzLCBzY2hlbWEsIG9wdGlvbnMsIG1vZGVsTmFtZSwgY29sbGVjdGlvbiwgX3ByZXMsIF9wb3N0cywgdG9PYmplY3RcbiAqXG4gKiBfTk9URTpfIFVzZSBvZiB0aGVzZSB0ZXJtcyBhcyBtZXRob2QgbmFtZXMgaXMgcGVybWl0dGVkLCBidXQgcGxheSBhdCB5b3VyIG93biByaXNrLCBhcyB0aGV5IG1heSBiZSBleGlzdGluZyBtb25nb29zZSBkb2N1bWVudCBtZXRob2RzIHlvdSBhcmUgc3RvbXBpbmcgb24uXG4gKlxuICogICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgIHNjaGVtYS5tZXRob2RzLmluaXQgPSBmdW5jdGlvbiAoKSB7fSAvLyBwb3RlbnRpYWxseSBicmVha2luZ1xuICovXG5TY2hlbWEucmVzZXJ2ZWQgPSBPYmplY3QuY3JlYXRlKCBudWxsICk7XG52YXIgcmVzZXJ2ZWQgPSBTY2hlbWEucmVzZXJ2ZWQ7XG5yZXNlcnZlZC5vbiA9XG5yZXNlcnZlZC5kYiA9XG5yZXNlcnZlZC5nZXQgPVxucmVzZXJ2ZWQuc2V0ID1cbnJlc2VydmVkLmluaXQgPVxucmVzZXJ2ZWQuaXNOZXcgPVxucmVzZXJ2ZWQuZXJyb3JzID1cbnJlc2VydmVkLnNjaGVtYSA9XG5yZXNlcnZlZC5vcHRpb25zID1cbnJlc2VydmVkLm1vZGVsTmFtZSA9XG5yZXNlcnZlZC5jb2xsZWN0aW9uID1cbnJlc2VydmVkLnRvT2JqZWN0ID1cbnJlc2VydmVkLmRvbWFpbiA9XG5yZXNlcnZlZC5lbWl0ID0gICAgLy8gRXZlbnRFbWl0dGVyXG5yZXNlcnZlZC5fZXZlbnRzID0gLy8gRXZlbnRFbWl0dGVyXG5yZXNlcnZlZC5fcHJlcyA9IHJlc2VydmVkLl9wb3N0cyA9IDE7IC8vIGhvb2tzLmpzXG5cbi8qKlxuICogR2V0cy9zZXRzIHNjaGVtYSBwYXRocy5cbiAqXG4gKiBTZXRzIGEgcGF0aCAoaWYgYXJpdHkgMilcbiAqIEdldHMgYSBwYXRoIChpZiBhcml0eSAxKVxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykgLy8gcmV0dXJucyBhIFNjaGVtYVR5cGVcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScsIE51bWJlcikgLy8gY2hhbmdlcyB0aGUgc2NoZW1hVHlwZSBvZiBgbmFtZWAgdG8gTnVtYmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICBpZiAob2JqID09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdKSByZXR1cm4gdGhpcy5wYXRoc1twYXRoXTtcbiAgICBpZiAodGhpcy5zdWJwYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMuc3VicGF0aHNbcGF0aF07XG5cbiAgICAvLyBzdWJwYXRocz9cbiAgICByZXR1cm4gL1xcLlxcZCtcXC4/LiokLy50ZXN0KHBhdGgpXG4gICAgICA/IGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHNvbWUgcGF0aCBuYW1lcyBjb25mbGljdCB3aXRoIGRvY3VtZW50IG1ldGhvZHNcbiAgaWYgKHJlc2VydmVkW3BhdGhdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYFwiICsgcGF0aCArIFwiYCBtYXkgbm90IGJlIHVzZWQgYXMgYSBzY2hlbWEgcGF0aG5hbWVcIik7XG4gIH1cblxuICAvLyB1cGRhdGUgdGhlIHRyZWVcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuLylcbiAgICAsIGxhc3QgPSBzdWJwYXRocy5wb3AoKVxuICAgICwgYnJhbmNoID0gdGhpcy50cmVlO1xuXG4gIHN1YnBhdGhzLmZvckVhY2goZnVuY3Rpb24oc3ViLCBpKSB7XG4gICAgaWYgKCFicmFuY2hbc3ViXSkgYnJhbmNoW3N1Yl0gPSB7fTtcbiAgICBpZiAoJ29iamVjdCcgIT0gdHlwZW9mIGJyYW5jaFtzdWJdKSB7XG4gICAgICB2YXIgbXNnID0gJ0Nhbm5vdCBzZXQgbmVzdGVkIHBhdGggYCcgKyBwYXRoICsgJ2AuICdcbiAgICAgICAgICAgICAgKyAnUGFyZW50IHBhdGggYCdcbiAgICAgICAgICAgICAgKyBzdWJwYXRocy5zbGljZSgwLCBpKS5jb25jYXQoW3N1Yl0pLmpvaW4oJy4nKVxuICAgICAgICAgICAgICArICdgIGFscmVhZHkgc2V0IHRvIHR5cGUgJyArIGJyYW5jaFtzdWJdLm5hbWVcbiAgICAgICAgICAgICAgKyAnLic7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG4gICAgYnJhbmNoID0gYnJhbmNoW3N1Yl07XG4gIH0pO1xuXG4gIGJyYW5jaFtsYXN0XSA9IHV0aWxzLmNsb25lKG9iaik7XG5cbiAgdGhpcy5wYXRoc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgb2JqKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHR5cGUgYXJndW1lbnRzIGludG8gU2NoZW1hIFR5cGVzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLmludGVycHJldEFzVHlwZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgdmFyIGNvbnN0cnVjdG9yTmFtZSA9IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmouY29uc3RydWN0b3IpO1xuICBpZiAoY29uc3RydWN0b3JOYW1lICE9ICdPYmplY3QnKXtcbiAgICBvYmogPSB7IHR5cGU6IG9iaiB9O1xuICB9XG5cbiAgLy8gR2V0IHRoZSB0eXBlIG1ha2luZyBzdXJlIHRvIGFsbG93IGtleXMgbmFtZWQgXCJ0eXBlXCJcbiAgLy8gYW5kIGRlZmF1bHQgdG8gbWl4ZWQgaWYgbm90IHNwZWNpZmllZC5cbiAgLy8geyB0eXBlOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2ZyZXNoY3V0JyB9IH1cbiAgdmFyIHR5cGUgPSBvYmoudHlwZSAmJiAhb2JqLnR5cGUudHlwZVxuICAgID8gb2JqLnR5cGVcbiAgICA6IHt9O1xuXG4gIGlmICgnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZS5jb25zdHJ1Y3RvcikgfHwgJ21peGVkJyA9PSB0eXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcbiAgICAvLyBpZiBpdCB3YXMgc3BlY2lmaWVkIHRocm91Z2ggeyB0eXBlIH0gbG9vayBmb3IgYGNhc3RgXG4gICAgdmFyIGNhc3QgPSAoQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpXG4gICAgICA/IG9iai5jYXN0XG4gICAgICA6IHR5cGVbMF07XG5cbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIGNhc3QsIG9iaik7XG4gICAgfVxuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBjYXN0KSB7XG4gICAgICBjYXN0ID0gVHlwZXNbY2FzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhc3Quc3Vic3RyaW5nKDEpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShjYXN0LmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhjYXN0KS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBuZXcgU2NoZW1hKGNhc3QpLCBvYmopO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVHlwZXMuQXJyYXkocGF0aCwgY2FzdCB8fCBUeXBlcy5NaXhlZCwgb2JqKTtcbiAgfVxuXG4gIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIHR5cGVcbiAgICA/IHR5cGVcbiAgICAvLyBJZiBub3Qgc3RyaW5nLCBgdHlwZWAgaXMgYSBmdW5jdGlvbi4gT3V0c2lkZSBvZiBJRSwgZnVuY3Rpb24ubmFtZVxuICAgIC8vIGdpdmVzIHlvdSB0aGUgZnVuY3Rpb24gbmFtZS4gSW4gSUUsIHlvdSBuZWVkIHRvIGNvbXB1dGUgaXRcbiAgICA6IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlKTtcblxuICBpZiAobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09IFR5cGVzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5kZWZpbmVkIHR5cGUgYXQgYCcgKyBwYXRoICtcbiAgICAgICAgJ2BcXG4gIERpZCB5b3UgdHJ5IG5lc3RpbmcgU2NoZW1hcz8gJyArXG4gICAgICAgICdZb3UgY2FuIG9ubHkgbmVzdCB1c2luZyByZWZzIG9yIGFycmF5cy4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgVHlwZXNbbmFtZV0ocGF0aCwgb2JqKTtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhlIHNjaGVtYXMgcGF0aHMgc2ltaWxhciB0byBBcnJheSNmb3JFYWNoLlxuICpcbiAqIFRoZSBjYWxsYmFjayBpcyBwYXNzZWQgdGhlIHBhdGhuYW1lIGFuZCBzY2hlbWFUeXBlIGFzIGFyZ3VtZW50cyBvbiBlYWNoIGl0ZXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybiB7U2NoZW1hfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmVhY2hQYXRoID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBmbihrZXlzW2ldLCB0aGlzLnBhdGhzW2tleXNbaV1dKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIEFycmF5IG9mIHBhdGggc3RyaW5ncyB0aGF0IGFyZSByZXF1aXJlZCBieSB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblNjaGVtYS5wcm90b3R5cGUucmVxdWlyZWRQYXRocyA9IGZ1bmN0aW9uIHJlcXVpcmVkUGF0aHMgKCkge1xuICBpZiAodGhpcy5fcmVxdWlyZWRwYXRocykgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHJldCA9IFtdO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIgcGF0aCA9IHBhdGhzW2ldO1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdLmlzUmVxdWlyZWQpIHJldC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSByZXQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhdGhUeXBlIG9mIGBwYXRoYCBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogR2l2ZW4gYSBwYXRoLCByZXR1cm5zIHdoZXRoZXIgaXQgaXMgYSByZWFsLCB2aXJ0dWFsLCBuZXN0ZWQsIG9yIGFkLWhvYy91bmRlZmluZWQgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoVHlwZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmIChwYXRoIGluIHRoaXMucGF0aHMpIHJldHVybiAncmVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMudmlydHVhbHMpIHJldHVybiAndmlydHVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMubmVzdGVkKSByZXR1cm4gJ25lc3RlZCc7XG4gIGlmIChwYXRoIGluIHRoaXMuc3VicGF0aHMpIHJldHVybiAncmVhbCc7XG5cbiAgaWYgKC9cXC5cXGQrXFwufFxcLlxcZCskLy50ZXN0KHBhdGgpICYmIGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpKSB7XG4gICAgcmV0dXJuICdyZWFsJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ2FkaG9jT3JVbmRlZmluZWQnXG4gIH1cbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGdldFBvc2l0aW9uYWxQYXRoIChzZWxmLCBwYXRoKSB7XG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLihcXGQrKVxcLnxcXC4oXFxkKykkLykuZmlsdGVyKEJvb2xlYW4pO1xuICBpZiAoc3VicGF0aHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBzZWxmLnBhdGhzW3N1YnBhdGhzWzBdXTtcbiAgfVxuXG4gIHZhciB2YWwgPSBzZWxmLnBhdGgoc3VicGF0aHNbMF0pO1xuICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcblxuICB2YXIgbGFzdCA9IHN1YnBhdGhzLmxlbmd0aCAtIDFcbiAgICAsIHN1YnBhdGhcbiAgICAsIGkgPSAxO1xuXG4gIGZvciAoOyBpIDwgc3VicGF0aHMubGVuZ3RoOyArK2kpIHtcbiAgICBzdWJwYXRoID0gc3VicGF0aHNbaV07XG5cbiAgICBpZiAoaSA9PT0gbGFzdCAmJiB2YWwgJiYgIXZhbC5zY2hlbWEgJiYgIS9cXEQvLnRlc3Qoc3VicGF0aCkpIHtcbiAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBUeXBlcy5BcnJheSkge1xuICAgICAgICAvLyBTdHJpbmdTY2hlbWEsIE51bWJlclNjaGVtYSwgZXRjXG4gICAgICAgIHZhbCA9IHZhbC5jYXN0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgaWYgaXRzIGp1c3QgYSBwb3NpdGlvbiBzZWdtZW50OiBwYXRoLjAuc3VicGF0aFxuICAgIGlmICghL1xcRC8udGVzdChzdWJwYXRoKSkgY29udGludWU7XG5cbiAgICBpZiAoISh2YWwgJiYgdmFsLnNjaGVtYSkpIHtcbiAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhbCA9IHZhbC5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzW3BhdGhdID0gdmFsO1xufVxuXG4vKipcbiAqIEFkZHMgYSBtZXRob2QgY2FsbCB0byB0aGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgZG9jdW1lbnQgbWV0aG9kIHRvIGNhbGwgbGF0ZXJcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucXVldWUgPSBmdW5jdGlvbihuYW1lLCBhcmdzKXtcbiAgdGhpcy5jYWxsUXVldWUucHVzaChbbmFtZSwgYXJnc10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHByZSBob29rIGZvciB0aGUgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHRveVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCdzYXZlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB0aGlzLmNyZWF0ZWQgPSBuZXcgRGF0ZTtcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCd2YWxpZGF0ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gKiAgICAgICBpZiAodGhpcy5uYW1lICE9ICdXb29keScpIHRoaXMubmFtZSA9ICdXb29keSc7XG4gKiAgICAgICBuZXh0KCk7XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnByZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdwcmUnLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcG9zdCBmb3IgdGhlIGRvY3VtZW50XG4gKlxuICogUG9zdCBob29rcyBmaXJlIGBvbmAgdGhlIGV2ZW50IGVtaXR0ZWQgZnJvbSBkb2N1bWVudCBpbnN0YW5jZXMgb2YgTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEucG9zdCgnc2F2ZScsIGZ1bmN0aW9uIChkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVkIGFmdGVyIGEgZG9jdW1lbnQgd2FzIHNhdmVkJyk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKCdNb2RlbCcsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBtID0gbmV3IE1vZGVsKC4uKTtcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZXMgYWZ0ZXIgdGhlIGBwb3N0YCBob29rJyk7XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaG9va1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2tcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24obWV0aG9kLCBmbil7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdvbicsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIHBsdWdpbiBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGx1Z2luIGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQHNlZSBwbHVnaW5zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBsdWdpbiA9IGZ1bmN0aW9uIChmbiwgb3B0cykge1xuICBmbih0aGlzLCBvcHRzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gaW5zdGFuY2UgbWV0aG9kIHRvIGRvY3VtZW50cyBjb25zdHJ1Y3RlZCBmcm9tIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBraXR0eVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKCdtZW93JywgZnVuY3Rpb24gKCkge1xuICogICAgICAgY29uc29sZS5sb2coJ21lZWVlZW9vb29vb29vb29vb3cnKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgS2l0dHkgPSBtb25nb29zZS5tb2RlbCgnS2l0dHknLCBzY2hlbWEpO1xuICpcbiAqICAgICB2YXIgZml6eiA9IG5ldyBLaXR0eTtcbiAqICAgICBmaXp6Lm1lb3coKTsgLy8gbWVlZWVlb29vb29vb29vb29vb3dcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgbWV0aG9kcy5cbiAqXG4gKiAgICAgc2NoZW1hLm1ldGhvZCh7XG4gKiAgICAgICAgIHB1cnI6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgICAsIHNjcmF0Y2g6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGxhdGVyXG4gKiAgICAgZml6ei5wdXJyKCk7XG4gKiAgICAgZml6ei5zY3JhdGNoKCk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBtZXRob2QgbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMubWV0aG9kc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLm1ldGhvZHNbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgc3RhdGljIFwiY2xhc3NcIiBtZXRob2RzIHRvIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEuc3RhdGljKCdmaW5kQnlOYW1lJywgZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5maW5kKHsgbmFtZTogbmFtZSB9LCBjYWxsYmFjayk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBEcmluayA9IG1vbmdvb3NlLm1vZGVsKCdEcmluaycsIHNjaGVtYSk7XG4gKiAgICAgRHJpbmsuZmluZEJ5TmFtZSgnc2FucGVsbGVncmlubycsIGZ1bmN0aW9uIChlcnIsIGRyaW5rcykge1xuICogICAgICAgLy9cbiAqICAgICB9KTtcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgc3RhdGljcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuc3RhdGljID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLnN0YXRpY3NbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMvZ2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gaWYgbm90IHBhc3NlZCwgdGhlIGN1cnJlbnQgb3B0aW9uIHZhbHVlIGlzIHJldHVybmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zW2tleV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbCA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciB2aXJ0dWFscyA9IHRoaXMudmlydHVhbHM7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgcmV0dXJuIHZpcnR1YWxzW25hbWVdID0gcGFydHMucmVkdWNlKGZ1bmN0aW9uIChtZW0sIHBhcnQsIGkpIHtcbiAgICBtZW1bcGFydF0gfHwgKG1lbVtwYXJ0XSA9IChpID09PSBwYXJ0cy5sZW5ndGgtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDoge30pO1xuICAgIHJldHVybiBtZW1bcGFydF07XG4gIH0sIHRoaXMudHJlZSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbHBhdGggPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gdGhpcy52aXJ0dWFsc1tuYW1lXTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHByb3BlcnR5IGRpc2NyaW1pbmF0b3JzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuZGlzY3JpbWluYXRvcnM7XG5cbi8qKlxuICog0J3QsNGB0LvQtdC00L7QstCw0L3QuNC1INC+0YIg0YHRhdC10LzRiy5cbiAqIHRoaXMgLSDQsdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwISEhXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAgdmFyIFBlcnNvblNjaGVtYSA9IG5ldyBTY2hlbWEoJ1BlcnNvbicsIHtcbiAqICAgICAgIG5hbWU6IFN0cmluZyxcbiAqICAgICAgIGNyZWF0ZWRBdDogRGF0ZVxuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgQm9zc1NjaGVtYSA9IG5ldyBTY2hlbWEoJ0Jvc3MnLCBQZXJzb25TY2hlbWEsIHsgZGVwYXJ0bWVudDogU3RyaW5nIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgZGlzY3JpbWluYXRvciBuYW1lXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIGRpc2NyaW1pbmF0b3Igc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmRpc2NyaW1pbmF0b3IgPSBmdW5jdGlvbiBkaXNjcmltaW5hdG9yIChuYW1lLCBzY2hlbWEpIHtcbiAgaWYgKCEoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHBhc3MgYSB2YWxpZCBkaXNjcmltaW5hdG9yIFNjaGVtYVwiKTtcbiAgfVxuXG4gIGlmICggdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyAmJiAhdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3QgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGNhbiBvbmx5IGJlIGEgZGlzY3JpbWluYXRvciBvZiB0aGUgcm9vdCBtb2RlbFwiKTtcbiAgfVxuXG4gIHZhciBrZXkgPSB0aGlzLm9wdGlvbnMuZGlzY3JpbWluYXRvcktleTtcbiAgaWYgKCBzY2hlbWEucGF0aChrZXkpICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW5ub3QgaGF2ZSBmaWVsZCB3aXRoIG5hbWUgXFxcIlwiICsga2V5ICsgXCJcXFwiXCIpO1xuICB9XG5cbiAgLy8gbWVyZ2VzIGJhc2Ugc2NoZW1hIGludG8gbmV3IGRpc2NyaW1pbmF0b3Igc2NoZW1hIGFuZCBzZXRzIG5ldyB0eXBlIGZpZWxkLlxuICAoZnVuY3Rpb24gbWVyZ2VTY2hlbWFzKHNjaGVtYSwgYmFzZVNjaGVtYSkge1xuICAgIHV0aWxzLm1lcmdlKHNjaGVtYSwgYmFzZVNjaGVtYSk7XG5cbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW2tleV0gPSB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogbmFtZSB9O1xuICAgIHNjaGVtYS5hZGQob2JqKTtcbiAgICBzY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbmFtZSwgaXNSb290OiBmYWxzZSB9O1xuXG4gICAgaWYgKGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBzY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uID0gYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgICAvLyB0aHJvd3MgZXJyb3IgaWYgb3B0aW9ucyBhcmUgaW52YWxpZFxuICAgIChmdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbnMoYSwgYikge1xuICAgICAgYSA9IHV0aWxzLmNsb25lKGEpO1xuICAgICAgYiA9IHV0aWxzLmNsb25lKGIpO1xuICAgICAgZGVsZXRlIGEudG9KU09OO1xuICAgICAgZGVsZXRlIGEudG9PYmplY3Q7XG4gICAgICBkZWxldGUgYi50b0pTT047XG4gICAgICBkZWxldGUgYi50b09iamVjdDtcblxuICAgICAgaWYgKCF1dGlscy5kZWVwRXF1YWwoYSwgYikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpXCIpO1xuICAgICAgfVxuICAgIH0pKHNjaGVtYS5vcHRpb25zLCBiYXNlU2NoZW1hLm9wdGlvbnMpO1xuXG4gICAgdmFyIHRvSlNPTiA9IHNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgLCB0b09iamVjdCA9IHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuXG4gICAgc2NoZW1hLm9wdGlvbnMgPSB1dGlscy5jbG9uZShiYXNlU2NoZW1hLm9wdGlvbnMpO1xuICAgIGlmICh0b0pTT04pICAgc2NoZW1hLm9wdGlvbnMudG9KU09OID0gdG9KU09OO1xuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcblxuICAgIC8vc2NoZW1hLmNhbGxRdWV1ZSA9IGJhc2VTY2hlbWEuY2FsbFF1ZXVlLmNvbmNhdChzY2hlbWEuY2FsbFF1ZXVlKTtcbiAgICBzY2hlbWEuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7IC8vIHJlc2V0IGp1c3QgaW4gY2FzZSBTY2hlbWEjcmVxdWlyZWRQYXRocygpIHdhcyBjYWxsZWQgb24gZWl0aGVyIHNjaGVtYVxuICB9KShzY2hlbWEsIHRoaXMpO1xuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9ycykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvcnMgPSB7fTtcbiAgfVxuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbnVsbCwgaXNSb290OiB0cnVlIH07XG4gIH1cblxuICBpZiAodGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3Igd2l0aCBuYW1lIFxcXCJcIiArIG5hbWUgKyBcIlxcXCIgYWxyZWFkeSBleGlzdHNcIik7XG4gIH1cblxuICB0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdID0gc2NoZW1hO1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWE7XG53aW5kb3cuU2NoZW1hID0gU2NoZW1hO1xuXG4vLyByZXF1aXJlIGRvd24gaGVyZSBiZWNhdXNlIG9mIHJlZmVyZW5jZSBpc3N1ZXNcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBidWlsdC1pbiBTdG9yYWdlIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQ7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW1N0cmluZ10oI3NjaGVtYS1zdHJpbmctanMpXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxuICogLSBbQm9vbGVhbl0oI3NjaGVtYS1ib29sZWFuLWpzKSB8IEJvb2xcbiAqIC0gW0FycmF5XSgjc2NoZW1hLWFycmF5LWpzKVxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxuICogLSBbT2JqZWN0SWRdKCNzY2hlbWEtb2JqZWN0aWQtanMpIHwgT2lkXG4gKiAtIFtNaXhlZF0oI3NjaGVtYS1taXhlZC1qcykgfCBPYmplY3RcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgTWl4ZWRgIFNjaGVtYVR5cGUsIHdlIGNhbiB1c2UgdGhlbSBpbiBvdXIgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XG4gKiAgICAgbmV3IG1vbmdvb3NlLlNjaGVtYSh7IF91c2VyOiBNaXhlZCB9KVxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5UeXBlcyA9IHJlcXVpcmUoJy4vc2NoZW1hL2luZGV4Jyk7XG5cbi8vINCl0YDQsNC90LjQu9C40YnQtSDRgdGF0LXQvFxuU2NoZW1hLnNjaGVtYXMgPSBzY2hlbWFzID0ge307XG5cblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcbnZhciBPYmplY3RJZCA9IFNjaGVtYS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBUeXBlcyA9IHtcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcbiAgICAgICwgRGF0ZTogcmVxdWlyZSgnLi9kYXRlJylcbiAgICAgICwgTnVtYmVyOiByZXF1aXJlKCcuL251bWJlcicpXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxuICAgICAgLCBPYmplY3RJZDogcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICAgfVxuICAsIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2FycmF5JylcbiAgLCBNaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIEVtYmVkZGVkRG9jO1xuXG4vKipcbiAqIEFycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYVR5cGV9IGNhc3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYUFycmF5IChrZXksIGNhc3QsIG9wdGlvbnMpIHtcbiAgaWYgKGNhc3QpIHtcbiAgICB2YXIgY2FzdE9wdGlvbnMgPSB7fTtcblxuICAgIGlmICgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBjYXN0LmNvbnN0cnVjdG9yICkgKSB7XG4gICAgICBpZiAoY2FzdC50eXBlKSB7XG4gICAgICAgIC8vIHN1cHBvcnQgeyB0eXBlOiBXb290IH1cbiAgICAgICAgY2FzdE9wdGlvbnMgPSBfLmNsb25lKCBjYXN0ICk7IC8vIGRvIG5vdCBhbHRlciB1c2VyIGFyZ3VtZW50c1xuICAgICAgICBkZWxldGUgY2FzdE9wdGlvbnMudHlwZTtcbiAgICAgICAgY2FzdCA9IGNhc3QudHlwZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhc3QgPSBNaXhlZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IHsgdHlwZTogJ1N0cmluZycgfVxuICAgIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIGNhc3RcbiAgICAgID8gY2FzdFxuICAgICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QgKTtcblxuICAgIHZhciBjYXN0ZXIgPSBuYW1lIGluIFR5cGVzXG4gICAgICA/IFR5cGVzW25hbWVdXG4gICAgICA6IGNhc3Q7XG5cbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gY2FzdGVyO1xuICAgIHRoaXMuY2FzdGVyID0gbmV3IGNhc3RlcihudWxsLCBjYXN0T3B0aW9ucyk7XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBFbWJlZGRlZERvYyB8fCAoRW1iZWRkZWREb2MgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpKTtcblxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XG4gICAgICB0aGlzLmNhc3Rlci5wYXRoID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xuXG4gIHZhciBzZWxmID0gdGhpc1xuICAgICwgZGVmYXVsdEFyclxuICAgICwgZm47XG5cbiAgaWYgKHRoaXMuZGVmYXVsdFZhbHVlKSB7XG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuICAgIGZuID0gJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGVmYXVsdEFycjtcbiAgfVxuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbiA/IGRlZmF1bHRBcnIoKSA6IGRlZmF1bHRBcnIgfHwgW107XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlQXJyYXkoYXJyLCBzZWxmLnBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblNjaGVtYUFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUFycmF5O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGVzIHRoZSBnZXR0ZXJzIGFwcGxpY2F0aW9uIGZvciB0aGUgcG9wdWxhdGlvbiBzcGVjaWFsLWNhc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIGlmICh0aGlzLmNhc3Rlci5vcHRpb25zICYmIHRoaXMuY2FzdGVyLm9wdGlvbnMucmVmKSB7XG4gICAgLy8gbWVhbnMgdGhlIG9iamVjdCBpZCB3YXMgcG9wdWxhdGVkXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIFNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycy5jYWxsKHRoaXMsIHZhbHVlLCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIHZhbHVlcyBmb3Igc2V0KCkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0IHdoZXRoZXIgdGhpcyBpcyBhbiBpbml0aWFsaXphdGlvbiBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQgKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmICghKHZhbHVlLmlzU3RvcmFnZUFycmF5KSkge1xuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FzdGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhbHVlW2ldID0gdGhpcy5jYXN0ZXIuY2FzdCh2YWx1ZVtpXSwgZG9jLCBpbml0KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyByZXRocm93XG4gICAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoZS50eXBlLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQpO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogQm9vbGVhbiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBwYXRoLCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9vbGVhblNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG52YXIgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3I7XG5cbi8qKlxuICogRGF0ZSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEYXRlU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgZGF0ZVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIERhdGU7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGRhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJylcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICB2YXIgZGF0ZTtcblxuICAvLyBzdXBwb3J0IGZvciB0aW1lc3RhbXBzXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSlcbiAgICBkYXRlID0gbmV3IERhdGUoTnVtYmVyKHZhbHVlKSk7XG5cbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXG4gIGVsc2UgaWYgKHZhbHVlLnRvU3RyaW5nKVxuICAgIGRhdGUgPSBuZXcgRGF0ZSh2YWx1ZS50b1N0cmluZygpKTtcblxuICBpZiAoZGF0ZS50b1N0cmluZygpICE9ICdJbnZhbGlkIERhdGUnKVxuICAgIHJldHVybiBkYXRlO1xuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ2RhdGUnLCB2YWx1ZSwgdGhpcy5wYXRoICk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVNjaGVtYTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQXJyYXlUeXBlID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgU3RvcmFnZURvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9kb2N1bWVudGFycmF5JylcbiAgLCBTdWJkb2N1bWVudCA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaiBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbal0gPSBzY2hlbWEuc3RhdGljc1tqXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50QXJyYXk7XG5cbi8qKlxuICogUGVyZm9ybXMgbG9jYWwgdmFsaWRhdGlvbnMgZmlyc3QsIHRoZW4gdmFsaWRhdGlvbnMgb24gZWFjaCBlbWJlZGRlZCBkb2NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgZm4sIHNjb3BlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBTY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlLmNhbGwodGhpcywgYXJyYXksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcblxuICAgIHZhciBjb3VudCA9IGFycmF5ICYmIGFycmF5Lmxlbmd0aFxuICAgICAgLCBlcnJvcjtcblxuICAgIGlmICghY291bnQpIHJldHVybiBmbigpO1xuXG4gICAgLy8gaGFuZGxlIHNwYXJzZSBhcnJheXMsIGRvIG5vdCB1c2UgYXJyYXkuZm9yRWFjaCB3aGljaCBkb2VzIG5vdFxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzcGFyc2UgZWxlbWVudHMgeWV0IHJlcG9ydHMgYXJyYXkubGVuZ3RoIGluY2x1ZGluZ1xuICAgIC8vIHRoZW0gOihcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgIShmdW5jdGlvbiAoaSkge1xuICAgICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XG4gICAgICAgICAgICAvLyByZXdyaXRlIHRoZSBrZXlcbiAgICAgICAgICAgIGVyci5rZXkgPSBzZWxmLmtleSArICcuJyArIGkgKyAnLicgKyBlcnIua2V5O1xuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKGkpO1xuICAgIH1cbiAgfSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyBjb250ZW50c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCBmbGFnXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jLCBpbml0LCBwcmV2KSB7XG4gIHZhciBzZWxlY3RlZFxuICAgICwgc3ViZG9jXG4gICAgLCBpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCwgcHJldik7XG4gIH1cblxuICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VEb2N1bWVudEFycmF5KSkge1xuICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgaWYgKHByZXYgJiYgcHJldi5faGFuZGxlcnMpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgICBkb2Mub2ZmKGtleSwgcHJldi5faGFuZGxlcnNba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaSA9IHZhbHVlLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKCEodmFsdWVbaV0gaW5zdGFuY2VvZiBTdWJkb2N1bWVudCkgJiYgdmFsdWVbaV0pIHtcbiAgICAgIGlmIChpbml0KSB7XG4gICAgICAgIHNlbGVjdGVkIHx8IChzZWxlY3RlZCA9IHNjb3BlUGF0aHModGhpcywgZG9jLiRfXy5zZWxlY3RlZCwgaW5pdCkpO1xuICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3RvcihudWxsLCB2YWx1ZSwgdHJ1ZSwgc2VsZWN0ZWQpO1xuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYy5pbml0KHZhbHVlW2ldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3ViZG9jID0gcHJldi5pZCh2YWx1ZVtpXS5faWQpO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICAgICAgaWYgKHByZXYgJiYgc3ViZG9jKSB7XG4gICAgICAgICAgLy8gaGFuZGxlIHJlc2V0dGluZyBkb2Mgd2l0aCBleGlzdGluZyBpZCBidXQgZGlmZmVyaW5nIGRhdGFcbiAgICAgICAgICAvLyBkb2MuYXJyYXkgPSBbeyBkb2M6ICd2YWwnIH1dXG4gICAgICAgICAgc3ViZG9jLnNldCh2YWx1ZVtpXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3ViZG9jID0gbmV3IHRoaXMuY2FzdGVyQ29uc3RydWN0b3IodmFsdWVbaV0sIHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHNldCgpIGlzIGhvb2tlZCBpdCB3aWxsIGhhdmUgbm8gcmV0dXJuIHZhbHVlXG4gICAgICAgIC8vIHNlZSBnaC03NDZcbiAgICAgICAgdmFsdWVbaV0gPSBzdWJkb2M7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiBTY29wZXMgcGF0aHMgc2VsZWN0ZWQgaW4gYSBxdWVyeSB0byB0aGlzIGFycmF5LlxuICogTmVjZXNzYXJ5IGZvciBwcm9wZXIgZGVmYXVsdCBhcHBsaWNhdGlvbiBvZiBzdWJkb2N1bWVudCB2YWx1ZXMuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudEFycmF5fSBhcnJheSAtIHRoZSBhcnJheSB0byBzY29wZSBgZmllbGRzYCBwYXRoc1xuICogQHBhcmFtIHtPYmplY3R8dW5kZWZpbmVkfSBmaWVsZHMgLSB0aGUgcm9vdCBmaWVsZHMgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5XG4gKiBAcGFyYW0ge0Jvb2xlYW58dW5kZWZpbmVkfSBpbml0IC0gaWYgd2UgYXJlIGJlaW5nIGNyZWF0ZWQgcGFydCBvZiBhIHF1ZXJ5IHJlc3VsdFxuICovXG5mdW5jdGlvbiBzY29wZVBhdGhzIChhcnJheSwgZmllbGRzLCBpbml0KSB7XG4gIGlmICghKGluaXQgJiYgZmllbGRzKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICB2YXIgcGF0aCA9IGFycmF5LnBhdGggKyAnLidcbiAgICAsIGtleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIHNlbGVjdGVkID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoMCA9PT0ga2V5LmluZGV4T2YocGF0aCkpIHtcbiAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcbiAgICAgIHNlbGVjdGVkW2tleS5zdWJzdHJpbmcocGF0aC5sZW5ndGgpXSA9IGZpZWxkc1trZXldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoYXNLZXlzICYmIHNlbGVjdGVkIHx8IHVuZGVmaW5lZDtcbn1cblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50QXJyYXk7XG4iLCJcbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5TdHJpbmcgPSByZXF1aXJlKCcuL3N0cmluZycpO1xuXG5leHBvcnRzLk51bWJlciA9IHJlcXVpcmUoJy4vbnVtYmVyJyk7XG5cbmV4cG9ydHMuQm9vbGVhbiA9IHJlcXVpcmUoJy4vYm9vbGVhbicpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxuZXhwb3J0cy5EYXRlID0gcmVxdWlyZSgnLi9kYXRlJyk7XG5cbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG5cbmV4cG9ydHMuTWl4ZWQgPSByZXF1aXJlKCcuL21peGVkJyk7XG5cbi8vIGFsaWFzXG5cbmV4cG9ydHMuT2lkID0gZXhwb3J0cy5PYmplY3RJZDtcbmV4cG9ydHMuT2JqZWN0ID0gZXhwb3J0cy5NaXhlZDtcbmV4cG9ydHMuQm9vbCA9IGV4cG9ydHMuQm9vbGVhbjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBNaXhlZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBNaXhlZCAocGF0aCwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHQpIHtcbiAgICB2YXIgZGVmID0gb3B0aW9ucy5kZWZhdWx0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRlZikgJiYgMCA9PT0gZGVmLmxlbmd0aCkge1xuICAgICAgLy8gbWFrZSBzdXJlIGVtcHR5IGFycmF5IGRlZmF1bHRzIGFyZSBoYW5kbGVkXG4gICAgICBvcHRpb25zLmRlZmF1bHQgPSBBcnJheTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNoYXJlZCAmJlxuICAgICAgICAgICAgICAgXy5pc1BsYWluT2JqZWN0KGRlZikgJiZcbiAgICAgICAgICAgICAgIDAgPT09IE9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSB7XG4gICAgICAvLyBwcmV2ZW50IG9kZCBcInNoYXJlZFwiIG9iamVjdHMgYmV0d2VlbiBkb2N1bWVudHNcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTWl4ZWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk1peGVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1peGVkO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICh2YWwgIT09IHVuZGVmaW5lZCkgJiYgKHZhbCAhPT0gbnVsbCk7XG59O1xuXG4vKipcbiAqIENhc3RzIGB2YWxgIGZvciBNaXhlZC5cbiAqXG4gKiBfdGhpcyBpcyBhIG5vLW9wX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTWl4ZWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGVkO1xuIiwiLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlcztcblxuLyoqXG4gKiBOdW1iZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBOdW1iZXJTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnTnVtYmVyJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJTY2hlbWE7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yIGZvciBudW1iZXJcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyO1xuICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSBtaW5pbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDkgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNSU59IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtaW4gPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKHtNSU59KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IG1pbiB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1pbmltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5taW4gPSBmdW5jdGlvbiAodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMubWluVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5taW5WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1pbjtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01JTn0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWluVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPj0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWluJ10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgYSBtYXhpbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDExIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUFYfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWF4ID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGV4Y2VlZHMgdGhlIGxpbWl0ICh7TUFYfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiBtYXggfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgZXhjZWVkcyB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtYXhpbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1heFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWF4O1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUFYfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5tYXhWYWxpZGF0b3IgPSBmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPD0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWF4J10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIG51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIHZhbCA9IHZhbHVlICYmIHZhbHVlLl9pZFxuICAgID8gdmFsdWUuX2lkIC8vIGRvY3VtZW50c1xuICAgIDogdmFsdWU7XG5cbiAgaWYgKCFpc05hTih2YWwpKXtcbiAgICBpZiAobnVsbCA9PT0gdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICgnJyA9PT0gdmFsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIHZhbDtcbiAgICBpZiAoJ251bWJlcicgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAodmFsLnRvU3RyaW5nICYmICFBcnJheS5pc0FycmF5KHZhbCkgJiZcbiAgICAgICAgdmFsLnRvU3RyaW5nKCkgPT0gTnVtYmVyKHZhbCkpIHtcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyKHZhbCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignbnVtYmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyU2NoZW1hO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBvaWQgPSByZXF1aXJlKCcuLi90eXBlcy9vYmplY3RpZCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG4gICwgRG9jdW1lbnQ7XG5cbi8qKlxuICogT2JqZWN0SWQgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIE9iamVjdElkIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ09iamVjdElkJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuT2JqZWN0SWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0SWQ7XG5cbi8qKlxuICogQWRkcyBhbiBhdXRvLWdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0IGlmIHR1cm5PbiBpcyB0cnVlLlxuICogQHBhcmFtIHtCb29sZWFufSB0dXJuT24gYXV0byBnZW5lcmF0ZWQgT2JqZWN0SWQgZGVmYXVsdHNcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5hdXRvID0gZnVuY3Rpb24gKCB0dXJuT24gKSB7XG4gIGlmICggdHVybk9uICkge1xuICAgIHRoaXMuZGVmYXVsdCggZGVmYXVsdElkICk7XG4gICAgdGhpcy5zZXQoIHJlc2V0SWQgKVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2Ygb2lkO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkge1xuICAgIC8vIHdhaXQhIHdlIG1heSBuZWVkIHRvIGNhc3QgdGhpcyB0byBhIGRvY3VtZW50XG5cbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIGxhenkgbG9hZFxuICAgIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vLi4vZG9jdW1lbnQnKSk7XG5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgdmFsdWUuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gc2V0dGluZyBhIHBvcHVsYXRlZCBwYXRoXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2Ygb2lkICkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gZWxzZSBpZiAoICFfLmlzUGxhaW5PYmplY3QoIHZhbHVlICkgKSB7XG4gICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xuICAgIH1cblxuICAgIC8vINCd0YPQttC90L4g0YHQvtC30LTQsNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQv9C+INGB0YXQtdC80LUsINGD0LrQsNC30LDQvdC90L7QuSDQsiDRgdGB0YvQu9C60LVcbiAgICB2YXIgc2NoZW1hID0gdGhpcy5vcHRpb25zLnJlZjtcbiAgICBpZiAoICFzY2hlbWEgKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9Cf0YDQuCDRgdGB0YvQu9C60LUgKHJlZikg0L3QsCDQtNC+0LrRg9C80LXQvdGCICcgK1xuICAgICAgICAn0L3Rg9C20L3QviDRg9C60LDQt9GL0LLQsNGC0Ywg0YHRhdC10LzRgywg0L/QviDQutC+0YLQvtGA0L7QuSDRjdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGB0L7Qt9C00LDQstCw0YLRjCcpO1xuICAgIH1cblxuICAgIGlmICggIXN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0gKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9Cf0YDQuCDRgdGB0YvQu9C60LUgKHJlZikg0L3QsCDQtNC+0LrRg9C80LXQvdGCICcgK1xuICAgICAgICAn0L3Rg9C20L3QviDRg9C60LDQt9GL0LLQsNGC0Ywg0L3QsNC30LLQsNC90LjQtSDRgdGF0LXQvNGLINC90LAg0LrQvtGC0L7RgNGD0Y4g0YHRgdGL0LvQsNC10LzRgdGPINC/0YDQuCDQtdGRINGB0L7Qt9C00LDQvdC40LggKCBuZXcgU2NoZW1hKFwibmFtZVwiLCBzY2hlbWFPYmplY3QpICknKTtcbiAgICB9XG5cbiAgICAvLyBpbml0IGRvY1xuICAgIHZhciBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0sIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgIGRvYy4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcblxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiB2YWx1ZTtcblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQpXG4gICAgcmV0dXJuIHZhbHVlO1xuXG4gIGlmICggdmFsdWUuX2lkICYmIHZhbHVlLl9pZCBpbnN0YW5jZW9mIG9pZCApXG4gICAgcmV0dXJuIHZhbHVlLl9pZDtcblxuICBpZiAodmFsdWUudG9TdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG9pZC5jcmVhdGVGcm9tSGV4U3RyaW5nKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdElkICgpIHtcbiAgcmV0dXJuIG5ldyBvaWQoKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRJZCAodikge1xuICB0aGlzLiRfXy5faWQgPSBudWxsO1xuICByZXR1cm4gdjtcbn1cblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlcztcblxuLyoqXG4gKiBTdHJpbmcgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFN0cmluZ1NjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIHRoaXMuZW51bVZhbHVlcyA9IFtdO1xuICB0aGlzLnJlZ0V4cCA9IG51bGw7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdTdHJpbmcnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0cmluZ1NjaGVtYTtcblxuLyoqXG4gKiBBZGRzIGFuIGVudW0gdmFsaWRhdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzdGF0ZXMgPSAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBzdGF0ZXMgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBgaW52YWxpZGAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBgc3RhdGVgLlxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICB2YXIgZW51ID0ge1xuICogICAgICAgdmFsdWVzOiAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpLFxuICogICAgICAgbWVzc2FnZTogJ2VudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YCdcbiAqICAgICB9XG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBlbnUgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGVudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBgc3RhdGVgIHdpdGggdmFsdWUgYGludmFsaWRgXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gW2FyZ3MuLi5dIGVudW1lcmF0aW9uIHZhbHVlc1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuZW51bSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZW51bVZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLmVudW1WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZmFsc2U7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0gfHwgZmFsc2UgPT09IGFyZ3VtZW50c1swXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbHVlcztcbiAgdmFyIGVycm9yTWVzc2FnZTtcblxuICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZ3VtZW50c1swXSkpIHtcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHNbMF0udmFsdWVzO1xuICAgIGVycm9yTWVzc2FnZSA9IGFyZ3VtZW50c1swXS5tZXNzYWdlO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLlN0cmluZy5lbnVtO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZXNbaV0pIHtcbiAgICAgIHRoaXMuZW51bVZhbHVlcy5wdXNoKHRoaXMuY2FzdCh2YWx1ZXNbaV0pKTtcbiAgICB9XG4gIH1cblxuICB2YXIgdmFscyA9IHRoaXMuZW51bVZhbHVlcztcbiAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2IHx8IH52YWxzLmluZGV4T2Yodik7XG4gIH07XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLmVudW1WYWxpZGF0b3IsIGVycm9yTWVzc2FnZSwgJ2VudW0nXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBsb3dlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGVtYWlsOiAnU29tZUVtYWlsQGV4YW1wbGUuQ09NJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmVtYWlsKSAvLyBzb21lZW1haWxAZXhhbXBsZS5jb21cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiB2O1xuICB9KTtcbn07XG5cbi8qKlxuICogQWRkcyBhbiB1cHBlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBjYXBzOiB7IHR5cGU6IFN0cmluZywgdXBwZXJjYXNlOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgY2FwczogJ2FuIGV4YW1wbGUnIH0pO1xuICogICAgIGNvbnNvbGUubG9nKG0uY2FwcykgLy8gQU4gRVhBTVBMRVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudXBwZXJjYXNlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvVXBwZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdHJpbSBzZXR0ZXIuXG4gKlxuICogVGhlIHN0cmluZyB2YWx1ZSB3aWxsIGJlIHRyaW1tZWQgd2hlbiBzZXQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB0cmltOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBzdHJpbmcgPSAnIHNvbWUgbmFtZSAnXG4gKiAgICAgY29uc29sZS5sb2coc3RyaW5nLmxlbmd0aCkgLy8gMTFcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogc3RyaW5nIH0pXG4gKiAgICAgY29uc29sZS5sb2cobS5uYW1lLmxlbmd0aCkgLy8gOVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudHJpbSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50cmltKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmVnZXhwIHZhbGlkYXRvci5cbiAqXG4gKiBBbnkgdmFsdWUgdGhhdCBkb2VzIG5vdCBwYXNzIGByZWdFeHBgLnRlc3QodmFsKSB3aWxsIGZhaWwgdmFsaWRhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiAnSSBhbSBpbnZhbGlkJyB9KVxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFBhdGggYG5hbWVgIGlzIGludmFsaWQgKEkgYW0gaW52YWxpZCkuXCJcbiAqICAgICAgIG0ubmFtZSA9ICdhcHBsZXMnXG4gKiAgICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICAgYXNzZXJ0Lm9rKGVycikgLy8gc3VjY2Vzc1xuICogICAgICAgfSlcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyB1c2luZyBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiAgICAgdmFyIG1hdGNoID0gWyAvXFwuaHRtbCQvLCBcIlRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoe1ZBTFVFfSlcIiBdO1xuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGZpbGU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogbWF0Y2ggfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBmaWxlOiAnaW52YWxpZCcgfSk7XG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoaW52YWxpZClcIlxuICogICAgIH0pXG4gKlxuICogRW1wdHkgc3RyaW5ncywgYHVuZGVmaW5lZGAsIGFuZCBgbnVsbGAgdmFsdWVzIGFsd2F5cyBwYXNzIHRoZSBtYXRjaCB2YWxpZGF0b3IuIElmIHlvdSByZXF1aXJlIHRoZXNlIHZhbHVlcywgZW5hYmxlIHRoZSBgcmVxdWlyZWRgIHZhbGlkYXRvciBhbHNvLlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8sIHJlcXVpcmVkOiB0cnVlIH19KVxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSByZWdFeHAgcmVndWxhciBleHByZXNzaW9uIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXG4gICAgICA6IHRydWVcbiAgfVxuXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFttYXRjaFZhbGlkYXRvciwgbXNnLCAncmVnZXhwJ10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiBjaGVja1JlcXVpcmVkICh2YWx1ZSwgZG9jKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAodmFsdWUgaW5zdGFuY2VvZiBTdHJpbmcgfHwgdHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSAmJiB2YWx1ZS5sZW5ndGg7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gU3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggdmFsdWUgPT09IG51bGwgKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAvLyBoYW5kbGUgZG9jdW1lbnRzIGJlaW5nIHBhc3NlZFxuICAgIGlmICh2YWx1ZS5faWQgJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlLl9pZCkge1xuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcbiAgICB9XG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVycm9yTWVzc2FnZXMgPSBlcnJvci5tZXNzYWdlcztcbnZhciBDYXN0RXJyb3IgPSBlcnJvci5DYXN0RXJyb3I7XG52YXIgVmFsaWRhdG9yRXJyb3IgPSBlcnJvci5WYWxpZGF0b3JFcnJvcjtcblxuLyoqXG4gKiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7U3RyaW5nfSBbaW5zdGFuY2VdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFNjaGVtYVR5cGUgKHBhdGgsIG9wdGlvbnMsIGluc3RhbmNlKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcbiAgdGhpcy52YWxpZGF0b3JzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLmdldHRlcnMgPSBbXTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIGlmICh0aGlzW2ldICYmICdmdW5jdGlvbicgPT0gdHlwZW9mIHRoaXNbaV0pIHtcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcbiAgICAgID8gb3B0aW9uc1tpXVxuICAgICAgOiBbb3B0aW9uc1tpXV07XG5cbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxuICpcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxuICpcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4ge307XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XG4gKiAgICAgdmFyIG0xID0gbmV3IE07XG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKiAgICAgdmFyIG0yID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyB2YWxcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXG4gKlxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cbiAqXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIFN0b3JhZ2Ugc2V0dGVyLlxuICpcbiAqICAgICBmdW5jdGlvbiB0b0xvd2VyICh2KSB7XG4gKiAgICAgICByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFVzZXJTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGVtYWlsOiB7IHR5cGU6IFN0cmluZywgc2V0OiB0b0xvd2VyIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVXNlciA9IGRiLm1vZGVsKCdVc2VyJywgVXNlclNjaGVtYSlcbiAqXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlcih7ZW1haWw6ICdBVkVOVUVAUS5DT00nfSlcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKTsgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiAgICAgLy8gb3JcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyXG4gKiAgICAgdXNlci5lbWFpbCA9ICdBdmVudWVAUS5jb20nXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCkgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiBBcyB5b3UgY2FuIHNlZSBhYm92ZSwgc2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBfTk9URTogd2UgY291bGQgaGF2ZSBhbHNvIGp1c3QgdXNlZCB0aGUgYnVpbHQtaW4gYGxvd2VyY2FzZTogdHJ1ZWAgU2NoZW1hVHlwZSBvcHRpb24gaW5zdGVhZCBvZiBkZWZpbmluZyBvdXIgb3duIGZ1bmN0aW9uLl9cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxuICpcbiAqIFNldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgc2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cbiAqXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbDtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBzZXQ6IGluc3BlY3RvciB9LFxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGluc3BlY3RvciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xuICogICAgIHZhciB2ID0gbmV3IFZpcnVzKHsgbmFtZTogJ1BhcnZvdmlyaWRhZScsIHRheG9ub215OiAnUGFydm92aXJpbmFlJyB9KTtcbiAqXG4gKiAgICAgY29uc29sZS5sb2codi5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICBjb25zb2xlLmxvZyh2LnRheG9ub215KTsgLy8gUGFydm92aXJpbmFlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBzZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgZ2V0dGVyIHRvIHRoaXMgc2NoZW1hdHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZnVuY3Rpb24gZG9iICh2YWwpIHtcbiAqICAgICAgIGlmICghdmFsKSByZXR1cm4gdmFsO1xuICogICAgICAgcmV0dXJuICh2YWwuZ2V0TW9udGgoKSArIDEpICsgXCIvXCIgKyB2YWwuZ2V0RGF0ZSgpICsgXCIvXCIgKyB2YWwuZ2V0RnVsbFllYXIoKTtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIGRlZmluaW5nIHdpdGhpbiB0aGUgc2NoZW1hXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCBnZXQ6IGRvYiB9KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogRGF0ZSB9KVxuICogICAgIHMucGF0aCgnYm9ybicpLmdldChkb2IpXG4gKlxuICogR2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBhcyBpdCB0cmF2ZWxzIGZyb20gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IHRvIHRoZSB2YWx1ZSB0aGF0IHlvdSBzZWUuXG4gKlxuICogU3VwcG9zZSB5b3UgYXJlIHN0b3JpbmcgY3JlZGl0IGNhcmQgbnVtYmVycyBhbmQgeW91IHdhbnQgdG8gaGlkZSBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgbGFzdCA0IGRpZ2l0cyB0byB0aGUgbW9uZ29vc2UgdXNlci4gWW91IGNhbiBkbyBzbyBieSBkZWZpbmluZyBhIGdldHRlciBpbiB0aGUgZm9sbG93aW5nIHdheTpcbiAqXG4gKiAgICAgZnVuY3Rpb24gb2JmdXNjYXRlIChjYykge1xuICogICAgICAgcmV0dXJuICcqKioqLSoqKiotKioqKi0nICsgY2Muc2xpY2UoY2MubGVuZ3RoLTQsIGNjLmxlbmd0aCk7XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgQWNjb3VudFNjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgY3JlZGl0Q2FyZE51bWJlcjogeyB0eXBlOiBTdHJpbmcsIGdldDogb2JmdXNjYXRlIH1cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIEFjY291bnQgPSBkYi5tb2RlbCgnQWNjb3VudCcsIEFjY291bnRTY2hlbWEpO1xuICpcbiAqICAgICBBY2NvdW50LmZpbmRCeUlkKGlkLCBmdW5jdGlvbiAoZXJyLCBmb3VuZCkge1xuICogICAgICAgY29uc29sZS5sb2coZm91bmQuY3JlZGl0Q2FyZE51bWJlcik7IC8vICcqKioqLSoqKiotKioqKi0xMjM0J1xuICogICAgIH0pO1xuICpcbiAqIEdldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgZ2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cbiAqXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgbm90JztcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBnZXQ6IGluc3BlY3RvciB9LFxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IGluc3BlY3RvciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xuICpcbiAqICAgICBWaXJ1cy5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgdmlydXMpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxuICogICAgICAgY29uc29sZS5sb2codmlydXMudGF4b25vbXkpOyAvLyB0YXhvbm9teSBpcyBub3RcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIGZuKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgZ2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgdGhpcy5nZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyB2YWxpZGF0b3IocykgZm9yIHRoaXMgZG9jdW1lbnQgcGF0aC5cbiAqXG4gKiBWYWxpZGF0b3JzIGFsd2F5cyByZWNlaXZlIHRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyB0aGVpciBmaXJzdCBhcmd1bWVudCBhbmQgbXVzdCByZXR1cm4gYEJvb2xlYW5gLiBSZXR1cm5pbmcgYGZhbHNlYCBtZWFucyB2YWxpZGF0aW9uIGZhaWxlZC5cbiAqXG4gKiBUaGUgZXJyb3IgbWVzc2FnZSBhcmd1bWVudCBpcyBvcHRpb25hbC4gSWYgbm90IHBhc3NlZCwgdGhlIFtkZWZhdWx0IGdlbmVyaWMgZXJyb3IgbWVzc2FnZSB0ZW1wbGF0ZV0oI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlcykgd2lsbCBiZSB1c2VkLlxuICpcbiAqICMjIyNFeGFtcGxlczpcbiAqXG4gKiAgICAgLy8gbWFrZSBzdXJlIGV2ZXJ5IHZhbHVlIGlzIGVxdWFsIHRvIFwic29tZXRoaW5nXCJcbiAqICAgICBmdW5jdGlvbiB2YWxpZGF0b3IgKHZhbCkge1xuICogICAgICAgcmV0dXJuIHZhbCA9PSAnc29tZXRoaW5nJztcbiAqICAgICB9XG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogdmFsaWRhdG9yIH19KTtcbiAqXG4gKiAgICAgLy8gd2l0aCBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKlxuICogICAgIHZhciBjdXN0b20gPSBbdmFsaWRhdG9yLCAnVWggb2gsIHtQQVRIfSBkb2VzIG5vdCBlcXVhbCBcInNvbWV0aGluZ1wiLiddXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogY3VzdG9tIH19KTtcbiAqXG4gKiAgICAgLy8gYWRkaW5nIG1hbnkgdmFsaWRhdG9ycyBhdCBhIHRpbWVcbiAqXG4gKiAgICAgdmFyIG1hbnkgPSBbXG4gKiAgICAgICAgIHsgdmFsaWRhdG9yOiB2YWxpZGF0b3IsIG1zZzogJ3VoIG9oJyB9XG4gKiAgICAgICAsIHsgdmFsaWRhdG9yOiBhbm90aGVyVmFsaWRhdG9yLCBtc2c6ICdmYWlsZWQnIH1cbiAqICAgICBdXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogbWFueSB9fSk7XG4gKlxuICogICAgIC8vIG9yIHV0aWxpemluZyBTY2hlbWFUeXBlIG1ldGhvZHMgZGlyZWN0bHk6XG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogJ3N0cmluZycgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZSh2YWxpZGF0b3IsICd2YWxpZGF0aW9uIG9mIGB7UEFUSH1gIGZhaWxlZCB3aXRoIHZhbHVlIGB7VkFMVUV9YCcpO1xuICpcbiAqICMjIyNFcnJvciBtZXNzYWdlIHRlbXBsYXRlczpcbiAqXG4gKiBGcm9tIHRoZSBleGFtcGxlcyBhYm92ZSwgeW91IG1heSBoYXZlIG5vdGljZWQgdGhhdCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2VpYyB0ZW1wbGF0aW5nLiBUaGVyZSBhcmUgYSBmZXcgb3RoZXIgdGVtcGxhdGUga2V5d29yZHMgYmVzaWRlcyBge1BBVEh9YCBhbmQgYHtWQUxVRX1gIHRvby4gVG8gZmluZCBvdXQgbW9yZSwgZGV0YWlscyBhcmUgYXZhaWxhYmxlIFtoZXJlXSgjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzKVxuICpcbiAqICMjIyNBc3luY2hyb25vdXMgdmFsaWRhdGlvbjpcbiAqXG4gKiBQYXNzaW5nIGEgdmFsaWRhdG9yIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdHdvIGFyZ3VtZW50cyB0ZWxscyBtb25nb29zZSB0aGF0IHRoZSB2YWxpZGF0b3IgaXMgYW4gYXN5bmNocm9ub3VzIHZhbGlkYXRvci4gVGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgdmFsaWRhdG9yIGZ1bmN0aW9uIGlzIHRoZSB2YWx1ZSBiZWluZyB2YWxpZGF0ZWQuIFRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG11c3QgY2FsbGVkIHdoZW4geW91IGZpbmlzaCB2YWxpZGF0aW5nIHRoZSB2YWx1ZSBhbmQgcGFzc2VkIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCB0byBjb21tdW5pY2F0ZSBlaXRoZXIgc3VjY2VzcyBvciBmYWlsdXJlIHJlc3BlY3RpdmVseS5cbiAqXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZShmdW5jdGlvbiAodmFsdWUsIHJlc3BvbmQpIHtcbiAqICAgICAgIGRvU3R1ZmYodmFsdWUsIGZ1bmN0aW9uICgpIHtcbiAqICAgICAgICAgLi4uXG4gKiAgICAgICAgIHJlc3BvbmQoZmFsc2UpOyAvLyB2YWxpZGF0aW9uIGZhaWxlZFxuICogICAgICAgfSlcbiogICAgICB9LCAne1BBVEh9IGZhaWxlZCB2YWxpZGF0aW9uLicpO1xuKlxuICogWW91IG1pZ2h0IHVzZSBhc3luY2hyb25vdXMgdmFsaWRhdG9ycyB0byByZXRyZWl2ZSBvdGhlciBkb2N1bWVudHMgZnJvbSB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGUgYWdhaW5zdCBvciB0byBtZWV0IG90aGVyIEkvTyBib3VuZCB2YWxpZGF0aW9uIG5lZWRzLlxuICpcbiAqIFZhbGlkYXRpb24gb2NjdXJzIGBwcmUoJ3NhdmUnKWAgb3Igd2hlbmV2ZXIgeW91IG1hbnVhbGx5IGV4ZWN1dGUgW2RvY3VtZW50I3ZhbGlkYXRlXSgjZG9jdW1lbnRfRG9jdW1lbnQtdmFsaWRhdGUpLlxuICpcbiAqIElmIHZhbGlkYXRpb24gZmFpbHMgZHVyaW5nIGBwcmUoJ3NhdmUnKWAgYW5kIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQgdG8gcmVjZWl2ZSB0aGUgZXJyb3IsIGFuIGBlcnJvcmAgZXZlbnQgd2lsbCBiZSBlbWl0dGVkIG9uIHlvdXIgTW9kZWxzIGFzc29jaWF0ZWQgZGIgW2Nvbm5lY3Rpb25dKCNjb25uZWN0aW9uX0Nvbm5lY3Rpb24pLCBwYXNzaW5nIHRoZSB2YWxpZGF0aW9uIGVycm9yIG9iamVjdCBhbG9uZy5cbiAqXG4gKiAgICAgdmFyIGNvbm4gPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcbiAqICAgICBjb25uLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiAgICAgdmFyIFByb2R1Y3QgPSBjb25uLm1vZGVsKCdQcm9kdWN0JywgeW91clNjaGVtYSk7XG4gKiAgICAgdmFyIGR2ZCA9IG5ldyBQcm9kdWN0KC4uKTtcbiAqICAgICBkdmQuc2F2ZSgpOyAvLyBlbWl0cyBlcnJvciBvbiB0aGUgYGNvbm5gIGFib3ZlXG4gKlxuICogSWYgeW91IGRlc2lyZSBoYW5kbGluZyB0aGVzZSBlcnJvcnMgYXQgdGhlIE1vZGVsIGxldmVsLCBhdHRhY2ggYW4gYGVycm9yYCBsaXN0ZW5lciB0byB5b3VyIE1vZGVsIGFuZCB0aGUgZXZlbnQgd2lsbCBpbnN0ZWFkIGJlIGVtaXR0ZWQgdGhlcmUuXG4gKlxuICogICAgIC8vIHJlZ2lzdGVyaW5nIGFuIGVycm9yIGxpc3RlbmVyIG9uIHRoZSBNb2RlbCBsZXRzIHVzIGhhbmRsZSBlcnJvcnMgbW9yZSBsb2NhbGx5XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQHBhcmFtIHtSZWdFeHB8RnVuY3Rpb258T2JqZWN0fSBvYmogdmFsaWRhdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKG9iaiwgbWVzc2FnZSwgdHlwZSkge1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqIHx8IG9iaiAmJiAnUmVnRXhwJyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgIGlmICghbWVzc2FnZSkgbWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICAgIGlmICghdHlwZSkgdHlwZSA9ICd1c2VyIGRlZmluZWQnO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFtvYmosIG1lc3NhZ2UsIHR5cGVdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKCEoYXJnICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggYXJnLmNvbnN0cnVjdG9yICkgKSkge1xuICAgICAgdmFyIG1zZyA9ICdJbnZhbGlkIHZhbGlkYXRvci4gUmVjZWl2ZWQgKCcgKyB0eXBlb2YgYXJnICsgJykgJ1xuICAgICAgICArIGFyZ1xuICAgICAgICArICcuIFNlZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9hcGkuaHRtbCNzY2hlbWF0eXBlX1NjaGVtYVR5cGUtdmFsaWRhdGUnO1xuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZShhcmcudmFsaWRhdG9yLCBhcmcubXNnLCBhcmcudHlwZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIHJlcXVpcmVkIHZhbGlkYXRvciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6IHRydWUgfSlcbiAqXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiAne1BBVEh9IGlzIHJlcXVpcmVkIScgfSlcbiAqXG4gKiAgICAgLy8gb3IgdGhyb3VnaCB0aGUgcGF0aCBBUElcbiAqXG4gKiAgICAgU2NoZW1hLnBhdGgoJ25hbWUnKS5yZXF1aXJlZCh0cnVlKTtcbiAqXG4gKiAgICAgLy8gd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnaW5nXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSwgJ2dycnIgOiggJyk7XG4gKlxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgZW5hYmxlL2Rpc2FibGUgdGhlIHZhbGlkYXRvclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnJlcXVpcmVkID0gZnVuY3Rpb24gKHJlcXVpcmVkLCBtZXNzYWdlKSB7XG4gIGlmIChmYWxzZSA9PT0gcmVxdWlyZWQpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5pc1JlcXVpcmVkID0gZmFsc2U7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaXNSZXF1aXJlZCA9IHRydWU7XG5cbiAgdGhpcy5yZXF1aXJlZFZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XG4gICAgLy8gaW4gaGVyZSwgYHRoaXNgIHJlZmVycyB0byB0aGUgdmFsaWRhdGluZyBkb2N1bWVudC5cbiAgICAvLyBubyB2YWxpZGF0aW9uIHdoZW4gdGhpcyBwYXRoIHdhc24ndCBzZWxlY3RlZCBpbiB0aGUgcXVlcnkuXG4gICAgaWYgKHRoaXMgIT09IHVuZGVmaW5lZCAmJiAvLyDRgdC/0LXRhtC40LDQu9GM0L3QsNGPINC/0YDQvtCy0LXRgNC60LAg0LjQty3Qt9CwIHN0cmljdCBtb2RlINC4INC+0YHQvtCx0LXQvdC90L7RgdGC0LggLmNhbGwodW5kZWZpbmVkKVxuICAgICAgICAnaXNTZWxlY3RlZCcgaW4gdGhpcyAmJlxuICAgICAgICAhdGhpcy5pc1NlbGVjdGVkKHNlbGYucGF0aCkgJiZcbiAgICAgICAgIXRoaXMuaXNNb2RpZmllZChzZWxmLnBhdGgpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBzZWxmLmNoZWNrUmVxdWlyZWQodiwgdGhpcyk7XG4gIH07XG5cbiAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiByZXF1aXJlZCkge1xuICAgIG1lc3NhZ2UgPSByZXF1aXJlZDtcbiAgICByZXF1aXJlZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5yZXF1aXJlZDtcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMucmVxdWlyZWRWYWxpZGF0b3IsIG1zZywgJ3JlcXVpcmVkJ10pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIEdldHMgdGhlIGRlZmF1bHQgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGUgdGhlIHNjb3BlIHdoaWNoIGNhbGxiYWNrIGFyZSBleGVjdXRlZFxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0RGVmYXVsdCA9IGZ1bmN0aW9uIChzY29wZSwgaW5pdCkge1xuICB2YXIgcmV0ID0gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuZGVmYXVsdFZhbHVlXG4gICAgPyB0aGlzLmRlZmF1bHRWYWx1ZS5jYWxsKHNjb3BlKVxuICAgIDogdGhpcy5kZWZhdWx0VmFsdWU7XG5cbiAgaWYgKG51bGwgIT09IHJldCAmJiB1bmRlZmluZWQgIT09IHJldCkge1xuICAgIHJldHVybiB0aGlzLmNhc3QocmV0LCBzY29wZSwgaW5pdCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufTtcblxuLyoqXG4gKiBBcHBsaWVzIHNldHRlcnNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCkge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcbiAgICByZXR1cm4gaW5pdFxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB0aGlzLmNhc3QodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBzZXR0ZXJzID0gdGhpcy5zZXR0ZXJzXG4gICAgLCBsZW4gPSBzZXR0ZXJzLmxlbmd0aFxuICAgICwgY2FzdGVyID0gdGhpcy5jYXN0ZXI7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodikgJiYgY2FzdGVyICYmIGNhc3Rlci5zZXR0ZXJzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2W2ldID0gY2FzdGVyLmFwcGx5U2V0dGVycyh2W2ldLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghbGVuKSB7XG4gICAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcbiAgICByZXR1cm4gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICB2ID0gc2V0dGVyc1tsZW5dLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcblxuICAvLyBkbyBub3QgY2FzdCB1bnRpbCBhbGwgc2V0dGVycyBhcmUgYXBwbGllZCAjNjY1XG4gIHYgPSB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcblxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGEgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uKCB2YWx1ZSwgc2NvcGUgKXtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHJldHVybiB2YWx1ZTtcblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBnZXR0ZXJzID0gdGhpcy5nZXR0ZXJzXG4gICAgLCBsZW4gPSBnZXR0ZXJzLmxlbmd0aDtcblxuICBpZiAoICFsZW4gKSB7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICB3aGlsZSAoIGxlbi0tICkge1xuICAgIHYgPSBnZXR0ZXJzWyBsZW4gXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuXG4gIHJldHVybiB2O1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhIHZhbGlkYXRpb24gb2YgYHZhbHVlYCB1c2luZyB0aGUgdmFsaWRhdG9ycyBkZWNsYXJlZCBmb3IgdGhpcyBTY2hlbWFUeXBlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgdmFyIGVyciA9IGZhbHNlXG4gICAgLCBwYXRoID0gdGhpcy5wYXRoXG4gICAgLCBjb3VudCA9IHRoaXMudmFsaWRhdG9ycy5sZW5ndGg7XG5cbiAgaWYgKCFjb3VudCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlIChvaywgbWVzc2FnZSwgdHlwZSwgdmFsKSB7XG4gICAgaWYgKGVycikgcmV0dXJuO1xuICAgIGlmIChvayA9PT0gdW5kZWZpbmVkIHx8IG9rKSB7XG4gICAgICAtLWNvdW50IHx8IGNhbGxiYWNrKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhlcnIgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgbWVzc2FnZSwgdHlwZSwgdmFsKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy52YWxpZGF0b3JzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdlswXVxuICAgICAgLCBtZXNzYWdlID0gdlsxXVxuICAgICAgLCB0eXBlID0gdlsyXTtcblxuICAgIGlmICh2YWxpZGF0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci50ZXN0KHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbGlkYXRvcikge1xuICAgICAgaWYgKDIgPT09IHZhbGlkYXRvci5sZW5ndGgpIHtcbiAgICAgICAgdmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlLCBmdW5jdGlvbiAob2spIHtcbiAgICAgICAgICB2YWxpZGF0ZShvaywgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHZhbHVlIGlzIGEgdmFsaWQgUmVmZXJlbmNlLlxuICpcbiAqINCd0LAg0LrQu9C40LXQvdGC0LUg0LIg0LrQsNGH0LXRgdGC0LLQtSDRgdGB0YvQu9C60Lgg0LzQvtC20L3QviDRhdGA0LDQvdC40YLRjCDQutCw0LogaWQsINGC0LDQuiDQuCDQv9C+0LvQvdGL0LUg0LTQvtC60YPQvNC10L3RgtGLXG4gKlxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5faXNSZWYgPSBmdW5jdGlvbiggc2VsZiwgdmFsdWUgKXtcbiAgLy8gZmFzdCBwYXRoXG4gIHZhciByZWYgPSBzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlZjtcblxuICBpZiAoIHJlZiApIHtcbiAgICBpZiAoIG51bGwgPT0gdmFsdWUgKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoIF8uaXNPYmplY3QoIHZhbHVlICkgKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hVHlwZTtcblxuU2NoZW1hVHlwZS5DYXN0RXJyb3IgPSBDYXN0RXJyb3I7XG5cblNjaGVtYVR5cGUuVmFsaWRhdG9yRXJyb3IgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIi8qIVxuICogU3RhdGVNYWNoaW5lIHJlcHJlc2VudHMgYSBtaW5pbWFsIGBpbnRlcmZhY2VgIGZvciB0aGVcbiAqIGNvbnN0cnVjdG9ycyBpdCBidWlsZHMgdmlhIFN0YXRlTWFjaGluZS5jdG9yKC4uLikuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVNYWNoaW5lICgpIHtcbiAgdGhpcy5wYXRocyA9IHt9O1xuICB0aGlzLnN0YXRlcyA9IHt9O1xufTtcblxuLyohXG4gKiBTdGF0ZU1hY2hpbmUuY3Rvcignc3RhdGUxJywgJ3N0YXRlMicsIC4uLilcbiAqIEEgZmFjdG9yeSBtZXRob2QgZm9yIHN1YmNsYXNzaW5nIFN0YXRlTWFjaGluZS5cbiAqIFRoZSBhcmd1bWVudHMgYXJlIGEgbGlzdCBvZiBzdGF0ZXMuIEZvciBlYWNoIHN0YXRlLFxuICogdGhlIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGdldHMgc3RhdGUgdHJhbnNpdGlvblxuICogbWV0aG9kcyBuYW1lZCBhZnRlciBlYWNoIHN0YXRlLiBUaGVzZSB0cmFuc2l0aW9uIG1ldGhvZHNcbiAqIHBsYWNlIHRoZWlyIHBhdGggYXJndW1lbnQgaW50byB0aGUgZ2l2ZW4gc3RhdGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHJldHVybiB7RnVuY3Rpb259IHN1YmNsYXNzIGNvbnN0cnVjdG9yXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5jdG9yID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgU3RhdGVNYWNoaW5lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5zdGF0ZU5hbWVzID0gc3RhdGVzO1xuXG4gICAgdmFyIGkgPSBzdGF0ZXMubGVuZ3RoXG4gICAgICAsIHN0YXRlO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICB0aGlzLnN0YXRlc1tzdGF0ZV0gPSB7fTtcbiAgICB9XG4gIH07XG5cbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdGF0ZU1hY2hpbmUucHJvdG90eXBlICk7XG4gIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcblxuICBzdGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAvLyBDaGFuZ2VzIHRoZSBgcGF0aGAncyBzdGF0ZSB0byBgc3RhdGVgLlxuICAgIGN0b3IucHJvdG90eXBlW3N0YXRlXSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShwYXRoLCBzdGF0ZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBpcyB3cmFwcGVkIGJ5IHRoZSBzdGF0ZSBjaGFuZ2UgZnVuY3Rpb25zOlxuICpcbiAqIC0gYHJlcXVpcmUocGF0aClgXG4gKiAtIGBtb2RpZnkocGF0aClgXG4gKiAtIGBpbml0KHBhdGgpYFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2NoYW5nZVN0YXRlID0gZnVuY3Rpb24gX2NoYW5nZVN0YXRlIChwYXRoLCBuZXh0U3RhdGUpIHtcbiAgdmFyIHByZXZCdWNrZXQgPSB0aGlzLnN0YXRlc1t0aGlzLnBhdGhzW3BhdGhdXTtcbiAgaWYgKHByZXZCdWNrZXQpIGRlbGV0ZSBwcmV2QnVja2V0W3BhdGhdO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBuZXh0U3RhdGU7XG4gIHRoaXMuc3RhdGVzW25leHRTdGF0ZV1bcGF0aF0gPSB0cnVlO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIgKHN0YXRlKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZXNbc3RhdGVdKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0ga2V5c1tpXTtcbiAgICBkZWxldGUgdGhpcy5zdGF0ZXNbc3RhdGVdW3BhdGhdO1xuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xuICB9XG59O1xuXG4vKiFcbiAqIENoZWNrcyB0byBzZWUgaWYgYXQgbGVhc3Qgb25lIHBhdGggaXMgaW4gdGhlIHN0YXRlcyBwYXNzZWQgaW4gdmlhIGBhcmd1bWVudHNgXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIHRoYXQgd2Ugd2FudCB0byBjaGVjayBmb3IuXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3aGF0ID0gYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50cyA6IHRoaXMuc3RhdGVOYW1lcztcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkubGVuZ3RoO1xuICB9KTtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxuICogc2luY2UgYm90aCBvZiB0aG9zZSBtZXRob2RzIHNoYXJlIGEgbG90IG9mIHRoZSBzYW1lIGxvZ2ljLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5faXRlciA9IGZ1bmN0aW9uIF9pdGVyIChpdGVyTWV0aG9kKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG51bUFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgICAsIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDAsIG51bUFyZ3MtMSlcbiAgICAgICwgY2FsbGJhY2sgPSBhcmd1bWVudHNbbnVtQXJncy0xXTtcblxuICAgIGlmICghc3RhdGVzLmxlbmd0aCkgc3RhdGVzID0gdGhpcy5zdGF0ZU5hbWVzO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHBhdGhzID0gc3RhdGVzLnJlZHVjZShmdW5jdGlvbiAocGF0aHMsIHN0YXRlKSB7XG4gICAgICByZXR1cm4gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkpO1xuICAgIH0sIFtdKTtcblxuICAgIHJldHVybiBwYXRoc1tpdGVyTWV0aG9kXShmdW5jdGlvbiAocGF0aCwgaSwgcGF0aHMpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhwYXRoLCBpLCBwYXRocyk7XG4gICAgfSk7XG4gIH07XG59O1xuXG4vKiFcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIHBhdGhzIHRoYXQgYmVsb25nIHRvIG9uZSBvZiB0aGUgcGFyYW1ldGVyIHN0YXRlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgZm4pOyAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMVxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcbiAgdGhpcy5mb3JFYWNoID0gdGhpcy5faXRlcignZm9yRWFjaCcpO1xuICByZXR1cm4gdGhpcy5mb3JFYWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAgKCkge1xuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xuICByZXR1cm4gdGhpcy5tYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbiIsIi8vVE9ETzog0L/QvtGH0LjRgdGC0LjRgtGMINC60L7QtFxuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEVtYmVkZGVkRG9jdW1lbnQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBTdG9yYWdlIEFycmF5IGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNOT1RFOlxuICpcbiAqIF9WYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBvdGhlcndpc2UgYFN0b3JhZ2VBcnJheSNwdXNoYCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkLl9cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBpbmhlcml0cyBBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICovXG5mdW5jdGlvbiBTdG9yYWdlQXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xuICBfLm1peGluKCBhcnIsIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuU3RvcmFnZUFycmF5Lm1peGluID0ge1xuICAvKipcbiAgICogUGFyZW50IG93bmVyIGRvY3VtZW50XG4gICAqXG4gICAqIEBwcm9wZXJ0eSBfcGFyZW50XG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX3BhcmVudDogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBDYXN0cyBhIG1lbWJlciBiYXNlZCBvbiB0aGlzIGFycmF5cyBzY2hlbWEuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHJldHVybiB2YWx1ZSB0aGUgY2FzdGVkIHZhbHVlXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX2Nhc3Q6IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gICAgdmFyIG93bmVyID0gdGhpcy5fb3duZXI7XG4gICAgdmFyIHBvcHVsYXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgLy8gaWYgYSBwb3B1bGF0ZWQgYXJyYXksIHdlIG11c3QgY2FzdCB0byB0aGUgc2FtZSBtb2RlbFxuICAgICAgLy8gaW5zdGFuY2UgYXMgc3BlY2lmaWVkIGluIHRoZSBvcmlnaW5hbCBxdWVyeS5cbiAgICAgIGlmICghb3duZXIpIHtcbiAgICAgICAgb3duZXIgPSB0aGlzLl9vd25lciA9IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50XG4gICAgICAgICAgPyB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudCgpXG4gICAgICAgICAgOiB0aGlzLl9wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHBvcHVsYXRlZCA9IG93bmVyLnBvcHVsYXRlZCh0aGlzLl9wYXRoLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAocG9wdWxhdGVkICYmIG51bGwgIT0gdmFsdWUpIHtcbiAgICAgIC8vIGNhc3QgdG8gdGhlIHBvcHVsYXRlZCBNb2RlbHMgc2NoZW1hXG4gICAgICB2YXIgTW9kZWwgPSBwb3B1bGF0ZWQub3B0aW9ucy5tb2RlbDtcblxuICAgICAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAgICAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxuICAgICAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICAgICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBuZXcgTW9kZWwodmFsdWUpO1xuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9zY2hlbWEuY2FzdGVyLmNhc3QodmFsdWUsIHRoaXMuX3BhcmVudCwgZmFsc2UpXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1hcmtzIHRoaXMgYXJyYXkgYXMgbW9kaWZpZWQuXG4gICAqXG4gICAqIElmIGl0IGJ1YmJsZXMgdXAgZnJvbSBhbiBlbWJlZGRlZCBkb2N1bWVudCBjaGFuZ2UsIHRoZW4gaXQgdGFrZXMgdGhlIGZvbGxvd2luZyBhcmd1bWVudHMgKG90aGVyd2lzZSwgdGFrZXMgMCBhcmd1bWVudHMpXG4gICAqXG4gICAqIEBwYXJhbSB7RW1iZWRkZWREb2N1bWVudH0gZW1iZWRkZWREb2MgdGhlIGVtYmVkZGVkIGRvYyB0aGF0IGludm9rZWQgdGhpcyBtZXRob2Qgb24gdGhlIEFycmF5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbWJlZGRlZFBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZCBpbiB0aGUgZW1iZWRkZWREb2NcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfbWFya01vZGlmaWVkOiBmdW5jdGlvbiAoZWxlbSwgZW1iZWRkZWRQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudFxuICAgICAgLCBkaXJ0eVBhdGg7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBkaXJ0eVBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBpZiAobnVsbCAhPSBlbWJlZGRlZFBhdGgpIHtcbiAgICAgICAgICAvLyBhbiBlbWJlZGRlZCBkb2MgYnViYmxlZCB1cCB0aGUgY2hhbmdlXG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgdGhpcy5pbmRleE9mKGVsZW0pICsgJy4nICsgZW1iZWRkZWRQYXRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGRpcmVjdGx5IHNldCBhbiBpbmRleFxuICAgICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIGVsZW07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFyZW50Lm1hcmtNb2RpZmllZChkaXJ0eVBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3B1c2hgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wdXNoKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbYXJncy4uLl1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHB1c2g6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCByZXQgPSBbXS5wdXNoLmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3BvcGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3BvcCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBzZWUgU3RvcmFnZUFycmF5IyRwb3AgI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS0lMjRwb3BcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHBvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5wb3AuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5ID0gWzIsM107XG4gICAqICAgICB2YXIgcmVzID0gZG9jLmFycmF5LnNoaWZ0KCk7XG4gICAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzNdXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzaGlmdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5zaGlmdC5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAgICpcbiAgICogIyMjI0V4YW1wbGVzOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoT2JqZWN0SWQpXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCh7IF9pZDogJ3NvbWVJZCcgfSlcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoJ3RhZyAxJywgJ3RhZyAyJylcbiAgICpcbiAgICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAgICpcbiAgICogT3Igd2UgbWF5IHBhc3NpbmcgdGhlIF9pZCBkaXJlY3RseSBhbmQgbGV0IHN0b3JhZ2UgdGFrZSBjYXJlIG9mIGl0LlxuICAgKlxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVzaCh7IF9pZDogNDgxNTE2MjM0MiB9KVxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCg0ODE1MTYyMzQyKTsgLy8gd29ya3NcbiAgICpcbiAgICogQHBhcmFtIHsqfSBhcmd1bWVudHNcbiAgICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgY3VyID0gdGhpcy5fcGFyZW50LmdldCh0aGlzLl9wYXRoKVxuICAgICAgLCBpID0gY3VyLmxlbmd0aFxuICAgICAgLCBtZW07XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBtZW0gPSBjdXJbaV07XG4gICAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xuICAgICAgICBpZiAodmFsdWVzLnNvbWUoZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHYuZXF1YWxzKG1lbSk7IH0gKSkge1xuICAgICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAofmN1ci5pbmRleE9mLmNhbGwodmFsdWVzLCBtZW0pKSB7XG4gICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc3BsaWNlYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvc3BsaWNlKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcgYW5kIGNhc3RpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoKSB7XG4gICAgdmFyIHJldCwgdmFscywgaTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICB2YWxzID0gW107XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhbHNbaV0gPSBpIDwgMlxuICAgICAgICAgID8gYXJndW1lbnRzW2ldXG4gICAgICAgICAgOiB0aGlzLl9jYXN0KGFyZ3VtZW50c1tpXSk7XG4gICAgICB9XG4gICAgICByZXQgPSBbXS5zcGxpY2UuYXBwbHkodGhpcywgdmFscyk7XG5cbiAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjdW5zaGlmdGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3Vuc2hpZnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHVuc2hpZnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKTtcbiAgICBbXS51bnNoaWZ0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc29ydGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NvcnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05PVEU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNvcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10uc29ydC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyB2YWx1ZXMgdG8gdGhlIGFycmF5IGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqICAgICB2YXIgYWRkZWQgPSBkb2MuYXJyYXkuYWRkVG9TZXQoNCw1KTtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0LDVdXG4gICAqICAgICBjb25zb2xlLmxvZyhhZGRlZCkgICAgIC8vIFs1XVxuICAgKlxuICAgKiBAcGFyYW0geyp9IGFyZ3VtZW50c1xuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhlIHZhbHVlcyB0aGF0IHdlcmUgYWRkZWRcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGFkZFRvU2V0OiBmdW5jdGlvbiBhZGRUb1NldCAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgYWRkZWQgPSBbXVxuICAgICAgLCB0eXBlID0gdmFsdWVzWzBdIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCA/ICdkb2MnIDpcbiAgICAgICAgICAgICAgIHZhbHVlc1swXSBpbnN0YW5jZW9mIERhdGUgPyAnZGF0ZScgOlxuICAgICAgICAgICAgICAgJyc7XG5cbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGZvdW5kO1xuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2RvYyc6XG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZG9jKXsgcmV0dXJuIGRvYy5lcXVhbHModikgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgIHZhciB2YWwgPSArdjtcbiAgICAgICAgICBmb3VuZCA9IHRoaXMuc29tZShmdW5jdGlvbihkKXsgcmV0dXJuICtkID09PSB2YWwgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZm91bmQgPSB+dGhpcy5pbmRleE9mKHYpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIFtdLnB1c2guY2FsbCh0aGlzLCB2KTtcblxuICAgICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICAgICAgW10ucHVzaC5jYWxsKGFkZGVkLCB2KTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiBhZGRlZDtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB0aGUgY2FzdGVkIGB2YWxgIGF0IGluZGV4IGBpYCBhbmQgbWFya3MgdGhlIGFycmF5IG1vZGlmaWVkLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIC8vIGdpdmVuIGRvY3VtZW50cyBiYXNlZCBvbiB0aGUgZm9sbG93aW5nXG4gICAqICAgICB2YXIgZG9jcyA9IHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbignRG9jJywgbmV3IFNjaGVtYSh7IGFycmF5OiBbTnVtYmVyXSB9KSk7XG4gICAqXG4gICAqICAgICB2YXIgZG9jID0gZG9jcy5hZGQoeyBhcnJheTogWzIsMyw0XSB9KVxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqXG4gICAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KTsgLy8gWzIsNSw0XSAvLyBwcm9wZXJseSBjYXN0IHRvIG51bWJlclxuICAgKiAgICAgZG9jLnNhdmUoKSAvLyB0aGUgY2hhbmdlIGlzIHNhdmVkXG4gICAqXG4gICAqICAgICAvLyBWUyBub3QgdXNpbmcgYXJyYXkjc2V0XG4gICAqICAgICBkb2MuYXJyYXlbMV0gPSBcIjVcIjtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlIGlzIG5vdCBzYXZlZFxuICAgKlxuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc2V0OiBmdW5jdGlvbiAoaSwgdmFsKSB7XG4gICAgdGhpc1tpXSA9IHRoaXMuX2Nhc3QodmFsKTtcbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoaSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge0FycmF5fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9PYmplY3Q6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXR1cm4gZG9jIGluc3RhbmNlb2YgRG9jdW1lbnRcbiAgICAgICAgICA/IGRvYy50b09iamVjdChvcHRpb25zKVxuICAgICAgICAgIDogZG9jXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zbGljZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGluZGV4IG9mIGBvYmpgIG9yIGAtMWAgaWYgbm90IGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBpdGVtIHRvIGxvb2sgZm9yXG4gICAqIEByZXR1cm4ge051bWJlcn1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGluZGV4T2Y6IGZ1bmN0aW9uIGluZGV4T2YgKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBPYmplY3RJZCkgb2JqID0gb2JqLnRvU3RyaW5nKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGlmIChvYmogPT0gdGhpc1tpXSlcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufTtcblxuLyoqXG4gKiBBbGlhcyBvZiBbcHVsbF0oI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS1wdWxsKVxuICpcbiAqIEBzZWUgU3RvcmFnZUFycmF5I3B1bGwgI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS1wdWxsXG4gKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAqIEBhcGkgcHVibGljXG4gKiBAbWVtYmVyT2YgU3RvcmFnZUFycmF5XG4gKiBAbWV0aG9kIHJlbW92ZVxuICovXG5TdG9yYWdlQXJyYXkubWl4aW4ucmVtb3ZlID0gU3RvcmFnZUFycmF5Lm1peGluLnB1bGw7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlQXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICwgT2JqZWN0SWRTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEvb2JqZWN0aWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBEb2N1bWVudEFycmF5IGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byB0aGlzIGFycmF5XG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge1N0b3JhZ2VEb2N1bWVudEFycmF5fVxuICogQGluaGVyaXRzIFN0b3JhZ2VBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICogVE9ETzog0L/QvtC00YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG4gKlxuICog0JLQtdGB0Ywg0L3Rg9C20L3Ri9C5INC60L7QtCDRgdC60L7Qv9C40YDQvtCy0LDQvVxuICovXG5mdW5jdGlvbiBTdG9yYWdlRG9jdW1lbnRBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuXG4gIC8vIFZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIHNpbmNlXG4gIC8vIG90aGVyd2lzZSBTdG9yYWdlQXJyYXkjcHVzaCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkIHRvIHRoZSBwYXJlbnQuXG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG4gIGFyci5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgYXJyLl9oYW5kbGVycyA9IHtcbiAgICAgIGlzTmV3OiBhcnIubm90aWZ5KCdpc05ldycpLFxuICAgICAgc2F2ZTogYXJyLm5vdGlmeSgnc2F2ZScpXG4gICAgfTtcblxuICAgIC8vINCf0YDQvtCx0YDQvtGBINC40LfQvNC10L3QtdC90LjRjyDRgdC+0YHRgtC+0Y/QvdC40Y8g0LIg0L/QvtC00LTQvtC60YPQvNC10L3RglxuICAgIGRvYy5vbignc2F2ZScsIGFyci5faGFuZGxlcnMuc2F2ZSk7XG4gICAgZG9jLm9uKCdpc05ldycsIGFyci5faGFuZGxlcnMuaXNOZXcpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VBcnJheVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5fY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoISh2YWx1ZS5fX3BhcmVudCAmJiB2YWx1ZS5fX3BhcmVudEFycmF5KSkge1xuICAgICAgLy8gdmFsdWUgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIHVzaW5nIGFycmF5LmNyZWF0ZSgpXG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgIHZhbHVlLl9fcGFyZW50QXJyYXkgPSB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBoYW5kbGUgY2FzdCgnc3RyaW5nJykgb3IgY2FzdChPYmplY3RJZCkgZXRjLlxuICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICB9XG5cbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IodmFsdWUsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBTZWFyY2hlcyBhcnJheSBpdGVtcyBmb3IgdGhlIGZpcnN0IGRvY3VtZW50IHdpdGggYSBtYXRjaGluZyBfaWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBlbWJlZGRlZERvYyA9IG0uYXJyYXkuaWQoc29tZV9pZCk7XG4gKlxuICogQHJldHVybiB7RW1iZWRkZWREb2N1bWVudHxudWxsfSB0aGUgc3ViZG9jdW1lbnQgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gKiBAcGFyYW0ge09iamVjdElkfFN0cmluZ3xOdW1iZXJ9IGlkXG4gKiBAVE9ETyBjYXN0IHRvIHRoZSBfaWQgYmFzZWQgb24gc2NoZW1hIGZvciBwcm9wZXIgY29tcGFyaXNvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uaWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgdmFyIGNhc3RlZFxuICAgICwgc2lkXG4gICAgLCBfaWQ7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY2FzdGVkXyA9IE9iamVjdElkU2NoZW1hLnByb3RvdHlwZS5jYXN0LmNhbGwoe30sIGlkKTtcbiAgICBpZiAoY2FzdGVkXykgY2FzdGVkID0gU3RyaW5nKGNhc3RlZF8pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FzdGVkID0gbnVsbDtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBfaWQgPSB0aGlzW2ldLmdldCgnX2lkJyk7XG5cbiAgICBpZiAoX2lkIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZC5faWQpIHJldHVybiB0aGlzW2ldO1xuICAgIH0gZWxzZSBpZiAoIShfaWQgaW5zdGFuY2VvZiBPYmplY3RJZCkpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmIChjYXN0ZWQgPT0gX2lkKSB7XG4gICAgICByZXR1cm4gdGhpc1tpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheSBvZiBwbGFpbiBqcyBvYmplY3RzXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX0VhY2ggc3ViLWRvY3VtZW50IGlzIGNvbnZlcnRlZCB0byBhIHBsYWluIG9iamVjdCBieSBjYWxsaW5nIGl0cyBgI3RvT2JqZWN0YCBtZXRob2QuX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWwgb3B0aW9ucyB0byBwYXNzIHRvIGVhY2ggZG9jdW1lbnRzIGB0b09iamVjdGAgbWV0aG9kIGNhbGwgZHVyaW5nIGNvbnZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3Iob2JqKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZuIHRoYXQgbm90aWZpZXMgYWxsIGNoaWxkIGRvY3Mgb2YgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLm5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSAoZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gbm90aWZ5ICh2YWwpIHtcbiAgICB2YXIgaSA9IHNlbGYubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGlmICghc2VsZltpXSkgY29udGludWU7XG4gICAgICBzZWxmW2ldLnRyaWdnZXIoZXZlbnQsIHZhbCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZURvY3VtZW50QXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBFbWJlZGRlZERvY3VtZW50IGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGpzIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoZSBkYlxuICogQHBhcmFtIHtTdG9yYWdlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIERvY3VtZW50LnByb3RvdHlwZSApO1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWJlZGRlZERvY3VtZW50O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBlbWJlZGRlZCBkb2MgbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBkb2MgPSBibG9ncG9zdC5jb21tZW50cy5pZChoZXhzdHJpbmcpO1xuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcblxuICBpZiAodGhpcy5pc05ldykge1xuICAgIC8vIE1hcmsgdGhlIFdIT0xFIHBhcmVudCBhcnJheSBhcyBtb2RpZmllZFxuICAgIC8vIGlmIHRoaXMgaXMgYSBuZXcgZG9jdW1lbnQgKGkuZS4sIHdlIGFyZSBpbml0aWFsaXppbmdcbiAgICAvLyBhIGRvY3VtZW50KSxcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCgpO1xuICB9IGVsc2VcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCh0aGlzLCBwYXRoKTtcbn07XG5cbi8qKlxuICogVXNlZCBhcyBhIHN0dWIgZm9yIFtob29rcy5qc10oaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjMylcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVGhpcyBpcyBhIG5vLW9wLiBEb2VzIG5vdCBhY3R1YWxseSBzYXZlIHRoZSBkb2MgdG8gdGhlIGRiLl9cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlZCBQcm9taXNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBwcm9taXNlID0gJC5EZWZlcnJlZCgpLmRvbmUoZm4pO1xuICBwcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc3ViZG9jdW1lbnQgZnJvbSBpdHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIF9pZDtcbiAgaWYgKCF0aGlzLndpbGxSZW1vdmUpIHtcbiAgICBfaWQgPSB0aGlzLl9kb2MuX2lkO1xuICAgIGlmICghX2lkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvciB5b3VyIG93biBnb29kLCBTdG9yYWdlIGRvZXMgbm90IGtub3cgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2hvdyB0byByZW1vdmUgYW4gRW1iZWRkZWREb2N1bWVudCB0aGF0IGhhcyBubyBfaWQnKTtcbiAgICB9XG4gICAgdGhpcy5fX3BhcmVudEFycmF5LnB1bGwoeyBfaWQ6IF9pZCB9KTtcbiAgICB0aGlzLndpbGxSZW1vdmUgPSB0cnVlO1xuICB9XG5cbiAgaWYgKGZuKVxuICAgIGZuKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSAjdXBkYXRlIG1ldGhvZCBvZiBwYXJlbnQgZG9jdW1lbnRzLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdUaGUgI3VwZGF0ZSBtZXRob2QgaXMgbm90IGF2YWlsYWJsZSBvbiBFbWJlZGRlZERvY3VtZW50cycpO1xufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnIgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnIsIHZhbCwgZmlyc3QpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50KSB7XG4gICAgdmFyIG1zZyA9ICdVbmFibGUgdG8gaW52YWxpZGF0ZSBhIHN1YmRvY3VtZW50IHRoYXQgaGFzIG5vdCBiZWVuIGFkZGVkIHRvIGFuIGFycmF5LidcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuXG4gIHZhciBpbmRleCA9IHRoaXMuX19wYXJlbnRBcnJheS5pbmRleE9mKHRoaXMpO1xuICB2YXIgcGFyZW50UGF0aCA9IHRoaXMuX19wYXJlbnRBcnJheS5fcGF0aDtcbiAgdmFyIGZ1bGxQYXRoID0gW3BhcmVudFBhdGgsIGluZGV4LCBwYXRoXS5qb2luKCcuJyk7XG5cbiAgLy8gc25pZmZpbmcgYXJndW1lbnRzOlxuICAvLyBuZWVkIHRvIGNoZWNrIGlmIHVzZXIgcGFzc2VkIGEgdmFsdWUgdG8ga2VlcFxuICAvLyBvdXIgZXJyb3IgbWVzc2FnZSBjbGVhbi5cbiAgaWYgKDIgPCBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fX3BhcmVudC5pbnZhbGlkYXRlKGZ1bGxQYXRoLCBlcnIsIHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudC5pbnZhbGlkYXRlKGZ1bGxQYXRoLCBlcnIpO1xuICB9XG5cbiAgaWYgKGZpcnN0KVxuICAgIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IHRoaXMub3duZXJEb2N1bWVudCgpLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB0b3AgbGV2ZWwgZG9jdW1lbnQgb2YgdGhpcyBzdWItZG9jdW1lbnQuXG4gKlxuICogQHJldHVybiB7RG9jdW1lbnR9XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLm93bmVyRG9jdW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLiRfXy5vd25lckRvY3VtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQ7XG4gIH1cblxuICB2YXIgcGFyZW50ID0gdGhpcy5fX3BhcmVudDtcbiAgaWYgKCFwYXJlbnQpIHJldHVybiB0aGlzO1xuXG4gIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcbiAgICBwYXJlbnQgPSBwYXJlbnQuX19wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuIElmIG9wdGlvbmFsIGBwYXRoYCBpcyBwYXNzZWQsIGl0IGlzIGFwcGVuZGVkIHRvIHRoZSBmdWxsIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRW1iZWRkZWREb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmICghdGhpcy4kX18uZnVsbFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICBpZiAoIXBhcmVudC5fX3BhcmVudCkgcmV0dXJuIHBhdGg7XG5cbiAgICB2YXIgcGF0aHMgPSBbXTtcbiAgICB3aGlsZSAocGFyZW50Ll9fcGFyZW50KSB7XG4gICAgICBwYXRocy51bnNoaWZ0KHBhcmVudC5fX3BhcmVudEFycmF5Ll9wYXRoKTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgICB9XG5cbiAgICB0aGlzLiRfXy5mdWxsUGF0aCA9IHBhdGhzLmpvaW4oJy4nKTtcblxuICAgIGlmICghdGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xuICAgICAgLy8gb3B0aW1pemF0aW9uXG4gICAgICB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoXG4gICAgPyB0aGlzLiRfXy5mdWxsUGF0aCArICcuJyArIHBhdGhcbiAgICA6IHRoaXMuJF9fLmZ1bGxQYXRoO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudEFycmF5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudEFycmF5O1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4iLCJcbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxuZXhwb3J0cy5FbWJlZGRlZCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcblxuZXhwb3J0cy5Eb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi9kb2N1bWVudGFycmF5Jyk7XG5leHBvcnRzLk9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIEJpbmFyeVBhcnNlciA9IHJlcXVpcmUoJy4uL2JpbmFyeV9wYXJzZXInKS5CaW5hcnlQYXJzZXI7XG5cbi8qKlxuICogTWFjaGluZSBpZC5cbiAqXG4gKiBDcmVhdGUgYSByYW5kb20gMy1ieXRlIHZhbHVlIChpLmUuIHVuaXF1ZSBmb3IgdGhpc1xuICogcHJvY2VzcykuIE90aGVyIGRyaXZlcnMgdXNlIGEgbWQ1IG9mIHRoZSBtYWNoaW5lIGlkIGhlcmUsIGJ1dFxuICogdGhhdCB3b3VsZCBtZWFuIGFuIGFzeWMgY2FsbCB0byBnZXRob3N0bmFtZSwgc28gd2UgZG9uJ3QgYm90aGVyLlxuICogQGlnbm9yZVxuICovXG52YXIgTUFDSElORV9JRCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxudmFyIGNoZWNrRm9ySGV4UmVnRXhwID0gbmV3IFJlZ0V4cChcIl5bMC05YS1mQS1GXXsyNH0kXCIpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBPYmplY3RJZCBpbnN0YW5jZVxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21vbmdvZGIvanMtYnNvbi9ibG9iL21hc3Rlci9saWIvYnNvbi9vYmplY3RpZC5qc1xuICogQGNsYXNzIFJlcHJlc2VudHMgYSBCU09OIE9iamVjdElkIHR5cGUuXG4gKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyKX0gaWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZ2VuZXJhdGlvblRpbWUgVGhlIGdlbmVyYXRpb24gdGltZSBvZiB0aGlzIE9iamVjdElkIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gaW5zdGFuY2Ugb2YgT2JqZWN0SWQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElkKGlkKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG4gIGlmKChpZCBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIGlkO1xuXG4gIHRoaXMuX2Jzb250eXBlID0gJ09iamVjdElkJztcbiAgdmFyIHZhbGlkID0gT2JqZWN0SWQuaXNWYWxpZChpZCk7XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZighdmFsaWQgJiYgaWQgIT0gbnVsbCl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICB9IGVsc2UgaWYodmFsaWQgJiYgdHlwZW9mIGlkID09ICdzdHJpbmcnICYmIGlkLmxlbmd0aCA9PSAyNCkge1xuICAgIHJldHVybiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgfSBlbHNlIGlmKGlkID09IG51bGwgfHwgdHlwZW9mIGlkID09ICdudW1iZXInKSB7XG4gICAgLy8gY29udmVydCB0byAxMiBieXRlIGJpbmFyeSBzdHJpbmdcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gIH0gZWxzZSBpZihpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gdGhpcy50b0hleFN0cmluZygpO1xufVxuXG4vLyBQcmVjb21wdXRlZCBoZXggdGFibGUgZW5hYmxlcyBzcGVlZHkgaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgaGV4VGFibGUgPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgaGV4VGFibGVbaV0gPSAoaSA8PSAxNSA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuXG4gIHZhciBoZXhTdHJpbmcgPSAnJztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICBoZXhTdHJpbmcgKz0gaGV4VGFibGVbdGhpcy5pZC5jaGFyQ29kZUF0KGkpXTtcbiAgfVxuXG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gIHJldHVybiBoZXhTdHJpbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldF9pbmMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE9iamVjdElkLmluZGV4ID0gKE9iamVjdElkLmluZGV4ICsgMSkgJSAweEZGRkZGRjtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge251bWJlcn0gcmV0dXJucyBuZXh0IGluZGV4IHZhbHVlLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0SW5jID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmdldF9pbmMoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gW3RpbWVdIG9wdGlvbmFsIHBhcmFtZXRlciBhbGxvd2luZyB0byBwYXNzIGluIGEgc2Vjb25kIGJhc2VkIHRpbWVzdGFtcC5cbiAqIEByZXR1cm4ge3N0cmluZ30gcmV0dXJuIHRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKCdudW1iZXInICE9IHR5cGVvZiB0aW1lKSB7XG4gICAgdGltZSA9IHBhcnNlSW50KERhdGUubm93KCkvMTAwMCwxMCk7XG4gIH1cblxuICB2YXIgdGltZTRCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpO1xuICAvKiBmb3IgdGltZS1iYXNlZCBPYmplY3RJZCB0aGUgYnl0ZXMgZm9sbG93aW5nIHRoZSB0aW1lIHdpbGwgYmUgemVyb2VkICovXG4gIHZhciBtYWNoaW5lM0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludChNQUNISU5FX0lELCAyNCwgZmFsc2UpO1xuICB2YXIgcGlkMkJ5dGVzID0gQmluYXJ5UGFyc2VyLmZyb21TaG9ydCh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpO1xuICB2YXIgaW5kZXgzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRoaXMuZ2V0X2luYygpLCAyNCwgZmFsc2UsIHRydWUpO1xuXG4gIHJldHVybiB0aW1lNEJ5dGVzICsgbWFjaGluZTNCeXRlcyArIHBpZDJCeXRlcyArIGluZGV4M0J5dGVzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgaWQgaW50byBhIDI0IGJ5dGUgaGV4IHN0cmluZyBmb3IgcHJpbnRpbmdcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgdG8gaXRzIEpTT04gcmVwcmVzZW50YXRpb24uXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge29iamVjdH0gb3RoZXJJRCBPYmplY3RJZCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChvdGhlcklEKSB7XG4gIGlmKG90aGVySUQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpXG4gICAgPyBvdGhlcklELmlkXG4gICAgOiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKG90aGVySUQpLmlkO1xuXG4gIHJldHVybiB0aGlzLmlkID09PSBpZDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtkYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZXRUaW1lc3RhbXAgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG4gIHRpbWVzdGFtcC5zZXRUaW1lKE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpICogMTAwMCk7XG4gIHJldHVybiB0aW1lc3RhbXA7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmNyZWF0ZVBrID0gZnVuY3Rpb24gY3JlYXRlUGsgKCkge1xuICByZXR1cm4gbmV3IE9iamVjdElkKCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElkIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICovXG5PYmplY3RJZC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uIGNyZWF0ZUZyb21UaW1lICh0aW1lKSB7XG4gIHZhciBpZCA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpICtcbiAgICBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KDAsIDY0LCB0cnVlLCB0cnVlKTtcbiAgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SWQuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtzdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJZCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICovXG5PYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24gY3JlYXRlRnJvbUhleFN0cmluZyAoaGV4U3RyaW5nKSB7XG4gIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgaWYodHlwZW9mIGhleFN0cmluZyA9PT0gJ3VuZGVmaW5lZCcgfHwgaGV4U3RyaW5nICE9IG51bGwgJiYgaGV4U3RyaW5nLmxlbmd0aCAhPSAyNClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgdmFyIGxlbiA9IGhleFN0cmluZy5sZW5ndGg7XG5cbiAgaWYobGVuID4gMTIqMikge1xuICAgIHRocm93IG5ldyBFcnJvcignSWQgY2Fubm90IGJlIGxvbmdlciB0aGFuIDEyIGJ5dGVzJyk7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gJydcbiAgICAsIHN0cmluZ1xuICAgICwgbnVtYmVyO1xuXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gIH1cblxuICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuT2JqZWN0SWQuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQoaWQpIHtcbiAgaWYoaWQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT0gdHlwZW9mIGlkICYmIChpZC5sZW5ndGggIT0gMTIgJiYgaWQubGVuZ3RoICE9IDI0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDaGVjayBzcGVjaWZpY2FsbHkgZm9yIGhleCBjb3JyZWN0bmVzc1xuICAgIGlmKHR5cGVvZiBpZCA9PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPT0gMjQpIHJldHVybiBjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3RJZC5wcm90b3R5cGUsIFwiZ2VuZXJhdGlvblRpbWVcIiwge1xuICBlbnVtZXJhYmxlOiB0cnVlXG4gICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICB9XG4gICwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgdGhpcy5pZCA9IHZhbHVlICsgdGhpcy5pZC5zdWJzdHIoNCk7XG4gICAgLy8gZGVsZXRlIHRoaXMuX19pZDtcbiAgICB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gIH1cbn0pO1xuXG4vKipcbiAqIEV4cG9zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcbm1vZHVsZS5leHBvcnRzLk9iamVjdElkID0gT2JqZWN0SWQ7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL3R5cGVzL29iamVjdGlkJylcbiAgLCBtcGF0aCA9IHJlcXVpcmUoJy4vbXBhdGgnKVxuICAsIFN0b3JhZ2VBcnJheVxuICAsIERvY3VtZW50O1xuXG5leHBvcnRzLm1wYXRoID0gbXBhdGg7XG5cbi8qKlxuICogUGx1cmFsaXphdGlvbiBydWxlcy5cbiAqXG4gKiBUaGVzZSBydWxlcyBhcmUgYXBwbGllZCB3aGlsZSBwcm9jZXNzaW5nIHRoZSBhcmd1bWVudCB0byBgcGx1cmFsaXplYC5cbiAqXG4gKi9cbmV4cG9ydHMucGx1cmFsaXphdGlvbiA9IFtcbiAgWy8obSlhbiQvZ2ksICckMWVuJ10sXG4gIFsvKHBlKXJzb24kL2dpLCAnJDFvcGxlJ10sXG4gIFsvKGNoaWxkKSQvZ2ksICckMXJlbiddLFxuICBbL14ob3gpJC9naSwgJyQxZW4nXSxcbiAgWy8oYXh8dGVzdClpcyQvZ2ksICckMWVzJ10sXG4gIFsvKG9jdG9wfHZpcil1cyQvZ2ksICckMWknXSxcbiAgWy8oYWxpYXN8c3RhdHVzKSQvZ2ksICckMWVzJ10sXG4gIFsvKGJ1KXMkL2dpLCAnJDFzZXMnXSxcbiAgWy8oYnVmZmFsfHRvbWF0fHBvdGF0KW8kL2dpLCAnJDFvZXMnXSxcbiAgWy8oW3RpXSl1bSQvZ2ksICckMWEnXSxcbiAgWy9zaXMkL2dpLCAnc2VzJ10sXG4gIFsvKD86KFteZl0pZmV8KFtscl0pZikkL2dpLCAnJDEkMnZlcyddLFxuICBbLyhoaXZlKSQvZ2ksICckMXMnXSxcbiAgWy8oW15hZWlvdXldfHF1KXkkL2dpLCAnJDFpZXMnXSxcbiAgWy8oeHxjaHxzc3xzaCkkL2dpLCAnJDFlcyddLFxuICBbLyhtYXRyfHZlcnR8aW5kKWl4fGV4JC9naSwgJyQxaWNlcyddLFxuICBbLyhbbXxsXSlvdXNlJC9naSwgJyQxaWNlJ10sXG4gIFsvKGtufHd8bClpZmUkL2dpLCAnJDFpdmVzJ10sXG4gIFsvKHF1aXopJC9naSwgJyQxemVzJ10sXG4gIFsvcyQvZ2ksICdzJ10sXG4gIFsvKFteYS16XSkkLywgJyQxJ10sXG4gIFsvJC9naSwgJ3MnXVxuXTtcbnZhciBydWxlcyA9IGV4cG9ydHMucGx1cmFsaXphdGlvbjtcblxuLyoqXG4gKiBVbmNvdW50YWJsZSB3b3Jkcy5cbiAqXG4gKiBUaGVzZSB3b3JkcyBhcmUgYXBwbGllZCB3aGlsZSBwcm9jZXNzaW5nIHRoZSBhcmd1bWVudCB0byBgcGx1cmFsaXplYC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbmV4cG9ydHMudW5jb3VudGFibGVzID0gW1xuICAnYWR2aWNlJyxcbiAgJ2VuZXJneScsXG4gICdleGNyZXRpb24nLFxuICAnZGlnZXN0aW9uJyxcbiAgJ2Nvb3BlcmF0aW9uJyxcbiAgJ2hlYWx0aCcsXG4gICdqdXN0aWNlJyxcbiAgJ2xhYm91cicsXG4gICdtYWNoaW5lcnknLFxuICAnZXF1aXBtZW50JyxcbiAgJ2luZm9ybWF0aW9uJyxcbiAgJ3BvbGx1dGlvbicsXG4gICdzZXdhZ2UnLFxuICAncGFwZXInLFxuICAnbW9uZXknLFxuICAnc3BlY2llcycsXG4gICdzZXJpZXMnLFxuICAncmFpbicsXG4gICdyaWNlJyxcbiAgJ2Zpc2gnLFxuICAnc2hlZXAnLFxuICAnbW9vc2UnLFxuICAnZGVlcicsXG4gICduZXdzJyxcbiAgJ2V4cGVydGlzZScsXG4gICdzdGF0dXMnLFxuICAnbWVkaWEnXG5dO1xudmFyIHVuY291bnRhYmxlcyA9IGV4cG9ydHMudW5jb3VudGFibGVzO1xuXG4vKiFcbiAqIFBsdXJhbGl6ZSBmdW5jdGlvbi5cbiAqXG4gKiBAYXV0aG9yIFRKIEhvbG93YXljaHVrIChleHRyYWN0ZWQgZnJvbSBfZXh0LmpzXylcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgdG8gcGx1cmFsaXplXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBsdXJhbGl6ZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgdmFyIGZvdW5kO1xuICBpZiAoIX51bmNvdW50YWJsZXMuaW5kZXhPZihzdHIudG9Mb3dlckNhc2UoKSkpe1xuICAgIGZvdW5kID0gcnVsZXMuZmlsdGVyKGZ1bmN0aW9uKHJ1bGUpe1xuICAgICAgcmV0dXJuIHN0ci5tYXRjaChydWxlWzBdKTtcbiAgICB9KTtcbiAgICBpZiAoZm91bmRbMF0pIHJldHVybiBzdHIucmVwbGFjZShmb3VuZFswXVswXSwgZm91bmRbMF1bMV0pO1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG4vKiFcbiAqIERldGVybWluZXMgaWYgYGFgIGFuZCBgYmAgYXJlIGRlZXAgZXF1YWwuXG4gKlxuICogTW9kaWZpZWQgZnJvbSBub2RlL2xpYi9hc3NlcnQuanNcbiAqIE1vZGlmaWVkIGZyb20gbW9uZ29vc2UvdXRpbHMuanNcbiAqXG4gKiBAcGFyYW0geyp9IGEgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBiYFxuICogQHBhcmFtIHsqfSBiIGEgdmFsdWUgdG8gY29tcGFyZSB0byBgYWBcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwgKGEsIGIpIHtcbiAgaWYgKGlzU3RvcmFnZU9iamVjdChhKSkgYSA9IGEudG9PYmplY3QoKTtcbiAgaWYgKGlzU3RvcmFnZU9iamVjdChiKSkgYiA9IGIudG9PYmplY3QoKTtcblxuICByZXR1cm4gXy5pc0VxdWFsKGEsIGIpO1xufTtcblxuXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwIChvKSB7XG4gIHJldHVybiAnb2JqZWN0JyA9PSB0eXBlb2Ygb1xuICAgICAgJiYgJ1tvYmplY3QgUmVnRXhwXScgPT0gdG9TdHJpbmcuY2FsbChvKTtcbn1cblxuZnVuY3Rpb24gY2xvbmVSZWdFeHAgKHJlZ2V4cCkge1xuICBpZiAoIWlzUmVnRXhwKHJlZ2V4cCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdOb3QgYSBSZWdFeHAnKTtcbiAgfVxuXG4gIHZhciBmbGFncyA9IFtdO1xuICBpZiAocmVnZXhwLmdsb2JhbCkgZmxhZ3MucHVzaCgnZycpO1xuICBpZiAocmVnZXhwLm11bHRpbGluZSkgZmxhZ3MucHVzaCgnbScpO1xuICBpZiAocmVnZXhwLmlnbm9yZUNhc2UpIGZsYWdzLnB1c2goJ2knKTtcbiAgcmV0dXJuIG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgZmxhZ3Muam9pbignJykpO1xufVxuXG4vKiFcbiAqIE9iamVjdCBjbG9uZSB3aXRoIFN0b3JhZ2UgbmF0aXZlcyBzdXBwb3J0LlxuICpcbiAqIElmIG9wdGlvbnMubWluaW1pemUgaXMgdHJ1ZSwgY3JlYXRlcyBhIG1pbmltYWwgZGF0YSBvYmplY3QuIEVtcHR5IG9iamVjdHMgYW5kIHVuZGVmaW5lZCB2YWx1ZXMgd2lsbCBub3QgYmUgY2xvbmVkLiBUaGlzIG1ha2VzIHRoZSBkYXRhIHBheWxvYWQgc2VudCB0byBNb25nb0RCIGFzIHNtYWxsIGFzIHBvc3NpYmxlLlxuICpcbiAqIEZ1bmN0aW9ucyBhcmUgbmV2ZXIgY2xvbmVkLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBjbG9uZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIGNsb25lZCBvYmplY3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmNsb25lID0gZnVuY3Rpb24gY2xvbmUgKG9iaiwgb3B0aW9ucykge1xuICBpZiAob2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsKVxuICAgIHJldHVybiBvYmo7XG5cbiAgaWYgKCBfLmlzQXJyYXkoIG9iaiApICkge1xuICAgIHJldHVybiBjbG9uZUFycmF5KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggaXNTdG9yYWdlT2JqZWN0KCBvYmogKSApIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmpzb24gJiYgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIG9iai50b0pTT04pIHtcbiAgICAgIHJldHVybiBvYmoudG9KU09OKCBvcHRpb25zICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvYmoudG9PYmplY3QoIG9wdGlvbnMgKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIG9iai5jb25zdHJ1Y3RvciApIHtcbiAgICBzd2l0Y2ggKCBnZXRGdW5jdGlvbk5hbWUoIG9iai5jb25zdHJ1Y3RvciApKSB7XG4gICAgICBjYXNlICdPYmplY3QnOlxuICAgICAgICByZXR1cm4gY2xvbmVPYmplY3Qob2JqLCBvcHRpb25zKTtcbiAgICAgIGNhc2UgJ0RhdGUnOlxuICAgICAgICByZXR1cm4gbmV3IG9iai5jb25zdHJ1Y3RvciggK29iaiApO1xuICAgICAgY2FzZSAnUmVnRXhwJzpcbiAgICAgICAgcmV0dXJuIGNsb25lUmVnRXhwKCBvYmogKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIGlnbm9yZVxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoIG9iaiBpbnN0YW5jZW9mIE9iamVjdElkICkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SWQoIG9iai5pZCApO1xuICB9XG5cbiAgaWYgKCAhb2JqLmNvbnN0cnVjdG9yICYmIF8uaXNPYmplY3QoIG9iaiApICkge1xuICAgIC8vIG9iamVjdCBjcmVhdGVkIHdpdGggT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIHJldHVybiBjbG9uZU9iamVjdCggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIG9iai52YWx1ZU9mICl7XG4gICAgcmV0dXJuIG9iai52YWx1ZU9mKCk7XG4gIH1cbn07XG52YXIgY2xvbmUgPSBleHBvcnRzLmNsb25lO1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAob2JqLCBvcHRpb25zKSB7XG4gIHZhciByZXRhaW5LZXlPcmRlciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5yZXRhaW5LZXlPcmRlclxuICAgICwgbWluaW1pemUgPSBvcHRpb25zICYmIG9wdGlvbnMubWluaW1pemVcbiAgICAsIHJldCA9IHt9XG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlzXG4gICAgLCB2YWxcbiAgICAsIGtcbiAgICAsIGk7XG5cbiAgaWYgKCByZXRhaW5LZXlPcmRlciApIHtcbiAgICBmb3IgKGsgaW4gb2JqKSB7XG4gICAgICB2YWwgPSBjbG9uZSggb2JqW2tdLCBvcHRpb25zICk7XG5cbiAgICAgIGlmICggIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkgKSB7XG4gICAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBmYXN0ZXJcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgayA9IGtleXNbaV07XG4gICAgICB2YWwgPSBjbG9uZShvYmpba10sIG9wdGlvbnMpO1xuXG4gICAgICBpZiAoIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkpIHtcbiAgICAgICAgaWYgKCFoYXNLZXlzKSBoYXNLZXlzID0gdHJ1ZTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtaW5pbWl6ZVxuICAgID8gaGFzS2V5cyAmJiByZXRcbiAgICA6IHJldDtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoYXJyLCBvcHRpb25zKSB7XG4gIHZhciByZXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcmV0LnB1c2goIGNsb25lKCBhcnJbaV0sIG9wdGlvbnMgKSApO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qIVxuICogTWVyZ2VzIGBmcm9tYCBpbnRvIGB0b2Agd2l0aG91dCBvdmVyd3JpdGluZyBleGlzdGluZyBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb21cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UgKHRvLCBmcm9tKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRvW2tleV0pIHtcbiAgICAgIHRvW2tleV0gPSBmcm9tW2tleV07XG4gICAgfSBlbHNlIGlmICggXy5pc09iamVjdChmcm9tW2tleV0pICkge1xuICAgICAgbWVyZ2UodG9ba2V5XSwgZnJvbVtrZXldKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogR2VuZXJhdGVzIGEgcmFuZG9tIHN0cmluZ1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucmFuZG9tID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygpLnN1YnN0cigzKTtcbn07XG5cblxuLyohXG4gKiBSZXR1cm5zIGlmIGB2YCBpcyBhIHN0b3JhZ2Ugb2JqZWN0IHRoYXQgaGFzIGEgYHRvT2JqZWN0KClgIG1ldGhvZCB3ZSBjYW4gdXNlLlxuICpcbiAqIFRoaXMgaXMgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBsaWJzIGxpa2UgRGF0ZS5qcyB3aGljaCBkbyBmb29saXNoIHRoaW5ncyB0byBOYXRpdmVzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdlxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0ID0gZnVuY3Rpb24gKCB2ICkge1xuICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JykpO1xuICAvL1N0b3JhZ2VBcnJheSB8fCAoU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9hcnJheScpKTtcblxuICByZXR1cm4gdiBpbnN0YW5jZW9mIERvY3VtZW50IHx8XG4gICAgICAgKCB2ICYmIHYuaXNTdG9yYWdlQXJyYXkgKTtcbn07XG52YXIgaXNTdG9yYWdlT2JqZWN0ID0gZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3Q7XG5cbi8qIVxuICogUmV0dXJuIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmosIG1hcCkge1xuICByZXR1cm4gbXBhdGguZ2V0KHBhdGgsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxuLyohXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb2JqLCBtYXApIHtcbiAgbXBhdGguc2V0KHBhdGgsIHZhbCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG52YXIgckZ1bmN0aW9uTmFtZSA9IC9eZnVuY3Rpb25cXHMqKFteXFxzKF0rKS87XG5cbmZ1bmN0aW9uIGdldEZ1bmN0aW9uTmFtZSggY3RvciApe1xuICBpZiAoY3Rvci5uYW1lKSB7XG4gICAgcmV0dXJuIGN0b3IubmFtZTtcbiAgfVxuICByZXR1cm4gKGN0b3IudG9TdHJpbmcoKS50cmltKCkubWF0Y2goIHJGdW5jdGlvbk5hbWUgKSB8fCBbXSlbMV07XG59XG5cbmV4cG9ydHMuZ2V0RnVuY3Rpb25OYW1lID0gZ2V0RnVuY3Rpb25OYW1lO1xuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgLy8g0JTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDRgtC10YHRgtC+0LIgKNC+0LrRgNGD0LbQtdC90LjQtSBub2RlLmpzKVxuICBpZiAoIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgKSByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgLy8g0JXRgdC70Lgg0LIg0LHRgNCw0YPQt9C10YDQtSDRg9C20LUg0YDQtdCw0LvQuNC30L7QstCw0L0g0Y3RgtC+0YIg0LzQtdGC0L7QtFxuICBpZiAoIHdpbmRvdy5zZXRJbW1lZGlhdGUgKSByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZTtcblxuICB2YXIgaGVhZCA9IHsgfSwgdGFpbCA9IGhlYWQ7IC8vINC+0YfQtdGA0LXQtNGMINCy0YvQt9C+0LLQvtCyLCAxLdGB0LLRj9C30L3Ri9C5INGB0L/QuNGB0L7QulxuXG4gIHZhciBJRCA9IE1hdGgucmFuZG9tKCk7IC8vINGD0L3QuNC60LDQu9GM0L3Ri9C5INC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAXG5cbiAgZnVuY3Rpb24gb25tZXNzYWdlKGUpIHtcbiAgICBpZihlLmRhdGEgIT0gSUQpIHJldHVybjsgLy8g0L3QtSDQvdCw0YjQtSDRgdC+0L7QsdGJ0LXQvdC40LVcbiAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIHZhciBmdW5jID0gaGVhZC5mdW5jO1xuICAgIGRlbGV0ZSBoZWFkLmZ1bmM7XG4gICAgZnVuYygpO1xuICB9XG5cbiAgaWYod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHsgLy8gSUU5Kywg0LTRgNGD0LPQuNC1INCx0YDQsNGD0LfQtdGA0YtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9ubWVzc2FnZSwgZmFsc2UpO1xuICB9IGVsc2UgeyAvLyBJRThcbiAgICB3aW5kb3cuYXR0YWNoRXZlbnQoICdvbm1lc3NhZ2UnLCBvbm1lc3NhZ2UgKTtcbiAgfVxuXG4gIHJldHVybiB3aW5kb3cucG9zdE1lc3NhZ2UgPyBmdW5jdGlvbihmdW5jKSB7XG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHsgZnVuYzogZnVuYyB9O1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShJRCwgXCIqXCIpO1xuICB9IDpcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XG4gICAgc2V0VGltZW91dChmdW5jLCAwKTtcbiAgfTtcbn0oKSk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcbi8qKlxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBUaGlzIGlzIHdoYXQgbW9uZ29vc2UgdXNlcyB0byBkZWZpbmUgdmlydHVhbCBhdHRyaWJ1dGVzIHZpYSBgU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgZnVsbG5hbWUgaW5zdGFuY2VvZiBtb25nb29zZS5WaXJ0dWFsVHlwZSAvLyB0cnVlXG4gKlxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gVmlydHVhbFR5cGUgKG9wdGlvbnMsIG5hbWUpIHtcbiAgdGhpcy5wYXRoID0gbmFtZTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufVxuXG4vKipcbiAqIERlZmluZXMgYSBnZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5nZXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5zZXQoZnVuY3Rpb24gKHYpIHtcbiAqICAgICAgIHZhciBwYXJ0cyA9IHYuc3BsaXQoJyAnKTtcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xuICogICAgICAgdGhpcy5uYW1lLmxhc3QgPSBwYXJ0c1sxXTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcmV0dXJuIHsqfSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4geyp9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgc2V0dGVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICB2YXIgdiA9IHZhbHVlO1xuICBmb3IgKHZhciBsID0gdGhpcy5zZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gdjtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
