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
 * inspired by mongoose 3.8.4 (fixed bugs for 3.8.19)
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
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

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
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
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
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
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
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
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
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
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
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
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

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
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
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
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
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
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
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

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
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

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
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
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
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
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

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
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

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
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

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
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

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
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
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],42:[function(require,module,exports){
module.exports={
  "name": "storage",
  "version": "0.3.0",
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

    "lodash": "latest",

    "browserify": "latest",

    "dox": "latest",
    "highlight.js": "latest",
    "jade": "latest",
    "markdown": "latest"
  }
}

},{}]},{},[13])(13)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmluYXJ5LmpzIiwibGliL2JpbmFyeXBhcnNlci5qcyIsImxpYi9jb2xsZWN0aW9uLmpzIiwibGliL2RlZmVycmVkLmpzIiwibGliL2RvY3VtZW50LmpzIiwibGliL2Vycm9yLmpzIiwibGliL2Vycm9yL2Nhc3QuanMiLCJsaWIvZXJyb3IvbWVzc2FnZXMuanMiLCJsaWIvZXJyb3IvbWlzc2luZ1NjaGVtYS5qcyIsImxpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwibGliL2Vycm9yL3ZhbGlkYXRvci5qcyIsImxpYi9ldmVudHMuanMiLCJsaWIvaW5kZXguanMiLCJsaWIvaW50ZXJuYWwuanMiLCJsaWIvbXBhdGguanMiLCJsaWIvc2NoZW1hLmpzIiwibGliL3NjaGVtYS9hcnJheS5qcyIsImxpYi9zY2hlbWEvYm9vbGVhbi5qcyIsImxpYi9zY2hlbWEvYnVmZmVyLmpzIiwibGliL3NjaGVtYS9kYXRlLmpzIiwibGliL3NjaGVtYS9kb2N1bWVudGFycmF5LmpzIiwibGliL3NjaGVtYS9pbmRleC5qcyIsImxpYi9zY2hlbWEvbWl4ZWQuanMiLCJsaWIvc2NoZW1hL251bWJlci5qcyIsImxpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCJsaWIvc2NoZW1hL3N0cmluZy5qcyIsImxpYi9zY2hlbWF0eXBlLmpzIiwibGliL3N0YXRlbWFjaGluZS5qcyIsImxpYi90eXBlcy9hcnJheS5qcyIsImxpYi90eXBlcy9idWZmZXIuanMiLCJsaWIvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsImxpYi90eXBlcy9lbWJlZGRlZC5qcyIsImxpYi90eXBlcy9pbmRleC5qcyIsImxpYi90eXBlcy9vYmplY3RpZC5qcyIsImxpYi91dGlscy5qcyIsImxpYi92aXJ0dWFsdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25jQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0MEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWhDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChCdWZmZXIpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgY2xhc3MgcmVwcmVzZW50YXRpb24gb2YgdGhlIEJTT04gQmluYXJ5IHR5cGUuXG4gKlxuICogU3ViIHR5cGVzXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9ERUZBVUxUKiosIGRlZmF1bHQgQlNPTiB0eXBlLlxuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfRlVOQ1RJT04qKiwgQlNPTiBmdW5jdGlvbiB0eXBlLlxuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfQllURV9BUlJBWSoqLCBCU09OIGJ5dGUgYXJyYXkgdHlwZS5cbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX1VVSUQqKiwgQlNPTiB1dWlkIHR5cGUuXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9NRDUqKiwgQlNPTiBtZDUgdHlwZS5cbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX1VTRVJfREVGSU5FRCoqLCBCU09OIHVzZXIgZGVmaW5lZCB0eXBlLlxuICpcbiAqIEBjb25zdHJ1Y3RvciBSZXByZXNlbnRzIHRoZSBCaW5hcnkgQlNPTiB0eXBlLlxuICogQHBhcmFtIHtCdWZmZXJ9IGJ1ZmZlciBhIGJ1ZmZlciBvYmplY3QgY29udGFpbmluZyB0aGUgYmluYXJ5IGRhdGEuXG4gKiBAcGFyYW0ge051bWJlcn0gW3N1YlR5cGVdIHRoZSBvcHRpb24gYmluYXJ5IHR5cGUuXG4gKiBAcmV0dXJuIHtHcmlkfVxuICovXG5mdW5jdGlvbiBCaW5hcnkoYnVmZmVyLCBzdWJUeXBlKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJpbmFyeSkpIHJldHVybiBuZXcgQmluYXJ5KGJ1ZmZlciwgc3ViVHlwZSk7XG5cbiAgdGhpcy5fYnNvbnR5cGUgPSAnQmluYXJ5JztcblxuICBpZihidWZmZXIgaW5zdGFuY2VvZiBOdW1iZXIpIHtcbiAgICB0aGlzLnN1Yl90eXBlID0gYnVmZmVyO1xuICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc3ViX3R5cGUgPSBzdWJUeXBlID09IG51bGwgPyBCU09OX0JJTkFSWV9TVUJUWVBFX0RFRkFVTFQgOiBzdWJUeXBlO1xuICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICB9XG5cbiAgaWYoYnVmZmVyICE9IG51bGwgJiYgIShidWZmZXIgaW5zdGFuY2VvZiBOdW1iZXIpKSB7XG4gICAgLy8gT25seSBhY2NlcHQgQnVmZmVyLCBVaW50OEFycmF5IG9yIEFycmF5c1xuICAgIGlmKHR5cGVvZiBidWZmZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBEaWZmZXJlbnQgd2F5cyBvZiB3cml0aW5nIHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZyBmb3IgdGhlIGRpZmZlcmVudCB0eXBlc1xuICAgICAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBuZXcgQnVmZmVyKGJ1ZmZlcik7XG4gICAgICB9IGVsc2UgaWYodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnIHx8IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYnVmZmVyKSA9PT0gJ1tvYmplY3QgQXJyYXldJykpIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSB3cml0ZVN0cmluZ1RvQXJyYXkoYnVmZmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignb25seSBTdHJpbmcsIEJ1ZmZlciwgVWludDhBcnJheSBvciBBcnJheSBhY2NlcHRlZCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICB9XG4gICAgdGhpcy5wb3NpdGlvbiA9IGJ1ZmZlci5sZW5ndGg7XG4gIH0gZWxzZSB7XG4gICAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gIG5ldyBCdWZmZXIoQmluYXJ5LkJVRkZFUl9TSVpFKTtcbiAgICB9IGVsc2UgaWYodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKXtcbiAgICAgIHRoaXMuYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKEJpbmFyeS5CVUZGRVJfU0laRSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheShCaW5hcnkuQlVGRkVSX1NJWkUpO1xuICAgIH1cbiAgICAvLyBTZXQgcG9zaXRpb24gdG8gc3RhcnQgb2YgYnVmZmVyXG4gICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoaXMgYmluYXJ5IHdpdGggYnl0ZV92YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge0NoYXJhY3Rlcn0gYnl0ZV92YWx1ZSBhIHNpbmdsZSBieXRlIHdlIHdpc2ggdG8gd3JpdGUuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5CaW5hcnkucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uIHB1dChieXRlX3ZhbHVlKSB7XG4gIC8vIElmIGl0J3MgYSBzdHJpbmcgYW5kIGEgaGFzIG1vcmUgdGhhbiBvbmUgY2hhcmFjdGVyIHRocm93IGFuIGVycm9yXG4gIGlmKGJ5dGVfdmFsdWVbJ2xlbmd0aCddICE9IG51bGwgJiYgdHlwZW9mIGJ5dGVfdmFsdWUgIT0gJ251bWJlcicgJiYgYnl0ZV92YWx1ZS5sZW5ndGggIT0gMSkgdGhyb3cgbmV3IEVycm9yKFwib25seSBhY2NlcHRzIHNpbmdsZSBjaGFyYWN0ZXIgU3RyaW5nLCBVaW50OEFycmF5IG9yIEFycmF5XCIpO1xuICBpZih0eXBlb2YgYnl0ZV92YWx1ZSAhPSAnbnVtYmVyJyAmJiBieXRlX3ZhbHVlIDwgMCB8fCBieXRlX3ZhbHVlID4gMjU1KSB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGFjY2VwdHMgbnVtYmVyIGluIGEgdmFsaWQgdW5zaWduZWQgYnl0ZSByYW5nZSAwLTI1NVwiKTtcblxuICAvLyBEZWNvZGUgdGhlIGJ5dGUgdmFsdWUgb25jZVxuICB2YXIgZGVjb2RlZF9ieXRlID0gbnVsbDtcbiAgaWYodHlwZW9mIGJ5dGVfdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgZGVjb2RlZF9ieXRlID0gYnl0ZV92YWx1ZS5jaGFyQ29kZUF0KDApO1xuICB9IGVsc2UgaWYoYnl0ZV92YWx1ZVsnbGVuZ3RoJ10gIT0gbnVsbCkge1xuICAgIGRlY29kZWRfYnl0ZSA9IGJ5dGVfdmFsdWVbMF07XG4gIH0gZWxzZSB7XG4gICAgZGVjb2RlZF9ieXRlID0gYnl0ZV92YWx1ZTtcbiAgfVxuXG4gIGlmKHRoaXMuYnVmZmVyLmxlbmd0aCA+IHRoaXMucG9zaXRpb24pIHtcbiAgICB0aGlzLmJ1ZmZlclt0aGlzLnBvc2l0aW9uKytdID0gZGVjb2RlZF9ieXRlO1xuICB9IGVsc2Uge1xuICAgIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikpIHtcbiAgICAgIC8vIENyZWF0ZSBhZGRpdGlvbmFsIG92ZXJmbG93IGJ1ZmZlclxuICAgICAgdmFyIGJ1ZmZlciA9IG5ldyBCdWZmZXIoQmluYXJ5LkJVRkZFUl9TSVpFICsgdGhpcy5idWZmZXIubGVuZ3RoKTtcbiAgICAgIC8vIENvbWJpbmUgdGhlIHR3byBidWZmZXJzIHRvZ2V0aGVyXG4gICAgICB0aGlzLmJ1ZmZlci5jb3B5KGJ1ZmZlciwgMCwgMCwgdGhpcy5idWZmZXIubGVuZ3RoKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgdGhpcy5idWZmZXJbdGhpcy5wb3NpdGlvbisrXSA9IGRlY29kZWRfYnl0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZmZlciA9IG51bGw7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgYnVmZmVyICh0eXBlZCBvciBub3JtYWwgYXJyYXkpXG4gICAgICBpZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5idWZmZXIpID09PSAnW29iamVjdCBVaW50OEFycmF5XScpIHtcbiAgICAgICAgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKEJpbmFyeS5CVUZGRVJfU0laRSArIHRoaXMuYnVmZmVyLmxlbmd0aCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVmZmVyID0gbmV3IEFycmF5KEJpbmFyeS5CVUZGRVJfU0laRSArIHRoaXMuYnVmZmVyLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIG5lZWQgdG8gY29weSBhbGwgdGhlIGNvbnRlbnQgdG8gdGhlIG5ldyBhcnJheVxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMuYnVmZmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ1ZmZlcltpXSA9IHRoaXMuYnVmZmVyW2ldO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWFzc2lnbiB0aGUgYnVmZmVyXG4gICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgIC8vIFdyaXRlIHRoZSBieXRlXG4gICAgICB0aGlzLmJ1ZmZlclt0aGlzLnBvc2l0aW9uKytdID0gZGVjb2RlZF9ieXRlO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBXcml0ZXMgYSBidWZmZXIgb3Igc3RyaW5nIHRvIHRoZSBiaW5hcnkuXG4gKlxuICogQHBhcmFtIHtCdWZmZXJ8U3RyaW5nfSBzdHJpbmcgYSBzdHJpbmcgb3IgYnVmZmVyIHRvIGJlIHdyaXR0ZW4gdG8gdGhlIEJpbmFyeSBCU09OIG9iamVjdC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgc3BlY2lmeSB0aGUgYmluYXJ5IG9mIHdoZXJlIHRvIHdyaXRlIHRoZSBjb250ZW50LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlKHN0cmluZywgb2Zmc2V0KSB7XG4gIG9mZnNldCA9IHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInID8gb2Zmc2V0IDogdGhpcy5wb3NpdGlvbjtcblxuICAvLyBJZiB0aGUgYnVmZmVyIGlzIHRvIHNtYWxsIGxldCdzIGV4dGVuZCB0aGUgYnVmZmVyXG4gIGlmKHRoaXMuYnVmZmVyLmxlbmd0aCA8IG9mZnNldCArIHN0cmluZy5sZW5ndGgpIHtcbiAgICB2YXIgYnVmZmVyID0gbnVsbDtcbiAgICAvLyBJZiB3ZSBhcmUgaW4gbm9kZS5qc1xuICAgIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikpIHtcbiAgICAgIGJ1ZmZlciA9IG5ldyBCdWZmZXIodGhpcy5idWZmZXIubGVuZ3RoICsgc3RyaW5nLmxlbmd0aCk7XG4gICAgICB0aGlzLmJ1ZmZlci5jb3B5KGJ1ZmZlciwgMCwgMCwgdGhpcy5idWZmZXIubGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMuYnVmZmVyKSA9PT0gJ1tvYmplY3QgVWludDhBcnJheV0nKSB7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgYnVmZmVyXG4gICAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIodGhpcy5idWZmZXIubGVuZ3RoICsgc3RyaW5nLmxlbmd0aCkpXG4gICAgICAvLyBDb3B5IHRoZSBjb250ZW50XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5wb3NpdGlvbjsgaSsrKSB7XG4gICAgICAgIGJ1ZmZlcltpXSA9IHRoaXMuYnVmZmVyW2ldO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFzc2lnbiB0aGUgbmV3IGJ1ZmZlclxuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICB9XG5cbiAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQnVmZmVyLmlzQnVmZmVyKHN0cmluZykgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSkge1xuICAgIHN0cmluZy5jb3B5KHRoaXMuYnVmZmVyLCBvZmZzZXQsIDAsIHN0cmluZy5sZW5ndGgpO1xuICAgIHRoaXMucG9zaXRpb24gPSAob2Zmc2V0ICsgc3RyaW5nLmxlbmd0aCkgPiB0aGlzLnBvc2l0aW9uID8gKG9mZnNldCArIHN0cmluZy5sZW5ndGgpIDogdGhpcy5wb3NpdGlvbjtcbiAgICAvLyBvZmZzZXQgPSBzdHJpbmcubGVuZ3RoXG4gIH0gZWxzZSBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygc3RyaW5nID09PSAnc3RyaW5nJyAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpKSB7XG4gICAgdGhpcy5idWZmZXIud3JpdGUoc3RyaW5nLCAnYmluYXJ5Jywgb2Zmc2V0KTtcbiAgICB0aGlzLnBvc2l0aW9uID0gKG9mZnNldCArIHN0cmluZy5sZW5ndGgpID4gdGhpcy5wb3NpdGlvbiA/IChvZmZzZXQgKyBzdHJpbmcubGVuZ3RoKSA6IHRoaXMucG9zaXRpb247XG4gICAgLy8gb2Zmc2V0ID0gc3RyaW5nLmxlbmd0aDtcbiAgfSBlbHNlIGlmKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdHJpbmcpID09PSAnW29iamVjdCBVaW50OEFycmF5XSdcbiAgICB8fCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3RyaW5nKSA9PT0gJ1tvYmplY3QgQXJyYXldJyAmJiB0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuYnVmZmVyW29mZnNldCsrXSA9IHN0cmluZ1tpXTtcbiAgICB9XG5cbiAgICB0aGlzLnBvc2l0aW9uID0gb2Zmc2V0ID4gdGhpcy5wb3NpdGlvbiA/IG9mZnNldCA6IHRoaXMucG9zaXRpb247XG4gIH0gZWxzZSBpZih0eXBlb2Ygc3RyaW5nID09PSAnc3RyaW5nJykge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuYnVmZmVyW29mZnNldCsrXSA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgIH1cblxuICAgIHRoaXMucG9zaXRpb24gPSBvZmZzZXQgPiB0aGlzLnBvc2l0aW9uID8gb2Zmc2V0IDogdGhpcy5wb3NpdGlvbjtcbiAgfVxufTtcblxuLyoqXG4gKiBSZWFkcyAqKmxlbmd0aCoqIGJ5dGVzIHN0YXJ0aW5nIGF0ICoqcG9zaXRpb24qKi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gcG9zaXRpb24gcmVhZCBmcm9tIHRoZSBnaXZlbiBwb3NpdGlvbiBpbiB0aGUgQmluYXJ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCB0aGUgbnVtYmVyIG9mIGJ5dGVzIHRvIHJlYWQuXG4gKiBAcmV0dXJuIHtCdWZmZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5CaW5hcnkucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbiByZWFkKHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgbGVuZ3RoID0gbGVuZ3RoICYmIGxlbmd0aCA+IDBcbiAgICA/IGxlbmd0aFxuICAgIDogdGhpcy5wb3NpdGlvbjtcblxuICAvLyBMZXQncyByZXR1cm4gdGhlIGRhdGEgYmFzZWQgb24gdGhlIHR5cGUgd2UgaGF2ZVxuICBpZih0aGlzLmJ1ZmZlclsnc2xpY2UnXSkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShwb3NpdGlvbiwgcG9zaXRpb24gKyBsZW5ndGgpO1xuICB9IGVsc2Uge1xuICAgIC8vIENyZWF0ZSBhIGJ1ZmZlciB0byBrZWVwIHRoZSByZXN1bHRcbiAgICB2YXIgYnVmZmVyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT0gJ3VuZGVmaW5lZCcgPyBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIobGVuZ3RoKSkgOiBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZmZlcltpXSA9IHRoaXMuYnVmZmVyW3Bvc2l0aW9uKytdO1xuICAgIH1cbiAgfVxuICAvLyBSZXR1cm4gdGhlIGJ1ZmZlclxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGlzIGJpbmFyeSBhcyBhIHN0cmluZy5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5CaW5hcnkucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24gdmFsdWUoYXNSYXcpIHtcbiAgYXNSYXcgPSBhc1JhdyA9PSBudWxsID8gZmFsc2UgOiBhc1JhdztcblxuICAvLyBPcHRpbWl6ZSB0byBzZXJpYWxpemUgZm9yIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlIGRhdGEgPT0gc2l6ZSBvZiBidWZmZXJcbiAgaWYoYXNSYXcgJiYgdHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSAmJiB0aGlzLmJ1ZmZlci5sZW5ndGggPT0gdGhpcy5wb3NpdGlvbilcbiAgICByZXR1cm4gdGhpcy5idWZmZXI7XG5cbiAgLy8gSWYgaXQncyBhIG5vZGUuanMgYnVmZmVyIG9iamVjdFxuICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpKSB7XG4gICAgcmV0dXJuIGFzUmF3ID8gdGhpcy5idWZmZXIuc2xpY2UoMCwgdGhpcy5wb3NpdGlvbikgOiB0aGlzLmJ1ZmZlci50b1N0cmluZygnYmluYXJ5JywgMCwgdGhpcy5wb3NpdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgaWYoYXNSYXcpIHtcbiAgICAgIC8vIHdlIHN1cHBvcnQgdGhlIHNsaWNlIGNvbW1hbmQgdXNlIGl0XG4gICAgICBpZih0aGlzLmJ1ZmZlclsnc2xpY2UnXSAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZSgwLCB0aGlzLnBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBidWZmZXIgdG8gY29weSBjb250ZW50IHRvXG4gICAgICAgIHZhciBuZXdCdWZmZXIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5idWZmZXIpID09PSAnW29iamVjdCBVaW50OEFycmF5XScgPyBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIodGhpcy5wb3NpdGlvbikpIDogbmV3IEFycmF5KHRoaXMucG9zaXRpb24pO1xuICAgICAgICAvLyBDb3B5IGNvbnRlbnRcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMucG9zaXRpb247IGkrKykge1xuICAgICAgICAgIG5ld0J1ZmZlcltpXSA9IHRoaXMuYnVmZmVyW2ldO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJldHVybiB0aGUgYnVmZmVyXG4gICAgICAgIHJldHVybiBuZXdCdWZmZXI7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjb252ZXJ0QXJyYXl0b1V0ZjhCaW5hcnlTdHJpbmcodGhpcy5idWZmZXIsIDAsIHRoaXMucG9zaXRpb24pO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBMZW5ndGguXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgbGVuZ3RoIG9mIHRoZSBiaW5hcnkuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5CaW5hcnkucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgcmV0dXJuIHRoaXMucG9zaXRpb247XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5CaW5hcnkucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5idWZmZXIgIT0gbnVsbCA/IHRoaXMuYnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKSA6ICcnO1xufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQmluYXJ5LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKGZvcm1hdCkge1xuICByZXR1cm4gdGhpcy5idWZmZXIgIT0gbnVsbCA/IHRoaXMuYnVmZmVyLnNsaWNlKDAsIHRoaXMucG9zaXRpb24pLnRvU3RyaW5nKGZvcm1hdCkgOiAnJztcbn07XG5cbi8vIEJpbmFyeSBkZWZhdWx0IHN1YnR5cGVcbnZhciBCU09OX0JJTkFSWV9TVUJUWVBFX0RFRkFVTFQgPSAwO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgd3JpdGVTdHJpbmdUb0FycmF5ID0gZnVuY3Rpb24oZGF0YSkge1xuICAvLyBDcmVhdGUgYSBidWZmZXJcbiAgdmFyIGJ1ZmZlciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcihkYXRhLmxlbmd0aCkpIDogbmV3IEFycmF5KGRhdGEubGVuZ3RoKTtcbiAgLy8gV3JpdGUgdGhlIGNvbnRlbnQgdG8gdGhlIGJ1ZmZlclxuICBmb3IodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgIGJ1ZmZlcltpXSA9IGRhdGEuY2hhckNvZGVBdChpKTtcbiAgfVxuICAvLyBXcml0ZSB0aGUgc3RyaW5nIHRvIHRoZSBidWZmZXJcbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbi8qKlxuICogQ29udmVydCBBcnJheSBvdCBVaW50OEFycmF5IHRvIEJpbmFyeSBTdHJpbmdcbiAqXG4gKiBAaWdub3JlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xudmFyIGNvbnZlcnRBcnJheXRvVXRmOEJpbmFyeVN0cmluZyA9IGZ1bmN0aW9uKGJ5dGVBcnJheSwgc3RhcnRJbmRleCwgZW5kSW5kZXgpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICBmb3IodmFyIGkgPSBzdGFydEluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgIHJlc3VsdCA9IHJlc3VsdCArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZUFycmF5W2ldKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuQmluYXJ5LkJVRkZFUl9TSVpFID0gMjU2O1xuXG4vKiFcbiAqIERlZmF1bHQgQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfREVGQVVMVCA9IDA7XG5cbi8qIVxuICogRnVuY3Rpb24gQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfRlVOQ1RJT04gPSAxO1xuXG4vKiFcbiAqIEJ5dGUgQXJyYXkgQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfQllURV9BUlJBWSA9IDI7XG5cbi8qIVxuICogT0xEIFVVSUQgQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfVVVJRF9PTEQgPSAzO1xuXG4vKiFcbiAqIFVVSUQgQlNPTiB0eXBlXG4gKlxuICogQGNvbnN0IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfVVVJRCA9IDQ7XG5cbi8qIVxuICogTUQ1IEJTT04gdHlwZVxuICpcbiAqIEBjb25zdCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX01ENSA9IDU7XG5cbi8qIVxuICogVXNlciBCU09OIHR5cGVcbiAqXG4gKiBAY29uc3QgU1VCVFlQRV9ERUZBVUxUXG4gKiovXG5CaW5hcnkuU1VCVFlQRV9VU0VSX0RFRklORUQgPSAxMjg7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQmluYXJ5O1xubW9kdWxlLmV4cG9ydHMuQmluYXJ5ID0gQmluYXJ5O1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBCaW5hcnkgUGFyc2VyLlxuICogQGNvcHlyaWdodCBKb25hcyBSYW9uaSBTb2FyZXMgU2lsdmFcbiAqIEBzZWUgaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBbdjEuMF1cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb25nb2RiL2pzLWJzb24vYmxvYi9tYXN0ZXIvbGliL2Jzb24vYmluYXJ5X3BhcnNlci5qc1xuICovXG5cbnZhciBtYXhCaXRzID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcblx0bWF4Qml0c1tpXSA9IE1hdGgucG93KDIsIGkpO1xufVxuXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXIgKGJpZ0VuZGlhbiwgYWxsb3dFeGNlcHRpb25zKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJpbmFyeVBhcnNlcikpIHJldHVybiBuZXcgQmluYXJ5UGFyc2VyKGJpZ0VuZGlhbiwgYWxsb3dFeGNlcHRpb25zKTtcbiAgXG5cdHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuO1xuXHR0aGlzLmFsbG93RXhjZXB0aW9ucyA9IGFsbG93RXhjZXB0aW9ucztcbn1cblxuQmluYXJ5UGFyc2VyLndhcm4gPSBmdW5jdGlvbiB3YXJuIChtc2cpIHtcblx0aWYgKHRoaXMuYWxsb3dFeGNlcHRpb25zKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cblxuXHRyZXR1cm4gMTtcbn07XG5cbkJpbmFyeVBhcnNlci5kZWNvZGVJbnQgPSBmdW5jdGlvbiBkZWNvZGVJbnQgKGRhdGEsIGJpdHMsIHNpZ25lZCwgZm9yY2VCaWdFbmRpYW4pIHtcbiAgdmFyIGIgPSBuZXcgdGhpcy5CdWZmZXIodGhpcy5iaWdFbmRpYW4gfHwgZm9yY2VCaWdFbmRpYW4sIGRhdGEpXG4gICAgICAsIHggPSBiLnJlYWRCaXRzKDAsIGJpdHMpXG4gICAgICAsIG1heCA9IG1heEJpdHNbYml0c107IC8vbWF4ID0gTWF0aC5wb3coIDIsIGJpdHMgKTtcbiAgXG4gIHJldHVybiBzaWduZWQgJiYgeCA+PSBtYXggLyAyXG4gICAgICA/IHggLSBtYXhcbiAgICAgIDogeDtcbn07XG5cbkJpbmFyeVBhcnNlci5lbmNvZGVJbnQgPSBmdW5jdGlvbiBlbmNvZGVJbnQgKGRhdGEsIGJpdHMsIHNpZ25lZCwgZm9yY2VCaWdFbmRpYW4pIHtcblx0dmFyIG1heCA9IG1heEJpdHNbYml0c107XG5cbiAgaWYgKGRhdGEgPj0gbWF4IHx8IGRhdGEgPCAtKG1heCAvIDIpKSB7XG4gICAgdGhpcy53YXJuKCdlbmNvZGVJbnQ6Om92ZXJmbG93Jyk7XG4gICAgZGF0YSA9IDA7XG4gIH1cblxuXHRpZiAoZGF0YSA8IDApIHtcbiAgICBkYXRhICs9IG1heDtcbiAgfVxuXG5cdGZvciAodmFyIHIgPSBbXTsgZGF0YTsgcltyLmxlbmd0aF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGRhdGEgJSAyNTYpLCBkYXRhID0gTWF0aC5mbG9vcihkYXRhIC8gMjU2KSk7XG5cblx0Zm9yIChiaXRzID0gLSgtYml0cyA+PiAzKSAtIHIubGVuZ3RoOyBiaXRzLS07IHJbci5sZW5ndGhdID0gJ1xcMCcpO1xuXG4gIHJldHVybiAoKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuKSA/IHIucmV2ZXJzZSgpIDogcikuam9pbignJyk7XG59O1xuXG5CaW5hcnlQYXJzZXIudG9TbWFsbCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgIDgsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVNtYWxsICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgIDgsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9CeXRlICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgIDgsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUJ5dGUgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgIDgsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9TaG9ydCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMTYsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVNob3J0ICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMTYsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9Xb3JkICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMTYsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVdvcmQgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMTYsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9JbnQgICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMzIsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUludCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMzIsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9Mb25nICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgNjQsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUxvbmcgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9EV29yZCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMzIsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbURXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMzIsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9RV29yZCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tUVdvcmQgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCA2NCwgdHJ1ZSApOyB9O1xuXG4vKiFcbiAqIEBjb25zdHJ1Y3RvciBCaW5hcnlQYXJzZXIgYnVmZmVyIGNvbnN0cnVjdG9yLlxuICovXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXJCdWZmZXIgKGJpZ0VuZGlhbiwgYnVmZmVyKSB7XG4gIHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuIHx8IDA7XG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG59XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gc2V0QnVmZmVyIChkYXRhKSB7XG4gIHZhciBsLCBpLCBiO1xuXG5cdGlmIChkYXRhKSB7XG4gICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICBiID0gdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkobCk7XG5cdFx0Zm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuXHRcdHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuXHR9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmhhc05lZWRlZEJpdHMgPSBmdW5jdGlvbiBoYXNOZWVkZWRCaXRzIChuZWVkZWRCaXRzKSB7XG5cdHJldHVybiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0gLSgtbmVlZGVkQml0cyA+PiAzKTtcbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuY2hlY2tCdWZmZXIgPSBmdW5jdGlvbiBjaGVja0J1ZmZlciAobmVlZGVkQml0cykge1xuXHRpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignY2hlY2tCdWZmZXI6Om1pc3NpbmcgYnl0ZXMnKTtcbiAgfVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5yZWFkQml0cyA9IGZ1bmN0aW9uIHJlYWRCaXRzIChzdGFydCwgbGVuZ3RoKSB7XG5cdC8vc2hsIGZpeDogSGVucmkgVG9yZ2VtYW5lIH4xOTk2IChjb21wcmVzc2VkIGJ5IEpvbmFzIFJhb25pKVxuXG5cdGZ1bmN0aW9uIHNobCAoYSwgYikge1xuXHRcdGZvciAoOyBiLS07IGEgPSAoKGEgJT0gMHg3ZmZmZmZmZiArIDEpICYgMHg0MDAwMDAwMCkgPT0gMHg0MDAwMDAwMCA/IGEgKiAyIDogKGEgLSAweDQwMDAwMDAwKSAqIDIgKyAweDdmZmZmZmZmICsgMSk7XG5cdFx0cmV0dXJuIGE7XG5cdH1cblxuXHRpZiAoc3RhcnQgPCAwIHx8IGxlbmd0aCA8PSAwKSB7XG5cdFx0cmV0dXJuIDA7XG4gIH1cblxuXHR0aGlzLmNoZWNrQnVmZmVyKHN0YXJ0ICsgbGVuZ3RoKTtcblxuICB2YXIgb2Zmc2V0TGVmdFxuICAgICwgb2Zmc2V0UmlnaHQgPSBzdGFydCAlIDhcbiAgICAsIGN1ckJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggLSAoIHN0YXJ0ID4+IDMgKSAtIDFcbiAgICAsIGxhc3RCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoICsgKCAtKCBzdGFydCArIGxlbmd0aCApID4+IDMgKVxuICAgICwgZGlmZiA9IGN1ckJ5dGUgLSBsYXN0Qnl0ZVxuICAgICwgc3VtID0gKCh0aGlzLmJ1ZmZlclsgY3VyQnl0ZSBdID4+IG9mZnNldFJpZ2h0KSAmICgoMSA8PCAoZGlmZiA/IDggLSBvZmZzZXRSaWdodCA6IGxlbmd0aCkpIC0gMSkpICsgKGRpZmYgJiYgKG9mZnNldExlZnQgPSAoc3RhcnQgKyBsZW5ndGgpICUgOCkgPyAodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10gJiAoKDEgPDwgb2Zmc2V0TGVmdCkgLSAxKSkgPDwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0IDogMCk7XG5cblx0Zm9yKDsgZGlmZjsgc3VtICs9IHNobCh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0KSk7XG5cblx0cmV0dXJuIHN1bTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cbkJpbmFyeVBhcnNlci5CdWZmZXIgPSBCaW5hcnlQYXJzZXJCdWZmZXI7XG5leHBvcnRzLkJpbmFyeVBhcnNlciA9IEJpbmFyeVBhcnNlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50Jyk7XG5cbi8vVE9ETzog0L3QsNC/0LjRgdCw0YLRjCDQvNC10YLQvtC0IC51cHNlcnQoIGRvYyApIC0g0L7QsdC90L7QstC70LXQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwLCDQsCDQtdGB0LvQuCDQtdCz0L4g0L3QtdGCLCDRgtC+INGB0L7Qt9C00LDQvdC40LVcblxuLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC70L7Qs9C40LrRgyDRgSBhcGlSZXNvdXJjZSAo0YHQvtGF0YDQsNC90Y/RgtGMINGB0YHRi9C70LrRgyDQvdCwINC90LXQs9C+INC4INC40YHQv9C+0LvRjNC30L7QstGC0Ywg0L/RgNC4INC80LXRgtC+0LTQtSBkb2Muc2F2ZSlcbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC4XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0KHRhdC10LzQsCDQuNC70Lgg0L7QsdGK0LXQutGCINC+0L/QuNGB0LDQvdC40Y8g0YHRhdC10LzRi1xuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICAvLyDQodC+0YXRgNCw0L3QuNC8INC90LDQt9Cy0LDQvdC40LUg0L/RgNC+0YHRgtGA0LDQvdGB0YLQstCwINC40LzRkdC9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgdGhpcy5kb2N1bWVudHMgPSB7fTtcblxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDRgdGB0YvQu9C60YMg0L3QsCBhcGkg0LTQu9GPINC80LXRgtC+0LTQsCAuc2F2ZSgpXG4gIHRoaXMuYXBpID0gYXBpO1xuXG4gIC8vINCY0YHQv9C+0LvRjNC30YPQtdC80LDRjyDRgdGF0LXQvNCwINC00LvRjyDQutC+0LvQu9C10LrRhtC40LhcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8g0J7RgtC+0LHRgNCw0LbQtdC90LjQtSDQv9C+0LvRjyBkb2N1bWVudHMg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAgKNC00LvRjyDQvdC+0LrQsNGD0YLQsClcbiAgdGhpcy5hcnJheSA9IFtdO1xuICAvLyB0b2RvOiDQv9C10YDQtdC90LXRgdGC0Lgg0LIg0LDQtNCw0L/RgtC10YAg0LjQu9C4INGB0LTQtdC70LDRgtGMINC/0L4g0LTRgNGD0LPQvtC80YMgKG9iamVjdC5vYnNlcnZlKVxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDQv9GA0LjQstGP0LfQvtC6INC6INGN0YLQvtC80YMg0YHQstC+0LnRgdGC0LLRgyDQtNC70Y8ga25vY2tvdXRqc1xuICB3aW5kb3cua28gJiYga28udHJhY2soIHRoaXMsIFsnYXJyYXknXSApO1xufVxuXG5Db2xsZWN0aW9uLnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgdHlwZTogJ2plbGx5IGJlYW4nIH0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKFt7IHR5cGU6ICdqZWxseSBiZWFuJyB9LCB7IHR5cGU6ICdzbmlja2VycycgfV0pO1xuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgX2lkOiAnKioqKionLCB0eXBlOiAnamVsbHkgYmVhbicgfSwgdHJ1ZSk7XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fEFycmF5LjxvYmplY3Q+fSBbZG9jXSAtINCU0L7QutGD0LzQtdC90YJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINC/0YDQuCDQt9Cw0L/RgNC+0YHQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+INCyINC00L7QutGD0LzQtdC90YLQtSlcbiAgICogQHBhcmFtIHtib29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtfc3RvcmFnZVdpbGxNdXRhdGVdIC0g0KTQu9Cw0LMg0LTQvtCx0LDQstC70LXQvdC40Y8g0LzQsNGB0YHQuNCy0LAg0LTQvtC60YPQvNC10L3RgtC+0LIuINGC0L7Qu9GM0LrQviDQtNC70Y8g0LLQvdGD0YLRgNC10L3QvdC10LPQviDQuNGB0L/QvtC70YzQt9C+0LLQsNC90LjRj1xuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHxBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBhZGQ6IGZ1bmN0aW9uKCBkb2MsIGZpZWxkcywgaW5pdCwgX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgtCwINC90LXRgiwg0LfQvdCw0YfQuNGCINCx0YPQtNC10YIg0L/Rg9GB0YLQvtC5XG4gICAgaWYgKCBkb2MgPT0gbnVsbCApIGRvYyA9IG51bGw7XG5cbiAgICAvLyDQnNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgICBpZiAoIF8uaXNBcnJheSggZG9jICkgKXtcbiAgICAgIHZhciBzYXZlZERvY3MgPSBbXTtcblxuICAgICAgXy5lYWNoKCBkb2MsIGZ1bmN0aW9uKCBkb2MgKXtcbiAgICAgICAgc2F2ZWREb2NzLnB1c2goIHNlbGYuYWRkKCBkb2MsIGZpZWxkcywgaW5pdCwgdHJ1ZSApICk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xuXG4gICAgICByZXR1cm4gc2F2ZWREb2NzO1xuICAgIH1cblxuICAgIHZhciBpZCA9IGRvYyAmJiBkb2MuX2lkO1xuXG4gICAgLy8g0JXRgdC70Lgg0LTQvtC60YPQvNC10L3RgiDRg9C20LUg0LXRgdGC0YwsINGC0L4g0L/RgNC+0YHRgtC+INGD0YHRgtCw0L3QvtCy0LjRgtGMINC30L3QsNGH0LXQvdC40Y9cbiAgICBpZiAoIGlkICYmIHRoaXMuZG9jdW1lbnRzWyBpZCBdICl7XG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXS5zZXQoIGRvYyApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXNjcmltaW5hdG9yTWFwcGluZyA9IHRoaXMuc2NoZW1hXG4gICAgICAgID8gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmdcbiAgICAgICAgOiBudWxsO1xuXG4gICAgICB2YXIga2V5ID0gZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290XG4gICAgICAgID8gZGlzY3JpbWluYXRvck1hcHBpbmcua2V5XG4gICAgICAgIDogbnVsbDtcblxuICAgICAgLy8g0JLRi9Cx0LjRgNCw0LXQvCDRgdGF0LXQvNGDLCDQtdGB0LvQuCDQtdGB0YLRjCDQtNC40YHQutGA0LjQvNC40L3QsNGC0L7RgFxuICAgICAgdmFyIHNjaGVtYTtcbiAgICAgIGlmIChrZXkgJiYgZG9jICYmIGRvY1trZXldICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzICYmIHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzW2RvY1trZXldXSkge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmV3RG9jID0gbmV3IERvY3VtZW50KCBkb2MsIHRoaXMubmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKTtcbiAgICAgIC8vdG9kbzog0YLRg9GCINC90YPQttC90LAg0L/RgNC+0LLQtdGA0LrQsCDQvdCwINGB0YPRidC10YHRgtCy0L7QstCw0L3QuNC1IGlkICjQvNC+0LbQtdGCINGB0YLQvtC40YIg0YHQvNC+0YLRgNC10YLRjCDQsiDRgdGF0LXQvNC1INC+0L/RhtC40Y4gaWQpXG4gICAgICAvKiFcbiAgICAgIGlmICggIW5ld0RvYy5faWQgKXtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0JTQu9GPINC/0L7QvNC10YnQtdC90LjRjyDQsiDQutC+0LvQu9C10LrRhtC40Y4g0L3QtdC+0LHRhdC+0LTQuNC80L4sINGH0YLQvtCx0Ysg0YMg0LTQvtC60YPQvNC10L3RgtCwINCx0YvQuyBfaWQnKTtcbiAgICAgIH1cbiAgICAgICovXG5cbiAgICAgIGlkID0gbmV3RG9jLl9pZC50b1N0cmluZygpO1xuICAgICAgLy8g0J/QvtC80LXRgdGC0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LIg0LrQvtC70LvQtdC60YbQuNGOXG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXSA9IG5ld0RvYztcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGB0YvQu9C60YMg0L3QsCDQtNC+0LrRg9C80LXQvdGCINCyINC/0L7Qu9C1IGRvY3VtZW50c1xuICAgKlxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBkb2NcbiAgICovXG4gIHVwZGF0ZUlkTGluazogZnVuY3Rpb24oIGRvYyApe1xuICAgIHZhciBpZCA9IGRvYy5faWQudG9TdHJpbmcoKTtcbiAgICB2YXIgb2xkSWQgPSBfLmZpbmRLZXkoIHRoaXMuZG9jdW1lbnRzLCB7IF9pZDogZG9jLl9pZCB9KTtcblxuICAgIGlmICggIW9sZElkICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQndC1INC90LDQudC00LXQvSDQtNC+0LrRg9C80LXQvdGCINC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGB0YvQu9C60Lgg0L/QviDRjdGC0L7QvNGDIF9pZDogJyArIGlkICk7XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMuZG9jdW1lbnRzWyBvbGRJZCBdO1xuICAgIHRoaXMuZG9jdW1lbnRzWyBpZCBdID0gZG9jO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG5TdGFuZGFsb25lIERlZmVycmVkXG5Db3B5cmlnaHQgMjAxMiBPdHRvIFZlaHZpbMOkaW5lblxuUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2Vcbmh0dHBzOi8vZ2l0aHViLmNvbS9NdW1ha2lsL1N0YW5kYWxvbmUtRGVmZXJyZWRcblxuVGhpcyBpcyBhIHN0YW5kYWxvbmUgaW1wbGVtZW50YXRpb24gb2YgdGhlIHdvbmRlcmZ1bCBqUXVlcnkuRGVmZXJyZWQgQVBJLlxuVGhlIGRvY3VtZW50YXRpb24gaGVyZSBpcyBvbmx5IGZvciBxdWljayByZWZlcmVuY2UsIGZvciBjb21wbGV0ZSBhcGkgcGxlYXNlXG5zZWUgdGhlIGdyZWF0IHdvcmsgb2YgdGhlIG9yaWdpbmFsIHByb2plY3Q6XG5cbmh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9jYXRlZ29yeS9kZWZlcnJlZC1vYmplY3QvXG4qL1xuXG52YXIgUHJvbWlzZSwgZmxhdHRlbiwgaXNPYnNlcnZhYmxlLFxuICBfX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLFxuICBfX2JpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5mb3JFYWNoKSB0aHJvdyBuZXcgRXJyb3IoJ0RlZmVycmVkIHJlcXVpcmVzIEFycmF5LmZvckVhY2gnKTtcblxuLypcblRlbGxzIGlmIGFuIG9iamVjdCBpcyBvYnNlcnZhYmxlXG4qL1xuXG5pc09ic2VydmFibGUgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIChvYmogaW5zdGFuY2VvZiBEZWZlcnJlZCkgfHwgKG9iaiBpbnN0YW5jZW9mIFByb21pc2UpO1xufTtcblxuLypcbkZsYXR0ZW4gYSB0d28gZGltZW5zaW9uYWwgYXJyYXkgaW50byBvbmUgZGltZW5zaW9uLlxuUmVtb3ZlcyBlbGVtZW50cyB0aGF0IGFyZSBub3QgZnVuY3Rpb25zXG4qL1xuXG5mbGF0dGVuID0gZnVuY3Rpb24oYXJncykge1xuICB2YXIgZmxhdHRlZDtcbiAgaWYgKCFhcmdzKSByZXR1cm4gW107XG4gIGZsYXR0ZWQgPSBbXTtcbiAgYXJncy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBmbGF0dGVkLnB1c2goaXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXJncy5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZsYXR0ZWQucHVzaChmbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmbGF0dGVkO1xufTtcblxuLypcblByb21pc2Ugb2JqZWN0IGZ1bmN0aW9ucyBhcyBhIHByb3h5IGZvciBhIERlZmVycmVkLCBleGNlcHRcbml0IGRvZXMgbm90IGxldCB5b3UgbW9kaWZ5IHRoZSBzdGF0ZSBvZiB0aGUgRGVmZXJyZWRcbiovXG5cblByb21pc2UgPSAoZnVuY3Rpb24oKSB7XG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuX2RlZmVycmVkID0gbnVsbDtcblxuICBmdW5jdGlvbiBQcm9taXNlKGRlZmVycmVkKSB7XG4gICAgdGhpcy5fZGVmZXJyZWQgPSBkZWZlcnJlZDtcbiAgfVxuXG4gIFByb21pc2UucHJvdG90eXBlLmFsd2F5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzLCBfcmVmO1xuICAgIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIChfcmVmID0gdGhpcy5fZGVmZXJyZWQpLmFsd2F5cy5hcHBseShfcmVmLCBhcmdzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MsIF9yZWY7XG4gICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgKF9yZWYgPSB0aGlzLl9kZWZlcnJlZCkuZG9uZS5hcHBseShfcmVmLCBhcmdzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5mYWlsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MsIF9yZWY7XG4gICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgKF9yZWYgPSB0aGlzLl9kZWZlcnJlZCkuZmFpbC5hcHBseShfcmVmLCBhcmdzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oZG9uZUZpbHRlciwgZmFpbEZpbHRlcikge1xuICAgIHJldHVybiB0aGlzLl9kZWZlcnJlZC5waXBlKGRvbmVGaWx0ZXIsIGZhaWxGaWx0ZXIpO1xuICB9O1xuXG4gIFByb21pc2UucHJvdG90eXBlLnN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RlZmVycmVkLnN0YXRlKCk7XG4gIH07XG5cbiAgUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKGRvbmUsIGZhaWwpIHtcbiAgICB0aGlzLl9kZWZlcnJlZC50aGVuKGRvbmUsIGZhaWwpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHJldHVybiBQcm9taXNlO1xuXG59KSgpO1xuXG4vKlxuICBJbml0aWFsaXplcyBhIG5ldyBEZWZlcnJlZC4gWW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gYXMgYSBwYXJhbWV0ZXJcbiAgdG8gYmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgaW5pdC4gVGhlIGZ1bmN0aW9uIHJlY2VpdmVzXG4gIHRoZSBuZXcgZGVmZXJyZWQgb2JqZWN0IGFzIGEgcGFyYW1ldGVyIGFuZCB0aGlzIGlzIGFsc28gc2V0IHRvIHRoZVxuICBzYW1lIG9iamVjdC5cbiovXG5mdW5jdGlvbiBEZWZlcnJlZChmbikge1xuICB0aGlzLnRoZW4gPSBfX2JpbmQodGhpcy50aGVuLCB0aGlzKTtcbiAgdGhpcy5yZXNvbHZlV2l0aCA9IF9fYmluZCh0aGlzLnJlc29sdmVXaXRoLCB0aGlzKTtcbiAgdGhpcy5yZXNvbHZlID0gX19iaW5kKHRoaXMucmVzb2x2ZSwgdGhpcyk7XG4gIHRoaXMucmVqZWN0V2l0aCA9IF9fYmluZCh0aGlzLnJlamVjdFdpdGgsIHRoaXMpO1xuICB0aGlzLnJlamVjdCA9IF9fYmluZCh0aGlzLnJlamVjdCwgdGhpcyk7XG4gIHRoaXMucHJvbWlzZSA9IF9fYmluZCh0aGlzLnByb21pc2UsIHRoaXMpO1xuICB0aGlzLnByb2dyZXNzID0gX19iaW5kKHRoaXMucHJvZ3Jlc3MsIHRoaXMpO1xuICB0aGlzLnBpcGUgPSBfX2JpbmQodGhpcy5waXBlLCB0aGlzKTtcbiAgdGhpcy5ub3RpZnlXaXRoID0gX19iaW5kKHRoaXMubm90aWZ5V2l0aCwgdGhpcyk7XG4gIHRoaXMubm90aWZ5ID0gX19iaW5kKHRoaXMubm90aWZ5LCB0aGlzKTtcbiAgdGhpcy5mYWlsID0gX19iaW5kKHRoaXMuZmFpbCwgdGhpcyk7XG4gIHRoaXMuZG9uZSA9IF9fYmluZCh0aGlzLmRvbmUsIHRoaXMpO1xuICB0aGlzLmFsd2F5cyA9IF9fYmluZCh0aGlzLmFsd2F5cywgdGhpcyk7XG4gIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIGZuLmNhbGwodGhpcywgdGhpcyk7XG5cbiAgdGhpcy5fc3RhdGUgPSAncGVuZGluZyc7XG59XG5cbi8qXG4gIFBhc3MgaW4gZnVuY3Rpb25zIG9yIGFycmF5cyBvZiBmdW5jdGlvbnMgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGVcbiAgRGVmZXJyZWQgb2JqZWN0IGNoYW5nZXMgc3RhdGUgZnJvbSBwZW5kaW5nLiBJZiB0aGUgc3RhdGUgaXMgYWxyZWFkeVxuICByZWplY3RlZCBvciByZXNvbHZlZCwgdGhlIGZ1bmN0aW9ucyBhcmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkuIFRoZXlcbiAgcmVjZWl2ZSB0aGUgYXJndW1lbnRzIHRoYXQgYXJlIHBhc3NlZCB0byByZWplY3Qgb3IgcmVzb2x2ZSBhbmQgdGhpc1xuICBpcyBzZXQgdG8gdGhlIG9iamVjdCBkZWZpbmVkIGJ5IHJlamVjdFdpdGggb3IgcmVzb2x2ZVdpdGggaWYgdGhvc2VcbiAgdmFyaWFudHMgYXJlIHVzZWQuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUuYWx3YXlzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBmdW5jdGlvbnMsIF9yZWYsXG4gICAgX3RoaXMgPSB0aGlzO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcztcbiAgZnVuY3Rpb25zID0gZmxhdHRlbihhcmdzKTtcbiAgaWYgKHRoaXMuX3N0YXRlID09PSAncGVuZGluZycpIHtcbiAgICB0aGlzLl9hbHdheXNDYWxsYmFja3MgfHwgKHRoaXMuX2Fsd2F5c0NhbGxiYWNrcyA9IFtdKTtcbiAgICAoX3JlZiA9IHRoaXMuX2Fsd2F5c0NhbGxiYWNrcykucHVzaC5hcHBseShfcmVmLCBmdW5jdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIGZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIF90aGlzLl93aXRoQXJndW1lbnRzKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gIFBhc3MgaW4gZnVuY3Rpb25zIG9yIGFycmF5cyBvZiBmdW5jdGlvbnMgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGVcbiAgRGVmZXJyZWQgb2JqZWN0IGlzIHJlc29sdmVkLiBJZiB0aGUgb2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gcmVzb2x2ZWQsXG4gIHRoZSBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5LiBJZiB0aGUgb2JqZWN0IGhhcyBiZWVuIHJlamVjdGVkLFxuICBub3RoaW5nIGhhcHBlbnMuIFRoZSBmdW5jdGlvbnMgcmVjZWl2ZSB0aGUgYXJndW1lbnRzIHRoYXQgYXJlIHBhc3NlZFxuICB0byByZXNvbHZlIGFuZCB0aGlzIGlzIHNldCB0byB0aGUgb2JqZWN0IGRlZmluZWQgYnkgcmVzb2x2ZVdpdGggaWYgdGhhdFxuICB2YXJpYW50IGlzIHVzZWQuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXJncywgZnVuY3Rpb25zLCBfcmVmLFxuICAgIF90aGlzID0gdGhpcztcbiAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXM7XG4gIGZ1bmN0aW9ucyA9IGZsYXR0ZW4oYXJncyk7XG4gIGlmICh0aGlzLl9zdGF0ZSA9PT0gJ3Jlc29sdmVkJykge1xuICAgIGZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIF90aGlzLl93aXRoQXJndW1lbnRzKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0aGlzLl9zdGF0ZSA9PT0gJ3BlbmRpbmcnKSB7XG4gICAgdGhpcy5fZG9uZUNhbGxiYWNrcyB8fCAodGhpcy5fZG9uZUNhbGxiYWNrcyA9IFtdKTtcbiAgICAoX3JlZiA9IHRoaXMuX2RvbmVDYWxsYmFja3MpLnB1c2guYXBwbHkoX3JlZiwgZnVuY3Rpb25zKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gIFBhc3MgaW4gZnVuY3Rpb25zIG9yIGFycmF5cyBvZiBmdW5jdGlvbnMgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGVcbiAgRGVmZXJyZWQgb2JqZWN0IGlzIHJlamVjdGVkLiBJZiB0aGUgb2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gcmVqZWN0ZWQsXG4gIHRoZSBmdW5jdGlvbnMgYXJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5LiBJZiB0aGUgb2JqZWN0IGhhcyBiZWVuIHJlc29sdmVkLFxuICBub3RoaW5nIGhhcHBlbnMuIFRoZSBmdW5jdGlvbnMgcmVjZWl2ZSB0aGUgYXJndW1lbnRzIHRoYXQgYXJlIHBhc3NlZFxuICB0byByZWplY3QgYW5kIHRoaXMgaXMgc2V0IHRvIHRoZSBvYmplY3QgZGVmaW5lZCBieSByZWplY3RXaXRoIGlmIHRoYXRcbiAgdmFyaWFudCBpcyB1c2VkLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLmZhaWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3MsIGZ1bmN0aW9ucywgX3JlZixcbiAgICBfdGhpcyA9IHRoaXM7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiB0aGlzO1xuICBmdW5jdGlvbnMgPSBmbGF0dGVuKGFyZ3MpO1xuICBpZiAodGhpcy5fc3RhdGUgPT09ICdyZWplY3RlZCcpIHtcbiAgICBmdW5jdGlvbnMuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KF90aGlzLl9jb250ZXh0LCBfdGhpcy5fd2l0aEFyZ3VtZW50cyk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodGhpcy5fc3RhdGUgPT09ICdwZW5kaW5nJykge1xuICAgIHRoaXMuX2ZhaWxDYWxsYmFja3MgfHwgKHRoaXMuX2ZhaWxDYWxsYmFja3MgPSBbXSk7XG4gICAgKF9yZWYgPSB0aGlzLl9mYWlsQ2FsbGJhY2tzKS5wdXNoLmFwcGx5KF9yZWYsIGZ1bmN0aW9ucyk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBOb3RpZnkgcHJvZ3Jlc3MgY2FsbGJhY2tzLiBUaGUgY2FsbGJhY2tzIGdldCBwYXNzZWQgdGhlIGFyZ3VtZW50cyBnaXZlbiB0byBub3RpZnkuXG4gIElmIHRoZSBvYmplY3QgaGFzIHJlc29sdmVkIG9yIHJlamVjdGVkLCBub3RoaW5nIHdpbGwgaGFwcGVuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzO1xuICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgdGhpcy5ub3RpZnlXaXRoLmFwcGx5KHRoaXMsIFt3aW5kb3ddLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBOb3RpZnkgcHJvZ3Jlc3MgY2FsbGJhY2tzIHdpdGggYWRkaXRpb25hbCBjb250ZXh0LiBXb3JrcyB0aGUgc2FtZSB3YXkgYXMgbm90aWZ5KCksXG4gIGV4Y2VwdCB0aGlzIGlzIHNldCB0byBjb250ZXh0IHdoZW4gY2FsbGluZyB0aGUgZnVuY3Rpb25zLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLm5vdGlmeVdpdGggPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3MsIGNvbnRleHQsIF9yZWY7XG4gIGNvbnRleHQgPSBhcmd1bWVudHNbMF0sIGFyZ3MgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IFtdO1xuICBpZiAodGhpcy5fc3RhdGUgIT09ICdwZW5kaW5nJykgcmV0dXJuIHRoaXM7XG4gIGlmICgoX3JlZiA9IHRoaXMuX3Byb2dyZXNzQ2FsbGJhY2tzKSAhPSBudWxsKSB7XG4gICAgX3JlZi5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBSZXR1cm5zIGEgbmV3IFByb21pc2Ugb2JqZWN0IHRoYXQncyB0aWVkIHRvIHRoZSBjdXJyZW50IERlZmVycmVkLiBUaGUgZG9uZUZpbHRlclxuICBhbmQgZmFpbEZpbHRlciBjYW4gYmUgdXNlZCB0byBtb2RpZnkgdGhlIGZpbmFsIHZhbHVlcyB0aGF0IGFyZSBwYXNzZWQgdG8gdGhlXG4gIGNhbGxiYWNrcyBvZiB0aGUgbmV3IHByb21pc2UuIElmIHRoZSBwYXJhbWV0ZXJzIHBhc3NlZCBhcmUgZmFsc3ksIHRoZSBwcm9taXNlXG4gIG9iamVjdCByZXNvbHZlcyBvciByZWplY3RzIG5vcm1hbGx5LiBJZiB0aGUgZmlsdGVyIGZ1bmN0aW9ucyByZXR1cm4gYSB2YWx1ZSxcbiAgdGhhdCBvbmUgaXMgcGFzc2VkIHRvIHRoZSByZXNwZWN0aXZlIGNhbGxiYWNrcy4gVGhlIGZpbHRlcnMgY2FuIGFsc28gcmV0dXJuIGFcbiAgbmV3IFByb21pc2Ugb3IgRGVmZXJyZWQgb2JqZWN0LCBvZiB3aGljaCByZWplY3RlZCAvIHJlc29sdmVkIHdpbGwgY29udHJvbCBob3cgdGhlXG4gIGNhbGxiYWNrcyBmaXJlLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkb25lRmlsdGVyLCBmYWlsRmlsdGVyKSB7XG4gIHZhciBkZWY7XG4gIGRlZiA9IG5ldyBEZWZlcnJlZCgpO1xuICB0aGlzLmRvbmUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MsIHJlc3VsdCwgX3JlZjtcbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICBpZiAoZG9uZUZpbHRlciAhPSBudWxsKSB7XG4gICAgICByZXN1bHQgPSBkb25lRmlsdGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgaWYgKGlzT2JzZXJ2YWJsZShyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZG9uZUFyZ3MsIF9yZWY7XG4gICAgICAgICAgZG9uZUFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgICAgIHJldHVybiAoX3JlZiA9IGRlZi5yZXNvbHZlV2l0aCkuY2FsbC5hcHBseShfcmVmLCBbZGVmLCB0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGRvbmVBcmdzKSkpO1xuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBmYWlsQXJncywgX3JlZjtcbiAgICAgICAgICBmYWlsQXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICAgICAgcmV0dXJuIChfcmVmID0gZGVmLnJlamVjdFdpdGgpLmNhbGwuYXBwbHkoX3JlZiwgW2RlZiwgdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChmYWlsQXJncykpKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVmLnJlc29sdmVXaXRoLmNhbGwoZGVmLCB0aGlzLCByZXN1bHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKF9yZWYgPSBkZWYucmVzb2x2ZVdpdGgpLmNhbGwuYXBwbHkoX3JlZiwgW2RlZiwgdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChhcmdzKSkpO1xuICAgIH1cbiAgfSk7XG4gIHRoaXMuZmFpbChmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncywgcmVzdWx0LCBfcmVmLCBfcmVmMjtcbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICBpZiAoZmFpbEZpbHRlciAhPSBudWxsKSB7XG4gICAgICByZXN1bHQgPSBmYWlsRmlsdGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgaWYgKGlzT2JzZXJ2YWJsZShyZXN1bHQpKSB7XG4gICAgICAgIHJlc3VsdC5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkb25lQXJncywgX3JlZjtcbiAgICAgICAgICBkb25lQXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICAgICAgcmV0dXJuIChfcmVmID0gZGVmLnJlc29sdmVXaXRoKS5jYWxsLmFwcGx5KF9yZWYsIFtkZWYsIHRoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoZG9uZUFyZ3MpKSk7XG4gICAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGZhaWxBcmdzLCBfcmVmO1xuICAgICAgICAgIGZhaWxBcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgICAgICByZXR1cm4gKF9yZWYgPSBkZWYucmVqZWN0V2l0aCkuY2FsbC5hcHBseShfcmVmLCBbZGVmLCB0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGZhaWxBcmdzKSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZi5yZWplY3RXaXRoLmNhbGwoZGVmLCB0aGlzLCByZXN1bHQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChfcmVmID0gZGVmLnJlamVjdFdpdGgpLmNhbGwuYXBwbHkoX3JlZiwgW2RlZiwgdGhpc10uY29uY2F0KF9fc2xpY2UuY2FsbChhcmdzKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKF9yZWYyID0gZGVmLnJlamVjdFdpdGgpLmNhbGwuYXBwbHkoX3JlZjIsIFtkZWYsIHRoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZGVmLnByb21pc2UoKTtcbn07XG5cbi8qXG4gIEFkZCBwcm9ncmVzcyBjYWxsYmFja3MgdG8gYmUgZmlyZWQgd2hlbiB1c2luZyBub3RpZnkoKVxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnByb2dyZXNzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBmdW5jdGlvbnMsIF9yZWY7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDAgfHwgdGhpcy5fc3RhdGUgIT09ICdwZW5kaW5nJykgcmV0dXJuIHRoaXM7XG4gIGZ1bmN0aW9ucyA9IGZsYXR0ZW4oYXJncyk7XG4gIHRoaXMuX3Byb2dyZXNzQ2FsbGJhY2tzIHx8ICh0aGlzLl9wcm9ncmVzc0NhbGxiYWNrcyA9IFtdKTtcbiAgKF9yZWYgPSB0aGlzLl9wcm9ncmVzc0NhbGxiYWNrcykucHVzaC5hcHBseShfcmVmLCBmdW5jdGlvbnMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gIFJldHVybnMgdGhlIHByb21pc2Ugb2JqZWN0IG9mIHRoaXMgRGVmZXJyZWQuXG4qL1xuXG5EZWZlcnJlZC5wcm90b3R5cGUucHJvbWlzZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fcHJvbWlzZSB8fCAodGhpcy5fcHJvbWlzZSA9IG5ldyBQcm9taXNlKHRoaXMpKTtcbn07XG5cbi8qXG4gIFJlamVjdCB0aGlzIERlZmVycmVkLiBJZiB0aGUgb2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gcmVqZWN0ZWQgb3IgcmVzb2x2ZWQsXG4gIG5vdGhpbmcgaGFwcGVucy4gUGFyYW1ldGVycyBwYXNzZWQgdG8gcmVqZWN0IHdpbGwgYmUgaGFuZGVkIHRvIGFsbCBjdXJyZW50XG4gIGFuZCBmdXR1cmUgZmFpbCBhbmQgYWx3YXlzIGNhbGxiYWNrcy5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS5yZWplY3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3M7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICB0aGlzLnJlamVjdFdpdGguYXBwbHkodGhpcywgW3dpbmRvd10uY29uY2F0KF9fc2xpY2UuY2FsbChhcmdzKSkpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gIFJlamVjdCB0aGlzIERlZmVycmVkIHdpdGggYWRkaXRpb25hbCBjb250ZXh0LiBXb3JrcyB0aGUgc2FtZSB3YXkgYXMgcmVqZWN0LCBleGNlcHRcbiAgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyB1c2VkIGFzIHRoaXMgd2hlbiBjYWxsaW5nIHRoZSBmYWlsIGFuZCBhbHdheXMgY2FsbGJhY2tzLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnJlamVjdFdpdGggPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3MsIGNvbnRleHQsIF9yZWYsIF9yZWYyLFxuICAgIF90aGlzID0gdGhpcztcbiAgY29udGV4dCA9IGFyZ3VtZW50c1swXSwgYXJncyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gIGlmICh0aGlzLl9zdGF0ZSAhPT0gJ3BlbmRpbmcnKSByZXR1cm4gdGhpcztcbiAgdGhpcy5fc3RhdGUgPSAncmVqZWN0ZWQnO1xuICB0aGlzLl93aXRoQXJndW1lbnRzID0gYXJncztcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIGlmICgoX3JlZiA9IHRoaXMuX2ZhaWxDYWxsYmFja3MpICE9IG51bGwpIHtcbiAgICBfcmVmLmZvckVhY2goZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmbi5hcHBseShfdGhpcy5fY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKChfcmVmMiA9IHRoaXMuX2Fsd2F5c0NhbGxiYWNrcykgIT0gbnVsbCkge1xuICAgIF9yZWYyLmZvckVhY2goZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmbi5hcHBseShfdGhpcy5fY29udGV4dCwgYXJncyk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBSZXNvbHZlcyB0aGlzIERlZmVycmVkIG9iamVjdC4gSWYgdGhlIG9iamVjdCBoYXMgYWxyZWFkeSBiZWVuIHJlamVjdGVkIG9yIHJlc29sdmVkLFxuICBub3RoaW5nIGhhcHBlbnMuIFBhcmFtZXRlcnMgcGFzc2VkIHRvIHJlc29sdmUgd2lsbCBiZSBoYW5kZWQgdG8gYWxsIGN1cnJlbnQgYW5kXG4gIGZ1dHVyZSBkb25lIGFuZCBhbHdheXMgY2FsbGJhY2tzLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFyZ3M7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICB0aGlzLnJlc29sdmVXaXRoLmFwcGx5KHRoaXMsIFt3aW5kb3ddLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJncykpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICBSZXNvbHZlIHRoaXMgRGVmZXJyZWQgd2l0aCBhZGRpdGlvbmFsIGNvbnRleHQuIFdvcmtzIHRoZSBzYW1lIHdheSBhcyByZXNvbHZlLCBleGNlcHRcbiAgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyB1c2VkIGFzIHRoaXMgd2hlbiBjYWxsaW5nIHRoZSBkb25lIGFuZCBhbHdheXMgY2FsbGJhY2tzLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnJlc29sdmVXaXRoID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBjb250ZXh0LCBfcmVmLCBfcmVmMixcbiAgICBfdGhpcyA9IHRoaXM7XG4gIGNvbnRleHQgPSBhcmd1bWVudHNbMF0sIGFyZ3MgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IFtdO1xuICBpZiAodGhpcy5fc3RhdGUgIT09ICdwZW5kaW5nJykgcmV0dXJuIHRoaXM7XG4gIHRoaXMuX3N0YXRlID0gJ3Jlc29sdmVkJztcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX3dpdGhBcmd1bWVudHMgPSBhcmdzO1xuICBpZiAoKF9yZWYgPSB0aGlzLl9kb25lQ2FsbGJhY2tzKSAhPSBudWxsKSB7XG4gICAgX3JlZi5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG4gIGlmICgoX3JlZjIgPSB0aGlzLl9hbHdheXNDYWxsYmFja3MpICE9IG51bGwpIHtcbiAgICBfcmVmMi5mb3JFYWNoKGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkoX3RoaXMuX2NvbnRleHQsIGFyZ3MpO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAgUmV0dXJucyB0aGUgc3RhdGUgb2YgdGhpcyBEZWZlcnJlZC4gQ2FuIGJlICdwZW5kaW5nJywgJ3JlamVjdGVkJyBvciAncmVzb2x2ZWQnLlxuKi9cblxuRGVmZXJyZWQucHJvdG90eXBlLnN0YXRlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9zdGF0ZTtcbn07XG5cbi8qXG4gIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRvIHNwZWNpZnkgZWFjaCBkb25lLCBmYWlsIGFuZCBwcm9ncmVzcyBjYWxsYmFja3MgYXQgdGhlIHNhbWUgdGltZS5cbiovXG5cbkRlZmVycmVkLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24oZG9uZUNhbGxiYWNrcywgZmFpbENhbGxiYWNrcywgcHJvZ3Jlc3NDYWxsYmFja3MpIHtcbiAgdGhpcy5kb25lKGRvbmVDYWxsYmFja3MpO1xuICB0aGlzLmZhaWwoZmFpbENhbGxiYWNrcyk7XG4gIHRoaXMucHJvZ3Jlc3MocHJvZ3Jlc3NDYWxsYmFja3MpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuXG4vKlxuUmV0dXJucyBhIG5ldyBwcm9taXNlIG9iamVjdCB3aGljaCB3aWxsIHJlc29sdmUgd2hlbiBhbGwgb2YgdGhlIGRlZmVycmVkcyBvciBwcm9taXNlc1xucGFzc2VkIHRvIHRoZSBmdW5jdGlvbiByZXNvbHZlLiBUaGUgY2FsbGJhY2tzIHJlY2VpdmUgYWxsIHRoZSBwYXJhbWV0ZXJzIHRoYXQgdGhlXG5pbmRpdmlkdWFsIHJlc29sdmVzIHlpZWxkZWQgYXMgYW4gYXJyYXkuIElmIGFueSBvZiB0aGUgZGVmZXJyZWRzIG9yIHByb21pc2VzIGFyZVxucmVqZWN0ZWQsIHRoZSBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXG4qL1xuXG5EZWZlcnJlZC53aGVuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhbGxEb25lQXJncywgYWxsUmVhZHksIGFyZ3MsIHJlYWR5Q291bnQ7XG4gIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiBuZXcgRGVmZXJyZWQoKS5yZXNvbHZlKCkucHJvbWlzZSgpO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHJldHVybiBhcmdzWzBdLnByb21pc2UoKTtcbiAgYWxsUmVhZHkgPSBuZXcgRGVmZXJyZWQoKTtcbiAgcmVhZHlDb3VudCA9IDA7XG4gIGFsbERvbmVBcmdzID0gW107XG4gIGFyZ3MuZm9yRWFjaChmdW5jdGlvbihkZnIsIGluZGV4KSB7XG4gICAgcmV0dXJuIGRmci5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRvbmVBcmdzO1xuICAgICAgZG9uZUFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgcmVhZHlDb3VudCArPSAxO1xuICAgICAgYWxsRG9uZUFyZ3NbaW5kZXhdID0gZG9uZUFyZ3M7XG4gICAgICBpZiAocmVhZHlDb3VudCA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGFsbFJlYWR5LnJlc29sdmUuYXBwbHkoYWxsUmVhZHksIGFsbERvbmVBcmdzKTtcbiAgICAgIH1cbiAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZhaWxBcmdzO1xuICAgICAgZmFpbEFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgcmV0dXJuIGFsbFJlYWR5LnJlamVjdFdpdGguYXBwbHkoYWxsUmVhZHksIFt0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGZhaWxBcmdzKSkpO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGFsbFJlYWR5LnByb21pc2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGVmZXJyZWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuICAsIE1peGVkU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEvbWl4ZWQnKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIFZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJykuVmFsaWRhdG9yRXJyb3JcbiAgLCBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgY2xvbmUgPSB1dGlscy5jbG9uZVxuICAsIFZhbGlkYXRpb25FcnJvciA9IFN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3JcbiAgLCBJbnRlcm5hbENhY2hlID0gcmVxdWlyZSgnLi9pbnRlcm5hbCcpXG4gICwgZGVlcEVxdWFsID0gdXRpbHMuZGVlcEVxdWFsXG4gICwgRG9jdW1lbnRBcnJheVxuICAsIFNjaGVtYUFycmF5XG4gICwgRW1iZWRkZWQ7XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQtNC+0LrRg9C80LXQvdGC0LAuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSDQt9C90LDRh9C10L3QuNGPLCDQutC+0YLQvtGA0YvQtSDQvdGD0LbQvdC+INGD0YHRgtCw0L3QvtCy0LjRgtGMXG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjb2xsZWN0aW9uTmFtZV0gLSDQutC+0LvQu9C10LrRhtC40Y8g0LIg0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDQvdCw0YXQvtC00LjRgtGB0Y8g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINGB0YXQtdC80LAg0L/QviDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINGB0L7Qt9C00LDQvSDQtNC+0LrRg9C80LXQvdGCXG4gKiBAcGFyYW0ge29iamVjdH0gW2ZpZWxkc10gLSDQstGL0LHRgNCw0L3QvdGL0LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1ICjQvdC1INGA0LXQsNC70LjQt9C+0LLQsNC90L4pXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpbml0XSAtIGh5ZHJhdGUgZG9jdW1lbnQgLSDQvdCw0L/QvtC70L3QuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQtNCw0L3QvdGL0LzQuCAo0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINCyIGFwaS1jbGllbnQpXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnQgKCBkYXRhLCBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKXtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBEb2N1bWVudCkgKSB7XG4gICAgcmV0dXJuIG5ldyBEb2N1bWVudCggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gIH1cblxuICB0aGlzLiRfXyA9IG5ldyBJbnRlcm5hbENhY2hlKCk7XG4gIHRoaXMuaXNOZXcgPSB0cnVlO1xuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQodHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgZGF0YSApe1xuICAgIGluaXQgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKCBjb2xsZWN0aW9uTmFtZSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIGNvbGxlY3Rpb25OYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1XG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG5cbiAgICBpZiAoIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IHsgX2lkOiBuZXcgT2JqZWN0SWQoKSB9O1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hIHx8IHNjaGVtYTtcbiAgICAvLyDQodCz0LXQvdC10YDQuNGA0L7QstCw0YLRjCBPYmplY3RJZCwg0LXRgdC70Lgg0L7QvSDQvtGC0YHRg9GC0YHRgtCy0YPQtdGCLCDQvdC+INC10LPQviDRgtGA0LXQsdGD0LXRgiDRgdGF0LXQvNCwXG4gICAgaWYgKCBzY2hlbWEgJiYgIXRoaXMuc2NoZW1hICYmIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAgIGlmICggZGF0YS5faWQgPT09IHVuZGVmaW5lZCApe1xuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICggIXNjaGVtYSApe1xuICAgIHRocm93IG5ldyBTdG9yYWdlRXJyb3IuTWlzc2luZ1NjaGVtYUVycm9yKCk7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQoeyB0ZXN0OiAnYm9vbScgfSwgdHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgY29sbGVjdGlvbk5hbWUgKXtcbiAgICBpbml0ID0gY29sbGVjdGlvbk5hbWU7XG4gICAgY29sbGVjdGlvbk5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBIHN0cmljdDogdHJ1ZVxuICAvLyBjb2xsZWN0aW9uLmFkZCh7Li4ufSwgdHJ1ZSk7XG4gIGlmICgnYm9vbGVhbicgPT09IHR5cGVvZiBmaWVsZHMpIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gZmllbGRzO1xuICAgIGZpZWxkcyA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gc2NoZW1hLm9wdGlvbnMgJiYgc2NoZW1hLm9wdGlvbnMuc3RyaWN0O1xuICAgIHRoaXMuJF9fLnNlbGVjdGVkID0gZmllbGRzO1xuICB9XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgaWYgKCBjb2xsZWN0aW9uTmFtZSApe1xuICAgIHRoaXMuY29sbGVjdGlvbiA9IHdpbmRvdy5zdG9yYWdlWyBjb2xsZWN0aW9uTmFtZSBdO1xuICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgfVxuXG4gIHZhciByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZFBhdGhzKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVxdWlyZWQubGVuZ3RoOyArK2kpIHtcbiAgICB0aGlzLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKCByZXF1aXJlZFtpXSApO1xuICB9XG5cbiAgdGhpcy4kX19zZXRTY2hlbWEoIHNjaGVtYSApO1xuXG4gIHRoaXMuX2RvYyA9IHRoaXMuJF9fYnVpbGREb2MoIGRhdGEsIGluaXQgKTtcblxuICBpZiAoIGluaXQgKXtcbiAgICB0aGlzLmluaXQoIGRhdGEgKTtcbiAgfSBlbHNlIGlmICggZGF0YSApIHtcbiAgICB0aGlzLnNldCggZGF0YSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gIH1cblxuICAvLyBtLWdoLTI0MzlcbiAgLy8gZGVmaW5lIGdldHRlcnMgZm9yIGRhdGEucHJvcCBwcm9wZXJ0aWVzIHdpdGggbm9uLXN0cmljdCBzY2hlbWFzXG4gIGlmICggc2NoZW1hLm9wdGlvbnMuc3RyaWN0ID09PSBmYWxzZSAmJiBkYXRhICkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBrZXlzID0gT2JqZWN0LmtleXMoIHRoaXMuX2RvYyApO1xuXG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKCBrZXkgKSB7XG4gICAgICBpZiAoIShrZXkgaW4gc2NoZW1hLnRyZWUpKSB7XG4gICAgICAgIGRlZmluZSggc2VsZiwga2V5LCBudWxsLCBzZWxmICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZWdpc3RlciBtZXRob2RzXG4gIGZvciAoIHZhciBtIGluIHNjaGVtYS5tZXRob2RzICl7XG4gICAgdGhpc1sgbSBdID0gc2NoZW1hLm1ldGhvZHNbIG0gXTtcbiAgfVxuICAvLyBSZWdpc3RlciBzdGF0aWNzXG4gIGZvciAoIHZhciBzIGluIHNjaGVtYS5zdGF0aWNzICl7XG4gICAgdGhpc1sgcyBdID0gc2NoZW1hLnN0YXRpY3NbIHMgXTtcbiAgfVxufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gRXZlbnRFbWl0dGVyLlxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5Eb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEb2N1bWVudDtcblxuLyoqXG4gKiBUaGUgZG9jdW1lbnRzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IHNjaGVtYVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2NoZW1hO1xuXG4vKipcbiAqIEJvb2xlYW4gZmxhZyBzcGVjaWZ5aW5nIGlmIHRoZSBkb2N1bWVudCBpcyBuZXcuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBpc05ld1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNOZXc7XG5cbi8qKlxuICogVGhlIHN0cmluZyB2ZXJzaW9uIG9mIHRoaXMgZG9jdW1lbnRzIF9pZC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIGdldHRlciBleGlzdHMgb24gYWxsIGRvY3VtZW50cyBieSBkZWZhdWx0LiBUaGUgZ2V0dGVyIGNhbiBiZSBkaXNhYmxlZCBieSBzZXR0aW5nIHRoZSBgaWRgIFtvcHRpb25dKC9kb2NzL2d1aWRlLmh0bWwjaWQpIG9mIGl0cyBgU2NoZW1hYCB0byBmYWxzZSBhdCBjb25zdHJ1Y3Rpb24gdGltZS5cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IGlkOiBmYWxzZSB9KTtcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBTY2hlbWEgb3B0aW9ucyAvZG9jcy9ndWlkZS5odG1sI29wdGlvbnNcbiAqIEBwcm9wZXJ0eSBpZFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaWQ7XG5cbi8qKlxuICogSGFzaCBjb250YWluaW5nIGN1cnJlbnQgdmFsaWRhdGlvbiBlcnJvcnMuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBlcnJvcnNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmVycm9ycztcblxuRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IHtcbiAgZG9jdW1lbnREZWZpbmVQcm9wZXJ0eTogXy5ub29wLFxuICBkb2N1bWVudFNldEluaXRpYWxWYWx1ZTogXy5ub29wLFxuICBkb2N1bWVudEdldFZhbHVlOiBfLm5vb3AsXG4gIGRvY3VtZW50U2V0VmFsdWU6IF8ubm9vcFxufTtcblxuLyoqXG4gKiBCdWlsZHMgdGhlIGRlZmF1bHQgZG9jIHN0cnVjdHVyZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3NraXBJZF1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19idWlsZERvY1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19idWlsZERvYyA9IGZ1bmN0aW9uICggb2JqLCBza2lwSWQgKSB7XG4gIHZhciBkb2MgPSB7fVxuICAgICwgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT09IHAgKSB7XG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xuICAgICAgaWYgKCBvYmogJiYgJ19pZCcgaW4gb2JqICkgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcbiAgICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvYztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRvY3VtZW50IHdpdGhvdXQgc2V0dGVycyBvciBtYXJraW5nIGFueXRoaW5nIG1vZGlmaWVkLlxuICpcbiAqIENhbGxlZCBpbnRlcm5hbGx5IGFmdGVyIGEgZG9jdW1lbnQgaXMgcmV0dXJuZWQgZnJvbSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XG4gIHRoaXMuaXNOZXcgPSBmYWxzZTtcblxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcbiAgLy8gaGFuZGxlIGRvY3Mgd2l0aCBwb3B1bGF0ZWQgcGF0aHNcbiAgLyohXG4gIGlmICggZG9jLl9pZCAmJiBvcHRzICYmIG9wdHMucG9wdWxhdGVkICYmIG9wdHMucG9wdWxhdGVkLmxlbmd0aCApIHtcbiAgICB2YXIgaWQgPSBTdHJpbmcoIGRvYy5faWQgKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdHMucG9wdWxhdGVkLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgaXRlbSA9IG9wdHMucG9wdWxhdGVkWyBpIF07XG4gICAgICB0aGlzLnBvcHVsYXRlZCggaXRlbS5wYXRoLCBpdGVtLl9kb2NzW2lkXSwgaXRlbSApO1xuICAgIH1cbiAgfVxuICAqL1xuXG4gIGluaXQoIHRoaXMsIGRhdGEsIHRoaXMuX2RvYyApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyohXG4gKiBJbml0IGhlbHBlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9iaiByYXcgc2VydmVyIGRvY1xuICogQHBhcmFtIHtPYmplY3R9IGRvYyBvYmplY3Qgd2UgYXJlIGluaXRpYWxpemluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXQgKHNlbGYsIG9iaiwgZG9jLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAsIHNjaGVtYVxuICAgICwgcGF0aFxuICAgICwgaTtcblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICBpID0ga2V5c1tsZW5dO1xuICAgIHBhdGggPSBwcmVmaXggKyBpO1xuICAgIHNjaGVtYSA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG5cbiAgICBpZiAoIXNjaGVtYSAmJiBfLmlzUGxhaW5PYmplY3QoIG9ialsgaSBdICkgJiZcbiAgICAgICAgKCFvYmpbaV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbaV0uY29uc3RydWN0b3IpKSkge1xuICAgICAgLy8gYXNzdW1lIG5lc3RlZCBvYmplY3RcbiAgICAgIGlmICghZG9jW2ldKSBkb2NbaV0gPSB7fTtcbiAgICAgIGluaXQoc2VsZiwgb2JqW2ldLCBkb2NbaV0sIHBhdGggKyAnLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW2ldID09PSBudWxsKSB7XG4gICAgICAgIGRvY1tpXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG9ialtpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICBzZWxmLiRfX3RyeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG9jW2ldID0gc2NoZW1hLmNhc3Qob2JqW2ldLCBzZWxmLCB0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb2NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldEluaXRpYWxWYWx1ZS5jYWxsKCBzZWxmLCBzZWxmLCBwYXRoLCBkb2NbaV0gKTtcbiAgICAgIH1cbiAgICAgIC8vIG1hcmsgYXMgaHlkcmF0ZWRcbiAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmluaXQocGF0aCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwYXRoLCBvciBtYW55IHBhdGhzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICAvLyBwYXRoLCB2YWx1ZVxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUpXG4gKlxuICogICAgIC8vIG9iamVjdFxuICogICAgIGRvYy5zZXQoe1xuICogICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAsIHBhdGgyIDoge1xuICogICAgICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAgIH1cbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvbmx5LXRoZS1mbHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBOdW1iZXIpXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIHN0cmluZ1xuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIFN0cmluZylcbiAqXG4gKiAgICAgLy8gY2hhbmdpbmcgc3RyaWN0IG1vZGUgYmVoYXZpb3JcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCB7IHN0cmljdDogZmFsc2UgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXRoIHBhdGggb3Igb2JqZWN0IG9mIGtleS92YWxzIHRvIHNldFxuICogQHBhcmFtIHtNaXhlZH0gdmFsIHRoZSB2YWx1ZSB0byBzZXRcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ8ZXRjLi59IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBcIm9uLXRoZS1mbHlcIiBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbmFsbHkgc3BlY2lmeSBvcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBiZWhhdmlvciBvZiB0aGUgc2V0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgdHlwZSwgb3B0aW9ucykge1xuICBpZiAodHlwZSAmJiAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUuY29uc3RydWN0b3IpKSB7XG4gICAgb3B0aW9ucyA9IHR5cGU7XG4gICAgdHlwZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciBtZXJnZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5tZXJnZVxuICAgICwgYWRob2MgPSB0eXBlICYmIHRydWUgIT09IHR5cGVcbiAgICAsIGNvbnN0cnVjdGluZyA9IHRydWUgPT09IHR5cGVcbiAgICAsIGFkaG9jcztcblxuICB2YXIgc3RyaWN0ID0gb3B0aW9ucyAmJiAnc3RyaWN0JyBpbiBvcHRpb25zXG4gICAgPyBvcHRpb25zLnN0cmljdFxuICAgIDogdGhpcy4kX18uc3RyaWN0TW9kZTtcblxuICBpZiAoYWRob2MpIHtcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xuICAgIGFkaG9jc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgdHlwZSk7XG4gIH1cblxuICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBwYXRoKSB7XG4gICAgLy8gbmV3IERvY3VtZW50KHsga2V5OiB2YWwgfSlcblxuICAgIGlmIChudWxsID09PSBwYXRoIHx8IHVuZGVmaW5lZCA9PT0gcGF0aCkge1xuICAgICAgdmFyIF90ZW1wID0gcGF0aDtcbiAgICAgIHBhdGggPSB2YWw7XG4gICAgICB2YWwgPSBfdGVtcDtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcHJlZml4ID0gdmFsXG4gICAgICAgID8gdmFsICsgJy4nXG4gICAgICAgIDogJyc7XG5cbiAgICAgIGlmIChwYXRoIGluc3RhbmNlb2YgRG9jdW1lbnQpIHBhdGggPSBwYXRoLl9kb2M7XG5cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGF0aClcbiAgICAgICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAgICAgLCBwYXRodHlwZVxuICAgICAgICAsIGtleTtcblxuXG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgIHBhdGh0eXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocHJlZml4ICsga2V5KTtcbiAgICAgICAgaWYgKG51bGwgIT0gcGF0aFtrZXldXG4gICAgICAgICAgICAvLyBuZWVkIHRvIGtub3cgaWYgcGxhaW4gb2JqZWN0IC0gbm8gQnVmZmVyLCBPYmplY3RJZCwgcmVmLCBldGNcbiAgICAgICAgICAgICYmIF8uaXNQbGFpbk9iamVjdChwYXRoW2tleV0pXG4gICAgICAgICAgICAmJiAoICFwYXRoW2tleV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShwYXRoW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPT0gcGF0aHR5cGVcbiAgICAgICAgICAgICYmICEoIHRoaXMuJF9fcGF0aCggcHJlZml4ICsga2V5ICkgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSApXG4gICAgICAgICAgICAmJiAhKCB0aGlzLnNjaGVtYS5wYXRoc1trZXldICYmIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0ub3B0aW9ucy5yZWYgKVxuICAgICAgICAgICl7XG5cbiAgICAgICAgICB0aGlzLnNldChwYXRoW2tleV0sIHByZWZpeCArIGtleSwgY29uc3RydWN0aW5nKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICAgIGlmICgncmVhbCcgPT09IHBhdGh0eXBlIHx8ICd2aXJ0dWFsJyA9PT0gcGF0aHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgICAgfSBlbHNlIGlmICgndGhyb3cnID09PSBzdHJpY3QpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmllbGQgYCcgKyBrZXkgKyAnYCBpcyBub3QgaW4gc2NoZW1hLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCAhPT0gcGF0aFtrZXldKSB7XG4gICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgLy8gZW5zdXJlIF9zdHJpY3QgaXMgaG9ub3JlZCBmb3Igb2JqIHByb3BzXG4gIC8vIGRvY3NjaGVtYSA9IG5ldyBTY2hlbWEoeyBwYXRoOiB7IG5lc3Q6ICdzdHJpbmcnIH19KVxuICAvLyBkb2Muc2V0KCdwYXRoJywgb2JqKTtcbiAgdmFyIHBhdGhUeXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocGF0aCk7XG4gIGlmICgnbmVzdGVkJyA9PT0gcGF0aFR5cGUgJiYgdmFsICYmIF8uaXNQbGFpbk9iamVjdCh2YWwpICYmXG4gICAgICAoIXZhbC5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHZhbC5jb25zdHJ1Y3RvcikpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT09IHBhdGhUeXBlICYmIHN0cmljdCkge1xuXG4gICAgLy8gY2hlY2sgZm9yIHJvb3RzIHRoYXQgYXJlIE1peGVkIHR5cGVzXG4gICAgdmFyIG1peGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkrMSkuam9pbignLicpO1xuICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSkge1xuICAgICAgICAvLyBhbGxvdyBjaGFuZ2VzIHRvIHN1YiBwYXRocyBvZiBtaXhlZCB0eXBlc1xuICAgICAgICBtaXhlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWl4ZWQpIHtcbiAgICAgIGlmICgndGhyb3cnID09PSBzdHJpY3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWVsZCBgJyArIHBhdGggKyAnYCBpcyBub3QgaW4gc2NoZW1hLicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoJ3ZpcnR1YWwnID09PSBwYXRoVHlwZSkge1xuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLnZpcnR1YWxwYXRoKHBhdGgpO1xuICAgIHNjaGVtYS5hcHBseVNldHRlcnModmFsLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSBlbHNlIHtcbiAgICBzY2hlbWEgPSB0aGlzLiRfX3BhdGgocGF0aCk7XG4gIH1cblxuICB2YXIgcGF0aFRvTWFyaztcblxuICAvLyBXaGVuIHVzaW5nIHRoZSAkc2V0IG9wZXJhdG9yIHRoZSBwYXRoIHRvIHRoZSBmaWVsZCBtdXN0IGFscmVhZHkgZXhpc3QuXG4gIC8vIEVsc2UgbW9uZ29kYiB0aHJvd3M6IFwiTEVGVF9TVUJGSUVMRCBvbmx5IHN1cHBvcnRzIE9iamVjdFwiXG5cbiAgaWYgKHBhcnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgcGF0aFRvTWFyayA9IHBhdGg7XG4gIH0gZWxzZSB7XG4gICAgZm9yICggaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSApIHtcbiAgICAgIHN1YnBhdGggPSBwYXJ0cy5zbGljZSgwLCBpICsgMSkuam9pbignLicpO1xuICAgICAgaWYgKHRoaXMuaXNEaXJlY3RNb2RpZmllZChzdWJwYXRoKSAvLyBlYXJsaWVyIHByZWZpeGVzIHRoYXQgYXJlIGFscmVhZHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFya2VkIGFzIGRpcnR5IGhhdmUgcHJlY2VkZW5jZVxuICAgICAgICAgIHx8IHRoaXMuZ2V0KHN1YnBhdGgpID09PSBudWxsKSB7XG4gICAgICAgIHBhdGhUb01hcmsgPSBzdWJwYXRoO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhdGhUb01hcmspIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9XG5cbiAgLy8gaWYgdGhpcyBkb2MgaXMgYmVpbmcgY29uc3RydWN0ZWQgd2Ugc2hvdWxkIG5vdCB0cmlnZ2VyIGdldHRlcnNcbiAgdmFyIHByaW9yVmFsID0gY29uc3RydWN0aW5nXG4gICAgPyB1bmRlZmluZWRcbiAgICA6IHRoaXMuZ2V0VmFsdWUocGF0aCk7XG5cbiAgaWYgKCFzY2hlbWEgfHwgdW5kZWZpbmVkID09PSB2YWwpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgc2hvdWxkU2V0ID0gdGhpcy4kX190cnkoZnVuY3Rpb24oKXtcbiAgICB2YWwgPSBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgc2VsZiwgZmFsc2UsIHByaW9yVmFsKTtcbiAgfSk7XG5cbiAgaWYgKHNob3VsZFNldCkge1xuICAgIHRoaXMuJF9fc2V0KHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHdlIHNob3VsZCBtYXJrIHRoaXMgY2hhbmdlIGFzIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2hvdWxkTW9kaWZ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3Nob3VsZE1vZGlmeSA9IGZ1bmN0aW9uIChcbiAgICBwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpIHtcblxuICBpZiAodGhpcy5pc05ldykgcmV0dXJuIHRydWU7XG5cbiAgaWYgKCB1bmRlZmluZWQgPT09IHZhbCAmJiAhdGhpcy5pc1NlbGVjdGVkKHBhdGgpICkge1xuICAgIC8vIHdoZW4gYSBwYXRoIGlzIG5vdCBzZWxlY3RlZCBpbiBhIHF1ZXJ5LCBpdHMgaW5pdGlhbFxuICAgIC8vIHZhbHVlIHdpbGwgYmUgdW5kZWZpbmVkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsICYmIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpIHtcbiAgICAvLyB3ZSdyZSBqdXN0IHVuc2V0dGluZyB0aGUgZGVmYXVsdCB2YWx1ZSB3aGljaCB3YXMgbmV2ZXIgc2F2ZWRcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXV0aWxzLmRlZXBFcXVhbCh2YWwsIHByaW9yVmFsIHx8IHRoaXMuZ2V0KHBhdGgpKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy/RgtC10YHRgiDQvdC1INC/0YDQvtGF0L7QtNC40YIg0LjQty3Qt9CwINC90LDQu9C40YfQuNGPINC70LjRiNC90LXQs9C+INC/0L7Qu9GPINCyIHN0YXRlcy5kZWZhdWx0IChjb21tZW50cylcbiAgLy8g0J3QsCDRgdCw0LzQvtC8INC00LXQu9C1INC/0L7Qu9C1INCy0YDQvtC00LUg0Lgg0L3QtSDQu9C40YjQvdC10LVcbiAgLy9jb25zb2xlLmluZm8oIHBhdGgsIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgKTtcbiAgLy9jb25zb2xlLmxvZyggdGhpcy4kX18uYWN0aXZlUGF0aHMgKTtcblxuICAvLyDQmtC+0LPQtNCwINC80Ysg0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0YLQsNC60L7QtSDQttC1INC30L3QsNGH0LXQvdC40LUg0LrQsNC6IGRlZmF1bHRcbiAgLy8g0J3QtSDQv9C+0L3Rj9GC0L3QviDQt9Cw0YfQtdC8INC80LDQvdCz0YPRgdGCINC10LPQviDQvtCx0L3QvtCy0LvRj9C7XG4gIC8qIVxuICBpZiAoIWNvbnN0cnVjdGluZyAmJlxuICAgICAgbnVsbCAhPSB2YWwgJiZcbiAgICAgIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgJiZcbiAgICAgIHV0aWxzLmRlZXBFcXVhbCh2YWwsIHNjaGVtYS5nZXREZWZhdWx0KHRoaXMsIGNvbnN0cnVjdGluZykpICkge1xuXG4gICAgLy9jb25zb2xlLmxvZyggcGF0aFRvTWFyaywgdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSApO1xuXG4gICAgLy8gYSBwYXRoIHdpdGggYSBkZWZhdWx0IHdhcyAkdW5zZXQgb24gdGhlIHNlcnZlclxuICAgIC8vIGFuZCB0aGUgdXNlciBpcyBzZXR0aW5nIGl0IHRvIHRoZSBzYW1lIHZhbHVlIGFnYWluXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgKi9cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGFjdHVhbCBzZXR0aW5nIG9mIHRoZSB2YWx1ZSBhbmQgbWFya2luZyB0aGUgcGF0aCBtb2RpZmllZCBpZiBhcHByb3ByaWF0ZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2V0XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldCA9IGZ1bmN0aW9uICggcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsICkge1xuICB2YXIgc2hvdWxkTW9kaWZ5ID0gdGhpcy4kX19zaG91bGRNb2RpZnkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICBpZiAoc2hvdWxkTW9kaWZ5KSB7XG4gICAgdGhpcy5tYXJrTW9kaWZpZWQocGF0aFRvTWFyaywgdmFsKTtcbiAgfVxuXG4gIHZhciBvYmogPSB0aGlzLl9kb2NcbiAgICAsIGkgPSAwXG4gICAgLCBsID0gcGFydHMubGVuZ3RoO1xuXG4gIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIG5leHQgPSBpICsgMVxuICAgICAgLCBsYXN0ID0gbmV4dCA9PT0gbDtcblxuICAgIGlmICggbGFzdCApIHtcbiAgICAgIG9ialtwYXJ0c1tpXV0gPSB2YWw7XG5cbiAgICAgIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCwgdmFsICk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbcGFydHNbaV1dLmNvbnN0cnVjdG9yKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ0VtYmVkZGVkRG9jdW1lbnQnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikgKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSBpZiAob2JqW3BhcnRzW2ldXSAmJiBBcnJheS5pc0FycmF5KG9ialtwYXJ0c1tpXV0pKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV0gPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogR2V0cyBhIHJhdyB2YWx1ZSBmcm9tIGEgcGF0aCAobm8gZ2V0dGVycylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiB1dGlscy5nZXRWYWx1ZShwYXRoLCB0aGlzLl9kb2MpO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmF3IHZhbHVlIGZvciBhIHBhdGggKG5vIGNhc3RpbmcsIHNldHRlcnMsIHRyYW5zZm9ybWF0aW9ucylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbHVlKSB7XG4gIHV0aWxzLnNldFZhbHVlKHBhdGgsIHZhbHVlLCB0aGlzLl9kb2MpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2YgYSBwYXRoLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIC8vIHBhdGhcbiAqICAgICBkb2MuZ2V0KCdhZ2UnKSAvLyA0N1xuICpcbiAqICAgICAvLyBkeW5hbWljIGNhc3RpbmcgdG8gYSBzdHJpbmdcbiAqICAgICBkb2MuZ2V0KCdhZ2UnLCBTdHJpbmcpIC8vIFwiNDdcIlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge1NjaGVtYXxTdHJpbmd8TnVtYmVyfSBbdHlwZV0gb3B0aW9uYWxseSBzcGVjaWZ5IGEgdHlwZSBmb3Igb24tdGhlLWZseSBhdHRyaWJ1dGVzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIHR5cGUpIHtcbiAgdmFyIGFkaG9jcztcbiAgaWYgKHR5cGUpIHtcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xuICAgIGFkaG9jc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgdHlwZSk7XG4gIH1cblxuICB2YXIgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpIHx8IHRoaXMuc2NoZW1hLnZpcnR1YWxwYXRoKHBhdGgpXG4gICAgLCBwaWVjZXMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAsIG9iaiA9IHRoaXMuX2RvYztcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBpZWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBvYmogPSB1bmRlZmluZWQgPT09IG9iaiB8fCBudWxsID09PSBvYmpcbiAgICAgID8gdW5kZWZpbmVkXG4gICAgICA6IG9ialtwaWVjZXNbaV1dO1xuICB9XG5cbiAgaWYgKHNjaGVtYSkge1xuICAgIG9iaiA9IHNjaGVtYS5hcHBseUdldHRlcnMob2JqLCB0aGlzKTtcbiAgfVxuXG4gIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50R2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCApO1xuXG4gIHJldHVybiBvYmo7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNjaGVtYXR5cGUgZm9yIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19wYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3BhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRoc1xuICAgICwgYWRob2NUeXBlID0gYWRob2NzICYmIGFkaG9jc1twYXRoXTtcblxuICBpZiAoYWRob2NUeXBlKSB7XG4gICAgcmV0dXJuIGFkaG9jVHlwZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5zY2hlbWEucGF0aChwYXRoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyB0aGUgcGF0aCBhcyBoYXZpbmcgcGVuZGluZyBjaGFuZ2VzIHRvIHdyaXRlIHRvIHRoZSBkYi5cbiAqXG4gKiBfVmVyeSBoZWxwZnVsIHdoZW4gdXNpbmcgW01peGVkXSguL3NjaGVtYXR5cGVzLmh0bWwjbWl4ZWQpIHR5cGVzLl9cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLm1peGVkLnR5cGUgPSAnY2hhbmdlZCc7XG4gKiAgICAgZG9jLm1hcmtNb2RpZmllZCgnbWl4ZWQudHlwZScpO1xuICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlcyB0byBtaXhlZC50eXBlIGFyZSBub3cgcGVyc2lzdGVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gbWFyayBtb2RpZmllZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1hcmtNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcbn07XG5cbi8qKlxuICogQ2F0Y2hlcyBlcnJvcnMgdGhhdCBvY2N1ciBkdXJpbmcgZXhlY3V0aW9uIG9mIGBmbmAgYW5kIHN0b3JlcyB0aGVtIHRvIGxhdGVyIGJlIHBhc3NlZCB3aGVuIGBzYXZlKClgIGlzIGV4ZWN1dGVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdIHRoZSBzY29wZSB3aXRoIHdoaWNoIHRvIGNhbGwgZm5cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX190cnlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fdHJ5ID0gZnVuY3Rpb24gKGZuLCBzY29wZSkge1xuICB2YXIgcmVzO1xuICB0cnkge1xuICAgIGZuLmNhbGwoc2NvcGUpO1xuICAgIHJlcyA9IHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aGlzLiRfX2Vycm9yKGUpO1xuICAgIHJlcyA9IGZhbHNlO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGxpc3Qgb2YgcGF0aHMgdGhhdCBoYXZlIGJlZW4gbW9kaWZpZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUubW9kaWZpZWRQYXRocyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcmVjdE1vZGlmaWVkUGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KTtcblxuICByZXR1cm4gZGlyZWN0TW9kaWZpZWRQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKGxpc3QsIHBhdGgpIHtcbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgcmV0dXJuIGxpc3QuY29uY2F0KHBhcnRzLnJlZHVjZShmdW5jdGlvbiAoY2hhaW5zLCBwYXJ0LCBpKSB7XG4gICAgICByZXR1cm4gY2hhaW5zLmNvbmNhdChwYXJ0cy5zbGljZSgwLCBpKS5jb25jYXQocGFydCkuam9pbignLicpKTtcbiAgICB9LCBbXSkpO1xuICB9LCBbXSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGRvY3VtZW50IHdhcyBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiBJZiBgcGF0aGAgaXMgZ2l2ZW4sIGNoZWNrcyBpZiBhIHBhdGggb3IgYW55IGZ1bGwgcGF0aCBjb250YWluaW5nIGBwYXRoYCBhcyBwYXJ0IG9mIGl0cyBwYXRoIGNoYWluIGhhcyBiZWVuIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcbiAqICAgICBkb2MuaXNNb2RpZmllZCgpICAgICAgICAgICAgICAgICAgICAvLyB0cnVlXG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoJ2RvY3VtZW50cycpICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgICAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gb3B0aW9uYWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoXG4gICAgPyAhIX50aGlzLm1vZGlmaWVkUGF0aHMoKS5pbmRleE9mKHBhdGgpXG4gICAgOiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zb21lKCdtb2RpZnknKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGBwYXRoYCB3YXMgZGlyZWN0bHkgc2V0IGFuZCBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cy4wLnRpdGxlJykgLy8gdHJ1ZVxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzRGlyZWN0TW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIGluaXRpYWxpemVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzSW5pdCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAocGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIHNlbGVjdGVkIGluIHRoZSBzb3VyY2UgcXVlcnkgd2hpY2ggaW5pdGlhbGl6ZWQgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBUaGluZy5maW5kT25lKCkuc2VsZWN0KCduYW1lJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnbmFtZScpIC8vIHRydWVcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnYWdlJykgIC8vIGZhbHNlXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmlzU2VsZWN0ZWQgPSBmdW5jdGlvbiBpc1NlbGVjdGVkIChwYXRoKSB7XG4gIGlmICh0aGlzLiRfXy5zZWxlY3RlZCkge1xuXG4gICAgaWYgKCdfaWQnID09PSBwYXRoKSB7XG4gICAgICByZXR1cm4gMCAhPT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xuICAgIH1cblxuICAgIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLnNlbGVjdGVkKVxuICAgICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgICAsIGluY2x1c2l2ZSA9IGZhbHNlXG4gICAgICAsIGN1cjtcblxuICAgIGlmICgxID09PSBpICYmICdfaWQnID09PSBwYXRoc1swXSkge1xuICAgICAgLy8gb25seSBfaWQgd2FzIHNlbGVjdGVkLlxuICAgICAgcmV0dXJuIDAgPT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PT0gY3VyKSBjb250aW51ZTtcbiAgICAgIGluY2x1c2l2ZSA9ICEhIHRoaXMuJF9fLnNlbGVjdGVkW2N1cl07XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICB9XG5cbiAgICBpID0gcGF0aHMubGVuZ3RoO1xuICAgIHZhciBwYXRoRG90ID0gcGF0aCArICcuJztcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09PSBjdXIpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoMCA9PT0gY3VyLmluZGV4T2YocGF0aERvdCkpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKDAgPT09IHBhdGhEb3QuaW5kZXhPZihjdXIgKyAnLicpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICEgaW5jbHVzaXZlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGVzIHJlZ2lzdGVyZWQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYHByZWAgc2F2ZSBhbmQgaWYgYSB2YWxpZGF0aW9uIHJ1bGUgaXMgdmlvbGF0ZWQsIFtzYXZlXSgjbW9kZWxfTW9kZWwtc2F2ZSkgaXMgYWJvcnRlZCBhbmQgdGhlIGVycm9yIGlzIHJldHVybmVkIHRvIHlvdXIgYGNhbGxiYWNrYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGlmIChlcnIpIGhhbmRsZUVycm9yKGVycik7XG4gKiAgICAgICBlbHNlIC8vIHZhbGlkYXRpb24gcGFzc2VkXG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGVkIGFmdGVyIHZhbGlkYXRpb24gY29tcGxldGVzLCBwYXNzaW5nIGFuIGVycm9yIGlmIG9uZSBvY2N1cnJlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBvbmx5IHZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkcyB3aGVuIG5lY2Vzc2FyeVxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSkuZmlsdGVyKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKCFzZWxmLmlzU2VsZWN0ZWQocGF0aCkgJiYgIXNlbGYuaXNNb2RpZmllZChwYXRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcblxuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSk7XG5cbiAgaWYgKDAgPT09IHBhdGhzLmxlbmd0aCkge1xuICAgIGNvbXBsZXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsaWRhdGluZyA9IHt9XG4gICAgLCB0b3RhbCA9IDA7XG5cbiAgcGF0aHMuZm9yRWFjaCh2YWxpZGF0ZVBhdGgpO1xuICByZXR1cm4gdGhpcztcblxuICBmdW5jdGlvbiB2YWxpZGF0ZVBhdGggKHBhdGgpIHtcbiAgICBpZiAodmFsaWRhdGluZ1twYXRoXSkgcmV0dXJuO1xuXG4gICAgdmFsaWRhdGluZ1twYXRoXSA9IHRydWU7XG4gICAgdG90YWwrKztcblxuICAgIHV0aWxzLnNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgICAgdmFyIHAgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuICAgICAgaWYgKCFwKSByZXR1cm4gLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuXG4gICAgICB2YXIgdmFsID0gc2VsZi5nZXRWYWx1ZShwYXRoKTtcbiAgICAgIHAuZG9WYWxpZGF0ZSh2YWwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHNlbGYuaW52YWxpZGF0ZShcbiAgICAgICAgICAgICAgcGF0aFxuICAgICAgICAgICAgLCBlcnJcbiAgICAgICAgICAgICwgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLywgdHJ1ZSAvLyBlbWJlZGRlZCBkb2NzXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC0tdG90YWwgfHwgY29tcGxldGUoKTtcbiAgICAgIH0sIHNlbGYpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGUgKCkge1xuICAgIHZhciBlcnIgPSBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gICAgc2VsZi4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICAgIGNiICYmIGNiKGVycik7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIFRoZSBgZXJyb3JNc2dgIGFyZ3VtZW50IHdpbGwgYmVjb21lIHRoZSBtZXNzYWdlIG9mIHRoZSBgVmFsaWRhdGlvbkVycm9yYC5cbiAqXG4gKiBUaGUgYHZhbHVlYCBhcmd1bWVudCAoaWYgcGFzc2VkKSB3aWxsIGJlIGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgVmFsaWRhdGlvbkVycm9yLnZhbHVlYCBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgZG9jLmludmFsaWRhdGUoJ3NpemUnLCAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLCAxNCk7XG5cbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coZXJyKVxuICogICAgICAgLy8gcHJpbnRzXG4gKiAgICAgICB7IG1lc3NhZ2U6ICdWYWxpZGF0aW9uIGZhaWxlZCcsXG4gKiAgICAgICAgIG5hbWU6ICdWYWxpZGF0aW9uRXJyb3InLFxuICogICAgICAgICBlcnJvcnM6XG4gKiAgICAgICAgICB7IHNpemU6XG4gKiAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsXG4gKiAgICAgICAgICAgICAgIG5hbWU6ICdWYWxpZGF0b3JFcnJvcicsXG4gKiAgICAgICAgICAgICAgIHBhdGg6ICdzaXplJyxcbiAqICAgICAgICAgICAgICAgdHlwZTogJ3VzZXIgZGVmaW5lZCcsXG4gKiAgICAgICAgICAgICAgIHZhbHVlOiAxNCB9IH0gfVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnJvck1zZyB0aGUgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd8TnVtYmVyfGFueX0gdmFsdWUgb3B0aW9uYWwgaW52YWxpZCB2YWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyb3JNc2csIHZhbHVlKSB7XG4gIGlmICghdGhpcy4kX18udmFsaWRhdGlvbkVycm9yKSB7XG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzKTtcbiAgfVxuXG4gIGlmICghZXJyb3JNc2cgfHwgJ3N0cmluZycgPT09IHR5cGVvZiBlcnJvck1zZykge1xuICAgIGVycm9yTXNnID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIGVycm9yTXNnLCAndXNlciBkZWZpbmVkJywgdmFsdWUpO1xuICB9XG5cbiAgaWYgKHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9PT0gZXJyb3JNc2cpIHJldHVybjtcblxuICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IuZXJyb3JzW3BhdGhdID0gZXJyb3JNc2c7XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgaW50ZXJuYWwgbW9kaWZpZWQgc3RhdGUgb2YgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxuICogQG1ldGhvZCAkX19yZXNldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX3Jlc2V0ID0gZnVuY3Rpb24gcmVzZXQgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBzZWxmLmdldFZhbHVlKGkpO1xuICB9KVxuICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdmFsICYmIHZhbC5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XG4gIH0pXG4gIC5mb3JFYWNoKGZ1bmN0aW9uIChhcnJheSkge1xuICAgIHZhciBpID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhciBkb2MgPSBhcnJheVtpXTtcbiAgICAgIGlmICghZG9jKSBjb250aW51ZTtcbiAgICAgIGRvYy4kX19yZXNldCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2xlYXIgJ21vZGlmeScoJ2RpcnR5JykgY2FjaGVcbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMuY2xlYXIoJ21vZGlmeScpO1xuICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZXJyb3JzID0gdW5kZWZpbmVkO1xuICAvL2NvbnNvbGUubG9nKCBzZWxmLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSApO1xuICAvL1RPRE86INGC0YPRglxuICB0aGlzLnNjaGVtYS5yZXF1aXJlZFBhdGhzKCkuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xuICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLnJlcXVpcmUocGF0aCk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBkb2N1bWVudHMgZGlydHkgcGF0aHMgLyB2YWxzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19kaXJ0eVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RpcnR5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGFsbCA9IHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1hcCgnbW9kaWZ5JywgZnVuY3Rpb24gKHBhdGgpIHtcbiAgICByZXR1cm4geyBwYXRoOiBwYXRoXG4gICAgICAgICAgICwgdmFsdWU6IHNlbGYuZ2V0VmFsdWUoIHBhdGggKVxuICAgICAgICAgICAsIHNjaGVtYTogc2VsZi4kX19wYXRoKCBwYXRoICkgfTtcbiAgfSk7XG5cbiAgLy8gU29ydCBkaXJ0eSBwYXRocyBpbiBhIGZsYXQgaGllcmFyY2h5LlxuICBhbGwuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiAoYS5wYXRoIDwgYi5wYXRoID8gLTEgOiAoYS5wYXRoID4gYi5wYXRoID8gMSA6IDApKTtcbiAgfSk7XG5cbiAgLy8gSWdub3JlIFwiZm9vLmFcIiBpZiBcImZvb1wiIGlzIGRpcnR5IGFscmVhZHkuXG4gIHZhciBtaW5pbWFsID0gW11cbiAgICAsIGxhc3RQYXRoXG4gICAgLCB0b3A7XG5cbiAgYWxsLmZvckVhY2goZnVuY3Rpb24oIGl0ZW0gKXtcbiAgICBsYXN0UGF0aCA9IGl0ZW0ucGF0aCArICcuJztcbiAgICBtaW5pbWFsLnB1c2goaXRlbSk7XG4gICAgdG9wID0gaXRlbTtcbiAgfSk7XG5cbiAgdG9wID0gbGFzdFBhdGggPSBudWxsO1xuICByZXR1cm4gbWluaW1hbDtcbn07XG5cbi8qIVxuICogQ29tcGlsZXMgc2NoZW1hcy5cbiAqICjRg9GB0YLQsNC90L7QstC40YLRjCDQs9C10YLRgtC10YDRiy/RgdC10YLRgtC10YDRiyDQvdCwINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsClcbiAqL1xuZnVuY3Rpb24gY29tcGlsZSAoc2VsZiwgdHJlZSwgcHJvdG8sIHByZWZpeCkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRyZWUpXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIGxpbWJcbiAgICAsIGtleTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBsaW1iID0gdHJlZVtrZXldO1xuXG4gICAgZGVmaW5lKHNlbGZcbiAgICAgICAgLCBrZXlcbiAgICAgICAgLCAoKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUobGltYi5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKGxpbWIpLmxlbmd0aClcbiAgICAgICAgICAgICAgICYmICghbGltYi50eXBlIHx8IGxpbWIudHlwZS50eXBlKVxuICAgICAgICAgICAgICAgPyBsaW1iXG4gICAgICAgICAgICAgICA6IG51bGwpXG4gICAgICAgICwgcHJvdG9cbiAgICAgICAgLCBwcmVmaXhcbiAgICAgICAgLCBrZXlzKTtcbiAgfVxufVxuXG4vLyBnZXRzIGRlc2NyaXB0b3JzIGZvciBhbGwgcHJvcGVydGllcyBvZiBgb2JqZWN0YFxuLy8gbWFrZXMgYWxsIHByb3BlcnRpZXMgbm9uLWVudW1lcmFibGUgdG8gbWF0Y2ggcHJldmlvdXMgYmVoYXZpb3IgdG8gIzIyMTFcbmZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqZWN0KSB7XG4gIHZhciByZXN1bHQgPSB7fTtcblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcbiAgICByZXN1bHRba2V5XS5lbnVtZXJhYmxlID0gZmFsc2U7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qIVxuICogRGVmaW5lcyB0aGUgYWNjZXNzb3IgbmFtZWQgcHJvcCBvbiB0aGUgaW5jb21pbmcgcHJvdG90eXBlLlxuICog0YLQsNC8INC20LUsINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsCDRgdC00LXQu9Cw0LXQvCDQvdCw0LHQu9GO0LTQsNC10LzRi9C80LhcbiAqL1xuZnVuY3Rpb24gZGVmaW5lIChzZWxmLCBwcm9wLCBzdWJwcm9wcywgcHJvdG90eXBlLCBwcmVmaXgsIGtleXMpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICB2YXIgcGF0aCA9IChwcmVmaXggPyBwcmVmaXggKyAnLicgOiAnJykgKyBwcm9wO1xuXG4gIGlmIChzdWJwcm9wcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLiRfXy5nZXR0ZXJzKVxuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVycyA9IHt9O1xuXG4gICAgICAgICAgaWYgKCF0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdKSB7XG4gICAgICAgICAgICB2YXIgbmVzdGVkID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnModGhpcykpO1xuXG4gICAgICAgICAgICAvLyBzYXZlIHNjb3BlIGZvciBuZXN0ZWQgZ2V0dGVycy9zZXR0ZXJzXG4gICAgICAgICAgICBpZiAoIXByZWZpeCkgbmVzdGVkLiRfXy5zY29wZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIHNoYWRvdyBpbmhlcml0ZWQgZ2V0dGVycyBmcm9tIHN1Yi1vYmplY3RzIHNvXG4gICAgICAgICAgICAvLyB0aGluZy5uZXN0ZWQubmVzdGVkLm5lc3RlZC4uLiBkb2Vzbid0IG9jY3VyIChnaC0zNjYpXG4gICAgICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAgICAgLCBsZW4gPSBrZXlzLmxlbmd0aDtcblxuICAgICAgICAgICAgZm9yICg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAvLyBvdmVyLXdyaXRlIHRoZSBwYXJlbnRzIGdldHRlciB3aXRob3V0IHRyaWdnZXJpbmcgaXRcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5lc3RlZCwga2V5c1tpXSwge1xuICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UgICAvLyBJdCBkb2Vzbid0IHNob3cgdXAuXG4gICAgICAgICAgICAgICAgLCB3cml0YWJsZTogdHJ1ZSAgICAgIC8vIFdlIGNhbiBzZXQgaXQgbGF0ZXIuXG4gICAgICAgICAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWUgIC8vIFdlIGNhbiBPYmplY3QuZGVmaW5lUHJvcGVydHkgYWdhaW4uXG4gICAgICAgICAgICAgICAgLCB2YWx1ZTogdW5kZWZpbmVkICAgIC8vIEl0IHNoYWRvd3MgaXRzIHBhcmVudC5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5lc3RlZC50b09iamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhdGgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29tcGlsZSggc2VsZiwgc3VicHJvcHMsIG5lc3RlZCwgcGF0aCApO1xuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVyc1twYXRoXSA9IG5lc3RlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy4kX18uZ2V0dGVyc1twYXRoXTtcbiAgICAgICAgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBEb2N1bWVudCkgdiA9IHYudG9PYmplY3QoKTtcbiAgICAgICAgICByZXR1cm4gKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMpLnNldCggcGF0aCwgdiApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgfSBlbHNlIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICggKSB7IHJldHVybiB0aGlzLmdldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgpOyB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHRoaXMuc2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCwgdik7IH1cbiAgICB9KTtcbiAgfVxuXG4gIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50RGVmaW5lUHJvcGVydHkuY2FsbCggc2VsZiwgc2VsZiwgcHJvdG90eXBlLCBwcm9wLCBwcmVmaXgsIHBhdGggKTtcbiAgLy9zZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIHByb3RvdHlwZSApO1xufVxuXG4vKipcbiAqIEFzc2lnbnMvY29tcGlsZXMgYHNjaGVtYWAgaW50byB0aGlzIGRvY3VtZW50cyBwcm90b3R5cGUuXG4gKlxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFNjaGVtYVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXRTY2hlbWEgPSBmdW5jdGlvbiAoIHNjaGVtYSApIHtcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIGNvbXBpbGUoIHRoaXMsIHNjaGVtYS50cmVlLCB0aGlzICk7XG59O1xuXG4vKipcbiAqIEdldCBhbGwgc3ViZG9jcyAoYnkgYmZzKVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBbGxTdWJkb2NzXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2dldEFsbFN1YmRvY3MgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG4gIEVtYmVkZGVkID0gRW1iZWRkZWQgfHwgcmVxdWlyZSgnLi90eXBlcy9lbWJlZGRlZCcpO1xuXG4gIGZ1bmN0aW9uIGRvY1JlZHVjZXIoc2VlZCwgcGF0aCkge1xuICAgIHZhciB2YWwgPSB0aGlzW3BhdGhdO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkpe1xuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gX2RvY1JlZHVjZShkb2MpIHtcblxuICAgICAgICBpZiAoIWRvYyB8fCAhZG9jLl9kb2MpIHJldHVybjtcbiAgICAgICAgaWYgKGRvYyBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2goZG9jKTtcblxuICAgICAgICBzZWVkID0gT2JqZWN0LmtleXMoZG9jLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQoZG9jLl9kb2MpLCBzZWVkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc2VlZDtcbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQodGhpcyksIFtdKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIGdlbmVyaWMgc2F2ZSBzdHVmZi5cbiAqIHRvIHNvbHZlICMxNDQ2IHVzZSB1c2UgaGllcmFyY2h5IGluc3RlYWQgb2YgaG9va3NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcHJlc2F2ZVZhbGlkYXRlXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3ByZXNhdmVWYWxpZGF0ZSA9IGZ1bmN0aW9uICRfX3ByZXNhdmVWYWxpZGF0ZSgpIHtcbiAgLy8gaWYgYW55IGRvYy5zZXQoKSBjYWxscyBmYWlsZWRcblxuICB2YXIgZG9jcyA9IHRoaXMuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUoKTtcblxuICB2YXIgZTIgPSBkb2NzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYy4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgfSk7XG4gIHZhciBlMSA9IFt0aGlzLiRfXy5zYXZlRXJyb3JdLmNvbmNhdChlMik7XG4gIHZhciBlcnIgPSBlMS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtyZXR1cm4geH0pWzBdO1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBudWxsO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgcGF0aCB0aGF0IHdlcmUgY2hhbmdlZCBhbmQgYXJlIGFycmF5c1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcblxuICAvLyB2YWxpZGF0ZSBhbGwgZG9jdW1lbnQgYXJyYXlzLlxuICByZXR1cm4gdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgICAubWFwKCdpbml0JywgJ21vZGlmeScsIGZ1bmN0aW9uIChpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRWYWx1ZShpKTtcbiAgICB9LmJpbmQodGhpcykpXG4gICAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgICByZXR1cm4gdmFsICYmIHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24oc2VlZCwgYXJyYXkpIHtcbiAgICAgIHJldHVybiBzZWVkLmNvbmNhdChhcnJheSk7XG4gICAgfSwgW10pXG4gICAgLmZpbHRlcihmdW5jdGlvbiAoZG9jKSB7cmV0dXJuIGRvY30pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXJyb3JcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19lcnJvclxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gZXJyO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJvZHVjZXMgYSBzcGVjaWFsIHF1ZXJ5IGRvY3VtZW50IG9mIHRoZSBtb2RpZmllZCBwcm9wZXJ0aWVzIHVzZWQgaW4gdXBkYXRlcy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGVsdGFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGVsdGEgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJ0eSA9IHRoaXMuJF9fZGlydHkoKTtcblxuICB2YXIgZGVsdGEgPSB7fVxuICAgICwgbGVuID0gZGlydHkubGVuZ3RoXG4gICAgLCBkID0gMDtcblxuICBmb3IgKDsgZCA8IGxlbjsgKytkKSB7XG4gICAgdmFyIGRhdGEgPSBkaXJ0eVsgZCBdO1xuICAgIHZhciB2YWx1ZSA9IGRhdGEudmFsdWU7XG5cbiAgICB2YWx1ZSA9IHV0aWxzLmNsb25lKHZhbHVlLCB7IGRlcG9wdWxhdGU6IDEgfSk7XG4gICAgZGVsdGFbIGRhdGEucGF0aCBdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gZGVsdGE7XG59O1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9faGFuZGxlU2F2ZSA9IGZ1bmN0aW9uKCl7XG4gIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YDQtdGB0YPRgNGBINC60L7Qu9C70LXQutGG0LjQuCwg0LrRg9C00LAg0LHRg9C00LXQvCDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LTQsNC90L3Ri9C1XG4gIHZhciByZXNvdXJjZTtcbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICByZXNvdXJjZSA9IHRoaXMuY29sbGVjdGlvbi5hcGk7XG4gIH1cblxuICB2YXIgaW5uZXJQcm9taXNlID0gbmV3IERlZmVycmVkKCk7XG5cbiAgaWYgKCB0aGlzLmlzTmV3ICkge1xuICAgIC8vIHNlbmQgZW50aXJlIGRvY1xuXG4gICAgdmFyIHRvT2JqZWN0T3B0aW9ucyA9IHt9O1xuICAgIGlmICggdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCAmJiB0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnJldGFpbktleU9yZGVyICkge1xuICAgICAgdG9PYmplY3RPcHRpb25zLnJldGFpbktleU9yZGVyID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0b09iamVjdE9wdGlvbnMuZGVwb3B1bGF0ZSA9IDE7XG4gICAgdmFyIG9iaiA9IHRoaXMudG9PYmplY3QoIHRvT2JqZWN0T3B0aW9ucyApO1xuXG4gICAgaWYgKCAoIG9iaiB8fCB7fSApLmhhc093blByb3BlcnR5KCdfaWQnKSA9PT0gZmFsc2UgKSB7XG4gICAgICAvLyBkb2N1bWVudHMgbXVzdCBoYXZlIGFuIF9pZCBlbHNlIG1vbmdvb3NlIHdvbid0IGtub3dcbiAgICAgIC8vIHdoYXQgdG8gdXBkYXRlIGxhdGVyIGlmIG1vcmUgY2hhbmdlcyBhcmUgbWFkZS4gdGhlIHVzZXJcbiAgICAgIC8vIHdvdWxkbid0IGtub3cgd2hhdCBfaWQgd2FzIGdlbmVyYXRlZCBieSBtb25nb2RiIGVpdGhlclxuICAgICAgLy8gbm9yIHdvdWxkIHRoZSBPYmplY3RJZCBnZW5lcmF0ZWQgbXkgbW9uZ29kYiBuZWNlc3NhcmlseVxuICAgICAgLy8gbWF0Y2ggdGhlIHNjaGVtYSBkZWZpbml0aW9uLlxuICAgICAgaW5uZXJQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ2RvY3VtZW50IG11c3QgaGF2ZSBhbiBfaWQgYmVmb3JlIHNhdmluZycpKTtcbiAgICAgIHJldHVybiBpbm5lclByb21pc2U7XG4gICAgfVxuXG4gICAgLy8g0JHQtdC3INGA0LXRgdGD0YDRgdCwINC80L7QttC90L4g0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4gKNC/0L7QtNCz0L7RgtC+0LLQuNGC0Ywg0LTQsNC90L3Ri9C1INC6INC+0YLQv9GA0LDQstC60LUpLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCBvYmogKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb3VyY2UuY3JlYXRlKCBvYmogKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XG4gICAgfVxuXG4gICAgdGhpcy4kX19yZXNldCgpO1xuICAgIHRoaXMuaXNOZXcgPSBmYWxzZTtcbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICAgIC8vIE1ha2UgaXQgcG9zc2libGUgdG8gcmV0cnkgdGhlIGluc2VydFxuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3QgdHJlYXQgaXQgYXMgYSBuZXcgb2JqZWN0IG9uIGVycm9yLFxuICAgIC8vIHNpbmNlIGl0IGFscmVhZHkgZXhpc3RzXG4gICAgdGhpcy4kX18uaW5zZXJ0aW5nID0gZmFsc2U7XG5cbiAgICB2YXIgZGVsdGEgPSB0aGlzLiRfX2RlbHRhKCk7XG5cbiAgICBpZiAoICFfLmlzRW1wdHkoIGRlbHRhICkgKSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICAvLyDQkdC10Lcg0YDQtdGB0YPRgNGB0LAg0LzQvtC20L3QviDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiAo0L/QvtC00LPQvtGC0L7QstC40YLRjCDQtNCw0L3QvdGL0LUg0Log0L7RgtC/0YDQsNCy0LrQtSksINC00LDQttC1INC10YHQu9C4INC90LXRgiDQutC+0LvQu9C10LrRhtC40LhcbiAgICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCBkZWx0YSApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UoIHRoaXMuaWQgKS51cGRhdGUoIGRlbHRhICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gaW5uZXJQcm9taXNlO1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gU2F2ZXMgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiDQldGB0LvQuCDQsNC/0Lgt0LrQu9C40LXQvdGC0LAg0L3QtdGCINC4INC00L7QutGD0LzQtdC90YIg0L3QvtCy0YvQuSwg0YLQviDQsiDQutC+0LvQsdGN0LrQtSDQsdGD0LTQtdGCIHBsYWluIG9iamVjdCDRgdC+INCy0YHQtdC80Lgg0LTQsNC90L3Ri9C80Lgg0LTQu9GPINGB0L7RhdGA0LDQvdC10L3QuNGPINC90LAg0YHQtdGA0LLQtdGALlxuICog0JXRgdC70Lgg0LDQv9C4LdC60LvQuNC10L3RgtCwINC90LXRgiDQuCDQtNC+0LrRg9C80LXQvdGCINGB0YLQsNGA0L7QtSwg0YLQviDQsiDQutC+0LvQsdGN0LrQtSDQsdGD0LTQtdGCIHBsYWluIG9iamVjdCDRgtC+0LvRjNC60L4g0YEg0LjQt9C80LXQvdGR0L3QvdGL0LzQuCDQtNCw0L3QvdGL0LzQuC5cbiAqXG4gKiDQldGB0LvQuCDQsNC/0Lgt0LrQu9C40LXQvdGCINC10YHRgtGMINC4INC90LUg0LLQsNC20L3QviDQvdC+0LLRi9C5INC00L7QutGD0LzQtdC90YIg0LjQu9C4INGB0YLQsNGA0YvQuSwg0LIg0LrQvtC70LHRjdC60LUg0LLRgdC10LPQtNCwINCx0YPQtNC10YIg0L7RgtCy0LXRgiDQvtGCIHJlc3QtYXBpLWNsaWVudFxuICpcbiAqIC8vIHRvZG86INC00L7QvtC/0LjRgdCw0YLRjCDRjdGC0L4g0LTQtdC70L5cbiAqINCh0LXQudGH0LDRgSDQtdGB0LvQuCDQtdGB0YLRjCDRgNC10YHRg9GA0YEgKNCw0L/QuCDQutC70LjQtdC90YIpLCDRgtC+OlxuICog0LXRgdC70Lgg0LTQvtC60YPQvNC10L3RgiDQvdC+0LLRi9C5LCDRgtC+INC/0L7RgdC70LUg0L7RgtCy0LXRgtCwINGB0L7Qt9C00LDRgdGC0YHRjyDQvdC+0LLRi9C5INC00L7QutGD0LzQtdC90YIg0L3QsCDQvtGB0L3QvtCy0LUg0L7RgtCy0LXRgtCwLCDQuCDQvtCx0L7QstC70Y/QtdGC0YHRjyEhISAo0L/QvtC70YPRh9GI0LUg0L7QsdGK0Y/RgdC90LjRgtGMINGN0YLQvikg0YHRgdGL0LvQutCwIChpZCkg0LLQvdGD0YLRgNC4INC60L7Qu9C70LXQutGG0LjQuFxuICog0LXRgdC70Lgg0LTQvtC60YPQvNC10L3RgiDRgdGC0LDRgNGL0LksINGC0L4g0L/QvtGB0LvQtSDQvtGC0LLQtdGC0LAg0LjRidC10YLRgdGPINGN0YLQvtGCINC00L7QutGD0LzQtdC90YIg0L/QviBpZCDQuCDQtNC10LvQsNC10YLRgdGPIHNldFxuICpcbiAqXG4gKiBAZXhhbXBsZTpcbiAqXG4gKiAgICAgcHJvZHVjdC5zb2xkID0gRGF0ZS5ub3coKTtcbiAqICAgICBwcm9kdWN0LnNhdmUoZnVuY3Rpb24gKGVyciwgcHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgIGlmIChlcnIpIC4uXG4gKiAgICAgfSlcbiAqXG4gKiBAZGVzY3JpcHRpb24gVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSB0aHJlZSBwYXJhbWV0ZXJzLCBgZXJyYCBpZiBhbiBlcnJvciBvY2N1cnJlZCwgYHByb2R1Y3RgIHdoaWNoIGlzIHRoZSBzYXZlZCBgcHJvZHVjdGAsIGFuZCBgbnVtYmVyQWZmZWN0ZWRgIHdoaWNoIHdpbGwgYmUgMSB3aGVuIHRoZSBkb2N1bWVudCB3YXMgZm91bmQgYW5kIHVwZGF0ZWQgaW4gdGhlIGRhdGFiYXNlLCBvdGhlcndpc2UgMC5cbiAqXG4gKiBUaGUgYGZuYCBjYWxsYmFjayBpcyBvcHRpb25hbC4gSWYgbm8gYGZuYCBpcyBwYXNzZWQgYW5kIHZhbGlkYXRpb24gZmFpbHMsIHRoZSB2YWxpZGF0aW9uIGVycm9yIHdpbGwgYmUgZW1pdHRlZCBvbiB0aGUgY29ubmVjdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGlzIG1vZGVsLlxuICogQGV4YW1wbGU6XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHZhciBQcm9kdWN0ID0gc3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uKCdQcm9kdWN0Jywgc2NoZW1hICk7XG4gKiAgICAgdmFyIGRvYyA9IFByb2R1Y3QuYWRkKCk7XG4gKlxuICogICAgIC8vIHRvZG86INGA0LXQsNC70LjQt9C+0LLQsNGC0Ywg0Y3RgtC+XG4gKiAgICAgZG9jLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAZGVzY3JpcHRpb24gQXMgYW4gZXh0cmEgbWVhc3VyZSBvZiBmbG93IGNvbnRyb2wsIHNhdmUgd2lsbCByZXR1cm4gYSBQcm9taXNlIChib3VuZCB0byBgZm5gIGlmIHBhc3NlZCkgc28gaXQgY291bGQgYmUgY2hhaW5lZCwgb3IgaG9vayB0byByZWNpdmUgZXJyb3JzXG4gKiBAZXhhbXBsZTpcbiAqICAgICBwcm9kdWN0LnNhdmUoKS5kb25lKGZ1bmN0aW9uKCBwcm9kdWN0ICl7XG4gKiAgICAgICAgLi4uXG4gKiAgICAgfSkuZmFpbChmdW5jdGlvbiggZXJyICl7XG4gKiAgICAgICAgYXNzZXJ0Lm9rKCBlcnIgKVxuICogICAgIH0pXG4gKlxuICogQGRlc2NyaXB0aW9uIHJldGFpbktleU9yZGVyIC0ga2VlcCB0aGUga2V5IG9yZGVyIG9mIHRoZSBkb2Mgc2F2ZVxuICogQGV4YW1wbGU6XG4gKiAgICAgdmFyIENoZWNraW4gPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGRhdGU6IERhdGUsXG4gKiAgICAgICBsb2NhdGlvbjoge1xuICogICAgICAgICBsYXQ6IE51bWJlcixcbiAqICAgICAgICAgbG5nOiBOdW1iZXJcbiAqICAgICAgIH1cbiAqICAgICB9LCB7XG4gKiAgICAgICB0b09iamVjdDoge1xuICogICAgICAgICByZXRhaW5LZXlPcmRlcjogdHJ1ZVxuICogICAgICAgfVxuICogICAgIH0pO1xuICogICAgIHZhciBDaGVja2lucyA9IHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbignUHJvZHVjdCcsIHNjaGVtYSApO1xuICogICAgIHZhciBkb2MgPSBDaGVja2lucy5hZGQoKTtcbiAqXG4gKiAgICAgZG9jLnNhdmUoKS5kb25lKGZ1bmN0aW9uKCBvYmpUb1NhdmUgKXtcbiAqICAgICAgIC8vIGluIGBvYmpUb1NhdmVgIGZvbGxvd2VkIHRoZSBjb3JyZWN0IG9yZGVyIG9mIHRoZSBrZXlzIG9mIGRvY1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oIG9iamVjdCApfSBbZG9uZV0gb3B0aW9uYWwgY2FsbGJhY2ssIG9iamVjdCAtIG9ialRvU2F2ZVxuICogQHJldHVybiB7RGVmZXJyZWR9IERlZmVycmVkXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBtaWRkbGV3YXJlIGh0dHA6Ly9tb25nb29zZWpzLmNvbS9kb2NzL21pZGRsZXdhcmUuaHRtbFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uICggZG9uZSApIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZmluYWxQcm9taXNlID0gbmV3IERlZmVycmVkKCkuZG9uZSggZG9uZSApO1xuXG4gIC8vINCh0L7RhdGA0LDQvdGP0YLRjCDQtNC+0LrRg9C80LXQvdGCINC80L7QttC90L4g0YLQvtC70YzQutC+INC10YHQu9C4INC+0L0g0L3QsNGF0L7QtNC40YLRgdGPINCyINC60L7Qu9C70LXQutGG0LjQuFxuICBpZiAoICF0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBhcmd1bWVudHMgKTtcbiAgICBjb25zb2xlLmVycm9yKCdEb2N1bWVudC5zYXZlIGFwaSBoYW5kbGUgaXMgbm90IGltcGxlbWVudGVkLicpO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcHJlU2F2ZSBlcnJvcnMgKNGC0L7Rh9C+INC30L3QsNGOLCDRh9GC0L4g0L7QvdCwINC/0YDQvtCy0LXRgNGP0LXRgiDQvtGI0LjQsdC60Lgg0LIg0LzQsNGB0YHQuNCy0LDRhSAoQ2FzdEVycm9yKSlcbiAgdmFyIHByZVNhdmVFcnIgPSBzZWxmLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICBpZiAoIHByZVNhdmVFcnIgKSB7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggcHJlU2F2ZUVyciApO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBWYWxpZGF0ZVxuICB2YXIgcDAgPSBuZXcgRGVmZXJyZWQoKTtcbiAgc2VsZi52YWxpZGF0ZShmdW5jdGlvbiggZXJyICl7XG4gICAgaWYgKCBlcnIgKXtcbiAgICAgIHAwLnJlamVjdCggZXJyICk7XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcDAucmVzb2x2ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8g0KHQvdCw0YfQsNC70LAg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCy0YHQtSDQv9C+0LTQtNC+0LrRg9C80LXQvdGC0Ysg0Lgg0YHQtNC10LvQsNGC0YwgcmVzb2x2ZSEhIVxuICAvLyAo0YLRg9GCINC/0YHQtdCy0LTQvtGB0L7RhdGA0LDQvdC10L3QuNC1INGB0LzQvtGC0YDQtdGC0YwgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuc2F2ZSApXG4gIC8vIENhbGwgc2F2ZSBob29rcyBvbiBzdWJkb2NzXG4gIHZhciBzdWJEb2NzID0gc2VsZi4kX19nZXRBbGxTdWJkb2NzKCk7XG4gIHZhciB3aGVuQ29uZCA9IHN1YkRvY3MubWFwKGZ1bmN0aW9uIChkKSB7cmV0dXJuIGQuc2F2ZSgpO30pO1xuXG4gIHdoZW5Db25kLnB1c2goIHAwICk7XG5cbiAgLy8g0KLQsNC6INC80Ysg0L/QtdGA0LXQtNCw0ZHQvCDQvNCw0YHRgdC40LIgcHJvbWlzZSDRg9GB0LvQvtCy0LjQuVxuICB2YXIgcDEgPSBEZWZlcnJlZC53aGVuLmFwcGx5KCBEZWZlcnJlZCwgd2hlbkNvbmQgKTtcblxuICBwMS5mYWlsKGZ1bmN0aW9uICggZXJyICkge1xuICAgIC8vIElmIHRoZSBpbml0aWFsIGluc2VydCBmYWlscyBwcm92aWRlIGEgc2Vjb25kIGNoYW5jZS5cbiAgICAvLyAoSWYgd2UgZGlkIHRoaXMgYWxsIHRoZSB0aW1lIHdlIHdvdWxkIGJyZWFrIHVwZGF0ZXMpXG4gICAgaWYgKHNlbGYuJF9fLmluc2VydGluZykge1xuICAgICAgc2VsZi5pc05ldyA9IHRydWU7XG4gICAgICBzZWxmLmVtaXQoJ2lzTmV3JywgdHJ1ZSk7XG4gICAgfVxuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICB9KTtcblxuICAvLyBIYW5kbGUgc2F2ZSBhbmQgcmVzdWx0c1xuICBwMS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgc2VsZi4kX19oYW5kbGVTYXZlKCkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgLy90b2RvOiDQvdCw0LTQviDQv9GA0L7QstC10YDRj9GC0YwsINC90YPQttC90L4g0LvQuCDQv9C40YHQsNGC0Ywg0L/RgNC+0LLQtdGA0LrRgyDQvdCwINC90LDQu9C40YfQuNC1INGA0LXRgdGD0YDRgdCwLCDQtdGB0LvQuCDQvtC9INC10YHRgtGMIC0g0L7RgtC00LDQstCw0YLRjCBzZWxmLCDQtdGB0LvQuCDQvdC10YIsINC+0YLQtNCw0LLQsNGC0Ywg0LrQsNC6INGB0LXQudGH0LDRgSDQvdCw0L/QuNGB0LDQvdC+XG4gICAgICAvLyDQstC+0LfQvNC+0LbQvdC+INC4INGB0LrQvtGA0LXQtSDQstGB0LXQs9C+LCBhcGkg0Lgg0YLQsNC6INC+0YLQtNCw0ZHRgiDQstGB0ZEg0LIg0L/RgNCw0LLQuNC70YzQvdC+0Lwg0L/QvtGA0Y/QtNC60LUgKGRvYywgbWV0YSwganF4aHIpXG4gICAgICBmaW5hbFByb21pc2UucmVzb2x2ZS5hcHBseSggZmluYWxQcm9taXNlLCBhcmd1bWVudHMgKTtcblxuICAgIH0pLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QuYXBwbHkoIGZpbmFsUHJvbWlzZSwgYXJndW1lbnRzICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBmaW5hbFByb21pc2U7XG59O1xuXG5cbi8qKlxuICogQ29udmVydHMgdGhpcyBkb2N1bWVudCBpbnRvIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QsIHJlYWR5IGZvciBzdG9yYWdlIGluIE1vbmdvREIuXG4gKlxuICogQnVmZmVycyBhcmUgY29udmVydGVkIHRvIGluc3RhbmNlcyBvZiBbbW9uZ29kYi5CaW5hcnldKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5jb20vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvYmluYXJ5Lmh0bWwpIGZvciBwcm9wZXIgc3RvcmFnZS5cbiAqXG4gKiAjIyMjT3B0aW9uczpcbiAqXG4gKiAtIGBnZXR0ZXJzYCBhcHBseSBhbGwgZ2V0dGVycyAocGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzKVxuICogLSBgdmlydHVhbHNgIGFwcGx5IHZpcnR1YWwgZ2V0dGVycyAoY2FuIG92ZXJyaWRlIGBnZXR0ZXJzYCBvcHRpb24pXG4gKiAtIGBtaW5pbWl6ZWAgcmVtb3ZlIGVtcHR5IG9iamVjdHMgKGRlZmF1bHRzIHRvIHRydWUpXG4gKiAtIGB0cmFuc2Zvcm1gIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHRvIGFwcGx5IHRvIHRoZSByZXN1bHRpbmcgZG9jdW1lbnQgYmVmb3JlIHJldHVybmluZ1xuICpcbiAqICMjIyNHZXR0ZXJzL1ZpcnR1YWxzXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHBhdGggZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyBnZXR0ZXJzOiB0cnVlLCB2aXJ0dWFsczogZmFsc2UgfSlcbiAqXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgdmlydHVhbCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBhcHBseWluZyBib3RoIHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyBnZXR0ZXJzOiB0cnVlIH0pXG4gKlxuICogVG8gYXBwbHkgdGhlc2Ugb3B0aW9ucyB0byBldmVyeSBkb2N1bWVudCBvZiB5b3VyIHNjaGVtYSBieSBkZWZhdWx0LCBzZXQgeW91ciBbc2NoZW1hc10oI3NjaGVtYV9TY2hlbWEpIGB0b09iamVjdGAgb3B0aW9uIHRvIHRoZSBzYW1lIGFyZ3VtZW50LlxuICpcbiAqICAgICBzY2hlbWEuc2V0KCd0b09iamVjdCcsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiAjIyMjVHJhbnNmb3JtXG4gKlxuICogV2UgbWF5IG5lZWQgdG8gcGVyZm9ybSBhIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSByZXN1bHRpbmcgb2JqZWN0IGJhc2VkIG9uIHNvbWUgY3JpdGVyaWEsIHNheSB0byByZW1vdmUgc29tZSBzZW5zaXRpdmUgaW5mb3JtYXRpb24gb3IgcmV0dXJuIGEgY3VzdG9tIG9iamVjdC4gSW4gdGhpcyBjYXNlIHdlIHNldCB0aGUgb3B0aW9uYWwgYHRyYW5zZm9ybWAgZnVuY3Rpb24uXG4gKlxuICogVHJhbnNmb3JtIGZ1bmN0aW9ucyByZWNlaXZlIHRocmVlIGFyZ3VtZW50c1xuICpcbiAqICAgICBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHt9XG4gKlxuICogLSBgZG9jYCBUaGUgbW9uZ29vc2UgZG9jdW1lbnQgd2hpY2ggaXMgYmVpbmcgY29udmVydGVkXG4gKiAtIGByZXRgIFRoZSBwbGFpbiBvYmplY3QgcmVwcmVzZW50YXRpb24gd2hpY2ggaGFzIGJlZW4gY29udmVydGVkXG4gKiAtIGBvcHRpb25zYCBUaGUgb3B0aW9ucyBpbiB1c2UgKGVpdGhlciBzY2hlbWEgb3B0aW9ucyBvciB0aGUgb3B0aW9ucyBwYXNzZWQgaW5saW5lKVxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIC8vIHNwZWNpZnkgdGhlIHRyYW5zZm9ybSBzY2hlbWEgb3B0aW9uXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIC8vIHJlbW92ZSB0aGUgX2lkIG9mIGV2ZXJ5IGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmcgdGhlIHJlc3VsdFxuICogICAgICAgZGVsZXRlIHJldC5faWQ7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgX2lkOiAnYW5JZCcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFdpdGggdHJhbnNmb3JtYXRpb25zIHdlIGNhbiBkbyBhIGxvdCBtb3JlIHRoYW4gcmVtb3ZlIHByb3BlcnRpZXMuIFdlIGNhbiBldmVuIHJldHVybiBjb21wbGV0ZWx5IG5ldyBjdXN0b21pemVkIG9iamVjdHM6XG4gKlxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBtb3ZpZTogcmV0Lm5hbWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBtb3ZpZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogX05vdGU6IGlmIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAsIHRoZSByZXR1cm4gdmFsdWUgd2lsbCBiZSBpZ25vcmVkLl9cbiAqXG4gKiBUcmFuc2Zvcm1hdGlvbnMgbWF5IGFsc28gYmUgYXBwbGllZCBpbmxpbmUsIG92ZXJyaWRkaW5nIGFueSB0cmFuc2Zvcm0gc2V0IGluIHRoZSBvcHRpb25zOlxuICpcbiAqICAgICBmdW5jdGlvbiB4Zm9ybSAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIHJldHVybiB7IGlubGluZTogcmV0Lm5hbWUsIGN1c3RvbTogdHJ1ZSB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBwYXNzIHRoZSB0cmFuc2Zvcm0gYXMgYW4gaW5saW5lIG9wdGlvblxuICogICAgIGRvYy50b09iamVjdCh7IHRyYW5zZm9ybTogeGZvcm0gfSk7IC8vIHsgaW5saW5lOiAnV3JlY2staXQgUmFscGgnLCBjdXN0b206IHRydWUgfVxuICpcbiAqIF9Ob3RlOiBpZiB5b3UgY2FsbCBgdG9PYmplY3RgIGFuZCBwYXNzIGFueSBvcHRpb25zLCB0aGUgdHJhbnNmb3JtIGRlY2xhcmVkIGluIHlvdXIgc2NoZW1hIG9wdGlvbnMgd2lsbCBfX25vdF9fIGJlIGFwcGxpZWQuIFRvIGZvcmNlIGl0cyBhcHBsaWNhdGlvbiBwYXNzIGB0cmFuc2Zvcm06IHRydWVgX1xuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LmhpZGUgPSAnX2lkJztcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIGlmIChvcHRpb25zLmhpZGUpIHtcbiAqICAgICAgICAgb3B0aW9ucy5oaWRlLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICogICAgICAgICAgIGRlbGV0ZSByZXRbcHJvcF07XG4gKiAgICAgICAgIH0pO1xuICogICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIGRvYyA9IG5ldyBEb2MoeyBfaWQ6ICdhbklkJywgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9KTtcbiAqICAgICBkb2MudG9PYmplY3QoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8geyBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqICAgICBkb2MudG9PYmplY3QoeyBoaWRlOiAnc2VjcmV0IF9pZCcgfSk7ICAgICAgICAgICAgICAgICAgLy8geyBfaWQ6ICdhbklkJywgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnLCB0cmFuc2Zvcm06IHRydWUgfSk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogVHJhbnNmb3JtcyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgX2FuZCBlYWNoIG9mIGl0cyBzdWItZG9jdW1lbnRzXy4gVG8gZGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IHlvdSBhcmUgY3VycmVudGx5IG9wZXJhdGluZyBvbiBhIHN1Yi1kb2N1bWVudCB5b3UgbWlnaHQgdXNlIHRoZSBmb2xsb3dpbmcgZ3VhcmQ6XG4gKlxuICogICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkb2Mub3duZXJEb2N1bWVudCkge1xuICogICAgICAgLy8gd29ya2luZyB3aXRoIGEgc3ViIGRvY1xuICogICAgIH1cbiAqXG4gKiBUcmFuc2Zvcm1zLCBsaWtlIGFsbCBvZiB0aGVzZSBvcHRpb25zLCBhcmUgYWxzbyBhdmFpbGFibGUgZm9yIGB0b0pTT05gLlxuICpcbiAqIFNlZSBbc2NoZW1hIG9wdGlvbnNdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIGZvciBzb21lIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBfRHVyaW5nIHNhdmUsIG5vIGN1c3RvbSBvcHRpb25zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBiZWZvcmUgYmVpbmcgc2VudCB0byB0aGUgZGF0YWJhc2UuX1xuICpcbiAqIHJldGFpbktleU9yZGVyIC0ga2VlcCB0aGUga2V5IG9yZGVyIG9mIHRoZSBkb2Mgc2F2ZVxuICpcbiAqICAgICB2YXIgQ2hlY2tpbiA9IG5ldyBTY2hlbWEoeyAuLi4gfSwge1xuICogICAgICAgdG9PYmplY3Q6IHtcbiAqICAgICAgICAgcmV0YWluS2V5T3JkZXI6IHRydWVcbiAqICAgICAgIH1cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIG9iamVjdCB3aXRoIGNvcnJlY3Qgb3JkZXIgb2YgdGhlIGtleXMgb2YgZG9jXG4gKlxuICogICAgIC8vIG9yIGlubGluZVxuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyByZXRhaW5LZXlPcmRlcjogdHJ1ZSB9KTtcbiAqXG4gKiAgICAgLy8gb3IgaWYgdXNlIHRvSlNPTigpO1xuICpcbiAqICAgICB2YXIgQ2hlY2tpbiA9IG5ldyBTY2hlbWEoeyAuLi4gfSwge1xuICogICAgICAgdG9KU09OOiB7XG4gKiAgICAgICAgIHJldGFpbktleU9yZGVyOiB0cnVlXG4gKiAgICAgICB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIGRvYy50b0pTT04oKTsgLy8gSlNPTiBzdHJpbmcgd2l0aCBjb3JyZWN0IG9yZGVyIG9mIHRoZSBrZXlzIG9mIGRvY1xuICpcbiAqICAgICAvLyBvciBpbmxpbmVcbiAqXG4gKiAgICAgZG9jLnRvSlNPTih7IHJldGFpbktleU9yZGVyOiB0cnVlIH0pO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge09iamVjdH0ganMgb2JqZWN0XG4gKiBAc2VlIG1vbmdvZGIuQmluYXJ5IGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5jb20vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvYmluYXJ5Lmh0bWxcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSAmJiB0aGlzLiRfXy53YXNQb3B1bGF0ZWQpIHtcbiAgICAvLyBwb3B1bGF0ZWQgcGF0aHMgdGhhdCB3ZSBzZXQgdG8gYSBkb2N1bWVudFxuICAgIHJldHVybiB1dGlscy5jbG9uZSh0aGlzLl9pZCwgb3B0aW9ucyk7XG4gIH1cblxuICAvLyBXaGVuIGludGVybmFsbHkgc2F2aW5nIHRoaXMgZG9jdW1lbnQgd2UgYWx3YXlzIHBhc3Mgb3B0aW9ucyxcbiAgLy8gYnlwYXNzaW5nIHRoZSBjdXN0b20gc2NoZW1hIG9wdGlvbnMuXG4gIHZhciBvcHRpb25zUGFyYW1ldGVyID0gb3B0aW9ucztcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob3B0aW9ucy5jb25zdHJ1Y3RvcikpIHx8XG4gICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5fdXNlU2NoZW1hT3B0aW9ucykpIHtcbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdFxuICAgICAgPyBjbG9uZSh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KVxuICAgICAgOiB7fTtcbiAgfVxuXG4gIGlmICggb3B0aW9ucy5taW5pbWl6ZSA9PT0gdW5kZWZpbmVkICl7XG4gICAgb3B0aW9ucy5taW5pbWl6ZSA9IHRoaXMuc2NoZW1hLm9wdGlvbnMubWluaW1pemU7XG4gIH1cblxuICBpZiAoIW9wdGlvbnNQYXJhbWV0ZXIpIHtcbiAgICBvcHRpb25zLl91c2VTY2hlbWFPcHRpb25zID0gdHJ1ZTtcbiAgfVxuXG4gIHZhciByZXQgPSB1dGlscy5jbG9uZSh0aGlzLl9kb2MsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLnZpcnR1YWxzIHx8IG9wdGlvbnMuZ2V0dGVycyAmJiBmYWxzZSAhPT0gb3B0aW9ucy52aXJ0dWFscykge1xuICAgIGFwcGx5R2V0dGVycyh0aGlzLCByZXQsICd2aXJ0dWFscycsIG9wdGlvbnMpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuZ2V0dGVycykge1xuICAgIGFwcGx5R2V0dGVycyh0aGlzLCByZXQsICdwYXRocycsIG9wdGlvbnMpO1xuICAgIC8vIGFwcGx5R2V0dGVycyBmb3IgcGF0aHMgd2lsbCBhZGQgbmVzdGVkIGVtcHR5IG9iamVjdHM7XG4gICAgLy8gaWYgbWluaW1pemUgaXMgc2V0LCB3ZSBuZWVkIHRvIHJlbW92ZSB0aGVtLlxuICAgIGlmIChvcHRpb25zLm1pbmltaXplKSB7XG4gICAgICByZXQgPSBtaW5pbWl6ZShyZXQpIHx8IHt9O1xuICAgIH1cbiAgfVxuXG4gIC8vIEluIHRoZSBjYXNlIHdoZXJlIGEgc3ViZG9jdW1lbnQgaGFzIGl0cyBvd24gdHJhbnNmb3JtIGZ1bmN0aW9uLCB3ZSBuZWVkIHRvXG4gIC8vIGNoZWNrIGFuZCBzZWUgaWYgdGhlIHBhcmVudCBoYXMgYSB0cmFuc2Zvcm0gKG9wdGlvbnMudHJhbnNmb3JtKSBhbmQgaWYgdGhlXG4gIC8vIGNoaWxkIHNjaGVtYSBoYXMgYSB0cmFuc2Zvcm0gKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIEluIHRoaXMgY2FzZSxcbiAgLy8gd2UgbmVlZCB0byBhZGp1c3Qgb3B0aW9ucy50cmFuc2Zvcm0gdG8gYmUgdGhlIGNoaWxkIHNjaGVtYSdzIHRyYW5zZm9ybSBhbmRcbiAgLy8gbm90IHRoZSBwYXJlbnQgc2NoZW1hJ3NcbiAgaWYgKHRydWUgPT09IG9wdGlvbnMudHJhbnNmb3JtIHx8XG4gICAgICAodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCAmJiBvcHRpb25zLnRyYW5zZm9ybSkpIHtcbiAgICB2YXIgb3B0cyA9IG9wdGlvbnMuanNvblxuICAgICAgPyB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgOiB0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuICAgIGlmIChvcHRzKSB7XG4gICAgICBvcHRpb25zLnRyYW5zZm9ybSA9IG9wdHMudHJhbnNmb3JtO1xuICAgIH1cbiAgfVxuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBvcHRpb25zLnRyYW5zZm9ybSkge1xuICAgIHZhciB4Zm9ybWVkID0gb3B0aW9ucy50cmFuc2Zvcm0odGhpcywgcmV0LCBvcHRpb25zKTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIHhmb3JtZWQpIHJldCA9IHhmb3JtZWQ7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyohXG4gKiBNaW5pbWl6ZXMgYW4gb2JqZWN0LCByZW1vdmluZyB1bmRlZmluZWQgdmFsdWVzIGFuZCBlbXB0eSBvYmplY3RzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCB0byBtaW5pbWl6ZVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5cbmZ1bmN0aW9uIG1pbmltaXplIChvYmopIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIGhhc0tleXNcbiAgICAsIGtleVxuICAgICwgdmFsO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHZhbCA9IG9ialtrZXldO1xuXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3QodmFsKSApIHtcbiAgICAgIG9ialtrZXldID0gbWluaW1pemUodmFsKTtcbiAgICB9XG5cbiAgICBpZiAodW5kZWZpbmVkID09PSBvYmpba2V5XSkge1xuICAgICAgZGVsZXRlIG9ialtrZXldO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaGFzS2V5cyA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gaGFzS2V5c1xuICAgID8gb2JqXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbi8qIVxuICogQXBwbGllcyB2aXJ0dWFscyBwcm9wZXJ0aWVzIHRvIGBqc29uYC5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0ganNvblxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgZWl0aGVyIGB2aXJ0dWFsc2Agb3IgYHBhdGhzYFxuICogQHJldHVybiB7T2JqZWN0fSBganNvbmBcbiAqL1xuXG5mdW5jdGlvbiBhcHBseUdldHRlcnMgKHNlbGYsIGpzb24sIHR5cGUsIG9wdGlvbnMpIHtcbiAgdmFyIHNjaGVtYSA9IHNlbGYuc2NoZW1hXG4gICAgLCBwYXRocyA9IE9iamVjdC5rZXlzKHNjaGVtYVt0eXBlXSlcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHBhdGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHBhdGggPSBwYXRoc1tpXTtcblxuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKVxuICAgICAgLCBwbGVuID0gcGFydHMubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBwbGVuIC0gMVxuICAgICAgLCBicmFuY2ggPSBqc29uXG4gICAgICAsIHBhcnQ7XG5cbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgcGxlbjsgKytpaSkge1xuICAgICAgcGFydCA9IHBhcnRzW2lpXTtcbiAgICAgIGlmIChpaSA9PT0gbGFzdCkge1xuICAgICAgICBicmFuY2hbcGFydF0gPSB1dGlscy5jbG9uZShzZWxmLmdldChwYXRoKSwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmFuY2ggPSBicmFuY2hbcGFydF0gfHwgKGJyYW5jaFtwYXJ0XSA9IHt9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ganNvbjtcbn1cblxuLyoqXG4gKiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgbWV0aG9kIGlzIHVzZWQgaW4gY2FsbHMgdG8gSlNPTi5zdHJpbmdpZnkoZG9jKS5cbiAqXG4gKiBUaGlzIG1ldGhvZCBhY2NlcHRzIHRoZSBzYW1lIG9wdGlvbnMgYXMgW0RvY3VtZW50I3RvT2JqZWN0XSgjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3QpLiBUbyBhcHBseSB0aGUgb3B0aW9ucyB0byBldmVyeSBkb2N1bWVudCBvZiB5b3VyIHNjaGVtYSBieSBkZWZhdWx0LCBzZXQgeW91ciBbc2NoZW1hc10oI3NjaGVtYV9TY2hlbWEpIGB0b0pTT05gIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9KU09OJywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIFNlZSBbc2NoZW1hIG9wdGlvbnNdKC9kb2NzL2d1aWRlLmh0bWwjdG9KU09OKSBmb3IgZGV0YWlscy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQHNlZSBEb2N1bWVudCN0b09iamVjdCAjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIC8vIGNoZWNrIGZvciBvYmplY3QgdHlwZSBzaW5jZSBhbiBhcnJheSBvZiBkb2N1bWVudHNcbiAgLy8gYmVpbmcgc3RyaW5naWZpZWQgcGFzc2VzIGFycmF5IGluZGV4ZXMgaW5zdGVhZFxuICAvLyBvZiBvcHRpb25zIG9iamVjdHMuIEpTT04uc3RyaW5naWZ5KFtkb2MsIGRvY10pXG4gIC8vIFRoZSBzZWNvbmQgY2hlY2sgaGVyZSBpcyB0byBtYWtlIHN1cmUgdGhhdCBwb3B1bGF0ZWQgZG9jdW1lbnRzIChvclxuICAvLyBzdWJkb2N1bWVudHMpIHVzZSB0aGVpciBvd24gb3B0aW9ucyBmb3IgYC50b0pTT04oKWAgaW5zdGVhZCBvZiB0aGVpclxuICAvLyBwYXJlbnQnc1xuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvcHRpb25zLmNvbnN0cnVjdG9yKSlcbiAgICAgIHx8ICgoIW9wdGlvbnMgfHwgb3B0aW9ucy5qc29uKSAmJiB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTikpIHtcblxuICAgIG9wdGlvbnMgPSB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgPyB1dGlscy5jbG9uZSh0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTilcbiAgICAgIDoge307XG4gIH1cbiAgb3B0aW9ucy5qc29uID0gdHJ1ZTtcblxuICByZXR1cm4gdGhpcy50b09iamVjdCggb3B0aW9ucyApO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIERvY3VtZW50IHN0b3JlcyB0aGUgc2FtZSBkYXRhIGFzIGRvYy5cbiAqXG4gKiBEb2N1bWVudHMgYXJlIGNvbnNpZGVyZWQgZXF1YWwgd2hlbiB0aGV5IGhhdmUgbWF0Y2hpbmcgYF9pZGBzLCB1bmxlc3MgbmVpdGhlclxuICogZG9jdW1lbnQgaGFzIGFuIGBfaWRgLCBpbiB3aGljaCBjYXNlIHRoaXMgZnVuY3Rpb24gZmFsbHMgYmFjayB0byB1c2luZ1xuICogYGRlZXBFcXVhbCgpYC5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgYSBkb2N1bWVudCB0byBjb21wYXJlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24oIGRvYyApe1xuICB2YXIgdGlkID0gdGhpcy5nZXQoJ19pZCcpO1xuICB2YXIgZG9jaWQgPSBkb2MuZ2V0KCdfaWQnKTtcbiAgaWYgKCF0aWQgJiYgIWRvY2lkKSB7XG4gICAgcmV0dXJuIGRlZXBFcXVhbCh0aGlzLCBkb2MpO1xuICB9XG4gIHJldHVybiB0aWQgJiYgdGlkLmVxdWFsc1xuICAgID8gKGRvY2lkID8gdGlkLmVxdWFscyhkb2NpZCkgOiBmYWxzZSlcbiAgICA6IHRpZCA9PT0gZG9jaWQ7XG59O1xuXG4vKipcbiAqIEdldHMgX2lkKHMpIHVzZWQgZHVyaW5nIHBvcHVsYXRpb24gb2YgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgTW9kZWwuZmluZE9uZSgpLnBvcHVsYXRlKCdhdXRob3InKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coZG9jLmF1dGhvci5uYW1lKSAgICAgICAgIC8vIERyLlNldXNzXG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MucG9wdWxhdGVkKCdhdXRob3InKSkgLy8gJzUxNDRjZjgwNTBmMDcxZDk3OWMxMThhNydcbiAqICAgICB9KVxuICpcbiAqIElmIHRoZSBwYXRoIHdhcyBub3QgcG9wdWxhdGVkLCB1bmRlZmluZWQgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fE9iamVjdElkfE51bWJlcnxCdWZmZXJ8U3RyaW5nfHVuZGVmaW5lZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5wb3B1bGF0ZWQgPSBmdW5jdGlvbiggcGF0aCwgdmFsLCBvcHRpb25zICl7XG4gIC8vIHZhbCBhbmQgb3B0aW9ucyBhcmUgaW50ZXJuYWxcblxuICAvL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0Y3RgtGDINC/0YDQvtCy0LXRgNC60YMsINC+0L3QsCDQtNC+0LvQttC90LAg0L7Qv9C40YDQsNGC0YzRgdGPINC90LUg0L3QsCAkX18ucG9wdWxhdGVkLCDQsCDQvdCwINGC0L4sINGH0YLQviDQvdCw0Ygg0L7QsdGK0LXQutGCINC40LzQtdC10YIg0YDQvtC00LjRgtC10LvRj1xuICAvLyDQuCDQv9C+0YLQvtC8INGD0LbQtSDQstGL0YHRgtCw0LLQu9GP0YLRjCDRgdCy0L7QudGB0YLQstC+IHBvcHVsYXRlZCA9PSB0cnVlXG4gIGlmIChudWxsID09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHZhciB2ID0gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICAgIGlmICh2KSByZXR1cm4gdi52YWx1ZTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gaW50ZXJuYWxcblxuICBpZiAodHJ1ZSA9PT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgfVxuXG4gIHRoaXMuJF9fLnBvcHVsYXRlZCB8fCAodGhpcy4kX18ucG9wdWxhdGVkID0ge30pO1xuICB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF0gPSB7IHZhbHVlOiB2YWwsIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgLy8gb3ZlcnJpZGRlbiBpbiBTdWJEb2N1bWVudHNcbiAgcmV0dXJuIHBhdGggfHwgJyc7XG59O1xuXG4vKipcbiAqINCj0LTQsNC70LjRgtGMINC00L7QutGD0LzQtdC90YIg0Lgg0LLQtdGA0L3Rg9GC0Ywg0LrQvtC70LvQtdC60YbQuNGOLlxuICpcbiAqIEBleGFtcGxlXG4gKiBkb2N1bWVudC5yZW1vdmUoKTtcbiAqXG4gKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCl7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoIHRoaXMgKTtcbiAgfVxuXG4gIHJldHVybiBkZWxldGUgdGhpcztcbn07XG5cblxuLyoqXG4gKiDQntGH0LjRidCw0LXRgiDQtNC+0LrRg9C80LXQvdGCICjQstGL0YHRgtCw0LLQu9GP0LXRgiDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOINC40LvQuCB1bmRlZmluZWQpXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBkb2MgPSB0aGlzXG4gICAgLCBzZWxmID0gdGhpc1xuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkgY29udGludWU7XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cbiAgICAgICwgcGF0aCA9IHAuc3BsaXQoJy4nKVxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxuICAgICAgLCBkb2NfID0gZG9jXG4gICAgICAsIGkgPSAwO1xuXG4gICAgZm9yICggOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cbiAgICAgICAgLCBkZWZhdWx0VmFsO1xuXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcblxuICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbCB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmRlZmF1bHQoIHAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbkRvY3VtZW50LlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogU3RvcmFnZUVycm9yIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIEVycm9yIG1lc3NhZ2VcbiAqIEBpbmhlcml0cyBFcnJvciBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvclxuICogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODM4MTgvaG93LWRvLWktY3JlYXRlLWEtY3VzdG9tLWVycm9yLWluLWphdmFzY3JpcHRcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUVycm9yICggbXNnICkge1xuICB0aGlzLm1lc3NhZ2UgPSBtc2c7XG4gIHRoaXMubmFtZSA9ICdTdG9yYWdlRXJyb3InO1xufVxuU3RvcmFnZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5cbi8qIVxuICogRm9ybWF0cyBlcnJvciBtZXNzYWdlc1xuICovXG5TdG9yYWdlRXJyb3IucHJvdG90eXBlLmZvcm1hdE1lc3NhZ2UgPSBmdW5jdGlvbiAobXNnLCBwYXRoLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIHRocm93IG5ldyBUeXBlRXJyb3IoJ21lc3NhZ2UgaXMgcmVxdWlyZWQnKTtcblxuICByZXR1cm4gbXNnLnJlcGxhY2UoL3tQQVRIfS8sIHBhdGgpXG4gICAgICAgICAgICAucmVwbGFjZSgve1ZBTFVFfS8sIFN0cmluZyh2YWx8fCcnKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VFlQRX0vLCB0eXBlIHx8ICdkZWNsYXJlZCB0eXBlJyk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VFcnJvcjtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBidWlsdC1pbiB2YWxpZGF0b3IgZXJyb3IgbWVzc2FnZXMuXG4gKlxuICogQHNlZSBFcnJvci5tZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlRXJyb3IubWVzc2FnZXMgPSByZXF1aXJlKCcuL2Vycm9yL21lc3NhZ2VzJyk7XG5cbi8qIVxuICogRXhwb3NlIHN1YmNsYXNzZXNcbiAqL1xuU3RvcmFnZUVycm9yLkNhc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvY2FzdCcpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdGlvbicpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0b3InKTtcbi8vdG9kbzpcbi8vU3RvcmFnZUVycm9yLk92ZXJ3cml0ZU1vZGVsRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL292ZXJ3cml0ZU1vZGVsJyk7XG5TdG9yYWdlRXJyb3IuTWlzc2luZ1NjaGVtYUVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9taXNzaW5nU2NoZW1hJyk7XG4vL1N0b3JhZ2VFcnJvci5EaXZlcmdlbnRBcnJheUVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9kaXZlcmdlbnRBcnJheScpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qKlxuICogQ2FzdGluZyBFcnJvciBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQGluaGVyaXRzIFN0b3JhZ2VFcnJvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gQ2FzdEVycm9yICh0eXBlLCB2YWx1ZSwgcGF0aCkge1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCAnQ2FzdCB0byAnICsgdHlwZSArICcgZmFpbGVkIGZvciB2YWx1ZSBcIicgKyB2YWx1ZSArICdcIiBhdCBwYXRoIFwiJyArIHBhdGggKyAnXCInKTtcbiAgdGhpcy5uYW1lID0gJ0Nhc3RFcnJvcic7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvci5cbiAqL1xuQ2FzdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcbkNhc3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYXN0RXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FzdEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy4gVGhlc2UgbWF5IGJlIGN1c3RvbWl6ZWQuXG4gKlxuICogICAgIC8vIGN1c3RvbWl6ZSB3aXRoaW4gZWFjaCBzY2hlbWEgb3IgZ2xvYmFsbHkgbGlrZSBzb1xuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgbW9uZ29vc2UuRXJyb3IubWVzc2FnZXMuU3RyaW5nLmVudW0gID0gXCJZb3VyIGN1c3RvbSBtZXNzYWdlIGZvciB7UEFUSH0uXCI7XG4gKlxuICogQXMgeW91IG1pZ2h0IGhhdmUgbm90aWNlZCwgZXJyb3IgbWVzc2FnZXMgc3VwcG9ydCBiYXNpYyB0ZW1wbGF0aW5nXG4gKlxuICogLSBge1BBVEh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIGRvY3VtZW50IHBhdGhcbiAqIC0gYHtWQUxVRX1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqIC0gYHtUWVBFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgdmFsaWRhdG9yIHR5cGUgc3VjaCBhcyBcInJlZ2V4cFwiLCBcIm1pblwiLCBvciBcInVzZXIgZGVmaW5lZFwiXG4gKiAtIGB7TUlOfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWluIHZhbHVlIGZvciB0aGUgTnVtYmVyLm1pbiB2YWxpZGF0b3JcbiAqIC0gYHtNQVh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtYXggdmFsdWUgZm9yIHRoZSBOdW1iZXIubWF4IHZhbGlkYXRvclxuICpcbiAqIENsaWNrIHRoZSBcInNob3cgY29kZVwiIGxpbmsgYmVsb3cgdG8gc2VlIGFsbCBkZWZhdWx0cy5cbiAqXG4gKiBAcHJvcGVydHkgbWVzc2FnZXNcbiAqIEByZWNlaXZlciBTdG9yYWdlRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIG1zZyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbm1zZy5nZW5lcmFsID0ge307XG5tc2cuZ2VuZXJhbC5kZWZhdWx0ID0gJ1ZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnO1xubXNnLmdlbmVyYWwucmVxdWlyZWQgPSAnUGF0aCBge1BBVEh9YCBpcyByZXF1aXJlZC4nO1xuXG5tc2cuTnVtYmVyID0ge307XG5tc2cuTnVtYmVyLm1pbiA9ICdQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBsZXNzIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlICh7TUlOfSkuJztcbm1zZy5OdW1iZXIubWF4ID0gJ1BhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIG1vcmUgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUgKHtNQVh9KS4nO1xuXG5tc2cuU3RyaW5nID0ge307XG5tc2cuU3RyaW5nLmVudW0gPSAnYHtWQUxVRX1gIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHtQQVRIfWAuJztcbm1zZy5TdHJpbmcubWF0Y2ggPSAnUGF0aCBge1BBVEh9YCBpcyBpbnZhbGlkICh7VkFMVUV9KS4nO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyohXG4gKiBNaXNzaW5nU2NoZW1hIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBNaXNzaW5nU2NoZW1hRXJyb3IoKXtcbiAgdmFyIG1zZyA9ICdTY2hlbWEgaGFzblxcJ3QgYmVlbiByZWdpc3RlcmVkIGZvciBkb2N1bWVudC5cXG4nXG4gICAgKyAnVXNlIHN0b3JhZ2UuRG9jdW1lbnQoZGF0YSwgc2NoZW1hKSc7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1zZyk7XG5cbiAgdGhpcy5uYW1lID0gJ01pc3NpbmdTY2hlbWFFcnJvcic7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlRXJyb3IuXG4gKi9cblxuTWlzc2luZ1NjaGVtYUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3RvcmFnZUVycm9yLnByb3RvdHlwZSk7XG5NaXNzaW5nU2NoZW1hRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RvcmFnZUVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pc3NpbmdTY2hlbWFFcnJvcjsiLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50c1xuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIERvY3VtZW50IFZhbGlkYXRpb24gRXJyb3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGluc3RhbmNlXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yIChpbnN0YW5jZSkge1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCAnVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG4gIHRoaXMuZXJyb3JzID0gaW5zdGFuY2UuZXJyb3JzID0ge307XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlRXJyb3IuXG4gKi9cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlRXJyb3IucHJvdG90eXBlICk7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0aW9uRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcbnZhciBlcnJvck1lc3NhZ2VzID0gU3RvcmFnZUVycm9yLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFNjaGVtYSB2YWxpZGF0b3IgZXJyb3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZ1xuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnwqfSB2YWxcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFZhbGlkYXRvckVycm9yIChwYXRoLCBtc2csIHR5cGUsIHZhbCkge1xuICBpZiAoICFtc2cgKSB7XG4gICAgbXNnID0gZXJyb3JNZXNzYWdlcy5nZW5lcmFsLmRlZmF1bHQ7XG4gIH1cblxuICB2YXIgbWVzc2FnZSA9IHRoaXMuZm9ybWF0TWVzc2FnZShtc2csIHBhdGgsIHR5cGUsIHZhbCk7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0b3JFcnJvcic7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMudmFsdWUgPSB2YWw7XG59XG5cbi8qIVxuICogdG9TdHJpbmcgaGVscGVyXG4gKi9cblxuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tZXNzYWdlO1xufTtcblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvclxuICovXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlRXJyb3IucHJvdG90eXBlICk7XG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0b3JFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKlxuICogQmFja2JvbmUuRXZlbnRzXG5cbiAqIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcbiAqIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcbiAqIGZ1bmN0aW9ucyB0byBhbiBldmVudDsgYHRyaWdnZXJgLWluZyBhbiBldmVudCBmaXJlcyBhbGwgY2FsbGJhY2tzIGluXG4gKiBzdWNjZXNzaW9uLlxuICpcbiAqIHZhciBvYmplY3QgPSB7fTtcbiAqIF8uZXh0ZW5kKG9iamVjdCwgRXZlbnRzLnByb3RvdHlwZSk7XG4gKiBvYmplY3Qub24oJ2V4cGFuZCcsIGZ1bmN0aW9uKCl7IGFsZXJ0KCdleHBhbmRlZCcpOyB9KTtcbiAqIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbiAqL1xuZnVuY3Rpb24gRXZlbnRzKCkge31cblxuRXZlbnRzLnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqIEJpbmQgYW4gZXZlbnQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLiBQYXNzaW5nIGBcImFsbFwiYCB3aWxsIGJpbmRcbiAgICogdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gY29udGV4dFxuICAgKiBAcmV0dXJucyB7RXZlbnRzfVxuICAgKi9cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogQmluZCBhbiBldmVudCB0byBvbmx5IGJlIHRyaWdnZXJlZCBhIHNpbmdsZSB0aW1lLiBBZnRlciB0aGUgZmlyc3QgdGltZVxuICAgKiB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICAgKlxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIGNvbnRleHRcbiAgICogQHJldHVybnMge0V2ZW50c31cbiAgICovXG4gIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYub2ZmKG5hbWUsIG9uY2UpO1xuICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9KTtcbiAgICBvbmNlLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHJldHVybiB0aGlzLm9uKG5hbWUsIG9uY2UsIGNvbnRleHQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICogY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgKiBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gICAqIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgICpcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBjb250ZXh0XG4gICAqIEByZXR1cm5zIHtFdmVudHN9XG4gICAqL1xuICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIWV2ZW50c0FwaSh0aGlzLCAnb2ZmJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkpIHJldHVybiB0aGlzO1xuICAgIGlmICghbmFtZSAmJiAhY2FsbGJhY2sgJiYgIWNvbnRleHQpIHtcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIG5hbWVzID0gbmFtZSA/IFtuYW1lXSA6IF8ua2V5cyh0aGlzLl9ldmVudHMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gcmV0YWluID0gW107XG4gICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGV2ID0gZXZlbnRzW2pdO1xuICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gZXYuY29udGV4dCkpIHtcbiAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAgKiBwYXNzZWQgdGhlIHNhbWUgYXJndW1lbnRzIGFzIGB0cmlnZ2VyYCBpcywgYXBhcnQgZnJvbSB0aGUgZXZlbnQgbmFtZVxuICAgKiAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgICogcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICAgKlxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcmV0dXJucyB7RXZlbnRzfVxuICAgKi9cbiAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgaWYgKGFsbEV2ZW50cykgdHJpZ2dlckV2ZW50cyhhbGxFdmVudHMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgICogdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgICpcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHJldHVybnMge0V2ZW50c31cbiAgICovXG4gIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbztcbiAgICBpZiAoIWxpc3RlbmluZ1RvKSByZXR1cm4gdGhpcztcbiAgICB2YXIgcmVtb3ZlID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgaWYgKG9iaikgKGxpc3RlbmluZ1RvID0ge30pW29iai5fbGlzdGVuSWRdID0gb2JqO1xuICAgIGZvciAodmFyIGlkIGluIGxpc3RlbmluZ1RvKSB7XG4gICAgICBvYmogPSBsaXN0ZW5pbmdUb1tpZF07XG4gICAgICBvYmoub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIGlmIChyZW1vdmUgfHwgXy5pc0VtcHR5KG9iai5fZXZlbnRzKSkgZGVsZXRlIHRoaXMuX2xpc3RlbmluZ1RvW2lkXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxuLyoqXG4gKiBJbXBsZW1lbnQgZmFuY3kgZmVhdHVyZXMgb2YgdGhlIEV2ZW50cyBBUEkgc3VjaCBhcyBtdWx0aXBsZSBldmVudFxuICogbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuICogaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcGFyYW0gYWN0aW9uXG4gKiBAcGFyYW0gbmFtZVxuICogQHBhcmFtIHJlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG52YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cbiAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtrZXksIG5hbWVba2V5XV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3JcbiAqIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbiAqIEJhY2tib25lIGV2ZW50cyBoYXZlIDMgYXJndW1lbnRzKS5cbiAqXG4gKiBAcGFyYW0gZXZlbnRzXG4gKiBAcGFyYW0gYXJnc1xuICovXG52YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICB2YXIgZXYsIGkgPSAtMSwgbCA9IGV2ZW50cy5sZW5ndGgsIGExID0gYXJnc1swXSwgYTIgPSBhcmdzWzFdLCBhMyA9IGFyZ3NbMl07XG4gIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgIGNhc2UgMTogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExKTsgcmV0dXJuO1xuICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgIGRlZmF1bHQ6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmFwcGx5KGV2LmN0eCwgYXJncyk7XG4gIH1cbn07XG5cbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4vLyBsaXN0ZW5pbmcgdG8uXG5fLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSB7fSk7XG4gICAgdmFyIGlkID0gb2JqLl9saXN0ZW5JZCB8fCAob2JqLl9saXN0ZW5JZCA9IF8udW5pcXVlSWQoJ2wnKSk7XG4gICAgbGlzdGVuaW5nVG9baWRdID0gb2JqO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG4iLCIoZnVuY3Rpb24gKEJ1ZmZlcil7XG4ndXNlIHN0cmljdCc7XG5cbi8qIVxuICogU3RvcmFnZSBkb2N1bWVudHMgdXNpbmcgc2NoZW1hXG4gKiBpbnNwaXJlZCBieSBtb25nb29zZSAzLjguNCAoZml4ZWQgYnVncyBmb3IgMy44LjE5KVxuICpcbiAqIFN0b3JhZ2UgaW1wbGVtZW50YXRpb25cbiAqIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI3NlbGVjdG9yc1xuICogaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvdHJlZS9tYXN0ZXIvcGFja2FnZXMvbWluaW1vbmdvXG4gKlxuICog0L/RgNC+0YHQu9C10LTQuNGC0Ywg0LfQsCDQsdCw0LPQvtC8IGdoLTE2MzggKDMuOC4xNilcbiAqL1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cbnZhciBDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9jb2xsZWN0aW9uJylcbiAgLCBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4vc2NoZW1hdHlwZScpXG4gICwgVmlydHVhbFR5cGUgPSByZXF1aXJlKCcuL3ZpcnR1YWx0eXBlJylcbiAgLCBUeXBlcyA9IHJlcXVpcmUoJy4vdHlwZXMnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBwa2cgPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBjb2xsZWN0aW9uIGFuZCBnZXQgaXRcbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0gY29sbGVjdGlvbiBuYW1lXG4gKiBAcGFyYW0ge3N0b3JhZ2UuU2NoZW1hfHVuZGVmaW5lZH0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gW2FwaV0gLSDRgdGB0YvQu9C60LAg0L3QsCDQsNC/0Lgg0YDQtdGB0YPRgNGBXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbnx1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gZnVuY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICl7XG4gIGlmICggdGhpc1sgbmFtZSBdICl7XG4gICAgY29uc29sZS5pbmZvKCdzdG9yYWdlOjpjb2xsZWN0aW9uOiBgJyArIG5hbWUgKyAnYCBhbHJlYWR5IGV4aXN0Jyk7XG4gICAgcmV0dXJuIHRoaXNbIG5hbWUgXTtcbiAgfVxuXG4gIGlmICggbmFtZSA9PSBudWxsICl7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignc3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEgKSAtIGBuYW1lYCBtdXN0IGJlIGV4aXN0LCBgc2NoZW1hYCBtdXN0IGJlIFNjaGVtYSBpbnN0YW5jZScpO1xuICB9XG5cbiAgaWYgKCBzY2hlbWEgPT0gbnVsbCB8fCAnU2NoZW1hJyAhPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBzY2hlbWEuY29uc3RydWN0b3IgKSApe1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbiggbmFtZSwgc2NoZW1hICkgLSBgc2NoZW1hYCBtdXN0IGJlIFNjaGVtYSBpbnN0YW5jZScpO1xuICB9XG5cbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMucHVzaCggbmFtZSApO1xuXG4gIHRoaXNbIG5hbWUgXSA9IG5ldyBDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApO1xuXG4gIHJldHVybiB0aGlzWyBuYW1lIF07XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBjcmVhdGVDb2xsZWN0aW9uXG4gKlxuICogQHNlZSBTdG9yYWdlLmNyZWF0ZUNvbGxlY3Rpb24gI2luZGV4X1N0b3JhZ2UtY3JlYXRlQ29sbGVjdGlvblxuICogQG1ldGhvZCBjcmVhdGVDb2xsZWN0aW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS5hZGRDb2xsZWN0aW9uID0gU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbjtcblxuLyoqXG4gKiBUbyBvYnRhaW4gdGhlIG5hbWVzIG9mIHRoZSBjb2xsZWN0aW9ucyBpbiBhbiBhcnJheVxuICpcbiAqIEByZXR1cm5zIHtBcnJheS48c3RyaW5nPn0gQW4gYXJyYXkgY29udGFpbmluZyBhbGwgY29sbGVjdGlvbnMgaW4gdGhlIHN0b3JhZ2UuXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLmdldENvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lcztcbn07XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuQ29sbGVjdGlvbiA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgdmVyc2lvblxuICpcbiAqIEBwcm9wZXJ0eSB2ZXJzaW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS52ZXJzaW9uID0gcGtnLnZlcnNpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgY29uc3RydWN0b3JcbiAqXG4gKiBUaGUgZXhwb3J0cyBvZiB0aGUgc3RvcmFnZSBtb2R1bGUgaXMgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHN0b3JhZ2UyID0gbmV3IHN0b3JhZ2UuU3RvcmFnZSgpO1xuICpcbiAqIEBtZXRob2QgU3RvcmFnZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuU3RvcmFnZSA9IFN0b3JhZ2U7XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYV0oI3NjaGVtYV9TY2hlbWEpIGNvbnN0cnVjdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBTY2hlbWEgPSBzdG9yYWdlLlNjaGVtYTtcbiAqICAgICB2YXIgQ2F0U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogQG1ldGhvZCBTY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYSA9IFNjaGVtYTtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGUgPSBTY2hlbWFUeXBlO1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIFN0b3JhZ2UgU2NoZW1hVHlwZXMuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX0FsaWFzIG9mIHN0b3JhZ2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXG4gKlxuICogQHByb3BlcnR5IFNjaGVtYVR5cGVzXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1ZpcnR1YWxUeXBlXSgjdmlydHVhbHR5cGVfVmlydHVhbFR5cGUpIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBWaXJ0dWFsVHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuVmlydHVhbFR5cGUgPSBWaXJ0dWFsVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBTdG9yYWdlIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgYXJyYXkgPSBzdG9yYWdlLlR5cGVzLkFycmF5O1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtPYmplY3RJZF0oI3R5cGVzLW9iamVjdGlkLWpzKVxuICogLSBbQnVmZmVyXSgjdHlwZXMtYnVmZmVyLWpzKVxuICogLSBbU3ViRG9jdW1lbnRdKCN0eXBlcy1lbWJlZGRlZC1qcylcbiAqIC0gW0FycmF5XSgjdHlwZXMtYXJyYXktanMpXG4gKiAtIFtEb2N1bWVudEFycmF5XSgjdHlwZXMtZG9jdW1lbnRhcnJheS1qcylcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgT2JqZWN0SWRgIHR5cGUsIHdlIGNhbiBjb25zdHJ1Y3QgaWRzIG9uIGRlbWFuZC5cbiAqXG4gKiAgICAgdmFyIE9iamVjdElkID0gc3RvcmFnZS5UeXBlcy5PYmplY3RJZDtcbiAqICAgICB2YXIgaWQxID0gbmV3IE9iamVjdElkO1xuICpcbiAqIEBwcm9wZXJ0eSBUeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuVHlwZXMgPSBUeXBlcztcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbRG9jdW1lbnRdKCNkb2N1bWVudC1qcykgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBEb2N1bWVudFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuRG9jdW1lbnQgPSBEb2N1bWVudDtcblxuLyoqXG4gKiBUaGUgW1N0b3JhZ2VFcnJvcl0oI2Vycm9yX1N0b3JhZ2VFcnJvcikgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxuU3RvcmFnZS5wcm90b3R5cGUuRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkJyk7XG5TdG9yYWdlLnByb3RvdHlwZS5ldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xuU3RvcmFnZS5wcm90b3R5cGUuU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcblN0b3JhZ2UucHJvdG90eXBlLnV0aWxzID0gdXRpbHM7XG5TdG9yYWdlLnByb3RvdHlwZS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuU3RvcmFnZS5wcm90b3R5cGUuc2NoZW1hcyA9IFNjaGVtYS5zY2hlbWFzO1xuXG5TdG9yYWdlLnByb3RvdHlwZS5zZXRBZGFwdGVyID0gZnVuY3Rpb24oIGFkYXB0ZXJIb29rcyApe1xuICBEb2N1bWVudC5wcm90b3R5cGUuYWRhcHRlckhvb2tzID0gYWRhcHRlckhvb2tzO1xufTtcblxuXG4vKiFcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBTdG9yYWdlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gbmV3IFN0b3JhZ2UoKTtcblxud2luZG93LkJ1ZmZlciA9IEJ1ZmZlcjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIid1c2Ugc3RyaWN0JztcblxuLy8g0JzQsNGI0LjQvdCwINGB0L7RgdGC0L7Rj9C90LjQuSDQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINC/0L7QvNC10YLQutC4LCDQsiDQutCw0LrQvtC8INGB0L7RgdGC0L7Rj9C90LjQuCDQvdCw0YXQvtC00Y/RgtGB0Y8g0L/QvtC70LVcbi8vINCd0LDQv9GA0LjQvNC10YA6INC10YHQu9C4INC/0L7Qu9C1INC40LzQtdC10YIg0YHQvtGB0YLQvtGP0L3QuNC1IGRlZmF1bHQgLSDQt9C90LDRh9C40YIg0LXQs9C+INC30L3QsNGH0LXQvdC40LXQvCDRj9Cy0LvRj9C10YLRgdGPINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y5cbi8vINCf0YDQuNC80LXRh9Cw0L3QuNC1OiDQtNC70Y8g0LzQsNGB0YHQuNCy0L7QsiDQsiDQvtCx0YnQtdC8INGB0LvRg9GH0LDQtSDRjdGC0L4g0L7Qt9C90LDRh9Cw0LXRgiDQv9GD0YHRgtC+0Lkg0LzQsNGB0YHQuNCyXG5cbi8qIVxuICogRGVwZW5kZW5jaWVzXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5cbnZhciBBY3RpdmVSb3N0ZXIgPSBTdGF0ZU1hY2hpbmUuY3RvcigncmVxdWlyZScsICdtb2RpZnknLCAnaW5pdCcsICdkZWZhdWx0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJuYWxDYWNoZTtcblxuZnVuY3Rpb24gSW50ZXJuYWxDYWNoZSAoKSB7XG4gIHRoaXMuc3RyaWN0TW9kZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zYXZlRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmFkaG9jUGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMucmVtb3ZpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMuaW5zZXJ0aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLnZlcnNpb24gPSB1bmRlZmluZWQ7XG4gIHRoaXMuZ2V0dGVycyA9IHt9O1xuICB0aGlzLl9pZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5wb3B1bGF0ZSA9IHVuZGVmaW5lZDsgLy8gd2hhdCB3ZSB3YW50IHRvIHBvcHVsYXRlIGluIHRoaXMgZG9jXG4gIHRoaXMucG9wdWxhdGVkID0gdW5kZWZpbmVkOy8vIHRoZSBfaWRzIHRoYXQgaGF2ZSBiZWVuIHBvcHVsYXRlZFxuICB0aGlzLndhc1BvcHVsYXRlZCA9IGZhbHNlOyAvLyBpZiB0aGlzIGRvYyB3YXMgdGhlIHJlc3VsdCBvZiBhIHBvcHVsYXRpb25cbiAgdGhpcy5zY29wZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hY3RpdmVQYXRocyA9IG5ldyBBY3RpdmVSb3N0ZXIoKTtcblxuICAvLyBlbWJlZGRlZCBkb2NzXG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5mdWxsUGF0aCA9IHVuZGVmaW5lZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBvYmplY3QgYG9gIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBvYmogPSB7XG4gKiAgICAgICAgIGNvbW1lbnRzOiBbXG4gKiAgICAgICAgICAgICB7IHRpdGxlOiAnZXhjaXRpbmchJywgX2RvYzogeyB0aXRsZTogJ2dyZWF0IScgfX1cbiAqICAgICAgICAgICAsIHsgdGl0bGU6ICdudW1iZXIgZG9zJyB9XG4gKiAgICAgICAgIF1cbiAqICAgICB9XG4gKlxuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8pICAgICAgICAgLy8gJ2V4Y2l0aW5nISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvLCAnX2RvYycpIC8vICdncmVhdCEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy50aXRsZScsIG8pICAgICAgICAgICAvLyBbJ2V4Y2l0aW5nIScsICdudW1iZXIgZG9zJ11cbiAqXG4gKiAgICAgLy8gc3VtbWFyeVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBtYXApXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwsIG1hcClcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCByZWNlaXZlcyBlYWNoIGluZGl2aWR1YWwgZm91bmQgdmFsdWUuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuZXhwb3J0cy5nZXQgPSBmdW5jdGlvbiAocGF0aCwgbywgc3BlY2lhbCwgbWFwKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIHZhciBvYmogPSBvXG4gICAgLCBwYXJ0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgICAvLyByZWFkaW5nIGEgcHJvcGVydHkgZnJvbSB0aGUgYXJyYXkgaXRlbXNcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuXG4gICAgICByZXR1cm4gb2JqLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbVxuICAgICAgICAgID8gZXhwb3J0cy5nZXQocGF0aHMsIGl0ZW0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXApXG4gICAgICAgICAgOiBtYXAodW5kZWZpbmVkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChsb29rdXApIHtcbiAgICAgIG9iaiA9IGxvb2t1cChvYmosIHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmogPSBzcGVjaWFsICYmIG9ialtzcGVjaWFsXVxuICAgICAgICA/IG9ialtzcGVjaWFsXVtwYXJ0XVxuICAgICAgICA6IG9ialtwYXJ0XTtcbiAgICB9XG5cbiAgICBpZiAoIW9iaikgcmV0dXJuIG1hcChvYmopO1xuICB9XG5cbiAgcmV0dXJuIG1hcChvYmopO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBgdmFsYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgIG9mIG9iamVjdCBgb2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIGlzIHBhc3NlZCBlYWNoIGluZGl2aWR1YWwgdmFsdWUgYmVmb3JlIHNldHRpbmcgaXQuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuZXhwb3J0cy5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvLCBzcGVjaWFsLCBtYXAsIF9jb3B5aW5nKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIGlmIChudWxsID09IG8pIHJldHVybjtcblxuICAvLyB0aGUgZXhpc3RhbmNlIG9mICQgaW4gYSBwYXRoIHRlbGxzIHVzIGlmIHRoZSB1c2VyIGRlc2lyZXNcbiAgLy8gdGhlIGNvcHlpbmcgb2YgYW4gYXJyYXkgaW5zdGVhZCBvZiBzZXR0aW5nIGVhY2ggdmFsdWUgb2ZcbiAgLy8gdGhlIGFycmF5IHRvIHRoZSBvbmUgYnkgb25lIHRvIG1hdGNoaW5nIHBvc2l0aW9ucyBvZiB0aGVcbiAgLy8gY3VycmVudCBhcnJheS5cbiAgdmFyIGNvcHkgPSBfY29weWluZyB8fCAvXFwkLy50ZXN0KHBhdGgpXG4gICAgLCBvYmogPSBvXG4gICAgLCBwYXJ0O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXJ0cy5sZW5ndGggLSAxOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoJyQnID09PSBwYXJ0KSB7XG4gICAgICBpZiAoaSA9PSBsZW4gLSAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG4gICAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aCAmJiBqIDwgdmFsLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBzaW5nbGUgdmFsdWVzIG9mIGFycmF5XG4gICAgICAgICAgZXhwb3J0cy5zZXQocGF0aHMsIHZhbFtqXSwgb2JqW2pdLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwLCBjb3B5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBhc3NpZ25tZW50IG9mIGVudGlyZSB2YWx1ZVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWwsIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybjtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgdGhlIGxhc3QgcHJvcGVydHkgb2YgdGhlIHBhdGhcblxuICBwYXJ0ID0gcGFydHNbbGVuXTtcblxuICAvLyB1c2UgdGhlIHNwZWNpYWwgcHJvcGVydHkgaWYgZXhpc3RzXG4gIGlmIChzcGVjaWFsICYmIG9ialtzcGVjaWFsXSkge1xuICAgIG9iaiA9IG9ialtzcGVjaWFsXTtcbiAgfVxuXG4gIC8vIHNldCB0aGUgdmFsdWUgb24gdGhlIGxhc3QgYnJhbmNoXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBmb3IgKHZhciBpdGVtLCBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICBpdGVtID0gb2JqW2pdO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGlmIChsb29rdXApIHtcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsW2pdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpdGVtW3NwZWNpYWxdKSBpdGVtID0gaXRlbVtzcGVjaWFsXTtcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsW2pdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChsb29rdXApIHtcbiAgICAgIGxvb2t1cChvYmosIHBhcnQsIG1hcCh2YWwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIFJldHVybnMgdGhlIHZhbHVlIHBhc3NlZCB0byBpdC5cbiAqL1xuZnVuY3Rpb24gSyAodikge1xuICByZXR1cm4gdjtcbn0iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBUeXBlc1xuICAsIHNjaGVtYXM7XG5cbi8qKlxuICogU2NoZW1hIGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgY2hpbGQgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nLCBhZ2U6IE51bWJlciwgY2hpbGRyZW46IFtjaGlsZF0gfSk7XG4gKiAgICAgdmFyIFRyZWUgPSBtb25nb29zZS5tb2RlbCgnVHJlZScsIHNjaGVtYSk7XG4gKlxuICogICAgIC8vIHNldHRpbmcgc2NoZW1hIG9wdGlvbnNcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgX2lkOiBmYWxzZSwgYXV0b0luZGV4OiBmYWxzZSB9KVxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gW2lkXSgvZG9jcy9ndWlkZS5odG1sI2lkKTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gYG1pbmltaXplYDogYm9vbCAtIGNvbnRyb2xzIFtkb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KSBiZWhhdmlvciB3aGVuIGNhbGxlZCBtYW51YWxseSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3N0cmljdF0oL2RvY3MvZ3VpZGUuaHRtbCNzdHJpY3QpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbdG9KU09OXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt0b09iamVjdF0oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt2ZXJzaW9uS2V5XSgvZG9jcy9ndWlkZS5odG1sI3ZlcnNpb25LZXkpOiBib29sIC0gZGVmYXVsdHMgdG8gXCJfX3ZcIlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9XaGVuIG5lc3Rpbmcgc2NoZW1hcywgKGBjaGlsZHJlbmAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLCBhbHdheXMgZGVjbGFyZSB0aGUgY2hpbGQgc2NoZW1hIGZpcnN0IGJlZm9yZSBwYXNzaW5nIGl0IGludG8gaXMgcGFyZW50Ll9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3x1bmRlZmluZWR9IFtuYW1lXSDQndCw0LfQstCw0L3QuNC1INGB0YXQtdC80YtcbiAqIEBwYXJhbSB7U2NoZW1hfSBbYmFzZVNjaGVtYV0g0JHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCDQv9GA0Lgg0L3QsNGB0LvQtdC00L7QstCw0L3QuNC4XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqINCh0YXQtdC80LBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYSAoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApIHtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBTY2hlbWEpICkge1xuICAgIHJldHVybiBuZXcgU2NoZW1hKCBuYW1lLCBiYXNlU2NoZW1hLCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIC8vINCV0YHQu9C4INGN0YLQviDQuNC80LXQvdC+0LLQsNC90LDRjyDRgdGF0LXQvNCwXG4gIGlmICggdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnICl7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICBzY2hlbWFzWyBuYW1lIF0gPSB0aGlzO1xuICB9IGVsc2Uge1xuICAgIG9wdGlvbnMgPSBvYmo7XG4gICAgb2JqID0gYmFzZVNjaGVtYTtcbiAgICBiYXNlU2NoZW1hID0gbmFtZTtcbiAgICBuYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCAhKGJhc2VTY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpICl7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvL3RvZG86INC30LDRh9C10Lwg0L7QvdC+INC90YPQttC90L4/INC/0YDQvtCx0LvQtdC80LA6IG9iaiDRgdGC0LDQvdC+0LLQuNGC0YHRjyDQutCw0Log0YMg0L/RgNC+0YjQu9C+0Lkg0YHRhdC10LzRiyArINGC0LXQutGD0YnQtdC1LCDQuNC3LdC30LAg0Y3RgtC+0LPQviBzb3VyY2UsXG4gIC8vINC/0L7RgtC+0LzRgyDRh9GC0L4g0L7QvdC+INC60L7Qv9C40YDRg9C10YLRgdGPINC40Lcg0YHRgtCw0YDQvtC5INGB0YXQtdC80Ysg0LIg0YLQtdC60YPRidC40Lkgc291cmNlLCDQsCDRgtCw0Log0LrQsNC6INC+0L0g0YHRgdGL0LvQsNC10YLRgdGPINC90LAgb2JqLFxuICAvLyDQuCDQsiBqcyDRgyDQvdCw0YEg0YDQsNC30LTQtdC70LXQvdC40LUg0L/QsNC80Y/RgtC4LCDRgtC+IG9iaiDRgNCw0YHRiNC40YDRj9C10YLRgdGPINC/0L7Qu9GP0LzQuCBzb3VyY2Ug0LjQtyDRgdGC0LDRgNC+0Lkg0YHRhdC10LzRiy5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDQvtC/0LjRgdCw0L3QuNC1INGB0YXQtdC80Ysg0LTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDQtNC40YHQutGA0LjQvNC40L3QsNGC0L7RgNC+0LJcbiAgLy90aGlzLnNvdXJjZSA9IG9iajtcblxuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3VicGF0aHMgPSB7fTtcbiAgdGhpcy52aXJ0dWFscyA9IHt9O1xuICB0aGlzLm5lc3RlZCA9IHt9O1xuICB0aGlzLmluaGVyaXRzID0ge307XG4gIHRoaXMuY2FsbFF1ZXVlID0gW107XG4gIHRoaXMubWV0aG9kcyA9IHt9O1xuICB0aGlzLnN0YXRpY3MgPSB7fTtcbiAgdGhpcy50cmVlID0ge307XG4gIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB1bmRlZmluZWQ7XG5cbiAgdGhpcy5vcHRpb25zID0gdGhpcy5kZWZhdWx0T3B0aW9ucyggb3B0aW9ucyApO1xuXG4gIGlmICggYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIGJhc2VTY2hlbWEuZGlzY3JpbWluYXRvciggbmFtZSwgdGhpcyApO1xuICB9XG5cbiAgLy8gYnVpbGQgcGF0aHNcbiAgaWYgKCBvYmogKSB7XG4gICAgdGhpcy5hZGQoIG9iaiApO1xuICB9XG5cbiAgLy8gY2hlY2sgaWYgX2lkJ3MgdmFsdWUgaXMgYSBzdWJkb2N1bWVudCAobS1naC0yMjc2KVxuICB2YXIgX2lkU3ViRG9jID0gb2JqICYmIG9iai5faWQgJiYgXy5pc09iamVjdCggb2JqLl9pZCApO1xuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIGdldCBhbiBhdXRvIF9pZCB1bmxlc3MgZGlzYWJsZWRcbiAgdmFyIGF1dG9faWQgPSAhdGhpcy5wYXRoc1snX2lkJ10gJiYgKCF0aGlzLm9wdGlvbnMubm9JZCAmJiB0aGlzLm9wdGlvbnMuX2lkKSAmJiAhX2lkU3ViRG9jO1xuXG4gIGlmIChhdXRvX2lkKSB7XG4gICAgdGhpcy5hZGQoeyBfaWQ6IHt0eXBlOiBTY2hlbWEuT2JqZWN0SWQsIGF1dG86IHRydWV9IH0pO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgcmVjZWl2ZSBhbiBpZCBnZXR0ZXIgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvaWQgPSAhdGhpcy5wYXRoc1snaWQnXSAmJiB0aGlzLm9wdGlvbnMuaWQ7XG4gIGlmICggYXV0b2lkICkge1xuICAgIHRoaXMudmlydHVhbCgnaWQnKS5nZXQoIGlkR2V0dGVyICk7XG4gIH1cbn1cblxuLyohXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIF9pZCBjYXN0IHRvIGEgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBpZEdldHRlciAoKSB7XG4gIGlmICh0aGlzLiRfXy5faWQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18uX2lkO1xuICB9XG5cbiAgdGhpcy4kX18uX2lkID0gbnVsbCA9PSB0aGlzLl9pZFxuICAgID8gbnVsbFxuICAgIDogU3RyaW5nKHRoaXMuX2lkKTtcblxuICByZXR1cm4gdGhpcy4kX18uX2lkO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBmbGF0IHBhdGhzXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgICAgOiBTY2hlbWFUeXBlLFxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSBwYXRoc1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBhIHRyZWVcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICA6IE9iamVjdElkXG4gKiAgICAgICAsICduZXN0ZWQnICA6IHtcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgdHJlZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnRyZWU7XG5cbi8qKlxuICogUmV0dXJucyBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoaXMgc2NoZW1hLCBtZXJnZWQgd2l0aCBgb3B0aW9uc2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLmRlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IF8uYXNzaWduKHtcbiAgICAgIHN0cmljdDogdHJ1ZVxuICAgICwgdmVyc2lvbktleTogJ19fdidcbiAgICAsIGRpc2NyaW1pbmF0b3JLZXk6ICdfX3QnXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIG9ubHkgYXBwbGllZCBhdCBjb25zdHJ1Y3Rpb24gdGltZVxuICAgICwgX2lkOiB0cnVlXG4gICAgLCBpZDogdHJ1ZVxuICB9LCBvcHRpb25zICk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZHMga2V5IHBhdGggLyBzY2hlbWEgdHlwZSBwYWlycyB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIFRveVNjaGVtYSA9IG5ldyBTY2hlbWE7XG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKG51bGwgPT0gb2JqWyBrZXkgXSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB2YWx1ZSBmb3Igc2NoZW1hIHBhdGggYCcrIHByZWZpeCArIGtleSArJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdChvYmpba2V5XSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICYmICggIW9ialsga2V5IF0udHlwZSB8fCBvYmpbIGtleSBdLnR5cGUudHlwZSApICl7XG5cbiAgICAgIGlmICggT2JqZWN0LmtleXMob2JqWyBrZXkgXSkubGVuZ3RoICkge1xuICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0IHsgbGFzdDogeyBuYW1lOiBTdHJpbmcgfX1cbiAgICAgICAgdGhpcy5uZXN0ZWRbIHByZWZpeCArIGtleSBdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hZGQoIG9ialsga2V5IF0sIHByZWZpeCArIGtleSArICcuJyk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7IC8vIG1peGVkIHR5cGVcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBSZXNlcnZlZCBkb2N1bWVudCBrZXlzLlxuICpcbiAqIEtleXMgaW4gdGhpcyBvYmplY3QgYXJlIG5hbWVzIHRoYXQgYXJlIHJlamVjdGVkIGluIHNjaGVtYSBkZWNsYXJhdGlvbnMgYi9jIHRoZXkgY29uZmxpY3Qgd2l0aCBtb25nb29zZSBmdW5jdGlvbmFsaXR5LiBVc2luZyB0aGVzZSBrZXkgbmFtZSB3aWxsIHRocm93IGFuIGVycm9yLlxuICpcbiAqICAgICAgb24sIGVtaXQsIF9ldmVudHMsIGRiLCBnZXQsIHNldCwgaW5pdCwgaXNOZXcsIGVycm9ycywgc2NoZW1hLCBvcHRpb25zLCBfcHJlcywgX3Bvc3RzLCB0b09iamVjdFxuICpcbiAqIF9OT1RFOl8gVXNlIG9mIHRoZXNlIHRlcm1zIGFzIG1ldGhvZCBuYW1lcyBpcyBwZXJtaXR0ZWQsIGJ1dCBwbGF5IGF0IHlvdXIgb3duIHJpc2ssIGFzIHRoZXkgbWF5IGJlIGV4aXN0aW5nIG1vbmdvb3NlIGRvY3VtZW50IG1ldGhvZHMgeW91IGFyZSBzdG9tcGluZyBvbi5cbiAqXG4gKiAgICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICAgc2NoZW1hLm1ldGhvZHMuaW5pdCA9IGZ1bmN0aW9uICgpIHt9IC8vIHBvdGVudGlhbGx5IGJyZWFraW5nXG4gKi9cblNjaGVtYS5yZXNlcnZlZCA9IE9iamVjdC5jcmVhdGUoIG51bGwgKTtcbnZhciByZXNlcnZlZCA9IFNjaGVtYS5yZXNlcnZlZDtcbnJlc2VydmVkLm9uID1cbnJlc2VydmVkLmdldCA9XG5yZXNlcnZlZC5zZXQgPVxucmVzZXJ2ZWQuaW5pdCA9XG5yZXNlcnZlZC5pc05ldyA9XG5yZXNlcnZlZC5lcnJvcnMgPVxucmVzZXJ2ZWQuc2NoZW1hID1cbnJlc2VydmVkLm9wdGlvbnMgPVxucmVzZXJ2ZWQudG9PYmplY3QgPVxucmVzZXJ2ZWQudHJpZ2dlciA9ICAgIC8vIEV2ZW50c1xucmVzZXJ2ZWQub2ZmID0gICAgLy8gRXZlbnRzXG5yZXNlcnZlZC5fZXZlbnRzID0gLy8gRXZlbnRzXG5cbi8qKlxuICogR2V0cy9zZXRzIHNjaGVtYSBwYXRocy5cbiAqXG4gKiBTZXRzIGEgcGF0aCAoaWYgYXJpdHkgMilcbiAqIEdldHMgYSBwYXRoIChpZiBhcml0eSAxKVxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykgLy8gcmV0dXJucyBhIFNjaGVtYVR5cGVcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScsIE51bWJlcikgLy8gY2hhbmdlcyB0aGUgc2NoZW1hVHlwZSBvZiBgbmFtZWAgdG8gTnVtYmVyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICBpZiAob2JqID09PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodGhpcy5wYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMucGF0aHNbcGF0aF07XG4gICAgaWYgKHRoaXMuc3VicGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnN1YnBhdGhzW3BhdGhdO1xuXG4gICAgLy8gc3VicGF0aHM/XG4gICAgcmV0dXJuIC9cXC5cXGQrXFwuPy4qJC8udGVzdChwYXRoKVxuICAgICAgPyBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBzb21lIHBhdGggbmFtZXMgY29uZmxpY3Qgd2l0aCBkb2N1bWVudCBtZXRob2RzXG4gIGlmIChyZXNlcnZlZFtwYXRoXSkge1xuICAgIHRocm93IG5ldyBFcnJvcignYCcgKyBwYXRoICsgJ2AgbWF5IG5vdCBiZSB1c2VkIGFzIGEgc2NoZW1hIHBhdGhuYW1lJyk7XG4gIH1cblxuICAvLyB1cGRhdGUgdGhlIHRyZWVcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuLylcbiAgICAsIGxhc3QgPSBzdWJwYXRocy5wb3AoKVxuICAgICwgYnJhbmNoID0gdGhpcy50cmVlO1xuXG4gIHN1YnBhdGhzLmZvckVhY2goZnVuY3Rpb24oc3ViLCBpKSB7XG4gICAgaWYgKCFicmFuY2hbc3ViXSkgYnJhbmNoW3N1Yl0gPSB7fTtcbiAgICBpZiAoJ29iamVjdCcgIT09IHR5cGVvZiBicmFuY2hbc3ViXSkge1xuICAgICAgdmFyIG1zZyA9ICdDYW5ub3Qgc2V0IG5lc3RlZCBwYXRoIGAnICsgcGF0aCArICdgLiAnXG4gICAgICAgICAgICAgICsgJ1BhcmVudCBwYXRoIGAnXG4gICAgICAgICAgICAgICsgc3VicGF0aHMuc2xpY2UoMCwgaSkuY29uY2F0KFtzdWJdKS5qb2luKCcuJylcbiAgICAgICAgICAgICAgKyAnYCBhbHJlYWR5IHNldCB0byB0eXBlICcgKyBicmFuY2hbc3ViXS5uYW1lXG4gICAgICAgICAgICAgICsgJy4nO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaFtzdWJdO1xuICB9KTtcblxuICBicmFuY2hbbGFzdF0gPSB1dGlscy5jbG9uZShvYmopO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIG9iaik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0eXBlIGFyZ3VtZW50cyBpbnRvIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5pbnRlcnByZXRBc1R5cGUgPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIHZhciBjb25zdHJ1Y3Rvck5hbWUgPSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqLmNvbnN0cnVjdG9yKTtcbiAgaWYgKGNvbnN0cnVjdG9yTmFtZSAhPT0gJ09iamVjdCcpe1xuICAgIG9iaiA9IHsgdHlwZTogb2JqIH07XG4gIH1cblxuICAvLyBHZXQgdGhlIHR5cGUgbWFraW5nIHN1cmUgdG8gYWxsb3cga2V5cyBuYW1lZCBcInR5cGVcIlxuICAvLyBhbmQgZGVmYXVsdCB0byBtaXhlZCBpZiBub3Qgc3BlY2lmaWVkLlxuICAvLyB7IHR5cGU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnZnJlc2hjdXQnIH0gfVxuICB2YXIgdHlwZSA9IG9iai50eXBlICYmICFvYmoudHlwZS50eXBlXG4gICAgPyBvYmoudHlwZVxuICAgIDoge307XG5cbiAgaWYgKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZS5jb25zdHJ1Y3RvcikgfHwgJ21peGVkJyA9PSB0eXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcbiAgICAvLyBpZiBpdCB3YXMgc3BlY2lmaWVkIHRocm91Z2ggeyB0eXBlIH0gbG9vayBmb3IgYGNhc3RgXG4gICAgdmFyIGNhc3QgPSAoQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpXG4gICAgICA/IG9iai5jYXN0XG4gICAgICA6IHR5cGVbMF07XG5cbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIGNhc3QsIG9iaik7XG4gICAgfVxuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBjYXN0KSB7XG4gICAgICBjYXN0ID0gVHlwZXNbY2FzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhc3Quc3Vic3RyaW5nKDEpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoY2FzdC5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMoY2FzdCkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgbmV3IFNjaGVtYShjYXN0KSwgb2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFR5cGVzLkFycmF5KHBhdGgsIGNhc3QgfHwgVHlwZXMuTWl4ZWQsIG9iaik7XG4gIH1cblxuICB2YXIgbmFtZSA9ICdzdHJpbmcnID09PSB0eXBlb2YgdHlwZVxuICAgID8gdHlwZVxuICAgIC8vIElmIG5vdCBzdHJpbmcsIGB0eXBlYCBpcyBhIGZ1bmN0aW9uLiBPdXRzaWRlIG9mIElFLCBmdW5jdGlvbi5uYW1lXG4gICAgLy8gZ2l2ZXMgeW91IHRoZSBmdW5jdGlvbiBuYW1lLiBJbiBJRSwgeW91IG5lZWQgdG8gY29tcHV0ZSBpdFxuICAgIDogdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUpO1xuXG4gIGlmIChuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT0gVHlwZXNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmRlZmluZWQgdHlwZSBhdCBgJyArIHBhdGggK1xuICAgICAgICAnYFxcbiAgRGlkIHlvdSB0cnkgbmVzdGluZyBTY2hlbWFzPyAnICtcbiAgICAgICAgJ1lvdSBjYW4gb25seSBuZXN0IHVzaW5nIHJlZnMgb3IgYXJyYXlzLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUeXBlc1tuYW1lXShwYXRoLCBvYmopO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aGUgc2NoZW1hcyBwYXRocyBzaW1pbGFyIHRvIEFycmF5I2ZvckVhY2guXG4gKlxuICogVGhlIGNhbGxiYWNrIGlzIHBhc3NlZCB0aGUgcGF0aG5hbWUgYW5kIHNjaGVtYVR5cGUgYXMgYXJndW1lbnRzIG9uIGVhY2ggaXRlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtTY2hlbWF9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZWFjaFBhdGggPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGZuKGtleXNbaV0sIHRoaXMucGF0aHNba2V5c1tpXV0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gQXJyYXkgb2YgcGF0aCBzdHJpbmdzIHRoYXQgYXJlIHJlcXVpcmVkIGJ5IHRoaXMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5yZXF1aXJlZFBhdGhzID0gZnVuY3Rpb24gcmVxdWlyZWRQYXRocyAoKSB7XG4gIGlmICh0aGlzLl9yZXF1aXJlZHBhdGhzKSByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcmV0ID0gW107XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHZhciBwYXRoID0gcGF0aHNbaV07XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0uaXNSZXF1aXJlZCkgcmV0LnB1c2gocGF0aCk7XG4gIH1cblxuICB0aGlzLl9yZXF1aXJlZHBhdGhzID0gcmV0O1xuXG4gIHJldHVybiB0aGlzLl9yZXF1aXJlZHBhdGhzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwYXRoVHlwZSBvZiBgcGF0aGAgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEdpdmVuIGEgcGF0aCwgcmV0dXJucyB3aGV0aGVyIGl0IGlzIGEgcmVhbCwgdmlydHVhbCwgbmVzdGVkLCBvciBhZC1ob2MvdW5kZWZpbmVkIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aFR5cGUgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aCBpbiB0aGlzLnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLnZpcnR1YWxzKSByZXR1cm4gJ3ZpcnR1YWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLm5lc3RlZCkgcmV0dXJuICduZXN0ZWQnO1xuICBpZiAocGF0aCBpbiB0aGlzLnN1YnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuXG4gIGlmICgvXFwuXFxkK1xcLnxcXC5cXGQrJC8udGVzdChwYXRoKSAmJiBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKSkge1xuICAgIHJldHVybiAncmVhbCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdhZGhvY09yVW5kZWZpbmVkJztcbiAgfVxufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZ2V0UG9zaXRpb25hbFBhdGggKHNlbGYsIHBhdGgpIHtcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuKFxcZCspXFwufFxcLihcXGQrKSQvKS5maWx0ZXIoQm9vbGVhbik7XG4gIGlmIChzdWJwYXRocy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHNlbGYucGF0aHNbc3VicGF0aHNbMF1dO1xuICB9XG5cbiAgdmFyIHZhbCA9IHNlbGYucGF0aChzdWJwYXRoc1swXSk7XG4gIGlmICghdmFsKSByZXR1cm4gdmFsO1xuXG4gIHZhciBsYXN0ID0gc3VicGF0aHMubGVuZ3RoIC0gMVxuICAgICwgc3VicGF0aFxuICAgICwgaSA9IDE7XG5cbiAgZm9yICg7IGkgPCBzdWJwYXRocy5sZW5ndGg7ICsraSkge1xuICAgIHN1YnBhdGggPSBzdWJwYXRoc1tpXTtcblxuICAgIGlmIChpID09PSBsYXN0ICYmIHZhbCAmJiAhdmFsLnNjaGVtYSAmJiAhL1xcRC8udGVzdChzdWJwYXRoKSkge1xuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFR5cGVzLkFycmF5KSB7XG4gICAgICAgIC8vIFN0cmluZ1NjaGVtYSwgTnVtYmVyU2NoZW1hLCBldGNcbiAgICAgICAgdmFsID0gdmFsLmNhc3RlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBpZiBpdHMganVzdCBhIHBvc2l0aW9uIHNlZ21lbnQ6IHBhdGguMC5zdWJwYXRoXG4gICAgaWYgKCEvXFxELy50ZXN0KHN1YnBhdGgpKSBjb250aW51ZTtcblxuICAgIGlmICghKHZhbCAmJiB2YWwuc2NoZW1hKSkge1xuICAgICAgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFsID0gdmFsLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICB9XG5cbiAgc2VsZi5zdWJwYXRoc1sgcGF0aCBdID0gdmFsO1xuXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzWyBwYXRoIF07XG59XG5cbi8qKlxuICogQWRkcyBhIG1ldGhvZCBjYWxsIHRvIHRoZSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBkb2N1bWVudCBtZXRob2QgdG8gY2FsbCBsYXRlclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xuICB0aGlzLmNhbGxRdWV1ZS5wdXNoKFtuYW1lLCBhcmdzXSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcHJlIGhvb2sgZm9yIHRoZSBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgdG95U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3NhdmUnLCBmdW5jdGlvbiAobmV4dCkge1xuICogICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuY3JlYXRlZCA9IG5ldyBEYXRlO1xuICogICAgICAgbmV4dCgpO1xuICogICAgIH0pXG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3ZhbGlkYXRlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICh0aGlzLm5hbWUgIT0gJ1dvb2R5JykgdGhpcy5uYW1lID0gJ1dvb2R5JztcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ3ByZScsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBwb3N0IGZvciB0aGUgZG9jdW1lbnRcbiAqXG4gKiBQb3N0IGhvb2tzIGZpcmUgYG9uYCB0aGUgZXZlbnQgZW1pdHRlZCBmcm9tIGRvY3VtZW50IGluc3RhbmNlcyBvZiBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5wb3N0KCdzYXZlJywgZnVuY3Rpb24gKGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZWQgYWZ0ZXIgYSBkb2N1bWVudCB3YXMgc2F2ZWQnKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIE1vZGVsID0gbW9uZ29vc2UubW9kZWwoJ01vZGVsJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgdmFyIG0gPSBuZXcgTW9kZWwoLi4pO1xuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlcyBhZnRlciB0aGUgYHBvc3RgIGhvb2snKTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBob29rXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbihtZXRob2QsIGZuKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ29uJywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwbHVnaW4gY2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gKiBAc2VlIHBsdWdpbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGx1Z2luID0gZnVuY3Rpb24gKGZuLCBvcHRzKSB7XG4gIGZuKHRoaXMsIG9wdHMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBpbnN0YW5jZSBtZXRob2QgdG8gZG9jdW1lbnRzIGNvbnN0cnVjdGVkIGZyb20gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IGtpdHR5U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHNjaGVtYS5tZXRob2QoJ21lb3cnLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnbWVlZWVlb29vb29vb29vb29vdycpO1xuICogICAgIH0pXG4gKlxuICogICAgIHZhciBLaXR0eSA9IG1vbmdvb3NlLm1vZGVsKCdLaXR0eScsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBmaXp6ID0gbmV3IEtpdHR5O1xuICogICAgIGZpenoubWVvdygpOyAvLyBtZWVlZWVvb29vb29vb29vb29vd1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBtZXRob2RzLlxuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKHtcbiAqICAgICAgICAgcHVycjogZnVuY3Rpb24gKCkge31cbiAqICAgICAgICwgc2NyYXRjaDogZnVuY3Rpb24gKCkge31cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gbGF0ZXJcbiAqICAgICBmaXp6LnB1cnIoKTtcbiAqICAgICBmaXp6LnNjcmF0Y2goKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG1ldGhvZCBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBuYW1lKSB7XG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKSB7XG4gICAgICB0aGlzLm1ldGhvZHNbaV0gPSBuYW1lW2ldO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1ldGhvZHNbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHN0YXRpYyBcImNsYXNzXCIgbWV0aG9kcyB0byBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgc2NoZW1hLnN0YXRpYygnZmluZEJ5TmFtZScsIGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICogICAgICAgcmV0dXJuIHRoaXMuZmluZCh7IG5hbWU6IG5hbWUgfSwgY2FsbGJhY2spO1xuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgRHJpbmsgPSBtb25nb29zZS5tb2RlbCgnRHJpbmsnLCBzY2hlbWEpO1xuICogICAgIERyaW5rLmZpbmRCeU5hbWUoJ3NhbnBlbGxlZ3Jpbm8nLCBmdW5jdGlvbiAoZXJyLCBkcmlua3MpIHtcbiAqICAgICAgIC8vXG4gKiAgICAgfSk7XG4gKlxuICogSWYgYSBoYXNoIG9mIG5hbWUvZm4gcGFpcnMgaXMgcGFzc2VkIGFzIHRoZSBvbmx5IGFyZ3VtZW50LCBlYWNoIG5hbWUvZm4gcGFpciB3aWxsIGJlIGFkZGVkIGFzIHN0YXRpY3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnN0YXRpYyA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIG5hbWUpIHtcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpIHtcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuc3RhdGljc1tuYW1lXSA9IGZuO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMvZ2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gaWYgbm90IHBhc3NlZCwgdGhlIGN1cnJlbnQgb3B0aW9uIHZhbHVlIGlzIHJldHVybmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zW2tleV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbCA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciB2aXJ0dWFscyA9IHRoaXMudmlydHVhbHM7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcblxuICB2aXJ0dWFsc1tuYW1lXSA9IHBhcnRzLnJlZHVjZShmdW5jdGlvbiAobWVtLCBwYXJ0LCBpKSB7XG4gICAgbWVtW3BhcnRdIHx8IChtZW1bcGFydF0gPSAoaSA9PT0gcGFydHMubGVuZ3RoLTEpXG4gICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxuICAgICAgOiB7fSk7XG4gICAgcmV0dXJuIG1lbVtwYXJ0XTtcbiAgfSwgdGhpcy50cmVlKTtcblxuICByZXR1cm4gdmlydHVhbHNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbHBhdGggPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gdGhpcy52aXJ0dWFsc1tuYW1lXTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHByb3BlcnR5IGRpc2NyaW1pbmF0b3JzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuZGlzY3JpbWluYXRvcnM7XG5cbi8qKlxuICogU2NoZW1hIGluaGVyaXRhbmNlXG4gKiB0aGlzIC0gYmFzZVNjaGVtYVxuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHZhciBQZXJzb25TY2hlbWEgPSBuZXcgU2NoZW1hKCdQZXJzb24nLCB7XG4gKiAgICAgICBuYW1lOiBTdHJpbmcsXG4gKiAgICAgICBjcmVhdGVkQXQ6IERhdGVcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIEJvc3NTY2hlbWEgPSBuZXcgU2NoZW1hKCdCb3NzJywgUGVyc29uU2NoZW1hLCB7IGRlcGFydG1lbnQ6IFN0cmluZyB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAgIGRpc2NyaW1pbmF0b3IgbmFtZVxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSBkaXNjcmltaW5hdG9yIHNjaGVtYVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5kaXNjcmltaW5hdG9yID0gZnVuY3Rpb24gZGlzY3JpbWluYXRvciAobmFtZSwgc2NoZW1hKSB7XG4gIGlmICghKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSB2YWxpZCBkaXNjcmltaW5hdG9yIFNjaGVtYScpO1xuICB9XG5cbiAgaWYgKCB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nICYmICF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdCApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Rpc2NyaW1pbmF0b3IgXCInICsgbmFtZSArICdcIiBjYW4gb25seSBiZSBhIGRpc2NyaW1pbmF0b3Igb2YgdGhlIHJvb3QgbW9kZWwnKTtcbiAgfVxuXG4gIHZhciBrZXkgPSB0aGlzLm9wdGlvbnMuZGlzY3JpbWluYXRvcktleTtcbiAgaWYgKCBzY2hlbWEucGF0aChrZXkpICkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGlzY3JpbWluYXRvciBcIicgKyBuYW1lICsgJ1wiIGNhbm5vdCBoYXZlIGZpZWxkIHdpdGggbmFtZSBcIicgKyBrZXkgKyAnXCInKTtcbiAgfVxuXG4gIC8vIG1lcmdlcyBiYXNlIHNjaGVtYSBpbnRvIG5ldyBkaXNjcmltaW5hdG9yIHNjaGVtYSBhbmQgc2V0cyBuZXcgdHlwZSBmaWVsZC5cbiAgKGZ1bmN0aW9uIG1lcmdlU2NoZW1hcyhzY2hlbWEsIGJhc2VTY2hlbWEpIHtcbiAgICB1dGlscy5tZXJnZShzY2hlbWEsIGJhc2VTY2hlbWEpO1xuXG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9ialtrZXldID0geyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6IG5hbWUgfTtcbiAgICBzY2hlbWEuYWRkKG9iaik7XG4gICAgc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG5hbWUsIGlzUm9vdDogZmFsc2UgfTtcblxuICAgICAgLy8gdGhyb3dzIGVycm9yIGlmIG9wdGlvbnMgYXJlIGludmFsaWRcbiAgICAoZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25zKGEsIGIpIHtcbiAgICAgIGEgPSB1dGlscy5jbG9uZShhKTtcbiAgICAgIGIgPSB1dGlscy5jbG9uZShiKTtcbiAgICAgIGRlbGV0ZSBhLnRvSlNPTjtcbiAgICAgIGRlbGV0ZSBhLnRvT2JqZWN0O1xuICAgICAgZGVsZXRlIGIudG9KU09OO1xuICAgICAgZGVsZXRlIGIudG9PYmplY3Q7XG5cbiAgICAgIGlmICghdXRpbHMuZGVlcEVxdWFsKGEsIGIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpJyk7XG4gICAgICB9XG4gICAgfSkoc2NoZW1hLm9wdGlvbnMsIGJhc2VTY2hlbWEub3B0aW9ucyk7XG5cbiAgICB2YXIgdG9KU09OID0gc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICAsIHRvT2JqZWN0ID0gc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XG5cbiAgICBzY2hlbWEub3B0aW9ucyA9IHV0aWxzLmNsb25lKGJhc2VTY2hlbWEub3B0aW9ucyk7XG4gICAgaWYgKHRvSlNPTikgICBzY2hlbWEub3B0aW9ucy50b0pTT04gPSB0b0pTT047XG4gICAgaWYgKHRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHRvT2JqZWN0O1xuXG4gICAgLy9zY2hlbWEuY2FsbFF1ZXVlID0gYmFzZVNjaGVtYS5jYWxsUXVldWUuY29uY2F0KHNjaGVtYS5jYWxsUXVldWUpO1xuICAgIHNjaGVtYS5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDsgLy8gcmVzZXQganVzdCBpbiBjYXNlIFNjaGVtYSNyZXF1aXJlZFBhdGhzKCkgd2FzIGNhbGxlZCBvbiBlaXRoZXIgc2NoZW1hXG4gIH0pKHNjaGVtYSwgdGhpcyk7XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JzKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9ycyA9IHt9O1xuICB9XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBudWxsLCBpc1Jvb3Q6IHRydWUgfTtcbiAgfVxuXG4gIGlmICh0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEaXNjcmltaW5hdG9yIHdpdGggbmFtZSBcIicgKyBuYW1lICsgJ1wiIGFscmVhZHkgZXhpc3RzJyk7XG4gIH1cblxuICB0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdID0gc2NoZW1hO1xuXG4gIC8vIFJlZ2lzdGVyIG1ldGhvZHMgYW5kIHN0YXRpY3NcbiAgZm9yICggdmFyIG0gaW4gdGhpcy5tZXRob2RzICl7XG4gICAgc2NoZW1hLm1ldGhvZHNbIG0gXSA9IHRoaXMubWV0aG9kc1sgbSBdO1xuICB9XG4gIGZvciAoIHZhciBzIGluIHRoaXMuc3RhdGljcyApe1xuICAgIHNjaGVtYS5zdGF0aWNzWyBzIF0gPSB0aGlzLm1ldGhvZHNbIHMgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdO1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWE7XG53aW5kb3cuU2NoZW1hID0gU2NoZW1hO1xuXG4vLyByZXF1aXJlIGRvd24gaGVyZSBiZWNhdXNlIG9mIHJlZmVyZW5jZSBpc3N1ZXNcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBidWlsdC1pbiBTdG9yYWdlIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQ7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW1N0cmluZ10oI3NjaGVtYS1zdHJpbmctanMpXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxuICogLSBbQm9vbGVhbl0oI3NjaGVtYS1ib29sZWFuLWpzKSB8IEJvb2xcbiAqIC0gW0FycmF5XSgjc2NoZW1hLWFycmF5LWpzKVxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxuICogLSBbT2JqZWN0SWRdKCNzY2hlbWEtb2JqZWN0aWQtanMpIHwgT2lkXG4gKiAtIFtNaXhlZF0oI3NjaGVtYS1taXhlZC1qcykgfCBPYmplY3RcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgTWl4ZWRgIFNjaGVtYVR5cGUsIHdlIGNhbiB1c2UgdGhlbSBpbiBvdXIgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XG4gKiAgICAgbmV3IG1vbmdvb3NlLlNjaGVtYSh7IF91c2VyOiBNaXhlZCB9KVxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5UeXBlcyA9IHJlcXVpcmUoJy4vc2NoZW1hL2luZGV4Jyk7XG5cbi8vINCl0YDQsNC90LjQu9C40YnQtSDRgdGF0LXQvFxuU2NoZW1hLnNjaGVtYXMgPSBzY2hlbWFzID0ge307XG5cblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcblNjaGVtYS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBUeXBlcyA9IHtcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcbiAgICAgICwgRGF0ZTogcmVxdWlyZSgnLi9kYXRlJylcbiAgICAgICwgTnVtYmVyOiByZXF1aXJlKCcuL251bWJlcicpXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxuICAgICAgLCBPYmplY3RJZDogcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICAgICAsIEJ1ZmZlcjogcmVxdWlyZSgnLi9idWZmZXInKVxuICAgIH1cbiAgLCBTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9hcnJheScpXG4gICwgTWl4ZWQgPSByZXF1aXJlKCcuL21peGVkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBFbWJlZGRlZERvYztcblxuLyoqXG4gKiBBcnJheSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBjYXN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBTY2hlbWFBcnJheSAoa2V5LCBjYXN0LCBvcHRpb25zKSB7XG4gIGlmIChjYXN0KSB7XG4gICAgdmFyIGNhc3RPcHRpb25zID0ge307XG5cbiAgICBpZiAoJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggY2FzdC5jb25zdHJ1Y3RvciApICkge1xuICAgICAgaWYgKGNhc3QudHlwZSkge1xuICAgICAgICAvLyBzdXBwb3J0IHsgdHlwZTogV29vdCB9XG4gICAgICAgIGNhc3RPcHRpb25zID0gXy5jbG9uZSggY2FzdCApOyAvLyBkbyBub3QgYWx0ZXIgdXNlciBhcmd1bWVudHNcbiAgICAgICAgZGVsZXRlIGNhc3RPcHRpb25zLnR5cGU7XG4gICAgICAgIGNhc3QgPSBjYXN0LnR5cGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXN0ID0gTWl4ZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3VwcG9ydCB7IHR5cGU6ICdTdHJpbmcnIH1cbiAgICB2YXIgbmFtZSA9ICdzdHJpbmcnID09PSB0eXBlb2YgY2FzdFxuICAgICAgPyBjYXN0XG4gICAgICA6IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggY2FzdCApO1xuXG4gICAgdmFyIENhc3RlciA9IG5hbWUgaW4gVHlwZXNcbiAgICAgID8gVHlwZXNbbmFtZV1cbiAgICAgIDogY2FzdDtcblxuICAgIHRoaXMuY2FzdGVyQ29uc3RydWN0b3IgPSBDYXN0ZXI7XG4gICAgdGhpcy5jYXN0ZXIgPSBuZXcgQ2FzdGVyKG51bGwsIGNhc3RPcHRpb25zKTtcblxuICAgIC8vIGxhenkgbG9hZFxuICAgIEVtYmVkZGVkRG9jIHx8IChFbWJlZGRlZERvYyA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJykpO1xuXG4gICAgaWYgKCEodGhpcy5jYXN0ZXIgaW5zdGFuY2VvZiBFbWJlZGRlZERvYykpIHtcbiAgICAgIHRoaXMuY2FzdGVyLnBhdGggPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBkZWZhdWx0QXJyXG4gICAgLCBmbjtcblxuICBpZiAodGhpcy5kZWZhdWx0VmFsdWUpIHtcbiAgICBkZWZhdWx0QXJyID0gdGhpcy5kZWZhdWx0VmFsdWU7XG4gICAgZm4gPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgZGVmYXVsdEFycjtcbiAgfVxuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbiA/IGRlZmF1bHRBcnIoKSA6IGRlZmF1bHRBcnIgfHwgW107XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlQXJyYXkoYXJyLCBzZWxmLnBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblNjaGVtYUFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUFycmF5O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGVzIHRoZSBnZXR0ZXJzIGFwcGxpY2F0aW9uIGZvciB0aGUgcG9wdWxhdGlvbiBzcGVjaWFsLWNhc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIGlmICh0aGlzLmNhc3Rlci5vcHRpb25zICYmIHRoaXMuY2FzdGVyLm9wdGlvbnMucmVmKSB7XG4gICAgLy8gbWVhbnMgdGhlIG9iamVjdCBpZCB3YXMgcG9wdWxhdGVkXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIFNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycy5jYWxsKHRoaXMsIHZhbHVlLCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIHZhbHVlcyBmb3Igc2V0KCkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0IHdoZXRoZXIgdGhpcyBpcyBhbiBpbml0aWFsaXphdGlvbiBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQgKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmICghKHZhbHVlLmlzU3RvcmFnZUFycmF5KSkge1xuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FzdGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhbHVlW2ldID0gdGhpcy5jYXN0ZXIuY2FzdCh2YWx1ZVtpXSwgZG9jLCBpbml0KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyByZXRocm93XG4gICAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoZS50eXBlLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQpO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQXJyYXk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBCb29sZWFuIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEJvb2xlYW5TY2hlbWEgKHBhdGgsIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCb29sZWFuU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2U7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGJvb2xlYW5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmIChudWxsID09PSB2YWx1ZSkgcmV0dXJuIHZhbHVlO1xuICBpZiAoJzAnID09PSB2YWx1ZSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoJ3RydWUnID09PSB2YWx1ZSkgcmV0dXJuIHRydWU7XG4gIGlmICgnZmFsc2UnID09PSB2YWx1ZSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gISEgdmFsdWU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQm9vbGVhblNjaGVtYTtcbiIsIihmdW5jdGlvbiAoQnVmZmVyKXtcbid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBTdG9yYWdlQnVmZmVyID0gcmVxdWlyZSgnLi4vdHlwZXMnKS5CdWZmZXJcbiAgLCBCaW5hcnkgPSBTdG9yYWdlQnVmZmVyLkJpbmFyeVxuICAsIERvY3VtZW50O1xuXG4vKipcbiAqIEJ1ZmZlciBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBjYXN0XG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gU2NoZW1hQnVmZmVyIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ0J1ZmZlcicpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU2NoZW1hQnVmZmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TY2hlbWFCdWZmZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hQnVmZmVyO1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU2NoZW1hQnVmZmVyLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlLCBkb2MpIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKHRoaXMsIHZhbHVlLCBkb2MsIHRydWUpKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLmxlbmd0aCk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgY29udGVudHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBkb2N1bWVudCB0aGF0IHRyaWdnZXJzIHRoZSBjYXN0aW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNjaGVtYUJ1ZmZlci5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jLCBpbml0KSB7XG4gIHZhciByZXQ7XG5cbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKHRoaXMsIHZhbHVlLCBkb2MsIGluaXQpKSB7XG4gICAgLy8gd2FpdCEgd2UgbWF5IG5lZWQgdG8gY2FzdCB0aGlzIHRvIGEgZG9jdW1lbnRcblxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gbGF6eSBsb2FkXG4gICAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi8uLi9kb2N1bWVudCcpKTtcblxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERvY3VtZW50KSB7XG4gICAgICB2YWx1ZS4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gZWxzZSBpZiAoIV8uaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdidWZmZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdGhlIGNhc2Ugd2hlcmUgdXNlciBkaXJlY3RseSBzZXRzIGEgcG9wdWxhdGVkXG4gICAgLy8gcGF0aCB0byBhIHBsYWluIG9iamVjdDsgY2FzdCB0byB0aGUgTW9kZWwgdXNlZCBpblxuICAgIC8vIHRoZSBwb3B1bGF0aW9uIHF1ZXJ5LlxuICAgIHZhciBwYXRoID0gZG9jLiRfX2Z1bGxQYXRoKHRoaXMucGF0aCk7XG4gICAgdmFyIG93bmVyID0gZG9jLm93bmVyRG9jdW1lbnQgPyBkb2Mub3duZXJEb2N1bWVudCgpIDogZG9jO1xuICAgIHZhciBwb3AgPSBvd25lci5wb3B1bGF0ZWQocGF0aCwgdHJ1ZSk7XG4gICAgcmV0ID0gbmV3IHBvcC5vcHRpb25zLm1vZGVsKHZhbHVlKTtcbiAgICByZXQuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIGRvY3VtZW50c1xuICBpZiAodmFsdWUgJiYgdmFsdWUuX2lkKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5faWQ7XG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbHVlKSkge1xuICAgIGlmICghdmFsdWUgfHwgIXZhbHVlLmlzU3RvcmFnZUJ1ZmZlcikge1xuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUJ1ZmZlcih2YWx1ZSwgW3RoaXMucGF0aCwgZG9jXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQmluYXJ5KSB7XG4gICAgcmV0ID0gbmV3IFN0b3JhZ2VCdWZmZXIodmFsdWUudmFsdWUodHJ1ZSksIFt0aGlzLnBhdGgsIGRvY10pO1xuICAgIHJldC5zdWJ0eXBlKHZhbHVlLnN1Yl90eXBlKTtcbiAgICAvLyBkbyBub3Qgb3ZlcnJpZGUgQmluYXJ5IHN1YnR5cGVzLiB1c2VycyBzZXQgdGhpc1xuICAgIC8vIHRvIHdoYXRldmVyIHRoZXkgd2FudC5cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgaWYgKG51bGwgPT09IHZhbHVlKSByZXR1cm4gdmFsdWU7XG5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZSB8fCAnbnVtYmVyJyA9PT0gdHlwZSB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldCA9IG5ldyBTdG9yYWdlQnVmZmVyKHZhbHVlLCBbdGhpcy5wYXRoLCBkb2NdKTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignYnVmZmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQnVmZmVyO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG52YXIgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3I7XG5cbi8qKlxuICogRGF0ZSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEYXRlU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgZGF0ZVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIERhdGU7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGRhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHZhciBkYXRlO1xuXG4gIC8vIHN1cHBvcnQgZm9yIHRpbWVzdGFtcHNcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyIHx8ICdudW1iZXInID09IHR5cGVvZiB2YWx1ZVxuICAgICAgfHwgU3RyaW5nKHZhbHVlKSA9PSBOdW1iZXIodmFsdWUpKSB7XG5cbiAgICBkYXRlID0gbmV3IERhdGUoTnVtYmVyKHZhbHVlKSk7XG5cbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXG4gIH0gZWxzZSBpZiAodmFsdWUudG9TdHJpbmcpIHtcbiAgICBkYXRlID0gbmV3IERhdGUodmFsdWUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBpZiAoZGF0ZS50b1N0cmluZygpICE9ICdJbnZhbGlkIERhdGUnKSB7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdkYXRlJywgdmFsdWUsIHRoaXMucGF0aCApO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVTY2hlbWE7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIEFycmF5VHlwZSA9IHJlcXVpcmUoJy4vYXJyYXknKVxuICAsIFN0b3JhZ2VEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi4vdHlwZXMvZG9jdW1lbnRhcnJheScpXG4gICwgU3ViZG9jdW1lbnQgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpXG4gICwgb2lkID0gcmVxdWlyZSgnLi4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBTdWJkb2NzQXJyYXkgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hQXJyYXlcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBEb2N1bWVudEFycmF5IChrZXksIHNjaGVtYSwgb3B0aW9ucykge1xuXG4gIC8vIGNvbXBpbGUgYW4gZW1iZWRkZWQgZG9jdW1lbnQgZm9yIHRoaXMgc2NoZW1hXG4gIGZ1bmN0aW9uIEVtYmVkZGVkRG9jdW1lbnQgKCkge1xuICAgIFN1YmRvY3VtZW50LmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3ViZG9jdW1lbnQucHJvdG90eXBlICk7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcbiAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICAvLyBhcHBseSBtZXRob2RzXG4gIGZvciAodmFyIGkgaW4gc2NoZW1hLm1ldGhvZHMpIHtcbiAgICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZVtpXSA9IHNjaGVtYS5tZXRob2RzW2ldO1xuICB9XG5cbiAgLy8gYXBwbHkgc3RhdGljc1xuICBmb3IgKHZhciBqIGluIHNjaGVtYS5zdGF0aWNzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudFtqXSA9IHNjaGVtYS5zdGF0aWNzW2pdO1xuICB9XG5cbiAgRW1iZWRkZWREb2N1bWVudC5vcHRpb25zID0gb3B0aW9ucztcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgQXJyYXlUeXBlLmNhbGwodGhpcywga2V5LCBFbWJlZGRlZERvY3VtZW50LCBvcHRpb25zKTtcblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XG4gIHZhciBmbiA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbi5jYWxsKHRoaXMpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSBhcnIgPSBbYXJyXTtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KGFyciwgcGF0aCwgdGhpcyk7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gQXJyYXlUeXBlLlxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEFycmF5VHlwZS5wcm90b3R5cGUgKTtcbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnRBcnJheTtcblxuLyoqXG4gKiBQZXJmb3JtcyBsb2NhbCB2YWxpZGF0aW9ucyBmaXJzdCwgdGhlbiB2YWxpZGF0aW9ucyBvbiBlYWNoIGVtYmVkZGVkIGRvY1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKGFycmF5LCBmbiwgc2NvcGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIFNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUuY2FsbCh0aGlzLCBhcnJheSwgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChlcnIpIHJldHVybiBmbihlcnIpO1xuXG4gICAgdmFyIGNvdW50ID0gYXJyYXkgJiYgYXJyYXkubGVuZ3RoXG4gICAgICAsIGVycm9yO1xuXG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIGZuKCk7XG5cbiAgICAvLyBoYW5kbGUgc3BhcnNlIGFycmF5cywgZG8gbm90IHVzZSBhcnJheS5mb3JFYWNoIHdoaWNoIGRvZXMgbm90XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHNwYXJzZSBlbGVtZW50cyB5ZXQgcmVwb3J0cyBhcnJheS5sZW5ndGggaW5jbHVkaW5nXG4gICAgLy8gdGhlbSA6KFxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvdW50OyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIC8vIHNpZGVzdGVwIHNwYXJzZSBlbnRyaWVzXG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAhKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciAmJiAhZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIHJld3JpdGUgdGhlIGtleVxuICAgICAgICAgICAgZXJyLmtleSA9IHNlbGYua2V5ICsgJy4nICsgaSArICcuJyArIGVyci5rZXk7XG4gICAgICAgICAgICByZXR1cm4gZm4oZXJyb3IgPSBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCBmbGFnXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IHByZXZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlLCBkb2MsIGluaXQsIHByZXYpIHtcbiAgdmFyIHNlbGVjdGVkXG4gICAgLCBzdWJkb2NcbiAgICAsIGk7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0LCBwcmV2KTtcbiAgfVxuXG4gIC8vINCV0YHQu9C4INC00LLQsCDQvNCw0YHRgdC40LLQsCDQv9GA0LjQvNC10YDQvdC+ICjQutGA0L7QvNC1IF9pZCkg0L7QtNC40L3QsNC60L7QstGL0LUgLSDQvdC1INC90LDQtNC+INC/0LXRgNC10LfQsNC/0LjRgdGL0LLQsNGC0YxcbiAgaWYgKCBwcmV2ICYmIGFwcHJveGltYXRlbHlFcXVhbCggdmFsdWUsIHByZXYgKSApe1xuICAgIHJldHVybiBwcmV2O1xuICB9XG5cbiAgaWYgKCEodmFsdWUuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSkpIHtcbiAgICB2YWx1ZSA9IG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICAgIGlmIChwcmV2ICYmIHByZXYuX2hhbmRsZXJzKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJldi5faGFuZGxlcnMpIHtcbiAgICAgICAgZG9jLm9mZihrZXksIHByZXYuX2hhbmRsZXJzW2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGkgPSB2YWx1ZS5sZW5ndGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGlmICghKHZhbHVlW2ldIGluc3RhbmNlb2YgU3ViZG9jdW1lbnQpICYmIHZhbHVlW2ldKSB7XG4gICAgICBpZiAoaW5pdCkge1xuICAgICAgICBzZWxlY3RlZCB8fCAoc2VsZWN0ZWQgPSBzY29wZVBhdGhzKHRoaXMsIGRvYy4kX18uc2VsZWN0ZWQsIGluaXQpKTtcbiAgICAgICAgc3ViZG9jID0gbmV3IHRoaXMuY2FzdGVyQ29uc3RydWN0b3IobnVsbCwgdmFsdWUsIHRydWUsIHNlbGVjdGVkKTtcbiAgICAgICAgdmFsdWVbaV0gPSBzdWJkb2MuaW5pdCh2YWx1ZVtpXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHN1YmRvYyA9IHByZXYuaWQodmFsdWVbaV0uX2lkKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuXG4gICAgICAgIGlmIChwcmV2ICYmIHN1YmRvYykge1xuICAgICAgICAgIC8vIGhhbmRsZSByZXNldHRpbmcgZG9jIHdpdGggZXhpc3RpbmcgaWQgYnV0IGRpZmZlcmluZyBkYXRhXG4gICAgICAgICAgLy8gZG9jLmFycmF5ID0gW3sgZG9jOiAndmFsJyB9XVxuICAgICAgICAgIHN1YmRvYy5zZXQodmFsdWVbaV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKHZhbHVlW2ldLCB2YWx1ZSk7XG5cbiAgICAgICAgICByZXN0b3JlUG9wdWxhdGVkRmllbGRzKCBzdWJkb2MsIHRoaXMuc2NoZW1hLnRyZWUsIHZhbHVlW2ldLCBwcmV2ICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBzZXQoKSBpcyBob29rZWQgaXQgd2lsbCBoYXZlIG5vIHJldHVybiB2YWx1ZVxuICAgICAgICAvLyBzZWUgZ2gtNzQ2XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn07XG5cbi8qIVxuICog0J/RgNC40LHQu9C40LfQuNGC0LXQu9GM0L3QvtC1INGB0YDQsNCy0L3QtdC90LjQtSDQtNCy0YPRhSDQvNCw0YHRgdC40LLQvtCyXG4gKlxuICog0K3RgtC+INC90YPQttC90L4g0LTQu9GPIHBvcHVsYXRlZCDQv9C+0LvQtdC5IC0g0LjRhSDQvNGLINC/0YDQtdC+0LHRgNCw0LfQvtCy0YvQstCw0LXQvCDQsiBpZC5cbiAqXG4gKiDQotCw0Log0LbQtSDQsiDRgdGA0LDQstC90LXQvdC40Lgg0L3QtSDRg9GH0LDRgdGC0LLRg9C10YIgaWQg0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNGFIEVtYmVkZGVkINC00L7QutGD0LzQtdC90YLQvtCyLFxuICog0JXRgdC70Lgg0L3QsCDRgdC10YDQstC10YDQtSBfaWQ6IGZhbHNlLCDQsCDQvdCwINC60LvQuNC10L3RgtC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOINC10YHRgtGMIF9pZC5cbiAqXG4gKiBAcGFyYW0gdmFsdWVcbiAqIEBwYXJhbSBwcmV2XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gYXBwcm94aW1hdGVseUVxdWFsICggdmFsdWUsIHByZXYgKSB7XG4gIHByZXYgPSBwcmV2LnRvT2JqZWN0KHtkZXBvcHVsYXRlOiAxfSk7XG5cbiAgLy8g0J3QtSDRgdGA0LDQstC90LjQstCw0YLRjCDQv9C+IHN1YmRvYyBfaWRcbiAgdmFyIGkgPSB2YWx1ZS5sZW5ndGg7XG4gIGlmICggaSA9PT0gcHJldi5sZW5ndGggKXtcbiAgICBfLmZvckVhY2goIHZhbHVlLCBmdW5jdGlvbiggc3ViZG9jLCBpICl7XG4gICAgICBpZiAoICFzdWJkb2MuX2lkICl7XG4gICAgICAgIGRlbGV0ZSBwcmV2WyBpIF0uX2lkO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHV0aWxzLmRlZXBFcXVhbCggdmFsdWUsIHByZXYgKTtcbn1cblxuLyohXG4gKiBSZXN0b3JlIHBvcHVsYXRpb25cbiAqXG4gKiBAcGFyYW0geyp9IHN1YmRvY1xuICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYVRyZWVcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnRBcnJheX0gcHJldlxuICovXG5mdW5jdGlvbiByZXN0b3JlUG9wdWxhdGVkRmllbGRzICggc3ViZG9jLCBzY2hlbWFUcmVlLCB2YWx1ZSwgcHJldiApIHtcbiAgdmFyIHByb3BzO1xuICBfLmZvckVhY2goIHNjaGVtYVRyZWUsIGZ1bmN0aW9uKCBwcm9wLCBrZXkgKXtcbiAgICB2YXIgY3VyVmFsO1xuXG4gICAgaWYgKCBwcm9wLnJlZiApe1xuICAgICAgcHJvcHMgPSB7fTtcbiAgICAgIGN1clZhbCA9IHZhbHVlWyBrZXkgXTtcblxuICAgICAgaWYgKCBjdXJWYWwgJiYgb2lkLmlzVmFsaWQoIGN1clZhbCApICl7XG5cbiAgICAgICAgXy5mb3JFYWNoKCBwcmV2LCBmdW5jdGlvbiggcHJldkRvYyApe1xuICAgICAgICAgIHZhciBwcmV2RG9jUHJvcCA9IHByZXZEb2NbIGtleSBdO1xuXG4gICAgICAgICAgaWYgKCBwcmV2RG9jUHJvcCBpbnN0YW5jZW9mIERvY3VtZW50ICl7XG4gICAgICAgICAgICBpZiAoIHByZXZEb2NQcm9wLl9pZC5lcXVhbHMoIGN1clZhbCApICl7XG4gICAgICAgICAgICAgIHN1YmRvY1sga2V5IF0gPSBwcmV2RG9jUHJvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qIVxuICogU2NvcGVzIHBhdGhzIHNlbGVjdGVkIGluIGEgcXVlcnkgdG8gdGhpcyBhcnJheS5cbiAqIE5lY2Vzc2FyeSBmb3IgcHJvcGVyIGRlZmF1bHQgYXBwbGljYXRpb24gb2Ygc3ViZG9jdW1lbnQgdmFsdWVzLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnRBcnJheX0gYXJyYXkgLSB0aGUgYXJyYXkgdG8gc2NvcGUgYGZpZWxkc2AgcGF0aHNcbiAqIEBwYXJhbSB7T2JqZWN0fHVuZGVmaW5lZH0gZmllbGRzIC0gdGhlIHJvb3QgZmllbGRzIHNlbGVjdGVkIGluIHRoZSBxdWVyeVxuICogQHBhcmFtIHtCb29sZWFufHVuZGVmaW5lZH0gaW5pdCAtIGlmIHdlIGFyZSBiZWluZyBjcmVhdGVkIHBhcnQgb2YgYSBxdWVyeSByZXN1bHRcbiAqL1xuZnVuY3Rpb24gc2NvcGVQYXRocyAoYXJyYXksIGZpZWxkcywgaW5pdCkge1xuICBpZiAoIShpbml0ICYmIGZpZWxkcykpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgdmFyIHBhdGggPSBhcnJheS5wYXRoICsgJy4nXG4gICAgLCBrZXlzID0gT2JqZWN0LmtleXMoZmllbGRzKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBzZWxlY3RlZCA9IHt9XG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKDAgPT09IGtleS5pbmRleE9mKHBhdGgpKSB7XG4gICAgICBoYXNLZXlzIHx8IChoYXNLZXlzID0gdHJ1ZSk7XG4gICAgICBzZWxlY3RlZFtrZXkuc3Vic3RyaW5nKHBhdGgubGVuZ3RoKV0gPSBmaWVsZHNba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaGFzS2V5cyAmJiBzZWxlY3RlZCB8fCB1bmRlZmluZWQ7XG59XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkJ1ZmZlciA9IHJlcXVpcmUoJy4vYnVmZmVyJyk7XG5cbmV4cG9ydHMuRGF0ZSA9IHJlcXVpcmUoJy4vZGF0ZScpO1xuXG5leHBvcnRzLk9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuXG5leHBvcnRzLk1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpO1xuXG4vLyBhbGlhc1xuXG5leHBvcnRzLk9pZCA9IGV4cG9ydHMuT2JqZWN0SWQ7XG5leHBvcnRzLk9iamVjdCA9IGV4cG9ydHMuTWl4ZWQ7XG5leHBvcnRzLkJvb2wgPSBleHBvcnRzLkJvb2xlYW47XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBNaXhlZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBNaXhlZCAocGF0aCwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHQpIHtcbiAgICB2YXIgZGVmID0gb3B0aW9ucy5kZWZhdWx0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRlZikgJiYgMCA9PT0gZGVmLmxlbmd0aCkge1xuICAgICAgLy8gbWFrZSBzdXJlIGVtcHR5IGFycmF5IGRlZmF1bHRzIGFyZSBoYW5kbGVkXG4gICAgICBvcHRpb25zLmRlZmF1bHQgPSBBcnJheTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNoYXJlZCAmJlxuICAgICAgICAgICAgICAgXy5pc1BsYWluT2JqZWN0KGRlZikgJiZcbiAgICAgICAgICAgICAgIDAgPT09IE9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSB7XG4gICAgICAvLyBwcmV2ZW50IG9kZCBcInNoYXJlZFwiIG9iamVjdHMgYmV0d2VlbiBkb2N1bWVudHNcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTWl4ZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWl4ZWQ7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4ZWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXM7XG5cbi8qKlxuICogTnVtYmVyIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gTnVtYmVyU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ051bWJlcicpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVyU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgbnVtYmVyXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdmFsdWUgaW5zdGFuY2VvZiBOdW1iZXI7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0cyBhIG1pbmltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogOSB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXG4gKiAgICAgICBtLm4gPSAxMDtcbiAqICAgICAgIG0uc2F2ZSgpIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01JTn0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAgICAgdmFyIG1pbiA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoe01JTn0pLiddO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogbWluIH0pXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XG4gKiAgICAgcy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGlzIGJlbmVhdGggdGhlIGxpbWl0ICgxMCkuXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWluaW11bSBudW1iZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5taW5WYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPT0gdGhpcy5taW5WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1pbjtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01JTn0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWluVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPj0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWluJ10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgYSBtYXhpbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDExIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUFYfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWF4ID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGV4Y2VlZHMgdGhlIGxpbWl0ICh7TUFYfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiBtYXggfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgZXhjZWVkcyB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtYXhpbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPT0gdGhpcy5tYXhWYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1heDtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01BWH0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWF4VmFsaWRhdG9yID0gZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2IDw9IHZhbHVlO1xuICAgIH0sIG1zZywgJ21heCddKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBudW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIHZhciB2YWwgPSB2YWx1ZSAmJiB2YWx1ZS5faWRcbiAgICA/IHZhbHVlLl9pZCAvLyBkb2N1bWVudHNcbiAgICA6IHZhbHVlO1xuXG4gIGlmICghaXNOYU4odmFsKSl7XG4gICAgaWYgKG51bGwgPT09IHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAoJycgPT09IHZhbCkgcmV0dXJuIG51bGw7XG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdmFsKSB2YWwgPSBOdW1iZXIodmFsKTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gdmFsO1xuICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAodmFsLnRvU3RyaW5nICYmICFBcnJheS5pc0FycmF5KHZhbCkgJiZcbiAgICAgICAgdmFsLnRvU3RyaW5nKCkgPT0gTnVtYmVyKHZhbCkpIHtcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyKHZhbCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignbnVtYmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyU2NoZW1hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBPYmplY3RJZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnT2JqZWN0SWQnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5PYmplY3RJZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPYmplY3RJZDtcblxuLyoqXG4gKiBBZGRzIGFuIGF1dG8tZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHQgaWYgdHVybk9uIGlzIHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmF1dG8gPSBmdW5jdGlvbiAoIHR1cm5PbiApIHtcbiAgaWYgKCB0dXJuT24gKSB7XG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcbiAgICB0aGlzLnNldCggcmVzZXRJZCApO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2Ygb2lkO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtPYmplY3RJZHxTdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2NcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxuICogQHBhcmFtIHtPYmplY3RJZHxEb2N1bWVudH0gcHJpb3JWYWxcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUsIGRvYywgaW5pdCwgcHJpb3JWYWwgKSB7XG4gIC8vIGxhenkgbG9hZFxuICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuLy4uL2RvY3VtZW50JykpO1xuXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgLy8gd2FpdCEgd2UgbWF5IG5lZWQgdG8gY2FzdCB0aGlzIHRvIGEgZG9jdW1lbnRcblxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHZhbHVlLiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIHNldHRpbmcgYSBwb3B1bGF0ZWQgcGF0aFxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZCApIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCAhXy5pc1BsYWluT2JqZWN0KCB2YWx1ZSApICkge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICAvLyDQndGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1LCDRg9C60LDQt9Cw0L3QvdC+0Lkg0LIg0YHRgdGL0LvQutC1XG4gICAgdmFyIHNjaGVtYSA9IHRoaXMub3B0aW9ucy5yZWY7XG4gICAgaWYgKCAhc2NoZW1hICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINGB0YXQtdC80YMsINC/0L4g0LrQvtGC0L7RgNC+0Lkg0Y3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgdC+0LfQtNCw0LLQsNGC0YwnKTtcbiAgICB9XG5cbiAgICBpZiAoICFzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINC90LDQt9Cy0LDQvdC40LUg0YHRhdC10LzRiyDQvdCwINC60L7RgtC+0YDRg9GOINGB0YHRi9C70LDQtdC80YHRjyDQv9GA0Lgg0LXRkSDRgdC+0LfQtNCw0L3QuNC4ICggbmV3IFNjaGVtYShcIm5hbWVcIiwgc2NoZW1hT2JqZWN0KSApJyk7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBkb2NcbiAgICBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0sIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgIGRvYy4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcblxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiB2YWx1ZTtcblxuICAvLyDQn9GA0LXQtNC+0YLQstGA0LDRgtC40YLRjCBkZXBvcHVsYXRlXG4gIGlmICggcHJpb3JWYWwgaW5zdGFuY2VvZiBEb2N1bWVudCApe1xuICAgIGlmICggcHJpb3JWYWwuX2lkICYmIHByaW9yVmFsLl9pZC5lcXVhbHMoIHZhbHVlICkgKXtcbiAgICAgIHJldHVybiBwcmlvclZhbDtcbiAgICB9XG4gIH1cblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQpXG4gICAgcmV0dXJuIHZhbHVlO1xuXG4gIGlmICggdmFsdWUuX2lkICYmIHZhbHVlLl9pZCBpbnN0YW5jZW9mIG9pZCApXG4gICAgcmV0dXJuIHZhbHVlLl9pZDtcblxuICBpZiAodmFsdWUudG9TdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG9pZC5jcmVhdGVGcm9tSGV4U3RyaW5nKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdElkICgpIHtcbiAgcmV0dXJuIG5ldyBvaWQoKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRJZCAodikge1xuICB0aGlzLiRfXy5faWQgPSBudWxsO1xuICByZXR1cm4gdjtcbn1cblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFN0cmluZyBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gU3RyaW5nU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgdGhpcy5lbnVtVmFsdWVzID0gW107XG4gIHRoaXMucmVnRXhwID0gbnVsbDtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ1N0cmluZycpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nU2NoZW1hO1xuXG4vKipcbiAqIEFkZHMgYW4gZW51bSB2YWxpZGF0b3JcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHN0YXRlcyA9ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJylcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IHN0YXRlcyB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGBpbnZhbGlkYCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGBzdGF0ZWAuXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvciB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIHZhciBlbnUgPSB7XG4gKiAgICAgICB2YWx1ZXM6ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJyksXG4gKiAgICAgICBtZXNzYWdlOiAnZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gJ1xuICogICAgIH1cbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IGVudSB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGBzdGF0ZWAgd2l0aCB2YWx1ZSBgaW52YWxpZGBcbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBbYXJncy4uLl0gZW51bWVyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5lbnVtID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5lbnVtVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2WzBdICE9PSB0aGlzLmVudW1WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZmFsc2U7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0gfHwgZmFsc2UgPT09IGFyZ3VtZW50c1swXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbHVlcztcbiAgdmFyIGVycm9yTWVzc2FnZTtcblxuICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZ3VtZW50c1swXSkpIHtcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHNbMF0udmFsdWVzO1xuICAgIGVycm9yTWVzc2FnZSA9IGFyZ3VtZW50c1swXS5tZXNzYWdlO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLlN0cmluZy5lbnVtO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZXNbaV0pIHtcbiAgICAgIHRoaXMuZW51bVZhbHVlcy5wdXNoKHRoaXMuY2FzdCh2YWx1ZXNbaV0pKTtcbiAgICB9XG4gIH1cblxuICB2YXIgdmFscyA9IHRoaXMuZW51bVZhbHVlcztcbiAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2IHx8IH52YWxzLmluZGV4T2Yodik7XG4gIH07XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLmVudW1WYWxpZGF0b3IsIGVycm9yTWVzc2FnZSwgJ2VudW0nXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBsb3dlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGVtYWlsOiAnU29tZUVtYWlsQGV4YW1wbGUuQ09NJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmVtYWlsKSAvLyBzb21lZW1haWxAZXhhbXBsZS5jb21cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gdXBwZXJjYXNlIHNldHRlci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgY2FwczogeyB0eXBlOiBTdHJpbmcsIHVwcGVyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGNhcHM6ICdhbiBleGFtcGxlJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmNhcHMpIC8vIEFOIEVYQU1QTEVcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLnVwcGVyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB0cmltIHNldHRlci5cbiAqXG4gKiBUaGUgc3RyaW5nIHZhbHVlIHdpbGwgYmUgdHJpbW1lZCB3aGVuIHNldC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHRyaW06IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIHN0cmluZyA9ICcgc29tZSBuYW1lICdcbiAqICAgICBjb25zb2xlLmxvZyhzdHJpbmcubGVuZ3RoKSAvLyAxMVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiBzdHJpbmcgfSlcbiAqICAgICBjb25zb2xlLmxvZyhtLm5hbWUubGVuZ3RoKSAvLyA5XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50cmltKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmVnZXhwIHZhbGlkYXRvci5cbiAqXG4gKiBBbnkgdmFsdWUgdGhhdCBkb2VzIG5vdCBwYXNzIGByZWdFeHBgLnRlc3QodmFsKSB3aWxsIGZhaWwgdmFsaWRhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiAnSSBhbSBpbnZhbGlkJyB9KVxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFBhdGggYG5hbWVgIGlzIGludmFsaWQgKEkgYW0gaW52YWxpZCkuXCJcbiAqICAgICAgIG0ubmFtZSA9ICdhcHBsZXMnXG4gKiAgICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICAgYXNzZXJ0Lm9rKGVycikgLy8gc3VjY2Vzc1xuICogICAgICAgfSlcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyB1c2luZyBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiAgICAgdmFyIG1hdGNoID0gWyAvXFwuaHRtbCQvLCBcIlRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoe1ZBTFVFfSlcIiBdO1xuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGZpbGU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogbWF0Y2ggfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBmaWxlOiAnaW52YWxpZCcgfSk7XG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoaW52YWxpZClcIlxuICogICAgIH0pXG4gKlxuICogRW1wdHkgc3RyaW5ncywgYHVuZGVmaW5lZGAsIGFuZCBgbnVsbGAgdmFsdWVzIGFsd2F5cyBwYXNzIHRoZSBtYXRjaCB2YWxpZGF0b3IuIElmIHlvdSByZXF1aXJlIHRoZXNlIHZhbHVlcywgZW5hYmxlIHRoZSBgcmVxdWlyZWRgIHZhbGlkYXRvciBhbHNvLlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8sIHJlcXVpcmVkOiB0cnVlIH19KVxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSByZWdFeHAgcmVndWxhciBleHByZXNzaW9uIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXG4gICAgICA6IHRydWU7XG4gIH1cblxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbbWF0Y2hWYWxpZGF0b3IsIG1zZywgJ3JlZ2V4cCddKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gY2hlY2tSZXF1aXJlZCAodmFsdWUsIGRvYykge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYodGhpcywgdmFsdWUsIGRvYywgdHJ1ZSkpIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpICYmIHZhbHVlLmxlbmd0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBDYXN0cyB0byBTdHJpbmdcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKCB2YWx1ZSA9PT0gbnVsbCApIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZSkge1xuICAgIC8vIGhhbmRsZSBkb2N1bWVudHMgYmVpbmcgcGFzc2VkXG4gICAgaWYgKHZhbHVlLl9pZCAmJiAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlLl9pZCkge1xuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcbiAgICB9XG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG52YXIgZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVycm9yTWVzc2FnZXMgPSBlcnJvci5tZXNzYWdlcztcbnZhciBDYXN0RXJyb3IgPSBlcnJvci5DYXN0RXJyb3I7XG52YXIgVmFsaWRhdG9yRXJyb3IgPSBlcnJvci5WYWxpZGF0b3JFcnJvcjtcblxuLyoqXG4gKiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7U3RyaW5nfSBbaW5zdGFuY2VdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTY2hlbWFUeXBlIChwYXRoLCBvcHRpb25zLCBpbnN0YW5jZSkge1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gIHRoaXMudmFsaWRhdG9ycyA9IFtdO1xuICB0aGlzLnNldHRlcnMgPSBbXTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSBpZiAodGhpc1tpXSAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpc1tpXSkge1xuICAgIHZhciBvcHRzID0gQXJyYXkuaXNBcnJheShvcHRpb25zW2ldKVxuICAgICAgPyBvcHRpb25zW2ldXG4gICAgICA6IFtvcHRpb25zW2ldXTtcblxuICAgIHRoaXNbaV0uYXBwbHkodGhpcywgb3B0cyk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIGEgZGVmYXVsdCB2YWx1ZSBmb3IgdGhpcyBTY2hlbWFUeXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBkZWZhdWx0OiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpXG4gKiAgICAgdmFyIG0gPSBuZXcgTTtcbiAqICAgICBjb25zb2xlLmxvZyhtLm4pIC8vIDEwXG4gKlxuICogRGVmYXVsdHMgY2FuIGJlIGVpdGhlciBgZnVuY3Rpb25zYCB3aGljaCByZXR1cm4gdGhlIHZhbHVlIHRvIHVzZSBhcyB0aGUgZGVmYXVsdCBvciB0aGUgbGl0ZXJhbCB2YWx1ZSBpdHNlbGYuIEVpdGhlciB3YXksIHRoZSB2YWx1ZSB3aWxsIGJlIGNhc3QgYmFzZWQgb24gaXRzIHNjaGVtYSB0eXBlIGJlZm9yZSBiZWluZyBzZXQgZHVyaW5nIGRvY3VtZW50IGNyZWF0aW9uLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICAvLyB2YWx1ZXMgYXJlIGNhc3Q6XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBhTnVtYmVyOiBOdW1iZXIsIGRlZmF1bHQ6IFwiNC44MTUxNjIzNDJcIiB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpXG4gKiAgICAgdmFyIG0gPSBuZXcgTTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmFOdW1iZXIpIC8vIDQuODE1MTYyMzQyXG4gKlxuICogICAgIC8vIGRlZmF1bHQgdW5pcXVlIG9iamVjdHMgZm9yIE1peGVkIHR5cGVzOlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbWl4ZWQ6IFNjaGVtYS5UeXBlcy5NaXhlZCB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbWl4ZWQnKS5kZWZhdWx0KGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiB7fTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gaWYgd2UgZG9uJ3QgdXNlIGEgZnVuY3Rpb24gdG8gcmV0dXJuIG9iamVjdCBsaXRlcmFscyBmb3IgTWl4ZWQgZGVmYXVsdHMsXG4gKiAgICAgLy8gZWFjaCBkb2N1bWVudCB3aWxsIHJlY2VpdmUgYSByZWZlcmVuY2UgdG8gdGhlIHNhbWUgb2JqZWN0IGxpdGVyYWwgY3JlYXRpbmdcbiAqICAgICAvLyBhIFwic2hhcmVkXCIgb2JqZWN0IGluc3RhbmNlOlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbWl4ZWQ6IFNjaGVtYS5UeXBlcy5NaXhlZCB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbWl4ZWQnKS5kZWZhdWx0KHt9KTtcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKTtcbiAqICAgICB2YXIgbTEgPSBuZXcgTTtcbiAqICAgICBtMS5taXhlZC5hZGRlZCA9IDE7XG4gKiAgICAgY29uc29sZS5sb2cobTEubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqICAgICB2YXIgbTIgPSBuZXcgTTtcbiAqICAgICBjb25zb2xlLmxvZyhtMi5taXhlZCk7IC8vIHsgYWRkZWQ6IDEgfVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb258YW55fSB2YWwgdGhlIGRlZmF1bHQgdmFsdWVcbiAqIEByZXR1cm4ge2RlZmF1bHRWYWx1ZX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmRlZmF1bHQgPSBmdW5jdGlvbiAodmFsKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nXG4gICAgICA/IHZhbFxuICAgICAgOiB0aGlzLmNhc3QoIHZhbCApO1xuXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgfSBlbHNlIGlmICggYXJndW1lbnRzLmxlbmd0aCA+IDEgKSB7XG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBfLnRvQXJyYXkoIGFyZ3VtZW50cyApO1xuICB9XG4gIHJldHVybiB0aGlzLmRlZmF1bHRWYWx1ZTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHNldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGZ1bmN0aW9uIGNhcGl0YWxpemUgKHZhbCkge1xuICogICAgICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2YWwpIHZhbCA9ICcnO1xuICogICAgICAgcmV0dXJuIHZhbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbC5zdWJzdHJpbmcoMSk7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGNhcGl0YWxpemUgfX0pXG4gKlxuICogICAgIC8vIG9yIGJ5IHJldHJlaXZpbmcgaXRzIFNjaGVtYVR5cGVcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSlcbiAqICAgICBzLnBhdGgoJ25hbWUnKS5zZXQoY2FwaXRhbGl6ZSlcbiAqXG4gKiBTZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIGRhdGEgYmVmb3JlIGl0IGdldHMgdG8gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IGFuZCBpcyBzZXQgYXMgYSB2YWx1ZSBvbiBhbiBhY3R1YWwga2V5LlxuICpcbiAqIFN1cHBvc2UgeW91IGFyZSBpbXBsZW1lbnRpbmcgdXNlciByZWdpc3RyYXRpb24gZm9yIGEgd2Vic2l0ZS4gVXNlcnMgcHJvdmlkZSBhbiBlbWFpbCBhbmQgcGFzc3dvcmQsIHdoaWNoIGdldHMgc2F2ZWQgdG8gbW9uZ29kYi4gVGhlIGVtYWlsIGlzIGEgc3RyaW5nIHRoYXQgeW91IHdpbGwgd2FudCB0byBub3JtYWxpemUgdG8gbG93ZXIgY2FzZSwgaW4gb3JkZXIgdG8gYXZvaWQgb25lIGVtYWlsIGhhdmluZyBtb3JlIHRoYW4gb25lIGFjY291bnQgLS0gZS5nLiwgb3RoZXJ3aXNlLCBhdmVudWVAcS5jb20gY2FuIGJlIHJlZ2lzdGVyZWQgZm9yIDIgYWNjb3VudHMgdmlhIGF2ZW51ZUBxLmNvbSBhbmQgQXZFblVlQFEuQ29NLlxuICpcbiAqIFlvdSBjYW4gc2V0IHVwIGVtYWlsIGxvd2VyIGNhc2Ugbm9ybWFsaXphdGlvbiBlYXNpbHkgdmlhIGEgU3RvcmFnZSBzZXR0ZXIuXG4gKlxuICogICAgIGZ1bmN0aW9uIHRvTG93ZXIgKHYpIHtcbiAqICAgICAgIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVXNlclNjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IHRvTG93ZXIgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBVc2VyID0gZGIubW9kZWwoJ1VzZXInLCBVc2VyU2NoZW1hKVxuICpcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyKHtlbWFpbDogJ0FWRU5VRUBRLkNPTSd9KVxuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpOyAvLyAnYXZlbnVlQHEuY29tJ1xuICpcbiAqICAgICAvLyBvclxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXJcbiAqICAgICB1c2VyLmVtYWlsID0gJ0F2ZW51ZUBRLmNvbSdcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKSAvLyAnYXZlbnVlQHEuY29tJ1xuICpcbiAqIEFzIHlvdSBjYW4gc2VlIGFib3ZlLCBzZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIGRhdGEgYmVmb3JlIGl0IGdldHMgdG8gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IGFuZCBpcyBzZXQgYXMgYSB2YWx1ZSBvbiBhbiBhY3R1YWwga2V5LlxuICpcbiAqIF9OT1RFOiB3ZSBjb3VsZCBoYXZlIGFsc28ganVzdCB1c2VkIHRoZSBidWlsdC1pbiBgbG93ZXJjYXNlOiB0cnVlYCBTY2hlbWFUeXBlIG9wdGlvbiBpbnN0ZWFkIG9mIGRlZmluaW5nIG91ciBvd24gZnVuY3Rpb24uX1xuICpcbiAqICAgICBuZXcgU2NoZW1hKHsgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBsb3dlcmNhc2U6IHRydWUgfX0pXG4gKlxuICogU2V0dGVycyBhcmUgYWxzbyBwYXNzZWQgYSBzZWNvbmQgYXJndW1lbnQsIHRoZSBzY2hlbWF0eXBlIG9uIHdoaWNoIHRoZSBzZXR0ZXIgd2FzIGRlZmluZWQuIFRoaXMgYWxsb3dzIGZvciB0YWlsb3JlZCBiZWhhdmlvciBiYXNlZCBvbiBvcHRpb25zIHBhc3NlZCBpbiB0aGUgc2NoZW1hLlxuICpcbiAqICAgICBmdW5jdGlvbiBpbnNwZWN0b3IgKHZhbCwgc2NoZW1hdHlwZSkge1xuICogICAgICAgaWYgKHNjaGVtYXR5cGUub3B0aW9ucy5yZXF1aXJlZCkge1xuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyByZXF1aXJlZCc7XG4gKiAgICAgICB9IGVsc2Uge1xuICogICAgICAgICByZXR1cm4gdmFsO1xuICogICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFZpcnVzU2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUsIHNldDogaW5zcGVjdG9yIH0sXG4gKiAgICAgICB0YXhvbm9teTogeyB0eXBlOiBTdHJpbmcsIHNldDogaW5zcGVjdG9yIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVmlydXMgPSBkYi5tb2RlbCgnVmlydXMnLCBWaXJ1c1NjaGVtYSk7XG4gKiAgICAgdmFyIHYgPSBuZXcgVmlydXMoeyBuYW1lOiAnUGFydm92aXJpZGFlJywgdGF4b25vbXk6ICdQYXJ2b3ZpcmluYWUnIH0pO1xuICpcbiAqICAgICBjb25zb2xlLmxvZyh2Lm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxuICogICAgIGNvbnNvbGUubG9nKHYudGF4b25vbXkpOyAvLyBQYXJ2b3ZpcmluYWVcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgZm4pXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBzZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgZ2V0dGVyIHRvIHRoaXMgc2NoZW1hdHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZnVuY3Rpb24gZG9iICh2YWwpIHtcbiAqICAgICAgIGlmICghdmFsKSByZXR1cm4gdmFsO1xuICogICAgICAgcmV0dXJuICh2YWwuZ2V0TW9udGgoKSArIDEpICsgXCIvXCIgKyB2YWwuZ2V0RGF0ZSgpICsgXCIvXCIgKyB2YWwuZ2V0RnVsbFllYXIoKTtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIGRlZmluaW5nIHdpdGhpbiB0aGUgc2NoZW1hXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCBnZXQ6IGRvYiB9KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogRGF0ZSB9KVxuICogICAgIHMucGF0aCgnYm9ybicpLmdldChkb2IpXG4gKlxuICogR2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBhcyBpdCB0cmF2ZWxzIGZyb20gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IHRvIHRoZSB2YWx1ZSB0aGF0IHlvdSBzZWUuXG4gKlxuICogU3VwcG9zZSB5b3UgYXJlIHN0b3JpbmcgY3JlZGl0IGNhcmQgbnVtYmVycyBhbmQgeW91IHdhbnQgdG8gaGlkZSBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgbGFzdCA0IGRpZ2l0cyB0byB0aGUgbW9uZ29vc2UgdXNlci4gWW91IGNhbiBkbyBzbyBieSBkZWZpbmluZyBhIGdldHRlciBpbiB0aGUgZm9sbG93aW5nIHdheTpcbiAqXG4gKiAgICAgZnVuY3Rpb24gb2JmdXNjYXRlIChjYykge1xuICogICAgICAgcmV0dXJuICcqKioqLSoqKiotKioqKi0nICsgY2Muc2xpY2UoY2MubGVuZ3RoLTQsIGNjLmxlbmd0aCk7XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgQWNjb3VudFNjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgY3JlZGl0Q2FyZE51bWJlcjogeyB0eXBlOiBTdHJpbmcsIGdldDogb2JmdXNjYXRlIH1cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIEFjY291bnQgPSBkYi5tb2RlbCgnQWNjb3VudCcsIEFjY291bnRTY2hlbWEpO1xuICpcbiAqICAgICBBY2NvdW50LmZpbmRCeUlkKGlkLCBmdW5jdGlvbiAoZXJyLCBmb3VuZCkge1xuICogICAgICAgY29uc29sZS5sb2coZm91bmQuY3JlZGl0Q2FyZE51bWJlcik7IC8vICcqKioqLSoqKiotKioqKi0xMjM0J1xuICogICAgIH0pO1xuICpcbiAqIEdldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgZ2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cbiAqXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgbm90JztcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBnZXQ6IGluc3BlY3RvciB9LFxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IGluc3BlY3RvciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xuICpcbiAqICAgICBWaXJ1cy5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgdmlydXMpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxuICogICAgICAgY29uc29sZS5sb2codmlydXMudGF4b25vbXkpOyAvLyB0YXhvbm9teSBpcyBub3RcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBmbilcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGdldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgdmFsaWRhdG9yKHMpIGZvciB0aGlzIGRvY3VtZW50IHBhdGguXG4gKlxuICogVmFsaWRhdG9ycyBhbHdheXMgcmVjZWl2ZSB0aGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgdGhlaXIgZmlyc3QgYXJndW1lbnQgYW5kIG11c3QgcmV0dXJuIGBCb29sZWFuYC4gUmV0dXJuaW5nIGBmYWxzZWAgbWVhbnMgdmFsaWRhdGlvbiBmYWlsZWQuXG4gKlxuICogVGhlIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQgaXMgb3B0aW9uYWwuIElmIG5vdCBwYXNzZWQsIHRoZSBbZGVmYXVsdCBnZW5lcmljIGVycm9yIG1lc3NhZ2UgdGVtcGxhdGVdKCNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXMpIHdpbGwgYmUgdXNlZC5cbiAqXG4gKiAjIyMjRXhhbXBsZXM6XG4gKlxuICogICAgIC8vIG1ha2Ugc3VyZSBldmVyeSB2YWx1ZSBpcyBlcXVhbCB0byBcInNvbWV0aGluZ1wiXG4gKiAgICAgZnVuY3Rpb24gdmFsaWRhdG9yICh2YWwpIHtcbiAqICAgICAgIHJldHVybiB2YWwgPT0gJ3NvbWV0aGluZyc7XG4gKiAgICAgfVxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IHZhbGlkYXRvciB9fSk7XG4gKlxuICogICAgIC8vIHdpdGggYSBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICpcbiAqICAgICB2YXIgY3VzdG9tID0gW3ZhbGlkYXRvciwgJ1VoIG9oLCB7UEFUSH0gZG9lcyBub3QgZXF1YWwgXCJzb21ldGhpbmdcIi4nXVxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IGN1c3RvbSB9fSk7XG4gKlxuICogICAgIC8vIGFkZGluZyBtYW55IHZhbGlkYXRvcnMgYXQgYSB0aW1lXG4gKlxuICogICAgIHZhciBtYW55ID0gW1xuICogICAgICAgICB7IHZhbGlkYXRvcjogdmFsaWRhdG9yLCBtc2c6ICd1aCBvaCcgfVxuICogICAgICAgLCB7IHZhbGlkYXRvcjogYW5vdGhlclZhbGlkYXRvciwgbXNnOiAnZmFpbGVkJyB9XG4gKiAgICAgXVxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IG1hbnkgfX0pO1xuICpcbiAqICAgICAvLyBvciB1dGlsaXppbmcgU2NoZW1hVHlwZSBtZXRob2RzIGRpcmVjdGx5OlxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG5hbWU6ICdzdHJpbmcnIH0pO1xuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykudmFsaWRhdGUodmFsaWRhdG9yLCAndmFsaWRhdGlvbiBvZiBge1BBVEh9YCBmYWlsZWQgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnKTtcbiAqXG4gKiAjIyMjRXJyb3IgbWVzc2FnZSB0ZW1wbGF0ZXM6XG4gKlxuICogRnJvbSB0aGUgZXhhbXBsZXMgYWJvdmUsIHlvdSBtYXkgaGF2ZSBub3RpY2VkIHRoYXQgZXJyb3IgbWVzc2FnZXMgc3VwcG9ydCBiYXNlaWMgdGVtcGxhdGluZy4gVGhlcmUgYXJlIGEgZmV3IG90aGVyIHRlbXBsYXRlIGtleXdvcmRzIGJlc2lkZXMgYHtQQVRIfWAgYW5kIGB7VkFMVUV9YCB0b28uIFRvIGZpbmQgb3V0IG1vcmUsIGRldGFpbHMgYXJlIGF2YWlsYWJsZSBbaGVyZV0oI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlcylcbiAqXG4gKiAjIyMjQXN5bmNocm9ub3VzIHZhbGlkYXRpb246XG4gKlxuICogUGFzc2luZyBhIHZhbGlkYXRvciBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHR3byBhcmd1bWVudHMgdGVsbHMgbW9uZ29vc2UgdGhhdCB0aGUgdmFsaWRhdG9yIGlzIGFuIGFzeW5jaHJvbm91cyB2YWxpZGF0b3IuIFRoZSBmaXJzdCBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIHZhbGlkYXRvciBmdW5jdGlvbiBpcyB0aGUgdmFsdWUgYmVpbmcgdmFsaWRhdGVkLiBUaGUgc2Vjb25kIGFyZ3VtZW50IGlzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBtdXN0IGNhbGxlZCB3aGVuIHlvdSBmaW5pc2ggdmFsaWRhdGluZyB0aGUgdmFsdWUgYW5kIHBhc3NlZCBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWAgdG8gY29tbXVuaWNhdGUgZWl0aGVyIHN1Y2Nlc3Mgb3IgZmFpbHVyZSByZXNwZWN0aXZlbHkuXG4gKlxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykudmFsaWRhdGUoZnVuY3Rpb24gKHZhbHVlLCByZXNwb25kKSB7XG4gKiAgICAgICBkb1N0dWZmKHZhbHVlLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICAgIC4uLlxuICogICAgICAgICByZXNwb25kKGZhbHNlKTsgLy8gdmFsaWRhdGlvbiBmYWlsZWRcbiAqICAgICAgIH0pXG4qICAgICAgfSwgJ3tQQVRIfSBmYWlsZWQgdmFsaWRhdGlvbi4nKTtcbipcbiAqIFlvdSBtaWdodCB1c2UgYXN5bmNocm9ub3VzIHZhbGlkYXRvcnMgdG8gcmV0cmVpdmUgb3RoZXIgZG9jdW1lbnRzIGZyb20gdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlIGFnYWluc3Qgb3IgdG8gbWVldCBvdGhlciBJL08gYm91bmQgdmFsaWRhdGlvbiBuZWVkcy5cbiAqXG4gKiBWYWxpZGF0aW9uIG9jY3VycyBgcHJlKCdzYXZlJylgIG9yIHdoZW5ldmVyIHlvdSBtYW51YWxseSBleGVjdXRlIFtkb2N1bWVudCN2YWxpZGF0ZV0oI2RvY3VtZW50X0RvY3VtZW50LXZhbGlkYXRlKS5cbiAqXG4gKiBJZiB2YWxpZGF0aW9uIGZhaWxzIGR1cmluZyBgcHJlKCdzYXZlJylgIGFuZCBubyBjYWxsYmFjayB3YXMgcGFzc2VkIHRvIHJlY2VpdmUgdGhlIGVycm9yLCBhbiBgZXJyb3JgIGV2ZW50IHdpbGwgYmUgZW1pdHRlZCBvbiB5b3VyIE1vZGVscyBhc3NvY2lhdGVkIGRiIFtjb25uZWN0aW9uXSgjY29ubmVjdGlvbl9Db25uZWN0aW9uKSwgcGFzc2luZyB0aGUgdmFsaWRhdGlvbiBlcnJvciBvYmplY3QgYWxvbmcuXG4gKlxuICogICAgIHZhciBjb25uID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XG4gKiAgICAgY29ubi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogICAgIHZhciBQcm9kdWN0ID0gY29ubi5tb2RlbCgnUHJvZHVjdCcsIHlvdXJTY2hlbWEpO1xuICogICAgIHZhciBkdmQgPSBuZXcgUHJvZHVjdCguLik7XG4gKiAgICAgZHZkLnNhdmUoKTsgLy8gZW1pdHMgZXJyb3Igb24gdGhlIGBjb25uYCBhYm92ZVxuICpcbiAqIElmIHlvdSBkZXNpcmUgaGFuZGxpbmcgdGhlc2UgZXJyb3JzIGF0IHRoZSBNb2RlbCBsZXZlbCwgYXR0YWNoIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8geW91ciBNb2RlbCBhbmQgdGhlIGV2ZW50IHdpbGwgaW5zdGVhZCBiZSBlbWl0dGVkIHRoZXJlLlxuICpcbiAqICAgICAvLyByZWdpc3RlcmluZyBhbiBlcnJvciBsaXN0ZW5lciBvbiB0aGUgTW9kZWwgbGV0cyB1cyBoYW5kbGUgZXJyb3JzIG1vcmUgbG9jYWxseVxuICogICAgIFByb2R1Y3Qub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBwYXJhbSB7UmVnRXhwfEZ1bmN0aW9ufE9iamVjdH0gb2JqIHZhbGlkYXRvclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChvYmosIG1lc3NhZ2UsIHR5cGUpIHtcbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBvYmogfHwgb2JqICYmICdSZWdFeHAnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIG9iai5jb25zdHJ1Y3RvciApKSB7XG4gICAgaWYgKCFtZXNzYWdlKSBtZXNzYWdlID0gZXJyb3JNZXNzYWdlcy5nZW5lcmFsLmRlZmF1bHQ7XG4gICAgaWYgKCF0eXBlKSB0eXBlID0gJ3VzZXIgZGVmaW5lZCc7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW29iaiwgbWVzc2FnZSwgdHlwZV0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmc7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGFyZyA9IGFyZ3VtZW50c1tpXTtcbiAgICBpZiAoIShhcmcgJiYgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggYXJnLmNvbnN0cnVjdG9yICkgKSkge1xuICAgICAgdmFyIG1zZyA9ICdJbnZhbGlkIHZhbGlkYXRvci4gUmVjZWl2ZWQgKCcgKyB0eXBlb2YgYXJnICsgJykgJ1xuICAgICAgICArIGFyZ1xuICAgICAgICArICcuIFNlZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9hcGkuaHRtbCNzY2hlbWF0eXBlX1NjaGVtYVR5cGUtdmFsaWRhdGUnO1xuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZShhcmcudmFsaWRhdG9yLCBhcmcubXNnLCBhcmcudHlwZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIHJlcXVpcmVkIHZhbGlkYXRvciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6IHRydWUgfSlcbiAqXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiAne1BBVEh9IGlzIHJlcXVpcmVkIScgfSlcbiAqXG4gKiAgICAgLy8gb3IgdGhyb3VnaCB0aGUgcGF0aCBBUElcbiAqXG4gKiAgICAgU2NoZW1hLnBhdGgoJ25hbWUnKS5yZXF1aXJlZCh0cnVlKTtcbiAqXG4gKiAgICAgLy8gd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnaW5nXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSwgJ2dycnIgOiggJyk7XG4gKlxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgZW5hYmxlL2Rpc2FibGUgdGhlIHZhbGlkYXRvclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnJlcXVpcmVkID0gZnVuY3Rpb24gKHJlcXVpcmVkLCBtZXNzYWdlKSB7XG4gIGlmIChmYWxzZSA9PT0gcmVxdWlyZWQpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5pc1JlcXVpcmVkID0gZmFsc2U7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaXNSZXF1aXJlZCA9IHRydWU7XG5cbiAgdGhpcy5yZXF1aXJlZFZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XG4gICAgLy8gaW4gaGVyZSwgYHRoaXNgIHJlZmVycyB0byB0aGUgdmFsaWRhdGluZyBkb2N1bWVudC5cbiAgICAvLyBubyB2YWxpZGF0aW9uIHdoZW4gdGhpcyBwYXRoIHdhc24ndCBzZWxlY3RlZCBpbiB0aGUgcXVlcnkuXG4gICAgaWYgKHRoaXMgIT09IHVuZGVmaW5lZCAmJiAvLyDRgdC/0LXRhtC40LDQu9GM0L3QsNGPINC/0YDQvtCy0LXRgNC60LAg0LjQty3Qt9CwIHN0cmljdCBtb2RlINC4INC+0YHQvtCx0LXQvdC90L7RgdGC0LggLmNhbGwodW5kZWZpbmVkKVxuICAgICAgICAnaXNTZWxlY3RlZCcgaW4gdGhpcyAmJlxuICAgICAgICAhdGhpcy5pc1NlbGVjdGVkKHNlbGYucGF0aCkgJiZcbiAgICAgICAgIXRoaXMuaXNNb2RpZmllZChzZWxmLnBhdGgpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBzZWxmLmNoZWNrUmVxdWlyZWQodiwgdGhpcyk7XG4gIH07XG5cbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgcmVxdWlyZWQpIHtcbiAgICBtZXNzYWdlID0gcmVxdWlyZWQ7XG4gICAgcmVxdWlyZWQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLmdlbmVyYWwucmVxdWlyZWQ7XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLnJlcXVpcmVkVmFsaWRhdG9yLCBtc2csICdyZXF1aXJlZCddKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBHZXRzIHRoZSBkZWZhdWx0IHZhbHVlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlIHRoZSBzY29wZSB3aGljaCBjYWxsYmFjayBhcmUgZXhlY3V0ZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmdldERlZmF1bHQgPSBmdW5jdGlvbiAoc2NvcGUsIGluaXQpIHtcbiAgdmFyIHJldCA9ICdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLmRlZmF1bHRWYWx1ZVxuICAgID8gdGhpcy5kZWZhdWx0VmFsdWUuY2FsbChzY29wZSlcbiAgICA6IHRoaXMuZGVmYXVsdFZhbHVlO1xuXG4gIGlmIChudWxsICE9PSByZXQgJiYgdW5kZWZpbmVkICE9PSByZXQpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KHJldCwgc2NvcGUsIGluaXQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBzZXR0ZXJzXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBwYXJhbSB7Kn0gcHJpb3JWYWxcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCkge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcbiAgICByZXR1cm4gaW5pdFxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB0aGlzLmNhc3QodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBzZXR0ZXJzID0gdGhpcy5zZXR0ZXJzXG4gICAgLCBsZW4gPSBzZXR0ZXJzLmxlbmd0aFxuICAgICwgY2FzdGVyID0gdGhpcy5jYXN0ZXI7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodikgJiYgY2FzdGVyICYmIGNhc3Rlci5zZXR0ZXJzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2W2ldID0gY2FzdGVyLmFwcGx5U2V0dGVycyh2W2ldLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghbGVuKSB7XG4gICAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcbiAgICByZXR1cm4gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICB2ID0gc2V0dGVyc1tsZW5dLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcblxuICAvLyBkbyBub3QgY2FzdCB1bnRpbCBhbGwgc2V0dGVycyBhcmUgYXBwbGllZCAjNjY1XG4gIHYgPSB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcblxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGEgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uKCB2YWx1ZSwgc2NvcGUgKXtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHJldHVybiB2YWx1ZTtcblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBnZXR0ZXJzID0gdGhpcy5nZXR0ZXJzXG4gICAgLCBsZW4gPSBnZXR0ZXJzLmxlbmd0aDtcblxuICBpZiAoICFsZW4gKSB7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICB3aGlsZSAoIGxlbi0tICkge1xuICAgIHYgPSBnZXR0ZXJzWyBsZW4gXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuXG4gIHJldHVybiB2O1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhIHZhbGlkYXRpb24gb2YgYHZhbHVlYCB1c2luZyB0aGUgdmFsaWRhdG9ycyBkZWNsYXJlZCBmb3IgdGhpcyBTY2hlbWFUeXBlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgdmFyIGVyciA9IGZhbHNlXG4gICAgLCBwYXRoID0gdGhpcy5wYXRoXG4gICAgLCBjb3VudCA9IHRoaXMudmFsaWRhdG9ycy5sZW5ndGg7XG5cbiAgaWYgKCFjb3VudCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlIChvaywgbWVzc2FnZSwgdHlwZSwgdmFsKSB7XG4gICAgaWYgKGVycikgcmV0dXJuO1xuICAgIGlmIChvayA9PT0gdW5kZWZpbmVkIHx8IG9rKSB7XG4gICAgICAtLWNvdW50IHx8IGNhbGxiYWNrKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhlcnIgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgbWVzc2FnZSwgdHlwZSwgdmFsKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy52YWxpZGF0b3JzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdlswXVxuICAgICAgLCBtZXNzYWdlID0gdlsxXVxuICAgICAgLCB0eXBlID0gdlsyXTtcblxuICAgIGlmICh2YWxpZGF0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci50ZXN0KHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbGlkYXRvcikge1xuICAgICAgaWYgKDIgPT09IHZhbGlkYXRvci5sZW5ndGgpIHtcbiAgICAgICAgdmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlLCBmdW5jdGlvbiAob2spIHtcbiAgICAgICAgICB2YWxpZGF0ZShvaywgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHZhbHVlIGlzIGEgdmFsaWQgUmVmZXJlbmNlLlxuICpcbiAqINCd0LAg0LrQu9C40LXQvdGC0LUg0LIg0LrQsNGH0LXRgdGC0LLQtSDRgdGB0YvQu9C60Lgg0LzQvtC20L3QviDRhdGA0LDQvdC40YLRjCDQutCw0LogaWQsINGC0LDQuiDQuCDQv9C+0LvQvdGL0LUg0LTQvtC60YPQvNC10L3RgtGLXG4gKlxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5faXNSZWYgPSBmdW5jdGlvbiggc2VsZiwgdmFsdWUgKXtcbiAgLy8gZmFzdCBwYXRoXG4gIHZhciByZWYgPSBzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlZjtcblxuICBpZiAoIHJlZiApIHtcbiAgICBpZiAoIG51bGwgPT0gdmFsdWUgKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoIF8uaXNPYmplY3QoIHZhbHVlICkgKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYVR5cGU7XG5cblNjaGVtYVR5cGUuQ2FzdEVycm9yID0gQ2FzdEVycm9yO1xuXG5TY2hlbWFUeXBlLlZhbGlkYXRvckVycm9yID0gVmFsaWRhdG9yRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogU3RhdGVNYWNoaW5lIHJlcHJlc2VudHMgYSBtaW5pbWFsIGBpbnRlcmZhY2VgIGZvciB0aGVcbiAqIGNvbnN0cnVjdG9ycyBpdCBidWlsZHMgdmlhIFN0YXRlTWFjaGluZS5jdG9yKC4uLikuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbnZhciBTdGF0ZU1hY2hpbmUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFN0YXRlTWFjaGluZSAoKSB7XG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdGF0ZXMgPSB7fTtcbn07XG5cbi8qIVxuICogU3RhdGVNYWNoaW5lLmN0b3IoJ3N0YXRlMScsICdzdGF0ZTInLCAuLi4pXG4gKiBBIGZhY3RvcnkgbWV0aG9kIGZvciBzdWJjbGFzc2luZyBTdGF0ZU1hY2hpbmUuXG4gKiBUaGUgYXJndW1lbnRzIGFyZSBhIGxpc3Qgb2Ygc3RhdGVzLiBGb3IgZWFjaCBzdGF0ZSxcbiAqIHRoZSBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZSBnZXRzIHN0YXRlIHRyYW5zaXRpb25cbiAqIG1ldGhvZHMgbmFtZWQgYWZ0ZXIgZWFjaCBzdGF0ZS4gVGhlc2UgdHJhbnNpdGlvbiBtZXRob2RzXG4gKiBwbGFjZSB0aGVpciBwYXRoIGFyZ3VtZW50IGludG8gdGhlIGdpdmVuIHN0YXRlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBzdWJjbGFzcyBjb25zdHJ1Y3RvclxuICogQHByaXZhdGVcbiAqL1xuU3RhdGVNYWNoaW5lLmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcblxuICB2YXIgY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICBTdGF0ZU1hY2hpbmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnN0YXRlTmFtZXMgPSBzdGF0ZXM7XG5cbiAgICB2YXIgaSA9IHN0YXRlcy5sZW5ndGhcbiAgICAgICwgc3RhdGU7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbiAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXSA9IHt9O1xuICAgIH1cbiAgfTtcblxuICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0YXRlTWFjaGluZS5wcm90b3R5cGUgKTtcbiAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXG4gIHN0YXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIC8vIENoYW5nZXMgdGhlIGBwYXRoYCdzIHN0YXRlIHRvIGBzdGF0ZWAuXG4gICAgY3Rvci5wcm90b3R5cGVbc3RhdGVdID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKHBhdGgsIHN0YXRlKTtcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBpcyB3cmFwcGVkIGJ5IHRoZSBzdGF0ZSBjaGFuZ2UgZnVuY3Rpb25zOlxuICpcbiAqIC0gYHJlcXVpcmUocGF0aClgXG4gKiAtIGBtb2RpZnkocGF0aClgXG4gKiAtIGBpbml0KHBhdGgpYFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLl9jaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uIF9jaGFuZ2VTdGF0ZSAocGF0aCwgbmV4dFN0YXRlKSB7XG4gIHZhciBwcmV2QnVja2V0ID0gdGhpcy5zdGF0ZXNbdGhpcy5wYXRoc1twYXRoXV07XG4gIGlmIChwcmV2QnVja2V0KSBkZWxldGUgcHJldkJ1Y2tldFtwYXRoXTtcblxuICB0aGlzLnBhdGhzW3BhdGhdID0gbmV4dFN0YXRlO1xuICB0aGlzLnN0YXRlc1tuZXh0U3RhdGVdW3BhdGhdID0gdHJ1ZTtcbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhciAoc3RhdGUpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnN0YXRlc1tzdGF0ZV0pXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIHBhdGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHBhdGggPSBrZXlzW2ldO1xuICAgIGRlbGV0ZSB0aGlzLnN0YXRlc1tzdGF0ZV1bcGF0aF07XG4gICAgZGVsZXRlIHRoaXMucGF0aHNbcGF0aF07XG4gIH1cbn07XG5cbi8qIVxuICogQ2hlY2tzIHRvIHNlZSBpZiBhdCBsZWFzdCBvbmUgcGF0aCBpcyBpbiB0aGUgc3RhdGVzIHBhc3NlZCBpbiB2aWEgYGFyZ3VtZW50c2BcbiAqIGUuZy4sIHRoaXMuc29tZSgncmVxdWlyZWQnLCAnaW5pdGVkJylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGUgdGhhdCB3ZSB3YW50IHRvIGNoZWNrIGZvci5cbiAqIEBwcml2YXRlXG4gKi9cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3aGF0ID0gYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50cyA6IHRoaXMuc3RhdGVOYW1lcztcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkubGVuZ3RoO1xuICB9KTtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxuICogc2luY2UgYm90aCBvZiB0aG9zZSBtZXRob2RzIHNoYXJlIGEgbG90IG9mIHRoZSBzYW1lIGxvZ2ljLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2l0ZXIgPSBmdW5jdGlvbiBfaXRlciAoaXRlck1ldGhvZCkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBudW1BcmdzID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgLCBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgwLCBudW1BcmdzLTEpXG4gICAgICAsIGNhbGxiYWNrID0gYXJndW1lbnRzW251bUFyZ3MtMV07XG5cbiAgICBpZiAoIXN0YXRlcy5sZW5ndGgpIHN0YXRlcyA9IHRoaXMuc3RhdGVOYW1lcztcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBwYXRocyA9IHN0YXRlcy5yZWR1Y2UoZnVuY3Rpb24gKHBhdGhzLCBzdGF0ZSkge1xuICAgICAgcmV0dXJuIHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyhzZWxmLnN0YXRlc1tzdGF0ZV0pKTtcbiAgICB9LCBbXSk7XG5cbiAgICByZXR1cm4gcGF0aHNbaXRlck1ldGhvZF0oZnVuY3Rpb24gKHBhdGgsIGksIHBhdGhzKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2socGF0aCwgaSwgcGF0aHMpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyohXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHByb2ZpbGUgY2FuIGxvb2sgbGlrZTpcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXG4gKiB0aGlzLmZvckVhY2goZm4pOyAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gYWxsIHN0YXRlc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBwcml2YXRlXG4gKi9cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2ggKCkge1xuICB0aGlzLmZvckVhY2ggPSB0aGlzLl9pdGVyKCdmb3JFYWNoJyk7XG4gIHJldHVybiB0aGlzLmZvckVhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogTWFwcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHByb2ZpbGUgY2FuIGxvb2sgbGlrZTpcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXG4gKiB0aGlzLmZvckVhY2goZm4pOyAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gYWxsIHN0YXRlc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQHByaXZhdGVcbiAqL1xuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAgKCkge1xuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xuICByZXR1cm4gdGhpcy5tYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVE9ETzog0L/QvtGH0LjRgdGC0LjRgtGMINC60L7QtFxuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEVtYmVkZGVkRG9jdW1lbnQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuXG4vKipcbiAqIFN0b3JhZ2UgQXJyYXkgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1ZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIG90aGVyd2lzZSBgU3RvcmFnZUFycmF5I3B1c2hgIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQuX1xuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQGluaGVyaXRzIEFycmF5XG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIF8ubWl4aW4oIGFyciwgU3RvcmFnZUFycmF5Lm1peGluICk7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcbiAgYXJyLmlzU3RvcmFnZUFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG5TdG9yYWdlQXJyYXkubWl4aW4gPSB7XG4gIC8qKlxuICAgKiBQYXJlbnQgb3duZXIgZG9jdW1lbnRcbiAgICpcbiAgICogQHByb3BlcnR5IF9wYXJlbnRcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfcGFyZW50OiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIENhc3RzIGEgbWVtYmVyIGJhc2VkIG9uIHRoaXMgYXJyYXlzIHNjaGVtYS5cbiAgICpcbiAgICogQHBhcmFtIHsqfSB2YWx1ZVxuICAgKiBAcmV0dXJuIHZhbHVlIHRoZSBjYXN0ZWQgdmFsdWVcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfY2FzdDogZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgICB2YXIgb3duZXIgPSB0aGlzLl9vd25lcjtcbiAgICB2YXIgcG9wdWxhdGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAvLyBpZiBhIHBvcHVsYXRlZCBhcnJheSwgd2UgbXVzdCBjYXN0IHRvIHRoZSBzYW1lIG1vZGVsXG4gICAgICAvLyBpbnN0YW5jZSBhcyBzcGVjaWZpZWQgaW4gdGhlIG9yaWdpbmFsIHF1ZXJ5LlxuICAgICAgaWYgKCFvd25lcikge1xuICAgICAgICBvd25lciA9IHRoaXMuX293bmVyID0gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICA/IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50KClcbiAgICAgICAgICA6IHRoaXMuX3BhcmVudDtcbiAgICAgIH1cblxuICAgICAgcG9wdWxhdGVkID0gb3duZXIucG9wdWxhdGVkKHRoaXMuX3BhdGgsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChwb3B1bGF0ZWQgJiYgbnVsbCAhPSB2YWx1ZSkge1xuICAgICAgLy8gY2FzdCB0byB0aGUgcG9wdWxhdGVkIE1vZGVscyBzY2hlbWFcbiAgICAgIHZhciBNb2RlbCA9IHBvcHVsYXRlZC5vcHRpb25zLm1vZGVsO1xuXG4gICAgICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gICAgICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gICAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgICAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBnaC0yMzk5XG4gICAgICAvLyB3ZSBzaG91bGQgY2FzdCBtb2RlbCBvbmx5IHdoZW4gaXQncyBub3QgYSBkaXNjcmltaW5hdG9yXG4gICAgICB2YXIgaXNEaXNjID0gdmFsdWUuc2NoZW1hICYmIHZhbHVlLnNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZyAmJlxuICAgICAgICB2YWx1ZS5zY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcua2V5ICE9PSB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWlzRGlzYykge1xuICAgICAgICB2YWx1ZSA9IG5ldyBNb2RlbCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZW1hLmNhc3Rlci5jYXN0KHZhbHVlLCB0aGlzLl9wYXJlbnQsIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9zY2hlbWEuY2FzdGVyLmNhc3QodmFsdWUsIHRoaXMuX3BhcmVudCwgZmFsc2UpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBNYXJrcyB0aGlzIGFycmF5IGFzIG1vZGlmaWVkLlxuICAgKlxuICAgKiBJZiBpdCBidWJibGVzIHVwIGZyb20gYW4gZW1iZWRkZWQgZG9jdW1lbnQgY2hhbmdlLCB0aGVuIGl0IHRha2VzIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzIChvdGhlcndpc2UsIHRha2VzIDAgYXJndW1lbnRzKVxuICAgKlxuICAgKiBAcGFyYW0ge0VtYmVkZGVkRG9jdW1lbnR9IGVtYmVkZGVkRG9jIHRoZSBlbWJlZGRlZCBkb2MgdGhhdCBpbnZva2VkIHRoaXMgbWV0aG9kIG9uIHRoZSBBcnJheVxuICAgKiBAcGFyYW0ge1N0cmluZ30gZW1iZWRkZWRQYXRoIHRoZSBwYXRoIHdoaWNoIGNoYW5nZWQgaW4gdGhlIGVtYmVkZGVkRG9jXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX21hcmtNb2RpZmllZDogZnVuY3Rpb24gKGVsZW0sIGVtYmVkZGVkUGF0aCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLl9wYXJlbnRcbiAgICAgICwgZGlydHlQYXRoO1xuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgZGlydHlQYXRoID0gdGhpcy5fcGF0aDtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKG51bGwgIT0gZW1iZWRkZWRQYXRoKSB7XG4gICAgICAgICAgLy8gYW4gZW1iZWRkZWQgZG9jIGJ1YmJsZWQgdXAgdGhlIGNoYW5nZVxuICAgICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIHRoaXMuaW5kZXhPZihlbGVtKSArICcuJyArIGVtYmVkZGVkUGF0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBkaXJlY3RseSBzZXQgYW4gaW5kZXhcbiAgICAgICAgICBkaXJ0eVBhdGggPSBkaXJ0eVBhdGggKyAnLicgKyBlbGVtO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBhcmVudC5tYXJrTW9kaWZpZWQoZGlydHlQYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSNwdXNoYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcHVzaCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gW2FyZ3MuLi5dXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwdXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgcmV0ID0gW10ucHVzaC5hcHBseSh0aGlzLCB2YWx1ZXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHMgW2BBcnJheSNwb3BgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wb3ApIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkIHdoaWNoIHdpbGwgcGFzcyB0aGUgZW50aXJlIHRoaW5nIHRvICRzZXQgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAc2VlIFN0b3JhZ2VBcnJheSMkcG9wICN0eXBlc19hcnJheV9TdG9yYWdlQXJyYXktJTI0cG9wXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwb3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10ucG9wLmNhbGwodGhpcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NoaWZ0YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvdW5zaGlmdCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIGRvYy5hcnJheSA9IFsyLDNdO1xuICAgKiAgICAgdmFyIHJlcyA9IGRvYy5hcnJheS5zaGlmdCgpO1xuICAgKiAgICAgY29uc29sZS5sb2cocmVzKSAvLyAyXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFszXVxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc2hpZnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10uc2hpZnQuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFB1bGxzIGl0ZW1zIGZyb20gdGhlIGFycmF5IGF0b21pY2FsbHkuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlczpcbiAgICpcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKE9iamVjdElkKVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoeyBfaWQ6ICdzb21lSWQnIH0pXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCgzNilcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKCd0YWcgMScsICd0YWcgMicpXG4gICAqXG4gICAqIFRvIHJlbW92ZSBhIGRvY3VtZW50IGZyb20gYSBzdWJkb2N1bWVudCBhcnJheSB3ZSBtYXkgcGFzcyBhbiBvYmplY3Qgd2l0aCBhIG1hdGNoaW5nIGBfaWRgLlxuICAgKlxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVzaCh7IF9pZDogNDgxNTE2MjM0MiB9KVxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCh7IF9pZDogNDgxNTE2MjM0MiB9KSAvLyByZW1vdmVkXG4gICAqXG4gICAqIE9yIHdlIG1heSBwYXNzaW5nIHRoZSBfaWQgZGlyZWN0bHkgYW5kIGxldCBzdG9yYWdlIHRha2UgY2FyZSBvZiBpdC5cbiAgICpcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1bGwoNDgxNTE2MjM0Mik7IC8vIHdvcmtzXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gYXJndW1lbnRzXG4gICAqIEBzZWUgbW9uZ29kYiBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZy8jVXBkYXRpbmctJTI0cHVsbFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVsbDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIGN1ciA9IHRoaXMuX3BhcmVudC5nZXQodGhpcy5fcGF0aClcbiAgICAgICwgaSA9IGN1ci5sZW5ndGhcbiAgICAgICwgbWVtO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgbWVtID0gY3VyW2ldO1xuICAgICAgaWYgKG1lbSBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jdW1lbnQpIHtcbiAgICAgICAgaWYgKHZhbHVlcy5zb21lKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2LmVxdWFscyhtZW0pOyB9ICkpIHtcbiAgICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKH5jdXIuaW5kZXhPZi5jYWxsKHZhbHVlcywgbWVtKSkge1xuICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NwbGljZWBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NwbGljZSkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nIGFuZCBjYXN0aW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKCkge1xuICAgIHZhciByZXQsIHZhbHMsIGk7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdmFscyA9IFtdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YWxzW2ldID0gaSA8IDJcbiAgICAgICAgICA/IGFyZ3VtZW50c1tpXVxuICAgICAgICAgIDogdGhpcy5fY2FzdChhcmd1bWVudHNbaV0pO1xuICAgICAgfVxuICAgICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xuXG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB1bnNoaWZ0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XG4gICAgW10udW5zaGlmdC5hcHBseSh0aGlzLCB2YWx1ZXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NvcnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zb3J0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOT1RFOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzb3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldCA9IFtdLnNvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgdmFsdWVzIHRvIHRoZSBhcnJheSBpZiBub3QgYWxyZWFkeSBwcmVzZW50LlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICAgKiAgICAgdmFyIGFkZGVkID0gZG9jLmFycmF5LmFkZFRvU2V0KDQsNSk7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNCw1XVxuICAgKiAgICAgY29uc29sZS5sb2coYWRkZWQpICAgICAvLyBbNV1cbiAgICpcbiAgICogQHBhcmFtIHsqfSBhcmd1bWVudHNcbiAgICogQHJldHVybiB7QXJyYXl9IHRoZSB2YWx1ZXMgdGhhdCB3ZXJlIGFkZGVkXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBhZGRUb1NldDogZnVuY3Rpb24gYWRkVG9TZXQgKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIGFkZGVkID0gW11cbiAgICAgICwgdHlwZSA9IHZhbHVlc1swXSBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jdW1lbnQgPyAnZG9jJyA6XG4gICAgICAgICAgICAgICB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBEYXRlID8gJ2RhdGUnIDpcbiAgICAgICAgICAgICAgICcnO1xuXG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBmb3VuZDtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdkb2MnOlxuICAgICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGRvYyl7IHJldHVybiBkb2MuZXF1YWxzKHYpOyB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgdmFyIHZhbCA9ICt2O1xuICAgICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGQpeyByZXR1cm4gK2QgPT09IHZhbDsgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZm91bmQgPSB+dGhpcy5pbmRleE9mKHYpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIFtdLnB1c2guY2FsbCh0aGlzLCB2KTtcblxuICAgICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICAgICAgW10ucHVzaC5jYWxsKGFkZGVkLCB2KTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiBhZGRlZDtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB0aGUgY2FzdGVkIGB2YWxgIGF0IGluZGV4IGBpYCBhbmQgbWFya3MgdGhlIGFycmF5IG1vZGlmaWVkLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIC8vIGdpdmVuIGRvY3VtZW50cyBiYXNlZCBvbiB0aGUgZm9sbG93aW5nXG4gICAqICAgICB2YXIgZG9jcyA9IHN0b3JhZ2UuY3JlYXRlQ29sbGVjdGlvbignRG9jJywgbmV3IFNjaGVtYSh7IGFycmF5OiBbTnVtYmVyXSB9KSk7XG4gICAqXG4gICAqICAgICB2YXIgZG9jID0gZG9jcy5hZGQoeyBhcnJheTogWzIsMyw0XSB9KVxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqXG4gICAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KTsgLy8gWzIsNSw0XSAvLyBwcm9wZXJseSBjYXN0IHRvIG51bWJlclxuICAgKiAgICAgZG9jLnNhdmUoKSAvLyB0aGUgY2hhbmdlIGlzIHNhdmVkXG4gICAqXG4gICAqICAgICAvLyBWUyBub3QgdXNpbmcgYXJyYXkjc2V0XG4gICAqICAgICBkb2MuYXJyYXlbMV0gPSBcIjVcIjtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlIGlzIG5vdCBzYXZlZFxuICAgKlxuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc2V0OiBmdW5jdGlvbiAoaSwgdmFsKSB7XG4gICAgdGhpc1tpXSA9IHRoaXMuX2Nhc3QodmFsKTtcbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoaSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge0FycmF5fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9PYmplY3Q6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXR1cm4gZG9jIGluc3RhbmNlb2YgRG9jdW1lbnRcbiAgICAgICAgICA/IGRvYy50b09iamVjdChvcHRpb25zKVxuICAgICAgICAgIDogZG9jO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoKTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBpbmRleCBvZiBgb2JqYCBvciBgLTFgIGlmIG5vdCBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgaXRlbSB0byBsb29rIGZvclxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBpbmRleE9mOiBmdW5jdGlvbiBpbmRleE9mIChvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgT2JqZWN0SWQpIG9iaiA9IG9iai50b1N0cmluZygpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBpZiAob2JqID09IHRoaXNbaV0pXG4gICAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cbn07XG5cbi8qKlxuICogQWxpYXMgb2YgW3B1bGxdKCN0eXBlc19hcnJheV9TdG9yYWdlQXJyYXktcHVsbClcbiAqXG4gKiBAc2VlIFN0b3JhZ2VBcnJheSNwdWxsICN0eXBlc19hcnJheV9TdG9yYWdlQXJyYXktcHVsbFxuICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gKiBAYXBpIHB1YmxpY1xuICogQG1lbWJlck9mIFN0b3JhZ2VBcnJheVxuICogQG1ldGhvZCByZW1vdmVcbiAqL1xuU3RvcmFnZUFycmF5Lm1peGluLnJlbW92ZSA9IFN0b3JhZ2VBcnJheS5taXhpbi5wdWxsO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUFycmF5O1xuIiwiKGZ1bmN0aW9uIChCdWZmZXIpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEJpbmFyeSA9IHJlcXVpcmUoJy4uL2JpbmFyeScpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBTdG9yYWdlIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBWYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyfSB2YWx1ZVxuICogQHBhcmFtIHtTdHJpbmd9IGVuY29kZVxuICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldFxuICogQGFwaSBwcml2YXRlXG4gKiBAaW5oZXJpdHMgQnVmZmVyXG4gKi9cblxuZnVuY3Rpb24gU3RvcmFnZUJ1ZmZlciAodmFsdWUsIGVuY29kZSwgb2Zmc2V0KSB7XG4gIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICB2YXIgdmFsO1xuXG4gIGlmICgwID09PSBsZW5ndGggfHwgbnVsbCA9PT0gYXJndW1lbnRzWzBdIHx8IHVuZGVmaW5lZCA9PT0gYXJndW1lbnRzWzBdKSB7XG4gICAgdmFsID0gMDtcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSB2YWx1ZTtcbiAgfVxuXG4gIHZhciBlbmNvZGluZztcbiAgdmFyIHBhdGg7XG4gIHZhciBkb2M7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoZW5jb2RlKSkge1xuICAgIC8vIGludGVybmFsIGNhc3RpbmdcbiAgICBwYXRoID0gZW5jb2RlWzBdO1xuICAgIGRvYyA9IGVuY29kZVsxXTtcbiAgfSBlbHNlIHtcbiAgICBlbmNvZGluZyA9IGVuY29kZTtcbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcsIG9mZnNldCk7XG4gIF8ubWl4aW4oIGJ1ZiwgU3RvcmFnZUJ1ZmZlci5taXhpbiApO1xuICBidWYuaXNTdG9yYWdlQnVmZmVyID0gdHJ1ZTtcblxuICAvLyBtYWtlIHN1cmUgdGhlc2UgaW50ZXJuYWwgcHJvcHMgZG9uJ3Qgc2hvdyB1cCBpbiBPYmplY3Qua2V5cygpXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGJ1Ziwge1xuICAgICAgdmFsaWRhdG9yczogeyB2YWx1ZTogW10gfVxuICAgICwgX3BhdGg6IHsgdmFsdWU6IHBhdGggfVxuICAgICwgX3BhcmVudDogeyB2YWx1ZTogZG9jIH1cbiAgfSk7XG5cbiAgaWYgKGRvYyAmJiAnc3RyaW5nJyA9PT0gdHlwZW9mIHBhdGgpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoYnVmLCAnX3NjaGVtYScsIHtcbiAgICAgICAgdmFsdWU6IGRvYy5zY2hlbWEucGF0aChwYXRoKVxuICAgIH0pO1xuICB9XG5cbiAgYnVmLl9zdWJ0eXBlID0gMDtcbiAgcmV0dXJuIGJ1Zjtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gQnVmZmVyLlxuICovXG5cbi8vU3RvcmFnZUJ1ZmZlci5wcm90b3R5cGUgPSBuZXcgQnVmZmVyKDApO1xuXG5TdG9yYWdlQnVmZmVyLm1peGluID0ge1xuXG4gIC8qKlxuICAgKiBQYXJlbnQgb3duZXIgZG9jdW1lbnRcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqIEBwcm9wZXJ0eSBfcGFyZW50XG4gICAqL1xuXG4gIF9wYXJlbnQ6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogRGVmYXVsdCBzdWJ0eXBlIGZvciB0aGUgQmluYXJ5IHJlcHJlc2VudGluZyB0aGlzIEJ1ZmZlclxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICogQHByb3BlcnR5IF9zdWJ0eXBlXG4gICAqL1xuXG4gIF9zdWJ0eXBlOiB1bmRlZmluZWQsXG5cbiAgLyoqXG4gICAqIE1hcmtzIHRoaXMgYnVmZmVyIGFzIG1vZGlmaWVkLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgX21hcmtNb2RpZmllZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBwYXJlbnQubWFya01vZGlmaWVkKHRoaXMuX3BhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogV3JpdGVzIHRoZSBidWZmZXIuXG4gICAqL1xuXG4gIHdyaXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyaXR0ZW4gPSBCdWZmZXIucHJvdG90eXBlLndyaXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBpZiAod3JpdHRlbiA+IDApIHtcbiAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIHJldHVybiB3cml0dGVuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb3BpZXMgdGhlIGJ1ZmZlci5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIGBCdWZmZXIjY29weWAgZG9lcyBub3QgbWFyayBgdGFyZ2V0YCBhcyBtb2RpZmllZCBzbyB5b3UgbXVzdCBjb3B5IGZyb20gYSBgU3RvcmFnZUJ1ZmZlcmAgZm9yIGl0IHRvIHdvcmsgYXMgZXhwZWN0ZWQuIFRoaXMgaXMgYSB3b3JrIGFyb3VuZCBzaW5jZSBgY29weWAgbW9kaWZpZXMgdGhlIHRhcmdldCwgbm90IHRoaXMuXG4gICAqXG4gICAqIEByZXR1cm4ge1N0b3JhZ2VCdWZmZXJ9XG4gICAqIEBwYXJhbSB7QnVmZmVyfSB0YXJnZXRcbiAgICovXG5cbiAgY29weTogZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciByZXQgPSBCdWZmZXIucHJvdG90eXBlLmNvcHkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0LmlzU3RvcmFnZUJ1ZmZlcikge1xuICAgICAgdGFyZ2V0Ll9tYXJrTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG4vKiFcbiAqIENvbXBpbGUgb3RoZXIgQnVmZmVyIG1ldGhvZHMgbWFya2luZyB0aGlzIGJ1ZmZlciBhcyBtb2RpZmllZC5cbiAqL1xuXG47KFxuLy8gbm9kZSA8IDAuNVxuJ3dyaXRlVUludDggd3JpdGVVSW50MTYgd3JpdGVVSW50MzIgd3JpdGVJbnQ4IHdyaXRlSW50MTYgd3JpdGVJbnQzMiAnICtcbid3cml0ZUZsb2F0IHdyaXRlRG91YmxlIGZpbGwgJyArXG4ndXRmOFdyaXRlIGJpbmFyeVdyaXRlIGFzY2lpV3JpdGUgc2V0ICcgK1xuXG4vLyBub2RlID49IDAuNVxuJ3dyaXRlVUludDE2TEUgd3JpdGVVSW50MTZCRSB3cml0ZVVJbnQzMkxFIHdyaXRlVUludDMyQkUgJyArXG4nd3JpdGVJbnQxNkxFIHdyaXRlSW50MTZCRSB3cml0ZUludDMyTEUgd3JpdGVJbnQzMkJFICcgK1xuJ3dyaXRlRmxvYXRMRSB3cml0ZUZsb2F0QkUgd3JpdGVEb3VibGVMRSB3cml0ZURvdWJsZUJFJ1xuKS5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICBpZiAoIUJ1ZmZlci5wcm90b3R5cGVbbWV0aG9kXSkgcmV0dXJuO1xuICAgIFN0b3JhZ2VCdWZmZXIubWl4aW5bbWV0aG9kXSA9IG5ldyBGdW5jdGlvbihcbiAgICAndmFyIHJldCA9IEJ1ZmZlci5wcm90b3R5cGUuJyttZXRob2QrJy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOycgK1xuICAgICd0aGlzLl9tYXJrTW9kaWZpZWQoKTsnICtcbiAgICAncmV0dXJuIHJldDsnXG4gICk7XG59KTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0aGlzIGJ1ZmZlciB0byBpdHMgQmluYXJ5IHR5cGUgcmVwcmVzZW50YXRpb24uXG4gKlxuICogIyMjI1N1YlR5cGVzOlxuICpcbiAqICAgdmFyIGJzb24gPSByZXF1aXJlKCdic29uJylcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0RFRkFVTFRcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0ZVTkNUSU9OXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9CWVRFX0FSUkFZXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VVUlEXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9NRDVcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VTRVJfREVGSU5FRFxuICpcbiAqICAgZG9jLmJ1ZmZlci50b09iamVjdChic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVNFUl9ERUZJTkVEKTtcbiAqXG4gKiBAc2VlIGh0dHA6Ly9ic29uc3BlYy5vcmcvIy9zcGVjaWZpY2F0aW9uXG4gKiBAcGFyYW0ge0hleH0gW3N1YnR5cGVdXG4gKiBAcmV0dXJuIHtCaW5hcnl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VCdWZmZXIubWl4aW4udG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc3VidHlwZSA9ICdudW1iZXInID09PSB0eXBlb2Ygb3B0aW9uc1xuICAgID8gb3B0aW9uc1xuICAgIDogKHRoaXMuX3N1YnR5cGUgfHwgMCk7XG4gIHJldHVybiBuZXcgQmluYXJ5KHRoaXMsIHN1YnR5cGUpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoaXMgYnVmZmVyIGlzIGVxdWFscyB0byBgb3RoZXJgIGJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7QnVmZmVyfSBvdGhlclxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG5TdG9yYWdlQnVmZmVyLm1peGluLmVxdWFscyA9IGZ1bmN0aW9uIChvdGhlcikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihvdGhlcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAodGhpcy5sZW5ndGggIT09IG90aGVyLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7ICsraSkge1xuICAgIGlmICh0aGlzW2ldICE9PSBvdGhlcltpXSkgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHN1YnR5cGUgb3B0aW9uIGFuZCBtYXJrcyB0aGUgYnVmZmVyIG1vZGlmaWVkLlxuICpcbiAqICMjIyNTdWJUeXBlczpcbiAqXG4gKiAgIHZhciBic29uID0gcmVxdWlyZSgnYnNvbicpXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9ERUZBVUxUXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9GVU5DVElPTlxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfQllURV9BUlJBWVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVVJRFxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfTUQ1XG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VU0VSX0RFRklORURcbiAqXG4gKiAgIGRvYy5idWZmZXIuc3VidHlwZShic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVVJRCk7XG4gKlxuICogQHNlZSBodHRwOi8vYnNvbnNwZWMub3JnLyMvc3BlY2lmaWNhdGlvblxuICogQHBhcmFtIHtIZXh9IHN1YnR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZUJ1ZmZlci5taXhpbi5zdWJ0eXBlID0gZnVuY3Rpb24gKHN1YnR5cGUpIHtcbiAgaWYgKCdudW1iZXInICE9PSB0eXBlb2Ygc3VidHlwZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgc3VidHlwZS4gRXhwZWN0ZWQgYSBudW1iZXInKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9zdWJ0eXBlICE9PSBzdWJ0eXBlKSB7XG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIH1cblxuICB0aGlzLl9zdWJ0eXBlID0gc3VidHlwZTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuU3RvcmFnZUJ1ZmZlci5CaW5hcnkgPSBCaW5hcnk7XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUJ1ZmZlcjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG52YXIgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJylcbiAgLCBPYmplY3RJZFNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYS9vYmplY3RpZCcpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xuXG4vKipcbiAqIERvY3VtZW50QXJyYXkgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIHRoaXMgYXJyYXlcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHJldHVybiB7U3RvcmFnZURvY3VtZW50QXJyYXl9XG4gKiBAaW5oZXJpdHMgU3RvcmFnZUFycmF5XG4gKiBAc2VlIGh0dHA6Ly9iaXQubHkvZjZDblpVXG4gKiBUT0RPOiDQv9C+0LTRh9C40YHRgtC40YLRjCDQutC+0LRcbiAqXG4gKiDQktC10YHRjCDQvdGD0LbQvdGL0Lkg0LrQvtC0INGB0LrQvtC/0LjRgNC+0LLQsNC9XG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VEb2N1bWVudEFycmF5ICh2YWx1ZXMsIHBhdGgsIGRvYykge1xuICB2YXIgYXJyID0gW107XG5cbiAgLy8gVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSwgc2luY2VcbiAgLy8gb3RoZXJ3aXNlIFN0b3JhZ2VBcnJheSNwdXNoIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQgdG8gdGhlIHBhcmVudC5cbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xuICBfLm1peGluKCBhcnIsIFN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluICk7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcbiAgYXJyLmlzU3RvcmFnZUFycmF5ID0gdHJ1ZTtcbiAgYXJyLmlzU3RvcmFnZURvY3VtZW50QXJyYXkgPSB0cnVlO1xuXG4gIGlmIChkb2MpIHtcbiAgICBhcnIuX3BhcmVudCA9IGRvYztcbiAgICBhcnIuX3NjaGVtYSA9IGRvYy5zY2hlbWEucGF0aChwYXRoKTtcbiAgICBhcnIuX2hhbmRsZXJzID0ge1xuICAgICAgaXNOZXc6IGFyci5ub3RpZnkoJ2lzTmV3JyksXG4gICAgICBzYXZlOiBhcnIubm90aWZ5KCdzYXZlJylcbiAgICB9O1xuXG4gICAgLy8g0J/RgNC+0LHRgNC+0YEg0LjQt9C80LXQvdC10L3QuNGPINGB0L7RgdGC0L7Rj9C90LjRjyDQsiDQv9C+0LTQtNC+0LrRg9C80LXQvdGCXG4gICAgZG9jLm9uKCdzYXZlJywgYXJyLl9oYW5kbGVycy5zYXZlKTtcbiAgICBkb2Mub24oJ2lzTmV3JywgYXJyLl9oYW5kbGVycy5pc05ldyk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUFycmF5XG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUFycmF5Lm1peGluICk7XG5cbi8qKlxuICogT3ZlcnJpZGVzIFN0b3JhZ2VBcnJheSNjYXN0XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLl9jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3Rvcikge1xuICAgIGlmICghKHZhbHVlLl9fcGFyZW50ICYmIHZhbHVlLl9fcGFyZW50QXJyYXkpKSB7XG4gICAgICAvLyB2YWx1ZSBtYXkgaGF2ZSBiZWVuIGNyZWF0ZWQgdXNpbmcgYXJyYXkuY3JlYXRlKClcbiAgICAgIHZhbHVlLl9fcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgICAgdmFsdWUuX19wYXJlbnRBcnJheSA9IHRoaXM7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8vIGhhbmRsZSBjYXN0KCdzdHJpbmcnKSBvciBjYXN0KE9iamVjdElkKSBldGMuXG4gIC8vIG9ubHkgb2JqZWN0cyBhcmUgcGVybWl0dGVkIHNvIHdlIGNhbiBzYWZlbHkgYXNzdW1lIHRoYXRcbiAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxuICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgIHZhbHVlID0geyBfaWQ6IHZhbHVlIH07XG4gIH1cblxuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNlYXJjaGVzIGFycmF5IGl0ZW1zIGZvciB0aGUgZmlyc3QgZG9jdW1lbnQgd2l0aCBhIG1hdGNoaW5nIF9pZC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGVtYmVkZGVkRG9jID0gbS5hcnJheS5pZChzb21lX2lkKTtcbiAqXG4gKiBAcmV0dXJuIHtFbWJlZGRlZERvY3VtZW50fG51bGx9IHRoZSBzdWJkb2N1bWVudCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAqIEBwYXJhbSB7T2JqZWN0SWR8U3RyaW5nfE51bWJlcn0gaWRcbiAqIEBUT0RPIGNhc3QgdG8gdGhlIF9pZCBiYXNlZCBvbiBzY2hlbWEgZm9yIHByb3BlciBjb21wYXJpc29uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5pZCA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgY2FzdGVkXG4gICAgLCBzaWRcbiAgICAsIF9pZDtcblxuICB0cnkge1xuICAgIHZhciBjYXN0ZWRfID0gT2JqZWN0SWRTY2hlbWEucHJvdG90eXBlLmNhc3QuY2FsbCh7fSwgaWQpO1xuICAgIGlmIChjYXN0ZWRfKSBjYXN0ZWQgPSBTdHJpbmcoY2FzdGVkXyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYXN0ZWQgPSBudWxsO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIF9pZCA9IHRoaXNbaV0uZ2V0KCdfaWQnKTtcblxuICAgIGlmIChfaWQgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkLl9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmICghKF9pZCBpbnN0YW5jZW9mIE9iamVjdElkKSkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkKSByZXR1cm4gdGhpc1tpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3RlZCA9PSBfaWQpIHtcbiAgICAgIHJldHVybiB0aGlzW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5IG9mIHBsYWluIGpzIG9iamVjdHNcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfRWFjaCBzdWItZG9jdW1lbnQgaXMgY29udmVydGVkIHRvIGEgcGxhaW4gb2JqZWN0IGJ5IGNhbGxpbmcgaXRzIGAjdG9PYmplY3RgIG1ldGhvZC5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbCBvcHRpb25zIHRvIHBhc3MgdG8gZWFjaCBkb2N1bWVudHMgYHRvT2JqZWN0YCBtZXRob2QgY2FsbCBkdXJpbmcgY29udmVyc2lvblxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICByZXR1cm4gZG9jICYmIGRvYy50b09iamVjdChvcHRpb25zKSB8fCBudWxsO1xuICB9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN1YmRvY3VtZW50IGNhc3RlZCB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzYW1lIHN1YmRvY3VtZW50IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGNhc3RpbmcuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgdmFsdWUgdG8gY2FzdCB0byB0aGlzIGFycmF5cyBTdWJEb2N1bWVudCBzY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uY3JlYXRlID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3RvcihvYmopO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZm4gdGhhdCBub3RpZmllcyBhbGwgY2hpbGQgZG9jcyBvZiBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4ubm90aWZ5ID0gZnVuY3Rpb24gbm90aWZ5IChldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiBub3RpZnkgKHZhbCkge1xuICAgIHZhciBpID0gc2VsZi5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKCFzZWxmW2ldKSBjb250aW51ZTtcbiAgICAgIHNlbGZbaV0udHJpZ2dlcihldmVudCwgdmFsKTtcbiAgICB9XG4gIH07XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZURvY3VtZW50QXJyYXk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi4vZGVmZXJyZWQnKTtcblxuLyoqXG4gKiBFbWJlZGRlZERvY3VtZW50IGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGpzIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoZSBkYlxuICogQHBhcmFtIHtTdG9yYWdlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIERvY3VtZW50LnByb3RvdHlwZSApO1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWJlZGRlZERvY3VtZW50O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBlbWJlZGRlZCBkb2MgbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBkb2MgPSBibG9ncG9zdC5jb21tZW50cy5pZChoZXhzdHJpbmcpO1xuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcblxuICBpZiAodGhpcy5pc05ldykge1xuICAgIC8vIE1hcmsgdGhlIFdIT0xFIHBhcmVudCBhcnJheSBhcyBtb2RpZmllZFxuICAgIC8vIGlmIHRoaXMgaXMgYSBuZXcgZG9jdW1lbnQgKGkuZS4sIHdlIGFyZSBpbml0aWFsaXppbmdcbiAgICAvLyBhIGRvY3VtZW50KSxcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCgpO1xuICB9IGVsc2VcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCh0aGlzLCBwYXRoKTtcbn07XG5cbi8qKlxuICogVXNlZCBhcyBhIHN0dWIgZm9yIFtob29rcy5qc10oaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjMylcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVGhpcyBpcyBhIG5vLW9wLiBEb2VzIG5vdCBhY3R1YWxseSBzYXZlIHRoZSBkb2MgdG8gdGhlIGRiLl9cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlZCBQcm9taXNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBwcm9taXNlID0gbmV3IERlZmVycmVkKCkuZG9uZShmbik7XG4gIHByb21pc2UucmVzb2x2ZSgpO1xuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc3ViZG9jdW1lbnQgZnJvbSBpdHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIF9pZDtcbiAgaWYgKCF0aGlzLndpbGxSZW1vdmUpIHtcbiAgICBfaWQgPSB0aGlzLl9kb2MuX2lkO1xuICAgIGlmICghX2lkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvciB5b3VyIG93biBnb29kLCBTdG9yYWdlIGRvZXMgbm90IGtub3cgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2hvdyB0byByZW1vdmUgYW4gRW1iZWRkZWREb2N1bWVudCB0aGF0IGhhcyBubyBfaWQnKTtcbiAgICB9XG4gICAgdGhpcy5fX3BhcmVudEFycmF5LnB1bGwoeyBfaWQ6IF9pZCB9KTtcbiAgICB0aGlzLndpbGxSZW1vdmUgPSB0cnVlO1xuICB9XG5cbiAgaWYgKGZuKVxuICAgIGZuKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSAjdXBkYXRlIG1ldGhvZCBvZiBwYXJlbnQgZG9jdW1lbnRzLlxuICogQGFwaSBwcml2YXRlXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdUaGUgI3VwZGF0ZSBtZXRob2QgaXMgbm90IGF2YWlsYWJsZSBvbiBFbWJlZGRlZERvY3VtZW50cycpO1xufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnIgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnIsIHZhbCwgZmlyc3QpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50KSB7XG4gICAgdmFyIG1zZyA9ICdVbmFibGUgdG8gaW52YWxpZGF0ZSBhIHN1YmRvY3VtZW50IHRoYXQgaGFzIG5vdCBiZWVuIGFkZGVkIHRvIGFuIGFycmF5Lic7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cblxuICB2YXIgaW5kZXggPSB0aGlzLl9fcGFyZW50QXJyYXkuaW5kZXhPZih0aGlzKTtcbiAgdmFyIHBhcmVudFBhdGggPSB0aGlzLl9fcGFyZW50QXJyYXkuX3BhdGg7XG4gIHZhciBmdWxsUGF0aCA9IFtwYXJlbnRQYXRoLCBpbmRleCwgcGF0aF0uam9pbignLicpO1xuXG4gIC8vIHNuaWZmaW5nIGFyZ3VtZW50czpcbiAgLy8gbmVlZCB0byBjaGVjayBpZiB1c2VyIHBhc3NlZCBhIHZhbHVlIHRvIGtlZXBcbiAgLy8gb3VyIGVycm9yIG1lc3NhZ2UgY2xlYW4uXG4gIGlmICgyIDwgYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX19wYXJlbnQuaW52YWxpZGF0ZShmdWxsUGF0aCwgZXJyLCB2YWwpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX19wYXJlbnQuaW52YWxpZGF0ZShmdWxsUGF0aCwgZXJyKTtcbiAgfVxuXG4gIGlmIChmaXJzdClcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB0aGlzLm93bmVyRG9jdW1lbnQoKS4kX18udmFsaWRhdGlvbkVycm9yO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdG9wIGxldmVsIGRvY3VtZW50IG9mIHRoaXMgc3ViLWRvY3VtZW50LlxuICpcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5vd25lckRvY3VtZW50ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xuICAgIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50O1xuICB9XG5cbiAgdmFyIHBhcmVudCA9IHRoaXMuX19wYXJlbnQ7XG4gIGlmICghcGFyZW50KSByZXR1cm4gdGhpcztcblxuICB3aGlsZSAocGFyZW50Ll9fcGFyZW50KSB7XG4gICAgcGFyZW50ID0gcGFyZW50Ll9fcGFyZW50O1xuICB9XG5cbiAgdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcblxuICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuIElmIG9wdGlvbmFsIGBwYXRoYCBpcyBwYXNzZWQsIGl0IGlzIGFwcGVuZGVkIHRvIHRoZSBmdWxsIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRW1iZWRkZWREb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmICghdGhpcy4kX18uZnVsbFBhdGgpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICBpZiAoIXBhcmVudC5fX3BhcmVudCkgcmV0dXJuIHBhdGg7XG5cbiAgICB2YXIgcGF0aHMgPSBbXTtcbiAgICB3aGlsZSAocGFyZW50Ll9fcGFyZW50KSB7XG4gICAgICBwYXRocy51bnNoaWZ0KHBhcmVudC5fX3BhcmVudEFycmF5Ll9wYXRoKTtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgICB9XG5cbiAgICB0aGlzLiRfXy5mdWxsUGF0aCA9IHBhdGhzLmpvaW4oJy4nKTtcblxuICAgIGlmICghdGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xuICAgICAgLy8gb3B0aW1pemF0aW9uXG4gICAgICB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoXG4gICAgPyB0aGlzLiRfXy5mdWxsUGF0aCArICcuJyArIHBhdGhcbiAgICA6IHRoaXMuJF9fLmZ1bGxQYXRoO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudEFycmF5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fX3BhcmVudEFycmF5O1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuZXhwb3J0cy5BcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcbmV4cG9ydHMuQnVmZmVyID0gcmVxdWlyZSgnLi9idWZmZXInKTtcblxuZXhwb3J0cy5FbWJlZGRlZCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcblxuZXhwb3J0cy5Eb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi9kb2N1bWVudGFycmF5Jyk7XG5leHBvcnRzLk9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICogQGlnbm9yZVxuICovXG52YXIgQmluYXJ5UGFyc2VyID0gcmVxdWlyZSgnLi4vYmluYXJ5cGFyc2VyJykuQmluYXJ5UGFyc2VyO1xuXG4vKipcbiAqIE1hY2hpbmUgaWQuXG4gKlxuICogQ3JlYXRlIGEgcmFuZG9tIDMtYnl0ZSB2YWx1ZSAoaS5lLiB1bmlxdWUgZm9yIHRoaXNcbiAqIHByb2Nlc3MpLiBPdGhlciBkcml2ZXJzIHVzZSBhIG1kNSBvZiB0aGUgbWFjaGluZSBpZCBoZXJlLCBidXRcbiAqIHRoYXQgd291bGQgbWVhbiBhbiBhc3ljIGNhbGwgdG8gZ2V0aG9zdG5hbWUsIHNvIHdlIGRvbid0IGJvdGhlci5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbnZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15bMC05YS1mQS1GXXsyNH0kJyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IE9iamVjdElkIGluc3RhbmNlXG4gKlxuICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vbW9uZ29kYi9qcy1ic29uL2Jsb2IvbWFzdGVyL2xpYi9ic29uL29iamVjdGlkLmpzXG4gKiBAY2xhc3MgUmVwcmVzZW50cyBhIEJTT04gT2JqZWN0SWQgdHlwZS5cbiAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBnZW5lcmF0aW9uVGltZSBUaGUgZ2VuZXJhdGlvbiB0aW1lIG9mIHRoaXMgT2JqZWN0SWQgaW5zdGFuY2VcbiAqIEByZXR1cm4ge09iamVjdElkfSBpbnN0YW5jZSBvZiBPYmplY3RJZC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SWQoaWQpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgaWYoKGlkIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gaWQ7XG5cbiAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICB2YXIgdmFsaWQgPSBPYmplY3RJZC5pc1ZhbGlkKGlkKTtcblxuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKCF2YWxpZCAmJiBpZCAhPSBudWxsKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVycycpO1xuICB9IGVsc2UgaWYodmFsaWQgJiYgdHlwZW9mIGlkID09PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPT09IDI0KSB7XG4gICAgcmV0dXJuIE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcoaWQpO1xuICB9IGVsc2UgaWYoaWQgPT0gbnVsbCB8fCB0eXBlb2YgaWQgPT09ICdudW1iZXInKSB7XG4gICAgLy8gY29udmVydCB0byAxMiBieXRlIGJpbmFyeSBzdHJpbmdcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZShpZCk7XG4gIH0gZWxzZSBpZihpZCAhPSBudWxsICYmIGlkLmxlbmd0aCA9PT0gMTIpIHtcbiAgICAvLyBhc3N1bWUgMTIgYnl0ZSBzdHJpbmdcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gdGhpcy50b0hleFN0cmluZygpO1xufVxuXG4vLyBQcmVjb21wdXRlZCBoZXggdGFibGUgZW5hYmxlcyBzcGVlZHkgaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgaGV4VGFibGUgPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgaGV4VGFibGVbaV0gPSAoaSA8PSAxNSA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgT2JqZWN0SWQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcgJiYgdGhpcy5fX2lkKSByZXR1cm4gdGhpcy5fX2lkO1xuXG4gIHZhciBoZXhTdHJpbmcgPSAnJztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaWQubGVuZ3RoOyBpKyspIHtcbiAgICBoZXhTdHJpbmcgKz0gaGV4VGFibGVbdGhpcy5pZC5jaGFyQ29kZUF0KGkpXTtcbiAgfVxuXG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nKSB0aGlzLl9faWQgPSBoZXhTdHJpbmc7XG4gIHJldHVybiBoZXhTdHJpbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldF9pbmMgPSBmdW5jdGlvbigpIHtcbiAgT2JqZWN0SWQuaW5kZXggPSAoT2JqZWN0SWQuaW5kZXggKyAxKSAlIDB4RkZGRkZGO1xuXG4gIHJldHVybiBPYmplY3RJZC5pbmRleDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBPYmplY3RJZCBpbmRleCB1c2VkIGluIGdlbmVyYXRpbmcgbmV3IE9iamVjdElkJ3Mgb24gdGhlIGRyaXZlclxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge251bWJlcn0gcmV0dXJucyBuZXh0IGluZGV4IHZhbHVlLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0SW5jID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmdldF9pbmMoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYSAxMiBieXRlIGlkIHN0cmluZyB1c2VkIGluIE9iamVjdElkJ3NcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gW3RpbWVdIG9wdGlvbmFsIHBhcmFtZXRlciBhbGxvd2luZyB0byBwYXNzIGluIGEgc2Vjb25kIGJhc2VkIHRpbWVzdGFtcC5cbiAqIEByZXR1cm4ge3N0cmluZ30gcmV0dXJuIHRoZSAxMiBieXRlIGlkIGJpbmFyeSBzdHJpbmcuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKCdudW1iZXInICE9PSB0eXBlb2YgdGltZSkge1xuICAgIHRpbWUgPSBwYXJzZUludChEYXRlLm5vdygpLzEwMDAsMTApO1xuICB9XG5cbiAgdmFyIHRpbWU0Qnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgLyogZm9yIHRpbWUtYmFzZWQgT2JqZWN0SWQgdGhlIGJ5dGVzIGZvbGxvd2luZyB0aGUgdGltZSB3aWxsIGJlIHplcm9lZCAqL1xuICB2YXIgbWFjaGluZTNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoTUFDSElORV9JRCwgMjQsIGZhbHNlKTtcbiAgdmFyIHBpZDJCeXRlcyA9IEJpbmFyeVBhcnNlci5mcm9tU2hvcnQodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgdmFyIGluZGV4M0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aGlzLmdldF9pbmMoKSwgMjQsIGZhbHNlLCB0cnVlKTtcblxuICByZXR1cm4gdGltZTRCeXRlcyArIG1hY2hpbmUzQnl0ZXMgKyBwaWQyQnl0ZXMgKyBpbmRleDNCeXRlcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdGhlIGlkIGludG8gYSAyNCBieXRlIGhleCBzdHJpbmcgZm9yIHByaW50aW5nXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHRvIGl0cyBKU09OIHJlcHJlc2VudGF0aW9uLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SWQgd2l0aCBgb3RoZXJJRGAuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IG90aGVySUQgT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdGhlIHJlc3VsdCBvZiBjb21wYXJpbmcgdHdvIE9iamVjdElkJ3NcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAob3RoZXJJRCkge1xuICBpZihvdGhlcklEID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgdmFyIGlkID0gKG90aGVySUQgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCBvdGhlcklELnRvSGV4U3RyaW5nKVxuICAgID8gb3RoZXJJRC5pZFxuICAgIDogT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhvdGhlcklEKS5pZDtcblxuICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7ZGF0ZX0gdGhlIGdlbmVyYXRpb24gZGF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2V0VGltZXN0YW1wID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xuICB0aW1lc3RhbXAuc2V0VGltZShNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCw0KSwgMzIsIHRydWUsIHRydWUpKSAqIDEwMDApO1xuICByZXR1cm4gdGltZXN0YW1wO1xufTtcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5jcmVhdGVQayA9IGZ1bmN0aW9uIGNyZWF0ZVBrICgpIHtcbiAgcmV0dXJuIG5ldyBPYmplY3RJZCgpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbiBjcmVhdGVGcm9tVGltZSAodGltZSkge1xuICB2YXIgaWQgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKSArXG4gICAgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gIHJldHVybiBuZXcgT2JqZWN0SWQoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SWQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uIGNyZWF0ZUZyb21IZXhTdHJpbmcgKGhleFN0cmluZykge1xuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKHR5cGVvZiBoZXhTdHJpbmcgPT09ICd1bmRlZmluZWQnIHx8IGhleFN0cmluZyAhPSBudWxsICYmIGhleFN0cmluZy5sZW5ndGggIT09IDI0KVxuICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzJyk7XG5cbiAgdmFyIGxlbiA9IGhleFN0cmluZy5sZW5ndGg7XG5cbiAgaWYobGVuID4gMTIqMikge1xuICAgIHRocm93IG5ldyBFcnJvcignSWQgY2Fubm90IGJlIGxvbmdlciB0aGFuIDEyIGJ5dGVzJyk7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gJydcbiAgICAsIHN0cmluZ1xuICAgICwgbnVtYmVyO1xuXG4gIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW47IGluZGV4ICs9IDIpIHtcbiAgICBzdHJpbmcgPSBoZXhTdHJpbmcuc3Vic3RyKGluZGV4LCAyKTtcbiAgICBudW1iZXIgPSBwYXJzZUludChzdHJpbmcsIDE2KTtcbiAgICByZXN1bHQgKz0gQmluYXJ5UGFyc2VyLmZyb21CeXRlKG51bWJlcik7XG4gIH1cblxuICByZXR1cm4gbmV3IE9iamVjdElkKHJlc3VsdCwgaGV4U3RyaW5nKTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElkXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuT2JqZWN0SWQuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQoaWQpIHtcbiAgaWYoaWQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmKGlkICE9IG51bGwgJiYgJ251bWJlcicgIT09IHR5cGVvZiBpZCAmJiAoaWQubGVuZ3RoICE9PSAxMiAmJiBpZC5sZW5ndGggIT09IDI0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDaGVjayBzcGVjaWZpY2FsbHkgZm9yIGhleCBjb3JyZWN0bmVzc1xuICAgIGlmKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoID09PSAyNCkgcmV0dXJuIGNoZWNrRm9ySGV4UmVnRXhwLnRlc3QoaWQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vKiFcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdElkLnByb3RvdHlwZSwgJ2dlbmVyYXRpb25UaW1lJywge1xuICBlbnVtZXJhYmxlOiB0cnVlXG4gICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoQmluYXJ5UGFyc2VyLmRlY29kZUludCh0aGlzLmlkLnN1YnN0cmluZygwLDQpLCAzMiwgdHJ1ZSwgdHJ1ZSkpO1xuICB9XG4gICwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YWx1ZSA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodmFsdWUsIDMyLCB0cnVlLCB0cnVlKTtcblxuICAgIHRoaXMuaWQgPSB2YWx1ZSArIHRoaXMuaWQuc3Vic3RyKDQpO1xuICAgIC8vIGRlbGV0ZSB0aGlzLl9faWQ7XG4gICAgdGhpcy50b0hleFN0cmluZygpO1xuICB9XG59KTtcblxuLyoqXG4gKiBFeHBvc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7XG5tb2R1bGUuZXhwb3J0cy5PYmplY3RJZCA9IE9iamVjdElkO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgbXBhdGggPSByZXF1aXJlKCcuL21wYXRoJylcbiAgLCBEb2N1bWVudDtcblxuZXhwb3J0cy5tcGF0aCA9IG1wYXRoO1xuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gcnVsZXMuXG4gKlxuICogVGhlc2UgcnVsZXMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKlxuICovXG5leHBvcnRzLnBsdXJhbGl6YXRpb24gPSBbXG4gIFsvKG0pYW4kL2dpLCAnJDFlbiddLFxuICBbLyhwZSlyc29uJC9naSwgJyQxb3BsZSddLFxuICBbLyhjaGlsZCkkL2dpLCAnJDFyZW4nXSxcbiAgWy9eKG94KSQvZ2ksICckMWVuJ10sXG4gIFsvKGF4fHRlc3QpaXMkL2dpLCAnJDFlcyddLFxuICBbLyhvY3RvcHx2aXIpdXMkL2dpLCAnJDFpJ10sXG4gIFsvKGFsaWFzfHN0YXR1cykkL2dpLCAnJDFlcyddLFxuICBbLyhidSlzJC9naSwgJyQxc2VzJ10sXG4gIFsvKGJ1ZmZhbHx0b21hdHxwb3RhdClvJC9naSwgJyQxb2VzJ10sXG4gIFsvKFt0aV0pdW0kL2dpLCAnJDFhJ10sXG4gIFsvc2lzJC9naSwgJ3NlcyddLFxuICBbLyg/OihbXmZdKWZlfChbbHJdKWYpJC9naSwgJyQxJDJ2ZXMnXSxcbiAgWy8oaGl2ZSkkL2dpLCAnJDFzJ10sXG4gIFsvKFteYWVpb3V5XXxxdSl5JC9naSwgJyQxaWVzJ10sXG4gIFsvKHh8Y2h8c3N8c2gpJC9naSwgJyQxZXMnXSxcbiAgWy8obWF0cnx2ZXJ0fGluZClpeHxleCQvZ2ksICckMWljZXMnXSxcbiAgWy8oW218bF0pb3VzZSQvZ2ksICckMWljZSddLFxuICBbLyhrbnx3fGwpaWZlJC9naSwgJyQxaXZlcyddLFxuICBbLyhxdWl6KSQvZ2ksICckMXplcyddLFxuICBbL3MkL2dpLCAncyddLFxuICBbLyhbXmEtel0pJC8sICckMSddLFxuICBbLyQvZ2ksICdzJ11cbl07XG52YXIgcnVsZXMgPSBleHBvcnRzLnBsdXJhbGl6YXRpb247XG5cbi8qKlxuICogVW5jb3VudGFibGUgd29yZHMuXG4gKlxuICogVGhlc2Ugd29yZHMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnRzLnVuY291bnRhYmxlcyA9IFtcbiAgJ2FkdmljZScsXG4gICdlbmVyZ3knLFxuICAnZXhjcmV0aW9uJyxcbiAgJ2RpZ2VzdGlvbicsXG4gICdjb29wZXJhdGlvbicsXG4gICdoZWFsdGgnLFxuICAnanVzdGljZScsXG4gICdsYWJvdXInLFxuICAnbWFjaGluZXJ5JyxcbiAgJ2VxdWlwbWVudCcsXG4gICdpbmZvcm1hdGlvbicsXG4gICdwb2xsdXRpb24nLFxuICAnc2V3YWdlJyxcbiAgJ3BhcGVyJyxcbiAgJ21vbmV5JyxcbiAgJ3NwZWNpZXMnLFxuICAnc2VyaWVzJyxcbiAgJ3JhaW4nLFxuICAncmljZScsXG4gICdmaXNoJyxcbiAgJ3NoZWVwJyxcbiAgJ21vb3NlJyxcbiAgJ2RlZXInLFxuICAnbmV3cycsXG4gICdleHBlcnRpc2UnLFxuICAnc3RhdHVzJyxcbiAgJ21lZGlhJ1xuXTtcbnZhciB1bmNvdW50YWJsZXMgPSBleHBvcnRzLnVuY291bnRhYmxlcztcblxuLyohXG4gKiBQbHVyYWxpemUgZnVuY3Rpb24uXG4gKlxuICogQGF1dGhvciBUSiBIb2xvd2F5Y2h1ayAoZXh0cmFjdGVkIGZyb20gX2V4dC5qc18pXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIHRvIHBsdXJhbGl6ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wbHVyYWxpemUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBmb3VuZDtcbiAgaWYgKCF+dW5jb3VudGFibGVzLmluZGV4T2Yoc3RyLnRvTG93ZXJDYXNlKCkpKXtcbiAgICBmb3VuZCA9IHJ1bGVzLmZpbHRlcihmdW5jdGlvbihydWxlKXtcbiAgICAgIHJldHVybiBzdHIubWF0Y2gocnVsZVswXSk7XG4gICAgfSk7XG4gICAgaWYgKGZvdW5kWzBdKSByZXR1cm4gc3RyLnJlcGxhY2UoZm91bmRbMF1bMF0sIGZvdW5kWzBdWzFdKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuLyohXG4gKiBEZXRlcm1pbmVzIGlmIGBhYCBhbmQgYGJgIGFyZSBkZWVwIGVxdWFsLlxuICpcbiAqIE1vZGlmaWVkIGZyb20gbm9kZS9saWIvYXNzZXJ0LmpzXG4gKiBNb2RpZmllZCBmcm9tIG1vbmdvb3NlL3V0aWxzLmpzXG4gKlxuICogQHBhcmFtIHsqfSBhIGEgdmFsdWUgdG8gY29tcGFyZSB0byBgYmBcbiAqIEBwYXJhbSB7Kn0gYiBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGFgXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsIChhLCBiKSB7XG4gIGlmIChhIGluc3RhbmNlb2YgT2JqZWN0SWQgJiYgYiBpbnN0YW5jZW9mIE9iamVjdElkKSB7XG4gICAgcmV0dXJuIGEudG9TdHJpbmcoKSA9PT0gYi50b1N0cmluZygpO1xuICB9XG5cbiAgLy8gSGFuZGxlIFN0b3JhZ2VOdW1iZXJzXG4gIGlmIChhIGluc3RhbmNlb2YgTnVtYmVyICYmIGIgaW5zdGFuY2VvZiBOdW1iZXIpIHtcbiAgICByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICB9XG5cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihhKSkge1xuICAgIHJldHVybiBhLmVxdWFscyhiKTtcbiAgfVxuXG4gIGlmIChpc1N0b3JhZ2VPYmplY3QoYSkpIGEgPSBhLnRvT2JqZWN0KCk7XG4gIGlmIChpc1N0b3JhZ2VPYmplY3QoYikpIGIgPSBiLnRvT2JqZWN0KCk7XG5cbiAgcmV0dXJuIF8uaXNFcXVhbChhLCBiKTtcbn07XG5cblxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cCAobykge1xuICByZXR1cm4gJ29iamVjdCcgPT09IHR5cGVvZiBvXG4gICAgICAmJiAnW29iamVjdCBSZWdFeHBdJyA9PT0gdG9TdHJpbmcuY2FsbChvKTtcbn1cblxuZnVuY3Rpb24gY2xvbmVSZWdFeHAgKHJlZ2V4cCkge1xuICBpZiAoIWlzUmVnRXhwKHJlZ2V4cCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdOb3QgYSBSZWdFeHAnKTtcbiAgfVxuXG4gIHZhciBmbGFncyA9IFtdO1xuICBpZiAocmVnZXhwLmdsb2JhbCkgZmxhZ3MucHVzaCgnZycpO1xuICBpZiAocmVnZXhwLm11bHRpbGluZSkgZmxhZ3MucHVzaCgnbScpO1xuICBpZiAocmVnZXhwLmlnbm9yZUNhc2UpIGZsYWdzLnB1c2goJ2knKTtcbiAgcmV0dXJuIG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgZmxhZ3Muam9pbignJykpO1xufVxuXG4vKiFcbiAqIE9iamVjdCBjbG9uZSB3aXRoIFN0b3JhZ2UgbmF0aXZlcyBzdXBwb3J0LlxuICpcbiAqIElmIG9wdGlvbnMubWluaW1pemUgaXMgdHJ1ZSwgY3JlYXRlcyBhIG1pbmltYWwgZGF0YSBvYmplY3QuIEVtcHR5IG9iamVjdHMgYW5kIHVuZGVmaW5lZCB2YWx1ZXMgd2lsbCBub3QgYmUgY2xvbmVkLiBUaGlzIG1ha2VzIHRoZSBkYXRhIHBheWxvYWQgc2VudCB0byBNb25nb0RCIGFzIHNtYWxsIGFzIHBvc3NpYmxlLlxuICpcbiAqIEZ1bmN0aW9ucyBhcmUgbmV2ZXIgY2xvbmVkLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBjbG9uZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIGNsb25lZCBvYmplY3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmNsb25lID0gZnVuY3Rpb24gY2xvbmUgKG9iaiwgb3B0aW9ucykge1xuICBpZiAob2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsKVxuICAgIHJldHVybiBvYmo7XG5cbiAgaWYgKCBfLmlzQXJyYXkoIG9iaiApICkge1xuICAgIHJldHVybiBjbG9uZUFycmF5KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggaXNTdG9yYWdlT2JqZWN0KCBvYmogKSApIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmpzb24gJiYgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIG9iai50b0pTT04pIHtcbiAgICAgIHJldHVybiBvYmoudG9KU09OKCBvcHRpb25zICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvYmoudG9PYmplY3QoIG9wdGlvbnMgKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIG9iai5jb25zdHJ1Y3RvciApIHtcbiAgICBzd2l0Y2ggKCBnZXRGdW5jdGlvbk5hbWUoIG9iai5jb25zdHJ1Y3RvciApKSB7XG4gICAgICBjYXNlICdPYmplY3QnOlxuICAgICAgICByZXR1cm4gY2xvbmVPYmplY3Qob2JqLCBvcHRpb25zKTtcbiAgICAgIGNhc2UgJ0RhdGUnOlxuICAgICAgICByZXR1cm4gbmV3IG9iai5jb25zdHJ1Y3RvciggK29iaiApO1xuICAgICAgY2FzZSAnUmVnRXhwJzpcbiAgICAgICAgcmV0dXJuIGNsb25lUmVnRXhwKCBvYmogKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIGlnbm9yZVxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoIG9iaiBpbnN0YW5jZW9mIE9iamVjdElkICkge1xuICAgIGlmICggb3B0aW9ucy5kZXBvcHVsYXRlICl7XG4gICAgICByZXR1cm4gb2JqLnRvU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBPYmplY3RJZCggb2JqLmlkICk7XG4gIH1cblxuICBpZiAoICFvYmouY29uc3RydWN0b3IgJiYgXy5pc09iamVjdCggb2JqICkgKSB7XG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgcmV0dXJuIGNsb25lT2JqZWN0KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggb2JqLnZhbHVlT2YgKXtcbiAgICByZXR1cm4gb2JqLnZhbHVlT2YoKTtcbiAgfVxufTtcbnZhciBjbG9uZSA9IGV4cG9ydHMuY2xvbmU7XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGNsb25lT2JqZWN0IChvYmosIG9wdGlvbnMpIHtcbiAgdmFyIHJldGFpbktleU9yZGVyID0gb3B0aW9ucyAmJiBvcHRpb25zLnJldGFpbktleU9yZGVyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxuICAgICwgcmV0ID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleXNcbiAgICAsIHZhbFxuICAgICwga1xuICAgICwgaTtcblxuICBpZiAoIHJldGFpbktleU9yZGVyICkge1xuICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgIHZhbCA9IGNsb25lKCBvYmpba10sIG9wdGlvbnMgKTtcblxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcbiAgICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGZhc3RlclxuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcbiAgICBpID0ga2V5cy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrID0ga2V5c1tpXTtcbiAgICAgIHZhbCA9IGNsb25lKG9ialtrXSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xuICAgICAgICBpZiAoIWhhc0tleXMpIGhhc0tleXMgPSB0cnVlO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbmltaXplXG4gICAgPyBoYXNLZXlzICYmIHJldFxuICAgIDogcmV0O1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyohXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG5cbiAgICBpZiAoIHR5cGVvZiB0b1trZXldID09PSAndW5kZWZpbmVkJyApe1xuICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcblxuICAgIH0gZWxzZSBpZiAoIF8uaXNPYmplY3QoIGZyb21ba2V5XSApICl7XG4gICAgICBtZXJnZSggdG9ba2V5XSwgZnJvbVtrZXldICk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBzdHJpbmdcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnJhbmRvbSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoKS5zdWJzdHIoMyk7XG59O1xuXG5cbi8qIVxuICogUmV0dXJucyBpZiBgdmAgaXMgYSBzdG9yYWdlIG9iamVjdCB0aGF0IGhhcyBhIGB0b09iamVjdCgpYCBtZXRob2Qgd2UgY2FuIHVzZS5cbiAqXG4gKiBUaGlzIGlzIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbGlicyBsaWtlIERhdGUuanMgd2hpY2ggZG8gZm9vbGlzaCB0aGluZ3MgdG8gTmF0aXZlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmlzU3RvcmFnZU9iamVjdCA9IGZ1bmN0aW9uICggdiApIHtcbiAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpKTtcblxuICByZXR1cm4gdiBpbnN0YW5jZW9mIERvY3VtZW50IHx8XG4gICAgICAgKCB2ICYmIHYuaXNTdG9yYWdlQXJyYXkgKTtcbn07XG52YXIgaXNTdG9yYWdlT2JqZWN0ID0gZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3Q7XG5cbi8qIVxuICogUmV0dXJuIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmosIG1hcCkge1xuICByZXR1cm4gbXBhdGguZ2V0KHBhdGgsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxuLyohXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb2JqLCBtYXApIHtcbiAgbXBhdGguc2V0KHBhdGgsIHZhbCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG52YXIgckZ1bmN0aW9uTmFtZSA9IC9eZnVuY3Rpb25cXHMqKFteXFxzKF0rKS87XG5mdW5jdGlvbiBnZXRGdW5jdGlvbk5hbWUoIGN0b3IgKXtcbiAgaWYgKGN0b3IubmFtZSkge1xuICAgIHJldHVybiBjdG9yLm5hbWU7XG4gIH1cbiAgcmV0dXJuIChjdG9yLnRvU3RyaW5nKCkudHJpbSgpLm1hdGNoKCByRnVuY3Rpb25OYW1lICkgfHwgW10pWzFdO1xufVxuZXhwb3J0cy5nZXRGdW5jdGlvbk5hbWUgPSBnZXRGdW5jdGlvbk5hbWU7XG5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gKGZ1bmN0aW9uKCkge1xuICAvLyDQlNC70Y8g0L/QvtC00LTQtdGA0LbQutC4INGC0LXRgdGC0L7QsiAo0L7QutGA0YPQttC10L3QuNC1IG5vZGUuanMpXG4gIGlmICggdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayApIHJldHVybiBwcm9jZXNzLm5leHRUaWNrO1xuICAvLyDQldGB0LvQuCDQsiDQsdGA0LDRg9C30LXRgNC1INGD0LbQtSDRgNC10LDQu9C40LfQvtCy0LDQvSDRjdGC0L7RgiDQvNC10YLQvtC0XG4gIGlmICggd2luZG93LnNldEltbWVkaWF0ZSApIHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuXG4gIHZhciBoZWFkID0geyB9LCB0YWlsID0gaGVhZDsgLy8g0L7Rh9C10YDQtdC00Ywg0LLRi9C30L7QstC+0LIsIDEt0YHQstGP0LfQvdGL0Lkg0YHQv9C40YHQvtC6XG5cbiAgdmFyIElEID0gTWF0aC5yYW5kb20oKTsgLy8g0YPQvdC40LrQsNC70YzQvdGL0Lkg0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YBcblxuICBmdW5jdGlvbiBvbm1lc3NhZ2UoZSkge1xuICAgIGlmKGUuZGF0YSAhPSBJRCkgcmV0dXJuOyAvLyDQvdC1INC90LDRiNC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgdmFyIGZ1bmMgPSBoZWFkLmZ1bmM7XG4gICAgZGVsZXRlIGhlYWQuZnVuYztcbiAgICBmdW5jKCk7XG4gIH1cblxuICBpZih3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikgeyAvLyBJRTkrLCDQtNGA0YPQs9C40LUg0LHRgNCw0YPQt9C10YDRi1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25tZXNzYWdlLCBmYWxzZSk7XG4gIH0gZWxzZSB7IC8vIElFOFxuICAgIHdpbmRvdy5hdHRhY2hFdmVudCggJ29ubWVzc2FnZScsIG9ubWVzc2FnZSApO1xuICB9XG5cbiAgcmV0dXJuIHdpbmRvdy5wb3N0TWVzc2FnZSA/IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB0YWlsID0gdGFpbC5uZXh0ID0geyBmdW5jOiBmdW5jIH07XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKElELCAnKicpO1xuICB9IDpcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XG4gICAgc2V0VGltZW91dChmdW5jLCAwKTtcbiAgfTtcbn0oKSk7XG5cbi8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgYmluZCB5ZXRcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8g0LHQu9C40LbQsNC50YjQuNC5INCw0L3QsNC70L7QsyDQstC90YPRgtGA0LXQvdC90LXQuSDRhNGD0L3QutGG0LjQuFxuICAgICAgLy8gSXNDYWxsYWJsZSDQsiBFQ01BU2NyaXB0IDVcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgTm9vcCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBOb29wICYmIG9UaGlzXG4gICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIH07XG5cbiAgICBOb29wLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgTm9vcCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcikiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBUaGlzIGlzIHdoYXQgbW9uZ29vc2UgdXNlcyB0byBkZWZpbmUgdmlydHVhbCBhdHRyaWJ1dGVzIHZpYSBgU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgZnVsbG5hbWUgaW5zdGFuY2VvZiBtb25nb29zZS5WaXJ0dWFsVHlwZSAvLyB0cnVlXG4gKlxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gVmlydHVhbFR5cGUgKG9wdGlvbnMsIG5hbWUpIHtcbiAgdGhpcy5wYXRoID0gbmFtZTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufVxuXG4vKipcbiAqIERlZmluZXMgYSBnZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5nZXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5zZXQoZnVuY3Rpb24gKHYpIHtcbiAqICAgICAgIHZhciBwYXJ0cyA9IHYuc3BsaXQoJyAnKTtcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xuICogICAgICAgdGhpcy5uYW1lLmxhc3QgPSBwYXJ0c1sxXTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcmV0dXJuIHsqfSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4geyp9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgc2V0dGVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICB2YXIgdiA9IHZhbHVlO1xuICBmb3IgKHZhciBsID0gdGhpcy5zZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gdjtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBzdWJqZWN0ID4gMCA/IHN1YmplY3QgPj4+IDAgOiAwXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JylcbiAgICAgIHN1YmplY3QgPSBiYXNlNjRjbGVhbihzdWJqZWN0KVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAodGhpcy5sZW5ndGggPiBrTWF4TGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSAoKHN1YmplY3RbaV0gJSAyNTYpICsgMjU2KSAlIDI1NlxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZighQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heClcbiAgICAgIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKGJ5dGUpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiB1dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoLCAyKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGFzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW47XG4gICAgaWYgKHN0YXJ0IDwgMClcbiAgICAgIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKVxuICAgICAgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KVxuICAgIGVuZCA9IHN0YXJ0XG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSlcbiAgICByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgaWYgKHRhcmdldF9zdGFydCA8IDAgfHwgdGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHNvdXJjZS5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtel0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpIHtcbiAgICAgIGJ5dGVBcnJheS5wdXNoKGIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCwgdW5pdFNpemUpIHtcbiAgaWYgKHVuaXRTaXplKSBsZW5ndGggLT0gbGVuZ3RoICUgdW5pdFNpemU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUylcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0gpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJzdG9yYWdlXCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMy4wXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJNb25nb29zZS1saWtlIHNjaGVtYSB2YWxpZGF0aW9uLCBjb2xsZWN0aW9ucyBhbmQgZG9jdW1lbnRzIG9uIGJyb3dzZXIgKGNsaWVudC1zaWRlKVwiLFxuICBcImF1dGhvclwiOiBcIkNvbnN0YW50aW5lIE1lbG5pa292IDxrYS5tZWxuaWtvdkBnbWFpbC5jb20+XCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vYXJjaGFuZ2VsLWlyay9zdG9yYWdlLmdpdFwiXG4gIH0sXG4gIFwibWFpblwiOiBcImRpc3Qvc3RvcmFnZS5taW4uanNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcInRlc3RcIjogXCJncnVudCB0ZXN0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZ3J1bnRcIjogXCJsYXRlc3RcIixcbiAgICBcInRpbWUtZ3J1bnRcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWNvbnRyaWItanNoaW50XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJncnVudC1jb250cmliLXVnbGlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi13YXRjaFwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQta2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWthcm1hLWNvdmVyYWxsc1wiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtY2hhaVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtcGhhbnRvbWpzLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1jaHJvbWUtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWZpcmVmb3gtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWllLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1zYWZhcmktbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLXNhdWNlLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG5cbiAgICBcImxvZGFzaFwiOiBcImxhdGVzdFwiLFxuXG4gICAgXCJicm93c2VyaWZ5XCI6IFwibGF0ZXN0XCIsXG5cbiAgICBcImRveFwiOiBcImxhdGVzdFwiLFxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJqYWRlXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJtYXJrZG93blwiOiBcImxhdGVzdFwiXG4gIH1cbn1cbiJdfQ==
