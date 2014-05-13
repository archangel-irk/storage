/**
 * Реализации хранилища
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 */
_.extend( storage, {
  Document: Document,
  Collection: Collection,
  Schema: Schema,
  ObjectId: ObjectID,

  SchemaType: SchemaType,
  Types: {
    Array: StorageArray,
    DocumentArray: StorageDocumentArray,
    EmbeddedDocument: EmbeddedDocument,
    ObjectID: ObjectID
  },
  VirtualType: VirtualType,

  StateMachine: StateMachine,
  Error: {
    errorMessages: errorMessages,
    StorageError: StorageError,
    CastError: CastError,
    ValidationError: ValidationError,
    ValidatorError: ValidatorError
  },
  utils: utils,

  collectionNames: [],

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
  createCollection: function( name, schema, api ){
    if ( this[ name ] ){
      console.info('storage::collection: `' + name + '` already exist');
      return this[ name ];
    }

    if ( 'Schema' !== schema.constructor.name ){
      throw new TypeError('`schema` must be Schema instance');
    }

    this.collectionNames.push( name );

    return this[ name ] = new Collection( name, schema, api );
  },

  /**
   * Получить название коллекций в виде массива строк.
   *
   * @returns {Array.<string>} An array containing all collections in the storage.
   */
  getCollectionNames: function(){
    return this.collectionNames;
  }

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
});