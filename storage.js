!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var Schema = _dereq_('./schema')
  , Document = _dereq_('./document')

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

},{"./document":2,"./schema":12}],2:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var Events = _dereq_('./events')
  , StorageError = _dereq_('./error')
  , MixedSchema = _dereq_('./schema/mixed')
  , ObjectId = _dereq_('./types/objectid')
  , Schema = _dereq_('./schema')
  , ValidatorError = _dereq_('./schematype').ValidatorError
  , utils = _dereq_('./utils')
  , clone = utils.clone
  , ValidationError = StorageError.ValidationError
  , InternalCache = _dereq_('./internal')
  , deepEqual = utils.deepEqual
  , DocumentArray
  , SchemaArray
  , Embedded

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
  this.isNew = true;

  // Создать пустой документ с флагом init
  // new TestDocument(true);
  if ( 'boolean' === typeof data ){
    init = data;
    data = null;
  }

  // Создать документ с флагом init
  // new TestDocument({ test: 'boom' }, true);
  if ( 'boolean' === typeof collectionName ){
    init = collectionName;
    collectionName = undefined;
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
    // Сгенерировать ObjectId, если он отсутствует и его требует схема
    if ( !this.schema && schema.options._id ){
      data = data || {};

      if ( !data._id ){
        data._id = new ObjectId();
      }
    }
  }

  if ( !schema ){
    //todo: throw new mongoose.Error.MissingSchemaError(name);
    throw new TypeError('Нельзя создавать документ без схемы');
  }

  this.schema = schema;
  this.collection = storage[ collectionName ];
  this.collectionName = collectionName;

  if ( this.collection ){
    if ( data == null || !data._id ){
      throw new TypeError('Для помещения в коллекцию необходимо, чтобы у документа был _id');
    }
    // Поместить документ в коллекцию
    this.collection.documents[ data._id ] = this;
  }

  this.$__ = new InternalCache;
  this.$__.strictMode = schema.options && schema.options.strict;
  this.$__.selected = fields;

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
Document.prototype.__proto__ = Events.prototype;

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
        (!obj[i].constructor || 'Object' == obj[i].constructor.name)) {
      // assume nested object
      if (!doc[i]) doc[i] = {};
      init(self, obj[i], doc[i], path + '.');
    } else {
      if (obj[i] === null) {
        doc[i] = null;
      } else if (obj[i] !== undefined) {
        var observable = ko.getObservable( self, path );

        if (schema) {
          self.$__try(function(){
            doc[i] = schema.cast(obj[i], self, true);
          });
        } else {
          doc[i] = obj[i];
        }

        // Установить начальное значение
        observable && observable( doc[i] );
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
  if (type && 'Object' == type.constructor.name) {
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
            && ( !path[key].constructor || 'Object' == path[key].constructor.name )
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
      (!val.constructor || 'Object' == val.constructor.name)) {
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
      if (schema instanceof Mixed) {
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
  /*if (this.isDirectModified(pathToMark)){
    return false;
  }*/

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

      var observable = ko.getObservable( this, path );

      //TODO: Иногда observable === null, понять почему так порисходит и исправить это
      //console.log( path, observable );

      // Обновим observable (чтобы работали привязки)
      observable && observable( val );

    } else {
      if (obj[parts[i]] && 'Object' === obj[parts[i]].constructor.name) {
        obj = obj[parts[i]];

      } else if (obj[parts[i]] && 'EmbeddedDocument' === obj[parts[i]].constructor.name) {
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

  var observable = ko.getObservable( this, path );
  observable && observable();

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
  DocumentArray || (DocumentArray = _dereq_('./types/documentarray'));

  this.$__.activePaths
  .map('init', 'modify', function (i) {
    return self.getValue(i);
  })
  .filter(function (val) {
    return val && val instanceof DocumentArray && val.length;
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
        , (('Object' === limb.constructor.name
               && Object.keys(limb).length)
               && (!limb.type || limb.type.type)
               ? limb
               : null)
        , proto
        , prefix
        , keys);
  }
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
      , get: function () {
          if (!this.$__.getters)
            this.$__.getters = {};

          if (!this.$__.getters[path]) {
            var nested = Object.create(this);

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
    SchemaArray || (SchemaArray = _dereq_('./schema/array'));

    var allObservablesForObject = ko.es5.getAllObservablesForObject( self, true ),
      schema = prototype.schema || prototype.constructor.schema,
      isArray = schema.path( path ) instanceof SchemaArray,
      observable = isArray ? ko.observableArray()
                           : ko.observable();

    Object.defineProperty( prototype, prop, {
        enumerable: true
      , get: function ( ) { return this.get.call(this.$__.scope || this, path); }
      , set: function (v) { return this.set.call(this.$__.scope || this, path, v); }
    });

    allObservablesForObject[ path ] = observable;

    if ( isArray ) {
      ko.es5.notifyWhenPresentOrFutureArrayValuesMutate( ko, observable );
    }
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
  DocumentArray || (DocumentArray = _dereq_('./types/documentarray'));
  Embedded = Embedded || _dereq_('./types/embedded');

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
  DocumentArray || (DocumentArray = _dereq_('./types/documentarray'));

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
  if (!(options && 'Object' == options.constructor.name)) {
    options = this.schema.options.toObject
      ? utils.clone(this.schema.options.toObject)
      : {};
  }

  if ( options.minimize === undefined ){
    options.minimize = this.schema.options.minimize;
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
  if (!(options && 'Object' == options.constructor.name)
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
 * Documents are considered equal when they have matching `_id`s.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 */

Document.prototype.equals = function (doc) {
  var tid = this.get('_id');
  var docid = doc.get('_id');
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

},{"./error":3,"./events":8,"./internal":10,"./schema":12,"./schema/array":13,"./schema/mixed":18,"./schematype":22,"./types/documentarray":25,"./types/embedded":26,"./types/objectid":28,"./utils":29}],3:[function(_dereq_,module,exports){
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

StorageError.messages = _dereq_('./error/messages');

/*!
 * Expose subclasses
 */

StorageError.CastError = _dereq_('./error/cast');
StorageError.ValidationError = _dereq_('./error/validation');
StorageError.ValidatorError = _dereq_('./error/validator');
//todo:
//StorageError.VersionError = require('./error/version');
//StorageError.OverwriteModelError = require('./error/overwriteModel');
//StorageError.MissingSchemaError = require('./error/missingSchema');
//StorageError.DivergentArrayError = require('./error/divergentArray');

},{"./error/cast":4,"./error/messages":5,"./error/validation":6,"./error/validator":7}],4:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var StorageError = _dereq_('../error.js');

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
  this.kind = type;
  this.value = value;
  this.path = path;
};

/*!
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = StorageError.prototype;

/*!
 * exports
 */

module.exports = CastError;

},{"../error.js":3}],5:[function(_dereq_,module,exports){

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


},{}],6:[function(_dereq_,module,exports){

/*!
 * Module requirements
 */

var StorageError = _dereq_('../error.js');

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

ValidationError.prototype.__proto__ = StorageError.prototype;

/*!
 * Module exports
 */

module.exports = ValidationError;

},{"../error.js":3}],7:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var StorageError = _dereq_('../error.js');
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
  this.kind = type;
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

ValidatorError.prototype.__proto__ = StorageError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;

},{"../error.js":3}],8:[function(_dereq_,module,exports){
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

},{}],9:[function(_dereq_,module,exports){
/**
 * Реализации хранилища
 * вдохновлён mongoose 3.8.4 (исправлены баги по 3.8.12)
 *
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 * browserify --debug src/index.js --standalone storage > storage.js
 */

'use strict';

/*!
 * Module dependencies.
 */

var Collection = _dereq_('./collection')
  , Schema = _dereq_('./schema')
  , SchemaType = _dereq_('./schematype')
  , VirtualType = _dereq_('./virtualtype')
  , Types = _dereq_('./types')
  , Document = _dereq_('./document')
  , utils = _dereq_('./utils');


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

//Storage.prototype.Schema = Schema;

/**
 * The Mongoose [SchemaType](#schematype_SchemaType) constructor
 *
 * @method SchemaType
 * @api public
 */

//Storage.prototype.SchemaType = SchemaType;

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

//Storage.prototype.SchemaTypes = Schema.Types;

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

Storage.prototype.Error = _dereq_('./error');

Storage.prototype.utils = utils;
Storage.prototype.ObjectId = Types.ObjectId;
Storage.prototype.schemas = Schema.schemas;

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

},{"./collection":1,"./document":2,"./error":3,"./schema":12,"./schematype":22,"./types":27,"./utils":29,"./virtualtype":30}],10:[function(_dereq_,module,exports){
// Машина состояний используется для пометки, в каком состоянии находятся поле
// Например: если поле имеет состояние default - значит его значением является значение по умолчанию
// Примечание: для массивов в общем случае это означает пустой массив

/*!
 * Dependencies
 */

var StateMachine = _dereq_('./statemachine');

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

},{"./statemachine":23}],11:[function(_dereq_,module,exports){
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
},{}],12:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var Events = _dereq_('./events')
  , VirtualType = _dereq_('./virtualtype')
  , utils = _dereq_('./utils')
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

Schema.prototype.__proto__ = Events.prototype;

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
      && ( !obj[ key ].constructor || 'Object' == obj[ key ].constructor.name )
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
  if (obj.constructor && obj.constructor.name != 'Object')
    obj = { type: obj };

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if ('Object' == type.constructor.name || 'mixed' == type) {
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
                    && 'Object' == cast.constructor.name
                    && Object.keys(cast).length) {
      return new Types.DocumentArray(path, new Schema(cast), obj);
    }

    return new Types.Array(path, cast || Types.Mixed, obj);
  }

  var name = 'string' == typeof type
    ? type
    : type.name;

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

  switch (key) {
    case 'safe':
      this.options[key] = false === value
        ? { w: 0 }
        : value;
      break;
    default:
      this.options[key] = value;
  }

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
Schema.Types = _dereq_('./schema/index');

// Хранилище схем
Schema.schemas = schemas = {};


/*!
 * ignore
 */

Types = Schema.Types;
var ObjectId = Schema.ObjectId = Types.ObjectId;

},{"./events":8,"./schema/index":17,"./utils":29,"./virtualtype":30}],13:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , Types = {
        Boolean: _dereq_('./boolean')
      , Date: _dereq_('./date')
      , Number: _dereq_('./number')
      , String: _dereq_('./string')
      , ObjectId: _dereq_('./objectid')
    }
  , StorageArray = _dereq_('../types/array')
  , Mixed = _dereq_('./mixed')
  , EmbeddedDoc

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

    if ('Object' === cast.constructor.name) {
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
      : cast.name;

    var caster = name in Types
      ? Types[name]
      : cast;

    this.casterConstructor = caster;
    this.caster = new caster(null, castOptions);

    // lazy load
    EmbeddedDoc || (EmbeddedDoc = _dereq_('../types/embedded'));

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
SchemaArray.prototype.__proto__ = SchemaType.prototype;

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
    if (!(value instanceof StorageArray)) {
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

},{"../schematype":22,"../types/array":24,"../types/embedded":26,"./boolean":14,"./date":15,"./mixed":18,"./number":19,"./objectid":20,"./string":21}],14:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype');

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
BooleanSchema.prototype.__proto__ = SchemaType.prototype;

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

},{"../schematype":22}],15:[function(_dereq_,module,exports){
/*!
 * Module requirements.
 */

var SchemaType = _dereq_('../schematype');
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
DateSchema.prototype.__proto__ = SchemaType.prototype;

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

},{"../schematype":22}],16:[function(_dereq_,module,exports){

/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , ArrayType = _dereq_('./array')
  , StorageDocumentArray = _dereq_('../types/documentarray')
  , Subdocument = _dereq_('../types/embedded')
  , Document = _dereq_('../document');

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

  EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
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
DocumentArray.prototype.__proto__ = ArrayType.prototype;

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

  if (!(value instanceof StorageDocumentArray)) {
    value = new StorageDocumentArray(value, this.path, doc);
  }

  i = value.length;

  while (i--) {
    if (!(value[i] instanceof EmbeddedDocument) && value[i]) {
      if (init) {
        selected || (selected = scopePaths(this, doc.$__.selected, init));
        subdoc = new this.casterConstructor(null, value, true, selected);
        value[i] = subdoc.init(value[i]);
      } else {
        if (prev && (subdoc = prev.id(value[i]._id))) {
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

},{"../document":2,"../schematype":22,"../types/documentarray":25,"../types/embedded":26,"./array":13}],17:[function(_dereq_,module,exports){

/*!
 * Module exports.
 */

exports.String = _dereq_('./string');

exports.Number = _dereq_('./number');

exports.Boolean = _dereq_('./boolean');

exports.DocumentArray = _dereq_('./documentarray');

exports.Array = _dereq_('./array');

exports.Date = _dereq_('./date');

exports.ObjectId = _dereq_('./objectid');

exports.Mixed = _dereq_('./mixed');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;

},{"./array":13,"./boolean":14,"./date":15,"./documentarray":16,"./mixed":18,"./number":19,"./objectid":20,"./string":21}],18:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype');

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
Mixed.prototype.__proto__ = SchemaType.prototype;

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

},{"../schematype":22}],19:[function(_dereq_,module,exports){
/*!
 * Module requirements.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = _dereq_('../error').messages

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
NumberSchema.prototype.__proto__ = SchemaType.prototype;

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

},{"../error":3,"../schematype":22}],20:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , oid = _dereq_('../types/objectid')
  , utils = _dereq_('../utils')
  , Document

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

ObjectId.prototype.__proto__ = SchemaType.prototype;

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
    Document || (Document = _dereq_('./../document'));

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
      return new oid( value.toString() );
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

},{"../schematype":22,"../types/objectid":28,"../utils":29,"./../document":2}],21:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = _dereq_('../error').messages

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
StringSchema.prototype.__proto__ = SchemaType.prototype;

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

},{"../error":3,"../schematype":22}],22:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var error = _dereq_('./error');
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
  if ('function' == typeof obj || obj && 'RegExp' === obj.constructor.name) {
    if (!message) message = errorMessages.general.default;
    if (!type) type = 'user defined';
    this.validators.push([obj, message, type]);
    return this;
  }

  var i = arguments.length
    , arg;

  while (i--) {
    arg = arguments[i];
    if (!(arg && 'Object' == arg.constructor.name)) {
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

},{"./error":3}],23:[function(_dereq_,module,exports){
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

  ctor.prototype.__proto__ = StateMachine.prototype;

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


},{}],24:[function(_dereq_,module,exports){
//TODO: почистить код

/*!
 * Module dependencies.
 */

var EmbeddedDocument = _dereq_('./embedded');
var Document = _dereq_('../document');
var ObjectId = _dereq_('./objectid');
var utils = _dereq_('../utils');

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
  arr.__proto__ = StorageArray.prototype;

  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
}

/*!
 * Inherit from Array
 */
StorageArray.prototype = new Array;

/**
 * Parent owner document
 *
 * @property _parent
 * @api private
 */
StorageArray.prototype._parent;

/**
 * Casts a member based on this arrays schema.
 *
 * @param {any} value
 * @return value the casted value
 * @api private
 */
StorageArray.prototype._cast = function ( value ) {
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
};

/**
 * Marks this array as modified.
 *
 * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
 *
 * @param {EmbeddedDocument} embeddedDoc the embedded doc that invoked this method on the Array
 * @param {String} embeddedPath the path which changed in the embeddedDoc
 * @api private
 */
StorageArray.prototype._markModified = function (elem, embeddedPath) {
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
};

/**
 * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
 *
 * @param {Object} [args...]
 * @api public
 */
StorageArray.prototype.push = function () {
  var values = [].map.call(arguments, this._cast, this)
    , ret = [].push.apply(this, values);

  this._markModified();
  return ret;
};

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
StorageArray.prototype.pop = function () {
  var ret = [].pop.call(this);

  this._markModified();
  return ret;
};

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
StorageArray.prototype.shift = function () {
  var ret = [].shift.call(this);

  this._markModified();
  return ret;
};

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
StorageArray.prototype.pull = function () {
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
StorageArray.prototype.remove = StorageArray.prototype.pull;

/**
 * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
 *
 * ####Note:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @api public
 */
StorageArray.prototype.splice = function splice () {
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
};

/**
 * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
 *
 * ####Note:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @api public
 */
StorageArray.prototype.unshift = function () {
  var values = [].map.call(arguments, this._cast, this);
  [].unshift.apply(this, values);

  this._markModified();
  return this.length;
};

/**
 * Wraps [`Array#sort`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) with proper change tracking.
 *
 * ####NOTE:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @api public
 */
StorageArray.prototype.sort = function () {
  var ret = [].sort.apply(this, arguments);

  this._markModified();
  return ret;
};

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
StorageArray.prototype.addToSet = function addToSet () {
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
};

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
StorageArray.prototype.set = function (i, val) {
  this[i] = this._cast(val);
  this._markModified(i);
  return this;
};

/**
 * Returns a native js Array.
 *
 * @param {Object} options
 * @return {Array}
 * @api public
 */
StorageArray.prototype.toObject = function (options) {
  if (options && options.depopulate) {
    return this.map(function (doc) {
      return doc instanceof Document
        ? doc.toObject(options)
        : doc
    });
  }

  return this.slice();
};


/**
 * Return the index of `obj` or `-1` if not found.
 *
 * @param {Object} obj the item to look for
 * @return {Number}
 * @api public
 */
StorageArray.prototype.indexOf = function indexOf (obj) {
  if (obj instanceof ObjectId) obj = obj.toString();
  for (var i = 0, len = this.length; i < len; ++i) {
    if (obj == this[i])
      return i;
  }
  return -1;
};

/*!
 * Module exports.
 */

module.exports = StorageArray;

},{"../document":2,"../utils":29,"./embedded":26,"./objectid":28}],25:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var StorageArray = _dereq_('./array')
  , ObjectId = _dereq_('./objectid')
  , ObjectIdSchema = _dereq_('../schema/objectid')
  , utils = _dereq_('../utils')
  , Document = _dereq_('../document');

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
  arr.__proto__ = StorageDocumentArray.prototype;

  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    // Проброс изменения состояния в поддокумент
    doc.on('save', arr.notify('save'));
    doc.on('isNew', arr.notify('isNew'));
  }

  return arr;
}

/*!
 * Inherits from StorageArray
 */
StorageDocumentArray.prototype.__proto__ = StorageArray.prototype;

/**
 * Overrides StorageArray#cast
 *
 * @api private
 */
StorageDocumentArray.prototype._cast = function (value) {
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
StorageDocumentArray.prototype.id = function (id) {
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
    } else if (!(_id instanceof ObjectID)) {
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

StorageDocumentArray.prototype.toObject = function (options) {
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

StorageDocumentArray.prototype.create = function (obj) {
  return new this._schema.casterConstructor(obj);
};

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */
StorageDocumentArray.prototype.notify = function notify (event) {
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

},{"../document":2,"../schema/objectid":20,"../utils":29,"./array":24,"./objectid":28}],26:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var Document = _dereq_('../document');

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

EmbeddedDocument.prototype.__proto__ = Document.prototype;

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

},{"../document":2}],27:[function(_dereq_,module,exports){

/*!
 * Module exports.
 */

exports.Array = _dereq_('./array');

exports.Embedded = _dereq_('./embedded');

exports.DocumentArray = _dereq_('./documentarray');
exports.ObjectId = _dereq_('./objectid');

},{"./array":24,"./documentarray":25,"./embedded":26,"./objectid":28}],28:[function(_dereq_,module,exports){
// Regular expression that checks for hex value
var rcheckForHex = new RegExp("^[0-9a-fA-F]{24}$");

/**
* Create a new ObjectId instance
*
* @param {String} [id] Can be a 24 byte hex string.
* @return {Object} instance of ObjectId.
*/
function ObjectId( id ) {
  // Конструктор можно использовать без new
  if (!(this instanceof ObjectId)) return new ObjectId( id );
  //if ( id instanceof ObjectId ) return id;

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
}

// Private array of chars to use
ObjectId.prototype.CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

//TODO: можно ли использовать большие символы A-Z?
// Generate a random ObjectId.
ObjectId.prototype.generate = function(){
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
* Return the ObjectId id as a 24 byte hex string representation
*
* @return {String} return the 24 byte hex string representation.
* @api public
*/
ObjectId.prototype.toHexString = function() {
  return this.id;
};

/**
* Converts the id into a 24 byte hex string for printing
*
* @return {String} return the 24 byte hex string representation.
* @api private
*/
ObjectId.prototype.toString = function() {
  return this.toHexString();
};

/**
* Converts to its JSON representation.
*
* @return {String} return the 24 byte hex string representation.
* @api private
*/
ObjectId.prototype.toJSON = function() {
  return this.toHexString();
};

/**
* Compares the equality of this ObjectId with `otherID`.
*
* @param {Object} otherID ObjectId instance to compare against.
* @return {Bool} the result of comparing two ObjectId's
* @api public
*/
ObjectId.prototype.equals = function equals( otherID ){
  var id = ( otherID instanceof ObjectId || otherID.toHexString )
    ? otherID.id
    : new ObjectId( otherID ).id;

  return this.id === id;
};

module.exports = ObjectId;

},{}],29:[function(_dereq_,module,exports){
(function (process,global){
/*!
 * Module dependencies.
 */

var ObjectId = _dereq_('./types/objectid')
  , mpath = _dereq_('./mpath')
  , StorageArray
  , Document

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
  if (utils.isStorageObject(a)) a = a.toObject();
  if (utils.isStorageObject(b)) b = b.toObject();

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
    switch (obj.constructor.name) {
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
  Document || (Document = _dereq_('./document'));
  StorageArray || (StorageArray = _dereq_('./types/array'));

  return v instanceof Document ||
         v instanceof StorageArray;
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


}).call(this,_dereq_("q+64fw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./document":2,"./mpath":11,"./types/array":24,"./types/objectid":28,"q+64fw":31}],30:[function(_dereq_,module,exports){

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

},{}],31:[function(_dereq_,module,exports){
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

},{}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2NvbGxlY3Rpb24uanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZG9jdW1lbnQuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZXJyb3IuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZXJyb3IvY2FzdC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9lcnJvci9tZXNzYWdlcy5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9lcnJvci92YWxpZGF0aW9uLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2Vycm9yL3ZhbGlkYXRvci5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9ldmVudHMuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvaW5kZXguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvaW50ZXJuYWwuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvbXBhdGguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9hcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvYm9vbGVhbi5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvZGF0ZS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvZG9jdW1lbnRhcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvaW5kZXguanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL21peGVkLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9udW1iZXIuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL29iamVjdGlkLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9zdHJpbmcuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hdHlwZS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zdGF0ZW1hY2hpbmUuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9lbWJlZGRlZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9vYmplY3RpZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy91dGlscy5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy92aXJ0dWFsdHlwZS5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbDBEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcblxuLy9UT0RPOiDQvdCw0L/QuNGB0LDRgtGMINC80LXRgtC+0LQgLnVwc2VydCggZG9jICkgLSDQvtCx0L3QvtCy0LvQtdC90LjQtSDQtNC+0LrRg9C80LXQvdGC0LAsINCwINC10YHQu9C4INC10LPQviDQvdC10YIsINGC0L4g0YHQvtC30LTQsNC90LjQtVxuXG4vL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0LvQvtCz0LjQutGDINGBIGFwaVJlc291cmNlICjRgdC+0YXRgNCw0L3Rj9GC0Ywg0YHRgdGL0LvQutGDINC90LAg0L3QtdCz0L4g0Lgg0LjRgdC/0L7Qu9GM0LfQvtCy0YLRjCDQv9GA0Lgg0LzQtdGC0L7QtNC1IGRvYy5zYXZlKVxuLyoqXG4gKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC60L7Qu9C70LXQutGG0LjQuS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0g0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40LhcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDQodGF0LXQvNCwINC40LvQuCDQvtCx0YrQtdC60YIg0L7Qv9C40YHQsNC90LjRjyDRgdGF0LXQvNGLXG4gKiBAcGFyYW0ge09iamVjdH0gW2FwaV0gLSDRgdGB0YvQu9C60LAg0L3QsCBhcGkg0YDQtdGB0YPRgNGBXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ29sbGVjdGlvbiAoIG5hbWUsIHNjaGVtYSwgYXBpICl7XG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L3QsNC30LLQsNC90LjQtSDQv9GA0L7RgdGC0YDQsNC90YHRgtCy0LAg0LjQvNGR0L1cbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgLy8g0KXRgNCw0L3QuNC70LjRidC1INC00LvRjyDQtNC+0LrRg9C80LXQvdGC0L7QslxuICB0aGlzLmRvY3VtZW50cyA9IHt9O1xuXG4gIGlmICggXy5pc09iamVjdCggc2NoZW1hICkgJiYgISggc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICkgKSB7XG4gICAgc2NoZW1hID0gbmV3IFNjaGVtYSggc2NoZW1hICk7XG4gIH1cblxuICAvLyDQodC+0YXRgNCw0L3QuNC8INGB0YHRi9C70LrRgyDQvdCwIGFwaSDQtNC70Y8g0LzQtdGC0L7QtNCwIC5zYXZlKClcbiAgdGhpcy5hcGkgPSBhcGk7XG5cbiAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10LzQsNGPINGB0YXQtdC80LAg0LTQu9GPINC60L7Qu9C70LXQutGG0LjQuFxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcblxuICAvLyDQntGC0L7QsdGA0LDQttC10L3QuNC1INC+0LHRitC10LrRgtCwIGRvY3VtZW50cyDQsiDQstC40LTQtSDQvNCw0YHRgdC40LLQsCAo0LTQu9GPINC90L7QutCw0YPRgtCwKVxuICB0aGlzLmFycmF5ID0gW107XG4gIGtvLnRyYWNrKCB0aGlzLCBbJ2FycmF5J10gKTtcbn1cblxuQ29sbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LjQu9C4INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7Qsi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IHR5cGU6ICdqZWxseSBiZWFuJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZChbeyB0eXBlOiAnamVsbHkgYmVhbicgfSwgeyB0eXBlOiAnc25pY2tlcnMnIH1dKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxBcnJheS48b2JqZWN0Pn0gW2RvY10gLSDQlNC+0LrRg9C80LXQvdGCXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAgICogQHBhcmFtIHtib29sZWFufSBbX3N0b3JhZ2VXaWxsTXV0YXRlXSAtINCk0LvQsNCzINC00L7QsdCw0LLQu9C10L3QuNGPINC80LDRgdGB0LjQstCwINC00L7QutGD0LzQtdC90YLQvtCyLiDRgtC+0LvRjNC60L4g0LTQu9GPINCy0L3Rg9GC0YDQtdC90L3QtdCz0L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Y9cbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggZG9jLCBmaWVsZHMsIGluaXQsIF9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YLQsCDQvdC10YIsINC30L3QsNGH0LjRgiDQsdGD0LTQtdGCINC/0YPRgdGC0L7QuVxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xuXG4gICAgLy8g0JzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XG4gICAgICB2YXIgc2F2ZWREb2NzID0gW107XG5cbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XG4gICAgICAgIHNhdmVkRG9jcy5wdXNoKCBzZWxmLmFkZCggZG9jLCBmaWVsZHMsIGluaXQsIHRydWUgKSApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcblxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YIg0YPQttC1INC10YHRgtGMLCDRgtC+INC/0YDQvtGB0YLQviDRg9GB0YLQsNC90L7QstC40YLRjCDQt9C90LDRh9C10L3QuNGPXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0uc2V0KCBkb2MgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlzY3JpbWluYXRvck1hcHBpbmcgPSB0aGlzLnNjaGVtYVxuICAgICAgICA/IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nXG4gICAgICAgIDogbnVsbDtcblxuICAgICAgdmFyIGtleSA9IGRpc2NyaW1pbmF0b3JNYXBwaW5nICYmIGRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdFxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxuICAgICAgICA6IG51bGw7XG5cbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcbiAgICAgIHZhciBzY2hlbWE7XG4gICAgICBpZiAoa2V5ICYmIGRvYyAmJiBkb2Nba2V5XSAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9ycyAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV0pIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gICAgICBpZCA9IG5ld0RvYy5faWQudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCBNaXhlZFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL21peGVkJylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBWYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vc2NoZW1hdHlwZScpLlZhbGlkYXRvckVycm9yXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBjbG9uZSA9IHV0aWxzLmNsb25lXG4gICwgVmFsaWRhdGlvbkVycm9yID0gU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvclxuICAsIEludGVybmFsQ2FjaGUgPSByZXF1aXJlKCcuL2ludGVybmFsJylcbiAgLCBkZWVwRXF1YWwgPSB1dGlscy5kZWVwRXF1YWxcbiAgLCBEb2N1bWVudEFycmF5XG4gICwgU2NoZW1hQXJyYXlcbiAgLCBFbWJlZGRlZFxuXG4vKipcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LTQvtC60YPQvNC10L3RgtCwLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0g0LfQvdCw0YfQtdC90LjRjywg0LrQvtGC0L7RgNGL0LUg0L3Rg9C20L3QviDRg9GB0YLQsNC90L7QstC40YLRjFxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY29sbGVjdGlvbk5hbWVdIC0g0LrQvtC70LvQtdC60YbQuNGPINCyINC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0L3QsNGF0L7QtNC40YLRgdGPINC00L7QutGD0LzQtdC90YJcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDRgdGF0LXQvNCwINC/0L4g0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDRgdC+0LfQtNCw0L0g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtvYmplY3R9IFtmaWVsZHNdIC0g0LLRi9Cx0YDQsNC90L3Ri9C1INC/0L7Qu9GPINCyINC00L7QutGD0LzQtdC90YLQtSAo0L3QtSDRgNC10LDQu9C40LfQvtCy0LDQvdC+KVxuICogQHBhcmFtIHtCb29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERvY3VtZW50ICggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICl7XG4gIHRoaXMuaXNOZXcgPSB0cnVlO1xuXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQodHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgZGF0YSApe1xuICAgIGluaXQgPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0LTQvtC60YPQvNC10L3RgiDRgSDRhNC70LDQs9C+0LwgaW5pdFxuICAvLyBuZXcgVGVzdERvY3VtZW50KHsgdGVzdDogJ2Jvb20nIH0sIHRydWUpO1xuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGNvbGxlY3Rpb25OYW1lICl7XG4gICAgaW5pdCA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIGNvbGxlY3Rpb25OYW1lID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1XG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xuICAgIHNjaGVtYSA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG5cbiAgICBpZiAoIHNjaGVtYS5vcHRpb25zLl9pZCApe1xuICAgICAgZGF0YSA9IHsgX2lkOiBuZXcgT2JqZWN0SWQoKSB9O1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxuICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hIHx8IHNjaGVtYTtcbiAgICAvLyDQodCz0LXQvdC10YDQuNGA0L7QstCw0YLRjCBPYmplY3RJZCwg0LXRgdC70Lgg0L7QvSDQvtGC0YHRg9GC0YHRgtCy0YPQtdGCINC4INC10LPQviDRgtGA0LXQsdGD0LXRgiDRgdGF0LXQvNCwXG4gICAgaWYgKCAhdGhpcy5zY2hlbWEgJiYgc2NoZW1hLm9wdGlvbnMuX2lkICl7XG4gICAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgICAgaWYgKCAhZGF0YS5faWQgKXtcbiAgICAgICAgZGF0YS5faWQgPSBuZXcgT2JqZWN0SWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoICFzY2hlbWEgKXtcbiAgICAvL3RvZG86IHRocm93IG5ldyBtb25nb29zZS5FcnJvci5NaXNzaW5nU2NoZW1hRXJyb3IobmFtZSk7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J3QtdC70YzQt9GPINGB0L7Qt9C00LDQstCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINCx0LXQtyDRgdGF0LXQvNGLJyk7XG4gIH1cblxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgdGhpcy5jb2xsZWN0aW9uID0gc3RvcmFnZVsgY29sbGVjdGlvbk5hbWUgXTtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuXG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgaWYgKCBkYXRhID09IG51bGwgfHwgIWRhdGEuX2lkICl7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQlNC70Y8g0L/QvtC80LXRidC10L3QuNGPINCyINC60L7Qu9C70LXQutGG0LjRjiDQvdC10L7QsdGF0L7QtNC40LzQviwg0YfRgtC+0LHRiyDRgyDQtNC+0LrRg9C80LXQvdGC0LAg0LHRi9C7IF9pZCcpO1xuICAgIH1cbiAgICAvLyDQn9C+0LzQtdGB0YLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQsiDQutC+0LvQu9C10LrRhtC40Y5cbiAgICB0aGlzLmNvbGxlY3Rpb24uZG9jdW1lbnRzWyBkYXRhLl9pZCBdID0gdGhpcztcbiAgfVxuXG4gIHRoaXMuJF9fID0gbmV3IEludGVybmFsQ2FjaGU7XG4gIHRoaXMuJF9fLnN0cmljdE1vZGUgPSBzY2hlbWEub3B0aW9ucyAmJiBzY2hlbWEub3B0aW9ucy5zdHJpY3Q7XG4gIHRoaXMuJF9fLnNlbGVjdGVkID0gZmllbGRzO1xuXG4gIHZhciByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZFBhdGhzKCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVxdWlyZWQubGVuZ3RoOyArK2kpIHtcbiAgICB0aGlzLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKCByZXF1aXJlZFtpXSApO1xuICB9XG5cbiAgdGhpcy4kX19zZXRTY2hlbWEoIHNjaGVtYSApO1xuXG4gIHRoaXMuX2RvYyA9IHRoaXMuJF9fYnVpbGREb2MoIGRhdGEsIGluaXQgKTtcblxuICBpZiAoIGluaXQgKXtcbiAgICB0aGlzLmluaXQoIGRhdGEgKTtcbiAgfSBlbHNlIGlmICggZGF0YSApIHtcbiAgICB0aGlzLnNldCggZGF0YSwgdW5kZWZpbmVkLCB0cnVlICk7XG4gIH1cblxuICAvLyBhcHBseSBtZXRob2RzXG4gIGZvciAoIHZhciBtIGluIHNjaGVtYS5tZXRob2RzICl7XG4gICAgdGhpc1sgbSBdID0gc2NoZW1hLm1ldGhvZHNbIG0gXTtcbiAgfVxuICAvLyBhcHBseSBzdGF0aWNzXG4gIGZvciAoIHZhciBzIGluIHNjaGVtYS5zdGF0aWNzICl7XG4gICAgdGhpc1sgcyBdID0gc2NoZW1hLnN0YXRpY3NbIHMgXTtcbiAgfVxufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gRXZlbnRFbWl0dGVyLlxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuX19wcm90b19fID0gRXZlbnRzLnByb3RvdHlwZTtcblxuLyoqXG4gKiBUaGUgZG9jdW1lbnRzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IHNjaGVtYVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2NoZW1hO1xuXG4vKipcbiAqIEJvb2xlYW4gZmxhZyBzcGVjaWZ5aW5nIGlmIHRoZSBkb2N1bWVudCBpcyBuZXcuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBpc05ld1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNOZXc7XG5cbi8qKlxuICogVGhlIHN0cmluZyB2ZXJzaW9uIG9mIHRoaXMgZG9jdW1lbnRzIF9pZC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIGdldHRlciBleGlzdHMgb24gYWxsIGRvY3VtZW50cyBieSBkZWZhdWx0LiBUaGUgZ2V0dGVyIGNhbiBiZSBkaXNhYmxlZCBieSBzZXR0aW5nIHRoZSBgaWRgIFtvcHRpb25dKC9kb2NzL2d1aWRlLmh0bWwjaWQpIG9mIGl0cyBgU2NoZW1hYCB0byBmYWxzZSBhdCBjb25zdHJ1Y3Rpb24gdGltZS5cbiAqXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IGlkOiBmYWxzZSB9KTtcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBTY2hlbWEgb3B0aW9ucyAvZG9jcy9ndWlkZS5odG1sI29wdGlvbnNcbiAqIEBwcm9wZXJ0eSBpZFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaWQ7XG5cbi8qKlxuICogSGFzaCBjb250YWluaW5nIGN1cnJlbnQgdmFsaWRhdGlvbiBlcnJvcnMuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqIEBwcm9wZXJ0eSBlcnJvcnNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmVycm9ycztcblxuLyoqXG4gKiBCdWlsZHMgdGhlIGRlZmF1bHQgZG9jIHN0cnVjdHVyZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3NraXBJZF1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19idWlsZERvY1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19idWlsZERvYyA9IGZ1bmN0aW9uICggb2JqLCBza2lwSWQgKSB7XG4gIHZhciBkb2MgPSB7fVxuICAgICwgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT0gcCApIHtcbiAgICAgIGlmICggc2tpcElkICkgY29udGludWU7XG4gICAgICBpZiAoIG9iaiAmJiAnX2lkJyBpbiBvYmogKSBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cbiAgICAgICwgcGF0aCA9IHAuc3BsaXQoJy4nKVxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxuICAgICAgLCBkb2NfID0gZG9jXG4gICAgICAsIGkgPSAwO1xuXG4gICAgZm9yICggOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cbiAgICAgICAgLCBkZWZhdWx0VmFsO1xuXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcblxuICAgICAgICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkZWZhdWx0VmFsICkge1xuICAgICAgICAgIGRvY19bIHBpZWNlIF0gPSBkZWZhdWx0VmFsO1xuICAgICAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmRlZmF1bHQoIHAgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jXyA9IGRvY19bIHBpZWNlIF0gfHwgKCBkb2NfWyBwaWVjZSBdID0ge30gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZG9jO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgZG9jdW1lbnQgd2l0aG91dCBzZXR0ZXJzIG9yIG1hcmtpbmcgYW55dGhpbmcgbW9kaWZpZWQuXG4gKlxuICogQ2FsbGVkIGludGVybmFsbHkgYWZ0ZXIgYSBkb2N1bWVudCBpcyByZXR1cm5lZCBmcm9tIHNlcnZlci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBkb2N1bWVudCByZXR1cm5lZCBieSBzZXJ2ZXJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICggZGF0YSApIHtcbiAgdGhpcy5pc05ldyA9IGZhbHNlO1xuXG4gIC8vdG9kbzog0YHQtNC10YHRjCDQstGB0ZEg0LjQt9C80LXQvdC40YLRgdGPLCDRgdC80L7RgtGA0LXRgtGMINC60L7QvNC80LXQvdGCINC80LXRgtC+0LTQsCB0aGlzLnBvcHVsYXRlZFxuICAvLyBoYW5kbGUgZG9jcyB3aXRoIHBvcHVsYXRlZCBwYXRoc1xuICAvKmlmICggZG9jLl9pZCAmJiBvcHRzICYmIG9wdHMucG9wdWxhdGVkICYmIG9wdHMucG9wdWxhdGVkLmxlbmd0aCApIHtcbiAgICB2YXIgaWQgPSBTdHJpbmcoIGRvYy5faWQgKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdHMucG9wdWxhdGVkLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgaXRlbSA9IG9wdHMucG9wdWxhdGVkWyBpIF07XG4gICAgICB0aGlzLnBvcHVsYXRlZCggaXRlbS5wYXRoLCBpdGVtLl9kb2NzW2lkXSwgaXRlbSApO1xuICAgIH1cbiAgfSovXG5cbiAgaW5pdCggdGhpcywgZGF0YSwgdGhpcy5fZG9jICk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKiFcbiAqIEluaXQgaGVscGVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzZWxmIGRvY3VtZW50IGluc3RhbmNlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHJhdyBzZXJ2ZXIgZG9jXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIG9iamVjdCB3ZSBhcmUgaW5pdGlhbGl6aW5nXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gaW5pdCAoc2VsZiwgb2JqLCBkb2MsIHByZWZpeCkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopXG4gICAgLCBsZW4gPSBrZXlzLmxlbmd0aFxuICAgICwgc2NoZW1hXG4gICAgLCBwYXRoXG4gICAgLCBpO1xuXG4gIHdoaWxlIChsZW4tLSkge1xuICAgIGkgPSBrZXlzW2xlbl07XG4gICAgcGF0aCA9IHByZWZpeCArIGk7XG4gICAgc2NoZW1hID0gc2VsZi5zY2hlbWEucGF0aChwYXRoKTtcblxuICAgIGlmICghc2NoZW1hICYmIF8uaXNQbGFpbk9iamVjdCggb2JqWyBpIF0gKSAmJlxuICAgICAgICAoIW9ialtpXS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PSBvYmpbaV0uY29uc3RydWN0b3IubmFtZSkpIHtcbiAgICAgIC8vIGFzc3VtZSBuZXN0ZWQgb2JqZWN0XG4gICAgICBpZiAoIWRvY1tpXSkgZG9jW2ldID0ge307XG4gICAgICBpbml0KHNlbGYsIG9ialtpXSwgZG9jW2ldLCBwYXRoICsgJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtpXSA9PT0gbnVsbCkge1xuICAgICAgICBkb2NbaV0gPSBudWxsO1xuICAgICAgfSBlbHNlIGlmIChvYmpbaV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IGtvLmdldE9ic2VydmFibGUoIHNlbGYsIHBhdGggKTtcblxuICAgICAgICBpZiAoc2NoZW1hKSB7XG4gICAgICAgICAgc2VsZi4kX190cnkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRvY1tpXSA9IHNjaGVtYS5jYXN0KG9ialtpXSwgc2VsZiwgdHJ1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZG9jW2ldID0gb2JqW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g0KPRgdGC0LDQvdC+0LLQuNGC0Ywg0L3QsNGH0LDQu9GM0L3QvtC1INC30L3QsNGH0LXQvdC40LVcbiAgICAgICAgb2JzZXJ2YWJsZSAmJiBvYnNlcnZhYmxlKCBkb2NbaV0gKTtcbiAgICAgIH1cbiAgICAgIC8vIG1hcmsgYXMgaHlkcmF0ZWRcbiAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmluaXQocGF0aCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwYXRoLCBvciBtYW55IHBhdGhzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICAvLyBwYXRoLCB2YWx1ZVxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUpXG4gKlxuICogICAgIC8vIG9iamVjdFxuICogICAgIGRvYy5zZXQoe1xuICogICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAsIHBhdGgyIDoge1xuICogICAgICAgICAgICBwYXRoICA6IHZhbHVlXG4gKiAgICAgICAgIH1cbiAqICAgICB9KVxuICpcbiAqICAgICAvLyBvbmx5LXRoZS1mbHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBOdW1iZXIpXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIHN0cmluZ1xuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIFN0cmluZylcbiAqXG4gKiAgICAgLy8gY2hhbmdpbmcgc3RyaWN0IG1vZGUgYmVoYXZpb3JcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCB7IHN0cmljdDogZmFsc2UgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBwYXRoIHBhdGggb3Igb2JqZWN0IG9mIGtleS92YWxzIHRvIHNldFxuICogQHBhcmFtIHtNaXhlZH0gdmFsIHRoZSB2YWx1ZSB0byBzZXRcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ8ZXRjLi59IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBcIm9uLXRoZS1mbHlcIiBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbmFsbHkgc3BlY2lmeSBvcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBiZWhhdmlvciBvZiB0aGUgc2V0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgdHlwZSwgb3B0aW9ucykge1xuICBpZiAodHlwZSAmJiAnT2JqZWN0JyA9PSB0eXBlLmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICBvcHRpb25zID0gdHlwZTtcbiAgICB0eXBlID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIG1lcmdlID0gb3B0aW9ucyAmJiBvcHRpb25zLm1lcmdlXG4gICAgLCBhZGhvYyA9IHR5cGUgJiYgdHJ1ZSAhPT0gdHlwZVxuICAgICwgY29uc3RydWN0aW5nID0gdHJ1ZSA9PT0gdHlwZVxuICAgICwgYWRob2NzO1xuXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zICYmICdzdHJpY3QnIGluIG9wdGlvbnNcbiAgICA/IG9wdGlvbnMuc3RyaWN0XG4gICAgOiB0aGlzLiRfXy5zdHJpY3RNb2RlO1xuXG4gIGlmIChhZGhvYykge1xuICAgIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHMgfHwgKHRoaXMuJF9fLmFkaG9jUGF0aHMgPSB7fSk7XG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcbiAgfVxuXG4gIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIHBhdGgpIHtcbiAgICAvLyBuZXcgRG9jdW1lbnQoeyBrZXk6IHZhbCB9KVxuXG4gICAgaWYgKG51bGwgPT09IHBhdGggfHwgdW5kZWZpbmVkID09PSBwYXRoKSB7XG4gICAgICB2YXIgX3RlbXAgPSBwYXRoO1xuICAgICAgcGF0aCA9IHZhbDtcbiAgICAgIHZhbCA9IF90ZW1wO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBwcmVmaXggPSB2YWxcbiAgICAgICAgPyB2YWwgKyAnLidcbiAgICAgICAgOiAnJztcblxuICAgICAgaWYgKHBhdGggaW5zdGFuY2VvZiBEb2N1bWVudCkgcGF0aCA9IHBhdGguX2RvYztcblxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwYXRoKVxuICAgICAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICAgICAsIHBhdGh0eXBlXG4gICAgICAgICwga2V5O1xuXG5cbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgcGF0aHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwcmVmaXggKyBrZXkpO1xuICAgICAgICBpZiAobnVsbCAhPSBwYXRoW2tleV1cbiAgICAgICAgICAgIC8vIG5lZWQgdG8ga25vdyBpZiBwbGFpbiBvYmplY3QgLSBubyBCdWZmZXIsIE9iamVjdElkLCByZWYsIGV0Y1xuICAgICAgICAgICAgJiYgXy5pc1BsYWluT2JqZWN0KHBhdGhba2V5XSlcbiAgICAgICAgICAgICYmICggIXBhdGhba2V5XS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PSBwYXRoW2tleV0uY29uc3RydWN0b3IubmFtZSApXG4gICAgICAgICAgICAmJiAndmlydHVhbCcgIT0gcGF0aHR5cGVcbiAgICAgICAgICAgICYmICEoIHRoaXMuJF9fcGF0aCggcHJlZml4ICsga2V5ICkgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSApXG4gICAgICAgICAgICAmJiAhKCB0aGlzLnNjaGVtYS5wYXRoc1trZXldICYmIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0ub3B0aW9ucy5yZWYgKVxuICAgICAgICAgICl7XG5cbiAgICAgICAgICB0aGlzLnNldChwYXRoW2tleV0sIHByZWZpeCArIGtleSwgY29uc3RydWN0aW5nKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICAgIGlmICgncmVhbCcgPT09IHBhdGh0eXBlIHx8ICd2aXJ0dWFsJyA9PT0gcGF0aHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgICAgfSBlbHNlIGlmICgndGhyb3cnID09IHN0cmljdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmllbGQgYFwiICsga2V5ICsgXCJgIGlzIG5vdCBpbiBzY2hlbWEuXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCAhPT0gcGF0aFtrZXldKSB7XG4gICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgLy8gZW5zdXJlIF9zdHJpY3QgaXMgaG9ub3JlZCBmb3Igb2JqIHByb3BzXG4gIC8vIGRvY3NjaGVtYSA9IG5ldyBTY2hlbWEoeyBwYXRoOiB7IG5lc3Q6ICdzdHJpbmcnIH19KVxuICAvLyBkb2Muc2V0KCdwYXRoJywgb2JqKTtcbiAgdmFyIHBhdGhUeXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocGF0aCk7XG4gIGlmICgnbmVzdGVkJyA9PSBwYXRoVHlwZSAmJiB2YWwgJiYgXy5pc1BsYWluT2JqZWN0KHZhbCkgJiZcbiAgICAgICghdmFsLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHZhbC5jb25zdHJ1Y3Rvci5uYW1lKSkge1xuICAgIGlmICghbWVyZ2UpIHRoaXMuc2V0VmFsdWUocGF0aCwgbnVsbCk7XG4gICAgdGhpcy5zZXQodmFsLCBwYXRoLCBjb25zdHJ1Y3RpbmcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHNjaGVtYTtcbiAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICB2YXIgc3VicGF0aDtcblxuICBpZiAoJ2FkaG9jT3JVbmRlZmluZWQnID09IHBhdGhUeXBlICYmIHN0cmljdCkge1xuXG4gICAgLy8gY2hlY2sgZm9yIHJvb3RzIHRoYXQgYXJlIE1peGVkIHR5cGVzXG4gICAgdmFyIG1peGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkrMSkuam9pbignLicpO1xuICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBNaXhlZCkge1xuICAgICAgICAvLyBhbGxvdyBjaGFuZ2VzIHRvIHN1YiBwYXRocyBvZiBtaXhlZCB0eXBlc1xuICAgICAgICBtaXhlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWl4ZWQpIHtcbiAgICAgIGlmICgndGhyb3cnID09IHN0cmljdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBwYXRoICsgXCJgIGlzIG5vdCBpbiBzY2hlbWEuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoJ3ZpcnR1YWwnID09IHBhdGhUeXBlKSB7XG4gICAgc2NoZW1hID0gdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aCk7XG4gICAgc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKTtcbiAgfVxuXG4gIHZhciBwYXRoVG9NYXJrO1xuXG4gIC8vIFdoZW4gdXNpbmcgdGhlICRzZXQgb3BlcmF0b3IgdGhlIHBhdGggdG8gdGhlIGZpZWxkIG11c3QgYWxyZWFkeSBleGlzdC5cbiAgLy8gRWxzZSBtb25nb2RiIHRocm93czogXCJMRUZUX1NVQkZJRUxEIG9ubHkgc3VwcG9ydHMgT2JqZWN0XCJcblxuICBpZiAocGFydHMubGVuZ3RoIDw9IDEpIHtcbiAgICBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpICkge1xuICAgICAgc3VicGF0aCA9IHBhcnRzLnNsaWNlKDAsIGkgKyAxKS5qb2luKCcuJyk7XG4gICAgICBpZiAodGhpcy5pc0RpcmVjdE1vZGlmaWVkKHN1YnBhdGgpIC8vIGVhcmxpZXIgcHJlZml4ZXMgdGhhdCBhcmUgYWxyZWFkeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrZWQgYXMgZGlydHkgaGF2ZSBwcmVjZWRlbmNlXG4gICAgICAgICAgfHwgdGhpcy5nZXQoc3VicGF0aCkgPT09IG51bGwpIHtcbiAgICAgICAgcGF0aFRvTWFyayA9IHN1YnBhdGg7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcGF0aFRvTWFyaykgcGF0aFRvTWFyayA9IHBhdGg7XG4gIH1cblxuICAvLyBpZiB0aGlzIGRvYyBpcyBiZWluZyBjb25zdHJ1Y3RlZCB3ZSBzaG91bGQgbm90IHRyaWdnZXIgZ2V0dGVyc1xuICB2YXIgcHJpb3JWYWwgPSBjb25zdHJ1Y3RpbmdcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogdGhpcy5nZXRWYWx1ZShwYXRoKTtcblxuICBpZiAoIXNjaGVtYSB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgIHRoaXMuJF9fc2V0KHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBzaG91bGRTZXQgPSB0aGlzLiRfX3RyeShmdW5jdGlvbigpe1xuICAgIHZhbCA9IHNjaGVtYS5hcHBseVNldHRlcnModmFsLCBzZWxmLCBmYWxzZSwgcHJpb3JWYWwpO1xuICB9KTtcblxuICBpZiAoc2hvdWxkU2V0KSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2Ugc2hvdWxkIG1hcmsgdGhpcyBjaGFuZ2UgYXMgbW9kaWZpZWQuXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zaG91bGRNb2RpZnlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2hvdWxkTW9kaWZ5ID0gZnVuY3Rpb24gKFxuICAgIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCkge1xuXG4gIGlmICh0aGlzLmlzTmV3KSByZXR1cm4gdHJ1ZTtcbiAgLyppZiAodGhpcy5pc0RpcmVjdE1vZGlmaWVkKHBhdGhUb01hcmspKXtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0qL1xuXG4gIGlmICggdW5kZWZpbmVkID09PSB2YWwgJiYgIXRoaXMuaXNTZWxlY3RlZChwYXRoKSApIHtcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcbiAgICAvLyB2YWx1ZSB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT09IHZhbCAmJiBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSB7XG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF1dGlscy5kZWVwRXF1YWwodmFsLCBwcmlvclZhbCB8fCB0aGlzLmdldChwYXRoKSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8v0YLQtdGB0YIg0L3QtSDQv9GA0L7RhdC+0LTQuNGCINC40Lct0LfQsCDQvdCw0LvQuNGH0LjRjyDQu9C40YjQvdC10LPQviDQv9C+0LvRjyDQsiBzdGF0ZXMuZGVmYXVsdCAoY29tbWVudHMpXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XG4gIC8vY29uc29sZS5pbmZvKCBwYXRoLCBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICk7XG4gIC8vY29uc29sZS5sb2coIHRoaXMuJF9fLmFjdGl2ZVBhdGhzICk7XG5cbiAgLy8g0JrQvtCz0LTQsCDQvNGLINGD0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INGC0LDQutC+0LUg0LbQtSDQt9C90LDRh9C10L3QuNC1INC60LDQuiBkZWZhdWx0XG4gIC8vINCd0LUg0L/QvtC90Y/RgtC90L4g0LfQsNGH0LXQvCDQvNCw0L3Qs9GD0YHRgiDQtdCz0L4g0L7QsdC90L7QstC70Y/Qu1xuICAvKmlmICghY29uc3RydWN0aW5nICYmXG4gICAgICBudWxsICE9IHZhbCAmJlxuICAgICAgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCAmJlxuICAgICAgdXRpbHMuZGVlcEVxdWFsKHZhbCwgc2NoZW1hLmdldERlZmF1bHQodGhpcywgY29uc3RydWN0aW5nKSkgKSB7XG5cbiAgICAvL2NvbnNvbGUubG9nKCBwYXRoVG9NYXJrLCB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5ICk7XG5cbiAgICAvLyBhIHBhdGggd2l0aCBhIGRlZmF1bHQgd2FzICR1bnNldCBvbiB0aGUgc2VydmVyXG4gICAgLy8gYW5kIHRoZSB1c2VyIGlzIHNldHRpbmcgaXQgdG8gdGhlIHNhbWUgdmFsdWUgYWdhaW5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSovXG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHRoZSBhY3R1YWwgc2V0dGluZyBvZiB0aGUgdmFsdWUgYW5kIG1hcmtpbmcgdGhlIHBhdGggbW9kaWZpZWQgaWYgYXBwcm9wcmlhdGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3NldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zZXQgPSBmdW5jdGlvbiAoIHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCApIHtcbiAgdmFyIHNob3VsZE1vZGlmeSA9IHRoaXMuJF9fc2hvdWxkTW9kaWZ5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKHNob3VsZE1vZGlmeSkge1xuICAgIHRoaXMubWFya01vZGlmaWVkKHBhdGhUb01hcmssIHZhbCk7XG4gIH1cblxuICB2YXIgb2JqID0gdGhpcy5fZG9jXG4gICAgLCBpID0gMFxuICAgICwgbCA9IHBhcnRzLmxlbmd0aDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBuZXh0ID0gaSArIDFcbiAgICAgICwgbGFzdCA9IG5leHQgPT09IGw7XG5cbiAgICBpZiAoIGxhc3QgKSB7XG4gICAgICBvYmpbcGFydHNbaV1dID0gdmFsO1xuXG4gICAgICB2YXIgb2JzZXJ2YWJsZSA9IGtvLmdldE9ic2VydmFibGUoIHRoaXMsIHBhdGggKTtcblxuICAgICAgLy9UT0RPOiDQmNC90L7Qs9C00LAgb2JzZXJ2YWJsZSA9PT0gbnVsbCwg0L/QvtC90Y/RgtGMINC/0L7Rh9C10LzRgyDRgtCw0Log0L/QvtGA0LjRgdGF0L7QtNC40YIg0Lgg0LjRgdC/0YDQsNCy0LjRgtGMINGN0YLQvlxuICAgICAgLy9jb25zb2xlLmxvZyggcGF0aCwgb2JzZXJ2YWJsZSApO1xuXG4gICAgICAvLyDQntCx0L3QvtCy0LjQvCBvYnNlcnZhYmxlICjRh9GC0L7QsdGLINGA0LDQsdC+0YLQsNC70Lgg0L/RgNC40LLRj9C30LrQuClcbiAgICAgIG9ic2VydmFibGUgJiYgb2JzZXJ2YWJsZSggdmFsICk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ09iamVjdCcgPT09IG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ0VtYmVkZGVkRG9jdW1lbnQnID09PSBvYmpbcGFydHNbaV1dLmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmIEFycmF5LmlzQXJyYXkob2JqW3BhcnRzW2ldXSkpIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0gb2JqW3BhcnRzW2ldXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBHZXRzIGEgcmF3IHZhbHVlIGZyb20gYSBwYXRoIChubyBnZXR0ZXJzKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHV0aWxzLmdldFZhbHVlKHBhdGgsIHRoaXMuX2RvYyk7XG59O1xuXG4vKipcbiAqIFNldHMgYSByYXcgdmFsdWUgZm9yIGEgcGF0aCAobm8gY2FzdGluZywgc2V0dGVycywgdHJhbnNmb3JtYXRpb25zKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsdWUpIHtcbiAgdXRpbHMuc2V0VmFsdWUocGF0aCwgdmFsdWUsIHRoaXMuX2RvYyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBhIHBhdGguXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gcGF0aFxuICogICAgIGRvYy5nZXQoJ2FnZScpIC8vIDQ3XG4gKlxuICogICAgIC8vIGR5bmFtaWMgY2FzdGluZyB0byBhIHN0cmluZ1xuICogICAgIGRvYy5nZXQoJ2FnZScsIFN0cmluZykgLy8gXCI0N1wiXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ9IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBvbi10aGUtZmx5IGF0dHJpYnV0ZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocGF0aCwgdHlwZSkge1xuICB2YXIgYWRob2NzO1xuICBpZiAodHlwZSkge1xuICAgIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHMgfHwgKHRoaXMuJF9fLmFkaG9jUGF0aHMgPSB7fSk7XG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcbiAgfVxuXG4gIHZhciBzY2hlbWEgPSB0aGlzLiRfX3BhdGgocGF0aCkgfHwgdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aClcbiAgICAsIHBpZWNlcyA9IHBhdGguc3BsaXQoJy4nKVxuICAgICwgb2JqID0gdGhpcy5fZG9jO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGllY2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIG9iaiA9IHVuZGVmaW5lZCA9PT0gb2JqIHx8IG51bGwgPT09IG9ialxuICAgICAgPyB1bmRlZmluZWRcbiAgICAgIDogb2JqW3BpZWNlc1tpXV07XG4gIH1cblxuICBpZiAoc2NoZW1hKSB7XG4gICAgb2JqID0gc2NoZW1hLmFwcGx5R2V0dGVycyhvYmosIHRoaXMpO1xuICB9XG5cbiAgdmFyIG9ic2VydmFibGUgPSBrby5nZXRPYnNlcnZhYmxlKCB0aGlzLCBwYXRoICk7XG4gIG9ic2VydmFibGUgJiYgb2JzZXJ2YWJsZSgpO1xuXG4gIHJldHVybiBvYmo7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNjaGVtYXR5cGUgZm9yIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19wYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3BhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRoc1xuICAgICwgYWRob2NUeXBlID0gYWRob2NzICYmIGFkaG9jc1twYXRoXTtcblxuICBpZiAoYWRob2NUeXBlKSB7XG4gICAgcmV0dXJuIGFkaG9jVHlwZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5zY2hlbWEucGF0aChwYXRoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXJrcyB0aGUgcGF0aCBhcyBoYXZpbmcgcGVuZGluZyBjaGFuZ2VzIHRvIHdyaXRlIHRvIHRoZSBkYi5cbiAqXG4gKiBfVmVyeSBoZWxwZnVsIHdoZW4gdXNpbmcgW01peGVkXSguL3NjaGVtYXR5cGVzLmh0bWwjbWl4ZWQpIHR5cGVzLl9cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLm1peGVkLnR5cGUgPSAnY2hhbmdlZCc7XG4gKiAgICAgZG9jLm1hcmtNb2RpZmllZCgnbWl4ZWQudHlwZScpO1xuICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlcyB0byBtaXhlZC50eXBlIGFyZSBub3cgcGVyc2lzdGVkXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gbWFyayBtb2RpZmllZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLm1hcmtNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcbn07XG5cbi8qKlxuICogQ2F0Y2hlcyBlcnJvcnMgdGhhdCBvY2N1ciBkdXJpbmcgZXhlY3V0aW9uIG9mIGBmbmAgYW5kIHN0b3JlcyB0aGVtIHRvIGxhdGVyIGJlIHBhc3NlZCB3aGVuIGBzYXZlKClgIGlzIGV4ZWN1dGVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdIHRoZSBzY29wZSB3aXRoIHdoaWNoIHRvIGNhbGwgZm5cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX190cnlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fdHJ5ID0gZnVuY3Rpb24gKGZuLCBzY29wZSkge1xuICB2YXIgcmVzO1xuICB0cnkge1xuICAgIGZuLmNhbGwoc2NvcGUpO1xuICAgIHJlcyA9IHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aGlzLiRfX2Vycm9yKGUpO1xuICAgIHJlcyA9IGZhbHNlO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGxpc3Qgb2YgcGF0aHMgdGhhdCBoYXZlIGJlZW4gbW9kaWZpZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUubW9kaWZpZWRQYXRocyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcmVjdE1vZGlmaWVkUGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KTtcblxuICByZXR1cm4gZGlyZWN0TW9kaWZpZWRQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKGxpc3QsIHBhdGgpIHtcbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgcmV0dXJuIGxpc3QuY29uY2F0KHBhcnRzLnJlZHVjZShmdW5jdGlvbiAoY2hhaW5zLCBwYXJ0LCBpKSB7XG4gICAgICByZXR1cm4gY2hhaW5zLmNvbmNhdChwYXJ0cy5zbGljZSgwLCBpKS5jb25jYXQocGFydCkuam9pbignLicpKTtcbiAgICB9LCBbXSkpO1xuICB9LCBbXSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGRvY3VtZW50IHdhcyBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiBJZiBgcGF0aGAgaXMgZ2l2ZW4sIGNoZWNrcyBpZiBhIHBhdGggb3IgYW55IGZ1bGwgcGF0aCBjb250YWluaW5nIGBwYXRoYCBhcyBwYXJ0IG9mIGl0cyBwYXRoIGNoYWluIGhhcyBiZWVuIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcbiAqICAgICBkb2MuaXNNb2RpZmllZCgpICAgICAgICAgICAgICAgICAgICAvLyB0cnVlXG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoJ2RvY3VtZW50cycpICAgICAgICAgLy8gdHJ1ZVxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgICAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gb3B0aW9uYWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiBwYXRoXG4gICAgPyAhIX50aGlzLm1vZGlmaWVkUGF0aHMoKS5pbmRleE9mKHBhdGgpXG4gICAgOiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zb21lKCdtb2RpZnknKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGBwYXRoYCB3YXMgZGlyZWN0bHkgc2V0IGFuZCBtb2RpZmllZCwgZWxzZSBmYWxzZS5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cy4wLnRpdGxlJykgLy8gdHJ1ZVxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAvLyBmYWxzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzRGlyZWN0TW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIGluaXRpYWxpemVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmlzSW5pdCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAocGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIHNlbGVjdGVkIGluIHRoZSBzb3VyY2UgcXVlcnkgd2hpY2ggaW5pdGlhbGl6ZWQgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBUaGluZy5maW5kT25lKCkuc2VsZWN0KCduYW1lJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnbmFtZScpIC8vIHRydWVcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnYWdlJykgIC8vIGZhbHNlXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmlzU2VsZWN0ZWQgPSBmdW5jdGlvbiBpc1NlbGVjdGVkIChwYXRoKSB7XG4gIGlmICh0aGlzLiRfXy5zZWxlY3RlZCkge1xuXG4gICAgaWYgKCdfaWQnID09PSBwYXRoKSB7XG4gICAgICByZXR1cm4gMCAhPT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xuICAgIH1cblxuICAgIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLnNlbGVjdGVkKVxuICAgICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgICAsIGluY2x1c2l2ZSA9IGZhbHNlXG4gICAgICAsIGN1cjtcblxuICAgIGlmICgxID09PSBpICYmICdfaWQnID09PSBwYXRoc1swXSkge1xuICAgICAgLy8gb25seSBfaWQgd2FzIHNlbGVjdGVkLlxuICAgICAgcmV0dXJuIDAgPT09IHRoaXMuJF9fLnNlbGVjdGVkLl9pZDtcbiAgICB9XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PSBjdXIpIGNvbnRpbnVlO1xuICAgICAgaW5jbHVzaXZlID0gISEgdGhpcy4kX18uc2VsZWN0ZWRbY3VyXTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwYXRoIGluIHRoaXMuJF9fLnNlbGVjdGVkKSB7XG4gICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgIH1cblxuICAgIGkgPSBwYXRocy5sZW5ndGg7XG4gICAgdmFyIHBhdGhEb3QgPSBwYXRoICsgJy4nO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgY3VyID0gcGF0aHNbaV07XG4gICAgICBpZiAoJ19pZCcgPT0gY3VyKSBjb250aW51ZTtcblxuICAgICAgaWYgKDAgPT09IGN1ci5pbmRleE9mKHBhdGhEb3QpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG5cbiAgICAgIGlmICgwID09PSBwYXRoRG90LmluZGV4T2YoY3VyICsgJy4nKSkge1xuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAhIGluY2x1c2l2ZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBFeGVjdXRlcyByZWdpc3RlcmVkIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIGBwcmVgIHNhdmUgYW5kIGlmIGEgdmFsaWRhdGlvbiBydWxlIGlzIHZpb2xhdGVkLCBbc2F2ZV0oI21vZGVsX01vZGVsLXNhdmUpIGlzIGFib3J0ZWQgYW5kIHRoZSBlcnJvciBpcyByZXR1cm5lZCB0byB5b3VyIGBjYWxsYmFja2AuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBpZiAoZXJyKSBoYW5kbGVFcnJvcihlcnIpO1xuICogICAgICAgZWxzZSAvLyB2YWxpZGF0aW9uIHBhc3NlZFxuICogICAgIH0pO1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxlZCBhZnRlciB2YWxpZGF0aW9uIGNvbXBsZXRlcywgcGFzc2luZyBhbiBlcnJvciBpZiBvbmUgb2NjdXJyZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gb25seSB2YWxpZGF0ZSByZXF1aXJlZCBmaWVsZHMgd2hlbiBuZWNlc3NhcnlcbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUpLmZpbHRlcihmdW5jdGlvbiAocGF0aCkge1xuICAgIGlmICghc2VsZi5pc1NlbGVjdGVkKHBhdGgpICYmICFzZWxmLmlzTW9kaWZpZWQocGF0aCkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpKTtcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCkpO1xuXG4gIGlmICgwID09PSBwYXRocy5sZW5ndGgpIHtcbiAgICBjb21wbGV0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHZhbGlkYXRpbmcgPSB7fVxuICAgICwgdG90YWwgPSAwO1xuXG4gIHBhdGhzLmZvckVhY2godmFsaWRhdGVQYXRoKTtcbiAgcmV0dXJuIHRoaXM7XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVQYXRoIChwYXRoKSB7XG4gICAgaWYgKHZhbGlkYXRpbmdbcGF0aF0pIHJldHVybjtcblxuICAgIHZhbGlkYXRpbmdbcGF0aF0gPSB0cnVlO1xuICAgIHRvdGFsKys7XG5cbiAgICB1dGlscy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKXtcbiAgICAgIHZhciBwID0gc2VsZi5zY2hlbWEucGF0aChwYXRoKTtcbiAgICAgIGlmICghcCkgcmV0dXJuIC0tdG90YWwgfHwgY29tcGxldGUoKTtcblxuICAgICAgdmFyIHZhbCA9IHNlbGYuZ2V0VmFsdWUocGF0aCk7XG4gICAgICBwLmRvVmFsaWRhdGUodmFsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBzZWxmLmludmFsaWRhdGUoXG4gICAgICAgICAgICAgIHBhdGhcbiAgICAgICAgICAgICwgZXJyXG4gICAgICAgICAgICAsIHVuZGVmaW5lZFxuICAgICAgICAgICAgLy8sIHRydWUgLy8gZW1iZWRkZWQgZG9jc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XG4gICAgICB9LCBzZWxmKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBsZXRlICgpIHtcbiAgICB2YXIgZXJyID0gc2VsZi4kX18udmFsaWRhdGlvbkVycm9yO1xuICAgIHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgICBjYiAmJiBjYihlcnIpO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cbiAqXG4gKiBUaGUgYGVycm9yTXNnYCBhcmd1bWVudCB3aWxsIGJlY29tZSB0aGUgbWVzc2FnZSBvZiB0aGUgYFZhbGlkYXRpb25FcnJvcmAuXG4gKlxuICogVGhlIGB2YWx1ZWAgYXJndW1lbnQgKGlmIHBhc3NlZCkgd2lsbCBiZSBhdmFpbGFibGUgdGhyb3VnaCB0aGUgYFZhbGlkYXRpb25FcnJvci52YWx1ZWAgcHJvcGVydHkuXG4gKlxuICogICAgIGRvYy5pbnZhbGlkYXRlKCdzaXplJywgJ211c3QgYmUgbGVzcyB0aGFuIDIwJywgMTQpO1xuXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAqICAgICAgIC8vIHByaW50c1xuICogICAgICAgeyBtZXNzYWdlOiAnVmFsaWRhdGlvbiBmYWlsZWQnLFxuICogICAgICAgICBuYW1lOiAnVmFsaWRhdGlvbkVycm9yJyxcbiAqICAgICAgICAgZXJyb3JzOlxuICogICAgICAgICAgeyBzaXplOlxuICogICAgICAgICAgICAgeyBtZXNzYWdlOiAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLFxuICogICAgICAgICAgICAgICBuYW1lOiAnVmFsaWRhdG9yRXJyb3InLFxuICogICAgICAgICAgICAgICBwYXRoOiAnc2l6ZScsXG4gKiAgICAgICAgICAgICAgIHR5cGU6ICd1c2VyIGRlZmluZWQnLFxuICogICAgICAgICAgICAgICB2YWx1ZTogMTQgfSB9IH1cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBmaWVsZCB0byBpbnZhbGlkYXRlXG4gKiBAcGFyYW0ge1N0cmluZ3xFcnJvcn0gZXJyb3JNc2cgdGhlIGVycm9yIHdoaWNoIHN0YXRlcyB0aGUgcmVhc29uIGBwYXRoYCB3YXMgaW52YWxpZFxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfE51bWJlcnxhbnl9IHZhbHVlIG9wdGlvbmFsIGludmFsaWQgdmFsdWVcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVycm9yTXNnLCB2YWx1ZSkge1xuICBpZiAoIXRoaXMuJF9fLnZhbGlkYXRpb25FcnJvcikge1xuICAgIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcyk7XG4gIH1cblxuICBpZiAoIWVycm9yTXNnIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgZXJyb3JNc2cpIHtcbiAgICBlcnJvck1zZyA9IG5ldyBWYWxpZGF0b3JFcnJvcihwYXRoLCBlcnJvck1zZywgJ3VzZXIgZGVmaW5lZCcsIHZhbHVlKTtcbiAgfVxuXG4gIGlmICh0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPT0gZXJyb3JNc2cpIHJldHVybjtcblxuICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IuZXJyb3JzW3BhdGhdID0gZXJyb3JNc2c7XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgaW50ZXJuYWwgbW9kaWZpZWQgc3RhdGUgb2YgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxuICogQG1ldGhvZCAkX19yZXNldFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX3Jlc2V0ID0gZnVuY3Rpb24gcmVzZXQgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG5cbiAgdGhpcy4kX18uYWN0aXZlUGF0aHNcbiAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgIHJldHVybiBzZWxmLmdldFZhbHVlKGkpO1xuICB9KVxuICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdmFsICYmIHZhbCBpbnN0YW5jZW9mIERvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcbiAgfSlcbiAgLmZvckVhY2goZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgdmFyIGkgPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIGRvYyA9IGFycmF5W2ldO1xuICAgICAgaWYgKCFkb2MpIGNvbnRpbnVlO1xuICAgICAgZG9jLiRfX3Jlc2V0KCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDbGVhciAnbW9kaWZ5JygnZGlydHknKSBjYWNoZVxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5jbGVhcignbW9kaWZ5Jyk7XG4gIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy5lcnJvcnMgPSB1bmRlZmluZWQ7XG4gIC8vY29uc29sZS5sb2coIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlICk7XG4gIC8vVE9ETzog0YLRg9GCXG4gIHRoaXMuc2NoZW1hLnJlcXVpcmVkUGF0aHMoKS5mb3JFYWNoKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgc2VsZi4kX18uYWN0aXZlUGF0aHMucmVxdWlyZShwYXRoKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBkaXJ0eSBwYXRocyAvIHZhbHMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2RpcnR5XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGlydHkgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgYWxsID0gdGhpcy4kX18uYWN0aXZlUGF0aHMubWFwKCdtb2RpZnknLCBmdW5jdGlvbiAocGF0aCkge1xuICAgIHJldHVybiB7IHBhdGg6IHBhdGhcbiAgICAgICAgICAgLCB2YWx1ZTogc2VsZi5nZXRWYWx1ZSggcGF0aCApXG4gICAgICAgICAgICwgc2NoZW1hOiBzZWxmLiRfX3BhdGgoIHBhdGggKSB9O1xuICB9KTtcblxuICAvLyBTb3J0IGRpcnR5IHBhdGhzIGluIGEgZmxhdCBoaWVyYXJjaHkuXG4gIGFsbC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIChhLnBhdGggPCBiLnBhdGggPyAtMSA6IChhLnBhdGggPiBiLnBhdGggPyAxIDogMCkpO1xuICB9KTtcblxuICAvLyBJZ25vcmUgXCJmb28uYVwiIGlmIFwiZm9vXCIgaXMgZGlydHkgYWxyZWFkeS5cbiAgdmFyIG1pbmltYWwgPSBbXVxuICAgICwgbGFzdFBhdGhcbiAgICAsIHRvcDtcblxuICBhbGwuZm9yRWFjaChmdW5jdGlvbiggaXRlbSApe1xuICAgIGxhc3RQYXRoID0gaXRlbS5wYXRoICsgJy4nO1xuICAgIG1pbmltYWwucHVzaChpdGVtKTtcbiAgICB0b3AgPSBpdGVtO1xuICB9KTtcblxuICB0b3AgPSBsYXN0UGF0aCA9IG51bGw7XG4gIHJldHVybiBtaW5pbWFsO1xufTtcblxuLyohXG4gKiBDb21waWxlcyBzY2hlbWFzLlxuICogKNGD0YHRgtCw0L3QvtCy0LjRgtGMINCz0LXRgtGC0LXRgNGLL9GB0LXRgtGC0LXRgNGLINC90LAg0L/QvtC70Y8g0LTQvtC60YPQvNC10L3RgtCwKVxuICovXG5mdW5jdGlvbiBjb21waWxlIChzZWxmLCB0cmVlLCBwcm90bywgcHJlZml4KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModHJlZSlcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgbGltYlxuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGxpbWIgPSB0cmVlW2tleV07XG5cbiAgICBkZWZpbmUoc2VsZlxuICAgICAgICAsIGtleVxuICAgICAgICAsICgoJ09iamVjdCcgPT09IGxpbWIuY29uc3RydWN0b3IubmFtZVxuICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMobGltYikubGVuZ3RoKVxuICAgICAgICAgICAgICAgJiYgKCFsaW1iLnR5cGUgfHwgbGltYi50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICA/IGxpbWJcbiAgICAgICAgICAgICAgIDogbnVsbClcbiAgICAgICAgLCBwcm90b1xuICAgICAgICAsIHByZWZpeFxuICAgICAgICAsIGtleXMpO1xuICB9XG59XG5cbi8qIVxuICogRGVmaW5lcyB0aGUgYWNjZXNzb3IgbmFtZWQgcHJvcCBvbiB0aGUgaW5jb21pbmcgcHJvdG90eXBlLlxuICog0YLQsNC8INC20LUsINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsCDRgdC00LXQu9Cw0LXQvCDQvdCw0LHQu9GO0LTQsNC10LzRi9C80LhcbiAqL1xuZnVuY3Rpb24gZGVmaW5lIChzZWxmLCBwcm9wLCBzdWJwcm9wcywgcHJvdG90eXBlLCBwcmVmaXgsIGtleXMpIHtcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xuICB2YXIgcGF0aCA9IChwcmVmaXggPyBwcmVmaXggKyAnLicgOiAnJykgKyBwcm9wO1xuXG4gIGlmIChzdWJwcm9wcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuJF9fLmdldHRlcnMpXG4gICAgICAgICAgICB0aGlzLiRfXy5nZXR0ZXJzID0ge307XG5cbiAgICAgICAgICBpZiAoIXRoaXMuJF9fLmdldHRlcnNbcGF0aF0pIHtcbiAgICAgICAgICAgIHZhciBuZXN0ZWQgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBzYXZlIHNjb3BlIGZvciBuZXN0ZWQgZ2V0dGVycy9zZXR0ZXJzXG4gICAgICAgICAgICBpZiAoIXByZWZpeCkgbmVzdGVkLiRfXy5zY29wZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIC8vIHNoYWRvdyBpbmhlcml0ZWQgZ2V0dGVycyBmcm9tIHN1Yi1vYmplY3RzIHNvXG4gICAgICAgICAgICAvLyB0aGluZy5uZXN0ZWQubmVzdGVkLm5lc3RlZC4uLiBkb2Vzbid0IG9jY3VyIChnaC0zNjYpXG4gICAgICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAgICAgLCBsZW4gPSBrZXlzLmxlbmd0aDtcblxuICAgICAgICAgICAgZm9yICg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAvLyBvdmVyLXdyaXRlIHRoZSBwYXJlbnRzIGdldHRlciB3aXRob3V0IHRyaWdnZXJpbmcgaXRcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5lc3RlZCwga2V5c1tpXSwge1xuICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UgICAvLyBJdCBkb2Vzbid0IHNob3cgdXAuXG4gICAgICAgICAgICAgICAgLCB3cml0YWJsZTogdHJ1ZSAgICAgIC8vIFdlIGNhbiBzZXQgaXQgbGF0ZXIuXG4gICAgICAgICAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWUgIC8vIFdlIGNhbiBPYmplY3QuZGVmaW5lUHJvcGVydHkgYWdhaW4uXG4gICAgICAgICAgICAgICAgLCB2YWx1ZTogdW5kZWZpbmVkICAgIC8vIEl0IHNoYWRvd3MgaXRzIHBhcmVudC5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5lc3RlZC50b09iamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhdGgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29tcGlsZSggc2VsZiwgc3VicHJvcHMsIG5lc3RlZCwgcGF0aCApO1xuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVyc1twYXRoXSA9IG5lc3RlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy4kX18uZ2V0dGVyc1twYXRoXTtcbiAgICAgICAgfVxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgaWYgKHYgaW5zdGFuY2VvZiBEb2N1bWVudCkgdiA9IHYudG9PYmplY3QoKTtcbiAgICAgICAgICByZXR1cm4gKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMpLnNldCggcGF0aCwgdiApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgfSBlbHNlIHtcbiAgICBTY2hlbWFBcnJheSB8fCAoU2NoZW1hQXJyYXkgPSByZXF1aXJlKCcuL3NjaGVtYS9hcnJheScpKTtcblxuICAgIHZhciBhbGxPYnNlcnZhYmxlc0Zvck9iamVjdCA9IGtvLmVzNS5nZXRBbGxPYnNlcnZhYmxlc0Zvck9iamVjdCggc2VsZiwgdHJ1ZSApLFxuICAgICAgc2NoZW1hID0gcHJvdG90eXBlLnNjaGVtYSB8fCBwcm90b3R5cGUuY29uc3RydWN0b3Iuc2NoZW1hLFxuICAgICAgaXNBcnJheSA9IHNjaGVtYS5wYXRoKCBwYXRoICkgaW5zdGFuY2VvZiBTY2hlbWFBcnJheSxcbiAgICAgIG9ic2VydmFibGUgPSBpc0FycmF5ID8ga28ub2JzZXJ2YWJsZUFycmF5KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDoga28ub2JzZXJ2YWJsZSgpO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICggKSB7IHJldHVybiB0aGlzLmdldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgpOyB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHRoaXMuc2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCwgdik7IH1cbiAgICB9KTtcblxuICAgIGFsbE9ic2VydmFibGVzRm9yT2JqZWN0WyBwYXRoIF0gPSBvYnNlcnZhYmxlO1xuXG4gICAgaWYgKCBpc0FycmF5ICkge1xuICAgICAga28uZXM1Lm5vdGlmeVdoZW5QcmVzZW50T3JGdXR1cmVBcnJheVZhbHVlc011dGF0ZSgga28sIG9ic2VydmFibGUgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NpZ25zL2NvbXBpbGVzIGBzY2hlbWFgIGludG8gdGhpcyBkb2N1bWVudHMgcHJvdG90eXBlLlxuICpcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zZXRTY2hlbWFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hID0gZnVuY3Rpb24gKCBzY2hlbWEgKSB7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICBjb21waWxlKCB0aGlzLCBzY2hlbWEudHJlZSwgdGhpcyApO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHN1YmRvY3MgKGJ5IGJmcylcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QWxsU3ViZG9jc1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBbGxTdWJkb2NzID0gZnVuY3Rpb24gKCkge1xuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xuICBFbWJlZGRlZCA9IEVtYmVkZGVkIHx8IHJlcXVpcmUoJy4vdHlwZXMvZW1iZWRkZWQnKTtcblxuICBmdW5jdGlvbiBkb2NSZWR1Y2VyKHNlZWQsIHBhdGgpIHtcbiAgICB2YXIgdmFsID0gdGhpc1twYXRoXTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaCh2YWwpO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5KVxuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gX2RvY1JlZHVjZShkb2MpIHtcbiAgICAgICAgaWYgKCFkb2MgfHwgIWRvYy5fZG9jKSByZXR1cm47XG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKGRvYyk7XG4gICAgICAgIHNlZWQgPSBPYmplY3Qua2V5cyhkb2MuX2RvYykucmVkdWNlKGRvY1JlZHVjZXIuYmluZChkb2MuX2RvYyksIHNlZWQpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHNlZWQ7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKHRoaXMpLCBbXSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBnZW5lcmljIHNhdmUgc3R1ZmYuXG4gKiB0byBzb2x2ZSAjMTQ0NiB1c2UgdXNlIGhpZXJhcmNoeSBpbnN0ZWFkIG9mIGhvb2tzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3ByZXNhdmVWYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wcmVzYXZlVmFsaWRhdGUgPSBmdW5jdGlvbiAkX19wcmVzYXZlVmFsaWRhdGUoKSB7XG4gIC8vIGlmIGFueSBkb2Muc2V0KCkgY2FsbHMgZmFpbGVkXG5cbiAgdmFyIGRvY3MgPSB0aGlzLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlKCk7XG5cbiAgdmFyIGUyID0gZG9jcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgIHJldHVybiBkb2MuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIH0pO1xuICB2YXIgZTEgPSBbdGhpcy4kX18uc2F2ZUVycm9yXS5jb25jYXQoZTIpO1xuICB2YXIgZXJyID0gZTEuZmlsdGVyKGZ1bmN0aW9uICh4KSB7cmV0dXJuIHh9KVswXTtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gbnVsbDtcblxuICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIHBhdGggdGhhdCB3ZXJlIGNoYW5nZWQgYW5kIGFyZSBhcnJheXNcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIERvY3VtZW50QXJyYXkgfHwgKERvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzL2RvY3VtZW50YXJyYXknKSk7XG5cbiAgLy8gdmFsaWRhdGUgYWxsIGRvY3VtZW50IGFycmF5cy5cbiAgcmV0dXJuIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXG4gICAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUoaSk7XG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XG4gICAgfSkucmVkdWNlKGZ1bmN0aW9uKHNlZWQsIGFycmF5KSB7XG4gICAgICByZXR1cm4gc2VlZC5jb25jYXQoYXJyYXkpO1xuICAgIH0sIFtdKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKGRvYykge3JldHVybiBkb2N9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGVycm9yXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZXJyb3JcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gIHRoaXMuJF9fLnNhdmVFcnJvciA9IGVycjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByb2R1Y2VzIGEgc3BlY2lhbCBxdWVyeSBkb2N1bWVudCBvZiB0aGUgbW9kaWZpZWQgcHJvcGVydGllcyB1c2VkIGluIHVwZGF0ZXMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2RlbHRhXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RlbHRhID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZGlydHkgPSB0aGlzLiRfX2RpcnR5KCk7XG5cbiAgdmFyIGRlbHRhID0ge31cbiAgICAsIGxlbiA9IGRpcnR5Lmxlbmd0aFxuICAgICwgZCA9IDA7XG5cbiAgZm9yICg7IGQgPCBsZW47ICsrZCkge1xuICAgIHZhciBkYXRhID0gZGlydHlbIGQgXTtcbiAgICB2YXIgdmFsdWUgPSBkYXRhLnZhbHVlO1xuXG4gICAgdmFsdWUgPSB1dGlscy5jbG9uZSh2YWx1ZSwgeyBkZXBvcHVsYXRlOiAxIH0pO1xuICAgIGRlbHRhWyBkYXRhLnBhdGggXSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIGRlbHRhO1xufTtcblxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2hhbmRsZVNhdmUgPSBmdW5jdGlvbigpe1xuICAvLyDQn9C+0LvRg9GH0LDQtdC8INGA0LXRgdGD0YDRgSDQutC+0LvQu9C10LrRhtC40LgsINC60YPQtNCwINCx0YPQtNC10Lwg0YHQvtGF0YDQsNC90Y/RgtGMINC00LDQvdC90YvQtVxuICB2YXIgcmVzb3VyY2U7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmVzb3VyY2UgPSB0aGlzLmNvbGxlY3Rpb24uYXBpO1xuICB9XG5cbiAgdmFyIGlubmVyUHJvbWlzZSA9IG5ldyAkLkRlZmVycmVkKCk7XG5cbiAgaWYgKCB0aGlzLmlzTmV3ICkge1xuICAgIC8vIHNlbmQgZW50aXJlIGRvY1xuICAgIHZhciBvYmogPSB0aGlzLnRvT2JqZWN0KHsgZGVwb3B1bGF0ZTogMSB9KTtcblxuICAgIGlmICggKCBvYmogfHwge30gKS5oYXNPd25Qcm9wZXJ0eSgnX2lkJykgPT09IGZhbHNlICkge1xuICAgICAgLy8gZG9jdW1lbnRzIG11c3QgaGF2ZSBhbiBfaWQgZWxzZSBtb25nb29zZSB3b24ndCBrbm93XG4gICAgICAvLyB3aGF0IHRvIHVwZGF0ZSBsYXRlciBpZiBtb3JlIGNoYW5nZXMgYXJlIG1hZGUuIHRoZSB1c2VyXG4gICAgICAvLyB3b3VsZG4ndCBrbm93IHdoYXQgX2lkIHdhcyBnZW5lcmF0ZWQgYnkgbW9uZ29kYiBlaXRoZXJcbiAgICAgIC8vIG5vciB3b3VsZCB0aGUgT2JqZWN0SWQgZ2VuZXJhdGVkIG15IG1vbmdvZGIgbmVjZXNzYXJpbHlcbiAgICAgIC8vIG1hdGNoIHRoZSBzY2hlbWEgZGVmaW5pdGlvbi5cbiAgICAgIGlubmVyUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdkb2N1bWVudCBtdXN0IGhhdmUgYW4gX2lkIGJlZm9yZSBzYXZpbmcnKSk7XG4gICAgICByZXR1cm4gaW5uZXJQcm9taXNlO1xuICAgIH1cblxuICAgIC8vINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQvtC60YDRg9C20LXQvdC40LUg0YLQtdGB0YLQvtCyXG4gICAgLy8g0KXQvtGC0Y8g0LzQvtC20L3QviDRgtCw0LrQuNC8INC+0LHRgNCw0LfQvtC8INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4INC40LvQuCBhcGlcbiAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb3VyY2UuY3JlYXRlKCBvYmogKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XG4gICAgfVxuXG4gICAgdGhpcy4kX19yZXNldCgpO1xuICAgIHRoaXMuaXNOZXcgPSBmYWxzZTtcbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xuICAgIC8vIE1ha2UgaXQgcG9zc2libGUgdG8gcmV0cnkgdGhlIGluc2VydFxuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3QgdHJlYXQgaXQgYXMgYSBuZXcgb2JqZWN0IG9uIGVycm9yLFxuICAgIC8vIHNpbmNlIGl0IGFscmVhZHkgZXhpc3RzXG4gICAgdGhpcy4kX18uaW5zZXJ0aW5nID0gZmFsc2U7XG5cbiAgICB2YXIgZGVsdGEgPSB0aGlzLiRfX2RlbHRhKCk7XG5cbiAgICBpZiAoICFfLmlzRW1wdHkoIGRlbHRhICkgKSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxuICAgICAgLy8g0KXQvtGC0Y8g0LzQvtC20L3QviDRgtCw0LrQuNC8INC+0LHRgNCw0LfQvtC8INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4INC40LvQuCBhcGlcbiAgICAgIGlmICggIXJlc291cmNlICl7XG4gICAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvdXJjZSggdGhpcy5pZCApLnVwZGF0ZSggZGVsdGEgKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgfVxuXG4gIHJldHVybiBpbm5lclByb21pc2U7XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBTYXZlcyB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBleGFtcGxlOlxuICpcbiAqICAgICBwcm9kdWN0LnNvbGQgPSBEYXRlLm5vdygpO1xuICogICAgIHByb2R1Y3Quc2F2ZShmdW5jdGlvbiAoZXJyLCBwcm9kdWN0LCBudW1iZXJBZmZlY3RlZCkge1xuICogICAgICAgaWYgKGVycikgLi5cbiAqICAgICB9KVxuICpcbiAqIEBkZXNjcmlwdGlvbiBUaGUgY2FsbGJhY2sgd2lsbCByZWNlaXZlIHRocmVlIHBhcmFtZXRlcnMsIGBlcnJgIGlmIGFuIGVycm9yIG9jY3VycmVkLCBgcHJvZHVjdGAgd2hpY2ggaXMgdGhlIHNhdmVkIGBwcm9kdWN0YCwgYW5kIGBudW1iZXJBZmZlY3RlZGAgd2hpY2ggd2lsbCBiZSAxIHdoZW4gdGhlIGRvY3VtZW50IHdhcyBmb3VuZCBhbmQgdXBkYXRlZCBpbiB0aGUgZGF0YWJhc2UsIG90aGVyd2lzZSAwLlxuICpcbiAqIFRoZSBgZm5gIGNhbGxiYWNrIGlzIG9wdGlvbmFsLiBJZiBubyBgZm5gIGlzIHBhc3NlZCBhbmQgdmFsaWRhdGlvbiBmYWlscywgdGhlIHZhbGlkYXRpb24gZXJyb3Igd2lsbCBiZSBlbWl0dGVkIG9uIHRoZSBjb25uZWN0aW9uIHVzZWQgdG8gY3JlYXRlIHRoaXMgbW9kZWwuXG4gKiBAZXhhbXBsZTpcbiAqICAgICB2YXIgZGIgPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKiAgICAgdmFyIFByb2R1Y3QgPSBkYi5tb2RlbCgnUHJvZHVjdCcsIHNjaGVtYSk7XG4gKlxuICogICAgIGRiLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAZGVzY3JpcHRpb24gSG93ZXZlciwgaWYgeW91IGRlc2lyZSBtb3JlIGxvY2FsIGVycm9yIGhhbmRsaW5nIHlvdSBjYW4gYWRkIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8gdGhlIG1vZGVsIGFuZCBoYW5kbGUgZXJyb3JzIHRoZXJlIGluc3RlYWQuXG4gKiBAZXhhbXBsZTpcbiAqICAgICBQcm9kdWN0Lm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqXG4gKiBAZGVzY3JpcHRpb24gQXMgYW4gZXh0cmEgbWVhc3VyZSBvZiBmbG93IGNvbnRyb2wsIHNhdmUgd2lsbCByZXR1cm4gYSBQcm9taXNlIChib3VuZCB0byBgZm5gIGlmIHBhc3NlZCkgc28gaXQgY291bGQgYmUgY2hhaW5lZCwgb3IgaG9vayB0byByZWNpdmUgZXJyb3JzXG4gKiBAZXhhbXBsZTpcbiAqICAgICBwcm9kdWN0LnNhdmUoKS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0LCBudW1iZXJBZmZlY3RlZCkge1xuICogICAgICAgIC4uLlxuICogICAgIH0pLm9uUmVqZWN0ZWQoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgIGFzc2VydC5vayhlcnIpXG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGVyciwgcHJvZHVjdCwgTnVtYmVyKX0gW2RvbmVdIG9wdGlvbmFsIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlXG4gKiBAYXBpIHB1YmxpY1xuICogQHNlZSBtaWRkbGV3YXJlIGh0dHA6Ly9tb25nb29zZWpzLmNvbS9kb2NzL21pZGRsZXdhcmUuaHRtbFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uICggZG9uZSApIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZmluYWxQcm9taXNlID0gbmV3ICQuRGVmZXJyZWQoKS5kb25lKCBkb25lICk7XG5cbiAgLy8g0KHQvtGF0YDQsNC90Y/RgtGMINC00L7QutGD0LzQtdC90YIg0LzQvtC20L3QviDRgtC+0LvRjNC60L4g0LXRgdC70Lgg0L7QvSDQvdCw0YXQvtC00LjRgtGB0Y8g0LIg0LrQvtC70LvQtdC60YbQuNC4XG4gIGlmICggIXRoaXMuY29sbGVjdGlvbiApe1xuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGFyZ3VtZW50cyApO1xuICAgIGNvbnNvbGUuZXJyb3IoJ0RvY3VtZW50LnNhdmUgYXBpIGhhbmRsZSBpcyBub3QgaW1wbGVtZW50ZWQuJyk7XG4gICAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGZvciBwcmVTYXZlIGVycm9ycyAo0YLQvtGH0L4g0LfQvdCw0Y4sINGH0YLQviDQvtC90LAg0L/RgNC+0LLQtdGA0Y/QtdGCINC+0YjQuNCx0LrQuCDQsiDQvNCw0YHRgdC40LLQsNGFIChDYXN0RXJyb3IpKVxuICB2YXIgcHJlU2F2ZUVyciA9IHNlbGYuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIGlmICggcHJlU2F2ZUVyciApIHtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBwcmVTYXZlRXJyICk7XG4gICAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlXG4gIHZhciBwMCA9IG5ldyAkLkRlZmVycmVkKCk7XG4gIHNlbGYudmFsaWRhdGUoZnVuY3Rpb24oIGVyciApe1xuICAgIGlmICggZXJyICl7XG4gICAgICBwMC5yZWplY3QoIGVyciApO1xuICAgICAgZmluYWxQcm9taXNlLnJlamVjdCggZXJyICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHAwLnJlc29sdmUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vINCh0L3QsNGH0LDQu9CwINC90LDQtNC+INGB0L7RhdGA0LDQvdC40YLRjCDQstGB0LUg0L/QvtC00LTQvtC60YPQvNC10L3RgtGLINC4INGB0LTQtdC70LDRgtGMIHJlc29sdmUhISFcbiAgLy8gQ2FsbCBzYXZlIGhvb2tzIG9uIHN1YmRvY3NcbiAgdmFyIHN1YkRvY3MgPSBzZWxmLiRfX2dldEFsbFN1YmRvY3MoKTtcbiAgdmFyIHdoZW5Db25kID0gc3ViRG9jcy5tYXAoZnVuY3Rpb24gKGQpIHtyZXR1cm4gZC5zYXZlKCk7fSk7XG4gIHdoZW5Db25kLnB1c2goIHAwICk7XG5cbiAgLy8g0KLQsNC6INC80Ysg0L/QtdGA0LXQtNCw0ZHQvCDQvNCw0YHRgdC40LIgcHJvbWlzZSDRg9GB0LvQvtCy0LjQuVxuICB2YXIgcDEgPSAkLndoZW4uYXBwbHkoICQsIHdoZW5Db25kICk7XG5cbiAgLy8gSGFuZGxlIHNhdmUgYW5kIHJlc3VsdHNcbiAgcDFcbiAgICAudGhlbiggdGhpcy4kX19oYW5kbGVTYXZlLmJpbmQoIHRoaXMgKSApXG4gICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBmaW5hbFByb21pc2UucmVzb2x2ZSggc2VsZiApO1xuICAgIH0sIGZ1bmN0aW9uICggZXJyICkge1xuICAgICAgLy8gSWYgdGhlIGluaXRpYWwgaW5zZXJ0IGZhaWxzIHByb3ZpZGUgYSBzZWNvbmQgY2hhbmNlLlxuICAgICAgLy8gKElmIHdlIGRpZCB0aGlzIGFsbCB0aGUgdGltZSB3ZSB3b3VsZCBicmVhayB1cGRhdGVzKVxuICAgICAgaWYgKHNlbGYuJF9fLmluc2VydGluZykge1xuICAgICAgICBzZWxmLmlzTmV3ID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5lbWl0KCdpc05ldycsIHRydWUpO1xuICAgICAgfVxuICAgICAgZmluYWxQcm9taXNlLnJlamVjdCggZXJyICk7XG4gICAgfSk7XG5cbiAgcmV0dXJuIGZpbmFsUHJvbWlzZTtcbn07XG5cbi8qZnVuY3Rpb24gYWxsIChwcm9taXNlT2ZBcnIpIHtcbiAgdmFyIHBSZXQgPSBuZXcgUHJvbWlzZTtcbiAgdGhpcy50aGVuKHByb21pc2VPZkFycikudGhlbihcbiAgICBmdW5jdGlvbiAocHJvbWlzZUFycikge1xuICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgIHZhciBlcnJTZW50aW5lbDtcbiAgICAgIGlmICghcHJvbWlzZUFyci5sZW5ndGgpIHBSZXQucmVzb2x2ZSgpO1xuICAgICAgcHJvbWlzZUFyci5mb3JFYWNoKGZ1bmN0aW9uIChwcm9taXNlLCBpbmRleCkge1xuICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgY291bnQrKztcbiAgICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICAgIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIGlmIChlcnJTZW50aW5lbCkgcmV0dXJuO1xuICAgICAgICAgICAgcmV0W2luZGV4XSA9IHZhbDtcbiAgICAgICAgICAgIC0tY291bnQ7XG4gICAgICAgICAgICBpZiAoY291bnQgPT0gMCkgcFJldC5mdWxmaWxsKHJldCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgICAgIGVyclNlbnRpbmVsID0gZXJyO1xuICAgICAgICAgICAgcFJldC5yZWplY3QoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwUmV0O1xuICAgIH1cbiAgICAsIHBSZXQucmVqZWN0LmJpbmQocFJldClcbiAgKTtcbiAgcmV0dXJuIHBSZXQ7XG59Ki9cblxuXG4vKipcbiAqIENvbnZlcnRzIHRoaXMgZG9jdW1lbnQgaW50byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0LCByZWFkeSBmb3Igc3RvcmFnZSBpbiBNb25nb0RCLlxuICpcbiAqIEJ1ZmZlcnMgYXJlIGNvbnZlcnRlZCB0byBpbnN0YW5jZXMgb2YgW21vbmdvZGIuQmluYXJ5XShodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sKSBmb3IgcHJvcGVyIHN0b3JhZ2UuXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBgZ2V0dGVyc2AgYXBwbHkgYWxsIGdldHRlcnMgKHBhdGggYW5kIHZpcnR1YWwgZ2V0dGVycylcbiAqIC0gYHZpcnR1YWxzYCBhcHBseSB2aXJ0dWFsIGdldHRlcnMgKGNhbiBvdmVycmlkZSBgZ2V0dGVyc2Agb3B0aW9uKVxuICogLSBgbWluaW1pemVgIHJlbW92ZSBlbXB0eSBvYmplY3RzIChkZWZhdWx0cyB0byB0cnVlKVxuICogLSBgdHJhbnNmb3JtYCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byBhcHBseSB0byB0aGUgcmVzdWx0aW5nIGRvY3VtZW50IGJlZm9yZSByZXR1cm5pbmdcbiAqXG4gKiAjIyMjR2V0dGVycy9WaXJ0dWFsc1xuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyBwYXRoIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSwgdmlydHVhbHM6IGZhbHNlIH0pXG4gKlxuICogRXhhbXBsZSBvZiBvbmx5IGFwcGx5aW5nIHZpcnR1YWwgZ2V0dGVyc1xuICpcbiAqICAgICBkb2MudG9PYmplY3QoeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqIEV4YW1wbGUgb2YgYXBwbHlpbmcgYm90aCBwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgZ2V0dGVyczogdHJ1ZSB9KVxuICpcbiAqIFRvIGFwcGx5IHRoZXNlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9PYmplY3RgIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cbiAqXG4gKiAgICAgc2NoZW1hLnNldCgndG9PYmplY3QnLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogIyMjI1RyYW5zZm9ybVxuICpcbiAqIFdlIG1heSBuZWVkIHRvIHBlcmZvcm0gYSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdCBiYXNlZCBvbiBzb21lIGNyaXRlcmlhLCBzYXkgdG8gcmVtb3ZlIHNvbWUgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIG9yIHJldHVybiBhIGN1c3RvbSBvYmplY3QuIEluIHRoaXMgY2FzZSB3ZSBzZXQgdGhlIG9wdGlvbmFsIGB0cmFuc2Zvcm1gIGZ1bmN0aW9uLlxuICpcbiAqIFRyYW5zZm9ybSBmdW5jdGlvbnMgcmVjZWl2ZSB0aHJlZSBhcmd1bWVudHNcbiAqXG4gKiAgICAgZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7fVxuICpcbiAqIC0gYGRvY2AgVGhlIG1vbmdvb3NlIGRvY3VtZW50IHdoaWNoIGlzIGJlaW5nIGNvbnZlcnRlZFxuICogLSBgcmV0YCBUaGUgcGxhaW4gb2JqZWN0IHJlcHJlc2VudGF0aW9uIHdoaWNoIGhhcyBiZWVuIGNvbnZlcnRlZFxuICogLSBgb3B0aW9uc2AgVGhlIG9wdGlvbnMgaW4gdXNlIChlaXRoZXIgc2NoZW1hIG9wdGlvbnMgb3IgdGhlIG9wdGlvbnMgcGFzc2VkIGlubGluZSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBzcGVjaWZ5IHRoZSB0cmFuc2Zvcm0gc2NoZW1hIG9wdGlvblxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICAvLyByZW1vdmUgdGhlIF9pZCBvZiBldmVyeSBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZXN1bHRcbiAqICAgICAgIGRlbGV0ZSByZXQuX2lkO1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gd2l0aG91dCB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIHNjaGVtYVxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IF9pZDogJ2FuSWQnLCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiAgICAgLy8gd2l0aCB0aGUgdHJhbnNmb3JtYXRpb25cbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBXaXRoIHRyYW5zZm9ybWF0aW9ucyB3ZSBjYW4gZG8gYSBsb3QgbW9yZSB0aGFuIHJlbW92ZSBwcm9wZXJ0aWVzLiBXZSBjYW4gZXZlbiByZXR1cm4gY29tcGxldGVseSBuZXcgY3VzdG9taXplZCBvYmplY3RzOlxuICpcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgbW92aWU6IHJldC5uYW1lIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbW92aWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIF9Ob3RlOiBpZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgaWdub3JlZC5fXG4gKlxuICogVHJhbnNmb3JtYXRpb25zIG1heSBhbHNvIGJlIGFwcGxpZWQgaW5saW5lLCBvdmVycmlkZGluZyBhbnkgdHJhbnNmb3JtIHNldCBpbiB0aGUgb3B0aW9uczpcbiAqXG4gKiAgICAgZnVuY3Rpb24geGZvcm0gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICByZXR1cm4geyBpbmxpbmU6IHJldC5uYW1lLCBjdXN0b206IHRydWUgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gcGFzcyB0aGUgdHJhbnNmb3JtIGFzIGFuIGlubGluZSBvcHRpb25cbiAqICAgICBkb2MudG9PYmplY3QoeyB0cmFuc2Zvcm06IHhmb3JtIH0pOyAvLyB7IGlubGluZTogJ1dyZWNrLWl0IFJhbHBoJywgY3VzdG9tOiB0cnVlIH1cbiAqXG4gKiBfTm90ZTogaWYgeW91IGNhbGwgYHRvT2JqZWN0YCBhbmQgcGFzcyBhbnkgb3B0aW9ucywgdGhlIHRyYW5zZm9ybSBkZWNsYXJlZCBpbiB5b3VyIHNjaGVtYSBvcHRpb25zIHdpbGwgX19ub3RfXyBiZSBhcHBsaWVkLiBUbyBmb3JjZSBpdHMgYXBwbGljYXRpb24gcGFzcyBgdHJhbnNmb3JtOiB0cnVlYF9cbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC5oaWRlID0gJ19pZCc7XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XG4gKiAgICAgICBpZiAob3B0aW9ucy5oaWRlKSB7XG4gKiAgICAgICAgIG9wdGlvbnMuaGlkZS5zcGxpdCgnICcpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAqICAgICAgICAgICBkZWxldGUgcmV0W3Byb3BdO1xuICogICAgICAgICB9KTtcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfSk7XG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHsgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnIH0pOyAgICAgICAgICAgICAgICAgIC8vIHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJywgdHJhbnNmb3JtOiB0cnVlIH0pOyAvLyB7IG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqIFRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IF9hbmQgZWFjaCBvZiBpdHMgc3ViLWRvY3VtZW50c18uIFRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB5b3UgYXJlIGN1cnJlbnRseSBvcGVyYXRpbmcgb24gYSBzdWItZG9jdW1lbnQgeW91IG1pZ2h0IHVzZSB0aGUgZm9sbG93aW5nIGd1YXJkOlxuICpcbiAqICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZG9jLm93bmVyRG9jdW1lbnQpIHtcbiAqICAgICAgIC8vIHdvcmtpbmcgd2l0aCBhIHN1YiBkb2NcbiAqICAgICB9XG4gKlxuICogVHJhbnNmb3JtcywgbGlrZSBhbGwgb2YgdGhlc2Ugb3B0aW9ucywgYXJlIGFsc28gYXZhaWxhYmxlIGZvciBgdG9KU09OYC5cbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSBmb3Igc29tZSBtb3JlIGRldGFpbHMuXG4gKlxuICogX0R1cmluZyBzYXZlLCBubyBjdXN0b20gb3B0aW9ucyBhcmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgYmVmb3JlIGJlaW5nIHNlbnQgdG8gdGhlIGRhdGFiYXNlLl9cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtPYmplY3R9IGpzIG9iamVjdFxuICogQHNlZSBtb25nb2RiLkJpbmFyeSBodHRwOi8vbW9uZ29kYi5naXRodWIuY29tL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL2JpbmFyeS5odG1sXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUgJiYgdGhpcy4kX18ud2FzUG9wdWxhdGVkKSB7XG4gICAgLy8gcG9wdWxhdGVkIHBhdGhzIHRoYXQgd2Ugc2V0IHRvIGEgZG9jdW1lbnRcbiAgICByZXR1cm4gdXRpbHMuY2xvbmUodGhpcy5faWQsIG9wdGlvbnMpO1xuICB9XG5cbiAgLy8gV2hlbiBpbnRlcm5hbGx5IHNhdmluZyB0aGlzIGRvY3VtZW50IHdlIGFsd2F5cyBwYXNzIG9wdGlvbnMsXG4gIC8vIGJ5cGFzc2luZyB0aGUgY3VzdG9tIHNjaGVtYSBvcHRpb25zLlxuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IG9wdGlvbnMuY29uc3RydWN0b3IubmFtZSkpIHtcbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdFxuICAgICAgPyB1dGlscy5jbG9uZSh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KVxuICAgICAgOiB7fTtcbiAgfVxuXG4gIGlmICggb3B0aW9ucy5taW5pbWl6ZSA9PT0gdW5kZWZpbmVkICl7XG4gICAgb3B0aW9ucy5taW5pbWl6ZSA9IHRoaXMuc2NoZW1hLm9wdGlvbnMubWluaW1pemU7XG4gIH1cblxuICB2YXIgcmV0ID0gdXRpbHMuY2xvbmUodGhpcy5fZG9jLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy52aXJ0dWFscyB8fCBvcHRpb25zLmdldHRlcnMgJiYgZmFsc2UgIT09IG9wdGlvbnMudmlydHVhbHMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAndmlydHVhbHMnLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmdldHRlcnMpIHtcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAncGF0aHMnLCBvcHRpb25zKTtcbiAgICAvLyBhcHBseUdldHRlcnMgZm9yIHBhdGhzIHdpbGwgYWRkIG5lc3RlZCBlbXB0eSBvYmplY3RzO1xuICAgIC8vIGlmIG1pbmltaXplIGlzIHNldCwgd2UgbmVlZCB0byByZW1vdmUgdGhlbS5cbiAgICBpZiAob3B0aW9ucy5taW5pbWl6ZSkge1xuICAgICAgcmV0ID0gbWluaW1pemUocmV0KSB8fCB7fTtcbiAgICB9XG4gIH1cblxuICAvLyBJbiB0aGUgY2FzZSB3aGVyZSBhIHN1YmRvY3VtZW50IGhhcyBpdHMgb3duIHRyYW5zZm9ybSBmdW5jdGlvbiwgd2UgbmVlZCB0b1xuICAvLyBjaGVjayBhbmQgc2VlIGlmIHRoZSBwYXJlbnQgaGFzIGEgdHJhbnNmb3JtIChvcHRpb25zLnRyYW5zZm9ybSkgYW5kIGlmIHRoZVxuICAvLyBjaGlsZCBzY2hlbWEgaGFzIGEgdHJhbnNmb3JtICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBJbiB0aGlzIGNhc2UsXG4gIC8vIHdlIG5lZWQgdG8gYWRqdXN0IG9wdGlvbnMudHJhbnNmb3JtIHRvIGJlIHRoZSBjaGlsZCBzY2hlbWEncyB0cmFuc2Zvcm0gYW5kXG4gIC8vIG5vdCB0aGUgcGFyZW50IHNjaGVtYSdzXG4gIGlmICh0cnVlID09PSBvcHRpb25zLnRyYW5zZm9ybSB8fFxuICAgICAgKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgJiYgb3B0aW9ucy50cmFuc2Zvcm0pKSB7XG4gICAgdmFyIG9wdHMgPSBvcHRpb25zLmpzb25cbiAgICAgID8gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgIDogdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdDtcbiAgICBpZiAob3B0cykge1xuICAgICAgb3B0aW9ucy50cmFuc2Zvcm0gPSBvcHRzLnRyYW5zZm9ybTtcbiAgICB9XG4gIH1cblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICB2YXIgeGZvcm1lZCA9IG9wdGlvbnMudHJhbnNmb3JtKHRoaXMsIHJldCwgb3B0aW9ucyk7XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiB4Zm9ybWVkKSByZXQgPSB4Zm9ybWVkO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qIVxuICogTWluaW1pemVzIGFuIG9iamVjdCwgcmVtb3ZpbmcgdW5kZWZpbmVkIHZhbHVlcyBhbmQgZW1wdHkgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgdG8gbWluaW1pemVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBtaW5pbWl6ZSAob2JqKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBoYXNLZXlzXG4gICAgLCBrZXlcbiAgICAsIHZhbDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICB2YWwgPSBvYmpba2V5XTtcblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KHZhbCkgKSB7XG4gICAgICBvYmpba2V5XSA9IG1pbmltaXplKHZhbCk7XG4gICAgfVxuXG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gb2JqW2tleV0pIHtcbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGhhc0tleXMgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGhhc0tleXNcbiAgICA/IG9ialxuICAgIDogdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIEFwcGxpZXMgdmlydHVhbHMgcHJvcGVydGllcyB0byBganNvbmAuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gc2VsZlxuICogQHBhcmFtIHtPYmplY3R9IGpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIGVpdGhlciBgdmlydHVhbHNgIG9yIGBwYXRoc2BcbiAqIEByZXR1cm4ge09iamVjdH0gYGpzb25gXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlHZXR0ZXJzIChzZWxmLCBqc29uLCB0eXBlLCBvcHRpb25zKSB7XG4gIHZhciBzY2hlbWEgPSBzZWxmLnNjaGVtYVxuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyhzY2hlbWFbdHlwZV0pXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0gcGF0aHNbaV07XG5cbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcbiAgICAgICwgcGxlbiA9IHBhcnRzLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gcGxlbiAtIDFcbiAgICAgICwgYnJhbmNoID0ganNvblxuICAgICAgLCBwYXJ0O1xuXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHBsZW47ICsraWkpIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1tpaV07XG4gICAgICBpZiAoaWkgPT09IGxhc3QpIHtcbiAgICAgICAgYnJhbmNoW3BhcnRdID0gdXRpbHMuY2xvbmUoc2VsZi5nZXQocGF0aCksIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJhbmNoID0gYnJhbmNoW3BhcnRdIHx8IChicmFuY2hbcGFydF0gPSB7fSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGpzb247XG59XG5cbi8qKlxuICogVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIG1ldGhvZCBpcyB1c2VkIGluIGNhbGxzIHRvIEpTT04uc3RyaW5naWZ5KGRvYykuXG4gKlxuICogVGhpcyBtZXRob2QgYWNjZXB0cyB0aGUgc2FtZSBvcHRpb25zIGFzIFtEb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KS4gVG8gYXBwbHkgdGhlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9KU09OYCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvSlNPTicsIHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBTZWUgW3NjaGVtYSBvcHRpb25zXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgZm9yIGRldGFpbHMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBzZWUgRG9jdW1lbnQjdG9PYmplY3QgI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAvLyBjaGVjayBmb3Igb2JqZWN0IHR5cGUgc2luY2UgYW4gYXJyYXkgb2YgZG9jdW1lbnRzXG4gIC8vIGJlaW5nIHN0cmluZ2lmaWVkIHBhc3NlcyBhcnJheSBpbmRleGVzIGluc3RlYWRcbiAgLy8gb2Ygb3B0aW9ucyBvYmplY3RzLiBKU09OLnN0cmluZ2lmeShbZG9jLCBkb2NdKVxuICAvLyBUaGUgc2Vjb25kIGNoZWNrIGhlcmUgaXMgdG8gbWFrZSBzdXJlIHRoYXQgcG9wdWxhdGVkIGRvY3VtZW50cyAob3JcbiAgLy8gc3ViZG9jdW1lbnRzKSB1c2UgdGhlaXIgb3duIG9wdGlvbnMgZm9yIGAudG9KU09OKClgIGluc3RlYWQgb2YgdGhlaXJcbiAgLy8gcGFyZW50J3NcbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSBvcHRpb25zLmNvbnN0cnVjdG9yLm5hbWUpXG4gICAgICB8fCAoKCFvcHRpb25zIHx8IG9wdGlvbnMuanNvbikgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pKSB7XG5cbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pXG4gICAgICA6IHt9O1xuICB9XG4gIG9wdGlvbnMuanNvbiA9IHRydWU7XG5cbiAgcmV0dXJuIHRoaXMudG9PYmplY3Qob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgRG9jdW1lbnQgc3RvcmVzIHRoZSBzYW1lIGRhdGEgYXMgZG9jLlxuICpcbiAqIERvY3VtZW50cyBhcmUgY29uc2lkZXJlZCBlcXVhbCB3aGVuIHRoZXkgaGF2ZSBtYXRjaGluZyBgX2lkYHMuXG4gKlxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGEgZG9jdW1lbnQgdG8gY29tcGFyZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRG9jdW1lbnQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChkb2MpIHtcbiAgdmFyIHRpZCA9IHRoaXMuZ2V0KCdfaWQnKTtcbiAgdmFyIGRvY2lkID0gZG9jLmdldCgnX2lkJyk7XG4gIHJldHVybiB0aWQgJiYgdGlkLmVxdWFsc1xuICAgID8gdGlkLmVxdWFscyhkb2NpZClcbiAgICA6IHRpZCA9PT0gZG9jaWQ7XG59O1xuXG4vKipcbiAqIEdldHMgX2lkKHMpIHVzZWQgZHVyaW5nIHBvcHVsYXRpb24gb2YgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgTW9kZWwuZmluZE9uZSgpLnBvcHVsYXRlKCdhdXRob3InKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coZG9jLmF1dGhvci5uYW1lKSAgICAgICAgIC8vIERyLlNldXNzXG4gKiAgICAgICBjb25zb2xlLmxvZyhkb2MucG9wdWxhdGVkKCdhdXRob3InKSkgLy8gJzUxNDRjZjgwNTBmMDcxZDk3OWMxMThhNydcbiAqICAgICB9KVxuICpcbiAqIElmIHRoZSBwYXRoIHdhcyBub3QgcG9wdWxhdGVkLCB1bmRlZmluZWQgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fE9iamVjdElkfE51bWJlcnxCdWZmZXJ8U3RyaW5nfHVuZGVmaW5lZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5wb3B1bGF0ZWQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvcHRpb25zKSB7XG4gIC8vIHZhbCBhbmQgb3B0aW9ucyBhcmUgaW50ZXJuYWxcblxuICAvL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0Y3RgtGDINC/0YDQvtCy0LXRgNC60YMsINC+0L3QsCDQtNC+0LvQttC90LAg0L7Qv9C40YDQsNGC0YzRgdGPINC90LUg0L3QsCAkX18ucG9wdWxhdGVkLCDQsCDQvdCwINGC0L4sINGH0YLQviDQvdCw0Ygg0L7QsdGK0LXQutGCINC40LzQtdC10YIg0YDQvtC00LjRgtC10LvRj1xuICAvLyDQuCDQv9C+0YLQvtC8INGD0LbQtSDQstGL0YHRgtCw0LLQu9GP0YLRjCDRgdCy0L7QudGB0YLQstC+IHBvcHVsYXRlZCA9PSB0cnVlXG4gIGlmIChudWxsID09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHZhciB2ID0gdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdO1xuICAgIGlmICh2KSByZXR1cm4gdi52YWx1ZTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gaW50ZXJuYWxcblxuICBpZiAodHJ1ZSA9PT0gdmFsKSB7XG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgfVxuXG4gIHRoaXMuJF9fLnBvcHVsYXRlZCB8fCAodGhpcy4kX18ucG9wdWxhdGVkID0ge30pO1xuICB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF0gPSB7IHZhbHVlOiB2YWwsIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZnVsbCBwYXRoIHRvIHRoaXMgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Z1bGxQYXRoXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgLy8gb3ZlcnJpZGRlbiBpbiBTdWJEb2N1bWVudHNcbiAgcmV0dXJuIHBhdGggfHwgJyc7XG59O1xuXG4vKipcbiAqINCj0LTQsNC70LjRgtGMINC00L7QutGD0LzQtdC90YIg0Lgg0LLQtdGA0L3Rg9GC0Ywg0LrQvtC70LvQtdC60YbQuNGOLlxuICpcbiAqIEBleGFtcGxlXG4gKiBzdG9yYWdlLmNvbGxlY3Rpb24uZG9jdW1lbnQucmVtb3ZlKCk7XG4gKiBkb2N1bWVudC5yZW1vdmUoKTtcbiAqXG4gKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCl7XG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoIHRoaXMgKTtcbiAgfVxuXG4gIHJldHVybiBkZWxldGUgdGhpcztcbn07XG5cblxuLyoqXG4gKiDQntGH0LjRidCw0LXRgiDQtNC+0LrRg9C80LXQvdGCICjQstGL0YHRgtCw0LLQu9GP0LXRgiDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOINC40LvQuCB1bmRlZmluZWQpXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBkb2MgPSB0aGlzXG4gICAgLCBzZWxmID0gdGhpc1xuICAgICwgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkgY29udGludWU7XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cbiAgICAgICwgcGF0aCA9IHAuc3BsaXQoJy4nKVxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxuICAgICAgLCBkb2NfID0gZG9jXG4gICAgICAsIGkgPSAwO1xuXG4gICAgZm9yICggOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cbiAgICAgICAgLCBkZWZhdWx0VmFsO1xuXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcblxuICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbCB8fCB1bmRlZmluZWQ7XG4gICAgICAgIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLmRlZmF1bHQoIHAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbkRvY3VtZW50LlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnQ7XG4iLCIvL3RvZG86INC/0L7RgNGC0LjRgNC+0LLQsNGC0Ywg0LLRgdC1INC+0YjQuNCx0LrQuCEhIVxuLyoqXG4gKiBTdG9yYWdlRXJyb3IgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnIC0gRXJyb3IgbWVzc2FnZVxuICogQGluaGVyaXRzIEVycm9yIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0Vycm9yXG4gKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc4MzgxOC9ob3ctZG8taS1jcmVhdGUtYS1jdXN0b20tZXJyb3ItaW4tamF2YXNjcmlwdFxuICovXG5mdW5jdGlvbiBTdG9yYWdlRXJyb3IgKCBtc2cgKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1zZztcbiAgdGhpcy5uYW1lID0gJ1N0b3JhZ2VFcnJvcic7XG59XG5TdG9yYWdlRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cblxuLyohXG4gKiBGb3JtYXRzIGVycm9yIG1lc3NhZ2VzXG4gKi9cblN0b3JhZ2VFcnJvci5wcm90b3R5cGUuZm9ybWF0TWVzc2FnZSA9IGZ1bmN0aW9uIChtc2csIHBhdGgsIHR5cGUsIHZhbCkge1xuICBpZiAoIW1zZykgdGhyb3cgbmV3IFR5cGVFcnJvcignbWVzc2FnZSBpcyByZXF1aXJlZCcpO1xuXG4gIHJldHVybiBtc2cucmVwbGFjZSgve1BBVEh9LywgcGF0aClcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VkFMVUV9LywgU3RyaW5nKHZhbHx8JycpKVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tUWVBFfS8sIHR5cGUgfHwgJ2RlY2xhcmVkIHR5cGUnKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRXJyb3I7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLlxuICpcbiAqIEBzZWUgRXJyb3IubWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZUVycm9yLm1lc3NhZ2VzID0gcmVxdWlyZSgnLi9lcnJvci9tZXNzYWdlcycpO1xuXG4vKiFcbiAqIEV4cG9zZSBzdWJjbGFzc2VzXG4gKi9cblxuU3RvcmFnZUVycm9yLkNhc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvY2FzdCcpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdGlvbicpO1xuU3RvcmFnZUVycm9yLlZhbGlkYXRvckVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0b3InKTtcbi8vdG9kbzpcbi8vU3RvcmFnZUVycm9yLlZlcnNpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmVyc2lvbicpO1xuLy9TdG9yYWdlRXJyb3IuT3ZlcndyaXRlTW9kZWxFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3Ivb3ZlcndyaXRlTW9kZWwnKTtcbi8vU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xuLy9TdG9yYWdlRXJyb3IuRGl2ZXJnZW50QXJyYXlFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvZGl2ZXJnZW50QXJyYXknKTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcblxuLyoqXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDYXN0RXJyb3IgKHR5cGUsIHZhbHVlLCBwYXRoKSB7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xuICB0aGlzLm5hbWUgPSAnQ2FzdEVycm9yJztcbiAgdGhpcy5raW5kID0gdHlwZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLnBhdGggPSBwYXRoO1xufTtcblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3IuXG4gKi9cblxuQ2FzdEVycm9yLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdG9yYWdlRXJyb3IucHJvdG90eXBlO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhc3RFcnJvcjtcbiIsIlxuLyoqXG4gKiBUaGUgZGVmYXVsdCBidWlsdC1pbiB2YWxpZGF0b3IgZXJyb3IgbWVzc2FnZXMuIFRoZXNlIG1heSBiZSBjdXN0b21pemVkLlxuICpcbiAqICAgICAvLyBjdXN0b21pemUgd2l0aGluIGVhY2ggc2NoZW1hIG9yIGdsb2JhbGx5IGxpa2Ugc29cbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIG1vbmdvb3NlLkVycm9yLm1lc3NhZ2VzLlN0cmluZy5lbnVtICA9IFwiWW91ciBjdXN0b20gbWVzc2FnZSBmb3Ige1BBVEh9LlwiO1xuICpcbiAqIEFzIHlvdSBtaWdodCBoYXZlIG5vdGljZWQsIGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzaWMgdGVtcGxhdGluZ1xuICpcbiAqIC0gYHtQQVRIfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCBkb2N1bWVudCBwYXRoXG4gKiAtIGB7VkFMVUV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXG4gKiAtIGB7VFlQRX1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIHZhbGlkYXRvciB0eXBlIHN1Y2ggYXMgXCJyZWdleHBcIiwgXCJtaW5cIiwgb3IgXCJ1c2VyIGRlZmluZWRcIlxuICogLSBge01JTn1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1pbiB2YWx1ZSBmb3IgdGhlIE51bWJlci5taW4gdmFsaWRhdG9yXG4gKiAtIGB7TUFYfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWF4IHZhbHVlIGZvciB0aGUgTnVtYmVyLm1heCB2YWxpZGF0b3JcbiAqXG4gKiBDbGljayB0aGUgXCJzaG93IGNvZGVcIiBsaW5rIGJlbG93IHRvIHNlZSBhbGwgZGVmYXVsdHMuXG4gKlxuICogQHByb3BlcnR5IG1lc3NhZ2VzXG4gKiBAcmVjZWl2ZXIgTW9uZ29vc2VFcnJvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgbXNnID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxubXNnLmdlbmVyYWwgPSB7fTtcbm1zZy5nZW5lcmFsLmRlZmF1bHQgPSBcIlZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWBcIjtcbm1zZy5nZW5lcmFsLnJlcXVpcmVkID0gXCJQYXRoIGB7UEFUSH1gIGlzIHJlcXVpcmVkLlwiO1xuXG5tc2cuTnVtYmVyID0ge307XG5tc2cuTnVtYmVyLm1pbiA9IFwiUGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgaXMgbGVzcyB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZSAoe01JTn0pLlwiO1xubXNnLk51bWJlci5tYXggPSBcIlBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIG1vcmUgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUgKHtNQVh9KS5cIjtcblxubXNnLlN0cmluZyA9IHt9O1xubXNnLlN0cmluZy5lbnVtID0gXCJge1ZBTFVFfWAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBge1BBVEh9YC5cIjtcbm1zZy5TdHJpbmcubWF0Y2ggPSBcIlBhdGggYHtQQVRIfWAgaXMgaW52YWxpZCAoe1ZBTFVFfSkuXCI7XG5cbiIsIlxuLyohXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qKlxuICogRG9jdW1lbnQgVmFsaWRhdGlvbiBFcnJvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gaW5zdGFuY2VcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXG4gKi9cblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yIChpbnN0YW5jZSkge1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBcIlZhbGlkYXRpb24gZmFpbGVkXCIpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9yJztcbiAgdGhpcy5lcnJvcnMgPSBpbnN0YW5jZS5lcnJvcnMgPSB7fTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3IuXG4gKi9cblxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdG9yYWdlRXJyb3IucHJvdG90eXBlO1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0aW9uRXJyb3I7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG52YXIgZXJyb3JNZXNzYWdlcyA9IFN0b3JhZ2VFcnJvci5tZXNzYWdlcztcblxuLyoqXG4gKiBTY2hlbWEgdmFsaWRhdG9yIGVycm9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2dcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcnxhbnl9IHZhbFxuICogQGluaGVyaXRzIE1vbmdvb3NlRXJyb3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFZhbGlkYXRvckVycm9yIChwYXRoLCBtc2csIHR5cGUsIHZhbCkge1xuICBpZiAoIW1zZykgbXNnID0gZXJyb3JNZXNzYWdlcy5nZW5lcmFsLmRlZmF1bHQ7XG4gIHZhciBtZXNzYWdlID0gdGhpcy5mb3JtYXRNZXNzYWdlKG1zZywgcGF0aCwgdHlwZSwgdmFsKTtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0b3JFcnJvcic7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMua2luZCA9IHR5cGU7XG4gIHRoaXMudmFsdWUgPSB2YWw7XG59XG5cbi8qIVxuICogdG9TdHJpbmcgaGVscGVyXG4gKi9cblxuVmFsaWRhdG9yRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5tZXNzYWdlO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gTW9uZ29vc2VFcnJvclxuICovXG5cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdG9yYWdlRXJyb3IucHJvdG90eXBlO1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvckVycm9yO1xuIiwiLy8gQmFja2JvbmUuRXZlbnRzXHJcbi8vIC0tLS0tLS0tLS0tLS0tLVxyXG5cclxuLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxyXG4vLyBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrXHJcbi8vIGZ1bmN0aW9ucyB0byBhbiBldmVudDsgYHRyaWdnZXJgLWluZyBhbiBldmVudCBmaXJlcyBhbGwgY2FsbGJhY2tzIGluXHJcbi8vIHN1Y2Nlc3Npb24uXHJcbi8vXHJcbi8vICAgICB2YXIgb2JqZWN0ID0ge307XHJcbi8vICAgICBfLmV4dGVuZChvYmplY3QsIEV2ZW50cy5wcm90b3R5cGUpO1xyXG4vLyAgICAgb2JqZWN0Lm9uKCdleHBhbmQnLCBmdW5jdGlvbigpeyBhbGVydCgnZXhwYW5kZWQnKTsgfSk7XHJcbi8vICAgICBvYmplY3QudHJpZ2dlcignZXhwYW5kJyk7XHJcbi8vXHJcbmZ1bmN0aW9uIEV2ZW50cygpIHt9XHJcblxyXG5FdmVudHMucHJvdG90eXBlID0ge1xyXG5cclxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXHJcbiAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXHJcbiAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XHJcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xyXG4gICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XHJcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XHJcbiAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLy8gQmluZCBhbiBldmVudCB0byBvbmx5IGJlIHRyaWdnZXJlZCBhIHNpbmdsZSB0aW1lLiBBZnRlciB0aGUgZmlyc3QgdGltZVxyXG4gIC8vIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXHJcbiAgb25jZTogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcclxuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbmNlJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciBvbmNlID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xyXG4gICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcclxuICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgIH0pO1xyXG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcclxuICAgIHJldHVybiB0aGlzLm9uKG5hbWUsIG9uY2UsIGNvbnRleHQpO1xyXG4gIH0sXHJcblxyXG4gIC8vIFJlbW92ZSBvbmUgb3IgbWFueSBjYWxsYmFja3MuIElmIGBjb250ZXh0YCBpcyBudWxsLCByZW1vdmVzIGFsbFxyXG4gIC8vIGNhbGxiYWNrcyB3aXRoIHRoYXQgZnVuY3Rpb24uIElmIGBjYWxsYmFja2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcclxuICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXHJcbiAgLy8gY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxyXG4gIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcclxuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xyXG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIWV2ZW50c0FwaSh0aGlzLCAnb2ZmJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkpIHJldHVybiB0aGlzO1xyXG4gICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xyXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcclxuICAgIGZvciAoaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgbmFtZSA9IG5hbWVzW2ldO1xyXG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gcmV0YWluID0gW107XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrIHx8IGNvbnRleHQpIHtcclxuICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XHJcbiAgICAgICAgICAgIGV2ID0gZXZlbnRzW2pdO1xyXG4gICAgICAgICAgICBpZiAoKGNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2suX2NhbGxiYWNrKSB8fFxyXG4gICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XHJcbiAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxyXG4gIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXHJcbiAgLy8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXHJcbiAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxyXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcclxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcclxuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICd0cmlnZ2VyJywgbmFtZSwgYXJncykpIHJldHVybiB0aGlzO1xyXG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcclxuICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xyXG4gICAgaWYgKGV2ZW50cykgdHJpZ2dlckV2ZW50cyhldmVudHMsIGFyZ3MpO1xyXG4gICAgaWYgKGFsbEV2ZW50cykgdHJpZ2dlckV2ZW50cyhhbGxFdmVudHMsIGFyZ3VtZW50cyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXHJcbiAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cclxuICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbztcclxuICAgIGlmICghbGlzdGVuaW5nVG8pIHJldHVybiB0aGlzO1xyXG4gICAgdmFyIHJlbW92ZSA9ICFuYW1lICYmICFjYWxsYmFjaztcclxuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XHJcbiAgICBpZiAob2JqKSAobGlzdGVuaW5nVG8gPSB7fSlbb2JqLl9saXN0ZW5JZF0gPSBvYmo7XHJcbiAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5pbmdUbykge1xyXG4gICAgICBvYmogPSBsaXN0ZW5pbmdUb1tpZF07XHJcbiAgICAgIG9iai5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xyXG4gICAgICBpZiAocmVtb3ZlIHx8IF8uaXNFbXB0eShvYmouX2V2ZW50cykpIGRlbGV0ZSB0aGlzLl9saXN0ZW5pbmdUb1tpZF07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn07XHJcblxyXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzLlxyXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcclxuXHJcbi8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XHJcbi8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcclxuLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cclxudmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XHJcbiAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXHJcbiAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xyXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcclxuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyBIYW5kbGUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50IG5hbWVzLlxyXG4gIGlmIChldmVudFNwbGl0dGVyLnRlc3QobmFtZSkpIHtcclxuICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoZXZlbnRTcGxpdHRlcik7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtuYW1lc1tpXV0uY29uY2F0KHJlc3QpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3JcclxuLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxyXG4vLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXHJcbnZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XHJcbiAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xyXG4gIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcclxuICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XHJcbiAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcclxuICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcclxuICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XHJcbiAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XHJcblxyXG4vLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xyXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXHJcbi8vIGxpc3RlbmluZyB0by5cclxuXy5lYWNoKGxpc3Rlbk1ldGhvZHMsIGZ1bmN0aW9uKGltcGxlbWVudGF0aW9uLCBtZXRob2QpIHtcclxuICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcclxuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvIHx8ICh0aGlzLl9saXN0ZW5pbmdUbyA9IHt9KTtcclxuICAgIHZhciBpZCA9IG9iai5fbGlzdGVuSWQgfHwgKG9iai5fbGlzdGVuSWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xyXG4gICAgbGlzdGVuaW5nVG9baWRdID0gb2JqO1xyXG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcclxuICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfTtcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcclxuIiwiLyoqXG4gKiDQoNC10LDQu9C40LfQsNGG0LjQuCDRhdGA0LDQvdC40LvQuNGJ0LBcbiAqINCy0LTQvtGF0L3QvtCy0LvRkdC9IG1vbmdvb3NlIDMuOC40ICjQuNGB0L/RgNCw0LLQu9C10L3RiyDQsdCw0LPQuCDQv9C+IDMuOC4xMilcbiAqXG4gKiBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyNzZWxlY3RvcnNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3RyZWUvbWFzdGVyL3BhY2thZ2VzL21pbmltb25nb1xuICpcbiAqIGJyb3dzZXJpZnkgLS1kZWJ1ZyBzcmMvaW5kZXguanMgLS1zdGFuZGFsb25lIHN0b3JhZ2UgPiBzdG9yYWdlLmpzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4g0Lgg0L/QvtC70YPRh9C40YLRjCDQtdGRLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RvcmFnZS5TY2hlbWF8dW5kZWZpbmVkfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoICdTY2hlbWEnICE9PSBzY2hlbWEuY29uc3RydWN0b3IubmFtZSApe1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BzY2hlbWFgIG11c3QgYmUgU2NoZW1hIGluc3RhbmNlJyk7XG4gIH1cblxuICB0aGlzLmNvbGxlY3Rpb25OYW1lcy5wdXNoKCBuYW1lICk7XG5cbiAgcmV0dXJuIHRoaXNbIG5hbWUgXSA9IG5ldyBDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApO1xufTtcblxuLyoqXG4gKiDQn9C+0LvRg9GH0LjRgtGMINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC5INCyINCy0LjQtNC1INC80LDRgdGB0LjQstCwINGB0YLRgNC+0LouXG4gKlxuICogQHJldHVybnMge0FycmF5LjxzdHJpbmc+fSBBbiBhcnJheSBjb250YWluaW5nIGFsbCBjb2xsZWN0aW9ucyBpbiB0aGUgc3RvcmFnZS5cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuZ2V0Q29sbGVjdGlvbk5hbWVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbk5hbWVzO1xufTtcblxuLyoqXG4gKiBUaGUgTW9uZ29vc2UgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5Db2xsZWN0aW9uID0gQ29sbGVjdGlvbjtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSB2ZXJzaW9uXG4gKlxuICogQHByb3BlcnR5IHZlcnNpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cbi8vdG9kbzpcbi8vU3RvcmFnZS5wcm90b3R5cGUudmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtTY2hlbWFdKCNzY2hlbWFfU2NoZW1hKSBjb25zdHJ1Y3RvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBTY2hlbWEgPSBtb25nb29zZS5TY2hlbWE7XG4gKiAgICAgdmFyIENhdFNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqIEBtZXRob2QgU2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbi8vU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hID0gU2NoZW1hO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuLy9TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWFUeXBlID0gU2NoZW1hVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBNb25nb29zZSBTY2hlbWFUeXBlcy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfQWxpYXMgb2YgbW9uZ29vc2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXG4gKlxuICogQHByb3BlcnR5IFNjaGVtYVR5cGVzXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG4vL1N0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGVzID0gU2NoZW1hLlR5cGVzO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbVmlydHVhbFR5cGVdKCN2aXJ0dWFsdHlwZV9WaXJ0dWFsVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFZpcnR1YWxUeXBlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlZpcnR1YWxUeXBlID0gVmlydHVhbFR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgVHlwZXMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIGFycmF5ID0gbW9uZ29vc2UuVHlwZXMuQXJyYXk7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW09iamVjdElkXSgjdHlwZXMtb2JqZWN0aWQtanMpXG4gKiAtIFtTdWJEb2N1bWVudF0oI3R5cGVzLWVtYmVkZGVkLWpzKVxuICogLSBbQXJyYXldKCN0eXBlcy1hcnJheS1qcylcbiAqIC0gW0RvY3VtZW50QXJyYXldKCN0eXBlcy1kb2N1bWVudGFycmF5LWpzKVxuICpcbiAqIFVzaW5nIHRoaXMgZXhwb3NlZCBhY2Nlc3MgdG8gdGhlIGBPYmplY3RJZGAgdHlwZSwgd2UgY2FuIGNvbnN0cnVjdCBpZHMgb24gZGVtYW5kLlxuICpcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5UeXBlcy5PYmplY3RJZDtcbiAqICAgICB2YXIgaWQxID0gbmV3IE9iamVjdElkO1xuICpcbiAqIEBwcm9wZXJ0eSBUeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5UeXBlcyA9IFR5cGVzO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbRG9jdW1lbnRdKCNkb2N1bWVudC1qcykgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBEb2N1bWVudFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5Eb2N1bWVudCA9IERvY3VtZW50O1xuXG4vKipcbiAqIFRoZSBbTW9uZ29vc2VFcnJvcl0oI2Vycm9yX01vbmdvb3NlRXJyb3IpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblN0b3JhZ2UucHJvdG90eXBlLnV0aWxzID0gdXRpbHM7XG5TdG9yYWdlLnByb3RvdHlwZS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuU3RvcmFnZS5wcm90b3R5cGUuc2NoZW1hcyA9IFNjaGVtYS5zY2hlbWFzO1xuXG4vKlxuICogR2VuZXJhdGUgYSByYW5kb20gdXVpZC5cbiAqIGh0dHA6Ly93d3cuYnJvb2ZhLmNvbS9Ub29scy9NYXRoLnV1aWQuaHRtXG4gKiBmb3JrIE1hdGgudXVpZC5qcyAodjEuNClcbiAqXG4gKiBodHRwOi8vd3d3LmJyb29mYS5jb20vMjAwOC8wOS9qYXZhc2NyaXB0LXV1aWQtZnVuY3Rpb24vXG4gKi9cbi8qdXVpZDoge1xuICAvLyBQcml2YXRlIGFycmF5IG9mIGNoYXJzIHRvIHVzZVxuICBDSEFSUzogJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCgnJyksXG5cbiAgLy8gcmV0dXJucyBSRkM0MTIyLCB2ZXJzaW9uIDQgSURcbiAgZ2VuZXJhdGU6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNoYXJzID0gdGhpcy5DSEFSUywgdXVpZCA9IG5ldyBBcnJheSggMzYgKSwgcm5kID0gMCwgcjtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCAzNjsgaSsrICkge1xuICAgICAgaWYgKCBpID09IDggfHwgaSA9PSAxMyB8fCBpID09IDE4IHx8IGkgPT0gMjMgKSB7XG4gICAgICAgIHV1aWRbaV0gPSAnLSc7XG4gICAgICB9IGVsc2UgaWYgKCBpID09IDE0ICkge1xuICAgICAgICB1dWlkW2ldID0gJzQnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCBybmQgPD0gMHgwMiApIHJuZCA9IDB4MjAwMDAwMCArIChNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwKSB8IDA7XG4gICAgICAgIHIgPSBybmQgJiAweGY7XG4gICAgICAgIHJuZCA9IHJuZCA+PiA0O1xuICAgICAgICB1dWlkW2ldID0gY2hhcnNbKGkgPT0gMTkpID8gKHIgJiAweDMpIHwgMHg4IDogcl07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1dWlkLmpvaW4oJycpLnRvTG93ZXJDYXNlKCk7XG4gIH1cbn0qL1xuXG5cbi8qIVxuICogVGhlIGV4cG9ydHMgb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIFN0b3JhZ2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdG9yYWdlO1xuIiwiLy8g0JzQsNGI0LjQvdCwINGB0L7RgdGC0L7Rj9C90LjQuSDQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LTQu9GPINC/0L7QvNC10YLQutC4LCDQsiDQutCw0LrQvtC8INGB0L7RgdGC0L7Rj9C90LjQuCDQvdCw0YXQvtC00Y/RgtGB0Y8g0L/QvtC70LVcbi8vINCd0LDQv9GA0LjQvNC10YA6INC10YHQu9C4INC/0L7Qu9C1INC40LzQtdC10YIg0YHQvtGB0YLQvtGP0L3QuNC1IGRlZmF1bHQgLSDQt9C90LDRh9C40YIg0LXQs9C+INC30L3QsNGH0LXQvdC40LXQvCDRj9Cy0LvRj9C10YLRgdGPINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y5cbi8vINCf0YDQuNC80LXRh9Cw0L3QuNC1OiDQtNC70Y8g0LzQsNGB0YHQuNCy0L7QsiDQsiDQvtCx0YnQtdC8INGB0LvRg9GH0LDQtSDRjdGC0L4g0L7Qt9C90LDRh9Cw0LXRgiDQv9GD0YHRgtC+0Lkg0LzQsNGB0YHQuNCyXG5cbi8qIVxuICogRGVwZW5kZW5jaWVzXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IHJlcXVpcmUoJy4vc3RhdGVtYWNoaW5lJyk7XG5cbnZhciBBY3RpdmVSb3N0ZXIgPSBTdGF0ZU1hY2hpbmUuY3RvcigncmVxdWlyZScsICdtb2RpZnknLCAnaW5pdCcsICdkZWZhdWx0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJuYWxDYWNoZTtcblxuZnVuY3Rpb24gSW50ZXJuYWxDYWNoZSAoKSB7XG4gIHRoaXMuc3RyaWN0TW9kZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5zYXZlRXJyb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMudmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmFkaG9jUGF0aHMgPSB1bmRlZmluZWQ7XG4gIHRoaXMucmVtb3ZpbmcgPSB1bmRlZmluZWQ7XG4gIHRoaXMuaW5zZXJ0aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLnZlcnNpb24gPSB1bmRlZmluZWQ7XG4gIHRoaXMuZ2V0dGVycyA9IHt9O1xuICB0aGlzLl9pZCA9IHVuZGVmaW5lZDtcbiAgdGhpcy5wb3B1bGF0ZSA9IHVuZGVmaW5lZDsgLy8gd2hhdCB3ZSB3YW50IHRvIHBvcHVsYXRlIGluIHRoaXMgZG9jXG4gIHRoaXMucG9wdWxhdGVkID0gdW5kZWZpbmVkOy8vIHRoZSBfaWRzIHRoYXQgaGF2ZSBiZWVuIHBvcHVsYXRlZFxuICB0aGlzLndhc1BvcHVsYXRlZCA9IGZhbHNlOyAvLyBpZiB0aGlzIGRvYyB3YXMgdGhlIHJlc3VsdCBvZiBhIHBvcHVsYXRpb25cbiAgdGhpcy5zY29wZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hY3RpdmVQYXRocyA9IG5ldyBBY3RpdmVSb3N0ZXI7XG5cbiAgLy8gZW1iZWRkZWQgZG9jc1xuICB0aGlzLm93bmVyRG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuZnVsbFBhdGggPSB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIG9iamVjdCBgb2AgYXQgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG9iaiA9IHtcbiAqICAgICAgICAgY29tbWVudHM6IFtcbiAqICAgICAgICAgICAgIHsgdGl0bGU6ICdleGNpdGluZyEnLCBfZG9jOiB7IHRpdGxlOiAnZ3JlYXQhJyB9fVxuICogICAgICAgICAgICwgeyB0aXRsZTogJ251bWJlciBkb3MnIH1cbiAqICAgICAgICAgXVxuICogICAgIH1cbiAqXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy4wLnRpdGxlJywgbykgICAgICAgICAvLyAnZXhjaXRpbmchJ1xuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8sICdfZG9jJykgLy8gJ2dyZWF0ISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLnRpdGxlJywgbykgICAgICAgICAgIC8vIFsnZXhjaXRpbmchJywgJ251bWJlciBkb3MnXVxuICpcbiAqICAgICAvLyBzdW1tYXJ5XG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8pXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwpXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIG1hcClcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbCwgbWFwKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIGVhY2ggaW5kaXZpZHVhbCBmb3VuZCB2YWx1ZS4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxuICovXG5cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIG8sIHNwZWNpYWwsIG1hcCkge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT0gdHlwZW9mIHBhdGhcbiAgICA/IHBhdGguc3BsaXQoJy4nKVxuICAgIDogcGF0aDtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocGFydHMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBgcGF0aGAuIE11c3QgYmUgZWl0aGVyIHN0cmluZyBvciBhcnJheScpO1xuICB9XG5cbiAgdmFyIG9iaiA9IG9cbiAgICAsIHBhcnQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIC8vIHJlYWRpbmcgYSBwcm9wZXJ0eSBmcm9tIHRoZSBhcnJheSBpdGVtc1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG5cbiAgICAgIHJldHVybiBvYmoubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtXG4gICAgICAgICAgPyBleHBvcnRzLmdldChwYXRocywgaXRlbSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcClcbiAgICAgICAgICA6IG1hcCh1bmRlZmluZWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm4gbWFwKG9iaik7XG4gIH1cblxuICByZXR1cm4gbWFwKG9iaik7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgYHZhbGAgYXQgdGhlIGdpdmVuIGBwYXRoYCBvZiBvYmplY3QgYG9gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggaXMgcGFzc2VkIGVhY2ggaW5kaXZpZHVhbCB2YWx1ZSBiZWZvcmUgc2V0dGluZyBpdC4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxuICovXG5cbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbywgc3BlY2lhbCwgbWFwLCBfY29weWluZykge1xuICB2YXIgbG9va3VwO1xuXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBzcGVjaWFsKSB7XG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xuICAgICAgbWFwID0gc3BlY2lhbDtcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvb2t1cCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIG1hcCB8fCAobWFwID0gSyk7XG5cbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT0gdHlwZW9mIHBhdGhcbiAgICA/IHBhdGguc3BsaXQoJy4nKVxuICAgIDogcGF0aDtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocGFydHMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBgcGF0aGAuIE11c3QgYmUgZWl0aGVyIHN0cmluZyBvciBhcnJheScpO1xuICB9XG5cbiAgaWYgKG51bGwgPT0gbykgcmV0dXJuO1xuXG4gIC8vIHRoZSBleGlzdGFuY2Ugb2YgJCBpbiBhIHBhdGggdGVsbHMgdXMgaWYgdGhlIHVzZXIgZGVzaXJlc1xuICAvLyB0aGUgY29weWluZyBvZiBhbiBhcnJheSBpbnN0ZWFkIG9mIHNldHRpbmcgZWFjaCB2YWx1ZSBvZlxuICAvLyB0aGUgYXJyYXkgdG8gdGhlIG9uZSBieSBvbmUgdG8gbWF0Y2hpbmcgcG9zaXRpb25zIG9mIHRoZVxuICAvLyBjdXJyZW50IGFycmF5LlxuICB2YXIgY29weSA9IF9jb3B5aW5nIHx8IC9cXCQvLnRlc3QocGF0aClcbiAgICAsIG9iaiA9IG9cbiAgICAsIHBhcnRcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFydHMubGVuZ3RoIC0gMTsgaSA8IGxlbjsgKytpKSB7XG4gICAgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgaWYgKCckJyA9PSBwYXJ0KSB7XG4gICAgICBpZiAoaSA9PSBsZW4gLSAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XG4gICAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aCAmJiBqIDwgdmFsLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBzaW5nbGUgdmFsdWVzIG9mIGFycmF5XG4gICAgICAgICAgZXhwb3J0cy5zZXQocGF0aHMsIHZhbFtqXSwgb2JqW2pdLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwLCBjb3B5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBhc3NpZ25tZW50IG9mIGVudGlyZSB2YWx1ZVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWwsIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cbiAgICAgICAgOiBvYmpbcGFydF07XG4gICAgfVxuXG4gICAgaWYgKCFvYmopIHJldHVybjtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgdGhlIGxhc3QgcHJvcGVydHkgb2YgdGhlIHBhdGhcblxuICBwYXJ0ID0gcGFydHNbbGVuXTtcblxuICAvLyB1c2UgdGhlIHNwZWNpYWwgcHJvcGVydHkgaWYgZXhpc3RzXG4gIGlmIChzcGVjaWFsICYmIG9ialtzcGVjaWFsXSkge1xuICAgIG9iaiA9IG9ialtzcGVjaWFsXTtcbiAgfVxuXG4gIC8vIHNldCB0aGUgdmFsdWUgb24gdGhlIGxhc3QgYnJhbmNoXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICBpZiAoIWNvcHkgJiYgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBmb3IgKHZhciBpdGVtLCBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICBpdGVtID0gb2JqW2pdO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGlmIChsb29rdXApIHtcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsW2pdKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpdGVtW3NwZWNpYWxdKSBpdGVtID0gaXRlbVtzcGVjaWFsXTtcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsW2pdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvYmoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChsb29rdXApIHtcbiAgICAgIGxvb2t1cChvYmosIHBhcnQsIG1hcCh2YWwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW3BhcnRdID0gbWFwKHZhbCk7XG4gICAgfVxuICB9XG59XG5cbi8qIVxuICogUmV0dXJucyB0aGUgdmFsdWUgcGFzc2VkIHRvIGl0LlxuICovXG5cbmZ1bmN0aW9uIEsgKHYpIHtcbiAgcmV0dXJuIHY7XG59IiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG4gICwgVmlydHVhbFR5cGUgPSByZXF1aXJlKCcuL3ZpcnR1YWx0eXBlJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuICAsIFR5cGVzXG4gICwgc2NoZW1hcztcblxuLyoqXG4gKiBTY2hlbWEgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBjaGlsZCA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSk7XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcsIGFnZTogTnVtYmVyLCBjaGlsZHJlbjogW2NoaWxkXSB9KTtcbiAqICAgICB2YXIgVHJlZSA9IG1vbmdvb3NlLm1vZGVsKCdUcmVlJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgLy8gc2V0dGluZyBzY2hlbWEgb3B0aW9uc1xuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBfaWQ6IGZhbHNlLCBhdXRvSW5kZXg6IGZhbHNlIH0pXG4gKlxuICogIyMjI09wdGlvbnM6XG4gKlxuICogLSBbY29sbGVjdGlvbl0oL2RvY3MvZ3VpZGUuaHRtbCNjb2xsZWN0aW9uKTogc3RyaW5nIC0gbm8gZGVmYXVsdFxuICogLSBbaWRdKC9kb2NzL2d1aWRlLmh0bWwjaWQpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBgbWluaW1pemVgOiBib29sIC0gY29udHJvbHMgW2RvY3VtZW50I3RvT2JqZWN0XSgjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3QpIGJlaGF2aW9yIHdoZW4gY2FsbGVkIG1hbnVhbGx5IC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbc3RyaWN0XSgvZG9jcy9ndWlkZS5odG1sI3N0cmljdCk6IGJvb2wgLSBkZWZhdWx0cyB0byB0cnVlXG4gKiAtIFt0b0pTT05dKC9kb2NzL2d1aWRlLmh0bWwjdG9KU09OKSAtIG9iamVjdCAtIG5vIGRlZmF1bHRcbiAqIC0gW3RvT2JqZWN0XSgvZG9jcy9ndWlkZS5odG1sI3RvT2JqZWN0KSAtIG9iamVjdCAtIG5vIGRlZmF1bHRcbiAqIC0gW3ZlcnNpb25LZXldKC9kb2NzL2d1aWRlLmh0bWwjdmVyc2lvbktleSk6IGJvb2wgLSBkZWZhdWx0cyB0byBcIl9fdlwiXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX1doZW4gbmVzdGluZyBzY2hlbWFzLCAoYGNoaWxkcmVuYCBpbiB0aGUgZXhhbXBsZSBhYm92ZSksIGFsd2F5cyBkZWNsYXJlIHRoZSBjaGlsZCBzY2hlbWEgZmlyc3QgYmVmb3JlIHBhc3NpbmcgaXQgaW50byBpcyBwYXJlbnQuX1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfHVuZGVmaW5lZH0gW25hbWVdINCd0LDQt9Cy0LDQvdC40LUg0YHRhdC10LzRi1xuICogQHBhcmFtIHtTY2hlbWF9IFtiYXNlU2NoZW1hXSDQkdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwINC/0YDQuCDQvdCw0YHQu9C10LTQvtCy0LDQvdC40LhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmog0KHRhdC10LzQsFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gU2NoZW1hICggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICkge1xuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIFNjaGVtYSkgKVxuICAgIHJldHVybiBuZXcgU2NoZW1hKCBuYW1lLCBiYXNlU2NoZW1hLCBvYmosIG9wdGlvbnMgKTtcblxuICAvLyDQldGB0LvQuCDRjdGC0L4g0LjQvNC10L3QvtCy0LDQvdCw0Y8g0YHRhdC10LzQsFxuICBpZiAoIHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyApe1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgc2NoZW1hc1sgbmFtZSBdID0gdGhpcztcbiAgfSBlbHNlIHtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IG5hbWU7XG4gICAgbmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICggIShiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSApe1xuICAgIG9wdGlvbnMgPSBvYmo7XG4gICAgb2JqID0gYmFzZVNjaGVtYTtcbiAgICBiYXNlU2NoZW1hID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8g0KHQvtGF0YDQsNC90LjQvCDQvtC/0LjRgdCw0L3QuNC1INGB0YXQtdC80Ysg0LTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDQtNC40YHQutGA0LjQvNC40L3QsNGC0L7RgNC+0LJcbiAgdGhpcy5zb3VyY2UgPSBvYmo7XG5cbiAgdGhpcy5wYXRocyA9IHt9O1xuICB0aGlzLnN1YnBhdGhzID0ge307XG4gIHRoaXMudmlydHVhbHMgPSB7fTtcbiAgdGhpcy5uZXN0ZWQgPSB7fTtcbiAgdGhpcy5pbmhlcml0cyA9IHt9O1xuICB0aGlzLmNhbGxRdWV1ZSA9IFtdO1xuICB0aGlzLm1ldGhvZHMgPSB7fTtcbiAgdGhpcy5zdGF0aWNzID0ge307XG4gIHRoaXMudHJlZSA9IHt9O1xuICB0aGlzLl9yZXF1aXJlZHBhdGhzID0gdW5kZWZpbmVkO1xuICB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0gdW5kZWZpbmVkO1xuXG4gIHRoaXMub3B0aW9ucyA9IHRoaXMuZGVmYXVsdE9wdGlvbnMoIG9wdGlvbnMgKTtcblxuICBpZiAoIGJhc2VTY2hlbWEgaW5zdGFuY2VvZiBTY2hlbWEgKXtcbiAgICBiYXNlU2NoZW1hLmRpc2NyaW1pbmF0b3IoIG5hbWUsIHRoaXMgKTtcblxuICAgIC8vdGhpcy5kaXNjcmltaW5hdG9yKCBuYW1lLCBiYXNlU2NoZW1hICk7XG4gIH1cblxuICAvLyBidWlsZCBwYXRoc1xuICBpZiAoIG9iaiApIHtcbiAgICB0aGlzLmFkZCggb2JqICk7XG4gIH1cblxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyBnZXQgYW4gYXV0byBfaWQgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvX2lkID0gIXRoaXMucGF0aHNbJ19pZCddICYmICghdGhpcy5vcHRpb25zLm5vSWQgJiYgdGhpcy5vcHRpb25zLl9pZCk7XG4gIGlmIChhdXRvX2lkKSB7XG4gICAgdGhpcy5hZGQoeyBfaWQ6IHt0eXBlOiBTY2hlbWEuT2JqZWN0SWQsIGF1dG86IHRydWV9IH0pO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgcmVjZWl2ZSBhbiBpZCBnZXR0ZXIgdW5sZXNzIGRpc2FibGVkXG4gIHZhciBhdXRvaWQgPSAhdGhpcy5wYXRoc1snaWQnXSAmJiB0aGlzLm9wdGlvbnMuaWQ7XG4gIGlmICggYXV0b2lkICkge1xuICAgIHRoaXMudmlydHVhbCgnaWQnKS5nZXQoIGlkR2V0dGVyICk7XG4gIH1cbn1cblxuLyohXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIF9pZCBjYXN0IHRvIGEgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBpZEdldHRlciAoKSB7XG4gIGlmICh0aGlzLiRfXy5faWQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18uX2lkO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuJF9fLl9pZCA9IG51bGwgPT0gdGhpcy5faWRcbiAgICA/IG51bGxcbiAgICA6IFN0cmluZyh0aGlzLl9pZCk7XG59XG5cbi8qIVxuICogSW5oZXJpdCBmcm9tIEV2ZW50RW1pdHRlci5cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLl9fcHJvdG9fXyA9IEV2ZW50cy5wcm90b3R5cGU7XG5cbi8qKlxuICogU2NoZW1hIGFzIGZsYXQgcGF0aHNcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICAgICA6IFNjaGVtYVR5cGUsXG4gKiAgICAgICAsICduZXN0ZWQua2V5JyA6IFNjaGVtYVR5cGUsXG4gKiAgICAgfVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHByb3BlcnR5IHBhdGhzXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aHM7XG5cbi8qKlxuICogU2NoZW1hIGFzIGEgdHJlZVxuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHtcbiAqICAgICAgICAgJ19pZCcgICAgIDogT2JqZWN0SWRcbiAqICAgICAgICwgJ25lc3RlZCcgIDoge1xuICogICAgICAgICAgICAgJ2tleScgOiBTdHJpbmdcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSB0cmVlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUudHJlZTtcblxuLyoqXG4gKiBSZXR1cm5zIGRlZmF1bHQgb3B0aW9ucyBmb3IgdGhpcyBzY2hlbWEsIG1lcmdlZCB3aXRoIGBvcHRpb25zYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZGVmYXVsdE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBvcHRpb25zID0gJC5leHRlbmQoe1xuICAgICAgc3RyaWN0OiB0cnVlXG4gICAgLCB2ZXJzaW9uS2V5OiAnX192J1xuICAgICwgZGlzY3JpbWluYXRvcktleTogJ19fdCdcbiAgICAsIG1pbmltaXplOiB0cnVlXG4gICAgLy8gdGhlIGZvbGxvd2luZyBhcmUgb25seSBhcHBsaWVkIGF0IGNvbnN0cnVjdGlvbiB0aW1lXG4gICAgLCBfaWQ6IHRydWVcbiAgICAsIGlkOiB0cnVlXG4gIH0sIG9wdGlvbnMgKTtcblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogQWRkcyBrZXkgcGF0aCAvIHNjaGVtYSB0eXBlIHBhaXJzIHRvIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgVG95U2NoZW1hID0gbmV3IFNjaGVtYTtcbiAqICAgICBUb3lTY2hlbWEuYWRkKHsgbmFtZTogJ3N0cmluZycsIGNvbG9yOiAnc3RyaW5nJywgcHJpY2U6ICdudW1iZXInIH0pO1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkICggb2JqLCBwcmVmaXggKSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGtleSA9IGtleXNbaV07XG5cbiAgICBpZiAobnVsbCA9PSBvYmpbIGtleSBdKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHZhbHVlIGZvciBzY2hlbWEgcGF0aCBgJysgcHJlZml4ICsga2V5ICsnYCcpO1xuICAgIH1cblxuICAgIGlmICggXy5pc1BsYWluT2JqZWN0KG9ialtrZXldIClcbiAgICAgICYmICggIW9ialsga2V5IF0uY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gb2JqWyBrZXkgXS5jb25zdHJ1Y3Rvci5uYW1lIClcbiAgICAgICYmICggIW9ialsga2V5IF0udHlwZSB8fCBvYmpbIGtleSBdLnR5cGUudHlwZSApICl7XG5cbiAgICAgIGlmICggT2JqZWN0LmtleXMob2JqWyBrZXkgXSkubGVuZ3RoICkge1xuICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0IHsgbGFzdDogeyBuYW1lOiBTdHJpbmcgfX1cbiAgICAgICAgdGhpcy5uZXN0ZWRbIHByZWZpeCArIGtleSBdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hZGQoIG9ialsga2V5IF0sIHByZWZpeCArIGtleSArICcuJyk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGF0aCggcHJlZml4ICsga2V5LCBvYmpbIGtleSBdICk7IC8vIG1peGVkIHR5cGVcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBSZXNlcnZlZCBkb2N1bWVudCBrZXlzLlxuICpcbiAqIEtleXMgaW4gdGhpcyBvYmplY3QgYXJlIG5hbWVzIHRoYXQgYXJlIHJlamVjdGVkIGluIHNjaGVtYSBkZWNsYXJhdGlvbnMgYi9jIHRoZXkgY29uZmxpY3Qgd2l0aCBtb25nb29zZSBmdW5jdGlvbmFsaXR5LiBVc2luZyB0aGVzZSBrZXkgbmFtZSB3aWxsIHRocm93IGFuIGVycm9yLlxuICpcbiAqICAgICAgb24sIGVtaXQsIF9ldmVudHMsIGRiLCBnZXQsIHNldCwgaW5pdCwgaXNOZXcsIGVycm9ycywgc2NoZW1hLCBvcHRpb25zLCBtb2RlbE5hbWUsIGNvbGxlY3Rpb24sIF9wcmVzLCBfcG9zdHMsIHRvT2JqZWN0XG4gKlxuICogX05PVEU6XyBVc2Ugb2YgdGhlc2UgdGVybXMgYXMgbWV0aG9kIG5hbWVzIGlzIHBlcm1pdHRlZCwgYnV0IHBsYXkgYXQgeW91ciBvd24gcmlzaywgYXMgdGhleSBtYXkgYmUgZXhpc3RpbmcgbW9uZ29vc2UgZG9jdW1lbnQgbWV0aG9kcyB5b3UgYXJlIHN0b21waW5nIG9uLlxuICpcbiAqICAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgICBzY2hlbWEubWV0aG9kcy5pbml0ID0gZnVuY3Rpb24gKCkge30gLy8gcG90ZW50aWFsbHkgYnJlYWtpbmdcbiAqL1xuU2NoZW1hLnJlc2VydmVkID0gT2JqZWN0LmNyZWF0ZSggbnVsbCApO1xudmFyIHJlc2VydmVkID0gU2NoZW1hLnJlc2VydmVkO1xucmVzZXJ2ZWQub24gPVxucmVzZXJ2ZWQuZGIgPVxucmVzZXJ2ZWQuZ2V0ID1cbnJlc2VydmVkLnNldCA9XG5yZXNlcnZlZC5pbml0ID1cbnJlc2VydmVkLmlzTmV3ID1cbnJlc2VydmVkLmVycm9ycyA9XG5yZXNlcnZlZC5zY2hlbWEgPVxucmVzZXJ2ZWQub3B0aW9ucyA9XG5yZXNlcnZlZC5tb2RlbE5hbWUgPVxucmVzZXJ2ZWQuY29sbGVjdGlvbiA9XG5yZXNlcnZlZC50b09iamVjdCA9XG5yZXNlcnZlZC5kb21haW4gPVxucmVzZXJ2ZWQuZW1pdCA9ICAgIC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX2V2ZW50cyA9IC8vIEV2ZW50RW1pdHRlclxucmVzZXJ2ZWQuX3ByZXMgPSByZXNlcnZlZC5fcG9zdHMgPSAxOyAvLyBob29rcy5qc1xuXG4vKipcbiAqIEdldHMvc2V0cyBzY2hlbWEgcGF0aHMuXG4gKlxuICogU2V0cyBhIHBhdGggKGlmIGFyaXR5IDIpXG4gKiBHZXRzIGEgcGF0aCAoaWYgYXJpdHkgMSlcbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpIC8vIHJldHVybnMgYSBTY2hlbWFUeXBlXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnLCBOdW1iZXIpIC8vIGNoYW5nZXMgdGhlIHNjaGVtYVR5cGUgb2YgYG5hbWVgIHRvIE51bWJlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcbiAgaWYgKG9iaiA9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodGhpcy5wYXRoc1twYXRoXSkgcmV0dXJuIHRoaXMucGF0aHNbcGF0aF07XG4gICAgaWYgKHRoaXMuc3VicGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnN1YnBhdGhzW3BhdGhdO1xuXG4gICAgLy8gc3VicGF0aHM/XG4gICAgcmV0dXJuIC9cXC5cXGQrXFwuPy4qJC8udGVzdChwYXRoKVxuICAgICAgPyBnZXRQb3NpdGlvbmFsUGF0aCh0aGlzLCBwYXRoKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBzb21lIHBhdGggbmFtZXMgY29uZmxpY3Qgd2l0aCBkb2N1bWVudCBtZXRob2RzXG4gIGlmIChyZXNlcnZlZFtwYXRoXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImBcIiArIHBhdGggKyBcImAgbWF5IG5vdCBiZSB1c2VkIGFzIGEgc2NoZW1hIHBhdGhuYW1lXCIpO1xuICB9XG5cbiAgLy8gdXBkYXRlIHRoZSB0cmVlXG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLi8pXG4gICAgLCBsYXN0ID0gc3VicGF0aHMucG9wKClcbiAgICAsIGJyYW5jaCA9IHRoaXMudHJlZTtcblxuICBzdWJwYXRocy5mb3JFYWNoKGZ1bmN0aW9uKHN1YiwgaSkge1xuICAgIGlmICghYnJhbmNoW3N1Yl0pIGJyYW5jaFtzdWJdID0ge307XG4gICAgaWYgKCdvYmplY3QnICE9IHR5cGVvZiBicmFuY2hbc3ViXSkge1xuICAgICAgdmFyIG1zZyA9ICdDYW5ub3Qgc2V0IG5lc3RlZCBwYXRoIGAnICsgcGF0aCArICdgLiAnXG4gICAgICAgICAgICAgICsgJ1BhcmVudCBwYXRoIGAnXG4gICAgICAgICAgICAgICsgc3VicGF0aHMuc2xpY2UoMCwgaSkuY29uY2F0KFtzdWJdKS5qb2luKCcuJylcbiAgICAgICAgICAgICAgKyAnYCBhbHJlYWR5IHNldCB0byB0eXBlICcgKyBicmFuY2hbc3ViXS5uYW1lXG4gICAgICAgICAgICAgICsgJy4nO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuICAgIGJyYW5jaCA9IGJyYW5jaFtzdWJdO1xuICB9KTtcblxuICBicmFuY2hbbGFzdF0gPSB1dGlscy5jbG9uZShvYmopO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIG9iaik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0eXBlIGFyZ3VtZW50cyBpbnRvIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBjb25zdHJ1Y3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5pbnRlcnByZXRBc1R5cGUgPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIGlmIChvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gJ09iamVjdCcpXG4gICAgb2JqID0geyB0eXBlOiBvYmogfTtcblxuICAvLyBHZXQgdGhlIHR5cGUgbWFraW5nIHN1cmUgdG8gYWxsb3cga2V5cyBuYW1lZCBcInR5cGVcIlxuICAvLyBhbmQgZGVmYXVsdCB0byBtaXhlZCBpZiBub3Qgc3BlY2lmaWVkLlxuICAvLyB7IHR5cGU6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnZnJlc2hjdXQnIH0gfVxuICB2YXIgdHlwZSA9IG9iai50eXBlICYmICFvYmoudHlwZS50eXBlXG4gICAgPyBvYmoudHlwZVxuICAgIDoge307XG5cbiAgaWYgKCdPYmplY3QnID09IHR5cGUuY29uc3RydWN0b3IubmFtZSB8fCAnbWl4ZWQnID09IHR5cGUpIHtcbiAgICByZXR1cm4gbmV3IFR5cGVzLk1peGVkKHBhdGgsIG9iaik7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSB8fCBBcnJheSA9PSB0eXBlIHx8ICdhcnJheScgPT0gdHlwZSkge1xuICAgIC8vIGlmIGl0IHdhcyBzcGVjaWZpZWQgdGhyb3VnaCB7IHR5cGUgfSBsb29rIGZvciBgY2FzdGBcbiAgICB2YXIgY2FzdCA9IChBcnJheSA9PSB0eXBlIHx8ICdhcnJheScgPT0gdHlwZSlcbiAgICAgID8gb2JqLmNhc3RcbiAgICAgIDogdHlwZVswXTtcblxuICAgIGlmIChjYXN0IGluc3RhbmNlb2YgU2NoZW1hKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgY2FzdCwgb2JqKTtcbiAgICB9XG5cbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIGNhc3QpIHtcbiAgICAgIGNhc3QgPSBUeXBlc1tjYXN0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY2FzdC5zdWJzdHJpbmcoMSldO1xuICAgIH0gZWxzZSBpZiAoY2FzdCAmJiAoIWNhc3QudHlwZSB8fCBjYXN0LnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgICAgICAgJiYgJ09iamVjdCcgPT0gY2FzdC5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAgICAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKGNhc3QpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIG5ldyBTY2hlbWEoY2FzdCksIG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBUeXBlcy5BcnJheShwYXRoLCBjYXN0IHx8IFR5cGVzLk1peGVkLCBvYmopO1xuICB9XG5cbiAgdmFyIG5hbWUgPSAnc3RyaW5nJyA9PSB0eXBlb2YgdHlwZVxuICAgID8gdHlwZVxuICAgIDogdHlwZS5uYW1lO1xuXG4gIGlmIChuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcbiAgfVxuXG4gIGlmICh1bmRlZmluZWQgPT0gVHlwZXNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmRlZmluZWQgdHlwZSBhdCBgJyArIHBhdGggK1xuICAgICAgICAnYFxcbiAgRGlkIHlvdSB0cnkgbmVzdGluZyBTY2hlbWFzPyAnICtcbiAgICAgICAgJ1lvdSBjYW4gb25seSBuZXN0IHVzaW5nIHJlZnMgb3IgYXJyYXlzLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUeXBlc1tuYW1lXShwYXRoLCBvYmopO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aGUgc2NoZW1hcyBwYXRocyBzaW1pbGFyIHRvIEFycmF5I2ZvckVhY2guXG4gKlxuICogVGhlIGNhbGxiYWNrIGlzIHBhc3NlZCB0aGUgcGF0aG5hbWUgYW5kIHNjaGVtYVR5cGUgYXMgYXJndW1lbnRzIG9uIGVhY2ggaXRlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtTY2hlbWF9IHRoaXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuZWFjaFBhdGggPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGZuKGtleXNbaV0sIHRoaXMucGF0aHNba2V5c1tpXV0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gQXJyYXkgb2YgcGF0aCBzdHJpbmdzIHRoYXQgYXJlIHJlcXVpcmVkIGJ5IHRoaXMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5yZXF1aXJlZFBhdGhzID0gZnVuY3Rpb24gcmVxdWlyZWRQYXRocyAoKSB7XG4gIGlmICh0aGlzLl9yZXF1aXJlZHBhdGhzKSByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcmV0ID0gW107XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHZhciBwYXRoID0gcGF0aHNbaV07XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0uaXNSZXF1aXJlZCkgcmV0LnB1c2gocGF0aCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocyA9IHJldDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGF0aFR5cGUgb2YgYHBhdGhgIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBHaXZlbiBhIHBhdGgsIHJldHVybnMgd2hldGhlciBpdCBpcyBhIHJlYWwsIHZpcnR1YWwsIG5lc3RlZCwgb3IgYWQtaG9jL3VuZGVmaW5lZCBwYXRoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhUeXBlID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKHBhdGggaW4gdGhpcy5wYXRocykgcmV0dXJuICdyZWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy52aXJ0dWFscykgcmV0dXJuICd2aXJ0dWFsJztcbiAgaWYgKHBhdGggaW4gdGhpcy5uZXN0ZWQpIHJldHVybiAnbmVzdGVkJztcbiAgaWYgKHBhdGggaW4gdGhpcy5zdWJwYXRocykgcmV0dXJuICdyZWFsJztcblxuICBpZiAoL1xcLlxcZCtcXC58XFwuXFxkKyQvLnRlc3QocGF0aCkgJiYgZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aCkpIHtcbiAgICByZXR1cm4gJ3JlYWwnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnYWRob2NPclVuZGVmaW5lZCdcbiAgfVxufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gZ2V0UG9zaXRpb25hbFBhdGggKHNlbGYsIHBhdGgpIHtcbiAgdmFyIHN1YnBhdGhzID0gcGF0aC5zcGxpdCgvXFwuKFxcZCspXFwufFxcLihcXGQrKSQvKS5maWx0ZXIoQm9vbGVhbik7XG4gIGlmIChzdWJwYXRocy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHNlbGYucGF0aHNbc3VicGF0aHNbMF1dO1xuICB9XG5cbiAgdmFyIHZhbCA9IHNlbGYucGF0aChzdWJwYXRoc1swXSk7XG4gIGlmICghdmFsKSByZXR1cm4gdmFsO1xuXG4gIHZhciBsYXN0ID0gc3VicGF0aHMubGVuZ3RoIC0gMVxuICAgICwgc3VicGF0aFxuICAgICwgaSA9IDE7XG5cbiAgZm9yICg7IGkgPCBzdWJwYXRocy5sZW5ndGg7ICsraSkge1xuICAgIHN1YnBhdGggPSBzdWJwYXRoc1tpXTtcblxuICAgIGlmIChpID09PSBsYXN0ICYmIHZhbCAmJiAhdmFsLnNjaGVtYSAmJiAhL1xcRC8udGVzdChzdWJwYXRoKSkge1xuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFR5cGVzLkFycmF5KSB7XG4gICAgICAgIC8vIFN0cmluZ1NjaGVtYSwgTnVtYmVyU2NoZW1hLCBldGNcbiAgICAgICAgdmFsID0gdmFsLmNhc3RlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBpZiBpdHMganVzdCBhIHBvc2l0aW9uIHNlZ21lbnQ6IHBhdGguMC5zdWJwYXRoXG4gICAgaWYgKCEvXFxELy50ZXN0KHN1YnBhdGgpKSBjb250aW51ZTtcblxuICAgIGlmICghKHZhbCAmJiB2YWwuc2NoZW1hKSkge1xuICAgICAgdmFsID0gdW5kZWZpbmVkO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFsID0gdmFsLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGYuc3VicGF0aHNbcGF0aF0gPSB2YWw7XG59XG5cbi8qKlxuICogQWRkcyBhIG1ldGhvZCBjYWxsIHRvIHRoZSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBkb2N1bWVudCBtZXRob2QgdG8gY2FsbCBsYXRlclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xuICB0aGlzLmNhbGxRdWV1ZS5wdXNoKFtuYW1lLCBhcmdzXSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcHJlIGhvb2sgZm9yIHRoZSBkb2N1bWVudC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICB2YXIgdG95U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3NhdmUnLCBmdW5jdGlvbiAobmV4dCkge1xuICogICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuY3JlYXRlZCA9IG5ldyBEYXRlO1xuICogICAgICAgbmV4dCgpO1xuICogICAgIH0pXG4gKlxuICogICAgIHRveVNjaGVtYS5wcmUoJ3ZhbGlkYXRlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICh0aGlzLm5hbWUgIT0gJ1dvb2R5JykgdGhpcy5uYW1lID0gJ1dvb2R5JztcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ3ByZScsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIERlZmluZXMgYSBwb3N0IGZvciB0aGUgZG9jdW1lbnRcbiAqXG4gKiBQb3N0IGhvb2tzIGZpcmUgYG9uYCB0aGUgZXZlbnQgZW1pdHRlZCBmcm9tIGRvY3VtZW50IGluc3RhbmNlcyBvZiBNb2RlbHMgY29tcGlsZWQgZnJvbSB0aGlzIHNjaGVtYS5cbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5wb3N0KCdzYXZlJywgZnVuY3Rpb24gKGRvYykge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZWQgYWZ0ZXIgYSBkb2N1bWVudCB3YXMgc2F2ZWQnKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIE1vZGVsID0gbW9uZ29vc2UubW9kZWwoJ01vZGVsJywgc2NoZW1hKTtcbiAqXG4gKiAgICAgdmFyIG0gPSBuZXcgTW9kZWwoLi4pO1xuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlcyBhZnRlciB0aGUgYHBvc3RgIGhvb2snKTtcbiAqICAgICB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBob29rXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbihtZXRob2QsIGZuKXtcbiAgcmV0dXJuIHRoaXMucXVldWUoJ29uJywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIGZvciB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwbHVnaW4gY2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gKiBAc2VlIHBsdWdpbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucGx1Z2luID0gZnVuY3Rpb24gKGZuLCBvcHRzKSB7XG4gIGZuKHRoaXMsIG9wdHMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBpbnN0YW5jZSBtZXRob2QgdG8gZG9jdW1lbnRzIGNvbnN0cnVjdGVkIGZyb20gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IGtpdHR5U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XG4gKlxuICogICAgIHNjaGVtYS5tZXRob2QoJ21lb3cnLCBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICBjb25zb2xlLmxvZygnbWVlZWVlb29vb29vb29vb29vdycpO1xuICogICAgIH0pXG4gKlxuICogICAgIHZhciBLaXR0eSA9IG1vbmdvb3NlLm1vZGVsKCdLaXR0eScsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBmaXp6ID0gbmV3IEtpdHR5O1xuICogICAgIGZpenoubWVvdygpOyAvLyBtZWVlZWVvb29vb29vb29vb29vd1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBtZXRob2RzLlxuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKHtcbiAqICAgICAgICAgcHVycjogZnVuY3Rpb24gKCkge31cbiAqICAgICAgICwgc2NyYXRjaDogZnVuY3Rpb24gKCkge31cbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gbGF0ZXJcbiAqICAgICBmaXp6LnB1cnIoKTtcbiAqICAgICBmaXp6LnNjcmF0Y2goKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG1ldGhvZCBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKVxuICAgICAgdGhpcy5tZXRob2RzW2ldID0gbmFtZVtpXTtcbiAgZWxzZVxuICAgIHRoaXMubWV0aG9kc1tuYW1lXSA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBzdGF0aWMgXCJjbGFzc1wiIG1ldGhvZHMgdG8gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHNjaGVtYS5zdGF0aWMoJ2ZpbmRCeU5hbWUnLCBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmZpbmQoeyBuYW1lOiBuYW1lIH0sIGNhbGxiYWNrKTtcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIERyaW5rID0gbW9uZ29vc2UubW9kZWwoJ0RyaW5rJywgc2NoZW1hKTtcbiAqICAgICBEcmluay5maW5kQnlOYW1lKCdzYW5wZWxsZWdyaW5vJywgZnVuY3Rpb24gKGVyciwgZHJpbmtzKSB7XG4gKiAgICAgICAvL1xuICogICAgIH0pO1xuICpcbiAqIElmIGEgaGFzaCBvZiBuYW1lL2ZuIHBhaXJzIGlzIHBhc3NlZCBhcyB0aGUgb25seSBhcmd1bWVudCwgZWFjaCBuYW1lL2ZuIHBhaXIgd2lsbCBiZSBhZGRlZCBhcyBzdGF0aWNzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5zdGF0aWMgPSBmdW5jdGlvbihuYW1lLCBmbikge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXG4gICAgZm9yICh2YXIgaSBpbiBuYW1lKVxuICAgICAgdGhpcy5zdGF0aWNzW2ldID0gbmFtZVtpXTtcbiAgZWxzZVxuICAgIHRoaXMuc3RhdGljc1tuYW1lXSA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cy9nZXRzIGEgc2NoZW1hIG9wdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbiBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBpZiBub3QgcGFzc2VkLCB0aGUgY3VycmVudCBvcHRpb24gdmFsdWUgaXMgcmV0dXJuZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgaWYgKDEgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zW2tleV07XG4gIH1cblxuICBzd2l0Y2ggKGtleSkge1xuICAgIGNhc2UgJ3NhZmUnOlxuICAgICAgdGhpcy5vcHRpb25zW2tleV0gPSBmYWxzZSA9PT0gdmFsdWVcbiAgICAgICAgPyB7IHc6IDAgfVxuICAgICAgICA6IHZhbHVlO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMub3B0aW9uc1trZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbCA9IGZ1bmN0aW9uIChuYW1lLCBvcHRpb25zKSB7XG4gIHZhciB2aXJ0dWFscyA9IHRoaXMudmlydHVhbHM7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgcmV0dXJuIHZpcnR1YWxzW25hbWVdID0gcGFydHMucmVkdWNlKGZ1bmN0aW9uIChtZW0sIHBhcnQsIGkpIHtcbiAgICBtZW1bcGFydF0gfHwgKG1lbVtwYXJ0XSA9IChpID09PSBwYXJ0cy5sZW5ndGgtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDoge30pO1xuICAgIHJldHVybiBtZW1bcGFydF07XG4gIH0sIHRoaXMudHJlZSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfVxuICovXG5cblNjaGVtYS5wcm90b3R5cGUudmlydHVhbHBhdGggPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gdGhpcy52aXJ0dWFsc1tuYW1lXTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHByb3BlcnR5IGRpc2NyaW1pbmF0b3JzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEuZGlzY3JpbWluYXRvcnM7XG5cbi8qKlxuICog0J3QsNGB0LvQtdC00L7QstCw0L3QuNC1INC+0YIg0YHRhdC10LzRiy5cbiAqIHRoaXMgLSDQsdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwISEhXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAgdmFyIFBlcnNvblNjaGVtYSA9IG5ldyBTY2hlbWEoJ1BlcnNvbicsIHtcbiAqICAgICAgIG5hbWU6IFN0cmluZyxcbiAqICAgICAgIGNyZWF0ZWRBdDogRGF0ZVxuICogICAgIH0pO1xuICpcbiAqICAgICB2YXIgQm9zc1NjaGVtYSA9IG5ldyBTY2hlbWEoJ0Jvc3MnLCBQZXJzb25TY2hlbWEsIHsgZGVwYXJ0bWVudDogU3RyaW5nIH0pO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgZGlzY3JpbWluYXRvciBtb2RlbCBuYW1lXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hIGRpc2NyaW1pbmF0b3IgbW9kZWwgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmRpc2NyaW1pbmF0b3IgPSBmdW5jdGlvbiBkaXNjcmltaW5hdG9yIChuYW1lLCBzY2hlbWEpIHtcbiAgaWYgKCEoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHBhc3MgYSB2YWxpZCBkaXNjcmltaW5hdG9yIFNjaGVtYVwiKTtcbiAgfVxuXG4gIGlmICggdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyAmJiAhdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3QgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGNhbiBvbmx5IGJlIGEgZGlzY3JpbWluYXRvciBvZiB0aGUgcm9vdCBtb2RlbFwiKTtcbiAgfVxuXG4gIHZhciBrZXkgPSB0aGlzLm9wdGlvbnMuZGlzY3JpbWluYXRvcktleTtcbiAgaWYgKCBzY2hlbWEucGF0aChrZXkpICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW5ub3QgaGF2ZSBmaWVsZCB3aXRoIG5hbWUgXFxcIlwiICsga2V5ICsgXCJcXFwiXCIpO1xuICB9XG5cbiAgLy8gbWVyZ2VzIGJhc2Ugc2NoZW1hIGludG8gbmV3IGRpc2NyaW1pbmF0b3Igc2NoZW1hIGFuZCBzZXRzIG5ldyB0eXBlIGZpZWxkLlxuICAoZnVuY3Rpb24gbWVyZ2VTY2hlbWFzKHNjaGVtYSwgYmFzZVNjaGVtYSkge1xuICAgIHV0aWxzLm1lcmdlKHNjaGVtYSwgYmFzZVNjaGVtYSk7XG5cbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW2tleV0gPSB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogbmFtZSB9O1xuICAgIHNjaGVtYS5hZGQob2JqKTtcbiAgICBzY2hlbWEuZGlzY3JpbWluYXRvck1hcHBpbmcgPSB7IGtleToga2V5LCB2YWx1ZTogbmFtZSwgaXNSb290OiBmYWxzZSB9O1xuXG4gICAgaWYgKGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uKSB7XG4gICAgICBzY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uID0gYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgICAvLyB0aHJvd3MgZXJyb3IgaWYgb3B0aW9ucyBhcmUgaW52YWxpZFxuICAgIChmdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbnMoYSwgYikge1xuICAgICAgYSA9IHV0aWxzLmNsb25lKGEpO1xuICAgICAgYiA9IHV0aWxzLmNsb25lKGIpO1xuICAgICAgZGVsZXRlIGEudG9KU09OO1xuICAgICAgZGVsZXRlIGEudG9PYmplY3Q7XG4gICAgICBkZWxldGUgYi50b0pTT047XG4gICAgICBkZWxldGUgYi50b09iamVjdDtcblxuICAgICAgaWYgKCF1dGlscy5kZWVwRXF1YWwoYSwgYikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpXCIpO1xuICAgICAgfVxuICAgIH0pKHNjaGVtYS5vcHRpb25zLCBiYXNlU2NoZW1hLm9wdGlvbnMpO1xuXG4gICAgdmFyIHRvSlNPTiA9IHNjaGVtYS5vcHRpb25zLnRvSlNPTlxuICAgICAgLCB0b09iamVjdCA9IHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0O1xuXG4gICAgc2NoZW1hLm9wdGlvbnMgPSB1dGlscy5jbG9uZShiYXNlU2NoZW1hLm9wdGlvbnMpO1xuICAgIGlmICh0b0pTT04pICAgc2NoZW1hLm9wdGlvbnMudG9KU09OID0gdG9KU09OO1xuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcblxuICAgIHNjaGVtYS5jYWxsUXVldWUgPSBiYXNlU2NoZW1hLmNhbGxRdWV1ZS5jb25jYXQoc2NoZW1hLmNhbGxRdWV1ZSk7XG4gICAgc2NoZW1hLl9yZXF1aXJlZHBhdGhzID0gdW5kZWZpbmVkOyAvLyByZXNldCBqdXN0IGluIGNhc2UgU2NoZW1hI3JlcXVpcmVkUGF0aHMoKSB3YXMgY2FsbGVkIG9uIGVpdGhlciBzY2hlbWFcbiAgfSkoc2NoZW1hLCB0aGlzKTtcblxuICBpZiAoIXRoaXMuZGlzY3JpbWluYXRvcnMpIHtcbiAgICB0aGlzLmRpc2NyaW1pbmF0b3JzID0ge307XG4gIH1cblxuICBpZiAoIXRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcpIHtcbiAgICB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG51bGwsIGlzUm9vdDogdHJ1ZSB9O1xuICB9XG5cbiAgaWYgKHRoaXMuZGlzY3JpbWluYXRvcnNbbmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIHdpdGggbmFtZSBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGFscmVhZHkgZXhpc3RzXCIpO1xuICB9XG5cbiAgdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSA9IHNjaGVtYTtcbn07XG5cbi8qIVxuICogZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hO1xud2luZG93LlNjaGVtYSA9IFNjaGVtYTtcblxuLy8gcmVxdWlyZSBkb3duIGhlcmUgYmVjYXVzZSBvZiByZWZlcmVuY2UgaXNzdWVzXG5cbi8qKlxuICogVGhlIHZhcmlvdXMgYnVpbHQtaW4gTW9uZ29vc2UgU2NoZW1hIFR5cGVzLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZDtcbiAqXG4gKiAjIyMjVHlwZXM6XG4gKlxuICogLSBbU3RyaW5nXSgjc2NoZW1hLXN0cmluZy1qcylcbiAqIC0gW051bWJlcl0oI3NjaGVtYS1udW1iZXItanMpXG4gKiAtIFtCb29sZWFuXSgjc2NoZW1hLWJvb2xlYW4tanMpIHwgQm9vbFxuICogLSBbQXJyYXldKCNzY2hlbWEtYXJyYXktanMpXG4gKiAtIFtEYXRlXSgjc2NoZW1hLWRhdGUtanMpXG4gKiAtIFtPYmplY3RJZF0oI3NjaGVtYS1vYmplY3RpZC1qcykgfCBPaWRcbiAqIC0gW01peGVkXSgjc2NoZW1hLW1peGVkLWpzKSB8IE9iamVjdFxuICpcbiAqIFVzaW5nIHRoaXMgZXhwb3NlZCBhY2Nlc3MgdG8gdGhlIGBNaXhlZGAgU2NoZW1hVHlwZSwgd2UgY2FuIHVzZSB0aGVtIGluIG91ciBzY2hlbWEuXG4gKlxuICogICAgIHZhciBNaXhlZCA9IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5NaXhlZDtcbiAqICAgICBuZXcgbW9uZ29vc2UuU2NoZW1hKHsgX3VzZXI6IE1peGVkIH0pXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLlR5cGVzID0gcmVxdWlyZSgnLi9zY2hlbWEvaW5kZXgnKTtcblxuLy8g0KXRgNCw0L3QuNC70LjRidC1INGB0YXQtdC8XG5TY2hlbWEuc2NoZW1hcyA9IHNjaGVtYXMgPSB7fTtcblxuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5cblR5cGVzID0gU2NoZW1hLlR5cGVzO1xudmFyIE9iamVjdElkID0gU2NoZW1hLk9iamVjdElkID0gVHlwZXMuT2JqZWN0SWQ7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxuICAsIFR5cGVzID0ge1xuICAgICAgICBCb29sZWFuOiByZXF1aXJlKCcuL2Jvb2xlYW4nKVxuICAgICAgLCBEYXRlOiByZXF1aXJlKCcuL2RhdGUnKVxuICAgICAgLCBOdW1iZXI6IHJlcXVpcmUoJy4vbnVtYmVyJylcbiAgICAgICwgU3RyaW5nOiByZXF1aXJlKCcuL3N0cmluZycpXG4gICAgICAsIE9iamVjdElkOiByZXF1aXJlKCcuL29iamVjdGlkJylcbiAgICB9XG4gICwgU3RvcmFnZUFycmF5ID0gcmVxdWlyZSgnLi4vdHlwZXMvYXJyYXknKVxuICAsIE1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpXG4gICwgRW1iZWRkZWREb2NcblxuLyoqXG4gKiBBcnJheSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBjYXN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBTY2hlbWFBcnJheSAoa2V5LCBjYXN0LCBvcHRpb25zKSB7XG4gIGlmIChjYXN0KSB7XG4gICAgdmFyIGNhc3RPcHRpb25zID0ge307XG5cbiAgICBpZiAoJ09iamVjdCcgPT09IGNhc3QuY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgaWYgKGNhc3QudHlwZSkge1xuICAgICAgICAvLyBzdXBwb3J0IHsgdHlwZTogV29vdCB9XG4gICAgICAgIGNhc3RPcHRpb25zID0gXy5jbG9uZSggY2FzdCApOyAvLyBkbyBub3QgYWx0ZXIgdXNlciBhcmd1bWVudHNcbiAgICAgICAgZGVsZXRlIGNhc3RPcHRpb25zLnR5cGU7XG4gICAgICAgIGNhc3QgPSBjYXN0LnR5cGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXN0ID0gTWl4ZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3VwcG9ydCB7IHR5cGU6ICdTdHJpbmcnIH1cbiAgICB2YXIgbmFtZSA9ICdzdHJpbmcnID09IHR5cGVvZiBjYXN0XG4gICAgICA/IGNhc3RcbiAgICAgIDogY2FzdC5uYW1lO1xuXG4gICAgdmFyIGNhc3RlciA9IG5hbWUgaW4gVHlwZXNcbiAgICAgID8gVHlwZXNbbmFtZV1cbiAgICAgIDogY2FzdDtcblxuICAgIHRoaXMuY2FzdGVyQ29uc3RydWN0b3IgPSBjYXN0ZXI7XG4gICAgdGhpcy5jYXN0ZXIgPSBuZXcgY2FzdGVyKG51bGwsIGNhc3RPcHRpb25zKTtcblxuICAgIC8vIGxhenkgbG9hZFxuICAgIEVtYmVkZGVkRG9jIHx8IChFbWJlZGRlZERvYyA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJykpO1xuXG4gICAgaWYgKCEodGhpcy5jYXN0ZXIgaW5zdGFuY2VvZiBFbWJlZGRlZERvYykpIHtcbiAgICAgIHRoaXMuY2FzdGVyLnBhdGggPSBrZXk7XG4gICAgfVxuICB9XG5cbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBkZWZhdWx0QXJyXG4gICAgLCBmbjtcblxuICBpZiAodGhpcy5kZWZhdWx0VmFsdWUpIHtcbiAgICBkZWZhdWx0QXJyID0gdGhpcy5kZWZhdWx0VmFsdWU7XG4gICAgZm4gPSAnZnVuY3Rpb24nID09IHR5cGVvZiBkZWZhdWx0QXJyO1xuICB9XG5cbiAgdGhpcy5kZWZhdWx0KGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyciA9IGZuID8gZGVmYXVsdEFycigpIDogZGVmYXVsdEFyciB8fCBbXTtcbiAgICByZXR1cm4gbmV3IFN0b3JhZ2VBcnJheShhcnIsIHNlbGYucGF0aCwgdGhpcyk7XG4gIH0pO1xufVxuXG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XG5cbi8qKlxuICogQ2hlY2sgcmVxdWlyZWRcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZXMgdGhlIGdldHRlcnMgYXBwbGljYXRpb24gZm9yIHRoZSBwb3B1bGF0aW9uIHNwZWNpYWwtY2FzZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcbiAgaWYgKHRoaXMuY2FzdGVyLm9wdGlvbnMgJiYgdGhpcy5jYXN0ZXIub3B0aW9ucy5yZWYpIHtcbiAgICAvLyBtZWFucyB0aGUgb2JqZWN0IGlkIHdhcyBwb3B1bGF0ZWRcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzLmNhbGwodGhpcywgdmFsdWUsIHNjb3BlKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgdmFsdWVzIGZvciBzZXQoKS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBkb2N1bWVudCB0aGF0IHRyaWdnZXJzIHRoZSBjYXN0aW5nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXQgd2hldGhlciB0aGlzIGlzIGFuIGluaXRpYWxpemF0aW9uIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUsIGRvYywgaW5pdCApIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBTdG9yYWdlQXJyYXkpKSB7XG4gICAgICB2YWx1ZSA9IG5ldyBTdG9yYWdlQXJyYXkodmFsdWUsIHRoaXMucGF0aCwgZG9jKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYXN0ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgdmFsdWVbaV0gPSB0aGlzLmNhc3Rlci5jYXN0KHZhbHVlW2ldLCBkb2MsIGluaXQpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIHJldGhyb3dcbiAgICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcihlLnR5cGUsIHZhbHVlLCB0aGlzLnBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCk7XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcblxuLyoqXG4gKiBCb29sZWFuIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEJvb2xlYW5TY2hlbWEgKHBhdGgsIG9wdGlvbnMpIHtcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSBmYWxzZTtcbn07XG5cbi8qKlxuICogQ2FzdHMgdG8gYm9vbGVhblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkJvb2xlYW5TY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKG51bGwgPT09IHZhbHVlKSByZXR1cm4gdmFsdWU7XG4gIGlmICgnMCcgPT09IHZhbHVlKSByZXR1cm4gZmFsc2U7XG4gIGlmICgndHJ1ZScgPT09IHZhbHVlKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKCdmYWxzZScgPT09IHZhbHVlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAhISB2YWx1ZTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBCb29sZWFuU2NoZW1hO1xuIiwiLyohXHJcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXHJcbiAqL1xyXG5cclxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XHJcbnZhciBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvcjtcclxuXHJcbi8qKlxyXG4gKiBEYXRlIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXHJcbiAqL1xyXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTY2hlbWFUeXBlLnByb3RvdHlwZTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIGRhdGVcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgRGF0ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB0byBkYXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgdmFyIGRhdGU7XHJcblxyXG4gIC8vIHN1cHBvcnQgZm9yIHRpbWVzdGFtcHNcclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBOdW1iZXIgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlXHJcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSlcclxuICAgIGRhdGUgPSBuZXcgRGF0ZShOdW1iZXIodmFsdWUpKTtcclxuXHJcbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXHJcbiAgZWxzZSBpZiAodmFsdWUudG9TdHJpbmcpXHJcbiAgICBkYXRlID0gbmV3IERhdGUodmFsdWUudG9TdHJpbmcoKSk7XHJcblxyXG4gIGlmIChkYXRlLnRvU3RyaW5nKCkgIT0gJ0ludmFsaWQgRGF0ZScpXHJcbiAgICByZXR1cm4gZGF0ZTtcclxuXHJcbiAgdGhyb3cgbmV3IENhc3RFcnJvcignZGF0ZScsIHZhbHVlLCB0aGlzLnBhdGggKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVTY2hlbWE7XHJcbiIsIlxuLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQXJyYXlUeXBlID0gcmVxdWlyZSgnLi9hcnJheScpXG4gICwgU3RvcmFnZURvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9kb2N1bWVudGFycmF5JylcbiAgLCBTdWJkb2N1bWVudCA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdWJkb2N1bWVudC5wcm90b3R5cGU7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaSBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbaV0gPSBzY2hlbWEuc3RhdGljc1tpXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuX19wcm90b19fID0gQXJyYXlUeXBlLnByb3RvdHlwZTtcblxuLyoqXG4gKiBQZXJmb3JtcyBsb2NhbCB2YWxpZGF0aW9ucyBmaXJzdCwgdGhlbiB2YWxpZGF0aW9ucyBvbiBlYWNoIGVtYmVkZGVkIGRvY1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKGFycmF5LCBmbiwgc2NvcGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIFNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUuY2FsbCh0aGlzLCBhcnJheSwgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChlcnIpIHJldHVybiBmbihlcnIpO1xuXG4gICAgdmFyIGNvdW50ID0gYXJyYXkgJiYgYXJyYXkubGVuZ3RoXG4gICAgICAsIGVycm9yO1xuXG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIGZuKCk7XG5cbiAgICAvLyBoYW5kbGUgc3BhcnNlIGFycmF5cywgZG8gbm90IHVzZSBhcnJheS5mb3JFYWNoIHdoaWNoIGRvZXMgbm90XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHNwYXJzZSBlbGVtZW50cyB5ZXQgcmVwb3J0cyBhcnJheS5sZW5ndGggaW5jbHVkaW5nXG4gICAgLy8gdGhlbSA6KFxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvdW50OyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIC8vIHNpZGVzdGVwIHNwYXJzZSBlbnRyaWVzXG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICA7KGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciAmJiAhZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIHJld3JpdGUgdGhlIGtleVxuICAgICAgICAgICAgZXJyLmtleSA9IHNlbGYua2V5ICsgJy4nICsgaSArICcuJyArIGVyci5rZXk7XG4gICAgICAgICAgICByZXR1cm4gZm4oZXJyb3IgPSBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUsIGRvYywgaW5pdCwgcHJldikge1xuICB2YXIgc2VsZWN0ZWRcbiAgICAsIHN1YmRvY1xuICAgICwgaTtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQsIHByZXYpO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBTdG9yYWdlRG9jdW1lbnRBcnJheSkpIHtcbiAgICB2YWx1ZSA9IG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICB9XG5cbiAgaSA9IHZhbHVlLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKCEodmFsdWVbaV0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50KSAmJiB2YWx1ZVtpXSkge1xuICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XG4gICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKG51bGwsIHZhbHVlLCB0cnVlLCBzZWxlY3RlZCk7XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jLmluaXQodmFsdWVbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHByZXYgJiYgKHN1YmRvYyA9IHByZXYuaWQodmFsdWVbaV0uX2lkKSkpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxuICAgICAgICAgIC8vIGRvYy5hcnJheSA9IFt7IGRvYzogJ3ZhbCcgfV1cbiAgICAgICAgICBzdWJkb2Muc2V0KHZhbHVlW2ldKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZVtpXSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc2V0KCkgaXMgaG9va2VkIGl0IHdpbGwgaGF2ZSBubyByZXR1cm4gdmFsdWVcbiAgICAgICAgLy8gc2VlIGdoLTc0NlxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcblxuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuZXhwb3J0cy5NaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKTtcblxuLy8gYWxpYXNcblxuZXhwb3J0cy5PaWQgPSBleHBvcnRzLk9iamVjdElkO1xuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xuZXhwb3J0cy5Cb29sID0gZXhwb3J0cy5Cb29sZWFuO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xuXG4vKipcbiAqIE1peGVkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE1peGVkIChwYXRoLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdCkge1xuICAgIHZhciBkZWYgPSBvcHRpb25zLmRlZmF1bHQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGVmKSAmJiAwID09PSBkZWYubGVuZ3RoKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgZW1wdHkgYXJyYXkgZGVmYXVsdHMgYXJlIGhhbmRsZWRcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IEFycmF5O1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2hhcmVkICYmXG4gICAgICAgICAgICAgICBfLmlzUGxhaW5PYmplY3QoZGVmKSAmJlxuICAgICAgICAgICAgICAgMCA9PT0gT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHtcbiAgICAgIC8vIHByZXZlbnQgb2RkIFwic2hhcmVkXCIgb2JqZWN0cyBiZXR3ZWVuIGRvY3VtZW50c1xuICAgICAgb3B0aW9ucy5kZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhlZDtcbiIsIi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXNcblxuLyoqXG4gKiBOdW1iZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBOdW1iZXJTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnTnVtYmVyJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLl9fcHJvdG9fXyA9IFNjaGVtYVR5cGUucHJvdG90eXBlO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgbnVtYmVyXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCB2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcjtcbiAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGEgbWluaW11bSBudW1iZXIgdmFsaWRhdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuOiA5IH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUlOfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWluID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGJlbmVhdGggdGhlIGxpbWl0ICh7TUlOfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiBtaW4gfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtaW5pbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5taW5WYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1pblZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWluO1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUlOfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5taW5WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA+PSB2YWx1ZTtcbiAgICB9LCBtc2csICdtaW4nXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyBhIG1heGltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogMTEgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNQVh9IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtYXggPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgZXhjZWVkcyB0aGUgbGltaXQgKHtNQVh9KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IG1heCB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBleGNlZWRzIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1heGltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1heFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWF4O1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUFYfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5tYXhWYWxpZGF0b3IgPSBmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPD0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWF4J10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIG51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIHZhbCA9IHZhbHVlICYmIHZhbHVlLl9pZFxuICAgID8gdmFsdWUuX2lkIC8vIGRvY3VtZW50c1xuICAgIDogdmFsdWU7XG5cbiAgaWYgKCFpc05hTih2YWwpKXtcbiAgICBpZiAobnVsbCA9PT0gdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICgnJyA9PT0gdmFsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIHZhbFxuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICh2YWwudG9TdHJpbmcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSAmJlxuICAgICAgICB2YWwudG9TdHJpbmcoKSA9PSBOdW1iZXIodmFsKSkge1xuICAgICAgcmV0dXJuIG5ldyBOdW1iZXIodmFsKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdudW1iZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJTY2hlbWE7XG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxyXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcclxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxyXG4gICwgRG9jdW1lbnRcclxuXHJcbi8qKlxyXG4gKiBPYmplY3RJZCBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIE9iamVjdElkIChrZXksIG9wdGlvbnMpIHtcclxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnT2JqZWN0SWQnKTtcclxufVxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cclxuICovXHJcblxyXG5PYmplY3RJZC5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBhdXRvLWdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0IGlmIHR1cm5PbiBpcyB0cnVlLlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqL1xyXG5PYmplY3RJZC5wcm90b3R5cGUuYXV0byA9IGZ1bmN0aW9uICggdHVybk9uICkge1xyXG4gIGlmICggdHVybk9uICkge1xyXG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcclxuICAgIHRoaXMuc2V0KCByZXNldElkIClcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIHJlcXVpcmVkXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xyXG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIG9pZDtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FzdHMgdG8gT2JqZWN0SWRcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XHJcbiAgICAvLyB3YWl0ISB3ZSBtYXkgbmVlZCB0byBjYXN0IHRoaXMgdG8gYSBkb2N1bWVudFxyXG5cclxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XHJcbiAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBsYXp5IGxvYWRcclxuICAgIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vLi4vZG9jdW1lbnQnKSk7XHJcblxyXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcclxuICAgICAgdmFsdWUuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XHJcbiAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcclxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZCApIHtcclxuICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSBlbHNlIGlmICggIV8uaXNQbGFpbk9iamVjdCggdmFsdWUgKSApIHtcclxuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDQndGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1LCDRg9C60LDQt9Cw0L3QvdC+0Lkg0LIg0YHRgdGL0LvQutC1XHJcbiAgICB2YXIgc2NoZW1hID0gdGhpcy5vcHRpb25zLnJlZjtcclxuICAgIGlmICggIXNjaGVtYSApe1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcclxuICAgICAgICAn0L3Rg9C20L3QviDRg9C60LDQt9GL0LLQsNGC0Ywg0YHRhdC10LzRgywg0L/QviDQutC+0YLQvtGA0L7QuSDRjdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGB0L7Qt9C00LDQstCw0YLRjCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0gKTtcclxuICAgIGRvYy4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcclxuXHJcbiAgICByZXR1cm4gZG9jO1xyXG4gIH1cclxuXHJcbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XHJcblxyXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZClcclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgaWYgKCB2YWx1ZS5faWQgJiYgdmFsdWUuX2lkIGluc3RhbmNlb2Ygb2lkIClcclxuICAgIHJldHVybiB2YWx1ZS5faWQ7XHJcblxyXG4gIGlmICh2YWx1ZS50b1N0cmluZykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIG5ldyBvaWQoIHZhbHVlLnRvU3RyaW5nKCkgKTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGRlZmF1bHRJZCAoKSB7XHJcbiAgcmV0dXJuIG5ldyBvaWQoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRJZCAodikge1xyXG4gIHRoaXMuJF9fLl9pZCA9IG51bGw7XHJcbiAgcmV0dXJuIHY7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xyXG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxyXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzXHJcblxyXG4vKipcclxuICogU3RyaW5nIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gU3RyaW5nU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcclxuICB0aGlzLmVudW1WYWx1ZXMgPSBbXTtcclxuICB0aGlzLnJlZ0V4cCA9IG51bGw7XHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ1N0cmluZycpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTY2hlbWFUeXBlLnByb3RvdHlwZTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGFuIGVudW0gdmFsaWRhdG9yXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHN0YXRlcyA9ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJylcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogc3RhdGVzIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxyXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBgaW52YWxpZGAgaXMgbm90IGEgdmFsaWQgZW51bSB2YWx1ZSBmb3IgcGF0aCBgc3RhdGVgLlxyXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXHJcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VzXHJcbiAqICAgICB2YXIgZW51ID0ge1xyXG4gKiAgICAgICB2YWx1ZXM6ICdvcGVuaW5nIG9wZW4gY2xvc2luZyBjbG9zZWQnLnNwbGl0KCcgJyksXHJcbiAqICAgICAgIG1lc3NhZ2U6ICdlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnXHJcbiAqICAgICB9XHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IGVudSB9KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgc3RhdGU6ICdpbnZhbGlkJyB9KVxyXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBlbnVtIHZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHN0YXRlYCB3aXRoIHZhbHVlIGBpbnZhbGlkYFxyXG4gKiAgICAgICBtLnN0YXRlID0gJ29wZW4nXHJcbiAqICAgICAgIG0uc2F2ZShjYWxsYmFjaykgLy8gc3VjY2Vzc1xyXG4gKiAgICAgfSlcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBbYXJncy4uLl0gZW51bWVyYXRpb24gdmFsdWVzXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmVudW0gPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuZW51bVZhbGlkYXRvcikge1xyXG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbih2KXtcclxuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5lbnVtVmFsaWRhdG9yO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlmICh1bmRlZmluZWQgPT09IGFyZ3VtZW50c1swXSB8fCBmYWxzZSA9PT0gYXJndW1lbnRzWzBdKSB7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHZhciB2YWx1ZXM7XHJcbiAgdmFyIGVycm9yTWVzc2FnZTtcclxuXHJcbiAgaWYgKF8uaXNQbGFpbk9iamVjdChhcmd1bWVudHNbMF0pKSB7XHJcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHNbMF0udmFsdWVzO1xyXG4gICAgZXJyb3JNZXNzYWdlID0gYXJndW1lbnRzWzBdLm1lc3NhZ2U7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhbHVlcyA9IGFyZ3VtZW50cztcclxuICAgIGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuU3RyaW5nLmVudW07XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gdmFsdWVzW2ldKSB7XHJcbiAgICAgIHRoaXMuZW51bVZhbHVlcy5wdXNoKHRoaXMuY2FzdCh2YWx1ZXNbaV0pKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciB2YWxzID0gdGhpcy5lbnVtVmFsdWVzO1xyXG4gIHRoaXMuZW51bVZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2IHx8IH52YWxzLmluZGV4T2Yodik7XHJcbiAgfTtcclxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5lbnVtVmFsaWRhdG9yLCBlcnJvck1lc3NhZ2UsICdlbnVtJ10pO1xyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbG93ZXJjYXNlIHNldHRlci5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBlbWFpbDogJ1NvbWVFbWFpbEBleGFtcGxlLkNPTScgfSk7XHJcbiAqICAgICBjb25zb2xlLmxvZyhtLmVtYWlsKSAvLyBzb21lZW1haWxAZXhhbXBsZS5jb21cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5sb3dlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XHJcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XHJcbiAgICBpZiAodikgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcclxuICAgIHJldHVybiB2O1xyXG4gIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYW4gdXBwZXJjYXNlIHNldHRlci5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBjYXBzOiB7IHR5cGU6IFN0cmluZywgdXBwZXJjYXNlOiB0cnVlIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGNhcHM6ICdhbiBleGFtcGxlJyB9KTtcclxuICogICAgIGNvbnNvbGUubG9nKG0uY2FwcykgLy8gQU4gRVhBTVBMRVxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLnVwcGVyY2FzZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcclxuICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcclxuICAgIGlmICh2KSByZXR1cm4gdi50b1VwcGVyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIHY7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIHRyaW0gc2V0dGVyLlxyXG4gKlxyXG4gKiBUaGUgc3RyaW5nIHZhbHVlIHdpbGwgYmUgdHJpbW1lZCB3aGVuIHNldC5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdHJpbTogdHJ1ZSB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxyXG4gKiAgICAgdmFyIHN0cmluZyA9ICcgc29tZSBuYW1lICdcclxuICogICAgIGNvbnNvbGUubG9nKHN0cmluZy5sZW5ndGgpIC8vIDExXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogc3RyaW5nIH0pXHJcbiAqICAgICBjb25zb2xlLmxvZyhtLm5hbWUubGVuZ3RoKSAvLyA5XHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudHJpbSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcclxuICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcclxuICAgIGlmICh2KSByZXR1cm4gdi50cmltKCk7XHJcbiAgICByZXR1cm4gdjtcclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIGEgcmVnZXhwIHZhbGlkYXRvci5cclxuICpcclxuICogQW55IHZhbHVlIHRoYXQgZG9lcyBub3QgcGFzcyBgcmVnRXhwYC50ZXN0KHZhbCkgd2lsbCBmYWlsIHZhbGlkYXRpb24uXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbmFtZTogJ0kgYW0gaW52YWxpZCcgfSlcclxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogUGF0aCBgbmFtZWAgaXMgaW52YWxpZCAoSSBhbSBpbnZhbGlkKS5cIlxyXG4gKiAgICAgICBtLm5hbWUgPSAnYXBwbGVzJ1xyXG4gKiAgICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgICBhc3NlcnQub2soZXJyKSAvLyBzdWNjZXNzXHJcbiAqICAgICAgIH0pXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgLy8gdXNpbmcgYSBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKiAgICAgdmFyIG1hdGNoID0gWyAvXFwuaHRtbCQvLCBcIlRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoe1ZBTFVFfSlcIiBdO1xyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgZmlsZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiBtYXRjaCB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBmaWxlOiAnaW52YWxpZCcgfSk7XHJcbiAqICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFwiVmFsaWRhdGlvbkVycm9yOiBUaGF0IGZpbGUgZG9lc24ndCBlbmQgaW4gLmh0bWwgKGludmFsaWQpXCJcclxuICogICAgIH0pXHJcbiAqXHJcbiAqIEVtcHR5IHN0cmluZ3MsIGB1bmRlZmluZWRgLCBhbmQgYG51bGxgIHZhbHVlcyBhbHdheXMgcGFzcyB0aGUgbWF0Y2ggdmFsaWRhdG9yLiBJZiB5b3UgcmVxdWlyZSB0aGVzZSB2YWx1ZXMsIGVuYWJsZSB0aGUgYHJlcXVpcmVkYCB2YWxpZGF0b3IgYWxzby5cclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogL15hLywgcmVxdWlyZWQ6IHRydWUgfX0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7UmVnRXhwfSByZWdFeHAgcmVndWxhciBleHByZXNzaW9uIHRvIHRlc3QgYWdhaW5zdFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gbWF0Y2ggKHJlZ0V4cCwgbWVzc2FnZSkge1xyXG4gIC8vIHllcywgd2UgYWxsb3cgbXVsdGlwbGUgbWF0Y2ggdmFsaWRhdG9yc1xyXG5cclxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLlN0cmluZy5tYXRjaDtcclxuXHJcbiAgZnVuY3Rpb24gbWF0Y2hWYWxpZGF0b3IgKHYpe1xyXG4gICAgcmV0dXJuIG51bGwgIT0gdiAmJiAnJyAhPT0gdlxyXG4gICAgICA/IHJlZ0V4cC50ZXN0KHYpXHJcbiAgICAgIDogdHJ1ZVxyXG4gIH1cclxuXHJcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW21hdGNoVmFsaWRhdG9yLCBtc2csICdyZWdleHAnXSk7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2sgcmVxdWlyZWRcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gY2hlY2tSZXF1aXJlZCAodmFsdWUsIGRvYykge1xyXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZih0aGlzLCB2YWx1ZSwgZG9jLCB0cnVlKSkge1xyXG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiAodmFsdWUgaW5zdGFuY2VvZiBTdHJpbmcgfHwgdHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSAmJiB2YWx1ZS5sZW5ndGg7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhc3RzIHRvIFN0cmluZ1xyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XHJcbiAgaWYgKCB2YWx1ZSA9PT0gbnVsbCApIHtcclxuICAgIHJldHVybiB2YWx1ZTtcclxuICB9XHJcblxyXG4gIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlKSB7XHJcbiAgICAvLyBoYW5kbGUgZG9jdW1lbnRzIGJlaW5nIHBhc3NlZFxyXG4gICAgaWYgKHZhbHVlLl9pZCAmJiAnc3RyaW5nJyA9PSB0eXBlb2YgdmFsdWUuX2lkKSB7XHJcbiAgICAgIHJldHVybiB2YWx1ZS5faWQ7XHJcbiAgICB9XHJcbiAgICBpZiAoIHZhbHVlLnRvU3RyaW5nICkge1xyXG4gICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ3N0cmluZycsIHZhbHVlLCB0aGlzLnBhdGgpO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3RyaW5nU2NoZW1hO1xyXG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgZXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XHJcbnZhciBlcnJvck1lc3NhZ2VzID0gZXJyb3IubWVzc2FnZXM7XHJcbnZhciBDYXN0RXJyb3IgPSBlcnJvci5DYXN0RXJyb3I7XHJcbnZhciBWYWxpZGF0b3JFcnJvciA9IGVycm9yLlZhbGlkYXRvckVycm9yO1xyXG5cclxuLyoqXHJcbiAqIFNjaGVtYVR5cGUgY29uc3RydWN0b3JcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW2luc3RhbmNlXVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIFNjaGVtYVR5cGUgKHBhdGgsIG9wdGlvbnMsIGluc3RhbmNlKSB7XHJcbiAgdGhpcy5wYXRoID0gcGF0aDtcclxuICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgdGhpcy52YWxpZGF0b3JzID0gW107XHJcbiAgdGhpcy5zZXR0ZXJzID0gW107XHJcbiAgdGhpcy5nZXR0ZXJzID0gW107XHJcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcclxuXHJcbiAgZm9yICh2YXIgaSBpbiBvcHRpb25zKSBpZiAodGhpc1tpXSAmJiAnZnVuY3Rpb24nID09IHR5cGVvZiB0aGlzW2ldKSB7XHJcbiAgICB2YXIgb3B0cyA9IEFycmF5LmlzQXJyYXkob3B0aW9uc1tpXSlcclxuICAgICAgPyBvcHRpb25zW2ldXHJcbiAgICAgIDogW29wdGlvbnNbaV1dO1xyXG5cclxuICAgIHRoaXNbaV0uYXBwbHkodGhpcywgb3B0cyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU2V0cyBhIGRlZmF1bHQgdmFsdWUgZm9yIHRoaXMgU2NoZW1hVHlwZS5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBkZWZhdWx0OiAxMCB9KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSlcclxuICogICAgIHZhciBtID0gbmV3IE07XHJcbiAqICAgICBjb25zb2xlLmxvZyhtLm4pIC8vIDEwXHJcbiAqXHJcbiAqIERlZmF1bHRzIGNhbiBiZSBlaXRoZXIgYGZ1bmN0aW9uc2Agd2hpY2ggcmV0dXJuIHRoZSB2YWx1ZSB0byB1c2UgYXMgdGhlIGRlZmF1bHQgb3IgdGhlIGxpdGVyYWwgdmFsdWUgaXRzZWxmLiBFaXRoZXIgd2F5LCB0aGUgdmFsdWUgd2lsbCBiZSBjYXN0IGJhc2VkIG9uIGl0cyBzY2hlbWEgdHlwZSBiZWZvcmUgYmVpbmcgc2V0IGR1cmluZyBkb2N1bWVudCBjcmVhdGlvbi5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICAvLyB2YWx1ZXMgYXJlIGNhc3Q6XHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IGFOdW1iZXI6IE51bWJlciwgZGVmYXVsdDogXCI0LjgxNTE2MjM0MlwiIH0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTTtcclxuICogICAgIGNvbnNvbGUubG9nKG0uYU51bWJlcikgLy8gNC44MTUxNjIzNDJcclxuICpcclxuICogICAgIC8vIGRlZmF1bHQgdW5pcXVlIG9iamVjdHMgZm9yIE1peGVkIHR5cGVzOlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBtaXhlZDogU2NoZW1hLlR5cGVzLk1peGVkIH0pO1xyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdChmdW5jdGlvbiAoKSB7XHJcbiAqICAgICAgIHJldHVybiB7fTtcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiAgICAgLy8gaWYgd2UgZG9uJ3QgdXNlIGEgZnVuY3Rpb24gdG8gcmV0dXJuIG9iamVjdCBsaXRlcmFscyBmb3IgTWl4ZWQgZGVmYXVsdHMsXHJcbiAqICAgICAvLyBlYWNoIGRvY3VtZW50IHdpbGwgcmVjZWl2ZSBhIHJlZmVyZW5jZSB0byB0aGUgc2FtZSBvYmplY3QgbGl0ZXJhbCBjcmVhdGluZ1xyXG4gKiAgICAgLy8gYSBcInNoYXJlZFwiIG9iamVjdCBpbnN0YW5jZTpcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbWl4ZWQ6IFNjaGVtYS5UeXBlcy5NaXhlZCB9KTtcclxuICogICAgIHNjaGVtYS5wYXRoKCdtaXhlZCcpLmRlZmF1bHQoe30pO1xyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSk7XHJcbiAqICAgICB2YXIgbTEgPSBuZXcgTTtcclxuICogICAgIG0xLm1peGVkLmFkZGVkID0gMTtcclxuICogICAgIGNvbnNvbGUubG9nKG0xLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XHJcbiAqICAgICB2YXIgbTIgPSBuZXcgTTtcclxuICogICAgIGNvbnNvbGUubG9nKG0yLm1peGVkKTsgLy8geyBhZGRlZDogMSB9XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb258YW55fSB2YWwgdGhlIGRlZmF1bHQgdmFsdWVcclxuICogQHJldHVybiB7ZGVmYXVsdFZhbHVlfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuZGVmYXVsdCA9IGZ1bmN0aW9uICh2YWwpIHtcclxuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nXHJcbiAgICAgID8gdmFsXHJcbiAgICAgIDogdGhpcy5jYXN0KCB2YWwgKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgfSBlbHNlIGlmICggYXJndW1lbnRzLmxlbmd0aCA+IDEgKSB7XHJcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IF8udG9BcnJheSggYXJndW1lbnRzICk7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmRlZmF1bHRWYWx1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgc2V0dGVyIHRvIHRoaXMgc2NoZW1hdHlwZS5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiBjYXBpdGFsaXplICh2YWwpIHtcclxuICogICAgICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2YWwpIHZhbCA9ICcnO1xyXG4gKiAgICAgICByZXR1cm4gdmFsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsLnN1YnN0cmluZygxKTtcclxuICogICAgIH1cclxuICpcclxuICogICAgIC8vIGRlZmluaW5nIHdpdGhpbiB0aGUgc2NoZW1hXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgc2V0OiBjYXBpdGFsaXplIH19KVxyXG4gKlxyXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pXHJcbiAqICAgICBzLnBhdGgoJ25hbWUnKS5zZXQoY2FwaXRhbGl6ZSlcclxuICpcclxuICogU2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cclxuICpcclxuICogU3VwcG9zZSB5b3UgYXJlIGltcGxlbWVudGluZyB1c2VyIHJlZ2lzdHJhdGlvbiBmb3IgYSB3ZWJzaXRlLiBVc2VycyBwcm92aWRlIGFuIGVtYWlsIGFuZCBwYXNzd29yZCwgd2hpY2ggZ2V0cyBzYXZlZCB0byBtb25nb2RiLiBUaGUgZW1haWwgaXMgYSBzdHJpbmcgdGhhdCB5b3Ugd2lsbCB3YW50IHRvIG5vcm1hbGl6ZSB0byBsb3dlciBjYXNlLCBpbiBvcmRlciB0byBhdm9pZCBvbmUgZW1haWwgaGF2aW5nIG1vcmUgdGhhbiBvbmUgYWNjb3VudCAtLSBlLmcuLCBvdGhlcndpc2UsIGF2ZW51ZUBxLmNvbSBjYW4gYmUgcmVnaXN0ZXJlZCBmb3IgMiBhY2NvdW50cyB2aWEgYXZlbnVlQHEuY29tIGFuZCBBdkVuVWVAUS5Db00uXHJcbiAqXHJcbiAqIFlvdSBjYW4gc2V0IHVwIGVtYWlsIGxvd2VyIGNhc2Ugbm9ybWFsaXphdGlvbiBlYXNpbHkgdmlhIGEgTW9uZ29vc2Ugc2V0dGVyLlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gdG9Mb3dlciAodikge1xyXG4gKiAgICAgICByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgdmFyIFVzZXJTY2hlbWEgPSBuZXcgU2NoZW1hKHtcclxuICogICAgICAgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IHRvTG93ZXIgfVxyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIHZhciBVc2VyID0gZGIubW9kZWwoJ1VzZXInLCBVc2VyU2NoZW1hKVxyXG4gKlxyXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlcih7ZW1haWw6ICdBVkVOVUVAUS5DT00nfSlcclxuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpOyAvLyAnYXZlbnVlQHEuY29tJ1xyXG4gKlxyXG4gKiAgICAgLy8gb3JcclxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXJcclxuICogICAgIHVzZXIuZW1haWwgPSAnQXZlbnVlQFEuY29tJ1xyXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCkgLy8gJ2F2ZW51ZUBxLmNvbSdcclxuICpcclxuICogQXMgeW91IGNhbiBzZWUgYWJvdmUsIHNldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgZGF0YSBiZWZvcmUgaXQgZ2V0cyB0byB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgYW5kIGlzIHNldCBhcyBhIHZhbHVlIG9uIGFuIGFjdHVhbCBrZXkuXHJcbiAqXHJcbiAqIF9OT1RFOiB3ZSBjb3VsZCBoYXZlIGFsc28ganVzdCB1c2VkIHRoZSBidWlsdC1pbiBgbG93ZXJjYXNlOiB0cnVlYCBTY2hlbWFUeXBlIG9wdGlvbiBpbnN0ZWFkIG9mIGRlZmluaW5nIG91ciBvd24gZnVuY3Rpb24uX1xyXG4gKlxyXG4gKiAgICAgbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxyXG4gKlxyXG4gKiBTZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIHNldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiBpbnNwZWN0b3IgKHZhbCwgc2NoZW1hdHlwZSkge1xyXG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XHJcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xyXG4gKiAgICAgICB9IGVsc2Uge1xyXG4gKiAgICAgICAgIHJldHVybiB2YWw7XHJcbiAqICAgICAgIH1cclxuICogICAgIH1cclxuICpcclxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xyXG4gKiAgICAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUsIHNldDogaW5zcGVjdG9yIH0sXHJcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgc2V0OiBpbnNwZWN0b3IgfVxyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcclxuICogICAgIHZhciB2ID0gbmV3IFZpcnVzKHsgbmFtZTogJ1BhcnZvdmlyaWRhZScsIHRheG9ub215OiAnUGFydm92aXJpbmFlJyB9KTtcclxuICpcclxuICogICAgIGNvbnNvbGUubG9nKHYubmFtZSk7ICAgICAvLyBuYW1lIGlzIHJlcXVpcmVkXHJcbiAqICAgICBjb25zb2xlLmxvZyh2LnRheG9ub215KTsgLy8gUGFydm92aXJpbmFlXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiBmbilcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Egc2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcclxuICB0aGlzLnNldHRlcnMucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIGdldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gZG9iICh2YWwpIHtcclxuICogICAgICAgaWYgKCF2YWwpIHJldHVybiB2YWw7XHJcbiAqICAgICAgIHJldHVybiAodmFsLmdldE1vbnRoKCkgKyAxKSArIFwiL1wiICsgdmFsLmdldERhdGUoKSArIFwiL1wiICsgdmFsLmdldEZ1bGxZZWFyKCk7XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCBnZXQ6IGRvYiB9KVxyXG4gKlxyXG4gKiAgICAgLy8gb3IgYnkgcmV0cmVpdmluZyBpdHMgU2NoZW1hVHlwZVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogRGF0ZSB9KVxyXG4gKiAgICAgcy5wYXRoKCdib3JuJykuZ2V0KGRvYilcclxuICpcclxuICogR2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBhcyBpdCB0cmF2ZWxzIGZyb20gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IHRvIHRoZSB2YWx1ZSB0aGF0IHlvdSBzZWUuXHJcbiAqXHJcbiAqIFN1cHBvc2UgeW91IGFyZSBzdG9yaW5nIGNyZWRpdCBjYXJkIG51bWJlcnMgYW5kIHlvdSB3YW50IHRvIGhpZGUgZXZlcnl0aGluZyBleGNlcHQgdGhlIGxhc3QgNCBkaWdpdHMgdG8gdGhlIG1vbmdvb3NlIHVzZXIuIFlvdSBjYW4gZG8gc28gYnkgZGVmaW5pbmcgYSBnZXR0ZXIgaW4gdGhlIGZvbGxvd2luZyB3YXk6XHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiBvYmZ1c2NhdGUgKGNjKSB7XHJcbiAqICAgICAgIHJldHVybiAnKioqKi0qKioqLSoqKiotJyArIGNjLnNsaWNlKGNjLmxlbmd0aC00LCBjYy5sZW5ndGgpO1xyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgdmFyIEFjY291bnRTY2hlbWEgPSBuZXcgU2NoZW1hKHtcclxuICogICAgICAgY3JlZGl0Q2FyZE51bWJlcjogeyB0eXBlOiBTdHJpbmcsIGdldDogb2JmdXNjYXRlIH1cclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiAgICAgdmFyIEFjY291bnQgPSBkYi5tb2RlbCgnQWNjb3VudCcsIEFjY291bnRTY2hlbWEpO1xyXG4gKlxyXG4gKiAgICAgQWNjb3VudC5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgZm91bmQpIHtcclxuICogICAgICAgY29uc29sZS5sb2coZm91bmQuY3JlZGl0Q2FyZE51bWJlcik7IC8vICcqKioqLSoqKiotKioqKi0xMjM0J1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEdldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgZ2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cclxuICpcclxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XHJcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcclxuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyByZXF1aXJlZCc7XHJcbiAqICAgICAgIH0gZWxzZSB7XHJcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgbm90JztcclxuICogICAgICAgfVxyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgdmFyIFZpcnVzU2NoZW1hID0gbmV3IFNjaGVtYSh7XHJcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZ2V0OiBpbnNwZWN0b3IgfSxcclxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IGluc3BlY3RvciB9XHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xyXG4gKlxyXG4gKiAgICAgVmlydXMuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIHZpcnVzKSB7XHJcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxyXG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy50YXhvbm9teSk7IC8vIHRheG9ub215IGlzIG5vdFxyXG4gKiAgICAgfSlcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIGZuKVxyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBnZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xyXG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIHZhbGlkYXRvcihzKSBmb3IgdGhpcyBkb2N1bWVudCBwYXRoLlxyXG4gKlxyXG4gKiBWYWxpZGF0b3JzIGFsd2F5cyByZWNlaXZlIHRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyB0aGVpciBmaXJzdCBhcmd1bWVudCBhbmQgbXVzdCByZXR1cm4gYEJvb2xlYW5gLiBSZXR1cm5pbmcgYGZhbHNlYCBtZWFucyB2YWxpZGF0aW9uIGZhaWxlZC5cclxuICpcclxuICogVGhlIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQgaXMgb3B0aW9uYWwuIElmIG5vdCBwYXNzZWQsIHRoZSBbZGVmYXVsdCBnZW5lcmljIGVycm9yIG1lc3NhZ2UgdGVtcGxhdGVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKSB3aWxsIGJlIHVzZWQuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlczpcclxuICpcclxuICogICAgIC8vIG1ha2Ugc3VyZSBldmVyeSB2YWx1ZSBpcyBlcXVhbCB0byBcInNvbWV0aGluZ1wiXHJcbiAqICAgICBmdW5jdGlvbiB2YWxpZGF0b3IgKHZhbCkge1xyXG4gKiAgICAgICByZXR1cm4gdmFsID09ICdzb21ldGhpbmcnO1xyXG4gKiAgICAgfVxyXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogdmFsaWRhdG9yIH19KTtcclxuICpcclxuICogICAgIC8vIHdpdGggYSBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKlxyXG4gKiAgICAgdmFyIGN1c3RvbSA9IFt2YWxpZGF0b3IsICdVaCBvaCwge1BBVEh9IGRvZXMgbm90IGVxdWFsIFwic29tZXRoaW5nXCIuJ11cclxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IGN1c3RvbSB9fSk7XHJcbiAqXHJcbiAqICAgICAvLyBhZGRpbmcgbWFueSB2YWxpZGF0b3JzIGF0IGEgdGltZVxyXG4gKlxyXG4gKiAgICAgdmFyIG1hbnkgPSBbXHJcbiAqICAgICAgICAgeyB2YWxpZGF0b3I6IHZhbGlkYXRvciwgbXNnOiAndWggb2gnIH1cclxuICogICAgICAgLCB7IHZhbGlkYXRvcjogYW5vdGhlclZhbGlkYXRvciwgbXNnOiAnZmFpbGVkJyB9XHJcbiAqICAgICBdXHJcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBtYW55IH19KTtcclxuICpcclxuICogICAgIC8vIG9yIHV0aWxpemluZyBTY2hlbWFUeXBlIG1ldGhvZHMgZGlyZWN0bHk6XHJcbiAqXHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG5hbWU6ICdzdHJpbmcnIH0pO1xyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZSh2YWxpZGF0b3IsICd2YWxpZGF0aW9uIG9mIGB7UEFUSH1gIGZhaWxlZCB3aXRoIHZhbHVlIGB7VkFMVUV9YCcpO1xyXG4gKlxyXG4gKiAjIyMjRXJyb3IgbWVzc2FnZSB0ZW1wbGF0ZXM6XHJcbiAqXHJcbiAqIEZyb20gdGhlIGV4YW1wbGVzIGFib3ZlLCB5b3UgbWF5IGhhdmUgbm90aWNlZCB0aGF0IGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzZWljIHRlbXBsYXRpbmcuIFRoZXJlIGFyZSBhIGZldyBvdGhlciB0ZW1wbGF0ZSBrZXl3b3JkcyBiZXNpZGVzIGB7UEFUSH1gIGFuZCBge1ZBTFVFfWAgdG9vLiBUbyBmaW5kIG91dCBtb3JlLCBkZXRhaWxzIGFyZSBhdmFpbGFibGUgW2hlcmVdKCNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzKVxyXG4gKlxyXG4gKiAjIyMjQXN5bmNocm9ub3VzIHZhbGlkYXRpb246XHJcbiAqXHJcbiAqIFBhc3NpbmcgYSB2YWxpZGF0b3IgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0d28gYXJndW1lbnRzIHRlbGxzIG1vbmdvb3NlIHRoYXQgdGhlIHZhbGlkYXRvciBpcyBhbiBhc3luY2hyb25vdXMgdmFsaWRhdG9yLiBUaGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIHRvIHRoZSB2YWxpZGF0b3IgZnVuY3Rpb24gaXMgdGhlIHZhbHVlIGJlaW5nIHZhbGlkYXRlZC4gVGhlIHNlY29uZCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgbXVzdCBjYWxsZWQgd2hlbiB5b3UgZmluaXNoIHZhbGlkYXRpbmcgdGhlIHZhbHVlIGFuZCBwYXNzZWQgZWl0aGVyIGB0cnVlYCBvciBgZmFsc2VgIHRvIGNvbW11bmljYXRlIGVpdGhlciBzdWNjZXNzIG9yIGZhaWx1cmUgcmVzcGVjdGl2ZWx5LlxyXG4gKlxyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKS52YWxpZGF0ZShmdW5jdGlvbiAodmFsdWUsIHJlc3BvbmQpIHtcclxuICogICAgICAgZG9TdHVmZih2YWx1ZSwgZnVuY3Rpb24gKCkge1xyXG4gKiAgICAgICAgIC4uLlxyXG4gKiAgICAgICAgIHJlc3BvbmQoZmFsc2UpOyAvLyB2YWxpZGF0aW9uIGZhaWxlZFxyXG4gKiAgICAgICB9KVxyXG4qICAgICAgfSwgJ3tQQVRIfSBmYWlsZWQgdmFsaWRhdGlvbi4nKTtcclxuKlxyXG4gKiBZb3UgbWlnaHQgdXNlIGFzeW5jaHJvbm91cyB2YWxpZGF0b3JzIHRvIHJldHJlaXZlIG90aGVyIGRvY3VtZW50cyBmcm9tIHRoZSBkYXRhYmFzZSB0byB2YWxpZGF0ZSBhZ2FpbnN0IG9yIHRvIG1lZXQgb3RoZXIgSS9PIGJvdW5kIHZhbGlkYXRpb24gbmVlZHMuXHJcbiAqXHJcbiAqIFZhbGlkYXRpb24gb2NjdXJzIGBwcmUoJ3NhdmUnKWAgb3Igd2hlbmV2ZXIgeW91IG1hbnVhbGx5IGV4ZWN1dGUgW2RvY3VtZW50I3ZhbGlkYXRlXSgjZG9jdW1lbnRfRG9jdW1lbnQtdmFsaWRhdGUpLlxyXG4gKlxyXG4gKiBJZiB2YWxpZGF0aW9uIGZhaWxzIGR1cmluZyBgcHJlKCdzYXZlJylgIGFuZCBubyBjYWxsYmFjayB3YXMgcGFzc2VkIHRvIHJlY2VpdmUgdGhlIGVycm9yLCBhbiBgZXJyb3JgIGV2ZW50IHdpbGwgYmUgZW1pdHRlZCBvbiB5b3VyIE1vZGVscyBhc3NvY2lhdGVkIGRiIFtjb25uZWN0aW9uXSgjY29ubmVjdGlvbl9Db25uZWN0aW9uKSwgcGFzc2luZyB0aGUgdmFsaWRhdGlvbiBlcnJvciBvYmplY3QgYWxvbmcuXHJcbiAqXHJcbiAqICAgICB2YXIgY29ubiA9IG1vbmdvb3NlLmNyZWF0ZUNvbm5lY3Rpb24oLi4pO1xyXG4gKiAgICAgY29ubi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XHJcbiAqXHJcbiAqICAgICB2YXIgUHJvZHVjdCA9IGNvbm4ubW9kZWwoJ1Byb2R1Y3QnLCB5b3VyU2NoZW1hKTtcclxuICogICAgIHZhciBkdmQgPSBuZXcgUHJvZHVjdCguLik7XHJcbiAqICAgICBkdmQuc2F2ZSgpOyAvLyBlbWl0cyBlcnJvciBvbiB0aGUgYGNvbm5gIGFib3ZlXHJcbiAqXHJcbiAqIElmIHlvdSBkZXNpcmUgaGFuZGxpbmcgdGhlc2UgZXJyb3JzIGF0IHRoZSBNb2RlbCBsZXZlbCwgYXR0YWNoIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8geW91ciBNb2RlbCBhbmQgdGhlIGV2ZW50IHdpbGwgaW5zdGVhZCBiZSBlbWl0dGVkIHRoZXJlLlxyXG4gKlxyXG4gKiAgICAgLy8gcmVnaXN0ZXJpbmcgYW4gZXJyb3IgbGlzdGVuZXIgb24gdGhlIE1vZGVsIGxldHMgdXMgaGFuZGxlIGVycm9ycyBtb3JlIGxvY2FsbHlcclxuICogICAgIFByb2R1Y3Qub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge1JlZ0V4cHxGdW5jdGlvbnxPYmplY3R9IG9iaiB2YWxpZGF0b3JcclxuICogQHBhcmFtIHtTdHJpbmd9IFtlcnJvck1zZ10gb3B0aW9uYWwgZXJyb3IgbWVzc2FnZVxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChvYmosIG1lc3NhZ2UsIHR5cGUpIHtcclxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygb2JqIHx8IG9iaiAmJiAnUmVnRXhwJyA9PT0gb2JqLmNvbnN0cnVjdG9yLm5hbWUpIHtcclxuICAgIGlmICghbWVzc2FnZSkgbWVzc2FnZSA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xyXG4gICAgaWYgKCF0eXBlKSB0eXBlID0gJ3VzZXIgZGVmaW5lZCc7XHJcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbb2JqLCBtZXNzYWdlLCB0eXBlXSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aFxyXG4gICAgLCBhcmc7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIGFyZyA9IGFyZ3VtZW50c1tpXTtcclxuICAgIGlmICghKGFyZyAmJiAnT2JqZWN0JyA9PSBhcmcuY29uc3RydWN0b3IubmFtZSkpIHtcclxuICAgICAgdmFyIG1zZyA9ICdJbnZhbGlkIHZhbGlkYXRvci4gUmVjZWl2ZWQgKCcgKyB0eXBlb2YgYXJnICsgJykgJ1xyXG4gICAgICAgICsgYXJnXHJcbiAgICAgICAgKyAnLiBTZWUgaHR0cDovL21vbmdvb3NlanMuY29tL2RvY3MvYXBpLmh0bWwjc2NoZW1hdHlwZV9TY2hlbWFUeXBlLXZhbGlkYXRlJztcclxuXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG4gICAgfVxyXG4gICAgdGhpcy52YWxpZGF0ZShhcmcudmFsaWRhdG9yLCBhcmcubXNnLCBhcmcudHlwZSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgcmVxdWlyZWQgdmFsaWRhdG9yIHRvIHRoaXMgc2NoZW1hdHlwZS5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiB0cnVlIH0pXHJcbiAqXHJcbiAqICAgICAvLyBvciB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdlXHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIHJlcXVpcmVkOiAne1BBVEh9IGlzIHJlcXVpcmVkIScgfSlcclxuICpcclxuICogICAgIC8vIG9yIHRocm91Z2ggdGhlIHBhdGggQVBJXHJcbiAqXHJcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUpO1xyXG4gKlxyXG4gKiAgICAgLy8gd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnaW5nXHJcbiAqXHJcbiAqICAgICBTY2hlbWEucGF0aCgnbmFtZScpLnJlcXVpcmVkKHRydWUsICdncnJyIDooICcpO1xyXG4gKlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIGVuYWJsZS9kaXNhYmxlIHRoZSB2YWxpZGF0b3JcclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUucmVxdWlyZWQgPSBmdW5jdGlvbiAocmVxdWlyZWQsIG1lc3NhZ2UpIHtcclxuICBpZiAoZmFsc2UgPT09IHJlcXVpcmVkKSB7XHJcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMucmVxdWlyZWRWYWxpZGF0b3I7XHJcbiAgICB9LCB0aGlzKTtcclxuXHJcbiAgICB0aGlzLmlzUmVxdWlyZWQgPSBmYWxzZTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMuaXNSZXF1aXJlZCA9IHRydWU7XHJcblxyXG4gIHRoaXMucmVxdWlyZWRWYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xyXG4gICAgLy8gaW4gaGVyZSwgYHRoaXNgIHJlZmVycyB0byB0aGUgdmFsaWRhdGluZyBkb2N1bWVudC5cclxuICAgIC8vIG5vIHZhbGlkYXRpb24gd2hlbiB0aGlzIHBhdGggd2Fzbid0IHNlbGVjdGVkIGluIHRoZSBxdWVyeS5cclxuICAgIGlmICh0aGlzICE9PSB1bmRlZmluZWQgJiYgLy8g0YHQv9C10YbQuNCw0LvRjNC90LDRjyDQv9GA0L7QstC10YDQutCwINC40Lct0LfQsCBzdHJpY3QgbW9kZSDQuCDQvtGB0L7QsdC10L3QvdC+0YHRgtC4IC5jYWxsKHVuZGVmaW5lZClcclxuICAgICAgICAnaXNTZWxlY3RlZCcgaW4gdGhpcyAmJlxyXG4gICAgICAgICF0aGlzLmlzU2VsZWN0ZWQoc2VsZi5wYXRoKSAmJlxyXG4gICAgICAgICF0aGlzLmlzTW9kaWZpZWQoc2VsZi5wYXRoKSkgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgcmV0dXJuIHNlbGYuY2hlY2tSZXF1aXJlZCh2LCB0aGlzKTtcclxuICB9O1xyXG5cclxuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHJlcXVpcmVkKSB7XHJcbiAgICBtZXNzYWdlID0gcmVxdWlyZWQ7XHJcbiAgICByZXF1aXJlZCA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5yZXF1aXJlZDtcclxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5yZXF1aXJlZFZhbGlkYXRvciwgbXNnLCAncmVxdWlyZWQnXSk7XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBkZWZhdWx0IHZhbHVlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZSB0aGUgc2NvcGUgd2hpY2ggY2FsbGJhY2sgYXJlIGV4ZWN1dGVkXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmdldERlZmF1bHQgPSBmdW5jdGlvbiAoc2NvcGUsIGluaXQpIHtcclxuICB2YXIgcmV0ID0gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuZGVmYXVsdFZhbHVlXHJcbiAgICA/IHRoaXMuZGVmYXVsdFZhbHVlLmNhbGwoc2NvcGUpXHJcbiAgICA6IHRoaXMuZGVmYXVsdFZhbHVlO1xyXG5cclxuICBpZiAobnVsbCAhPT0gcmV0ICYmIHVuZGVmaW5lZCAhPT0gcmV0KSB7XHJcbiAgICByZXR1cm4gdGhpcy5jYXN0KHJldCwgc2NvcGUsIGluaXQpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIHNldHRlcnNcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpIHtcclxuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkpIHtcclxuICAgIHJldHVybiBpbml0XHJcbiAgICAgID8gdmFsdWVcclxuICAgICAgOiB0aGlzLmNhc3QodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XHJcbiAgfVxyXG5cclxuICB2YXIgdiA9IHZhbHVlXHJcbiAgICAsIHNldHRlcnMgPSB0aGlzLnNldHRlcnNcclxuICAgICwgbGVuID0gc2V0dGVycy5sZW5ndGhcclxuICAgICwgY2FzdGVyID0gdGhpcy5jYXN0ZXI7XHJcblxyXG4gIGlmIChBcnJheS5pc0FycmF5KHYpICYmIGNhc3RlciAmJiBjYXN0ZXIuc2V0dGVycykge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHZbaV0gPSBjYXN0ZXIuYXBwbHlTZXR0ZXJzKHZbaV0sIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoIWxlbikge1xyXG4gICAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcclxuICAgIHJldHVybiB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcclxuICB9XHJcblxyXG4gIHdoaWxlIChsZW4tLSkge1xyXG4gICAgdiA9IHNldHRlcnNbbGVuXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcclxuICB9XHJcblxyXG4gIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XHJcblxyXG4gIC8vIGRvIG5vdCBjYXN0IHVudGlsIGFsbCBzZXR0ZXJzIGFyZSBhcHBsaWVkICM2NjVcclxuICB2ID0gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XHJcblxyXG4gIHJldHVybiB2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgZ2V0dGVycyB0byBhIHZhbHVlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiggdmFsdWUsIHNjb3BlICl7XHJcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgdmFyIHYgPSB2YWx1ZVxyXG4gICAgLCBnZXR0ZXJzID0gdGhpcy5nZXR0ZXJzXHJcbiAgICAsIGxlbiA9IGdldHRlcnMubGVuZ3RoO1xyXG5cclxuICBpZiAoICFsZW4gKSB7XHJcbiAgICByZXR1cm4gdjtcclxuICB9XHJcblxyXG4gIHdoaWxlICggbGVuLS0gKSB7XHJcbiAgICB2ID0gZ2V0dGVyc1sgbGVuIF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtcyBhIHZhbGlkYXRpb24gb2YgYHZhbHVlYCB1c2luZyB0aGUgdmFsaWRhdG9ycyBkZWNsYXJlZCBmb3IgdGhpcyBTY2hlbWFUeXBlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuZG9WYWxpZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSwgY2FsbGJhY2ssIHNjb3BlKSB7XHJcbiAgdmFyIGVyciA9IGZhbHNlXHJcbiAgICAsIHBhdGggPSB0aGlzLnBhdGhcclxuICAgICwgY291bnQgPSB0aGlzLnZhbGlkYXRvcnMubGVuZ3RoO1xyXG5cclxuICBpZiAoIWNvdW50KSByZXR1cm4gY2FsbGJhY2sobnVsbCk7XHJcblxyXG4gIGZ1bmN0aW9uIHZhbGlkYXRlIChvaywgbWVzc2FnZSwgdHlwZSwgdmFsKSB7XHJcbiAgICBpZiAoZXJyKSByZXR1cm47XHJcbiAgICBpZiAob2sgPT09IHVuZGVmaW5lZCB8fCBvaykge1xyXG4gICAgICAtLWNvdW50IHx8IGNhbGxiYWNrKG51bGwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2FsbGJhY2soZXJyID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIG1lc3NhZ2UsIHR5cGUsIHZhbCkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy52YWxpZGF0b3JzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcclxuICAgIHZhciB2YWxpZGF0b3IgPSB2WzBdXHJcbiAgICAgICwgbWVzc2FnZSA9IHZbMV1cclxuICAgICAgLCB0eXBlID0gdlsyXTtcclxuXHJcbiAgICBpZiAodmFsaWRhdG9yIGluc3RhbmNlb2YgUmVnRXhwKSB7XHJcbiAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci50ZXN0KHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xyXG4gICAgfSBlbHNlIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdmFsaWRhdG9yKSB7XHJcbiAgICAgIGlmICgyID09PSB2YWxpZGF0b3IubGVuZ3RoKSB7XHJcbiAgICAgICAgdmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlLCBmdW5jdGlvbiAob2spIHtcclxuICAgICAgICAgIHZhbGlkYXRlKG9rLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFsaWRhdGUodmFsaWRhdG9yLmNhbGwoc2NvcGUsIHZhbHVlKSwgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lcyBpZiB2YWx1ZSBpcyBhIHZhbGlkIFJlZmVyZW5jZS5cclxuICpcclxuICog0J3QsCDQutC70LjQtdC90YLQtSDQsiDQutCw0YfQtdGB0YLQstC1INGB0YHRi9C70LrQuCDQvNC+0LbQvdC+INGF0YDQsNC90LjRgtGMINC60LDQuiBpZCwg0YLQsNC6INC4INC/0L7Qu9C90YvQtSDQtNC+0LrRg9C80LXQvdGC0YtcclxuICpcclxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBzZWxmXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblNjaGVtYVR5cGUuX2lzUmVmID0gZnVuY3Rpb24oIHNlbGYsIHZhbHVlICl7XHJcbiAgLy8gZmFzdCBwYXRoXHJcbiAgdmFyIHJlZiA9IHNlbGYub3B0aW9ucyAmJiBzZWxmLm9wdGlvbnMucmVmO1xyXG5cclxuICBpZiAoIHJlZiApIHtcclxuICAgIGlmICggbnVsbCA9PSB2YWx1ZSApIHJldHVybiB0cnVlO1xyXG4gICAgaWYgKCBfLmlzT2JqZWN0KCB2YWx1ZSApICkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYVR5cGU7XHJcblxyXG5TY2hlbWFUeXBlLkNhc3RFcnJvciA9IENhc3RFcnJvcjtcclxuXHJcblNjaGVtYVR5cGUuVmFsaWRhdG9yRXJyb3IgPSBWYWxpZGF0b3JFcnJvcjtcclxuIiwiLyohXG4gKiBTdGF0ZU1hY2hpbmUgcmVwcmVzZW50cyBhIG1pbmltYWwgYGludGVyZmFjZWAgZm9yIHRoZVxuICogY29uc3RydWN0b3JzIGl0IGJ1aWxkcyB2aWEgU3RhdGVNYWNoaW5lLmN0b3IoLi4uKS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgU3RhdGVNYWNoaW5lID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBTdGF0ZU1hY2hpbmUgKCkge1xuICB0aGlzLnBhdGhzID0ge307XG4gIHRoaXMuc3RhdGVzID0ge307XG59O1xuXG4vKiFcbiAqIFN0YXRlTWFjaGluZS5jdG9yKCdzdGF0ZTEnLCAnc3RhdGUyJywgLi4uKVxuICogQSBmYWN0b3J5IG1ldGhvZCBmb3Igc3ViY2xhc3NpbmcgU3RhdGVNYWNoaW5lLlxuICogVGhlIGFyZ3VtZW50cyBhcmUgYSBsaXN0IG9mIHN0YXRlcy4gRm9yIGVhY2ggc3RhdGUsXG4gKiB0aGUgY29uc3RydWN0b3IncyBwcm90b3R5cGUgZ2V0cyBzdGF0ZSB0cmFuc2l0aW9uXG4gKiBtZXRob2RzIG5hbWVkIGFmdGVyIGVhY2ggc3RhdGUuIFRoZXNlIHRyYW5zaXRpb24gbWV0aG9kc1xuICogcGxhY2UgdGhlaXIgcGF0aCBhcmd1bWVudCBpbnRvIHRoZSBnaXZlbiBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gc3ViY2xhc3MgY29uc3RydWN0b3JcbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKTtcblxuICB2YXIgY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICBTdGF0ZU1hY2hpbmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnN0YXRlTmFtZXMgPSBzdGF0ZXM7XG5cbiAgICB2YXIgaSA9IHN0YXRlcy5sZW5ndGhcbiAgICAgICwgc3RhdGU7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbiAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXSA9IHt9O1xuICAgIH1cbiAgfTtcblxuICBjdG9yLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdGF0ZU1hY2hpbmUucHJvdG90eXBlO1xuXG4gIHN0YXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIC8vIENoYW5nZXMgdGhlIGBwYXRoYCdzIHN0YXRlIHRvIGBzdGF0ZWAuXG4gICAgY3Rvci5wcm90b3R5cGVbc3RhdGVdID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVN0YXRlKHBhdGgsIHN0YXRlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjdG9yO1xufTtcblxuLyohXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHdyYXBwZWQgYnkgdGhlIHN0YXRlIGNoYW5nZSBmdW5jdGlvbnM6XG4gKlxuICogLSBgcmVxdWlyZShwYXRoKWBcbiAqIC0gYG1vZGlmeShwYXRoKWBcbiAqIC0gYGluaXQocGF0aClgXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5fY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiBfY2hhbmdlU3RhdGUgKHBhdGgsIG5leHRTdGF0ZSkge1xuICB2YXIgcHJldkJ1Y2tldCA9IHRoaXMuc3RhdGVzW3RoaXMucGF0aHNbcGF0aF1dO1xuICBpZiAocHJldkJ1Y2tldCkgZGVsZXRlIHByZXZCdWNrZXRbcGF0aF07XG5cbiAgdGhpcy5wYXRoc1twYXRoXSA9IG5leHRTdGF0ZTtcbiAgdGhpcy5zdGF0ZXNbbmV4dFN0YXRlXVtwYXRoXSA9IHRydWU7XG59O1xuXG4vKiFcbiAqIGlnbm9yZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhciAoc3RhdGUpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnN0YXRlc1tzdGF0ZV0pXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIHBhdGg7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIHBhdGggPSBrZXlzW2ldO1xuICAgIGRlbGV0ZSB0aGlzLnN0YXRlc1tzdGF0ZV1bcGF0aF07XG4gICAgZGVsZXRlIHRoaXMucGF0aHNbcGF0aF07XG4gIH1cbn07XG5cbi8qIVxuICogQ2hlY2tzIHRvIHNlZSBpZiBhdCBsZWFzdCBvbmUgcGF0aCBpcyBpbiB0aGUgc3RhdGVzIHBhc3NlZCBpbiB2aWEgYGFyZ3VtZW50c2BcbiAqIGUuZy4sIHRoaXMuc29tZSgncmVxdWlyZWQnLCAnaW5pdGVkJylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGUgdGhhdCB3ZSB3YW50IHRvIGNoZWNrIGZvci5cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5zb21lID0gZnVuY3Rpb24gc29tZSAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHdoYXQgPSBhcmd1bWVudHMubGVuZ3RoID8gYXJndW1lbnRzIDogdGhpcy5zdGF0ZU5hbWVzO1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNvbWUuY2FsbCh3aGF0LCBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKS5sZW5ndGg7XG4gIH0pO1xufTtcblxuLyohXG4gKiBUaGlzIGZ1bmN0aW9uIGJ1aWxkcyB0aGUgZnVuY3Rpb25zIHRoYXQgZ2V0IGFzc2lnbmVkIHRvIGBmb3JFYWNoYCBhbmQgYG1hcGAsXG4gKiBzaW5jZSBib3RoIG9mIHRob3NlIG1ldGhvZHMgc2hhcmUgYSBsb3Qgb2YgdGhlIHNhbWUgbG9naWMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGl0ZXJNZXRob2QgaXMgZWl0aGVyICdmb3JFYWNoJyBvciAnbWFwJ1xuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLl9pdGVyID0gZnVuY3Rpb24gX2l0ZXIgKGl0ZXJNZXRob2QpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbnVtQXJncyA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgICwgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMCwgbnVtQXJncy0xKVxuICAgICAgLCBjYWxsYmFjayA9IGFyZ3VtZW50c1tudW1BcmdzLTFdO1xuXG4gICAgaWYgKCFzdGF0ZXMubGVuZ3RoKSBzdGF0ZXMgPSB0aGlzLnN0YXRlTmFtZXM7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcGF0aHMgPSBzdGF0ZXMucmVkdWNlKGZ1bmN0aW9uIChwYXRocywgc3RhdGUpIHtcbiAgICAgIHJldHVybiBwYXRocy5jb25jYXQoT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKSk7XG4gICAgfSwgW10pO1xuXG4gICAgcmV0dXJuIHBhdGhzW2l0ZXJNZXRob2RdKGZ1bmN0aW9uIChwYXRoLCBpLCBwYXRocykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHBhdGgsIGksIHBhdGhzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qIVxuICogSXRlcmF0ZXMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2ggKCkge1xuICB0aGlzLmZvckVhY2ggPSB0aGlzLl9pdGVyKCdmb3JFYWNoJyk7XG4gIHJldHVybiB0aGlzLmZvckVhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qIVxuICogTWFwcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHByb2ZpbGUgY2FuIGxvb2sgbGlrZTpcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXG4gKiB0aGlzLmZvckVhY2goZm4pOyAgICAgICAgICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gYWxsIHN0YXRlc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIG1hcCAoKSB7XG4gIHRoaXMubWFwID0gdGhpcy5faXRlcignbWFwJyk7XG4gIHJldHVybiB0aGlzLm1hcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuIiwiLy9UT0RPOiDQv9C+0YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1iZWRkZWREb2N1bWVudCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcbnZhciBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIFN0b3JhZ2UgQXJyYXkgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1ZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIG90aGVyd2lzZSBgU3RvcmFnZUFycmF5I3B1c2hgIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQuX1xuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQGluaGVyaXRzIEFycmF5XG4gKiBAc2VlIGh0dHA6Ly9iaXQubHkvZjZDblpVXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIGFyci5fX3Byb3RvX18gPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gQXJyYXlcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZSA9IG5ldyBBcnJheTtcblxuLyoqXG4gKiBQYXJlbnQgb3duZXIgZG9jdW1lbnRcbiAqXG4gKiBAcHJvcGVydHkgX3BhcmVudFxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuX3BhcmVudDtcblxuLyoqXG4gKiBDYXN0cyBhIG1lbWJlciBiYXNlZCBvbiB0aGlzIGFycmF5cyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHZhbHVlIHRoZSBjYXN0ZWQgdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLl9jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIG93bmVyID0gdGhpcy5fb3duZXI7XG4gIHZhciBwb3B1bGF0ZWQgPSBmYWxzZTtcblxuICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgLy8gaWYgYSBwb3B1bGF0ZWQgYXJyYXksIHdlIG11c3QgY2FzdCB0byB0aGUgc2FtZSBtb2RlbFxuICAgIC8vIGluc3RhbmNlIGFzIHNwZWNpZmllZCBpbiB0aGUgb3JpZ2luYWwgcXVlcnkuXG4gICAgaWYgKCFvd25lcikge1xuICAgICAgb3duZXIgPSB0aGlzLl9vd25lciA9IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50XG4gICAgICAgID8gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnQoKVxuICAgICAgICA6IHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICBwb3B1bGF0ZWQgPSBvd25lci5wb3B1bGF0ZWQodGhpcy5fcGF0aCwgdHJ1ZSk7XG4gIH1cblxuICBpZiAocG9wdWxhdGVkICYmIG51bGwgIT0gdmFsdWUpIHtcbiAgICAvLyBjYXN0IHRvIHRoZSBwb3B1bGF0ZWQgTW9kZWxzIHNjaGVtYVxuICAgIHZhciBNb2RlbCA9IHBvcHVsYXRlZC5vcHRpb25zLm1vZGVsO1xuXG4gICAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAgIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgICB9XG5cbiAgICB2YWx1ZSA9IG5ldyBNb2RlbCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKVxuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCBmYWxzZSlcbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cbiAqXG4gKiBJZiBpdCBidWJibGVzIHVwIGZyb20gYW4gZW1iZWRkZWQgZG9jdW1lbnQgY2hhbmdlLCB0aGVuIGl0IHRha2VzIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzIChvdGhlcndpc2UsIHRha2VzIDAgYXJndW1lbnRzKVxuICpcbiAqIEBwYXJhbSB7RW1iZWRkZWREb2N1bWVudH0gZW1iZWRkZWREb2MgdGhlIGVtYmVkZGVkIGRvYyB0aGF0IGludm9rZWQgdGhpcyBtZXRob2Qgb24gdGhlIEFycmF5XG4gKiBAcGFyYW0ge1N0cmluZ30gZW1iZWRkZWRQYXRoIHRoZSBwYXRoIHdoaWNoIGNoYW5nZWQgaW4gdGhlIGVtYmVkZGVkRG9jXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5fbWFya01vZGlmaWVkID0gZnVuY3Rpb24gKGVsZW0sIGVtYmVkZGVkUGF0aCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XG4gICAgLCBkaXJ0eVBhdGg7XG5cbiAgaWYgKHBhcmVudCkge1xuICAgIGRpcnR5UGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgaWYgKG51bGwgIT0gZW1iZWRkZWRQYXRoKSB7XG4gICAgICAgIC8vIGFuIGVtYmVkZGVkIGRvYyBidWJibGVkIHVwIHRoZSBjaGFuZ2VcbiAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgdGhpcy5pbmRleE9mKGVsZW0pICsgJy4nICsgZW1iZWRkZWRQYXRoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZGlyZWN0bHkgc2V0IGFuIGluZGV4XG4gICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIGVsZW07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFyZW50Lm1hcmtNb2RpZmllZChkaXJ0eVBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjcHVzaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3B1c2gpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2FyZ3MuLi5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgLCByZXQgPSBbXS5wdXNoLmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjcG9wYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcG9wKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gKlxuICogQHNlZSBTdG9yYWdlQXJyYXkjJHBvcCAjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS0lMjRwb3BcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmV0ID0gW10ucG9wLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5hcnJheSA9IFsyLDNdO1xuICogICAgIHZhciByZXMgPSBkb2MuYXJyYXkuc2hpZnQoKTtcbiAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFszXVxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmV0ID0gW10uc2hpZnQuY2FsbCh0aGlzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAqXG4gKiAjIyMjRXhhbXBsZXM6XG4gKlxuICogICAgIGRvYy5hcnJheS5wdWxsKE9iamVjdElkKVxuICogICAgIGRvYy5hcnJheS5wdWxsKHsgX2lkOiAnc29tZUlkJyB9KVxuICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICogICAgIGRvYy5hcnJheS5wdWxsKCd0YWcgMScsICd0YWcgMicpXG4gKlxuICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gKlxuICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAqXG4gKiBPciB3ZSBtYXkgcGFzc2luZyB0aGUgX2lkIGRpcmVjdGx5IGFuZCBsZXQgbW9uZ29vc2UgdGFrZSBjYXJlIG9mIGl0LlxuICpcbiAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gKiAgICAgZG9jLnN1YmRvY3MucHVsbCg0ODE1MTYyMzQyKTsgLy8gd29ya3NcbiAqXG4gKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUucHVsbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAsIGN1ciA9IHRoaXMuX3BhcmVudC5nZXQodGhpcy5fcGF0aClcbiAgICAsIGkgPSBjdXIubGVuZ3RoXG4gICAgLCBtZW07XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIG1lbSA9IGN1cltpXTtcbiAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xuICAgICAgaWYgKHZhbHVlcy5zb21lKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2LmVxdWFscyhtZW0pOyB9ICkpIHtcbiAgICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKH5jdXIuaW5kZXhPZi5jYWxsKHZhbHVlcywgbWVtKSkge1xuICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIG9mIFtwdWxsXSgjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS1wdWxsKVxuICpcbiAqIEBzZWUgU3RvcmFnZUFycmF5I3B1bGwgI3R5cGVzX2FycmF5X01vbmdvb3NlQXJyYXktcHVsbFxuICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gKiBAYXBpIHB1YmxpY1xuICogQG1lbWJlck9mIFN0b3JhZ2VBcnJheVxuICogQG1ldGhvZCByZW1vdmVcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5yZW1vdmUgPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlLnB1bGw7XG5cbi8qKlxuICogV3JhcHMgW2BBcnJheSNzcGxpY2VgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zcGxpY2UpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZyBhbmQgY2FzdGluZy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5zcGxpY2UgPSBmdW5jdGlvbiBzcGxpY2UgKCkge1xuICB2YXIgcmV0LCB2YWxzLCBpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdmFscyA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhbHNbaV0gPSBpIDwgMlxuICAgICAgICA/IGFyZ3VtZW50c1tpXVxuICAgICAgICA6IHRoaXMuX2Nhc3QoYXJndW1lbnRzW2ldKTtcbiAgICB9XG4gICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XG4gIFtdLnVuc2hpZnQuYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHRoaXMubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBXcmFwcyBbYEFycmF5I3NvcnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zb3J0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJldCA9IFtdLnNvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogQWRkcyB2YWx1ZXMgdG8gdGhlIGFycmF5IGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICogICAgIHZhciBhZGRlZCA9IGRvYy5hcnJheS5hZGRUb1NldCg0LDUpO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0LDVdXG4gKiAgICAgY29uc29sZS5sb2coYWRkZWQpICAgICAvLyBbNV1cbiAqXG4gKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhlIHZhbHVlcyB0aGF0IHdlcmUgYWRkZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuYWRkVG9TZXQgPSBmdW5jdGlvbiBhZGRUb1NldCAoKSB7XG4gIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgLCBhZGRlZCA9IFtdXG4gICAgLCB0eXBlID0gdmFsdWVzWzBdIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCA/ICdkb2MnIDpcbiAgICAgICAgICAgICB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBEYXRlID8gJ2RhdGUnIDpcbiAgICAgICAgICAgICAnJztcblxuICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgIHZhciBmb3VuZDtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2RvYyc6XG4gICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGRvYyl7IHJldHVybiBkb2MuZXF1YWxzKHYpIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICB2YXIgdmFsID0gK3Y7XG4gICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGQpeyByZXR1cm4gK2QgPT09IHZhbCB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBmb3VuZCA9IH50aGlzLmluZGV4T2Yodik7XG4gICAgfVxuXG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgW10ucHVzaC5jYWxsKHRoaXMsIHYpO1xuXG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICAgIFtdLnB1c2guY2FsbChhZGRlZCwgdik7XG4gICAgfVxuICB9LCB0aGlzKTtcblxuICByZXR1cm4gYWRkZWQ7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGNhc3RlZCBgdmFsYCBhdCBpbmRleCBgaWAgYW5kIG1hcmtzIHRoZSBhcnJheSBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gZ2l2ZW4gZG9jdW1lbnRzIGJhc2VkIG9uIHRoZSBmb2xsb3dpbmdcbiAqICAgICB2YXIgRG9jID0gbW9uZ29vc2UubW9kZWwoJ0RvYycsIG5ldyBTY2hlbWEoeyBhcnJheTogW051bWJlcl0gfSkpO1xuICpcbiAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IGFycmF5OiBbMiwzLDRdIH0pXG4gKlxuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICpcbiAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLDUsNF0gLy8gcHJvcGVybHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2F2ZSgpIC8vIHRoZSBjaGFuZ2UgaXMgc2F2ZWRcbiAqXG4gKiAgICAgLy8gVlMgbm90IHVzaW5nIGFycmF5I3NldFxuICogICAgIGRvYy5hcnJheVsxXSA9IFwiNVwiO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZSBpcyBub3Qgc2F2ZWRcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoaSwgdmFsKSB7XG4gIHRoaXNbaV0gPSB0aGlzLl9jYXN0KHZhbCk7XG4gIHRoaXMuX21hcmtNb2RpZmllZChpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICByZXR1cm4gZG9jIGluc3RhbmNlb2YgRG9jdW1lbnRcbiAgICAgICAgPyBkb2MudG9PYmplY3Qob3B0aW9ucylcbiAgICAgICAgOiBkb2NcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnNsaWNlKCk7XG59O1xuXG5cbi8qKlxuICogUmV0dXJuIHRoZSBpbmRleCBvZiBgb2JqYCBvciBgLTFgIGlmIG5vdCBmb3VuZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBpdGVtIHRvIGxvb2sgZm9yXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mIChvYmopIHtcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIE9iamVjdElkKSBvYmogPSBvYmoudG9TdHJpbmcoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAob2JqID09IHRoaXNbaV0pXG4gICAgICByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUFycmF5O1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKVxuICAsIE9iamVjdElkU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogRG9jdW1lbnRBcnJheSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gdGhpcyBhcnJheVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtTdG9yYWdlRG9jdW1lbnRBcnJheX1cbiAqIEBpbmhlcml0cyBTdG9yYWdlQXJyYXlcbiAqIEBzZWUgaHR0cDovL2JpdC5seS9mNkNuWlVcbiAqIFRPRE86INC/0L7QtNGH0LjRgdGC0LjRgtGMINC60L7QtFxuICpcbiAqINCS0LXRgdGMINC90YPQttC90YvQuSDQutC+0LQg0YHQutC+0L/QuNGA0L7QstCw0L1cbiAqL1xuZnVuY3Rpb24gU3RvcmFnZURvY3VtZW50QXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcblxuICAvLyBWYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBzaW5jZVxuICAvLyBvdGhlcndpc2UgU3RvcmFnZUFycmF5I3B1c2ggd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZCB0byB0aGUgcGFyZW50LlxuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIGFyci5fX3Byb3RvX18gPSBTdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGU7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgLy8g0J/RgNC+0LHRgNC+0YEg0LjQt9C80LXQvdC10L3QuNGPINGB0L7RgdGC0L7Rj9C90LjRjyDQsiDQv9C+0LTQtNC+0LrRg9C80LXQvdGCXG4gICAgZG9jLm9uKCdzYXZlJywgYXJyLm5vdGlmeSgnc2F2ZScpKTtcbiAgICBkb2Mub24oJ2lzTmV3JywgYXJyLm5vdGlmeSgnaXNOZXcnKSk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUFycmF5XG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuX2Nhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKSB7XG4gICAgaWYgKCEodmFsdWUuX19wYXJlbnQgJiYgdmFsdWUuX19wYXJlbnRBcnJheSkpIHtcbiAgICAgIC8vIHZhbHVlIG1heSBoYXZlIGJlZW4gY3JlYXRlZCB1c2luZyBhcnJheS5jcmVhdGUoKVxuICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICB2YWx1ZS5fX3BhcmVudEFycmF5ID0gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy8gaGFuZGxlIGNhc3QoJ3N0cmluZycpIG9yIGNhc3QoT2JqZWN0SWQpIGV0Yy5cbiAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gIGlmICggdmFsdWUgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCAhXy5pc09iamVjdCh2YWx1ZSkgKSB7XG4gICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgfVxuXG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKHZhbHVlLCB0aGlzKTtcbn07XG5cbi8qKlxuICogU2VhcmNoZXMgYXJyYXkgaXRlbXMgZm9yIHRoZSBmaXJzdCBkb2N1bWVudCB3aXRoIGEgbWF0Y2hpbmcgX2lkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZW1iZWRkZWREb2MgPSBtLmFycmF5LmlkKHNvbWVfaWQpO1xuICpcbiAqIEByZXR1cm4ge0VtYmVkZGVkRG9jdW1lbnR8bnVsbH0gdGhlIHN1YmRvY3VtZW50IG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICogQHBhcmFtIHtPYmplY3RJZHxTdHJpbmd8TnVtYmVyfSBpZFxuICogQFRPRE8gY2FzdCB0byB0aGUgX2lkIGJhc2VkIG9uIHNjaGVtYSBmb3IgcHJvcGVyIGNvbXBhcmlzb25cbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5pZCA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgY2FzdGVkXG4gICAgLCBzaWRcbiAgICAsIF9pZDtcblxuICB0cnkge1xuICAgIHZhciBjYXN0ZWRfID0gT2JqZWN0SWRTY2hlbWEucHJvdG90eXBlLmNhc3QuY2FsbCh7fSwgaWQpO1xuICAgIGlmIChjYXN0ZWRfKSBjYXN0ZWQgPSBTdHJpbmcoY2FzdGVkXyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYXN0ZWQgPSBudWxsO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIF9pZCA9IHRoaXNbaV0uZ2V0KCdfaWQnKTtcblxuICAgIGlmIChfaWQgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkLl9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmICghKF9pZCBpbnN0YW5jZW9mIE9iamVjdElEKSkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkKSByZXR1cm4gdGhpc1tpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3RlZCA9PSBfaWQpIHtcbiAgICAgIHJldHVybiB0aGlzW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5IG9mIHBsYWluIGpzIG9iamVjdHNcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfRWFjaCBzdWItZG9jdW1lbnQgaXMgY29udmVydGVkIHRvIGEgcGxhaW4gb2JqZWN0IGJ5IGNhbGxpbmcgaXRzIGAjdG9PYmplY3RgIG1ldGhvZC5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbCBvcHRpb25zIHRvIHBhc3MgdG8gZWFjaCBkb2N1bWVudHMgYHRvT2JqZWN0YCBtZXRob2QgY2FsbCBkdXJpbmcgY29udmVyc2lvblxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKG9iaik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmbiB0aGF0IG5vdGlmaWVzIGFsbCBjaGlsZCBkb2NzIG9mIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24gbm90aWZ5IChldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiBub3RpZnkgKHZhbCkge1xuICAgIHZhciBpID0gc2VsZi5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKCFzZWxmW2ldKSBjb250aW51ZTtcbiAgICAgIHNlbGZbaV0udHJpZ2dlcihldmVudCwgdmFsKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRG9jdW1lbnRBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xuXG4vKipcbiAqIEVtYmVkZGVkRG9jdW1lbnQgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEganMgb2JqZWN0IHJldHVybmVkIGZyb20gdGhlIGRiXG4gKiBAcGFyYW0ge01vbmdvb3NlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLl9fcHJvdG9fXyA9IERvY3VtZW50LnByb3RvdHlwZTtcblxuLyoqXG4gKiBNYXJrcyB0aGUgZW1iZWRkZWQgZG9jIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZG9jID0gYmxvZ3Bvc3QuY29tbWVudHMuaWQoaGV4c3RyaW5nKTtcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybjtcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHtcbiAgICAvLyBNYXJrIHRoZSBXSE9MRSBwYXJlbnQgYXJyYXkgYXMgbW9kaWZpZWRcbiAgICAvLyBpZiB0aGlzIGlzIGEgbmV3IGRvY3VtZW50IChpLmUuLCB3ZSBhcmUgaW5pdGlhbGl6aW5nXG4gICAgLy8gYSBkb2N1bWVudCksXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQoKTtcbiAgfSBlbHNlXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQodGhpcywgcGF0aCk7XG59O1xuXG4vKipcbiAqIFVzZWQgYXMgYSBzdHViIGZvciBbaG9va3MuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzMpXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1RoaXMgaXMgYSBuby1vcC4gRG9lcyBub3QgYWN0dWFsbHkgc2F2ZSB0aGUgZG9jIHRvIHRoZSBkYi5fXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZWQgUHJvbWlzZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgcHJvbWlzZSA9ICQuRGVmZXJyZWQoKS5kb25lKGZuKTtcbiAgcHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHN1YmRvY3VtZW50IGZyb20gaXRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBfaWQ7XG4gIGlmICghdGhpcy53aWxsUmVtb3ZlKSB7XG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcbiAgICBpZiAoIV9pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3IgeW91ciBvd24gZ29vZCwgTW9uZ29vc2UgZG9lcyBub3Qga25vdyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnaG93IHRvIHJlbW92ZSBhbiBFbWJlZGRlZERvY3VtZW50IHRoYXQgaGFzIG5vIF9pZCcpO1xuICAgIH1cbiAgICB0aGlzLl9fcGFyZW50QXJyYXkucHVsbCh7IF9pZDogX2lkIH0pO1xuICAgIHRoaXMud2lsbFJlbW92ZSA9IHRydWU7XG4gIH1cblxuICBpZiAoZm4pXG4gICAgZm4obnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlICN1cGRhdGUgbWV0aG9kIG9mIHBhcmVudCBkb2N1bWVudHMuXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSAjdXBkYXRlIG1ldGhvZCBpcyBub3QgYXZhaWxhYmxlIG9uIEVtYmVkZGVkRG9jdW1lbnRzJyk7XG59O1xuXG4vKipcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVyciBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVyciwgdmFsLCBmaXJzdCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnQpIHtcbiAgICB2YXIgbXNnID0gJ1VuYWJsZSB0byBpbnZhbGlkYXRlIGEgc3ViZG9jdW1lbnQgdGhhdCBoYXMgbm90IGJlZW4gYWRkZWQgdG8gYW4gYXJyYXkuJ1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fX3BhcmVudEFycmF5LmluZGV4T2YodGhpcyk7XG4gIHZhciBwYXJlbnRQYXRoID0gdGhpcy5fX3BhcmVudEFycmF5Ll9wYXRoO1xuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcblxuICAvLyBzbmlmZmluZyBhcmd1bWVudHM6XG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXG4gIC8vIG91ciBlcnJvciBtZXNzYWdlIGNsZWFuLlxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVycik7XG4gIH1cblxuICBpZiAoZmlyc3QpXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvcCBsZXZlbCBkb2N1bWVudCBvZiB0aGlzIHN1Yi1kb2N1bWVudC5cbiAqXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSB0aGlzLl9fcGFyZW50O1xuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XG5cbiAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdGhpcyBkb2N1bWVudC4gSWYgb3B0aW9uYWwgYHBhdGhgIGlzIHBhc3NlZCwgaXQgaXMgYXBwZW5kZWQgdG8gdGhlIGZ1bGwgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcbiAqIEBtZW1iZXJPZiBFbWJlZGRlZERvY3VtZW50XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLiRfXy5mdWxsUGF0aCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIGlmICghcGFyZW50Ll9fcGFyZW50KSByZXR1cm4gcGF0aDtcblxuICAgIHZhciBwYXRocyA9IFtdO1xuICAgIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcbiAgICAgIHBhdGhzLnVuc2hpZnQocGFyZW50Ll9fcGFyZW50QXJyYXkuX3BhdGgpO1xuICAgICAgcGFyZW50ID0gcGFyZW50Ll9fcGFyZW50O1xuICAgIH1cblxuICAgIHRoaXMuJF9fLmZ1bGxQYXRoID0gcGF0aHMuam9pbignLicpO1xuXG4gICAgaWYgKCF0aGlzLiRfXy5vd25lckRvY3VtZW50KSB7XG4gICAgICAvLyBvcHRpbWl6YXRpb25cbiAgICAgIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGhcbiAgICA/IHRoaXMuJF9fLmZ1bGxQYXRoICsgJy4nICsgcGF0aFxuICAgIDogdGhpcy4kX18uZnVsbFBhdGg7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgYXJyYXkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50QXJyYXk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1iZWRkZWREb2N1bWVudDtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkVtYmVkZGVkID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG4iLCIvLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxudmFyIHJjaGVja0ZvckhleCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcblxuLyoqXG4qIENyZWF0ZSBhIG5ldyBPYmplY3RJZCBpbnN0YW5jZVxuKlxuKiBAcGFyYW0ge1N0cmluZ30gW2lkXSBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcuXG4qIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SWQuXG4qL1xuZnVuY3Rpb24gT2JqZWN0SWQoIGlkICkge1xuICAvLyDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC80L7QttC90L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINCx0LXQtyBuZXdcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZCggaWQgKTtcbiAgLy9pZiAoIGlkIGluc3RhbmNlb2YgT2JqZWN0SWQgKSByZXR1cm4gaWQ7XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZiAoIGlkICE9IG51bGwgJiYgdHlwZW9mIGlkICE9ICdzdHJpbmcnICYmIGlkLmxlbmd0aCAhPSAyNCApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVycycpO1xuXG4gIC8vIEdlbmVyYXRlIGlkXG4gIGlmICggaWQgPT0gbnVsbCApIHtcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZSgpO1xuXG4gIH0gZWxzZSBpZiggcmNoZWNrRm9ySGV4LnRlc3QoIGlkICkgKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmcnKTtcbiAgfVxufVxuXG4vLyBQcml2YXRlIGFycmF5IG9mIGNoYXJzIHRvIHVzZVxuT2JqZWN0SWQucHJvdG90eXBlLkNIQVJTID0gJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCgnJyk7XG5cbi8vVE9ETzog0LzQvtC20L3QviDQu9C4INC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDQsdC+0LvRjNGI0LjQtSDRgdC40LzQstC+0LvRiyBBLVo/XG4vLyBHZW5lcmF0ZSBhIHJhbmRvbSBPYmplY3RJZC5cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBjaGFycyA9IHRoaXMuQ0hBUlMsIF9pZCA9IG5ldyBBcnJheSggMzYgKSwgcm5kID0gMCwgcjtcbiAgZm9yICggdmFyIGkgPSAwOyBpIDwgMjQ7IGkrKyApIHtcbiAgICBpZiAoIHJuZCA8PSAweDAyIClcbiAgICAgIHJuZCA9IDB4MjAwMDAwMCArIChNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwKSB8IDA7XG5cbiAgICByID0gcm5kICYgMHhmO1xuICAgIHJuZCA9IHJuZCA+PiA0O1xuICAgIF9pZFsgaSBdID0gY2hhcnNbKGkgPT0gMTkpID8gKHIgJiAweDMpIHwgMHg4IDogcl07XG4gIH1cblxuICByZXR1cm4gX2lkLmpvaW4oJycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG4vKipcbiogUmV0dXJuIHRoZSBPYmplY3RJZCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuKlxuKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuKiBAYXBpIHB1YmxpY1xuKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0hleFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5pZDtcbn07XG5cbi8qKlxuKiBDb252ZXJ0cyB0aGUgaWQgaW50byBhIDI0IGJ5dGUgaGV4IHN0cmluZyBmb3IgcHJpbnRpbmdcbipcbiogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiogQGFwaSBwcml2YXRlXG4qL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiogQ29udmVydHMgdG8gaXRzIEpTT04gcmVwcmVzZW50YXRpb24uXG4qXG4qIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4qIEBhcGkgcHJpdmF0ZVxuKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cbipcbiogQHBhcmFtIHtPYmplY3R9IG90aGVySUQgT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuKiBAcmV0dXJuIHtCb29sfSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuKiBAYXBpIHB1YmxpY1xuKi9cbk9iamVjdElkLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMoIG90aGVySUQgKXtcbiAgdmFyIGlkID0gKCBvdGhlcklEIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgb3RoZXJJRC50b0hleFN0cmluZyApXG4gICAgPyBvdGhlcklELmlkXG4gICAgOiBuZXcgT2JqZWN0SWQoIG90aGVySUQgKS5pZDtcblxuICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgbXBhdGggPSByZXF1aXJlKCcuL21wYXRoJylcbiAgLCBTdG9yYWdlQXJyYXlcbiAgLCBEb2N1bWVudFxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gcnVsZXMuXG4gKlxuICogVGhlc2UgcnVsZXMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKlxuICovXG5leHBvcnRzLnBsdXJhbGl6YXRpb24gPSBbXG4gIFsvKG0pYW4kL2dpLCAnJDFlbiddLFxuICBbLyhwZSlyc29uJC9naSwgJyQxb3BsZSddLFxuICBbLyhjaGlsZCkkL2dpLCAnJDFyZW4nXSxcbiAgWy9eKG94KSQvZ2ksICckMWVuJ10sXG4gIFsvKGF4fHRlc3QpaXMkL2dpLCAnJDFlcyddLFxuICBbLyhvY3RvcHx2aXIpdXMkL2dpLCAnJDFpJ10sXG4gIFsvKGFsaWFzfHN0YXR1cykkL2dpLCAnJDFlcyddLFxuICBbLyhidSlzJC9naSwgJyQxc2VzJ10sXG4gIFsvKGJ1ZmZhbHx0b21hdHxwb3RhdClvJC9naSwgJyQxb2VzJ10sXG4gIFsvKFt0aV0pdW0kL2dpLCAnJDFhJ10sXG4gIFsvc2lzJC9naSwgJ3NlcyddLFxuICBbLyg/OihbXmZdKWZlfChbbHJdKWYpJC9naSwgJyQxJDJ2ZXMnXSxcbiAgWy8oaGl2ZSkkL2dpLCAnJDFzJ10sXG4gIFsvKFteYWVpb3V5XXxxdSl5JC9naSwgJyQxaWVzJ10sXG4gIFsvKHh8Y2h8c3N8c2gpJC9naSwgJyQxZXMnXSxcbiAgWy8obWF0cnx2ZXJ0fGluZClpeHxleCQvZ2ksICckMWljZXMnXSxcbiAgWy8oW218bF0pb3VzZSQvZ2ksICckMWljZSddLFxuICBbLyhrbnx3fGwpaWZlJC9naSwgJyQxaXZlcyddLFxuICBbLyhxdWl6KSQvZ2ksICckMXplcyddLFxuICBbL3MkL2dpLCAncyddLFxuICBbLyhbXmEtel0pJC8sICckMSddLFxuICBbLyQvZ2ksICdzJ11cbl07XG52YXIgcnVsZXMgPSBleHBvcnRzLnBsdXJhbGl6YXRpb247XG5cbi8qKlxuICogVW5jb3VudGFibGUgd29yZHMuXG4gKlxuICogVGhlc2Ugd29yZHMgYXJlIGFwcGxpZWQgd2hpbGUgcHJvY2Vzc2luZyB0aGUgYXJndW1lbnQgdG8gYHBsdXJhbGl6ZWAuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnRzLnVuY291bnRhYmxlcyA9IFtcbiAgJ2FkdmljZScsXG4gICdlbmVyZ3knLFxuICAnZXhjcmV0aW9uJyxcbiAgJ2RpZ2VzdGlvbicsXG4gICdjb29wZXJhdGlvbicsXG4gICdoZWFsdGgnLFxuICAnanVzdGljZScsXG4gICdsYWJvdXInLFxuICAnbWFjaGluZXJ5JyxcbiAgJ2VxdWlwbWVudCcsXG4gICdpbmZvcm1hdGlvbicsXG4gICdwb2xsdXRpb24nLFxuICAnc2V3YWdlJyxcbiAgJ3BhcGVyJyxcbiAgJ21vbmV5JyxcbiAgJ3NwZWNpZXMnLFxuICAnc2VyaWVzJyxcbiAgJ3JhaW4nLFxuICAncmljZScsXG4gICdmaXNoJyxcbiAgJ3NoZWVwJyxcbiAgJ21vb3NlJyxcbiAgJ2RlZXInLFxuICAnbmV3cycsXG4gICdleHBlcnRpc2UnLFxuICAnc3RhdHVzJyxcbiAgJ21lZGlhJ1xuXTtcbnZhciB1bmNvdW50YWJsZXMgPSBleHBvcnRzLnVuY291bnRhYmxlcztcblxuLyohXG4gKiBQbHVyYWxpemUgZnVuY3Rpb24uXG4gKlxuICogQGF1dGhvciBUSiBIb2xvd2F5Y2h1ayAoZXh0cmFjdGVkIGZyb20gX2V4dC5qc18pXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIHRvIHBsdXJhbGl6ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wbHVyYWxpemUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBmb3VuZDtcbiAgaWYgKCF+dW5jb3VudGFibGVzLmluZGV4T2Yoc3RyLnRvTG93ZXJDYXNlKCkpKXtcbiAgICBmb3VuZCA9IHJ1bGVzLmZpbHRlcihmdW5jdGlvbihydWxlKXtcbiAgICAgIHJldHVybiBzdHIubWF0Y2gocnVsZVswXSk7XG4gICAgfSk7XG4gICAgaWYgKGZvdW5kWzBdKSByZXR1cm4gc3RyLnJlcGxhY2UoZm91bmRbMF1bMF0sIGZvdW5kWzBdWzFdKTtcbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG4vKiFcbiAqIERldGVybWluZXMgaWYgYGFgIGFuZCBgYmAgYXJlIGRlZXAgZXF1YWwuXG4gKlxuICogTW9kaWZpZWQgZnJvbSBub2RlL2xpYi9hc3NlcnQuanNcbiAqIE1vZGlmaWVkIGZyb20gbW9uZ29vc2UvdXRpbHMuanNcbiAqXG4gKiBAcGFyYW0ge2FueX0gYSBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGJgXG4gKiBAcGFyYW0ge2FueX0gYiBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGFgXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsIChhLCBiKSB7XG4gIGlmICh1dGlscy5pc1N0b3JhZ2VPYmplY3QoYSkpIGEgPSBhLnRvT2JqZWN0KCk7XG4gIGlmICh1dGlscy5pc1N0b3JhZ2VPYmplY3QoYikpIGIgPSBiLnRvT2JqZWN0KCk7XG5cbiAgcmV0dXJuIF8uaXNFcXVhbChhLCBiKTtcbn07XG5cblxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cCAobykge1xuICByZXR1cm4gJ29iamVjdCcgPT0gdHlwZW9mIG9cbiAgICAgICYmICdbb2JqZWN0IFJlZ0V4cF0nID09IHRvU3RyaW5nLmNhbGwobyk7XG59XG5cbmZ1bmN0aW9uIGNsb25lUmVnRXhwIChyZWdleHApIHtcbiAgaWYgKCFpc1JlZ0V4cChyZWdleHApKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGEgUmVnRXhwJyk7XG4gIH1cblxuICB2YXIgZmxhZ3MgPSBbXTtcbiAgaWYgKHJlZ2V4cC5nbG9iYWwpIGZsYWdzLnB1c2goJ2cnKTtcbiAgaWYgKHJlZ2V4cC5tdWx0aWxpbmUpIGZsYWdzLnB1c2goJ20nKTtcbiAgaWYgKHJlZ2V4cC5pZ25vcmVDYXNlKSBmbGFncy5wdXNoKCdpJyk7XG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIGZsYWdzLmpvaW4oJycpKTtcbn1cblxuLyohXG4gKiBPYmplY3QgY2xvbmUgd2l0aCBTdG9yYWdlIG5hdGl2ZXMgc3VwcG9ydC5cbiAqXG4gKiBJZiBvcHRpb25zLm1pbmltaXplIGlzIHRydWUsIGNyZWF0ZXMgYSBtaW5pbWFsIGRhdGEgb2JqZWN0LiBFbXB0eSBvYmplY3RzIGFuZCB1bmRlZmluZWQgdmFsdWVzIHdpbGwgbm90IGJlIGNsb25lZC4gVGhpcyBtYWtlcyB0aGUgZGF0YSBwYXlsb2FkIHNlbnQgdG8gTW9uZ29EQiBhcyBzbWFsbCBhcyBwb3NzaWJsZS5cbiAqXG4gKiBGdW5jdGlvbnMgYXJlIG5ldmVyIGNsb25lZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gY2xvbmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBjbG9uZWQgb2JqZWN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lIChvYmosIG9wdGlvbnMpIHtcbiAgaWYgKG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbClcbiAgICByZXR1cm4gb2JqO1xuXG4gIGlmICggXy5pc0FycmF5KCBvYmogKSApIHtcbiAgICByZXR1cm4gY2xvbmVBcnJheSggb2JqLCBvcHRpb25zICk7XG4gIH1cblxuICBpZiAoIGlzU3RvcmFnZU9iamVjdCggb2JqICkgKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5qc29uICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiBvYmoudG9KU09OKSB7XG4gICAgICByZXR1cm4gb2JqLnRvSlNPTiggb3B0aW9ucyApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2JqLnRvT2JqZWN0KCBvcHRpb25zICk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmouY29uc3RydWN0b3IgKSB7XG4gICAgc3dpdGNoIChvYmouY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgY2FzZSAnT2JqZWN0JzpcbiAgICAgICAgcmV0dXJuIGNsb25lT2JqZWN0KG9iaiwgb3B0aW9ucyk7XG4gICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgcmV0dXJuIG5ldyBvYmouY29uc3RydWN0b3IoICtvYmogKTtcbiAgICAgIGNhc2UgJ1JlZ0V4cCc6XG4gICAgICAgIHJldHVybiBjbG9uZVJlZ0V4cCggb2JqICk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBpZ25vcmVcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCBvYmogaW5zdGFuY2VvZiBPYmplY3RJZCApIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdElkKCBvYmouaWQgKTtcbiAgfVxuXG4gIGlmICggIW9iai5jb25zdHJ1Y3RvciAmJiBfLmlzT2JqZWN0KCBvYmogKSApIHtcbiAgICAvLyBvYmplY3QgY3JlYXRlZCB3aXRoIE9iamVjdC5jcmVhdGUobnVsbClcbiAgICByZXR1cm4gY2xvbmVPYmplY3QoIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgaWYgKCBvYmoudmFsdWVPZiApe1xuICAgIHJldHVybiBvYmoudmFsdWVPZigpO1xuICB9XG59O1xudmFyIGNsb25lID0gZXhwb3J0cy5jbG9uZTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuZnVuY3Rpb24gY2xvbmVPYmplY3QgKG9iaiwgb3B0aW9ucykge1xuICB2YXIgcmV0YWluS2V5T3JkZXIgPSBvcHRpb25zICYmIG9wdGlvbnMucmV0YWluS2V5T3JkZXJcbiAgICAsIG1pbmltaXplID0gb3B0aW9ucyAmJiBvcHRpb25zLm1pbmltaXplXG4gICAgLCByZXQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5c1xuICAgICwgdmFsXG4gICAgLCBrXG4gICAgLCBpO1xuXG4gIGlmICggcmV0YWluS2V5T3JkZXIgKSB7XG4gICAgZm9yIChrIGluIG9iaikge1xuICAgICAgdmFsID0gY2xvbmUoIG9ialtrXSwgb3B0aW9ucyApO1xuXG4gICAgICBpZiAoICFtaW5pbWl6ZSB8fCAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWwpICkge1xuICAgICAgICBoYXNLZXlzIHx8IChoYXNLZXlzID0gdHJ1ZSk7XG4gICAgICAgIHJldFtrXSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gZmFzdGVyXG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuICAgIGkgPSBrZXlzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGsgPSBrZXlzW2ldO1xuICAgICAgdmFsID0gY2xvbmUob2JqW2tdLCBvcHRpb25zKTtcblxuICAgICAgaWYgKCFtaW5pbWl6ZSB8fCAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWwpKSB7XG4gICAgICAgIGlmICghaGFzS2V5cykgaGFzS2V5cyA9IHRydWU7XG4gICAgICAgIHJldFtrXSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWluaW1pemVcbiAgICA/IGhhc0tleXMgJiYgcmV0XG4gICAgOiByZXQ7XG59XG5cbmZ1bmN0aW9uIGNsb25lQXJyYXkgKGFyciwgb3B0aW9ucykge1xuICB2YXIgcmV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHJldC5wdXNoKCBjbG9uZSggYXJyW2ldLCBvcHRpb25zICkgKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKiFcbiAqIE1lcmdlcyBgZnJvbWAgaW50byBgdG9gIHdpdGhvdXQgb3ZlcndyaXRpbmcgZXhpc3RpbmcgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZXhwb3J0cy5tZXJnZSA9IGZ1bmN0aW9uIG1lcmdlICh0bywgZnJvbSkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZyb20pXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcbiAgICAsIGtleTtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB0b1trZXldKSB7XG4gICAgICB0b1trZXldID0gZnJvbVtrZXldO1xuICAgIH0gZWxzZSBpZiAoIF8uaXNPYmplY3QoZnJvbVtrZXldKSApIHtcbiAgICAgIG1lcmdlKHRvW2tleV0sIGZyb21ba2V5XSk7XG4gICAgfVxuICB9XG59O1xuXG4vKiFcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBzdHJpbmdcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnJhbmRvbSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoKS5zdWJzdHIoMyk7XG59O1xuXG5cbi8qIVxuICogUmV0dXJucyBpZiBgdmAgaXMgYSBzdG9yYWdlIG9iamVjdCB0aGF0IGhhcyBhIGB0b09iamVjdCgpYCBtZXRob2Qgd2UgY2FuIHVzZS5cbiAqXG4gKiBUaGlzIGlzIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbGlicyBsaWtlIERhdGUuanMgd2hpY2ggZG8gZm9vbGlzaCB0aGluZ3MgdG8gTmF0aXZlcy5cbiAqXG4gKiBAcGFyYW0ge2FueX0gdlxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0ID0gZnVuY3Rpb24gKCB2ICkge1xuICBEb2N1bWVudCB8fCAoRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JykpO1xuICBTdG9yYWdlQXJyYXkgfHwgKFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvYXJyYXknKSk7XG5cbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBEb2N1bWVudCB8fFxuICAgICAgICAgdiBpbnN0YW5jZW9mIFN0b3JhZ2VBcnJheTtcbn07XG52YXIgaXNTdG9yYWdlT2JqZWN0ID0gZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3Q7XG5cbi8qIVxuICogUmV0dXJuIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmosIG1hcCkge1xuICByZXR1cm4gbXBhdGguZ2V0KHBhdGgsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxuLyohXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb2JqLCBtYXApIHtcbiAgbXBhdGguc2V0KHBhdGgsIHZhbCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgLy8g0JTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDRgtC10YHRgtC+0LIgKNC+0LrRgNGD0LbQtdC90LjQtSBub2RlLmpzKVxuICBpZiAoIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgKSByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgLy8g0JXRgdC70Lgg0LIg0LHRgNCw0YPQt9C10YDQtSDRg9C20LUg0YDQtdCw0LvQuNC30L7QstCw0L0g0Y3RgtC+0YIg0LzQtdGC0L7QtFxuICBpZiAoIHdpbmRvdy5zZXRJbW1lZGlhdGUgKSByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZTtcblxuICB2YXIgaGVhZCA9IHsgfSwgdGFpbCA9IGhlYWQ7IC8vINC+0YfQtdGA0LXQtNGMINCy0YvQt9C+0LLQvtCyLCAxLdGB0LLRj9C30L3Ri9C5INGB0L/QuNGB0L7QulxuXG4gIHZhciBJRCA9IE1hdGgucmFuZG9tKCk7IC8vINGD0L3QuNC60LDQu9GM0L3Ri9C5INC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAXG5cbiAgZnVuY3Rpb24gb25tZXNzYWdlKGUpIHtcbiAgICBpZihlLmRhdGEgIT0gSUQpIHJldHVybjsgLy8g0L3QtSDQvdCw0YjQtSDRgdC+0L7QsdGJ0LXQvdC40LVcbiAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIHZhciBmdW5jID0gaGVhZC5mdW5jO1xuICAgIGRlbGV0ZSBoZWFkLmZ1bmM7XG4gICAgZnVuYygpO1xuICB9XG5cbiAgaWYod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHsgLy8gSUU5Kywg0LTRgNGD0LPQuNC1INCx0YDQsNGD0LfQtdGA0YtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9ubWVzc2FnZSwgZmFsc2UpO1xuICB9IGVsc2UgeyAvLyBJRThcbiAgICB3aW5kb3cuYXR0YWNoRXZlbnQoICdvbm1lc3NhZ2UnLCBvbm1lc3NhZ2UgKTtcbiAgfVxuXG4gIHJldHVybiB3aW5kb3cucG9zdE1lc3NhZ2UgPyBmdW5jdGlvbihmdW5jKSB7XG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHsgZnVuYzogZnVuYyB9O1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShJRCwgXCIqXCIpO1xuICB9IDpcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XG4gICAgc2V0VGltZW91dChmdW5jLCAwKTtcbiAgfTtcbn0oKSk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlxyXG4vKipcclxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcclxuICpcclxuICogVGhpcyBpcyB3aGF0IG1vbmdvb3NlIHVzZXMgdG8gZGVmaW5lIHZpcnR1YWwgYXR0cmlidXRlcyB2aWEgYFNjaGVtYS5wcm90b3R5cGUudmlydHVhbGAuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XHJcbiAqICAgICBmdWxsbmFtZSBpbnN0YW5jZW9mIG1vbmdvb3NlLlZpcnR1YWxUeXBlIC8vIHRydWVcclxuICpcclxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBWaXJ0dWFsVHlwZSAob3B0aW9ucywgbmFtZSkge1xyXG4gIHRoaXMucGF0aCA9IG5hbWU7XHJcbiAgdGhpcy5nZXR0ZXJzID0gW107XHJcbiAgdGhpcy5zZXR0ZXJzID0gW107XHJcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYSBnZXR0ZXIuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHZpcnR1YWwgPSBzY2hlbWEudmlydHVhbCgnZnVsbG5hbWUnKTtcclxuICogICAgIHZpcnR1YWwuZ2V0KGZ1bmN0aW9uICgpIHtcclxuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgc2V0dGVyLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XHJcbiAqICAgICB2aXJ0dWFsLnNldChmdW5jdGlvbiAodikge1xyXG4gKiAgICAgICB2YXIgcGFydHMgPSB2LnNwbGl0KCcgJyk7XHJcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xyXG4gKiAgICAgICB0aGlzLm5hbWUubGFzdCA9IHBhcnRzWzFdO1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIHRoaXMuc2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEByZXR1cm4ge2FueX0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBnZXR0ZXJzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcclxuICB2YXIgdiA9IHZhbHVlO1xyXG4gIGZvciAodmFyIGwgPSB0aGlzLmdldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcclxuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XHJcbiAgfVxyXG4gIHJldHVybiB2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcclxuICogQHJldHVybiB7YW55fSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIHNldHRlcnNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xyXG4gIHZhciB2ID0gdmFsdWU7XHJcbiAgZm9yICh2YXIgbCA9IHRoaXMuc2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xyXG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcclxuICB9XHJcbiAgcmV0dXJuIHY7XHJcbn07XHJcblxyXG4vKiFcclxuICogZXhwb3J0c1xyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XHJcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
(9)
});
