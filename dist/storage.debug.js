!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (Buffer){
'use strict';

/**
 * A class representation of the BSON Binary type.
 *
 * Sub types
 *  - **BSON.BSON_BINARY_SUBTYPE_DEFAULT**, default BSON type.
 *  - **BSON.BSON_BINARY_SUBTYPE_FUNCTION**, BSON function type.
 *  - **BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY**, BSON byte array type.
 *  - **BSON.BSON_BINARY_SUBTYPE_UUID**, BSON uuid type.
 *  - **BSON.BSON_BINARY_SUBTYPE_MD5**, BSON md5 type.
 *  - **BSON.BSON_BINARY_SUBTYPE_USER_DEFINED**, BSON user defined type.
 *
 * @constructor Represents the Binary BSON type.
 * @param {Buffer} buffer a buffer object containing the binary data.
 * @param {Number} [subType] the option binary type.
 * @return {Grid}
 */
function Binary(buffer, subType) {
  if(!(this instanceof Binary)) return new Binary(buffer, subType);

  this._bsontype = 'Binary';

  if(buffer instanceof Number) {
    this.sub_type = buffer;
    this.position = 0;
  } else {
    this.sub_type = subType == null ? BSON_BINARY_SUBTYPE_DEFAULT : subType;
    this.position = 0;
  }

  if(buffer != null && !(buffer instanceof Number)) {
    // Only accept Buffer, Uint8Array or Arrays
    if(typeof buffer === 'string') {
      // Different ways of writing the length of the string for the different types
      if(typeof Buffer !== 'undefined') {
        this.buffer = new Buffer(buffer);
      } else if(typeof Uint8Array !== 'undefined' || (Object.prototype.toString.call(buffer) === '[object Array]')) {
        this.buffer = writeStringToArray(buffer);
      } else {
        throw new Error('only String, Buffer, Uint8Array or Array accepted');
      }
    } else {
      this.buffer = buffer;
    }
    this.position = buffer.length;
  } else {
    if(typeof Buffer !== 'undefined') {
      this.buffer =  new Buffer(Binary.BUFFER_SIZE);
    } else if(typeof Uint8Array !== 'undefined'){
      this.buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE));
    } else {
      this.buffer = new Array(Binary.BUFFER_SIZE);
    }
    // Set position to start of buffer
    this.position = 0;
  }
}

/**
 * Updates this binary with byte_value.
 *
 * @param {Character} byte_value a single byte we wish to write.
 * @api public
 */
Binary.prototype.put = function put(byte_value) {
  // If it's a string and a has more than one character throw an error
  if(byte_value['length'] != null && typeof byte_value != 'number' && byte_value.length != 1) throw new Error("only accepts single character String, Uint8Array or Array");
  if(typeof byte_value != 'number' && byte_value < 0 || byte_value > 255) throw new Error("only accepts number in a valid unsigned byte range 0-255");

  // Decode the byte value once
  var decoded_byte = null;
  if(typeof byte_value === 'string') {
    decoded_byte = byte_value.charCodeAt(0);
  } else if(byte_value['length'] != null) {
    decoded_byte = byte_value[0];
  } else {
    decoded_byte = byte_value;
  }

  if(this.buffer.length > this.position) {
    this.buffer[this.position++] = decoded_byte;
  } else {
    if(typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
      // Create additional overflow buffer
      var buffer = new Buffer(Binary.BUFFER_SIZE + this.buffer.length);
      // Combine the two buffers together
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
      this.buffer = buffer;
      this.buffer[this.position++] = decoded_byte;
    } else {
      var buffer = null;
      // Create a new buffer (typed or normal array)
      if(Object.prototype.toString.call(this.buffer) === '[object Uint8Array]') {
        buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE + this.buffer.length));
      } else {
        buffer = new Array(Binary.BUFFER_SIZE + this.buffer.length);
      }

      // We need to copy all the content to the new array
      for(var i = 0; i < this.buffer.length; i++) {
        buffer[i] = this.buffer[i];
      }

      // Reassign the buffer
      this.buffer = buffer;
      // Write the byte
      this.buffer[this.position++] = decoded_byte;
    }
  }
};

/**
 * Writes a buffer or string to the binary.
 *
 * @param {Buffer|String} string a string or buffer to be written to the Binary BSON object.
 * @param {Number} offset specify the binary of where to write the content.
 * @api public
 */
Binary.prototype.write = function write(string, offset) {
  offset = typeof offset === 'number' ? offset : this.position;

  // If the buffer is to small let's extend the buffer
  if(this.buffer.length < offset + string.length) {
    var buffer = null;
    // If we are in node.js
    if(typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
      buffer = new Buffer(this.buffer.length + string.length);
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
    } else if(Object.prototype.toString.call(this.buffer) === '[object Uint8Array]') {
      // Create a new buffer
      buffer = new Uint8Array(new ArrayBuffer(this.buffer.length + string.length))
      // Copy the content
      for(var i = 0; i < this.position; i++) {
        buffer[i] = this.buffer[i];
      }
    }

    // Assign the new buffer
    this.buffer = buffer;
  }

  if(typeof Buffer !== 'undefined' && Buffer.isBuffer(string) && Buffer.isBuffer(this.buffer)) {
    string.copy(this.buffer, offset, 0, string.length);
    this.position = (offset + string.length) > this.position ? (offset + string.length) : this.position;
    // offset = string.length
  } else if(typeof Buffer !== 'undefined' && typeof string === 'string' && Buffer.isBuffer(this.buffer)) {
    this.buffer.write(string, 'binary', offset);
    this.position = (offset + string.length) > this.position ? (offset + string.length) : this.position;
    // offset = string.length;
  } else if(Object.prototype.toString.call(string) === '[object Uint8Array]'
    || Object.prototype.toString.call(string) === '[object Array]' && typeof string !== 'string') {
    for(var i = 0; i < string.length; i++) {
      this.buffer[offset++] = string[i];
    }

    this.position = offset > this.position ? offset : this.position;
  } else if(typeof string === 'string') {
    for(var i = 0; i < string.length; i++) {
      this.buffer[offset++] = string.charCodeAt(i);
    }

    this.position = offset > this.position ? offset : this.position;
  }
};

/**
 * Reads **length** bytes starting at **position**.
 *
 * @param {Number} position read from the given position in the Binary.
 * @param {Number} length the number of bytes to read.
 * @return {Buffer}
 * @api public
 */
Binary.prototype.read = function read(position, length) {
  length = length && length > 0
    ? length
    : this.position;

  // Let's return the data based on the type we have
  if(this.buffer['slice']) {
    return this.buffer.slice(position, position + length);
  } else {
    // Create a buffer to keep the result
    var buffer = typeof Uint8Array != 'undefined' ? new Uint8Array(new ArrayBuffer(length)) : new Array(length);
    for(var i = 0; i < length; i++) {
      buffer[i] = this.buffer[position++];
    }
  }
  // Return the buffer
  return buffer;
};

/**
 * Returns the value of this binary as a string.
 *
 * @return {String}
 * @api public
 */
Binary.prototype.value = function value(asRaw) {
  asRaw = asRaw == null ? false : asRaw;

  // Optimize to serialize for the situation where the data == size of buffer
  if(asRaw && typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer) && this.buffer.length == this.position)
    return this.buffer;

  // If it's a node.js buffer object
  if(typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
    return asRaw ? this.buffer.slice(0, this.position) : this.buffer.toString('binary', 0, this.position);
  } else {
    if(asRaw) {
      // we support the slice command use it
      if(this.buffer['slice'] != null) {
        return this.buffer.slice(0, this.position);
      } else {
        // Create a new buffer to copy content to
        var newBuffer = Object.prototype.toString.call(this.buffer) === '[object Uint8Array]' ? new Uint8Array(new ArrayBuffer(this.position)) : new Array(this.position);
        // Copy content
        for(var i = 0; i < this.position; i++) {
          newBuffer[i] = this.buffer[i];
        }
        // Return the buffer
        return newBuffer;
      }
    } else {
      return convertArraytoUtf8BinaryString(this.buffer, 0, this.position);
    }
  }
};

/**
 * Length.
 *
 * @return {Number} the length of the binary.
 * @api public
 */
Binary.prototype.length = function length() {
  return this.position;
};

/**
 * @ignore
 * @api private
 */
Binary.prototype.toJSON = function() {
  return this.buffer != null ? this.buffer.toString('base64') : '';
};

/**
 * @ignore
 * @api private
 */
Binary.prototype.toString = function(format) {
  return this.buffer != null ? this.buffer.slice(0, this.position).toString(format) : '';
};

// Binary default subtype
var BSON_BINARY_SUBTYPE_DEFAULT = 0;

/**
 * @ignore
 * @api private
 */
var writeStringToArray = function(data) {
  // Create a buffer
  var buffer = typeof Uint8Array !== 'undefined' ? new Uint8Array(new ArrayBuffer(data.length)) : new Array(data.length);
  // Write the content to the buffer
  for(var i = 0; i < data.length; i++) {
    buffer[i] = data.charCodeAt(i);
  }
  // Write the string to the buffer
  return buffer;
};

/**
 * Convert Array ot Uint8Array to Binary String
 *
 * @ignore
 * @api private
 */
var convertArraytoUtf8BinaryString = function(byteArray, startIndex, endIndex) {
  var result = '';
  for(var i = startIndex; i < endIndex; i++) {
    result = result + String.fromCharCode(byteArray[i]);
  }
  return result;
};

Binary.BUFFER_SIZE = 256;

/*!
 * Default BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_DEFAULT = 0;

/*!
 * Function BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_FUNCTION = 1;

/*!
 * Byte Array BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_BYTE_ARRAY = 2;

/*!
 * OLD UUID BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID_OLD = 3;

/*!
 * UUID BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID = 4;

/*!
 * MD5 BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_MD5 = 5;

/*!
 * User BSON type
 *
 * @const SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_USER_DEFINED = 128;

/*!
 * Module exports.
 */
module.exports = Binary;
module.exports.Binary = Binary;
}).call(this,require("buffer").Buffer)

},{"buffer":37}],2:[function(require,module,exports){
'use strict';

/*!
 * Binary Parser.
 * @copyright Jonas Raoni Soares Silva
 * @see http://jsfromhell.com/classes/binary-parser [v1.0]
 *
 * @see https://github.com/mongodb/js-bson/blob/master/lib/bson/binary_parser.js
 */

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
    this.warn('encodeInt::overflow');
    data = 0;
  }

	if (data < 0) {
    data += max;
  }

	for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));

	for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = '\0');

  return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join('');
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

/*!
 * @constructor BinaryParser buffer constructor.
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
		throw new Error('checkBuffer::missing bytes');
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

/*!
 * Module exports.
 */
BinaryParser.Buffer = BinaryParserBuffer;
exports.BinaryParser = BinaryParser;

},{}],3:[function(require,module,exports){
'use strict';

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

  // Отображение поля documents в виде массива (для нокаута)
  this.array = [];
  // todo: перенести в адаптер или сделать по другому (object.observe)
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
      //todo: тут нужна проверка на существование id (может стоит смотреть в схеме опцию id)
      /*!
      if ( !newDoc._id ){
        throw new TypeError('Для помещения в коллекцию необходимо, чтобы у документа был _id');
      }
      */

      id = newDoc._id.toString();
      // Поместить документ в коллекцию
      this.documents[ id ] = newDoc;
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
  },

  /**
   * Обновить ссылку на документ в поле documents
   *
   * @param {Document} doc
   */
  updateIdLink: function( doc ){
    var id = doc._id.toString();
    var oldId = _.findKey( this.documents, { _id: doc._id });

    if ( !oldId ){
      throw new TypeError('Не найден документ для обновления ссылки по этому _id: ' + id );
    }

    delete this.documents[ oldId ];
    this.documents[ id ] = doc;
  }
};

/*!
 * Module exports.
 */
module.exports = Collection;

},{"./document":5,"./schema":16}],4:[function(require,module,exports){
'use strict';

/*
Standalone Deferred
Copyright 2012 Otto Vehviläinen
Released under MIT license
https://github.com/Mumakil/Standalone-Deferred

This is a standalone implementation of the wonderful jQuery.Deferred API.
The documentation here is only for quick reference, for complete api please
see the great work of the original project:

http://api.jquery.com/category/deferred-object/
*/

var Promise, flatten, isObservable,
  __slice = Array.prototype.slice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

if (!Array.prototype.forEach) throw new Error('Deferred requires Array.forEach');

/*
Tells if an object is observable
*/

isObservable = function(obj) {
  return (obj instanceof Deferred) || (obj instanceof Promise);
};

/*
Flatten a two dimensional array into one dimension.
Removes elements that are not functions
*/

flatten = function(args) {
  var flatted;
  if (!args) return [];
  flatted = [];
  args.forEach(function(item) {
    if (item) {
      if (typeof item === 'function') {
        return flatted.push(item);
      } else {
        return args.forEach(function(fn) {
          if (typeof fn === 'function') return flatted.push(fn);
        });
      }
    }
  });
  return flatted;
};

/*
Promise object functions as a proxy for a Deferred, except
it does not let you modify the state of the Deferred
*/

Promise = (function() {

  Promise.prototype._deferred = null;

  function Promise(deferred) {
    this._deferred = deferred;
  }

  Promise.prototype.always = function() {
    var args, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    (_ref = this._deferred).always.apply(_ref, args);
    return this;
  };

  Promise.prototype.done = function() {
    var args, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    (_ref = this._deferred).done.apply(_ref, args);
    return this;
  };

  Promise.prototype.fail = function() {
    var args, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    (_ref = this._deferred).fail.apply(_ref, args);
    return this;
  };

  Promise.prototype.pipe = function(doneFilter, failFilter) {
    return this._deferred.pipe(doneFilter, failFilter);
  };

  Promise.prototype.state = function() {
    return this._deferred.state();
  };

  Promise.prototype.then = function(done, fail) {
    this._deferred.then(done, fail);
    return this;
  };

  return Promise;

})();

/*
  Initializes a new Deferred. You can pass a function as a parameter
  to be executed immediately after init. The function receives
  the new deferred object as a parameter and this is also set to the
  same object.
*/
function Deferred(fn) {
  this.then = __bind(this.then, this);
  this.resolveWith = __bind(this.resolveWith, this);
  this.resolve = __bind(this.resolve, this);
  this.rejectWith = __bind(this.rejectWith, this);
  this.reject = __bind(this.reject, this);
  this.promise = __bind(this.promise, this);
  this.progress = __bind(this.progress, this);
  this.pipe = __bind(this.pipe, this);
  this.notifyWith = __bind(this.notifyWith, this);
  this.notify = __bind(this.notify, this);
  this.fail = __bind(this.fail, this);
  this.done = __bind(this.done, this);
  this.always = __bind(this.always, this);
  if (typeof fn === 'function') fn.call(this, this);

  this._state = 'pending';
}

/*
  Pass in functions or arrays of functions to be executed when the
  Deferred object changes state from pending. If the state is already
  rejected or resolved, the functions are executed immediately. They
  receive the arguments that are passed to reject or resolve and this
  is set to the object defined by rejectWith or resolveWith if those
  variants are used.
*/

Deferred.prototype.always = function() {
  var args, functions, _ref,
    _this = this;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if (args.length === 0) return this;
  functions = flatten(args);
  if (this._state === 'pending') {
    this._alwaysCallbacks || (this._alwaysCallbacks = []);
    (_ref = this._alwaysCallbacks).push.apply(_ref, functions);
  } else {
    functions.forEach(function(fn) {
      return fn.apply(_this._context, _this._withArguments);
    });
  }
  return this;
};

/*
  Pass in functions or arrays of functions to be executed when the
  Deferred object is resolved. If the object has already been resolved,
  the functions are executed immediately. If the object has been rejected,
  nothing happens. The functions receive the arguments that are passed
  to resolve and this is set to the object defined by resolveWith if that
  variant is used.
*/

Deferred.prototype.done = function() {
  var args, functions, _ref,
    _this = this;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if (args.length === 0) return this;
  functions = flatten(args);
  if (this._state === 'resolved') {
    functions.forEach(function(fn) {
      return fn.apply(_this._context, _this._withArguments);
    });
  } else if (this._state === 'pending') {
    this._doneCallbacks || (this._doneCallbacks = []);
    (_ref = this._doneCallbacks).push.apply(_ref, functions);
  }
  return this;
};

/*
  Pass in functions or arrays of functions to be executed when the
  Deferred object is rejected. If the object has already been rejected,
  the functions are executed immediately. If the object has been resolved,
  nothing happens. The functions receive the arguments that are passed
  to reject and this is set to the object defined by rejectWith if that
  variant is used.
*/

Deferred.prototype.fail = function() {
  var args, functions, _ref,
    _this = this;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if (args.length === 0) return this;
  functions = flatten(args);
  if (this._state === 'rejected') {
    functions.forEach(function(fn) {
      return fn.apply(_this._context, _this._withArguments);
    });
  } else if (this._state === 'pending') {
    this._failCallbacks || (this._failCallbacks = []);
    (_ref = this._failCallbacks).push.apply(_ref, functions);
  }
  return this;
};

/*
  Notify progress callbacks. The callbacks get passed the arguments given to notify.
  If the object has resolved or rejected, nothing will happen
*/

Deferred.prototype.notify = function() {
  var args;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  this.notifyWith.apply(this, [window].concat(__slice.call(args)));
  return this;
};

/*
  Notify progress callbacks with additional context. Works the same way as notify(),
  except this is set to context when calling the functions.
*/

Deferred.prototype.notifyWith = function() {
  var args, context, _ref;
  context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (this._state !== 'pending') return this;
  if ((_ref = this._progressCallbacks) != null) {
    _ref.forEach(function(fn) {
      return fn.apply(context, args);
    });
  }
  return this;
};

/*
  Returns a new Promise object that's tied to the current Deferred. The doneFilter
  and failFilter can be used to modify the final values that are passed to the
  callbacks of the new promise. If the parameters passed are falsy, the promise
  object resolves or rejects normally. If the filter functions return a value,
  that one is passed to the respective callbacks. The filters can also return a
  new Promise or Deferred object, of which rejected / resolved will control how the
  callbacks fire.
*/

Deferred.prototype.pipe = function(doneFilter, failFilter) {
  var def;
  def = new Deferred();
  this.done(function() {
    var args, result, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (doneFilter != null) {
      result = doneFilter.apply(this, args);
      if (isObservable(result)) {
        return result.done(function() {
          var doneArgs, _ref;
          doneArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return (_ref = def.resolveWith).call.apply(_ref, [def, this].concat(__slice.call(doneArgs)));
        }).fail(function() {
          var failArgs, _ref;
          failArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return (_ref = def.rejectWith).call.apply(_ref, [def, this].concat(__slice.call(failArgs)));
        });
      } else {
        return def.resolveWith.call(def, this, result);
      }
    } else {
      return (_ref = def.resolveWith).call.apply(_ref, [def, this].concat(__slice.call(args)));
    }
  });
  this.fail(function() {
    var args, result, _ref, _ref2;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (failFilter != null) {
      result = failFilter.apply(this, args);
      if (isObservable(result)) {
        result.done(function() {
          var doneArgs, _ref;
          doneArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return (_ref = def.resolveWith).call.apply(_ref, [def, this].concat(__slice.call(doneArgs)));
        }).fail(function() {
          var failArgs, _ref;
          failArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return (_ref = def.rejectWith).call.apply(_ref, [def, this].concat(__slice.call(failArgs)));
        });
      } else {
        def.rejectWith.call(def, this, result);
      }
      return (_ref = def.rejectWith).call.apply(_ref, [def, this].concat(__slice.call(args)));
    } else {
      return (_ref2 = def.rejectWith).call.apply(_ref2, [def, this].concat(__slice.call(args)));
    }
  });
  return def.promise();
};

/*
  Add progress callbacks to be fired when using notify()
*/

Deferred.prototype.progress = function() {
  var args, functions, _ref;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if (args.length === 0 || this._state !== 'pending') return this;
  functions = flatten(args);
  this._progressCallbacks || (this._progressCallbacks = []);
  (_ref = this._progressCallbacks).push.apply(_ref, functions);
  return this;
};

/*
  Returns the promise object of this Deferred.
*/

Deferred.prototype.promise = function() {
  return this._promise || (this._promise = new Promise(this));
};

/*
  Reject this Deferred. If the object has already been rejected or resolved,
  nothing happens. Parameters passed to reject will be handed to all current
  and future fail and always callbacks.
*/

Deferred.prototype.reject = function() {
  var args;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  this.rejectWith.apply(this, [window].concat(__slice.call(args)));
  return this;
};

/*
  Reject this Deferred with additional context. Works the same way as reject, except
  the first parameter is used as this when calling the fail and always callbacks.
*/

Deferred.prototype.rejectWith = function() {
  var args, context, _ref, _ref2,
    _this = this;
  context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (this._state !== 'pending') return this;
  this._state = 'rejected';
  this._withArguments = args;
  this._context = context;
  if ((_ref = this._failCallbacks) != null) {
    _ref.forEach(function(fn) {
      return fn.apply(_this._context, args);
    });
  }
  if ((_ref2 = this._alwaysCallbacks) != null) {
    _ref2.forEach(function(fn) {
      return fn.apply(_this._context, args);
    });
  }
  return this;
};

/*
  Resolves this Deferred object. If the object has already been rejected or resolved,
  nothing happens. Parameters passed to resolve will be handed to all current and
  future done and always callbacks.
*/

Deferred.prototype.resolve = function() {
  var args;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  this.resolveWith.apply(this, [window].concat(__slice.call(args)));
  return this;
};

/*
  Resolve this Deferred with additional context. Works the same way as resolve, except
  the first parameter is used as this when calling the done and always callbacks.
*/

Deferred.prototype.resolveWith = function() {
  var args, context, _ref, _ref2,
    _this = this;
  context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (this._state !== 'pending') return this;
  this._state = 'resolved';
  this._context = context;
  this._withArguments = args;
  if ((_ref = this._doneCallbacks) != null) {
    _ref.forEach(function(fn) {
      return fn.apply(_this._context, args);
    });
  }
  if ((_ref2 = this._alwaysCallbacks) != null) {
    _ref2.forEach(function(fn) {
      return fn.apply(_this._context, args);
    });
  }
  return this;
};

/*
  Returns the state of this Deferred. Can be 'pending', 'rejected' or 'resolved'.
*/

Deferred.prototype.state = function() {
  return this._state;
};

/*
  Convenience function to specify each done, fail and progress callbacks at the same time.
*/

Deferred.prototype.then = function(doneCallbacks, failCallbacks, progressCallbacks) {
  this.done(doneCallbacks);
  this.fail(failCallbacks);
  this.progress(progressCallbacks);
  return this;
};



/*
Returns a new promise object which will resolve when all of the deferreds or promises
passed to the function resolve. The callbacks receive all the parameters that the
individual resolves yielded as an array. If any of the deferreds or promises are
rejected, the promise will be rejected immediately.
*/

Deferred.when = function() {
  var allDoneArgs, allReady, args, readyCount;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  if (args.length === 0) return new Deferred().resolve().promise();
  if (args.length === 1) return args[0].promise();
  allReady = new Deferred();
  readyCount = 0;
  allDoneArgs = [];
  args.forEach(function(dfr, index) {
    return dfr.done(function() {
      var doneArgs;
      doneArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      readyCount += 1;
      allDoneArgs[index] = doneArgs;
      if (readyCount === args.length) {
        return allReady.resolve.apply(allReady, allDoneArgs);
      }
    }).fail(function() {
      var failArgs;
      failArgs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return allReady.rejectWith.apply(allReady, [this].concat(__slice.call(failArgs)));
    });
  });
  return allReady.promise();
};

module.exports = Deferred;

},{}],5:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var Events = require('./events')
  , StorageError = require('./error')
  , MixedSchema = require('./schema/mixed')
  , ObjectId = require('./types/objectid')
  , Schema = require('./schema')
  , ValidatorError = require('./schematype').ValidatorError
  , Deferred = require('./deferred')
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
  if ( !(this instanceof Document) ) {
    return new Document( data, collectionName, schema, fields, init );
  }

  this.$__ = new InternalCache();
  this.isNew = true;

  // Создать пустой документ с флагом init
  // new TestDocument(true);
  if ( 'boolean' === typeof data ){
    init = data;
    data = null;
  }

  if ( collectionName instanceof Schema ){
    schema = collectionName;
    collectionName = undefined;
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
    if ( schema && !this.schema && schema.options._id ){
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

  if ( collectionName ){
    this.collection = window.storage[ collectionName ];
    this.collectionName = collectionName;
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

  // m-gh-2439
  // define getters for data.prop properties with non-strict schemas
  if ( schema.options.strict === false && data ) {
    var self = this
      , keys = Object.keys( this._doc );

    keys.forEach(function( key ) {
      if (!(key in schema.tree)) {
        define( self, key, null, self );
      }
    });
  }

  // Register methods
  for ( var m in schema.methods ){
    this[ m ] = schema.methods[ m ];
  }
  // Register statics
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
  documentDefineProperty: _.noop,
  documentSetInitialValue: _.noop,
  documentGetValue: _.noop,
  documentSetValue: _.noop
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

    if ( '_id' === p ) {
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
  /*!
  if ( doc._id && opts && opts.populated && opts.populated.length ) {
    var id = String( doc._id );
    for (var i = 0; i < opts.populated.length; ++i) {
      var item = opts.populated[ i ];
      this.populated( item.path, item._docs[id], item );
    }
  }
  */

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
        (!obj[i].constructor || 'Object' === utils.getFunctionName(obj[i].constructor))) {
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
  if (type && 'Object' === utils.getFunctionName(type.constructor)) {
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
            && ( !path[key].constructor || 'Object' === utils.getFunctionName(path[key].constructor) )
            && 'virtual' !== pathtype
            && !( this.$__path( prefix + key ) instanceof MixedSchema )
            && !( this.schema.paths[key] && this.schema.paths[key].options.ref )
          ){

          this.set(path[key], prefix + key, constructing);

        } else if (strict) {
          if ('real' === pathtype || 'virtual' === pathtype) {
            this.set(prefix + key, path[key], constructing);

          } else if ('throw' === strict) {
            throw new Error('Field `' + key + '` is not in schema.');
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
  if ('nested' === pathType && val && _.isPlainObject(val) &&
      (!val.constructor || 'Object' === utils.getFunctionName(val.constructor))) {
    if (!merge) this.setValue(path, null);
    this.set(val, path, constructing);
    return this;
  }

  var schema;
  var parts = path.split('.');
  var subpath;

  if ('adhocOrUndefined' === pathType && strict) {

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
      if ('throw' === strict) {
        throw new Error('Field `' + path + '` is not in schema.');
      }
      return this;
    }

  } else if ('virtual' === pathType) {
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
  /*!
  if (!constructing &&
      null != val &&
      path in this.$__.activePaths.states.default &&
      utils.deepEqual(val, schema.getDefault(this, constructing)) ) {

    //console.log( pathToMark, this.$__.activePaths.states.modify );

    // a path with a default was $unset on the server
    // and the user is setting it to the same value again
    return true;
  }
  */

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
      if ('_id' === cur) continue;
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
      if ('_id' === cur) continue;

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

  if (this.$__.validationError === errorMsg) return;

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
    if (val instanceof DocumentArray){
      val.forEach(function _docReduce(doc) {

        if (!doc || !doc._doc) return;
        if (doc instanceof Embedded) seed.push(doc);

        seed = Object.keys(doc._doc).reduce(docReducer.bind(doc._doc), seed);
      });
    }
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

  var innerPromise = new Deferred();

  if ( this.isNew ) {
    // send entire doc

    var toObjectOptions = {};
    if ( this.schema.options.toObject && this.schema.options.toObject.retainKeyOrder ) {
      toObjectOptions.retainKeyOrder = true;
    }

    toObjectOptions.depopulate = 1;
    var obj = this.toObject( toObjectOptions );

    if ( ( obj || {} ).hasOwnProperty('_id') === false ) {
      // documents must have an _id else mongoose won't know
      // what to update later if more changes are made. the user
      // wouldn't know what _id was generated by mongodb either
      // nor would the ObjectId generated my mongodb necessarily
      // match the schema definition.
      innerPromise.reject(new Error('document must have an _id before saving'));
      return innerPromise;
    }

    // Без ресурса можно просто делать валидацию (подготовить данные к отправке), даже если нет коллекции
    if ( !resource ){
      innerPromise.resolve( obj );
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
      // Без ресурса можно просто делать валидацию (подготовить данные к отправке), даже если нет коллекции
      if ( !resource ){
        innerPromise.resolve( delta );
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
 * Если апи-клиента нет и документ новый, то в колбэке будет plain object со всеми данными для сохранения на сервер.
 * Если апи-клиента нет и документ старое, то в колбэке будет plain object только с изменёнными данными.
 *
 * Если апи-клиент есть и не важно новый документ или старый, в колбэке всегда будет ответ от rest-api-client
 *
 * // todo: доописать это дело
 * Сейчас если есть ресурс (апи клиент), то:
 * если документ новый, то после ответа создастся новый документ на основе ответа, и обовляется!!! (получше объяснить это) ссылка (id) внутри коллекции
 * если документ старый, то после ответа ищется этот документ по id и делается set
 *
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
 *     var schema = new Schema(..);
 *     var Product = storage.createCollection('Product', schema );
 *     var doc = Product.add();
 *
 *     // todo: реализовать это
 *     doc.on('error', handleError);
 *
 * @description As an extra measure of flow control, save will return a Promise (bound to `fn` if passed) so it could be chained, or hook to recive errors
 * @example:
 *     product.save().done(function( product ){
 *        ...
 *     }).fail(function( err ){
 *        assert.ok( err )
 *     })
 *
 * @description retainKeyOrder - keep the key order of the doc save
 * @example:
 *     var Checkin = new Schema({
 *       date: Date,
 *       location: {
 *         lat: Number,
 *         lng: Number
 *       }
 *     }, {
 *       toObject: {
 *         retainKeyOrder: true
 *       }
 *     });
 *     var Checkins = storage.createCollection('Product', schema );
 *     var doc = Checkins.add();
 *
 *     doc.save().done(function( objToSave ){
 *       // in `objToSave` followed the correct order of the keys of doc
 *     });
 *
 * @param {function( object )} [done] optional callback, object - objToSave
 * @return {Deferred} Deferred
 * @api public
 * @see middleware http://mongoosejs.com/docs/middleware.html
 */
Document.prototype.save = function ( done ) {
  var self = this;
  var finalPromise = new Deferred().done( done );

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
  var p0 = new Deferred();
  self.validate(function( err ){
    if ( err ){
      p0.reject( err );
      finalPromise.reject( err );
    } else {
      p0.resolve();
    }
  });

  // Сначала надо сохранить все поддокументы и сделать resolve!!!
  // (тут псевдосохранение смотреть EmbeddedDocument.prototype.save )
  // Call save hooks on subdocs
  var subDocs = self.$__getAllSubdocs();
  var whenCond = subDocs.map(function (d) {return d.save();});

  whenCond.push( p0 );

  // Так мы передаём массив promise условий
  var p1 = Deferred.when.apply( Deferred, whenCond );

  p1.fail(function ( err ) {
    // If the initial insert fails provide a second chance.
    // (If we did this all the time we would break updates)
    if (self.$__.inserting) {
      self.isNew = true;
      self.emit('isNew', true);
    }
    finalPromise.reject( err );
  });

  // Handle save and results
  p1.done(function(){
    self.$__handleSave().done(function(){
      //todo: надо проверять, нужно ли писать проверку на наличие ресурса, если он есть - отдавать self, если нет, отдавать как сейчас написано
      // возможно и скорее всего, api и так отдаёт всё в правильном порядке (doc, meta, jqxhr)
      finalPromise.resolve.apply( finalPromise, arguments );

    }).fail(function(){
      finalPromise.reject.apply( finalPromise, arguments );
    });
  });

  return finalPromise;
};


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
 * retainKeyOrder - keep the key order of the doc save
 *
 *     var Checkin = new Schema({ ... }, {
 *       toObject: {
 *         retainKeyOrder: true
 *       }
 *     });
 *
 *     doc.toObject(); // object with correct order of the keys of doc
 *
 *     // or inline
 *
 *     doc.toObject({ retainKeyOrder: true });
 *
 *     // or if use toJSON();
 *
 *     var Checkin = new Schema({ ... }, {
 *       toJSON: {
 *         retainKeyOrder: true
 *       }
 *     });
 *
 *     doc.toJSON(); // JSON string with correct order of the keys of doc
 *
 *     // or inline
 *
 *     doc.toJSON({ retainKeyOrder: true });
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

  return this.toObject( options );
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

Document.prototype.equals = function( doc ){
  var tid = this.get('_id');
  var docid = doc.get('_id');
  if (!tid && !docid) {
    return deepEqual(this, doc);
  }
  return tid && tid.equals
    ? (docid ? tid.equals(docid) : false)
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
Document.prototype.populated = function( path, val, options ){
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

},{"./deferred":4,"./error":6,"./events":12,"./internal":14,"./schema":16,"./schema/mixed":23,"./schematype":27,"./types/documentarray":31,"./types/embedded":32,"./types/objectid":34,"./utils":35}],6:[function(require,module,exports){
'use strict';

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
//StorageError.OverwriteModelError = require('./error/overwriteModel');
StorageError.MissingSchemaError = require('./error/missingSchema');
//StorageError.DivergentArrayError = require('./error/divergentArray');

},{"./error/cast":7,"./error/messages":8,"./error/missingSchema":9,"./error/validation":10,"./error/validator":11}],7:[function(require,module,exports){
'use strict';

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

},{"../error.js":6}],8:[function(require,module,exports){
'use strict';

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
msg.general.default = 'Validator failed for path `{PATH}` with value `{VALUE}`';
msg.general.required = 'Path `{PATH}` is required.';

msg.Number = {};
msg.Number.min = 'Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).';
msg.Number.max = 'Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).';

msg.String = {};
msg.String.enum = '`{VALUE}` is not a valid enum value for path `{PATH}`.';
msg.String.match = 'Path `{PATH}` is invalid ({VALUE}).';


},{}],9:[function(require,module,exports){
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
},{"../error.js":6}],10:[function(require,module,exports){
'use strict';

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
  StorageError.call(this, 'Validation failed');
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

},{"../error.js":6}],11:[function(require,module,exports){
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

},{"../error.js":6}],12:[function(require,module,exports){
'use strict';

/**
 *
 * Backbone.Events

 * A module that can be mixed in to *any object* in order to provide it with
 * custom events. You may bind with `on` or remove with `off` callback
 * functions to an event; `trigger`-ing an event fires all callbacks in
 * succession.
 *
 * var object = {};
 * _.extend(object, Events.prototype);
 * object.on('expand', function(){ alert('expanded'); });
 * object.trigger('expand');
 */
function Events() {}

Events.prototype = {
  /**
   * Bind an event to a `callback` function. Passing `"all"` will bind
   * the callback to all events fired.
   * @param name
   * @param callback
   * @param context
   * @returns {Events}
   */
  on: function(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events || (this._events = {});
    var events = this._events[name] || (this._events[name] = []);
    events.push({callback: callback, context: context, ctx: context || this});
    return this;
  },

  /**
   * Bind an event to only be triggered a single time. After the first time
   * the callback is invoked, it will be removed.
   *
   * @param name
   * @param callback
   * @param context
   * @returns {Events}
   */
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

  /**
   * Remove one or many callbacks. If `context` is null, removes all
   * callbacks with that function. If `callback` is null, removes all
   * callbacks for the event. If `name` is null, removes all bound
   * callbacks for all events.
   *
   * @param name
   * @param callback
   * @param context
   * @returns {Events}
   */
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

  /**
   * Trigger one or many events, firing all bound callbacks. Callbacks are
   * passed the same arguments as `trigger` is, apart from the event name
   * (unless you're listening on `"all"`, which will cause your callback to
   * receive the true name of the event as the first argument).
   *
   * @param name
   * @returns {Events}
   */
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

  /**
   * Tell this object to stop listening to either specific events ... or
   * to every object it's currently listening to.
   *
   * @param obj
   * @param name
   * @param callback
   * @returns {Events}
   */
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

/**
 * Implement fancy features of the Events API such as multiple event
 * names `"change blur"` and jQuery-style event maps `{change: action}`
 * in terms of the existing API.
 *
 * @param obj
 * @param action
 * @param name
 * @param rest
 * @returns {boolean}
 */
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

/**
 * A difficult-to-believe, but optimized internal dispatch function for
 * triggering events. Tries to keep the usual cases speedy (most internal
 * Backbone events have 3 arguments).
 *
 * @param events
 * @param args
 */
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

},{}],13:[function(require,module,exports){
(function (Buffer){
'use strict';

/*!
 * Storage documents using schema
 * inspired by mongoose 3.8.4 (fixed bugs for 3.8.20)
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

}).call(this,require("buffer").Buffer)

},{"../package.json":42,"./collection":3,"./deferred":4,"./document":5,"./error":6,"./events":12,"./schema":16,"./schematype":27,"./statemachine":28,"./types":33,"./utils":35,"./virtualtype":36,"buffer":37}],14:[function(require,module,exports){
'use strict';

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
  this.activePaths = new ActiveRoster();

  // embedded docs
  this.ownerDocument = undefined;
  this.fullPath = undefined;
}

},{"./statemachine":28}],15:[function(require,module,exports){
'use strict';

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

  if ('function' === typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' === typeof path
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

  if ('function' === typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' === typeof path
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

    if ('$' === part) {
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
},{}],16:[function(require,module,exports){
'use strict';

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
  if ( !(this instanceof Schema) ) {
    return new Schema( name, baseSchema, obj, options );
  }

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

  //todo: зачем оно нужно? проблема: obj становится как у прошлой схемы + текущее, из-за этого source,
  // потому что оно копируется из старой схемы в текущий source, а так как он ссылается на obj,
  // и в js у нас разделение памяти, то obj расширяется полями source из старой схемы.
  // Сохраним описание схемы для поддержки дискриминаторов
  //this.source = obj;

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

  // check if _id's value is a subdocument (m-gh-2276)
  var _idSubDoc = obj && obj._id && _.isObject( obj._id );

  // ensure the documents get an auto _id unless disabled
  var auto_id = !this.paths['_id'] && (!this.options.noId && this.options._id) && !_idSubDoc;

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

  this.$__._id = null == this._id
    ? null
    : String(this._id);

  return this.$__._id;
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
  options = _.assign({
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
      && ( !obj[ key ].constructor || 'Object' === utils.getFunctionName(obj[key].constructor) )
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
 *      on, emit, _events, db, get, set, init, isNew, errors, schema, options, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var schema = new Schema(..);
 *      schema.methods.init = function () {} // potentially breaking
 */
Schema.reserved = Object.create( null );
var reserved = Schema.reserved;
reserved.on =
reserved.get =
reserved.set =
reserved.init =
reserved.isNew =
reserved.errors =
reserved.schema =
reserved.options =
reserved.toObject =
reserved.trigger =    // Events
reserved.off =    // Events
reserved._events = // Events

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
  if (obj === undefined) {
    if (this.paths[path]) return this.paths[path];
    if (this.subpaths[path]) return this.subpaths[path];

    // subpaths?
    return /\.\d+\.?.*$/.test(path)
      ? getPositionalPath(this, path)
      : undefined;
  }

  // some path names conflict with document methods
  if (reserved[path]) {
    throw new Error('`' + path + '` may not be used as a schema pathname');
  }

  // update the tree
  var subpaths = path.split(/\./)
    , last = subpaths.pop()
    , branch = this.tree;

  subpaths.forEach(function(sub, i) {
    if (!branch[sub]) branch[sub] = {};
    if ('object' !== typeof branch[sub]) {
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
  if (constructorName !== 'Object'){
    obj = { type: obj };
  }

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if ('Object' === utils.getFunctionName(type.constructor) || 'mixed' == type) {
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
                    && 'Object' === utils.getFunctionName(cast.constructor)
                    && Object.keys(cast).length) {
      return new Types.DocumentArray(path, new Schema(cast), obj);
    }

    return new Types.Array(path, cast || Types.Mixed, obj);
  }

  var name = 'string' === typeof type
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

  this._requiredpaths = ret;

  return this._requiredpaths;
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
    return 'adhocOrUndefined';
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

  self.subpaths[ path ] = val;

  return self.subpaths[ path ];
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
  if ('string' !== typeof name) {
    for (var i in name) {
      this.methods[i] = name[i];
    }
  } else {
    this.methods[name] = fn;
  }

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
  if ('string' !== typeof name) {
    for (var i in name) {
      this.statics[i] = name[i];
    }
  } else {
    this.statics[name] = fn;
  }

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

  virtuals[name] = parts.reduce(function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1)
      ? new VirtualType(options, name)
      : {});
    return mem[part];
  }, this.tree);

  return virtuals[name];
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
 * Schema inheritance
 * this - baseSchema
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
    throw new Error('You must pass a valid discriminator Schema');
  }

  if ( this.discriminatorMapping && !this.discriminatorMapping.isRoot ) {
    throw new Error('Discriminator "' + name + '" can only be a discriminator of the root model');
  }

  var key = this.options.discriminatorKey;
  if ( schema.path(key) ) {
    throw new Error('Discriminator "' + name + '" cannot have field with name "' + key + '"');
  }

  // merges base schema into new discriminator schema and sets new type field.
  (function mergeSchemas(schema, baseSchema) {
    utils.merge(schema, baseSchema);

    var obj = {};
    obj[key] = { type: String, default: name };
    schema.add(obj);
    schema.discriminatorMapping = { key: key, value: name, isRoot: false };

      // throws error if options are invalid
    (function validateOptions(a, b) {
      a = utils.clone(a);
      b = utils.clone(b);
      delete a.toJSON;
      delete a.toObject;
      delete b.toJSON;
      delete b.toObject;

      if (!utils.deepEqual(a, b)) {
        throw new Error('Discriminator options are not customizable (except toJSON & toObject)');
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
    throw new Error('Discriminator with name "' + name + '" already exists');
  }

  this.discriminators[name] = schema;

  // Register methods and statics
  for ( var m in this.methods ){
    schema.methods[ m ] = this.methods[ m ];
  }
  for ( var s in this.statics ){
    schema.statics[ s ] = this.methods[ s ];
  }

  return this.discriminators[name];
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
Schema.ObjectId = Types.ObjectId;

},{"./events":12,"./schema/index":22,"./utils":35,"./virtualtype":36}],17:[function(require,module,exports){
'use strict';

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
      , Buffer: require('./buffer')
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
    var name = 'string' === typeof cast
      ? cast
      : utils.getFunctionName( cast );

    var Caster = name in Types
      ? Types[name]
      : cast;

    this.casterConstructor = Caster;
    this.caster = new Caster(null, castOptions);

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
    fn = 'function' === typeof defaultArr;
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

},{"../schematype":27,"../types/array":29,"../types/embedded":32,"../utils":35,"./boolean":18,"./buffer":19,"./date":20,"./mixed":23,"./number":24,"./objectid":25,"./string":26}],18:[function(require,module,exports){
'use strict';

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

},{"../schematype":27}],19:[function(require,module,exports){
(function (Buffer){
'use strict';

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , StorageBuffer = require('../types').Buffer
  , Binary = StorageBuffer.Binary
  , Document;

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @inherits SchemaType
 * @api private
 */

function SchemaBuffer (key, options) {
  SchemaType.call(this, key, options, 'Buffer');
}

/*!
 * Inherits from SchemaType.
 */
SchemaBuffer.prototype = Object.create( SchemaType.prototype );
SchemaBuffer.prototype.constructor = SchemaBuffer;

/**
 * Check required
 *
 * @api private
 */

SchemaBuffer.prototype.checkRequired = function (value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return null != value;
  } else {
    return !!(value && value.length);
  }
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaBuffer.prototype.cast = function (value, doc, init) {
  var ret;

  if (SchemaType._isRef(this, value, doc, init)) {
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
    if (Buffer.isBuffer(value)) {
      return value;
    } else if (!_.isObject(value)) {
      throw new CastError('buffer', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  // documents
  if (value && value._id) {
    value = value._id;
  }

  if (Buffer.isBuffer(value)) {
    if (!value || !value.isStorageBuffer) {
      value = new StorageBuffer(value, [this.path, doc]);
    }

    return value;
  } else if (value instanceof Binary) {
    ret = new StorageBuffer(value.value(true), [this.path, doc]);
    ret.subtype(value.sub_type);
    // do not override Binary subtypes. users set this
    // to whatever they want.
    return ret;
  }

  if (null === value) return value;

  var type = typeof value;
  if ('string' === type || 'number' === type || Array.isArray(value)) {
    ret = new StorageBuffer(value, [this.path, doc]);
    return ret;
  }

  throw new CastError('buffer', value, this.path);
};

/*!
 * Module exports.
 */

module.exports = SchemaBuffer;

}).call(this,require("buffer").Buffer)

},{"../schematype":27,"../types":33,"./../document":5,"buffer":37}],20:[function(require,module,exports){
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
  if (value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  var date;

  // support for timestamps
  if (value instanceof Number || 'number' == typeof value
      || String(value) == Number(value)) {

    date = new Date(Number(value));

  // support for date strings
  } else if (value.toString) {
    date = new Date(value.toString());
  }

  if (date.toString() != 'Invalid Date') {
    return date;
  }

  throw new CastError('date', value, this.path );
};

/*!
 * Module exports.
 */

module.exports = DateSchema;

},{"../schematype":27}],21:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , StorageDocumentArray = require('../types/documentarray')
  , Subdocument = require('../types/embedded')
  , Document = require('../document')
  , oid = require('../types/objectid')
  , utils = require('../utils');

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
 * @param {*} value
 * @param {Document} doc that triggers the casting
 * @param {Boolean} init flag
 * @param {DocumentArray} prev
 * @api private
 */
DocumentArray.prototype.cast = function (value, doc, init, prev) {
  var selected
    , subdoc
    , i;

  if (!Array.isArray(value)) {
    return this.cast([value], doc, init, prev);
  }

  // Если два массива примерно (кроме _id) одинаковые - не надо перезаписывать
  if ( prev && approximatelyEqual( value, prev ) ){
    return prev;
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

          restorePopulatedFields( subdoc, this.schema.tree, value[i], prev );
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
 * Приблизительное сравнение двух массивов
 *
 * Это нужно для populated полей - их мы преобразовываем в id.
 *
 * Так же в сравнении не участвует id существующих Embedded документов,
 * Если на сервере _id: false, а на клиенте по умолчанию есть _id.
 *
 * @param value
 * @param prev
 * @returns {*}
 */
function approximatelyEqual ( value, prev ) {
  prev = prev.toObject({depopulate: 1});

  // Не сравнивать по subdoc _id
  var i = value.length;
  if ( i === prev.length ){
    _.forEach( value, function( subdoc, i ){
      if ( !subdoc._id ){
        delete prev[ i ]._id;
      }
    });
  }

  return utils.deepEqual( value, prev );
}

/*!
 * Restore population
 *
 * @param {*} subdoc
 * @param {Object} schemaTree
 * @param {*} value
 * @param {DocumentArray} prev
 */
function restorePopulatedFields ( subdoc, schemaTree, value, prev ) {
  var props;
  _.forEach( schemaTree, function( prop, key ){
    var curVal;

    if ( prop.ref ){
      props = {};
      curVal = value[ key ];

      if ( curVal && oid.isValid( curVal ) ){

        _.forEach( prev, function( prevDoc ){
          var prevDocProp = prevDoc[ key ];

          if ( prevDocProp instanceof Document ){
            if ( prevDocProp._id.equals( curVal ) ){
              subdoc[ key ] = prevDocProp;
            }
          }
        });
      }
    }
  });
}

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

},{"../document":5,"../schematype":27,"../types/documentarray":31,"../types/embedded":32,"../types/objectid":34,"../utils":35,"./array":17}],22:[function(require,module,exports){
'use strict';

/*!
 * Module exports.
 */

exports.String = require('./string');

exports.Number = require('./number');

exports.Boolean = require('./boolean');

exports.DocumentArray = require('./documentarray');

exports.Array = require('./array');

exports.Buffer = require('./buffer');

exports.Date = require('./date');

exports.ObjectId = require('./objectid');

exports.Mixed = require('./mixed');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;

},{"./array":17,"./boolean":18,"./buffer":19,"./date":20,"./documentarray":21,"./mixed":23,"./number":24,"./objectid":25,"./string":26}],23:[function(require,module,exports){
'use strict';

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
        return {};
      };
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

},{"../schematype":27}],24:[function(require,module,exports){
'use strict';

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
    return typeof value === 'number' || value instanceof Number;
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
      return v[0] !== this.minValidator;
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
      return v[0] !== this.maxValidator;
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
    if ('string' === typeof val) val = Number(val);
    if (val instanceof Number) return val;
    if ('number' === typeof val) return val;
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

},{"../error":6,"../schematype":27}],25:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , oid = require('../types/objectid')
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
    this.set( resetId );
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
 * @param {ObjectId|String} value
 * @param {Document} doc
 * @param {Boolean} init
 * @param {ObjectId|Document} priorVal
 * @api private
 */
ObjectId.prototype.cast = function ( value, doc, init, priorVal ) {
  // lazy load
  Document || (Document = require('./../document'));

  if ( SchemaType._isRef( this, value ) ) {
    // wait! we may need to cast this to a document

    if (null == value) {
      return value;
    }

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
    doc = new Document( value, undefined, storage.schemas[ schema ], undefined, true );
    doc.$__.wasPopulated = true;

    return doc;
  }

  if (value === null) return value;

  // Предотвратить depopulate
  if ( priorVal instanceof Document ){
    if ( priorVal._id && priorVal._id.equals( value ) ){
      return priorVal;
    }
  }

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

},{"../schematype":27,"../types/objectid":34,"./../document":5}],26:[function(require,module,exports){
'use strict';

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
      return v[0] !== this.enumValidator;
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
    if ('string' !== typeof v) v = self.cast(v);
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
    if ('string' !== typeof v) v = self.cast(v);
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
    if ('string' !== typeof v) v = self.cast(v);
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
      : true;
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
    return (value instanceof String || typeof value === 'string') && value.length;
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
    if (value._id && 'string' === typeof value._id) {
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

},{"../error":6,"../schematype":27}],27:[function(require,module,exports){
'use strict';

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

  for (var i in options) if (this[i] && 'function' === typeof this[i]) {
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
  if ('function' !== typeof fn)
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
  if ('function' !== typeof fn)
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
  if ('function' === typeof obj || obj && 'RegExp' === utils.getFunctionName( obj.constructor )) {
    if (!message) message = errorMessages.general.default;
    if (!type) type = 'user defined';
    this.validators.push([obj, message, type]);
    return this;
  }

  var i = arguments.length
    , arg;

  while (i--) {
    arg = arguments[i];
    if (!(arg && 'Object' === utils.getFunctionName( arg.constructor ) )) {
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

  if ('string' === typeof required) {
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
 * @param {*} value
 * @param {Object} scope
 * @param {Boolean} init
 * @param {*} priorVal
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

},{"./error":6,"./utils":35}],28:[function(require,module,exports){
'use strict';

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
    };
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

},{}],29:[function(require,module,exports){
'use strict';

//TODO: почистить код

/*!
 * Module dependencies.
 */

var EmbeddedDocument = require('./embedded');
var Document = require('../document');
var ObjectId = require('./objectid');

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

      // gh-2399
      // we should cast model only when it's not a discriminator
      var isDisc = value.schema && value.schema.discriminatorMapping &&
        value.schema.discriminatorMapping.key !== undefined;
      if (!isDisc) {
        value = new Model(value);
      }
      return this._schema.caster.cast(value, this._parent, true);
    }

    return this._schema.caster.cast(value, this._parent, false);
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
          found = this.some(function(doc){ return doc.equals(v); });
          break;
        case 'date':
          var val = +v;
          found = this.some(function(d){ return +d === val; });
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
          : doc;
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

},{"../document":5,"./embedded":32,"./objectid":34}],30:[function(require,module,exports){
(function (Buffer){
'use strict';

/*!
 * Module dependencies.
 */

var Binary = require('../binary');
var utils = require('../utils');

/**
 * Storage Buffer constructor.
 *
 * Values always have to be passed to the constructor to initialize.
 *
 * @param {Buffer} value
 * @param {String} encode
 * @param {Number} offset
 * @api private
 * @inherits Buffer
 */

function StorageBuffer (value, encode, offset) {
  var length = arguments.length;
  var val;

  if (0 === length || null === arguments[0] || undefined === arguments[0]) {
    val = 0;
  } else {
    val = value;
  }

  var encoding;
  var path;
  var doc;

  if (Array.isArray(encode)) {
    // internal casting
    path = encode[0];
    doc = encode[1];
  } else {
    encoding = encode;
  }

  var buf = new Buffer(val, encoding, offset);
  _.mixin( buf, StorageBuffer.mixin );
  buf.isStorageBuffer = true;

  // make sure these internal props don't show up in Object.keys()
  Object.defineProperties(buf, {
      validators: { value: [] }
    , _path: { value: path }
    , _parent: { value: doc }
  });

  if (doc && 'string' === typeof path) {
    Object.defineProperty(buf, '_schema', {
        value: doc.schema.path(path)
    });
  }

  buf._subtype = 0;
  return buf;
}

/*!
 * Inherit from Buffer.
 */

//StorageBuffer.prototype = new Buffer(0);

StorageBuffer.mixin = {

  /**
   * Parent owner document
   *
   * @api private
   * @property _parent
   */

  _parent: undefined,

  /**
   * Default subtype for the Binary representing this Buffer
   *
   * @api private
   * @property _subtype
   */

  _subtype: undefined,

  /**
   * Marks this buffer as modified.
   *
   * @api private
   */

  _markModified: function () {
    var parent = this._parent;

    if (parent) {
      parent.markModified(this._path);
    }
    return this;
  },

  /**
   * Writes the buffer.
   */

  write: function () {
    var written = Buffer.prototype.write.apply(this, arguments);

    if (written > 0) {
      this._markModified();
    }

    return written;
  },

  /**
   * Copies the buffer.
   *
   * ####Note:
   *
   * `Buffer#copy` does not mark `target` as modified so you must copy from a `StorageBuffer` for it to work as expected. This is a work around since `copy` modifies the target, not this.
   *
   * @return {StorageBuffer}
   * @param {Buffer} target
   */

  copy: function (target) {
    var ret = Buffer.prototype.copy.apply(this, arguments);

    if (target && target.isStorageBuffer) {
      target._markModified();
    }

    return ret;
  }
};

/*!
 * Compile other Buffer methods marking this buffer as modified.
 */

;(
// node < 0.5
'writeUInt8 writeUInt16 writeUInt32 writeInt8 writeInt16 writeInt32 ' +
'writeFloat writeDouble fill ' +
'utf8Write binaryWrite asciiWrite set ' +

// node >= 0.5
'writeUInt16LE writeUInt16BE writeUInt32LE writeUInt32BE ' +
'writeInt16LE writeInt16BE writeInt32LE writeInt32BE ' +
'writeFloatLE writeFloatBE writeDoubleLE writeDoubleBE'
).split(' ').forEach(function (method) {
  if (!Buffer.prototype[method]) return;
    StorageBuffer.mixin[method] = new Function(
    'var ret = Buffer.prototype.'+method+'.apply(this, arguments);' +
    'this._markModified();' +
    'return ret;'
  );
});

/**
 * Converts this buffer to its Binary type representation.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.toObject(bson.BSON_BINARY_SUBTYPE_USER_DEFINED);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} [subtype]
 * @return {Binary}
 * @api public
 */

StorageBuffer.mixin.toObject = function (options) {
  var subtype = 'number' === typeof options
    ? options
    : (this._subtype || 0);
  return new Binary(this, subtype);
};

/**
 * Determines if this buffer is equals to `other` buffer
 *
 * @param {Buffer} other
 * @return {Boolean}
 */

StorageBuffer.mixin.equals = function (other) {
  if (!Buffer.isBuffer(other)) {
    return false;
  }

  if (this.length !== other.length) {
    return false;
  }

  for (var i = 0; i < this.length; ++i) {
    if (this[i] !== other[i]) return false;
  }

  return true;
};

/**
 * Sets the subtype option and marks the buffer modified.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.subtype(bson.BSON_BINARY_SUBTYPE_UUID);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} subtype
 * @api public
 */

StorageBuffer.mixin.subtype = function (subtype) {
  if ('number' !== typeof subtype) {
    throw new TypeError('Invalid subtype. Expected a number');
  }

  if (this._subtype !== subtype) {
    this._markModified();
  }

  this._subtype = subtype;
};

/*!
 * Module exports.
 */

StorageBuffer.Binary = Binary;

module.exports = StorageBuffer;

}).call(this,require("buffer").Buffer)

},{"../binary":1,"../utils":35,"buffer":37}],31:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */
var StorageArray = require('./array')
  , ObjectId = require('./objectid')
  , ObjectIdSchema = require('../schema/objectid')
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
  };
};

/*!
 * Module exports.
 */

module.exports = StorageDocumentArray;

},{"../document":5,"../schema/objectid":25,"./array":29,"./objectid":34}],32:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var Document = require('../document');
var Deferred = require('../deferred');

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
  var promise = new Deferred().done(fn);
  promise.resolve();
  return promise;
};

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
    var msg = 'Unable to invalidate a subdocument that has not been added to an array.';
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

  this.$__.ownerDocument = parent;

  return this.$__.ownerDocument;
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

},{"../deferred":4,"../document":5}],33:[function(require,module,exports){
'use strict';

/*!
 * Module exports.
 */

exports.Array = require('./array');
exports.Buffer = require('./buffer');

exports.Embedded = require('./embedded');

exports.DocumentArray = require('./documentarray');
exports.ObjectId = require('./objectid');

},{"./array":29,"./buffer":30,"./documentarray":31,"./embedded":32,"./objectid":34}],34:[function(require,module,exports){
(function (process){
'use strict';

/**
 * Module dependencies.
 * @ignore
 */
var BinaryParser = require('../binaryparser').BinaryParser;

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
var checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');

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
    throw new Error('Argument passed in must be a single String of 12 bytes or a string of 24 hex characters');
  } else if(valid && typeof id === 'string' && id.length === 24) {
    return ObjectId.createFromHexString(id);
  } else if(id == null || typeof id === 'number') {
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
  ObjectId.index = (ObjectId.index + 1) % 0xFFFFFF;

  return ObjectId.index;
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
  if ('number' !== typeof time) {
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
  if(typeof hexString === 'undefined' || hexString != null && hexString.length !== 24)
    throw new Error('Argument passed in must be a single String of 12 bytes or a string of 24 hex characters');

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

  if(id != null && 'number' !== typeof id && (id.length !== 12 && id.length !== 24)) {
    return false;
  } else {
    // Check specifically for hex correctness
    if(typeof id === 'string' && id.length === 24) return checkForHexRegExp.test(id);
    return true;
  }
};

/*!
 * @ignore
 */
Object.defineProperty(ObjectId.prototype, 'generationTime', {
  enumerable: true
  , get: function () {
    return Math.floor(BinaryParser.decodeInt(this.id.substring(0,4), 32, true, true));
  }
  , set: function (value) {
    value = BinaryParser.encodeInt(value, 32, true, true);

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

},{"../binaryparser":2,"_process":41}],35:[function(require,module,exports){
(function (process,global,Buffer){
'use strict';

/*!
 * Module dependencies.
 */

var ObjectId = require('./types/objectid')
  , mpath = require('./mpath')
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
  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }

  // Handle StorageNumbers
  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (Buffer.isBuffer(a)) {
    return a.equals(b);
  }

  if (isStorageObject(a)) a = a.toObject();
  if (isStorageObject(b)) b = b.toObject();

  return _.isEqual(a, b);
};



var toString = Object.prototype.toString;

function isRegExp (o) {
  return 'object' === typeof o
      && '[object RegExp]' === toString.call(o);
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
    if ( options.depopulate ){
      return obj.toString();
    }

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

    if ( typeof to[key] === 'undefined' ){
      to[key] = from[key];

    } else if ( _.isObject( from[key] ) ){
      merge( to[key], from[key] );
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
    window.postMessage(ID, '*');
  } :
  function(func) { // IE<8
    setTimeout(func, 0);
  };
}());

// PhantomJS doesn't support bind yet
if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // ближайший аналог внутренней функции
      // IsCallable в ECMAScript 5
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
      fToBind = this,
      Noop    = function() {},
      fBound  = function() {
        return fToBind.apply(this instanceof Noop && oThis
            ? this
            : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments)));
      };

    Noop.prototype = this.prototype;
    fBound.prototype = new Noop();

    return fBound;
  };
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"./document":5,"./mpath":15,"./types/objectid":34,"_process":41,"buffer":37}],36:[function(require,module,exports){
'use strict';

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

},{}],37:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize)
    buf.parent = rootParent

  return buf
}

function SlowBuffer(subject, encoding, noZero) {
  if (!(this instanceof SlowBuffer))
    return new SlowBuffer(subject, encoding, noZero)

  var buf = new Buffer(subject, encoding, noZero)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length)
    throw new RangeError('attempt to write outside buffer bounds');

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length)
    newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul

  return val
}

Buffer.prototype.readUIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100))
    val += this[offset + --byteLength] * mul;

  return val
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100))
    val += this[offset + --i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || source.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes(string, units) {
  var codePoint, length = string.length
  var leadSurrogate = null
  units = units || Infinity
  var bytes = []
  var i = 0

  for (; i<length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {

      // last char was a lead
      if (leadSurrogate) {

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        else {
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      }

      // no lead yet
      else {

        // unexpected trail
        if (codePoint > 0xDBFF) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // unpaired lead
        else if (i + 1 === length) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        else {
          leadSurrogate = codePoint
          continue
        }
      }
    }

    // valid bmp char, but last char was a lead
    else if (leadSurrogate) {
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    }
    else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {

    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":38,"ieee754":39,"is-array":40}],38:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],39:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],40:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],41:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

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
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],42:[function(require,module,exports){
module.exports={
  "name": "storage",
  "version": "0.3.1",
  "description": "Mongoose-like schema validation, collections and documents on browser (client-side)",
  "author": "Constantine Melnikov <ka.melnikov@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/archangel-irk/storage.git"
  },
  "main": "dist/storage.min.js",
  "scripts": {
    "test": "grunt test"
  },
  "devDependencies": {
    "grunt": "latest",
    "time-grunt": "latest",
    "grunt-contrib-jshint": "latest",
    "grunt-contrib-uglify": "latest",
    "grunt-contrib-watch": "latest",
    "grunt-browserify": "latest",
    "grunt-karma": "latest",
    "grunt-karma-coveralls": "latest",
    "karma": "latest",
    "karma-coverage": "latest",
    "karma-mocha": "latest",
    "karma-chai": "latest",
    "karma-phantomjs-launcher": "latest",
    "karma-chrome-launcher": "latest",
    "karma-firefox-launcher": "latest",
    "karma-ie-launcher": "latest",
    "karma-safari-launcher": "latest",
    "karma-sauce-launcher": "latest",

    "lodash": "2.4.1",

    "browserify": "latest",

    "dox": "latest",
    "highlight.js": "latest",
    "jade": "latest",
    "markdown": "latest"
  }
}

},{}]},{},[13])(13)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmluYXJ5LmpzIiwibGliL2JpbmFyeXBhcnNlci5qcyIsImxpYi9jb2xsZWN0aW9uLmpzIiwibGliL2RlZmVycmVkLmpzIiwibGliL2RvY3VtZW50LmpzIiwibGliL2Vycm9yLmpzIiwibGliL2Vycm9yL2Nhc3QuanMiLCJsaWIvZXJyb3IvbWVzc2FnZXMuanMiLCJsaWIvZXJyb3IvbWlzc2luZ1NjaGVtYS5qcyIsImxpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwibGliL2Vycm9yL3ZhbGlkYXRvci5qcyIsImxpYi9ldmVudHMuanMiLCJsaWIvaW5kZXguanMiLCJsaWIvaW50ZXJuYWwuanMiLCJsaWIvbXBhdGguanMiLCJsaWIvc2NoZW1hLmpzIiwibGliL3NjaGVtYS9hcnJheS5qcyIsImxpYi9zY2hlbWEvYm9vbGVhbi5qcyIsImxpYi9zY2hlbWEvYnVmZmVyLmpzIiwibGliL3NjaGVtYS9kYXRlLmpzIiwibGliL3NjaGVtYS9kb2N1bWVudGFycmF5LmpzIiwibGliL3NjaGVtYS9pbmRleC5qcyIsImxpYi9zY2hlbWEvbWl4ZWQuanMiLCJsaWIvc2NoZW1hL251bWJlci5qcyIsImxpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCJsaWIvc2NoZW1hL3N0cmluZy5qcyIsImxpYi9zY2hlbWF0eXBlLmpzIiwibGliL3N0YXRlbWFjaGluZS5qcyIsImxpYi90eXBlcy9hcnJheS5qcyIsImxpYi90eXBlcy9idWZmZXIuanMiLCJsaWIvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsImxpYi90eXBlcy9lbWJlZGRlZC5qcyIsImxpYi90eXBlcy9pbmRleC5qcyIsImxpYi90eXBlcy9vYmplY3RpZC5qcyIsImxpYi91dGlscy5qcyIsImxpYi92aXJ0dWFsdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3I1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdDBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaGFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIGNsYXNzIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBCU09OIEJpbmFyeSB0eXBlLlxuICpcbiAqIFN1YiB0eXBlc1xuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfREVGQVVMVCoqLCBkZWZhdWx0IEJTT04gdHlwZS5cbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX0ZVTkNUSU9OKiosIEJTT04gZnVuY3Rpb24gdHlwZS5cbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX0JZVEVfQVJSQVkqKiwgQlNPTiBieXRlIGFycmF5IHR5cGUuXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9VVUlEKiosIEJTT04gdXVpZCB0eXBlLlxuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfTUQ1KiosIEJTT04gbWQ1IHR5cGUuXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9VU0VSX0RFRklORUQqKiwgQlNPTiB1c2VyIGRlZmluZWQgdHlwZS5cbiAqXG4gKiBAY29uc3RydWN0b3IgUmVwcmVzZW50cyB0aGUgQmluYXJ5IEJTT04gdHlwZS5cbiAqIEBwYXJhbSB7QnVmZmVyfSBidWZmZXIgYSBidWZmZXIgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGJpbmFyeSBkYXRhLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtzdWJUeXBlXSB0aGUgb3B0aW9uIGJpbmFyeSB0eXBlLlxuICogQHJldHVybiB7R3JpZH1cbiAqL1xuZnVuY3Rpb24gQmluYXJ5KGJ1ZmZlciwgc3ViVHlwZSkge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCaW5hcnkpKSByZXR1cm4gbmV3IEJpbmFyeShidWZmZXIsIHN1YlR5cGUpO1xuXG4gIHRoaXMuX2Jzb250eXBlID0gJ0JpbmFyeSc7XG5cbiAgaWYoYnVmZmVyIGluc3RhbmNlb2YgTnVtYmVyKSB7XG4gICAgdGhpcy5zdWJfdHlwZSA9IGJ1ZmZlcjtcbiAgICB0aGlzLnBvc2l0aW9uID0gMDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnN1Yl90eXBlID0gc3ViVHlwZSA9PSBudWxsID8gQlNPTl9CSU5BUllfU1VCVFlQRV9ERUZBVUxUIDogc3ViVHlwZTtcbiAgICB0aGlzLnBvc2l0aW9uID0gMDtcbiAgfVxuXG4gIGlmKGJ1ZmZlciAhPSBudWxsICYmICEoYnVmZmVyIGluc3RhbmNlb2YgTnVtYmVyKSkge1xuICAgIC8vIE9ubHkgYWNjZXB0IEJ1ZmZlciwgVWludDhBcnJheSBvciBBcnJheXNcbiAgICBpZih0eXBlb2YgYnVmZmVyID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gRGlmZmVyZW50IHdheXMgb2Ygd3JpdGluZyB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcgZm9yIHRoZSBkaWZmZXJlbnQgdHlwZXNcbiAgICAgIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gbmV3IEJ1ZmZlcihidWZmZXIpO1xuICAgICAgfSBlbHNlIGlmKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyB8fCAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGJ1ZmZlcikgPT09ICdbb2JqZWN0IEFycmF5XScpKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyID0gd3JpdGVTdHJpbmdUb0FycmF5KGJ1ZmZlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29ubHkgU3RyaW5nLCBCdWZmZXIsIFVpbnQ4QXJyYXkgb3IgQXJyYXkgYWNjZXB0ZWQnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgfVxuICAgIHRoaXMucG9zaXRpb24gPSBidWZmZXIubGVuZ3RoO1xuICB9IGVsc2Uge1xuICAgIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmJ1ZmZlciA9ICBuZXcgQnVmZmVyKEJpbmFyeS5CVUZGRVJfU0laRSk7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICB0aGlzLmJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcihCaW5hcnkuQlVGRkVSX1NJWkUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkoQmluYXJ5LkJVRkZFUl9TSVpFKTtcbiAgICB9XG4gICAgLy8gU2V0IHBvc2l0aW9uIHRvIHN0YXJ0IG9mIGJ1ZmZlclxuICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICB9XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGlzIGJpbmFyeSB3aXRoIGJ5dGVfdmFsdWUuXG4gKlxuICogQHBhcmFtIHtDaGFyYWN0ZXJ9IGJ5dGVfdmFsdWUgYSBzaW5nbGUgYnl0ZSB3ZSB3aXNoIHRvIHdyaXRlLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiBwdXQoYnl0ZV92YWx1ZSkge1xuICAvLyBJZiBpdCdzIGEgc3RyaW5nIGFuZCBhIGhhcyBtb3JlIHRoYW4gb25lIGNoYXJhY3RlciB0aHJvdyBhbiBlcnJvclxuICBpZihieXRlX3ZhbHVlWydsZW5ndGgnXSAhPSBudWxsICYmIHR5cGVvZiBieXRlX3ZhbHVlICE9ICdudW1iZXInICYmIGJ5dGVfdmFsdWUubGVuZ3RoICE9IDEpIHRocm93IG5ldyBFcnJvcihcIm9ubHkgYWNjZXB0cyBzaW5nbGUgY2hhcmFjdGVyIFN0cmluZywgVWludDhBcnJheSBvciBBcnJheVwiKTtcbiAgaWYodHlwZW9mIGJ5dGVfdmFsdWUgIT0gJ251bWJlcicgJiYgYnl0ZV92YWx1ZSA8IDAgfHwgYnl0ZV92YWx1ZSA+IDI1NSkgdGhyb3cgbmV3IEVycm9yKFwib25seSBhY2NlcHRzIG51bWJlciBpbiBhIHZhbGlkIHVuc2lnbmVkIGJ5dGUgcmFuZ2UgMC0yNTVcIik7XG5cbiAgLy8gRGVjb2RlIHRoZSBieXRlIHZhbHVlIG9uY2VcbiAgdmFyIGRlY29kZWRfYnl0ZSA9IG51bGw7XG4gIGlmKHR5cGVvZiBieXRlX3ZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIGRlY29kZWRfYnl0ZSA9IGJ5dGVfdmFsdWUuY2hhckNvZGVBdCgwKTtcbiAgfSBlbHNlIGlmKGJ5dGVfdmFsdWVbJ2xlbmd0aCddICE9IG51bGwpIHtcbiAgICBkZWNvZGVkX2J5dGUgPSBieXRlX3ZhbHVlWzBdO1xuICB9IGVsc2Uge1xuICAgIGRlY29kZWRfYnl0ZSA9IGJ5dGVfdmFsdWU7XG4gIH1cblxuICBpZih0aGlzLmJ1ZmZlci5sZW5ndGggPiB0aGlzLnBvc2l0aW9uKSB7XG4gICAgdGhpcy5idWZmZXJbdGhpcy5wb3NpdGlvbisrXSA9IGRlY29kZWRfYnl0ZTtcbiAgfSBlbHNlIHtcbiAgICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpKSB7XG4gICAgICAvLyBDcmVhdGUgYWRkaXRpb25hbCBvdmVyZmxvdyBidWZmZXJcbiAgICAgIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKEJpbmFyeS5CVUZGRVJfU0laRSArIHRoaXMuYnVmZmVyLmxlbmd0aCk7XG4gICAgICAvLyBDb21iaW5lIHRoZSB0d28gYnVmZmVycyB0b2dldGhlclxuICAgICAgdGhpcy5idWZmZXIuY29weShidWZmZXIsIDAsIDAsIHRoaXMuYnVmZmVyLmxlbmd0aCk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgIHRoaXMuYnVmZmVyW3RoaXMucG9zaXRpb24rK10gPSBkZWNvZGVkX2J5dGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWZmZXIgPSBudWxsO1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IGJ1ZmZlciAodHlwZWQgb3Igbm9ybWFsIGFycmF5KVxuICAgICAgaWYoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMuYnVmZmVyKSA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nKSB7XG4gICAgICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcihCaW5hcnkuQlVGRkVSX1NJWkUgKyB0aGlzLmJ1ZmZlci5sZW5ndGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1ZmZlciA9IG5ldyBBcnJheShCaW5hcnkuQlVGRkVSX1NJWkUgKyB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBuZWVkIHRvIGNvcHkgYWxsIHRoZSBjb250ZW50IHRvIHRoZSBuZXcgYXJyYXlcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBidWZmZXJbaV0gPSB0aGlzLmJ1ZmZlcltpXTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVhc3NpZ24gdGhlIGJ1ZmZlclxuICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICAvLyBXcml0ZSB0aGUgYnl0ZVxuICAgICAgdGhpcy5idWZmZXJbdGhpcy5wb3NpdGlvbisrXSA9IGRlY29kZWRfYnl0ZTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogV3JpdGVzIGEgYnVmZmVyIG9yIHN0cmluZyB0byB0aGUgYmluYXJ5LlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyfFN0cmluZ30gc3RyaW5nIGEgc3RyaW5nIG9yIGJ1ZmZlciB0byBiZSB3cml0dGVuIHRvIHRoZSBCaW5hcnkgQlNPTiBvYmplY3QuXG4gKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IHNwZWNpZnkgdGhlIGJpbmFyeSBvZiB3aGVyZSB0byB3cml0ZSB0aGUgY29udGVudC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZShzdHJpbmcsIG9mZnNldCkge1xuICBvZmZzZXQgPSB0eXBlb2Ygb2Zmc2V0ID09PSAnbnVtYmVyJyA/IG9mZnNldCA6IHRoaXMucG9zaXRpb247XG5cbiAgLy8gSWYgdGhlIGJ1ZmZlciBpcyB0byBzbWFsbCBsZXQncyBleHRlbmQgdGhlIGJ1ZmZlclxuICBpZih0aGlzLmJ1ZmZlci5sZW5ndGggPCBvZmZzZXQgKyBzdHJpbmcubGVuZ3RoKSB7XG4gICAgdmFyIGJ1ZmZlciA9IG51bGw7XG4gICAgLy8gSWYgd2UgYXJlIGluIG5vZGUuanNcbiAgICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpKSB7XG4gICAgICBidWZmZXIgPSBuZXcgQnVmZmVyKHRoaXMuYnVmZmVyLmxlbmd0aCArIHN0cmluZy5sZW5ndGgpO1xuICAgICAgdGhpcy5idWZmZXIuY29weShidWZmZXIsIDAsIDAsIHRoaXMuYnVmZmVyLmxlbmd0aCk7XG4gICAgfSBlbHNlIGlmKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLmJ1ZmZlcikgPT09ICdbb2JqZWN0IFVpbnQ4QXJyYXldJykge1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IGJ1ZmZlclxuICAgICAgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKHRoaXMuYnVmZmVyLmxlbmd0aCArIHN0cmluZy5sZW5ndGgpKVxuICAgICAgLy8gQ29weSB0aGUgY29udGVudFxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMucG9zaXRpb247IGkrKykge1xuICAgICAgICBidWZmZXJbaV0gPSB0aGlzLmJ1ZmZlcltpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBc3NpZ24gdGhlIG5ldyBidWZmZXJcbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgfVxuXG4gIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikpIHtcbiAgICBzdHJpbmcuY29weSh0aGlzLmJ1ZmZlciwgb2Zmc2V0LCAwLCBzdHJpbmcubGVuZ3RoKTtcbiAgICB0aGlzLnBvc2l0aW9uID0gKG9mZnNldCArIHN0cmluZy5sZW5ndGgpID4gdGhpcy5wb3NpdGlvbiA/IChvZmZzZXQgKyBzdHJpbmcubGVuZ3RoKSA6IHRoaXMucG9zaXRpb247XG4gICAgLy8gb2Zmc2V0ID0gc3RyaW5nLmxlbmd0aFxuICB9IGVsc2UgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHN0cmluZyA9PT0gJ3N0cmluZycgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSkge1xuICAgIHRoaXMuYnVmZmVyLndyaXRlKHN0cmluZywgJ2JpbmFyeScsIG9mZnNldCk7XG4gICAgdGhpcy5wb3NpdGlvbiA9IChvZmZzZXQgKyBzdHJpbmcubGVuZ3RoKSA+IHRoaXMucG9zaXRpb24gPyAob2Zmc2V0ICsgc3RyaW5nLmxlbmd0aCkgOiB0aGlzLnBvc2l0aW9uO1xuICAgIC8vIG9mZnNldCA9IHN0cmluZy5sZW5ndGg7XG4gIH0gZWxzZSBpZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3RyaW5nKSA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nXG4gICAgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN0cmluZykgPT09ICdbb2JqZWN0IEFycmF5XScgJiYgdHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmJ1ZmZlcltvZmZzZXQrK10gPSBzdHJpbmdbaV07XG4gICAgfVxuXG4gICAgdGhpcy5wb3NpdGlvbiA9IG9mZnNldCA+IHRoaXMucG9zaXRpb24gPyBvZmZzZXQgOiB0aGlzLnBvc2l0aW9uO1xuICB9IGVsc2UgaWYodHlwZW9mIHN0cmluZyA9PT0gJ3N0cmluZycpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmJ1ZmZlcltvZmZzZXQrK10gPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICB9XG5cbiAgICB0aGlzLnBvc2l0aW9uID0gb2Zmc2V0ID4gdGhpcy5wb3NpdGlvbiA/IG9mZnNldCA6IHRoaXMucG9zaXRpb247XG4gIH1cbn07XG5cbi8qKlxuICogUmVhZHMgKipsZW5ndGgqKiBieXRlcyBzdGFydGluZyBhdCAqKnBvc2l0aW9uKiouXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHBvc2l0aW9uIHJlYWQgZnJvbSB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gdGhlIEJpbmFyeS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggdGhlIG51bWJlciBvZiBieXRlcyB0byByZWFkLlxuICogQHJldHVybiB7QnVmZmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24gcmVhZChwb3NpdGlvbiwgbGVuZ3RoKSB7XG4gIGxlbmd0aCA9IGxlbmd0aCAmJiBsZW5ndGggPiAwXG4gICAgPyBsZW5ndGhcbiAgICA6IHRoaXMucG9zaXRpb247XG5cbiAgLy8gTGV0J3MgcmV0dXJuIHRoZSBkYXRhIGJhc2VkIG9uIHRoZSB0eXBlIHdlIGhhdmVcbiAgaWYodGhpcy5idWZmZXJbJ3NsaWNlJ10pIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2UocG9zaXRpb24sIHBvc2l0aW9uICsgbGVuZ3RoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDcmVhdGUgYSBidWZmZXIgdG8ga2VlcCB0aGUgcmVzdWx0XG4gICAgdmFyIGJ1ZmZlciA9IHR5cGVvZiBVaW50OEFycmF5ICE9ICd1bmRlZmluZWQnID8gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKGxlbmd0aCkpIDogbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZmZXJbaV0gPSB0aGlzLmJ1ZmZlcltwb3NpdGlvbisrXTtcbiAgICB9XG4gIH1cbiAgLy8gUmV0dXJuIHRoZSBidWZmZXJcbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2YgdGhpcyBiaW5hcnkgYXMgYSBzdHJpbmcuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uIHZhbHVlKGFzUmF3KSB7XG4gIGFzUmF3ID0gYXNSYXcgPT0gbnVsbCA/IGZhbHNlIDogYXNSYXc7XG5cbiAgLy8gT3B0aW1pemUgdG8gc2VyaWFsaXplIGZvciB0aGUgc2l0dWF0aW9uIHdoZXJlIHRoZSBkYXRhID09IHNpemUgb2YgYnVmZmVyXG4gIGlmKGFzUmF3ICYmIHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikgJiYgdGhpcy5idWZmZXIubGVuZ3RoID09IHRoaXMucG9zaXRpb24pXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuXG4gIC8vIElmIGl0J3MgYSBub2RlLmpzIGJ1ZmZlciBvYmplY3RcbiAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSkge1xuICAgIHJldHVybiBhc1JhdyA/IHRoaXMuYnVmZmVyLnNsaWNlKDAsIHRoaXMucG9zaXRpb24pIDogdGhpcy5idWZmZXIudG9TdHJpbmcoJ2JpbmFyeScsIDAsIHRoaXMucG9zaXRpb24pO1xuICB9IGVsc2Uge1xuICAgIGlmKGFzUmF3KSB7XG4gICAgICAvLyB3ZSBzdXBwb3J0IHRoZSBzbGljZSBjb21tYW5kIHVzZSBpdFxuICAgICAgaWYodGhpcy5idWZmZXJbJ3NsaWNlJ10gIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2UoMCwgdGhpcy5wb3NpdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgYnVmZmVyIHRvIGNvcHkgY29udGVudCB0b1xuICAgICAgICB2YXIgbmV3QnVmZmVyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMuYnVmZmVyKSA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nID8gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKHRoaXMucG9zaXRpb24pKSA6IG5ldyBBcnJheSh0aGlzLnBvc2l0aW9uKTtcbiAgICAgICAgLy8gQ29weSBjb250ZW50XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnBvc2l0aW9uOyBpKyspIHtcbiAgICAgICAgICBuZXdCdWZmZXJbaV0gPSB0aGlzLmJ1ZmZlcltpXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXR1cm4gdGhlIGJ1ZmZlclxuICAgICAgICByZXR1cm4gbmV3QnVmZmVyO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY29udmVydEFycmF5dG9VdGY4QmluYXJ5U3RyaW5nKHRoaXMuYnVmZmVyLCAwLCB0aGlzLnBvc2l0aW9uKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogTGVuZ3RoLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGUgYmluYXJ5LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XG4gIHJldHVybiB0aGlzLnBvc2l0aW9uO1xufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuYnVmZmVyICE9IG51bGwgPyB0aGlzLmJ1ZmZlci50b1N0cmluZygnYmFzZTY0JykgOiAnJztcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbihmb3JtYXQpIHtcbiAgcmV0dXJuIHRoaXMuYnVmZmVyICE9IG51bGwgPyB0aGlzLmJ1ZmZlci5zbGljZSgwLCB0aGlzLnBvc2l0aW9uKS50b1N0cmluZyhmb3JtYXQpIDogJyc7XG59O1xuXG4vLyBCaW5hcnkgZGVmYXVsdCBzdWJ0eXBlXG52YXIgQlNPTl9CSU5BUllfU1VCVFlQRV9ERUZBVUxUID0gMDtcblxuLyoqXG4gKiBAaWdub3JlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xudmFyIHdyaXRlU3RyaW5nVG9BcnJheSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gQ3JlYXRlIGEgYnVmZmVyXG4gIHZhciBidWZmZXIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoZGF0YS5sZW5ndGgpKSA6IG5ldyBBcnJheShkYXRhLmxlbmd0aCk7XG4gIC8vIFdyaXRlIHRoZSBjb250ZW50IHRvIHRoZSBidWZmZXJcbiAgZm9yKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICBidWZmZXJbaV0gPSBkYXRhLmNoYXJDb2RlQXQoaSk7XG4gIH1cbiAgLy8gV3JpdGUgdGhlIHN0cmluZyB0byB0aGUgYnVmZmVyXG4gIHJldHVybiBidWZmZXI7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgQXJyYXkgb3QgVWludDhBcnJheSB0byBCaW5hcnkgU3RyaW5nXG4gKlxuICogQGlnbm9yZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbnZhciBjb252ZXJ0QXJyYXl0b1V0ZjhCaW5hcnlTdHJpbmcgPSBmdW5jdGlvbihieXRlQXJyYXksIHN0YXJ0SW5kZXgsIGVuZEluZGV4KSB7XG4gIHZhciByZXN1bHQgPSAnJztcbiAgZm9yKHZhciBpID0gc3RhcnRJbmRleDsgaSA8IGVuZEluZGV4OyBpKyspIHtcbiAgICByZXN1bHQgPSByZXN1bHQgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVBcnJheVtpXSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkJpbmFyeS5CVUZGRVJfU0laRSA9IDI1NjtcblxuLyohXG4gKiBEZWZhdWx0IEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0RFRkFVTFQgPSAwO1xuXG4vKiFcbiAqIEZ1bmN0aW9uIEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0ZVTkNUSU9OID0gMTtcblxuLyohXG4gKiBCeXRlIEFycmF5IEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0JZVEVfQVJSQVkgPSAyO1xuXG4vKiFcbiAqIE9MRCBVVUlEIEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX1VVSURfT0xEID0gMztcblxuLyohXG4gKiBVVUlEIEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX1VVSUQgPSA0O1xuXG4vKiFcbiAqIE1ENSBCU09OIHR5cGVcbiAqXG4gKiBAY29uc3QgU1VCVFlQRV9ERUZBVUxUXG4gKiovXG5CaW5hcnkuU1VCVFlQRV9NRDUgPSA1O1xuXG4vKiFcbiAqIFVzZXIgQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfVVNFUl9ERUZJTkVEID0gMTI4O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmFyeTtcbm1vZHVsZS5leHBvcnRzLkJpbmFyeSA9IEJpbmFyeTsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogQmluYXJ5IFBhcnNlci5cbiAqIEBjb3B5cmlnaHQgSm9uYXMgUmFvbmkgU29hcmVzIFNpbHZhXG4gKiBAc2VlIGh0dHA6Ly9qc2Zyb21oZWxsLmNvbS9jbGFzc2VzL2JpbmFyeS1wYXJzZXIgW3YxLjBdXG4gKlxuICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vbW9uZ29kYi9qcy1ic29uL2Jsb2IvbWFzdGVyL2xpYi9ic29uL2JpbmFyeV9wYXJzZXIuanNcbiAqL1xuXG52YXIgbWF4Qml0cyA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG5cdG1heEJpdHNbaV0gPSBNYXRoLnBvdygyLCBpKTtcbn1cblxuZnVuY3Rpb24gQmluYXJ5UGFyc2VyIChiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCaW5hcnlQYXJzZXIpKSByZXR1cm4gbmV3IEJpbmFyeVBhcnNlcihiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucyk7XG4gIFxuXHR0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbjtcblx0dGhpcy5hbGxvd0V4Y2VwdGlvbnMgPSBhbGxvd0V4Y2VwdGlvbnM7XG59XG5cbkJpbmFyeVBhcnNlci53YXJuID0gZnVuY3Rpb24gd2FybiAobXNnKSB7XG5cdGlmICh0aGlzLmFsbG93RXhjZXB0aW9ucykge1xuXHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cblx0cmV0dXJuIDE7XG59O1xuXG5CaW5hcnlQYXJzZXIuZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG4gIHZhciBiID0gbmV3IHRoaXMuQnVmZmVyKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuLCBkYXRhKVxuICAgICAgLCB4ID0gYi5yZWFkQml0cygwLCBiaXRzKVxuICAgICAgLCBtYXggPSBtYXhCaXRzW2JpdHNdOyAvL21heCA9IE1hdGgucG93KCAyLCBiaXRzICk7XG4gIFxuICByZXR1cm4gc2lnbmVkICYmIHggPj0gbWF4IC8gMlxuICAgICAgPyB4IC0gbWF4XG4gICAgICA6IHg7XG59O1xuXG5CaW5hcnlQYXJzZXIuZW5jb2RlSW50ID0gZnVuY3Rpb24gZW5jb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG5cdHZhciBtYXggPSBtYXhCaXRzW2JpdHNdO1xuXG4gIGlmIChkYXRhID49IG1heCB8fCBkYXRhIDwgLShtYXggLyAyKSkge1xuICAgIHRoaXMud2FybignZW5jb2RlSW50OjpvdmVyZmxvdycpO1xuICAgIGRhdGEgPSAwO1xuICB9XG5cblx0aWYgKGRhdGEgPCAwKSB7XG4gICAgZGF0YSArPSBtYXg7XG4gIH1cblxuXHRmb3IgKHZhciByID0gW107IGRhdGE7IHJbci5sZW5ndGhdID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhICUgMjU2KSwgZGF0YSA9IE1hdGguZmxvb3IoZGF0YSAvIDI1NikpO1xuXG5cdGZvciAoYml0cyA9IC0oLWJpdHMgPj4gMykgLSByLmxlbmd0aDsgYml0cy0tOyByW3IubGVuZ3RoXSA9ICdcXDAnKTtcblxuICByZXR1cm4gKCh0aGlzLmJpZ0VuZGlhbiB8fCBmb3JjZUJpZ0VuZGlhbikgPyByLnJldmVyc2UoKSA6IHIpLmpvaW4oJycpO1xufTtcblxuQmluYXJ5UGFyc2VyLnRvU21hbGwgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TbWFsbCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvQnl0ZSAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21CeXRlICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvU2hvcnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TaG9ydCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvV29yZCAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Xb3JkICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvSW50ICAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21JbnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvTG9uZyAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Mb25nICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRFdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21EV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvUVdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVFXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcblxuLyohXG4gKiBAY29uc3RydWN0b3IgQmluYXJ5UGFyc2VyIGJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAqL1xuZnVuY3Rpb24gQmluYXJ5UGFyc2VyQnVmZmVyIChiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbiB8fCAwO1xuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xufVxuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIHNldEJ1ZmZlciAoZGF0YSkge1xuICB2YXIgbCwgaSwgYjtcblxuXHRpZiAoZGF0YSkge1xuICAgIGkgPSBsID0gZGF0YS5sZW5ndGg7XG4gICAgYiA9IHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KGwpO1xuXHRcdGZvciAoOyBpOyBiW2wgLSBpXSA9IGRhdGEuY2hhckNvZGVBdCgtLWkpKTtcblx0XHR0aGlzLmJpZ0VuZGlhbiAmJiBiLnJldmVyc2UoKTtcblx0fVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5oYXNOZWVkZWRCaXRzID0gZnVuY3Rpb24gaGFzTmVlZGVkQml0cyAobmVlZGVkQml0cykge1xuXHRyZXR1cm4gdGhpcy5idWZmZXIubGVuZ3RoID49IC0oLW5lZWRlZEJpdHMgPj4gMyk7XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmNoZWNrQnVmZmVyID0gZnVuY3Rpb24gY2hlY2tCdWZmZXIgKG5lZWRlZEJpdHMpIHtcblx0aWYgKCF0aGlzLmhhc05lZWRlZEJpdHMobmVlZGVkQml0cykpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NoZWNrQnVmZmVyOjptaXNzaW5nIGJ5dGVzJyk7XG4gIH1cbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUucmVhZEJpdHMgPSBmdW5jdGlvbiByZWFkQml0cyAoc3RhcnQsIGxlbmd0aCkge1xuXHQvL3NobCBmaXg6IEhlbnJpIFRvcmdlbWFuZSB+MTk5NiAoY29tcHJlc3NlZCBieSBKb25hcyBSYW9uaSlcblxuXHRmdW5jdGlvbiBzaGwgKGEsIGIpIHtcblx0XHRmb3IgKDsgYi0tOyBhID0gKChhICU9IDB4N2ZmZmZmZmYgKyAxKSAmIDB4NDAwMDAwMDApID09IDB4NDAwMDAwMDAgPyBhICogMiA6IChhIC0gMHg0MDAwMDAwMCkgKiAyICsgMHg3ZmZmZmZmZiArIDEpO1xuXHRcdHJldHVybiBhO1xuXHR9XG5cblx0aWYgKHN0YXJ0IDwgMCB8fCBsZW5ndGggPD0gMCkge1xuXHRcdHJldHVybiAwO1xuICB9XG5cblx0dGhpcy5jaGVja0J1ZmZlcihzdGFydCArIGxlbmd0aCk7XG5cbiAgdmFyIG9mZnNldExlZnRcbiAgICAsIG9mZnNldFJpZ2h0ID0gc3RhcnQgJSA4XG4gICAgLCBjdXJCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoIC0gKCBzdGFydCA+PiAzICkgLSAxXG4gICAgLCBsYXN0Qnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCArICggLSggc3RhcnQgKyBsZW5ndGggKSA+PiAzIClcbiAgICAsIGRpZmYgPSBjdXJCeXRlIC0gbGFzdEJ5dGVcbiAgICAsIHN1bSA9ICgodGhpcy5idWZmZXJbIGN1ckJ5dGUgXSA+PiBvZmZzZXRSaWdodCkgJiAoKDEgPDwgKGRpZmYgPyA4IC0gb2Zmc2V0UmlnaHQgOiBsZW5ndGgpKSAtIDEpKSArIChkaWZmICYmIChvZmZzZXRMZWZ0ID0gKHN0YXJ0ICsgbGVuZ3RoKSAlIDgpID8gKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdICYgKCgxIDw8IG9mZnNldExlZnQpIC0gMSkpIDw8IChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCA6IDApO1xuXG5cdGZvcig7IGRpZmY7IHN1bSArPSBzaGwodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10sIChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCkpO1xuXG5cdHJldHVybiBzdW07XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5CaW5hcnlQYXJzZXIuQnVmZmVyID0gQmluYXJ5UGFyc2VyQnVmZmVyO1xuZXhwb3J0cy5CaW5hcnlQYXJzZXIgPSBCaW5hcnlQYXJzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpO1xuXG4vL1RPRE86INC90LDQv9C40YHQsNGC0Ywg0LzQtdGC0L7QtCAudXBzZXJ0KCBkb2MgKSAtINC+0LHQvdC+0LLQu9C10L3QuNC1INC00L7QutGD0LzQtdC90YLQsCwg0LAg0LXRgdC70Lgg0LXQs9C+INC90LXRgiwg0YLQviDRgdC+0LfQtNCw0L3QuNC1XG5cbi8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQu9C+0LPQuNC60YMg0YEgYXBpUmVzb3VyY2UgKNGB0L7RhdGA0LDQvdGP0YLRjCDRgdGB0YvQu9C60YMg0L3QsCDQvdC10LPQviDQuCDQuNGB0L/QvtC70YzQt9C+0LLRgtGMINC/0YDQuCDQvNC10YLQvtC00LUgZG9jLnNhdmUpXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LrQvtC70LvQtdC60YbQuNC5LlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSDQvdCw0LfQstCw0L3QuNC1INC60L7Qu9C70LXQutGG0LjQuFxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINCh0YXQtdC80LAg0LjQu9C4INC+0LHRitC10LrRgiDQvtC/0LjRgdCw0L3QuNGPINGB0YXQtdC80YtcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwIGFwaSDRgNC10YHRg9GA0YFcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDb2xsZWN0aW9uICggbmFtZSwgc2NoZW1hLCBhcGkgKXtcbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDQvdCw0LfQstCw0L3QuNC1INC/0YDQvtGB0YLRgNCw0L3RgdGC0LLQsCDQuNC80ZHQvVxuICB0aGlzLm5hbWUgPSBuYW1lO1xuICAvLyDQpdGA0LDQvdC40LvQuNGJ0LUg0LTQu9GPINC00L7QutGD0LzQtdC90YLQvtCyXG4gIHRoaXMuZG9jdW1lbnRzID0ge307XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSApIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0YHRgdGL0LvQutGDINC90LAgYXBpINC00LvRjyDQvNC10YLQvtC00LAgLnNhdmUoKVxuICB0aGlzLmFwaSA9IGFwaTtcblxuICAvLyDQmNGB0L/QvtC70YzQt9GD0LXQvNCw0Y8g0YHRhdC10LzQsCDQtNC70Y8g0LrQvtC70LvQtdC60YbQuNC4XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIC8vINCe0YLQvtCx0YDQsNC20LXQvdC40LUg0L/QvtC70Y8gZG9jdW1lbnRzINCyINCy0LjQtNC1INC80LDRgdGB0LjQstCwICjQtNC70Y8g0L3QvtC60LDRg9GC0LApXG4gIHRoaXMuYXJyYXkgPSBbXTtcbiAgLy8gdG9kbzog0L/QtdGA0LXQvdC10YHRgtC4INCyINCw0LTQsNC/0YLQtdGAINC40LvQuCDRgdC00LXQu9Cw0YLRjCDQv9C+INC00YDRg9Cz0L7QvNGDIChvYmplY3Qub2JzZXJ2ZSlcbiAgLy8g0J3Rg9C20L3QviDQtNC70Y8g0L7QsdC90L7QstC70LXQvdC40Y8g0L/RgNC40LLRj9C30L7QuiDQuiDRjdGC0L7QvNGDINGB0LLQvtC50YHRgtCy0YMg0LTQu9GPIGtub2Nrb3V0anNcbiAgd2luZG93LmtvICYmIGtvLnRyYWNrKCB0aGlzLCBbJ2FycmF5J10gKTtcbn1cblxuQ29sbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LjQu9C4INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7Qsi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IHR5cGU6ICdqZWxseSBiZWFuJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZChbeyB0eXBlOiAnamVsbHkgYmVhbicgfSwgeyB0eXBlOiAnc25pY2tlcnMnIH1dKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxBcnJheS48b2JqZWN0Pn0gW2RvY10gLSDQlNC+0LrRg9C80LXQvdGCXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAgICogQHBhcmFtIHtib29sZWFufSBbX3N0b3JhZ2VXaWxsTXV0YXRlXSAtINCk0LvQsNCzINC00L7QsdCw0LLQu9C10L3QuNGPINC80LDRgdGB0LjQstCwINC00L7QutGD0LzQtdC90YLQvtCyLiDRgtC+0LvRjNC60L4g0LTQu9GPINCy0L3Rg9GC0YDQtdC90L3QtdCz0L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Y9cbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggZG9jLCBmaWVsZHMsIGluaXQsIF9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YLQsCDQvdC10YIsINC30L3QsNGH0LjRgiDQsdGD0LTQtdGCINC/0YPRgdGC0L7QuVxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xuXG4gICAgLy8g0JzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XG4gICAgICB2YXIgc2F2ZWREb2NzID0gW107XG5cbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XG4gICAgICAgIHNhdmVkRG9jcy5wdXNoKCBzZWxmLmFkZCggZG9jLCBmaWVsZHMsIGluaXQsIHRydWUgKSApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcblxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YIg0YPQttC1INC10YHRgtGMLCDRgtC+INC/0YDQvtGB0YLQviDRg9GB0YLQsNC90L7QstC40YLRjCDQt9C90LDRh9C10L3QuNGPXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0uc2V0KCBkb2MgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlzY3JpbWluYXRvck1hcHBpbmcgPSB0aGlzLnNjaGVtYVxuICAgICAgICA/IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nXG4gICAgICAgIDogbnVsbDtcblxuICAgICAgdmFyIGtleSA9IGRpc2NyaW1pbmF0b3JNYXBwaW5nICYmIGRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdFxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxuICAgICAgICA6IG51bGw7XG5cbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcbiAgICAgIHZhciBzY2hlbWE7XG4gICAgICBpZiAoa2V5ICYmIGRvYyAmJiBkb2Nba2V5XSAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9ycyAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV0pIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gICAgICAvL3RvZG86INGC0YPRgiDQvdGD0LbQvdCwINC/0YDQvtCy0LXRgNC60LAg0L3QsCDRgdGD0YnQtdGB0YLQstC+0LLQsNC90LjQtSBpZCAo0LzQvtC20LXRgiDRgdGC0L7QuNGCINGB0LzQvtGC0YDQtdGC0Ywg0LIg0YHRhdC10LzQtSDQvtC/0YbQuNGOIGlkKVxuICAgICAgLyohXG4gICAgICBpZiAoICFuZXdEb2MuX2lkICl7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9CU0LvRjyDQv9C+0LzQtdGJ0LXQvdC40Y8g0LIg0LrQvtC70LvQtdC60YbQuNGOINC90LXQvtCx0YXQvtC00LjQvNC+LCDRh9GC0L7QsdGLINGDINC00L7QutGD0LzQtdC90YLQsCDQsdGL0LsgX2lkJyk7XG4gICAgICB9XG4gICAgICAqL1xuXG4gICAgICBpZCA9IG5ld0RvYy5faWQudG9TdHJpbmcoKTtcbiAgICAgIC8vINCf0L7QvNC10YHRgtC40YLRjCDQtNC+0LrRg9C80LXQvdGCINCyINC60L7Qu9C70LXQutGG0LjRjlxuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0gPSBuZXdEb2M7XG4gICAgfVxuXG4gICAgLy8g0JTQu9GPINC+0LTQuNC90L7Rh9C90YvRhSDQtNC+0LrRg9C80LXQvdGC0L7QsiDRgtC+0LbQtSDQvdGD0LbQvdC+ICDQstGL0LfQstCw0YLRjCBzdG9yYWdlSGFzTXV0YXRlZFxuICAgIGlmICggIV9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRvY3VtZW50c1sgaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0KPQtNCw0LvQtdC90LjRgtGMINC00L7QutGD0LzQtdC90YIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5yZW1vdmUoIERvY3VtZW50ICk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5yZW1vdmUoIHV1aWQgKTtcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R8bnVtYmVyfSBkb2N1bWVudCAtINCh0LDQvCDQtNC+0LrRg9C80LXQvdGCINC40LvQuCDQtdCz0L4gaWQuXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbiggZG9jdW1lbnQgKXtcbiAgICByZXR1cm4gZGVsZXRlIHRoaXMuZG9jdW1lbnRzWyBkb2N1bWVudC5faWQgfHwgZG9jdW1lbnQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGC0YsuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIG5hbWVkIGpvaG5cbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBuYW1lOiAnam9obicgfSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgYXV0aG9yOiAnU2hha2VzcGVhcmUnLCB5ZWFyOiAxNjExIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgZmluZDogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICByZXR1cm4gXy53aGVyZSggdGhpcy5kb2N1bWVudHMsIGNvbmRpdGlvbnMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kQnlJZCggaWQgKTtcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kQnlJZDogZnVuY3Rpb24oIF9pZCApe1xuICAgIHJldHVybiB0aGlzLmRvY3VtZW50c1sgX2lkIF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviBpZCDQtNC+0LrRg9C80LXQvdGCINC4INGD0LTQsNC70LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkQW5kUmVtb3ZlKCBpZCApIC8vIHJldHVybnMg0YFvbGxlY3Rpb25cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRCeUlkXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAgICovXG4gIGZpbmRCeUlkQW5kUmVtb3ZlOiBmdW5jdGlvbiggX2lkICl7XG4gICAgdGhpcy5yZW1vdmUoIHRoaXMuZmluZEJ5SWQoIF9pZCApICk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviBpZCDQtNC+0LrRg9C80LXQvdGCINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnVwZGF0ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkQW5kVXBkYXRlOiBmdW5jdGlvbiggX2lkLCBwYXRoLCB2YWx1ZSApe1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZSggdGhpcy5maW5kQnlJZCggX2lkICksIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L7QtNC40L0g0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gZmluZCBvbmUgaXBob25lIGFkdmVudHVyZXNcbiAgICogc3RvcmFnZS5hZHZlbnR1cmUuZmluZE9uZSh7IHR5cGU6ICdpcGhvbmUnIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kT25lOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLmZpbmRXaGVyZSggdGhpcy5kb2N1bWVudHMsIGNvbmRpdGlvbnMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+INGD0YHQu9C+0LLQuNGOINC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZE9uZUFuZFJlbW92ZSggY29uZGl0aW9ucyApIC8vIHJldHVybnMg0YFvbGxlY3Rpb25cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRPbmVcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAgICovXG4gIGZpbmRPbmVBbmRSZW1vdmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgdGhpcy5yZW1vdmUoIHRoaXMuZmluZE9uZSggY29uZGl0aW9ucyApICk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+INGD0YHQu9C+0LLQuNGOINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmVBbmRVcGRhdGU6IGZ1bmN0aW9uKCBjb25kaXRpb25zLCBwYXRoLCB2YWx1ZSApe1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICksIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0LHQvdC+0LLQuNGC0Ywg0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5wbGFjZXMudXBkYXRlKCBzdG9yYWdlLnBsYWNlcy5maW5kQnlJZCggMCApLCB7XG4gICAqICAgbmFtZTogJ0lya3V0c2snXG4gICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcnxvYmplY3R9IGRvY3VtZW50XG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fEJvb2xlYW59XG4gICAqL1xuICB1cGRhdGU6IGZ1bmN0aW9uKCBkb2N1bWVudCwgcGF0aCwgdmFsdWUgKXtcbiAgICB2YXIgZG9jID0gdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuXG4gICAgaWYgKCBkb2MgPT0gbnVsbCApe1xuICAgICAgY29uc29sZS53YXJuKCdzdG9yYWdlOjp1cGRhdGU6IERvY3VtZW50IGlzIG5vdCBmb3VuZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9jLnNldCggcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdGA0LDQsdC+0YLRh9C40Log0L3QsCDQuNC30LzQtdC90LXQvdC40Y8gKNC00L7QsdCw0LLQu9C10L3QuNC1LCDRg9C00LDQu9C10L3QuNC1KSDQtNCw0L3QvdGL0YUg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAqL1xuICBzdG9yYWdlSGFzTXV0YXRlZDogZnVuY3Rpb24oKXtcbiAgICAvLyDQntCx0L3QvtCy0LjQvCDQvNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LIgKNGB0L/QtdGG0LjQsNC70YzQvdC+0LUg0L7RgtC+0LHRgNCw0LbQtdC90LjQtSDQtNC70Y8g0L/QtdGA0LXQsdC+0YDQsCDQvdC+0LrQsNGD0YLQvtC8KVxuICAgIHRoaXMuYXJyYXkgPSBfLnRvQXJyYXkoIHRoaXMuZG9jdW1lbnRzICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0LHQvdC+0LLQuNGC0Ywg0YHRgdGL0LvQutGDINC90LAg0LTQvtC60YPQvNC10L3RgiDQsiDQv9C+0LvQtSBkb2N1bWVudHNcbiAgICpcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gZG9jXG4gICAqL1xuICB1cGRhdGVJZExpbms6IGZ1bmN0aW9uKCBkb2MgKXtcbiAgICB2YXIgaWQgPSBkb2MuX2lkLnRvU3RyaW5nKCk7XG4gICAgdmFyIG9sZElkID0gXy5maW5kS2V5KCB0aGlzLmRvY3VtZW50cywgeyBfaWQ6IGRvYy5faWQgfSk7XG5cbiAgICBpZiAoICFvbGRJZCApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J3QtSDQvdCw0LnQtNC10L0g0LTQvtC60YPQvNC10L3RgiDQtNC70Y8g0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgdGL0LvQutC4INC/0L4g0Y3RgtC+0LzRgyBfaWQ6ICcgKyBpZCApO1xuICAgIH1cblxuICAgIGRlbGV0ZSB0aGlzLmRvY3VtZW50c1sgb2xkSWQgXTtcbiAgICB0aGlzLmRvY3VtZW50c1sgaWQgXSA9IGRvYztcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuU3RhbmRhbG9uZSBEZWZlcnJlZFxuQ29weXJpZ2h0IDIwMTIgT3R0byBWZWh2aWzDpGluZW5cblJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG5odHRwczovL2dpdGh1Yi5jb20vTXVtYWtpbC9TdGFuZGFsb25lLURlZmVycmVkXG5cblRoaXMgaXMgYSBzdGFuZGFsb25lIGltcGxlbWVudGF0aW9uIG9mIHRoZSB3b25kZXJmdWwgalF1ZXJ5LkRlZmVycmVkIEFQSS5cblRoZSBkb2N1bWVudGF0aW9uIGhlcmUgaXMgb25seSBmb3IgcXVpY2sgcmVmZXJlbmNlLCBmb3IgY29tcGxldGUgYXBpIHBsZWFzZVxuc2VlIHRoZSBncmVhdCB3b3JrIG9mIHRoZSBvcmlnaW5hbCBwcm9qZWN0OlxuXG5odHRwOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvZGVmZXJyZWQtb2JqZWN0L1xuKi9cblxudmFyIFByb21pc2UsIGZsYXR0ZW4sIGlzT2JzZXJ2YWJsZSxcbiAgX19zbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZSxcbiAgX19iaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZm9yRWFjaCkgdGhyb3cgbmV3IEVycm9yKCdEZWZlcnJlZCByZXF1aXJlcyBBcnJheS5mb3JFYWNoJyk7XG5cbi8qXG5UZWxscyBpZiBhbiBvYmplY3QgaXMgb2JzZXJ2YWJsZVxuKi9cblxuaXNPYnNlcnZhYmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiAob2JqIGluc3RhbmNlb2YgRGVmZXJyZWQpIHx8IChvYmogaW5zdGFuY2VvZiBQcm9taXNlKTtcbn07XG5cbi8qXG5GbGF0dGVuIGEgdHdvIGRpbWVuc2lvbmFsIGFycmF5IGludG8gb25lIGRpbWVuc2lvbi5cblJlbW92ZXMgZWxlbWVudHMgdGhhdCBhcmUgbm90IGZ1bmN0aW9uc1xuKi9cblxuZmxhdHRlbiA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgdmFyIGZsYXR0ZWQ7XG4gIGlmICghYXJncykgcmV0dXJuIFtdO1xuICBmbGF0dGVkID0gW107XG4gIGFyZ3MuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gZmxhdHRlZC5wdXNoKGl0ZW0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGFyZ3MuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgICAgIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHJldHVybiBmbGF0dGVkLnB1c2goZm4pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmxhdHRlZDtcbn07XG5cbi8qXG5Qcm9taXNlIG9iamVjdCBmdW5jdGlvbnMgYXMgYSBwcm94eSBmb3IgYSBEZWZlcnJlZCwgZXhjZXB0XG5pdCBkb2VzIG5vdCBsZXQgeW91IG1vZGlmeSB0aGUgc3RhdGUgb2YgdGhlIERlZmVycmVkXG4qL1xuXG5Qcm9taXNlID0gKGZ1bmN0aW9uKCkge1xuXG4gIFByb21pc2UucHJvdG90eXBlLl9kZWZlcnJlZCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gUHJvbWlzZShkZWZlcnJlZCkge1xuICAgIHRoaXMuX2RlZmVycmVkID0gZGVmZXJyZWQ7XG4gIH1cblxuICBQcm9taXNlLnByb3RvdHlwZS5hbHdheXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncywgX3JlZjtcbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAoX3JlZiA9IHRoaXMuX2RlZmVycmVkKS5hbHdheXMuYXBwbHkoX3JlZiwgYXJncyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzLCBfcmVmO1xuICAgIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIChfcmVmID0gdGhpcy5fZGVmZXJyZWQpLmRvbmUuYXBwbHkoX3JlZiwgYXJncyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuZmFpbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzLCBfcmVmO1xuICAgIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIChfcmVmID0gdGhpcy5fZGVmZXJyZWQpLmZhaWwuYXBwbHkoX3JlZiwgYXJncyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgUHJvbWlzZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRvbmVGaWx0ZXIsIGZhaWxGaWx0ZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fZGVmZXJyZWQucGlwZShkb25lRmlsdGVyLCBmYWlsRmlsdGVyKTtcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9kZWZlcnJlZC5zdGF0ZSgpO1xuICB9O1xuXG4gIFByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihkb25lLCBmYWlsKSB7XG4gICAgdGhpcy5fZGVmZXJyZWQudGhlbihkb25lLCBmYWlsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICByZXR1cm4gUHJvbWlzZTtcblxufSkoKTtcblxuLypcbiAgSW5pdGlhbGl6ZXMgYSBuZXcgRGVmZXJyZWQuIFlvdSBjYW4gcGFzcyBhIGZ1bmN0aW9uIGFzIGEgcGFyYW1ldGVyXG4gIHRvIGJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5IGFmdGVyIGluaXQuIFRoZSBmdW5jdGlvbiByZWNlaXZlc1xuICB0aGUgbmV3IGRlZmVycmVkIG9iamVjdCBhcyBhIHBhcmFtZXRlciBhbmQgdGhpcyBpcyBhbHNvIHNldCB0byB0aGVcbiAgc2FtZSBvYmplY3QuXG4qL1xuZnVuY3Rpb24gRGVmZXJyZWQoZm4pIHtcbiAgdGhpcy50aGVuID0gX19iaW5kKHRoaXMudGhlbiwgdGhpcyk7XG4gIHRoaXMucmVzb2x2ZVdpdGggPSBfX2JpbmQodGhpcy5yZXNvbHZlV2l0aCwgdGhpcyk7XG4gIHRoaXMucmVzb2x2ZSA9IF9fYmluZCh0aGlzLnJlc29sdmUsIHRoaXMpO1xuICB0aGlzLnJlamVjdFdpdGggPSBfX2JpbmQodGhpcy5yZWplY3RXaXRoLCB0aGlzKTtcbiAgdGhpcy5yZWplY3QgPSBfX2JpbmQodGhpcy5yZWplY3QsIHRoaXMpO1xuICB0aGlzLnByb21pc2UgPSBfX2JpbmQodGhpcy5wcm9taXNlLCB0aGlzKTtcbiAgdGhpcy5wcm9ncmVzcyA9IF9fYmluZCh0aGlzLnByb2dyZXNzLCB0aGlzKTtcbiAgdGhpcy5waXBlID0gX19iaW5kKHRoaXMucGlwZSwgdGhpcyk7XG4gIHRoaXMubm90aWZ5V2l0aCA9IF9fYmluZCh0aGlzLm5vdGlmeVdpdGgsIHRoaXMpO1xuICB0aGlzLm5vdGlmeSA9IF9fYmluZCh0aGlzLm5vdGlmeSwgdGhpcyk7XG4gIHRoaXMuZmFpbCA9IF9fYmluZCh0aGlzLmZhaWwsIHRoaXMpO1xuICB0aGlzLmRvbmUgPSBfX2JpbmQodGhpcy5kb25lLCB0aGlzKTtcbiAgdGhpcy5hbHdheXMgPSBfX2JpbmQodGhpcy5hbHdheXMsIHRoaXMpO1xuICBpZiAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSBmbi5jYWxsKHRoaXMsIHRoaXMpO1xuXG4gIHRoaXMuX3N0YXRlID0gJ3BlbmRpbmcnO1xufVxuXG4vKlxuICBQYXNzIGluIGZ1bmN0aW9ucyBvciBhcnJheXMgb2YgZnVuY3Rpb25zIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlXG4gIERlZmVycmVkIG9iamVjdCBjaGFuZ2VzIHN0YXRlIGZyb20gcGVuZGluZy4gSWYgdGhlIHN0YXRlIGlzIGFscmVhZHlcbiAgcmVqZWN0ZWQgb3IgcmVzb2x2ZWQsIHRoZSBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5LiBUaGV5XG4gIHJlY2VpdmUgdGhlIGFyZ3VtZW50cyB0aGF0IGFyZSBwYXNzZWQgdG8gcmVqZWN0IG9yIHJlc29sdmUgYW5kIHRoaXNcbiAgaXMgc2V0IHRvIHRoZSBvYmplY3QgZGVmaW5lZCBieSByZWplY3RXaXRoIG9yIHJlc29sdmVXaXRoIGlmIHRob3NlXG4gIHZhcmlhbnRzIGFyZSB1c2VkLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLmFsd2F5cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXJncywgZnVuY3Rpb25zLCBfcmVmLFxuICAgIF90aGlzID0gdGhpcztcbiAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXM7XG4gIGZ1bmN0aW9ucyA9IGZsYXR0ZW4oYXJncyk7XG4gIGlmICh0aGlzLl9zdGF0ZSA9PT0gJ3BlbmRpbmcnKSB7XG4gICAgdGhpcy5fYWx3YXlzQ2FsbGJhY2tzIHx8ICh0aGlzLl9hbHdheXNDYWxsYmFja3MgPSBbXSk7XG4gICAgKF9yZWYgPSB0aGlzLl9hbHdheXNDYWxsYmFja3MpLnB1c2guYXBwbHkoX3JlZiwgZnVuY3Rpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBmdW5jdGlvbnMuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KF90aGlzLl9jb250ZXh0LCBfdGhpcy5fd2l0aEFyZ3VtZW50cyk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBQYXNzIGluIGZ1bmN0aW9ucyBvciBhcnJheXMgb2YgZnVuY3Rpb25zIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlXG4gIERlZmVycmVkIG9iamVjdCBpcyByZXNvbHZlZC4gSWYgdGhlIG9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIHJlc29sdmVkLFxuICB0aGUgZnVuY3Rpb25zIGFyZSBleGVjdXRlZCBpbW1lZGlhdGVseS4gSWYgdGhlIG9iamVjdCBoYXMgYmVlbiByZWplY3RlZCxcbiAgbm90aGluZyBoYXBwZW5zLiBUaGUgZnVuY3Rpb25zIHJlY2VpdmUgdGhlIGFyZ3VtZW50cyB0aGF0IGFyZSBwYXNzZWRcbiAgdG8gcmVzb2x2ZSBhbmQgdGhpcyBpcyBzZXQgdG8gdGhlIG9iamVjdCBkZWZpbmVkIGJ5IHJlc29sdmVXaXRoIGlmIHRoYXRcbiAgdmFyaWFudCBpcyB1c2VkLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3MsIGZ1bmN0aW9ucywgX3JlZixcbiAgICBfdGhpcyA9IHRoaXM7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiB0aGlzO1xuICBmdW5jdGlvbnMgPSBmbGF0dGVuKGFyZ3MpO1xuICBpZiAodGhpcy5fc3RhdGUgPT09ICdyZXNvbHZlZCcpIHtcbiAgICBmdW5jdGlvbnMuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KF90aGlzLl9jb250ZXh0LCBfdGhpcy5fd2l0aEFyZ3VtZW50cyk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodGhpcy5fc3RhdGUgPT09ICdwZW5kaW5nJykge1xuICAgIHRoaXMuX2RvbmVDYWxsYmFja3MgfHwgKHRoaXMuX2RvbmVDYWxsYmFja3MgPSBbXSk7XG4gICAgKF9yZWYgPSB0aGlzLl9kb25lQ2FsbGJhY2tzKS5wdXNoLmFwcGx5KF9yZWYsIGZ1bmN0aW9ucyk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBQYXNzIGluIGZ1bmN0aW9ucyBvciBhcnJheXMgb2YgZnVuY3Rpb25zIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlXG4gIERlZmVycmVkIG9iamVjdCBpcyByZWplY3RlZC4gSWYgdGhlIG9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIHJlamVjdGVkLFxuICB0aGUgZnVuY3Rpb25zIGFyZSBleGVjdXRlZCBpbW1lZGlhdGVseS4gSWYgdGhlIG9iamVjdCBoYXMgYmVlbiByZXNvbHZlZCxcbiAgbm90aGluZyBoYXBwZW5zLiBUaGUgZnVuY3Rpb25zIHJlY2VpdmUgdGhlIGFyZ3VtZW50cyB0aGF0IGFyZSBwYXNzZWRcbiAgdG8gcmVqZWN0IGFuZCB0aGlzIGlzIHNldCB0byB0aGUgb2JqZWN0IGRlZmluZWQgYnkgcmVqZWN0V2l0aCBpZiB0aGF0XG4gIHZhcmlhbnQgaXMgdXNlZC5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5mYWlsID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBmdW5jdGlvbnMsIF9yZWYsXG4gICAgX3RoaXMgPSB0aGlzO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcztcbiAgZnVuY3Rpb25zID0gZmxhdHRlbihhcmdzKTtcbiAgaWYgKHRoaXMuX3N0YXRlID09PSAncmVqZWN0ZWQnKSB7XG4gICAgZnVuY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmbi5hcHBseShfdGhpcy5fY29udGV4dCwgX3RoaXMuX3dpdGhBcmd1bWVudHMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHRoaXMuX3N0YXRlID09PSAncGVuZGluZycpIHtcbiAgICB0aGlzLl9mYWlsQ2FsbGJhY2tzIHx8ICh0aGlzLl9mYWlsQ2FsbGJhY2tzID0gW10pO1xuICAgIChfcmVmID0gdGhpcy5fZmFpbENhbGxiYWNrcykucHVzaC5hcHBseShfcmVmLCBmdW5jdGlvbnMpO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgTm90aWZ5IHByb2dyZXNzIGNhbGxiYWNrcy4gVGhlIGNhbGxiYWNrcyBnZXQgcGFzc2VkIHRoZSBhcmd1bWVudHMgZ2l2ZW4gdG8gbm90aWZ5LlxuICBJZiB0aGUgb2JqZWN0IGhhcyByZXNvbHZlZCBvciByZWplY3RlZCwgbm90aGluZyB3aWxsIGhhcHBlblxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXJncztcbiAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gIHRoaXMubm90aWZ5V2l0aC5hcHBseSh0aGlzLCBbd2luZG93XS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3MpKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgTm90aWZ5IHByb2dyZXNzIGNhbGxiYWNrcyB3aXRoIGFkZGl0aW9uYWwgY29udGV4dC4gV29ya3MgdGhlIHNhbWUgd2F5IGFzIG5vdGlmeSgpLFxuICBleGNlcHQgdGhpcyBpcyBzZXQgdG8gY29udGV4dCB3aGVuIGNhbGxpbmcgdGhlIGZ1bmN0aW9ucy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5ub3RpZnlXaXRoID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBjb250ZXh0LCBfcmVmO1xuICBjb250ZXh0ID0gYXJndW1lbnRzWzBdLCBhcmdzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgaWYgKHRoaXMuX3N0YXRlICE9PSAncGVuZGluZycpIHJldHVybiB0aGlzO1xuICBpZiAoKF9yZWYgPSB0aGlzLl9wcm9ncmVzc0NhbGxiYWNrcykgIT0gbnVsbCkge1xuICAgIF9yZWYuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgUmV0dXJucyBhIG5ldyBQcm9taXNlIG9iamVjdCB0aGF0J3MgdGllZCB0byB0aGUgY3VycmVudCBEZWZlcnJlZC4gVGhlIGRvbmVGaWx0ZXJcbiAgYW5kIGZhaWxGaWx0ZXIgY2FuIGJlIHVzZWQgdG8gbW9kaWZ5IHRoZSBmaW5hbCB2YWx1ZXMgdGhhdCBhcmUgcGFzc2VkIHRvIHRoZVxuICBjYWxsYmFja3Mgb2YgdGhlIG5ldyBwcm9taXNlLiBJZiB0aGUgcGFyYW1ldGVycyBwYXNzZWQgYXJlIGZhbHN5LCB0aGUgcHJvbWlzZVxuICBvYmplY3QgcmVzb2x2ZXMgb3IgcmVqZWN0cyBub3JtYWxseS4gSWYgdGhlIGZpbHRlciBmdW5jdGlvbnMgcmV0dXJuIGEgdmFsdWUsXG4gIHRoYXQgb25lIGlzIHBhc3NlZCB0byB0aGUgcmVzcGVjdGl2ZSBjYWxsYmFja3MuIFRoZSBmaWx0ZXJzIGNhbiBhbHNvIHJldHVybiBhXG4gIG5ldyBQcm9taXNlIG9yIERlZmVycmVkIG9iamVjdCwgb2Ygd2hpY2ggcmVqZWN0ZWQgLyByZXNvbHZlZCB3aWxsIGNvbnRyb2wgaG93IHRoZVxuICBjYWxsYmFja3MgZmlyZS5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oZG9uZUZpbHRlciwgZmFpbEZpbHRlcikge1xuICB2YXIgZGVmO1xuICBkZWYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgdGhpcy5kb25lKGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzLCByZXN1bHQsIF9yZWY7XG4gICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgaWYgKGRvbmVGaWx0ZXIgIT0gbnVsbCkge1xuICAgICAgcmVzdWx0ID0gZG9uZUZpbHRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIGlmIChpc09ic2VydmFibGUocmVzdWx0KSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0LmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRvbmVBcmdzLCBfcmVmO1xuICAgICAgICAgIGRvbmVBcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgICAgICByZXR1cm4gKF9yZWYgPSBkZWYucmVzb2x2ZVdpdGgpLmNhbGwuYXBwbHkoX3JlZiwgW2RlZiwgdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChkb25lQXJncykpKTtcbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZmFpbEFyZ3MsIF9yZWY7XG4gICAgICAgICAgZmFpbEFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgICAgIHJldHVybiAoX3JlZiA9IGRlZi5yZWplY3RXaXRoKS5jYWxsLmFwcGx5KF9yZWYsIFtkZWYsIHRoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoZmFpbEFyZ3MpKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlZi5yZXNvbHZlV2l0aC5jYWxsKGRlZiwgdGhpcywgcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIChfcmVmID0gZGVmLnJlc29sdmVXaXRoKS5jYWxsLmFwcGx5KF9yZWYsIFtkZWYsIHRoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MsIHJlc3VsdCwgX3JlZiwgX3JlZjI7XG4gICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgaWYgKGZhaWxGaWx0ZXIgIT0gbnVsbCkge1xuICAgICAgcmVzdWx0ID0gZmFpbEZpbHRlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIGlmIChpc09ic2VydmFibGUocmVzdWx0KSkge1xuICAgICAgICByZXN1bHQuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZG9uZUFyZ3MsIF9yZWY7XG4gICAgICAgICAgZG9uZUFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgICAgIHJldHVybiAoX3JlZiA9IGRlZi5yZXNvbHZlV2l0aCkuY2FsbC5hcHBseShfcmVmLCBbZGVmLCB0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGRvbmVBcmdzKSkpO1xuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBmYWlsQXJncywgX3JlZjtcbiAgICAgICAgICBmYWlsQXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICAgICAgcmV0dXJuIChfcmVmID0gZGVmLnJlamVjdFdpdGgpLmNhbGwuYXBwbHkoX3JlZiwgW2RlZiwgdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChmYWlsQXJncykpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWYucmVqZWN0V2l0aC5jYWxsKGRlZiwgdGhpcywgcmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAoX3JlZiA9IGRlZi5yZWplY3RXaXRoKS5jYWxsLmFwcGx5KF9yZWYsIFtkZWYsIHRoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIChfcmVmMiA9IGRlZi5yZWplY3RXaXRoKS5jYWxsLmFwcGx5KF9yZWYyLCBbZGVmLCB0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3MpKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGRlZi5wcm9taXNlKCk7XG59O1xuXG4vKlxuICBBZGQgcHJvZ3Jlc3MgY2FsbGJhY2tzIHRvIGJlIGZpcmVkIHdoZW4gdXNpbmcgbm90aWZ5KClcbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXJncywgZnVuY3Rpb25zLCBfcmVmO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwIHx8IHRoaXMuX3N0YXRlICE9PSAncGVuZGluZycpIHJldHVybiB0aGlzO1xuICBmdW5jdGlvbnMgPSBmbGF0dGVuKGFyZ3MpO1xuICB0aGlzLl9wcm9ncmVzc0NhbGxiYWNrcyB8fCAodGhpcy5fcHJvZ3Jlc3NDYWxsYmFja3MgPSBbXSk7XG4gIChfcmVmID0gdGhpcy5fcHJvZ3Jlc3NDYWxsYmFja3MpLnB1c2guYXBwbHkoX3JlZiwgZnVuY3Rpb25zKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBSZXR1cm5zIHRoZSBwcm9taXNlIG9iamVjdCBvZiB0aGlzIERlZmVycmVkLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnByb21pc2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3Byb21pc2UgfHwgKHRoaXMuX3Byb21pc2UgPSBuZXcgUHJvbWlzZSh0aGlzKSk7XG59O1xuXG4vKlxuICBSZWplY3QgdGhpcyBEZWZlcnJlZC4gSWYgdGhlIG9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIHJlamVjdGVkIG9yIHJlc29sdmVkLFxuICBub3RoaW5nIGhhcHBlbnMuIFBhcmFtZXRlcnMgcGFzc2VkIHRvIHJlamVjdCB3aWxsIGJlIGhhbmRlZCB0byBhbGwgY3VycmVudFxuICBhbmQgZnV0dXJlIGZhaWwgYW5kIGFsd2F5cyBjYWxsYmFja3MuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgdGhpcy5yZWplY3RXaXRoLmFwcGx5KHRoaXMsIFt3aW5kb3ddLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBSZWplY3QgdGhpcyBEZWZlcnJlZCB3aXRoIGFkZGl0aW9uYWwgY29udGV4dC4gV29ya3MgdGhlIHNhbWUgd2F5IGFzIHJlamVjdCwgZXhjZXB0XG4gIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgdXNlZCBhcyB0aGlzIHdoZW4gY2FsbGluZyB0aGUgZmFpbCBhbmQgYWx3YXlzIGNhbGxiYWNrcy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5yZWplY3RXaXRoID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBjb250ZXh0LCBfcmVmLCBfcmVmMixcbiAgICBfdGhpcyA9IHRoaXM7XG4gIGNvbnRleHQgPSBhcmd1bWVudHNbMF0sIGFyZ3MgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IFtdO1xuICBpZiAodGhpcy5fc3RhdGUgIT09ICdwZW5kaW5nJykgcmV0dXJuIHRoaXM7XG4gIHRoaXMuX3N0YXRlID0gJ3JlamVjdGVkJztcbiAgdGhpcy5fd2l0aEFyZ3VtZW50cyA9IGFyZ3M7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICBpZiAoKF9yZWYgPSB0aGlzLl9mYWlsQ2FsbGJhY2tzKSAhPSBudWxsKSB7XG4gICAgX3JlZi5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG4gIGlmICgoX3JlZjIgPSB0aGlzLl9hbHdheXNDYWxsYmFja3MpICE9IG51bGwpIHtcbiAgICBfcmVmMi5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgUmVzb2x2ZXMgdGhpcyBEZWZlcnJlZCBvYmplY3QuIElmIHRoZSBvYmplY3QgaGFzIGFscmVhZHkgYmVlbiByZWplY3RlZCBvciByZXNvbHZlZCxcbiAgbm90aGluZyBoYXBwZW5zLiBQYXJhbWV0ZXJzIHBhc3NlZCB0byByZXNvbHZlIHdpbGwgYmUgaGFuZGVkIHRvIGFsbCBjdXJyZW50IGFuZFxuICBmdXR1cmUgZG9uZSBhbmQgYWx3YXlzIGNhbGxiYWNrcy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgdGhpcy5yZXNvbHZlV2l0aC5hcHBseSh0aGlzLCBbd2luZG93XS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3MpKSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgUmVzb2x2ZSB0aGlzIERlZmVycmVkIHdpdGggYWRkaXRpb25hbCBjb250ZXh0LiBXb3JrcyB0aGUgc2FtZSB3YXkgYXMgcmVzb2x2ZSwgZXhjZXB0XG4gIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgdXNlZCBhcyB0aGlzIHdoZW4gY2FsbGluZyB0aGUgZG9uZSBhbmQgYWx3YXlzIGNhbGxiYWNrcy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5yZXNvbHZlV2l0aCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXJncywgY29udGV4dCwgX3JlZiwgX3JlZjIsXG4gICAgX3RoaXMgPSB0aGlzO1xuICBjb250ZXh0ID0gYXJndW1lbnRzWzBdLCBhcmdzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgaWYgKHRoaXMuX3N0YXRlICE9PSAncGVuZGluZycpIHJldHVybiB0aGlzO1xuICB0aGlzLl9zdGF0ZSA9ICdyZXNvbHZlZCc7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLl93aXRoQXJndW1lbnRzID0gYXJncztcbiAgaWYgKChfcmVmID0gdGhpcy5fZG9uZUNhbGxiYWNrcykgIT0gbnVsbCkge1xuICAgIF9yZWYuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KF90aGlzLl9jb250ZXh0LCBhcmdzKTtcbiAgICB9KTtcbiAgfVxuICBpZiAoKF9yZWYyID0gdGhpcy5fYWx3YXlzQ2FsbGJhY2tzKSAhPSBudWxsKSB7XG4gICAgX3JlZjIuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KF90aGlzLl9jb250ZXh0LCBhcmdzKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gIFJldHVybnMgdGhlIHN0YXRlIG9mIHRoaXMgRGVmZXJyZWQuIENhbiBiZSAncGVuZGluZycsICdyZWplY3RlZCcgb3IgJ3Jlc29sdmVkJy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fc3RhdGU7XG59O1xuXG4vKlxuICBDb252ZW5pZW5jZSBmdW5jdGlvbiB0byBzcGVjaWZ5IGVhY2ggZG9uZSwgZmFpbCBhbmQgcHJvZ3Jlc3MgY2FsbGJhY2tzIGF0IHRoZSBzYW1lIHRpbWUuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKGRvbmVDYWxsYmFja3MsIGZhaWxDYWxsYmFja3MsIHByb2dyZXNzQ2FsbGJhY2tzKSB7XG4gIHRoaXMuZG9uZShkb25lQ2FsbGJhY2tzKTtcbiAgdGhpcy5mYWlsKGZhaWxDYWxsYmFja3MpO1xuICB0aGlzLnByb2dyZXNzKHByb2dyZXNzQ2FsbGJhY2tzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cblxuLypcblJldHVybnMgYSBuZXcgcHJvbWlzZSBvYmplY3Qgd2hpY2ggd2lsbCByZXNvbHZlIHdoZW4gYWxsIG9mIHRoZSBkZWZlcnJlZHMgb3IgcHJvbWlzZXNcbnBhc3NlZCB0byB0aGUgZnVuY3Rpb24gcmVzb2x2ZS4gVGhlIGNhbGxiYWNrcyByZWNlaXZlIGFsbCB0aGUgcGFyYW1ldGVycyB0aGF0IHRoZVxuaW5kaXZpZHVhbCByZXNvbHZlcyB5aWVsZGVkIGFzIGFuIGFycmF5LiBJZiBhbnkgb2YgdGhlIGRlZmVycmVkcyBvciBwcm9taXNlcyBhcmVcbnJlamVjdGVkLCB0aGUgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIGltbWVkaWF0ZWx5LlxuKi9cblxuRGVmZXJyZWQud2hlbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYWxsRG9uZUFyZ3MsIGFsbFJlYWR5LCBhcmdzLCByZWFkeUNvdW50O1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gbmV3IERlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSByZXR1cm4gYXJnc1swXS5wcm9taXNlKCk7XG4gIGFsbFJlYWR5ID0gbmV3IERlZmVycmVkKCk7XG4gIHJlYWR5Q291bnQgPSAwO1xuICBhbGxEb25lQXJncyA9IFtdO1xuICBhcmdzLmZvckVhY2goZnVuY3Rpb24oZGZyLCBpbmRleCkge1xuICAgIHJldHVybiBkZnIuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkb25lQXJncztcbiAgICAgIGRvbmVBcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgIHJlYWR5Q291bnQgKz0gMTtcbiAgICAgIGFsbERvbmVBcmdzW2luZGV4XSA9IGRvbmVBcmdzO1xuICAgICAgaWYgKHJlYWR5Q291bnQgPT09IGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBhbGxSZWFkeS5yZXNvbHZlLmFwcGx5KGFsbFJlYWR5LCBhbGxEb25lQXJncyk7XG4gICAgICB9XG4gICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmYWlsQXJncztcbiAgICAgIGZhaWxBcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgIHJldHVybiBhbGxSZWFkeS5yZWplY3RXaXRoLmFwcGx5KGFsbFJlYWR5LCBbdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChmYWlsQXJncykpKTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBhbGxSZWFkeS5wcm9taXNlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERlZmVycmVkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCBNaXhlZFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL21peGVkJylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBWYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vc2NoZW1hdHlwZScpLlZhbGlkYXRvckVycm9yXG4gICwgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIGNsb25lID0gdXRpbHMuY2xvbmVcbiAgLCBWYWxpZGF0aW9uRXJyb3IgPSBTdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yXG4gICwgSW50ZXJuYWxDYWNoZSA9IHJlcXVpcmUoJy4vaW50ZXJuYWwnKVxuICAsIGRlZXBFcXVhbCA9IHV0aWxzLmRlZXBFcXVhbFxuICAsIERvY3VtZW50QXJyYXlcbiAgLCBTY2hlbWFBcnJheVxuICAsIEVtYmVkZGVkO1xuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LTQvtC60YPQvNC10L3RgtCwLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0g0LfQvdCw0YfQtdC90LjRjywg0LrQvtGC0L7RgNGL0LUg0L3Rg9C20L3QviDRg9GB0YLQsNC90L7QstC40YLRjFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY29sbGVjdGlvbk5hbWVdIC0g0LrQvtC70LvQtdC60YbQuNGPINCyINC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0L3QsNGF0L7QtNC40YLRgdGPINC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDRgdGF0LXQvNCwINC/0L4g0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDRgdC+0LfQtNCw0L0g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+KVxuICogQHBhcmFtIHtCb29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERvY3VtZW50ICggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICl7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgRG9jdW1lbnQpICkge1xuICAgIHJldHVybiBuZXcgRG9jdW1lbnQoIGRhdGEsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWEsIGZpZWxkcywgaW5pdCApO1xuICB9XG5cbiAgdGhpcy4kX18gPSBuZXcgSW50ZXJuYWxDYWNoZSgpO1xuICB0aGlzLmlzTmV3ID0gdHJ1ZTtcblxuICAvLyDQodC+0LfQtNCw0YLRjCDQv9GD0YHRgtC+0Lkg0LTQvtC60YPQvNC10L3RgiDRgSDRhNC70LDQs9C+0LwgaW5pdFxuICAvLyBuZXcgVGVzdERvY3VtZW50KHRydWUpO1xuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGRhdGEgKXtcbiAgICBpbml0ID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmICggY29sbGVjdGlvbk5hbWUgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBzY2hlbWEgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICggXy5pc09iamVjdCggc2NoZW1hICkgJiYgISggc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICkpIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtVxuICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBzY2hlbWEgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuXG4gICAgaWYgKCBzY2hlbWEub3B0aW9ucy5faWQgKXtcbiAgICAgIGRhdGEgPSB7IF9pZDogbmV3IE9iamVjdElkKCkgfTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcbiAgICAvLyDQn9GA0Lgg0YHQvtC30LTQsNC90LjQuCBFbWJlZGRlZERvY3VtZW50LCDQsiDQvdGR0Lwg0YPQttC1INC10YHRgtGMINGB0YXQtdC80LAg0Lgg0LXQvNGDINC90LUg0L3Rg9C20LXQvSBfaWRcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYSB8fCBzY2hlbWE7XG4gICAgLy8g0KHQs9C10L3QtdGA0LjRgNC+0LLQsNGC0YwgT2JqZWN0SWQsINC10YHQu9C4INC+0L0g0L7RgtGB0YPRgtGB0YLQstGD0LXRgiwg0L3QviDQtdCz0L4g0YLRgNC10LHRg9C10YIg0YHRhdC10LzQsFxuICAgIGlmICggc2NoZW1hICYmICF0aGlzLnNjaGVtYSAmJiBzY2hlbWEub3B0aW9ucy5faWQgKXtcbiAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuXG4gICAgICBpZiAoIGRhdGEuX2lkID09PSB1bmRlZmluZWQgKXtcbiAgICAgICAgZGF0YS5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoICFzY2hlbWEgKXtcbiAgICB0aHJvdyBuZXcgU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvcigpO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0LTQvtC60YPQvNC10L3RgiDRgSDRhNC70LDQs9C+0LwgaW5pdFxuICAvLyBuZXcgVGVzdERvY3VtZW50KHsgdGVzdDogJ2Jvb20nIH0sIHRydWUpO1xuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGNvbGxlY3Rpb25OYW1lICl7XG4gICAgaW5pdCA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIGNvbGxlY3Rpb25OYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0LTQvtC60YPQvNC10L3RgiDRgSBzdHJpY3Q6IHRydWVcbiAgLy8gY29sbGVjdGlvbi5hZGQoey4uLn0sIHRydWUpO1xuICBpZiAoJ2Jvb2xlYW4nID09PSB0eXBlb2YgZmllbGRzKSB7XG4gICAgdGhpcy4kX18uc3RyaWN0TW9kZSA9IGZpZWxkcztcbiAgICBmaWVsZHMgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy4kX18uc3RyaWN0TW9kZSA9IHNjaGVtYS5vcHRpb25zICYmIHNjaGVtYS5vcHRpb25zLnN0cmljdDtcbiAgICB0aGlzLiRfXy5zZWxlY3RlZCA9IGZpZWxkcztcbiAgfVxuXG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIGlmICggY29sbGVjdGlvbk5hbWUgKXtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSB3aW5kb3cuc3RvcmFnZVsgY29sbGVjdGlvbk5hbWUgXTtcbiAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gIH1cblxuICB2YXIgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWRQYXRocygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcXVpcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgdGhpcy4kX18uYWN0aXZlUGF0aHMucmVxdWlyZSggcmVxdWlyZWRbaV0gKTtcbiAgfVxuXG4gIHRoaXMuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICB0aGlzLl9kb2MgPSB0aGlzLiRfX2J1aWxkRG9jKCBkYXRhLCBpbml0ICk7XG5cbiAgaWYgKCBpbml0ICl7XG4gICAgdGhpcy5pbml0KCBkYXRhICk7XG4gIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgdGhpcy5zZXQoIGRhdGEsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICB9XG5cbiAgLy8gbS1naC0yNDM5XG4gIC8vIGRlZmluZSBnZXR0ZXJzIGZvciBkYXRhLnByb3AgcHJvcGVydGllcyB3aXRoIG5vbi1zdHJpY3Qgc2NoZW1hc1xuICBpZiAoIHNjaGVtYS5vcHRpb25zLnN0cmljdCA9PT0gZmFsc2UgJiYgZGF0YSApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwga2V5cyA9IE9iamVjdC5rZXlzKCB0aGlzLl9kb2MgKTtcblxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbigga2V5ICkge1xuICAgICAgaWYgKCEoa2V5IGluIHNjaGVtYS50cmVlKSkge1xuICAgICAgICBkZWZpbmUoIHNlbGYsIGtleSwgbnVsbCwgc2VsZiApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gUmVnaXN0ZXIgbWV0aG9kc1xuICBmb3IgKCB2YXIgbSBpbiBzY2hlbWEubWV0aG9kcyApe1xuICAgIHRoaXNbIG0gXSA9IHNjaGVtYS5tZXRob2RzWyBtIF07XG4gIH1cbiAgLy8gUmVnaXN0ZXIgc3RhdGljc1xuICBmb3IgKCB2YXIgcyBpbiBzY2hlbWEuc3RhdGljcyApe1xuICAgIHRoaXNbIHMgXSA9IHNjaGVtYS5zdGF0aWNzWyBzIF07XG4gIH1cbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIGRvY3VtZW50cyBzY2hlbWEuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBzY2hlbWFcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNjaGVtYTtcblxuLyoqXG4gKiBCb29sZWFuIGZsYWcgc3BlY2lmeWluZyBpZiB0aGUgZG9jdW1lbnQgaXMgbmV3LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgaXNOZXdcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTmV3O1xuXG4vKipcbiAqIFRoZSBzdHJpbmcgdmVyc2lvbiBvZiB0aGlzIGRvY3VtZW50cyBfaWQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBnZXR0ZXIgZXhpc3RzIG9uIGFsbCBkb2N1bWVudHMgYnkgZGVmYXVsdC4gVGhlIGdldHRlciBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyB0aGUgYGlkYCBbb3B0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2lkKSBvZiBpdHMgYFNjaGVtYWAgdG8gZmFsc2UgYXQgY29uc3RydWN0aW9uIHRpbWUuXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBpZDogZmFsc2UgfSk7XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgU2NoZW1hIG9wdGlvbnMgL2RvY3MvZ3VpZGUuaHRtbCNvcHRpb25zXG4gKiBAcHJvcGVydHkgaWRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlkO1xuXG4vKipcbiAqIEhhc2ggY29udGFpbmluZyBjdXJyZW50IHZhbGlkYXRpb24gZXJyb3JzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgZXJyb3JzXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lcnJvcnM7XG5cbkRvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSB7XG4gIGRvY3VtZW50RGVmaW5lUHJvcGVydHk6IF8ubm9vcCxcbiAgZG9jdW1lbnRTZXRJbml0aWFsVmFsdWU6IF8ubm9vcCxcbiAgZG9jdW1lbnRHZXRWYWx1ZTogXy5ub29wLFxuICBkb2N1bWVudFNldFZhbHVlOiBfLm5vb3Bcbn07XG5cbi8qKlxuICogQnVpbGRzIHRoZSBkZWZhdWx0IGRvYyBzdHJ1Y3R1cmVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtza2lwSWRdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fYnVpbGREb2NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fYnVpbGREb2MgPSBmdW5jdGlvbiAoIG9iaiwgc2tpcElkICkge1xuICB2YXIgZG9jID0ge31cbiAgICAsIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09PSBwICkge1xuICAgICAgaWYgKCBza2lwSWQgKSBjb250aW51ZTtcbiAgICAgIGlmICggb2JqICYmICdfaWQnIGluIG9iaiApIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXG4gICAgICAsIGxlbiA9IHBhdGgubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXG4gICAgICAsIGRvY18gPSBkb2NcbiAgICAgICwgaSA9IDA7XG5cbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcbiAgICAgIHZhciBwaWVjZSA9IHBhdGhbIGkgXVxuICAgICAgICAsIGRlZmF1bHRWYWw7XG5cbiAgICAgIGlmICggaSA9PT0gbGFzdCApIHtcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xuXG4gICAgICAgIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRlZmF1bHRWYWwgKSB7XG4gICAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWw7XG4gICAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkb2M7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBkb2N1bWVudCB3aXRob3V0IHNldHRlcnMgb3IgbWFya2luZyBhbnl0aGluZyBtb2RpZmllZC5cbiAqXG4gKiBDYWxsZWQgaW50ZXJuYWxseSBhZnRlciBhIGRvY3VtZW50IGlzIHJldHVybmVkIGZyb20gc2VydmVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGRvY3VtZW50IHJldHVybmVkIGJ5IHNlcnZlclxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCBkYXRhICkge1xuICB0aGlzLmlzTmV3ID0gZmFsc2U7XG5cbiAgLy90b2RvOiDRgdC00LXRgdGMINCy0YHRkSDQuNC30LzQtdC90LjRgtGB0Y8sINGB0LzQvtGC0YDQtdGC0Ywg0LrQvtC80LzQtdC90YIg0LzQtdGC0L7QtNCwIHRoaXMucG9wdWxhdGVkXG4gIC8vIGhhbmRsZSBkb2NzIHdpdGggcG9wdWxhdGVkIHBhdGhzXG4gIC8qIVxuICBpZiAoIGRvYy5faWQgJiYgb3B0cyAmJiBvcHRzLnBvcHVsYXRlZCAmJiBvcHRzLnBvcHVsYXRlZC5sZW5ndGggKSB7XG4gICAgdmFyIGlkID0gU3RyaW5nKCBkb2MuX2lkICk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLnBvcHVsYXRlZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGl0ZW0gPSBvcHRzLnBvcHVsYXRlZFsgaSBdO1xuICAgICAgdGhpcy5wb3B1bGF0ZWQoIGl0ZW0ucGF0aCwgaXRlbS5fZG9jc1tpZF0sIGl0ZW0gKTtcbiAgICB9XG4gIH1cbiAgKi9cblxuICBpbml0KCB0aGlzLCBkYXRhLCB0aGlzLl9kb2MgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qIVxuICogSW5pdCBoZWxwZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNlbGYgZG9jdW1lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogcmF3IHNlcnZlciBkb2NcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2Mgb2JqZWN0IHdlIGFyZSBpbml0aWFsaXppbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBpbml0IChzZWxmLCBvYmosIGRvYywgcHJlZml4KSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoXG4gICAgLCBzY2hlbWFcbiAgICAsIHBhdGhcbiAgICAsIGk7XG5cbiAgd2hpbGUgKGxlbi0tKSB7XG4gICAgaSA9IGtleXNbbGVuXTtcbiAgICBwYXRoID0gcHJlZml4ICsgaTtcbiAgICBzY2hlbWEgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFzY2hlbWEgJiYgXy5pc1BsYWluT2JqZWN0KCBvYmpbIGkgXSApICYmXG4gICAgICAgICghb2JqW2ldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW2ldLmNvbnN0cnVjdG9yKSkpIHtcbiAgICAgIC8vIGFzc3VtZSBuZXN0ZWQgb2JqZWN0XG4gICAgICBpZiAoIWRvY1tpXSkgZG9jW2ldID0ge307XG4gICAgICBpbml0KHNlbGYsIG9ialtpXSwgZG9jW2ldLCBwYXRoICsgJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtpXSA9PT0gbnVsbCkge1xuICAgICAgICBkb2NbaV0gPSBudWxsO1xuICAgICAgfSBlbHNlIGlmIChvYmpbaV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgc2VsZi4kX190cnkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRvY1tpXSA9IHNjaGVtYS5jYXN0KG9ialtpXSwgc2VsZiwgdHJ1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZG9jW2ldID0gb2JqW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5hZGFwdGVySG9va3MuZG9jdW1lbnRTZXRJbml0aWFsVmFsdWUuY2FsbCggc2VsZiwgc2VsZiwgcGF0aCwgZG9jW2ldICk7XG4gICAgICB9XG4gICAgICAvLyBtYXJrIGFzIGh5ZHJhdGVkXG4gICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5pbml0KHBhdGgpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgcGF0aCwgb3IgbWFueSBwYXRocy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gcGF0aCwgdmFsdWVcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlKVxuICpcbiAqICAgICAvLyBvYmplY3RcbiAqICAgICBkb2Muc2V0KHtcbiAqICAgICAgICAgcGF0aCAgOiB2YWx1ZVxuICogICAgICAgLCBwYXRoMiA6IHtcbiAqICAgICAgICAgICAgcGF0aCAgOiB2YWx1ZVxuICogICAgICAgICB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gbnVtYmVyXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgTnVtYmVyKVxuICpcbiAqICAgICAvLyBvbmx5LXRoZS1mbHkgY2FzdCB0byBzdHJpbmdcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBTdHJpbmcpXG4gKlxuICogICAgIC8vIGNoYW5naW5nIHN0cmljdCBtb2RlIGJlaGF2aW9yXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgeyBzdHJpY3Q6IGZhbHNlIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gcGF0aCBwYXRoIG9yIG9iamVjdCBvZiBrZXkvdmFscyB0byBzZXRcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbCB0aGUgdmFsdWUgdG8gc2V0XG4gKiBAcGFyYW0ge1NjaGVtYXxTdHJpbmd8TnVtYmVyfGV0Yy4ufSBbdHlwZV0gb3B0aW9uYWxseSBzcGVjaWZ5IGEgdHlwZSBmb3IgXCJvbi10aGUtZmx5XCIgYXR0cmlidXRlc1xuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbGx5IHNwZWNpZnkgb3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgYmVoYXZpb3Igb2YgdGhlIHNldFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIHR5cGUsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGUgJiYgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlLmNvbnN0cnVjdG9yKSkge1xuICAgIG9wdGlvbnMgPSB0eXBlO1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcbiAgICAsIGFkaG9jID0gdHlwZSAmJiB0cnVlICE9PSB0eXBlXG4gICAgLCBjb25zdHJ1Y3RpbmcgPSB0cnVlID09PSB0eXBlXG4gICAgLCBhZGhvY3M7XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMgJiYgJ3N0cmljdCcgaW4gb3B0aW9uc1xuICAgID8gb3B0aW9ucy5zdHJpY3RcbiAgICA6IHRoaXMuJF9fLnN0cmljdE1vZGU7XG5cbiAgaWYgKGFkaG9jKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgcGF0aCkge1xuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXG5cbiAgICBpZiAobnVsbCA9PT0gcGF0aCB8fCB1bmRlZmluZWQgPT09IHBhdGgpIHtcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XG4gICAgICBwYXRoID0gdmFsO1xuICAgICAgdmFsID0gX3RlbXA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHByZWZpeCA9IHZhbFxuICAgICAgICA/IHZhbCArICcuJ1xuICAgICAgICA6ICcnO1xuXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGgpXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgICAgICwgcGF0aHR5cGVcbiAgICAgICAgLCBrZXk7XG5cblxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBwYXRodHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHByZWZpeCArIGtleSk7XG4gICAgICAgIGlmIChudWxsICE9IHBhdGhba2V5XVxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXG4gICAgICAgICAgICAmJiBfLmlzUGxhaW5PYmplY3QocGF0aFtrZXldKVxuICAgICAgICAgICAgJiYgKCAhcGF0aFtrZXldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUocGF0aFtrZXldLmNvbnN0cnVjdG9yKSApXG4gICAgICAgICAgICAmJiAndmlydHVhbCcgIT09IHBhdGh0eXBlXG4gICAgICAgICAgICAmJiAhKCB0aGlzLiRfX3BhdGgoIHByZWZpeCArIGtleSApIGluc3RhbmNlb2YgTWl4ZWRTY2hlbWEgKVxuICAgICAgICAgICAgJiYgISggdGhpcy5zY2hlbWEucGF0aHNba2V5XSAmJiB0aGlzLnNjaGVtYS5wYXRoc1trZXldLm9wdGlvbnMucmVmIClcbiAgICAgICAgICApe1xuXG4gICAgICAgICAgdGhpcy5zZXQocGF0aFtrZXldLCBwcmVmaXggKyBrZXksIGNvbnN0cnVjdGluZyk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICBpZiAoJ3JlYWwnID09PSBwYXRodHlwZSB8fCAndmlydHVhbCcgPT09IHBhdGh0eXBlKSB7XG4gICAgICAgICAgICB0aGlzLnNldChwcmVmaXggKyBrZXksIHBhdGhba2V5XSwgY29uc3RydWN0aW5nKTtcblxuICAgICAgICAgIH0gZWxzZSBpZiAoJ3Rocm93JyA9PT0gc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpZWxkIGAnICsga2V5ICsgJ2AgaXMgbm90IGluIHNjaGVtYS4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgIT09IHBhdGhba2V5XSkge1xuICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxuXG4gIC8vIGVuc3VyZSBfc3RyaWN0IGlzIGhvbm9yZWQgZm9yIG9iaiBwcm9wc1xuICAvLyBkb2NzY2hlbWEgPSBuZXcgU2NoZW1hKHsgcGF0aDogeyBuZXN0OiAnc3RyaW5nJyB9fSlcbiAgLy8gZG9jLnNldCgncGF0aCcsIG9iaik7XG4gIHZhciBwYXRoVHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHBhdGgpO1xuICBpZiAoJ25lc3RlZCcgPT09IHBhdGhUeXBlICYmIHZhbCAmJiBfLmlzUGxhaW5PYmplY3QodmFsKSAmJlxuICAgICAgKCF2YWwuY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh2YWwuY29uc3RydWN0b3IpKSkge1xuICAgIGlmICghbWVyZ2UpIHRoaXMuc2V0VmFsdWUocGF0aCwgbnVsbCk7XG4gICAgdGhpcy5zZXQodmFsLCBwYXRoLCBjb25zdHJ1Y3RpbmcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNjaGVtYTtcbiAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICB2YXIgc3VicGF0aDtcblxuICBpZiAoJ2FkaG9jT3JVbmRlZmluZWQnID09PSBwYXRoVHlwZSAmJiBzdHJpY3QpIHtcblxuICAgIC8vIGNoZWNrIGZvciByb290cyB0aGF0IGFyZSBNaXhlZCB0eXBlc1xuICAgIHZhciBtaXhlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHN1YnBhdGggPSBwYXJ0cy5zbGljZSgwLCBpKzEpLmpvaW4oJy4nKTtcbiAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLnBhdGgoc3VicGF0aCk7XG4gICAgICBpZiAoc2NoZW1hIGluc3RhbmNlb2YgTWl4ZWRTY2hlbWEpIHtcbiAgICAgICAgLy8gYWxsb3cgY2hhbmdlcyB0byBzdWIgcGF0aHMgb2YgbWl4ZWQgdHlwZXNcbiAgICAgICAgbWl4ZWQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIW1peGVkKSB7XG4gICAgICBpZiAoJ3Rocm93JyA9PT0gc3RyaWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmllbGQgYCcgKyBwYXRoICsgJ2AgaXMgbm90IGluIHNjaGVtYS4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICB9IGVsc2UgaWYgKCd2aXJ0dWFsJyA9PT0gcGF0aFR5cGUpIHtcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKTtcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xuICB9XG5cbiAgdmFyIHBhdGhUb01hcms7XG5cbiAgLy8gV2hlbiB1c2luZyB0aGUgJHNldCBvcGVyYXRvciB0aGUgcGF0aCB0byB0aGUgZmllbGQgbXVzdCBhbHJlYWR5IGV4aXN0LlxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxuXG4gIGlmIChwYXJ0cy5sZW5ndGggPD0gMSkge1xuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9IGVsc2Uge1xuICAgIGZvciAoIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcbiAgICAgIGlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQoc3VicGF0aCkgLy8gZWFybGllciBwcmVmaXhlcyB0aGF0IGFyZSBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmtlZCBhcyBkaXJ0eSBoYXZlIHByZWNlZGVuY2VcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xuICAgICAgICBwYXRoVG9NYXJrID0gc3VicGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfVxuXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXG4gIHZhciBwcmlvclZhbCA9IGNvbnN0cnVjdGluZ1xuICAgID8gdW5kZWZpbmVkXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xuXG4gIGlmICghc2NoZW1hIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNob3VsZFNldCA9IHRoaXMuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XG4gIH0pO1xuXG4gIGlmIChzaG91bGRTZXQpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSBzaG91bGQgbWFyayB0aGlzIGNoYW5nZSBhcyBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXG4gICAgcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKSB7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xuXG4gIGlmICggdW5kZWZpbmVkID09PSB2YWwgJiYgIXRoaXMuaXNTZWxlY3RlZChwYXRoKSApIHtcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcbiAgICAvLyB2YWx1ZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IHZhbCAmJiBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSB7XG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF1dGlscy5kZWVwRXF1YWwodmFsLCBwcmlvclZhbCB8fCB0aGlzLmdldChwYXRoKSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8v0YLQtdGB0YIg0L3QtSDQv9GA0L7RhdC+0LTQuNGCINC40Lct0LfQsCDQvdCw0LvQuNGH0LjRjyDQu9C40YjQvdC10LPQviDQv9C+0LvRjyDQsiBzdGF0ZXMuZGVmYXVsdCAoY29tbWVudHMpXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XG4gIC8vY29uc29sZS5pbmZvKCBwYXRoLCBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICk7XG4gIC8vY29uc29sZS5sb2coIHRoaXMuJF9fLmFjdGl2ZVBhdGhzICk7XG5cbiAgLy8g0JrQvtCz0LTQsCDQvNGLINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INGC0LDQutC+0LUg0LbQtSDQt9C90LDRh9C10L3QuNC1INC60LDQuiBkZWZhdWx0XG4gIC8vINCd0LUg0L/QvtC90Y/RgtC90L4g0LfQsNGH0LXQvCDQvNCw0L3Qs9GD0YHRgiDQtdCz0L4g0L7QsdC90L7QstC70Y/Qu1xuICAvKiFcbiAgaWYgKCFjb25zdHJ1Y3RpbmcgJiZcbiAgICAgIG51bGwgIT0gdmFsICYmXG4gICAgICBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICYmXG4gICAgICB1dGlscy5kZWVwRXF1YWwodmFsLCBzY2hlbWEuZ2V0RGVmYXVsdCh0aGlzLCBjb25zdHJ1Y3RpbmcpKSApIHtcblxuICAgIC8vY29uc29sZS5sb2coIHBhdGhUb01hcmssIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkgKTtcblxuICAgIC8vIGEgcGF0aCB3aXRoIGEgZGVmYXVsdCB3YXMgJHVuc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAvLyBhbmQgdGhlIHVzZXIgaXMgc2V0dGluZyBpdCB0byB0aGUgc2FtZSB2YWx1ZSBhZ2FpblxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gICovXG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBhY3R1YWwgc2V0dGluZyBvZiB0aGUgdmFsdWUgYW5kIG1hcmtpbmcgdGhlIHBhdGggbW9kaWZpZWQgaWYgYXBwcm9wcmlhdGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXQgPSBmdW5jdGlvbiAoIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCApIHtcbiAgdmFyIHNob3VsZE1vZGlmeSA9IHRoaXMuJF9fc2hvdWxkTW9kaWZ5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKHNob3VsZE1vZGlmeSkge1xuICAgIHRoaXMubWFya01vZGlmaWVkKHBhdGhUb01hcmssIHZhbCk7XG4gIH1cblxuICB2YXIgb2JqID0gdGhpcy5fZG9jXG4gICAgLCBpID0gMFxuICAgICwgbCA9IHBhcnRzLmxlbmd0aDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaSArIDFcbiAgICAgICwgbGFzdCA9IG5leHQgPT09IGw7XG5cbiAgICBpZiAoIGxhc3QgKSB7XG4gICAgICBvYmpbcGFydHNbaV1dID0gdmFsO1xuXG4gICAgICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGgsIHZhbCApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbcGFydHNbaV1dICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmICdFbWJlZGRlZERvY3VtZW50JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IpICkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgQXJyYXkuaXNBcnJheShvYmpbcGFydHNbaV1dKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSByYXcgdmFsdWUgZnJvbSBhIHBhdGggKG5vIGdldHRlcnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUocGF0aCwgdGhpcy5fZG9jKTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJhdyB2YWx1ZSBmb3IgYSBwYXRoIChubyBjYXN0aW5nLCBzZXR0ZXJzLCB0cmFuc2Zvcm1hdGlvbnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWx1ZSkge1xuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGEgcGF0aC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBwYXRoXG4gKiAgICAgZG9jLmdldCgnYWdlJykgLy8gNDdcbiAqXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXG4gKiAgICAgZG9jLmdldCgnYWdlJywgU3RyaW5nKSAvLyBcIjQ3XCJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIG9uLXRoZS1mbHkgYXR0cmlidXRlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoLCB0eXBlKSB7XG4gIHZhciBhZGhvY3M7XG4gIGlmICh0eXBlKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgdmFyIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKSB8fCB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKVxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgLCBvYmogPSB0aGlzLl9kb2M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkID09PSBvYmogfHwgbnVsbCA9PT0gb2JqXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcbiAgfVxuXG4gIGlmIChzY2hlbWEpIHtcbiAgICBvYmogPSBzY2hlbWEuYXBwbHlHZXR0ZXJzKG9iaiwgdGhpcyk7XG4gIH1cblxuICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudEdldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGggKTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzY2hlbWF0eXBlIGZvciB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHNcbiAgICAsIGFkaG9jVHlwZSA9IGFkaG9jcyAmJiBhZGhvY3NbcGF0aF07XG5cbiAgaWYgKGFkaG9jVHlwZSkge1xuICAgIHJldHVybiBhZGhvY1R5cGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgdGhlIHBhdGggYXMgaGF2aW5nIHBlbmRpbmcgY2hhbmdlcyB0byB3cml0ZSB0byB0aGUgZGIuXG4gKlxuICogX1ZlcnkgaGVscGZ1bCB3aGVuIHVzaW5nIFtNaXhlZF0oLi9zY2hlbWF0eXBlcy5odG1sI21peGVkKSB0eXBlcy5fXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZXMgdG8gbWl4ZWQudHlwZSBhcmUgbm93IHBlcnNpc3RlZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIG1hcmsgbW9kaWZpZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG59O1xuXG4vKipcbiAqIENhdGNoZXMgZXJyb3JzIHRoYXQgb2NjdXIgZHVyaW5nIGV4ZWN1dGlvbiBvZiBgZm5gIGFuZCBzdG9yZXMgdGhlbSB0byBsYXRlciBiZSBwYXNzZWQgd2hlbiBgc2F2ZSgpYCBpcyBleGVjdXRlZC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXSB0aGUgc2NvcGUgd2l0aCB3aGljaCB0byBjYWxsIGZuXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fdHJ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3RyeSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgdmFyIHJlcztcbiAgdHJ5IHtcbiAgICBmbi5jYWxsKHNjb3BlKTtcbiAgICByZXMgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy4kX19lcnJvcihlKTtcbiAgICByZXMgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsaXN0IG9mIHBhdGhzIHRoYXQgaGF2ZSBiZWVuIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1vZGlmaWVkUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJlY3RNb2RpZmllZFBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG5cbiAgcmV0dXJuIGRpcmVjdE1vZGlmaWVkUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChsaXN0LCBwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHJldHVybiBsaXN0LmNvbmNhdChwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKGNoYWlucywgcGFydCwgaSkge1xuICAgICAgcmV0dXJuIGNoYWlucy5jb25jYXQocGFydHMuc2xpY2UoMCwgaSkuY29uY2F0KHBhcnQpLmpvaW4oJy4nKSk7XG4gICAgfSwgW10pKTtcbiAgfSwgW10pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhpcyBkb2N1bWVudCB3YXMgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogSWYgYHBhdGhgIGlzIGdpdmVuLCBjaGVja3MgaWYgYSBwYXRoIG9yIGFueSBmdWxsIHBhdGggY29udGFpbmluZyBgcGF0aGAgYXMgcGFydCBvZiBpdHMgcGF0aCBjaGFpbiBoYXMgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoKSAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMnKSAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpICAgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdIG9wdGlvbmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aFxuICAgID8gISF+dGhpcy5tb2RpZmllZFBhdGhzKCkuaW5kZXhPZihwYXRoKVxuICAgIDogdGhpcy4kX18uYWN0aXZlUGF0aHMuc29tZSgnbW9kaWZ5Jyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgcGF0aGAgd2FzIGRpcmVjdGx5IHNldCBhbmQgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0RpcmVjdE1vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBpbml0aWFsaXplZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0luaXQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBzZWxlY3RlZCBpbiB0aGUgc291cmNlIHF1ZXJ5IHdoaWNoIGluaXRpYWxpemVkIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgVGhpbmcuZmluZE9uZSgpLnNlbGVjdCgnbmFtZScpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ25hbWUnKSAvLyB0cnVlXG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ2FnZScpICAvLyBmYWxzZVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gaXNTZWxlY3RlZCAocGF0aCkge1xuICBpZiAodGhpcy4kX18uc2VsZWN0ZWQpIHtcblxuICAgIGlmICgnX2lkJyA9PT0gcGF0aCkge1xuICAgICAgcmV0dXJuIDAgIT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5zZWxlY3RlZClcbiAgICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICAgLCBpbmNsdXNpdmUgPSBmYWxzZVxuICAgICAgLCBjdXI7XG5cbiAgICBpZiAoMSA9PT0gaSAmJiAnX2lkJyA9PT0gcGF0aHNbMF0pIHtcbiAgICAgIC8vIG9ubHkgX2lkIHdhcyBzZWxlY3RlZC5cbiAgICAgIHJldHVybiAwID09PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY3VyID0gcGF0aHNbaV07XG4gICAgICBpZiAoJ19pZCcgPT09IGN1cikgY29udGludWU7XG4gICAgICBpbmNsdXNpdmUgPSAhISB0aGlzLiRfXy5zZWxlY3RlZFtjdXJdO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBhdGggaW4gdGhpcy4kX18uc2VsZWN0ZWQpIHtcbiAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgfVxuXG4gICAgaSA9IHBhdGhzLmxlbmd0aDtcbiAgICB2YXIgcGF0aERvdCA9IHBhdGggKyAnLic7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PT0gY3VyKSBjb250aW51ZTtcblxuICAgICAgaWYgKDAgPT09IGN1ci5pbmRleE9mKHBhdGhEb3QpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG5cbiAgICAgIGlmICgwID09PSBwYXRoRG90LmluZGV4T2YoY3VyICsgJy4nKSkge1xuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAhIGluY2x1c2l2ZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBFeGVjdXRlcyByZWdpc3RlcmVkIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIGBwcmVgIHNhdmUgYW5kIGlmIGEgdmFsaWRhdGlvbiBydWxlIGlzIHZpb2xhdGVkLCBbc2F2ZV0oI21vZGVsX01vZGVsLXNhdmUpIGlzIGFib3J0ZWQgYW5kIHRoZSBlcnJvciBpcyByZXR1cm5lZCB0byB5b3VyIGBjYWxsYmFja2AuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBpZiAoZXJyKSBoYW5kbGVFcnJvcihlcnIpO1xuICogICAgICAgZWxzZSAvLyB2YWxpZGF0aW9uIHBhc3NlZFxuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxlZCBhZnRlciB2YWxpZGF0aW9uIGNvbXBsZXRlcywgcGFzc2luZyBhbiBlcnJvciBpZiBvbmUgb2NjdXJyZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gb25seSB2YWxpZGF0ZSByZXF1aXJlZCBmaWVsZHMgd2hlbiBuZWNlc3NhcnlcbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUpLmZpbHRlcihmdW5jdGlvbiAocGF0aCkge1xuICAgIGlmICghc2VsZi5pc1NlbGVjdGVkKHBhdGgpICYmICFzZWxmLmlzTW9kaWZpZWQocGF0aCkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpKTtcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCkpO1xuXG4gIGlmICgwID09PSBwYXRocy5sZW5ndGgpIHtcbiAgICBjb21wbGV0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbGlkYXRpbmcgPSB7fVxuICAgICwgdG90YWwgPSAwO1xuXG4gIHBhdGhzLmZvckVhY2godmFsaWRhdGVQYXRoKTtcbiAgcmV0dXJuIHRoaXM7XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVQYXRoIChwYXRoKSB7XG4gICAgaWYgKHZhbGlkYXRpbmdbcGF0aF0pIHJldHVybjtcblxuICAgIHZhbGlkYXRpbmdbcGF0aF0gPSB0cnVlO1xuICAgIHRvdGFsKys7XG5cbiAgICB1dGlscy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKXtcbiAgICAgIHZhciBwID0gc2VsZi5zY2hlbWEucGF0aChwYXRoKTtcbiAgICAgIGlmICghcCkgcmV0dXJuIC0tdG90YWwgfHwgY29tcGxldGUoKTtcblxuICAgICAgdmFyIHZhbCA9IHNlbGYuZ2V0VmFsdWUocGF0aCk7XG4gICAgICBwLmRvVmFsaWRhdGUodmFsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBzZWxmLmludmFsaWRhdGUoXG4gICAgICAgICAgICAgIHBhdGhcbiAgICAgICAgICAgICwgZXJyXG4gICAgICAgICAgICAsIHVuZGVmaW5lZFxuICAgICAgICAgICAgLy8sIHRydWUgLy8gZW1iZWRkZWQgZG9jc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XG4gICAgICB9LCBzZWxmKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBsZXRlICgpIHtcbiAgICB2YXIgZXJyID0gc2VsZi4kX18udmFsaWRhdGlvbkVycm9yO1xuICAgIHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgICBjYiAmJiBjYihlcnIpO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cbiAqXG4gKiBUaGUgYGVycm9yTXNnYCBhcmd1bWVudCB3aWxsIGJlY29tZSB0aGUgbWVzc2FnZSBvZiB0aGUgYFZhbGlkYXRpb25FcnJvcmAuXG4gKlxuICogVGhlIGB2YWx1ZWAgYXJndW1lbnQgKGlmIHBhc3NlZCkgd2lsbCBiZSBhdmFpbGFibGUgdGhyb3VnaCB0aGUgYFZhbGlkYXRpb25FcnJvci52YWx1ZWAgcHJvcGVydHkuXG4gKlxuICogICAgIGRvYy5pbnZhbGlkYXRlKCdzaXplJywgJ211c3QgYmUgbGVzcyB0aGFuIDIwJywgMTQpO1xuXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAqICAgICAgIC8vIHByaW50c1xuICogICAgICAgeyBtZXNzYWdlOiAnVmFsaWRhdGlvbiBmYWlsZWQnLFxuICogICAgICAgICBuYW1lOiAnVmFsaWRhdGlvbkVycm9yJyxcbiAqICAgICAgICAgZXJyb3JzOlxuICogICAgICAgICAgeyBzaXplOlxuICogICAgICAgICAgICAgeyBtZXNzYWdlOiAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLFxuICogICAgICAgICAgICAgICBuYW1lOiAnVmFsaWRhdG9yRXJyb3InLFxuICogICAgICAgICAgICAgICBwYXRoOiAnc2l6ZScsXG4gKiAgICAgICAgICAgICAgIHR5cGU6ICd1c2VyIGRlZmluZWQnLFxuICogICAgICAgICAgICAgICB2YWx1ZTogMTQgfSB9IH1cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBmaWVsZCB0byBpbnZhbGlkYXRlXG4gKiBAcGFyYW0ge1N0cmluZ3xFcnJvcn0gZXJyb3JNc2cgdGhlIGVycm9yIHdoaWNoIHN0YXRlcyB0aGUgcmVhc29uIGBwYXRoYCB3YXMgaW52YWxpZFxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfE51bWJlcnxhbnl9IHZhbHVlIG9wdGlvbmFsIGludmFsaWQgdmFsdWVcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVycm9yTXNnLCB2YWx1ZSkge1xuICBpZiAoIXRoaXMuJF9fLnZhbGlkYXRpb25FcnJvcikge1xuICAgIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcyk7XG4gIH1cblxuICBpZiAoIWVycm9yTXNnIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgZXJyb3JNc2cpIHtcbiAgICBlcnJvck1zZyA9IG5ldyBWYWxpZGF0b3JFcnJvcihwYXRoLCBlcnJvck1zZywgJ3VzZXIgZGVmaW5lZCcsIHZhbHVlKTtcbiAgfVxuXG4gIGlmICh0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPT09IGVycm9yTXNnKSByZXR1cm47XG5cbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yLmVycm9yc1twYXRoXSA9IGVycm9yTXNnO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIGludGVybmFsIG1vZGlmaWVkIHN0YXRlIG9mIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqIEBtZXRob2QgJF9fcmVzZXRcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19yZXNldCA9IGZ1bmN0aW9uIHJlc2V0ICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gc2VsZi5nZXRWYWx1ZShpKTtcbiAgfSlcbiAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHZhbCAmJiB2YWwuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICB9KVxuICAuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykgY29udGludWU7XG4gICAgICBkb2MuJF9fcmVzZXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsZWFyICdtb2RpZnknKCdkaXJ0eScpIGNhY2hlXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLmNsZWFyKCdtb2RpZnknKTtcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmVycm9ycyA9IHVuZGVmaW5lZDtcbiAgLy9jb25zb2xlLmxvZyggc2VsZi4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUgKTtcbiAgLy9UT0RPOiDRgtGD0YJcbiAgdGhpcy5zY2hlbWEucmVxdWlyZWRQYXRocygpLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKHBhdGgpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIGRpcnR5IHBhdGhzIC8gdmFscy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGlydHlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBhbGwgPSB0aGlzLiRfXy5hY3RpdmVQYXRocy5tYXAoJ21vZGlmeScsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxuICAgICAgICAgICAsIHZhbHVlOiBzZWxmLmdldFZhbHVlKCBwYXRoIClcbiAgICAgICAgICAgLCBzY2hlbWE6IHNlbGYuJF9fcGF0aCggcGF0aCApIH07XG4gIH0pO1xuXG4gIC8vIFNvcnQgZGlydHkgcGF0aHMgaW4gYSBmbGF0IGhpZXJhcmNoeS5cbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gKGEucGF0aCA8IGIucGF0aCA/IC0xIDogKGEucGF0aCA+IGIucGF0aCA/IDEgOiAwKSk7XG4gIH0pO1xuXG4gIC8vIElnbm9yZSBcImZvby5hXCIgaWYgXCJmb29cIiBpcyBkaXJ0eSBhbHJlYWR5LlxuICB2YXIgbWluaW1hbCA9IFtdXG4gICAgLCBsYXN0UGF0aFxuICAgICwgdG9wO1xuXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XG4gICAgbGFzdFBhdGggPSBpdGVtLnBhdGggKyAnLic7XG4gICAgbWluaW1hbC5wdXNoKGl0ZW0pO1xuICAgIHRvcCA9IGl0ZW07XG4gIH0pO1xuXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcbiAgcmV0dXJuIG1pbmltYWw7XG59O1xuXG4vKiFcbiAqIENvbXBpbGVzIHNjaGVtYXMuXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHNlbGYsIHRyZWUsIHByb3RvLCBwcmVmaXgpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBsaW1iXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgbGltYiA9IHRyZWVba2V5XTtcblxuICAgIGRlZmluZShzZWxmXG4gICAgICAgICwga2V5XG4gICAgICAgICwgKCgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGxpbWIuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAmJiAoIWxpbWIudHlwZSB8fCBsaW1iLnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgID8gbGltYlxuICAgICAgICAgICAgICAgOiBudWxsKVxuICAgICAgICAsIHByb3RvXG4gICAgICAgICwgcHJlZml4XG4gICAgICAgICwga2V5cyk7XG4gIH1cbn1cblxuLy8gZ2V0cyBkZXNjcmlwdG9ycyBmb3IgYWxsIHByb3BlcnRpZXMgb2YgYG9iamVjdGBcbi8vIG1ha2VzIGFsbCBwcm9wZXJ0aWVzIG5vbi1lbnVtZXJhYmxlIHRvIG1hdGNoIHByZXZpb3VzIGJlaGF2aW9yIHRvICMyMjExXG5mdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgcmVzdWx0W2tleV0uZW51bWVyYWJsZSA9IGZhbHNlO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiFcbiAqIERlZmluZXMgdGhlIGFjY2Vzc29yIG5hbWVkIHByb3Agb24gdGhlIGluY29taW5nIHByb3RvdHlwZS5cbiAqINGC0LDQvCDQttC1LCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LAg0YHQtNC10LvQsNC10Lwg0L3QsNCx0LvRjtC00LDQtdC80YvQvNC4XG4gKi9cbmZ1bmN0aW9uIGRlZmluZSAoc2VsZiwgcHJvcCwgc3VicHJvcHMsIHByb3RvdHlwZSwgcHJlZml4LCBrZXlzKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIHBhdGggPSAocHJlZml4ID8gcHJlZml4ICsgJy4nIDogJycpICsgcHJvcDtcblxuICBpZiAoc3VicHJvcHMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnMgPSB7fTtcblxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSBzY29wZSBmb3IgbmVzdGVkIGdldHRlcnMvc2V0dGVyc1xuICAgICAgICAgICAgaWYgKCFwcmVmaXgpIG5lc3RlZC4kX18uc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBzaGFkb3cgaW5oZXJpdGVkIGdldHRlcnMgZnJvbSBzdWItb2JqZWN0cyBzb1xuICAgICAgICAgICAgLy8gdGhpbmcubmVzdGVkLm5lc3RlZC5uZXN0ZWQuLi4gZG9lc24ndCBvY2N1ciAoZ2gtMzY2KVxuICAgICAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgICAgICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgLy8gb3Zlci13cml0ZSB0aGUgcGFyZW50cyBnZXR0ZXIgd2l0aG91dCB0cmlnZ2VyaW5nIGl0XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXN0ZWQsIGtleXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlICAgLy8gSXQgZG9lc24ndCBzaG93IHVwLlxuICAgICAgICAgICAgICAgICwgd3JpdGFibGU6IHRydWUgICAgICAvLyBXZSBjYW4gc2V0IGl0IGxhdGVyLlxuICAgICAgICAgICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlICAvLyBXZSBjYW4gT2JqZWN0LmRlZmluZVByb3BlcnR5IGFnYWluLlxuICAgICAgICAgICAgICAgICwgdmFsdWU6IHVuZGVmaW5lZCAgICAvLyBJdCBzaGFkb3dzIGl0cyBwYXJlbnQuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXN0ZWQudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChwYXRoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbXBpbGUoIHNlbGYsIHN1YnByb3BzLCBuZXN0ZWQsIHBhdGggKTtcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnNbcGF0aF0gPSBuZXN0ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuJF9fLmdldHRlcnNbcGF0aF07XG4gICAgICAgIH1cbiAgICAgICwgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgRG9jdW1lbnQpIHYgPSB2LnRvT2JqZWN0KCk7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLiRfXy5zY29wZSB8fCB0aGlzKS5zZXQoIHBhdGgsIHYgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoICkgeyByZXR1cm4gdGhpcy5nZXQuY2FsbCh0aGlzLiRfXy5zY29wZSB8fCB0aGlzLCBwYXRoKTsgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzLnNldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgsIHYpOyB9XG4gICAgfSk7XG4gIH1cblxuICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHByb3RvdHlwZSwgcHJvcCwgcHJlZml4LCBwYXRoICk7XG4gIC8vc2VsZi5hZGFwdGVySG9va3MuZG9jdW1lbnREZWZpbmVQcm9wZXJ0eS5jYWxsKCBzZWxmLCBzZWxmLCBwYXRoLCBwcm90b3R5cGUgKTtcbn1cblxuLyoqXG4gKiBBc3NpZ25zL2NvbXBpbGVzIGBzY2hlbWFgIGludG8gdGhpcyBkb2N1bWVudHMgcHJvdG90eXBlLlxuICpcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zZXRTY2hlbWFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hID0gZnVuY3Rpb24gKCBzY2hlbWEgKSB7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICBjb21waWxlKCB0aGlzLCBzY2hlbWEudHJlZSwgdGhpcyApO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHN1YmRvY3MgKGJ5IGJmcylcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QWxsU3ViZG9jc1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBbGxTdWJkb2NzID0gZnVuY3Rpb24gKCkge1xuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xuICBFbWJlZGRlZCA9IEVtYmVkZGVkIHx8IHJlcXVpcmUoJy4vdHlwZXMvZW1iZWRkZWQnKTtcblxuICBmdW5jdGlvbiBkb2NSZWR1Y2VyKHNlZWQsIHBhdGgpIHtcbiAgICB2YXIgdmFsID0gdGhpc1twYXRoXTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaCh2YWwpO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5KXtcbiAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uIF9kb2NSZWR1Y2UoZG9jKSB7XG5cbiAgICAgICAgaWYgKCFkb2MgfHwgIWRvYy5fZG9jKSByZXR1cm47XG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKGRvYyk7XG5cbiAgICAgICAgc2VlZCA9IE9iamVjdC5rZXlzKGRvYy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKGRvYy5fZG9jKSwgc2VlZCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHNlZWQ7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKHRoaXMpLCBbXSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBnZW5lcmljIHNhdmUgc3R1ZmYuXG4gKiB0byBzb2x2ZSAjMTQ0NiB1c2UgdXNlIGhpZXJhcmNoeSBpbnN0ZWFkIG9mIGhvb2tzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3ByZXNhdmVWYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wcmVzYXZlVmFsaWRhdGUgPSBmdW5jdGlvbiAkX19wcmVzYXZlVmFsaWRhdGUoKSB7XG4gIC8vIGlmIGFueSBkb2Muc2V0KCkgY2FsbHMgZmFpbGVkXG5cbiAgdmFyIGRvY3MgPSB0aGlzLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlKCk7XG5cbiAgdmFyIGUyID0gZG9jcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgIHJldHVybiBkb2MuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIH0pO1xuICB2YXIgZTEgPSBbdGhpcy4kX18uc2F2ZUVycm9yXS5jb25jYXQoZTIpO1xuICB2YXIgZXJyID0gZTEuZmlsdGVyKGZ1bmN0aW9uICh4KSB7cmV0dXJuIHh9KVswXTtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gbnVsbDtcblxuICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIHBhdGggdGhhdCB3ZXJlIGNoYW5nZWQgYW5kIGFyZSBhcnJheXNcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG5cbiAgLy8gdmFsaWRhdGUgYWxsIGRvY3VtZW50IGFycmF5cy5cbiAgcmV0dXJuIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gICAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUoaSk7XG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XG4gICAgfSkucmVkdWNlKGZ1bmN0aW9uKHNlZWQsIGFycmF5KSB7XG4gICAgICByZXR1cm4gc2VlZC5jb25jYXQoYXJyYXkpO1xuICAgIH0sIFtdKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKGRvYykge3JldHVybiBkb2N9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGVycm9yXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZXJyb3JcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gIHRoaXMuJF9fLnNhdmVFcnJvciA9IGVycjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByb2R1Y2VzIGEgc3BlY2lhbCBxdWVyeSBkb2N1bWVudCBvZiB0aGUgbW9kaWZpZWQgcHJvcGVydGllcyB1c2VkIGluIHVwZGF0ZXMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2RlbHRhXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RlbHRhID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZGlydHkgPSB0aGlzLiRfX2RpcnR5KCk7XG5cbiAgdmFyIGRlbHRhID0ge31cbiAgICAsIGxlbiA9IGRpcnR5Lmxlbmd0aFxuICAgICwgZCA9IDA7XG5cbiAgZm9yICg7IGQgPCBsZW47ICsrZCkge1xuICAgIHZhciBkYXRhID0gZGlydHlbIGQgXTtcbiAgICB2YXIgdmFsdWUgPSBkYXRhLnZhbHVlO1xuXG4gICAgdmFsdWUgPSB1dGlscy5jbG9uZSh2YWx1ZSwgeyBkZXBvcHVsYXRlOiAxIH0pO1xuICAgIGRlbHRhWyBkYXRhLnBhdGggXSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIGRlbHRhO1xufTtcblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2hhbmRsZVNhdmUgPSBmdW5jdGlvbigpe1xuICAvLyDQn9C+0LvRg9GH0LDQtdC8INGA0LXRgdGD0YDRgSDQutC+0LvQu9C10LrRhtC40LgsINC60YPQtNCwINCx0YPQtNC10Lwg0YHQvtGF0YDQsNC90Y/RgtGMINC00LDQvdC90YvQtVxuICB2YXIgcmVzb3VyY2U7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmVzb3VyY2UgPSB0aGlzLmNvbGxlY3Rpb24uYXBpO1xuICB9XG5cbiAgdmFyIGlubmVyUHJvbWlzZSA9IG5ldyBEZWZlcnJlZCgpO1xuXG4gIGlmICggdGhpcy5pc05ldyApIHtcbiAgICAvLyBzZW5kIGVudGlyZSBkb2NcblxuICAgIHZhciB0b09iamVjdE9wdGlvbnMgPSB7fTtcbiAgICBpZiAoIHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdC5yZXRhaW5LZXlPcmRlciApIHtcbiAgICAgIHRvT2JqZWN0T3B0aW9ucy5yZXRhaW5LZXlPcmRlciA9IHRydWU7XG4gICAgfVxuXG4gICAgdG9PYmplY3RPcHRpb25zLmRlcG9wdWxhdGUgPSAxO1xuICAgIHZhciBvYmogPSB0aGlzLnRvT2JqZWN0KCB0b09iamVjdE9wdGlvbnMgKTtcblxuICAgIGlmICggKCBvYmogfHwge30gKS5oYXNPd25Qcm9wZXJ0eSgnX2lkJykgPT09IGZhbHNlICkge1xuICAgICAgLy8gZG9jdW1lbnRzIG11c3QgaGF2ZSBhbiBfaWQgZWxzZSBtb25nb29zZSB3b24ndCBrbm93XG4gICAgICAvLyB3aGF0IHRvIHVwZGF0ZSBsYXRlciBpZiBtb3JlIGNoYW5nZXMgYXJlIG1hZGUuIHRoZSB1c2VyXG4gICAgICAvLyB3b3VsZG4ndCBrbm93IHdoYXQgX2lkIHdhcyBnZW5lcmF0ZWQgYnkgbW9uZ29kYiBlaXRoZXJcbiAgICAgIC8vIG5vciB3b3VsZCB0aGUgT2JqZWN0SWQgZ2VuZXJhdGVkIG15IG1vbmdvZGIgbmVjZXNzYXJpbHlcbiAgICAgIC8vIG1hdGNoIHRoZSBzY2hlbWEgZGVmaW5pdGlvbi5cbiAgICAgIGlubmVyUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdkb2N1bWVudCBtdXN0IGhhdmUgYW4gX2lkIGJlZm9yZSBzYXZpbmcnKSk7XG4gICAgICByZXR1cm4gaW5uZXJQcm9taXNlO1xuICAgIH1cblxuICAgIC8vINCR0LXQtyDRgNC10YHRg9GA0YHQsCDQvNC+0LbQvdC+INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOICjQv9C+0LTQs9C+0YLQvtCy0LjRgtGMINC00LDQvdC90YvQtSDQuiDQvtGC0L/RgNCw0LLQutC1KSwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuFxuICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggb2JqICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc291cmNlLmNyZWF0ZSggb2JqICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgIH1cblxuICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgICAvLyBNYWtlIGl0IHBvc3NpYmxlIHRvIHJldHJ5IHRoZSBpbnNlcnRcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHRyZWF0IGl0IGFzIGEgbmV3IG9iamVjdCBvbiBlcnJvcixcbiAgICAvLyBzaW5jZSBpdCBhbHJlYWR5IGV4aXN0c1xuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IGZhbHNlO1xuXG4gICAgdmFyIGRlbHRhID0gdGhpcy4kX19kZWx0YSgpO1xuXG4gICAgaWYgKCAhXy5pc0VtcHR5KCBkZWx0YSApICkge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgLy8g0JHQtdC3INGA0LXRgdGD0YDRgdCwINC80L7QttC90L4g0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4gKNC/0L7QtNCz0L7RgtC+0LLQuNGC0Ywg0LTQsNC90L3Ri9C1INC6INC+0YLQv9GA0LDQstC60LUpLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggZGVsdGEgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlKCB0aGlzLmlkICkudXBkYXRlKCBkZWx0YSApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIFNhdmVzIHRoaXMgZG9jdW1lbnQuXG4gKlxuICog0JXRgdC70Lgg0LDQv9C4LdC60LvQuNC10L3RgtCwINC90LXRgiDQuCDQtNC+0LrRg9C80LXQvdGCINC90L7QstGL0LksINGC0L4g0LIg0LrQvtC70LHRjdC60LUg0LHRg9C00LXRgiBwbGFpbiBvYmplY3Qg0YHQviDQstGB0LXQvNC4INC00LDQvdC90YvQvNC4INC00LvRjyDRgdC+0YXRgNCw0L3QtdC90LjRjyDQvdCwINGB0LXRgNCy0LXRgC5cbiAqINCV0YHQu9C4INCw0L/QuC3QutC70LjQtdC90YLQsCDQvdC10YIg0Lgg0LTQvtC60YPQvNC10L3RgiDRgdGC0LDRgNC+0LUsINGC0L4g0LIg0LrQvtC70LHRjdC60LUg0LHRg9C00LXRgiBwbGFpbiBvYmplY3Qg0YLQvtC70YzQutC+INGBINC40LfQvNC10L3RkdC90L3Ri9C80Lgg0LTQsNC90L3Ri9C80LguXG4gKlxuICog0JXRgdC70Lgg0LDQv9C4LdC60LvQuNC10L3RgiDQtdGB0YLRjCDQuCDQvdC1INCy0LDQttC90L4g0L3QvtCy0YvQuSDQtNC+0LrRg9C80LXQvdGCINC40LvQuCDRgdGC0LDRgNGL0LksINCyINC60L7Qu9Cx0Y3QutC1INCy0YHQtdCz0LTQsCDQsdGD0LTQtdGCINC+0YLQstC10YIg0L7RgiByZXN0LWFwaS1jbGllbnRcbiAqXG4gKiAvLyB0b2RvOiDQtNC+0L7Qv9C40YHQsNGC0Ywg0Y3RgtC+INC00LXQu9C+XG4gKiDQodC10LnRh9Cw0YEg0LXRgdC70Lgg0LXRgdGC0Ywg0YDQtdGB0YPRgNGBICjQsNC/0Lgg0LrQu9C40LXQvdGCKSwg0YLQvjpcbiAqINC10YHQu9C4INC00L7QutGD0LzQtdC90YIg0L3QvtCy0YvQuSwg0YLQviDQv9C+0YHQu9C1INC+0YLQstC10YLQsCDRgdC+0LfQtNCw0YHRgtGB0Y8g0L3QvtCy0YvQuSDQtNC+0LrRg9C80LXQvdGCINC90LAg0L7RgdC90L7QstC1INC+0YLQstC10YLQsCwg0Lgg0L7QsdC+0LLQu9GP0LXRgtGB0Y8hISEgKNC/0L7Qu9GD0YfRiNC1INC+0LHRitGP0YHQvdC40YLRjCDRjdGC0L4pINGB0YHRi9C70LrQsCAoaWQpINCy0L3Rg9GC0YDQuCDQutC+0LvQu9C10LrRhtC40LhcbiAqINC10YHQu9C4INC00L7QutGD0LzQtdC90YIg0YHRgtCw0YDRi9C5LCDRgtC+INC/0L7RgdC70LUg0L7RgtCy0LXRgtCwINC40YnQtdGC0YHRjyDRjdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQg0Lgg0LTQtdC70LDQtdGC0YHRjyBzZXRcbiAqXG4gKlxuICogQGV4YW1wbGU6XG4gKlxuICogICAgIHByb2R1Y3Quc29sZCA9IERhdGUubm93KCk7XG4gKiAgICAgcHJvZHVjdC5zYXZlKGZ1bmN0aW9uIChlcnIsIHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XG4gKiAgICAgICBpZiAoZXJyKSAuLlxuICogICAgIH0pXG4gKlxuICogQGRlc2NyaXB0aW9uIFRoZSBjYWxsYmFjayB3aWxsIHJlY2VpdmUgdGhyZWUgcGFyYW1ldGVycywgYGVycmAgaWYgYW4gZXJyb3Igb2NjdXJyZWQsIGBwcm9kdWN0YCB3aGljaCBpcyB0aGUgc2F2ZWQgYHByb2R1Y3RgLCBhbmQgYG51bWJlckFmZmVjdGVkYCB3aGljaCB3aWxsIGJlIDEgd2hlbiB0aGUgZG9jdW1lbnQgd2FzIGZvdW5kIGFuZCB1cGRhdGVkIGluIHRoZSBkYXRhYmFzZSwgb3RoZXJ3aXNlIDAuXG4gKlxuICogVGhlIGBmbmAgY2FsbGJhY2sgaXMgb3B0aW9uYWwuIElmIG5vIGBmbmAgaXMgcGFzc2VkIGFuZCB2YWxpZGF0aW9uIGZhaWxzLCB0aGUgdmFsaWRhdGlvbiBlcnJvciB3aWxsIGJlIGVtaXR0ZWQgb24gdGhlIGNvbm5lY3Rpb24gdXNlZCB0byBjcmVhdGUgdGhpcyBtb2RlbC5cbiAqIEBleGFtcGxlOlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICB2YXIgUHJvZHVjdCA9IHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbignUHJvZHVjdCcsIHNjaGVtYSApO1xuICogICAgIHZhciBkb2MgPSBQcm9kdWN0LmFkZCgpO1xuICpcbiAqICAgICAvLyB0b2RvOiDRgNC10LDQu9C40LfQvtCy0LDRgtGMINGN0YLQvlxuICogICAgIGRvYy5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEFzIGFuIGV4dHJhIG1lYXN1cmUgb2YgZmxvdyBjb250cm9sLCBzYXZlIHdpbGwgcmV0dXJuIGEgUHJvbWlzZSAoYm91bmQgdG8gYGZuYCBpZiBwYXNzZWQpIHNvIGl0IGNvdWxkIGJlIGNoYWluZWQsIG9yIGhvb2sgdG8gcmVjaXZlIGVycm9yc1xuICogQGV4YW1wbGU6XG4gKiAgICAgcHJvZHVjdC5zYXZlKCkuZG9uZShmdW5jdGlvbiggcHJvZHVjdCApe1xuICogICAgICAgIC4uLlxuICogICAgIH0pLmZhaWwoZnVuY3Rpb24oIGVyciApe1xuICogICAgICAgIGFzc2VydC5vayggZXJyIClcbiAqICAgICB9KVxuICpcbiAqIEBkZXNjcmlwdGlvbiByZXRhaW5LZXlPcmRlciAtIGtlZXAgdGhlIGtleSBvcmRlciBvZiB0aGUgZG9jIHNhdmVcbiAqIEBleGFtcGxlOlxuICogICAgIHZhciBDaGVja2luID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBkYXRlOiBEYXRlLFxuICogICAgICAgbG9jYXRpb246IHtcbiAqICAgICAgICAgbGF0OiBOdW1iZXIsXG4gKiAgICAgICAgIGxuZzogTnVtYmVyXG4gKiAgICAgICB9XG4gKiAgICAgfSwge1xuICogICAgICAgdG9PYmplY3Q6IHtcbiAqICAgICAgICAgcmV0YWluS2V5T3JkZXI6IHRydWVcbiAqICAgICAgIH1cbiAqICAgICB9KTtcbiAqICAgICB2YXIgQ2hlY2tpbnMgPSBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oJ1Byb2R1Y3QnLCBzY2hlbWEgKTtcbiAqICAgICB2YXIgZG9jID0gQ2hlY2tpbnMuYWRkKCk7XG4gKlxuICogICAgIGRvYy5zYXZlKCkuZG9uZShmdW5jdGlvbiggb2JqVG9TYXZlICl7XG4gKiAgICAgICAvLyBpbiBgb2JqVG9TYXZlYCBmb2xsb3dlZCB0aGUgY29ycmVjdCBvcmRlciBvZiB0aGUga2V5cyBvZiBkb2NcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKCBvYmplY3QgKX0gW2RvbmVdIG9wdGlvbmFsIGNhbGxiYWNrLCBvYmplY3QgLSBvYmpUb1NhdmVcbiAqIEByZXR1cm4ge0RlZmVycmVkfSBEZWZlcnJlZFxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgbWlkZGxld2FyZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9taWRkbGV3YXJlLmh0bWxcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoIGRvbmUgKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZpbmFsUHJvbWlzZSA9IG5ldyBEZWZlcnJlZCgpLmRvbmUoIGRvbmUgKTtcblxuICAvLyDQodC+0YXRgNCw0L3Rj9GC0Ywg0LTQvtC60YPQvNC10L3RgiDQvNC+0LbQvdC+INGC0L7Qu9GM0LrQviDQtdGB0LvQuCDQvtC9INC90LDRhdC+0LTQuNGC0YHRjyDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgaWYgKCAhdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggYXJndW1lbnRzICk7XG4gICAgY29uc29sZS5lcnJvcignRG9jdW1lbnQuc2F2ZSBhcGkgaGFuZGxlIGlzIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIHByZVNhdmUgZXJyb3JzICjRgtC+0YfQviDQt9C90LDRjiwg0YfRgtC+INC+0L3QsCDQv9GA0L7QstC10YDRj9C10YIg0L7RiNC40LHQutC4INCyINC80LDRgdGB0LjQstCw0YUgKENhc3RFcnJvcikpXG4gIHZhciBwcmVTYXZlRXJyID0gc2VsZi4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgaWYgKCBwcmVTYXZlRXJyICkge1xuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIHByZVNhdmVFcnIgKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gVmFsaWRhdGVcbiAgdmFyIHAwID0gbmV3IERlZmVycmVkKCk7XG4gIHNlbGYudmFsaWRhdGUoZnVuY3Rpb24oIGVyciApe1xuICAgIGlmICggZXJyICl7XG4gICAgICBwMC5yZWplY3QoIGVyciApO1xuICAgICAgZmluYWxQcm9taXNlLnJlamVjdCggZXJyICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHAwLnJlc29sdmUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vINCh0L3QsNGH0LDQu9CwINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQstGB0LUg0L/QvtC00LTQvtC60YPQvNC10L3RgtGLINC4INGB0LTQtdC70LDRgtGMIHJlc29sdmUhISFcbiAgLy8gKNGC0YPRgiDQv9GB0LXQstC00L7RgdC+0YXRgNCw0L3QtdC90LjQtSDRgdC80L7RgtGA0LXRgtGMIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgKVxuICAvLyBDYWxsIHNhdmUgaG9va3Mgb24gc3ViZG9jc1xuICB2YXIgc3ViRG9jcyA9IHNlbGYuJF9fZ2V0QWxsU3ViZG9jcygpO1xuICB2YXIgd2hlbkNvbmQgPSBzdWJEb2NzLm1hcChmdW5jdGlvbiAoZCkge3JldHVybiBkLnNhdmUoKTt9KTtcblxuICB3aGVuQ29uZC5wdXNoKCBwMCApO1xuXG4gIC8vINCi0LDQuiDQvNGLINC/0LXRgNC10LTQsNGR0Lwg0LzQsNGB0YHQuNCyIHByb21pc2Ug0YPRgdC70L7QstC40LlcbiAgdmFyIHAxID0gRGVmZXJyZWQud2hlbi5hcHBseSggRGVmZXJyZWQsIHdoZW5Db25kICk7XG5cbiAgcDEuZmFpbChmdW5jdGlvbiAoIGVyciApIHtcbiAgICAvLyBJZiB0aGUgaW5pdGlhbCBpbnNlcnQgZmFpbHMgcHJvdmlkZSBhIHNlY29uZCBjaGFuY2UuXG4gICAgLy8gKElmIHdlIGRpZCB0aGlzIGFsbCB0aGUgdGltZSB3ZSB3b3VsZCBicmVhayB1cGRhdGVzKVxuICAgIGlmIChzZWxmLiRfXy5pbnNlcnRpbmcpIHtcbiAgICAgIHNlbGYuaXNOZXcgPSB0cnVlO1xuICAgICAgc2VsZi5lbWl0KCdpc05ldycsIHRydWUpO1xuICAgIH1cbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgfSk7XG5cbiAgLy8gSGFuZGxlIHNhdmUgYW5kIHJlc3VsdHNcbiAgcDEuZG9uZShmdW5jdGlvbigpe1xuICAgIHNlbGYuJF9faGFuZGxlU2F2ZSgpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgIC8vdG9kbzog0L3QsNC00L4g0L/RgNC+0LLQtdGA0Y/RgtGMLCDQvdGD0LbQvdC+INC70Lgg0L/QuNGB0LDRgtGMINC/0YDQvtCy0LXRgNC60YMg0L3QsCDQvdCw0LvQuNGH0LjQtSDRgNC10YHRg9GA0YHQsCwg0LXRgdC70Lgg0L7QvSDQtdGB0YLRjCAtINC+0YLQtNCw0LLQsNGC0Ywgc2VsZiwg0LXRgdC70Lgg0L3QtdGCLCDQvtGC0LTQsNCy0LDRgtGMINC60LDQuiDRgdC10LnRh9Cw0YEg0L3QsNC/0LjRgdCw0L3QvlxuICAgICAgLy8g0LLQvtC30LzQvtC20L3QviDQuCDRgdC60L7RgNC10LUg0LLRgdC10LPQviwgYXBpINC4INGC0LDQuiDQvtGC0LTQsNGR0YIg0LLRgdGRINCyINC/0YDQsNCy0LjQu9GM0L3QvtC8INC/0L7RgNGP0LTQutC1IChkb2MsIG1ldGEsIGpxeGhyKVxuICAgICAgZmluYWxQcm9taXNlLnJlc29sdmUuYXBwbHkoIGZpbmFsUHJvbWlzZSwgYXJndW1lbnRzICk7XG5cbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0LmFwcGx5KCBmaW5hbFByb21pc2UsIGFyZ3VtZW50cyApO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gZmluYWxQcm9taXNlO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIHRoaXMgZG9jdW1lbnQgaW50byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0LCByZWFkeSBmb3Igc3RvcmFnZSBpbiBNb25nb0RCLlxuICpcbiAqIEJ1ZmZlcnMgYXJlIGNvbnZlcnRlZCB0byBpbnN0YW5jZXMgb2YgW21vbmdvZGIuQmluYXJ5XShodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sKSBmb3IgcHJvcGVyIHN0b3JhZ2UuXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBgZ2V0dGVyc2AgYXBwbHkgYWxsIGdldHRlcnMgKHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVycylcbiAqIC0gYHZpcnR1YWxzYCBhcHBseSB2aXJ0dWFsIGdldHRlcnMgKGNhbiBvdmVycmlkZSBgZ2V0dGVyc2Agb3B0aW9uKVxuICogLSBgbWluaW1pemVgIHJlbW92ZSBlbXB0eSBvYmplY3RzIChkZWZhdWx0cyB0byB0cnVlKVxuICogLSBgdHJhbnNmb3JtYCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB0byB0aGUgcmVzdWx0aW5nIGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmdcbiAqXG4gKiAjIyMjR2V0dGVycy9WaXJ0dWFsc1xuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyBwYXRoIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSwgdmlydHVhbHM6IGZhbHNlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIEV4YW1wbGUgb2YgYXBwbHlpbmcgYm90aCBwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSB9KVxuICpcbiAqIFRvIGFwcGx5IHRoZXNlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9PYmplY3RgIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9PYmplY3QnLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogIyMjI1RyYW5zZm9ybVxuICpcbiAqIFdlIG1heSBuZWVkIHRvIHBlcmZvcm0gYSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdCBiYXNlZCBvbiBzb21lIGNyaXRlcmlhLCBzYXkgdG8gcmVtb3ZlIHNvbWUgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIG9yIHJldHVybiBhIGN1c3RvbSBvYmplY3QuIEluIHRoaXMgY2FzZSB3ZSBzZXQgdGhlIG9wdGlvbmFsIGB0cmFuc2Zvcm1gIGZ1bmN0aW9uLlxuICpcbiAqIFRyYW5zZm9ybSBmdW5jdGlvbnMgcmVjZWl2ZSB0aHJlZSBhcmd1bWVudHNcbiAqXG4gKiAgICAgZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7fVxuICpcbiAqIC0gYGRvY2AgVGhlIG1vbmdvb3NlIGRvY3VtZW50IHdoaWNoIGlzIGJlaW5nIGNvbnZlcnRlZFxuICogLSBgcmV0YCBUaGUgcGxhaW4gb2JqZWN0IHJlcHJlc2VudGF0aW9uIHdoaWNoIGhhcyBiZWVuIGNvbnZlcnRlZFxuICogLSBgb3B0aW9uc2AgVGhlIG9wdGlvbnMgaW4gdXNlIChlaXRoZXIgc2NoZW1hIG9wdGlvbnMgb3IgdGhlIG9wdGlvbnMgcGFzc2VkIGlubGluZSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBzcGVjaWZ5IHRoZSB0cmFuc2Zvcm0gc2NoZW1hIG9wdGlvblxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICAvLyByZW1vdmUgdGhlIF9pZCBvZiBldmVyeSBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZXN1bHRcbiAqICAgICAgIGRlbGV0ZSByZXQuX2lkO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBXaXRoIHRyYW5zZm9ybWF0aW9ucyB3ZSBjYW4gZG8gYSBsb3QgbW9yZSB0aGFuIHJlbW92ZSBwcm9wZXJ0aWVzLiBXZSBjYW4gZXZlbiByZXR1cm4gY29tcGxldGVseSBuZXcgY3VzdG9taXplZCBvYmplY3RzOlxuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgbW92aWU6IHJldC5uYW1lIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbW92aWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIF9Ob3RlOiBpZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgaWdub3JlZC5fXG4gKlxuICogVHJhbnNmb3JtYXRpb25zIG1heSBhbHNvIGJlIGFwcGxpZWQgaW5saW5lLCBvdmVycmlkZGluZyBhbnkgdHJhbnNmb3JtIHNldCBpbiB0aGUgb3B0aW9uczpcbiAqXG4gKiAgICAgZnVuY3Rpb24geGZvcm0gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBpbmxpbmU6IHJldC5uYW1lLCBjdXN0b206IHRydWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gcGFzcyB0aGUgdHJhbnNmb3JtIGFzIGFuIGlubGluZSBvcHRpb25cbiAqICAgICBkb2MudG9PYmplY3QoeyB0cmFuc2Zvcm06IHhmb3JtIH0pOyAvLyB7IGlubGluZTogJ1dyZWNrLWl0IFJhbHBoJywgY3VzdG9tOiB0cnVlIH1cbiAqXG4gKiBfTm90ZTogaWYgeW91IGNhbGwgYHRvT2JqZWN0YCBhbmQgcGFzcyBhbnkgb3B0aW9ucywgdGhlIHRyYW5zZm9ybSBkZWNsYXJlZCBpbiB5b3VyIHNjaGVtYSBvcHRpb25zIHdpbGwgX19ub3RfXyBiZSBhcHBsaWVkLiBUbyBmb3JjZSBpdHMgYXBwbGljYXRpb24gcGFzcyBgdHJhbnNmb3JtOiB0cnVlYF9cbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC5oaWRlID0gJ19pZCc7XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICBpZiAob3B0aW9ucy5oaWRlKSB7XG4gKiAgICAgICAgIG9wdGlvbnMuaGlkZS5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAqICAgICAgICAgICBkZWxldGUgcmV0W3Byb3BdO1xuICogICAgICAgICB9KTtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfSk7XG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHsgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnIH0pOyAgICAgICAgICAgICAgICAgIC8vIHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJywgdHJhbnNmb3JtOiB0cnVlIH0pOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IF9hbmQgZWFjaCBvZiBpdHMgc3ViLWRvY3VtZW50c18uIFRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB5b3UgYXJlIGN1cnJlbnRseSBvcGVyYXRpbmcgb24gYSBzdWItZG9jdW1lbnQgeW91IG1pZ2h0IHVzZSB0aGUgZm9sbG93aW5nIGd1YXJkOlxuICpcbiAqICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZG9jLm93bmVyRG9jdW1lbnQpIHtcbiAqICAgICAgIC8vIHdvcmtpbmcgd2l0aCBhIHN1YiBkb2NcbiAqICAgICB9XG4gKlxuICogVHJhbnNmb3JtcywgbGlrZSBhbGwgb2YgdGhlc2Ugb3B0aW9ucywgYXJlIGFsc28gYXZhaWxhYmxlIGZvciBgdG9KU09OYC5cbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSBmb3Igc29tZSBtb3JlIGRldGFpbHMuXG4gKlxuICogX0R1cmluZyBzYXZlLCBubyBjdXN0b20gb3B0aW9ucyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgYmVmb3JlIGJlaW5nIHNlbnQgdG8gdGhlIGRhdGFiYXNlLl9cbiAqXG4gKiByZXRhaW5LZXlPcmRlciAtIGtlZXAgdGhlIGtleSBvcmRlciBvZiB0aGUgZG9jIHNhdmVcbiAqXG4gKiAgICAgdmFyIENoZWNraW4gPSBuZXcgU2NoZW1hKHsgLi4uIH0sIHtcbiAqICAgICAgIHRvT2JqZWN0OiB7XG4gKiAgICAgICAgIHJldGFpbktleU9yZGVyOiB0cnVlXG4gKiAgICAgICB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyBvYmplY3Qgd2l0aCBjb3JyZWN0IG9yZGVyIG9mIHRoZSBrZXlzIG9mIGRvY1xuICpcbiAqICAgICAvLyBvciBpbmxpbmVcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgcmV0YWluS2V5T3JkZXI6IHRydWUgfSk7XG4gKlxuICogICAgIC8vIG9yIGlmIHVzZSB0b0pTT04oKTtcbiAqXG4gKiAgICAgdmFyIENoZWNraW4gPSBuZXcgU2NoZW1hKHsgLi4uIH0sIHtcbiAqICAgICAgIHRvSlNPTjoge1xuICogICAgICAgICByZXRhaW5LZXlPcmRlcjogdHJ1ZVxuICogICAgICAgfVxuICogICAgIH0pO1xuICpcbiAqICAgICBkb2MudG9KU09OKCk7IC8vIEpTT04gc3RyaW5nIHdpdGggY29ycmVjdCBvcmRlciBvZiB0aGUga2V5cyBvZiBkb2NcbiAqXG4gKiAgICAgLy8gb3IgaW5saW5lXG4gKlxuICogICAgIGRvYy50b0pTT04oeyByZXRhaW5LZXlPcmRlcjogdHJ1ZSB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtPYmplY3R9IGpzIG9iamVjdFxuICogQHNlZSBtb25nb2RiLkJpbmFyeSBodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUgJiYgdGhpcy4kX18ud2FzUG9wdWxhdGVkKSB7XG4gICAgLy8gcG9wdWxhdGVkIHBhdGhzIHRoYXQgd2Ugc2V0IHRvIGEgZG9jdW1lbnRcbiAgICByZXR1cm4gdXRpbHMuY2xvbmUodGhpcy5faWQsIG9wdGlvbnMpO1xuICB9XG5cbiAgLy8gV2hlbiBpbnRlcm5hbGx5IHNhdmluZyB0aGlzIGRvY3VtZW50IHdlIGFsd2F5cyBwYXNzIG9wdGlvbnMsXG4gIC8vIGJ5cGFzc2luZyB0aGUgY3VzdG9tIHNjaGVtYSBvcHRpb25zLlxuICB2YXIgb3B0aW9uc1BhcmFtZXRlciA9IG9wdGlvbnM7XG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9wdGlvbnMuY29uc3RydWN0b3IpKSB8fFxuICAgIChvcHRpb25zICYmIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3RcbiAgICAgID8gY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdClcbiAgICAgIDoge307XG4gIH1cblxuICBpZiAoIG9wdGlvbnMubWluaW1pemUgPT09IHVuZGVmaW5lZCApe1xuICAgIG9wdGlvbnMubWluaW1pemUgPSB0aGlzLnNjaGVtYS5vcHRpb25zLm1pbmltaXplO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zUGFyYW1ldGVyKSB7XG4gICAgb3B0aW9ucy5fdXNlU2NoZW1hT3B0aW9ucyA9IHRydWU7XG4gIH1cblxuICB2YXIgcmV0ID0gdXRpbHMuY2xvbmUodGhpcy5fZG9jLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy52aXJ0dWFscyB8fCBvcHRpb25zLmdldHRlcnMgJiYgZmFsc2UgIT09IG9wdGlvbnMudmlydHVhbHMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAndmlydHVhbHMnLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmdldHRlcnMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAncGF0aHMnLCBvcHRpb25zKTtcbiAgICAvLyBhcHBseUdldHRlcnMgZm9yIHBhdGhzIHdpbGwgYWRkIG5lc3RlZCBlbXB0eSBvYmplY3RzO1xuICAgIC8vIGlmIG1pbmltaXplIGlzIHNldCwgd2UgbmVlZCB0byByZW1vdmUgdGhlbS5cbiAgICBpZiAob3B0aW9ucy5taW5pbWl6ZSkge1xuICAgICAgcmV0ID0gbWluaW1pemUocmV0KSB8fCB7fTtcbiAgICB9XG4gIH1cblxuICAvLyBJbiB0aGUgY2FzZSB3aGVyZSBhIHN1YmRvY3VtZW50IGhhcyBpdHMgb3duIHRyYW5zZm9ybSBmdW5jdGlvbiwgd2UgbmVlZCB0b1xuICAvLyBjaGVjayBhbmQgc2VlIGlmIHRoZSBwYXJlbnQgaGFzIGEgdHJhbnNmb3JtIChvcHRpb25zLnRyYW5zZm9ybSkgYW5kIGlmIHRoZVxuICAvLyBjaGlsZCBzY2hlbWEgaGFzIGEgdHJhbnNmb3JtICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBJbiB0aGlzIGNhc2UsXG4gIC8vIHdlIG5lZWQgdG8gYWRqdXN0IG9wdGlvbnMudHJhbnNmb3JtIHRvIGJlIHRoZSBjaGlsZCBzY2hlbWEncyB0cmFuc2Zvcm0gYW5kXG4gIC8vIG5vdCB0aGUgcGFyZW50IHNjaGVtYSdzXG4gIGlmICh0cnVlID09PSBvcHRpb25zLnRyYW5zZm9ybSB8fFxuICAgICAgKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgJiYgb3B0aW9ucy50cmFuc2Zvcm0pKSB7XG4gICAgdmFyIG9wdHMgPSBvcHRpb25zLmpzb25cbiAgICAgID8gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgIDogdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdDtcbiAgICBpZiAob3B0cykge1xuICAgICAgb3B0aW9ucy50cmFuc2Zvcm0gPSBvcHRzLnRyYW5zZm9ybTtcbiAgICB9XG4gIH1cblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICB2YXIgeGZvcm1lZCA9IG9wdGlvbnMudHJhbnNmb3JtKHRoaXMsIHJldCwgb3B0aW9ucyk7XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiB4Zm9ybWVkKSByZXQgPSB4Zm9ybWVkO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qIVxuICogTWluaW1pemVzIGFuIG9iamVjdCwgcmVtb3ZpbmcgdW5kZWZpbmVkIHZhbHVlcyBhbmQgZW1wdHkgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdG8gbWluaW1pemVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBtaW5pbWl6ZSAob2JqKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlcbiAgICAsIHZhbDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YWwgPSBvYmpba2V5XTtcblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KHZhbCkgKSB7XG4gICAgICBvYmpba2V5XSA9IG1pbmltaXplKHZhbCk7XG4gICAgfVxuXG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gb2JqW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGhhc0tleXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGhhc0tleXNcbiAgICA/IG9ialxuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIEFwcGxpZXMgdmlydHVhbHMgcHJvcGVydGllcyB0byBganNvbmAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IGpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIGVpdGhlciBgdmlydHVhbHNgIG9yIGBwYXRoc2BcbiAqIEByZXR1cm4ge09iamVjdH0gYGpzb25gXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlHZXR0ZXJzIChzZWxmLCBqc29uLCB0eXBlLCBvcHRpb25zKSB7XG4gIHZhciBzY2hlbWEgPSBzZWxmLnNjaGVtYVxuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyhzY2hlbWFbdHlwZV0pXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0gcGF0aHNbaV07XG5cbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAgICwgcGxlbiA9IHBhcnRzLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gcGxlbiAtIDFcbiAgICAgICwgYnJhbmNoID0ganNvblxuICAgICAgLCBwYXJ0O1xuXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHBsZW47ICsraWkpIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpaV07XG4gICAgICBpZiAoaWkgPT09IGxhc3QpIHtcbiAgICAgICAgYnJhbmNoW3BhcnRdID0gdXRpbHMuY2xvbmUoc2VsZi5nZXQocGF0aCksIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoW3BhcnRdIHx8IChicmFuY2hbcGFydF0gPSB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGpzb247XG59XG5cbi8qKlxuICogVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIG1ldGhvZCBpcyB1c2VkIGluIGNhbGxzIHRvIEpTT04uc3RyaW5naWZ5KGRvYykuXG4gKlxuICogVGhpcyBtZXRob2QgYWNjZXB0cyB0aGUgc2FtZSBvcHRpb25zIGFzIFtEb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KS4gVG8gYXBwbHkgdGhlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9KU09OYCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvSlNPTicsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgZm9yIGRldGFpbHMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBzZWUgRG9jdW1lbnQjdG9PYmplY3QgI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBjaGVjayBmb3Igb2JqZWN0IHR5cGUgc2luY2UgYW4gYXJyYXkgb2YgZG9jdW1lbnRzXG4gIC8vIGJlaW5nIHN0cmluZ2lmaWVkIHBhc3NlcyBhcnJheSBpbmRleGVzIGluc3RlYWRcbiAgLy8gb2Ygb3B0aW9ucyBvYmplY3RzLiBKU09OLnN0cmluZ2lmeShbZG9jLCBkb2NdKVxuICAvLyBUaGUgc2Vjb25kIGNoZWNrIGhlcmUgaXMgdG8gbWFrZSBzdXJlIHRoYXQgcG9wdWxhdGVkIGRvY3VtZW50cyAob3JcbiAgLy8gc3ViZG9jdW1lbnRzKSB1c2UgdGhlaXIgb3duIG9wdGlvbnMgZm9yIGAudG9KU09OKClgIGluc3RlYWQgb2YgdGhlaXJcbiAgLy8gcGFyZW50J3NcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob3B0aW9ucy5jb25zdHJ1Y3RvcikpXG4gICAgICB8fCAoKCFvcHRpb25zIHx8IG9wdGlvbnMuanNvbikgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pKSB7XG5cbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pXG4gICAgICA6IHt9O1xuICB9XG4gIG9wdGlvbnMuanNvbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMudG9PYmplY3QoIG9wdGlvbnMgKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBEb2N1bWVudCBzdG9yZXMgdGhlIHNhbWUgZGF0YSBhcyBkb2MuXG4gKlxuICogRG9jdW1lbnRzIGFyZSBjb25zaWRlcmVkIGVxdWFsIHdoZW4gdGhleSBoYXZlIG1hdGNoaW5nIGBfaWRgcywgdW5sZXNzIG5laXRoZXJcbiAqIGRvY3VtZW50IGhhcyBhbiBgX2lkYCwgaW4gd2hpY2ggY2FzZSB0aGlzIGZ1bmN0aW9uIGZhbGxzIGJhY2sgdG8gdXNpbmdcbiAqIGBkZWVwRXF1YWwoKWAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGEgZG9jdW1lbnQgdG8gY29tcGFyZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKCBkb2MgKXtcbiAgdmFyIHRpZCA9IHRoaXMuZ2V0KCdfaWQnKTtcbiAgdmFyIGRvY2lkID0gZG9jLmdldCgnX2lkJyk7XG4gIGlmICghdGlkICYmICFkb2NpZCkge1xuICAgIHJldHVybiBkZWVwRXF1YWwodGhpcywgZG9jKTtcbiAgfVxuICByZXR1cm4gdGlkICYmIHRpZC5lcXVhbHNcbiAgICA/IChkb2NpZCA/IHRpZC5lcXVhbHMoZG9jaWQpIDogZmFsc2UpXG4gICAgOiB0aWQgPT09IGRvY2lkO1xufTtcblxuLyoqXG4gKiBHZXRzIF9pZChzKSB1c2VkIGR1cmluZyBwb3B1bGF0aW9uIG9mIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIE1vZGVsLmZpbmRPbmUoKS5wb3B1bGF0ZSgnYXV0aG9yJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5hdXRob3IubmFtZSkgICAgICAgICAvLyBEci5TZXVzc1xuICogICAgICAgY29uc29sZS5sb2coZG9jLnBvcHVsYXRlZCgnYXV0aG9yJykpIC8vICc1MTQ0Y2Y4MDUwZjA3MWQ5NzljMTE4YTcnXG4gKiAgICAgfSlcbiAqXG4gKiBJZiB0aGUgcGF0aCB3YXMgbm90IHBvcHVsYXRlZCwgdW5kZWZpbmVkIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheXxPYmplY3RJZHxOdW1iZXJ8QnVmZmVyfFN0cmluZ3x1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucG9wdWxhdGVkID0gZnVuY3Rpb24oIHBhdGgsIHZhbCwgb3B0aW9ucyApe1xuICAvLyB2YWwgYW5kIG9wdGlvbnMgYXJlIGludGVybmFsXG5cbiAgLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINGN0YLRgyDQv9GA0L7QstC10YDQutGDLCDQvtC90LAg0LTQvtC70LbQvdCwINC+0L/QuNGA0LDRgtGM0YHRjyDQvdC1INC90LAgJF9fLnBvcHVsYXRlZCwg0LAg0L3QsCDRgtC+LCDRh9GC0L4g0L3QsNGIINC+0LHRitC10LrRgiDQuNC80LXQtdGCINGA0L7QtNC40YLQtdC70Y9cbiAgLy8g0Lgg0L/QvtGC0L7QvCDRg9C20LUg0LLRi9GB0YLQsNCy0LvRj9GC0Ywg0YHQstC+0LnRgdGC0LLQviBwb3B1bGF0ZWQgPT0gdHJ1ZVxuICBpZiAobnVsbCA9PSB2YWwpIHtcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB2YXIgdiA9IHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgICBpZiAodikgcmV0dXJuIHYudmFsdWU7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIGludGVybmFsXG5cbiAgaWYgKHRydWUgPT09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XG4gIH1cblxuICB0aGlzLiRfXy5wb3B1bGF0ZWQgfHwgKHRoaXMuJF9fLnBvcHVsYXRlZCA9IHt9KTtcbiAgdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdID0geyB2YWx1ZTogdmFsLCBvcHRpb25zOiBvcHRpb25zIH07XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIC8vIG92ZXJyaWRkZW4gaW4gU3ViRG9jdW1lbnRzXG4gIHJldHVybiBwYXRoIHx8ICcnO1xufTtcblxuLyoqXG4gKiDQo9C00LDQu9C40YLRjCDQtNC+0LrRg9C80LXQvdGCINC4INCy0LXRgNC90YPRgtGMINC60L7Qu9C70LXQutGG0LjRji5cbiAqXG4gKiBAZXhhbXBsZVxuICogZG9jdW1lbnQucmVtb3ZlKCk7XG4gKlxuICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpe1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKCB0aGlzICk7XG4gIH1cblxuICByZXR1cm4gZGVsZXRlIHRoaXM7XG59O1xuXG5cbi8qKlxuICog0J7Rh9C40YnQsNC10YIg0LTQvtC60YPQvNC10L3RgiAo0LLRi9GB0YLQsNCy0LvRj9C10YIg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQuNC70LggdW5kZWZpbmVkKVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbigpe1xuICB2YXIgZG9jID0gdGhpc1xuICAgICwgc2VsZiA9IHRoaXNcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT0gcCApIGNvbnRpbnVlO1xuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWwgfHwgdW5kZWZpbmVkO1xuICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5Eb2N1bWVudC5WYWxpZGF0aW9uRXJyb3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFN0b3JhZ2VFcnJvciBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBFcnJvciBtZXNzYWdlXG4gKiBAaW5oZXJpdHMgRXJyb3IgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRXJyb3JcbiAqIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzgzODE4L2hvdy1kby1pLWNyZWF0ZS1hLWN1c3RvbS1lcnJvci1pbi1qYXZhc2NyaXB0XG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VFcnJvciAoIG1zZyApIHtcbiAgdGhpcy5tZXNzYWdlID0gbXNnO1xuICB0aGlzLm5hbWUgPSAnU3RvcmFnZUVycm9yJztcbn1cblN0b3JhZ2VFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuXG4vKiFcbiAqIEZvcm1hdHMgZXJyb3IgbWVzc2FnZXNcbiAqL1xuU3RvcmFnZUVycm9yLnByb3RvdHlwZS5mb3JtYXRNZXNzYWdlID0gZnVuY3Rpb24gKG1zZywgcGF0aCwgdHlwZSwgdmFsKSB7XG4gIGlmICghbXNnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdtZXNzYWdlIGlzIHJlcXVpcmVkJyk7XG5cbiAgcmV0dXJuIG1zZy5yZXBsYWNlKC97UEFUSH0vLCBwYXRoKVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tWQUxVRX0vLCBTdHJpbmcodmFsfHwnJykpXG4gICAgICAgICAgICAucmVwbGFjZSgve1RZUEV9LywgdHlwZSB8fCAnZGVjbGFyZWQgdHlwZScpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRXJyb3I7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLlxuICpcbiAqIEBzZWUgRXJyb3IubWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUVycm9yLm1lc3NhZ2VzID0gcmVxdWlyZSgnLi9lcnJvci9tZXNzYWdlcycpO1xuXG4vKiFcbiAqIEV4cG9zZSBzdWJjbGFzc2VzXG4gKi9cblN0b3JhZ2VFcnJvci5DYXN0RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL2Nhc3QnKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZhbGlkYXRpb24nKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdG9yJyk7XG4vL3RvZG86XG4vL1N0b3JhZ2VFcnJvci5PdmVyd3JpdGVNb2RlbEVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9vdmVyd3JpdGVNb2RlbCcpO1xuU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xuLy9TdG9yYWdlRXJyb3IuRGl2ZXJnZW50QXJyYXlFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvZGl2ZXJnZW50QXJyYXknKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIENhc3RpbmcgRXJyb3IgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIENhc3RFcnJvciAodHlwZSwgdmFsdWUsIHBhdGgpIHtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgJ0Nhc3QgdG8gJyArIHR5cGUgKyAnIGZhaWxlZCBmb3IgdmFsdWUgXCInICsgdmFsdWUgKyAnXCIgYXQgcGF0aCBcIicgKyBwYXRoICsgJ1wiJyk7XG4gIHRoaXMubmFtZSA9ICdDYXN0RXJyb3InO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlRXJyb3IuXG4gKi9cbkNhc3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlRXJyb3IucHJvdG90eXBlICk7XG5DYXN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2FzdEVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhc3RFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBidWlsdC1pbiB2YWxpZGF0b3IgZXJyb3IgbWVzc2FnZXMuIFRoZXNlIG1heSBiZSBjdXN0b21pemVkLlxuICpcbiAqICAgICAvLyBjdXN0b21pemUgd2l0aGluIGVhY2ggc2NoZW1hIG9yIGdsb2JhbGx5IGxpa2Ugc29cbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIG1vbmdvb3NlLkVycm9yLm1lc3NhZ2VzLlN0cmluZy5lbnVtICA9IFwiWW91ciBjdXN0b20gbWVzc2FnZSBmb3Ige1BBVEh9LlwiO1xuICpcbiAqIEFzIHlvdSBtaWdodCBoYXZlIG5vdGljZWQsIGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzaWMgdGVtcGxhdGluZ1xuICpcbiAqIC0gYHtQQVRIfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCBkb2N1bWVudCBwYXRoXG4gKiAtIGB7VkFMVUV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAtIGB7VFlQRX1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIHZhbGlkYXRvciB0eXBlIHN1Y2ggYXMgXCJyZWdleHBcIiwgXCJtaW5cIiwgb3IgXCJ1c2VyIGRlZmluZWRcIlxuICogLSBge01JTn1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1pbiB2YWx1ZSBmb3IgdGhlIE51bWJlci5taW4gdmFsaWRhdG9yXG4gKiAtIGB7TUFYfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWF4IHZhbHVlIGZvciB0aGUgTnVtYmVyLm1heCB2YWxpZGF0b3JcbiAqXG4gKiBDbGljayB0aGUgXCJzaG93IGNvZGVcIiBsaW5rIGJlbG93IHRvIHNlZSBhbGwgZGVmYXVsdHMuXG4gKlxuICogQHByb3BlcnR5IG1lc3NhZ2VzXG4gKiBAcmVjZWl2ZXIgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBtc2cgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5tc2cuZ2VuZXJhbCA9IHt9O1xubXNnLmdlbmVyYWwuZGVmYXVsdCA9ICdWYWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gJztcbm1zZy5nZW5lcmFsLnJlcXVpcmVkID0gJ1BhdGggYHtQQVRIfWAgaXMgcmVxdWlyZWQuJztcblxubXNnLk51bWJlciA9IHt9O1xubXNnLk51bWJlci5taW4gPSAnUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbGVzcyB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZSAoe01JTn0pLic7XG5tc2cuTnVtYmVyLm1heCA9ICdQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBtb3JlIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlICh7TUFYfSkuJztcblxubXNnLlN0cmluZyA9IHt9O1xubXNnLlN0cmluZy5lbnVtID0gJ2B7VkFMVUV9YCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGB7UEFUSH1gLic7XG5tc2cuU3RyaW5nLm1hdGNoID0gJ1BhdGggYHtQQVRIfWAgaXMgaW52YWxpZCAoe1ZBTFVFfSkuJztcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qIVxuICogTWlzc2luZ1NjaGVtYSBFcnJvciBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKi9cblxuZnVuY3Rpb24gTWlzc2luZ1NjaGVtYUVycm9yKCl7XG4gIHZhciBtc2cgPSAnU2NoZW1hIGhhc25cXCd0IGJlZW4gcmVnaXN0ZXJlZCBmb3IgZG9jdW1lbnQuXFxuJ1xuICAgICsgJ1VzZSBzdG9yYWdlLkRvY3VtZW50KGRhdGEsIHNjaGVtYSknO1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBtc2cpO1xuXG4gIHRoaXMubmFtZSA9ICdNaXNzaW5nU2NoZW1hRXJyb3InO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUVycm9yLlxuICovXG5cbk1pc3NpbmdTY2hlbWFFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN0b3JhZ2VFcnJvci5wcm90b3R5cGUpO1xuTWlzc2luZ1NjaGVtYUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0b3JhZ2VFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBNaXNzaW5nU2NoZW1hRXJyb3I7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHNcbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBEb2N1bWVudCBWYWxpZGF0aW9uIEVycm9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBpbnN0YW5jZVxuICogQGluaGVyaXRzIFN0b3JhZ2VFcnJvclxuICovXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvciAoaW5zdGFuY2UpIHtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0aW9uRXJyb3InO1xuICB0aGlzLmVycm9ycyA9IGluc3RhbmNlLmVycm9ycyA9IHt9O1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUVycm9yLlxuICovXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRpb25FcnJvcjtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdGlvbkVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG52YXIgZXJyb3JNZXNzYWdlcyA9IFN0b3JhZ2VFcnJvci5tZXNzYWdlcztcblxuLyoqXG4gKiBTY2hlbWEgdmFsaWRhdG9yIGVycm9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2dcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8Kn0gdmFsXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0b3JFcnJvciAocGF0aCwgbXNnLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCAhbXNnICkge1xuICAgIG1zZyA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICB9XG5cbiAgdmFyIG1lc3NhZ2UgPSB0aGlzLmZvcm1hdE1lc3NhZ2UobXNnLCBwYXRoLCB0eXBlLCB2YWwpO1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICB0aGlzLm5hbWUgPSAnVmFsaWRhdG9yRXJyb3InO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsO1xufVxuXG4vKiFcbiAqIHRvU3RyaW5nIGhlbHBlclxuICovXG5cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbn07XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlRXJyb3JcbiAqL1xuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdG9yRXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdG9yRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICpcbiAqIEJhY2tib25lLkV2ZW50c1xuXG4gKiBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXG4gKiBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrXG4gKiBmdW5jdGlvbnMgdG8gYW4gZXZlbnQ7IGB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpblxuICogc3VjY2Vzc2lvbi5cbiAqXG4gKiB2YXIgb2JqZWN0ID0ge307XG4gKiBfLmV4dGVuZChvYmplY3QsIEV2ZW50cy5wcm90b3R5cGUpO1xuICogb2JqZWN0Lm9uKCdleHBhbmQnLCBmdW5jdGlvbigpeyBhbGVydCgnZXhwYW5kZWQnKTsgfSk7XG4gKiBvYmplY3QudHJpZ2dlcignZXhwYW5kJyk7XG4gKi9cbmZ1bmN0aW9uIEV2ZW50cygpIHt9XG5cbkV2ZW50cy5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXG4gICAqIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIGNvbnRleHRcbiAgICogQHJldHVybnMge0V2ZW50c31cbiAgICovXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgIGV2ZW50cy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY29udGV4dCB8fCB0aGlzfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcbiAgICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICpcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBjb250ZXh0XG4gICAqIEByZXR1cm5zIHtFdmVudHN9XG4gICAqL1xuICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbmNlJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAqIGNhbGxiYWNrcyB3aXRoIHRoYXQgZnVuY3Rpb24uIElmIGBjYWxsYmFja2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICogY2FsbGJhY2tzIGZvciB0aGUgZXZlbnQuIElmIGBuYW1lYCBpcyBudWxsLCByZW1vdmVzIGFsbCBib3VuZFxuICAgKiBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gY29udGV4dFxuICAgKiBAcmV0dXJucyB7RXZlbnRzfVxuICAgKi9cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXRhaW4ubGVuZ3RoKSBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VyIG9uZSBvciBtYW55IGV2ZW50cywgZmlyaW5nIGFsbCBib3VuZCBjYWxsYmFja3MuIENhbGxiYWNrcyBhcmVcbiAgICogcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcbiAgICogKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG4gICAqIHJlY2VpdmUgdGhlIHRydWUgbmFtZSBvZiB0aGUgZXZlbnQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50KS5cbiAgICpcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHJldHVybnMge0V2ZW50c31cbiAgICovXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICd0cmlnZ2VyJywgbmFtZSwgYXJncykpIHJldHVybiB0aGlzO1xuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XG4gICAgaWYgKGV2ZW50cykgdHJpZ2dlckV2ZW50cyhldmVudHMsIGFyZ3MpO1xuICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gICAqIHRvIGV2ZXJ5IG9iamVjdCBpdCdzIGN1cnJlbnRseSBsaXN0ZW5pbmcgdG8uXG4gICAqXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEByZXR1cm5zIHtFdmVudHN9XG4gICAqL1xuICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG87XG4gICAgaWYgKCFsaXN0ZW5pbmdUbykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIHJlbW92ZSA9ICFuYW1lICYmICFjYWxsYmFjaztcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgIGlmIChvYmopIChsaXN0ZW5pbmdUbyA9IHt9KVtvYmouX2xpc3RlbklkXSA9IG9iajtcbiAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgb2JqID0gbGlzdGVuaW5nVG9baWRdO1xuICAgICAgb2JqLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICBpZiAocmVtb3ZlIHx8IF8uaXNFbXB0eShvYmouX2V2ZW50cykpIGRlbGV0ZSB0aGlzLl9saXN0ZW5pbmdUb1tpZF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzLlxudmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbi8qKlxuICogSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbiAqIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbiAqIGluIHRlcm1zIG9mIHRoZSBleGlzdGluZyBBUEkuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHBhcmFtIGFjdGlvblxuICogQHBhcmFtIG5hbWVcbiAqIEBwYXJhbSByZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xudmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gIGlmICghbmFtZSkgcmV0dXJuIHRydWU7XG5cbiAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gIGlmIChldmVudFNwbGl0dGVyLnRlc3QobmFtZSkpIHtcbiAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtuYW1lc1tpXV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4gKiB0cmlnZ2VyaW5nIGV2ZW50cy4gVHJpZXMgdG8ga2VlcCB0aGUgdXN1YWwgY2FzZXMgc3BlZWR5IChtb3N0IGludGVybmFsXG4gKiBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG4gKlxuICogQHBhcmFtIGV2ZW50c1xuICogQHBhcmFtIGFyZ3NcbiAqL1xudmFyIHRyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGFyZ3MpIHtcbiAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgY2FzZSAwOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCk7IHJldHVybjtcbiAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgY2FzZSAzOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyLCBhMyk7IHJldHVybjtcbiAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xuICB9XG59O1xuXG52YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xuXG4vLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xuLy8gbGlzdGVuIHRvIGFuIGV2ZW50IGluIGFub3RoZXIgb2JqZWN0IC4uLiBrZWVwaW5nIHRyYWNrIG9mIHdoYXQgaXQnc1xuLy8gbGlzdGVuaW5nIHRvLlxuXy5lYWNoKGxpc3Rlbk1ldGhvZHMsIGZ1bmN0aW9uKGltcGxlbWVudGF0aW9uLCBtZXRob2QpIHtcbiAgRXZlbnRzW21ldGhvZF0gPSBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0ge30pO1xuICAgIHZhciBpZCA9IG9iai5fbGlzdGVuSWQgfHwgKG9iai5fbGlzdGVuSWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgIGxpc3RlbmluZ1RvW2lkXSA9IG9iajtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIFN0b3JhZ2UgZG9jdW1lbnRzIHVzaW5nIHNjaGVtYVxuICogaW5zcGlyZWQgYnkgbW9uZ29vc2UgMy44LjQgKGZpeGVkIGJ1Z3MgZm9yIDMuOC4yMClcbiAqXG4gKiBTdG9yYWdlIGltcGxlbWVudGF0aW9uXG4gKiBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyNzZWxlY3RvcnNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3RyZWUvbWFzdGVyL3BhY2thZ2VzL21pbmltb25nb1xuICpcbiAqINC/0YDQvtGB0LvQtdC00LjRgtGMINC30LAg0LHQsNCz0L7QvCBnaC0xNjM4ICgzLjguMTYpXG4gKi9cblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG52YXIgQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vY29sbGVjdGlvbicpXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgVHlwZXMgPSByZXF1aXJlKCcuL3R5cGVzJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgcGtnID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG5cblxuLyoqXG4gKiBTdG9yYWdlIGNvbnN0cnVjdG9yLlxuICpcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBvZiB0aGUgYHN0b3JhZ2VgIG1vZHVsZSBpcyBhbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLlxuICogTW9zdCBhcHBzIHdpbGwgb25seSB1c2UgdGhpcyBvbmUgaW5zdGFuY2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZSAoKSB7XG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzID0gW107XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgY29sbGVjdGlvbiBhbmQgZ2V0IGl0XG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIGNvbGxlY3Rpb24gbmFtZVxuICogQHBhcmFtIHtzdG9yYWdlLlNjaGVtYXx1bmRlZmluZWR9IHNjaGVtYVxuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAg0LDQv9C4INGA0LXRgdGD0YDRgVxuICogQHJldHVybnMge0NvbGxlY3Rpb258dW5kZWZpbmVkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoIG5hbWUgPT0gbnVsbCApe1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbiggbmFtZSwgc2NoZW1hICkgLSBgbmFtZWAgbXVzdCBiZSBleGlzdCwgYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIGlmICggc2NoZW1hID09IG51bGwgfHwgJ1NjaGVtYScgIT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggc2NoZW1hLmNvbnN0cnVjdG9yICkgKXtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oIG5hbWUsIHNjaGVtYSApIC0gYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcblxuICB0aGlzWyBuYW1lIF0gPSBuZXcgQ29sbGVjdGlvbiggbmFtZSwgc2NoZW1hLCBhcGkgKTtcblxuICByZXR1cm4gdGhpc1sgbmFtZSBdO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgY3JlYXRlQ29sbGVjdGlvblxuICpcbiAqIEBzZWUgU3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uICNpbmRleF9TdG9yYWdlLWNyZWF0ZUNvbGxlY3Rpb25cbiAqIEBtZXRob2QgY3JlYXRlQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuYWRkQ29sbGVjdGlvbiA9IFN0b3JhZ2UucHJvdG90eXBlLmNyZWF0ZUNvbGxlY3Rpb247XG5cbi8qKlxuICogVG8gb2J0YWluIHRoZSBuYW1lcyBvZiB0aGUgY29sbGVjdGlvbnMgaW4gYW4gYXJyYXlcbiAqXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59IEFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIGNvbGxlY3Rpb25zIGluIHRoZSBzdG9yYWdlLlxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5nZXRDb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uTmFtZXM7XG59O1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIENvbGxlY3Rpb24gY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIENvbGxlY3Rpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLkNvbGxlY3Rpb24gPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIHZlcnNpb25cbiAqXG4gKiBAcHJvcGVydHkgdmVyc2lvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUudmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIGNvbnN0cnVjdG9yXG4gKlxuICogVGhlIGV4cG9ydHMgb2YgdGhlIHN0b3JhZ2UgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzdG9yYWdlMiA9IG5ldyBzdG9yYWdlLlN0b3JhZ2UoKTtcbiAqXG4gKiBAbWV0aG9kIFN0b3JhZ2VcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlN0b3JhZ2UgPSBTdG9yYWdlO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtTY2hlbWFdKCNzY2hlbWFfU2NoZW1hKSBjb25zdHJ1Y3RvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgU2NoZW1hID0gc3RvcmFnZS5TY2hlbWE7XG4gKiAgICAgdmFyIENhdFNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqIEBtZXRob2QgU2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWEgPSBTY2hlbWE7XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYVR5cGVdKCNzY2hlbWF0eXBlX1NjaGVtYVR5cGUpIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBTY2hlbWFUeXBlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWFUeXBlID0gU2NoZW1hVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBTdG9yYWdlIFNjaGVtYVR5cGVzLlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9BbGlhcyBvZiBzdG9yYWdlLlNjaGVtYS5UeXBlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuX1xuICpcbiAqIEBwcm9wZXJ0eSBTY2hlbWFUeXBlc1xuICogQHNlZSBTY2hlbWEuU2NoZW1hVHlwZXMgI3NjaGVtYV9TY2hlbWEuVHlwZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGVzID0gU2NoZW1hLlR5cGVzO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtWaXJ0dWFsVHlwZV0oI3ZpcnR1YWx0eXBlX1ZpcnR1YWxUeXBlKSBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgVmlydHVhbFR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlZpcnR1YWxUeXBlID0gVmlydHVhbFR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgU3RvcmFnZSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGFycmF5ID0gc3RvcmFnZS5UeXBlcy5BcnJheTtcbiAqXG4gKiAjIyMjVHlwZXM6XG4gKlxuICogLSBbT2JqZWN0SWRdKCN0eXBlcy1vYmplY3RpZC1qcylcbiAqIC0gW0J1ZmZlcl0oI3R5cGVzLWJ1ZmZlci1qcylcbiAqIC0gW1N1YkRvY3VtZW50XSgjdHlwZXMtZW1iZWRkZWQtanMpXG4gKiAtIFtBcnJheV0oI3R5cGVzLWFycmF5LWpzKVxuICogLSBbRG9jdW1lbnRBcnJheV0oI3R5cGVzLWRvY3VtZW50YXJyYXktanMpXG4gKlxuICogVXNpbmcgdGhpcyBleHBvc2VkIGFjY2VzcyB0byB0aGUgYE9iamVjdElkYCB0eXBlLCB3ZSBjYW4gY29uc3RydWN0IGlkcyBvbiBkZW1hbmQuXG4gKlxuICogICAgIHZhciBPYmplY3RJZCA9IHN0b3JhZ2UuVHlwZXMuT2JqZWN0SWQ7XG4gKiAgICAgdmFyIGlkMSA9IG5ldyBPYmplY3RJZDtcbiAqXG4gKiBAcHJvcGVydHkgVHlwZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlR5cGVzID0gVHlwZXM7XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW0RvY3VtZW50XSgjZG9jdW1lbnQtanMpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRG9jdW1lbnRcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLkRvY3VtZW50ID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIFtTdG9yYWdlRXJyb3JdKCNlcnJvcl9TdG9yYWdlRXJyb3IpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG5cblN0b3JhZ2UucHJvdG90eXBlLkRlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZCcpO1xuU3RvcmFnZS5wcm90b3R5cGUuZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblN0b3JhZ2UucHJvdG90eXBlLlN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5TdG9yYWdlLnByb3RvdHlwZS51dGlscyA9IHV0aWxzO1xuU3RvcmFnZS5wcm90b3R5cGUuT2JqZWN0SWQgPSBUeXBlcy5PYmplY3RJZDtcblN0b3JhZ2UucHJvdG90eXBlLnNjaGVtYXMgPSBTY2hlbWEuc2NoZW1hcztcblxuU3RvcmFnZS5wcm90b3R5cGUuc2V0QWRhcHRlciA9IGZ1bmN0aW9uKCBhZGFwdGVySG9va3MgKXtcbiAgRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IGFkYXB0ZXJIb29rcztcbn07XG5cblxuLyohXG4gKiBUaGUgZXhwb3J0cyBvYmplY3QgaXMgYW4gaW5zdGFuY2Ugb2YgU3RvcmFnZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdG9yYWdlKCk7XG5cbndpbmRvdy5CdWZmZXIgPSBCdWZmZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vINCc0LDRiNC40L3QsCDRgdC+0YHRgtC+0Y/QvdC40Lkg0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQv9C+0LzQtdGC0LrQuCwg0LIg0LrQsNC60L7QvCDRgdC+0YHRgtC+0Y/QvdC40Lgg0L3QsNGF0L7QtNGP0YLRgdGPINC/0L7Qu9C1XG4vLyDQndCw0L/RgNC40LzQtdGAOiDQtdGB0LvQuCDQv9C+0LvQtSDQuNC80LXQtdGCINGB0L7RgdGC0L7Rj9C90LjQtSBkZWZhdWx0IC0g0LfQvdCw0YfQuNGCINC10LPQviDQt9C90LDRh9C10L3QuNC10Lwg0Y/QstC70Y/QtdGC0YHRjyDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOXG4vLyDQn9GA0LjQvNC10YfQsNC90LjQtTog0LTQu9GPINC80LDRgdGB0LjQstC+0LIg0LIg0L7QsdGJ0LXQvCDRgdC70YPRh9Cw0LUg0Y3RgtC+INC+0LfQvdCw0YfQsNC10YIg0L/Rg9GB0YLQvtC5INC80LDRgdGB0LjQslxuXG4vKiFcbiAqIERlcGVuZGVuY2llc1xuICovXG5cbnZhciBTdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xuXG52YXIgQWN0aXZlUm9zdGVyID0gU3RhdGVNYWNoaW5lLmN0b3IoJ3JlcXVpcmUnLCAnbW9kaWZ5JywgJ2luaXQnLCAnZGVmYXVsdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVybmFsQ2FjaGU7XG5cbmZ1bmN0aW9uIEludGVybmFsQ2FjaGUgKCkge1xuICB0aGlzLnN0cmljdE1vZGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2F2ZUVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hZGhvY1BhdGhzID0gdW5kZWZpbmVkO1xuICB0aGlzLnJlbW92aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLmluc2VydGluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy52ZXJzaW9uID0gdW5kZWZpbmVkO1xuICB0aGlzLmdldHRlcnMgPSB7fTtcbiAgdGhpcy5faWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMucG9wdWxhdGUgPSB1bmRlZmluZWQ7IC8vIHdoYXQgd2Ugd2FudCB0byBwb3B1bGF0ZSBpbiB0aGlzIGRvY1xuICB0aGlzLnBvcHVsYXRlZCA9IHVuZGVmaW5lZDsvLyB0aGUgX2lkcyB0aGF0IGhhdmUgYmVlbiBwb3B1bGF0ZWRcbiAgdGhpcy53YXNQb3B1bGF0ZWQgPSBmYWxzZTsgLy8gaWYgdGhpcyBkb2Mgd2FzIHRoZSByZXN1bHQgb2YgYSBwb3B1bGF0aW9uXG4gIHRoaXMuc2NvcGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWN0aXZlUGF0aHMgPSBuZXcgQWN0aXZlUm9zdGVyKCk7XG5cbiAgLy8gZW1iZWRkZWQgZG9jc1xuICB0aGlzLm93bmVyRG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZnVsbFBhdGggPSB1bmRlZmluZWQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2Ygb2JqZWN0IGBvYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgb2JqID0ge1xuICogICAgICAgICBjb21tZW50czogW1xuICogICAgICAgICAgICAgeyB0aXRsZTogJ2V4Y2l0aW5nIScsIF9kb2M6IHsgdGl0bGU6ICdncmVhdCEnIH19XG4gKiAgICAgICAgICAgLCB7IHRpdGxlOiAnbnVtYmVyIGRvcycgfVxuICogICAgICAgICBdXG4gKiAgICAgfVxuICpcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvKSAgICAgICAgIC8vICdleGNpdGluZyEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbywgJ19kb2MnKSAvLyAnZ3JlYXQhJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMudGl0bGUnLCBvKSAgICAgICAgICAgLy8gWydleGNpdGluZyEnLCAnbnVtYmVyIGRvcyddXG4gKlxuICogICAgIC8vIHN1bW1hcnlcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbylcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgbWFwKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsLCBtYXApXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgZWFjaCBpbmRpdmlkdWFsIGZvdW5kIHZhbHVlLiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIG8sIHNwZWNpYWwsIG1hcCkge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgLy8gcmVhZGluZyBhIHByb3BlcnR5IGZyb20gdGhlIGFycmF5IGl0ZW1zXG4gICAgICB2YXIgcGF0aHMgPSBwYXJ0cy5zbGljZShpKTtcblxuICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1cbiAgICAgICAgICA/IGV4cG9ydHMuZ2V0KHBhdGhzLCBpdGVtLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwKVxuICAgICAgICAgIDogbWFwKHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybiBtYXAob2JqKTtcbiAgfVxuXG4gIHJldHVybiBtYXAob2JqKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYHZhbGAgYXQgdGhlIGdpdmVuIGBwYXRoYCBvZiBvYmplY3QgYG9gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCBpcyBwYXNzZWQgZWFjaCBpbmRpdmlkdWFsIHZhbHVlIGJlZm9yZSBzZXR0aW5nIGl0LiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbywgc3BlY2lhbCwgbWFwLCBfY29weWluZykge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICBpZiAobnVsbCA9PSBvKSByZXR1cm47XG5cbiAgLy8gdGhlIGV4aXN0YW5jZSBvZiAkIGluIGEgcGF0aCB0ZWxscyB1cyBpZiB0aGUgdXNlciBkZXNpcmVzXG4gIC8vIHRoZSBjb3B5aW5nIG9mIGFuIGFycmF5IGluc3RlYWQgb2Ygc2V0dGluZyBlYWNoIHZhbHVlIG9mXG4gIC8vIHRoZSBhcnJheSB0byB0aGUgb25lIGJ5IG9uZSB0byBtYXRjaGluZyBwb3NpdGlvbnMgb2YgdGhlXG4gIC8vIGN1cnJlbnQgYXJyYXkuXG4gIHZhciBjb3B5ID0gX2NvcHlpbmcgfHwgL1xcJC8udGVzdChwYXRoKVxuICAgICwgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFydHMubGVuZ3RoIC0gMTsgaSA8IGxlbjsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKCckJyA9PT0gcGFydCkge1xuICAgICAgaWYgKGkgPT0gbGVuIC0gMSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuICAgICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgb2Ygc2luZ2xlIHZhbHVlcyBvZiBhcnJheVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWxbal0sIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBlbnRpcmUgdmFsdWVcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm47XG4gIH1cblxuICAvLyBwcm9jZXNzIHRoZSBsYXN0IHByb3BlcnR5IG9mIHRoZSBwYXRoXG5cbiAgcGFydCA9IHBhcnRzW2xlbl07XG5cbiAgLy8gdXNlIHRoZSBzcGVjaWFsIHByb3BlcnR5IGlmIGV4aXN0c1xuICBpZiAoc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF0pIHtcbiAgICBvYmogPSBvYmpbc3BlY2lhbF07XG4gIH1cblxuICAvLyBzZXQgdGhlIHZhbHVlIG9uIHRoZSBsYXN0IGJyYW5jaFxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgZm9yICh2YXIgaXRlbSwgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbFtqXSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbFtqXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGl0ZW0gPSBvYmpbal07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xuICAgICAgICAgICAgbG9va3VwKGl0ZW0sIHBhcnQsIG1hcCh2YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xuICAgICAgICAgICAgaXRlbVtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBsb29rdXAob2JqLCBwYXJ0LCBtYXAodmFsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuXG4gKi9cbmZ1bmN0aW9uIEsgKHYpIHtcbiAgcmV0dXJuIHY7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgVHlwZXNcbiAgLCBzY2hlbWFzO1xuXG4vKipcbiAqIFNjaGVtYSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGNoaWxkID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9KTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZywgYWdlOiBOdW1iZXIsIGNoaWxkcmVuOiBbY2hpbGRdIH0pO1xuICogICAgIHZhciBUcmVlID0gbW9uZ29vc2UubW9kZWwoJ1RyZWUnLCBzY2hlbWEpO1xuICpcbiAqICAgICAvLyBzZXR0aW5nIHNjaGVtYSBvcHRpb25zXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IF9pZDogZmFsc2UsIGF1dG9JbmRleDogZmFsc2UgfSlcbiAqXG4gKiAjIyMjT3B0aW9uczpcbiAqXG4gKiAtIFtpZF0oL2RvY3MvZ3VpZGUuaHRtbCNpZCk6IGJvb2wgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIGBtaW5pbWl6ZWA6IGJvb2wgLSBjb250cm9scyBbZG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkgYmVoYXZpb3Igd2hlbiBjYWxsZWQgbWFudWFsbHkgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIFtzdHJpY3RdKC9kb2NzL2d1aWRlLmh0bWwjc3RyaWN0KTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3RvSlNPTl0oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdG9PYmplY3RdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdmVyc2lvbktleV0oL2RvY3MvZ3VpZGUuaHRtbCN2ZXJzaW9uS2V5KTogYm9vbCAtIGRlZmF1bHRzIHRvIFwiX192XCJcbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfV2hlbiBuZXN0aW5nIHNjaGVtYXMsIChgY2hpbGRyZW5gIGluIHRoZSBleGFtcGxlIGFib3ZlKSwgYWx3YXlzIGRlY2xhcmUgdGhlIGNoaWxkIHNjaGVtYSBmaXJzdCBiZWZvcmUgcGFzc2luZyBpdCBpbnRvIGlzIHBhcmVudC5fXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8dW5kZWZpbmVkfSBbbmFtZV0g0J3QsNC30LLQsNC90LjQtSDRgdGF0LXQvNGLXG4gKiBAcGFyYW0ge1NjaGVtYX0gW2Jhc2VTY2hlbWFdINCR0LDQt9C+0LLQsNGPINGB0YXQtdC80LAg0L/RgNC4INC90LDRgdC70LXQtNC+0LLQsNC90LjQuFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiDQodGF0LXQvNCwXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTY2hlbWEgKCBuYW1lLCBiYXNlU2NoZW1hLCBvYmosIG9wdGlvbnMgKSB7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgU2NoZW1hKSApIHtcbiAgICByZXR1cm4gbmV3IFNjaGVtYSggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICAvLyDQldGB0LvQuCDRjdGC0L4g0LjQvNC10L3QvtCy0LDQvdCw0Y8g0YHRhdC10LzQsFxuICBpZiAoIHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyApe1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgc2NoZW1hc1sgbmFtZSBdID0gdGhpcztcbiAgfSBlbHNlIHtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IG5hbWU7XG4gICAgbmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICggIShiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSApe1xuICAgIG9wdGlvbnMgPSBvYmo7XG4gICAgb2JqID0gYmFzZVNjaGVtYTtcbiAgICBiYXNlU2NoZW1hID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy90b2RvOiDQt9Cw0YfQtdC8INC+0L3QviDQvdGD0LbQvdC+PyDQv9GA0L7QsdC70LXQvNCwOiBvYmog0YHRgtCw0L3QvtCy0LjRgtGB0Y8g0LrQsNC6INGDINC/0YDQvtGI0LvQvtC5INGB0YXQtdC80YsgKyDRgtC10LrRg9GJ0LXQtSwg0LjQty3Qt9CwINGN0YLQvtCz0L4gc291cmNlLFxuICAvLyDQv9C+0YLQvtC80YMg0YfRgtC+INC+0L3QviDQutC+0L/QuNGA0YPQtdGC0YHRjyDQuNC3INGB0YLQsNGA0L7QuSDRgdGF0LXQvNGLINCyINGC0LXQutGD0YnQuNC5IHNvdXJjZSwg0LAg0YLQsNC6INC60LDQuiDQvtC9INGB0YHRi9C70LDQtdGC0YHRjyDQvdCwIG9iaixcbiAgLy8g0Lgg0LIganMg0YMg0L3QsNGBINGA0LDQt9C00LXQu9C10L3QuNC1INC/0LDQvNGP0YLQuCwg0YLQviBvYmog0YDQsNGB0YjQuNGA0Y/QtdGC0YHRjyDQv9C+0LvRj9C80Lggc291cmNlINC40Lcg0YHRgtCw0YDQvtC5INGB0YXQtdC80YsuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXG4gIC8vdGhpcy5zb3VyY2UgPSBvYmo7XG5cbiAgdGhpcy5wYXRocyA9IHt9O1xuICB0aGlzLnN1YnBhdGhzID0ge307XG4gIHRoaXMudmlydHVhbHMgPSB7fTtcbiAgdGhpcy5uZXN0ZWQgPSB7fTtcbiAgdGhpcy5pbmhlcml0cyA9IHt9O1xuICB0aGlzLmNhbGxRdWV1ZSA9IFtdO1xuICB0aGlzLm1ldGhvZHMgPSB7fTtcbiAgdGhpcy5zdGF0aWNzID0ge307XG4gIHRoaXMudHJlZSA9IHt9O1xuICB0aGlzLl9yZXF1aXJlZHBhdGhzID0gdW5kZWZpbmVkO1xuICB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0gdW5kZWZpbmVkO1xuXG4gIHRoaXMub3B0aW9ucyA9IHRoaXMuZGVmYXVsdE9wdGlvbnMoIG9wdGlvbnMgKTtcblxuICBpZiAoIGJhc2VTY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBiYXNlU2NoZW1hLmRpc2NyaW1pbmF0b3IoIG5hbWUsIHRoaXMgKTtcbiAgfVxuXG4gIC8vIGJ1aWxkIHBhdGhzXG4gIGlmICggb2JqICkge1xuICAgIHRoaXMuYWRkKCBvYmogKTtcbiAgfVxuXG4gIC8vIGNoZWNrIGlmIF9pZCdzIHZhbHVlIGlzIGEgc3ViZG9jdW1lbnQgKG0tZ2gtMjI3NilcbiAgdmFyIF9pZFN1YkRvYyA9IG9iaiAmJiBvYmouX2lkICYmIF8uaXNPYmplY3QoIG9iai5faWQgKTtcblxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyBnZXQgYW4gYXV0byBfaWQgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvX2lkID0gIXRoaXMucGF0aHNbJ19pZCddICYmICghdGhpcy5vcHRpb25zLm5vSWQgJiYgdGhpcy5vcHRpb25zLl9pZCkgJiYgIV9pZFN1YkRvYztcblxuICBpZiAoYXV0b19pZCkge1xuICAgIHRoaXMuYWRkKHsgX2lkOiB7dHlwZTogU2NoZW1hLk9iamVjdElkLCBhdXRvOiB0cnVlfSB9KTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIHJlY2VpdmUgYW4gaWQgZ2V0dGVyIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b2lkID0gIXRoaXMucGF0aHNbJ2lkJ10gJiYgdGhpcy5vcHRpb25zLmlkO1xuICBpZiAoIGF1dG9pZCApIHtcbiAgICB0aGlzLnZpcnR1YWwoJ2lkJykuZ2V0KCBpZEdldHRlciApO1xuICB9XG59XG5cbi8qIVxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBfaWQgY2FzdCB0byBhIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gaWRHZXR0ZXIgKCkge1xuICBpZiAodGhpcy4kX18uX2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLl9pZDtcbiAgfVxuXG4gIHRoaXMuJF9fLl9pZCA9IG51bGwgPT0gdGhpcy5faWRcbiAgICA/IG51bGxcbiAgICA6IFN0cmluZyh0aGlzLl9pZCk7XG5cbiAgcmV0dXJuIHRoaXMuJF9fLl9pZDtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gRXZlbnRFbWl0dGVyLlxuICovXG5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYTtcblxuLyoqXG4gKiBTY2hlbWEgYXMgZmxhdCBwYXRoc1xuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHtcbiAqICAgICAgICAgJ19pZCcgICAgICAgIDogU2NoZW1hVHlwZSxcbiAqICAgICAgICwgJ25lc3RlZC5rZXknIDogU2NoZW1hVHlwZSxcbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgcGF0aHNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRocztcblxuLyoqXG4gKiBTY2hlbWEgYXMgYSB0cmVlXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgOiBPYmplY3RJZFxuICogICAgICAgLCAnbmVzdGVkJyAgOiB7XG4gKiAgICAgICAgICAgICAna2V5JyA6IFN0cmluZ1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHByb3BlcnR5IHRyZWVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS50cmVlO1xuXG4vKipcbiAqIFJldHVybnMgZGVmYXVsdCBvcHRpb25zIGZvciB0aGlzIHNjaGVtYSwgbWVyZ2VkIHdpdGggYG9wdGlvbnNgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5kZWZhdWx0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBfLmFzc2lnbih7XG4gICAgICBzdHJpY3Q6IHRydWVcbiAgICAsIHZlcnNpb25LZXk6ICdfX3YnXG4gICAgLCBkaXNjcmltaW5hdG9yS2V5OiAnX190J1xuICAgICwgbWluaW1pemU6IHRydWVcbiAgICAvLyB0aGUgZm9sbG93aW5nIGFyZSBvbmx5IGFwcGxpZWQgYXQgY29uc3RydWN0aW9uIHRpbWVcbiAgICAsIF9pZDogdHJ1ZVxuICAgICwgaWQ6IHRydWVcbiAgfSwgb3B0aW9ucyApO1xuXG4gIHJldHVybiBvcHRpb25zO1xufTtcblxuLyoqXG4gKiBBZGRzIGtleSBwYXRoIC8gc2NoZW1hIHR5cGUgcGFpcnMgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBUb3lTY2hlbWEgPSBuZXcgU2NoZW1hO1xuICogICAgIFRveVNjaGVtYS5hZGQoeyBuYW1lOiAnc3RyaW5nJywgY29sb3I6ICdzdHJpbmcnLCBwcmljZTogJ251bWJlcicgfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IHByZWZpeFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQgKCBvYmosIHByZWZpeCApIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcblxuICAgIGlmIChudWxsID09IG9ialsga2V5IF0pIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdmFsdWUgZm9yIHNjaGVtYSBwYXRoIGAnKyBwcmVmaXggKyBrZXkgKydgJyk7XG4gICAgfVxuXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3Qob2JqW2tleV0gKVxuICAgICAgJiYgKCAhb2JqWyBrZXkgXS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtrZXldLmNvbnN0cnVjdG9yKSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLnR5cGUgfHwgb2JqWyBrZXkgXS50eXBlLnR5cGUgKSApe1xuXG4gICAgICBpZiAoIE9iamVjdC5rZXlzKG9ialsga2V5IF0pLmxlbmd0aCApIHtcbiAgICAgICAgLy8gbmVzdGVkIG9iamVjdCB7IGxhc3Q6IHsgbmFtZTogU3RyaW5nIH19XG4gICAgICAgIHRoaXMubmVzdGVkWyBwcmVmaXggKyBrZXkgXSA9IHRydWU7XG4gICAgICAgIHRoaXMuYWRkKCBvYmpbIGtleSBdLCBwcmVmaXggKyBrZXkgKyAnLicpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApOyAvLyBtaXhlZCB0eXBlXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXRoKCBwcmVmaXggKyBrZXksIG9ialsga2V5IF0gKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogUmVzZXJ2ZWQgZG9jdW1lbnQga2V5cy5cbiAqXG4gKiBLZXlzIGluIHRoaXMgb2JqZWN0IGFyZSBuYW1lcyB0aGF0IGFyZSByZWplY3RlZCBpbiBzY2hlbWEgZGVjbGFyYXRpb25zIGIvYyB0aGV5IGNvbmZsaWN0IHdpdGggbW9uZ29vc2UgZnVuY3Rpb25hbGl0eS4gVXNpbmcgdGhlc2Uga2V5IG5hbWUgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqXG4gKiAgICAgIG9uLCBlbWl0LCBfZXZlbnRzLCBkYiwgZ2V0LCBzZXQsIGluaXQsIGlzTmV3LCBlcnJvcnMsIHNjaGVtYSwgb3B0aW9ucywgX3ByZXMsIF9wb3N0cywgdG9PYmplY3RcbiAqXG4gKiBfTk9URTpfIFVzZSBvZiB0aGVzZSB0ZXJtcyBhcyBtZXRob2QgbmFtZXMgaXMgcGVybWl0dGVkLCBidXQgcGxheSBhdCB5b3VyIG93biByaXNrLCBhcyB0aGV5IG1heSBiZSBleGlzdGluZyBtb25nb29zZSBkb2N1bWVudCBtZXRob2RzIHlvdSBhcmUgc3RvbXBpbmcgb24uXG4gKlxuICogICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgIHNjaGVtYS5tZXRob2RzLmluaXQgPSBmdW5jdGlvbiAoKSB7fSAvLyBwb3RlbnRpYWxseSBicmVha2luZ1xuICovXG5TY2hlbWEucmVzZXJ2ZWQgPSBPYmplY3QuY3JlYXRlKCBudWxsICk7XG52YXIgcmVzZXJ2ZWQgPSBTY2hlbWEucmVzZXJ2ZWQ7XG5yZXNlcnZlZC5vbiA9XG5yZXNlcnZlZC5nZXQgPVxucmVzZXJ2ZWQuc2V0ID1cbnJlc2VydmVkLmluaXQgPVxucmVzZXJ2ZWQuaXNOZXcgPVxucmVzZXJ2ZWQuZXJyb3JzID1cbnJlc2VydmVkLnNjaGVtYSA9XG5yZXNlcnZlZC5vcHRpb25zID1cbnJlc2VydmVkLnRvT2JqZWN0ID1cbnJlc2VydmVkLnRyaWdnZXIgPSAgICAvLyBFdmVudHNcbnJlc2VydmVkLm9mZiA9ICAgIC8vIEV2ZW50c1xucmVzZXJ2ZWQuX2V2ZW50cyA9IC8vIEV2ZW50c1xuXG4vKipcbiAqIEdldHMvc2V0cyBzY2hlbWEgcGF0aHMuXG4gKlxuICogU2V0cyBhIHBhdGggKGlmIGFyaXR5IDIpXG4gKiBHZXRzIGEgcGF0aCAoaWYgYXJpdHkgMSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpIC8vIHJldHVybnMgYSBTY2hlbWFUeXBlXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnLCBOdW1iZXIpIC8vIGNoYW5nZXMgdGhlIHNjaGVtYVR5cGUgb2YgYG5hbWVgIHRvIE51bWJlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgaWYgKG9iaiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnBhdGhzW3BhdGhdO1xuICAgIGlmICh0aGlzLnN1YnBhdGhzW3BhdGhdKSByZXR1cm4gdGhpcy5zdWJwYXRoc1twYXRoXTtcblxuICAgIC8vIHN1YnBhdGhzP1xuICAgIHJldHVybiAvXFwuXFxkK1xcLj8uKiQvLnRlc3QocGF0aClcbiAgICAgID8gZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aClcbiAgICAgIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gc29tZSBwYXRoIG5hbWVzIGNvbmZsaWN0IHdpdGggZG9jdW1lbnQgbWV0aG9kc1xuICBpZiAocmVzZXJ2ZWRbcGF0aF0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2AnICsgcGF0aCArICdgIG1heSBub3QgYmUgdXNlZCBhcyBhIHNjaGVtYSBwYXRobmFtZScpO1xuICB9XG5cbiAgLy8gdXBkYXRlIHRoZSB0cmVlXG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLi8pXG4gICAgLCBsYXN0ID0gc3VicGF0aHMucG9wKClcbiAgICAsIGJyYW5jaCA9IHRoaXMudHJlZTtcblxuICBzdWJwYXRocy5mb3JFYWNoKGZ1bmN0aW9uKHN1YiwgaSkge1xuICAgIGlmICghYnJhbmNoW3N1Yl0pIGJyYW5jaFtzdWJdID0ge307XG4gICAgaWYgKCdvYmplY3QnICE9PSB0eXBlb2YgYnJhbmNoW3N1Yl0pIHtcbiAgICAgIHZhciBtc2cgPSAnQ2Fubm90IHNldCBuZXN0ZWQgcGF0aCBgJyArIHBhdGggKyAnYC4gJ1xuICAgICAgICAgICAgICArICdQYXJlbnQgcGF0aCBgJ1xuICAgICAgICAgICAgICArIHN1YnBhdGhzLnNsaWNlKDAsIGkpLmNvbmNhdChbc3ViXSkuam9pbignLicpXG4gICAgICAgICAgICAgICsgJ2AgYWxyZWFkeSBzZXQgdG8gdHlwZSAnICsgYnJhbmNoW3N1Yl0ubmFtZVxuICAgICAgICAgICAgICArICcuJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2hbc3ViXTtcbiAgfSk7XG5cbiAgYnJhbmNoW2xhc3RdID0gdXRpbHMuY2xvbmUob2JqKTtcblxuICB0aGlzLnBhdGhzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCBvYmopO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdHlwZSBhcmd1bWVudHMgaW50byBTY2hlbWEgVHlwZXMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogY29uc3RydWN0b3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEuaW50ZXJwcmV0QXNUeXBlID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICB2YXIgY29uc3RydWN0b3JOYW1lID0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9iai5jb25zdHJ1Y3Rvcik7XG4gIGlmIChjb25zdHJ1Y3Rvck5hbWUgIT09ICdPYmplY3QnKXtcbiAgICBvYmogPSB7IHR5cGU6IG9iaiB9O1xuICB9XG5cbiAgLy8gR2V0IHRoZSB0eXBlIG1ha2luZyBzdXJlIHRvIGFsbG93IGtleXMgbmFtZWQgXCJ0eXBlXCJcbiAgLy8gYW5kIGRlZmF1bHQgdG8gbWl4ZWQgaWYgbm90IHNwZWNpZmllZC5cbiAgLy8geyB0eXBlOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2ZyZXNoY3V0JyB9IH1cbiAgdmFyIHR5cGUgPSBvYmoudHlwZSAmJiAhb2JqLnR5cGUudHlwZVxuICAgID8gb2JqLnR5cGVcbiAgICA6IHt9O1xuXG4gIGlmICgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUuY29uc3RydWN0b3IpIHx8ICdtaXhlZCcgPT0gdHlwZSkge1xuICAgIHJldHVybiBuZXcgVHlwZXMuTWl4ZWQocGF0aCwgb2JqKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHR5cGUpIHx8IEFycmF5ID09IHR5cGUgfHwgJ2FycmF5JyA9PSB0eXBlKSB7XG4gICAgLy8gaWYgaXQgd2FzIHNwZWNpZmllZCB0aHJvdWdoIHsgdHlwZSB9IGxvb2sgZm9yIGBjYXN0YFxuICAgIHZhciBjYXN0ID0gKEFycmF5ID09IHR5cGUgfHwgJ2FycmF5JyA9PSB0eXBlKVxuICAgICAgPyBvYmouY2FzdFxuICAgICAgOiB0eXBlWzBdO1xuXG4gICAgaWYgKGNhc3QgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBjYXN0LCBvYmopO1xuICAgIH1cblxuICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgY2FzdCkge1xuICAgICAgY2FzdCA9IFR5cGVzW2Nhc3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYXN0LnN1YnN0cmluZygxKV07XG4gICAgfSBlbHNlIGlmIChjYXN0ICYmICghY2FzdC50eXBlIHx8IGNhc3QudHlwZS50eXBlKVxuICAgICAgICAgICAgICAgICAgICAmJiAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGNhc3QuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKGNhc3QpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIG5ldyBTY2hlbWEoY2FzdCksIG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBUeXBlcy5BcnJheShwYXRoLCBjYXN0IHx8IFR5cGVzLk1peGVkLCBvYmopO1xuICB9XG5cbiAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PT0gdHlwZW9mIHR5cGVcbiAgICA/IHR5cGVcbiAgICAvLyBJZiBub3Qgc3RyaW5nLCBgdHlwZWAgaXMgYSBmdW5jdGlvbi4gT3V0c2lkZSBvZiBJRSwgZnVuY3Rpb24ubmFtZVxuICAgIC8vIGdpdmVzIHlvdSB0aGUgZnVuY3Rpb24gbmFtZS4gSW4gSUUsIHlvdSBuZWVkIHRvIGNvbXB1dGUgaXRcbiAgICA6IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlKTtcblxuICBpZiAobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09IFR5cGVzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5kZWZpbmVkIHR5cGUgYXQgYCcgKyBwYXRoICtcbiAgICAgICAgJ2BcXG4gIERpZCB5b3UgdHJ5IG5lc3RpbmcgU2NoZW1hcz8gJyArXG4gICAgICAgICdZb3UgY2FuIG9ubHkgbmVzdCB1c2luZyByZWZzIG9yIGFycmF5cy4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgVHlwZXNbbmFtZV0ocGF0aCwgb2JqKTtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhlIHNjaGVtYXMgcGF0aHMgc2ltaWxhciB0byBBcnJheSNmb3JFYWNoLlxuICpcbiAqIFRoZSBjYWxsYmFjayBpcyBwYXNzZWQgdGhlIHBhdGhuYW1lIGFuZCBzY2hlbWFUeXBlIGFzIGFyZ3VtZW50cyBvbiBlYWNoIGl0ZXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybiB7U2NoZW1hfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmVhY2hQYXRoID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBmbihrZXlzW2ldLCB0aGlzLnBhdGhzW2tleXNbaV1dKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIEFycmF5IG9mIHBhdGggc3RyaW5ncyB0aGF0IGFyZSByZXF1aXJlZCBieSB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblNjaGVtYS5wcm90b3R5cGUucmVxdWlyZWRQYXRocyA9IGZ1bmN0aW9uIHJlcXVpcmVkUGF0aHMgKCkge1xuICBpZiAodGhpcy5fcmVxdWlyZWRwYXRocykgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHJldCA9IFtdO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIgcGF0aCA9IHBhdGhzW2ldO1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdLmlzUmVxdWlyZWQpIHJldC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHJldDtcblxuICByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGF0aFR5cGUgb2YgYHBhdGhgIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBHaXZlbiBhIHBhdGgsIHJldHVybnMgd2hldGhlciBpdCBpcyBhIHJlYWwsIHZpcnR1YWwsIG5lc3RlZCwgb3IgYWQtaG9jL3VuZGVmaW5lZCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhUeXBlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKHBhdGggaW4gdGhpcy5wYXRocykgcmV0dXJuICdyZWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy52aXJ0dWFscykgcmV0dXJuICd2aXJ0dWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy5uZXN0ZWQpIHJldHVybiAnbmVzdGVkJztcbiAgaWYgKHBhdGggaW4gdGhpcy5zdWJwYXRocykgcmV0dXJuICdyZWFsJztcblxuICBpZiAoL1xcLlxcZCtcXC58XFwuXFxkKyQvLnRlc3QocGF0aCkgJiYgZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aCkpIHtcbiAgICByZXR1cm4gJ3JlYWwnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnYWRob2NPclVuZGVmaW5lZCc7XG4gIH1cbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGdldFBvc2l0aW9uYWxQYXRoIChzZWxmLCBwYXRoKSB7XG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLihcXGQrKVxcLnxcXC4oXFxkKykkLykuZmlsdGVyKEJvb2xlYW4pO1xuICBpZiAoc3VicGF0aHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBzZWxmLnBhdGhzW3N1YnBhdGhzWzBdXTtcbiAgfVxuXG4gIHZhciB2YWwgPSBzZWxmLnBhdGgoc3VicGF0aHNbMF0pO1xuICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcblxuICB2YXIgbGFzdCA9IHN1YnBhdGhzLmxlbmd0aCAtIDFcbiAgICAsIHN1YnBhdGhcbiAgICAsIGkgPSAxO1xuXG4gIGZvciAoOyBpIDwgc3VicGF0aHMubGVuZ3RoOyArK2kpIHtcbiAgICBzdWJwYXRoID0gc3VicGF0aHNbaV07XG5cbiAgICBpZiAoaSA9PT0gbGFzdCAmJiB2YWwgJiYgIXZhbC5zY2hlbWEgJiYgIS9cXEQvLnRlc3Qoc3VicGF0aCkpIHtcbiAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBUeXBlcy5BcnJheSkge1xuICAgICAgICAvLyBTdHJpbmdTY2hlbWEsIE51bWJlclNjaGVtYSwgZXRjXG4gICAgICAgIHZhbCA9IHZhbC5jYXN0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgaWYgaXRzIGp1c3QgYSBwb3NpdGlvbiBzZWdtZW50OiBwYXRoLjAuc3VicGF0aFxuICAgIGlmICghL1xcRC8udGVzdChzdWJwYXRoKSkgY29udGludWU7XG5cbiAgICBpZiAoISh2YWwgJiYgdmFsLnNjaGVtYSkpIHtcbiAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhbCA9IHZhbC5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgfVxuXG4gIHNlbGYuc3VicGF0aHNbIHBhdGggXSA9IHZhbDtcblxuICByZXR1cm4gc2VsZi5zdWJwYXRoc1sgcGF0aCBdO1xufVxuXG4vKipcbiAqIEFkZHMgYSBtZXRob2QgY2FsbCB0byB0aGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgZG9jdW1lbnQgbWV0aG9kIHRvIGNhbGwgbGF0ZXJcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucXVldWUgPSBmdW5jdGlvbihuYW1lLCBhcmdzKXtcbiAgdGhpcy5jYWxsUXVldWUucHVzaChbbmFtZSwgYXJnc10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHByZSBob29rIGZvciB0aGUgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHRveVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCdzYXZlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB0aGlzLmNyZWF0ZWQgPSBuZXcgRGF0ZTtcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCd2YWxpZGF0ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gKiAgICAgICBpZiAodGhpcy5uYW1lICE9ICdXb29keScpIHRoaXMubmFtZSA9ICdXb29keSc7XG4gKiAgICAgICBuZXh0KCk7XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnByZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdwcmUnLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcG9zdCBmb3IgdGhlIGRvY3VtZW50XG4gKlxuICogUG9zdCBob29rcyBmaXJlIGBvbmAgdGhlIGV2ZW50IGVtaXR0ZWQgZnJvbSBkb2N1bWVudCBpbnN0YW5jZXMgb2YgTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEucG9zdCgnc2F2ZScsIGZ1bmN0aW9uIChkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVkIGFmdGVyIGEgZG9jdW1lbnQgd2FzIHNhdmVkJyk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKCdNb2RlbCcsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBtID0gbmV3IE1vZGVsKC4uKTtcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZXMgYWZ0ZXIgdGhlIGBwb3N0YCBob29rJyk7XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaG9va1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2tcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24obWV0aG9kLCBmbil7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdvbicsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIHBsdWdpbiBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGx1Z2luIGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQHNlZSBwbHVnaW5zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBsdWdpbiA9IGZ1bmN0aW9uIChmbiwgb3B0cykge1xuICBmbih0aGlzLCBvcHRzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gaW5zdGFuY2UgbWV0aG9kIHRvIGRvY3VtZW50cyBjb25zdHJ1Y3RlZCBmcm9tIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBraXR0eVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKCdtZW93JywgZnVuY3Rpb24gKCkge1xuICogICAgICAgY29uc29sZS5sb2coJ21lZWVlZW9vb29vb29vb29vb3cnKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgS2l0dHkgPSBtb25nb29zZS5tb2RlbCgnS2l0dHknLCBzY2hlbWEpO1xuICpcbiAqICAgICB2YXIgZml6eiA9IG5ldyBLaXR0eTtcbiAqICAgICBmaXp6Lm1lb3coKTsgLy8gbWVlZWVlb29vb29vb29vb29vb3dcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgbWV0aG9kcy5cbiAqXG4gKiAgICAgc2NoZW1hLm1ldGhvZCh7XG4gKiAgICAgICAgIHB1cnI6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgICAsIHNjcmF0Y2g6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGxhdGVyXG4gKiAgICAgZml6ei5wdXJyKCk7XG4gKiAgICAgZml6ei5zY3JhdGNoKCk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBtZXRob2QgbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgbmFtZSkge1xuICAgIGZvciAodmFyIGkgaW4gbmFtZSkge1xuICAgICAgdGhpcy5tZXRob2RzW2ldID0gbmFtZVtpXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tZXRob2RzW25hbWVdID0gZm47XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBzdGF0aWMgXCJjbGFzc1wiIG1ldGhvZHMgdG8gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5zdGF0aWMoJ2ZpbmRCeU5hbWUnLCBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmZpbmQoeyBuYW1lOiBuYW1lIH0sIGNhbGxiYWNrKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIERyaW5rID0gbW9uZ29vc2UubW9kZWwoJ0RyaW5rJywgc2NoZW1hKTtcbiAqICAgICBEcmluay5maW5kQnlOYW1lKCdzYW5wZWxsZWdyaW5vJywgZnVuY3Rpb24gKGVyciwgZHJpbmtzKSB7XG4gKiAgICAgICAvL1xuICogICAgIH0pO1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBzdGF0aWNzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5zdGF0aWMgPSBmdW5jdGlvbihuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBuYW1lKSB7XG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKSB7XG4gICAgICB0aGlzLnN0YXRpY3NbaV0gPSBuYW1lW2ldO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLnN0YXRpY3NbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzL2dldHMgYSBzY2hlbWEgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uIG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGlmIG5vdCBwYXNzZWQsIHRoZSBjdXJyZW50IG9wdGlvbiB2YWx1ZSBpcyByZXR1cm5lZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcbiAgfVxuXG4gIHRoaXMub3B0aW9uc1trZXldID0gdmFsdWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgYSBzY2hlbWEgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uIG5hbWVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWwgPSBmdW5jdGlvbiAobmFtZSwgb3B0aW9ucykge1xuICB2YXIgdmlydHVhbHMgPSB0aGlzLnZpcnR1YWxzO1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCcuJyk7XG5cbiAgdmlydHVhbHNbbmFtZV0gPSBwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKG1lbSwgcGFydCwgaSkge1xuICAgIG1lbVtwYXJ0XSB8fCAobWVtW3BhcnRdID0gKGkgPT09IHBhcnRzLmxlbmd0aC0xKVxuICAgICAgPyBuZXcgVmlydHVhbFR5cGUob3B0aW9ucywgbmFtZSlcbiAgICAgIDoge30pO1xuICAgIHJldHVybiBtZW1bcGFydF07XG4gIH0sIHRoaXMudHJlZSk7XG5cbiAgcmV0dXJuIHZpcnR1YWxzW25hbWVdO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2aXJ0dWFsIHR5cGUgd2l0aCB0aGUgZ2l2ZW4gYG5hbWVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWxwYXRoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMudmlydHVhbHNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyZWQgZGlzY3JpbWluYXRvcnMgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEBwcm9wZXJ0eSBkaXNjcmltaW5hdG9yc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLmRpc2NyaW1pbmF0b3JzO1xuXG4vKipcbiAqIFNjaGVtYSBpbmhlcml0YW5jZVxuICogdGhpcyAtIGJhc2VTY2hlbWFcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB2YXIgUGVyc29uU2NoZW1hID0gbmV3IFNjaGVtYSgnUGVyc29uJywge1xuICogICAgICAgbmFtZTogU3RyaW5nLFxuICogICAgICAgY3JlYXRlZEF0OiBEYXRlXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBCb3NzU2NoZW1hID0gbmV3IFNjaGVtYSgnQm9zcycsIFBlcnNvblNjaGVtYSwgeyBkZXBhcnRtZW50OiBTdHJpbmcgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgICBkaXNjcmltaW5hdG9yIG5hbWVcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgZGlzY3JpbWluYXRvciBzY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZGlzY3JpbWluYXRvciA9IGZ1bmN0aW9uIGRpc2NyaW1pbmF0b3IgKG5hbWUsIHNjaGVtYSkge1xuICBpZiAoIShzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwYXNzIGEgdmFsaWQgZGlzY3JpbWluYXRvciBTY2hlbWEnKTtcbiAgfVxuXG4gIGlmICggdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyAmJiAhdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3QgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEaXNjcmltaW5hdG9yIFwiJyArIG5hbWUgKyAnXCIgY2FuIG9ubHkgYmUgYSBkaXNjcmltaW5hdG9yIG9mIHRoZSByb290IG1vZGVsJyk7XG4gIH1cblxuICB2YXIga2V5ID0gdGhpcy5vcHRpb25zLmRpc2NyaW1pbmF0b3JLZXk7XG4gIGlmICggc2NoZW1hLnBhdGgoa2V5KSApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Rpc2NyaW1pbmF0b3IgXCInICsgbmFtZSArICdcIiBjYW5ub3QgaGF2ZSBmaWVsZCB3aXRoIG5hbWUgXCInICsga2V5ICsgJ1wiJyk7XG4gIH1cblxuICAvLyBtZXJnZXMgYmFzZSBzY2hlbWEgaW50byBuZXcgZGlzY3JpbWluYXRvciBzY2hlbWEgYW5kIHNldHMgbmV3IHR5cGUgZmllbGQuXG4gIChmdW5jdGlvbiBtZXJnZVNjaGVtYXMoc2NoZW1hLCBiYXNlU2NoZW1hKSB7XG4gICAgdXRpbHMubWVyZ2Uoc2NoZW1hLCBiYXNlU2NoZW1hKTtcblxuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmpba2V5XSA9IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiBuYW1lIH07XG4gICAgc2NoZW1hLmFkZChvYmopO1xuICAgIHNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBuYW1lLCBpc1Jvb3Q6IGZhbHNlIH07XG5cbiAgICAgIC8vIHRocm93cyBlcnJvciBpZiBvcHRpb25zIGFyZSBpbnZhbGlkXG4gICAgKGZ1bmN0aW9uIHZhbGlkYXRlT3B0aW9ucyhhLCBiKSB7XG4gICAgICBhID0gdXRpbHMuY2xvbmUoYSk7XG4gICAgICBiID0gdXRpbHMuY2xvbmUoYik7XG4gICAgICBkZWxldGUgYS50b0pTT047XG4gICAgICBkZWxldGUgYS50b09iamVjdDtcbiAgICAgIGRlbGV0ZSBiLnRvSlNPTjtcbiAgICAgIGRlbGV0ZSBiLnRvT2JqZWN0O1xuXG4gICAgICBpZiAoIXV0aWxzLmRlZXBFcXVhbChhLCBiKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Rpc2NyaW1pbmF0b3Igb3B0aW9ucyBhcmUgbm90IGN1c3RvbWl6YWJsZSAoZXhjZXB0IHRvSlNPTiAmIHRvT2JqZWN0KScpO1xuICAgICAgfVxuICAgIH0pKHNjaGVtYS5vcHRpb25zLCBiYXNlU2NoZW1hLm9wdGlvbnMpO1xuXG4gICAgdmFyIHRvSlNPTiA9IHNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgLCB0b09iamVjdCA9IHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuXG4gICAgc2NoZW1hLm9wdGlvbnMgPSB1dGlscy5jbG9uZShiYXNlU2NoZW1hLm9wdGlvbnMpO1xuICAgIGlmICh0b0pTT04pICAgc2NoZW1hLm9wdGlvbnMudG9KU09OID0gdG9KU09OO1xuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcblxuICAgIC8vc2NoZW1hLmNhbGxRdWV1ZSA9IGJhc2VTY2hlbWEuY2FsbFF1ZXVlLmNvbmNhdChzY2hlbWEuY2FsbFF1ZXVlKTtcbiAgICBzY2hlbWEuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7IC8vIHJlc2V0IGp1c3QgaW4gY2FzZSBTY2hlbWEjcmVxdWlyZWRQYXRocygpIHdhcyBjYWxsZWQgb24gZWl0aGVyIHNjaGVtYVxuICB9KShzY2hlbWEsIHRoaXMpO1xuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9ycykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvcnMgPSB7fTtcbiAgfVxuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbnVsbCwgaXNSb290OiB0cnVlIH07XG4gIH1cblxuICBpZiAodGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGlzY3JpbWluYXRvciB3aXRoIG5hbWUgXCInICsgbmFtZSArICdcIiBhbHJlYWR5IGV4aXN0cycpO1xuICB9XG5cbiAgdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSA9IHNjaGVtYTtcblxuICAvLyBSZWdpc3RlciBtZXRob2RzIGFuZCBzdGF0aWNzXG4gIGZvciAoIHZhciBtIGluIHRoaXMubWV0aG9kcyApe1xuICAgIHNjaGVtYS5tZXRob2RzWyBtIF0gPSB0aGlzLm1ldGhvZHNbIG0gXTtcbiAgfVxuICBmb3IgKCB2YXIgcyBpbiB0aGlzLnN0YXRpY3MgKXtcbiAgICBzY2hlbWEuc3RhdGljc1sgcyBdID0gdGhpcy5tZXRob2RzWyBzIF07XG4gIH1cblxuICByZXR1cm4gdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hO1xud2luZG93LlNjaGVtYSA9IFNjaGVtYTtcblxuLy8gcmVxdWlyZSBkb3duIGhlcmUgYmVjYXVzZSBvZiByZWZlcmVuY2UgaXNzdWVzXG5cbi8qKlxuICogVGhlIHZhcmlvdXMgYnVpbHQtaW4gU3RvcmFnZSBTY2hlbWEgVHlwZXMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIE9iamVjdElkID0gbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk9iamVjdElkO1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtTdHJpbmddKCNzY2hlbWEtc3RyaW5nLWpzKVxuICogLSBbTnVtYmVyXSgjc2NoZW1hLW51bWJlci1qcylcbiAqIC0gW0Jvb2xlYW5dKCNzY2hlbWEtYm9vbGVhbi1qcykgfCBCb29sXG4gKiAtIFtBcnJheV0oI3NjaGVtYS1hcnJheS1qcylcbiAqIC0gW0RhdGVdKCNzY2hlbWEtZGF0ZS1qcylcbiAqIC0gW09iamVjdElkXSgjc2NoZW1hLW9iamVjdGlkLWpzKSB8IE9pZFxuICogLSBbTWl4ZWRdKCNzY2hlbWEtbWl4ZWQtanMpIHwgT2JqZWN0XG4gKlxuICogVXNpbmcgdGhpcyBleHBvc2VkIGFjY2VzcyB0byB0aGUgYE1peGVkYCBTY2hlbWFUeXBlLCB3ZSBjYW4gdXNlIHRoZW0gaW4gb3VyIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIE1peGVkID0gbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk1peGVkO1xuICogICAgIG5ldyBtb25nb29zZS5TY2hlbWEoeyBfdXNlcjogTWl4ZWQgfSlcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuVHlwZXMgPSByZXF1aXJlKCcuL3NjaGVtYS9pbmRleCcpO1xuXG4vLyDQpdGA0LDQvdC40LvQuNGJ0LUg0YHRhdC10LxcblNjaGVtYS5zY2hlbWFzID0gc2NoZW1hcyA9IHt9O1xuXG5cbi8qIVxuICogaWdub3JlXG4gKi9cblxuVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5TY2hlbWEuT2JqZWN0SWQgPSBUeXBlcy5PYmplY3RJZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgVHlwZXMgPSB7XG4gICAgICAgIEJvb2xlYW46IHJlcXVpcmUoJy4vYm9vbGVhbicpXG4gICAgICAsIERhdGU6IHJlcXVpcmUoJy4vZGF0ZScpXG4gICAgICAsIE51bWJlcjogcmVxdWlyZSgnLi9udW1iZXInKVxuICAgICAgLCBTdHJpbmc6IHJlcXVpcmUoJy4vc3RyaW5nJylcbiAgICAgICwgT2JqZWN0SWQ6IHJlcXVpcmUoJy4vb2JqZWN0aWQnKVxuICAgICAgLCBCdWZmZXI6IHJlcXVpcmUoJy4vYnVmZmVyJylcbiAgICB9XG4gICwgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi4vdHlwZXMvYXJyYXknKVxuICAsIE1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG4gICwgRW1iZWRkZWREb2M7XG5cbi8qKlxuICogQXJyYXkgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gY2FzdFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gU2NoZW1hQXJyYXkgKGtleSwgY2FzdCwgb3B0aW9ucykge1xuICBpZiAoY2FzdCkge1xuICAgIHZhciBjYXN0T3B0aW9ucyA9IHt9O1xuXG4gICAgaWYgKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QuY29uc3RydWN0b3IgKSApIHtcbiAgICAgIGlmIChjYXN0LnR5cGUpIHtcbiAgICAgICAgLy8gc3VwcG9ydCB7IHR5cGU6IFdvb3QgfVxuICAgICAgICBjYXN0T3B0aW9ucyA9IF8uY2xvbmUoIGNhc3QgKTsgLy8gZG8gbm90IGFsdGVyIHVzZXIgYXJndW1lbnRzXG4gICAgICAgIGRlbGV0ZSBjYXN0T3B0aW9ucy50eXBlO1xuICAgICAgICBjYXN0ID0gY2FzdC50eXBlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FzdCA9IE1peGVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHN1cHBvcnQgeyB0eXBlOiAnU3RyaW5nJyB9XG4gICAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PT0gdHlwZW9mIGNhc3RcbiAgICAgID8gY2FzdFxuICAgICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QgKTtcblxuICAgIHZhciBDYXN0ZXIgPSBuYW1lIGluIFR5cGVzXG4gICAgICA/IFR5cGVzW25hbWVdXG4gICAgICA6IGNhc3Q7XG5cbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gQ2FzdGVyO1xuICAgIHRoaXMuY2FzdGVyID0gbmV3IENhc3RlcihudWxsLCBjYXN0T3B0aW9ucyk7XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBFbWJlZGRlZERvYyB8fCAoRW1iZWRkZWREb2MgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpKTtcblxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XG4gICAgICB0aGlzLmNhc3Rlci5wYXRoID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xuXG4gIHZhciBzZWxmID0gdGhpc1xuICAgICwgZGVmYXVsdEFyclxuICAgICwgZm47XG5cbiAgaWYgKHRoaXMuZGVmYXVsdFZhbHVlKSB7XG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuICAgIGZuID0gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRlZmF1bHRBcnI7XG4gIH1cblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4gPyBkZWZhdWx0QXJyKCkgOiBkZWZhdWx0QXJyIHx8IFtdO1xuICAgIHJldHVybiBuZXcgU3RvcmFnZUFycmF5KGFyciwgc2VsZi5wYXRoLCB0aGlzKTtcbiAgfSk7XG59XG5cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2hlbWFBcnJheTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLmxlbmd0aCk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyB0aGUgZ2V0dGVycyBhcHBsaWNhdGlvbiBmb3IgdGhlIHBvcHVsYXRpb24gc3BlY2lhbC1jYXNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICBpZiAodGhpcy5jYXN0ZXIub3B0aW9ucyAmJiB0aGlzLmNhc3Rlci5vcHRpb25zLnJlZikge1xuICAgIC8vIG1lYW5zIHRoZSBvYmplY3QgaWQgd2FzIHBvcHVsYXRlZFxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBTY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMuY2FsbCh0aGlzLCB2YWx1ZSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyB2YWx1ZXMgZm9yIHNldCgpLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGRvY3VtZW50IHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCB3aGV0aGVyIHRoaXMgaXMgYW4gaW5pdGlhbGl6YXRpb24gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSwgZG9jLCBpbml0ICkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VBcnJheSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhc3Rlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YWx1ZVtpXSA9IHRoaXMuY2FzdGVyLmNhc3QodmFsdWVbaV0sIGRvYywgaW5pdCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gcmV0aHJvd1xuICAgICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKGUudHlwZSwgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0KTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYUFycmF5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogQm9vbGVhbiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBwYXRoLCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9vbGVhblNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgU3RvcmFnZUJ1ZmZlciA9IHJlcXVpcmUoJy4uL3R5cGVzJykuQnVmZmVyXG4gICwgQmluYXJ5ID0gU3RvcmFnZUJ1ZmZlci5CaW5hcnlcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBCdWZmZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gY2FzdFxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFNjaGVtYUJ1ZmZlciAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdCdWZmZXInKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblNjaGVtYUJ1ZmZlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuU2NoZW1hQnVmZmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUJ1ZmZlcjtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNjaGVtYUJ1ZmZlci5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5sZW5ndGgpO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TY2hlbWFCdWZmZXIucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUsIGRvYywgaW5pdCkge1xuICB2YXIgcmV0O1xuXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCBpbml0KSkge1xuICAgIC8vIHdhaXQhIHdlIG1heSBuZWVkIHRvIGNhc3QgdGhpcyB0byBhIGRvY3VtZW50XG5cbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIGxhenkgbG9hZFxuICAgIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vLi4vZG9jdW1lbnQnKSk7XG5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgdmFsdWUuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gc2V0dGluZyBhIHBvcHVsYXRlZCBwYXRoXG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCFfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignYnVmZmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHVzZXIgZGlyZWN0bHkgc2V0cyBhIHBvcHVsYXRlZFxuICAgIC8vIHBhdGggdG8gYSBwbGFpbiBvYmplY3Q7IGNhc3QgdG8gdGhlIE1vZGVsIHVzZWQgaW5cbiAgICAvLyB0aGUgcG9wdWxhdGlvbiBxdWVyeS5cbiAgICB2YXIgcGF0aCA9IGRvYy4kX19mdWxsUGF0aCh0aGlzLnBhdGgpO1xuICAgIHZhciBvd25lciA9IGRvYy5vd25lckRvY3VtZW50ID8gZG9jLm93bmVyRG9jdW1lbnQoKSA6IGRvYztcbiAgICB2YXIgcG9wID0gb3duZXIucG9wdWxhdGVkKHBhdGgsIHRydWUpO1xuICAgIHJldCA9IG5ldyBwb3Aub3B0aW9ucy5tb2RlbCh2YWx1ZSk7XG4gICAgcmV0LiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBkb2N1bWVudHNcbiAgaWYgKHZhbHVlICYmIHZhbHVlLl9pZCkge1xuICAgIHZhbHVlID0gdmFsdWUuX2lkO1xuICB9XG5cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWx1ZSkpIHtcbiAgICBpZiAoIXZhbHVlIHx8ICF2YWx1ZS5pc1N0b3JhZ2VCdWZmZXIpIHtcbiAgICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VCdWZmZXIodmFsdWUsIFt0aGlzLnBhdGgsIGRvY10pO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEJpbmFyeSkge1xuICAgIHJldCA9IG5ldyBTdG9yYWdlQnVmZmVyKHZhbHVlLnZhbHVlKHRydWUpLCBbdGhpcy5wYXRoLCBkb2NdKTtcbiAgICByZXQuc3VidHlwZSh2YWx1ZS5zdWJfdHlwZSk7XG4gICAgLy8gZG8gbm90IG92ZXJyaWRlIEJpbmFyeSBzdWJ0eXBlcy4gdXNlcnMgc2V0IHRoaXNcbiAgICAvLyB0byB3aGF0ZXZlciB0aGV5IHdhbnQuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGlmIChudWxsID09PSB2YWx1ZSkgcmV0dXJuIHZhbHVlO1xuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICBpZiAoJ3N0cmluZycgPT09IHR5cGUgfHwgJ251bWJlcicgPT09IHR5cGUgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXQgPSBuZXcgU3RvcmFnZUJ1ZmZlcih2YWx1ZSwgW3RoaXMucGF0aCwgZG9jXSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ2J1ZmZlcicsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYUJ1ZmZlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xudmFyIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yO1xuXG4vKipcbiAqIERhdGUgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIERhdGVTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkRhdGVTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGF0ZVNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIGRhdGVcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBEYXRlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBkYXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgZGF0ZTtcblxuICAvLyBzdXBwb3J0IGZvciB0aW1lc3RhbXBzXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSkge1xuXG4gICAgZGF0ZSA9IG5ldyBEYXRlKE51bWJlcih2YWx1ZSkpO1xuXG4gIC8vIHN1cHBvcnQgZm9yIGRhdGUgc3RyaW5nc1xuICB9IGVsc2UgaWYgKHZhbHVlLnRvU3RyaW5nKSB7XG4gICAgZGF0ZSA9IG5ldyBEYXRlKHZhbHVlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKGRhdGUudG9TdHJpbmcoKSAhPSAnSW52YWxpZCBEYXRlJykge1xuICAgIHJldHVybiBkYXRlO1xuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignZGF0ZScsIHZhbHVlLCB0aGlzLnBhdGggKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlU2NoZW1hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBBcnJheVR5cGUgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBTdG9yYWdlRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2RvY3VtZW50YXJyYXknKVxuICAsIFN1YmRvY3VtZW50ID0gcmVxdWlyZSgnLi4vdHlwZXMvZW1iZWRkZWQnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKVxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaiBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbal0gPSBzY2hlbWEuc3RhdGljc1tqXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50QXJyYXk7XG5cbi8qKlxuICogUGVyZm9ybXMgbG9jYWwgdmFsaWRhdGlvbnMgZmlyc3QsIHRoZW4gdmFsaWRhdGlvbnMgb24gZWFjaCBlbWJlZGRlZCBkb2NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgZm4sIHNjb3BlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBTY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlLmNhbGwodGhpcywgYXJyYXksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcblxuICAgIHZhciBjb3VudCA9IGFycmF5ICYmIGFycmF5Lmxlbmd0aFxuICAgICAgLCBlcnJvcjtcblxuICAgIGlmICghY291bnQpIHJldHVybiBmbigpO1xuXG4gICAgLy8gaGFuZGxlIHNwYXJzZSBhcnJheXMsIGRvIG5vdCB1c2UgYXJyYXkuZm9yRWFjaCB3aGljaCBkb2VzIG5vdFxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzcGFyc2UgZWxlbWVudHMgeWV0IHJlcG9ydHMgYXJyYXkubGVuZ3RoIGluY2x1ZGluZ1xuICAgIC8vIHRoZW0gOihcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgIShmdW5jdGlvbiAoaSkge1xuICAgICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XG4gICAgICAgICAgICAvLyByZXdyaXRlIHRoZSBrZXlcbiAgICAgICAgICAgIGVyci5rZXkgPSBzZWxmLmtleSArICcuJyArIGkgKyAnLicgKyBlcnIua2V5O1xuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKGkpO1xuICAgIH1cbiAgfSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyBjb250ZW50c1xuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyB0aGF0IHRyaWdnZXJzIHRoZSBjYXN0aW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXQgZmxhZ1xuICogQHBhcmFtIHtEb2N1bWVudEFycmF5fSBwcmV2XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jLCBpbml0LCBwcmV2KSB7XG4gIHZhciBzZWxlY3RlZFxuICAgICwgc3ViZG9jXG4gICAgLCBpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCwgcHJldik7XG4gIH1cblxuICAvLyDQldGB0LvQuCDQtNCy0LAg0LzQsNGB0YHQuNCy0LAg0L/RgNC40LzQtdGA0L3QviAo0LrRgNC+0LzQtSBfaWQpINC+0LTQuNC90LDQutC+0LLRi9C1IC0g0L3QtSDQvdCw0LTQviDQv9C10YDQtdC30LDQv9C40YHRi9Cy0LDRgtGMXG4gIGlmICggcHJldiAmJiBhcHByb3hpbWF0ZWx5RXF1YWwoIHZhbHVlLCBwcmV2ICkgKXtcbiAgICByZXR1cm4gcHJldjtcbiAgfVxuXG4gIGlmICghKHZhbHVlLmlzU3RvcmFnZURvY3VtZW50QXJyYXkpKSB7XG4gICAgdmFsdWUgPSBuZXcgU3RvcmFnZURvY3VtZW50QXJyYXkodmFsdWUsIHRoaXMucGF0aCwgZG9jKTtcbiAgICBpZiAocHJldiAmJiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByZXYuX2hhbmRsZXJzKSB7XG4gICAgICAgIGRvYy5vZmYoa2V5LCBwcmV2Ll9oYW5kbGVyc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpID0gdmFsdWUubGVuZ3RoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBpZiAoISh2YWx1ZVtpXSBpbnN0YW5jZW9mIFN1YmRvY3VtZW50KSAmJiB2YWx1ZVtpXSkge1xuICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XG4gICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKG51bGwsIHZhbHVlLCB0cnVlLCBzZWxlY3RlZCk7XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jLmluaXQodmFsdWVbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzdWJkb2MgPSBwcmV2LmlkKHZhbHVlW2ldLl9pZCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cblxuICAgICAgICBpZiAocHJldiAmJiBzdWJkb2MpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxuICAgICAgICAgIC8vIGRvYy5hcnJheSA9IFt7IGRvYzogJ3ZhbCcgfV1cbiAgICAgICAgICBzdWJkb2Muc2V0KHZhbHVlW2ldKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZVtpXSwgdmFsdWUpO1xuXG4gICAgICAgICAgcmVzdG9yZVBvcHVsYXRlZEZpZWxkcyggc3ViZG9jLCB0aGlzLnNjaGVtYS50cmVlLCB2YWx1ZVtpXSwgcHJldiApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc2V0KCkgaXMgaG9va2VkIGl0IHdpbGwgaGF2ZSBubyByZXR1cm4gdmFsdWVcbiAgICAgICAgLy8gc2VlIGdoLTc0NlxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqINCf0YDQuNCx0LvQuNC30LjRgtC10LvRjNC90L7QtSDRgdGA0LDQstC90LXQvdC40LUg0LTQstGD0YUg0LzQsNGB0YHQuNCy0L7QslxuICpcbiAqINCt0YLQviDQvdGD0LbQvdC+INC00LvRjyBwb3B1bGF0ZWQg0L/QvtC70LXQuSAtINC40YUg0LzRiyDQv9GA0LXQvtCx0YDQsNC30L7QstGL0LLQsNC10Lwg0LIgaWQuXG4gKlxuICog0KLQsNC6INC20LUg0LIg0YHRgNCw0LLQvdC10L3QuNC4INC90LUg0YPRh9Cw0YHRgtCy0YPQtdGCIGlkINGB0YPRidC10YHRgtCy0YPRjtGJ0LjRhSBFbWJlZGRlZCDQtNC+0LrRg9C80LXQvdGC0L7QsixcbiAqINCV0YHQu9C4INC90LAg0YHQtdGA0LLQtdGA0LUgX2lkOiBmYWxzZSwg0LAg0L3QsCDQutC70LjQtdC90YLQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQtdGB0YLRjCBfaWQuXG4gKlxuICogQHBhcmFtIHZhbHVlXG4gKiBAcGFyYW0gcHJldlxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGFwcHJveGltYXRlbHlFcXVhbCAoIHZhbHVlLCBwcmV2ICkge1xuICBwcmV2ID0gcHJldi50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pO1xuXG4gIC8vINCd0LUg0YHRgNCw0LLQvdC40LLQsNGC0Ywg0L/QviBzdWJkb2MgX2lkXG4gIHZhciBpID0gdmFsdWUubGVuZ3RoO1xuICBpZiAoIGkgPT09IHByZXYubGVuZ3RoICl7XG4gICAgXy5mb3JFYWNoKCB2YWx1ZSwgZnVuY3Rpb24oIHN1YmRvYywgaSApe1xuICAgICAgaWYgKCAhc3ViZG9jLl9pZCApe1xuICAgICAgICBkZWxldGUgcHJldlsgaSBdLl9pZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB1dGlscy5kZWVwRXF1YWwoIHZhbHVlLCBwcmV2ICk7XG59XG5cbi8qIVxuICogUmVzdG9yZSBwb3B1bGF0aW9uXG4gKlxuICogQHBhcmFtIHsqfSBzdWJkb2NcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWFUcmVlXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IHByZXZcbiAqL1xuZnVuY3Rpb24gcmVzdG9yZVBvcHVsYXRlZEZpZWxkcyAoIHN1YmRvYywgc2NoZW1hVHJlZSwgdmFsdWUsIHByZXYgKSB7XG4gIHZhciBwcm9wcztcbiAgXy5mb3JFYWNoKCBzY2hlbWFUcmVlLCBmdW5jdGlvbiggcHJvcCwga2V5ICl7XG4gICAgdmFyIGN1clZhbDtcblxuICAgIGlmICggcHJvcC5yZWYgKXtcbiAgICAgIHByb3BzID0ge307XG4gICAgICBjdXJWYWwgPSB2YWx1ZVsga2V5IF07XG5cbiAgICAgIGlmICggY3VyVmFsICYmIG9pZC5pc1ZhbGlkKCBjdXJWYWwgKSApe1xuXG4gICAgICAgIF8uZm9yRWFjaCggcHJldiwgZnVuY3Rpb24oIHByZXZEb2MgKXtcbiAgICAgICAgICB2YXIgcHJldkRvY1Byb3AgPSBwcmV2RG9jWyBrZXkgXTtcblxuICAgICAgICAgIGlmICggcHJldkRvY1Byb3AgaW5zdGFuY2VvZiBEb2N1bWVudCApe1xuICAgICAgICAgICAgaWYgKCBwcmV2RG9jUHJvcC5faWQuZXF1YWxzKCBjdXJWYWwgKSApe1xuICAgICAgICAgICAgICBzdWJkb2NbIGtleSBdID0gcHJldkRvY1Byb3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50QXJyYXk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5TdHJpbmcgPSByZXF1aXJlKCcuL3N0cmluZycpO1xuXG5leHBvcnRzLk51bWJlciA9IHJlcXVpcmUoJy4vbnVtYmVyJyk7XG5cbmV4cG9ydHMuQm9vbGVhbiA9IHJlcXVpcmUoJy4vYm9vbGVhbicpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxuZXhwb3J0cy5CdWZmZXIgPSByZXF1aXJlKCcuL2J1ZmZlcicpO1xuXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcblxuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuZXhwb3J0cy5NaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKTtcblxuLy8gYWxpYXNcblxuZXhwb3J0cy5PaWQgPSBleHBvcnRzLk9iamVjdElkO1xuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xuZXhwb3J0cy5Cb29sID0gZXhwb3J0cy5Cb29sZWFuO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogTWl4ZWQgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gTWl4ZWQgKHBhdGgsIG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZWZhdWx0KSB7XG4gICAgdmFyIGRlZiA9IG9wdGlvbnMuZGVmYXVsdDtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkZWYpICYmIDAgPT09IGRlZi5sZW5ndGgpIHtcbiAgICAgIC8vIG1ha2Ugc3VyZSBlbXB0eSBhcnJheSBkZWZhdWx0cyBhcmUgaGFuZGxlZFxuICAgICAgb3B0aW9ucy5kZWZhdWx0ID0gQXJyYXk7XG4gICAgfSBlbHNlIGlmICghb3B0aW9ucy5zaGFyZWQgJiZcbiAgICAgICAgICAgICAgIF8uaXNQbGFpbk9iamVjdChkZWYpICYmXG4gICAgICAgICAgICAgICAwID09PSBPYmplY3Qua2V5cyhkZWYpLmxlbmd0aCkge1xuICAgICAgLy8gcHJldmVudCBvZGQgXCJzaGFyZWRcIiBvYmplY3RzIGJldHdlZW4gZG9jdW1lbnRzXG4gICAgICBvcHRpb25zLmRlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTWl4ZWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbk1peGVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1peGVkO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICh2YWwgIT09IHVuZGVmaW5lZCkgJiYgKHZhbCAhPT0gbnVsbCk7XG59O1xuXG4vKipcbiAqIENhc3RzIGB2YWxgIGZvciBNaXhlZC5cbiAqXG4gKiBfdGhpcyBpcyBhIG5vLW9wX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTWl4ZWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGVkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xuXG4vKipcbiAqIE51bWJlciBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE51bWJlclNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdOdW1iZXInKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlclNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIG51bWJlclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyO1xuICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSBtaW5pbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDkgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNSU59IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtaW4gPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKHtNSU59KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtaW46IG1pbiB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1pbmltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5taW4gPSBmdW5jdGlvbiAodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMubWluVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT09IHRoaXMubWluVmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLk51bWJlci5taW47XG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNSU59LywgdmFsdWUpO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLm1pblZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2ID49IHZhbHVlO1xuICAgIH0sIG1zZywgJ21pbiddKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgbWF4aW11bSBudW1iZXIgdmFsaWRhdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuOiAxMSB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXG4gKiAgICAgICBtLm4gPSAxMDtcbiAqICAgICAgIG0uc2F2ZSgpIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01BWH0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAgICAgdmFyIG1heCA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBleGNlZWRzIHRoZSBsaW1pdCAoe01BWH0pLiddO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogbWF4IH0pXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XG4gKiAgICAgcy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGV4Y2VlZHMgdGhlIGxpbWl0ICgxMCkuXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWF4aW11bSBudW1iZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1heCA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5tYXhWYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgcmV0dXJuIHZbMF0gIT09IHRoaXMubWF4VmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLk51bWJlci5tYXg7XG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNQVh9LywgdmFsdWUpO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLm1heFZhbGlkYXRvciA9IGZ1bmN0aW9uKHYpe1xuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA8PSB2YWx1ZTtcbiAgICB9LCBtc2csICdtYXgnXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gbnVtYmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICB2YXIgdmFsID0gdmFsdWUgJiYgdmFsdWUuX2lkXG4gICAgPyB2YWx1ZS5faWQgLy8gZG9jdW1lbnRzXG4gICAgOiB2YWx1ZTtcblxuICBpZiAoIWlzTmFOKHZhbCkpe1xuICAgIGlmIChudWxsID09PSB2YWwpIHJldHVybiB2YWw7XG4gICAgaWYgKCcnID09PSB2YWwpIHJldHVybiBudWxsO1xuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIHZhbDtcbiAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiB2YWwpIHJldHVybiB2YWw7XG4gICAgaWYgKHZhbC50b1N0cmluZyAmJiAhQXJyYXkuaXNBcnJheSh2YWwpICYmXG4gICAgICAgIHZhbC50b1N0cmluZygpID09IE51bWJlcih2YWwpKSB7XG4gICAgICByZXR1cm4gbmV3IE51bWJlcih2YWwpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ251bWJlcicsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlclNjaGVtYTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBvaWQgPSByZXF1aXJlKCcuLi90eXBlcy9vYmplY3RpZCcpXG4gICwgRG9jdW1lbnQ7XG5cbi8qKlxuICogT2JqZWN0SWQgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIE9iamVjdElkIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ09iamVjdElkJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuT2JqZWN0SWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0SWQ7XG5cbi8qKlxuICogQWRkcyBhbiBhdXRvLWdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0IGlmIHR1cm5PbiBpcyB0cnVlLlxuICogQHBhcmFtIHtCb29sZWFufSB0dXJuT24gYXV0byBnZW5lcmF0ZWQgT2JqZWN0SWQgZGVmYXVsdHNcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5hdXRvID0gZnVuY3Rpb24gKCB0dXJuT24gKSB7XG4gIGlmICggdHVybk9uICkge1xuICAgIHRoaXMuZGVmYXVsdCggZGVmYXVsdElkICk7XG4gICAgdGhpcy5zZXQoIHJlc2V0SWQgKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIG9pZDtcbiAgfVxufTtcblxuLyoqXG4gKiBDYXN0cyB0byBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0SWR8U3RyaW5nfSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBwYXJhbSB7T2JqZWN0SWR8RG9jdW1lbnR9IHByaW9yVmFsXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQsIHByaW9yVmFsICkge1xuICAvLyBsYXp5IGxvYWRcbiAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi8uLi9kb2N1bWVudCcpKTtcblxuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkge1xuICAgIC8vIHdhaXQhIHdlIG1heSBuZWVkIHRvIGNhc3QgdGhpcyB0byBhIGRvY3VtZW50XG5cbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERvY3VtZW50KSB7XG4gICAgICB2YWx1ZS4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQgKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBlbHNlIGlmICggIV8uaXNQbGFpbk9iamVjdCggdmFsdWUgKSApIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgLy8g0J3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtSwg0YPQutCw0LfQsNC90L3QvtC5INCyINGB0YHRi9C70LrQtVxuICAgIHZhciBzY2hlbWEgPSB0aGlzLm9wdGlvbnMucmVmO1xuICAgIGlmICggIXNjaGVtYSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDRgdGF0LXQvNGDLCDQv9C+INC60L7RgtC+0YDQvtC5INGN0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YHQvtC30LTQsNCy0LDRgtGMJyk7XG4gICAgfVxuXG4gICAgaWYgKCAhc3RvcmFnZS5zY2hlbWFzWyBzY2hlbWEgXSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDQvdCw0LfQstCw0L3QuNC1INGB0YXQtdC80Ysg0L3QsCDQutC+0YLQvtGA0YPRjiDRgdGB0YvQu9Cw0LXQvNGB0Y8g0L/RgNC4INC10ZEg0YHQvtC30LTQsNC90LjQuCAoIG5ldyBTY2hlbWEoXCJuYW1lXCIsIHNjaGVtYU9iamVjdCkgKScpO1xuICAgIH1cblxuICAgIC8vIGluaXQgZG9jXG4gICAgZG9jID0gbmV3IERvY3VtZW50KCB2YWx1ZSwgdW5kZWZpbmVkLCBzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgICBkb2MuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG5cbiAgICByZXR1cm4gZG9jO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgLy8g0J/RgNC10LTQvtGC0LLRgNCw0YLQuNGC0YwgZGVwb3B1bGF0ZVxuICBpZiAoIHByaW9yVmFsIGluc3RhbmNlb2YgRG9jdW1lbnQgKXtcbiAgICBpZiAoIHByaW9yVmFsLl9pZCAmJiBwcmlvclZhbC5faWQuZXF1YWxzKCB2YWx1ZSApICl7XG4gICAgICByZXR1cm4gcHJpb3JWYWw7XG4gICAgfVxuICB9XG5cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2Ygb2lkKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICBpZiAoIHZhbHVlLl9pZCAmJiB2YWx1ZS5faWQgaW5zdGFuY2VvZiBvaWQgKVxuICAgIHJldHVybiB2YWx1ZS5faWQ7XG5cbiAgaWYgKHZhbHVlLnRvU3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBvaWQuY3JlYXRlRnJvbUhleFN0cmluZyh2YWx1ZS50b1N0cmluZygpKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRJZCAoKSB7XG4gIHJldHVybiBuZXcgb2lkKCk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0SWQgKHYpIHtcbiAgdGhpcy4kX18uX2lkID0gbnVsbDtcbiAgcmV0dXJuIHY7XG59XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlcztcblxuLyoqXG4gKiBTdHJpbmcgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFN0cmluZ1NjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIHRoaXMuZW51bVZhbHVlcyA9IFtdO1xuICB0aGlzLnJlZ0V4cCA9IG51bGw7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdTdHJpbmcnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0cmluZ1NjaGVtYTtcblxuLyoqXG4gKiBBZGRzIGFuIGVudW0gdmFsaWRhdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzdGF0ZXMgPSAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBzdGF0ZXMgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBgaW52YWxpZGAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBgc3RhdGVgLlxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICB2YXIgZW51ID0ge1xuICogICAgICAgdmFsdWVzOiAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpLFxuICogICAgICAgbWVzc2FnZTogJ2VudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YCdcbiAqICAgICB9XG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBlbnUgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGVudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBgc3RhdGVgIHdpdGggdmFsdWUgYGludmFsaWRgXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gW2FyZ3MuLi5dIGVudW1lcmF0aW9uIHZhbHVlc1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuZW51bSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuZW51bVZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPT0gdGhpcy5lbnVtVmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZW51bVZhbGlkYXRvciA9IGZhbHNlO1xuICB9XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gYXJndW1lbnRzWzBdIHx8IGZhbHNlID09PSBhcmd1bWVudHNbMF0pIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB2YWx1ZXM7XG4gIHZhciBlcnJvck1lc3NhZ2U7XG5cbiAgaWYgKF8uaXNQbGFpbk9iamVjdChhcmd1bWVudHNbMF0pKSB7XG4gICAgdmFsdWVzID0gYXJndW1lbnRzWzBdLnZhbHVlcztcbiAgICBlcnJvck1lc3NhZ2UgPSBhcmd1bWVudHNbMF0ubWVzc2FnZTtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHM7XG4gICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlcy5TdHJpbmcuZW51bTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gdmFsdWVzW2ldKSB7XG4gICAgICB0aGlzLmVudW1WYWx1ZXMucHVzaCh0aGlzLmNhc3QodmFsdWVzW2ldKSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHZhbHMgPSB0aGlzLmVudW1WYWx1ZXM7XG4gIHRoaXMuZW51bVZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCA9PT0gdiB8fCB+dmFscy5pbmRleE9mKHYpO1xuICB9O1xuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5lbnVtVmFsaWRhdG9yLCBlcnJvck1lc3NhZ2UsICdlbnVtJ10pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbG93ZXJjYXNlIHNldHRlci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBsb3dlcmNhc2U6IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBlbWFpbDogJ1NvbWVFbWFpbEBleGFtcGxlLkNPTScgfSk7XG4gKiAgICAgY29uc29sZS5sb2cobS5lbWFpbCkgLy8gc29tZWVtYWlsQGV4YW1wbGUuY29tXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5sb3dlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xuICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIHVwcGVyY2FzZSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGNhcHM6IHsgdHlwZTogU3RyaW5nLCB1cHBlcmNhc2U6IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBjYXBzOiAnYW4gZXhhbXBsZScgfSk7XG4gKiAgICAgY29uc29sZS5sb2cobS5jYXBzKSAvLyBBTiBFWEFNUExFXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS51cHBlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xuICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvVXBwZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdHJpbSBzZXR0ZXIuXG4gKlxuICogVGhlIHN0cmluZyB2YWx1ZSB3aWxsIGJlIHRyaW1tZWQgd2hlbiBzZXQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB0cmltOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBzdHJpbmcgPSAnIHNvbWUgbmFtZSAnXG4gKiAgICAgY29uc29sZS5sb2coc3RyaW5nLmxlbmd0aCkgLy8gMTFcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogc3RyaW5nIH0pXG4gKiAgICAgY29uc29sZS5sb2cobS5uYW1lLmxlbmd0aCkgLy8gOVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudHJpbSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudHJpbSgpO1xuICAgIHJldHVybiB2O1xuICB9KTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJlZ2V4cCB2YWxpZGF0b3IuXG4gKlxuICogQW55IHZhbHVlIHRoYXQgZG9lcyBub3QgcGFzcyBgcmVnRXhwYC50ZXN0KHZhbCkgd2lsbCBmYWlsIHZhbGlkYXRpb24uXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogL15hLyB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogJ0kgYW0gaW52YWxpZCcgfSlcbiAqICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFwiVmFsaWRhdGlvbkVycm9yOiBQYXRoIGBuYW1lYCBpcyBpbnZhbGlkIChJIGFtIGludmFsaWQpLlwiXG4gKiAgICAgICBtLm5hbWUgPSAnYXBwbGVzJ1xuICogICAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICAgIGFzc2VydC5vayhlcnIpIC8vIHN1Y2Nlc3NcbiAqICAgICAgIH0pXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gdXNpbmcgYSBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogICAgIHZhciBtYXRjaCA9IFsgL1xcLmh0bWwkLywgXCJUaGF0IGZpbGUgZG9lc24ndCBlbmQgaW4gLmh0bWwgKHtWQUxVRX0pXCIgXTtcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBmaWxlOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IG1hdGNoIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgZmlsZTogJ2ludmFsaWQnIH0pO1xuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFwiVmFsaWRhdGlvbkVycm9yOiBUaGF0IGZpbGUgZG9lc24ndCBlbmQgaW4gLmh0bWwgKGludmFsaWQpXCJcbiAqICAgICB9KVxuICpcbiAqIEVtcHR5IHN0cmluZ3MsIGB1bmRlZmluZWRgLCBhbmQgYG51bGxgIHZhbHVlcyBhbHdheXMgcGFzcyB0aGUgbWF0Y2ggdmFsaWRhdG9yLiBJZiB5b3UgcmVxdWlyZSB0aGVzZSB2YWx1ZXMsIGVuYWJsZSB0aGUgYHJlcXVpcmVkYCB2YWxpZGF0b3IgYWxzby5cbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvLCByZXF1aXJlZDogdHJ1ZSB9fSlcbiAqXG4gKiBAcGFyYW0ge1JlZ0V4cH0gcmVnRXhwIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byB0ZXN0IGFnYWluc3RcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gbWF0Y2ggKHJlZ0V4cCwgbWVzc2FnZSkge1xuICAvLyB5ZXMsIHdlIGFsbG93IG11bHRpcGxlIG1hdGNoIHZhbGlkYXRvcnNcblxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLlN0cmluZy5tYXRjaDtcblxuICBmdW5jdGlvbiBtYXRjaFZhbGlkYXRvciAodil7XG4gICAgcmV0dXJuIG51bGwgIT0gdiAmJiAnJyAhPT0gdlxuICAgICAgPyByZWdFeHAudGVzdCh2KVxuICAgICAgOiB0cnVlO1xuICB9XG5cbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW21hdGNoVmFsaWRhdG9yLCBtc2csICdyZWdleHAnXSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uIGNoZWNrUmVxdWlyZWQgKHZhbHVlLCBkb2MpIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKHRoaXMsIHZhbHVlLCBkb2MsIHRydWUpKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSAmJiB2YWx1ZS5sZW5ndGg7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gU3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggdmFsdWUgPT09IG51bGwgKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAvLyBoYW5kbGUgZG9jdW1lbnRzIGJlaW5nIHBhc3NlZFxuICAgIGlmICh2YWx1ZS5faWQgJiYgJ3N0cmluZycgPT09IHR5cGVvZiB2YWx1ZS5faWQpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5faWQ7XG4gICAgfVxuICAgIGlmICggdmFsdWUudG9TdHJpbmcgKSB7XG4gICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdzdHJpbmcnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdTY2hlbWE7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xudmFyIGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBlcnJvck1lc3NhZ2VzID0gZXJyb3IubWVzc2FnZXM7XG52YXIgQ2FzdEVycm9yID0gZXJyb3IuQ2FzdEVycm9yO1xudmFyIFZhbGlkYXRvckVycm9yID0gZXJyb3IuVmFsaWRhdG9yRXJyb3I7XG5cbi8qKlxuICogU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge1N0cmluZ30gW2luc3RhbmNlXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gU2NoZW1hVHlwZSAocGF0aCwgb3B0aW9ucywgaW5zdGFuY2UpIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuICB0aGlzLnZhbGlkYXRvcnMgPSBbXTtcbiAgdGhpcy5zZXR0ZXJzID0gW107XG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykgaWYgKHRoaXNbaV0gJiYgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXNbaV0pIHtcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcbiAgICAgID8gb3B0aW9uc1tpXVxuICAgICAgOiBbb3B0aW9uc1tpXV07XG5cbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxuICpcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxuICpcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4ge307XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XG4gKiAgICAgdmFyIG0xID0gbmV3IE07XG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKiAgICAgdmFyIG0yID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyB2YWxcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXG4gKlxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cbiAqXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIFN0b3JhZ2Ugc2V0dGVyLlxuICpcbiAqICAgICBmdW5jdGlvbiB0b0xvd2VyICh2KSB7XG4gKiAgICAgICByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFVzZXJTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGVtYWlsOiB7IHR5cGU6IFN0cmluZywgc2V0OiB0b0xvd2VyIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVXNlciA9IGRiLm1vZGVsKCdVc2VyJywgVXNlclNjaGVtYSlcbiAqXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlcih7ZW1haWw6ICdBVkVOVUVAUS5DT00nfSlcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKTsgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiAgICAgLy8gb3JcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyXG4gKiAgICAgdXNlci5lbWFpbCA9ICdBdmVudWVAUS5jb20nXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCkgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiBBcyB5b3UgY2FuIHNlZSBhYm92ZSwgc2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBfTk9URTogd2UgY291bGQgaGF2ZSBhbHNvIGp1c3QgdXNlZCB0aGUgYnVpbHQtaW4gYGxvd2VyY2FzZTogdHJ1ZWAgU2NoZW1hVHlwZSBvcHRpb24gaW5zdGVhZCBvZiBkZWZpbmluZyBvdXIgb3duIGZ1bmN0aW9uLl9cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxuICpcbiAqIFNldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgc2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cbiAqXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbDtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBzZXQ6IGluc3BlY3RvciB9LFxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGluc3BlY3RvciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xuICogICAgIHZhciB2ID0gbmV3IFZpcnVzKHsgbmFtZTogJ1BhcnZvdmlyaWRhZScsIHRheG9ub215OiAnUGFydm92aXJpbmFlJyB9KTtcbiAqXG4gKiAgICAgY29uc29sZS5sb2codi5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICBjb25zb2xlLmxvZyh2LnRheG9ub215KTsgLy8gUGFydm92aXJpbmFlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGZuKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Egc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGdldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGZ1bmN0aW9uIGRvYiAodmFsKSB7XG4gKiAgICAgICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcbiAqICAgICAgIHJldHVybiAodmFsLmdldE1vbnRoKCkgKyAxKSArIFwiL1wiICsgdmFsLmdldERhdGUoKSArIFwiL1wiICsgdmFsLmdldEZ1bGxZZWFyKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgZ2V0OiBkb2IgfSlcbiAqXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IERhdGUgfSlcbiAqICAgICBzLnBhdGgoJ2Jvcm4nKS5nZXQoZG9iKVxuICpcbiAqIEdldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgYXMgaXQgdHJhdmVscyBmcm9tIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCB0byB0aGUgdmFsdWUgdGhhdCB5b3Ugc2VlLlxuICpcbiAqIFN1cHBvc2UgeW91IGFyZSBzdG9yaW5nIGNyZWRpdCBjYXJkIG51bWJlcnMgYW5kIHlvdSB3YW50IHRvIGhpZGUgZXZlcnl0aGluZyBleGNlcHQgdGhlIGxhc3QgNCBkaWdpdHMgdG8gdGhlIG1vbmdvb3NlIHVzZXIuIFlvdSBjYW4gZG8gc28gYnkgZGVmaW5pbmcgYSBnZXR0ZXIgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9iZnVzY2F0ZSAoY2MpIHtcbiAqICAgICAgIHJldHVybiAnKioqKi0qKioqLSoqKiotJyArIGNjLnNsaWNlKGNjLmxlbmd0aC00LCBjYy5sZW5ndGgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIEFjY291bnRTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGNyZWRpdENhcmROdW1iZXI6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IG9iZnVzY2F0ZSB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBBY2NvdW50ID0gZGIubW9kZWwoJ0FjY291bnQnLCBBY2NvdW50U2NoZW1hKTtcbiAqXG4gKiAgICAgQWNjb3VudC5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgZm91bmQpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGZvdW5kLmNyZWRpdENhcmROdW1iZXIpOyAvLyAnKioqKi0qKioqLSoqKiotMTIzNCdcbiAqICAgICB9KTtcbiAqXG4gKiBHZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIGdldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIG5vdCc7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZ2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgZ2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqXG4gKiAgICAgVmlydXMuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIHZpcnVzKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLnRheG9ub215KTsgLy8gdGF4b25vbXkgaXMgbm90XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgZm4pXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB0aGlzLmdldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHZhbGlkYXRvcihzKSBmb3IgdGhpcyBkb2N1bWVudCBwYXRoLlxuICpcbiAqIFZhbGlkYXRvcnMgYWx3YXlzIHJlY2VpdmUgdGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIHRoZWlyIGZpcnN0IGFyZ3VtZW50IGFuZCBtdXN0IHJldHVybiBgQm9vbGVhbmAuIFJldHVybmluZyBgZmFsc2VgIG1lYW5zIHZhbGlkYXRpb24gZmFpbGVkLlxuICpcbiAqIFRoZSBlcnJvciBtZXNzYWdlIGFyZ3VtZW50IGlzIG9wdGlvbmFsLiBJZiBub3QgcGFzc2VkLCB0aGUgW2RlZmF1bHQgZ2VuZXJpYyBlcnJvciBtZXNzYWdlIHRlbXBsYXRlXSgjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzKSB3aWxsIGJlIHVzZWQuXG4gKlxuICogIyMjI0V4YW1wbGVzOlxuICpcbiAqICAgICAvLyBtYWtlIHN1cmUgZXZlcnkgdmFsdWUgaXMgZXF1YWwgdG8gXCJzb21ldGhpbmdcIlxuICogICAgIGZ1bmN0aW9uIHZhbGlkYXRvciAodmFsKSB7XG4gKiAgICAgICByZXR1cm4gdmFsID09ICdzb21ldGhpbmcnO1xuICogICAgIH1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiB2YWxpZGF0b3IgfX0pO1xuICpcbiAqICAgICAvLyB3aXRoIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIGN1c3RvbSA9IFt2YWxpZGF0b3IsICdVaCBvaCwge1BBVEh9IGRvZXMgbm90IGVxdWFsIFwic29tZXRoaW5nXCIuJ11cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBjdXN0b20gfX0pO1xuICpcbiAqICAgICAvLyBhZGRpbmcgbWFueSB2YWxpZGF0b3JzIGF0IGEgdGltZVxuICpcbiAqICAgICB2YXIgbWFueSA9IFtcbiAqICAgICAgICAgeyB2YWxpZGF0b3I6IHZhbGlkYXRvciwgbXNnOiAndWggb2gnIH1cbiAqICAgICAgICwgeyB2YWxpZGF0b3I6IGFub3RoZXJWYWxpZGF0b3IsIG1zZzogJ2ZhaWxlZCcgfVxuICogICAgIF1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBtYW55IH19KTtcbiAqXG4gKiAgICAgLy8gb3IgdXRpbGl6aW5nIFNjaGVtYVR5cGUgbWV0aG9kcyBkaXJlY3RseTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiAnc3RyaW5nJyB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKHZhbGlkYXRvciwgJ3ZhbGlkYXRpb24gb2YgYHtQQVRIfWAgZmFpbGVkIHdpdGggdmFsdWUgYHtWQUxVRX1gJyk7XG4gKlxuICogIyMjI0Vycm9yIG1lc3NhZ2UgdGVtcGxhdGVzOlxuICpcbiAqIEZyb20gdGhlIGV4YW1wbGVzIGFib3ZlLCB5b3UgbWF5IGhhdmUgbm90aWNlZCB0aGF0IGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzZWljIHRlbXBsYXRpbmcuIFRoZXJlIGFyZSBhIGZldyBvdGhlciB0ZW1wbGF0ZSBrZXl3b3JkcyBiZXNpZGVzIGB7UEFUSH1gIGFuZCBge1ZBTFVFfWAgdG9vLiBUbyBmaW5kIG91dCBtb3JlLCBkZXRhaWxzIGFyZSBhdmFpbGFibGUgW2hlcmVdKCNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXMpXG4gKlxuICogIyMjI0FzeW5jaHJvbm91cyB2YWxpZGF0aW9uOlxuICpcbiAqIFBhc3NpbmcgYSB2YWxpZGF0b3IgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0d28gYXJndW1lbnRzIHRlbGxzIG1vbmdvb3NlIHRoYXQgdGhlIHZhbGlkYXRvciBpcyBhbiBhc3luY2hyb25vdXMgdmFsaWRhdG9yLiBUaGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIHRvIHRoZSB2YWxpZGF0b3IgZnVuY3Rpb24gaXMgdGhlIHZhbHVlIGJlaW5nIHZhbGlkYXRlZC4gVGhlIHNlY29uZCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgbXVzdCBjYWxsZWQgd2hlbiB5b3UgZmluaXNoIHZhbGlkYXRpbmcgdGhlIHZhbHVlIGFuZCBwYXNzZWQgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIHRvIGNvbW11bmljYXRlIGVpdGhlciBzdWNjZXNzIG9yIGZhaWx1cmUgcmVzcGVjdGl2ZWx5LlxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKGZ1bmN0aW9uICh2YWx1ZSwgcmVzcG9uZCkge1xuICogICAgICAgZG9TdHVmZih2YWx1ZSwgZnVuY3Rpb24gKCkge1xuICogICAgICAgICAuLi5cbiAqICAgICAgICAgcmVzcG9uZChmYWxzZSk7IC8vIHZhbGlkYXRpb24gZmFpbGVkXG4gKiAgICAgICB9KVxuKiAgICAgIH0sICd7UEFUSH0gZmFpbGVkIHZhbGlkYXRpb24uJyk7XG4qXG4gKiBZb3UgbWlnaHQgdXNlIGFzeW5jaHJvbm91cyB2YWxpZGF0b3JzIHRvIHJldHJlaXZlIG90aGVyIGRvY3VtZW50cyBmcm9tIHRoZSBkYXRhYmFzZSB0byB2YWxpZGF0ZSBhZ2FpbnN0IG9yIHRvIG1lZXQgb3RoZXIgSS9PIGJvdW5kIHZhbGlkYXRpb24gbmVlZHMuXG4gKlxuICogVmFsaWRhdGlvbiBvY2N1cnMgYHByZSgnc2F2ZScpYCBvciB3aGVuZXZlciB5b3UgbWFudWFsbHkgZXhlY3V0ZSBbZG9jdW1lbnQjdmFsaWRhdGVdKCNkb2N1bWVudF9Eb2N1bWVudC12YWxpZGF0ZSkuXG4gKlxuICogSWYgdmFsaWRhdGlvbiBmYWlscyBkdXJpbmcgYHByZSgnc2F2ZScpYCBhbmQgbm8gY2FsbGJhY2sgd2FzIHBhc3NlZCB0byByZWNlaXZlIHRoZSBlcnJvciwgYW4gYGVycm9yYCBldmVudCB3aWxsIGJlIGVtaXR0ZWQgb24geW91ciBNb2RlbHMgYXNzb2NpYXRlZCBkYiBbY29ubmVjdGlvbl0oI2Nvbm5lY3Rpb25fQ29ubmVjdGlvbiksIHBhc3NpbmcgdGhlIHZhbGlkYXRpb24gZXJyb3Igb2JqZWN0IGFsb25nLlxuICpcbiAqICAgICB2YXIgY29ubiA9IG1vbmdvb3NlLmNyZWF0ZUNvbm5lY3Rpb24oLi4pO1xuICogICAgIGNvbm4ub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqICAgICB2YXIgUHJvZHVjdCA9IGNvbm4ubW9kZWwoJ1Byb2R1Y3QnLCB5b3VyU2NoZW1hKTtcbiAqICAgICB2YXIgZHZkID0gbmV3IFByb2R1Y3QoLi4pO1xuICogICAgIGR2ZC5zYXZlKCk7IC8vIGVtaXRzIGVycm9yIG9uIHRoZSBgY29ubmAgYWJvdmVcbiAqXG4gKiBJZiB5b3UgZGVzaXJlIGhhbmRsaW5nIHRoZXNlIGVycm9ycyBhdCB0aGUgTW9kZWwgbGV2ZWwsIGF0dGFjaCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHlvdXIgTW9kZWwgYW5kIHRoZSBldmVudCB3aWxsIGluc3RlYWQgYmUgZW1pdHRlZCB0aGVyZS5cbiAqXG4gKiAgICAgLy8gcmVnaXN0ZXJpbmcgYW4gZXJyb3IgbGlzdGVuZXIgb24gdGhlIE1vZGVsIGxldHMgdXMgaGFuZGxlIGVycm9ycyBtb3JlIGxvY2FsbHlcbiAqICAgICBQcm9kdWN0Lm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAcGFyYW0ge1JlZ0V4cHxGdW5jdGlvbnxPYmplY3R9IG9iaiB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAob2JqLCBtZXNzYWdlLCB0eXBlKSB7XG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqIHx8IG9iaiAmJiAnUmVnRXhwJyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgIGlmICghbWVzc2FnZSkgbWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICAgIGlmICghdHlwZSkgdHlwZSA9ICd1c2VyIGRlZmluZWQnO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFtvYmosIG1lc3NhZ2UsIHR5cGVdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKCEoYXJnICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGFyZy5jb25zdHJ1Y3RvciApICkpIHtcbiAgICAgIHZhciBtc2cgPSAnSW52YWxpZCB2YWxpZGF0b3IuIFJlY2VpdmVkICgnICsgdHlwZW9mIGFyZyArICcpICdcbiAgICAgICAgKyBhcmdcbiAgICAgICAgKyAnLiBTZWUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvYXBpLmh0bWwjc2NoZW1hdHlwZV9TY2hlbWFUeXBlLXZhbGlkYXRlJztcblxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIHRoaXMudmFsaWRhdGUoYXJnLnZhbGlkYXRvciwgYXJnLm1zZywgYXJnLnR5cGUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXF1aXJlZCB2YWxpZGF0b3IgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiB0cnVlIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogJ3tQQVRIfSBpcyByZXF1aXJlZCEnIH0pXG4gKlxuICogICAgIC8vIG9yIHRocm91Z2ggdGhlIHBhdGggQVBJXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSk7XG4gKlxuICogICAgIC8vIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2luZ1xuICpcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUsICdncnJyIDooICcpO1xuICpcbiAqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIGVuYWJsZS9kaXNhYmxlIHRoZSB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5yZXF1aXJlZCA9IGZ1bmN0aW9uIChyZXF1aXJlZCwgbWVzc2FnZSkge1xuICBpZiAoZmFsc2UgPT09IHJlcXVpcmVkKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5yZXF1aXJlZFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuaXNSZXF1aXJlZCA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmlzUmVxdWlyZWQgPSB0cnVlO1xuXG4gIHRoaXMucmVxdWlyZWRWYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgIC8vIGluIGhlcmUsIGB0aGlzYCByZWZlcnMgdG8gdGhlIHZhbGlkYXRpbmcgZG9jdW1lbnQuXG4gICAgLy8gbm8gdmFsaWRhdGlvbiB3aGVuIHRoaXMgcGF0aCB3YXNuJ3Qgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5LlxuICAgIGlmICh0aGlzICE9PSB1bmRlZmluZWQgJiYgLy8g0YHQv9C10YbQuNCw0LvRjNC90LDRjyDQv9GA0L7QstC10YDQutCwINC40Lct0LfQsCBzdHJpY3QgbW9kZSDQuCDQvtGB0L7QsdC10L3QvdC+0YHRgtC4IC5jYWxsKHVuZGVmaW5lZClcbiAgICAgICAgJ2lzU2VsZWN0ZWQnIGluIHRoaXMgJiZcbiAgICAgICAgIXRoaXMuaXNTZWxlY3RlZChzZWxmLnBhdGgpICYmXG4gICAgICAgICF0aGlzLmlzTW9kaWZpZWQoc2VsZi5wYXRoKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gc2VsZi5jaGVja1JlcXVpcmVkKHYsIHRoaXMpO1xuICB9O1xuXG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHJlcXVpcmVkKSB7XG4gICAgbWVzc2FnZSA9IHJlcXVpcmVkO1xuICAgIHJlcXVpcmVkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5nZW5lcmFsLnJlcXVpcmVkO1xuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5yZXF1aXJlZFZhbGlkYXRvciwgbXNnLCAncmVxdWlyZWQnXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgZGVmYXVsdCB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZSB0aGUgc2NvcGUgd2hpY2ggY2FsbGJhY2sgYXJlIGV4ZWN1dGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNjb3BlLCBpbml0KSB7XG4gIHZhciByZXQgPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5kZWZhdWx0VmFsdWVcbiAgICA/IHRoaXMuZGVmYXVsdFZhbHVlLmNhbGwoc2NvcGUpXG4gICAgOiB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICBpZiAobnVsbCAhPT0gcmV0ICYmIHVuZGVmaW5lZCAhPT0gcmV0KSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChyZXQsIHNjb3BlLCBpbml0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVyc1xuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAcGFyYW0geyp9IHByaW9yVmFsXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XG4gICAgcmV0dXJuIGluaXRcbiAgICAgID8gdmFsdWVcbiAgICAgIDogdGhpcy5jYXN0KHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgdmFyIHYgPSB2YWx1ZVxuICAgICwgc2V0dGVycyA9IHRoaXMuc2V0dGVyc1xuICAgICwgbGVuID0gc2V0dGVycy5sZW5ndGhcbiAgICAsIGNhc3RlciA9IHRoaXMuY2FzdGVyO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KHYpICYmIGNhc3RlciAmJiBjYXN0ZXIuc2V0dGVycykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdi5sZW5ndGg7IGkrKykge1xuICAgICAgdltpXSA9IGNhc3Rlci5hcHBseVNldHRlcnModltpXSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWxlbikge1xuICAgIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XG4gICAgcmV0dXJuIHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgd2hpbGUgKGxlbi0tKSB7XG4gICAgdiA9IHNldHRlcnNbbGVuXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XG5cbiAgLy8gZG8gbm90IGNhc3QgdW50aWwgYWxsIHNldHRlcnMgYXJlIGFwcGxpZWQgIzY2NVxuICB2ID0gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG5cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgZ2V0dGVycyB0byBhIHZhbHVlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiggdmFsdWUsIHNjb3BlICl7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSByZXR1cm4gdmFsdWU7XG5cbiAgdmFyIHYgPSB2YWx1ZVxuICAgICwgZ2V0dGVycyA9IHRoaXMuZ2V0dGVyc1xuICAgICwgbGVuID0gZ2V0dGVycy5sZW5ndGg7XG5cbiAgaWYgKCAhbGVuICkge1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgd2hpbGUgKCBsZW4tLSApIHtcbiAgICB2ID0gZ2V0dGVyc1sgbGVuIF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cblxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogUGVyZm9ybXMgYSB2YWxpZGF0aW9uIG9mIGB2YWx1ZWAgdXNpbmcgdGhlIHZhbGlkYXRvcnMgZGVjbGFyZWQgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSwgY2FsbGJhY2ssIHNjb3BlKSB7XG4gIHZhciBlcnIgPSBmYWxzZVxuICAgICwgcGF0aCA9IHRoaXMucGF0aFxuICAgICwgY291bnQgPSB0aGlzLnZhbGlkYXRvcnMubGVuZ3RoO1xuXG4gIGlmICghY291bnQpIHJldHVybiBjYWxsYmFjayhudWxsKTtcblxuICBmdW5jdGlvbiB2YWxpZGF0ZSAob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbCkge1xuICAgIGlmIChlcnIpIHJldHVybjtcbiAgICBpZiAob2sgPT09IHVuZGVmaW5lZCB8fCBvaykge1xuICAgICAgLS1jb3VudCB8fCBjYWxsYmFjayhudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soZXJyID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIG1lc3NhZ2UsIHR5cGUsIHZhbCkpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMudmFsaWRhdG9ycy5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHZbMF1cbiAgICAgICwgbWVzc2FnZSA9IHZbMV1cbiAgICAgICwgdHlwZSA9IHZbMl07XG5cbiAgICBpZiAodmFsaWRhdG9yIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IudGVzdCh2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWxpZGF0b3IpIHtcbiAgICAgIGlmICgyID09PSB2YWxpZGF0b3IubGVuZ3RoKSB7XG4gICAgICAgIHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSwgZnVuY3Rpb24gKG9rKSB7XG4gICAgICAgICAgdmFsaWRhdGUob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IuY2FsbChzY29wZSwgdmFsdWUpLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB2YWx1ZSBpcyBhIHZhbGlkIFJlZmVyZW5jZS5cbiAqXG4gKiDQndCwINC60LvQuNC10L3RgtC1INCyINC60LDRh9C10YHRgtCy0LUg0YHRgdGL0LvQutC4INC80L7QttC90L4g0YXRgNCw0L3QuNGC0Ywg0LrQsNC6IGlkLCDRgtCw0Log0Lgg0L/QvtC70L3Ri9C1INC00L7QutGD0LzQtdC90YLRi1xuICpcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUuX2lzUmVmID0gZnVuY3Rpb24oIHNlbGYsIHZhbHVlICl7XG4gIC8vIGZhc3QgcGF0aFxuICB2YXIgcmVmID0gc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWY7XG5cbiAgaWYgKCByZWYgKSB7XG4gICAgaWYgKCBudWxsID09IHZhbHVlICkgcmV0dXJuIHRydWU7XG4gICAgaWYgKCBfLmlzT2JqZWN0KCB2YWx1ZSApICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFUeXBlO1xuXG5TY2hlbWFUeXBlLkNhc3RFcnJvciA9IENhc3RFcnJvcjtcblxuU2NoZW1hVHlwZS5WYWxpZGF0b3JFcnJvciA9IFZhbGlkYXRvckVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIFN0YXRlTWFjaGluZSByZXByZXNlbnRzIGEgbWluaW1hbCBgaW50ZXJmYWNlYCBmb3IgdGhlXG4gKiBjb25zdHJ1Y3RvcnMgaXQgYnVpbGRzIHZpYSBTdGF0ZU1hY2hpbmUuY3RvciguLi4pLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgU3RhdGVNYWNoaW5lID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBTdGF0ZU1hY2hpbmUgKCkge1xuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3RhdGVzID0ge307XG59O1xuXG4vKiFcbiAqIFN0YXRlTWFjaGluZS5jdG9yKCdzdGF0ZTEnLCAnc3RhdGUyJywgLi4uKVxuICogQSBmYWN0b3J5IG1ldGhvZCBmb3Igc3ViY2xhc3NpbmcgU3RhdGVNYWNoaW5lLlxuICogVGhlIGFyZ3VtZW50cyBhcmUgYSBsaXN0IG9mIHN0YXRlcy4gRm9yIGVhY2ggc3RhdGUsXG4gKiB0aGUgY29uc3RydWN0b3IncyBwcm90b3R5cGUgZ2V0cyBzdGF0ZSB0cmFuc2l0aW9uXG4gKiBtZXRob2RzIG5hbWVkIGFmdGVyIGVhY2ggc3RhdGUuIFRoZXNlIHRyYW5zaXRpb24gbWV0aG9kc1xuICogcGxhY2UgdGhlaXIgcGF0aCBhcmd1bWVudCBpbnRvIHRoZSBnaXZlbiBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gc3ViY2xhc3MgY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKi9cblN0YXRlTWFjaGluZS5jdG9yID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgU3RhdGVNYWNoaW5lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5zdGF0ZU5hbWVzID0gc3RhdGVzO1xuXG4gICAgdmFyIGkgPSBzdGF0ZXMubGVuZ3RoXG4gICAgICAsIHN0YXRlO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICB0aGlzLnN0YXRlc1tzdGF0ZV0gPSB7fTtcbiAgICB9XG4gIH07XG5cbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdGF0ZU1hY2hpbmUucHJvdG90eXBlICk7XG4gIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcblxuICBzdGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAvLyBDaGFuZ2VzIHRoZSBgcGF0aGAncyBzdGF0ZSB0byBgc3RhdGVgLlxuICAgIGN0b3IucHJvdG90eXBlW3N0YXRlXSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShwYXRoLCBzdGF0ZSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIGN0b3I7XG59O1xuXG4vKiFcbiAqIFRoaXMgZnVuY3Rpb24gaXMgd3JhcHBlZCBieSB0aGUgc3RhdGUgY2hhbmdlIGZ1bmN0aW9uczpcbiAqXG4gKiAtIGByZXF1aXJlKHBhdGgpYFxuICogLSBgbW9kaWZ5KHBhdGgpYFxuICogLSBgaW5pdChwYXRoKWBcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5fY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiBfY2hhbmdlU3RhdGUgKHBhdGgsIG5leHRTdGF0ZSkge1xuICB2YXIgcHJldkJ1Y2tldCA9IHRoaXMuc3RhdGVzW3RoaXMucGF0aHNbcGF0aF1dO1xuICBpZiAocHJldkJ1Y2tldCkgZGVsZXRlIHByZXZCdWNrZXRbcGF0aF07XG5cbiAgdGhpcy5wYXRoc1twYXRoXSA9IG5leHRTdGF0ZTtcbiAgdGhpcy5zdGF0ZXNbbmV4dFN0YXRlXVtwYXRoXSA9IHRydWU7XG59O1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIgKHN0YXRlKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZXNbc3RhdGVdKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0ga2V5c1tpXTtcbiAgICBkZWxldGUgdGhpcy5zdGF0ZXNbc3RhdGVdW3BhdGhdO1xuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xuICB9XG59O1xuXG4vKiFcbiAqIENoZWNrcyB0byBzZWUgaWYgYXQgbGVhc3Qgb25lIHBhdGggaXMgaW4gdGhlIHN0YXRlcyBwYXNzZWQgaW4gdmlhIGBhcmd1bWVudHNgXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIHRoYXQgd2Ugd2FudCB0byBjaGVjayBmb3IuXG4gKiBAcHJpdmF0ZVxuICovXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLnNvbWUgPSBmdW5jdGlvbiBzb21lICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgd2hhdCA9IGFyZ3VtZW50cy5sZW5ndGggPyBhcmd1bWVudHMgOiB0aGlzLnN0YXRlTmFtZXM7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc29tZS5jYWxsKHdoYXQsIGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzZWxmLnN0YXRlc1tzdGF0ZV0pLmxlbmd0aDtcbiAgfSk7XG59O1xuXG4vKiFcbiAqIFRoaXMgZnVuY3Rpb24gYnVpbGRzIHRoZSBmdW5jdGlvbnMgdGhhdCBnZXQgYXNzaWduZWQgdG8gYGZvckVhY2hgIGFuZCBgbWFwYCxcbiAqIHNpbmNlIGJvdGggb2YgdGhvc2UgbWV0aG9kcyBzaGFyZSBhIGxvdCBvZiB0aGUgc2FtZSBsb2dpYy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaXRlck1ldGhvZCBpcyBlaXRoZXIgJ2ZvckVhY2gnIG9yICdtYXAnXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLl9pdGVyID0gZnVuY3Rpb24gX2l0ZXIgKGl0ZXJNZXRob2QpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbnVtQXJncyA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgICwgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMCwgbnVtQXJncy0xKVxuICAgICAgLCBjYWxsYmFjayA9IGFyZ3VtZW50c1tudW1BcmdzLTFdO1xuXG4gICAgaWYgKCFzdGF0ZXMubGVuZ3RoKSBzdGF0ZXMgPSB0aGlzLnN0YXRlTmFtZXM7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcGF0aHMgPSBzdGF0ZXMucmVkdWNlKGZ1bmN0aW9uIChwYXRocywgc3RhdGUpIHtcbiAgICAgIHJldHVybiBwYXRocy5jb25jYXQoT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKSk7XG4gICAgfSwgW10pO1xuXG4gICAgcmV0dXJuIHBhdGhzW2l0ZXJNZXRob2RdKGZ1bmN0aW9uIChwYXRoLCBpLCBwYXRocykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHBhdGgsIGksIHBhdGhzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qIVxuICogSXRlcmF0ZXMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcHJpdmF0ZVxuICovXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcbiAgdGhpcy5mb3JFYWNoID0gdGhpcy5faXRlcignZm9yRWFjaCcpO1xuICByZXR1cm4gdGhpcy5mb3JFYWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblN0YXRlTWFjaGluZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwICgpIHtcbiAgdGhpcy5tYXAgPSB0aGlzLl9pdGVyKCdtYXAnKTtcbiAgcmV0dXJuIHRoaXMubWFwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RPRE86INC/0L7Rh9C40YHRgtC40YLRjCDQutC+0LRcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFbWJlZGRlZERvY3VtZW50ID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcbnZhciBPYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBTdG9yYWdlIEFycmF5IGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNOT1RFOlxuICpcbiAqIF9WYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBvdGhlcndpc2UgYFN0b3JhZ2VBcnJheSNwdXNoYCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkLl9cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBpbmhlcml0cyBBcnJheVxuICovXG5mdW5jdGlvbiBTdG9yYWdlQXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xuICBfLm1peGluKCBhcnIsIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuU3RvcmFnZUFycmF5Lm1peGluID0ge1xuICAvKipcbiAgICogUGFyZW50IG93bmVyIGRvY3VtZW50XG4gICAqXG4gICAqIEBwcm9wZXJ0eSBfcGFyZW50XG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX3BhcmVudDogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBDYXN0cyBhIG1lbWJlciBiYXNlZCBvbiB0aGlzIGFycmF5cyBzY2hlbWEuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHJldHVybiB2YWx1ZSB0aGUgY2FzdGVkIHZhbHVlXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX2Nhc3Q6IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gICAgdmFyIG93bmVyID0gdGhpcy5fb3duZXI7XG4gICAgdmFyIHBvcHVsYXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgLy8gaWYgYSBwb3B1bGF0ZWQgYXJyYXksIHdlIG11c3QgY2FzdCB0byB0aGUgc2FtZSBtb2RlbFxuICAgICAgLy8gaW5zdGFuY2UgYXMgc3BlY2lmaWVkIGluIHRoZSBvcmlnaW5hbCBxdWVyeS5cbiAgICAgIGlmICghb3duZXIpIHtcbiAgICAgICAgb3duZXIgPSB0aGlzLl9vd25lciA9IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50XG4gICAgICAgICAgPyB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudCgpXG4gICAgICAgICAgOiB0aGlzLl9wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHBvcHVsYXRlZCA9IG93bmVyLnBvcHVsYXRlZCh0aGlzLl9wYXRoLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAocG9wdWxhdGVkICYmIG51bGwgIT0gdmFsdWUpIHtcbiAgICAgIC8vIGNhc3QgdG8gdGhlIHBvcHVsYXRlZCBNb2RlbHMgc2NoZW1hXG4gICAgICB2YXIgTW9kZWwgPSBwb3B1bGF0ZWQub3B0aW9ucy5tb2RlbDtcblxuICAgICAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAgICAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxuICAgICAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICAgICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2gtMjM5OVxuICAgICAgLy8gd2Ugc2hvdWxkIGNhc3QgbW9kZWwgb25seSB3aGVuIGl0J3Mgbm90IGEgZGlzY3JpbWluYXRvclxuICAgICAgdmFyIGlzRGlzYyA9IHZhbHVlLnNjaGVtYSAmJiB2YWx1ZS5zY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcgJiZcbiAgICAgICAgdmFsdWUuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleSAhPT0gdW5kZWZpbmVkO1xuICAgICAgaWYgKCFpc0Rpc2MpIHtcbiAgICAgICAgdmFsdWUgPSBuZXcgTW9kZWwodmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fc2NoZW1hLmNhc3Rlci5jYXN0KHZhbHVlLCB0aGlzLl9wYXJlbnQsIGZhbHNlKTtcbiAgfSxcblxuICAvKipcbiAgICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cbiAgICpcbiAgICogSWYgaXQgYnViYmxlcyB1cCBmcm9tIGFuIGVtYmVkZGVkIGRvY3VtZW50IGNoYW5nZSwgdGhlbiBpdCB0YWtlcyB0aGUgZm9sbG93aW5nIGFyZ3VtZW50cyAob3RoZXJ3aXNlLCB0YWtlcyAwIGFyZ3VtZW50cylcbiAgICpcbiAgICogQHBhcmFtIHtFbWJlZGRlZERvY3VtZW50fSBlbWJlZGRlZERvYyB0aGUgZW1iZWRkZWQgZG9jIHRoYXQgaW52b2tlZCB0aGlzIG1ldGhvZCBvbiB0aGUgQXJyYXlcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVtYmVkZGVkUGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkIGluIHRoZSBlbWJlZGRlZERvY1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9tYXJrTW9kaWZpZWQ6IGZ1bmN0aW9uIChlbGVtLCBlbWJlZGRlZFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XG4gICAgICAsIGRpcnR5UGF0aDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIGRpcnR5UGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChudWxsICE9IGVtYmVkZGVkUGF0aCkge1xuICAgICAgICAgIC8vIGFuIGVtYmVkZGVkIGRvYyBidWJibGVkIHVwIHRoZSBjaGFuZ2VcbiAgICAgICAgICBkaXJ0eVBhdGggPSBkaXJ0eVBhdGggKyAnLicgKyB0aGlzLmluZGV4T2YoZWxlbSkgKyAnLicgKyBlbWJlZGRlZFBhdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZGlyZWN0bHkgc2V0IGFuIGluZGV4XG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgZWxlbTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJlbnQubWFya01vZGlmaWVkKGRpcnR5UGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcHVzaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3B1c2gpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IFthcmdzLi4uXVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVzaDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIHJldCA9IFtdLnB1c2guYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjcG9wYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcG9wKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCB3aGljaCB3aWxsIHBhc3MgdGhlIGVudGlyZSB0aGluZyB0byAkc2V0IHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQHNlZSBTdG9yYWdlQXJyYXkjJHBvcCAjdHlwZXNfYXJyYXlfU3RvcmFnZUFycmF5LSUyNHBvcFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldCA9IFtdLnBvcC5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSNzaGlmdGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3Vuc2hpZnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI0V4YW1wbGU6XG4gICAqXG4gICAqICAgICBkb2MuYXJyYXkgPSBbMiwzXTtcbiAgICogICAgIHZhciByZXMgPSBkb2MuYXJyYXkuc2hpZnQoKTtcbiAgICogICAgIGNvbnNvbGUubG9nKHJlcykgLy8gMlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbM11cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNoaWZ0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldCA9IFtdLnNoaWZ0LmNhbGwodGhpcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBQdWxscyBpdGVtcyBmcm9tIHRoZSBhcnJheSBhdG9taWNhbGx5LlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZXM6XG4gICAqXG4gICAqICAgICBkb2MuYXJyYXkucHVsbChPYmplY3RJZClcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKHsgX2lkOiAnc29tZUlkJyB9KVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoMzYpXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCgndGFnIDEnLCAndGFnIDInKVxuICAgKlxuICAgKiBUbyByZW1vdmUgYSBkb2N1bWVudCBmcm9tIGEgc3ViZG9jdW1lbnQgYXJyYXkgd2UgbWF5IHBhc3MgYW4gb2JqZWN0IHdpdGggYSBtYXRjaGluZyBgX2lkYC5cbiAgICpcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1bGwoeyBfaWQ6IDQ4MTUxNjIzNDIgfSkgLy8gcmVtb3ZlZFxuICAgKlxuICAgKiBPciB3ZSBtYXkgcGFzc2luZyB0aGUgX2lkIGRpcmVjdGx5IGFuZCBsZXQgc3RvcmFnZSB0YWtlIGNhcmUgb2YgaXQuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKDQ4MTUxNjIzNDIpOyAvLyB3b3Jrc1xuICAgKlxuICAgKiBAcGFyYW0geyp9IGFyZ3VtZW50c1xuICAgKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHB1bGw6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCBjdXIgPSB0aGlzLl9wYXJlbnQuZ2V0KHRoaXMuX3BhdGgpXG4gICAgICAsIGkgPSBjdXIubGVuZ3RoXG4gICAgICAsIG1lbTtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIG1lbSA9IGN1cltpXTtcbiAgICAgIGlmIChtZW0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50KSB7XG4gICAgICAgIGlmICh2YWx1ZXMuc29tZShmdW5jdGlvbiAodikgeyByZXR1cm4gdi5lcXVhbHMobWVtKTsgfSApKSB7XG4gICAgICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh+Y3VyLmluZGV4T2YuY2FsbCh2YWx1ZXMsIG1lbSkpIHtcbiAgICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSNzcGxpY2VgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zcGxpY2UpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZyBhbmQgY2FzdGluZy5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNwbGljZTogZnVuY3Rpb24gc3BsaWNlICgpIHtcbiAgICB2YXIgcmV0LCB2YWxzLCBpO1xuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHZhbHMgPSBbXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFsc1tpXSA9IGkgPCAyXG4gICAgICAgICAgPyBhcmd1bWVudHNbaV1cbiAgICAgICAgICA6IHRoaXMuX2Nhc3QoYXJndW1lbnRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldCA9IFtdLnNwbGljZS5hcHBseSh0aGlzLCB2YWxzKTtcblxuICAgICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSN1bnNoaWZ0YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvdW5zaGlmdCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdW5zaGlmdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpO1xuICAgIFtdLnVuc2hpZnQuYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiB0aGlzLmxlbmd0aDtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSNzb3J0YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvc29ydCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjTk9URTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc29ydDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5zb3J0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIHZhbHVlcyB0byB0aGUgYXJyYXkgaWYgbm90IGFscmVhZHkgcHJlc2VudC5cbiAgICpcbiAgICogIyMjI0V4YW1wbGU6XG4gICAqXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNF1cbiAgICogICAgIHZhciBhZGRlZCA9IGRvYy5hcnJheS5hZGRUb1NldCg0LDUpO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDQsNV1cbiAgICogICAgIGNvbnNvbGUubG9nKGFkZGVkKSAgICAgLy8gWzVdXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gYXJndW1lbnRzXG4gICAqIEByZXR1cm4ge0FycmF5fSB0aGUgdmFsdWVzIHRoYXQgd2VyZSBhZGRlZFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgYWRkVG9TZXQ6IGZ1bmN0aW9uIGFkZFRvU2V0ICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCBhZGRlZCA9IFtdXG4gICAgICAsIHR5cGUgPSB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50ID8gJ2RvYycgOlxuICAgICAgICAgICAgICAgdmFsdWVzWzBdIGluc3RhbmNlb2YgRGF0ZSA/ICdkYXRlJyA6XG4gICAgICAgICAgICAgICAnJztcblxuICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgZm91bmQ7XG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZG9jJzpcbiAgICAgICAgICBmb3VuZCA9IHRoaXMuc29tZShmdW5jdGlvbihkb2MpeyByZXR1cm4gZG9jLmVxdWFscyh2KTsgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgIHZhciB2YWwgPSArdjtcbiAgICAgICAgICBmb3VuZCA9IHRoaXMuc29tZShmdW5jdGlvbihkKXsgcmV0dXJuICtkID09PSB2YWw7IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGZvdW5kID0gfnRoaXMuaW5kZXhPZih2KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICBbXS5wdXNoLmNhbGwodGhpcywgdik7XG5cbiAgICAgICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgICAgIFtdLnB1c2guY2FsbChhZGRlZCwgdik7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICByZXR1cm4gYWRkZWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGNhc3RlZCBgdmFsYCBhdCBpbmRleCBgaWAgYW5kIG1hcmtzIHRoZSBhcnJheSBtb2RpZmllZC5cbiAgICpcbiAgICogIyMjI0V4YW1wbGU6XG4gICAqXG4gICAqICAgICAvLyBnaXZlbiBkb2N1bWVudHMgYmFzZWQgb24gdGhlIGZvbGxvd2luZ1xuICAgKiAgICAgdmFyIGRvY3MgPSBzdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24oJ0RvYycsIG5ldyBTY2hlbWEoeyBhcnJheTogW051bWJlcl0gfSkpO1xuICAgKlxuICAgKiAgICAgdmFyIGRvYyA9IGRvY3MuYWRkKHsgYXJyYXk6IFsyLDMsNF0gfSlcbiAgICpcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnNldCgxLFwiNVwiKTtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLDUsNF0gLy8gcHJvcGVybHkgY2FzdCB0byBudW1iZXJcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gdGhlIGNoYW5nZSBpcyBzYXZlZFxuICAgKlxuICAgKiAgICAgLy8gVlMgbm90IHVzaW5nIGFycmF5I3NldFxuICAgKiAgICAgZG9jLmFycmF5WzFdID0gXCI1XCI7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpOyAvLyBbMixcIjVcIiw0XSAvLyBubyBjYXN0aW5nXG4gICAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZSBpcyBub3Qgc2F2ZWRcbiAgICpcbiAgICogQHJldHVybiB7QXJyYXl9IHRoaXNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNldDogZnVuY3Rpb24gKGksIHZhbCkge1xuICAgIHRoaXNbaV0gPSB0aGlzLl9jYXN0KHZhbCk7XG4gICAgdGhpcy5fbWFya01vZGlmaWVkKGkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5LlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtBcnJheX1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvT2JqZWN0OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmV0dXJuIGRvYyBpbnN0YW5jZW9mIERvY3VtZW50XG4gICAgICAgICAgPyBkb2MudG9PYmplY3Qob3B0aW9ucylcbiAgICAgICAgICA6IGRvYztcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNsaWNlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgaW5kZXggb2YgYG9iamAgb3IgYC0xYCBpZiBub3QgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIGl0ZW0gdG8gbG9vayBmb3JcbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgaW5kZXhPZjogZnVuY3Rpb24gaW5kZXhPZiAob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIE9iamVjdElkKSBvYmogPSBvYmoudG9TdHJpbmcoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgaWYgKG9iaiA9PSB0aGlzW2ldKVxuICAgICAgICByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG59O1xuXG4vKipcbiAqIEFsaWFzIG9mIFtwdWxsXSgjdHlwZXNfYXJyYXlfU3RvcmFnZUFycmF5LXB1bGwpXG4gKlxuICogQHNlZSBTdG9yYWdlQXJyYXkjcHVsbCAjdHlwZXNfYXJyYXlfU3RvcmFnZUFycmF5LXB1bGxcbiAqIEBzZWUgbW9uZ29kYiBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZy8jVXBkYXRpbmctJTI0cHVsbFxuICogQGFwaSBwdWJsaWNcbiAqIEBtZW1iZXJPZiBTdG9yYWdlQXJyYXlcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKi9cblN0b3JhZ2VBcnJheS5taXhpbi5yZW1vdmUgPSBTdG9yYWdlQXJyYXkubWl4aW4ucHVsbDtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VBcnJheTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBCaW5hcnkgPSByZXF1aXJlKCcuLi9iaW5hcnknKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogU3RvcmFnZSBCdWZmZXIgY29uc3RydWN0b3IuXG4gKlxuICogVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZS5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlcn0gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBlbmNvZGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQGluaGVyaXRzIEJ1ZmZlclxuICovXG5cbmZ1bmN0aW9uIFN0b3JhZ2VCdWZmZXIgKHZhbHVlLCBlbmNvZGUsIG9mZnNldCkge1xuICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgdmFyIHZhbDtcblxuICBpZiAoMCA9PT0gbGVuZ3RoIHx8IG51bGwgPT09IGFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQgPT09IGFyZ3VtZW50c1swXSkge1xuICAgIHZhbCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gdmFsdWU7XG4gIH1cblxuICB2YXIgZW5jb2Rpbmc7XG4gIHZhciBwYXRoO1xuICB2YXIgZG9jO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGVuY29kZSkpIHtcbiAgICAvLyBpbnRlcm5hbCBjYXN0aW5nXG4gICAgcGF0aCA9IGVuY29kZVswXTtcbiAgICBkb2MgPSBlbmNvZGVbMV07XG4gIH0gZWxzZSB7XG4gICAgZW5jb2RpbmcgPSBlbmNvZGU7XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nLCBvZmZzZXQpO1xuICBfLm1peGluKCBidWYsIFN0b3JhZ2VCdWZmZXIubWl4aW4gKTtcbiAgYnVmLmlzU3RvcmFnZUJ1ZmZlciA9IHRydWU7XG5cbiAgLy8gbWFrZSBzdXJlIHRoZXNlIGludGVybmFsIHByb3BzIGRvbid0IHNob3cgdXAgaW4gT2JqZWN0LmtleXMoKVxuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhidWYsIHtcbiAgICAgIHZhbGlkYXRvcnM6IHsgdmFsdWU6IFtdIH1cbiAgICAsIF9wYXRoOiB7IHZhbHVlOiBwYXRoIH1cbiAgICAsIF9wYXJlbnQ6IHsgdmFsdWU6IGRvYyB9XG4gIH0pO1xuXG4gIGlmIChkb2MgJiYgJ3N0cmluZycgPT09IHR5cGVvZiBwYXRoKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGJ1ZiwgJ19zY2hlbWEnLCB7XG4gICAgICAgIHZhbHVlOiBkb2Muc2NoZW1hLnBhdGgocGF0aClcbiAgICB9KTtcbiAgfVxuXG4gIGJ1Zi5fc3VidHlwZSA9IDA7XG4gIHJldHVybiBidWY7XG59XG5cbi8qIVxuICogSW5oZXJpdCBmcm9tIEJ1ZmZlci5cbiAqL1xuXG4vL1N0b3JhZ2VCdWZmZXIucHJvdG90eXBlID0gbmV3IEJ1ZmZlcigwKTtcblxuU3RvcmFnZUJ1ZmZlci5taXhpbiA9IHtcblxuICAvKipcbiAgICogUGFyZW50IG93bmVyIGRvY3VtZW50XG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkgX3BhcmVudFxuICAgKi9cblxuICBfcGFyZW50OiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIERlZmF1bHQgc3VidHlwZSBmb3IgdGhlIEJpbmFyeSByZXByZXNlbnRpbmcgdGhpcyBCdWZmZXJcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqIEBwcm9wZXJ0eSBfc3VidHlwZVxuICAgKi9cblxuICBfc3VidHlwZTogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBNYXJrcyB0aGlzIGJ1ZmZlciBhcyBtb2RpZmllZC5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIF9tYXJrTW9kaWZpZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgcGFyZW50Lm1hcmtNb2RpZmllZCh0aGlzLl9wYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyaXRlcyB0aGUgYnVmZmVyLlxuICAgKi9cblxuICB3cml0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cml0dGVuID0gQnVmZmVyLnByb3RvdHlwZS53cml0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgaWYgKHdyaXR0ZW4gPiAwKSB7XG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JpdHRlbjtcbiAgfSxcblxuICAvKipcbiAgICogQ29waWVzIHRoZSBidWZmZXIuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBgQnVmZmVyI2NvcHlgIGRvZXMgbm90IG1hcmsgYHRhcmdldGAgYXMgbW9kaWZpZWQgc28geW91IG11c3QgY29weSBmcm9tIGEgYFN0b3JhZ2VCdWZmZXJgIGZvciBpdCB0byB3b3JrIGFzIGV4cGVjdGVkLiBUaGlzIGlzIGEgd29yayBhcm91bmQgc2luY2UgYGNvcHlgIG1vZGlmaWVzIHRoZSB0YXJnZXQsIG5vdCB0aGlzLlxuICAgKlxuICAgKiBAcmV0dXJuIHtTdG9yYWdlQnVmZmVyfVxuICAgKiBAcGFyYW0ge0J1ZmZlcn0gdGFyZ2V0XG4gICAqL1xuXG4gIGNvcHk6IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICB2YXIgcmV0ID0gQnVmZmVyLnByb3RvdHlwZS5jb3B5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBpZiAodGFyZ2V0ICYmIHRhcmdldC5pc1N0b3JhZ2VCdWZmZXIpIHtcbiAgICAgIHRhcmdldC5fbWFya01vZGlmaWVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxufTtcblxuLyohXG4gKiBDb21waWxlIG90aGVyIEJ1ZmZlciBtZXRob2RzIG1hcmtpbmcgdGhpcyBidWZmZXIgYXMgbW9kaWZpZWQuXG4gKi9cblxuOyhcbi8vIG5vZGUgPCAwLjVcbid3cml0ZVVJbnQ4IHdyaXRlVUludDE2IHdyaXRlVUludDMyIHdyaXRlSW50OCB3cml0ZUludDE2IHdyaXRlSW50MzIgJyArXG4nd3JpdGVGbG9hdCB3cml0ZURvdWJsZSBmaWxsICcgK1xuJ3V0ZjhXcml0ZSBiaW5hcnlXcml0ZSBhc2NpaVdyaXRlIHNldCAnICtcblxuLy8gbm9kZSA+PSAwLjVcbid3cml0ZVVJbnQxNkxFIHdyaXRlVUludDE2QkUgd3JpdGVVSW50MzJMRSB3cml0ZVVJbnQzMkJFICcgK1xuJ3dyaXRlSW50MTZMRSB3cml0ZUludDE2QkUgd3JpdGVJbnQzMkxFIHdyaXRlSW50MzJCRSAnICtcbid3cml0ZUZsb2F0TEUgd3JpdGVGbG9hdEJFIHdyaXRlRG91YmxlTEUgd3JpdGVEb3VibGVCRSdcbikuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgaWYgKCFCdWZmZXIucHJvdG90eXBlW21ldGhvZF0pIHJldHVybjtcbiAgICBTdG9yYWdlQnVmZmVyLm1peGluW21ldGhvZF0gPSBuZXcgRnVuY3Rpb24oXG4gICAgJ3ZhciByZXQgPSBCdWZmZXIucHJvdG90eXBlLicrbWV0aG9kKycuYXBwbHkodGhpcywgYXJndW1lbnRzKTsnICtcbiAgICAndGhpcy5fbWFya01vZGlmaWVkKCk7JyArXG4gICAgJ3JldHVybiByZXQ7J1xuICApO1xufSk7XG5cbi8qKlxuICogQ29udmVydHMgdGhpcyBidWZmZXIgdG8gaXRzIEJpbmFyeSB0eXBlIHJlcHJlc2VudGF0aW9uLlxuICpcbiAqICMjIyNTdWJUeXBlczpcbiAqXG4gKiAgIHZhciBic29uID0gcmVxdWlyZSgnYnNvbicpXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9ERUZBVUxUXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9GVU5DVElPTlxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfQllURV9BUlJBWVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVVJRFxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfTUQ1XG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VU0VSX0RFRklORURcbiAqXG4gKiAgIGRvYy5idWZmZXIudG9PYmplY3QoYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VTRVJfREVGSU5FRCk7XG4gKlxuICogQHNlZSBodHRwOi8vYnNvbnNwZWMub3JnLyMvc3BlY2lmaWNhdGlvblxuICogQHBhcmFtIHtIZXh9IFtzdWJ0eXBlXVxuICogQHJldHVybiB7QmluYXJ5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlQnVmZmVyLm1peGluLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHN1YnR5cGUgPSAnbnVtYmVyJyA9PT0gdHlwZW9mIG9wdGlvbnNcbiAgICA/IG9wdGlvbnNcbiAgICA6ICh0aGlzLl9zdWJ0eXBlIHx8IDApO1xuICByZXR1cm4gbmV3IEJpbmFyeSh0aGlzLCBzdWJ0eXBlKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGlzIGJ1ZmZlciBpcyBlcXVhbHMgdG8gYG90aGVyYCBidWZmZXJcbiAqXG4gKiBAcGFyYW0ge0J1ZmZlcn0gb3RoZXJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuU3RvcmFnZUJ1ZmZlci5taXhpbi5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIob3RoZXIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHRoaXMubGVuZ3RoICE9PSBvdGhlci5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAodGhpc1tpXSAhPT0gb3RoZXJbaV0pIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBzdWJ0eXBlIG9wdGlvbiBhbmQgbWFya3MgdGhlIGJ1ZmZlciBtb2RpZmllZC5cbiAqXG4gKiAjIyMjU3ViVHlwZXM6XG4gKlxuICogICB2YXIgYnNvbiA9IHJlcXVpcmUoJ2Jzb24nKVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfREVGQVVMVFxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfRlVOQ1RJT05cbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0JZVEVfQVJSQVlcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VVSURcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX01ENVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVNFUl9ERUZJTkVEXG4gKlxuICogICBkb2MuYnVmZmVyLnN1YnR5cGUoYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VVSUQpO1xuICpcbiAqIEBzZWUgaHR0cDovL2Jzb25zcGVjLm9yZy8jL3NwZWNpZmljYXRpb25cbiAqIEBwYXJhbSB7SGV4fSBzdWJ0eXBlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VCdWZmZXIubWl4aW4uc3VidHlwZSA9IGZ1bmN0aW9uIChzdWJ0eXBlKSB7XG4gIGlmICgnbnVtYmVyJyAhPT0gdHlwZW9mIHN1YnR5cGUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHN1YnR5cGUuIEV4cGVjdGVkIGEgbnVtYmVyJyk7XG4gIH1cblxuICBpZiAodGhpcy5fc3VidHlwZSAhPT0gc3VidHlwZSkge1xuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICB9XG5cbiAgdGhpcy5fc3VidHlwZSA9IHN1YnR5cGU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cblN0b3JhZ2VCdWZmZXIuQmluYXJ5ID0gQmluYXJ5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VCdWZmZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xudmFyIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICwgT2JqZWN0SWRTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEvb2JqZWN0aWQnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBEb2N1bWVudEFycmF5IGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byB0aGlzIGFycmF5XG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge1N0b3JhZ2VEb2N1bWVudEFycmF5fVxuICogQGluaGVyaXRzIFN0b3JhZ2VBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICogVE9ETzog0L/QvtC00YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG4gKlxuICog0JLQtdGB0Ywg0L3Rg9C20L3Ri9C5INC60L7QtCDRgdC60L7Qv9C40YDQvtCy0LDQvVxuICovXG5mdW5jdGlvbiBTdG9yYWdlRG9jdW1lbnRBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuXG4gIC8vIFZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIHNpbmNlXG4gIC8vIG90aGVyd2lzZSBTdG9yYWdlQXJyYXkjcHVzaCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkIHRvIHRoZSBwYXJlbnQuXG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG4gIGFyci5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgYXJyLl9oYW5kbGVycyA9IHtcbiAgICAgIGlzTmV3OiBhcnIubm90aWZ5KCdpc05ldycpLFxuICAgICAgc2F2ZTogYXJyLm5vdGlmeSgnc2F2ZScpXG4gICAgfTtcblxuICAgIC8vINCf0YDQvtCx0YDQvtGBINC40LfQvNC10L3QtdC90LjRjyDRgdC+0YHRgtC+0Y/QvdC40Y8g0LIg0L/QvtC00LTQvtC60YPQvNC10L3RglxuICAgIGRvYy5vbignc2F2ZScsIGFyci5faGFuZGxlcnMuc2F2ZSk7XG4gICAgZG9jLm9uKCdpc05ldycsIGFyci5faGFuZGxlcnMuaXNOZXcpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VBcnJheVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5fY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoISh2YWx1ZS5fX3BhcmVudCAmJiB2YWx1ZS5fX3BhcmVudEFycmF5KSkge1xuICAgICAgLy8gdmFsdWUgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIHVzaW5nIGFycmF5LmNyZWF0ZSgpXG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgIHZhbHVlLl9fcGFyZW50QXJyYXkgPSB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBoYW5kbGUgY2FzdCgnc3RyaW5nJykgb3IgY2FzdChPYmplY3RJZCkgZXRjLlxuICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICB9XG5cbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IodmFsdWUsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBTZWFyY2hlcyBhcnJheSBpdGVtcyBmb3IgdGhlIGZpcnN0IGRvY3VtZW50IHdpdGggYSBtYXRjaGluZyBfaWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBlbWJlZGRlZERvYyA9IG0uYXJyYXkuaWQoc29tZV9pZCk7XG4gKlxuICogQHJldHVybiB7RW1iZWRkZWREb2N1bWVudHxudWxsfSB0aGUgc3ViZG9jdW1lbnQgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gKiBAcGFyYW0ge09iamVjdElkfFN0cmluZ3xOdW1iZXJ9IGlkXG4gKiBAVE9ETyBjYXN0IHRvIHRoZSBfaWQgYmFzZWQgb24gc2NoZW1hIGZvciBwcm9wZXIgY29tcGFyaXNvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uaWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgdmFyIGNhc3RlZFxuICAgICwgc2lkXG4gICAgLCBfaWQ7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY2FzdGVkXyA9IE9iamVjdElkU2NoZW1hLnByb3RvdHlwZS5jYXN0LmNhbGwoe30sIGlkKTtcbiAgICBpZiAoY2FzdGVkXykgY2FzdGVkID0gU3RyaW5nKGNhc3RlZF8pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FzdGVkID0gbnVsbDtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBfaWQgPSB0aGlzW2ldLmdldCgnX2lkJyk7XG5cbiAgICBpZiAoX2lkIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZC5faWQpIHJldHVybiB0aGlzW2ldO1xuICAgIH0gZWxzZSBpZiAoIShfaWQgaW5zdGFuY2VvZiBPYmplY3RJZCkpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmIChjYXN0ZWQgPT0gX2lkKSB7XG4gICAgICByZXR1cm4gdGhpc1tpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheSBvZiBwbGFpbiBqcyBvYmplY3RzXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX0VhY2ggc3ViLWRvY3VtZW50IGlzIGNvbnZlcnRlZCB0byBhIHBsYWluIG9iamVjdCBieSBjYWxsaW5nIGl0cyBgI3RvT2JqZWN0YCBtZXRob2QuX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWwgb3B0aW9ucyB0byBwYXNzIHRvIGVhY2ggZG9jdW1lbnRzIGB0b09iamVjdGAgbWV0aG9kIGNhbGwgZHVyaW5nIGNvbnZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3Iob2JqKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZuIHRoYXQgbm90aWZpZXMgYWxsIGNoaWxkIGRvY3Mgb2YgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLm5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSAoZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gbm90aWZ5ICh2YWwpIHtcbiAgICB2YXIgaSA9IHNlbGYubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGlmICghc2VsZltpXSkgY29udGludWU7XG4gICAgICBzZWxmW2ldLnRyaWdnZXIoZXZlbnQsIHZhbCk7XG4gICAgfVxuICB9O1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VEb2N1bWVudEFycmF5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcbnZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4uL2RlZmVycmVkJyk7XG5cbi8qKlxuICogRW1iZWRkZWREb2N1bWVudCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBqcyBvYmplY3QgcmV0dXJuZWQgZnJvbSB0aGUgZGJcbiAqIEBwYXJhbSB7U3RvcmFnZURvY3VtZW50QXJyYXl9IHBhcmVudEFyciB0aGUgcGFyZW50IGFycmF5IG9mIHRoaXMgZG9jdW1lbnRcbiAqIEBpbmhlcml0cyBEb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVtYmVkZGVkRG9jdW1lbnQgKCBkYXRhLCBwYXJlbnRBcnIgKSB7XG4gIGlmIChwYXJlbnRBcnIpIHtcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkgPSBwYXJlbnRBcnI7XG4gICAgdGhpcy5fX3BhcmVudCA9IHBhcmVudEFyci5fcGFyZW50O1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9fcGFyZW50ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgRG9jdW1lbnQuY2FsbCggdGhpcywgZGF0YSwgdW5kZWZpbmVkICk7XG5cbiAgLy8g0J3Rg9C20L3QviDQtNC70Y8g0L/RgNC+0LHRgNC+0YHQsCDQuNC30LzQtdC90LXQvdC40Y8g0LfQvdCw0YfQtdC90LjRjyDQuNC3INGA0L7QtNC40YLQtdC70YzRgdC60L7Qs9C+INC00L7QutGD0LzQtdC90YLQsCwg0L3QsNC/0YDQuNC80LXRgCDQv9GA0Lgg0YHQvtGF0YDQsNC90LXQvdC40LhcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLm9uKCdpc05ldycsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICBzZWxmLmlzTmV3ID0gdmFsO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gRG9jdW1lbnRcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBEb2N1bWVudC5wcm90b3R5cGUgKTtcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcblxuLyoqXG4gKiBNYXJrcyB0aGUgZW1iZWRkZWQgZG9jIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZG9jID0gYmxvZ3Bvc3QuY29tbWVudHMuaWQoaGV4c3RyaW5nKTtcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybjtcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHtcbiAgICAvLyBNYXJrIHRoZSBXSE9MRSBwYXJlbnQgYXJyYXkgYXMgbW9kaWZpZWRcbiAgICAvLyBpZiB0aGlzIGlzIGEgbmV3IGRvY3VtZW50IChpLmUuLCB3ZSBhcmUgaW5pdGlhbGl6aW5nXG4gICAgLy8gYSBkb2N1bWVudCksXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQoKTtcbiAgfSBlbHNlXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQodGhpcywgcGF0aCk7XG59O1xuXG4vKipcbiAqIFVzZWQgYXMgYSBzdHViIGZvciBbaG9va3MuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzMpXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1RoaXMgaXMgYSBuby1vcC4gRG9lcyBub3QgYWN0dWFsbHkgc2F2ZSB0aGUgZG9jIHRvIHRoZSBkYi5fXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZWQgUHJvbWlzZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgcHJvbWlzZSA9IG5ldyBEZWZlcnJlZCgpLmRvbmUoZm4pO1xuICBwcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHN1YmRvY3VtZW50IGZyb20gaXRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBfaWQ7XG4gIGlmICghdGhpcy53aWxsUmVtb3ZlKSB7XG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcbiAgICBpZiAoIV9pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3IgeW91ciBvd24gZ29vZCwgU3RvcmFnZSBkb2VzIG5vdCBrbm93ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdob3cgdG8gcmVtb3ZlIGFuIEVtYmVkZGVkRG9jdW1lbnQgdGhhdCBoYXMgbm8gX2lkJyk7XG4gICAgfVxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5wdWxsKHsgX2lkOiBfaWQgfSk7XG4gICAgdGhpcy53aWxsUmVtb3ZlID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChmbilcbiAgICBmbihudWxsKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgI3VwZGF0ZSBtZXRob2Qgb2YgcGFyZW50IGRvY3VtZW50cy5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRocm93IG5ldyBFcnJvcignVGhlICN1cGRhdGUgbWV0aG9kIGlzIG5vdCBhdmFpbGFibGUgb24gRW1iZWRkZWREb2N1bWVudHMnKTtcbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBmaWVsZCB0byBpbnZhbGlkYXRlXG4gKiBAcGFyYW0ge1N0cmluZ3xFcnJvcn0gZXJyIGVycm9yIHdoaWNoIHN0YXRlcyB0aGUgcmVhc29uIGBwYXRoYCB3YXMgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyLCB2YWwsIGZpcnN0KSB7XG4gIGlmICghdGhpcy5fX3BhcmVudCkge1xuICAgIHZhciBtc2cgPSAnVW5hYmxlIHRvIGludmFsaWRhdGUgYSBzdWJkb2N1bWVudCB0aGF0IGhhcyBub3QgYmVlbiBhZGRlZCB0byBhbiBhcnJheS4nO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fX3BhcmVudEFycmF5LmluZGV4T2YodGhpcyk7XG4gIHZhciBwYXJlbnRQYXRoID0gdGhpcy5fX3BhcmVudEFycmF5Ll9wYXRoO1xuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcblxuICAvLyBzbmlmZmluZyBhcmd1bWVudHM6XG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXG4gIC8vIG91ciBlcnJvciBtZXNzYWdlIGNsZWFuLlxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVycik7XG4gIH1cblxuICBpZiAoZmlyc3QpXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvcCBsZXZlbCBkb2N1bWVudCBvZiB0aGlzIHN1Yi1kb2N1bWVudC5cbiAqXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSB0aGlzLl9fcGFyZW50O1xuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XG5cbiAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgfVxuXG4gIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG5cbiAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LiBJZiBvcHRpb25hbCBgcGF0aGAgaXMgcGFzc2VkLCBpdCBpcyBhcHBlbmRlZCB0byB0aGUgZnVsbCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIEVtYmVkZGVkRG9jdW1lbnRcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuJF9fLmZ1bGxQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgaWYgKCFwYXJlbnQuX19wYXJlbnQpIHJldHVybiBwYXRoO1xuXG4gICAgdmFyIHBhdGhzID0gW107XG4gICAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgICAgcGF0aHMudW5zaGlmdChwYXJlbnQuX19wYXJlbnRBcnJheS5fcGF0aCk7XG4gICAgICBwYXJlbnQgPSBwYXJlbnQuX19wYXJlbnQ7XG4gICAgfVxuXG4gICAgdGhpcy4kX18uZnVsbFBhdGggPSBwYXRocy5qb2luKCcuJyk7XG5cbiAgICBpZiAoIXRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICAgIC8vIG9wdGltaXphdGlvblxuICAgICAgdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGF0aFxuICAgID8gdGhpcy4kX18uZnVsbFBhdGggKyAnLicgKyBwYXRoXG4gICAgOiB0aGlzLiRfXy5mdWxsUGF0aDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGRvY3VtZW50LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnRBcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnRBcnJheTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWJlZGRlZERvY3VtZW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbmV4cG9ydHMuQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5leHBvcnRzLkJ1ZmZlciA9IHJlcXVpcmUoJy4vYnVmZmVyJyk7XG5cbmV4cG9ydHMuRW1iZWRkZWQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICogQGlnbm9yZVxuICovXG52YXIgQmluYXJ5UGFyc2VyID0gcmVxdWlyZSgnLi4vYmluYXJ5cGFyc2VyJykuQmluYXJ5UGFyc2VyO1xuXG4vKipcbiAqIE1hY2hpbmUgaWQuXG4gKlxuICogQ3JlYXRlIGEgcmFuZG9tIDMtYnl0ZSB2YWx1ZSAoaS5lLiB1bmlxdWUgZm9yIHRoaXNcbiAqIHByb2Nlc3MpLiBPdGhlciBkcml2ZXJzIHVzZSBhIG1kNSBvZiB0aGUgbWFjaGluZSBpZCBoZXJlLCBidXRcbiAqIHRoYXQgd291bGQgbWVhbiBhbiBhc3ljIGNhbGwgdG8gZ2V0aG9zdG5hbWUsIHNvIHdlIGRvbid0IGJvdGhlci5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbnZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15bMC05YS1mQS1GXXsyNH0kJyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IE9iamVjdElkIGluc3RhbmNlXG4gKlxuICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vbW9uZ29kYi9qcy1ic29uL2Jsb2IvbWFzdGVyL2xpYi9ic29uL29iamVjdGlkLmpzXG4gKiBAY2xhc3MgUmVwcmVzZW50cyBhIEJTT04gT2JqZWN0SWQgdHlwZS5cbiAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBnZW5lcmF0aW9uVGltZSBUaGUgZ2VuZXJhdGlvbiB0aW1lIG9mIHRoaXMgT2JqZWN0SWQgaW5zdGFuY2VcbiAqIEByZXR1cm4ge09iamVjdElkfSBpbnN0YW5jZSBvZiBPYmplY3RJZC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SWQoaWQpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgaWYoKGlkIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gaWQ7XG5cbiAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICB2YXIgdmFsaWQgPSBPYmplY3RJZC5pc1ZhbGlkKGlkKTtcblxuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKCF2YWxpZCAmJiBpZCAhPSBudWxsKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVycycpO1xuICB9IGVsc2UgaWYodmFsaWQgJiYgdHlwZW9mIGlkID09PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPT09IDI0KSB7XG4gICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICB9IGVsc2UgaWYoaWQgPT0gbnVsbCB8fCB0eXBlb2YgaWQgPT09ICdudW1iZXInKSB7XG4gICAgLy8gY29udmVydCB0byAxMiBieXRlIGJpbmFyeSBzdHJpbmdcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gIH0gZWxzZSBpZihpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gdGhpcy50b0hleFN0cmluZygpO1xufVxuXG4vLyBQcmVjb21wdXRlZCBoZXggdGFibGUgZW5hYmxlcyBzcGVlZHkgaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgaGV4VGFibGUgPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgaGV4VGFibGVbaV0gPSAoaSA8PSAxNSA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuXG4gIHZhciBoZXhTdHJpbmcgPSAnJztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICBoZXhTdHJpbmcgKz0gaGV4VGFibGVbdGhpcy5pZC5jaGFyQ29kZUF0KGkpXTtcbiAgfVxuXG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gIHJldHVybiBoZXhTdHJpbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldF9pbmMgPSBmdW5jdGlvbigpIHtcbiAgT2JqZWN0SWQuaW5kZXggPSAoT2JqZWN0SWQuaW5kZXggKyAxKSAlIDB4RkZGRkZGO1xuXG4gIHJldHVybiBPYmplY3RJZC5pbmRleDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge251bWJlcn0gcmV0dXJucyBuZXh0IGluZGV4IHZhbHVlLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0SW5jID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmdldF9pbmMoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gW3RpbWVdIG9wdGlvbmFsIHBhcmFtZXRlciBhbGxvd2luZyB0byBwYXNzIGluIGEgc2Vjb25kIGJhc2VkIHRpbWVzdGFtcC5cbiAqIEByZXR1cm4ge3N0cmluZ30gcmV0dXJuIHRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKCdudW1iZXInICE9PSB0eXBlb2YgdGltZSkge1xuICAgIHRpbWUgPSBwYXJzZUludChEYXRlLm5vdygpLzEwMDAsMTApO1xuICB9XG5cbiAgdmFyIHRpbWU0Qnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgLyogZm9yIHRpbWUtYmFzZWQgT2JqZWN0SWQgdGhlIGJ5dGVzIGZvbGxvd2luZyB0aGUgdGltZSB3aWxsIGJlIHplcm9lZCAqL1xuICB2YXIgbWFjaGluZTNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoTUFDSElORV9JRCwgMjQsIGZhbHNlKTtcbiAgdmFyIHBpZDJCeXRlcyA9IEJpbmFyeVBhcnNlci5mcm9tU2hvcnQodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgdmFyIGluZGV4M0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aGlzLmdldF9pbmMoKSwgMjQsIGZhbHNlLCB0cnVlKTtcblxuICByZXR1cm4gdGltZTRCeXRlcyArIG1hY2hpbmUzQnl0ZXMgKyBwaWQyQnl0ZXMgKyBpbmRleDNCeXRlcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdGhlIGlkIGludG8gYSAyNCBieXRlIGhleCBzdHJpbmcgZm9yIHByaW50aW5nXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHRvIGl0cyBKU09OIHJlcHJlc2VudGF0aW9uLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SWQgd2l0aCBgb3RoZXJJRGAuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IG90aGVySUQgT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElkJ3NcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAob3RoZXJJRCkge1xuICBpZihvdGhlcklEID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgdmFyIGlkID0gKG90aGVySUQgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCBvdGhlcklELnRvSGV4U3RyaW5nKVxuICAgID8gb3RoZXJJRC5pZFxuICAgIDogT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhvdGhlcklEKS5pZDtcblxuICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7ZGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0VGltZXN0YW1wID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuICB0aW1lc3RhbXAuc2V0VGltZShNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCw0KSwgMzIsIHRydWUsIHRydWUpKSAqIDEwMDApO1xuICByZXR1cm4gdGltZXN0YW1wO1xufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5jcmVhdGVQayA9IGZ1bmN0aW9uIGNyZWF0ZVBrICgpIHtcbiAgcmV0dXJuIG5ldyBPYmplY3RJZCgpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbiBjcmVhdGVGcm9tVGltZSAodGltZSkge1xuICB2YXIgaWQgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKSArXG4gICAgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gIHJldHVybiBuZXcgT2JqZWN0SWQoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SWQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uIGNyZWF0ZUZyb21IZXhTdHJpbmcgKGhleFN0cmluZykge1xuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKHR5cGVvZiBoZXhTdHJpbmcgPT09ICd1bmRlZmluZWQnIHx8IGhleFN0cmluZyAhPSBudWxsICYmIGhleFN0cmluZy5sZW5ndGggIT09IDI0KVxuICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzJyk7XG5cbiAgdmFyIGxlbiA9IGhleFN0cmluZy5sZW5ndGg7XG5cbiAgaWYobGVuID4gMTIqMikge1xuICAgIHRocm93IG5ldyBFcnJvcignSWQgY2Fubm90IGJlIGxvbmdlciB0aGFuIDEyIGJ5dGVzJyk7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gJydcbiAgICAsIHN0cmluZ1xuICAgICwgbnVtYmVyO1xuXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gIH1cblxuICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuT2JqZWN0SWQuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQoaWQpIHtcbiAgaWYoaWQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT09IHR5cGVvZiBpZCAmJiAoaWQubGVuZ3RoICE9PSAxMiAmJiBpZC5sZW5ndGggIT09IDI0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDaGVjayBzcGVjaWZpY2FsbHkgZm9yIGhleCBjb3JyZWN0bmVzc1xuICAgIGlmKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoID09PSAyNCkgcmV0dXJuIGNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vKiFcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdElkLnByb3RvdHlwZSwgJ2dlbmVyYXRpb25UaW1lJywge1xuICBlbnVtZXJhYmxlOiB0cnVlXG4gICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICB9XG4gICwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodmFsdWUsIDMyLCB0cnVlLCB0cnVlKTtcblxuICAgIHRoaXMuaWQgPSB2YWx1ZSArIHRoaXMuaWQuc3Vic3RyKDQpO1xuICAgIC8vIGRlbGV0ZSB0aGlzLl9faWQ7XG4gICAgdGhpcy50b0hleFN0cmluZygpO1xuICB9XG59KTtcblxuLyoqXG4gKiBFeHBvc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7XG5tb2R1bGUuZXhwb3J0cy5PYmplY3RJZCA9IE9iamVjdElkOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIG1wYXRoID0gcmVxdWlyZSgnLi9tcGF0aCcpXG4gICwgRG9jdW1lbnQ7XG5cbmV4cG9ydHMubXBhdGggPSBtcGF0aDtcblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIHJ1bGVzLlxuICpcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICpcbiAqL1xuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xuICBbLyhtKWFuJC9naSwgJyQxZW4nXSxcbiAgWy8ocGUpcnNvbiQvZ2ksICckMW9wbGUnXSxcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXG4gIFsvXihveCkkL2dpLCAnJDFlbiddLFxuICBbLyhheHx0ZXN0KWlzJC9naSwgJyQxZXMnXSxcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxuICBbLyhhbGlhc3xzdGF0dXMpJC9naSwgJyQxZXMnXSxcbiAgWy8oYnUpcyQvZ2ksICckMXNlcyddLFxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxuICBbLyhbdGldKXVtJC9naSwgJyQxYSddLFxuICBbL3NpcyQvZ2ksICdzZXMnXSxcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXG4gIFsvKGhpdmUpJC9naSwgJyQxcyddLFxuICBbLyhbXmFlaW91eV18cXUpeSQvZ2ksICckMWllcyddLFxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXG4gIFsvKG1hdHJ8dmVydHxpbmQpaXh8ZXgkL2dpLCAnJDFpY2VzJ10sXG4gIFsvKFttfGxdKW91c2UkL2dpLCAnJDFpY2UnXSxcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcbiAgWy8ocXVpeikkL2dpLCAnJDF6ZXMnXSxcbiAgWy9zJC9naSwgJ3MnXSxcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcbiAgWy8kL2dpLCAncyddXG5dO1xudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xuXG4vKipcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxuICpcbiAqIFRoZXNlIHdvcmRzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0cy51bmNvdW50YWJsZXMgPSBbXG4gICdhZHZpY2UnLFxuICAnZW5lcmd5JyxcbiAgJ2V4Y3JldGlvbicsXG4gICdkaWdlc3Rpb24nLFxuICAnY29vcGVyYXRpb24nLFxuICAnaGVhbHRoJyxcbiAgJ2p1c3RpY2UnLFxuICAnbGFib3VyJyxcbiAgJ21hY2hpbmVyeScsXG4gICdlcXVpcG1lbnQnLFxuICAnaW5mb3JtYXRpb24nLFxuICAncG9sbHV0aW9uJyxcbiAgJ3Nld2FnZScsXG4gICdwYXBlcicsXG4gICdtb25leScsXG4gICdzcGVjaWVzJyxcbiAgJ3NlcmllcycsXG4gICdyYWluJyxcbiAgJ3JpY2UnLFxuICAnZmlzaCcsXG4gICdzaGVlcCcsXG4gICdtb29zZScsXG4gICdkZWVyJyxcbiAgJ25ld3MnLFxuICAnZXhwZXJ0aXNlJyxcbiAgJ3N0YXR1cycsXG4gICdtZWRpYSdcbl07XG52YXIgdW5jb3VudGFibGVzID0gZXhwb3J0cy51bmNvdW50YWJsZXM7XG5cbi8qIVxuICogUGx1cmFsaXplIGZ1bmN0aW9uLlxuICpcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0byBwbHVyYWxpemVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGx1cmFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgZm91bmQ7XG4gIGlmICghfnVuY291bnRhYmxlcy5pbmRleE9mKHN0ci50b0xvd2VyQ2FzZSgpKSl7XG4gICAgZm91bmQgPSBydWxlcy5maWx0ZXIoZnVuY3Rpb24ocnVsZSl7XG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xuICAgIH0pO1xuICAgIGlmIChmb3VuZFswXSkgcmV0dXJuIHN0ci5yZXBsYWNlKGZvdW5kWzBdWzBdLCBmb3VuZFswXVsxXSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbi8qIVxuICogRGV0ZXJtaW5lcyBpZiBgYWAgYW5kIGBiYCBhcmUgZGVlcCBlcXVhbC5cbiAqXG4gKiBNb2RpZmllZCBmcm9tIG5vZGUvbGliL2Fzc2VydC5qc1xuICogTW9kaWZpZWQgZnJvbSBtb25nb29zZS91dGlscy5qc1xuICpcbiAqIEBwYXJhbSB7Kn0gYSBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGJgXG4gKiBAcGFyYW0geyp9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAoYSBpbnN0YW5jZW9mIE9iamVjdElkICYmIGIgaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBTdG9yYWdlTnVtYmVyc1xuICBpZiAoYSBpbnN0YW5jZW9mIE51bWJlciAmJiBiIGluc3RhbmNlb2YgTnVtYmVyKSB7XG4gICAgcmV0dXJuIGEudmFsdWVPZigpID09PSBiLnZhbHVlT2YoKTtcbiAgfVxuXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoYSkpIHtcbiAgICByZXR1cm4gYS5lcXVhbHMoYik7XG4gIH1cblxuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09PSB0eXBlb2Ygb1xuICAgICAgJiYgJ1tvYmplY3QgUmVnRXhwXScgPT09IHRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIGNsb25lUmVnRXhwIChyZWdleHApIHtcbiAgaWYgKCFpc1JlZ0V4cChyZWdleHApKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGEgUmVnRXhwJyk7XG4gIH1cblxuICB2YXIgZmxhZ3MgPSBbXTtcbiAgaWYgKHJlZ2V4cC5nbG9iYWwpIGZsYWdzLnB1c2goJ2cnKTtcbiAgaWYgKHJlZ2V4cC5tdWx0aWxpbmUpIGZsYWdzLnB1c2goJ20nKTtcbiAgaWYgKHJlZ2V4cC5pZ25vcmVDYXNlKSBmbGFncy5wdXNoKCdpJyk7XG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIGZsYWdzLmpvaW4oJycpKTtcbn1cblxuLyohXG4gKiBPYmplY3QgY2xvbmUgd2l0aCBTdG9yYWdlIG5hdGl2ZXMgc3VwcG9ydC5cbiAqXG4gKiBJZiBvcHRpb25zLm1pbmltaXplIGlzIHRydWUsIGNyZWF0ZXMgYSBtaW5pbWFsIGRhdGEgb2JqZWN0LiBFbXB0eSBvYmplY3RzIGFuZCB1bmRlZmluZWQgdmFsdWVzIHdpbGwgbm90IGJlIGNsb25lZC4gVGhpcyBtYWtlcyB0aGUgZGF0YSBwYXlsb2FkIHNlbnQgdG8gTW9uZ29EQiBhcyBzbWFsbCBhcyBwb3NzaWJsZS5cbiAqXG4gKiBGdW5jdGlvbnMgYXJlIG5ldmVyIGNsb25lZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gY2xvbmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBjbG9uZWQgb2JqZWN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lIChvYmosIG9wdGlvbnMpIHtcbiAgaWYgKG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbClcbiAgICByZXR1cm4gb2JqO1xuXG4gIGlmICggXy5pc0FycmF5KCBvYmogKSApIHtcbiAgICByZXR1cm4gY2xvbmVBcnJheSggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIGlzU3RvcmFnZU9iamVjdCggb2JqICkgKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5qc29uICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiBvYmoudG9KU09OKSB7XG4gICAgICByZXR1cm4gb2JqLnRvSlNPTiggb3B0aW9ucyApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2JqLnRvT2JqZWN0KCBvcHRpb25zICk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmouY29uc3RydWN0b3IgKSB7XG4gICAgc3dpdGNoICggZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgICAgY2FzZSAnT2JqZWN0JzpcbiAgICAgICAgcmV0dXJuIGNsb25lT2JqZWN0KG9iaiwgb3B0aW9ucyk7XG4gICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgcmV0dXJuIG5ldyBvYmouY29uc3RydWN0b3IoICtvYmogKTtcbiAgICAgIGNhc2UgJ1JlZ0V4cCc6XG4gICAgICAgIHJldHVybiBjbG9uZVJlZ0V4cCggb2JqICk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBpZ25vcmVcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmogaW5zdGFuY2VvZiBPYmplY3RJZCApIHtcbiAgICBpZiAoIG9wdGlvbnMuZGVwb3B1bGF0ZSApe1xuICAgICAgcmV0dXJuIG9iai50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgT2JqZWN0SWQoIG9iai5pZCApO1xuICB9XG5cbiAgaWYgKCAhb2JqLmNvbnN0cnVjdG9yICYmIF8uaXNPYmplY3QoIG9iaiApICkge1xuICAgIC8vIG9iamVjdCBjcmVhdGVkIHdpdGggT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIHJldHVybiBjbG9uZU9iamVjdCggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIG9iai52YWx1ZU9mICl7XG4gICAgcmV0dXJuIG9iai52YWx1ZU9mKCk7XG4gIH1cbn07XG52YXIgY2xvbmUgPSBleHBvcnRzLmNsb25lO1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAob2JqLCBvcHRpb25zKSB7XG4gIHZhciByZXRhaW5LZXlPcmRlciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5yZXRhaW5LZXlPcmRlclxuICAgICwgbWluaW1pemUgPSBvcHRpb25zICYmIG9wdGlvbnMubWluaW1pemVcbiAgICAsIHJldCA9IHt9XG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlzXG4gICAgLCB2YWxcbiAgICAsIGtcbiAgICAsIGk7XG5cbiAgaWYgKCByZXRhaW5LZXlPcmRlciApIHtcbiAgICBmb3IgKGsgaW4gb2JqKSB7XG4gICAgICB2YWwgPSBjbG9uZSggb2JqW2tdLCBvcHRpb25zICk7XG5cbiAgICAgIGlmICggIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkgKSB7XG4gICAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBmYXN0ZXJcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgayA9IGtleXNbaV07XG4gICAgICB2YWwgPSBjbG9uZShvYmpba10sIG9wdGlvbnMpO1xuXG4gICAgICBpZiAoIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkpIHtcbiAgICAgICAgaWYgKCFoYXNLZXlzKSBoYXNLZXlzID0gdHJ1ZTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtaW5pbWl6ZVxuICAgID8gaGFzS2V5cyAmJiByZXRcbiAgICA6IHJldDtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoYXJyLCBvcHRpb25zKSB7XG4gIHZhciByZXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcmV0LnB1c2goIGNsb25lKCBhcnJbaV0sIG9wdGlvbnMgKSApO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qIVxuICogTWVyZ2VzIGBmcm9tYCBpbnRvIGB0b2Agd2l0aG91dCBvdmVyd3JpdGluZyBleGlzdGluZyBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb21cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UgKHRvLCBmcm9tKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKCB0eXBlb2YgdG9ba2V5XSA9PT0gJ3VuZGVmaW5lZCcgKXtcbiAgICAgIHRvW2tleV0gPSBmcm9tW2tleV07XG5cbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KCBmcm9tW2tleV0gKSApe1xuICAgICAgbWVyZ2UoIHRvW2tleV0sIGZyb21ba2V5XSApO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gc3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDMpO1xufTtcblxuXG4vKiFcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXG4gKlxuICogVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGxpYnMgbGlrZSBEYXRlLmpzIHdoaWNoIGRvIGZvb2xpc2ggdGhpbmdzIHRvIE5hdGl2ZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3QgPSBmdW5jdGlvbiAoIHYgKSB7XG4gIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKSk7XG5cbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBEb2N1bWVudCB8fFxuICAgICAgICggdiAmJiB2LmlzU3RvcmFnZUFycmF5ICk7XG59O1xudmFyIGlzU3RvcmFnZU9iamVjdCA9IGV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0O1xuXG4vKiFcbiAqIFJldHVybiB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICovXG5cbmV4cG9ydHMuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgb2JqLCBtYXApIHtcbiAgcmV0dXJuIG1wYXRoLmdldChwYXRoLCBvYmosICdfZG9jJywgbWFwKTtcbn07XG5cbi8qIVxuICogU2V0cyB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtBbnl0aGluZ30gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9iaiwgbWFwKSB7XG4gIG1wYXRoLnNldChwYXRoLCB2YWwsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxudmFyIHJGdW5jdGlvbk5hbWUgPSAvXmZ1bmN0aW9uXFxzKihbXlxccyhdKykvO1xuZnVuY3Rpb24gZ2V0RnVuY3Rpb25OYW1lKCBjdG9yICl7XG4gIGlmIChjdG9yLm5hbWUpIHtcbiAgICByZXR1cm4gY3Rvci5uYW1lO1xuICB9XG4gIHJldHVybiAoY3Rvci50b1N0cmluZygpLnRyaW0oKS5tYXRjaCggckZ1bmN0aW9uTmFtZSApIHx8IFtdKVsxXTtcbn1cbmV4cG9ydHMuZ2V0RnVuY3Rpb25OYW1lID0gZ2V0RnVuY3Rpb25OYW1lO1xuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgLy8g0JTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDRgtC10YHRgtC+0LIgKNC+0LrRgNGD0LbQtdC90LjQtSBub2RlLmpzKVxuICBpZiAoIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgKSByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgLy8g0JXRgdC70Lgg0LIg0LHRgNCw0YPQt9C10YDQtSDRg9C20LUg0YDQtdCw0LvQuNC30L7QstCw0L0g0Y3RgtC+0YIg0LzQtdGC0L7QtFxuICBpZiAoIHdpbmRvdy5zZXRJbW1lZGlhdGUgKSByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZTtcblxuICB2YXIgaGVhZCA9IHsgfSwgdGFpbCA9IGhlYWQ7IC8vINC+0YfQtdGA0LXQtNGMINCy0YvQt9C+0LLQvtCyLCAxLdGB0LLRj9C30L3Ri9C5INGB0L/QuNGB0L7QulxuXG4gIHZhciBJRCA9IE1hdGgucmFuZG9tKCk7IC8vINGD0L3QuNC60LDQu9GM0L3Ri9C5INC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAXG5cbiAgZnVuY3Rpb24gb25tZXNzYWdlKGUpIHtcbiAgICBpZihlLmRhdGEgIT0gSUQpIHJldHVybjsgLy8g0L3QtSDQvdCw0YjQtSDRgdC+0L7QsdGJ0LXQvdC40LVcbiAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIHZhciBmdW5jID0gaGVhZC5mdW5jO1xuICAgIGRlbGV0ZSBoZWFkLmZ1bmM7XG4gICAgZnVuYygpO1xuICB9XG5cbiAgaWYod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHsgLy8gSUU5Kywg0LTRgNGD0LPQuNC1INCx0YDQsNGD0LfQtdGA0YtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9ubWVzc2FnZSwgZmFsc2UpO1xuICB9IGVsc2UgeyAvLyBJRThcbiAgICB3aW5kb3cuYXR0YWNoRXZlbnQoICdvbm1lc3NhZ2UnLCBvbm1lc3NhZ2UgKTtcbiAgfVxuXG4gIHJldHVybiB3aW5kb3cucG9zdE1lc3NhZ2UgPyBmdW5jdGlvbihmdW5jKSB7XG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHsgZnVuYzogZnVuYyB9O1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShJRCwgJyonKTtcbiAgfSA6XG4gIGZ1bmN0aW9uKGZ1bmMpIHsgLy8gSUU8OFxuICAgIHNldFRpbWVvdXQoZnVuYywgMCk7XG4gIH07XG59KCkpO1xuXG4vLyBQaGFudG9tSlMgZG9lc24ndCBzdXBwb3J0IGJpbmQgeWV0XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vINCx0LvQuNC20LDQudGI0LjQuSDQsNC90LDQu9C+0LMg0LLQvdGD0YLRgNC10L3QvdC10Lkg0YTRg9C90LrRhtC40LhcbiAgICAgIC8vIElzQ2FsbGFibGUg0LIgRUNNQVNjcmlwdCA1XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCAtIHdoYXQgaXMgdHJ5aW5nIHRvIGJlIGJvdW5kIGlzIG5vdCBjYWxsYWJsZScpO1xuICAgIH1cblxuICAgIHZhciBhQXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgIE5vb3AgICAgPSBmdW5jdGlvbigpIHt9LFxuICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgTm9vcCAmJiBvVGhpc1xuICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICB9O1xuXG4gICAgTm9vcC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IE5vb3AoKTtcblxuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBUaGlzIGlzIHdoYXQgbW9uZ29vc2UgdXNlcyB0byBkZWZpbmUgdmlydHVhbCBhdHRyaWJ1dGVzIHZpYSBgU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgZnVsbG5hbWUgaW5zdGFuY2VvZiBtb25nb29zZS5WaXJ0dWFsVHlwZSAvLyB0cnVlXG4gKlxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gVmlydHVhbFR5cGUgKG9wdGlvbnMsIG5hbWUpIHtcbiAgdGhpcy5wYXRoID0gbmFtZTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufVxuXG4vKipcbiAqIERlZmluZXMgYSBnZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5nZXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5zZXQoZnVuY3Rpb24gKHYpIHtcbiAqICAgICAgIHZhciBwYXJ0cyA9IHYuc3BsaXQoJyAnKTtcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xuICogICAgICAgdGhpcy5uYW1lLmxhc3QgPSBwYXJ0c1sxXTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcmV0dXJuIHsqfSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4geyp9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgc2V0dGVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICB2YXIgdiA9IHZhbHVlO1xuICBmb3IgKHZhciBsID0gdGhpcy5zZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gdjtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIGtNYXhMZW5ndGggPSAweDNmZmZmZmZmXG52YXIgcm9vdFBhcmVudCA9IHt9XG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIE5vdGU6XG4gKlxuICogLSBJbXBsZW1lbnRhdGlvbiBtdXN0IHN1cHBvcnQgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMuXG4gKiAgIEZpcmVmb3ggNC0yOSBsYWNrZWQgc3VwcG9ydCwgZml4ZWQgaW4gRmlyZWZveCAzMCsuXG4gKiAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG4gKlxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gc3ViamVjdCA+IDAgPyBzdWJqZWN0ID4+PiAwIDogMFxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4ga01heExlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICdzaXplOiAweCcgKyBrTWF4TGVuZ3RoLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gKChzdWJqZWN0W2ldICUgMjU2KSArIDI1NikgJSAyNTZcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICBpZiAobGVuZ3RoID4gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplKVxuICAgIGJ1Zi5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpXG4gICAgICBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihieXRlKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aCwgMilcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG5cbiAgaWYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKTtcblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlbjtcbiAgICBpZiAoc3RhcnQgPCAwKVxuICAgICAgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApXG4gICAgICBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpXG4gICAgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpXG4gICAgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsO1xuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpXG4gICAgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgPj4+IDAgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSA+Pj4gMCAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSW50KHRoaXMsXG4gICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgICAgIGJ5dGVMZW5ndGgsXG4gICAgICAgICAgICAgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSAtIDEsXG4gICAgICAgICAgICAgLU1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJbnQodGhpcyxcbiAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpIC0gMSxcbiAgICAgICAgICAgICAtTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSlcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRfc3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0X3N0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0X3N0YXJ0IDwgMClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMoc3RyaW5nLCB1bml0cykge1xuICB2YXIgY29kZVBvaW50LCBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBieXRlcyA9IFtdXG4gIHZhciBpID0gMFxuXG4gIGZvciAoOyBpPGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuXG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKGxlYWRTdXJyb2dhdGUpIHtcblxuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgIGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICB9XG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcblxuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoLCB1bml0U2l6ZSkge1xuICBpZiAodW5pdFNpemUpIGxlbmd0aCAtPSBsZW5ndGggJSB1bml0U2l6ZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJzdG9yYWdlXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMy4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJNb25nb29zZS1saWtlIHNjaGVtYSB2YWxpZGF0aW9uLCBjb2xsZWN0aW9ucyBhbmQgZG9jdW1lbnRzIG9uIGJyb3dzZXIgKGNsaWVudC1zaWRlKVwiLFxuICBcImF1dGhvclwiOiBcIkNvbnN0YW50aW5lIE1lbG5pa292IDxrYS5tZWxuaWtvdkBnbWFpbC5jb20+XCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vYXJjaGFuZ2VsLWlyay9zdG9yYWdlLmdpdFwiXG4gIH0sXG4gIFwibWFpblwiOiBcImRpc3Qvc3RvcmFnZS5taW4uanNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcInRlc3RcIjogXCJncnVudCB0ZXN0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZ3J1bnRcIjogXCJsYXRlc3RcIixcbiAgICBcInRpbWUtZ3J1bnRcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWNvbnRyaWItanNoaW50XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJncnVudC1jb250cmliLXVnbGlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi13YXRjaFwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQta2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWthcm1hLWNvdmVyYWxsc1wiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtY2hhaVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtcGhhbnRvbWpzLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1jaHJvbWUtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWZpcmVmb3gtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWllLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1zYWZhcmktbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLXNhdWNlLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG5cbiAgICBcImxvZGFzaFwiOiBcIjIuNC4xXCIsXG5cbiAgICBcImJyb3dzZXJpZnlcIjogXCJsYXRlc3RcIixcblxuICAgIFwiZG94XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJoaWdobGlnaHQuanNcIjogXCJsYXRlc3RcIixcbiAgICBcImphZGVcIjogXCJsYXRlc3RcIixcbiAgICBcIm1hcmtkb3duXCI6IFwibGF0ZXN0XCJcbiAgfVxufVxuIl19
