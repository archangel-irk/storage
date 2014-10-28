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
 * @class Represents the Binary BSON type.
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

/**
 * Default BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_DEFAULT = 0;
/**
 * Function BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_FUNCTION = 1;
/**
 * Byte Array BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_BYTE_ARRAY = 2;
/**
 * OLD UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID_OLD = 3;
/**
 * UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID = 4;
/**
 * MD5 BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_MD5 = 5;
/**
 * User BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_USER_DEFINED = 128;

/**
 * Expose.
 */
module.exports = Binary;
module.exports.Binary = Binary;
}).call(this,require("buffer").Buffer)
},{"buffer":36}],2:[function(require,module,exports){
'use strict';

/**
 * Binary Parser.
 * Jonas Raoni Soares Silva
 * http://jsfromhell.com/classes/binary-parser [v1.0]
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

/**
 * Expose.
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

  // Отображение объекта documents в виде массива (для нокаута)
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
      /*if ( !newDoc._id ){
        throw new TypeError('Для помещения в коллекцию необходимо, чтобы у документа был _id');
      }*/

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

},{"./document":4,"./schema":15}],4:[function(require,module,exports){
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

},{"./error":5,"./events":11,"./internal":13,"./schema":15,"./schema/mixed":22,"./schematype":26,"./types/documentarray":30,"./types/embedded":31,"./types/objectid":33,"./utils":34}],5:[function(require,module,exports){
'use strict';

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

},{"./error/cast":6,"./error/messages":7,"./error/missingSchema":8,"./error/validation":9,"./error/validator":10}],6:[function(require,module,exports){
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

},{"../error.js":5}],7:[function(require,module,exports){
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


},{}],8:[function(require,module,exports){
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
},{"../error.js":5}],9:[function(require,module,exports){
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

},{"../error.js":5}],10:[function(require,module,exports){
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

},{"../error.js":5}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
(function (Buffer){
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

  this[ name ] = new Collection( name, schema, api );

  return this[ name ];
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
Storage.prototype.version = pkg.version;

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
},{"../package.json":41,"./collection":3,"./document":4,"./error":5,"./schema":15,"./schematype":26,"./statemachine":27,"./types":32,"./utils":34,"./virtualtype":35,"buffer":36}],13:[function(require,module,exports){
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

},{"./statemachine":27}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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
    throw new Error('Discriminator with name "' + name + '" already exists');
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
Schema.ObjectId = Types.ObjectId;

},{"./events":11,"./schema/index":21,"./utils":34,"./virtualtype":35}],16:[function(require,module,exports){
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

},{"../schematype":26,"../types/array":28,"../types/embedded":31,"../utils":34,"./boolean":17,"./buffer":18,"./date":19,"./mixed":22,"./number":23,"./objectid":24,"./string":25}],17:[function(require,module,exports){
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

},{"../schematype":26}],18:[function(require,module,exports){
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
},{"../schematype":26,"../types":32,"./../document":4,"buffer":36}],19:[function(require,module,exports){
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

},{"../schematype":26}],20:[function(require,module,exports){
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

  // Если два массива примерно одинаковые - не надо перезаписывать
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

},{"../document":4,"../schematype":26,"../types/documentarray":30,"../types/embedded":31,"../types/objectid":33,"../utils":34,"./array":16}],21:[function(require,module,exports){
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

},{"./array":16,"./boolean":17,"./buffer":18,"./date":19,"./documentarray":20,"./mixed":22,"./number":23,"./objectid":24,"./string":25}],22:[function(require,module,exports){
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

},{"../schematype":26}],23:[function(require,module,exports){
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

},{"../error":5,"../schematype":26}],24:[function(require,module,exports){
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

},{"../schematype":26,"../types/objectid":33,"./../document":4}],25:[function(require,module,exports){
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

},{"../error":5,"../schematype":26}],26:[function(require,module,exports){
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

},{"./error":5,"./utils":34}],27:[function(require,module,exports){
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


},{}],28:[function(require,module,exports){
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

      value = new Model(value);
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

},{"../document":4,"./embedded":31,"./objectid":33}],29:[function(require,module,exports){
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
},{"../binary":1,"../utils":34,"buffer":36}],30:[function(require,module,exports){
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

},{"../document":4,"../schema/objectid":24,"./array":28,"./objectid":33}],31:[function(require,module,exports){
'use strict';

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

},{"../document":4}],32:[function(require,module,exports){
'use strict';

/*!
 * Module exports.
 */

exports.Array = require('./array');
exports.Buffer = require('./buffer');

exports.Embedded = require('./embedded');

exports.DocumentArray = require('./documentarray');
exports.ObjectId = require('./objectid');

},{"./array":28,"./buffer":29,"./documentarray":30,"./embedded":31,"./objectid":33}],33:[function(require,module,exports){
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
},{"../binaryparser":2,"_process":40}],34:[function(require,module,exports){
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
      fNOP    = function() {},
      fBound  = function() {
        return fToBind.apply(this instanceof fNOP && oThis
            ? this
            : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments)));
      };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./document":4,"./mpath":14,"./types/objectid":33,"_process":40,"buffer":36}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
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

  if (len < 100 || !Buffer.TYPED_ARRAY_SUPPORT) {
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

function blitBuffer (src, dst, offset, length) {
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

},{"base64-js":37,"ieee754":38,"is-array":39}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){

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

},{}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
module.exports={
  "name": "storage.js",
  "version": "0.0.1",
  "description": "storage.js",
  "author": "Constantine Melnikov <ka.melnikov@gmail.com>",
  "maintainers": "Constantine Melnikov <ka.melnikov@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/archangel-irk/storage.git"
  },
  "scripts": {
    "test": "grunt test"
  },
  "devDependencies": {
    "grunt": "latest",
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
    "time-grunt": "latest",
    "browserify": "latest",
    "dox": "latest",
    "highlight.js": "latest",
    "jade": "latest"
  }
}
},{}]},{},[12])(12)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmluYXJ5LmpzIiwibGliL2JpbmFyeXBhcnNlci5qcyIsImxpYi9jb2xsZWN0aW9uLmpzIiwibGliL2RvY3VtZW50LmpzIiwibGliL2Vycm9yLmpzIiwibGliL2Vycm9yL2Nhc3QuanMiLCJsaWIvZXJyb3IvbWVzc2FnZXMuanMiLCJsaWIvZXJyb3IvbWlzc2luZ1NjaGVtYS5qcyIsImxpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwibGliL2Vycm9yL3ZhbGlkYXRvci5qcyIsImxpYi9ldmVudHMuanMiLCJsaWIvaW5kZXguanMiLCJsaWIvaW50ZXJuYWwuanMiLCJsaWIvbXBhdGguanMiLCJsaWIvc2NoZW1hLmpzIiwibGliL3NjaGVtYS9hcnJheS5qcyIsImxpYi9zY2hlbWEvYm9vbGVhbi5qcyIsImxpYi9zY2hlbWEvYnVmZmVyLmpzIiwibGliL3NjaGVtYS9kYXRlLmpzIiwibGliL3NjaGVtYS9kb2N1bWVudGFycmF5LmpzIiwibGliL3NjaGVtYS9pbmRleC5qcyIsImxpYi9zY2hlbWEvbWl4ZWQuanMiLCJsaWIvc2NoZW1hL251bWJlci5qcyIsImxpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCJsaWIvc2NoZW1hL3N0cmluZy5qcyIsImxpYi9zY2hlbWF0eXBlLmpzIiwibGliL3N0YXRlbWFjaGluZS5qcyIsImxpYi90eXBlcy9hcnJheS5qcyIsImxpYi90eXBlcy9idWZmZXIuanMiLCJsaWIvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsImxpYi90eXBlcy9lbWJlZGRlZC5qcyIsImxpYi90eXBlcy9pbmRleC5qcyIsImxpYi90eXBlcy9vYmplY3RpZC5qcyIsImxpYi91dGlscy5qcyIsImxpYi92aXJ0dWFsdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzl6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKEJ1ZmZlcil7XG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBjbGFzcyByZXByZXNlbnRhdGlvbiBvZiB0aGUgQlNPTiBCaW5hcnkgdHlwZS5cbiAqXG4gKiBTdWIgdHlwZXNcbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX0RFRkFVTFQqKiwgZGVmYXVsdCBCU09OIHR5cGUuXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9GVU5DVElPTioqLCBCU09OIGZ1bmN0aW9uIHR5cGUuXG4gKiAgLSAqKkJTT04uQlNPTl9CSU5BUllfU1VCVFlQRV9CWVRFX0FSUkFZKiosIEJTT04gYnl0ZSBhcnJheSB0eXBlLlxuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfVVVJRCoqLCBCU09OIHV1aWQgdHlwZS5cbiAqICAtICoqQlNPTi5CU09OX0JJTkFSWV9TVUJUWVBFX01ENSoqLCBCU09OIG1kNSB0eXBlLlxuICogIC0gKipCU09OLkJTT05fQklOQVJZX1NVQlRZUEVfVVNFUl9ERUZJTkVEKiosIEJTT04gdXNlciBkZWZpbmVkIHR5cGUuXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJpbmFyeSBCU09OIHR5cGUuXG4gKiBAcGFyYW0ge0J1ZmZlcn0gYnVmZmVyIGEgYnVmZmVyIG9iamVjdCBjb250YWluaW5nIHRoZSBiaW5hcnkgZGF0YS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbc3ViVHlwZV0gdGhlIG9wdGlvbiBiaW5hcnkgdHlwZS5cbiAqIEByZXR1cm4ge0dyaWR9XG4gKi9cbmZ1bmN0aW9uIEJpbmFyeShidWZmZXIsIHN1YlR5cGUpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgQmluYXJ5KSkgcmV0dXJuIG5ldyBCaW5hcnkoYnVmZmVyLCBzdWJUeXBlKTtcblxuICB0aGlzLl9ic29udHlwZSA9ICdCaW5hcnknO1xuXG4gIGlmKGJ1ZmZlciBpbnN0YW5jZW9mIE51bWJlcikge1xuICAgIHRoaXMuc3ViX3R5cGUgPSBidWZmZXI7XG4gICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zdWJfdHlwZSA9IHN1YlR5cGUgPT0gbnVsbCA/IEJTT05fQklOQVJZX1NVQlRZUEVfREVGQVVMVCA6IHN1YlR5cGU7XG4gICAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gIH1cblxuICBpZihidWZmZXIgIT0gbnVsbCAmJiAhKGJ1ZmZlciBpbnN0YW5jZW9mIE51bWJlcikpIHtcbiAgICAvLyBPbmx5IGFjY2VwdCBCdWZmZXIsIFVpbnQ4QXJyYXkgb3IgQXJyYXlzXG4gICAgaWYodHlwZW9mIGJ1ZmZlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIERpZmZlcmVudCB3YXlzIG9mIHdyaXRpbmcgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIGZvciB0aGUgZGlmZmVyZW50IHR5cGVzXG4gICAgICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IG5ldyBCdWZmZXIoYnVmZmVyKTtcbiAgICAgIH0gZWxzZSBpZih0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgfHwgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChidWZmZXIpID09PSAnW29iamVjdCBBcnJheV0nKSkge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IHdyaXRlU3RyaW5nVG9BcnJheShidWZmZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbmx5IFN0cmluZywgQnVmZmVyLCBVaW50OEFycmF5IG9yIEFycmF5IGFjY2VwdGVkJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgIH1cbiAgICB0aGlzLnBvc2l0aW9uID0gYnVmZmVyLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5idWZmZXIgPSAgbmV3IEJ1ZmZlcihCaW5hcnkuQlVGRkVSX1NJWkUpO1xuICAgIH0gZWxzZSBpZih0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgdGhpcy5idWZmZXIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoQmluYXJ5LkJVRkZFUl9TSVpFKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KEJpbmFyeS5CVUZGRVJfU0laRSk7XG4gICAgfVxuICAgIC8vIFNldCBwb3NpdGlvbiB0byBzdGFydCBvZiBidWZmZXJcbiAgICB0aGlzLnBvc2l0aW9uID0gMDtcbiAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhpcyBiaW5hcnkgd2l0aCBieXRlX3ZhbHVlLlxuICpcbiAqIEBwYXJhbSB7Q2hhcmFjdGVyfSBieXRlX3ZhbHVlIGEgc2luZ2xlIGJ5dGUgd2Ugd2lzaCB0byB3cml0ZS5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gcHV0KGJ5dGVfdmFsdWUpIHtcbiAgLy8gSWYgaXQncyBhIHN0cmluZyBhbmQgYSBoYXMgbW9yZSB0aGFuIG9uZSBjaGFyYWN0ZXIgdGhyb3cgYW4gZXJyb3JcbiAgaWYoYnl0ZV92YWx1ZVsnbGVuZ3RoJ10gIT0gbnVsbCAmJiB0eXBlb2YgYnl0ZV92YWx1ZSAhPSAnbnVtYmVyJyAmJiBieXRlX3ZhbHVlLmxlbmd0aCAhPSAxKSB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGFjY2VwdHMgc2luZ2xlIGNoYXJhY3RlciBTdHJpbmcsIFVpbnQ4QXJyYXkgb3IgQXJyYXlcIik7XG4gIGlmKHR5cGVvZiBieXRlX3ZhbHVlICE9ICdudW1iZXInICYmIGJ5dGVfdmFsdWUgPCAwIHx8IGJ5dGVfdmFsdWUgPiAyNTUpIHRocm93IG5ldyBFcnJvcihcIm9ubHkgYWNjZXB0cyBudW1iZXIgaW4gYSB2YWxpZCB1bnNpZ25lZCBieXRlIHJhbmdlIDAtMjU1XCIpO1xuXG4gIC8vIERlY29kZSB0aGUgYnl0ZSB2YWx1ZSBvbmNlXG4gIHZhciBkZWNvZGVkX2J5dGUgPSBudWxsO1xuICBpZih0eXBlb2YgYnl0ZV92YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBkZWNvZGVkX2J5dGUgPSBieXRlX3ZhbHVlLmNoYXJDb2RlQXQoMCk7XG4gIH0gZWxzZSBpZihieXRlX3ZhbHVlWydsZW5ndGgnXSAhPSBudWxsKSB7XG4gICAgZGVjb2RlZF9ieXRlID0gYnl0ZV92YWx1ZVswXTtcbiAgfSBlbHNlIHtcbiAgICBkZWNvZGVkX2J5dGUgPSBieXRlX3ZhbHVlO1xuICB9XG5cbiAgaWYodGhpcy5idWZmZXIubGVuZ3RoID4gdGhpcy5wb3NpdGlvbikge1xuICAgIHRoaXMuYnVmZmVyW3RoaXMucG9zaXRpb24rK10gPSBkZWNvZGVkX2J5dGU7XG4gIH0gZWxzZSB7XG4gICAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSkge1xuICAgICAgLy8gQ3JlYXRlIGFkZGl0aW9uYWwgb3ZlcmZsb3cgYnVmZmVyXG4gICAgICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcihCaW5hcnkuQlVGRkVSX1NJWkUgKyB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuICAgICAgLy8gQ29tYmluZSB0aGUgdHdvIGJ1ZmZlcnMgdG9nZXRoZXJcbiAgICAgIHRoaXMuYnVmZmVyLmNvcHkoYnVmZmVyLCAwLCAwLCB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuICAgICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gICAgICB0aGlzLmJ1ZmZlclt0aGlzLnBvc2l0aW9uKytdID0gZGVjb2RlZF9ieXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmZmVyID0gbnVsbDtcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBidWZmZXIgKHR5cGVkIG9yIG5vcm1hbCBhcnJheSlcbiAgICAgIGlmKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLmJ1ZmZlcikgPT09ICdbb2JqZWN0IFVpbnQ4QXJyYXldJykge1xuICAgICAgICBidWZmZXIgPSBuZXcgVWludDhBcnJheShuZXcgQXJyYXlCdWZmZXIoQmluYXJ5LkJVRkZFUl9TSVpFICsgdGhpcy5idWZmZXIubGVuZ3RoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWZmZXIgPSBuZXcgQXJyYXkoQmluYXJ5LkJVRkZFUl9TSVpFICsgdGhpcy5idWZmZXIubGVuZ3RoKTtcbiAgICAgIH1cblxuICAgICAgLy8gV2UgbmVlZCB0byBjb3B5IGFsbCB0aGUgY29udGVudCB0byB0aGUgbmV3IGFycmF5XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5idWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnVmZmVyW2ldID0gdGhpcy5idWZmZXJbaV07XG4gICAgICB9XG5cbiAgICAgIC8vIFJlYXNzaWduIHRoZSBidWZmZXJcbiAgICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgLy8gV3JpdGUgdGhlIGJ5dGVcbiAgICAgIHRoaXMuYnVmZmVyW3RoaXMucG9zaXRpb24rK10gPSBkZWNvZGVkX2J5dGU7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFdyaXRlcyBhIGJ1ZmZlciBvciBzdHJpbmcgdG8gdGhlIGJpbmFyeS5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlcnxTdHJpbmd9IHN0cmluZyBhIHN0cmluZyBvciBidWZmZXIgdG8gYmUgd3JpdHRlbiB0byB0aGUgQmluYXJ5IEJTT04gb2JqZWN0LlxuICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBzcGVjaWZ5IHRoZSBiaW5hcnkgb2Ygd2hlcmUgdG8gd3JpdGUgdGhlIGNvbnRlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5CaW5hcnkucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUoc3RyaW5nLCBvZmZzZXQpIHtcbiAgb2Zmc2V0ID0gdHlwZW9mIG9mZnNldCA9PT0gJ251bWJlcicgPyBvZmZzZXQgOiB0aGlzLnBvc2l0aW9uO1xuXG4gIC8vIElmIHRoZSBidWZmZXIgaXMgdG8gc21hbGwgbGV0J3MgZXh0ZW5kIHRoZSBidWZmZXJcbiAgaWYodGhpcy5idWZmZXIubGVuZ3RoIDwgb2Zmc2V0ICsgc3RyaW5nLmxlbmd0aCkge1xuICAgIHZhciBidWZmZXIgPSBudWxsO1xuICAgIC8vIElmIHdlIGFyZSBpbiBub2RlLmpzXG4gICAgaWYodHlwZW9mIEJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgQnVmZmVyLmlzQnVmZmVyKHRoaXMuYnVmZmVyKSkge1xuICAgICAgYnVmZmVyID0gbmV3IEJ1ZmZlcih0aGlzLmJ1ZmZlci5sZW5ndGggKyBzdHJpbmcubGVuZ3RoKTtcbiAgICAgIHRoaXMuYnVmZmVyLmNvcHkoYnVmZmVyLCAwLCAwLCB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuICAgIH0gZWxzZSBpZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5idWZmZXIpID09PSAnW29iamVjdCBVaW50OEFycmF5XScpIHtcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBidWZmZXJcbiAgICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcih0aGlzLmJ1ZmZlci5sZW5ndGggKyBzdHJpbmcubGVuZ3RoKSlcbiAgICAgIC8vIENvcHkgdGhlIGNvbnRlbnRcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLnBvc2l0aW9uOyBpKyspIHtcbiAgICAgICAgYnVmZmVyW2ldID0gdGhpcy5idWZmZXJbaV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQXNzaWduIHRoZSBuZXcgYnVmZmVyXG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG4gIH1cblxuICBpZih0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpKSB7XG4gICAgc3RyaW5nLmNvcHkodGhpcy5idWZmZXIsIG9mZnNldCwgMCwgc3RyaW5nLmxlbmd0aCk7XG4gICAgdGhpcy5wb3NpdGlvbiA9IChvZmZzZXQgKyBzdHJpbmcubGVuZ3RoKSA+IHRoaXMucG9zaXRpb24gPyAob2Zmc2V0ICsgc3RyaW5nLmxlbmd0aCkgOiB0aGlzLnBvc2l0aW9uO1xuICAgIC8vIG9mZnNldCA9IHN0cmluZy5sZW5ndGhcbiAgfSBlbHNlIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBzdHJpbmcgPT09ICdzdHJpbmcnICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikpIHtcbiAgICB0aGlzLmJ1ZmZlci53cml0ZShzdHJpbmcsICdiaW5hcnknLCBvZmZzZXQpO1xuICAgIHRoaXMucG9zaXRpb24gPSAob2Zmc2V0ICsgc3RyaW5nLmxlbmd0aCkgPiB0aGlzLnBvc2l0aW9uID8gKG9mZnNldCArIHN0cmluZy5sZW5ndGgpIDogdGhpcy5wb3NpdGlvbjtcbiAgICAvLyBvZmZzZXQgPSBzdHJpbmcubGVuZ3RoO1xuICB9IGVsc2UgaWYoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN0cmluZykgPT09ICdbb2JqZWN0IFVpbnQ4QXJyYXldJ1xuICAgIHx8IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdHJpbmcpID09PSAnW29iamVjdCBBcnJheV0nICYmIHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5idWZmZXJbb2Zmc2V0KytdID0gc3RyaW5nW2ldO1xuICAgIH1cblxuICAgIHRoaXMucG9zaXRpb24gPSBvZmZzZXQgPiB0aGlzLnBvc2l0aW9uID8gb2Zmc2V0IDogdGhpcy5wb3NpdGlvbjtcbiAgfSBlbHNlIGlmKHR5cGVvZiBzdHJpbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5idWZmZXJbb2Zmc2V0KytdID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuXG4gICAgdGhpcy5wb3NpdGlvbiA9IG9mZnNldCA+IHRoaXMucG9zaXRpb24gPyBvZmZzZXQgOiB0aGlzLnBvc2l0aW9uO1xuICB9XG59O1xuXG4vKipcbiAqIFJlYWRzICoqbGVuZ3RoKiogYnl0ZXMgc3RhcnRpbmcgYXQgKipwb3NpdGlvbioqLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBwb3NpdGlvbiByZWFkIGZyb20gdGhlIGdpdmVuIHBvc2l0aW9uIGluIHRoZSBCaW5hcnkuXG4gKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIHRoZSBudW1iZXIgb2YgYnl0ZXMgdG8gcmVhZC5cbiAqIEByZXR1cm4ge0J1ZmZlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uIHJlYWQocG9zaXRpb24sIGxlbmd0aCkge1xuICBsZW5ndGggPSBsZW5ndGggJiYgbGVuZ3RoID4gMFxuICAgID8gbGVuZ3RoXG4gICAgOiB0aGlzLnBvc2l0aW9uO1xuXG4gIC8vIExldCdzIHJldHVybiB0aGUgZGF0YSBiYXNlZCBvbiB0aGUgdHlwZSB3ZSBoYXZlXG4gIGlmKHRoaXMuYnVmZmVyWydzbGljZSddKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyLnNsaWNlKHBvc2l0aW9uLCBwb3NpdGlvbiArIGxlbmd0aCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQ3JlYXRlIGEgYnVmZmVyIHRvIGtlZXAgdGhlIHJlc3VsdFxuICAgIHZhciBidWZmZXIgPSB0eXBlb2YgVWludDhBcnJheSAhPSAndW5kZWZpbmVkJyA/IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcihsZW5ndGgpKSA6IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmZmVyW2ldID0gdGhpcy5idWZmZXJbcG9zaXRpb24rK107XG4gICAgfVxuICB9XG4gIC8vIFJldHVybiB0aGUgYnVmZmVyXG4gIHJldHVybiBidWZmZXI7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoaXMgYmluYXJ5IGFzIGEgc3RyaW5nLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbiB2YWx1ZShhc1Jhdykge1xuICBhc1JhdyA9IGFzUmF3ID09IG51bGwgPyBmYWxzZSA6IGFzUmF3O1xuXG4gIC8vIE9wdGltaXplIHRvIHNlcmlhbGl6ZSBmb3IgdGhlIHNpdHVhdGlvbiB3aGVyZSB0aGUgZGF0YSA9PSBzaXplIG9mIGJ1ZmZlclxuICBpZihhc1JhdyAmJiB0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBCdWZmZXIuaXNCdWZmZXIodGhpcy5idWZmZXIpICYmIHRoaXMuYnVmZmVyLmxlbmd0aCA9PSB0aGlzLnBvc2l0aW9uKVxuICAgIHJldHVybiB0aGlzLmJ1ZmZlcjtcblxuICAvLyBJZiBpdCdzIGEgbm9kZS5qcyBidWZmZXIgb2JqZWN0XG4gIGlmKHR5cGVvZiBCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEJ1ZmZlci5pc0J1ZmZlcih0aGlzLmJ1ZmZlcikpIHtcbiAgICByZXR1cm4gYXNSYXcgPyB0aGlzLmJ1ZmZlci5zbGljZSgwLCB0aGlzLnBvc2l0aW9uKSA6IHRoaXMuYnVmZmVyLnRvU3RyaW5nKCdiaW5hcnknLCAwLCB0aGlzLnBvc2l0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICBpZihhc1Jhdykge1xuICAgICAgLy8gd2Ugc3VwcG9ydCB0aGUgc2xpY2UgY29tbWFuZCB1c2UgaXRcbiAgICAgIGlmKHRoaXMuYnVmZmVyWydzbGljZSddICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmZmVyLnNsaWNlKDAsIHRoaXMucG9zaXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IGJ1ZmZlciB0byBjb3B5IGNvbnRlbnQgdG9cbiAgICAgICAgdmFyIG5ld0J1ZmZlciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLmJ1ZmZlcikgPT09ICdbb2JqZWN0IFVpbnQ4QXJyYXldJyA/IG5ldyBVaW50OEFycmF5KG5ldyBBcnJheUJ1ZmZlcih0aGlzLnBvc2l0aW9uKSkgOiBuZXcgQXJyYXkodGhpcy5wb3NpdGlvbik7XG4gICAgICAgIC8vIENvcHkgY29udGVudFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5wb3NpdGlvbjsgaSsrKSB7XG4gICAgICAgICAgbmV3QnVmZmVyW2ldID0gdGhpcy5idWZmZXJbaV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBidWZmZXJcbiAgICAgICAgcmV0dXJuIG5ld0J1ZmZlcjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGNvbnZlcnRBcnJheXRvVXRmOEJpbmFyeVN0cmluZyh0aGlzLmJ1ZmZlciwgMCwgdGhpcy5wb3NpdGlvbik7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIExlbmd0aC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBsZW5ndGggb2YgdGhlIGJpbmFyeS5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xuICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkJpbmFyeS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmJ1ZmZlciAhPSBudWxsID8gdGhpcy5idWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpIDogJyc7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5CaW5hcnkucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oZm9ybWF0KSB7XG4gIHJldHVybiB0aGlzLmJ1ZmZlciAhPSBudWxsID8gdGhpcy5idWZmZXIuc2xpY2UoMCwgdGhpcy5wb3NpdGlvbikudG9TdHJpbmcoZm9ybWF0KSA6ICcnO1xufTtcblxuLy8gQmluYXJ5IGRlZmF1bHQgc3VidHlwZVxudmFyIEJTT05fQklOQVJZX1NVQlRZUEVfREVGQVVMVCA9IDA7XG5cbi8qKlxuICogQGlnbm9yZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbnZhciB3cml0ZVN0cmluZ1RvQXJyYXkgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIENyZWF0ZSBhIGJ1ZmZlclxuICB2YXIgYnVmZmVyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gbmV3IFVpbnQ4QXJyYXkobmV3IEFycmF5QnVmZmVyKGRhdGEubGVuZ3RoKSkgOiBuZXcgQXJyYXkoZGF0YS5sZW5ndGgpO1xuICAvLyBXcml0ZSB0aGUgY29udGVudCB0byB0aGUgYnVmZmVyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgYnVmZmVyW2ldID0gZGF0YS5jaGFyQ29kZUF0KGkpO1xuICB9XG4gIC8vIFdyaXRlIHRoZSBzdHJpbmcgdG8gdGhlIGJ1ZmZlclxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IEFycmF5IG90IFVpbnQ4QXJyYXkgdG8gQmluYXJ5IFN0cmluZ1xuICpcbiAqIEBpZ25vcmVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgY29udmVydEFycmF5dG9VdGY4QmluYXJ5U3RyaW5nID0gZnVuY3Rpb24oYnl0ZUFycmF5LCBzdGFydEluZGV4LCBlbmRJbmRleCkge1xuICB2YXIgcmVzdWx0ID0gJyc7XG4gIGZvcih2YXIgaSA9IHN0YXJ0SW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgcmVzdWx0ID0gcmVzdWx0ICsgU3RyaW5nLmZyb21DaGFyQ29kZShieXRlQXJyYXlbaV0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5CaW5hcnkuQlVGRkVSX1NJWkUgPSAyNTY7XG5cbi8qKlxuICogRGVmYXVsdCBCU09OIHR5cGVcbiAqXG4gKiBAY2xhc3Njb25zdGFudCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0RFRkFVTFQgPSAwO1xuLyoqXG4gKiBGdW5jdGlvbiBCU09OIHR5cGVcbiAqXG4gKiBAY2xhc3Njb25zdGFudCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0ZVTkNUSU9OID0gMTtcbi8qKlxuICogQnl0ZSBBcnJheSBCU09OIHR5cGVcbiAqXG4gKiBAY2xhc3Njb25zdGFudCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX0JZVEVfQVJSQVkgPSAyO1xuLyoqXG4gKiBPTEQgVVVJRCBCU09OIHR5cGVcbiAqXG4gKiBAY2xhc3Njb25zdGFudCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX1VVSURfT0xEID0gMztcbi8qKlxuICogVVVJRCBCU09OIHR5cGVcbiAqXG4gKiBAY2xhc3Njb25zdGFudCBTVUJUWVBFX0RFRkFVTFRcbiAqKi9cbkJpbmFyeS5TVUJUWVBFX1VVSUQgPSA0O1xuLyoqXG4gKiBNRDUgQlNPTiB0eXBlXG4gKlxuICogQGNsYXNzY29uc3RhbnQgU1VCVFlQRV9ERUZBVUxUXG4gKiovXG5CaW5hcnkuU1VCVFlQRV9NRDUgPSA1O1xuLyoqXG4gKiBVc2VyIEJTT04gdHlwZVxuICpcbiAqIEBjbGFzc2NvbnN0YW50IFNVQlRZUEVfREVGQVVMVFxuICoqL1xuQmluYXJ5LlNVQlRZUEVfVVNFUl9ERUZJTkVEID0gMTI4O1xuXG4vKipcbiAqIEV4cG9zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBCaW5hcnk7XG5tb2R1bGUuZXhwb3J0cy5CaW5hcnkgPSBCaW5hcnk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEJpbmFyeSBQYXJzZXIuXG4gKiBKb25hcyBSYW9uaSBTb2FyZXMgU2lsdmFcbiAqIGh0dHA6Ly9qc2Zyb21oZWxsLmNvbS9jbGFzc2VzL2JpbmFyeS1wYXJzZXIgW3YxLjBdXG4gKlxuICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vbW9uZ29kYi9qcy1ic29uL2Jsb2IvbWFzdGVyL2xpYi9ic29uL2JpbmFyeV9wYXJzZXIuanNcbiAqL1xuXG52YXIgbWF4Qml0cyA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG5cdG1heEJpdHNbaV0gPSBNYXRoLnBvdygyLCBpKTtcbn1cblxuZnVuY3Rpb24gQmluYXJ5UGFyc2VyIChiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucykge1xuICBpZighKHRoaXMgaW5zdGFuY2VvZiBCaW5hcnlQYXJzZXIpKSByZXR1cm4gbmV3IEJpbmFyeVBhcnNlcihiaWdFbmRpYW4sIGFsbG93RXhjZXB0aW9ucyk7XG4gIFxuXHR0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbjtcblx0dGhpcy5hbGxvd0V4Y2VwdGlvbnMgPSBhbGxvd0V4Y2VwdGlvbnM7XG59XG5cbkJpbmFyeVBhcnNlci53YXJuID0gZnVuY3Rpb24gd2FybiAobXNnKSB7XG5cdGlmICh0aGlzLmFsbG93RXhjZXB0aW9ucykge1xuXHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cblx0cmV0dXJuIDE7XG59O1xuXG5CaW5hcnlQYXJzZXIuZGVjb2RlSW50ID0gZnVuY3Rpb24gZGVjb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG4gIHZhciBiID0gbmV3IHRoaXMuQnVmZmVyKHRoaXMuYmlnRW5kaWFuIHx8IGZvcmNlQmlnRW5kaWFuLCBkYXRhKVxuICAgICAgLCB4ID0gYi5yZWFkQml0cygwLCBiaXRzKVxuICAgICAgLCBtYXggPSBtYXhCaXRzW2JpdHNdOyAvL21heCA9IE1hdGgucG93KCAyLCBiaXRzICk7XG4gIFxuICByZXR1cm4gc2lnbmVkICYmIHggPj0gbWF4IC8gMlxuICAgICAgPyB4IC0gbWF4XG4gICAgICA6IHg7XG59O1xuXG5CaW5hcnlQYXJzZXIuZW5jb2RlSW50ID0gZnVuY3Rpb24gZW5jb2RlSW50IChkYXRhLCBiaXRzLCBzaWduZWQsIGZvcmNlQmlnRW5kaWFuKSB7XG5cdHZhciBtYXggPSBtYXhCaXRzW2JpdHNdO1xuXG4gIGlmIChkYXRhID49IG1heCB8fCBkYXRhIDwgLShtYXggLyAyKSkge1xuICAgIHRoaXMud2FybignZW5jb2RlSW50OjpvdmVyZmxvdycpO1xuICAgIGRhdGEgPSAwO1xuICB9XG5cblx0aWYgKGRhdGEgPCAwKSB7XG4gICAgZGF0YSArPSBtYXg7XG4gIH1cblxuXHRmb3IgKHZhciByID0gW107IGRhdGE7IHJbci5sZW5ndGhdID0gU3RyaW5nLmZyb21DaGFyQ29kZShkYXRhICUgMjU2KSwgZGF0YSA9IE1hdGguZmxvb3IoZGF0YSAvIDI1NikpO1xuXG5cdGZvciAoYml0cyA9IC0oLWJpdHMgPj4gMykgLSByLmxlbmd0aDsgYml0cy0tOyByW3IubGVuZ3RoXSA9ICdcXDAnKTtcblxuICByZXR1cm4gKCh0aGlzLmJpZ0VuZGlhbiB8fCBmb3JjZUJpZ0VuZGlhbikgPyByLnJldmVyc2UoKSA6IHIpLmpvaW4oJycpO1xufTtcblxuQmluYXJ5UGFyc2VyLnRvU21hbGwgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TbWFsbCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvQnl0ZSAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21CeXRlICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsICA4LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvU2hvcnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21TaG9ydCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvV29yZCAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Xb3JkICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDE2LCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvSW50ICAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21JbnQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvTG9uZyAgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Mb25nICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRFdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21EV29yZCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVJbnQoIGRhdGEsIDMyLCBmYWxzZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvUVdvcmQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVJbnQoIGRhdGEsIDY0LCB0cnVlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVFXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcblxuLyoqXG4gKiBCaW5hcnlQYXJzZXIgYnVmZmVyIGNvbnN0cnVjdG9yLlxuICovXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXJCdWZmZXIgKGJpZ0VuZGlhbiwgYnVmZmVyKSB7XG4gIHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuIHx8IDA7XG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG59XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gc2V0QnVmZmVyIChkYXRhKSB7XG4gIHZhciBsLCBpLCBiO1xuXG5cdGlmIChkYXRhKSB7XG4gICAgaSA9IGwgPSBkYXRhLmxlbmd0aDtcbiAgICBiID0gdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkobCk7XG5cdFx0Zm9yICg7IGk7IGJbbCAtIGldID0gZGF0YS5jaGFyQ29kZUF0KC0taSkpO1xuXHRcdHRoaXMuYmlnRW5kaWFuICYmIGIucmV2ZXJzZSgpO1xuXHR9XG59O1xuXG5CaW5hcnlQYXJzZXJCdWZmZXIucHJvdG90eXBlLmhhc05lZWRlZEJpdHMgPSBmdW5jdGlvbiBoYXNOZWVkZWRCaXRzIChuZWVkZWRCaXRzKSB7XG5cdHJldHVybiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0gLSgtbmVlZGVkQml0cyA+PiAzKTtcbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuY2hlY2tCdWZmZXIgPSBmdW5jdGlvbiBjaGVja0J1ZmZlciAobmVlZGVkQml0cykge1xuXHRpZiAoIXRoaXMuaGFzTmVlZGVkQml0cyhuZWVkZWRCaXRzKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignY2hlY2tCdWZmZXI6Om1pc3NpbmcgYnl0ZXMnKTtcbiAgfVxufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5yZWFkQml0cyA9IGZ1bmN0aW9uIHJlYWRCaXRzIChzdGFydCwgbGVuZ3RoKSB7XG5cdC8vc2hsIGZpeDogSGVucmkgVG9yZ2VtYW5lIH4xOTk2IChjb21wcmVzc2VkIGJ5IEpvbmFzIFJhb25pKVxuXG5cdGZ1bmN0aW9uIHNobCAoYSwgYikge1xuXHRcdGZvciAoOyBiLS07IGEgPSAoKGEgJT0gMHg3ZmZmZmZmZiArIDEpICYgMHg0MDAwMDAwMCkgPT0gMHg0MDAwMDAwMCA/IGEgKiAyIDogKGEgLSAweDQwMDAwMDAwKSAqIDIgKyAweDdmZmZmZmZmICsgMSk7XG5cdFx0cmV0dXJuIGE7XG5cdH1cblxuXHRpZiAoc3RhcnQgPCAwIHx8IGxlbmd0aCA8PSAwKSB7XG5cdFx0cmV0dXJuIDA7XG4gIH1cblxuXHR0aGlzLmNoZWNrQnVmZmVyKHN0YXJ0ICsgbGVuZ3RoKTtcblxuICB2YXIgb2Zmc2V0TGVmdFxuICAgICwgb2Zmc2V0UmlnaHQgPSBzdGFydCAlIDhcbiAgICAsIGN1ckJ5dGUgPSB0aGlzLmJ1ZmZlci5sZW5ndGggLSAoIHN0YXJ0ID4+IDMgKSAtIDFcbiAgICAsIGxhc3RCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoICsgKCAtKCBzdGFydCArIGxlbmd0aCApID4+IDMgKVxuICAgICwgZGlmZiA9IGN1ckJ5dGUgLSBsYXN0Qnl0ZVxuICAgICwgc3VtID0gKCh0aGlzLmJ1ZmZlclsgY3VyQnl0ZSBdID4+IG9mZnNldFJpZ2h0KSAmICgoMSA8PCAoZGlmZiA/IDggLSBvZmZzZXRSaWdodCA6IGxlbmd0aCkpIC0gMSkpICsgKGRpZmYgJiYgKG9mZnNldExlZnQgPSAoc3RhcnQgKyBsZW5ndGgpICUgOCkgPyAodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10gJiAoKDEgPDwgb2Zmc2V0TGVmdCkgLSAxKSkgPDwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0IDogMCk7XG5cblx0Zm9yKDsgZGlmZjsgc3VtICs9IHNobCh0aGlzLmJ1ZmZlcltsYXN0Qnl0ZSsrXSwgKGRpZmYtLSA8PCAzKSAtIG9mZnNldFJpZ2h0KSk7XG5cblx0cmV0dXJuIHN1bTtcbn07XG5cbi8qKlxuICogRXhwb3NlLlxuICovXG5CaW5hcnlQYXJzZXIuQnVmZmVyID0gQmluYXJ5UGFyc2VyQnVmZmVyO1xuXG5leHBvcnRzLkJpbmFyeVBhcnNlciA9IEJpbmFyeVBhcnNlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50Jyk7XG5cbi8vVE9ETzog0L3QsNC/0LjRgdCw0YLRjCDQvNC10YLQvtC0IC51cHNlcnQoIGRvYyApIC0g0L7QsdC90L7QstC70LXQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwLCDQsCDQtdGB0LvQuCDQtdCz0L4g0L3QtdGCLCDRgtC+INGB0L7Qt9C00LDQvdC40LVcblxuLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC70L7Qs9C40LrRgyDRgSBhcGlSZXNvdXJjZSAo0YHQvtGF0YDQsNC90Y/RgtGMINGB0YHRi9C70LrRgyDQvdCwINC90LXQs9C+INC4INC40YHQv9C+0LvRjNC30L7QstGC0Ywg0L/RgNC4INC80LXRgtC+0LTQtSBkb2Muc2F2ZSlcbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC4XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0KHRhdC10LzQsCDQuNC70Lgg0L7QsdGK0LXQutGCINC+0L/QuNGB0LDQvdC40Y8g0YHRhdC10LzRi1xuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICAvLyDQodC+0YXRgNCw0L3QuNC8INC90LDQt9Cy0LDQvdC40LUg0L/RgNC+0YHRgtGA0LDQvdGB0YLQstCwINC40LzRkdC9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgdGhpcy5kb2N1bWVudHMgPSB7fTtcblxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDRgdGB0YvQu9C60YMg0L3QsCBhcGkg0LTQu9GPINC80LXRgtC+0LTQsCAuc2F2ZSgpXG4gIHRoaXMuYXBpID0gYXBpO1xuXG4gIC8vINCY0YHQv9C+0LvRjNC30YPQtdC80LDRjyDRgdGF0LXQvNCwINC00LvRjyDQutC+0LvQu9C10LrRhtC40LhcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8g0J7RgtC+0LHRgNCw0LbQtdC90LjQtSDQvtCx0YrQtdC60YLQsCBkb2N1bWVudHMg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAgKNC00LvRjyDQvdC+0LrQsNGD0YLQsClcbiAgdGhpcy5hcnJheSA9IFtdO1xuXG4gIC8vIHRvZG86INC/0LXRgNC10L3QtdGB0YLQuCDQsiDQsNC00LDQv9GC0LXRgCDQuNC70Lgg0YHQtNC10LvQsNGC0Ywg0L/QviDQtNGA0YPQs9C+0LzRgyAob2JqZWN0Lm9ic2VydmUpXG4gIC8vINCd0YPQttC90L4g0LTQu9GPINC+0LHQvdC+0LLQu9C10L3QuNGPINC/0YDQuNCy0Y/Qt9C+0Log0Log0Y3RgtC+0LzRgyDRgdCy0L7QudGB0YLQstGDINC00LvRjyBrbm9ja291dGpzXG4gIHdpbmRvdy5rbyAmJiBrby50cmFjayggdGhpcywgWydhcnJheSddICk7XG59XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlID0ge1xuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC40LvQuCDQvNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoeyB0eXBlOiAnamVsbHkgYmVhbicgfSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoW3sgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHsgdHlwZTogJ3NuaWNrZXJzJyB9XSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoeyBfaWQ6ICcqKioqKicsIHR5cGU6ICdqZWxseSBiZWFuJyB9LCB0cnVlKTtcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R8QXJyYXkuPG9iamVjdD59IFtkb2NdIC0g0JTQvtC60YPQvNC10L3RglxuICAgKiBAcGFyYW0ge29iamVjdH0gW2ZpZWxkc10gLSDQstGL0LHRgNCw0L3QvdGL0LUg0L/QvtC70Y8g0L/RgNC4INC30LDQv9GA0L7RgdC1ICjQvdC1INGA0LXQsNC70LjQt9C+0LLQsNC90L4g0LIg0LTQvtC60YPQvNC10L3RgtC1KVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpbml0XSAtIGh5ZHJhdGUgZG9jdW1lbnQgLSDQvdCw0L/QvtC70L3QuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQtNCw0L3QvdGL0LzQuCAo0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINCyIGFwaS1jbGllbnQpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW19zdG9yYWdlV2lsbE11dGF0ZV0gLSDQpNC70LDQsyDQtNC+0LHQsNCy0LvQtdC90LjRjyDQvNCw0YHRgdC40LLQsCDQtNC+0LrRg9C80LXQvdGC0L7Qsi4g0YLQvtC70YzQutC+INC00LvRjyDQstC90YPRgtGA0LXQvdC90LXQs9C+INC40YHQv9C+0LvRjNC30L7QstCw0L3QuNGPXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fEFycmF5LjxzdG9yYWdlLkRvY3VtZW50Pn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIGRvYywgZmllbGRzLCBpbml0LCBfc3RvcmFnZVdpbGxNdXRhdGUgKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3QtdGCLCDQt9C90LDRh9C40YIg0LHRg9C00LXRgiDQv9GD0YHRgtC+0LlcbiAgICBpZiAoIGRvYyA9PSBudWxsICkgZG9jID0gbnVsbDtcblxuICAgIC8vINCc0LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QslxuICAgIGlmICggXy5pc0FycmF5KCBkb2MgKSApe1xuICAgICAgdmFyIHNhdmVkRG9jcyA9IFtdO1xuXG4gICAgICBfLmVhY2goIGRvYywgZnVuY3Rpb24oIGRvYyApe1xuICAgICAgICBzYXZlZERvY3MucHVzaCggc2VsZi5hZGQoIGRvYywgZmllbGRzLCBpbml0LCB0cnVlICkgKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG5cbiAgICAgIHJldHVybiBzYXZlZERvY3M7XG4gICAgfVxuXG4gICAgdmFyIGlkID0gZG9jICYmIGRvYy5faWQ7XG5cbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGCINGD0LbQtSDQtdGB0YLRjCwg0YLQviDQv9GA0L7RgdGC0L4g0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LfQvdCw0YfQtdC90LjRj1xuICAgIGlmICggaWQgJiYgdGhpcy5kb2N1bWVudHNbIGlkIF0gKXtcbiAgICAgIHRoaXMuZG9jdW1lbnRzWyBpZCBdLnNldCggZG9jICk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpc2NyaW1pbmF0b3JNYXBwaW5nID0gdGhpcy5zY2hlbWFcbiAgICAgICAgPyB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZ1xuICAgICAgICA6IG51bGw7XG5cbiAgICAgIHZhciBrZXkgPSBkaXNjcmltaW5hdG9yTWFwcGluZyAmJiBkaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3RcbiAgICAgICAgPyBkaXNjcmltaW5hdG9yTWFwcGluZy5rZXlcbiAgICAgICAgOiBudWxsO1xuXG4gICAgICAvLyDQktGL0LHQuNGA0LDQtdC8INGB0YXQtdC80YMsINC10YHQu9C4INC10YHRgtGMINC00LjRgdC60YDQuNC80LjQvdCw0YLQvtGAXG4gICAgICB2YXIgc2NoZW1hO1xuICAgICAgaWYgKGtleSAmJiBkb2MgJiYgZG9jW2tleV0gJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnMgJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dKSB7XG4gICAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzW2RvY1trZXldXTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWE7XG4gICAgICB9XG5cbiAgICAgIHZhciBuZXdEb2MgPSBuZXcgRG9jdW1lbnQoIGRvYywgdGhpcy5uYW1lLCBzY2hlbWEsIGZpZWxkcywgaW5pdCApO1xuICAgICAgLy90b2RvOiDRgtGD0YIg0L3Rg9C20L3QsCDQv9GA0L7QstC10YDQutCwINC90LAg0YHRg9GJ0LXRgdGC0LLQvtCy0LDQvdC40LUgaWQgKNC80L7QttC10YIg0YHRgtC+0LjRgiDRgdC80L7RgtGA0LXRgtGMINCyINGB0YXQtdC80LUg0L7Qv9GG0LjRjiBpZClcbiAgICAgIC8qaWYgKCAhbmV3RG9jLl9pZCApe1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQlNC70Y8g0L/QvtC80LXRidC10L3QuNGPINCyINC60L7Qu9C70LXQutGG0LjRjiDQvdC10L7QsdGF0L7QtNC40LzQviwg0YfRgtC+0LHRiyDRgyDQtNC+0LrRg9C80LXQvdGC0LAg0LHRi9C7IF9pZCcpO1xuICAgICAgfSovXG5cbiAgICAgIGlkID0gbmV3RG9jLl9pZC50b1N0cmluZygpO1xuICAgICAgLy8g0J/QvtC80LXRgdGC0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LIg0LrQvtC70LvQtdC60YbQuNGOXG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXSA9IG5ld0RvYztcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGB0YvQu9C60YMg0L3QsCDQtNC+0LrRg9C80LXQvdGCINCyINC/0L7Qu9C1IGRvY3VtZW50c1xuICAgKlxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBkb2NcbiAgICovXG4gIHVwZGF0ZUlkTGluazogZnVuY3Rpb24oIGRvYyApe1xuICAgIHZhciBpZCA9IGRvYy5faWQudG9TdHJpbmcoKTtcbiAgICB2YXIgb2xkSWQgPSBfLmZpbmRLZXkoIHRoaXMuZG9jdW1lbnRzLCB7IF9pZDogZG9jLl9pZCB9KTtcblxuICAgIGlmICggIW9sZElkICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQndC1INC90LDQudC00LXQvSDQtNC+0LrRg9C80LXQvdGCINC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGB0YvQu9C60Lgg0L/QviDRjdGC0L7QvNGDIF9pZDogJyArIGlkICk7XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMuZG9jdW1lbnRzWyBvbGRJZCBdO1xuICAgIHRoaXMuZG9jdW1lbnRzWyBpZCBdID0gZG9jO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG4gICwgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpXG4gICwgTWl4ZWRTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYS9taXhlZCcpXG4gICwgT2JqZWN0SWQgPSByZXF1aXJlKCcuL3R5cGVzL29iamVjdGlkJylcbiAgLCBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgVmFsaWRhdG9yRXJyb3IgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKS5WYWxpZGF0b3JFcnJvclxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgY2xvbmUgPSB1dGlscy5jbG9uZVxuICAsIFZhbGlkYXRpb25FcnJvciA9IFN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3JcbiAgLCBJbnRlcm5hbENhY2hlID0gcmVxdWlyZSgnLi9pbnRlcm5hbCcpXG4gICwgZGVlcEVxdWFsID0gdXRpbHMuZGVlcEVxdWFsXG4gICwgRG9jdW1lbnRBcnJheVxuICAsIFNjaGVtYUFycmF5XG4gICwgRW1iZWRkZWQ7XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQtNC+0LrRg9C80LXQvdGC0LAuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSDQt9C90LDRh9C10L3QuNGPLCDQutC+0YLQvtGA0YvQtSDQvdGD0LbQvdC+INGD0YHRgtCw0L3QvtCy0LjRgtGMXG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjb2xsZWN0aW9uTmFtZV0gLSDQutC+0LvQu9C10LrRhtC40Y8g0LIg0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDQvdCw0YXQvtC00LjRgtGB0Y8g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINGB0YXQtdC80LAg0L/QviDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINGB0L7Qt9C00LDQvSDQtNC+0LrRg9C80LXQvdGCXG4gKiBAcGFyYW0ge29iamVjdH0gW2ZpZWxkc10gLSDQstGL0LHRgNCw0L3QvdGL0LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1ICjQvdC1INGA0LXQsNC70LjQt9C+0LLQsNC90L4pXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpbml0XSAtIGh5ZHJhdGUgZG9jdW1lbnQgLSDQvdCw0L/QvtC70L3QuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQtNCw0L3QvdGL0LzQuCAo0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINCyIGFwaS1jbGllbnQpXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnQgKCBkYXRhLCBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKXtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBEb2N1bWVudCkgKSB7XG4gICAgcmV0dXJuIG5ldyBEb2N1bWVudCggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gIH1cblxuICB0aGlzLiRfXyA9IG5ldyBJbnRlcm5hbENhY2hlKCk7XG4gIHRoaXMuaXNOZXcgPSB0cnVlO1xuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQodHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgZGF0YSApe1xuICAgIGluaXQgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKCBjb2xsZWN0aW9uTmFtZSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIGNvbGxlY3Rpb25OYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1XG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG5cbiAgICBpZiAoIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IHsgX2lkOiBuZXcgT2JqZWN0SWQoKSB9O1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hIHx8IHNjaGVtYTtcbiAgICAvLyDQodCz0LXQvdC10YDQuNGA0L7QstCw0YLRjCBPYmplY3RJZCwg0LXRgdC70Lgg0L7QvSDQvtGC0YHRg9GC0YHRgtCy0YPQtdGCLCDQvdC+INC10LPQviDRgtGA0LXQsdGD0LXRgiDRgdGF0LXQvNCwXG4gICAgaWYgKCBzY2hlbWEgJiYgIXRoaXMuc2NoZW1hICYmIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAgIGlmICggZGF0YS5faWQgPT09IHVuZGVmaW5lZCApe1xuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICggIXNjaGVtYSApe1xuICAgIHRocm93IG5ldyBTdG9yYWdlRXJyb3IuTWlzc2luZ1NjaGVtYUVycm9yKCk7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQoeyB0ZXN0OiAnYm9vbScgfSwgdHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgY29sbGVjdGlvbk5hbWUgKXtcbiAgICBpbml0ID0gY29sbGVjdGlvbk5hbWU7XG4gICAgY29sbGVjdGlvbk5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBIHN0cmljdDogdHJ1ZVxuICAvLyBjb2xsZWN0aW9uLmFkZCh7Li4ufSwgdHJ1ZSk7XG4gIGlmICgnYm9vbGVhbicgPT09IHR5cGVvZiBmaWVsZHMpIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gZmllbGRzO1xuICAgIGZpZWxkcyA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gc2NoZW1hLm9wdGlvbnMgJiYgc2NoZW1hLm9wdGlvbnMuc3RyaWN0O1xuICAgIHRoaXMuJF9fLnNlbGVjdGVkID0gZmllbGRzO1xuICB9XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgaWYgKCBjb2xsZWN0aW9uTmFtZSApe1xuICAgIHRoaXMuY29sbGVjdGlvbiA9IHdpbmRvdy5zdG9yYWdlWyBjb2xsZWN0aW9uTmFtZSBdO1xuICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgfVxuXG4gIHZhciByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZFBhdGhzKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVxdWlyZWQubGVuZ3RoOyArK2kpIHtcbiAgICB0aGlzLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKCByZXF1aXJlZFtpXSApO1xuICB9XG5cbiAgdGhpcy4kX19zZXRTY2hlbWEoIHNjaGVtYSApO1xuXG4gIHRoaXMuX2RvYyA9IHRoaXMuJF9fYnVpbGREb2MoIGRhdGEsIGluaXQgKTtcblxuICBpZiAoIGluaXQgKXtcbiAgICB0aGlzLmluaXQoIGRhdGEgKTtcbiAgfSBlbHNlIGlmICggZGF0YSApIHtcbiAgICB0aGlzLnNldCggZGF0YSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gIH1cblxuICAvLyBhcHBseSBtZXRob2RzXG4gIGZvciAoIHZhciBtIGluIHNjaGVtYS5tZXRob2RzICl7XG4gICAgdGhpc1sgbSBdID0gc2NoZW1hLm1ldGhvZHNbIG0gXTtcbiAgfVxuICAvLyBhcHBseSBzdGF0aWNzXG4gIGZvciAoIHZhciBzIGluIHNjaGVtYS5zdGF0aWNzICl7XG4gICAgdGhpc1sgcyBdID0gc2NoZW1hLnN0YXRpY3NbIHMgXTtcbiAgfVxufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gRXZlbnRFbWl0dGVyLlxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5Eb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEb2N1bWVudDtcblxuLyoqXG4gKiBUaGUgZG9jdW1lbnRzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IHNjaGVtYVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2NoZW1hO1xuXG4vKipcbiAqIEJvb2xlYW4gZmxhZyBzcGVjaWZ5aW5nIGlmIHRoZSBkb2N1bWVudCBpcyBuZXcuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBpc05ld1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNOZXc7XG5cbi8qKlxuICogVGhlIHN0cmluZyB2ZXJzaW9uIG9mIHRoaXMgZG9jdW1lbnRzIF9pZC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIGdldHRlciBleGlzdHMgb24gYWxsIGRvY3VtZW50cyBieSBkZWZhdWx0LiBUaGUgZ2V0dGVyIGNhbiBiZSBkaXNhYmxlZCBieSBzZXR0aW5nIHRoZSBgaWRgIFtvcHRpb25dKC9kb2NzL2d1aWRlLmh0bWwjaWQpIG9mIGl0cyBgU2NoZW1hYCB0byBmYWxzZSBhdCBjb25zdHJ1Y3Rpb24gdGltZS5cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IGlkOiBmYWxzZSB9KTtcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBTY2hlbWEgb3B0aW9ucyAvZG9jcy9ndWlkZS5odG1sI29wdGlvbnNcbiAqIEBwcm9wZXJ0eSBpZFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaWQ7XG5cbi8qKlxuICogSGFzaCBjb250YWluaW5nIGN1cnJlbnQgdmFsaWRhdGlvbiBlcnJvcnMuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBlcnJvcnNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmVycm9ycztcblxuRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IHtcbiAgZG9jdW1lbnREZWZpbmVQcm9wZXJ0eTogJC5ub29wLFxuICBkb2N1bWVudFNldEluaXRpYWxWYWx1ZTogJC5ub29wLFxuICBkb2N1bWVudEdldFZhbHVlOiAkLm5vb3AsXG4gIGRvY3VtZW50U2V0VmFsdWU6ICQubm9vcFxufTtcblxuLyoqXG4gKiBCdWlsZHMgdGhlIGRlZmF1bHQgZG9jIHN0cnVjdHVyZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3NraXBJZF1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19idWlsZERvY1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19idWlsZERvYyA9IGZ1bmN0aW9uICggb2JqLCBza2lwSWQgKSB7XG4gIHZhciBkb2MgPSB7fVxuICAgICwgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT09IHAgKSB7XG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xuICAgICAgaWYgKCBvYmogJiYgJ19pZCcgaW4gb2JqICkgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcbiAgICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvYztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRvY3VtZW50IHdpdGhvdXQgc2V0dGVycyBvciBtYXJraW5nIGFueXRoaW5nIG1vZGlmaWVkLlxuICpcbiAqIENhbGxlZCBpbnRlcm5hbGx5IGFmdGVyIGEgZG9jdW1lbnQgaXMgcmV0dXJuZWQgZnJvbSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XG4gIHRoaXMuaXNOZXcgPSBmYWxzZTtcblxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcbiAgLy8gaGFuZGxlIGRvY3Mgd2l0aCBwb3B1bGF0ZWQgcGF0aHNcbiAgLyohXG4gIGlmICggZG9jLl9pZCAmJiBvcHRzICYmIG9wdHMucG9wdWxhdGVkICYmIG9wdHMucG9wdWxhdGVkLmxlbmd0aCApIHtcbiAgICB2YXIgaWQgPSBTdHJpbmcoIGRvYy5faWQgKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdHMucG9wdWxhdGVkLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgaXRlbSA9IG9wdHMucG9wdWxhdGVkWyBpIF07XG4gICAgICB0aGlzLnBvcHVsYXRlZCggaXRlbS5wYXRoLCBpdGVtLl9kb2NzW2lkXSwgaXRlbSApO1xuICAgIH1cbiAgfVxuICAqL1xuXG4gIGluaXQoIHRoaXMsIGRhdGEsIHRoaXMuX2RvYyApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyohXG4gKiBJbml0IGhlbHBlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9iaiByYXcgc2VydmVyIGRvY1xuICogQHBhcmFtIHtPYmplY3R9IGRvYyBvYmplY3Qgd2UgYXJlIGluaXRpYWxpemluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXQgKHNlbGYsIG9iaiwgZG9jLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAsIHNjaGVtYVxuICAgICwgcGF0aFxuICAgICwgaTtcblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICBpID0ga2V5c1tsZW5dO1xuICAgIHBhdGggPSBwcmVmaXggKyBpO1xuICAgIHNjaGVtYSA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG5cbiAgICBpZiAoIXNjaGVtYSAmJiBfLmlzUGxhaW5PYmplY3QoIG9ialsgaSBdICkgJiZcbiAgICAgICAgKCFvYmpbaV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbaV0uY29uc3RydWN0b3IpKSkge1xuICAgICAgLy8gYXNzdW1lIG5lc3RlZCBvYmplY3RcbiAgICAgIGlmICghZG9jW2ldKSBkb2NbaV0gPSB7fTtcbiAgICAgIGluaXQoc2VsZiwgb2JqW2ldLCBkb2NbaV0sIHBhdGggKyAnLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW2ldID09PSBudWxsKSB7XG4gICAgICAgIGRvY1tpXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG9ialtpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICBzZWxmLiRfX3RyeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG9jW2ldID0gc2NoZW1hLmNhc3Qob2JqW2ldLCBzZWxmLCB0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb2NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldEluaXRpYWxWYWx1ZS5jYWxsKCBzZWxmLCBzZWxmLCBwYXRoLCBkb2NbaV0gKTtcbiAgICAgIH1cbiAgICAgIC8vIG1hcmsgYXMgaHlkcmF0ZWRcbiAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmluaXQocGF0aCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwYXRoLCBvciBtYW55IHBhdGhzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICAvLyBwYXRoLCB2YWx1ZVxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUpXG4gKlxuICogICAgIC8vIG9iamVjdFxuICogICAgIGRvYy5zZXQoe1xuICogICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAsIHBhdGgyIDoge1xuICogICAgICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAgIH1cbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvbmx5LXRoZS1mbHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBOdW1iZXIpXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIHN0cmluZ1xuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIFN0cmluZylcbiAqXG4gKiAgICAgLy8gY2hhbmdpbmcgc3RyaWN0IG1vZGUgYmVoYXZpb3JcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCB7IHN0cmljdDogZmFsc2UgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXRoIHBhdGggb3Igb2JqZWN0IG9mIGtleS92YWxzIHRvIHNldFxuICogQHBhcmFtIHtNaXhlZH0gdmFsIHRoZSB2YWx1ZSB0byBzZXRcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ8ZXRjLi59IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBcIm9uLXRoZS1mbHlcIiBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbmFsbHkgc3BlY2lmeSBvcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBiZWhhdmlvciBvZiB0aGUgc2V0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgdHlwZSwgb3B0aW9ucykge1xuICBpZiAodHlwZSAmJiAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUuY29uc3RydWN0b3IpKSB7XG4gICAgb3B0aW9ucyA9IHR5cGU7XG4gICAgdHlwZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciBtZXJnZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5tZXJnZVxuICAgICwgYWRob2MgPSB0eXBlICYmIHRydWUgIT09IHR5cGVcbiAgICAsIGNvbnN0cnVjdGluZyA9IHRydWUgPT09IHR5cGVcbiAgICAsIGFkaG9jcztcblxuICB2YXIgc3RyaWN0ID0gb3B0aW9ucyAmJiAnc3RyaWN0JyBpbiBvcHRpb25zXG4gICAgPyBvcHRpb25zLnN0cmljdFxuICAgIDogdGhpcy4kX18uc3RyaWN0TW9kZTtcblxuICBpZiAoYWRob2MpIHtcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xuICAgIGFkaG9jc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgdHlwZSk7XG4gIH1cblxuICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBwYXRoKSB7XG4gICAgLy8gbmV3IERvY3VtZW50KHsga2V5OiB2YWwgfSlcblxuICAgIGlmIChudWxsID09PSBwYXRoIHx8IHVuZGVmaW5lZCA9PT0gcGF0aCkge1xuICAgICAgdmFyIF90ZW1wID0gcGF0aDtcbiAgICAgIHBhdGggPSB2YWw7XG4gICAgICB2YWwgPSBfdGVtcDtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcHJlZml4ID0gdmFsXG4gICAgICAgID8gdmFsICsgJy4nXG4gICAgICAgIDogJyc7XG5cbiAgICAgIGlmIChwYXRoIGluc3RhbmNlb2YgRG9jdW1lbnQpIHBhdGggPSBwYXRoLl9kb2M7XG5cbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGF0aClcbiAgICAgICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAgICAgLCBwYXRodHlwZVxuICAgICAgICAsIGtleTtcblxuXG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgIHBhdGh0eXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocHJlZml4ICsga2V5KTtcbiAgICAgICAgaWYgKG51bGwgIT0gcGF0aFtrZXldXG4gICAgICAgICAgICAvLyBuZWVkIHRvIGtub3cgaWYgcGxhaW4gb2JqZWN0IC0gbm8gQnVmZmVyLCBPYmplY3RJZCwgcmVmLCBldGNcbiAgICAgICAgICAgICYmIF8uaXNQbGFpbk9iamVjdChwYXRoW2tleV0pXG4gICAgICAgICAgICAmJiAoICFwYXRoW2tleV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShwYXRoW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPT0gcGF0aHR5cGVcbiAgICAgICAgICAgICYmICEoIHRoaXMuJF9fcGF0aCggcHJlZml4ICsga2V5ICkgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSApXG4gICAgICAgICAgICAmJiAhKCB0aGlzLnNjaGVtYS5wYXRoc1trZXldICYmIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0ub3B0aW9ucy5yZWYgKVxuICAgICAgICAgICl7XG5cbiAgICAgICAgICB0aGlzLnNldChwYXRoW2tleV0sIHByZWZpeCArIGtleSwgY29uc3RydWN0aW5nKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICAgIGlmICgncmVhbCcgPT09IHBhdGh0eXBlIHx8ICd2aXJ0dWFsJyA9PT0gcGF0aHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgICAgfSBlbHNlIGlmICgndGhyb3cnID09PSBzdHJpY3QpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmllbGQgYCcgKyBrZXkgKyAnYCBpcyBub3QgaW4gc2NoZW1hLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCAhPT0gcGF0aFtrZXldKSB7XG4gICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgLy8gZW5zdXJlIF9zdHJpY3QgaXMgaG9ub3JlZCBmb3Igb2JqIHByb3BzXG4gIC8vIGRvY3NjaGVtYSA9IG5ldyBTY2hlbWEoeyBwYXRoOiB7IG5lc3Q6ICdzdHJpbmcnIH19KVxuICAvLyBkb2Muc2V0KCdwYXRoJywgb2JqKTtcbiAgdmFyIHBhdGhUeXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocGF0aCk7XG4gIGlmICgnbmVzdGVkJyA9PT0gcGF0aFR5cGUgJiYgdmFsICYmIF8uaXNQbGFpbk9iamVjdCh2YWwpICYmXG4gICAgICAoIXZhbC5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHZhbC5jb25zdHJ1Y3RvcikpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT09IHBhdGhUeXBlICYmIHN0cmljdCkge1xuXG4gICAgLy8gY2hlY2sgZm9yIHJvb3RzIHRoYXQgYXJlIE1peGVkIHR5cGVzXG4gICAgdmFyIG1peGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkrMSkuam9pbignLicpO1xuICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSkge1xuICAgICAgICAvLyBhbGxvdyBjaGFuZ2VzIHRvIHN1YiBwYXRocyBvZiBtaXhlZCB0eXBlc1xuICAgICAgICBtaXhlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWl4ZWQpIHtcbiAgICAgIGlmICgndGhyb3cnID09PSBzdHJpY3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWVsZCBgJyArIHBhdGggKyAnYCBpcyBub3QgaW4gc2NoZW1hLicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoJ3ZpcnR1YWwnID09PSBwYXRoVHlwZSkge1xuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLnZpcnR1YWxwYXRoKHBhdGgpO1xuICAgIHNjaGVtYS5hcHBseVNldHRlcnModmFsLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSBlbHNlIHtcbiAgICBzY2hlbWEgPSB0aGlzLiRfX3BhdGgocGF0aCk7XG4gIH1cblxuICB2YXIgcGF0aFRvTWFyaztcblxuICAvLyBXaGVuIHVzaW5nIHRoZSAkc2V0IG9wZXJhdG9yIHRoZSBwYXRoIHRvIHRoZSBmaWVsZCBtdXN0IGFscmVhZHkgZXhpc3QuXG4gIC8vIEVsc2UgbW9uZ29kYiB0aHJvd3M6IFwiTEVGVF9TVUJGSUVMRCBvbmx5IHN1cHBvcnRzIE9iamVjdFwiXG5cbiAgaWYgKHBhcnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgcGF0aFRvTWFyayA9IHBhdGg7XG4gIH0gZWxzZSB7XG4gICAgZm9yICggaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSApIHtcbiAgICAgIHN1YnBhdGggPSBwYXJ0cy5zbGljZSgwLCBpICsgMSkuam9pbignLicpO1xuICAgICAgaWYgKHRoaXMuaXNEaXJlY3RNb2RpZmllZChzdWJwYXRoKSAvLyBlYXJsaWVyIHByZWZpeGVzIHRoYXQgYXJlIGFscmVhZHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFya2VkIGFzIGRpcnR5IGhhdmUgcHJlY2VkZW5jZVxuICAgICAgICAgIHx8IHRoaXMuZ2V0KHN1YnBhdGgpID09PSBudWxsKSB7XG4gICAgICAgIHBhdGhUb01hcmsgPSBzdWJwYXRoO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhdGhUb01hcmspIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9XG5cbiAgLy8gaWYgdGhpcyBkb2MgaXMgYmVpbmcgY29uc3RydWN0ZWQgd2Ugc2hvdWxkIG5vdCB0cmlnZ2VyIGdldHRlcnNcbiAgdmFyIHByaW9yVmFsID0gY29uc3RydWN0aW5nXG4gICAgPyB1bmRlZmluZWRcbiAgICA6IHRoaXMuZ2V0VmFsdWUocGF0aCk7XG5cbiAgaWYgKCFzY2hlbWEgfHwgdW5kZWZpbmVkID09PSB2YWwpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgc2hvdWxkU2V0ID0gdGhpcy4kX190cnkoZnVuY3Rpb24oKXtcbiAgICB2YWwgPSBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgc2VsZiwgZmFsc2UsIHByaW9yVmFsKTtcbiAgfSk7XG5cbiAgaWYgKHNob3VsZFNldCkge1xuICAgIHRoaXMuJF9fc2V0KHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHdlIHNob3VsZCBtYXJrIHRoaXMgY2hhbmdlIGFzIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2hvdWxkTW9kaWZ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3Nob3VsZE1vZGlmeSA9IGZ1bmN0aW9uIChcbiAgICBwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpIHtcblxuICBpZiAodGhpcy5pc05ldykgcmV0dXJuIHRydWU7XG5cbiAgaWYgKCB1bmRlZmluZWQgPT09IHZhbCAmJiAhdGhpcy5pc1NlbGVjdGVkKHBhdGgpICkge1xuICAgIC8vIHdoZW4gYSBwYXRoIGlzIG5vdCBzZWxlY3RlZCBpbiBhIHF1ZXJ5LCBpdHMgaW5pdGlhbFxuICAgIC8vIHZhbHVlIHdpbGwgYmUgdW5kZWZpbmVkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsICYmIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpIHtcbiAgICAvLyB3ZSdyZSBqdXN0IHVuc2V0dGluZyB0aGUgZGVmYXVsdCB2YWx1ZSB3aGljaCB3YXMgbmV2ZXIgc2F2ZWRcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXV0aWxzLmRlZXBFcXVhbCh2YWwsIHByaW9yVmFsIHx8IHRoaXMuZ2V0KHBhdGgpKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy/RgtC10YHRgiDQvdC1INC/0YDQvtGF0L7QtNC40YIg0LjQty3Qt9CwINC90LDQu9C40YfQuNGPINC70LjRiNC90LXQs9C+INC/0L7Qu9GPINCyIHN0YXRlcy5kZWZhdWx0IChjb21tZW50cylcbiAgLy8g0J3QsCDRgdCw0LzQvtC8INC00LXQu9C1INC/0L7Qu9C1INCy0YDQvtC00LUg0Lgg0L3QtSDQu9C40YjQvdC10LVcbiAgLy9jb25zb2xlLmluZm8oIHBhdGgsIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgKTtcbiAgLy9jb25zb2xlLmxvZyggdGhpcy4kX18uYWN0aXZlUGF0aHMgKTtcblxuICAvLyDQmtC+0LPQtNCwINC80Ysg0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0YLQsNC60L7QtSDQttC1INC30L3QsNGH0LXQvdC40LUg0LrQsNC6IGRlZmF1bHRcbiAgLy8g0J3QtSDQv9C+0L3Rj9GC0L3QviDQt9Cw0YfQtdC8INC80LDQvdCz0YPRgdGCINC10LPQviDQvtCx0L3QvtCy0LvRj9C7XG4gIC8qIVxuICBpZiAoIWNvbnN0cnVjdGluZyAmJlxuICAgICAgbnVsbCAhPSB2YWwgJiZcbiAgICAgIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgJiZcbiAgICAgIHV0aWxzLmRlZXBFcXVhbCh2YWwsIHNjaGVtYS5nZXREZWZhdWx0KHRoaXMsIGNvbnN0cnVjdGluZykpICkge1xuXG4gICAgLy9jb25zb2xlLmxvZyggcGF0aFRvTWFyaywgdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSApO1xuXG4gICAgLy8gYSBwYXRoIHdpdGggYSBkZWZhdWx0IHdhcyAkdW5zZXQgb24gdGhlIHNlcnZlclxuICAgIC8vIGFuZCB0aGUgdXNlciBpcyBzZXR0aW5nIGl0IHRvIHRoZSBzYW1lIHZhbHVlIGFnYWluXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgKi9cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGFjdHVhbCBzZXR0aW5nIG9mIHRoZSB2YWx1ZSBhbmQgbWFya2luZyB0aGUgcGF0aCBtb2RpZmllZCBpZiBhcHByb3ByaWF0ZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2V0XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldCA9IGZ1bmN0aW9uICggcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsICkge1xuICB2YXIgc2hvdWxkTW9kaWZ5ID0gdGhpcy4kX19zaG91bGRNb2RpZnkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICBpZiAoc2hvdWxkTW9kaWZ5KSB7XG4gICAgdGhpcy5tYXJrTW9kaWZpZWQocGF0aFRvTWFyaywgdmFsKTtcbiAgfVxuXG4gIHZhciBvYmogPSB0aGlzLl9kb2NcbiAgICAsIGkgPSAwXG4gICAgLCBsID0gcGFydHMubGVuZ3RoO1xuXG4gIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIG5leHQgPSBpICsgMVxuICAgICAgLCBsYXN0ID0gbmV4dCA9PT0gbDtcblxuICAgIGlmICggbGFzdCApIHtcbiAgICAgIG9ialtwYXJ0c1tpXV0gPSB2YWw7XG5cbiAgICAgIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCwgdmFsICk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ09iamVjdCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvYmpbcGFydHNbaV1dLmNvbnN0cnVjdG9yKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ0VtYmVkZGVkRG9jdW1lbnQnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikgKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSBpZiAob2JqW3BhcnRzW2ldXSAmJiBBcnJheS5pc0FycmF5KG9ialtwYXJ0c1tpXV0pKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV0gPSB7fTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogR2V0cyBhIHJhdyB2YWx1ZSBmcm9tIGEgcGF0aCAobm8gZ2V0dGVycylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiB1dGlscy5nZXRWYWx1ZShwYXRoLCB0aGlzLl9kb2MpO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmF3IHZhbHVlIGZvciBhIHBhdGggKG5vIGNhc3RpbmcsIHNldHRlcnMsIHRyYW5zZm9ybWF0aW9ucylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbHVlKSB7XG4gIHV0aWxzLnNldFZhbHVlKHBhdGgsIHZhbHVlLCB0aGlzLl9kb2MpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2YgYSBwYXRoLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIC8vIHBhdGhcbiAqICAgICBkb2MuZ2V0KCdhZ2UnKSAvLyA0N1xuICpcbiAqICAgICAvLyBkeW5hbWljIGNhc3RpbmcgdG8gYSBzdHJpbmdcbiAqICAgICBkb2MuZ2V0KCdhZ2UnLCBTdHJpbmcpIC8vIFwiNDdcIlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge1NjaGVtYXxTdHJpbmd8TnVtYmVyfSBbdHlwZV0gb3B0aW9uYWxseSBzcGVjaWZ5IGEgdHlwZSBmb3Igb24tdGhlLWZseSBhdHRyaWJ1dGVzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIHR5cGUpIHtcbiAgdmFyIGFkaG9jcztcbiAgaWYgKHR5cGUpIHtcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xuICAgIGFkaG9jc1twYXRoXSA9IFNjaGVtYS5pbnRlcnByZXRBc1R5cGUocGF0aCwgdHlwZSk7XG4gIH1cblxuICB2YXIgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpIHx8IHRoaXMuc2NoZW1hLnZpcnR1YWxwYXRoKHBhdGgpXG4gICAgLCBwaWVjZXMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAsIG9iaiA9IHRoaXMuX2RvYztcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBpZWNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBvYmogPSB1bmRlZmluZWQgPT09IG9iaiB8fCBudWxsID09PSBvYmpcbiAgICAgID8gdW5kZWZpbmVkXG4gICAgICA6IG9ialtwaWVjZXNbaV1dO1xuICB9XG5cbiAgaWYgKHNjaGVtYSkge1xuICAgIG9iaiA9IHNjaGVtYS5hcHBseUdldHRlcnMob2JqLCB0aGlzKTtcbiAgfVxuXG4gIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50R2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCApO1xuXG4gIHJldHVybiBvYmo7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNjaGVtYXR5cGUgZm9yIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19wYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3BhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRoc1xuICAgICwgYWRob2NUeXBlID0gYWRob2NzICYmIGFkaG9jc1twYXRoXTtcblxuICBpZiAoYWRob2NUeXBlKSB7XG4gICAgcmV0dXJuIGFkaG9jVHlwZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5zY2hlbWEucGF0aChwYXRoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyB0aGUgcGF0aCBhcyBoYXZpbmcgcGVuZGluZyBjaGFuZ2VzIHRvIHdyaXRlIHRvIHRoZSBkYi5cbiAqXG4gKiBfVmVyeSBoZWxwZnVsIHdoZW4gdXNpbmcgW01peGVkXSguL3NjaGVtYXR5cGVzLmh0bWwjbWl4ZWQpIHR5cGVzLl9cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLm1peGVkLnR5cGUgPSAnY2hhbmdlZCc7XG4gKiAgICAgZG9jLm1hcmtNb2RpZmllZCgnbWl4ZWQudHlwZScpO1xuICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlcyB0byBtaXhlZC50eXBlIGFyZSBub3cgcGVyc2lzdGVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gbWFyayBtb2RpZmllZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1hcmtNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcbn07XG5cbi8qKlxuICogQ2F0Y2hlcyBlcnJvcnMgdGhhdCBvY2N1ciBkdXJpbmcgZXhlY3V0aW9uIG9mIGBmbmAgYW5kIHN0b3JlcyB0aGVtIHRvIGxhdGVyIGJlIHBhc3NlZCB3aGVuIGBzYXZlKClgIGlzIGV4ZWN1dGVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdIHRoZSBzY29wZSB3aXRoIHdoaWNoIHRvIGNhbGwgZm5cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX190cnlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fdHJ5ID0gZnVuY3Rpb24gKGZuLCBzY29wZSkge1xuICB2YXIgcmVzO1xuICB0cnkge1xuICAgIGZuLmNhbGwoc2NvcGUpO1xuICAgIHJlcyA9IHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aGlzLiRfX2Vycm9yKGUpO1xuICAgIHJlcyA9IGZhbHNlO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGxpc3Qgb2YgcGF0aHMgdGhhdCBoYXZlIGJlZW4gbW9kaWZpZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUubW9kaWZpZWRQYXRocyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcmVjdE1vZGlmaWVkUGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KTtcblxuICByZXR1cm4gZGlyZWN0TW9kaWZpZWRQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKGxpc3QsIHBhdGgpIHtcbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgcmV0dXJuIGxpc3QuY29uY2F0KHBhcnRzLnJlZHVjZShmdW5jdGlvbiAoY2hhaW5zLCBwYXJ0LCBpKSB7XG4gICAgICByZXR1cm4gY2hhaW5zLmNvbmNhdChwYXJ0cy5zbGljZSgwLCBpKS5jb25jYXQocGFydCkuam9pbignLicpKTtcbiAgICB9LCBbXSkpO1xuICB9LCBbXSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGRvY3VtZW50IHdhcyBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiBJZiBgcGF0aGAgaXMgZ2l2ZW4sIGNoZWNrcyBpZiBhIHBhdGggb3IgYW55IGZ1bGwgcGF0aCBjb250YWluaW5nIGBwYXRoYCBhcyBwYXJ0IG9mIGl0cyBwYXRoIGNoYWluIGhhcyBiZWVuIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcbiAqICAgICBkb2MuaXNNb2RpZmllZCgpICAgICAgICAgICAgICAgICAgICAvLyB0cnVlXG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoJ2RvY3VtZW50cycpICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgICAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gb3B0aW9uYWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoXG4gICAgPyAhIX50aGlzLm1vZGlmaWVkUGF0aHMoKS5pbmRleE9mKHBhdGgpXG4gICAgOiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zb21lKCdtb2RpZnknKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGBwYXRoYCB3YXMgZGlyZWN0bHkgc2V0IGFuZCBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cy4wLnRpdGxlJykgLy8gdHJ1ZVxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzRGlyZWN0TW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIGluaXRpYWxpemVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzSW5pdCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAocGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIHNlbGVjdGVkIGluIHRoZSBzb3VyY2UgcXVlcnkgd2hpY2ggaW5pdGlhbGl6ZWQgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBUaGluZy5maW5kT25lKCkuc2VsZWN0KCduYW1lJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnbmFtZScpIC8vIHRydWVcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnYWdlJykgIC8vIGZhbHNlXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmlzU2VsZWN0ZWQgPSBmdW5jdGlvbiBpc1NlbGVjdGVkIChwYXRoKSB7XG4gIGlmICh0aGlzLiRfXy5zZWxlY3RlZCkge1xuXG4gICAgaWYgKCdfaWQnID09PSBwYXRoKSB7XG4gICAgICByZXR1cm4gMCAhPT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xuICAgIH1cblxuICAgIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLnNlbGVjdGVkKVxuICAgICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgICAsIGluY2x1c2l2ZSA9IGZhbHNlXG4gICAgICAsIGN1cjtcblxuICAgIGlmICgxID09PSBpICYmICdfaWQnID09PSBwYXRoc1swXSkge1xuICAgICAgLy8gb25seSBfaWQgd2FzIHNlbGVjdGVkLlxuICAgICAgcmV0dXJuIDAgPT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PT0gY3VyKSBjb250aW51ZTtcbiAgICAgIGluY2x1c2l2ZSA9ICEhIHRoaXMuJF9fLnNlbGVjdGVkW2N1cl07XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICB9XG5cbiAgICBpID0gcGF0aHMubGVuZ3RoO1xuICAgIHZhciBwYXRoRG90ID0gcGF0aCArICcuJztcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09PSBjdXIpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoMCA9PT0gY3VyLmluZGV4T2YocGF0aERvdCkpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKDAgPT09IHBhdGhEb3QuaW5kZXhPZihjdXIgKyAnLicpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICEgaW5jbHVzaXZlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGVzIHJlZ2lzdGVyZWQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYHByZWAgc2F2ZSBhbmQgaWYgYSB2YWxpZGF0aW9uIHJ1bGUgaXMgdmlvbGF0ZWQsIFtzYXZlXSgjbW9kZWxfTW9kZWwtc2F2ZSkgaXMgYWJvcnRlZCBhbmQgdGhlIGVycm9yIGlzIHJldHVybmVkIHRvIHlvdXIgYGNhbGxiYWNrYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGlmIChlcnIpIGhhbmRsZUVycm9yKGVycik7XG4gKiAgICAgICBlbHNlIC8vIHZhbGlkYXRpb24gcGFzc2VkXG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGVkIGFmdGVyIHZhbGlkYXRpb24gY29tcGxldGVzLCBwYXNzaW5nIGFuIGVycm9yIGlmIG9uZSBvY2N1cnJlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBvbmx5IHZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkcyB3aGVuIG5lY2Vzc2FyeVxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSkuZmlsdGVyKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKCFzZWxmLmlzU2VsZWN0ZWQocGF0aCkgJiYgIXNlbGYuaXNNb2RpZmllZChwYXRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcblxuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSk7XG5cbiAgaWYgKDAgPT09IHBhdGhzLmxlbmd0aCkge1xuICAgIGNvbXBsZXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsaWRhdGluZyA9IHt9XG4gICAgLCB0b3RhbCA9IDA7XG5cbiAgcGF0aHMuZm9yRWFjaCh2YWxpZGF0ZVBhdGgpO1xuICByZXR1cm4gdGhpcztcblxuICBmdW5jdGlvbiB2YWxpZGF0ZVBhdGggKHBhdGgpIHtcbiAgICBpZiAodmFsaWRhdGluZ1twYXRoXSkgcmV0dXJuO1xuXG4gICAgdmFsaWRhdGluZ1twYXRoXSA9IHRydWU7XG4gICAgdG90YWwrKztcblxuICAgIHV0aWxzLnNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgICAgdmFyIHAgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuICAgICAgaWYgKCFwKSByZXR1cm4gLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuXG4gICAgICB2YXIgdmFsID0gc2VsZi5nZXRWYWx1ZShwYXRoKTtcbiAgICAgIHAuZG9WYWxpZGF0ZSh2YWwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHNlbGYuaW52YWxpZGF0ZShcbiAgICAgICAgICAgICAgcGF0aFxuICAgICAgICAgICAgLCBlcnJcbiAgICAgICAgICAgICwgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLywgdHJ1ZSAvLyBlbWJlZGRlZCBkb2NzXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC0tdG90YWwgfHwgY29tcGxldGUoKTtcbiAgICAgIH0sIHNlbGYpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGUgKCkge1xuICAgIHZhciBlcnIgPSBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gICAgc2VsZi4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICAgIGNiICYmIGNiKGVycik7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIFRoZSBgZXJyb3JNc2dgIGFyZ3VtZW50IHdpbGwgYmVjb21lIHRoZSBtZXNzYWdlIG9mIHRoZSBgVmFsaWRhdGlvbkVycm9yYC5cbiAqXG4gKiBUaGUgYHZhbHVlYCBhcmd1bWVudCAoaWYgcGFzc2VkKSB3aWxsIGJlIGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgVmFsaWRhdGlvbkVycm9yLnZhbHVlYCBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgZG9jLmludmFsaWRhdGUoJ3NpemUnLCAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLCAxNCk7XG5cbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coZXJyKVxuICogICAgICAgLy8gcHJpbnRzXG4gKiAgICAgICB7IG1lc3NhZ2U6ICdWYWxpZGF0aW9uIGZhaWxlZCcsXG4gKiAgICAgICAgIG5hbWU6ICdWYWxpZGF0aW9uRXJyb3InLFxuICogICAgICAgICBlcnJvcnM6XG4gKiAgICAgICAgICB7IHNpemU6XG4gKiAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsXG4gKiAgICAgICAgICAgICAgIG5hbWU6ICdWYWxpZGF0b3JFcnJvcicsXG4gKiAgICAgICAgICAgICAgIHBhdGg6ICdzaXplJyxcbiAqICAgICAgICAgICAgICAgdHlwZTogJ3VzZXIgZGVmaW5lZCcsXG4gKiAgICAgICAgICAgICAgIHZhbHVlOiAxNCB9IH0gfVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnJvck1zZyB0aGUgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd8TnVtYmVyfGFueX0gdmFsdWUgb3B0aW9uYWwgaW52YWxpZCB2YWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyb3JNc2csIHZhbHVlKSB7XG4gIGlmICghdGhpcy4kX18udmFsaWRhdGlvbkVycm9yKSB7XG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzKTtcbiAgfVxuXG4gIGlmICghZXJyb3JNc2cgfHwgJ3N0cmluZycgPT09IHR5cGVvZiBlcnJvck1zZykge1xuICAgIGVycm9yTXNnID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIGVycm9yTXNnLCAndXNlciBkZWZpbmVkJywgdmFsdWUpO1xuICB9XG5cbiAgaWYgKHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9PT0gZXJyb3JNc2cpIHJldHVybjtcblxuICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IuZXJyb3JzW3BhdGhdID0gZXJyb3JNc2c7XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgaW50ZXJuYWwgbW9kaWZpZWQgc3RhdGUgb2YgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxuICogQG1ldGhvZCAkX19yZXNldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX3Jlc2V0ID0gZnVuY3Rpb24gcmVzZXQgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBzZWxmLmdldFZhbHVlKGkpO1xuICB9KVxuICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdmFsICYmIHZhbC5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XG4gIH0pXG4gIC5mb3JFYWNoKGZ1bmN0aW9uIChhcnJheSkge1xuICAgIHZhciBpID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhciBkb2MgPSBhcnJheVtpXTtcbiAgICAgIGlmICghZG9jKSBjb250aW51ZTtcbiAgICAgIGRvYy4kX19yZXNldCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2xlYXIgJ21vZGlmeScoJ2RpcnR5JykgY2FjaGVcbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMuY2xlYXIoJ21vZGlmeScpO1xuICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZXJyb3JzID0gdW5kZWZpbmVkO1xuICAvL2NvbnNvbGUubG9nKCBzZWxmLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSApO1xuICAvL1RPRE86INGC0YPRglxuICB0aGlzLnNjaGVtYS5yZXF1aXJlZFBhdGhzKCkuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xuICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLnJlcXVpcmUocGF0aCk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFJldHVybnMgdGhpcyBkb2N1bWVudHMgZGlydHkgcGF0aHMgLyB2YWxzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19kaXJ0eVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RpcnR5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGFsbCA9IHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1hcCgnbW9kaWZ5JywgZnVuY3Rpb24gKHBhdGgpIHtcbiAgICByZXR1cm4geyBwYXRoOiBwYXRoXG4gICAgICAgICAgICwgdmFsdWU6IHNlbGYuZ2V0VmFsdWUoIHBhdGggKVxuICAgICAgICAgICAsIHNjaGVtYTogc2VsZi4kX19wYXRoKCBwYXRoICkgfTtcbiAgfSk7XG5cbiAgLy8gU29ydCBkaXJ0eSBwYXRocyBpbiBhIGZsYXQgaGllcmFyY2h5LlxuICBhbGwuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiAoYS5wYXRoIDwgYi5wYXRoID8gLTEgOiAoYS5wYXRoID4gYi5wYXRoID8gMSA6IDApKTtcbiAgfSk7XG5cbiAgLy8gSWdub3JlIFwiZm9vLmFcIiBpZiBcImZvb1wiIGlzIGRpcnR5IGFscmVhZHkuXG4gIHZhciBtaW5pbWFsID0gW11cbiAgICAsIGxhc3RQYXRoXG4gICAgLCB0b3A7XG5cbiAgYWxsLmZvckVhY2goZnVuY3Rpb24oIGl0ZW0gKXtcbiAgICBsYXN0UGF0aCA9IGl0ZW0ucGF0aCArICcuJztcbiAgICBtaW5pbWFsLnB1c2goaXRlbSk7XG4gICAgdG9wID0gaXRlbTtcbiAgfSk7XG5cbiAgdG9wID0gbGFzdFBhdGggPSBudWxsO1xuICByZXR1cm4gbWluaW1hbDtcbn07XG5cbi8qIVxuICogQ29tcGlsZXMgc2NoZW1hcy5cbiAqICjRg9GB0YLQsNC90L7QstC40YLRjCDQs9C10YLRgtC10YDRiy/RgdC10YLRgtC10YDRiyDQvdCwINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsClcbiAqL1xuZnVuY3Rpb24gY29tcGlsZSAoc2VsZiwgdHJlZSwgcHJvdG8sIHByZWZpeCkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRyZWUpXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIGxpbWJcbiAgICAsIGtleTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBsaW1iID0gdHJlZVtrZXldO1xuXG4gICAgZGVmaW5lKHNlbGZcbiAgICAgICAgLCBrZXlcbiAgICAgICAgLCAoKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUobGltYi5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKGxpbWIpLmxlbmd0aClcbiAgICAgICAgICAgICAgICYmICghbGltYi50eXBlIHx8IGxpbWIudHlwZS50eXBlKVxuICAgICAgICAgICAgICAgPyBsaW1iXG4gICAgICAgICAgICAgICA6IG51bGwpXG4gICAgICAgICwgcHJvdG9cbiAgICAgICAgLCBwcmVmaXhcbiAgICAgICAgLCBrZXlzKTtcbiAgfVxufVxuXG4vLyBnZXRzIGRlc2NyaXB0b3JzIGZvciBhbGwgcHJvcGVydGllcyBvZiBgb2JqZWN0YFxuLy8gbWFrZXMgYWxsIHByb3BlcnRpZXMgbm9uLWVudW1lcmFibGUgdG8gbWF0Y2ggcHJldmlvdXMgYmVoYXZpb3IgdG8gIzIyMTFcbmZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqZWN0KSB7XG4gIHZhciByZXN1bHQgPSB7fTtcblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcbiAgICByZXN1bHRba2V5XS5lbnVtZXJhYmxlID0gZmFsc2U7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qIVxuICogRGVmaW5lcyB0aGUgYWNjZXNzb3IgbmFtZWQgcHJvcCBvbiB0aGUgaW5jb21pbmcgcHJvdG90eXBlLlxuICog0YLQsNC8INC20LUsINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsCDRgdC00LXQu9Cw0LXQvCDQvdCw0LHQu9GO0LTQsNC10LzRi9C80LhcbiAqL1xuZnVuY3Rpb24gZGVmaW5lIChzZWxmLCBwcm9wLCBzdWJwcm9wcywgcHJvdG90eXBlLCBwcmVmaXgsIGtleXMpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICB2YXIgcGF0aCA9IChwcmVmaXggPyBwcmVmaXggKyAnLicgOiAnJykgKyBwcm9wO1xuXG4gIGlmIChzdWJwcm9wcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLiRfXy5nZXR0ZXJzKVxuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVycyA9IHt9O1xuXG4gICAgICAgICAgaWYgKCF0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdKSB7XG4gICAgICAgICAgICB2YXIgbmVzdGVkID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnModGhpcykpO1xuXG4gICAgICAgICAgICAvLyBzYXZlIHNjb3BlIGZvciBuZXN0ZWQgZ2V0dGVycy9zZXR0ZXJzXG4gICAgICAgICAgICBpZiAoIXByZWZpeCkgbmVzdGVkLiRfXy5zY29wZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIHNoYWRvdyBpbmhlcml0ZWQgZ2V0dGVycyBmcm9tIHN1Yi1vYmplY3RzIHNvXG4gICAgICAgICAgICAvLyB0aGluZy5uZXN0ZWQubmVzdGVkLm5lc3RlZC4uLiBkb2Vzbid0IG9jY3VyIChnaC0zNjYpXG4gICAgICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAgICAgLCBsZW4gPSBrZXlzLmxlbmd0aDtcblxuICAgICAgICAgICAgZm9yICg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAvLyBvdmVyLXdyaXRlIHRoZSBwYXJlbnRzIGdldHRlciB3aXRob3V0IHRyaWdnZXJpbmcgaXRcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5lc3RlZCwga2V5c1tpXSwge1xuICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UgICAvLyBJdCBkb2Vzbid0IHNob3cgdXAuXG4gICAgICAgICAgICAgICAgLCB3cml0YWJsZTogdHJ1ZSAgICAgIC8vIFdlIGNhbiBzZXQgaXQgbGF0ZXIuXG4gICAgICAgICAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWUgIC8vIFdlIGNhbiBPYmplY3QuZGVmaW5lUHJvcGVydHkgYWdhaW4uXG4gICAgICAgICAgICAgICAgLCB2YWx1ZTogdW5kZWZpbmVkICAgIC8vIEl0IHNoYWRvd3MgaXRzIHBhcmVudC5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5lc3RlZC50b09iamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhdGgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29tcGlsZSggc2VsZiwgc3VicHJvcHMsIG5lc3RlZCwgcGF0aCApO1xuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVyc1twYXRoXSA9IG5lc3RlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy4kX18uZ2V0dGVyc1twYXRoXTtcbiAgICAgICAgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBEb2N1bWVudCkgdiA9IHYudG9PYmplY3QoKTtcbiAgICAgICAgICByZXR1cm4gKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMpLnNldCggcGF0aCwgdiApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgfSBlbHNlIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICggKSB7IHJldHVybiB0aGlzLmdldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgpOyB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHRoaXMuc2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCwgdik7IH1cbiAgICB9KTtcbiAgfVxuXG4gIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50RGVmaW5lUHJvcGVydHkuY2FsbCggc2VsZiwgc2VsZiwgcHJvdG90eXBlLCBwcm9wLCBwcmVmaXgsIHBhdGggKTtcbiAgLy9zZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIHByb3RvdHlwZSApO1xufVxuXG4vKipcbiAqIEFzc2lnbnMvY29tcGlsZXMgYHNjaGVtYWAgaW50byB0aGlzIGRvY3VtZW50cyBwcm90b3R5cGUuXG4gKlxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFNjaGVtYVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXRTY2hlbWEgPSBmdW5jdGlvbiAoIHNjaGVtYSApIHtcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIGNvbXBpbGUoIHRoaXMsIHNjaGVtYS50cmVlLCB0aGlzICk7XG59O1xuXG4vKipcbiAqIEdldCBhbGwgc3ViZG9jcyAoYnkgYmZzKVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBbGxTdWJkb2NzXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2dldEFsbFN1YmRvY3MgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG4gIEVtYmVkZGVkID0gRW1iZWRkZWQgfHwgcmVxdWlyZSgnLi90eXBlcy9lbWJlZGRlZCcpO1xuXG4gIGZ1bmN0aW9uIGRvY1JlZHVjZXIoc2VlZCwgcGF0aCkge1xuICAgIHZhciB2YWwgPSB0aGlzW3BhdGhdO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkpXG4gICAgICB2YWwuZm9yRWFjaChmdW5jdGlvbiBfZG9jUmVkdWNlKGRvYykge1xuICAgICAgICBpZiAoIWRvYyB8fCAhZG9jLl9kb2MpIHJldHVybjtcbiAgICAgICAgaWYgKGRvYyBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2goZG9jKTtcbiAgICAgICAgc2VlZCA9IE9iamVjdC5rZXlzKGRvYy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKGRvYy5fZG9jKSwgc2VlZCk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gc2VlZDtcbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQodGhpcyksIFtdKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIGdlbmVyaWMgc2F2ZSBzdHVmZi5cbiAqIHRvIHNvbHZlICMxNDQ2IHVzZSB1c2UgaGllcmFyY2h5IGluc3RlYWQgb2YgaG9va3NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcHJlc2F2ZVZhbGlkYXRlXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3ByZXNhdmVWYWxpZGF0ZSA9IGZ1bmN0aW9uICRfX3ByZXNhdmVWYWxpZGF0ZSgpIHtcbiAgLy8gaWYgYW55IGRvYy5zZXQoKSBjYWxscyBmYWlsZWRcblxuICB2YXIgZG9jcyA9IHRoaXMuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUoKTtcblxuICB2YXIgZTIgPSBkb2NzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYy4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgfSk7XG4gIHZhciBlMSA9IFt0aGlzLiRfXy5zYXZlRXJyb3JdLmNvbmNhdChlMik7XG4gIHZhciBlcnIgPSBlMS5maWx0ZXIoZnVuY3Rpb24gKHgpIHtyZXR1cm4geH0pWzBdO1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBudWxsO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEdldCBhY3RpdmUgcGF0aCB0aGF0IHdlcmUgY2hhbmdlZCBhbmQgYXJlIGFycmF5c1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcblxuICAvLyB2YWxpZGF0ZSBhbGwgZG9jdW1lbnQgYXJyYXlzLlxuICByZXR1cm4gdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgICAubWFwKCdpbml0JywgJ21vZGlmeScsIGZ1bmN0aW9uIChpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRWYWx1ZShpKTtcbiAgICB9LmJpbmQodGhpcykpXG4gICAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgICByZXR1cm4gdmFsICYmIHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24oc2VlZCwgYXJyYXkpIHtcbiAgICAgIHJldHVybiBzZWVkLmNvbmNhdChhcnJheSk7XG4gICAgfSwgW10pXG4gICAgLmZpbHRlcihmdW5jdGlvbiAoZG9jKSB7cmV0dXJuIGRvY30pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXJyb3JcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19lcnJvclxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gZXJyO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJvZHVjZXMgYSBzcGVjaWFsIHF1ZXJ5IGRvY3VtZW50IG9mIHRoZSBtb2RpZmllZCBwcm9wZXJ0aWVzIHVzZWQgaW4gdXBkYXRlcy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGVsdGFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGVsdGEgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJ0eSA9IHRoaXMuJF9fZGlydHkoKTtcblxuICB2YXIgZGVsdGEgPSB7fVxuICAgICwgbGVuID0gZGlydHkubGVuZ3RoXG4gICAgLCBkID0gMDtcblxuICBmb3IgKDsgZCA8IGxlbjsgKytkKSB7XG4gICAgdmFyIGRhdGEgPSBkaXJ0eVsgZCBdO1xuICAgIHZhciB2YWx1ZSA9IGRhdGEudmFsdWU7XG5cbiAgICB2YWx1ZSA9IHV0aWxzLmNsb25lKHZhbHVlLCB7IGRlcG9wdWxhdGU6IDEgfSk7XG4gICAgZGVsdGFbIGRhdGEucGF0aCBdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gZGVsdGE7XG59O1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9faGFuZGxlU2F2ZSA9IGZ1bmN0aW9uKCl7XG4gIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YDQtdGB0YPRgNGBINC60L7Qu9C70LXQutGG0LjQuCwg0LrRg9C00LAg0LHRg9C00LXQvCDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LTQsNC90L3Ri9C1XG4gIHZhciByZXNvdXJjZTtcbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICByZXNvdXJjZSA9IHRoaXMuY29sbGVjdGlvbi5hcGk7XG4gIH1cblxuICB2YXIgaW5uZXJQcm9taXNlID0gbmV3ICQuRGVmZXJyZWQoKTtcblxuICBpZiAoIHRoaXMuaXNOZXcgKSB7XG4gICAgLy8gc2VuZCBlbnRpcmUgZG9jXG4gICAgdmFyIG9iaiA9IHRoaXMudG9PYmplY3QoeyBkZXBvcHVsYXRlOiAxIH0pO1xuXG4gICAgaWYgKCAoIG9iaiB8fCB7fSApLmhhc093blByb3BlcnR5KCdfaWQnKSA9PT0gZmFsc2UgKSB7XG4gICAgICAvLyBkb2N1bWVudHMgbXVzdCBoYXZlIGFuIF9pZCBlbHNlIG1vbmdvb3NlIHdvbid0IGtub3dcbiAgICAgIC8vIHdoYXQgdG8gdXBkYXRlIGxhdGVyIGlmIG1vcmUgY2hhbmdlcyBhcmUgbWFkZS4gdGhlIHVzZXJcbiAgICAgIC8vIHdvdWxkbid0IGtub3cgd2hhdCBfaWQgd2FzIGdlbmVyYXRlZCBieSBtb25nb2RiIGVpdGhlclxuICAgICAgLy8gbm9yIHdvdWxkIHRoZSBPYmplY3RJZCBnZW5lcmF0ZWQgbXkgbW9uZ29kYiBuZWNlc3NhcmlseVxuICAgICAgLy8gbWF0Y2ggdGhlIHNjaGVtYSBkZWZpbml0aW9uLlxuICAgICAgaW5uZXJQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ2RvY3VtZW50IG11c3QgaGF2ZSBhbiBfaWQgYmVmb3JlIHNhdmluZycpKTtcbiAgICAgIHJldHVybiBpbm5lclByb21pc2U7XG4gICAgfVxuXG4gICAgLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdCwINC+0LrRgNGD0LbQtdC90LjQtSDRgtC10YHRgtC+0LJcbiAgICAvLyDQpdC+0YLRjyDQvNC+0LbQvdC+INGC0LDQutC40Lwg0L7QsdGA0LDQt9C+0Lwg0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4sINC00LDQttC1INC10YHQu9C4INC90LXRgiDQutC+0LvQu9C10LrRhtC40Lgg0LjQu9C4IGFwaVxuICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvdXJjZS5jcmVhdGUoIG9iaiApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcbiAgICB9XG5cbiAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgdGhpcy5pc05ldyA9IGZhbHNlO1xuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gICAgLy8gTWFrZSBpdCBwb3NzaWJsZSB0byByZXRyeSB0aGUgaW5zZXJ0XG4gICAgdGhpcy4kX18uaW5zZXJ0aW5nID0gdHJ1ZTtcblxuICB9IGVsc2Uge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCB0cmVhdCBpdCBhcyBhIG5ldyBvYmplY3Qgb24gZXJyb3IsXG4gICAgLy8gc2luY2UgaXQgYWxyZWFkeSBleGlzdHNcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBkZWx0YSA9IHRoaXMuJF9fZGVsdGEoKTtcblxuICAgIGlmICggIV8uaXNFbXB0eSggZGVsdGEgKSApIHtcbiAgICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICAgIC8vINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQvtC60YDRg9C20LXQvdC40LUg0YLQtdGB0YLQvtCyXG4gICAgICAvLyDQpdC+0YLRjyDQvNC+0LbQvdC+INGC0LDQutC40Lwg0L7QsdGA0LDQt9C+0Lwg0L/RgNC+0YHRgtC+INC00LXQu9Cw0YLRjCDQstCw0LvQuNC00LDRhtC40Y4sINC00LDQttC1INC10YHQu9C4INC90LXRgiDQutC+0LvQu9C10LrRhtC40Lgg0LjQu9C4IGFwaVxuICAgICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlKCB0aGlzLmlkICkudXBkYXRlKCBkZWx0YSApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uIFNhdmVzIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGV4YW1wbGU6XG4gKlxuICogICAgIHByb2R1Y3Quc29sZCA9IERhdGUubm93KCk7XG4gKiAgICAgcHJvZHVjdC5zYXZlKGZ1bmN0aW9uIChlcnIsIHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XG4gKiAgICAgICBpZiAoZXJyKSAuLlxuICogICAgIH0pXG4gKlxuICogQGRlc2NyaXB0aW9uIFRoZSBjYWxsYmFjayB3aWxsIHJlY2VpdmUgdGhyZWUgcGFyYW1ldGVycywgYGVycmAgaWYgYW4gZXJyb3Igb2NjdXJyZWQsIGBwcm9kdWN0YCB3aGljaCBpcyB0aGUgc2F2ZWQgYHByb2R1Y3RgLCBhbmQgYG51bWJlckFmZmVjdGVkYCB3aGljaCB3aWxsIGJlIDEgd2hlbiB0aGUgZG9jdW1lbnQgd2FzIGZvdW5kIGFuZCB1cGRhdGVkIGluIHRoZSBkYXRhYmFzZSwgb3RoZXJ3aXNlIDAuXG4gKlxuICogVGhlIGBmbmAgY2FsbGJhY2sgaXMgb3B0aW9uYWwuIElmIG5vIGBmbmAgaXMgcGFzc2VkIGFuZCB2YWxpZGF0aW9uIGZhaWxzLCB0aGUgdmFsaWRhdGlvbiBlcnJvciB3aWxsIGJlIGVtaXR0ZWQgb24gdGhlIGNvbm5lY3Rpb24gdXNlZCB0byBjcmVhdGUgdGhpcyBtb2RlbC5cbiAqIEBleGFtcGxlOlxuICogICAgIHZhciBkYiA9IG1vbmdvb3NlLmNyZWF0ZUNvbm5lY3Rpb24oLi4pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICB2YXIgUHJvZHVjdCA9IGRiLm1vZGVsKCdQcm9kdWN0Jywgc2NoZW1hKTtcbiAqXG4gKiAgICAgZGIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBkZXNjcmlwdGlvbiBIb3dldmVyLCBpZiB5b3UgZGVzaXJlIG1vcmUgbG9jYWwgZXJyb3IgaGFuZGxpbmcgeW91IGNhbiBhZGQgYW4gYGVycm9yYCBsaXN0ZW5lciB0byB0aGUgbW9kZWwgYW5kIGhhbmRsZSBlcnJvcnMgdGhlcmUgaW5zdGVhZC5cbiAqIEBleGFtcGxlOlxuICogICAgIFByb2R1Y3Qub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqIEBkZXNjcmlwdGlvbiBBcyBhbiBleHRyYSBtZWFzdXJlIG9mIGZsb3cgY29udHJvbCwgc2F2ZSB3aWxsIHJldHVybiBhIFByb21pc2UgKGJvdW5kIHRvIGBmbmAgaWYgcGFzc2VkKSBzbyBpdCBjb3VsZCBiZSBjaGFpbmVkLCBvciBob29rIHRvIHJlY2l2ZSBlcnJvcnNcbiAqIEBleGFtcGxlOlxuICogICAgIHByb2R1Y3Quc2F2ZSgpLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XG4gKiAgICAgICAgLi4uXG4gKiAgICAgfSkub25SZWplY3RlZChmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICAgYXNzZXJ0Lm9rKGVycilcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oZXJyLCBwcm9kdWN0LCBOdW1iZXIpfSBbZG9uZV0gb3B0aW9uYWwgY2FsbGJhY2tcbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2VcbiAqIEBhcGkgcHVibGljXG4gKiBAc2VlIG1pZGRsZXdhcmUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvbWlkZGxld2FyZS5odG1sXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKCBkb25lICkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBmaW5hbFByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpLmRvbmUoIGRvbmUgKTtcblxuICAvLyDQodC+0YXRgNCw0L3Rj9GC0Ywg0LTQvtC60YPQvNC10L3RgiDQvNC+0LbQvdC+INGC0L7Qu9GM0LrQviDQtdGB0LvQuCDQvtC9INC90LDRhdC+0LTQuNGC0YHRjyDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgaWYgKCAhdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggYXJndW1lbnRzICk7XG4gICAgY29uc29sZS5lcnJvcignRG9jdW1lbnQuc2F2ZSBhcGkgaGFuZGxlIGlzIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIHByZVNhdmUgZXJyb3JzICjRgtC+0YfQviDQt9C90LDRjiwg0YfRgtC+INC+0L3QsCDQv9GA0L7QstC10YDRj9C10YIg0L7RiNC40LHQutC4INCyINC80LDRgdGB0LjQstCw0YUgKENhc3RFcnJvcikpXG4gIHZhciBwcmVTYXZlRXJyID0gc2VsZi4kX19wcmVzYXZlVmFsaWRhdGUoKTtcbiAgaWYgKCBwcmVTYXZlRXJyICkge1xuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIHByZVNhdmVFcnIgKTtcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xuICB9XG5cbiAgLy8gVmFsaWRhdGVcbiAgdmFyIHAwID0gbmV3ICQuRGVmZXJyZWQoKTtcbiAgc2VsZi52YWxpZGF0ZShmdW5jdGlvbiggZXJyICl7XG4gICAgaWYgKCBlcnIgKXtcbiAgICAgIHAwLnJlamVjdCggZXJyICk7XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcDAucmVzb2x2ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8g0KHQvdCw0YfQsNC70LAg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCy0YHQtSDQv9C+0LTQtNC+0LrRg9C80LXQvdGC0Ysg0Lgg0YHQtNC10LvQsNGC0YwgcmVzb2x2ZSEhIVxuICAvLyBDYWxsIHNhdmUgaG9va3Mgb24gc3ViZG9jc1xuICB2YXIgc3ViRG9jcyA9IHNlbGYuJF9fZ2V0QWxsU3ViZG9jcygpO1xuICB2YXIgd2hlbkNvbmQgPSBzdWJEb2NzLm1hcChmdW5jdGlvbiAoZCkge3JldHVybiBkLnNhdmUoKTt9KTtcbiAgd2hlbkNvbmQucHVzaCggcDAgKTtcblxuICAvLyDQotCw0Log0LzRiyDQv9C10YDQtdC00LDRkdC8INC80LDRgdGB0LjQsiBwcm9taXNlINGD0YHQu9C+0LLQuNC5XG4gIHZhciBwMSA9ICQud2hlbi5hcHBseSggJCwgd2hlbkNvbmQgKTtcblxuICAvLyBIYW5kbGUgc2F2ZSBhbmQgcmVzdWx0c1xuICBwMVxuICAgIC50aGVuKCB0aGlzLiRfX2hhbmRsZVNhdmUuYmluZCggdGhpcyApIClcbiAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZpbmFsUHJvbWlzZS5yZXNvbHZlKCBzZWxmICk7XG4gICAgfSwgZnVuY3Rpb24gKCBlcnIgKSB7XG4gICAgICAvLyBJZiB0aGUgaW5pdGlhbCBpbnNlcnQgZmFpbHMgcHJvdmlkZSBhIHNlY29uZCBjaGFuY2UuXG4gICAgICAvLyAoSWYgd2UgZGlkIHRoaXMgYWxsIHRoZSB0aW1lIHdlIHdvdWxkIGJyZWFrIHVwZGF0ZXMpXG4gICAgICBpZiAoc2VsZi4kX18uaW5zZXJ0aW5nKSB7XG4gICAgICAgIHNlbGYuaXNOZXcgPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoJ2lzTmV3JywgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcbiAgICB9KTtcblxuICByZXR1cm4gZmluYWxQcm9taXNlO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIHRoaXMgZG9jdW1lbnQgaW50byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0LCByZWFkeSBmb3Igc3RvcmFnZSBpbiBNb25nb0RCLlxuICpcbiAqIEJ1ZmZlcnMgYXJlIGNvbnZlcnRlZCB0byBpbnN0YW5jZXMgb2YgW21vbmdvZGIuQmluYXJ5XShodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sKSBmb3IgcHJvcGVyIHN0b3JhZ2UuXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBgZ2V0dGVyc2AgYXBwbHkgYWxsIGdldHRlcnMgKHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVycylcbiAqIC0gYHZpcnR1YWxzYCBhcHBseSB2aXJ0dWFsIGdldHRlcnMgKGNhbiBvdmVycmlkZSBgZ2V0dGVyc2Agb3B0aW9uKVxuICogLSBgbWluaW1pemVgIHJlbW92ZSBlbXB0eSBvYmplY3RzIChkZWZhdWx0cyB0byB0cnVlKVxuICogLSBgdHJhbnNmb3JtYCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB0byB0aGUgcmVzdWx0aW5nIGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmdcbiAqXG4gKiAjIyMjR2V0dGVycy9WaXJ0dWFsc1xuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyBwYXRoIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSwgdmlydHVhbHM6IGZhbHNlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIEV4YW1wbGUgb2YgYXBwbHlpbmcgYm90aCBwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSB9KVxuICpcbiAqIFRvIGFwcGx5IHRoZXNlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9PYmplY3RgIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9PYmplY3QnLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogIyMjI1RyYW5zZm9ybVxuICpcbiAqIFdlIG1heSBuZWVkIHRvIHBlcmZvcm0gYSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdCBiYXNlZCBvbiBzb21lIGNyaXRlcmlhLCBzYXkgdG8gcmVtb3ZlIHNvbWUgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIG9yIHJldHVybiBhIGN1c3RvbSBvYmplY3QuIEluIHRoaXMgY2FzZSB3ZSBzZXQgdGhlIG9wdGlvbmFsIGB0cmFuc2Zvcm1gIGZ1bmN0aW9uLlxuICpcbiAqIFRyYW5zZm9ybSBmdW5jdGlvbnMgcmVjZWl2ZSB0aHJlZSBhcmd1bWVudHNcbiAqXG4gKiAgICAgZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7fVxuICpcbiAqIC0gYGRvY2AgVGhlIG1vbmdvb3NlIGRvY3VtZW50IHdoaWNoIGlzIGJlaW5nIGNvbnZlcnRlZFxuICogLSBgcmV0YCBUaGUgcGxhaW4gb2JqZWN0IHJlcHJlc2VudGF0aW9uIHdoaWNoIGhhcyBiZWVuIGNvbnZlcnRlZFxuICogLSBgb3B0aW9uc2AgVGhlIG9wdGlvbnMgaW4gdXNlIChlaXRoZXIgc2NoZW1hIG9wdGlvbnMgb3IgdGhlIG9wdGlvbnMgcGFzc2VkIGlubGluZSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBzcGVjaWZ5IHRoZSB0cmFuc2Zvcm0gc2NoZW1hIG9wdGlvblxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICAvLyByZW1vdmUgdGhlIF9pZCBvZiBldmVyeSBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZXN1bHRcbiAqICAgICAgIGRlbGV0ZSByZXQuX2lkO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBXaXRoIHRyYW5zZm9ybWF0aW9ucyB3ZSBjYW4gZG8gYSBsb3QgbW9yZSB0aGFuIHJlbW92ZSBwcm9wZXJ0aWVzLiBXZSBjYW4gZXZlbiByZXR1cm4gY29tcGxldGVseSBuZXcgY3VzdG9taXplZCBvYmplY3RzOlxuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgbW92aWU6IHJldC5uYW1lIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbW92aWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIF9Ob3RlOiBpZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgaWdub3JlZC5fXG4gKlxuICogVHJhbnNmb3JtYXRpb25zIG1heSBhbHNvIGJlIGFwcGxpZWQgaW5saW5lLCBvdmVycmlkZGluZyBhbnkgdHJhbnNmb3JtIHNldCBpbiB0aGUgb3B0aW9uczpcbiAqXG4gKiAgICAgZnVuY3Rpb24geGZvcm0gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBpbmxpbmU6IHJldC5uYW1lLCBjdXN0b206IHRydWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gcGFzcyB0aGUgdHJhbnNmb3JtIGFzIGFuIGlubGluZSBvcHRpb25cbiAqICAgICBkb2MudG9PYmplY3QoeyB0cmFuc2Zvcm06IHhmb3JtIH0pOyAvLyB7IGlubGluZTogJ1dyZWNrLWl0IFJhbHBoJywgY3VzdG9tOiB0cnVlIH1cbiAqXG4gKiBfTm90ZTogaWYgeW91IGNhbGwgYHRvT2JqZWN0YCBhbmQgcGFzcyBhbnkgb3B0aW9ucywgdGhlIHRyYW5zZm9ybSBkZWNsYXJlZCBpbiB5b3VyIHNjaGVtYSBvcHRpb25zIHdpbGwgX19ub3RfXyBiZSBhcHBsaWVkLiBUbyBmb3JjZSBpdHMgYXBwbGljYXRpb24gcGFzcyBgdHJhbnNmb3JtOiB0cnVlYF9cbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC5oaWRlID0gJ19pZCc7XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICBpZiAob3B0aW9ucy5oaWRlKSB7XG4gKiAgICAgICAgIG9wdGlvbnMuaGlkZS5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAqICAgICAgICAgICBkZWxldGUgcmV0W3Byb3BdO1xuICogICAgICAgICB9KTtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfSk7XG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHsgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnIH0pOyAgICAgICAgICAgICAgICAgIC8vIHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJywgdHJhbnNmb3JtOiB0cnVlIH0pOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IF9hbmQgZWFjaCBvZiBpdHMgc3ViLWRvY3VtZW50c18uIFRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB5b3UgYXJlIGN1cnJlbnRseSBvcGVyYXRpbmcgb24gYSBzdWItZG9jdW1lbnQgeW91IG1pZ2h0IHVzZSB0aGUgZm9sbG93aW5nIGd1YXJkOlxuICpcbiAqICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZG9jLm93bmVyRG9jdW1lbnQpIHtcbiAqICAgICAgIC8vIHdvcmtpbmcgd2l0aCBhIHN1YiBkb2NcbiAqICAgICB9XG4gKlxuICogVHJhbnNmb3JtcywgbGlrZSBhbGwgb2YgdGhlc2Ugb3B0aW9ucywgYXJlIGFsc28gYXZhaWxhYmxlIGZvciBgdG9KU09OYC5cbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSBmb3Igc29tZSBtb3JlIGRldGFpbHMuXG4gKlxuICogX0R1cmluZyBzYXZlLCBubyBjdXN0b20gb3B0aW9ucyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgYmVmb3JlIGJlaW5nIHNlbnQgdG8gdGhlIGRhdGFiYXNlLl9cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtPYmplY3R9IGpzIG9iamVjdFxuICogQHNlZSBtb25nb2RiLkJpbmFyeSBodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUgJiYgdGhpcy4kX18ud2FzUG9wdWxhdGVkKSB7XG4gICAgLy8gcG9wdWxhdGVkIHBhdGhzIHRoYXQgd2Ugc2V0IHRvIGEgZG9jdW1lbnRcbiAgICByZXR1cm4gdXRpbHMuY2xvbmUodGhpcy5faWQsIG9wdGlvbnMpO1xuICB9XG5cbiAgLy8gV2hlbiBpbnRlcm5hbGx5IHNhdmluZyB0aGlzIGRvY3VtZW50IHdlIGFsd2F5cyBwYXNzIG9wdGlvbnMsXG4gIC8vIGJ5cGFzc2luZyB0aGUgY3VzdG9tIHNjaGVtYSBvcHRpb25zLlxuICB2YXIgb3B0aW9uc1BhcmFtZXRlciA9IG9wdGlvbnM7XG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9wdGlvbnMuY29uc3RydWN0b3IpKSB8fFxuICAgIChvcHRpb25zICYmIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3RcbiAgICAgID8gY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdClcbiAgICAgIDoge307XG4gIH1cblxuICBpZiAoIG9wdGlvbnMubWluaW1pemUgPT09IHVuZGVmaW5lZCApe1xuICAgIG9wdGlvbnMubWluaW1pemUgPSB0aGlzLnNjaGVtYS5vcHRpb25zLm1pbmltaXplO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zUGFyYW1ldGVyKSB7XG4gICAgb3B0aW9ucy5fdXNlU2NoZW1hT3B0aW9ucyA9IHRydWU7XG4gIH1cblxuICB2YXIgcmV0ID0gdXRpbHMuY2xvbmUodGhpcy5fZG9jLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy52aXJ0dWFscyB8fCBvcHRpb25zLmdldHRlcnMgJiYgZmFsc2UgIT09IG9wdGlvbnMudmlydHVhbHMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAndmlydHVhbHMnLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmdldHRlcnMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAncGF0aHMnLCBvcHRpb25zKTtcbiAgICAvLyBhcHBseUdldHRlcnMgZm9yIHBhdGhzIHdpbGwgYWRkIG5lc3RlZCBlbXB0eSBvYmplY3RzO1xuICAgIC8vIGlmIG1pbmltaXplIGlzIHNldCwgd2UgbmVlZCB0byByZW1vdmUgdGhlbS5cbiAgICBpZiAob3B0aW9ucy5taW5pbWl6ZSkge1xuICAgICAgcmV0ID0gbWluaW1pemUocmV0KSB8fCB7fTtcbiAgICB9XG4gIH1cblxuICAvLyBJbiB0aGUgY2FzZSB3aGVyZSBhIHN1YmRvY3VtZW50IGhhcyBpdHMgb3duIHRyYW5zZm9ybSBmdW5jdGlvbiwgd2UgbmVlZCB0b1xuICAvLyBjaGVjayBhbmQgc2VlIGlmIHRoZSBwYXJlbnQgaGFzIGEgdHJhbnNmb3JtIChvcHRpb25zLnRyYW5zZm9ybSkgYW5kIGlmIHRoZVxuICAvLyBjaGlsZCBzY2hlbWEgaGFzIGEgdHJhbnNmb3JtICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBJbiB0aGlzIGNhc2UsXG4gIC8vIHdlIG5lZWQgdG8gYWRqdXN0IG9wdGlvbnMudHJhbnNmb3JtIHRvIGJlIHRoZSBjaGlsZCBzY2hlbWEncyB0cmFuc2Zvcm0gYW5kXG4gIC8vIG5vdCB0aGUgcGFyZW50IHNjaGVtYSdzXG4gIGlmICh0cnVlID09PSBvcHRpb25zLnRyYW5zZm9ybSB8fFxuICAgICAgKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgJiYgb3B0aW9ucy50cmFuc2Zvcm0pKSB7XG4gICAgdmFyIG9wdHMgPSBvcHRpb25zLmpzb25cbiAgICAgID8gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgIDogdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdDtcbiAgICBpZiAob3B0cykge1xuICAgICAgb3B0aW9ucy50cmFuc2Zvcm0gPSBvcHRzLnRyYW5zZm9ybTtcbiAgICB9XG4gIH1cblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICB2YXIgeGZvcm1lZCA9IG9wdGlvbnMudHJhbnNmb3JtKHRoaXMsIHJldCwgb3B0aW9ucyk7XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiB4Zm9ybWVkKSByZXQgPSB4Zm9ybWVkO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qIVxuICogTWluaW1pemVzIGFuIG9iamVjdCwgcmVtb3ZpbmcgdW5kZWZpbmVkIHZhbHVlcyBhbmQgZW1wdHkgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdG8gbWluaW1pemVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBtaW5pbWl6ZSAob2JqKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlcbiAgICAsIHZhbDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YWwgPSBvYmpba2V5XTtcblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KHZhbCkgKSB7XG4gICAgICBvYmpba2V5XSA9IG1pbmltaXplKHZhbCk7XG4gICAgfVxuXG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gb2JqW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGhhc0tleXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGhhc0tleXNcbiAgICA/IG9ialxuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIEFwcGxpZXMgdmlydHVhbHMgcHJvcGVydGllcyB0byBganNvbmAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IGpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIGVpdGhlciBgdmlydHVhbHNgIG9yIGBwYXRoc2BcbiAqIEByZXR1cm4ge09iamVjdH0gYGpzb25gXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlHZXR0ZXJzIChzZWxmLCBqc29uLCB0eXBlLCBvcHRpb25zKSB7XG4gIHZhciBzY2hlbWEgPSBzZWxmLnNjaGVtYVxuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyhzY2hlbWFbdHlwZV0pXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0gcGF0aHNbaV07XG5cbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAgICwgcGxlbiA9IHBhcnRzLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gcGxlbiAtIDFcbiAgICAgICwgYnJhbmNoID0ganNvblxuICAgICAgLCBwYXJ0O1xuXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHBsZW47ICsraWkpIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpaV07XG4gICAgICBpZiAoaWkgPT09IGxhc3QpIHtcbiAgICAgICAgYnJhbmNoW3BhcnRdID0gdXRpbHMuY2xvbmUoc2VsZi5nZXQocGF0aCksIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoW3BhcnRdIHx8IChicmFuY2hbcGFydF0gPSB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGpzb247XG59XG5cbi8qKlxuICogVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIG1ldGhvZCBpcyB1c2VkIGluIGNhbGxzIHRvIEpTT04uc3RyaW5naWZ5KGRvYykuXG4gKlxuICogVGhpcyBtZXRob2QgYWNjZXB0cyB0aGUgc2FtZSBvcHRpb25zIGFzIFtEb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KS4gVG8gYXBwbHkgdGhlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9KU09OYCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvSlNPTicsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgZm9yIGRldGFpbHMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBzZWUgRG9jdW1lbnQjdG9PYmplY3QgI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBjaGVjayBmb3Igb2JqZWN0IHR5cGUgc2luY2UgYW4gYXJyYXkgb2YgZG9jdW1lbnRzXG4gIC8vIGJlaW5nIHN0cmluZ2lmaWVkIHBhc3NlcyBhcnJheSBpbmRleGVzIGluc3RlYWRcbiAgLy8gb2Ygb3B0aW9ucyBvYmplY3RzLiBKU09OLnN0cmluZ2lmeShbZG9jLCBkb2NdKVxuICAvLyBUaGUgc2Vjb25kIGNoZWNrIGhlcmUgaXMgdG8gbWFrZSBzdXJlIHRoYXQgcG9wdWxhdGVkIGRvY3VtZW50cyAob3JcbiAgLy8gc3ViZG9jdW1lbnRzKSB1c2UgdGhlaXIgb3duIG9wdGlvbnMgZm9yIGAudG9KU09OKClgIGluc3RlYWQgb2YgdGhlaXJcbiAgLy8gcGFyZW50J3NcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob3B0aW9ucy5jb25zdHJ1Y3RvcikpXG4gICAgICB8fCAoKCFvcHRpb25zIHx8IG9wdGlvbnMuanNvbikgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pKSB7XG5cbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pXG4gICAgICA6IHt9O1xuICB9XG4gIG9wdGlvbnMuanNvbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMudG9PYmplY3Qob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgRG9jdW1lbnQgc3RvcmVzIHRoZSBzYW1lIGRhdGEgYXMgZG9jLlxuICpcbiAqIERvY3VtZW50cyBhcmUgY29uc2lkZXJlZCBlcXVhbCB3aGVuIHRoZXkgaGF2ZSBtYXRjaGluZyBgX2lkYHMsIHVubGVzcyBuZWl0aGVyXG4gKiBkb2N1bWVudCBoYXMgYW4gYF9pZGAsIGluIHdoaWNoIGNhc2UgdGhpcyBmdW5jdGlvbiBmYWxscyBiYWNrIHRvIHVzaW5nXG4gKiBgZGVlcEVxdWFsKClgLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBhIGRvY3VtZW50IHRvIGNvbXBhcmVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoZG9jKSB7XG4gIHZhciB0aWQgPSB0aGlzLmdldCgnX2lkJyk7XG4gIHZhciBkb2NpZCA9IGRvYy5nZXQoJ19pZCcpO1xuICBpZiAoIXRpZCAmJiAhZG9jaWQpIHtcbiAgICByZXR1cm4gZGVlcEVxdWFsKHRoaXMsIGRvYyk7XG4gIH1cbiAgcmV0dXJuIHRpZCAmJiB0aWQuZXF1YWxzXG4gICAgPyB0aWQuZXF1YWxzKGRvY2lkKVxuICAgIDogdGlkID09PSBkb2NpZDtcbn07XG5cbi8qKlxuICogR2V0cyBfaWQocykgdXNlZCBkdXJpbmcgcG9wdWxhdGlvbiBvZiB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBNb2RlbC5maW5kT25lKCkucG9wdWxhdGUoJ2F1dGhvcicpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MuYXV0aG9yLm5hbWUpICAgICAgICAgLy8gRHIuU2V1c3NcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5wb3B1bGF0ZWQoJ2F1dGhvcicpKSAvLyAnNTE0NGNmODA1MGYwNzFkOTc5YzExOGE3J1xuICogICAgIH0pXG4gKlxuICogSWYgdGhlIHBhdGggd2FzIG5vdCBwb3B1bGF0ZWQsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7QXJyYXl8T2JqZWN0SWR8TnVtYmVyfEJ1ZmZlcnxTdHJpbmd8dW5kZWZpbmVkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnBvcHVsYXRlZCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9wdGlvbnMpIHtcbiAgLy8gdmFsIGFuZCBvcHRpb25zIGFyZSBpbnRlcm5hbFxuXG4gIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDRjdGC0YMg0L/RgNC+0LLQtdGA0LrRgywg0L7QvdCwINC00L7Qu9C20L3QsCDQvtC/0LjRgNCw0YLRjNGB0Y8g0L3QtSDQvdCwICRfXy5wb3B1bGF0ZWQsINCwINC90LAg0YLQviwg0YfRgtC+INC90LDRiCDQvtCx0YrQtdC60YIg0LjQvNC10LXRgiDRgNC+0LTQuNGC0LXQu9GPXG4gIC8vINC4INC/0L7RgtC+0Lwg0YPQttC1INCy0YvRgdGC0LDQstC70Y/RgtGMINGB0LLQvtC50YHRgtCy0L4gcG9wdWxhdGVkID09IHRydWVcbiAgaWYgKG51bGwgPT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgdmFyIHYgPSB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XG4gICAgaWYgKHYpIHJldHVybiB2LnZhbHVlO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBpbnRlcm5hbFxuXG4gIGlmICh0cnVlID09PSB2YWwpIHtcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICB9XG5cbiAgdGhpcy4kX18ucG9wdWxhdGVkIHx8ICh0aGlzLiRfXy5wb3B1bGF0ZWQgPSB7fSk7XG4gIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXSA9IHsgdmFsdWU6IHZhbCwgb3B0aW9uczogb3B0aW9ucyB9O1xuICByZXR1cm4gdmFsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICAvLyBvdmVycmlkZGVuIGluIFN1YkRvY3VtZW50c1xuICByZXR1cm4gcGF0aCB8fCAnJztcbn07XG5cbi8qKlxuICog0KPQtNCw0LvQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuCDQstC10YDQvdGD0YLRjCDQutC+0LvQu9C10LrRhtC40Y4uXG4gKlxuICogQGV4YW1wbGVcbiAqIGRvY3VtZW50LnJlbW92ZSgpO1xuICpcbiAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oKXtcbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLnJlbW92ZSggdGhpcyApO1xuICB9XG5cbiAgcmV0dXJuIGRlbGV0ZSB0aGlzO1xufTtcblxuXG4vKipcbiAqINCe0YfQuNGJ0LDQtdGCINC00L7QutGD0LzQtdC90YIgKNCy0YvRgdGC0LDQstC70Y/QtdGCINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y4g0LjQu9C4IHVuZGVmaW5lZClcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGRvYyA9IHRoaXNcbiAgICAsIHNlbGYgPSB0aGlzXG4gICAgLCBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09IHAgKSBjb250aW51ZTtcblxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXG4gICAgICAsIGxlbiA9IHBhdGgubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXG4gICAgICAsIGRvY18gPSBkb2NcbiAgICAgICwgaSA9IDA7XG5cbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcbiAgICAgIHZhciBwaWVjZSA9IHBhdGhbIGkgXVxuICAgICAgICAsIGRlZmF1bHRWYWw7XG5cbiAgICAgIGlmICggaSA9PT0gbGFzdCApIHtcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xuXG4gICAgICAgIGRvY19bIHBpZWNlIF0gPSBkZWZhdWx0VmFsIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jXyA9IGRvY19bIHBpZWNlIF0gfHwgKCBkb2NfWyBwaWVjZSBdID0ge30gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxuRG9jdW1lbnQuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yO1xubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy90b2RvOiDQv9C+0YDRgtC40YDQvtCy0LDRgtGMINCy0YHQtSDQvtGI0LjQsdC60LghISFcbi8qKlxuICogU3RvcmFnZUVycm9yIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIEVycm9yIG1lc3NhZ2VcbiAqIEBpbmhlcml0cyBFcnJvciBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvclxuICogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODM4MTgvaG93LWRvLWktY3JlYXRlLWEtY3VzdG9tLWVycm9yLWluLWphdmFzY3JpcHRcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUVycm9yICggbXNnICkge1xuICB0aGlzLm1lc3NhZ2UgPSBtc2c7XG4gIHRoaXMubmFtZSA9ICdTdG9yYWdlRXJyb3InO1xufVxuU3RvcmFnZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5cbi8qIVxuICogRm9ybWF0cyBlcnJvciBtZXNzYWdlc1xuICovXG5TdG9yYWdlRXJyb3IucHJvdG90eXBlLmZvcm1hdE1lc3NhZ2UgPSBmdW5jdGlvbiAobXNnLCBwYXRoLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIHRocm93IG5ldyBUeXBlRXJyb3IoJ21lc3NhZ2UgaXMgcmVxdWlyZWQnKTtcblxuICByZXR1cm4gbXNnLnJlcGxhY2UoL3tQQVRIfS8sIHBhdGgpXG4gICAgICAgICAgICAucmVwbGFjZSgve1ZBTFVFfS8sIFN0cmluZyh2YWx8fCcnKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VFlQRX0vLCB0eXBlIHx8ICdkZWNsYXJlZCB0eXBlJyk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUVycm9yO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy5cbiAqXG4gKiBAc2VlIEVycm9yLm1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZUVycm9yLm1lc3NhZ2VzID0gcmVxdWlyZSgnLi9lcnJvci9tZXNzYWdlcycpO1xuXG4vKiFcbiAqIEV4cG9zZSBzdWJjbGFzc2VzXG4gKi9cblxuU3RvcmFnZUVycm9yLkNhc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvY2FzdCcpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdGlvbicpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0b3InKTtcbi8vdG9kbzpcbi8vU3RvcmFnZUVycm9yLlZlcnNpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmVyc2lvbicpO1xuLy9TdG9yYWdlRXJyb3IuT3ZlcndyaXRlTW9kZWxFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3Ivb3ZlcndyaXRlTW9kZWwnKTtcblN0b3JhZ2VFcnJvci5NaXNzaW5nU2NoZW1hRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL21pc3NpbmdTY2hlbWEnKTtcbi8vU3RvcmFnZUVycm9yLkRpdmVyZ2VudEFycmF5RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL2RpdmVyZ2VudEFycmF5Jyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAaW5oZXJpdHMgU3RvcmFnZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDYXN0RXJyb3IgKHR5cGUsIHZhbHVlLCBwYXRoKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xuICB0aGlzLm5hbWUgPSAnQ2FzdEVycm9yJztcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnBhdGggPSBwYXRoO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUVycm9yLlxuICovXG5DYXN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xuQ2FzdEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhc3RFcnJvcjtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBDYXN0RXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLiBUaGVzZSBtYXkgYmUgY3VzdG9taXplZC5cbiAqXG4gKiAgICAgLy8gY3VzdG9taXplIHdpdGhpbiBlYWNoIHNjaGVtYSBvciBnbG9iYWxseSBsaWtlIHNvXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICBtb25nb29zZS5FcnJvci5tZXNzYWdlcy5TdHJpbmcuZW51bSAgPSBcIllvdXIgY3VzdG9tIG1lc3NhZ2UgZm9yIHtQQVRIfS5cIjtcbiAqXG4gKiBBcyB5b3UgbWlnaHQgaGF2ZSBub3RpY2VkLCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2ljIHRlbXBsYXRpbmdcbiAqXG4gKiAtIGB7UEFUSH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgZG9jdW1lbnQgcGF0aFxuICogLSBge1ZBTFVFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogLSBge1RZUEV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSB2YWxpZGF0b3IgdHlwZSBzdWNoIGFzIFwicmVnZXhwXCIsIFwibWluXCIsIG9yIFwidXNlciBkZWZpbmVkXCJcbiAqIC0gYHtNSU59YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtaW4gdmFsdWUgZm9yIHRoZSBOdW1iZXIubWluIHZhbGlkYXRvclxuICogLSBge01BWH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1heCB2YWx1ZSBmb3IgdGhlIE51bWJlci5tYXggdmFsaWRhdG9yXG4gKlxuICogQ2xpY2sgdGhlIFwic2hvdyBjb2RlXCIgbGluayBiZWxvdyB0byBzZWUgYWxsIGRlZmF1bHRzLlxuICpcbiAqIEBwcm9wZXJ0eSBtZXNzYWdlc1xuICogQHJlY2VpdmVyIFN0b3JhZ2VFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgbXNnID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxubXNnLmdlbmVyYWwgPSB7fTtcbm1zZy5nZW5lcmFsLmRlZmF1bHQgPSAnVmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YCc7XG5tc2cuZ2VuZXJhbC5yZXF1aXJlZCA9ICdQYXRoIGB7UEFUSH1gIGlzIHJlcXVpcmVkLic7XG5cbm1zZy5OdW1iZXIgPSB7fTtcbm1zZy5OdW1iZXIubWluID0gJ1BhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGxlc3MgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUgKHtNSU59KS4nO1xubXNnLk51bWJlci5tYXggPSAnUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbW9yZSB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZSAoe01BWH0pLic7XG5cbm1zZy5TdHJpbmcgPSB7fTtcbm1zZy5TdHJpbmcuZW51bSA9ICdge1ZBTFVFfWAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBge1BBVEh9YC4nO1xubXNnLlN0cmluZy5tYXRjaCA9ICdQYXRoIGB7UEFUSH1gIGlzIGludmFsaWQgKHtWQUxVRX0pLic7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKiFcbiAqIE1pc3NpbmdTY2hlbWEgRXJyb3IgY29uc3RydWN0b3IuXG4gKlxuICogQGluaGVyaXRzIFN0b3JhZ2VFcnJvclxuICovXG5cbmZ1bmN0aW9uIE1pc3NpbmdTY2hlbWFFcnJvcigpe1xuICB2YXIgbXNnID0gJ1NjaGVtYSBoYXNuXFwndCBiZWVuIHJlZ2lzdGVyZWQgZm9yIGRvY3VtZW50LlxcbidcbiAgICArICdVc2Ugc3RvcmFnZS5Eb2N1bWVudChkYXRhLCBzY2hlbWEpJztcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgbXNnKTtcblxuICB0aGlzLm5hbWUgPSAnTWlzc2luZ1NjaGVtYUVycm9yJztcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvci5cbiAqL1xuXG5NaXNzaW5nU2NoZW1hRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdG9yYWdlRXJyb3IucHJvdG90eXBlKTtcbk1pc3NpbmdTY2hlbWFFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdG9yYWdlRXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTWlzc2luZ1NjaGVtYUVycm9yOyIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qKlxuICogRG9jdW1lbnQgVmFsaWRhdGlvbiBFcnJvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gaW5zdGFuY2VcbiAqIEBpbmhlcml0cyBTdG9yYWdlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IgKGluc3RhbmNlKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9yJztcbiAgdGhpcy5lcnJvcnMgPSBpbnN0YW5jZS5lcnJvcnMgPSB7fTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VFcnJvci5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xudmFyIGVycm9yTWVzc2FnZXMgPSBTdG9yYWdlRXJyb3IubWVzc2FnZXM7XG5cbi8qKlxuICogU2NoZW1hIHZhbGlkYXRvciBlcnJvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfCp9IHZhbFxuICogQGluaGVyaXRzIFN0b3JhZ2VFcnJvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdG9yRXJyb3IgKHBhdGgsIG1zZywgdHlwZSwgdmFsKSB7XG4gIGlmICggIW1zZyApIHtcbiAgICBtc2cgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcbiAgfVxuXG4gIHZhciBtZXNzYWdlID0gdGhpcy5mb3JtYXRNZXNzYWdlKG1zZywgcGF0aCwgdHlwZSwgdmFsKTtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRvckVycm9yJztcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbDtcbn1cblxuLyohXG4gKiB0b1N0cmluZyBoZWxwZXJcbiAqL1xuXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2U7XG59O1xuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUVycm9yXG4gKi9cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRvckVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvckVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqXG4gKiBCYWNrYm9uZS5FdmVudHNcblxuICogQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuICogY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuICogZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbiAqIHN1Y2Nlc3Npb24uXG4gKlxuICogdmFyIG9iamVjdCA9IHt9O1xuICogXy5leHRlbmQob2JqZWN0LCBFdmVudHMucHJvdG90eXBlKTtcbiAqIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICogb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuICovXG5mdW5jdGlvbiBFdmVudHMoKSB7fVxuXG5FdmVudHMucHJvdG90eXBlID0ge1xuICAvKipcbiAgICogQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAgKiB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBjb250ZXh0XG4gICAqIEByZXR1cm5zIHtFdmVudHN9XG4gICAqL1xuICBvbjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gICAqIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gY29udGV4dFxuICAgKiBAcmV0dXJucyB7RXZlbnRzfVxuICAgKi9cbiAgb25jZTogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbmNlID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0pO1xuICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIHRoaXMub24obmFtZSwgb25jZSwgY29udGV4dCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBvbmUgb3IgbWFueSBjYWxsYmFja3MuIElmIGBjb250ZXh0YCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgKiBjYWxsYmFja3Mgd2l0aCB0aGF0IGZ1bmN0aW9uLiBJZiBgY2FsbGJhY2tgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAqIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcbiAgICogY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIGNvbnRleHRcbiAgICogQHJldHVybnMge0V2ZW50c31cbiAgICovXG4gIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB2YXIgcmV0YWluLCBldiwgZXZlbnRzLCBuYW1lcywgaSwgbCwgaiwgaztcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XG4gICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrIHx8IGNvbnRleHQpIHtcbiAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgZXYgPSBldmVudHNbal07XG4gICAgICAgICAgICBpZiAoKGNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2suX2NhbGxiYWNrKSB8fFxuICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICByZXRhaW4ucHVzaChldik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gICAqIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gICAqICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xuICAgKiByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHtFdmVudHN9XG4gICAqL1xuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xuICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogVGVsbCB0aGlzIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBlaXRoZXIgc3BlY2lmaWMgZXZlbnRzIC4uLiBvclxuICAgKiB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICAgKlxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcmV0dXJucyB7RXZlbnRzfVxuICAgKi9cbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvO1xuICAgIGlmICghbGlzdGVuaW5nVG8pIHJldHVybiB0aGlzO1xuICAgIHZhciByZW1vdmUgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICBpZiAob2JqKSAobGlzdGVuaW5nVG8gPSB7fSlbb2JqLl9saXN0ZW5JZF0gPSBvYmo7XG4gICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuaW5nVG8pIHtcbiAgICAgIG9iaiA9IGxpc3RlbmluZ1RvW2lkXTtcbiAgICAgIG9iai5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgaWYgKHJlbW92ZSB8fCBfLmlzRW1wdHkob2JqLl9ldmVudHMpKSBkZWxldGUgdGhpcy5fbGlzdGVuaW5nVG9baWRdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4vKipcbiAqIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4gKiBuYW1lcyBgXCJjaGFuZ2UgYmx1clwiYCBhbmQgalF1ZXJ5LXN0eWxlIGV2ZW50IG1hcHMgYHtjaGFuZ2U6IGFjdGlvbn1gXG4gKiBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEBwYXJhbSBhY3Rpb25cbiAqIEBwYXJhbSBuYW1lXG4gKiBAcGFyYW0gcmVzdFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnZhciBldmVudHNBcGkgPSBmdW5jdGlvbihvYmosIGFjdGlvbiwgbmFtZSwgcmVzdCkge1xuICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xuXG4gIC8vIEhhbmRsZSBldmVudCBtYXBzLlxuICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBIYW5kbGUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50IG5hbWVzLlxuICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBBIGRpZmZpY3VsdC10by1iZWxpZXZlLCBidXQgb3B0aW1pemVkIGludGVybmFsIGRpc3BhdGNoIGZ1bmN0aW9uIGZvclxuICogdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuICogQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxuICpcbiAqIEBwYXJhbSBldmVudHNcbiAqIEBwYXJhbSBhcmdzXG4gKi9cbnZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XG4gICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XG4gICAgY2FzZSAyOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyKTsgcmV0dXJuO1xuICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XG4gICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcbiAgfVxufTtcblxudmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcblxuLy8gSW52ZXJzaW9uLW9mLWNvbnRyb2wgdmVyc2lvbnMgb2YgYG9uYCBhbmQgYG9uY2VgLiBUZWxsICp0aGlzKiBvYmplY3QgdG9cbi8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3Ncbi8vIGxpc3RlbmluZyB0by5cbl8uZWFjaChsaXN0ZW5NZXRob2RzLCBmdW5jdGlvbihpbXBsZW1lbnRhdGlvbiwgbWV0aG9kKSB7XG4gIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvIHx8ICh0aGlzLl9saXN0ZW5pbmdUbyA9IHt9KTtcbiAgICB2YXIgaWQgPSBvYmouX2xpc3RlbklkIHx8IChvYmouX2xpc3RlbklkID0gXy51bmlxdWVJZCgnbCcpKTtcbiAgICBsaXN0ZW5pbmdUb1tpZF0gPSBvYmo7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcbiIsIihmdW5jdGlvbiAoQnVmZmVyKXtcbid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBTdG9yYWdlIGRvY3VtZW50cyB1c2luZyBzY2hlbWFcbiAqIGluc3BpcmVkIGJ5IG1vbmdvb3NlIDMuOC40IChmaXhlZCBidWdzIGZvciAzLjguMTYpXG4gKlxuICogU3RvcmFnZSBpbXBsZW1lbnRhdGlvblxuICogaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jc2VsZWN0b3JzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cbiAqXG4gKiDQv9GA0L7RgdC70LXQtNC40YLRjCDQt9CwINCx0LDQs9C+0LwgZ2gtMTYzOCAoMy44LjE2KVxuICovXG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIHBrZyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuXG5cbi8qKlxuICogU3RvcmFnZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgZXhwb3J0cyBvYmplY3Qgb2YgdGhlIGBzdG9yYWdlYCBtb2R1bGUgaXMgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbiAqIE1vc3QgYXBwcyB3aWxsIG9ubHkgdXNlIHRoaXMgb25lIGluc3RhbmNlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2UgKCkge1xuICB0aGlzLmNvbGxlY3Rpb25OYW1lcyA9IFtdO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGNvbGxlY3Rpb24gYW5kIGdldCBpdFxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RvcmFnZS5TY2hlbWF8dW5kZWZpbmVkfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoICdTY2hlbWEnICE9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIHNjaGVtYS5jb25zdHJ1Y3RvciApICl7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcblxuICB0aGlzWyBuYW1lIF0gPSBuZXcgQ29sbGVjdGlvbiggbmFtZSwgc2NoZW1hLCBhcGkgKTtcblxuICByZXR1cm4gdGhpc1sgbmFtZSBdO1xufTtcblxuLyoqXG4gKiBUbyBvYnRhaW4gdGhlIG5hbWVzIG9mIHRoZSBjb2xsZWN0aW9ucyBpbiBhbiBhcnJheVxuICpcbiAqIEByZXR1cm5zIHtBcnJheS48c3RyaW5nPn0gQW4gYXJyYXkgY29udGFpbmluZyBhbGwgY29sbGVjdGlvbnMgaW4gdGhlIHN0b3JhZ2UuXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLmdldENvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLmNvbGxlY3Rpb25OYW1lcztcbn07XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuQ29sbGVjdGlvbiA9IENvbGxlY3Rpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgdmVyc2lvblxuICpcbiAqIEBwcm9wZXJ0eSB2ZXJzaW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlLnByb3RvdHlwZS52ZXJzaW9uID0gcGtnLnZlcnNpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYV0oI3NjaGVtYV9TY2hlbWEpIGNvbnN0cnVjdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBTY2hlbWEgPSBzdG9yYWdlLlNjaGVtYTtcbiAqICAgICB2YXIgQ2F0U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogQG1ldGhvZCBTY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYSA9IFNjaGVtYTtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGUgPSBTY2hlbWFUeXBlO1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIFN0b3JhZ2UgU2NoZW1hVHlwZXMuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX0FsaWFzIG9mIHN0b3JhZ2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXG4gKlxuICogQHByb3BlcnR5IFNjaGVtYVR5cGVzXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1ZpcnR1YWxUeXBlXSgjdmlydHVhbHR5cGVfVmlydHVhbFR5cGUpIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBWaXJ0dWFsVHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuVmlydHVhbFR5cGUgPSBWaXJ0dWFsVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBTdG9yYWdlIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgYXJyYXkgPSBzdG9yYWdlLlR5cGVzLkFycmF5O1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtPYmplY3RJZF0oI3R5cGVzLW9iamVjdGlkLWpzKVxuICogLSBbQnVmZmVyXSgjdHlwZXMtYnVmZmVyLWpzKVxuICogLSBbU3ViRG9jdW1lbnRdKCN0eXBlcy1lbWJlZGRlZC1qcylcbiAqIC0gW0FycmF5XSgjdHlwZXMtYXJyYXktanMpXG4gKiAtIFtEb2N1bWVudEFycmF5XSgjdHlwZXMtZG9jdW1lbnRhcnJheS1qcylcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgT2JqZWN0SWRgIHR5cGUsIHdlIGNhbiBjb25zdHJ1Y3QgaWRzIG9uIGRlbWFuZC5cbiAqXG4gKiAgICAgdmFyIE9iamVjdElkID0gc3RvcmFnZS5UeXBlcy5PYmplY3RJZDtcbiAqICAgICB2YXIgaWQxID0gbmV3IE9iamVjdElkO1xuICpcbiAqIEBwcm9wZXJ0eSBUeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuVHlwZXMgPSBUeXBlcztcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSBbRG9jdW1lbnRdKCNkb2N1bWVudC1qcykgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBEb2N1bWVudFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuRG9jdW1lbnQgPSBEb2N1bWVudDtcblxuLyoqXG4gKiBUaGUgW1N0b3JhZ2VFcnJvcl0oI2Vycm9yX1N0b3JhZ2VFcnJvcikgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblxuXG5TdG9yYWdlLnByb3RvdHlwZS5TdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xuU3RvcmFnZS5wcm90b3R5cGUudXRpbHMgPSB1dGlscztcblN0b3JhZ2UucHJvdG90eXBlLk9iamVjdElkID0gVHlwZXMuT2JqZWN0SWQ7XG5TdG9yYWdlLnByb3RvdHlwZS5zY2hlbWFzID0gU2NoZW1hLnNjaGVtYXM7XG5cblN0b3JhZ2UucHJvdG90eXBlLnNldEFkYXB0ZXIgPSBmdW5jdGlvbiggYWRhcHRlckhvb2tzICl7XG4gIERvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSBhZGFwdGVySG9va3M7XG59O1xuXG5cbi8qIVxuICogVGhlIGV4cG9ydHMgb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIFN0b3JhZ2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgU3RvcmFnZSgpO1xuXG53aW5kb3cuQnVmZmVyID0gQnVmZmVyO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyDQnNCw0YjQuNC90LAg0YHQvtGB0YLQvtGP0L3QuNC5INC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0L/QvtC80LXRgtC60LgsINCyINC60LDQutC+0Lwg0YHQvtGB0YLQvtGP0L3QuNC4INC90LDRhdC+0LTRj9GC0YHRjyDQv9C+0LvQtVxuLy8g0J3QsNC/0YDQuNC80LXRgDog0LXRgdC70Lgg0L/QvtC70LUg0LjQvNC10LXRgiDRgdC+0YHRgtC+0Y/QvdC40LUgZGVmYXVsdCAtINC30L3QsNGH0LjRgiDQtdCz0L4g0LfQvdCw0YfQtdC90LjQtdC8INGP0LLQu9GP0LXRgtGB0Y8g0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjlxuLy8g0J/RgNC40LzQtdGH0LDQvdC40LU6INC00LvRjyDQvNCw0YHRgdC40LLQvtCyINCyINC+0LHRidC10Lwg0YHQu9GD0YfQsNC1INGN0YLQviDQvtC30L3QsNGH0LDQtdGCINC/0YPRgdGC0L7QuSDQvNCw0YHRgdC40LJcblxuLyohXG4gKiBEZXBlbmRlbmNpZXNcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcblxudmFyIEFjdGl2ZVJvc3RlciA9IFN0YXRlTWFjaGluZS5jdG9yKCdyZXF1aXJlJywgJ21vZGlmeScsICdpbml0JywgJ2RlZmF1bHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcm5hbENhY2hlO1xuXG5mdW5jdGlvbiBJbnRlcm5hbENhY2hlICgpIHtcbiAgdGhpcy5zdHJpY3RNb2RlID0gdW5kZWZpbmVkO1xuICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICB0aGlzLnNhdmVFcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWRob2NQYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5yZW1vdmluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5pbnNlcnRpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmVyc2lvbiA9IHVuZGVmaW5lZDtcbiAgdGhpcy5nZXR0ZXJzID0ge307XG4gIHRoaXMuX2lkID0gdW5kZWZpbmVkO1xuICB0aGlzLnBvcHVsYXRlID0gdW5kZWZpbmVkOyAvLyB3aGF0IHdlIHdhbnQgdG8gcG9wdWxhdGUgaW4gdGhpcyBkb2NcbiAgdGhpcy5wb3B1bGF0ZWQgPSB1bmRlZmluZWQ7Ly8gdGhlIF9pZHMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXG4gIHRoaXMud2FzUG9wdWxhdGVkID0gZmFsc2U7IC8vIGlmIHRoaXMgZG9jIHdhcyB0aGUgcmVzdWx0IG9mIGEgcG9wdWxhdGlvblxuICB0aGlzLnNjb3BlID0gdW5kZWZpbmVkO1xuICB0aGlzLmFjdGl2ZVBhdGhzID0gbmV3IEFjdGl2ZVJvc3RlcigpO1xuXG4gIC8vIGVtYmVkZGVkIGRvY3NcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gdW5kZWZpbmVkO1xuICB0aGlzLmZ1bGxQYXRoID0gdW5kZWZpbmVkO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIG9iamVjdCBgb2AgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG9iaiA9IHtcbiAqICAgICAgICAgY29tbWVudHM6IFtcbiAqICAgICAgICAgICAgIHsgdGl0bGU6ICdleGNpdGluZyEnLCBfZG9jOiB7IHRpdGxlOiAnZ3JlYXQhJyB9fVxuICogICAgICAgICAgICwgeyB0aXRsZTogJ251bWJlciBkb3MnIH1cbiAqICAgICAgICAgXVxuICogICAgIH1cbiAqXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbykgICAgICAgICAvLyAnZXhjaXRpbmchJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8sICdfZG9jJykgLy8gJ2dyZWF0ISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLnRpdGxlJywgbykgICAgICAgICAgIC8vIFsnZXhjaXRpbmchJywgJ251bWJlciBkb3MnXVxuICpcbiAqICAgICAvLyBzdW1tYXJ5XG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8pXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwpXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIG1hcClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbCwgbWFwKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIGVhY2ggaW5kaXZpZHVhbCBmb3VuZCB2YWx1ZS4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxuICovXG5cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIG8sIHNwZWNpYWwsIG1hcCkge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgLy8gcmVhZGluZyBhIHByb3BlcnR5IGZyb20gdGhlIGFycmF5IGl0ZW1zXG4gICAgICB2YXIgcGF0aHMgPSBwYXJ0cy5zbGljZShpKTtcblxuICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1cbiAgICAgICAgICA/IGV4cG9ydHMuZ2V0KHBhdGhzLCBpdGVtLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwKVxuICAgICAgICAgIDogbWFwKHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybiBtYXAob2JqKTtcbiAgfVxuXG4gIHJldHVybiBtYXAob2JqKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYHZhbGAgYXQgdGhlIGdpdmVuIGBwYXRoYCBvZiBvYmplY3QgYG9gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCBpcyBwYXNzZWQgZWFjaCBpbmRpdmlkdWFsIHZhbHVlIGJlZm9yZSBzZXR0aW5nIGl0LiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cblxuZXhwb3J0cy5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvLCBzcGVjaWFsLCBtYXAsIF9jb3B5aW5nKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIGlmIChudWxsID09IG8pIHJldHVybjtcblxuICAvLyB0aGUgZXhpc3RhbmNlIG9mICQgaW4gYSBwYXRoIHRlbGxzIHVzIGlmIHRoZSB1c2VyIGRlc2lyZXNcbiAgLy8gdGhlIGNvcHlpbmcgb2YgYW4gYXJyYXkgaW5zdGVhZCBvZiBzZXR0aW5nIGVhY2ggdmFsdWUgb2ZcbiAgLy8gdGhlIGFycmF5IHRvIHRoZSBvbmUgYnkgb25lIHRvIG1hdGNoaW5nIHBvc2l0aW9ucyBvZiB0aGVcbiAgLy8gY3VycmVudCBhcnJheS5cbiAgdmFyIGNvcHkgPSBfY29weWluZyB8fCAvXFwkLy50ZXN0KHBhdGgpXG4gICAgLCBvYmogPSBvXG4gICAgLCBwYXJ0O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXJ0cy5sZW5ndGggLSAxOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoJyQnID09PSBwYXJ0KSB7XG4gICAgICBpZiAoaSA9PSBsZW4gLSAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG4gICAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aCAmJiBqIDwgdmFsLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBzaW5nbGUgdmFsdWVzIG9mIGFycmF5XG4gICAgICAgICAgZXhwb3J0cy5zZXQocGF0aHMsIHZhbFtqXSwgb2JqW2pdLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwLCBjb3B5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBhc3NpZ25tZW50IG9mIGVudGlyZSB2YWx1ZVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWwsIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybjtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgdGhlIGxhc3QgcHJvcGVydHkgb2YgdGhlIHBhdGhcblxuICBwYXJ0ID0gcGFydHNbbGVuXTtcblxuICAvLyB1c2UgdGhlIHNwZWNpYWwgcHJvcGVydHkgaWYgZXhpc3RzXG4gIGlmIChzcGVjaWFsICYmIG9ialtzcGVjaWFsXSkge1xuICAgIG9iaiA9IG9ialtzcGVjaWFsXTtcbiAgfVxuXG4gIC8vIHNldCB0aGUgdmFsdWUgb24gdGhlIGxhc3QgYnJhbmNoXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBmb3IgKHZhciBpdGVtLCBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICBpdGVtID0gb2JqW2pdO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGlmIChsb29rdXApIHtcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsW2pdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpdGVtW3NwZWNpYWxdKSBpdGVtID0gaXRlbVtzcGVjaWFsXTtcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsW2pdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChsb29rdXApIHtcbiAgICAgIGxvb2t1cChvYmosIHBhcnQsIG1hcCh2YWwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIFJldHVybnMgdGhlIHZhbHVlIHBhc3NlZCB0byBpdC5cbiAqL1xuXG5mdW5jdGlvbiBLICh2KSB7XG4gIHJldHVybiB2O1xufSIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG4gICwgVmlydHVhbFR5cGUgPSByZXF1aXJlKCcuL3ZpcnR1YWx0eXBlJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIFR5cGVzXG4gICwgc2NoZW1hcztcblxuLyoqXG4gKiBTY2hlbWEgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBjaGlsZCA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSk7XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcsIGFnZTogTnVtYmVyLCBjaGlsZHJlbjogW2NoaWxkXSB9KTtcbiAqICAgICB2YXIgVHJlZSA9IG1vbmdvb3NlLm1vZGVsKCdUcmVlJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgLy8gc2V0dGluZyBzY2hlbWEgb3B0aW9uc1xuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBfaWQ6IGZhbHNlLCBhdXRvSW5kZXg6IGZhbHNlIH0pXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBbY29sbGVjdGlvbl0oL2RvY3MvZ3VpZGUuaHRtbCNjb2xsZWN0aW9uKTogc3RyaW5nIC0gbm8gZGVmYXVsdFxuICogLSBbaWRdKC9kb2NzL2d1aWRlLmh0bWwjaWQpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBgbWluaW1pemVgOiBib29sIC0gY29udHJvbHMgW2RvY3VtZW50I3RvT2JqZWN0XSgjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3QpIGJlaGF2aW9yIHdoZW4gY2FsbGVkIG1hbnVhbGx5IC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbc3RyaWN0XSgvZG9jcy9ndWlkZS5odG1sI3N0cmljdCk6IGJvb2wgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIFt0b0pTT05dKC9kb2NzL2d1aWRlLmh0bWwjdG9KU09OKSAtIG9iamVjdCAtIG5vIGRlZmF1bHRcbiAqIC0gW3RvT2JqZWN0XSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSAtIG9iamVjdCAtIG5vIGRlZmF1bHRcbiAqIC0gW3ZlcnNpb25LZXldKC9kb2NzL2d1aWRlLmh0bWwjdmVyc2lvbktleSk6IGJvb2wgLSBkZWZhdWx0cyB0byBcIl9fdlwiXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX1doZW4gbmVzdGluZyBzY2hlbWFzLCAoYGNoaWxkcmVuYCBpbiB0aGUgZXhhbXBsZSBhYm92ZSksIGFsd2F5cyBkZWNsYXJlIHRoZSBjaGlsZCBzY2hlbWEgZmlyc3QgYmVmb3JlIHBhc3NpbmcgaXQgaW50byBpcyBwYXJlbnQuX1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfHVuZGVmaW5lZH0gW25hbWVdINCd0LDQt9Cy0LDQvdC40LUg0YHRhdC10LzRi1xuICogQHBhcmFtIHtTY2hlbWF9IFtiYXNlU2NoZW1hXSDQkdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwINC/0YDQuCDQvdCw0YHQu9C10LTQvtCy0LDQvdC40LhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmog0KHRhdC10LzQsFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gU2NoZW1hICggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICkge1xuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIFNjaGVtYSkgKSB7XG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgLy8g0JXRgdC70Lgg0Y3RgtC+INC40LzQtdC90L7QstCw0L3QsNGPINGB0YXQtdC80LBcbiAgaWYgKCB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgKXtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHNjaGVtYXNbIG5hbWUgXSA9IHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSBuYW1lO1xuICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoICEoYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkgKXtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXG4gIHRoaXMuc291cmNlID0gb2JqO1xuXG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdWJwYXRocyA9IHt9O1xuICB0aGlzLnZpcnR1YWxzID0ge307XG4gIHRoaXMubmVzdGVkID0ge307XG4gIHRoaXMuaW5oZXJpdHMgPSB7fTtcbiAgdGhpcy5jYWxsUXVldWUgPSBbXTtcbiAgdGhpcy5tZXRob2RzID0ge307XG4gIHRoaXMuc3RhdGljcyA9IHt9O1xuICB0aGlzLnRyZWUgPSB7fTtcbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHVuZGVmaW5lZDtcblxuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmRlZmF1bHRPcHRpb25zKCBvcHRpb25zICk7XG5cbiAgaWYgKCBiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICl7XG4gICAgYmFzZVNjaGVtYS5kaXNjcmltaW5hdG9yKCBuYW1lLCB0aGlzICk7XG4gIH1cblxuICAvLyBidWlsZCBwYXRoc1xuICBpZiAoIG9iaiApIHtcbiAgICB0aGlzLmFkZCggb2JqICk7XG4gIH1cblxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyBnZXQgYW4gYXV0byBfaWQgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvX2lkID0gIXRoaXMucGF0aHNbJ19pZCddICYmICghdGhpcy5vcHRpb25zLm5vSWQgJiYgdGhpcy5vcHRpb25zLl9pZCk7XG4gIGlmIChhdXRvX2lkKSB7XG4gICAgdGhpcy5hZGQoeyBfaWQ6IHt0eXBlOiBTY2hlbWEuT2JqZWN0SWQsIGF1dG86IHRydWV9IH0pO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgcmVjZWl2ZSBhbiBpZCBnZXR0ZXIgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvaWQgPSAhdGhpcy5wYXRoc1snaWQnXSAmJiB0aGlzLm9wdGlvbnMuaWQ7XG4gIGlmICggYXV0b2lkICkge1xuICAgIHRoaXMudmlydHVhbCgnaWQnKS5nZXQoIGlkR2V0dGVyICk7XG4gIH1cbn1cblxuLyohXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIF9pZCBjYXN0IHRvIGEgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBpZEdldHRlciAoKSB7XG4gIGlmICh0aGlzLiRfXy5faWQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18uX2lkO1xuICB9XG5cbiAgdGhpcy4kX18uX2lkID0gbnVsbCA9PSB0aGlzLl9pZFxuICAgID8gbnVsbFxuICAgIDogU3RyaW5nKHRoaXMuX2lkKTtcblxuICByZXR1cm4gdGhpcy4kX18uX2lkO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XG5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NoZW1hO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBmbGF0IHBhdGhzXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgICAgOiBTY2hlbWFUeXBlLFxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSBwYXRoc1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBhIHRyZWVcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICA6IE9iamVjdElkXG4gKiAgICAgICAsICduZXN0ZWQnICA6IHtcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgdHJlZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnRyZWU7XG5cbi8qKlxuICogUmV0dXJucyBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoaXMgc2NoZW1hLCBtZXJnZWQgd2l0aCBgb3B0aW9uc2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLmRlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9ICQuZXh0ZW5kKHtcbiAgICAgIHN0cmljdDogdHJ1ZVxuICAgICwgdmVyc2lvbktleTogJ19fdidcbiAgICAsIGRpc2NyaW1pbmF0b3JLZXk6ICdfX3QnXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIG9ubHkgYXBwbGllZCBhdCBjb25zdHJ1Y3Rpb24gdGltZVxuICAgICwgX2lkOiB0cnVlXG4gICAgLCBpZDogdHJ1ZVxuICB9LCBvcHRpb25zICk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZHMga2V5IHBhdGggLyBzY2hlbWEgdHlwZSBwYWlycyB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIFRveVNjaGVtYSA9IG5ldyBTY2hlbWE7XG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKG51bGwgPT0gb2JqWyBrZXkgXSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB2YWx1ZSBmb3Igc2NoZW1hIHBhdGggYCcrIHByZWZpeCArIGtleSArJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdChvYmpba2V5XSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICYmICggIW9ialsga2V5IF0udHlwZSB8fCBvYmpbIGtleSBdLnR5cGUudHlwZSApICl7XG5cbiAgICAgIGlmICggT2JqZWN0LmtleXMob2JqWyBrZXkgXSkubGVuZ3RoICkge1xuICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0IHsgbGFzdDogeyBuYW1lOiBTdHJpbmcgfX1cbiAgICAgICAgdGhpcy5uZXN0ZWRbIHByZWZpeCArIGtleSBdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hZGQoIG9ialsga2V5IF0sIHByZWZpeCArIGtleSArICcuJyk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7IC8vIG1peGVkIHR5cGVcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBSZXNlcnZlZCBkb2N1bWVudCBrZXlzLlxuICpcbiAqIEtleXMgaW4gdGhpcyBvYmplY3QgYXJlIG5hbWVzIHRoYXQgYXJlIHJlamVjdGVkIGluIHNjaGVtYSBkZWNsYXJhdGlvbnMgYi9jIHRoZXkgY29uZmxpY3Qgd2l0aCBtb25nb29zZSBmdW5jdGlvbmFsaXR5LiBVc2luZyB0aGVzZSBrZXkgbmFtZSB3aWxsIHRocm93IGFuIGVycm9yLlxuICpcbiAqICAgICAgb24sIGVtaXQsIF9ldmVudHMsIGRiLCBnZXQsIHNldCwgaW5pdCwgaXNOZXcsIGVycm9ycywgc2NoZW1hLCBvcHRpb25zLCBtb2RlbE5hbWUsIGNvbGxlY3Rpb24sIF9wcmVzLCBfcG9zdHMsIHRvT2JqZWN0XG4gKlxuICogX05PVEU6XyBVc2Ugb2YgdGhlc2UgdGVybXMgYXMgbWV0aG9kIG5hbWVzIGlzIHBlcm1pdHRlZCwgYnV0IHBsYXkgYXQgeW91ciBvd24gcmlzaywgYXMgdGhleSBtYXkgYmUgZXhpc3RpbmcgbW9uZ29vc2UgZG9jdW1lbnQgbWV0aG9kcyB5b3UgYXJlIHN0b21waW5nIG9uLlxuICpcbiAqICAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgICBzY2hlbWEubWV0aG9kcy5pbml0ID0gZnVuY3Rpb24gKCkge30gLy8gcG90ZW50aWFsbHkgYnJlYWtpbmdcbiAqL1xuU2NoZW1hLnJlc2VydmVkID0gT2JqZWN0LmNyZWF0ZSggbnVsbCApO1xudmFyIHJlc2VydmVkID0gU2NoZW1hLnJlc2VydmVkO1xucmVzZXJ2ZWQub24gPVxucmVzZXJ2ZWQuZGIgPVxucmVzZXJ2ZWQuZ2V0ID1cbnJlc2VydmVkLnNldCA9XG5yZXNlcnZlZC5pbml0ID1cbnJlc2VydmVkLmlzTmV3ID1cbnJlc2VydmVkLmVycm9ycyA9XG5yZXNlcnZlZC5zY2hlbWEgPVxucmVzZXJ2ZWQub3B0aW9ucyA9XG5yZXNlcnZlZC5tb2RlbE5hbWUgPVxucmVzZXJ2ZWQuY29sbGVjdGlvbiA9XG5yZXNlcnZlZC50b09iamVjdCA9XG5yZXNlcnZlZC5kb21haW4gPVxucmVzZXJ2ZWQuZW1pdCA9ICAgIC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX2V2ZW50cyA9IC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX3ByZXMgPSByZXNlcnZlZC5fcG9zdHMgPSAxOyAvLyBob29rcy5qc1xuXG4vKipcbiAqIEdldHMvc2V0cyBzY2hlbWEgcGF0aHMuXG4gKlxuICogU2V0cyBhIHBhdGggKGlmIGFyaXR5IDIpXG4gKiBHZXRzIGEgcGF0aCAoaWYgYXJpdHkgMSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpIC8vIHJldHVybnMgYSBTY2hlbWFUeXBlXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnLCBOdW1iZXIpIC8vIGNoYW5nZXMgdGhlIHNjaGVtYVR5cGUgb2YgYG5hbWVgIHRvIE51bWJlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgaWYgKG9iaiA9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodGhpcy5wYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMucGF0aHNbcGF0aF07XG4gICAgaWYgKHRoaXMuc3VicGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnN1YnBhdGhzW3BhdGhdO1xuXG4gICAgLy8gc3VicGF0aHM/XG4gICAgcmV0dXJuIC9cXC5cXGQrXFwuPy4qJC8udGVzdChwYXRoKVxuICAgICAgPyBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBzb21lIHBhdGggbmFtZXMgY29uZmxpY3Qgd2l0aCBkb2N1bWVudCBtZXRob2RzXG4gIGlmIChyZXNlcnZlZFtwYXRoXSkge1xuICAgIHRocm93IG5ldyBFcnJvcignYCcgKyBwYXRoICsgJ2AgbWF5IG5vdCBiZSB1c2VkIGFzIGEgc2NoZW1hIHBhdGhuYW1lJyk7XG4gIH1cblxuICAvLyB1cGRhdGUgdGhlIHRyZWVcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuLylcbiAgICAsIGxhc3QgPSBzdWJwYXRocy5wb3AoKVxuICAgICwgYnJhbmNoID0gdGhpcy50cmVlO1xuXG4gIHN1YnBhdGhzLmZvckVhY2goZnVuY3Rpb24oc3ViLCBpKSB7XG4gICAgaWYgKCFicmFuY2hbc3ViXSkgYnJhbmNoW3N1Yl0gPSB7fTtcbiAgICBpZiAoJ29iamVjdCcgIT09IHR5cGVvZiBicmFuY2hbc3ViXSkge1xuICAgICAgdmFyIG1zZyA9ICdDYW5ub3Qgc2V0IG5lc3RlZCBwYXRoIGAnICsgcGF0aCArICdgLiAnXG4gICAgICAgICAgICAgICsgJ1BhcmVudCBwYXRoIGAnXG4gICAgICAgICAgICAgICsgc3VicGF0aHMuc2xpY2UoMCwgaSkuY29uY2F0KFtzdWJdKS5qb2luKCcuJylcbiAgICAgICAgICAgICAgKyAnYCBhbHJlYWR5IHNldCB0byB0eXBlICcgKyBicmFuY2hbc3ViXS5uYW1lXG4gICAgICAgICAgICAgICsgJy4nO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaFtzdWJdO1xuICB9KTtcblxuICBicmFuY2hbbGFzdF0gPSB1dGlscy5jbG9uZShvYmopO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIG9iaik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0eXBlIGFyZ3VtZW50cyBpbnRvIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5pbnRlcnByZXRBc1R5cGUgPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIHZhciBjb25zdHJ1Y3Rvck5hbWUgPSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqLmNvbnN0cnVjdG9yKTtcbiAgaWYgKGNvbnN0cnVjdG9yTmFtZSAhPT0gJ09iamVjdCcpe1xuICAgIG9iaiA9IHsgdHlwZTogb2JqIH07XG4gIH1cblxuICAvLyBHZXQgdGhlIHR5cGUgbWFraW5nIHN1cmUgdG8gYWxsb3cga2V5cyBuYW1lZCBcInR5cGVcIlxuICAvLyBhbmQgZGVmYXVsdCB0byBtaXhlZCBpZiBub3Qgc3BlY2lmaWVkLlxuICAvLyB7IHR5cGU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnZnJlc2hjdXQnIH0gfVxuICB2YXIgdHlwZSA9IG9iai50eXBlICYmICFvYmoudHlwZS50eXBlXG4gICAgPyBvYmoudHlwZVxuICAgIDoge307XG5cbiAgaWYgKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZS5jb25zdHJ1Y3RvcikgfHwgJ21peGVkJyA9PSB0eXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcbiAgICAvLyBpZiBpdCB3YXMgc3BlY2lmaWVkIHRocm91Z2ggeyB0eXBlIH0gbG9vayBmb3IgYGNhc3RgXG4gICAgdmFyIGNhc3QgPSAoQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpXG4gICAgICA/IG9iai5jYXN0XG4gICAgICA6IHR5cGVbMF07XG5cbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIGNhc3QsIG9iaik7XG4gICAgfVxuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBjYXN0KSB7XG4gICAgICBjYXN0ID0gVHlwZXNbY2FzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhc3Quc3Vic3RyaW5nKDEpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoY2FzdC5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMoY2FzdCkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgbmV3IFNjaGVtYShjYXN0KSwgb2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFR5cGVzLkFycmF5KHBhdGgsIGNhc3QgfHwgVHlwZXMuTWl4ZWQsIG9iaik7XG4gIH1cblxuICB2YXIgbmFtZSA9ICdzdHJpbmcnID09PSB0eXBlb2YgdHlwZVxuICAgID8gdHlwZVxuICAgIC8vIElmIG5vdCBzdHJpbmcsIGB0eXBlYCBpcyBhIGZ1bmN0aW9uLiBPdXRzaWRlIG9mIElFLCBmdW5jdGlvbi5uYW1lXG4gICAgLy8gZ2l2ZXMgeW91IHRoZSBmdW5jdGlvbiBuYW1lLiBJbiBJRSwgeW91IG5lZWQgdG8gY29tcHV0ZSBpdFxuICAgIDogdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUpO1xuXG4gIGlmIChuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT0gVHlwZXNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmRlZmluZWQgdHlwZSBhdCBgJyArIHBhdGggK1xuICAgICAgICAnYFxcbiAgRGlkIHlvdSB0cnkgbmVzdGluZyBTY2hlbWFzPyAnICtcbiAgICAgICAgJ1lvdSBjYW4gb25seSBuZXN0IHVzaW5nIHJlZnMgb3IgYXJyYXlzLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUeXBlc1tuYW1lXShwYXRoLCBvYmopO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aGUgc2NoZW1hcyBwYXRocyBzaW1pbGFyIHRvIEFycmF5I2ZvckVhY2guXG4gKlxuICogVGhlIGNhbGxiYWNrIGlzIHBhc3NlZCB0aGUgcGF0aG5hbWUgYW5kIHNjaGVtYVR5cGUgYXMgYXJndW1lbnRzIG9uIGVhY2ggaXRlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtTY2hlbWF9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZWFjaFBhdGggPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGZuKGtleXNbaV0sIHRoaXMucGF0aHNba2V5c1tpXV0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gQXJyYXkgb2YgcGF0aCBzdHJpbmdzIHRoYXQgYXJlIHJlcXVpcmVkIGJ5IHRoaXMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5yZXF1aXJlZFBhdGhzID0gZnVuY3Rpb24gcmVxdWlyZWRQYXRocyAoKSB7XG4gIGlmICh0aGlzLl9yZXF1aXJlZHBhdGhzKSByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcmV0ID0gW107XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHZhciBwYXRoID0gcGF0aHNbaV07XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0uaXNSZXF1aXJlZCkgcmV0LnB1c2gocGF0aCk7XG4gIH1cblxuICB0aGlzLl9yZXF1aXJlZHBhdGhzID0gcmV0O1xuXG4gIHJldHVybiB0aGlzLl9yZXF1aXJlZHBhdGhzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwYXRoVHlwZSBvZiBgcGF0aGAgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEdpdmVuIGEgcGF0aCwgcmV0dXJucyB3aGV0aGVyIGl0IGlzIGEgcmVhbCwgdmlydHVhbCwgbmVzdGVkLCBvciBhZC1ob2MvdW5kZWZpbmVkIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aFR5cGUgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aCBpbiB0aGlzLnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLnZpcnR1YWxzKSByZXR1cm4gJ3ZpcnR1YWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLm5lc3RlZCkgcmV0dXJuICduZXN0ZWQnO1xuICBpZiAocGF0aCBpbiB0aGlzLnN1YnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuXG4gIGlmICgvXFwuXFxkK1xcLnxcXC5cXGQrJC8udGVzdChwYXRoKSAmJiBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKSkge1xuICAgIHJldHVybiAncmVhbCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdhZGhvY09yVW5kZWZpbmVkJztcbiAgfVxufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZ2V0UG9zaXRpb25hbFBhdGggKHNlbGYsIHBhdGgpIHtcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuKFxcZCspXFwufFxcLihcXGQrKSQvKS5maWx0ZXIoQm9vbGVhbik7XG4gIGlmIChzdWJwYXRocy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHNlbGYucGF0aHNbc3VicGF0aHNbMF1dO1xuICB9XG5cbiAgdmFyIHZhbCA9IHNlbGYucGF0aChzdWJwYXRoc1swXSk7XG4gIGlmICghdmFsKSByZXR1cm4gdmFsO1xuXG4gIHZhciBsYXN0ID0gc3VicGF0aHMubGVuZ3RoIC0gMVxuICAgICwgc3VicGF0aFxuICAgICwgaSA9IDE7XG5cbiAgZm9yICg7IGkgPCBzdWJwYXRocy5sZW5ndGg7ICsraSkge1xuICAgIHN1YnBhdGggPSBzdWJwYXRoc1tpXTtcblxuICAgIGlmIChpID09PSBsYXN0ICYmIHZhbCAmJiAhdmFsLnNjaGVtYSAmJiAhL1xcRC8udGVzdChzdWJwYXRoKSkge1xuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFR5cGVzLkFycmF5KSB7XG4gICAgICAgIC8vIFN0cmluZ1NjaGVtYSwgTnVtYmVyU2NoZW1hLCBldGNcbiAgICAgICAgdmFsID0gdmFsLmNhc3RlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBpZiBpdHMganVzdCBhIHBvc2l0aW9uIHNlZ21lbnQ6IHBhdGguMC5zdWJwYXRoXG4gICAgaWYgKCEvXFxELy50ZXN0KHN1YnBhdGgpKSBjb250aW51ZTtcblxuICAgIGlmICghKHZhbCAmJiB2YWwuc2NoZW1hKSkge1xuICAgICAgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFsID0gdmFsLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICB9XG5cbiAgc2VsZi5zdWJwYXRoc1sgcGF0aCBdID0gdmFsO1xuXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzWyBwYXRoIF07XG59XG5cbi8qKlxuICogQWRkcyBhIG1ldGhvZCBjYWxsIHRvIHRoZSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBkb2N1bWVudCBtZXRob2QgdG8gY2FsbCBsYXRlclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xuICB0aGlzLmNhbGxRdWV1ZS5wdXNoKFtuYW1lLCBhcmdzXSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcHJlIGhvb2sgZm9yIHRoZSBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgdG95U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3NhdmUnLCBmdW5jdGlvbiAobmV4dCkge1xuICogICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuY3JlYXRlZCA9IG5ldyBEYXRlO1xuICogICAgICAgbmV4dCgpO1xuICogICAgIH0pXG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3ZhbGlkYXRlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICh0aGlzLm5hbWUgIT0gJ1dvb2R5JykgdGhpcy5uYW1lID0gJ1dvb2R5JztcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ3ByZScsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBwb3N0IGZvciB0aGUgZG9jdW1lbnRcbiAqXG4gKiBQb3N0IGhvb2tzIGZpcmUgYG9uYCB0aGUgZXZlbnQgZW1pdHRlZCBmcm9tIGRvY3VtZW50IGluc3RhbmNlcyBvZiBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5wb3N0KCdzYXZlJywgZnVuY3Rpb24gKGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZWQgYWZ0ZXIgYSBkb2N1bWVudCB3YXMgc2F2ZWQnKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIE1vZGVsID0gbW9uZ29vc2UubW9kZWwoJ01vZGVsJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgdmFyIG0gPSBuZXcgTW9kZWwoLi4pO1xuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlcyBhZnRlciB0aGUgYHBvc3RgIGhvb2snKTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBob29rXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbihtZXRob2QsIGZuKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ29uJywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwbHVnaW4gY2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gKiBAc2VlIHBsdWdpbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGx1Z2luID0gZnVuY3Rpb24gKGZuLCBvcHRzKSB7XG4gIGZuKHRoaXMsIG9wdHMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBpbnN0YW5jZSBtZXRob2QgdG8gZG9jdW1lbnRzIGNvbnN0cnVjdGVkIGZyb20gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IGtpdHR5U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHNjaGVtYS5tZXRob2QoJ21lb3cnLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnbWVlZWVlb29vb29vb29vb29vdycpO1xuICogICAgIH0pXG4gKlxuICogICAgIHZhciBLaXR0eSA9IG1vbmdvb3NlLm1vZGVsKCdLaXR0eScsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBmaXp6ID0gbmV3IEtpdHR5O1xuICogICAgIGZpenoubWVvdygpOyAvLyBtZWVlZWVvb29vb29vb29vb29vd1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBtZXRob2RzLlxuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKHtcbiAqICAgICAgICAgcHVycjogZnVuY3Rpb24gKCkge31cbiAqICAgICAgICwgc2NyYXRjaDogZnVuY3Rpb24gKCkge31cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gbGF0ZXJcbiAqICAgICBmaXp6LnB1cnIoKTtcbiAqICAgICBmaXp6LnNjcmF0Y2goKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG1ldGhvZCBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBuYW1lKSB7XG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKSB7XG4gICAgICB0aGlzLm1ldGhvZHNbaV0gPSBuYW1lW2ldO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1ldGhvZHNbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHN0YXRpYyBcImNsYXNzXCIgbWV0aG9kcyB0byBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgc2NoZW1hLnN0YXRpYygnZmluZEJ5TmFtZScsIGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICogICAgICAgcmV0dXJuIHRoaXMuZmluZCh7IG5hbWU6IG5hbWUgfSwgY2FsbGJhY2spO1xuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgRHJpbmsgPSBtb25nb29zZS5tb2RlbCgnRHJpbmsnLCBzY2hlbWEpO1xuICogICAgIERyaW5rLmZpbmRCeU5hbWUoJ3NhbnBlbGxlZ3Jpbm8nLCBmdW5jdGlvbiAoZXJyLCBkcmlua3MpIHtcbiAqICAgICAgIC8vXG4gKiAgICAgfSk7XG4gKlxuICogSWYgYSBoYXNoIG9mIG5hbWUvZm4gcGFpcnMgaXMgcGFzc2VkIGFzIHRoZSBvbmx5IGFyZ3VtZW50LCBlYWNoIG5hbWUvZm4gcGFpciB3aWxsIGJlIGFkZGVkIGFzIHN0YXRpY3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnN0YXRpYyA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIG5hbWUpIHtcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpIHtcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuc3RhdGljc1tuYW1lXSA9IGZuO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMvZ2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gaWYgbm90IHBhc3NlZCwgdGhlIGN1cnJlbnQgb3B0aW9uIHZhbHVlIGlzIHJldHVybmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuICB9XG5cbiAgdGhpcy5vcHRpb25zW2tleV0gPSB2YWx1ZTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbCA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciB2aXJ0dWFscyA9IHRoaXMudmlydHVhbHM7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcblxuICB2aXJ0dWFsc1tuYW1lXSA9IHBhcnRzLnJlZHVjZShmdW5jdGlvbiAobWVtLCBwYXJ0LCBpKSB7XG4gICAgbWVtW3BhcnRdIHx8IChtZW1bcGFydF0gPSAoaSA9PT0gcGFydHMubGVuZ3RoLTEpXG4gICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxuICAgICAgOiB7fSk7XG4gICAgcmV0dXJuIG1lbVtwYXJ0XTtcbiAgfSwgdGhpcy50cmVlKTtcblxuICByZXR1cm4gdmlydHVhbHNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbHBhdGggPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gdGhpcy52aXJ0dWFsc1tuYW1lXTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHByb3BlcnR5IGRpc2NyaW1pbmF0b3JzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuZGlzY3JpbWluYXRvcnM7XG5cbi8qKlxuICog0J3QsNGB0LvQtdC00L7QstCw0L3QuNC1INC+0YIg0YHRhdC10LzRiy5cbiAqIHRoaXMgLSDQsdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwISEhXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAgdmFyIFBlcnNvblNjaGVtYSA9IG5ldyBTY2hlbWEoJ1BlcnNvbicsIHtcbiAqICAgICAgIG5hbWU6IFN0cmluZyxcbiAqICAgICAgIGNyZWF0ZWRBdDogRGF0ZVxuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgQm9zc1NjaGVtYSA9IG5ldyBTY2hlbWEoJ0Jvc3MnLCBQZXJzb25TY2hlbWEsIHsgZGVwYXJ0bWVudDogU3RyaW5nIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgZGlzY3JpbWluYXRvciBuYW1lXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIGRpc2NyaW1pbmF0b3Igc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmRpc2NyaW1pbmF0b3IgPSBmdW5jdGlvbiBkaXNjcmltaW5hdG9yIChuYW1lLCBzY2hlbWEpIHtcbiAgaWYgKCEoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcGFzcyBhIHZhbGlkIGRpc2NyaW1pbmF0b3IgU2NoZW1hJyk7XG4gIH1cblxuICBpZiAoIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgIXRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290ICkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGlzY3JpbWluYXRvciBcIicgKyBuYW1lICsgJ1wiIGNhbiBvbmx5IGJlIGEgZGlzY3JpbWluYXRvciBvZiB0aGUgcm9vdCBtb2RlbCcpO1xuICB9XG5cbiAgdmFyIGtleSA9IHRoaXMub3B0aW9ucy5kaXNjcmltaW5hdG9yS2V5O1xuICBpZiAoIHNjaGVtYS5wYXRoKGtleSkgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEaXNjcmltaW5hdG9yIFwiJyArIG5hbWUgKyAnXCIgY2Fubm90IGhhdmUgZmllbGQgd2l0aCBuYW1lIFwiJyArIGtleSArICdcIicpO1xuICB9XG5cbiAgLy8gbWVyZ2VzIGJhc2Ugc2NoZW1hIGludG8gbmV3IGRpc2NyaW1pbmF0b3Igc2NoZW1hIGFuZCBzZXRzIG5ldyB0eXBlIGZpZWxkLlxuICAoZnVuY3Rpb24gbWVyZ2VTY2hlbWFzKHNjaGVtYSwgYmFzZVNjaGVtYSkge1xuICAgIHV0aWxzLm1lcmdlKHNjaGVtYSwgYmFzZVNjaGVtYSk7XG5cbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW2tleV0gPSB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogbmFtZSB9O1xuICAgIHNjaGVtYS5hZGQob2JqKTtcbiAgICBzY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbmFtZSwgaXNSb290OiBmYWxzZSB9O1xuXG4gICAgaWYgKGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBzY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uID0gYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgICAvLyB0aHJvd3MgZXJyb3IgaWYgb3B0aW9ucyBhcmUgaW52YWxpZFxuICAgIChmdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbnMoYSwgYikge1xuICAgICAgYSA9IHV0aWxzLmNsb25lKGEpO1xuICAgICAgYiA9IHV0aWxzLmNsb25lKGIpO1xuICAgICAgZGVsZXRlIGEudG9KU09OO1xuICAgICAgZGVsZXRlIGEudG9PYmplY3Q7XG4gICAgICBkZWxldGUgYi50b0pTT047XG4gICAgICBkZWxldGUgYi50b09iamVjdDtcblxuICAgICAgaWYgKCF1dGlscy5kZWVwRXF1YWwoYSwgYikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpXCIpO1xuICAgICAgfVxuICAgIH0pKHNjaGVtYS5vcHRpb25zLCBiYXNlU2NoZW1hLm9wdGlvbnMpO1xuXG4gICAgdmFyIHRvSlNPTiA9IHNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgLCB0b09iamVjdCA9IHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuXG4gICAgc2NoZW1hLm9wdGlvbnMgPSB1dGlscy5jbG9uZShiYXNlU2NoZW1hLm9wdGlvbnMpO1xuICAgIGlmICh0b0pTT04pICAgc2NoZW1hLm9wdGlvbnMudG9KU09OID0gdG9KU09OO1xuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcblxuICAgIC8vc2NoZW1hLmNhbGxRdWV1ZSA9IGJhc2VTY2hlbWEuY2FsbFF1ZXVlLmNvbmNhdChzY2hlbWEuY2FsbFF1ZXVlKTtcbiAgICBzY2hlbWEuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7IC8vIHJlc2V0IGp1c3QgaW4gY2FzZSBTY2hlbWEjcmVxdWlyZWRQYXRocygpIHdhcyBjYWxsZWQgb24gZWl0aGVyIHNjaGVtYVxuICB9KShzY2hlbWEsIHRoaXMpO1xuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9ycykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvcnMgPSB7fTtcbiAgfVxuXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZykge1xuICAgIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbnVsbCwgaXNSb290OiB0cnVlIH07XG4gIH1cblxuICBpZiAodGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGlzY3JpbWluYXRvciB3aXRoIG5hbWUgXCInICsgbmFtZSArICdcIiBhbHJlYWR5IGV4aXN0cycpO1xuICB9XG5cbiAgdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSA9IHNjaGVtYTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hO1xud2luZG93LlNjaGVtYSA9IFNjaGVtYTtcblxuLy8gcmVxdWlyZSBkb3duIGhlcmUgYmVjYXVzZSBvZiByZWZlcmVuY2UgaXNzdWVzXG5cbi8qKlxuICogVGhlIHZhcmlvdXMgYnVpbHQtaW4gU3RvcmFnZSBTY2hlbWEgVHlwZXMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIE9iamVjdElkID0gbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk9iamVjdElkO1xuICpcbiAqICMjIyNUeXBlczpcbiAqXG4gKiAtIFtTdHJpbmddKCNzY2hlbWEtc3RyaW5nLWpzKVxuICogLSBbTnVtYmVyXSgjc2NoZW1hLW51bWJlci1qcylcbiAqIC0gW0Jvb2xlYW5dKCNzY2hlbWEtYm9vbGVhbi1qcykgfCBCb29sXG4gKiAtIFtBcnJheV0oI3NjaGVtYS1hcnJheS1qcylcbiAqIC0gW0RhdGVdKCNzY2hlbWEtZGF0ZS1qcylcbiAqIC0gW09iamVjdElkXSgjc2NoZW1hLW9iamVjdGlkLWpzKSB8IE9pZFxuICogLSBbTWl4ZWRdKCNzY2hlbWEtbWl4ZWQtanMpIHwgT2JqZWN0XG4gKlxuICogVXNpbmcgdGhpcyBleHBvc2VkIGFjY2VzcyB0byB0aGUgYE1peGVkYCBTY2hlbWFUeXBlLCB3ZSBjYW4gdXNlIHRoZW0gaW4gb3VyIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIE1peGVkID0gbW9uZ29vc2UuU2NoZW1hLlR5cGVzLk1peGVkO1xuICogICAgIG5ldyBtb25nb29zZS5TY2hlbWEoeyBfdXNlcjogTWl4ZWQgfSlcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuVHlwZXMgPSByZXF1aXJlKCcuL3NjaGVtYS9pbmRleCcpO1xuXG4vLyDQpdGA0LDQvdC40LvQuNGJ0LUg0YHRhdC10LxcblNjaGVtYS5zY2hlbWFzID0gc2NoZW1hcyA9IHt9O1xuXG5cbi8qIVxuICogaWdub3JlXG4gKi9cblxuVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5TY2hlbWEuT2JqZWN0SWQgPSBUeXBlcy5PYmplY3RJZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgVHlwZXMgPSB7XG4gICAgICAgIEJvb2xlYW46IHJlcXVpcmUoJy4vYm9vbGVhbicpXG4gICAgICAsIERhdGU6IHJlcXVpcmUoJy4vZGF0ZScpXG4gICAgICAsIE51bWJlcjogcmVxdWlyZSgnLi9udW1iZXInKVxuICAgICAgLCBTdHJpbmc6IHJlcXVpcmUoJy4vc3RyaW5nJylcbiAgICAgICwgT2JqZWN0SWQ6IHJlcXVpcmUoJy4vb2JqZWN0aWQnKVxuICAgICAgLCBCdWZmZXI6IHJlcXVpcmUoJy4vYnVmZmVyJylcbiAgICB9XG4gICwgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi4vdHlwZXMvYXJyYXknKVxuICAsIE1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG4gICwgRW1iZWRkZWREb2M7XG5cbi8qKlxuICogQXJyYXkgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gY2FzdFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gU2NoZW1hQXJyYXkgKGtleSwgY2FzdCwgb3B0aW9ucykge1xuICBpZiAoY2FzdCkge1xuICAgIHZhciBjYXN0T3B0aW9ucyA9IHt9O1xuXG4gICAgaWYgKCdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QuY29uc3RydWN0b3IgKSApIHtcbiAgICAgIGlmIChjYXN0LnR5cGUpIHtcbiAgICAgICAgLy8gc3VwcG9ydCB7IHR5cGU6IFdvb3QgfVxuICAgICAgICBjYXN0T3B0aW9ucyA9IF8uY2xvbmUoIGNhc3QgKTsgLy8gZG8gbm90IGFsdGVyIHVzZXIgYXJndW1lbnRzXG4gICAgICAgIGRlbGV0ZSBjYXN0T3B0aW9ucy50eXBlO1xuICAgICAgICBjYXN0ID0gY2FzdC50eXBlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FzdCA9IE1peGVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHN1cHBvcnQgeyB0eXBlOiAnU3RyaW5nJyB9XG4gICAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PT0gdHlwZW9mIGNhc3RcbiAgICAgID8gY2FzdFxuICAgICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QgKTtcblxuICAgIHZhciBDYXN0ZXIgPSBuYW1lIGluIFR5cGVzXG4gICAgICA/IFR5cGVzW25hbWVdXG4gICAgICA6IGNhc3Q7XG5cbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gQ2FzdGVyO1xuICAgIHRoaXMuY2FzdGVyID0gbmV3IENhc3RlcihudWxsLCBjYXN0T3B0aW9ucyk7XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBFbWJlZGRlZERvYyB8fCAoRW1iZWRkZWREb2MgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpKTtcblxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XG4gICAgICB0aGlzLmNhc3Rlci5wYXRoID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xuXG4gIHZhciBzZWxmID0gdGhpc1xuICAgICwgZGVmYXVsdEFyclxuICAgICwgZm47XG5cbiAgaWYgKHRoaXMuZGVmYXVsdFZhbHVlKSB7XG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuICAgIGZuID0gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRlZmF1bHRBcnI7XG4gIH1cblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4gPyBkZWZhdWx0QXJyKCkgOiBkZWZhdWx0QXJyIHx8IFtdO1xuICAgIHJldHVybiBuZXcgU3RvcmFnZUFycmF5KGFyciwgc2VsZi5wYXRoLCB0aGlzKTtcbiAgfSk7XG59XG5cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2hlbWFBcnJheTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLmxlbmd0aCk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyB0aGUgZ2V0dGVycyBhcHBsaWNhdGlvbiBmb3IgdGhlIHBvcHVsYXRpb24gc3BlY2lhbC1jYXNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICBpZiAodGhpcy5jYXN0ZXIub3B0aW9ucyAmJiB0aGlzLmNhc3Rlci5vcHRpb25zLnJlZikge1xuICAgIC8vIG1lYW5zIHRoZSBvYmplY3QgaWQgd2FzIHBvcHVsYXRlZFxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBTY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMuY2FsbCh0aGlzLCB2YWx1ZSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyB2YWx1ZXMgZm9yIHNldCgpLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGRvY3VtZW50IHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCB3aGV0aGVyIHRoaXMgaXMgYW4gaW5pdGlhbGl6YXRpb24gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSwgZG9jLCBpbml0ICkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VBcnJheSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhc3Rlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YWx1ZVtpXSA9IHRoaXMuY2FzdGVyLmNhc3QodmFsdWVbaV0sIGRvYywgaW5pdCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gcmV0aHJvd1xuICAgICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKGUudHlwZSwgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0KTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYUFycmF5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogQm9vbGVhbiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBwYXRoLCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9vbGVhblNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIoZnVuY3Rpb24gKEJ1ZmZlcil7XG4ndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgU3RvcmFnZUJ1ZmZlciA9IHJlcXVpcmUoJy4uL3R5cGVzJykuQnVmZmVyXG4gICwgQmluYXJ5ID0gU3RvcmFnZUJ1ZmZlci5CaW5hcnlcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBCdWZmZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gY2FzdFxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFNjaGVtYUJ1ZmZlciAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdCdWZmZXInKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblNjaGVtYUJ1ZmZlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuU2NoZW1hQnVmZmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUJ1ZmZlcjtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNjaGVtYUJ1ZmZlci5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5sZW5ndGgpO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TY2hlbWFCdWZmZXIucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUsIGRvYywgaW5pdCkge1xuICB2YXIgcmV0O1xuXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCBpbml0KSkge1xuICAgIC8vIHdhaXQhIHdlIG1heSBuZWVkIHRvIGNhc3QgdGhpcyB0byBhIGRvY3VtZW50XG5cbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIGxhenkgbG9hZFxuICAgIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vLi4vZG9jdW1lbnQnKSk7XG5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgdmFsdWUuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gc2V0dGluZyBhIHBvcHVsYXRlZCBwYXRoXG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCFfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignYnVmZmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHVzZXIgZGlyZWN0bHkgc2V0cyBhIHBvcHVsYXRlZFxuICAgIC8vIHBhdGggdG8gYSBwbGFpbiBvYmplY3Q7IGNhc3QgdG8gdGhlIE1vZGVsIHVzZWQgaW5cbiAgICAvLyB0aGUgcG9wdWxhdGlvbiBxdWVyeS5cbiAgICB2YXIgcGF0aCA9IGRvYy4kX19mdWxsUGF0aCh0aGlzLnBhdGgpO1xuICAgIHZhciBvd25lciA9IGRvYy5vd25lckRvY3VtZW50ID8gZG9jLm93bmVyRG9jdW1lbnQoKSA6IGRvYztcbiAgICB2YXIgcG9wID0gb3duZXIucG9wdWxhdGVkKHBhdGgsIHRydWUpO1xuICAgIHJldCA9IG5ldyBwb3Aub3B0aW9ucy5tb2RlbCh2YWx1ZSk7XG4gICAgcmV0LiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBkb2N1bWVudHNcbiAgaWYgKHZhbHVlICYmIHZhbHVlLl9pZCkge1xuICAgIHZhbHVlID0gdmFsdWUuX2lkO1xuICB9XG5cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWx1ZSkpIHtcbiAgICBpZiAoIXZhbHVlIHx8ICF2YWx1ZS5pc1N0b3JhZ2VCdWZmZXIpIHtcbiAgICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VCdWZmZXIodmFsdWUsIFt0aGlzLnBhdGgsIGRvY10pO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEJpbmFyeSkge1xuICAgIHJldCA9IG5ldyBTdG9yYWdlQnVmZmVyKHZhbHVlLnZhbHVlKHRydWUpLCBbdGhpcy5wYXRoLCBkb2NdKTtcbiAgICByZXQuc3VidHlwZSh2YWx1ZS5zdWJfdHlwZSk7XG4gICAgLy8gZG8gbm90IG92ZXJyaWRlIEJpbmFyeSBzdWJ0eXBlcy4gdXNlcnMgc2V0IHRoaXNcbiAgICAvLyB0byB3aGF0ZXZlciB0aGV5IHdhbnQuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGlmIChudWxsID09PSB2YWx1ZSkgcmV0dXJuIHZhbHVlO1xuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICBpZiAoJ3N0cmluZycgPT09IHR5cGUgfHwgJ251bWJlcicgPT09IHR5cGUgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXQgPSBuZXcgU3RvcmFnZUJ1ZmZlcih2YWx1ZSwgW3RoaXMucGF0aCwgZG9jXSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ2J1ZmZlcicsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYUJ1ZmZlcjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xudmFyIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yO1xuXG4vKipcbiAqIERhdGUgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIERhdGVTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkRhdGVTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGF0ZVNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIGRhdGVcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBEYXRlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBkYXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgZGF0ZTtcblxuICAvLyBzdXBwb3J0IGZvciB0aW1lc3RhbXBzXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSkge1xuXG4gICAgZGF0ZSA9IG5ldyBEYXRlKE51bWJlcih2YWx1ZSkpO1xuXG4gIC8vIHN1cHBvcnQgZm9yIGRhdGUgc3RyaW5nc1xuICB9IGVsc2UgaWYgKHZhbHVlLnRvU3RyaW5nKSB7XG4gICAgZGF0ZSA9IG5ldyBEYXRlKHZhbHVlLnRvU3RyaW5nKCkpO1xuICB9XG5cbiAgaWYgKGRhdGUudG9TdHJpbmcoKSAhPSAnSW52YWxpZCBEYXRlJykge1xuICAgIHJldHVybiBkYXRlO1xuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignZGF0ZScsIHZhbHVlLCB0aGlzLnBhdGggKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlU2NoZW1hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBBcnJheVR5cGUgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBTdG9yYWdlRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2RvY3VtZW50YXJyYXknKVxuICAsIFN1YmRvY3VtZW50ID0gcmVxdWlyZSgnLi4vdHlwZXMvZW1iZWRkZWQnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKVxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaiBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbal0gPSBzY2hlbWEuc3RhdGljc1tqXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50QXJyYXk7XG5cbi8qKlxuICogUGVyZm9ybXMgbG9jYWwgdmFsaWRhdGlvbnMgZmlyc3QsIHRoZW4gdmFsaWRhdGlvbnMgb24gZWFjaCBlbWJlZGRlZCBkb2NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgZm4sIHNjb3BlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBTY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlLmNhbGwodGhpcywgYXJyYXksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcblxuICAgIHZhciBjb3VudCA9IGFycmF5ICYmIGFycmF5Lmxlbmd0aFxuICAgICAgLCBlcnJvcjtcblxuICAgIGlmICghY291bnQpIHJldHVybiBmbigpO1xuXG4gICAgLy8gaGFuZGxlIHNwYXJzZSBhcnJheXMsIGRvIG5vdCB1c2UgYXJyYXkuZm9yRWFjaCB3aGljaCBkb2VzIG5vdFxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzcGFyc2UgZWxlbWVudHMgeWV0IHJlcG9ydHMgYXJyYXkubGVuZ3RoIGluY2x1ZGluZ1xuICAgIC8vIHRoZW0gOihcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgIShmdW5jdGlvbiAoaSkge1xuICAgICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XG4gICAgICAgICAgICAvLyByZXdyaXRlIHRoZSBrZXlcbiAgICAgICAgICAgIGVyci5rZXkgPSBzZWxmLmtleSArICcuJyArIGkgKyAnLicgKyBlcnIua2V5O1xuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKGkpO1xuICAgIH1cbiAgfSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyBjb250ZW50c1xuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyB0aGF0IHRyaWdnZXJzIHRoZSBjYXN0aW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXQgZmxhZ1xuICogQHBhcmFtIHtEb2N1bWVudEFycmF5fSBwcmV2XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZG9jLCBpbml0LCBwcmV2KSB7XG4gIHZhciBzZWxlY3RlZFxuICAgICwgc3ViZG9jXG4gICAgLCBpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCwgcHJldik7XG4gIH1cblxuICAvLyDQldGB0LvQuCDQtNCy0LAg0LzQsNGB0YHQuNCy0LAg0L/RgNC40LzQtdGA0L3QviDQvtC00LjQvdCw0LrQvtCy0YvQtSAtINC90LUg0L3QsNC00L4g0L/QtdGA0LXQt9Cw0L/QuNGB0YvQstCw0YLRjFxuICBpZiAoIHByZXYgJiYgYXBwcm94aW1hdGVseUVxdWFsKCB2YWx1ZSwgcHJldiApICl7XG4gICAgcmV0dXJuIHByZXY7XG4gIH1cblxuICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VEb2N1bWVudEFycmF5KSkge1xuICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgaWYgKHByZXYgJiYgcHJldi5faGFuZGxlcnMpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgICBkb2Mub2ZmKGtleSwgcHJldi5faGFuZGxlcnNba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaSA9IHZhbHVlLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKCEodmFsdWVbaV0gaW5zdGFuY2VvZiBTdWJkb2N1bWVudCkgJiYgdmFsdWVbaV0pIHtcbiAgICAgIGlmIChpbml0KSB7XG4gICAgICAgIHNlbGVjdGVkIHx8IChzZWxlY3RlZCA9IHNjb3BlUGF0aHModGhpcywgZG9jLiRfXy5zZWxlY3RlZCwgaW5pdCkpO1xuICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3RvcihudWxsLCB2YWx1ZSwgdHJ1ZSwgc2VsZWN0ZWQpO1xuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYy5pbml0KHZhbHVlW2ldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3ViZG9jID0gcHJldi5pZCh2YWx1ZVtpXS5faWQpO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICAgICAgaWYgKHByZXYgJiYgc3ViZG9jKSB7XG4gICAgICAgICAgLy8gaGFuZGxlIHJlc2V0dGluZyBkb2Mgd2l0aCBleGlzdGluZyBpZCBidXQgZGlmZmVyaW5nIGRhdGFcbiAgICAgICAgICAvLyBkb2MuYXJyYXkgPSBbeyBkb2M6ICd2YWwnIH1dXG4gICAgICAgICAgc3ViZG9jLnNldCh2YWx1ZVtpXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3ViZG9jID0gbmV3IHRoaXMuY2FzdGVyQ29uc3RydWN0b3IodmFsdWVbaV0sIHZhbHVlKTtcblxuICAgICAgICAgIHJlc3RvcmVQb3B1bGF0ZWRGaWVsZHMoIHN1YmRvYywgdGhpcy5zY2hlbWEudHJlZSwgdmFsdWVbaV0sIHByZXYgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHNldCgpIGlzIGhvb2tlZCBpdCB3aWxsIGhhdmUgbm8gcmV0dXJuIHZhbHVlXG4gICAgICAgIC8vIHNlZSBnaC03NDZcbiAgICAgICAgdmFsdWVbaV0gPSBzdWJkb2M7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyohXG4gKiDQn9GA0LjQsdC70LjQt9C40YLQtdC70YzQvdC+0LUg0YHRgNCw0LLQvdC10L3QuNC1INC00LLRg9GFINC80LDRgdGB0LjQstC+0LJcbiAqXG4gKiDQrdGC0L4g0L3Rg9C20L3QviDQtNC70Y8gcG9wdWxhdGVkINC/0L7Qu9C10LkgLSDQuNGFINC80Ysg0L/RgNC10L7QsdGA0LDQt9C+0LLRi9Cy0LDQtdC8INCyIGlkLlxuICog0KLQsNC6INC20LUg0LIg0YHRgNCw0LLQvdC10L3QuNC4INC90LUg0YPRh9Cw0YHRgtCy0YPQtdGCIGlkINGB0YPRidC10YHRgtCy0YPRjtGJ0LjRhSBFbWJlZGRlZCDQtNC+0LrRg9C80LXQvdGC0L7QsixcbiAqINCV0YHQu9C4INC90LAg0YHQtdGA0LLQtdGA0LUgX2lkOiBmYWxzZSwg0LAg0L3QsCDQutC70LjQtdC90YLQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQtdGB0YLRjCBfaWQuXG4gKlxuICogQHBhcmFtIHZhbHVlXG4gKiBAcGFyYW0gcHJldlxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGFwcHJveGltYXRlbHlFcXVhbCAoIHZhbHVlLCBwcmV2ICkge1xuICBwcmV2ID0gcHJldi50b09iamVjdCh7ZGVwb3B1bGF0ZTogMX0pO1xuXG4gIC8vINCd0LUg0YHRgNCw0LLQvdC40LLQsNGC0Ywg0L/QviBzdWJkb2MgX2lkXG4gIHZhciBpID0gdmFsdWUubGVuZ3RoO1xuICBpZiAoIGkgPT09IHByZXYubGVuZ3RoICl7XG4gICAgXy5mb3JFYWNoKCB2YWx1ZSwgZnVuY3Rpb24oIHN1YmRvYywgaSApe1xuICAgICAgaWYgKCAhc3ViZG9jLl9pZCApe1xuICAgICAgICBkZWxldGUgcHJldlsgaSBdLl9pZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB1dGlscy5kZWVwRXF1YWwoIHZhbHVlLCBwcmV2ICk7XG59XG5cbi8qIVxuICogUmVzdG9yZSBwb3B1bGF0aW9uXG4gKlxuICogQHBhcmFtIHsqfSBzdWJkb2NcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWFUcmVlXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IHByZXZcbiAqL1xuZnVuY3Rpb24gcmVzdG9yZVBvcHVsYXRlZEZpZWxkcyAoIHN1YmRvYywgc2NoZW1hVHJlZSwgdmFsdWUsIHByZXYgKSB7XG4gIHZhciBwcm9wcztcbiAgXy5mb3JFYWNoKCBzY2hlbWFUcmVlLCBmdW5jdGlvbiggcHJvcCwga2V5ICl7XG4gICAgdmFyIGN1clZhbDtcblxuICAgIGlmICggcHJvcC5yZWYgKXtcbiAgICAgIHByb3BzID0ge307XG4gICAgICBjdXJWYWwgPSB2YWx1ZVsga2V5IF07XG5cbiAgICAgIGlmICggY3VyVmFsICYmIG9pZC5pc1ZhbGlkKCBjdXJWYWwgKSApe1xuXG4gICAgICAgIF8uZm9yRWFjaCggcHJldiwgZnVuY3Rpb24oIHByZXZEb2MgKXtcbiAgICAgICAgICB2YXIgcHJldkRvY1Byb3AgPSBwcmV2RG9jWyBrZXkgXTtcblxuICAgICAgICAgIGlmICggcHJldkRvY1Byb3AgaW5zdGFuY2VvZiBEb2N1bWVudCApe1xuICAgICAgICAgICAgaWYgKCBwcmV2RG9jUHJvcC5faWQuZXF1YWxzKCBjdXJWYWwgKSApe1xuICAgICAgICAgICAgICBzdWJkb2NbIGtleSBdID0gcHJldkRvY1Byb3A7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkJ1ZmZlciA9IHJlcXVpcmUoJy4vYnVmZmVyJyk7XG5cbmV4cG9ydHMuRGF0ZSA9IHJlcXVpcmUoJy4vZGF0ZScpO1xuXG5leHBvcnRzLk9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xuXG5leHBvcnRzLk1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpO1xuXG4vLyBhbGlhc1xuXG5leHBvcnRzLk9pZCA9IGV4cG9ydHMuT2JqZWN0SWQ7XG5leHBvcnRzLk9iamVjdCA9IGV4cG9ydHMuTWl4ZWQ7XG5leHBvcnRzLkJvb2wgPSBleHBvcnRzLkJvb2xlYW47XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBNaXhlZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBNaXhlZCAocGF0aCwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHQpIHtcbiAgICB2YXIgZGVmID0gb3B0aW9ucy5kZWZhdWx0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRlZikgJiYgMCA9PT0gZGVmLmxlbmd0aCkge1xuICAgICAgLy8gbWFrZSBzdXJlIGVtcHR5IGFycmF5IGRlZmF1bHRzIGFyZSBoYW5kbGVkXG4gICAgICBvcHRpb25zLmRlZmF1bHQgPSBBcnJheTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNoYXJlZCAmJlxuICAgICAgICAgICAgICAgXy5pc1BsYWluT2JqZWN0KGRlZikgJiZcbiAgICAgICAgICAgICAgIDAgPT09IE9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSB7XG4gICAgICAvLyBwcmV2ZW50IG9kZCBcInNoYXJlZFwiIG9iamVjdHMgYmV0d2VlbiBkb2N1bWVudHNcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTWl4ZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWl4ZWQ7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4ZWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXM7XG5cbi8qKlxuICogTnVtYmVyIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gTnVtYmVyU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ051bWJlcicpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVyU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgbnVtYmVyXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdmFsdWUgaW5zdGFuY2VvZiBOdW1iZXI7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0cyBhIG1pbmltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogOSB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXG4gKiAgICAgICBtLm4gPSAxMDtcbiAqICAgICAgIG0uc2F2ZSgpIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBjdXN0b20gZXJyb3IgbWVzc2FnZXNcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01JTn0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAgICAgdmFyIG1pbiA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoe01JTn0pLiddO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1pbjogbWluIH0pXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XG4gKiAgICAgcy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGlzIGJlbmVhdGggdGhlIGxpbWl0ICgxMCkuXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWluaW11bSBudW1iZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5taW5WYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPT0gdGhpcy5taW5WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1pbjtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01JTn0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWluVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPj0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWluJ10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgYSBtYXhpbXVtIG51bWJlciB2YWxpZGF0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IDEwIH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDExIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUFYfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWF4ID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGV4Y2VlZHMgdGhlIGxpbWl0ICh7TUFYfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWF4OiBtYXggfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgZXhjZWVkcyB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtYXhpbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPT0gdGhpcy5tYXhWYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuTnVtYmVyLm1heDtcbiAgICBtc2cgPSBtc2cucmVwbGFjZSgve01BWH0vLCB2YWx1ZSk7XG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWF4VmFsaWRhdG9yID0gZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdiA9PT0gbnVsbCB8fCB2IDw9IHZhbHVlO1xuICAgIH0sIG1zZywgJ21heCddKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBudW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIHZhciB2YWwgPSB2YWx1ZSAmJiB2YWx1ZS5faWRcbiAgICA/IHZhbHVlLl9pZCAvLyBkb2N1bWVudHNcbiAgICA6IHZhbHVlO1xuXG4gIGlmICghaXNOYU4odmFsKSl7XG4gICAgaWYgKG51bGwgPT09IHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAoJycgPT09IHZhbCkgcmV0dXJuIG51bGw7XG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdmFsKSB2YWwgPSBOdW1iZXIodmFsKTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gdmFsO1xuICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIHZhbCkgcmV0dXJuIHZhbDtcbiAgICBpZiAodmFsLnRvU3RyaW5nICYmICFBcnJheS5pc0FycmF5KHZhbCkgJiZcbiAgICAgICAgdmFsLnRvU3RyaW5nKCkgPT0gTnVtYmVyKHZhbCkpIHtcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyKHZhbCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignbnVtYmVyJywgdmFsdWUsIHRoaXMucGF0aCk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyU2NoZW1hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBPYmplY3RJZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnT2JqZWN0SWQnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5PYmplY3RJZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPYmplY3RJZDtcblxuLyoqXG4gKiBBZGRzIGFuIGF1dG8tZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHQgaWYgdHVybk9uIGlzIHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmF1dG8gPSBmdW5jdGlvbiAoIHR1cm5PbiApIHtcbiAgaWYgKCB0dXJuT24gKSB7XG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcbiAgICB0aGlzLnNldCggcmVzZXRJZCApO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2Ygb2lkO1xuICB9XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIE9iamVjdElkXG4gKlxuICogQHBhcmFtIHtPYmplY3RJZHxTdHJpbmd9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2NcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxuICogQHBhcmFtIHtPYmplY3RJZHxEb2N1bWVudH0gcHJpb3JWYWxcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUsIGRvYywgaW5pdCwgcHJpb3JWYWwgKSB7XG4gIC8vIGxhenkgbG9hZFxuICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuLy4uL2RvY3VtZW50JykpO1xuXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgLy8gd2FpdCEgd2UgbWF5IG5lZWQgdG8gY2FzdCB0aGlzIHRvIGEgZG9jdW1lbnRcblxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHZhbHVlLiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIHNldHRpbmcgYSBwb3B1bGF0ZWQgcGF0aFxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZCApIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKCAhXy5pc1BsYWluT2JqZWN0KCB2YWx1ZSApICkge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG5cbiAgICAvLyDQndGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1LCDRg9C60LDQt9Cw0L3QvdC+0Lkg0LIg0YHRgdGL0LvQutC1XG4gICAgdmFyIHNjaGVtYSA9IHRoaXMub3B0aW9ucy5yZWY7XG4gICAgaWYgKCAhc2NoZW1hICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINGB0YXQtdC80YMsINC/0L4g0LrQvtGC0L7RgNC+0Lkg0Y3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgdC+0LfQtNCw0LLQsNGC0YwnKTtcbiAgICB9XG5cbiAgICBpZiAoICFzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINC90LDQt9Cy0LDQvdC40LUg0YHRhdC10LzRiyDQvdCwINC60L7RgtC+0YDRg9GOINGB0YHRi9C70LDQtdC80YHRjyDQv9GA0Lgg0LXRkSDRgdC+0LfQtNCw0L3QuNC4ICggbmV3IFNjaGVtYShcIm5hbWVcIiwgc2NoZW1hT2JqZWN0KSApJyk7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBkb2NcbiAgICBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0sIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICAgIGRvYy4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcblxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiB2YWx1ZTtcblxuICAvLyDQn9GA0LXQtNC+0YLQstGA0LDRgtC40YLRjCBkZXBvcHVsYXRlXG4gIGlmICggcHJpb3JWYWwgaW5zdGFuY2VvZiBEb2N1bWVudCApe1xuICAgIGlmICggcHJpb3JWYWwuX2lkICYmIHByaW9yVmFsLl9pZC5lcXVhbHMoIHZhbHVlICkgKXtcbiAgICAgIHJldHVybiBwcmlvclZhbDtcbiAgICB9XG4gIH1cblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQpXG4gICAgcmV0dXJuIHZhbHVlO1xuXG4gIGlmICggdmFsdWUuX2lkICYmIHZhbHVlLl9pZCBpbnN0YW5jZW9mIG9pZCApXG4gICAgcmV0dXJuIHZhbHVlLl9pZDtcblxuICBpZiAodmFsdWUudG9TdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG9pZC5jcmVhdGVGcm9tSGV4U3RyaW5nKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdElkICgpIHtcbiAgcmV0dXJuIG5ldyBvaWQoKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRJZCAodikge1xuICB0aGlzLiRfXy5faWQgPSBudWxsO1xuICByZXR1cm4gdjtcbn1cblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFN0cmluZyBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gU3RyaW5nU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgdGhpcy5lbnVtVmFsdWVzID0gW107XG4gIHRoaXMucmVnRXhwID0gbnVsbDtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ1N0cmluZycpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nU2NoZW1hO1xuXG4vKipcbiAqIEFkZHMgYW4gZW51bSB2YWxpZGF0b3JcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHN0YXRlcyA9ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJylcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IHN0YXRlcyB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGBpbnZhbGlkYCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGBzdGF0ZWAuXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvciB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIHZhciBlbnUgPSB7XG4gKiAgICAgICB2YWx1ZXM6ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJyksXG4gKiAgICAgICBtZXNzYWdlOiAnZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gJ1xuICogICAgIH1cbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IGVudSB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGBzdGF0ZWAgd2l0aCB2YWx1ZSBgaW52YWxpZGBcbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBbYXJncy4uLl0gZW51bWVyYXRpb24gdmFsdWVzXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX1N0b3JhZ2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5lbnVtID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5lbnVtVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2WzBdICE9PSB0aGlzLmVudW1WYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZmFsc2U7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0gfHwgZmFsc2UgPT09IGFyZ3VtZW50c1swXSkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbHVlcztcbiAgdmFyIGVycm9yTWVzc2FnZTtcblxuICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZ3VtZW50c1swXSkpIHtcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHNbMF0udmFsdWVzO1xuICAgIGVycm9yTWVzc2FnZSA9IGFyZ3VtZW50c1swXS5tZXNzYWdlO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50cztcbiAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLlN0cmluZy5lbnVtO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZXNbaV0pIHtcbiAgICAgIHRoaXMuZW51bVZhbHVlcy5wdXNoKHRoaXMuY2FzdCh2YWx1ZXNbaV0pKTtcbiAgICB9XG4gIH1cblxuICB2YXIgdmFscyA9IHRoaXMuZW51bVZhbHVlcztcbiAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2IHx8IH52YWxzLmluZGV4T2Yodik7XG4gIH07XG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLmVudW1WYWxpZGF0b3IsIGVycm9yTWVzc2FnZSwgJ2VudW0nXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBsb3dlcmNhc2Ugc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGVtYWlsOiAnU29tZUVtYWlsQGV4YW1wbGUuQ09NJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmVtYWlsKSAvLyBzb21lZW1haWxAZXhhbXBsZS5jb21cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gdXBwZXJjYXNlIHNldHRlci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgY2FwczogeyB0eXBlOiBTdHJpbmcsIHVwcGVyY2FzZTogdHJ1ZSB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGNhcHM6ICdhbiBleGFtcGxlJyB9KTtcbiAqICAgICBjb25zb2xlLmxvZyhtLmNhcHMpIC8vIEFOIEVYQU1QTEVcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLnVwcGVyY2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB0cmltIHNldHRlci5cbiAqXG4gKiBUaGUgc3RyaW5nIHZhbHVlIHdpbGwgYmUgdHJpbW1lZCB3aGVuIHNldC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHRyaW06IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIHN0cmluZyA9ICcgc29tZSBuYW1lICdcbiAqICAgICBjb25zb2xlLmxvZyhzdHJpbmcubGVuZ3RoKSAvLyAxMVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiBzdHJpbmcgfSlcbiAqICAgICBjb25zb2xlLmxvZyhtLm5hbWUubGVuZ3RoKSAvLyA5XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xuICAgIGlmICh2KSByZXR1cm4gdi50cmltKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTZXRzIGEgcmVnZXhwIHZhbGlkYXRvci5cbiAqXG4gKiBBbnkgdmFsdWUgdGhhdCBkb2VzIG5vdCBwYXNzIGByZWdFeHBgLnRlc3QodmFsKSB3aWxsIGZhaWwgdmFsaWRhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiAnSSBhbSBpbnZhbGlkJyB9KVxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFBhdGggYG5hbWVgIGlzIGludmFsaWQgKEkgYW0gaW52YWxpZCkuXCJcbiAqICAgICAgIG0ubmFtZSA9ICdhcHBsZXMnXG4gKiAgICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICAgYXNzZXJ0Lm9rKGVycikgLy8gc3VjY2Vzc1xuICogICAgICAgfSlcbiAqICAgICB9KVxuICpcbiAqICAgICAvLyB1c2luZyBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiAgICAgdmFyIG1hdGNoID0gWyAvXFwuaHRtbCQvLCBcIlRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoe1ZBTFVFfSlcIiBdO1xuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGZpbGU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogbWF0Y2ggfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBmaWxlOiAnaW52YWxpZCcgfSk7XG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoaW52YWxpZClcIlxuICogICAgIH0pXG4gKlxuICogRW1wdHkgc3RyaW5ncywgYHVuZGVmaW5lZGAsIGFuZCBgbnVsbGAgdmFsdWVzIGFsd2F5cyBwYXNzIHRoZSBtYXRjaCB2YWxpZGF0b3IuIElmIHlvdSByZXF1aXJlIHRoZXNlIHZhbHVlcywgZW5hYmxlIHRoZSBgcmVxdWlyZWRgIHZhbGlkYXRvciBhbHNvLlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8sIHJlcXVpcmVkOiB0cnVlIH19KVxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSByZWdFeHAgcmVndWxhciBleHByZXNzaW9uIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXG4gICAgICA6IHRydWU7XG4gIH1cblxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbbWF0Y2hWYWxpZGF0b3IsIG1zZywgJ3JlZ2V4cCddKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gY2hlY2tSZXF1aXJlZCAodmFsdWUsIGRvYykge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYodGhpcywgdmFsdWUsIGRvYywgdHJ1ZSkpIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpICYmIHZhbHVlLmxlbmd0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBDYXN0cyB0byBTdHJpbmdcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgaWYgKCB2YWx1ZSA9PT0gbnVsbCApIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZSkge1xuICAgIC8vIGhhbmRsZSBkb2N1bWVudHMgYmVpbmcgcGFzc2VkXG4gICAgaWYgKHZhbHVlLl9pZCAmJiAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlLl9pZCkge1xuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcbiAgICB9XG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBlcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZXJyb3JNZXNzYWdlcyA9IGVycm9yLm1lc3NhZ2VzO1xudmFyIENhc3RFcnJvciA9IGVycm9yLkNhc3RFcnJvcjtcbnZhciBWYWxpZGF0b3JFcnJvciA9IGVycm9yLlZhbGlkYXRvckVycm9yO1xuXG4vKipcbiAqIFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtTdHJpbmd9IFtpbnN0YW5jZV1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gU2NoZW1hVHlwZSAocGF0aCwgb3B0aW9ucywgaW5zdGFuY2UpIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuICB0aGlzLnZhbGlkYXRvcnMgPSBbXTtcbiAgdGhpcy5zZXR0ZXJzID0gW107XG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykgaWYgKHRoaXNbaV0gJiYgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXNbaV0pIHtcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcbiAgICAgID8gb3B0aW9uc1tpXVxuICAgICAgOiBbb3B0aW9uc1tpXV07XG5cbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxuICpcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxuICpcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4ge307XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XG4gKiAgICAgdmFyIG0xID0gbmV3IE07XG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKiAgICAgdmFyIG0yID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyB2YWxcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXG4gKlxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cbiAqXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIFN0b3JhZ2Ugc2V0dGVyLlxuICpcbiAqICAgICBmdW5jdGlvbiB0b0xvd2VyICh2KSB7XG4gKiAgICAgICByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIFVzZXJTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGVtYWlsOiB7IHR5cGU6IFN0cmluZywgc2V0OiB0b0xvd2VyIH1cbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgVXNlciA9IGRiLm1vZGVsKCdVc2VyJywgVXNlclNjaGVtYSlcbiAqXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlcih7ZW1haWw6ICdBVkVOVUVAUS5DT00nfSlcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKTsgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiAgICAgLy8gb3JcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyXG4gKiAgICAgdXNlci5lbWFpbCA9ICdBdmVudWVAUS5jb20nXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCkgLy8gJ2F2ZW51ZUBxLmNvbSdcbiAqXG4gKiBBcyB5b3UgY2FuIHNlZSBhYm92ZSwgc2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBfTk9URTogd2UgY291bGQgaGF2ZSBhbHNvIGp1c3QgdXNlZCB0aGUgYnVpbHQtaW4gYGxvd2VyY2FzZTogdHJ1ZWAgU2NoZW1hVHlwZSBvcHRpb24gaW5zdGVhZCBvZiBkZWZpbmluZyBvdXIgb3duIGZ1bmN0aW9uLl9cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxuICpcbiAqIFNldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgc2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cbiAqXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbDtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBzZXQ6IGluc3BlY3RvciB9LFxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGluc3BlY3RvciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xuICogICAgIHZhciB2ID0gbmV3IFZpcnVzKHsgbmFtZTogJ1BhcnZvdmlyaWRhZScsIHRheG9ub215OiAnUGFydm92aXJpbmFlJyB9KTtcbiAqXG4gKiAgICAgY29uc29sZS5sb2codi5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICBjb25zb2xlLmxvZyh2LnRheG9ub215KTsgLy8gUGFydm92aXJpbmFlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGZuKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Egc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGdldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGZ1bmN0aW9uIGRvYiAodmFsKSB7XG4gKiAgICAgICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcbiAqICAgICAgIHJldHVybiAodmFsLmdldE1vbnRoKCkgKyAxKSArIFwiL1wiICsgdmFsLmdldERhdGUoKSArIFwiL1wiICsgdmFsLmdldEZ1bGxZZWFyKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgZ2V0OiBkb2IgfSlcbiAqXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IERhdGUgfSlcbiAqICAgICBzLnBhdGgoJ2Jvcm4nKS5nZXQoZG9iKVxuICpcbiAqIEdldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgYXMgaXQgdHJhdmVscyBmcm9tIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCB0byB0aGUgdmFsdWUgdGhhdCB5b3Ugc2VlLlxuICpcbiAqIFN1cHBvc2UgeW91IGFyZSBzdG9yaW5nIGNyZWRpdCBjYXJkIG51bWJlcnMgYW5kIHlvdSB3YW50IHRvIGhpZGUgZXZlcnl0aGluZyBleGNlcHQgdGhlIGxhc3QgNCBkaWdpdHMgdG8gdGhlIG1vbmdvb3NlIHVzZXIuIFlvdSBjYW4gZG8gc28gYnkgZGVmaW5pbmcgYSBnZXR0ZXIgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9iZnVzY2F0ZSAoY2MpIHtcbiAqICAgICAgIHJldHVybiAnKioqKi0qKioqLSoqKiotJyArIGNjLnNsaWNlKGNjLmxlbmd0aC00LCBjYy5sZW5ndGgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIEFjY291bnRTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGNyZWRpdENhcmROdW1iZXI6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IG9iZnVzY2F0ZSB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBBY2NvdW50ID0gZGIubW9kZWwoJ0FjY291bnQnLCBBY2NvdW50U2NoZW1hKTtcbiAqXG4gKiAgICAgQWNjb3VudC5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgZm91bmQpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGZvdW5kLmNyZWRpdENhcmROdW1iZXIpOyAvLyAnKioqKi0qKioqLSoqKiotMTIzNCdcbiAqICAgICB9KTtcbiAqXG4gKiBHZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIGdldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIG5vdCc7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZ2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgZ2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqXG4gKiAgICAgVmlydXMuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIHZpcnVzKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLnRheG9ub215KTsgLy8gdGF4b25vbXkgaXMgbm90XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgZm4pXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB0aGlzLmdldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHZhbGlkYXRvcihzKSBmb3IgdGhpcyBkb2N1bWVudCBwYXRoLlxuICpcbiAqIFZhbGlkYXRvcnMgYWx3YXlzIHJlY2VpdmUgdGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIHRoZWlyIGZpcnN0IGFyZ3VtZW50IGFuZCBtdXN0IHJldHVybiBgQm9vbGVhbmAuIFJldHVybmluZyBgZmFsc2VgIG1lYW5zIHZhbGlkYXRpb24gZmFpbGVkLlxuICpcbiAqIFRoZSBlcnJvciBtZXNzYWdlIGFyZ3VtZW50IGlzIG9wdGlvbmFsLiBJZiBub3QgcGFzc2VkLCB0aGUgW2RlZmF1bHQgZ2VuZXJpYyBlcnJvciBtZXNzYWdlIHRlbXBsYXRlXSgjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzKSB3aWxsIGJlIHVzZWQuXG4gKlxuICogIyMjI0V4YW1wbGVzOlxuICpcbiAqICAgICAvLyBtYWtlIHN1cmUgZXZlcnkgdmFsdWUgaXMgZXF1YWwgdG8gXCJzb21ldGhpbmdcIlxuICogICAgIGZ1bmN0aW9uIHZhbGlkYXRvciAodmFsKSB7XG4gKiAgICAgICByZXR1cm4gdmFsID09ICdzb21ldGhpbmcnO1xuICogICAgIH1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiB2YWxpZGF0b3IgfX0pO1xuICpcbiAqICAgICAvLyB3aXRoIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIGN1c3RvbSA9IFt2YWxpZGF0b3IsICdVaCBvaCwge1BBVEh9IGRvZXMgbm90IGVxdWFsIFwic29tZXRoaW5nXCIuJ11cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBjdXN0b20gfX0pO1xuICpcbiAqICAgICAvLyBhZGRpbmcgbWFueSB2YWxpZGF0b3JzIGF0IGEgdGltZVxuICpcbiAqICAgICB2YXIgbWFueSA9IFtcbiAqICAgICAgICAgeyB2YWxpZGF0b3I6IHZhbGlkYXRvciwgbXNnOiAndWggb2gnIH1cbiAqICAgICAgICwgeyB2YWxpZGF0b3I6IGFub3RoZXJWYWxpZGF0b3IsIG1zZzogJ2ZhaWxlZCcgfVxuICogICAgIF1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBtYW55IH19KTtcbiAqXG4gKiAgICAgLy8gb3IgdXRpbGl6aW5nIFNjaGVtYVR5cGUgbWV0aG9kcyBkaXJlY3RseTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiAnc3RyaW5nJyB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKHZhbGlkYXRvciwgJ3ZhbGlkYXRpb24gb2YgYHtQQVRIfWAgZmFpbGVkIHdpdGggdmFsdWUgYHtWQUxVRX1gJyk7XG4gKlxuICogIyMjI0Vycm9yIG1lc3NhZ2UgdGVtcGxhdGVzOlxuICpcbiAqIEZyb20gdGhlIGV4YW1wbGVzIGFib3ZlLCB5b3UgbWF5IGhhdmUgbm90aWNlZCB0aGF0IGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzZWljIHRlbXBsYXRpbmcuIFRoZXJlIGFyZSBhIGZldyBvdGhlciB0ZW1wbGF0ZSBrZXl3b3JkcyBiZXNpZGVzIGB7UEFUSH1gIGFuZCBge1ZBTFVFfWAgdG9vLiBUbyBmaW5kIG91dCBtb3JlLCBkZXRhaWxzIGFyZSBhdmFpbGFibGUgW2hlcmVdKCNlcnJvcl9tZXNzYWdlc19TdG9yYWdlRXJyb3ItbWVzc2FnZXMpXG4gKlxuICogIyMjI0FzeW5jaHJvbm91cyB2YWxpZGF0aW9uOlxuICpcbiAqIFBhc3NpbmcgYSB2YWxpZGF0b3IgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0d28gYXJndW1lbnRzIHRlbGxzIG1vbmdvb3NlIHRoYXQgdGhlIHZhbGlkYXRvciBpcyBhbiBhc3luY2hyb25vdXMgdmFsaWRhdG9yLiBUaGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIHRvIHRoZSB2YWxpZGF0b3IgZnVuY3Rpb24gaXMgdGhlIHZhbHVlIGJlaW5nIHZhbGlkYXRlZC4gVGhlIHNlY29uZCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgbXVzdCBjYWxsZWQgd2hlbiB5b3UgZmluaXNoIHZhbGlkYXRpbmcgdGhlIHZhbHVlIGFuZCBwYXNzZWQgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIHRvIGNvbW11bmljYXRlIGVpdGhlciBzdWNjZXNzIG9yIGZhaWx1cmUgcmVzcGVjdGl2ZWx5LlxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKGZ1bmN0aW9uICh2YWx1ZSwgcmVzcG9uZCkge1xuICogICAgICAgZG9TdHVmZih2YWx1ZSwgZnVuY3Rpb24gKCkge1xuICogICAgICAgICAuLi5cbiAqICAgICAgICAgcmVzcG9uZChmYWxzZSk7IC8vIHZhbGlkYXRpb24gZmFpbGVkXG4gKiAgICAgICB9KVxuKiAgICAgIH0sICd7UEFUSH0gZmFpbGVkIHZhbGlkYXRpb24uJyk7XG4qXG4gKiBZb3UgbWlnaHQgdXNlIGFzeW5jaHJvbm91cyB2YWxpZGF0b3JzIHRvIHJldHJlaXZlIG90aGVyIGRvY3VtZW50cyBmcm9tIHRoZSBkYXRhYmFzZSB0byB2YWxpZGF0ZSBhZ2FpbnN0IG9yIHRvIG1lZXQgb3RoZXIgSS9PIGJvdW5kIHZhbGlkYXRpb24gbmVlZHMuXG4gKlxuICogVmFsaWRhdGlvbiBvY2N1cnMgYHByZSgnc2F2ZScpYCBvciB3aGVuZXZlciB5b3UgbWFudWFsbHkgZXhlY3V0ZSBbZG9jdW1lbnQjdmFsaWRhdGVdKCNkb2N1bWVudF9Eb2N1bWVudC12YWxpZGF0ZSkuXG4gKlxuICogSWYgdmFsaWRhdGlvbiBmYWlscyBkdXJpbmcgYHByZSgnc2F2ZScpYCBhbmQgbm8gY2FsbGJhY2sgd2FzIHBhc3NlZCB0byByZWNlaXZlIHRoZSBlcnJvciwgYW4gYGVycm9yYCBldmVudCB3aWxsIGJlIGVtaXR0ZWQgb24geW91ciBNb2RlbHMgYXNzb2NpYXRlZCBkYiBbY29ubmVjdGlvbl0oI2Nvbm5lY3Rpb25fQ29ubmVjdGlvbiksIHBhc3NpbmcgdGhlIHZhbGlkYXRpb24gZXJyb3Igb2JqZWN0IGFsb25nLlxuICpcbiAqICAgICB2YXIgY29ubiA9IG1vbmdvb3NlLmNyZWF0ZUNvbm5lY3Rpb24oLi4pO1xuICogICAgIGNvbm4ub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICpcbiAqICAgICB2YXIgUHJvZHVjdCA9IGNvbm4ubW9kZWwoJ1Byb2R1Y3QnLCB5b3VyU2NoZW1hKTtcbiAqICAgICB2YXIgZHZkID0gbmV3IFByb2R1Y3QoLi4pO1xuICogICAgIGR2ZC5zYXZlKCk7IC8vIGVtaXRzIGVycm9yIG9uIHRoZSBgY29ubmAgYWJvdmVcbiAqXG4gKiBJZiB5b3UgZGVzaXJlIGhhbmRsaW5nIHRoZXNlIGVycm9ycyBhdCB0aGUgTW9kZWwgbGV2ZWwsIGF0dGFjaCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHlvdXIgTW9kZWwgYW5kIHRoZSBldmVudCB3aWxsIGluc3RlYWQgYmUgZW1pdHRlZCB0aGVyZS5cbiAqXG4gKiAgICAgLy8gcmVnaXN0ZXJpbmcgYW4gZXJyb3IgbGlzdGVuZXIgb24gdGhlIE1vZGVsIGxldHMgdXMgaGFuZGxlIGVycm9ycyBtb3JlIGxvY2FsbHlcbiAqICAgICBQcm9kdWN0Lm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAcGFyYW0ge1JlZ0V4cHxGdW5jdGlvbnxPYmplY3R9IG9iaiB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAob2JqLCBtZXNzYWdlLCB0eXBlKSB7XG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqIHx8IG9iaiAmJiAnUmVnRXhwJyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgIGlmICghbWVzc2FnZSkgbWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICAgIGlmICghdHlwZSkgdHlwZSA9ICd1c2VyIGRlZmluZWQnO1xuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFtvYmosIG1lc3NhZ2UsIHR5cGVdKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgYXJnO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKCEoYXJnICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGFyZy5jb25zdHJ1Y3RvciApICkpIHtcbiAgICAgIHZhciBtc2cgPSAnSW52YWxpZCB2YWxpZGF0b3IuIFJlY2VpdmVkICgnICsgdHlwZW9mIGFyZyArICcpICdcbiAgICAgICAgKyBhcmdcbiAgICAgICAgKyAnLiBTZWUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvYXBpLmh0bWwjc2NoZW1hdHlwZV9TY2hlbWFUeXBlLXZhbGlkYXRlJztcblxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIHRoaXMudmFsaWRhdGUoYXJnLnZhbGlkYXRvciwgYXJnLm1zZywgYXJnLnR5cGUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXF1aXJlZCB2YWxpZGF0b3IgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiB0cnVlIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogJ3tQQVRIfSBpcyByZXF1aXJlZCEnIH0pXG4gKlxuICogICAgIC8vIG9yIHRocm91Z2ggdGhlIHBhdGggQVBJXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSk7XG4gKlxuICogICAgIC8vIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2luZ1xuICpcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUsICdncnJyIDooICcpO1xuICpcbiAqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIGVuYWJsZS9kaXNhYmxlIHRoZSB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfU3RvcmFnZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5yZXF1aXJlZCA9IGZ1bmN0aW9uIChyZXF1aXJlZCwgbWVzc2FnZSkge1xuICBpZiAoZmFsc2UgPT09IHJlcXVpcmVkKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5yZXF1aXJlZFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuaXNSZXF1aXJlZCA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmlzUmVxdWlyZWQgPSB0cnVlO1xuXG4gIHRoaXMucmVxdWlyZWRWYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgIC8vIGluIGhlcmUsIGB0aGlzYCByZWZlcnMgdG8gdGhlIHZhbGlkYXRpbmcgZG9jdW1lbnQuXG4gICAgLy8gbm8gdmFsaWRhdGlvbiB3aGVuIHRoaXMgcGF0aCB3YXNuJ3Qgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5LlxuICAgIGlmICh0aGlzICE9PSB1bmRlZmluZWQgJiYgLy8g0YHQv9C10YbQuNCw0LvRjNC90LDRjyDQv9GA0L7QstC10YDQutCwINC40Lct0LfQsCBzdHJpY3QgbW9kZSDQuCDQvtGB0L7QsdC10L3QvdC+0YHRgtC4IC5jYWxsKHVuZGVmaW5lZClcbiAgICAgICAgJ2lzU2VsZWN0ZWQnIGluIHRoaXMgJiZcbiAgICAgICAgIXRoaXMuaXNTZWxlY3RlZChzZWxmLnBhdGgpICYmXG4gICAgICAgICF0aGlzLmlzTW9kaWZpZWQoc2VsZi5wYXRoKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gc2VsZi5jaGVja1JlcXVpcmVkKHYsIHRoaXMpO1xuICB9O1xuXG4gIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHJlcXVpcmVkKSB7XG4gICAgbWVzc2FnZSA9IHJlcXVpcmVkO1xuICAgIHJlcXVpcmVkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5nZW5lcmFsLnJlcXVpcmVkO1xuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5yZXF1aXJlZFZhbGlkYXRvciwgbXNnLCAncmVxdWlyZWQnXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgZGVmYXVsdCB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZSB0aGUgc2NvcGUgd2hpY2ggY2FsbGJhY2sgYXJlIGV4ZWN1dGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNjb3BlLCBpbml0KSB7XG4gIHZhciByZXQgPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5kZWZhdWx0VmFsdWVcbiAgICA/IHRoaXMuZGVmYXVsdFZhbHVlLmNhbGwoc2NvcGUpXG4gICAgOiB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICBpZiAobnVsbCAhPT0gcmV0ICYmIHVuZGVmaW5lZCAhPT0gcmV0KSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChyZXQsIHNjb3BlLCBpbml0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVyc1xuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XG4gKiBAcGFyYW0geyp9IHByaW9yVmFsXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCkge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcbiAgICByZXR1cm4gaW5pdFxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB0aGlzLmNhc3QodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBzZXR0ZXJzID0gdGhpcy5zZXR0ZXJzXG4gICAgLCBsZW4gPSBzZXR0ZXJzLmxlbmd0aFxuICAgICwgY2FzdGVyID0gdGhpcy5jYXN0ZXI7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodikgJiYgY2FzdGVyICYmIGNhc3Rlci5zZXR0ZXJzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2W2ldID0gY2FzdGVyLmFwcGx5U2V0dGVycyh2W2ldLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghbGVuKSB7XG4gICAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcbiAgICByZXR1cm4gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gIH1cblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICB2ID0gc2V0dGVyc1tsZW5dLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG5cbiAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcblxuICAvLyBkbyBub3QgY2FzdCB1bnRpbCBhbGwgc2V0dGVycyBhcmUgYXBwbGllZCAjNjY1XG4gIHYgPSB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcblxuICByZXR1cm4gdjtcbn07XG5cbi8qKlxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGEgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uKCB2YWx1ZSwgc2NvcGUgKXtcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHJldHVybiB2YWx1ZTtcblxuICB2YXIgdiA9IHZhbHVlXG4gICAgLCBnZXR0ZXJzID0gdGhpcy5nZXR0ZXJzXG4gICAgLCBsZW4gPSBnZXR0ZXJzLmxlbmd0aDtcblxuICBpZiAoICFsZW4gKSB7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICB3aGlsZSAoIGxlbi0tICkge1xuICAgIHYgPSBnZXR0ZXJzWyBsZW4gXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuXG4gIHJldHVybiB2O1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhIHZhbGlkYXRpb24gb2YgYHZhbHVlYCB1c2luZyB0aGUgdmFsaWRhdG9ycyBkZWNsYXJlZCBmb3IgdGhpcyBTY2hlbWFUeXBlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaywgc2NvcGUpIHtcbiAgdmFyIGVyciA9IGZhbHNlXG4gICAgLCBwYXRoID0gdGhpcy5wYXRoXG4gICAgLCBjb3VudCA9IHRoaXMudmFsaWRhdG9ycy5sZW5ndGg7XG5cbiAgaWYgKCFjb3VudCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlIChvaywgbWVzc2FnZSwgdHlwZSwgdmFsKSB7XG4gICAgaWYgKGVycikgcmV0dXJuO1xuICAgIGlmIChvayA9PT0gdW5kZWZpbmVkIHx8IG9rKSB7XG4gICAgICAtLWNvdW50IHx8IGNhbGxiYWNrKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhlcnIgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgbWVzc2FnZSwgdHlwZSwgdmFsKSk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy52YWxpZGF0b3JzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdlswXVxuICAgICAgLCBtZXNzYWdlID0gdlsxXVxuICAgICAgLCB0eXBlID0gdlsyXTtcblxuICAgIGlmICh2YWxpZGF0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci50ZXN0KHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbGlkYXRvcikge1xuICAgICAgaWYgKDIgPT09IHZhbGlkYXRvci5sZW5ndGgpIHtcbiAgICAgICAgdmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlLCBmdW5jdGlvbiAob2spIHtcbiAgICAgICAgICB2YWxpZGF0ZShvaywgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHZhbHVlIGlzIGEgdmFsaWQgUmVmZXJlbmNlLlxuICpcbiAqINCd0LAg0LrQu9C40LXQvdGC0LUg0LIg0LrQsNGH0LXRgdGC0LLQtSDRgdGB0YvQu9C60Lgg0LzQvtC20L3QviDRhdGA0LDQvdC40YLRjCDQutCw0LogaWQsINGC0LDQuiDQuCDQv9C+0LvQvdGL0LUg0LTQvtC60YPQvNC10L3RgtGLXG4gKlxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBzZWxmXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5faXNSZWYgPSBmdW5jdGlvbiggc2VsZiwgdmFsdWUgKXtcbiAgLy8gZmFzdCBwYXRoXG4gIHZhciByZWYgPSBzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlZjtcblxuICBpZiAoIHJlZiApIHtcbiAgICBpZiAoIG51bGwgPT0gdmFsdWUgKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoIF8uaXNPYmplY3QoIHZhbHVlICkgKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hVHlwZTtcblxuU2NoZW1hVHlwZS5DYXN0RXJyb3IgPSBDYXN0RXJyb3I7XG5cblNjaGVtYVR5cGUuVmFsaWRhdG9yRXJyb3IgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBTdGF0ZU1hY2hpbmUgcmVwcmVzZW50cyBhIG1pbmltYWwgYGludGVyZmFjZWAgZm9yIHRoZVxuICogY29uc3RydWN0b3JzIGl0IGJ1aWxkcyB2aWEgU3RhdGVNYWNoaW5lLmN0b3IoLi4uKS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBTdGF0ZU1hY2hpbmUgKCkge1xuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3RhdGVzID0ge307XG59O1xuXG4vKiFcbiAqIFN0YXRlTWFjaGluZS5jdG9yKCdzdGF0ZTEnLCAnc3RhdGUyJywgLi4uKVxuICogQSBmYWN0b3J5IG1ldGhvZCBmb3Igc3ViY2xhc3NpbmcgU3RhdGVNYWNoaW5lLlxuICogVGhlIGFyZ3VtZW50cyBhcmUgYSBsaXN0IG9mIHN0YXRlcy4gRm9yIGVhY2ggc3RhdGUsXG4gKiB0aGUgY29uc3RydWN0b3IncyBwcm90b3R5cGUgZ2V0cyBzdGF0ZSB0cmFuc2l0aW9uXG4gKiBtZXRob2RzIG5hbWVkIGFmdGVyIGVhY2ggc3RhdGUuIFRoZXNlIHRyYW5zaXRpb24gbWV0aG9kc1xuICogcGxhY2UgdGhlaXIgcGF0aCBhcmd1bWVudCBpbnRvIHRoZSBnaXZlbiBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gc3ViY2xhc3MgY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcblxuICB2YXIgY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICBTdGF0ZU1hY2hpbmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnN0YXRlTmFtZXMgPSBzdGF0ZXM7XG5cbiAgICB2YXIgaSA9IHN0YXRlcy5sZW5ndGhcbiAgICAgICwgc3RhdGU7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbiAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXSA9IHt9O1xuICAgIH1cbiAgfTtcblxuICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0YXRlTWFjaGluZS5wcm90b3R5cGUgKTtcbiAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXG4gIHN0YXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIC8vIENoYW5nZXMgdGhlIGBwYXRoYCdzIHN0YXRlIHRvIGBzdGF0ZWAuXG4gICAgY3Rvci5wcm90b3R5cGVbc3RhdGVdID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKHBhdGgsIHN0YXRlKTtcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBpcyB3cmFwcGVkIGJ5IHRoZSBzdGF0ZSBjaGFuZ2UgZnVuY3Rpb25zOlxuICpcbiAqIC0gYHJlcXVpcmUocGF0aClgXG4gKiAtIGBtb2RpZnkocGF0aClgXG4gKiAtIGBpbml0KHBhdGgpYFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2NoYW5nZVN0YXRlID0gZnVuY3Rpb24gX2NoYW5nZVN0YXRlIChwYXRoLCBuZXh0U3RhdGUpIHtcbiAgdmFyIHByZXZCdWNrZXQgPSB0aGlzLnN0YXRlc1t0aGlzLnBhdGhzW3BhdGhdXTtcbiAgaWYgKHByZXZCdWNrZXQpIGRlbGV0ZSBwcmV2QnVja2V0W3BhdGhdO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBuZXh0U3RhdGU7XG4gIHRoaXMuc3RhdGVzW25leHRTdGF0ZV1bcGF0aF0gPSB0cnVlO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIgKHN0YXRlKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZXNbc3RhdGVdKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0ga2V5c1tpXTtcbiAgICBkZWxldGUgdGhpcy5zdGF0ZXNbc3RhdGVdW3BhdGhdO1xuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xuICB9XG59O1xuXG4vKiFcbiAqIENoZWNrcyB0byBzZWUgaWYgYXQgbGVhc3Qgb25lIHBhdGggaXMgaW4gdGhlIHN0YXRlcyBwYXNzZWQgaW4gdmlhIGBhcmd1bWVudHNgXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIHRoYXQgd2Ugd2FudCB0byBjaGVjayBmb3IuXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3aGF0ID0gYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50cyA6IHRoaXMuc3RhdGVOYW1lcztcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkubGVuZ3RoO1xuICB9KTtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxuICogc2luY2UgYm90aCBvZiB0aG9zZSBtZXRob2RzIHNoYXJlIGEgbG90IG9mIHRoZSBzYW1lIGxvZ2ljLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5faXRlciA9IGZ1bmN0aW9uIF9pdGVyIChpdGVyTWV0aG9kKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG51bUFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgICAsIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDAsIG51bUFyZ3MtMSlcbiAgICAgICwgY2FsbGJhY2sgPSBhcmd1bWVudHNbbnVtQXJncy0xXTtcblxuICAgIGlmICghc3RhdGVzLmxlbmd0aCkgc3RhdGVzID0gdGhpcy5zdGF0ZU5hbWVzO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHBhdGhzID0gc3RhdGVzLnJlZHVjZShmdW5jdGlvbiAocGF0aHMsIHN0YXRlKSB7XG4gICAgICByZXR1cm4gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkpO1xuICAgIH0sIFtdKTtcblxuICAgIHJldHVybiBwYXRoc1tpdGVyTWV0aG9kXShmdW5jdGlvbiAocGF0aCwgaSwgcGF0aHMpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhwYXRoLCBpLCBwYXRocyk7XG4gICAgfSk7XG4gIH07XG59O1xuXG4vKiFcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIHBhdGhzIHRoYXQgYmVsb25nIHRvIG9uZSBvZiB0aGUgcGFyYW1ldGVyIHN0YXRlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgZm4pOyAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMVxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcbiAgdGhpcy5mb3JFYWNoID0gdGhpcy5faXRlcignZm9yRWFjaCcpO1xuICByZXR1cm4gdGhpcy5mb3JFYWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAgKCkge1xuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xuICByZXR1cm4gdGhpcy5tYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UT0RPOiDQv9C+0YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1iZWRkZWREb2N1bWVudCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcbnZhciBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG5cbi8qKlxuICogU3RvcmFnZSBBcnJheSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSwgb3RoZXJ3aXNlIGBTdG9yYWdlQXJyYXkjcHVzaGAgd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZC5fXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKiBAaW5oZXJpdHMgQXJyYXlcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUFycmF5ICh2YWx1ZXMsIHBhdGgsIGRvYykge1xuICB2YXIgYXJyID0gW107XG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlQXJyYXkubWl4aW4gKTtcblxuICBhcnIudmFsaWRhdG9ycyA9IFtdO1xuICBhcnIuX3BhdGggPSBwYXRoO1xuICBhcnIuaXNTdG9yYWdlQXJyYXkgPSB0cnVlO1xuXG4gIGlmIChkb2MpIHtcbiAgICBhcnIuX3BhcmVudCA9IGRvYztcbiAgICBhcnIuX3NjaGVtYSA9IGRvYy5zY2hlbWEucGF0aChwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBhcnI7XG59XG5cblN0b3JhZ2VBcnJheS5taXhpbiA9IHtcbiAgLyoqXG4gICAqIFBhcmVudCBvd25lciBkb2N1bWVudFxuICAgKlxuICAgKiBAcHJvcGVydHkgX3BhcmVudFxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9wYXJlbnQ6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogQ2FzdHMgYSBtZW1iZXIgYmFzZWQgb24gdGhpcyBhcnJheXMgc2NoZW1hLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IHZhbHVlXG4gICAqIEByZXR1cm4gdmFsdWUgdGhlIGNhc3RlZCB2YWx1ZVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9jYXN0OiBmdW5jdGlvbiAoIHZhbHVlICkge1xuICAgIHZhciBvd25lciA9IHRoaXMuX293bmVyO1xuICAgIHZhciBwb3B1bGF0ZWQgPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgIC8vIGlmIGEgcG9wdWxhdGVkIGFycmF5LCB3ZSBtdXN0IGNhc3QgdG8gdGhlIHNhbWUgbW9kZWxcbiAgICAgIC8vIGluc3RhbmNlIGFzIHNwZWNpZmllZCBpbiB0aGUgb3JpZ2luYWwgcXVlcnkuXG4gICAgICBpZiAoIW93bmVyKSB7XG4gICAgICAgIG93bmVyID0gdGhpcy5fb3duZXIgPSB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudFxuICAgICAgICAgID8gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnQoKVxuICAgICAgICAgIDogdGhpcy5fcGFyZW50O1xuICAgICAgfVxuXG4gICAgICBwb3B1bGF0ZWQgPSBvd25lci5wb3B1bGF0ZWQodGhpcy5fcGF0aCwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHBvcHVsYXRlZCAmJiBudWxsICE9IHZhbHVlKSB7XG4gICAgICAvLyBjYXN0IHRvIHRoZSBwb3B1bGF0ZWQgTW9kZWxzIHNjaGVtYVxuICAgICAgdmFyIE1vZGVsID0gcG9wdWxhdGVkLm9wdGlvbnMubW9kZWw7XG5cbiAgICAgIC8vIG9ubHkgb2JqZWN0cyBhcmUgcGVybWl0dGVkIHNvIHdlIGNhbiBzYWZlbHkgYXNzdW1lIHRoYXRcbiAgICAgIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgICAgIGlmICggdmFsdWUgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCAhXy5pc09iamVjdCh2YWx1ZSkgKSB7XG4gICAgICAgIHZhbHVlID0geyBfaWQ6IHZhbHVlIH07XG4gICAgICB9XG5cbiAgICAgIHZhbHVlID0gbmV3IE1vZGVsKHZhbHVlKTtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlbWEuY2FzdGVyLmNhc3QodmFsdWUsIHRoaXMuX3BhcmVudCwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCBmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1hcmtzIHRoaXMgYXJyYXkgYXMgbW9kaWZpZWQuXG4gICAqXG4gICAqIElmIGl0IGJ1YmJsZXMgdXAgZnJvbSBhbiBlbWJlZGRlZCBkb2N1bWVudCBjaGFuZ2UsIHRoZW4gaXQgdGFrZXMgdGhlIGZvbGxvd2luZyBhcmd1bWVudHMgKG90aGVyd2lzZSwgdGFrZXMgMCBhcmd1bWVudHMpXG4gICAqXG4gICAqIEBwYXJhbSB7RW1iZWRkZWREb2N1bWVudH0gZW1iZWRkZWREb2MgdGhlIGVtYmVkZGVkIGRvYyB0aGF0IGludm9rZWQgdGhpcyBtZXRob2Qgb24gdGhlIEFycmF5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbWJlZGRlZFBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZCBpbiB0aGUgZW1iZWRkZWREb2NcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfbWFya01vZGlmaWVkOiBmdW5jdGlvbiAoZWxlbSwgZW1iZWRkZWRQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudFxuICAgICAgLCBkaXJ0eVBhdGg7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBkaXJ0eVBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBpZiAobnVsbCAhPSBlbWJlZGRlZFBhdGgpIHtcbiAgICAgICAgICAvLyBhbiBlbWJlZGRlZCBkb2MgYnViYmxlZCB1cCB0aGUgY2hhbmdlXG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgdGhpcy5pbmRleE9mKGVsZW0pICsgJy4nICsgZW1iZWRkZWRQYXRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGRpcmVjdGx5IHNldCBhbiBpbmRleFxuICAgICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIGVsZW07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFyZW50Lm1hcmtNb2RpZmllZChkaXJ0eVBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3B1c2hgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wdXNoKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbYXJncy4uLl1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHB1c2g6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCByZXQgPSBbXS5wdXNoLmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3BvcGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3BvcCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBzZWUgU3RvcmFnZUFycmF5IyRwb3AgI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS0lMjRwb3BcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHBvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5wb3AuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5ID0gWzIsM107XG4gICAqICAgICB2YXIgcmVzID0gZG9jLmFycmF5LnNoaWZ0KCk7XG4gICAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzNdXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzaGlmdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSBbXS5zaGlmdC5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAgICpcbiAgICogIyMjI0V4YW1wbGVzOlxuICAgKlxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoT2JqZWN0SWQpXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCh7IF9pZDogJ3NvbWVJZCcgfSlcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoJ3RhZyAxJywgJ3RhZyAyJylcbiAgICpcbiAgICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAgICpcbiAgICogT3Igd2UgbWF5IHBhc3NpbmcgdGhlIF9pZCBkaXJlY3RseSBhbmQgbGV0IHN0b3JhZ2UgdGFrZSBjYXJlIG9mIGl0LlxuICAgKlxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVzaCh7IF9pZDogNDgxNTE2MjM0MiB9KVxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCg0ODE1MTYyMzQyKTsgLy8gd29ya3NcbiAgICpcbiAgICogQHBhcmFtIHsqfSBhcmd1bWVudHNcbiAgICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgY3VyID0gdGhpcy5fcGFyZW50LmdldCh0aGlzLl9wYXRoKVxuICAgICAgLCBpID0gY3VyLmxlbmd0aFxuICAgICAgLCBtZW07XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBtZW0gPSBjdXJbaV07XG4gICAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xuICAgICAgICBpZiAodmFsdWVzLnNvbWUoZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHYuZXF1YWxzKG1lbSk7IH0gKSkge1xuICAgICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAofmN1ci5pbmRleE9mLmNhbGwodmFsdWVzLCBtZW0pKSB7XG4gICAgICAgIFtdLnNwbGljZS5jYWxsKGN1ciwgaSwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc3BsaWNlYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvc3BsaWNlKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcgYW5kIGNhc3RpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoKSB7XG4gICAgdmFyIHJldCwgdmFscywgaTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICB2YWxzID0gW107XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhbHNbaV0gPSBpIDwgMlxuICAgICAgICAgID8gYXJndW1lbnRzW2ldXG4gICAgICAgICAgOiB0aGlzLl9jYXN0KGFyZ3VtZW50c1tpXSk7XG4gICAgICB9XG4gICAgICByZXQgPSBbXS5zcGxpY2UuYXBwbHkodGhpcywgdmFscyk7XG5cbiAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjdW5zaGlmdGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3Vuc2hpZnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05vdGU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHVuc2hpZnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKTtcbiAgICBbXS51bnNoaWZ0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBzIFtgQXJyYXkjc29ydGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NvcnQpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAgICpcbiAgICogIyMjI05PVEU6XG4gICAqXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHNvcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10uc29ydC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyB2YWx1ZXMgdG8gdGhlIGFycmF5IGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqICAgICB2YXIgYWRkZWQgPSBkb2MuYXJyYXkuYWRkVG9TZXQoNCw1KTtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0LDVdXG4gICAqICAgICBjb25zb2xlLmxvZyhhZGRlZCkgICAgIC8vIFs1XVxuICAgKlxuICAgKiBAcGFyYW0geyp9IGFyZ3VtZW50c1xuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhlIHZhbHVlcyB0aGF0IHdlcmUgYWRkZWRcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGFkZFRvU2V0OiBmdW5jdGlvbiBhZGRUb1NldCAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgYWRkZWQgPSBbXVxuICAgICAgLCB0eXBlID0gdmFsdWVzWzBdIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCA/ICdkb2MnIDpcbiAgICAgICAgICAgICAgIHZhbHVlc1swXSBpbnN0YW5jZW9mIERhdGUgPyAnZGF0ZScgOlxuICAgICAgICAgICAgICAgJyc7XG5cbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGZvdW5kO1xuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2RvYyc6XG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZG9jKXsgcmV0dXJuIGRvYy5lcXVhbHModik7IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICB2YXIgdmFsID0gK3Y7XG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZCl7IHJldHVybiArZCA9PT0gdmFsOyB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBmb3VuZCA9IH50aGlzLmluZGV4T2Yodik7XG4gICAgICB9XG5cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgW10ucHVzaC5jYWxsKHRoaXMsIHYpO1xuXG4gICAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgICAgICBbXS5wdXNoLmNhbGwoYWRkZWQsIHYpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgcmV0dXJuIGFkZGVkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjYXN0ZWQgYHZhbGAgYXQgaW5kZXggYGlgIGFuZCBtYXJrcyB0aGUgYXJyYXkgbW9kaWZpZWQuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlOlxuICAgKlxuICAgKiAgICAgLy8gZ2l2ZW4gZG9jdW1lbnRzIGJhc2VkIG9uIHRoZSBmb2xsb3dpbmdcbiAgICogICAgIHZhciBkb2NzID0gc3RvcmFnZS5jcmVhdGVDb2xsZWN0aW9uKCdEb2MnLCBuZXcgU2NoZW1hKHsgYXJyYXk6IFtOdW1iZXJdIH0pKTtcbiAgICpcbiAgICogICAgIHZhciBkb2MgPSBkb2NzLmFkZCh7IGFycmF5OiBbMiwzLDRdIH0pXG4gICAqXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNF1cbiAgICpcbiAgICogICAgIGRvYy5hcnJheS5zZXQoMSxcIjVcIik7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpOyAvLyBbMiw1LDRdIC8vIHByb3Blcmx5IGNhc3QgdG8gbnVtYmVyXG4gICAqICAgICBkb2Muc2F2ZSgpIC8vIHRoZSBjaGFuZ2UgaXMgc2F2ZWRcbiAgICpcbiAgICogICAgIC8vIFZTIG5vdCB1c2luZyBhcnJheSNzZXRcbiAgICogICAgIGRvYy5hcnJheVsxXSA9IFwiNVwiO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KTsgLy8gWzIsXCI1XCIsNF0gLy8gbm8gY2FzdGluZ1xuICAgKiAgICAgZG9jLnNhdmUoKSAvLyBjaGFuZ2UgaXMgbm90IHNhdmVkXG4gICAqXG4gICAqIEByZXR1cm4ge0FycmF5fSB0aGlzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzZXQ6IGZ1bmN0aW9uIChpLCB2YWwpIHtcbiAgICB0aGlzW2ldID0gdGhpcy5fY2FzdCh2YWwpO1xuICAgIHRoaXMuX21hcmtNb2RpZmllZChpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7QXJyYXl9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB0b09iamVjdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJldHVybiBkb2MgaW5zdGFuY2VvZiBEb2N1bWVudFxuICAgICAgICAgID8gZG9jLnRvT2JqZWN0KG9wdGlvbnMpXG4gICAgICAgICAgOiBkb2M7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zbGljZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGluZGV4IG9mIGBvYmpgIG9yIGAtMWAgaWYgbm90IGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBpdGVtIHRvIGxvb2sgZm9yXG4gICAqIEByZXR1cm4ge051bWJlcn1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGluZGV4T2Y6IGZ1bmN0aW9uIGluZGV4T2YgKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBPYmplY3RJZCkgb2JqID0gb2JqLnRvU3RyaW5nKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGlmIChvYmogPT0gdGhpc1tpXSlcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufTtcblxuLyoqXG4gKiBBbGlhcyBvZiBbcHVsbF0oI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS1wdWxsKVxuICpcbiAqIEBzZWUgU3RvcmFnZUFycmF5I3B1bGwgI3R5cGVzX2FycmF5X1N0b3JhZ2VBcnJheS1wdWxsXG4gKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAqIEBhcGkgcHVibGljXG4gKiBAbWVtYmVyT2YgU3RvcmFnZUFycmF5XG4gKiBAbWV0aG9kIHJlbW92ZVxuICovXG5TdG9yYWdlQXJyYXkubWl4aW4ucmVtb3ZlID0gU3RvcmFnZUFycmF5Lm1peGluLnB1bGw7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlQXJyYXk7XG4iLCIoZnVuY3Rpb24gKEJ1ZmZlcil7XG4ndXNlIHN0cmljdCc7XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgQmluYXJ5ID0gcmVxdWlyZSgnLi4vYmluYXJ5Jyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIFN0b3JhZ2UgQnVmZmVyIGNvbnN0cnVjdG9yLlxuICpcbiAqIFZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUuXG4gKlxuICogQHBhcmFtIHtCdWZmZXJ9IHZhbHVlXG4gKiBAcGFyYW0ge1N0cmluZ30gZW5jb2RlXG4gKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBpbmhlcml0cyBCdWZmZXJcbiAqL1xuXG5mdW5jdGlvbiBTdG9yYWdlQnVmZmVyICh2YWx1ZSwgZW5jb2RlLCBvZmZzZXQpIHtcbiAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIHZhciB2YWw7XG5cbiAgaWYgKDAgPT09IGxlbmd0aCB8fCBudWxsID09PSBhcmd1bWVudHNbMF0gfHwgdW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0pIHtcbiAgICB2YWwgPSAwO1xuICB9IGVsc2Uge1xuICAgIHZhbCA9IHZhbHVlO1xuICB9XG5cbiAgdmFyIGVuY29kaW5nO1xuICB2YXIgcGF0aDtcbiAgdmFyIGRvYztcblxuICBpZiAoQXJyYXkuaXNBcnJheShlbmNvZGUpKSB7XG4gICAgLy8gaW50ZXJuYWwgY2FzdGluZ1xuICAgIHBhdGggPSBlbmNvZGVbMF07XG4gICAgZG9jID0gZW5jb2RlWzFdO1xuICB9IGVsc2Uge1xuICAgIGVuY29kaW5nID0gZW5jb2RlO1xuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodmFsLCBlbmNvZGluZywgb2Zmc2V0KTtcbiAgXy5taXhpbiggYnVmLCBTdG9yYWdlQnVmZmVyLm1peGluICk7XG4gIGJ1Zi5pc1N0b3JhZ2VCdWZmZXIgPSB0cnVlO1xuXG4gIC8vIG1ha2Ugc3VyZSB0aGVzZSBpbnRlcm5hbCBwcm9wcyBkb24ndCBzaG93IHVwIGluIE9iamVjdC5rZXlzKClcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYnVmLCB7XG4gICAgICB2YWxpZGF0b3JzOiB7IHZhbHVlOiBbXSB9XG4gICAgLCBfcGF0aDogeyB2YWx1ZTogcGF0aCB9XG4gICAgLCBfcGFyZW50OiB7IHZhbHVlOiBkb2MgfVxuICB9KTtcblxuICBpZiAoZG9jICYmICdzdHJpbmcnID09PSB0eXBlb2YgcGF0aCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShidWYsICdfc2NoZW1hJywge1xuICAgICAgICB2YWx1ZTogZG9jLnNjaGVtYS5wYXRoKHBhdGgpXG4gICAgfSk7XG4gIH1cblxuICBidWYuX3N1YnR5cGUgPSAwO1xuICByZXR1cm4gYnVmO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBCdWZmZXIuXG4gKi9cblxuLy9TdG9yYWdlQnVmZmVyLnByb3RvdHlwZSA9IG5ldyBCdWZmZXIoMCk7XG5cblN0b3JhZ2VCdWZmZXIubWl4aW4gPSB7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBvd25lciBkb2N1bWVudFxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICogQHByb3BlcnR5IF9wYXJlbnRcbiAgICovXG5cbiAgX3BhcmVudDogdW5kZWZpbmVkLFxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IHN1YnR5cGUgZm9yIHRoZSBCaW5hcnkgcmVwcmVzZW50aW5nIHRoaXMgQnVmZmVyXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkgX3N1YnR5cGVcbiAgICovXG5cbiAgX3N1YnR5cGU6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogTWFya3MgdGhpcyBidWZmZXIgYXMgbW9kaWZpZWQuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBfbWFya01vZGlmaWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIHBhcmVudC5tYXJrTW9kaWZpZWQodGhpcy5fcGF0aCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcml0ZXMgdGhlIGJ1ZmZlci5cbiAgICovXG5cbiAgd3JpdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JpdHRlbiA9IEJ1ZmZlci5wcm90b3R5cGUud3JpdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmICh3cml0dGVuID4gMCkge1xuICAgICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyaXR0ZW47XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvcGllcyB0aGUgYnVmZmVyLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogYEJ1ZmZlciNjb3B5YCBkb2VzIG5vdCBtYXJrIGB0YXJnZXRgIGFzIG1vZGlmaWVkIHNvIHlvdSBtdXN0IGNvcHkgZnJvbSBhIGBTdG9yYWdlQnVmZmVyYCBmb3IgaXQgdG8gd29yayBhcyBleHBlY3RlZC4gVGhpcyBpcyBhIHdvcmsgYXJvdW5kIHNpbmNlIGBjb3B5YCBtb2RpZmllcyB0aGUgdGFyZ2V0LCBub3QgdGhpcy5cbiAgICpcbiAgICogQHJldHVybiB7U3RvcmFnZUJ1ZmZlcn1cbiAgICogQHBhcmFtIHtCdWZmZXJ9IHRhcmdldFxuICAgKi9cblxuICBjb3B5OiBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdmFyIHJldCA9IEJ1ZmZlci5wcm90b3R5cGUuY29weS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgaWYgKHRhcmdldCAmJiB0YXJnZXQuaXNTdG9yYWdlQnVmZmVyKSB7XG4gICAgICB0YXJnZXQuX21hcmtNb2RpZmllZCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cbn07XG5cbi8qIVxuICogQ29tcGlsZSBvdGhlciBCdWZmZXIgbWV0aG9kcyBtYXJraW5nIHRoaXMgYnVmZmVyIGFzIG1vZGlmaWVkLlxuICovXG5cbjsoXG4vLyBub2RlIDwgMC41XG4nd3JpdGVVSW50OCB3cml0ZVVJbnQxNiB3cml0ZVVJbnQzMiB3cml0ZUludDggd3JpdGVJbnQxNiB3cml0ZUludDMyICcgK1xuJ3dyaXRlRmxvYXQgd3JpdGVEb3VibGUgZmlsbCAnICtcbid1dGY4V3JpdGUgYmluYXJ5V3JpdGUgYXNjaWlXcml0ZSBzZXQgJyArXG5cbi8vIG5vZGUgPj0gMC41XG4nd3JpdGVVSW50MTZMRSB3cml0ZVVJbnQxNkJFIHdyaXRlVUludDMyTEUgd3JpdGVVSW50MzJCRSAnICtcbid3cml0ZUludDE2TEUgd3JpdGVJbnQxNkJFIHdyaXRlSW50MzJMRSB3cml0ZUludDMyQkUgJyArXG4nd3JpdGVGbG9hdExFIHdyaXRlRmxvYXRCRSB3cml0ZURvdWJsZUxFIHdyaXRlRG91YmxlQkUnXG4pLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gIGlmICghQnVmZmVyLnByb3RvdHlwZVttZXRob2RdKSByZXR1cm47XG4gICAgU3RvcmFnZUJ1ZmZlci5taXhpblttZXRob2RdID0gbmV3IEZ1bmN0aW9uKFxuICAgICd2YXIgcmV0ID0gQnVmZmVyLnByb3RvdHlwZS4nK21ldGhvZCsnLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7JyArXG4gICAgJ3RoaXMuX21hcmtNb2RpZmllZCgpOycgK1xuICAgICdyZXR1cm4gcmV0OydcbiAgKTtcbn0pO1xuXG4vKipcbiAqIENvbnZlcnRzIHRoaXMgYnVmZmVyIHRvIGl0cyBCaW5hcnkgdHlwZSByZXByZXNlbnRhdGlvbi5cbiAqXG4gKiAjIyMjU3ViVHlwZXM6XG4gKlxuICogICB2YXIgYnNvbiA9IHJlcXVpcmUoJ2Jzb24nKVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfREVGQVVMVFxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfRlVOQ1RJT05cbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0JZVEVfQVJSQVlcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VVSURcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX01ENVxuICogICBic29uLkJTT05fQklOQVJZX1NVQlRZUEVfVVNFUl9ERUZJTkVEXG4gKlxuICogICBkb2MuYnVmZmVyLnRvT2JqZWN0KGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VU0VSX0RFRklORUQpO1xuICpcbiAqIEBzZWUgaHR0cDovL2Jzb25zcGVjLm9yZy8jL3NwZWNpZmljYXRpb25cbiAqIEBwYXJhbSB7SGV4fSBbc3VidHlwZV1cbiAqIEByZXR1cm4ge0JpbmFyeX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZUJ1ZmZlci5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzdWJ0eXBlID0gJ251bWJlcicgPT09IHR5cGVvZiBvcHRpb25zXG4gICAgPyBvcHRpb25zXG4gICAgOiAodGhpcy5fc3VidHlwZSB8fCAwKTtcbiAgcmV0dXJuIG5ldyBCaW5hcnkodGhpcywgc3VidHlwZSk7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhpcyBidWZmZXIgaXMgZXF1YWxzIHRvIGBvdGhlcmAgYnVmZmVyXG4gKlxuICogQHBhcmFtIHtCdWZmZXJ9IG90aGVyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cblN0b3JhZ2VCdWZmZXIubWl4aW4uZXF1YWxzID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKG90aGVyKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0aGlzLmxlbmd0aCAhPT0gb3RoZXIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHRoaXNbaV0gIT09IG90aGVyW2ldKSByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgc3VidHlwZSBvcHRpb24gYW5kIG1hcmtzIHRoZSBidWZmZXIgbW9kaWZpZWQuXG4gKlxuICogIyMjI1N1YlR5cGVzOlxuICpcbiAqICAgdmFyIGJzb24gPSByZXF1aXJlKCdic29uJylcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0RFRkFVTFRcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX0ZVTkNUSU9OXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9CWVRFX0FSUkFZXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VVUlEXG4gKiAgIGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9NRDVcbiAqICAgYnNvbi5CU09OX0JJTkFSWV9TVUJUWVBFX1VTRVJfREVGSU5FRFxuICpcbiAqICAgZG9jLmJ1ZmZlci5zdWJ0eXBlKGJzb24uQlNPTl9CSU5BUllfU1VCVFlQRV9VVUlEKTtcbiAqXG4gKiBAc2VlIGh0dHA6Ly9ic29uc3BlYy5vcmcvIy9zcGVjaWZpY2F0aW9uXG4gKiBAcGFyYW0ge0hleH0gc3VidHlwZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlQnVmZmVyLm1peGluLnN1YnR5cGUgPSBmdW5jdGlvbiAoc3VidHlwZSkge1xuICBpZiAoJ251bWJlcicgIT09IHR5cGVvZiBzdWJ0eXBlKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBzdWJ0eXBlLiBFeHBlY3RlZCBhIG51bWJlcicpO1xuICB9XG5cbiAgaWYgKHRoaXMuX3N1YnR5cGUgIT09IHN1YnR5cGUpIHtcbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgfVxuXG4gIHRoaXMuX3N1YnR5cGUgPSBzdWJ0eXBlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5TdG9yYWdlQnVmZmVyLkJpbmFyeSA9IEJpbmFyeTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlQnVmZmVyO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKVxuICAsIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICwgT2JqZWN0SWRTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEvb2JqZWN0aWQnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBEb2N1bWVudEFycmF5IGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byB0aGlzIGFycmF5XG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge1N0b3JhZ2VEb2N1bWVudEFycmF5fVxuICogQGluaGVyaXRzIFN0b3JhZ2VBcnJheVxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxuICogVE9ETzog0L/QvtC00YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG4gKlxuICog0JLQtdGB0Ywg0L3Rg9C20L3Ri9C5INC60L7QtCDRgdC60L7Qv9C40YDQvtCy0LDQvVxuICovXG5mdW5jdGlvbiBTdG9yYWdlRG9jdW1lbnRBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuXG4gIC8vIFZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIHNpbmNlXG4gIC8vIG90aGVyd2lzZSBTdG9yYWdlQXJyYXkjcHVzaCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkIHRvIHRoZSBwYXJlbnQuXG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiApO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XG4gIGFyci5pc1N0b3JhZ2VEb2N1bWVudEFycmF5ID0gdHJ1ZTtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgYXJyLl9oYW5kbGVycyA9IHtcbiAgICAgIGlzTmV3OiBhcnIubm90aWZ5KCdpc05ldycpLFxuICAgICAgc2F2ZTogYXJyLm5vdGlmeSgnc2F2ZScpXG4gICAgfTtcblxuICAgIC8vINCf0YDQvtCx0YDQvtGBINC40LfQvNC10L3QtdC90LjRjyDRgdC+0YHRgtC+0Y/QvdC40Y8g0LIg0L/QvtC00LTQvtC60YPQvNC10L3RglxuICAgIGRvYy5vbignc2F2ZScsIGFyci5faGFuZGxlcnMuc2F2ZSk7XG4gICAgZG9jLm9uKCdpc05ldycsIGFyci5faGFuZGxlcnMuaXNOZXcpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFN0b3JhZ2VBcnJheVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbiA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VBcnJheS5taXhpbiApO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5fY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoISh2YWx1ZS5fX3BhcmVudCAmJiB2YWx1ZS5fX3BhcmVudEFycmF5KSkge1xuICAgICAgLy8gdmFsdWUgbWF5IGhhdmUgYmVlbiBjcmVhdGVkIHVzaW5nIGFycmF5LmNyZWF0ZSgpXG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICAgIHZhbHVlLl9fcGFyZW50QXJyYXkgPSB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBoYW5kbGUgY2FzdCgnc3RyaW5nJykgb3IgY2FzdChPYmplY3RJZCkgZXRjLlxuICAvLyBvbmx5IG9iamVjdHMgYXJlIHBlcm1pdHRlZCBzbyB3ZSBjYW4gc2FmZWx5IGFzc3VtZSB0aGF0XG4gIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICB2YWx1ZSA9IHsgX2lkOiB2YWx1ZSB9O1xuICB9XG5cbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IodmFsdWUsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBTZWFyY2hlcyBhcnJheSBpdGVtcyBmb3IgdGhlIGZpcnN0IGRvY3VtZW50IHdpdGggYSBtYXRjaGluZyBfaWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBlbWJlZGRlZERvYyA9IG0uYXJyYXkuaWQoc29tZV9pZCk7XG4gKlxuICogQHJldHVybiB7RW1iZWRkZWREb2N1bWVudHxudWxsfSB0aGUgc3ViZG9jdW1lbnQgb3IgbnVsbCBpZiBub3QgZm91bmQuXG4gKiBAcGFyYW0ge09iamVjdElkfFN0cmluZ3xOdW1iZXJ9IGlkXG4gKiBAVE9ETyBjYXN0IHRvIHRoZSBfaWQgYmFzZWQgb24gc2NoZW1hIGZvciBwcm9wZXIgY29tcGFyaXNvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uaWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgdmFyIGNhc3RlZFxuICAgICwgc2lkXG4gICAgLCBfaWQ7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY2FzdGVkXyA9IE9iamVjdElkU2NoZW1hLnByb3RvdHlwZS5jYXN0LmNhbGwoe30sIGlkKTtcbiAgICBpZiAoY2FzdGVkXykgY2FzdGVkID0gU3RyaW5nKGNhc3RlZF8pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FzdGVkID0gbnVsbDtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBfaWQgPSB0aGlzW2ldLmdldCgnX2lkJyk7XG5cbiAgICBpZiAoX2lkIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZC5faWQpIHJldHVybiB0aGlzW2ldO1xuICAgIH0gZWxzZSBpZiAoIShfaWQgaW5zdGFuY2VvZiBPYmplY3RJZCkpIHtcbiAgICAgIHNpZCB8fCAoc2lkID0gU3RyaW5nKGlkKSk7XG4gICAgICBpZiAoc2lkID09IF9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmIChjYXN0ZWQgPT0gX2lkKSB7XG4gICAgICByZXR1cm4gdGhpc1tpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheSBvZiBwbGFpbiBqcyBvYmplY3RzXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX0VhY2ggc3ViLWRvY3VtZW50IGlzIGNvbnZlcnRlZCB0byBhIHBsYWluIG9iamVjdCBieSBjYWxsaW5nIGl0cyBgI3RvT2JqZWN0YCBtZXRob2QuX1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWwgb3B0aW9ucyB0byBwYXNzIHRvIGVhY2ggZG9jdW1lbnRzIGB0b09iamVjdGAgbWV0aG9kIGNhbGwgZHVyaW5nIGNvbnZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG5ldyB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3Iob2JqKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZuIHRoYXQgbm90aWZpZXMgYWxsIGNoaWxkIGRvY3Mgb2YgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLm5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSAoZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gbm90aWZ5ICh2YWwpIHtcbiAgICB2YXIgaSA9IHNlbGYubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGlmICghc2VsZltpXSkgY29udGludWU7XG4gICAgICBzZWxmW2ldLnRyaWdnZXIoZXZlbnQsIHZhbCk7XG4gICAgfVxuICB9O1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VEb2N1bWVudEFycmF5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBFbWJlZGRlZERvY3VtZW50IGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGpzIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoZSBkYlxuICogQHBhcmFtIHtTdG9yYWdlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIERvY3VtZW50LnByb3RvdHlwZSApO1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWJlZGRlZERvY3VtZW50O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBlbWJlZGRlZCBkb2MgbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBkb2MgPSBibG9ncG9zdC5jb21tZW50cy5pZChoZXhzdHJpbmcpO1xuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcblxuICBpZiAodGhpcy5pc05ldykge1xuICAgIC8vIE1hcmsgdGhlIFdIT0xFIHBhcmVudCBhcnJheSBhcyBtb2RpZmllZFxuICAgIC8vIGlmIHRoaXMgaXMgYSBuZXcgZG9jdW1lbnQgKGkuZS4sIHdlIGFyZSBpbml0aWFsaXppbmdcbiAgICAvLyBhIGRvY3VtZW50KSxcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCgpO1xuICB9IGVsc2VcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCh0aGlzLCBwYXRoKTtcbn07XG5cbi8qKlxuICogVXNlZCBhcyBhIHN0dWIgZm9yIFtob29rcy5qc10oaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjMylcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVGhpcyBpcyBhIG5vLW9wLiBEb2VzIG5vdCBhY3R1YWxseSBzYXZlIHRoZSBkb2MgdG8gdGhlIGRiLl9cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlZCBQcm9taXNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBwcm9taXNlID0gJC5EZWZlcnJlZCgpLmRvbmUoZm4pO1xuICBwcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHN1YmRvY3VtZW50IGZyb20gaXRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBfaWQ7XG4gIGlmICghdGhpcy53aWxsUmVtb3ZlKSB7XG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcbiAgICBpZiAoIV9pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3IgeW91ciBvd24gZ29vZCwgU3RvcmFnZSBkb2VzIG5vdCBrbm93ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdob3cgdG8gcmVtb3ZlIGFuIEVtYmVkZGVkRG9jdW1lbnQgdGhhdCBoYXMgbm8gX2lkJyk7XG4gICAgfVxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5wdWxsKHsgX2lkOiBfaWQgfSk7XG4gICAgdGhpcy53aWxsUmVtb3ZlID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChmbilcbiAgICBmbihudWxsKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgI3VwZGF0ZSBtZXRob2Qgb2YgcGFyZW50IGRvY3VtZW50cy5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRocm93IG5ldyBFcnJvcignVGhlICN1cGRhdGUgbWV0aG9kIGlzIG5vdCBhdmFpbGFibGUgb24gRW1iZWRkZWREb2N1bWVudHMnKTtcbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBmaWVsZCB0byBpbnZhbGlkYXRlXG4gKiBAcGFyYW0ge1N0cmluZ3xFcnJvcn0gZXJyIGVycm9yIHdoaWNoIHN0YXRlcyB0aGUgcmVhc29uIGBwYXRoYCB3YXMgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyLCB2YWwsIGZpcnN0KSB7XG4gIGlmICghdGhpcy5fX3BhcmVudCkge1xuICAgIHZhciBtc2cgPSAnVW5hYmxlIHRvIGludmFsaWRhdGUgYSBzdWJkb2N1bWVudCB0aGF0IGhhcyBub3QgYmVlbiBhZGRlZCB0byBhbiBhcnJheS4nO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fX3BhcmVudEFycmF5LmluZGV4T2YodGhpcyk7XG4gIHZhciBwYXJlbnRQYXRoID0gdGhpcy5fX3BhcmVudEFycmF5Ll9wYXRoO1xuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcblxuICAvLyBzbmlmZmluZyBhcmd1bWVudHM6XG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXG4gIC8vIG91ciBlcnJvciBtZXNzYWdlIGNsZWFuLlxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVycik7XG4gIH1cblxuICBpZiAoZmlyc3QpXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvcCBsZXZlbCBkb2N1bWVudCBvZiB0aGlzIHN1Yi1kb2N1bWVudC5cbiAqXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSB0aGlzLl9fcGFyZW50O1xuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XG5cbiAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgfVxuXG4gIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG5cbiAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LiBJZiBvcHRpb25hbCBgcGF0aGAgaXMgcGFzc2VkLCBpdCBpcyBhcHBlbmRlZCB0byB0aGUgZnVsbCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIEVtYmVkZGVkRG9jdW1lbnRcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuJF9fLmZ1bGxQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgaWYgKCFwYXJlbnQuX19wYXJlbnQpIHJldHVybiBwYXRoO1xuXG4gICAgdmFyIHBhdGhzID0gW107XG4gICAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgICAgcGF0aHMudW5zaGlmdChwYXJlbnQuX19wYXJlbnRBcnJheS5fcGF0aCk7XG4gICAgICBwYXJlbnQgPSBwYXJlbnQuX19wYXJlbnQ7XG4gICAgfVxuXG4gICAgdGhpcy4kX18uZnVsbFBhdGggPSBwYXRocy5qb2luKCcuJyk7XG5cbiAgICBpZiAoIXRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICAgIC8vIG9wdGltaXphdGlvblxuICAgICAgdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGF0aFxuICAgID8gdGhpcy4kX18uZnVsbFBhdGggKyAnLicgKyBwYXRoXG4gICAgOiB0aGlzLiRfXy5mdWxsUGF0aDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGRvY3VtZW50LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnRBcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnRBcnJheTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWJlZGRlZERvY3VtZW50O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbmV4cG9ydHMuQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5leHBvcnRzLkJ1ZmZlciA9IHJlcXVpcmUoJy4vYnVmZmVyJyk7XG5cbmV4cG9ydHMuRW1iZWRkZWQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIEJpbmFyeVBhcnNlciA9IHJlcXVpcmUoJy4uL2JpbmFyeXBhcnNlcicpLkJpbmFyeVBhcnNlcjtcblxuLyoqXG4gKiBNYWNoaW5lIGlkLlxuICpcbiAqIENyZWF0ZSBhIHJhbmRvbSAzLWJ5dGUgdmFsdWUgKGkuZS4gdW5pcXVlIGZvciB0aGlzXG4gKiBwcm9jZXNzKS4gT3RoZXIgZHJpdmVycyB1c2UgYSBtZDUgb2YgdGhlIG1hY2hpbmUgaWQgaGVyZSwgYnV0XG4gKiB0aGF0IHdvdWxkIG1lYW4gYW4gYXN5YyBjYWxsIHRvIGdldGhvc3RuYW1lLCBzbyB3ZSBkb24ndCBib3RoZXIuXG4gKiBAaWdub3JlXG4gKi9cbnZhciBNQUNISU5FX0lEID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IGNoZWNrcyBmb3IgaGV4IHZhbHVlXG52YXIgY2hlY2tGb3JIZXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeWzAtOWEtZkEtRl17MjR9JCcpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBPYmplY3RJZCBpbnN0YW5jZVxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21vbmdvZGIvanMtYnNvbi9ibG9iL21hc3Rlci9saWIvYnNvbi9vYmplY3RpZC5qc1xuICogQGNsYXNzIFJlcHJlc2VudHMgYSBCU09OIE9iamVjdElkIHR5cGUuXG4gKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyKX0gaWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZ2VuZXJhdGlvblRpbWUgVGhlIGdlbmVyYXRpb24gdGltZSBvZiB0aGlzIE9iamVjdElkIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gaW5zdGFuY2Ugb2YgT2JqZWN0SWQuXG4gKi9cbmZ1bmN0aW9uIE9iamVjdElkKGlkKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZChpZCk7XG4gIGlmKChpZCBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIGlkO1xuXG4gIHRoaXMuX2Jzb250eXBlID0gJ09iamVjdElkJztcbiAgdmFyIHZhbGlkID0gT2JqZWN0SWQuaXNWYWxpZChpZCk7XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZighdmFsaWQgJiYgaWQgIT0gbnVsbCl7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHNpbmdsZSBTdHJpbmcgb2YgMTIgYnl0ZXMgb3IgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnMnKTtcbiAgfSBlbHNlIGlmKHZhbGlkICYmIHR5cGVvZiBpZCA9PT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoID09PSAyNCkge1xuICAgIHJldHVybiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKGlkKTtcbiAgfSBlbHNlIGlmKGlkID09IG51bGwgfHwgdHlwZW9mIGlkID09PSAnbnVtYmVyJykge1xuICAgIC8vIGNvbnZlcnQgdG8gMTIgYnl0ZSBiaW5hcnkgc3RyaW5nXG4gICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICB9IGVsc2UgaWYoaWQgIT0gbnVsbCAmJiBpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgLy8gYXNzdW1lIDEyIGJ5dGUgc3RyaW5nXG4gICAgdGhpcy5pZCA9IGlkO1xuICB9XG5cbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHRoaXMuX19pZCA9IHRoaXMudG9IZXhTdHJpbmcoKTtcbn1cblxuLy8gUHJlY29tcHV0ZWQgaGV4IHRhYmxlIGVuYWJsZXMgc3BlZWR5IGhleCBzdHJpbmcgY29udmVyc2lvblxudmFyIGhleFRhYmxlID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7XG4gIGhleFRhYmxlW2ldID0gKGkgPD0gMTUgPyAnMCcgOiAnJykgKyBpLnRvU3RyaW5nKDE2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIE9iamVjdElkIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7c3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSGV4U3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nICYmIHRoaXMuX19pZCkgcmV0dXJuIHRoaXMuX19pZDtcblxuICB2YXIgaGV4U3RyaW5nID0gJyc7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgaGV4U3RyaW5nICs9IGhleFRhYmxlW3RoaXMuaWQuY2hhckNvZGVBdChpKV07XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gaGV4U3RyaW5nO1xuICByZXR1cm4gaGV4U3RyaW5nO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7bnVtYmVyfSByZXR1cm5zIG5leHQgaW5kZXggdmFsdWUuXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZXRfaW5jID0gZnVuY3Rpb24oKSB7XG4gIE9iamVjdElkLmluZGV4ID0gKE9iamVjdElkLmluZGV4ICsgMSkgJSAweEZGRkZGRjtcblxuICByZXR1cm4gT2JqZWN0SWQuaW5kZXg7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldEluYyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5nZXRfaW5jKCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIGEgMTIgYnl0ZSBpZCBzdHJpbmcgdXNlZCBpbiBPYmplY3RJZCdzXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtudW1iZXJ9IFt0aW1lXSBvcHRpb25hbCBwYXJhbWV0ZXIgYWxsb3dpbmcgdG8gcGFzcyBpbiBhIHNlY29uZCBiYXNlZCB0aW1lc3RhbXAuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMTIgYnl0ZSBpZCBiaW5hcnkgc3RyaW5nLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICgnbnVtYmVyJyAhPT0gdHlwZW9mIHRpbWUpIHtcbiAgICB0aW1lID0gcGFyc2VJbnQoRGF0ZS5ub3coKS8xMDAwLDEwKTtcbiAgfVxuXG4gIHZhciB0aW1lNEJ5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG4gIC8qIGZvciB0aW1lLWJhc2VkIE9iamVjdElkIHRoZSBieXRlcyBmb2xsb3dpbmcgdGhlIHRpbWUgd2lsbCBiZSB6ZXJvZWQgKi9cbiAgdmFyIG1hY2hpbmUzQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KE1BQ0hJTkVfSUQsIDI0LCBmYWxzZSk7XG4gIHZhciBwaWQyQnl0ZXMgPSBCaW5hcnlQYXJzZXIuZnJvbVNob3J0KHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyA/IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMCkgOiBwcm9jZXNzLnBpZCk7XG4gIHZhciBpbmRleDNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQodGhpcy5nZXRfaW5jKCksIDI0LCBmYWxzZSwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHRpbWU0Qnl0ZXMgKyBtYWNoaW5lM0J5dGVzICsgcGlkMkJ5dGVzICsgaW5kZXgzQnl0ZXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHRoZSBpZCBpbnRvIGEgMjQgYnl0ZSBoZXggc3RyaW5nIGZvciBwcmludGluZ1xuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0byBpdHMgSlNPTiByZXByZXNlbnRhdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElkIHdpdGggYG90aGVySURgLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvdGhlcklEIE9iamVjdElkIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJZCdzXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKG90aGVySUQpIHtcbiAgaWYob3RoZXJJRCA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIHZhciBpZCA9IChvdGhlcklEIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgb3RoZXJJRC50b0hleFN0cmluZylcbiAgICA/IG90aGVySUQuaWRcbiAgICA6IE9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcob3RoZXJJRCkuaWQ7XG5cbiAgcmV0dXJuIHRoaXMuaWQgPT09IGlkO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge2RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldFRpbWVzdGFtcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgdGltZXN0YW1wLnNldFRpbWUoTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsNCksIDMyLCB0cnVlLCB0cnVlKSkgKiAxMDAwKTtcbiAgcmV0dXJuIHRpbWVzdGFtcDtcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5pbmRleCA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQuY3JlYXRlUGsgPSBmdW5jdGlvbiBjcmVhdGVQayAoKSB7XG4gIHJldHVybiBuZXcgT2JqZWN0SWQoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SWQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SWQuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZUZyb21UaW1lID0gZnVuY3Rpb24gY3JlYXRlRnJvbVRpbWUgKHRpbWUpIHtcbiAgdmFyIGlkID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aW1lLCAzMiwgdHJ1ZSwgdHJ1ZSkgK1xuICAgIEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoMCwgNjQsIHRydWUsIHRydWUpO1xuICByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJZCBmcm9tIGEgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gaGV4U3RyaW5nIGNyZWF0ZSBhIE9iamVjdElkIGZyb20gYSBwYXNzZWQgaW4gMjQgYnl0ZSBoZXhzdHJpbmcuXG4gKiBAcmV0dXJuIHtPYmplY3RJZH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElkXG4gKi9cbk9iamVjdElkLmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbiBjcmVhdGVGcm9tSGV4U3RyaW5nIChoZXhTdHJpbmcpIHtcbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZih0eXBlb2YgaGV4U3RyaW5nID09PSAndW5kZWZpbmVkJyB8fCBoZXhTdHJpbmcgIT0gbnVsbCAmJiBoZXhTdHJpbmcubGVuZ3RoICE9PSAyNClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVycycpO1xuXG4gIHZhciBsZW4gPSBoZXhTdHJpbmcubGVuZ3RoO1xuXG4gIGlmKGxlbiA+IDEyKjIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lkIGNhbm5vdCBiZSBsb25nZXIgdGhhbiAxMiBieXRlcycpO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9ICcnXG4gICAgLCBzdHJpbmdcbiAgICAsIG51bWJlcjtcblxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuOyBpbmRleCArPSAyKSB7XG4gICAgc3RyaW5nID0gaGV4U3RyaW5nLnN1YnN0cihpbmRleCwgMik7XG4gICAgbnVtYmVyID0gcGFyc2VJbnQoc3RyaW5nLCAxNik7XG4gICAgcmVzdWx0ICs9IEJpbmFyeVBhcnNlci5mcm9tQnl0ZShudW1iZXIpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJZChyZXN1bHQsIGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbk9iamVjdElkLmlzVmFsaWQgPSBmdW5jdGlvbiBpc1ZhbGlkKGlkKSB7XG4gIGlmKGlkID09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICBpZihpZCAhPSBudWxsICYmICdudW1iZXInICE9PSB0eXBlb2YgaWQgJiYgKGlkLmxlbmd0aCAhPT0gMTIgJiYgaWQubGVuZ3RoICE9PSAyNCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gQ2hlY2sgc3BlY2lmaWNhbGx5IGZvciBoZXggY29ycmVjdG5lc3NcbiAgICBpZih0eXBlb2YgaWQgPT09ICdzdHJpbmcnICYmIGlkLmxlbmd0aCA9PT0gMjQpIHJldHVybiBjaGVja0ZvckhleFJlZ0V4cC50ZXN0KGlkKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxuLyohXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3RJZC5wcm90b3R5cGUsICdnZW5lcmF0aW9uVGltZScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZVxuICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCw0KSwgMzIsIHRydWUsIHRydWUpKTtcbiAgfVxuICAsIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFsdWUgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHZhbHVlLCAzMiwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICB0aGlzLmlkID0gdmFsdWUgKyB0aGlzLmlkLnN1YnN0cig0KTtcbiAgICAvLyBkZWxldGUgdGhpcy5fX2lkO1xuICAgIHRoaXMudG9IZXhTdHJpbmcoKTtcbiAgfVxufSk7XG5cbi8qKlxuICogRXhwb3NlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xubW9kdWxlLmV4cG9ydHMuT2JqZWN0SWQgPSBPYmplY3RJZDtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyKXtcbid1c2Ugc3RyaWN0JztcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIG1wYXRoID0gcmVxdWlyZSgnLi9tcGF0aCcpXG4gICwgRG9jdW1lbnQ7XG5cbmV4cG9ydHMubXBhdGggPSBtcGF0aDtcblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIHJ1bGVzLlxuICpcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICpcbiAqL1xuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xuICBbLyhtKWFuJC9naSwgJyQxZW4nXSxcbiAgWy8ocGUpcnNvbiQvZ2ksICckMW9wbGUnXSxcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXG4gIFsvXihveCkkL2dpLCAnJDFlbiddLFxuICBbLyhheHx0ZXN0KWlzJC9naSwgJyQxZXMnXSxcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxuICBbLyhhbGlhc3xzdGF0dXMpJC9naSwgJyQxZXMnXSxcbiAgWy8oYnUpcyQvZ2ksICckMXNlcyddLFxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxuICBbLyhbdGldKXVtJC9naSwgJyQxYSddLFxuICBbL3NpcyQvZ2ksICdzZXMnXSxcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXG4gIFsvKGhpdmUpJC9naSwgJyQxcyddLFxuICBbLyhbXmFlaW91eV18cXUpeSQvZ2ksICckMWllcyddLFxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXG4gIFsvKG1hdHJ8dmVydHxpbmQpaXh8ZXgkL2dpLCAnJDFpY2VzJ10sXG4gIFsvKFttfGxdKW91c2UkL2dpLCAnJDFpY2UnXSxcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcbiAgWy8ocXVpeikkL2dpLCAnJDF6ZXMnXSxcbiAgWy9zJC9naSwgJ3MnXSxcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcbiAgWy8kL2dpLCAncyddXG5dO1xudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xuXG4vKipcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxuICpcbiAqIFRoZXNlIHdvcmRzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0cy51bmNvdW50YWJsZXMgPSBbXG4gICdhZHZpY2UnLFxuICAnZW5lcmd5JyxcbiAgJ2V4Y3JldGlvbicsXG4gICdkaWdlc3Rpb24nLFxuICAnY29vcGVyYXRpb24nLFxuICAnaGVhbHRoJyxcbiAgJ2p1c3RpY2UnLFxuICAnbGFib3VyJyxcbiAgJ21hY2hpbmVyeScsXG4gICdlcXVpcG1lbnQnLFxuICAnaW5mb3JtYXRpb24nLFxuICAncG9sbHV0aW9uJyxcbiAgJ3Nld2FnZScsXG4gICdwYXBlcicsXG4gICdtb25leScsXG4gICdzcGVjaWVzJyxcbiAgJ3NlcmllcycsXG4gICdyYWluJyxcbiAgJ3JpY2UnLFxuICAnZmlzaCcsXG4gICdzaGVlcCcsXG4gICdtb29zZScsXG4gICdkZWVyJyxcbiAgJ25ld3MnLFxuICAnZXhwZXJ0aXNlJyxcbiAgJ3N0YXR1cycsXG4gICdtZWRpYSdcbl07XG52YXIgdW5jb3VudGFibGVzID0gZXhwb3J0cy51bmNvdW50YWJsZXM7XG5cbi8qIVxuICogUGx1cmFsaXplIGZ1bmN0aW9uLlxuICpcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0byBwbHVyYWxpemVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGx1cmFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgZm91bmQ7XG4gIGlmICghfnVuY291bnRhYmxlcy5pbmRleE9mKHN0ci50b0xvd2VyQ2FzZSgpKSl7XG4gICAgZm91bmQgPSBydWxlcy5maWx0ZXIoZnVuY3Rpb24ocnVsZSl7XG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xuICAgIH0pO1xuICAgIGlmIChmb3VuZFswXSkgcmV0dXJuIHN0ci5yZXBsYWNlKGZvdW5kWzBdWzBdLCBmb3VuZFswXVsxXSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbi8qIVxuICogRGV0ZXJtaW5lcyBpZiBgYWAgYW5kIGBiYCBhcmUgZGVlcCBlcXVhbC5cbiAqXG4gKiBNb2RpZmllZCBmcm9tIG5vZGUvbGliL2Fzc2VydC5qc1xuICogTW9kaWZpZWQgZnJvbSBtb25nb29zZS91dGlscy5qc1xuICpcbiAqIEBwYXJhbSB7Kn0gYSBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGJgXG4gKiBAcGFyYW0geyp9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAoYSBpbnN0YW5jZW9mIE9iamVjdElkICYmIGIgaW5zdGFuY2VvZiBPYmplY3RJZCkge1xuICAgIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBTdG9yYWdlTnVtYmVyc1xuICBpZiAoYSBpbnN0YW5jZW9mIE51bWJlciAmJiBiIGluc3RhbmNlb2YgTnVtYmVyKSB7XG4gICAgcmV0dXJuIGEudmFsdWVPZigpID09PSBiLnZhbHVlT2YoKTtcbiAgfVxuXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoYSkpIHtcbiAgICByZXR1cm4gYS5lcXVhbHMoYik7XG4gIH1cblxuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09PSB0eXBlb2Ygb1xuICAgICAgJiYgJ1tvYmplY3QgUmVnRXhwXScgPT09IHRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIGNsb25lUmVnRXhwIChyZWdleHApIHtcbiAgaWYgKCFpc1JlZ0V4cChyZWdleHApKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGEgUmVnRXhwJyk7XG4gIH1cblxuICB2YXIgZmxhZ3MgPSBbXTtcbiAgaWYgKHJlZ2V4cC5nbG9iYWwpIGZsYWdzLnB1c2goJ2cnKTtcbiAgaWYgKHJlZ2V4cC5tdWx0aWxpbmUpIGZsYWdzLnB1c2goJ20nKTtcbiAgaWYgKHJlZ2V4cC5pZ25vcmVDYXNlKSBmbGFncy5wdXNoKCdpJyk7XG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIGZsYWdzLmpvaW4oJycpKTtcbn1cblxuLyohXG4gKiBPYmplY3QgY2xvbmUgd2l0aCBTdG9yYWdlIG5hdGl2ZXMgc3VwcG9ydC5cbiAqXG4gKiBJZiBvcHRpb25zLm1pbmltaXplIGlzIHRydWUsIGNyZWF0ZXMgYSBtaW5pbWFsIGRhdGEgb2JqZWN0LiBFbXB0eSBvYmplY3RzIGFuZCB1bmRlZmluZWQgdmFsdWVzIHdpbGwgbm90IGJlIGNsb25lZC4gVGhpcyBtYWtlcyB0aGUgZGF0YSBwYXlsb2FkIHNlbnQgdG8gTW9uZ29EQiBhcyBzbWFsbCBhcyBwb3NzaWJsZS5cbiAqXG4gKiBGdW5jdGlvbnMgYXJlIG5ldmVyIGNsb25lZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gY2xvbmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBjbG9uZWQgb2JqZWN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lIChvYmosIG9wdGlvbnMpIHtcbiAgaWYgKG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbClcbiAgICByZXR1cm4gb2JqO1xuXG4gIGlmICggXy5pc0FycmF5KCBvYmogKSApIHtcbiAgICByZXR1cm4gY2xvbmVBcnJheSggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIGlzU3RvcmFnZU9iamVjdCggb2JqICkgKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5qc29uICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiBvYmoudG9KU09OKSB7XG4gICAgICByZXR1cm4gb2JqLnRvSlNPTiggb3B0aW9ucyApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2JqLnRvT2JqZWN0KCBvcHRpb25zICk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmouY29uc3RydWN0b3IgKSB7XG4gICAgc3dpdGNoICggZ2V0RnVuY3Rpb25OYW1lKCBvYmouY29uc3RydWN0b3IgKSkge1xuICAgICAgY2FzZSAnT2JqZWN0JzpcbiAgICAgICAgcmV0dXJuIGNsb25lT2JqZWN0KG9iaiwgb3B0aW9ucyk7XG4gICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgcmV0dXJuIG5ldyBvYmouY29uc3RydWN0b3IoICtvYmogKTtcbiAgICAgIGNhc2UgJ1JlZ0V4cCc6XG4gICAgICAgIHJldHVybiBjbG9uZVJlZ0V4cCggb2JqICk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBpZ25vcmVcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmogaW5zdGFuY2VvZiBPYmplY3RJZCApIHtcbiAgICBpZiAoIG9wdGlvbnMuZGVwb3B1bGF0ZSApe1xuICAgICAgcmV0dXJuIG9iai50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgT2JqZWN0SWQoIG9iai5pZCApO1xuICB9XG5cbiAgaWYgKCAhb2JqLmNvbnN0cnVjdG9yICYmIF8uaXNPYmplY3QoIG9iaiApICkge1xuICAgIC8vIG9iamVjdCBjcmVhdGVkIHdpdGggT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIHJldHVybiBjbG9uZU9iamVjdCggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIG9iai52YWx1ZU9mICl7XG4gICAgcmV0dXJuIG9iai52YWx1ZU9mKCk7XG4gIH1cbn07XG52YXIgY2xvbmUgPSBleHBvcnRzLmNsb25lO1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAob2JqLCBvcHRpb25zKSB7XG4gIHZhciByZXRhaW5LZXlPcmRlciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5yZXRhaW5LZXlPcmRlclxuICAgICwgbWluaW1pemUgPSBvcHRpb25zICYmIG9wdGlvbnMubWluaW1pemVcbiAgICAsIHJldCA9IHt9XG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlzXG4gICAgLCB2YWxcbiAgICAsIGtcbiAgICAsIGk7XG5cbiAgaWYgKCByZXRhaW5LZXlPcmRlciApIHtcbiAgICBmb3IgKGsgaW4gb2JqKSB7XG4gICAgICB2YWwgPSBjbG9uZSggb2JqW2tdLCBvcHRpb25zICk7XG5cbiAgICAgIGlmICggIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkgKSB7XG4gICAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBmYXN0ZXJcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgayA9IGtleXNbaV07XG4gICAgICB2YWwgPSBjbG9uZShvYmpba10sIG9wdGlvbnMpO1xuXG4gICAgICBpZiAoIW1pbmltaXplIHx8ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbCkpIHtcbiAgICAgICAgaWYgKCFoYXNLZXlzKSBoYXNLZXlzID0gdHJ1ZTtcbiAgICAgICAgcmV0W2tdID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtaW5pbWl6ZVxuICAgID8gaGFzS2V5cyAmJiByZXRcbiAgICA6IHJldDtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoYXJyLCBvcHRpb25zKSB7XG4gIHZhciByZXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcmV0LnB1c2goIGNsb25lKCBhcnJbaV0sIG9wdGlvbnMgKSApO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qIVxuICogTWVyZ2VzIGBmcm9tYCBpbnRvIGB0b2Agd2l0aG91dCBvdmVyd3JpdGluZyBleGlzdGluZyBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb21cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UgKHRvLCBmcm9tKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRvW2tleV0pIHtcbiAgICAgIHRvW2tleV0gPSBmcm9tW2tleV07XG4gICAgfSBlbHNlIGlmICggXy5pc09iamVjdChmcm9tW2tleV0pICkge1xuICAgICAgbWVyZ2UodG9ba2V5XSwgZnJvbVtrZXldKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogR2VuZXJhdGVzIGEgcmFuZG9tIHN0cmluZ1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucmFuZG9tID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygpLnN1YnN0cigzKTtcbn07XG5cblxuLyohXG4gKiBSZXR1cm5zIGlmIGB2YCBpcyBhIHN0b3JhZ2Ugb2JqZWN0IHRoYXQgaGFzIGEgYHRvT2JqZWN0KClgIG1ldGhvZCB3ZSBjYW4gdXNlLlxuICpcbiAqIFRoaXMgaXMgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBsaWJzIGxpa2UgRGF0ZS5qcyB3aGljaCBkbyBmb29saXNoIHRoaW5ncyB0byBOYXRpdmVzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdlxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0ID0gZnVuY3Rpb24gKCB2ICkge1xuICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JykpO1xuXG4gIHJldHVybiB2IGluc3RhbmNlb2YgRG9jdW1lbnQgfHxcbiAgICAgICAoIHYgJiYgdi5pc1N0b3JhZ2VBcnJheSApO1xufTtcbnZhciBpc1N0b3JhZ2VPYmplY3QgPSBleHBvcnRzLmlzU3RvcmFnZU9iamVjdDtcblxuLyohXG4gKiBSZXR1cm4gdGhlIHZhbHVlIG9mIGBvYmpgIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLmdldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIG9iaiwgbWFwKSB7XG4gIHJldHVybiBtcGF0aC5nZXQocGF0aCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG4vKiFcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGBvYmpgIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7QW55dGhpbmd9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICovXG5cbmV4cG9ydHMuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvYmosIG1hcCkge1xuICBtcGF0aC5zZXQocGF0aCwgdmFsLCBvYmosICdfZG9jJywgbWFwKTtcbn07XG5cbnZhciByRnVuY3Rpb25OYW1lID0gL15mdW5jdGlvblxccyooW15cXHMoXSspLztcblxuZnVuY3Rpb24gZ2V0RnVuY3Rpb25OYW1lKCBjdG9yICl7XG4gIGlmIChjdG9yLm5hbWUpIHtcbiAgICByZXR1cm4gY3Rvci5uYW1lO1xuICB9XG4gIHJldHVybiAoY3Rvci50b1N0cmluZygpLnRyaW0oKS5tYXRjaCggckZ1bmN0aW9uTmFtZSApIHx8IFtdKVsxXTtcbn1cblxuZXhwb3J0cy5nZXRGdW5jdGlvbk5hbWUgPSBnZXRGdW5jdGlvbk5hbWU7XG5cbmV4cG9ydHMuc2V0SW1tZWRpYXRlID0gKGZ1bmN0aW9uKCkge1xuICAvLyDQlNC70Y8g0L/QvtC00LTQtdGA0LbQutC4INGC0LXRgdGC0L7QsiAo0L7QutGA0YPQttC10L3QuNC1IG5vZGUuanMpXG4gIGlmICggdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayApIHJldHVybiBwcm9jZXNzLm5leHRUaWNrO1xuICAvLyDQldGB0LvQuCDQsiDQsdGA0LDRg9C30LXRgNC1INGD0LbQtSDRgNC10LDQu9C40LfQvtCy0LDQvSDRjdGC0L7RgiDQvNC10YLQvtC0XG4gIGlmICggd2luZG93LnNldEltbWVkaWF0ZSApIHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuXG4gIHZhciBoZWFkID0geyB9LCB0YWlsID0gaGVhZDsgLy8g0L7Rh9C10YDQtdC00Ywg0LLRi9C30L7QstC+0LIsIDEt0YHQstGP0LfQvdGL0Lkg0YHQv9C40YHQvtC6XG5cbiAgdmFyIElEID0gTWF0aC5yYW5kb20oKTsgLy8g0YPQvdC40LrQsNC70YzQvdGL0Lkg0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YBcblxuICBmdW5jdGlvbiBvbm1lc3NhZ2UoZSkge1xuICAgIGlmKGUuZGF0YSAhPSBJRCkgcmV0dXJuOyAvLyDQvdC1INC90LDRiNC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgdmFyIGZ1bmMgPSBoZWFkLmZ1bmM7XG4gICAgZGVsZXRlIGhlYWQuZnVuYztcbiAgICBmdW5jKCk7XG4gIH1cblxuICBpZih3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikgeyAvLyBJRTkrLCDQtNGA0YPQs9C40LUg0LHRgNCw0YPQt9C10YDRi1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25tZXNzYWdlLCBmYWxzZSk7XG4gIH0gZWxzZSB7IC8vIElFOFxuICAgIHdpbmRvdy5hdHRhY2hFdmVudCggJ29ubWVzc2FnZScsIG9ubWVzc2FnZSApO1xuICB9XG5cbiAgcmV0dXJuIHdpbmRvdy5wb3N0TWVzc2FnZSA/IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB0YWlsID0gdGFpbC5uZXh0ID0geyBmdW5jOiBmdW5jIH07XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKElELCAnKicpO1xuICB9IDpcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XG4gICAgc2V0VGltZW91dChmdW5jLCAwKTtcbiAgfTtcbn0oKSk7XG5cbi8vIFBoYW50b21KUyBkb2Vzbid0IHN1cHBvcnQgYmluZCB5ZXRcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8g0LHQu9C40LbQsNC50YjQuNC5INCw0L3QsNC70L7QsyDQstC90YPRgtGA0LXQvdC90LXQuSDRhNGD0L3QutGG0LjQuFxuICAgICAgLy8gSXNDYWxsYWJsZSDQsiBFQ01BU2NyaXB0IDVcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QICYmIG9UaGlzXG4gICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIH07XG5cbiAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcikiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBUaGlzIGlzIHdoYXQgbW9uZ29vc2UgdXNlcyB0byBkZWZpbmUgdmlydHVhbCBhdHRyaWJ1dGVzIHZpYSBgU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgZnVsbG5hbWUgaW5zdGFuY2VvZiBtb25nb29zZS5WaXJ0dWFsVHlwZSAvLyB0cnVlXG4gKlxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gVmlydHVhbFR5cGUgKG9wdGlvbnMsIG5hbWUpIHtcbiAgdGhpcy5wYXRoID0gbmFtZTtcbiAgdGhpcy5nZXR0ZXJzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufVxuXG4vKipcbiAqIERlZmluZXMgYSBnZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5nZXQoZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XG4gKiAgICAgdmlydHVhbC5zZXQoZnVuY3Rpb24gKHYpIHtcbiAqICAgICAgIHZhciBwYXJ0cyA9IHYuc3BsaXQoJyAnKTtcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xuICogICAgICAgdGhpcy5uYW1lLmxhc3QgPSBwYXJ0c1sxXTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLnNldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcmV0dXJuIHsqfSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4geyp9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgc2V0dGVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICB2YXIgdiA9IHZhbHVlO1xuICBmb3IgKHZhciBsID0gdGhpcy5zZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gdjtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBzdWJqZWN0ID4gMCA/IHN1YmplY3QgPj4+IDAgOiAwXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JylcbiAgICAgIHN1YmplY3QgPSBiYXNlNjRjbGVhbihzdWJqZWN0KVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAodGhpcy5sZW5ndGggPiBrTWF4TGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSAoKHN1YmplY3RbaV0gJSAyNTYpICsgMjU2KSAlIDI1NlxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZighQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heClcbiAgICAgIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKGJ5dGUpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiB1dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGFzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW47XG4gICAgaWYgKHN0YXJ0IDwgMClcbiAgICAgIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKVxuICAgICAgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KVxuICAgIGVuZCA9IHN0YXJ0XG5cbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSlcbiAgICByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgaWYgKHRhcmdldF9zdGFydCA8IDAgfHwgdGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHNvdXJjZS5sZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdmFsdWVcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gdXRmOFRvQnl0ZXModmFsdWUudG9TdHJpbmcoKSlcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLXpdL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKSB7XG4gICAgICBieXRlQXJyYXkucHVzaChiKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSClcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldO1xuXG4gIGkgKz0gZDtcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgcyA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IGVMZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBlID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gbUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzO1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSk7XG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICBlID0gZSAtIGVCaWFzO1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pO1xufTtcblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG4iLCJcbi8qKlxuICogaXNBcnJheVxuICovXG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiB0b1N0cmluZ1xuICovXG5cbnZhciBzdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIFdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiBgdmFsYFxuICogaXMgYW4gYXJyYXkuXG4gKlxuICogZXhhbXBsZTpcbiAqXG4gKiAgICAgICAgaXNBcnJheShbXSk7XG4gKiAgICAgICAgLy8gPiB0cnVlXG4gKiAgICAgICAgaXNBcnJheShhcmd1bWVudHMpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqICAgICAgICBpc0FycmF5KCcnKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKlxuICogQHBhcmFtIHttaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtib29sfVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gaXNBcnJheSB8fCBmdW5jdGlvbiAodmFsKSB7XG4gIHJldHVybiAhISB2YWwgJiYgJ1tvYmplY3QgQXJyYXldJyA9PSBzdHIuY2FsbCh2YWwpO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInN0b3JhZ2UuanNcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcInN0b3JhZ2UuanNcIixcbiAgXCJhdXRob3JcIjogXCJDb25zdGFudGluZSBNZWxuaWtvdiA8a2EubWVsbmlrb3ZAZ21haWwuY29tPlwiLFxuICBcIm1haW50YWluZXJzXCI6IFwiQ29uc3RhbnRpbmUgTWVsbmlrb3YgPGthLm1lbG5pa292QGdtYWlsLmNvbT5cIixcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9hcmNoYW5nZWwtaXJrL3N0b3JhZ2UuZ2l0XCJcbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcInRlc3RcIjogXCJncnVudCB0ZXN0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZ3J1bnRcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWNvbnRyaWItanNoaW50XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJncnVudC1jb250cmliLXVnbGlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi13YXRjaFwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcImxhdGVzdFwiLFxuICAgIFwiZ3J1bnQta2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImdydW50LWthcm1hLWNvdmVyYWxsc1wiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWFcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtY2hhaVwiOiBcImxhdGVzdFwiLFxuICAgIFwia2FybWEtcGhhbnRvbWpzLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1jaHJvbWUtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWZpcmVmb3gtbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLWllLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJrYXJtYS1zYWZhcmktbGF1bmNoZXJcIjogXCJsYXRlc3RcIixcbiAgICBcImthcm1hLXNhdWNlLWxhdW5jaGVyXCI6IFwibGF0ZXN0XCIsXG4gICAgXCJ0aW1lLWdydW50XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwibGF0ZXN0XCIsXG4gICAgXCJkb3hcIjogXCJsYXRlc3RcIixcbiAgICBcImhpZ2hsaWdodC5qc1wiOiBcImxhdGVzdFwiLFxuICAgIFwiamFkZVwiOiBcImxhdGVzdFwiXG4gIH1cbn0iXX0=
