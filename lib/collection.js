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
