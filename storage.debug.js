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

  self.adapterHooks.documentDefineProperty.call( self, self, path, prototype );
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
}

/**
 * Sets the `val` at the given `path` of object `o`.
 *
 * @param {String} path
 * @param {Anything} val
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
    , part

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
}

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

    //this.discriminator( name, baseSchema );
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
 * @param {String} name   discriminator model name
 * @param {Schema} schema discriminator model schema
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

    schema.callQueue = baseSchema.callQueue.concat(schema.callQueue);
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
 * @param {any} value
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
   * @param {any} value
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
   * @param {any} [args...]
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
   * @param {any} [args...]
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
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
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
 * @param {any} v
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
 * @return {any} the value after applying all getters
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
 * @return {any} the value after applying all setters
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvYmluYXJ5X3BhcnNlci5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2RvY3VtZW50LmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL2Nhc3QuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvZXJyb3IvbWVzc2FnZXMuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvZXJyb3IvbWlzc2luZ1NjaGVtYS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL3ZhbGlkYXRvci5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvaW5kZXguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvaW50ZXJuYWwuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvbXBhdGguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9hcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvYm9vbGVhbi5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvZGF0ZS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvZG9jdW1lbnRhcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvaW5kZXguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL21peGVkLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9udW1iZXIuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL29iamVjdGlkLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9zdHJpbmcuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hdHlwZS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zdGF0ZW1hY2hpbmUuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9lbWJlZGRlZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9vYmplY3RpZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi91dGlscy5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi92aXJ0dWFsdHlwZS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3AxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5eUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25qQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBCaW5hcnkgUGFyc2VyLlxuICogSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBodHRwOi8vanNmcm9taGVsbC5jb20vY2xhc3Nlcy9iaW5hcnktcGFyc2VyIFt2MS4wXVxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21vbmdvZGIvanMtYnNvbi9ibG9iL21hc3Rlci9saWIvYnNvbi9iaW5hcnlfcGFyc2VyLmpzXG4gKi9cbnZhciBjaHIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG52YXIgbWF4Qml0cyA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG5cdG1heEJpdHNbaV0gPSBNYXRoLnBvdygyLCBpKTtcbn1cblxuZnVuY3Rpb24gQmluYXJ5UGFyc2VyIChiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCaW5hcnlQYXJzZXIpKSByZXR1cm4gbmV3IEJpbmFyeVBhcnNlcihiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucyk7XG4gIFxuXHR0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbjtcblx0dGhpcy5hbGxvd0V4Y2VwdGlvbnMgPSBhbGxvd0V4Y2VwdGlvbnM7XG59XG5cbkJpbmFyeVBhcnNlci53YXJuID0gZnVuY3Rpb24gd2FybiAobXNnKSB7XG5cdGlmICh0aGlzLmFsbG93RXhjZXB0aW9ucykge1xuXHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cblx0cmV0dXJuIDE7XG59O1xuXG5CaW5hcnlQYXJzZXIuZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG4gIHZhciBiID0gbmV3IHRoaXMuQnVmZmVyKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuLCBkYXRhKVxuICAgICAgLCB4ID0gYi5yZWFkQml0cygwLCBiaXRzKVxuICAgICAgLCBtYXggPSBtYXhCaXRzW2JpdHNdOyAvL21heCA9IE1hdGgucG93KCAyLCBiaXRzICk7XG4gIFxuICByZXR1cm4gc2lnbmVkICYmIHggPj0gbWF4IC8gMlxuICAgICAgPyB4IC0gbWF4XG4gICAgICA6IHg7XG59O1xuXG5CaW5hcnlQYXJzZXIuZW5jb2RlSW50ID0gZnVuY3Rpb24gZW5jb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG5cdHZhciBtYXggPSBtYXhCaXRzW2JpdHNdO1xuXG4gIGlmIChkYXRhID49IG1heCB8fCBkYXRhIDwgLShtYXggLyAyKSkge1xuICAgIHRoaXMud2FybihcImVuY29kZUludDo6b3ZlcmZsb3dcIik7XG4gICAgZGF0YSA9IDA7XG4gIH1cblxuXHRpZiAoZGF0YSA8IDApIHtcbiAgICBkYXRhICs9IG1heDtcbiAgfVxuXG5cdGZvciAodmFyIHIgPSBbXTsgZGF0YTsgcltyLmxlbmd0aF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGEgJSAyNTYpLCBkYXRhID0gTWF0aC5mbG9vcihkYXRhIC8gMjU2KSk7XG5cblx0Zm9yIChiaXRzID0gLSgtYml0cyA+PiAzKSAtIHIubGVuZ3RoOyBiaXRzLS07IHJbci5sZW5ndGhdID0gXCJcXDBcIik7XG5cbiAgcmV0dXJuICgodGhpcy5iaWdFbmRpYW4gfHwgZm9yY2VCaWdFbmRpYW4pID8gci5yZXZlcnNlKCkgOiByKS5qb2luKFwiXCIpO1xufTtcblxuQmluYXJ5UGFyc2VyLnRvU21hbGwgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TbWFsbCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvQnl0ZSAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21CeXRlICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvU2hvcnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TaG9ydCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvV29yZCAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Xb3JkICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvSW50ICAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21JbnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvTG9uZyAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Mb25nICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRFdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21EV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvUVdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVFXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcblxuLyoqXG4gKiBCaW5hcnlQYXJzZXIgYnVmZmVyIGNvbnN0cnVjdG9yLlxuICovXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXJCdWZmZXIgKGJpZ0VuZGlhbiwgYnVmZmVyKSB7XG4gIHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuIHx8IDA7XG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG59XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gc2V0QnVmZmVyIChkYXRhKSB7XG4gIHZhciBsLCBpLCBiO1xuXG5cdGlmIChkYXRhKSB7XG4gICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICBiID0gdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkobCk7XG5cdFx0Zm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuXHRcdHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuXHR9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmhhc05lZWRlZEJpdHMgPSBmdW5jdGlvbiBoYXNOZWVkZWRCaXRzIChuZWVkZWRCaXRzKSB7XG5cdHJldHVybiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0gLSgtbmVlZGVkQml0cyA+PiAzKTtcbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuY2hlY2tCdWZmZXIgPSBmdW5jdGlvbiBjaGVja0J1ZmZlciAobmVlZGVkQml0cykge1xuXHRpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcImNoZWNrQnVmZmVyOjptaXNzaW5nIGJ5dGVzXCIpO1xuICB9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnJlYWRCaXRzID0gZnVuY3Rpb24gcmVhZEJpdHMgKHN0YXJ0LCBsZW5ndGgpIHtcblx0Ly9zaGwgZml4OiBIZW5yaSBUb3JnZW1hbmUgfjE5OTYgKGNvbXByZXNzZWQgYnkgSm9uYXMgUmFvbmkpXG5cblx0ZnVuY3Rpb24gc2hsIChhLCBiKSB7XG5cdFx0Zm9yICg7IGItLTsgYSA9ICgoYSAlPSAweDdmZmZmZmZmICsgMSkgJiAweDQwMDAwMDAwKSA9PSAweDQwMDAwMDAwID8gYSAqIDIgOiAoYSAtIDB4NDAwMDAwMDApICogMiArIDB4N2ZmZmZmZmYgKyAxKTtcblx0XHRyZXR1cm4gYTtcblx0fVxuXG5cdGlmIChzdGFydCA8IDAgfHwgbGVuZ3RoIDw9IDApIHtcblx0XHRyZXR1cm4gMDtcbiAgfVxuXG5cdHRoaXMuY2hlY2tCdWZmZXIoc3RhcnQgKyBsZW5ndGgpO1xuXG4gIHZhciBvZmZzZXRMZWZ0XG4gICAgLCBvZmZzZXRSaWdodCA9IHN0YXJ0ICUgOFxuICAgICwgY3VyQnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCAtICggc3RhcnQgPj4gMyApIC0gMVxuICAgICwgbGFzdEJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggKyAoIC0oIHN0YXJ0ICsgbGVuZ3RoICkgPj4gMyApXG4gICAgLCBkaWZmID0gY3VyQnl0ZSAtIGxhc3RCeXRlXG4gICAgLCBzdW0gPSAoKHRoaXMuYnVmZmVyWyBjdXJCeXRlIF0gPj4gb2Zmc2V0UmlnaHQpICYgKCgxIDw8IChkaWZmID8gOCAtIG9mZnNldFJpZ2h0IDogbGVuZ3RoKSkgLSAxKSkgKyAoZGlmZiAmJiAob2Zmc2V0TGVmdCA9IChzdGFydCArIGxlbmd0aCkgJSA4KSA/ICh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSAmICgoMSA8PCBvZmZzZXRMZWZ0KSAtIDEpKSA8PCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQgOiAwKTtcblxuXHRmb3IoOyBkaWZmOyBzdW0gKz0gc2hsKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdLCAoZGlmZi0tIDw8IDMpIC0gb2Zmc2V0UmlnaHQpKTtcblxuXHRyZXR1cm4gc3VtO1xufTtcblxuLyoqXG4gKiBFeHBvc2UuXG4gKi9cbkJpbmFyeVBhcnNlci5CdWZmZXIgPSBCaW5hcnlQYXJzZXJCdWZmZXI7XG5cbmV4cG9ydHMuQmluYXJ5UGFyc2VyID0gQmluYXJ5UGFyc2VyO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50Jyk7XG5cbi8vVE9ETzog0L3QsNC/0LjRgdCw0YLRjCDQvNC10YLQvtC0IC51cHNlcnQoIGRvYyApIC0g0L7QsdC90L7QstC70LXQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwLCDQsCDQtdGB0LvQuCDQtdCz0L4g0L3QtdGCLCDRgtC+INGB0L7Qt9C00LDQvdC40LVcblxuLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC70L7Qs9C40LrRgyDRgSBhcGlSZXNvdXJjZSAo0YHQvtGF0YDQsNC90Y/RgtGMINGB0YHRi9C70LrRgyDQvdCwINC90LXQs9C+INC4INC40YHQv9C+0LvRjNC30L7QstGC0Ywg0L/RgNC4INC80LXRgtC+0LTQtSBkb2Muc2F2ZSlcbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC4XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0KHRhdC10LzQsCDQuNC70Lgg0L7QsdGK0LXQutGCINC+0L/QuNGB0LDQvdC40Y8g0YHRhdC10LzRi1xuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICAvLyDQodC+0YXRgNCw0L3QuNC8INC90LDQt9Cy0LDQvdC40LUg0L/RgNC+0YHRgtGA0LDQvdGB0YLQstCwINC40LzRkdC9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgdGhpcy5kb2N1bWVudHMgPSB7fTtcblxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDRgdGB0YvQu9C60YMg0L3QsCBhcGkg0LTQu9GPINC80LXRgtC+0LTQsCAuc2F2ZSgpXG4gIHRoaXMuYXBpID0gYXBpO1xuXG4gIC8vINCY0YHQv9C+0LvRjNC30YPQtdC80LDRjyDRgdGF0LXQvNCwINC00LvRjyDQutC+0LvQu9C10LrRhtC40LhcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8g0J7RgtC+0LHRgNCw0LbQtdC90LjQtSDQvtCx0YrQtdC60YLQsCBkb2N1bWVudHMg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAgKNC00LvRjyDQvdC+0LrQsNGD0YLQsClcbiAgdGhpcy5hcnJheSA9IFtdO1xuICAvLyDQndGD0LbQvdC+INC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDQv9GA0LjQstGP0LfQvtC6INC6INGN0YLQvtC80YMg0YHQstC+0LnRgdGC0LLRgyDQtNC70Y8ga25vY2tvdXRqc1xuICB3aW5kb3cua28gJiYga28udHJhY2soIHRoaXMsIFsnYXJyYXknXSApO1xufVxuXG5Db2xsZWN0aW9uLnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgdHlwZTogJ2plbGx5IGJlYW4nIH0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKFt7IHR5cGU6ICdqZWxseSBiZWFuJyB9LCB7IHR5cGU6ICdzbmlja2VycycgfV0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgX2lkOiAnKioqKionLCB0eXBlOiAnamVsbHkgYmVhbicgfSwgdHJ1ZSk7XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fEFycmF5LjxvYmplY3Q+fSBbZG9jXSAtINCU0L7QutGD0LzQtdC90YJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINC/0YDQuCDQt9Cw0L/RgNC+0YHQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+INCyINC00L7QutGD0LzQtdC90YLQtSlcbiAgICogQHBhcmFtIHtib29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtfc3RvcmFnZVdpbGxNdXRhdGVdIC0g0KTQu9Cw0LMg0LTQvtCx0LDQstC70LXQvdC40Y8g0LzQsNGB0YHQuNCy0LAg0LTQvtC60YPQvNC10L3RgtC+0LIuINGC0L7Qu9GM0LrQviDQtNC70Y8g0LLQvdGD0YLRgNC10L3QvdC10LPQviDQuNGB0L/QvtC70YzQt9C+0LLQsNC90LjRj1xuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHxBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKCBkb2MsIGZpZWxkcywgaW5pdCwgX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgtCwINC90LXRgiwg0LfQvdCw0YfQuNGCINCx0YPQtNC10YIg0L/Rg9GB0YLQvtC5XG4gICAgaWYgKCBkb2MgPT0gbnVsbCApIGRvYyA9IG51bGw7XG5cbiAgICAvLyDQnNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgICBpZiAoIF8uaXNBcnJheSggZG9jICkgKXtcbiAgICAgIHZhciBzYXZlZERvY3MgPSBbXTtcblxuICAgICAgXy5lYWNoKCBkb2MsIGZ1bmN0aW9uKCBkb2MgKXtcbiAgICAgICAgc2F2ZWREb2NzLnB1c2goIHNlbGYuYWRkKCBkb2MsIGZpZWxkcywgaW5pdCwgdHJ1ZSApICk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xuXG4gICAgICByZXR1cm4gc2F2ZWREb2NzO1xuICAgIH1cblxuICAgIHZhciBpZCA9IGRvYyAmJiBkb2MuX2lkO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgiDRg9C20LUg0LXRgdGC0YwsINGC0L4g0L/RgNC+0YHRgtC+INGD0YHRgtCw0L3QvtCy0LjRgtGMINC30L3QsNGH0LXQvdC40Y9cbiAgICBpZiAoIGlkICYmIHRoaXMuZG9jdW1lbnRzWyBpZCBdICl7XG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXS5zZXQoIGRvYyApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXNjcmltaW5hdG9yTWFwcGluZyA9IHRoaXMuc2NoZW1hXG4gICAgICAgID8gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmdcbiAgICAgICAgOiBudWxsO1xuXG4gICAgICB2YXIga2V5ID0gZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290XG4gICAgICAgID8gZGlzY3JpbWluYXRvck1hcHBpbmcua2V5XG4gICAgICAgIDogbnVsbDtcblxuICAgICAgLy8g0JLRi9Cx0LjRgNCw0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQtdGB0YLRjCDQtNC40YHQutGA0LjQvNC40L3QsNGC0L7RgFxuICAgICAgdmFyIHNjaGVtYTtcbiAgICAgIGlmIChrZXkgJiYgZG9jICYmIGRvY1trZXldICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzW2RvY1trZXldXSkge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmV3RG9jID0gbmV3IERvY3VtZW50KCBkb2MsIHRoaXMubmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKTtcbiAgICAgIGlkID0gbmV3RG9jLl9pZC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIC8vINCU0LvRjyDQvtC00LjQvdC+0YfQvdGL0YUg0LTQvtC60YPQvNC10L3RgtC+0LIg0YLQvtC20LUg0L3Rg9C20L3QviAg0LLRi9C30LLQsNGC0Ywgc3RvcmFnZUhhc011dGF0ZWRcbiAgICBpZiAoICFfc3RvcmFnZVdpbGxNdXRhdGUgKXtcbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kb2N1bWVudHNbIGlkIF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCj0LTQsNC70LXQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24ucmVtb3ZlKCBEb2N1bWVudCApO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24ucmVtb3ZlKCB1dWlkICk7XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fG51bWJlcn0gZG9jdW1lbnQgLSDQodCw0Lwg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LXQs9C+IGlkLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oIGRvY3VtZW50ICl7XG4gICAgcmV0dXJuIGRlbGV0ZSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgtGLLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBuYW1lZCBqb2huXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgbmFtZTogJ2pvaG4nIH0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IGF1dGhvcjogJ1NoYWtlc3BlYXJlJywgeWVhcjogMTYxMSB9KTtcbiAgICpcbiAgICogQHBhcmFtIGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge0FycmF5LjxzdG9yYWdlLkRvY3VtZW50Pn1cbiAgICovXG4gIGZpbmQ6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8ud2hlcmUoIHRoaXMuZG9jdW1lbnRzLCBjb25kaXRpb25zICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQv9C+IGlkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWQoIGlkICk7XG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWQ6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICByZXR1cm4gdGhpcy5kb2N1bWVudHNbIF9pZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4gaWQg0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kQnlJZEFuZFJlbW92ZSggaWQgKSAvLyByZXR1cm5zINGBb2xsZWN0aW9uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gICAqL1xuICBmaW5kQnlJZEFuZFJlbW92ZTogZnVuY3Rpb24oIF9pZCApe1xuICAgIHRoaXMucmVtb3ZlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSApO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4gaWQg0LTQvtC60YPQvNC10L3RgiDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRCeUlkXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kQnlJZEFuZFVwZGF0ZTogZnVuY3Rpb24oIF9pZCwgcGF0aCwgdmFsdWUgKXtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoIHRoaXMuZmluZEJ5SWQoIF9pZCApLCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIGZpbmQgb25lIGlwaG9uZSBhZHZlbnR1cmVzXG4gICAqIHN0b3JhZ2UuYWR2ZW50dXJlLmZpbmRPbmUoeyB0eXBlOiAnaXBob25lJyB9KTtcbiAgICpcbiAgICogQHBhcmFtIGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICByZXR1cm4gXy5maW5kV2hlcmUoIHRoaXMuZG9jdW1lbnRzLCBjb25kaXRpb25zICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviDRg9GB0LvQvtCy0LjRjiDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCINC4INGD0LTQsNC70LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRPbmVBbmRSZW1vdmUoIGNvbmRpdGlvbnMgKSAvLyByZXR1cm5zINGBb2xsZWN0aW9uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gICAqL1xuICBmaW5kT25lQW5kUmVtb3ZlOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHRoaXMucmVtb3ZlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSApO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviDRg9GB0LvQvtCy0LjRjiDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRPbmVcbiAgICogQHNlZSBDb2xsZWN0aW9uLnVwZGF0ZVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZGl0aW9uc1xuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kT25lQW5kVXBkYXRlOiBmdW5jdGlvbiggY29uZGl0aW9ucywgcGF0aCwgdmFsdWUgKXtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUoIHRoaXMuZmluZE9uZSggY29uZGl0aW9ucyApLCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0L3QvtCy0LjRgtGMINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UucGxhY2VzLnVwZGF0ZSggc3RvcmFnZS5wbGFjZXMuZmluZEJ5SWQoIDAgKSwge1xuICAgKiAgIG5hbWU6ICdJcmt1dHNrJ1xuICAgKiB9KTtcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ8b2JqZWN0fSBkb2N1bWVudFxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHxCb29sZWFufVxuICAgKi9cbiAgdXBkYXRlOiBmdW5jdGlvbiggZG9jdW1lbnQsIHBhdGgsIHZhbHVlICl7XG4gICAgdmFyIGRvYyA9IHRoaXMuZG9jdW1lbnRzWyBkb2N1bWVudC5faWQgfHwgZG9jdW1lbnQgXTtcblxuICAgIGlmICggZG9jID09IG51bGwgKXtcbiAgICAgIGNvbnNvbGUud2Fybignc3RvcmFnZTo6dXBkYXRlOiBEb2N1bWVudCBpcyBub3QgZm91bmQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvYy5zZXQoIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC90LAg0LjQt9C80LXQvdC10L3QuNGPICjQtNC+0LHQsNCy0LvQtdC90LjQtSwg0YPQtNCw0LvQtdC90LjQtSkg0LTQsNC90L3Ri9GFINCyINC60L7Qu9C70LXQutGG0LjQuFxuICAgKi9cbiAgc3RvcmFnZUhhc011dGF0ZWQ6IGZ1bmN0aW9uKCl7XG4gICAgLy8g0J7QsdC90L7QstC40Lwg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyICjRgdC/0LXRhtC40LDQu9GM0L3QvtC1INC+0YLQvtCx0YDQsNC20LXQvdC40LUg0LTQu9GPINC/0LXRgNC10LHQvtGA0LAg0L3QvtC60LDRg9GC0L7QvClcbiAgICB0aGlzLmFycmF5ID0gXy50b0FycmF5KCB0aGlzLmRvY3VtZW50cyApO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuICAsIE1peGVkU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEvbWl4ZWQnKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIFZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJykuVmFsaWRhdG9yRXJyb3JcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIGNsb25lID0gdXRpbHMuY2xvbmVcbiAgLCBWYWxpZGF0aW9uRXJyb3IgPSBTdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yXG4gICwgSW50ZXJuYWxDYWNoZSA9IHJlcXVpcmUoJy4vaW50ZXJuYWwnKVxuICAsIGRlZXBFcXVhbCA9IHV0aWxzLmRlZXBFcXVhbFxuICAsIERvY3VtZW50QXJyYXlcbiAgLCBTY2hlbWFBcnJheVxuICAsIEVtYmVkZGVkO1xuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LTQvtC60YPQvNC10L3RgtCwLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0g0LfQvdCw0YfQtdC90LjRjywg0LrQvtGC0L7RgNGL0LUg0L3Rg9C20L3QviDRg9GB0YLQsNC90L7QstC40YLRjFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY29sbGVjdGlvbk5hbWVdIC0g0LrQvtC70LvQtdC60YbQuNGPINCyINC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0L3QsNGF0L7QtNC40YLRgdGPINC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDRgdGF0LXQvNCwINC/0L4g0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDRgdC+0LfQtNCw0L0g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+KVxuICogQHBhcmFtIHtCb29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERvY3VtZW50ICggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICl7XG4gIHRoaXMuJF9fID0gbmV3IEludGVybmFsQ2FjaGU7XG4gIHRoaXMuaXNOZXcgPSB0cnVlO1xuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQodHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgZGF0YSApe1xuICAgIGluaXQgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1XG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG5cbiAgICBpZiAoIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IHsgX2lkOiBuZXcgT2JqZWN0SWQoKSB9O1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hIHx8IHNjaGVtYTtcbiAgICAvLyDQodCz0LXQvdC10YDQuNGA0L7QstCw0YLRjCBPYmplY3RJZCwg0LXRgdC70Lgg0L7QvSDQvtGC0YHRg9GC0YHRgtCy0YPQtdGCLCDQvdC+INC10LPQviDRgtGA0LXQsdGD0LXRgiDRgdGF0LXQvNCwXG4gICAgaWYgKCAhdGhpcy5zY2hlbWEgJiYgc2NoZW1hLm9wdGlvbnMuX2lkICl7XG4gICAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgICAgaWYgKCBkYXRhLl9pZCA9PT0gdW5kZWZpbmVkICl7XG4gICAgICAgIGRhdGEuX2lkID0gbmV3IE9iamVjdElkKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCAhc2NoZW1hICl7XG4gICAgdGhyb3cgbmV3IFN0b3JhZ2VFcnJvci5NaXNzaW5nU2NoZW1hRXJyb3IoKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEg0YTQu9Cw0LPQvtC8IGluaXRcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh7IHRlc3Q6ICdib29tJyB9LCB0cnVlKTtcbiAgaWYgKCAnYm9vbGVhbicgPT09IHR5cGVvZiBjb2xsZWN0aW9uTmFtZSApe1xuICAgIGluaXQgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEgc3RyaWN0OiB0cnVlXG4gIC8vIGNvbGxlY3Rpb24uYWRkKHsuLi59LCB0cnVlKTtcbiAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIGZpZWxkcykge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBmaWVsZHM7XG4gICAgZmllbGRzID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBzY2hlbWEub3B0aW9ucyAmJiBzY2hlbWEub3B0aW9ucy5zdHJpY3Q7XG4gICAgdGhpcy4kX18uc2VsZWN0ZWQgPSBmaWVsZHM7XG4gIH1cblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdGhpcy5jb2xsZWN0aW9uID0gd2luZG93LnN0b3JhZ2VbIGNvbGxlY3Rpb25OYW1lIF07XG4gIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcblxuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIGlmICggZGF0YSA9PSBudWxsIHx8ICFkYXRhLl9pZCApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0JTQu9GPINC/0L7QvNC10YnQtdC90LjRjyDQsiDQutC+0LvQu9C10LrRhtC40Y4g0L3QtdC+0LHRhdC+0LTQuNC80L4sINGH0YLQvtCx0Ysg0YMg0LTQvtC60YPQvNC10L3RgtCwINCx0YvQuyBfaWQnKTtcbiAgICB9XG4gICAgLy8g0J/QvtC80LXRgdGC0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LIg0LrQvtC70LvQtdC60YbQuNGOXG4gICAgdGhpcy5jb2xsZWN0aW9uLmRvY3VtZW50c1sgZGF0YS5faWQgXSA9IHRoaXM7XG4gIH1cblxuICB2YXIgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWRQYXRocygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcXVpcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgdGhpcy4kX18uYWN0aXZlUGF0aHMucmVxdWlyZSggcmVxdWlyZWRbaV0gKTtcbiAgfVxuXG4gIHRoaXMuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICB0aGlzLl9kb2MgPSB0aGlzLiRfX2J1aWxkRG9jKCBkYXRhLCBpbml0ICk7XG5cbiAgaWYgKCBpbml0ICl7XG4gICAgdGhpcy5pbml0KCBkYXRhICk7XG4gIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgdGhpcy5zZXQoIGRhdGEsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICB9XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKCB2YXIgbSBpbiBzY2hlbWEubWV0aG9kcyApe1xuICAgIHRoaXNbIG0gXSA9IHNjaGVtYS5tZXRob2RzWyBtIF07XG4gIH1cbiAgLy8gYXBwbHkgc3RhdGljc1xuICBmb3IgKCB2YXIgcyBpbiBzY2hlbWEuc3RhdGljcyApe1xuICAgIHRoaXNbIHMgXSA9IHNjaGVtYS5zdGF0aWNzWyBzIF07XG4gIH1cbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIGRvY3VtZW50cyBzY2hlbWEuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBzY2hlbWFcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNjaGVtYTtcblxuLyoqXG4gKiBCb29sZWFuIGZsYWcgc3BlY2lmeWluZyBpZiB0aGUgZG9jdW1lbnQgaXMgbmV3LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgaXNOZXdcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTmV3O1xuXG4vKipcbiAqIFRoZSBzdHJpbmcgdmVyc2lvbiBvZiB0aGlzIGRvY3VtZW50cyBfaWQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBnZXR0ZXIgZXhpc3RzIG9uIGFsbCBkb2N1bWVudHMgYnkgZGVmYXVsdC4gVGhlIGdldHRlciBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyB0aGUgYGlkYCBbb3B0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2lkKSBvZiBpdHMgYFNjaGVtYWAgdG8gZmFsc2UgYXQgY29uc3RydWN0aW9uIHRpbWUuXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBpZDogZmFsc2UgfSk7XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgU2NoZW1hIG9wdGlvbnMgL2RvY3MvZ3VpZGUuaHRtbCNvcHRpb25zXG4gKiBAcHJvcGVydHkgaWRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlkO1xuXG4vKipcbiAqIEhhc2ggY29udGFpbmluZyBjdXJyZW50IHZhbGlkYXRpb24gZXJyb3JzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgZXJyb3JzXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lcnJvcnM7XG5cbkRvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSB7XG4gIGRvY3VtZW50RGVmaW5lUHJvcGVydHk6ICQubm9vcCxcbiAgZG9jdW1lbnRTZXRJbml0aWFsVmFsdWU6ICQubm9vcCxcbiAgZG9jdW1lbnRHZXRWYWx1ZTogJC5ub29wLFxuICBkb2N1bWVudFNldFZhbHVlOiAkLm5vb3Bcbn07XG5cbi8qKlxuICogQnVpbGRzIHRoZSBkZWZhdWx0IGRvYyBzdHJ1Y3R1cmVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtza2lwSWRdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fYnVpbGREb2NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fYnVpbGREb2MgPSBmdW5jdGlvbiAoIG9iaiwgc2tpcElkICkge1xuICB2YXIgZG9jID0ge31cbiAgICAsIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09IHAgKSB7XG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xuICAgICAgaWYgKCBvYmogJiYgJ19pZCcgaW4gb2JqICkgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcbiAgICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvYztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRvY3VtZW50IHdpdGhvdXQgc2V0dGVycyBvciBtYXJraW5nIGFueXRoaW5nIG1vZGlmaWVkLlxuICpcbiAqIENhbGxlZCBpbnRlcm5hbGx5IGFmdGVyIGEgZG9jdW1lbnQgaXMgcmV0dXJuZWQgZnJvbSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XG4gIHRoaXMuaXNOZXcgPSBmYWxzZTtcblxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcbiAgLy8gaGFuZGxlIGRvY3Mgd2l0aCBwb3B1bGF0ZWQgcGF0aHNcbiAgLyppZiAoIGRvYy5faWQgJiYgb3B0cyAmJiBvcHRzLnBvcHVsYXRlZCAmJiBvcHRzLnBvcHVsYXRlZC5sZW5ndGggKSB7XG4gICAgdmFyIGlkID0gU3RyaW5nKCBkb2MuX2lkICk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLnBvcHVsYXRlZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGl0ZW0gPSBvcHRzLnBvcHVsYXRlZFsgaSBdO1xuICAgICAgdGhpcy5wb3B1bGF0ZWQoIGl0ZW0ucGF0aCwgaXRlbS5fZG9jc1tpZF0sIGl0ZW0gKTtcbiAgICB9XG4gIH0qL1xuXG4gIGluaXQoIHRoaXMsIGRhdGEsIHRoaXMuX2RvYyApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyohXG4gKiBJbml0IGhlbHBlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9iaiByYXcgc2VydmVyIGRvY1xuICogQHBhcmFtIHtPYmplY3R9IGRvYyBvYmplY3Qgd2UgYXJlIGluaXRpYWxpemluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXQgKHNlbGYsIG9iaiwgZG9jLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAsIHNjaGVtYVxuICAgICwgcGF0aFxuICAgICwgaTtcblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICBpID0ga2V5c1tsZW5dO1xuICAgIHBhdGggPSBwcmVmaXggKyBpO1xuICAgIHNjaGVtYSA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG5cbiAgICBpZiAoIXNjaGVtYSAmJiBfLmlzUGxhaW5PYmplY3QoIG9ialsgaSBdICkgJiZcbiAgICAgICAgKCFvYmpbaV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtpXS5jb25zdHJ1Y3RvcikpKSB7XG4gICAgICAvLyBhc3N1bWUgbmVzdGVkIG9iamVjdFxuICAgICAgaWYgKCFkb2NbaV0pIGRvY1tpXSA9IHt9O1xuICAgICAgaW5pdChzZWxmLCBvYmpbaV0sIGRvY1tpXSwgcGF0aCArICcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbaV0gPT09IG51bGwpIHtcbiAgICAgICAgZG9jW2ldID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAob2JqW2ldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgIHNlbGYuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkb2NbaV0gPSBzY2hlbWEuY2FzdChvYmpbaV0sIHNlbGYsIHRydWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvY1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0SW5pdGlhbFZhbHVlLmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIGRvY1tpXSApO1xuICAgICAgfVxuICAgICAgLy8gbWFyayBhcyBoeWRyYXRlZFxuICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuaW5pdChwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHBhdGgsIG9yIG1hbnkgcGF0aHMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIC8vIHBhdGgsIHZhbHVlXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSlcbiAqXG4gKiAgICAgLy8gb2JqZWN0XG4gKiAgICAgZG9jLnNldCh7XG4gKiAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICwgcGF0aDIgOiB7XG4gKiAgICAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICAgfVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIG51bWJlclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIE51bWJlcilcbiAqXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gc3RyaW5nXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgU3RyaW5nKVxuICpcbiAqICAgICAvLyBjaGFuZ2luZyBzdHJpY3QgbW9kZSBiZWhhdmlvclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIHsgc3RyaWN0OiBmYWxzZSB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhdGggcGF0aCBvciBvYmplY3Qgb2Yga2V5L3ZhbHMgdG8gc2V0XG4gKiBAcGFyYW0ge01peGVkfSB2YWwgdGhlIHZhbHVlIHRvIHNldFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcnxldGMuLn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIFwib24tdGhlLWZseVwiIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWxseSBzcGVjaWZ5IG9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGJlaGF2aW9yIG9mIHRoZSBzZXRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCB0eXBlLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlLmNvbnN0cnVjdG9yKSkge1xuICAgIG9wdGlvbnMgPSB0eXBlO1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcbiAgICAsIGFkaG9jID0gdHlwZSAmJiB0cnVlICE9PSB0eXBlXG4gICAgLCBjb25zdHJ1Y3RpbmcgPSB0cnVlID09PSB0eXBlXG4gICAgLCBhZGhvY3M7XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMgJiYgJ3N0cmljdCcgaW4gb3B0aW9uc1xuICAgID8gb3B0aW9ucy5zdHJpY3RcbiAgICA6IHRoaXMuJF9fLnN0cmljdE1vZGU7XG5cbiAgaWYgKGFkaG9jKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgcGF0aCkge1xuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXG5cbiAgICBpZiAobnVsbCA9PT0gcGF0aCB8fCB1bmRlZmluZWQgPT09IHBhdGgpIHtcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XG4gICAgICBwYXRoID0gdmFsO1xuICAgICAgdmFsID0gX3RlbXA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHByZWZpeCA9IHZhbFxuICAgICAgICA/IHZhbCArICcuJ1xuICAgICAgICA6ICcnO1xuXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGgpXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgICAgICwgcGF0aHR5cGVcbiAgICAgICAgLCBrZXk7XG5cblxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBwYXRodHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHByZWZpeCArIGtleSk7XG4gICAgICAgIGlmIChudWxsICE9IHBhdGhba2V5XVxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXG4gICAgICAgICAgICAmJiBfLmlzUGxhaW5PYmplY3QocGF0aFtrZXldKVxuICAgICAgICAgICAgJiYgKCAhcGF0aFtrZXldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShwYXRoW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPSBwYXRodHlwZVxuICAgICAgICAgICAgJiYgISggdGhpcy4kX19wYXRoKCBwcmVmaXggKyBrZXkgKSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hIClcbiAgICAgICAgICAgICYmICEoIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0gJiYgdGhpcy5zY2hlbWEucGF0aHNba2V5XS5vcHRpb25zLnJlZiApXG4gICAgICAgICAgKXtcblxuICAgICAgICAgIHRoaXMuc2V0KHBhdGhba2V5XSwgcHJlZml4ICsga2V5LCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgaWYgKCdyZWFsJyA9PT0gcGF0aHR5cGUgfHwgJ3ZpcnR1YWwnID09PSBwYXRodHlwZSkge1xuICAgICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG5cbiAgICAgICAgICB9IGVsc2UgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBrZXkgKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkICE9PSBwYXRoW2tleV0pIHtcbiAgICAgICAgICB0aGlzLnNldChwcmVmaXggKyBrZXksIHBhdGhba2V5XSwgY29uc3RydWN0aW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICAvLyBlbnN1cmUgX3N0cmljdCBpcyBob25vcmVkIGZvciBvYmogcHJvcHNcbiAgLy8gZG9jc2NoZW1hID0gbmV3IFNjaGVtYSh7IHBhdGg6IHsgbmVzdDogJ3N0cmluZycgfX0pXG4gIC8vIGRvYy5zZXQoJ3BhdGgnLCBvYmopO1xuICB2YXIgcGF0aFR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwYXRoKTtcbiAgaWYgKCduZXN0ZWQnID09IHBhdGhUeXBlICYmIHZhbCAmJiBfLmlzUGxhaW5PYmplY3QodmFsKSAmJlxuICAgICAgKCF2YWwuY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHZhbC5jb25zdHJ1Y3RvcikpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT0gcGF0aFR5cGUgJiYgc3RyaWN0KSB7XG5cbiAgICAvLyBjaGVjayBmb3Igcm9vdHMgdGhhdCBhcmUgTWl4ZWQgdHlwZXNcbiAgICB2YXIgbWl4ZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSsxKS5qb2luKCcuJyk7XG4gICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICAgICAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hKSB7XG4gICAgICAgIC8vIGFsbG93IGNoYW5nZXMgdG8gc3ViIHBhdGhzIG9mIG1peGVkIHR5cGVzXG4gICAgICAgIG1peGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtaXhlZCkge1xuICAgICAgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpZWxkIGBcIiArIHBhdGggKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgfSBlbHNlIGlmICgndmlydHVhbCcgPT0gcGF0aFR5cGUpIHtcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKTtcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xuICB9XG5cbiAgdmFyIHBhdGhUb01hcms7XG5cbiAgLy8gV2hlbiB1c2luZyB0aGUgJHNldCBvcGVyYXRvciB0aGUgcGF0aCB0byB0aGUgZmllbGQgbXVzdCBhbHJlYWR5IGV4aXN0LlxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxuXG4gIGlmIChwYXJ0cy5sZW5ndGggPD0gMSkge1xuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9IGVsc2Uge1xuICAgIGZvciAoIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcbiAgICAgIGlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQoc3VicGF0aCkgLy8gZWFybGllciBwcmVmaXhlcyB0aGF0IGFyZSBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmtlZCBhcyBkaXJ0eSBoYXZlIHByZWNlZGVuY2VcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xuICAgICAgICBwYXRoVG9NYXJrID0gc3VicGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfVxuXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXG4gIHZhciBwcmlvclZhbCA9IGNvbnN0cnVjdGluZ1xuICAgID8gdW5kZWZpbmVkXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xuXG4gIGlmICghc2NoZW1hIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNob3VsZFNldCA9IHRoaXMuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XG4gIH0pO1xuXG4gIGlmIChzaG91bGRTZXQpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSBzaG91bGQgbWFyayB0aGlzIGNoYW5nZSBhcyBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXG4gICAgcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKSB7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xuXG4gIGlmICggdW5kZWZpbmVkID09PSB2YWwgJiYgIXRoaXMuaXNTZWxlY3RlZChwYXRoKSApIHtcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcbiAgICAvLyB2YWx1ZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IHZhbCAmJiBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSB7XG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF1dGlscy5kZWVwRXF1YWwodmFsLCBwcmlvclZhbCB8fCB0aGlzLmdldChwYXRoKSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8v0YLQtdGB0YIg0L3QtSDQv9GA0L7RhdC+0LTQuNGCINC40Lct0LfQsCDQvdCw0LvQuNGH0LjRjyDQu9C40YjQvdC10LPQviDQv9C+0LvRjyDQsiBzdGF0ZXMuZGVmYXVsdCAoY29tbWVudHMpXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XG4gIC8vY29uc29sZS5pbmZvKCBwYXRoLCBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICk7XG4gIC8vY29uc29sZS5sb2coIHRoaXMuJF9fLmFjdGl2ZVBhdGhzICk7XG5cbiAgLy8g0JrQvtCz0LTQsCDQvNGLINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INGC0LDQutC+0LUg0LbQtSDQt9C90LDRh9C10L3QuNC1INC60LDQuiBkZWZhdWx0XG4gIC8vINCd0LUg0L/QvtC90Y/RgtC90L4g0LfQsNGH0LXQvCDQvNCw0L3Qs9GD0YHRgiDQtdCz0L4g0L7QsdC90L7QstC70Y/Qu1xuICAvKmlmICghY29uc3RydWN0aW5nICYmXG4gICAgICBudWxsICE9IHZhbCAmJlxuICAgICAgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCAmJlxuICAgICAgdXRpbHMuZGVlcEVxdWFsKHZhbCwgc2NoZW1hLmdldERlZmF1bHQodGhpcywgY29uc3RydWN0aW5nKSkgKSB7XG5cbiAgICAvL2NvbnNvbGUubG9nKCBwYXRoVG9NYXJrLCB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5ICk7XG5cbiAgICAvLyBhIHBhdGggd2l0aCBhIGRlZmF1bHQgd2FzICR1bnNldCBvbiB0aGUgc2VydmVyXG4gICAgLy8gYW5kIHRoZSB1c2VyIGlzIHNldHRpbmcgaXQgdG8gdGhlIHNhbWUgdmFsdWUgYWdhaW5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSovXG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBhY3R1YWwgc2V0dGluZyBvZiB0aGUgdmFsdWUgYW5kIG1hcmtpbmcgdGhlIHBhdGggbW9kaWZpZWQgaWYgYXBwcm9wcmlhdGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXQgPSBmdW5jdGlvbiAoIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCApIHtcbiAgdmFyIHNob3VsZE1vZGlmeSA9IHRoaXMuJF9fc2hvdWxkTW9kaWZ5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKHNob3VsZE1vZGlmeSkge1xuICAgIHRoaXMubWFya01vZGlmaWVkKHBhdGhUb01hcmssIHZhbCk7XG4gIH1cblxuICB2YXIgb2JqID0gdGhpcy5fZG9jXG4gICAgLCBpID0gMFxuICAgICwgbCA9IHBhcnRzLmxlbmd0aDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaSArIDFcbiAgICAgICwgbGFzdCA9IG5leHQgPT09IGw7XG5cbiAgICBpZiAoIGxhc3QgKSB7XG4gICAgICBvYmpbcGFydHNbaV1dID0gdmFsO1xuXG4gICAgICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGgsIHZhbCApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbcGFydHNbaV1dICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmICdFbWJlZGRlZERvY3VtZW50JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IpICkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgQXJyYXkuaXNBcnJheShvYmpbcGFydHNbaV1dKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSByYXcgdmFsdWUgZnJvbSBhIHBhdGggKG5vIGdldHRlcnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUocGF0aCwgdGhpcy5fZG9jKTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJhdyB2YWx1ZSBmb3IgYSBwYXRoIChubyBjYXN0aW5nLCBzZXR0ZXJzLCB0cmFuc2Zvcm1hdGlvbnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWx1ZSkge1xuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGEgcGF0aC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBwYXRoXG4gKiAgICAgZG9jLmdldCgnYWdlJykgLy8gNDdcbiAqXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXG4gKiAgICAgZG9jLmdldCgnYWdlJywgU3RyaW5nKSAvLyBcIjQ3XCJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIG9uLXRoZS1mbHkgYXR0cmlidXRlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoLCB0eXBlKSB7XG4gIHZhciBhZGhvY3M7XG4gIGlmICh0eXBlKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgdmFyIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKSB8fCB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKVxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgLCBvYmogPSB0aGlzLl9kb2M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkID09PSBvYmogfHwgbnVsbCA9PT0gb2JqXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcbiAgfVxuXG4gIGlmIChzY2hlbWEpIHtcbiAgICBvYmogPSBzY2hlbWEuYXBwbHlHZXR0ZXJzKG9iaiwgdGhpcyk7XG4gIH1cblxuICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudEdldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGggKTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzY2hlbWF0eXBlIGZvciB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHNcbiAgICAsIGFkaG9jVHlwZSA9IGFkaG9jcyAmJiBhZGhvY3NbcGF0aF07XG5cbiAgaWYgKGFkaG9jVHlwZSkge1xuICAgIHJldHVybiBhZGhvY1R5cGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgdGhlIHBhdGggYXMgaGF2aW5nIHBlbmRpbmcgY2hhbmdlcyB0byB3cml0ZSB0byB0aGUgZGIuXG4gKlxuICogX1ZlcnkgaGVscGZ1bCB3aGVuIHVzaW5nIFtNaXhlZF0oLi9zY2hlbWF0eXBlcy5odG1sI21peGVkKSB0eXBlcy5fXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZXMgdG8gbWl4ZWQudHlwZSBhcmUgbm93IHBlcnNpc3RlZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIG1hcmsgbW9kaWZpZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG59O1xuXG4vKipcbiAqIENhdGNoZXMgZXJyb3JzIHRoYXQgb2NjdXIgZHVyaW5nIGV4ZWN1dGlvbiBvZiBgZm5gIGFuZCBzdG9yZXMgdGhlbSB0byBsYXRlciBiZSBwYXNzZWQgd2hlbiBgc2F2ZSgpYCBpcyBleGVjdXRlZC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXSB0aGUgc2NvcGUgd2l0aCB3aGljaCB0byBjYWxsIGZuXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fdHJ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3RyeSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgdmFyIHJlcztcbiAgdHJ5IHtcbiAgICBmbi5jYWxsKHNjb3BlKTtcbiAgICByZXMgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy4kX19lcnJvcihlKTtcbiAgICByZXMgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsaXN0IG9mIHBhdGhzIHRoYXQgaGF2ZSBiZWVuIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1vZGlmaWVkUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJlY3RNb2RpZmllZFBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG5cbiAgcmV0dXJuIGRpcmVjdE1vZGlmaWVkUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChsaXN0LCBwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHJldHVybiBsaXN0LmNvbmNhdChwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKGNoYWlucywgcGFydCwgaSkge1xuICAgICAgcmV0dXJuIGNoYWlucy5jb25jYXQocGFydHMuc2xpY2UoMCwgaSkuY29uY2F0KHBhcnQpLmpvaW4oJy4nKSk7XG4gICAgfSwgW10pKTtcbiAgfSwgW10pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhpcyBkb2N1bWVudCB3YXMgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogSWYgYHBhdGhgIGlzIGdpdmVuLCBjaGVja3MgaWYgYSBwYXRoIG9yIGFueSBmdWxsIHBhdGggY29udGFpbmluZyBgcGF0aGAgYXMgcGFydCBvZiBpdHMgcGF0aCBjaGFpbiBoYXMgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoKSAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMnKSAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpICAgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdIG9wdGlvbmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aFxuICAgID8gISF+dGhpcy5tb2RpZmllZFBhdGhzKCkuaW5kZXhPZihwYXRoKVxuICAgIDogdGhpcy4kX18uYWN0aXZlUGF0aHMuc29tZSgnbW9kaWZ5Jyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgcGF0aGAgd2FzIGRpcmVjdGx5IHNldCBhbmQgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0RpcmVjdE1vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBpbml0aWFsaXplZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0luaXQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBzZWxlY3RlZCBpbiB0aGUgc291cmNlIHF1ZXJ5IHdoaWNoIGluaXRpYWxpemVkIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgVGhpbmcuZmluZE9uZSgpLnNlbGVjdCgnbmFtZScpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ25hbWUnKSAvLyB0cnVlXG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ2FnZScpICAvLyBmYWxzZVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gaXNTZWxlY3RlZCAocGF0aCkge1xuICBpZiAodGhpcy4kX18uc2VsZWN0ZWQpIHtcblxuICAgIGlmICgnX2lkJyA9PT0gcGF0aCkge1xuICAgICAgcmV0dXJuIDAgIT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5zZWxlY3RlZClcbiAgICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICAgLCBpbmNsdXNpdmUgPSBmYWxzZVxuICAgICAgLCBjdXI7XG5cbiAgICBpZiAoMSA9PT0gaSAmJiAnX2lkJyA9PT0gcGF0aHNbMF0pIHtcbiAgICAgIC8vIG9ubHkgX2lkIHdhcyBzZWxlY3RlZC5cbiAgICAgIHJldHVybiAwID09PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY3VyID0gcGF0aHNbaV07XG4gICAgICBpZiAoJ19pZCcgPT0gY3VyKSBjb250aW51ZTtcbiAgICAgIGluY2x1c2l2ZSA9ICEhIHRoaXMuJF9fLnNlbGVjdGVkW2N1cl07XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICB9XG5cbiAgICBpID0gcGF0aHMubGVuZ3RoO1xuICAgIHZhciBwYXRoRG90ID0gcGF0aCArICcuJztcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XG5cbiAgICAgIGlmICgwID09PSBjdXIuaW5kZXhPZihwYXRoRG90KSkge1xuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgICAgfVxuXG4gICAgICBpZiAoMCA9PT0gcGF0aERvdC5pbmRleE9mKGN1ciArICcuJykpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gISBpbmNsdXNpdmU7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRXhlY3V0ZXMgcmVnaXN0ZXJlZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGlzIGRvY3VtZW50LlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBgcHJlYCBzYXZlIGFuZCBpZiBhIHZhbGlkYXRpb24gcnVsZSBpcyB2aW9sYXRlZCwgW3NhdmVdKCNtb2RlbF9Nb2RlbC1zYXZlKSBpcyBhYm9ydGVkIGFuZCB0aGUgZXJyb3IgaXMgcmV0dXJuZWQgdG8geW91ciBgY2FsbGJhY2tgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgaWYgKGVycikgaGFuZGxlRXJyb3IoZXJyKTtcbiAqICAgICAgIGVsc2UgLy8gdmFsaWRhdGlvbiBwYXNzZWRcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBjYWxsZWQgYWZ0ZXIgdmFsaWRhdGlvbiBjb21wbGV0ZXMsIHBhc3NpbmcgYW4gZXJyb3IgaWYgb25lIG9jY3VycmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIG9ubHkgdmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzIHdoZW4gbmVjZXNzYXJ5XG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlKS5maWx0ZXIoZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBpZiAoIXNlbGYuaXNTZWxlY3RlZChwYXRoKSAmJiAhc2VsZi5pc01vZGlmaWVkKHBhdGgpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5pbml0KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpKTtcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpKTtcblxuICBpZiAoMCA9PT0gcGF0aHMubGVuZ3RoKSB7XG4gICAgY29tcGxldGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB2YWxpZGF0aW5nID0ge31cbiAgICAsIHRvdGFsID0gMDtcblxuICBwYXRocy5mb3JFYWNoKHZhbGlkYXRlUGF0aCk7XG4gIHJldHVybiB0aGlzO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlUGF0aCAocGF0aCkge1xuICAgIGlmICh2YWxpZGF0aW5nW3BhdGhdKSByZXR1cm47XG5cbiAgICB2YWxpZGF0aW5nW3BhdGhdID0gdHJ1ZTtcbiAgICB0b3RhbCsrO1xuXG4gICAgdXRpbHMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgcCA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgICBpZiAoIXApIHJldHVybiAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XG5cbiAgICAgIHZhciB2YWwgPSBzZWxmLmdldFZhbHVlKHBhdGgpO1xuICAgICAgcC5kb1ZhbGlkYXRlKHZhbCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgc2VsZi5pbnZhbGlkYXRlKFxuICAgICAgICAgICAgICBwYXRoXG4gICAgICAgICAgICAsIGVyclxuICAgICAgICAgICAgLCB1bmRlZmluZWRcbiAgICAgICAgICAgIC8vLCB0cnVlIC8vIGVtYmVkZGVkIGRvY3NcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuICAgICAgfSwgc2VsZik7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21wbGV0ZSAoKSB7XG4gICAgdmFyIGVyciA9IHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgICBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgY2IgJiYgY2IoZXJyKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogVGhlIGBlcnJvck1zZ2AgYXJndW1lbnQgd2lsbCBiZWNvbWUgdGhlIG1lc3NhZ2Ugb2YgdGhlIGBWYWxpZGF0aW9uRXJyb3JgLlxuICpcbiAqIFRoZSBgdmFsdWVgIGFyZ3VtZW50IChpZiBwYXNzZWQpIHdpbGwgYmUgYXZhaWxhYmxlIHRocm91Z2ggdGhlIGBWYWxpZGF0aW9uRXJyb3IudmFsdWVgIHByb3BlcnR5LlxuICpcbiAqICAgICBkb2MuaW52YWxpZGF0ZSgnc2l6ZScsICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsIDE0KTtcblxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gKiAgICAgICAvLyBwcmludHNcbiAqICAgICAgIHsgbWVzc2FnZTogJ1ZhbGlkYXRpb24gZmFpbGVkJyxcbiAqICAgICAgICAgbmFtZTogJ1ZhbGlkYXRpb25FcnJvcicsXG4gKiAgICAgICAgIGVycm9yczpcbiAqICAgICAgICAgIHsgc2l6ZTpcbiAqICAgICAgICAgICAgIHsgbWVzc2FnZTogJ211c3QgYmUgbGVzcyB0aGFuIDIwJyxcbiAqICAgICAgICAgICAgICAgbmFtZTogJ1ZhbGlkYXRvckVycm9yJyxcbiAqICAgICAgICAgICAgICAgcGF0aDogJ3NpemUnLFxuICogICAgICAgICAgICAgICB0eXBlOiAndXNlciBkZWZpbmVkJyxcbiAqICAgICAgICAgICAgICAgdmFsdWU6IDE0IH0gfSB9XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVycm9yTXNnIHRoZSBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ3xOdW1iZXJ8YW55fSB2YWx1ZSBvcHRpb25hbCBpbnZhbGlkIHZhbHVlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnJvck1zZywgdmFsdWUpIHtcbiAgaWYgKCF0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IpIHtcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSBuZXcgVmFsaWRhdGlvbkVycm9yKHRoaXMpO1xuICB9XG5cbiAgaWYgKCFlcnJvck1zZyB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIGVycm9yTXNnKSB7XG4gICAgZXJyb3JNc2cgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgZXJyb3JNc2csICd1c2VyIGRlZmluZWQnLCB2YWx1ZSk7XG4gIH1cblxuICBpZiAodGhpcy4kX18udmFsaWRhdGlvbkVycm9yID09IGVycm9yTXNnKSByZXR1cm47XG5cbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yLmVycm9yc1twYXRoXSA9IGVycm9yTXNnO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIGludGVybmFsIG1vZGlmaWVkIHN0YXRlIG9mIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqIEBtZXRob2QgJF9fcmVzZXRcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19yZXNldCA9IGZ1bmN0aW9uIHJlc2V0ICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gc2VsZi5nZXRWYWx1ZShpKTtcbiAgfSlcbiAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHZhbCAmJiB2YWwuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICB9KVxuICAuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykgY29udGludWU7XG4gICAgICBkb2MuJF9fcmVzZXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsZWFyICdtb2RpZnknKCdkaXJ0eScpIGNhY2hlXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLmNsZWFyKCdtb2RpZnknKTtcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmVycm9ycyA9IHVuZGVmaW5lZDtcbiAgLy9jb25zb2xlLmxvZyggc2VsZi4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUgKTtcbiAgLy9UT0RPOiDRgtGD0YJcbiAgdGhpcy5zY2hlbWEucmVxdWlyZWRQYXRocygpLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKHBhdGgpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIGRpcnR5IHBhdGhzIC8gdmFscy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGlydHlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBhbGwgPSB0aGlzLiRfXy5hY3RpdmVQYXRocy5tYXAoJ21vZGlmeScsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxuICAgICAgICAgICAsIHZhbHVlOiBzZWxmLmdldFZhbHVlKCBwYXRoIClcbiAgICAgICAgICAgLCBzY2hlbWE6IHNlbGYuJF9fcGF0aCggcGF0aCApIH07XG4gIH0pO1xuXG4gIC8vIFNvcnQgZGlydHkgcGF0aHMgaW4gYSBmbGF0IGhpZXJhcmNoeS5cbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gKGEucGF0aCA8IGIucGF0aCA/IC0xIDogKGEucGF0aCA+IGIucGF0aCA/IDEgOiAwKSk7XG4gIH0pO1xuXG4gIC8vIElnbm9yZSBcImZvby5hXCIgaWYgXCJmb29cIiBpcyBkaXJ0eSBhbHJlYWR5LlxuICB2YXIgbWluaW1hbCA9IFtdXG4gICAgLCBsYXN0UGF0aFxuICAgICwgdG9wO1xuXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XG4gICAgbGFzdFBhdGggPSBpdGVtLnBhdGggKyAnLic7XG4gICAgbWluaW1hbC5wdXNoKGl0ZW0pO1xuICAgIHRvcCA9IGl0ZW07XG4gIH0pO1xuXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcbiAgcmV0dXJuIG1pbmltYWw7XG59O1xuXG4vKiFcbiAqIENvbXBpbGVzIHNjaGVtYXMuXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHNlbGYsIHRyZWUsIHByb3RvLCBwcmVmaXgpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBsaW1iXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgbGltYiA9IHRyZWVba2V5XTtcblxuICAgIGRlZmluZShzZWxmXG4gICAgICAgICwga2V5XG4gICAgICAgICwgKCgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGxpbWIuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAmJiAoIWxpbWIudHlwZSB8fCBsaW1iLnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgID8gbGltYlxuICAgICAgICAgICAgICAgOiBudWxsKVxuICAgICAgICAsIHByb3RvXG4gICAgICAgICwgcHJlZml4XG4gICAgICAgICwga2V5cyk7XG4gIH1cbn1cblxuLy8gZ2V0cyBkZXNjcmlwdG9ycyBmb3IgYWxsIHByb3BlcnRpZXMgb2YgYG9iamVjdGBcbi8vIG1ha2VzIGFsbCBwcm9wZXJ0aWVzIG5vbi1lbnVtZXJhYmxlIHRvIG1hdGNoIHByZXZpb3VzIGJlaGF2aW9yIHRvICMyMjExXG5mdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgcmVzdWx0W2tleV0uZW51bWVyYWJsZSA9IGZhbHNlO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiFcbiAqIERlZmluZXMgdGhlIGFjY2Vzc29yIG5hbWVkIHByb3Agb24gdGhlIGluY29taW5nIHByb3RvdHlwZS5cbiAqINGC0LDQvCDQttC1LCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LAg0YHQtNC10LvQsNC10Lwg0L3QsNCx0LvRjtC00LDQtdC80YvQvNC4XG4gKi9cbmZ1bmN0aW9uIGRlZmluZSAoc2VsZiwgcHJvcCwgc3VicHJvcHMsIHByb3RvdHlwZSwgcHJlZml4LCBrZXlzKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIHBhdGggPSAocHJlZml4ID8gcHJlZml4ICsgJy4nIDogJycpICsgcHJvcDtcblxuICBpZiAoc3VicHJvcHMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnMgPSB7fTtcblxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSBzY29wZSBmb3IgbmVzdGVkIGdldHRlcnMvc2V0dGVyc1xuICAgICAgICAgICAgaWYgKCFwcmVmaXgpIG5lc3RlZC4kX18uc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBzaGFkb3cgaW5oZXJpdGVkIGdldHRlcnMgZnJvbSBzdWItb2JqZWN0cyBzb1xuICAgICAgICAgICAgLy8gdGhpbmcubmVzdGVkLm5lc3RlZC5uZXN0ZWQuLi4gZG9lc24ndCBvY2N1ciAoZ2gtMzY2KVxuICAgICAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgICAgICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgLy8gb3Zlci13cml0ZSB0aGUgcGFyZW50cyBnZXR0ZXIgd2l0aG91dCB0cmlnZ2VyaW5nIGl0XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXN0ZWQsIGtleXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlICAgLy8gSXQgZG9lc24ndCBzaG93IHVwLlxuICAgICAgICAgICAgICAgICwgd3JpdGFibGU6IHRydWUgICAgICAvLyBXZSBjYW4gc2V0IGl0IGxhdGVyLlxuICAgICAgICAgICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlICAvLyBXZSBjYW4gT2JqZWN0LmRlZmluZVByb3BlcnR5IGFnYWluLlxuICAgICAgICAgICAgICAgICwgdmFsdWU6IHVuZGVmaW5lZCAgICAvLyBJdCBzaGFkb3dzIGl0cyBwYXJlbnQuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXN0ZWQudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChwYXRoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbXBpbGUoIHNlbGYsIHN1YnByb3BzLCBuZXN0ZWQsIHBhdGggKTtcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnNbcGF0aF0gPSBuZXN0ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuJF9fLmdldHRlcnNbcGF0aF07XG4gICAgICAgIH1cbiAgICAgICwgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgRG9jdW1lbnQpIHYgPSB2LnRvT2JqZWN0KCk7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLiRfXy5zY29wZSB8fCB0aGlzKS5zZXQoIHBhdGgsIHYgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoICkgeyByZXR1cm4gdGhpcy5nZXQuY2FsbCh0aGlzLiRfXy5zY29wZSB8fCB0aGlzLCBwYXRoKTsgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzLnNldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgsIHYpOyB9XG4gICAgfSk7XG4gIH1cblxuICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIHByb3RvdHlwZSApO1xufVxuXG4vKipcbiAqIEFzc2lnbnMvY29tcGlsZXMgYHNjaGVtYWAgaW50byB0aGlzIGRvY3VtZW50cyBwcm90b3R5cGUuXG4gKlxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFNjaGVtYVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXRTY2hlbWEgPSBmdW5jdGlvbiAoIHNjaGVtYSApIHtcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIGNvbXBpbGUoIHRoaXMsIHNjaGVtYS50cmVlLCB0aGlzICk7XG59O1xuXG4vKipcbiAqIEdldCBhbGwgc3ViZG9jcyAoYnkgYmZzKVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBbGxTdWJkb2NzXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2dldEFsbFN1YmRvY3MgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG4gIEVtYmVkZGVkID0gRW1iZWRkZWQgfHwgcmVxdWlyZSgnLi90eXBlcy9lbWJlZGRlZCcpO1xuXG4gIGZ1bmN0aW9uIGRvY1JlZHVjZXIoc2VlZCwgcGF0aCkge1xuICAgIHZhciB2YWwgPSB0aGlzW3BhdGhdO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkpXG4gICAgICB2YWwuZm9yRWFjaChmdW5jdGlvbiBfZG9jUmVkdWNlKGRvYykge1xuICAgICAgICBpZiAoIWRvYyB8fCAhZG9jLl9kb2MpIHJldHVybjtcbiAgICAgICAgaWYgKGRvYyBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2goZG9jKTtcbiAgICAgICAgc2VlZCA9IE9iamVjdC5rZXlzKGRvYy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKGRvYy5fZG9jKSwgc2VlZCk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gc2VlZDtcbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQodGhpcyksIFtdKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIGdlbmVyaWMgc2F2ZSBzdHVmZi5cbiAqIHRvIHNvbHZlICMxNDQ2IHVzZSB1c2UgaGllcmFyY2h5IGluc3RlYWQgb2YgaG9va3NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcHJlc2F2ZVZhbGlkYXRlXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3ByZXNhdmVWYWxpZGF0ZSA9IGZ1bmN0aW9uICRfX3ByZXNhdmVWYWxpZGF0ZSgpIHtcbiAgLy8gaWYgYW55IGRvYy5zZXQoKSBjYWxscyBmYWlsZWRcblxuICB2YXIgZG9jcyA9IHRoaXMuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUoKTtcblxuICB2YXIgZTIgPSBkb2NzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYy4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgfSk7XG4gIHZhciBlMSA9IFt0aGlzLiRfXy5zYXZlRXJyb3JdLmNvbmNhdChlMik7XG4gIHZhciBlcnIgPSBlMS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtyZXR1cm4geH0pWzBdO1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBudWxsO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgcGF0aCB0aGF0IHdlcmUgY2hhbmdlZCBhbmQgYXJlIGFycmF5c1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcblxuICAvLyB2YWxpZGF0ZSBhbGwgZG9jdW1lbnQgYXJyYXlzLlxuICByZXR1cm4gdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgICAubWFwKCdpbml0JywgJ21vZGlmeScsIGZ1bmN0aW9uIChpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRWYWx1ZShpKTtcbiAgICB9LmJpbmQodGhpcykpXG4gICAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgICByZXR1cm4gdmFsICYmIHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24oc2VlZCwgYXJyYXkpIHtcbiAgICAgIHJldHVybiBzZWVkLmNvbmNhdChhcnJheSk7XG4gICAgfSwgW10pXG4gICAgLmZpbHRlcihmdW5jdGlvbiAoZG9jKSB7cmV0dXJuIGRvY30pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXJyb3JcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19lcnJvclxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gZXJyO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJvZHVjZXMgYSBzcGVjaWFsIHF1ZXJ5IGRvY3VtZW50IG9mIHRoZSBtb2RpZmllZCBwcm9wZXJ0aWVzIHVzZWQgaW4gdXBkYXRlcy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGVsdGFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGVsdGEgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJ0eSA9IHRoaXMuJF9fZGlydHkoKTtcblxuICB2YXIgZGVsdGEgPSB7fVxuICAgICwgbGVuID0gZGlydHkubGVuZ3RoXG4gICAgLCBkID0gMDtcblxuICBmb3IgKDsgZCA8IGxlbjsgKytkKSB7XG4gICAgdmFyIGRhdGEgPSBkaXJ0eVsgZCBdO1xuICAgIHZhciB2YWx1ZSA9IGRhdGEudmFsdWU7XG5cbiAgICB2YWx1ZSA9IHV0aWxzLmNsb25lKHZhbHVlLCB7IGRlcG9wdWxhdGU6IDEgfSk7XG4gICAgZGVsdGFbIGRhdGEucGF0aCBdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gZGVsdGE7XG59O1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9faGFuZGxlU2F2ZSA9IGZ1bmN0aW9uKCl7XG4gIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YDQtdGB0YPRgNGBINC60L7Qu9C70LXQutGG0LjQuCwg0LrRg9C00LAg0LHRg9C00LXQvCDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LTQsNC90L3Ri9C1XG4gIHZhciByZXNvdXJjZTtcbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICByZXNvdXJjZSA9IHRoaXMuY29sbGVjdGlvbi5hcGk7XG4gIH1cblxuICB2YXIgaW5uZXJQcm9taXNlID0gbmV3ICQuRGVmZXJyZWQoKTtcblxuICBpZiAoIHRoaXMuaXNOZXcgKSB7XG4gICAgLy8gc2VuZCBlbnRpcmUgZG9jXG4gICAgdmFyIG9iaiA9IHRoaXMudG9PYmplY3QoeyBkZXBvcHVsYXRlOiAxIH0pO1xuXG4gICAgaWYgKCAoIG9iaiB8fCB7fSApLmhhc093blByb3BlcnR5KCdfaWQnKSA9PT0gZmFsc2UgKSB7XG4gICAgICAvLyBkb2N1bWVudHMgbXVzdCBoYXZlIGFuIF9pZCBlbHNlIG1vbmdvb3NlIHdvbid0IGtub3dcbiAgICAgIC8vIHdoYXQgdG8gdXBkYXRlIGxhdGVyIGlmIG1vcmUgY2hhbmdlcyBhcmUgbWFkZS4gdGhlIHVzZXJcbiAgICAgIC8vIHdvdWxkbid0IGtub3cgd2hhdCBfaWQgd2FzIGdlbmVyYXRlZCBieSBtb25nb2RiIGVpdGhlclxuICAgICAgLy8gbm9yIHdvdWxkIHRoZSBPYmplY3RJZCBnZW5lcmF0ZWQgbXkgbW9uZ29kYiBuZWNlc3NhcmlseVxuICAgICAgLy8gbWF0Y2ggdGhlIHNjaGVtYSBkZWZpbml0aW9uLlxuICAgICAgaW5uZXJQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ2RvY3VtZW50IG11c3QgaGF2ZSBhbiBfaWQgYmVmb3JlIHNhdmluZycpKTtcbiAgICAgIHJldHVybiBpbm5lclByb21pc2U7XG4gICAgfVxuXG4gICAgLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdCwINC+0LrRgNGD0LbQtdC90LjQtSDRgtC10YHRgtC+0LJcbiAgICAvLyDQpdC+0YLRjyDQvNC+0LbQvdC+INGC0LDQutC40Lwg0L7QsdGA0LDQt9C+0Lwg0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4sINC00LDQttC1INC10YHQu9C4INC90LXRgiDQutC+0LvQu9C10LrRhtC40Lgg0LjQu9C4IGFwaVxuICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvdXJjZS5jcmVhdGUoIG9iaiApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcbiAgICB9XG5cbiAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgdGhpcy5pc05ldyA9IGZhbHNlO1xuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gICAgLy8gTWFrZSBpdCBwb3NzaWJsZSB0byByZXRyeSB0aGUgaW5zZXJ0XG4gICAgdGhpcy4kX18uaW5zZXJ0aW5nID0gdHJ1ZTtcblxuICB9IGVsc2Uge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCB0cmVhdCBpdCBhcyBhIG5ldyBvYmplY3Qgb24gZXJyb3IsXG4gICAgLy8gc2luY2UgaXQgYWxyZWFkeSBleGlzdHNcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBkZWx0YSA9IHRoaXMuJF9fZGVsdGEoKTtcblxuICAgIGlmICggIV8uaXNFbXB0eSggZGVsdGEgKSApIHtcbiAgICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICAgIC8vINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQvtC60YDRg9C20LXQvdC40LUg0YLQtdGB0YLQvtCyXG4gICAgICAvLyDQpdC+0YLRjyDQvNC+0LbQvdC+INGC0LDQutC40Lwg0L7QsdGA0LDQt9C+0Lwg0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4sINC00LDQttC1INC10YHQu9C4INC90LXRgiDQutC+0LvQu9C10LrRhtC40Lgg0LjQu9C4IGFwaVxuICAgICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlKCB0aGlzLmlkICkudXBkYXRlKCBkZWx0YSApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIFNhdmVzIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGV4YW1wbGU6XG4gKlxuICogICAgIHByb2R1Y3Quc29sZCA9IERhdGUubm93KCk7XG4gKiAgICAgcHJvZHVjdC5zYXZlKGZ1bmN0aW9uIChlcnIsIHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XG4gKiAgICAgICBpZiAoZXJyKSAuLlxuICogICAgIH0pXG4gKlxuICogQGRlc2NyaXB0aW9uIFRoZSBjYWxsYmFjayB3aWxsIHJlY2VpdmUgdGhyZWUgcGFyYW1ldGVycywgYGVycmAgaWYgYW4gZXJyb3Igb2NjdXJyZWQsIGBwcm9kdWN0YCB3aGljaCBpcyB0aGUgc2F2ZWQgYHByb2R1Y3RgLCBhbmQgYG51bWJlckFmZmVjdGVkYCB3aGljaCB3aWxsIGJlIDEgd2hlbiB0aGUgZG9jdW1lbnQgd2FzIGZvdW5kIGFuZCB1cGRhdGVkIGluIHRoZSBkYXRhYmFzZSwgb3RoZXJ3aXNlIDAuXG4gKlxuICogVGhlIGBmbmAgY2FsbGJhY2sgaXMgb3B0aW9uYWwuIElmIG5vIGBmbmAgaXMgcGFzc2VkIGFuZCB2YWxpZGF0aW9uIGZhaWxzLCB0aGUgdmFsaWRhdGlvbiBlcnJvciB3aWxsIGJlIGVtaXR0ZWQgb24gdGhlIGNvbm5lY3Rpb24gdXNlZCB0byBjcmVhdGUgdGhpcyBtb2RlbC5cbiAqIEBleGFtcGxlOlxuICogICAgIHZhciBkYiA9IG1vbmdvb3NlLmNyZWF0ZUNvbm5lY3Rpb24oLi4pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICB2YXIgUHJvZHVjdCA9IGRiLm1vZGVsKCdQcm9kdWN0Jywgc2NoZW1hKTtcbiAqXG4gKiAgICAgZGIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBkZXNjcmlwdGlvbiBIb3dldmVyLCBpZiB5b3UgZGVzaXJlIG1vcmUgbG9jYWwgZXJyb3IgaGFuZGxpbmcgeW91IGNhbiBhZGQgYW4gYGVycm9yYCBsaXN0ZW5lciB0byB0aGUgbW9kZWwgYW5kIGhhbmRsZSBlcnJvcnMgdGhlcmUgaW5zdGVhZC5cbiAqIEBleGFtcGxlOlxuICogICAgIFByb2R1Y3Qub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBkZXNjcmlwdGlvbiBBcyBhbiBleHRyYSBtZWFzdXJlIG9mIGZsb3cgY29udHJvbCwgc2F2ZSB3aWxsIHJldHVybiBhIFByb21pc2UgKGJvdW5kIHRvIGBmbmAgaWYgcGFzc2VkKSBzbyBpdCBjb3VsZCBiZSBjaGFpbmVkLCBvciBob29rIHRvIHJlY2l2ZSBlcnJvcnNcbiAqIEBleGFtcGxlOlxuICogICAgIHByb2R1Y3Quc2F2ZSgpLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XG4gKiAgICAgICAgLi4uXG4gKiAgICAgfSkub25SZWplY3RlZChmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICAgYXNzZXJ0Lm9rKGVycilcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oZXJyLCBwcm9kdWN0LCBOdW1iZXIpfSBbZG9uZV0gb3B0aW9uYWwgY2FsbGJhY2tcbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2VcbiAqIEBhcGkgcHVibGljXG4gKiBAc2VlIG1pZGRsZXdhcmUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvbWlkZGxld2FyZS5odG1sXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKCBkb25lICkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBmaW5hbFByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpLmRvbmUoIGRvbmUgKTtcblxuICAvLyDQodC+0YXRgNCw0L3Rj9GC0Ywg0LTQvtC60YPQvNC10L3RgiDQvNC+0LbQvdC+INGC0L7Qu9GM0LrQviDQtdGB0LvQuCDQvtC9INC90LDRhdC+0LTQuNGC0YHRjyDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgaWYgKCAhdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggYXJndW1lbnRzICk7XG4gICAgY29uc29sZS5lcnJvcignRG9jdW1lbnQuc2F2ZSBhcGkgaGFuZGxlIGlzIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIHByZVNhdmUgZXJyb3JzICjRgtC+0YfQviDQt9C90LDRjiwg0YfRgtC+INC+0L3QsCDQv9GA0L7QstC10YDRj9C10YIg0L7RiNC40LHQutC4INCyINC80LDRgdGB0LjQstCw0YUgKENhc3RFcnJvcikpXG4gIHZhciBwcmVTYXZlRXJyID0gc2VsZi4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgaWYgKCBwcmVTYXZlRXJyICkge1xuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIHByZVNhdmVFcnIgKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gVmFsaWRhdGVcbiAgdmFyIHAwID0gbmV3ICQuRGVmZXJyZWQoKTtcbiAgc2VsZi52YWxpZGF0ZShmdW5jdGlvbiggZXJyICl7XG4gICAgaWYgKCBlcnIgKXtcbiAgICAgIHAwLnJlamVjdCggZXJyICk7XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcDAucmVzb2x2ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8g0KHQvdCw0YfQsNC70LAg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCy0YHQtSDQv9C+0LTQtNC+0LrRg9C80LXQvdGC0Ysg0Lgg0YHQtNC10LvQsNGC0YwgcmVzb2x2ZSEhIVxuICAvLyBDYWxsIHNhdmUgaG9va3Mgb24gc3ViZG9jc1xuICB2YXIgc3ViRG9jcyA9IHNlbGYuJF9fZ2V0QWxsU3ViZG9jcygpO1xuICB2YXIgd2hlbkNvbmQgPSBzdWJEb2NzLm1hcChmdW5jdGlvbiAoZCkge3JldHVybiBkLnNhdmUoKTt9KTtcbiAgd2hlbkNvbmQucHVzaCggcDAgKTtcblxuICAvLyDQotCw0Log0LzRiyDQv9C10YDQtdC00LDRkdC8INC80LDRgdGB0LjQsiBwcm9taXNlINGD0YHQu9C+0LLQuNC5XG4gIHZhciBwMSA9ICQud2hlbi5hcHBseSggJCwgd2hlbkNvbmQgKTtcblxuICAvLyBIYW5kbGUgc2F2ZSBhbmQgcmVzdWx0c1xuICBwMVxuICAgIC50aGVuKCB0aGlzLiRfX2hhbmRsZVNhdmUuYmluZCggdGhpcyApIClcbiAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZpbmFsUHJvbWlzZS5yZXNvbHZlKCBzZWxmICk7XG4gICAgfSwgZnVuY3Rpb24gKCBlcnIgKSB7XG4gICAgICAvLyBJZiB0aGUgaW5pdGlhbCBpbnNlcnQgZmFpbHMgcHJvdmlkZSBhIHNlY29uZCBjaGFuY2UuXG4gICAgICAvLyAoSWYgd2UgZGlkIHRoaXMgYWxsIHRoZSB0aW1lIHdlIHdvdWxkIGJyZWFrIHVwZGF0ZXMpXG4gICAgICBpZiAoc2VsZi4kX18uaW5zZXJ0aW5nKSB7XG4gICAgICAgIHNlbGYuaXNOZXcgPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoJ2lzTmV3JywgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgICB9KTtcblxuICByZXR1cm4gZmluYWxQcm9taXNlO1xufTtcblxuLypmdW5jdGlvbiBhbGwgKHByb21pc2VPZkFycikge1xuICB2YXIgcFJldCA9IG5ldyBQcm9taXNlO1xuICB0aGlzLnRoZW4ocHJvbWlzZU9mQXJyKS50aGVuKFxuICAgIGZ1bmN0aW9uIChwcm9taXNlQXJyKSB7XG4gICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgdmFyIGVyclNlbnRpbmVsO1xuICAgICAgaWYgKCFwcm9taXNlQXJyLmxlbmd0aCkgcFJldC5yZXNvbHZlKCk7XG4gICAgICBwcm9taXNlQXJyLmZvckVhY2goZnVuY3Rpb24gKHByb21pc2UsIGluZGV4KSB7XG4gICAgICAgIGlmIChlcnJTZW50aW5lbCkgcmV0dXJuO1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICBwcm9taXNlLnRoZW4oXG4gICAgICAgICAgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgICAgICByZXRbaW5kZXhdID0gdmFsO1xuICAgICAgICAgICAgLS1jb3VudDtcbiAgICAgICAgICAgIGlmIChjb3VudCA9PSAwKSBwUmV0LmZ1bGZpbGwocmV0KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnJTZW50aW5lbCkgcmV0dXJuO1xuICAgICAgICAgICAgZXJyU2VudGluZWwgPSBlcnI7XG4gICAgICAgICAgICBwUmV0LnJlamVjdChlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBSZXQ7XG4gICAgfVxuICAgICwgcFJldC5yZWplY3QuYmluZChwUmV0KVxuICApO1xuICByZXR1cm4gcFJldDtcbn0qL1xuXG5cbi8qKlxuICogQ29udmVydHMgdGhpcyBkb2N1bWVudCBpbnRvIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QsIHJlYWR5IGZvciBzdG9yYWdlIGluIE1vbmdvREIuXG4gKlxuICogQnVmZmVycyBhcmUgY29udmVydGVkIHRvIGluc3RhbmNlcyBvZiBbbW9uZ29kYi5CaW5hcnldKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5jb20vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvYmluYXJ5Lmh0bWwpIGZvciBwcm9wZXIgc3RvcmFnZS5cbiAqXG4gKiAjIyMjT3B0aW9uczpcbiAqXG4gKiAtIGBnZXR0ZXJzYCBhcHBseSBhbGwgZ2V0dGVycyAocGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzKVxuICogLSBgdmlydHVhbHNgIGFwcGx5IHZpcnR1YWwgZ2V0dGVycyAoY2FuIG92ZXJyaWRlIGBnZXR0ZXJzYCBvcHRpb24pXG4gKiAtIGBtaW5pbWl6ZWAgcmVtb3ZlIGVtcHR5IG9iamVjdHMgKGRlZmF1bHRzIHRvIHRydWUpXG4gKiAtIGB0cmFuc2Zvcm1gIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIHRoZSByZXN1bHRpbmcgZG9jdW1lbnQgYmVmb3JlIHJldHVybmluZ1xuICpcbiAqICMjIyNHZXR0ZXJzL1ZpcnR1YWxzXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHBhdGggZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyBnZXR0ZXJzOiB0cnVlLCB2aXJ0dWFsczogZmFsc2UgfSlcbiAqXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgdmlydHVhbCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBhcHBseWluZyBib3RoIHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyBnZXR0ZXJzOiB0cnVlIH0pXG4gKlxuICogVG8gYXBwbHkgdGhlc2Ugb3B0aW9ucyB0byBldmVyeSBkb2N1bWVudCBvZiB5b3VyIHNjaGVtYSBieSBkZWZhdWx0LCBzZXQgeW91ciBbc2NoZW1hc10oI3NjaGVtYV9TY2hlbWEpIGB0b09iamVjdGAgb3B0aW9uIHRvIHRoZSBzYW1lIGFyZ3VtZW50LlxuICpcbiAqICAgICBzY2hlbWEuc2V0KCd0b09iamVjdCcsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiAjIyMjVHJhbnNmb3JtXG4gKlxuICogV2UgbWF5IG5lZWQgdG8gcGVyZm9ybSBhIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSByZXN1bHRpbmcgb2JqZWN0IGJhc2VkIG9uIHNvbWUgY3JpdGVyaWEsIHNheSB0byByZW1vdmUgc29tZSBzZW5zaXRpdmUgaW5mb3JtYXRpb24gb3IgcmV0dXJuIGEgY3VzdG9tIG9iamVjdC4gSW4gdGhpcyBjYXNlIHdlIHNldCB0aGUgb3B0aW9uYWwgYHRyYW5zZm9ybWAgZnVuY3Rpb24uXG4gKlxuICogVHJhbnNmb3JtIGZ1bmN0aW9ucyByZWNlaXZlIHRocmVlIGFyZ3VtZW50c1xuICpcbiAqICAgICBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHt9XG4gKlxuICogLSBgZG9jYCBUaGUgbW9uZ29vc2UgZG9jdW1lbnQgd2hpY2ggaXMgYmVpbmcgY29udmVydGVkXG4gKiAtIGByZXRgIFRoZSBwbGFpbiBvYmplY3QgcmVwcmVzZW50YXRpb24gd2hpY2ggaGFzIGJlZW4gY29udmVydGVkXG4gKiAtIGBvcHRpb25zYCBUaGUgb3B0aW9ucyBpbiB1c2UgKGVpdGhlciBzY2hlbWEgb3B0aW9ucyBvciB0aGUgb3B0aW9ucyBwYXNzZWQgaW5saW5lKVxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIC8vIHNwZWNpZnkgdGhlIHRyYW5zZm9ybSBzY2hlbWEgb3B0aW9uXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIC8vIHJlbW92ZSB0aGUgX2lkIG9mIGV2ZXJ5IGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmcgdGhlIHJlc3VsdFxuICogICAgICAgZGVsZXRlIHJldC5faWQ7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgX2lkOiAnYW5JZCcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFdpdGggdHJhbnNmb3JtYXRpb25zIHdlIGNhbiBkbyBhIGxvdCBtb3JlIHRoYW4gcmVtb3ZlIHByb3BlcnRpZXMuIFdlIGNhbiBldmVuIHJldHVybiBjb21wbGV0ZWx5IG5ldyBjdXN0b21pemVkIG9iamVjdHM6XG4gKlxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBtb3ZpZTogcmV0Lm5hbWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBtb3ZpZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogX05vdGU6IGlmIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAsIHRoZSByZXR1cm4gdmFsdWUgd2lsbCBiZSBpZ25vcmVkLl9cbiAqXG4gKiBUcmFuc2Zvcm1hdGlvbnMgbWF5IGFsc28gYmUgYXBwbGllZCBpbmxpbmUsIG92ZXJyaWRkaW5nIGFueSB0cmFuc2Zvcm0gc2V0IGluIHRoZSBvcHRpb25zOlxuICpcbiAqICAgICBmdW5jdGlvbiB4Zm9ybSAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIHJldHVybiB7IGlubGluZTogcmV0Lm5hbWUsIGN1c3RvbTogdHJ1ZSB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBwYXNzIHRoZSB0cmFuc2Zvcm0gYXMgYW4gaW5saW5lIG9wdGlvblxuICogICAgIGRvYy50b09iamVjdCh7IHRyYW5zZm9ybTogeGZvcm0gfSk7IC8vIHsgaW5saW5lOiAnV3JlY2staXQgUmFscGgnLCBjdXN0b206IHRydWUgfVxuICpcbiAqIF9Ob3RlOiBpZiB5b3UgY2FsbCBgdG9PYmplY3RgIGFuZCBwYXNzIGFueSBvcHRpb25zLCB0aGUgdHJhbnNmb3JtIGRlY2xhcmVkIGluIHlvdXIgc2NoZW1hIG9wdGlvbnMgd2lsbCBfX25vdF9fIGJlIGFwcGxpZWQuIFRvIGZvcmNlIGl0cyBhcHBsaWNhdGlvbiBwYXNzIGB0cmFuc2Zvcm06IHRydWVgX1xuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LmhpZGUgPSAnX2lkJztcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIGlmIChvcHRpb25zLmhpZGUpIHtcbiAqICAgICAgICAgb3B0aW9ucy5oaWRlLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICogICAgICAgICAgIGRlbGV0ZSByZXRbcHJvcF07XG4gKiAgICAgICAgIH0pO1xuICogICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIGRvYyA9IG5ldyBEb2MoeyBfaWQ6ICdhbklkJywgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9KTtcbiAqICAgICBkb2MudG9PYmplY3QoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8geyBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqICAgICBkb2MudG9PYmplY3QoeyBoaWRlOiAnc2VjcmV0IF9pZCcgfSk7ICAgICAgICAgICAgICAgICAgLy8geyBfaWQ6ICdhbklkJywgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnLCB0cmFuc2Zvcm06IHRydWUgfSk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogVHJhbnNmb3JtcyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgX2FuZCBlYWNoIG9mIGl0cyBzdWItZG9jdW1lbnRzXy4gVG8gZGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IHlvdSBhcmUgY3VycmVudGx5IG9wZXJhdGluZyBvbiBhIHN1Yi1kb2N1bWVudCB5b3UgbWlnaHQgdXNlIHRoZSBmb2xsb3dpbmcgZ3VhcmQ6XG4gKlxuICogICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkb2Mub3duZXJEb2N1bWVudCkge1xuICogICAgICAgLy8gd29ya2luZyB3aXRoIGEgc3ViIGRvY1xuICogICAgIH1cbiAqXG4gKiBUcmFuc2Zvcm1zLCBsaWtlIGFsbCBvZiB0aGVzZSBvcHRpb25zLCBhcmUgYWxzbyBhdmFpbGFibGUgZm9yIGB0b0pTT05gLlxuICpcbiAqIFNlZSBbc2NoZW1hIG9wdGlvbnNdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIGZvciBzb21lIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBfRHVyaW5nIHNhdmUsIG5vIGN1c3RvbSBvcHRpb25zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBiZWZvcmUgYmVpbmcgc2VudCB0byB0aGUgZGF0YWJhc2UuX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge09iamVjdH0ganMgb2JqZWN0XG4gKiBAc2VlIG1vbmdvZGIuQmluYXJ5IGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5jb20vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvYmluYXJ5Lmh0bWxcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSAmJiB0aGlzLiRfXy53YXNQb3B1bGF0ZWQpIHtcbiAgICAvLyBwb3B1bGF0ZWQgcGF0aHMgdGhhdCB3ZSBzZXQgdG8gYSBkb2N1bWVudFxuICAgIHJldHVybiB1dGlscy5jbG9uZSh0aGlzLl9pZCwgb3B0aW9ucyk7XG4gIH1cblxuICAvLyBXaGVuIGludGVybmFsbHkgc2F2aW5nIHRoaXMgZG9jdW1lbnQgd2UgYWx3YXlzIHBhc3Mgb3B0aW9ucyxcbiAgLy8gYnlwYXNzaW5nIHRoZSBjdXN0b20gc2NoZW1hIG9wdGlvbnMuXG4gIHZhciBvcHRpb25zUGFyYW1ldGVyID0gb3B0aW9ucztcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob3B0aW9ucy5jb25zdHJ1Y3RvcikpIHx8XG4gICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5fdXNlU2NoZW1hT3B0aW9ucykpIHtcbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdFxuICAgICAgPyBjbG9uZSh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KVxuICAgICAgOiB7fTtcbiAgfVxuXG4gIGlmICggb3B0aW9ucy5taW5pbWl6ZSA9PT0gdW5kZWZpbmVkICl7XG4gICAgb3B0aW9ucy5taW5pbWl6ZSA9IHRoaXMuc2NoZW1hLm9wdGlvbnMubWluaW1pemU7XG4gIH1cblxuICBpZiAoIW9wdGlvbnNQYXJhbWV0ZXIpIHtcbiAgICBvcHRpb25zLl91c2VTY2hlbWFPcHRpb25zID0gdHJ1ZTtcbiAgfVxuXG4gIHZhciByZXQgPSB1dGlscy5jbG9uZSh0aGlzLl9kb2MsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLnZpcnR1YWxzIHx8IG9wdGlvbnMuZ2V0dGVycyAmJiBmYWxzZSAhPT0gb3B0aW9ucy52aXJ0dWFscykge1xuICAgIGFwcGx5R2V0dGVycyh0aGlzLCByZXQsICd2aXJ0dWFscycsIG9wdGlvbnMpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuZ2V0dGVycykge1xuICAgIGFwcGx5R2V0dGVycyh0aGlzLCByZXQsICdwYXRocycsIG9wdGlvbnMpO1xuICAgIC8vIGFwcGx5R2V0dGVycyBmb3IgcGF0aHMgd2lsbCBhZGQgbmVzdGVkIGVtcHR5IG9iamVjdHM7XG4gICAgLy8gaWYgbWluaW1pemUgaXMgc2V0LCB3ZSBuZWVkIHRvIHJlbW92ZSB0aGVtLlxuICAgIGlmIChvcHRpb25zLm1pbmltaXplKSB7XG4gICAgICByZXQgPSBtaW5pbWl6ZShyZXQpIHx8IHt9O1xuICAgIH1cbiAgfVxuXG4gIC8vIEluIHRoZSBjYXNlIHdoZXJlIGEgc3ViZG9jdW1lbnQgaGFzIGl0cyBvd24gdHJhbnNmb3JtIGZ1bmN0aW9uLCB3ZSBuZWVkIHRvXG4gIC8vIGNoZWNrIGFuZCBzZWUgaWYgdGhlIHBhcmVudCBoYXMgYSB0cmFuc2Zvcm0gKG9wdGlvbnMudHJhbnNmb3JtKSBhbmQgaWYgdGhlXG4gIC8vIGNoaWxkIHNjaGVtYSBoYXMgYSB0cmFuc2Zvcm0gKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIEluIHRoaXMgY2FzZSxcbiAgLy8gd2UgbmVlZCB0byBhZGp1c3Qgb3B0aW9ucy50cmFuc2Zvcm0gdG8gYmUgdGhlIGNoaWxkIHNjaGVtYSdzIHRyYW5zZm9ybSBhbmRcbiAgLy8gbm90IHRoZSBwYXJlbnQgc2NoZW1hJ3NcbiAgaWYgKHRydWUgPT09IG9wdGlvbnMudHJhbnNmb3JtIHx8XG4gICAgICAodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCAmJiBvcHRpb25zLnRyYW5zZm9ybSkpIHtcbiAgICB2YXIgb3B0cyA9IG9wdGlvbnMuanNvblxuICAgICAgPyB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgOiB0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuICAgIGlmIChvcHRzKSB7XG4gICAgICBvcHRpb25zLnRyYW5zZm9ybSA9IG9wdHMudHJhbnNmb3JtO1xuICAgIH1cbiAgfVxuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBvcHRpb25zLnRyYW5zZm9ybSkge1xuICAgIHZhciB4Zm9ybWVkID0gb3B0aW9ucy50cmFuc2Zvcm0odGhpcywgcmV0LCBvcHRpb25zKTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIHhmb3JtZWQpIHJldCA9IHhmb3JtZWQ7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyohXG4gKiBNaW5pbWl6ZXMgYW4gb2JqZWN0LCByZW1vdmluZyB1bmRlZmluZWQgdmFsdWVzIGFuZCBlbXB0eSBvYmplY3RzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCB0byBtaW5pbWl6ZVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5cbmZ1bmN0aW9uIG1pbmltaXplIChvYmopIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIGhhc0tleXNcbiAgICAsIGtleVxuICAgICwgdmFsO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHZhbCA9IG9ialtrZXldO1xuXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3QodmFsKSApIHtcbiAgICAgIG9ialtrZXldID0gbWluaW1pemUodmFsKTtcbiAgICB9XG5cbiAgICBpZiAodW5kZWZpbmVkID09PSBvYmpba2V5XSkge1xuICAgICAgZGVsZXRlIG9ialtrZXldO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaGFzS2V5cyA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gaGFzS2V5c1xuICAgID8gb2JqXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbi8qIVxuICogQXBwbGllcyB2aXJ0dWFscyBwcm9wZXJ0aWVzIHRvIGBqc29uYC5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0ganNvblxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgZWl0aGVyIGB2aXJ0dWFsc2Agb3IgYHBhdGhzYFxuICogQHJldHVybiB7T2JqZWN0fSBganNvbmBcbiAqL1xuXG5mdW5jdGlvbiBhcHBseUdldHRlcnMgKHNlbGYsIGpzb24sIHR5cGUsIG9wdGlvbnMpIHtcbiAgdmFyIHNjaGVtYSA9IHNlbGYuc2NoZW1hXG4gICAgLCBwYXRocyA9IE9iamVjdC5rZXlzKHNjaGVtYVt0eXBlXSlcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHBhdGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHBhdGggPSBwYXRoc1tpXTtcblxuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKVxuICAgICAgLCBwbGVuID0gcGFydHMubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBwbGVuIC0gMVxuICAgICAgLCBicmFuY2ggPSBqc29uXG4gICAgICAsIHBhcnQ7XG5cbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgcGxlbjsgKytpaSkge1xuICAgICAgcGFydCA9IHBhcnRzW2lpXTtcbiAgICAgIGlmIChpaSA9PT0gbGFzdCkge1xuICAgICAgICBicmFuY2hbcGFydF0gPSB1dGlscy5jbG9uZShzZWxmLmdldChwYXRoKSwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmFuY2ggPSBicmFuY2hbcGFydF0gfHwgKGJyYW5jaFtwYXJ0XSA9IHt9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ganNvbjtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgbWV0aG9kIGlzIHVzZWQgaW4gY2FsbHMgdG8gSlNPTi5zdHJpbmdpZnkoZG9jKS5cbiAqXG4gKiBUaGlzIG1ldGhvZCBhY2NlcHRzIHRoZSBzYW1lIG9wdGlvbnMgYXMgW0RvY3VtZW50I3RvT2JqZWN0XSgjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3QpLiBUbyBhcHBseSB0aGUgb3B0aW9ucyB0byBldmVyeSBkb2N1bWVudCBvZiB5b3VyIHNjaGVtYSBieSBkZWZhdWx0LCBzZXQgeW91ciBbc2NoZW1hc10oI3NjaGVtYV9TY2hlbWEpIGB0b0pTT05gIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9KU09OJywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIFNlZSBbc2NoZW1hIG9wdGlvbnNdKC9kb2NzL2d1aWRlLmh0bWwjdG9KU09OKSBmb3IgZGV0YWlscy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQHNlZSBEb2N1bWVudCN0b09iamVjdCAjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIC8vIGNoZWNrIGZvciBvYmplY3QgdHlwZSBzaW5jZSBhbiBhcnJheSBvZiBkb2N1bWVudHNcbiAgLy8gYmVpbmcgc3RyaW5naWZpZWQgcGFzc2VzIGFycmF5IGluZGV4ZXMgaW5zdGVhZFxuICAvLyBvZiBvcHRpb25zIG9iamVjdHMuIEpTT04uc3RyaW5naWZ5KFtkb2MsIGRvY10pXG4gIC8vIFRoZSBzZWNvbmQgY2hlY2sgaGVyZSBpcyB0byBtYWtlIHN1cmUgdGhhdCBwb3B1bGF0ZWQgZG9jdW1lbnRzIChvclxuICAvLyBzdWJkb2N1bWVudHMpIHVzZSB0aGVpciBvd24gb3B0aW9ucyBmb3IgYC50b0pTT04oKWAgaW5zdGVhZCBvZiB0aGVpclxuICAvLyBwYXJlbnQnc1xuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvcHRpb25zLmNvbnN0cnVjdG9yKSlcbiAgICAgIHx8ICgoIW9wdGlvbnMgfHwgb3B0aW9ucy5qc29uKSAmJiB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTikpIHtcblxuICAgIG9wdGlvbnMgPSB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgPyB1dGlscy5jbG9uZSh0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTilcbiAgICAgIDoge307XG4gIH1cbiAgb3B0aW9ucy5qc29uID0gdHJ1ZTtcblxuICByZXR1cm4gdGhpcy50b09iamVjdChvcHRpb25zKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBEb2N1bWVudCBzdG9yZXMgdGhlIHNhbWUgZGF0YSBhcyBkb2MuXG4gKlxuICogRG9jdW1lbnRzIGFyZSBjb25zaWRlcmVkIGVxdWFsIHdoZW4gdGhleSBoYXZlIG1hdGNoaW5nIGBfaWRgcywgdW5sZXNzIG5laXRoZXJcbiAqIGRvY3VtZW50IGhhcyBhbiBgX2lkYCwgaW4gd2hpY2ggY2FzZSB0aGlzIGZ1bmN0aW9uIGZhbGxzIGJhY2sgdG8gdXNpbmdcbiAqIGBkZWVwRXF1YWwoKWAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGEgZG9jdW1lbnQgdG8gY29tcGFyZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgdmFyIHRpZCA9IHRoaXMuZ2V0KCdfaWQnKTtcbiAgdmFyIGRvY2lkID0gZG9jLmdldCgnX2lkJyk7XG4gIGlmICghdGlkICYmICFkb2NpZCkge1xuICAgIHJldHVybiBkZWVwRXF1YWwodGhpcywgZG9jKTtcbiAgfVxuICByZXR1cm4gdGlkICYmIHRpZC5lcXVhbHNcbiAgICA/IHRpZC5lcXVhbHMoZG9jaWQpXG4gICAgOiB0aWQgPT09IGRvY2lkO1xufTtcblxuLyoqXG4gKiBHZXRzIF9pZChzKSB1c2VkIGR1cmluZyBwb3B1bGF0aW9uIG9mIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIE1vZGVsLmZpbmRPbmUoKS5wb3B1bGF0ZSgnYXV0aG9yJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5hdXRob3IubmFtZSkgICAgICAgICAvLyBEci5TZXVzc1xuICogICAgICAgY29uc29sZS5sb2coZG9jLnBvcHVsYXRlZCgnYXV0aG9yJykpIC8vICc1MTQ0Y2Y4MDUwZjA3MWQ5NzljMTE4YTcnXG4gKiAgICAgfSlcbiAqXG4gKiBJZiB0aGUgcGF0aCB3YXMgbm90IHBvcHVsYXRlZCwgdW5kZWZpbmVkIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheXxPYmplY3RJZHxOdW1iZXJ8QnVmZmVyfFN0cmluZ3x1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucG9wdWxhdGVkID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb3B0aW9ucykge1xuICAvLyB2YWwgYW5kIG9wdGlvbnMgYXJlIGludGVybmFsXG5cbiAgLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINGN0YLRgyDQv9GA0L7QstC10YDQutGDLCDQvtC90LAg0LTQvtC70LbQvdCwINC+0L/QuNGA0LDRgtGM0YHRjyDQvdC1INC90LAgJF9fLnBvcHVsYXRlZCwg0LAg0L3QsCDRgtC+LCDRh9GC0L4g0L3QsNGIINC+0LHRitC10LrRgiDQuNC80LXQtdGCINGA0L7QtNC40YLQtdC70Y9cbiAgLy8g0Lgg0L/QvtGC0L7QvCDRg9C20LUg0LLRi9GB0YLQsNCy0LvRj9GC0Ywg0YHQstC+0LnRgdGC0LLQviBwb3B1bGF0ZWQgPT0gdHJ1ZVxuICBpZiAobnVsbCA9PSB2YWwpIHtcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB2YXIgdiA9IHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgICBpZiAodikgcmV0dXJuIHYudmFsdWU7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIGludGVybmFsXG5cbiAgaWYgKHRydWUgPT09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XG4gIH1cblxuICB0aGlzLiRfXy5wb3B1bGF0ZWQgfHwgKHRoaXMuJF9fLnBvcHVsYXRlZCA9IHt9KTtcbiAgdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdID0geyB2YWx1ZTogdmFsLCBvcHRpb25zOiBvcHRpb25zIH07XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIC8vIG92ZXJyaWRkZW4gaW4gU3ViRG9jdW1lbnRzXG4gIHJldHVybiBwYXRoIHx8ICcnO1xufTtcblxuLyoqXG4gKiDQo9C00LDQu9C40YLRjCDQtNC+0LrRg9C80LXQvdGCINC4INCy0LXRgNC90YPRgtGMINC60L7Qu9C70LXQutGG0LjRji5cbiAqXG4gKiBAZXhhbXBsZVxuICogc3RvcmFnZS5jb2xsZWN0aW9uLmRvY3VtZW50LnJlbW92ZSgpO1xuICogZG9jdW1lbnQucmVtb3ZlKCk7XG4gKlxuICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpe1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKCB0aGlzICk7XG4gIH1cblxuICByZXR1cm4gZGVsZXRlIHRoaXM7XG59O1xuXG5cbi8qKlxuICog0J7Rh9C40YnQsNC10YIg0LTQvtC60YPQvNC10L3RgiAo0LLRi9GB0YLQsNCy0LvRj9C10YIg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQuNC70LggdW5kZWZpbmVkKVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbigpe1xuICB2YXIgZG9jID0gdGhpc1xuICAgICwgc2VsZiA9IHRoaXNcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT0gcCApIGNvbnRpbnVlO1xuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWwgfHwgdW5kZWZpbmVkO1xuICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5Eb2N1bWVudC5WYWxpZGF0aW9uRXJyb3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50O1xuIiwiLy90b2RvOiDQv9C+0YDRgtC40YDQvtCy0LDRgtGMINCy0YHQtSDQvtGI0LjQsdC60LghISFcbi8qKlxuICogU3RvcmFnZUVycm9yIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIEVycm9yIG1lc3NhZ2VcbiAqIEBpbmhlcml0cyBFcnJvciBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvclxuICogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODM4MTgvaG93LWRvLWktY3JlYXRlLWEtY3VzdG9tLWVycm9yLWluLWphdmFzY3JpcHRcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUVycm9yICggbXNnICkge1xuICB0aGlzLm1lc3NhZ2UgPSBtc2c7XG4gIHRoaXMubmFtZSA9ICdTdG9yYWdlRXJyb3InO1xufVxuU3RvcmFnZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5cbi8qIVxuICogRm9ybWF0cyBlcnJvciBtZXNzYWdlc1xuICovXG5TdG9yYWdlRXJyb3IucHJvdG90eXBlLmZvcm1hdE1lc3NhZ2UgPSBmdW5jdGlvbiAobXNnLCBwYXRoLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIHRocm93IG5ldyBUeXBlRXJyb3IoJ21lc3NhZ2UgaXMgcmVxdWlyZWQnKTtcblxuICByZXR1cm4gbXNnLnJlcGxhY2UoL3tQQVRIfS8sIHBhdGgpXG4gICAgICAgICAgICAucmVwbGFjZSgve1ZBTFVFfS8sIFN0cmluZyh2YWx8fCcnKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VFlQRX0vLCB0eXBlIHx8ICdkZWNsYXJlZCB0eXBlJyk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUVycm9yO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy5cbiAqXG4gKiBAc2VlIEVycm9yLm1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VFcnJvci5tZXNzYWdlcyA9IHJlcXVpcmUoJy4vZXJyb3IvbWVzc2FnZXMnKTtcblxuLyohXG4gKiBFeHBvc2Ugc3ViY2xhc3Nlc1xuICovXG5cblN0b3JhZ2VFcnJvci5DYXN0RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL2Nhc3QnKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZhbGlkYXRpb24nKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdG9yJyk7XG4vL3RvZG86XG4vL1N0b3JhZ2VFcnJvci5WZXJzaW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZlcnNpb24nKTtcbi8vU3RvcmFnZUVycm9yLk92ZXJ3cml0ZU1vZGVsRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL292ZXJ3cml0ZU1vZGVsJyk7XG5TdG9yYWdlRXJyb3IuTWlzc2luZ1NjaGVtYUVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9taXNzaW5nU2NoZW1hJyk7XG4vL1N0b3JhZ2VFcnJvci5EaXZlcmdlbnRBcnJheUVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9kaXZlcmdlbnRBcnJheScpO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIENhc3RpbmcgRXJyb3IgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIENhc3RFcnJvciAodHlwZSwgdmFsdWUsIHBhdGgpIHtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgJ0Nhc3QgdG8gJyArIHR5cGUgKyAnIGZhaWxlZCBmb3IgdmFsdWUgXCInICsgdmFsdWUgKyAnXCIgYXQgcGF0aCBcIicgKyBwYXRoICsgJ1wiJyk7XG4gIHRoaXMubmFtZSA9ICdDYXN0RXJyb3InO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yLlxuICovXG5DYXN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuQ2FzdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhc3RFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBDYXN0RXJyb3I7XG4iLCJcbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLiBUaGVzZSBtYXkgYmUgY3VzdG9taXplZC5cbiAqXG4gKiAgICAgLy8gY3VzdG9taXplIHdpdGhpbiBlYWNoIHNjaGVtYSBvciBnbG9iYWxseSBsaWtlIHNvXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICBtb25nb29zZS5FcnJvci5tZXNzYWdlcy5TdHJpbmcuZW51bSAgPSBcIllvdXIgY3VzdG9tIG1lc3NhZ2UgZm9yIHtQQVRIfS5cIjtcbiAqXG4gKiBBcyB5b3UgbWlnaHQgaGF2ZSBub3RpY2VkLCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2ljIHRlbXBsYXRpbmdcbiAqXG4gKiAtIGB7UEFUSH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgZG9jdW1lbnQgcGF0aFxuICogLSBge1ZBTFVFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogLSBge1RZUEV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSB2YWxpZGF0b3IgdHlwZSBzdWNoIGFzIFwicmVnZXhwXCIsIFwibWluXCIsIG9yIFwidXNlciBkZWZpbmVkXCJcbiAqIC0gYHtNSU59YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtaW4gdmFsdWUgZm9yIHRoZSBOdW1iZXIubWluIHZhbGlkYXRvclxuICogLSBge01BWH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1heCB2YWx1ZSBmb3IgdGhlIE51bWJlci5tYXggdmFsaWRhdG9yXG4gKlxuICogQ2xpY2sgdGhlIFwic2hvdyBjb2RlXCIgbGluayBiZWxvdyB0byBzZWUgYWxsIGRlZmF1bHRzLlxuICpcbiAqIEBwcm9wZXJ0eSBtZXNzYWdlc1xuICogQHJlY2VpdmVyIE1vbmdvb3NlRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIG1zZyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbm1zZy5nZW5lcmFsID0ge307XG5tc2cuZ2VuZXJhbC5kZWZhdWx0ID0gXCJWYWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gXCI7XG5tc2cuZ2VuZXJhbC5yZXF1aXJlZCA9IFwiUGF0aCBge1BBVEh9YCBpcyByZXF1aXJlZC5cIjtcblxubXNnLk51bWJlciA9IHt9O1xubXNnLk51bWJlci5taW4gPSBcIlBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGxlc3MgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUgKHtNSU59KS5cIjtcbm1zZy5OdW1iZXIubWF4ID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBtb3JlIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlICh7TUFYfSkuXCI7XG5cbm1zZy5TdHJpbmcgPSB7fTtcbm1zZy5TdHJpbmcuZW51bSA9IFwiYHtWQUxVRX1gIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHtQQVRIfWAuXCI7XG5tc2cuU3RyaW5nLm1hdGNoID0gXCJQYXRoIGB7UEFUSH1gIGlzIGludmFsaWQgKHtWQUxVRX0pLlwiO1xuXG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qIVxuICogTWlzc2luZ1NjaGVtYSBFcnJvciBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICovXG5cbmZ1bmN0aW9uIE1pc3NpbmdTY2hlbWFFcnJvcigpe1xuICB2YXIgbXNnID0gJ1NjaGVtYSBoYXNuXFwndCBiZWVuIHJlZ2lzdGVyZWQgZm9yIGRvY3VtZW50LlxcbidcbiAgICArICdVc2Ugc3RvcmFnZS5Eb2N1bWVudChuYW1lLCBzY2hlbWEpJztcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgbXNnKTtcblxuICB0aGlzLm5hbWUgPSAnTWlzc2luZ1NjaGVtYUVycm9yJztcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3IuXG4gKi9cblxuTWlzc2luZ1NjaGVtYUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3RvcmFnZUVycm9yLnByb3RvdHlwZSk7XG5NaXNzaW5nU2NoZW1hRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RvcmFnZUVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pc3NpbmdTY2hlbWFFcnJvcjsiLCJcbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50c1xuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIERvY3VtZW50IFZhbGlkYXRpb24gRXJyb3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGluc3RhbmNlXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICovXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvciAoaW5zdGFuY2UpIHtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgXCJWYWxpZGF0aW9uIGZhaWxlZFwiKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG4gIHRoaXMuZXJyb3JzID0gaW5zdGFuY2UuZXJyb3JzID0ge307XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yLlxuICovXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRpb25FcnJvcjtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdGlvbkVycm9yO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xudmFyIGVycm9yTWVzc2FnZXMgPSBTdG9yYWdlRXJyb3IubWVzc2FnZXM7XG5cbi8qKlxuICogU2NoZW1hIHZhbGlkYXRvciBlcnJvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8YW55fSB2YWxcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0b3JFcnJvciAocGF0aCwgbXNnLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIG1zZyA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICB2YXIgbWVzc2FnZSA9IHRoaXMuZm9ybWF0TWVzc2FnZShtc2csIHBhdGgsIHR5cGUsIHZhbCk7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdG9yRXJyb3InO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsO1xufVxuXG4vKiFcbiAqIHRvU3RyaW5nIGhlbHBlclxuICovXG5cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3JcbiAqL1xuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdG9yRXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdG9yRXJyb3I7XG4iLCIvLyBCYWNrYm9uZS5FdmVudHNcbi8vIC0tLS0tLS0tLS0tLS0tLVxuXG4vLyBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXG4vLyBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrXG4vLyBmdW5jdGlvbnMgdG8gYW4gZXZlbnQ7IGB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpblxuLy8gc3VjY2Vzc2lvbi5cbi8vXG4vLyAgICAgdmFyIG9iamVjdCA9IHt9O1xuLy8gICAgIF8uZXh0ZW5kKG9iamVjdCwgRXZlbnRzLnByb3RvdHlwZSk7XG4vLyAgICAgb2JqZWN0Lm9uKCdleHBhbmQnLCBmdW5jdGlvbigpeyBhbGVydCgnZXhwYW5kZWQnKTsgfSk7XG4vLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuLy9cbmZ1bmN0aW9uIEV2ZW50cygpIHt9XG5cbkV2ZW50cy5wcm90b3R5cGUgPSB7XG5cbiAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAvLyB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gIC8vIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXG4gIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYub2ZmKG5hbWUsIG9uY2UpO1xuICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9KTtcbiAgICBvbmNlLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHJldHVybiB0aGlzLm9uKG5hbWUsIG9uY2UsIGNvbnRleHQpO1xuICB9LFxuXG4gIC8vIFJlbW92ZSBvbmUgb3IgbWFueSBjYWxsYmFja3MuIElmIGBjb250ZXh0YCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAvLyBjYWxsYmFja3Mgd2l0aCB0aGF0IGZ1bmN0aW9uLiBJZiBgY2FsbGJhY2tgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gIC8vIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcbiAgLy8gY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxuICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIWV2ZW50c0FwaSh0aGlzLCAnb2ZmJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkpIHJldHVybiB0aGlzO1xuICAgIGlmICghbmFtZSAmJiAhY2FsbGJhY2sgJiYgIWNvbnRleHQpIHtcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIG5hbWVzID0gbmFtZSA/IFtuYW1lXSA6IF8ua2V5cyh0aGlzLl9ldmVudHMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gcmV0YWluID0gW107XG4gICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGV2ID0gZXZlbnRzW2pdO1xuICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gZXYuY29udGV4dCkpIHtcbiAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gIC8vICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xuICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICd0cmlnZ2VyJywgbmFtZSwgYXJncykpIHJldHVybiB0aGlzO1xuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XG4gICAgaWYgKGV2ZW50cykgdHJpZ2dlckV2ZW50cyhldmVudHMsIGFyZ3MpO1xuICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvO1xuICAgIGlmICghbGlzdGVuaW5nVG8pIHJldHVybiB0aGlzO1xuICAgIHZhciByZW1vdmUgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICBpZiAob2JqKSAobGlzdGVuaW5nVG8gPSB7fSlbb2JqLl9saXN0ZW5JZF0gPSBvYmo7XG4gICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuaW5nVG8pIHtcbiAgICAgIG9iaiA9IGxpc3RlbmluZ1RvW2lkXTtcbiAgICAgIG9iai5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgaWYgKHJlbW92ZSB8fCBfLmlzRW1wdHkob2JqLl9ldmVudHMpKSBkZWxldGUgdGhpcy5fbGlzdGVuaW5nVG9baWRdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4vLyBJbXBsZW1lbnQgZmFuY3kgZmVhdHVyZXMgb2YgdGhlIEV2ZW50cyBBUEkgc3VjaCBhcyBtdWx0aXBsZSBldmVudFxuLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbnZhciBldmVudHNBcGkgPSBmdW5jdGlvbihvYmosIGFjdGlvbiwgbmFtZSwgcmVzdCkge1xuICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xuXG4gIC8vIEhhbmRsZSBldmVudCBtYXBzLlxuICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBIYW5kbGUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50IG5hbWVzLlxuICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3Jcbi8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbi8vIEJhY2tib25lIGV2ZW50cyBoYXZlIDMgYXJndW1lbnRzKS5cbnZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XG4gICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XG4gICAgY2FzZSAyOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyKTsgcmV0dXJuO1xuICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XG4gICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcbiAgfVxufTtcblxudmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcblxuLy8gSW52ZXJzaW9uLW9mLWNvbnRyb2wgdmVyc2lvbnMgb2YgYG9uYCBhbmQgYG9uY2VgLiBUZWxsICp0aGlzKiBvYmplY3QgdG9cbi8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3Ncbi8vIGxpc3RlbmluZyB0by5cbl8uZWFjaChsaXN0ZW5NZXRob2RzLCBmdW5jdGlvbihpbXBsZW1lbnRhdGlvbiwgbWV0aG9kKSB7XG4gIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvIHx8ICh0aGlzLl9saXN0ZW5pbmdUbyA9IHt9KTtcbiAgICB2YXIgaWQgPSBvYmouX2xpc3RlbklkIHx8IChvYmouX2xpc3RlbklkID0gXy51bmlxdWVJZCgnbCcpKTtcbiAgICBsaXN0ZW5pbmdUb1tpZF0gPSBvYmo7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcbiIsIi8qKlxuICog0KXRgNCw0L3QuNC70LjRidC1INC00L7QutGD0LzQtdC90YLQvtCyINC/0L4g0YHRhdC10LzQsNC8XG4gKiDQstC00L7RhdC90L7QstC70ZHQvSBtb25nb29zZSAzLjguNCAo0LjRgdC/0YDQsNCy0LvQtdC90Ysg0LHQsNCz0Lgg0L/QviAzLjguMTUpXG4gKlxuICog0KDQtdCw0LvQuNC30LDRhtC40Lgg0YXRgNCw0L3QuNC70LjRidCwXG4gKiBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyNzZWxlY3RvcnNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3RyZWUvbWFzdGVyL3BhY2thZ2VzL21pbmltb25nb1xuICpcbiAqIGJyb3dzZXJpZnkgbGliLyAtLXN0YW5kYWxvbmUgc3RvcmFnZSA+IHN0b3JhZ2UuanMgLWRcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vY29sbGVjdGlvbicpXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgVHlwZXMgPSByZXF1aXJlKCcuL3R5cGVzJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5cbi8qKlxuICogU3RvcmFnZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgZXhwb3J0cyBvYmplY3Qgb2YgdGhlIGBzdG9yYWdlYCBtb2R1bGUgaXMgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbiAqIE1vc3QgYXBwcyB3aWxsIG9ubHkgdXNlIHRoaXMgb25lIGluc3RhbmNlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2UgKCkge1xuICB0aGlzLmNvbGxlY3Rpb25OYW1lcyA9IFtdO1xufVxuXG4vKipcbiAqINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiDQuCDQv9C+0LvRg9GH0LjRgtGMINC10ZEuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtzdG9yYWdlLlNjaGVtYXx1bmRlZmluZWR9IHNjaGVtYVxuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAg0LDQv9C4INGA0LXRgdGD0YDRgVxuICogQHJldHVybnMge0NvbGxlY3Rpb258dW5kZWZpbmVkfVxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gZnVuY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICl7XG4gIGlmICggdGhpc1sgbmFtZSBdICl7XG4gICAgY29uc29sZS5pbmZvKCdzdG9yYWdlOjpjb2xsZWN0aW9uOiBgJyArIG5hbWUgKyAnYCBhbHJlYWR5IGV4aXN0Jyk7XG4gICAgcmV0dXJuIHRoaXNbIG5hbWUgXTtcbiAgfVxuXG4gIGlmICggJ1NjaGVtYScgIT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggc2NoZW1hLmNvbnN0cnVjdG9yICkgKXtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgc2NoZW1hYCBtdXN0IGJlIFNjaGVtYSBpbnN0YW5jZScpO1xuICB9XG5cbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMucHVzaCggbmFtZSApO1xuXG4gIHJldHVybiB0aGlzWyBuYW1lIF0gPSBuZXcgQ29sbGVjdGlvbiggbmFtZSwgc2NoZW1hLCBhcGkgKTtcbn07XG5cbi8qKlxuICog0J/QvtC70YPRh9C40YLRjCDQvdCw0LfQstCw0L3QuNC1INC60L7Qu9C70LXQutGG0LjQuSDQsiDQstC40LTQtSDQvNCw0YHRgdC40LLQsCDRgdGC0YDQvtC6LlxuICpcbiAqIEByZXR1cm5zIHtBcnJheS48c3RyaW5nPn0gQW4gYXJyYXkgY29udGFpbmluZyBhbGwgY29sbGVjdGlvbnMgaW4gdGhlIHN0b3JhZ2UuXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLmdldENvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lcztcbn07XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIENvbGxlY3Rpb24gY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIENvbGxlY3Rpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuQ29sbGVjdGlvbiA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgdmVyc2lvblxuICpcbiAqIEBwcm9wZXJ0eSB2ZXJzaW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG4vL3RvZG86XG4vL1N0b3JhZ2UucHJvdG90eXBlLnZlcnNpb24gPSBwa2cudmVyc2lvbjtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbU2NoZW1hXSgjc2NoZW1hX1NjaGVtYSkgY29uc3RydWN0b3JcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgU2NoZW1hID0gbW9uZ29vc2UuU2NoZW1hO1xuICogICAgIHZhciBDYXRTY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWEgPSBTY2hlbWE7XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIFtTY2hlbWFUeXBlXSgjc2NoZW1hdHlwZV9TY2hlbWFUeXBlKSBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgU2NoZW1hVHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWFUeXBlID0gU2NoZW1hVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBNb25nb29zZSBTY2hlbWFUeXBlcy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfQWxpYXMgb2YgbW9uZ29vc2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXG4gKlxuICogQHByb3BlcnR5IFNjaGVtYVR5cGVzXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWFUeXBlcyA9IFNjaGVtYS5UeXBlcztcblxuLyoqXG4gKiBUaGUgTW9uZ29vc2UgW1ZpcnR1YWxUeXBlXSgjdmlydHVhbHR5cGVfVmlydHVhbFR5cGUpIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBWaXJ0dWFsVHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5WaXJ0dWFsVHlwZSA9IFZpcnR1YWxUeXBlO1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIE1vbmdvb3NlIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBhcnJheSA9IG1vbmdvb3NlLlR5cGVzLkFycmF5O1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtPYmplY3RJZF0oI3R5cGVzLW9iamVjdGlkLWpzKVxuICogLSBbU3ViRG9jdW1lbnRdKCN0eXBlcy1lbWJlZGRlZC1qcylcbiAqIC0gW0FycmF5XSgjdHlwZXMtYXJyYXktanMpXG4gKiAtIFtEb2N1bWVudEFycmF5XSgjdHlwZXMtZG9jdW1lbnRhcnJheS1qcylcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgT2JqZWN0SWRgIHR5cGUsIHdlIGNhbiBjb25zdHJ1Y3QgaWRzIG9uIGRlbWFuZC5cbiAqXG4gKiAgICAgdmFyIE9iamVjdElkID0gbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQ7XG4gKiAgICAgdmFyIGlkMSA9IG5ldyBPYmplY3RJZDtcbiAqXG4gKiBAcHJvcGVydHkgVHlwZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuVHlwZXMgPSBUeXBlcztcblxuLyoqXG4gKiBUaGUgTW9uZ29vc2UgW0RvY3VtZW50XSgjZG9jdW1lbnQtanMpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRG9jdW1lbnRcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuRG9jdW1lbnQgPSBEb2N1bWVudDtcblxuLyoqXG4gKiBUaGUgW01vbmdvb3NlRXJyb3JdKCNlcnJvcl9Nb25nb29zZUVycm9yKSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAbWV0aG9kIEVycm9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG5cblxuU3RvcmFnZS5wcm90b3R5cGUuU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcblN0b3JhZ2UucHJvdG90eXBlLnV0aWxzID0gdXRpbHM7XG5TdG9yYWdlLnByb3RvdHlwZS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuU3RvcmFnZS5wcm90b3R5cGUuc2NoZW1hcyA9IFNjaGVtYS5zY2hlbWFzO1xuXG5TdG9yYWdlLnByb3RvdHlwZS5zZXRBZGFwdGVyID0gZnVuY3Rpb24oIGFkYXB0ZXJIb29rcyApe1xuICBEb2N1bWVudC5wcm90b3R5cGUuYWRhcHRlckhvb2tzID0gYWRhcHRlckhvb2tzO1xufTtcblxuLypcbiAqIEdlbmVyYXRlIGEgcmFuZG9tIHV1aWQuXG4gKiBodHRwOi8vd3d3LmJyb29mYS5jb20vVG9vbHMvTWF0aC51dWlkLmh0bVxuICogZm9yayBNYXRoLnV1aWQuanMgKHYxLjQpXG4gKlxuICogaHR0cDovL3d3dy5icm9vZmEuY29tLzIwMDgvMDkvamF2YXNjcmlwdC11dWlkLWZ1bmN0aW9uL1xuICovXG4vKnV1aWQ6IHtcbiAgLy8gUHJpdmF0ZSBhcnJheSBvZiBjaGFycyB0byB1c2VcbiAgQ0hBUlM6ICcwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3BsaXQoJycpLFxuXG4gIC8vIHJldHVybnMgUkZDNDEyMiwgdmVyc2lvbiA0IElEXG4gIGdlbmVyYXRlOiBmdW5jdGlvbigpe1xuICAgIHZhciBjaGFycyA9IHRoaXMuQ0hBUlMsIHV1aWQgPSBuZXcgQXJyYXkoIDM2ICksIHJuZCA9IDAsIHI7XG4gICAgZm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkrKyApIHtcbiAgICAgIGlmICggaSA9PSA4IHx8IGkgPT0gMTMgfHwgaSA9PSAxOCB8fCBpID09IDIzICkge1xuICAgICAgICB1dWlkW2ldID0gJy0nO1xuICAgICAgfSBlbHNlIGlmICggaSA9PSAxNCApIHtcbiAgICAgICAgdXVpZFtpXSA9ICc0JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICggcm5kIDw9IDB4MDIgKSBybmQgPSAweDIwMDAwMDAgKyAoTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMCkgfCAwO1xuICAgICAgICByID0gcm5kICYgMHhmO1xuICAgICAgICBybmQgPSBybmQgPj4gNDtcbiAgICAgICAgdXVpZFtpXSA9IGNoYXJzWyhpID09IDE5KSA/IChyICYgMHgzKSB8IDB4OCA6IHJdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdXVpZC5qb2luKCcnKS50b0xvd2VyQ2FzZSgpO1xuICB9XG59Ki9cblxuXG4vKiFcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBTdG9yYWdlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU3RvcmFnZTtcbiIsIi8vINCc0LDRiNC40L3QsCDRgdC+0YHRgtC+0Y/QvdC40Lkg0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQv9C+0LzQtdGC0LrQuCwg0LIg0LrQsNC60L7QvCDRgdC+0YHRgtC+0Y/QvdC40Lgg0L3QsNGF0L7QtNGP0YLRgdGPINC/0L7Qu9C1XG4vLyDQndCw0L/RgNC40LzQtdGAOiDQtdGB0LvQuCDQv9C+0LvQtSDQuNC80LXQtdGCINGB0L7RgdGC0L7Rj9C90LjQtSBkZWZhdWx0IC0g0LfQvdCw0YfQuNGCINC10LPQviDQt9C90LDRh9C10L3QuNC10Lwg0Y/QstC70Y/QtdGC0YHRjyDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOXG4vLyDQn9GA0LjQvNC10YfQsNC90LjQtTog0LTQu9GPINC80LDRgdGB0LjQstC+0LIg0LIg0L7QsdGJ0LXQvCDRgdC70YPRh9Cw0LUg0Y3RgtC+INC+0LfQvdCw0YfQsNC10YIg0L/Rg9GB0YLQvtC5INC80LDRgdGB0LjQslxuXG4vKiFcbiAqIERlcGVuZGVuY2llc1xuICovXG5cbnZhciBTdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xuXG52YXIgQWN0aXZlUm9zdGVyID0gU3RhdGVNYWNoaW5lLmN0b3IoJ3JlcXVpcmUnLCAnbW9kaWZ5JywgJ2luaXQnLCAnZGVmYXVsdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVybmFsQ2FjaGU7XG5cbmZ1bmN0aW9uIEludGVybmFsQ2FjaGUgKCkge1xuICB0aGlzLnN0cmljdE1vZGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2F2ZUVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hZGhvY1BhdGhzID0gdW5kZWZpbmVkO1xuICB0aGlzLnJlbW92aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLmluc2VydGluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy52ZXJzaW9uID0gdW5kZWZpbmVkO1xuICB0aGlzLmdldHRlcnMgPSB7fTtcbiAgdGhpcy5faWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMucG9wdWxhdGUgPSB1bmRlZmluZWQ7IC8vIHdoYXQgd2Ugd2FudCB0byBwb3B1bGF0ZSBpbiB0aGlzIGRvY1xuICB0aGlzLnBvcHVsYXRlZCA9IHVuZGVmaW5lZDsvLyB0aGUgX2lkcyB0aGF0IGhhdmUgYmVlbiBwb3B1bGF0ZWRcbiAgdGhpcy53YXNQb3B1bGF0ZWQgPSBmYWxzZTsgLy8gaWYgdGhpcyBkb2Mgd2FzIHRoZSByZXN1bHQgb2YgYSBwb3B1bGF0aW9uXG4gIHRoaXMuc2NvcGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWN0aXZlUGF0aHMgPSBuZXcgQWN0aXZlUm9zdGVyO1xuXG4gIC8vIGVtYmVkZGVkIGRvY3NcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gdW5kZWZpbmVkO1xuICB0aGlzLmZ1bGxQYXRoID0gdW5kZWZpbmVkO1xufVxuIiwiLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBvYmplY3QgYG9gIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBvYmogPSB7XG4gKiAgICAgICAgIGNvbW1lbnRzOiBbXG4gKiAgICAgICAgICAgICB7IHRpdGxlOiAnZXhjaXRpbmchJywgX2RvYzogeyB0aXRsZTogJ2dyZWF0IScgfX1cbiAqICAgICAgICAgICAsIHsgdGl0bGU6ICdudW1iZXIgZG9zJyB9XG4gKiAgICAgICAgIF1cbiAqICAgICB9XG4gKlxuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8pICAgICAgICAgLy8gJ2V4Y2l0aW5nISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvLCAnX2RvYycpIC8vICdncmVhdCEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy50aXRsZScsIG8pICAgICAgICAgICAvLyBbJ2V4Y2l0aW5nIScsICdudW1iZXIgZG9zJ11cbiAqXG4gKiAgICAgLy8gc3VtbWFyeVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBtYXApXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwsIG1hcClcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCByZWNlaXZlcyBlYWNoIGluZGl2aWR1YWwgZm91bmQgdmFsdWUuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuXG5leHBvcnRzLmdldCA9IGZ1bmN0aW9uIChwYXRoLCBvLCBzcGVjaWFsLCBtYXApIHtcbiAgdmFyIGxvb2t1cDtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIHZhciBvYmogPSBvXG4gICAgLCBwYXJ0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgICAvLyByZWFkaW5nIGEgcHJvcGVydHkgZnJvbSB0aGUgYXJyYXkgaXRlbXNcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuXG4gICAgICByZXR1cm4gb2JqLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbVxuICAgICAgICAgID8gZXhwb3J0cy5nZXQocGF0aHMsIGl0ZW0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXApXG4gICAgICAgICAgOiBtYXAodW5kZWZpbmVkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChsb29rdXApIHtcbiAgICAgIG9iaiA9IGxvb2t1cChvYmosIHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmogPSBzcGVjaWFsICYmIG9ialtzcGVjaWFsXVxuICAgICAgICA/IG9ialtzcGVjaWFsXVtwYXJ0XVxuICAgICAgICA6IG9ialtwYXJ0XTtcbiAgICB9XG5cbiAgICBpZiAoIW9iaikgcmV0dXJuIG1hcChvYmopO1xuICB9XG5cbiAgcmV0dXJuIG1hcChvYmopO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIGB2YWxgIGF0IHRoZSBnaXZlbiBgcGF0aGAgb2Ygb2JqZWN0IGBvYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtBbnl0aGluZ30gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIGlzIHBhc3NlZCBlYWNoIGluZGl2aWR1YWwgdmFsdWUgYmVmb3JlIHNldHRpbmcgaXQuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuXG5leHBvcnRzLnNldCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG8sIHNwZWNpYWwsIG1hcCwgX2NvcHlpbmcpIHtcbiAgdmFyIGxvb2t1cDtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIGlmIChudWxsID09IG8pIHJldHVybjtcblxuICAvLyB0aGUgZXhpc3RhbmNlIG9mICQgaW4gYSBwYXRoIHRlbGxzIHVzIGlmIHRoZSB1c2VyIGRlc2lyZXNcbiAgLy8gdGhlIGNvcHlpbmcgb2YgYW4gYXJyYXkgaW5zdGVhZCBvZiBzZXR0aW5nIGVhY2ggdmFsdWUgb2ZcbiAgLy8gdGhlIGFycmF5IHRvIHRoZSBvbmUgYnkgb25lIHRvIG1hdGNoaW5nIHBvc2l0aW9ucyBvZiB0aGVcbiAgLy8gY3VycmVudCBhcnJheS5cbiAgdmFyIGNvcHkgPSBfY29weWluZyB8fCAvXFwkLy50ZXN0KHBhdGgpXG4gICAgLCBvYmogPSBvXG4gICAgLCBwYXJ0XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPCBsZW47ICsraSkge1xuICAgIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgIGlmICgnJCcgPT0gcGFydCkge1xuICAgICAgaWYgKGkgPT0gbGVuIC0gMSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuICAgICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgb2Ygc2luZ2xlIHZhbHVlcyBvZiBhcnJheVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWxbal0sIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBlbnRpcmUgdmFsdWVcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm47XG4gIH1cblxuICAvLyBwcm9jZXNzIHRoZSBsYXN0IHByb3BlcnR5IG9mIHRoZSBwYXRoXG5cbiAgcGFydCA9IHBhcnRzW2xlbl07XG5cbiAgLy8gdXNlIHRoZSBzcGVjaWFsIHByb3BlcnR5IGlmIGV4aXN0c1xuICBpZiAoc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF0pIHtcbiAgICBvYmogPSBvYmpbc3BlY2lhbF07XG4gIH1cblxuICAvLyBzZXQgdGhlIHZhbHVlIG9uIHRoZSBsYXN0IGJyYW5jaFxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgZm9yICh2YXIgaXRlbSwgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbFtqXSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbFtqXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGl0ZW0gPSBvYmpbal07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xuICAgICAgICAgICAgbG9va3VwKGl0ZW0sIHBhcnQsIG1hcCh2YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xuICAgICAgICAgICAgaXRlbVtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBsb29rdXAob2JqLCBwYXJ0LCBtYXAodmFsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgIH1cbiAgfVxufVxuXG4vKiFcbiAqIFJldHVybnMgdGhlIHZhbHVlIHBhc3NlZCB0byBpdC5cbiAqL1xuXG5mdW5jdGlvbiBLICh2KSB7XG4gIHJldHVybiB2O1xufSIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBUeXBlc1xuICAsIHNjaGVtYXM7XG5cbi8qKlxuICogU2NoZW1hIGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgY2hpbGQgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nLCBhZ2U6IE51bWJlciwgY2hpbGRyZW46IFtjaGlsZF0gfSk7XG4gKiAgICAgdmFyIFRyZWUgPSBtb25nb29zZS5tb2RlbCgnVHJlZScsIHNjaGVtYSk7XG4gKlxuICogICAgIC8vIHNldHRpbmcgc2NoZW1hIG9wdGlvbnNcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgX2lkOiBmYWxzZSwgYXV0b0luZGV4OiBmYWxzZSB9KVxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gW2NvbGxlY3Rpb25dKC9kb2NzL2d1aWRlLmh0bWwjY29sbGVjdGlvbik6IHN0cmluZyAtIG5vIGRlZmF1bHRcbiAqIC0gW2lkXSgvZG9jcy9ndWlkZS5odG1sI2lkKTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gYG1pbmltaXplYDogYm9vbCAtIGNvbnRyb2xzIFtkb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KSBiZWhhdmlvciB3aGVuIGNhbGxlZCBtYW51YWxseSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3N0cmljdF0oL2RvY3MvZ3VpZGUuaHRtbCNzdHJpY3QpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbdG9KU09OXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt0b09iamVjdF0oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt2ZXJzaW9uS2V5XSgvZG9jcy9ndWlkZS5odG1sI3ZlcnNpb25LZXkpOiBib29sIC0gZGVmYXVsdHMgdG8gXCJfX3ZcIlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9XaGVuIG5lc3Rpbmcgc2NoZW1hcywgKGBjaGlsZHJlbmAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLCBhbHdheXMgZGVjbGFyZSB0aGUgY2hpbGQgc2NoZW1hIGZpcnN0IGJlZm9yZSBwYXNzaW5nIGl0IGludG8gaXMgcGFyZW50Ll9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3x1bmRlZmluZWR9IFtuYW1lXSDQndCw0LfQstCw0L3QuNC1INGB0YXQtdC80YtcbiAqIEBwYXJhbSB7U2NoZW1hfSBbYmFzZVNjaGVtYV0g0JHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCDQv9GA0Lgg0L3QsNGB0LvQtdC00L7QstCw0L3QuNC4XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqINCh0YXQtdC80LBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYSAoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApIHtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBTY2hlbWEpIClcbiAgICByZXR1cm4gbmV3IFNjaGVtYSggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICk7XG5cbiAgLy8g0JXRgdC70Lgg0Y3RgtC+INC40LzQtdC90L7QstCw0L3QsNGPINGB0YXQtdC80LBcbiAgaWYgKCB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgKXtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHNjaGVtYXNbIG5hbWUgXSA9IHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSBuYW1lO1xuICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoICEoYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkgKXtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXG4gIHRoaXMuc291cmNlID0gb2JqO1xuXG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdWJwYXRocyA9IHt9O1xuICB0aGlzLnZpcnR1YWxzID0ge307XG4gIHRoaXMubmVzdGVkID0ge307XG4gIHRoaXMuaW5oZXJpdHMgPSB7fTtcbiAgdGhpcy5jYWxsUXVldWUgPSBbXTtcbiAgdGhpcy5tZXRob2RzID0ge307XG4gIHRoaXMuc3RhdGljcyA9IHt9O1xuICB0aGlzLnRyZWUgPSB7fTtcbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHVuZGVmaW5lZDtcblxuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmRlZmF1bHRPcHRpb25zKCBvcHRpb25zICk7XG5cbiAgaWYgKCBiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICl7XG4gICAgYmFzZVNjaGVtYS5kaXNjcmltaW5hdG9yKCBuYW1lLCB0aGlzICk7XG5cbiAgICAvL3RoaXMuZGlzY3JpbWluYXRvciggbmFtZSwgYmFzZVNjaGVtYSApO1xuICB9XG5cbiAgLy8gYnVpbGQgcGF0aHNcbiAgaWYgKCBvYmogKSB7XG4gICAgdGhpcy5hZGQoIG9iaiApO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgZ2V0IGFuIGF1dG8gX2lkIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b19pZCA9ICF0aGlzLnBhdGhzWydfaWQnXSAmJiAoIXRoaXMub3B0aW9ucy5ub0lkICYmIHRoaXMub3B0aW9ucy5faWQpO1xuICBpZiAoYXV0b19pZCkge1xuICAgIHRoaXMuYWRkKHsgX2lkOiB7dHlwZTogU2NoZW1hLk9iamVjdElkLCBhdXRvOiB0cnVlfSB9KTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIHJlY2VpdmUgYW4gaWQgZ2V0dGVyIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b2lkID0gIXRoaXMucGF0aHNbJ2lkJ10gJiYgdGhpcy5vcHRpb25zLmlkO1xuICBpZiAoIGF1dG9pZCApIHtcbiAgICB0aGlzLnZpcnR1YWwoJ2lkJykuZ2V0KCBpZEdldHRlciApO1xuICB9XG59XG5cbi8qIVxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBfaWQgY2FzdCB0byBhIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gaWRHZXR0ZXIgKCkge1xuICBpZiAodGhpcy4kX18uX2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLl9pZDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5faWQgPSBudWxsID09IHRoaXMuX2lkXG4gICAgPyBudWxsXG4gICAgOiBTdHJpbmcodGhpcy5faWQpO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBmbGF0IHBhdGhzXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgICAgOiBTY2hlbWFUeXBlLFxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSBwYXRoc1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBhIHRyZWVcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICA6IE9iamVjdElkXG4gKiAgICAgICAsICduZXN0ZWQnICA6IHtcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgdHJlZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnRyZWU7XG5cbi8qKlxuICogUmV0dXJucyBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoaXMgc2NoZW1hLCBtZXJnZWQgd2l0aCBgb3B0aW9uc2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLmRlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9ICQuZXh0ZW5kKHtcbiAgICAgIHN0cmljdDogdHJ1ZVxuICAgICwgdmVyc2lvbktleTogJ19fdidcbiAgICAsIGRpc2NyaW1pbmF0b3JLZXk6ICdfX3QnXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIG9ubHkgYXBwbGllZCBhdCBjb25zdHJ1Y3Rpb24gdGltZVxuICAgICwgX2lkOiB0cnVlXG4gICAgLCBpZDogdHJ1ZVxuICB9LCBvcHRpb25zICk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZHMga2V5IHBhdGggLyBzY2hlbWEgdHlwZSBwYWlycyB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIFRveVNjaGVtYSA9IG5ldyBTY2hlbWE7XG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKG51bGwgPT0gb2JqWyBrZXkgXSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB2YWx1ZSBmb3Igc2NoZW1hIHBhdGggYCcrIHByZWZpeCArIGtleSArJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdChvYmpba2V5XSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpba2V5XS5jb25zdHJ1Y3RvcikgKVxuICAgICAgJiYgKCAhb2JqWyBrZXkgXS50eXBlIHx8IG9ialsga2V5IF0udHlwZS50eXBlICkgKXtcblxuICAgICAgaWYgKCBPYmplY3Qua2V5cyhvYmpbIGtleSBdKS5sZW5ndGggKSB7XG4gICAgICAgIC8vIG5lc3RlZCBvYmplY3QgeyBsYXN0OiB7IG5hbWU6IFN0cmluZyB9fVxuICAgICAgICB0aGlzLm5lc3RlZFsgcHJlZml4ICsga2V5IF0gPSB0cnVlO1xuICAgICAgICB0aGlzLmFkZCggb2JqWyBrZXkgXSwgcHJlZml4ICsga2V5ICsgJy4nKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wYXRoKCBwcmVmaXggKyBrZXksIG9ialsga2V5IF0gKTsgLy8gbWl4ZWQgdHlwZVxuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFJlc2VydmVkIGRvY3VtZW50IGtleXMuXG4gKlxuICogS2V5cyBpbiB0aGlzIG9iamVjdCBhcmUgbmFtZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaW4gc2NoZW1hIGRlY2xhcmF0aW9ucyBiL2MgdGhleSBjb25mbGljdCB3aXRoIG1vbmdvb3NlIGZ1bmN0aW9uYWxpdHkuIFVzaW5nIHRoZXNlIGtleSBuYW1lIHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKlxuICogICAgICBvbiwgZW1pdCwgX2V2ZW50cywgZGIsIGdldCwgc2V0LCBpbml0LCBpc05ldywgZXJyb3JzLCBzY2hlbWEsIG9wdGlvbnMsIG1vZGVsTmFtZSwgY29sbGVjdGlvbiwgX3ByZXMsIF9wb3N0cywgdG9PYmplY3RcbiAqXG4gKiBfTk9URTpfIFVzZSBvZiB0aGVzZSB0ZXJtcyBhcyBtZXRob2QgbmFtZXMgaXMgcGVybWl0dGVkLCBidXQgcGxheSBhdCB5b3VyIG93biByaXNrLCBhcyB0aGV5IG1heSBiZSBleGlzdGluZyBtb25nb29zZSBkb2N1bWVudCBtZXRob2RzIHlvdSBhcmUgc3RvbXBpbmcgb24uXG4gKlxuICogICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgIHNjaGVtYS5tZXRob2RzLmluaXQgPSBmdW5jdGlvbiAoKSB7fSAvLyBwb3RlbnRpYWxseSBicmVha2luZ1xuICovXG5TY2hlbWEucmVzZXJ2ZWQgPSBPYmplY3QuY3JlYXRlKCBudWxsICk7XG52YXIgcmVzZXJ2ZWQgPSBTY2hlbWEucmVzZXJ2ZWQ7XG5yZXNlcnZlZC5vbiA9XG5yZXNlcnZlZC5kYiA9XG5yZXNlcnZlZC5nZXQgPVxucmVzZXJ2ZWQuc2V0ID1cbnJlc2VydmVkLmluaXQgPVxucmVzZXJ2ZWQuaXNOZXcgPVxucmVzZXJ2ZWQuZXJyb3JzID1cbnJlc2VydmVkLnNjaGVtYSA9XG5yZXNlcnZlZC5vcHRpb25zID1cbnJlc2VydmVkLm1vZGVsTmFtZSA9XG5yZXNlcnZlZC5jb2xsZWN0aW9uID1cbnJlc2VydmVkLnRvT2JqZWN0ID1cbnJlc2VydmVkLmRvbWFpbiA9XG5yZXNlcnZlZC5lbWl0ID0gICAgLy8gRXZlbnRFbWl0dGVyXG5yZXNlcnZlZC5fZXZlbnRzID0gLy8gRXZlbnRFbWl0dGVyXG5yZXNlcnZlZC5fcHJlcyA9IHJlc2VydmVkLl9wb3N0cyA9IDE7IC8vIGhvb2tzLmpzXG5cbi8qKlxuICogR2V0cy9zZXRzIHNjaGVtYSBwYXRocy5cbiAqXG4gKiBTZXRzIGEgcGF0aCAoaWYgYXJpdHkgMilcbiAqIEdldHMgYSBwYXRoIChpZiBhcml0eSAxKVxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykgLy8gcmV0dXJucyBhIFNjaGVtYVR5cGVcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScsIE51bWJlcikgLy8gY2hhbmdlcyB0aGUgc2NoZW1hVHlwZSBvZiBgbmFtZWAgdG8gTnVtYmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICBpZiAob2JqID09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdKSByZXR1cm4gdGhpcy5wYXRoc1twYXRoXTtcbiAgICBpZiAodGhpcy5zdWJwYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMuc3VicGF0aHNbcGF0aF07XG5cbiAgICAvLyBzdWJwYXRocz9cbiAgICByZXR1cm4gL1xcLlxcZCtcXC4/LiokLy50ZXN0KHBhdGgpXG4gICAgICA/IGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHNvbWUgcGF0aCBuYW1lcyBjb25mbGljdCB3aXRoIGRvY3VtZW50IG1ldGhvZHNcbiAgaWYgKHJlc2VydmVkW3BhdGhdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYFwiICsgcGF0aCArIFwiYCBtYXkgbm90IGJlIHVzZWQgYXMgYSBzY2hlbWEgcGF0aG5hbWVcIik7XG4gIH1cblxuICAvLyB1cGRhdGUgdGhlIHRyZWVcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuLylcbiAgICAsIGxhc3QgPSBzdWJwYXRocy5wb3AoKVxuICAgICwgYnJhbmNoID0gdGhpcy50cmVlO1xuXG4gIHN1YnBhdGhzLmZvckVhY2goZnVuY3Rpb24oc3ViLCBpKSB7XG4gICAgaWYgKCFicmFuY2hbc3ViXSkgYnJhbmNoW3N1Yl0gPSB7fTtcbiAgICBpZiAoJ29iamVjdCcgIT0gdHlwZW9mIGJyYW5jaFtzdWJdKSB7XG4gICAgICB2YXIgbXNnID0gJ0Nhbm5vdCBzZXQgbmVzdGVkIHBhdGggYCcgKyBwYXRoICsgJ2AuICdcbiAgICAgICAgICAgICAgKyAnUGFyZW50IHBhdGggYCdcbiAgICAgICAgICAgICAgKyBzdWJwYXRocy5zbGljZSgwLCBpKS5jb25jYXQoW3N1Yl0pLmpvaW4oJy4nKVxuICAgICAgICAgICAgICArICdgIGFscmVhZHkgc2V0IHRvIHR5cGUgJyArIGJyYW5jaFtzdWJdLm5hbWVcbiAgICAgICAgICAgICAgKyAnLic7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG4gICAgYnJhbmNoID0gYnJhbmNoW3N1Yl07XG4gIH0pO1xuXG4gIGJyYW5jaFtsYXN0XSA9IHV0aWxzLmNsb25lKG9iaik7XG5cbiAgdGhpcy5wYXRoc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgb2JqKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHR5cGUgYXJndW1lbnRzIGludG8gU2NoZW1hIFR5cGVzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIGNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLmludGVycHJldEFzVHlwZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgdmFyIGNvbnN0cnVjdG9yTmFtZSA9IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmouY29uc3RydWN0b3IpO1xuICBpZiAoY29uc3RydWN0b3JOYW1lICE9ICdPYmplY3QnKXtcbiAgICBvYmogPSB7IHR5cGU6IG9iaiB9O1xuICB9XG5cbiAgLy8gR2V0IHRoZSB0eXBlIG1ha2luZyBzdXJlIHRvIGFsbG93IGtleXMgbmFtZWQgXCJ0eXBlXCJcbiAgLy8gYW5kIGRlZmF1bHQgdG8gbWl4ZWQgaWYgbm90IHNwZWNpZmllZC5cbiAgLy8geyB0eXBlOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2ZyZXNoY3V0JyB9IH1cbiAgdmFyIHR5cGUgPSBvYmoudHlwZSAmJiAhb2JqLnR5cGUudHlwZVxuICAgID8gb2JqLnR5cGVcbiAgICA6IHt9O1xuXG4gIGlmICgnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZS5jb25zdHJ1Y3RvcikgfHwgJ21peGVkJyA9PSB0eXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcbiAgICAvLyBpZiBpdCB3YXMgc3BlY2lmaWVkIHRocm91Z2ggeyB0eXBlIH0gbG9vayBmb3IgYGNhc3RgXG4gICAgdmFyIGNhc3QgPSAoQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpXG4gICAgICA/IG9iai5jYXN0XG4gICAgICA6IHR5cGVbMF07XG5cbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIGNhc3QsIG9iaik7XG4gICAgfVxuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBjYXN0KSB7XG4gICAgICBjYXN0ID0gVHlwZXNbY2FzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhc3Quc3Vic3RyaW5nKDEpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShjYXN0LmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhjYXN0KS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBuZXcgU2NoZW1hKGNhc3QpLCBvYmopO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVHlwZXMuQXJyYXkocGF0aCwgY2FzdCB8fCBUeXBlcy5NaXhlZCwgb2JqKTtcbiAgfVxuXG4gIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIHR5cGVcbiAgICA/IHR5cGVcbiAgICAvLyBJZiBub3Qgc3RyaW5nLCBgdHlwZWAgaXMgYSBmdW5jdGlvbi4gT3V0c2lkZSBvZiBJRSwgZnVuY3Rpb24ubmFtZVxuICAgIC8vIGdpdmVzIHlvdSB0aGUgZnVuY3Rpb24gbmFtZS4gSW4gSUUsIHlvdSBuZWVkIHRvIGNvbXB1dGUgaXRcbiAgICA6IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlKTtcblxuICBpZiAobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09IFR5cGVzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5kZWZpbmVkIHR5cGUgYXQgYCcgKyBwYXRoICtcbiAgICAgICAgJ2BcXG4gIERpZCB5b3UgdHJ5IG5lc3RpbmcgU2NoZW1hcz8gJyArXG4gICAgICAgICdZb3UgY2FuIG9ubHkgbmVzdCB1c2luZyByZWZzIG9yIGFycmF5cy4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgVHlwZXNbbmFtZV0ocGF0aCwgb2JqKTtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhlIHNjaGVtYXMgcGF0aHMgc2ltaWxhciB0byBBcnJheSNmb3JFYWNoLlxuICpcbiAqIFRoZSBjYWxsYmFjayBpcyBwYXNzZWQgdGhlIHBhdGhuYW1lIGFuZCBzY2hlbWFUeXBlIGFzIGFyZ3VtZW50cyBvbiBlYWNoIGl0ZXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybiB7U2NoZW1hfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmVhY2hQYXRoID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBmbihrZXlzW2ldLCB0aGlzLnBhdGhzW2tleXNbaV1dKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIEFycmF5IG9mIHBhdGggc3RyaW5ncyB0aGF0IGFyZSByZXF1aXJlZCBieSB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblNjaGVtYS5wcm90b3R5cGUucmVxdWlyZWRQYXRocyA9IGZ1bmN0aW9uIHJlcXVpcmVkUGF0aHMgKCkge1xuICBpZiAodGhpcy5fcmVxdWlyZWRwYXRocykgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHJldCA9IFtdO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIgcGF0aCA9IHBhdGhzW2ldO1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdLmlzUmVxdWlyZWQpIHJldC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSByZXQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhdGhUeXBlIG9mIGBwYXRoYCBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogR2l2ZW4gYSBwYXRoLCByZXR1cm5zIHdoZXRoZXIgaXQgaXMgYSByZWFsLCB2aXJ0dWFsLCBuZXN0ZWQsIG9yIGFkLWhvYy91bmRlZmluZWQgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoVHlwZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmIChwYXRoIGluIHRoaXMucGF0aHMpIHJldHVybiAncmVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMudmlydHVhbHMpIHJldHVybiAndmlydHVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMubmVzdGVkKSByZXR1cm4gJ25lc3RlZCc7XG4gIGlmIChwYXRoIGluIHRoaXMuc3VicGF0aHMpIHJldHVybiAncmVhbCc7XG5cbiAgaWYgKC9cXC5cXGQrXFwufFxcLlxcZCskLy50ZXN0KHBhdGgpICYmIGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpKSB7XG4gICAgcmV0dXJuICdyZWFsJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ2FkaG9jT3JVbmRlZmluZWQnXG4gIH1cbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGdldFBvc2l0aW9uYWxQYXRoIChzZWxmLCBwYXRoKSB7XG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLihcXGQrKVxcLnxcXC4oXFxkKykkLykuZmlsdGVyKEJvb2xlYW4pO1xuICBpZiAoc3VicGF0aHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBzZWxmLnBhdGhzW3N1YnBhdGhzWzBdXTtcbiAgfVxuXG4gIHZhciB2YWwgPSBzZWxmLnBhdGgoc3VicGF0aHNbMF0pO1xuICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcblxuICB2YXIgbGFzdCA9IHN1YnBhdGhzLmxlbmd0aCAtIDFcbiAgICAsIHN1YnBhdGhcbiAgICAsIGkgPSAxO1xuXG4gIGZvciAoOyBpIDwgc3VicGF0aHMubGVuZ3RoOyArK2kpIHtcbiAgICBzdWJwYXRoID0gc3VicGF0aHNbaV07XG5cbiAgICBpZiAoaSA9PT0gbGFzdCAmJiB2YWwgJiYgIXZhbC5zY2hlbWEgJiYgIS9cXEQvLnRlc3Qoc3VicGF0aCkpIHtcbiAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBUeXBlcy5BcnJheSkge1xuICAgICAgICAvLyBTdHJpbmdTY2hlbWEsIE51bWJlclNjaGVtYSwgZXRjXG4gICAgICAgIHZhbCA9IHZhbC5jYXN0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgaWYgaXRzIGp1c3QgYSBwb3NpdGlvbiBzZWdtZW50OiBwYXRoLjAuc3VicGF0aFxuICAgIGlmICghL1xcRC8udGVzdChzdWJwYXRoKSkgY29udGludWU7XG5cbiAgICBpZiAoISh2YWwgJiYgdmFsLnNjaGVtYSkpIHtcbiAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhbCA9IHZhbC5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzW3BhdGhdID0gdmFsO1xufVxuXG4vKipcbiAqIEFkZHMgYSBtZXRob2QgY2FsbCB0byB0aGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgZG9jdW1lbnQgbWV0aG9kIHRvIGNhbGwgbGF0ZXJcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucXVldWUgPSBmdW5jdGlvbihuYW1lLCBhcmdzKXtcbiAgdGhpcy5jYWxsUXVldWUucHVzaChbbmFtZSwgYXJnc10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHByZSBob29rIGZvciB0aGUgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHRveVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCdzYXZlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB0aGlzLmNyZWF0ZWQgPSBuZXcgRGF0ZTtcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCd2YWxpZGF0ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gKiAgICAgICBpZiAodGhpcy5uYW1lICE9ICdXb29keScpIHRoaXMubmFtZSA9ICdXb29keSc7XG4gKiAgICAgICBuZXh0KCk7XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnByZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdwcmUnLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcG9zdCBmb3IgdGhlIGRvY3VtZW50XG4gKlxuICogUG9zdCBob29rcyBmaXJlIGBvbmAgdGhlIGV2ZW50IGVtaXR0ZWQgZnJvbSBkb2N1bWVudCBpbnN0YW5jZXMgb2YgTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEucG9zdCgnc2F2ZScsIGZ1bmN0aW9uIChkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVkIGFmdGVyIGEgZG9jdW1lbnQgd2FzIHNhdmVkJyk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKCdNb2RlbCcsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBtID0gbmV3IE1vZGVsKC4uKTtcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZXMgYWZ0ZXIgdGhlIGBwb3N0YCBob29rJyk7XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaG9va1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2tcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24obWV0aG9kLCBmbil7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdvbicsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIHBsdWdpbiBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGx1Z2luIGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQHNlZSBwbHVnaW5zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBsdWdpbiA9IGZ1bmN0aW9uIChmbiwgb3B0cykge1xuICBmbih0aGlzLCBvcHRzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gaW5zdGFuY2UgbWV0aG9kIHRvIGRvY3VtZW50cyBjb25zdHJ1Y3RlZCBmcm9tIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBraXR0eVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKCdtZW93JywgZnVuY3Rpb24gKCkge1xuICogICAgICAgY29uc29sZS5sb2coJ21lZWVlZW9vb29vb29vb29vb3cnKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgS2l0dHkgPSBtb25nb29zZS5tb2RlbCgnS2l0dHknLCBzY2hlbWEpO1xuICpcbiAqICAgICB2YXIgZml6eiA9IG5ldyBLaXR0eTtcbiAqICAgICBmaXp6Lm1lb3coKTsgLy8gbWVlZWVlb29vb29vb29vb29vb3dcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgbWV0aG9kcy5cbiAqXG4gKiAgICAgc2NoZW1hLm1ldGhvZCh7XG4gKiAgICAgICAgIHB1cnI6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgICAsIHNjcmF0Y2g6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGxhdGVyXG4gKiAgICAgZml6ei5wdXJyKCk7XG4gKiAgICAgZml6ei5zY3JhdGNoKCk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBtZXRob2QgbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMubWV0aG9kc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLm1ldGhvZHNbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgc3RhdGljIFwiY2xhc3NcIiBtZXRob2RzIHRvIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEuc3RhdGljKCdmaW5kQnlOYW1lJywgZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5maW5kKHsgbmFtZTogbmFtZSB9LCBjYWxsYmFjayk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBEcmluayA9IG1vbmdvb3NlLm1vZGVsKCdEcmluaycsIHNjaGVtYSk7XG4gKiAgICAgRHJpbmsuZmluZEJ5TmFtZSgnc2FucGVsbGVncmlubycsIGZ1bmN0aW9uIChlcnIsIGRyaW5rcykge1xuICogICAgICAgLy9cbiAqICAgICB9KTtcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgc3RhdGljcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuc3RhdGljID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLnN0YXRpY3NbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMvZ2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gaWYgbm90IHBhc3NlZCwgdGhlIGN1cnJlbnQgb3B0aW9uIHZhbHVlIGlzIHJldHVybmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zW2tleV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbCA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciB2aXJ0dWFscyA9IHRoaXMudmlydHVhbHM7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgcmV0dXJuIHZpcnR1YWxzW25hbWVdID0gcGFydHMucmVkdWNlKGZ1bmN0aW9uIChtZW0sIHBhcnQsIGkpIHtcbiAgICBtZW1bcGFydF0gfHwgKG1lbVtwYXJ0XSA9IChpID09PSBwYXJ0cy5sZW5ndGgtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDoge30pO1xuICAgIHJldHVybiBtZW1bcGFydF07XG4gIH0sIHRoaXMudHJlZSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbHBhdGggPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gdGhpcy52aXJ0dWFsc1tuYW1lXTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHByb3BlcnR5IGRpc2NyaW1pbmF0b3JzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuZGlzY3JpbWluYXRvcnM7XG5cbi8qKlxuICog0J3QsNGB0LvQtdC00L7QstCw0L3QuNC1INC+0YIg0YHRhdC10LzRiy5cbiAqIHRoaXMgLSDQsdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwISEhXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAgdmFyIFBlcnNvblNjaGVtYSA9IG5ldyBTY2hlbWEoJ1BlcnNvbicsIHtcbiAqICAgICAgIG5hbWU6IFN0cmluZyxcbiAqICAgICAgIGNyZWF0ZWRBdDogRGF0ZVxuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgQm9zc1NjaGVtYSA9IG5ldyBTY2hlbWEoJ0Jvc3MnLCBQZXJzb25TY2hlbWEsIHsgZGVwYXJ0bWVudDogU3RyaW5nIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgZGlzY3JpbWluYXRvciBtb2RlbCBuYW1lXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIGRpc2NyaW1pbmF0b3IgbW9kZWwgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmRpc2NyaW1pbmF0b3IgPSBmdW5jdGlvbiBkaXNjcmltaW5hdG9yIChuYW1lLCBzY2hlbWEpIHtcbiAgaWYgKCEoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHBhc3MgYSB2YWxpZCBkaXNjcmltaW5hdG9yIFNjaGVtYVwiKTtcbiAgfVxuXG4gIGlmICggdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyAmJiAhdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3QgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGNhbiBvbmx5IGJlIGEgZGlzY3JpbWluYXRvciBvZiB0aGUgcm9vdCBtb2RlbFwiKTtcbiAgfVxuXG4gIHZhciBrZXkgPSB0aGlzLm9wdGlvbnMuZGlzY3JpbWluYXRvcktleTtcbiAgaWYgKCBzY2hlbWEucGF0aChrZXkpICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW5ub3QgaGF2ZSBmaWVsZCB3aXRoIG5hbWUgXFxcIlwiICsga2V5ICsgXCJcXFwiXCIpO1xuICB9XG5cbiAgLy8gbWVyZ2VzIGJhc2Ugc2NoZW1hIGludG8gbmV3IGRpc2NyaW1pbmF0b3Igc2NoZW1hIGFuZCBzZXRzIG5ldyB0eXBlIGZpZWxkLlxuICAoZnVuY3Rpb24gbWVyZ2VTY2hlbWFzKHNjaGVtYSwgYmFzZVNjaGVtYSkge1xuICAgIHV0aWxzLm1lcmdlKHNjaGVtYSwgYmFzZVNjaGVtYSk7XG5cbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW2tleV0gPSB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogbmFtZSB9O1xuICAgIHNjaGVtYS5hZGQob2JqKTtcbiAgICBzY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbmFtZSwgaXNSb290OiBmYWxzZSB9O1xuXG4gICAgaWYgKGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBzY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uID0gYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgICAvLyB0aHJvd3MgZXJyb3IgaWYgb3B0aW9ucyBhcmUgaW52YWxpZFxuICAgIChmdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbnMoYSwgYikge1xuICAgICAgYSA9IHV0aWxzLmNsb25lKGEpO1xuICAgICAgYiA9IHV0aWxzLmNsb25lKGIpO1xuICAgICAgZGVsZXRlIGEudG9KU09OO1xuICAgICAgZGVsZXRlIGEudG9PYmplY3Q7XG4gICAgICBkZWxldGUgYi50b0pTT047XG4gICAgICBkZWxldGUgYi50b09iamVjdDtcblxuICAgICAgaWYgKCF1dGlscy5kZWVwRXF1YWwoYSwgYikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpXCIpO1xuICAgICAgfVxuICAgIH0pKHNjaGVtYS5vcHRpb25zLCBiYXNlU2NoZW1hLm9wdGlvbnMpO1xuXG4gICAgdmFyIHRvSlNPTiA9IHNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgLCB0b09iamVjdCA9IHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuXG4gICAgc2NoZW1hLm9wdGlvbnMgPSB1dGlscy5jbG9uZShiYXNlU2NoZW1hLm9wdGlvbnMpO1xuICAgIGlmICh0b0pTT04pICAgc2NoZW1hLm9wdGlvbnMudG9KU09OID0gdG9KU09OO1xuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcblxuICAgIHNjaGVtYS5jYWxsUXVldWUgPSBiYXNlU2NoZW1hLmNhbGxRdWV1ZS5jb25jYXQoc2NoZW1hLmNhbGxRdWV1ZSk7XG4gICAgc2NoZW1hLl9yZXF1aXJlZHBhdGhzID0gdW5kZWZpbmVkOyAvLyByZXNldCBqdXN0IGluIGNhc2UgU2NoZW1hI3JlcXVpcmVkUGF0aHMoKSB3YXMgY2FsbGVkIG9uIGVpdGhlciBzY2hlbWFcbiAgfSkoc2NoZW1hLCB0aGlzKTtcblxuICBpZiAoIXRoaXMuZGlzY3JpbWluYXRvcnMpIHtcbiAgICB0aGlzLmRpc2NyaW1pbmF0b3JzID0ge307XG4gIH1cblxuICBpZiAoIXRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcpIHtcbiAgICB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG51bGwsIGlzUm9vdDogdHJ1ZSB9O1xuICB9XG5cbiAgaWYgKHRoaXMuZGlzY3JpbWluYXRvcnNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIHdpdGggbmFtZSBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGFscmVhZHkgZXhpc3RzXCIpO1xuICB9XG5cbiAgdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSA9IHNjaGVtYTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hO1xud2luZG93LlNjaGVtYSA9IFNjaGVtYTtcblxuLy8gcmVxdWlyZSBkb3duIGhlcmUgYmVjYXVzZSBvZiByZWZlcmVuY2UgaXNzdWVzXG5cbi8qKlxuICogVGhlIHZhcmlvdXMgYnVpbHQtaW4gTW9uZ29vc2UgU2NoZW1hIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZDtcbiAqXG4gKiAjIyMjVHlwZXM6XG4gKlxuICogLSBbU3RyaW5nXSgjc2NoZW1hLXN0cmluZy1qcylcbiAqIC0gW051bWJlcl0oI3NjaGVtYS1udW1iZXItanMpXG4gKiAtIFtCb29sZWFuXSgjc2NoZW1hLWJvb2xlYW4tanMpIHwgQm9vbFxuICogLSBbQXJyYXldKCNzY2hlbWEtYXJyYXktanMpXG4gKiAtIFtEYXRlXSgjc2NoZW1hLWRhdGUtanMpXG4gKiAtIFtPYmplY3RJZF0oI3NjaGVtYS1vYmplY3RpZC1qcykgfCBPaWRcbiAqIC0gW01peGVkXSgjc2NoZW1hLW1peGVkLWpzKSB8IE9iamVjdFxuICpcbiAqIFVzaW5nIHRoaXMgZXhwb3NlZCBhY2Nlc3MgdG8gdGhlIGBNaXhlZGAgU2NoZW1hVHlwZSwgd2UgY2FuIHVzZSB0aGVtIGluIG91ciBzY2hlbWEuXG4gKlxuICogICAgIHZhciBNaXhlZCA9IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5NaXhlZDtcbiAqICAgICBuZXcgbW9uZ29vc2UuU2NoZW1hKHsgX3VzZXI6IE1peGVkIH0pXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLlR5cGVzID0gcmVxdWlyZSgnLi9zY2hlbWEvaW5kZXgnKTtcblxuLy8g0KXRgNCw0L3QuNC70LjRidC1INGB0YXQtdC8XG5TY2hlbWEuc2NoZW1hcyA9IHNjaGVtYXMgPSB7fTtcblxuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5cblR5cGVzID0gU2NoZW1hLlR5cGVzO1xudmFyIE9iamVjdElkID0gU2NoZW1hLk9iamVjdElkID0gVHlwZXMuT2JqZWN0SWQ7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIFR5cGVzID0ge1xuICAgICAgICBCb29sZWFuOiByZXF1aXJlKCcuL2Jvb2xlYW4nKVxuICAgICAgLCBEYXRlOiByZXF1aXJlKCcuL2RhdGUnKVxuICAgICAgLCBOdW1iZXI6IHJlcXVpcmUoJy4vbnVtYmVyJylcbiAgICAgICwgU3RyaW5nOiByZXF1aXJlKCcuL3N0cmluZycpXG4gICAgICAsIE9iamVjdElkOiByZXF1aXJlKCcuL29iamVjdGlkJylcbiAgICB9XG4gICwgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi4vdHlwZXMvYXJyYXknKVxuICAsIE1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG4gICwgRW1iZWRkZWREb2M7XG5cbi8qKlxuICogQXJyYXkgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gY2FzdFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gU2NoZW1hQXJyYXkgKGtleSwgY2FzdCwgb3B0aW9ucykge1xuICBpZiAoY2FzdCkge1xuICAgIHZhciBjYXN0T3B0aW9ucyA9IHt9O1xuXG4gICAgaWYgKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QuY29uc3RydWN0b3IgKSApIHtcbiAgICAgIGlmIChjYXN0LnR5cGUpIHtcbiAgICAgICAgLy8gc3VwcG9ydCB7IHR5cGU6IFdvb3QgfVxuICAgICAgICBjYXN0T3B0aW9ucyA9IF8uY2xvbmUoIGNhc3QgKTsgLy8gZG8gbm90IGFsdGVyIHVzZXIgYXJndW1lbnRzXG4gICAgICAgIGRlbGV0ZSBjYXN0T3B0aW9ucy50eXBlO1xuICAgICAgICBjYXN0ID0gY2FzdC50eXBlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FzdCA9IE1peGVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHN1cHBvcnQgeyB0eXBlOiAnU3RyaW5nJyB9XG4gICAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PSB0eXBlb2YgY2FzdFxuICAgICAgPyBjYXN0XG4gICAgICA6IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggY2FzdCApO1xuXG4gICAgdmFyIGNhc3RlciA9IG5hbWUgaW4gVHlwZXNcbiAgICAgID8gVHlwZXNbbmFtZV1cbiAgICAgIDogY2FzdDtcblxuICAgIHRoaXMuY2FzdGVyQ29uc3RydWN0b3IgPSBjYXN0ZXI7XG4gICAgdGhpcy5jYXN0ZXIgPSBuZXcgY2FzdGVyKG51bGwsIGNhc3RPcHRpb25zKTtcblxuICAgIC8vIGxhenkgbG9hZFxuICAgIEVtYmVkZGVkRG9jIHx8IChFbWJlZGRlZERvYyA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJykpO1xuXG4gICAgaWYgKCEodGhpcy5jYXN0ZXIgaW5zdGFuY2VvZiBFbWJlZGRlZERvYykpIHtcbiAgICAgIHRoaXMuY2FzdGVyLnBhdGggPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBkZWZhdWx0QXJyXG4gICAgLCBmbjtcblxuICBpZiAodGhpcy5kZWZhdWx0VmFsdWUpIHtcbiAgICBkZWZhdWx0QXJyID0gdGhpcy5kZWZhdWx0VmFsdWU7XG4gICAgZm4gPSAnZnVuY3Rpb24nID09IHR5cGVvZiBkZWZhdWx0QXJyO1xuICB9XG5cbiAgdGhpcy5kZWZhdWx0KGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyciA9IGZuID8gZGVmYXVsdEFycigpIDogZGVmYXVsdEFyciB8fCBbXTtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VBcnJheShhcnIsIHNlbGYucGF0aCwgdGhpcyk7XG4gIH0pO1xufVxuXG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hQXJyYXk7XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZXMgdGhlIGdldHRlcnMgYXBwbGljYXRpb24gZm9yIHRoZSBwb3B1bGF0aW9uIHNwZWNpYWwtY2FzZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgaWYgKHRoaXMuY2FzdGVyLm9wdGlvbnMgJiYgdGhpcy5jYXN0ZXIub3B0aW9ucy5yZWYpIHtcbiAgICAvLyBtZWFucyB0aGUgb2JqZWN0IGlkIHdhcyBwb3B1bGF0ZWRcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzLmNhbGwodGhpcywgdmFsdWUsIHNjb3BlKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgdmFsdWVzIGZvciBzZXQoKS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBkb2N1bWVudCB0aGF0IHRyaWdnZXJzIHRoZSBjYXN0aW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXQgd2hldGhlciB0aGlzIGlzIGFuIGluaXRpYWxpemF0aW9uIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUsIGRvYywgaW5pdCApIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgaWYgKCEodmFsdWUuaXNTdG9yYWdlQXJyYXkpKSB7XG4gICAgICB2YWx1ZSA9IG5ldyBTdG9yYWdlQXJyYXkodmFsdWUsIHRoaXMucGF0aCwgZG9jKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYXN0ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgdmFsdWVbaV0gPSB0aGlzLmNhc3Rlci5jYXN0KHZhbHVlW2ldLCBkb2MsIGluaXQpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHJldGhyb3dcbiAgICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcihlLnR5cGUsIHZhbHVlLCB0aGlzLnBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCk7XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBCb29sZWFuIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEJvb2xlYW5TY2hlbWEgKHBhdGgsIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCb29sZWFuU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2U7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGJvb2xlYW5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmIChudWxsID09PSB2YWx1ZSkgcmV0dXJuIHZhbHVlO1xuICBpZiAoJzAnID09PSB2YWx1ZSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoJ3RydWUnID09PSB2YWx1ZSkgcmV0dXJuIHRydWU7XG4gIGlmICgnZmFsc2UnID09PSB2YWx1ZSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gISEgdmFsdWU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQm9vbGVhblNjaGVtYTtcbiIsIi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcbnZhciBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvcjtcblxuLyoqXG4gKiBEYXRlIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBEYXRlU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERhdGVTY2hlbWE7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yIGZvciBkYXRlXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgRGF0ZTtcbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gZGF0ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09ICcnKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpXG4gICAgcmV0dXJuIHZhbHVlO1xuXG4gIHZhciBkYXRlO1xuXG4gIC8vIHN1cHBvcnQgZm9yIHRpbWVzdGFtcHNcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyIHx8ICdudW1iZXInID09IHR5cGVvZiB2YWx1ZVxuICAgICAgfHwgU3RyaW5nKHZhbHVlKSA9PSBOdW1iZXIodmFsdWUpKVxuICAgIGRhdGUgPSBuZXcgRGF0ZShOdW1iZXIodmFsdWUpKTtcblxuICAvLyBzdXBwb3J0IGZvciBkYXRlIHN0cmluZ3NcbiAgZWxzZSBpZiAodmFsdWUudG9TdHJpbmcpXG4gICAgZGF0ZSA9IG5ldyBEYXRlKHZhbHVlLnRvU3RyaW5nKCkpO1xuXG4gIGlmIChkYXRlLnRvU3RyaW5nKCkgIT0gJ0ludmFsaWQgRGF0ZScpXG4gICAgcmV0dXJuIGRhdGU7XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignZGF0ZScsIHZhbHVlLCB0aGlzLnBhdGggKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlU2NoZW1hO1xuIiwiXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBBcnJheVR5cGUgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBTdG9yYWdlRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2RvY3VtZW50YXJyYXknKVxuICAsIFN1YmRvY3VtZW50ID0gcmVxdWlyZSgnLi4vdHlwZXMvZW1iZWRkZWQnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBTdWJkb2NzQXJyYXkgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hQXJyYXlcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBEb2N1bWVudEFycmF5IChrZXksIHNjaGVtYSwgb3B0aW9ucykge1xuXG4gIC8vIGNvbXBpbGUgYW4gZW1iZWRkZWQgZG9jdW1lbnQgZm9yIHRoaXMgc2NoZW1hXG4gIGZ1bmN0aW9uIEVtYmVkZGVkRG9jdW1lbnQgKCkge1xuICAgIFN1YmRvY3VtZW50LmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3ViZG9jdW1lbnQucHJvdG90eXBlICk7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcbiAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICAvLyBhcHBseSBtZXRob2RzXG4gIGZvciAodmFyIGkgaW4gc2NoZW1hLm1ldGhvZHMpIHtcbiAgICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZVtpXSA9IHNjaGVtYS5tZXRob2RzW2ldO1xuICB9XG5cbiAgLy8gYXBwbHkgc3RhdGljc1xuICBmb3IgKHZhciBqIGluIHNjaGVtYS5zdGF0aWNzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudFtqXSA9IHNjaGVtYS5zdGF0aWNzW2pdO1xuICB9XG5cbiAgRW1iZWRkZWREb2N1bWVudC5vcHRpb25zID0gb3B0aW9ucztcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgQXJyYXlUeXBlLmNhbGwodGhpcywga2V5LCBFbWJlZGRlZERvY3VtZW50LCBvcHRpb25zKTtcblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XG4gIHZhciBmbiA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbi5jYWxsKHRoaXMpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSBhcnIgPSBbYXJyXTtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KGFyciwgcGF0aCwgdGhpcyk7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gQXJyYXlUeXBlLlxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEFycmF5VHlwZS5wcm90b3R5cGUgKTtcbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnRBcnJheTtcblxuLyoqXG4gKiBQZXJmb3JtcyBsb2NhbCB2YWxpZGF0aW9ucyBmaXJzdCwgdGhlbiB2YWxpZGF0aW9ucyBvbiBlYWNoIGVtYmVkZGVkIGRvY1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKGFycmF5LCBmbiwgc2NvcGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIFNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUuY2FsbCh0aGlzLCBhcnJheSwgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChlcnIpIHJldHVybiBmbihlcnIpO1xuXG4gICAgdmFyIGNvdW50ID0gYXJyYXkgJiYgYXJyYXkubGVuZ3RoXG4gICAgICAsIGVycm9yO1xuXG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIGZuKCk7XG5cbiAgICAvLyBoYW5kbGUgc3BhcnNlIGFycmF5cywgZG8gbm90IHVzZSBhcnJheS5mb3JFYWNoIHdoaWNoIGRvZXMgbm90XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHNwYXJzZSBlbGVtZW50cyB5ZXQgcmVwb3J0cyBhcnJheS5sZW5ndGggaW5jbHVkaW5nXG4gICAgLy8gdGhlbSA6KFxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvdW50OyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIC8vIHNpZGVzdGVwIHNwYXJzZSBlbnRyaWVzXG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAhKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciAmJiAhZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIHJld3JpdGUgdGhlIGtleVxuICAgICAgICAgICAgZXJyLmtleSA9IHNlbGYua2V5ICsgJy4nICsgaSArICcuJyArIGVyci5rZXk7XG4gICAgICAgICAgICByZXR1cm4gZm4oZXJyb3IgPSBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0IGZsYWdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlLCBkb2MsIGluaXQsIHByZXYpIHtcbiAgdmFyIHNlbGVjdGVkXG4gICAgLCBzdWJkb2NcbiAgICAsIGk7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0LCBwcmV2KTtcbiAgfVxuXG4gIGlmICghKHZhbHVlLmlzU3RvcmFnZURvY3VtZW50QXJyYXkpKSB7XG4gICAgdmFsdWUgPSBuZXcgU3RvcmFnZURvY3VtZW50QXJyYXkodmFsdWUsIHRoaXMucGF0aCwgZG9jKTtcbiAgICBpZiAocHJldiAmJiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByZXYuX2hhbmRsZXJzKSB7XG4gICAgICAgIGRvYy5vZmYoa2V5LCBwcmV2Ll9oYW5kbGVyc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpID0gdmFsdWUubGVuZ3RoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBpZiAoISh2YWx1ZVtpXSBpbnN0YW5jZW9mIFN1YmRvY3VtZW50KSAmJiB2YWx1ZVtpXSkge1xuICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XG4gICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKG51bGwsIHZhbHVlLCB0cnVlLCBzZWxlY3RlZCk7XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jLmluaXQodmFsdWVbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzdWJkb2MgPSBwcmV2LmlkKHZhbHVlW2ldLl9pZCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cblxuICAgICAgICBpZiAocHJldiAmJiBzdWJkb2MpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxuICAgICAgICAgIC8vIGRvYy5hcnJheSA9IFt7IGRvYzogJ3ZhbCcgfV1cbiAgICAgICAgICBzdWJkb2Muc2V0KHZhbHVlW2ldKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZVtpXSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc2V0KCkgaXMgaG9va2VkIGl0IHdpbGwgaGF2ZSBubyByZXR1cm4gdmFsdWVcbiAgICAgICAgLy8gc2VlIGdoLTc0NlxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcblxuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuZXhwb3J0cy5NaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKTtcblxuLy8gYWxpYXNcblxuZXhwb3J0cy5PaWQgPSBleHBvcnRzLk9iamVjdElkO1xuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xuZXhwb3J0cy5Cb29sID0gZXhwb3J0cy5Cb29sZWFuO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xuXG4vKipcbiAqIE1peGVkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE1peGVkIChwYXRoLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdCkge1xuICAgIHZhciBkZWYgPSBvcHRpb25zLmRlZmF1bHQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGVmKSAmJiAwID09PSBkZWYubGVuZ3RoKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgZW1wdHkgYXJyYXkgZGVmYXVsdHMgYXJlIGhhbmRsZWRcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IEFycmF5O1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2hhcmVkICYmXG4gICAgICAgICAgICAgICBfLmlzUGxhaW5PYmplY3QoZGVmKSAmJlxuICAgICAgICAgICAgICAgMCA9PT0gT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHtcbiAgICAgIC8vIHByZXZlbnQgb2RkIFwic2hhcmVkXCIgb2JqZWN0cyBiZXR3ZWVuIGRvY3VtZW50c1xuICAgICAgb3B0aW9ucy5kZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTWl4ZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWl4ZWQ7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4ZWQ7XG4iLCIvKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xuXG4vKipcbiAqIE51bWJlciBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE51bWJlclNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdOdW1iZXInKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlclNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIG51bWJlclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHwgdmFsdWUgaW5zdGFuY2VvZiBOdW1iZXI7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0cyBhIG1pbmltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogOSB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXG4gKiAgICAgICBtLm4gPSAxMDtcbiAqICAgICAgIG0uc2F2ZSgpIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01JTn0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAgICAgdmFyIG1pbiA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoe01JTn0pLiddO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogbWluIH0pXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XG4gKiAgICAgcy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGlzIGJlbmVhdGggdGhlIGxpbWl0ICgxMCkuXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWluaW11bSBudW1iZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5taW4gPSBmdW5jdGlvbiAodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMubWluVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5taW5WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1pbjtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01JTn0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWluVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPj0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWluJ10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgYSBtYXhpbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDExIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUFYfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWF4ID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGV4Y2VlZHMgdGhlIGxpbWl0ICh7TUFYfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiBtYXggfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgZXhjZWVkcyB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtYXhpbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5tYXhWYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5tYXhWYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1heDtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01BWH0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWF4VmFsaWRhdG9yID0gZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2IDw9IHZhbHVlO1xuICAgIH0sIG1zZywgJ21heCddKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBudW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIHZhciB2YWwgPSB2YWx1ZSAmJiB2YWx1ZS5faWRcbiAgICA/IHZhbHVlLl9pZCAvLyBkb2N1bWVudHNcbiAgICA6IHZhbHVlO1xuXG4gIGlmICghaXNOYU4odmFsKSl7XG4gICAgaWYgKG51bGwgPT09IHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAoJycgPT09IHZhbCkgcmV0dXJuIG51bGw7XG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2YWwpIHZhbCA9IE51bWJlcih2YWwpO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBOdW1iZXIpIHJldHVybiB2YWw7XG4gICAgaWYgKCdudW1iZXInID09IHR5cGVvZiB2YWwpIHJldHVybiB2YWw7XG4gICAgaWYgKHZhbC50b1N0cmluZyAmJiAhQXJyYXkuaXNBcnJheSh2YWwpICYmXG4gICAgICAgIHZhbC50b1N0cmluZygpID09IE51bWJlcih2YWwpKSB7XG4gICAgICByZXR1cm4gbmV3IE51bWJlcih2YWwpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ251bWJlcicsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlclNjaGVtYTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgb2lkID0gcmVxdWlyZSgnLi4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIERvY3VtZW50O1xuXG4vKipcbiAqIE9iamVjdElkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBPYmplY3RJZCAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdPYmplY3RJZCcpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk9iamVjdElkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9iamVjdElkO1xuXG4vKipcbiAqIEFkZHMgYW4gYXV0by1nZW5lcmF0ZWQgT2JqZWN0SWQgZGVmYXVsdCBpZiB0dXJuT24gaXMgdHJ1ZS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdHVybk9uIGF1dG8gZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHRzXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5PYmplY3RJZC5wcm90b3R5cGUuYXV0byA9IGZ1bmN0aW9uICggdHVybk9uICkge1xuICBpZiAoIHR1cm5PbiApIHtcbiAgICB0aGlzLmRlZmF1bHQoIGRlZmF1bHRJZCApO1xuICAgIHRoaXMuc2V0KCByZXNldElkIClcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIG9pZDtcbiAgfVxufTtcblxuLyoqXG4gKiBDYXN0cyB0byBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHtcbiAgICAvLyB3YWl0ISB3ZSBtYXkgbmVlZCB0byBjYXN0IHRoaXMgdG8gYSBkb2N1bWVudFxuXG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuLy4uL2RvY3VtZW50JykpO1xuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHZhbHVlLiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIHNldHRpbmcgYSBwb3B1bGF0ZWQgcGF0aFxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZCApIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCAhXy5pc1BsYWluT2JqZWN0KCB2YWx1ZSApICkge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICAvLyDQndGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1LCDRg9C60LDQt9Cw0L3QvdC+0Lkg0LIg0YHRgdGL0LvQutC1XG4gICAgdmFyIHNjaGVtYSA9IHRoaXMub3B0aW9ucy5yZWY7XG4gICAgaWYgKCAhc2NoZW1hICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINGB0YXQtdC80YMsINC/0L4g0LrQvtGC0L7RgNC+0Lkg0Y3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgdC+0LfQtNCw0LLQsNGC0YwnKTtcbiAgICB9XG5cbiAgICBpZiAoICFzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINC90LDQt9Cy0LDQvdC40LUg0YHRhdC10LzRiyDQvdCwINC60L7RgtC+0YDRg9GOINGB0YHRi9C70LDQtdC80YHRjyDQv9GA0Lgg0LXRkSDRgdC+0LfQtNCw0L3QuNC4ICggbmV3IFNjaGVtYShcIm5hbWVcIiwgc2NoZW1hT2JqZWN0KSApJyk7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBkb2NcbiAgICB2YXIgZG9jID0gbmV3IERvY3VtZW50KCB2YWx1ZSwgdW5kZWZpbmVkLCBzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgICBkb2MuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG5cbiAgICByZXR1cm4gZG9jO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2Ygb2lkKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICBpZiAoIHZhbHVlLl9pZCAmJiB2YWx1ZS5faWQgaW5zdGFuY2VvZiBvaWQgKVxuICAgIHJldHVybiB2YWx1ZS5faWQ7XG5cbiAgaWYgKHZhbHVlLnRvU3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBvaWQuY3JlYXRlRnJvbUhleFN0cmluZyh2YWx1ZS50b1N0cmluZygpKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRJZCAoKSB7XG4gIHJldHVybiBuZXcgb2lkKCk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0SWQgKHYpIHtcbiAgdGhpcy4kX18uX2lkID0gbnVsbDtcbiAgcmV0dXJuIHY7XG59XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXM7XG5cbi8qKlxuICogU3RyaW5nIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBTdHJpbmdTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICB0aGlzLmVudW1WYWx1ZXMgPSBbXTtcbiAgdGhpcy5yZWdFeHAgPSBudWxsO1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnU3RyaW5nJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdTY2hlbWE7XG5cbi8qKlxuICogQWRkcyBhbiBlbnVtIHZhbGlkYXRvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgc3RhdGVzID0gJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogc3RhdGVzIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogYGludmFsaWRgIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHN0YXRlYC5cbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgdmFyIGVudSA9IHtcbiAqICAgICAgIHZhbHVlczogJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKSxcbiAqICAgICAgIG1lc3NhZ2U6ICdlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnXG4gKiAgICAgfVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogZW51IH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHN0YXRlYCB3aXRoIHZhbHVlIGBpbnZhbGlkYFxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IFthcmdzLi4uXSBlbnVtZXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5lbnVtID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5lbnVtVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMuZW51bVZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmYWxzZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IGFyZ3VtZW50c1swXSB8fCBmYWxzZSA9PT0gYXJndW1lbnRzWzBdKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsdWVzO1xuICB2YXIgZXJyb3JNZXNzYWdlO1xuXG4gIGlmIChfLmlzUGxhaW5PYmplY3QoYXJndW1lbnRzWzBdKSkge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50c1swXS52YWx1ZXM7XG4gICAgZXJyb3JNZXNzYWdlID0gYXJndW1lbnRzWzBdLm1lc3NhZ2U7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWVzID0gYXJndW1lbnRzO1xuICAgIGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuU3RyaW5nLmVudW07XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh1bmRlZmluZWQgIT09IHZhbHVlc1tpXSkge1xuICAgICAgdGhpcy5lbnVtVmFsdWVzLnB1c2godGhpcy5jYXN0KHZhbHVlc1tpXSkpO1xuICAgIH1cbiAgfVxuXG4gIHZhciB2YWxzID0gdGhpcy5lbnVtVmFsdWVzO1xuICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgIHJldHVybiB1bmRlZmluZWQgPT09IHYgfHwgfnZhbHMuaW5kZXhPZih2KTtcbiAgfTtcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMuZW51bVZhbGlkYXRvciwgZXJyb3JNZXNzYWdlLCAnZW51bSddKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGxvd2VyY2FzZSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgZW1haWw6ICdTb21lRW1haWxAZXhhbXBsZS5DT00nIH0pO1xuICogICAgIGNvbnNvbGUubG9nKG0uZW1haWwpIC8vIHNvbWVlbWFpbEBleGFtcGxlLmNvbVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubG93ZXJjYXNlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIHVwcGVyY2FzZSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGNhcHM6IHsgdHlwZTogU3RyaW5nLCB1cHBlcmNhc2U6IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBjYXBzOiAnYW4gZXhhbXBsZScgfSk7XG4gKiAgICAgY29uc29sZS5sb2cobS5jYXBzKSAvLyBBTiBFWEFNUExFXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS51cHBlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xuICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB0cmltIHNldHRlci5cbiAqXG4gKiBUaGUgc3RyaW5nIHZhbHVlIHdpbGwgYmUgdHJpbW1lZCB3aGVuIHNldC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHRyaW06IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIHN0cmluZyA9ICcgc29tZSBuYW1lICdcbiAqICAgICBjb25zb2xlLmxvZyhzdHJpbmcubGVuZ3RoKSAvLyAxMVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiBzdHJpbmcgfSlcbiAqICAgICBjb25zb2xlLmxvZyhtLm5hbWUubGVuZ3RoKSAvLyA5XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRyaW0oKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFNldHMgYSByZWdleHAgdmFsaWRhdG9yLlxuICpcbiAqIEFueSB2YWx1ZSB0aGF0IGRvZXMgbm90IHBhc3MgYHJlZ0V4cGAudGVzdCh2YWwpIHdpbGwgZmFpbCB2YWxpZGF0aW9uLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8gfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG5hbWU6ICdJIGFtIGludmFsaWQnIH0pXG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogUGF0aCBgbmFtZWAgaXMgaW52YWxpZCAoSSBhbSBpbnZhbGlkKS5cIlxuICogICAgICAgbS5uYW1lID0gJ2FwcGxlcydcbiAqICAgICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgICBhc3NlcnQub2soZXJyKSAvLyBzdWNjZXNzXG4gKiAgICAgICB9KVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIHVzaW5nIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqICAgICB2YXIgbWF0Y2ggPSBbIC9cXC5odG1sJC8sIFwiVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sICh7VkFMVUV9KVwiIF07XG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgZmlsZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiBtYXRjaCB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGZpbGU6ICdpbnZhbGlkJyB9KTtcbiAqICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sIChpbnZhbGlkKVwiXG4gKiAgICAgfSlcbiAqXG4gKiBFbXB0eSBzdHJpbmdzLCBgdW5kZWZpbmVkYCwgYW5kIGBudWxsYCB2YWx1ZXMgYWx3YXlzIHBhc3MgdGhlIG1hdGNoIHZhbGlkYXRvci4gSWYgeW91IHJlcXVpcmUgdGhlc2UgdmFsdWVzLCBlbmFibGUgdGhlIGByZXF1aXJlZGAgdmFsaWRhdG9yIGFsc28uXG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogL15hLywgcmVxdWlyZWQ6IHRydWUgfX0pXG4gKlxuICogQHBhcmFtIHtSZWdFeHB9IHJlZ0V4cCByZWd1bGFyIGV4cHJlc3Npb24gdG8gdGVzdCBhZ2FpbnN0XG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXG4gICAgICA6IHRydWVcbiAgfVxuXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFttYXRjaFZhbGlkYXRvciwgbXNnLCAncmVnZXhwJ10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiBjaGVja1JlcXVpcmVkICh2YWx1ZSwgZG9jKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAodmFsdWUgaW5zdGFuY2VvZiBTdHJpbmcgfHwgdHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSAmJiB2YWx1ZS5sZW5ndGg7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gU3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggdmFsdWUgPT09IG51bGwgKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAvLyBoYW5kbGUgZG9jdW1lbnRzIGJlaW5nIHBhc3NlZFxuICAgIGlmICh2YWx1ZS5faWQgJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlLl9pZCkge1xuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcbiAgICB9XG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVycm9yTWVzc2FnZXMgPSBlcnJvci5tZXNzYWdlcztcbnZhciBDYXN0RXJyb3IgPSBlcnJvci5DYXN0RXJyb3I7XG52YXIgVmFsaWRhdG9yRXJyb3IgPSBlcnJvci5WYWxpZGF0b3JFcnJvcjtcblxuLyoqXG4gKiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7U3RyaW5nfSBbaW5zdGFuY2VdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFNjaGVtYVR5cGUgKHBhdGgsIG9wdGlvbnMsIGluc3RhbmNlKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcbiAgdGhpcy52YWxpZGF0b3JzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLmdldHRlcnMgPSBbXTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIGlmICh0aGlzW2ldICYmICdmdW5jdGlvbicgPT0gdHlwZW9mIHRoaXNbaV0pIHtcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcbiAgICAgID8gb3B0aW9uc1tpXVxuICAgICAgOiBbb3B0aW9uc1tpXV07XG5cbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxuICpcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxuICpcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4ge307XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XG4gKiAgICAgdmFyIG0xID0gbmV3IE07XG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKiAgICAgdmFyIG0yID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyB2YWxcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXG4gKlxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cbiAqXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIE1vbmdvb3NlIHNldHRlci5cbiAqXG4gKiAgICAgZnVuY3Rpb24gdG9Mb3dlciAodikge1xuICogICAgICAgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcbiAqICAgICB9XG4gKlxuICogICAgIHZhciBVc2VyU2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIHNldDogdG9Mb3dlciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFVzZXIgPSBkYi5tb2RlbCgnVXNlcicsIFVzZXJTY2hlbWEpXG4gKlxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXIoe2VtYWlsOiAnQVZFTlVFQFEuQ09NJ30pXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCk7IC8vICdhdmVudWVAcS5jb20nXG4gKlxuICogICAgIC8vIG9yXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlclxuICogICAgIHVzZXIuZW1haWwgPSAnQXZlbnVlQFEuY29tJ1xuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpIC8vICdhdmVudWVAcS5jb20nXG4gKlxuICogQXMgeW91IGNhbiBzZWUgYWJvdmUsIHNldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgZGF0YSBiZWZvcmUgaXQgZ2V0cyB0byB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgYW5kIGlzIHNldCBhcyBhIHZhbHVlIG9uIGFuIGFjdHVhbCBrZXkuXG4gKlxuICogX05PVEU6IHdlIGNvdWxkIGhhdmUgYWxzbyBqdXN0IHVzZWQgdGhlIGJ1aWx0LWluIGBsb3dlcmNhc2U6IHRydWVgIFNjaGVtYVR5cGUgb3B0aW9uIGluc3RlYWQgb2YgZGVmaW5pbmcgb3VyIG93biBmdW5jdGlvbi5fXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqXG4gKiBTZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIHNldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiB2YWw7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgc2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgc2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqICAgICB2YXIgdiA9IG5ldyBWaXJ1cyh7IG5hbWU6ICdQYXJ2b3ZpcmlkYWUnLCB0YXhvbm9teTogJ1BhcnZvdmlyaW5hZScgfSk7XG4gKlxuICogICAgIGNvbnNvbGUubG9nKHYubmFtZSk7ICAgICAvLyBuYW1lIGlzIHJlcXVpcmVkXG4gKiAgICAgY29uc29sZS5sb2codi50YXhvbm9teSk7IC8vIFBhcnZvdmlyaW5hZVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIGZuKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Egc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGdldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGZ1bmN0aW9uIGRvYiAodmFsKSB7XG4gKiAgICAgICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcbiAqICAgICAgIHJldHVybiAodmFsLmdldE1vbnRoKCkgKyAxKSArIFwiL1wiICsgdmFsLmdldERhdGUoKSArIFwiL1wiICsgdmFsLmdldEZ1bGxZZWFyKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgZ2V0OiBkb2IgfSlcbiAqXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IERhdGUgfSlcbiAqICAgICBzLnBhdGgoJ2Jvcm4nKS5nZXQoZG9iKVxuICpcbiAqIEdldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgYXMgaXQgdHJhdmVscyBmcm9tIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCB0byB0aGUgdmFsdWUgdGhhdCB5b3Ugc2VlLlxuICpcbiAqIFN1cHBvc2UgeW91IGFyZSBzdG9yaW5nIGNyZWRpdCBjYXJkIG51bWJlcnMgYW5kIHlvdSB3YW50IHRvIGhpZGUgZXZlcnl0aGluZyBleGNlcHQgdGhlIGxhc3QgNCBkaWdpdHMgdG8gdGhlIG1vbmdvb3NlIHVzZXIuIFlvdSBjYW4gZG8gc28gYnkgZGVmaW5pbmcgYSBnZXR0ZXIgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9iZnVzY2F0ZSAoY2MpIHtcbiAqICAgICAgIHJldHVybiAnKioqKi0qKioqLSoqKiotJyArIGNjLnNsaWNlKGNjLmxlbmd0aC00LCBjYy5sZW5ndGgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIEFjY291bnRTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGNyZWRpdENhcmROdW1iZXI6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IG9iZnVzY2F0ZSB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBBY2NvdW50ID0gZGIubW9kZWwoJ0FjY291bnQnLCBBY2NvdW50U2NoZW1hKTtcbiAqXG4gKiAgICAgQWNjb3VudC5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgZm91bmQpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGZvdW5kLmNyZWRpdENhcmROdW1iZXIpOyAvLyAnKioqKi0qKioqLSoqKiotMTIzNCdcbiAqICAgICB9KTtcbiAqXG4gKiBHZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIGdldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIG5vdCc7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZ2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgZ2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqXG4gKiAgICAgVmlydXMuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIHZpcnVzKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLnRheG9ub215KTsgLy8gdGF4b25vbXkgaXMgbm90XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiBmbilcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGdldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgdmFsaWRhdG9yKHMpIGZvciB0aGlzIGRvY3VtZW50IHBhdGguXG4gKlxuICogVmFsaWRhdG9ycyBhbHdheXMgcmVjZWl2ZSB0aGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgdGhlaXIgZmlyc3QgYXJndW1lbnQgYW5kIG11c3QgcmV0dXJuIGBCb29sZWFuYC4gUmV0dXJuaW5nIGBmYWxzZWAgbWVhbnMgdmFsaWRhdGlvbiBmYWlsZWQuXG4gKlxuICogVGhlIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQgaXMgb3B0aW9uYWwuIElmIG5vdCBwYXNzZWQsIHRoZSBbZGVmYXVsdCBnZW5lcmljIGVycm9yIG1lc3NhZ2UgdGVtcGxhdGVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKSB3aWxsIGJlIHVzZWQuXG4gKlxuICogIyMjI0V4YW1wbGVzOlxuICpcbiAqICAgICAvLyBtYWtlIHN1cmUgZXZlcnkgdmFsdWUgaXMgZXF1YWwgdG8gXCJzb21ldGhpbmdcIlxuICogICAgIGZ1bmN0aW9uIHZhbGlkYXRvciAodmFsKSB7XG4gKiAgICAgICByZXR1cm4gdmFsID09ICdzb21ldGhpbmcnO1xuICogICAgIH1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiB2YWxpZGF0b3IgfX0pO1xuICpcbiAqICAgICAvLyB3aXRoIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIGN1c3RvbSA9IFt2YWxpZGF0b3IsICdVaCBvaCwge1BBVEh9IGRvZXMgbm90IGVxdWFsIFwic29tZXRoaW5nXCIuJ11cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBjdXN0b20gfX0pO1xuICpcbiAqICAgICAvLyBhZGRpbmcgbWFueSB2YWxpZGF0b3JzIGF0IGEgdGltZVxuICpcbiAqICAgICB2YXIgbWFueSA9IFtcbiAqICAgICAgICAgeyB2YWxpZGF0b3I6IHZhbGlkYXRvciwgbXNnOiAndWggb2gnIH1cbiAqICAgICAgICwgeyB2YWxpZGF0b3I6IGFub3RoZXJWYWxpZGF0b3IsIG1zZzogJ2ZhaWxlZCcgfVxuICogICAgIF1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBtYW55IH19KTtcbiAqXG4gKiAgICAgLy8gb3IgdXRpbGl6aW5nIFNjaGVtYVR5cGUgbWV0aG9kcyBkaXJlY3RseTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiAnc3RyaW5nJyB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKHZhbGlkYXRvciwgJ3ZhbGlkYXRpb24gb2YgYHtQQVRIfWAgZmFpbGVkIHdpdGggdmFsdWUgYHtWQUxVRX1gJyk7XG4gKlxuICogIyMjI0Vycm9yIG1lc3NhZ2UgdGVtcGxhdGVzOlxuICpcbiAqIEZyb20gdGhlIGV4YW1wbGVzIGFib3ZlLCB5b3UgbWF5IGhhdmUgbm90aWNlZCB0aGF0IGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzZWljIHRlbXBsYXRpbmcuIFRoZXJlIGFyZSBhIGZldyBvdGhlciB0ZW1wbGF0ZSBrZXl3b3JkcyBiZXNpZGVzIGB7UEFUSH1gIGFuZCBge1ZBTFVFfWAgdG9vLiBUbyBmaW5kIG91dCBtb3JlLCBkZXRhaWxzIGFyZSBhdmFpbGFibGUgW2hlcmVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKVxuICpcbiAqICMjIyNBc3luY2hyb25vdXMgdmFsaWRhdGlvbjpcbiAqXG4gKiBQYXNzaW5nIGEgdmFsaWRhdG9yIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdHdvIGFyZ3VtZW50cyB0ZWxscyBtb25nb29zZSB0aGF0IHRoZSB2YWxpZGF0b3IgaXMgYW4gYXN5bmNocm9ub3VzIHZhbGlkYXRvci4gVGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgdmFsaWRhdG9yIGZ1bmN0aW9uIGlzIHRoZSB2YWx1ZSBiZWluZyB2YWxpZGF0ZWQuIFRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG11c3QgY2FsbGVkIHdoZW4geW91IGZpbmlzaCB2YWxpZGF0aW5nIHRoZSB2YWx1ZSBhbmQgcGFzc2VkIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCB0byBjb21tdW5pY2F0ZSBlaXRoZXIgc3VjY2VzcyBvciBmYWlsdXJlIHJlc3BlY3RpdmVseS5cbiAqXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZShmdW5jdGlvbiAodmFsdWUsIHJlc3BvbmQpIHtcbiAqICAgICAgIGRvU3R1ZmYodmFsdWUsIGZ1bmN0aW9uICgpIHtcbiAqICAgICAgICAgLi4uXG4gKiAgICAgICAgIHJlc3BvbmQoZmFsc2UpOyAvLyB2YWxpZGF0aW9uIGZhaWxlZFxuICogICAgICAgfSlcbiogICAgICB9LCAne1BBVEh9IGZhaWxlZCB2YWxpZGF0aW9uLicpO1xuKlxuICogWW91IG1pZ2h0IHVzZSBhc3luY2hyb25vdXMgdmFsaWRhdG9ycyB0byByZXRyZWl2ZSBvdGhlciBkb2N1bWVudHMgZnJvbSB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGUgYWdhaW5zdCBvciB0byBtZWV0IG90aGVyIEkvTyBib3VuZCB2YWxpZGF0aW9uIG5lZWRzLlxuICpcbiAqIFZhbGlkYXRpb24gb2NjdXJzIGBwcmUoJ3NhdmUnKWAgb3Igd2hlbmV2ZXIgeW91IG1hbnVhbGx5IGV4ZWN1dGUgW2RvY3VtZW50I3ZhbGlkYXRlXSgjZG9jdW1lbnRfRG9jdW1lbnQtdmFsaWRhdGUpLlxuICpcbiAqIElmIHZhbGlkYXRpb24gZmFpbHMgZHVyaW5nIGBwcmUoJ3NhdmUnKWAgYW5kIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQgdG8gcmVjZWl2ZSB0aGUgZXJyb3IsIGFuIGBlcnJvcmAgZXZlbnQgd2lsbCBiZSBlbWl0dGVkIG9uIHlvdXIgTW9kZWxzIGFzc29jaWF0ZWQgZGIgW2Nvbm5lY3Rpb25dKCNjb25uZWN0aW9uX0Nvbm5lY3Rpb24pLCBwYXNzaW5nIHRoZSB2YWxpZGF0aW9uIGVycm9yIG9iamVjdCBhbG9uZy5cbiAqXG4gKiAgICAgdmFyIGNvbm4gPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcbiAqICAgICBjb25uLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiAgICAgdmFyIFByb2R1Y3QgPSBjb25uLm1vZGVsKCdQcm9kdWN0JywgeW91clNjaGVtYSk7XG4gKiAgICAgdmFyIGR2ZCA9IG5ldyBQcm9kdWN0KC4uKTtcbiAqICAgICBkdmQuc2F2ZSgpOyAvLyBlbWl0cyBlcnJvciBvbiB0aGUgYGNvbm5gIGFib3ZlXG4gKlxuICogSWYgeW91IGRlc2lyZSBoYW5kbGluZyB0aGVzZSBlcnJvcnMgYXQgdGhlIE1vZGVsIGxldmVsLCBhdHRhY2ggYW4gYGVycm9yYCBsaXN0ZW5lciB0byB5b3VyIE1vZGVsIGFuZCB0aGUgZXZlbnQgd2lsbCBpbnN0ZWFkIGJlIGVtaXR0ZWQgdGhlcmUuXG4gKlxuICogICAgIC8vIHJlZ2lzdGVyaW5nIGFuIGVycm9yIGxpc3RlbmVyIG9uIHRoZSBNb2RlbCBsZXRzIHVzIGhhbmRsZSBlcnJvcnMgbW9yZSBsb2NhbGx5XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQHBhcmFtIHtSZWdFeHB8RnVuY3Rpb258T2JqZWN0fSBvYmogdmFsaWRhdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKG9iaiwgbWVzc2FnZSwgdHlwZSkge1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqIHx8IG9iaiAmJiAnUmVnRXhwJyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgIGlmICghbWVzc2FnZSkgbWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICAgIGlmICghdHlwZSkgdHlwZSA9ICd1c2VyIGRlZmluZWQnO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFtvYmosIG1lc3NhZ2UsIHR5cGVdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKCEoYXJnICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggYXJnLmNvbnN0cnVjdG9yICkgKSkge1xuICAgICAgdmFyIG1zZyA9ICdJbnZhbGlkIHZhbGlkYXRvci4gUmVjZWl2ZWQgKCcgKyB0eXBlb2YgYXJnICsgJykgJ1xuICAgICAgICArIGFyZ1xuICAgICAgICArICcuIFNlZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9hcGkuaHRtbCNzY2hlbWF0eXBlX1NjaGVtYVR5cGUtdmFsaWRhdGUnO1xuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZShhcmcudmFsaWRhdG9yLCBhcmcubXNnLCBhcmcudHlwZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIHJlcXVpcmVkIHZhbGlkYXRvciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6IHRydWUgfSlcbiAqXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiAne1BBVEh9IGlzIHJlcXVpcmVkIScgfSlcbiAqXG4gKiAgICAgLy8gb3IgdGhyb3VnaCB0aGUgcGF0aCBBUElcbiAqXG4gKiAgICAgU2NoZW1hLnBhdGgoJ25hbWUnKS5yZXF1aXJlZCh0cnVlKTtcbiAqXG4gKiAgICAgLy8gd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnaW5nXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSwgJ2dycnIgOiggJyk7XG4gKlxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgZW5hYmxlL2Rpc2FibGUgdGhlIHZhbGlkYXRvclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5yZXF1aXJlZCA9IGZ1bmN0aW9uIChyZXF1aXJlZCwgbWVzc2FnZSkge1xuICBpZiAoZmFsc2UgPT09IHJlcXVpcmVkKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5yZXF1aXJlZFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuaXNSZXF1aXJlZCA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmlzUmVxdWlyZWQgPSB0cnVlO1xuXG4gIHRoaXMucmVxdWlyZWRWYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgIC8vIGluIGhlcmUsIGB0aGlzYCByZWZlcnMgdG8gdGhlIHZhbGlkYXRpbmcgZG9jdW1lbnQuXG4gICAgLy8gbm8gdmFsaWRhdGlvbiB3aGVuIHRoaXMgcGF0aCB3YXNuJ3Qgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5LlxuICAgIGlmICh0aGlzICE9PSB1bmRlZmluZWQgJiYgLy8g0YHQv9C10YbQuNCw0LvRjNC90LDRjyDQv9GA0L7QstC10YDQutCwINC40Lct0LfQsCBzdHJpY3QgbW9kZSDQuCDQvtGB0L7QsdC10L3QvdC+0YHRgtC4IC5jYWxsKHVuZGVmaW5lZClcbiAgICAgICAgJ2lzU2VsZWN0ZWQnIGluIHRoaXMgJiZcbiAgICAgICAgIXRoaXMuaXNTZWxlY3RlZChzZWxmLnBhdGgpICYmXG4gICAgICAgICF0aGlzLmlzTW9kaWZpZWQoc2VsZi5wYXRoKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gc2VsZi5jaGVja1JlcXVpcmVkKHYsIHRoaXMpO1xuICB9O1xuXG4gIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgcmVxdWlyZWQpIHtcbiAgICBtZXNzYWdlID0gcmVxdWlyZWQ7XG4gICAgcmVxdWlyZWQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLmdlbmVyYWwucmVxdWlyZWQ7XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLnJlcXVpcmVkVmFsaWRhdG9yLCBtc2csICdyZXF1aXJlZCddKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBHZXRzIHRoZSBkZWZhdWx0IHZhbHVlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlIHRoZSBzY29wZSB3aGljaCBjYWxsYmFjayBhcmUgZXhlY3V0ZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmdldERlZmF1bHQgPSBmdW5jdGlvbiAoc2NvcGUsIGluaXQpIHtcbiAgdmFyIHJldCA9ICdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLmRlZmF1bHRWYWx1ZVxuICAgID8gdGhpcy5kZWZhdWx0VmFsdWUuY2FsbChzY29wZSlcbiAgICA6IHRoaXMuZGVmYXVsdFZhbHVlO1xuXG4gIGlmIChudWxsICE9PSByZXQgJiYgdW5kZWZpbmVkICE9PSByZXQpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KHJldCwgc2NvcGUsIGluaXQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBzZXR0ZXJzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XG4gICAgcmV0dXJuIGluaXRcbiAgICAgID8gdmFsdWVcbiAgICAgIDogdGhpcy5jYXN0KHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgdmFyIHYgPSB2YWx1ZVxuICAgICwgc2V0dGVycyA9IHRoaXMuc2V0dGVyc1xuICAgICwgbGVuID0gc2V0dGVycy5sZW5ndGhcbiAgICAsIGNhc3RlciA9IHRoaXMuY2FzdGVyO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHYpICYmIGNhc3RlciAmJiBjYXN0ZXIuc2V0dGVycykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdi5sZW5ndGg7IGkrKykge1xuICAgICAgdltpXSA9IGNhc3Rlci5hcHBseVNldHRlcnModltpXSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWxlbikge1xuICAgIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XG4gICAgcmV0dXJuIHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgd2hpbGUgKGxlbi0tKSB7XG4gICAgdiA9IHNldHRlcnNbbGVuXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XG5cbiAgLy8gZG8gbm90IGNhc3QgdW50aWwgYWxsIHNldHRlcnMgYXJlIGFwcGxpZWQgIzY2NVxuICB2ID0gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG5cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgZ2V0dGVycyB0byBhIHZhbHVlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiggdmFsdWUsIHNjb3BlICl7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSByZXR1cm4gdmFsdWU7XG5cbiAgdmFyIHYgPSB2YWx1ZVxuICAgICwgZ2V0dGVycyA9IHRoaXMuZ2V0dGVyc1xuICAgICwgbGVuID0gZ2V0dGVycy5sZW5ndGg7XG5cbiAgaWYgKCAhbGVuICkge1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgd2hpbGUgKCBsZW4tLSApIHtcbiAgICB2ID0gZ2V0dGVyc1sgbGVuIF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cblxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogUGVyZm9ybXMgYSB2YWxpZGF0aW9uIG9mIGB2YWx1ZWAgdXNpbmcgdGhlIHZhbGlkYXRvcnMgZGVjbGFyZWQgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgdmFyIGVyciA9IGZhbHNlXG4gICAgLCBwYXRoID0gdGhpcy5wYXRoXG4gICAgLCBjb3VudCA9IHRoaXMudmFsaWRhdG9ycy5sZW5ndGg7XG5cbiAgaWYgKCFjb3VudCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlIChvaywgbWVzc2FnZSwgdHlwZSwgdmFsKSB7XG4gICAgaWYgKGVycikgcmV0dXJuO1xuICAgIGlmIChvayA9PT0gdW5kZWZpbmVkIHx8IG9rKSB7XG4gICAgICAtLWNvdW50IHx8IGNhbGxiYWNrKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhlcnIgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgbWVzc2FnZSwgdHlwZSwgdmFsKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy52YWxpZGF0b3JzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdlswXVxuICAgICAgLCBtZXNzYWdlID0gdlsxXVxuICAgICAgLCB0eXBlID0gdlsyXTtcblxuICAgIGlmICh2YWxpZGF0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci50ZXN0KHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbGlkYXRvcikge1xuICAgICAgaWYgKDIgPT09IHZhbGlkYXRvci5sZW5ndGgpIHtcbiAgICAgICAgdmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlLCBmdW5jdGlvbiAob2spIHtcbiAgICAgICAgICB2YWxpZGF0ZShvaywgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHZhbHVlIGlzIGEgdmFsaWQgUmVmZXJlbmNlLlxuICpcbiAqINCd0LAg0LrQu9C40LXQvdGC0LUg0LIg0LrQsNGH0LXRgdGC0LLQtSDRgdGB0YvQu9C60Lgg0LzQvtC20L3QviDRhdGA0LDQvdC40YLRjCDQutCw0LogaWQsINGC0LDQuiDQuCDQv9C+0LvQvdGL0LUg0LTQvtC60YPQvNC10L3RgtGLXG4gKlxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5faXNSZWYgPSBmdW5jdGlvbiggc2VsZiwgdmFsdWUgKXtcbiAgLy8gZmFzdCBwYXRoXG4gIHZhciByZWYgPSBzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlZjtcblxuICBpZiAoIHJlZiApIHtcbiAgICBpZiAoIG51bGwgPT0gdmFsdWUgKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoIF8uaXNPYmplY3QoIHZhbHVlICkgKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hVHlwZTtcblxuU2NoZW1hVHlwZS5DYXN0RXJyb3IgPSBDYXN0RXJyb3I7XG5cblNjaGVtYVR5cGUuVmFsaWRhdG9yRXJyb3IgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIi8qIVxuICogU3RhdGVNYWNoaW5lIHJlcHJlc2VudHMgYSBtaW5pbWFsIGBpbnRlcmZhY2VgIGZvciB0aGVcbiAqIGNvbnN0cnVjdG9ycyBpdCBidWlsZHMgdmlhIFN0YXRlTWFjaGluZS5jdG9yKC4uLikuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVNYWNoaW5lICgpIHtcbiAgdGhpcy5wYXRocyA9IHt9O1xuICB0aGlzLnN0YXRlcyA9IHt9O1xufTtcblxuLyohXG4gKiBTdGF0ZU1hY2hpbmUuY3Rvcignc3RhdGUxJywgJ3N0YXRlMicsIC4uLilcbiAqIEEgZmFjdG9yeSBtZXRob2QgZm9yIHN1YmNsYXNzaW5nIFN0YXRlTWFjaGluZS5cbiAqIFRoZSBhcmd1bWVudHMgYXJlIGEgbGlzdCBvZiBzdGF0ZXMuIEZvciBlYWNoIHN0YXRlLFxuICogdGhlIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGdldHMgc3RhdGUgdHJhbnNpdGlvblxuICogbWV0aG9kcyBuYW1lZCBhZnRlciBlYWNoIHN0YXRlLiBUaGVzZSB0cmFuc2l0aW9uIG1ldGhvZHNcbiAqIHBsYWNlIHRoZWlyIHBhdGggYXJndW1lbnQgaW50byB0aGUgZ2l2ZW4gc3RhdGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHJldHVybiB7RnVuY3Rpb259IHN1YmNsYXNzIGNvbnN0cnVjdG9yXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5jdG9yID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgU3RhdGVNYWNoaW5lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5zdGF0ZU5hbWVzID0gc3RhdGVzO1xuXG4gICAgdmFyIGkgPSBzdGF0ZXMubGVuZ3RoXG4gICAgICAsIHN0YXRlO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICB0aGlzLnN0YXRlc1tzdGF0ZV0gPSB7fTtcbiAgICB9XG4gIH07XG5cbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdGF0ZU1hY2hpbmUucHJvdG90eXBlICk7XG4gIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcblxuICBzdGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAvLyBDaGFuZ2VzIHRoZSBgcGF0aGAncyBzdGF0ZSB0byBgc3RhdGVgLlxuICAgIGN0b3IucHJvdG90eXBlW3N0YXRlXSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShwYXRoLCBzdGF0ZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBpcyB3cmFwcGVkIGJ5IHRoZSBzdGF0ZSBjaGFuZ2UgZnVuY3Rpb25zOlxuICpcbiAqIC0gYHJlcXVpcmUocGF0aClgXG4gKiAtIGBtb2RpZnkocGF0aClgXG4gKiAtIGBpbml0KHBhdGgpYFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2NoYW5nZVN0YXRlID0gZnVuY3Rpb24gX2NoYW5nZVN0YXRlIChwYXRoLCBuZXh0U3RhdGUpIHtcbiAgdmFyIHByZXZCdWNrZXQgPSB0aGlzLnN0YXRlc1t0aGlzLnBhdGhzW3BhdGhdXTtcbiAgaWYgKHByZXZCdWNrZXQpIGRlbGV0ZSBwcmV2QnVja2V0W3BhdGhdO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBuZXh0U3RhdGU7XG4gIHRoaXMuc3RhdGVzW25leHRTdGF0ZV1bcGF0aF0gPSB0cnVlO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIgKHN0YXRlKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZXNbc3RhdGVdKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0ga2V5c1tpXTtcbiAgICBkZWxldGUgdGhpcy5zdGF0ZXNbc3RhdGVdW3BhdGhdO1xuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xuICB9XG59O1xuXG4vKiFcbiAqIENoZWNrcyB0byBzZWUgaWYgYXQgbGVhc3Qgb25lIHBhdGggaXMgaW4gdGhlIHN0YXRlcyBwYXNzZWQgaW4gdmlhIGBhcmd1bWVudHNgXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIHRoYXQgd2Ugd2FudCB0byBjaGVjayBmb3IuXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3aGF0ID0gYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50cyA6IHRoaXMuc3RhdGVOYW1lcztcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkubGVuZ3RoO1xuICB9KTtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxuICogc2luY2UgYm90aCBvZiB0aG9zZSBtZXRob2RzIHNoYXJlIGEgbG90IG9mIHRoZSBzYW1lIGxvZ2ljLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5faXRlciA9IGZ1bmN0aW9uIF9pdGVyIChpdGVyTWV0aG9kKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG51bUFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgICAsIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDAsIG51bUFyZ3MtMSlcbiAgICAgICwgY2FsbGJhY2sgPSBhcmd1bWVudHNbbnVtQXJncy0xXTtcblxuICAgIGlmICghc3RhdGVzLmxlbmd0aCkgc3RhdGVzID0gdGhpcy5zdGF0ZU5hbWVzO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHBhdGhzID0gc3RhdGVzLnJlZHVjZShmdW5jdGlvbiAocGF0aHMsIHN0YXRlKSB7XG4gICAgICByZXR1cm4gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkpO1xuICAgIH0sIFtdKTtcblxuICAgIHJldHVybiBwYXRoc1tpdGVyTWV0aG9kXShmdW5jdGlvbiAocGF0aCwgaSwgcGF0aHMpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhwYXRoLCBpLCBwYXRocyk7XG4gICAgfSk7XG4gIH07XG59O1xuXG4vKiFcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIHBhdGhzIHRoYXQgYmVsb25nIHRvIG9uZSBvZiB0aGUgcGFyYW1ldGVyIHN0YXRlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgZm4pOyAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMVxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcbiAgdGhpcy5mb3JFYWNoID0gdGhpcy5faXRlcignZm9yRWFjaCcpO1xuICByZXR1cm4gdGhpcy5mb3JFYWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAgKCkge1xuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xuICByZXR1cm4gdGhpcy5tYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbiIsIi8vVE9ETzog0L/QvtGH0LjRgdGC0LjRgtGMINC60L7QtFxuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEVtYmVkZGVkRG9jdW1lbnQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBTdG9yYWdlIEFycmF5IGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNOT1RFOlxuICpcbiAqIF9WYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBvdGhlcndpc2UgYFN0b3JhZ2VBcnJheSNwdXNoYCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkLl9cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBpbmhlcml0cyBBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICovXG5mdW5jdGlvbiBTdG9yYWdlQXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xuICBfLm1peGluKCBhcnIsIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuU3RvcmFnZUFycmF5Lm1peGluID0ge1xuICAvKipcbiAgICogUGFyZW50IG93bmVyIGRvY3VtZW50XG4gICAqXG4gICAqIEBwcm9wZXJ0eSBfcGFyZW50XG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX3BhcmVudDogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBDYXN0cyBhIG1lbWJlciBiYXNlZCBvbiB0aGlzIGFycmF5cyBzY2hlbWEuXG4gICAqXG4gICAqIEBwYXJhbSB7YW55fSB2YWx1ZVxuICAgKiBAcmV0dXJuIHZhbHVlIHRoZSBjYXN0ZWQgdmFsdWVcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfY2FzdDogZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgICB2YXIgb3duZXIgPSB0aGlzLl9vd25lcjtcbiAgICB2YXIgcG9wdWxhdGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAvLyBpZiBhIHBvcHVsYXRlZCBhcnJheSwgd2UgbXVzdCBjYXN0IHRvIHRoZSBzYW1lIG1vZGVsXG4gICAgICAvLyBpbnN0YW5jZSBhcyBzcGVjaWZpZWQgaW4gdGhlIG9yaWdpbmFsIHF1ZXJ5LlxuICAgICAgaWYgKCFvd25lcikge1xuICAgICAgICBvd25lciA9IHRoaXMuX293bmVyID0gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICA/IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50KClcbiAgICAgICAgICA6IHRoaXMuX3BhcmVudDtcbiAgICAgIH1cblxuICAgICAgcG9wdWxhdGVkID0gb3duZXIucG9wdWxhdGVkKHRoaXMuX3BhdGgsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChwb3B1bGF0ZWQgJiYgbnVsbCAhPSB2YWx1ZSkge1xuICAgICAgLy8gY2FzdCB0byB0aGUgcG9wdWxhdGVkIE1vZGVscyBzY2hlbWFcbiAgICAgIHZhciBNb2RlbCA9IHBvcHVsYXRlZC5vcHRpb25zLm1vZGVsO1xuXG4gICAgICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gICAgICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gICAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgICAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IG5ldyBNb2RlbCh2YWx1ZSk7XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZW1hLmNhc3Rlci5jYXN0KHZhbHVlLCB0aGlzLl9wYXJlbnQsIHRydWUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCBmYWxzZSlcbiAgfSxcblxuICAvKipcbiAgICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cbiAgICpcbiAgICogSWYgaXQgYnViYmxlcyB1cCBmcm9tIGFuIGVtYmVkZGVkIGRvY3VtZW50IGNoYW5nZSwgdGhlbiBpdCB0YWtlcyB0aGUgZm9sbG93aW5nIGFyZ3VtZW50cyAob3RoZXJ3aXNlLCB0YWtlcyAwIGFyZ3VtZW50cylcbiAgICpcbiAgICogQHBhcmFtIHtFbWJlZGRlZERvY3VtZW50fSBlbWJlZGRlZERvYyB0aGUgZW1iZWRkZWQgZG9jIHRoYXQgaW52b2tlZCB0aGlzIG1ldGhvZCBvbiB0aGUgQXJyYXlcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVtYmVkZGVkUGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkIGluIHRoZSBlbWJlZGRlZERvY1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9tYXJrTW9kaWZpZWQ6IGZ1bmN0aW9uIChlbGVtLCBlbWJlZGRlZFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XG4gICAgICAsIGRpcnR5UGF0aDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIGRpcnR5UGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChudWxsICE9IGVtYmVkZGVkUGF0aCkge1xuICAgICAgICAgIC8vIGFuIGVtYmVkZGVkIGRvYyBidWJibGVkIHVwIHRoZSBjaGFuZ2VcbiAgICAgICAgICBkaXJ0eVBhdGggPSBkaXJ0eVBhdGggKyAnLicgKyB0aGlzLmluZGV4T2YoZWxlbSkgKyAnLicgKyBlbWJlZGRlZFBhdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlyZWN0bHkgc2V0IGFuIGluZGV4XG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgZWxlbTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJlbnQubWFya01vZGlmaWVkKGRpcnR5UGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcHVzaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3B1c2gpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IFthcmdzLi4uXVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVzaDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIHJldCA9IFtdLnB1c2guYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcG9wYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcG9wKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCB3aGljaCB3aWxsIHBhc3MgdGhlIGVudGlyZSB0aGluZyB0byAkc2V0IHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQHNlZSBTdG9yYWdlQXJyYXkjJHBvcCAjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS0lMjRwb3BcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHBvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5wb3AuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5ID0gWzIsM107XG4gICAqICAgICB2YXIgcmVzID0gZG9jLmFycmF5LnNoaWZ0KCk7XG4gICAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzNdXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzaGlmdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5zaGlmdC5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAgICpcbiAgICogIyMjI0V4YW1wbGVzOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoT2JqZWN0SWQpXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCh7IF9pZDogJ3NvbWVJZCcgfSlcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoJ3RhZyAxJywgJ3RhZyAyJylcbiAgICpcbiAgICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAgICpcbiAgICogT3Igd2UgbWF5IHBhc3NpbmcgdGhlIF9pZCBkaXJlY3RseSBhbmQgbGV0IG1vbmdvb3NlIHRha2UgY2FyZSBvZiBpdC5cbiAgICpcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1bGwoNDgxNTE2MjM0Mik7IC8vIHdvcmtzXG4gICAqXG4gICAqIEBwYXJhbSB7YW55fSBbYXJncy4uLl1cbiAgICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgY3VyID0gdGhpcy5fcGFyZW50LmdldCh0aGlzLl9wYXRoKVxuICAgICAgLCBpID0gY3VyLmxlbmd0aFxuICAgICAgLCBtZW07XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBtZW0gPSBjdXJbaV07XG4gICAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xuICAgICAgICBpZiAodmFsdWVzLnNvbWUoZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHYuZXF1YWxzKG1lbSk7IH0gKSkge1xuICAgICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAofmN1ci5pbmRleE9mLmNhbGwodmFsdWVzLCBtZW0pKSB7XG4gICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc3BsaWNlYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvc3BsaWNlKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcgYW5kIGNhc3RpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoKSB7XG4gICAgdmFyIHJldCwgdmFscywgaTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICB2YWxzID0gW107XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhbHNbaV0gPSBpIDwgMlxuICAgICAgICAgID8gYXJndW1lbnRzW2ldXG4gICAgICAgICAgOiB0aGlzLl9jYXN0KGFyZ3VtZW50c1tpXSk7XG4gICAgICB9XG4gICAgICByZXQgPSBbXS5zcGxpY2UuYXBwbHkodGhpcywgdmFscyk7XG5cbiAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjdW5zaGlmdGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3Vuc2hpZnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHVuc2hpZnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKTtcbiAgICBbXS51bnNoaWZ0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc29ydGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NvcnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05PVEU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNvcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10uc29ydC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyB2YWx1ZXMgdG8gdGhlIGFycmF5IGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqICAgICB2YXIgYWRkZWQgPSBkb2MuYXJyYXkuYWRkVG9TZXQoNCw1KTtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0LDVdXG4gICAqICAgICBjb25zb2xlLmxvZyhhZGRlZCkgICAgIC8vIFs1XVxuICAgKlxuICAgKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gICAqIEByZXR1cm4ge0FycmF5fSB0aGUgdmFsdWVzIHRoYXQgd2VyZSBhZGRlZFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgYWRkVG9TZXQ6IGZ1bmN0aW9uIGFkZFRvU2V0ICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCBhZGRlZCA9IFtdXG4gICAgICAsIHR5cGUgPSB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50ID8gJ2RvYycgOlxuICAgICAgICAgICAgICAgdmFsdWVzWzBdIGluc3RhbmNlb2YgRGF0ZSA/ICdkYXRlJyA6XG4gICAgICAgICAgICAgICAnJztcblxuICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgZm91bmQ7XG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZG9jJzpcbiAgICAgICAgICBmb3VuZCA9IHRoaXMuc29tZShmdW5jdGlvbihkb2MpeyByZXR1cm4gZG9jLmVxdWFscyh2KSB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgdmFyIHZhbCA9ICt2O1xuICAgICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGQpeyByZXR1cm4gK2QgPT09IHZhbCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBmb3VuZCA9IH50aGlzLmluZGV4T2Yodik7XG4gICAgICB9XG5cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgW10ucHVzaC5jYWxsKHRoaXMsIHYpO1xuXG4gICAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgICAgICBbXS5wdXNoLmNhbGwoYWRkZWQsIHYpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIGFkZGVkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjYXN0ZWQgYHZhbGAgYXQgaW5kZXggYGlgIGFuZCBtYXJrcyB0aGUgYXJyYXkgbW9kaWZpZWQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgLy8gZ2l2ZW4gZG9jdW1lbnRzIGJhc2VkIG9uIHRoZSBmb2xsb3dpbmdcbiAgICogICAgIHZhciBEb2MgPSBtb25nb29zZS5tb2RlbCgnRG9jJywgbmV3IFNjaGVtYSh7IGFycmF5OiBbTnVtYmVyXSB9KSk7XG4gICAqXG4gICAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IGFycmF5OiBbMiwzLDRdIH0pXG4gICAqXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNF1cbiAgICpcbiAgICogICAgIGRvYy5hcnJheS5zZXQoMSxcIjVcIik7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpOyAvLyBbMiw1LDRdIC8vIHByb3Blcmx5IGNhc3QgdG8gbnVtYmVyXG4gICAqICAgICBkb2Muc2F2ZSgpIC8vIHRoZSBjaGFuZ2UgaXMgc2F2ZWRcbiAgICpcbiAgICogICAgIC8vIFZTIG5vdCB1c2luZyBhcnJheSNzZXRcbiAgICogICAgIGRvYy5hcnJheVsxXSA9IFwiNVwiO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KTsgLy8gWzIsXCI1XCIsNF0gLy8gbm8gY2FzdGluZ1xuICAgKiAgICAgZG9jLnNhdmUoKSAvLyBjaGFuZ2UgaXMgbm90IHNhdmVkXG4gICAqXG4gICAqIEByZXR1cm4ge0FycmF5fSB0aGlzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzZXQ6IGZ1bmN0aW9uIChpLCB2YWwpIHtcbiAgICB0aGlzW2ldID0gdGhpcy5fY2FzdCh2YWwpO1xuICAgIHRoaXMuX21hcmtNb2RpZmllZChpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7QXJyYXl9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b09iamVjdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJldHVybiBkb2MgaW5zdGFuY2VvZiBEb2N1bWVudFxuICAgICAgICAgID8gZG9jLnRvT2JqZWN0KG9wdGlvbnMpXG4gICAgICAgICAgOiBkb2NcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNsaWNlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgaW5kZXggb2YgYG9iamAgb3IgYC0xYCBpZiBub3QgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIGl0ZW0gdG8gbG9vayBmb3JcbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgaW5kZXhPZjogZnVuY3Rpb24gaW5kZXhPZiAob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIE9iamVjdElkKSBvYmogPSBvYmoudG9TdHJpbmcoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgaWYgKG9iaiA9PSB0aGlzW2ldKVxuICAgICAgICByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG59O1xuXG4vKipcbiAqIEFsaWFzIG9mIFtwdWxsXSgjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS1wdWxsKVxuICpcbiAqIEBzZWUgU3RvcmFnZUFycmF5I3B1bGwgI3R5cGVzX2FycmF5X01vbmdvb3NlQXJyYXktcHVsbFxuICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gKiBAYXBpIHB1YmxpY1xuICogQG1lbWJlck9mIFN0b3JhZ2VBcnJheVxuICogQG1ldGhvZCByZW1vdmVcbiAqL1xuU3RvcmFnZUFycmF5Lm1peGluLnJlbW92ZSA9IFN0b3JhZ2VBcnJheS5taXhpbi5wdWxsO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUFycmF5O1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKVxuICAsIE9iamVjdElkU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogRG9jdW1lbnRBcnJheSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gdGhpcyBhcnJheVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtTdG9yYWdlRG9jdW1lbnRBcnJheX1cbiAqIEBpbmhlcml0cyBTdG9yYWdlQXJyYXlcbiAqIEBzZWUgaHR0cDovL2JpdC5seS9mNkNuWlVcbiAqIFRPRE86INC/0L7QtNGH0LjRgdGC0LjRgtGMINC60L7QtFxuICpcbiAqINCS0LXRgdGMINC90YPQttC90YvQuSDQutC+0LQg0YHQutC+0L/QuNGA0L7QstCw0L1cbiAqL1xuZnVuY3Rpb24gU3RvcmFnZURvY3VtZW50QXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcblxuICAvLyBWYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBzaW5jZVxuICAvLyBvdGhlcndpc2UgU3RvcmFnZUFycmF5I3B1c2ggd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZCB0byB0aGUgcGFyZW50LlxuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIF8ubWl4aW4oIGFyciwgU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4gKTtcblxuICBhcnIudmFsaWRhdG9ycyA9IFtdO1xuICBhcnIuX3BhdGggPSBwYXRoO1xuICBhcnIuaXNTdG9yYWdlQXJyYXkgPSB0cnVlO1xuICBhcnIuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSA9IHRydWU7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICAgIGFyci5faGFuZGxlcnMgPSB7XG4gICAgICBpc05ldzogYXJyLm5vdGlmeSgnaXNOZXcnKSxcbiAgICAgIHNhdmU6IGFyci5ub3RpZnkoJ3NhdmUnKVxuICAgIH07XG5cbiAgICAvLyDQn9GA0L7QsdGA0L7RgSDQuNC30LzQtdC90LXQvdC40Y8g0YHQvtGB0YLQvtGP0L3QuNGPINCyINC/0L7QtNC00L7QutGD0LzQtdC90YJcbiAgICBkb2Mub24oJ3NhdmUnLCBhcnIuX2hhbmRsZXJzLnNhdmUpO1xuICAgIGRvYy5vbignaXNOZXcnLCBhcnIuX2hhbmRsZXJzLmlzTmV3KTtcbiAgfVxuXG4gIHJldHVybiBhcnI7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlQXJyYXlcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4gPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlQXJyYXkubWl4aW4gKTtcblxuLyoqXG4gKiBPdmVycmlkZXMgU3RvcmFnZUFycmF5I2Nhc3RcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uX2Nhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKSB7XG4gICAgaWYgKCEodmFsdWUuX19wYXJlbnQgJiYgdmFsdWUuX19wYXJlbnRBcnJheSkpIHtcbiAgICAgIC8vIHZhbHVlIG1heSBoYXZlIGJlZW4gY3JlYXRlZCB1c2luZyBhcnJheS5jcmVhdGUoKVxuICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICB2YWx1ZS5fX3BhcmVudEFycmF5ID0gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy8gaGFuZGxlIGNhc3QoJ3N0cmluZycpIG9yIGNhc3QoT2JqZWN0SWQpIGV0Yy5cbiAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gIGlmICggdmFsdWUgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCAhXy5pc09iamVjdCh2YWx1ZSkgKSB7XG4gICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgfVxuXG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKHZhbHVlLCB0aGlzKTtcbn07XG5cbi8qKlxuICogU2VhcmNoZXMgYXJyYXkgaXRlbXMgZm9yIHRoZSBmaXJzdCBkb2N1bWVudCB3aXRoIGEgbWF0Y2hpbmcgX2lkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZW1iZWRkZWREb2MgPSBtLmFycmF5LmlkKHNvbWVfaWQpO1xuICpcbiAqIEByZXR1cm4ge0VtYmVkZGVkRG9jdW1lbnR8bnVsbH0gdGhlIHN1YmRvY3VtZW50IG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICogQHBhcmFtIHtPYmplY3RJZHxTdHJpbmd8TnVtYmVyfSBpZFxuICogQFRPRE8gY2FzdCB0byB0aGUgX2lkIGJhc2VkIG9uIHNjaGVtYSBmb3IgcHJvcGVyIGNvbXBhcmlzb25cbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmlkID0gZnVuY3Rpb24gKGlkKSB7XG4gIHZhciBjYXN0ZWRcbiAgICAsIHNpZFxuICAgICwgX2lkO1xuXG4gIHRyeSB7XG4gICAgdmFyIGNhc3RlZF8gPSBPYmplY3RJZFNjaGVtYS5wcm90b3R5cGUuY2FzdC5jYWxsKHt9LCBpZCk7XG4gICAgaWYgKGNhc3RlZF8pIGNhc3RlZCA9IFN0cmluZyhjYXN0ZWRfKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNhc3RlZCA9IG51bGw7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgX2lkID0gdGhpc1tpXS5nZXQoJ19pZCcpO1xuXG4gICAgaWYgKF9pZCBpbnN0YW5jZW9mIERvY3VtZW50KSB7XG4gICAgICBzaWQgfHwgKHNpZCA9IFN0cmluZyhpZCkpO1xuICAgICAgaWYgKHNpZCA9PSBfaWQuX2lkKSByZXR1cm4gdGhpc1tpXTtcbiAgICB9IGVsc2UgaWYgKCEoX2lkIGluc3RhbmNlb2YgT2JqZWN0SWQpKSB7XG4gICAgICBzaWQgfHwgKHNpZCA9IFN0cmluZyhpZCkpO1xuICAgICAgaWYgKHNpZCA9PSBfaWQpIHJldHVybiB0aGlzW2ldO1xuICAgIH0gZWxzZSBpZiAoY2FzdGVkID09IF9pZCkge1xuICAgICAgcmV0dXJuIHRoaXNbaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkgb2YgcGxhaW4ganMgb2JqZWN0c1xuICpcbiAqICMjIyNOT1RFOlxuICpcbiAqIF9FYWNoIHN1Yi1kb2N1bWVudCBpcyBjb252ZXJ0ZWQgdG8gYSBwbGFpbiBvYmplY3QgYnkgY2FsbGluZyBpdHMgYCN0b09iamVjdGAgbWV0aG9kLl9cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbmFsIG9wdGlvbnMgdG8gcGFzcyB0byBlYWNoIGRvY3VtZW50cyBgdG9PYmplY3RgIG1ldGhvZCBjYWxsIGR1cmluZyBjb252ZXJzaW9uXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4udG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgIHJldHVybiBkb2MgJiYgZG9jLnRvT2JqZWN0KG9wdGlvbnMpIHx8IG51bGw7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3ViZG9jdW1lbnQgY2FzdGVkIHRvIHRoaXMgc2NoZW1hLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNhbWUgc3ViZG9jdW1lbnQgY29uc3RydWN0b3IgdXNlZCBmb3IgY2FzdGluZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSB2YWx1ZSB0byBjYXN0IHRvIHRoaXMgYXJyYXlzIFN1YkRvY3VtZW50IHNjaGVtYVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5jcmVhdGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKG9iaik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmbiB0aGF0IG5vdGlmaWVzIGFsbCBjaGlsZCBkb2NzIG9mIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5ub3RpZnkgPSBmdW5jdGlvbiBub3RpZnkgKGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIGZ1bmN0aW9uIG5vdGlmeSAodmFsKSB7XG4gICAgdmFyIGkgPSBzZWxmLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBpZiAoIXNlbGZbaV0pIGNvbnRpbnVlO1xuICAgICAgc2VsZltpXS50cmlnZ2VyKGV2ZW50LCB2YWwpO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VEb2N1bWVudEFycmF5O1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogRW1iZWRkZWREb2N1bWVudCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBqcyBvYmplY3QgcmV0dXJuZWQgZnJvbSB0aGUgZGJcbiAqIEBwYXJhbSB7TW9uZ29vc2VEb2N1bWVudEFycmF5fSBwYXJlbnRBcnIgdGhlIHBhcmVudCBhcnJheSBvZiB0aGlzIGRvY3VtZW50XG4gKiBAaW5oZXJpdHMgRG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICggZGF0YSwgcGFyZW50QXJyICkge1xuICBpZiAocGFyZW50QXJyKSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gcGFyZW50QXJyO1xuICAgIHRoaXMuX19wYXJlbnQgPSBwYXJlbnRBcnIuX3BhcmVudDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIERvY3VtZW50LmNhbGwoIHRoaXMsIGRhdGEsIHVuZGVmaW5lZCApO1xuXG4gIC8vINCd0YPQttC90L4g0LTQu9GPINC/0YDQvtCx0YDQvtGB0LAg0LjQt9C80LXQvdC10L3QuNGPINC30L3QsNGH0LXQvdC40Y8g0LjQtyDRgNC+0LTQuNGC0LXQu9GM0YHQutC+0LPQviDQtNC+0LrRg9C80LXQvdGC0LAsINC90LDQv9GA0LjQvNC10YAg0L/RgNC4INGB0L7RhdGA0LDQvdC10L3QuNC4XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5vbignaXNOZXcnLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgc2VsZi5pc05ldyA9IHZhbDtcbiAgfSk7XG59XG5cbi8qIVxuICogSW5oZXJpdCBmcm9tIERvY3VtZW50XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRG9jdW1lbnQucHJvdG90eXBlICk7XG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG5cbi8qKlxuICogTWFya3MgdGhlIGVtYmVkZGVkIGRvYyBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGRvYyA9IGJsb2dwb3N0LmNvbW1lbnRzLmlkKGhleHN0cmluZyk7XG4gKiAgICAgZG9jLm1peGVkLnR5cGUgPSAnY2hhbmdlZCc7XG4gKiAgICAgZG9jLm1hcmtNb2RpZmllZCgnbWl4ZWQudHlwZScpO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHdoaWNoIGNoYW5nZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLm1hcmtNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmICghdGhpcy5fX3BhcmVudEFycmF5KSByZXR1cm47XG5cbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMubW9kaWZ5KHBhdGgpO1xuXG4gIGlmICh0aGlzLmlzTmV3KSB7XG4gICAgLy8gTWFyayB0aGUgV0hPTEUgcGFyZW50IGFycmF5IGFzIG1vZGlmaWVkXG4gICAgLy8gaWYgdGhpcyBpcyBhIG5ldyBkb2N1bWVudCAoaS5lLiwgd2UgYXJlIGluaXRpYWxpemluZ1xuICAgIC8vIGEgZG9jdW1lbnQpLFxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5fbWFya01vZGlmaWVkKCk7XG4gIH0gZWxzZVxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5fbWFya01vZGlmaWVkKHRoaXMsIHBhdGgpO1xufTtcblxuLyoqXG4gKiBVc2VkIGFzIGEgc3R1YiBmb3IgW2hvb2tzLmpzXShodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzKVxuICpcbiAqICMjIyNOT1RFOlxuICpcbiAqIF9UaGlzIGlzIGEgbm8tb3AuIERvZXMgbm90IGFjdHVhbGx5IHNhdmUgdGhlIGRvYyB0byB0aGUgZGIuX1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlc29sdmVkIFByb21pc2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIHByb21pc2UgPSAkLkRlZmVycmVkKCkuZG9uZShmbik7XG4gIHByb21pc2UucmVzb2x2ZSgpO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzdWJkb2N1bWVudCBmcm9tIGl0cyBwYXJlbnQgYXJyYXkuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICghdGhpcy5fX3BhcmVudEFycmF5KSByZXR1cm4gdGhpcztcblxuICB2YXIgX2lkO1xuICBpZiAoIXRoaXMud2lsbFJlbW92ZSkge1xuICAgIF9pZCA9IHRoaXMuX2RvYy5faWQ7XG4gICAgaWYgKCFfaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRm9yIHlvdXIgb3duIGdvb2QsIE1vbmdvb3NlIGRvZXMgbm90IGtub3cgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2hvdyB0byByZW1vdmUgYW4gRW1iZWRkZWREb2N1bWVudCB0aGF0IGhhcyBubyBfaWQnKTtcbiAgICB9XG4gICAgdGhpcy5fX3BhcmVudEFycmF5LnB1bGwoeyBfaWQ6IF9pZCB9KTtcbiAgICB0aGlzLndpbGxSZW1vdmUgPSB0cnVlO1xuICB9XG5cbiAgaWYgKGZuKVxuICAgIGZuKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSAjdXBkYXRlIG1ldGhvZCBvZiBwYXJlbnQgZG9jdW1lbnRzLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdUaGUgI3VwZGF0ZSBtZXRob2QgaXMgbm90IGF2YWlsYWJsZSBvbiBFbWJlZGRlZERvY3VtZW50cycpO1xufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnIgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnIsIHZhbCwgZmlyc3QpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50KSB7XG4gICAgdmFyIG1zZyA9ICdVbmFibGUgdG8gaW52YWxpZGF0ZSBhIHN1YmRvY3VtZW50IHRoYXQgaGFzIG5vdCBiZWVuIGFkZGVkIHRvIGFuIGFycmF5LidcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuXG4gIHZhciBpbmRleCA9IHRoaXMuX19wYXJlbnRBcnJheS5pbmRleE9mKHRoaXMpO1xuICB2YXIgcGFyZW50UGF0aCA9IHRoaXMuX19wYXJlbnRBcnJheS5fcGF0aDtcbiAgdmFyIGZ1bGxQYXRoID0gW3BhcmVudFBhdGgsIGluZGV4LCBwYXRoXS5qb2luKCcuJyk7XG5cbiAgLy8gc25pZmZpbmcgYXJndW1lbnRzOlxuICAvLyBuZWVkIHRvIGNoZWNrIGlmIHVzZXIgcGFzc2VkIGEgdmFsdWUgdG8ga2VlcFxuICAvLyBvdXIgZXJyb3IgbWVzc2FnZSBjbGVhbi5cbiAgaWYgKDIgPCBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fX3BhcmVudC5pbnZhbGlkYXRlKGZ1bGxQYXRoLCBlcnIsIHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudC5pbnZhbGlkYXRlKGZ1bGxQYXRoLCBlcnIpO1xuICB9XG5cbiAgaWYgKGZpcnN0KVxuICAgIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IHRoaXMub3duZXJEb2N1bWVudCgpLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB0b3AgbGV2ZWwgZG9jdW1lbnQgb2YgdGhpcyBzdWItZG9jdW1lbnQuXG4gKlxuICogQHJldHVybiB7RG9jdW1lbnR9XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLm93bmVyRG9jdW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLiRfXy5vd25lckRvY3VtZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQ7XG4gIH1cblxuICB2YXIgcGFyZW50ID0gdGhpcy5fX3BhcmVudDtcbiAgaWYgKCFwYXJlbnQpIHJldHVybiB0aGlzO1xuXG4gIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcbiAgICBwYXJlbnQgPSBwYXJlbnQuX19wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuIElmIG9wdGlvbmFsIGBwYXRoYCBpcyBwYXNzZWQsIGl0IGlzIGFwcGVuZGVkIHRvIHRoZSBmdWxsIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRW1iZWRkZWREb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmICghdGhpcy4kX18uZnVsbFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICBpZiAoIXBhcmVudC5fX3BhcmVudCkgcmV0dXJuIHBhdGg7XG5cbiAgICB2YXIgcGF0aHMgPSBbXTtcbiAgICB3aGlsZSAocGFyZW50Ll9fcGFyZW50KSB7XG4gICAgICBwYXRocy51bnNoaWZ0KHBhcmVudC5fX3BhcmVudEFycmF5Ll9wYXRoKTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgICB9XG5cbiAgICB0aGlzLiRfXy5mdWxsUGF0aCA9IHBhdGhzLmpvaW4oJy4nKTtcblxuICAgIGlmICghdGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xuICAgICAgLy8gb3B0aW1pemF0aW9uXG4gICAgICB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoXG4gICAgPyB0aGlzLiRfXy5mdWxsUGF0aCArICcuJyArIHBhdGhcbiAgICA6IHRoaXMuJF9fLmZ1bGxQYXRoO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudEFycmF5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudEFycmF5O1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4iLCJcbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxuZXhwb3J0cy5FbWJlZGRlZCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcblxuZXhwb3J0cy5Eb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi9kb2N1bWVudGFycmF5Jyk7XG5leHBvcnRzLk9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIEJpbmFyeVBhcnNlciA9IHJlcXVpcmUoJy4uL2JpbmFyeV9wYXJzZXInKS5CaW5hcnlQYXJzZXI7XG5cbi8qKlxuICogTWFjaGluZSBpZC5cbiAqXG4gKiBDcmVhdGUgYSByYW5kb20gMy1ieXRlIHZhbHVlIChpLmUuIHVuaXF1ZSBmb3IgdGhpc1xuICogcHJvY2VzcykuIE90aGVyIGRyaXZlcnMgdXNlIGEgbWQ1IG9mIHRoZSBtYWNoaW5lIGlkIGhlcmUsIGJ1dFxuICogdGhhdCB3b3VsZCBtZWFuIGFuIGFzeWMgY2FsbCB0byBnZXRob3N0bmFtZSwgc28gd2UgZG9uJ3QgYm90aGVyLlxuICogQGlnbm9yZVxuICovXG52YXIgTUFDSElORV9JRCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxudmFyIGNoZWNrRm9ySGV4UmVnRXhwID0gbmV3IFJlZ0V4cChcIl5bMC05YS1mQS1GXXsyNH0kXCIpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBPYmplY3RJZCBpbnN0YW5jZVxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21vbmdvZGIvanMtYnNvbi9ibG9iL21hc3Rlci9saWIvYnNvbi9vYmplY3RpZC5qc1xuICogQGNsYXNzIFJlcHJlc2VudHMgYSBCU09OIE9iamVjdElkIHR5cGUuXG4gKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyKX0gaWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZ2VuZXJhdGlvblRpbWUgVGhlIGdlbmVyYXRpb24gdGltZSBvZiB0aGlzIE9iamVjdElkIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gaW5zdGFuY2Ugb2YgT2JqZWN0SWQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElkKGlkKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG4gIGlmKChpZCBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIGlkO1xuXG4gIHRoaXMuX2Jzb250eXBlID0gJ09iamVjdElkJztcbiAgdmFyIHZhbGlkID0gT2JqZWN0SWQuaXNWYWxpZChpZCk7XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZighdmFsaWQgJiYgaWQgIT0gbnVsbCl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuICB9IGVsc2UgaWYodmFsaWQgJiYgdHlwZW9mIGlkID09ICdzdHJpbmcnICYmIGlkLmxlbmd0aCA9PSAyNCkge1xuICAgIHJldHVybiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgfSBlbHNlIGlmKGlkID09IG51bGwgfHwgdHlwZW9mIGlkID09ICdudW1iZXInKSB7XG4gICAgLy8gY29udmVydCB0byAxMiBieXRlIGJpbmFyeSBzdHJpbmdcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gIH0gZWxzZSBpZihpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gdGhpcy50b0hleFN0cmluZygpO1xufVxuXG4vLyBQcmVjb21wdXRlZCBoZXggdGFibGUgZW5hYmxlcyBzcGVlZHkgaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgaGV4VGFibGUgPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgaGV4VGFibGVbaV0gPSAoaSA8PSAxNSA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuXG4gIHZhciBoZXhTdHJpbmcgPSAnJztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICBoZXhTdHJpbmcgKz0gaGV4VGFibGVbdGhpcy5pZC5jaGFyQ29kZUF0KGkpXTtcbiAgfVxuXG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gIHJldHVybiBoZXhTdHJpbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldF9pbmMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE9iamVjdElkLmluZGV4ID0gKE9iamVjdElkLmluZGV4ICsgMSkgJSAweEZGRkZGRjtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge251bWJlcn0gcmV0dXJucyBuZXh0IGluZGV4IHZhbHVlLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0SW5jID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmdldF9pbmMoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gW3RpbWVdIG9wdGlvbmFsIHBhcmFtZXRlciBhbGxvd2luZyB0byBwYXNzIGluIGEgc2Vjb25kIGJhc2VkIHRpbWVzdGFtcC5cbiAqIEByZXR1cm4ge3N0cmluZ30gcmV0dXJuIHRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKCdudW1iZXInICE9IHR5cGVvZiB0aW1lKSB7XG4gICAgdGltZSA9IHBhcnNlSW50KERhdGUubm93KCkvMTAwMCwxMCk7XG4gIH1cblxuICB2YXIgdGltZTRCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpO1xuICAvKiBmb3IgdGltZS1iYXNlZCBPYmplY3RJZCB0aGUgYnl0ZXMgZm9sbG93aW5nIHRoZSB0aW1lIHdpbGwgYmUgemVyb2VkICovXG4gIHZhciBtYWNoaW5lM0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludChNQUNISU5FX0lELCAyNCwgZmFsc2UpO1xuICB2YXIgcGlkMkJ5dGVzID0gQmluYXJ5UGFyc2VyLmZyb21TaG9ydCh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpO1xuICB2YXIgaW5kZXgzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRoaXMuZ2V0X2luYygpLCAyNCwgZmFsc2UsIHRydWUpO1xuXG4gIHJldHVybiB0aW1lNEJ5dGVzICsgbWFjaGluZTNCeXRlcyArIHBpZDJCeXRlcyArIGluZGV4M0J5dGVzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgaWQgaW50byBhIDI0IGJ5dGUgaGV4IHN0cmluZyBmb3IgcHJpbnRpbmdcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgdG8gaXRzIEpTT04gcmVwcmVzZW50YXRpb24uXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge29iamVjdH0gb3RoZXJJRCBPYmplY3RJZCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChvdGhlcklEKSB7XG4gIGlmKG90aGVySUQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpXG4gICAgPyBvdGhlcklELmlkXG4gICAgOiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKG90aGVySUQpLmlkO1xuXG4gIHJldHVybiB0aGlzLmlkID09PSBpZDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZ2VuZXJhdGlvbiBkYXRlIChhY2N1cmF0ZSB1cCB0byB0aGUgc2Vjb25kKSB0aGF0IHRoaXMgSUQgd2FzIGdlbmVyYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtkYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZXRUaW1lc3RhbXAgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XG4gIHRpbWVzdGFtcC5zZXRUaW1lKE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpICogMTAwMCk7XG4gIHJldHVybiB0aW1lc3RhbXA7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmNyZWF0ZVBrID0gZnVuY3Rpb24gY3JlYXRlUGsgKCkge1xuICByZXR1cm4gbmV3IE9iamVjdElkKCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElkIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICovXG5PYmplY3RJZC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uIGNyZWF0ZUZyb21UaW1lICh0aW1lKSB7XG4gIHZhciBpZCA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGltZSwgMzIsIHRydWUsIHRydWUpICtcbiAgICBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KDAsIDY0LCB0cnVlLCB0cnVlKTtcbiAgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SWQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SWQuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtzdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJZCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SWR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJZFxuICovXG5PYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nID0gZnVuY3Rpb24gY3JlYXRlRnJvbUhleFN0cmluZyAoaGV4U3RyaW5nKSB7XG4gIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgaWYodHlwZW9mIGhleFN0cmluZyA9PT0gJ3VuZGVmaW5lZCcgfHwgaGV4U3RyaW5nICE9IG51bGwgJiYgaGV4U3RyaW5nLmxlbmd0aCAhPSAyNClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnNcIik7XG5cbiAgdmFyIGxlbiA9IGhleFN0cmluZy5sZW5ndGg7XG5cbiAgaWYobGVuID4gMTIqMikge1xuICAgIHRocm93IG5ldyBFcnJvcignSWQgY2Fubm90IGJlIGxvbmdlciB0aGFuIDEyIGJ5dGVzJyk7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gJydcbiAgICAsIHN0cmluZ1xuICAgICwgbnVtYmVyO1xuXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gIH1cblxuICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuT2JqZWN0SWQuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQoaWQpIHtcbiAgaWYoaWQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT0gdHlwZW9mIGlkICYmIChpZC5sZW5ndGggIT0gMTIgJiYgaWQubGVuZ3RoICE9IDI0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDaGVjayBzcGVjaWZpY2FsbHkgZm9yIGhleCBjb3JyZWN0bmVzc1xuICAgIGlmKHR5cGVvZiBpZCA9PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPT0gMjQpIHJldHVybiBjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3RJZC5wcm90b3R5cGUsIFwiZ2VuZXJhdGlvblRpbWVcIiwge1xuICBlbnVtZXJhYmxlOiB0cnVlXG4gICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICB9XG4gICwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgdGhpcy5pZCA9IHZhbHVlICsgdGhpcy5pZC5zdWJzdHIoNCk7XG4gICAgLy8gZGVsZXRlIHRoaXMuX19pZDtcbiAgICB0aGlzLnRvSGV4U3RyaW5nKCk7XG4gIH1cbn0pO1xuXG4vKipcbiAqIEV4cG9zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcbm1vZHVsZS5leHBvcnRzLk9iamVjdElkID0gT2JqZWN0SWQ7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL3R5cGVzL29iamVjdGlkJylcbiAgLCBtcGF0aCA9IHJlcXVpcmUoJy4vbXBhdGgnKVxuICAsIFN0b3JhZ2VBcnJheVxuICAsIERvY3VtZW50O1xuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gcnVsZXMuXG4gKlxuICogVGhlc2UgcnVsZXMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKlxuICovXG5leHBvcnRzLnBsdXJhbGl6YXRpb24gPSBbXG4gIFsvKG0pYW4kL2dpLCAnJDFlbiddLFxuICBbLyhwZSlyc29uJC9naSwgJyQxb3BsZSddLFxuICBbLyhjaGlsZCkkL2dpLCAnJDFyZW4nXSxcbiAgWy9eKG94KSQvZ2ksICckMWVuJ10sXG4gIFsvKGF4fHRlc3QpaXMkL2dpLCAnJDFlcyddLFxuICBbLyhvY3RvcHx2aXIpdXMkL2dpLCAnJDFpJ10sXG4gIFsvKGFsaWFzfHN0YXR1cykkL2dpLCAnJDFlcyddLFxuICBbLyhidSlzJC9naSwgJyQxc2VzJ10sXG4gIFsvKGJ1ZmZhbHx0b21hdHxwb3RhdClvJC9naSwgJyQxb2VzJ10sXG4gIFsvKFt0aV0pdW0kL2dpLCAnJDFhJ10sXG4gIFsvc2lzJC9naSwgJ3NlcyddLFxuICBbLyg/OihbXmZdKWZlfChbbHJdKWYpJC9naSwgJyQxJDJ2ZXMnXSxcbiAgWy8oaGl2ZSkkL2dpLCAnJDFzJ10sXG4gIFsvKFteYWVpb3V5XXxxdSl5JC9naSwgJyQxaWVzJ10sXG4gIFsvKHh8Y2h8c3N8c2gpJC9naSwgJyQxZXMnXSxcbiAgWy8obWF0cnx2ZXJ0fGluZClpeHxleCQvZ2ksICckMWljZXMnXSxcbiAgWy8oW218bF0pb3VzZSQvZ2ksICckMWljZSddLFxuICBbLyhrbnx3fGwpaWZlJC9naSwgJyQxaXZlcyddLFxuICBbLyhxdWl6KSQvZ2ksICckMXplcyddLFxuICBbL3MkL2dpLCAncyddLFxuICBbLyhbXmEtel0pJC8sICckMSddLFxuICBbLyQvZ2ksICdzJ11cbl07XG52YXIgcnVsZXMgPSBleHBvcnRzLnBsdXJhbGl6YXRpb247XG5cbi8qKlxuICogVW5jb3VudGFibGUgd29yZHMuXG4gKlxuICogVGhlc2Ugd29yZHMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnRzLnVuY291bnRhYmxlcyA9IFtcbiAgJ2FkdmljZScsXG4gICdlbmVyZ3knLFxuICAnZXhjcmV0aW9uJyxcbiAgJ2RpZ2VzdGlvbicsXG4gICdjb29wZXJhdGlvbicsXG4gICdoZWFsdGgnLFxuICAnanVzdGljZScsXG4gICdsYWJvdXInLFxuICAnbWFjaGluZXJ5JyxcbiAgJ2VxdWlwbWVudCcsXG4gICdpbmZvcm1hdGlvbicsXG4gICdwb2xsdXRpb24nLFxuICAnc2V3YWdlJyxcbiAgJ3BhcGVyJyxcbiAgJ21vbmV5JyxcbiAgJ3NwZWNpZXMnLFxuICAnc2VyaWVzJyxcbiAgJ3JhaW4nLFxuICAncmljZScsXG4gICdmaXNoJyxcbiAgJ3NoZWVwJyxcbiAgJ21vb3NlJyxcbiAgJ2RlZXInLFxuICAnbmV3cycsXG4gICdleHBlcnRpc2UnLFxuICAnc3RhdHVzJyxcbiAgJ21lZGlhJ1xuXTtcbnZhciB1bmNvdW50YWJsZXMgPSBleHBvcnRzLnVuY291bnRhYmxlcztcblxuLyohXG4gKiBQbHVyYWxpemUgZnVuY3Rpb24uXG4gKlxuICogQGF1dGhvciBUSiBIb2xvd2F5Y2h1ayAoZXh0cmFjdGVkIGZyb20gX2V4dC5qc18pXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIHRvIHBsdXJhbGl6ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wbHVyYWxpemUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBmb3VuZDtcbiAgaWYgKCF+dW5jb3VudGFibGVzLmluZGV4T2Yoc3RyLnRvTG93ZXJDYXNlKCkpKXtcbiAgICBmb3VuZCA9IHJ1bGVzLmZpbHRlcihmdW5jdGlvbihydWxlKXtcbiAgICAgIHJldHVybiBzdHIubWF0Y2gocnVsZVswXSk7XG4gICAgfSk7XG4gICAgaWYgKGZvdW5kWzBdKSByZXR1cm4gc3RyLnJlcGxhY2UoZm91bmRbMF1bMF0sIGZvdW5kWzBdWzFdKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuLyohXG4gKiBEZXRlcm1pbmVzIGlmIGBhYCBhbmQgYGJgIGFyZSBkZWVwIGVxdWFsLlxuICpcbiAqIE1vZGlmaWVkIGZyb20gbm9kZS9saWIvYXNzZXJ0LmpzXG4gKiBNb2RpZmllZCBmcm9tIG1vbmdvb3NlL3V0aWxzLmpzXG4gKlxuICogQHBhcmFtIHthbnl9IGEgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBiYFxuICogQHBhcmFtIHthbnl9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09IHR5cGVvZiBvXG4gICAgICAmJiAnW29iamVjdCBSZWdFeHBdJyA9PSB0b1N0cmluZy5jYWxsKG8pO1xufVxuXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cCAocmVnZXhwKSB7XG4gIGlmICghaXNSZWdFeHAocmVnZXhwKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhIFJlZ0V4cCcpO1xuICB9XG5cbiAgdmFyIGZsYWdzID0gW107XG4gIGlmIChyZWdleHAuZ2xvYmFsKSBmbGFncy5wdXNoKCdnJyk7XG4gIGlmIChyZWdleHAubXVsdGlsaW5lKSBmbGFncy5wdXNoKCdtJyk7XG4gIGlmIChyZWdleHAuaWdub3JlQ2FzZSkgZmxhZ3MucHVzaCgnaScpO1xuICByZXR1cm4gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBmbGFncy5qb2luKCcnKSk7XG59XG5cbi8qIVxuICogT2JqZWN0IGNsb25lIHdpdGggU3RvcmFnZSBuYXRpdmVzIHN1cHBvcnQuXG4gKlxuICogSWYgb3B0aW9ucy5taW5pbWl6ZSBpcyB0cnVlLCBjcmVhdGVzIGEgbWluaW1hbCBkYXRhIG9iamVjdC4gRW1wdHkgb2JqZWN0cyBhbmQgdW5kZWZpbmVkIHZhbHVlcyB3aWxsIG5vdCBiZSBjbG9uZWQuIFRoaXMgbWFrZXMgdGhlIGRhdGEgcGF5bG9hZCBzZW50IHRvIE1vbmdvREIgYXMgc21hbGwgYXMgcG9zc2libGUuXG4gKlxuICogRnVuY3Rpb25zIGFyZSBuZXZlciBjbG9uZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIGNsb25lXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fSB0aGUgY2xvbmVkIG9iamVjdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSAob2JqLCBvcHRpb25zKSB7XG4gIGlmIChvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGwpXG4gICAgcmV0dXJuIG9iajtcblxuICBpZiAoIF8uaXNBcnJheSggb2JqICkgKSB7XG4gICAgcmV0dXJuIGNsb25lQXJyYXkoIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgaWYgKCBpc1N0b3JhZ2VPYmplY3QoIG9iaiApICkge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuanNvbiAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqLnRvSlNPTikge1xuICAgICAgcmV0dXJuIG9iai50b0pTT04oIG9wdGlvbnMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9iai50b09iamVjdCggb3B0aW9ucyApO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqLmNvbnN0cnVjdG9yICkge1xuICAgIHN3aXRjaCAoIGdldEZ1bmN0aW9uTmFtZSggb2JqLmNvbnN0cnVjdG9yICkpIHtcbiAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgIHJldHVybiBjbG9uZU9iamVjdChvYmosIG9wdGlvbnMpO1xuICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgIHJldHVybiBuZXcgb2JqLmNvbnN0cnVjdG9yKCArb2JqICk7XG4gICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICByZXR1cm4gY2xvbmVSZWdFeHAoIG9iaiApO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqIGluc3RhbmNlb2YgT2JqZWN0SWQgKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJZCggb2JqLmlkICk7XG4gIH1cblxuICBpZiAoICFvYmouY29uc3RydWN0b3IgJiYgXy5pc09iamVjdCggb2JqICkgKSB7XG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgcmV0dXJuIGNsb25lT2JqZWN0KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggb2JqLnZhbHVlT2YgKXtcbiAgICByZXR1cm4gb2JqLnZhbHVlT2YoKTtcbiAgfVxufTtcbnZhciBjbG9uZSA9IGV4cG9ydHMuY2xvbmU7XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGNsb25lT2JqZWN0IChvYmosIG9wdGlvbnMpIHtcbiAgdmFyIHJldGFpbktleU9yZGVyID0gb3B0aW9ucyAmJiBvcHRpb25zLnJldGFpbktleU9yZGVyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxuICAgICwgcmV0ID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleXNcbiAgICAsIHZhbFxuICAgICwga1xuICAgICwgaTtcblxuICBpZiAoIHJldGFpbktleU9yZGVyICkge1xuICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgIHZhbCA9IGNsb25lKCBvYmpba10sIG9wdGlvbnMgKTtcblxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcbiAgICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGZhc3RlclxuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcbiAgICBpID0ga2V5cy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrID0ga2V5c1tpXTtcbiAgICAgIHZhbCA9IGNsb25lKG9ialtrXSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xuICAgICAgICBpZiAoIWhhc0tleXMpIGhhc0tleXMgPSB0cnVlO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbmltaXplXG4gICAgPyBoYXNLZXlzICYmIHJldFxuICAgIDogcmV0O1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyohXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdG9ba2V5XSkge1xuICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KGZyb21ba2V5XSkgKSB7XG4gICAgICBtZXJnZSh0b1trZXldLCBmcm9tW2tleV0pO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gc3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDMpO1xufTtcblxuXG4vKiFcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXG4gKlxuICogVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGxpYnMgbGlrZSBEYXRlLmpzIHdoaWNoIGRvIGZvb2xpc2ggdGhpbmdzIHRvIE5hdGl2ZXMuXG4gKlxuICogQHBhcmFtIHthbnl9IHZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmlzU3RvcmFnZU9iamVjdCA9IGZ1bmN0aW9uICggdiApIHtcbiAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpKTtcbiAgLy9TdG9yYWdlQXJyYXkgfHwgKFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvYXJyYXknKSk7XG5cbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBEb2N1bWVudCB8fFxuICAgICAgICggdiAmJiB2LmlzU3RvcmFnZUFycmF5ICk7XG59O1xudmFyIGlzU3RvcmFnZU9iamVjdCA9IGV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0O1xuXG4vKiFcbiAqIFJldHVybiB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICovXG5cbmV4cG9ydHMuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgb2JqLCBtYXApIHtcbiAgcmV0dXJuIG1wYXRoLmdldChwYXRoLCBvYmosICdfZG9jJywgbWFwKTtcbn07XG5cbi8qIVxuICogU2V0cyB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtBbnl0aGluZ30gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9iaiwgbWFwKSB7XG4gIG1wYXRoLnNldChwYXRoLCB2YWwsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxudmFyIHJGdW5jdGlvbk5hbWUgPSAvXmZ1bmN0aW9uXFxzKihbXlxccyhdKykvO1xuXG5mdW5jdGlvbiBnZXRGdW5jdGlvbk5hbWUoIGN0b3IgKXtcbiAgaWYgKGN0b3IubmFtZSkge1xuICAgIHJldHVybiBjdG9yLm5hbWU7XG4gIH1cbiAgcmV0dXJuIChjdG9yLnRvU3RyaW5nKCkudHJpbSgpLm1hdGNoKCByRnVuY3Rpb25OYW1lICkgfHwgW10pWzFdO1xufVxuXG5leHBvcnRzLmdldEZ1bmN0aW9uTmFtZSA9IGdldEZ1bmN0aW9uTmFtZTtcblxuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSAoZnVuY3Rpb24oKSB7XG4gIC8vINCU0LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0YLQtdGB0YLQvtCyICjQvtC60YDRg9C20LXQvdC40LUgbm9kZS5qcylcbiAgaWYgKCB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzLm5leHRUaWNrICkgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2s7XG4gIC8vINCV0YHQu9C4INCyINCx0YDQsNGD0LfQtdGA0LUg0YPQttC1INGA0LXQsNC70LjQt9C+0LLQsNC9INGN0YLQvtGCINC80LXRgtC+0LRcbiAgaWYgKCB3aW5kb3cuc2V0SW1tZWRpYXRlICkgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG5cbiAgdmFyIGhlYWQgPSB7IH0sIHRhaWwgPSBoZWFkOyAvLyDQvtGH0LXRgNC10LTRjCDQstGL0LfQvtCy0L7QsiwgMS3RgdCy0Y/Qt9C90YvQuSDRgdC/0LjRgdC+0LpcblxuICB2YXIgSUQgPSBNYXRoLnJhbmRvbSgpOyAvLyDRg9C90LjQutCw0LvRjNC90YvQuSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgFxuXG4gIGZ1bmN0aW9uIG9ubWVzc2FnZShlKSB7XG4gICAgaWYoZS5kYXRhICE9IElEKSByZXR1cm47IC8vINC90LUg0L3QsNGI0LUg0YHQvtC+0LHRidC10L3QuNC1XG4gICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICB2YXIgZnVuYyA9IGhlYWQuZnVuYztcbiAgICBkZWxldGUgaGVhZC5mdW5jO1xuICAgIGZ1bmMoKTtcbiAgfVxuXG4gIGlmKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7IC8vIElFOSssINC00YDRg9Cz0LjQtSDQsdGA0LDRg9C30LXRgNGLXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbm1lc3NhZ2UsIGZhbHNlKTtcbiAgfSBlbHNlIHsgLy8gSUU4XG4gICAgd2luZG93LmF0dGFjaEV2ZW50KCAnb25tZXNzYWdlJywgb25tZXNzYWdlICk7XG4gIH1cblxuICByZXR1cm4gd2luZG93LnBvc3RNZXNzYWdlID8gZnVuY3Rpb24oZnVuYykge1xuICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7IGZ1bmM6IGZ1bmMgfTtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoSUQsIFwiKlwiKTtcbiAgfSA6XG4gIGZ1bmN0aW9uKGZ1bmMpIHsgLy8gSUU8OFxuICAgIHNldFRpbWVvdXQoZnVuYywgMCk7XG4gIH07XG59KCkpO1xuXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXG4vKipcbiAqIFZpcnR1YWxUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogVGhpcyBpcyB3aGF0IG1vbmdvb3NlIHVzZXMgdG8gZGVmaW5lIHZpcnR1YWwgYXR0cmlidXRlcyB2aWEgYFNjaGVtYS5wcm90b3R5cGUudmlydHVhbGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBmdWxsbmFtZSA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIGZ1bGxuYW1lIGluc3RhbmNlb2YgbW9uZ29vc2UuVmlydHVhbFR5cGUgLy8gdHJ1ZVxuICpcbiAqIEBwYXJtYSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFZpcnR1YWxUeXBlIChvcHRpb25zLCBuYW1lKSB7XG4gIHRoaXMucGF0aCA9IG5hbWU7XG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xuICB0aGlzLnNldHRlcnMgPSBbXTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbn1cblxuLyoqXG4gKiBEZWZpbmVzIGEgZ2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgdmlydHVhbCA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIHZpcnR1YWwuZ2V0KGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiB0aGlzLm5hbWUuZmlyc3QgKyAnICcgKyB0aGlzLm5hbWUubGFzdDtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLmdldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgdmlydHVhbCA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIHZpcnR1YWwuc2V0KGZ1bmN0aW9uICh2KSB7XG4gKiAgICAgICB2YXIgcGFydHMgPSB2LnNwbGl0KCcgJyk7XG4gKiAgICAgICB0aGlzLm5hbWUuZmlyc3QgPSBwYXJ0c1swXTtcbiAqICAgICAgIHRoaXMubmFtZS5sYXN0ID0gcGFydHNbMV07XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGB2YWx1ZWAgdXNpbmcgb3B0aW9uYWwgYHNjb3BlYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHJldHVybiB7YW55fSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4ge2FueX0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBzZXR0ZXJzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIHZhciB2ID0gdmFsdWU7XG4gIGZvciAodmFyIGwgPSB0aGlzLnNldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcbiAgICB2ID0gdGhpcy5zZXR0ZXJzW2xdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG4gIHJldHVybiB2O1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVHlwZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
