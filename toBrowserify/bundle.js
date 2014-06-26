!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
  ko.track( this, ['array'] );
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

},{}],2:[function(_dereq_,module,exports){
/**
 * Реализации хранилища
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 * browserify toBrowserify/storage.js --standalone storage > toBrowserify/bundle.js
 */
'use strict';

/*!
 * Module dependencies.
 */

var Collection = _dereq_('./collection');
//Schema = require('./schema')


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

  if ( 'Schema' !== schema.constructor.name ){
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

/*
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
  utils: utils
  */


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
  }
});*/


/*!
 * The exports object is an instance of Storage.
 *
 * @api public
 */

module.exports = new Storage;

},{"./collection":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2UvdG9Ccm93c2VyaWZ5L2NvbGxlY3Rpb24uanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS90b0Jyb3dzZXJpZnkvc3RvcmFnZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vVE9ETzog0L3QsNC/0LjRgdCw0YLRjCDQvNC10YLQvtC0IC51cHNlcnQoIGRvYyApIC0g0L7QsdC90L7QstC70LXQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwLCDQsCDQtdGB0LvQuCDQtdCz0L4g0L3QtdGCLCDRgtC+INGB0L7Qt9C00LDQvdC40LVcblxuLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINC70L7Qs9C40LrRgyDRgSBhcGlSZXNvdXJjZSAo0YHQvtGF0YDQsNC90Y/RgtGMINGB0YHRi9C70LrRgyDQvdCwINC90LXQs9C+INC4INC40YHQv9C+0LvRjNC30L7QstGC0Ywg0L/RgNC4INC80LXRgtC+0LTQtSBkb2Muc2F2ZSlcbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC4XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIC0g0KHRhdC10LzQsCDQuNC70Lgg0L7QsdGK0LXQutGCINC+0L/QuNGB0LDQvdC40Y8g0YHRhdC10LzRi1xuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICAvLyDQodC+0YXRgNCw0L3QuNC8INC90LDQt9Cy0LDQvdC40LUg0L/RgNC+0YHRgtGA0LDQvdGB0YLQstCwINC40LzRkdC9XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcbiAgdGhpcy5kb2N1bWVudHMgPSB7fTtcblxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xuICAgIHNjaGVtYSA9IG5ldyBTY2hlbWEoIHNjaGVtYSApO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDRgdGB0YvQu9C60YMg0L3QsCBhcGkg0LTQu9GPINC80LXRgtC+0LTQsCAuc2F2ZSgpXG4gIHRoaXMuYXBpID0gYXBpO1xuXG4gIC8vINCY0YHQv9C+0LvRjNC30YPQtdC80LDRjyDRgdGF0LXQvNCwINC00LvRjyDQutC+0LvQu9C10LrRhtC40LhcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8g0J7RgtC+0LHRgNCw0LbQtdC90LjQtSDQvtCx0YrQtdC60YLQsCBkb2N1bWVudHMg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAgKNC00LvRjyDQvdC+0LrQsNGD0YLQsClcbiAgdGhpcy5hcnJheSA9IFtdO1xuICBrby50cmFjayggdGhpcywgWydhcnJheSddICk7XG59XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlID0ge1xuICAvKipcbiAgICog0JTQvtCx0LDQstC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC40LvQuCDQvNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoeyB0eXBlOiAnamVsbHkgYmVhbicgfSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoW3sgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHsgdHlwZTogJ3NuaWNrZXJzJyB9XSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoeyBfaWQ6ICcqKioqKicsIHR5cGU6ICdqZWxseSBiZWFuJyB9LCB0cnVlKTtcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R8QXJyYXkuPG9iamVjdD59IFtkb2NdIC0g0JTQvtC60YPQvNC10L3RglxuICAgKiBAcGFyYW0ge29iamVjdH0gW2ZpZWxkc10gLSDQstGL0LHRgNCw0L3QvdGL0LUg0L/QvtC70Y8g0L/RgNC4INC30LDQv9GA0L7RgdC1ICjQvdC1INGA0LXQsNC70LjQt9C+0LLQsNC90L4g0LIg0LTQvtC60YPQvNC10L3RgtC1KVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpbml0XSAtIGh5ZHJhdGUgZG9jdW1lbnQgLSDQvdCw0L/QvtC70L3QuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQtNCw0L3QvdGL0LzQuCAo0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINCyIGFwaS1jbGllbnQpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW19zdG9yYWdlV2lsbE11dGF0ZV0gLSDQpNC70LDQsyDQtNC+0LHQsNCy0LvQtdC90LjRjyDQvNCw0YHRgdC40LLQsCDQtNC+0LrRg9C80LXQvdGC0L7Qsi4g0YLQvtC70YzQutC+INC00LvRjyDQstC90YPRgtGA0LXQvdC90LXQs9C+INC40YHQv9C+0LvRjNC30L7QstCw0L3QuNGPXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fEFycmF5LjxzdG9yYWdlLkRvY3VtZW50Pn1cbiAgICovXG4gIGFkZDogZnVuY3Rpb24oIGRvYywgZmllbGRzLCBpbml0LCBfc3RvcmFnZVdpbGxNdXRhdGUgKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3QtdGCLCDQt9C90LDRh9C40YIg0LHRg9C00LXRgiDQv9GD0YHRgtC+0LlcbiAgICBpZiAoIGRvYyA9PSBudWxsICkgZG9jID0gbnVsbDtcblxuICAgIC8vINCc0LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QslxuICAgIGlmICggXy5pc0FycmF5KCBkb2MgKSApe1xuICAgICAgdmFyIHNhdmVkRG9jcyA9IFtdO1xuXG4gICAgICBfLmVhY2goIGRvYywgZnVuY3Rpb24oIGRvYyApe1xuICAgICAgICBzYXZlZERvY3MucHVzaCggc2VsZi5hZGQoIGRvYywgZmllbGRzLCBpbml0LCB0cnVlICkgKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG5cbiAgICAgIHJldHVybiBzYXZlZERvY3M7XG4gICAgfVxuXG4gICAgdmFyIGlkID0gZG9jICYmIGRvYy5faWQ7XG5cbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGCINGD0LbQtSDQtdGB0YLRjCwg0YLQviDQv9GA0L7RgdGC0L4g0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LfQvdCw0YfQtdC90LjRj1xuICAgIGlmICggaWQgJiYgdGhpcy5kb2N1bWVudHNbIGlkIF0gKXtcbiAgICAgIHRoaXMuZG9jdW1lbnRzWyBpZCBdLnNldCggZG9jICk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpc2NyaW1pbmF0b3JNYXBwaW5nID0gdGhpcy5zY2hlbWFcbiAgICAgICAgPyB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZ1xuICAgICAgICA6IG51bGw7XG5cbiAgICAgIHZhciBrZXkgPSBkaXNjcmltaW5hdG9yTWFwcGluZyAmJiBkaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3RcbiAgICAgICAgPyBkaXNjcmltaW5hdG9yTWFwcGluZy5rZXlcbiAgICAgICAgOiBudWxsO1xuXG4gICAgICAvLyDQktGL0LHQuNGA0LDQtdC8INGB0YXQtdC80YMsINC10YHQu9C4INC10YHRgtGMINC00LjRgdC60YDQuNC80LjQvdCw0YLQvtGAXG4gICAgICB2YXIgc2NoZW1hO1xuICAgICAgaWYgKGtleSAmJiBkb2MgJiYgZG9jW2tleV0gJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnMgJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dKSB7XG4gICAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JzW2RvY1trZXldXTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWE7XG4gICAgICB9XG5cbiAgICAgIHZhciBuZXdEb2MgPSBuZXcgRG9jdW1lbnQoIGRvYywgdGhpcy5uYW1lLCBzY2hlbWEsIGZpZWxkcywgaW5pdCApO1xuICAgICAgaWQgPSBuZXdEb2MuX2lkLnRvU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgLy8g0JTQu9GPINC+0LTQuNC90L7Rh9C90YvRhSDQtNC+0LrRg9C80LXQvdGC0L7QsiDRgtC+0LbQtSDQvdGD0LbQvdC+ICDQstGL0LfQstCw0YLRjCBzdG9yYWdlSGFzTXV0YXRlZFxuICAgIGlmICggIV9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRvY3VtZW50c1sgaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0KPQtNCw0LvQtdC90LjRgtGMINC00L7QutGD0LzQtdC90YIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5yZW1vdmUoIERvY3VtZW50ICk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5yZW1vdmUoIHV1aWQgKTtcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R8bnVtYmVyfSBkb2N1bWVudCAtINCh0LDQvCDQtNC+0LrRg9C80LXQvdGCINC40LvQuCDQtdCz0L4gaWQuXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbiggZG9jdW1lbnQgKXtcbiAgICByZXR1cm4gZGVsZXRlIHRoaXMuZG9jdW1lbnRzWyBkb2N1bWVudC5faWQgfHwgZG9jdW1lbnQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGC0YsuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIG5hbWVkIGpvaG5cbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBuYW1lOiAnam9obicgfSk7XG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgYXV0aG9yOiAnU2hha2VzcGVhcmUnLCB5ZWFyOiAxNjExIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgZmluZDogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICByZXR1cm4gXy53aGVyZSggdGhpcy5kb2N1bWVudHMsIGNvbmRpdGlvbnMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCINC/0L4gaWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kQnlJZCggaWQgKTtcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kQnlJZDogZnVuY3Rpb24oIF9pZCApe1xuICAgIHJldHVybiB0aGlzLmRvY3VtZW50c1sgX2lkIF07XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviBpZCDQtNC+0LrRg9C80LXQvdGCINC4INGD0LTQsNC70LjRgtGMINC10LPQvi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkQW5kUmVtb3ZlKCBpZCApIC8vIHJldHVybnMg0YFvbGxlY3Rpb25cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRCeUlkXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcbiAgICpcbiAgICogQHBhcmFtIF9pZFxuICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAgICovXG4gIGZpbmRCeUlkQW5kUmVtb3ZlOiBmdW5jdGlvbiggX2lkICl7XG4gICAgdGhpcy5yZW1vdmUoIHRoaXMuZmluZEJ5SWQoIF9pZCApICk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L/QviBpZCDQtNC+0LrRg9C80LXQvdGCINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnVwZGF0ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkQW5kVXBkYXRlOiBmdW5jdGlvbiggX2lkLCBwYXRoLCB2YWx1ZSApe1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZSggdGhpcy5maW5kQnlJZCggX2lkICksIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0L7QtNC40L0g0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gZmluZCBvbmUgaXBob25lIGFkdmVudHVyZXNcbiAgICogc3RvcmFnZS5hZHZlbnR1cmUuZmluZE9uZSh7IHR5cGU6ICdpcGhvbmUnIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7c3RvcmFnZS5Eb2N1bWVudHx1bmRlZmluZWR9XG4gICAqL1xuICBmaW5kT25lOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLmZpbmRXaGVyZSggdGhpcy5kb2N1bWVudHMsIGNvbmRpdGlvbnMgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+INGD0YHQu9C+0LLQuNGOINC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZE9uZUFuZFJlbW92ZSggY29uZGl0aW9ucyApIC8vIHJldHVybnMg0YFvbGxlY3Rpb25cbiAgICpcbiAgICogQHNlZSBDb2xsZWN0aW9uLmZpbmRPbmVcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZGl0aW9uc1xuICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAgICovXG4gIGZpbmRPbmVBbmRSZW1vdmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgdGhpcy5yZW1vdmUoIHRoaXMuZmluZE9uZSggY29uZGl0aW9ucyApICk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCd0LDQudGC0Lgg0LTQvtC60YPQvNC10L3RgiDQv9C+INGD0YHQu9C+0LLQuNGOINC4INC+0LHQvdC+0LLQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmVBbmRVcGRhdGU6IGZ1bmN0aW9uKCBjb25kaXRpb25zLCBwYXRoLCB2YWx1ZSApe1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICksIHBhdGgsIHZhbHVlICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqINCe0LHQvdC+0LLQuNGC0Ywg0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNC1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5wbGFjZXMudXBkYXRlKCBzdG9yYWdlLnBsYWNlcy5maW5kQnlJZCggMCApLCB7XG4gICAqICAgbmFtZTogJ0lya3V0c2snXG4gICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcnxvYmplY3R9IGRvY3VtZW50XG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fEJvb2xlYW59XG4gICAqL1xuICB1cGRhdGU6IGZ1bmN0aW9uKCBkb2N1bWVudCwgcGF0aCwgdmFsdWUgKXtcbiAgICB2YXIgZG9jID0gdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuXG4gICAgaWYgKCBkb2MgPT0gbnVsbCApe1xuICAgICAgY29uc29sZS53YXJuKCdzdG9yYWdlOjp1cGRhdGU6IERvY3VtZW50IGlzIG5vdCBmb3VuZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9jLnNldCggcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdGA0LDQsdC+0YLRh9C40Log0L3QsCDQuNC30LzQtdC90LXQvdC40Y8gKNC00L7QsdCw0LLQu9C10L3QuNC1LCDRg9C00LDQu9C10L3QuNC1KSDQtNCw0L3QvdGL0YUg0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gICAqL1xuICBzdG9yYWdlSGFzTXV0YXRlZDogZnVuY3Rpb24oKXtcbiAgICAvLyDQntCx0L3QvtCy0LjQvCDQvNCw0YHRgdC40LIg0LTQvtC60YPQvNC10L3RgtC+0LIgKNGB0L/QtdGG0LjQsNC70YzQvdC+0LUg0L7RgtC+0LHRgNCw0LbQtdC90LjQtSDQtNC70Y8g0L/QtdGA0LXQsdC+0YDQsCDQvdC+0LrQsNGD0YLQvtC8KVxuICAgIHRoaXMuYXJyYXkgPSBfLnRvQXJyYXkoIHRoaXMuZG9jdW1lbnRzICk7XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uO1xuIiwiLyoqXG4gKiDQoNC10LDQu9C40LfQsNGG0LjQuCDRhdGA0LDQvdC40LvQuNGJ0LBcbiAqIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI3NlbGVjdG9yc1xuICogaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvdHJlZS9tYXN0ZXIvcGFja2FnZXMvbWluaW1vbmdvXG4gKlxuICogYnJvd3NlcmlmeSB0b0Jyb3dzZXJpZnkvc3RvcmFnZS5qcyAtLXN0YW5kYWxvbmUgc3RvcmFnZSA+IHRvQnJvd3NlcmlmeS9idW5kbGUuanNcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKTtcbi8vU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxuXG5cbi8qKlxuICogU3RvcmFnZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgZXhwb3J0cyBvYmplY3Qgb2YgdGhlIGBzdG9yYWdlYCBtb2R1bGUgaXMgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcy5cbiAqIE1vc3QgYXBwcyB3aWxsIG9ubHkgdXNlIHRoaXMgb25lIGluc3RhbmNlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2UgKCkge1xuICB0aGlzLmNvbGxlY3Rpb25OYW1lcyA9IFtdO1xufVxuXG4vKipcbiAqINCh0L7Qt9C00LDRgtGMINC60L7Qu9C70LXQutGG0LjRjiDQuCDQv9C+0LvRg9GH0LjRgtGMINC10ZEuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtzdG9yYWdlLlNjaGVtYXx1bmRlZmluZWR9IHNjaGVtYVxuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAg0LDQv9C4INGA0LXRgdGD0YDRgVxuICogQHJldHVybnMge0NvbGxlY3Rpb258dW5kZWZpbmVkfVxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5jcmVhdGVDb2xsZWN0aW9uID0gZnVuY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICl7XG4gIGlmICggdGhpc1sgbmFtZSBdICl7XG4gICAgY29uc29sZS5pbmZvKCdzdG9yYWdlOjpjb2xsZWN0aW9uOiBgJyArIG5hbWUgKyAnYCBhbHJlYWR5IGV4aXN0Jyk7XG4gICAgcmV0dXJuIHRoaXNbIG5hbWUgXTtcbiAgfVxuXG4gIGlmICggJ1NjaGVtYScgIT09IHNjaGVtYS5jb25zdHJ1Y3Rvci5uYW1lICl7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcbiAgfVxuXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcblxuICByZXR1cm4gdGhpc1sgbmFtZSBdID0gbmV3IENvbGxlY3Rpb24oIG5hbWUsIHNjaGVtYSwgYXBpICk7XG59O1xuXG4vKipcbiAqINCf0L7Qu9GD0YfQuNGC0Ywg0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40Lkg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAg0YHRgtGA0L7Qui5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59IEFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIGNvbGxlY3Rpb25zIGluIHRoZSBzdG9yYWdlLlxuICovXG5TdG9yYWdlLnByb3RvdHlwZS5nZXRDb2xsZWN0aW9uTmFtZXMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uTmFtZXM7XG59O1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yXG4gKlxuICogQG1ldGhvZCBDb2xsZWN0aW9uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLkNvbGxlY3Rpb24gPSBDb2xsZWN0aW9uO1xuXG4vKlxuXy5leHRlbmQoIHN0b3JhZ2UsIHtcbiAgRG9jdW1lbnQ6IERvY3VtZW50LFxuICBDb2xsZWN0aW9uOiBDb2xsZWN0aW9uLFxuICBTY2hlbWE6IFNjaGVtYSxcbiAgT2JqZWN0SWQ6IE9iamVjdElELFxuXG4gIFNjaGVtYVR5cGU6IFNjaGVtYVR5cGUsXG4gIFR5cGVzOiB7XG4gICAgQXJyYXk6IFN0b3JhZ2VBcnJheSxcbiAgICBEb2N1bWVudEFycmF5OiBTdG9yYWdlRG9jdW1lbnRBcnJheSxcbiAgICBFbWJlZGRlZERvY3VtZW50OiBFbWJlZGRlZERvY3VtZW50LFxuICAgIE9iamVjdElEOiBPYmplY3RJRFxuICB9LFxuICBWaXJ0dWFsVHlwZTogVmlydHVhbFR5cGUsXG5cbiAgU3RhdGVNYWNoaW5lOiBTdGF0ZU1hY2hpbmUsXG4gIEVycm9yOiB7XG4gICAgZXJyb3JNZXNzYWdlczogZXJyb3JNZXNzYWdlcyxcbiAgICBTdG9yYWdlRXJyb3I6IFN0b3JhZ2VFcnJvcixcbiAgICBDYXN0RXJyb3I6IENhc3RFcnJvcixcbiAgICBWYWxpZGF0aW9uRXJyb3I6IFZhbGlkYXRpb25FcnJvcixcbiAgICBWYWxpZGF0b3JFcnJvcjogVmFsaWRhdG9yRXJyb3JcbiAgfSxcbiAgdXRpbHM6IHV0aWxzXG4gICovXG5cblxuLypcbiAqIEdlbmVyYXRlIGEgcmFuZG9tIHV1aWQuXG4gKiBodHRwOi8vd3d3LmJyb29mYS5jb20vVG9vbHMvTWF0aC51dWlkLmh0bVxuICogZm9yayBNYXRoLnV1aWQuanMgKHYxLjQpXG4gKlxuICogaHR0cDovL3d3dy5icm9vZmEuY29tLzIwMDgvMDkvamF2YXNjcmlwdC11dWlkLWZ1bmN0aW9uL1xuICovXG4vKnV1aWQ6IHtcbiAgICAvLyBQcml2YXRlIGFycmF5IG9mIGNoYXJzIHRvIHVzZVxuICAgIENIQVJTOiAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCcnKSxcblxuICAgIC8vIHJldHVybnMgUkZDNDEyMiwgdmVyc2lvbiA0IElEXG4gICAgZ2VuZXJhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgY2hhcnMgPSB0aGlzLkNIQVJTLCB1dWlkID0gbmV3IEFycmF5KCAzNiApLCBybmQgPSAwLCByO1xuICAgICAgZm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkrKyApIHtcbiAgICAgICAgaWYgKCBpID09IDggfHwgaSA9PSAxMyB8fCBpID09IDE4IHx8IGkgPT0gMjMgKSB7XG4gICAgICAgICAgdXVpZFtpXSA9ICctJztcbiAgICAgICAgfSBlbHNlIGlmICggaSA9PSAxNCApIHtcbiAgICAgICAgICB1dWlkW2ldID0gJzQnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICggcm5kIDw9IDB4MDIgKSBybmQgPSAweDIwMDAwMDAgKyAoTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMCkgfCAwO1xuICAgICAgICAgIHIgPSBybmQgJiAweGY7XG4gICAgICAgICAgcm5kID0gcm5kID4+IDQ7XG4gICAgICAgICAgdXVpZFtpXSA9IGNoYXJzWyhpID09IDE5KSA/IChyICYgMHgzKSB8IDB4OCA6IHJdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdXVpZC5qb2luKCcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgfVxufSk7Ki9cblxuXG4vKiFcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBTdG9yYWdlLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU3RvcmFnZTtcbiJdfQ==
(2)
});
