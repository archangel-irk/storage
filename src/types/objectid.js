// Regular expression that checks for hex value
var rcheckForHex = new RegExp("^[0-9a-fA-F]{24}$");

/**
* Create a new ObjectID instance
*
* @param {String} [id] Can be a 24 byte hex string.
* @return {Object} instance of ObjectID.
*/
var ObjectID = function ObjectID( id ) {
  // Конструктор можно использовать без new
  if (!(this instanceof ObjectID)) return new ObjectID( id );
  //if ( id instanceof ObjectID ) return id;

  // Throw an error if it's not a valid setup
  if ( id != null && typeof id != 'string' && id.length != 24 )
    throw new Error('Argument passed in must be a string of 24 hex characters');

  // Generate id
  if ( id == null ) {
    this.id = this.generate();

  } else if( rcheckForHex.test( id ) ) {
    this.id = id;

  } else {
    throw new Error('Value passed in is not a valid 24 character hex string');
  }
};

// Private array of chars to use
ObjectID.prototype.CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

//TODO: можно ли использовать большие символы A-Z?
// Generate a random ObjectID.
ObjectID.prototype.generate = function(){
  var chars = this.CHARS, _id = new Array( 36 ), rnd = 0, r;
  for ( var i = 0; i < 24; i++ ) {
    if ( rnd <= 0x02 )
      rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;

    r = rnd & 0xf;
    rnd = rnd >> 4;
    _id[ i ] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
  }

  return _id.join('').toLowerCase();
};

/**
* Return the ObjectID id as a 24 byte hex string representation
*
* @return {String} return the 24 byte hex string representation.
* @api public
*/
ObjectID.prototype.toHexString = function() {
  return this.id;
};

/**
* Converts the id into a 24 byte hex string for printing
*
* @return {String} return the 24 byte hex string representation.
* @api private
*/
ObjectID.prototype.toString = function() {
  return this.toHexString();
};

/**
* Converts to its JSON representation.
*
* @return {String} return the 24 byte hex string representation.
* @api private
*/
ObjectID.prototype.toJSON = function() {
  return this.toHexString();
};

/**
* Compares the equality of this ObjectID with `otherID`.
*
* @param {Object} otherID ObjectID instance to compare against.
* @return {Bool} the result of comparing two ObjectID's
* @api public
*/
ObjectID.prototype.equals = function equals( otherID ){
  var id = ( otherID instanceof ObjectID || otherID.toHexString )
    ? otherID.id
    : new ObjectID( otherID ).id;

  return this.id === id;
};
