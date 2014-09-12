!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/**
 * Binary Parser.
 * Jonas Raoni Soares Silva
 * http://jsfromhell.com/classes/binary-parser [v1.0]
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
};

BinaryParser.warn = function warn (msg) {
	if (this.allowExceptions) {
		throw new Error(msg);
  }

	return 1;
};

BinaryParser.decodeFloat = function decodeFloat (data, precisionBits, exponentBits) {
	var b = new this.Buffer(this.bigEndian, data);

	b.checkBuffer(precisionBits + exponentBits + 1);

	var bias = maxBits[exponentBits - 1] - 1
    , signal = b.readBits(precisionBits + exponentBits, 1)
    , exponent = b.readBits(precisionBits, exponentBits)
    , significand = 0
    , divisor = 2
    , curByte = b.buffer.length + (-precisionBits >> 3) - 1;

	do {
		for (var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit; mask >>= 1; ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2 );
	} while (precisionBits -= startBit);

	return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) * ( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );
};

BinaryParser.decodeInt = function decodeInt (data, bits, signed, forceBigEndian) {
  var b = new this.Buffer(this.bigEndian || forceBigEndian, data)
      , x = b.readBits(0, bits)
      , max = maxBits[bits]; //max = Math.pow( 2, bits );
  
  return signed && x >= max / 2
      ? x - max
      : x;
};

BinaryParser.encodeFloat = function encodeFloat (data, precisionBits, exponentBits) {
	var bias = maxBits[exponentBits - 1] - 1
    , minExp = -bias + 1
    , maxExp = bias
    , minUnnormExp = minExp - precisionBits
    , n = parseFloat(data)
    , status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0
    ,	exp = 0
    , len = 2 * bias + 1 + precisionBits + 3
    , bin = new Array(len)
    , signal = (n = status !== 0 ? 0 : n) < 0
    , intPart = Math.floor(n = Math.abs(n))
    , floatPart = n - intPart
    , lastBit
    , rounded
    , result
    , i
    , j;

	for (i = len; i; bin[--i] = 0);

	for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));

	for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);

	for (i = -1; ++i < len && !bin[i];);

	if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
		if (!(rounded = bin[lastBit])) {
			for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
		}

		for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
	}

	for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);

	if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
		++i;
  } else if (exp < minExp) {
		exp != bias + 1 - len && exp < minUnnormExp && this.warn("encodeFloat::float underflow");
		i = bias + 1 - (exp = minExp - 1);
	}

	if (intPart || status !== 0) {
		this.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
		exp = maxExp + 1;
		i = bias + 2;

		if (status == -Infinity) {
			signal = 1;
    } else if (isNaN(status)) {
			bin[i] = 1;
    }
	}

	for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);

	for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
		n += (1 << j) * result.charAt(--i);
		if (j == 7) {
			r[r.length] = String.fromCharCode(n);
			n = 0;
		}
	}

	r[r.length] = n
    ? String.fromCharCode(n)
    : "";

	return (this.bigEndian ? r.reverse() : r).join("");
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
BinaryParser.toFloat    = function( data ){ return this.decodeFloat( data, 23, 8   ); };
BinaryParser.fromFloat  = function( data ){ return this.encodeFloat( data, 23, 8   ); };
BinaryParser.toDouble   = function( data ){ return this.decodeFloat( data, 52, 11  ); };
BinaryParser.fromDouble = function( data ){ return this.encodeFloat( data, 52, 11  ); };

// Factor out the encode so it can be shared by add_header and push_int32
BinaryParser.encode_int32 = function encode_int32 (number, asArray) {
  var a, b, c, d, unsigned;
  unsigned = (number < 0) ? (number + 0x100000000) : number;
  a = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  b = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  c = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  d = Math.floor(unsigned);
  return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
};

BinaryParser.encode_int64 = function encode_int64 (number) {
  var a, b, c, d, e, f, g, h, unsigned;
  unsigned = (number < 0) ? (number + 0x10000000000000000) : number;
  a = Math.floor(unsigned / 0xffffffffffffff);
  unsigned &= 0xffffffffffffff;
  b = Math.floor(unsigned / 0xffffffffffff);
  unsigned &= 0xffffffffffff;
  c = Math.floor(unsigned / 0xffffffffff);
  unsigned &= 0xffffffffff;
  d = Math.floor(unsigned / 0xffffffff);
  unsigned &= 0xffffffff;
  e = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  f = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  g = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  h = Math.floor(unsigned);
  return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
};

/**
 * UTF8 methods
 */

// Take a raw binary string and return a utf8 string
BinaryParser.decode_utf8 = function decode_utf8 (binaryStr) {
  var len = binaryStr.length
    , decoded = ''
    , i = 0
    , c = 0
    , c1 = 0
    , c2 = 0
    , c3;

  while (i < len) {
    c = binaryStr.charCodeAt(i);
    if (c < 128) {
      decoded += String.fromCharCode(c);
      i++;
    } else if ((c > 191) && (c < 224)) {
	    c2 = binaryStr.charCodeAt(i+1);
      decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      i += 2;
    } else {
	    c2 = binaryStr.charCodeAt(i+1);
	    c3 = binaryStr.charCodeAt(i+2);
      decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      i += 3;
    }
  }

  return decoded;
};

// Encode a cstring
BinaryParser.encode_cstring = function encode_cstring (s) {
  return unescape(encodeURIComponent(s)) + BinaryParser.fromByte(0);
};

// Take a utf8 string and return a binary string
BinaryParser.encode_utf8 = function encode_utf8 (s) {
  var a = ""
    , c;

  for (var n = 0, len = s.length; n < len; n++) {
    c = s.charCodeAt(n);

    if (c < 128) {
	    a += String.fromCharCode(c);
    } else if ((c > 127) && (c < 2048)) {
	    a += String.fromCharCode((c>>6) | 192) ;
	    a += String.fromCharCode((c&63) | 128);
    } else {
      a += String.fromCharCode((c>>12) | 224);
      a += String.fromCharCode(((c>>6) & 63) | 128);
      a += String.fromCharCode((c&63) | 128);
    }
  }

  return a;
};

BinaryParser.hprint = function hprint (s) {
  var number;

  for (var i = 0, len = s.length; i < len; i++) {
    if (s.charCodeAt(i) < 32) {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(16)
        : s.charCodeAt(i).toString(16);        
      process.stdout.write(number + " ")
    } else {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(16)
        : s.charCodeAt(i).toString(16);
        process.stdout.write(number + " ")
    }
  }
  
  process.stdout.write("\n\n");
};

BinaryParser.ilprint = function hprint (s) {
  var number;

  for (var i = 0, len = s.length; i < len; i++) {
    if (s.charCodeAt(i) < 32) {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(10)
        : s.charCodeAt(i).toString(10);

      require('util').debug(number+' : ');
    } else {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(10)
        : s.charCodeAt(i).toString(10);
      require('util').debug(number+' : '+ s.charAt(i));
    }
  }
};

BinaryParser.hlprint = function hprint (s) {
  var number;

  for (var i = 0, len = s.length; i < len; i++) {
    if (s.charCodeAt(i) < 32) {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(16)
        : s.charCodeAt(i).toString(16);
      require('util').debug(number+' : ');
    } else {
      number = s.charCodeAt(i) <= 15
        ? "0" + s.charCodeAt(i).toString(16)
        : s.charCodeAt(i).toString(16);
      require('util').debug(number+' : '+ s.charAt(i));
    }
  }
};

/**
 * BinaryParser buffer constructor.
 */
function BinaryParserBuffer (bigEndian, buffer) {
  this.bigEndian = bigEndian || 0;
  this.buffer = [];
  this.setBuffer(buffer);
};

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

}).call(this,require('_process'))
},{"_process":33,"util":35}],2:[function(require,module,exports){
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

},{"./document":3,"./schema":13}],3:[function(require,module,exports){
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
    //todo: throw new mongoose.Error.MissingSchemaError(name);
    throw new TypeError('Нельзя создавать документ без схемы');
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

    self.adapterHooks.documentDefineProperty.call( self, self, path, prototype );
  }
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

},{"./error":4,"./events":9,"./internal":11,"./schema":13,"./schema/mixed":19,"./schematype":23,"./types/documentarray":26,"./types/embedded":27,"./types/objectid":29,"./utils":30}],4:[function(require,module,exports){
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
//StorageError.MissingSchemaError = require('./error/missingSchema');
//StorageError.DivergentArrayError = require('./error/divergentArray');

},{"./error/cast":5,"./error/messages":6,"./error/validation":7,"./error/validator":8}],5:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var StorageError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
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

},{"../error.js":4}],8:[function(require,module,exports){
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

},{"../error.js":4}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./collection":2,"./document":3,"./error":4,"./schema":13,"./schematype":23,"./statemachine":24,"./types":28,"./utils":30,"./virtualtype":31}],11:[function(require,module,exports){
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

},{"./statemachine":24}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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

},{"./events":9,"./schema/index":18,"./utils":30,"./virtualtype":31}],14:[function(require,module,exports){
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

},{"../schematype":23,"../types/array":25,"../types/embedded":27,"../utils":30,"./boolean":15,"./date":16,"./mixed":19,"./number":20,"./objectid":21,"./string":22}],15:[function(require,module,exports){
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

},{"../schematype":23}],16:[function(require,module,exports){
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

},{"../schematype":23}],17:[function(require,module,exports){

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
  for (var i in schema.statics) {
    EmbeddedDocument[i] = schema.statics[i];
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

      ;(function (i) {
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

},{"../document":3,"../schematype":23,"../types/documentarray":26,"../types/embedded":27,"./array":14}],18:[function(require,module,exports){

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

},{"./array":14,"./boolean":15,"./date":16,"./documentarray":17,"./mixed":19,"./number":20,"./objectid":21,"./string":22}],19:[function(require,module,exports){
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
Mixed.prototype.cast = function (val) {
  return val;
};

/*!
 * Module exports.
 */

module.exports = Mixed;

},{"../schematype":23}],20:[function(require,module,exports){
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
    if (val instanceof Number) return val
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

},{"../error":4,"../schematype":23}],21:[function(require,module,exports){
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

    var doc = new Document( value, undefined, storage.schemas[ schema ] );
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

},{"../schematype":23,"../types/objectid":29,"../utils":30,"./../document":3}],22:[function(require,module,exports){
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

},{"../error":4,"../schematype":23}],23:[function(require,module,exports){
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
 * @param {String} [errorMsg] optional error message
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

},{"./error":4,"./utils":30}],24:[function(require,module,exports){
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


},{}],25:[function(require,module,exports){
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

},{"../document":3,"../utils":30,"./embedded":27,"./objectid":29}],26:[function(require,module,exports){
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

},{"../document":3,"../schema/objectid":21,"../utils":30,"./array":25,"./objectid":29}],27:[function(require,module,exports){
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

},{"../document":3}],28:[function(require,module,exports){

/*!
 * Module exports.
 */

exports.Array = require('./array');

exports.Embedded = require('./embedded');

exports.DocumentArray = require('./documentarray');
exports.ObjectId = require('./objectid');

},{"./array":25,"./documentarray":26,"./embedded":27,"./objectid":29}],29:[function(require,module,exports){
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
 * @class Represents a BSON ObjectId type.
 * @param {(string|number)} id Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @property {number} generationTime The generation time of this ObjectId instance
 * @return {ObjectId} instance of ObjectId.
 */
function ObjectId(id) {
  if(!(this instanceof ObjectId)) return new ObjectId(id);
  if((id instanceof ObjectId)) return id;

  this._bsontype = 'ObjectId';
  var __id = null;
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
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @ignore
 */
ObjectId.prototype.inspect = ObjectId.prototype.toString;

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
}

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
}

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
},{"../binary_parser":1,"_process":33}],30:[function(require,module,exports){
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
}

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
},{"./document":3,"./mpath":12,"./types/objectid":29,"_process":33}],31:[function(require,module,exports){

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

},{}],32:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

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

},{}],34:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],35:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":34,"_process":33,"inherits":32}]},{},[10])(10)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9iaW5hcnlfcGFyc2VyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9kb2N1bWVudC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL2Nhc3QuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2Vycm9yL21lc3NhZ2VzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0aW9uLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9lcnJvci92YWxpZGF0b3IuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2V2ZW50cy5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvaW5kZXguanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL2ludGVybmFsLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9tcGF0aC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9ib29sZWFuLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvZGF0ZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvc2NoZW1hL21peGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvbnVtYmVyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi9zY2hlbWEvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYS9zdHJpbmcuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3NjaGVtYXR5cGUuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3N0YXRlbWFjaGluZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3R5cGVzL2VtYmVkZGVkLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9saWIvdHlwZXMvb2JqZWN0aWQuanMiLCIvVXNlcnMvaXJpbmEvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL2xpYi92aXJ0dWFsdHlwZS5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9pcmluYS9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiL1VzZXJzL2lyaW5hL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzl5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQmluYXJ5IFBhcnNlci5cbiAqIEpvbmFzIFJhb25pIFNvYXJlcyBTaWx2YVxuICogaHR0cDovL2pzZnJvbWhlbGwuY29tL2NsYXNzZXMvYmluYXJ5LXBhcnNlciBbdjEuMF1cbiAqL1xudmFyIGNociA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbnZhciBtYXhCaXRzID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcblx0bWF4Qml0c1tpXSA9IE1hdGgucG93KDIsIGkpO1xufVxuXG5mdW5jdGlvbiBCaW5hcnlQYXJzZXIgKGJpZ0VuZGlhbiwgYWxsb3dFeGNlcHRpb25zKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIEJpbmFyeVBhcnNlcikpIHJldHVybiBuZXcgQmluYXJ5UGFyc2VyKGJpZ0VuZGlhbiwgYWxsb3dFeGNlcHRpb25zKTtcbiAgXG5cdHRoaXMuYmlnRW5kaWFuID0gYmlnRW5kaWFuO1xuXHR0aGlzLmFsbG93RXhjZXB0aW9ucyA9IGFsbG93RXhjZXB0aW9ucztcbn07XG5cbkJpbmFyeVBhcnNlci53YXJuID0gZnVuY3Rpb24gd2FybiAobXNnKSB7XG5cdGlmICh0aGlzLmFsbG93RXhjZXB0aW9ucykge1xuXHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cblx0cmV0dXJuIDE7XG59O1xuXG5CaW5hcnlQYXJzZXIuZGVjb2RlRmxvYXQgPSBmdW5jdGlvbiBkZWNvZGVGbG9hdCAoZGF0YSwgcHJlY2lzaW9uQml0cywgZXhwb25lbnRCaXRzKSB7XG5cdHZhciBiID0gbmV3IHRoaXMuQnVmZmVyKHRoaXMuYmlnRW5kaWFuLCBkYXRhKTtcblxuXHRiLmNoZWNrQnVmZmVyKHByZWNpc2lvbkJpdHMgKyBleHBvbmVudEJpdHMgKyAxKTtcblxuXHR2YXIgYmlhcyA9IG1heEJpdHNbZXhwb25lbnRCaXRzIC0gMV0gLSAxXG4gICAgLCBzaWduYWwgPSBiLnJlYWRCaXRzKHByZWNpc2lvbkJpdHMgKyBleHBvbmVudEJpdHMsIDEpXG4gICAgLCBleHBvbmVudCA9IGIucmVhZEJpdHMocHJlY2lzaW9uQml0cywgZXhwb25lbnRCaXRzKVxuICAgICwgc2lnbmlmaWNhbmQgPSAwXG4gICAgLCBkaXZpc29yID0gMlxuICAgICwgY3VyQnl0ZSA9IGIuYnVmZmVyLmxlbmd0aCArICgtcHJlY2lzaW9uQml0cyA+PiAzKSAtIDE7XG5cblx0ZG8ge1xuXHRcdGZvciAodmFyIGJ5dGVWYWx1ZSA9IGIuYnVmZmVyWyArK2N1ckJ5dGUgXSwgc3RhcnRCaXQgPSBwcmVjaXNpb25CaXRzICUgOCB8fCA4LCBtYXNrID0gMSA8PCBzdGFydEJpdDsgbWFzayA+Pj0gMTsgKCBieXRlVmFsdWUgJiBtYXNrICkgJiYgKCBzaWduaWZpY2FuZCArPSAxIC8gZGl2aXNvciApLCBkaXZpc29yICo9IDIgKTtcblx0fSB3aGlsZSAocHJlY2lzaW9uQml0cyAtPSBzdGFydEJpdCk7XG5cblx0cmV0dXJuIGV4cG9uZW50ID09ICggYmlhcyA8PCAxICkgKyAxID8gc2lnbmlmaWNhbmQgPyBOYU4gOiBzaWduYWwgPyAtSW5maW5pdHkgOiArSW5maW5pdHkgOiAoIDEgKyBzaWduYWwgKiAtMiApICogKCBleHBvbmVudCB8fCBzaWduaWZpY2FuZCA/ICFleHBvbmVudCA/IE1hdGgucG93KCAyLCAtYmlhcyArIDEgKSAqIHNpZ25pZmljYW5kIDogTWF0aC5wb3coIDIsIGV4cG9uZW50IC0gYmlhcyApICogKCAxICsgc2lnbmlmaWNhbmQgKSA6IDAgKTtcbn07XG5cbkJpbmFyeVBhcnNlci5kZWNvZGVJbnQgPSBmdW5jdGlvbiBkZWNvZGVJbnQgKGRhdGEsIGJpdHMsIHNpZ25lZCwgZm9yY2VCaWdFbmRpYW4pIHtcbiAgdmFyIGIgPSBuZXcgdGhpcy5CdWZmZXIodGhpcy5iaWdFbmRpYW4gfHwgZm9yY2VCaWdFbmRpYW4sIGRhdGEpXG4gICAgICAsIHggPSBiLnJlYWRCaXRzKDAsIGJpdHMpXG4gICAgICAsIG1heCA9IG1heEJpdHNbYml0c107IC8vbWF4ID0gTWF0aC5wb3coIDIsIGJpdHMgKTtcbiAgXG4gIHJldHVybiBzaWduZWQgJiYgeCA+PSBtYXggLyAyXG4gICAgICA/IHggLSBtYXhcbiAgICAgIDogeDtcbn07XG5cbkJpbmFyeVBhcnNlci5lbmNvZGVGbG9hdCA9IGZ1bmN0aW9uIGVuY29kZUZsb2F0IChkYXRhLCBwcmVjaXNpb25CaXRzLCBleHBvbmVudEJpdHMpIHtcblx0dmFyIGJpYXMgPSBtYXhCaXRzW2V4cG9uZW50Qml0cyAtIDFdIC0gMVxuICAgICwgbWluRXhwID0gLWJpYXMgKyAxXG4gICAgLCBtYXhFeHAgPSBiaWFzXG4gICAgLCBtaW5Vbm5vcm1FeHAgPSBtaW5FeHAgLSBwcmVjaXNpb25CaXRzXG4gICAgLCBuID0gcGFyc2VGbG9hdChkYXRhKVxuICAgICwgc3RhdHVzID0gaXNOYU4obikgfHwgbiA9PSAtSW5maW5pdHkgfHwgbiA9PSArSW5maW5pdHkgPyBuIDogMFxuICAgICxcdGV4cCA9IDBcbiAgICAsIGxlbiA9IDIgKiBiaWFzICsgMSArIHByZWNpc2lvbkJpdHMgKyAzXG4gICAgLCBiaW4gPSBuZXcgQXJyYXkobGVuKVxuICAgICwgc2lnbmFsID0gKG4gPSBzdGF0dXMgIT09IDAgPyAwIDogbikgPCAwXG4gICAgLCBpbnRQYXJ0ID0gTWF0aC5mbG9vcihuID0gTWF0aC5hYnMobikpXG4gICAgLCBmbG9hdFBhcnQgPSBuIC0gaW50UGFydFxuICAgICwgbGFzdEJpdFxuICAgICwgcm91bmRlZFxuICAgICwgcmVzdWx0XG4gICAgLCBpXG4gICAgLCBqO1xuXG5cdGZvciAoaSA9IGxlbjsgaTsgYmluWy0taV0gPSAwKTtcblxuXHRmb3IgKGkgPSBiaWFzICsgMjsgaW50UGFydCAmJiBpOyBiaW5bLS1pXSA9IGludFBhcnQgJSAyLCBpbnRQYXJ0ID0gTWF0aC5mbG9vcihpbnRQYXJ0IC8gMikpO1xuXG5cdGZvciAoaSA9IGJpYXMgKyAxOyBmbG9hdFBhcnQgPiAwICYmIGk7IChiaW5bKytpXSA9ICgoZmxvYXRQYXJ0ICo9IDIpID49IDEpIC0gMCApICYmIC0tZmxvYXRQYXJ0KTtcblxuXHRmb3IgKGkgPSAtMTsgKytpIDwgbGVuICYmICFiaW5baV07KTtcblxuXHRpZiAoYmluWyhsYXN0Qml0ID0gcHJlY2lzaW9uQml0cyAtIDEgKyAoaSA9IChleHAgPSBiaWFzICsgMSAtIGkpID49IG1pbkV4cCAmJiBleHAgPD0gbWF4RXhwID8gaSArIDEgOiBiaWFzICsgMSAtIChleHAgPSBtaW5FeHAgLSAxKSkpICsgMV0pIHtcblx0XHRpZiAoIShyb3VuZGVkID0gYmluW2xhc3RCaXRdKSkge1xuXHRcdFx0Zm9yIChqID0gbGFzdEJpdCArIDI7ICFyb3VuZGVkICYmIGogPCBsZW47IHJvdW5kZWQgPSBiaW5baisrXSk7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gbGFzdEJpdCArIDE7IHJvdW5kZWQgJiYgLS1qID49IDA7IChiaW5bal0gPSAhYmluW2pdIC0gMCkgJiYgKHJvdW5kZWQgPSAwKSk7XG5cdH1cblxuXHRmb3IgKGkgPSBpIC0gMiA8IDAgPyAtMSA6IGkgLSAzOyArK2kgPCBsZW4gJiYgIWJpbltpXTspO1xuXG5cdGlmICgoZXhwID0gYmlhcyArIDEgLSBpKSA+PSBtaW5FeHAgJiYgZXhwIDw9IG1heEV4cCkge1xuXHRcdCsraTtcbiAgfSBlbHNlIGlmIChleHAgPCBtaW5FeHApIHtcblx0XHRleHAgIT0gYmlhcyArIDEgLSBsZW4gJiYgZXhwIDwgbWluVW5ub3JtRXhwICYmIHRoaXMud2FybihcImVuY29kZUZsb2F0OjpmbG9hdCB1bmRlcmZsb3dcIik7XG5cdFx0aSA9IGJpYXMgKyAxIC0gKGV4cCA9IG1pbkV4cCAtIDEpO1xuXHR9XG5cblx0aWYgKGludFBhcnQgfHwgc3RhdHVzICE9PSAwKSB7XG5cdFx0dGhpcy53YXJuKGludFBhcnQgPyBcImVuY29kZUZsb2F0OjpmbG9hdCBvdmVyZmxvd1wiIDogXCJlbmNvZGVGbG9hdDo6XCIgKyBzdGF0dXMpO1xuXHRcdGV4cCA9IG1heEV4cCArIDE7XG5cdFx0aSA9IGJpYXMgKyAyO1xuXG5cdFx0aWYgKHN0YXR1cyA9PSAtSW5maW5pdHkpIHtcblx0XHRcdHNpZ25hbCA9IDE7XG4gICAgfSBlbHNlIGlmIChpc05hTihzdGF0dXMpKSB7XG5cdFx0XHRiaW5baV0gPSAxO1xuICAgIH1cblx0fVxuXG5cdGZvciAobiA9IE1hdGguYWJzKGV4cCArIGJpYXMpLCBqID0gZXhwb25lbnRCaXRzICsgMSwgcmVzdWx0ID0gXCJcIjsgLS1qOyByZXN1bHQgPSAobiAlIDIpICsgcmVzdWx0LCBuID0gbiA+Pj0gMSk7XG5cblx0Zm9yIChuID0gMCwgaiA9IDAsIGkgPSAocmVzdWx0ID0gKHNpZ25hbCA/IFwiMVwiIDogXCIwXCIpICsgcmVzdWx0ICsgYmluLnNsaWNlKGksIGkgKyBwcmVjaXNpb25CaXRzKS5qb2luKFwiXCIpKS5sZW5ndGgsIHIgPSBbXTsgaTsgaiA9IChqICsgMSkgJSA4KSB7XG5cdFx0biArPSAoMSA8PCBqKSAqIHJlc3VsdC5jaGFyQXQoLS1pKTtcblx0XHRpZiAoaiA9PSA3KSB7XG5cdFx0XHRyW3IubGVuZ3RoXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUobik7XG5cdFx0XHRuID0gMDtcblx0XHR9XG5cdH1cblxuXHRyW3IubGVuZ3RoXSA9IG5cbiAgICA/IFN0cmluZy5mcm9tQ2hhckNvZGUobilcbiAgICA6IFwiXCI7XG5cblx0cmV0dXJuICh0aGlzLmJpZ0VuZGlhbiA/IHIucmV2ZXJzZSgpIDogcikuam9pbihcIlwiKTtcbn07XG5cbkJpbmFyeVBhcnNlci5lbmNvZGVJbnQgPSBmdW5jdGlvbiBlbmNvZGVJbnQgKGRhdGEsIGJpdHMsIHNpZ25lZCwgZm9yY2VCaWdFbmRpYW4pIHtcblx0dmFyIG1heCA9IG1heEJpdHNbYml0c107XG5cbiAgaWYgKGRhdGEgPj0gbWF4IHx8IGRhdGEgPCAtKG1heCAvIDIpKSB7XG4gICAgdGhpcy53YXJuKFwiZW5jb2RlSW50OjpvdmVyZmxvd1wiKTtcbiAgICBkYXRhID0gMDtcbiAgfVxuXG5cdGlmIChkYXRhIDwgMCkge1xuICAgIGRhdGEgKz0gbWF4O1xuICB9XG5cblx0Zm9yICh2YXIgciA9IFtdOyBkYXRhOyByW3IubGVuZ3RoXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZGF0YSAlIDI1NiksIGRhdGEgPSBNYXRoLmZsb29yKGRhdGEgLyAyNTYpKTtcblxuXHRmb3IgKGJpdHMgPSAtKC1iaXRzID4+IDMpIC0gci5sZW5ndGg7IGJpdHMtLTsgcltyLmxlbmd0aF0gPSBcIlxcMFwiKTtcblxuICByZXR1cm4gKCh0aGlzLmJpZ0VuZGlhbiB8fCBmb3JjZUJpZ0VuZGlhbikgPyByLnJldmVyc2UoKSA6IHIpLmpvaW4oXCJcIik7XG59O1xuXG5CaW5hcnlQYXJzZXIudG9TbWFsbCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgIDgsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVNtYWxsICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgIDgsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9CeXRlICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgIDgsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUJ5dGUgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgIDgsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9TaG9ydCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMTYsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVNob3J0ICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMTYsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9Xb3JkICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMTYsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbVdvcmQgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMTYsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9JbnQgICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMzIsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUludCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMzIsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9Mb25nICAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgNjQsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbUxvbmcgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgNjQsIHRydWUgICk7IH07XG5CaW5hcnlQYXJzZXIudG9EV29yZCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgMzIsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIuZnJvbURXb3JkICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmVuY29kZUludCggZGF0YSwgMzIsIGZhbHNlICk7IH07XG5CaW5hcnlQYXJzZXIudG9RV29yZCAgICA9IGZ1bmN0aW9uKCBkYXRhICl7IHJldHVybiB0aGlzLmRlY29kZUludCggZGF0YSwgNjQsIHRydWUgKTsgfTtcbkJpbmFyeVBhcnNlci5mcm9tUVdvcmQgID0gZnVuY3Rpb24oIGRhdGEgKXsgcmV0dXJuIHRoaXMuZW5jb2RlSW50KCBkYXRhLCA2NCwgdHJ1ZSApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRmxvYXQgICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVGbG9hdCggZGF0YSwgMjMsIDggICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21GbG9hdCAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVGbG9hdCggZGF0YSwgMjMsIDggICApOyB9O1xuQmluYXJ5UGFyc2VyLnRvRG91YmxlICAgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5kZWNvZGVGbG9hdCggZGF0YSwgNTIsIDExICApOyB9O1xuQmluYXJ5UGFyc2VyLmZyb21Eb3VibGUgPSBmdW5jdGlvbiggZGF0YSApeyByZXR1cm4gdGhpcy5lbmNvZGVGbG9hdCggZGF0YSwgNTIsIDExICApOyB9O1xuXG4vLyBGYWN0b3Igb3V0IHRoZSBlbmNvZGUgc28gaXQgY2FuIGJlIHNoYXJlZCBieSBhZGRfaGVhZGVyIGFuZCBwdXNoX2ludDMyXG5CaW5hcnlQYXJzZXIuZW5jb2RlX2ludDMyID0gZnVuY3Rpb24gZW5jb2RlX2ludDMyIChudW1iZXIsIGFzQXJyYXkpIHtcbiAgdmFyIGEsIGIsIGMsIGQsIHVuc2lnbmVkO1xuICB1bnNpZ25lZCA9IChudW1iZXIgPCAwKSA/IChudW1iZXIgKyAweDEwMDAwMDAwMCkgOiBudW1iZXI7XG4gIGEgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmYpO1xuICB1bnNpZ25lZCAmPSAweGZmZmZmZjtcbiAgYiA9IE1hdGguZmxvb3IodW5zaWduZWQgLyAweGZmZmYpO1xuICB1bnNpZ25lZCAmPSAweGZmZmY7XG4gIGMgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZik7XG4gIHVuc2lnbmVkICY9IDB4ZmY7XG4gIGQgPSBNYXRoLmZsb29yKHVuc2lnbmVkKTtcbiAgcmV0dXJuIGFzQXJyYXkgPyBbY2hyKGEpLCBjaHIoYiksIGNocihjKSwgY2hyKGQpXSA6IGNocihhKSArIGNocihiKSArIGNocihjKSArIGNocihkKTtcbn07XG5cbkJpbmFyeVBhcnNlci5lbmNvZGVfaW50NjQgPSBmdW5jdGlvbiBlbmNvZGVfaW50NjQgKG51bWJlcikge1xuICB2YXIgYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgdW5zaWduZWQ7XG4gIHVuc2lnbmVkID0gKG51bWJlciA8IDApID8gKG51bWJlciArIDB4MTAwMDAwMDAwMDAwMDAwMDApIDogbnVtYmVyO1xuICBhID0gTWF0aC5mbG9vcih1bnNpZ25lZCAvIDB4ZmZmZmZmZmZmZmZmZmYpO1xuICB1bnNpZ25lZCAmPSAweGZmZmZmZmZmZmZmZmZmO1xuICBiID0gTWF0aC5mbG9vcih1bnNpZ25lZCAvIDB4ZmZmZmZmZmZmZmZmKTtcbiAgdW5zaWduZWQgJj0gMHhmZmZmZmZmZmZmZmY7XG4gIGMgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmZmZmZmZmKTtcbiAgdW5zaWduZWQgJj0gMHhmZmZmZmZmZmZmO1xuICBkID0gTWF0aC5mbG9vcih1bnNpZ25lZCAvIDB4ZmZmZmZmZmYpO1xuICB1bnNpZ25lZCAmPSAweGZmZmZmZmZmO1xuICBlID0gTWF0aC5mbG9vcih1bnNpZ25lZCAvIDB4ZmZmZmZmKTtcbiAgdW5zaWduZWQgJj0gMHhmZmZmZmY7XG4gIGYgPSBNYXRoLmZsb29yKHVuc2lnbmVkIC8gMHhmZmZmKTtcbiAgdW5zaWduZWQgJj0gMHhmZmZmO1xuICBnID0gTWF0aC5mbG9vcih1bnNpZ25lZCAvIDB4ZmYpO1xuICB1bnNpZ25lZCAmPSAweGZmO1xuICBoID0gTWF0aC5mbG9vcih1bnNpZ25lZCk7XG4gIHJldHVybiBjaHIoYSkgKyBjaHIoYikgKyBjaHIoYykgKyBjaHIoZCkgKyBjaHIoZSkgKyBjaHIoZikgKyBjaHIoZykgKyBjaHIoaCk7XG59O1xuXG4vKipcbiAqIFVURjggbWV0aG9kc1xuICovXG5cbi8vIFRha2UgYSByYXcgYmluYXJ5IHN0cmluZyBhbmQgcmV0dXJuIGEgdXRmOCBzdHJpbmdcbkJpbmFyeVBhcnNlci5kZWNvZGVfdXRmOCA9IGZ1bmN0aW9uIGRlY29kZV91dGY4IChiaW5hcnlTdHIpIHtcbiAgdmFyIGxlbiA9IGJpbmFyeVN0ci5sZW5ndGhcbiAgICAsIGRlY29kZWQgPSAnJ1xuICAgICwgaSA9IDBcbiAgICAsIGMgPSAwXG4gICAgLCBjMSA9IDBcbiAgICAsIGMyID0gMFxuICAgICwgYzM7XG5cbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICBjID0gYmluYXJ5U3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGMgPCAxMjgpIHtcbiAgICAgIGRlY29kZWQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYgKChjID4gMTkxKSAmJiAoYyA8IDIyNCkpIHtcblx0ICAgIGMyID0gYmluYXJ5U3RyLmNoYXJDb2RlQXQoaSsxKTtcbiAgICAgIGRlY29kZWQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoKGMgJiAzMSkgPDwgNikgfCAoYzIgJiA2MykpO1xuICAgICAgaSArPSAyO1xuICAgIH0gZWxzZSB7XG5cdCAgICBjMiA9IGJpbmFyeVN0ci5jaGFyQ29kZUF0KGkrMSk7XG5cdCAgICBjMyA9IGJpbmFyeVN0ci5jaGFyQ29kZUF0KGkrMik7XG4gICAgICBkZWNvZGVkICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjICYgMTUpIDw8IDEyKSB8ICgoYzIgJiA2MykgPDwgNikgfCAoYzMgJiA2MykpO1xuICAgICAgaSArPSAzO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkZWNvZGVkO1xufTtcblxuLy8gRW5jb2RlIGEgY3N0cmluZ1xuQmluYXJ5UGFyc2VyLmVuY29kZV9jc3RyaW5nID0gZnVuY3Rpb24gZW5jb2RlX2NzdHJpbmcgKHMpIHtcbiAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzKSkgKyBCaW5hcnlQYXJzZXIuZnJvbUJ5dGUoMCk7XG59O1xuXG4vLyBUYWtlIGEgdXRmOCBzdHJpbmcgYW5kIHJldHVybiBhIGJpbmFyeSBzdHJpbmdcbkJpbmFyeVBhcnNlci5lbmNvZGVfdXRmOCA9IGZ1bmN0aW9uIGVuY29kZV91dGY4IChzKSB7XG4gIHZhciBhID0gXCJcIlxuICAgICwgYztcblxuICBmb3IgKHZhciBuID0gMCwgbGVuID0gcy5sZW5ndGg7IG4gPCBsZW47IG4rKykge1xuICAgIGMgPSBzLmNoYXJDb2RlQXQobik7XG5cbiAgICBpZiAoYyA8IDEyOCkge1xuXHQgICAgYSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgIH0gZWxzZSBpZiAoKGMgPiAxMjcpICYmIChjIDwgMjA0OCkpIHtcblx0ICAgIGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYz4+NikgfCAxOTIpIDtcblx0ICAgIGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyY2MykgfCAxMjgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGM+PjEyKSB8IDIyNCk7XG4gICAgICBhICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjPj42KSAmIDYzKSB8IDEyOCk7XG4gICAgICBhICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMmNjMpIHwgMTI4KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYTtcbn07XG5cbkJpbmFyeVBhcnNlci5ocHJpbnQgPSBmdW5jdGlvbiBocHJpbnQgKHMpIHtcbiAgdmFyIG51bWJlcjtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChzLmNoYXJDb2RlQXQoaSkgPCAzMikge1xuICAgICAgbnVtYmVyID0gcy5jaGFyQ29kZUF0KGkpIDw9IDE1XG4gICAgICAgID8gXCIwXCIgKyBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTYpXG4gICAgICAgIDogcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KTsgICAgICAgIFxuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobnVtYmVyICsgXCIgXCIpXG4gICAgfSBlbHNlIHtcbiAgICAgIG51bWJlciA9IHMuY2hhckNvZGVBdChpKSA8PSAxNVxuICAgICAgICA/IFwiMFwiICsgcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KVxuICAgICAgICA6IHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxNik7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG51bWJlciArIFwiIFwiKVxuICAgIH1cbiAgfVxuICBcbiAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoXCJcXG5cXG5cIik7XG59O1xuXG5CaW5hcnlQYXJzZXIuaWxwcmludCA9IGZ1bmN0aW9uIGhwcmludCAocykge1xuICB2YXIgbnVtYmVyO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKHMuY2hhckNvZGVBdChpKSA8IDMyKSB7XG4gICAgICBudW1iZXIgPSBzLmNoYXJDb2RlQXQoaSkgPD0gMTVcbiAgICAgICAgPyBcIjBcIiArIHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxMClcbiAgICAgICAgOiBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTApO1xuXG4gICAgICByZXF1aXJlKCd1dGlsJykuZGVidWcobnVtYmVyKycgOiAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbnVtYmVyID0gcy5jaGFyQ29kZUF0KGkpIDw9IDE1XG4gICAgICAgID8gXCIwXCIgKyBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTApXG4gICAgICAgIDogcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDEwKTtcbiAgICAgIHJlcXVpcmUoJ3V0aWwnKS5kZWJ1ZyhudW1iZXIrJyA6ICcrIHMuY2hhckF0KGkpKTtcbiAgICB9XG4gIH1cbn07XG5cbkJpbmFyeVBhcnNlci5obHByaW50ID0gZnVuY3Rpb24gaHByaW50IChzKSB7XG4gIHZhciBudW1iZXI7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAocy5jaGFyQ29kZUF0KGkpIDwgMzIpIHtcbiAgICAgIG51bWJlciA9IHMuY2hhckNvZGVBdChpKSA8PSAxNVxuICAgICAgICA/IFwiMFwiICsgcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KVxuICAgICAgICA6IHMuY2hhckNvZGVBdChpKS50b1N0cmluZygxNik7XG4gICAgICByZXF1aXJlKCd1dGlsJykuZGVidWcobnVtYmVyKycgOiAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbnVtYmVyID0gcy5jaGFyQ29kZUF0KGkpIDw9IDE1XG4gICAgICAgID8gXCIwXCIgKyBzLmNoYXJDb2RlQXQoaSkudG9TdHJpbmcoMTYpXG4gICAgICAgIDogcy5jaGFyQ29kZUF0KGkpLnRvU3RyaW5nKDE2KTtcbiAgICAgIHJlcXVpcmUoJ3V0aWwnKS5kZWJ1ZyhudW1iZXIrJyA6ICcrIHMuY2hhckF0KGkpKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQmluYXJ5UGFyc2VyIGJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAqL1xuZnVuY3Rpb24gQmluYXJ5UGFyc2VyQnVmZmVyIChiaWdFbmRpYW4sIGJ1ZmZlcikge1xuICB0aGlzLmJpZ0VuZGlhbiA9IGJpZ0VuZGlhbiB8fCAwO1xuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5zZXRCdWZmZXIgPSBmdW5jdGlvbiBzZXRCdWZmZXIgKGRhdGEpIHtcbiAgdmFyIGwsIGksIGI7XG5cblx0aWYgKGRhdGEpIHtcbiAgICBpID0gbCA9IGRhdGEubGVuZ3RoO1xuICAgIGIgPSB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheShsKTtcblx0XHRmb3IgKDsgaTsgYltsIC0gaV0gPSBkYXRhLmNoYXJDb2RlQXQoLS1pKSk7XG5cdFx0dGhpcy5iaWdFbmRpYW4gJiYgYi5yZXZlcnNlKCk7XG5cdH1cbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUuaGFzTmVlZGVkQml0cyA9IGZ1bmN0aW9uIGhhc05lZWRlZEJpdHMgKG5lZWRlZEJpdHMpIHtcblx0cmV0dXJuIHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAtKC1uZWVkZWRCaXRzID4+IDMpO1xufTtcblxuQmluYXJ5UGFyc2VyQnVmZmVyLnByb3RvdHlwZS5jaGVja0J1ZmZlciA9IGZ1bmN0aW9uIGNoZWNrQnVmZmVyIChuZWVkZWRCaXRzKSB7XG5cdGlmICghdGhpcy5oYXNOZWVkZWRCaXRzKG5lZWRlZEJpdHMpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiY2hlY2tCdWZmZXI6Om1pc3NpbmcgYnl0ZXNcIik7XG4gIH1cbn07XG5cbkJpbmFyeVBhcnNlckJ1ZmZlci5wcm90b3R5cGUucmVhZEJpdHMgPSBmdW5jdGlvbiByZWFkQml0cyAoc3RhcnQsIGxlbmd0aCkge1xuXHQvL3NobCBmaXg6IEhlbnJpIFRvcmdlbWFuZSB+MTk5NiAoY29tcHJlc3NlZCBieSBKb25hcyBSYW9uaSlcblxuXHRmdW5jdGlvbiBzaGwgKGEsIGIpIHtcblx0XHRmb3IgKDsgYi0tOyBhID0gKChhICU9IDB4N2ZmZmZmZmYgKyAxKSAmIDB4NDAwMDAwMDApID09IDB4NDAwMDAwMDAgPyBhICogMiA6IChhIC0gMHg0MDAwMDAwMCkgKiAyICsgMHg3ZmZmZmZmZiArIDEpO1xuXHRcdHJldHVybiBhO1xuXHR9XG5cblx0aWYgKHN0YXJ0IDwgMCB8fCBsZW5ndGggPD0gMCkge1xuXHRcdHJldHVybiAwO1xuICB9XG5cblx0dGhpcy5jaGVja0J1ZmZlcihzdGFydCArIGxlbmd0aCk7XG5cbiAgdmFyIG9mZnNldExlZnRcbiAgICAsIG9mZnNldFJpZ2h0ID0gc3RhcnQgJSA4XG4gICAgLCBjdXJCeXRlID0gdGhpcy5idWZmZXIubGVuZ3RoIC0gKCBzdGFydCA+PiAzICkgLSAxXG4gICAgLCBsYXN0Qnl0ZSA9IHRoaXMuYnVmZmVyLmxlbmd0aCArICggLSggc3RhcnQgKyBsZW5ndGggKSA+PiAzIClcbiAgICAsIGRpZmYgPSBjdXJCeXRlIC0gbGFzdEJ5dGVcbiAgICAsIHN1bSA9ICgodGhpcy5idWZmZXJbIGN1ckJ5dGUgXSA+PiBvZmZzZXRSaWdodCkgJiAoKDEgPDwgKGRpZmYgPyA4IC0gb2Zmc2V0UmlnaHQgOiBsZW5ndGgpKSAtIDEpKSArIChkaWZmICYmIChvZmZzZXRMZWZ0ID0gKHN0YXJ0ICsgbGVuZ3RoKSAlIDgpID8gKHRoaXMuYnVmZmVyW2xhc3RCeXRlKytdICYgKCgxIDw8IG9mZnNldExlZnQpIC0gMSkpIDw8IChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCA6IDApO1xuXG5cdGZvcig7IGRpZmY7IHN1bSArPSBzaGwodGhpcy5idWZmZXJbbGFzdEJ5dGUrK10sIChkaWZmLS0gPDwgMykgLSBvZmZzZXRSaWdodCkpO1xuXG5cdHJldHVybiBzdW07XG59O1xuXG4vKipcbiAqIEV4cG9zZS5cbiAqL1xuQmluYXJ5UGFyc2VyLkJ1ZmZlciA9IEJpbmFyeVBhcnNlckJ1ZmZlcjtcblxuZXhwb3J0cy5CaW5hcnlQYXJzZXIgPSBCaW5hcnlQYXJzZXI7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuICAsIERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpO1xuXG4vL1RPRE86INC90LDQv9C40YHQsNGC0Ywg0LzQtdGC0L7QtCAudXBzZXJ0KCBkb2MgKSAtINC+0LHQvdC+0LLQu9C10L3QuNC1INC00L7QutGD0LzQtdC90YLQsCwg0LAg0LXRgdC70Lgg0LXQs9C+INC90LXRgiwg0YLQviDRgdC+0LfQtNCw0L3QuNC1XG5cbi8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDQu9C+0LPQuNC60YMg0YEgYXBpUmVzb3VyY2UgKNGB0L7RhdGA0LDQvdGP0YLRjCDRgdGB0YvQu9C60YMg0L3QsCDQvdC10LPQviDQuCDQuNGB0L/QvtC70YzQt9C+0LLRgtGMINC/0YDQuCDQvNC10YLQvtC00LUgZG9jLnNhdmUpXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LrQvtC70LvQtdC60YbQuNC5LlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSDQvdCw0LfQstCw0L3QuNC1INC60L7Qu9C70LXQutGG0LjQuFxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINCh0YXQtdC80LAg0LjQu9C4INC+0LHRitC10LrRgiDQvtC/0LjRgdCw0L3QuNGPINGB0YXQtdC80YtcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwIGFwaSDRgNC10YHRg9GA0YFcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDb2xsZWN0aW9uICggbmFtZSwgc2NoZW1hLCBhcGkgKXtcbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDQvdCw0LfQstCw0L3QuNC1INC/0YDQvtGB0YLRgNCw0L3RgdGC0LLQsCDQuNC80ZHQvVxuICB0aGlzLm5hbWUgPSBuYW1lO1xuICAvLyDQpdGA0LDQvdC40LvQuNGJ0LUg0LTQu9GPINC00L7QutGD0LzQtdC90YLQvtCyXG4gIHRoaXMuZG9jdW1lbnRzID0ge307XG5cbiAgaWYgKCBfLmlzT2JqZWN0KCBzY2hlbWEgKSAmJiAhKCBzY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKSApIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0YHRgdGL0LvQutGDINC90LAgYXBpINC00LvRjyDQvNC10YLQvtC00LAgLnNhdmUoKVxuICB0aGlzLmFwaSA9IGFwaTtcblxuICAvLyDQmNGB0L/QvtC70YzQt9GD0LXQvNCw0Y8g0YHRhdC10LzQsCDQtNC70Y8g0LrQvtC70LvQtdC60YbQuNC4XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIC8vINCe0YLQvtCx0YDQsNC20LXQvdC40LUg0L7QsdGK0LXQutGC0LAgZG9jdW1lbnRzINCyINCy0LjQtNC1INC80LDRgdGB0LjQstCwICjQtNC70Y8g0L3QvtC60LDRg9GC0LApXG4gIHRoaXMuYXJyYXkgPSBbXTtcbiAgLy8g0J3Rg9C20L3QviDQtNC70Y8g0L7QsdC90L7QstC70LXQvdC40Y8g0L/RgNC40LLRj9C30L7QuiDQuiDRjdGC0L7QvNGDINGB0LLQvtC50YHRgtCy0YMg0LTQu9GPIGtub2Nrb3V0anNcbiAgd2luZG93LmtvICYmIGtvLnRyYWNrKCB0aGlzLCBbJ2FycmF5J10gKTtcbn1cblxuQ29sbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LjQu9C4INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7Qsi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IHR5cGU6ICdqZWxseSBiZWFuJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZChbeyB0eXBlOiAnamVsbHkgYmVhbicgfSwgeyB0eXBlOiAnc25pY2tlcnMnIH1dKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxBcnJheS48b2JqZWN0Pn0gW2RvY10gLSDQlNC+0LrRg9C80LXQvdGCXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAgICogQHBhcmFtIHtib29sZWFufSBbX3N0b3JhZ2VXaWxsTXV0YXRlXSAtINCk0LvQsNCzINC00L7QsdCw0LLQu9C10L3QuNGPINC80LDRgdGB0LjQstCwINC00L7QutGD0LzQtdC90YLQvtCyLiDRgtC+0LvRjNC60L4g0LTQu9GPINCy0L3Rg9GC0YDQtdC90L3QtdCz0L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Y9cbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggZG9jLCBmaWVsZHMsIGluaXQsIF9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YLQsCDQvdC10YIsINC30L3QsNGH0LjRgiDQsdGD0LTQtdGCINC/0YPRgdGC0L7QuVxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xuXG4gICAgLy8g0JzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XG4gICAgICB2YXIgc2F2ZWREb2NzID0gW107XG5cbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XG4gICAgICAgIHNhdmVkRG9jcy5wdXNoKCBzZWxmLmFkZCggZG9jLCBmaWVsZHMsIGluaXQsIHRydWUgKSApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcblxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YIg0YPQttC1INC10YHRgtGMLCDRgtC+INC/0YDQvtGB0YLQviDRg9GB0YLQsNC90L7QstC40YLRjCDQt9C90LDRh9C10L3QuNGPXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0uc2V0KCBkb2MgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlzY3JpbWluYXRvck1hcHBpbmcgPSB0aGlzLnNjaGVtYVxuICAgICAgICA/IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nXG4gICAgICAgIDogbnVsbDtcblxuICAgICAgdmFyIGtleSA9IGRpc2NyaW1pbmF0b3JNYXBwaW5nICYmIGRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdFxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxuICAgICAgICA6IG51bGw7XG5cbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcbiAgICAgIHZhciBzY2hlbWE7XG4gICAgICBpZiAoa2V5ICYmIGRvYyAmJiBkb2Nba2V5XSAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9ycyAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV0pIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gICAgICBpZCA9IG5ld0RvYy5faWQudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCBNaXhlZFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL21peGVkJylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBWYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vc2NoZW1hdHlwZScpLlZhbGlkYXRvckVycm9yXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBjbG9uZSA9IHV0aWxzLmNsb25lXG4gICwgVmFsaWRhdGlvbkVycm9yID0gU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvclxuICAsIEludGVybmFsQ2FjaGUgPSByZXF1aXJlKCcuL2ludGVybmFsJylcbiAgLCBkZWVwRXF1YWwgPSB1dGlscy5kZWVwRXF1YWxcbiAgLCBEb2N1bWVudEFycmF5XG4gICwgU2NoZW1hQXJyYXlcbiAgLCBFbWJlZGRlZDtcblxuLyoqXG4gKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC00L7QutGD0LzQtdC90YLQsC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtINC30L3QsNGH0LXQvdC40Y8sINC60L7RgtC+0YDRi9C1INC90YPQttC90L4g0YPRgdGC0LDQvdC+0LLQuNGC0YxcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gW2NvbGxlY3Rpb25OYW1lXSAtINC60L7Qu9C70LXQutGG0LjRjyDQsiDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINC90LDRhdC+0LTQuNGC0YHRjyDQtNC+0LrRg9C80LXQvdGCXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0YHRhdC10LzQsCDQv9C+INC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0YHQvtC30LTQsNC9INC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QvilcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEb2N1bWVudCAoIGRhdGEsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWEsIGZpZWxkcywgaW5pdCApe1xuICB0aGlzLiRfXyA9IG5ldyBJbnRlcm5hbENhY2hlO1xuICB0aGlzLmlzTmV3ID0gdHJ1ZTtcblxuICAvLyDQodC+0LfQtNCw0YLRjCDQv9GD0YHRgtC+0Lkg0LTQvtC60YPQvNC10L3RgiDRgSDRhNC70LDQs9C+0LwgaW5pdFxuICAvLyBuZXcgVGVzdERvY3VtZW50KHRydWUpO1xuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGRhdGEgKXtcbiAgICBpbml0ID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmICggXy5pc09iamVjdCggc2NoZW1hICkgJiYgISggc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICkpIHtcbiAgICBzY2hlbWEgPSBuZXcgU2NoZW1hKCBzY2hlbWEgKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtVxuICBpZiAoIGRhdGEgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBzY2hlbWEgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuXG4gICAgaWYgKCBzY2hlbWEub3B0aW9ucy5faWQgKXtcbiAgICAgIGRhdGEgPSB7IF9pZDogbmV3IE9iamVjdElkKCkgfTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcbiAgICAvLyDQn9GA0Lgg0YHQvtC30LTQsNC90LjQuCBFbWJlZGRlZERvY3VtZW50LCDQsiDQvdGR0Lwg0YPQttC1INC10YHRgtGMINGB0YXQtdC80LAg0Lgg0LXQvNGDINC90LUg0L3Rg9C20LXQvSBfaWRcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYSB8fCBzY2hlbWE7XG4gICAgLy8g0KHQs9C10L3QtdGA0LjRgNC+0LLQsNGC0YwgT2JqZWN0SWQsINC10YHQu9C4INC+0L0g0L7RgtGB0YPRgtGB0YLQstGD0LXRgiwg0L3QviDQtdCz0L4g0YLRgNC10LHRg9C10YIg0YHRhdC10LzQsFxuICAgIGlmICggIXRoaXMuc2NoZW1hICYmIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAgIGlmICggZGF0YS5faWQgPT09IHVuZGVmaW5lZCApe1xuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICggIXNjaGVtYSApe1xuICAgIC8vdG9kbzogdGhyb3cgbmV3IG1vbmdvb3NlLkVycm9yLk1pc3NpbmdTY2hlbWFFcnJvcihuYW1lKTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQndC10LvRjNC30Y8g0YHQvtC30LTQsNCy0LDRgtGMINC00L7QutGD0LzQtdC90YIg0LHQtdC3INGB0YXQtdC80YsnKTtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEg0YTQu9Cw0LPQvtC8IGluaXRcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh7IHRlc3Q6ICdib29tJyB9LCB0cnVlKTtcbiAgaWYgKCAnYm9vbGVhbicgPT09IHR5cGVvZiBjb2xsZWN0aW9uTmFtZSApe1xuICAgIGluaXQgPSBjb2xsZWN0aW9uTmFtZTtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0YEgc3RyaWN0OiB0cnVlXG4gIC8vIGNvbGxlY3Rpb24uYWRkKHsuLi59LCB0cnVlKTtcbiAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIGZpZWxkcykge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBmaWVsZHM7XG4gICAgZmllbGRzID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBzY2hlbWEub3B0aW9ucyAmJiBzY2hlbWEub3B0aW9ucy5zdHJpY3Q7XG4gICAgdGhpcy4kX18uc2VsZWN0ZWQgPSBmaWVsZHM7XG4gIH1cblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdGhpcy5jb2xsZWN0aW9uID0gd2luZG93LnN0b3JhZ2VbIGNvbGxlY3Rpb25OYW1lIF07XG4gIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcblxuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIGlmICggZGF0YSA9PSBudWxsIHx8ICFkYXRhLl9pZCApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0JTQu9GPINC/0L7QvNC10YnQtdC90LjRjyDQsiDQutC+0LvQu9C10LrRhtC40Y4g0L3QtdC+0LHRhdC+0LTQuNC80L4sINGH0YLQvtCx0Ysg0YMg0LTQvtC60YPQvNC10L3RgtCwINCx0YvQuyBfaWQnKTtcbiAgICB9XG4gICAgLy8g0J/QvtC80LXRgdGC0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LIg0LrQvtC70LvQtdC60YbQuNGOXG4gICAgdGhpcy5jb2xsZWN0aW9uLmRvY3VtZW50c1sgZGF0YS5faWQgXSA9IHRoaXM7XG4gIH1cblxuICB2YXIgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWRQYXRocygpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcXVpcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgdGhpcy4kX18uYWN0aXZlUGF0aHMucmVxdWlyZSggcmVxdWlyZWRbaV0gKTtcbiAgfVxuXG4gIHRoaXMuJF9fc2V0U2NoZW1hKCBzY2hlbWEgKTtcblxuICB0aGlzLl9kb2MgPSB0aGlzLiRfX2J1aWxkRG9jKCBkYXRhLCBpbml0ICk7XG5cbiAgaWYgKCBpbml0ICl7XG4gICAgdGhpcy5pbml0KCBkYXRhICk7XG4gIH0gZWxzZSBpZiAoIGRhdGEgKSB7XG4gICAgdGhpcy5zZXQoIGRhdGEsIHVuZGVmaW5lZCwgdHJ1ZSApO1xuICB9XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKCB2YXIgbSBpbiBzY2hlbWEubWV0aG9kcyApe1xuICAgIHRoaXNbIG0gXSA9IHNjaGVtYS5tZXRob2RzWyBtIF07XG4gIH1cbiAgLy8gYXBwbHkgc3RhdGljc1xuICBmb3IgKCB2YXIgcyBpbiBzY2hlbWEuc3RhdGljcyApe1xuICAgIHRoaXNbIHMgXSA9IHNjaGVtYS5zdGF0aWNzWyBzIF07XG4gIH1cbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIGRvY3VtZW50cyBzY2hlbWEuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBzY2hlbWFcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNjaGVtYTtcblxuLyoqXG4gKiBCb29sZWFuIGZsYWcgc3BlY2lmeWluZyBpZiB0aGUgZG9jdW1lbnQgaXMgbmV3LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgaXNOZXdcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTmV3O1xuXG4vKipcbiAqIFRoZSBzdHJpbmcgdmVyc2lvbiBvZiB0aGlzIGRvY3VtZW50cyBfaWQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBnZXR0ZXIgZXhpc3RzIG9uIGFsbCBkb2N1bWVudHMgYnkgZGVmYXVsdC4gVGhlIGdldHRlciBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyB0aGUgYGlkYCBbb3B0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2lkKSBvZiBpdHMgYFNjaGVtYWAgdG8gZmFsc2UgYXQgY29uc3RydWN0aW9uIHRpbWUuXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBpZDogZmFsc2UgfSk7XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgU2NoZW1hIG9wdGlvbnMgL2RvY3MvZ3VpZGUuaHRtbCNvcHRpb25zXG4gKiBAcHJvcGVydHkgaWRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlkO1xuXG4vKipcbiAqIEhhc2ggY29udGFpbmluZyBjdXJyZW50IHZhbGlkYXRpb24gZXJyb3JzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgZXJyb3JzXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lcnJvcnM7XG5cbkRvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSB7XG4gIGRvY3VtZW50RGVmaW5lUHJvcGVydHk6ICQubm9vcCxcbiAgZG9jdW1lbnRTZXRJbml0aWFsVmFsdWU6ICQubm9vcCxcbiAgZG9jdW1lbnRHZXRWYWx1ZTogJC5ub29wLFxuICBkb2N1bWVudFNldFZhbHVlOiAkLm5vb3Bcbn07XG5cbi8qKlxuICogQnVpbGRzIHRoZSBkZWZhdWx0IGRvYyBzdHJ1Y3R1cmVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtza2lwSWRdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fYnVpbGREb2NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fYnVpbGREb2MgPSBmdW5jdGlvbiAoIG9iaiwgc2tpcElkICkge1xuICB2YXIgZG9jID0ge31cbiAgICAsIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXG4gICAgLCBwbGVuID0gcGF0aHMubGVuZ3RoXG4gICAgLCBpaSA9IDA7XG5cbiAgZm9yICggOyBpaSA8IHBsZW47ICsraWkgKSB7XG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XG5cbiAgICBpZiAoICdfaWQnID09IHAgKSB7XG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xuICAgICAgaWYgKCBvYmogJiYgJ19pZCcgaW4gb2JqICkgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcbiAgICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbDtcbiAgICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvYztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGRvY3VtZW50IHdpdGhvdXQgc2V0dGVycyBvciBtYXJraW5nIGFueXRoaW5nIG1vZGlmaWVkLlxuICpcbiAqIENhbGxlZCBpbnRlcm5hbGx5IGFmdGVyIGEgZG9jdW1lbnQgaXMgcmV0dXJuZWQgZnJvbSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XG4gIHRoaXMuaXNOZXcgPSBmYWxzZTtcblxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcbiAgLy8gaGFuZGxlIGRvY3Mgd2l0aCBwb3B1bGF0ZWQgcGF0aHNcbiAgLyppZiAoIGRvYy5faWQgJiYgb3B0cyAmJiBvcHRzLnBvcHVsYXRlZCAmJiBvcHRzLnBvcHVsYXRlZC5sZW5ndGggKSB7XG4gICAgdmFyIGlkID0gU3RyaW5nKCBkb2MuX2lkICk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLnBvcHVsYXRlZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGl0ZW0gPSBvcHRzLnBvcHVsYXRlZFsgaSBdO1xuICAgICAgdGhpcy5wb3B1bGF0ZWQoIGl0ZW0ucGF0aCwgaXRlbS5fZG9jc1tpZF0sIGl0ZW0gKTtcbiAgICB9XG4gIH0qL1xuXG4gIGluaXQoIHRoaXMsIGRhdGEsIHRoaXMuX2RvYyApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyohXG4gKiBJbml0IGhlbHBlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9iaiByYXcgc2VydmVyIGRvY1xuICogQHBhcmFtIHtPYmplY3R9IGRvYyBvYmplY3Qgd2UgYXJlIGluaXRpYWxpemluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXQgKHNlbGYsIG9iaiwgZG9jLCBwcmVmaXgpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcbiAgICAsIHNjaGVtYVxuICAgICwgcGF0aFxuICAgICwgaTtcblxuICB3aGlsZSAobGVuLS0pIHtcbiAgICBpID0ga2V5c1tsZW5dO1xuICAgIHBhdGggPSBwcmVmaXggKyBpO1xuICAgIHNjaGVtYSA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG5cbiAgICBpZiAoIXNjaGVtYSAmJiBfLmlzUGxhaW5PYmplY3QoIG9ialsgaSBdICkgJiZcbiAgICAgICAgKCFvYmpbaV0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtpXS5jb25zdHJ1Y3RvcikpKSB7XG4gICAgICAvLyBhc3N1bWUgbmVzdGVkIG9iamVjdFxuICAgICAgaWYgKCFkb2NbaV0pIGRvY1tpXSA9IHt9O1xuICAgICAgaW5pdChzZWxmLCBvYmpbaV0sIGRvY1tpXSwgcGF0aCArICcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbaV0gPT09IG51bGwpIHtcbiAgICAgICAgZG9jW2ldID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAob2JqW2ldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHNjaGVtYSkge1xuICAgICAgICAgIHNlbGYuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkb2NbaV0gPSBzY2hlbWEuY2FzdChvYmpbaV0sIHNlbGYsIHRydWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvY1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0SW5pdGlhbFZhbHVlLmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIGRvY1tpXSApO1xuICAgICAgfVxuICAgICAgLy8gbWFyayBhcyBoeWRyYXRlZFxuICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuaW5pdChwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHBhdGgsIG9yIG1hbnkgcGF0aHMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIC8vIHBhdGgsIHZhbHVlXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSlcbiAqXG4gKiAgICAgLy8gb2JqZWN0XG4gKiAgICAgZG9jLnNldCh7XG4gKiAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICwgcGF0aDIgOiB7XG4gKiAgICAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICAgfVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIG51bWJlclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIE51bWJlcilcbiAqXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gc3RyaW5nXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgU3RyaW5nKVxuICpcbiAqICAgICAvLyBjaGFuZ2luZyBzdHJpY3QgbW9kZSBiZWhhdmlvclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIHsgc3RyaWN0OiBmYWxzZSB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhdGggcGF0aCBvciBvYmplY3Qgb2Yga2V5L3ZhbHMgdG8gc2V0XG4gKiBAcGFyYW0ge01peGVkfSB2YWwgdGhlIHZhbHVlIHRvIHNldFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcnxldGMuLn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIFwib24tdGhlLWZseVwiIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWxseSBzcGVjaWZ5IG9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGJlaGF2aW9yIG9mIHRoZSBzZXRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCB0eXBlLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSh0eXBlLmNvbnN0cnVjdG9yKSkge1xuICAgIG9wdGlvbnMgPSB0eXBlO1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcbiAgICAsIGFkaG9jID0gdHlwZSAmJiB0cnVlICE9PSB0eXBlXG4gICAgLCBjb25zdHJ1Y3RpbmcgPSB0cnVlID09PSB0eXBlXG4gICAgLCBhZGhvY3M7XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMgJiYgJ3N0cmljdCcgaW4gb3B0aW9uc1xuICAgID8gb3B0aW9ucy5zdHJpY3RcbiAgICA6IHRoaXMuJF9fLnN0cmljdE1vZGU7XG5cbiAgaWYgKGFkaG9jKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgcGF0aCkge1xuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXG5cbiAgICBpZiAobnVsbCA9PT0gcGF0aCB8fCB1bmRlZmluZWQgPT09IHBhdGgpIHtcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XG4gICAgICBwYXRoID0gdmFsO1xuICAgICAgdmFsID0gX3RlbXA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHByZWZpeCA9IHZhbFxuICAgICAgICA/IHZhbCArICcuJ1xuICAgICAgICA6ICcnO1xuXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGgpXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgICAgICwgcGF0aHR5cGVcbiAgICAgICAgLCBrZXk7XG5cblxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBwYXRodHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHByZWZpeCArIGtleSk7XG4gICAgICAgIGlmIChudWxsICE9IHBhdGhba2V5XVxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXG4gICAgICAgICAgICAmJiBfLmlzUGxhaW5PYmplY3QocGF0aFtrZXldKVxuICAgICAgICAgICAgJiYgKCAhcGF0aFtrZXldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShwYXRoW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPSBwYXRodHlwZVxuICAgICAgICAgICAgJiYgISggdGhpcy4kX19wYXRoKCBwcmVmaXggKyBrZXkgKSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hIClcbiAgICAgICAgICAgICYmICEoIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0gJiYgdGhpcy5zY2hlbWEucGF0aHNba2V5XS5vcHRpb25zLnJlZiApXG4gICAgICAgICAgKXtcblxuICAgICAgICAgIHRoaXMuc2V0KHBhdGhba2V5XSwgcHJlZml4ICsga2V5LCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgaWYgKCdyZWFsJyA9PT0gcGF0aHR5cGUgfHwgJ3ZpcnR1YWwnID09PSBwYXRodHlwZSkge1xuICAgICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG5cbiAgICAgICAgICB9IGVsc2UgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBrZXkgKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkICE9PSBwYXRoW2tleV0pIHtcbiAgICAgICAgICB0aGlzLnNldChwcmVmaXggKyBrZXksIHBhdGhba2V5XSwgY29uc3RydWN0aW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICAvLyBlbnN1cmUgX3N0cmljdCBpcyBob25vcmVkIGZvciBvYmogcHJvcHNcbiAgLy8gZG9jc2NoZW1hID0gbmV3IFNjaGVtYSh7IHBhdGg6IHsgbmVzdDogJ3N0cmluZycgfX0pXG4gIC8vIGRvYy5zZXQoJ3BhdGgnLCBvYmopO1xuICB2YXIgcGF0aFR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwYXRoKTtcbiAgaWYgKCduZXN0ZWQnID09IHBhdGhUeXBlICYmIHZhbCAmJiBfLmlzUGxhaW5PYmplY3QodmFsKSAmJlxuICAgICAgKCF2YWwuY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHZhbC5jb25zdHJ1Y3RvcikpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT0gcGF0aFR5cGUgJiYgc3RyaWN0KSB7XG5cbiAgICAvLyBjaGVjayBmb3Igcm9vdHMgdGhhdCBhcmUgTWl4ZWQgdHlwZXNcbiAgICB2YXIgbWl4ZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSsxKS5qb2luKCcuJyk7XG4gICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICAgICAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hKSB7XG4gICAgICAgIC8vIGFsbG93IGNoYW5nZXMgdG8gc3ViIHBhdGhzIG9mIG1peGVkIHR5cGVzXG4gICAgICAgIG1peGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtaXhlZCkge1xuICAgICAgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpZWxkIGBcIiArIHBhdGggKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgfSBlbHNlIGlmICgndmlydHVhbCcgPT0gcGF0aFR5cGUpIHtcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKTtcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xuICB9XG5cbiAgdmFyIHBhdGhUb01hcms7XG5cbiAgLy8gV2hlbiB1c2luZyB0aGUgJHNldCBvcGVyYXRvciB0aGUgcGF0aCB0byB0aGUgZmllbGQgbXVzdCBhbHJlYWR5IGV4aXN0LlxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxuXG4gIGlmIChwYXJ0cy5sZW5ndGggPD0gMSkge1xuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9IGVsc2Uge1xuICAgIGZvciAoIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcbiAgICAgIGlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQoc3VicGF0aCkgLy8gZWFybGllciBwcmVmaXhlcyB0aGF0IGFyZSBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmtlZCBhcyBkaXJ0eSBoYXZlIHByZWNlZGVuY2VcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xuICAgICAgICBwYXRoVG9NYXJrID0gc3VicGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfVxuXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXG4gIHZhciBwcmlvclZhbCA9IGNvbnN0cnVjdGluZ1xuICAgID8gdW5kZWZpbmVkXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xuXG4gIGlmICghc2NoZW1hIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNob3VsZFNldCA9IHRoaXMuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XG4gIH0pO1xuXG4gIGlmIChzaG91bGRTZXQpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSBzaG91bGQgbWFyayB0aGlzIGNoYW5nZSBhcyBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXG4gICAgcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKSB7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xuXG4gIGlmICggdW5kZWZpbmVkID09PSB2YWwgJiYgIXRoaXMuaXNTZWxlY3RlZChwYXRoKSApIHtcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcbiAgICAvLyB2YWx1ZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IHZhbCAmJiBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSB7XG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF1dGlscy5kZWVwRXF1YWwodmFsLCBwcmlvclZhbCB8fCB0aGlzLmdldChwYXRoKSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8v0YLQtdGB0YIg0L3QtSDQv9GA0L7RhdC+0LTQuNGCINC40Lct0LfQsCDQvdCw0LvQuNGH0LjRjyDQu9C40YjQvdC10LPQviDQv9C+0LvRjyDQsiBzdGF0ZXMuZGVmYXVsdCAoY29tbWVudHMpXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XG4gIC8vY29uc29sZS5pbmZvKCBwYXRoLCBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICk7XG4gIC8vY29uc29sZS5sb2coIHRoaXMuJF9fLmFjdGl2ZVBhdGhzICk7XG5cbiAgLy8g0JrQvtCz0LTQsCDQvNGLINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INGC0LDQutC+0LUg0LbQtSDQt9C90LDRh9C10L3QuNC1INC60LDQuiBkZWZhdWx0XG4gIC8vINCd0LUg0L/QvtC90Y/RgtC90L4g0LfQsNGH0LXQvCDQvNCw0L3Qs9GD0YHRgiDQtdCz0L4g0L7QsdC90L7QstC70Y/Qu1xuICAvKmlmICghY29uc3RydWN0aW5nICYmXG4gICAgICBudWxsICE9IHZhbCAmJlxuICAgICAgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCAmJlxuICAgICAgdXRpbHMuZGVlcEVxdWFsKHZhbCwgc2NoZW1hLmdldERlZmF1bHQodGhpcywgY29uc3RydWN0aW5nKSkgKSB7XG5cbiAgICAvL2NvbnNvbGUubG9nKCBwYXRoVG9NYXJrLCB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5ICk7XG5cbiAgICAvLyBhIHBhdGggd2l0aCBhIGRlZmF1bHQgd2FzICR1bnNldCBvbiB0aGUgc2VydmVyXG4gICAgLy8gYW5kIHRoZSB1c2VyIGlzIHNldHRpbmcgaXQgdG8gdGhlIHNhbWUgdmFsdWUgYWdhaW5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSovXG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBhY3R1YWwgc2V0dGluZyBvZiB0aGUgdmFsdWUgYW5kIG1hcmtpbmcgdGhlIHBhdGggbW9kaWZpZWQgaWYgYXBwcm9wcmlhdGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXQgPSBmdW5jdGlvbiAoIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCApIHtcbiAgdmFyIHNob3VsZE1vZGlmeSA9IHRoaXMuJF9fc2hvdWxkTW9kaWZ5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKHNob3VsZE1vZGlmeSkge1xuICAgIHRoaXMubWFya01vZGlmaWVkKHBhdGhUb01hcmssIHZhbCk7XG4gIH1cblxuICB2YXIgb2JqID0gdGhpcy5fZG9jXG4gICAgLCBpID0gMFxuICAgICwgbCA9IHBhcnRzLmxlbmd0aDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaSArIDFcbiAgICAgICwgbGFzdCA9IG5leHQgPT09IGw7XG5cbiAgICBpZiAoIGxhc3QgKSB7XG4gICAgICBvYmpbcGFydHNbaV1dID0gdmFsO1xuXG4gICAgICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudFNldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGgsIHZhbCApO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbcGFydHNbaV1dICYmICdPYmplY3QnID09PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmICdFbWJlZGRlZERvY3VtZW50JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IpICkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgQXJyYXkuaXNBcnJheShvYmpbcGFydHNbaV1dKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSByYXcgdmFsdWUgZnJvbSBhIHBhdGggKG5vIGdldHRlcnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUocGF0aCwgdGhpcy5fZG9jKTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJhdyB2YWx1ZSBmb3IgYSBwYXRoIChubyBjYXN0aW5nLCBzZXR0ZXJzLCB0cmFuc2Zvcm1hdGlvbnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWx1ZSkge1xuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGEgcGF0aC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBwYXRoXG4gKiAgICAgZG9jLmdldCgnYWdlJykgLy8gNDdcbiAqXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXG4gKiAgICAgZG9jLmdldCgnYWdlJywgU3RyaW5nKSAvLyBcIjQ3XCJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIG9uLXRoZS1mbHkgYXR0cmlidXRlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoLCB0eXBlKSB7XG4gIHZhciBhZGhvY3M7XG4gIGlmICh0eXBlKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgdmFyIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKSB8fCB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKVxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgLCBvYmogPSB0aGlzLl9kb2M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkID09PSBvYmogfHwgbnVsbCA9PT0gb2JqXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcbiAgfVxuXG4gIGlmIChzY2hlbWEpIHtcbiAgICBvYmogPSBzY2hlbWEuYXBwbHlHZXR0ZXJzKG9iaiwgdGhpcyk7XG4gIH1cblxuICB0aGlzLmFkYXB0ZXJIb29rcy5kb2N1bWVudEdldFZhbHVlLmNhbGwoIHRoaXMsIHRoaXMsIHBhdGggKTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzY2hlbWF0eXBlIGZvciB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fcGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdmFyIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHNcbiAgICAsIGFkaG9jVHlwZSA9IGFkaG9jcyAmJiBhZGhvY3NbcGF0aF07XG5cbiAgaWYgKGFkaG9jVHlwZSkge1xuICAgIHJldHVybiBhZGhvY1R5cGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hLnBhdGgocGF0aCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgdGhlIHBhdGggYXMgaGF2aW5nIHBlbmRpbmcgY2hhbmdlcyB0byB3cml0ZSB0byB0aGUgZGIuXG4gKlxuICogX1ZlcnkgaGVscGZ1bCB3aGVuIHVzaW5nIFtNaXhlZF0oLi9zY2hlbWF0eXBlcy5odG1sI21peGVkKSB0eXBlcy5fXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZXMgdG8gbWl4ZWQudHlwZSBhcmUgbm93IHBlcnNpc3RlZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIG1hcmsgbW9kaWZpZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG59O1xuXG4vKipcbiAqIENhdGNoZXMgZXJyb3JzIHRoYXQgb2NjdXIgZHVyaW5nIGV4ZWN1dGlvbiBvZiBgZm5gIGFuZCBzdG9yZXMgdGhlbSB0byBsYXRlciBiZSBwYXNzZWQgd2hlbiBgc2F2ZSgpYCBpcyBleGVjdXRlZC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXSB0aGUgc2NvcGUgd2l0aCB3aGljaCB0byBjYWxsIGZuXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fdHJ5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3RyeSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgdmFyIHJlcztcbiAgdHJ5IHtcbiAgICBmbi5jYWxsKHNjb3BlKTtcbiAgICByZXMgPSB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy4kX19lcnJvcihlKTtcbiAgICByZXMgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsaXN0IG9mIHBhdGhzIHRoYXQgaGF2ZSBiZWVuIG1vZGlmaWVkLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1vZGlmaWVkUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkaXJlY3RNb2RpZmllZFBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG5cbiAgcmV0dXJuIGRpcmVjdE1vZGlmaWVkUGF0aHMucmVkdWNlKGZ1bmN0aW9uIChsaXN0LCBwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIHJldHVybiBsaXN0LmNvbmNhdChwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKGNoYWlucywgcGFydCwgaSkge1xuICAgICAgcmV0dXJuIGNoYWlucy5jb25jYXQocGFydHMuc2xpY2UoMCwgaSkuY29uY2F0KHBhcnQpLmpvaW4oJy4nKSk7XG4gICAgfSwgW10pKTtcbiAgfSwgW10pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhpcyBkb2N1bWVudCB3YXMgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogSWYgYHBhdGhgIGlzIGdpdmVuLCBjaGVja3MgaWYgYSBwYXRoIG9yIGFueSBmdWxsIHBhdGggY29udGFpbmluZyBgcGF0aGAgYXMgcGFydCBvZiBpdHMgcGF0aCBjaGFpbiBoYXMgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoKSAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMnKSAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpICAgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdIG9wdGlvbmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gcGF0aFxuICAgID8gISF+dGhpcy5tb2RpZmllZFBhdGhzKCkuaW5kZXhPZihwYXRoKVxuICAgIDogdGhpcy4kX18uYWN0aXZlUGF0aHMuc29tZSgnbW9kaWZ5Jyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgcGF0aGAgd2FzIGRpcmVjdGx5IHNldCBhbmQgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgLy8gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0RpcmVjdE1vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBpbml0aWFsaXplZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc0luaXQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHBhdGhgIHdhcyBzZWxlY3RlZCBpbiB0aGUgc291cmNlIHF1ZXJ5IHdoaWNoIGluaXRpYWxpemVkIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgVGhpbmcuZmluZE9uZSgpLnNlbGVjdCgnbmFtZScpLmV4ZWMoZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ25hbWUnKSAvLyB0cnVlXG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ2FnZScpICAvLyBmYWxzZVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gaXNTZWxlY3RlZCAocGF0aCkge1xuICBpZiAodGhpcy4kX18uc2VsZWN0ZWQpIHtcblxuICAgIGlmICgnX2lkJyA9PT0gcGF0aCkge1xuICAgICAgcmV0dXJuIDAgIT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5zZWxlY3RlZClcbiAgICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICAgLCBpbmNsdXNpdmUgPSBmYWxzZVxuICAgICAgLCBjdXI7XG5cbiAgICBpZiAoMSA9PT0gaSAmJiAnX2lkJyA9PT0gcGF0aHNbMF0pIHtcbiAgICAgIC8vIG9ubHkgX2lkIHdhcyBzZWxlY3RlZC5cbiAgICAgIHJldHVybiAwID09PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY3VyID0gcGF0aHNbaV07XG4gICAgICBpZiAoJ19pZCcgPT0gY3VyKSBjb250aW51ZTtcbiAgICAgIGluY2x1c2l2ZSA9ICEhIHRoaXMuJF9fLnNlbGVjdGVkW2N1cl07XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xuICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICB9XG5cbiAgICBpID0gcGF0aHMubGVuZ3RoO1xuICAgIHZhciBwYXRoRG90ID0gcGF0aCArICcuJztcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XG5cbiAgICAgIGlmICgwID09PSBjdXIuaW5kZXhPZihwYXRoRG90KSkge1xuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgICAgfVxuXG4gICAgICBpZiAoMCA9PT0gcGF0aERvdC5pbmRleE9mKGN1ciArICcuJykpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gISBpbmNsdXNpdmU7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRXhlY3V0ZXMgcmVnaXN0ZXJlZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGlzIGRvY3VtZW50LlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBgcHJlYCBzYXZlIGFuZCBpZiBhIHZhbGlkYXRpb24gcnVsZSBpcyB2aW9sYXRlZCwgW3NhdmVdKCNtb2RlbF9Nb2RlbC1zYXZlKSBpcyBhYm9ydGVkIGFuZCB0aGUgZXJyb3IgaXMgcmV0dXJuZWQgdG8geW91ciBgY2FsbGJhY2tgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgaWYgKGVycikgaGFuZGxlRXJyb3IoZXJyKTtcbiAqICAgICAgIGVsc2UgLy8gdmFsaWRhdGlvbiBwYXNzZWRcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBjYWxsZWQgYWZ0ZXIgdmFsaWRhdGlvbiBjb21wbGV0ZXMsIHBhc3NpbmcgYW4gZXJyb3IgaWYgb25lIG9jY3VycmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIG9ubHkgdmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzIHdoZW4gbmVjZXNzYXJ5XG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlKS5maWx0ZXIoZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBpZiAoIXNlbGYuaXNTZWxlY3RlZChwYXRoKSAmJiAhc2VsZi5pc01vZGlmaWVkKHBhdGgpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5pbml0KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpKTtcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpKTtcblxuICBpZiAoMCA9PT0gcGF0aHMubGVuZ3RoKSB7XG4gICAgY29tcGxldGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciB2YWxpZGF0aW5nID0ge31cbiAgICAsIHRvdGFsID0gMDtcblxuICBwYXRocy5mb3JFYWNoKHZhbGlkYXRlUGF0aCk7XG4gIHJldHVybiB0aGlzO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlUGF0aCAocGF0aCkge1xuICAgIGlmICh2YWxpZGF0aW5nW3BhdGhdKSByZXR1cm47XG5cbiAgICB2YWxpZGF0aW5nW3BhdGhdID0gdHJ1ZTtcbiAgICB0b3RhbCsrO1xuXG4gICAgdXRpbHMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgcCA9IHNlbGYuc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgICBpZiAoIXApIHJldHVybiAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XG5cbiAgICAgIHZhciB2YWwgPSBzZWxmLmdldFZhbHVlKHBhdGgpO1xuICAgICAgcC5kb1ZhbGlkYXRlKHZhbCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgc2VsZi5pbnZhbGlkYXRlKFxuICAgICAgICAgICAgICBwYXRoXG4gICAgICAgICAgICAsIGVyclxuICAgICAgICAgICAgLCB1bmRlZmluZWRcbiAgICAgICAgICAgIC8vLCB0cnVlIC8vIGVtYmVkZGVkIGRvY3NcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuICAgICAgfSwgc2VsZik7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21wbGV0ZSAoKSB7XG4gICAgdmFyIGVyciA9IHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgICBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgY2IgJiYgY2IoZXJyKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyBhIHBhdGggYXMgaW52YWxpZCwgY2F1c2luZyB2YWxpZGF0aW9uIHRvIGZhaWwuXG4gKlxuICogVGhlIGBlcnJvck1zZ2AgYXJndW1lbnQgd2lsbCBiZWNvbWUgdGhlIG1lc3NhZ2Ugb2YgdGhlIGBWYWxpZGF0aW9uRXJyb3JgLlxuICpcbiAqIFRoZSBgdmFsdWVgIGFyZ3VtZW50IChpZiBwYXNzZWQpIHdpbGwgYmUgYXZhaWxhYmxlIHRocm91Z2ggdGhlIGBWYWxpZGF0aW9uRXJyb3IudmFsdWVgIHByb3BlcnR5LlxuICpcbiAqICAgICBkb2MuaW52YWxpZGF0ZSgnc2l6ZScsICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsIDE0KTtcblxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gKiAgICAgICAvLyBwcmludHNcbiAqICAgICAgIHsgbWVzc2FnZTogJ1ZhbGlkYXRpb24gZmFpbGVkJyxcbiAqICAgICAgICAgbmFtZTogJ1ZhbGlkYXRpb25FcnJvcicsXG4gKiAgICAgICAgIGVycm9yczpcbiAqICAgICAgICAgIHsgc2l6ZTpcbiAqICAgICAgICAgICAgIHsgbWVzc2FnZTogJ211c3QgYmUgbGVzcyB0aGFuIDIwJyxcbiAqICAgICAgICAgICAgICAgbmFtZTogJ1ZhbGlkYXRvckVycm9yJyxcbiAqICAgICAgICAgICAgICAgcGF0aDogJ3NpemUnLFxuICogICAgICAgICAgICAgICB0eXBlOiAndXNlciBkZWZpbmVkJyxcbiAqICAgICAgICAgICAgICAgdmFsdWU6IDE0IH0gfSB9XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVycm9yTXNnIHRoZSBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ3xOdW1iZXJ8YW55fSB2YWx1ZSBvcHRpb25hbCBpbnZhbGlkIHZhbHVlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uIChwYXRoLCBlcnJvck1zZywgdmFsdWUpIHtcbiAgaWYgKCF0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IpIHtcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSBuZXcgVmFsaWRhdGlvbkVycm9yKHRoaXMpO1xuICB9XG5cbiAgaWYgKCFlcnJvck1zZyB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIGVycm9yTXNnKSB7XG4gICAgZXJyb3JNc2cgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgZXJyb3JNc2csICd1c2VyIGRlZmluZWQnLCB2YWx1ZSk7XG4gIH1cblxuICBpZiAodGhpcy4kX18udmFsaWRhdGlvbkVycm9yID09IGVycm9yTXNnKSByZXR1cm47XG5cbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yLmVycm9yc1twYXRoXSA9IGVycm9yTXNnO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIGludGVybmFsIG1vZGlmaWVkIHN0YXRlIG9mIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqIEBtZXRob2QgJF9fcmVzZXRcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19yZXNldCA9IGZ1bmN0aW9uIHJlc2V0ICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gc2VsZi5nZXRWYWx1ZShpKTtcbiAgfSlcbiAgLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XG4gICAgcmV0dXJuIHZhbCAmJiB2YWwuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICB9KVxuICAuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykgY29udGludWU7XG4gICAgICBkb2MuJF9fcmVzZXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsZWFyICdtb2RpZnknKCdkaXJ0eScpIGNhY2hlXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLmNsZWFyKCdtb2RpZnknKTtcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmVycm9ycyA9IHVuZGVmaW5lZDtcbiAgLy9jb25zb2xlLmxvZyggc2VsZi4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUgKTtcbiAgLy9UT0RPOiDRgtGD0YJcbiAgdGhpcy5zY2hlbWEucmVxdWlyZWRQYXRocygpLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKHBhdGgpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIGRpcnR5IHBhdGhzIC8gdmFscy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGlydHlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBhbGwgPSB0aGlzLiRfXy5hY3RpdmVQYXRocy5tYXAoJ21vZGlmeScsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxuICAgICAgICAgICAsIHZhbHVlOiBzZWxmLmdldFZhbHVlKCBwYXRoIClcbiAgICAgICAgICAgLCBzY2hlbWE6IHNlbGYuJF9fcGF0aCggcGF0aCApIH07XG4gIH0pO1xuXG4gIC8vIFNvcnQgZGlydHkgcGF0aHMgaW4gYSBmbGF0IGhpZXJhcmNoeS5cbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gKGEucGF0aCA8IGIucGF0aCA/IC0xIDogKGEucGF0aCA+IGIucGF0aCA/IDEgOiAwKSk7XG4gIH0pO1xuXG4gIC8vIElnbm9yZSBcImZvby5hXCIgaWYgXCJmb29cIiBpcyBkaXJ0eSBhbHJlYWR5LlxuICB2YXIgbWluaW1hbCA9IFtdXG4gICAgLCBsYXN0UGF0aFxuICAgICwgdG9wO1xuXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XG4gICAgbGFzdFBhdGggPSBpdGVtLnBhdGggKyAnLic7XG4gICAgbWluaW1hbC5wdXNoKGl0ZW0pO1xuICAgIHRvcCA9IGl0ZW07XG4gIH0pO1xuXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcbiAgcmV0dXJuIG1pbmltYWw7XG59O1xuXG4vKiFcbiAqIENvbXBpbGVzIHNjaGVtYXMuXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHNlbGYsIHRyZWUsIHByb3RvLCBwcmVmaXgpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBsaW1iXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgbGltYiA9IHRyZWVba2V5XTtcblxuICAgIGRlZmluZShzZWxmXG4gICAgICAgICwga2V5XG4gICAgICAgICwgKCgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKGxpbWIuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAmJiAoIWxpbWIudHlwZSB8fCBsaW1iLnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgID8gbGltYlxuICAgICAgICAgICAgICAgOiBudWxsKVxuICAgICAgICAsIHByb3RvXG4gICAgICAgICwgcHJlZml4XG4gICAgICAgICwga2V5cyk7XG4gIH1cbn1cblxuLy8gZ2V0cyBkZXNjcmlwdG9ycyBmb3IgYWxsIHByb3BlcnRpZXMgb2YgYG9iamVjdGBcbi8vIG1ha2VzIGFsbCBwcm9wZXJ0aWVzIG5vbi1lbnVtZXJhYmxlIHRvIG1hdGNoIHByZXZpb3VzIGJlaGF2aW9yIHRvICMyMjExXG5mdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIGtleSk7XG4gICAgcmVzdWx0W2tleV0uZW51bWVyYWJsZSA9IGZhbHNlO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiFcbiAqIERlZmluZXMgdGhlIGFjY2Vzc29yIG5hbWVkIHByb3Agb24gdGhlIGluY29taW5nIHByb3RvdHlwZS5cbiAqINGC0LDQvCDQttC1LCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LAg0YHQtNC10LvQsNC10Lwg0L3QsNCx0LvRjtC00LDQtdC80YvQvNC4XG4gKi9cbmZ1bmN0aW9uIGRlZmluZSAoc2VsZiwgcHJvcCwgc3VicHJvcHMsIHByb3RvdHlwZSwgcHJlZml4LCBrZXlzKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIHBhdGggPSAocHJlZml4ID8gcHJlZml4ICsgJy4nIDogJycpICsgcHJvcDtcblxuICBpZiAoc3VicHJvcHMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnMgPSB7fTtcblxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gc2F2ZSBzY29wZSBmb3IgbmVzdGVkIGdldHRlcnMvc2V0dGVyc1xuICAgICAgICAgICAgaWYgKCFwcmVmaXgpIG5lc3RlZC4kX18uc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBzaGFkb3cgaW5oZXJpdGVkIGdldHRlcnMgZnJvbSBzdWItb2JqZWN0cyBzb1xuICAgICAgICAgICAgLy8gdGhpbmcubmVzdGVkLm5lc3RlZC5uZXN0ZWQuLi4gZG9lc24ndCBvY2N1ciAoZ2gtMzY2KVxuICAgICAgICAgICAgdmFyIGkgPSAwXG4gICAgICAgICAgICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgLy8gb3Zlci13cml0ZSB0aGUgcGFyZW50cyBnZXR0ZXIgd2l0aG91dCB0cmlnZ2VyaW5nIGl0XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXN0ZWQsIGtleXNbaV0sIHtcbiAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlICAgLy8gSXQgZG9lc24ndCBzaG93IHVwLlxuICAgICAgICAgICAgICAgICwgd3JpdGFibGU6IHRydWUgICAgICAvLyBXZSBjYW4gc2V0IGl0IGxhdGVyLlxuICAgICAgICAgICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlICAvLyBXZSBjYW4gT2JqZWN0LmRlZmluZVByb3BlcnR5IGFnYWluLlxuICAgICAgICAgICAgICAgICwgdmFsdWU6IHVuZGVmaW5lZCAgICAvLyBJdCBzaGFkb3dzIGl0cyBwYXJlbnQuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXN0ZWQudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldChwYXRoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbXBpbGUoIHNlbGYsIHN1YnByb3BzLCBuZXN0ZWQsIHBhdGggKTtcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnNbcGF0aF0gPSBuZXN0ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuJF9fLmdldHRlcnNbcGF0aF07XG4gICAgICAgIH1cbiAgICAgICwgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmICh2IGluc3RhbmNlb2YgRG9jdW1lbnQpIHYgPSB2LnRvT2JqZWN0KCk7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLiRfXy5zY29wZSB8fCB0aGlzKS5zZXQoIHBhdGgsIHYgKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICwgZ2V0OiBmdW5jdGlvbiAoICkgeyByZXR1cm4gdGhpcy5nZXQuY2FsbCh0aGlzLiRfXy5zY29wZSB8fCB0aGlzLCBwYXRoKTsgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzLnNldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgsIHYpOyB9XG4gICAgfSk7XG5cbiAgICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIHByb3RvdHlwZSApO1xuICB9XG59XG5cbi8qKlxuICogQXNzaWducy9jb21waWxlcyBgc2NoZW1hYCBpbnRvIHRoaXMgZG9jdW1lbnRzIHByb3RvdHlwZS5cbiAqXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2V0U2NoZW1hXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSA9IGZ1bmN0aW9uICggc2NoZW1hICkge1xuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgY29tcGlsZSggdGhpcywgc2NoZW1hLnRyZWUsIHRoaXMgKTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCBzdWJkb2NzIChieSBiZnMpXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2dldEFsbFN1YmRvY3NcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QWxsU3ViZG9jcyA9IGZ1bmN0aW9uICgpIHtcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcbiAgRW1iZWRkZWQgPSBFbWJlZGRlZCB8fCByZXF1aXJlKCcuL3R5cGVzL2VtYmVkZGVkJyk7XG5cbiAgZnVuY3Rpb24gZG9jUmVkdWNlcihzZWVkLCBwYXRoKSB7XG4gICAgdmFyIHZhbCA9IHRoaXNbcGF0aF07XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2godmFsKTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSlcbiAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uIF9kb2NSZWR1Y2UoZG9jKSB7XG4gICAgICAgIGlmICghZG9jIHx8ICFkb2MuX2RvYykgcmV0dXJuO1xuICAgICAgICBpZiAoZG9jIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaChkb2MpO1xuICAgICAgICBzZWVkID0gT2JqZWN0LmtleXMoZG9jLl9kb2MpLnJlZHVjZShkb2NSZWR1Y2VyLmJpbmQoZG9jLl9kb2MpLCBzZWVkKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBzZWVkO1xuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2RvYykucmVkdWNlKGRvY1JlZHVjZXIuYmluZCh0aGlzKSwgW10pO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgZ2VuZXJpYyBzYXZlIHN0dWZmLlxuICogdG8gc29sdmUgIzE0NDYgdXNlIHVzZSBoaWVyYXJjaHkgaW5zdGVhZCBvZiBob29rc1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19wcmVzYXZlVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcHJlc2F2ZVZhbGlkYXRlID0gZnVuY3Rpb24gJF9fcHJlc2F2ZVZhbGlkYXRlKCkge1xuICAvLyBpZiBhbnkgZG9jLnNldCgpIGNhbGxzIGZhaWxlZFxuXG4gIHZhciBkb2NzID0gdGhpcy4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSgpO1xuXG4gIHZhciBlMiA9IGRvY3MubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICByZXR1cm4gZG9jLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICB9KTtcbiAgdmFyIGUxID0gW3RoaXMuJF9fLnNhdmVFcnJvcl0uY29uY2F0KGUyKTtcbiAgdmFyIGVyciA9IGUxLmZpbHRlcihmdW5jdGlvbiAoeCkge3JldHVybiB4fSlbMF07XG4gIHRoaXMuJF9fLnNhdmVFcnJvciA9IG51bGw7XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBwYXRoIHRoYXQgd2VyZSBjaGFuZ2VkIGFuZCBhcmUgYXJyYXlzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xuXG4gIC8vIHZhbGlkYXRlIGFsbCBkb2N1bWVudCBhcnJheXMuXG4gIHJldHVybiB0aGlzLiRfXy5hY3RpdmVQYXRoc1xuICAgIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFZhbHVlKGkpO1xuICAgIH0uYmluZCh0aGlzKSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICAgIH0pLnJlZHVjZShmdW5jdGlvbihzZWVkLCBhcnJheSkge1xuICAgICAgcmV0dXJuIHNlZWQuY29uY2F0KGFycmF5KTtcbiAgICB9LCBbXSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uIChkb2MpIHtyZXR1cm4gZG9jfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBlcnJvclxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Vycm9yXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBlcnI7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcm9kdWNlcyBhIHNwZWNpYWwgcXVlcnkgZG9jdW1lbnQgb2YgdGhlIG1vZGlmaWVkIHByb3BlcnRpZXMgdXNlZCBpbiB1cGRhdGVzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19kZWx0YVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kZWx0YSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcnR5ID0gdGhpcy4kX19kaXJ0eSgpO1xuXG4gIHZhciBkZWx0YSA9IHt9XG4gICAgLCBsZW4gPSBkaXJ0eS5sZW5ndGhcbiAgICAsIGQgPSAwO1xuXG4gIGZvciAoOyBkIDwgbGVuOyArK2QpIHtcbiAgICB2YXIgZGF0YSA9IGRpcnR5WyBkIF07XG4gICAgdmFyIHZhbHVlID0gZGF0YS52YWx1ZTtcblxuICAgIHZhbHVlID0gdXRpbHMuY2xvbmUodmFsdWUsIHsgZGVwb3B1bGF0ZTogMSB9KTtcbiAgICBkZWx0YVsgZGF0YS5wYXRoIF0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBkZWx0YTtcbn07XG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19oYW5kbGVTYXZlID0gZnVuY3Rpb24oKXtcbiAgLy8g0J/QvtC70YPRh9Cw0LXQvCDRgNC10YHRg9GA0YEg0LrQvtC70LvQtdC60YbQuNC4LCDQutGD0LTQsCDQsdGD0LTQtdC8INGB0L7RhdGA0LDQvdGP0YLRjCDQtNCw0L3QvdGL0LVcbiAgdmFyIHJlc291cmNlO1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJlc291cmNlID0gdGhpcy5jb2xsZWN0aW9uLmFwaTtcbiAgfVxuXG4gIHZhciBpbm5lclByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpO1xuXG4gIGlmICggdGhpcy5pc05ldyApIHtcbiAgICAvLyBzZW5kIGVudGlyZSBkb2NcbiAgICB2YXIgb2JqID0gdGhpcy50b09iamVjdCh7IGRlcG9wdWxhdGU6IDEgfSk7XG5cbiAgICBpZiAoICggb2JqIHx8IHt9ICkuaGFzT3duUHJvcGVydHkoJ19pZCcpID09PSBmYWxzZSApIHtcbiAgICAgIC8vIGRvY3VtZW50cyBtdXN0IGhhdmUgYW4gX2lkIGVsc2UgbW9uZ29vc2Ugd29uJ3Qga25vd1xuICAgICAgLy8gd2hhdCB0byB1cGRhdGUgbGF0ZXIgaWYgbW9yZSBjaGFuZ2VzIGFyZSBtYWRlLiB0aGUgdXNlclxuICAgICAgLy8gd291bGRuJ3Qga25vdyB3aGF0IF9pZCB3YXMgZ2VuZXJhdGVkIGJ5IG1vbmdvZGIgZWl0aGVyXG4gICAgICAvLyBub3Igd291bGQgdGhlIE9iamVjdElkIGdlbmVyYXRlZCBteSBtb25nb2RiIG5lY2Vzc2FyaWx5XG4gICAgICAvLyBtYXRjaCB0aGUgc2NoZW1hIGRlZmluaXRpb24uXG4gICAgICBpbm5lclByb21pc2UucmVqZWN0KG5ldyBFcnJvcignZG9jdW1lbnQgbXVzdCBoYXZlIGFuIF9pZCBiZWZvcmUgc2F2aW5nJykpO1xuICAgICAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxuICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc291cmNlLmNyZWF0ZSggb2JqICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgIH1cblxuICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgICAvLyBNYWtlIGl0IHBvc3NpYmxlIHRvIHJldHJ5IHRoZSBpbnNlcnRcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHRyZWF0IGl0IGFzIGEgbmV3IG9iamVjdCBvbiBlcnJvcixcbiAgICAvLyBzaW5jZSBpdCBhbHJlYWR5IGV4aXN0c1xuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IGZhbHNlO1xuXG4gICAgdmFyIGRlbHRhID0gdGhpcy4kX19kZWx0YSgpO1xuXG4gICAgaWYgKCAhXy5pc0VtcHR5KCBkZWx0YSApICkge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdCwINC+0LrRgNGD0LbQtdC90LjQtSDRgtC10YHRgtC+0LJcbiAgICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UoIHRoaXMuaWQgKS51cGRhdGUoIGRlbHRhICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gaW5uZXJQcm9taXNlO1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gU2F2ZXMgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAZXhhbXBsZTpcbiAqXG4gKiAgICAgcHJvZHVjdC5zb2xkID0gRGF0ZS5ub3coKTtcbiAqICAgICBwcm9kdWN0LnNhdmUoZnVuY3Rpb24gKGVyciwgcHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgIGlmIChlcnIpIC4uXG4gKiAgICAgfSlcbiAqXG4gKiBAZGVzY3JpcHRpb24gVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSB0aHJlZSBwYXJhbWV0ZXJzLCBgZXJyYCBpZiBhbiBlcnJvciBvY2N1cnJlZCwgYHByb2R1Y3RgIHdoaWNoIGlzIHRoZSBzYXZlZCBgcHJvZHVjdGAsIGFuZCBgbnVtYmVyQWZmZWN0ZWRgIHdoaWNoIHdpbGwgYmUgMSB3aGVuIHRoZSBkb2N1bWVudCB3YXMgZm91bmQgYW5kIHVwZGF0ZWQgaW4gdGhlIGRhdGFiYXNlLCBvdGhlcndpc2UgMC5cbiAqXG4gKiBUaGUgYGZuYCBjYWxsYmFjayBpcyBvcHRpb25hbC4gSWYgbm8gYGZuYCBpcyBwYXNzZWQgYW5kIHZhbGlkYXRpb24gZmFpbHMsIHRoZSB2YWxpZGF0aW9uIGVycm9yIHdpbGwgYmUgZW1pdHRlZCBvbiB0aGUgY29ubmVjdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGlzIG1vZGVsLlxuICogQGV4YW1wbGU6XG4gKiAgICAgdmFyIGRiID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHZhciBQcm9kdWN0ID0gZGIubW9kZWwoJ1Byb2R1Y3QnLCBzY2hlbWEpO1xuICpcbiAqICAgICBkYi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEhvd2V2ZXIsIGlmIHlvdSBkZXNpcmUgbW9yZSBsb2NhbCBlcnJvciBoYW5kbGluZyB5b3UgY2FuIGFkZCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHRoZSBtb2RlbCBhbmQgaGFuZGxlIGVycm9ycyB0aGVyZSBpbnN0ZWFkLlxuICogQGV4YW1wbGU6XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEFzIGFuIGV4dHJhIG1lYXN1cmUgb2YgZmxvdyBjb250cm9sLCBzYXZlIHdpbGwgcmV0dXJuIGEgUHJvbWlzZSAoYm91bmQgdG8gYGZuYCBpZiBwYXNzZWQpIHNvIGl0IGNvdWxkIGJlIGNoYWluZWQsIG9yIGhvb2sgdG8gcmVjaXZlIGVycm9yc1xuICogQGV4YW1wbGU6XG4gKiAgICAgcHJvZHVjdC5zYXZlKCkudGhlbihmdW5jdGlvbiAocHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgICAuLi5cbiAqICAgICB9KS5vblJlamVjdGVkKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICBhc3NlcnQub2soZXJyKVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbihlcnIsIHByb2R1Y3QsIE51bWJlcil9IFtkb25lXSBvcHRpb25hbCBjYWxsYmFja1xuICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZVxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgbWlkZGxld2FyZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9taWRkbGV3YXJlLmh0bWxcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoIGRvbmUgKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZpbmFsUHJvbWlzZSA9IG5ldyAkLkRlZmVycmVkKCkuZG9uZSggZG9uZSApO1xuXG4gIC8vINCh0L7RhdGA0LDQvdGP0YLRjCDQtNC+0LrRg9C80LXQvdGCINC80L7QttC90L4g0YLQvtC70YzQutC+INC10YHQu9C4INC+0L0g0L3QsNGF0L7QtNC40YLRgdGPINCyINC60L7Qu9C70LXQutGG0LjQuFxuICBpZiAoICF0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBhcmd1bWVudHMgKTtcbiAgICBjb25zb2xlLmVycm9yKCdEb2N1bWVudC5zYXZlIGFwaSBoYW5kbGUgaXMgbm90IGltcGxlbWVudGVkLicpO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcHJlU2F2ZSBlcnJvcnMgKNGC0L7Rh9C+INC30L3QsNGOLCDRh9GC0L4g0L7QvdCwINC/0YDQvtCy0LXRgNGP0LXRgiDQvtGI0LjQsdC60Lgg0LIg0LzQsNGB0YHQuNCy0LDRhSAoQ2FzdEVycm9yKSlcbiAgdmFyIHByZVNhdmVFcnIgPSBzZWxmLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICBpZiAoIHByZVNhdmVFcnIgKSB7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggcHJlU2F2ZUVyciApO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBWYWxpZGF0ZVxuICB2YXIgcDAgPSBuZXcgJC5EZWZlcnJlZCgpO1xuICBzZWxmLnZhbGlkYXRlKGZ1bmN0aW9uKCBlcnIgKXtcbiAgICBpZiAoIGVyciApe1xuICAgICAgcDAucmVqZWN0KCBlcnIgKTtcbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0gZWxzZSB7XG4gICAgICBwMC5yZXNvbHZlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyDQodC90LDRh9Cw0LvQsCDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LLRgdC1INC/0L7QtNC00L7QutGD0LzQtdC90YLRiyDQuCDRgdC00LXQu9Cw0YLRjCByZXNvbHZlISEhXG4gIC8vIENhbGwgc2F2ZSBob29rcyBvbiBzdWJkb2NzXG4gIHZhciBzdWJEb2NzID0gc2VsZi4kX19nZXRBbGxTdWJkb2NzKCk7XG4gIHZhciB3aGVuQ29uZCA9IHN1YkRvY3MubWFwKGZ1bmN0aW9uIChkKSB7cmV0dXJuIGQuc2F2ZSgpO30pO1xuICB3aGVuQ29uZC5wdXNoKCBwMCApO1xuXG4gIC8vINCi0LDQuiDQvNGLINC/0LXRgNC10LTQsNGR0Lwg0LzQsNGB0YHQuNCyIHByb21pc2Ug0YPRgdC70L7QstC40LlcbiAgdmFyIHAxID0gJC53aGVuLmFwcGx5KCAkLCB3aGVuQ29uZCApO1xuXG4gIC8vIEhhbmRsZSBzYXZlIGFuZCByZXN1bHRzXG4gIHAxXG4gICAgLnRoZW4oIHRoaXMuJF9faGFuZGxlU2F2ZS5iaW5kKCB0aGlzICkgKVxuICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZmluYWxQcm9taXNlLnJlc29sdmUoIHNlbGYgKTtcbiAgICB9LCBmdW5jdGlvbiAoIGVyciApIHtcbiAgICAgIC8vIElmIHRoZSBpbml0aWFsIGluc2VydCBmYWlscyBwcm92aWRlIGEgc2Vjb25kIGNoYW5jZS5cbiAgICAgIC8vIChJZiB3ZSBkaWQgdGhpcyBhbGwgdGhlIHRpbWUgd2Ugd291bGQgYnJlYWsgdXBkYXRlcylcbiAgICAgIGlmIChzZWxmLiRfXy5pbnNlcnRpbmcpIHtcbiAgICAgICAgc2VsZi5pc05ldyA9IHRydWU7XG4gICAgICAgIHNlbGYuZW1pdCgnaXNOZXcnLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0pO1xuXG4gIHJldHVybiBmaW5hbFByb21pc2U7XG59O1xuXG4vKmZ1bmN0aW9uIGFsbCAocHJvbWlzZU9mQXJyKSB7XG4gIHZhciBwUmV0ID0gbmV3IFByb21pc2U7XG4gIHRoaXMudGhlbihwcm9taXNlT2ZBcnIpLnRoZW4oXG4gICAgZnVuY3Rpb24gKHByb21pc2VBcnIpIHtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICB2YXIgcmV0ID0gW107XG4gICAgICB2YXIgZXJyU2VudGluZWw7XG4gICAgICBpZiAoIXByb21pc2VBcnIubGVuZ3RoKSBwUmV0LnJlc29sdmUoKTtcbiAgICAgIHByb21pc2VBcnIuZm9yRWFjaChmdW5jdGlvbiAocHJvbWlzZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHByb21pc2UudGhlbihcbiAgICAgICAgICBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgICAgIHJldFtpbmRleF0gPSB2YWw7XG4gICAgICAgICAgICAtLWNvdW50O1xuICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHBSZXQuZnVsZmlsbChyZXQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgICAgICBlcnJTZW50aW5lbCA9IGVycjtcbiAgICAgICAgICAgIHBSZXQucmVqZWN0KGVycik7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcFJldDtcbiAgICB9XG4gICAgLCBwUmV0LnJlamVjdC5iaW5kKHBSZXQpXG4gICk7XG4gIHJldHVybiBwUmV0O1xufSovXG5cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGlzIGRvY3VtZW50IGludG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCwgcmVhZHkgZm9yIHN0b3JhZ2UgaW4gTW9uZ29EQi5cbiAqXG4gKiBCdWZmZXJzIGFyZSBjb252ZXJ0ZWQgdG8gaW5zdGFuY2VzIG9mIFttb25nb2RiLkJpbmFyeV0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbCkgZm9yIHByb3BlciBzdG9yYWdlLlxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gYGdldHRlcnNgIGFwcGx5IGFsbCBnZXR0ZXJzIChwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnMpXG4gKiAtIGB2aXJ0dWFsc2AgYXBwbHkgdmlydHVhbCBnZXR0ZXJzIChjYW4gb3ZlcnJpZGUgYGdldHRlcnNgIG9wdGlvbilcbiAqIC0gYG1pbmltaXplYCByZW1vdmUgZW1wdHkgb2JqZWN0cyAoZGVmYXVsdHMgdG8gdHJ1ZSlcbiAqIC0gYHRyYW5zZm9ybWAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gdGhlIHJlc3VsdGluZyBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nXG4gKlxuICogIyMjI0dldHRlcnMvVmlydHVhbHNcbiAqXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgcGF0aCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUsIHZpcnR1YWxzOiBmYWxzZSB9KVxuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBFeGFtcGxlIG9mIGFwcGx5aW5nIGJvdGggcGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUgfSlcbiAqXG4gKiBUbyBhcHBseSB0aGVzZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvT2JqZWN0YCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvT2JqZWN0JywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqICMjIyNUcmFuc2Zvcm1cbiAqXG4gKiBXZSBtYXkgbmVlZCB0byBwZXJmb3JtIGEgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHJlc3VsdGluZyBvYmplY3QgYmFzZWQgb24gc29tZSBjcml0ZXJpYSwgc2F5IHRvIHJlbW92ZSBzb21lIHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiBvciByZXR1cm4gYSBjdXN0b20gb2JqZWN0LiBJbiB0aGlzIGNhc2Ugd2Ugc2V0IHRoZSBvcHRpb25hbCBgdHJhbnNmb3JtYCBmdW5jdGlvbi5cbiAqXG4gKiBUcmFuc2Zvcm0gZnVuY3Rpb25zIHJlY2VpdmUgdGhyZWUgYXJndW1lbnRzXG4gKlxuICogICAgIGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge31cbiAqXG4gKiAtIGBkb2NgIFRoZSBtb25nb29zZSBkb2N1bWVudCB3aGljaCBpcyBiZWluZyBjb252ZXJ0ZWRcbiAqIC0gYHJldGAgVGhlIHBsYWluIG9iamVjdCByZXByZXNlbnRhdGlvbiB3aGljaCBoYXMgYmVlbiBjb252ZXJ0ZWRcbiAqIC0gYG9wdGlvbnNgIFRoZSBvcHRpb25zIGluIHVzZSAoZWl0aGVyIHNjaGVtYSBvcHRpb25zIG9yIHRoZSBvcHRpb25zIHBhc3NlZCBpbmxpbmUpXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gc3BlY2lmeSB0aGUgdHJhbnNmb3JtIHNjaGVtYSBvcHRpb25cbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgLy8gcmVtb3ZlIHRoZSBfaWQgb2YgZXZlcnkgZG9jdW1lbnQgYmVmb3JlIHJldHVybmluZyB0aGUgcmVzdWx0XG4gKiAgICAgICBkZWxldGUgcmV0Ll9pZDtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogV2l0aCB0cmFuc2Zvcm1hdGlvbnMgd2UgY2FuIGRvIGEgbG90IG1vcmUgdGhhbiByZW1vdmUgcHJvcGVydGllcy4gV2UgY2FuIGV2ZW4gcmV0dXJuIGNvbXBsZXRlbHkgbmV3IGN1c3RvbWl6ZWQgb2JqZWN0czpcbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIHJldHVybiB7IG1vdmllOiByZXQubmFtZSB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgX2lkOiAnYW5JZCcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IG1vdmllOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBfTm90ZTogaWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBgdW5kZWZpbmVkYCwgdGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuX1xuICpcbiAqIFRyYW5zZm9ybWF0aW9ucyBtYXkgYWxzbyBiZSBhcHBsaWVkIGlubGluZSwgb3ZlcnJpZGRpbmcgYW55IHRyYW5zZm9ybSBzZXQgaW4gdGhlIG9wdGlvbnM6XG4gKlxuICogICAgIGZ1bmN0aW9uIHhmb3JtIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgaW5saW5lOiByZXQubmFtZSwgY3VzdG9tOiB0cnVlIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHBhc3MgdGhlIHRyYW5zZm9ybSBhcyBhbiBpbmxpbmUgb3B0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdHJhbnNmb3JtOiB4Zm9ybSB9KTsgLy8geyBpbmxpbmU6ICdXcmVjay1pdCBSYWxwaCcsIGN1c3RvbTogdHJ1ZSB9XG4gKlxuICogX05vdGU6IGlmIHlvdSBjYWxsIGB0b09iamVjdGAgYW5kIHBhc3MgYW55IG9wdGlvbnMsIHRoZSB0cmFuc2Zvcm0gZGVjbGFyZWQgaW4geW91ciBzY2hlbWEgb3B0aW9ucyB3aWxsIF9fbm90X18gYmUgYXBwbGllZC4gVG8gZm9yY2UgaXRzIGFwcGxpY2F0aW9uIHBhc3MgYHRyYW5zZm9ybTogdHJ1ZWBfXG4gKlxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QuaGlkZSA9ICdfaWQnO1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgaWYgKG9wdGlvbnMuaGlkZSkge1xuICogICAgICAgICBvcHRpb25zLmhpZGUuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gKiAgICAgICAgICAgZGVsZXRlIHJldFtwcm9wXTtcbiAqICAgICAgICAgfSk7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH0pO1xuICogICAgIGRvYy50b09iamVjdCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7IHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJyB9KTsgICAgICAgICAgICAgICAgICAvLyB7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqICAgICBkb2MudG9PYmplY3QoeyBoaWRlOiAnc2VjcmV0IF9pZCcsIHRyYW5zZm9ybTogdHJ1ZSB9KTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBUcmFuc2Zvcm1zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBfYW5kIGVhY2ggb2YgaXRzIHN1Yi1kb2N1bWVudHNfLiBUbyBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgeW91IGFyZSBjdXJyZW50bHkgb3BlcmF0aW5nIG9uIGEgc3ViLWRvY3VtZW50IHlvdSBtaWdodCB1c2UgdGhlIGZvbGxvd2luZyBndWFyZDpcbiAqXG4gKiAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRvYy5vd25lckRvY3VtZW50KSB7XG4gKiAgICAgICAvLyB3b3JraW5nIHdpdGggYSBzdWIgZG9jXG4gKiAgICAgfVxuICpcbiAqIFRyYW5zZm9ybXMsIGxpa2UgYWxsIG9mIHRoZXNlIG9wdGlvbnMsIGFyZSBhbHNvIGF2YWlsYWJsZSBmb3IgYHRvSlNPTmAuXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgZm9yIHNvbWUgbW9yZSBkZXRhaWxzLlxuICpcbiAqIF9EdXJpbmcgc2F2ZSwgbm8gY3VzdG9tIG9wdGlvbnMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IGJlZm9yZSBiZWluZyBzZW50IHRvIHRoZSBkYXRhYmFzZS5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHJldHVybiB7T2JqZWN0fSBqcyBvYmplY3RcbiAqIEBzZWUgbW9uZ29kYi5CaW5hcnkgaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlICYmIHRoaXMuJF9fLndhc1BvcHVsYXRlZCkge1xuICAgIC8vIHBvcHVsYXRlZCBwYXRocyB0aGF0IHdlIHNldCB0byBhIGRvY3VtZW50XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFdoZW4gaW50ZXJuYWxseSBzYXZpbmcgdGhpcyBkb2N1bWVudCB3ZSBhbHdheXMgcGFzcyBvcHRpb25zLFxuICAvLyBieXBhc3NpbmcgdGhlIGN1c3RvbSBzY2hlbWEgb3B0aW9ucy5cbiAgdmFyIG9wdGlvbnNQYXJhbWV0ZXIgPSBvcHRpb25zO1xuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZShvcHRpb25zLmNvbnN0cnVjdG9yKSkgfHxcbiAgICAob3B0aW9ucyAmJiBvcHRpb25zLl91c2VTY2hlbWFPcHRpb25zKSkge1xuICAgIG9wdGlvbnMgPSB0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0XG4gICAgICA/IGNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpXG4gICAgICA6IHt9O1xuICB9XG5cbiAgaWYgKCBvcHRpb25zLm1pbmltaXplID09PSB1bmRlZmluZWQgKXtcbiAgICBvcHRpb25zLm1pbmltaXplID0gdGhpcy5zY2hlbWEub3B0aW9ucy5taW5pbWl6ZTtcbiAgfVxuXG4gIGlmICghb3B0aW9uc1BhcmFtZXRlcikge1xuICAgIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMgPSB0cnVlO1xuICB9XG5cbiAgdmFyIHJldCA9IHV0aWxzLmNsb25lKHRoaXMuX2RvYywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMudmlydHVhbHMgfHwgb3B0aW9ucy5nZXR0ZXJzICYmIGZhbHNlICE9PSBvcHRpb25zLnZpcnR1YWxzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3ZpcnR1YWxzJywgb3B0aW9ucyk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5nZXR0ZXJzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3BhdGhzJywgb3B0aW9ucyk7XG4gICAgLy8gYXBwbHlHZXR0ZXJzIGZvciBwYXRocyB3aWxsIGFkZCBuZXN0ZWQgZW1wdHkgb2JqZWN0cztcbiAgICAvLyBpZiBtaW5pbWl6ZSBpcyBzZXQsIHdlIG5lZWQgdG8gcmVtb3ZlIHRoZW0uXG4gICAgaWYgKG9wdGlvbnMubWluaW1pemUpIHtcbiAgICAgIHJldCA9IG1pbmltaXplKHJldCkgfHwge307XG4gICAgfVxuICB9XG5cbiAgLy8gSW4gdGhlIGNhc2Ugd2hlcmUgYSBzdWJkb2N1bWVudCBoYXMgaXRzIG93biB0cmFuc2Zvcm0gZnVuY3Rpb24sIHdlIG5lZWQgdG9cbiAgLy8gY2hlY2sgYW5kIHNlZSBpZiB0aGUgcGFyZW50IGhhcyBhIHRyYW5zZm9ybSAob3B0aW9ucy50cmFuc2Zvcm0pIGFuZCBpZiB0aGVcbiAgLy8gY2hpbGQgc2NoZW1hIGhhcyBhIHRyYW5zZm9ybSAodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCkgSW4gdGhpcyBjYXNlLFxuICAvLyB3ZSBuZWVkIHRvIGFkanVzdCBvcHRpb25zLnRyYW5zZm9ybSB0byBiZSB0aGUgY2hpbGQgc2NoZW1hJ3MgdHJhbnNmb3JtIGFuZFxuICAvLyBub3QgdGhlIHBhcmVudCBzY2hlbWEnc1xuICBpZiAodHJ1ZSA9PT0gb3B0aW9ucy50cmFuc2Zvcm0gfHxcbiAgICAgICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ICYmIG9wdGlvbnMudHJhbnNmb3JtKSkge1xuICAgIHZhciBvcHRzID0gb3B0aW9ucy5qc29uXG4gICAgICA/IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA6IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XG4gICAgaWYgKG9wdHMpIHtcbiAgICAgIG9wdGlvbnMudHJhbnNmb3JtID0gb3B0cy50cmFuc2Zvcm07XG4gICAgfVxuICB9XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgdmFyIHhmb3JtZWQgPSBvcHRpb25zLnRyYW5zZm9ybSh0aGlzLCByZXQsIG9wdGlvbnMpO1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgeGZvcm1lZCkgcmV0ID0geGZvcm1lZDtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuXG4vKiFcbiAqIE1pbmltaXplcyBhbiBvYmplY3QsIHJlbW92aW5nIHVuZGVmaW5lZCB2YWx1ZXMgYW5kIGVtcHR5IG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IHRvIG1pbmltaXplXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gbWluaW1pemUgKG9iaikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgaGFzS2V5c1xuICAgICwga2V5XG4gICAgLCB2YWw7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgdmFsID0gb2JqW2tleV07XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdCh2YWwpICkge1xuICAgICAgb2JqW2tleV0gPSBtaW5pbWl6ZSh2YWwpO1xuICAgIH1cblxuICAgIGlmICh1bmRlZmluZWQgPT09IG9ialtrZXldKSB7XG4gICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBoYXNLZXlzID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBoYXNLZXlzXG4gICAgPyBvYmpcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuLyohXG4gKiBBcHBsaWVzIHZpcnR1YWxzIHByb3BlcnRpZXMgdG8gYGpzb25gLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IHNlbGZcbiAqIEBwYXJhbSB7T2JqZWN0fSBqc29uXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBlaXRoZXIgYHZpcnR1YWxzYCBvciBgcGF0aHNgXG4gKiBAcmV0dXJuIHtPYmplY3R9IGBqc29uYFxuICovXG5cbmZ1bmN0aW9uIGFwcGx5R2V0dGVycyAoc2VsZiwganNvbiwgdHlwZSwgb3B0aW9ucykge1xuICB2YXIgc2NoZW1hID0gc2VsZi5zY2hlbWFcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoc2NoZW1hW3R5cGVdKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcGF0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgcGF0aCA9IHBhdGhzW2ldO1xuXG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgICAsIHBsZW4gPSBwYXJ0cy5sZW5ndGhcbiAgICAgICwgbGFzdCA9IHBsZW4gLSAxXG4gICAgICAsIGJyYW5jaCA9IGpzb25cbiAgICAgICwgcGFydDtcblxuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBwbGVuOyArK2lpKSB7XG4gICAgICBwYXJ0ID0gcGFydHNbaWldO1xuICAgICAgaWYgKGlpID09PSBsYXN0KSB7XG4gICAgICAgIGJyYW5jaFtwYXJ0XSA9IHV0aWxzLmNsb25lKHNlbGYuZ2V0KHBhdGgpLCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaFtwYXJ0XSB8fCAoYnJhbmNoW3BhcnRdID0ge30pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBqc29uO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgaXMgdXNlZCBpbiBjYWxscyB0byBKU09OLnN0cmluZ2lmeShkb2MpLlxuICpcbiAqIFRoaXMgbWV0aG9kIGFjY2VwdHMgdGhlIHNhbWUgb3B0aW9ucyBhcyBbRG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkuIFRvIGFwcGx5IHRoZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvSlNPTmAgb3B0aW9uIHRvIHRoZSBzYW1lIGFyZ3VtZW50LlxuICpcbiAqICAgICBzY2hlbWEuc2V0KCd0b0pTT04nLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIGZvciBkZXRhaWxzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAc2VlIERvY3VtZW50I3RvT2JqZWN0ICNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgLy8gY2hlY2sgZm9yIG9iamVjdCB0eXBlIHNpbmNlIGFuIGFycmF5IG9mIGRvY3VtZW50c1xuICAvLyBiZWluZyBzdHJpbmdpZmllZCBwYXNzZXMgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkXG4gIC8vIG9mIG9wdGlvbnMgb2JqZWN0cy4gSlNPTi5zdHJpbmdpZnkoW2RvYywgZG9jXSlcbiAgLy8gVGhlIHNlY29uZCBjaGVjayBoZXJlIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IHBvcHVsYXRlZCBkb2N1bWVudHMgKG9yXG4gIC8vIHN1YmRvY3VtZW50cykgdXNlIHRoZWlyIG93biBvcHRpb25zIGZvciBgLnRvSlNPTigpYCBpbnN0ZWFkIG9mIHRoZWlyXG4gIC8vIHBhcmVudCdzXG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKG9wdGlvbnMuY29uc3RydWN0b3IpKVxuICAgICAgfHwgKCghb3B0aW9ucyB8fCBvcHRpb25zLmpzb24pICYmIHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKSkge1xuXG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA/IHV0aWxzLmNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKVxuICAgICAgOiB7fTtcbiAgfVxuICBvcHRpb25zLmpzb24gPSB0cnVlO1xuXG4gIHJldHVybiB0aGlzLnRvT2JqZWN0KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIERvY3VtZW50IHN0b3JlcyB0aGUgc2FtZSBkYXRhIGFzIGRvYy5cbiAqXG4gKiBEb2N1bWVudHMgYXJlIGNvbnNpZGVyZWQgZXF1YWwgd2hlbiB0aGV5IGhhdmUgbWF0Y2hpbmcgYF9pZGBzLCB1bmxlc3MgbmVpdGhlclxuICogZG9jdW1lbnQgaGFzIGFuIGBfaWRgLCBpbiB3aGljaCBjYXNlIHRoaXMgZnVuY3Rpb24gZmFsbHMgYmFjayB0byB1c2luZ1xuICogYGRlZXBFcXVhbCgpYC5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgYSBkb2N1bWVudCB0byBjb21wYXJlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGRvYykge1xuICB2YXIgdGlkID0gdGhpcy5nZXQoJ19pZCcpO1xuICB2YXIgZG9jaWQgPSBkb2MuZ2V0KCdfaWQnKTtcbiAgaWYgKCF0aWQgJiYgIWRvY2lkKSB7XG4gICAgcmV0dXJuIGRlZXBFcXVhbCh0aGlzLCBkb2MpO1xuICB9XG4gIHJldHVybiB0aWQgJiYgdGlkLmVxdWFsc1xuICAgID8gdGlkLmVxdWFscyhkb2NpZClcbiAgICA6IHRpZCA9PT0gZG9jaWQ7XG59O1xuXG4vKipcbiAqIEdldHMgX2lkKHMpIHVzZWQgZHVyaW5nIHBvcHVsYXRpb24gb2YgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgTW9kZWwuZmluZE9uZSgpLnBvcHVsYXRlKCdhdXRob3InKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coZG9jLmF1dGhvci5uYW1lKSAgICAgICAgIC8vIERyLlNldXNzXG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MucG9wdWxhdGVkKCdhdXRob3InKSkgLy8gJzUxNDRjZjgwNTBmMDcxZDk3OWMxMThhNydcbiAqICAgICB9KVxuICpcbiAqIElmIHRoZSBwYXRoIHdhcyBub3QgcG9wdWxhdGVkLCB1bmRlZmluZWQgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fE9iamVjdElkfE51bWJlcnxCdWZmZXJ8U3RyaW5nfHVuZGVmaW5lZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5wb3B1bGF0ZWQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvcHRpb25zKSB7XG4gIC8vIHZhbCBhbmQgb3B0aW9ucyBhcmUgaW50ZXJuYWxcblxuICAvL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0Y3RgtGDINC/0YDQvtCy0LXRgNC60YMsINC+0L3QsCDQtNC+0LvQttC90LAg0L7Qv9C40YDQsNGC0YzRgdGPINC90LUg0L3QsCAkX18ucG9wdWxhdGVkLCDQsCDQvdCwINGC0L4sINGH0YLQviDQvdCw0Ygg0L7QsdGK0LXQutGCINC40LzQtdC10YIg0YDQvtC00LjRgtC10LvRj1xuICAvLyDQuCDQv9C+0YLQvtC8INGD0LbQtSDQstGL0YHRgtCw0LLQu9GP0YLRjCDRgdCy0L7QudGB0YLQstC+IHBvcHVsYXRlZCA9PSB0cnVlXG4gIGlmIChudWxsID09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHZhciB2ID0gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICAgIGlmICh2KSByZXR1cm4gdi52YWx1ZTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gaW50ZXJuYWxcblxuICBpZiAodHJ1ZSA9PT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgfVxuXG4gIHRoaXMuJF9fLnBvcHVsYXRlZCB8fCAodGhpcy4kX18ucG9wdWxhdGVkID0ge30pO1xuICB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF0gPSB7IHZhbHVlOiB2YWwsIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgLy8gb3ZlcnJpZGRlbiBpbiBTdWJEb2N1bWVudHNcbiAgcmV0dXJuIHBhdGggfHwgJyc7XG59O1xuXG4vKipcbiAqINCj0LTQsNC70LjRgtGMINC00L7QutGD0LzQtdC90YIg0Lgg0LLQtdGA0L3Rg9GC0Ywg0LrQvtC70LvQtdC60YbQuNGOLlxuICpcbiAqIEBleGFtcGxlXG4gKiBzdG9yYWdlLmNvbGxlY3Rpb24uZG9jdW1lbnQucmVtb3ZlKCk7XG4gKiBkb2N1bWVudC5yZW1vdmUoKTtcbiAqXG4gKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCl7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoIHRoaXMgKTtcbiAgfVxuXG4gIHJldHVybiBkZWxldGUgdGhpcztcbn07XG5cblxuLyoqXG4gKiDQntGH0LjRidCw0LXRgiDQtNC+0LrRg9C80LXQvdGCICjQstGL0YHRgtCw0LLQu9GP0LXRgiDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOINC40LvQuCB1bmRlZmluZWQpXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBkb2MgPSB0aGlzXG4gICAgLCBzZWxmID0gdGhpc1xuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkgY29udGludWU7XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cbiAgICAgICwgcGF0aCA9IHAuc3BsaXQoJy4nKVxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxuICAgICAgLCBkb2NfID0gZG9jXG4gICAgICAsIGkgPSAwO1xuXG4gICAgZm9yICggOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cbiAgICAgICAgLCBkZWZhdWx0VmFsO1xuXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcblxuICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbCB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmRlZmF1bHQoIHAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbkRvY3VtZW50LlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnQ7XG4iLCIvL3RvZG86INC/0L7RgNGC0LjRgNC+0LLQsNGC0Ywg0LLRgdC1INC+0YjQuNCx0LrQuCEhIVxuLyoqXG4gKiBTdG9yYWdlRXJyb3IgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIC0gRXJyb3IgbWVzc2FnZVxuICogQGluaGVyaXRzIEVycm9yIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yXG4gKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc4MzgxOC9ob3ctZG8taS1jcmVhdGUtYS1jdXN0b20tZXJyb3ItaW4tamF2YXNjcmlwdFxuICovXG5mdW5jdGlvbiBTdG9yYWdlRXJyb3IgKCBtc2cgKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1zZztcbiAgdGhpcy5uYW1lID0gJ1N0b3JhZ2VFcnJvcic7XG59XG5TdG9yYWdlRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cblxuLyohXG4gKiBGb3JtYXRzIGVycm9yIG1lc3NhZ2VzXG4gKi9cblN0b3JhZ2VFcnJvci5wcm90b3R5cGUuZm9ybWF0TWVzc2FnZSA9IGZ1bmN0aW9uIChtc2csIHBhdGgsIHR5cGUsIHZhbCkge1xuICBpZiAoIW1zZykgdGhyb3cgbmV3IFR5cGVFcnJvcignbWVzc2FnZSBpcyByZXF1aXJlZCcpO1xuXG4gIHJldHVybiBtc2cucmVwbGFjZSgve1BBVEh9LywgcGF0aClcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VkFMVUV9LywgU3RyaW5nKHZhbHx8JycpKVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tUWVBFfS8sIHR5cGUgfHwgJ2RlY2xhcmVkIHR5cGUnKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRXJyb3I7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLlxuICpcbiAqIEBzZWUgRXJyb3IubWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZUVycm9yLm1lc3NhZ2VzID0gcmVxdWlyZSgnLi9lcnJvci9tZXNzYWdlcycpO1xuXG4vKiFcbiAqIEV4cG9zZSBzdWJjbGFzc2VzXG4gKi9cblxuU3RvcmFnZUVycm9yLkNhc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvY2FzdCcpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdGlvbicpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0b3InKTtcbi8vdG9kbzpcbi8vU3RvcmFnZUVycm9yLlZlcnNpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmVyc2lvbicpO1xuLy9TdG9yYWdlRXJyb3IuT3ZlcndyaXRlTW9kZWxFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3Ivb3ZlcndyaXRlTW9kZWwnKTtcbi8vU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xuLy9TdG9yYWdlRXJyb3IuRGl2ZXJnZW50QXJyYXlFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvZGl2ZXJnZW50QXJyYXknKTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDYXN0RXJyb3IgKHR5cGUsIHZhbHVlLCBwYXRoKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xuICB0aGlzLm5hbWUgPSAnQ2FzdEVycm9yJztcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnBhdGggPSBwYXRoO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gTW9uZ29vc2VFcnJvci5cbiAqL1xuQ2FzdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcbkNhc3RFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYXN0RXJyb3I7XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FzdEVycm9yO1xuIiwiXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy4gVGhlc2UgbWF5IGJlIGN1c3RvbWl6ZWQuXG4gKlxuICogICAgIC8vIGN1c3RvbWl6ZSB3aXRoaW4gZWFjaCBzY2hlbWEgb3IgZ2xvYmFsbHkgbGlrZSBzb1xuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgbW9uZ29vc2UuRXJyb3IubWVzc2FnZXMuU3RyaW5nLmVudW0gID0gXCJZb3VyIGN1c3RvbSBtZXNzYWdlIGZvciB7UEFUSH0uXCI7XG4gKlxuICogQXMgeW91IG1pZ2h0IGhhdmUgbm90aWNlZCwgZXJyb3IgbWVzc2FnZXMgc3VwcG9ydCBiYXNpYyB0ZW1wbGF0aW5nXG4gKlxuICogLSBge1BBVEh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIGRvY3VtZW50IHBhdGhcbiAqIC0gYHtWQUxVRX1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqIC0gYHtUWVBFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgdmFsaWRhdG9yIHR5cGUgc3VjaCBhcyBcInJlZ2V4cFwiLCBcIm1pblwiLCBvciBcInVzZXIgZGVmaW5lZFwiXG4gKiAtIGB7TUlOfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWluIHZhbHVlIGZvciB0aGUgTnVtYmVyLm1pbiB2YWxpZGF0b3JcbiAqIC0gYHtNQVh9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtYXggdmFsdWUgZm9yIHRoZSBOdW1iZXIubWF4IHZhbGlkYXRvclxuICpcbiAqIENsaWNrIHRoZSBcInNob3cgY29kZVwiIGxpbmsgYmVsb3cgdG8gc2VlIGFsbCBkZWZhdWx0cy5cbiAqXG4gKiBAcHJvcGVydHkgbWVzc2FnZXNcbiAqIEByZWNlaXZlciBNb25nb29zZUVycm9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnZhciBtc2cgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5tc2cuZ2VuZXJhbCA9IHt9O1xubXNnLmdlbmVyYWwuZGVmYXVsdCA9IFwiVmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YFwiO1xubXNnLmdlbmVyYWwucmVxdWlyZWQgPSBcIlBhdGggYHtQQVRIfWAgaXMgcmVxdWlyZWQuXCI7XG5cbm1zZy5OdW1iZXIgPSB7fTtcbm1zZy5OdW1iZXIubWluID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBsZXNzIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlICh7TUlOfSkuXCI7XG5tc2cuTnVtYmVyLm1heCA9IFwiUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbW9yZSB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZSAoe01BWH0pLlwiO1xuXG5tc2cuU3RyaW5nID0ge307XG5tc2cuU3RyaW5nLmVudW0gPSBcImB7VkFMVUV9YCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGB7UEFUSH1gLlwiO1xubXNnLlN0cmluZy5tYXRjaCA9IFwiUGF0aCBge1BBVEh9YCBpcyBpbnZhbGlkICh7VkFMVUV9KS5cIjtcblxuIiwiXG4vKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHNcbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBEb2N1bWVudCBWYWxpZGF0aW9uIEVycm9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBpbnN0YW5jZVxuICogQGluaGVyaXRzIE1vbmdvb3NlRXJyb3JcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IgKGluc3RhbmNlKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIFwiVmFsaWRhdGlvbiBmYWlsZWRcIik7XG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0aW9uRXJyb3InO1xuICB0aGlzLmVycm9ycyA9IGluc3RhbmNlLmVycm9ycyA9IHt9O1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gTW9uZ29vc2VFcnJvci5cbiAqL1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcbnZhciBlcnJvck1lc3NhZ2VzID0gU3RvcmFnZUVycm9yLm1lc3NhZ2VzO1xuXG4vKipcbiAqIFNjaGVtYSB2YWxpZGF0b3IgZXJyb3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTdHJpbmd9IG1zZ1xuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfGFueX0gdmFsXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdG9yRXJyb3IgKHBhdGgsIG1zZywgdHlwZSwgdmFsKSB7XG4gIGlmICghbXNnKSBtc2cgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcbiAgdmFyIG1lc3NhZ2UgPSB0aGlzLmZvcm1hdE1lc3NhZ2UobXNnLCBwYXRoLCB0eXBlLCB2YWwpO1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRvckVycm9yJztcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbDtcbn1cblxuLyohXG4gKiB0b1N0cmluZyBoZWxwZXJcbiAqL1xuXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLm1lc3NhZ2U7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yXG4gKi9cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN0b3JhZ2VFcnJvci5wcm90b3R5cGUgKTtcblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRvckVycm9yO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvckVycm9yO1xuIiwiLy8gQmFja2JvbmUuRXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbi8vIHN1Y2Nlc3Npb24uXG4vL1xuLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbi8vICAgICBfLmV4dGVuZChvYmplY3QsIEV2ZW50cy5wcm90b3R5cGUpO1xuLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbi8vXG5mdW5jdGlvbiBFdmVudHMoKSB7fVxuXG5FdmVudHMucHJvdG90eXBlID0ge1xuXG4gIC8vIEJpbmQgYW4gZXZlbnQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLiBQYXNzaW5nIGBcImFsbFwiYCB3aWxsIGJpbmRcbiAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgIGV2ZW50cy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY29udGV4dCB8fCB0aGlzfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gQmluZCBhbiBldmVudCB0byBvbmx5IGJlIHRyaWdnZXJlZCBhIHNpbmdsZSB0aW1lLiBBZnRlciB0aGUgZmlyc3QgdGltZVxuICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbmNlJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXRhaW4ubGVuZ3RoKSBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAvLyBwYXNzZWQgdGhlIHNhbWUgYXJndW1lbnRzIGFzIGB0cmlnZ2VyYCBpcywgYXBhcnQgZnJvbSB0aGUgZXZlbnQgbmFtZVxuICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xuICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gIC8vIHRvIGV2ZXJ5IG9iamVjdCBpdCdzIGN1cnJlbnRseSBsaXN0ZW5pbmcgdG8uXG4gIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbztcbiAgICBpZiAoIWxpc3RlbmluZ1RvKSByZXR1cm4gdGhpcztcbiAgICB2YXIgcmVtb3ZlID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgaWYgKG9iaikgKGxpc3RlbmluZ1RvID0ge30pW29iai5fbGlzdGVuSWRdID0gb2JqO1xuICAgIGZvciAodmFyIGlkIGluIGxpc3RlbmluZ1RvKSB7XG4gICAgICBvYmogPSBsaXN0ZW5pbmdUb1tpZF07XG4gICAgICBvYmoub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIGlmIChyZW1vdmUgfHwgXy5pc0VtcHR5KG9iai5fZXZlbnRzKSkgZGVsZXRlIHRoaXMuX2xpc3RlbmluZ1RvW2lkXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn07XG5cbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxuLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbi8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbi8vIGluIHRlcm1zIG9mIHRoZSBleGlzdGluZyBBUEkuXG52YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cbiAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtrZXksIG5hbWVba2V5XV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4vLyB0cmlnZ2VyaW5nIGV2ZW50cy4gVHJpZXMgdG8ga2VlcCB0aGUgdXN1YWwgY2FzZXMgc3BlZWR5IChtb3N0IGludGVybmFsXG4vLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG52YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICB2YXIgZXYsIGkgPSAtMSwgbCA9IGV2ZW50cy5sZW5ndGgsIGExID0gYXJnc1swXSwgYTIgPSBhcmdzWzFdLCBhMyA9IGFyZ3NbMl07XG4gIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgIGNhc2UgMTogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExKTsgcmV0dXJuO1xuICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgIGRlZmF1bHQ6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmFwcGx5KGV2LmN0eCwgYXJncyk7XG4gIH1cbn07XG5cbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4vLyBsaXN0ZW5pbmcgdG8uXG5fLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSB7fSk7XG4gICAgdmFyIGlkID0gb2JqLl9saXN0ZW5JZCB8fCAob2JqLl9saXN0ZW5JZCA9IF8udW5pcXVlSWQoJ2wnKSk7XG4gICAgbGlzdGVuaW5nVG9baWRdID0gb2JqO1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG4iLCIvKipcbiAqINCl0YDQsNC90LjQu9C40YnQtSDQtNC+0LrRg9C80LXQvdGC0L7QsiDQv9C+INGB0YXQtdC80LDQvFxuICog0LLQtNC+0YXQvdC+0LLQu9GR0L0gbW9uZ29vc2UgMy44LjQgKNC40YHQv9GA0LDQstC70LXQvdGLINCx0LDQs9C4INC/0L4gMy44LjE1KVxuICpcbiAqINCg0LXQsNC70LjQt9Cw0YbQuNC4INGF0YDQsNC90LjQu9C40YnQsFxuICogaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jc2VsZWN0b3JzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cbiAqXG4gKiBicm93c2VyaWZ5IGxpYi8gLS1zdGFuZGFsb25lIHN0b3JhZ2UgPiBzdG9yYWdlLmpzIC1kXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4g0Lgg0L/QvtC70YPRh9C40YLRjCDQtdGRLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RvcmFnZS5TY2hlbWF8dW5kZWZpbmVkfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoICdTY2hlbWEnICE9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIHNjaGVtYS5jb25zdHJ1Y3RvciApICl7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcblxuICByZXR1cm4gdGhpc1sgbmFtZSBdID0gbmV3IENvbGxlY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICk7XG59O1xuXG4vKipcbiAqINCf0L7Qu9GD0YfQuNGC0Ywg0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40Lkg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAg0YHRgtGA0L7Qui5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59IEFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIGNvbGxlY3Rpb25zIGluIHRoZSBzdG9yYWdlLlxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5nZXRDb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uTmFtZXM7XG59O1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBDb2xsZWN0aW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkNvbGxlY3Rpb24gPSBDb2xsZWN0aW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIHZlcnNpb25cbiAqXG4gKiBAcHJvcGVydHkgdmVyc2lvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuLy90b2RvOlxuLy9TdG9yYWdlLnByb3RvdHlwZS52ZXJzaW9uID0gcGtnLnZlcnNpb247XG5cbi8qKlxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYV0oI3NjaGVtYV9TY2hlbWEpIGNvbnN0cnVjdG9yXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIFNjaGVtYSA9IG1vbmdvb3NlLlNjaGVtYTtcbiAqICAgICB2YXIgQ2F0U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogQG1ldGhvZCBTY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hID0gU2NoZW1hO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZSA9IFNjaGVtYVR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgU2NoZW1hVHlwZXMuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX0FsaWFzIG9mIG1vbmdvb3NlLlNjaGVtYS5UeXBlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuX1xuICpcbiAqIEBwcm9wZXJ0eSBTY2hlbWFUeXBlc1xuICogQHNlZSBTY2hlbWEuU2NoZW1hVHlwZXMgI3NjaGVtYV9TY2hlbWEuVHlwZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZXMgPSBTY2hlbWEuVHlwZXM7XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIFtWaXJ0dWFsVHlwZV0oI3ZpcnR1YWx0eXBlX1ZpcnR1YWxUeXBlKSBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgVmlydHVhbFR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuVmlydHVhbFR5cGUgPSBWaXJ0dWFsVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBNb25nb29zZSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgYXJyYXkgPSBtb25nb29zZS5UeXBlcy5BcnJheTtcbiAqXG4gKiAjIyMjVHlwZXM6XG4gKlxuICogLSBbT2JqZWN0SWRdKCN0eXBlcy1vYmplY3RpZC1qcylcbiAqIC0gW1N1YkRvY3VtZW50XSgjdHlwZXMtZW1iZWRkZWQtanMpXG4gKiAtIFtBcnJheV0oI3R5cGVzLWFycmF5LWpzKVxuICogLSBbRG9jdW1lbnRBcnJheV0oI3R5cGVzLWRvY3VtZW50YXJyYXktanMpXG4gKlxuICogVXNpbmcgdGhpcyBleHBvc2VkIGFjY2VzcyB0byB0aGUgYE9iamVjdElkYCB0eXBlLCB3ZSBjYW4gY29uc3RydWN0IGlkcyBvbiBkZW1hbmQuXG4gKlxuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkO1xuICogICAgIHZhciBpZDEgPSBuZXcgT2JqZWN0SWQ7XG4gKlxuICogQHByb3BlcnR5IFR5cGVzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlR5cGVzID0gVHlwZXM7XG5cbi8qKlxuICogVGhlIE1vbmdvb3NlIFtEb2N1bWVudF0oI2RvY3VtZW50LWpzKSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAbWV0aG9kIERvY3VtZW50XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkRvY3VtZW50ID0gRG9jdW1lbnQ7XG5cbi8qKlxuICogVGhlIFtNb25nb29zZUVycm9yXSgjZXJyb3JfTW9uZ29vc2VFcnJvcikgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcblxuXG5cblN0b3JhZ2UucHJvdG90eXBlLlN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5TdG9yYWdlLnByb3RvdHlwZS51dGlscyA9IHV0aWxzO1xuU3RvcmFnZS5wcm90b3R5cGUuT2JqZWN0SWQgPSBUeXBlcy5PYmplY3RJZDtcblN0b3JhZ2UucHJvdG90eXBlLnNjaGVtYXMgPSBTY2hlbWEuc2NoZW1hcztcblxuU3RvcmFnZS5wcm90b3R5cGUuc2V0QWRhcHRlciA9IGZ1bmN0aW9uKCBhZGFwdGVySG9va3MgKXtcbiAgRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IGFkYXB0ZXJIb29rcztcbn07XG5cbi8qXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSB1dWlkLlxuICogaHR0cDovL3d3dy5icm9vZmEuY29tL1Rvb2xzL01hdGgudXVpZC5odG1cbiAqIGZvcmsgTWF0aC51dWlkLmpzICh2MS40KVxuICpcbiAqIGh0dHA6Ly93d3cuYnJvb2ZhLmNvbS8yMDA4LzA5L2phdmFzY3JpcHQtdXVpZC1mdW5jdGlvbi9cbiAqL1xuLyp1dWlkOiB7XG4gIC8vIFByaXZhdGUgYXJyYXkgb2YgY2hhcnMgdG8gdXNlXG4gIENIQVJTOiAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKSxcblxuICAvLyByZXR1cm5zIFJGQzQxMjIsIHZlcnNpb24gNCBJRFxuICBnZW5lcmF0ZTogZnVuY3Rpb24oKXtcbiAgICB2YXIgY2hhcnMgPSB0aGlzLkNIQVJTLCB1dWlkID0gbmV3IEFycmF5KCAzNiApLCBybmQgPSAwLCByO1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IDM2OyBpKysgKSB7XG4gICAgICBpZiAoIGkgPT0gOCB8fCBpID09IDEzIHx8IGkgPT0gMTggfHwgaSA9PSAyMyApIHtcbiAgICAgICAgdXVpZFtpXSA9ICctJztcbiAgICAgIH0gZWxzZSBpZiAoIGkgPT0gMTQgKSB7XG4gICAgICAgIHV1aWRbaV0gPSAnNCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIHJuZCA8PSAweDAyICkgcm5kID0gMHgyMDAwMDAwICsgKE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDApIHwgMDtcbiAgICAgICAgciA9IHJuZCAmIDB4ZjtcbiAgICAgICAgcm5kID0gcm5kID4+IDQ7XG4gICAgICAgIHV1aWRbaV0gPSBjaGFyc1soaSA9PSAxOSkgPyAociAmIDB4MykgfCAweDggOiByXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHV1aWQuam9pbignJykudG9Mb3dlckNhc2UoKTtcbiAgfVxufSovXG5cblxuLyohXG4gKiBUaGUgZXhwb3J0cyBvYmplY3QgaXMgYW4gaW5zdGFuY2Ugb2YgU3RvcmFnZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFN0b3JhZ2U7XG4iLCIvLyDQnNCw0YjQuNC90LAg0YHQvtGB0YLQvtGP0L3QuNC5INC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQtNC70Y8g0L/QvtC80LXRgtC60LgsINCyINC60LDQutC+0Lwg0YHQvtGB0YLQvtGP0L3QuNC4INC90LDRhdC+0LTRj9GC0YHRjyDQv9C+0LvQtVxuLy8g0J3QsNC/0YDQuNC80LXRgDog0LXRgdC70Lgg0L/QvtC70LUg0LjQvNC10LXRgiDRgdC+0YHRgtC+0Y/QvdC40LUgZGVmYXVsdCAtINC30L3QsNGH0LjRgiDQtdCz0L4g0LfQvdCw0YfQtdC90LjQtdC8INGP0LLQu9GP0LXRgtGB0Y8g0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjlxuLy8g0J/RgNC40LzQtdGH0LDQvdC40LU6INC00LvRjyDQvNCw0YHRgdC40LLQvtCyINCyINC+0LHRidC10Lwg0YHQu9GD0YfQsNC1INGN0YLQviDQvtC30L3QsNGH0LDQtdGCINC/0YPRgdGC0L7QuSDQvNCw0YHRgdC40LJcblxuLyohXG4gKiBEZXBlbmRlbmNpZXNcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcblxudmFyIEFjdGl2ZVJvc3RlciA9IFN0YXRlTWFjaGluZS5jdG9yKCdyZXF1aXJlJywgJ21vZGlmeScsICdpbml0JywgJ2RlZmF1bHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcm5hbENhY2hlO1xuXG5mdW5jdGlvbiBJbnRlcm5hbENhY2hlICgpIHtcbiAgdGhpcy5zdHJpY3RNb2RlID0gdW5kZWZpbmVkO1xuICB0aGlzLnNlbGVjdGVkID0gdW5kZWZpbmVkO1xuICB0aGlzLnNhdmVFcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy52YWxpZGF0aW9uRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWRob2NQYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5yZW1vdmluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5pbnNlcnRpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmVyc2lvbiA9IHVuZGVmaW5lZDtcbiAgdGhpcy5nZXR0ZXJzID0ge307XG4gIHRoaXMuX2lkID0gdW5kZWZpbmVkO1xuICB0aGlzLnBvcHVsYXRlID0gdW5kZWZpbmVkOyAvLyB3aGF0IHdlIHdhbnQgdG8gcG9wdWxhdGUgaW4gdGhpcyBkb2NcbiAgdGhpcy5wb3B1bGF0ZWQgPSB1bmRlZmluZWQ7Ly8gdGhlIF9pZHMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXG4gIHRoaXMud2FzUG9wdWxhdGVkID0gZmFsc2U7IC8vIGlmIHRoaXMgZG9jIHdhcyB0aGUgcmVzdWx0IG9mIGEgcG9wdWxhdGlvblxuICB0aGlzLnNjb3BlID0gdW5kZWZpbmVkO1xuICB0aGlzLmFjdGl2ZVBhdGhzID0gbmV3IEFjdGl2ZVJvc3RlcjtcblxuICAvLyBlbWJlZGRlZCBkb2NzXG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5mdWxsUGF0aCA9IHVuZGVmaW5lZDtcbn1cbiIsIi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2Ygb2JqZWN0IGBvYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgb2JqID0ge1xuICogICAgICAgICBjb21tZW50czogW1xuICogICAgICAgICAgICAgeyB0aXRsZTogJ2V4Y2l0aW5nIScsIF9kb2M6IHsgdGl0bGU6ICdncmVhdCEnIH19XG4gKiAgICAgICAgICAgLCB7IHRpdGxlOiAnbnVtYmVyIGRvcycgfVxuICogICAgICAgICBdXG4gKiAgICAgfVxuICpcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvKSAgICAgICAgIC8vICdleGNpdGluZyEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbywgJ19kb2MnKSAvLyAnZ3JlYXQhJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMudGl0bGUnLCBvKSAgICAgICAgICAgLy8gWydleGNpdGluZyEnLCAnbnVtYmVyIGRvcyddXG4gKlxuICogICAgIC8vIHN1bW1hcnlcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbylcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgbWFwKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsLCBtYXApXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgZWFjaCBpbmRpdmlkdWFsIGZvdW5kIHZhbHVlLiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cblxuZXhwb3J0cy5nZXQgPSBmdW5jdGlvbiAocGF0aCwgbywgc3BlY2lhbCwgbWFwKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHNwZWNpYWwpIHtcbiAgICBpZiAoc3BlY2lhbC5sZW5ndGggPCAyKSB7XG4gICAgICBtYXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9va3VwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgbWFwIHx8IChtYXAgPSBLKTtcblxuICB2YXIgcGFydHMgPSAnc3RyaW5nJyA9PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICB2YXIgb2JqID0gb1xuICAgICwgcGFydDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgLy8gcmVhZGluZyBhIHByb3BlcnR5IGZyb20gdGhlIGFycmF5IGl0ZW1zXG4gICAgICB2YXIgcGF0aHMgPSBwYXJ0cy5zbGljZShpKTtcblxuICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1cbiAgICAgICAgICA/IGV4cG9ydHMuZ2V0KHBhdGhzLCBpdGVtLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwKVxuICAgICAgICAgIDogbWFwKHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybiBtYXAob2JqKTtcbiAgfVxuXG4gIHJldHVybiBtYXAob2JqKTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBgdmFsYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgIG9mIG9iamVjdCBgb2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7QW55dGhpbmd9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCBpcyBwYXNzZWQgZWFjaCBpbmRpdmlkdWFsIHZhbHVlIGJlZm9yZSBzZXR0aW5nIGl0LiBUaGUgdmFsdWUgcmV0dXJuZWQgZnJvbSBgbWFwYCBpcyB1c2VkIGluIHRoZSBvcmlnaW5hbCB2YWx1ZXMgcGxhY2UuXG4gKi9cblxuZXhwb3J0cy5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvLCBzcGVjaWFsLCBtYXAsIF9jb3B5aW5nKSB7XG4gIHZhciBsb29rdXA7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHNwZWNpYWwpIHtcbiAgICBpZiAoc3BlY2lhbC5sZW5ndGggPCAyKSB7XG4gICAgICBtYXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9va3VwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgbWFwIHx8IChtYXAgPSBLKTtcblxuICB2YXIgcGFydHMgPSAnc3RyaW5nJyA9PSB0eXBlb2YgcGF0aFxuICAgID8gcGF0aC5zcGxpdCgnLicpXG4gICAgOiBwYXRoO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XG4gIH1cblxuICBpZiAobnVsbCA9PSBvKSByZXR1cm47XG5cbiAgLy8gdGhlIGV4aXN0YW5jZSBvZiAkIGluIGEgcGF0aCB0ZWxscyB1cyBpZiB0aGUgdXNlciBkZXNpcmVzXG4gIC8vIHRoZSBjb3B5aW5nIG9mIGFuIGFycmF5IGluc3RlYWQgb2Ygc2V0dGluZyBlYWNoIHZhbHVlIG9mXG4gIC8vIHRoZSBhcnJheSB0byB0aGUgb25lIGJ5IG9uZSB0byBtYXRjaGluZyBwb3NpdGlvbnMgb2YgdGhlXG4gIC8vIGN1cnJlbnQgYXJyYXkuXG4gIHZhciBjb3B5ID0gX2NvcHlpbmcgfHwgL1xcJC8udGVzdChwYXRoKVxuICAgICwgb2JqID0gb1xuICAgICwgcGFydFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXJ0cy5sZW5ndGggLSAxOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoJyQnID09IHBhcnQpIHtcbiAgICAgIGlmIChpID09IGxlbiAtIDEpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgICB2YXIgcGF0aHMgPSBwYXJ0cy5zbGljZShpKTtcbiAgICAgIGlmICghY29weSAmJiBBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBhc3NpZ25tZW50IG9mIHNpbmdsZSB2YWx1ZXMgb2YgYXJyYXlcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsW2pdLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgb2YgZW50aXJlIHZhbHVlXG4gICAgICAgICAgZXhwb3J0cy5zZXQocGF0aHMsIHZhbCwgb2JqW2pdLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwLCBjb3B5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChsb29rdXApIHtcbiAgICAgIG9iaiA9IGxvb2t1cChvYmosIHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmogPSBzcGVjaWFsICYmIG9ialtzcGVjaWFsXVxuICAgICAgICA/IG9ialtzcGVjaWFsXVtwYXJ0XVxuICAgICAgICA6IG9ialtwYXJ0XTtcbiAgICB9XG5cbiAgICBpZiAoIW9iaikgcmV0dXJuO1xuICB9XG5cbiAgLy8gcHJvY2VzcyB0aGUgbGFzdCBwcm9wZXJ0eSBvZiB0aGUgcGF0aFxuXG4gIHBhcnQgPSBwYXJ0c1tsZW5dO1xuXG4gIC8vIHVzZSB0aGUgc3BlY2lhbCBwcm9wZXJ0eSBpZiBleGlzdHNcbiAgaWYgKHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdKSB7XG4gICAgb2JqID0gb2JqW3NwZWNpYWxdO1xuICB9XG5cbiAgLy8gc2V0IHRoZSB2YWx1ZSBvbiB0aGUgbGFzdCBicmFuY2hcbiAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgIGlmICghY29weSAmJiBBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGZvciAodmFyIGl0ZW0sIGogPSAwOyBqIDwgb2JqLmxlbmd0aCAmJiBqIDwgdmFsLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGl0ZW0gPSBvYmpbal07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xuICAgICAgICAgICAgbG9va3VwKGl0ZW0sIHBhcnQsIG1hcCh2YWxbal0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xuICAgICAgICAgICAgaXRlbVtwYXJ0XSA9IG1hcCh2YWxbal0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGg7ICsraikge1xuICAgICAgICBpdGVtID0gb2JqW2pdO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGlmIChsb29rdXApIHtcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpdGVtW3NwZWNpYWxdKSBpdGVtID0gaXRlbVtzcGVjaWFsXTtcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgbG9va3VwKG9iaiwgcGFydCwgbWFwKHZhbCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmpbcGFydF0gPSBtYXAodmFsKTtcbiAgICB9XG4gIH1cbn1cblxuLyohXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuXG4gKi9cblxuZnVuY3Rpb24gSyAodikge1xuICByZXR1cm4gdjtcbn0iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgVHlwZXNcbiAgLCBzY2hlbWFzO1xuXG4vKipcbiAqIFNjaGVtYSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGNoaWxkID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9KTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZywgYWdlOiBOdW1iZXIsIGNoaWxkcmVuOiBbY2hpbGRdIH0pO1xuICogICAgIHZhciBUcmVlID0gbW9uZ29vc2UubW9kZWwoJ1RyZWUnLCBzY2hlbWEpO1xuICpcbiAqICAgICAvLyBzZXR0aW5nIHNjaGVtYSBvcHRpb25zXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IF9pZDogZmFsc2UsIGF1dG9JbmRleDogZmFsc2UgfSlcbiAqXG4gKiAjIyMjT3B0aW9uczpcbiAqXG4gKiAtIFtjb2xsZWN0aW9uXSgvZG9jcy9ndWlkZS5odG1sI2NvbGxlY3Rpb24pOiBzdHJpbmcgLSBubyBkZWZhdWx0XG4gKiAtIFtpZF0oL2RvY3MvZ3VpZGUuaHRtbCNpZCk6IGJvb2wgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIGBtaW5pbWl6ZWA6IGJvb2wgLSBjb250cm9scyBbZG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkgYmVoYXZpb3Igd2hlbiBjYWxsZWQgbWFudWFsbHkgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIFtzdHJpY3RdKC9kb2NzL2d1aWRlLmh0bWwjc3RyaWN0KTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3RvSlNPTl0oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdG9PYmplY3RdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxuICogLSBbdmVyc2lvbktleV0oL2RvY3MvZ3VpZGUuaHRtbCN2ZXJzaW9uS2V5KTogYm9vbCAtIGRlZmF1bHRzIHRvIFwiX192XCJcbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfV2hlbiBuZXN0aW5nIHNjaGVtYXMsIChgY2hpbGRyZW5gIGluIHRoZSBleGFtcGxlIGFib3ZlKSwgYWx3YXlzIGRlY2xhcmUgdGhlIGNoaWxkIHNjaGVtYSBmaXJzdCBiZWZvcmUgcGFzc2luZyBpdCBpbnRvIGlzIHBhcmVudC5fXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8dW5kZWZpbmVkfSBbbmFtZV0g0J3QsNC30LLQsNC90LjQtSDRgdGF0LXQvNGLXG4gKiBAcGFyYW0ge1NjaGVtYX0gW2Jhc2VTY2hlbWFdINCR0LDQt9C+0LLQsNGPINGB0YXQtdC80LAg0L/RgNC4INC90LDRgdC70LXQtNC+0LLQsNC90LjQuFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiDQodGF0LXQvNCwXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTY2hlbWEgKCBuYW1lLCBiYXNlU2NoZW1hLCBvYmosIG9wdGlvbnMgKSB7XG4gIGlmICggISh0aGlzIGluc3RhbmNlb2YgU2NoZW1hKSApXG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApO1xuXG4gIC8vINCV0YHQu9C4INGN0YLQviDQuNC80LXQvdC+0LLQsNC90LDRjyDRgdGF0LXQvNCwXG4gIGlmICggdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnICl7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICBzY2hlbWFzWyBuYW1lIF0gPSB0aGlzO1xuICB9IGVsc2Uge1xuICAgIG9wdGlvbnMgPSBvYmo7XG4gICAgb2JqID0gYmFzZVNjaGVtYTtcbiAgICBiYXNlU2NoZW1hID0gbmFtZTtcbiAgICBuYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKCAhKGJhc2VTY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEpICl7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0YXRgNCw0L3QuNC8INC+0L/QuNGB0LDQvdC40LUg0YHRhdC10LzRiyDQtNC70Y8g0L/QvtC00LTQtdGA0LbQutC4INC00LjRgdC60YDQuNC80LjQvdCw0YLQvtGA0L7QslxuICB0aGlzLnNvdXJjZSA9IG9iajtcblxuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3VicGF0aHMgPSB7fTtcbiAgdGhpcy52aXJ0dWFscyA9IHt9O1xuICB0aGlzLm5lc3RlZCA9IHt9O1xuICB0aGlzLmluaGVyaXRzID0ge307XG4gIHRoaXMuY2FsbFF1ZXVlID0gW107XG4gIHRoaXMubWV0aG9kcyA9IHt9O1xuICB0aGlzLnN0YXRpY3MgPSB7fTtcbiAgdGhpcy50cmVlID0ge307XG4gIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB1bmRlZmluZWQ7XG5cbiAgdGhpcy5vcHRpb25zID0gdGhpcy5kZWZhdWx0T3B0aW9ucyggb3B0aW9ucyApO1xuXG4gIGlmICggYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIGJhc2VTY2hlbWEuZGlzY3JpbWluYXRvciggbmFtZSwgdGhpcyApO1xuXG4gICAgLy90aGlzLmRpc2NyaW1pbmF0b3IoIG5hbWUsIGJhc2VTY2hlbWEgKTtcbiAgfVxuXG4gIC8vIGJ1aWxkIHBhdGhzXG4gIGlmICggb2JqICkge1xuICAgIHRoaXMuYWRkKCBvYmogKTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIGdldCBhbiBhdXRvIF9pZCB1bmxlc3MgZGlzYWJsZWRcbiAgdmFyIGF1dG9faWQgPSAhdGhpcy5wYXRoc1snX2lkJ10gJiYgKCF0aGlzLm9wdGlvbnMubm9JZCAmJiB0aGlzLm9wdGlvbnMuX2lkKTtcbiAgaWYgKGF1dG9faWQpIHtcbiAgICB0aGlzLmFkZCh7IF9pZDoge3R5cGU6IFNjaGVtYS5PYmplY3RJZCwgYXV0bzogdHJ1ZX0gfSk7XG4gIH1cblxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyByZWNlaXZlIGFuIGlkIGdldHRlciB1bmxlc3MgZGlzYWJsZWRcbiAgdmFyIGF1dG9pZCA9ICF0aGlzLnBhdGhzWydpZCddICYmIHRoaXMub3B0aW9ucy5pZDtcbiAgaWYgKCBhdXRvaWQgKSB7XG4gICAgdGhpcy52aXJ0dWFsKCdpZCcpLmdldCggaWRHZXR0ZXIgKTtcbiAgfVxufVxuXG4vKiFcbiAqIFJldHVybnMgdGhpcyBkb2N1bWVudHMgX2lkIGNhc3QgdG8gYSBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGlkR2V0dGVyICgpIHtcbiAgaWYgKHRoaXMuJF9fLl9pZCkge1xuICAgIHJldHVybiB0aGlzLiRfXy5faWQ7XG4gIH1cblxuICByZXR1cm4gdGhpcy4kX18uX2lkID0gbnVsbCA9PSB0aGlzLl9pZFxuICAgID8gbnVsbFxuICAgIDogU3RyaW5nKHRoaXMuX2lkKTtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gRXZlbnRFbWl0dGVyLlxuICovXG5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRXZlbnRzLnByb3RvdHlwZSApO1xuU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYTtcblxuLyoqXG4gKiBTY2hlbWEgYXMgZmxhdCBwYXRoc1xuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHtcbiAqICAgICAgICAgJ19pZCcgICAgICAgIDogU2NoZW1hVHlwZSxcbiAqICAgICAgICwgJ25lc3RlZC5rZXknIDogU2NoZW1hVHlwZSxcbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgcGF0aHNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRocztcblxuLyoqXG4gKiBTY2hlbWEgYXMgYSB0cmVlXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgOiBPYmplY3RJZFxuICogICAgICAgLCAnbmVzdGVkJyAgOiB7XG4gKiAgICAgICAgICAgICAna2V5JyA6IFN0cmluZ1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHByb3BlcnR5IHRyZWVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS50cmVlO1xuXG4vKipcbiAqIFJldHVybnMgZGVmYXVsdCBvcHRpb25zIGZvciB0aGlzIHNjaGVtYSwgbWVyZ2VkIHdpdGggYG9wdGlvbnNgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5kZWZhdWx0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSAkLmV4dGVuZCh7XG4gICAgICBzdHJpY3Q6IHRydWVcbiAgICAsIHZlcnNpb25LZXk6ICdfX3YnXG4gICAgLCBkaXNjcmltaW5hdG9yS2V5OiAnX190J1xuICAgICwgbWluaW1pemU6IHRydWVcbiAgICAvLyB0aGUgZm9sbG93aW5nIGFyZSBvbmx5IGFwcGxpZWQgYXQgY29uc3RydWN0aW9uIHRpbWVcbiAgICAsIF9pZDogdHJ1ZVxuICAgICwgaWQ6IHRydWVcbiAgfSwgb3B0aW9ucyApO1xuXG4gIHJldHVybiBvcHRpb25zO1xufTtcblxuLyoqXG4gKiBBZGRzIGtleSBwYXRoIC8gc2NoZW1hIHR5cGUgcGFpcnMgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBUb3lTY2hlbWEgPSBuZXcgU2NoZW1hO1xuICogICAgIFRveVNjaGVtYS5hZGQoeyBuYW1lOiAnc3RyaW5nJywgY29sb3I6ICdzdHJpbmcnLCBwcmljZTogJ251bWJlcicgfSk7XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IHByZWZpeFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQgKCBvYmosIHByZWZpeCApIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcblxuICAgIGlmIChudWxsID09IG9ialsga2V5IF0pIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdmFsdWUgZm9yIHNjaGVtYSBwYXRoIGAnKyBwcmVmaXggKyBrZXkgKydgJyk7XG4gICAgfVxuXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3Qob2JqW2tleV0gKVxuICAgICAgJiYgKCAhb2JqWyBrZXkgXS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqW2tleV0uY29uc3RydWN0b3IpIClcbiAgICAgICYmICggIW9ialsga2V5IF0udHlwZSB8fCBvYmpbIGtleSBdLnR5cGUudHlwZSApICl7XG5cbiAgICAgIGlmICggT2JqZWN0LmtleXMob2JqWyBrZXkgXSkubGVuZ3RoICkge1xuICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0IHsgbGFzdDogeyBuYW1lOiBTdHJpbmcgfX1cbiAgICAgICAgdGhpcy5uZXN0ZWRbIHByZWZpeCArIGtleSBdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hZGQoIG9ialsga2V5IF0sIHByZWZpeCArIGtleSArICcuJyk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7IC8vIG1peGVkIHR5cGVcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBSZXNlcnZlZCBkb2N1bWVudCBrZXlzLlxuICpcbiAqIEtleXMgaW4gdGhpcyBvYmplY3QgYXJlIG5hbWVzIHRoYXQgYXJlIHJlamVjdGVkIGluIHNjaGVtYSBkZWNsYXJhdGlvbnMgYi9jIHRoZXkgY29uZmxpY3Qgd2l0aCBtb25nb29zZSBmdW5jdGlvbmFsaXR5LiBVc2luZyB0aGVzZSBrZXkgbmFtZSB3aWxsIHRocm93IGFuIGVycm9yLlxuICpcbiAqICAgICAgb24sIGVtaXQsIF9ldmVudHMsIGRiLCBnZXQsIHNldCwgaW5pdCwgaXNOZXcsIGVycm9ycywgc2NoZW1hLCBvcHRpb25zLCBtb2RlbE5hbWUsIGNvbGxlY3Rpb24sIF9wcmVzLCBfcG9zdHMsIHRvT2JqZWN0XG4gKlxuICogX05PVEU6XyBVc2Ugb2YgdGhlc2UgdGVybXMgYXMgbWV0aG9kIG5hbWVzIGlzIHBlcm1pdHRlZCwgYnV0IHBsYXkgYXQgeW91ciBvd24gcmlzaywgYXMgdGhleSBtYXkgYmUgZXhpc3RpbmcgbW9uZ29vc2UgZG9jdW1lbnQgbWV0aG9kcyB5b3UgYXJlIHN0b21waW5nIG9uLlxuICpcbiAqICAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgICBzY2hlbWEubWV0aG9kcy5pbml0ID0gZnVuY3Rpb24gKCkge30gLy8gcG90ZW50aWFsbHkgYnJlYWtpbmdcbiAqL1xuU2NoZW1hLnJlc2VydmVkID0gT2JqZWN0LmNyZWF0ZSggbnVsbCApO1xudmFyIHJlc2VydmVkID0gU2NoZW1hLnJlc2VydmVkO1xucmVzZXJ2ZWQub24gPVxucmVzZXJ2ZWQuZGIgPVxucmVzZXJ2ZWQuZ2V0ID1cbnJlc2VydmVkLnNldCA9XG5yZXNlcnZlZC5pbml0ID1cbnJlc2VydmVkLmlzTmV3ID1cbnJlc2VydmVkLmVycm9ycyA9XG5yZXNlcnZlZC5zY2hlbWEgPVxucmVzZXJ2ZWQub3B0aW9ucyA9XG5yZXNlcnZlZC5tb2RlbE5hbWUgPVxucmVzZXJ2ZWQuY29sbGVjdGlvbiA9XG5yZXNlcnZlZC50b09iamVjdCA9XG5yZXNlcnZlZC5kb21haW4gPVxucmVzZXJ2ZWQuZW1pdCA9ICAgIC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX2V2ZW50cyA9IC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX3ByZXMgPSByZXNlcnZlZC5fcG9zdHMgPSAxOyAvLyBob29rcy5qc1xuXG4vKipcbiAqIEdldHMvc2V0cyBzY2hlbWEgcGF0aHMuXG4gKlxuICogU2V0cyBhIHBhdGggKGlmIGFyaXR5IDIpXG4gKiBHZXRzIGEgcGF0aCAoaWYgYXJpdHkgMSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpIC8vIHJldHVybnMgYSBTY2hlbWFUeXBlXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnLCBOdW1iZXIpIC8vIGNoYW5nZXMgdGhlIHNjaGVtYVR5cGUgb2YgYG5hbWVgIHRvIE51bWJlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgaWYgKG9iaiA9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodGhpcy5wYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMucGF0aHNbcGF0aF07XG4gICAgaWYgKHRoaXMuc3VicGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnN1YnBhdGhzW3BhdGhdO1xuXG4gICAgLy8gc3VicGF0aHM/XG4gICAgcmV0dXJuIC9cXC5cXGQrXFwuPy4qJC8udGVzdChwYXRoKVxuICAgICAgPyBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBzb21lIHBhdGggbmFtZXMgY29uZmxpY3Qgd2l0aCBkb2N1bWVudCBtZXRob2RzXG4gIGlmIChyZXNlcnZlZFtwYXRoXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImBcIiArIHBhdGggKyBcImAgbWF5IG5vdCBiZSB1c2VkIGFzIGEgc2NoZW1hIHBhdGhuYW1lXCIpO1xuICB9XG5cbiAgLy8gdXBkYXRlIHRoZSB0cmVlXG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLi8pXG4gICAgLCBsYXN0ID0gc3VicGF0aHMucG9wKClcbiAgICAsIGJyYW5jaCA9IHRoaXMudHJlZTtcblxuICBzdWJwYXRocy5mb3JFYWNoKGZ1bmN0aW9uKHN1YiwgaSkge1xuICAgIGlmICghYnJhbmNoW3N1Yl0pIGJyYW5jaFtzdWJdID0ge307XG4gICAgaWYgKCdvYmplY3QnICE9IHR5cGVvZiBicmFuY2hbc3ViXSkge1xuICAgICAgdmFyIG1zZyA9ICdDYW5ub3Qgc2V0IG5lc3RlZCBwYXRoIGAnICsgcGF0aCArICdgLiAnXG4gICAgICAgICAgICAgICsgJ1BhcmVudCBwYXRoIGAnXG4gICAgICAgICAgICAgICsgc3VicGF0aHMuc2xpY2UoMCwgaSkuY29uY2F0KFtzdWJdKS5qb2luKCcuJylcbiAgICAgICAgICAgICAgKyAnYCBhbHJlYWR5IHNldCB0byB0eXBlICcgKyBicmFuY2hbc3ViXS5uYW1lXG4gICAgICAgICAgICAgICsgJy4nO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaFtzdWJdO1xuICB9KTtcblxuICBicmFuY2hbbGFzdF0gPSB1dGlscy5jbG9uZShvYmopO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIG9iaik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0eXBlIGFyZ3VtZW50cyBpbnRvIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5pbnRlcnByZXRBc1R5cGUgPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIHZhciBjb25zdHJ1Y3Rvck5hbWUgPSB1dGlscy5nZXRGdW5jdGlvbk5hbWUob2JqLmNvbnN0cnVjdG9yKTtcbiAgaWYgKGNvbnN0cnVjdG9yTmFtZSAhPSAnT2JqZWN0Jyl7XG4gICAgb2JqID0geyB0eXBlOiBvYmogfTtcbiAgfVxuXG4gIC8vIEdldCB0aGUgdHlwZSBtYWtpbmcgc3VyZSB0byBhbGxvdyBrZXlzIG5hbWVkIFwidHlwZVwiXG4gIC8vIGFuZCBkZWZhdWx0IHRvIG1peGVkIGlmIG5vdCBzcGVjaWZpZWQuXG4gIC8vIHsgdHlwZTogeyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6ICdmcmVzaGN1dCcgfSB9XG4gIHZhciB0eXBlID0gb2JqLnR5cGUgJiYgIW9iai50eXBlLnR5cGVcbiAgICA/IG9iai50eXBlXG4gICAgOiB7fTtcblxuICBpZiAoJ09iamVjdCcgPT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKHR5cGUuY29uc3RydWN0b3IpIHx8ICdtaXhlZCcgPT0gdHlwZSkge1xuICAgIHJldHVybiBuZXcgVHlwZXMuTWl4ZWQocGF0aCwgb2JqKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHR5cGUpIHx8IEFycmF5ID09IHR5cGUgfHwgJ2FycmF5JyA9PSB0eXBlKSB7XG4gICAgLy8gaWYgaXQgd2FzIHNwZWNpZmllZCB0aHJvdWdoIHsgdHlwZSB9IGxvb2sgZm9yIGBjYXN0YFxuICAgIHZhciBjYXN0ID0gKEFycmF5ID09IHR5cGUgfHwgJ2FycmF5JyA9PSB0eXBlKVxuICAgICAgPyBvYmouY2FzdFxuICAgICAgOiB0eXBlWzBdO1xuXG4gICAgaWYgKGNhc3QgaW5zdGFuY2VvZiBTY2hlbWEpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBjYXN0LCBvYmopO1xuICAgIH1cblxuICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgY2FzdCkge1xuICAgICAgY2FzdCA9IFR5cGVzW2Nhc3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYXN0LnN1YnN0cmluZygxKV07XG4gICAgfSBlbHNlIGlmIChjYXN0ICYmICghY2FzdC50eXBlIHx8IGNhc3QudHlwZS50eXBlKVxuICAgICAgICAgICAgICAgICAgICAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoY2FzdC5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMoY2FzdCkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgbmV3IFNjaGVtYShjYXN0KSwgb2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFR5cGVzLkFycmF5KHBhdGgsIGNhc3QgfHwgVHlwZXMuTWl4ZWQsIG9iaik7XG4gIH1cblxuICB2YXIgbmFtZSA9ICdzdHJpbmcnID09IHR5cGVvZiB0eXBlXG4gICAgPyB0eXBlXG4gICAgLy8gSWYgbm90IHN0cmluZywgYHR5cGVgIGlzIGEgZnVuY3Rpb24uIE91dHNpZGUgb2YgSUUsIGZ1bmN0aW9uLm5hbWVcbiAgICAvLyBnaXZlcyB5b3UgdGhlIGZ1bmN0aW9uIG5hbWUuIEluIElFLCB5b3UgbmVlZCB0byBjb21wdXRlIGl0XG4gICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUodHlwZSk7XG5cbiAgaWYgKG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xuICB9XG5cbiAgaWYgKHVuZGVmaW5lZCA9PSBUeXBlc1tuYW1lXSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VuZGVmaW5lZCB0eXBlIGF0IGAnICsgcGF0aCArXG4gICAgICAgICdgXFxuICBEaWQgeW91IHRyeSBuZXN0aW5nIFNjaGVtYXM/ICcgK1xuICAgICAgICAnWW91IGNhbiBvbmx5IG5lc3QgdXNpbmcgcmVmcyBvciBhcnJheXMuJyk7XG4gIH1cblxuICByZXR1cm4gbmV3IFR5cGVzW25hbWVdKHBhdGgsIG9iaik7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRoZSBzY2hlbWFzIHBhdGhzIHNpbWlsYXIgdG8gQXJyYXkjZm9yRWFjaC5cbiAqXG4gKiBUaGUgY2FsbGJhY2sgaXMgcGFzc2VkIHRoZSBwYXRobmFtZSBhbmQgc2NoZW1hVHlwZSBhcyBhcmd1bWVudHMgb24gZWFjaCBpdGVyYXRpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm4ge1NjaGVtYX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5lYWNoUGF0aCA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMucGF0aHMpXG4gICAgLCBsZW4gPSBrZXlzLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgZm4oa2V5c1tpXSwgdGhpcy5wYXRoc1trZXlzW2ldXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBBcnJheSBvZiBwYXRoIHN0cmluZ3MgdGhhdCBhcmUgcmVxdWlyZWQgYnkgdGhpcyBzY2hlbWEuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5TY2hlbWEucHJvdG90eXBlLnJlcXVpcmVkUGF0aHMgPSBmdW5jdGlvbiByZXF1aXJlZFBhdGhzICgpIHtcbiAgaWYgKHRoaXMuX3JlcXVpcmVkcGF0aHMpIHJldHVybiB0aGlzLl9yZXF1aXJlZHBhdGhzO1xuXG4gIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMucGF0aHMpXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgLCByZXQgPSBbXTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgdmFyIHBhdGggPSBwYXRoc1tpXTtcbiAgICBpZiAodGhpcy5wYXRoc1twYXRoXS5pc1JlcXVpcmVkKSByZXQucHVzaChwYXRoKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9yZXF1aXJlZHBhdGhzID0gcmV0O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwYXRoVHlwZSBvZiBgcGF0aGAgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEdpdmVuIGEgcGF0aCwgcmV0dXJucyB3aGV0aGVyIGl0IGlzIGEgcmVhbCwgdmlydHVhbCwgbmVzdGVkLCBvciBhZC1ob2MvdW5kZWZpbmVkIHBhdGguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aFR5cGUgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAocGF0aCBpbiB0aGlzLnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLnZpcnR1YWxzKSByZXR1cm4gJ3ZpcnR1YWwnO1xuICBpZiAocGF0aCBpbiB0aGlzLm5lc3RlZCkgcmV0dXJuICduZXN0ZWQnO1xuICBpZiAocGF0aCBpbiB0aGlzLnN1YnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xuXG4gIGlmICgvXFwuXFxkK1xcLnxcXC5cXGQrJC8udGVzdChwYXRoKSAmJiBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKSkge1xuICAgIHJldHVybiAncmVhbCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICdhZGhvY09yVW5kZWZpbmVkJ1xuICB9XG59O1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5mdW5jdGlvbiBnZXRQb3NpdGlvbmFsUGF0aCAoc2VsZiwgcGF0aCkge1xuICB2YXIgc3VicGF0aHMgPSBwYXRoLnNwbGl0KC9cXC4oXFxkKylcXC58XFwuKFxcZCspJC8pLmZpbHRlcihCb29sZWFuKTtcbiAgaWYgKHN1YnBhdGhzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm4gc2VsZi5wYXRoc1tzdWJwYXRoc1swXV07XG4gIH1cblxuICB2YXIgdmFsID0gc2VsZi5wYXRoKHN1YnBhdGhzWzBdKTtcbiAgaWYgKCF2YWwpIHJldHVybiB2YWw7XG5cbiAgdmFyIGxhc3QgPSBzdWJwYXRocy5sZW5ndGggLSAxXG4gICAgLCBzdWJwYXRoXG4gICAgLCBpID0gMTtcblxuICBmb3IgKDsgaSA8IHN1YnBhdGhzLmxlbmd0aDsgKytpKSB7XG4gICAgc3VicGF0aCA9IHN1YnBhdGhzW2ldO1xuXG4gICAgaWYgKGkgPT09IGxhc3QgJiYgdmFsICYmICF2YWwuc2NoZW1hICYmICEvXFxELy50ZXN0KHN1YnBhdGgpKSB7XG4gICAgICBpZiAodmFsIGluc3RhbmNlb2YgVHlwZXMuQXJyYXkpIHtcbiAgICAgICAgLy8gU3RyaW5nU2NoZW1hLCBOdW1iZXJTY2hlbWEsIGV0Y1xuICAgICAgICB2YWwgPSB2YWwuY2FzdGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gaWdub3JlIGlmIGl0cyBqdXN0IGEgcG9zaXRpb24gc2VnbWVudDogcGF0aC4wLnN1YnBhdGhcbiAgICBpZiAoIS9cXEQvLnRlc3Qoc3VicGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgaWYgKCEodmFsICYmIHZhbC5zY2hlbWEpKSB7XG4gICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICB2YWwgPSB2YWwuc2NoZW1hLnBhdGgoc3VicGF0aCk7XG4gIH1cblxuICByZXR1cm4gc2VsZi5zdWJwYXRoc1twYXRoXSA9IHZhbDtcbn1cblxuLyoqXG4gKiBBZGRzIGEgbWV0aG9kIGNhbGwgdG8gdGhlIHF1ZXVlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIGRvY3VtZW50IG1ldGhvZCB0byBjYWxsIGxhdGVyXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnF1ZXVlID0gZnVuY3Rpb24obmFtZSwgYXJncyl7XG4gIHRoaXMuY2FsbFF1ZXVlLnB1c2goW25hbWUsIGFyZ3NdKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBwcmUgaG9vayBmb3IgdGhlIGRvY3VtZW50LlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciB0b3lTY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqXG4gKiAgICAgdG95U2NoZW1hLnByZSgnc2F2ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gKiAgICAgICBpZiAoIXRoaXMuY3JlYXRlZCkgdGhpcy5jcmVhdGVkID0gbmV3IERhdGU7XG4gKiAgICAgICBuZXh0KCk7XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdG95U2NoZW1hLnByZSgndmFsaWRhdGUnLCBmdW5jdGlvbiAobmV4dCkge1xuICogICAgICAgaWYgKHRoaXMubmFtZSAhPSAnV29vZHknKSB0aGlzLm5hbWUgPSAnV29vZHknO1xuICogICAgICAgbmV4dCgpO1xuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wcmUgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5xdWV1ZSgncHJlJywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHBvc3QgZm9yIHRoZSBkb2N1bWVudFxuICpcbiAqIFBvc3QgaG9va3MgZmlyZSBgb25gIHRoZSBldmVudCBlbWl0dGVkIGZyb20gZG9jdW1lbnQgaW5zdGFuY2VzIG9mIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgc2NoZW1hLnBvc3QoJ3NhdmUnLCBmdW5jdGlvbiAoZG9jKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlZCBhZnRlciBhIGRvY3VtZW50IHdhcyBzYXZlZCcpO1xuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgTW9kZWwgPSBtb25nb29zZS5tb2RlbCgnTW9kZWwnLCBzY2hlbWEpO1xuICpcbiAqICAgICB2YXIgbSA9IG5ldyBNb2RlbCguLik7XG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVzIGFmdGVyIHRoZSBgcG9zdGAgaG9vaycpO1xuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgbmFtZSBvZiB0aGUgbWV0aG9kIHRvIGhvb2tcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucG9zdCA9IGZ1bmN0aW9uKG1ldGhvZCwgZm4pe1xuICByZXR1cm4gdGhpcy5xdWV1ZSgnb24nLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBwbHVnaW4gZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHBsdWdpbiBjYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqIEBzZWUgcGx1Z2luc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wbHVnaW4gPSBmdW5jdGlvbiAoZm4sIG9wdHMpIHtcbiAgZm4odGhpcywgb3B0cyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGluc3RhbmNlIG1ldGhvZCB0byBkb2N1bWVudHMgY29uc3RydWN0ZWQgZnJvbSBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgc2NoZW1hID0ga2l0dHlTY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqXG4gKiAgICAgc2NoZW1hLm1ldGhvZCgnbWVvdycsIGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCdtZWVlZWVvb29vb29vb29vb293Jyk7XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIEtpdHR5ID0gbW9uZ29vc2UubW9kZWwoJ0tpdHR5Jywgc2NoZW1hKTtcbiAqXG4gKiAgICAgdmFyIGZpenogPSBuZXcgS2l0dHk7XG4gKiAgICAgZml6ei5tZW93KCk7IC8vIG1lZWVlZW9vb29vb29vb29vb293XG4gKlxuICogSWYgYSBoYXNoIG9mIG5hbWUvZm4gcGFpcnMgaXMgcGFzc2VkIGFzIHRoZSBvbmx5IGFyZ3VtZW50LCBlYWNoIG5hbWUvZm4gcGFpciB3aWxsIGJlIGFkZGVkIGFzIG1ldGhvZHMuXG4gKlxuICogICAgIHNjaGVtYS5tZXRob2Qoe1xuICogICAgICAgICBwdXJyOiBmdW5jdGlvbiAoKSB7fVxuICogICAgICAgLCBzY3JhdGNoOiBmdW5jdGlvbiAoKSB7fVxuICogICAgIH0pO1xuICpcbiAqICAgICAvLyBsYXRlclxuICogICAgIGZpenoucHVycigpO1xuICogICAgIGZpenouc2NyYXRjaCgpO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbWV0aG9kIG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUubWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgbmFtZSlcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpXG4gICAgICB0aGlzLm1ldGhvZHNbaV0gPSBuYW1lW2ldO1xuICBlbHNlXG4gICAgdGhpcy5tZXRob2RzW25hbWVdID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIHN0YXRpYyBcImNsYXNzXCIgbWV0aG9kcyB0byBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgc2NoZW1hLnN0YXRpYygnZmluZEJ5TmFtZScsIGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuICogICAgICAgcmV0dXJuIHRoaXMuZmluZCh7IG5hbWU6IG5hbWUgfSwgY2FsbGJhY2spO1xuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgRHJpbmsgPSBtb25nb29zZS5tb2RlbCgnRHJpbmsnLCBzY2hlbWEpO1xuICogICAgIERyaW5rLmZpbmRCeU5hbWUoJ3NhbnBlbGxlZ3Jpbm8nLCBmdW5jdGlvbiAoZXJyLCBkcmlua3MpIHtcbiAqICAgICAgIC8vXG4gKiAgICAgfSk7XG4gKlxuICogSWYgYSBoYXNoIG9mIG5hbWUvZm4gcGFpcnMgaXMgcGFzc2VkIGFzIHRoZSBvbmx5IGFyZ3VtZW50LCBlYWNoIG5hbWUvZm4gcGFpciB3aWxsIGJlIGFkZGVkIGFzIHN0YXRpY3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnN0YXRpYyA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgbmFtZSlcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpXG4gICAgICB0aGlzLnN0YXRpY3NbaV0gPSBuYW1lW2ldO1xuICBlbHNlXG4gICAgdGhpcy5zdGF0aWNzW25hbWVdID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzL2dldHMgYSBzY2hlbWEgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uIG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGlmIG5vdCBwYXNzZWQsIHRoZSBjdXJyZW50IG9wdGlvbiB2YWx1ZSBpcyByZXR1cm5lZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcbiAgfVxuXG4gIHRoaXMub3B0aW9uc1trZXldID0gdmFsdWU7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgYSBzY2hlbWEgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uIG5hbWVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWwgPSBmdW5jdGlvbiAobmFtZSwgb3B0aW9ucykge1xuICB2YXIgdmlydHVhbHMgPSB0aGlzLnZpcnR1YWxzO1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gIHJldHVybiB2aXJ0dWFsc1tuYW1lXSA9IHBhcnRzLnJlZHVjZShmdW5jdGlvbiAobWVtLCBwYXJ0LCBpKSB7XG4gICAgbWVtW3BhcnRdIHx8IChtZW1bcGFydF0gPSAoaSA9PT0gcGFydHMubGVuZ3RoLTEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBuZXcgVmlydHVhbFR5cGUob3B0aW9ucywgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHt9KTtcbiAgICByZXR1cm4gbWVtW3BhcnRdO1xuICB9LCB0aGlzLnRyZWUpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2aXJ0dWFsIHR5cGUgd2l0aCB0aGUgZ2l2ZW4gYG5hbWVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWxwYXRoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMudmlydHVhbHNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyZWQgZGlzY3JpbWluYXRvcnMgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEBwcm9wZXJ0eSBkaXNjcmltaW5hdG9yc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLmRpc2NyaW1pbmF0b3JzO1xuXG4vKipcbiAqINCd0LDRgdC70LXQtNC+0LLQsNC90LjQtSDQvtGCINGB0YXQtdC80YsuXG4gKiB0aGlzIC0g0LHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCEhIVxuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHZhciBQZXJzb25TY2hlbWEgPSBuZXcgU2NoZW1hKCdQZXJzb24nLCB7XG4gKiAgICAgICBuYW1lOiBTdHJpbmcsXG4gKiAgICAgICBjcmVhdGVkQXQ6IERhdGVcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIEJvc3NTY2hlbWEgPSBuZXcgU2NoZW1hKCdCb3NzJywgUGVyc29uU2NoZW1hLCB7IGRlcGFydG1lbnQ6IFN0cmluZyB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAgIGRpc2NyaW1pbmF0b3IgbW9kZWwgbmFtZVxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSBkaXNjcmltaW5hdG9yIG1vZGVsIHNjaGVtYVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5kaXNjcmltaW5hdG9yID0gZnVuY3Rpb24gZGlzY3JpbWluYXRvciAobmFtZSwgc2NoZW1hKSB7XG4gIGlmICghKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGEgdmFsaWQgZGlzY3JpbWluYXRvciBTY2hlbWFcIik7XG4gIH1cblxuICBpZiAoIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgIXRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290ICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW4gb25seSBiZSBhIGRpc2NyaW1pbmF0b3Igb2YgdGhlIHJvb3QgbW9kZWxcIik7XG4gIH1cblxuICB2YXIga2V5ID0gdGhpcy5vcHRpb25zLmRpc2NyaW1pbmF0b3JLZXk7XG4gIGlmICggc2NoZW1hLnBhdGgoa2V5KSApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIFxcXCJcIiArIG5hbWUgKyBcIlxcXCIgY2Fubm90IGhhdmUgZmllbGQgd2l0aCBuYW1lIFxcXCJcIiArIGtleSArIFwiXFxcIlwiKTtcbiAgfVxuXG4gIC8vIG1lcmdlcyBiYXNlIHNjaGVtYSBpbnRvIG5ldyBkaXNjcmltaW5hdG9yIHNjaGVtYSBhbmQgc2V0cyBuZXcgdHlwZSBmaWVsZC5cbiAgKGZ1bmN0aW9uIG1lcmdlU2NoZW1hcyhzY2hlbWEsIGJhc2VTY2hlbWEpIHtcbiAgICB1dGlscy5tZXJnZShzY2hlbWEsIGJhc2VTY2hlbWEpO1xuXG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9ialtrZXldID0geyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6IG5hbWUgfTtcbiAgICBzY2hlbWEuYWRkKG9iaik7XG4gICAgc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG5hbWUsIGlzUm9vdDogZmFsc2UgfTtcblxuICAgIGlmIChiYXNlU2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgc2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbiA9IGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uO1xuICAgIH1cblxuICAgICAgLy8gdGhyb3dzIGVycm9yIGlmIG9wdGlvbnMgYXJlIGludmFsaWRcbiAgICAoZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25zKGEsIGIpIHtcbiAgICAgIGEgPSB1dGlscy5jbG9uZShhKTtcbiAgICAgIGIgPSB1dGlscy5jbG9uZShiKTtcbiAgICAgIGRlbGV0ZSBhLnRvSlNPTjtcbiAgICAgIGRlbGV0ZSBhLnRvT2JqZWN0O1xuICAgICAgZGVsZXRlIGIudG9KU09OO1xuICAgICAgZGVsZXRlIGIudG9PYmplY3Q7XG5cbiAgICAgIGlmICghdXRpbHMuZGVlcEVxdWFsKGEsIGIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3Igb3B0aW9ucyBhcmUgbm90IGN1c3RvbWl6YWJsZSAoZXhjZXB0IHRvSlNPTiAmIHRvT2JqZWN0KVwiKTtcbiAgICAgIH1cbiAgICB9KShzY2hlbWEub3B0aW9ucywgYmFzZVNjaGVtYS5vcHRpb25zKTtcblxuICAgIHZhciB0b0pTT04gPSBzY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgICwgdG9PYmplY3QgPSBzY2hlbWEub3B0aW9ucy50b09iamVjdDtcblxuICAgIHNjaGVtYS5vcHRpb25zID0gdXRpbHMuY2xvbmUoYmFzZVNjaGVtYS5vcHRpb25zKTtcbiAgICBpZiAodG9KU09OKSAgIHNjaGVtYS5vcHRpb25zLnRvSlNPTiA9IHRvSlNPTjtcbiAgICBpZiAodG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0gdG9PYmplY3Q7XG5cbiAgICBzY2hlbWEuY2FsbFF1ZXVlID0gYmFzZVNjaGVtYS5jYWxsUXVldWUuY29uY2F0KHNjaGVtYS5jYWxsUXVldWUpO1xuICAgIHNjaGVtYS5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDsgLy8gcmVzZXQganVzdCBpbiBjYXNlIFNjaGVtYSNyZXF1aXJlZFBhdGhzKCkgd2FzIGNhbGxlZCBvbiBlaXRoZXIgc2NoZW1hXG4gIH0pKHNjaGVtYSwgdGhpcyk7XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JzKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9ycyA9IHt9O1xuICB9XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBudWxsLCBpc1Jvb3Q6IHRydWUgfTtcbiAgfVxuXG4gIGlmICh0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciB3aXRoIG5hbWUgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBhbHJlYWR5IGV4aXN0c1wiKTtcbiAgfVxuXG4gIHRoaXMuZGlzY3JpbWluYXRvcnNbbmFtZV0gPSBzY2hlbWE7XG59O1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYTtcbndpbmRvdy5TY2hlbWEgPSBTY2hlbWE7XG5cbi8vIHJlcXVpcmUgZG93biBoZXJlIGJlY2F1c2Ugb2YgcmVmZXJlbmNlIGlzc3Vlc1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIGJ1aWx0LWluIE1vbmdvb3NlIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQ7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW1N0cmluZ10oI3NjaGVtYS1zdHJpbmctanMpXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxuICogLSBbQm9vbGVhbl0oI3NjaGVtYS1ib29sZWFuLWpzKSB8IEJvb2xcbiAqIC0gW0FycmF5XSgjc2NoZW1hLWFycmF5LWpzKVxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxuICogLSBbT2JqZWN0SWRdKCNzY2hlbWEtb2JqZWN0aWQtanMpIHwgT2lkXG4gKiAtIFtNaXhlZF0oI3NjaGVtYS1taXhlZC1qcykgfCBPYmplY3RcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgTWl4ZWRgIFNjaGVtYVR5cGUsIHdlIGNhbiB1c2UgdGhlbSBpbiBvdXIgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XG4gKiAgICAgbmV3IG1vbmdvb3NlLlNjaGVtYSh7IF91c2VyOiBNaXhlZCB9KVxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5UeXBlcyA9IHJlcXVpcmUoJy4vc2NoZW1hL2luZGV4Jyk7XG5cbi8vINCl0YDQsNC90LjQu9C40YnQtSDRgdGF0LXQvFxuU2NoZW1hLnNjaGVtYXMgPSBzY2hlbWFzID0ge307XG5cblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcbnZhciBPYmplY3RJZCA9IFNjaGVtYS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBUeXBlcyA9IHtcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcbiAgICAgICwgRGF0ZTogcmVxdWlyZSgnLi9kYXRlJylcbiAgICAgICwgTnVtYmVyOiByZXF1aXJlKCcuL251bWJlcicpXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxuICAgICAgLCBPYmplY3RJZDogcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICAgfVxuICAsIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2FycmF5JylcbiAgLCBNaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxuICAsIEVtYmVkZGVkRG9jO1xuXG4vKipcbiAqIEFycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYVR5cGV9IGNhc3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYUFycmF5IChrZXksIGNhc3QsIG9wdGlvbnMpIHtcbiAgaWYgKGNhc3QpIHtcbiAgICB2YXIgY2FzdE9wdGlvbnMgPSB7fTtcblxuICAgIGlmICgnT2JqZWN0JyA9PT0gdXRpbHMuZ2V0RnVuY3Rpb25OYW1lKCBjYXN0LmNvbnN0cnVjdG9yICkgKSB7XG4gICAgICBpZiAoY2FzdC50eXBlKSB7XG4gICAgICAgIC8vIHN1cHBvcnQgeyB0eXBlOiBXb290IH1cbiAgICAgICAgY2FzdE9wdGlvbnMgPSBfLmNsb25lKCBjYXN0ICk7IC8vIGRvIG5vdCBhbHRlciB1c2VyIGFyZ3VtZW50c1xuICAgICAgICBkZWxldGUgY2FzdE9wdGlvbnMudHlwZTtcbiAgICAgICAgY2FzdCA9IGNhc3QudHlwZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhc3QgPSBNaXhlZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IHsgdHlwZTogJ1N0cmluZycgfVxuICAgIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIGNhc3RcbiAgICAgID8gY2FzdFxuICAgICAgOiB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGNhc3QgKTtcblxuICAgIHZhciBjYXN0ZXIgPSBuYW1lIGluIFR5cGVzXG4gICAgICA/IFR5cGVzW25hbWVdXG4gICAgICA6IGNhc3Q7XG5cbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gY2FzdGVyO1xuICAgIHRoaXMuY2FzdGVyID0gbmV3IGNhc3RlcihudWxsLCBjYXN0T3B0aW9ucyk7XG5cbiAgICAvLyBsYXp5IGxvYWRcbiAgICBFbWJlZGRlZERvYyB8fCAoRW1iZWRkZWREb2MgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpKTtcblxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XG4gICAgICB0aGlzLmNhc3Rlci5wYXRoID0ga2V5O1xuICAgIH1cbiAgfVxuXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xuXG4gIHZhciBzZWxmID0gdGhpc1xuICAgICwgZGVmYXVsdEFyclxuICAgICwgZm47XG5cbiAgaWYgKHRoaXMuZGVmYXVsdFZhbHVlKSB7XG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xuICAgIGZuID0gJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGVmYXVsdEFycjtcbiAgfVxuXG4gIHRoaXMuZGVmYXVsdChmdW5jdGlvbigpe1xuICAgIHZhciBhcnIgPSBmbiA/IGRlZmF1bHRBcnIoKSA6IGRlZmF1bHRBcnIgfHwgW107XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlQXJyYXkoYXJyLCBzZWxmLnBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblNjaGVtYUFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUFycmF5O1xuXG4vKipcbiAqIENoZWNrIHJlcXVpcmVkXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGVzIHRoZSBnZXR0ZXJzIGFwcGxpY2F0aW9uIGZvciB0aGUgcG9wdWxhdGlvbiBzcGVjaWFsLWNhc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIGlmICh0aGlzLmNhc3Rlci5vcHRpb25zICYmIHRoaXMuY2FzdGVyLm9wdGlvbnMucmVmKSB7XG4gICAgLy8gbWVhbnMgdGhlIG9iamVjdCBpZCB3YXMgcG9wdWxhdGVkXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIFNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycy5jYWxsKHRoaXMsIHZhbHVlLCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIHZhbHVlcyBmb3Igc2V0KCkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgZG9jdW1lbnQgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQHBhcmFtIHtCb29sZWFufSBpbml0IHdoZXRoZXIgdGhpcyBpcyBhbiBpbml0aWFsaXphdGlvbiBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQgKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmICghKHZhbHVlLmlzU3RvcmFnZUFycmF5KSkge1xuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FzdGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhbHVlW2ldID0gdGhpcy5jYXN0ZXIuY2FzdCh2YWx1ZVtpXSwgZG9jLCBpbml0KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyByZXRocm93XG4gICAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoZS50eXBlLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQpO1xuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQXJyYXk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG5cbi8qKlxuICogQm9vbGVhbiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBwYXRoLCBvcHRpb25zKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9vbGVhblNjaGVtYTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XG52YXIgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3I7XG5cbi8qKlxuICogRGF0ZSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEYXRlU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgZGF0ZVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIERhdGU7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIGRhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdG8gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRhdGVTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJylcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICB2YXIgZGF0ZTtcblxuICAvLyBzdXBwb3J0IGZvciB0aW1lc3RhbXBzXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSlcbiAgICBkYXRlID0gbmV3IERhdGUoTnVtYmVyKHZhbHVlKSk7XG5cbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXG4gIGVsc2UgaWYgKHZhbHVlLnRvU3RyaW5nKVxuICAgIGRhdGUgPSBuZXcgRGF0ZSh2YWx1ZS50b1N0cmluZygpKTtcblxuICBpZiAoZGF0ZS50b1N0cmluZygpICE9ICdJbnZhbGlkIERhdGUnKVxuICAgIHJldHVybiBkYXRlO1xuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ2RhdGUnLCB2YWx1ZSwgdGhpcy5wYXRoICk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVNjaGVtYTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQXJyYXlUeXBlID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgU3RvcmFnZURvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9kb2N1bWVudGFycmF5JylcbiAgLCBTdWJkb2N1bWVudCA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtYmVkZGVkRG9jdW1lbnQ7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaSBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbaV0gPSBzY2hlbWEuc3RhdGljc1tpXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50QXJyYXk7XG5cbi8qKlxuICogUGVyZm9ybXMgbG9jYWwgdmFsaWRhdGlvbnMgZmlyc3QsIHRoZW4gdmFsaWRhdGlvbnMgb24gZWFjaCBlbWJlZGRlZCBkb2NcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uIChhcnJheSwgZm4sIHNjb3BlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBTY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlLmNhbGwodGhpcywgYXJyYXksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcblxuICAgIHZhciBjb3VudCA9IGFycmF5ICYmIGFycmF5Lmxlbmd0aFxuICAgICAgLCBlcnJvcjtcblxuICAgIGlmICghY291bnQpIHJldHVybiBmbigpO1xuXG4gICAgLy8gaGFuZGxlIHNwYXJzZSBhcnJheXMsIGRvIG5vdCB1c2UgYXJyYXkuZm9yRWFjaCB3aGljaCBkb2VzIG5vdFxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzcGFyc2UgZWxlbWVudHMgeWV0IHJlcG9ydHMgYXJyYXkubGVuZ3RoIGluY2x1ZGluZ1xuICAgIC8vIHRoZW0gOihcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgOyhmdW5jdGlvbiAoaSkge1xuICAgICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XG4gICAgICAgICAgICAvLyByZXdyaXRlIHRoZSBrZXlcbiAgICAgICAgICAgIGVyci5rZXkgPSBzZWxmLmtleSArICcuJyArIGkgKyAnLicgKyBlcnIua2V5O1xuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLS1jb3VudCB8fCBmbigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKGkpO1xuICAgIH1cbiAgfSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyBjb250ZW50c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlLCBkb2MsIGluaXQsIHByZXYpIHtcbiAgdmFyIHNlbGVjdGVkXG4gICAgLCBzdWJkb2NcbiAgICAsIGk7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0LCBwcmV2KTtcbiAgfVxuXG4gIGlmICghKHZhbHVlLmlzU3RvcmFnZURvY3VtZW50QXJyYXkpKSB7XG4gICAgdmFsdWUgPSBuZXcgU3RvcmFnZURvY3VtZW50QXJyYXkodmFsdWUsIHRoaXMucGF0aCwgZG9jKTtcbiAgICBpZiAocHJldiAmJiBwcmV2Ll9oYW5kbGVycykge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByZXYuX2hhbmRsZXJzKSB7XG4gICAgICAgIGRvYy5vZmYoa2V5LCBwcmV2Ll9oYW5kbGVyc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpID0gdmFsdWUubGVuZ3RoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBpZiAoISh2YWx1ZVtpXSBpbnN0YW5jZW9mIFN1YmRvY3VtZW50KSAmJiB2YWx1ZVtpXSkge1xuICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XG4gICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKG51bGwsIHZhbHVlLCB0cnVlLCBzZWxlY3RlZCk7XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jLmluaXQodmFsdWVbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzdWJkb2MgPSBwcmV2LmlkKHZhbHVlW2ldLl9pZCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cblxuICAgICAgICBpZiAocHJldiAmJiBzdWJkb2MpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxuICAgICAgICAgIC8vIGRvYy5hcnJheSA9IFt7IGRvYzogJ3ZhbCcgfV1cbiAgICAgICAgICBzdWJkb2Muc2V0KHZhbHVlW2ldKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZVtpXSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc2V0KCkgaXMgaG9va2VkIGl0IHdpbGwgaGF2ZSBubyByZXR1cm4gdmFsdWVcbiAgICAgICAgLy8gc2VlIGdoLTc0NlxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcblxuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuZXhwb3J0cy5NaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKTtcblxuLy8gYWxpYXNcblxuZXhwb3J0cy5PaWQgPSBleHBvcnRzLk9iamVjdElkO1xuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xuZXhwb3J0cy5Cb29sID0gZXhwb3J0cy5Cb29sZWFuO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xuXG4vKipcbiAqIE1peGVkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE1peGVkIChwYXRoLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdCkge1xuICAgIHZhciBkZWYgPSBvcHRpb25zLmRlZmF1bHQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGVmKSAmJiAwID09PSBkZWYubGVuZ3RoKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgZW1wdHkgYXJyYXkgZGVmYXVsdHMgYXJlIGhhbmRsZWRcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IEFycmF5O1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2hhcmVkICYmXG4gICAgICAgICAgICAgICBfLmlzUGxhaW5PYmplY3QoZGVmKSAmJlxuICAgICAgICAgICAgICAgMCA9PT0gT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHtcbiAgICAgIC8vIHByZXZlbnQgb2RkIFwic2hhcmVkXCIgb2JqZWN0cyBiZXR3ZWVuIGRvY3VtZW50c1xuICAgICAgb3B0aW9ucy5kZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xuTWl4ZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWl4ZWQ7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhlZDtcbiIsIi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXM7XG5cbi8qKlxuICogTnVtYmVyIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gTnVtYmVyU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ051bWJlcicpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTnVtYmVyU2NoZW1hO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgbnVtYmVyXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCB2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcjtcbiAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGEgbWluaW11bSBudW1iZXIgdmFsaWRhdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuOiA5IH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUlOfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWluID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGJlbmVhdGggdGhlIGxpbWl0ICh7TUlOfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiBtaW4gfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtaW5pbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5taW5WYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1pblZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWluO1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUlOfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5taW5WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA+PSB2YWx1ZTtcbiAgICB9LCBtc2csICdtaW4nXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyBhIG1heGltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogMTEgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNQVh9IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtYXggPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgZXhjZWVkcyB0aGUgbGltaXQgKHtNQVh9KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IG1heCB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBleGNlZWRzIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1heGltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1heFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWF4O1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUFYfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5tYXhWYWxpZGF0b3IgPSBmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPD0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWF4J10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIG51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIHZhbCA9IHZhbHVlICYmIHZhbHVlLl9pZFxuICAgID8gdmFsdWUuX2lkIC8vIGRvY3VtZW50c1xuICAgIDogdmFsdWU7XG5cbiAgaWYgKCFpc05hTih2YWwpKXtcbiAgICBpZiAobnVsbCA9PT0gdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICgnJyA9PT0gdmFsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIHZhbFxuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICh2YWwudG9TdHJpbmcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSAmJlxuICAgICAgICB2YWwudG9TdHJpbmcoKSA9PSBOdW1iZXIodmFsKSkge1xuICAgICAgcmV0dXJuIG5ldyBOdW1iZXIodmFsKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdudW1iZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJTY2hlbWE7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBPYmplY3RJZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnT2JqZWN0SWQnKTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XG5PYmplY3RJZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBPYmplY3RJZDtcblxuLyoqXG4gKiBBZGRzIGFuIGF1dG8tZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHQgaWYgdHVybk9uIGlzIHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmF1dG8gPSBmdW5jdGlvbiAoIHR1cm5PbiApIHtcbiAgaWYgKCB0dXJuT24gKSB7XG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcbiAgICB0aGlzLnNldCggcmVzZXRJZCApXG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBvaWQ7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgLy8gd2FpdCEgd2UgbWF5IG5lZWQgdG8gY2FzdCB0aGlzIHRvIGEgZG9jdW1lbnRcblxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gbGF6eSBsb2FkXG4gICAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi8uLi9kb2N1bWVudCcpKTtcblxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERvY3VtZW50KSB7XG4gICAgICB2YWx1ZS4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQgKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBlbHNlIGlmICggIV8uaXNQbGFpbk9iamVjdCggdmFsdWUgKSApIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuXG4gICAgLy8g0J3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtSwg0YPQutCw0LfQsNC90L3QvtC5INCyINGB0YHRi9C70LrQtVxuICAgIHZhciBzY2hlbWEgPSB0aGlzLm9wdGlvbnMucmVmO1xuICAgIGlmICggIXNjaGVtYSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDRgdGF0LXQvNGDLCDQv9C+INC60L7RgtC+0YDQvtC5INGN0YLQvtGCINC00L7QutGD0LzQtdC90YIg0YHQvtC30LTQsNCy0LDRgtGMJyk7XG4gICAgfVxuXG4gICAgaWYgKCAhc3RvcmFnZS5zY2hlbWFzWyBzY2hlbWEgXSApe1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXG4gICAgICAgICfQvdGD0LbQvdC+INGD0LrQsNC30YvQstCw0YLRjCDQvdCw0LfQstCw0L3QuNC1INGB0YXQtdC80Ysg0L3QsCDQutC+0YLQvtGA0YPRjiDRgdGB0YvQu9Cw0LXQvNGB0Y8g0L/RgNC4INC10ZEg0YHQvtC30LTQsNC90LjQuCAoIG5ldyBTY2hlbWEoXCJuYW1lXCIsIHNjaGVtYU9iamVjdCkgKScpO1xuICAgIH1cblxuICAgIHZhciBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0gKTtcbiAgICBkb2MuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XG5cbiAgICByZXR1cm4gZG9jO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2Ygb2lkKVxuICAgIHJldHVybiB2YWx1ZTtcblxuICBpZiAoIHZhbHVlLl9pZCAmJiB2YWx1ZS5faWQgaW5zdGFuY2VvZiBvaWQgKVxuICAgIHJldHVybiB2YWx1ZS5faWQ7XG5cbiAgaWYgKHZhbHVlLnRvU3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBvaWQuY3JlYXRlRnJvbUhleFN0cmluZyh2YWx1ZS50b1N0cmluZygpKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRJZCAoKSB7XG4gIHJldHVybiBuZXcgb2lkKCk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0SWQgKHYpIHtcbiAgdGhpcy4kX18uX2lkID0gbnVsbDtcbiAgcmV0dXJuIHY7XG59XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXM7XG5cbi8qKlxuICogU3RyaW5nIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBTdHJpbmdTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICB0aGlzLmVudW1WYWx1ZXMgPSBbXTtcbiAgdGhpcy5yZWdFeHAgPSBudWxsO1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnU3RyaW5nJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdTY2hlbWE7XG5cbi8qKlxuICogQWRkcyBhbiBlbnVtIHZhbGlkYXRvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgc3RhdGVzID0gJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogc3RhdGVzIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogYGludmFsaWRgIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHN0YXRlYC5cbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgdmFyIGVudSA9IHtcbiAqICAgICAgIHZhbHVlczogJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKSxcbiAqICAgICAgIG1lc3NhZ2U6ICdlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnXG4gKiAgICAgfVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogZW51IH0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHN0YXRlYCB3aXRoIHZhbHVlIGBpbnZhbGlkYFxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IFthcmdzLi4uXSBlbnVtZXJhdGlvbiB2YWx1ZXNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5lbnVtID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5lbnVtVmFsaWRhdG9yKSB7XG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMuZW51bVZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmYWxzZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IGFyZ3VtZW50c1swXSB8fCBmYWxzZSA9PT0gYXJndW1lbnRzWzBdKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsdWVzO1xuICB2YXIgZXJyb3JNZXNzYWdlO1xuXG4gIGlmIChfLmlzUGxhaW5PYmplY3QoYXJndW1lbnRzWzBdKSkge1xuICAgIHZhbHVlcyA9IGFyZ3VtZW50c1swXS52YWx1ZXM7XG4gICAgZXJyb3JNZXNzYWdlID0gYXJndW1lbnRzWzBdLm1lc3NhZ2U7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWVzID0gYXJndW1lbnRzO1xuICAgIGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuU3RyaW5nLmVudW07XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh1bmRlZmluZWQgIT09IHZhbHVlc1tpXSkge1xuICAgICAgdGhpcy5lbnVtVmFsdWVzLnB1c2godGhpcy5jYXN0KHZhbHVlc1tpXSkpO1xuICAgIH1cbiAgfVxuXG4gIHZhciB2YWxzID0gdGhpcy5lbnVtVmFsdWVzO1xuICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgIHJldHVybiB1bmRlZmluZWQgPT09IHYgfHwgfnZhbHMuaW5kZXhPZih2KTtcbiAgfTtcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMuZW51bVZhbGlkYXRvciwgZXJyb3JNZXNzYWdlLCAnZW51bSddKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGxvd2VyY2FzZSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgZW1haWw6ICdTb21lRW1haWxAZXhhbXBsZS5DT00nIH0pO1xuICogICAgIGNvbnNvbGUubG9nKG0uZW1haWwpIC8vIHNvbWVlbWFpbEBleGFtcGxlLmNvbVxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubG93ZXJjYXNlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHY7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIHVwcGVyY2FzZSBzZXR0ZXIuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGNhcHM6IHsgdHlwZTogU3RyaW5nLCB1cHBlcmNhc2U6IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xuICogICAgIHZhciBtID0gbmV3IE0oeyBjYXBzOiAnYW4gZXhhbXBsZScgfSk7XG4gKiAgICAgY29uc29sZS5sb2cobS5jYXBzKSAvLyBBTiBFWEFNUExFXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS51cHBlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xuICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcbiAgICBpZiAodikgcmV0dXJuIHYudG9VcHBlckNhc2UoKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB0cmltIHNldHRlci5cbiAqXG4gKiBUaGUgc3RyaW5nIHZhbHVlIHdpbGwgYmUgdHJpbW1lZCB3aGVuIHNldC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHRyaW06IHRydWUgfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIHN0cmluZyA9ICcgc29tZSBuYW1lICdcbiAqICAgICBjb25zb2xlLmxvZyhzdHJpbmcubGVuZ3RoKSAvLyAxMVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiBzdHJpbmcgfSlcbiAqICAgICBjb25zb2xlLmxvZyhtLm5hbWUubGVuZ3RoKSAvLyA5XG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqL1xuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XG4gICAgaWYgKHYpIHJldHVybiB2LnRyaW0oKTtcbiAgICByZXR1cm4gdjtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFNldHMgYSByZWdleHAgdmFsaWRhdG9yLlxuICpcbiAqIEFueSB2YWx1ZSB0aGF0IGRvZXMgbm90IHBhc3MgYHJlZ0V4cGAudGVzdCh2YWwpIHdpbGwgZmFpbCB2YWxpZGF0aW9uLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8gfX0pXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG5hbWU6ICdJIGFtIGludmFsaWQnIH0pXG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogUGF0aCBgbmFtZWAgaXMgaW52YWxpZCAoSSBhbSBpbnZhbGlkKS5cIlxuICogICAgICAgbS5uYW1lID0gJ2FwcGxlcydcbiAqICAgICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgICBhc3NlcnQub2soZXJyKSAvLyBzdWNjZXNzXG4gKiAgICAgICB9KVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIHVzaW5nIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqICAgICB2YXIgbWF0Y2ggPSBbIC9cXC5odG1sJC8sIFwiVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sICh7VkFMVUV9KVwiIF07XG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgZmlsZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiBtYXRjaCB9fSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGZpbGU6ICdpbnZhbGlkJyB9KTtcbiAqICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sIChpbnZhbGlkKVwiXG4gKiAgICAgfSlcbiAqXG4gKiBFbXB0eSBzdHJpbmdzLCBgdW5kZWZpbmVkYCwgYW5kIGBudWxsYCB2YWx1ZXMgYWx3YXlzIHBhc3MgdGhlIG1hdGNoIHZhbGlkYXRvci4gSWYgeW91IHJlcXVpcmUgdGhlc2UgdmFsdWVzLCBlbmFibGUgdGhlIGByZXF1aXJlZGAgdmFsaWRhdG9yIGFsc28uXG4gKlxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogL15hLywgcmVxdWlyZWQ6IHRydWUgfX0pXG4gKlxuICogQHBhcmFtIHtSZWdFeHB9IHJlZ0V4cCByZWd1bGFyIGV4cHJlc3Npb24gdG8gdGVzdCBhZ2FpbnN0XG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xuXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xuXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXG4gICAgICA6IHRydWVcbiAgfVxuXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFttYXRjaFZhbGlkYXRvciwgbXNnLCAncmVnZXhwJ10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiBjaGVja1JlcXVpcmVkICh2YWx1ZSwgZG9jKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAodmFsdWUgaW5zdGFuY2VvZiBTdHJpbmcgfHwgdHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSAmJiB2YWx1ZS5sZW5ndGg7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gU3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggdmFsdWUgPT09IG51bGwgKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAvLyBoYW5kbGUgZG9jdW1lbnRzIGJlaW5nIHBhc3NlZFxuICAgIGlmICh2YWx1ZS5faWQgJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlLl9pZCkge1xuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcbiAgICB9XG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGVycm9yTWVzc2FnZXMgPSBlcnJvci5tZXNzYWdlcztcbnZhciBDYXN0RXJyb3IgPSBlcnJvci5DYXN0RXJyb3I7XG52YXIgVmFsaWRhdG9yRXJyb3IgPSBlcnJvci5WYWxpZGF0b3JFcnJvcjtcblxuLyoqXG4gKiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7U3RyaW5nfSBbaW5zdGFuY2VdXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFNjaGVtYVR5cGUgKHBhdGgsIG9wdGlvbnMsIGluc3RhbmNlKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcbiAgdGhpcy52YWxpZGF0b3JzID0gW107XG4gIHRoaXMuc2V0dGVycyA9IFtdO1xuICB0aGlzLmdldHRlcnMgPSBbXTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIGlmICh0aGlzW2ldICYmICdmdW5jdGlvbicgPT0gdHlwZW9mIHRoaXNbaV0pIHtcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcbiAgICAgID8gb3B0aW9uc1tpXVxuICAgICAgOiBbb3B0aW9uc1tpXV07XG5cbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxuICpcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxuICogICAgIHZhciBtID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxuICpcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4ge307XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XG4gKiAgICAgdmFyIG0xID0gbmV3IE07XG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XG4gKiAgICAgdmFyIG0yID0gbmV3IE07XG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyB2YWxcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxuICpcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXG4gKlxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cbiAqXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cbiAqXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIE1vbmdvb3NlIHNldHRlci5cbiAqXG4gKiAgICAgZnVuY3Rpb24gdG9Mb3dlciAodikge1xuICogICAgICAgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcbiAqICAgICB9XG4gKlxuICogICAgIHZhciBVc2VyU2NoZW1hID0gbmV3IFNjaGVtYSh7XG4gKiAgICAgICBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIHNldDogdG9Mb3dlciB9XG4gKiAgICAgfSlcbiAqXG4gKiAgICAgdmFyIFVzZXIgPSBkYi5tb2RlbCgnVXNlcicsIFVzZXJTY2hlbWEpXG4gKlxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXIoe2VtYWlsOiAnQVZFTlVFQFEuQ09NJ30pXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCk7IC8vICdhdmVudWVAcS5jb20nXG4gKlxuICogICAgIC8vIG9yXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlclxuICogICAgIHVzZXIuZW1haWwgPSAnQXZlbnVlQFEuY29tJ1xuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpIC8vICdhdmVudWVAcS5jb20nXG4gKlxuICogQXMgeW91IGNhbiBzZWUgYWJvdmUsIHNldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgZGF0YSBiZWZvcmUgaXQgZ2V0cyB0byB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgYW5kIGlzIHNldCBhcyBhIHZhbHVlIG9uIGFuIGFjdHVhbCBrZXkuXG4gKlxuICogX05PVEU6IHdlIGNvdWxkIGhhdmUgYWxzbyBqdXN0IHVzZWQgdGhlIGJ1aWx0LWluIGBsb3dlcmNhc2U6IHRydWVgIFNjaGVtYVR5cGUgb3B0aW9uIGluc3RlYWQgb2YgZGVmaW5pbmcgb3VyIG93biBmdW5jdGlvbi5fXG4gKlxuICogICAgIG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcbiAqXG4gKiBTZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIHNldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiB2YWw7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgc2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgc2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqICAgICB2YXIgdiA9IG5ldyBWaXJ1cyh7IG5hbWU6ICdQYXJ2b3ZpcmlkYWUnLCB0YXhvbm9teTogJ1BhcnZvdmlyaW5hZScgfSk7XG4gKlxuICogICAgIGNvbnNvbGUubG9nKHYubmFtZSk7ICAgICAvLyBuYW1lIGlzIHJlcXVpcmVkXG4gKiAgICAgY29uc29sZS5sb2codi50YXhvbm9teSk7IC8vIFBhcnZvdmlyaW5hZVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIGZuKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Egc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhIGdldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGZ1bmN0aW9uIGRvYiAodmFsKSB7XG4gKiAgICAgICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcbiAqICAgICAgIHJldHVybiAodmFsLmdldE1vbnRoKCkgKyAxKSArIFwiL1wiICsgdmFsLmdldERhdGUoKSArIFwiL1wiICsgdmFsLmdldEZ1bGxZZWFyKCk7XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgZ2V0OiBkb2IgfSlcbiAqXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IERhdGUgfSlcbiAqICAgICBzLnBhdGgoJ2Jvcm4nKS5nZXQoZG9iKVxuICpcbiAqIEdldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgYXMgaXQgdHJhdmVscyBmcm9tIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCB0byB0aGUgdmFsdWUgdGhhdCB5b3Ugc2VlLlxuICpcbiAqIFN1cHBvc2UgeW91IGFyZSBzdG9yaW5nIGNyZWRpdCBjYXJkIG51bWJlcnMgYW5kIHlvdSB3YW50IHRvIGhpZGUgZXZlcnl0aGluZyBleGNlcHQgdGhlIGxhc3QgNCBkaWdpdHMgdG8gdGhlIG1vbmdvb3NlIHVzZXIuIFlvdSBjYW4gZG8gc28gYnkgZGVmaW5pbmcgYSBnZXR0ZXIgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG4gKlxuICogICAgIGZ1bmN0aW9uIG9iZnVzY2F0ZSAoY2MpIHtcbiAqICAgICAgIHJldHVybiAnKioqKi0qKioqLSoqKiotJyArIGNjLnNsaWNlKGNjLmxlbmd0aC00LCBjYy5sZW5ndGgpO1xuICogICAgIH1cbiAqXG4gKiAgICAgdmFyIEFjY291bnRTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIGNyZWRpdENhcmROdW1iZXI6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IG9iZnVzY2F0ZSB9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBBY2NvdW50ID0gZGIubW9kZWwoJ0FjY291bnQnLCBBY2NvdW50U2NoZW1hKTtcbiAqXG4gKiAgICAgQWNjb3VudC5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgZm91bmQpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGZvdW5kLmNyZWRpdENhcmROdW1iZXIpOyAvLyAnKioqKi0qKioqLSoqKiotMTIzNCdcbiAqICAgICB9KTtcbiAqXG4gKiBHZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIGdldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXG4gKlxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcbiAqICAgICAgIH0gZWxzZSB7XG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIG5vdCc7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZ2V0OiBpbnNwZWN0b3IgfSxcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgZ2V0OiBpbnNwZWN0b3IgfVxuICogICAgIH0pXG4gKlxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcbiAqXG4gKiAgICAgVmlydXMuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIHZpcnVzKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLnRheG9ub215KTsgLy8gdGF4b25vbXkgaXMgbm90XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiBmbilcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGdldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgdmFsaWRhdG9yKHMpIGZvciB0aGlzIGRvY3VtZW50IHBhdGguXG4gKlxuICogVmFsaWRhdG9ycyBhbHdheXMgcmVjZWl2ZSB0aGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgdGhlaXIgZmlyc3QgYXJndW1lbnQgYW5kIG11c3QgcmV0dXJuIGBCb29sZWFuYC4gUmV0dXJuaW5nIGBmYWxzZWAgbWVhbnMgdmFsaWRhdGlvbiBmYWlsZWQuXG4gKlxuICogVGhlIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQgaXMgb3B0aW9uYWwuIElmIG5vdCBwYXNzZWQsIHRoZSBbZGVmYXVsdCBnZW5lcmljIGVycm9yIG1lc3NhZ2UgdGVtcGxhdGVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKSB3aWxsIGJlIHVzZWQuXG4gKlxuICogIyMjI0V4YW1wbGVzOlxuICpcbiAqICAgICAvLyBtYWtlIHN1cmUgZXZlcnkgdmFsdWUgaXMgZXF1YWwgdG8gXCJzb21ldGhpbmdcIlxuICogICAgIGZ1bmN0aW9uIHZhbGlkYXRvciAodmFsKSB7XG4gKiAgICAgICByZXR1cm4gdmFsID09ICdzb21ldGhpbmcnO1xuICogICAgIH1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiB2YWxpZGF0b3IgfX0pO1xuICpcbiAqICAgICAvLyB3aXRoIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIGN1c3RvbSA9IFt2YWxpZGF0b3IsICdVaCBvaCwge1BBVEh9IGRvZXMgbm90IGVxdWFsIFwic29tZXRoaW5nXCIuJ11cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBjdXN0b20gfX0pO1xuICpcbiAqICAgICAvLyBhZGRpbmcgbWFueSB2YWxpZGF0b3JzIGF0IGEgdGltZVxuICpcbiAqICAgICB2YXIgbWFueSA9IFtcbiAqICAgICAgICAgeyB2YWxpZGF0b3I6IHZhbGlkYXRvciwgbXNnOiAndWggb2gnIH1cbiAqICAgICAgICwgeyB2YWxpZGF0b3I6IGFub3RoZXJWYWxpZGF0b3IsIG1zZzogJ2ZhaWxlZCcgfVxuICogICAgIF1cbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBtYW55IH19KTtcbiAqXG4gKiAgICAgLy8gb3IgdXRpbGl6aW5nIFNjaGVtYVR5cGUgbWV0aG9kcyBkaXJlY3RseTpcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiAnc3RyaW5nJyB9KTtcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKHZhbGlkYXRvciwgJ3ZhbGlkYXRpb24gb2YgYHtQQVRIfWAgZmFpbGVkIHdpdGggdmFsdWUgYHtWQUxVRX1gJyk7XG4gKlxuICogIyMjI0Vycm9yIG1lc3NhZ2UgdGVtcGxhdGVzOlxuICpcbiAqIEZyb20gdGhlIGV4YW1wbGVzIGFib3ZlLCB5b3UgbWF5IGhhdmUgbm90aWNlZCB0aGF0IGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzZWljIHRlbXBsYXRpbmcuIFRoZXJlIGFyZSBhIGZldyBvdGhlciB0ZW1wbGF0ZSBrZXl3b3JkcyBiZXNpZGVzIGB7UEFUSH1gIGFuZCBge1ZBTFVFfWAgdG9vLiBUbyBmaW5kIG91dCBtb3JlLCBkZXRhaWxzIGFyZSBhdmFpbGFibGUgW2hlcmVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKVxuICpcbiAqICMjIyNBc3luY2hyb25vdXMgdmFsaWRhdGlvbjpcbiAqXG4gKiBQYXNzaW5nIGEgdmFsaWRhdG9yIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdHdvIGFyZ3VtZW50cyB0ZWxscyBtb25nb29zZSB0aGF0IHRoZSB2YWxpZGF0b3IgaXMgYW4gYXN5bmNocm9ub3VzIHZhbGlkYXRvci4gVGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgdmFsaWRhdG9yIGZ1bmN0aW9uIGlzIHRoZSB2YWx1ZSBiZWluZyB2YWxpZGF0ZWQuIFRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG11c3QgY2FsbGVkIHdoZW4geW91IGZpbmlzaCB2YWxpZGF0aW5nIHRoZSB2YWx1ZSBhbmQgcGFzc2VkIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCB0byBjb21tdW5pY2F0ZSBlaXRoZXIgc3VjY2VzcyBvciBmYWlsdXJlIHJlc3BlY3RpdmVseS5cbiAqXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZShmdW5jdGlvbiAodmFsdWUsIHJlc3BvbmQpIHtcbiAqICAgICAgIGRvU3R1ZmYodmFsdWUsIGZ1bmN0aW9uICgpIHtcbiAqICAgICAgICAgLi4uXG4gKiAgICAgICAgIHJlc3BvbmQoZmFsc2UpOyAvLyB2YWxpZGF0aW9uIGZhaWxlZFxuICogICAgICAgfSlcbiogICAgICB9LCAne1BBVEh9IGZhaWxlZCB2YWxpZGF0aW9uLicpO1xuKlxuICogWW91IG1pZ2h0IHVzZSBhc3luY2hyb25vdXMgdmFsaWRhdG9ycyB0byByZXRyZWl2ZSBvdGhlciBkb2N1bWVudHMgZnJvbSB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGUgYWdhaW5zdCBvciB0byBtZWV0IG90aGVyIEkvTyBib3VuZCB2YWxpZGF0aW9uIG5lZWRzLlxuICpcbiAqIFZhbGlkYXRpb24gb2NjdXJzIGBwcmUoJ3NhdmUnKWAgb3Igd2hlbmV2ZXIgeW91IG1hbnVhbGx5IGV4ZWN1dGUgW2RvY3VtZW50I3ZhbGlkYXRlXSgjZG9jdW1lbnRfRG9jdW1lbnQtdmFsaWRhdGUpLlxuICpcbiAqIElmIHZhbGlkYXRpb24gZmFpbHMgZHVyaW5nIGBwcmUoJ3NhdmUnKWAgYW5kIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQgdG8gcmVjZWl2ZSB0aGUgZXJyb3IsIGFuIGBlcnJvcmAgZXZlbnQgd2lsbCBiZSBlbWl0dGVkIG9uIHlvdXIgTW9kZWxzIGFzc29jaWF0ZWQgZGIgW2Nvbm5lY3Rpb25dKCNjb25uZWN0aW9uX0Nvbm5lY3Rpb24pLCBwYXNzaW5nIHRoZSB2YWxpZGF0aW9uIGVycm9yIG9iamVjdCBhbG9uZy5cbiAqXG4gKiAgICAgdmFyIGNvbm4gPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcbiAqICAgICBjb25uLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiAgICAgdmFyIFByb2R1Y3QgPSBjb25uLm1vZGVsKCdQcm9kdWN0JywgeW91clNjaGVtYSk7XG4gKiAgICAgdmFyIGR2ZCA9IG5ldyBQcm9kdWN0KC4uKTtcbiAqICAgICBkdmQuc2F2ZSgpOyAvLyBlbWl0cyBlcnJvciBvbiB0aGUgYGNvbm5gIGFib3ZlXG4gKlxuICogSWYgeW91IGRlc2lyZSBoYW5kbGluZyB0aGVzZSBlcnJvcnMgYXQgdGhlIE1vZGVsIGxldmVsLCBhdHRhY2ggYW4gYGVycm9yYCBsaXN0ZW5lciB0byB5b3VyIE1vZGVsIGFuZCB0aGUgZXZlbnQgd2lsbCBpbnN0ZWFkIGJlIGVtaXR0ZWQgdGhlcmUuXG4gKlxuICogICAgIC8vIHJlZ2lzdGVyaW5nIGFuIGVycm9yIGxpc3RlbmVyIG9uIHRoZSBNb2RlbCBsZXRzIHVzIGhhbmRsZSBlcnJvcnMgbW9yZSBsb2NhbGx5XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQHBhcmFtIHtSZWdFeHB8RnVuY3Rpb258T2JqZWN0fSBvYmogdmFsaWRhdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gW2Vycm9yTXNnXSBvcHRpb25hbCBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChvYmosIG1lc3NhZ2UsIHR5cGUpIHtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9iaiB8fCBvYmogJiYgJ1JlZ0V4cCcgPT09IHV0aWxzLmdldEZ1bmN0aW9uTmFtZSggb2JqLmNvbnN0cnVjdG9yICkpIHtcbiAgICBpZiAoIW1lc3NhZ2UpIG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcbiAgICBpZiAoIXR5cGUpIHR5cGUgPSAndXNlciBkZWZpbmVkJztcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbb2JqLCBtZXNzYWdlLCB0eXBlXSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZztcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgYXJnID0gYXJndW1lbnRzW2ldO1xuICAgIGlmICghKGFyZyAmJiAnT2JqZWN0JyA9PSB1dGlscy5nZXRGdW5jdGlvbk5hbWUoIGFyZy5jb25zdHJ1Y3RvciApICkpIHtcbiAgICAgIHZhciBtc2cgPSAnSW52YWxpZCB2YWxpZGF0b3IuIFJlY2VpdmVkICgnICsgdHlwZW9mIGFyZyArICcpICdcbiAgICAgICAgKyBhcmdcbiAgICAgICAgKyAnLiBTZWUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvYXBpLmh0bWwjc2NoZW1hdHlwZV9TY2hlbWFUeXBlLXZhbGlkYXRlJztcblxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIHRoaXMudmFsaWRhdGUoYXJnLnZhbGlkYXRvciwgYXJnLm1zZywgYXJnLnR5cGUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXF1aXJlZCB2YWxpZGF0b3IgdG8gdGhpcyBzY2hlbWF0eXBlLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiB0cnVlIH0pXG4gKlxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogJ3tQQVRIfSBpcyByZXF1aXJlZCEnIH0pXG4gKlxuICogICAgIC8vIG9yIHRocm91Z2ggdGhlIHBhdGggQVBJXG4gKlxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSk7XG4gKlxuICogICAgIC8vIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2luZ1xuICpcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUsICdncnJyIDooICcpO1xuICpcbiAqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIGVuYWJsZS9kaXNhYmxlIHRoZSB2YWxpZGF0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUucmVxdWlyZWQgPSBmdW5jdGlvbiAocmVxdWlyZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGZhbHNlID09PSByZXF1aXJlZCkge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMucmVxdWlyZWRWYWxpZGF0b3I7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLmlzUmVxdWlyZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5pc1JlcXVpcmVkID0gdHJ1ZTtcblxuICB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcbiAgICAvLyBpbiBoZXJlLCBgdGhpc2AgcmVmZXJzIHRvIHRoZSB2YWxpZGF0aW5nIGRvY3VtZW50LlxuICAgIC8vIG5vIHZhbGlkYXRpb24gd2hlbiB0aGlzIHBhdGggd2Fzbid0IHNlbGVjdGVkIGluIHRoZSBxdWVyeS5cbiAgICBpZiAodGhpcyAhPT0gdW5kZWZpbmVkICYmIC8vINGB0L/QtdGG0LjQsNC70YzQvdCw0Y8g0L/RgNC+0LLQtdGA0LrQsCDQuNC3LdC30LAgc3RyaWN0IG1vZGUg0Lgg0L7RgdC+0LHQtdC90L3QvtGB0YLQuCAuY2FsbCh1bmRlZmluZWQpXG4gICAgICAgICdpc1NlbGVjdGVkJyBpbiB0aGlzICYmXG4gICAgICAgICF0aGlzLmlzU2VsZWN0ZWQoc2VsZi5wYXRoKSAmJlxuICAgICAgICAhdGhpcy5pc01vZGlmaWVkKHNlbGYucGF0aCkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIHNlbGYuY2hlY2tSZXF1aXJlZCh2LCB0aGlzKTtcbiAgfTtcblxuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHJlcXVpcmVkKSB7XG4gICAgbWVzc2FnZSA9IHJlcXVpcmVkO1xuICAgIHJlcXVpcmVkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5nZW5lcmFsLnJlcXVpcmVkO1xuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5yZXF1aXJlZFZhbGlkYXRvciwgbXNnLCAncmVxdWlyZWQnXSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgZGVmYXVsdCB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZSB0aGUgc2NvcGUgd2hpY2ggY2FsbGJhY2sgYXJlIGV4ZWN1dGVkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNjb3BlLCBpbml0KSB7XG4gIHZhciByZXQgPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5kZWZhdWx0VmFsdWVcbiAgICA/IHRoaXMuZGVmYXVsdFZhbHVlLmNhbGwoc2NvcGUpXG4gICAgOiB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICBpZiAobnVsbCAhPT0gcmV0ICYmIHVuZGVmaW5lZCAhPT0gcmV0KSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChyZXQsIHNjb3BlLCBpbml0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5U2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKSB7XG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xuICAgIHJldHVybiBpbml0XG4gICAgICA/IHZhbHVlXG4gICAgICA6IHRoaXMuY2FzdCh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHZhciB2ID0gdmFsdWVcbiAgICAsIHNldHRlcnMgPSB0aGlzLnNldHRlcnNcbiAgICAsIGxlbiA9IHNldHRlcnMubGVuZ3RoXG4gICAgLCBjYXN0ZXIgPSB0aGlzLmNhc3RlcjtcblxuICBpZiAoQXJyYXkuaXNBcnJheSh2KSAmJiBjYXN0ZXIgJiYgY2FzdGVyLnNldHRlcnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZbaV0gPSBjYXN0ZXIuYXBwbHlTZXR0ZXJzKHZbaV0sIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFsZW4pIHtcbiAgICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xuICAgIHJldHVybiB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHdoaWxlIChsZW4tLSkge1xuICAgIHYgPSBzZXR0ZXJzW2xlbl0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cblxuICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xuXG4gIC8vIGRvIG5vdCBjYXN0IHVudGlsIGFsbCBzZXR0ZXJzIGFyZSBhcHBsaWVkICM2NjVcbiAgdiA9IHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xuXG4gIHJldHVybiB2O1xufTtcblxuLyoqXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYSB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24oIHZhbHVlLCBzY29wZSApe1xuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkgcmV0dXJuIHZhbHVlO1xuXG4gIHZhciB2ID0gdmFsdWVcbiAgICAsIGdldHRlcnMgPSB0aGlzLmdldHRlcnNcbiAgICAsIGxlbiA9IGdldHRlcnMubGVuZ3RoO1xuXG4gIGlmICggIWxlbiApIHtcbiAgICByZXR1cm4gdjtcbiAgfVxuXG4gIHdoaWxlICggbGVuLS0gKSB7XG4gICAgdiA9IGdldHRlcnNbIGxlbiBdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIGEgdmFsaWRhdGlvbiBvZiBgdmFsdWVgIHVzaW5nIHRoZSB2YWxpZGF0b3JzIGRlY2xhcmVkIGZvciB0aGlzIFNjaGVtYVR5cGUuXG4gKlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hVHlwZS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSwgY2FsbGJhY2ssIHNjb3BlKSB7XG4gIHZhciBlcnIgPSBmYWxzZVxuICAgICwgcGF0aCA9IHRoaXMucGF0aFxuICAgICwgY291bnQgPSB0aGlzLnZhbGlkYXRvcnMubGVuZ3RoO1xuXG4gIGlmICghY291bnQpIHJldHVybiBjYWxsYmFjayhudWxsKTtcblxuICBmdW5jdGlvbiB2YWxpZGF0ZSAob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbCkge1xuICAgIGlmIChlcnIpIHJldHVybjtcbiAgICBpZiAob2sgPT09IHVuZGVmaW5lZCB8fCBvaykge1xuICAgICAgLS1jb3VudCB8fCBjYWxsYmFjayhudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soZXJyID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIG1lc3NhZ2UsIHR5cGUsIHZhbCkpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMudmFsaWRhdG9ycy5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgdmFyIHZhbGlkYXRvciA9IHZbMF1cbiAgICAgICwgbWVzc2FnZSA9IHZbMV1cbiAgICAgICwgdHlwZSA9IHZbMl07XG5cbiAgICBpZiAodmFsaWRhdG9yIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IudGVzdCh2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWxpZGF0b3IpIHtcbiAgICAgIGlmICgyID09PSB2YWxpZGF0b3IubGVuZ3RoKSB7XG4gICAgICAgIHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSwgZnVuY3Rpb24gKG9rKSB7XG4gICAgICAgICAgdmFsaWRhdGUob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IuY2FsbChzY29wZSwgdmFsdWUpLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB2YWx1ZSBpcyBhIHZhbGlkIFJlZmVyZW5jZS5cbiAqXG4gKiDQndCwINC60LvQuNC10L3RgtC1INCyINC60LDRh9C10YHRgtCy0LUg0YHRgdGL0LvQutC4INC80L7QttC90L4g0YXRgNCw0L3QuNGC0Ywg0LrQsNC6IGlkLCDRgtCw0Log0Lgg0L/QvtC70L3Ri9C1INC00L7QutGD0LzQtdC90YLRi1xuICpcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYVR5cGUuX2lzUmVmID0gZnVuY3Rpb24oIHNlbGYsIHZhbHVlICl7XG4gIC8vIGZhc3QgcGF0aFxuICB2YXIgcmVmID0gc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWY7XG5cbiAgaWYgKCByZWYgKSB7XG4gICAgaWYgKCBudWxsID09IHZhbHVlICkgcmV0dXJuIHRydWU7XG4gICAgaWYgKCBfLmlzT2JqZWN0KCB2YWx1ZSApICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYVR5cGU7XG5cblNjaGVtYVR5cGUuQ2FzdEVycm9yID0gQ2FzdEVycm9yO1xuXG5TY2hlbWFUeXBlLlZhbGlkYXRvckVycm9yID0gVmFsaWRhdG9yRXJyb3I7XG4iLCIvKiFcbiAqIFN0YXRlTWFjaGluZSByZXByZXNlbnRzIGEgbWluaW1hbCBgaW50ZXJmYWNlYCBmb3IgdGhlXG4gKiBjb25zdHJ1Y3RvcnMgaXQgYnVpbGRzIHZpYSBTdGF0ZU1hY2hpbmUuY3RvciguLi4pLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbnZhciBTdGF0ZU1hY2hpbmUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFN0YXRlTWFjaGluZSAoKSB7XG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdGF0ZXMgPSB7fTtcbn07XG5cbi8qIVxuICogU3RhdGVNYWNoaW5lLmN0b3IoJ3N0YXRlMScsICdzdGF0ZTInLCAuLi4pXG4gKiBBIGZhY3RvcnkgbWV0aG9kIGZvciBzdWJjbGFzc2luZyBTdGF0ZU1hY2hpbmUuXG4gKiBUaGUgYXJndW1lbnRzIGFyZSBhIGxpc3Qgb2Ygc3RhdGVzLiBGb3IgZWFjaCBzdGF0ZSxcbiAqIHRoZSBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZSBnZXRzIHN0YXRlIHRyYW5zaXRpb25cbiAqIG1ldGhvZHMgbmFtZWQgYWZ0ZXIgZWFjaCBzdGF0ZS4gVGhlc2UgdHJhbnNpdGlvbiBtZXRob2RzXG4gKiBwbGFjZSB0aGVpciBwYXRoIGFyZ3VtZW50IGludG8gdGhlIGdpdmVuIHN0YXRlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBzdWJjbGFzcyBjb25zdHJ1Y3RvclxuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUuY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpO1xuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24gKCkge1xuICAgIFN0YXRlTWFjaGluZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuc3RhdGVOYW1lcyA9IHN0YXRlcztcblxuICAgIHZhciBpID0gc3RhdGVzLmxlbmd0aFxuICAgICAgLCBzdGF0ZTtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHN0YXRlID0gc3RhdGVzW2ldO1xuICAgICAgdGhpcy5zdGF0ZXNbc3RhdGVdID0ge307XG4gICAgfVxuICB9O1xuXG4gIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RhdGVNYWNoaW5lLnByb3RvdHlwZSApO1xuICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG5cbiAgc3RhdGVzLmZvckVhY2goZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgLy8gQ2hhbmdlcyB0aGUgYHBhdGhgJ3Mgc3RhdGUgdG8gYHN0YXRlYC5cbiAgICBjdG9yLnByb3RvdHlwZVtzdGF0ZV0gPSBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUocGF0aCwgc3RhdGUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGN0b3I7XG59O1xuXG4vKiFcbiAqIFRoaXMgZnVuY3Rpb24gaXMgd3JhcHBlZCBieSB0aGUgc3RhdGUgY2hhbmdlIGZ1bmN0aW9uczpcbiAqXG4gKiAtIGByZXF1aXJlKHBhdGgpYFxuICogLSBgbW9kaWZ5KHBhdGgpYFxuICogLSBgaW5pdChwYXRoKWBcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLl9jaGFuZ2VTdGF0ZSA9IGZ1bmN0aW9uIF9jaGFuZ2VTdGF0ZSAocGF0aCwgbmV4dFN0YXRlKSB7XG4gIHZhciBwcmV2QnVja2V0ID0gdGhpcy5zdGF0ZXNbdGhpcy5wYXRoc1twYXRoXV07XG4gIGlmIChwcmV2QnVja2V0KSBkZWxldGUgcHJldkJ1Y2tldFtwYXRoXTtcblxuICB0aGlzLnBhdGhzW3BhdGhdID0gbmV4dFN0YXRlO1xuICB0aGlzLnN0YXRlc1tuZXh0U3RhdGVdW3BhdGhdID0gdHJ1ZTtcbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyIChzdGF0ZSkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc3RhdGVzW3N0YXRlXSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgcGF0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgcGF0aCA9IGtleXNbaV07XG4gICAgZGVsZXRlIHRoaXMuc3RhdGVzW3N0YXRlXVtwYXRoXTtcbiAgICBkZWxldGUgdGhpcy5wYXRoc1twYXRoXTtcbiAgfVxufTtcblxuLyohXG4gKiBDaGVja3MgdG8gc2VlIGlmIGF0IGxlYXN0IG9uZSBwYXRoIGlzIGluIHRoZSBzdGF0ZXMgcGFzc2VkIGluIHZpYSBgYXJndW1lbnRzYFxuICogZS5nLiwgdGhpcy5zb21lKCdyZXF1aXJlZCcsICdpbml0ZWQnKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZSB0aGF0IHdlIHdhbnQgdG8gY2hlY2sgZm9yLlxuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLnNvbWUgPSBmdW5jdGlvbiBzb21lICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgd2hhdCA9IGFyZ3VtZW50cy5sZW5ndGggPyBhcmd1bWVudHMgOiB0aGlzLnN0YXRlTmFtZXM7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc29tZS5jYWxsKHdoYXQsIGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzZWxmLnN0YXRlc1tzdGF0ZV0pLmxlbmd0aDtcbiAgfSk7XG59O1xuXG4vKiFcbiAqIFRoaXMgZnVuY3Rpb24gYnVpbGRzIHRoZSBmdW5jdGlvbnMgdGhhdCBnZXQgYXNzaWduZWQgdG8gYGZvckVhY2hgIGFuZCBgbWFwYCxcbiAqIHNpbmNlIGJvdGggb2YgdGhvc2UgbWV0aG9kcyBzaGFyZSBhIGxvdCBvZiB0aGUgc2FtZSBsb2dpYy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaXRlck1ldGhvZCBpcyBlaXRoZXIgJ2ZvckVhY2gnIG9yICdtYXAnXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2l0ZXIgPSBmdW5jdGlvbiBfaXRlciAoaXRlck1ldGhvZCkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBudW1BcmdzID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgLCBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgwLCBudW1BcmdzLTEpXG4gICAgICAsIGNhbGxiYWNrID0gYXJndW1lbnRzW251bUFyZ3MtMV07XG5cbiAgICBpZiAoIXN0YXRlcy5sZW5ndGgpIHN0YXRlcyA9IHRoaXMuc3RhdGVOYW1lcztcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBwYXRocyA9IHN0YXRlcy5yZWR1Y2UoZnVuY3Rpb24gKHBhdGhzLCBzdGF0ZSkge1xuICAgICAgcmV0dXJuIHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyhzZWxmLnN0YXRlc1tzdGF0ZV0pKTtcbiAgICB9LCBbXSk7XG5cbiAgICByZXR1cm4gcGF0aHNbaXRlck1ldGhvZF0oZnVuY3Rpb24gKHBhdGgsIGksIHBhdGhzKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2socGF0aCwgaSwgcGF0aHMpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyohXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHByb2ZpbGUgY2FuIGxvb2sgbGlrZTpcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXG4gKiB0aGlzLmZvckVhY2goZm4pOyAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gYWxsIHN0YXRlc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaCAoKSB7XG4gIHRoaXMuZm9yRWFjaCA9IHRoaXMuX2l0ZXIoJ2ZvckVhY2gnKTtcbiAgcmV0dXJuIHRoaXMuZm9yRWFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyohXG4gKiBNYXBzIG92ZXIgdGhlIHBhdGhzIHRoYXQgYmVsb25nIHRvIG9uZSBvZiB0aGUgcGFyYW1ldGVyIHN0YXRlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgZm4pOyAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMVxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHJldHVybiB7QXJyYXl9XG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwICgpIHtcbiAgdGhpcy5tYXAgPSB0aGlzLl9pdGVyKCdtYXAnKTtcbiAgcmV0dXJuIHRoaXMubWFwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4iLCIvL1RPRE86INC/0L7Rh9C40YHRgtC40YLRjCDQutC+0LRcblxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFbWJlZGRlZERvY3VtZW50ID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcbnZhciBPYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogU3RvcmFnZSBBcnJheSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSwgb3RoZXJ3aXNlIGBTdG9yYWdlQXJyYXkjcHVzaGAgd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZC5fXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKiBAaW5oZXJpdHMgQXJyYXlcbiAqIEBzZWUgaHR0cDovL2JpdC5seS9mNkNuWlVcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUFycmF5ICh2YWx1ZXMsIHBhdGgsIGRvYykge1xuICB2YXIgYXJyID0gW107XG4gIGFyci5wdXNoLmFwcGx5KGFyciwgdmFsdWVzKTtcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlQXJyYXkubWl4aW4gKTtcblxuICBhcnIudmFsaWRhdG9ycyA9IFtdO1xuICBhcnIuX3BhdGggPSBwYXRoO1xuICBhcnIuaXNTdG9yYWdlQXJyYXkgPSB0cnVlO1xuXG4gIGlmIChkb2MpIHtcbiAgICBhcnIuX3BhcmVudCA9IGRvYztcbiAgICBhcnIuX3NjaGVtYSA9IGRvYy5zY2hlbWEucGF0aChwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBhcnI7XG59XG5cblN0b3JhZ2VBcnJheS5taXhpbiA9IHtcbiAgLyoqXG4gICAqIFBhcmVudCBvd25lciBkb2N1bWVudFxuICAgKlxuICAgKiBAcHJvcGVydHkgX3BhcmVudFxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIF9wYXJlbnQ6IHVuZGVmaW5lZCxcblxuICAvKipcbiAgICogQ2FzdHMgYSBtZW1iZXIgYmFzZWQgb24gdGhpcyBhcnJheXMgc2NoZW1hLlxuICAgKlxuICAgKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAgICogQHJldHVybiB2YWx1ZSB0aGUgY2FzdGVkIHZhbHVlXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgX2Nhc3Q6IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gICAgdmFyIG93bmVyID0gdGhpcy5fb3duZXI7XG4gICAgdmFyIHBvcHVsYXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgLy8gaWYgYSBwb3B1bGF0ZWQgYXJyYXksIHdlIG11c3QgY2FzdCB0byB0aGUgc2FtZSBtb2RlbFxuICAgICAgLy8gaW5zdGFuY2UgYXMgc3BlY2lmaWVkIGluIHRoZSBvcmlnaW5hbCBxdWVyeS5cbiAgICAgIGlmICghb3duZXIpIHtcbiAgICAgICAgb3duZXIgPSB0aGlzLl9vd25lciA9IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50XG4gICAgICAgICAgPyB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudCgpXG4gICAgICAgICAgOiB0aGlzLl9wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHBvcHVsYXRlZCA9IG93bmVyLnBvcHVsYXRlZCh0aGlzLl9wYXRoLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAocG9wdWxhdGVkICYmIG51bGwgIT0gdmFsdWUpIHtcbiAgICAgIC8vIGNhc3QgdG8gdGhlIHBvcHVsYXRlZCBNb2RlbHMgc2NoZW1hXG4gICAgICB2YXIgTW9kZWwgPSBwb3B1bGF0ZWQub3B0aW9ucy5tb2RlbDtcblxuICAgICAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAgICAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxuICAgICAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcbiAgICAgICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBuZXcgTW9kZWwodmFsdWUpO1xuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9zY2hlbWEuY2FzdGVyLmNhc3QodmFsdWUsIHRoaXMuX3BhcmVudCwgZmFsc2UpXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1hcmtzIHRoaXMgYXJyYXkgYXMgbW9kaWZpZWQuXG4gICAqXG4gICAqIElmIGl0IGJ1YmJsZXMgdXAgZnJvbSBhbiBlbWJlZGRlZCBkb2N1bWVudCBjaGFuZ2UsIHRoZW4gaXQgdGFrZXMgdGhlIGZvbGxvd2luZyBhcmd1bWVudHMgKG90aGVyd2lzZSwgdGFrZXMgMCBhcmd1bWVudHMpXG4gICAqXG4gICAqIEBwYXJhbSB7RW1iZWRkZWREb2N1bWVudH0gZW1iZWRkZWREb2MgdGhlIGVtYmVkZGVkIGRvYyB0aGF0IGludm9rZWQgdGhpcyBtZXRob2Qgb24gdGhlIEFycmF5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbWJlZGRlZFBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZCBpbiB0aGUgZW1iZWRkZWREb2NcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBfbWFya01vZGlmaWVkOiBmdW5jdGlvbiAoZWxlbSwgZW1iZWRkZWRQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuX3BhcmVudFxuICAgICAgLCBkaXJ0eVBhdGg7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBkaXJ0eVBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBpZiAobnVsbCAhPSBlbWJlZGRlZFBhdGgpIHtcbiAgICAgICAgICAvLyBhbiBlbWJlZGRlZCBkb2MgYnViYmxlZCB1cCB0aGUgY2hhbmdlXG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgdGhpcy5pbmRleE9mKGVsZW0pICsgJy4nICsgZW1iZWRkZWRQYXRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGRpcmVjdGx5IHNldCBhbiBpbmRleFxuICAgICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIGVsZW07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGFyZW50Lm1hcmtNb2RpZmllZChkaXJ0eVBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3B1c2hgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wdXNoKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbYXJncy4uLl1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHB1c2g6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxuICAgICAgLCByZXQgPSBbXS5wdXNoLmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3BvcGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3BvcCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBzZWUgU3RvcmFnZUFycmF5IyRwb3AgI3R5cGVzX2FycmF5X01vbmdvb3NlQXJyYXktJTI0cG9wXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwb3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10ucG9wLmNhbGwodGhpcyk7XG5cbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NoaWZ0YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvdW5zaGlmdCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIGRvYy5hcnJheSA9IFsyLDNdO1xuICAgKiAgICAgdmFyIHJlcyA9IGRvYy5hcnJheS5zaGlmdCgpO1xuICAgKiAgICAgY29uc29sZS5sb2cocmVzKSAvLyAyXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFszXVxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc2hpZnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0gW10uc2hpZnQuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFB1bGxzIGl0ZW1zIGZyb20gdGhlIGFycmF5IGF0b21pY2FsbHkuXG4gICAqXG4gICAqICMjIyNFeGFtcGxlczpcbiAgICpcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKE9iamVjdElkKVxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoeyBfaWQ6ICdzb21lSWQnIH0pXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCgzNilcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKCd0YWcgMScsICd0YWcgMicpXG4gICAqXG4gICAqIFRvIHJlbW92ZSBhIGRvY3VtZW50IGZyb20gYSBzdWJkb2N1bWVudCBhcnJheSB3ZSBtYXkgcGFzcyBhbiBvYmplY3Qgd2l0aCBhIG1hdGNoaW5nIGBfaWRgLlxuICAgKlxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVzaCh7IF9pZDogNDgxNTE2MjM0MiB9KVxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCh7IF9pZDogNDgxNTE2MjM0MiB9KSAvLyByZW1vdmVkXG4gICAqXG4gICAqIE9yIHdlIG1heSBwYXNzaW5nIHRoZSBfaWQgZGlyZWN0bHkgYW5kIGxldCBtb25nb29zZSB0YWtlIGNhcmUgb2YgaXQuXG4gICAqXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gICAqICAgICBkb2Muc3ViZG9jcy5wdWxsKDQ4MTUxNjIzNDIpOyAvLyB3b3Jrc1xuICAgKlxuICAgKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gICAqIEBzZWUgbW9uZ29kYiBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZy8jVXBkYXRpbmctJTI0cHVsbFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgcHVsbDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgICAsIGN1ciA9IHRoaXMuX3BhcmVudC5nZXQodGhpcy5fcGF0aClcbiAgICAgICwgaSA9IGN1ci5sZW5ndGhcbiAgICAgICwgbWVtO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgbWVtID0gY3VyW2ldO1xuICAgICAgaWYgKG1lbSBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jdW1lbnQpIHtcbiAgICAgICAgaWYgKHZhbHVlcy5zb21lKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2LmVxdWFscyhtZW0pOyB9ICkpIHtcbiAgICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKH5jdXIuaW5kZXhPZi5jYWxsKHZhbHVlcywgbWVtKSkge1xuICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NwbGljZWBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NwbGljZSkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nIGFuZCBjYXN0aW5nLlxuICAgKlxuICAgKiAjIyMjTm90ZTpcbiAgICpcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKCkge1xuICAgIHZhciByZXQsIHZhbHMsIGk7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdmFscyA9IFtdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YWxzW2ldID0gaSA8IDJcbiAgICAgICAgICA/IGFyZ3VtZW50c1tpXVxuICAgICAgICAgIDogdGhpcy5fY2FzdChhcmd1bWVudHNbaV0pO1xuICAgICAgfVxuICAgICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xuXG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOb3RlOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICB1bnNoaWZ0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XG4gICAgW10udW5zaGlmdC5hcHBseSh0aGlzLCB2YWx1ZXMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXcmFwcyBbYEFycmF5I3NvcnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zb3J0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gICAqXG4gICAqICMjIyNOT1RFOlxuICAgKlxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBzb3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJldCA9IFtdLnNvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgdmFsdWVzIHRvIHRoZSBhcnJheSBpZiBub3QgYWxyZWFkeSBwcmVzZW50LlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICAgKiAgICAgdmFyIGFkZGVkID0gZG9jLmFycmF5LmFkZFRvU2V0KDQsNSk7XG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNCw1XVxuICAgKiAgICAgY29uc29sZS5sb2coYWRkZWQpICAgICAvLyBbNV1cbiAgICpcbiAgICogQHBhcmFtIHthbnl9IFthcmdzLi4uXVxuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhlIHZhbHVlcyB0aGF0IHdlcmUgYWRkZWRcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGFkZFRvU2V0OiBmdW5jdGlvbiBhZGRUb1NldCAoKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAgICwgYWRkZWQgPSBbXVxuICAgICAgLCB0eXBlID0gdmFsdWVzWzBdIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCA/ICdkb2MnIDpcbiAgICAgICAgICAgICAgIHZhbHVlc1swXSBpbnN0YW5jZW9mIERhdGUgPyAnZGF0ZScgOlxuICAgICAgICAgICAgICAgJyc7XG5cbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGZvdW5kO1xuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2RvYyc6XG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZG9jKXsgcmV0dXJuIGRvYy5lcXVhbHModikgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgIHZhciB2YWwgPSArdjtcbiAgICAgICAgICBmb3VuZCA9IHRoaXMuc29tZShmdW5jdGlvbihkKXsgcmV0dXJuICtkID09PSB2YWwgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgZm91bmQgPSB+dGhpcy5pbmRleE9mKHYpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIFtdLnB1c2guY2FsbCh0aGlzLCB2KTtcblxuICAgICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICAgICAgW10ucHVzaC5jYWxsKGFkZGVkLCB2KTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIHJldHVybiBhZGRlZDtcbiAgfSxcblxuICAvKipcbiAgICogU2V0cyB0aGUgY2FzdGVkIGB2YWxgIGF0IGluZGV4IGBpYCBhbmQgbWFya3MgdGhlIGFycmF5IG1vZGlmaWVkLlxuICAgKlxuICAgKiAjIyMjRXhhbXBsZTpcbiAgICpcbiAgICogICAgIC8vIGdpdmVuIGRvY3VtZW50cyBiYXNlZCBvbiB0aGUgZm9sbG93aW5nXG4gICAqICAgICB2YXIgRG9jID0gbW9uZ29vc2UubW9kZWwoJ0RvYycsIG5ldyBTY2hlbWEoeyBhcnJheTogW051bWJlcl0gfSkpO1xuICAgKlxuICAgKiAgICAgdmFyIGRvYyA9IG5ldyBEb2MoeyBhcnJheTogWzIsMyw0XSB9KVxuICAgKlxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXG4gICAqXG4gICAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KTsgLy8gWzIsNSw0XSAvLyBwcm9wZXJseSBjYXN0IHRvIG51bWJlclxuICAgKiAgICAgZG9jLnNhdmUoKSAvLyB0aGUgY2hhbmdlIGlzIHNhdmVkXG4gICAqXG4gICAqICAgICAvLyBWUyBub3QgdXNpbmcgYXJyYXkjc2V0XG4gICAqICAgICBkb2MuYXJyYXlbMV0gPSBcIjVcIjtcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlIGlzIG5vdCBzYXZlZFxuICAgKlxuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgc2V0OiBmdW5jdGlvbiAoaSwgdmFsKSB7XG4gICAgdGhpc1tpXSA9IHRoaXMuX2Nhc3QodmFsKTtcbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoaSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge0FycmF5fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9PYmplY3Q6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXR1cm4gZG9jIGluc3RhbmNlb2YgRG9jdW1lbnRcbiAgICAgICAgICA/IGRvYy50b09iamVjdChvcHRpb25zKVxuICAgICAgICAgIDogZG9jXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zbGljZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGluZGV4IG9mIGBvYmpgIG9yIGAtMWAgaWYgbm90IGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBpdGVtIHRvIGxvb2sgZm9yXG4gICAqIEByZXR1cm4ge051bWJlcn1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGluZGV4T2Y6IGZ1bmN0aW9uIGluZGV4T2YgKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBPYmplY3RJZCkgb2JqID0gb2JqLnRvU3RyaW5nKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGlmIChvYmogPT0gdGhpc1tpXSlcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufTtcblxuLyoqXG4gKiBBbGlhcyBvZiBbcHVsbF0oI3R5cGVzX2FycmF5X01vbmdvb3NlQXJyYXktcHVsbClcbiAqXG4gKiBAc2VlIFN0b3JhZ2VBcnJheSNwdWxsICN0eXBlc19hcnJheV9Nb25nb29zZUFycmF5LXB1bGxcbiAqIEBzZWUgbW9uZ29kYiBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZy8jVXBkYXRpbmctJTI0cHVsbFxuICogQGFwaSBwdWJsaWNcbiAqIEBtZW1iZXJPZiBTdG9yYWdlQXJyYXlcbiAqIEBtZXRob2QgcmVtb3ZlXG4gKi9cblN0b3JhZ2VBcnJheS5taXhpbi5yZW1vdmUgPSBTdG9yYWdlQXJyYXkubWl4aW4ucHVsbDtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJylcbiAgLCBPYmplY3RJZFNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYS9vYmplY3RpZCcpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xuXG4vKipcbiAqIERvY3VtZW50QXJyYXkgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIHRoaXMgYXJyYXlcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHJldHVybiB7U3RvcmFnZURvY3VtZW50QXJyYXl9XG4gKiBAaW5oZXJpdHMgU3RvcmFnZUFycmF5XG4gKiBAc2VlIGh0dHA6Ly9iaXQubHkvZjZDblpVXG4gKiBUT0RPOiDQv9C+0LTRh9C40YHRgtC40YLRjCDQutC+0LRcbiAqXG4gKiDQktC10YHRjCDQvdGD0LbQvdGL0Lkg0LrQvtC0INGB0LrQvtC/0LjRgNC+0LLQsNC9XG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VEb2N1bWVudEFycmF5ICh2YWx1ZXMsIHBhdGgsIGRvYykge1xuICB2YXIgYXJyID0gW107XG5cbiAgLy8gVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSwgc2luY2VcbiAgLy8gb3RoZXJ3aXNlIFN0b3JhZ2VBcnJheSNwdXNoIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQgdG8gdGhlIHBhcmVudC5cbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xuICBfLm1peGluKCBhcnIsIFN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluICk7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcbiAgYXJyLmlzU3RvcmFnZUFycmF5ID0gdHJ1ZTtcbiAgYXJyLmlzU3RvcmFnZURvY3VtZW50QXJyYXkgPSB0cnVlO1xuXG4gIGlmIChkb2MpIHtcbiAgICBhcnIuX3BhcmVudCA9IGRvYztcbiAgICBhcnIuX3NjaGVtYSA9IGRvYy5zY2hlbWEucGF0aChwYXRoKTtcbiAgICBhcnIuX2hhbmRsZXJzID0ge1xuICAgICAgaXNOZXc6IGFyci5ub3RpZnkoJ2lzTmV3JyksXG4gICAgICBzYXZlOiBhcnIubm90aWZ5KCdzYXZlJylcbiAgICB9O1xuXG4gICAgLy8g0J/RgNC+0LHRgNC+0YEg0LjQt9C80LXQvdC10L3QuNGPINGB0L7RgdGC0L7Rj9C90LjRjyDQsiDQv9C+0LTQtNC+0LrRg9C80LXQvdGCXG4gICAgZG9jLm9uKCdzYXZlJywgYXJyLl9oYW5kbGVycy5zYXZlKTtcbiAgICBkb2Mub24oJ2lzTmV3JywgYXJyLl9oYW5kbGVycy5pc05ldyk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUFycmF5XG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUFycmF5Lm1peGluICk7XG5cbi8qKlxuICogT3ZlcnJpZGVzIFN0b3JhZ2VBcnJheSNjYXN0XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLl9jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3Rvcikge1xuICAgIGlmICghKHZhbHVlLl9fcGFyZW50ICYmIHZhbHVlLl9fcGFyZW50QXJyYXkpKSB7XG4gICAgICAvLyB2YWx1ZSBtYXkgaGF2ZSBiZWVuIGNyZWF0ZWQgdXNpbmcgYXJyYXkuY3JlYXRlKClcbiAgICAgIHZhbHVlLl9fcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgICAgdmFsdWUuX19wYXJlbnRBcnJheSA9IHRoaXM7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8vIGhhbmRsZSBjYXN0KCdzdHJpbmcnKSBvciBjYXN0KE9iamVjdElkKSBldGMuXG4gIC8vIG9ubHkgb2JqZWN0cyBhcmUgcGVybWl0dGVkIHNvIHdlIGNhbiBzYWZlbHkgYXNzdW1lIHRoYXRcbiAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxuICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgIHZhbHVlID0geyBfaWQ6IHZhbHVlIH07XG4gIH1cblxuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNlYXJjaGVzIGFycmF5IGl0ZW1zIGZvciB0aGUgZmlyc3QgZG9jdW1lbnQgd2l0aCBhIG1hdGNoaW5nIF9pZC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIGVtYmVkZGVkRG9jID0gbS5hcnJheS5pZChzb21lX2lkKTtcbiAqXG4gKiBAcmV0dXJuIHtFbWJlZGRlZERvY3VtZW50fG51bGx9IHRoZSBzdWJkb2N1bWVudCBvciBudWxsIGlmIG5vdCBmb3VuZC5cbiAqIEBwYXJhbSB7T2JqZWN0SWR8U3RyaW5nfE51bWJlcn0gaWRcbiAqIEBUT0RPIGNhc3QgdG8gdGhlIF9pZCBiYXNlZCBvbiBzY2hlbWEgZm9yIHByb3BlciBjb21wYXJpc29uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5pZCA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgY2FzdGVkXG4gICAgLCBzaWRcbiAgICAsIF9pZDtcblxuICB0cnkge1xuICAgIHZhciBjYXN0ZWRfID0gT2JqZWN0SWRTY2hlbWEucHJvdG90eXBlLmNhc3QuY2FsbCh7fSwgaWQpO1xuICAgIGlmIChjYXN0ZWRfKSBjYXN0ZWQgPSBTdHJpbmcoY2FzdGVkXyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYXN0ZWQgPSBudWxsO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIF9pZCA9IHRoaXNbaV0uZ2V0KCdfaWQnKTtcblxuICAgIGlmIChfaWQgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkLl9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmICghKF9pZCBpbnN0YW5jZW9mIE9iamVjdElkKSkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkKSByZXR1cm4gdGhpc1tpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3RlZCA9PSBfaWQpIHtcbiAgICAgIHJldHVybiB0aGlzW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5IG9mIHBsYWluIGpzIG9iamVjdHNcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfRWFjaCBzdWItZG9jdW1lbnQgaXMgY29udmVydGVkIHRvIGEgcGxhaW4gb2JqZWN0IGJ5IGNhbGxpbmcgaXRzIGAjdG9PYmplY3RgIG1ldGhvZC5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbCBvcHRpb25zIHRvIHBhc3MgdG8gZWFjaCBkb2N1bWVudHMgYHRvT2JqZWN0YCBtZXRob2QgY2FsbCBkdXJpbmcgY29udmVyc2lvblxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChkb2MpIHtcbiAgICByZXR1cm4gZG9jICYmIGRvYy50b09iamVjdChvcHRpb25zKSB8fCBudWxsO1xuICB9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN1YmRvY3VtZW50IGNhc3RlZCB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzYW1lIHN1YmRvY3VtZW50IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGNhc3RpbmcuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgdmFsdWUgdG8gY2FzdCB0byB0aGlzIGFycmF5cyBTdWJEb2N1bWVudCBzY2hlbWFcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uY3JlYXRlID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3RvcihvYmopO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZm4gdGhhdCBub3RpZmllcyBhbGwgY2hpbGQgZG9jcyBvZiBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4ubm90aWZ5ID0gZnVuY3Rpb24gbm90aWZ5IChldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiBub3RpZnkgKHZhbCkge1xuICAgIHZhciBpID0gc2VsZi5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKCFzZWxmW2ldKSBjb250aW51ZTtcbiAgICAgIHNlbGZbaV0udHJpZ2dlcihldmVudCwgdmFsKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRG9jdW1lbnRBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xuXG4vKipcbiAqIEVtYmVkZGVkRG9jdW1lbnQgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEganMgb2JqZWN0IHJldHVybmVkIGZyb20gdGhlIGRiXG4gKiBAcGFyYW0ge01vbmdvb3NlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIERvY3VtZW50LnByb3RvdHlwZSApO1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWJlZGRlZERvY3VtZW50O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBlbWJlZGRlZCBkb2MgbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBkb2MgPSBibG9ncG9zdC5jb21tZW50cy5pZChoZXhzdHJpbmcpO1xuICogICAgIGRvYy5taXhlZC50eXBlID0gJ2NoYW5nZWQnO1xuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB3aGljaCBjaGFuZ2VkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcblxuICBpZiAodGhpcy5pc05ldykge1xuICAgIC8vIE1hcmsgdGhlIFdIT0xFIHBhcmVudCBhcnJheSBhcyBtb2RpZmllZFxuICAgIC8vIGlmIHRoaXMgaXMgYSBuZXcgZG9jdW1lbnQgKGkuZS4sIHdlIGFyZSBpbml0aWFsaXppbmdcbiAgICAvLyBhIGRvY3VtZW50KSxcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCgpO1xuICB9IGVsc2VcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCh0aGlzLCBwYXRoKTtcbn07XG5cbi8qKlxuICogVXNlZCBhcyBhIHN0dWIgZm9yIFtob29rcy5qc10oaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjMylcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfVGhpcyBpcyBhIG5vLW9wLiBEb2VzIG5vdCBhY3R1YWxseSBzYXZlIHRoZSBkb2MgdG8gdGhlIGRiLl9cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlZCBQcm9taXNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBwcm9taXNlID0gJC5EZWZlcnJlZCgpLmRvbmUoZm4pO1xuICBwcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc3ViZG9jdW1lbnQgZnJvbSBpdHMgcGFyZW50IGFycmF5LlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAoIXRoaXMuX19wYXJlbnRBcnJheSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIF9pZDtcbiAgaWYgKCF0aGlzLndpbGxSZW1vdmUpIHtcbiAgICBfaWQgPSB0aGlzLl9kb2MuX2lkO1xuICAgIGlmICghX2lkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvciB5b3VyIG93biBnb29kLCBNb25nb29zZSBkb2VzIG5vdCBrbm93ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdob3cgdG8gcmVtb3ZlIGFuIEVtYmVkZGVkRG9jdW1lbnQgdGhhdCBoYXMgbm8gX2lkJyk7XG4gICAgfVxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5wdWxsKHsgX2lkOiBfaWQgfSk7XG4gICAgdGhpcy53aWxsUmVtb3ZlID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChmbilcbiAgICBmbihudWxsKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgI3VwZGF0ZSBtZXRob2Qgb2YgcGFyZW50IGRvY3VtZW50cy5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRocm93IG5ldyBFcnJvcignVGhlICN1cGRhdGUgbWV0aG9kIGlzIG5vdCBhdmFpbGFibGUgb24gRW1iZWRkZWREb2N1bWVudHMnKTtcbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBmaWVsZCB0byBpbnZhbGlkYXRlXG4gKiBAcGFyYW0ge1N0cmluZ3xFcnJvcn0gZXJyIGVycm9yIHdoaWNoIHN0YXRlcyB0aGUgcmVhc29uIGBwYXRoYCB3YXMgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyLCB2YWwsIGZpcnN0KSB7XG4gIGlmICghdGhpcy5fX3BhcmVudCkge1xuICAgIHZhciBtc2cgPSAnVW5hYmxlIHRvIGludmFsaWRhdGUgYSBzdWJkb2N1bWVudCB0aGF0IGhhcyBub3QgYmVlbiBhZGRlZCB0byBhbiBhcnJheS4nXG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gIH1cblxuICB2YXIgaW5kZXggPSB0aGlzLl9fcGFyZW50QXJyYXkuaW5kZXhPZih0aGlzKTtcbiAgdmFyIHBhcmVudFBhdGggPSB0aGlzLl9fcGFyZW50QXJyYXkuX3BhdGg7XG4gIHZhciBmdWxsUGF0aCA9IFtwYXJlbnRQYXRoLCBpbmRleCwgcGF0aF0uam9pbignLicpO1xuXG4gIC8vIHNuaWZmaW5nIGFyZ3VtZW50czpcbiAgLy8gbmVlZCB0byBjaGVjayBpZiB1c2VyIHBhc3NlZCBhIHZhbHVlIHRvIGtlZXBcbiAgLy8gb3VyIGVycm9yIG1lc3NhZ2UgY2xlYW4uXG4gIGlmICgyIDwgYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX19wYXJlbnQuaW52YWxpZGF0ZShmdWxsUGF0aCwgZXJyLCB2YWwpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX19wYXJlbnQuaW52YWxpZGF0ZShmdWxsUGF0aCwgZXJyKTtcbiAgfVxuXG4gIGlmIChmaXJzdClcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSB0aGlzLm93bmVyRG9jdW1lbnQoKS4kX18udmFsaWRhdGlvbkVycm9yO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdG9wIGxldmVsIGRvY3VtZW50IG9mIHRoaXMgc3ViLWRvY3VtZW50LlxuICpcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5vd25lckRvY3VtZW50ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xuICAgIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50O1xuICB9XG5cbiAgdmFyIHBhcmVudCA9IHRoaXMuX19wYXJlbnQ7XG4gIGlmICghcGFyZW50KSByZXR1cm4gdGhpcztcblxuICB3aGlsZSAocGFyZW50Ll9fcGFyZW50KSB7XG4gICAgcGFyZW50ID0gcGFyZW50Ll9fcGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LiBJZiBvcHRpb25hbCBgcGF0aGAgaXMgcGFzc2VkLCBpdCBpcyBhcHBlbmRlZCB0byB0aGUgZnVsbCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIEVtYmVkZGVkRG9jdW1lbnRcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICBpZiAoIXRoaXMuJF9fLmZ1bGxQYXRoKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgaWYgKCFwYXJlbnQuX19wYXJlbnQpIHJldHVybiBwYXRoO1xuXG4gICAgdmFyIHBhdGhzID0gW107XG4gICAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgICAgcGF0aHMudW5zaGlmdChwYXJlbnQuX19wYXJlbnRBcnJheS5fcGF0aCk7XG4gICAgICBwYXJlbnQgPSBwYXJlbnQuX19wYXJlbnQ7XG4gICAgfVxuXG4gICAgdGhpcy4kX18uZnVsbFBhdGggPSBwYXRocy5qb2luKCcuJyk7XG5cbiAgICBpZiAoIXRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICAgIC8vIG9wdGltaXphdGlvblxuICAgICAgdGhpcy4kX18ub3duZXJEb2N1bWVudCA9IHBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGF0aFxuICAgID8gdGhpcy4kX18uZnVsbFBhdGggKyAnLicgKyBwYXRoXG4gICAgOiB0aGlzLiRfXy5mdWxsUGF0aDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGRvY3VtZW50LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnRBcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX19wYXJlbnRBcnJheTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWJlZGRlZERvY3VtZW50O1xuIiwiXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbmV4cG9ydHMuQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5cbmV4cG9ydHMuRW1iZWRkZWQgPSByZXF1aXJlKCcuL2VtYmVkZGVkJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKiBAaWdub3JlXG4gKi9cbnZhciBCaW5hcnlQYXJzZXIgPSByZXF1aXJlKCcuLi9iaW5hcnlfcGFyc2VyJykuQmluYXJ5UGFyc2VyO1xuXG4vKipcbiAqIE1hY2hpbmUgaWQuXG4gKlxuICogQ3JlYXRlIGEgcmFuZG9tIDMtYnl0ZSB2YWx1ZSAoaS5lLiB1bmlxdWUgZm9yIHRoaXNcbiAqIHByb2Nlc3MpLiBPdGhlciBkcml2ZXJzIHVzZSBhIG1kNSBvZiB0aGUgbWFjaGluZSBpZCBoZXJlLCBidXRcbiAqIHRoYXQgd291bGQgbWVhbiBhbiBhc3ljIGNhbGwgdG8gZ2V0aG9zdG5hbWUsIHNvIHdlIGRvbid0IGJvdGhlci5cbiAqIEBpZ25vcmVcbiAqL1xudmFyIE1BQ0hJTkVfSUQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIHRoYXQgY2hlY2tzIGZvciBoZXggdmFsdWVcbnZhciBjaGVja0ZvckhleFJlZ0V4cCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgT2JqZWN0SWQgaW5zdGFuY2VcbiAqXG4gKiBAY2xhc3MgUmVwcmVzZW50cyBhIEJTT04gT2JqZWN0SWQgdHlwZS5cbiAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcsIDEyIGJ5dGUgYmluYXJ5IHN0cmluZyBvciBhIE51bWJlci5cbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBnZW5lcmF0aW9uVGltZSBUaGUgZ2VuZXJhdGlvbiB0aW1lIG9mIHRoaXMgT2JqZWN0SWQgaW5zdGFuY2VcbiAqIEByZXR1cm4ge09iamVjdElkfSBpbnN0YW5jZSBvZiBPYmplY3RJZC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SWQoaWQpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gbmV3IE9iamVjdElkKGlkKTtcbiAgaWYoKGlkIGluc3RhbmNlb2YgT2JqZWN0SWQpKSByZXR1cm4gaWQ7XG5cbiAgdGhpcy5fYnNvbnR5cGUgPSAnT2JqZWN0SWQnO1xuICB2YXIgX19pZCA9IG51bGw7XG4gIHZhciB2YWxpZCA9IE9iamVjdElkLmlzVmFsaWQoaWQpO1xuXG4gIC8vIFRocm93IGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgdmFsaWQgc2V0dXBcbiAgaWYoIXZhbGlkICYmIGlkICE9IG51bGwpe1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcbiAgfSBlbHNlIGlmKHZhbGlkICYmIHR5cGVvZiBpZCA9PSAnc3RyaW5nJyAmJiBpZC5sZW5ndGggPT0gMjQpIHtcbiAgICByZXR1cm4gT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyhpZCk7XG4gIH0gZWxzZSBpZihpZCA9PSBudWxsIHx8IHR5cGVvZiBpZCA9PSAnbnVtYmVyJykge1xuICAgIC8vIGNvbnZlcnQgdG8gMTIgYnl0ZSBiaW5hcnkgc3RyaW5nXG4gICAgdGhpcy5pZCA9IHRoaXMuZ2VuZXJhdGUoaWQpO1xuICB9IGVsc2UgaWYoaWQgIT0gbnVsbCAmJiBpZC5sZW5ndGggPT09IDEyKSB7XG4gICAgLy8gYXNzdW1lIDEyIGJ5dGUgc3RyaW5nXG4gICAgdGhpcy5pZCA9IGlkO1xuICB9XG5cbiAgaWYoT2JqZWN0SWQuY2FjaGVIZXhTdHJpbmcpIHRoaXMuX19pZCA9IHRoaXMudG9IZXhTdHJpbmcoKTtcbn1cblxuLy8gUHJlY29tcHV0ZWQgaGV4IHRhYmxlIGVuYWJsZXMgc3BlZWR5IGhleCBzdHJpbmcgY29udmVyc2lvblxudmFyIGhleFRhYmxlID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7XG4gIGhleFRhYmxlW2ldID0gKGkgPD0gMTUgPyAnMCcgOiAnJykgKyBpLnRvU3RyaW5nKDE2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIE9iamVjdElkIGlkIGFzIGEgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7c3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSGV4U3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIGlmKE9iamVjdElkLmNhY2hlSGV4U3RyaW5nICYmIHRoaXMuX19pZCkgcmV0dXJuIHRoaXMuX19pZDtcblxuICB2YXIgaGV4U3RyaW5nID0gJyc7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgaGV4U3RyaW5nICs9IGhleFRhYmxlW3RoaXMuaWQuY2hhckNvZGVBdChpKV07XG4gIH1cblxuICBpZihPYmplY3RJZC5jYWNoZUhleFN0cmluZykgdGhpcy5fX2lkID0gaGV4U3RyaW5nO1xuICByZXR1cm4gaGV4U3RyaW5nO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIE9iamVjdElkIGluZGV4IHVzZWQgaW4gZ2VuZXJhdGluZyBuZXcgT2JqZWN0SWQncyBvbiB0aGUgZHJpdmVyXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7bnVtYmVyfSByZXR1cm5zIG5leHQgaW5kZXggdmFsdWUuXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLnByb3RvdHlwZS5nZXRfaW5jID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3RJZC5pbmRleCA9IChPYmplY3RJZC5pbmRleCArIDEpICUgMHhGRkZGRkY7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgT2JqZWN0SWQgaW5kZXggdXNlZCBpbiBnZW5lcmF0aW5nIG5ldyBPYmplY3RJZCdzIG9uIHRoZSBkcml2ZXJcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHJldHVybnMgbmV4dCBpbmRleCB2YWx1ZS5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldEluYyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5nZXRfaW5jKCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIGEgMTIgYnl0ZSBpZCBzdHJpbmcgdXNlZCBpbiBPYmplY3RJZCdzXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtudW1iZXJ9IFt0aW1lXSBvcHRpb25hbCBwYXJhbWV0ZXIgYWxsb3dpbmcgdG8gcGFzcyBpbiBhIHNlY29uZCBiYXNlZCB0aW1lc3RhbXAuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJldHVybiB0aGUgMTIgYnl0ZSBpZCBiaW5hcnkgc3RyaW5nLlxuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICgnbnVtYmVyJyAhPSB0eXBlb2YgdGltZSkge1xuICAgIHRpbWUgPSBwYXJzZUludChEYXRlLm5vdygpLzEwMDAsMTApO1xuICB9XG5cbiAgdmFyIHRpbWU0Qnl0ZXMgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKTtcbiAgLyogZm9yIHRpbWUtYmFzZWQgT2JqZWN0SWQgdGhlIGJ5dGVzIGZvbGxvd2luZyB0aGUgdGltZSB3aWxsIGJlIHplcm9lZCAqL1xuICB2YXIgbWFjaGluZTNCeXRlcyA9IEJpbmFyeVBhcnNlci5lbmNvZGVJbnQoTUFDSElORV9JRCwgMjQsIGZhbHNlKTtcbiAgdmFyIHBpZDJCeXRlcyA9IEJpbmFyeVBhcnNlci5mcm9tU2hvcnQodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKTtcbiAgdmFyIGluZGV4M0J5dGVzID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh0aGlzLmdldF9pbmMoKSwgMjQsIGZhbHNlLCB0cnVlKTtcblxuICByZXR1cm4gdGltZTRCeXRlcyArIG1hY2hpbmUzQnl0ZXMgKyBwaWQyQnl0ZXMgKyBpbmRleDNCeXRlcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdGhlIGlkIGludG8gYSAyNCBieXRlIGhleCBzdHJpbmcgZm9yIHByaW50aW5nXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmluc3BlY3QgPSBPYmplY3RJZC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogQ29udmVydHMgdG8gaXRzIEpTT04gcmVwcmVzZW50YXRpb24uXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBpZ25vcmVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b0hleFN0cmluZygpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge29iamVjdH0gb3RoZXJJRCBPYmplY3RJZCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuICovXG5PYmplY3RJZC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChvdGhlcklEKSB7XG4gIGlmKG90aGVySUQgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICB2YXIgaWQgPSAob3RoZXJJRCBpbnN0YW5jZW9mIE9iamVjdElkIHx8IG90aGVySUQudG9IZXhTdHJpbmcpXG4gICAgPyBvdGhlcklELmlkXG4gICAgOiBPYmplY3RJZC5jcmVhdGVGcm9tSGV4U3RyaW5nKG90aGVySUQpLmlkO1xuXG4gIHJldHVybiB0aGlzLmlkID09PSBpZDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge2RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAqL1xuT2JqZWN0SWQucHJvdG90eXBlLmdldFRpbWVzdGFtcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgdGltZXN0YW1wLnNldFRpbWUoTWF0aC5mbG9vcihCaW5hcnlQYXJzZXIuZGVjb2RlSW50KHRoaXMuaWQuc3Vic3RyaW5nKDAsNCksIDMyLCB0cnVlLCB0cnVlKSkgKiAxMDAwKTtcbiAgcmV0dXJuIHRpbWVzdGFtcDtcbn1cblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbk9iamVjdElkLmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3RJZC5jcmVhdGVQayA9IGZ1bmN0aW9uIGNyZWF0ZVBrICgpIHtcbiAgcmV0dXJuIG5ldyBPYmplY3RJZCgpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBzZWNvbmQgYmFzZWQgbnVtYmVyLCB3aXRoIHRoZSByZXN0IG9mIHRoZSBPYmplY3RJZCB6ZXJvZWQgb3V0LiBVc2VkIGZvciBjb21wYXJpc29ucyBvciBzb3J0aW5nIHRoZSBPYmplY3RJZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge251bWJlcn0gdGltZSBhbiBpbnRlZ2VyIG51bWJlciByZXByZXNlbnRpbmcgYSBudW1iZXIgb2Ygc2Vjb25kcy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbiBjcmVhdGVGcm9tVGltZSAodGltZSkge1xuICB2YXIgaWQgPSBCaW5hcnlQYXJzZXIuZW5jb2RlSW50KHRpbWUsIDMyLCB0cnVlLCB0cnVlKSArXG4gICAgQmluYXJ5UGFyc2VyLmVuY29kZUludCgwLCA2NCwgdHJ1ZSwgdHJ1ZSk7XG4gIHJldHVybiBuZXcgT2JqZWN0SWQoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElkIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SWQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElkfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SWRcbiAqL1xuT2JqZWN0SWQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uIGNyZWF0ZUZyb21IZXhTdHJpbmcgKGhleFN0cmluZykge1xuICAvLyBUaHJvdyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHZhbGlkIHNldHVwXG4gIGlmKHR5cGVvZiBoZXhTdHJpbmcgPT09ICd1bmRlZmluZWQnIHx8IGhleFN0cmluZyAhPSBudWxsICYmIGhleFN0cmluZy5sZW5ndGggIT0gMjQpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gIHZhciBsZW4gPSBoZXhTdHJpbmcubGVuZ3RoO1xuXG4gIGlmKGxlbiA+IDEyKjIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lkIGNhbm5vdCBiZSBsb25nZXIgdGhhbiAxMiBieXRlcycpO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9ICcnXG4gICAgLCBzdHJpbmdcbiAgICAsIG51bWJlcjtcblxuICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuOyBpbmRleCArPSAyKSB7XG4gICAgc3RyaW5nID0gaGV4U3RyaW5nLnN1YnN0cihpbmRleCwgMik7XG4gICAgbnVtYmVyID0gcGFyc2VJbnQoc3RyaW5nLCAxNik7XG4gICAgcmVzdWx0ICs9IEJpbmFyeVBhcnNlci5mcm9tQnl0ZShudW1iZXIpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJZChyZXN1bHQsIGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWQsIHJldHVybiBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbk9iamVjdElkLmlzVmFsaWQgPSBmdW5jdGlvbiBpc1ZhbGlkKGlkKSB7XG4gIGlmKGlkID09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICBpZihpZCAhPSBudWxsICYmICdudW1iZXInICE9IHR5cGVvZiBpZCAmJiAoaWQubGVuZ3RoICE9IDEyICYmIGlkLmxlbmd0aCAhPSAyNCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gQ2hlY2sgc3BlY2lmaWNhbGx5IGZvciBoZXggY29ycmVjdG5lc3NcbiAgICBpZih0eXBlb2YgaWQgPT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoID09IDI0KSByZXR1cm4gY2hlY2tGb3JIZXhSZWdFeHAudGVzdChpZCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0SWQucHJvdG90eXBlLCBcImdlbmVyYXRpb25UaW1lXCIsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZVxuICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKEJpbmFyeVBhcnNlci5kZWNvZGVJbnQodGhpcy5pZC5zdWJzdHJpbmcoMCw0KSwgMzIsIHRydWUsIHRydWUpKTtcbiAgfVxuICAsIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHZhbHVlID0gQmluYXJ5UGFyc2VyLmVuY29kZUludCh2YWx1ZSwgMzIsIHRydWUsIHRydWUpO1xuICAgIHRoaXMuaWQgPSB2YWx1ZSArIHRoaXMuaWQuc3Vic3RyKDQpO1xuICAgIC8vIGRlbGV0ZSB0aGlzLl9faWQ7XG4gICAgdGhpcy50b0hleFN0cmluZygpO1xuICB9XG59KTtcblxuLyoqXG4gKiBFeHBvc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SWQ7XG5tb2R1bGUuZXhwb3J0cy5PYmplY3RJZCA9IE9iamVjdElkO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgbXBhdGggPSByZXF1aXJlKCcuL21wYXRoJylcbiAgLCBTdG9yYWdlQXJyYXlcbiAgLCBEb2N1bWVudDtcblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIHJ1bGVzLlxuICpcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICpcbiAqL1xuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xuICBbLyhtKWFuJC9naSwgJyQxZW4nXSxcbiAgWy8ocGUpcnNvbiQvZ2ksICckMW9wbGUnXSxcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXG4gIFsvXihveCkkL2dpLCAnJDFlbiddLFxuICBbLyhheHx0ZXN0KWlzJC9naSwgJyQxZXMnXSxcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxuICBbLyhhbGlhc3xzdGF0dXMpJC9naSwgJyQxZXMnXSxcbiAgWy8oYnUpcyQvZ2ksICckMXNlcyddLFxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxuICBbLyhbdGldKXVtJC9naSwgJyQxYSddLFxuICBbL3NpcyQvZ2ksICdzZXMnXSxcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXG4gIFsvKGhpdmUpJC9naSwgJyQxcyddLFxuICBbLyhbXmFlaW91eV18cXUpeSQvZ2ksICckMWllcyddLFxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXG4gIFsvKG1hdHJ8dmVydHxpbmQpaXh8ZXgkL2dpLCAnJDFpY2VzJ10sXG4gIFsvKFttfGxdKW91c2UkL2dpLCAnJDFpY2UnXSxcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcbiAgWy8ocXVpeikkL2dpLCAnJDF6ZXMnXSxcbiAgWy9zJC9naSwgJ3MnXSxcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcbiAgWy8kL2dpLCAncyddXG5dO1xudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xuXG4vKipcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxuICpcbiAqIFRoZXNlIHdvcmRzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0cy51bmNvdW50YWJsZXMgPSBbXG4gICdhZHZpY2UnLFxuICAnZW5lcmd5JyxcbiAgJ2V4Y3JldGlvbicsXG4gICdkaWdlc3Rpb24nLFxuICAnY29vcGVyYXRpb24nLFxuICAnaGVhbHRoJyxcbiAgJ2p1c3RpY2UnLFxuICAnbGFib3VyJyxcbiAgJ21hY2hpbmVyeScsXG4gICdlcXVpcG1lbnQnLFxuICAnaW5mb3JtYXRpb24nLFxuICAncG9sbHV0aW9uJyxcbiAgJ3Nld2FnZScsXG4gICdwYXBlcicsXG4gICdtb25leScsXG4gICdzcGVjaWVzJyxcbiAgJ3NlcmllcycsXG4gICdyYWluJyxcbiAgJ3JpY2UnLFxuICAnZmlzaCcsXG4gICdzaGVlcCcsXG4gICdtb29zZScsXG4gICdkZWVyJyxcbiAgJ25ld3MnLFxuICAnZXhwZXJ0aXNlJyxcbiAgJ3N0YXR1cycsXG4gICdtZWRpYSdcbl07XG52YXIgdW5jb3VudGFibGVzID0gZXhwb3J0cy51bmNvdW50YWJsZXM7XG5cbi8qIVxuICogUGx1cmFsaXplIGZ1bmN0aW9uLlxuICpcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0byBwbHVyYWxpemVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGx1cmFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgZm91bmQ7XG4gIGlmICghfnVuY291bnRhYmxlcy5pbmRleE9mKHN0ci50b0xvd2VyQ2FzZSgpKSl7XG4gICAgZm91bmQgPSBydWxlcy5maWx0ZXIoZnVuY3Rpb24ocnVsZSl7XG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xuICAgIH0pO1xuICAgIGlmIChmb3VuZFswXSkgcmV0dXJuIHN0ci5yZXBsYWNlKGZvdW5kWzBdWzBdLCBmb3VuZFswXVsxXSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuLyohXG4gKiBEZXRlcm1pbmVzIGlmIGBhYCBhbmQgYGJgIGFyZSBkZWVwIGVxdWFsLlxuICpcbiAqIE1vZGlmaWVkIGZyb20gbm9kZS9saWIvYXNzZXJ0LmpzXG4gKiBNb2RpZmllZCBmcm9tIG1vbmdvb3NlL3V0aWxzLmpzXG4gKlxuICogQHBhcmFtIHthbnl9IGEgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBiYFxuICogQHBhcmFtIHthbnl9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAoaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09IHR5cGVvZiBvXG4gICAgICAmJiAnW29iamVjdCBSZWdFeHBdJyA9PSB0b1N0cmluZy5jYWxsKG8pO1xufVxuXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cCAocmVnZXhwKSB7XG4gIGlmICghaXNSZWdFeHAocmVnZXhwKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhIFJlZ0V4cCcpO1xuICB9XG5cbiAgdmFyIGZsYWdzID0gW107XG4gIGlmIChyZWdleHAuZ2xvYmFsKSBmbGFncy5wdXNoKCdnJyk7XG4gIGlmIChyZWdleHAubXVsdGlsaW5lKSBmbGFncy5wdXNoKCdtJyk7XG4gIGlmIChyZWdleHAuaWdub3JlQ2FzZSkgZmxhZ3MucHVzaCgnaScpO1xuICByZXR1cm4gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBmbGFncy5qb2luKCcnKSk7XG59XG5cbi8qIVxuICogT2JqZWN0IGNsb25lIHdpdGggU3RvcmFnZSBuYXRpdmVzIHN1cHBvcnQuXG4gKlxuICogSWYgb3B0aW9ucy5taW5pbWl6ZSBpcyB0cnVlLCBjcmVhdGVzIGEgbWluaW1hbCBkYXRhIG9iamVjdC4gRW1wdHkgb2JqZWN0cyBhbmQgdW5kZWZpbmVkIHZhbHVlcyB3aWxsIG5vdCBiZSBjbG9uZWQuIFRoaXMgbWFrZXMgdGhlIGRhdGEgcGF5bG9hZCBzZW50IHRvIE1vbmdvREIgYXMgc21hbGwgYXMgcG9zc2libGUuXG4gKlxuICogRnVuY3Rpb25zIGFyZSBuZXZlciBjbG9uZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIGNsb25lXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fSB0aGUgY2xvbmVkIG9iamVjdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSAob2JqLCBvcHRpb25zKSB7XG4gIGlmIChvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGwpXG4gICAgcmV0dXJuIG9iajtcblxuICBpZiAoIF8uaXNBcnJheSggb2JqICkgKSB7XG4gICAgcmV0dXJuIGNsb25lQXJyYXkoIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgaWYgKCBpc1N0b3JhZ2VPYmplY3QoIG9iaiApICkge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuanNvbiAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqLnRvSlNPTikge1xuICAgICAgcmV0dXJuIG9iai50b0pTT04oIG9wdGlvbnMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9iai50b09iamVjdCggb3B0aW9ucyApO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqLmNvbnN0cnVjdG9yICkge1xuICAgIHN3aXRjaCAoIGdldEZ1bmN0aW9uTmFtZSggb2JqLmNvbnN0cnVjdG9yICkpIHtcbiAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgIHJldHVybiBjbG9uZU9iamVjdChvYmosIG9wdGlvbnMpO1xuICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgIHJldHVybiBuZXcgb2JqLmNvbnN0cnVjdG9yKCArb2JqICk7XG4gICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICByZXR1cm4gY2xvbmVSZWdFeHAoIG9iaiApO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqIGluc3RhbmNlb2YgT2JqZWN0SWQgKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJZCggb2JqLmlkICk7XG4gIH1cblxuICBpZiAoICFvYmouY29uc3RydWN0b3IgJiYgXy5pc09iamVjdCggb2JqICkgKSB7XG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgcmV0dXJuIGNsb25lT2JqZWN0KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggb2JqLnZhbHVlT2YgKXtcbiAgICByZXR1cm4gb2JqLnZhbHVlT2YoKTtcbiAgfVxufTtcbnZhciBjbG9uZSA9IGV4cG9ydHMuY2xvbmU7XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGNsb25lT2JqZWN0IChvYmosIG9wdGlvbnMpIHtcbiAgdmFyIHJldGFpbktleU9yZGVyID0gb3B0aW9ucyAmJiBvcHRpb25zLnJldGFpbktleU9yZGVyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxuICAgICwgcmV0ID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleXNcbiAgICAsIHZhbFxuICAgICwga1xuICAgICwgaTtcblxuICBpZiAoIHJldGFpbktleU9yZGVyICkge1xuICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgIHZhbCA9IGNsb25lKCBvYmpba10sIG9wdGlvbnMgKTtcblxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcbiAgICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGZhc3RlclxuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcbiAgICBpID0ga2V5cy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrID0ga2V5c1tpXTtcbiAgICAgIHZhbCA9IGNsb25lKG9ialtrXSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xuICAgICAgICBpZiAoIWhhc0tleXMpIGhhc0tleXMgPSB0cnVlO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbmltaXplXG4gICAgPyBoYXNLZXlzICYmIHJldFxuICAgIDogcmV0O1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyohXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdG9ba2V5XSkge1xuICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KGZyb21ba2V5XSkgKSB7XG4gICAgICBtZXJnZSh0b1trZXldLCBmcm9tW2tleV0pO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gc3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDMpO1xufTtcblxuXG4vKiFcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXG4gKlxuICogVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGxpYnMgbGlrZSBEYXRlLmpzIHdoaWNoIGRvIGZvb2xpc2ggdGhpbmdzIHRvIE5hdGl2ZXMuXG4gKlxuICogQHBhcmFtIHthbnl9IHZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmlzU3RvcmFnZU9iamVjdCA9IGZ1bmN0aW9uICggdiApIHtcbiAgRG9jdW1lbnQgfHwgKERvY3VtZW50ID0gcmVxdWlyZSgnLi9kb2N1bWVudCcpKTtcbiAgLy9TdG9yYWdlQXJyYXkgfHwgKFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvYXJyYXknKSk7XG5cbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBEb2N1bWVudCB8fFxuICAgICAgICggdiAmJiB2LmlzU3RvcmFnZUFycmF5ICk7XG59O1xudmFyIGlzU3RvcmFnZU9iamVjdCA9IGV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0O1xuXG4vKiFcbiAqIFJldHVybiB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICovXG5cbmV4cG9ydHMuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgb2JqLCBtYXApIHtcbiAgcmV0dXJuIG1wYXRoLmdldChwYXRoLCBvYmosICdfZG9jJywgbWFwKTtcbn07XG5cbi8qIVxuICogU2V0cyB0aGUgdmFsdWUgb2YgYG9iamAgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtBbnl0aGluZ30gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9iaiwgbWFwKSB7XG4gIG1wYXRoLnNldChwYXRoLCB2YWwsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxudmFyIHJGdW5jdGlvbk5hbWUgPSAvXmZ1bmN0aW9uXFxzKihbXlxccyhdKykvO1xuXG5mdW5jdGlvbiBnZXRGdW5jdGlvbk5hbWUoIGN0b3IgKXtcbiAgaWYgKGN0b3IubmFtZSkge1xuICAgIHJldHVybiBjdG9yLm5hbWU7XG4gIH1cbiAgcmV0dXJuIChjdG9yLnRvU3RyaW5nKCkudHJpbSgpLm1hdGNoKCByRnVuY3Rpb25OYW1lICkgfHwgW10pWzFdO1xufVxuXG5leHBvcnRzLmdldEZ1bmN0aW9uTmFtZSA9IGdldEZ1bmN0aW9uTmFtZTtcblxuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSAoZnVuY3Rpb24oKSB7XG4gIC8vINCU0LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0YLQtdGB0YLQvtCyICjQvtC60YDRg9C20LXQvdC40LUgbm9kZS5qcylcbiAgaWYgKCB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzLm5leHRUaWNrICkgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2s7XG4gIC8vINCV0YHQu9C4INCyINCx0YDQsNGD0LfQtdGA0LUg0YPQttC1INGA0LXQsNC70LjQt9C+0LLQsNC9INGN0YLQvtGCINC80LXRgtC+0LRcbiAgaWYgKCB3aW5kb3cuc2V0SW1tZWRpYXRlICkgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG5cbiAgdmFyIGhlYWQgPSB7IH0sIHRhaWwgPSBoZWFkOyAvLyDQvtGH0LXRgNC10LTRjCDQstGL0LfQvtCy0L7QsiwgMS3RgdCy0Y/Qt9C90YvQuSDRgdC/0LjRgdC+0LpcblxuICB2YXIgSUQgPSBNYXRoLnJhbmRvbSgpOyAvLyDRg9C90LjQutCw0LvRjNC90YvQuSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgFxuXG4gIGZ1bmN0aW9uIG9ubWVzc2FnZShlKSB7XG4gICAgaWYoZS5kYXRhICE9IElEKSByZXR1cm47IC8vINC90LUg0L3QsNGI0LUg0YHQvtC+0LHRidC10L3QuNC1XG4gICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICB2YXIgZnVuYyA9IGhlYWQuZnVuYztcbiAgICBkZWxldGUgaGVhZC5mdW5jO1xuICAgIGZ1bmMoKTtcbiAgfVxuXG4gIGlmKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7IC8vIElFOSssINC00YDRg9Cz0LjQtSDQsdGA0LDRg9C30LXRgNGLXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbm1lc3NhZ2UsIGZhbHNlKTtcbiAgfSBlbHNlIHsgLy8gSUU4XG4gICAgd2luZG93LmF0dGFjaEV2ZW50KCAnb25tZXNzYWdlJywgb25tZXNzYWdlICk7XG4gIH1cblxuICByZXR1cm4gd2luZG93LnBvc3RNZXNzYWdlID8gZnVuY3Rpb24oZnVuYykge1xuICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7IGZ1bmM6IGZ1bmMgfTtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoSUQsIFwiKlwiKTtcbiAgfSA6XG4gIGZ1bmN0aW9uKGZ1bmMpIHsgLy8gSUU8OFxuICAgIHNldFRpbWVvdXQoZnVuYywgMCk7XG4gIH07XG59KCkpO1xuXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXG4vKipcbiAqIFZpcnR1YWxUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogVGhpcyBpcyB3aGF0IG1vbmdvb3NlIHVzZXMgdG8gZGVmaW5lIHZpcnR1YWwgYXR0cmlidXRlcyB2aWEgYFNjaGVtYS5wcm90b3R5cGUudmlydHVhbGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBmdWxsbmFtZSA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIGZ1bGxuYW1lIGluc3RhbmNlb2YgbW9uZ29vc2UuVmlydHVhbFR5cGUgLy8gdHJ1ZVxuICpcbiAqIEBwYXJtYSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFZpcnR1YWxUeXBlIChvcHRpb25zLCBuYW1lKSB7XG4gIHRoaXMucGF0aCA9IG5hbWU7XG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xuICB0aGlzLnNldHRlcnMgPSBbXTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbn1cblxuLyoqXG4gKiBEZWZpbmVzIGEgZ2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgdmlydHVhbCA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIHZpcnR1YWwuZ2V0KGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiB0aGlzLm5hbWUuZmlyc3QgKyAnICcgKyB0aGlzLm5hbWUubGFzdDtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VmlydHVhbFR5cGV9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLmdldHRlcnMucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgc2V0dGVyLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgdmlydHVhbCA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xuICogICAgIHZpcnR1YWwuc2V0KGZ1bmN0aW9uICh2KSB7XG4gKiAgICAgICB2YXIgcGFydHMgPSB2LnNwbGl0KCcgJyk7XG4gKiAgICAgICB0aGlzLm5hbWUuZmlyc3QgPSBwYXJ0c1swXTtcbiAqICAgICAgIHRoaXMubmFtZS5sYXN0ID0gcGFydHNbMV07XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGB2YWx1ZWAgdXNpbmcgb3B0aW9uYWwgYHNjb3BlYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHJldHVybiB7YW55fSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIGdldHRlcnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgdmFyIHYgPSB2YWx1ZTtcbiAgZm9yICh2YXIgbCA9IHRoaXMuZ2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XG4gIH1cbiAgcmV0dXJuIHY7XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEByZXR1cm4ge2FueX0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBzZXR0ZXJzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblZpcnR1YWxUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XG4gIHZhciB2ID0gdmFsdWU7XG4gIGZvciAodmFyIGwgPSB0aGlzLnNldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcbiAgICB2ID0gdGhpcy5zZXR0ZXJzW2xdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xuICB9XG4gIHJldHVybiB2O1xufTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVHlwZTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIl19
