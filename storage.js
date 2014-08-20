!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.storage=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

},{}],2:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var Schema = _dereq_('./schema')
  , Document = _dereq_('./document');

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

},{"./document":3,"./schema":13}],3:[function(_dereq_,module,exports){
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
  this.collection = window.storage[ collectionName ];
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
        (!obj[i].constructor || 'Object' == obj[i].constructor.name)) {
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
  var optionsParameter = options;
  if (!(options && 'Object' == options.constructor.name) ||
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
}

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

},{"./error":4,"./events":9,"./internal":11,"./schema":13,"./schema/mixed":19,"./schematype":23,"./types/documentarray":26,"./types/embedded":27,"./types/objectid":29,"./utils":30}],4:[function(_dereq_,module,exports){
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

},{"./error/cast":5,"./error/messages":6,"./error/validation":7,"./error/validator":8}],5:[function(_dereq_,module,exports){
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

},{"../error.js":4}],6:[function(_dereq_,module,exports){

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


},{}],7:[function(_dereq_,module,exports){

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
ValidationError.prototype = Object.create( StorageError.prototype );
ValidationError.prototype.constructor = ValidationError;

/*!
 * Module exports
 */

module.exports = ValidationError;

},{"../error.js":4}],8:[function(_dereq_,module,exports){
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

},{"../error.js":4}],9:[function(_dereq_,module,exports){
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

},{}],10:[function(_dereq_,module,exports){
/**
 * Хранилище документов по схемам
 * вдохновлён mongoose 3.8.4 (исправлены баги по 3.8.15)
 *
 * Реализации хранилища
 * http://docs.meteor.com/#selectors
 * https://github.com/meteor/meteor/tree/master/packages/minimongo
 *
 * browserify src/ --standalone storage > storage.js -d
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

Storage.prototype.Error = _dereq_('./error');



Storage.prototype.StateMachine = _dereq_('./statemachine');
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

},{"./collection":2,"./document":3,"./error":4,"./schema":13,"./schematype":23,"./statemachine":24,"./types":28,"./utils":30,"./virtualtype":31}],11:[function(_dereq_,module,exports){
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

},{"./statemachine":24}],12:[function(_dereq_,module,exports){
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
},{}],13:[function(_dereq_,module,exports){
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

},{"./events":9,"./schema/index":18,"./utils":30,"./virtualtype":31}],14:[function(_dereq_,module,exports){
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

},{"../schematype":23,"../types/array":25,"../types/embedded":27,"./boolean":15,"./date":16,"./mixed":19,"./number":20,"./objectid":21,"./string":22}],15:[function(_dereq_,module,exports){
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

},{"../schematype":23}],16:[function(_dereq_,module,exports){
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

},{"../schematype":23}],17:[function(_dereq_,module,exports){

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

},{"../document":3,"../schematype":23,"../types/documentarray":26,"../types/embedded":27,"./array":14}],18:[function(_dereq_,module,exports){

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

},{"./array":14,"./boolean":15,"./date":16,"./documentarray":17,"./mixed":19,"./number":20,"./objectid":21,"./string":22}],19:[function(_dereq_,module,exports){
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

},{"../schematype":23}],20:[function(_dereq_,module,exports){
/*!
 * Module requirements.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = _dereq_('../error').messages;

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

},{"../error":4,"../schematype":23}],21:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , oid = _dereq_('../types/objectid')
  , utils = _dereq_('../utils')
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

},{"../schematype":23,"../types/objectid":29,"../utils":30,"./../document":3}],22:[function(_dereq_,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = _dereq_('../schematype')
  , CastError = SchemaType.CastError
  , errorMessages = _dereq_('../error').messages;

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

},{"../error":4,"../schematype":23}],23:[function(_dereq_,module,exports){
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

},{"./error":4}],24:[function(_dereq_,module,exports){
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


},{}],25:[function(_dereq_,module,exports){
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

},{"../document":3,"../utils":30,"./embedded":27,"./objectid":29}],26:[function(_dereq_,module,exports){
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

},{"../document":3,"../schema/objectid":21,"../utils":30,"./array":25,"./objectid":29}],27:[function(_dereq_,module,exports){
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

},{"../document":3}],28:[function(_dereq_,module,exports){

/*!
 * Module exports.
 */

exports.Array = _dereq_('./array');

exports.Embedded = _dereq_('./embedded');

exports.DocumentArray = _dereq_('./documentarray');
exports.ObjectId = _dereq_('./objectid');

},{"./array":25,"./documentarray":26,"./embedded":27,"./objectid":29}],29:[function(_dereq_,module,exports){
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

},{}],30:[function(_dereq_,module,exports){
(function (process,global){
/*!
 * Module dependencies.
 */

var ObjectId = _dereq_('./types/objectid')
  , mpath = _dereq_('./mpath')
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


}).call(this,_dereq_("+NscNm"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"+NscNm":1,"./document":3,"./mpath":12,"./types/objectid":29}],31:[function(_dereq_,module,exports){

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

},{}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImQ6XFxTZXJ2ZXJcXGhvbWVcXEdpdEh1Ylxcc3RvcmFnZVxcbm9kZV9tb2R1bGVzXFxncnVudC1icm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJkOi9TZXJ2ZXIvaG9tZS9HaXRIdWIvc3RvcmFnZS9zcmMvY29sbGVjdGlvbi5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9kb2N1bWVudC5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9lcnJvci5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9lcnJvci9jYXN0LmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL2Vycm9yL21lc3NhZ2VzLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL2Vycm9yL3ZhbGlkYXRpb24uanMiLCJkOi9TZXJ2ZXIvaG9tZS9HaXRIdWIvc3RvcmFnZS9zcmMvZXJyb3IvdmFsaWRhdG9yLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL2V2ZW50cy5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9pbmRleC5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9pbnRlcm5hbC5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9tcGF0aC5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEuanMiLCJkOi9TZXJ2ZXIvaG9tZS9HaXRIdWIvc3RvcmFnZS9zcmMvc2NoZW1hL2FycmF5LmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9ib29sZWFuLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9kYXRlLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9kb2N1bWVudGFycmF5LmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9pbmRleC5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvbWl4ZWQuanMiLCJkOi9TZXJ2ZXIvaG9tZS9HaXRIdWIvc3RvcmFnZS9zcmMvc2NoZW1hL251bWJlci5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvb2JqZWN0aWQuanMiLCJkOi9TZXJ2ZXIvaG9tZS9HaXRIdWIvc3RvcmFnZS9zcmMvc2NoZW1hL3N0cmluZy5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy9zY2hlbWF0eXBlLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3N0YXRlbWFjaGluZS5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy90eXBlcy9hcnJheS5qcyIsImQ6L1NlcnZlci9ob21lL0dpdEh1Yi9zdG9yYWdlL3NyYy90eXBlcy9kb2N1bWVudGFycmF5LmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3R5cGVzL2VtYmVkZGVkLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3R5cGVzL2luZGV4LmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3R5cGVzL29iamVjdGlkLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3V0aWxzLmpzIiwiZDovU2VydmVyL2hvbWUvR2l0SHViL3N0b3JhZ2Uvc3JjL3ZpcnR1YWx0eXBlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxMERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDampCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxyXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50Jyk7XHJcblxyXG4vL1RPRE86INC90LDQv9C40YHQsNGC0Ywg0LzQtdGC0L7QtCAudXBzZXJ0KCBkb2MgKSAtINC+0LHQvdC+0LLQu9C10L3QuNC1INC00L7QutGD0LzQtdC90YLQsCwg0LAg0LXRgdC70Lgg0LXQs9C+INC90LXRgiwg0YLQviDRgdC+0LfQtNCw0L3QuNC1XHJcblxyXG4vL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0LvQvtCz0LjQutGDINGBIGFwaVJlc291cmNlICjRgdC+0YXRgNCw0L3Rj9GC0Ywg0YHRgdGL0LvQutGDINC90LAg0L3QtdCz0L4g0Lgg0LjRgdC/0L7Qu9GM0LfQvtCy0YLRjCDQv9GA0Lgg0LzQtdGC0L7QtNC1IGRvYy5zYXZlKVxyXG4vKipcclxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQutC+0LvQu9C10LrRhtC40LkuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0g0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40LhcclxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINCh0YXQtdC80LAg0LjQu9C4INC+0LHRitC10LrRgiDQvtC/0LjRgdCw0L3QuNGPINGB0YXQtdC80YtcclxuICogQHBhcmFtIHtPYmplY3R9IFthcGldIC0g0YHRgdGL0LvQutCwINC90LAgYXBpINGA0LXRgdGD0YDRgVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIENvbGxlY3Rpb24gKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xyXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L3QsNC30LLQsNC90LjQtSDQv9GA0L7RgdGC0YDQsNC90YHRgtCy0LAg0LjQvNGR0L1cclxuICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gIC8vINCl0YDQsNC90LjQu9C40YnQtSDQtNC70Y8g0LTQvtC60YPQvNC10L3RgtC+0LJcclxuICB0aGlzLmRvY3VtZW50cyA9IHt9O1xyXG5cclxuICBpZiAoIF8uaXNPYmplY3QoIHNjaGVtYSApICYmICEoIHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApICkge1xyXG4gICAgc2NoZW1hID0gbmV3IFNjaGVtYSggc2NoZW1hICk7XHJcbiAgfVxyXG5cclxuICAvLyDQodC+0YXRgNCw0L3QuNC8INGB0YHRi9C70LrRgyDQvdCwIGFwaSDQtNC70Y8g0LzQtdGC0L7QtNCwIC5zYXZlKClcclxuICB0aGlzLmFwaSA9IGFwaTtcclxuXHJcbiAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10LzQsNGPINGB0YXQtdC80LAg0LTQu9GPINC60L7Qu9C70LXQutGG0LjQuFxyXG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xyXG5cclxuICAvLyDQntGC0L7QsdGA0LDQttC10L3QuNC1INC+0LHRitC10LrRgtCwIGRvY3VtZW50cyDQsiDQstC40LTQtSDQvNCw0YHRgdC40LLQsCAo0LTQu9GPINC90L7QutCw0YPRgtCwKVxyXG4gIHRoaXMuYXJyYXkgPSBbXTtcclxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQvtCx0L3QvtCy0LvQtdC90LjRjyDQv9GA0LjQstGP0LfQvtC6INC6INGN0YLQvtC80YMg0YHQstC+0LnRgdGC0LLRgyDQtNC70Y8ga25vY2tvdXRqc1xyXG4gIHdpbmRvdy5rbyAmJiBrby50cmFjayggdGhpcywgWydhcnJheSddICk7XHJcbn1cclxuXHJcbkNvbGxlY3Rpb24ucHJvdG90eXBlID0ge1xyXG4gIC8qKlxyXG4gICAqINCU0L7QsdCw0LLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyLlxyXG4gICAqXHJcbiAgICogQGV4YW1wbGVcclxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uYWRkKHsgdHlwZTogJ2plbGx5IGJlYW4nIH0pO1xyXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5hZGQoW3sgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHsgdHlwZTogJ3NuaWNrZXJzJyB9XSk7XHJcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xyXG4gICAqXHJcbiAgICogQHBhcmFtIHtvYmplY3R8QXJyYXkuPG9iamVjdD59IFtkb2NdIC0g0JTQvtC60YPQvNC10L3RglxyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXHJcbiAgICogQHBhcmFtIHtib29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW19zdG9yYWdlV2lsbE11dGF0ZV0gLSDQpNC70LDQsyDQtNC+0LHQsNCy0LvQtdC90LjRjyDQvNCw0YHRgdC40LLQsCDQtNC+0LrRg9C80LXQvdGC0L7Qsi4g0YLQvtC70YzQutC+INC00LvRjyDQstC90YPRgtGA0LXQvdC90LXQs9C+INC40YHQv9C+0LvRjNC30L7QstCw0L3QuNGPXHJcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxyXG4gICAqL1xyXG4gIGFkZDogZnVuY3Rpb24oIGRvYywgZmllbGRzLCBpbml0LCBfc3RvcmFnZVdpbGxNdXRhdGUgKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGC0LAg0L3QtdGCLCDQt9C90LDRh9C40YIg0LHRg9C00LXRgiDQv9GD0YHRgtC+0LlcclxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xyXG5cclxuICAgIC8vINCc0LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QslxyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XHJcbiAgICAgIHZhciBzYXZlZERvY3MgPSBbXTtcclxuXHJcbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XHJcbiAgICAgICAgc2F2ZWREb2NzLnB1c2goIHNlbGYuYWRkKCBkb2MsIGZpZWxkcywgaW5pdCwgdHJ1ZSApICk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy5zdG9yYWdlSGFzTXV0YXRlZCgpO1xyXG5cclxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcclxuXHJcbiAgICAvLyDQldGB0LvQuCDQtNC+0LrRg9C80LXQvdGCINGD0LbQtSDQtdGB0YLRjCwg0YLQviDQv9GA0L7RgdGC0L4g0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LfQvdCw0YfQtdC90LjRj1xyXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xyXG4gICAgICB0aGlzLmRvY3VtZW50c1sgaWQgXS5zZXQoIGRvYyApO1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBkaXNjcmltaW5hdG9yTWFwcGluZyA9IHRoaXMuc2NoZW1hXHJcbiAgICAgICAgPyB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yTWFwcGluZ1xyXG4gICAgICAgIDogbnVsbDtcclxuXHJcbiAgICAgIHZhciBrZXkgPSBkaXNjcmltaW5hdG9yTWFwcGluZyAmJiBkaXNjcmltaW5hdG9yTWFwcGluZy5pc1Jvb3RcclxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxyXG4gICAgICAgIDogbnVsbDtcclxuXHJcbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcclxuICAgICAgdmFyIHNjaGVtYTtcclxuICAgICAgaWYgKGtleSAmJiBkb2MgJiYgZG9jW2tleV0gJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnMgJiYgdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dKSB7XHJcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XHJcbiAgICAgIGlkID0gbmV3RG9jLl9pZC50b1N0cmluZygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vINCU0LvRjyDQvtC00LjQvdC+0YfQvdGL0YUg0LTQvtC60YPQvNC10L3RgtC+0LIg0YLQvtC20LUg0L3Rg9C20L3QviAg0LLRi9C30LLQsNGC0Ywgc3RvcmFnZUhhc011dGF0ZWRcclxuICAgIGlmICggIV9zdG9yYWdlV2lsbE11dGF0ZSApe1xyXG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqINCj0LTQsNC70LXQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCLlxyXG4gICAqXHJcbiAgICogQGV4YW1wbGVcclxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24ucmVtb3ZlKCBEb2N1bWVudCApO1xyXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5yZW1vdmUoIHV1aWQgKTtcclxuICAgKlxyXG4gICAqIEBwYXJhbSB7b2JqZWN0fG51bWJlcn0gZG9jdW1lbnQgLSDQodCw0Lwg0LTQvtC60YPQvNC10L3RgiDQuNC70Lgg0LXQs9C+IGlkLlxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gICAqL1xyXG4gIHJlbW92ZTogZnVuY3Rpb24oIGRvY3VtZW50ICl7XHJcbiAgICByZXR1cm4gZGVsZXRlIHRoaXMuZG9jdW1lbnRzWyBkb2N1bWVudC5faWQgfHwgZG9jdW1lbnQgXTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cclxuICAgKlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICogLy8gbmFtZWQgam9oblxyXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgbmFtZTogJ2pvaG4nIH0pO1xyXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kKHsgYXV0aG9yOiAnU2hha2VzcGVhcmUnLCB5ZWFyOiAxNjExIH0pO1xyXG4gICAqXHJcbiAgICogQHBhcmFtIGNvbmRpdGlvbnNcclxuICAgKiBAcmV0dXJucyB7QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxyXG4gICAqL1xyXG4gIGZpbmQ6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XHJcbiAgICByZXR1cm4gXy53aGVyZSggdGhpcy5kb2N1bWVudHMsIGNvbmRpdGlvbnMgKTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cclxuICAgKlxyXG4gICAqIEBleGFtcGxlXHJcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xyXG4gICAqXHJcbiAgICogQHBhcmFtIF9pZFxyXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cclxuICAgKi9cclxuICBmaW5kQnlJZDogZnVuY3Rpb24oIF9pZCApe1xyXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiDQndCw0LnRgtC4INC/0L4gaWQg0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXHJcbiAgICpcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kQnlJZEFuZFJlbW92ZSggaWQgKSAvLyByZXR1cm5zINGBb2xsZWN0aW9uXHJcbiAgICpcclxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcclxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXHJcbiAgICpcclxuICAgKiBAcGFyYW0gX2lkXHJcbiAgICogQHJldHVybnMge0NvbGxlY3Rpb259XHJcbiAgICovXHJcbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcclxuICAgIHRoaXMucmVtb3ZlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSApO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXHJcbiAgICpcclxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcclxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXHJcbiAgICpcclxuICAgKiBAcGFyYW0gX2lkXHJcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXHJcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxyXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cclxuICAgKi9cclxuICBmaW5kQnlJZEFuZFVwZGF0ZTogZnVuY3Rpb24oIF9pZCwgcGF0aCwgdmFsdWUgKXtcclxuICAgIHJldHVybiB0aGlzLnVwZGF0ZSggdGhpcy5maW5kQnlJZCggX2lkICksIHBhdGgsIHZhbHVlICk7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxyXG4gICAqXHJcbiAgICogQGV4YW1wbGVcclxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xyXG4gICAqIHN0b3JhZ2UuYWR2ZW50dXJlLmZpbmRPbmUoeyB0eXBlOiAnaXBob25lJyB9KTtcclxuICAgKlxyXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXHJcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxyXG4gICAqL1xyXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XHJcbiAgICByZXR1cm4gXy5maW5kV2hlcmUoIHRoaXMuZG9jdW1lbnRzLCBjb25kaXRpb25zICk7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICog0J3QsNC50YLQuCDQv9C+INGD0YHQu9C+0LLQuNGOINC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxyXG4gICAqXHJcbiAgICogQGV4YW1wbGVcclxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZE9uZUFuZFJlbW92ZSggY29uZGl0aW9ucyApIC8vIHJldHVybnMg0YFvbGxlY3Rpb25cclxuICAgKlxyXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXHJcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcclxuICAgKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cclxuICAgKi9cclxuICBmaW5kT25lQW5kUmVtb3ZlOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xyXG4gICAgdGhpcy5yZW1vdmUoIHRoaXMuZmluZE9uZSggY29uZGl0aW9ucyApICk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YIg0L/QviDRg9GB0LvQvtCy0LjRjiDQuCDQvtCx0L3QvtCy0LjRgtGMINC10LPQvi5cclxuICAgKlxyXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXHJcbiAgICogQHNlZSBDb2xsZWN0aW9uLnVwZGF0ZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcclxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHBhdGhcclxuICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufG51bWJlcnxzdHJpbmd8bnVsbHx1bmRlZmluZWR9IHZhbHVlXHJcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxyXG4gICAqL1xyXG4gIGZpbmRPbmVBbmRVcGRhdGU6IGZ1bmN0aW9uKCBjb25kaXRpb25zLCBwYXRoLCB2YWx1ZSApe1xyXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiDQntCx0L3QvtCy0LjRgtGMINGB0YPRidC10YHRgtCy0YPRjtGJ0LjQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUuXHJcbiAgICpcclxuICAgKiBAZXhhbXBsZVxyXG4gICAqIHN0b3JhZ2UucGxhY2VzLnVwZGF0ZSggc3RvcmFnZS5wbGFjZXMuZmluZEJ5SWQoIDAgKSwge1xyXG4gICAqICAgbmFtZTogJ0lya3V0c2snXHJcbiAgICogfSk7XHJcbiAgICpcclxuICAgKiBAcGFyYW0ge251bWJlcnxvYmplY3R9IGRvY3VtZW50XHJcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXHJcbiAgICogQHBhcmFtIHtvYmplY3R8Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxyXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fEJvb2xlYW59XHJcbiAgICovXHJcbiAgdXBkYXRlOiBmdW5jdGlvbiggZG9jdW1lbnQsIHBhdGgsIHZhbHVlICl7XHJcbiAgICB2YXIgZG9jID0gdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xyXG5cclxuICAgIGlmICggZG9jID09IG51bGwgKXtcclxuICAgICAgY29uc29sZS53YXJuKCdzdG9yYWdlOjp1cGRhdGU6IERvY3VtZW50IGlzIG5vdCBmb3VuZC4nKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC90LAg0LjQt9C80LXQvdC10L3QuNGPICjQtNC+0LHQsNCy0LvQtdC90LjQtSwg0YPQtNCw0LvQtdC90LjQtSkg0LTQsNC90L3Ri9GFINCyINC60L7Qu9C70LXQutGG0LjQuFxyXG4gICAqL1xyXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xyXG4gICAgLy8g0J7QsdC90L7QstC40Lwg0LzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyICjRgdC/0LXRhtC40LDQu9GM0L3QvtC1INC+0YLQvtCx0YDQsNC20LXQvdC40LUg0LTQu9GPINC/0LXRgNC10LHQvtGA0LAg0L3QvtC60LDRg9GC0L7QvClcclxuICAgIHRoaXMuYXJyYXkgPSBfLnRvQXJyYXkoIHRoaXMuZG9jdW1lbnRzICk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcclxuICAsIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKVxyXG4gICwgTWl4ZWRTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYS9taXhlZCcpXHJcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vdHlwZXMvb2JqZWN0aWQnKVxyXG4gICwgU2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKVxyXG4gICwgVmFsaWRhdG9yRXJyb3IgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKS5WYWxpZGF0b3JFcnJvclxyXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxuICAsIGNsb25lID0gdXRpbHMuY2xvbmVcclxuICAsIFZhbGlkYXRpb25FcnJvciA9IFN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3JcclxuICAsIEludGVybmFsQ2FjaGUgPSByZXF1aXJlKCcuL2ludGVybmFsJylcclxuICAsIGRlZXBFcXVhbCA9IHV0aWxzLmRlZXBFcXVhbFxyXG4gICwgRG9jdW1lbnRBcnJheVxyXG4gICwgU2NoZW1hQXJyYXlcclxuICAsIEVtYmVkZGVkO1xyXG5cclxuLyoqXHJcbiAqINCa0L7QvdGB0YLRgNGD0LrRgtC+0YAg0LTQvtC60YPQvNC10L3RgtCwLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtINC30L3QsNGH0LXQvdC40Y8sINC60L7RgtC+0YDRi9C1INC90YPQttC90L4g0YPRgdGC0LDQvdC+0LLQuNGC0YxcclxuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBbY29sbGVjdGlvbk5hbWVdIC0g0LrQvtC70LvQtdC60YbQuNGPINCyINC60L7RgtC+0YDQvtC5INCx0YPQtNC10YIg0L3QsNGF0L7QtNC40YLRgdGPINC00L7QutGD0LzQtdC90YJcclxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINGB0YXQtdC80LAg0L/QviDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINGB0L7Qt9C00LDQvSDQtNC+0LrRg9C80LXQvdGCXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQsiDQtNC+0LrRg9C80LXQvdGC0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QvilcclxuICogQHBhcmFtIHtCb29sZWFufSBbaW5pdF0gLSBoeWRyYXRlIGRvY3VtZW50IC0g0L3QsNC/0L7Qu9C90LjRgtGMINC00L7QutGD0LzQtdC90YIg0LTQsNC90L3Ri9C80LggKNC40YHQv9C+0LvRjNC30YPQtdGC0YHRjyDQsiBhcGktY2xpZW50KVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIERvY3VtZW50ICggZGF0YSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICl7XHJcbiAgdGhpcy5pc05ldyA9IHRydWU7XHJcblxyXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XHJcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh0cnVlKTtcclxuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGRhdGEgKXtcclxuICAgIGluaXQgPSBkYXRhO1xyXG4gICAgZGF0YSA9IG51bGw7XHJcbiAgfVxyXG5cclxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XHJcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh7IHRlc3Q6ICdib29tJyB9LCB0cnVlKTtcclxuICBpZiAoICdib29sZWFuJyA9PT0gdHlwZW9mIGNvbGxlY3Rpb25OYW1lICl7XHJcbiAgICBpbml0ID0gY29sbGVjdGlvbk5hbWU7XHJcbiAgICBjb2xsZWN0aW9uTmFtZSA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIC8vINCh0L7Qt9C00LDRgtGMINC/0YPRgdGC0L7QuSDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtVxyXG4gIGlmICggZGF0YSBpbnN0YW5jZW9mIFNjaGVtYSApe1xyXG4gICAgc2NoZW1hID0gZGF0YTtcclxuICAgIGRhdGEgPSBudWxsO1xyXG5cclxuICAgIGlmICggc2NoZW1hLm9wdGlvbnMuX2lkICl7XHJcbiAgICAgIGRhdGEgPSB7IF9pZDogbmV3IE9iamVjdElkKCkgfTtcclxuICAgIH1cclxuXHJcbiAgfSBlbHNlIHtcclxuICAgIC8vINCf0YDQuCDRgdC+0LfQtNCw0L3QuNC4IEVtYmVkZGVkRG9jdW1lbnQsINCyINC90ZHQvCDRg9C20LUg0LXRgdGC0Ywg0YHRhdC10LzQsCDQuCDQtdC80YMg0L3QtSDQvdGD0LbQtdC9IF9pZFxyXG4gICAgc2NoZW1hID0gdGhpcy5zY2hlbWEgfHwgc2NoZW1hO1xyXG4gICAgLy8g0KHQs9C10L3QtdGA0LjRgNC+0LLQsNGC0YwgT2JqZWN0SWQsINC10YHQu9C4INC+0L0g0L7RgtGB0YPRgtGB0YLQstGD0LXRgiDQuCDQtdCz0L4g0YLRgNC10LHRg9C10YIg0YHRhdC10LzQsFxyXG4gICAgaWYgKCAhdGhpcy5zY2hlbWEgJiYgc2NoZW1hLm9wdGlvbnMuX2lkICl7XHJcbiAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xyXG5cclxuICAgICAgaWYgKCAhZGF0YS5faWQgKXtcclxuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoICFzY2hlbWEgKXtcclxuICAgIC8vdG9kbzogdGhyb3cgbmV3IG1vbmdvb3NlLkVycm9yLk1pc3NpbmdTY2hlbWFFcnJvcihuYW1lKTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9Cd0LXQu9GM0LfRjyDRgdC+0LfQtNCw0LLQsNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQsdC10Lcg0YHRhdC10LzRiycpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XHJcbiAgdGhpcy5jb2xsZWN0aW9uID0gd2luZG93LnN0b3JhZ2VbIGNvbGxlY3Rpb25OYW1lIF07XHJcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xyXG5cclxuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xyXG4gICAgaWYgKCBkYXRhID09IG51bGwgfHwgIWRhdGEuX2lkICl7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9CU0LvRjyDQv9C+0LzQtdGJ0LXQvdC40Y8g0LIg0LrQvtC70LvQtdC60YbQuNGOINC90LXQvtCx0YXQvtC00LjQvNC+LCDRh9GC0L7QsdGLINGDINC00L7QutGD0LzQtdC90YLQsCDQsdGL0LsgX2lkJyk7XHJcbiAgICB9XHJcbiAgICAvLyDQn9C+0LzQtdGB0YLQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQsiDQutC+0LvQu9C10LrRhtC40Y5cclxuICAgIHRoaXMuY29sbGVjdGlvbi5kb2N1bWVudHNbIGRhdGEuX2lkIF0gPSB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdGhpcy4kX18gPSBuZXcgSW50ZXJuYWxDYWNoZTtcclxuICB0aGlzLiRfXy5zdHJpY3RNb2RlID0gc2NoZW1hLm9wdGlvbnMgJiYgc2NoZW1hLm9wdGlvbnMuc3RyaWN0O1xyXG4gIHRoaXMuJF9fLnNlbGVjdGVkID0gZmllbGRzO1xyXG5cclxuICB2YXIgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWRQYXRocygpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVxdWlyZWQubGVuZ3RoOyArK2kpIHtcclxuICAgIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnJlcXVpcmUoIHJlcXVpcmVkW2ldICk7XHJcbiAgfVxyXG5cclxuICB0aGlzLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XHJcblxyXG4gIHRoaXMuX2RvYyA9IHRoaXMuJF9fYnVpbGREb2MoIGRhdGEsIGluaXQgKTtcclxuXHJcbiAgaWYgKCBpbml0ICl7XHJcbiAgICB0aGlzLmluaXQoIGRhdGEgKTtcclxuICB9IGVsc2UgaWYgKCBkYXRhICkge1xyXG4gICAgdGhpcy5zZXQoIGRhdGEsIHVuZGVmaW5lZCwgdHJ1ZSApO1xyXG4gIH1cclxuXHJcbiAgLy8gYXBwbHkgbWV0aG9kc1xyXG4gIGZvciAoIHZhciBtIGluIHNjaGVtYS5tZXRob2RzICl7XHJcbiAgICB0aGlzWyBtIF0gPSBzY2hlbWEubWV0aG9kc1sgbSBdO1xyXG4gIH1cclxuICAvLyBhcHBseSBzdGF0aWNzXHJcbiAgZm9yICggdmFyIHMgaW4gc2NoZW1hLnN0YXRpY3MgKXtcclxuICAgIHRoaXNbIHMgXSA9IHNjaGVtYS5zdGF0aWNzWyBzIF07XHJcbiAgfVxyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBFdmVudEVtaXR0ZXIuXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XHJcbkRvY3VtZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERvY3VtZW50O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBkb2N1bWVudHMgc2NoZW1hLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcHJvcGVydHkgc2NoZW1hXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuc2NoZW1hO1xyXG5cclxuLyoqXHJcbiAqIEJvb2xlYW4gZmxhZyBzcGVjaWZ5aW5nIGlmIHRoZSBkb2N1bWVudCBpcyBuZXcuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEBwcm9wZXJ0eSBpc05ld1xyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLmlzTmV3O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBzdHJpbmcgdmVyc2lvbiBvZiB0aGlzIGRvY3VtZW50cyBfaWQuXHJcbiAqXHJcbiAqICMjIyNOb3RlOlxyXG4gKlxyXG4gKiBUaGlzIGdldHRlciBleGlzdHMgb24gYWxsIGRvY3VtZW50cyBieSBkZWZhdWx0LiBUaGUgZ2V0dGVyIGNhbiBiZSBkaXNhYmxlZCBieSBzZXR0aW5nIHRoZSBgaWRgIFtvcHRpb25dKC9kb2NzL2d1aWRlLmh0bWwjaWQpIG9mIGl0cyBgU2NoZW1hYCB0byBmYWxzZSBhdCBjb25zdHJ1Y3Rpb24gdGltZS5cclxuICpcclxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSwgeyBpZDogZmFsc2UgfSk7XHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEBzZWUgU2NoZW1hIG9wdGlvbnMgL2RvY3MvZ3VpZGUuaHRtbCNvcHRpb25zXHJcbiAqIEBwcm9wZXJ0eSBpZFxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLmlkO1xyXG5cclxuLyoqXHJcbiAqIEhhc2ggY29udGFpbmluZyBjdXJyZW50IHZhbGlkYXRpb24gZXJyb3JzLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcHJvcGVydHkgZXJyb3JzXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuZXJyb3JzO1xyXG5cclxuRG9jdW1lbnQucHJvdG90eXBlLmFkYXB0ZXJIb29rcyA9IHtcclxuICBkb2N1bWVudERlZmluZVByb3BlcnR5OiAkLm5vb3AsXHJcbiAgZG9jdW1lbnRTZXRJbml0aWFsVmFsdWU6ICQubm9vcCxcclxuICBkb2N1bWVudEdldFZhbHVlOiAkLm5vb3AsXHJcbiAgZG9jdW1lbnRTZXRWYWx1ZTogJC5ub29wXHJcbn07XHJcblxyXG4vKipcclxuICogQnVpbGRzIHRoZSBkZWZhdWx0IGRvYyBzdHJ1Y3R1cmVcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtza2lwSWRdXHJcbiAqIEByZXR1cm4ge09iamVjdH1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fYnVpbGREb2NcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fYnVpbGREb2MgPSBmdW5jdGlvbiAoIG9iaiwgc2tpcElkICkge1xyXG4gIHZhciBkb2MgPSB7fVxyXG4gICAgLCBzZWxmID0gdGhpcztcclxuXHJcbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcclxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxyXG4gICAgLCBpaSA9IDA7XHJcblxyXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xyXG4gICAgdmFyIHAgPSBwYXRoc1tpaV07XHJcblxyXG4gICAgaWYgKCAnX2lkJyA9PSBwICkge1xyXG4gICAgICBpZiAoIHNraXBJZCApIGNvbnRpbnVlO1xyXG4gICAgICBpZiAoIG9iaiAmJiAnX2lkJyBpbiBvYmogKSBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhzWyBwIF1cclxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXHJcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcclxuICAgICAgLCBsYXN0ID0gbGVuIC0gMVxyXG4gICAgICAsIGRvY18gPSBkb2NcclxuICAgICAgLCBpID0gMDtcclxuXHJcbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcclxuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXHJcbiAgICAgICAgLCBkZWZhdWx0VmFsO1xyXG5cclxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xyXG4gICAgICAgIGRlZmF1bHRWYWwgPSB0eXBlLmdldERlZmF1bHQoIHNlbGYsIHRydWUgKTtcclxuXHJcbiAgICAgICAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGVmYXVsdFZhbCApIHtcclxuICAgICAgICAgIGRvY19bIHBpZWNlIF0gPSBkZWZhdWx0VmFsO1xyXG4gICAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZG9jO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemVzIHRoZSBkb2N1bWVudCB3aXRob3V0IHNldHRlcnMgb3IgbWFya2luZyBhbnl0aGluZyBtb2RpZmllZC5cclxuICpcclxuICogQ2FsbGVkIGludGVybmFsbHkgYWZ0ZXIgYSBkb2N1bWVudCBpcyByZXR1cm5lZCBmcm9tIHNlcnZlci5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgZG9jdW1lbnQgcmV0dXJuZWQgYnkgc2VydmVyXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcbiAgdGhpcy5pc05ldyA9IGZhbHNlO1xyXG5cclxuICAvL3RvZG86INGB0LTQtdGB0Ywg0LLRgdGRINC40LfQvNC10L3QuNGC0YHRjywg0YHQvNC+0YLRgNC10YLRjCDQutC+0LzQvNC10L3RgiDQvNC10YLQvtC00LAgdGhpcy5wb3B1bGF0ZWRcclxuICAvLyBoYW5kbGUgZG9jcyB3aXRoIHBvcHVsYXRlZCBwYXRoc1xyXG4gIC8qaWYgKCBkb2MuX2lkICYmIG9wdHMgJiYgb3B0cy5wb3B1bGF0ZWQgJiYgb3B0cy5wb3B1bGF0ZWQubGVuZ3RoICkge1xyXG4gICAgdmFyIGlkID0gU3RyaW5nKCBkb2MuX2lkICk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9wdHMucG9wdWxhdGVkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgIHZhciBpdGVtID0gb3B0cy5wb3B1bGF0ZWRbIGkgXTtcclxuICAgICAgdGhpcy5wb3B1bGF0ZWQoIGl0ZW0ucGF0aCwgaXRlbS5fZG9jc1tpZF0sIGl0ZW0gKTtcclxuICAgIH1cclxuICB9Ki9cclxuXHJcbiAgaW5pdCggdGhpcywgZGF0YSwgdGhpcy5fZG9jICk7XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIEluaXQgaGVscGVyLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2VsZiBkb2N1bWVudCBpbnN0YW5jZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHJhdyBzZXJ2ZXIgZG9jXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2Mgb2JqZWN0IHdlIGFyZSBpbml0aWFsaXppbmdcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBpbml0IChzZWxmLCBvYmosIGRvYywgcHJlZml4KSB7XHJcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xyXG5cclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcclxuICAgICwgbGVuID0ga2V5cy5sZW5ndGhcclxuICAgICwgc2NoZW1hXHJcbiAgICAsIHBhdGhcclxuICAgICwgaTtcclxuXHJcbiAgd2hpbGUgKGxlbi0tKSB7XHJcbiAgICBpID0ga2V5c1tsZW5dO1xyXG4gICAgcGF0aCA9IHByZWZpeCArIGk7XHJcbiAgICBzY2hlbWEgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xyXG5cclxuICAgIGlmICghc2NoZW1hICYmIF8uaXNQbGFpbk9iamVjdCggb2JqWyBpIF0gKSAmJlxyXG4gICAgICAgICghb2JqW2ldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IG9ialtpXS5jb25zdHJ1Y3Rvci5uYW1lKSkge1xyXG4gICAgICAvLyBhc3N1bWUgbmVzdGVkIG9iamVjdFxyXG4gICAgICBpZiAoIWRvY1tpXSkgZG9jW2ldID0ge307XHJcbiAgICAgIGluaXQoc2VsZiwgb2JqW2ldLCBkb2NbaV0sIHBhdGggKyAnLicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKG9ialtpXSA9PT0gbnVsbCkge1xyXG4gICAgICAgIGRvY1tpXSA9IG51bGw7XHJcbiAgICAgIH0gZWxzZSBpZiAob2JqW2ldICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBpZiAoc2NoZW1hKSB7XHJcbiAgICAgICAgICBzZWxmLiRfX3RyeShmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICBkb2NbaV0gPSBzY2hlbWEuY2FzdChvYmpbaV0sIHNlbGYsIHRydWUpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGRvY1tpXSA9IG9ialtpXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNlbGYuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0SW5pdGlhbFZhbHVlLmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIGRvY1tpXSApO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIG1hcmsgYXMgaHlkcmF0ZWRcclxuICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuaW5pdChwYXRoKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHBhdGgsIG9yIG1hbnkgcGF0aHMuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgLy8gcGF0aCwgdmFsdWVcclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUpXHJcbiAqXHJcbiAqICAgICAvLyBvYmplY3RcclxuICogICAgIGRvYy5zZXQoe1xyXG4gKiAgICAgICAgIHBhdGggIDogdmFsdWVcclxuICogICAgICAgLCBwYXRoMiA6IHtcclxuICogICAgICAgICAgICBwYXRoICA6IHZhbHVlXHJcbiAqICAgICAgICAgfVxyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIG51bWJlclxyXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgTnVtYmVyKVxyXG4gKlxyXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gc3RyaW5nXHJcbiAqICAgICBkb2Muc2V0KHBhdGgsIHZhbHVlLCBTdHJpbmcpXHJcbiAqXHJcbiAqICAgICAvLyBjaGFuZ2luZyBzdHJpY3QgbW9kZSBiZWhhdmlvclxyXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgeyBzdHJpY3Q6IGZhbHNlIH0pO1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhdGggcGF0aCBvciBvYmplY3Qgb2Yga2V5L3ZhbHMgdG8gc2V0XHJcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbCB0aGUgdmFsdWUgdG8gc2V0XHJcbiAqIEBwYXJhbSB7U2NoZW1hfFN0cmluZ3xOdW1iZXJ8ZXRjLi59IFt0eXBlXSBvcHRpb25hbGx5IHNwZWNpZnkgYSB0eXBlIGZvciBcIm9uLXRoZS1mbHlcIiBhdHRyaWJ1dGVzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWxseSBzcGVjaWZ5IG9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGJlaGF2aW9yIG9mIHRoZSBzZXRcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCB0eXBlLCBvcHRpb25zKSB7XHJcbiAgaWYgKHR5cGUgJiYgJ09iamVjdCcgPT0gdHlwZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XHJcbiAgICBvcHRpb25zID0gdHlwZTtcclxuICAgIHR5cGUgPSB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcclxuICAgICwgYWRob2MgPSB0eXBlICYmIHRydWUgIT09IHR5cGVcclxuICAgICwgY29uc3RydWN0aW5nID0gdHJ1ZSA9PT0gdHlwZVxyXG4gICAgLCBhZGhvY3M7XHJcblxyXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zICYmICdzdHJpY3QnIGluIG9wdGlvbnNcclxuICAgID8gb3B0aW9ucy5zdHJpY3RcclxuICAgIDogdGhpcy4kX18uc3RyaWN0TW9kZTtcclxuXHJcbiAgaWYgKGFkaG9jKSB7XHJcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xyXG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcclxuICB9XHJcblxyXG4gIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIHBhdGgpIHtcclxuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXHJcblxyXG4gICAgaWYgKG51bGwgPT09IHBhdGggfHwgdW5kZWZpbmVkID09PSBwYXRoKSB7XHJcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XHJcbiAgICAgIHBhdGggPSB2YWw7XHJcbiAgICAgIHZhbCA9IF90ZW1wO1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBwcmVmaXggPSB2YWxcclxuICAgICAgICA/IHZhbCArICcuJ1xyXG4gICAgICAgIDogJyc7XHJcblxyXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xyXG5cclxuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwYXRoKVxyXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXHJcbiAgICAgICAgLCBwYXRodHlwZVxyXG4gICAgICAgICwga2V5O1xyXG5cclxuXHJcbiAgICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgICBrZXkgPSBrZXlzW2ldO1xyXG4gICAgICAgIHBhdGh0eXBlID0gdGhpcy5zY2hlbWEucGF0aFR5cGUocHJlZml4ICsga2V5KTtcclxuICAgICAgICBpZiAobnVsbCAhPSBwYXRoW2tleV1cclxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXHJcbiAgICAgICAgICAgICYmIF8uaXNQbGFpbk9iamVjdChwYXRoW2tleV0pXHJcbiAgICAgICAgICAgICYmICggIXBhdGhba2V5XS5jb25zdHJ1Y3RvciB8fCAnT2JqZWN0JyA9PSBwYXRoW2tleV0uY29uc3RydWN0b3IubmFtZSApXHJcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPSBwYXRodHlwZVxyXG4gICAgICAgICAgICAmJiAhKCB0aGlzLiRfX3BhdGgoIHByZWZpeCArIGtleSApIGluc3RhbmNlb2YgTWl4ZWRTY2hlbWEgKVxyXG4gICAgICAgICAgICAmJiAhKCB0aGlzLnNjaGVtYS5wYXRoc1trZXldICYmIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0ub3B0aW9ucy5yZWYgKVxyXG4gICAgICAgICAgKXtcclxuXHJcbiAgICAgICAgICB0aGlzLnNldChwYXRoW2tleV0sIHByZWZpeCArIGtleSwgY29uc3RydWN0aW5nKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QpIHtcclxuICAgICAgICAgIGlmICgncmVhbCcgPT09IHBhdGh0eXBlIHx8ICd2aXJ0dWFsJyA9PT0gcGF0aHR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XHJcblxyXG4gICAgICAgICAgfSBlbHNlIGlmICgndGhyb3cnID09IHN0cmljdCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBrZXkgKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkICE9PSBwYXRoW2tleV0pIHtcclxuICAgICAgICAgIHRoaXMuc2V0KHByZWZpeCArIGtleSwgcGF0aFtrZXldLCBjb25zdHJ1Y3RpbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBlbnN1cmUgX3N0cmljdCBpcyBob25vcmVkIGZvciBvYmogcHJvcHNcclxuICAvLyBkb2NzY2hlbWEgPSBuZXcgU2NoZW1hKHsgcGF0aDogeyBuZXN0OiAnc3RyaW5nJyB9fSlcclxuICAvLyBkb2Muc2V0KCdwYXRoJywgb2JqKTtcclxuICB2YXIgcGF0aFR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwYXRoKTtcclxuICBpZiAoJ25lc3RlZCcgPT0gcGF0aFR5cGUgJiYgdmFsICYmIF8uaXNQbGFpbk9iamVjdCh2YWwpICYmXHJcbiAgICAgICghdmFsLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHZhbC5jb25zdHJ1Y3Rvci5uYW1lKSkge1xyXG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcclxuICAgIHRoaXMuc2V0KHZhbCwgcGF0aCwgY29uc3RydWN0aW5nKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNjaGVtYTtcclxuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XHJcbiAgdmFyIHN1YnBhdGg7XHJcblxyXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT0gcGF0aFR5cGUgJiYgc3RyaWN0KSB7XHJcblxyXG4gICAgLy8gY2hlY2sgZm9yIHJvb3RzIHRoYXQgYXJlIE1peGVkIHR5cGVzXHJcbiAgICB2YXIgbWl4ZWQ7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xyXG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSsxKS5qb2luKCcuJyk7XHJcbiAgICAgIHNjaGVtYSA9IHRoaXMuc2NoZW1hLnBhdGgoc3VicGF0aCk7XHJcbiAgICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBNaXhlZFNjaGVtYSkge1xyXG4gICAgICAgIC8vIGFsbG93IGNoYW5nZXMgdG8gc3ViIHBhdGhzIG9mIG1peGVkIHR5cGVzXHJcbiAgICAgICAgbWl4ZWQgPSB0cnVlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFtaXhlZCkge1xyXG4gICAgICBpZiAoJ3Rocm93JyA9PSBzdHJpY3QpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBwYXRoICsgXCJgIGlzIG5vdCBpbiBzY2hlbWEuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICB9IGVsc2UgaWYgKCd2aXJ0dWFsJyA9PSBwYXRoVHlwZSkge1xyXG4gICAgc2NoZW1hID0gdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aCk7XHJcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9IGVsc2Uge1xyXG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHBhdGhUb01hcms7XHJcblxyXG4gIC8vIFdoZW4gdXNpbmcgdGhlICRzZXQgb3BlcmF0b3IgdGhlIHBhdGggdG8gdGhlIGZpZWxkIG11c3QgYWxyZWFkeSBleGlzdC5cclxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxyXG5cclxuICBpZiAocGFydHMubGVuZ3RoIDw9IDEpIHtcclxuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBmb3IgKCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpICkge1xyXG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcclxuICAgICAgaWYgKHRoaXMuaXNEaXJlY3RNb2RpZmllZChzdWJwYXRoKSAvLyBlYXJsaWVyIHByZWZpeGVzIHRoYXQgYXJlIGFscmVhZHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrZWQgYXMgZGlydHkgaGF2ZSBwcmVjZWRlbmNlXHJcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHBhdGhUb01hcmsgPSBzdWJwYXRoO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcclxuICB9XHJcblxyXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXHJcbiAgdmFyIHByaW9yVmFsID0gY29uc3RydWN0aW5nXHJcbiAgICA/IHVuZGVmaW5lZFxyXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xyXG5cclxuICBpZiAoIXNjaGVtYSB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xyXG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHZhciBzaG91bGRTZXQgPSB0aGlzLiRfX3RyeShmdW5jdGlvbigpe1xyXG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XHJcbiAgfSk7XHJcblxyXG4gIGlmIChzaG91bGRTZXQpIHtcclxuICAgIHRoaXMuJF9fc2V0KHBhdGhUb01hcmssIHBhdGgsIGNvbnN0cnVjdGluZywgcGFydHMsIHNjaGVtYSwgdmFsLCBwcmlvclZhbCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgd2Ugc2hvdWxkIG1hcmsgdGhpcyBjaGFuZ2UgYXMgbW9kaWZpZWQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxyXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXHJcbiAgICBwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpIHtcclxuXHJcbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xyXG5cclxuICBpZiAoIHVuZGVmaW5lZCA9PT0gdmFsICYmICF0aGlzLmlzU2VsZWN0ZWQocGF0aCkgKSB7XHJcbiAgICAvLyB3aGVuIGEgcGF0aCBpcyBub3Qgc2VsZWN0ZWQgaW4gYSBxdWVyeSwgaXRzIGluaXRpYWxcclxuICAgIC8vIHZhbHVlIHdpbGwgYmUgdW5kZWZpbmVkLlxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAodW5kZWZpbmVkID09PSB2YWwgJiYgcGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuZGVmYXVsdCkge1xyXG4gICAgLy8gd2UncmUganVzdCB1bnNldHRpbmcgdGhlIGRlZmF1bHQgdmFsdWUgd2hpY2ggd2FzIG5ldmVyIHNhdmVkXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAoIXV0aWxzLmRlZXBFcXVhbCh2YWwsIHByaW9yVmFsIHx8IHRoaXMuZ2V0KHBhdGgpKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvL9GC0LXRgdGCINC90LUg0L/RgNC+0YXQvtC00LjRgiDQuNC3LdC30LAg0L3QsNC70LjRh9C40Y8g0LvQuNGI0L3QtdCz0L4g0L/QvtC70Y8g0LIgc3RhdGVzLmRlZmF1bHQgKGNvbW1lbnRzKVxyXG4gIC8vINCd0LAg0YHQsNC80L7QvCDQtNC10LvQtSDQv9C+0LvQtSDQstGA0L7QtNC1INC4INC90LUg0LvQuNGI0L3QtdC1XHJcbiAgLy9jb25zb2xlLmluZm8oIHBhdGgsIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgKTtcclxuICAvL2NvbnNvbGUubG9nKCB0aGlzLiRfXy5hY3RpdmVQYXRocyApO1xyXG5cclxuICAvLyDQmtC+0LPQtNCwINC80Ysg0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0YLQsNC60L7QtSDQttC1INC30L3QsNGH0LXQvdC40LUg0LrQsNC6IGRlZmF1bHRcclxuICAvLyDQndC1INC/0L7QvdGP0YLQvdC+INC30LDRh9C10Lwg0LzQsNC90LPRg9GB0YIg0LXQs9C+INC+0LHQvdC+0LLQu9GP0LtcclxuICAvKmlmICghY29uc3RydWN0aW5nICYmXHJcbiAgICAgIG51bGwgIT0gdmFsICYmXHJcbiAgICAgIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgJiZcclxuICAgICAgdXRpbHMuZGVlcEVxdWFsKHZhbCwgc2NoZW1hLmdldERlZmF1bHQodGhpcywgY29uc3RydWN0aW5nKSkgKSB7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyggcGF0aFRvTWFyaywgdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSApO1xyXG5cclxuICAgIC8vIGEgcGF0aCB3aXRoIGEgZGVmYXVsdCB3YXMgJHVuc2V0IG9uIHRoZSBzZXJ2ZXJcclxuICAgIC8vIGFuZCB0aGUgdXNlciBpcyBzZXR0aW5nIGl0IHRvIHRoZSBzYW1lIHZhbHVlIGFnYWluXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9Ki9cclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXMgdGhlIGFjdHVhbCBzZXR0aW5nIG9mIHRoZSB2YWx1ZSBhbmQgbWFya2luZyB0aGUgcGF0aCBtb2RpZmllZCBpZiBhcHByb3ByaWF0ZS5cclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fc2V0XHJcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldCA9IGZ1bmN0aW9uICggcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsICkge1xyXG4gIHZhciBzaG91bGRNb2RpZnkgPSB0aGlzLiRfX3Nob3VsZE1vZGlmeS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cclxuICBpZiAoc2hvdWxkTW9kaWZ5KSB7XHJcbiAgICB0aGlzLm1hcmtNb2RpZmllZChwYXRoVG9NYXJrLCB2YWwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIG9iaiA9IHRoaXMuX2RvY1xyXG4gICAgLCBpID0gMFxyXG4gICAgLCBsID0gcGFydHMubGVuZ3RoO1xyXG5cclxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xyXG4gICAgdmFyIG5leHQgPSBpICsgMVxyXG4gICAgICAsIGxhc3QgPSBuZXh0ID09PSBsO1xyXG5cclxuICAgIGlmICggbGFzdCApIHtcclxuICAgICAgb2JqW3BhcnRzW2ldXSA9IHZhbDtcclxuXHJcbiAgICAgIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50U2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCwgdmFsICk7XHJcblxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ09iamVjdCcgPT09IG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IubmFtZSkge1xyXG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XHJcblxyXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgJ0VtYmVkZGVkRG9jdW1lbnQnID09PSBvYmpbcGFydHNbaV1dLmNvbnN0cnVjdG9yLm5hbWUpIHtcclxuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xyXG5cclxuICAgICAgfSBlbHNlIGlmIChvYmpbcGFydHNbaV1dICYmIEFycmF5LmlzQXJyYXkob2JqW3BhcnRzW2ldXSkpIHtcclxuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyBhIHJhdyB2YWx1ZSBmcm9tIGEgcGF0aCAobm8gZ2V0dGVycylcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xyXG4gIHJldHVybiB1dGlscy5nZXRWYWx1ZShwYXRoLCB0aGlzLl9kb2MpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgYSByYXcgdmFsdWUgZm9yIGEgcGF0aCAobm8gY2FzdGluZywgc2V0dGVycywgdHJhbnNmb3JtYXRpb25zKVxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsdWUpIHtcclxuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBhIHBhdGguXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlXHJcbiAqXHJcbiAqICAgICAvLyBwYXRoXHJcbiAqICAgICBkb2MuZ2V0KCdhZ2UnKSAvLyA0N1xyXG4gKlxyXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXHJcbiAqICAgICBkb2MuZ2V0KCdhZ2UnLCBTdHJpbmcpIC8vIFwiNDdcIlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge1NjaGVtYXxTdHJpbmd8TnVtYmVyfSBbdHlwZV0gb3B0aW9uYWxseSBzcGVjaWZ5IGEgdHlwZSBmb3Igb24tdGhlLWZseSBhdHRyaWJ1dGVzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsIHR5cGUpIHtcclxuICB2YXIgYWRob2NzO1xyXG4gIGlmICh0eXBlKSB7XHJcbiAgICBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzIHx8ICh0aGlzLiRfXy5hZGhvY1BhdGhzID0ge30pO1xyXG4gICAgYWRob2NzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCB0eXBlKTtcclxuICB9XHJcblxyXG4gIHZhciBzY2hlbWEgPSB0aGlzLiRfX3BhdGgocGF0aCkgfHwgdGhpcy5zY2hlbWEudmlydHVhbHBhdGgocGF0aClcclxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXHJcbiAgICAsIG9iaiA9IHRoaXMuX2RvYztcclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICBvYmogPSB1bmRlZmluZWQgPT09IG9iaiB8fCBudWxsID09PSBvYmpcclxuICAgICAgPyB1bmRlZmluZWRcclxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcclxuICB9XHJcblxyXG4gIGlmIChzY2hlbWEpIHtcclxuICAgIG9iaiA9IHNjaGVtYS5hcHBseUdldHRlcnMob2JqLCB0aGlzKTtcclxuICB9XHJcblxyXG4gIHRoaXMuYWRhcHRlckhvb2tzLmRvY3VtZW50R2V0VmFsdWUuY2FsbCggdGhpcywgdGhpcywgcGF0aCApO1xyXG5cclxuICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIHNjaGVtYXR5cGUgZm9yIHRoZSBnaXZlbiBgcGF0aGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAbWV0aG9kICRfX3BhdGhcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XHJcbiAgdmFyIGFkaG9jcyA9IHRoaXMuJF9fLmFkaG9jUGF0aHNcclxuICAgICwgYWRob2NUeXBlID0gYWRob2NzICYmIGFkaG9jc1twYXRoXTtcclxuXHJcbiAgaWYgKGFkaG9jVHlwZSkge1xyXG4gICAgcmV0dXJuIGFkaG9jVHlwZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hLnBhdGgocGF0aCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1hcmtzIHRoZSBwYXRoIGFzIGhhdmluZyBwZW5kaW5nIGNoYW5nZXMgdG8gd3JpdGUgdG8gdGhlIGRiLlxyXG4gKlxyXG4gKiBfVmVyeSBoZWxwZnVsIHdoZW4gdXNpbmcgW01peGVkXSguL3NjaGVtYXR5cGVzLmh0bWwjbWl4ZWQpIHR5cGVzLl9cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcclxuICogICAgIGRvYy5tYXJrTW9kaWZpZWQoJ21peGVkLnR5cGUnKTtcclxuICogICAgIGRvYy5zYXZlKCkgLy8gY2hhbmdlcyB0byBtaXhlZC50eXBlIGFyZSBub3cgcGVyc2lzdGVkXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIG1hcmsgbW9kaWZpZWRcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS5tYXJrTW9kaWZpZWQgPSBmdW5jdGlvbiAocGF0aCkge1xyXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLm1vZGlmeShwYXRoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXRjaGVzIGVycm9ycyB0aGF0IG9jY3VyIGR1cmluZyBleGVjdXRpb24gb2YgYGZuYCBhbmQgc3RvcmVzIHRoZW0gdG8gbGF0ZXIgYmUgcGFzc2VkIHdoZW4gYHNhdmUoKWAgaXMgZXhlY3V0ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcclxuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV0gdGhlIHNjb3BlIHdpdGggd2hpY2ggdG8gY2FsbCBmblxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQG1ldGhvZCAkX190cnlcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fdHJ5ID0gZnVuY3Rpb24gKGZuLCBzY29wZSkge1xyXG4gIHZhciByZXM7XHJcbiAgdHJ5IHtcclxuICAgIGZuLmNhbGwoc2NvcGUpO1xyXG4gICAgcmVzID0gdHJ1ZTtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICB0aGlzLiRfX2Vycm9yKGUpO1xyXG4gICAgcmVzID0gZmFsc2U7XHJcbiAgfVxyXG4gIHJldHVybiByZXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGUgbGlzdCBvZiBwYXRocyB0aGF0IGhhdmUgYmVlbiBtb2RpZmllZC5cclxuICpcclxuICogQHJldHVybiB7QXJyYXl9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUubW9kaWZpZWRQYXRocyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZGlyZWN0TW9kaWZpZWRQYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xyXG5cclxuICByZXR1cm4gZGlyZWN0TW9kaWZpZWRQYXRocy5yZWR1Y2UoZnVuY3Rpb24gKGxpc3QsIHBhdGgpIHtcclxuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcclxuICAgIHJldHVybiBsaXN0LmNvbmNhdChwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKGNoYWlucywgcGFydCwgaSkge1xyXG4gICAgICByZXR1cm4gY2hhaW5zLmNvbmNhdChwYXJ0cy5zbGljZSgwLCBpKS5jb25jYXQocGFydCkuam9pbignLicpKTtcclxuICAgIH0sIFtdKSk7XHJcbiAgfSwgW10pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGlzIGRvY3VtZW50IHdhcyBtb2RpZmllZCwgZWxzZSBmYWxzZS5cclxuICpcclxuICogSWYgYHBhdGhgIGlzIGdpdmVuLCBjaGVja3MgaWYgYSBwYXRoIG9yIGFueSBmdWxsIHBhdGggY29udGFpbmluZyBgcGF0aGAgYXMgcGFydCBvZiBpdHMgcGF0aCBjaGFpbiBoYXMgYmVlbiBtb2RpZmllZC5cclxuICpcclxuICogIyMjI0V4YW1wbGVcclxuICpcclxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcclxuICogICAgIGRvYy5pc01vZGlmaWVkKCkgICAgICAgICAgICAgICAgICAgIC8vIHRydWVcclxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMnKSAgICAgICAgIC8vIHRydWVcclxuICogICAgIGRvYy5pc01vZGlmaWVkKCdkb2N1bWVudHMuMC50aXRsZScpIC8vIHRydWVcclxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAgIC8vIGZhbHNlXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gb3B0aW9uYWxcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS5pc01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICByZXR1cm4gcGF0aFxyXG4gICAgPyAhIX50aGlzLm1vZGlmaWVkUGF0aHMoKS5pbmRleE9mKHBhdGgpXHJcbiAgICA6IHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnNvbWUoJ21vZGlmeScpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdHJ1ZSBpZiBgcGF0aGAgd2FzIGRpcmVjdGx5IHNldCBhbmQgbW9kaWZpZWQsIGVsc2UgZmFsc2UuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlXHJcbiAqXHJcbiAqICAgICBkb2Muc2V0KCdkb2N1bWVudHMuMC50aXRsZScsICdjaGFuZ2VkJyk7XHJcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXHJcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzJykgLy8gZmFsc2VcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS5pc0RpcmVjdE1vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLm1vZGlmeSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIGBwYXRoYCB3YXMgaW5pdGlhbGl6ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNJbml0ID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICByZXR1cm4gKHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBgcGF0aGAgd2FzIHNlbGVjdGVkIGluIHRoZSBzb3VyY2UgcXVlcnkgd2hpY2ggaW5pdGlhbGl6ZWQgdGhpcyBkb2N1bWVudC5cclxuICpcclxuICogIyMjI0V4YW1wbGVcclxuICpcclxuICogICAgIFRoaW5nLmZpbmRPbmUoKS5zZWxlY3QoJ25hbWUnKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xyXG4gKiAgICAgICAgZG9jLmlzU2VsZWN0ZWQoJ25hbWUnKSAvLyB0cnVlXHJcbiAqICAgICAgICBkb2MuaXNTZWxlY3RlZCgnYWdlJykgIC8vIGZhbHNlXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkRvY3VtZW50LnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gaXNTZWxlY3RlZCAocGF0aCkge1xyXG4gIGlmICh0aGlzLiRfXy5zZWxlY3RlZCkge1xyXG5cclxuICAgIGlmICgnX2lkJyA9PT0gcGF0aCkge1xyXG4gICAgICByZXR1cm4gMCAhPT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLnNlbGVjdGVkKVxyXG4gICAgICAsIGkgPSBwYXRocy5sZW5ndGhcclxuICAgICAgLCBpbmNsdXNpdmUgPSBmYWxzZVxyXG4gICAgICAsIGN1cjtcclxuXHJcbiAgICBpZiAoMSA9PT0gaSAmJiAnX2lkJyA9PT0gcGF0aHNbMF0pIHtcclxuICAgICAgLy8gb25seSBfaWQgd2FzIHNlbGVjdGVkLlxyXG4gICAgICByZXR1cm4gMCA9PT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgY3VyID0gcGF0aHNbaV07XHJcbiAgICAgIGlmICgnX2lkJyA9PSBjdXIpIGNvbnRpbnVlO1xyXG4gICAgICBpbmNsdXNpdmUgPSAhISB0aGlzLiRfXy5zZWxlY3RlZFtjdXJdO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGF0aCBpbiB0aGlzLiRfXy5zZWxlY3RlZCkge1xyXG4gICAgICByZXR1cm4gaW5jbHVzaXZlO1xyXG4gICAgfVxyXG5cclxuICAgIGkgPSBwYXRocy5sZW5ndGg7XHJcbiAgICB2YXIgcGF0aERvdCA9IHBhdGggKyAnLic7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICBjdXIgPSBwYXRoc1tpXTtcclxuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XHJcblxyXG4gICAgICBpZiAoMCA9PT0gY3VyLmluZGV4T2YocGF0aERvdCkpIHtcclxuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoMCA9PT0gcGF0aERvdC5pbmRleE9mKGN1ciArICcuJykpIHtcclxuICAgICAgICByZXR1cm4gaW5jbHVzaXZlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICEgaW5jbHVzaXZlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgcmVnaXN0ZXJlZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGlzIGRvY3VtZW50LlxyXG4gKlxyXG4gKiAjIyMjTm90ZTpcclxuICpcclxuICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIGBwcmVgIHNhdmUgYW5kIGlmIGEgdmFsaWRhdGlvbiBydWxlIGlzIHZpb2xhdGVkLCBbc2F2ZV0oI21vZGVsX01vZGVsLXNhdmUpIGlzIGFib3J0ZWQgYW5kIHRoZSBlcnJvciBpcyByZXR1cm5lZCB0byB5b3VyIGBjYWxsYmFja2AuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgaWYgKGVycikgaGFuZGxlRXJyb3IoZXJyKTtcclxuICogICAgICAgZWxzZSAvLyB2YWxpZGF0aW9uIHBhc3NlZFxyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxlZCBhZnRlciB2YWxpZGF0aW9uIGNvbXBsZXRlcywgcGFzc2luZyBhbiBlcnJvciBpZiBvbmUgb2NjdXJyZWRcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uIChjYikge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gb25seSB2YWxpZGF0ZSByZXF1aXJlZCBmaWVsZHMgd2hlbiBuZWNlc3NhcnlcclxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSkuZmlsdGVyKGZ1bmN0aW9uIChwYXRoKSB7XHJcbiAgICBpZiAoIXNlbGYuaXNTZWxlY3RlZChwYXRoKSAmJiAhc2VsZi5pc01vZGlmaWVkKHBhdGgpKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxuXHJcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmluaXQpKTtcclxuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KSk7XHJcbiAgcGF0aHMgPSBwYXRocy5jb25jYXQoT2JqZWN0LmtleXModGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpKTtcclxuXHJcbiAgaWYgKDAgPT09IHBhdGhzLmxlbmd0aCkge1xyXG4gICAgY29tcGxldGUoKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIHZhbGlkYXRpbmcgPSB7fVxyXG4gICAgLCB0b3RhbCA9IDA7XHJcblxyXG4gIHBhdGhzLmZvckVhY2godmFsaWRhdGVQYXRoKTtcclxuICByZXR1cm4gdGhpcztcclxuXHJcbiAgZnVuY3Rpb24gdmFsaWRhdGVQYXRoIChwYXRoKSB7XHJcbiAgICBpZiAodmFsaWRhdGluZ1twYXRoXSkgcmV0dXJuO1xyXG5cclxuICAgIHZhbGlkYXRpbmdbcGF0aF0gPSB0cnVlO1xyXG4gICAgdG90YWwrKztcclxuXHJcbiAgICB1dGlscy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKXtcclxuICAgICAgdmFyIHAgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xyXG4gICAgICBpZiAoIXApIHJldHVybiAtLXRvdGFsIHx8IGNvbXBsZXRlKCk7XHJcblxyXG4gICAgICB2YXIgdmFsID0gc2VsZi5nZXRWYWx1ZShwYXRoKTtcclxuICAgICAgcC5kb1ZhbGlkYXRlKHZhbCwgZnVuY3Rpb24gKGVycikge1xyXG4gICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgIHNlbGYuaW52YWxpZGF0ZShcclxuICAgICAgICAgICAgICBwYXRoXHJcbiAgICAgICAgICAgICwgZXJyXHJcbiAgICAgICAgICAgICwgdW5kZWZpbmVkXHJcbiAgICAgICAgICAgIC8vLCB0cnVlIC8vIGVtYmVkZGVkIGRvY3NcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xyXG4gICAgICB9LCBzZWxmKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY29tcGxldGUgKCkge1xyXG4gICAgdmFyIGVyciA9IHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvcjtcclxuICAgIHNlbGYuJF9fLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcclxuICAgIGNiICYmIGNiKGVycik7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cclxuICpcclxuICogVGhlIGBlcnJvck1zZ2AgYXJndW1lbnQgd2lsbCBiZWNvbWUgdGhlIG1lc3NhZ2Ugb2YgdGhlIGBWYWxpZGF0aW9uRXJyb3JgLlxyXG4gKlxyXG4gKiBUaGUgYHZhbHVlYCBhcmd1bWVudCAoaWYgcGFzc2VkKSB3aWxsIGJlIGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgVmFsaWRhdGlvbkVycm9yLnZhbHVlYCBwcm9wZXJ0eS5cclxuICpcclxuICogICAgIGRvYy5pbnZhbGlkYXRlKCdzaXplJywgJ211c3QgYmUgbGVzcyB0aGFuIDIwJywgMTQpO1xyXG5cclxuICogICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgIGNvbnNvbGUubG9nKGVycilcclxuICogICAgICAgLy8gcHJpbnRzXHJcbiAqICAgICAgIHsgbWVzc2FnZTogJ1ZhbGlkYXRpb24gZmFpbGVkJyxcclxuICogICAgICAgICBuYW1lOiAnVmFsaWRhdGlvbkVycm9yJyxcclxuICogICAgICAgICBlcnJvcnM6XHJcbiAqICAgICAgICAgIHsgc2l6ZTpcclxuICogICAgICAgICAgICAgeyBtZXNzYWdlOiAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLFxyXG4gKiAgICAgICAgICAgICAgIG5hbWU6ICdWYWxpZGF0b3JFcnJvcicsXHJcbiAqICAgICAgICAgICAgICAgcGF0aDogJ3NpemUnLFxyXG4gKiAgICAgICAgICAgICAgIHR5cGU6ICd1c2VyIGRlZmluZWQnLFxyXG4gKiAgICAgICAgICAgICAgIHZhbHVlOiAxNCB9IH0gfVxyXG4gKiAgICAgfSlcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcclxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVycm9yTXNnIHRoZSBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcclxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfE51bWJlcnxhbnl9IHZhbHVlIG9wdGlvbmFsIGludmFsaWQgdmFsdWVcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkRvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVycm9yTXNnLCB2YWx1ZSkge1xyXG4gIGlmICghdGhpcy4kX18udmFsaWRhdGlvbkVycm9yKSB7XHJcbiAgICB0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPSBuZXcgVmFsaWRhdGlvbkVycm9yKHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFlcnJvck1zZyB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIGVycm9yTXNnKSB7XHJcbiAgICBlcnJvck1zZyA9IG5ldyBWYWxpZGF0b3JFcnJvcihwYXRoLCBlcnJvck1zZywgJ3VzZXIgZGVmaW5lZCcsIHZhbHVlKTtcclxuICB9XHJcblxyXG4gIGlmICh0aGlzLiRfXy52YWxpZGF0aW9uRXJyb3IgPT0gZXJyb3JNc2cpIHJldHVybjtcclxuXHJcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yLmVycm9yc1twYXRoXSA9IGVycm9yTXNnO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlc2V0cyB0aGUgaW50ZXJuYWwgbW9kaWZpZWQgc3RhdGUgb2YgdGhpcyBkb2N1bWVudC5cclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxyXG4gKiBAbWV0aG9kICRfX3Jlc2V0XHJcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxyXG4gKi9cclxuXHJcbkRvY3VtZW50LnByb3RvdHlwZS4kX19yZXNldCA9IGZ1bmN0aW9uIHJlc2V0ICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzXHJcbiAgLm1hcCgnaW5pdCcsICdtb2RpZnknLCBmdW5jdGlvbiAoaSkge1xyXG4gICAgcmV0dXJuIHNlbGYuZ2V0VmFsdWUoaSk7XHJcbiAgfSlcclxuICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcclxuICAgIHJldHVybiB2YWwgJiYgdmFsLmlzU3RvcmFnZURvY3VtZW50QXJyYXkgJiYgdmFsLmxlbmd0aDtcclxuICB9KVxyXG4gIC5mb3JFYWNoKGZ1bmN0aW9uIChhcnJheSkge1xyXG4gICAgdmFyIGkgPSBhcnJheS5sZW5ndGg7XHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIHZhciBkb2MgPSBhcnJheVtpXTtcclxuICAgICAgaWYgKCFkb2MpIGNvbnRpbnVlO1xyXG4gICAgICBkb2MuJF9fcmVzZXQoKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8gQ2xlYXIgJ21vZGlmeScoJ2RpcnR5JykgY2FjaGVcclxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5jbGVhcignbW9kaWZ5Jyk7XHJcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xyXG4gIHRoaXMuZXJyb3JzID0gdW5kZWZpbmVkO1xyXG4gIC8vY29uc29sZS5sb2coIHNlbGYuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5yZXF1aXJlICk7XHJcbiAgLy9UT0RPOiDRgtGD0YJcclxuICB0aGlzLnNjaGVtYS5yZXF1aXJlZFBhdGhzKCkuZm9yRWFjaChmdW5jdGlvbiAocGF0aCkge1xyXG4gICAgc2VsZi4kX18uYWN0aXZlUGF0aHMucmVxdWlyZShwYXRoKTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhpcyBkb2N1bWVudHMgZGlydHkgcGF0aHMgLyB2YWxzLlxyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQG1ldGhvZCAkX19kaXJ0eVxyXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcclxuICovXHJcblxyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZGlydHkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB2YXIgYWxsID0gdGhpcy4kX18uYWN0aXZlUGF0aHMubWFwKCdtb2RpZnknLCBmdW5jdGlvbiAocGF0aCkge1xyXG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxyXG4gICAgICAgICAgICwgdmFsdWU6IHNlbGYuZ2V0VmFsdWUoIHBhdGggKVxyXG4gICAgICAgICAgICwgc2NoZW1hOiBzZWxmLiRfX3BhdGgoIHBhdGggKSB9O1xyXG4gIH0pO1xyXG5cclxuICAvLyBTb3J0IGRpcnR5IHBhdGhzIGluIGEgZmxhdCBoaWVyYXJjaHkuXHJcbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIHJldHVybiAoYS5wYXRoIDwgYi5wYXRoID8gLTEgOiAoYS5wYXRoID4gYi5wYXRoID8gMSA6IDApKTtcclxuICB9KTtcclxuXHJcbiAgLy8gSWdub3JlIFwiZm9vLmFcIiBpZiBcImZvb1wiIGlzIGRpcnR5IGFscmVhZHkuXHJcbiAgdmFyIG1pbmltYWwgPSBbXVxyXG4gICAgLCBsYXN0UGF0aFxyXG4gICAgLCB0b3A7XHJcblxyXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XHJcbiAgICBsYXN0UGF0aCA9IGl0ZW0ucGF0aCArICcuJztcclxuICAgIG1pbmltYWwucHVzaChpdGVtKTtcclxuICAgIHRvcCA9IGl0ZW07XHJcbiAgfSk7XHJcblxyXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcclxuICByZXR1cm4gbWluaW1hbDtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBDb21waWxlcyBzY2hlbWFzLlxyXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXHJcbiAqL1xyXG5mdW5jdGlvbiBjb21waWxlIChzZWxmLCB0cmVlLCBwcm90bywgcHJlZml4KSB7XHJcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxyXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcclxuICAgICwgbGltYlxyXG4gICAgLCBrZXk7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIGtleSA9IGtleXNbaV07XHJcbiAgICBsaW1iID0gdHJlZVtrZXldO1xyXG5cclxuICAgIGRlZmluZShzZWxmXHJcbiAgICAgICAgLCBrZXlcclxuICAgICAgICAsICgoJ09iamVjdCcgPT09IGxpbWIuY29uc3RydWN0b3IubmFtZVxyXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICYmICghbGltYi50eXBlIHx8IGxpbWIudHlwZS50eXBlKVxyXG4gICAgICAgICAgICAgICA/IGxpbWJcclxuICAgICAgICAgICAgICAgOiBudWxsKVxyXG4gICAgICAgICwgcHJvdG9cclxuICAgICAgICAsIHByZWZpeFxyXG4gICAgICAgICwga2V5cyk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBnZXRzIGRlc2NyaXB0b3JzIGZvciBhbGwgcHJvcGVydGllcyBvZiBgb2JqZWN0YFxyXG4vLyBtYWtlcyBhbGwgcHJvcGVydGllcyBub24tZW51bWVyYWJsZSB0byBtYXRjaCBwcmV2aW91cyBiZWhhdmlvciB0byAjMjIxMVxyXG5mdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iamVjdCkge1xyXG4gIHZhciByZXN1bHQgPSB7fTtcclxuXHJcbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xyXG4gICAgcmVzdWx0W2tleV0gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwga2V5KTtcclxuICAgIHJlc3VsdFtrZXldLmVudW1lcmFibGUgPSBmYWxzZTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLyohXHJcbiAqIERlZmluZXMgdGhlIGFjY2Vzc29yIG5hbWVkIHByb3Agb24gdGhlIGluY29taW5nIHByb3RvdHlwZS5cclxuICog0YLQsNC8INC20LUsINC/0L7Qu9GPINC00L7QutGD0LzQtdC90YLQsCDRgdC00LXQu9Cw0LXQvCDQvdCw0LHQu9GO0LTQsNC10LzRi9C80LhcclxuICovXHJcbmZ1bmN0aW9uIGRlZmluZSAoc2VsZiwgcHJvcCwgc3VicHJvcHMsIHByb3RvdHlwZSwgcHJlZml4LCBrZXlzKSB7XHJcbiAgcHJlZml4ID0gcHJlZml4IHx8ICcnO1xyXG4gIHZhciBwYXRoID0gKHByZWZpeCA/IHByZWZpeCArICcuJyA6ICcnKSArIHByb3A7XHJcblxyXG4gIGlmIChzdWJwcm9wcykge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvdHlwZSwgcHJvcCwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcclxuICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcclxuICAgICAgICAgICAgdGhpcy4kX18uZ2V0dGVycyA9IHt9O1xyXG5cclxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xyXG4gICAgICAgICAgICB2YXIgbmVzdGVkID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnModGhpcykpO1xyXG5cclxuICAgICAgICAgICAgLy8gc2F2ZSBzY29wZSBmb3IgbmVzdGVkIGdldHRlcnMvc2V0dGVyc1xyXG4gICAgICAgICAgICBpZiAoIXByZWZpeCkgbmVzdGVkLiRfXy5zY29wZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICAvLyBzaGFkb3cgaW5oZXJpdGVkIGdldHRlcnMgZnJvbSBzdWItb2JqZWN0cyBzb1xyXG4gICAgICAgICAgICAvLyB0aGluZy5uZXN0ZWQubmVzdGVkLm5lc3RlZC4uLiBkb2Vzbid0IG9jY3VyIChnaC0zNjYpXHJcbiAgICAgICAgICAgIHZhciBpID0gMFxyXG4gICAgICAgICAgICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBmb3IgKDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgLy8gb3Zlci13cml0ZSB0aGUgcGFyZW50cyBnZXR0ZXIgd2l0aG91dCB0cmlnZ2VyaW5nIGl0XHJcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5lc3RlZCwga2V5c1tpXSwge1xyXG4gICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSAgIC8vIEl0IGRvZXNuJ3Qgc2hvdyB1cC5cclxuICAgICAgICAgICAgICAgICwgd3JpdGFibGU6IHRydWUgICAgICAvLyBXZSBjYW4gc2V0IGl0IGxhdGVyLlxyXG4gICAgICAgICAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWUgIC8vIFdlIGNhbiBPYmplY3QuZGVmaW5lUHJvcGVydHkgYWdhaW4uXHJcbiAgICAgICAgICAgICAgICAsIHZhbHVlOiB1bmRlZmluZWQgICAgLy8gSXQgc2hhZG93cyBpdHMgcGFyZW50LlxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZXN0ZWQudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhdGgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29tcGlsZSggc2VsZiwgc3VicHJvcHMsIG5lc3RlZCwgcGF0aCApO1xyXG4gICAgICAgICAgICB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdID0gbmVzdGVkO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdO1xyXG4gICAgICAgIH1cclxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIERvY3VtZW50KSB2ID0gdi50b09iamVjdCgpO1xyXG4gICAgICAgICAgcmV0dXJuICh0aGlzLiRfXy5zY29wZSB8fCB0aGlzKS5zZXQoIHBhdGgsIHYgKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgfSBlbHNlIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggcHJvdG90eXBlLCBwcm9wLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxyXG4gICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCApIHsgcmV0dXJuIHRoaXMuZ2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCk7IH1cclxuICAgICAgLCBzZXQ6IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzLnNldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgsIHYpOyB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBzZWxmLmFkYXB0ZXJIb29rcy5kb2N1bWVudERlZmluZVByb3BlcnR5LmNhbGwoIHNlbGYsIHNlbGYsIHBhdGgsIHByb3RvdHlwZSApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEFzc2lnbnMvY29tcGlsZXMgYHNjaGVtYWAgaW50byB0aGlzIGRvY3VtZW50cyBwcm90b3R5cGUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fc2V0U2NoZW1hXHJcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSA9IGZ1bmN0aW9uICggc2NoZW1hICkge1xyXG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xyXG4gIGNvbXBpbGUoIHRoaXMsIHNjaGVtYS50cmVlLCB0aGlzICk7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGFsbCBzdWJkb2NzIChieSBiZnMpXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAbWV0aG9kICRfX2dldEFsbFN1YmRvY3NcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QWxsU3ViZG9jcyA9IGZ1bmN0aW9uICgpIHtcclxuICBEb2N1bWVudEFycmF5IHx8IChEb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi90eXBlcy9kb2N1bWVudGFycmF5JykpO1xyXG4gIEVtYmVkZGVkID0gRW1iZWRkZWQgfHwgcmVxdWlyZSgnLi90eXBlcy9lbWJlZGRlZCcpO1xyXG5cclxuICBmdW5jdGlvbiBkb2NSZWR1Y2VyKHNlZWQsIHBhdGgpIHtcclxuICAgIHZhciB2YWwgPSB0aGlzW3BhdGhdO1xyXG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIEVtYmVkZGVkKSBzZWVkLnB1c2godmFsKTtcclxuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5KVxyXG4gICAgICB2YWwuZm9yRWFjaChmdW5jdGlvbiBfZG9jUmVkdWNlKGRvYykge1xyXG4gICAgICAgIGlmICghZG9jIHx8ICFkb2MuX2RvYykgcmV0dXJuO1xyXG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKGRvYyk7XHJcbiAgICAgICAgc2VlZCA9IE9iamVjdC5rZXlzKGRvYy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKGRvYy5fZG9jKSwgc2VlZCk7XHJcbiAgICAgIH0pO1xyXG4gICAgcmV0dXJuIHNlZWQ7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKHRoaXMpLCBbXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSGFuZGxlIGdlbmVyaWMgc2F2ZSBzdHVmZi5cclxuICogdG8gc29sdmUgIzE0NDYgdXNlIHVzZSBoaWVyYXJjaHkgaW5zdGVhZCBvZiBob29rc1xyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQG1ldGhvZCAkX19wcmVzYXZlVmFsaWRhdGVcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcHJlc2F2ZVZhbGlkYXRlID0gZnVuY3Rpb24gJF9fcHJlc2F2ZVZhbGlkYXRlKCkge1xyXG4gIC8vIGlmIGFueSBkb2Muc2V0KCkgY2FsbHMgZmFpbGVkXHJcblxyXG4gIHZhciBkb2NzID0gdGhpcy4kX19nZXRBcnJheVBhdGhzVG9WYWxpZGF0ZSgpO1xyXG5cclxuICB2YXIgZTIgPSBkb2NzLm1hcChmdW5jdGlvbiAoZG9jKSB7XHJcbiAgICByZXR1cm4gZG9jLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xyXG4gIH0pO1xyXG4gIHZhciBlMSA9IFt0aGlzLiRfXy5zYXZlRXJyb3JdLmNvbmNhdChlMik7XHJcbiAgdmFyIGVyciA9IGUxLmZpbHRlcihmdW5jdGlvbiAoeCkge3JldHVybiB4fSlbMF07XHJcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gbnVsbDtcclxuXHJcbiAgcmV0dXJuIGVycjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgYWN0aXZlIHBhdGggdGhhdCB3ZXJlIGNoYW5nZWQgYW5kIGFyZSBhcnJheXNcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGVcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgRG9jdW1lbnRBcnJheSB8fCAoRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpKTtcclxuXHJcbiAgLy8gdmFsaWRhdGUgYWxsIGRvY3VtZW50IGFycmF5cy5cclxuICByZXR1cm4gdGhpcy4kX18uYWN0aXZlUGF0aHNcclxuICAgIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0VmFsdWUoaSk7XHJcbiAgICB9LmJpbmQodGhpcykpXHJcbiAgICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgcmV0dXJuIHZhbCAmJiB2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5ICYmIHZhbC5sZW5ndGg7XHJcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24oc2VlZCwgYXJyYXkpIHtcclxuICAgICAgcmV0dXJuIHNlZWQuY29uY2F0KGFycmF5KTtcclxuICAgIH0sIFtdKVxyXG4gICAgLmZpbHRlcihmdW5jdGlvbiAoZG9jKSB7cmV0dXJuIGRvY30pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVycyBhbiBlcnJvclxyXG4gKlxyXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fZXJyb3JcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gZXJyO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFByb2R1Y2VzIGEgc3BlY2lhbCBxdWVyeSBkb2N1bWVudCBvZiB0aGUgbW9kaWZpZWQgcHJvcGVydGllcyB1c2VkIGluIHVwZGF0ZXMuXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAbWV0aG9kICRfX2RlbHRhXHJcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2RlbHRhID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBkaXJ0eSA9IHRoaXMuJF9fZGlydHkoKTtcclxuXHJcbiAgdmFyIGRlbHRhID0ge31cclxuICAgICwgbGVuID0gZGlydHkubGVuZ3RoXHJcbiAgICAsIGQgPSAwO1xyXG5cclxuICBmb3IgKDsgZCA8IGxlbjsgKytkKSB7XHJcbiAgICB2YXIgZGF0YSA9IGRpcnR5WyBkIF07XHJcbiAgICB2YXIgdmFsdWUgPSBkYXRhLnZhbHVlO1xyXG5cclxuICAgIHZhbHVlID0gdXRpbHMuY2xvbmUodmFsdWUsIHsgZGVwb3B1bGF0ZTogMSB9KTtcclxuICAgIGRlbHRhWyBkYXRhLnBhdGggXSA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGRlbHRhO1xyXG59O1xyXG5cclxuRG9jdW1lbnQucHJvdG90eXBlLiRfX2hhbmRsZVNhdmUgPSBmdW5jdGlvbigpe1xyXG4gIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YDQtdGB0YPRgNGBINC60L7Qu9C70LXQutGG0LjQuCwg0LrRg9C00LAg0LHRg9C00LXQvCDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LTQsNC90L3Ri9C1XHJcbiAgdmFyIHJlc291cmNlO1xyXG4gIGlmICggdGhpcy5jb2xsZWN0aW9uICl7XHJcbiAgICByZXNvdXJjZSA9IHRoaXMuY29sbGVjdGlvbi5hcGk7XHJcbiAgfVxyXG5cclxuICB2YXIgaW5uZXJQcm9taXNlID0gbmV3ICQuRGVmZXJyZWQoKTtcclxuXHJcbiAgaWYgKCB0aGlzLmlzTmV3ICkge1xyXG4gICAgLy8gc2VuZCBlbnRpcmUgZG9jXHJcbiAgICB2YXIgb2JqID0gdGhpcy50b09iamVjdCh7IGRlcG9wdWxhdGU6IDEgfSk7XHJcblxyXG4gICAgaWYgKCAoIG9iaiB8fCB7fSApLmhhc093blByb3BlcnR5KCdfaWQnKSA9PT0gZmFsc2UgKSB7XHJcbiAgICAgIC8vIGRvY3VtZW50cyBtdXN0IGhhdmUgYW4gX2lkIGVsc2UgbW9uZ29vc2Ugd29uJ3Qga25vd1xyXG4gICAgICAvLyB3aGF0IHRvIHVwZGF0ZSBsYXRlciBpZiBtb3JlIGNoYW5nZXMgYXJlIG1hZGUuIHRoZSB1c2VyXHJcbiAgICAgIC8vIHdvdWxkbid0IGtub3cgd2hhdCBfaWQgd2FzIGdlbmVyYXRlZCBieSBtb25nb2RiIGVpdGhlclxyXG4gICAgICAvLyBub3Igd291bGQgdGhlIE9iamVjdElkIGdlbmVyYXRlZCBteSBtb25nb2RiIG5lY2Vzc2FyaWx5XHJcbiAgICAgIC8vIG1hdGNoIHRoZSBzY2hlbWEgZGVmaW5pdGlvbi5cclxuICAgICAgaW5uZXJQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ2RvY3VtZW50IG11c3QgaGF2ZSBhbiBfaWQgYmVmb3JlIHNhdmluZycpKTtcclxuICAgICAgcmV0dXJuIGlubmVyUHJvbWlzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxyXG4gICAgLy8g0KXQvtGC0Y8g0LzQvtC20L3QviDRgtCw0LrQuNC8INC+0LHRgNCw0LfQvtC8INC/0YDQvtGB0YLQviDQtNC10LvQsNGC0Ywg0LLQsNC70LjQtNCw0YbQuNGOLCDQtNCw0LbQtSDQtdGB0LvQuCDQvdC10YIg0LrQvtC70LvQtdC60YbQuNC4INC40LvQuCBhcGlcclxuICAgIGlmICggIXJlc291cmNlICl7XHJcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXNvdXJjZS5jcmVhdGUoIG9iaiApLmFsd2F5cyggaW5uZXJQcm9taXNlLnJlc29sdmUgKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRfX3Jlc2V0KCk7XHJcbiAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XHJcbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xyXG4gICAgLy8gTWFrZSBpdCBwb3NzaWJsZSB0byByZXRyeSB0aGUgaW5zZXJ0XHJcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSB0cnVlO1xyXG5cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHRyZWF0IGl0IGFzIGEgbmV3IG9iamVjdCBvbiBlcnJvcixcclxuICAgIC8vIHNpbmNlIGl0IGFscmVhZHkgZXhpc3RzXHJcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICB2YXIgZGVsdGEgPSB0aGlzLiRfX2RlbHRhKCk7XHJcblxyXG4gICAgaWYgKCAhXy5pc0VtcHR5KCBkZWx0YSApICkge1xyXG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XHJcbiAgICAgIC8vINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQvtC60YDRg9C20LXQvdC40LUg0YLQtdGB0YLQvtCyXHJcbiAgICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXHJcbiAgICAgIGlmICggIXJlc291cmNlICl7XHJcbiAgICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXNvdXJjZSggdGhpcy5pZCApLnVwZGF0ZSggZGVsdGEgKS5hbHdheXMoIGlubmVyUHJvbWlzZS5yZXNvbHZlICk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuJF9fcmVzZXQoKTtcclxuICAgICAgaW5uZXJQcm9taXNlLnJlc29sdmUoIHRoaXMgKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRyaWdnZXIoJ2lzTmV3JywgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGlubmVyUHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAZGVzY3JpcHRpb24gU2F2ZXMgdGhpcyBkb2N1bWVudC5cclxuICpcclxuICogQGV4YW1wbGU6XHJcbiAqXHJcbiAqICAgICBwcm9kdWN0LnNvbGQgPSBEYXRlLm5vdygpO1xyXG4gKiAgICAgcHJvZHVjdC5zYXZlKGZ1bmN0aW9uIChlcnIsIHByb2R1Y3QsIG51bWJlckFmZmVjdGVkKSB7XHJcbiAqICAgICAgIGlmIChlcnIpIC4uXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSB0aHJlZSBwYXJhbWV0ZXJzLCBgZXJyYCBpZiBhbiBlcnJvciBvY2N1cnJlZCwgYHByb2R1Y3RgIHdoaWNoIGlzIHRoZSBzYXZlZCBgcHJvZHVjdGAsIGFuZCBgbnVtYmVyQWZmZWN0ZWRgIHdoaWNoIHdpbGwgYmUgMSB3aGVuIHRoZSBkb2N1bWVudCB3YXMgZm91bmQgYW5kIHVwZGF0ZWQgaW4gdGhlIGRhdGFiYXNlLCBvdGhlcndpc2UgMC5cclxuICpcclxuICogVGhlIGBmbmAgY2FsbGJhY2sgaXMgb3B0aW9uYWwuIElmIG5vIGBmbmAgaXMgcGFzc2VkIGFuZCB2YWxpZGF0aW9uIGZhaWxzLCB0aGUgdmFsaWRhdGlvbiBlcnJvciB3aWxsIGJlIGVtaXR0ZWQgb24gdGhlIGNvbm5lY3Rpb24gdXNlZCB0byBjcmVhdGUgdGhpcyBtb2RlbC5cclxuICogQGV4YW1wbGU6XHJcbiAqICAgICB2YXIgZGIgPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcclxuICogICAgIHZhciBQcm9kdWN0ID0gZGIubW9kZWwoJ1Byb2R1Y3QnLCBzY2hlbWEpO1xyXG4gKlxyXG4gKiAgICAgZGIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gSG93ZXZlciwgaWYgeW91IGRlc2lyZSBtb3JlIGxvY2FsIGVycm9yIGhhbmRsaW5nIHlvdSBjYW4gYWRkIGFuIGBlcnJvcmAgbGlzdGVuZXIgdG8gdGhlIG1vZGVsIGFuZCBoYW5kbGUgZXJyb3JzIHRoZXJlIGluc3RlYWQuXHJcbiAqIEBleGFtcGxlOlxyXG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiBBcyBhbiBleHRyYSBtZWFzdXJlIG9mIGZsb3cgY29udHJvbCwgc2F2ZSB3aWxsIHJldHVybiBhIFByb21pc2UgKGJvdW5kIHRvIGBmbmAgaWYgcGFzc2VkKSBzbyBpdCBjb3VsZCBiZSBjaGFpbmVkLCBvciBob29rIHRvIHJlY2l2ZSBlcnJvcnNcclxuICogQGV4YW1wbGU6XHJcbiAqICAgICBwcm9kdWN0LnNhdmUoKS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0LCBudW1iZXJBZmZlY3RlZCkge1xyXG4gKiAgICAgICAgLi4uXHJcbiAqICAgICB9KS5vblJlamVjdGVkKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgIGFzc2VydC5vayhlcnIpXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGVyciwgcHJvZHVjdCwgTnVtYmVyKX0gW2RvbmVdIG9wdGlvbmFsIGNhbGxiYWNrXHJcbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2VcclxuICogQGFwaSBwdWJsaWNcclxuICogQHNlZSBtaWRkbGV3YXJlIGh0dHA6Ly9tb25nb29zZWpzLmNvbS9kb2NzL21pZGRsZXdhcmUuaHRtbFxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoIGRvbmUgKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHZhciBmaW5hbFByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpLmRvbmUoIGRvbmUgKTtcclxuXHJcbiAgLy8g0KHQvtGF0YDQsNC90Y/RgtGMINC00L7QutGD0LzQtdC90YIg0LzQvtC20L3QviDRgtC+0LvRjNC60L4g0LXRgdC70Lgg0L7QvSDQvdCw0YXQvtC00LjRgtGB0Y8g0LIg0LrQvtC70LvQtdC60YbQuNC4XHJcbiAgaWYgKCAhdGhpcy5jb2xsZWN0aW9uICl7XHJcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBhcmd1bWVudHMgKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0RvY3VtZW50LnNhdmUgYXBpIGhhbmRsZSBpcyBub3QgaW1wbGVtZW50ZWQuJyk7XHJcbiAgICByZXR1cm4gZmluYWxQcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgZm9yIHByZVNhdmUgZXJyb3JzICjRgtC+0YfQviDQt9C90LDRjiwg0YfRgtC+INC+0L3QsCDQv9GA0L7QstC10YDRj9C10YIg0L7RiNC40LHQutC4INCyINC80LDRgdGB0LjQstCw0YUgKENhc3RFcnJvcikpXHJcbiAgdmFyIHByZVNhdmVFcnIgPSBzZWxmLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xyXG4gIGlmICggcHJlU2F2ZUVyciApIHtcclxuICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIHByZVNhdmVFcnIgKTtcclxuICAgIHJldHVybiBmaW5hbFByb21pc2U7XHJcbiAgfVxyXG5cclxuICAvLyBWYWxpZGF0ZVxyXG4gIHZhciBwMCA9IG5ldyAkLkRlZmVycmVkKCk7XHJcbiAgc2VsZi52YWxpZGF0ZShmdW5jdGlvbiggZXJyICl7XHJcbiAgICBpZiAoIGVyciApe1xyXG4gICAgICBwMC5yZWplY3QoIGVyciApO1xyXG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHAwLnJlc29sdmUoKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8g0KHQvdCw0YfQsNC70LAg0L3QsNC00L4g0YHQvtGF0YDQsNC90LjRgtGMINCy0YHQtSDQv9C+0LTQtNC+0LrRg9C80LXQvdGC0Ysg0Lgg0YHQtNC10LvQsNGC0YwgcmVzb2x2ZSEhIVxyXG4gIC8vIENhbGwgc2F2ZSBob29rcyBvbiBzdWJkb2NzXHJcbiAgdmFyIHN1YkRvY3MgPSBzZWxmLiRfX2dldEFsbFN1YmRvY3MoKTtcclxuICB2YXIgd2hlbkNvbmQgPSBzdWJEb2NzLm1hcChmdW5jdGlvbiAoZCkge3JldHVybiBkLnNhdmUoKTt9KTtcclxuICB3aGVuQ29uZC5wdXNoKCBwMCApO1xyXG5cclxuICAvLyDQotCw0Log0LzRiyDQv9C10YDQtdC00LDRkdC8INC80LDRgdGB0LjQsiBwcm9taXNlINGD0YHQu9C+0LLQuNC5XHJcbiAgdmFyIHAxID0gJC53aGVuLmFwcGx5KCAkLCB3aGVuQ29uZCApO1xyXG5cclxuICAvLyBIYW5kbGUgc2F2ZSBhbmQgcmVzdWx0c1xyXG4gIHAxXHJcbiAgICAudGhlbiggdGhpcy4kX19oYW5kbGVTYXZlLmJpbmQoIHRoaXMgKSApXHJcbiAgICAudGhlbihmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gZmluYWxQcm9taXNlLnJlc29sdmUoIHNlbGYgKTtcclxuICAgIH0sIGZ1bmN0aW9uICggZXJyICkge1xyXG4gICAgICAvLyBJZiB0aGUgaW5pdGlhbCBpbnNlcnQgZmFpbHMgcHJvdmlkZSBhIHNlY29uZCBjaGFuY2UuXHJcbiAgICAgIC8vIChJZiB3ZSBkaWQgdGhpcyBhbGwgdGhlIHRpbWUgd2Ugd291bGQgYnJlYWsgdXBkYXRlcylcclxuICAgICAgaWYgKHNlbGYuJF9fLmluc2VydGluZykge1xyXG4gICAgICAgIHNlbGYuaXNOZXcgPSB0cnVlO1xyXG4gICAgICAgIHNlbGYuZW1pdCgnaXNOZXcnLCB0cnVlKTtcclxuICAgICAgfVxyXG4gICAgICBmaW5hbFByb21pc2UucmVqZWN0KCBlcnIgKTtcclxuICAgIH0pO1xyXG5cclxuICByZXR1cm4gZmluYWxQcm9taXNlO1xyXG59O1xyXG5cclxuLypmdW5jdGlvbiBhbGwgKHByb21pc2VPZkFycikge1xyXG4gIHZhciBwUmV0ID0gbmV3IFByb21pc2U7XHJcbiAgdGhpcy50aGVuKHByb21pc2VPZkFycikudGhlbihcclxuICAgIGZ1bmN0aW9uIChwcm9taXNlQXJyKSB7XHJcbiAgICAgIHZhciBjb3VudCA9IDA7XHJcbiAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgdmFyIGVyclNlbnRpbmVsO1xyXG4gICAgICBpZiAoIXByb21pc2VBcnIubGVuZ3RoKSBwUmV0LnJlc29sdmUoKTtcclxuICAgICAgcHJvbWlzZUFyci5mb3JFYWNoKGZ1bmN0aW9uIChwcm9taXNlLCBpbmRleCkge1xyXG4gICAgICAgIGlmIChlcnJTZW50aW5lbCkgcmV0dXJuO1xyXG4gICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgcHJvbWlzZS50aGVuKFxyXG4gICAgICAgICAgZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcclxuICAgICAgICAgICAgcmV0W2luZGV4XSA9IHZhbDtcclxuICAgICAgICAgICAgLS1jb3VudDtcclxuICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHBSZXQuZnVsZmlsbChyZXQpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XHJcbiAgICAgICAgICAgIGVyclNlbnRpbmVsID0gZXJyO1xyXG4gICAgICAgICAgICBwUmV0LnJlamVjdChlcnIpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gcFJldDtcclxuICAgIH1cclxuICAgICwgcFJldC5yZWplY3QuYmluZChwUmV0KVxyXG4gICk7XHJcbiAgcmV0dXJuIHBSZXQ7XHJcbn0qL1xyXG5cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGRvY3VtZW50IGludG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCwgcmVhZHkgZm9yIHN0b3JhZ2UgaW4gTW9uZ29EQi5cclxuICpcclxuICogQnVmZmVycyBhcmUgY29udmVydGVkIHRvIGluc3RhbmNlcyBvZiBbbW9uZ29kYi5CaW5hcnldKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5jb20vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvYmluYXJ5Lmh0bWwpIGZvciBwcm9wZXIgc3RvcmFnZS5cclxuICpcclxuICogIyMjI09wdGlvbnM6XHJcbiAqXHJcbiAqIC0gYGdldHRlcnNgIGFwcGx5IGFsbCBnZXR0ZXJzIChwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnMpXHJcbiAqIC0gYHZpcnR1YWxzYCBhcHBseSB2aXJ0dWFsIGdldHRlcnMgKGNhbiBvdmVycmlkZSBgZ2V0dGVyc2Agb3B0aW9uKVxyXG4gKiAtIGBtaW5pbWl6ZWAgcmVtb3ZlIGVtcHR5IG9iamVjdHMgKGRlZmF1bHRzIHRvIHRydWUpXHJcbiAqIC0gYHRyYW5zZm9ybWAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gdGhlIHJlc3VsdGluZyBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nXHJcbiAqXHJcbiAqICMjIyNHZXR0ZXJzL1ZpcnR1YWxzXHJcbiAqXHJcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyBwYXRoIGdldHRlcnNcclxuICpcclxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUsIHZpcnR1YWxzOiBmYWxzZSB9KVxyXG4gKlxyXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgdmlydHVhbCBnZXR0ZXJzXHJcbiAqXHJcbiAqICAgICBkb2MudG9PYmplY3QoeyB2aXJ0dWFsczogdHJ1ZSB9KVxyXG4gKlxyXG4gKiBFeGFtcGxlIG9mIGFwcGx5aW5nIGJvdGggcGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzXHJcbiAqXHJcbiAqICAgICBkb2MudG9PYmplY3QoeyBnZXR0ZXJzOiB0cnVlIH0pXHJcbiAqXHJcbiAqIFRvIGFwcGx5IHRoZXNlIG9wdGlvbnMgdG8gZXZlcnkgZG9jdW1lbnQgb2YgeW91ciBzY2hlbWEgYnkgZGVmYXVsdCwgc2V0IHlvdXIgW3NjaGVtYXNdKCNzY2hlbWFfU2NoZW1hKSBgdG9PYmplY3RgIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cclxuICpcclxuICogICAgIHNjaGVtYS5zZXQoJ3RvT2JqZWN0JywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxyXG4gKlxyXG4gKiAjIyMjVHJhbnNmb3JtXHJcbiAqXHJcbiAqIFdlIG1heSBuZWVkIHRvIHBlcmZvcm0gYSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgcmVzdWx0aW5nIG9iamVjdCBiYXNlZCBvbiBzb21lIGNyaXRlcmlhLCBzYXkgdG8gcmVtb3ZlIHNvbWUgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIG9yIHJldHVybiBhIGN1c3RvbSBvYmplY3QuIEluIHRoaXMgY2FzZSB3ZSBzZXQgdGhlIG9wdGlvbmFsIGB0cmFuc2Zvcm1gIGZ1bmN0aW9uLlxyXG4gKlxyXG4gKiBUcmFuc2Zvcm0gZnVuY3Rpb25zIHJlY2VpdmUgdGhyZWUgYXJndW1lbnRzXHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHt9XHJcbiAqXHJcbiAqIC0gYGRvY2AgVGhlIG1vbmdvb3NlIGRvY3VtZW50IHdoaWNoIGlzIGJlaW5nIGNvbnZlcnRlZFxyXG4gKiAtIGByZXRgIFRoZSBwbGFpbiBvYmplY3QgcmVwcmVzZW50YXRpb24gd2hpY2ggaGFzIGJlZW4gY29udmVydGVkXHJcbiAqIC0gYG9wdGlvbnNgIFRoZSBvcHRpb25zIGluIHVzZSAoZWl0aGVyIHNjaGVtYSBvcHRpb25zIG9yIHRoZSBvcHRpb25zIHBhc3NlZCBpbmxpbmUpXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlXHJcbiAqXHJcbiAqICAgICAvLyBzcGVjaWZ5IHRoZSB0cmFuc2Zvcm0gc2NoZW1hIG9wdGlvblxyXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcclxuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xyXG4gKiAgICAgICAvLyByZW1vdmUgdGhlIF9pZCBvZiBldmVyeSBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nIHRoZSByZXN1bHRcclxuICogICAgICAgZGVsZXRlIHJldC5faWQ7XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXHJcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XHJcbiAqXHJcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxyXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XHJcbiAqXHJcbiAqIFdpdGggdHJhbnNmb3JtYXRpb25zIHdlIGNhbiBkbyBhIGxvdCBtb3JlIHRoYW4gcmVtb3ZlIHByb3BlcnRpZXMuIFdlIGNhbiBldmVuIHJldHVybiBjb21wbGV0ZWx5IG5ldyBjdXN0b21pemVkIG9iamVjdHM6XHJcbiAqXHJcbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xyXG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGRvYywgcmV0LCBvcHRpb25zKSB7XHJcbiAqICAgICAgIHJldHVybiB7IG1vdmllOiByZXQubmFtZSB9XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXHJcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XHJcbiAqXHJcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxyXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbW92aWU6ICdXcmVjay1pdCBSYWxwaCcgfVxyXG4gKlxyXG4gKiBfTm90ZTogaWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBgdW5kZWZpbmVkYCwgdGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuX1xyXG4gKlxyXG4gKiBUcmFuc2Zvcm1hdGlvbnMgbWF5IGFsc28gYmUgYXBwbGllZCBpbmxpbmUsIG92ZXJyaWRkaW5nIGFueSB0cmFuc2Zvcm0gc2V0IGluIHRoZSBvcHRpb25zOlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24geGZvcm0gKGRvYywgcmV0LCBvcHRpb25zKSB7XHJcbiAqICAgICAgIHJldHVybiB7IGlubGluZTogcmV0Lm5hbWUsIGN1c3RvbTogdHJ1ZSB9XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICAvLyBwYXNzIHRoZSB0cmFuc2Zvcm0gYXMgYW4gaW5saW5lIG9wdGlvblxyXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdHJhbnNmb3JtOiB4Zm9ybSB9KTsgLy8geyBpbmxpbmU6ICdXcmVjay1pdCBSYWxwaCcsIGN1c3RvbTogdHJ1ZSB9XHJcbiAqXHJcbiAqIF9Ob3RlOiBpZiB5b3UgY2FsbCBgdG9PYmplY3RgIGFuZCBwYXNzIGFueSBvcHRpb25zLCB0aGUgdHJhbnNmb3JtIGRlY2xhcmVkIGluIHlvdXIgc2NoZW1hIG9wdGlvbnMgd2lsbCBfX25vdF9fIGJlIGFwcGxpZWQuIFRvIGZvcmNlIGl0cyBhcHBsaWNhdGlvbiBwYXNzIGB0cmFuc2Zvcm06IHRydWVgX1xyXG4gKlxyXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcclxuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LmhpZGUgPSAnX2lkJztcclxuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xyXG4gKiAgICAgICBpZiAob3B0aW9ucy5oaWRlKSB7XHJcbiAqICAgICAgICAgb3B0aW9ucy5oaWRlLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xyXG4gKiAgICAgICAgICAgZGVsZXRlIHJldFtwcm9wXTtcclxuICogICAgICAgICB9KTtcclxuICogICAgICAgfVxyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgdmFyIGRvYyA9IG5ldyBEb2MoeyBfaWQ6ICdhbklkJywgc2VjcmV0OiA0NywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9KTtcclxuICogICAgIGRvYy50b09iamVjdCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7IHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxyXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnIH0pOyAgICAgICAgICAgICAgICAgIC8vIHsgX2lkOiAnYW5JZCcsIHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxyXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgaGlkZTogJ3NlY3JldCBfaWQnLCB0cmFuc2Zvcm06IHRydWUgfSk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XHJcbiAqXHJcbiAqIFRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IF9hbmQgZWFjaCBvZiBpdHMgc3ViLWRvY3VtZW50c18uIFRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB5b3UgYXJlIGN1cnJlbnRseSBvcGVyYXRpbmcgb24gYSBzdWItZG9jdW1lbnQgeW91IG1pZ2h0IHVzZSB0aGUgZm9sbG93aW5nIGd1YXJkOlxyXG4gKlxyXG4gKiAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRvYy5vd25lckRvY3VtZW50KSB7XHJcbiAqICAgICAgIC8vIHdvcmtpbmcgd2l0aCBhIHN1YiBkb2NcclxuICogICAgIH1cclxuICpcclxuICogVHJhbnNmb3JtcywgbGlrZSBhbGwgb2YgdGhlc2Ugb3B0aW9ucywgYXJlIGFsc28gYXZhaWxhYmxlIGZvciBgdG9KU09OYC5cclxuICpcclxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgZm9yIHNvbWUgbW9yZSBkZXRhaWxzLlxyXG4gKlxyXG4gKiBfRHVyaW5nIHNhdmUsIG5vIGN1c3RvbSBvcHRpb25zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBiZWZvcmUgYmVpbmcgc2VudCB0byB0aGUgZGF0YWJhc2UuX1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXHJcbiAqIEByZXR1cm4ge09iamVjdH0ganMgb2JqZWN0XHJcbiAqIEBzZWUgbW9uZ29kYi5CaW5hcnkgaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbFxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlcG9wdWxhdGUgJiYgdGhpcy4kX18ud2FzUG9wdWxhdGVkKSB7XHJcbiAgICAvLyBwb3B1bGF0ZWQgcGF0aHMgdGhhdCB3ZSBzZXQgdG8gYSBkb2N1bWVudFxyXG4gICAgcmV0dXJuIHV0aWxzLmNsb25lKHRoaXMuX2lkLCBvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIC8vIFdoZW4gaW50ZXJuYWxseSBzYXZpbmcgdGhpcyBkb2N1bWVudCB3ZSBhbHdheXMgcGFzcyBvcHRpb25zLFxyXG4gIC8vIGJ5cGFzc2luZyB0aGUgY3VzdG9tIHNjaGVtYSBvcHRpb25zLlxyXG4gIHZhciBvcHRpb25zUGFyYW1ldGVyID0gb3B0aW9ucztcclxuICBpZiAoIShvcHRpb25zICYmICdPYmplY3QnID09IG9wdGlvbnMuY29uc3RydWN0b3IubmFtZSkgfHxcclxuICAgIChvcHRpb25zICYmIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMpKSB7XHJcbiAgICBvcHRpb25zID0gdGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdFxyXG4gICAgICA/IGNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpXHJcbiAgICAgIDoge307XHJcbiAgfVxyXG5cclxuICBpZiAoIG9wdGlvbnMubWluaW1pemUgPT09IHVuZGVmaW5lZCApe1xyXG4gICAgb3B0aW9ucy5taW5pbWl6ZSA9IHRoaXMuc2NoZW1hLm9wdGlvbnMubWluaW1pemU7XHJcbiAgfVxyXG5cclxuICBpZiAoIW9wdGlvbnNQYXJhbWV0ZXIpIHtcclxuICAgIG9wdGlvbnMuX3VzZVNjaGVtYU9wdGlvbnMgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgdmFyIHJldCA9IHV0aWxzLmNsb25lKHRoaXMuX2RvYywgb3B0aW9ucyk7XHJcblxyXG4gIGlmIChvcHRpb25zLnZpcnR1YWxzIHx8IG9wdGlvbnMuZ2V0dGVycyAmJiBmYWxzZSAhPT0gb3B0aW9ucy52aXJ0dWFscykge1xyXG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3ZpcnR1YWxzJywgb3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICBpZiAob3B0aW9ucy5nZXR0ZXJzKSB7XHJcbiAgICBhcHBseUdldHRlcnModGhpcywgcmV0LCAncGF0aHMnLCBvcHRpb25zKTtcclxuICAgIC8vIGFwcGx5R2V0dGVycyBmb3IgcGF0aHMgd2lsbCBhZGQgbmVzdGVkIGVtcHR5IG9iamVjdHM7XHJcbiAgICAvLyBpZiBtaW5pbWl6ZSBpcyBzZXQsIHdlIG5lZWQgdG8gcmVtb3ZlIHRoZW0uXHJcbiAgICBpZiAob3B0aW9ucy5taW5pbWl6ZSkge1xyXG4gICAgICByZXQgPSBtaW5pbWl6ZShyZXQpIHx8IHt9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gSW4gdGhlIGNhc2Ugd2hlcmUgYSBzdWJkb2N1bWVudCBoYXMgaXRzIG93biB0cmFuc2Zvcm0gZnVuY3Rpb24sIHdlIG5lZWQgdG9cclxuICAvLyBjaGVjayBhbmQgc2VlIGlmIHRoZSBwYXJlbnQgaGFzIGEgdHJhbnNmb3JtIChvcHRpb25zLnRyYW5zZm9ybSkgYW5kIGlmIHRoZVxyXG4gIC8vIGNoaWxkIHNjaGVtYSBoYXMgYSB0cmFuc2Zvcm0gKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIEluIHRoaXMgY2FzZSxcclxuICAvLyB3ZSBuZWVkIHRvIGFkanVzdCBvcHRpb25zLnRyYW5zZm9ybSB0byBiZSB0aGUgY2hpbGQgc2NoZW1hJ3MgdHJhbnNmb3JtIGFuZFxyXG4gIC8vIG5vdCB0aGUgcGFyZW50IHNjaGVtYSdzXHJcbiAgaWYgKHRydWUgPT09IG9wdGlvbnMudHJhbnNmb3JtIHx8XHJcbiAgICAgICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ICYmIG9wdGlvbnMudHJhbnNmb3JtKSkge1xyXG4gICAgdmFyIG9wdHMgPSBvcHRpb25zLmpzb25cclxuICAgICAgPyB0aGlzLnNjaGVtYS5vcHRpb25zLnRvSlNPTlxyXG4gICAgICA6IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XHJcbiAgICBpZiAob3B0cykge1xyXG4gICAgICBvcHRpb25zLnRyYW5zZm9ybSA9IG9wdHMudHJhbnNmb3JtO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9wdGlvbnMudHJhbnNmb3JtKSB7XHJcbiAgICB2YXIgeGZvcm1lZCA9IG9wdGlvbnMudHJhbnNmb3JtKHRoaXMsIHJldCwgb3B0aW9ucyk7XHJcbiAgICBpZiAoJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIHhmb3JtZWQpIHJldCA9IHhmb3JtZWQ7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmV0O1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1pbmltaXplcyBhbiBvYmplY3QsIHJlbW92aW5nIHVuZGVmaW5lZCB2YWx1ZXMgYW5kIGVtcHR5IG9iamVjdHNcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCB0byBtaW5pbWl6ZVxyXG4gKiBAcmV0dXJuIHtPYmplY3R9XHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gbWluaW1pemUgKG9iaikge1xyXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxyXG4gICAgLCBpID0ga2V5cy5sZW5ndGhcclxuICAgICwgaGFzS2V5c1xyXG4gICAgLCBrZXlcclxuICAgICwgdmFsO1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICBrZXkgPSBrZXlzW2ldO1xyXG4gICAgdmFsID0gb2JqW2tleV07XHJcblxyXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3QodmFsKSApIHtcclxuICAgICAgb2JqW2tleV0gPSBtaW5pbWl6ZSh2YWwpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh1bmRlZmluZWQgPT09IG9ialtrZXldKSB7XHJcbiAgICAgIGRlbGV0ZSBvYmpba2V5XTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgaGFzS2V5cyA9IHRydWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaGFzS2V5c1xyXG4gICAgPyBvYmpcclxuICAgIDogdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKiFcclxuICogQXBwbGllcyB2aXJ0dWFscyBwcm9wZXJ0aWVzIHRvIGBqc29uYC5cclxuICpcclxuICogQHBhcmFtIHtEb2N1bWVudH0gc2VsZlxyXG4gKiBAcGFyYW0ge09iamVjdH0ganNvblxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBlaXRoZXIgYHZpcnR1YWxzYCBvciBgcGF0aHNgXHJcbiAqIEByZXR1cm4ge09iamVjdH0gYGpzb25gXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gYXBwbHlHZXR0ZXJzIChzZWxmLCBqc29uLCB0eXBlLCBvcHRpb25zKSB7XHJcbiAgdmFyIHNjaGVtYSA9IHNlbGYuc2NoZW1hXHJcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoc2NoZW1hW3R5cGVdKVxyXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXHJcbiAgICAsIHBhdGg7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIHBhdGggPSBwYXRoc1tpXTtcclxuXHJcbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcclxuICAgICAgLCBwbGVuID0gcGFydHMubGVuZ3RoXHJcbiAgICAgICwgbGFzdCA9IHBsZW4gLSAxXHJcbiAgICAgICwgYnJhbmNoID0ganNvblxyXG4gICAgICAsIHBhcnQ7XHJcblxyXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IHBsZW47ICsraWkpIHtcclxuICAgICAgcGFydCA9IHBhcnRzW2lpXTtcclxuICAgICAgaWYgKGlpID09PSBsYXN0KSB7XHJcbiAgICAgICAgYnJhbmNoW3BhcnRdID0gdXRpbHMuY2xvbmUoc2VsZi5nZXQocGF0aCksIG9wdGlvbnMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaFtwYXJ0XSB8fCAoYnJhbmNoW3BhcnRdID0ge30pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4ganNvbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgaXMgdXNlZCBpbiBjYWxscyB0byBKU09OLnN0cmluZ2lmeShkb2MpLlxyXG4gKlxyXG4gKiBUaGlzIG1ldGhvZCBhY2NlcHRzIHRoZSBzYW1lIG9wdGlvbnMgYXMgW0RvY3VtZW50I3RvT2JqZWN0XSgjZG9jdW1lbnRfRG9jdW1lbnQtdG9PYmplY3QpLiBUbyBhcHBseSB0aGUgb3B0aW9ucyB0byBldmVyeSBkb2N1bWVudCBvZiB5b3VyIHNjaGVtYSBieSBkZWZhdWx0LCBzZXQgeW91ciBbc2NoZW1hc10oI3NjaGVtYV9TY2hlbWEpIGB0b0pTT05gIG9wdGlvbiB0byB0aGUgc2FtZSBhcmd1bWVudC5cclxuICpcclxuICogICAgIHNjaGVtYS5zZXQoJ3RvSlNPTicsIHsgdmlydHVhbHM6IHRydWUgfSlcclxuICpcclxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIGZvciBkZXRhaWxzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xyXG4gKiBAcmV0dXJuIHtPYmplY3R9XHJcbiAqIEBzZWUgRG9jdW1lbnQjdG9PYmplY3QgI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRG9jdW1lbnQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgLy8gY2hlY2sgZm9yIG9iamVjdCB0eXBlIHNpbmNlIGFuIGFycmF5IG9mIGRvY3VtZW50c1xyXG4gIC8vIGJlaW5nIHN0cmluZ2lmaWVkIHBhc3NlcyBhcnJheSBpbmRleGVzIGluc3RlYWRcclxuICAvLyBvZiBvcHRpb25zIG9iamVjdHMuIEpTT04uc3RyaW5naWZ5KFtkb2MsIGRvY10pXHJcbiAgLy8gVGhlIHNlY29uZCBjaGVjayBoZXJlIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IHBvcHVsYXRlZCBkb2N1bWVudHMgKG9yXHJcbiAgLy8gc3ViZG9jdW1lbnRzKSB1c2UgdGhlaXIgb3duIG9wdGlvbnMgZm9yIGAudG9KU09OKClgIGluc3RlYWQgb2YgdGhlaXJcclxuICAvLyBwYXJlbnQnc1xyXG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gb3B0aW9ucy5jb25zdHJ1Y3Rvci5uYW1lKVxyXG4gICAgICB8fCAoKCFvcHRpb25zIHx8IG9wdGlvbnMuanNvbikgJiYgdGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pKSB7XHJcblxyXG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXHJcbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b0pTT04pXHJcbiAgICAgIDoge307XHJcbiAgfVxyXG4gIG9wdGlvbnMuanNvbiA9IHRydWU7XHJcblxyXG4gIHJldHVybiB0aGlzLnRvT2JqZWN0KG9wdGlvbnMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgRG9jdW1lbnQgc3RvcmVzIHRoZSBzYW1lIGRhdGEgYXMgZG9jLlxyXG4gKlxyXG4gKiBEb2N1bWVudHMgYXJlIGNvbnNpZGVyZWQgZXF1YWwgd2hlbiB0aGV5IGhhdmUgbWF0Y2hpbmcgYF9pZGBzLCB1bmxlc3MgbmVpdGhlclxyXG4gKiBkb2N1bWVudCBoYXMgYW4gYF9pZGAsIGluIHdoaWNoIGNhc2UgdGhpcyBmdW5jdGlvbiBmYWxscyBiYWNrIHRvIHVzaW5nXHJcbiAqIGBkZWVwRXF1YWwoKWAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBhIGRvY3VtZW50IHRvIGNvbXBhcmVcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5Eb2N1bWVudC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGRvYykge1xyXG4gIHZhciB0aWQgPSB0aGlzLmdldCgnX2lkJyk7XHJcbiAgdmFyIGRvY2lkID0gZG9jLmdldCgnX2lkJyk7XHJcbiAgaWYgKCF0aWQgJiYgIWRvY2lkKSB7XHJcbiAgICByZXR1cm4gZGVlcEVxdWFsKHRoaXMsIGRvYyk7XHJcbiAgfVxyXG4gIHJldHVybiB0aWQgJiYgdGlkLmVxdWFsc1xyXG4gICAgPyB0aWQuZXF1YWxzKGRvY2lkKVxyXG4gICAgOiB0aWQgPT09IGRvY2lkO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0cyBfaWQocykgdXNlZCBkdXJpbmcgcG9wdWxhdGlvbiBvZiB0aGUgZ2l2ZW4gYHBhdGhgLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIE1vZGVsLmZpbmRPbmUoKS5wb3B1bGF0ZSgnYXV0aG9yJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcclxuICogICAgICAgY29uc29sZS5sb2coZG9jLmF1dGhvci5uYW1lKSAgICAgICAgIC8vIERyLlNldXNzXHJcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5wb3B1bGF0ZWQoJ2F1dGhvcicpKSAvLyAnNTE0NGNmODA1MGYwNzFkOTc5YzExOGE3J1xyXG4gKiAgICAgfSlcclxuICpcclxuICogSWYgdGhlIHBhdGggd2FzIG5vdCBwb3B1bGF0ZWQsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICogQHJldHVybiB7QXJyYXl8T2JqZWN0SWR8TnVtYmVyfEJ1ZmZlcnxTdHJpbmd8dW5kZWZpbmVkfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLnBvcHVsYXRlZCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG9wdGlvbnMpIHtcclxuICAvLyB2YWwgYW5kIG9wdGlvbnMgYXJlIGludGVybmFsXHJcblxyXG4gIC8vVE9ETzog0LTQvtC00LXQu9Cw0YLRjCDRjdGC0YMg0L/RgNC+0LLQtdGA0LrRgywg0L7QvdCwINC00L7Qu9C20L3QsCDQvtC/0LjRgNCw0YLRjNGB0Y8g0L3QtSDQvdCwICRfXy5wb3B1bGF0ZWQsINCwINC90LAg0YLQviwg0YfRgtC+INC90LDRiCDQvtCx0YrQtdC60YIg0LjQvNC10LXRgiDRgNC+0LTQuNGC0LXQu9GPXHJcbiAgLy8g0Lgg0L/QvtGC0L7QvCDRg9C20LUg0LLRi9GB0YLQsNCy0LvRj9GC0Ywg0YHQstC+0LnRgdGC0LLQviBwb3B1bGF0ZWQgPT0gdHJ1ZVxyXG4gIGlmIChudWxsID09IHZhbCkge1xyXG4gICAgaWYgKCF0aGlzLiRfXy5wb3B1bGF0ZWQpIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB2YXIgdiA9IHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcclxuICAgIGlmICh2KSByZXR1cm4gdi52YWx1ZTtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICAvLyBpbnRlcm5hbFxyXG5cclxuICBpZiAodHJ1ZSA9PT0gdmFsKSB7XHJcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIHJldHVybiB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XHJcbiAgfVxyXG5cclxuICB0aGlzLiRfXy5wb3B1bGF0ZWQgfHwgKHRoaXMuJF9fLnBvcHVsYXRlZCA9IHt9KTtcclxuICB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF0gPSB7IHZhbHVlOiB2YWwsIG9wdGlvbnM6IG9wdGlvbnMgfTtcclxuICByZXR1cm4gdmFsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcclxuICogQG1lbWJlck9mIERvY3VtZW50XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZnVsbFBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xyXG4gIC8vIG92ZXJyaWRkZW4gaW4gU3ViRG9jdW1lbnRzXHJcbiAgcmV0dXJuIHBhdGggfHwgJyc7XHJcbn07XHJcblxyXG4vKipcclxuICog0KPQtNCw0LvQuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQuCDQstC10YDQvdGD0YLRjCDQutC+0LvQu9C10LrRhtC40Y4uXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIHN0b3JhZ2UuY29sbGVjdGlvbi5kb2N1bWVudC5yZW1vdmUoKTtcclxuICogZG9jdW1lbnQucmVtb3ZlKCk7XHJcbiAqXHJcbiAqIEBzZWUgQ29sbGVjdGlvbi5yZW1vdmVcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5Eb2N1bWVudC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oKXtcclxuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xyXG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoIHRoaXMgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkZWxldGUgdGhpcztcclxufTtcclxuXHJcblxyXG4vKipcclxuICog0J7Rh9C40YnQsNC10YIg0LTQvtC60YPQvNC10L3RgiAo0LLRi9GB0YLQsNCy0LvRj9C10YIg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQuNC70LggdW5kZWZpbmVkKVxyXG4gKi9cclxuRG9jdW1lbnQucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKXtcclxuICB2YXIgZG9jID0gdGhpc1xyXG4gICAgLCBzZWxmID0gdGhpc1xyXG4gICAgLCBwYXRocyA9IE9iamVjdC5rZXlzKCB0aGlzLnNjaGVtYS5wYXRocyApXHJcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcclxuICAgICwgaWkgPSAwO1xyXG5cclxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcclxuICAgIHZhciBwID0gcGF0aHNbaWldO1xyXG5cclxuICAgIGlmICggJ19pZCcgPT0gcCApIGNvbnRpbnVlO1xyXG5cclxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxyXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcclxuICAgICAgLCBsZW4gPSBwYXRoLmxlbmd0aFxyXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXHJcbiAgICAgICwgZG9jXyA9IGRvY1xyXG4gICAgICAsIGkgPSAwO1xyXG5cclxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xyXG4gICAgICB2YXIgcGllY2UgPSBwYXRoWyBpIF1cclxuICAgICAgICAsIGRlZmF1bHRWYWw7XHJcblxyXG4gICAgICBpZiAoIGkgPT09IGxhc3QgKSB7XHJcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xyXG5cclxuICAgICAgICBkb2NfWyBwaWVjZSBdID0gZGVmYXVsdFZhbCB8fCB1bmRlZmluZWQ7XHJcbiAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGRvY18gPSBkb2NfWyBwaWVjZSBdIHx8ICggZG9jX1sgcGllY2UgXSA9IHt9ICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxuRG9jdW1lbnQuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yO1xyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50O1xyXG4iLCIvL3RvZG86INC/0L7RgNGC0LjRgNC+0LLQsNGC0Ywg0LLRgdC1INC+0YjQuNCx0LrQuCEhIVxyXG4vKipcclxuICogU3RvcmFnZUVycm9yIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBFcnJvciBtZXNzYWdlXHJcbiAqIEBpbmhlcml0cyBFcnJvciBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvclxyXG4gKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc4MzgxOC9ob3ctZG8taS1jcmVhdGUtYS1jdXN0b20tZXJyb3ItaW4tamF2YXNjcmlwdFxyXG4gKi9cclxuZnVuY3Rpb24gU3RvcmFnZUVycm9yICggbXNnICkge1xyXG4gIHRoaXMubWVzc2FnZSA9IG1zZztcclxuICB0aGlzLm5hbWUgPSAnU3RvcmFnZUVycm9yJztcclxufVxyXG5TdG9yYWdlRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XHJcblxyXG5cclxuLyohXHJcbiAqIEZvcm1hdHMgZXJyb3IgbWVzc2FnZXNcclxuICovXHJcblN0b3JhZ2VFcnJvci5wcm90b3R5cGUuZm9ybWF0TWVzc2FnZSA9IGZ1bmN0aW9uIChtc2csIHBhdGgsIHR5cGUsIHZhbCkge1xyXG4gIGlmICghbXNnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdtZXNzYWdlIGlzIHJlcXVpcmVkJyk7XHJcblxyXG4gIHJldHVybiBtc2cucmVwbGFjZSgve1BBVEh9LywgcGF0aClcclxuICAgICAgICAgICAgLnJlcGxhY2UoL3tWQUxVRX0vLCBTdHJpbmcodmFsfHwnJykpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VFlQRX0vLCB0eXBlIHx8ICdkZWNsYXJlZCB0eXBlJyk7XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRXJyb3I7XHJcblxyXG4vKipcclxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLlxyXG4gKlxyXG4gKiBAc2VlIEVycm9yLm1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuU3RvcmFnZUVycm9yLm1lc3NhZ2VzID0gcmVxdWlyZSgnLi9lcnJvci9tZXNzYWdlcycpO1xyXG5cclxuLyohXHJcbiAqIEV4cG9zZSBzdWJjbGFzc2VzXHJcbiAqL1xyXG5cclxuU3RvcmFnZUVycm9yLkNhc3RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvY2FzdCcpO1xyXG5TdG9yYWdlRXJyb3IuVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92YWxpZGF0aW9uJyk7XHJcblN0b3JhZ2VFcnJvci5WYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdG9yJyk7XHJcbi8vdG9kbzpcclxuLy9TdG9yYWdlRXJyb3IuVmVyc2lvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvci92ZXJzaW9uJyk7XHJcbi8vU3RvcmFnZUVycm9yLk92ZXJ3cml0ZU1vZGVsRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL292ZXJ3cml0ZU1vZGVsJyk7XHJcbi8vU3RvcmFnZUVycm9yLk1pc3NpbmdTY2hlbWFFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvbWlzc2luZ1NjaGVtYScpO1xyXG4vL1N0b3JhZ2VFcnJvci5EaXZlcmdlbnRBcnJheUVycm9yID0gcmVxdWlyZSgnLi9lcnJvci9kaXZlcmdlbnRBcnJheScpO1xyXG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0aW5nIEVycm9yIGNvbnN0cnVjdG9yLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcclxuICogQGluaGVyaXRzIE1vbmdvb3NlRXJyb3JcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gQ2FzdEVycm9yICh0eXBlLCB2YWx1ZSwgcGF0aCkge1xyXG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsICdDYXN0IHRvICcgKyB0eXBlICsgJyBmYWlsZWQgZm9yIHZhbHVlIFwiJyArIHZhbHVlICsgJ1wiIGF0IHBhdGggXCInICsgcGF0aCArICdcIicpO1xyXG4gIHRoaXMubmFtZSA9ICdDYXN0RXJyb3InO1xyXG4gIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gIHRoaXMucGF0aCA9IHBhdGg7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3IuXHJcbiAqL1xyXG5DYXN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xyXG5DYXN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2FzdEVycm9yO1xyXG5cclxuLyohXHJcbiAqIGV4cG9ydHNcclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENhc3RFcnJvcjtcclxuIiwiXHJcbi8qKlxyXG4gKiBUaGUgZGVmYXVsdCBidWlsdC1pbiB2YWxpZGF0b3IgZXJyb3IgbWVzc2FnZXMuIFRoZXNlIG1heSBiZSBjdXN0b21pemVkLlxyXG4gKlxyXG4gKiAgICAgLy8gY3VzdG9taXplIHdpdGhpbiBlYWNoIHNjaGVtYSBvciBnbG9iYWxseSBsaWtlIHNvXHJcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xyXG4gKiAgICAgbW9uZ29vc2UuRXJyb3IubWVzc2FnZXMuU3RyaW5nLmVudW0gID0gXCJZb3VyIGN1c3RvbSBtZXNzYWdlIGZvciB7UEFUSH0uXCI7XHJcbiAqXHJcbiAqIEFzIHlvdSBtaWdodCBoYXZlIG5vdGljZWQsIGVycm9yIG1lc3NhZ2VzIHN1cHBvcnQgYmFzaWMgdGVtcGxhdGluZ1xyXG4gKlxyXG4gKiAtIGB7UEFUSH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgZG9jdW1lbnQgcGF0aFxyXG4gKiAtIGB7VkFMVUV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXHJcbiAqIC0gYHtUWVBFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgdmFsaWRhdG9yIHR5cGUgc3VjaCBhcyBcInJlZ2V4cFwiLCBcIm1pblwiLCBvciBcInVzZXIgZGVmaW5lZFwiXHJcbiAqIC0gYHtNSU59YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtaW4gdmFsdWUgZm9yIHRoZSBOdW1iZXIubWluIHZhbGlkYXRvclxyXG4gKiAtIGB7TUFYfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgZGVjbGFyZWQgbWF4IHZhbHVlIGZvciB0aGUgTnVtYmVyLm1heCB2YWxpZGF0b3JcclxuICpcclxuICogQ2xpY2sgdGhlIFwic2hvdyBjb2RlXCIgbGluayBiZWxvdyB0byBzZWUgYWxsIGRlZmF1bHRzLlxyXG4gKlxyXG4gKiBAcHJvcGVydHkgbWVzc2FnZXNcclxuICogQHJlY2VpdmVyIE1vbmdvb3NlRXJyb3JcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG52YXIgbXNnID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuXHJcbm1zZy5nZW5lcmFsID0ge307XHJcbm1zZy5nZW5lcmFsLmRlZmF1bHQgPSBcIlZhbGlkYXRvciBmYWlsZWQgZm9yIHBhdGggYHtQQVRIfWAgd2l0aCB2YWx1ZSBge1ZBTFVFfWBcIjtcclxubXNnLmdlbmVyYWwucmVxdWlyZWQgPSBcIlBhdGggYHtQQVRIfWAgaXMgcmVxdWlyZWQuXCI7XHJcblxyXG5tc2cuTnVtYmVyID0ge307XHJcbm1zZy5OdW1iZXIubWluID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBsZXNzIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlICh7TUlOfSkuXCI7XHJcbm1zZy5OdW1iZXIubWF4ID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBtb3JlIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlICh7TUFYfSkuXCI7XHJcblxyXG5tc2cuU3RyaW5nID0ge307XHJcbm1zZy5TdHJpbmcuZW51bSA9IFwiYHtWQUxVRX1gIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHtQQVRIfWAuXCI7XHJcbm1zZy5TdHJpbmcubWF0Y2ggPSBcIlBhdGggYHtQQVRIfWAgaXMgaW52YWxpZCAoe1ZBTFVFfSkuXCI7XHJcblxyXG4iLCJcclxuLyohXHJcbiAqIE1vZHVsZSByZXF1aXJlbWVudHNcclxuICovXHJcblxyXG52YXIgU3RvcmFnZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3IuanMnKTtcclxuXHJcbi8qKlxyXG4gKiBEb2N1bWVudCBWYWxpZGF0aW9uIEVycm9yXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBpbnN0YW5jZVxyXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvciAoaW5zdGFuY2UpIHtcclxuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCBcIlZhbGlkYXRpb24gZmFpbGVkXCIpO1xyXG4gIHRoaXMubmFtZSA9ICdWYWxpZGF0aW9uRXJyb3InO1xyXG4gIHRoaXMuZXJyb3JzID0gaW5zdGFuY2UuZXJyb3JzID0ge307XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3IuXHJcbiAqL1xyXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUVycm9yLnByb3RvdHlwZSApO1xyXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0aW9uRXJyb3I7XHJcbiIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xyXG52YXIgZXJyb3JNZXNzYWdlcyA9IFN0b3JhZ2VFcnJvci5tZXNzYWdlcztcclxuXHJcbi8qKlxyXG4gKiBTY2hlbWEgdmFsaWRhdG9yIGVycm9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2dcclxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfGFueX0gdmFsXHJcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIFZhbGlkYXRvckVycm9yIChwYXRoLCBtc2csIHR5cGUsIHZhbCkge1xyXG4gIGlmICghbXNnKSBtc2cgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcclxuICB2YXIgbWVzc2FnZSA9IHRoaXMuZm9ybWF0TWVzc2FnZShtc2csIHBhdGgsIHR5cGUsIHZhbCk7XHJcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgbWVzc2FnZSk7XHJcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRvckVycm9yJztcclxuICB0aGlzLnBhdGggPSBwYXRoO1xyXG4gIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgdGhpcy52YWx1ZSA9IHZhbDtcclxufVxyXG5cclxuLyohXHJcbiAqIHRvU3RyaW5nIGhlbHBlclxyXG4gKi9cclxuXHJcblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5tZXNzYWdlO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yXHJcbiAqL1xyXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTdG9yYWdlRXJyb3IucHJvdG90eXBlICk7XHJcblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRvckVycm9yO1xyXG5cclxuLyohXHJcbiAqIGV4cG9ydHNcclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvckVycm9yO1xyXG4iLCIvLyBCYWNrYm9uZS5FdmVudHNcclxuLy8gLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4vLyBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXHJcbi8vIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcclxuLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cclxuLy8gc3VjY2Vzc2lvbi5cclxuLy9cclxuLy8gICAgIHZhciBvYmplY3QgPSB7fTtcclxuLy8gICAgIF8uZXh0ZW5kKG9iamVjdCwgRXZlbnRzLnByb3RvdHlwZSk7XHJcbi8vICAgICBvYmplY3Qub24oJ2V4cGFuZCcsIGZ1bmN0aW9uKCl7IGFsZXJ0KCdleHBhbmRlZCcpOyB9KTtcclxuLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcclxuLy9cclxuZnVuY3Rpb24gRXZlbnRzKCkge31cclxuXHJcbkV2ZW50cy5wcm90b3R5cGUgPSB7XHJcblxyXG4gIC8vIEJpbmQgYW4gZXZlbnQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLiBQYXNzaW5nIGBcImFsbFwiYCB3aWxsIGJpbmRcclxuICAvLyB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cclxuICBvbjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcclxuICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XHJcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcclxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcclxuICAgIGV2ZW50cy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY29udGV4dCB8fCB0aGlzfSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXHJcbiAgLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cclxuICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xyXG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XHJcbiAgICAgIHNlbGYub2ZmKG5hbWUsIG9uY2UpO1xyXG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgfSk7XHJcbiAgICBvbmNlLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gICAgcmV0dXJuIHRoaXMub24obmFtZSwgb25jZSwgY29udGV4dCk7XHJcbiAgfSxcclxuXHJcbiAgLy8gUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXHJcbiAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxyXG4gIC8vIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcclxuICAvLyBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXHJcbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xyXG4gICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XHJcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XHJcbiAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XHJcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIG5hbWVzID0gbmFtZSA/IFtuYW1lXSA6IF8ua2V5cyh0aGlzLl9ldmVudHMpO1xyXG4gICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBuYW1lID0gbmFtZXNbaV07XHJcbiAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcclxuICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xyXG4gICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcclxuICAgICAgICAgICAgZXYgPSBldmVudHNbal07XHJcbiAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XHJcbiAgICAgICAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gZXYuY29udGV4dCkpIHtcclxuICAgICAgICAgICAgICByZXRhaW4ucHVzaChldik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFyZXRhaW4ubGVuZ3RoKSBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXHJcbiAgLy8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcclxuICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cclxuICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXHJcbiAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xyXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xyXG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XHJcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xyXG4gICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XHJcbiAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XHJcbiAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcclxuICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxyXG4gIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcclxuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvO1xyXG4gICAgaWYgKCFsaXN0ZW5pbmdUbykgcmV0dXJuIHRoaXM7XHJcbiAgICB2YXIgcmVtb3ZlID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xyXG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcclxuICAgIGlmIChvYmopIChsaXN0ZW5pbmdUbyA9IHt9KVtvYmouX2xpc3RlbklkXSA9IG9iajtcclxuICAgIGZvciAodmFyIGlkIGluIGxpc3RlbmluZ1RvKSB7XHJcbiAgICAgIG9iaiA9IGxpc3RlbmluZ1RvW2lkXTtcclxuICAgICAgb2JqLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XHJcbiAgICAgIGlmIChyZW1vdmUgfHwgXy5pc0VtcHR5KG9iai5fZXZlbnRzKSkgZGVsZXRlIHRoaXMuX2xpc3RlbmluZ1RvW2lkXTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufTtcclxuXHJcbi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXHJcbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xyXG5cclxuLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcclxuLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxyXG4vLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxyXG52YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcclxuICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xyXG5cclxuICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cclxuICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xyXG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtrZXksIG5hbWVba2V5XV0uY29uY2F0KHJlc3QpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXHJcbiAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xyXG4gICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vLyBBIGRpZmZpY3VsdC10by1iZWxpZXZlLCBidXQgb3B0aW1pemVkIGludGVybmFsIGRpc3BhdGNoIGZ1bmN0aW9uIGZvclxyXG4vLyB0cmlnZ2VyaW5nIGV2ZW50cy4gVHJpZXMgdG8ga2VlcCB0aGUgdXN1YWwgY2FzZXMgc3BlZWR5IChtb3N0IGludGVybmFsXHJcbi8vIEJhY2tib25lIGV2ZW50cyBoYXZlIDMgYXJndW1lbnRzKS5cclxudmFyIHRyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGFyZ3MpIHtcclxuICB2YXIgZXYsIGkgPSAtMSwgbCA9IGV2ZW50cy5sZW5ndGgsIGExID0gYXJnc1swXSwgYTIgPSBhcmdzWzFdLCBhMyA9IGFyZ3NbMl07XHJcbiAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xyXG4gICAgY2FzZSAwOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCk7IHJldHVybjtcclxuICAgIGNhc2UgMTogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExKTsgcmV0dXJuO1xyXG4gICAgY2FzZSAyOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyKTsgcmV0dXJuO1xyXG4gICAgY2FzZSAzOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyLCBhMyk7IHJldHVybjtcclxuICAgIGRlZmF1bHQ6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmFwcGx5KGV2LmN0eCwgYXJncyk7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcclxuXHJcbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXHJcbi8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3NcclxuLy8gbGlzdGVuaW5nIHRvLlxyXG5fLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xyXG4gIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG8gfHwgKHRoaXMuX2xpc3RlbmluZ1RvID0ge30pO1xyXG4gICAgdmFyIGlkID0gb2JqLl9saXN0ZW5JZCB8fCAob2JqLl9saXN0ZW5JZCA9IF8udW5pcXVlSWQoJ2wnKSk7XHJcbiAgICBsaXN0ZW5pbmdUb1tpZF0gPSBvYmo7XHJcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xyXG4gICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9O1xyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xyXG4iLCIvKipcclxuICog0KXRgNCw0L3QuNC70LjRidC1INC00L7QutGD0LzQtdC90YLQvtCyINC/0L4g0YHRhdC10LzQsNC8XHJcbiAqINCy0LTQvtGF0L3QvtCy0LvRkdC9IG1vbmdvb3NlIDMuOC40ICjQuNGB0L/RgNCw0LLQu9C10L3RiyDQsdCw0LPQuCDQv9C+IDMuOC4xNSlcclxuICpcclxuICog0KDQtdCw0LvQuNC30LDRhtC40Lgg0YXRgNCw0L3QuNC70LjRidCwXHJcbiAqIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI3NlbGVjdG9yc1xyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cclxuICpcclxuICogYnJvd3NlcmlmeSBzcmMvIC0tc3RhbmRhbG9uZSBzdG9yYWdlID4gc3RvcmFnZS5qcyAtZFxyXG4gKi9cclxuXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9jb2xsZWN0aW9uJylcclxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcclxuICAsIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKVxyXG4gICwgVmlydHVhbFR5cGUgPSByZXF1aXJlKCcuL3ZpcnR1YWx0eXBlJylcclxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXHJcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKVxyXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcblxyXG5cclxuLyoqXHJcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBvZiB0aGUgYHN0b3JhZ2VgIG1vZHVsZSBpcyBhbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzLlxyXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbmZ1bmN0aW9uIFN0b3JhZ2UgKCkge1xyXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzID0gW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4g0Lgg0L/QvtC70YPRh9C40YLRjCDQtdGRLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxyXG4gKiBAcGFyYW0ge3N0b3JhZ2UuU2NoZW1hfHVuZGVmaW5lZH0gc2NoZW1hXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcclxuICogQHJldHVybnMge0NvbGxlY3Rpb258dW5kZWZpbmVkfVxyXG4gKi9cclxuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xyXG4gIGlmICggdGhpc1sgbmFtZSBdICl7XHJcbiAgICBjb25zb2xlLmluZm8oJ3N0b3JhZ2U6OmNvbGxlY3Rpb246IGAnICsgbmFtZSArICdgIGFscmVhZHkgZXhpc3QnKTtcclxuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XHJcbiAgfVxyXG5cclxuICBpZiAoICdTY2hlbWEnICE9PSBzY2hlbWEuY29uc3RydWN0b3IubmFtZSApe1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHNjaGVtYWAgbXVzdCBiZSBTY2hlbWEgaW5zdGFuY2UnKTtcclxuICB9XHJcblxyXG4gIHRoaXMuY29sbGVjdGlvbk5hbWVzLnB1c2goIG5hbWUgKTtcclxuXHJcbiAgcmV0dXJuIHRoaXNbIG5hbWUgXSA9IG5ldyBDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqINCf0L7Qu9GD0YfQuNGC0Ywg0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40Lkg0LIg0LLQuNC00LUg0LzQsNGB0YHQuNCy0LAg0YHRgtGA0L7Qui5cclxuICpcclxuICogQHJldHVybnMge0FycmF5LjxzdHJpbmc+fSBBbiBhcnJheSBjb250YWluaW5nIGFsbCBjb2xsZWN0aW9ucyBpbiB0aGUgc3RvcmFnZS5cclxuICovXHJcblN0b3JhZ2UucHJvdG90eXBlLmdldENvbGxlY3Rpb25OYW1lcyA9IGZ1bmN0aW9uKCl7XHJcbiAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbk5hbWVzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBNb25nb29zZSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblN0b3JhZ2UucHJvdG90eXBlLkNvbGxlY3Rpb24gPSBDb2xsZWN0aW9uO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBTdG9yYWdlIHZlcnNpb25cclxuICpcclxuICogQHByb3BlcnR5IHZlcnNpb25cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbi8vdG9kbzpcclxuLy9TdG9yYWdlLnByb3RvdHlwZS52ZXJzaW9uID0gcGtnLnZlcnNpb247XHJcblxyXG4vKipcclxuICogVGhlIFN0b3JhZ2UgW1NjaGVtYV0oI3NjaGVtYV9TY2hlbWEpIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcclxuICogICAgIHZhciBTY2hlbWEgPSBtb25nb29zZS5TY2hlbWE7XHJcbiAqICAgICB2YXIgQ2F0U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XHJcbiAqXHJcbiAqIEBtZXRob2QgU2NoZW1hXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hID0gU2NoZW1hO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBNb25nb29zZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcclxuICpcclxuICogQG1ldGhvZCBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hVHlwZSA9IFNjaGVtYVR5cGU7XHJcblxyXG4vKipcclxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgU2NoZW1hVHlwZXMuXHJcbiAqXHJcbiAqICMjIyNOb3RlOlxyXG4gKlxyXG4gKiBfQWxpYXMgb2YgbW9uZ29vc2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXHJcbiAqXHJcbiAqIEBwcm9wZXJ0eSBTY2hlbWFUeXBlc1xyXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblN0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGVzID0gU2NoZW1hLlR5cGVzO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBNb25nb29zZSBbVmlydHVhbFR5cGVdKCN2aXJ0dWFsdHlwZV9WaXJ0dWFsVHlwZSkgY29uc3RydWN0b3JcclxuICpcclxuICogQG1ldGhvZCBWaXJ0dWFsVHlwZVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblN0b3JhZ2UucHJvdG90eXBlLlZpcnR1YWxUeXBlID0gVmlydHVhbFR5cGU7XHJcblxyXG4vKipcclxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgVHlwZXMuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcclxuICogICAgIHZhciBhcnJheSA9IG1vbmdvb3NlLlR5cGVzLkFycmF5O1xyXG4gKlxyXG4gKiAjIyMjVHlwZXM6XHJcbiAqXHJcbiAqIC0gW09iamVjdElkXSgjdHlwZXMtb2JqZWN0aWQtanMpXHJcbiAqIC0gW1N1YkRvY3VtZW50XSgjdHlwZXMtZW1iZWRkZWQtanMpXHJcbiAqIC0gW0FycmF5XSgjdHlwZXMtYXJyYXktanMpXHJcbiAqIC0gW0RvY3VtZW50QXJyYXldKCN0eXBlcy1kb2N1bWVudGFycmF5LWpzKVxyXG4gKlxyXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgT2JqZWN0SWRgIHR5cGUsIHdlIGNhbiBjb25zdHJ1Y3QgaWRzIG9uIGRlbWFuZC5cclxuICpcclxuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkO1xyXG4gKiAgICAgdmFyIGlkMSA9IG5ldyBPYmplY3RJZDtcclxuICpcclxuICogQHByb3BlcnR5IFR5cGVzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuU3RvcmFnZS5wcm90b3R5cGUuVHlwZXMgPSBUeXBlcztcclxuXHJcbi8qKlxyXG4gKiBUaGUgTW9uZ29vc2UgW0RvY3VtZW50XSgjZG9jdW1lbnQtanMpIGNvbnN0cnVjdG9yLlxyXG4gKlxyXG4gKiBAbWV0aG9kIERvY3VtZW50XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuU3RvcmFnZS5wcm90b3R5cGUuRG9jdW1lbnQgPSBEb2N1bWVudDtcclxuXHJcbi8qKlxyXG4gKiBUaGUgW01vbmdvb3NlRXJyb3JdKCNlcnJvcl9Nb25nb29zZUVycm9yKSBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogQG1ldGhvZCBFcnJvclxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblN0b3JhZ2UucHJvdG90eXBlLkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xyXG5cclxuXHJcblxyXG5TdG9yYWdlLnByb3RvdHlwZS5TdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xyXG5TdG9yYWdlLnByb3RvdHlwZS51dGlscyA9IHV0aWxzO1xyXG5TdG9yYWdlLnByb3RvdHlwZS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xyXG5TdG9yYWdlLnByb3RvdHlwZS5zY2hlbWFzID0gU2NoZW1hLnNjaGVtYXM7XHJcblxyXG5TdG9yYWdlLnByb3RvdHlwZS5zZXRBZGFwdGVyID0gZnVuY3Rpb24oIGFkYXB0ZXJIb29rcyApe1xyXG4gIERvY3VtZW50LnByb3RvdHlwZS5hZGFwdGVySG9va3MgPSBhZGFwdGVySG9va3M7XHJcbn07XHJcblxyXG4vKlxyXG4gKiBHZW5lcmF0ZSBhIHJhbmRvbSB1dWlkLlxyXG4gKiBodHRwOi8vd3d3LmJyb29mYS5jb20vVG9vbHMvTWF0aC51dWlkLmh0bVxyXG4gKiBmb3JrIE1hdGgudXVpZC5qcyAodjEuNClcclxuICpcclxuICogaHR0cDovL3d3dy5icm9vZmEuY29tLzIwMDgvMDkvamF2YXNjcmlwdC11dWlkLWZ1bmN0aW9uL1xyXG4gKi9cclxuLyp1dWlkOiB7XHJcbiAgLy8gUHJpdmF0ZSBhcnJheSBvZiBjaGFycyB0byB1c2VcclxuICBDSEFSUzogJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCgnJyksXHJcblxyXG4gIC8vIHJldHVybnMgUkZDNDEyMiwgdmVyc2lvbiA0IElEXHJcbiAgZ2VuZXJhdGU6IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgY2hhcnMgPSB0aGlzLkNIQVJTLCB1dWlkID0gbmV3IEFycmF5KCAzNiApLCBybmQgPSAwLCByO1xyXG4gICAgZm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkrKyApIHtcclxuICAgICAgaWYgKCBpID09IDggfHwgaSA9PSAxMyB8fCBpID09IDE4IHx8IGkgPT0gMjMgKSB7XHJcbiAgICAgICAgdXVpZFtpXSA9ICctJztcclxuICAgICAgfSBlbHNlIGlmICggaSA9PSAxNCApIHtcclxuICAgICAgICB1dWlkW2ldID0gJzQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmICggcm5kIDw9IDB4MDIgKSBybmQgPSAweDIwMDAwMDAgKyAoTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMCkgfCAwO1xyXG4gICAgICAgIHIgPSBybmQgJiAweGY7XHJcbiAgICAgICAgcm5kID0gcm5kID4+IDQ7XHJcbiAgICAgICAgdXVpZFtpXSA9IGNoYXJzWyhpID09IDE5KSA/IChyICYgMHgzKSB8IDB4OCA6IHJdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdXVpZC5qb2luKCcnKS50b0xvd2VyQ2FzZSgpO1xyXG4gIH1cclxufSovXHJcblxyXG5cclxuLyohXHJcbiAqIFRoZSBleHBvcnRzIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBTdG9yYWdlLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IFN0b3JhZ2U7XHJcbiIsIi8vINCc0LDRiNC40L3QsCDRgdC+0YHRgtC+0Y/QvdC40Lkg0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQv9C+0LzQtdGC0LrQuCwg0LIg0LrQsNC60L7QvCDRgdC+0YHRgtC+0Y/QvdC40Lgg0L3QsNGF0L7QtNGP0YLRgdGPINC/0L7Qu9C1XHJcbi8vINCd0LDQv9GA0LjQvNC10YA6INC10YHQu9C4INC/0L7Qu9C1INC40LzQtdC10YIg0YHQvtGB0YLQvtGP0L3QuNC1IGRlZmF1bHQgLSDQt9C90LDRh9C40YIg0LXQs9C+INC30L3QsNGH0LXQvdC40LXQvCDRj9Cy0LvRj9C10YLRgdGPINC30L3QsNGH0LXQvdC40LUg0L/QviDRg9C80L7Qu9GH0LDQvdC40Y5cclxuLy8g0J/RgNC40LzQtdGH0LDQvdC40LU6INC00LvRjyDQvNCw0YHRgdC40LLQvtCyINCyINC+0LHRidC10Lwg0YHQu9GD0YfQsNC1INGN0YLQviDQvtC30L3QsNGH0LDQtdGCINC/0YPRgdGC0L7QuSDQvNCw0YHRgdC40LJcclxuXHJcbi8qIVxyXG4gKiBEZXBlbmRlbmNpZXNcclxuICovXHJcblxyXG52YXIgU3RhdGVNYWNoaW5lID0gcmVxdWlyZSgnLi9zdGF0ZW1hY2hpbmUnKTtcclxuXHJcbnZhciBBY3RpdmVSb3N0ZXIgPSBTdGF0ZU1hY2hpbmUuY3RvcigncmVxdWlyZScsICdtb2RpZnknLCAnaW5pdCcsICdkZWZhdWx0Jyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEludGVybmFsQ2FjaGU7XHJcblxyXG5mdW5jdGlvbiBJbnRlcm5hbENhY2hlICgpIHtcclxuICB0aGlzLnN0cmljdE1vZGUgPSB1bmRlZmluZWQ7XHJcbiAgdGhpcy5zZWxlY3RlZCA9IHVuZGVmaW5lZDtcclxuICB0aGlzLnNhdmVFcnJvciA9IHVuZGVmaW5lZDtcclxuICB0aGlzLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcclxuICB0aGlzLmFkaG9jUGF0aHMgPSB1bmRlZmluZWQ7XHJcbiAgdGhpcy5yZW1vdmluZyA9IHVuZGVmaW5lZDtcclxuICB0aGlzLmluc2VydGluZyA9IHVuZGVmaW5lZDtcclxuICB0aGlzLnZlcnNpb24gPSB1bmRlZmluZWQ7XHJcbiAgdGhpcy5nZXR0ZXJzID0ge307XHJcbiAgdGhpcy5faWQgPSB1bmRlZmluZWQ7XHJcbiAgdGhpcy5wb3B1bGF0ZSA9IHVuZGVmaW5lZDsgLy8gd2hhdCB3ZSB3YW50IHRvIHBvcHVsYXRlIGluIHRoaXMgZG9jXHJcbiAgdGhpcy5wb3B1bGF0ZWQgPSB1bmRlZmluZWQ7Ly8gdGhlIF9pZHMgdGhhdCBoYXZlIGJlZW4gcG9wdWxhdGVkXHJcbiAgdGhpcy53YXNQb3B1bGF0ZWQgPSBmYWxzZTsgLy8gaWYgdGhpcyBkb2Mgd2FzIHRoZSByZXN1bHQgb2YgYSBwb3B1bGF0aW9uXHJcbiAgdGhpcy5zY29wZSA9IHVuZGVmaW5lZDtcclxuICB0aGlzLmFjdGl2ZVBhdGhzID0gbmV3IEFjdGl2ZVJvc3RlcjtcclxuXHJcbiAgLy8gZW1iZWRkZWQgZG9jc1xyXG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHVuZGVmaW5lZDtcclxuICB0aGlzLmZ1bGxQYXRoID0gdW5kZWZpbmVkO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBvYmplY3QgYG9gIGF0IHRoZSBnaXZlbiBgcGF0aGAuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIG9iaiA9IHtcclxuICogICAgICAgICBjb21tZW50czogW1xyXG4gKiAgICAgICAgICAgICB7IHRpdGxlOiAnZXhjaXRpbmchJywgX2RvYzogeyB0aXRsZTogJ2dyZWF0IScgfX1cclxuICogICAgICAgICAgICwgeyB0aXRsZTogJ251bWJlciBkb3MnIH1cclxuICogICAgICAgICBdXHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvKSAgICAgICAgIC8vICdleGNpdGluZyEnXHJcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvLCAnX2RvYycpIC8vICdncmVhdCEnXHJcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLnRpdGxlJywgbykgICAgICAgICAgIC8vIFsnZXhjaXRpbmchJywgJ251bWJlciBkb3MnXVxyXG4gKlxyXG4gKiAgICAgLy8gc3VtbWFyeVxyXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8pXHJcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbClcclxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBtYXApXHJcbiAqICAgICBtcGF0aC5nZXQocGF0aCwgbywgc3BlY2lhbCwgbWFwKVxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge09iamVjdH0gb1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NwZWNpYWxdIFdoZW4gdGhpcyBwcm9wZXJ0eSBuYW1lIGlzIHByZXNlbnQgb24gYW55IG9iamVjdCBpbiB0aGUgcGF0aCwgd2Fsa2luZyB3aWxsIGNvbnRpbnVlIG9uIHRoZSB2YWx1ZSBvZiB0aGlzIHByb3BlcnR5LlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCByZWNlaXZlcyBlYWNoIGluZGl2aWR1YWwgZm91bmQgdmFsdWUuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cclxuICovXHJcblxyXG5leHBvcnRzLmdldCA9IGZ1bmN0aW9uIChwYXRoLCBvLCBzcGVjaWFsLCBtYXApIHtcclxuICB2YXIgbG9va3VwO1xyXG5cclxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3BlY2lhbCkge1xyXG4gICAgaWYgKHNwZWNpYWwubGVuZ3RoIDwgMikge1xyXG4gICAgICBtYXAgPSBzcGVjaWFsO1xyXG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbG9va3VwID0gc3BlY2lhbDtcclxuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIG1hcCB8fCAobWFwID0gSyk7XHJcblxyXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09IHR5cGVvZiBwYXRoXHJcbiAgICA/IHBhdGguc3BsaXQoJy4nKVxyXG4gICAgOiBwYXRoO1xyXG5cclxuICBpZiAoIUFycmF5LmlzQXJyYXkocGFydHMpKSB7XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGBwYXRoYC4gTXVzdCBiZSBlaXRoZXIgc3RyaW5nIG9yIGFycmF5Jyk7XHJcbiAgfVxyXG5cclxuICB2YXIgb2JqID0gb1xyXG4gICAgLCBwYXJ0O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICBwYXJ0ID0gcGFydHNbaV07XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSAmJiAhL15cXGQrJC8udGVzdChwYXJ0KSkge1xyXG4gICAgICAvLyByZWFkaW5nIGEgcHJvcGVydHkgZnJvbSB0aGUgYXJyYXkgaXRlbXNcclxuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XHJcblxyXG4gICAgICByZXR1cm4gb2JqLm1hcChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgIHJldHVybiBpdGVtXHJcbiAgICAgICAgICA/IGV4cG9ydHMuZ2V0KHBhdGhzLCBpdGVtLCBzcGVjaWFsIHx8IGxvb2t1cCwgbWFwKVxyXG4gICAgICAgICAgOiBtYXAodW5kZWZpbmVkKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGxvb2t1cCkge1xyXG4gICAgICBvYmogPSBsb29rdXAob2JqLCBwYXJ0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXHJcbiAgICAgICAgPyBvYmpbc3BlY2lhbF1bcGFydF1cclxuICAgICAgICA6IG9ialtwYXJ0XTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIW9iaikgcmV0dXJuIG1hcChvYmopO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1hcChvYmopO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0cyB0aGUgYHZhbGAgYXQgdGhlIGdpdmVuIGBwYXRoYCBvZiBvYmplY3QgYG9gLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcclxuICogQHBhcmFtIHtPYmplY3R9IG9cclxuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW21hcF0gT3B0aW9uYWwgZnVuY3Rpb24gd2hpY2ggaXMgcGFzc2VkIGVhY2ggaW5kaXZpZHVhbCB2YWx1ZSBiZWZvcmUgc2V0dGluZyBpdC4gVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYG1hcGAgaXMgdXNlZCBpbiB0aGUgb3JpZ2luYWwgdmFsdWVzIHBsYWNlLlxyXG4gKi9cclxuXHJcbmV4cG9ydHMuc2V0ID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbywgc3BlY2lhbCwgbWFwLCBfY29weWluZykge1xyXG4gIHZhciBsb29rdXA7XHJcblxyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBzcGVjaWFsKSB7XHJcbiAgICBpZiAoc3BlY2lhbC5sZW5ndGggPCAyKSB7XHJcbiAgICAgIG1hcCA9IHNwZWNpYWw7XHJcbiAgICAgIHNwZWNpYWwgPSB1bmRlZmluZWQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xyXG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbWFwIHx8IChtYXAgPSBLKTtcclxuXHJcbiAgdmFyIHBhcnRzID0gJ3N0cmluZycgPT0gdHlwZW9mIHBhdGhcclxuICAgID8gcGF0aC5zcGxpdCgnLicpXHJcbiAgICA6IHBhdGg7XHJcblxyXG4gIGlmICghQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcclxuICB9XHJcblxyXG4gIGlmIChudWxsID09IG8pIHJldHVybjtcclxuXHJcbiAgLy8gdGhlIGV4aXN0YW5jZSBvZiAkIGluIGEgcGF0aCB0ZWxscyB1cyBpZiB0aGUgdXNlciBkZXNpcmVzXHJcbiAgLy8gdGhlIGNvcHlpbmcgb2YgYW4gYXJyYXkgaW5zdGVhZCBvZiBzZXR0aW5nIGVhY2ggdmFsdWUgb2ZcclxuICAvLyB0aGUgYXJyYXkgdG8gdGhlIG9uZSBieSBvbmUgdG8gbWF0Y2hpbmcgcG9zaXRpb25zIG9mIHRoZVxyXG4gIC8vIGN1cnJlbnQgYXJyYXkuXHJcbiAgdmFyIGNvcHkgPSBfY29weWluZyB8fCAvXFwkLy50ZXN0KHBhdGgpXHJcbiAgICAsIG9iaiA9IG9cclxuICAgICwgcGFydFxyXG5cclxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFydHMubGVuZ3RoIC0gMTsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICBwYXJ0ID0gcGFydHNbaV07XHJcblxyXG4gICAgaWYgKCckJyA9PSBwYXJ0KSB7XHJcbiAgICAgIGlmIChpID09IGxlbiAtIDEpIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcclxuICAgICAgdmFyIHBhdGhzID0gcGFydHMuc2xpY2UoaSk7XHJcbiAgICAgIGlmICghY29weSAmJiBBcnJheS5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBzaW5nbGUgdmFsdWVzIG9mIGFycmF5XHJcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsW2pdLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGg7ICsraikge1xyXG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBlbnRpcmUgdmFsdWVcclxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWwsIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobG9va3VwKSB7XHJcbiAgICAgIG9iaiA9IGxvb2t1cChvYmosIHBhcnQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgb2JqID0gc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF1cclxuICAgICAgICA/IG9ialtzcGVjaWFsXVtwYXJ0XVxyXG4gICAgICAgIDogb2JqW3BhcnRdO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghb2JqKSByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBwcm9jZXNzIHRoZSBsYXN0IHByb3BlcnR5IG9mIHRoZSBwYXRoXHJcblxyXG4gIHBhcnQgPSBwYXJ0c1tsZW5dO1xyXG5cclxuICAvLyB1c2UgdGhlIHNwZWNpYWwgcHJvcGVydHkgaWYgZXhpc3RzXHJcbiAgaWYgKHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdKSB7XHJcbiAgICBvYmogPSBvYmpbc3BlY2lhbF07XHJcbiAgfVxyXG5cclxuICAvLyBzZXQgdGhlIHZhbHVlIG9uIHRoZSBsYXN0IGJyYW5jaFxyXG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcclxuICAgIGlmICghY29weSAmJiBBcnJheS5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgZm9yICh2YXIgaXRlbSwgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcclxuICAgICAgICBpdGVtID0gb2JqW2pdO1xyXG4gICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICBpZiAobG9va3VwKSB7XHJcbiAgICAgICAgICAgIGxvb2t1cChpdGVtLCBwYXJ0LCBtYXAodmFsW2pdKSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XHJcbiAgICAgICAgICAgIGl0ZW1bcGFydF0gPSBtYXAodmFsW2pdKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XHJcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcclxuICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xyXG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbCkpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xyXG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIGlmIChsb29rdXApIHtcclxuICAgICAgbG9va3VwKG9iaiwgcGFydCwgbWFwKHZhbCkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgb2JqW3BhcnRdID0gbWFwKHZhbCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKiFcclxuICogUmV0dXJucyB0aGUgdmFsdWUgcGFzc2VkIHRvIGl0LlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEsgKHYpIHtcclxuICByZXR1cm4gdjtcclxufSIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXHJcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxyXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxuICAsIFR5cGVzXHJcbiAgLCBzY2hlbWFzO1xyXG5cclxuLyoqXHJcbiAqIFNjaGVtYSBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgY2hpbGQgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pO1xyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcsIGFnZTogTnVtYmVyLCBjaGlsZHJlbjogW2NoaWxkXSB9KTtcclxuICogICAgIHZhciBUcmVlID0gbW9uZ29vc2UubW9kZWwoJ1RyZWUnLCBzY2hlbWEpO1xyXG4gKlxyXG4gKiAgICAgLy8gc2V0dGluZyBzY2hlbWEgb3B0aW9uc1xyXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9LCB7IF9pZDogZmFsc2UsIGF1dG9JbmRleDogZmFsc2UgfSlcclxuICpcclxuICogIyMjI09wdGlvbnM6XHJcbiAqXHJcbiAqIC0gW2NvbGxlY3Rpb25dKC9kb2NzL2d1aWRlLmh0bWwjY29sbGVjdGlvbik6IHN0cmluZyAtIG5vIGRlZmF1bHRcclxuICogLSBbaWRdKC9kb2NzL2d1aWRlLmh0bWwjaWQpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxyXG4gKiAtIGBtaW5pbWl6ZWA6IGJvb2wgLSBjb250cm9scyBbZG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkgYmVoYXZpb3Igd2hlbiBjYWxsZWQgbWFudWFsbHkgLSBkZWZhdWx0cyB0byB0cnVlXHJcbiAqIC0gW3N0cmljdF0oL2RvY3MvZ3VpZGUuaHRtbCNzdHJpY3QpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxyXG4gKiAtIFt0b0pTT05dKC9kb2NzL2d1aWRlLmh0bWwjdG9KU09OKSAtIG9iamVjdCAtIG5vIGRlZmF1bHRcclxuICogLSBbdG9PYmplY3RdKC9kb2NzL2d1aWRlLmh0bWwjdG9PYmplY3QpIC0gb2JqZWN0IC0gbm8gZGVmYXVsdFxyXG4gKiAtIFt2ZXJzaW9uS2V5XSgvZG9jcy9ndWlkZS5odG1sI3ZlcnNpb25LZXkpOiBib29sIC0gZGVmYXVsdHMgdG8gXCJfX3ZcIlxyXG4gKlxyXG4gKiAjIyMjTm90ZTpcclxuICpcclxuICogX1doZW4gbmVzdGluZyBzY2hlbWFzLCAoYGNoaWxkcmVuYCBpbiB0aGUgZXhhbXBsZSBhYm92ZSksIGFsd2F5cyBkZWNsYXJlIHRoZSBjaGlsZCBzY2hlbWEgZmlyc3QgYmVmb3JlIHBhc3NpbmcgaXQgaW50byBpcyBwYXJlbnQuX1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ3x1bmRlZmluZWR9IFtuYW1lXSDQndCw0LfQstCw0L3QuNC1INGB0YXQtdC80YtcclxuICogQHBhcmFtIHtTY2hlbWF9IFtiYXNlU2NoZW1hXSDQkdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwINC/0YDQuCDQvdCw0YHQu9C10LTQvtCy0LDQvdC40LhcclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiDQodGF0LXQvNCwXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbmZ1bmN0aW9uIFNjaGVtYSAoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApIHtcclxuICBpZiAoICEodGhpcyBpbnN0YW5jZW9mIFNjaGVtYSkgKVxyXG4gICAgcmV0dXJuIG5ldyBTY2hlbWEoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApO1xyXG5cclxuICAvLyDQldGB0LvQuCDRjdGC0L4g0LjQvNC10L3QvtCy0LDQvdCw0Y8g0YHRhdC10LzQsFxyXG4gIGlmICggdHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnICl7XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgc2NoZW1hc1sgbmFtZSBdID0gdGhpcztcclxuICB9IGVsc2Uge1xyXG4gICAgb3B0aW9ucyA9IG9iajtcclxuICAgIG9iaiA9IGJhc2VTY2hlbWE7XHJcbiAgICBiYXNlU2NoZW1hID0gbmFtZTtcclxuICAgIG5hbWUgPSB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBpZiAoICEoYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkgKXtcclxuICAgIG9wdGlvbnMgPSBvYmo7XHJcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xyXG4gICAgYmFzZVNjaGVtYSA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXHJcbiAgdGhpcy5zb3VyY2UgPSBvYmo7XHJcblxyXG4gIHRoaXMucGF0aHMgPSB7fTtcclxuICB0aGlzLnN1YnBhdGhzID0ge307XHJcbiAgdGhpcy52aXJ0dWFscyA9IHt9O1xyXG4gIHRoaXMubmVzdGVkID0ge307XHJcbiAgdGhpcy5pbmhlcml0cyA9IHt9O1xyXG4gIHRoaXMuY2FsbFF1ZXVlID0gW107XHJcbiAgdGhpcy5tZXRob2RzID0ge307XHJcbiAgdGhpcy5zdGF0aWNzID0ge307XHJcbiAgdGhpcy50cmVlID0ge307XHJcbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDtcclxuICB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0gdW5kZWZpbmVkO1xyXG5cclxuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmRlZmF1bHRPcHRpb25zKCBvcHRpb25zICk7XHJcblxyXG4gIGlmICggYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSApe1xyXG4gICAgYmFzZVNjaGVtYS5kaXNjcmltaW5hdG9yKCBuYW1lLCB0aGlzICk7XHJcblxyXG4gICAgLy90aGlzLmRpc2NyaW1pbmF0b3IoIG5hbWUsIGJhc2VTY2hlbWEgKTtcclxuICB9XHJcblxyXG4gIC8vIGJ1aWxkIHBhdGhzXHJcbiAgaWYgKCBvYmogKSB7XHJcbiAgICB0aGlzLmFkZCggb2JqICk7XHJcbiAgfVxyXG5cclxuICAvLyBlbnN1cmUgdGhlIGRvY3VtZW50cyBnZXQgYW4gYXV0byBfaWQgdW5sZXNzIGRpc2FibGVkXHJcbiAgdmFyIGF1dG9faWQgPSAhdGhpcy5wYXRoc1snX2lkJ10gJiYgKCF0aGlzLm9wdGlvbnMubm9JZCAmJiB0aGlzLm9wdGlvbnMuX2lkKTtcclxuICBpZiAoYXV0b19pZCkge1xyXG4gICAgdGhpcy5hZGQoeyBfaWQ6IHt0eXBlOiBTY2hlbWEuT2JqZWN0SWQsIGF1dG86IHRydWV9IH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgcmVjZWl2ZSBhbiBpZCBnZXR0ZXIgdW5sZXNzIGRpc2FibGVkXHJcbiAgdmFyIGF1dG9pZCA9ICF0aGlzLnBhdGhzWydpZCddICYmIHRoaXMub3B0aW9ucy5pZDtcclxuICBpZiAoIGF1dG9pZCApIHtcclxuICAgIHRoaXMudmlydHVhbCgnaWQnKS5nZXQoIGlkR2V0dGVyICk7XHJcbiAgfVxyXG59XHJcblxyXG4vKiFcclxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBfaWQgY2FzdCB0byBhIHN0cmluZy5cclxuICovXHJcbmZ1bmN0aW9uIGlkR2V0dGVyICgpIHtcclxuICBpZiAodGhpcy4kX18uX2lkKSB7XHJcbiAgICByZXR1cm4gdGhpcy4kX18uX2lkO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMuJF9fLl9pZCA9IG51bGwgPT0gdGhpcy5faWRcclxuICAgID8gbnVsbFxyXG4gICAgOiBTdHJpbmcodGhpcy5faWQpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdCBmcm9tIEV2ZW50RW1pdHRlci5cclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBFdmVudHMucHJvdG90eXBlICk7XHJcblNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2hlbWE7XHJcblxyXG4vKipcclxuICogU2NoZW1hIGFzIGZsYXQgcGF0aHNcclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqICAgICB7XHJcbiAqICAgICAgICAgJ19pZCcgICAgICAgIDogU2NoZW1hVHlwZSxcclxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQHByb3BlcnR5IHBhdGhzXHJcbiAqL1xyXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xyXG5cclxuLyoqXHJcbiAqIFNjaGVtYSBhcyBhIHRyZWVcclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqICAgICB7XHJcbiAqICAgICAgICAgJ19pZCcgICAgIDogT2JqZWN0SWRcclxuICogICAgICAgLCAnbmVzdGVkJyAgOiB7XHJcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXHJcbiAqICAgICAgICAgfVxyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQHByb3BlcnR5IHRyZWVcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUudHJlZTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGRlZmF1bHQgb3B0aW9ucyBmb3IgdGhpcyBzY2hlbWEsIG1lcmdlZCB3aXRoIGBvcHRpb25zYC5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUuZGVmYXVsdE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIG9wdGlvbnMgPSAkLmV4dGVuZCh7XHJcbiAgICAgIHN0cmljdDogdHJ1ZVxyXG4gICAgLCB2ZXJzaW9uS2V5OiAnX192J1xyXG4gICAgLCBkaXNjcmltaW5hdG9yS2V5OiAnX190J1xyXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxyXG4gICAgLy8gdGhlIGZvbGxvd2luZyBhcmUgb25seSBhcHBsaWVkIGF0IGNvbnN0cnVjdGlvbiB0aW1lXHJcbiAgICAsIF9pZDogdHJ1ZVxyXG4gICAgLCBpZDogdHJ1ZVxyXG4gIH0sIG9wdGlvbnMgKTtcclxuXHJcbiAgcmV0dXJuIG9wdGlvbnM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBrZXkgcGF0aCAvIHNjaGVtYSB0eXBlIHBhaXJzIHRvIHRoaXMgc2NoZW1hLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBUb3lTY2hlbWEgPSBuZXcgU2NoZW1hO1xyXG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xyXG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcclxuXHJcbiAgICBpZiAobnVsbCA9PSBvYmpbIGtleSBdKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgdmFsdWUgZm9yIHNjaGVtYSBwYXRoIGAnKyBwcmVmaXggKyBrZXkgKydgJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCBfLmlzUGxhaW5PYmplY3Qob2JqW2tleV0gKVxyXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IG9ialsga2V5IF0uY29uc3RydWN0b3IubmFtZSApXHJcbiAgICAgICYmICggIW9ialsga2V5IF0udHlwZSB8fCBvYmpbIGtleSBdLnR5cGUudHlwZSApICl7XHJcblxyXG4gICAgICBpZiAoIE9iamVjdC5rZXlzKG9ialsga2V5IF0pLmxlbmd0aCApIHtcclxuICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0IHsgbGFzdDogeyBuYW1lOiBTdHJpbmcgfX1cclxuICAgICAgICB0aGlzLm5lc3RlZFsgcHJlZml4ICsga2V5IF0gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuYWRkKCBvYmpbIGtleSBdLCBwcmVmaXggKyBrZXkgKyAnLicpO1xyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApOyAvLyBtaXhlZCB0eXBlXHJcbiAgICAgIH1cclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNlcnZlZCBkb2N1bWVudCBrZXlzLlxyXG4gKlxyXG4gKiBLZXlzIGluIHRoaXMgb2JqZWN0IGFyZSBuYW1lcyB0aGF0IGFyZSByZWplY3RlZCBpbiBzY2hlbWEgZGVjbGFyYXRpb25zIGIvYyB0aGV5IGNvbmZsaWN0IHdpdGggbW9uZ29vc2UgZnVuY3Rpb25hbGl0eS4gVXNpbmcgdGhlc2Uga2V5IG5hbWUgd2lsbCB0aHJvdyBhbiBlcnJvci5cclxuICpcclxuICogICAgICBvbiwgZW1pdCwgX2V2ZW50cywgZGIsIGdldCwgc2V0LCBpbml0LCBpc05ldywgZXJyb3JzLCBzY2hlbWEsIG9wdGlvbnMsIG1vZGVsTmFtZSwgY29sbGVjdGlvbiwgX3ByZXMsIF9wb3N0cywgdG9PYmplY3RcclxuICpcclxuICogX05PVEU6XyBVc2Ugb2YgdGhlc2UgdGVybXMgYXMgbWV0aG9kIG5hbWVzIGlzIHBlcm1pdHRlZCwgYnV0IHBsYXkgYXQgeW91ciBvd24gcmlzaywgYXMgdGhleSBtYXkgYmUgZXhpc3RpbmcgbW9uZ29vc2UgZG9jdW1lbnQgbWV0aG9kcyB5b3UgYXJlIHN0b21waW5nIG9uLlxyXG4gKlxyXG4gKiAgICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcclxuICogICAgICBzY2hlbWEubWV0aG9kcy5pbml0ID0gZnVuY3Rpb24gKCkge30gLy8gcG90ZW50aWFsbHkgYnJlYWtpbmdcclxuICovXHJcblNjaGVtYS5yZXNlcnZlZCA9IE9iamVjdC5jcmVhdGUoIG51bGwgKTtcclxudmFyIHJlc2VydmVkID0gU2NoZW1hLnJlc2VydmVkO1xyXG5yZXNlcnZlZC5vbiA9XHJcbnJlc2VydmVkLmRiID1cclxucmVzZXJ2ZWQuZ2V0ID1cclxucmVzZXJ2ZWQuc2V0ID1cclxucmVzZXJ2ZWQuaW5pdCA9XHJcbnJlc2VydmVkLmlzTmV3ID1cclxucmVzZXJ2ZWQuZXJyb3JzID1cclxucmVzZXJ2ZWQuc2NoZW1hID1cclxucmVzZXJ2ZWQub3B0aW9ucyA9XHJcbnJlc2VydmVkLm1vZGVsTmFtZSA9XHJcbnJlc2VydmVkLmNvbGxlY3Rpb24gPVxyXG5yZXNlcnZlZC50b09iamVjdCA9XHJcbnJlc2VydmVkLmRvbWFpbiA9XHJcbnJlc2VydmVkLmVtaXQgPSAgICAvLyBFdmVudEVtaXR0ZXJcclxucmVzZXJ2ZWQuX2V2ZW50cyA9IC8vIEV2ZW50RW1pdHRlclxyXG5yZXNlcnZlZC5fcHJlcyA9IHJlc2VydmVkLl9wb3N0cyA9IDE7IC8vIGhvb2tzLmpzXHJcblxyXG4vKipcclxuICogR2V0cy9zZXRzIHNjaGVtYSBwYXRocy5cclxuICpcclxuICogU2V0cyBhIHBhdGggKGlmIGFyaXR5IDIpXHJcbiAqIEdldHMgYSBwYXRoIChpZiBhcml0eSAxKVxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZVxyXG4gKlxyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKSAvLyByZXR1cm5zIGEgU2NoZW1hVHlwZVxyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnLCBOdW1iZXIpIC8vIGNoYW5nZXMgdGhlIHNjaGVtYVR5cGUgb2YgYG5hbWVgIHRvIE51bWJlclxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge09iamVjdH0gY29uc3RydWN0b3JcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBvYmopIHtcclxuICBpZiAob2JqID09IHVuZGVmaW5lZCkge1xyXG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnBhdGhzW3BhdGhdO1xyXG4gICAgaWYgKHRoaXMuc3VicGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnN1YnBhdGhzW3BhdGhdO1xyXG5cclxuICAgIC8vIHN1YnBhdGhzP1xyXG4gICAgcmV0dXJuIC9cXC5cXGQrXFwuPy4qJC8udGVzdChwYXRoKVxyXG4gICAgICA/IGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpXHJcbiAgICAgIDogdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgLy8gc29tZSBwYXRoIG5hbWVzIGNvbmZsaWN0IHdpdGggZG9jdW1lbnQgbWV0aG9kc1xyXG4gIGlmIChyZXNlcnZlZFtwYXRoXSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYFwiICsgcGF0aCArIFwiYCBtYXkgbm90IGJlIHVzZWQgYXMgYSBzY2hlbWEgcGF0aG5hbWVcIik7XHJcbiAgfVxyXG5cclxuICAvLyB1cGRhdGUgdGhlIHRyZWVcclxuICB2YXIgc3VicGF0aHMgPSBwYXRoLnNwbGl0KC9cXC4vKVxyXG4gICAgLCBsYXN0ID0gc3VicGF0aHMucG9wKClcclxuICAgICwgYnJhbmNoID0gdGhpcy50cmVlO1xyXG5cclxuICBzdWJwYXRocy5mb3JFYWNoKGZ1bmN0aW9uKHN1YiwgaSkge1xyXG4gICAgaWYgKCFicmFuY2hbc3ViXSkgYnJhbmNoW3N1Yl0gPSB7fTtcclxuICAgIGlmICgnb2JqZWN0JyAhPSB0eXBlb2YgYnJhbmNoW3N1Yl0pIHtcclxuICAgICAgdmFyIG1zZyA9ICdDYW5ub3Qgc2V0IG5lc3RlZCBwYXRoIGAnICsgcGF0aCArICdgLiAnXHJcbiAgICAgICAgICAgICAgKyAnUGFyZW50IHBhdGggYCdcclxuICAgICAgICAgICAgICArIHN1YnBhdGhzLnNsaWNlKDAsIGkpLmNvbmNhdChbc3ViXSkuam9pbignLicpXHJcbiAgICAgICAgICAgICAgKyAnYCBhbHJlYWR5IHNldCB0byB0eXBlICcgKyBicmFuY2hbc3ViXS5uYW1lXHJcbiAgICAgICAgICAgICAgKyAnLic7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG4gICAgfVxyXG4gICAgYnJhbmNoID0gYnJhbmNoW3N1Yl07XHJcbiAgfSk7XHJcblxyXG4gIGJyYW5jaFtsYXN0XSA9IHV0aWxzLmNsb25lKG9iaik7XHJcblxyXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIG9iaik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdHlwZSBhcmd1bWVudHMgaW50byBTY2hlbWEgVHlwZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogY29uc3RydWN0b3JcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TY2hlbWEuaW50ZXJwcmV0QXNUeXBlID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xyXG4gIGlmIChvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gJ09iamVjdCcpXHJcbiAgICBvYmogPSB7IHR5cGU6IG9iaiB9O1xyXG5cclxuICAvLyBHZXQgdGhlIHR5cGUgbWFraW5nIHN1cmUgdG8gYWxsb3cga2V5cyBuYW1lZCBcInR5cGVcIlxyXG4gIC8vIGFuZCBkZWZhdWx0IHRvIG1peGVkIGlmIG5vdCBzcGVjaWZpZWQuXHJcbiAgLy8geyB0eXBlOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2ZyZXNoY3V0JyB9IH1cclxuICB2YXIgdHlwZSA9IG9iai50eXBlICYmICFvYmoudHlwZS50eXBlXHJcbiAgICA/IG9iai50eXBlXHJcbiAgICA6IHt9O1xyXG5cclxuICBpZiAoJ09iamVjdCcgPT0gdHlwZS5jb25zdHJ1Y3Rvci5uYW1lIHx8ICdtaXhlZCcgPT0gdHlwZSkge1xyXG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xyXG4gIH1cclxuXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcclxuICAgIC8vIGlmIGl0IHdhcyBzcGVjaWZpZWQgdGhyb3VnaCB7IHR5cGUgfSBsb29rIGZvciBgY2FzdGBcclxuICAgIHZhciBjYXN0ID0gKEFycmF5ID09IHR5cGUgfHwgJ2FycmF5JyA9PSB0eXBlKVxyXG4gICAgICA/IG9iai5jYXN0XHJcbiAgICAgIDogdHlwZVswXTtcclxuXHJcbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xyXG4gICAgICByZXR1cm4gbmV3IFR5cGVzLkRvY3VtZW50QXJyYXkocGF0aCwgY2FzdCwgb2JqKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIGNhc3QpIHtcclxuICAgICAgY2FzdCA9IFR5cGVzW2Nhc3QuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYXN0LnN1YnN0cmluZygxKV07XHJcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgJ09iamVjdCcgPT0gY2FzdC5jb25zdHJ1Y3Rvci5uYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMoY2FzdCkubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBuZXcgU2NoZW1hKGNhc3QpLCBvYmopO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXcgVHlwZXMuQXJyYXkocGF0aCwgY2FzdCB8fCBUeXBlcy5NaXhlZCwgb2JqKTtcclxuICB9XHJcblxyXG4gIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIHR5cGVcclxuICAgID8gdHlwZVxyXG4gICAgOiB0eXBlLm5hbWU7XHJcblxyXG4gIGlmIChuYW1lKSB7XHJcbiAgICBuYW1lID0gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHVuZGVmaW5lZCA9PSBUeXBlc1tuYW1lXSkge1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5kZWZpbmVkIHR5cGUgYXQgYCcgKyBwYXRoICtcclxuICAgICAgICAnYFxcbiAgRGlkIHlvdSB0cnkgbmVzdGluZyBTY2hlbWFzPyAnICtcclxuICAgICAgICAnWW91IGNhbiBvbmx5IG5lc3QgdXNpbmcgcmVmcyBvciBhcnJheXMuJyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IFR5cGVzW25hbWVdKHBhdGgsIG9iaik7XHJcbn07XHJcblxyXG4vKipcclxuICogSXRlcmF0ZXMgdGhlIHNjaGVtYXMgcGF0aHMgc2ltaWxhciB0byBBcnJheSNmb3JFYWNoLlxyXG4gKlxyXG4gKiBUaGUgY2FsbGJhY2sgaXMgcGFzc2VkIHRoZSBwYXRobmFtZSBhbmQgc2NoZW1hVHlwZSBhcyBhcmd1bWVudHMgb24gZWFjaCBpdGVyYXRpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm4ge1NjaGVtYX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5lYWNoUGF0aCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcclxuICAgICwgbGVuID0ga2V5cy5sZW5ndGg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcclxuICAgIGZuKGtleXNbaV0sIHRoaXMucGF0aHNba2V5c1tpXV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhbiBBcnJheSBvZiBwYXRoIHN0cmluZ3MgdGhhdCBhcmUgcmVxdWlyZWQgYnkgdGhpcyBzY2hlbWEuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5yZXF1aXJlZFBhdGhzID0gZnVuY3Rpb24gcmVxdWlyZWRQYXRocyAoKSB7XHJcbiAgaWYgKHRoaXMuX3JlcXVpcmVkcGF0aHMpIHJldHVybiB0aGlzLl9yZXF1aXJlZHBhdGhzO1xyXG5cclxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLnBhdGhzKVxyXG4gICAgLCBpID0gcGF0aHMubGVuZ3RoXHJcbiAgICAsIHJldCA9IFtdO1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICB2YXIgcGF0aCA9IHBhdGhzW2ldO1xyXG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0uaXNSZXF1aXJlZCkgcmV0LnB1c2gocGF0aCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5fcmVxdWlyZWRwYXRocyA9IHJldDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBwYXRoVHlwZSBvZiBgcGF0aGAgZm9yIHRoaXMgc2NoZW1hLlxyXG4gKlxyXG4gKiBHaXZlbiBhIHBhdGgsIHJldHVybnMgd2hldGhlciBpdCBpcyBhIHJlYWwsIHZpcnR1YWwsIG5lc3RlZCwgb3IgYWQtaG9jL3VuZGVmaW5lZCBwYXRoLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWEucHJvdG90eXBlLnBhdGhUeXBlID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICBpZiAocGF0aCBpbiB0aGlzLnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xyXG4gIGlmIChwYXRoIGluIHRoaXMudmlydHVhbHMpIHJldHVybiAndmlydHVhbCc7XHJcbiAgaWYgKHBhdGggaW4gdGhpcy5uZXN0ZWQpIHJldHVybiAnbmVzdGVkJztcclxuICBpZiAocGF0aCBpbiB0aGlzLnN1YnBhdGhzKSByZXR1cm4gJ3JlYWwnO1xyXG5cclxuICBpZiAoL1xcLlxcZCtcXC58XFwuXFxkKyQvLnRlc3QocGF0aCkgJiYgZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aCkpIHtcclxuICAgIHJldHVybiAncmVhbCc7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiAnYWRob2NPclVuZGVmaW5lZCdcclxuICB9XHJcbn07XHJcblxyXG4vKiFcclxuICogaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRQb3NpdGlvbmFsUGF0aCAoc2VsZiwgcGF0aCkge1xyXG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLihcXGQrKVxcLnxcXC4oXFxkKykkLykuZmlsdGVyKEJvb2xlYW4pO1xyXG4gIGlmIChzdWJwYXRocy5sZW5ndGggPCAyKSB7XHJcbiAgICByZXR1cm4gc2VsZi5wYXRoc1tzdWJwYXRoc1swXV07XHJcbiAgfVxyXG5cclxuICB2YXIgdmFsID0gc2VsZi5wYXRoKHN1YnBhdGhzWzBdKTtcclxuICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcclxuXHJcbiAgdmFyIGxhc3QgPSBzdWJwYXRocy5sZW5ndGggLSAxXHJcbiAgICAsIHN1YnBhdGhcclxuICAgICwgaSA9IDE7XHJcblxyXG4gIGZvciAoOyBpIDwgc3VicGF0aHMubGVuZ3RoOyArK2kpIHtcclxuICAgIHN1YnBhdGggPSBzdWJwYXRoc1tpXTtcclxuXHJcbiAgICBpZiAoaSA9PT0gbGFzdCAmJiB2YWwgJiYgIXZhbC5zY2hlbWEgJiYgIS9cXEQvLnRlc3Qoc3VicGF0aCkpIHtcclxuICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFR5cGVzLkFycmF5KSB7XHJcbiAgICAgICAgLy8gU3RyaW5nU2NoZW1hLCBOdW1iZXJTY2hlbWEsIGV0Y1xyXG4gICAgICAgIHZhbCA9IHZhbC5jYXN0ZXI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFsID0gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlnbm9yZSBpZiBpdHMganVzdCBhIHBvc2l0aW9uIHNlZ21lbnQ6IHBhdGguMC5zdWJwYXRoXHJcbiAgICBpZiAoIS9cXEQvLnRlc3Qoc3VicGF0aCkpIGNvbnRpbnVlO1xyXG5cclxuICAgIGlmICghKHZhbCAmJiB2YWwuc2NoZW1hKSkge1xyXG4gICAgICB2YWwgPSB1bmRlZmluZWQ7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHZhbCA9IHZhbC5zY2hlbWEucGF0aChzdWJwYXRoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzW3BhdGhdID0gdmFsO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkcyBhIG1ldGhvZCBjYWxsIHRvIHRoZSBxdWV1ZS5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgZG9jdW1lbnQgbWV0aG9kIHRvIGNhbGwgbGF0ZXJcclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xyXG4gIHRoaXMuY2FsbFF1ZXVlLnB1c2goW25hbWUsIGFyZ3NdKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgcHJlIGhvb2sgZm9yIHRoZSBkb2N1bWVudC5cclxuICpcclxuICogIyMjI0V4YW1wbGVcclxuICpcclxuICogICAgIHZhciB0b3lTY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcclxuICpcclxuICogICAgIHRveVNjaGVtYS5wcmUoJ3NhdmUnLCBmdW5jdGlvbiAobmV4dCkge1xyXG4gKiAgICAgICBpZiAoIXRoaXMuY3JlYXRlZCkgdGhpcy5jcmVhdGVkID0gbmV3IERhdGU7XHJcbiAqICAgICAgIG5leHQoKTtcclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICB0b3lTY2hlbWEucHJlKCd2YWxpZGF0ZScsIGZ1bmN0aW9uIChuZXh0KSB7XHJcbiAqICAgICAgIGlmICh0aGlzLm5hbWUgIT0gJ1dvb2R5JykgdGhpcy5uYW1lID0gJ1dvb2R5JztcclxuICogICAgICAgbmV4dCgpO1xyXG4gKiAgICAgfSlcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xyXG4gKiBAc2VlIGhvb2tzLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24oKXtcclxuICByZXR1cm4gdGhpcy5xdWV1ZSgncHJlJywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgcG9zdCBmb3IgdGhlIGRvY3VtZW50XHJcbiAqXHJcbiAqIFBvc3QgaG9va3MgZmlyZSBgb25gIHRoZSBldmVudCBlbWl0dGVkIGZyb20gZG9jdW1lbnQgaW5zdGFuY2VzIG9mIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxyXG4gKlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xyXG4gKiAgICAgc2NoZW1hLnBvc3QoJ3NhdmUnLCBmdW5jdGlvbiAoZG9jKSB7XHJcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVkIGFmdGVyIGEgZG9jdW1lbnQgd2FzIHNhdmVkJyk7XHJcbiAqICAgICB9KTtcclxuICpcclxuICogICAgIHZhciBNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKCdNb2RlbCcsIHNjaGVtYSk7XHJcbiAqXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNb2RlbCguLik7XHJcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZygndGhpcyBmaXJlcyBhZnRlciB0aGUgYHBvc3RgIGhvb2snKTtcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIG5hbWUgb2YgdGhlIG1ldGhvZCB0byBob29rXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxiYWNrXHJcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24obWV0aG9kLCBmbil7XHJcbiAgcmV0dXJuIHRoaXMucXVldWUoJ29uJywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcnMgYSBwbHVnaW4gZm9yIHRoaXMgc2NoZW1hLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBwbHVnaW4gY2FsbGJhY2tcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcclxuICogQHNlZSBwbHVnaW5zXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWEucHJvdG90eXBlLnBsdWdpbiA9IGZ1bmN0aW9uIChmbiwgb3B0cykge1xyXG4gIGZuKHRoaXMsIG9wdHMpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYW4gaW5zdGFuY2UgbWV0aG9kIHRvIGRvY3VtZW50cyBjb25zdHJ1Y3RlZCBmcm9tIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZVxyXG4gKlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IGtpdHR5U2NoZW1hID0gbmV3IFNjaGVtYSguLik7XHJcbiAqXHJcbiAqICAgICBzY2hlbWEubWV0aG9kKCdtZW93JywgZnVuY3Rpb24gKCkge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZygnbWVlZWVlb29vb29vb29vb29vdycpO1xyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIHZhciBLaXR0eSA9IG1vbmdvb3NlLm1vZGVsKCdLaXR0eScsIHNjaGVtYSk7XHJcbiAqXHJcbiAqICAgICB2YXIgZml6eiA9IG5ldyBLaXR0eTtcclxuICogICAgIGZpenoubWVvdygpOyAvLyBtZWVlZWVvb29vb29vb29vb29vd1xyXG4gKlxyXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgbWV0aG9kcy5cclxuICpcclxuICogICAgIHNjaGVtYS5tZXRob2Qoe1xyXG4gKiAgICAgICAgIHB1cnI6IGZ1bmN0aW9uICgpIHt9XHJcbiAqICAgICAgICwgc2NyYXRjaDogZnVuY3Rpb24gKCkge31cclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiAgICAgLy8gbGF0ZXJcclxuICogICAgIGZpenoucHVycigpO1xyXG4gKiAgICAgZml6ei5zY3JhdGNoKCk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbWV0aG9kIG5hbWVcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcclxuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXHJcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpXHJcbiAgICAgIHRoaXMubWV0aG9kc1tpXSA9IG5hbWVbaV07XHJcbiAgZWxzZVxyXG4gICAgdGhpcy5tZXRob2RzW25hbWVdID0gZm47XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBzdGF0aWMgXCJjbGFzc1wiIG1ldGhvZHMgdG8gTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlXHJcbiAqXHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSguLik7XHJcbiAqICAgICBzY2hlbWEuc3RhdGljKCdmaW5kQnlOYW1lJywgZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XHJcbiAqICAgICAgIHJldHVybiB0aGlzLmZpbmQoeyBuYW1lOiBuYW1lIH0sIGNhbGxiYWNrKTtcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiAgICAgdmFyIERyaW5rID0gbW9uZ29vc2UubW9kZWwoJ0RyaW5rJywgc2NoZW1hKTtcclxuICogICAgIERyaW5rLmZpbmRCeU5hbWUoJ3NhbnBlbGxlZ3Jpbm8nLCBmdW5jdGlvbiAoZXJyLCBkcmlua3MpIHtcclxuICogICAgICAgLy9cclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgc3RhdGljcy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUuc3RhdGljID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIG5hbWUpXHJcbiAgICBmb3IgKHZhciBpIGluIG5hbWUpXHJcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XHJcbiAgZWxzZVxyXG4gICAgdGhpcy5zdGF0aWNzW25hbWVdID0gZm47XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cy9nZXRzIGEgc2NoZW1hIG9wdGlvbi5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBpZiBub3QgcGFzc2VkLCB0aGUgY3VycmVudCBvcHRpb24gdmFsdWUgaXMgcmV0dXJuZWRcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xyXG4gIH1cclxuXHJcbiAgc3dpdGNoIChrZXkpIHtcclxuICAgIGNhc2UgJ3NhZmUnOlxyXG4gICAgICB0aGlzLm9wdGlvbnNba2V5XSA9IGZhbHNlID09PSB2YWx1ZVxyXG4gICAgICAgID8geyB3OiAwIH1cclxuICAgICAgICA6IHZhbHVlO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRoaXMub3B0aW9uc1trZXldID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIGEgc2NoZW1hIG9wdGlvbi5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblNjaGVtYS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xyXG4gIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIG5hbWUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cclxuICogQHJldHVybiB7VmlydHVhbFR5cGV9XHJcbiAqL1xyXG5cclxuU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFsID0gZnVuY3Rpb24gKG5hbWUsIG9wdGlvbnMpIHtcclxuICB2YXIgdmlydHVhbHMgPSB0aGlzLnZpcnR1YWxzO1xyXG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJy4nKTtcclxuICByZXR1cm4gdmlydHVhbHNbbmFtZV0gPSBwYXJ0cy5yZWR1Y2UoZnVuY3Rpb24gKG1lbSwgcGFydCwgaSkge1xyXG4gICAgbWVtW3BhcnRdIHx8IChtZW1bcGFydF0gPSAoaSA9PT0gcGFydHMubGVuZ3RoLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IG5ldyBWaXJ0dWFsVHlwZShvcHRpb25zLCBuYW1lKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB7fSk7XHJcbiAgICByZXR1cm4gbWVtW3BhcnRdO1xyXG4gIH0sIHRoaXMudHJlZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGUgdmlydHVhbCB0eXBlIHdpdGggdGhlIGdpdmVuIGBuYW1lYC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcclxuICogQHJldHVybiB7VmlydHVhbFR5cGV9XHJcbiAqL1xyXG5cclxuU2NoZW1hLnByb3RvdHlwZS52aXJ0dWFscGF0aCA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgcmV0dXJuIHRoaXMudmlydHVhbHNbbmFtZV07XHJcbn07XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJlZCBkaXNjcmltaW5hdG9ycyBmb3IgdGhpcyBzY2hlbWEuXHJcbiAqXHJcbiAqIEBwcm9wZXJ0eSBkaXNjcmltaW5hdG9yc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hLmRpc2NyaW1pbmF0b3JzO1xyXG5cclxuLyoqXHJcbiAqINCd0LDRgdC70LXQtNC+0LLQsNC90LjQtSDQvtGCINGB0YXQtdC80YsuXHJcbiAqIHRoaXMgLSDQsdCw0LfQvtCy0LDRjyDRgdGF0LXQvNCwISEhXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKiAgICAgdmFyIFBlcnNvblNjaGVtYSA9IG5ldyBTY2hlbWEoJ1BlcnNvbicsIHtcclxuICogICAgICAgbmFtZTogU3RyaW5nLFxyXG4gKiAgICAgICBjcmVhdGVkQXQ6IERhdGVcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiAgICAgdmFyIEJvc3NTY2hlbWEgPSBuZXcgU2NoZW1hKCdCb3NzJywgUGVyc29uU2NoZW1hLCB7IGRlcGFydG1lbnQ6IFN0cmluZyB9KTtcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgICBkaXNjcmltaW5hdG9yIG1vZGVsIG5hbWVcclxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSBkaXNjcmltaW5hdG9yIG1vZGVsIHNjaGVtYVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hLnByb3RvdHlwZS5kaXNjcmltaW5hdG9yID0gZnVuY3Rpb24gZGlzY3JpbWluYXRvciAobmFtZSwgc2NoZW1hKSB7XHJcbiAgaWYgKCEoc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hKSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG11c3QgcGFzcyBhIHZhbGlkIGRpc2NyaW1pbmF0b3IgU2NoZW1hXCIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCB0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nICYmICF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdCApIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW4gb25seSBiZSBhIGRpc2NyaW1pbmF0b3Igb2YgdGhlIHJvb3QgbW9kZWxcIik7XHJcbiAgfVxyXG5cclxuICB2YXIga2V5ID0gdGhpcy5vcHRpb25zLmRpc2NyaW1pbmF0b3JLZXk7XHJcbiAgaWYgKCBzY2hlbWEucGF0aChrZXkpICkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGNhbm5vdCBoYXZlIGZpZWxkIHdpdGggbmFtZSBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XHJcbiAgfVxyXG5cclxuICAvLyBtZXJnZXMgYmFzZSBzY2hlbWEgaW50byBuZXcgZGlzY3JpbWluYXRvciBzY2hlbWEgYW5kIHNldHMgbmV3IHR5cGUgZmllbGQuXHJcbiAgKGZ1bmN0aW9uIG1lcmdlU2NoZW1hcyhzY2hlbWEsIGJhc2VTY2hlbWEpIHtcclxuICAgIHV0aWxzLm1lcmdlKHNjaGVtYSwgYmFzZVNjaGVtYSk7XHJcblxyXG4gICAgdmFyIG9iaiA9IHt9O1xyXG4gICAgb2JqW2tleV0gPSB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogbmFtZSB9O1xyXG4gICAgc2NoZW1hLmFkZChvYmopO1xyXG4gICAgc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG5hbWUsIGlzUm9vdDogZmFsc2UgfTtcclxuXHJcbiAgICBpZiAoYmFzZVNjaGVtYS5vcHRpb25zLmNvbGxlY3Rpb24pIHtcclxuICAgICAgc2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbiA9IGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgICAgLy8gdGhyb3dzIGVycm9yIGlmIG9wdGlvbnMgYXJlIGludmFsaWRcclxuICAgIChmdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbnMoYSwgYikge1xyXG4gICAgICBhID0gdXRpbHMuY2xvbmUoYSk7XHJcbiAgICAgIGIgPSB1dGlscy5jbG9uZShiKTtcclxuICAgICAgZGVsZXRlIGEudG9KU09OO1xyXG4gICAgICBkZWxldGUgYS50b09iamVjdDtcclxuICAgICAgZGVsZXRlIGIudG9KU09OO1xyXG4gICAgICBkZWxldGUgYi50b09iamVjdDtcclxuXHJcbiAgICAgIGlmICghdXRpbHMuZGVlcEVxdWFsKGEsIGIpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciBvcHRpb25zIGFyZSBub3QgY3VzdG9taXphYmxlIChleGNlcHQgdG9KU09OICYgdG9PYmplY3QpXCIpO1xyXG4gICAgICB9XHJcbiAgICB9KShzY2hlbWEub3B0aW9ucywgYmFzZVNjaGVtYS5vcHRpb25zKTtcclxuXHJcbiAgICB2YXIgdG9KU09OID0gc2NoZW1hLm9wdGlvbnMudG9KU09OXHJcbiAgICAgICwgdG9PYmplY3QgPSBzY2hlbWEub3B0aW9ucy50b09iamVjdDtcclxuXHJcbiAgICBzY2hlbWEub3B0aW9ucyA9IHV0aWxzLmNsb25lKGJhc2VTY2hlbWEub3B0aW9ucyk7XHJcbiAgICBpZiAodG9KU09OKSAgIHNjaGVtYS5vcHRpb25zLnRvSlNPTiA9IHRvSlNPTjtcclxuICAgIGlmICh0b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB0b09iamVjdDtcclxuXHJcbiAgICBzY2hlbWEuY2FsbFF1ZXVlID0gYmFzZVNjaGVtYS5jYWxsUXVldWUuY29uY2F0KHNjaGVtYS5jYWxsUXVldWUpO1xyXG4gICAgc2NoZW1hLl9yZXF1aXJlZHBhdGhzID0gdW5kZWZpbmVkOyAvLyByZXNldCBqdXN0IGluIGNhc2UgU2NoZW1hI3JlcXVpcmVkUGF0aHMoKSB3YXMgY2FsbGVkIG9uIGVpdGhlciBzY2hlbWFcclxuICB9KShzY2hlbWEsIHRoaXMpO1xyXG5cclxuICBpZiAoIXRoaXMuZGlzY3JpbWluYXRvcnMpIHtcclxuICAgIHRoaXMuZGlzY3JpbWluYXRvcnMgPSB7fTtcclxuICB9XHJcblxyXG4gIGlmICghdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZykge1xyXG4gICAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBudWxsLCBpc1Jvb3Q6IHRydWUgfTtcclxuICB9XHJcblxyXG4gIGlmICh0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIHdpdGggbmFtZSBcXFwiXCIgKyBuYW1lICsgXCJcXFwiIGFscmVhZHkgZXhpc3RzXCIpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5kaXNjcmltaW5hdG9yc1tuYW1lXSA9IHNjaGVtYTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBleHBvcnRzXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWE7XHJcbndpbmRvdy5TY2hlbWEgPSBTY2hlbWE7XHJcblxyXG4vLyByZXF1aXJlIGRvd24gaGVyZSBiZWNhdXNlIG9mIHJlZmVyZW5jZSBpc3N1ZXNcclxuXHJcbi8qKlxyXG4gKiBUaGUgdmFyaW91cyBidWlsdC1pbiBNb25nb29zZSBTY2hlbWEgVHlwZXMuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcclxuICogICAgIHZhciBPYmplY3RJZCA9IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZDtcclxuICpcclxuICogIyMjI1R5cGVzOlxyXG4gKlxyXG4gKiAtIFtTdHJpbmddKCNzY2hlbWEtc3RyaW5nLWpzKVxyXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxyXG4gKiAtIFtCb29sZWFuXSgjc2NoZW1hLWJvb2xlYW4tanMpIHwgQm9vbFxyXG4gKiAtIFtBcnJheV0oI3NjaGVtYS1hcnJheS1qcylcclxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxyXG4gKiAtIFtPYmplY3RJZF0oI3NjaGVtYS1vYmplY3RpZC1qcykgfCBPaWRcclxuICogLSBbTWl4ZWRdKCNzY2hlbWEtbWl4ZWQtanMpIHwgT2JqZWN0XHJcbiAqXHJcbiAqIFVzaW5nIHRoaXMgZXhwb3NlZCBhY2Nlc3MgdG8gdGhlIGBNaXhlZGAgU2NoZW1hVHlwZSwgd2UgY2FuIHVzZSB0aGVtIGluIG91ciBzY2hlbWEuXHJcbiAqXHJcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XHJcbiAqICAgICBuZXcgbW9uZ29vc2UuU2NoZW1hKHsgX3VzZXI6IE1peGVkIH0pXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWEuVHlwZXMgPSByZXF1aXJlKCcuL3NjaGVtYS9pbmRleCcpO1xyXG5cclxuLy8g0KXRgNCw0L3QuNC70LjRidC1INGB0YXQtdC8XHJcblNjaGVtYS5zY2hlbWFzID0gc2NoZW1hcyA9IHt9O1xyXG5cclxuXHJcbi8qIVxyXG4gKiBpZ25vcmVcclxuICovXHJcblxyXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcclxudmFyIE9iamVjdElkID0gU2NoZW1hLk9iamVjdElkID0gVHlwZXMuT2JqZWN0SWQ7XHJcbiIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXHJcbiAgLCBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvclxyXG4gICwgVHlwZXMgPSB7XHJcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcclxuICAgICAgLCBEYXRlOiByZXF1aXJlKCcuL2RhdGUnKVxyXG4gICAgICAsIE51bWJlcjogcmVxdWlyZSgnLi9udW1iZXInKVxyXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxyXG4gICAgICAsIE9iamVjdElkOiByZXF1aXJlKCcuL29iamVjdGlkJylcclxuICAgIH1cclxuICAsIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2FycmF5JylcclxuICAsIE1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpXHJcbiAgLCBFbWJlZGRlZERvYztcclxuXHJcbi8qKlxyXG4gKiBBcnJheSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBjYXN0XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gU2NoZW1hQXJyYXkgKGtleSwgY2FzdCwgb3B0aW9ucykge1xyXG4gIGlmIChjYXN0KSB7XHJcbiAgICB2YXIgY2FzdE9wdGlvbnMgPSB7fTtcclxuXHJcbiAgICBpZiAoJ09iamVjdCcgPT09IGNhc3QuY29uc3RydWN0b3IubmFtZSkge1xyXG4gICAgICBpZiAoY2FzdC50eXBlKSB7XHJcbiAgICAgICAgLy8gc3VwcG9ydCB7IHR5cGU6IFdvb3QgfVxyXG4gICAgICAgIGNhc3RPcHRpb25zID0gXy5jbG9uZSggY2FzdCApOyAvLyBkbyBub3QgYWx0ZXIgdXNlciBhcmd1bWVudHNcclxuICAgICAgICBkZWxldGUgY2FzdE9wdGlvbnMudHlwZTtcclxuICAgICAgICBjYXN0ID0gY2FzdC50eXBlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhc3QgPSBNaXhlZDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHN1cHBvcnQgeyB0eXBlOiAnU3RyaW5nJyB9XHJcbiAgICB2YXIgbmFtZSA9ICdzdHJpbmcnID09IHR5cGVvZiBjYXN0XHJcbiAgICAgID8gY2FzdFxyXG4gICAgICA6IGNhc3QubmFtZTtcclxuXHJcbiAgICB2YXIgY2FzdGVyID0gbmFtZSBpbiBUeXBlc1xyXG4gICAgICA/IFR5cGVzW25hbWVdXHJcbiAgICAgIDogY2FzdDtcclxuXHJcbiAgICB0aGlzLmNhc3RlckNvbnN0cnVjdG9yID0gY2FzdGVyO1xyXG4gICAgdGhpcy5jYXN0ZXIgPSBuZXcgY2FzdGVyKG51bGwsIGNhc3RPcHRpb25zKTtcclxuXHJcbiAgICAvLyBsYXp5IGxvYWRcclxuICAgIEVtYmVkZGVkRG9jIHx8IChFbWJlZGRlZERvYyA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJykpO1xyXG5cclxuICAgIGlmICghKHRoaXMuY2FzdGVyIGluc3RhbmNlb2YgRW1iZWRkZWREb2MpKSB7XHJcbiAgICAgIHRoaXMuY2FzdGVyLnBhdGggPSBrZXk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zKTtcclxuXHJcbiAgdmFyIHNlbGYgPSB0aGlzXHJcbiAgICAsIGRlZmF1bHRBcnJcclxuICAgICwgZm47XHJcblxyXG4gIGlmICh0aGlzLmRlZmF1bHRWYWx1ZSkge1xyXG4gICAgZGVmYXVsdEFyciA9IHRoaXMuZGVmYXVsdFZhbHVlO1xyXG4gICAgZm4gPSAnZnVuY3Rpb24nID09IHR5cGVvZiBkZWZhdWx0QXJyO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5kZWZhdWx0KGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgYXJyID0gZm4gPyBkZWZhdWx0QXJyKCkgOiBkZWZhdWx0QXJyIHx8IFtdO1xyXG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlQXJyYXkoYXJyLCBzZWxmLnBhdGgsIHRoaXMpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cclxuICovXHJcblNjaGVtYUFycmF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XHJcblNjaGVtYUFycmF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNjaGVtYUFycmF5O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIHJlcXVpcmVkXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUubGVuZ3RoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBPdmVycmlkZXMgdGhlIGdldHRlcnMgYXBwbGljYXRpb24gZm9yIHRoZSBwb3B1bGF0aW9uIHNwZWNpYWwtY2FzZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hQXJyYXkucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcclxuICBpZiAodGhpcy5jYXN0ZXIub3B0aW9ucyAmJiB0aGlzLmNhc3Rlci5vcHRpb25zLnJlZikge1xyXG4gICAgLy8gbWVhbnMgdGhlIG9iamVjdCBpZCB3YXMgcG9wdWxhdGVkXHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzLmNhbGwodGhpcywgdmFsdWUsIHNjb3BlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB2YWx1ZXMgZm9yIHNldCgpLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGRvY3VtZW50IHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcclxuICogQHBhcmFtIHtCb29sZWFufSBpbml0IHdoZXRoZXIgdGhpcyBpcyBhbiBpbml0aWFsaXphdGlvbiBjYXN0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlLCBkb2MsIGluaXQgKSB7XHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICBpZiAoISh2YWx1ZS5pc1N0b3JhZ2VBcnJheSkpIHtcclxuICAgICAgdmFsdWUgPSBuZXcgU3RvcmFnZUFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuY2FzdGVyKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgIHZhbHVlW2ldID0gdGhpcy5jYXN0ZXIuY2FzdCh2YWx1ZVtpXSwgZG9jLCBpbml0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvLyByZXRocm93XHJcbiAgICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcihlLnR5cGUsIHZhbHVlLCB0aGlzLnBhdGgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gdGhpcy5jYXN0KFt2YWx1ZV0sIGRvYywgaW5pdCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hQXJyYXk7XHJcbiIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xyXG5cclxuLyoqXHJcbiAqIEJvb2xlYW4gU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBCb29sZWFuU2NoZW1hIChwYXRoLCBvcHRpb25zKSB7XHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xyXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJvb2xlYW5TY2hlbWE7XHJcblxyXG4vKipcclxuICogUmVxdWlyZWQgdmFsaWRhdG9yXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gZmFsc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FzdHMgdG8gYm9vbGVhblxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgaWYgKG51bGwgPT09IHZhbHVlKSByZXR1cm4gdmFsdWU7XHJcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcclxuICBpZiAoJ3RydWUnID09PSB2YWx1ZSkgcmV0dXJuIHRydWU7XHJcbiAgaWYgKCdmYWxzZScgPT09IHZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgcmV0dXJuICEhIHZhbHVlO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQm9vbGVhblNjaGVtYTtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXHJcbiAqL1xyXG5cclxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJyk7XHJcbnZhciBDYXN0RXJyb3IgPSBTY2hlbWFUeXBlLkNhc3RFcnJvcjtcclxuXHJcbi8qKlxyXG4gKiBEYXRlIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRGF0ZVNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXHJcbiAqL1xyXG5EYXRlU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XHJcbkRhdGVTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGF0ZVNjaGVtYTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3IgZm9yIGRhdGVcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgRGF0ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB0byBkYXRlXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB0byBjYXN0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuRGF0ZVNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgdmFyIGRhdGU7XHJcblxyXG4gIC8vIHN1cHBvcnQgZm9yIHRpbWVzdGFtcHNcclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBOdW1iZXIgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlXHJcbiAgICAgIHx8IFN0cmluZyh2YWx1ZSkgPT0gTnVtYmVyKHZhbHVlKSlcclxuICAgIGRhdGUgPSBuZXcgRGF0ZShOdW1iZXIodmFsdWUpKTtcclxuXHJcbiAgLy8gc3VwcG9ydCBmb3IgZGF0ZSBzdHJpbmdzXHJcbiAgZWxzZSBpZiAodmFsdWUudG9TdHJpbmcpXHJcbiAgICBkYXRlID0gbmV3IERhdGUodmFsdWUudG9TdHJpbmcoKSk7XHJcblxyXG4gIGlmIChkYXRlLnRvU3RyaW5nKCkgIT0gJ0ludmFsaWQgRGF0ZScpXHJcbiAgICByZXR1cm4gZGF0ZTtcclxuXHJcbiAgdGhyb3cgbmV3IENhc3RFcnJvcignZGF0ZScsIHZhbHVlLCB0aGlzLnBhdGggKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhdGVTY2hlbWE7XHJcbiIsIlxyXG4vKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxyXG4gICwgQXJyYXlUeXBlID0gcmVxdWlyZSgnLi9hcnJheScpXHJcbiAgLCBTdG9yYWdlRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzL2RvY3VtZW50YXJyYXknKVxyXG4gICwgU3ViZG9jdW1lbnQgPSByZXF1aXJlKCcuLi90eXBlcy9lbWJlZGRlZCcpXHJcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XHJcblxyXG4vKipcclxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxyXG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFBcnJheVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbmZ1bmN0aW9uIERvY3VtZW50QXJyYXkgKGtleSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcblxyXG4gIC8vIGNvbXBpbGUgYW4gZW1iZWRkZWQgZG9jdW1lbnQgZm9yIHRoaXMgc2NoZW1hXHJcbiAgZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoKSB7XHJcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XHJcbiAgfVxyXG5cclxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFN1YmRvY3VtZW50LnByb3RvdHlwZSApO1xyXG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcclxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS4kX19zZXRTY2hlbWEoIHNjaGVtYSApO1xyXG5cclxuICAvLyBhcHBseSBtZXRob2RzXHJcbiAgZm9yICh2YXIgaSBpbiBzY2hlbWEubWV0aG9kcykge1xyXG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcclxuICB9XHJcblxyXG4gIC8vIGFwcGx5IHN0YXRpY3NcclxuICBmb3IgKHZhciBpIGluIHNjaGVtYS5zdGF0aWNzKSB7XHJcbiAgICBFbWJlZGRlZERvY3VtZW50W2ldID0gc2NoZW1hLnN0YXRpY3NbaV07XHJcbiAgfVxyXG5cclxuICBFbWJlZGRlZERvY3VtZW50Lm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xyXG5cclxuICBBcnJheVR5cGUuY2FsbCh0aGlzLCBrZXksIEVtYmVkZGVkRG9jdW1lbnQsIG9wdGlvbnMpO1xyXG5cclxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcclxuICB2YXIgcGF0aCA9IHRoaXMucGF0aDtcclxuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcclxuXHJcbiAgdGhpcy5kZWZhdWx0KGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSBhcnIgPSBbYXJyXTtcclxuICAgIHJldHVybiBuZXcgU3RvcmFnZURvY3VtZW50QXJyYXkoYXJyLCBwYXRoLCB0aGlzKTtcclxuICB9KTtcclxufVxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gQXJyYXlUeXBlLlxyXG4gKi9cclxuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBBcnJheVR5cGUucHJvdG90eXBlICk7XHJcbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRG9jdW1lbnRBcnJheTtcclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtcyBsb2NhbCB2YWxpZGF0aW9ucyBmaXJzdCwgdGhlbiB2YWxpZGF0aW9ucyBvbiBlYWNoIGVtYmVkZGVkIGRvY1xyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmRvVmFsaWRhdGUgPSBmdW5jdGlvbiAoYXJyYXksIGZuLCBzY29wZSkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgU2NoZW1hVHlwZS5wcm90b3R5cGUuZG9WYWxpZGF0ZS5jYWxsKHRoaXMsIGFycmF5LCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICBpZiAoZXJyKSByZXR1cm4gZm4oZXJyKTtcclxuXHJcbiAgICB2YXIgY291bnQgPSBhcnJheSAmJiBhcnJheS5sZW5ndGhcclxuICAgICAgLCBlcnJvcjtcclxuXHJcbiAgICBpZiAoIWNvdW50KSByZXR1cm4gZm4oKTtcclxuXHJcbiAgICAvLyBoYW5kbGUgc3BhcnNlIGFycmF5cywgZG8gbm90IHVzZSBhcnJheS5mb3JFYWNoIHdoaWNoIGRvZXMgbm90XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgc3BhcnNlIGVsZW1lbnRzIHlldCByZXBvcnRzIGFycmF5Lmxlbmd0aCBpbmNsdWRpbmdcclxuICAgIC8vIHRoZW0gOihcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY291bnQ7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAvLyBzaWRlc3RlcCBzcGFyc2UgZW50cmllc1xyXG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XHJcbiAgICAgIGlmICghZG9jKSB7XHJcbiAgICAgICAgLS1jb3VudCB8fCBmbigpO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICA7KGZ1bmN0aW9uIChpKSB7XHJcbiAgICAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgICAgIGlmIChlcnIgJiYgIWVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vIHJld3JpdGUgdGhlIGtleVxyXG4gICAgICAgICAgICBlcnIua2V5ID0gc2VsZi5rZXkgKyAnLicgKyBpICsgJy4nICsgZXJyLmtleTtcclxuICAgICAgICAgICAgcmV0dXJuIGZuKGVycm9yID0gZXJyKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC0tY291bnQgfHwgZm4oKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkoaSk7XHJcbiAgICB9XHJcbiAgfSwgc2NvcGUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhc3RzIGNvbnRlbnRzXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUsIGRvYywgaW5pdCwgcHJldikge1xyXG4gIHZhciBzZWxlY3RlZFxyXG4gICAgLCBzdWJkb2NcclxuICAgICwgaTtcclxuXHJcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQsIHByZXYpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCEodmFsdWUuaXNTdG9yYWdlRG9jdW1lbnRBcnJheSkpIHtcclxuICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VEb2N1bWVudEFycmF5KHZhbHVlLCB0aGlzLnBhdGgsIGRvYyk7XHJcbiAgICBpZiAocHJldiAmJiBwcmV2Ll9oYW5kbGVycykge1xyXG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJldi5faGFuZGxlcnMpIHtcclxuICAgICAgICBkb2Mub2ZmKGtleSwgcHJldi5faGFuZGxlcnNba2V5XSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGkgPSB2YWx1ZS5sZW5ndGg7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIGlmICghKHZhbHVlW2ldIGluc3RhbmNlb2YgU3ViZG9jdW1lbnQpICYmIHZhbHVlW2ldKSB7XHJcbiAgICAgIGlmIChpbml0KSB7XHJcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XHJcbiAgICAgICAgc3ViZG9jID0gbmV3IHRoaXMuY2FzdGVyQ29uc3RydWN0b3IobnVsbCwgdmFsdWUsIHRydWUsIHNlbGVjdGVkKTtcclxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYy5pbml0KHZhbHVlW2ldKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgc3ViZG9jID0gcHJldi5pZCh2YWx1ZVtpXS5faWQpO1xyXG4gICAgICAgIH0gY2F0Y2goZSkge31cclxuXHJcbiAgICAgICAgaWYgKHByZXYgJiYgc3ViZG9jKSB7XHJcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxyXG4gICAgICAgICAgLy8gZG9jLmFycmF5ID0gW3sgZG9jOiAndmFsJyB9XVxyXG4gICAgICAgICAgc3ViZG9jLnNldCh2YWx1ZVtpXSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKHZhbHVlW2ldLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiBzZXQoKSBpcyBob29rZWQgaXQgd2lsbCBoYXZlIG5vIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIC8vIHNlZSBnaC03NDZcclxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXHJcbiAqIE5lY2Vzc2FyeSBmb3IgcHJvcGVyIGRlZmF1bHQgYXBwbGljYXRpb24gb2Ygc3ViZG9jdW1lbnQgdmFsdWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fHVuZGVmaW5lZH0gZmllbGRzIC0gdGhlIHJvb3QgZmllbGRzIHNlbGVjdGVkIGluIHRoZSBxdWVyeVxyXG4gKiBAcGFyYW0ge0Jvb2xlYW58dW5kZWZpbmVkfSBpbml0IC0gaWYgd2UgYXJlIGJlaW5nIGNyZWF0ZWQgcGFydCBvZiBhIHF1ZXJ5IHJlc3VsdFxyXG4gKi9cclxuZnVuY3Rpb24gc2NvcGVQYXRocyAoYXJyYXksIGZpZWxkcywgaW5pdCkge1xyXG4gIGlmICghKGluaXQgJiYgZmllbGRzKSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgdmFyIHBhdGggPSBhcnJheS5wYXRoICsgJy4nXHJcbiAgICAsIGtleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpXHJcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxyXG4gICAgLCBzZWxlY3RlZCA9IHt9XHJcbiAgICAsIGhhc0tleXNcclxuICAgICwga2V5O1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICBrZXkgPSBrZXlzW2ldO1xyXG4gICAgaWYgKDAgPT09IGtleS5pbmRleE9mKHBhdGgpKSB7XHJcbiAgICAgIGhhc0tleXMgfHwgKGhhc0tleXMgPSB0cnVlKTtcclxuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaGFzS2V5cyAmJiBzZWxlY3RlZCB8fCB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50QXJyYXk7XHJcbiIsIlxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5TdHJpbmcgPSByZXF1aXJlKCcuL3N0cmluZycpO1xyXG5cclxuZXhwb3J0cy5OdW1iZXIgPSByZXF1aXJlKCcuL251bWJlcicpO1xyXG5cclxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XHJcblxyXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcclxuXHJcbmV4cG9ydHMuQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XHJcblxyXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcclxuXHJcbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XHJcblxyXG5leHBvcnRzLk1peGVkID0gcmVxdWlyZSgnLi9taXhlZCcpO1xyXG5cclxuLy8gYWxpYXNcclxuXHJcbmV4cG9ydHMuT2lkID0gZXhwb3J0cy5PYmplY3RJZDtcclxuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xyXG5leHBvcnRzLkJvb2wgPSBleHBvcnRzLkJvb2xlYW47XHJcbiIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xyXG5cclxuLyoqXHJcbiAqIE1peGVkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gTWl4ZWQgKHBhdGgsIG9wdGlvbnMpIHtcclxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlZmF1bHQpIHtcclxuICAgIHZhciBkZWYgPSBvcHRpb25zLmRlZmF1bHQ7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkZWYpICYmIDAgPT09IGRlZi5sZW5ndGgpIHtcclxuICAgICAgLy8gbWFrZSBzdXJlIGVtcHR5IGFycmF5IGRlZmF1bHRzIGFyZSBoYW5kbGVkXHJcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IEFycmF5O1xyXG4gICAgfSBlbHNlIGlmICghb3B0aW9ucy5zaGFyZWQgJiZcclxuICAgICAgICAgICAgICAgXy5pc1BsYWluT2JqZWN0KGRlZikgJiZcclxuICAgICAgICAgICAgICAgMCA9PT0gT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHtcclxuICAgICAgLy8gcHJldmVudCBvZGQgXCJzaGFyZWRcIiBvYmplY3RzIGJldHdlZW4gZG9jdW1lbnRzXHJcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge31cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIHBhdGgsIG9wdGlvbnMpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuTWl4ZWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcclxuTWl4ZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWl4ZWQ7XHJcblxyXG4vKipcclxuICogUmVxdWlyZWQgdmFsaWRhdG9yXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuTWl4ZWQucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsKSB7XHJcbiAgcmV0dXJuICh2YWwgIT09IHVuZGVmaW5lZCkgJiYgKHZhbCAhPT0gbnVsbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxyXG4gKlxyXG4gKiBfdGhpcyBpcyBhIG5vLW9wX1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgdG8gY2FzdFxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbk1peGVkLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbCkge1xyXG4gIHJldHVybiB2YWw7XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaXhlZDtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXHJcbiAqL1xyXG5cclxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcclxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXHJcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlcztcclxuXHJcbi8qKlxyXG4gKiBOdW1iZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xyXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbmZ1bmN0aW9uIE51bWJlclNjaGVtYSAoa2V5LCBvcHRpb25zKSB7XHJcbiAgU2NoZW1hVHlwZS5jYWxsKHRoaXMsIGtleSwgb3B0aW9ucywgJ051bWJlcicpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuTnVtYmVyU2NoZW1hLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFNjaGVtYVR5cGUucHJvdG90eXBlICk7XHJcbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJTY2hlbWE7XHJcblxyXG4vKipcclxuICogUmVxdWlyZWQgdmFsaWRhdG9yIGZvciBudW1iZXJcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XHJcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCB2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcjtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyBhIG1pbmltdW0gbnVtYmVyIHZhbGlkYXRvci5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiAxMCB9KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogOSB9KVxyXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxyXG4gKiAgICAgICBtLm4gPSAxMDtcclxuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xyXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNSU59IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxyXG4gKiAgICAgdmFyIG1pbiA9IFsxMCwgJ1RoZSB2YWx1ZSBvZiBwYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoe01JTn0pLiddO1xyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiBtaW4gfSlcclxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcclxuICogICAgIHZhciBzPSBuZXcgTSh7IG46IDQgfSk7XHJcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBpcyBiZW5lYXRoIHRoZSBsaW1pdCAoMTApLlxyXG4gKiAgICAgfSlcclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1pbmltdW0gbnVtYmVyXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWluID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XHJcbiAgaWYgKHRoaXMubWluVmFsaWRhdG9yKSB7XHJcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMubWluVmFsaWRhdG9yO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgfVxyXG5cclxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xyXG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWluO1xyXG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNSU59LywgdmFsdWUpO1xyXG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWluVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA+PSB2YWx1ZTtcclxuICAgIH0sIG1zZywgJ21pbiddKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgYSBtYXhpbXVtIG51bWJlciB2YWxpZGF0b3IuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogMTAgfSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG46IDExIH0pXHJcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmVycm9yKGVycikgLy8gdmFsaWRhdG9yIGVycm9yXHJcbiAqICAgICAgIG0ubiA9IDEwO1xyXG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXHJcbiAqICAgICAvLyBXZSBjYW4gYWxzbyB1c2UgdGhlIHNwZWNpYWwge01BWH0gdG9rZW4gd2hpY2ggd2lsbCBiZSByZXBsYWNlZCB3aXRoIHRoZSBpbnZhbGlkIHZhbHVlXHJcbiAqICAgICB2YXIgbWF4ID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGV4Y2VlZHMgdGhlIGxpbWl0ICh7TUFYfSkuJ107XHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IG1heCB9KVxyXG4gKiAgICAgdmFyIE0gPSBtb25nb29zZS5tb2RlbCgnTWVhc3VyZW1lbnQnLCBzY2hlbWEpO1xyXG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcclxuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gVmFsaWRhdGlvbkVycm9yOiBUaGUgdmFsdWUgb2YgcGF0aCBgbmAgKDQpIGV4Y2VlZHMgdGhlIGxpbWl0ICgxMCkuXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgbWF4aW11bSBudW1iZXJcclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5tYXggPSBmdW5jdGlvbiAodmFsdWUsIG1lc3NhZ2UpIHtcclxuICBpZiAodGhpcy5tYXhWYWxpZGF0b3IpIHtcclxuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XHJcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMubWF4VmFsaWRhdG9yO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgfVxyXG5cclxuICBpZiAobnVsbCAhPSB2YWx1ZSkge1xyXG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWF4O1xyXG4gICAgbXNnID0gbXNnLnJlcGxhY2UoL3tNQVh9LywgdmFsdWUpO1xyXG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMubWF4VmFsaWRhdG9yID0gZnVuY3Rpb24odil7XHJcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPD0gdmFsdWU7XHJcbiAgICB9LCBtc2csICdtYXgnXSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB0byBudW1iZXJcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHZhbHVlIHRvIGNhc3RcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIHZhciB2YWwgPSB2YWx1ZSAmJiB2YWx1ZS5faWRcclxuICAgID8gdmFsdWUuX2lkIC8vIGRvY3VtZW50c1xyXG4gICAgOiB2YWx1ZTtcclxuXHJcbiAgaWYgKCFpc05hTih2YWwpKXtcclxuICAgIGlmIChudWxsID09PSB2YWwpIHJldHVybiB2YWw7XHJcbiAgICBpZiAoJycgPT09IHZhbCkgcmV0dXJuIG51bGw7XHJcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XHJcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgTnVtYmVyKSByZXR1cm4gdmFsXHJcbiAgICBpZiAoJ251bWJlcicgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHZhbDtcclxuICAgIGlmICh2YWwudG9TdHJpbmcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSAmJlxyXG4gICAgICAgIHZhbC50b1N0cmluZygpID09IE51bWJlcih2YWwpKSB7XHJcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyKHZhbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdudW1iZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlclNjaGVtYTtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqL1xyXG5cclxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcclxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXHJcbiAgLCBvaWQgPSByZXF1aXJlKCcuLi90eXBlcy9vYmplY3RpZCcpXHJcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcclxuICAsIERvY3VtZW50O1xyXG5cclxuLyoqXHJcbiAqIE9iamVjdElkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xyXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdPYmplY3RJZCcpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuT2JqZWN0SWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU2NoZW1hVHlwZS5wcm90b3R5cGUgKTtcclxuT2JqZWN0SWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT2JqZWN0SWQ7XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBhdXRvLWdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0IGlmIHR1cm5PbiBpcyB0cnVlLlxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHR1cm5PbiBhdXRvIGdlbmVyYXRlZCBPYmplY3RJZCBkZWZhdWx0c1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqL1xyXG5PYmplY3RJZC5wcm90b3R5cGUuYXV0byA9IGZ1bmN0aW9uICggdHVybk9uICkge1xyXG4gIGlmICggdHVybk9uICkge1xyXG4gICAgdGhpcy5kZWZhdWx0KCBkZWZhdWx0SWQgKTtcclxuICAgIHRoaXMuc2V0KCByZXNldElkIClcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIHJlcXVpcmVkXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xyXG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIG9pZDtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FzdHMgdG8gT2JqZWN0SWRcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XHJcbiAgICAvLyB3YWl0ISB3ZSBtYXkgbmVlZCB0byBjYXN0IHRoaXMgdG8gYSBkb2N1bWVudFxyXG5cclxuICAgIGlmIChudWxsID09IHZhbHVlKSB7XHJcbiAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBsYXp5IGxvYWRcclxuICAgIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vLi4vZG9jdW1lbnQnKSk7XHJcblxyXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRG9jdW1lbnQpIHtcclxuICAgICAgdmFsdWUuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XHJcbiAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzZXR0aW5nIGEgcG9wdWxhdGVkIHBhdGhcclxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZCApIHtcclxuICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSBlbHNlIGlmICggIV8uaXNQbGFpbk9iamVjdCggdmFsdWUgKSApIHtcclxuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDQndGD0LbQvdC+INGB0L7Qt9C00LDRgtGMINC00L7QutGD0LzQtdC90YIg0L/QviDRgdGF0LXQvNC1LCDRg9C60LDQt9Cw0L3QvdC+0Lkg0LIg0YHRgdGL0LvQutC1XHJcbiAgICB2YXIgc2NoZW1hID0gdGhpcy5vcHRpb25zLnJlZjtcclxuICAgIGlmICggIXNjaGVtYSApe1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQn9GA0Lgg0YHRgdGL0LvQutC1IChyZWYpINC90LAg0LTQvtC60YPQvNC10L3RgiAnICtcclxuICAgICAgICAn0L3Rg9C20L3QviDRg9C60LDQt9GL0LLQsNGC0Ywg0YHRhdC10LzRgywg0L/QviDQutC+0YLQvtGA0L7QuSDRjdGC0L7RgiDQtNC+0LrRg9C80LXQvdGCINGB0L7Qt9C00LDQstCw0YLRjCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkb2MgPSBuZXcgRG9jdW1lbnQoIHZhbHVlLCB1bmRlZmluZWQsIHN0b3JhZ2Uuc2NoZW1hc1sgc2NoZW1hIF0gKTtcclxuICAgIGRvYy4kX18ud2FzUG9wdWxhdGVkID0gdHJ1ZTtcclxuXHJcbiAgICByZXR1cm4gZG9jO1xyXG4gIH1cclxuXHJcbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XHJcblxyXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIG9pZClcclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgaWYgKCB2YWx1ZS5faWQgJiYgdmFsdWUuX2lkIGluc3RhbmNlb2Ygb2lkIClcclxuICAgIHJldHVybiB2YWx1ZS5faWQ7XHJcblxyXG4gIGlmICh2YWx1ZS50b1N0cmluZykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIG5ldyBvaWQoIHZhbHVlLnRvU3RyaW5nKCkgKTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdPYmplY3RJZCcsIHZhbHVlLCB0aGlzLnBhdGgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBpZ25vcmVcclxuICovXHJcbmZ1bmN0aW9uIGRlZmF1bHRJZCAoKSB7XHJcbiAgcmV0dXJuIG5ldyBvaWQoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRJZCAodikge1xyXG4gIHRoaXMuJF9fLl9pZCA9IG51bGw7XHJcbiAgcmV0dXJuIHY7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xyXG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxyXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcclxuICAsIGVycm9yTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9lcnJvcicpLm1lc3NhZ2VzO1xyXG5cclxuLyoqXHJcbiAqIFN0cmluZyBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIFN0cmluZ1NjaGVtYSAoa2V5LCBvcHRpb25zKSB7XHJcbiAgdGhpcy5lbnVtVmFsdWVzID0gW107XHJcbiAgdGhpcy5yZWdFeHAgPSBudWxsO1xyXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdTdHJpbmcnKTtcclxufVxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKCBTY2hlbWFUeXBlLnByb3RvdHlwZSApO1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RyaW5nU2NoZW1hO1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYW4gZW51bSB2YWxpZGF0b3JcclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgc3RhdGVzID0gJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBzdGF0ZXMgfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXHJcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGBpbnZhbGlkYCBpcyBub3QgYSB2YWxpZCBlbnVtIHZhbHVlIGZvciBwYXRoIGBzdGF0ZWAuXHJcbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcclxuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZXNcclxuICogICAgIHZhciBlbnUgPSB7XHJcbiAqICAgICAgIHZhbHVlczogJ29wZW5pbmcgb3BlbiBjbG9zaW5nIGNsb3NlZCcuc3BsaXQoJyAnKSxcclxuICogICAgICAgbWVzc2FnZTogJ2VudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBge1BBVEh9YCB3aXRoIHZhbHVlIGB7VkFMVUV9YCdcclxuICogICAgIH1cclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IHN0YXRlOiB7IHR5cGU6IFN0cmluZywgZW51bTogZW51IH0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBzdGF0ZTogJ2ludmFsaWQnIH0pXHJcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmVycm9yKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IGVudW0gdmFsaWRhdG9yIGZhaWxlZCBmb3IgcGF0aCBgc3RhdGVgIHdpdGggdmFsdWUgYGludmFsaWRgXHJcbiAqICAgICAgIG0uc3RhdGUgPSAnb3BlbidcclxuICogICAgICAgbS5zYXZlKGNhbGxiYWNrKSAvLyBzdWNjZXNzXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IFthcmdzLi4uXSBlbnVtZXJhdGlvbiB2YWx1ZXNcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuZW51bSA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5lbnVtVmFsaWRhdG9yKSB7XHJcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uKHYpe1xyXG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLmVudW1WYWxpZGF0b3I7XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHRoaXMuZW51bVZhbGlkYXRvciA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHVuZGVmaW5lZCA9PT0gYXJndW1lbnRzWzBdIHx8IGZhbHNlID09PSBhcmd1bWVudHNbMF0pIHtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIHZhbHVlcztcclxuICB2YXIgZXJyb3JNZXNzYWdlO1xyXG5cclxuICBpZiAoXy5pc1BsYWluT2JqZWN0KGFyZ3VtZW50c1swXSkpIHtcclxuICAgIHZhbHVlcyA9IGFyZ3VtZW50c1swXS52YWx1ZXM7XHJcbiAgICBlcnJvck1lc3NhZ2UgPSBhcmd1bWVudHNbMF0ubWVzc2FnZTtcclxuICB9IGVsc2Uge1xyXG4gICAgdmFsdWVzID0gYXJndW1lbnRzO1xyXG4gICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlcy5TdHJpbmcuZW51bTtcclxuICB9XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZXNbaV0pIHtcclxuICAgICAgdGhpcy5lbnVtVmFsdWVzLnB1c2godGhpcy5jYXN0KHZhbHVlc1tpXSkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIHZhbHMgPSB0aGlzLmVudW1WYWx1ZXM7XHJcbiAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQgPT09IHYgfHwgfnZhbHMuaW5kZXhPZih2KTtcclxuICB9O1xyXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLmVudW1WYWxpZGF0b3IsIGVycm9yTWVzc2FnZSwgJ2VudW0nXSk7XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBsb3dlcmNhc2Ugc2V0dGVyLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGVtYWlsOiB7IHR5cGU6IFN0cmluZywgbG93ZXJjYXNlOiB0cnVlIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGVtYWlsOiAnU29tZUVtYWlsQGV4YW1wbGUuQ09NJyB9KTtcclxuICogICAgIGNvbnNvbGUubG9nKG0uZW1haWwpIC8vIHNvbWVlbWFpbEBleGFtcGxlLmNvbVxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmxvd2VyY2FzZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zZXQoZnVuY3Rpb24gKHYsIHNlbGYpIHtcclxuICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdikgdiA9IHNlbGYuY2FzdCh2KTtcclxuICAgIGlmICh2KSByZXR1cm4gdi50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIHY7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhbiB1cHBlcmNhc2Ugc2V0dGVyLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGNhcHM6IHsgdHlwZTogU3RyaW5nLCB1cHBlcmNhc2U6IHRydWUgfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgY2FwczogJ2FuIGV4YW1wbGUnIH0pO1xyXG4gKiAgICAgY29uc29sZS5sb2cobS5jYXBzKSAvLyBBTiBFWEFNUExFXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUudXBwZXJjYXNlID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xyXG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xyXG4gICAgaWYgKHYpIHJldHVybiB2LnRvVXBwZXJDYXNlKCk7XHJcbiAgICByZXR1cm4gdjtcclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgdHJpbSBzZXR0ZXIuXHJcbiAqXHJcbiAqIFRoZSBzdHJpbmcgdmFsdWUgd2lsbCBiZSB0cmltbWVkIHdoZW4gc2V0LlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB0cmltOiB0cnVlIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpXHJcbiAqICAgICB2YXIgc3RyaW5nID0gJyBzb21lIG5hbWUgJ1xyXG4gKiAgICAgY29uc29sZS5sb2coc3RyaW5nLmxlbmd0aCkgLy8gMTFcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiBzdHJpbmcgfSlcclxuICogICAgIGNvbnNvbGUubG9nKG0ubmFtZS5sZW5ndGgpIC8vIDlcclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xyXG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xyXG4gICAgaWYgKHYpIHJldHVybiB2LnRyaW0oKTtcclxuICAgIHJldHVybiB2O1xyXG4gIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgYSByZWdleHAgdmFsaWRhdG9yLlxyXG4gKlxyXG4gKiBBbnkgdmFsdWUgdGhhdCBkb2VzIG5vdCBwYXNzIGByZWdFeHBgLnRlc3QodmFsKSB3aWxsIGZhaWwgdmFsaWRhdGlvbi5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8gfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBuYW1lOiAnSSBhbSBpbnZhbGlkJyB9KVxyXG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFwiVmFsaWRhdGlvbkVycm9yOiBQYXRoIGBuYW1lYCBpcyBpbnZhbGlkIChJIGFtIGludmFsaWQpLlwiXHJcbiAqICAgICAgIG0ubmFtZSA9ICdhcHBsZXMnXHJcbiAqICAgICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICAgIGFzc2VydC5vayhlcnIpIC8vIHN1Y2Nlc3NcclxuICogICAgICAgfSlcclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICAvLyB1c2luZyBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXHJcbiAqICAgICB2YXIgbWF0Y2ggPSBbIC9cXC5odG1sJC8sIFwiVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sICh7VkFMVUV9KVwiIF07XHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBmaWxlOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IG1hdGNoIH19KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHMpO1xyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IGZpbGU6ICdpbnZhbGlkJyB9KTtcclxuICogICAgIG0udmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZyhTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFRoYXQgZmlsZSBkb2Vzbid0IGVuZCBpbiAuaHRtbCAoaW52YWxpZClcIlxyXG4gKiAgICAgfSlcclxuICpcclxuICogRW1wdHkgc3RyaW5ncywgYHVuZGVmaW5lZGAsIGFuZCBgbnVsbGAgdmFsdWVzIGFsd2F5cyBwYXNzIHRoZSBtYXRjaCB2YWxpZGF0b3IuIElmIHlvdSByZXF1aXJlIHRoZXNlIHZhbHVlcywgZW5hYmxlIHRoZSBgcmVxdWlyZWRgIHZhbGlkYXRvciBhbHNvLlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIG1hdGNoOiAvXmEvLCByZXF1aXJlZDogdHJ1ZSB9fSlcclxuICpcclxuICogQHBhcmFtIHtSZWdFeHB9IHJlZ0V4cCByZWd1bGFyIGV4cHJlc3Npb24gdG8gdGVzdCBhZ2FpbnN0XHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCAocmVnRXhwLCBtZXNzYWdlKSB7XHJcbiAgLy8geWVzLCB3ZSBhbGxvdyBtdWx0aXBsZSBtYXRjaCB2YWxpZGF0b3JzXHJcblxyXG4gIHZhciBtc2cgPSBtZXNzYWdlIHx8IGVycm9yTWVzc2FnZXMuU3RyaW5nLm1hdGNoO1xyXG5cclxuICBmdW5jdGlvbiBtYXRjaFZhbGlkYXRvciAodil7XHJcbiAgICByZXR1cm4gbnVsbCAhPSB2ICYmICcnICE9PSB2XHJcbiAgICAgID8gcmVnRXhwLnRlc3QodilcclxuICAgICAgOiB0cnVlXHJcbiAgfVxyXG5cclxuICB0aGlzLnZhbGlkYXRvcnMucHVzaChbbWF0Y2hWYWxpZGF0b3IsIG1zZywgJ3JlZ2V4cCddKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVjayByZXF1aXJlZFxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiBjaGVja1JlcXVpcmVkICh2YWx1ZSwgZG9jKSB7XHJcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKHRoaXMsIHZhbHVlLCBkb2MsIHRydWUpKSB7XHJcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuICh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZyB8fCB0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpICYmIHZhbHVlLmxlbmd0aDtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FzdHMgdG8gU3RyaW5nXHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcclxuICBpZiAoIHZhbHVlID09PSBudWxsICkge1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUpIHtcclxuICAgIC8vIGhhbmRsZSBkb2N1bWVudHMgYmVpbmcgcGFzc2VkXHJcbiAgICBpZiAodmFsdWUuX2lkICYmICdzdHJpbmcnID09IHR5cGVvZiB2YWx1ZS5faWQpIHtcclxuICAgICAgcmV0dXJuIHZhbHVlLl9pZDtcclxuICAgIH1cclxuICAgIGlmICggdmFsdWUudG9TdHJpbmcgKSB7XHJcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IENhc3RFcnJvcignc3RyaW5nJywgdmFsdWUsIHRoaXMucGF0aCk7XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdTY2hlbWE7XHJcbiIsIi8qIVxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciBlcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcclxudmFyIGVycm9yTWVzc2FnZXMgPSBlcnJvci5tZXNzYWdlcztcclxudmFyIENhc3RFcnJvciA9IGVycm9yLkNhc3RFcnJvcjtcclxudmFyIFZhbGlkYXRvckVycm9yID0gZXJyb3IuVmFsaWRhdG9yRXJyb3I7XHJcblxyXG4vKipcclxuICogU2NoZW1hVHlwZSBjb25zdHJ1Y3RvclxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbaW5zdGFuY2VdXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gU2NoZW1hVHlwZSAocGF0aCwgb3B0aW9ucywgaW5zdGFuY2UpIHtcclxuICB0aGlzLnBhdGggPSBwYXRoO1xyXG4gIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICB0aGlzLnZhbGlkYXRvcnMgPSBbXTtcclxuICB0aGlzLnNldHRlcnMgPSBbXTtcclxuICB0aGlzLmdldHRlcnMgPSBbXTtcclxuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG5cclxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIGlmICh0aGlzW2ldICYmICdmdW5jdGlvbicgPT0gdHlwZW9mIHRoaXNbaV0pIHtcclxuICAgIHZhciBvcHRzID0gQXJyYXkuaXNBcnJheShvcHRpb25zW2ldKVxyXG4gICAgICA/IG9wdGlvbnNbaV1cclxuICAgICAgOiBbb3B0aW9uc1tpXV07XHJcblxyXG4gICAgdGhpc1tpXS5hcHBseSh0aGlzLCBvcHRzKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXRzIGEgZGVmYXVsdCB2YWx1ZSBmb3IgdGhpcyBTY2hlbWFUeXBlLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIGRlZmF1bHQ6IDEwIH0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTTtcclxuICogICAgIGNvbnNvbGUubG9nKG0ubikgLy8gMTBcclxuICpcclxuICogRGVmYXVsdHMgY2FuIGJlIGVpdGhlciBgZnVuY3Rpb25zYCB3aGljaCByZXR1cm4gdGhlIHZhbHVlIHRvIHVzZSBhcyB0aGUgZGVmYXVsdCBvciB0aGUgbGl0ZXJhbCB2YWx1ZSBpdHNlbGYuIEVpdGhlciB3YXksIHRoZSB2YWx1ZSB3aWxsIGJlIGNhc3QgYmFzZWQgb24gaXRzIHNjaGVtYSB0eXBlIGJlZm9yZSBiZWluZyBzZXQgZHVyaW5nIGRvY3VtZW50IGNyZWF0aW9uLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIC8vIHZhbHVlcyBhcmUgY2FzdDpcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgYU51bWJlcjogTnVtYmVyLCBkZWZhdWx0OiBcIjQuODE1MTYyMzQyXCIgfSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNO1xyXG4gKiAgICAgY29uc29sZS5sb2cobS5hTnVtYmVyKSAvLyA0LjgxNTE2MjM0MlxyXG4gKlxyXG4gKiAgICAgLy8gZGVmYXVsdCB1bmlxdWUgb2JqZWN0cyBmb3IgTWl4ZWQgdHlwZXM6XHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XHJcbiAqICAgICBzY2hlbWEucGF0aCgnbWl4ZWQnKS5kZWZhdWx0KGZ1bmN0aW9uICgpIHtcclxuICogICAgICAgcmV0dXJuIHt9O1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqICAgICAvLyBpZiB3ZSBkb24ndCB1c2UgYSBmdW5jdGlvbiB0byByZXR1cm4gb2JqZWN0IGxpdGVyYWxzIGZvciBNaXhlZCBkZWZhdWx0cyxcclxuICogICAgIC8vIGVhY2ggZG9jdW1lbnQgd2lsbCByZWNlaXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdCBsaXRlcmFsIGNyZWF0aW5nXHJcbiAqICAgICAvLyBhIFwic2hhcmVkXCIgb2JqZWN0IGluc3RhbmNlOlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBtaXhlZDogU2NoZW1hLlR5cGVzLk1peGVkIH0pO1xyXG4gKiAgICAgc2NoZW1hLnBhdGgoJ21peGVkJykuZGVmYXVsdCh7fSk7XHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgc2NoZW1hKTtcclxuICogICAgIHZhciBtMSA9IG5ldyBNO1xyXG4gKiAgICAgbTEubWl4ZWQuYWRkZWQgPSAxO1xyXG4gKiAgICAgY29uc29sZS5sb2cobTEubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cclxuICogICAgIHZhciBtMiA9IG5ldyBNO1xyXG4gKiAgICAgY29uc29sZS5sb2cobTIubWl4ZWQpOyAvLyB7IGFkZGVkOiAxIH1cclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbnxhbnl9IHZhbCB0aGUgZGVmYXVsdCB2YWx1ZVxyXG4gKiBAcmV0dXJuIHtkZWZhdWx0VmFsdWV9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kZWZhdWx0ID0gZnVuY3Rpb24gKHZhbCkge1xyXG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbidcclxuICAgICAgPyB2YWxcclxuICAgICAgOiB0aGlzLmNhc3QoIHZhbCApO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG5cclxuICB9IGVsc2UgaWYgKCBhcmd1bWVudHMubGVuZ3RoID4gMSApIHtcclxuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gXy50b0FycmF5KCBhcmd1bWVudHMgKTtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuZGVmYXVsdFZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBzZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIGZ1bmN0aW9uIGNhcGl0YWxpemUgKHZhbCkge1xyXG4gKiAgICAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gJyc7XHJcbiAqICAgICAgIHJldHVybiB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc3Vic3RyaW5nKDEpO1xyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGNhcGl0YWxpemUgfX0pXHJcbiAqXHJcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiBTdHJpbmcgfSlcclxuICogICAgIHMucGF0aCgnbmFtZScpLnNldChjYXBpdGFsaXplKVxyXG4gKlxyXG4gKiBTZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIGRhdGEgYmVmb3JlIGl0IGdldHMgdG8gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IGFuZCBpcyBzZXQgYXMgYSB2YWx1ZSBvbiBhbiBhY3R1YWwga2V5LlxyXG4gKlxyXG4gKiBTdXBwb3NlIHlvdSBhcmUgaW1wbGVtZW50aW5nIHVzZXIgcmVnaXN0cmF0aW9uIGZvciBhIHdlYnNpdGUuIFVzZXJzIHByb3ZpZGUgYW4gZW1haWwgYW5kIHBhc3N3b3JkLCB3aGljaCBnZXRzIHNhdmVkIHRvIG1vbmdvZGIuIFRoZSBlbWFpbCBpcyBhIHN0cmluZyB0aGF0IHlvdSB3aWxsIHdhbnQgdG8gbm9ybWFsaXplIHRvIGxvd2VyIGNhc2UsIGluIG9yZGVyIHRvIGF2b2lkIG9uZSBlbWFpbCBoYXZpbmcgbW9yZSB0aGFuIG9uZSBhY2NvdW50IC0tIGUuZy4sIG90aGVyd2lzZSwgYXZlbnVlQHEuY29tIGNhbiBiZSByZWdpc3RlcmVkIGZvciAyIGFjY291bnRzIHZpYSBhdmVudWVAcS5jb20gYW5kIEF2RW5VZUBRLkNvTS5cclxuICpcclxuICogWW91IGNhbiBzZXQgdXAgZW1haWwgbG93ZXIgY2FzZSBub3JtYWxpemF0aW9uIGVhc2lseSB2aWEgYSBNb25nb29zZSBzZXR0ZXIuXHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiB0b0xvd2VyICh2KSB7XHJcbiAqICAgICAgIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICB2YXIgVXNlclNjaGVtYSA9IG5ldyBTY2hlbWEoe1xyXG4gKiAgICAgICBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIHNldDogdG9Mb3dlciB9XHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgdmFyIFVzZXIgPSBkYi5tb2RlbCgnVXNlcicsIFVzZXJTY2hlbWEpXHJcbiAqXHJcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyKHtlbWFpbDogJ0FWRU5VRUBRLkNPTSd9KVxyXG4gKiAgICAgY29uc29sZS5sb2codXNlci5lbWFpbCk7IC8vICdhdmVudWVAcS5jb20nXHJcbiAqXHJcbiAqICAgICAvLyBvclxyXG4gKiAgICAgdmFyIHVzZXIgPSBuZXcgVXNlclxyXG4gKiAgICAgdXNlci5lbWFpbCA9ICdBdmVudWVAUS5jb20nXHJcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKSAvLyAnYXZlbnVlQHEuY29tJ1xyXG4gKlxyXG4gKiBBcyB5b3UgY2FuIHNlZSBhYm92ZSwgc2V0dGVycyBhbGxvdyB5b3UgdG8gdHJhbnNmb3JtIHRoZSBkYXRhIGJlZm9yZSBpdCBnZXRzIHRvIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCBhbmQgaXMgc2V0IGFzIGEgdmFsdWUgb24gYW4gYWN0dWFsIGtleS5cclxuICpcclxuICogX05PVEU6IHdlIGNvdWxkIGhhdmUgYWxzbyBqdXN0IHVzZWQgdGhlIGJ1aWx0LWluIGBsb3dlcmNhc2U6IHRydWVgIFNjaGVtYVR5cGUgb3B0aW9uIGluc3RlYWQgb2YgZGVmaW5pbmcgb3VyIG93biBmdW5jdGlvbi5fXHJcbiAqXHJcbiAqICAgICBuZXcgU2NoZW1hKHsgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBsb3dlcmNhc2U6IHRydWUgfX0pXHJcbiAqXHJcbiAqIFNldHRlcnMgYXJlIGFsc28gcGFzc2VkIGEgc2Vjb25kIGFyZ3VtZW50LCB0aGUgc2NoZW1hdHlwZSBvbiB3aGljaCB0aGUgc2V0dGVyIHdhcyBkZWZpbmVkLiBUaGlzIGFsbG93cyBmb3IgdGFpbG9yZWQgYmVoYXZpb3IgYmFzZWQgb24gb3B0aW9ucyBwYXNzZWQgaW4gdGhlIHNjaGVtYS5cclxuICpcclxuICogICAgIGZ1bmN0aW9uIGluc3BlY3RvciAodmFsLCBzY2hlbWF0eXBlKSB7XHJcbiAqICAgICAgIGlmIChzY2hlbWF0eXBlLm9wdGlvbnMucmVxdWlyZWQpIHtcclxuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyByZXF1aXJlZCc7XHJcbiAqICAgICAgIH0gZWxzZSB7XHJcbiAqICAgICAgICAgcmV0dXJuIHZhbDtcclxuICogICAgICAgfVxyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgdmFyIFZpcnVzU2NoZW1hID0gbmV3IFNjaGVtYSh7XHJcbiAqICAgICAgIG5hbWU6IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgc2V0OiBpbnNwZWN0b3IgfSxcclxuICogICAgICAgdGF4b25vbXk6IHsgdHlwZTogU3RyaW5nLCBzZXQ6IGluc3BlY3RvciB9XHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiAgICAgdmFyIFZpcnVzID0gZGIubW9kZWwoJ1ZpcnVzJywgVmlydXNTY2hlbWEpO1xyXG4gKiAgICAgdmFyIHYgPSBuZXcgVmlydXMoeyBuYW1lOiAnUGFydm92aXJpZGFlJywgdGF4b25vbXk6ICdQYXJ2b3ZpcmluYWUnIH0pO1xyXG4gKlxyXG4gKiAgICAgY29uc29sZS5sb2codi5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcclxuICogICAgIGNvbnNvbGUubG9nKHYudGF4b25vbXkpOyAvLyBQYXJ2b3ZpcmluYWVcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgaWYgKCdmdW5jdGlvbicgIT0gdHlwZW9mIGZuKVxyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBzZXR0ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xyXG4gIHRoaXMuc2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgZ2V0dGVyIHRvIHRoaXMgc2NoZW1hdHlwZS5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiBkb2IgKHZhbCkge1xyXG4gKiAgICAgICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcclxuICogICAgICAgcmV0dXJuICh2YWwuZ2V0TW9udGgoKSArIDEpICsgXCIvXCIgKyB2YWwuZ2V0RGF0ZSgpICsgXCIvXCIgKyB2YWwuZ2V0RnVsbFllYXIoKTtcclxuICogICAgIH1cclxuICpcclxuICogICAgIC8vIGRlZmluaW5nIHdpdGhpbiB0aGUgc2NoZW1hXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiB7IHR5cGU6IERhdGUsIGdldDogZG9iIH0pXHJcbiAqXHJcbiAqICAgICAvLyBvciBieSByZXRyZWl2aW5nIGl0cyBTY2hlbWFUeXBlXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBib3JuOiBEYXRlIH0pXHJcbiAqICAgICBzLnBhdGgoJ2Jvcm4nKS5nZXQoZG9iKVxyXG4gKlxyXG4gKiBHZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkYXRhIGFzIGl0IHRyYXZlbHMgZnJvbSB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgdG8gdGhlIHZhbHVlIHRoYXQgeW91IHNlZS5cclxuICpcclxuICogU3VwcG9zZSB5b3UgYXJlIHN0b3JpbmcgY3JlZGl0IGNhcmQgbnVtYmVycyBhbmQgeW91IHdhbnQgdG8gaGlkZSBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgbGFzdCA0IGRpZ2l0cyB0byB0aGUgbW9uZ29vc2UgdXNlci4gWW91IGNhbiBkbyBzbyBieSBkZWZpbmluZyBhIGdldHRlciBpbiB0aGUgZm9sbG93aW5nIHdheTpcclxuICpcclxuICogICAgIGZ1bmN0aW9uIG9iZnVzY2F0ZSAoY2MpIHtcclxuICogICAgICAgcmV0dXJuICcqKioqLSoqKiotKioqKi0nICsgY2Muc2xpY2UoY2MubGVuZ3RoLTQsIGNjLmxlbmd0aCk7XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICB2YXIgQWNjb3VudFNjaGVtYSA9IG5ldyBTY2hlbWEoe1xyXG4gKiAgICAgICBjcmVkaXRDYXJkTnVtYmVyOiB7IHR5cGU6IFN0cmluZywgZ2V0OiBvYmZ1c2NhdGUgfVxyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqICAgICB2YXIgQWNjb3VudCA9IGRiLm1vZGVsKCdBY2NvdW50JywgQWNjb3VudFNjaGVtYSk7XHJcbiAqXHJcbiAqICAgICBBY2NvdW50LmZpbmRCeUlkKGlkLCBmdW5jdGlvbiAoZXJyLCBmb3VuZCkge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZyhmb3VuZC5jcmVkaXRDYXJkTnVtYmVyKTsgLy8gJyoqKiotKioqKi0qKioqLTEyMzQnXHJcbiAqICAgICB9KTtcclxuICpcclxuICogR2V0dGVycyBhcmUgYWxzbyBwYXNzZWQgYSBzZWNvbmQgYXJndW1lbnQsIHRoZSBzY2hlbWF0eXBlIG9uIHdoaWNoIHRoZSBnZXR0ZXIgd2FzIGRlZmluZWQuIFRoaXMgYWxsb3dzIGZvciB0YWlsb3JlZCBiZWhhdmlvciBiYXNlZCBvbiBvcHRpb25zIHBhc3NlZCBpbiB0aGUgc2NoZW1hLlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcclxuICogICAgICAgaWYgKHNjaGVtYXR5cGUub3B0aW9ucy5yZXF1aXJlZCkge1xyXG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcclxuICogICAgICAgfSBlbHNlIHtcclxuICogICAgICAgICByZXR1cm4gc2NoZW1hdHlwZS5wYXRoICsgJyBpcyBub3QnO1xyXG4gKiAgICAgICB9XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcclxuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBnZXQ6IGluc3BlY3RvciB9LFxyXG4gKiAgICAgICB0YXhvbm9teTogeyB0eXBlOiBTdHJpbmcsIGdldDogaW5zcGVjdG9yIH1cclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICB2YXIgVmlydXMgPSBkYi5tb2RlbCgnVmlydXMnLCBWaXJ1c1NjaGVtYSk7XHJcbiAqXHJcbiAqICAgICBWaXJ1cy5maW5kQnlJZChpZCwgZnVuY3Rpb24gKGVyciwgdmlydXMpIHtcclxuICogICAgICAgY29uc29sZS5sb2codmlydXMubmFtZSk7ICAgICAvLyBuYW1lIGlzIHJlcXVpcmVkXHJcbiAqICAgICAgIGNvbnNvbGUubG9nKHZpcnVzLnRheG9ub215KTsgLy8gdGF4b25vbXkgaXMgbm90XHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZm4pIHtcclxuICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pXHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGdldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XHJcbiAgdGhpcy5nZXR0ZXJzLnB1c2goZm4pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgdmFsaWRhdG9yKHMpIGZvciB0aGlzIGRvY3VtZW50IHBhdGguXHJcbiAqXHJcbiAqIFZhbGlkYXRvcnMgYWx3YXlzIHJlY2VpdmUgdGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIHRoZWlyIGZpcnN0IGFyZ3VtZW50IGFuZCBtdXN0IHJldHVybiBgQm9vbGVhbmAuIFJldHVybmluZyBgZmFsc2VgIG1lYW5zIHZhbGlkYXRpb24gZmFpbGVkLlxyXG4gKlxyXG4gKiBUaGUgZXJyb3IgbWVzc2FnZSBhcmd1bWVudCBpcyBvcHRpb25hbC4gSWYgbm90IHBhc3NlZCwgdGhlIFtkZWZhdWx0IGdlbmVyaWMgZXJyb3IgbWVzc2FnZSB0ZW1wbGF0ZV0oI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXMpIHdpbGwgYmUgdXNlZC5cclxuICpcclxuICogIyMjI0V4YW1wbGVzOlxyXG4gKlxyXG4gKiAgICAgLy8gbWFrZSBzdXJlIGV2ZXJ5IHZhbHVlIGlzIGVxdWFsIHRvIFwic29tZXRoaW5nXCJcclxuICogICAgIGZ1bmN0aW9uIHZhbGlkYXRvciAodmFsKSB7XHJcbiAqICAgICAgIHJldHVybiB2YWwgPT0gJ3NvbWV0aGluZyc7XHJcbiAqICAgICB9XHJcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiB2YWxpZGF0b3IgfX0pO1xyXG4gKlxyXG4gKiAgICAgLy8gd2l0aCBhIGN1c3RvbSBlcnJvciBtZXNzYWdlXHJcbiAqXHJcbiAqICAgICB2YXIgY3VzdG9tID0gW3ZhbGlkYXRvciwgJ1VoIG9oLCB7UEFUSH0gZG9lcyBub3QgZXF1YWwgXCJzb21ldGhpbmdcIi4nXVxyXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogY3VzdG9tIH19KTtcclxuICpcclxuICogICAgIC8vIGFkZGluZyBtYW55IHZhbGlkYXRvcnMgYXQgYSB0aW1lXHJcbiAqXHJcbiAqICAgICB2YXIgbWFueSA9IFtcclxuICogICAgICAgICB7IHZhbGlkYXRvcjogdmFsaWRhdG9yLCBtc2c6ICd1aCBvaCcgfVxyXG4gKiAgICAgICAsIHsgdmFsaWRhdG9yOiBhbm90aGVyVmFsaWRhdG9yLCBtc2c6ICdmYWlsZWQnIH1cclxuICogICAgIF1cclxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IG1hbnkgfX0pO1xyXG4gKlxyXG4gKiAgICAgLy8gb3IgdXRpbGl6aW5nIFNjaGVtYVR5cGUgbWV0aG9kcyBkaXJlY3RseTpcclxuICpcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogJ3N0cmluZycgfSk7XHJcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKHZhbGlkYXRvciwgJ3ZhbGlkYXRpb24gb2YgYHtQQVRIfWAgZmFpbGVkIHdpdGggdmFsdWUgYHtWQUxVRX1gJyk7XHJcbiAqXHJcbiAqICMjIyNFcnJvciBtZXNzYWdlIHRlbXBsYXRlczpcclxuICpcclxuICogRnJvbSB0aGUgZXhhbXBsZXMgYWJvdmUsIHlvdSBtYXkgaGF2ZSBub3RpY2VkIHRoYXQgZXJyb3IgbWVzc2FnZXMgc3VwcG9ydCBiYXNlaWMgdGVtcGxhdGluZy4gVGhlcmUgYXJlIGEgZmV3IG90aGVyIHRlbXBsYXRlIGtleXdvcmRzIGJlc2lkZXMgYHtQQVRIfWAgYW5kIGB7VkFMVUV9YCB0b28uIFRvIGZpbmQgb3V0IG1vcmUsIGRldGFpbHMgYXJlIGF2YWlsYWJsZSBbaGVyZV0oI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXMpXHJcbiAqXHJcbiAqICMjIyNBc3luY2hyb25vdXMgdmFsaWRhdGlvbjpcclxuICpcclxuICogUGFzc2luZyBhIHZhbGlkYXRvciBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHR3byBhcmd1bWVudHMgdGVsbHMgbW9uZ29vc2UgdGhhdCB0aGUgdmFsaWRhdG9yIGlzIGFuIGFzeW5jaHJvbm91cyB2YWxpZGF0b3IuIFRoZSBmaXJzdCBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIHZhbGlkYXRvciBmdW5jdGlvbiBpcyB0aGUgdmFsdWUgYmVpbmcgdmFsaWRhdGVkLiBUaGUgc2Vjb25kIGFyZ3VtZW50IGlzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBtdXN0IGNhbGxlZCB3aGVuIHlvdSBmaW5pc2ggdmFsaWRhdGluZyB0aGUgdmFsdWUgYW5kIHBhc3NlZCBlaXRoZXIgYHRydWVgIG9yIGBmYWxzZWAgdG8gY29tbXVuaWNhdGUgZWl0aGVyIHN1Y2Nlc3Mgb3IgZmFpbHVyZSByZXNwZWN0aXZlbHkuXHJcbiAqXHJcbiAqICAgICBzY2hlbWEucGF0aCgnbmFtZScpLnZhbGlkYXRlKGZ1bmN0aW9uICh2YWx1ZSwgcmVzcG9uZCkge1xyXG4gKiAgICAgICBkb1N0dWZmKHZhbHVlLCBmdW5jdGlvbiAoKSB7XHJcbiAqICAgICAgICAgLi4uXHJcbiAqICAgICAgICAgcmVzcG9uZChmYWxzZSk7IC8vIHZhbGlkYXRpb24gZmFpbGVkXHJcbiAqICAgICAgIH0pXHJcbiogICAgICB9LCAne1BBVEh9IGZhaWxlZCB2YWxpZGF0aW9uLicpO1xyXG4qXHJcbiAqIFlvdSBtaWdodCB1c2UgYXN5bmNocm9ub3VzIHZhbGlkYXRvcnMgdG8gcmV0cmVpdmUgb3RoZXIgZG9jdW1lbnRzIGZyb20gdGhlIGRhdGFiYXNlIHRvIHZhbGlkYXRlIGFnYWluc3Qgb3IgdG8gbWVldCBvdGhlciBJL08gYm91bmQgdmFsaWRhdGlvbiBuZWVkcy5cclxuICpcclxuICogVmFsaWRhdGlvbiBvY2N1cnMgYHByZSgnc2F2ZScpYCBvciB3aGVuZXZlciB5b3UgbWFudWFsbHkgZXhlY3V0ZSBbZG9jdW1lbnQjdmFsaWRhdGVdKCNkb2N1bWVudF9Eb2N1bWVudC12YWxpZGF0ZSkuXHJcbiAqXHJcbiAqIElmIHZhbGlkYXRpb24gZmFpbHMgZHVyaW5nIGBwcmUoJ3NhdmUnKWAgYW5kIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQgdG8gcmVjZWl2ZSB0aGUgZXJyb3IsIGFuIGBlcnJvcmAgZXZlbnQgd2lsbCBiZSBlbWl0dGVkIG9uIHlvdXIgTW9kZWxzIGFzc29jaWF0ZWQgZGIgW2Nvbm5lY3Rpb25dKCNjb25uZWN0aW9uX0Nvbm5lY3Rpb24pLCBwYXNzaW5nIHRoZSB2YWxpZGF0aW9uIGVycm9yIG9iamVjdCBhbG9uZy5cclxuICpcclxuICogICAgIHZhciBjb25uID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XHJcbiAqICAgICBjb25uLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcclxuICpcclxuICogICAgIHZhciBQcm9kdWN0ID0gY29ubi5tb2RlbCgnUHJvZHVjdCcsIHlvdXJTY2hlbWEpO1xyXG4gKiAgICAgdmFyIGR2ZCA9IG5ldyBQcm9kdWN0KC4uKTtcclxuICogICAgIGR2ZC5zYXZlKCk7IC8vIGVtaXRzIGVycm9yIG9uIHRoZSBgY29ubmAgYWJvdmVcclxuICpcclxuICogSWYgeW91IGRlc2lyZSBoYW5kbGluZyB0aGVzZSBlcnJvcnMgYXQgdGhlIE1vZGVsIGxldmVsLCBhdHRhY2ggYW4gYGVycm9yYCBsaXN0ZW5lciB0byB5b3VyIE1vZGVsIGFuZCB0aGUgZXZlbnQgd2lsbCBpbnN0ZWFkIGJlIGVtaXR0ZWQgdGhlcmUuXHJcbiAqXHJcbiAqICAgICAvLyByZWdpc3RlcmluZyBhbiBlcnJvciBsaXN0ZW5lciBvbiB0aGUgTW9kZWwgbGV0cyB1cyBoYW5kbGUgZXJyb3JzIG1vcmUgbG9jYWxseVxyXG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XHJcbiAqXHJcbiAqIEBwYXJhbSB7UmVnRXhwfEZ1bmN0aW9ufE9iamVjdH0gb2JqIHZhbGlkYXRvclxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW2Vycm9yTXNnXSBvcHRpb25hbCBlcnJvciBtZXNzYWdlXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKG9iaiwgbWVzc2FnZSwgdHlwZSkge1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBvYmogfHwgb2JqICYmICdSZWdFeHAnID09PSBvYmouY29uc3RydWN0b3IubmFtZSkge1xyXG4gICAgaWYgKCFtZXNzYWdlKSBtZXNzYWdlID0gZXJyb3JNZXNzYWdlcy5nZW5lcmFsLmRlZmF1bHQ7XHJcbiAgICBpZiAoIXR5cGUpIHR5cGUgPSAndXNlciBkZWZpbmVkJztcclxuICAgIHRoaXMudmFsaWRhdG9ycy5wdXNoKFtvYmosIG1lc3NhZ2UsIHR5cGVdKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoXHJcbiAgICAsIGFyZztcclxuXHJcbiAgd2hpbGUgKGktLSkge1xyXG4gICAgYXJnID0gYXJndW1lbnRzW2ldO1xyXG4gICAgaWYgKCEoYXJnICYmICdPYmplY3QnID09IGFyZy5jb25zdHJ1Y3Rvci5uYW1lKSkge1xyXG4gICAgICB2YXIgbXNnID0gJ0ludmFsaWQgdmFsaWRhdG9yLiBSZWNlaXZlZCAoJyArIHR5cGVvZiBhcmcgKyAnKSAnXHJcbiAgICAgICAgKyBhcmdcclxuICAgICAgICArICcuIFNlZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9hcGkuaHRtbCNzY2hlbWF0eXBlX1NjaGVtYVR5cGUtdmFsaWRhdGUnO1xyXG5cclxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnZhbGlkYXRlKGFyZy52YWxpZGF0b3IsIGFyZy5tc2csIGFyZy50eXBlKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSByZXF1aXJlZCB2YWxpZGF0b3IgdG8gdGhpcyBzY2hlbWF0eXBlLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6IHRydWUgfSlcclxuICpcclxuICogICAgIC8vIG9yIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6ICd7UEFUSH0gaXMgcmVxdWlyZWQhJyB9KVxyXG4gKlxyXG4gKiAgICAgLy8gb3IgdGhyb3VnaCB0aGUgcGF0aCBBUElcclxuICpcclxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSk7XHJcbiAqXHJcbiAqICAgICAvLyB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdpbmdcclxuICpcclxuICogICAgIFNjaGVtYS5wYXRoKCduYW1lJykucmVxdWlyZWQodHJ1ZSwgJ2dycnIgOiggJyk7XHJcbiAqXHJcbiAqXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgZW5hYmxlL2Rpc2FibGUgdGhlIHZhbGlkYXRvclxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5yZXF1aXJlZCA9IGZ1bmN0aW9uIChyZXF1aXJlZCwgbWVzc2FnZSkge1xyXG4gIGlmIChmYWxzZSA9PT0gcmVxdWlyZWQpIHtcclxuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgcmV0dXJuIHZbMF0gIT0gdGhpcy5yZXF1aXJlZFZhbGlkYXRvcjtcclxuICAgIH0sIHRoaXMpO1xyXG5cclxuICAgIHRoaXMuaXNSZXF1aXJlZCA9IGZhbHNlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5pc1JlcXVpcmVkID0gdHJ1ZTtcclxuXHJcbiAgdGhpcy5yZXF1aXJlZFZhbGlkYXRvciA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAvLyBpbiBoZXJlLCBgdGhpc2AgcmVmZXJzIHRvIHRoZSB2YWxpZGF0aW5nIGRvY3VtZW50LlxyXG4gICAgLy8gbm8gdmFsaWRhdGlvbiB3aGVuIHRoaXMgcGF0aCB3YXNuJ3Qgc2VsZWN0ZWQgaW4gdGhlIHF1ZXJ5LlxyXG4gICAgaWYgKHRoaXMgIT09IHVuZGVmaW5lZCAmJiAvLyDRgdC/0LXRhtC40LDQu9GM0L3QsNGPINC/0YDQvtCy0LXRgNC60LAg0LjQty3Qt9CwIHN0cmljdCBtb2RlINC4INC+0YHQvtCx0LXQvdC90L7RgdGC0LggLmNhbGwodW5kZWZpbmVkKVxyXG4gICAgICAgICdpc1NlbGVjdGVkJyBpbiB0aGlzICYmXHJcbiAgICAgICAgIXRoaXMuaXNTZWxlY3RlZChzZWxmLnBhdGgpICYmXHJcbiAgICAgICAgIXRoaXMuaXNNb2RpZmllZChzZWxmLnBhdGgpKSByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICByZXR1cm4gc2VsZi5jaGVja1JlcXVpcmVkKHYsIHRoaXMpO1xyXG4gIH07XHJcblxyXG4gIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgcmVxdWlyZWQpIHtcclxuICAgIG1lc3NhZ2UgPSByZXF1aXJlZDtcclxuICAgIHJlcXVpcmVkID0gdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5nZW5lcmFsLnJlcXVpcmVkO1xyXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFt0aGlzLnJlcXVpcmVkVmFsaWRhdG9yLCBtc2csICdyZXF1aXJlZCddKTtcclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIGRlZmF1bHQgdmFsdWVcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlIHRoZSBzY29wZSB3aGljaCBjYWxsYmFjayBhcmUgZXhlY3V0ZWRcclxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuZ2V0RGVmYXVsdCA9IGZ1bmN0aW9uIChzY29wZSwgaW5pdCkge1xyXG4gIHZhciByZXQgPSAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5kZWZhdWx0VmFsdWVcclxuICAgID8gdGhpcy5kZWZhdWx0VmFsdWUuY2FsbChzY29wZSlcclxuICAgIDogdGhpcy5kZWZhdWx0VmFsdWU7XHJcblxyXG4gIGlmIChudWxsICE9PSByZXQgJiYgdW5kZWZpbmVkICE9PSByZXQpIHtcclxuICAgIHJldHVybiB0aGlzLmNhc3QocmV0LCBzY29wZSwgaW5pdCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiByZXQ7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgc2V0dGVyc1xyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdFxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseVNldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlLCBpbml0LCBwcmlvclZhbCkge1xyXG4gIGlmIChTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSkge1xyXG4gICAgcmV0dXJuIGluaXRcclxuICAgICAgPyB2YWx1ZVxyXG4gICAgICA6IHRoaXMuY2FzdCh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcclxuICB9XHJcblxyXG4gIHZhciB2ID0gdmFsdWVcclxuICAgICwgc2V0dGVycyA9IHRoaXMuc2V0dGVyc1xyXG4gICAgLCBsZW4gPSBzZXR0ZXJzLmxlbmd0aFxyXG4gICAgLCBjYXN0ZXIgPSB0aGlzLmNhc3RlcjtcclxuXHJcbiAgaWYgKEFycmF5LmlzQXJyYXkodikgJiYgY2FzdGVyICYmIGNhc3Rlci5zZXR0ZXJzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdltpXSA9IGNhc3Rlci5hcHBseVNldHRlcnModltpXSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICghbGVuKSB7XHJcbiAgICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xyXG4gICAgcmV0dXJuIHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xyXG4gIH1cclxuXHJcbiAgd2hpbGUgKGxlbi0tKSB7XHJcbiAgICB2ID0gc2V0dGVyc1tsZW5dLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgaWYgKG51bGwgPT09IHYgfHwgdW5kZWZpbmVkID09PSB2KSByZXR1cm4gdjtcclxuXHJcbiAgLy8gZG8gbm90IGNhc3QgdW50aWwgYWxsIHNldHRlcnMgYXJlIGFwcGxpZWQgIzY2NVxyXG4gIHYgPSB0aGlzLmNhc3Qodiwgc2NvcGUsIGluaXQsIHByaW9yVmFsKTtcclxuXHJcbiAgcmV0dXJuIHY7XHJcbn07XHJcblxyXG4vKipcclxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGEgdmFsdWVcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uKCB2YWx1ZSwgc2NvcGUgKXtcclxuICBpZiAoIFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApICkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICB2YXIgdiA9IHZhbHVlXHJcbiAgICAsIGdldHRlcnMgPSB0aGlzLmdldHRlcnNcclxuICAgICwgbGVuID0gZ2V0dGVycy5sZW5ndGg7XHJcblxyXG4gIGlmICggIWxlbiApIHtcclxuICAgIHJldHVybiB2O1xyXG4gIH1cclxuXHJcbiAgd2hpbGUgKCBsZW4tLSApIHtcclxuICAgIHYgPSBnZXR0ZXJzWyBsZW4gXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBlcmZvcm1zIGEgdmFsaWRhdGlvbiBvZiBgdmFsdWVgIHVzaW5nIHRoZSB2YWxpZGF0b3JzIGRlY2xhcmVkIGZvciB0aGlzIFNjaGVtYVR5cGUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7YW55fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlLCBjYWxsYmFjaywgc2NvcGUpIHtcclxuICB2YXIgZXJyID0gZmFsc2VcclxuICAgICwgcGF0aCA9IHRoaXMucGF0aFxyXG4gICAgLCBjb3VudCA9IHRoaXMudmFsaWRhdG9ycy5sZW5ndGg7XHJcblxyXG4gIGlmICghY291bnQpIHJldHVybiBjYWxsYmFjayhudWxsKTtcclxuXHJcbiAgZnVuY3Rpb24gdmFsaWRhdGUgKG9rLCBtZXNzYWdlLCB0eXBlLCB2YWwpIHtcclxuICAgIGlmIChlcnIpIHJldHVybjtcclxuICAgIGlmIChvayA9PT0gdW5kZWZpbmVkIHx8IG9rKSB7XHJcbiAgICAgIC0tY291bnQgfHwgY2FsbGJhY2sobnVsbCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsYmFjayhlcnIgPSBuZXcgVmFsaWRhdG9yRXJyb3IocGF0aCwgbWVzc2FnZSwgdHlwZSwgdmFsKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aGlzLnZhbGlkYXRvcnMuZm9yRWFjaChmdW5jdGlvbiAodikge1xyXG4gICAgdmFyIHZhbGlkYXRvciA9IHZbMF1cclxuICAgICAgLCBtZXNzYWdlID0gdlsxXVxyXG4gICAgICAsIHR5cGUgPSB2WzJdO1xyXG5cclxuICAgIGlmICh2YWxpZGF0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcclxuICAgICAgdmFsaWRhdGUodmFsaWRhdG9yLnRlc3QodmFsdWUpLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XHJcbiAgICB9IGVsc2UgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWxpZGF0b3IpIHtcclxuICAgICAgaWYgKDIgPT09IHZhbGlkYXRvci5sZW5ndGgpIHtcclxuICAgICAgICB2YWxpZGF0b3IuY2FsbChzY29wZSwgdmFsdWUsIGZ1bmN0aW9uIChvaykge1xyXG4gICAgICAgICAgdmFsaWRhdGUob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IuY2FsbChzY29wZSwgdmFsdWUpLCBtZXNzYWdlLCB0eXBlLCB2YWx1ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmVzIGlmIHZhbHVlIGlzIGEgdmFsaWQgUmVmZXJlbmNlLlxyXG4gKlxyXG4gKiDQndCwINC60LvQuNC10L3RgtC1INCyINC60LDRh9C10YHRgtCy0LUg0YHRgdGL0LvQutC4INC80L7QttC90L4g0YXRgNCw0L3QuNGC0Ywg0LrQsNC6IGlkLCDRgtCw0Log0Lgg0L/QvtC70L3Ri9C1INC00L7QutGD0LzQtdC90YLRi1xyXG4gKlxyXG4gKiBAcGFyYW0ge1NjaGVtYVR5cGV9IHNlbGZcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hVHlwZS5faXNSZWYgPSBmdW5jdGlvbiggc2VsZiwgdmFsdWUgKXtcclxuICAvLyBmYXN0IHBhdGhcclxuICB2YXIgcmVmID0gc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWY7XHJcblxyXG4gIGlmICggcmVmICkge1xyXG4gICAgaWYgKCBudWxsID09IHZhbHVlICkgcmV0dXJuIHRydWU7XHJcbiAgICBpZiAoIF8uaXNPYmplY3QoIHZhbHVlICkgKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hVHlwZTtcclxuXHJcblNjaGVtYVR5cGUuQ2FzdEVycm9yID0gQ2FzdEVycm9yO1xyXG5cclxuU2NoZW1hVHlwZS5WYWxpZGF0b3JFcnJvciA9IFZhbGlkYXRvckVycm9yO1xyXG4iLCIvKiFcclxuICogU3RhdGVNYWNoaW5lIHJlcHJlc2VudHMgYSBtaW5pbWFsIGBpbnRlcmZhY2VgIGZvciB0aGVcclxuICogY29uc3RydWN0b3JzIGl0IGJ1aWxkcyB2aWEgU3RhdGVNYWNoaW5lLmN0b3IoLi4uKS5cclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxudmFyIFN0YXRlTWFjaGluZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVNYWNoaW5lICgpIHtcclxuICB0aGlzLnBhdGhzID0ge307XHJcbiAgdGhpcy5zdGF0ZXMgPSB7fTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBTdGF0ZU1hY2hpbmUuY3Rvcignc3RhdGUxJywgJ3N0YXRlMicsIC4uLilcclxuICogQSBmYWN0b3J5IG1ldGhvZCBmb3Igc3ViY2xhc3NpbmcgU3RhdGVNYWNoaW5lLlxyXG4gKiBUaGUgYXJndW1lbnRzIGFyZSBhIGxpc3Qgb2Ygc3RhdGVzLiBGb3IgZWFjaCBzdGF0ZSxcclxuICogdGhlIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGdldHMgc3RhdGUgdHJhbnNpdGlvblxyXG4gKiBtZXRob2RzIG5hbWVkIGFmdGVyIGVhY2ggc3RhdGUuIFRoZXNlIHRyYW5zaXRpb24gbWV0aG9kc1xyXG4gKiBwbGFjZSB0aGVpciBwYXRoIGFyZ3VtZW50IGludG8gdGhlIGdpdmVuIHN0YXRlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RhdGVcclxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cclxuICogQHJldHVybiB7RnVuY3Rpb259IHN1YmNsYXNzIGNvbnN0cnVjdG9yXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG5cclxuU3RhdGVNYWNoaW5lLmN0b3IgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpO1xyXG5cclxuICB2YXIgY3RvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIFN0YXRlTWFjaGluZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5zdGF0ZU5hbWVzID0gc3RhdGVzO1xyXG5cclxuICAgIHZhciBpID0gc3RhdGVzLmxlbmd0aFxyXG4gICAgICAsIHN0YXRlO1xyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XHJcbiAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXSA9IHt9O1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggU3RhdGVNYWNoaW5lLnByb3RvdHlwZSApO1xyXG4gIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcclxuXHJcbiAgc3RhdGVzLmZvckVhY2goZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICAvLyBDaGFuZ2VzIHRoZSBgcGF0aGAncyBzdGF0ZSB0byBgc3RhdGVgLlxyXG4gICAgY3Rvci5wcm90b3R5cGVbc3RhdGVdID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICAgICAgdGhpcy5fY2hhbmdlU3RhdGUocGF0aCwgc3RhdGUpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gY3RvcjtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHdyYXBwZWQgYnkgdGhlIHN0YXRlIGNoYW5nZSBmdW5jdGlvbnM6XHJcbiAqXHJcbiAqIC0gYHJlcXVpcmUocGF0aClgXHJcbiAqIC0gYG1vZGlmeShwYXRoKWBcclxuICogLSBgaW5pdChwYXRoKWBcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5fY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiBfY2hhbmdlU3RhdGUgKHBhdGgsIG5leHRTdGF0ZSkge1xyXG4gIHZhciBwcmV2QnVja2V0ID0gdGhpcy5zdGF0ZXNbdGhpcy5wYXRoc1twYXRoXV07XHJcbiAgaWYgKHByZXZCdWNrZXQpIGRlbGV0ZSBwcmV2QnVja2V0W3BhdGhdO1xyXG5cclxuICB0aGlzLnBhdGhzW3BhdGhdID0gbmV4dFN0YXRlO1xyXG4gIHRoaXMuc3RhdGVzW25leHRTdGF0ZV1bcGF0aF0gPSB0cnVlO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIGlnbm9yZVxyXG4gKi9cclxuXHJcblN0YXRlTWFjaGluZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhciAoc3RhdGUpIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc3RhdGVzW3N0YXRlXSlcclxuICAgICwgaSA9IGtleXMubGVuZ3RoXHJcbiAgICAsIHBhdGg7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIHBhdGggPSBrZXlzW2ldO1xyXG4gICAgZGVsZXRlIHRoaXMuc3RhdGVzW3N0YXRlXVtwYXRoXTtcclxuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xyXG4gIH1cclxufTtcclxuXHJcbi8qIVxyXG4gKiBDaGVja3MgdG8gc2VlIGlmIGF0IGxlYXN0IG9uZSBwYXRoIGlzIGluIHRoZSBzdGF0ZXMgcGFzc2VkIGluIHZpYSBgYXJndW1lbnRzYFxyXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZSB0aGF0IHdlIHdhbnQgdG8gY2hlY2sgZm9yLlxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuXHJcblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB2YXIgd2hhdCA9IGFyZ3VtZW50cy5sZW5ndGggPyBhcmd1bWVudHMgOiB0aGlzLnN0YXRlTmFtZXM7XHJcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKS5sZW5ndGg7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKiFcclxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxyXG4gKiBzaW5jZSBib3RoIG9mIHRob3NlIG1ldGhvZHMgc2hhcmUgYSBsb3Qgb2YgdGhlIHNhbWUgbG9naWMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcclxuICogQHJldHVybiB7RnVuY3Rpb259XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2l0ZXIgPSBmdW5jdGlvbiBfaXRlciAoaXRlck1ldGhvZCkge1xyXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbnVtQXJncyA9IGFyZ3VtZW50cy5sZW5ndGhcclxuICAgICAgLCBzdGF0ZXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgwLCBudW1BcmdzLTEpXHJcbiAgICAgICwgY2FsbGJhY2sgPSBhcmd1bWVudHNbbnVtQXJncy0xXTtcclxuXHJcbiAgICBpZiAoIXN0YXRlcy5sZW5ndGgpIHN0YXRlcyA9IHRoaXMuc3RhdGVOYW1lcztcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIHBhdGhzID0gc3RhdGVzLnJlZHVjZShmdW5jdGlvbiAocGF0aHMsIHN0YXRlKSB7XHJcbiAgICAgIHJldHVybiBwYXRocy5jb25jYXQoT2JqZWN0LmtleXMoc2VsZi5zdGF0ZXNbc3RhdGVdKSk7XHJcbiAgICB9LCBbXSk7XHJcblxyXG4gICAgcmV0dXJuIHBhdGhzW2l0ZXJNZXRob2RdKGZ1bmN0aW9uIChwYXRoLCBpLCBwYXRocykge1xyXG4gICAgICByZXR1cm4gY2FsbGJhY2socGF0aCwgaSwgcGF0aHMpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBJdGVyYXRlcyBvdmVyIHRoZSBwYXRocyB0aGF0IGJlbG9uZyB0byBvbmUgb2YgdGhlIHBhcmFtZXRlciBzdGF0ZXMuXHJcbiAqXHJcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XHJcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIGZuKTsgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTFcclxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcclxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cclxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcclxuICogQHByaXZhdGVcclxuICovXHJcblxyXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcclxuICB0aGlzLmZvckVhY2ggPSB0aGlzLl9pdGVyKCdmb3JFYWNoJyk7XHJcbiAgcmV0dXJuIHRoaXMuZm9yRWFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxyXG4gKlxyXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxyXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXHJcbiAqIHRoaXMuZm9yRWFjaChzdGF0ZTEsIHN0YXRlMiwgZm4pOyAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBzdGF0ZTEgb3Igc3RhdGUyXHJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuXHJcblN0YXRlTWFjaGluZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gbWFwICgpIHtcclxuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xyXG4gIHJldHVybiB0aGlzLm1hcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5cclxuIiwiLy9UT0RPOiDQv9C+0YfQuNGB0YLQuNGC0Ywg0LrQvtC0XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgRW1iZWRkZWREb2N1bWVudCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcclxudmFyIERvY3VtZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQnKTtcclxudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi9vYmplY3RpZCcpO1xyXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xyXG5cclxuLyoqXHJcbiAqIFN0b3JhZ2UgQXJyYXkgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqICMjIyNOT1RFOlxyXG4gKlxyXG4gKiBfVmFsdWVzIGFsd2F5cyBoYXZlIHRvIGJlIHBhc3NlZCB0byB0aGUgY29uc3RydWN0b3IgdG8gaW5pdGlhbGl6ZSwgb3RoZXJ3aXNlIGBTdG9yYWdlQXJyYXkjcHVzaGAgd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZC5fXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgcGFyZW50IGRvY3VtZW50XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKiBAaW5oZXJpdHMgQXJyYXlcclxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxyXG4gKi9cclxuZnVuY3Rpb24gU3RvcmFnZUFycmF5ICh2YWx1ZXMsIHBhdGgsIGRvYykge1xyXG4gIHZhciBhcnIgPSBbXTtcclxuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XHJcbiAgXy5taXhpbiggYXJyLCBTdG9yYWdlQXJyYXkubWl4aW4gKTtcclxuXHJcbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcclxuICBhcnIuX3BhdGggPSBwYXRoO1xyXG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XHJcblxyXG4gIGlmIChkb2MpIHtcclxuICAgIGFyci5fcGFyZW50ID0gZG9jO1xyXG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG5TdG9yYWdlQXJyYXkubWl4aW4gPSB7XHJcbiAgLyoqXHJcbiAgICogUGFyZW50IG93bmVyIGRvY3VtZW50XHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkgX3BhcmVudFxyXG4gICAqIEBhcGkgcHJpdmF0ZVxyXG4gICAqL1xyXG4gIF9wYXJlbnQ6IHVuZGVmaW5lZCxcclxuXHJcbiAgLyoqXHJcbiAgICogQ2FzdHMgYSBtZW1iZXIgYmFzZWQgb24gdGhpcyBhcnJheXMgc2NoZW1hLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHthbnl9IHZhbHVlXHJcbiAgICogQHJldHVybiB2YWx1ZSB0aGUgY2FzdGVkIHZhbHVlXHJcbiAgICogQGFwaSBwcml2YXRlXHJcbiAgICovXHJcbiAgX2Nhc3Q6IGZ1bmN0aW9uICggdmFsdWUgKSB7XHJcbiAgICB2YXIgb3duZXIgPSB0aGlzLl9vd25lcjtcclxuICAgIHZhciBwb3B1bGF0ZWQgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XHJcbiAgICAgIC8vIGlmIGEgcG9wdWxhdGVkIGFycmF5LCB3ZSBtdXN0IGNhc3QgdG8gdGhlIHNhbWUgbW9kZWxcclxuICAgICAgLy8gaW5zdGFuY2UgYXMgc3BlY2lmaWVkIGluIHRoZSBvcmlnaW5hbCBxdWVyeS5cclxuICAgICAgaWYgKCFvd25lcikge1xyXG4gICAgICAgIG93bmVyID0gdGhpcy5fb3duZXIgPSB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudFxyXG4gICAgICAgICAgPyB0aGlzLl9wYXJlbnQub3duZXJEb2N1bWVudCgpXHJcbiAgICAgICAgICA6IHRoaXMuX3BhcmVudDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcG9wdWxhdGVkID0gb3duZXIucG9wdWxhdGVkKHRoaXMuX3BhdGgsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwb3B1bGF0ZWQgJiYgbnVsbCAhPSB2YWx1ZSkge1xyXG4gICAgICAvLyBjYXN0IHRvIHRoZSBwb3B1bGF0ZWQgTW9kZWxzIHNjaGVtYVxyXG4gICAgICB2YXIgTW9kZWwgPSBwb3B1bGF0ZWQub3B0aW9ucy5tb2RlbDtcclxuXHJcbiAgICAgIC8vIG9ubHkgb2JqZWN0cyBhcmUgcGVybWl0dGVkIHNvIHdlIGNhbiBzYWZlbHkgYXNzdW1lIHRoYXRcclxuICAgICAgLy8gbm9uLW9iamVjdHMgYXJlIHRvIGJlIGludGVycHJldGVkIGFzIF9pZFxyXG4gICAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xyXG4gICAgICAgIHZhbHVlID0geyBfaWQ6IHZhbHVlIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhbHVlID0gbmV3IE1vZGVsKHZhbHVlKTtcclxuICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLl9zY2hlbWEuY2FzdGVyLmNhc3QodmFsdWUsIHRoaXMuX3BhcmVudCwgZmFsc2UpXHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cclxuICAgKlxyXG4gICAqIElmIGl0IGJ1YmJsZXMgdXAgZnJvbSBhbiBlbWJlZGRlZCBkb2N1bWVudCBjaGFuZ2UsIHRoZW4gaXQgdGFrZXMgdGhlIGZvbGxvd2luZyBhcmd1bWVudHMgKG90aGVyd2lzZSwgdGFrZXMgMCBhcmd1bWVudHMpXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge0VtYmVkZGVkRG9jdW1lbnR9IGVtYmVkZGVkRG9jIHRoZSBlbWJlZGRlZCBkb2MgdGhhdCBpbnZva2VkIHRoaXMgbWV0aG9kIG9uIHRoZSBBcnJheVxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbWJlZGRlZFBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZCBpbiB0aGUgZW1iZWRkZWREb2NcclxuICAgKiBAYXBpIHByaXZhdGVcclxuICAgKi9cclxuICBfbWFya01vZGlmaWVkOiBmdW5jdGlvbiAoZWxlbSwgZW1iZWRkZWRQYXRoKSB7XHJcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XHJcbiAgICAgICwgZGlydHlQYXRoO1xyXG5cclxuICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgZGlydHlQYXRoID0gdGhpcy5fcGF0aDtcclxuXHJcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICAgICAgaWYgKG51bGwgIT0gZW1iZWRkZWRQYXRoKSB7XHJcbiAgICAgICAgICAvLyBhbiBlbWJlZGRlZCBkb2MgYnViYmxlZCB1cCB0aGUgY2hhbmdlXHJcbiAgICAgICAgICBkaXJ0eVBhdGggPSBkaXJ0eVBhdGggKyAnLicgKyB0aGlzLmluZGV4T2YoZWxlbSkgKyAnLicgKyBlbWJlZGRlZFBhdGg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGRpcmVjdGx5IHNldCBhbiBpbmRleFxyXG4gICAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgZWxlbTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHBhcmVudC5tYXJrTW9kaWZpZWQoZGlydHlQYXRoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBXcmFwcyBbYEFycmF5I3B1c2hgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wdXNoKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge09iamVjdH0gW2FyZ3MuLi5dXHJcbiAgICogQGFwaSBwdWJsaWNcclxuICAgKi9cclxuICBwdXNoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWVzID0gW10ubWFwLmNhbGwoYXJndW1lbnRzLCB0aGlzLl9jYXN0LCB0aGlzKVxyXG4gICAgICAsIHJldCA9IFtdLnB1c2guYXBwbHkodGhpcywgdmFsdWVzKTtcclxuXHJcbiAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcclxuICAgIHJldHVybiByZXQ7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogV3JhcHMgW2BBcnJheSNwb3BgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9wb3ApIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cclxuICAgKlxyXG4gICAqICMjIyNOb3RlOlxyXG4gICAqXHJcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXHJcbiAgICpcclxuICAgKiBAc2VlIFN0b3JhZ2VBcnJheSMkcG9wICN0eXBlc19hcnJheV9Nb25nb29zZUFycmF5LSUyNHBvcFxyXG4gICAqIEBhcGkgcHVibGljXHJcbiAgICovXHJcbiAgcG9wOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcmV0ID0gW10ucG9wLmNhbGwodGhpcyk7XHJcblxyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXHJcbiAgICpcclxuICAgKiAjIyMjRXhhbXBsZTpcclxuICAgKlxyXG4gICAqICAgICBkb2MuYXJyYXkgPSBbMiwzXTtcclxuICAgKiAgICAgdmFyIHJlcyA9IGRvYy5hcnJheS5zaGlmdCgpO1xyXG4gICAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcclxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbM11cclxuICAgKlxyXG4gICAqICMjIyNOb3RlOlxyXG4gICAqXHJcbiAgICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xyXG4gICAqXHJcbiAgICogQGFwaSBwdWJsaWNcclxuICAgKi9cclxuICBzaGlmdDogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJldCA9IFtdLnNoaWZ0LmNhbGwodGhpcyk7XHJcblxyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFB1bGxzIGl0ZW1zIGZyb20gdGhlIGFycmF5IGF0b21pY2FsbHkuXHJcbiAgICpcclxuICAgKiAjIyMjRXhhbXBsZXM6XHJcbiAgICpcclxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoT2JqZWN0SWQpXHJcbiAgICogICAgIGRvYy5hcnJheS5wdWxsKHsgX2lkOiAnc29tZUlkJyB9KVxyXG4gICAqICAgICBkb2MuYXJyYXkucHVsbCgzNilcclxuICAgKiAgICAgZG9jLmFycmF5LnB1bGwoJ3RhZyAxJywgJ3RhZyAyJylcclxuICAgKlxyXG4gICAqIFRvIHJlbW92ZSBhIGRvY3VtZW50IGZyb20gYSBzdWJkb2N1bWVudCBhcnJheSB3ZSBtYXkgcGFzcyBhbiBvYmplY3Qgd2l0aCBhIG1hdGNoaW5nIGBfaWRgLlxyXG4gICAqXHJcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcclxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCh7IF9pZDogNDgxNTE2MjM0MiB9KSAvLyByZW1vdmVkXHJcbiAgICpcclxuICAgKiBPciB3ZSBtYXkgcGFzc2luZyB0aGUgX2lkIGRpcmVjdGx5IGFuZCBsZXQgbW9uZ29vc2UgdGFrZSBjYXJlIG9mIGl0LlxyXG4gICAqXHJcbiAgICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcclxuICAgKiAgICAgZG9jLnN1YmRvY3MucHVsbCg0ODE1MTYyMzQyKTsgLy8gd29ya3NcclxuICAgKlxyXG4gICAqIEBwYXJhbSB7YW55fSBbYXJncy4uLl1cclxuICAgKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcclxuICAgKiBAYXBpIHB1YmxpY1xyXG4gICAqL1xyXG4gIHB1bGw6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXHJcbiAgICAgICwgY3VyID0gdGhpcy5fcGFyZW50LmdldCh0aGlzLl9wYXRoKVxyXG4gICAgICAsIGkgPSBjdXIubGVuZ3RoXHJcbiAgICAgICwgbWVtO1xyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgbWVtID0gY3VyW2ldO1xyXG4gICAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xyXG4gICAgICAgIGlmICh2YWx1ZXMuc29tZShmdW5jdGlvbiAodikgeyByZXR1cm4gdi5lcXVhbHMobWVtKTsgfSApKSB7XHJcbiAgICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmICh+Y3VyLmluZGV4T2YuY2FsbCh2YWx1ZXMsIG1lbSkpIHtcclxuICAgICAgICBbXS5zcGxpY2UuY2FsbChjdXIsIGksIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBXcmFwcyBbYEFycmF5I3NwbGljZWBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3NwbGljZSkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nIGFuZCBjYXN0aW5nLlxyXG4gICAqXHJcbiAgICogIyMjI05vdGU6XHJcbiAgICpcclxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXHJcbiAgICpcclxuICAgKiBAYXBpIHB1YmxpY1xyXG4gICAqL1xyXG4gIHNwbGljZTogZnVuY3Rpb24gc3BsaWNlICgpIHtcclxuICAgIHZhciByZXQsIHZhbHMsIGk7XHJcblxyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgICAgdmFscyA9IFtdO1xyXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFsc1tpXSA9IGkgPCAyXHJcbiAgICAgICAgICA/IGFyZ3VtZW50c1tpXVxyXG4gICAgICAgICAgOiB0aGlzLl9jYXN0KGFyZ3VtZW50c1tpXSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xyXG5cclxuICAgICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXHJcbiAgICpcclxuICAgKiAjIyMjTm90ZTpcclxuICAgKlxyXG4gICAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cclxuICAgKlxyXG4gICAqIEBhcGkgcHVibGljXHJcbiAgICovXHJcbiAgdW5zaGlmdDogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XHJcbiAgICBbXS51bnNoaWZ0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XHJcblxyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogV3JhcHMgW2BBcnJheSNzb3J0YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvc29ydCkgd2l0aCBwcm9wZXIgY2hhbmdlIHRyYWNraW5nLlxyXG4gICAqXHJcbiAgICogIyMjI05PVEU6XHJcbiAgICpcclxuICAgKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXHJcbiAgICpcclxuICAgKiBAYXBpIHB1YmxpY1xyXG4gICAqL1xyXG4gIHNvcnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciByZXQgPSBbXS5zb3J0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblxyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XHJcbiAgICByZXR1cm4gcmV0O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgdmFsdWVzIHRvIHRoZSBhcnJheSBpZiBub3QgYWxyZWFkeSBwcmVzZW50LlxyXG4gICAqXHJcbiAgICogIyMjI0V4YW1wbGU6XHJcbiAgICpcclxuICAgKiAgICAgY29uc29sZS5sb2coZG9jLmFycmF5KSAvLyBbMiwzLDRdXHJcbiAgICogICAgIHZhciBhZGRlZCA9IGRvYy5hcnJheS5hZGRUb1NldCg0LDUpO1xyXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNCw1XVxyXG4gICAqICAgICBjb25zb2xlLmxvZyhhZGRlZCkgICAgIC8vIFs1XVxyXG4gICAqXHJcbiAgICogQHBhcmFtIHthbnl9IFthcmdzLi4uXVxyXG4gICAqIEByZXR1cm4ge0FycmF5fSB0aGUgdmFsdWVzIHRoYXQgd2VyZSBhZGRlZFxyXG4gICAqIEBhcGkgcHVibGljXHJcbiAgICovXHJcbiAgYWRkVG9TZXQ6IGZ1bmN0aW9uIGFkZFRvU2V0ICgpIHtcclxuICAgIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXHJcbiAgICAgICwgYWRkZWQgPSBbXVxyXG4gICAgICAsIHR5cGUgPSB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50ID8gJ2RvYycgOlxyXG4gICAgICAgICAgICAgICB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBEYXRlID8gJ2RhdGUnIDpcclxuICAgICAgICAgICAgICAgJyc7XHJcblxyXG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdmFyIGZvdW5kO1xyXG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICBjYXNlICdkb2MnOlxyXG4gICAgICAgICAgZm91bmQgPSB0aGlzLnNvbWUoZnVuY3Rpb24oZG9jKXsgcmV0dXJuIGRvYy5lcXVhbHModikgfSk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICdkYXRlJzpcclxuICAgICAgICAgIHZhciB2YWwgPSArdjtcclxuICAgICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGQpeyByZXR1cm4gK2QgPT09IHZhbCB9KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBmb3VuZCA9IH50aGlzLmluZGV4T2Yodik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICBbXS5wdXNoLmNhbGwodGhpcywgdik7XHJcblxyXG4gICAgICAgIHRoaXMuX21hcmtNb2RpZmllZCgpO1xyXG4gICAgICAgIFtdLnB1c2guY2FsbChhZGRlZCwgdik7XHJcbiAgICAgIH1cclxuICAgIH0sIHRoaXMpO1xyXG5cclxuICAgIHJldHVybiBhZGRlZDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBTZXRzIHRoZSBjYXN0ZWQgYHZhbGAgYXQgaW5kZXggYGlgIGFuZCBtYXJrcyB0aGUgYXJyYXkgbW9kaWZpZWQuXHJcbiAgICpcclxuICAgKiAjIyMjRXhhbXBsZTpcclxuICAgKlxyXG4gICAqICAgICAvLyBnaXZlbiBkb2N1bWVudHMgYmFzZWQgb24gdGhlIGZvbGxvd2luZ1xyXG4gICAqICAgICB2YXIgRG9jID0gbW9uZ29vc2UubW9kZWwoJ0RvYycsIG5ldyBTY2hlbWEoeyBhcnJheTogW051bWJlcl0gfSkpO1xyXG4gICAqXHJcbiAgICogICAgIHZhciBkb2MgPSBuZXcgRG9jKHsgYXJyYXk6IFsyLDMsNF0gfSlcclxuICAgKlxyXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFsyLDMsNF1cclxuICAgKlxyXG4gICAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xyXG4gICAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpOyAvLyBbMiw1LDRdIC8vIHByb3Blcmx5IGNhc3QgdG8gbnVtYmVyXHJcbiAgICogICAgIGRvYy5zYXZlKCkgLy8gdGhlIGNoYW5nZSBpcyBzYXZlZFxyXG4gICAqXHJcbiAgICogICAgIC8vIFZTIG5vdCB1c2luZyBhcnJheSNzZXRcclxuICAgKiAgICAgZG9jLmFycmF5WzFdID0gXCI1XCI7XHJcbiAgICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcclxuICAgKiAgICAgZG9jLnNhdmUoKSAvLyBjaGFuZ2UgaXMgbm90IHNhdmVkXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xyXG4gICAqIEBhcGkgcHVibGljXHJcbiAgICovXHJcbiAgc2V0OiBmdW5jdGlvbiAoaSwgdmFsKSB7XHJcbiAgICB0aGlzW2ldID0gdGhpcy5fY2FzdCh2YWwpO1xyXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKGkpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJucyBhIG5hdGl2ZSBqcyBBcnJheS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAgICogQHJldHVybiB7QXJyYXl9XHJcbiAgICogQGFwaSBwdWJsaWNcclxuICAgKi9cclxuICB0b09iamVjdDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSkge1xyXG4gICAgICByZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGRvYykge1xyXG4gICAgICAgIHJldHVybiBkb2MgaW5zdGFuY2VvZiBEb2N1bWVudFxyXG4gICAgICAgICAgPyBkb2MudG9PYmplY3Qob3B0aW9ucylcclxuICAgICAgICAgIDogZG9jXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnNsaWNlKCk7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJuIHRoZSBpbmRleCBvZiBgb2JqYCBvciBgLTFgIGlmIG5vdCBmb3VuZC5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIGl0ZW0gdG8gbG9vayBmb3JcclxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9XHJcbiAgICogQGFwaSBwdWJsaWNcclxuICAgKi9cclxuICBpbmRleE9mOiBmdW5jdGlvbiBpbmRleE9mIChvYmopIHtcclxuICAgIGlmIChvYmogaW5zdGFuY2VvZiBPYmplY3RJZCkgb2JqID0gb2JqLnRvU3RyaW5nKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICBpZiAob2JqID09IHRoaXNbaV0pXHJcbiAgICAgICAgcmV0dXJuIGk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFsaWFzIG9mIFtwdWxsXSgjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS1wdWxsKVxyXG4gKlxyXG4gKiBAc2VlIFN0b3JhZ2VBcnJheSNwdWxsICN0eXBlc19hcnJheV9Nb25nb29zZUFycmF5LXB1bGxcclxuICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEBtZW1iZXJPZiBTdG9yYWdlQXJyYXlcclxuICogQG1ldGhvZCByZW1vdmVcclxuICovXHJcblN0b3JhZ2VBcnJheS5taXhpbi5yZW1vdmUgPSBTdG9yYWdlQXJyYXkubWl4aW4ucHVsbDtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VBcnJheTtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqL1xyXG5cclxudmFyIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKVxyXG4gICwgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJylcclxuICAsIE9iamVjdElkU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hL29iamVjdGlkJylcclxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxyXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xyXG5cclxuLyoqXHJcbiAqIERvY3VtZW50QXJyYXkgY29uc3RydWN0b3JcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gdmFsdWVzXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHRvIHRoaXMgYXJyYXlcclxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxyXG4gKiBAYXBpIHByaXZhdGVcclxuICogQHJldHVybiB7U3RvcmFnZURvY3VtZW50QXJyYXl9XHJcbiAqIEBpbmhlcml0cyBTdG9yYWdlQXJyYXlcclxuICogQHNlZSBodHRwOi8vYml0Lmx5L2Y2Q25aVVxyXG4gKiBUT0RPOiDQv9C+0LTRh9C40YHRgtC40YLRjCDQutC+0LRcclxuICpcclxuICog0JLQtdGB0Ywg0L3Rg9C20L3Ri9C5INC60L7QtCDRgdC60L7Qv9C40YDQvtCy0LDQvVxyXG4gKi9cclxuZnVuY3Rpb24gU3RvcmFnZURvY3VtZW50QXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XHJcbiAgdmFyIGFyciA9IFtdO1xyXG5cclxuICAvLyBWYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBzaW5jZVxyXG4gIC8vIG90aGVyd2lzZSBTdG9yYWdlQXJyYXkjcHVzaCB3aWxsIG1hcmsgdGhlIGFycmF5IGFzIG1vZGlmaWVkIHRvIHRoZSBwYXJlbnQuXHJcbiAgYXJyLnB1c2guYXBwbHkoYXJyLCB2YWx1ZXMpO1xyXG4gIF8ubWl4aW4oIGFyciwgU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4gKTtcclxuXHJcbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcclxuICBhcnIuX3BhdGggPSBwYXRoO1xyXG4gIGFyci5pc1N0b3JhZ2VBcnJheSA9IHRydWU7XHJcbiAgYXJyLmlzU3RvcmFnZURvY3VtZW50QXJyYXkgPSB0cnVlO1xyXG5cclxuICBpZiAoZG9jKSB7XHJcbiAgICBhcnIuX3BhcmVudCA9IGRvYztcclxuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xyXG4gICAgYXJyLl9oYW5kbGVycyA9IHtcclxuICAgICAgaXNOZXc6IGFyci5ub3RpZnkoJ2lzTmV3JyksXHJcbiAgICAgIHNhdmU6IGFyci5ub3RpZnkoJ3NhdmUnKVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyDQn9GA0L7QsdGA0L7RgSDQuNC30LzQtdC90LXQvdC40Y8g0YHQvtGB0YLQvtGP0L3QuNGPINCyINC/0L7QtNC00L7QutGD0LzQtdC90YJcclxuICAgIGRvYy5vbignc2F2ZScsIGFyci5faGFuZGxlcnMuc2F2ZSk7XHJcbiAgICBkb2Mub24oJ2lzTmV3JywgYXJyLl9oYW5kbGVycy5pc05ldyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTdG9yYWdlQXJyYXlcclxuICovXHJcblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluID0gT2JqZWN0LmNyZWF0ZSggU3RvcmFnZUFycmF5Lm1peGluICk7XHJcblxyXG4vKipcclxuICogT3ZlcnJpZGVzIFN0b3JhZ2VBcnJheSNjYXN0XHJcbiAqXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU3RvcmFnZURvY3VtZW50QXJyYXkubWl4aW4uX2Nhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiB0aGlzLl9zY2hlbWEuY2FzdGVyQ29uc3RydWN0b3IpIHtcclxuICAgIGlmICghKHZhbHVlLl9fcGFyZW50ICYmIHZhbHVlLl9fcGFyZW50QXJyYXkpKSB7XHJcbiAgICAgIC8vIHZhbHVlIG1heSBoYXZlIGJlZW4gY3JlYXRlZCB1c2luZyBhcnJheS5jcmVhdGUoKVxyXG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcclxuICAgICAgdmFsdWUuX19wYXJlbnRBcnJheSA9IHRoaXM7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvLyBoYW5kbGUgY2FzdCgnc3RyaW5nJykgb3IgY2FzdChPYmplY3RJZCkgZXRjLlxyXG4gIC8vIG9ubHkgb2JqZWN0cyBhcmUgcGVybWl0dGVkIHNvIHdlIGNhbiBzYWZlbHkgYXNzdW1lIHRoYXRcclxuICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXHJcbiAgaWYgKCB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElkIHx8ICFfLmlzT2JqZWN0KHZhbHVlKSApIHtcclxuICAgIHZhbHVlID0geyBfaWQ6IHZhbHVlIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZSwgdGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2VhcmNoZXMgYXJyYXkgaXRlbXMgZm9yIHRoZSBmaXJzdCBkb2N1bWVudCB3aXRoIGEgbWF0Y2hpbmcgX2lkLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBlbWJlZGRlZERvYyA9IG0uYXJyYXkuaWQoc29tZV9pZCk7XHJcbiAqXHJcbiAqIEByZXR1cm4ge0VtYmVkZGVkRG9jdW1lbnR8bnVsbH0gdGhlIHN1YmRvY3VtZW50IG9yIG51bGwgaWYgbm90IGZvdW5kLlxyXG4gKiBAcGFyYW0ge09iamVjdElkfFN0cmluZ3xOdW1iZXJ9IGlkXHJcbiAqIEBUT0RPIGNhc3QgdG8gdGhlIF9pZCBiYXNlZCBvbiBzY2hlbWEgZm9yIHByb3BlciBjb21wYXJpc29uXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5pZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHZhciBjYXN0ZWRcclxuICAgICwgc2lkXHJcbiAgICAsIF9pZDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIHZhciBjYXN0ZWRfID0gT2JqZWN0SWRTY2hlbWEucHJvdG90eXBlLmNhc3QuY2FsbCh7fSwgaWQpO1xyXG4gICAgaWYgKGNhc3RlZF8pIGNhc3RlZCA9IFN0cmluZyhjYXN0ZWRfKTtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBjYXN0ZWQgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgX2lkID0gdGhpc1tpXS5nZXQoJ19pZCcpO1xyXG5cclxuICAgIGlmIChfaWQgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xyXG4gICAgICBzaWQgfHwgKHNpZCA9IFN0cmluZyhpZCkpO1xyXG4gICAgICBpZiAoc2lkID09IF9pZC5faWQpIHJldHVybiB0aGlzW2ldO1xyXG4gICAgfSBlbHNlIGlmICghKF9pZCBpbnN0YW5jZW9mIE9iamVjdElkKSkge1xyXG4gICAgICBzaWQgfHwgKHNpZCA9IFN0cmluZyhpZCkpO1xyXG4gICAgICBpZiAoc2lkID09IF9pZCkgcmV0dXJuIHRoaXNbaV07XHJcbiAgICB9IGVsc2UgaWYgKGNhc3RlZCA9PSBfaWQpIHtcclxuICAgICAgcmV0dXJuIHRoaXNbaV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5IG9mIHBsYWluIGpzIG9iamVjdHNcclxuICpcclxuICogIyMjI05PVEU6XHJcbiAqXHJcbiAqIF9FYWNoIHN1Yi1kb2N1bWVudCBpcyBjb252ZXJ0ZWQgdG8gYSBwbGFpbiBvYmplY3QgYnkgY2FsbGluZyBpdHMgYCN0b09iamVjdGAgbWV0aG9kLl9cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbCBvcHRpb25zIHRvIHBhc3MgdG8gZWFjaCBkb2N1bWVudHMgYHRvT2JqZWN0YCBtZXRob2QgY2FsbCBkdXJpbmcgY29udmVyc2lvblxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChkb2MpIHtcclxuICAgIHJldHVybiBkb2MgJiYgZG9jLnRvT2JqZWN0KG9wdGlvbnMpIHx8IG51bGw7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIHN1YmRvY3VtZW50IGNhc3RlZCB0byB0aGlzIHNjaGVtYS5cclxuICpcclxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSB2YWx1ZSB0byBjYXN0IHRvIHRoaXMgYXJyYXlzIFN1YkRvY3VtZW50IHNjaGVtYVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblN0b3JhZ2VEb2N1bWVudEFycmF5Lm1peGluLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcclxuICByZXR1cm4gbmV3IHRoaXMuX3NjaGVtYS5jYXN0ZXJDb25zdHJ1Y3RvcihvYmopO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBmbiB0aGF0IG5vdGlmaWVzIGFsbCBjaGlsZCBkb2NzIG9mIGBldmVudGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5taXhpbi5ub3RpZnkgPSBmdW5jdGlvbiBub3RpZnkgKGV2ZW50KSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHJldHVybiBmdW5jdGlvbiBub3RpZnkgKHZhbCkge1xyXG4gICAgdmFyIGkgPSBzZWxmLmxlbmd0aDtcclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgaWYgKCFzZWxmW2ldKSBjb250aW51ZTtcclxuICAgICAgc2VsZltpXS50cmlnZ2VyKGV2ZW50LCB2YWwpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JhZ2VEb2N1bWVudEFycmF5O1xyXG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xyXG5cclxuLyoqXHJcbiAqIEVtYmVkZGVkRG9jdW1lbnQgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGpzIG9iamVjdCByZXR1cm5lZCBmcm9tIHRoZSBkYlxyXG4gKiBAcGFyYW0ge01vbmdvb3NlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxyXG4gKiBAaW5oZXJpdHMgRG9jdW1lbnRcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICggZGF0YSwgcGFyZW50QXJyICkge1xyXG4gIGlmIChwYXJlbnRBcnIpIHtcclxuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcclxuICAgIHRoaXMuX19wYXJlbnQgPSBwYXJlbnRBcnIuX3BhcmVudDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5fX3BhcmVudCA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIERvY3VtZW50LmNhbGwoIHRoaXMsIGRhdGEsIHVuZGVmaW5lZCApO1xyXG5cclxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLm9uKCdpc05ldycsIGZ1bmN0aW9uICh2YWwpIHtcclxuICAgIHNlbGYuaXNOZXcgPSB2YWw7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBJbmhlcml0IGZyb20gRG9jdW1lbnRcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSggRG9jdW1lbnQucHJvdG90eXBlICk7XHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1iZWRkZWREb2N1bWVudDtcclxuXHJcbi8qKlxyXG4gKiBNYXJrcyB0aGUgZW1iZWRkZWQgZG9jIG1vZGlmaWVkLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBkb2MgPSBibG9ncG9zdC5jb21tZW50cy5pZChoZXhzdHJpbmcpO1xyXG4gKiAgICAgZG9jLm1peGVkLnR5cGUgPSAnY2hhbmdlZCc7XHJcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIHdoaWNoIGNoYW5nZWRcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLm1hcmtNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XHJcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybjtcclxuXHJcbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMubW9kaWZ5KHBhdGgpO1xyXG5cclxuICBpZiAodGhpcy5pc05ldykge1xyXG4gICAgLy8gTWFyayB0aGUgV0hPTEUgcGFyZW50IGFycmF5IGFzIG1vZGlmaWVkXHJcbiAgICAvLyBpZiB0aGlzIGlzIGEgbmV3IGRvY3VtZW50IChpLmUuLCB3ZSBhcmUgaW5pdGlhbGl6aW5nXHJcbiAgICAvLyBhIGRvY3VtZW50KSxcclxuICAgIHRoaXMuX19wYXJlbnRBcnJheS5fbWFya01vZGlmaWVkKCk7XHJcbiAgfSBlbHNlXHJcbiAgICB0aGlzLl9fcGFyZW50QXJyYXkuX21hcmtNb2RpZmllZCh0aGlzLCBwYXRoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVc2VkIGFzIGEgc3R1YiBmb3IgW2hvb2tzLmpzXShodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzKVxyXG4gKlxyXG4gKiAjIyMjTk9URTpcclxuICpcclxuICogX1RoaXMgaXMgYSBuby1vcC4gRG9lcyBub3QgYWN0dWFsbHkgc2F2ZSB0aGUgZG9jIHRvIHRoZSBkYi5fXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cclxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZWQgUHJvbWlzZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgdmFyIHByb21pc2UgPSAkLkRlZmVycmVkKCkuZG9uZShmbik7XHJcbiAgcHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgcmV0dXJuIHByb21pc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIHRoZSBzdWJkb2N1bWVudCBmcm9tIGl0cyBwYXJlbnQgYXJyYXkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChmbikge1xyXG4gIGlmICghdGhpcy5fX3BhcmVudEFycmF5KSByZXR1cm4gdGhpcztcclxuXHJcbiAgdmFyIF9pZDtcclxuICBpZiAoIXRoaXMud2lsbFJlbW92ZSkge1xyXG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcclxuICAgIGlmICghX2lkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRm9yIHlvdXIgb3duIGdvb2QsIE1vbmdvb3NlIGRvZXMgbm90IGtub3cgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAnaG93IHRvIHJlbW92ZSBhbiBFbWJlZGRlZERvY3VtZW50IHRoYXQgaGFzIG5vIF9pZCcpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fX3BhcmVudEFycmF5LnB1bGwoeyBfaWQ6IF9pZCB9KTtcclxuICAgIHRoaXMud2lsbFJlbW92ZSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAoZm4pXHJcbiAgICBmbihudWxsKTtcclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogT3ZlcnJpZGUgI3VwZGF0ZSBtZXRob2Qgb2YgcGFyZW50IGRvY3VtZW50cy5cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhyb3cgbmV3IEVycm9yKCdUaGUgI3VwZGF0ZSBtZXRob2QgaXMgbm90IGF2YWlsYWJsZSBvbiBFbWJlZGRlZERvY3VtZW50cycpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcclxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVyciBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyLCB2YWwsIGZpcnN0KSB7XHJcbiAgaWYgKCF0aGlzLl9fcGFyZW50KSB7XHJcbiAgICB2YXIgbXNnID0gJ1VuYWJsZSB0byBpbnZhbGlkYXRlIGEgc3ViZG9jdW1lbnQgdGhhdCBoYXMgbm90IGJlZW4gYWRkZWQgdG8gYW4gYXJyYXkuJ1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcbiAgfVxyXG5cclxuICB2YXIgaW5kZXggPSB0aGlzLl9fcGFyZW50QXJyYXkuaW5kZXhPZih0aGlzKTtcclxuICB2YXIgcGFyZW50UGF0aCA9IHRoaXMuX19wYXJlbnRBcnJheS5fcGF0aDtcclxuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcclxuXHJcbiAgLy8gc25pZmZpbmcgYXJndW1lbnRzOlxyXG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXHJcbiAgLy8gb3VyIGVycm9yIG1lc3NhZ2UgY2xlYW4uXHJcbiAgaWYgKDIgPCBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5fX3BhcmVudC5pbnZhbGlkYXRlKGZ1bGxQYXRoLCBlcnIpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGZpcnN0KVxyXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSB0b3AgbGV2ZWwgZG9jdW1lbnQgb2YgdGhpcyBzdWItZG9jdW1lbnQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge0RvY3VtZW50fVxyXG4gKi9cclxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy4kX18ub3duZXJEb2N1bWVudCkge1xyXG4gICAgcmV0dXJuIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQ7XHJcbiAgfVxyXG5cclxuICB2YXIgcGFyZW50ID0gdGhpcy5fX3BhcmVudDtcclxuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XHJcblxyXG4gIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcclxuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LiBJZiBvcHRpb25hbCBgcGF0aGAgaXMgcGFzc2VkLCBpdCBpcyBhcHBlbmRlZCB0byB0aGUgZnVsbCBwYXRoLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcclxuICogQG1lbWJlck9mIEVtYmVkZGVkRG9jdW1lbnRcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICBpZiAoIXRoaXMuJF9fLmZ1bGxQYXRoKSB7XHJcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcclxuICAgIGlmICghcGFyZW50Ll9fcGFyZW50KSByZXR1cm4gcGF0aDtcclxuXHJcbiAgICB2YXIgcGF0aHMgPSBbXTtcclxuICAgIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcclxuICAgICAgcGF0aHMudW5zaGlmdChwYXJlbnQuX19wYXJlbnRBcnJheS5fcGF0aCk7XHJcbiAgICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLiRfXy5mdWxsUGF0aCA9IHBhdGhzLmpvaW4oJy4nKTtcclxuXHJcbiAgICBpZiAoIXRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcclxuICAgICAgLy8gb3B0aW1pemF0aW9uXHJcbiAgICAgIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcGF0aFxyXG4gICAgPyB0aGlzLiRfXy5mdWxsUGF0aCArICcuJyArIHBhdGhcclxuICAgIDogdGhpcy4kX18uZnVsbFBhdGg7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0aGlzIHN1Yi1kb2N1bWVudHMgcGFyZW50IGRvY3VtZW50LlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLl9fcGFyZW50O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBhcnJheS5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLnBhcmVudEFycmF5ID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLl9fcGFyZW50QXJyYXk7XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFbWJlZGRlZERvY3VtZW50O1xyXG4iLCJcclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbmV4cG9ydHMuQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XHJcblxyXG5leHBvcnRzLkVtYmVkZGVkID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xyXG5cclxuZXhwb3J0cy5Eb2N1bWVudEFycmF5ID0gcmVxdWlyZSgnLi9kb2N1bWVudGFycmF5Jyk7XHJcbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XHJcbiIsIi8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IGNoZWNrcyBmb3IgaGV4IHZhbHVlXHJcbnZhciByY2hlY2tGb3JIZXggPSBuZXcgUmVnRXhwKFwiXlswLTlhLWZBLUZdezI0fSRcIik7XHJcblxyXG4vKipcclxuKiBDcmVhdGUgYSBuZXcgT2JqZWN0SWQgaW5zdGFuY2VcclxuKlxyXG4qIEBwYXJhbSB7U3RyaW5nfSBbaWRdIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZy5cclxuKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElkLlxyXG4qL1xyXG5mdW5jdGlvbiBPYmplY3RJZCggaWQgKSB7XHJcbiAgLy8g0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQvNC+0LbQvdC+INC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDQsdC10LcgbmV3XHJcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZCggaWQgKTtcclxuICAvL2lmICggaWQgaW5zdGFuY2VvZiBPYmplY3RJZCApIHJldHVybiBpZDtcclxuXHJcbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxyXG4gIGlmICggaWQgIT0gbnVsbCAmJiB0eXBlb2YgaWQgIT0gJ3N0cmluZycgJiYgaWQubGVuZ3RoICE9IDI0IClcclxuICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzdHJpbmcgb2YgMjQgaGV4IGNoYXJhY3RlcnMnKTtcclxuXHJcbiAgLy8gR2VuZXJhdGUgaWRcclxuICBpZiAoIGlkID09IG51bGwgKSB7XHJcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZSgpO1xyXG5cclxuICB9IGVsc2UgaWYoIHJjaGVja0ZvckhleC50ZXN0KCBpZCApICkge1xyXG4gICAgdGhpcy5pZCA9IGlkO1xyXG5cclxuICB9IGVsc2Uge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmcnKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFByaXZhdGUgYXJyYXkgb2YgY2hhcnMgdG8gdXNlXHJcbk9iamVjdElkLnByb3RvdHlwZS5DSEFSUyA9ICcwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3BsaXQoJycpO1xyXG5cclxuLy9UT0RPOiDQvNC+0LbQvdC+INC70Lgg0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINCx0L7Qu9GM0YjQuNC1INGB0LjQvNCy0L7Qu9GLIEEtWj9cclxuLy8gR2VuZXJhdGUgYSByYW5kb20gT2JqZWN0SWQuXHJcbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIGNoYXJzID0gdGhpcy5DSEFSUywgX2lkID0gbmV3IEFycmF5KCAzNiApLCBybmQgPSAwLCByO1xyXG4gIGZvciAoIHZhciBpID0gMDsgaSA8IDI0OyBpKysgKSB7XHJcbiAgICBpZiAoIHJuZCA8PSAweDAyIClcclxuICAgICAgcm5kID0gMHgyMDAwMDAwICsgKE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDApIHwgMDtcclxuXHJcbiAgICByID0gcm5kICYgMHhmO1xyXG4gICAgcm5kID0gcm5kID4+IDQ7XHJcbiAgICBfaWRbIGkgXSA9IGNoYXJzWyhpID09IDE5KSA/IChyICYgMHgzKSB8IDB4OCA6IHJdO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIF9pZC5qb2luKCcnKS50b0xvd2VyQ2FzZSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiogUmV0dXJuIHRoZSBPYmplY3RJZCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxyXG4qXHJcbiogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuKiBAYXBpIHB1YmxpY1xyXG4qL1xyXG5PYmplY3RJZC5wcm90b3R5cGUudG9IZXhTdHJpbmcgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gdGhpcy5pZDtcclxufTtcclxuXHJcbi8qKlxyXG4qIENvbnZlcnRzIHRoZSBpZCBpbnRvIGEgMjQgYnl0ZSBoZXggc3RyaW5nIGZvciBwcmludGluZ1xyXG4qXHJcbiogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuKiBAYXBpIHByaXZhdGVcclxuKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcclxufTtcclxuXHJcbi8qKlxyXG4qIENvbnZlcnRzIHRvIGl0cyBKU09OIHJlcHJlc2VudGF0aW9uLlxyXG4qXHJcbiogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cclxuKiBAYXBpIHByaXZhdGVcclxuKi9cclxuT2JqZWN0SWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XHJcbn07XHJcblxyXG4vKipcclxuKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cclxuKlxyXG4qIEBwYXJhbSB7T2JqZWN0fSBvdGhlcklEIE9iamVjdElkIGluc3RhbmNlIHRvIGNvbXBhcmUgYWdhaW5zdC5cclxuKiBAcmV0dXJuIHtCb29sfSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xyXG4qIEBhcGkgcHVibGljXHJcbiovXHJcbk9iamVjdElkLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMoIG90aGVySUQgKXtcclxuICB2YXIgaWQgPSAoIG90aGVySUQgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCBvdGhlcklELnRvSGV4U3RyaW5nIClcclxuICAgID8gb3RoZXJJRC5pZFxyXG4gICAgOiBuZXcgT2JqZWN0SWQoIG90aGVySUQgKS5pZDtcclxuXHJcbiAgcmV0dXJuIHRoaXMuaWQgPT09IGlkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcclxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL3R5cGVzL29iamVjdGlkJylcclxuICAsIG1wYXRoID0gcmVxdWlyZSgnLi9tcGF0aCcpXHJcbiAgLCBTdG9yYWdlQXJyYXlcclxuICAsIERvY3VtZW50O1xyXG5cclxuLyoqXHJcbiAqIFBsdXJhbGl6YXRpb24gcnVsZXMuXHJcbiAqXHJcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xyXG4gIFsvKG0pYW4kL2dpLCAnJDFlbiddLFxyXG4gIFsvKHBlKXJzb24kL2dpLCAnJDFvcGxlJ10sXHJcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXHJcbiAgWy9eKG94KSQvZ2ksICckMWVuJ10sXHJcbiAgWy8oYXh8dGVzdClpcyQvZ2ksICckMWVzJ10sXHJcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxyXG4gIFsvKGFsaWFzfHN0YXR1cykkL2dpLCAnJDFlcyddLFxyXG4gIFsvKGJ1KXMkL2dpLCAnJDFzZXMnXSxcclxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxyXG4gIFsvKFt0aV0pdW0kL2dpLCAnJDFhJ10sXHJcbiAgWy9zaXMkL2dpLCAnc2VzJ10sXHJcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXHJcbiAgWy8oaGl2ZSkkL2dpLCAnJDFzJ10sXHJcbiAgWy8oW15hZWlvdXldfHF1KXkkL2dpLCAnJDFpZXMnXSxcclxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXHJcbiAgWy8obWF0cnx2ZXJ0fGluZClpeHxleCQvZ2ksICckMWljZXMnXSxcclxuICBbLyhbbXxsXSlvdXNlJC9naSwgJyQxaWNlJ10sXHJcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcclxuICBbLyhxdWl6KSQvZ2ksICckMXplcyddLFxyXG4gIFsvcyQvZ2ksICdzJ10sXHJcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcclxuICBbLyQvZ2ksICdzJ11cclxuXTtcclxudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xyXG5cclxuLyoqXHJcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxyXG4gKlxyXG4gKiBUaGVzZSB3b3JkcyBhcmUgYXBwbGllZCB3aGlsZSBwcm9jZXNzaW5nIHRoZSBhcmd1bWVudCB0byBgcGx1cmFsaXplYC5cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcbmV4cG9ydHMudW5jb3VudGFibGVzID0gW1xyXG4gICdhZHZpY2UnLFxyXG4gICdlbmVyZ3knLFxyXG4gICdleGNyZXRpb24nLFxyXG4gICdkaWdlc3Rpb24nLFxyXG4gICdjb29wZXJhdGlvbicsXHJcbiAgJ2hlYWx0aCcsXHJcbiAgJ2p1c3RpY2UnLFxyXG4gICdsYWJvdXInLFxyXG4gICdtYWNoaW5lcnknLFxyXG4gICdlcXVpcG1lbnQnLFxyXG4gICdpbmZvcm1hdGlvbicsXHJcbiAgJ3BvbGx1dGlvbicsXHJcbiAgJ3Nld2FnZScsXHJcbiAgJ3BhcGVyJyxcclxuICAnbW9uZXknLFxyXG4gICdzcGVjaWVzJyxcclxuICAnc2VyaWVzJyxcclxuICAncmFpbicsXHJcbiAgJ3JpY2UnLFxyXG4gICdmaXNoJyxcclxuICAnc2hlZXAnLFxyXG4gICdtb29zZScsXHJcbiAgJ2RlZXInLFxyXG4gICduZXdzJyxcclxuICAnZXhwZXJ0aXNlJyxcclxuICAnc3RhdHVzJyxcclxuICAnbWVkaWEnXHJcbl07XHJcbnZhciB1bmNvdW50YWJsZXMgPSBleHBvcnRzLnVuY291bnRhYmxlcztcclxuXHJcbi8qIVxyXG4gKiBQbHVyYWxpemUgZnVuY3Rpb24uXHJcbiAqXHJcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxyXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIHRvIHBsdXJhbGl6ZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5leHBvcnRzLnBsdXJhbGl6ZSA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICB2YXIgZm91bmQ7XHJcbiAgaWYgKCF+dW5jb3VudGFibGVzLmluZGV4T2Yoc3RyLnRvTG93ZXJDYXNlKCkpKXtcclxuICAgIGZvdW5kID0gcnVsZXMuZmlsdGVyKGZ1bmN0aW9uKHJ1bGUpe1xyXG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xyXG4gICAgfSk7XHJcbiAgICBpZiAoZm91bmRbMF0pIHJldHVybiBzdHIucmVwbGFjZShmb3VuZFswXVswXSwgZm91bmRbMF1bMV0pO1xyXG4gIH1cclxuICByZXR1cm4gc3RyO1xyXG59XHJcblxyXG4vKiFcclxuICogRGV0ZXJtaW5lcyBpZiBgYWAgYW5kIGBiYCBhcmUgZGVlcCBlcXVhbC5cclxuICpcclxuICogTW9kaWZpZWQgZnJvbSBub2RlL2xpYi9hc3NlcnQuanNcclxuICogTW9kaWZpZWQgZnJvbSBtb25nb29zZS91dGlscy5qc1xyXG4gKlxyXG4gKiBAcGFyYW0ge2FueX0gYSBhIHZhbHVlIHRvIGNvbXBhcmUgdG8gYGJgXHJcbiAqIEBwYXJhbSB7YW55fSBiIGEgdmFsdWUgdG8gY29tcGFyZSB0byBgYWBcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xyXG4gIGlmIChpc1N0b3JhZ2VPYmplY3QoYSkpIGEgPSBhLnRvT2JqZWN0KCk7XHJcbiAgaWYgKGlzU3RvcmFnZU9iamVjdChiKSkgYiA9IGIudG9PYmplY3QoKTtcclxuXHJcbiAgcmV0dXJuIF8uaXNFcXVhbChhLCBiKTtcclxufTtcclxuXHJcblxyXG5cclxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcclxuXHJcbmZ1bmN0aW9uIGlzUmVnRXhwIChvKSB7XHJcbiAgcmV0dXJuICdvYmplY3QnID09IHR5cGVvZiBvXHJcbiAgICAgICYmICdbb2JqZWN0IFJlZ0V4cF0nID09IHRvU3RyaW5nLmNhbGwobyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsb25lUmVnRXhwIChyZWdleHApIHtcclxuICBpZiAoIWlzUmVnRXhwKHJlZ2V4cCkpIHtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhIFJlZ0V4cCcpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGZsYWdzID0gW107XHJcbiAgaWYgKHJlZ2V4cC5nbG9iYWwpIGZsYWdzLnB1c2goJ2cnKTtcclxuICBpZiAocmVnZXhwLm11bHRpbGluZSkgZmxhZ3MucHVzaCgnbScpO1xyXG4gIGlmIChyZWdleHAuaWdub3JlQ2FzZSkgZmxhZ3MucHVzaCgnaScpO1xyXG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIGZsYWdzLmpvaW4oJycpKTtcclxufVxyXG5cclxuLyohXHJcbiAqIE9iamVjdCBjbG9uZSB3aXRoIFN0b3JhZ2UgbmF0aXZlcyBzdXBwb3J0LlxyXG4gKlxyXG4gKiBJZiBvcHRpb25zLm1pbmltaXplIGlzIHRydWUsIGNyZWF0ZXMgYSBtaW5pbWFsIGRhdGEgb2JqZWN0LiBFbXB0eSBvYmplY3RzIGFuZCB1bmRlZmluZWQgdmFsdWVzIHdpbGwgbm90IGJlIGNsb25lZC4gVGhpcyBtYWtlcyB0aGUgZGF0YSBwYXlsb2FkIHNlbnQgdG8gTW9uZ29EQiBhcyBzbWFsbCBhcyBwb3NzaWJsZS5cclxuICpcclxuICogRnVuY3Rpb25zIGFyZSBuZXZlciBjbG9uZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBjbG9uZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xyXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBjbG9uZWQgb2JqZWN0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuZXhwb3J0cy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lIChvYmosIG9wdGlvbnMpIHtcclxuICBpZiAob2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsKVxyXG4gICAgcmV0dXJuIG9iajtcclxuXHJcbiAgaWYgKCBfLmlzQXJyYXkoIG9iaiApICkge1xyXG4gICAgcmV0dXJuIGNsb25lQXJyYXkoIG9iaiwgb3B0aW9ucyApO1xyXG4gIH1cclxuXHJcbiAgaWYgKCBpc1N0b3JhZ2VPYmplY3QoIG9iaiApICkge1xyXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5qc29uICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiBvYmoudG9KU09OKSB7XHJcbiAgICAgIHJldHVybiBvYmoudG9KU09OKCBvcHRpb25zICk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gb2JqLnRvT2JqZWN0KCBvcHRpb25zICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoIG9iai5jb25zdHJ1Y3RvciApIHtcclxuICAgIHN3aXRjaCAob2JqLmNvbnN0cnVjdG9yLm5hbWUpIHtcclxuICAgICAgY2FzZSAnT2JqZWN0JzpcclxuICAgICAgICByZXR1cm4gY2xvbmVPYmplY3Qob2JqLCBvcHRpb25zKTtcclxuICAgICAgY2FzZSAnRGF0ZSc6XHJcbiAgICAgICAgcmV0dXJuIG5ldyBvYmouY29uc3RydWN0b3IoICtvYmogKTtcclxuICAgICAgY2FzZSAnUmVnRXhwJzpcclxuICAgICAgICByZXR1cm4gY2xvbmVSZWdFeHAoIG9iaiApO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIC8vIGlnbm9yZVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCBvYmogaW5zdGFuY2VvZiBPYmplY3RJZCApIHtcclxuICAgIHJldHVybiBuZXcgT2JqZWN0SWQoIG9iai5pZCApO1xyXG4gIH1cclxuXHJcbiAgaWYgKCAhb2JqLmNvbnN0cnVjdG9yICYmIF8uaXNPYmplY3QoIG9iaiApICkge1xyXG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXHJcbiAgICByZXR1cm4gY2xvbmVPYmplY3QoIG9iaiwgb3B0aW9ucyApO1xyXG4gIH1cclxuXHJcbiAgaWYgKCBvYmoudmFsdWVPZiApe1xyXG4gICAgcmV0dXJuIG9iai52YWx1ZU9mKCk7XHJcbiAgfVxyXG59O1xyXG52YXIgY2xvbmUgPSBleHBvcnRzLmNsb25lO1xyXG5cclxuLyohXHJcbiAqIGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gY2xvbmVPYmplY3QgKG9iaiwgb3B0aW9ucykge1xyXG4gIHZhciByZXRhaW5LZXlPcmRlciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5yZXRhaW5LZXlPcmRlclxyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxyXG4gICAgLCByZXQgPSB7fVxyXG4gICAgLCBoYXNLZXlzXHJcbiAgICAsIGtleXNcclxuICAgICwgdmFsXHJcbiAgICAsIGtcclxuICAgICwgaTtcclxuXHJcbiAgaWYgKCByZXRhaW5LZXlPcmRlciApIHtcclxuICAgIGZvciAoayBpbiBvYmopIHtcclxuICAgICAgdmFsID0gY2xvbmUoIG9ialtrXSwgb3B0aW9ucyApO1xyXG5cclxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcclxuICAgICAgICBoYXNLZXlzIHx8IChoYXNLZXlzID0gdHJ1ZSk7XHJcbiAgICAgICAgcmV0W2tdID0gdmFsO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGZhc3RlclxyXG5cclxuICAgIGtleXMgPSBPYmplY3Qua2V5cyggb2JqICk7XHJcbiAgICBpID0ga2V5cy5sZW5ndGg7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICBrID0ga2V5c1tpXTtcclxuICAgICAgdmFsID0gY2xvbmUob2JqW2tdLCBvcHRpb25zKTtcclxuXHJcbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xyXG4gICAgICAgIGlmICghaGFzS2V5cykgaGFzS2V5cyA9IHRydWU7XHJcbiAgICAgICAgcmV0W2tdID0gdmFsO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWluaW1pemVcclxuICAgID8gaGFzS2V5cyAmJiByZXRcclxuICAgIDogcmV0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcclxuICB2YXIgcmV0ID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XHJcbiAgfVxyXG4gIHJldHVybiByZXQ7XHJcbn1cclxuXHJcbi8qIVxyXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xyXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZyb20pXHJcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxyXG4gICAgLCBrZXk7XHJcblxyXG4gIHdoaWxlIChpLS0pIHtcclxuICAgIGtleSA9IGtleXNbaV07XHJcbiAgICBpZiAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB0b1trZXldKSB7XHJcbiAgICAgIHRvW2tleV0gPSBmcm9tW2tleV07XHJcbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KGZyb21ba2V5XSkgKSB7XHJcbiAgICAgIG1lcmdlKHRvW2tleV0sIGZyb21ba2V5XSk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyohXHJcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBzdHJpbmdcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoKS5zdWJzdHIoMyk7XHJcbn07XHJcblxyXG5cclxuLyohXHJcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXHJcbiAqXHJcbiAqIFRoaXMgaXMgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBsaWJzIGxpa2UgRGF0ZS5qcyB3aGljaCBkbyBmb29saXNoIHRoaW5ncyB0byBOYXRpdmVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge2FueX0gdlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbmV4cG9ydHMuaXNTdG9yYWdlT2JqZWN0ID0gZnVuY3Rpb24gKCB2ICkge1xyXG4gIERvY3VtZW50IHx8IChEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKSk7XHJcbiAgLy9TdG9yYWdlQXJyYXkgfHwgKFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvYXJyYXknKSk7XHJcblxyXG4gIHJldHVybiB2IGluc3RhbmNlb2YgRG9jdW1lbnQgfHxcclxuICAgICAgICggdiAmJiB2LmlzU3RvcmFnZUFycmF5ICk7XHJcbn07XHJcbnZhciBpc1N0b3JhZ2VPYmplY3QgPSBleHBvcnRzLmlzU3RvcmFnZU9iamVjdDtcclxuXHJcbi8qIVxyXG4gKiBSZXR1cm4gdGhlIHZhbHVlIG9mIGBvYmpgIGF0IHRoZSBnaXZlbiBgcGF0aGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICovXHJcblxyXG5leHBvcnRzLmdldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIG9iaiwgbWFwKSB7XHJcbiAgcmV0dXJuIG1wYXRoLmdldChwYXRoLCBvYmosICdfZG9jJywgbWFwKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKi9cclxuXHJcbmV4cG9ydHMuc2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCBvYmosIG1hcCkge1xyXG4gIG1wYXRoLnNldChwYXRoLCB2YWwsIG9iaiwgJ19kb2MnLCBtYXApO1xyXG59O1xyXG5cclxuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSAoZnVuY3Rpb24oKSB7XHJcbiAgLy8g0JTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDRgtC10YHRgtC+0LIgKNC+0LrRgNGD0LbQtdC90LjQtSBub2RlLmpzKVxyXG4gIGlmICggdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgcHJvY2Vzcy5uZXh0VGljayApIHJldHVybiBwcm9jZXNzLm5leHRUaWNrO1xyXG4gIC8vINCV0YHQu9C4INCyINCx0YDQsNGD0LfQtdGA0LUg0YPQttC1INGA0LXQsNC70LjQt9C+0LLQsNC9INGN0YLQvtGCINC80LXRgtC+0LRcclxuICBpZiAoIHdpbmRvdy5zZXRJbW1lZGlhdGUgKSByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZTtcclxuXHJcbiAgdmFyIGhlYWQgPSB7IH0sIHRhaWwgPSBoZWFkOyAvLyDQvtGH0LXRgNC10LTRjCDQstGL0LfQvtCy0L7QsiwgMS3RgdCy0Y/Qt9C90YvQuSDRgdC/0LjRgdC+0LpcclxuXHJcbiAgdmFyIElEID0gTWF0aC5yYW5kb20oKTsgLy8g0YPQvdC40LrQsNC70YzQvdGL0Lkg0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YBcclxuXHJcbiAgZnVuY3Rpb24gb25tZXNzYWdlKGUpIHtcclxuICAgIGlmKGUuZGF0YSAhPSBJRCkgcmV0dXJuOyAvLyDQvdC1INC90LDRiNC1INGB0L7QvtCx0YnQtdC90LjQtVxyXG4gICAgaGVhZCA9IGhlYWQubmV4dDtcclxuICAgIHZhciBmdW5jID0gaGVhZC5mdW5jO1xyXG4gICAgZGVsZXRlIGhlYWQuZnVuYztcclxuICAgIGZ1bmMoKTtcclxuICB9XHJcblxyXG4gIGlmKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7IC8vIElFOSssINC00YDRg9Cz0LjQtSDQsdGA0LDRg9C30LXRgNGLXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9ubWVzc2FnZSwgZmFsc2UpO1xyXG4gIH0gZWxzZSB7IC8vIElFOFxyXG4gICAgd2luZG93LmF0dGFjaEV2ZW50KCAnb25tZXNzYWdlJywgb25tZXNzYWdlICk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gd2luZG93LnBvc3RNZXNzYWdlID8gZnVuY3Rpb24oZnVuYykge1xyXG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHsgZnVuYzogZnVuYyB9O1xyXG4gICAgd2luZG93LnBvc3RNZXNzYWdlKElELCBcIipcIik7XHJcbiAgfSA6XHJcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XHJcbiAgICBzZXRUaW1lb3V0KGZ1bmMsIDApO1xyXG4gIH07XHJcbn0oKSk7XHJcblxyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiK05zY05tXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcclxuLyoqXHJcbiAqIFZpcnR1YWxUeXBlIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIFRoaXMgaXMgd2hhdCBtb25nb29zZSB1c2VzIHRvIGRlZmluZSB2aXJ0dWFsIGF0dHJpYnV0ZXMgdmlhIGBTY2hlbWEucHJvdG90eXBlLnZpcnR1YWxgLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBmdWxsbmFtZSA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xyXG4gKiAgICAgZnVsbG5hbWUgaW5zdGFuY2VvZiBtb25nb29zZS5WaXJ0dWFsVHlwZSAvLyB0cnVlXHJcbiAqXHJcbiAqIEBwYXJtYSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gVmlydHVhbFR5cGUgKG9wdGlvbnMsIG5hbWUpIHtcclxuICB0aGlzLnBhdGggPSBuYW1lO1xyXG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xyXG4gIHRoaXMuc2V0dGVycyA9IFtdO1xyXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgZ2V0dGVyLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XHJcbiAqICAgICB2aXJ0dWFsLmdldChmdW5jdGlvbiAoKSB7XHJcbiAqICAgICAgIHJldHVybiB0aGlzLm5hbWUuZmlyc3QgKyAnICcgKyB0aGlzLm5hbWUubGFzdDtcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblZpcnR1YWxUeXBlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZm4pIHtcclxuICB0aGlzLmdldHRlcnMucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVmaW5lcyBhIHNldHRlci5cclxuICpcclxuICogIyMjI0V4YW1wbGU6XHJcbiAqXHJcbiAqICAgICB2YXIgdmlydHVhbCA9IHNjaGVtYS52aXJ0dWFsKCdmdWxsbmFtZScpO1xyXG4gKiAgICAgdmlydHVhbC5zZXQoZnVuY3Rpb24gKHYpIHtcclxuICogICAgICAgdmFyIHBhcnRzID0gdi5zcGxpdCgnICcpO1xyXG4gKiAgICAgICB0aGlzLm5hbWUuZmlyc3QgPSBwYXJ0c1swXTtcclxuICogICAgICAgdGhpcy5uYW1lLmxhc3QgPSBwYXJ0c1sxXTtcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblZpcnR1YWxUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcclxuICB0aGlzLnNldHRlcnMucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQXBwbGllcyBnZXR0ZXJzIHRvIGB2YWx1ZWAgdXNpbmcgb3B0aW9uYWwgYHNjb3BlYC5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxyXG4gKiBAcmV0dXJuIHthbnl9IHRoZSB2YWx1ZSBhZnRlciBhcHBseWluZyBhbGwgZ2V0dGVyc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblZpcnR1YWxUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMgPSBmdW5jdGlvbiAodmFsdWUsIHNjb3BlKSB7XHJcbiAgdmFyIHYgPSB2YWx1ZTtcclxuICBmb3IgKHZhciBsID0gdGhpcy5nZXR0ZXJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tKSB7XHJcbiAgICB2ID0gdGhpcy5nZXR0ZXJzW2xdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xyXG4gIH1cclxuICByZXR1cm4gdjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIHNldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEByZXR1cm4ge2FueX0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBzZXR0ZXJzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5U2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcclxuICB2YXIgdiA9IHZhbHVlO1xyXG4gIGZvciAodmFyIGwgPSB0aGlzLnNldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcclxuICAgIHYgPSB0aGlzLnNldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XHJcbiAgfVxyXG4gIHJldHVybiB2O1xyXG59O1xyXG5cclxuLyohXHJcbiAqIGV4cG9ydHNcclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxUeXBlO1xyXG4iXX0=
(10)
});
