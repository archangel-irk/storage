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
