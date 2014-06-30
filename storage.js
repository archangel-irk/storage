! function (e) {
    if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();
    else if ("function" == typeof define && define.amd) define([], e);
    else {
        var f;
        "undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.storage = e()
    }
}(function () {
    var define, module, exports;
    return (function e(t, n, r) {
            function s(o, u) {
                if (!n[o]) {
                    if (!t[o]) {
                        var a = typeof require == "function" && require;
                        if (!u && a) return a(o, !0);
                        if (i) return i(o, !0);
                        throw new Error("Cannot find module '" + o + "'")
                    }
                    var f = n[o] = {
                        exports: {}
                    };
                    t[o][0].call(f.exports, function (e) {
                        var n = t[o][1][e];
                        return s(n ? n : e)
                    }, f, f.exports, e, t, n, r)
                }
              //todo проверить готовность модулей
              console.log( n );
                return n[o].exports
            }
            var i = typeof require == "function" && require;
            for (var o = 0; o < r.length; o++) s(r[o]);
            return s
        })({
            1: [
                function (_dereq_, module, exports) {
                    // shim for using process in browser

                    var process = module.exports = {};

                    process.nextTick = (function () {
                        var canSetImmediate = typeof window !== 'undefined' && window.setImmediate;
                        var canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener;

                        if (canSetImmediate) {
                            return function (f) {
                                return window.setImmediate(f)
                            };
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
                    process.cwd = function () {
                        return '/'
                    };
                    process.chdir = function (dir) {
                        throw new Error('process.chdir is not supported');
                    };

                }, {}
            ],
            2: [
                function (_dereq_, module, exports) {
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
                    function Collection(name, schema, api) {
                        // Сохраним название пространства имён
                        this.name = name;
                        // Хранилище для документов
                        this.documents = {};

                        if (_.isObject(schema) && !(schema instanceof Schema)) {
                            schema = new Schema(schema);
                        }

                        // Сохраним ссылку на api для метода .save()
                        this.api = api;

                        // Используемая схема для коллекции
                        this.schema = schema;

                        // Отображение объекта documents в виде массива (для нокаута)
                        this.array = [];
                        ko.track(this, ['array']);
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
                        add: function (doc, fields, init, _storageWillMutate) {
                            var self = this;

                            // Если документа нет, значит будет пустой
                            if (doc == null) doc = null;

                            // Массив документов
                            if (_.isArray(doc)) {
                                var savedDocs = [];

                                _.each(doc, function (doc) {
                                    savedDocs.push(self.add(doc, fields, init, true));
                                });

                                this.storageHasMutated();

                                return savedDocs;
                            }

                            var id = doc && doc._id;

                            // Если документ уже есть, то просто установить значения
                            if (id && this.documents[id]) {
                                this.documents[id].set(doc);

                            } else {
                                var discriminatorMapping = this.schema ? this.schema.discriminatorMapping : null;

                                var key = discriminatorMapping && discriminatorMapping.isRoot ? discriminatorMapping.key : null;

                                // Выбираем схему, если есть дискриминатор
                                var schema;
                                if (key && doc && doc[key] && this.schema.discriminators && this.schema.discriminators[doc[key]]) {
                                    schema = this.schema.discriminators[doc[key]];

                                } else {
                                    schema = this.schema;
                                }

                                var newDoc = new Document(doc, this.name, schema, fields, init);
                                id = newDoc._id.toString();
                            }

                            // Для одиночных документов тоже нужно  вызвать storageHasMutated
                            if (!_storageWillMutate) {
                                this.storageHasMutated();
                            }

                            return this.documents[id];
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
                        remove: function (document) {
                            return delete this.documents[document._id || document];
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
                        find: function (conditions) {
                            return _.where(this.documents, conditions);
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
                        findById: function (_id) {
                            return this.documents[_id];
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
                        findByIdAndRemove: function (_id) {
                            this.remove(this.findById(_id));
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
                        findByIdAndUpdate: function (_id, path, value) {
                            return this.update(this.findById(_id), path, value);
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
                        findOne: function (conditions) {
                            return _.findWhere(this.documents, conditions);
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
                        findOneAndRemove: function (conditions) {
                            this.remove(this.findOne(conditions));
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
                        findOneAndUpdate: function (conditions, path, value) {
                            return this.update(this.findOne(conditions), path, value);
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
                        update: function (document, path, value) {
                            var doc = this.documents[document._id || document];

                            if (doc == null) {
                                console.warn('storage::update: Document is not found.');
                                return false;
                            }

                            return doc.set(path, value);
                        },

                        /**
                         * Обработчик на изменения (добавление, удаление) данных в коллекции
                         */
                        storageHasMutated: function () {
                            // Обновим массив документов (специальное отображение для перебора нокаутом)
                            this.array = _.toArray(this.documents);
                        }
                    };

                    /*!
                     * Module exports.
                     */

                    module.exports = Collection;

                }, {}
            ],
            3: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var Events = _dereq_('./events'),
                        StorageError = _dereq_('./error'),
                        MixedSchema = _dereq_('./schema/mixed'),
                        SchemaArray = _dereq_('./schema/array'),
                        Schema = _dereq_('./schema'),
                        ValidatorError = _dereq_('./schematype').ValidatorError,
                        utils = _dereq_('./utils'),
                        clone = utils.clone,
                        ValidationError = StorageError.ValidationError,
                        InternalCache = _dereq_('./internal'),
                        deepEqual = utils.deepEqual,
                        DocumentArray = _dereq_('./types/documentarray'),
                        Embedded = _dereq_('./types/embedded');

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
                    function Document(data, collectionName, schema, fields, init) {
                        this.isNew = true;

                        // Создать пустой документ с флагом init
                        // new TestDocument(true);
                        if ('boolean' === typeof data) {
                            init = data;
                            data = null;
                        }

                        // Создать документ с флагом init
                        // new TestDocument({ test: 'boom' }, true);
                        if ('boolean' === typeof collectionName) {
                            init = collectionName;
                            collectionName = undefined;
                        }

                        // Создать пустой документ по схеме
                        if (data instanceof Schema) {
                            schema = data;
                            data = null;

                            if (schema.options._id) {
                                data = {
                                    _id: new ObjectId()
                                };
                            }

                        } else {
                            // При создании EmbeddedDocument, в нём уже есть схема и ему не нужен _id
                            schema = this.schema || schema;
                            // Сгенерировать ObjectId, если он отсутствует и его требует схема
                            if (!this.schema && schema.options._id) {
                                data = data || {};

                                if (!data._id) {
                                    data._id = new ObjectId();
                                }
                            }
                        }

                        if (!schema) {
                            //todo: throw new mongoose.Error.MissingSchemaError(name);
                            throw new TypeError('Нельзя создавать документ без схемы');
                        }

                        this.schema = schema;
                        this.collection = storage[collectionName];
                        this.collectionName = collectionName;

                        if (this.collection) {
                            if (data == null || !data._id) {
                                throw new TypeError('Для помещения в коллекцию необходимо, чтобы у документа был _id');
                            }
                            // Поместить документ в коллекцию
                            this.collection.documents[data._id] = this;
                        }

                        this.$__ = new InternalCache;
                        this.$__.strictMode = schema.options && schema.options.strict;
                        this.$__.selected = fields;

                        var required = schema.requiredPaths();
                        for (var i = 0; i < required.length; ++i) {
                            this.$__.activePaths.require(required[i]);
                        }

                        this.$__setSchema(schema);

                        this._doc = this.$__buildDoc(data, init);

                        if (init) {
                            this.init(data);
                        } else if (data) {
                            this.set(data, undefined, true);
                        }

                        // apply methods
                        for (var m in schema.methods) {
                            this[m] = schema.methods[m];
                        }
                        // apply statics
                        for (var s in schema.statics) {
                            this[s] = schema.statics[s];
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
                    Document.prototype.$__buildDoc = function (obj, skipId) {
                        var doc = {},
                            self = this;

                        var paths = Object.keys(this.schema.paths),
                            plen = paths.length,
                            ii = 0;

                        for (; ii < plen; ++ii) {
                            var p = paths[ii];

                            if ('_id' == p) {
                                if (skipId) continue;
                                if (obj && '_id' in obj) continue;
                            }

                            var type = this.schema.paths[p],
                                path = p.split('.'),
                                len = path.length,
                                last = len - 1,
                                doc_ = doc,
                                i = 0;

                            for (; i < len; ++i) {
                                var piece = path[i],
                                    defaultVal;

                                if (i === last) {
                                    defaultVal = type.getDefault(self, true);

                                    if ('undefined' !== typeof defaultVal) {
                                        doc_[piece] = defaultVal;
                                        self.$__.activePaths.default(p);
                                    }
                                } else {
                                    doc_ = doc_[piece] || (doc_[piece] = {});
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
                    Document.prototype.init = function (data) {
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

                        init(this, data, this._doc);

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
                    function init(self, obj, doc, prefix) {
                        prefix = prefix || '';

                        var keys = Object.keys(obj),
                            len = keys.length,
                            schema, path, i;

                        while (len--) {
                            i = keys[len];
                            path = prefix + i;
                            schema = self.schema.path(path);

                            if (!schema && _.isPlainObject(obj[i]) &&
                                (!obj[i].constructor || 'Object' == obj[i].constructor.name)) {
                                // assume nested object
                                if (!doc[i]) doc[i] = {};
                                init(self, obj[i], doc[i], path + '.');
                            } else {
                                if (obj[i] === null) {
                                    doc[i] = null;
                                } else if (obj[i] !== undefined) {
                                    var observable = ko.getObservable(self, path);

                                    if (schema) {
                                        self.$__try(function () {
                                            doc[i] = schema.cast(obj[i], self, true);
                                        });
                                    } else {
                                        doc[i] = obj[i];
                                    }

                                    // Установить начальное значение
                                    observable && observable(doc[i]);
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

                        var merge = options && options.merge,
                            adhoc = type && true !== type,
                            constructing = true === type,
                            adhocs;

                        var strict = options && 'strict' in options ? options.strict : this.$__.strictMode;

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
                                var prefix = val ? val + '.' : '';

                                if (path instanceof Document) path = path._doc;

                                var keys = Object.keys(path),
                                    i = keys.length,
                                    pathtype, key;


                                while (i--) {
                                    key = keys[i];
                                    pathtype = this.schema.pathType(prefix + key);
                                    if (null != path[key]
                                        // need to know if plain object - no Buffer, ObjectId, ref, etc
                                        && _.isPlainObject(path[key]) && (!path[key].constructor || 'Object' == path[key].constructor.name) && 'virtual' != pathtype && !(this.$__path(prefix + key) instanceof MixedSchema) && !(this.schema.paths[key] && this.schema.paths[key].options.ref)
                                    ) {

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
                                subpath = parts.slice(0, i + 1).join('.');
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
                            for (i = 0; i < parts.length; ++i) {
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
                        var priorVal = constructing ? undefined : this.getValue(path);

                        if (!schema || undefined === val) {
                            this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
                            return this;
                        }

                        var self = this;
                        var shouldSet = this.$__try(function () {
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

                        if (undefined === val && !this.isSelected(path)) {
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
                    Document.prototype.$__set = function (pathToMark, path, constructing, parts, schema, val, priorVal) {
                        var shouldModify = this.$__shouldModify.apply(this, arguments);

                        if (shouldModify) {
                            this.markModified(pathToMark, val);
                        }

                        var obj = this._doc,
                            i = 0,
                            l = parts.length;

                        for (; i < l; i++) {
                            var next = i + 1,
                                last = next === l;

                            if (last) {
                                obj[parts[i]] = val;

                                var observable = ko.getObservable(this, path);

                                //TODO: Иногда observable === null, понять почему так порисходит и исправить это
                                //console.log( path, observable );

                                // Обновим observable (чтобы работали привязки)
                                observable && observable(val);

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

                        var schema = this.$__path(path) || this.schema.virtualpath(path),
                            pieces = path.split('.'),
                            obj = this._doc;

                        for (var i = 0, l = pieces.length; i < l; i++) {
                            obj = undefined === obj || null === obj ? undefined : obj[pieces[i]];
                        }

                        if (schema) {
                            obj = schema.applyGetters(obj, this);
                        }

                        var observable = ko.getObservable(this, path);
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
                        var adhocs = this.$__.adhocPaths,
                            adhocType = adhocs && adhocs[path];

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
                        return path ? !!~this.modifiedPaths().indexOf(path) : this.$__.activePaths.some('modify');
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

                    Document.prototype.isSelected = function isSelected(path) {
                        if (this.$__.selected) {

                            if ('_id' === path) {
                                return 0 !== this.$__.selected._id;
                            }

                            var paths = Object.keys(this.$__.selected),
                                i = paths.length,
                                inclusive = false,
                                cur;

                            if (1 === i && '_id' === paths[0]) {
                                // only _id was selected.
                                return 0 === this.$__.selected._id;
                            }

                            while (i--) {
                                cur = paths[i];
                                if ('_id' == cur) continue;
                                inclusive = !!this.$__.selected[cur];
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

                            return !inclusive;
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

                        var validating = {},
                            total = 0;

                        paths.forEach(validatePath);
                        return this;

                        function validatePath(path) {
                            if (validating[path]) return;

                            validating[path] = true;
                            total++;

                            utils.setImmediate(function () {
                                var p = self.schema.path(path);
                                if (!p) return --total || complete();

                                var val = self.getValue(path);
                                p.doValidate(val, function (err) {
                                    if (err) {
                                        self.invalidate(
                                            path, err, undefined
                                            //, true // embedded docs
                                        );
                                    }
                                    --total || complete();
                                }, self);
                            });
                        }

                        function complete() {
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

                    Document.prototype.$__reset = function reset() {
                        var self = this;

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
                            return {
                                path: path,
                                value: self.getValue(path),
                                schema: self.$__path(path)
                            };
                        });

                        // Sort dirty paths in a flat hierarchy.
                        all.sort(function (a, b) {
                            return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
                        });

                        // Ignore "foo.a" if "foo" is dirty already.
                        var minimal = [],
                            lastPath, top;

                        all.forEach(function (item) {
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
                    function compile(self, tree, proto, prefix) {
                        var keys = Object.keys(tree),
                            i = keys.length,
                            limb, key;

                        while (i--) {
                            key = keys[i];
                            limb = tree[key];

                            define(self, key, (('Object' === limb.constructor.name && Object.keys(limb).length) && (!limb.type || limb.type.type) ? limb : null), proto, prefix, keys);
                        }
                    }

                    /*!
                     * Defines the accessor named prop on the incoming prototype.
                     * там же, поля документа сделаем наблюдаемыми
                     */
                    function define(self, prop, subprops, prototype, prefix, keys) {
                        prefix = prefix || '';
                        var path = (prefix ? prefix + '.' : '') + prop;

                        if (subprops) {
                            Object.defineProperty(prototype, prop, {
                                enumerable: true,
                                get: function () {
                                    if (!this.$__.getters)
                                        this.$__.getters = {};

                                    if (!this.$__.getters[path]) {
                                        var nested = Object.create(this);

                                        // save scope for nested getters/setters
                                        if (!prefix) nested.$__.scope = this;

                                        // shadow inherited getters from sub-objects so
                                        // thing.nested.nested.nested... doesn't occur (gh-366)
                                        var i = 0,
                                            len = keys.length;

                                        for (; i < len; ++i) {
                                            // over-write the parents getter without triggering it
                                            Object.defineProperty(nested, keys[i], {
                                                enumerable: false // It doesn't show up.
                                                    ,
                                                writable: true // We can set it later.
                                                    ,
                                                configurable: true // We can Object.defineProperty again.
                                                    ,
                                                value: undefined // It shadows its parent.
                                            });
                                        }

                                        nested.toObject = function () {
                                            return this.get(path);
                                        };

                                        compile(self, subprops, nested, path);
                                        this.$__.getters[path] = nested;
                                    }

                                    return this.$__.getters[path];
                                },
                                set: function (v) {
                                    if (v instanceof Document) v = v.toObject();
                                    return (this.$__.scope || this).set(path, v);
                                }
                            });

                        } else {
                            var allObservablesForObject = ko.es5.getAllObservablesForObject(self, true),
                                schema = prototype.schema || prototype.constructor.schema,
                                isArray = schema.path(path) instanceof SchemaArray,
                                observable = isArray ? ko.observableArray() : ko.observable();

                            Object.defineProperty(prototype, prop, {
                                enumerable: true,
                                get: function () {
                                    return this.get.call(this.$__.scope || this, path);
                                },
                                set: function (v) {
                                    return this.set.call(this.$__.scope || this, path, v);
                                }
                            });

                            allObservablesForObject[path] = observable;

                            if (isArray) {
                                ko.es5.notifyWhenPresentOrFutureArrayValuesMutate(ko, observable);
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
                    Document.prototype.$__setSchema = function (schema) {
                        this.schema = schema;
                        compile(this, schema.tree, this);
                    };

                    /**
                     * Get all subdocs (by bfs)
                     *
                     * @api private
                     * @method $__getAllSubdocs
                     * @memberOf Document
                     */
                    Document.prototype.$__getAllSubdocs = function () {
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
                        var err = e1.filter(function (x) {
                            return x
                        })[0];
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
                        // validate all document arrays.
                        return this.$__.activePaths
                            .map('init', 'modify', function (i) {
                                return this.getValue(i);
                            }.bind(this))
                            .filter(function (val) {
                                return val && val instanceof DocumentArray && val.length;
                            }).reduce(function (seed, array) {
                                return seed.concat(array);
                            }, [])
                            .filter(function (doc) {
                                return doc
                            });
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

                        var delta = {},
                            len = dirty.length,
                            d = 0;

                        for (; d < len; ++d) {
                            var data = dirty[d];
                            var value = data.value;

                            value = utils.clone(value, {
                                depopulate: 1
                            });
                            delta[data.path] = value;
                        }

                        return delta;
                    };

                    Document.prototype.$__handleSave = function () {
                        // Получаем ресурс коллекции, куда будем сохранять данные
                        var resource;
                        if (this.collection) {
                            resource = this.collection.api;
                        }

                        var innerPromise = new $.Deferred();

                        if (this.isNew) {
                            // send entire doc
                            var obj = this.toObject({
                                depopulate: 1
                            });

                            if ((obj || {}).hasOwnProperty('_id') === false) {
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
                            if (!resource) {
                                innerPromise.resolve(this);
                            } else {
                                resource.create(obj).always(innerPromise.resolve);
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

                            if (!_.isEmpty(delta)) {
                                this.$__reset();
                                // Проверка на окружение тестов
                                // Хотя можно таким образом просто делать валидацию, даже если нет коллекции или api
                                if (!resource) {
                                    innerPromise.resolve(this);
                                } else {
                                    resource(this.id).update(delta).always(innerPromise.resolve);
                                }
                            } else {
                                this.$__reset();
                                innerPromise.resolve(this);
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
                    Document.prototype.save = function (done) {
                        var self = this;
                        var finalPromise = new $.Deferred().done(done);

                        // Сохранять документ можно только если он находится в коллекции
                        if (!this.collection) {
                            finalPromise.reject(arguments);
                            console.error('Document.save api handle is not implemented.');
                            return finalPromise;
                        }

                        // Check for preSave errors (точо знаю, что она проверяет ошибки в массивах (CastError))
                        var preSaveErr = self.$__presaveValidate();
                        if (preSaveErr) {
                            finalPromise.reject(preSaveErr);
                            return finalPromise;
                        }

                        // Validate
                        var p0 = new $.Deferred();
                        self.validate(function (err) {
                            if (err) {
                                p0.reject(err);
                                finalPromise.reject(err);
                            } else {
                                p0.resolve();
                            }
                        });

                        // Сначала надо сохранить все поддокументы и сделать resolve!!!
                        // Call save hooks on subdocs
                        var subDocs = self.$__getAllSubdocs();
                        var whenCond = subDocs.map(function (d) {
                            return d.save();
                        });
                        whenCond.push(p0);

                        // Так мы передаём массив promise условий
                        var p1 = $.when.apply($, whenCond);

                        // Handle save and results
                        p1
                            .then(this.$__handleSave.bind(this))
                            .then(function () {
                                return finalPromise.resolve(self);
                            }, function (err) {
                                // If the initial insert fails provide a second chance.
                                // (If we did this all the time we would break updates)
                                if (self.$__.inserting) {
                                    self.isNew = true;
                                    self.emit('isNew', true);
                                }
                                finalPromise.reject(err);
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
                            options = this.schema.options.toObject ? utils.clone(this.schema.options.toObject) : {};
                        }

                        if (options.minimize === undefined) {
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
                            var opts = options.json ? this.schema.options.toJSON : this.schema.options.toObject;
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

                    function minimize(obj) {
                        var keys = Object.keys(obj),
                            i = keys.length,
                            hasKeys, key, val;

                        while (i--) {
                            key = keys[i];
                            val = obj[key];

                            if (_.isPlainObject(val)) {
                                obj[key] = minimize(val);
                            }

                            if (undefined === obj[key]) {
                                delete obj[key];
                                continue;
                            }

                            hasKeys = true;
                        }

                        return hasKeys ? obj : undefined;
                    }

                    /*!
                     * Applies virtuals properties to `json`.
                     *
                     * @param {Document} self
                     * @param {Object} json
                     * @param {String} type either `virtuals` or `paths`
                     * @return {Object} `json`
                     */

                    function applyGetters(self, json, type, options) {
                        var schema = self.schema,
                            paths = Object.keys(schema[type]),
                            i = paths.length,
                            path;

                        while (i--) {
                            path = paths[i];

                            var parts = path.split('.'),
                                plen = parts.length,
                                last = plen - 1,
                                branch = json,
                                part;

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
                        if (!(options && 'Object' == options.constructor.name) || ((!options || options.json) && this.schema.options.toJSON)) {

                            options = this.schema.options.toJSON ? utils.clone(this.schema.options.toJSON) : {};
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
                        return tid && tid.equals ? tid.equals(docid) : tid === docid;
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
                        this.$__.populated[path] = {
                            value: val,
                            options: options
                        };
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
                    Document.prototype.remove = function () {
                        if (this.collection) {
                            return this.collection.remove(this);
                        }

                        return delete this;
                    };


                    /**
                     * Очищает документ (выставляет значение по умолчанию или undefined)
                     */
                    Document.prototype.empty = function () {
                        var doc = this,
                            self = this,
                            paths = Object.keys(this.schema.paths),
                            plen = paths.length,
                            ii = 0;

                        for (; ii < plen; ++ii) {
                            var p = paths[ii];

                            if ('_id' == p) continue;

                            var type = this.schema.paths[p],
                                path = p.split('.'),
                                len = path.length,
                                last = len - 1,
                                doc_ = doc,
                                i = 0;

                            for (; i < len; ++i) {
                                var piece = path[i],
                                    defaultVal;

                                if (i === last) {
                                    defaultVal = type.getDefault(self, true);

                                    doc_[piece] = defaultVal || undefined;
                                    self.$__.activePaths.default(p);
                                } else {
                                    doc_ = doc_[piece] || (doc_[piece] = {});
                                }
                            }
                        }
                    };

                    /*!
                     * Module exports.
                     */

                    Document.ValidationError = ValidationError;
                    module.exports = Document;

                }, {
                    "./error": 4,
                    "./events": 9,
                    "./internal": 10,
                    "./schema": 12,
                    "./schema/array": 13,
                    "./schema/mixed": 18,
                    "./schematype": 22,
                    "./types/documentarray": 26,
                    "./types/embedded": 27,
                    "./utils": 30
                }
            ],
            4: [
                function (_dereq_, module, exports) {
                    //todo: портировать все ошибки!!!
                    /**
                     * StorageError constructor
                     *
                     * @param {String} msg - Error message
                     * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
                     * http://stackoverflow.com/questions/783818/how-do-i-create-a-custom-error-in-javascript
                     */
                    function StorageError(msg) {
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
                            .replace(/{VALUE}/, String(val || ''))
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

                }, {
                    "./error/cast": 5,
                    "./error/messages": 6,
                    "./error/validation": 7,
                    "./error/validator": 8
                }
            ],
            5: [
                function (_dereq_, module, exports) {
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

                    function CastError(type, value, path) {
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

                }, {
                    "../error.js": 4
                }
            ],
            6: [
                function (_dereq_, module, exports) {

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


                }, {}
            ],
            7: [
                function (_dereq_, module, exports) {

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

                    function ValidationError(instance) {
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

                }, {
                    "../error.js": 4
                }
            ],
            8: [
                function (_dereq_, module, exports) {
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

                    function ValidatorError(path, msg, type, val) {
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

                }, {
                    "../error.js": 4
                }
            ],
            9: [
                function (_dereq_, module, exports) {
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
                        on: function (name, callback, context) {
                            if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
                            this._events || (this._events = {});
                            var events = this._events[name] || (this._events[name] = []);
                            events.push({
                                callback: callback,
                                context: context,
                                ctx: context || this
                            });
                            return this;
                        },

                        // Bind an event to only be triggered a single time. After the first time
                        // the callback is invoked, it will be removed.
                        once: function (name, callback, context) {
                            if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
                            var self = this;
                            var once = _.once(function () {
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
                        off: function (name, callback, context) {
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
                        trigger: function (name) {
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
                        stopListening: function (obj, name, callback) {
                            var listeningTo = this._listeningTo;
                            if (!listeningTo) return this;
                            var remove = !name && !callback;
                            if (!callback && typeof name === 'object') callback = this;
                            if (obj)(listeningTo = {})[obj._listenId] = obj;
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
                    var eventsApi = function (obj, action, name, rest) {
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
                    var triggerEvents = function (events, args) {
                        var ev, i = -1,
                            l = events.length,
                            a1 = args[0],
                            a2 = args[1],
                            a3 = args[2];
                        switch (args.length) {
                        case 0:
                            while (++i < l)(ev = events[i]).callback.call(ev.ctx);
                            return;
                        case 1:
                            while (++i < l)(ev = events[i]).callback.call(ev.ctx, a1);
                            return;
                        case 2:
                            while (++i < l)(ev = events[i]).callback.call(ev.ctx, a1, a2);
                            return;
                        case 3:
                            while (++i < l)(ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
                            return;
                        default:
                            while (++i < l)(ev = events[i]).callback.apply(ev.ctx, args);
                        }
                    };

                    var listenMethods = {
                        listenTo: 'on',
                        listenToOnce: 'once'
                    };

                    // Inversion-of-control versions of `on` and `once`. Tell *this* object to
                    // listen to an event in another object ... keeping track of what it's
                    // listening to.
                    _.each(listenMethods, function (implementation, method) {
                        Events[method] = function (obj, name, callback) {
                            var listeningTo = this._listeningTo || (this._listeningTo = {});
                            var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
                            listeningTo[id] = obj;
                            if (!callback && typeof name === 'object') callback = this;
                            obj[implementation](name, callback, this);
                            return this;
                        };
                    });

                    module.exports = Events;

                }, {}
            ],
            10: [
                function (_dereq_, module, exports) {
                    // Машина состояний используется для пометки, в каком состоянии находятся поле
                    // Например: если поле имеет состояние default - значит его значением является значение по умолчанию
                    // Примечание: для массивов в общем случае это означает пустой массив

                    /*!
                     * Dependencies
                     */

                    var StateMachine = _dereq_('./statemachine');

                    var ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default');

                    module.exports = InternalCache;

                    function InternalCache() {
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
                        this.populated = undefined; // the _ids that have been populated
                        this.wasPopulated = false; // if this doc was the result of a population
                        this.scope = undefined;
                        this.activePaths = new ActiveRoster;

                        // embedded docs
                        this.ownerDocument = undefined;
                        this.fullPath = undefined;
                    }

                }, {
                    "./statemachine": 23
                }
            ],
            11: [
                function (_dereq_, module, exports) {
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

                        var parts = 'string' == typeof path ? path.split('.') : path;

                        if (!Array.isArray(parts)) {
                            throw new TypeError('Invalid `path`. Must be either string or array');
                        }

                        var obj = o,
                            part;

                        for (var i = 0; i < parts.length; ++i) {
                            part = parts[i];

                            if (Array.isArray(obj) && !/^\d+$/.test(part)) {
                                // reading a property from the array items
                                var paths = parts.slice(i);

                                return obj.map(function (item) {
                                    return item ? exports.get(paths, item, special || lookup, map) : map(undefined);
                                });
                            }

                            if (lookup) {
                                obj = lookup(obj, part);
                            } else {
                                obj = special && obj[special] ? obj[special][part] : obj[part];
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

                        var parts = 'string' == typeof path ? path.split('.') : path;

                        if (!Array.isArray(parts)) {
                            throw new TypeError('Invalid `path`. Must be either string or array');
                        }

                        if (null == o) return;

                        // the existance of $ in a path tells us if the user desires
                        // the copying of an array instead of setting each value of
                        // the array to the one by one to matching positions of the
                        // current array.
                        var copy = _copying || /\$/.test(path),
                            obj = o,
                            part

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
                                obj = special && obj[special] ? obj[special][part] : obj[part];
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

                    function K(v) {
                        return v;
                    }
                }, {}
            ],
            12: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var Events = _dereq_('./events'),
                        VirtualType = _dereq_('./virtualtype'),
                        utils = _dereq_('./utils'),
                        Types, schemas;

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
                    function Schema(name, baseSchema, obj, options) {
                        if (!(this instanceof Schema))
                            return new Schema(name, baseSchema, obj, options);

                        // Если это именованая схема
                        if (typeof name === 'string') {
                            this.name = name;
                            schemas[name] = this;
                        } else {
                            options = obj;
                            obj = baseSchema;
                            baseSchema = name;
                            name = undefined;
                        }

                        if (!(baseSchema instanceof Schema)) {
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

                        this.options = this.defaultOptions(options);

                        if (baseSchema instanceof Schema) {
                            baseSchema.discriminator(name, this);

                            //this.discriminator( name, baseSchema );
                        }

                        // build paths
                        if (obj) {
                            this.add(obj);
                        }

                        // ensure the documents get an auto _id unless disabled
                        var auto_id = !this.paths['_id'] && (!this.options.noId && this.options._id);
                        if (auto_id) {
                            this.add({
                                _id: {
                                    type: Schema.ObjectId,
                                    auto: true
                                }
                            });
                        }

                        // ensure the documents receive an id getter unless disabled
                        var autoid = !this.paths['id'] && this.options.id;
                        if (autoid) {
                            this.virtual('id').get(idGetter);
                        }
                    }

                    /*!
                     * Returns this documents _id cast to a string.
                     */
                    function idGetter() {
                        if (this.$__._id) {
                            return this.$__._id;
                        }

                        return this.$__._id = null == this._id ? null : String(this._id);
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
                            strict: true,
                            versionKey: '__v',
                            discriminatorKey: '__t',
                            minimize: true
                                // the following are only applied at construction time
                                ,
                            _id: true,
                            id: true
                        }, options);

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
                    Schema.prototype.add = function add(obj, prefix) {
                        prefix = prefix || '';
                        var keys = Object.keys(obj);

                        for (var i = 0; i < keys.length; ++i) {
                            var key = keys[i];

                            if (null == obj[key]) {
                                throw new TypeError('Invalid value for schema path `' + prefix + key + '`');
                            }

                            if (_.isPlainObject(obj[key]) && (!obj[key].constructor || 'Object' == obj[key].constructor.name) && (!obj[key].type || obj[key].type.type)) {

                                if (Object.keys(obj[key]).length) {
                                    // nested object { last: { name: String }}
                                    this.nested[prefix + key] = true;
                                    this.add(obj[key], prefix + key + '.');

                                } else {
                                    this.path(prefix + key, obj[key]); // mixed type
                                }

                            } else {
                                this.path(prefix + key, obj[key]);
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
                    Schema.reserved = Object.create(null);
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
                        reserved.emit = // EventEmitter
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
                            return /\.\d+\.?.*$/.test(path) ? getPositionalPath(this, path) : undefined;
                        }

                        // some path names conflict with document methods
                        if (reserved[path]) {
                            throw new Error("`" + path + "` may not be used as a schema pathname");
                        }

                        // update the tree
                        var subpaths = path.split(/\./),
                            last = subpaths.pop(),
                            branch = this.tree;

                        subpaths.forEach(function (sub, i) {
                            if (!branch[sub]) branch[sub] = {};
                            if ('object' != typeof branch[sub]) {
                                var msg = 'Cannot set nested path `' + path + '`. ' + 'Parent path `' + subpaths.slice(0, i).concat([sub]).join('.') + '` already set to type ' + branch[sub].name + '.';
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
                            obj = {
                                type: obj
                            };

                        // Get the type making sure to allow keys named "type"
                        // and default to mixed if not specified.
                        // { type: { type: String, default: 'freshcut' } }
                        var type = obj.type && !obj.type.type ? obj.type : {};

                        if ('Object' == type.constructor.name || 'mixed' == type) {
                            return new Types.Mixed(path, obj);
                        }

                        if (Array.isArray(type) || Array == type || 'array' == type) {
                            // if it was specified through { type } look for `cast`
                            var cast = (Array == type || 'array' == type) ? obj.cast : type[0];

                            if (cast instanceof Schema) {
                                return new Types.DocumentArray(path, cast, obj);
                            }

                            if ('string' == typeof cast) {
                                cast = Types[cast.charAt(0).toUpperCase() + cast.substring(1)];
                            } else if (cast && (!cast.type || cast.type.type) && 'Object' == cast.constructor.name && Object.keys(cast).length) {
                                return new Types.DocumentArray(path, new Schema(cast), obj);
                            }

                            return new Types.Array(path, cast || Types.Mixed, obj);
                        }

                        var name = 'string' == typeof type ? type : type.name;

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
                        var keys = Object.keys(this.paths),
                            len = keys.length;

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
                    Schema.prototype.requiredPaths = function requiredPaths() {
                        if (this._requiredpaths) return this._requiredpaths;

                        var paths = Object.keys(this.paths),
                            i = paths.length,
                            ret = [];

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
                    function getPositionalPath(self, path) {
                        var subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
                        if (subpaths.length < 2) {
                            return self.paths[subpaths[0]];
                        }

                        var val = self.path(subpaths[0]);
                        if (!val) return val;

                        var last = subpaths.length - 1,
                            subpath, i = 1;

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
                    Schema.prototype.queue = function (name, args) {
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
                    Schema.prototype.pre = function () {
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
                    Schema.prototype.post = function (method, fn) {
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
                    Schema.prototype.static = function (name, fn) {
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
                            this.options[key] = false === value ? {
                                w: 0
                            } : value;
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
                            mem[part] || (mem[part] = (i === parts.length - 1) ? new VirtualType(options, name) : {});
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
                    Schema.prototype.discriminator = function discriminator(name, schema) {
                        if (!(schema instanceof Schema)) {
                            throw new Error("You must pass a valid discriminator Schema");
                        }

                        if (this.discriminatorMapping && !this.discriminatorMapping.isRoot) {
                            throw new Error("Discriminator \"" + name + "\" can only be a discriminator of the root model");
                        }

                        var key = this.options.discriminatorKey;
                        if (schema.path(key)) {
                            throw new Error("Discriminator \"" + name + "\" cannot have field with name \"" + key + "\"");
                        }

                        // merges base schema into new discriminator schema and sets new type field.
                        (function mergeSchemas(schema, baseSchema) {
                            utils.merge(schema, baseSchema);

                            var obj = {};
                            obj[key] = {
                                type: String,
                                default: name
                            };
                            schema.add(obj);
                            schema.discriminatorMapping = {
                                key: key,
                                value: name,
                                isRoot: false
                            };

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

                            var toJSON = schema.options.toJSON,
                                toObject = schema.options.toObject;

                            schema.options = utils.clone(baseSchema.options);
                            if (toJSON) schema.options.toJSON = toJSON;
                            if (toObject) schema.options.toObject = toObject;

                            schema.callQueue = baseSchema.callQueue.concat(schema.callQueue);
                            schema._requiredpaths = undefined; // reset just in case Schema#requiredPaths() was called on either schema
                        })(schema, this);

                        if (!this.discriminators) {
                            this.discriminators = {};
                        }

                        if (!this.discriminatorMapping) {
                            this.discriminatorMapping = {
                                key: key,
                                value: null,
                                isRoot: true
                            };
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

                }, {
                    "./events": 9,
                    "./schema/index": 17,
                    "./utils": 30,
                    "./virtualtype": 31
                }
            ],
            13: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var SchemaType = _dereq_('../schematype'),
                        CastError = SchemaType.CastError,
                        Types = {
                            Boolean: _dereq_('./boolean'),
                            Date: _dereq_('./date'),
                            Number: _dereq_('./number'),
                            String: _dereq_('./string'),
                            ObjectId: _dereq_('./objectid')
                        },
                        StorageArray = _dereq_('../types').Array,
                        EmbeddedDoc = _dereq_('../types').Embedded,
                        Mixed = _dereq_('./mixed'),
                        utils = _dereq_('../utils');

                    console.log(SchemaType);

                    /**
                     * Array SchemaType constructor
                     *
                     * @param {String} key
                     * @param {SchemaType} cast
                     * @param {Object} options
                     * @inherits SchemaType
                     * @api private
                     */
                    function SchemaArray(key, cast, options) {
                        if (cast) {
                            var castOptions = {};

                            if ('Object' === cast.constructor.name) {
                                if (cast.type) {
                                    // support { type: Woot }
                                    castOptions = _.clone(cast); // do not alter user arguments
                                    delete castOptions.type;
                                    cast = cast.type;
                                } else {
                                    cast = Mixed;
                                }
                            }

                            // support { type: 'String' }
                            var name = 'string' == typeof cast ? cast : cast.name;

                            var caster = name in Types ? Types[name] : cast;

                            this.casterConstructor = caster;
                            this.caster = new caster(null, castOptions);
                            if (!(this.caster instanceof EmbeddedDoc)) {
                                this.caster.path = key;
                            }
                        }

                        SchemaType.call(this, key, options);

                        var self = this,
                            defaultArr, fn;

                        if (this.defaultValue) {
                            defaultArr = this.defaultValue;
                            fn = 'function' == typeof defaultArr;
                        }

                        this.default(function () {
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
                    SchemaArray.prototype.cast = function (value, doc, init) {
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

                }, {
                    "../schematype": 22,
                    "../types": 28,
                    "../utils": 30,
                    "./boolean": 14,
                    "./date": 15,
                    "./mixed": 18,
                    "./number": 19,
                    "./objectid": 20,
                    "./string": 21
                }
            ],
            14: [
                function (_dereq_, module, exports) {
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
                    function BooleanSchema(path, options) {
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
                        return !!value;
                    };

                    /*!
                     * Module exports.
                     */

                    module.exports = BooleanSchema;

                }, {
                    "../schematype": 22
                }
            ],
            15: [
                function (_dereq_, module, exports) {
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

                    function DateSchema(key, options) {
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
                        if (value instanceof Number || 'number' == typeof value || String(value) == Number(value))
                            date = new Date(Number(value));

                        // support for date strings
                        else if (value.toString)
                            date = new Date(value.toString());

                        if (date.toString() != 'Invalid Date')
                            return date;

                        throw new CastError('date', value, this.path);
                    };

                    /*!
                     * Module exports.
                     */

                    module.exports = DateSchema;

                }, {
                    "../schematype": 22
                }
            ],
            16: [
                function (_dereq_, module, exports) {

                    /*!
                     * Module dependencies.
                     */

                    var SchemaType = _dereq_('../schematype'),
                        ArrayType = _dereq_('./array'),
                        MongooseDocumentArray = _dereq_('../types/documentarray'),
                        Subdocument = _dereq_('../types/embedded'),
                        Document = _dereq_('../document');

                    /**
                     * SubdocsArray SchemaType constructor
                     *
                     * @param {String} key
                     * @param {Schema} schema
                     * @param {Object} options
                     * @inherits SchemaArray
                     * @api private
                     */
                    function DocumentArray(key, schema, options) {

                        // compile an embedded document for this schema
                        function EmbeddedDocument() {
                            Subdocument.apply(this, arguments);
                        }

                        EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
                        EmbeddedDocument.prototype.$__setSchema(schema);

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

                        this.default(function () {
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

                            var count = array && array.length,
                                error;

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

                                ;
                                (function (i) {
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
                        var selected, subdoc, i;

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
                    function scopePaths(array, fields, init) {
                        if (!(init && fields)) return undefined;

                        var path = array.path + '.',
                            keys = Object.keys(fields),
                            i = keys.length,
                            selected = {},
                            hasKeys, key;

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

                }, {
                    "../document": 3,
                    "../schematype": 22,
                    "../types/documentarray": 26,
                    "../types/embedded": 27,
                    "./array": 13
                }
            ],
            17: [
                function (_dereq_, module, exports) {

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

                }, {
                    "./array": 13,
                    "./boolean": 14,
                    "./date": 15,
                    "./documentarray": 16,
                    "./mixed": 18,
                    "./number": 19,
                    "./objectid": 20,
                    "./string": 21
                }
            ],
            18: [
                function (_dereq_, module, exports) {
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
                    function Mixed(path, options) {
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

                }, {
                    "../schematype": 22
                }
            ],
            19: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module requirements.
                     */

                    var SchemaType = _dereq_('../schematype'),
                        CastError = SchemaType.CastError,
                        errorMessages = _dereq_('../error').messages

                    /**
                     * Number SchemaType constructor.
                     *
                     * @param {String} key
                     * @param {Object} options
                     * @inherits SchemaType
                     * @api private
                     */
                    function NumberSchema(key, options) {
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
                    NumberSchema.prototype.checkRequired = function (value) {
                        if (SchemaType._isRef(this, value)) {
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
                                },
                                msg, 'min'
                            ]);
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
                            this.validators = this.validators.filter(function (v) {
                                return v[0] != this.maxValidator;
                            }, this);
                        }

                        if (null != value) {
                            var msg = message || errorMessages.Number.max;
                            msg = msg.replace(/{MAX}/, value);
                            this.validators.push([this.maxValidator = function (v) {
                                    return v === null || v <= value;
                                },
                                msg, 'max'
                            ]);
                        }

                        return this;
                    };

                    /**
                     * Casts to number
                     *
                     * @param {Object} value value to cast
                     * @api private
                     */
                    NumberSchema.prototype.cast = function (value) {
                        var val = value && value._id ? value._id // documents
                            : value;

                        if (!isNaN(val)) {
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

                }, {
                    "../error": 4,
                    "../schematype": 22
                }
            ],
            20: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var SchemaType = _dereq_('../schematype'),
                        CastError = SchemaType.CastError,
                        oid = _dereq_('../types/objectid'),
                        utils = _dereq_('../utils'),
                        Document = _dereq_('../document');

                    /**
                     * ObjectId SchemaType constructor.
                     *
                     * @param {String} key
                     * @param {Object} options
                     * @inherits SchemaType
                     * @api private
                     */

                    function ObjectId(key, options) {
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
                    ObjectId.prototype.auto = function (turnOn) {
                        if (turnOn) {
                            this.default(defaultId);
                            this.set(resetId)
                        }

                        return this;
                    };

                    /**
                     * Check required
                     *
                     * @api private
                     */
                    ObjectId.prototype.checkRequired = function (value) {
                        if (SchemaType._isRef(this, value)) {
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
                    ObjectId.prototype.cast = function (value) {
                        if (SchemaType._isRef(this, value)) {
                            // wait! we may need to cast this to a document

                            if (null == value) {
                                return value;
                            }

                            if (value instanceof Document) {
                                value.$__.wasPopulated = true;
                                return value;
                            }

                            // setting a populated path
                            if (value instanceof oid) {
                                return value;
                            } else if (!_.isPlainObject(value)) {
                                throw new CastError('ObjectId', value, this.path);
                            }

                            // Нужно создать документ по схеме, указанной в ссылке
                            var schema = this.options.ref;
                            if (!schema) {
                                throw new TypeError('При ссылке (ref) на документ ' +
                                    'нужно указывать схему, по которой этот документ создавать');
                            }

                            var doc = new Document(value, undefined, storage.schemas[schema]);
                            doc.$__.wasPopulated = true;

                            return doc;
                        }

                        if (value === null) return value;

                        if (value instanceof oid)
                            return value;

                        if (value._id && value._id instanceof oid)
                            return value._id;

                        if (value.toString) {
                            try {
                                return new oid(value.toString());
                            } catch (err) {
                                throw new CastError('ObjectId', value, this.path);
                            }
                        }

                        throw new CastError('ObjectId', value, this.path);
                    };

                    /*!
                     * ignore
                     */
                    function defaultId() {
                        return new oid();
                    }

                    function resetId(v) {
                        this.$__._id = null;
                        return v;
                    }

                    /*!
                     * Module exports.
                     */

                    module.exports = ObjectId;

                }, {
                    "../document": 3,
                    "../schematype": 22,
                    "../types/objectid": 29,
                    "../utils": 30
                }
            ],
            21: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var SchemaType = _dereq_('../schematype'),
                        CastError = SchemaType.CastError,
                        errorMessages = _dereq_('../error').messages

                    /**
                     * String SchemaType constructor.
                     *
                     * @param {String} key
                     * @param {Object} options
                     * @inherits SchemaType
                     * @api private
                     */

                    function StringSchema(key, options) {
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
                            this.validators = this.validators.filter(function (v) {
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
                    StringSchema.prototype.match = function match(regExp, message) {
                        // yes, we allow multiple match validators

                        var msg = message || errorMessages.String.match;

                        function matchValidator(v) {
                            return null != v && '' !== v ? regExp.test(v) : true
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
                    StringSchema.prototype.checkRequired = function checkRequired(value, doc) {
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
                    StringSchema.prototype.cast = function (value) {
                        if (value === null) {
                            return value;
                        }

                        if ('undefined' !== typeof value) {
                            // handle documents being passed
                            if (value._id && 'string' == typeof value._id) {
                                return value._id;
                            }
                            if (value.toString) {
                                return value.toString();
                            }
                        }

                        throw new CastError('string', value, this.path);
                    };

                    /*!
                     * Module exports.
                     */

                    module.exports = StringSchema;

                }, {
                    "../error": 4,
                    "../schematype": 22
                }
            ],
            22: [
                function (_dereq_, module, exports) {
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

                    function SchemaType(path, options, instance) {
                        this.path = path;
                        this.instance = instance;
                        this.validators = [];
                        this.setters = [];
                        this.getters = [];
                        this.options = options;

                        for (var i in options)
                            if (this[i] && 'function' == typeof this[i]) {
                                var opts = Array.isArray(options[i]) ? options[i] : [options[i]];

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
                            this.defaultValue = typeof val === 'function' ? val : this.cast(val);

                            return this;

                        } else if (arguments.length > 1) {
                            this.defaultValue = _.toArray(arguments);
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

                        var i = arguments.length,
                            arg;

                        while (i--) {
                            arg = arguments[i];
                            if (!(arg && 'Object' == arg.constructor.name)) {
                                var msg = 'Invalid validator. Received (' + typeof arg + ') ' + arg + '. See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate';

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
                        var ret = 'function' === typeof this.defaultValue ? this.defaultValue.call(scope) : this.defaultValue;

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
                        if (SchemaType._isRef(this, value)) {
                            return init ? value : this.cast(value, scope, init, priorVal);
                        }

                        var v = value,
                            setters = this.setters,
                            len = setters.length,
                            caster = this.caster;

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
                    SchemaType.prototype.applyGetters = function (value, scope) {
                        if (SchemaType._isRef(this, value)) return value;

                        var v = value,
                            getters = this.getters,
                            len = getters.length;

                        if (!len) {
                            return v;
                        }

                        while (len--) {
                            v = getters[len].call(scope, v, this);
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
                        var err = false,
                            path = this.path,
                            count = this.validators.length;

                        if (!count) return callback(null);

                        function validate(ok, message, type, val) {
                            if (err) return;
                            if (ok === undefined || ok) {
                                --count || callback(null);
                            } else {
                                callback(err = new ValidatorError(path, message, type, val));
                            }
                        }

                        this.validators.forEach(function (v) {
                            var validator = v[0],
                                message = v[1],
                                type = v[2];

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
                    SchemaType._isRef = function (self, value) {
                        // fast path
                        var ref = self.options && self.options.ref;

                        if (ref) {
                            if (null == value) return true;
                            if (_.isObject(value)) {
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

                }, {
                    "./error": 4
                }
            ],
            23: [
                function (_dereq_, module, exports) {
                    /*!
                     * StateMachine represents a minimal `interface` for the
                     * constructors it builds via StateMachine.ctor(...).
                     *
                     * @api private
                     */

                    var StateMachine = module.exports = function StateMachine() {
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

                            var i = states.length,
                                state;

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

                    StateMachine.prototype._changeState = function _changeState(path, nextState) {
                        var prevBucket = this.states[this.paths[path]];
                        if (prevBucket) delete prevBucket[path];

                        this.paths[path] = nextState;
                        this.states[nextState][path] = true;
                    };

                    /*!
                     * ignore
                     */

                    StateMachine.prototype.clear = function clear(state) {
                        var keys = Object.keys(this.states[state]),
                            i = keys.length,
                            path;

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

                    StateMachine.prototype.some = function some() {
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

                    StateMachine.prototype._iter = function _iter(iterMethod) {
                        return function () {
                            var numArgs = arguments.length,
                                states = _.toArray(arguments).slice(0, numArgs - 1),
                                callback = arguments[numArgs - 1];

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

                    StateMachine.prototype.forEach = function forEach() {
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

                    StateMachine.prototype.map = function map() {
                        this.map = this._iter('map');
                        return this.map.apply(this, arguments);
                    };


                }, {}
            ],
            24: [
                function (_dereq_, module, exports) {
                    /**
                     * Реализации хранилища
                     * вдохновлён mongoose 3.8.4 (исправлены баги по 3.8.12)
                     *
                     * http://docs.meteor.com/#selectors
                     * https://github.com/meteor/meteor/tree/master/packages/minimongo
                     *
                     * browserify --debug src/storage.js --standalone storage > storage.js
                     */

                    'use strict';

                    /*!
                     * Module dependencies.
                     */

                    var Collection = _dereq_('./collection'),
                        Schema = _dereq_('./schema'),
                        SchemaType = _dereq_('./schematype'),
                        VirtualType = _dereq_('./virtualtype'),
                        Types = _dereq_('./types'),
                        Document = _dereq_('./document'),
                        utils = _dereq_('./utils');


                    /**
                     * Storage constructor.
                     *
                     * The exports object of the `storage` module is an instance of this class.
                     * Most apps will only use this one instance.
                     *
                     * @api public
                     */
                    function Storage() {
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
                    Storage.prototype.createCollection = function (name, schema, api) {
                        if (this[name]) {
                            console.info('storage::collection: `' + name + '` already exist');
                            return this[name];
                        }

                        if ('Schema' !== schema.constructor.name) {
                            throw new TypeError('`schema` must be Schema instance');
                        }

                        this.collectionNames.push(name);

                        return this[name] = new Collection(name, schema, api);
                    };

                    /**
                     * Получить название коллекций в виде массива строк.
                     *
                     * @returns {Array.<string>} An array containing all collections in the storage.
                     */
                    Storage.prototype.getCollectionNames = function () {
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

                }, {
                    "./collection": 2,
                    "./document": 3,
                    "./error": 4,
                    "./schema": 12,
                    "./schematype": 22,
                    "./types": 28,
                    "./utils": 30,
                    "./virtualtype": 31
                }
            ],
            25: [
                function (_dereq_, module, exports) {
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
                    function StorageArray(values, path, doc) {
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
                    StorageArray.prototype._cast = function (value) {
                        var owner = this._owner;
                        var populated = false;

                        if (this._parent) {
                            // if a populated array, we must cast to the same model
                            // instance as specified in the original query.
                            if (!owner) {
                                owner = this._owner = this._parent.ownerDocument ? this._parent.ownerDocument() : this._parent;
                            }

                            populated = owner.populated(this._path, true);
                        }

                        if (populated && null != value) {
                            // cast to the populated Models schema
                            var Model = populated.options.model;

                            // only objects are permitted so we can safely assume that
                            // non-objects are to be interpreted as _id
                            if (value instanceof ObjectId || !_.isObject(value)) {
                                value = {
                                    _id: value
                                };
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
                        var parent = this._parent,
                            dirtyPath;

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
                        var values = [].map.call(arguments, this._cast, this),
                            ret = [].push.apply(this, values);

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
                        var values = [].map.call(arguments, this._cast, this),
                            cur = this._parent.get(this._path),
                            i = cur.length,
                            mem;

                        while (i--) {
                            mem = cur[i];
                            if (mem instanceof EmbeddedDocument) {
                                if (values.some(function (v) {
                                    return v.equals(mem);
                                })) {
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
                    StorageArray.prototype.splice = function splice() {
                        var ret, vals, i;

                        if (arguments.length) {
                            vals = [];
                            for (i = 0; i < arguments.length; ++i) {
                                vals[i] = i < 2 ? arguments[i] : this._cast(arguments[i]);
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
                    StorageArray.prototype.addToSet = function addToSet() {
                        var values = [].map.call(arguments, this._cast, this),
                            added = [],
                            type = values[0] instanceof EmbeddedDocument ? 'doc' :
                            values[0] instanceof Date ? 'date' :
                            '';

                        values.forEach(function (v) {
                            var found;
                            switch (type) {
                            case 'doc':
                                found = this.some(function (doc) {
                                    return doc.equals(v)
                                });
                                break;
                            case 'date':
                                var val = +v;
                                found = this.some(function (d) {
                                    return +d === val
                                });
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
                                return doc instanceof Document ? doc.toObject(options) : doc
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
                    StorageArray.prototype.indexOf = function indexOf(obj) {
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

                }, {
                    "../document": 3,
                    "../utils": 30,
                    "./embedded": 27,
                    "./objectid": 29
                }
            ],
            26: [
                function (_dereq_, module, exports) {
                    /*!
                     * Module dependencies.
                     */

                    var StorageArray = _dereq_('./array'),
                        ObjectId = _dereq_('./objectid'),
                        ObjectIdSchema = _dereq_('../schema/objectid'),
                        utils = _dereq_('../utils'),
                        Document = _dereq_('../document');

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
                    function StorageDocumentArray(values, path, doc) {
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
                        if (value instanceof ObjectId || !_.isObject(value)) {
                            value = {
                                _id: value
                            };
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
                        var casted, sid, _id;

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
                    StorageDocumentArray.prototype.notify = function notify(event) {
                        var self = this;
                        return function notify(val) {
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

                }, {
                    "../document": 3,
                    "../schema/objectid": 20,
                    "../utils": 30,
                    "./array": 25,
                    "./objectid": 29
                }
            ],
            27: [
                function (_dereq_, module, exports) {
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
                    function EmbeddedDocument(data, parentArr) {
                        if (parentArr) {
                            this.__parentArray = parentArr;
                            this.__parent = parentArr._parent;
                        } else {
                            this.__parentArray = undefined;
                            this.__parent = undefined;
                        }

                        Document.call(this, data, undefined);

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
                            this.__parentArray.pull({
                                _id: _id
                            });
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

                        return path ? this.$__.fullPath + '.' + path : this.$__.fullPath;
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

                }, {
                    "../document": 3
                }
            ],
            28: [
                function (_dereq_, module, exports) {

                    /*!
                     * Module exports.
                     */

                    exports.Array = _dereq_('./array');

                    exports.Embedded = _dereq_('./embedded');

                    exports.DocumentArray = _dereq_('./documentarray');
                    exports.ObjectId = _dereq_('./objectid');

                }, {
                    "./array": 25,
                    "./documentarray": 26,
                    "./embedded": 27,
                    "./objectid": 29
                }
            ],
            29: [
                function (_dereq_, module, exports) {
                    // Regular expression that checks for hex value
                    var rcheckForHex = new RegExp("^[0-9a-fA-F]{24}$");

                    /**
                     * Create a new ObjectId instance
                     *
                     * @param {String} [id] Can be a 24 byte hex string.
                     * @return {Object} instance of ObjectId.
                     */
                    function ObjectId(id) {
                        // Конструктор можно использовать без new
                        if (!(this instanceof ObjectId)) return new ObjectId(id);
                        //if ( id instanceof ObjectId ) return id;

                        // Throw an error if it's not a valid setup
                        if (id != null && typeof id != 'string' && id.length != 24)
                            throw new Error('Argument passed in must be a string of 24 hex characters');

                        // Generate id
                        if (id == null) {
                            this.id = this.generate();

                        } else if (rcheckForHex.test(id)) {
                            this.id = id;

                        } else {
                            throw new Error('Value passed in is not a valid 24 character hex string');
                        }
                    }

                    // Private array of chars to use
                    ObjectId.prototype.CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

                    //TODO: можно ли использовать большие символы A-Z?
                    // Generate a random ObjectId.
                    ObjectId.prototype.generate = function () {
                        var chars = this.CHARS,
                            _id = new Array(36),
                            rnd = 0,
                            r;
                        for (var i = 0; i < 24; i++) {
                            if (rnd <= 0x02)
                                rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;

                            r = rnd & 0xf;
                            rnd = rnd >> 4;
                            _id[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                        }

                        return _id.join('').toLowerCase();
                    };

                    /**
                     * Return the ObjectId id as a 24 byte hex string representation
                     *
                     * @return {String} return the 24 byte hex string representation.
                     * @api public
                     */
                    ObjectId.prototype.toHexString = function () {
                        return this.id;
                    };

                    /**
                     * Converts the id into a 24 byte hex string for printing
                     *
                     * @return {String} return the 24 byte hex string representation.
                     * @api private
                     */
                    ObjectId.prototype.toString = function () {
                        return this.toHexString();
                    };

                    /**
                     * Converts to its JSON representation.
                     *
                     * @return {String} return the 24 byte hex string representation.
                     * @api private
                     */
                    ObjectId.prototype.toJSON = function () {
                        return this.toHexString();
                    };

                    /**
                     * Compares the equality of this ObjectId with `otherID`.
                     *
                     * @param {Object} otherID ObjectId instance to compare against.
                     * @return {Bool} the result of comparing two ObjectId's
                     * @api public
                     */
                    ObjectId.prototype.equals = function equals(otherID) {
                        var id = (otherID instanceof ObjectId || otherID.toHexString) ? otherID.id : new ObjectId(otherID).id;

                        return this.id === id;
                    };

                    module.exports = ObjectId;

                }, {}
            ],
            30: [
                function (_dereq_, module, exports) {
                    (function (process, global) {
                        /*!
                         * Module dependencies.
                         */

                        var ObjectId = _dereq_('./types/objectid'),
                            mpath = _dereq_('./mpath'),
                            StorageArray = _dereq_('./types').Array,
                            Document = _dereq_('./document');

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
                            if (!~uncountables.indexOf(str.toLowerCase())) {
                                found = rules.filter(function (rule) {
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
                        exports.deepEqual = function deepEqual(a, b) {
                            if (utils.isStorageObject(a)) a = a.toObject();
                            if (utils.isStorageObject(b)) b = b.toObject();

                            return _.isEqual(a, b);
                        };



                        var toString = Object.prototype.toString;

                        function isRegExp(o) {
                            return 'object' == typeof o && '[object RegExp]' == toString.call(o);
                        }

                        function cloneRegExp(regexp) {
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
                        exports.clone = function clone(obj, options) {
                            if (obj === undefined || obj === null)
                                return obj;

                            if (_.isArray(obj)) {
                                return cloneArray(obj, options);
                            }

                            if (isStorageObject(obj)) {
                                if (options && options.json && 'function' === typeof obj.toJSON) {
                                    return obj.toJSON(options);
                                } else {
                                    return obj.toObject(options);
                                }
                            }

                            if (obj.constructor) {
                                switch (obj.constructor.name) {
                                case 'Object':
                                    return cloneObject(obj, options);
                                case 'Date':
                                    return new obj.constructor(+obj);
                                case 'RegExp':
                                    return cloneRegExp(obj);
                                default:
                                    // ignore
                                    break;
                                }
                            }

                            if (obj instanceof ObjectId) {
                                return new ObjectId(obj.id);
                            }

                            if (!obj.constructor && _.isObject(obj)) {
                                // object created with Object.create(null)
                                return cloneObject(obj, options);
                            }

                            if (obj.valueOf) {
                                return obj.valueOf();
                            }
                        };
                        var clone = exports.clone;

                        /*!
                         * ignore
                         */
                        function cloneObject(obj, options) {
                            var retainKeyOrder = options && options.retainKeyOrder,
                                minimize = options && options.minimize,
                                ret = {},
                                hasKeys, keys, val, k, i;

                            if (retainKeyOrder) {
                                for (k in obj) {
                                    val = clone(obj[k], options);

                                    if (!minimize || ('undefined' !== typeof val)) {
                                        hasKeys || (hasKeys = true);
                                        ret[k] = val;
                                    }
                                }
                            } else {
                                // faster

                                keys = Object.keys(obj);
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

                            return minimize ? hasKeys && ret : ret;
                        }

                        function cloneArray(arr, options) {
                            var ret = [];
                            for (var i = 0, l = arr.length; i < l; i++) {
                                ret.push(clone(arr[i], options));
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
                        exports.merge = function merge(to, from) {
                            var keys = Object.keys(from),
                                i = keys.length,
                                key;

                            while (i--) {
                                key = keys[i];
                                if ('undefined' === typeof to[key]) {
                                    to[key] = from[key];
                                } else if (_.isObject(from[key])) {
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
                        exports.isStorageObject = function (v) {
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

                        exports.setImmediate = (function () {
                            // Для поддержки тестов (окружение node.js)
                            if (typeof global === 'object' && process.nextTick) return process.nextTick;
                            // Если в браузере уже реализован этот метод
                            if (window.setImmediate) return window.setImmediate;

                            var head = {},
                                tail = head; // очередь вызовов, 1-связный список

                            var ID = Math.random(); // уникальный идентификатор

                            function onmessage(e) {
                                if (e.data != ID) return; // не наше сообщение
                                head = head.next;
                                var func = head.func;
                                delete head.func;
                                func();
                            }

                            if (window.addEventListener) { // IE9+, другие браузеры
                                window.addEventListener('message', onmessage, false);
                            } else { // IE8
                                window.attachEvent('onmessage', onmessage);
                            }

                            return window.postMessage ? function (func) {
                                    tail = tail.next = {
                                        func: func
                                    };
                                    window.postMessage(ID, "*");
                                } :
                                function (func) { // IE<8
                                    setTimeout(func, 0);
                                };
                        }());


                    }).call(this, _dereq_("FWaASH"), typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
                }, {
                    "./document": 3,
                    "./mpath": 11,
                    "./types": 28,
                    "./types/objectid": 29,
                    "FWaASH": 1
                }
            ],
            31: [
                function (_dereq_, module, exports) {

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

                    function VirtualType(options, name) {
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

                }, {}
            ]
        }, {}, [24])
        //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2RvY3VtZW50LmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2Vycm9yLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2Vycm9yL2Nhc3QuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZXJyb3IvbWVzc2FnZXMuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZXJyb3IvdmFsaWRhdGlvbi5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9lcnJvci92YWxpZGF0b3IuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvZXZlbnRzLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL2ludGVybmFsLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL21wYXRoLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvYXJyYXkuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL2Jvb2xlYW4uanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL2RhdGUuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL2RvY3VtZW50YXJyYXkuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc2NoZW1hL2luZGV4LmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9taXhlZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvbnVtYmVyLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYS9vYmplY3RpZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy9zY2hlbWEvc3RyaW5nLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3NjaGVtYXR5cGUuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvc3RhdGVtYWNoaW5lLmpzIiwiL1VzZXJzL3VzZXIvU2l0ZXMvZ2l0aHViL3N0b3JhZ2Uvc3JjL3N0b3JhZ2UuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvdHlwZXMvYXJyYXkuanMiLCIvVXNlcnMvdXNlci9TaXRlcy9naXRodWIvc3RvcmFnZS9zcmMvdHlwZXMvZG9jdW1lbnRhcnJheS5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9lbWJlZGRlZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9pbmRleC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy90eXBlcy9vYmplY3RpZC5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy91dGlscy5qcyIsIi9Vc2Vycy91c2VyL1NpdGVzL2dpdGh1Yi9zdG9yYWdlL3NyYy92aXJ0dWFsdHlwZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDampCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLy9UT0RPOiDQvdCw0L/QuNGB0LDRgtGMINC80LXRgtC+0LQgLnVwc2VydCggZG9jICkgLSDQvtCx0L3QvtCy0LvQtdC90LjQtSDQtNC+0LrRg9C80LXQvdGC0LAsINCwINC10YHQu9C4INC10LPQviDQvdC10YIsINGC0L4g0YHQvtC30LTQsNC90LjQtVxuXG4vL1RPRE86INC00L7QtNC10LvQsNGC0Ywg0LvQvtCz0LjQutGDINGBIGFwaVJlc291cmNlICjRgdC+0YXRgNCw0L3Rj9GC0Ywg0YHRgdGL0LvQutGDINC90LAg0L3QtdCz0L4g0Lgg0LjRgdC/0L7Qu9GM0LfQvtCy0YLRjCDQv9GA0Lgg0LzQtdGC0L7QtNC1IGRvYy5zYXZlKVxuLyoqXG4gKiDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC60L7Qu9C70LXQutGG0LjQuS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIC0g0L3QsNC30LLQsNC90LjQtSDQutC+0LvQu9C10LrRhtC40LhcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWEgLSDQodGF0LXQvNCwINC40LvQuCDQvtCx0YrQtdC60YIg0L7Qv9C40YHQsNC90LjRjyDRgdGF0LXQvNGLXG4gKiBAcGFyYW0ge09iamVjdH0gW2FwaV0gLSDRgdGB0YvQu9C60LAg0L3QsCBhcGkg0YDQtdGB0YPRgNGBXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ29sbGVjdGlvbiAoIG5hbWUsIHNjaGVtYSwgYXBpICl7XG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L3QsNC30LLQsNC90LjQtSDQv9GA0L7RgdGC0YDQsNC90YHRgtCy0LAg0LjQvNGR0L1cbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgLy8g0KXRgNCw0L3QuNC70LjRidC1INC00LvRjyDQtNC+0LrRg9C80LXQvdGC0L7QslxuICB0aGlzLmRvY3VtZW50cyA9IHt9O1xuXG4gIGlmICggXy5pc09iamVjdCggc2NoZW1hICkgJiYgISggc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICkgKSB7XG4gICAgc2NoZW1hID0gbmV3IFNjaGVtYSggc2NoZW1hICk7XG4gIH1cblxuICAvLyDQodC+0YXRgNCw0L3QuNC8INGB0YHRi9C70LrRgyDQvdCwIGFwaSDQtNC70Y8g0LzQtdGC0L7QtNCwIC5zYXZlKClcbiAgdGhpcy5hcGkgPSBhcGk7XG5cbiAgLy8g0JjRgdC/0L7Qu9GM0LfRg9C10LzQsNGPINGB0YXQtdC80LAg0LTQu9GPINC60L7Qu9C70LXQutGG0LjQuFxuICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcblxuICAvLyDQntGC0L7QsdGA0LDQttC10L3QuNC1INC+0LHRitC10LrRgtCwIGRvY3VtZW50cyDQsiDQstC40LTQtSDQvNCw0YHRgdC40LLQsCAo0LTQu9GPINC90L7QutCw0YPRgtCwKVxuICB0aGlzLmFycmF5ID0gW107XG4gIGtvLnRyYWNrKCB0aGlzLCBbJ2FycmF5J10gKTtcbn1cblxuQ29sbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LjRgtGMINC00L7QutGD0LzQtdC90YIg0LjQu9C4INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7Qsi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IHR5cGU6ICdqZWxseSBiZWFuJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZChbeyB0eXBlOiAnamVsbHkgYmVhbicgfSwgeyB0eXBlOiAnc25pY2tlcnMnIH1dKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmFkZCh7IF9pZDogJyoqKioqJywgdHlwZTogJ2plbGx5IGJlYW4nIH0sIHRydWUpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxBcnJheS48b2JqZWN0Pn0gW2RvY10gLSDQlNC+0LrRg9C80LXQvdGCXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZmllbGRzXSAtINCy0YvQsdGA0LDQvdC90YvQtSDQv9C+0LvRjyDQv9GA0Lgg0LfQsNC/0YDQvtGB0LUgKNC90LUg0YDQtdCw0LvQuNC30L7QstCw0L3QviDQsiDQtNC+0LrRg9C80LXQvdGC0LUpXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRdIC0gaHlkcmF0ZSBkb2N1bWVudCAtINC90LDQv9C+0LvQvdC40YLRjCDQtNC+0LrRg9C80LXQvdGCINC00LDQvdC90YvQvNC4ICjQuNGB0L/QvtC70YzQt9GD0LXRgtGB0Y8g0LIgYXBpLWNsaWVudClcbiAgICogQHBhcmFtIHtib29sZWFufSBbX3N0b3JhZ2VXaWxsTXV0YXRlXSAtINCk0LvQsNCzINC00L7QsdCw0LLQu9C10L3QuNGPINC80LDRgdGB0LjQstCwINC00L7QutGD0LzQtdC90YLQvtCyLiDRgtC+0LvRjNC60L4g0LTQu9GPINCy0L3Rg9GC0YDQtdC90L3QtdCz0L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDQvdC40Y9cbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8QXJyYXkuPHN0b3JhZ2UuRG9jdW1lbnQ+fVxuICAgKi9cbiAgYWRkOiBmdW5jdGlvbiggZG9jLCBmaWVsZHMsIGluaXQsIF9zdG9yYWdlV2lsbE11dGF0ZSApe1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YLQsCDQvdC10YIsINC30L3QsNGH0LjRgiDQsdGD0LTQtdGCINC/0YPRgdGC0L7QuVxuICAgIGlmICggZG9jID09IG51bGwgKSBkb2MgPSBudWxsO1xuXG4gICAgLy8g0JzQsNGB0YHQuNCyINC00L7QutGD0LzQtdC90YLQvtCyXG4gICAgaWYgKCBfLmlzQXJyYXkoIGRvYyApICl7XG4gICAgICB2YXIgc2F2ZWREb2NzID0gW107XG5cbiAgICAgIF8uZWFjaCggZG9jLCBmdW5jdGlvbiggZG9jICl7XG4gICAgICAgIHNhdmVkRG9jcy5wdXNoKCBzZWxmLmFkZCggZG9jLCBmaWVsZHMsIGluaXQsIHRydWUgKSApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZUhhc011dGF0ZWQoKTtcblxuICAgICAgcmV0dXJuIHNhdmVkRG9jcztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBkb2MgJiYgZG9jLl9pZDtcblxuICAgIC8vINCV0YHQu9C4INC00L7QutGD0LzQtdC90YIg0YPQttC1INC10YHRgtGMLCDRgtC+INC/0YDQvtGB0YLQviDRg9GB0YLQsNC90L7QstC40YLRjCDQt9C90LDRh9C10L3QuNGPXG4gICAgaWYgKCBpZCAmJiB0aGlzLmRvY3VtZW50c1sgaWQgXSApe1xuICAgICAgdGhpcy5kb2N1bWVudHNbIGlkIF0uc2V0KCBkb2MgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlzY3JpbWluYXRvck1hcHBpbmcgPSB0aGlzLnNjaGVtYVxuICAgICAgICA/IHRoaXMuc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nXG4gICAgICAgIDogbnVsbDtcblxuICAgICAgdmFyIGtleSA9IGRpc2NyaW1pbmF0b3JNYXBwaW5nICYmIGRpc2NyaW1pbmF0b3JNYXBwaW5nLmlzUm9vdFxuICAgICAgICA/IGRpc2NyaW1pbmF0b3JNYXBwaW5nLmtleVxuICAgICAgICA6IG51bGw7XG5cbiAgICAgIC8vINCS0YvQsdC40YDQsNC10Lwg0YHRhdC10LzRgywg0LXRgdC70Lgg0LXRgdGC0Ywg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YBcbiAgICAgIHZhciBzY2hlbWE7XG4gICAgICBpZiAoa2V5ICYmIGRvYyAmJiBkb2Nba2V5XSAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9ycyAmJiB0aGlzLnNjaGVtYS5kaXNjcmltaW5hdG9yc1tkb2Nba2V5XV0pIHtcbiAgICAgICAgc2NoZW1hID0gdGhpcy5zY2hlbWEuZGlzY3JpbWluYXRvcnNbZG9jW2tleV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0RvYyA9IG5ldyBEb2N1bWVudCggZG9jLCB0aGlzLm5hbWUsIHNjaGVtYSwgZmllbGRzLCBpbml0ICk7XG4gICAgICBpZCA9IG5ld0RvYy5faWQudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyDQlNC70Y8g0L7QtNC40L3QvtGH0L3Ri9GFINC00L7QutGD0LzQtdC90YLQvtCyINGC0L7QttC1INC90YPQttC90L4gINCy0YvQt9Cy0LDRgtGMIHN0b3JhZ2VIYXNNdXRhdGVkXG4gICAgaWYgKCAhX3N0b3JhZ2VXaWxsTXV0YXRlICl7XG4gICAgICB0aGlzLnN0b3JhZ2VIYXNNdXRhdGVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBpZCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQo9C00LDQu9C10L3QuNGC0Ywg0LTQvtC60YPQvNC10L3Rgi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggRG9jdW1lbnQgKTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLnJlbW92ZSggdXVpZCApO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdHxudW1iZXJ9IGRvY3VtZW50IC0g0KHQsNC8INC00L7QutGD0LzQtdC90YIg0LjQu9C4INC10LPQviBpZC5cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCBkb2N1bWVudCApe1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5kb2N1bWVudHNbIGRvY3VtZW50Ll9pZCB8fCBkb2N1bWVudCBdO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC00L7QutGD0LzQtdC90YLRiy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogLy8gbmFtZWQgam9oblxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZCh7IG5hbWU6ICdqb2huJyB9KTtcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmQoeyBhdXRob3I6ICdTaGFrZXNwZWFyZScsIHllYXI6IDE2MTEgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtBcnJheS48c3RvcmFnZS5Eb2N1bWVudD59XG4gICAqL1xuICBmaW5kOiBmdW5jdGlvbiggY29uZGl0aW9ucyApe1xuICAgIHJldHVybiBfLndoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC+0LTQuNC9INC00L7QutGD0LzQtdC90YIg0L/QviBpZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogc3RvcmFnZS5jb2xsZWN0aW9uLmZpbmRCeUlkKCBpZCApO1xuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRCeUlkOiBmdW5jdGlvbiggX2lkICl7XG4gICAgcmV0dXJuIHRoaXMuZG9jdW1lbnRzWyBfaWQgXTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0YPQtNCw0LvQuNGC0Ywg0LXQs9C+LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLmNvbGxlY3Rpb24uZmluZEJ5SWRBbmRSZW1vdmUoIGlkICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZEJ5SWRcbiAgICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICAgKlxuICAgKiBAcGFyYW0gX2lkXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZEJ5SWRBbmRSZW1vdmU6IGZ1bmN0aW9uKCBfaWQgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kQnlJZCggX2lkICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQv9C+IGlkINC00L7QutGD0LzQtdC90YIg0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kQnlJZFxuICAgKiBAc2VlIENvbGxlY3Rpb24udXBkYXRlXG4gICAqXG4gICAqIEBwYXJhbSBfaWRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZEJ5SWRBbmRVcGRhdGU6IGZ1bmN0aW9uKCBfaWQsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRCeUlkKCBfaWQgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQvtC00LjQvSDQtNC+0LrRg9C80LXQvdGCLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAvLyBmaW5kIG9uZSBpcGhvbmUgYWR2ZW50dXJlc1xuICAgKiBzdG9yYWdlLmFkdmVudHVyZS5maW5kT25lKHsgdHlwZTogJ2lwaG9uZScgfSk7XG4gICAqXG4gICAqIEBwYXJhbSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtzdG9yYWdlLkRvY3VtZW50fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpbmRPbmU6IGZ1bmN0aW9uKCBjb25kaXRpb25zICl7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKCB0aGlzLmRvY3VtZW50cywgY29uZGl0aW9ucyApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQndCw0LnRgtC4INC/0L4g0YPRgdC70L7QstC40Y4g0L7QtNC40L0g0LTQvtC60YPQvNC10L3RgiDQuCDRg9C00LDQu9C40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHN0b3JhZ2UuY29sbGVjdGlvbi5maW5kT25lQW5kUmVtb3ZlKCBjb25kaXRpb25zICkgLy8gcmV0dXJucyDRgW9sbGVjdGlvblxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24uZmluZE9uZVxuICAgKiBAc2VlIENvbGxlY3Rpb24ucmVtb3ZlXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25kaXRpb25zXG4gICAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICAgKi9cbiAgZmluZE9uZUFuZFJlbW92ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMgKXtcbiAgICB0aGlzLnJlbW92ZSggdGhpcy5maW5kT25lKCBjb25kaXRpb25zICkgKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICog0J3QsNC50YLQuCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YPRgdC70L7QstC40Y4g0Lgg0L7QsdC90L7QstC40YLRjCDQtdCz0L4uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbi5maW5kT25lXG4gICAqIEBzZWUgQ29sbGVjdGlvbi51cGRhdGVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmRpdGlvbnNcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmluZE9uZUFuZFVwZGF0ZTogZnVuY3Rpb24oIGNvbmRpdGlvbnMsIHBhdGgsIHZhbHVlICl7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKCB0aGlzLmZpbmRPbmUoIGNvbmRpdGlvbnMgKSwgcGF0aCwgdmFsdWUgKTtcbiAgfSxcblxuICAvKipcbiAgICog0J7QsdC90L7QstC40YLRjCDRgdGD0YnQtdGB0YLQstGD0Y7RidC40LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBzdG9yYWdlLnBsYWNlcy51cGRhdGUoIHN0b3JhZ2UucGxhY2VzLmZpbmRCeUlkKCAwICksIHtcbiAgICogICBuYW1lOiAnSXJrdXRzaydcbiAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfG9iamVjdH0gZG9jdW1lbnRcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7b2JqZWN0fGJvb2xlYW58bnVtYmVyfHN0cmluZ3xudWxsfHVuZGVmaW5lZH0gdmFsdWVcbiAgICogQHJldHVybnMge3N0b3JhZ2UuRG9jdW1lbnR8Qm9vbGVhbn1cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oIGRvY3VtZW50LCBwYXRoLCB2YWx1ZSApe1xuICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1sgZG9jdW1lbnQuX2lkIHx8IGRvY3VtZW50IF07XG5cbiAgICBpZiAoIGRvYyA9PSBudWxsICl7XG4gICAgICBjb25zb2xlLndhcm4oJ3N0b3JhZ2U6OnVwZGF0ZTogRG9jdW1lbnQgaXMgbm90IGZvdW5kLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBkb2Muc2V0KCBwYXRoLCB2YWx1ZSApO1xuICB9LFxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQvdCwINC40LfQvNC10L3QtdC90LjRjyAo0LTQvtCx0LDQstC70LXQvdC40LUsINGD0LTQsNC70LXQvdC40LUpINC00LDQvdC90YvRhSDQsiDQutC+0LvQu9C10LrRhtC40LhcbiAgICovXG4gIHN0b3JhZ2VIYXNNdXRhdGVkOiBmdW5jdGlvbigpe1xuICAgIC8vINCe0LHQvdC+0LLQuNC8INC80LDRgdGB0LjQsiDQtNC+0LrRg9C80LXQvdGC0L7QsiAo0YHQv9C10YbQuNCw0LvRjNC90L7QtSDQvtGC0L7QsdGA0LDQttC10L3QuNC1INC00LvRjyDQv9C10YDQtdCx0L7RgNCwINC90L7QutCw0YPRgtC+0LwpXG4gICAgdGhpcy5hcnJheSA9IF8udG9BcnJheSggdGhpcy5kb2N1bWVudHMgKTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbiAgLCBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJylcbiAgLCBNaXhlZFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hL21peGVkJylcbiAgLCBTY2hlbWFBcnJheSA9IHJlcXVpcmUoJy4vc2NoZW1hL2FycmF5JylcbiAgLCBTY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpXG4gICwgVmFsaWRhdG9yRXJyb3IgPSByZXF1aXJlKCcuL3NjaGVtYXR5cGUnKS5WYWxpZGF0b3JFcnJvclxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG4gICwgY2xvbmUgPSB1dGlscy5jbG9uZVxuICAsIFZhbGlkYXRpb25FcnJvciA9IFN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3JcbiAgLCBJbnRlcm5hbENhY2hlID0gcmVxdWlyZSgnLi9pbnRlcm5hbCcpXG4gICwgZGVlcEVxdWFsID0gdXRpbHMuZGVlcEVxdWFsXG4gICwgRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vdHlwZXMvZG9jdW1lbnRhcnJheScpXG4gICwgRW1iZWRkZWQgPSByZXF1aXJlKCcuL3R5cGVzL2VtYmVkZGVkJyk7XG5cbi8qKlxuICog0JrQvtC90YHRgtGA0YPQutGC0L7RgCDQtNC+0LrRg9C80LXQvdGC0LAuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSDQt9C90LDRh9C10L3QuNGPLCDQutC+0YLQvtGA0YvQtSDQvdGD0LbQvdC+INGD0YHRgtCw0L3QvtCy0LjRgtGMXG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IFtjb2xsZWN0aW9uTmFtZV0gLSDQutC+0LvQu9C10LrRhtC40Y8g0LIg0LrQvtGC0L7RgNC+0Lkg0LHRg9C00LXRgiDQvdCw0YXQvtC00LjRgtGB0Y8g0LTQvtC60YPQvNC10L3RglxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSAtINGB0YXQtdC80LAg0L/QviDQutC+0YLQvtGA0L7QuSDQsdGD0LTQtdGCINGB0L7Qt9C00LDQvSDQtNC+0LrRg9C80LXQvdGCXG4gKiBAcGFyYW0ge29iamVjdH0gW2ZpZWxkc10gLSDQstGL0LHRgNCw0L3QvdGL0LUg0L/QvtC70Y8g0LIg0LTQvtC60YPQvNC10L3RgtC1ICjQvdC1INGA0LXQsNC70LjQt9C+0LLQsNC90L4pXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpbml0XSAtIGh5ZHJhdGUgZG9jdW1lbnQgLSDQvdCw0L/QvtC70L3QuNGC0Ywg0LTQvtC60YPQvNC10L3RgiDQtNCw0L3QvdGL0LzQuCAo0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINCyIGFwaS1jbGllbnQpXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnQgKCBkYXRhLCBjb2xsZWN0aW9uTmFtZSwgc2NoZW1hLCBmaWVsZHMsIGluaXQgKXtcbiAgdGhpcy5pc05ldyA9IHRydWU7XG5cbiAgLy8g0KHQvtC30LTQsNGC0Ywg0L/Rg9GB0YLQvtC5INC00L7QutGD0LzQtdC90YIg0YEg0YTQu9Cw0LPQvtC8IGluaXRcbiAgLy8gbmV3IFRlc3REb2N1bWVudCh0cnVlKTtcbiAgaWYgKCAnYm9vbGVhbicgPT09IHR5cGVvZiBkYXRhICl7XG4gICAgaW5pdCA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINGBINGE0LvQsNCz0L7QvCBpbml0XG4gIC8vIG5ldyBUZXN0RG9jdW1lbnQoeyB0ZXN0OiAnYm9vbScgfSwgdHJ1ZSk7XG4gIGlmICggJ2Jvb2xlYW4nID09PSB0eXBlb2YgY29sbGVjdGlvbk5hbWUgKXtcbiAgICBpbml0ID0gY29sbGVjdGlvbk5hbWU7XG4gICAgY29sbGVjdGlvbk5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyDQodC+0LfQtNCw0YLRjCDQv9GD0YHRgtC+0Lkg0LTQvtC60YPQvNC10L3RgiDQv9C+INGB0YXQtdC80LVcbiAgaWYgKCBkYXRhIGluc3RhbmNlb2YgU2NoZW1hICl7XG4gICAgc2NoZW1hID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcblxuICAgIGlmICggc2NoZW1hLm9wdGlvbnMuX2lkICl7XG4gICAgICBkYXRhID0geyBfaWQ6IG5ldyBPYmplY3RJZCgpIH07XG4gICAgfVxuXG4gIH0gZWxzZSB7XG4gICAgLy8g0J/RgNC4INGB0L7Qt9C00LDQvdC40LggRW1iZWRkZWREb2N1bWVudCwg0LIg0L3RkdC8INGD0LbQtSDQtdGB0YLRjCDRgdGF0LXQvNCwINC4INC10LzRgyDQvdC1INC90YPQttC10L0gX2lkXG4gICAgc2NoZW1hID0gdGhpcy5zY2hlbWEgfHwgc2NoZW1hO1xuICAgIC8vINCh0LPQtdC90LXRgNC40YDQvtCy0LDRgtGMIE9iamVjdElkLCDQtdGB0LvQuCDQvtC9INC+0YLRgdGD0YLRgdGC0LLRg9C10YIg0Lgg0LXQs9C+INGC0YDQtdCx0YPQtdGCINGB0YXQtdC80LBcbiAgICBpZiAoICF0aGlzLnNjaGVtYSAmJiBzY2hlbWEub3B0aW9ucy5faWQgKXtcbiAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuXG4gICAgICBpZiAoICFkYXRhLl9pZCApe1xuICAgICAgICBkYXRhLl9pZCA9IG5ldyBPYmplY3RJZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICggIXNjaGVtYSApe1xuICAgIC8vdG9kbzogdGhyb3cgbmV3IG1vbmdvb3NlLkVycm9yLk1pc3NpbmdTY2hlbWFFcnJvcihuYW1lKTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCfQndC10LvRjNC30Y8g0YHQvtC30LTQsNCy0LDRgtGMINC00L7QutGD0LzQtdC90YIg0LHQtdC3INGB0YXQtdC80YsnKTtcbiAgfVxuXG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICB0aGlzLmNvbGxlY3Rpb24gPSBzdG9yYWdlWyBjb2xsZWN0aW9uTmFtZSBdO1xuICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG5cbiAgaWYgKCB0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBpZiAoIGRhdGEgPT0gbnVsbCB8fCAhZGF0YS5faWQgKXtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ9CU0LvRjyDQv9C+0LzQtdGJ0LXQvdC40Y8g0LIg0LrQvtC70LvQtdC60YbQuNGOINC90LXQvtCx0YXQvtC00LjQvNC+LCDRh9GC0L7QsdGLINGDINC00L7QutGD0LzQtdC90YLQsCDQsdGL0LsgX2lkJyk7XG4gICAgfVxuICAgIC8vINCf0L7QvNC10YHRgtC40YLRjCDQtNC+0LrRg9C80LXQvdGCINCyINC60L7Qu9C70LXQutGG0LjRjlxuICAgIHRoaXMuY29sbGVjdGlvbi5kb2N1bWVudHNbIGRhdGEuX2lkIF0gPSB0aGlzO1xuICB9XG5cbiAgdGhpcy4kX18gPSBuZXcgSW50ZXJuYWxDYWNoZTtcbiAgdGhpcy4kX18uc3RyaWN0TW9kZSA9IHNjaGVtYS5vcHRpb25zICYmIHNjaGVtYS5vcHRpb25zLnN0cmljdDtcbiAgdGhpcy4kX18uc2VsZWN0ZWQgPSBmaWVsZHM7XG5cbiAgdmFyIHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkUGF0aHMoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXF1aXJlZC5sZW5ndGg7ICsraSkge1xuICAgIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnJlcXVpcmUoIHJlcXVpcmVkW2ldICk7XG4gIH1cblxuICB0aGlzLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgdGhpcy5fZG9jID0gdGhpcy4kX19idWlsZERvYyggZGF0YSwgaW5pdCApO1xuXG4gIGlmICggaW5pdCApe1xuICAgIHRoaXMuaW5pdCggZGF0YSApO1xuICB9IGVsc2UgaWYgKCBkYXRhICkge1xuICAgIHRoaXMuc2V0KCBkYXRhLCB1bmRlZmluZWQsIHRydWUgKTtcbiAgfVxuXG4gIC8vIGFwcGx5IG1ldGhvZHNcbiAgZm9yICggdmFyIG0gaW4gc2NoZW1hLm1ldGhvZHMgKXtcbiAgICB0aGlzWyBtIF0gPSBzY2hlbWEubWV0aG9kc1sgbSBdO1xuICB9XG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICggdmFyIHMgaW4gc2NoZW1hLnN0YXRpY3MgKXtcbiAgICB0aGlzWyBzIF0gPSBzY2hlbWEuc3RhdGljc1sgcyBdO1xuICB9XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5fX3Byb3RvX18gPSBFdmVudHMucHJvdG90eXBlO1xuXG4vKipcbiAqIFRoZSBkb2N1bWVudHMgc2NoZW1hLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAcHJvcGVydHkgc2NoZW1hXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zY2hlbWE7XG5cbi8qKlxuICogQm9vbGVhbiBmbGFnIHNwZWNpZnlpbmcgaWYgdGhlIGRvY3VtZW50IGlzIG5ldy5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IGlzTmV3XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc05ldztcblxuLyoqXG4gKiBUaGUgc3RyaW5nIHZlcnNpb24gb2YgdGhpcyBkb2N1bWVudHMgX2lkLlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIFRoaXMgZ2V0dGVyIGV4aXN0cyBvbiBhbGwgZG9jdW1lbnRzIGJ5IGRlZmF1bHQuIFRoZSBnZXR0ZXIgY2FuIGJlIGRpc2FibGVkIGJ5IHNldHRpbmcgdGhlIGBpZGAgW29wdGlvbl0oL2RvY3MvZ3VpZGUuaHRtbCNpZCkgb2YgaXRzIGBTY2hlbWFgIHRvIGZhbHNlIGF0IGNvbnN0cnVjdGlvbiB0aW1lLlxuICpcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgaWQ6IGZhbHNlIH0pO1xuICpcbiAqIEBhcGkgcHVibGljXG4gKiBAc2VlIFNjaGVtYSBvcHRpb25zIC9kb2NzL2d1aWRlLmh0bWwjb3B0aW9uc1xuICogQHByb3BlcnR5IGlkXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pZDtcblxuLyoqXG4gKiBIYXNoIGNvbnRhaW5pbmcgY3VycmVudCB2YWxpZGF0aW9uIGVycm9ycy5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHByb3BlcnR5IGVycm9yc1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZXJyb3JzO1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgZGVmYXVsdCBkb2Mgc3RydWN0dXJlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtCb29sZWFufSBbc2tpcElkXVxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2J1aWxkRG9jXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2J1aWxkRG9jID0gZnVuY3Rpb24gKCBvYmosIHNraXBJZCApIHtcbiAgdmFyIGRvYyA9IHt9XG4gICAgLCBzZWxmID0gdGhpcztcblxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyggdGhpcy5zY2hlbWEucGF0aHMgKVxuICAgICwgcGxlbiA9IHBhdGhzLmxlbmd0aFxuICAgICwgaWkgPSAwO1xuXG4gIGZvciAoIDsgaWkgPCBwbGVuOyArK2lpICkge1xuICAgIHZhciBwID0gcGF0aHNbaWldO1xuXG4gICAgaWYgKCAnX2lkJyA9PSBwICkge1xuICAgICAgaWYgKCBza2lwSWQgKSBjb250aW51ZTtcbiAgICAgIGlmICggb2JqICYmICdfaWQnIGluIG9iaiApIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB0eXBlID0gdGhpcy5zY2hlbWEucGF0aHNbIHAgXVxuICAgICAgLCBwYXRoID0gcC5zcGxpdCgnLicpXG4gICAgICAsIGxlbiA9IHBhdGgubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxXG4gICAgICAsIGRvY18gPSBkb2NcbiAgICAgICwgaSA9IDA7XG5cbiAgICBmb3IgKCA7IGkgPCBsZW47ICsraSApIHtcbiAgICAgIHZhciBwaWVjZSA9IHBhdGhbIGkgXVxuICAgICAgICAsIGRlZmF1bHRWYWw7XG5cbiAgICAgIGlmICggaSA9PT0gbGFzdCApIHtcbiAgICAgICAgZGVmYXVsdFZhbCA9IHR5cGUuZ2V0RGVmYXVsdCggc2VsZiwgdHJ1ZSApO1xuXG4gICAgICAgIGlmICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRlZmF1bHRWYWwgKSB7XG4gICAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWw7XG4gICAgICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuZGVmYXVsdCggcCApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkb2M7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBkb2N1bWVudCB3aXRob3V0IHNldHRlcnMgb3IgbWFya2luZyBhbnl0aGluZyBtb2RpZmllZC5cbiAqXG4gKiBDYWxsZWQgaW50ZXJuYWxseSBhZnRlciBhIGRvY3VtZW50IGlzIHJldHVybmVkIGZyb20gc2VydmVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIGRvY3VtZW50IHJldHVybmVkIGJ5IHNlcnZlclxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCBkYXRhICkge1xuICB0aGlzLmlzTmV3ID0gZmFsc2U7XG5cbiAgLy90b2RvOiDRgdC00LXRgdGMINCy0YHRkSDQuNC30LzQtdC90LjRgtGB0Y8sINGB0LzQvtGC0YDQtdGC0Ywg0LrQvtC80LzQtdC90YIg0LzQtdGC0L7QtNCwIHRoaXMucG9wdWxhdGVkXG4gIC8vIGhhbmRsZSBkb2NzIHdpdGggcG9wdWxhdGVkIHBhdGhzXG4gIC8qaWYgKCBkb2MuX2lkICYmIG9wdHMgJiYgb3B0cy5wb3B1bGF0ZWQgJiYgb3B0cy5wb3B1bGF0ZWQubGVuZ3RoICkge1xuICAgIHZhciBpZCA9IFN0cmluZyggZG9jLl9pZCApO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0cy5wb3B1bGF0ZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBpdGVtID0gb3B0cy5wb3B1bGF0ZWRbIGkgXTtcbiAgICAgIHRoaXMucG9wdWxhdGVkKCBpdGVtLnBhdGgsIGl0ZW0uX2RvY3NbaWRdLCBpdGVtICk7XG4gICAgfVxuICB9Ki9cblxuICBpbml0KCB0aGlzLCBkYXRhLCB0aGlzLl9kb2MgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qIVxuICogSW5pdCBoZWxwZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNlbGYgZG9jdW1lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogcmF3IHNlcnZlciBkb2NcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2Mgb2JqZWN0IHdlIGFyZSBpbml0aWFsaXppbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBpbml0IChzZWxmLCBvYmosIGRvYywgcHJlZml4KSB7XG4gIHByZWZpeCA9IHByZWZpeCB8fCAnJztcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoXG4gICAgLCBzY2hlbWFcbiAgICAsIHBhdGhcbiAgICAsIGk7XG5cbiAgd2hpbGUgKGxlbi0tKSB7XG4gICAgaSA9IGtleXNbbGVuXTtcbiAgICBwYXRoID0gcHJlZml4ICsgaTtcbiAgICBzY2hlbWEgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFzY2hlbWEgJiYgXy5pc1BsYWluT2JqZWN0KCBvYmpbIGkgXSApICYmXG4gICAgICAgICghb2JqW2ldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IG9ialtpXS5jb25zdHJ1Y3Rvci5uYW1lKSkge1xuICAgICAgLy8gYXNzdW1lIG5lc3RlZCBvYmplY3RcbiAgICAgIGlmICghZG9jW2ldKSBkb2NbaV0gPSB7fTtcbiAgICAgIGluaXQoc2VsZiwgb2JqW2ldLCBkb2NbaV0sIHBhdGggKyAnLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW2ldID09PSBudWxsKSB7XG4gICAgICAgIGRvY1tpXSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKG9ialtpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBvYnNlcnZhYmxlID0ga28uZ2V0T2JzZXJ2YWJsZSggc2VsZiwgcGF0aCApO1xuXG4gICAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAgICBzZWxmLiRfX3RyeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG9jW2ldID0gc2NoZW1hLmNhc3Qob2JqW2ldLCBzZWxmLCB0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb2NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyDQo9GB0YLQsNC90L7QstC40YLRjCDQvdCw0YfQsNC70YzQvdC+0LUg0LfQvdCw0YfQtdC90LjQtVxuICAgICAgICBvYnNlcnZhYmxlICYmIG9ic2VydmFibGUoIGRvY1tpXSApO1xuICAgICAgfVxuICAgICAgLy8gbWFyayBhcyBoeWRyYXRlZFxuICAgICAgc2VsZi4kX18uYWN0aXZlUGF0aHMuaW5pdChwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHBhdGgsIG9yIG1hbnkgcGF0aHMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIC8vIHBhdGgsIHZhbHVlXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSlcbiAqXG4gKiAgICAgLy8gb2JqZWN0XG4gKiAgICAgZG9jLnNldCh7XG4gKiAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICwgcGF0aDIgOiB7XG4gKiAgICAgICAgICAgIHBhdGggIDogdmFsdWVcbiAqICAgICAgICAgfVxuICogICAgIH0pXG4gKlxuICogICAgIC8vIG9ubHktdGhlLWZseSBjYXN0IHRvIG51bWJlclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIE51bWJlcilcbiAqXG4gKiAgICAgLy8gb25seS10aGUtZmx5IGNhc3QgdG8gc3RyaW5nXG4gKiAgICAgZG9jLnNldChwYXRoLCB2YWx1ZSwgU3RyaW5nKVxuICpcbiAqICAgICAvLyBjaGFuZ2luZyBzdHJpY3QgbW9kZSBiZWhhdmlvclxuICogICAgIGRvYy5zZXQocGF0aCwgdmFsdWUsIHsgc3RyaWN0OiBmYWxzZSB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHBhdGggcGF0aCBvciBvYmplY3Qgb2Yga2V5L3ZhbHMgdG8gc2V0XG4gKiBAcGFyYW0ge01peGVkfSB2YWwgdGhlIHZhbHVlIHRvIHNldFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcnxldGMuLn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIFwib24tdGhlLWZseVwiIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3B0aW9uYWxseSBzcGVjaWZ5IG9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGJlaGF2aW9yIG9mIHRoZSBzZXRcbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGF0aCwgdmFsLCB0eXBlLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlICYmICdPYmplY3QnID09IHR5cGUuY29uc3RydWN0b3IubmFtZSkge1xuICAgIG9wdGlvbnMgPSB0eXBlO1xuICAgIHR5cGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YXIgbWVyZ2UgPSBvcHRpb25zICYmIG9wdGlvbnMubWVyZ2VcbiAgICAsIGFkaG9jID0gdHlwZSAmJiB0cnVlICE9PSB0eXBlXG4gICAgLCBjb25zdHJ1Y3RpbmcgPSB0cnVlID09PSB0eXBlXG4gICAgLCBhZGhvY3M7XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMgJiYgJ3N0cmljdCcgaW4gb3B0aW9uc1xuICAgID8gb3B0aW9ucy5zdHJpY3RcbiAgICA6IHRoaXMuJF9fLnN0cmljdE1vZGU7XG5cbiAgaWYgKGFkaG9jKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgcGF0aCkge1xuICAgIC8vIG5ldyBEb2N1bWVudCh7IGtleTogdmFsIH0pXG5cbiAgICBpZiAobnVsbCA9PT0gcGF0aCB8fCB1bmRlZmluZWQgPT09IHBhdGgpIHtcbiAgICAgIHZhciBfdGVtcCA9IHBhdGg7XG4gICAgICBwYXRoID0gdmFsO1xuICAgICAgdmFsID0gX3RlbXA7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHByZWZpeCA9IHZhbFxuICAgICAgICA/IHZhbCArICcuJ1xuICAgICAgICA6ICcnO1xuXG4gICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIERvY3VtZW50KSBwYXRoID0gcGF0aC5fZG9jO1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGgpXG4gICAgICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgICAgICwgcGF0aHR5cGVcbiAgICAgICAgLCBrZXk7XG5cblxuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBwYXRodHlwZSA9IHRoaXMuc2NoZW1hLnBhdGhUeXBlKHByZWZpeCArIGtleSk7XG4gICAgICAgIGlmIChudWxsICE9IHBhdGhba2V5XVxuICAgICAgICAgICAgLy8gbmVlZCB0byBrbm93IGlmIHBsYWluIG9iamVjdCAtIG5vIEJ1ZmZlciwgT2JqZWN0SWQsIHJlZiwgZXRjXG4gICAgICAgICAgICAmJiBfLmlzUGxhaW5PYmplY3QocGF0aFtrZXldKVxuICAgICAgICAgICAgJiYgKCAhcGF0aFtrZXldLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IHBhdGhba2V5XS5jb25zdHJ1Y3Rvci5uYW1lIClcbiAgICAgICAgICAgICYmICd2aXJ0dWFsJyAhPSBwYXRodHlwZVxuICAgICAgICAgICAgJiYgISggdGhpcy4kX19wYXRoKCBwcmVmaXggKyBrZXkgKSBpbnN0YW5jZW9mIE1peGVkU2NoZW1hIClcbiAgICAgICAgICAgICYmICEoIHRoaXMuc2NoZW1hLnBhdGhzW2tleV0gJiYgdGhpcy5zY2hlbWEucGF0aHNba2V5XS5vcHRpb25zLnJlZiApXG4gICAgICAgICAgKXtcblxuICAgICAgICAgIHRoaXMuc2V0KHBhdGhba2V5XSwgcHJlZml4ICsga2V5LCBjb25zdHJ1Y3RpbmcpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgaWYgKCdyZWFsJyA9PT0gcGF0aHR5cGUgfHwgJ3ZpcnR1YWwnID09PSBwYXRodHlwZSkge1xuICAgICAgICAgICAgdGhpcy5zZXQocHJlZml4ICsga2V5LCBwYXRoW2tleV0sIGNvbnN0cnVjdGluZyk7XG5cbiAgICAgICAgICB9IGVsc2UgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaWVsZCBgXCIgKyBrZXkgKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkICE9PSBwYXRoW2tleV0pIHtcbiAgICAgICAgICB0aGlzLnNldChwcmVmaXggKyBrZXksIHBhdGhba2V5XSwgY29uc3RydWN0aW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICAvLyBlbnN1cmUgX3N0cmljdCBpcyBob25vcmVkIGZvciBvYmogcHJvcHNcbiAgLy8gZG9jc2NoZW1hID0gbmV3IFNjaGVtYSh7IHBhdGg6IHsgbmVzdDogJ3N0cmluZycgfX0pXG4gIC8vIGRvYy5zZXQoJ3BhdGgnLCBvYmopO1xuICB2YXIgcGF0aFR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoVHlwZShwYXRoKTtcbiAgaWYgKCduZXN0ZWQnID09IHBhdGhUeXBlICYmIHZhbCAmJiBfLmlzUGxhaW5PYmplY3QodmFsKSAmJlxuICAgICAgKCF2YWwuY29uc3RydWN0b3IgfHwgJ09iamVjdCcgPT0gdmFsLmNvbnN0cnVjdG9yLm5hbWUpKSB7XG4gICAgaWYgKCFtZXJnZSkgdGhpcy5zZXRWYWx1ZShwYXRoLCBudWxsKTtcbiAgICB0aGlzLnNldCh2YWwsIHBhdGgsIGNvbnN0cnVjdGluZyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgc2NoZW1hO1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIHZhciBzdWJwYXRoO1xuXG4gIGlmICgnYWRob2NPclVuZGVmaW5lZCcgPT0gcGF0aFR5cGUgJiYgc3RyaWN0KSB7XG5cbiAgICAvLyBjaGVjayBmb3Igcm9vdHMgdGhhdCBhcmUgTWl4ZWQgdHlwZXNcbiAgICB2YXIgbWl4ZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSsxKS5qb2luKCcuJyk7XG4gICAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS5wYXRoKHN1YnBhdGgpO1xuICAgICAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIE1peGVkKSB7XG4gICAgICAgIC8vIGFsbG93IGNoYW5nZXMgdG8gc3ViIHBhdGhzIG9mIG1peGVkIHR5cGVzXG4gICAgICAgIG1peGVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtaXhlZCkge1xuICAgICAgaWYgKCd0aHJvdycgPT0gc3RyaWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpZWxkIGBcIiArIHBhdGggKyBcImAgaXMgbm90IGluIHNjaGVtYS5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgfSBlbHNlIGlmICgndmlydHVhbCcgPT0gcGF0aFR5cGUpIHtcbiAgICBzY2hlbWEgPSB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKTtcbiAgICBzY2hlbWEuYXBwbHlTZXR0ZXJzKHZhbCwgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgc2NoZW1hID0gdGhpcy4kX19wYXRoKHBhdGgpO1xuICB9XG5cbiAgdmFyIHBhdGhUb01hcms7XG5cbiAgLy8gV2hlbiB1c2luZyB0aGUgJHNldCBvcGVyYXRvciB0aGUgcGF0aCB0byB0aGUgZmllbGQgbXVzdCBhbHJlYWR5IGV4aXN0LlxuICAvLyBFbHNlIG1vbmdvZGIgdGhyb3dzOiBcIkxFRlRfU1VCRklFTEQgb25seSBzdXBwb3J0cyBPYmplY3RcIlxuXG4gIGlmIChwYXJ0cy5sZW5ndGggPD0gMSkge1xuICAgIHBhdGhUb01hcmsgPSBwYXRoO1xuICB9IGVsc2Uge1xuICAgIGZvciAoIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kgKSB7XG4gICAgICBzdWJwYXRoID0gcGFydHMuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKTtcbiAgICAgIGlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQoc3VicGF0aCkgLy8gZWFybGllciBwcmVmaXhlcyB0aGF0IGFyZSBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmtlZCBhcyBkaXJ0eSBoYXZlIHByZWNlZGVuY2VcbiAgICAgICAgICB8fCB0aGlzLmdldChzdWJwYXRoKSA9PT0gbnVsbCkge1xuICAgICAgICBwYXRoVG9NYXJrID0gc3VicGF0aDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXRoVG9NYXJrKSBwYXRoVG9NYXJrID0gcGF0aDtcbiAgfVxuXG4gIC8vIGlmIHRoaXMgZG9jIGlzIGJlaW5nIGNvbnN0cnVjdGVkIHdlIHNob3VsZCBub3QgdHJpZ2dlciBnZXR0ZXJzXG4gIHZhciBwcmlvclZhbCA9IGNvbnN0cnVjdGluZ1xuICAgID8gdW5kZWZpbmVkXG4gICAgOiB0aGlzLmdldFZhbHVlKHBhdGgpO1xuXG4gIGlmICghc2NoZW1hIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgdGhpcy4kX19zZXQocGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNob3VsZFNldCA9IHRoaXMuJF9fdHJ5KGZ1bmN0aW9uKCl7XG4gICAgdmFsID0gc2NoZW1hLmFwcGx5U2V0dGVycyh2YWwsIHNlbGYsIGZhbHNlLCBwcmlvclZhbCk7XG4gIH0pO1xuXG4gIGlmIChzaG91bGRTZXQpIHtcbiAgICB0aGlzLiRfX3NldChwYXRoVG9NYXJrLCBwYXRoLCBjb25zdHJ1Y3RpbmcsIHBhcnRzLCBzY2hlbWEsIHZhbCwgcHJpb3JWYWwpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSBzaG91bGQgbWFyayB0aGlzIGNoYW5nZSBhcyBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3Nob3VsZE1vZGlmeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19zaG91bGRNb2RpZnkgPSBmdW5jdGlvbiAoXG4gICAgcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsKSB7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHJldHVybiB0cnVlO1xuICAvKmlmICh0aGlzLmlzRGlyZWN0TW9kaWZpZWQocGF0aFRvTWFyaykpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSovXG5cbiAgaWYgKCB1bmRlZmluZWQgPT09IHZhbCAmJiAhdGhpcy5pc1NlbGVjdGVkKHBhdGgpICkge1xuICAgIC8vIHdoZW4gYSBwYXRoIGlzIG5vdCBzZWxlY3RlZCBpbiBhIHF1ZXJ5LCBpdHMgaW5pdGlhbFxuICAgIC8vIHZhbHVlIHdpbGwgYmUgdW5kZWZpbmVkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsICYmIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQpIHtcbiAgICAvLyB3ZSdyZSBqdXN0IHVuc2V0dGluZyB0aGUgZGVmYXVsdCB2YWx1ZSB3aGljaCB3YXMgbmV2ZXIgc2F2ZWRcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXV0aWxzLmRlZXBFcXVhbCh2YWwsIHByaW9yVmFsIHx8IHRoaXMuZ2V0KHBhdGgpKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy/RgtC10YHRgiDQvdC1INC/0YDQvtGF0L7QtNC40YIg0LjQty3Qt9CwINC90LDQu9C40YfQuNGPINC70LjRiNC90LXQs9C+INC/0L7Qu9GPINCyIHN0YXRlcy5kZWZhdWx0IChjb21tZW50cylcbiAgLy8g0J3QsCDRgdCw0LzQvtC8INC00LXQu9C1INC/0L7Qu9C1INCy0YDQvtC00LUg0Lgg0L3QtSDQu9C40YjQvdC10LVcbiAgLy9jb25zb2xlLmluZm8oIHBhdGgsIHBhdGggaW4gdGhpcy4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLmRlZmF1bHQgKTtcbiAgLy9jb25zb2xlLmxvZyggdGhpcy4kX18uYWN0aXZlUGF0aHMgKTtcblxuICAvLyDQmtC+0LPQtNCwINC80Ysg0YPRgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0YLQsNC60L7QtSDQttC1INC30L3QsNGH0LXQvdC40LUg0LrQsNC6IGRlZmF1bHRcbiAgLy8g0J3QtSDQv9C+0L3Rj9GC0L3QviDQt9Cw0YfQtdC8INC80LDQvdCz0YPRgdGCINC10LPQviDQvtCx0L3QvtCy0LvRj9C7XG4gIC8qaWYgKCFjb25zdHJ1Y3RpbmcgJiZcbiAgICAgIG51bGwgIT0gdmFsICYmXG4gICAgICBwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0ICYmXG4gICAgICB1dGlscy5kZWVwRXF1YWwodmFsLCBzY2hlbWEuZ2V0RGVmYXVsdCh0aGlzLCBjb25zdHJ1Y3RpbmcpKSApIHtcblxuICAgIC8vY29uc29sZS5sb2coIHBhdGhUb01hcmssIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkgKTtcblxuICAgIC8vIGEgcGF0aCB3aXRoIGEgZGVmYXVsdCB3YXMgJHVuc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAvLyBhbmQgdGhlIHVzZXIgaXMgc2V0dGluZyBpdCB0byB0aGUgc2FtZSB2YWx1ZSBhZ2FpblxuICAgIHJldHVybiB0cnVlO1xuICB9Ki9cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIGFjdHVhbCBzZXR0aW5nIG9mIHRoZSB2YWx1ZSBhbmQgbWFya2luZyB0aGUgcGF0aCBtb2RpZmllZCBpZiBhcHByb3ByaWF0ZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fc2V0XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldCA9IGZ1bmN0aW9uICggcGF0aFRvTWFyaywgcGF0aCwgY29uc3RydWN0aW5nLCBwYXJ0cywgc2NoZW1hLCB2YWwsIHByaW9yVmFsICkge1xuICB2YXIgc2hvdWxkTW9kaWZ5ID0gdGhpcy4kX19zaG91bGRNb2RpZnkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICBpZiAoc2hvdWxkTW9kaWZ5KSB7XG4gICAgdGhpcy5tYXJrTW9kaWZpZWQocGF0aFRvTWFyaywgdmFsKTtcbiAgfVxuXG4gIHZhciBvYmogPSB0aGlzLl9kb2NcbiAgICAsIGkgPSAwXG4gICAgLCBsID0gcGFydHMubGVuZ3RoO1xuXG4gIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIG5leHQgPSBpICsgMVxuICAgICAgLCBsYXN0ID0gbmV4dCA9PT0gbDtcblxuICAgIGlmICggbGFzdCApIHtcbiAgICAgIG9ialtwYXJ0c1tpXV0gPSB2YWw7XG5cbiAgICAgIHZhciBvYnNlcnZhYmxlID0ga28uZ2V0T2JzZXJ2YWJsZSggdGhpcywgcGF0aCApO1xuXG4gICAgICAvL1RPRE86INCY0L3QvtCz0LTQsCBvYnNlcnZhYmxlID09PSBudWxsLCDQv9C+0L3Rj9GC0Ywg0L/QvtGH0LXQvNGDINGC0LDQuiDQv9C+0YDQuNGB0YXQvtC00LjRgiDQuCDQuNGB0L/RgNCw0LLQuNGC0Ywg0Y3RgtC+XG4gICAgICAvL2NvbnNvbGUubG9nKCBwYXRoLCBvYnNlcnZhYmxlICk7XG5cbiAgICAgIC8vINCe0LHQvdC+0LLQuNC8IG9ic2VydmFibGUgKNGH0YLQvtCx0Ysg0YDQsNCx0L7RgtCw0LvQuCDQv9GA0LjQstGP0LfQutC4KVxuICAgICAgb2JzZXJ2YWJsZSAmJiBvYnNlcnZhYmxlKCB2YWwgKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2JqW3BhcnRzW2ldXSAmJiAnT2JqZWN0JyA9PT0gb2JqW3BhcnRzW2ldXS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICAgIG9iaiA9IG9ialtwYXJ0c1tpXV07XG5cbiAgICAgIH0gZWxzZSBpZiAob2JqW3BhcnRzW2ldXSAmJiAnRW1iZWRkZWREb2N1bWVudCcgPT09IG9ialtwYXJ0c1tpXV0uY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2UgaWYgKG9ialtwYXJ0c1tpXV0gJiYgQXJyYXkuaXNBcnJheShvYmpbcGFydHNbaV1dKSkge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvYmpbcGFydHNbaV1dID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYSByYXcgdmFsdWUgZnJvbSBhIHBhdGggKG5vIGdldHRlcnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUocGF0aCwgdGhpcy5fZG9jKTtcbn07XG5cbi8qKlxuICogU2V0cyBhIHJhdyB2YWx1ZSBmb3IgYSBwYXRoIChubyBjYXN0aW5nLCBzZXR0ZXJzLCB0cmFuc2Zvcm1hdGlvbnMpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCB2YWx1ZSkge1xuICB1dGlscy5zZXRWYWx1ZShwYXRoLCB2YWx1ZSwgdGhpcy5fZG9jKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGEgcGF0aC5cbiAqXG4gKiAjIyMjRXhhbXBsZVxuICpcbiAqICAgICAvLyBwYXRoXG4gKiAgICAgZG9jLmdldCgnYWdlJykgLy8gNDdcbiAqXG4gKiAgICAgLy8gZHluYW1pYyBjYXN0aW5nIHRvIGEgc3RyaW5nXG4gKiAgICAgZG9jLmdldCgnYWdlJywgU3RyaW5nKSAvLyBcIjQ3XCJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtTY2hlbWF8U3RyaW5nfE51bWJlcn0gW3R5cGVdIG9wdGlvbmFsbHkgc3BlY2lmeSBhIHR5cGUgZm9yIG9uLXRoZS1mbHkgYXR0cmlidXRlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXRoLCB0eXBlKSB7XG4gIHZhciBhZGhvY3M7XG4gIGlmICh0eXBlKSB7XG4gICAgYWRob2NzID0gdGhpcy4kX18uYWRob2NQYXRocyB8fCAodGhpcy4kX18uYWRob2NQYXRocyA9IHt9KTtcbiAgICBhZGhvY3NbcGF0aF0gPSBTY2hlbWEuaW50ZXJwcmV0QXNUeXBlKHBhdGgsIHR5cGUpO1xuICB9XG5cbiAgdmFyIHNjaGVtYSA9IHRoaXMuJF9fcGF0aChwYXRoKSB8fCB0aGlzLnNjaGVtYS52aXJ0dWFscGF0aChwYXRoKVxuICAgICwgcGllY2VzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgLCBvYmogPSB0aGlzLl9kb2M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwaWVjZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkID09PSBvYmogfHwgbnVsbCA9PT0gb2JqXG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBvYmpbcGllY2VzW2ldXTtcbiAgfVxuXG4gIGlmIChzY2hlbWEpIHtcbiAgICBvYmogPSBzY2hlbWEuYXBwbHlHZXR0ZXJzKG9iaiwgdGhpcyk7XG4gIH1cblxuICB2YXIgb2JzZXJ2YWJsZSA9IGtvLmdldE9ic2VydmFibGUoIHRoaXMsIHBhdGggKTtcbiAgb2JzZXJ2YWJsZSAmJiBvYnNlcnZhYmxlKCk7XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2NoZW1hdHlwZSBmb3IgdGhlIGdpdmVuIGBwYXRoYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3BhdGhcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBhZGhvY3MgPSB0aGlzLiRfXy5hZGhvY1BhdGhzXG4gICAgLCBhZGhvY1R5cGUgPSBhZGhvY3MgJiYgYWRob2NzW3BhdGhdO1xuXG4gIGlmIChhZGhvY1R5cGUpIHtcbiAgICByZXR1cm4gYWRob2NUeXBlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcmtzIHRoZSBwYXRoIGFzIGhhdmluZyBwZW5kaW5nIGNoYW5nZXMgdG8gd3JpdGUgdG8gdGhlIGRiLlxuICpcbiAqIF9WZXJ5IGhlbHBmdWwgd2hlbiB1c2luZyBbTWl4ZWRdKC4vc2NoZW1hdHlwZXMuaHRtbCNtaXhlZCkgdHlwZXMuX1xuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKiAgICAgZG9jLnNhdmUoKSAvLyBjaGFuZ2VzIHRvIG1peGVkLnR5cGUgYXJlIG5vdyBwZXJzaXN0ZWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aCB0byBtYXJrIG1vZGlmaWVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgdGhpcy4kX18uYWN0aXZlUGF0aHMubW9kaWZ5KHBhdGgpO1xufTtcblxuLyoqXG4gKiBDYXRjaGVzIGVycm9ycyB0aGF0IG9jY3VyIGR1cmluZyBleGVjdXRpb24gb2YgYGZuYCBhbmQgc3RvcmVzIHRoZW0gdG8gbGF0ZXIgYmUgcGFzc2VkIHdoZW4gYHNhdmUoKWAgaXMgZXhlY3V0ZWQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV0gdGhlIHNjb3BlIHdpdGggd2hpY2ggdG8gY2FsbCBmblxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3RyeVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX190cnkgPSBmdW5jdGlvbiAoZm4sIHNjb3BlKSB7XG4gIHZhciByZXM7XG4gIHRyeSB7XG4gICAgZm4uY2FsbChzY29wZSk7XG4gICAgcmVzID0gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRoaXMuJF9fZXJyb3IoZSk7XG4gICAgcmVzID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbGlzdCBvZiBwYXRocyB0aGF0IGhhdmUgYmVlbiBtb2RpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5tb2RpZmllZFBhdGhzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZGlyZWN0TW9kaWZpZWRQYXRocyA9IE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5tb2RpZnkpO1xuXG4gIHJldHVybiBkaXJlY3RNb2RpZmllZFBhdGhzLnJlZHVjZShmdW5jdGlvbiAobGlzdCwgcGF0aCkge1xuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICByZXR1cm4gbGlzdC5jb25jYXQocGFydHMucmVkdWNlKGZ1bmN0aW9uIChjaGFpbnMsIHBhcnQsIGkpIHtcbiAgICAgIHJldHVybiBjaGFpbnMuY29uY2F0KHBhcnRzLnNsaWNlKDAsIGkpLmNvbmNhdChwYXJ0KS5qb2luKCcuJykpO1xuICAgIH0sIFtdKSk7XG4gIH0sIFtdKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoaXMgZG9jdW1lbnQgd2FzIG1vZGlmaWVkLCBlbHNlIGZhbHNlLlxuICpcbiAqIElmIGBwYXRoYCBpcyBnaXZlbiwgY2hlY2tzIGlmIGEgcGF0aCBvciBhbnkgZnVsbCBwYXRoIGNvbnRhaW5pbmcgYHBhdGhgIGFzIHBhcnQgb2YgaXRzIHBhdGggY2hhaW4gaGFzIGJlZW4gbW9kaWZpZWQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgZG9jLnNldCgnZG9jdW1lbnRzLjAudGl0bGUnLCAnY2hhbmdlZCcpO1xuICogICAgIGRvYy5pc01vZGlmaWVkKCkgICAgICAgICAgICAgICAgICAgIC8vIHRydWVcbiAqICAgICBkb2MuaXNNb2RpZmllZCgnZG9jdW1lbnRzJykgICAgICAgICAvLyB0cnVlXG4gKiAgICAgZG9jLmlzTW9kaWZpZWQoJ2RvY3VtZW50cy4wLnRpdGxlJykgLy8gdHJ1ZVxuICogICAgIGRvYy5pc0RpcmVjdE1vZGlmaWVkKCdkb2N1bWVudHMnKSAgIC8vIGZhbHNlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXRoXSBvcHRpb25hbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5pc01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGhcbiAgICA/ICEhfnRoaXMubW9kaWZpZWRQYXRocygpLmluZGV4T2YocGF0aClcbiAgICA6IHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnNvbWUoJ21vZGlmeScpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHBhdGhgIHdhcyBkaXJlY3RseSBzZXQgYW5kIG1vZGlmaWVkLCBlbHNlIGZhbHNlLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIGRvYy5zZXQoJ2RvY3VtZW50cy4wLnRpdGxlJywgJ2NoYW5nZWQnKTtcbiAqICAgICBkb2MuaXNEaXJlY3RNb2RpZmllZCgnZG9jdW1lbnRzLjAudGl0bGUnKSAvLyB0cnVlXG4gKiAgICAgZG9jLmlzRGlyZWN0TW9kaWZpZWQoJ2RvY3VtZW50cycpIC8vIGZhbHNlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNEaXJlY3RNb2RpZmllZCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHJldHVybiAocGF0aCBpbiB0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBwYXRoYCB3YXMgaW5pdGlhbGl6ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNJbml0ID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIChwYXRoIGluIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5pbml0KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGBwYXRoYCB3YXMgc2VsZWN0ZWQgaW4gdGhlIHNvdXJjZSBxdWVyeSB3aGljaCBpbml0aWFsaXplZCB0aGlzIGRvY3VtZW50LlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIFRoaW5nLmZpbmRPbmUoKS5zZWxlY3QoJ25hbWUnKS5leGVjKGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICogICAgICAgIGRvYy5pc1NlbGVjdGVkKCduYW1lJykgLy8gdHJ1ZVxuICogICAgICAgIGRvYy5pc1NlbGVjdGVkKCdhZ2UnKSAgLy8gZmFsc2VcbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuaXNTZWxlY3RlZCA9IGZ1bmN0aW9uIGlzU2VsZWN0ZWQgKHBhdGgpIHtcbiAgaWYgKHRoaXMuJF9fLnNlbGVjdGVkKSB7XG5cbiAgICBpZiAoJ19pZCcgPT09IHBhdGgpIHtcbiAgICAgIHJldHVybiAwICE9PSB0aGlzLiRfXy5zZWxlY3RlZC5faWQ7XG4gICAgfVxuXG4gICAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy4kX18uc2VsZWN0ZWQpXG4gICAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAgICwgaW5jbHVzaXZlID0gZmFsc2VcbiAgICAgICwgY3VyO1xuXG4gICAgaWYgKDEgPT09IGkgJiYgJ19pZCcgPT09IHBhdGhzWzBdKSB7XG4gICAgICAvLyBvbmx5IF9pZCB3YXMgc2VsZWN0ZWQuXG4gICAgICByZXR1cm4gMCA9PT0gdGhpcy4kX18uc2VsZWN0ZWQuX2lkO1xuICAgIH1cblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGN1ciA9IHBhdGhzW2ldO1xuICAgICAgaWYgKCdfaWQnID09IGN1cikgY29udGludWU7XG4gICAgICBpbmNsdXNpdmUgPSAhISB0aGlzLiRfXy5zZWxlY3RlZFtjdXJdO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBhdGggaW4gdGhpcy4kX18uc2VsZWN0ZWQpIHtcbiAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgfVxuXG4gICAgaSA9IHBhdGhzLmxlbmd0aDtcbiAgICB2YXIgcGF0aERvdCA9IHBhdGggKyAnLic7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjdXIgPSBwYXRoc1tpXTtcbiAgICAgIGlmICgnX2lkJyA9PSBjdXIpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoMCA9PT0gY3VyLmluZGV4T2YocGF0aERvdCkpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1c2l2ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKDAgPT09IHBhdGhEb3QuaW5kZXhPZihjdXIgKyAnLicpKSB7XG4gICAgICAgIHJldHVybiBpbmNsdXNpdmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICEgaW5jbHVzaXZlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGVzIHJlZ2lzdGVyZWQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYHByZWAgc2F2ZSBhbmQgaWYgYSB2YWxpZGF0aW9uIHJ1bGUgaXMgdmlvbGF0ZWQsIFtzYXZlXSgjbW9kZWxfTW9kZWwtc2F2ZSkgaXMgYWJvcnRlZCBhbmQgdGhlIGVycm9yIGlzIHJldHVybmVkIHRvIHlvdXIgYGNhbGxiYWNrYC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgZG9jLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGlmIChlcnIpIGhhbmRsZUVycm9yKGVycik7XG4gKiAgICAgICBlbHNlIC8vIHZhbGlkYXRpb24gcGFzc2VkXG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGVkIGFmdGVyIHZhbGlkYXRpb24gY29tcGxldGVzLCBwYXNzaW5nIGFuIGVycm9yIGlmIG9uZSBvY2N1cnJlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBvbmx5IHZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkcyB3aGVuIG5lY2Vzc2FyeVxuICB2YXIgcGF0aHMgPSBPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMucmVxdWlyZSkuZmlsdGVyKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKCFzZWxmLmlzU2VsZWN0ZWQocGF0aCkgJiYgIXNlbGYuaXNNb2RpZmllZChwYXRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9KTtcblxuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMuaW5pdCkpO1xuICBwYXRocyA9IHBhdGhzLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiRfXy5hY3RpdmVQYXRocy5zdGF0ZXMubW9kaWZ5KSk7XG4gIHBhdGhzID0gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHRoaXMuJF9fLmFjdGl2ZVBhdGhzLnN0YXRlcy5kZWZhdWx0KSk7XG5cbiAgaWYgKDAgPT09IHBhdGhzLmxlbmd0aCkge1xuICAgIGNvbXBsZXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgdmFsaWRhdGluZyA9IHt9XG4gICAgLCB0b3RhbCA9IDA7XG5cbiAgcGF0aHMuZm9yRWFjaCh2YWxpZGF0ZVBhdGgpO1xuICByZXR1cm4gdGhpcztcblxuICBmdW5jdGlvbiB2YWxpZGF0ZVBhdGggKHBhdGgpIHtcbiAgICBpZiAodmFsaWRhdGluZ1twYXRoXSkgcmV0dXJuO1xuXG4gICAgdmFsaWRhdGluZ1twYXRoXSA9IHRydWU7XG4gICAgdG90YWwrKztcblxuICAgIHV0aWxzLnNldEltbWVkaWF0ZShmdW5jdGlvbigpe1xuICAgICAgdmFyIHAgPSBzZWxmLnNjaGVtYS5wYXRoKHBhdGgpO1xuICAgICAgaWYgKCFwKSByZXR1cm4gLS10b3RhbCB8fCBjb21wbGV0ZSgpO1xuXG4gICAgICB2YXIgdmFsID0gc2VsZi5nZXRWYWx1ZShwYXRoKTtcbiAgICAgIHAuZG9WYWxpZGF0ZSh2YWwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHNlbGYuaW52YWxpZGF0ZShcbiAgICAgICAgICAgICAgcGF0aFxuICAgICAgICAgICAgLCBlcnJcbiAgICAgICAgICAgICwgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLywgdHJ1ZSAvLyBlbWJlZGRlZCBkb2NzXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC0tdG90YWwgfHwgY29tcGxldGUoKTtcbiAgICAgIH0sIHNlbGYpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGUgKCkge1xuICAgIHZhciBlcnIgPSBzZWxmLiRfXy52YWxpZGF0aW9uRXJyb3I7XG4gICAgc2VsZi4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICAgIGNiICYmIGNiKGVycik7XG4gIH1cbn07XG5cbi8qKlxuICogTWFya3MgYSBwYXRoIGFzIGludmFsaWQsIGNhdXNpbmcgdmFsaWRhdGlvbiB0byBmYWlsLlxuICpcbiAqIFRoZSBgZXJyb3JNc2dgIGFyZ3VtZW50IHdpbGwgYmVjb21lIHRoZSBtZXNzYWdlIG9mIHRoZSBgVmFsaWRhdGlvbkVycm9yYC5cbiAqXG4gKiBUaGUgYHZhbHVlYCBhcmd1bWVudCAoaWYgcGFzc2VkKSB3aWxsIGJlIGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgVmFsaWRhdGlvbkVycm9yLnZhbHVlYCBwcm9wZXJ0eS5cbiAqXG4gKiAgICAgZG9jLmludmFsaWRhdGUoJ3NpemUnLCAnbXVzdCBiZSBsZXNzIHRoYW4gMjAnLCAxNCk7XG5cbiAqICAgICBkb2MudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coZXJyKVxuICogICAgICAgLy8gcHJpbnRzXG4gKiAgICAgICB7IG1lc3NhZ2U6ICdWYWxpZGF0aW9uIGZhaWxlZCcsXG4gKiAgICAgICAgIG5hbWU6ICdWYWxpZGF0aW9uRXJyb3InLFxuICogICAgICAgICBlcnJvcnM6XG4gKiAgICAgICAgICB7IHNpemU6XG4gKiAgICAgICAgICAgICB7IG1lc3NhZ2U6ICdtdXN0IGJlIGxlc3MgdGhhbiAyMCcsXG4gKiAgICAgICAgICAgICAgIG5hbWU6ICdWYWxpZGF0b3JFcnJvcicsXG4gKiAgICAgICAgICAgICAgIHBhdGg6ICdzaXplJyxcbiAqICAgICAgICAgICAgICAgdHlwZTogJ3VzZXIgZGVmaW5lZCcsXG4gKiAgICAgICAgICAgICAgIHZhbHVlOiAxNCB9IH0gfVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIGZpZWxkIHRvIGludmFsaWRhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfEVycm9yfSBlcnJvck1zZyB0aGUgZXJyb3Igd2hpY2ggc3RhdGVzIHRoZSByZWFzb24gYHBhdGhgIHdhcyBpbnZhbGlkXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd8TnVtYmVyfGFueX0gdmFsdWUgb3B0aW9uYWwgaW52YWxpZCB2YWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLmludmFsaWRhdGUgPSBmdW5jdGlvbiAocGF0aCwgZXJyb3JNc2csIHZhbHVlKSB7XG4gIGlmICghdGhpcy4kX18udmFsaWRhdGlvbkVycm9yKSB7XG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gbmV3IFZhbGlkYXRpb25FcnJvcih0aGlzKTtcbiAgfVxuXG4gIGlmICghZXJyb3JNc2cgfHwgJ3N0cmluZycgPT09IHR5cGVvZiBlcnJvck1zZykge1xuICAgIGVycm9yTXNnID0gbmV3IFZhbGlkYXRvckVycm9yKHBhdGgsIGVycm9yTXNnLCAndXNlciBkZWZpbmVkJywgdmFsdWUpO1xuICB9XG5cbiAgaWYgKHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvciA9PSBlcnJvck1zZykgcmV0dXJuO1xuXG4gIHRoaXMuJF9fLnZhbGlkYXRpb25FcnJvci5lcnJvcnNbcGF0aF0gPSBlcnJvck1zZztcbn07XG5cbi8qKlxuICogUmVzZXRzIHRoZSBpbnRlcm5hbCBtb2RpZmllZCBzdGF0ZSBvZiB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQHJldHVybiB7RG9jdW1lbnR9XG4gKiBAbWV0aG9kICRfX3Jlc2V0XG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fcmVzZXQgPSBmdW5jdGlvbiByZXNldCAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRoc1xuICAubWFwKCdpbml0JywgJ21vZGlmeScsIGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIHNlbGYuZ2V0VmFsdWUoaSk7XG4gIH0pXG4gIC5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB2YWwgJiYgdmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICB9KVxuICAuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykgY29udGludWU7XG4gICAgICBkb2MuJF9fcmVzZXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsZWFyICdtb2RpZnknKCdkaXJ0eScpIGNhY2hlXG4gIHRoaXMuJF9fLmFjdGl2ZVBhdGhzLmNsZWFyKCdtb2RpZnknKTtcbiAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLmVycm9ycyA9IHVuZGVmaW5lZDtcbiAgLy9jb25zb2xlLmxvZyggc2VsZi4kX18uYWN0aXZlUGF0aHMuc3RhdGVzLnJlcXVpcmUgKTtcbiAgLy9UT0RPOiDRgtGD0YJcbiAgdGhpcy5zY2hlbWEucmVxdWlyZWRQYXRocygpLmZvckVhY2goZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5yZXF1aXJlKHBhdGgpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgZG9jdW1lbnRzIGRpcnR5IHBhdGhzIC8gdmFscy5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZGlydHlcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kaXJ0eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBhbGwgPSB0aGlzLiRfXy5hY3RpdmVQYXRocy5tYXAoJ21vZGlmeScsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIHsgcGF0aDogcGF0aFxuICAgICAgICAgICAsIHZhbHVlOiBzZWxmLmdldFZhbHVlKCBwYXRoIClcbiAgICAgICAgICAgLCBzY2hlbWE6IHNlbGYuJF9fcGF0aCggcGF0aCApIH07XG4gIH0pO1xuXG4gIC8vIFNvcnQgZGlydHkgcGF0aHMgaW4gYSBmbGF0IGhpZXJhcmNoeS5cbiAgYWxsLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gKGEucGF0aCA8IGIucGF0aCA/IC0xIDogKGEucGF0aCA+IGIucGF0aCA/IDEgOiAwKSk7XG4gIH0pO1xuXG4gIC8vIElnbm9yZSBcImZvby5hXCIgaWYgXCJmb29cIiBpcyBkaXJ0eSBhbHJlYWR5LlxuICB2YXIgbWluaW1hbCA9IFtdXG4gICAgLCBsYXN0UGF0aFxuICAgICwgdG9wO1xuXG4gIGFsbC5mb3JFYWNoKGZ1bmN0aW9uKCBpdGVtICl7XG4gICAgbGFzdFBhdGggPSBpdGVtLnBhdGggKyAnLic7XG4gICAgbWluaW1hbC5wdXNoKGl0ZW0pO1xuICAgIHRvcCA9IGl0ZW07XG4gIH0pO1xuXG4gIHRvcCA9IGxhc3RQYXRoID0gbnVsbDtcbiAgcmV0dXJuIG1pbmltYWw7XG59O1xuXG4vKiFcbiAqIENvbXBpbGVzIHNjaGVtYXMuXG4gKiAo0YPRgdGC0LDQvdC+0LLQuNGC0Ywg0LPQtdGC0YLQtdGA0Ysv0YHQtdGC0YLQtdGA0Ysg0L3QsCDQv9C+0LvRjyDQtNC+0LrRg9C80LXQvdGC0LApXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHNlbGYsIHRyZWUsIHByb3RvLCBwcmVmaXgpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0cmVlKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBsaW1iXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgbGltYiA9IHRyZWVba2V5XTtcblxuICAgIGRlZmluZShzZWxmXG4gICAgICAgICwga2V5XG4gICAgICAgICwgKCgnT2JqZWN0JyA9PT0gbGltYi5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhsaW1iKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAmJiAoIWxpbWIudHlwZSB8fCBsaW1iLnR5cGUudHlwZSlcbiAgICAgICAgICAgICAgID8gbGltYlxuICAgICAgICAgICAgICAgOiBudWxsKVxuICAgICAgICAsIHByb3RvXG4gICAgICAgICwgcHJlZml4XG4gICAgICAgICwga2V5cyk7XG4gIH1cbn1cblxuLyohXG4gKiBEZWZpbmVzIHRoZSBhY2Nlc3NvciBuYW1lZCBwcm9wIG9uIHRoZSBpbmNvbWluZyBwcm90b3R5cGUuXG4gKiDRgtCw0Lwg0LbQtSwg0L/QvtC70Y8g0LTQvtC60YPQvNC10L3RgtCwINGB0LTQtdC70LDQtdC8INC90LDQsdC70Y7QtNCw0LXQvNGL0LzQuFxuICovXG5mdW5jdGlvbiBkZWZpbmUgKHNlbGYsIHByb3AsIHN1YnByb3BzLCBwcm90b3R5cGUsIHByZWZpeCwga2V5cykge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBwYXRoID0gKHByZWZpeCA/IHByZWZpeCArICcuJyA6ICcnKSArIHByb3A7XG5cbiAgaWYgKHN1YnByb3BzKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAsIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVycylcbiAgICAgICAgICAgIHRoaXMuJF9fLmdldHRlcnMgPSB7fTtcblxuICAgICAgICAgIGlmICghdGhpcy4kX18uZ2V0dGVyc1twYXRoXSkge1xuICAgICAgICAgICAgdmFyIG5lc3RlZCA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIHNhdmUgc2NvcGUgZm9yIG5lc3RlZCBnZXR0ZXJzL3NldHRlcnNcbiAgICAgICAgICAgIGlmICghcHJlZml4KSBuZXN0ZWQuJF9fLnNjb3BlID0gdGhpcztcblxuICAgICAgICAgICAgLy8gc2hhZG93IGluaGVyaXRlZCBnZXR0ZXJzIGZyb20gc3ViLW9iamVjdHMgc29cbiAgICAgICAgICAgIC8vIHRoaW5nLm5lc3RlZC5uZXN0ZWQubmVzdGVkLi4uIGRvZXNuJ3Qgb2NjdXIgKGdoLTM2NilcbiAgICAgICAgICAgIHZhciBpID0gMFxuICAgICAgICAgICAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBmb3IgKDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICAgIC8vIG92ZXItd3JpdGUgdGhlIHBhcmVudHMgZ2V0dGVyIHdpdGhvdXQgdHJpZ2dlcmluZyBpdFxuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmVzdGVkLCBrZXlzW2ldLCB7XG4gICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSAgIC8vIEl0IGRvZXNuJ3Qgc2hvdyB1cC5cbiAgICAgICAgICAgICAgICAsIHdyaXRhYmxlOiB0cnVlICAgICAgLy8gV2UgY2FuIHNldCBpdCBsYXRlci5cbiAgICAgICAgICAgICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZSAgLy8gV2UgY2FuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBhZ2Fpbi5cbiAgICAgICAgICAgICAgICAsIHZhbHVlOiB1bmRlZmluZWQgICAgLy8gSXQgc2hhZG93cyBpdHMgcGFyZW50LlxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmVzdGVkLnRvT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQocGF0aCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb21waWxlKCBzZWxmLCBzdWJwcm9wcywgbmVzdGVkLCBwYXRoICk7XG4gICAgICAgICAgICB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdID0gbmVzdGVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB0aGlzLiRfXy5nZXR0ZXJzW3BhdGhdO1xuICAgICAgICB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICBpZiAodiBpbnN0YW5jZW9mIERvY3VtZW50KSB2ID0gdi50b09iamVjdCgpO1xuICAgICAgICAgIHJldHVybiAodGhpcy4kX18uc2NvcGUgfHwgdGhpcykuc2V0KCBwYXRoLCB2ICk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICB9IGVsc2Uge1xuICAgIHZhciBhbGxPYnNlcnZhYmxlc0Zvck9iamVjdCA9IGtvLmVzNS5nZXRBbGxPYnNlcnZhYmxlc0Zvck9iamVjdCggc2VsZiwgdHJ1ZSApLFxuICAgICAgc2NoZW1hID0gcHJvdG90eXBlLnNjaGVtYSB8fCBwcm90b3R5cGUuY29uc3RydWN0b3Iuc2NoZW1hLFxuICAgICAgaXNBcnJheSA9IHNjaGVtYS5wYXRoKCBwYXRoICkgaW5zdGFuY2VvZiBTY2hlbWFBcnJheSxcbiAgICAgIG9ic2VydmFibGUgPSBpc0FycmF5ID8ga28ub2JzZXJ2YWJsZUFycmF5KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDoga28ub2JzZXJ2YWJsZSgpO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBwcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgLCBnZXQ6IGZ1bmN0aW9uICggKSB7IHJldHVybiB0aGlzLmdldC5jYWxsKHRoaXMuJF9fLnNjb3BlIHx8IHRoaXMsIHBhdGgpOyB9XG4gICAgICAsIHNldDogZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHRoaXMuc2V0LmNhbGwodGhpcy4kX18uc2NvcGUgfHwgdGhpcywgcGF0aCwgdik7IH1cbiAgICB9KTtcblxuICAgIGFsbE9ic2VydmFibGVzRm9yT2JqZWN0WyBwYXRoIF0gPSBvYnNlcnZhYmxlO1xuXG4gICAgaWYgKCBpc0FycmF5ICkge1xuICAgICAga28uZXM1Lm5vdGlmeVdoZW5QcmVzZW50T3JGdXR1cmVBcnJheVZhbHVlc011dGF0ZSgga28sIG9ic2VydmFibGUgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NpZ25zL2NvbXBpbGVzIGBzY2hlbWFgIGludG8gdGhpcyBkb2N1bWVudHMgcHJvdG90eXBlLlxuICpcbiAqIEBwYXJhbSB7U2NoZW1hfSBzY2hlbWFcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19zZXRTY2hlbWFcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fc2V0U2NoZW1hID0gZnVuY3Rpb24gKCBzY2hlbWEgKSB7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICBjb21waWxlKCB0aGlzLCBzY2hlbWEudHJlZSwgdGhpcyApO1xufTtcblxuLyoqXG4gKiBHZXQgYWxsIHN1YmRvY3MgKGJ5IGJmcylcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QWxsU3ViZG9jc1xuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19nZXRBbGxTdWJkb2NzID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBkb2NSZWR1Y2VyKHNlZWQsIHBhdGgpIHtcbiAgICB2YXIgdmFsID0gdGhpc1twYXRoXTtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgRW1iZWRkZWQpIHNlZWQucHVzaCh2YWwpO1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBEb2N1bWVudEFycmF5KVxuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gX2RvY1JlZHVjZShkb2MpIHtcbiAgICAgICAgaWYgKCFkb2MgfHwgIWRvYy5fZG9jKSByZXR1cm47XG4gICAgICAgIGlmIChkb2MgaW5zdGFuY2VvZiBFbWJlZGRlZCkgc2VlZC5wdXNoKGRvYyk7XG4gICAgICAgIHNlZWQgPSBPYmplY3Qua2V5cyhkb2MuX2RvYykucmVkdWNlKGRvY1JlZHVjZXIuYmluZChkb2MuX2RvYyksIHNlZWQpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHNlZWQ7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fZG9jKS5yZWR1Y2UoZG9jUmVkdWNlci5iaW5kKHRoaXMpLCBbXSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBnZW5lcmljIHNhdmUgc3R1ZmYuXG4gKiB0byBzb2x2ZSAjMTQ0NiB1c2UgdXNlIGhpZXJhcmNoeSBpbnN0ZWFkIG9mIGhvb2tzXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX3ByZXNhdmVWYWxpZGF0ZVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19wcmVzYXZlVmFsaWRhdGUgPSBmdW5jdGlvbiAkX19wcmVzYXZlVmFsaWRhdGUoKSB7XG4gIC8vIGlmIGFueSBkb2Muc2V0KCkgY2FsbHMgZmFpbGVkXG5cbiAgdmFyIGRvY3MgPSB0aGlzLiRfX2dldEFycmF5UGF0aHNUb1ZhbGlkYXRlKCk7XG5cbiAgdmFyIGUyID0gZG9jcy5tYXAoZnVuY3Rpb24gKGRvYykge1xuICAgIHJldHVybiBkb2MuJF9fcHJlc2F2ZVZhbGlkYXRlKCk7XG4gIH0pO1xuICB2YXIgZTEgPSBbdGhpcy4kX18uc2F2ZUVycm9yXS5jb25jYXQoZTIpO1xuICB2YXIgZXJyID0gZTEuZmlsdGVyKGZ1bmN0aW9uICh4KSB7cmV0dXJuIHh9KVswXTtcbiAgdGhpcy4kX18uc2F2ZUVycm9yID0gbnVsbDtcblxuICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBHZXQgYWN0aXZlIHBhdGggdGhhdCB3ZXJlIGNoYW5nZWQgYW5kIGFyZSBhcnJheXNcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGVcbiAqIEBtZW1iZXJPZiBEb2N1bWVudFxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuJF9fZ2V0QXJyYXlQYXRoc1RvVmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIHZhbGlkYXRlIGFsbCBkb2N1bWVudCBhcnJheXMuXG4gIHJldHVybiB0aGlzLiRfXy5hY3RpdmVQYXRoc1xuICAgIC5tYXAoJ2luaXQnLCAnbW9kaWZ5JywgZnVuY3Rpb24gKGkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFZhbHVlKGkpO1xuICAgIH0uYmluZCh0aGlzKSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgJiYgdmFsIGluc3RhbmNlb2YgRG9jdW1lbnRBcnJheSAmJiB2YWwubGVuZ3RoO1xuICAgIH0pLnJlZHVjZShmdW5jdGlvbihzZWVkLCBhcnJheSkge1xuICAgICAgcmV0dXJuIHNlZWQuY29uY2F0KGFycmF5KTtcbiAgICB9LCBbXSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uIChkb2MpIHtyZXR1cm4gZG9jfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBlcnJvclxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQGFwaSBwcml2YXRlXG4gKiBAbWV0aG9kICRfX2Vycm9yXG4gKiBAbWVtYmVyT2YgRG9jdW1lbnRcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLiRfX2Vycm9yID0gZnVuY3Rpb24gKGVycikge1xuICB0aGlzLiRfXy5zYXZlRXJyb3IgPSBlcnI7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcm9kdWNlcyBhIHNwZWNpYWwgcXVlcnkgZG9jdW1lbnQgb2YgdGhlIG1vZGlmaWVkIHByb3BlcnRpZXMgdXNlZCBpbiB1cGRhdGVzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19kZWx0YVxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19kZWx0YSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRpcnR5ID0gdGhpcy4kX19kaXJ0eSgpO1xuXG4gIHZhciBkZWx0YSA9IHt9XG4gICAgLCBsZW4gPSBkaXJ0eS5sZW5ndGhcbiAgICAsIGQgPSAwO1xuXG4gIGZvciAoOyBkIDwgbGVuOyArK2QpIHtcbiAgICB2YXIgZGF0YSA9IGRpcnR5WyBkIF07XG4gICAgdmFyIHZhbHVlID0gZGF0YS52YWx1ZTtcblxuICAgIHZhbHVlID0gdXRpbHMuY2xvbmUodmFsdWUsIHsgZGVwb3B1bGF0ZTogMSB9KTtcbiAgICBkZWx0YVsgZGF0YS5wYXRoIF0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBkZWx0YTtcbn07XG5cbkRvY3VtZW50LnByb3RvdHlwZS4kX19oYW5kbGVTYXZlID0gZnVuY3Rpb24oKXtcbiAgLy8g0J/QvtC70YPRh9Cw0LXQvCDRgNC10YHRg9GA0YEg0LrQvtC70LvQtdC60YbQuNC4LCDQutGD0LTQsCDQsdGD0LTQtdC8INGB0L7RhdGA0LDQvdGP0YLRjCDQtNCw0L3QvdGL0LVcbiAgdmFyIHJlc291cmNlO1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJlc291cmNlID0gdGhpcy5jb2xsZWN0aW9uLmFwaTtcbiAgfVxuXG4gIHZhciBpbm5lclByb21pc2UgPSBuZXcgJC5EZWZlcnJlZCgpO1xuXG4gIGlmICggdGhpcy5pc05ldyApIHtcbiAgICAvLyBzZW5kIGVudGlyZSBkb2NcbiAgICB2YXIgb2JqID0gdGhpcy50b09iamVjdCh7IGRlcG9wdWxhdGU6IDEgfSk7XG5cbiAgICBpZiAoICggb2JqIHx8IHt9ICkuaGFzT3duUHJvcGVydHkoJ19pZCcpID09PSBmYWxzZSApIHtcbiAgICAgIC8vIGRvY3VtZW50cyBtdXN0IGhhdmUgYW4gX2lkIGVsc2UgbW9uZ29vc2Ugd29uJ3Qga25vd1xuICAgICAgLy8gd2hhdCB0byB1cGRhdGUgbGF0ZXIgaWYgbW9yZSBjaGFuZ2VzIGFyZSBtYWRlLiB0aGUgdXNlclxuICAgICAgLy8gd291bGRuJ3Qga25vdyB3aGF0IF9pZCB3YXMgZ2VuZXJhdGVkIGJ5IG1vbmdvZGIgZWl0aGVyXG4gICAgICAvLyBub3Igd291bGQgdGhlIE9iamVjdElkIGdlbmVyYXRlZCBteSBtb25nb2RiIG5lY2Vzc2FyaWx5XG4gICAgICAvLyBtYXRjaCB0aGUgc2NoZW1hIGRlZmluaXRpb24uXG4gICAgICBpbm5lclByb21pc2UucmVqZWN0KG5ldyBFcnJvcignZG9jdW1lbnQgbXVzdCBoYXZlIGFuIF9pZCBiZWZvcmUgc2F2aW5nJykpO1xuICAgICAgcmV0dXJuIGlubmVyUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyDQn9GA0L7QstC10YDQutCwINC90LAg0L7QutGA0YPQttC10L3QuNC1INGC0LXRgdGC0L7QslxuICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgaWYgKCAhcmVzb3VyY2UgKXtcbiAgICAgIGlubmVyUHJvbWlzZS5yZXNvbHZlKCB0aGlzICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc291cmNlLmNyZWF0ZSggb2JqICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgIH1cblxuICAgIHRoaXMuJF9fcmVzZXQoKTtcbiAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XG4gICAgdGhpcy50cmlnZ2VyKCdpc05ldycsIGZhbHNlKTtcbiAgICAvLyBNYWtlIGl0IHBvc3NpYmxlIHRvIHJldHJ5IHRoZSBpbnNlcnRcbiAgICB0aGlzLiRfXy5pbnNlcnRpbmcgPSB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIGRvbid0IHRyZWF0IGl0IGFzIGEgbmV3IG9iamVjdCBvbiBlcnJvcixcbiAgICAvLyBzaW5jZSBpdCBhbHJlYWR5IGV4aXN0c1xuICAgIHRoaXMuJF9fLmluc2VydGluZyA9IGZhbHNlO1xuXG4gICAgdmFyIGRlbHRhID0gdGhpcy4kX19kZWx0YSgpO1xuXG4gICAgaWYgKCAhXy5pc0VtcHR5KCBkZWx0YSApICkge1xuICAgICAgdGhpcy4kX19yZXNldCgpO1xuICAgICAgLy8g0J/RgNC+0LLQtdGA0LrQsCDQvdCwINC+0LrRgNGD0LbQtdC90LjQtSDRgtC10YHRgtC+0LJcbiAgICAgIC8vINCl0L7RgtGPINC80L7QttC90L4g0YLQsNC60LjQvCDQvtCx0YDQsNC30L7QvCDQv9GA0L7RgdGC0L4g0LTQtdC70LDRgtGMINCy0LDQu9C40LTQsNGG0LjRjiwg0LTQsNC20LUg0LXRgdC70Lgg0L3QtdGCINC60L7Qu9C70LXQutGG0LjQuCDQuNC70LggYXBpXG4gICAgICBpZiAoICFyZXNvdXJjZSApe1xuICAgICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UoIHRoaXMuaWQgKS51cGRhdGUoIGRlbHRhICkuYWx3YXlzKCBpbm5lclByb21pc2UucmVzb2x2ZSApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRfX3Jlc2V0KCk7XG4gICAgICBpbm5lclByb21pc2UucmVzb2x2ZSggdGhpcyApO1xuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignaXNOZXcnLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gaW5uZXJQcm9taXNlO1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb24gU2F2ZXMgdGhpcyBkb2N1bWVudC5cbiAqXG4gKiBAZXhhbXBsZTpcbiAqXG4gKiAgICAgcHJvZHVjdC5zb2xkID0gRGF0ZS5ub3coKTtcbiAqICAgICBwcm9kdWN0LnNhdmUoZnVuY3Rpb24gKGVyciwgcHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgIGlmIChlcnIpIC4uXG4gKiAgICAgfSlcbiAqXG4gKiBAZGVzY3JpcHRpb24gVGhlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSB0aHJlZSBwYXJhbWV0ZXJzLCBgZXJyYCBpZiBhbiBlcnJvciBvY2N1cnJlZCwgYHByb2R1Y3RgIHdoaWNoIGlzIHRoZSBzYXZlZCBgcHJvZHVjdGAsIGFuZCBgbnVtYmVyQWZmZWN0ZWRgIHdoaWNoIHdpbGwgYmUgMSB3aGVuIHRoZSBkb2N1bWVudCB3YXMgZm91bmQgYW5kIHVwZGF0ZWQgaW4gdGhlIGRhdGFiYXNlLCBvdGhlcndpc2UgMC5cbiAqXG4gKiBUaGUgYGZuYCBjYWxsYmFjayBpcyBvcHRpb25hbC4gSWYgbm8gYGZuYCBpcyBwYXNzZWQgYW5kIHZhbGlkYXRpb24gZmFpbHMsIHRoZSB2YWxpZGF0aW9uIGVycm9yIHdpbGwgYmUgZW1pdHRlZCBvbiB0aGUgY29ubmVjdGlvbiB1c2VkIHRvIGNyZWF0ZSB0aGlzIG1vZGVsLlxuICogQGV4YW1wbGU6XG4gKiAgICAgdmFyIGRiID0gbW9uZ29vc2UuY3JlYXRlQ29ubmVjdGlvbiguLik7XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICogICAgIHZhciBQcm9kdWN0ID0gZGIubW9kZWwoJ1Byb2R1Y3QnLCBzY2hlbWEpO1xuICpcbiAqICAgICBkYi5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEhvd2V2ZXIsIGlmIHlvdSBkZXNpcmUgbW9yZSBsb2NhbCBlcnJvciBoYW5kbGluZyB5b3UgY2FuIGFkZCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHRoZSBtb2RlbCBhbmQgaGFuZGxlIGVycm9ycyB0aGVyZSBpbnN0ZWFkLlxuICogQGV4YW1wbGU6XG4gKiAgICAgUHJvZHVjdC5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKlxuICogQGRlc2NyaXB0aW9uIEFzIGFuIGV4dHJhIG1lYXN1cmUgb2YgZmxvdyBjb250cm9sLCBzYXZlIHdpbGwgcmV0dXJuIGEgUHJvbWlzZSAoYm91bmQgdG8gYGZuYCBpZiBwYXNzZWQpIHNvIGl0IGNvdWxkIGJlIGNoYWluZWQsIG9yIGhvb2sgdG8gcmVjaXZlIGVycm9yc1xuICogQGV4YW1wbGU6XG4gKiAgICAgcHJvZHVjdC5zYXZlKCkudGhlbihmdW5jdGlvbiAocHJvZHVjdCwgbnVtYmVyQWZmZWN0ZWQpIHtcbiAqICAgICAgICAuLi5cbiAqICAgICB9KS5vblJlamVjdGVkKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgICBhc3NlcnQub2soZXJyKVxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbihlcnIsIHByb2R1Y3QsIE51bWJlcil9IFtkb25lXSBvcHRpb25hbCBjYWxsYmFja1xuICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZVxuICogQGFwaSBwdWJsaWNcbiAqIEBzZWUgbWlkZGxld2FyZSBodHRwOi8vbW9uZ29vc2Vqcy5jb20vZG9jcy9taWRkbGV3YXJlLmh0bWxcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoIGRvbmUgKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGZpbmFsUHJvbWlzZSA9IG5ldyAkLkRlZmVycmVkKCkuZG9uZSggZG9uZSApO1xuXG4gIC8vINCh0L7RhdGA0LDQvdGP0YLRjCDQtNC+0LrRg9C80LXQvdGCINC80L7QttC90L4g0YLQvtC70YzQutC+INC10YHQu9C4INC+0L0g0L3QsNGF0L7QtNC40YLRgdGPINCyINC60L7Qu9C70LXQutGG0LjQuFxuICBpZiAoICF0aGlzLmNvbGxlY3Rpb24gKXtcbiAgICBmaW5hbFByb21pc2UucmVqZWN0KCBhcmd1bWVudHMgKTtcbiAgICBjb25zb2xlLmVycm9yKCdEb2N1bWVudC5zYXZlIGFwaSBoYW5kbGUgaXMgbm90IGltcGxlbWVudGVkLicpO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcHJlU2F2ZSBlcnJvcnMgKNGC0L7Rh9C+INC30L3QsNGOLCDRh9GC0L4g0L7QvdCwINC/0YDQvtCy0LXRgNGP0LXRgiDQvtGI0LjQsdC60Lgg0LIg0LzQsNGB0YHQuNCy0LDRhSAoQ2FzdEVycm9yKSlcbiAgdmFyIHByZVNhdmVFcnIgPSBzZWxmLiRfX3ByZXNhdmVWYWxpZGF0ZSgpO1xuICBpZiAoIHByZVNhdmVFcnIgKSB7XG4gICAgZmluYWxQcm9taXNlLnJlamVjdCggcHJlU2F2ZUVyciApO1xuICAgIHJldHVybiBmaW5hbFByb21pc2U7XG4gIH1cblxuICAvLyBWYWxpZGF0ZVxuICB2YXIgcDAgPSBuZXcgJC5EZWZlcnJlZCgpO1xuICBzZWxmLnZhbGlkYXRlKGZ1bmN0aW9uKCBlcnIgKXtcbiAgICBpZiAoIGVyciApe1xuICAgICAgcDAucmVqZWN0KCBlcnIgKTtcbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0gZWxzZSB7XG4gICAgICBwMC5yZXNvbHZlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyDQodC90LDRh9Cw0LvQsCDQvdCw0LTQviDRgdC+0YXRgNCw0L3QuNGC0Ywg0LLRgdC1INC/0L7QtNC00L7QutGD0LzQtdC90YLRiyDQuCDRgdC00LXQu9Cw0YLRjCByZXNvbHZlISEhXG4gIC8vIENhbGwgc2F2ZSBob29rcyBvbiBzdWJkb2NzXG4gIHZhciBzdWJEb2NzID0gc2VsZi4kX19nZXRBbGxTdWJkb2NzKCk7XG4gIHZhciB3aGVuQ29uZCA9IHN1YkRvY3MubWFwKGZ1bmN0aW9uIChkKSB7cmV0dXJuIGQuc2F2ZSgpO30pO1xuICB3aGVuQ29uZC5wdXNoKCBwMCApO1xuXG4gIC8vINCi0LDQuiDQvNGLINC/0LXRgNC10LTQsNGR0Lwg0LzQsNGB0YHQuNCyIHByb21pc2Ug0YPRgdC70L7QstC40LlcbiAgdmFyIHAxID0gJC53aGVuLmFwcGx5KCAkLCB3aGVuQ29uZCApO1xuXG4gIC8vIEhhbmRsZSBzYXZlIGFuZCByZXN1bHRzXG4gIHAxXG4gICAgLnRoZW4oIHRoaXMuJF9faGFuZGxlU2F2ZS5iaW5kKCB0aGlzICkgKVxuICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZmluYWxQcm9taXNlLnJlc29sdmUoIHNlbGYgKTtcbiAgICB9LCBmdW5jdGlvbiAoIGVyciApIHtcbiAgICAgIC8vIElmIHRoZSBpbml0aWFsIGluc2VydCBmYWlscyBwcm92aWRlIGEgc2Vjb25kIGNoYW5jZS5cbiAgICAgIC8vIChJZiB3ZSBkaWQgdGhpcyBhbGwgdGhlIHRpbWUgd2Ugd291bGQgYnJlYWsgdXBkYXRlcylcbiAgICAgIGlmIChzZWxmLiRfXy5pbnNlcnRpbmcpIHtcbiAgICAgICAgc2VsZi5pc05ldyA9IHRydWU7XG4gICAgICAgIHNlbGYuZW1pdCgnaXNOZXcnLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGZpbmFsUHJvbWlzZS5yZWplY3QoIGVyciApO1xuICAgIH0pO1xuXG4gIHJldHVybiBmaW5hbFByb21pc2U7XG59O1xuXG4vKmZ1bmN0aW9uIGFsbCAocHJvbWlzZU9mQXJyKSB7XG4gIHZhciBwUmV0ID0gbmV3IFByb21pc2U7XG4gIHRoaXMudGhlbihwcm9taXNlT2ZBcnIpLnRoZW4oXG4gICAgZnVuY3Rpb24gKHByb21pc2VBcnIpIHtcbiAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICB2YXIgcmV0ID0gW107XG4gICAgICB2YXIgZXJyU2VudGluZWw7XG4gICAgICBpZiAoIXByb21pc2VBcnIubGVuZ3RoKSBwUmV0LnJlc29sdmUoKTtcbiAgICAgIHByb21pc2VBcnIuZm9yRWFjaChmdW5jdGlvbiAocHJvbWlzZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHByb21pc2UudGhlbihcbiAgICAgICAgICBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICBpZiAoZXJyU2VudGluZWwpIHJldHVybjtcbiAgICAgICAgICAgIHJldFtpbmRleF0gPSB2YWw7XG4gICAgICAgICAgICAtLWNvdW50O1xuICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHBSZXQuZnVsZmlsbChyZXQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVyclNlbnRpbmVsKSByZXR1cm47XG4gICAgICAgICAgICBlcnJTZW50aW5lbCA9IGVycjtcbiAgICAgICAgICAgIHBSZXQucmVqZWN0KGVycik7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcFJldDtcbiAgICB9XG4gICAgLCBwUmV0LnJlamVjdC5iaW5kKHBSZXQpXG4gICk7XG4gIHJldHVybiBwUmV0O1xufSovXG5cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGlzIGRvY3VtZW50IGludG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCwgcmVhZHkgZm9yIHN0b3JhZ2UgaW4gTW9uZ29EQi5cbiAqXG4gKiBCdWZmZXJzIGFyZSBjb252ZXJ0ZWQgdG8gaW5zdGFuY2VzIG9mIFttb25nb2RiLkJpbmFyeV0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbCkgZm9yIHByb3BlciBzdG9yYWdlLlxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gYGdldHRlcnNgIGFwcGx5IGFsbCBnZXR0ZXJzIChwYXRoIGFuZCB2aXJ0dWFsIGdldHRlcnMpXG4gKiAtIGB2aXJ0dWFsc2AgYXBwbHkgdmlydHVhbCBnZXR0ZXJzIChjYW4gb3ZlcnJpZGUgYGdldHRlcnNgIG9wdGlvbilcbiAqIC0gYG1pbmltaXplYCByZW1vdmUgZW1wdHkgb2JqZWN0cyAoZGVmYXVsdHMgdG8gdHJ1ZSlcbiAqIC0gYHRyYW5zZm9ybWAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gYXBwbHkgdG8gdGhlIHJlc3VsdGluZyBkb2N1bWVudCBiZWZvcmUgcmV0dXJuaW5nXG4gKlxuICogIyMjI0dldHRlcnMvVmlydHVhbHNcbiAqXG4gKiBFeGFtcGxlIG9mIG9ubHkgYXBwbHlpbmcgcGF0aCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUsIHZpcnR1YWxzOiBmYWxzZSB9KVxuICpcbiAqIEV4YW1wbGUgb2Ygb25seSBhcHBseWluZyB2aXJ0dWFsIGdldHRlcnNcbiAqXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdmlydHVhbHM6IHRydWUgfSlcbiAqXG4gKiBFeGFtcGxlIG9mIGFwcGx5aW5nIGJvdGggcGF0aCBhbmQgdmlydHVhbCBnZXR0ZXJzXG4gKlxuICogICAgIGRvYy50b09iamVjdCh7IGdldHRlcnM6IHRydWUgfSlcbiAqXG4gKiBUbyBhcHBseSB0aGVzZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvT2JqZWN0YCBvcHRpb24gdG8gdGhlIHNhbWUgYXJndW1lbnQuXG4gKlxuICogICAgIHNjaGVtYS5zZXQoJ3RvT2JqZWN0JywgeyB2aXJ0dWFsczogdHJ1ZSB9KVxuICpcbiAqICMjIyNUcmFuc2Zvcm1cbiAqXG4gKiBXZSBtYXkgbmVlZCB0byBwZXJmb3JtIGEgdHJhbnNmb3JtYXRpb24gb2YgdGhlIHJlc3VsdGluZyBvYmplY3QgYmFzZWQgb24gc29tZSBjcml0ZXJpYSwgc2F5IHRvIHJlbW92ZSBzb21lIHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiBvciByZXR1cm4gYSBjdXN0b20gb2JqZWN0LiBJbiB0aGlzIGNhc2Ugd2Ugc2V0IHRoZSBvcHRpb25hbCBgdHJhbnNmb3JtYCBmdW5jdGlvbi5cbiAqXG4gKiBUcmFuc2Zvcm0gZnVuY3Rpb25zIHJlY2VpdmUgdGhyZWUgYXJndW1lbnRzXG4gKlxuICogICAgIGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge31cbiAqXG4gKiAtIGBkb2NgIFRoZSBtb25nb29zZSBkb2N1bWVudCB3aGljaCBpcyBiZWluZyBjb252ZXJ0ZWRcbiAqIC0gYHJldGAgVGhlIHBsYWluIG9iamVjdCByZXByZXNlbnRhdGlvbiB3aGljaCBoYXMgYmVlbiBjb252ZXJ0ZWRcbiAqIC0gYG9wdGlvbnNgIFRoZSBvcHRpb25zIGluIHVzZSAoZWl0aGVyIHNjaGVtYSBvcHRpb25zIG9yIHRoZSBvcHRpb25zIHBhc3NlZCBpbmxpbmUpXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgLy8gc3BlY2lmeSB0aGUgdHJhbnNmb3JtIHNjaGVtYSBvcHRpb25cbiAqICAgICBpZiAoIXNjaGVtYS5vcHRpb25zLnRvT2JqZWN0KSBzY2hlbWEub3B0aW9ucy50b09iamVjdCA9IHt9O1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgLy8gcmVtb3ZlIHRoZSBfaWQgb2YgZXZlcnkgZG9jdW1lbnQgYmVmb3JlIHJldHVybmluZyB0aGUgcmVzdWx0XG4gKiAgICAgICBkZWxldGUgcmV0Ll9pZDtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIHdpdGhvdXQgdGhlIHRyYW5zZm9ybWF0aW9uIGluIHRoZSBzY2hlbWFcbiAqICAgICBkb2MudG9PYmplY3QoKTsgLy8geyBfaWQ6ICdhbklkJywgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogICAgIC8vIHdpdGggdGhlIHRyYW5zZm9ybWF0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgbmFtZTogJ1dyZWNrLWl0IFJhbHBoJyB9XG4gKlxuICogV2l0aCB0cmFuc2Zvcm1hdGlvbnMgd2UgY2FuIGRvIGEgbG90IG1vcmUgdGhhbiByZW1vdmUgcHJvcGVydGllcy4gV2UgY2FuIGV2ZW4gcmV0dXJuIGNvbXBsZXRlbHkgbmV3IGN1c3RvbWl6ZWQgb2JqZWN0czpcbiAqXG4gKiAgICAgaWYgKCFzY2hlbWEub3B0aW9ucy50b09iamVjdCkgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QgPSB7fTtcbiAqICAgICBzY2hlbWEub3B0aW9ucy50b09iamVjdC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoZG9jLCByZXQsIG9wdGlvbnMpIHtcbiAqICAgICAgIHJldHVybiB7IG1vdmllOiByZXQubmFtZSB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyB3aXRob3V0IHRoZSB0cmFuc2Zvcm1hdGlvbiBpbiB0aGUgc2NoZW1hXG4gKiAgICAgZG9jLnRvT2JqZWN0KCk7IC8vIHsgX2lkOiAnYW5JZCcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICpcbiAqICAgICAvLyB3aXRoIHRoZSB0cmFuc2Zvcm1hdGlvblxuICogICAgIGRvYy50b09iamVjdCgpOyAvLyB7IG1vdmllOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBfTm90ZTogaWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBgdW5kZWZpbmVkYCwgdGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuX1xuICpcbiAqIFRyYW5zZm9ybWF0aW9ucyBtYXkgYWxzbyBiZSBhcHBsaWVkIGlubGluZSwgb3ZlcnJpZGRpbmcgYW55IHRyYW5zZm9ybSBzZXQgaW4gdGhlIG9wdGlvbnM6XG4gKlxuICogICAgIGZ1bmN0aW9uIHhmb3JtIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgcmV0dXJuIHsgaW5saW5lOiByZXQubmFtZSwgY3VzdG9tOiB0cnVlIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIHBhc3MgdGhlIHRyYW5zZm9ybSBhcyBhbiBpbmxpbmUgb3B0aW9uXG4gKiAgICAgZG9jLnRvT2JqZWN0KHsgdHJhbnNmb3JtOiB4Zm9ybSB9KTsgLy8geyBpbmxpbmU6ICdXcmVjay1pdCBSYWxwaCcsIGN1c3RvbTogdHJ1ZSB9XG4gKlxuICogX05vdGU6IGlmIHlvdSBjYWxsIGB0b09iamVjdGAgYW5kIHBhc3MgYW55IG9wdGlvbnMsIHRoZSB0cmFuc2Zvcm0gZGVjbGFyZWQgaW4geW91ciBzY2hlbWEgb3B0aW9ucyB3aWxsIF9fbm90X18gYmUgYXBwbGllZC4gVG8gZm9yY2UgaXRzIGFwcGxpY2F0aW9uIHBhc3MgYHRyYW5zZm9ybTogdHJ1ZWBfXG4gKlxuICogICAgIGlmICghc2NoZW1hLm9wdGlvbnMudG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0ge307XG4gKiAgICAgc2NoZW1hLm9wdGlvbnMudG9PYmplY3QuaGlkZSA9ICdfaWQnO1xuICogICAgIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0LnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChkb2MsIHJldCwgb3B0aW9ucykge1xuICogICAgICAgaWYgKG9wdGlvbnMuaGlkZSkge1xuICogICAgICAgICBvcHRpb25zLmhpZGUuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gKiAgICAgICAgICAgZGVsZXRlIHJldFtwcm9wXTtcbiAqICAgICAgICAgfSk7XG4gKiAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH0pO1xuICogICAgIGRvYy50b09iamVjdCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB7IHNlY3JldDogNDcsIG5hbWU6ICdXcmVjay1pdCBSYWxwaCcgfVxuICogICAgIGRvYy50b09iamVjdCh7IGhpZGU6ICdzZWNyZXQgX2lkJyB9KTsgICAgICAgICAgICAgICAgICAvLyB7IF9pZDogJ2FuSWQnLCBzZWNyZXQ6IDQ3LCBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqICAgICBkb2MudG9PYmplY3QoeyBoaWRlOiAnc2VjcmV0IF9pZCcsIHRyYW5zZm9ybTogdHJ1ZSB9KTsgLy8geyBuYW1lOiAnV3JlY2staXQgUmFscGgnIH1cbiAqXG4gKiBUcmFuc2Zvcm1zIGFyZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBfYW5kIGVhY2ggb2YgaXRzIHN1Yi1kb2N1bWVudHNfLiBUbyBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgeW91IGFyZSBjdXJyZW50bHkgb3BlcmF0aW5nIG9uIGEgc3ViLWRvY3VtZW50IHlvdSBtaWdodCB1c2UgdGhlIGZvbGxvd2luZyBndWFyZDpcbiAqXG4gKiAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRvYy5vd25lckRvY3VtZW50KSB7XG4gKiAgICAgICAvLyB3b3JraW5nIHdpdGggYSBzdWIgZG9jXG4gKiAgICAgfVxuICpcbiAqIFRyYW5zZm9ybXMsIGxpa2UgYWxsIG9mIHRoZXNlIG9wdGlvbnMsIGFyZSBhbHNvIGF2YWlsYWJsZSBmb3IgYHRvSlNPTmAuXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgZm9yIHNvbWUgbW9yZSBkZXRhaWxzLlxuICpcbiAqIF9EdXJpbmcgc2F2ZSwgbm8gY3VzdG9tIG9wdGlvbnMgYXJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IGJlZm9yZSBiZWluZyBzZW50IHRvIHRoZSBkYXRhYmFzZS5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHJldHVybiB7T2JqZWN0fSBqcyBvYmplY3RcbiAqIEBzZWUgbW9uZ29kYi5CaW5hcnkgaHR0cDovL21vbmdvZGIuZ2l0aHViLmNvbS9ub2RlLW1vbmdvZGItbmF0aXZlL2FwaS1ic29uLWdlbmVyYXRlZC9iaW5hcnkuaHRtbFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRG9jdW1lbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kZXBvcHVsYXRlICYmIHRoaXMuJF9fLndhc1BvcHVsYXRlZCkge1xuICAgIC8vIHBvcHVsYXRlZCBwYXRocyB0aGF0IHdlIHNldCB0byBhIGRvY3VtZW50XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lKHRoaXMuX2lkLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFdoZW4gaW50ZXJuYWxseSBzYXZpbmcgdGhpcyBkb2N1bWVudCB3ZSBhbHdheXMgcGFzcyBvcHRpb25zLFxuICAvLyBieXBhc3NpbmcgdGhlIGN1c3RvbSBzY2hlbWEgb3B0aW9ucy5cbiAgaWYgKCEob3B0aW9ucyAmJiAnT2JqZWN0JyA9PSBvcHRpb25zLmNvbnN0cnVjdG9yLm5hbWUpKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3RcbiAgICAgID8gdXRpbHMuY2xvbmUodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdClcbiAgICAgIDoge307XG4gIH1cblxuICBpZiAoIG9wdGlvbnMubWluaW1pemUgPT09IHVuZGVmaW5lZCApe1xuICAgIG9wdGlvbnMubWluaW1pemUgPSB0aGlzLnNjaGVtYS5vcHRpb25zLm1pbmltaXplO1xuICB9XG5cbiAgdmFyIHJldCA9IHV0aWxzLmNsb25lKHRoaXMuX2RvYywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMudmlydHVhbHMgfHwgb3B0aW9ucy5nZXR0ZXJzICYmIGZhbHNlICE9PSBvcHRpb25zLnZpcnR1YWxzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3ZpcnR1YWxzJywgb3B0aW9ucyk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5nZXR0ZXJzKSB7XG4gICAgYXBwbHlHZXR0ZXJzKHRoaXMsIHJldCwgJ3BhdGhzJywgb3B0aW9ucyk7XG4gICAgLy8gYXBwbHlHZXR0ZXJzIGZvciBwYXRocyB3aWxsIGFkZCBuZXN0ZWQgZW1wdHkgb2JqZWN0cztcbiAgICAvLyBpZiBtaW5pbWl6ZSBpcyBzZXQsIHdlIG5lZWQgdG8gcmVtb3ZlIHRoZW0uXG4gICAgaWYgKG9wdGlvbnMubWluaW1pemUpIHtcbiAgICAgIHJldCA9IG1pbmltaXplKHJldCkgfHwge307XG4gICAgfVxuICB9XG5cbiAgLy8gSW4gdGhlIGNhc2Ugd2hlcmUgYSBzdWJkb2N1bWVudCBoYXMgaXRzIG93biB0cmFuc2Zvcm0gZnVuY3Rpb24sIHdlIG5lZWQgdG9cbiAgLy8gY2hlY2sgYW5kIHNlZSBpZiB0aGUgcGFyZW50IGhhcyBhIHRyYW5zZm9ybSAob3B0aW9ucy50cmFuc2Zvcm0pIGFuZCBpZiB0aGVcbiAgLy8gY2hpbGQgc2NoZW1hIGhhcyBhIHRyYW5zZm9ybSAodGhpcy5zY2hlbWEub3B0aW9ucy50b09iamVjdCkgSW4gdGhpcyBjYXNlLFxuICAvLyB3ZSBuZWVkIHRvIGFkanVzdCBvcHRpb25zLnRyYW5zZm9ybSB0byBiZSB0aGUgY2hpbGQgc2NoZW1hJ3MgdHJhbnNmb3JtIGFuZFxuICAvLyBub3QgdGhlIHBhcmVudCBzY2hlbWEnc1xuICBpZiAodHJ1ZSA9PT0gb3B0aW9ucy50cmFuc2Zvcm0gfHxcbiAgICAgICh0aGlzLnNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ICYmIG9wdGlvbnMudHJhbnNmb3JtKSkge1xuICAgIHZhciBvcHRzID0gb3B0aW9ucy5qc29uXG4gICAgICA/IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA6IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9PYmplY3Q7XG4gICAgaWYgKG9wdHMpIHtcbiAgICAgIG9wdGlvbnMudHJhbnNmb3JtID0gb3B0cy50cmFuc2Zvcm07XG4gICAgfVxuICB9XG5cbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgdmFyIHhmb3JtZWQgPSBvcHRpb25zLnRyYW5zZm9ybSh0aGlzLCByZXQsIG9wdGlvbnMpO1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgeGZvcm1lZCkgcmV0ID0geGZvcm1lZDtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuXG4vKiFcbiAqIE1pbmltaXplcyBhbiBvYmplY3QsIHJlbW92aW5nIHVuZGVmaW5lZCB2YWx1ZXMgYW5kIGVtcHR5IG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IHRvIG1pbmltaXplXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gbWluaW1pemUgKG9iaikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgaGFzS2V5c1xuICAgICwga2V5XG4gICAgLCB2YWw7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgdmFsID0gb2JqW2tleV07XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdCh2YWwpICkge1xuICAgICAgb2JqW2tleV0gPSBtaW5pbWl6ZSh2YWwpO1xuICAgIH1cblxuICAgIGlmICh1bmRlZmluZWQgPT09IG9ialtrZXldKSB7XG4gICAgICBkZWxldGUgb2JqW2tleV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBoYXNLZXlzID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBoYXNLZXlzXG4gICAgPyBvYmpcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuLyohXG4gKiBBcHBsaWVzIHZpcnR1YWxzIHByb3BlcnRpZXMgdG8gYGpzb25gLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IHNlbGZcbiAqIEBwYXJhbSB7T2JqZWN0fSBqc29uXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBlaXRoZXIgYHZpcnR1YWxzYCBvciBgcGF0aHNgXG4gKiBAcmV0dXJuIHtPYmplY3R9IGBqc29uYFxuICovXG5cbmZ1bmN0aW9uIGFwcGx5R2V0dGVycyAoc2VsZiwganNvbiwgdHlwZSwgb3B0aW9ucykge1xuICB2YXIgc2NoZW1hID0gc2VsZi5zY2hlbWFcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoc2NoZW1hW3R5cGVdKVxuICAgICwgaSA9IHBhdGhzLmxlbmd0aFxuICAgICwgcGF0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgcGF0aCA9IHBhdGhzW2ldO1xuXG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpXG4gICAgICAsIHBsZW4gPSBwYXJ0cy5sZW5ndGhcbiAgICAgICwgbGFzdCA9IHBsZW4gLSAxXG4gICAgICAsIGJyYW5jaCA9IGpzb25cbiAgICAgICwgcGFydDtcblxuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBwbGVuOyArK2lpKSB7XG4gICAgICBwYXJ0ID0gcGFydHNbaWldO1xuICAgICAgaWYgKGlpID09PSBsYXN0KSB7XG4gICAgICAgIGJyYW5jaFtwYXJ0XSA9IHV0aWxzLmNsb25lKHNlbGYuZ2V0KHBhdGgpLCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyYW5jaCA9IGJyYW5jaFtwYXJ0XSB8fCAoYnJhbmNoW3BhcnRdID0ge30pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBqc29uO1xufVxuXG4vKipcbiAqIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgaXMgdXNlZCBpbiBjYWxscyB0byBKU09OLnN0cmluZ2lmeShkb2MpLlxuICpcbiAqIFRoaXMgbWV0aG9kIGFjY2VwdHMgdGhlIHNhbWUgb3B0aW9ucyBhcyBbRG9jdW1lbnQjdG9PYmplY3RdKCNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdCkuIFRvIGFwcGx5IHRoZSBvcHRpb25zIHRvIGV2ZXJ5IGRvY3VtZW50IG9mIHlvdXIgc2NoZW1hIGJ5IGRlZmF1bHQsIHNldCB5b3VyIFtzY2hlbWFzXSgjc2NoZW1hX1NjaGVtYSkgYHRvSlNPTmAgb3B0aW9uIHRvIHRoZSBzYW1lIGFyZ3VtZW50LlxuICpcbiAqICAgICBzY2hlbWEuc2V0KCd0b0pTT04nLCB7IHZpcnR1YWxzOiB0cnVlIH0pXG4gKlxuICogU2VlIFtzY2hlbWEgb3B0aW9uc10oL2RvY3MvZ3VpZGUuaHRtbCN0b0pTT04pIGZvciBkZXRhaWxzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAc2VlIERvY3VtZW50I3RvT2JqZWN0ICNkb2N1bWVudF9Eb2N1bWVudC10b09iamVjdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Eb2N1bWVudC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgLy8gY2hlY2sgZm9yIG9iamVjdCB0eXBlIHNpbmNlIGFuIGFycmF5IG9mIGRvY3VtZW50c1xuICAvLyBiZWluZyBzdHJpbmdpZmllZCBwYXNzZXMgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkXG4gIC8vIG9mIG9wdGlvbnMgb2JqZWN0cy4gSlNPTi5zdHJpbmdpZnkoW2RvYywgZG9jXSlcbiAgLy8gVGhlIHNlY29uZCBjaGVjayBoZXJlIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IHBvcHVsYXRlZCBkb2N1bWVudHMgKG9yXG4gIC8vIHN1YmRvY3VtZW50cykgdXNlIHRoZWlyIG93biBvcHRpb25zIGZvciBgLnRvSlNPTigpYCBpbnN0ZWFkIG9mIHRoZWlyXG4gIC8vIHBhcmVudCdzXG4gIGlmICghKG9wdGlvbnMgJiYgJ09iamVjdCcgPT0gb3B0aW9ucy5jb25zdHJ1Y3Rvci5uYW1lKVxuICAgICAgfHwgKCghb3B0aW9ucyB8fCBvcHRpb25zLmpzb24pICYmIHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKSkge1xuXG4gICAgb3B0aW9ucyA9IHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OXG4gICAgICA/IHV0aWxzLmNsb25lKHRoaXMuc2NoZW1hLm9wdGlvbnMudG9KU09OKVxuICAgICAgOiB7fTtcbiAgfVxuICBvcHRpb25zLmpzb24gPSB0cnVlO1xuXG4gIHJldHVybiB0aGlzLnRvT2JqZWN0KG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIERvY3VtZW50IHN0b3JlcyB0aGUgc2FtZSBkYXRhIGFzIGRvYy5cbiAqXG4gKiBEb2N1bWVudHMgYXJlIGNvbnNpZGVyZWQgZXF1YWwgd2hlbiB0aGV5IGhhdmUgbWF0Y2hpbmcgYF9pZGBzLlxuICpcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBhIGRvY3VtZW50IHRvIGNvbXBhcmVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRvY3VtZW50LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoZG9jKSB7XG4gIHZhciB0aWQgPSB0aGlzLmdldCgnX2lkJyk7XG4gIHZhciBkb2NpZCA9IGRvYy5nZXQoJ19pZCcpO1xuICByZXR1cm4gdGlkICYmIHRpZC5lcXVhbHNcbiAgICA/IHRpZC5lcXVhbHMoZG9jaWQpXG4gICAgOiB0aWQgPT09IGRvY2lkO1xufTtcblxuLyoqXG4gKiBHZXRzIF9pZChzKSB1c2VkIGR1cmluZyBwb3B1bGF0aW9uIG9mIHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIE1vZGVsLmZpbmRPbmUoKS5wb3B1bGF0ZSgnYXV0aG9yJykuZXhlYyhmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKGRvYy5hdXRob3IubmFtZSkgICAgICAgICAvLyBEci5TZXVzc1xuICogICAgICAgY29uc29sZS5sb2coZG9jLnBvcHVsYXRlZCgnYXV0aG9yJykpIC8vICc1MTQ0Y2Y4MDUwZjA3MWQ5NzljMTE4YTcnXG4gKiAgICAgfSlcbiAqXG4gKiBJZiB0aGUgcGF0aCB3YXMgbm90IHBvcHVsYXRlZCwgdW5kZWZpbmVkIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheXxPYmplY3RJZHxOdW1iZXJ8QnVmZmVyfFN0cmluZ3x1bmRlZmluZWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Eb2N1bWVudC5wcm90b3R5cGUucG9wdWxhdGVkID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb3B0aW9ucykge1xuICAvLyB2YWwgYW5kIG9wdGlvbnMgYXJlIGludGVybmFsXG5cbiAgLy9UT0RPOiDQtNC+0LTQtdC70LDRgtGMINGN0YLRgyDQv9GA0L7QstC10YDQutGDLCDQvtC90LAg0LTQvtC70LbQvdCwINC+0L/QuNGA0LDRgtGM0YHRjyDQvdC1INC90LAgJF9fLnBvcHVsYXRlZCwg0LAg0L3QsCDRgtC+LCDRh9GC0L4g0L3QsNGIINC+0LHRitC10LrRgiDQuNC80LXQtdGCINGA0L7QtNC40YLQtdC70Y9cbiAgLy8g0Lgg0L/QvtGC0L7QvCDRg9C20LUg0LLRi9GB0YLQsNCy0LvRj9GC0Ywg0YHQstC+0LnRgdGC0LLQviBwb3B1bGF0ZWQgPT0gdHJ1ZVxuICBpZiAobnVsbCA9PSB2YWwpIHtcbiAgICBpZiAoIXRoaXMuJF9fLnBvcHVsYXRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB2YXIgdiA9IHRoaXMuJF9fLnBvcHVsYXRlZFtwYXRoXTtcbiAgICBpZiAodikgcmV0dXJuIHYudmFsdWU7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIGludGVybmFsXG5cbiAgaWYgKHRydWUgPT09IHZhbCkge1xuICAgIGlmICghdGhpcy4kX18ucG9wdWxhdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLiRfXy5wb3B1bGF0ZWRbcGF0aF07XG4gIH1cblxuICB0aGlzLiRfXy5wb3B1bGF0ZWQgfHwgKHRoaXMuJF9fLnBvcHVsYXRlZCA9IHt9KTtcbiAgdGhpcy4kX18ucG9wdWxhdGVkW3BhdGhdID0geyB2YWx1ZTogdmFsLCBvcHRpb25zOiBvcHRpb25zIH07XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGZ1bGwgcGF0aCB0byB0aGlzIGRvY3VtZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQG1ldGhvZCAkX19mdWxsUGF0aFxuICogQG1lbWJlck9mIERvY3VtZW50XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS4kX19mdWxsUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIC8vIG92ZXJyaWRkZW4gaW4gU3ViRG9jdW1lbnRzXG4gIHJldHVybiBwYXRoIHx8ICcnO1xufTtcblxuLyoqXG4gKiDQo9C00LDQu9C40YLRjCDQtNC+0LrRg9C80LXQvdGCINC4INCy0LXRgNC90YPRgtGMINC60L7Qu9C70LXQutGG0LjRji5cbiAqXG4gKiBAZXhhbXBsZVxuICogc3RvcmFnZS5jb2xsZWN0aW9uLmRvY3VtZW50LnJlbW92ZSgpO1xuICogZG9jdW1lbnQucmVtb3ZlKCk7XG4gKlxuICogQHNlZSBDb2xsZWN0aW9uLnJlbW92ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkRvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpe1xuICBpZiAoIHRoaXMuY29sbGVjdGlvbiApe1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKCB0aGlzICk7XG4gIH1cblxuICByZXR1cm4gZGVsZXRlIHRoaXM7XG59O1xuXG5cbi8qKlxuICog0J7Rh9C40YnQsNC10YIg0LTQvtC60YPQvNC10L3RgiAo0LLRi9GB0YLQsNCy0LvRj9C10YIg0LfQvdCw0YfQtdC90LjQtSDQv9C+INGD0LzQvtC70YfQsNC90LjRjiDQuNC70LggdW5kZWZpbmVkKVxuICovXG5Eb2N1bWVudC5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbigpe1xuICB2YXIgZG9jID0gdGhpc1xuICAgICwgc2VsZiA9IHRoaXNcbiAgICAsIHBhdGhzID0gT2JqZWN0LmtleXMoIHRoaXMuc2NoZW1hLnBhdGhzIClcbiAgICAsIHBsZW4gPSBwYXRocy5sZW5ndGhcbiAgICAsIGlpID0gMDtcblxuICBmb3IgKCA7IGlpIDwgcGxlbjsgKytpaSApIHtcbiAgICB2YXIgcCA9IHBhdGhzW2lpXTtcblxuICAgIGlmICggJ19pZCcgPT0gcCApIGNvbnRpbnVlO1xuXG4gICAgdmFyIHR5cGUgPSB0aGlzLnNjaGVtYS5wYXRoc1sgcCBdXG4gICAgICAsIHBhdGggPSBwLnNwbGl0KCcuJylcbiAgICAgICwgbGVuID0gcGF0aC5sZW5ndGhcbiAgICAgICwgbGFzdCA9IGxlbiAtIDFcbiAgICAgICwgZG9jXyA9IGRvY1xuICAgICAgLCBpID0gMDtcblxuICAgIGZvciAoIDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgdmFyIHBpZWNlID0gcGF0aFsgaSBdXG4gICAgICAgICwgZGVmYXVsdFZhbDtcblxuICAgICAgaWYgKCBpID09PSBsYXN0ICkge1xuICAgICAgICBkZWZhdWx0VmFsID0gdHlwZS5nZXREZWZhdWx0KCBzZWxmLCB0cnVlICk7XG5cbiAgICAgICAgZG9jX1sgcGllY2UgXSA9IGRlZmF1bHRWYWwgfHwgdW5kZWZpbmVkO1xuICAgICAgICBzZWxmLiRfXy5hY3RpdmVQYXRocy5kZWZhdWx0KCBwICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2NfID0gZG9jX1sgcGllY2UgXSB8fCAoIGRvY19bIHBpZWNlIF0gPSB7fSApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5Eb2N1bWVudC5WYWxpZGF0aW9uRXJyb3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50O1xuIiwiLy90b2RvOiDQv9C+0YDRgtC40YDQvtCy0LDRgtGMINCy0YHQtSDQvtGI0LjQsdC60LghISFcbi8qKlxuICogU3RvcmFnZUVycm9yIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1zZyAtIEVycm9yIG1lc3NhZ2VcbiAqIEBpbmhlcml0cyBFcnJvciBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvclxuICogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83ODM4MTgvaG93LWRvLWktY3JlYXRlLWEtY3VzdG9tLWVycm9yLWluLWphdmFzY3JpcHRcbiAqL1xuZnVuY3Rpb24gU3RvcmFnZUVycm9yICggbXNnICkge1xuICB0aGlzLm1lc3NhZ2UgPSBtc2c7XG4gIHRoaXMubmFtZSA9ICdTdG9yYWdlRXJyb3InO1xufVxuU3RvcmFnZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5cbi8qIVxuICogRm9ybWF0cyBlcnJvciBtZXNzYWdlc1xuICovXG5TdG9yYWdlRXJyb3IucHJvdG90eXBlLmZvcm1hdE1lc3NhZ2UgPSBmdW5jdGlvbiAobXNnLCBwYXRoLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIHRocm93IG5ldyBUeXBlRXJyb3IoJ21lc3NhZ2UgaXMgcmVxdWlyZWQnKTtcblxuICByZXR1cm4gbXNnLnJlcGxhY2UoL3tQQVRIfS8sIHBhdGgpXG4gICAgICAgICAgICAucmVwbGFjZSgve1ZBTFVFfS8sIFN0cmluZyh2YWx8fCcnKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC97VFlQRX0vLCB0eXBlIHx8ICdkZWNsYXJlZCB0eXBlJyk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUVycm9yO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGJ1aWx0LWluIHZhbGlkYXRvciBlcnJvciBtZXNzYWdlcy5cbiAqXG4gKiBAc2VlIEVycm9yLm1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VFcnJvci5tZXNzYWdlcyA9IHJlcXVpcmUoJy4vZXJyb3IvbWVzc2FnZXMnKTtcblxuLyohXG4gKiBFeHBvc2Ugc3ViY2xhc3Nlc1xuICovXG5cblN0b3JhZ2VFcnJvci5DYXN0RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL2Nhc3QnKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZhbGlkYXRpb24nKTtcblN0b3JhZ2VFcnJvci5WYWxpZGF0b3JFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IvdmFsaWRhdG9yJyk7XG4vL3RvZG86XG4vL1N0b3JhZ2VFcnJvci5WZXJzaW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL3ZlcnNpb24nKTtcbi8vU3RvcmFnZUVycm9yLk92ZXJ3cml0ZU1vZGVsRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL292ZXJ3cml0ZU1vZGVsJyk7XG4vL1N0b3JhZ2VFcnJvci5NaXNzaW5nU2NoZW1hRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL21pc3NpbmdTY2hlbWEnKTtcbi8vU3RvcmFnZUVycm9yLkRpdmVyZ2VudEFycmF5RXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL2RpdmVyZ2VudEFycmF5Jyk7XG4iLCIvKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFN0b3JhZ2VFcnJvciA9IHJlcXVpcmUoJy4uL2Vycm9yLmpzJyk7XG5cbi8qKlxuICogQ2FzdGluZyBFcnJvciBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gQ2FzdEVycm9yICh0eXBlLCB2YWx1ZSwgcGF0aCkge1xuICBTdG9yYWdlRXJyb3IuY2FsbCh0aGlzLCAnQ2FzdCB0byAnICsgdHlwZSArICcgZmFpbGVkIGZvciB2YWx1ZSBcIicgKyB2YWx1ZSArICdcIiBhdCBwYXRoIFwiJyArIHBhdGggKyAnXCInKTtcbiAgdGhpcy5uYW1lID0gJ0Nhc3RFcnJvcic7XG4gIHRoaXMua2luZCA9IHR5cGU7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbn07XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yLlxuICovXG5cbkNhc3RFcnJvci5wcm90b3R5cGUuX19wcm90b19fID0gU3RvcmFnZUVycm9yLnByb3RvdHlwZTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBDYXN0RXJyb3I7XG4iLCJcbi8qKlxuICogVGhlIGRlZmF1bHQgYnVpbHQtaW4gdmFsaWRhdG9yIGVycm9yIG1lc3NhZ2VzLiBUaGVzZSBtYXkgYmUgY3VzdG9taXplZC5cbiAqXG4gKiAgICAgLy8gY3VzdG9taXplIHdpdGhpbiBlYWNoIHNjaGVtYSBvciBnbG9iYWxseSBsaWtlIHNvXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICBtb25nb29zZS5FcnJvci5tZXNzYWdlcy5TdHJpbmcuZW51bSAgPSBcIllvdXIgY3VzdG9tIG1lc3NhZ2UgZm9yIHtQQVRIfS5cIjtcbiAqXG4gKiBBcyB5b3UgbWlnaHQgaGF2ZSBub3RpY2VkLCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2ljIHRlbXBsYXRpbmdcbiAqXG4gKiAtIGB7UEFUSH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgZG9jdW1lbnQgcGF0aFxuICogLSBge1ZBTFVFfWAgaXMgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogLSBge1RZUEV9YCBpcyByZXBsYWNlZCB3aXRoIHRoZSB2YWxpZGF0b3IgdHlwZSBzdWNoIGFzIFwicmVnZXhwXCIsIFwibWluXCIsIG9yIFwidXNlciBkZWZpbmVkXCJcbiAqIC0gYHtNSU59YCBpcyByZXBsYWNlZCB3aXRoIHRoZSBkZWNsYXJlZCBtaW4gdmFsdWUgZm9yIHRoZSBOdW1iZXIubWluIHZhbGlkYXRvclxuICogLSBge01BWH1gIGlzIHJlcGxhY2VkIHdpdGggdGhlIGRlY2xhcmVkIG1heCB2YWx1ZSBmb3IgdGhlIE51bWJlci5tYXggdmFsaWRhdG9yXG4gKlxuICogQ2xpY2sgdGhlIFwic2hvdyBjb2RlXCIgbGluayBiZWxvdyB0byBzZWUgYWxsIGRlZmF1bHRzLlxuICpcbiAqIEBwcm9wZXJ0eSBtZXNzYWdlc1xuICogQHJlY2VpdmVyIE1vbmdvb3NlRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIG1zZyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbm1zZy5nZW5lcmFsID0ge307XG5tc2cuZ2VuZXJhbC5kZWZhdWx0ID0gXCJWYWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gXCI7XG5tc2cuZ2VuZXJhbC5yZXF1aXJlZCA9IFwiUGF0aCBge1BBVEh9YCBpcyByZXF1aXJlZC5cIjtcblxubXNnLk51bWJlciA9IHt9O1xubXNnLk51bWJlci5taW4gPSBcIlBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGxlc3MgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUgKHtNSU59KS5cIjtcbm1zZy5OdW1iZXIubWF4ID0gXCJQYXRoIGB7UEFUSH1gICh7VkFMVUV9KSBpcyBtb3JlIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlICh7TUFYfSkuXCI7XG5cbm1zZy5TdHJpbmcgPSB7fTtcbm1zZy5TdHJpbmcuZW51bSA9IFwiYHtWQUxVRX1gIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHtQQVRIfWAuXCI7XG5tc2cuU3RyaW5nLm1hdGNoID0gXCJQYXRoIGB7UEFUSH1gIGlzIGludmFsaWQgKHtWQUxVRX0pLlwiO1xuXG4iLCJcbi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50c1xuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xuXG4vKipcbiAqIERvY3VtZW50IFZhbGlkYXRpb24gRXJyb3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGluc3RhbmNlXG4gKiBAaW5oZXJpdHMgTW9uZ29vc2VFcnJvclxuICovXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvciAoaW5zdGFuY2UpIHtcbiAgU3RvcmFnZUVycm9yLmNhbGwodGhpcywgXCJWYWxpZGF0aW9uIGZhaWxlZFwiKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG4gIHRoaXMuZXJyb3JzID0gaW5zdGFuY2UuZXJyb3JzID0ge307XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBNb25nb29zZUVycm9yLlxuICovXG5cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuX19wcm90b19fID0gU3RvcmFnZUVycm9yLnByb3RvdHlwZTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdGlvbkVycm9yO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvci5qcycpO1xudmFyIGVycm9yTWVzc2FnZXMgPSBTdG9yYWdlRXJyb3IubWVzc2FnZXM7XG5cbi8qKlxuICogU2NoZW1hIHZhbGlkYXRvciBlcnJvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ8YW55fSB2YWxcbiAqIEBpbmhlcml0cyBNb25nb29zZUVycm9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0b3JFcnJvciAocGF0aCwgbXNnLCB0eXBlLCB2YWwpIHtcbiAgaWYgKCFtc2cpIG1zZyA9IGVycm9yTWVzc2FnZXMuZ2VuZXJhbC5kZWZhdWx0O1xuICB2YXIgbWVzc2FnZSA9IHRoaXMuZm9ybWF0TWVzc2FnZShtc2csIHBhdGgsIHR5cGUsIHZhbCk7XG4gIFN0b3JhZ2VFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuICB0aGlzLm5hbWUgPSAnVmFsaWRhdG9yRXJyb3InO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmtpbmQgPSB0eXBlO1xuICB0aGlzLnZhbHVlID0gdmFsO1xufVxuXG4vKiFcbiAqIHRvU3RyaW5nIGhlbHBlclxuICovXG5cblZhbGlkYXRvckVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIE1vbmdvb3NlRXJyb3JcbiAqL1xuXG5WYWxpZGF0b3JFcnJvci5wcm90b3R5cGUuX19wcm90b19fID0gU3RvcmFnZUVycm9yLnByb3RvdHlwZTtcblxuLyohXG4gKiBleHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JFcnJvcjtcbiIsIi8vIEJhY2tib25lLkV2ZW50c1xyXG4vLyAtLS0tLS0tLS0tLS0tLS1cclxuXHJcbi8vIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcclxuLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xyXG4vLyBmdW5jdGlvbnMgdG8gYW4gZXZlbnQ7IGB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpblxyXG4vLyBzdWNjZXNzaW9uLlxyXG4vL1xyXG4vLyAgICAgdmFyIG9iamVjdCA9IHt9O1xyXG4vLyAgICAgXy5leHRlbmQob2JqZWN0LCBFdmVudHMucHJvdG90eXBlKTtcclxuLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xyXG4vLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xyXG4vL1xyXG5mdW5jdGlvbiBFdmVudHMoKSB7fVxyXG5cclxuRXZlbnRzLnByb3RvdHlwZSA9IHtcclxuXHJcbiAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxyXG4gIC8vIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxyXG4gIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xyXG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcclxuICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xyXG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xyXG4gICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8vIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcclxuICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxyXG4gIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XHJcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcclxuICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XHJcbiAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICB9KTtcclxuICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XHJcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcclxuICB9LFxyXG5cclxuICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcclxuICAvLyBjYWxsYmFja3Mgd2l0aCB0aGF0IGZ1bmN0aW9uLiBJZiBgY2FsbGJhY2tgIGlzIG51bGwsIHJlbW92ZXMgYWxsXHJcbiAgLy8gY2FsbGJhY2tzIGZvciB0aGUgZXZlbnQuIElmIGBuYW1lYCBpcyBudWxsLCByZW1vdmVzIGFsbCBib3VuZFxyXG4gIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cclxuICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XHJcbiAgICB2YXIgcmV0YWluLCBldiwgZXZlbnRzLCBuYW1lcywgaSwgbCwgaiwgaztcclxuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcclxuICAgIGlmICghbmFtZSAmJiAhY2FsbGJhY2sgJiYgIWNvbnRleHQpIHtcclxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XHJcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIG5hbWUgPSBuYW1lc1tpXTtcclxuICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xyXG4gICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xyXG4gICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XHJcbiAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xyXG4gICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcclxuICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcclxuICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xyXG4gICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvLyBUcmlnZ2VyIG9uZSBvciBtYW55IGV2ZW50cywgZmlyaW5nIGFsbCBib3VuZCBjYWxsYmFja3MuIENhbGxiYWNrcyBhcmVcclxuICAvLyBwYXNzZWQgdGhlIHNhbWUgYXJndW1lbnRzIGFzIGB0cmlnZ2VyYCBpcywgYXBhcnQgZnJvbSB0aGUgZXZlbnQgbmFtZVxyXG4gIC8vICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xyXG4gIC8vIHJlY2VpdmUgdGhlIHRydWUgbmFtZSBvZiB0aGUgZXZlbnQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50KS5cclxuICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XHJcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XHJcbiAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcclxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XHJcbiAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcclxuICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcclxuICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLy8gVGVsbCB0aGlzIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBlaXRoZXIgc3BlY2lmaWMgZXZlbnRzIC4uLiBvclxyXG4gIC8vIHRvIGV2ZXJ5IG9iamVjdCBpdCdzIGN1cnJlbnRseSBsaXN0ZW5pbmcgdG8uXHJcbiAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG87XHJcbiAgICBpZiAoIWxpc3RlbmluZ1RvKSByZXR1cm4gdGhpcztcclxuICAgIHZhciByZW1vdmUgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XHJcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xyXG4gICAgaWYgKG9iaikgKGxpc3RlbmluZ1RvID0ge30pW29iai5fbGlzdGVuSWRdID0gb2JqO1xyXG4gICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuaW5nVG8pIHtcclxuICAgICAgb2JqID0gbGlzdGVuaW5nVG9baWRdO1xyXG4gICAgICBvYmoub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcclxuICAgICAgaWYgKHJlbW92ZSB8fCBfLmlzRW1wdHkob2JqLl9ldmVudHMpKSBkZWxldGUgdGhpcy5fbGlzdGVuaW5nVG9baWRdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG59O1xyXG5cclxuLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cclxudmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XHJcblxyXG4vLyBJbXBsZW1lbnQgZmFuY3kgZmVhdHVyZXMgb2YgdGhlIEV2ZW50cyBBUEkgc3VjaCBhcyBtdWx0aXBsZSBldmVudFxyXG4vLyBuYW1lcyBgXCJjaGFuZ2UgYmx1clwiYCBhbmQgalF1ZXJ5LXN0eWxlIGV2ZW50IG1hcHMgYHtjaGFuZ2U6IGFjdGlvbn1gXHJcbi8vIGluIHRlcm1zIG9mIHRoZSBleGlzdGluZyBBUEkuXHJcbnZhciBldmVudHNBcGkgPSBmdW5jdGlvbihvYmosIGFjdGlvbiwgbmFtZSwgcmVzdCkge1xyXG4gIGlmICghbmFtZSkgcmV0dXJuIHRydWU7XHJcblxyXG4gIC8vIEhhbmRsZSBldmVudCBtYXBzLlxyXG4gIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcclxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XHJcbiAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cclxuICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XHJcbiAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXHJcbi8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcclxuLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxyXG52YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xyXG4gIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcclxuICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XHJcbiAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xyXG4gICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XHJcbiAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XHJcbiAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xyXG4gICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcclxuICB9XHJcbn07XHJcblxyXG52YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xyXG5cclxuLy8gSW52ZXJzaW9uLW9mLWNvbnRyb2wgdmVyc2lvbnMgb2YgYG9uYCBhbmQgYG9uY2VgLiBUZWxsICp0aGlzKiBvYmplY3QgdG9cclxuLy8gbGlzdGVuIHRvIGFuIGV2ZW50IGluIGFub3RoZXIgb2JqZWN0IC4uLiBrZWVwaW5nIHRyYWNrIG9mIHdoYXQgaXQnc1xyXG4vLyBsaXN0ZW5pbmcgdG8uXHJcbl8uZWFjaChsaXN0ZW5NZXRob2RzLCBmdW5jdGlvbihpbXBsZW1lbnRhdGlvbiwgbWV0aG9kKSB7XHJcbiAgRXZlbnRzW21ldGhvZF0gPSBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgbGlzdGVuaW5nVG8gPSB0aGlzLl9saXN0ZW5pbmdUbyB8fCAodGhpcy5fbGlzdGVuaW5nVG8gPSB7fSk7XHJcbiAgICB2YXIgaWQgPSBvYmouX2xpc3RlbklkIHx8IChvYmouX2xpc3RlbklkID0gXy51bmlxdWVJZCgnbCcpKTtcclxuICAgIGxpc3RlbmluZ1RvW2lkXSA9IG9iajtcclxuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XHJcbiAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH07XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XHJcbiIsIi8vINCc0LDRiNC40L3QsCDRgdC+0YHRgtC+0Y/QvdC40Lkg0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC00LvRjyDQv9C+0LzQtdGC0LrQuCwg0LIg0LrQsNC60L7QvCDRgdC+0YHRgtC+0Y/QvdC40Lgg0L3QsNGF0L7QtNGP0YLRgdGPINC/0L7Qu9C1XG4vLyDQndCw0L/RgNC40LzQtdGAOiDQtdGB0LvQuCDQv9C+0LvQtSDQuNC80LXQtdGCINGB0L7RgdGC0L7Rj9C90LjQtSBkZWZhdWx0IC0g0LfQvdCw0YfQuNGCINC10LPQviDQt9C90LDRh9C10L3QuNC10Lwg0Y/QstC70Y/QtdGC0YHRjyDQt9C90LDRh9C10L3QuNC1INC/0L4g0YPQvNC+0LvRh9Cw0L3QuNGOXG4vLyDQn9GA0LjQvNC10YfQsNC90LjQtTog0LTQu9GPINC80LDRgdGB0LjQstC+0LIg0LIg0L7QsdGJ0LXQvCDRgdC70YPRh9Cw0LUg0Y3RgtC+INC+0LfQvdCw0YfQsNC10YIg0L/Rg9GB0YLQvtC5INC80LDRgdGB0LjQslxuXG4vKiFcbiAqIERlcGVuZGVuY2llc1xuICovXG5cbnZhciBTdGF0ZU1hY2hpbmUgPSByZXF1aXJlKCcuL3N0YXRlbWFjaGluZScpO1xuXG52YXIgQWN0aXZlUm9zdGVyID0gU3RhdGVNYWNoaW5lLmN0b3IoJ3JlcXVpcmUnLCAnbW9kaWZ5JywgJ2luaXQnLCAnZGVmYXVsdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVybmFsQ2FjaGU7XG5cbmZ1bmN0aW9uIEludGVybmFsQ2FjaGUgKCkge1xuICB0aGlzLnN0cmljdE1vZGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2VsZWN0ZWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMuc2F2ZUVycm9yID0gdW5kZWZpbmVkO1xuICB0aGlzLnZhbGlkYXRpb25FcnJvciA9IHVuZGVmaW5lZDtcbiAgdGhpcy5hZGhvY1BhdGhzID0gdW5kZWZpbmVkO1xuICB0aGlzLnJlbW92aW5nID0gdW5kZWZpbmVkO1xuICB0aGlzLmluc2VydGluZyA9IHVuZGVmaW5lZDtcbiAgdGhpcy52ZXJzaW9uID0gdW5kZWZpbmVkO1xuICB0aGlzLmdldHRlcnMgPSB7fTtcbiAgdGhpcy5faWQgPSB1bmRlZmluZWQ7XG4gIHRoaXMucG9wdWxhdGUgPSB1bmRlZmluZWQ7IC8vIHdoYXQgd2Ugd2FudCB0byBwb3B1bGF0ZSBpbiB0aGlzIGRvY1xuICB0aGlzLnBvcHVsYXRlZCA9IHVuZGVmaW5lZDsvLyB0aGUgX2lkcyB0aGF0IGhhdmUgYmVlbiBwb3B1bGF0ZWRcbiAgdGhpcy53YXNQb3B1bGF0ZWQgPSBmYWxzZTsgLy8gaWYgdGhpcyBkb2Mgd2FzIHRoZSByZXN1bHQgb2YgYSBwb3B1bGF0aW9uXG4gIHRoaXMuc2NvcGUgPSB1bmRlZmluZWQ7XG4gIHRoaXMuYWN0aXZlUGF0aHMgPSBuZXcgQWN0aXZlUm9zdGVyO1xuXG4gIC8vIGVtYmVkZGVkIGRvY3NcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gdW5kZWZpbmVkO1xuICB0aGlzLmZ1bGxQYXRoID0gdW5kZWZpbmVkO1xufVxuIiwiLyoqXG4gKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiBvYmplY3QgYG9gIGF0IHRoZSBnaXZlbiBgcGF0aGAuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBvYmogPSB7XG4gKiAgICAgICAgIGNvbW1lbnRzOiBbXG4gKiAgICAgICAgICAgICB7IHRpdGxlOiAnZXhjaXRpbmchJywgX2RvYzogeyB0aXRsZTogJ2dyZWF0IScgfX1cbiAqICAgICAgICAgICAsIHsgdGl0bGU6ICdudW1iZXIgZG9zJyB9XG4gKiAgICAgICAgIF1cbiAqICAgICB9XG4gKlxuICogICAgIG1wYXRoLmdldCgnY29tbWVudHMuMC50aXRsZScsIG8pICAgICAgICAgLy8gJ2V4Y2l0aW5nISdcbiAqICAgICBtcGF0aC5nZXQoJ2NvbW1lbnRzLjAudGl0bGUnLCBvLCAnX2RvYycpIC8vICdncmVhdCEnXG4gKiAgICAgbXBhdGguZ2V0KCdjb21tZW50cy50aXRsZScsIG8pICAgICAgICAgICAvLyBbJ2V4Y2l0aW5nIScsICdudW1iZXIgZG9zJ11cbiAqXG4gKiAgICAgLy8gc3VtbWFyeVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBzcGVjaWFsKVxuICogICAgIG1wYXRoLmdldChwYXRoLCBvLCBtYXApXG4gKiAgICAgbXBhdGguZ2V0KHBhdGgsIG8sIHNwZWNpYWwsIG1hcClcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3BlY2lhbF0gV2hlbiB0aGlzIHByb3BlcnR5IG5hbWUgaXMgcHJlc2VudCBvbiBhbnkgb2JqZWN0IGluIHRoZSBwYXRoLCB3YWxraW5nIHdpbGwgY29udGludWUgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbWFwXSBPcHRpb25hbCBmdW5jdGlvbiB3aGljaCByZWNlaXZlcyBlYWNoIGluZGl2aWR1YWwgZm91bmQgdmFsdWUuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuXG5leHBvcnRzLmdldCA9IGZ1bmN0aW9uIChwYXRoLCBvLCBzcGVjaWFsLCBtYXApIHtcbiAgdmFyIGxvb2t1cDtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIHZhciBvYmogPSBvXG4gICAgLCBwYXJ0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgICAvLyByZWFkaW5nIGEgcHJvcGVydHkgZnJvbSB0aGUgYXJyYXkgaXRlbXNcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuXG4gICAgICByZXR1cm4gb2JqLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbVxuICAgICAgICAgID8gZXhwb3J0cy5nZXQocGF0aHMsIGl0ZW0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXApXG4gICAgICAgICAgOiBtYXAodW5kZWZpbmVkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChsb29rdXApIHtcbiAgICAgIG9iaiA9IGxvb2t1cChvYmosIHBhcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmogPSBzcGVjaWFsICYmIG9ialtzcGVjaWFsXVxuICAgICAgICA/IG9ialtzcGVjaWFsXVtwYXJ0XVxuICAgICAgICA6IG9ialtwYXJ0XTtcbiAgICB9XG5cbiAgICBpZiAoIW9iaikgcmV0dXJuIG1hcChvYmopO1xuICB9XG5cbiAgcmV0dXJuIG1hcChvYmopO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIGB2YWxgIGF0IHRoZSBnaXZlbiBgcGF0aGAgb2Ygb2JqZWN0IGBvYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtBbnl0aGluZ30gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb1xuICogQHBhcmFtIHtTdHJpbmd9IFtzcGVjaWFsXSBXaGVuIHRoaXMgcHJvcGVydHkgbmFtZSBpcyBwcmVzZW50IG9uIGFueSBvYmplY3QgaW4gdGhlIHBhdGgsIHdhbGtpbmcgd2lsbCBjb250aW51ZSBvbiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFttYXBdIE9wdGlvbmFsIGZ1bmN0aW9uIHdoaWNoIGlzIHBhc3NlZCBlYWNoIGluZGl2aWR1YWwgdmFsdWUgYmVmb3JlIHNldHRpbmcgaXQuIFRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIGBtYXBgIGlzIHVzZWQgaW4gdGhlIG9yaWdpbmFsIHZhbHVlcyBwbGFjZS5cbiAqL1xuXG5leHBvcnRzLnNldCA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG8sIHNwZWNpYWwsIG1hcCwgX2NvcHlpbmcpIHtcbiAgdmFyIGxvb2t1cDtcblxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygc3BlY2lhbCkge1xuICAgIGlmIChzcGVjaWFsLmxlbmd0aCA8IDIpIHtcbiAgICAgIG1hcCA9IHNwZWNpYWw7XG4gICAgICBzcGVjaWFsID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb29rdXAgPSBzcGVjaWFsO1xuICAgICAgc3BlY2lhbCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBtYXAgfHwgKG1hcCA9IEspO1xuXG4gIHZhciBwYXJ0cyA9ICdzdHJpbmcnID09IHR5cGVvZiBwYXRoXG4gICAgPyBwYXRoLnNwbGl0KCcuJylcbiAgICA6IHBhdGg7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhcnRzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYHBhdGhgLiBNdXN0IGJlIGVpdGhlciBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIGlmIChudWxsID09IG8pIHJldHVybjtcblxuICAvLyB0aGUgZXhpc3RhbmNlIG9mICQgaW4gYSBwYXRoIHRlbGxzIHVzIGlmIHRoZSB1c2VyIGRlc2lyZXNcbiAgLy8gdGhlIGNvcHlpbmcgb2YgYW4gYXJyYXkgaW5zdGVhZCBvZiBzZXR0aW5nIGVhY2ggdmFsdWUgb2ZcbiAgLy8gdGhlIGFycmF5IHRvIHRoZSBvbmUgYnkgb25lIHRvIG1hdGNoaW5nIHBvc2l0aW9ucyBvZiB0aGVcbiAgLy8gY3VycmVudCBhcnJheS5cbiAgdmFyIGNvcHkgPSBfY29weWluZyB8fCAvXFwkLy50ZXN0KHBhdGgpXG4gICAgLCBvYmogPSBvXG4gICAgLCBwYXJ0XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPCBsZW47ICsraSkge1xuICAgIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgIGlmICgnJCcgPT0gcGFydCkge1xuICAgICAgaWYgKGkgPT0gbGVuIC0gMSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikgJiYgIS9eXFxkKyQvLnRlc3QocGFydCkpIHtcbiAgICAgIHZhciBwYXRocyA9IHBhcnRzLnNsaWNlKGkpO1xuICAgICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9iai5sZW5ndGggJiYgaiA8IHZhbC5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgb2Ygc2luZ2xlIHZhbHVlcyBvZiBhcnJheVxuICAgICAgICAgIGV4cG9ydHMuc2V0KHBhdGhzLCB2YWxbal0sIG9ialtqXSwgc3BlY2lhbCB8fCBsb29rdXAsIG1hcCwgY29weSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgLy8gYXNzaWdubWVudCBvZiBlbnRpcmUgdmFsdWVcbiAgICAgICAgICBleHBvcnRzLnNldChwYXRocywgdmFsLCBvYmpbal0sIHNwZWNpYWwgfHwgbG9va3VwLCBtYXAsIGNvcHkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGxvb2t1cCkge1xuICAgICAgb2JqID0gbG9va3VwKG9iaiwgcGFydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iaiA9IHNwZWNpYWwgJiYgb2JqW3NwZWNpYWxdXG4gICAgICAgID8gb2JqW3NwZWNpYWxdW3BhcnRdXG4gICAgICAgIDogb2JqW3BhcnRdO1xuICAgIH1cblxuICAgIGlmICghb2JqKSByZXR1cm47XG4gIH1cblxuICAvLyBwcm9jZXNzIHRoZSBsYXN0IHByb3BlcnR5IG9mIHRoZSBwYXRoXG5cbiAgcGFydCA9IHBhcnRzW2xlbl07XG5cbiAgLy8gdXNlIHRoZSBzcGVjaWFsIHByb3BlcnR5IGlmIGV4aXN0c1xuICBpZiAoc3BlY2lhbCAmJiBvYmpbc3BlY2lhbF0pIHtcbiAgICBvYmogPSBvYmpbc3BlY2lhbF07XG4gIH1cblxuICAvLyBzZXQgdGhlIHZhbHVlIG9uIHRoZSBsYXN0IGJyYW5jaFxuICBpZiAoQXJyYXkuaXNBcnJheShvYmopICYmICEvXlxcZCskLy50ZXN0KHBhcnQpKSB7XG4gICAgaWYgKCFjb3B5ICYmIEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgZm9yICh2YXIgaXRlbSwgaiA9IDA7IGogPCBvYmoubGVuZ3RoICYmIGogPCB2YWwubGVuZ3RoOyArK2opIHtcbiAgICAgICAgaXRlbSA9IG9ialtqXTtcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBpZiAobG9va3VwKSB7XG4gICAgICAgICAgICBsb29rdXAoaXRlbSwgcGFydCwgbWFwKHZhbFtqXSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXRlbVtzcGVjaWFsXSkgaXRlbSA9IGl0ZW1bc3BlY2lhbF07XG4gICAgICAgICAgICBpdGVtW3BhcnRdID0gbWFwKHZhbFtqXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb2JqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGl0ZW0gPSBvYmpbal07XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGxvb2t1cCkge1xuICAgICAgICAgICAgbG9va3VwKGl0ZW0sIHBhcnQsIG1hcCh2YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGl0ZW1bc3BlY2lhbF0pIGl0ZW0gPSBpdGVtW3NwZWNpYWxdO1xuICAgICAgICAgICAgaXRlbVtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAobG9va3VwKSB7XG4gICAgICBsb29rdXAob2JqLCBwYXJ0LCBtYXAodmFsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtwYXJ0XSA9IG1hcCh2YWwpO1xuICAgIH1cbiAgfVxufVxuXG4vKiFcbiAqIFJldHVybnMgdGhlIHZhbHVlIHBhc3NlZCB0byBpdC5cbiAqL1xuXG5mdW5jdGlvbiBLICh2KSB7XG4gIHJldHVybiB2O1xufSIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxuICAsIFZpcnR1YWxUeXBlID0gcmVxdWlyZSgnLi92aXJ0dWFsdHlwZScpXG4gICwgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbiAgLCBUeXBlc1xuICAsIHNjaGVtYXM7XG5cbi8qKlxuICogU2NoZW1hIGNvbnN0cnVjdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgY2hpbGQgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0pO1xuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nLCBhZ2U6IE51bWJlciwgY2hpbGRyZW46IFtjaGlsZF0gfSk7XG4gKiAgICAgdmFyIFRyZWUgPSBtb25nb29zZS5tb2RlbCgnVHJlZScsIHNjaGVtYSk7XG4gKlxuICogICAgIC8vIHNldHRpbmcgc2NoZW1hIG9wdGlvbnNcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogU3RyaW5nIH0sIHsgX2lkOiBmYWxzZSwgYXV0b0luZGV4OiBmYWxzZSB9KVxuICpcbiAqICMjIyNPcHRpb25zOlxuICpcbiAqIC0gW2NvbGxlY3Rpb25dKC9kb2NzL2d1aWRlLmh0bWwjY29sbGVjdGlvbik6IHN0cmluZyAtIG5vIGRlZmF1bHRcbiAqIC0gW2lkXSgvZG9jcy9ndWlkZS5odG1sI2lkKTogYm9vbCAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gYG1pbmltaXplYDogYm9vbCAtIGNvbnRyb2xzIFtkb2N1bWVudCN0b09iamVjdF0oI2RvY3VtZW50X0RvY3VtZW50LXRvT2JqZWN0KSBiZWhhdmlvciB3aGVuIGNhbGxlZCBtYW51YWxseSAtIGRlZmF1bHRzIHRvIHRydWVcbiAqIC0gW3N0cmljdF0oL2RvY3MvZ3VpZGUuaHRtbCNzdHJpY3QpOiBib29sIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICogLSBbdG9KU09OXSgvZG9jcy9ndWlkZS5odG1sI3RvSlNPTikgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt0b09iamVjdF0oL2RvY3MvZ3VpZGUuaHRtbCN0b09iamVjdCkgLSBvYmplY3QgLSBubyBkZWZhdWx0XG4gKiAtIFt2ZXJzaW9uS2V5XSgvZG9jcy9ndWlkZS5odG1sI3ZlcnNpb25LZXkpOiBib29sIC0gZGVmYXVsdHMgdG8gXCJfX3ZcIlxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9XaGVuIG5lc3Rpbmcgc2NoZW1hcywgKGBjaGlsZHJlbmAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLCBhbHdheXMgZGVjbGFyZSB0aGUgY2hpbGQgc2NoZW1hIGZpcnN0IGJlZm9yZSBwYXNzaW5nIGl0IGludG8gaXMgcGFyZW50Ll9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3x1bmRlZmluZWR9IFtuYW1lXSDQndCw0LfQstCw0L3QuNC1INGB0YXQtdC80YtcbiAqIEBwYXJhbSB7U2NoZW1hfSBbYmFzZVNjaGVtYV0g0JHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCDQv9GA0Lgg0L3QsNGB0LvQtdC00L7QstCw0L3QuNC4XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqINCh0YXQtdC80LBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFNjaGVtYSAoIG5hbWUsIGJhc2VTY2hlbWEsIG9iaiwgb3B0aW9ucyApIHtcbiAgaWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBTY2hlbWEpIClcbiAgICByZXR1cm4gbmV3IFNjaGVtYSggbmFtZSwgYmFzZVNjaGVtYSwgb2JqLCBvcHRpb25zICk7XG5cbiAgLy8g0JXRgdC70Lgg0Y3RgtC+INC40LzQtdC90L7QstCw0L3QsNGPINGB0YXQtdC80LBcbiAgaWYgKCB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgKXtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHNjaGVtYXNbIG5hbWUgXSA9IHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgb3B0aW9ucyA9IG9iajtcbiAgICBvYmogPSBiYXNlU2NoZW1hO1xuICAgIGJhc2VTY2hlbWEgPSBuYW1lO1xuICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoICEoYmFzZVNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkgKXtcbiAgICBvcHRpb25zID0gb2JqO1xuICAgIG9iaiA9IGJhc2VTY2hlbWE7XG4gICAgYmFzZVNjaGVtYSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vINCh0L7RhdGA0LDQvdC40Lwg0L7Qv9C40YHQsNC90LjQtSDRgdGF0LXQvNGLINC00LvRjyDQv9C+0LTQtNC10YDQttC60Lgg0LTQuNGB0LrRgNC40LzQuNC90LDRgtC+0YDQvtCyXG4gIHRoaXMuc291cmNlID0gb2JqO1xuXG4gIHRoaXMucGF0aHMgPSB7fTtcbiAgdGhpcy5zdWJwYXRocyA9IHt9O1xuICB0aGlzLnZpcnR1YWxzID0ge307XG4gIHRoaXMubmVzdGVkID0ge307XG4gIHRoaXMuaW5oZXJpdHMgPSB7fTtcbiAgdGhpcy5jYWxsUXVldWUgPSBbXTtcbiAgdGhpcy5tZXRob2RzID0ge307XG4gIHRoaXMuc3RhdGljcyA9IHt9O1xuICB0aGlzLnRyZWUgPSB7fTtcbiAgdGhpcy5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDtcbiAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHVuZGVmaW5lZDtcblxuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmRlZmF1bHRPcHRpb25zKCBvcHRpb25zICk7XG5cbiAgaWYgKCBiYXNlU2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hICl7XG4gICAgYmFzZVNjaGVtYS5kaXNjcmltaW5hdG9yKCBuYW1lLCB0aGlzICk7XG5cbiAgICAvL3RoaXMuZGlzY3JpbWluYXRvciggbmFtZSwgYmFzZVNjaGVtYSApO1xuICB9XG5cbiAgLy8gYnVpbGQgcGF0aHNcbiAgaWYgKCBvYmogKSB7XG4gICAgdGhpcy5hZGQoIG9iaiApO1xuICB9XG5cbiAgLy8gZW5zdXJlIHRoZSBkb2N1bWVudHMgZ2V0IGFuIGF1dG8gX2lkIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b19pZCA9ICF0aGlzLnBhdGhzWydfaWQnXSAmJiAoIXRoaXMub3B0aW9ucy5ub0lkICYmIHRoaXMub3B0aW9ucy5faWQpO1xuICBpZiAoYXV0b19pZCkge1xuICAgIHRoaXMuYWRkKHsgX2lkOiB7dHlwZTogU2NoZW1hLk9iamVjdElkLCBhdXRvOiB0cnVlfSB9KTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB0aGUgZG9jdW1lbnRzIHJlY2VpdmUgYW4gaWQgZ2V0dGVyIHVubGVzcyBkaXNhYmxlZFxuICB2YXIgYXV0b2lkID0gIXRoaXMucGF0aHNbJ2lkJ10gJiYgdGhpcy5vcHRpb25zLmlkO1xuICBpZiAoIGF1dG9pZCApIHtcbiAgICB0aGlzLnZpcnR1YWwoJ2lkJykuZ2V0KCBpZEdldHRlciApO1xuICB9XG59XG5cbi8qIVxuICogUmV0dXJucyB0aGlzIGRvY3VtZW50cyBfaWQgY2FzdCB0byBhIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gaWRHZXR0ZXIgKCkge1xuICBpZiAodGhpcy4kX18uX2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuJF9fLl9pZDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5faWQgPSBudWxsID09IHRoaXMuX2lkXG4gICAgPyBudWxsXG4gICAgOiBTdHJpbmcodGhpcy5faWQpO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIuXG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS5fX3Byb3RvX18gPSBFdmVudHMucHJvdG90eXBlO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBmbGF0IHBhdGhzXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKiAgICAge1xuICogICAgICAgICAnX2lkJyAgICAgICAgOiBTY2hlbWFUeXBlLFxuICogICAgICAgLCAnbmVzdGVkLmtleScgOiBTY2hlbWFUeXBlLFxuICogICAgIH1cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqIEBwcm9wZXJ0eSBwYXRoc1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGhzO1xuXG4vKipcbiAqIFNjaGVtYSBhcyBhIHRyZWVcbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqICAgICB7XG4gKiAgICAgICAgICdfaWQnICAgICA6IE9iamVjdElkXG4gKiAgICAgICAsICduZXN0ZWQnICA6IHtcbiAqICAgICAgICAgICAgICdrZXknIDogU3RyaW5nXG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKiBAcHJvcGVydHkgdHJlZVxuICovXG5TY2hlbWEucHJvdG90eXBlLnRyZWU7XG5cbi8qKlxuICogUmV0dXJucyBkZWZhdWx0IG9wdGlvbnMgZm9yIHRoaXMgc2NoZW1hLCBtZXJnZWQgd2l0aCBgb3B0aW9uc2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEucHJvdG90eXBlLmRlZmF1bHRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9ICQuZXh0ZW5kKHtcbiAgICAgIHN0cmljdDogdHJ1ZVxuICAgICwgdmVyc2lvbktleTogJ19fdidcbiAgICAsIGRpc2NyaW1pbmF0b3JLZXk6ICdfX3QnXG4gICAgLCBtaW5pbWl6ZTogdHJ1ZVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIG9ubHkgYXBwbGllZCBhdCBjb25zdHJ1Y3Rpb24gdGltZVxuICAgICwgX2lkOiB0cnVlXG4gICAgLCBpZDogdHJ1ZVxuICB9LCBvcHRpb25zICk7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZHMga2V5IHBhdGggLyBzY2hlbWEgdHlwZSBwYWlycyB0byB0aGlzIHNjaGVtYS5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIFRveVNjaGVtYSA9IG5ldyBTY2hlbWE7XG4gKiAgICAgVG95U2NoZW1hLmFkZCh7IG5hbWU6ICdzdHJpbmcnLCBjb2xvcjogJ3N0cmluZycsIHByaWNlOiAnbnVtYmVyJyB9KTtcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCAoIG9iaiwgcHJlZml4ICkge1xuICBwcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoIG9iaiApO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgaWYgKG51bGwgPT0gb2JqWyBrZXkgXSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCB2YWx1ZSBmb3Igc2NoZW1hIHBhdGggYCcrIHByZWZpeCArIGtleSArJ2AnKTtcbiAgICB9XG5cbiAgICBpZiAoIF8uaXNQbGFpbk9iamVjdChvYmpba2V5XSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLmNvbnN0cnVjdG9yIHx8ICdPYmplY3QnID09IG9ialsga2V5IF0uY29uc3RydWN0b3IubmFtZSApXG4gICAgICAmJiAoICFvYmpbIGtleSBdLnR5cGUgfHwgb2JqWyBrZXkgXS50eXBlLnR5cGUgKSApe1xuXG4gICAgICBpZiAoIE9iamVjdC5rZXlzKG9ialsga2V5IF0pLmxlbmd0aCApIHtcbiAgICAgICAgLy8gbmVzdGVkIG9iamVjdCB7IGxhc3Q6IHsgbmFtZTogU3RyaW5nIH19XG4gICAgICAgIHRoaXMubmVzdGVkWyBwcmVmaXggKyBrZXkgXSA9IHRydWU7XG4gICAgICAgIHRoaXMuYWRkKCBvYmpbIGtleSBdLCBwcmVmaXggKyBrZXkgKyAnLicpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhdGgoIHByZWZpeCArIGtleSwgb2JqWyBrZXkgXSApOyAvLyBtaXhlZCB0eXBlXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXRoKCBwcmVmaXggKyBrZXksIG9ialsga2V5IF0gKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogUmVzZXJ2ZWQgZG9jdW1lbnQga2V5cy5cbiAqXG4gKiBLZXlzIGluIHRoaXMgb2JqZWN0IGFyZSBuYW1lcyB0aGF0IGFyZSByZWplY3RlZCBpbiBzY2hlbWEgZGVjbGFyYXRpb25zIGIvYyB0aGV5IGNvbmZsaWN0IHdpdGggbW9uZ29vc2UgZnVuY3Rpb25hbGl0eS4gVXNpbmcgdGhlc2Uga2V5IG5hbWUgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqXG4gKiAgICAgIG9uLCBlbWl0LCBfZXZlbnRzLCBkYiwgZ2V0LCBzZXQsIGluaXQsIGlzTmV3LCBlcnJvcnMsIHNjaGVtYSwgb3B0aW9ucywgbW9kZWxOYW1lLCBjb2xsZWN0aW9uLCBfcHJlcywgX3Bvc3RzLCB0b09iamVjdFxuICpcbiAqIF9OT1RFOl8gVXNlIG9mIHRoZXNlIHRlcm1zIGFzIG1ldGhvZCBuYW1lcyBpcyBwZXJtaXR0ZWQsIGJ1dCBwbGF5IGF0IHlvdXIgb3duIHJpc2ssIGFzIHRoZXkgbWF5IGJlIGV4aXN0aW5nIG1vbmdvb3NlIGRvY3VtZW50IG1ldGhvZHMgeW91IGFyZSBzdG9tcGluZyBvbi5cbiAqXG4gKiAgICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICAgc2NoZW1hLm1ldGhvZHMuaW5pdCA9IGZ1bmN0aW9uICgpIHt9IC8vIHBvdGVudGlhbGx5IGJyZWFraW5nXG4gKi9cblNjaGVtYS5yZXNlcnZlZCA9IE9iamVjdC5jcmVhdGUoIG51bGwgKTtcbnZhciByZXNlcnZlZCA9IFNjaGVtYS5yZXNlcnZlZDtcbnJlc2VydmVkLm9uID1cbnJlc2VydmVkLmRiID1cbnJlc2VydmVkLmdldCA9XG5yZXNlcnZlZC5zZXQgPVxucmVzZXJ2ZWQuaW5pdCA9XG5yZXNlcnZlZC5pc05ldyA9XG5yZXNlcnZlZC5lcnJvcnMgPVxucmVzZXJ2ZWQuc2NoZW1hID1cbnJlc2VydmVkLm9wdGlvbnMgPVxucmVzZXJ2ZWQubW9kZWxOYW1lID1cbnJlc2VydmVkLmNvbGxlY3Rpb24gPVxucmVzZXJ2ZWQudG9PYmplY3QgPVxucmVzZXJ2ZWQuZG9tYWluID1cbnJlc2VydmVkLmVtaXQgPSAgICAvLyBFdmVudEVtaXR0ZXJcbnJlc2VydmVkLl9ldmVudHMgPSAvLyBFdmVudEVtaXR0ZXJcbnJlc2VydmVkLl9wcmVzID0gcmVzZXJ2ZWQuX3Bvc3RzID0gMTsgLy8gaG9va3MuanNcblxuLyoqXG4gKiBHZXRzL3NldHMgc2NoZW1hIHBhdGhzLlxuICpcbiAqIFNldHMgYSBwYXRoIChpZiBhcml0eSAyKVxuICogR2V0cyBhIHBhdGggKGlmIGFyaXR5IDEpXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgc2NoZW1hLnBhdGgoJ25hbWUnKSAvLyByZXR1cm5zIGEgU2NoZW1hVHlwZVxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJywgTnVtYmVyKSAvLyBjaGFuZ2VzIHRoZSBzY2hlbWFUeXBlIG9mIGBuYW1lYCB0byBOdW1iZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBhdGggPSBmdW5jdGlvbiAocGF0aCwgb2JqKSB7XG4gIGlmIChvYmogPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHRoaXMucGF0aHNbcGF0aF0pIHJldHVybiB0aGlzLnBhdGhzW3BhdGhdO1xuICAgIGlmICh0aGlzLnN1YnBhdGhzW3BhdGhdKSByZXR1cm4gdGhpcy5zdWJwYXRoc1twYXRoXTtcblxuICAgIC8vIHN1YnBhdGhzP1xuICAgIHJldHVybiAvXFwuXFxkK1xcLj8uKiQvLnRlc3QocGF0aClcbiAgICAgID8gZ2V0UG9zaXRpb25hbFBhdGgodGhpcywgcGF0aClcbiAgICAgIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gc29tZSBwYXRoIG5hbWVzIGNvbmZsaWN0IHdpdGggZG9jdW1lbnQgbWV0aG9kc1xuICBpZiAocmVzZXJ2ZWRbcGF0aF0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJgXCIgKyBwYXRoICsgXCJgIG1heSBub3QgYmUgdXNlZCBhcyBhIHNjaGVtYSBwYXRobmFtZVwiKTtcbiAgfVxuXG4gIC8vIHVwZGF0ZSB0aGUgdHJlZVxuICB2YXIgc3VicGF0aHMgPSBwYXRoLnNwbGl0KC9cXC4vKVxuICAgICwgbGFzdCA9IHN1YnBhdGhzLnBvcCgpXG4gICAgLCBicmFuY2ggPSB0aGlzLnRyZWU7XG5cbiAgc3VicGF0aHMuZm9yRWFjaChmdW5jdGlvbihzdWIsIGkpIHtcbiAgICBpZiAoIWJyYW5jaFtzdWJdKSBicmFuY2hbc3ViXSA9IHt9O1xuICAgIGlmICgnb2JqZWN0JyAhPSB0eXBlb2YgYnJhbmNoW3N1Yl0pIHtcbiAgICAgIHZhciBtc2cgPSAnQ2Fubm90IHNldCBuZXN0ZWQgcGF0aCBgJyArIHBhdGggKyAnYC4gJ1xuICAgICAgICAgICAgICArICdQYXJlbnQgcGF0aCBgJ1xuICAgICAgICAgICAgICArIHN1YnBhdGhzLnNsaWNlKDAsIGkpLmNvbmNhdChbc3ViXSkuam9pbignLicpXG4gICAgICAgICAgICAgICsgJ2AgYWxyZWFkeSBzZXQgdG8gdHlwZSAnICsgYnJhbmNoW3N1Yl0ubmFtZVxuICAgICAgICAgICAgICArICcuJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgIH1cbiAgICBicmFuY2ggPSBicmFuY2hbc3ViXTtcbiAgfSk7XG5cbiAgYnJhbmNoW2xhc3RdID0gdXRpbHMuY2xvbmUob2JqKTtcblxuICB0aGlzLnBhdGhzW3BhdGhdID0gU2NoZW1hLmludGVycHJldEFzVHlwZShwYXRoLCBvYmopO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29udmVydHMgdHlwZSBhcmd1bWVudHMgaW50byBTY2hlbWEgVHlwZXMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogY29uc3RydWN0b3JcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWEuaW50ZXJwcmV0QXNUeXBlID0gZnVuY3Rpb24gKHBhdGgsIG9iaikge1xuICBpZiAob2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lICE9ICdPYmplY3QnKVxuICAgIG9iaiA9IHsgdHlwZTogb2JqIH07XG5cbiAgLy8gR2V0IHRoZSB0eXBlIG1ha2luZyBzdXJlIHRvIGFsbG93IGtleXMgbmFtZWQgXCJ0eXBlXCJcbiAgLy8gYW5kIGRlZmF1bHQgdG8gbWl4ZWQgaWYgbm90IHNwZWNpZmllZC5cbiAgLy8geyB0eXBlOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2ZyZXNoY3V0JyB9IH1cbiAgdmFyIHR5cGUgPSBvYmoudHlwZSAmJiAhb2JqLnR5cGUudHlwZVxuICAgID8gb2JqLnR5cGVcbiAgICA6IHt9O1xuXG4gIGlmICgnT2JqZWN0JyA9PSB0eXBlLmNvbnN0cnVjdG9yLm5hbWUgfHwgJ21peGVkJyA9PSB0eXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlcy5NaXhlZChwYXRoLCBvYmopO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkgfHwgQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpIHtcbiAgICAvLyBpZiBpdCB3YXMgc3BlY2lmaWVkIHRocm91Z2ggeyB0eXBlIH0gbG9vayBmb3IgYGNhc3RgXG4gICAgdmFyIGNhc3QgPSAoQXJyYXkgPT0gdHlwZSB8fCAnYXJyYXknID09IHR5cGUpXG4gICAgICA/IG9iai5jYXN0XG4gICAgICA6IHR5cGVbMF07XG5cbiAgICBpZiAoY2FzdCBpbnN0YW5jZW9mIFNjaGVtYSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlcy5Eb2N1bWVudEFycmF5KHBhdGgsIGNhc3QsIG9iaik7XG4gICAgfVxuXG4gICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBjYXN0KSB7XG4gICAgICBjYXN0ID0gVHlwZXNbY2FzdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNhc3Quc3Vic3RyaW5nKDEpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3QgJiYgKCFjYXN0LnR5cGUgfHwgY2FzdC50eXBlLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgICYmICdPYmplY3QnID09IGNhc3QuY29uc3RydWN0b3IubmFtZVxuICAgICAgICAgICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhjYXN0KS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZXMuRG9jdW1lbnRBcnJheShwYXRoLCBuZXcgU2NoZW1hKGNhc3QpLCBvYmopO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVHlwZXMuQXJyYXkocGF0aCwgY2FzdCB8fCBUeXBlcy5NaXhlZCwgb2JqKTtcbiAgfVxuXG4gIHZhciBuYW1lID0gJ3N0cmluZycgPT0gdHlwZW9mIHR5cGVcbiAgICA/IHR5cGVcbiAgICA6IHR5cGUubmFtZTtcblxuICBpZiAobmFtZSkge1xuICAgIG5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICBpZiAodW5kZWZpbmVkID09IFR5cGVzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5kZWZpbmVkIHR5cGUgYXQgYCcgKyBwYXRoICtcbiAgICAgICAgJ2BcXG4gIERpZCB5b3UgdHJ5IG5lc3RpbmcgU2NoZW1hcz8gJyArXG4gICAgICAgICdZb3UgY2FuIG9ubHkgbmVzdCB1c2luZyByZWZzIG9yIGFycmF5cy4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgVHlwZXNbbmFtZV0ocGF0aCwgb2JqKTtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhlIHNjaGVtYXMgcGF0aHMgc2ltaWxhciB0byBBcnJheSNmb3JFYWNoLlxuICpcbiAqIFRoZSBjYWxsYmFjayBpcyBwYXNzZWQgdGhlIHBhdGhuYW1lIGFuZCBzY2hlbWFUeXBlIGFzIGFyZ3VtZW50cyBvbiBlYWNoIGl0ZXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybiB7U2NoZW1hfSB0aGlzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLmVhY2hQYXRoID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGxlbiA9IGtleXMubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBmbihrZXlzW2ldLCB0aGlzLnBhdGhzW2tleXNbaV1dKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIEFycmF5IG9mIHBhdGggc3RyaW5ncyB0aGF0IGFyZSByZXF1aXJlZCBieSB0aGlzIHNjaGVtYS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblNjaGVtYS5wcm90b3R5cGUucmVxdWlyZWRQYXRocyA9IGZ1bmN0aW9uIHJlcXVpcmVkUGF0aHMgKCkge1xuICBpZiAodGhpcy5fcmVxdWlyZWRwYXRocykgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHM7XG5cbiAgdmFyIHBhdGhzID0gT2JqZWN0LmtleXModGhpcy5wYXRocylcbiAgICAsIGkgPSBwYXRocy5sZW5ndGhcbiAgICAsIHJldCA9IFtdO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIgcGF0aCA9IHBhdGhzW2ldO1xuICAgIGlmICh0aGlzLnBhdGhzW3BhdGhdLmlzUmVxdWlyZWQpIHJldC5wdXNoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3JlcXVpcmVkcGF0aHMgPSByZXQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhdGhUeXBlIG9mIGBwYXRoYCBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogR2l2ZW4gYSBwYXRoLCByZXR1cm5zIHdoZXRoZXIgaXQgaXMgYSByZWFsLCB2aXJ0dWFsLCBuZXN0ZWQsIG9yIGFkLWhvYy91bmRlZmluZWQgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wYXRoVHlwZSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIGlmIChwYXRoIGluIHRoaXMucGF0aHMpIHJldHVybiAncmVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMudmlydHVhbHMpIHJldHVybiAndmlydHVhbCc7XG4gIGlmIChwYXRoIGluIHRoaXMubmVzdGVkKSByZXR1cm4gJ25lc3RlZCc7XG4gIGlmIChwYXRoIGluIHRoaXMuc3VicGF0aHMpIHJldHVybiAncmVhbCc7XG5cbiAgaWYgKC9cXC5cXGQrXFwufFxcLlxcZCskLy50ZXN0KHBhdGgpICYmIGdldFBvc2l0aW9uYWxQYXRoKHRoaXMsIHBhdGgpKSB7XG4gICAgcmV0dXJuICdyZWFsJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ2FkaG9jT3JVbmRlZmluZWQnXG4gIH1cbn07XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGdldFBvc2l0aW9uYWxQYXRoIChzZWxmLCBwYXRoKSB7XG4gIHZhciBzdWJwYXRocyA9IHBhdGguc3BsaXQoL1xcLihcXGQrKVxcLnxcXC4oXFxkKykkLykuZmlsdGVyKEJvb2xlYW4pO1xuICBpZiAoc3VicGF0aHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBzZWxmLnBhdGhzW3N1YnBhdGhzWzBdXTtcbiAgfVxuXG4gIHZhciB2YWwgPSBzZWxmLnBhdGgoc3VicGF0aHNbMF0pO1xuICBpZiAoIXZhbCkgcmV0dXJuIHZhbDtcblxuICB2YXIgbGFzdCA9IHN1YnBhdGhzLmxlbmd0aCAtIDFcbiAgICAsIHN1YnBhdGhcbiAgICAsIGkgPSAxO1xuXG4gIGZvciAoOyBpIDwgc3VicGF0aHMubGVuZ3RoOyArK2kpIHtcbiAgICBzdWJwYXRoID0gc3VicGF0aHNbaV07XG5cbiAgICBpZiAoaSA9PT0gbGFzdCAmJiB2YWwgJiYgIXZhbC5zY2hlbWEgJiYgIS9cXEQvLnRlc3Qoc3VicGF0aCkpIHtcbiAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBUeXBlcy5BcnJheSkge1xuICAgICAgICAvLyBTdHJpbmdTY2hlbWEsIE51bWJlclNjaGVtYSwgZXRjXG4gICAgICAgIHZhbCA9IHZhbC5jYXN0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgaWYgaXRzIGp1c3QgYSBwb3NpdGlvbiBzZWdtZW50OiBwYXRoLjAuc3VicGF0aFxuICAgIGlmICghL1xcRC8udGVzdChzdWJwYXRoKSkgY29udGludWU7XG5cbiAgICBpZiAoISh2YWwgJiYgdmFsLnNjaGVtYSkpIHtcbiAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhbCA9IHZhbC5zY2hlbWEucGF0aChzdWJwYXRoKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnN1YnBhdGhzW3BhdGhdID0gdmFsO1xufVxuXG4vKipcbiAqIEFkZHMgYSBtZXRob2QgY2FsbCB0byB0aGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgZG9jdW1lbnQgbWV0aG9kIHRvIGNhbGwgbGF0ZXJcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYS5wcm90b3R5cGUucXVldWUgPSBmdW5jdGlvbihuYW1lLCBhcmdzKXtcbiAgdGhpcy5jYWxsUXVldWUucHVzaChbbmFtZSwgYXJnc10pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVmaW5lcyBhIHByZSBob29rIGZvciB0aGUgZG9jdW1lbnQuXG4gKlxuICogIyMjI0V4YW1wbGVcbiAqXG4gKiAgICAgdmFyIHRveVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCdzYXZlJywgZnVuY3Rpb24gKG5leHQpIHtcbiAqICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB0aGlzLmNyZWF0ZWQgPSBuZXcgRGF0ZTtcbiAqICAgICAgIG5leHQoKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB0b3lTY2hlbWEucHJlKCd2YWxpZGF0ZScsIGZ1bmN0aW9uIChuZXh0KSB7XG4gKiAgICAgICBpZiAodGhpcy5uYW1lICE9ICdXb29keScpIHRoaXMubmFtZSA9ICdXb29keSc7XG4gKiAgICAgICBuZXh0KCk7XG4gKiAgICAgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHNlZSBob29rcy5qcyBodHRwczovL2dpdGh1Yi5jb20vYm5vZ3VjaGkvaG9va3MtanMvdHJlZS8zMWVjNTcxY2VmMDMzMmUyMTEyMWVlNzE1N2UwY2Y5NzI4NTcyY2MzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnByZSA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdwcmUnLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgcG9zdCBmb3IgdGhlIGRvY3VtZW50XG4gKlxuICogUG9zdCBob29rcyBmaXJlIGBvbmAgdGhlIGV2ZW50IGVtaXR0ZWQgZnJvbSBkb2N1bWVudCBpbnN0YW5jZXMgb2YgTW9kZWxzIGNvbXBpbGVkIGZyb20gdGhpcyBzY2hlbWEuXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEucG9zdCgnc2F2ZScsIGZ1bmN0aW9uIChkb2MpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKCd0aGlzIGZpcmVkIGFmdGVyIGEgZG9jdW1lbnQgd2FzIHNhdmVkJyk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBNb2RlbCA9IG1vbmdvb3NlLm1vZGVsKCdNb2RlbCcsIHNjaGVtYSk7XG4gKlxuICogICAgIHZhciBtID0gbmV3IE1vZGVsKC4uKTtcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coJ3RoaXMgZmlyZXMgYWZ0ZXIgdGhlIGBwb3N0YCBob29rJyk7XG4gKiAgICAgfSk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaG9va1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gY2FsbGJhY2tcbiAqIEBzZWUgaG9va3MuanMgaHR0cHM6Ly9naXRodWIuY29tL2Jub2d1Y2hpL2hvb2tzLWpzL3RyZWUvMzFlYzU3MWNlZjAzMzJlMjExMjFlZTcxNTdlMGNmOTcyODU3MmNjM1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24obWV0aG9kLCBmbil7XG4gIHJldHVybiB0aGlzLnF1ZXVlKCdvbicsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIHBsdWdpbiBmb3IgdGhpcyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGx1Z2luIGNhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQHNlZSBwbHVnaW5zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnBsdWdpbiA9IGZ1bmN0aW9uIChmbiwgb3B0cykge1xuICBmbih0aGlzLCBvcHRzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gaW5zdGFuY2UgbWV0aG9kIHRvIGRvY3VtZW50cyBjb25zdHJ1Y3RlZCBmcm9tIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBraXR0eVNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqICAgICBzY2hlbWEubWV0aG9kKCdtZW93JywgZnVuY3Rpb24gKCkge1xuICogICAgICAgY29uc29sZS5sb2coJ21lZWVlZW9vb29vb29vb29vb3cnKTtcbiAqICAgICB9KVxuICpcbiAqICAgICB2YXIgS2l0dHkgPSBtb25nb29zZS5tb2RlbCgnS2l0dHknLCBzY2hlbWEpO1xuICpcbiAqICAgICB2YXIgZml6eiA9IG5ldyBLaXR0eTtcbiAqICAgICBmaXp6Lm1lb3coKTsgLy8gbWVlZWVlb29vb29vb29vb29vb3dcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgbWV0aG9kcy5cbiAqXG4gKiAgICAgc2NoZW1hLm1ldGhvZCh7XG4gKiAgICAgICAgIHB1cnI6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgICAsIHNjcmF0Y2g6IGZ1bmN0aW9uICgpIHt9XG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIGxhdGVyXG4gKiAgICAgZml6ei5wdXJyKCk7XG4gKiAgICAgZml6ei5zY3JhdGNoKCk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBtZXRob2QgbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMubWV0aG9kc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLm1ldGhvZHNbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgc3RhdGljIFwiY2xhc3NcIiBtZXRob2RzIHRvIE1vZGVscyBjb21waWxlZCBmcm9tIHRoaXMgc2NoZW1hLlxuICpcbiAqICMjIyNFeGFtcGxlXG4gKlxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKC4uKTtcbiAqICAgICBzY2hlbWEuc3RhdGljKCdmaW5kQnlOYW1lJywgZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5maW5kKHsgbmFtZTogbmFtZSB9LCBjYWxsYmFjayk7XG4gKiAgICAgfSk7XG4gKlxuICogICAgIHZhciBEcmluayA9IG1vbmdvb3NlLm1vZGVsKCdEcmluaycsIHNjaGVtYSk7XG4gKiAgICAgRHJpbmsuZmluZEJ5TmFtZSgnc2FucGVsbGVncmlubycsIGZ1bmN0aW9uIChlcnIsIGRyaW5rcykge1xuICogICAgICAgLy9cbiAqICAgICB9KTtcbiAqXG4gKiBJZiBhIGhhc2ggb2YgbmFtZS9mbiBwYWlycyBpcyBwYXNzZWQgYXMgdGhlIG9ubHkgYXJndW1lbnQsIGVhY2ggbmFtZS9mbiBwYWlyIHdpbGwgYmUgYWRkZWQgYXMgc3RhdGljcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5wcm90b3R5cGUuc3RhdGljID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBuYW1lKVxuICAgIGZvciAodmFyIGkgaW4gbmFtZSlcbiAgICAgIHRoaXMuc3RhdGljc1tpXSA9IG5hbWVbaV07XG4gIGVsc2VcbiAgICB0aGlzLnN0YXRpY3NbbmFtZV0gPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMvZ2V0cyBhIHNjaGVtYSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBvcHRpb24gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gaWYgbm90IHBhc3NlZCwgdGhlIGN1cnJlbnQgb3B0aW9uIHZhbHVlIGlzIHJldHVybmVkXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TY2hlbWEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9uc1trZXldO1xuICB9XG5cbiAgc3dpdGNoIChrZXkpIHtcbiAgICBjYXNlICdzYWZlJzpcbiAgICAgIHRoaXMub3B0aW9uc1trZXldID0gZmFsc2UgPT09IHZhbHVlXG4gICAgICAgID8geyB3OiAwIH1cbiAgICAgICAgOiB2YWx1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLm9wdGlvbnNba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgYSBzY2hlbWEgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgb3B0aW9uIG5hbWVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU2NoZW1hLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiB0aGlzLm9wdGlvbnNba2V5XTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHZpcnR1YWwgdHlwZSB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWwgPSBmdW5jdGlvbiAobmFtZSwgb3B0aW9ucykge1xuICB2YXIgdmlydHVhbHMgPSB0aGlzLnZpcnR1YWxzO1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gIHJldHVybiB2aXJ0dWFsc1tuYW1lXSA9IHBhcnRzLnJlZHVjZShmdW5jdGlvbiAobWVtLCBwYXJ0LCBpKSB7XG4gICAgbWVtW3BhcnRdIHx8IChtZW1bcGFydF0gPSAoaSA9PT0gcGFydHMubGVuZ3RoLTEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBuZXcgVmlydHVhbFR5cGUob3B0aW9ucywgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHt9KTtcbiAgICByZXR1cm4gbWVtW3BhcnRdO1xuICB9LCB0aGlzLnRyZWUpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB2aXJ0dWFsIHR5cGUgd2l0aCB0aGUgZ2l2ZW4gYG5hbWVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtWaXJ0dWFsVHlwZX1cbiAqL1xuXG5TY2hlbWEucHJvdG90eXBlLnZpcnR1YWxwYXRoID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMudmlydHVhbHNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyZWQgZGlzY3JpbWluYXRvcnMgZm9yIHRoaXMgc2NoZW1hLlxuICpcbiAqIEBwcm9wZXJ0eSBkaXNjcmltaW5hdG9yc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLmRpc2NyaW1pbmF0b3JzO1xuXG4vKipcbiAqINCd0LDRgdC70LXQtNC+0LLQsNC90LjQtSDQvtGCINGB0YXQtdC80YsuXG4gKiB0aGlzIC0g0LHQsNC30L7QstCw0Y8g0YHRhdC10LzQsCEhIVxuICpcbiAqICMjIyNFeGFtcGxlOlxuICogICAgIHZhciBQZXJzb25TY2hlbWEgPSBuZXcgU2NoZW1hKCdQZXJzb24nLCB7XG4gKiAgICAgICBuYW1lOiBTdHJpbmcsXG4gKiAgICAgICBjcmVhdGVkQXQ6IERhdGVcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgdmFyIEJvc3NTY2hlbWEgPSBuZXcgU2NoZW1hKCdCb3NzJywgUGVyc29uU2NoZW1hLCB7IGRlcGFydG1lbnQ6IFN0cmluZyB9KTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAgIGRpc2NyaW1pbmF0b3IgbW9kZWwgbmFtZVxuICogQHBhcmFtIHtTY2hlbWF9IHNjaGVtYSBkaXNjcmltaW5hdG9yIG1vZGVsIHNjaGVtYVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU2NoZW1hLnByb3RvdHlwZS5kaXNjcmltaW5hdG9yID0gZnVuY3Rpb24gZGlzY3JpbWluYXRvciAobmFtZSwgc2NoZW1hKSB7XG4gIGlmICghKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGEgdmFsaWQgZGlzY3JpbWluYXRvciBTY2hlbWFcIik7XG4gIH1cblxuICBpZiAoIHRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcgJiYgIXRoaXMuZGlzY3JpbWluYXRvck1hcHBpbmcuaXNSb290ICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3IgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBjYW4gb25seSBiZSBhIGRpc2NyaW1pbmF0b3Igb2YgdGhlIHJvb3QgbW9kZWxcIik7XG4gIH1cblxuICB2YXIga2V5ID0gdGhpcy5vcHRpb25zLmRpc2NyaW1pbmF0b3JLZXk7XG4gIGlmICggc2NoZW1hLnBhdGgoa2V5KSApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNjcmltaW5hdG9yIFxcXCJcIiArIG5hbWUgKyBcIlxcXCIgY2Fubm90IGhhdmUgZmllbGQgd2l0aCBuYW1lIFxcXCJcIiArIGtleSArIFwiXFxcIlwiKTtcbiAgfVxuXG4gIC8vIG1lcmdlcyBiYXNlIHNjaGVtYSBpbnRvIG5ldyBkaXNjcmltaW5hdG9yIHNjaGVtYSBhbmQgc2V0cyBuZXcgdHlwZSBmaWVsZC5cbiAgKGZ1bmN0aW9uIG1lcmdlU2NoZW1hcyhzY2hlbWEsIGJhc2VTY2hlbWEpIHtcbiAgICB1dGlscy5tZXJnZShzY2hlbWEsIGJhc2VTY2hlbWEpO1xuXG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9ialtrZXldID0geyB0eXBlOiBTdHJpbmcsIGRlZmF1bHQ6IG5hbWUgfTtcbiAgICBzY2hlbWEuYWRkKG9iaik7XG4gICAgc2NoZW1hLmRpc2NyaW1pbmF0b3JNYXBwaW5nID0geyBrZXk6IGtleSwgdmFsdWU6IG5hbWUsIGlzUm9vdDogZmFsc2UgfTtcblxuICAgIGlmIChiYXNlU2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgc2NoZW1hLm9wdGlvbnMuY29sbGVjdGlvbiA9IGJhc2VTY2hlbWEub3B0aW9ucy5jb2xsZWN0aW9uO1xuICAgIH1cblxuICAgICAgLy8gdGhyb3dzIGVycm9yIGlmIG9wdGlvbnMgYXJlIGludmFsaWRcbiAgICAoZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25zKGEsIGIpIHtcbiAgICAgIGEgPSB1dGlscy5jbG9uZShhKTtcbiAgICAgIGIgPSB1dGlscy5jbG9uZShiKTtcbiAgICAgIGRlbGV0ZSBhLnRvSlNPTjtcbiAgICAgIGRlbGV0ZSBhLnRvT2JqZWN0O1xuICAgICAgZGVsZXRlIGIudG9KU09OO1xuICAgICAgZGVsZXRlIGIudG9PYmplY3Q7XG5cbiAgICAgIGlmICghdXRpbHMuZGVlcEVxdWFsKGEsIGIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2NyaW1pbmF0b3Igb3B0aW9ucyBhcmUgbm90IGN1c3RvbWl6YWJsZSAoZXhjZXB0IHRvSlNPTiAmIHRvT2JqZWN0KVwiKTtcbiAgICAgIH1cbiAgICB9KShzY2hlbWEub3B0aW9ucywgYmFzZVNjaGVtYS5vcHRpb25zKTtcblxuICAgIHZhciB0b0pTT04gPSBzY2hlbWEub3B0aW9ucy50b0pTT05cbiAgICAgICwgdG9PYmplY3QgPSBzY2hlbWEub3B0aW9ucy50b09iamVjdDtcblxuICAgIHNjaGVtYS5vcHRpb25zID0gdXRpbHMuY2xvbmUoYmFzZVNjaGVtYS5vcHRpb25zKTtcbiAgICBpZiAodG9KU09OKSAgIHNjaGVtYS5vcHRpb25zLnRvSlNPTiA9IHRvSlNPTjtcbiAgICBpZiAodG9PYmplY3QpIHNjaGVtYS5vcHRpb25zLnRvT2JqZWN0ID0gdG9PYmplY3Q7XG5cbiAgICBzY2hlbWEuY2FsbFF1ZXVlID0gYmFzZVNjaGVtYS5jYWxsUXVldWUuY29uY2F0KHNjaGVtYS5jYWxsUXVldWUpO1xuICAgIHNjaGVtYS5fcmVxdWlyZWRwYXRocyA9IHVuZGVmaW5lZDsgLy8gcmVzZXQganVzdCBpbiBjYXNlIFNjaGVtYSNyZXF1aXJlZFBhdGhzKCkgd2FzIGNhbGxlZCBvbiBlaXRoZXIgc2NoZW1hXG4gIH0pKHNjaGVtYSwgdGhpcyk7XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JzKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9ycyA9IHt9O1xuICB9XG5cbiAgaWYgKCF0aGlzLmRpc2NyaW1pbmF0b3JNYXBwaW5nKSB7XG4gICAgdGhpcy5kaXNjcmltaW5hdG9yTWFwcGluZyA9IHsga2V5OiBrZXksIHZhbHVlOiBudWxsLCBpc1Jvb3Q6IHRydWUgfTtcbiAgfVxuXG4gIGlmICh0aGlzLmRpc2NyaW1pbmF0b3JzW25hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzY3JpbWluYXRvciB3aXRoIG5hbWUgXFxcIlwiICsgbmFtZSArIFwiXFxcIiBhbHJlYWR5IGV4aXN0c1wiKTtcbiAgfVxuXG4gIHRoaXMuZGlzY3JpbWluYXRvcnNbbmFtZV0gPSBzY2hlbWE7XG59O1xuXG4vKiFcbiAqIGV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYTtcbndpbmRvdy5TY2hlbWEgPSBTY2hlbWE7XG5cbi8vIHJlcXVpcmUgZG93biBoZXJlIGJlY2F1c2Ugb2YgcmVmZXJlbmNlIGlzc3Vlc1xuXG4vKipcbiAqIFRoZSB2YXJpb3VzIGJ1aWx0LWluIE1vbmdvb3NlIFNjaGVtYSBUeXBlcy5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIG1vbmdvb3NlID0gcmVxdWlyZSgnbW9uZ29vc2UnKTtcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuT2JqZWN0SWQ7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW1N0cmluZ10oI3NjaGVtYS1zdHJpbmctanMpXG4gKiAtIFtOdW1iZXJdKCNzY2hlbWEtbnVtYmVyLWpzKVxuICogLSBbQm9vbGVhbl0oI3NjaGVtYS1ib29sZWFuLWpzKSB8IEJvb2xcbiAqIC0gW0FycmF5XSgjc2NoZW1hLWFycmF5LWpzKVxuICogLSBbRGF0ZV0oI3NjaGVtYS1kYXRlLWpzKVxuICogLSBbT2JqZWN0SWRdKCNzY2hlbWEtb2JqZWN0aWQtanMpIHwgT2lkXG4gKiAtIFtNaXhlZF0oI3NjaGVtYS1taXhlZC1qcykgfCBPYmplY3RcbiAqXG4gKiBVc2luZyB0aGlzIGV4cG9zZWQgYWNjZXNzIHRvIHRoZSBgTWl4ZWRgIFNjaGVtYVR5cGUsIHdlIGNhbiB1c2UgdGhlbSBpbiBvdXIgc2NoZW1hLlxuICpcbiAqICAgICB2YXIgTWl4ZWQgPSBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQ7XG4gKiAgICAgbmV3IG1vbmdvb3NlLlNjaGVtYSh7IF91c2VyOiBNaXhlZCB9KVxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblNjaGVtYS5UeXBlcyA9IHJlcXVpcmUoJy4vc2NoZW1hL2luZGV4Jyk7XG5cbi8vINCl0YDQsNC90LjQu9C40YnQtSDRgdGF0LXQvFxuU2NoZW1hLnNjaGVtYXMgPSBzY2hlbWFzID0ge307XG5cblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5UeXBlcyA9IFNjaGVtYS5UeXBlcztcbnZhciBPYmplY3RJZCA9IFNjaGVtYS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcbiAgLCBUeXBlcyA9IHtcbiAgICAgICAgQm9vbGVhbjogcmVxdWlyZSgnLi9ib29sZWFuJylcbiAgICAgICwgRGF0ZTogcmVxdWlyZSgnLi9kYXRlJylcbiAgICAgICwgTnVtYmVyOiByZXF1aXJlKCcuL251bWJlcicpXG4gICAgICAsIFN0cmluZzogcmVxdWlyZSgnLi9zdHJpbmcnKVxuICAgICAgLCBPYmplY3RJZDogcmVxdWlyZSgnLi9vYmplY3RpZCcpXG4gICAgfVxuICAsIFN0b3JhZ2VBcnJheSA9IHJlcXVpcmUoJy4uL3R5cGVzJykuQXJyYXlcbiAgLCBFbWJlZGRlZERvYyA9IHJlcXVpcmUoJy4uL3R5cGVzJykuRW1iZWRkZWRcbiAgLCBNaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKVxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuY29uc29sZS5sb2coIFNjaGVtYVR5cGUgKTtcblxuLyoqXG4gKiBBcnJheSBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTY2hlbWFUeXBlfSBjYXN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBTY2hlbWFBcnJheSAoa2V5LCBjYXN0LCBvcHRpb25zKSB7XG4gIGlmIChjYXN0KSB7XG4gICAgdmFyIGNhc3RPcHRpb25zID0ge307XG5cbiAgICBpZiAoJ09iamVjdCcgPT09IGNhc3QuY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgaWYgKGNhc3QudHlwZSkge1xuICAgICAgICAvLyBzdXBwb3J0IHsgdHlwZTogV29vdCB9XG4gICAgICAgIGNhc3RPcHRpb25zID0gXy5jbG9uZSggY2FzdCApOyAvLyBkbyBub3QgYWx0ZXIgdXNlciBhcmd1bWVudHNcbiAgICAgICAgZGVsZXRlIGNhc3RPcHRpb25zLnR5cGU7XG4gICAgICAgIGNhc3QgPSBjYXN0LnR5cGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXN0ID0gTWl4ZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3VwcG9ydCB7IHR5cGU6ICdTdHJpbmcnIH1cbiAgICB2YXIgbmFtZSA9ICdzdHJpbmcnID09IHR5cGVvZiBjYXN0XG4gICAgICA/IGNhc3RcbiAgICAgIDogY2FzdC5uYW1lO1xuXG4gICAgdmFyIGNhc3RlciA9IG5hbWUgaW4gVHlwZXNcbiAgICAgID8gVHlwZXNbbmFtZV1cbiAgICAgIDogY2FzdDtcblxuICAgIHRoaXMuY2FzdGVyQ29uc3RydWN0b3IgPSBjYXN0ZXI7XG4gICAgdGhpcy5jYXN0ZXIgPSBuZXcgY2FzdGVyKG51bGwsIGNhc3RPcHRpb25zKTtcbiAgICBpZiAoISh0aGlzLmNhc3RlciBpbnN0YW5jZW9mIEVtYmVkZGVkRG9jKSkge1xuICAgICAgdGhpcy5jYXN0ZXIucGF0aCA9IGtleTtcbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zKTtcblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgICAsIGRlZmF1bHRBcnJcbiAgICAsIGZuO1xuXG4gIGlmICh0aGlzLmRlZmF1bHRWYWx1ZSkge1xuICAgIGRlZmF1bHRBcnIgPSB0aGlzLmRlZmF1bHRWYWx1ZTtcbiAgICBmbiA9ICdmdW5jdGlvbicgPT0gdHlwZW9mIGRlZmF1bHRBcnI7XG4gIH1cblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4gPyBkZWZhdWx0QXJyKCkgOiBkZWZhdWx0QXJyIHx8IFtdO1xuICAgIHJldHVybiBuZXcgU3RvcmFnZUFycmF5KGFyciwgc2VsZi5wYXRoLCB0aGlzKTtcbiAgfSk7XG59XG5cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIFNjaGVtYVR5cGUuXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5fX3Byb3RvX18gPSBTY2hlbWFUeXBlLnByb3RvdHlwZTtcblxuLyoqXG4gKiBDaGVjayByZXF1aXJlZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU2NoZW1hQXJyYXkucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLmxlbmd0aCk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyB0aGUgZ2V0dGVycyBhcHBsaWNhdGlvbiBmb3IgdGhlIHBvcHVsYXRpb24gc3BlY2lhbC1jYXNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TY2hlbWFBcnJheS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xuICBpZiAodGhpcy5jYXN0ZXIub3B0aW9ucyAmJiB0aGlzLmNhc3Rlci5vcHRpb25zLnJlZikge1xuICAgIC8vIG1lYW5zIHRoZSBvYmplY3QgaWQgd2FzIHBvcHVsYXRlZFxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBTY2hlbWFUeXBlLnByb3RvdHlwZS5hcHBseUdldHRlcnMuY2FsbCh0aGlzLCB2YWx1ZSwgc2NvcGUpO1xufTtcblxuLyoqXG4gKiBDYXN0cyB2YWx1ZXMgZm9yIHNldCgpLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIGRvY3VtZW50IHRoYXQgdHJpZ2dlcnMgdGhlIGNhc3RpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaW5pdCB3aGV0aGVyIHRoaXMgaXMgYW4gaW5pdGlhbGl6YXRpb24gY2FzdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblNjaGVtYUFycmF5LnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSwgZG9jLCBpbml0ICkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIFN0b3JhZ2VBcnJheSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IFN0b3JhZ2VBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhc3Rlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YWx1ZVtpXSA9IHRoaXMuY2FzdGVyLmNhc3QodmFsdWVbaV0sIGRvYywgaW5pdCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gcmV0aHJvd1xuICAgICAgICB0aHJvdyBuZXcgQ2FzdEVycm9yKGUudHlwZSwgdmFsdWUsIHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmNhc3QoW3ZhbHVlXSwgZG9jLCBpbml0KTtcbiAgfVxufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjaGVtYUFycmF5O1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xuXG4vKipcbiAqIEJvb2xlYW4gU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gQm9vbGVhblNjaGVtYSAocGF0aCwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5Cb29sZWFuU2NoZW1hLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTY2hlbWFUeXBlLnByb3RvdHlwZTtcblxuLyoqXG4gKiBSZXF1aXJlZCB2YWxpZGF0b3JcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlO1xufTtcblxuLyoqXG4gKiBDYXN0cyB0byBib29sZWFuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuQm9vbGVhblNjaGVtYS5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAobnVsbCA9PT0gdmFsdWUpIHJldHVybiB2YWx1ZTtcbiAgaWYgKCcwJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHJldHVybiB0cnVlO1xuICBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICEhIHZhbHVlO1xufTtcblxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvb2xlYW5TY2hlbWE7XG4iLCIvKiFcclxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKTtcclxudmFyIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yO1xyXG5cclxuLyoqXHJcbiAqIERhdGUgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xyXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBEYXRlU2NoZW1hIChrZXksIG9wdGlvbnMpIHtcclxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zKTtcclxufVxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cclxuICovXHJcbkRhdGVTY2hlbWEucHJvdG90eXBlLl9fcHJvdG9fXyA9IFNjaGVtYVR5cGUucHJvdG90eXBlO1xyXG5cclxuLyoqXHJcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgZGF0ZVxyXG4gKlxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcbkRhdGVTY2hlbWEucHJvdG90eXBlLmNoZWNrUmVxdWlyZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBEYXRlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhc3RzIHRvIGRhdGVcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5EYXRlU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJylcclxuICAgIHJldHVybiBudWxsO1xyXG5cclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxuICB2YXIgZGF0ZTtcclxuXHJcbiAgLy8gc3VwcG9ydCBmb3IgdGltZXN0YW1wc1xyXG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE51bWJlciB8fCAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVcclxuICAgICAgfHwgU3RyaW5nKHZhbHVlKSA9PSBOdW1iZXIodmFsdWUpKVxyXG4gICAgZGF0ZSA9IG5ldyBEYXRlKE51bWJlcih2YWx1ZSkpO1xyXG5cclxuICAvLyBzdXBwb3J0IGZvciBkYXRlIHN0cmluZ3NcclxuICBlbHNlIGlmICh2YWx1ZS50b1N0cmluZylcclxuICAgIGRhdGUgPSBuZXcgRGF0ZSh2YWx1ZS50b1N0cmluZygpKTtcclxuXHJcbiAgaWYgKGRhdGUudG9TdHJpbmcoKSAhPSAnSW52YWxpZCBEYXRlJylcclxuICAgIHJldHVybiBkYXRlO1xyXG5cclxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdkYXRlJywgdmFsdWUsIHRoaXMucGF0aCApO1xyXG59O1xyXG5cclxuLyohXHJcbiAqIE1vZHVsZSBleHBvcnRzLlxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGF0ZVNjaGVtYTtcclxuIiwiXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcbiAgLCBBcnJheVR5cGUgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBNb25nb29zZURvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuLi90eXBlcy9kb2N1bWVudGFycmF5JylcbiAgLCBTdWJkb2N1bWVudCA9IHJlcXVpcmUoJy4uL3R5cGVzL2VtYmVkZGVkJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogU3ViZG9jc0FycmF5IFNjaGVtYVR5cGUgY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1NjaGVtYX0gc2NoZW1hXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYUFycmF5XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRG9jdW1lbnRBcnJheSAoa2V5LCBzY2hlbWEsIG9wdGlvbnMpIHtcblxuICAvLyBjb21waWxlIGFuIGVtYmVkZGVkIGRvY3VtZW50IGZvciB0aGlzIHNjaGVtYVxuICBmdW5jdGlvbiBFbWJlZGRlZERvY3VtZW50ICgpIHtcbiAgICBTdWJkb2N1bWVudC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG4gIH1cblxuICBFbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdWJkb2N1bWVudC5wcm90b3R5cGU7XG4gIEVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX3NldFNjaGVtYSggc2NoZW1hICk7XG5cbiAgLy8gYXBwbHkgbWV0aG9kc1xuICBmb3IgKHZhciBpIGluIHNjaGVtYS5tZXRob2RzKSB7XG4gICAgRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGVbaV0gPSBzY2hlbWEubWV0aG9kc1tpXTtcbiAgfVxuXG4gIC8vIGFwcGx5IHN0YXRpY3NcbiAgZm9yICh2YXIgaSBpbiBzY2hlbWEuc3RhdGljcykge1xuICAgIEVtYmVkZGVkRG9jdW1lbnRbaV0gPSBzY2hlbWEuc3RhdGljc1tpXTtcbiAgfVxuXG4gIEVtYmVkZGVkRG9jdW1lbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuXG4gIEFycmF5VHlwZS5jYWxsKHRoaXMsIGtleSwgRW1iZWRkZWREb2N1bWVudCwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XG4gIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICB2YXIgZm4gPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICB0aGlzLmRlZmF1bHQoZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyID0gZm4uY2FsbCh0aGlzKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyKSkgYXJyID0gW2Fycl07XG4gICAgcmV0dXJuIG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheShhcnIsIHBhdGgsIHRoaXMpO1xuICB9KTtcbn1cblxuLyohXG4gKiBJbmhlcml0cyBmcm9tIEFycmF5VHlwZS5cbiAqL1xuRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuX19wcm90b19fID0gQXJyYXlUeXBlLnByb3RvdHlwZTtcblxuLyoqXG4gKiBQZXJmb3JtcyBsb2NhbCB2YWxpZGF0aW9ucyBmaXJzdCwgdGhlbiB2YWxpZGF0aW9ucyBvbiBlYWNoIGVtYmVkZGVkIGRvY1xuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Eb2N1bWVudEFycmF5LnByb3RvdHlwZS5kb1ZhbGlkYXRlID0gZnVuY3Rpb24gKGFycmF5LCBmbiwgc2NvcGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIFNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUuY2FsbCh0aGlzLCBhcnJheSwgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChlcnIpIHJldHVybiBmbihlcnIpO1xuXG4gICAgdmFyIGNvdW50ID0gYXJyYXkgJiYgYXJyYXkubGVuZ3RoXG4gICAgICAsIGVycm9yO1xuXG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIGZuKCk7XG5cbiAgICAvLyBoYW5kbGUgc3BhcnNlIGFycmF5cywgZG8gbm90IHVzZSBhcnJheS5mb3JFYWNoIHdoaWNoIGRvZXMgbm90XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHNwYXJzZSBlbGVtZW50cyB5ZXQgcmVwb3J0cyBhcnJheS5sZW5ndGggaW5jbHVkaW5nXG4gICAgLy8gdGhlbSA6KFxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvdW50OyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIC8vIHNpZGVzdGVwIHNwYXJzZSBlbnRyaWVzXG4gICAgICB2YXIgZG9jID0gYXJyYXlbaV07XG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICA7KGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIGRvYy52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciAmJiAhZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIHJld3JpdGUgdGhlIGtleVxuICAgICAgICAgICAgZXJyLmtleSA9IHNlbGYua2V5ICsgJy4nICsgaSArICcuJyArIGVyci5rZXk7XG4gICAgICAgICAgICByZXR1cm4gZm4oZXJyb3IgPSBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAtLWNvdW50IHx8IGZuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSkoaSk7XG4gICAgfVxuICB9LCBzY29wZSk7XG59O1xuXG4vKipcbiAqIENhc3RzIGNvbnRlbnRzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKiBAcGFyYW0ge0RvY3VtZW50fSBkb2MgdGhhdCB0cmlnZ2VycyB0aGUgY2FzdGluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cbkRvY3VtZW50QXJyYXkucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUsIGRvYywgaW5pdCwgcHJldikge1xuICB2YXIgc2VsZWN0ZWRcbiAgICAsIHN1YmRvY1xuICAgICwgaTtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FzdChbdmFsdWVdLCBkb2MsIGluaXQsIHByZXYpO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBTdG9yYWdlRG9jdW1lbnRBcnJheSkpIHtcbiAgICB2YWx1ZSA9IG5ldyBTdG9yYWdlRG9jdW1lbnRBcnJheSh2YWx1ZSwgdGhpcy5wYXRoLCBkb2MpO1xuICB9XG5cbiAgaSA9IHZhbHVlLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKCEodmFsdWVbaV0gaW5zdGFuY2VvZiBFbWJlZGRlZERvY3VtZW50KSAmJiB2YWx1ZVtpXSkge1xuICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgc2VsZWN0ZWQgfHwgKHNlbGVjdGVkID0gc2NvcGVQYXRocyh0aGlzLCBkb2MuJF9fLnNlbGVjdGVkLCBpbml0KSk7XG4gICAgICAgIHN1YmRvYyA9IG5ldyB0aGlzLmNhc3RlckNvbnN0cnVjdG9yKG51bGwsIHZhbHVlLCB0cnVlLCBzZWxlY3RlZCk7XG4gICAgICAgIHZhbHVlW2ldID0gc3ViZG9jLmluaXQodmFsdWVbaV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHByZXYgJiYgKHN1YmRvYyA9IHByZXYuaWQodmFsdWVbaV0uX2lkKSkpIHtcbiAgICAgICAgICAvLyBoYW5kbGUgcmVzZXR0aW5nIGRvYyB3aXRoIGV4aXN0aW5nIGlkIGJ1dCBkaWZmZXJpbmcgZGF0YVxuICAgICAgICAgIC8vIGRvYy5hcnJheSA9IFt7IGRvYzogJ3ZhbCcgfV1cbiAgICAgICAgICBzdWJkb2Muc2V0KHZhbHVlW2ldKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJkb2MgPSBuZXcgdGhpcy5jYXN0ZXJDb25zdHJ1Y3Rvcih2YWx1ZVtpXSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc2V0KCkgaXMgaG9va2VkIGl0IHdpbGwgaGF2ZSBubyByZXR1cm4gdmFsdWVcbiAgICAgICAgLy8gc2VlIGdoLTc0NlxuICAgICAgICB2YWx1ZVtpXSA9IHN1YmRvYztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKiFcbiAqIFNjb3BlcyBwYXRocyBzZWxlY3RlZCBpbiBhIHF1ZXJ5IHRvIHRoaXMgYXJyYXkuXG4gKiBOZWNlc3NhcnkgZm9yIHByb3BlciBkZWZhdWx0IGFwcGxpY2F0aW9uIG9mIHN1YmRvY3VtZW50IHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0RvY3VtZW50QXJyYXl9IGFycmF5IC0gdGhlIGFycmF5IHRvIHNjb3BlIGBmaWVsZHNgIHBhdGhzXG4gKiBAcGFyYW0ge09iamVjdHx1bmRlZmluZWR9IGZpZWxkcyAtIHRoZSByb290IGZpZWxkcyBzZWxlY3RlZCBpbiB0aGUgcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbnx1bmRlZmluZWR9IGluaXQgLSBpZiB3ZSBhcmUgYmVpbmcgY3JlYXRlZCBwYXJ0IG9mIGEgcXVlcnkgcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIHNjb3BlUGF0aHMgKGFycmF5LCBmaWVsZHMsIGluaXQpIHtcbiAgaWYgKCEoaW5pdCAmJiBmaWVsZHMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gIHZhciBwYXRoID0gYXJyYXkucGF0aCArICcuJ1xuICAgICwga2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcylcbiAgICAsIGkgPSBrZXlzLmxlbmd0aFxuICAgICwgc2VsZWN0ZWQgPSB7fVxuICAgICwgaGFzS2V5c1xuICAgICwga2V5O1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIGlmICgwID09PSBrZXkuaW5kZXhPZihwYXRoKSkge1xuICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgc2VsZWN0ZWRba2V5LnN1YnN0cmluZyhwYXRoLmxlbmd0aCldID0gZmllbGRzW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhhc0tleXMgJiYgc2VsZWN0ZWQgfHwgdW5kZWZpbmVkO1xufVxuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRBcnJheTtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLlN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5nJyk7XG5cbmV4cG9ydHMuTnVtYmVyID0gcmVxdWlyZSgnLi9udW1iZXInKTtcblxuZXhwb3J0cy5Cb29sZWFuID0gcmVxdWlyZSgnLi9ib29sZWFuJyk7XG5cbmV4cG9ydHMuRG9jdW1lbnRBcnJheSA9IHJlcXVpcmUoJy4vZG9jdW1lbnRhcnJheScpO1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkRhdGUgPSByZXF1aXJlKCcuL2RhdGUnKTtcblxuZXhwb3J0cy5PYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKTtcblxuZXhwb3J0cy5NaXhlZCA9IHJlcXVpcmUoJy4vbWl4ZWQnKTtcblxuLy8gYWxpYXNcblxuZXhwb3J0cy5PaWQgPSBleHBvcnRzLk9iamVjdElkO1xuZXhwb3J0cy5PYmplY3QgPSBleHBvcnRzLk1peGVkO1xuZXhwb3J0cy5Cb29sID0gZXhwb3J0cy5Cb29sZWFuO1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi4vc2NoZW1hdHlwZScpO1xuXG4vKipcbiAqIE1peGVkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAaW5oZXJpdHMgU2NoZW1hVHlwZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIE1peGVkIChwYXRoLCBvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVmYXVsdCkge1xuICAgIHZhciBkZWYgPSBvcHRpb25zLmRlZmF1bHQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGVmKSAmJiAwID09PSBkZWYubGVuZ3RoKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgZW1wdHkgYXJyYXkgZGVmYXVsdHMgYXJlIGhhbmRsZWRcbiAgICAgIG9wdGlvbnMuZGVmYXVsdCA9IEFycmF5O1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2hhcmVkICYmXG4gICAgICAgICAgICAgICBfLmlzUGxhaW5PYmplY3QoZGVmKSAmJlxuICAgICAgICAgICAgICAgMCA9PT0gT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHtcbiAgICAgIC8vIHByZXZlbnQgb2RkIFwic2hhcmVkXCIgb2JqZWN0cyBiZXR3ZWVuIGRvY3VtZW50c1xuICAgICAgb3B0aW9ucy5kZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBTY2hlbWFUeXBlLmNhbGwodGhpcywgcGF0aCwgb3B0aW9ucyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5NaXhlZC5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XG5cbi8qKlxuICogUmVxdWlyZWQgdmFsaWRhdG9yXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk1peGVkLnByb3RvdHlwZS5jaGVja1JlcXVpcmVkID0gZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gKHZhbCAhPT0gdW5kZWZpbmVkKSAmJiAodmFsICE9PSBudWxsKTtcbn07XG5cbi8qKlxuICogQ2FzdHMgYHZhbGAgZm9yIE1peGVkLlxuICpcbiAqIF90aGlzIGlzIGEgbm8tb3BfXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHRvIGNhc3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5NaXhlZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBNaXhlZDtcbiIsIi8qIVxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXG4gICwgZXJyb3JNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL2Vycm9yJykubWVzc2FnZXNcblxuLyoqXG4gKiBOdW1iZXIgU2NoZW1hVHlwZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBOdW1iZXJTY2hlbWEgKGtleSwgb3B0aW9ucykge1xuICBTY2hlbWFUeXBlLmNhbGwodGhpcywga2V5LCBvcHRpb25zLCAnTnVtYmVyJyk7XG59XG5cbi8qIVxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLl9fcHJvdG9fXyA9IFNjaGVtYVR5cGUucHJvdG90eXBlO1xuXG4vKipcbiAqIFJlcXVpcmVkIHZhbGlkYXRvciBmb3IgbnVtYmVyXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCB2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcjtcbiAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGEgbWluaW11bSBudW1iZXIgdmFsaWRhdG9yLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiAxMCB9KVxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxuICogICAgIHZhciBtID0gbmV3IE0oeyBuOiA5IH0pXG4gKiAgICAgbS5zYXZlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKSAvLyB2YWxpZGF0b3IgZXJyb3JcbiAqICAgICAgIG0ubiA9IDEwO1xuICogICAgICAgbS5zYXZlKCkgLy8gc3VjY2Vzc1xuICogICAgIH0pXG4gKlxuICogICAgIC8vIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xuICogICAgIC8vIFdlIGNhbiBhbHNvIHVzZSB0aGUgc3BlY2lhbCB7TUlOfSB0b2tlbiB3aGljaCB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGludmFsaWQgdmFsdWVcbiAqICAgICB2YXIgbWluID0gWzEwLCAnVGhlIHZhbHVlIG9mIHBhdGggYHtQQVRIfWAgKHtWQUxVRX0pIGlzIGJlbmVhdGggdGhlIGxpbWl0ICh7TUlOfSkuJ107XG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgbWluOiBtaW4gfSlcbiAqICAgICB2YXIgTSA9IG1vbmdvb3NlLm1vZGVsKCdNZWFzdXJlbWVudCcsIHNjaGVtYSk7XG4gKiAgICAgdmFyIHM9IG5ldyBNKHsgbjogNCB9KTtcbiAqICAgICBzLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBWYWxpZGF0aW9uRXJyb3I6IFRoZSB2YWx1ZSBvZiBwYXRoIGBuYCAoNCkgaXMgYmVuZWF0aCB0aGUgbGltaXQgKDEwKS5cbiAqICAgICB9KVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBtaW5pbXVtIG51bWJlclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xuICogQHNlZSBDdXN0b21pemVkIEVycm9yIE1lc3NhZ2VzICNlcnJvcl9tZXNzYWdlc19Nb25nb29zZUVycm9yLW1lc3NhZ2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5OdW1iZXJTY2hlbWEucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAodGhpcy5taW5WYWxpZGF0b3IpIHtcbiAgICB0aGlzLnZhbGlkYXRvcnMgPSB0aGlzLnZhbGlkYXRvcnMuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1pblZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWluO1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUlOfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5taW5WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHYgPT09IG51bGwgfHwgdiA+PSB2YWx1ZTtcbiAgICB9LCBtc2csICdtaW4nXSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyBhIG1heGltdW0gbnVtYmVyIHZhbGlkYXRvci5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbjogeyB0eXBlOiBOdW1iZXIsIG1heDogMTAgfSlcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgbjogMTEgfSlcbiAqICAgICBtLnNhdmUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5lcnJvcihlcnIpIC8vIHZhbGlkYXRvciBlcnJvclxuICogICAgICAgbS5uID0gMTA7XG4gKiAgICAgICBtLnNhdmUoKSAvLyBzdWNjZXNzXG4gKiAgICAgfSlcbiAqXG4gKiAgICAgLy8gY3VzdG9tIGVycm9yIG1lc3NhZ2VzXG4gKiAgICAgLy8gV2UgY2FuIGFsc28gdXNlIHRoZSBzcGVjaWFsIHtNQVh9IHRva2VuIHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgaW52YWxpZCB2YWx1ZVxuICogICAgIHZhciBtYXggPSBbMTAsICdUaGUgdmFsdWUgb2YgcGF0aCBge1BBVEh9YCAoe1ZBTFVFfSkgZXhjZWVkcyB0aGUgbGltaXQgKHtNQVh9KS4nXTtcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG46IHsgdHlwZTogTnVtYmVyLCBtYXg6IG1heCB9KVxuICogICAgIHZhciBNID0gbW9uZ29vc2UubW9kZWwoJ01lYXN1cmVtZW50Jywgc2NoZW1hKTtcbiAqICAgICB2YXIgcz0gbmV3IE0oeyBuOiA0IH0pO1xuICogICAgIHMudmFsaWRhdGUoZnVuY3Rpb24gKGVycikge1xuICogICAgICAgY29uc29sZS5sb2coU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogVGhlIHZhbHVlIG9mIHBhdGggYG5gICg0KSBleGNlZWRzIHRoZSBsaW1pdCAoMTApLlxuICogICAgIH0pXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIG1heGltdW0gbnVtYmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gW21lc3NhZ2VdIG9wdGlvbmFsIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cbk51bWJlclNjaGVtYS5wcm90b3R5cGUubWF4ID0gZnVuY3Rpb24gKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICh0aGlzLm1heFZhbGlkYXRvcikge1xuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLm1heFZhbGlkYXRvcjtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5OdW1iZXIubWF4O1xuICAgIG1zZyA9IG1zZy5yZXBsYWNlKC97TUFYfS8sIHZhbHVlKTtcbiAgICB0aGlzLnZhbGlkYXRvcnMucHVzaChbdGhpcy5tYXhWYWxpZGF0b3IgPSBmdW5jdGlvbih2KXtcbiAgICAgIHJldHVybiB2ID09PSBudWxsIHx8IHYgPD0gdmFsdWU7XG4gICAgfSwgbXNnLCAnbWF4J10pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhc3RzIHRvIG51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSB0byBjYXN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuTnVtYmVyU2NoZW1hLnByb3RvdHlwZS5jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIHZhbCA9IHZhbHVlICYmIHZhbHVlLl9pZFxuICAgID8gdmFsdWUuX2lkIC8vIGRvY3VtZW50c1xuICAgIDogdmFsdWU7XG5cbiAgaWYgKCFpc05hTih2YWwpKXtcbiAgICBpZiAobnVsbCA9PT0gdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICgnJyA9PT0gdmFsKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgdmFsID0gTnVtYmVyKHZhbCk7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIE51bWJlcikgcmV0dXJuIHZhbFxuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsKSByZXR1cm4gdmFsO1xuICAgIGlmICh2YWwudG9TdHJpbmcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSAmJlxuICAgICAgICB2YWwudG9TdHJpbmcoKSA9PSBOdW1iZXIodmFsKSkge1xuICAgICAgcmV0dXJuIG5ldyBOdW1iZXIodmFsKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdudW1iZXInLCB2YWx1ZSwgdGhpcy5wYXRoKTtcbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJTY2hlbWE7XG4iLCIvKiFcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICovXHJcblxyXG52YXIgU2NoZW1hVHlwZSA9IHJlcXVpcmUoJy4uL3NjaGVtYXR5cGUnKVxyXG4gICwgQ2FzdEVycm9yID0gU2NoZW1hVHlwZS5DYXN0RXJyb3JcclxuICAsIG9pZCA9IHJlcXVpcmUoJy4uL3R5cGVzL29iamVjdGlkJylcclxuICAsIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKVxyXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xyXG5cclxuLyoqXHJcbiAqIE9iamVjdElkIFNjaGVtYVR5cGUgY29uc3RydWN0b3IuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGluaGVyaXRzIFNjaGVtYVR5cGVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gT2JqZWN0SWQgKGtleSwgb3B0aW9ucykge1xyXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdPYmplY3RJZCcpO1xyXG59XHJcblxyXG4vKiFcclxuICogSW5oZXJpdHMgZnJvbSBTY2hlbWFUeXBlLlxyXG4gKi9cclxuXHJcbk9iamVjdElkLnByb3RvdHlwZS5fX3Byb3RvX18gPSBTY2hlbWFUeXBlLnByb3RvdHlwZTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGFuIGF1dG8tZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHQgaWYgdHVybk9uIGlzIHRydWUuXHJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdHVybk9uIGF1dG8gZ2VuZXJhdGVkIE9iamVjdElkIGRlZmF1bHRzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICovXHJcbk9iamVjdElkLnByb3RvdHlwZS5hdXRvID0gZnVuY3Rpb24gKCB0dXJuT24gKSB7XHJcbiAgaWYgKCB0dXJuT24gKSB7XHJcbiAgICB0aGlzLmRlZmF1bHQoIGRlZmF1bHRJZCApO1xyXG4gICAgdGhpcy5zZXQoIHJlc2V0SWQgKVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2sgcmVxdWlyZWRcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5PYmplY3RJZC5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XHJcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XHJcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2Ygb2lkO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB0byBPYmplY3RJZFxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5PYmplY3RJZC5wcm90b3R5cGUuY2FzdCA9IGZ1bmN0aW9uICggdmFsdWUgKSB7XHJcbiAgaWYgKCBTY2hlbWFUeXBlLl9pc1JlZiggdGhpcywgdmFsdWUgKSApIHtcclxuICAgIC8vIHdhaXQhIHdlIG1heSBuZWVkIHRvIGNhc3QgdGhpcyB0byBhIGRvY3VtZW50XHJcblxyXG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcclxuICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERvY3VtZW50KSB7XHJcbiAgICAgIHZhbHVlLiRfXy53YXNQb3B1bGF0ZWQgPSB0cnVlO1xyXG4gICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2V0dGluZyBhIHBvcHVsYXRlZCBwYXRoXHJcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQgKSB7XHJcbiAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0gZWxzZSBpZiAoICFfLmlzUGxhaW5PYmplY3QoIHZhbHVlICkgKSB7XHJcbiAgICAgIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g0J3Rg9C20L3QviDRgdC+0LfQtNCw0YLRjCDQtNC+0LrRg9C80LXQvdGCINC/0L4g0YHRhdC10LzQtSwg0YPQutCw0LfQsNC90L3QvtC5INCyINGB0YHRi9C70LrQtVxyXG4gICAgdmFyIHNjaGVtYSA9IHRoaXMub3B0aW9ucy5yZWY7XHJcbiAgICBpZiAoICFzY2hlbWEgKXtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcign0J/RgNC4INGB0YHRi9C70LrQtSAocmVmKSDQvdCwINC00L7QutGD0LzQtdC90YIgJyArXHJcbiAgICAgICAgJ9C90YPQttC90L4g0YPQutCw0LfRi9Cy0LDRgtGMINGB0YXQtdC80YMsINC/0L4g0LrQvtGC0L7RgNC+0Lkg0Y3RgtC+0YIg0LTQvtC60YPQvNC10L3RgiDRgdC+0LfQtNCw0LLQsNGC0YwnKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZG9jID0gbmV3IERvY3VtZW50KCB2YWx1ZSwgdW5kZWZpbmVkLCBzdG9yYWdlLnNjaGVtYXNbIHNjaGVtYSBdICk7XHJcbiAgICBkb2MuJF9fLndhc1BvcHVsYXRlZCA9IHRydWU7XHJcblxyXG4gICAgcmV0dXJuIGRvYztcclxuICB9XHJcblxyXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBvaWQpXHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG4gIGlmICggdmFsdWUuX2lkICYmIHZhbHVlLl9pZCBpbnN0YW5jZW9mIG9pZCApXHJcbiAgICByZXR1cm4gdmFsdWUuX2lkO1xyXG5cclxuICBpZiAodmFsdWUudG9TdHJpbmcpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBuZXcgb2lkKCB2YWx1ZS50b1N0cmluZygpICk7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgdGhyb3cgbmV3IENhc3RFcnJvcignT2JqZWN0SWQnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBDYXN0RXJyb3IoJ09iamVjdElkJywgdmFsdWUsIHRoaXMucGF0aCk7XHJcbn07XHJcblxyXG4vKiFcclxuICogaWdub3JlXHJcbiAqL1xyXG5mdW5jdGlvbiBkZWZhdWx0SWQgKCkge1xyXG4gIHJldHVybiBuZXcgb2lkKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2V0SWQgKHYpIHtcclxuICB0aGlzLiRfXy5faWQgPSBudWxsO1xyXG4gIHJldHVybiB2O1xyXG59XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJZDtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqL1xyXG5cclxudmFyIFNjaGVtYVR5cGUgPSByZXF1aXJlKCcuLi9zY2hlbWF0eXBlJylcclxuICAsIENhc3RFcnJvciA9IFNjaGVtYVR5cGUuQ2FzdEVycm9yXHJcbiAgLCBlcnJvck1lc3NhZ2VzID0gcmVxdWlyZSgnLi4vZXJyb3InKS5tZXNzYWdlc1xyXG5cclxuLyoqXHJcbiAqIFN0cmluZyBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXHJcbiAqIEBpbmhlcml0cyBTY2hlbWFUeXBlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIFN0cmluZ1NjaGVtYSAoa2V5LCBvcHRpb25zKSB7XHJcbiAgdGhpcy5lbnVtVmFsdWVzID0gW107XHJcbiAgdGhpcy5yZWdFeHAgPSBudWxsO1xyXG4gIFNjaGVtYVR5cGUuY2FsbCh0aGlzLCBrZXksIG9wdGlvbnMsICdTdHJpbmcnKTtcclxufVxyXG5cclxuLyohXHJcbiAqIEluaGVyaXRzIGZyb20gU2NoZW1hVHlwZS5cclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuX19wcm90b19fID0gU2NoZW1hVHlwZS5wcm90b3R5cGU7XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBlbnVtIHZhbGlkYXRvclxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzdGF0ZXMgPSAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBzdGF0ZTogeyB0eXBlOiBTdHJpbmcsIGVudW06IHN0YXRlcyB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcclxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogYGludmFsaWRgIGlzIG5vdCBhIHZhbGlkIGVudW0gdmFsdWUgZm9yIHBhdGggYHN0YXRlYC5cclxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xyXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICAvLyBvciB3aXRoIGN1c3RvbSBlcnJvciBtZXNzYWdlc1xyXG4gKiAgICAgdmFyIGVudSA9IHtcclxuICogICAgICAgdmFsdWVzOiAnb3BlbmluZyBvcGVuIGNsb3NpbmcgY2xvc2VkJy5zcGxpdCgnICcpLFxyXG4gKiAgICAgICBtZXNzYWdlOiAnZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGB7UEFUSH1gIHdpdGggdmFsdWUgYHtWQUxVRX1gJ1xyXG4gKiAgICAgfVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgc3RhdGU6IHsgdHlwZTogU3RyaW5nLCBlbnVtOiBlbnUgfSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IHN0YXRlOiAnaW52YWxpZCcgfSlcclxuICogICAgIG0uc2F2ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoU3RyaW5nKGVycikpIC8vIFZhbGlkYXRpb25FcnJvcjogZW51bSB2YWxpZGF0b3IgZmFpbGVkIGZvciBwYXRoIGBzdGF0ZWAgd2l0aCB2YWx1ZSBgaW52YWxpZGBcclxuICogICAgICAgbS5zdGF0ZSA9ICdvcGVuJ1xyXG4gKiAgICAgICBtLnNhdmUoY2FsbGJhY2spIC8vIHN1Y2Nlc3NcclxuICogICAgIH0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gW2FyZ3MuLi5dIGVudW1lcmF0aW9uIHZhbHVlc1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5lbnVtID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmVudW1WYWxpZGF0b3IpIHtcclxuICAgIHRoaXMudmFsaWRhdG9ycyA9IHRoaXMudmFsaWRhdG9ycy5maWx0ZXIoZnVuY3Rpb24odil7XHJcbiAgICAgIHJldHVybiB2WzBdICE9IHRoaXMuZW51bVZhbGlkYXRvcjtcclxuICAgIH0sIHRoaXMpO1xyXG4gICAgdGhpcy5lbnVtVmFsaWRhdG9yID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAodW5kZWZpbmVkID09PSBhcmd1bWVudHNbMF0gfHwgZmFsc2UgPT09IGFyZ3VtZW50c1swXSkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB2YXIgdmFsdWVzO1xyXG4gIHZhciBlcnJvck1lc3NhZ2U7XHJcblxyXG4gIGlmIChfLmlzUGxhaW5PYmplY3QoYXJndW1lbnRzWzBdKSkge1xyXG4gICAgdmFsdWVzID0gYXJndW1lbnRzWzBdLnZhbHVlcztcclxuICAgIGVycm9yTWVzc2FnZSA9IGFyZ3VtZW50c1swXS5tZXNzYWdlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YWx1ZXMgPSBhcmd1bWVudHM7XHJcbiAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLlN0cmluZy5lbnVtO1xyXG4gIH1cclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh1bmRlZmluZWQgIT09IHZhbHVlc1tpXSkge1xyXG4gICAgICB0aGlzLmVudW1WYWx1ZXMucHVzaCh0aGlzLmNhc3QodmFsdWVzW2ldKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgdmFscyA9IHRoaXMuZW51bVZhbHVlcztcclxuICB0aGlzLmVudW1WYWxpZGF0b3IgPSBmdW5jdGlvbiAodikge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZCA9PT0gdiB8fCB+dmFscy5pbmRleE9mKHYpO1xyXG4gIH07XHJcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMuZW51bVZhbGlkYXRvciwgZXJyb3JNZXNzYWdlLCAnZW51bSddKTtcclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIGxvd2VyY2FzZSBzZXR0ZXIuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgZW1haWw6IHsgdHlwZTogU3RyaW5nLCBsb3dlcmNhc2U6IHRydWUgfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgZW1haWw6ICdTb21lRW1haWxAZXhhbXBsZS5DT00nIH0pO1xyXG4gKiAgICAgY29uc29sZS5sb2cobS5lbWFpbCkgLy8gc29tZWVtYWlsQGV4YW1wbGUuY29tXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUubG93ZXJjYXNlID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnNldChmdW5jdGlvbiAodiwgc2VsZikge1xyXG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2KSB2ID0gc2VsZi5jYXN0KHYpO1xyXG4gICAgaWYgKHYpIHJldHVybiB2LnRvTG93ZXJDYXNlKCk7XHJcbiAgICByZXR1cm4gdjtcclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGFuIHVwcGVyY2FzZSBzZXR0ZXIuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgY2FwczogeyB0eXBlOiBTdHJpbmcsIHVwcGVyY2FzZTogdHJ1ZSB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKTtcclxuICogICAgIHZhciBtID0gbmV3IE0oeyBjYXBzOiAnYW4gZXhhbXBsZScgfSk7XHJcbiAqICAgICBjb25zb2xlLmxvZyhtLmNhcHMpIC8vIEFOIEVYQU1QTEVcclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS51cHBlcmNhc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XHJcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XHJcbiAgICBpZiAodikgcmV0dXJuIHYudG9VcHBlckNhc2UoKTtcclxuICAgIHJldHVybiB2O1xyXG4gIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSB0cmltIHNldHRlci5cclxuICpcclxuICogVGhlIHN0cmluZyB2YWx1ZSB3aWxsIGJlIHRyaW1tZWQgd2hlbiBzZXQuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHRyaW06IHRydWUgfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcylcclxuICogICAgIHZhciBzdHJpbmcgPSAnIHNvbWUgbmFtZSAnXHJcbiAqICAgICBjb25zb2xlLmxvZyhzdHJpbmcubGVuZ3RoKSAvLyAxMVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG5hbWU6IHN0cmluZyB9KVxyXG4gKiAgICAgY29uc29sZS5sb2cobS5uYW1lLmxlbmd0aCkgLy8gOVxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLnRyaW0gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2V0KGZ1bmN0aW9uICh2LCBzZWxmKSB7XHJcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHYpIHYgPSBzZWxmLmNhc3Qodik7XHJcbiAgICBpZiAodikgcmV0dXJuIHYudHJpbSgpO1xyXG4gICAgcmV0dXJuIHY7XHJcbiAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyBhIHJlZ2V4cCB2YWxpZGF0b3IuXHJcbiAqXHJcbiAqIEFueSB2YWx1ZSB0aGF0IGRvZXMgbm90IHBhc3MgYHJlZ0V4cGAudGVzdCh2YWwpIHdpbGwgZmFpbCB2YWxpZGF0aW9uLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogL15hLyB9fSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzKVxyXG4gKiAgICAgdmFyIG0gPSBuZXcgTSh7IG5hbWU6ICdJIGFtIGludmFsaWQnIH0pXHJcbiAqICAgICBtLnZhbGlkYXRlKGZ1bmN0aW9uIChlcnIpIHtcclxuICogICAgICAgY29uc29sZS5lcnJvcihTdHJpbmcoZXJyKSkgLy8gXCJWYWxpZGF0aW9uRXJyb3I6IFBhdGggYG5hbWVgIGlzIGludmFsaWQgKEkgYW0gaW52YWxpZCkuXCJcclxuICogICAgICAgbS5uYW1lID0gJ2FwcGxlcydcclxuICogICAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgICAgYXNzZXJ0Lm9rKGVycikgLy8gc3VjY2Vzc1xyXG4gKiAgICAgICB9KVxyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIC8vIHVzaW5nIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICogICAgIHZhciBtYXRjaCA9IFsgL1xcLmh0bWwkLywgXCJUaGF0IGZpbGUgZG9lc24ndCBlbmQgaW4gLmh0bWwgKHtWQUxVRX0pXCIgXTtcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGZpbGU6IHsgdHlwZTogU3RyaW5nLCBtYXRjaDogbWF0Y2ggfX0pXHJcbiAqICAgICB2YXIgTSA9IGRiLm1vZGVsKCdNJywgcyk7XHJcbiAqICAgICB2YXIgbSA9IG5ldyBNKHsgZmlsZTogJ2ludmFsaWQnIH0pO1xyXG4gKiAgICAgbS52YWxpZGF0ZShmdW5jdGlvbiAoZXJyKSB7XHJcbiAqICAgICAgIGNvbnNvbGUubG9nKFN0cmluZyhlcnIpKSAvLyBcIlZhbGlkYXRpb25FcnJvcjogVGhhdCBmaWxlIGRvZXNuJ3QgZW5kIGluIC5odG1sIChpbnZhbGlkKVwiXHJcbiAqICAgICB9KVxyXG4gKlxyXG4gKiBFbXB0eSBzdHJpbmdzLCBgdW5kZWZpbmVkYCwgYW5kIGBudWxsYCB2YWx1ZXMgYWx3YXlzIHBhc3MgdGhlIG1hdGNoIHZhbGlkYXRvci4gSWYgeW91IHJlcXVpcmUgdGhlc2UgdmFsdWVzLCBlbmFibGUgdGhlIGByZXF1aXJlZGAgdmFsaWRhdG9yIGFsc28uXHJcbiAqXHJcbiAqICAgICB2YXIgcyA9IG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgbWF0Y2g6IC9eYS8sIHJlcXVpcmVkOiB0cnVlIH19KVxyXG4gKlxyXG4gKiBAcGFyYW0ge1JlZ0V4cH0gcmVnRXhwIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byB0ZXN0IGFnYWluc3RcclxuICogQHBhcmFtIHtTdHJpbmd9IFttZXNzYWdlXSBvcHRpb25hbCBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBzZWUgQ3VzdG9taXplZCBFcnJvciBNZXNzYWdlcyAjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU3RyaW5nU2NoZW1hLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIG1hdGNoIChyZWdFeHAsIG1lc3NhZ2UpIHtcclxuICAvLyB5ZXMsIHdlIGFsbG93IG11bHRpcGxlIG1hdGNoIHZhbGlkYXRvcnNcclxuXHJcbiAgdmFyIG1zZyA9IG1lc3NhZ2UgfHwgZXJyb3JNZXNzYWdlcy5TdHJpbmcubWF0Y2g7XHJcblxyXG4gIGZ1bmN0aW9uIG1hdGNoVmFsaWRhdG9yICh2KXtcclxuICAgIHJldHVybiBudWxsICE9IHYgJiYgJycgIT09IHZcclxuICAgICAgPyByZWdFeHAudGVzdCh2KVxyXG4gICAgICA6IHRydWVcclxuICB9XHJcblxyXG4gIHRoaXMudmFsaWRhdG9ycy5wdXNoKFttYXRjaFZhbGlkYXRvciwgbXNnLCAncmVnZXhwJ10pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIHJlcXVpcmVkXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfG51bGx8dW5kZWZpbmVkfSB2YWx1ZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblN0cmluZ1NjaGVtYS5wcm90b3R5cGUuY2hlY2tSZXF1aXJlZCA9IGZ1bmN0aW9uIGNoZWNrUmVxdWlyZWQgKHZhbHVlLCBkb2MpIHtcclxuICBpZiAoU2NoZW1hVHlwZS5faXNSZWYodGhpcywgdmFsdWUsIGRvYywgdHJ1ZSkpIHtcclxuICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gKHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nIHx8IHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykgJiYgdmFsdWUubGVuZ3RoO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXN0cyB0byBTdHJpbmdcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TdHJpbmdTY2hlbWEucHJvdG90eXBlLmNhc3QgPSBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gIGlmICggdmFsdWUgPT09IG51bGwgKSB7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG5cclxuICBpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZSkge1xyXG4gICAgLy8gaGFuZGxlIGRvY3VtZW50cyBiZWluZyBwYXNzZWRcclxuICAgIGlmICh2YWx1ZS5faWQgJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlLl9pZCkge1xyXG4gICAgICByZXR1cm4gdmFsdWUuX2lkO1xyXG4gICAgfVxyXG4gICAgaWYgKCB2YWx1ZS50b1N0cmluZyApIHtcclxuICAgICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aHJvdyBuZXcgQ2FzdEVycm9yKCdzdHJpbmcnLCB2YWx1ZSwgdGhpcy5wYXRoKTtcclxufTtcclxuXHJcbi8qIVxyXG4gKiBNb2R1bGUgZXhwb3J0cy5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ1NjaGVtYTtcclxuIiwiLyohXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqL1xyXG5cclxudmFyIGVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xyXG52YXIgZXJyb3JNZXNzYWdlcyA9IGVycm9yLm1lc3NhZ2VzO1xyXG52YXIgQ2FzdEVycm9yID0gZXJyb3IuQ2FzdEVycm9yO1xyXG52YXIgVmFsaWRhdG9yRXJyb3IgPSBlcnJvci5WYWxpZGF0b3JFcnJvcjtcclxuXHJcbi8qKlxyXG4gKiBTY2hlbWFUeXBlIGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cclxuICogQHBhcmFtIHtTdHJpbmd9IFtpbnN0YW5jZV1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBTY2hlbWFUeXBlIChwYXRoLCBvcHRpb25zLCBpbnN0YW5jZSkge1xyXG4gIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gIHRoaXMudmFsaWRhdG9ycyA9IFtdO1xyXG4gIHRoaXMuc2V0dGVycyA9IFtdO1xyXG4gIHRoaXMuZ2V0dGVycyA9IFtdO1xyXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XHJcblxyXG4gIGZvciAodmFyIGkgaW4gb3B0aW9ucykgaWYgKHRoaXNbaV0gJiYgJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgdGhpc1tpXSkge1xyXG4gICAgdmFyIG9wdHMgPSBBcnJheS5pc0FycmF5KG9wdGlvbnNbaV0pXHJcbiAgICAgID8gb3B0aW9uc1tpXVxyXG4gICAgICA6IFtvcHRpb25zW2ldXTtcclxuXHJcbiAgICB0aGlzW2ldLmFwcGx5KHRoaXMsIG9wdHMpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNldHMgYSBkZWZhdWx0IHZhbHVlIGZvciB0aGlzIFNjaGVtYVR5cGUuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMTAgfSlcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpXHJcbiAqICAgICB2YXIgbSA9IG5ldyBNO1xyXG4gKiAgICAgY29uc29sZS5sb2cobS5uKSAvLyAxMFxyXG4gKlxyXG4gKiBEZWZhdWx0cyBjYW4gYmUgZWl0aGVyIGBmdW5jdGlvbnNgIHdoaWNoIHJldHVybiB0aGUgdmFsdWUgdG8gdXNlIGFzIHRoZSBkZWZhdWx0IG9yIHRoZSBsaXRlcmFsIHZhbHVlIGl0c2VsZi4gRWl0aGVyIHdheSwgdGhlIHZhbHVlIHdpbGwgYmUgY2FzdCBiYXNlZCBvbiBpdHMgc2NoZW1hIHR5cGUgYmVmb3JlIGJlaW5nIHNldCBkdXJpbmcgZG9jdW1lbnQgY3JlYXRpb24uXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgLy8gdmFsdWVzIGFyZSBjYXN0OlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBhTnVtYmVyOiBOdW1iZXIsIGRlZmF1bHQ6IFwiNC44MTUxNjIzNDJcIiB9KVxyXG4gKiAgICAgdmFyIE0gPSBkYi5tb2RlbCgnTScsIHNjaGVtYSlcclxuICogICAgIHZhciBtID0gbmV3IE07XHJcbiAqICAgICBjb25zb2xlLmxvZyhtLmFOdW1iZXIpIC8vIDQuODE1MTYyMzQyXHJcbiAqXHJcbiAqICAgICAvLyBkZWZhdWx0IHVuaXF1ZSBvYmplY3RzIGZvciBNaXhlZCB0eXBlczpcclxuICogICAgIHZhciBzY2hlbWEgPSBuZXcgU2NoZW1hKHsgbWl4ZWQ6IFNjaGVtYS5UeXBlcy5NaXhlZCB9KTtcclxuICogICAgIHNjaGVtYS5wYXRoKCdtaXhlZCcpLmRlZmF1bHQoZnVuY3Rpb24gKCkge1xyXG4gKiAgICAgICByZXR1cm4ge307XHJcbiAqICAgICB9KTtcclxuICpcclxuICogICAgIC8vIGlmIHdlIGRvbid0IHVzZSBhIGZ1bmN0aW9uIHRvIHJldHVybiBvYmplY3QgbGl0ZXJhbHMgZm9yIE1peGVkIGRlZmF1bHRzLFxyXG4gKiAgICAgLy8gZWFjaCBkb2N1bWVudCB3aWxsIHJlY2VpdmUgYSByZWZlcmVuY2UgdG8gdGhlIHNhbWUgb2JqZWN0IGxpdGVyYWwgY3JlYXRpbmdcclxuICogICAgIC8vIGEgXCJzaGFyZWRcIiBvYmplY3QgaW5zdGFuY2U6XHJcbiAqICAgICB2YXIgc2NoZW1hID0gbmV3IFNjaGVtYSh7IG1peGVkOiBTY2hlbWEuVHlwZXMuTWl4ZWQgfSk7XHJcbiAqICAgICBzY2hlbWEucGF0aCgnbWl4ZWQnKS5kZWZhdWx0KHt9KTtcclxuICogICAgIHZhciBNID0gZGIubW9kZWwoJ00nLCBzY2hlbWEpO1xyXG4gKiAgICAgdmFyIG0xID0gbmV3IE07XHJcbiAqICAgICBtMS5taXhlZC5hZGRlZCA9IDE7XHJcbiAqICAgICBjb25zb2xlLmxvZyhtMS5taXhlZCk7IC8vIHsgYWRkZWQ6IDEgfVxyXG4gKiAgICAgdmFyIG0yID0gbmV3IE07XHJcbiAqICAgICBjb25zb2xlLmxvZyhtMi5taXhlZCk7IC8vIHsgYWRkZWQ6IDEgfVxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufGFueX0gdmFsIHRoZSBkZWZhdWx0IHZhbHVlXHJcbiAqIEByZXR1cm4ge2RlZmF1bHRWYWx1ZX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmRlZmF1bHQgPSBmdW5jdGlvbiAodmFsKSB7XHJcbiAgaWYgKDEgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICA/IHZhbFxyXG4gICAgICA6IHRoaXMuY2FzdCggdmFsICk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gIH0gZWxzZSBpZiAoIGFyZ3VtZW50cy5sZW5ndGggPiAxICkge1xyXG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBfLnRvQXJyYXkoIGFyZ3VtZW50cyApO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5kZWZhdWx0VmFsdWU7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIHNldHRlciB0byB0aGlzIHNjaGVtYXR5cGUuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gY2FwaXRhbGl6ZSAodmFsKSB7XHJcbiAqICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgdmFsKSB2YWwgPSAnJztcclxuICogICAgICAgcmV0dXJuIHZhbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhbC5zdWJzdHJpbmcoMSk7XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICAvLyBkZWZpbmluZyB3aXRoaW4gdGhlIHNjaGVtYVxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHNldDogY2FwaXRhbGl6ZSB9fSlcclxuICpcclxuICogICAgIC8vIG9yIGJ5IHJldHJlaXZpbmcgaXRzIFNjaGVtYVR5cGVcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IG5hbWU6IFN0cmluZyB9KVxyXG4gKiAgICAgcy5wYXRoKCduYW1lJykuc2V0KGNhcGl0YWxpemUpXHJcbiAqXHJcbiAqIFNldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgZGF0YSBiZWZvcmUgaXQgZ2V0cyB0byB0aGUgcmF3IG1vbmdvZGIgZG9jdW1lbnQgYW5kIGlzIHNldCBhcyBhIHZhbHVlIG9uIGFuIGFjdHVhbCBrZXkuXHJcbiAqXHJcbiAqIFN1cHBvc2UgeW91IGFyZSBpbXBsZW1lbnRpbmcgdXNlciByZWdpc3RyYXRpb24gZm9yIGEgd2Vic2l0ZS4gVXNlcnMgcHJvdmlkZSBhbiBlbWFpbCBhbmQgcGFzc3dvcmQsIHdoaWNoIGdldHMgc2F2ZWQgdG8gbW9uZ29kYi4gVGhlIGVtYWlsIGlzIGEgc3RyaW5nIHRoYXQgeW91IHdpbGwgd2FudCB0byBub3JtYWxpemUgdG8gbG93ZXIgY2FzZSwgaW4gb3JkZXIgdG8gYXZvaWQgb25lIGVtYWlsIGhhdmluZyBtb3JlIHRoYW4gb25lIGFjY291bnQgLS0gZS5nLiwgb3RoZXJ3aXNlLCBhdmVudWVAcS5jb20gY2FuIGJlIHJlZ2lzdGVyZWQgZm9yIDIgYWNjb3VudHMgdmlhIGF2ZW51ZUBxLmNvbSBhbmQgQXZFblVlQFEuQ29NLlxyXG4gKlxyXG4gKiBZb3UgY2FuIHNldCB1cCBlbWFpbCBsb3dlciBjYXNlIG5vcm1hbGl6YXRpb24gZWFzaWx5IHZpYSBhIE1vbmdvb3NlIHNldHRlci5cclxuICpcclxuICogICAgIGZ1bmN0aW9uIHRvTG93ZXIgKHYpIHtcclxuICogICAgICAgcmV0dXJuIHYudG9Mb3dlckNhc2UoKTtcclxuICogICAgIH1cclxuICpcclxuICogICAgIHZhciBVc2VyU2NoZW1hID0gbmV3IFNjaGVtYSh7XHJcbiAqICAgICAgIGVtYWlsOiB7IHR5cGU6IFN0cmluZywgc2V0OiB0b0xvd2VyIH1cclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICB2YXIgVXNlciA9IGRiLm1vZGVsKCdVc2VyJywgVXNlclNjaGVtYSlcclxuICpcclxuICogICAgIHZhciB1c2VyID0gbmV3IFVzZXIoe2VtYWlsOiAnQVZFTlVFQFEuQ09NJ30pXHJcbiAqICAgICBjb25zb2xlLmxvZyh1c2VyLmVtYWlsKTsgLy8gJ2F2ZW51ZUBxLmNvbSdcclxuICpcclxuICogICAgIC8vIG9yXHJcbiAqICAgICB2YXIgdXNlciA9IG5ldyBVc2VyXHJcbiAqICAgICB1c2VyLmVtYWlsID0gJ0F2ZW51ZUBRLmNvbSdcclxuICogICAgIGNvbnNvbGUubG9nKHVzZXIuZW1haWwpIC8vICdhdmVudWVAcS5jb20nXHJcbiAqXHJcbiAqIEFzIHlvdSBjYW4gc2VlIGFib3ZlLCBzZXR0ZXJzIGFsbG93IHlvdSB0byB0cmFuc2Zvcm0gdGhlIGRhdGEgYmVmb3JlIGl0IGdldHMgdG8gdGhlIHJhdyBtb25nb2RiIGRvY3VtZW50IGFuZCBpcyBzZXQgYXMgYSB2YWx1ZSBvbiBhbiBhY3R1YWwga2V5LlxyXG4gKlxyXG4gKiBfTk9URTogd2UgY291bGQgaGF2ZSBhbHNvIGp1c3QgdXNlZCB0aGUgYnVpbHQtaW4gYGxvd2VyY2FzZTogdHJ1ZWAgU2NoZW1hVHlwZSBvcHRpb24gaW5zdGVhZCBvZiBkZWZpbmluZyBvdXIgb3duIGZ1bmN0aW9uLl9cclxuICpcclxuICogICAgIG5ldyBTY2hlbWEoeyBlbWFpbDogeyB0eXBlOiBTdHJpbmcsIGxvd2VyY2FzZTogdHJ1ZSB9fSlcclxuICpcclxuICogU2V0dGVycyBhcmUgYWxzbyBwYXNzZWQgYSBzZWNvbmQgYXJndW1lbnQsIHRoZSBzY2hlbWF0eXBlIG9uIHdoaWNoIHRoZSBzZXR0ZXIgd2FzIGRlZmluZWQuIFRoaXMgYWxsb3dzIGZvciB0YWlsb3JlZCBiZWhhdmlvciBiYXNlZCBvbiBvcHRpb25zIHBhc3NlZCBpbiB0aGUgc2NoZW1hLlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gaW5zcGVjdG9yICh2YWwsIHNjaGVtYXR5cGUpIHtcclxuICogICAgICAgaWYgKHNjaGVtYXR5cGUub3B0aW9ucy5yZXF1aXJlZCkge1xyXG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIHJlcXVpcmVkJztcclxuICogICAgICAgfSBlbHNlIHtcclxuICogICAgICAgICByZXR1cm4gdmFsO1xyXG4gKiAgICAgICB9XHJcbiAqICAgICB9XHJcbiAqXHJcbiAqICAgICB2YXIgVmlydXNTY2hlbWEgPSBuZXcgU2NoZW1hKHtcclxuICogICAgICAgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBzZXQ6IGluc3BlY3RvciB9LFxyXG4gKiAgICAgICB0YXhvbm9teTogeyB0eXBlOiBTdHJpbmcsIHNldDogaW5zcGVjdG9yIH1cclxuICogICAgIH0pXHJcbiAqXHJcbiAqICAgICB2YXIgVmlydXMgPSBkYi5tb2RlbCgnVmlydXMnLCBWaXJ1c1NjaGVtYSk7XHJcbiAqICAgICB2YXIgdiA9IG5ldyBWaXJ1cyh7IG5hbWU6ICdQYXJ2b3ZpcmlkYWUnLCB0YXhvbm9teTogJ1BhcnZvdmlyaW5hZScgfSk7XHJcbiAqXHJcbiAqICAgICBjb25zb2xlLmxvZyh2Lm5hbWUpOyAgICAgLy8gbmFtZSBpcyByZXF1aXJlZFxyXG4gKiAgICAgY29uc29sZS5sb2codi50YXhvbm9teSk7IC8vIFBhcnZvdmlyaW5hZVxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtTY2hlbWFUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZm4pIHtcclxuICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pXHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIHNldHRlciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XHJcbiAgdGhpcy5zZXR0ZXJzLnB1c2goZm4pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBnZXR0ZXIgdG8gdGhpcyBzY2hlbWF0eXBlLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIGZ1bmN0aW9uIGRvYiAodmFsKSB7XHJcbiAqICAgICAgIGlmICghdmFsKSByZXR1cm4gdmFsO1xyXG4gKiAgICAgICByZXR1cm4gKHZhbC5nZXRNb250aCgpICsgMSkgKyBcIi9cIiArIHZhbC5nZXREYXRlKCkgKyBcIi9cIiArIHZhbC5nZXRGdWxsWWVhcigpO1xyXG4gKiAgICAgfVxyXG4gKlxyXG4gKiAgICAgLy8gZGVmaW5pbmcgd2l0aGluIHRoZSBzY2hlbWFcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IHsgdHlwZTogRGF0ZSwgZ2V0OiBkb2IgfSlcclxuICpcclxuICogICAgIC8vIG9yIGJ5IHJldHJlaXZpbmcgaXRzIFNjaGVtYVR5cGVcclxuICogICAgIHZhciBzID0gbmV3IFNjaGVtYSh7IGJvcm46IERhdGUgfSlcclxuICogICAgIHMucGF0aCgnYm9ybicpLmdldChkb2IpXHJcbiAqXHJcbiAqIEdldHRlcnMgYWxsb3cgeW91IHRvIHRyYW5zZm9ybSB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgYXMgaXQgdHJhdmVscyBmcm9tIHRoZSByYXcgbW9uZ29kYiBkb2N1bWVudCB0byB0aGUgdmFsdWUgdGhhdCB5b3Ugc2VlLlxyXG4gKlxyXG4gKiBTdXBwb3NlIHlvdSBhcmUgc3RvcmluZyBjcmVkaXQgY2FyZCBudW1iZXJzIGFuZCB5b3Ugd2FudCB0byBoaWRlIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBsYXN0IDQgZGlnaXRzIHRvIHRoZSBtb25nb29zZSB1c2VyLiBZb3UgY2FuIGRvIHNvIGJ5IGRlZmluaW5nIGEgZ2V0dGVyIGluIHRoZSBmb2xsb3dpbmcgd2F5OlxyXG4gKlxyXG4gKiAgICAgZnVuY3Rpb24gb2JmdXNjYXRlIChjYykge1xyXG4gKiAgICAgICByZXR1cm4gJyoqKiotKioqKi0qKioqLScgKyBjYy5zbGljZShjYy5sZW5ndGgtNCwgY2MubGVuZ3RoKTtcclxuICogICAgIH1cclxuICpcclxuICogICAgIHZhciBBY2NvdW50U2NoZW1hID0gbmV3IFNjaGVtYSh7XHJcbiAqICAgICAgIGNyZWRpdENhcmROdW1iZXI6IHsgdHlwZTogU3RyaW5nLCBnZXQ6IG9iZnVzY2F0ZSB9XHJcbiAqICAgICB9KTtcclxuICpcclxuICogICAgIHZhciBBY2NvdW50ID0gZGIubW9kZWwoJ0FjY291bnQnLCBBY2NvdW50U2NoZW1hKTtcclxuICpcclxuICogICAgIEFjY291bnQuZmluZEJ5SWQoaWQsIGZ1bmN0aW9uIChlcnIsIGZvdW5kKSB7XHJcbiAqICAgICAgIGNvbnNvbGUubG9nKGZvdW5kLmNyZWRpdENhcmROdW1iZXIpOyAvLyAnKioqKi0qKioqLSoqKiotMTIzNCdcclxuICogICAgIH0pO1xyXG4gKlxyXG4gKiBHZXR0ZXJzIGFyZSBhbHNvIHBhc3NlZCBhIHNlY29uZCBhcmd1bWVudCwgdGhlIHNjaGVtYXR5cGUgb24gd2hpY2ggdGhlIGdldHRlciB3YXMgZGVmaW5lZC4gVGhpcyBhbGxvd3MgZm9yIHRhaWxvcmVkIGJlaGF2aW9yIGJhc2VkIG9uIG9wdGlvbnMgcGFzc2VkIGluIHRoZSBzY2hlbWEuXHJcbiAqXHJcbiAqICAgICBmdW5jdGlvbiBpbnNwZWN0b3IgKHZhbCwgc2NoZW1hdHlwZSkge1xyXG4gKiAgICAgICBpZiAoc2NoZW1hdHlwZS5vcHRpb25zLnJlcXVpcmVkKSB7XHJcbiAqICAgICAgICAgcmV0dXJuIHNjaGVtYXR5cGUucGF0aCArICcgaXMgcmVxdWlyZWQnO1xyXG4gKiAgICAgICB9IGVsc2Uge1xyXG4gKiAgICAgICAgIHJldHVybiBzY2hlbWF0eXBlLnBhdGggKyAnIGlzIG5vdCc7XHJcbiAqICAgICAgIH1cclxuICogICAgIH1cclxuICpcclxuICogICAgIHZhciBWaXJ1c1NjaGVtYSA9IG5ldyBTY2hlbWEoe1xyXG4gKiAgICAgICBuYW1lOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUsIGdldDogaW5zcGVjdG9yIH0sXHJcbiAqICAgICAgIHRheG9ub215OiB7IHR5cGU6IFN0cmluZywgZ2V0OiBpbnNwZWN0b3IgfVxyXG4gKiAgICAgfSlcclxuICpcclxuICogICAgIHZhciBWaXJ1cyA9IGRiLm1vZGVsKCdWaXJ1cycsIFZpcnVzU2NoZW1hKTtcclxuICpcclxuICogICAgIFZpcnVzLmZpbmRCeUlkKGlkLCBmdW5jdGlvbiAoZXJyLCB2aXJ1cykge1xyXG4gKiAgICAgICBjb25zb2xlLmxvZyh2aXJ1cy5uYW1lKTsgICAgIC8vIG5hbWUgaXMgcmVxdWlyZWRcclxuICogICAgICAgY29uc29sZS5sb2codmlydXMudGF4b25vbXkpOyAvLyB0YXhvbm9teSBpcyBub3RcclxuICogICAgIH0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1NjaGVtYVR5cGV9IHRoaXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiBmbilcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgZ2V0dGVyIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcclxuICB0aGlzLmdldHRlcnMucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyB2YWxpZGF0b3IocykgZm9yIHRoaXMgZG9jdW1lbnQgcGF0aC5cclxuICpcclxuICogVmFsaWRhdG9ycyBhbHdheXMgcmVjZWl2ZSB0aGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgdGhlaXIgZmlyc3QgYXJndW1lbnQgYW5kIG11c3QgcmV0dXJuIGBCb29sZWFuYC4gUmV0dXJuaW5nIGBmYWxzZWAgbWVhbnMgdmFsaWRhdGlvbiBmYWlsZWQuXHJcbiAqXHJcbiAqIFRoZSBlcnJvciBtZXNzYWdlIGFyZ3VtZW50IGlzIG9wdGlvbmFsLiBJZiBub3QgcGFzc2VkLCB0aGUgW2RlZmF1bHQgZ2VuZXJpYyBlcnJvciBtZXNzYWdlIHRlbXBsYXRlXSgjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlcykgd2lsbCBiZSB1c2VkLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZXM6XHJcbiAqXHJcbiAqICAgICAvLyBtYWtlIHN1cmUgZXZlcnkgdmFsdWUgaXMgZXF1YWwgdG8gXCJzb21ldGhpbmdcIlxyXG4gKiAgICAgZnVuY3Rpb24gdmFsaWRhdG9yICh2YWwpIHtcclxuICogICAgICAgcmV0dXJuIHZhbCA9PSAnc29tZXRoaW5nJztcclxuICogICAgIH1cclxuICogICAgIG5ldyBTY2hlbWEoeyBuYW1lOiB7IHR5cGU6IFN0cmluZywgdmFsaWRhdGU6IHZhbGlkYXRvciB9fSk7XHJcbiAqXHJcbiAqICAgICAvLyB3aXRoIGEgY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICpcclxuICogICAgIHZhciBjdXN0b20gPSBbdmFsaWRhdG9yLCAnVWggb2gsIHtQQVRIfSBkb2VzIG5vdCBlcXVhbCBcInNvbWV0aGluZ1wiLiddXHJcbiAqICAgICBuZXcgU2NoZW1hKHsgbmFtZTogeyB0eXBlOiBTdHJpbmcsIHZhbGlkYXRlOiBjdXN0b20gfX0pO1xyXG4gKlxyXG4gKiAgICAgLy8gYWRkaW5nIG1hbnkgdmFsaWRhdG9ycyBhdCBhIHRpbWVcclxuICpcclxuICogICAgIHZhciBtYW55ID0gW1xyXG4gKiAgICAgICAgIHsgdmFsaWRhdG9yOiB2YWxpZGF0b3IsIG1zZzogJ3VoIG9oJyB9XHJcbiAqICAgICAgICwgeyB2YWxpZGF0b3I6IGFub3RoZXJWYWxpZGF0b3IsIG1zZzogJ2ZhaWxlZCcgfVxyXG4gKiAgICAgXVxyXG4gKiAgICAgbmV3IFNjaGVtYSh7IG5hbWU6IHsgdHlwZTogU3RyaW5nLCB2YWxpZGF0ZTogbWFueSB9fSk7XHJcbiAqXHJcbiAqICAgICAvLyBvciB1dGlsaXppbmcgU2NoZW1hVHlwZSBtZXRob2RzIGRpcmVjdGx5OlxyXG4gKlxyXG4gKiAgICAgdmFyIHNjaGVtYSA9IG5ldyBTY2hlbWEoeyBuYW1lOiAnc3RyaW5nJyB9KTtcclxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykudmFsaWRhdGUodmFsaWRhdG9yLCAndmFsaWRhdGlvbiBvZiBge1BBVEh9YCBmYWlsZWQgd2l0aCB2YWx1ZSBge1ZBTFVFfWAnKTtcclxuICpcclxuICogIyMjI0Vycm9yIG1lc3NhZ2UgdGVtcGxhdGVzOlxyXG4gKlxyXG4gKiBGcm9tIHRoZSBleGFtcGxlcyBhYm92ZSwgeW91IG1heSBoYXZlIG5vdGljZWQgdGhhdCBlcnJvciBtZXNzYWdlcyBzdXBwb3J0IGJhc2VpYyB0ZW1wbGF0aW5nLiBUaGVyZSBhcmUgYSBmZXcgb3RoZXIgdGVtcGxhdGUga2V5d29yZHMgYmVzaWRlcyBge1BBVEh9YCBhbmQgYHtWQUxVRX1gIHRvby4gVG8gZmluZCBvdXQgbW9yZSwgZGV0YWlscyBhcmUgYXZhaWxhYmxlIFtoZXJlXSgjZXJyb3JfbWVzc2FnZXNfTW9uZ29vc2VFcnJvci1tZXNzYWdlcylcclxuICpcclxuICogIyMjI0FzeW5jaHJvbm91cyB2YWxpZGF0aW9uOlxyXG4gKlxyXG4gKiBQYXNzaW5nIGEgdmFsaWRhdG9yIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdHdvIGFyZ3VtZW50cyB0ZWxscyBtb25nb29zZSB0aGF0IHRoZSB2YWxpZGF0b3IgaXMgYW4gYXN5bmNocm9ub3VzIHZhbGlkYXRvci4gVGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGUgdmFsaWRhdG9yIGZ1bmN0aW9uIGlzIHRoZSB2YWx1ZSBiZWluZyB2YWxpZGF0ZWQuIFRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG11c3QgY2FsbGVkIHdoZW4geW91IGZpbmlzaCB2YWxpZGF0aW5nIHRoZSB2YWx1ZSBhbmQgcGFzc2VkIGVpdGhlciBgdHJ1ZWAgb3IgYGZhbHNlYCB0byBjb21tdW5pY2F0ZSBlaXRoZXIgc3VjY2VzcyBvciBmYWlsdXJlIHJlc3BlY3RpdmVseS5cclxuICpcclxuICogICAgIHNjaGVtYS5wYXRoKCduYW1lJykudmFsaWRhdGUoZnVuY3Rpb24gKHZhbHVlLCByZXNwb25kKSB7XHJcbiAqICAgICAgIGRvU3R1ZmYodmFsdWUsIGZ1bmN0aW9uICgpIHtcclxuICogICAgICAgICAuLi5cclxuICogICAgICAgICByZXNwb25kKGZhbHNlKTsgLy8gdmFsaWRhdGlvbiBmYWlsZWRcclxuICogICAgICAgfSlcclxuKiAgICAgIH0sICd7UEFUSH0gZmFpbGVkIHZhbGlkYXRpb24uJyk7XHJcbipcclxuICogWW91IG1pZ2h0IHVzZSBhc3luY2hyb25vdXMgdmFsaWRhdG9ycyB0byByZXRyZWl2ZSBvdGhlciBkb2N1bWVudHMgZnJvbSB0aGUgZGF0YWJhc2UgdG8gdmFsaWRhdGUgYWdhaW5zdCBvciB0byBtZWV0IG90aGVyIEkvTyBib3VuZCB2YWxpZGF0aW9uIG5lZWRzLlxyXG4gKlxyXG4gKiBWYWxpZGF0aW9uIG9jY3VycyBgcHJlKCdzYXZlJylgIG9yIHdoZW5ldmVyIHlvdSBtYW51YWxseSBleGVjdXRlIFtkb2N1bWVudCN2YWxpZGF0ZV0oI2RvY3VtZW50X0RvY3VtZW50LXZhbGlkYXRlKS5cclxuICpcclxuICogSWYgdmFsaWRhdGlvbiBmYWlscyBkdXJpbmcgYHByZSgnc2F2ZScpYCBhbmQgbm8gY2FsbGJhY2sgd2FzIHBhc3NlZCB0byByZWNlaXZlIHRoZSBlcnJvciwgYW4gYGVycm9yYCBldmVudCB3aWxsIGJlIGVtaXR0ZWQgb24geW91ciBNb2RlbHMgYXNzb2NpYXRlZCBkYiBbY29ubmVjdGlvbl0oI2Nvbm5lY3Rpb25fQ29ubmVjdGlvbiksIHBhc3NpbmcgdGhlIHZhbGlkYXRpb24gZXJyb3Igb2JqZWN0IGFsb25nLlxyXG4gKlxyXG4gKiAgICAgdmFyIGNvbm4gPSBtb25nb29zZS5jcmVhdGVDb25uZWN0aW9uKC4uKTtcclxuICogICAgIGNvbm4ub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xyXG4gKlxyXG4gKiAgICAgdmFyIFByb2R1Y3QgPSBjb25uLm1vZGVsKCdQcm9kdWN0JywgeW91clNjaGVtYSk7XHJcbiAqICAgICB2YXIgZHZkID0gbmV3IFByb2R1Y3QoLi4pO1xyXG4gKiAgICAgZHZkLnNhdmUoKTsgLy8gZW1pdHMgZXJyb3Igb24gdGhlIGBjb25uYCBhYm92ZVxyXG4gKlxyXG4gKiBJZiB5b3UgZGVzaXJlIGhhbmRsaW5nIHRoZXNlIGVycm9ycyBhdCB0aGUgTW9kZWwgbGV2ZWwsIGF0dGFjaCBhbiBgZXJyb3JgIGxpc3RlbmVyIHRvIHlvdXIgTW9kZWwgYW5kIHRoZSBldmVudCB3aWxsIGluc3RlYWQgYmUgZW1pdHRlZCB0aGVyZS5cclxuICpcclxuICogICAgIC8vIHJlZ2lzdGVyaW5nIGFuIGVycm9yIGxpc3RlbmVyIG9uIHRoZSBNb2RlbCBsZXRzIHVzIGhhbmRsZSBlcnJvcnMgbW9yZSBsb2NhbGx5XHJcbiAqICAgICBQcm9kdWN0Lm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcclxuICpcclxuICogQHBhcmFtIHtSZWdFeHB8RnVuY3Rpb258T2JqZWN0fSBvYmogdmFsaWRhdG9yXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZXJyb3JNc2ddIG9wdGlvbmFsIGVycm9yIG1lc3NhZ2VcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAob2JqLCBtZXNzYWdlLCB0eXBlKSB7XHJcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIG9iaiB8fCBvYmogJiYgJ1JlZ0V4cCcgPT09IG9iai5jb25zdHJ1Y3Rvci5uYW1lKSB7XHJcbiAgICBpZiAoIW1lc3NhZ2UpIG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2VzLmdlbmVyYWwuZGVmYXVsdDtcclxuICAgIGlmICghdHlwZSkgdHlwZSA9ICd1c2VyIGRlZmluZWQnO1xyXG4gICAgdGhpcy52YWxpZGF0b3JzLnB1c2goW29iaiwgbWVzc2FnZSwgdHlwZV0pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGhcclxuICAgICwgYXJnO1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICBhcmcgPSBhcmd1bWVudHNbaV07XHJcbiAgICBpZiAoIShhcmcgJiYgJ09iamVjdCcgPT0gYXJnLmNvbnN0cnVjdG9yLm5hbWUpKSB7XHJcbiAgICAgIHZhciBtc2cgPSAnSW52YWxpZCB2YWxpZGF0b3IuIFJlY2VpdmVkICgnICsgdHlwZW9mIGFyZyArICcpICdcclxuICAgICAgICArIGFyZ1xyXG4gICAgICAgICsgJy4gU2VlIGh0dHA6Ly9tb25nb29zZWpzLmNvbS9kb2NzL2FwaS5odG1sI3NjaGVtYXR5cGVfU2NoZW1hVHlwZS12YWxpZGF0ZSc7XHJcblxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuICAgIH1cclxuICAgIHRoaXMudmFsaWRhdGUoYXJnLnZhbGlkYXRvciwgYXJnLm1zZywgYXJnLnR5cGUpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhIHJlcXVpcmVkIHZhbGlkYXRvciB0byB0aGlzIHNjaGVtYXR5cGUuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogdHJ1ZSB9KVxyXG4gKlxyXG4gKiAgICAgLy8gb3Igd2l0aCBjdXN0b20gZXJyb3IgbWVzc2FnZVxyXG4gKlxyXG4gKiAgICAgdmFyIHMgPSBuZXcgU2NoZW1hKHsgYm9ybjogeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogJ3tQQVRIfSBpcyByZXF1aXJlZCEnIH0pXHJcbiAqXHJcbiAqICAgICAvLyBvciB0aHJvdWdoIHRoZSBwYXRoIEFQSVxyXG4gKlxyXG4gKiAgICAgU2NoZW1hLnBhdGgoJ25hbWUnKS5yZXF1aXJlZCh0cnVlKTtcclxuICpcclxuICogICAgIC8vIHdpdGggY3VzdG9tIGVycm9yIG1lc3NhZ2luZ1xyXG4gKlxyXG4gKiAgICAgU2NoZW1hLnBhdGgoJ25hbWUnKS5yZXF1aXJlZCh0cnVlLCAnZ3JyciA6KCAnKTtcclxuICpcclxuICpcclxuICogQHBhcmFtIHtCb29sZWFufSByZXF1aXJlZCBlbmFibGUvZGlzYWJsZSB0aGUgdmFsaWRhdG9yXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbWVzc2FnZV0gb3B0aW9uYWwgY3VzdG9tIGVycm9yIG1lc3NhZ2VcclxuICogQHJldHVybiB7U2NoZW1hVHlwZX0gdGhpc1xyXG4gKiBAc2VlIEN1c3RvbWl6ZWQgRXJyb3IgTWVzc2FnZXMgI2Vycm9yX21lc3NhZ2VzX01vbmdvb3NlRXJyb3ItbWVzc2FnZXNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLnJlcXVpcmVkID0gZnVuY3Rpb24gKHJlcXVpcmVkLCBtZXNzYWdlKSB7XHJcbiAgaWYgKGZhbHNlID09PSByZXF1aXJlZCkge1xyXG4gICAgdGhpcy52YWxpZGF0b3JzID0gdGhpcy52YWxpZGF0b3JzLmZpbHRlcihmdW5jdGlvbiAodikge1xyXG4gICAgICByZXR1cm4gdlswXSAhPSB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yO1xyXG4gICAgfSwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5pc1JlcXVpcmVkID0gZmFsc2U7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLmlzUmVxdWlyZWQgPSB0cnVlO1xyXG5cclxuICB0aGlzLnJlcXVpcmVkVmFsaWRhdG9yID0gZnVuY3Rpb24gKHYpIHtcclxuICAgIC8vIGluIGhlcmUsIGB0aGlzYCByZWZlcnMgdG8gdGhlIHZhbGlkYXRpbmcgZG9jdW1lbnQuXHJcbiAgICAvLyBubyB2YWxpZGF0aW9uIHdoZW4gdGhpcyBwYXRoIHdhc24ndCBzZWxlY3RlZCBpbiB0aGUgcXVlcnkuXHJcbiAgICBpZiAodGhpcyAhPT0gdW5kZWZpbmVkICYmIC8vINGB0L/QtdGG0LjQsNC70YzQvdCw0Y8g0L/RgNC+0LLQtdGA0LrQsCDQuNC3LdC30LAgc3RyaWN0IG1vZGUg0Lgg0L7RgdC+0LHQtdC90L3QvtGB0YLQuCAuY2FsbCh1bmRlZmluZWQpXHJcbiAgICAgICAgJ2lzU2VsZWN0ZWQnIGluIHRoaXMgJiZcclxuICAgICAgICAhdGhpcy5pc1NlbGVjdGVkKHNlbGYucGF0aCkgJiZcclxuICAgICAgICAhdGhpcy5pc01vZGlmaWVkKHNlbGYucGF0aCkpIHJldHVybiB0cnVlO1xyXG5cclxuICAgIHJldHVybiBzZWxmLmNoZWNrUmVxdWlyZWQodiwgdGhpcyk7XHJcbiAgfTtcclxuXHJcbiAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiByZXF1aXJlZCkge1xyXG4gICAgbWVzc2FnZSA9IHJlcXVpcmVkO1xyXG4gICAgcmVxdWlyZWQgPSB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICB2YXIgbXNnID0gbWVzc2FnZSB8fCBlcnJvck1lc3NhZ2VzLmdlbmVyYWwucmVxdWlyZWQ7XHJcbiAgdGhpcy52YWxpZGF0b3JzLnB1c2goW3RoaXMucmVxdWlyZWRWYWxpZGF0b3IsIG1zZywgJ3JlcXVpcmVkJ10pO1xyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgZGVmYXVsdCB2YWx1ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGUgdGhlIHNjb3BlIHdoaWNoIGNhbGxiYWNrIGFyZSBleGVjdXRlZFxyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TY2hlbWFUeXBlLnByb3RvdHlwZS5nZXREZWZhdWx0ID0gZnVuY3Rpb24gKHNjb3BlLCBpbml0KSB7XHJcbiAgdmFyIHJldCA9ICdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLmRlZmF1bHRWYWx1ZVxyXG4gICAgPyB0aGlzLmRlZmF1bHRWYWx1ZS5jYWxsKHNjb3BlKVxyXG4gICAgOiB0aGlzLmRlZmF1bHRWYWx1ZTtcclxuXHJcbiAgaWYgKG51bGwgIT09IHJldCAmJiB1bmRlZmluZWQgIT09IHJldCkge1xyXG4gICAgcmV0dXJuIHRoaXMuY2FzdChyZXQsIHNjb3BlLCBpbml0KTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIHJldDtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQXBwbGllcyBzZXR0ZXJzXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcclxuICogQHBhcmFtIHtCb29sZWFufSBpbml0XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmFwcGx5U2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUsIGluaXQsIHByaW9yVmFsKSB7XHJcbiAgaWYgKFNjaGVtYVR5cGUuX2lzUmVmKCB0aGlzLCB2YWx1ZSApKSB7XHJcbiAgICByZXR1cm4gaW5pdFxyXG4gICAgICA/IHZhbHVlXHJcbiAgICAgIDogdGhpcy5jYXN0KHZhbHVlLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHYgPSB2YWx1ZVxyXG4gICAgLCBzZXR0ZXJzID0gdGhpcy5zZXR0ZXJzXHJcbiAgICAsIGxlbiA9IHNldHRlcnMubGVuZ3RoXHJcbiAgICAsIGNhc3RlciA9IHRoaXMuY2FzdGVyO1xyXG5cclxuICBpZiAoQXJyYXkuaXNBcnJheSh2KSAmJiBjYXN0ZXIgJiYgY2FzdGVyLnNldHRlcnMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdi5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2W2ldID0gY2FzdGVyLmFwcGx5U2V0dGVycyh2W2ldLCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCFsZW4pIHtcclxuICAgIGlmIChudWxsID09PSB2IHx8IHVuZGVmaW5lZCA9PT0gdikgcmV0dXJuIHY7XHJcbiAgICByZXR1cm4gdGhpcy5jYXN0KHYsIHNjb3BlLCBpbml0LCBwcmlvclZhbCk7XHJcbiAgfVxyXG5cclxuICB3aGlsZSAobGVuLS0pIHtcclxuICAgIHYgPSBzZXR0ZXJzW2xlbl0uY2FsbChzY29wZSwgdiwgdGhpcyk7XHJcbiAgfVxyXG5cclxuICBpZiAobnVsbCA9PT0gdiB8fCB1bmRlZmluZWQgPT09IHYpIHJldHVybiB2O1xyXG5cclxuICAvLyBkbyBub3QgY2FzdCB1bnRpbCBhbGwgc2V0dGVycyBhcmUgYXBwbGllZCAjNjY1XHJcbiAgdiA9IHRoaXMuY2FzdCh2LCBzY29wZSwgaW5pdCwgcHJpb3JWYWwpO1xyXG5cclxuICByZXR1cm4gdjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYSB2YWx1ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuU2NoZW1hVHlwZS5wcm90b3R5cGUuYXBwbHlHZXR0ZXJzID0gZnVuY3Rpb24oIHZhbHVlLCBzY29wZSApe1xyXG4gIGlmICggU2NoZW1hVHlwZS5faXNSZWYoIHRoaXMsIHZhbHVlICkgKSByZXR1cm4gdmFsdWU7XHJcblxyXG4gIHZhciB2ID0gdmFsdWVcclxuICAgICwgZ2V0dGVycyA9IHRoaXMuZ2V0dGVyc1xyXG4gICAgLCBsZW4gPSBnZXR0ZXJzLmxlbmd0aDtcclxuXHJcbiAgaWYgKCAhbGVuICkge1xyXG4gICAgcmV0dXJuIHY7XHJcbiAgfVxyXG5cclxuICB3aGlsZSAoIGxlbi0tICkge1xyXG4gICAgdiA9IGdldHRlcnNbIGxlbiBdLmNhbGwoc2NvcGUsIHYsIHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHY7XHJcbn07XHJcblxyXG4vKipcclxuICogUGVyZm9ybXMgYSB2YWxpZGF0aW9uIG9mIGB2YWx1ZWAgdXNpbmcgdGhlIHZhbGlkYXRvcnMgZGVjbGFyZWQgZm9yIHRoaXMgU2NoZW1hVHlwZS5cclxuICpcclxuICogQHBhcmFtIHthbnl9IHZhbHVlXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblNjaGVtYVR5cGUucHJvdG90eXBlLmRvVmFsaWRhdGUgPSBmdW5jdGlvbiAodmFsdWUsIGNhbGxiYWNrLCBzY29wZSkge1xyXG4gIHZhciBlcnIgPSBmYWxzZVxyXG4gICAgLCBwYXRoID0gdGhpcy5wYXRoXHJcbiAgICAsIGNvdW50ID0gdGhpcy52YWxpZGF0b3JzLmxlbmd0aDtcclxuXHJcbiAgaWYgKCFjb3VudCkgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xyXG5cclxuICBmdW5jdGlvbiB2YWxpZGF0ZSAob2ssIG1lc3NhZ2UsIHR5cGUsIHZhbCkge1xyXG4gICAgaWYgKGVycikgcmV0dXJuO1xyXG4gICAgaWYgKG9rID09PSB1bmRlZmluZWQgfHwgb2spIHtcclxuICAgICAgLS1jb3VudCB8fCBjYWxsYmFjayhudWxsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNhbGxiYWNrKGVyciA9IG5ldyBWYWxpZGF0b3JFcnJvcihwYXRoLCBtZXNzYWdlLCB0eXBlLCB2YWwpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRoaXMudmFsaWRhdG9ycy5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XHJcbiAgICB2YXIgdmFsaWRhdG9yID0gdlswXVxyXG4gICAgICAsIG1lc3NhZ2UgPSB2WzFdXHJcbiAgICAgICwgdHlwZSA9IHZbMl07XHJcblxyXG4gICAgaWYgKHZhbGlkYXRvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xyXG4gICAgICB2YWxpZGF0ZSh2YWxpZGF0b3IudGVzdCh2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcclxuICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbGlkYXRvcikge1xyXG4gICAgICBpZiAoMiA9PT0gdmFsaWRhdG9yLmxlbmd0aCkge1xyXG4gICAgICAgIHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSwgZnVuY3Rpb24gKG9rKSB7XHJcbiAgICAgICAgICB2YWxpZGF0ZShvaywgbWVzc2FnZSwgdHlwZSwgdmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhbGlkYXRlKHZhbGlkYXRvci5jYWxsKHNjb3BlLCB2YWx1ZSksIG1lc3NhZ2UsIHR5cGUsIHZhbHVlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERldGVybWluZXMgaWYgdmFsdWUgaXMgYSB2YWxpZCBSZWZlcmVuY2UuXHJcbiAqXHJcbiAqINCd0LAg0LrQu9C40LXQvdGC0LUg0LIg0LrQsNGH0LXRgdGC0LLQtSDRgdGB0YvQu9C60Lgg0LzQvtC20L3QviDRhdGA0LDQvdC40YLRjCDQutCw0LogaWQsINGC0LDQuiDQuCDQv9C+0LvQvdGL0LUg0LTQvtC60YPQvNC10L3RgtGLXHJcbiAqXHJcbiAqIEBwYXJhbSB7U2NoZW1hVHlwZX0gc2VsZlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5TY2hlbWFUeXBlLl9pc1JlZiA9IGZ1bmN0aW9uKCBzZWxmLCB2YWx1ZSApe1xyXG4gIC8vIGZhc3QgcGF0aFxyXG4gIHZhciByZWYgPSBzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlZjtcclxuXHJcbiAgaWYgKCByZWYgKSB7XHJcbiAgICBpZiAoIG51bGwgPT0gdmFsdWUgKSByZXR1cm4gdHJ1ZTtcclxuICAgIGlmICggXy5pc09iamVjdCggdmFsdWUgKSApIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG4vKiFcclxuICogTW9kdWxlIGV4cG9ydHMuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFUeXBlO1xyXG5cclxuU2NoZW1hVHlwZS5DYXN0RXJyb3IgPSBDYXN0RXJyb3I7XHJcblxyXG5TY2hlbWFUeXBlLlZhbGlkYXRvckVycm9yID0gVmFsaWRhdG9yRXJyb3I7XHJcbiIsIi8qIVxuICogU3RhdGVNYWNoaW5lIHJlcHJlc2VudHMgYSBtaW5pbWFsIGBpbnRlcmZhY2VgIGZvciB0aGVcbiAqIGNvbnN0cnVjdG9ycyBpdCBidWlsZHMgdmlhIFN0YXRlTWFjaGluZS5jdG9yKC4uLikuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIFN0YXRlTWFjaGluZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVNYWNoaW5lICgpIHtcbiAgdGhpcy5wYXRocyA9IHt9O1xuICB0aGlzLnN0YXRlcyA9IHt9O1xufTtcblxuLyohXG4gKiBTdGF0ZU1hY2hpbmUuY3Rvcignc3RhdGUxJywgJ3N0YXRlMicsIC4uLilcbiAqIEEgZmFjdG9yeSBtZXRob2QgZm9yIHN1YmNsYXNzaW5nIFN0YXRlTWFjaGluZS5cbiAqIFRoZSBhcmd1bWVudHMgYXJlIGEgbGlzdCBvZiBzdGF0ZXMuIEZvciBlYWNoIHN0YXRlLFxuICogdGhlIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlIGdldHMgc3RhdGUgdHJhbnNpdGlvblxuICogbWV0aG9kcyBuYW1lZCBhZnRlciBlYWNoIHN0YXRlLiBUaGVzZSB0cmFuc2l0aW9uIG1ldGhvZHNcbiAqIHBsYWNlIHRoZWlyIHBhdGggYXJndW1lbnQgaW50byB0aGUgZ2l2ZW4gc3RhdGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHJldHVybiB7RnVuY3Rpb259IHN1YmNsYXNzIGNvbnN0cnVjdG9yXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5jdG9yID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RhdGVzID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgU3RhdGVNYWNoaW5lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5zdGF0ZU5hbWVzID0gc3RhdGVzO1xuXG4gICAgdmFyIGkgPSBzdGF0ZXMubGVuZ3RoXG4gICAgICAsIHN0YXRlO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICB0aGlzLnN0YXRlc1tzdGF0ZV0gPSB7fTtcbiAgICB9XG4gIH07XG5cbiAgY3Rvci5wcm90b3R5cGUuX19wcm90b19fID0gU3RhdGVNYWNoaW5lLnByb3RvdHlwZTtcblxuICBzdGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAvLyBDaGFuZ2VzIHRoZSBgcGF0aGAncyBzdGF0ZSB0byBgc3RhdGVgLlxuICAgIGN0b3IucHJvdG90eXBlW3N0YXRlXSA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VTdGF0ZShwYXRoLCBzdGF0ZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY3Rvcjtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBpcyB3cmFwcGVkIGJ5IHRoZSBzdGF0ZSBjaGFuZ2UgZnVuY3Rpb25zOlxuICpcbiAqIC0gYHJlcXVpcmUocGF0aClgXG4gKiAtIGBtb2RpZnkocGF0aClgXG4gKiAtIGBpbml0KHBhdGgpYFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuX2NoYW5nZVN0YXRlID0gZnVuY3Rpb24gX2NoYW5nZVN0YXRlIChwYXRoLCBuZXh0U3RhdGUpIHtcbiAgdmFyIHByZXZCdWNrZXQgPSB0aGlzLnN0YXRlc1t0aGlzLnBhdGhzW3BhdGhdXTtcbiAgaWYgKHByZXZCdWNrZXQpIGRlbGV0ZSBwcmV2QnVja2V0W3BhdGhdO1xuXG4gIHRoaXMucGF0aHNbcGF0aF0gPSBuZXh0U3RhdGU7XG4gIHRoaXMuc3RhdGVzW25leHRTdGF0ZV1bcGF0aF0gPSB0cnVlO1xufTtcblxuLyohXG4gKiBpZ25vcmVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIgKHN0YXRlKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZXNbc3RhdGVdKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBwYXRoO1xuXG4gIHdoaWxlIChpLS0pIHtcbiAgICBwYXRoID0ga2V5c1tpXTtcbiAgICBkZWxldGUgdGhpcy5zdGF0ZXNbc3RhdGVdW3BhdGhdO1xuICAgIGRlbGV0ZSB0aGlzLnBhdGhzW3BhdGhdO1xuICB9XG59O1xuXG4vKiFcbiAqIENoZWNrcyB0byBzZWUgaWYgYXQgbGVhc3Qgb25lIHBhdGggaXMgaW4gdGhlIHN0YXRlcyBwYXNzZWQgaW4gdmlhIGBhcmd1bWVudHNgXG4gKiBlLmcuLCB0aGlzLnNvbWUoJ3JlcXVpcmVkJywgJ2luaXRlZCcpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIHRoYXQgd2Ugd2FudCB0byBjaGVjayBmb3IuXG4gKiBAcHJpdmF0ZVxuICovXG5cblN0YXRlTWFjaGluZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIHNvbWUgKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB3aGF0ID0gYXJndW1lbnRzLmxlbmd0aCA/IGFyZ3VtZW50cyA6IHRoaXMuc3RhdGVOYW1lcztcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwod2hhdCwgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkubGVuZ3RoO1xuICB9KTtcbn07XG5cbi8qIVxuICogVGhpcyBmdW5jdGlvbiBidWlsZHMgdGhlIGZ1bmN0aW9ucyB0aGF0IGdldCBhc3NpZ25lZCB0byBgZm9yRWFjaGAgYW5kIGBtYXBgLFxuICogc2luY2UgYm90aCBvZiB0aG9zZSBtZXRob2RzIHNoYXJlIGEgbG90IG9mIHRoZSBzYW1lIGxvZ2ljLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpdGVyTWV0aG9kIGlzIGVpdGhlciAnZm9yRWFjaCcgb3IgJ21hcCdcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5faXRlciA9IGZ1bmN0aW9uIF9pdGVyIChpdGVyTWV0aG9kKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG51bUFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgICAsIHN0YXRlcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDAsIG51bUFyZ3MtMSlcbiAgICAgICwgY2FsbGJhY2sgPSBhcmd1bWVudHNbbnVtQXJncy0xXTtcblxuICAgIGlmICghc3RhdGVzLmxlbmd0aCkgc3RhdGVzID0gdGhpcy5zdGF0ZU5hbWVzO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHBhdGhzID0gc3RhdGVzLnJlZHVjZShmdW5jdGlvbiAocGF0aHMsIHN0YXRlKSB7XG4gICAgICByZXR1cm4gcGF0aHMuY29uY2F0KE9iamVjdC5rZXlzKHNlbGYuc3RhdGVzW3N0YXRlXSkpO1xuICAgIH0sIFtdKTtcblxuICAgIHJldHVybiBwYXRoc1tpdGVyTWV0aG9kXShmdW5jdGlvbiAocGF0aCwgaSwgcGF0aHMpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhwYXRoLCBpLCBwYXRocyk7XG4gICAgfSk7XG4gIH07XG59O1xuXG4vKiFcbiAqIEl0ZXJhdGVzIG92ZXIgdGhlIHBhdGhzIHRoYXQgYmVsb25nIHRvIG9uZSBvZiB0aGUgcGFyYW1ldGVyIHN0YXRlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcHJvZmlsZSBjYW4gbG9vayBsaWtlOlxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgZm4pOyAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMVxuICogdGhpcy5mb3JFYWNoKHN0YXRlMSwgc3RhdGUyLCBmbik7IC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIHN0YXRlMSBvciBzdGF0ZTJcbiAqIHRoaXMuZm9yRWFjaChmbik7ICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlcyBvdmVyIGFsbCBwYXRocyBpbiBhbGwgc3RhdGVzXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7U3RyaW5nfSBbc3RhdGVdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHByaXZhdGVcbiAqL1xuXG5TdGF0ZU1hY2hpbmUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoICgpIHtcbiAgdGhpcy5mb3JFYWNoID0gdGhpcy5faXRlcignZm9yRWFjaCcpO1xuICByZXR1cm4gdGhpcy5mb3JFYWNoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKiFcbiAqIE1hcHMgb3ZlciB0aGUgcGF0aHMgdGhhdCBiZWxvbmcgdG8gb25lIG9mIHRoZSBwYXJhbWV0ZXIgc3RhdGVzLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBwcm9maWxlIGNhbiBsb29rIGxpa2U6XG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBmbik7ICAgICAgICAgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxXG4gKiB0aGlzLmZvckVhY2goc3RhdGUxLCBzdGF0ZTIsIGZuKTsgLy8gaXRlcmF0ZXMgb3ZlciBhbGwgcGF0aHMgaW4gc3RhdGUxIG9yIHN0YXRlMlxuICogdGhpcy5mb3JFYWNoKGZuKTsgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGVzIG92ZXIgYWxsIHBhdGhzIGluIGFsbCBzdGF0ZXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3N0YXRlXVxuICogQHBhcmFtIHtTdHJpbmd9IFtzdGF0ZV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBwcml2YXRlXG4gKi9cblxuU3RhdGVNYWNoaW5lLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAgKCkge1xuICB0aGlzLm1hcCA9IHRoaXMuX2l0ZXIoJ21hcCcpO1xuICByZXR1cm4gdGhpcy5tYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbiIsIi8qKlxuICog0KDQtdCw0LvQuNC30LDRhtC40Lgg0YXRgNCw0L3QuNC70LjRidCwXG4gKiDQstC00L7RhdC90L7QstC70ZHQvSBtb25nb29zZSAzLjguNCAo0LjRgdC/0YDQsNCy0LvQtdC90Ysg0LHQsNCz0Lgg0L/QviAzLjguMTIpXG4gKlxuICogaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jc2VsZWN0b3JzXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci90cmVlL21hc3Rlci9wYWNrYWdlcy9taW5pbW9uZ29cbiAqXG4gKiBicm93c2VyaWZ5IC0tZGVidWcgc3JjL3N0b3JhZ2UuanMgLS1zdGFuZGFsb25lIHN0b3JhZ2UgPiBzdG9yYWdlLmpzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24nKVxuICAsIFNjaGVtYSA9IHJlcXVpcmUoJy4vc2NoZW1hJylcbiAgLCBTY2hlbWFUeXBlID0gcmVxdWlyZSgnLi9zY2hlbWF0eXBlJylcbiAgLCBWaXJ0dWFsVHlwZSA9IHJlcXVpcmUoJy4vdmlydHVhbHR5cGUnKVxuICAsIFR5cGVzID0gcmVxdWlyZSgnLi90eXBlcycpXG4gICwgRG9jdW1lbnQgPSByZXF1aXJlKCcuL2RvY3VtZW50JylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG4vKipcbiAqIFN0b3JhZ2UgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIGV4cG9ydHMgb2JqZWN0IG9mIHRoZSBgc3RvcmFnZWAgbW9kdWxlIGlzIGFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MuXG4gKiBNb3N0IGFwcHMgd2lsbCBvbmx5IHVzZSB0aGlzIG9uZSBpbnN0YW5jZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBTdG9yYWdlICgpIHtcbiAgdGhpcy5jb2xsZWN0aW9uTmFtZXMgPSBbXTtcbn1cblxuLyoqXG4gKiDQodC+0LfQtNCw0YLRjCDQutC+0LvQu9C10LrRhtC40Y4g0Lgg0L/QvtC70YPRh9C40YLRjCDQtdGRLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7c3RvcmFnZS5TY2hlbWF8dW5kZWZpbmVkfSBzY2hlbWFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbYXBpXSAtINGB0YHRi9C70LrQsCDQvdCwINCw0L/QuCDRgNC10YHRg9GA0YFcbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuY3JlYXRlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApe1xuICBpZiAoIHRoaXNbIG5hbWUgXSApe1xuICAgIGNvbnNvbGUuaW5mbygnc3RvcmFnZTo6Y29sbGVjdGlvbjogYCcgKyBuYW1lICsgJ2AgYWxyZWFkeSBleGlzdCcpO1xuICAgIHJldHVybiB0aGlzWyBuYW1lIF07XG4gIH1cblxuICBpZiAoICdTY2hlbWEnICE9PSBzY2hlbWEuY29uc3RydWN0b3IubmFtZSApe1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BzY2hlbWFgIG11c3QgYmUgU2NoZW1hIGluc3RhbmNlJyk7XG4gIH1cblxuICB0aGlzLmNvbGxlY3Rpb25OYW1lcy5wdXNoKCBuYW1lICk7XG5cbiAgcmV0dXJuIHRoaXNbIG5hbWUgXSA9IG5ldyBDb2xsZWN0aW9uKCBuYW1lLCBzY2hlbWEsIGFwaSApO1xufTtcblxuLyoqXG4gKiDQn9C+0LvRg9GH0LjRgtGMINC90LDQt9Cy0LDQvdC40LUg0LrQvtC70LvQtdC60YbQuNC5INCyINCy0LjQtNC1INC80LDRgdGB0LjQstCwINGB0YLRgNC+0LouXG4gKlxuICogQHJldHVybnMge0FycmF5LjxzdHJpbmc+fSBBbiBhcnJheSBjb250YWluaW5nIGFsbCBjb2xsZWN0aW9ucyBpbiB0aGUgc3RvcmFnZS5cbiAqL1xuU3RvcmFnZS5wcm90b3R5cGUuZ2V0Q29sbGVjdGlvbk5hbWVzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbk5hbWVzO1xufTtcblxuLyoqXG4gKiBUaGUgTW9uZ29vc2UgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuICpcbiAqIEBtZXRob2QgQ29sbGVjdGlvblxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5Db2xsZWN0aW9uID0gQ29sbGVjdGlvbjtcblxuLyoqXG4gKiBUaGUgU3RvcmFnZSB2ZXJzaW9uXG4gKlxuICogQHByb3BlcnR5IHZlcnNpb25cbiAqIEBhcGkgcHVibGljXG4gKi9cbi8vdG9kbzpcbi8vU3RvcmFnZS5wcm90b3R5cGUudmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuXG4vKipcbiAqIFRoZSBTdG9yYWdlIFtTY2hlbWFdKCNzY2hlbWFfU2NoZW1hKSBjb25zdHJ1Y3RvclxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgbW9uZ29vc2UgPSByZXF1aXJlKCdtb25nb29zZScpO1xuICogICAgIHZhciBTY2hlbWEgPSBtb25nb29zZS5TY2hlbWE7XG4gKiAgICAgdmFyIENhdFNjaGVtYSA9IG5ldyBTY2hlbWEoLi4pO1xuICpcbiAqIEBtZXRob2QgU2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbi8vU3RvcmFnZS5wcm90b3R5cGUuU2NoZW1hID0gU2NoZW1hO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbU2NoZW1hVHlwZV0oI3NjaGVtYXR5cGVfU2NoZW1hVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFNjaGVtYVR5cGVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuLy9TdG9yYWdlLnByb3RvdHlwZS5TY2hlbWFUeXBlID0gU2NoZW1hVHlwZTtcblxuLyoqXG4gKiBUaGUgdmFyaW91cyBNb25nb29zZSBTY2hlbWFUeXBlcy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfQWxpYXMgb2YgbW9uZ29vc2UuU2NoZW1hLlR5cGVzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5fXG4gKlxuICogQHByb3BlcnR5IFNjaGVtYVR5cGVzXG4gKiBAc2VlIFNjaGVtYS5TY2hlbWFUeXBlcyAjc2NoZW1hX1NjaGVtYS5UeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG4vL1N0b3JhZ2UucHJvdG90eXBlLlNjaGVtYVR5cGVzID0gU2NoZW1hLlR5cGVzO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbVmlydHVhbFR5cGVdKCN2aXJ0dWFsdHlwZV9WaXJ0dWFsVHlwZSkgY29uc3RydWN0b3JcbiAqXG4gKiBAbWV0aG9kIFZpcnR1YWxUeXBlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2UucHJvdG90eXBlLlZpcnR1YWxUeXBlID0gVmlydHVhbFR5cGU7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgTW9uZ29vc2UgVHlwZXMuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIHZhciBtb25nb29zZSA9IHJlcXVpcmUoJ21vbmdvb3NlJyk7XG4gKiAgICAgdmFyIGFycmF5ID0gbW9uZ29vc2UuVHlwZXMuQXJyYXk7XG4gKlxuICogIyMjI1R5cGVzOlxuICpcbiAqIC0gW09iamVjdElkXSgjdHlwZXMtb2JqZWN0aWQtanMpXG4gKiAtIFtTdWJEb2N1bWVudF0oI3R5cGVzLWVtYmVkZGVkLWpzKVxuICogLSBbQXJyYXldKCN0eXBlcy1hcnJheS1qcylcbiAqIC0gW0RvY3VtZW50QXJyYXldKCN0eXBlcy1kb2N1bWVudGFycmF5LWpzKVxuICpcbiAqIFVzaW5nIHRoaXMgZXhwb3NlZCBhY2Nlc3MgdG8gdGhlIGBPYmplY3RJZGAgdHlwZSwgd2UgY2FuIGNvbnN0cnVjdCBpZHMgb24gZGVtYW5kLlxuICpcbiAqICAgICB2YXIgT2JqZWN0SWQgPSBtb25nb29zZS5UeXBlcy5PYmplY3RJZDtcbiAqICAgICB2YXIgaWQxID0gbmV3IE9iamVjdElkO1xuICpcbiAqIEBwcm9wZXJ0eSBUeXBlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5UeXBlcyA9IFR5cGVzO1xuXG4vKipcbiAqIFRoZSBNb25nb29zZSBbRG9jdW1lbnRdKCNkb2N1bWVudC1qcykgY29uc3RydWN0b3IuXG4gKlxuICogQG1ldGhvZCBEb2N1bWVudFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5TdG9yYWdlLnByb3RvdHlwZS5Eb2N1bWVudCA9IERvY3VtZW50O1xuXG4vKipcbiAqIFRoZSBbTW9uZ29vc2VFcnJvcl0oI2Vycm9yX01vbmdvb3NlRXJyb3IpIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBtZXRob2QgRXJyb3JcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU3RvcmFnZS5wcm90b3R5cGUuRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cblN0b3JhZ2UucHJvdG90eXBlLnV0aWxzID0gdXRpbHM7XG5TdG9yYWdlLnByb3RvdHlwZS5PYmplY3RJZCA9IFR5cGVzLk9iamVjdElkO1xuU3RvcmFnZS5wcm90b3R5cGUuc2NoZW1hcyA9IFNjaGVtYS5zY2hlbWFzO1xuXG4vKlxuICogR2VuZXJhdGUgYSByYW5kb20gdXVpZC5cbiAqIGh0dHA6Ly93d3cuYnJvb2ZhLmNvbS9Ub29scy9NYXRoLnV1aWQuaHRtXG4gKiBmb3JrIE1hdGgudXVpZC5qcyAodjEuNClcbiAqXG4gKiBodHRwOi8vd3d3LmJyb29mYS5jb20vMjAwOC8wOS9qYXZhc2NyaXB0LXV1aWQtZnVuY3Rpb24vXG4gKi9cbi8qdXVpZDoge1xuICAvLyBQcml2YXRlIGFycmF5IG9mIGNoYXJzIHRvIHVzZVxuICBDSEFSUzogJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCgnJyksXG5cbiAgLy8gcmV0dXJucyBSRkM0MTIyLCB2ZXJzaW9uIDQgSURcbiAgZ2VuZXJhdGU6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNoYXJzID0gdGhpcy5DSEFSUywgdXVpZCA9IG5ldyBBcnJheSggMzYgKSwgcm5kID0gMCwgcjtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCAzNjsgaSsrICkge1xuICAgICAgaWYgKCBpID09IDggfHwgaSA9PSAxMyB8fCBpID09IDE4IHx8IGkgPT0gMjMgKSB7XG4gICAgICAgIHV1aWRbaV0gPSAnLSc7XG4gICAgICB9IGVsc2UgaWYgKCBpID09IDE0ICkge1xuICAgICAgICB1dWlkW2ldID0gJzQnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCBybmQgPD0gMHgwMiApIHJuZCA9IDB4MjAwMDAwMCArIChNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwKSB8IDA7XG4gICAgICAgIHIgPSBybmQgJiAweGY7XG4gICAgICAgIHJuZCA9IHJuZCA+PiA0O1xuICAgICAgICB1dWlkW2ldID0gY2hhcnNbKGkgPT0gMTkpID8gKHIgJiAweDMpIHwgMHg4IDogcl07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1dWlkLmpvaW4oJycpLnRvTG93ZXJDYXNlKCk7XG4gIH1cbn0qL1xuXG5cbi8qIVxuICogVGhlIGV4cG9ydHMgb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIFN0b3JhZ2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdG9yYWdlO1xuIiwiLy9UT0RPOiDQv9C+0YfQuNGB0YLQuNGC0Ywg0LrQvtC0XG5cbi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1iZWRkZWREb2N1bWVudCA9IHJlcXVpcmUoJy4vZW1iZWRkZWQnKTtcbnZhciBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG52YXIgT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIFN0b3JhZ2UgQXJyYXkgY29uc3RydWN0b3IuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1ZhbHVlcyBhbHdheXMgaGF2ZSB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvIGluaXRpYWxpemUsIG90aGVyd2lzZSBgU3RvcmFnZUFycmF5I3B1c2hgIHdpbGwgbWFyayB0aGUgYXJyYXkgYXMgbW9kaWZpZWQuX1xuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyBwYXJlbnQgZG9jdW1lbnRcbiAqIEBhcGkgcHJpdmF0ZVxuICogQGluaGVyaXRzIEFycmF5XG4gKiBAc2VlIGh0dHA6Ly9iaXQubHkvZjZDblpVXG4gKi9cbmZ1bmN0aW9uIFN0b3JhZ2VBcnJheSAodmFsdWVzLCBwYXRoLCBkb2MpIHtcbiAgdmFyIGFyciA9IFtdO1xuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIGFyci5fX3Byb3RvX18gPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlO1xuXG4gIGFyci52YWxpZGF0b3JzID0gW107XG4gIGFyci5fcGF0aCA9IHBhdGg7XG5cbiAgaWYgKGRvYykge1xuICAgIGFyci5fcGFyZW50ID0gZG9jO1xuICAgIGFyci5fc2NoZW1hID0gZG9jLnNjaGVtYS5wYXRoKHBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn1cblxuLyohXG4gKiBJbmhlcml0IGZyb20gQXJyYXlcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZSA9IG5ldyBBcnJheTtcblxuLyoqXG4gKiBQYXJlbnQgb3duZXIgZG9jdW1lbnRcbiAqXG4gKiBAcHJvcGVydHkgX3BhcmVudFxuICogQGFwaSBwcml2YXRlXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuX3BhcmVudDtcblxuLyoqXG4gKiBDYXN0cyBhIG1lbWJlciBiYXNlZCBvbiB0aGlzIGFycmF5cyBzY2hlbWEuXG4gKlxuICogQHBhcmFtIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHZhbHVlIHRoZSBjYXN0ZWQgdmFsdWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLl9jYXN0ID0gZnVuY3Rpb24gKCB2YWx1ZSApIHtcbiAgdmFyIG93bmVyID0gdGhpcy5fb3duZXI7XG4gIHZhciBwb3B1bGF0ZWQgPSBmYWxzZTtcblxuICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgLy8gaWYgYSBwb3B1bGF0ZWQgYXJyYXksIHdlIG11c3QgY2FzdCB0byB0aGUgc2FtZSBtb2RlbFxuICAgIC8vIGluc3RhbmNlIGFzIHNwZWNpZmllZCBpbiB0aGUgb3JpZ2luYWwgcXVlcnkuXG4gICAgaWYgKCFvd25lcikge1xuICAgICAgb3duZXIgPSB0aGlzLl9vd25lciA9IHRoaXMuX3BhcmVudC5vd25lckRvY3VtZW50XG4gICAgICAgID8gdGhpcy5fcGFyZW50Lm93bmVyRG9jdW1lbnQoKVxuICAgICAgICA6IHRoaXMuX3BhcmVudDtcbiAgICB9XG5cbiAgICBwb3B1bGF0ZWQgPSBvd25lci5wb3B1bGF0ZWQodGhpcy5fcGF0aCwgdHJ1ZSk7XG4gIH1cblxuICBpZiAocG9wdWxhdGVkICYmIG51bGwgIT0gdmFsdWUpIHtcbiAgICAvLyBjYXN0IHRvIHRoZSBwb3B1bGF0ZWQgTW9kZWxzIHNjaGVtYVxuICAgIHZhciBNb2RlbCA9IHBvcHVsYXRlZC5vcHRpb25zLm1vZGVsO1xuXG4gICAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAgIC8vIG5vbi1vYmplY3RzIGFyZSB0byBiZSBpbnRlcnByZXRlZCBhcyBfaWRcbiAgICBpZiAoIHZhbHVlIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgIV8uaXNPYmplY3QodmFsdWUpICkge1xuICAgICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgICB9XG5cbiAgICB2YWx1ZSA9IG5ldyBNb2RlbCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCB0cnVlKVxuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3NjaGVtYS5jYXN0ZXIuY2FzdCh2YWx1ZSwgdGhpcy5fcGFyZW50LCBmYWxzZSlcbn07XG5cbi8qKlxuICogTWFya3MgdGhpcyBhcnJheSBhcyBtb2RpZmllZC5cbiAqXG4gKiBJZiBpdCBidWJibGVzIHVwIGZyb20gYW4gZW1iZWRkZWQgZG9jdW1lbnQgY2hhbmdlLCB0aGVuIGl0IHRha2VzIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzIChvdGhlcndpc2UsIHRha2VzIDAgYXJndW1lbnRzKVxuICpcbiAqIEBwYXJhbSB7RW1iZWRkZWREb2N1bWVudH0gZW1iZWRkZWREb2MgdGhlIGVtYmVkZGVkIGRvYyB0aGF0IGludm9rZWQgdGhpcyBtZXRob2Qgb24gdGhlIEFycmF5XG4gKiBAcGFyYW0ge1N0cmluZ30gZW1iZWRkZWRQYXRoIHRoZSBwYXRoIHdoaWNoIGNoYW5nZWQgaW4gdGhlIGVtYmVkZGVkRG9jXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5fbWFya01vZGlmaWVkID0gZnVuY3Rpb24gKGVsZW0sIGVtYmVkZGVkUGF0aCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5fcGFyZW50XG4gICAgLCBkaXJ0eVBhdGg7XG5cbiAgaWYgKHBhcmVudCkge1xuICAgIGRpcnR5UGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgaWYgKG51bGwgIT0gZW1iZWRkZWRQYXRoKSB7XG4gICAgICAgIC8vIGFuIGVtYmVkZGVkIGRvYyBidWJibGVkIHVwIHRoZSBjaGFuZ2VcbiAgICAgICAgZGlydHlQYXRoID0gZGlydHlQYXRoICsgJy4nICsgdGhpcy5pbmRleE9mKGVsZW0pICsgJy4nICsgZW1iZWRkZWRQYXRoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZGlyZWN0bHkgc2V0IGFuIGluZGV4XG4gICAgICAgIGRpcnR5UGF0aCA9IGRpcnR5UGF0aCArICcuJyArIGVsZW07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFyZW50Lm1hcmtNb2RpZmllZChkaXJ0eVBhdGgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjcHVzaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L3B1c2gpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW2FyZ3MuLi5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgLCByZXQgPSBbXS5wdXNoLmFwcGx5KHRoaXMsIHZhbHVlcyk7XG5cbiAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjcG9wYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvcG9wKSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQgd2hpY2ggd2lsbCBwYXNzIHRoZSBlbnRpcmUgdGhpbmcgdG8gJHNldCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gKlxuICogQHNlZSBTdG9yYWdlQXJyYXkjJHBvcCAjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS0lMjRwb3BcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmV0ID0gW10ucG9wLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIFdyYXBzIFtgQXJyYXkjc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGRvYy5hcnJheSA9IFsyLDNdO1xuICogICAgIHZhciByZXMgPSBkb2MuYXJyYXkuc2hpZnQoKTtcbiAqICAgICBjb25zb2xlLmxvZyhyZXMpIC8vIDJcbiAqICAgICBjb25zb2xlLmxvZyhkb2MuYXJyYXkpIC8vIFszXVxuICpcbiAqICMjIyNOb3RlOlxuICpcbiAqIF9tYXJrcyB0aGUgZW50aXJlIGFycmF5IGFzIG1vZGlmaWVkLCB3aGljaCBpZiBzYXZlZCwgd2lsbCBzdG9yZSBpdCBhcyBhIGAkc2V0YCBvcGVyYXRpb24sIHBvdGVudGlhbGx5IG92ZXJ3cml0dGluZyBhbnkgY2hhbmdlcyB0aGF0IGhhcHBlbiBiZXR3ZWVuIHdoZW4geW91IHJldHJpZXZlZCB0aGUgb2JqZWN0IGFuZCB3aGVuIHlvdSBzYXZlIGl0Ll9cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmV0ID0gW10uc2hpZnQuY2FsbCh0aGlzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogUHVsbHMgaXRlbXMgZnJvbSB0aGUgYXJyYXkgYXRvbWljYWxseS5cbiAqXG4gKiAjIyMjRXhhbXBsZXM6XG4gKlxuICogICAgIGRvYy5hcnJheS5wdWxsKE9iamVjdElkKVxuICogICAgIGRvYy5hcnJheS5wdWxsKHsgX2lkOiAnc29tZUlkJyB9KVxuICogICAgIGRvYy5hcnJheS5wdWxsKDM2KVxuICogICAgIGRvYy5hcnJheS5wdWxsKCd0YWcgMScsICd0YWcgMicpXG4gKlxuICogVG8gcmVtb3ZlIGEgZG9jdW1lbnQgZnJvbSBhIHN1YmRvY3VtZW50IGFycmF5IHdlIG1heSBwYXNzIGFuIG9iamVjdCB3aXRoIGEgbWF0Y2hpbmcgYF9pZGAuXG4gKlxuICogICAgIGRvYy5zdWJkb2NzLnB1c2goeyBfaWQ6IDQ4MTUxNjIzNDIgfSlcbiAqICAgICBkb2Muc3ViZG9jcy5wdWxsKHsgX2lkOiA0ODE1MTYyMzQyIH0pIC8vIHJlbW92ZWRcbiAqXG4gKiBPciB3ZSBtYXkgcGFzc2luZyB0aGUgX2lkIGRpcmVjdGx5IGFuZCBsZXQgbW9uZ29vc2UgdGFrZSBjYXJlIG9mIGl0LlxuICpcbiAqICAgICBkb2Muc3ViZG9jcy5wdXNoKHsgX2lkOiA0ODE1MTYyMzQyIH0pXG4gKiAgICAgZG9jLnN1YmRvY3MucHVsbCg0ODE1MTYyMzQyKTsgLy8gd29ya3NcbiAqXG4gKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gKiBAc2VlIG1vbmdvZGIgaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLSUyNHB1bGxcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUucHVsbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcylcbiAgICAsIGN1ciA9IHRoaXMuX3BhcmVudC5nZXQodGhpcy5fcGF0aClcbiAgICAsIGkgPSBjdXIubGVuZ3RoXG4gICAgLCBtZW07XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIG1lbSA9IGN1cltpXTtcbiAgICBpZiAobWVtIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCkge1xuICAgICAgaWYgKHZhbHVlcy5zb21lKGZ1bmN0aW9uICh2KSB7IHJldHVybiB2LmVxdWFscyhtZW0pOyB9ICkpIHtcbiAgICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKH5jdXIuaW5kZXhPZi5jYWxsKHZhbHVlcywgbWVtKSkge1xuICAgICAgW10uc3BsaWNlLmNhbGwoY3VyLCBpLCAxKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIG9mIFtwdWxsXSgjdHlwZXNfYXJyYXlfTW9uZ29vc2VBcnJheS1wdWxsKVxuICpcbiAqIEBzZWUgU3RvcmFnZUFycmF5I3B1bGwgI3R5cGVzX2FycmF5X01vbmdvb3NlQXJyYXktcHVsbFxuICogQHNlZSBtb25nb2RiIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy0lMjRwdWxsXG4gKiBAYXBpIHB1YmxpY1xuICogQG1lbWJlck9mIFN0b3JhZ2VBcnJheVxuICogQG1ldGhvZCByZW1vdmVcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5yZW1vdmUgPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlLnB1bGw7XG5cbi8qKlxuICogV3JhcHMgW2BBcnJheSNzcGxpY2VgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zcGxpY2UpIHdpdGggcHJvcGVyIGNoYW5nZSB0cmFja2luZyBhbmQgY2FzdGluZy5cbiAqXG4gKiAjIyMjTm90ZTpcbiAqXG4gKiBfbWFya3MgdGhlIGVudGlyZSBhcnJheSBhcyBtb2RpZmllZCwgd2hpY2ggaWYgc2F2ZWQsIHdpbGwgc3RvcmUgaXQgYXMgYSBgJHNldGAgb3BlcmF0aW9uLCBwb3RlbnRpYWxseSBvdmVyd3JpdHRpbmcgYW55IGNoYW5nZXMgdGhhdCBoYXBwZW4gYmV0d2VlbiB3aGVuIHlvdSByZXRyaWV2ZWQgdGhlIG9iamVjdCBhbmQgd2hlbiB5b3Ugc2F2ZSBpdC5fXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5zcGxpY2UgPSBmdW5jdGlvbiBzcGxpY2UgKCkge1xuICB2YXIgcmV0LCB2YWxzLCBpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdmFscyA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhbHNbaV0gPSBpIDwgMlxuICAgICAgICA/IGFyZ3VtZW50c1tpXVxuICAgICAgICA6IHRoaXMuX2Nhc3QoYXJndW1lbnRzW2ldKTtcbiAgICB9XG4gICAgcmV0ID0gW10uc3BsaWNlLmFwcGx5KHRoaXMsIHZhbHMpO1xuXG4gICAgdGhpcy5fbWFya01vZGlmaWVkKCk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBXcmFwcyBbYEFycmF5I3Vuc2hpZnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS91bnNoaWZ0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05vdGU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZhbHVlcyA9IFtdLm1hcC5jYWxsKGFyZ3VtZW50cywgdGhpcy5fY2FzdCwgdGhpcyk7XG4gIFtdLnVuc2hpZnQuYXBwbHkodGhpcywgdmFsdWVzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHRoaXMubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBXcmFwcyBbYEFycmF5I3NvcnRgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9zb3J0KSB3aXRoIHByb3BlciBjaGFuZ2UgdHJhY2tpbmcuXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX21hcmtzIHRoZSBlbnRpcmUgYXJyYXkgYXMgbW9kaWZpZWQsIHdoaWNoIGlmIHNhdmVkLCB3aWxsIHN0b3JlIGl0IGFzIGEgYCRzZXRgIG9wZXJhdGlvbiwgcG90ZW50aWFsbHkgb3ZlcndyaXR0aW5nIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIGJldHdlZW4gd2hlbiB5b3UgcmV0cmlldmVkIHRoZSBvYmplY3QgYW5kIHdoZW4geW91IHNhdmUgaXQuX1xuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJldCA9IFtdLnNvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogQWRkcyB2YWx1ZXMgdG8gdGhlIGFycmF5IGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gKlxuICogIyMjI0V4YW1wbGU6XG4gKlxuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICogICAgIHZhciBhZGRlZCA9IGRvYy5hcnJheS5hZGRUb1NldCg0LDUpO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0LDVdXG4gKiAgICAgY29uc29sZS5sb2coYWRkZWQpICAgICAvLyBbNV1cbiAqXG4gKiBAcGFyYW0ge2FueX0gW2FyZ3MuLi5dXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhlIHZhbHVlcyB0aGF0IHdlcmUgYWRkZWRcbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VBcnJheS5wcm90b3R5cGUuYWRkVG9TZXQgPSBmdW5jdGlvbiBhZGRUb1NldCAoKSB7XG4gIHZhciB2YWx1ZXMgPSBbXS5tYXAuY2FsbChhcmd1bWVudHMsIHRoaXMuX2Nhc3QsIHRoaXMpXG4gICAgLCBhZGRlZCA9IFtdXG4gICAgLCB0eXBlID0gdmFsdWVzWzBdIGluc3RhbmNlb2YgRW1iZWRkZWREb2N1bWVudCA/ICdkb2MnIDpcbiAgICAgICAgICAgICB2YWx1ZXNbMF0gaW5zdGFuY2VvZiBEYXRlID8gJ2RhdGUnIDpcbiAgICAgICAgICAgICAnJztcblxuICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgIHZhciBmb3VuZDtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2RvYyc6XG4gICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGRvYyl7IHJldHVybiBkb2MuZXF1YWxzKHYpIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICB2YXIgdmFsID0gK3Y7XG4gICAgICAgIGZvdW5kID0gdGhpcy5zb21lKGZ1bmN0aW9uKGQpeyByZXR1cm4gK2QgPT09IHZhbCB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBmb3VuZCA9IH50aGlzLmluZGV4T2Yodik7XG4gICAgfVxuXG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgW10ucHVzaC5jYWxsKHRoaXMsIHYpO1xuXG4gICAgICB0aGlzLl9tYXJrTW9kaWZpZWQoKTtcbiAgICAgIFtdLnB1c2guY2FsbChhZGRlZCwgdik7XG4gICAgfVxuICB9LCB0aGlzKTtcblxuICByZXR1cm4gYWRkZWQ7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGNhc3RlZCBgdmFsYCBhdCBpbmRleCBgaWAgYW5kIG1hcmtzIHRoZSBhcnJheSBtb2RpZmllZC5cbiAqXG4gKiAjIyMjRXhhbXBsZTpcbiAqXG4gKiAgICAgLy8gZ2l2ZW4gZG9jdW1lbnRzIGJhc2VkIG9uIHRoZSBmb2xsb3dpbmdcbiAqICAgICB2YXIgRG9jID0gbW9uZ29vc2UubW9kZWwoJ0RvYycsIG5ldyBTY2hlbWEoeyBhcnJheTogW051bWJlcl0gfSkpO1xuICpcbiAqICAgICB2YXIgZG9jID0gbmV3IERvYyh7IGFycmF5OiBbMiwzLDRdIH0pXG4gKlxuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSkgLy8gWzIsMyw0XVxuICpcbiAqICAgICBkb2MuYXJyYXkuc2V0KDEsXCI1XCIpO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLDUsNF0gLy8gcHJvcGVybHkgY2FzdCB0byBudW1iZXJcbiAqICAgICBkb2Muc2F2ZSgpIC8vIHRoZSBjaGFuZ2UgaXMgc2F2ZWRcbiAqXG4gKiAgICAgLy8gVlMgbm90IHVzaW5nIGFycmF5I3NldFxuICogICAgIGRvYy5hcnJheVsxXSA9IFwiNVwiO1xuICogICAgIGNvbnNvbGUubG9nKGRvYy5hcnJheSk7IC8vIFsyLFwiNVwiLDRdIC8vIG5vIGNhc3RpbmdcbiAqICAgICBkb2Muc2F2ZSgpIC8vIGNoYW5nZSBpcyBub3Qgc2F2ZWRcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhpc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoaSwgdmFsKSB7XG4gIHRoaXNbaV0gPSB0aGlzLl9jYXN0KHZhbCk7XG4gIHRoaXMuX21hcmtNb2RpZmllZChpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuYXRpdmUganMgQXJyYXkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuU3RvcmFnZUFycmF5LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGVwb3B1bGF0ZSkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICByZXR1cm4gZG9jIGluc3RhbmNlb2YgRG9jdW1lbnRcbiAgICAgICAgPyBkb2MudG9PYmplY3Qob3B0aW9ucylcbiAgICAgICAgOiBkb2NcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnNsaWNlKCk7XG59O1xuXG5cbi8qKlxuICogUmV0dXJuIHRoZSBpbmRleCBvZiBgb2JqYCBvciBgLTFgIGlmIG5vdCBmb3VuZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBpdGVtIHRvIGxvb2sgZm9yXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5TdG9yYWdlQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mIChvYmopIHtcbiAgaWYgKG9iaiBpbnN0YW5jZW9mIE9iamVjdElkKSBvYmogPSBvYmoudG9TdHJpbmcoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAob2JqID09IHRoaXNbaV0pXG4gICAgICByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZUFycmF5O1xuIiwiLyohXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuL2FycmF5JylcbiAgLCBPYmplY3RJZCA9IHJlcXVpcmUoJy4vb2JqZWN0aWQnKVxuICAsIE9iamVjdElkU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hL29iamVjdGlkJylcbiAgLCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJylcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50Jyk7XG5cbi8qKlxuICogRG9jdW1lbnRBcnJheSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlc1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggdG8gdGhpcyBhcnJheVxuICogQHBhcmFtIHtEb2N1bWVudH0gZG9jIHBhcmVudCBkb2N1bWVudFxuICogQGFwaSBwcml2YXRlXG4gKiBAcmV0dXJuIHtTdG9yYWdlRG9jdW1lbnRBcnJheX1cbiAqIEBpbmhlcml0cyBTdG9yYWdlQXJyYXlcbiAqIEBzZWUgaHR0cDovL2JpdC5seS9mNkNuWlVcbiAqIFRPRE86INC/0L7QtNGH0LjRgdGC0LjRgtGMINC60L7QtFxuICpcbiAqINCS0LXRgdGMINC90YPQttC90YvQuSDQutC+0LQg0YHQutC+0L/QuNGA0L7QstCw0L1cbiAqL1xuZnVuY3Rpb24gU3RvcmFnZURvY3VtZW50QXJyYXkgKHZhbHVlcywgcGF0aCwgZG9jKSB7XG4gIHZhciBhcnIgPSBbXTtcblxuICAvLyBWYWx1ZXMgYWx3YXlzIGhhdmUgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3RvciB0byBpbml0aWFsaXplLCBzaW5jZVxuICAvLyBvdGhlcndpc2UgU3RvcmFnZUFycmF5I3B1c2ggd2lsbCBtYXJrIHRoZSBhcnJheSBhcyBtb2RpZmllZCB0byB0aGUgcGFyZW50LlxuICBhcnIucHVzaC5hcHBseShhcnIsIHZhbHVlcyk7XG4gIGFyci5fX3Byb3RvX18gPSBTdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGU7XG5cbiAgYXJyLnZhbGlkYXRvcnMgPSBbXTtcbiAgYXJyLl9wYXRoID0gcGF0aDtcblxuICBpZiAoZG9jKSB7XG4gICAgYXJyLl9wYXJlbnQgPSBkb2M7XG4gICAgYXJyLl9zY2hlbWEgPSBkb2Muc2NoZW1hLnBhdGgocGF0aCk7XG4gICAgLy8g0J/RgNC+0LHRgNC+0YEg0LjQt9C80LXQvdC10L3QuNGPINGB0L7RgdGC0L7Rj9C90LjRjyDQsiDQv9C+0LTQtNC+0LrRg9C80LXQvdGCXG4gICAgZG9jLm9uKCdzYXZlJywgYXJyLm5vdGlmeSgnc2F2ZScpKTtcbiAgICBkb2Mub24oJ2lzTmV3JywgYXJyLm5vdGlmeSgnaXNOZXcnKSk7XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG4vKiFcbiAqIEluaGVyaXRzIGZyb20gU3RvcmFnZUFycmF5XG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5fX3Byb3RvX18gPSBTdG9yYWdlQXJyYXkucHJvdG90eXBlO1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTdG9yYWdlQXJyYXkjY2FzdFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGUuX2Nhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKSB7XG4gICAgaWYgKCEodmFsdWUuX19wYXJlbnQgJiYgdmFsdWUuX19wYXJlbnRBcnJheSkpIHtcbiAgICAgIC8vIHZhbHVlIG1heSBoYXZlIGJlZW4gY3JlYXRlZCB1c2luZyBhcnJheS5jcmVhdGUoKVxuICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgICB2YWx1ZS5fX3BhcmVudEFycmF5ID0gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy8gaGFuZGxlIGNhc3QoJ3N0cmluZycpIG9yIGNhc3QoT2JqZWN0SWQpIGV0Yy5cbiAgLy8gb25seSBvYmplY3RzIGFyZSBwZXJtaXR0ZWQgc28gd2UgY2FuIHNhZmVseSBhc3N1bWUgdGhhdFxuICAvLyBub24tb2JqZWN0cyBhcmUgdG8gYmUgaW50ZXJwcmV0ZWQgYXMgX2lkXG4gIGlmICggdmFsdWUgaW5zdGFuY2VvZiBPYmplY3RJZCB8fCAhXy5pc09iamVjdCh2YWx1ZSkgKSB7XG4gICAgdmFsdWUgPSB7IF9pZDogdmFsdWUgfTtcbiAgfVxuXG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKHZhbHVlLCB0aGlzKTtcbn07XG5cbi8qKlxuICogU2VhcmNoZXMgYXJyYXkgaXRlbXMgZm9yIHRoZSBmaXJzdCBkb2N1bWVudCB3aXRoIGEgbWF0Y2hpbmcgX2lkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZW1iZWRkZWREb2MgPSBtLmFycmF5LmlkKHNvbWVfaWQpO1xuICpcbiAqIEByZXR1cm4ge0VtYmVkZGVkRG9jdW1lbnR8bnVsbH0gdGhlIHN1YmRvY3VtZW50IG9yIG51bGwgaWYgbm90IGZvdW5kLlxuICogQHBhcmFtIHtPYmplY3RJZHxTdHJpbmd8TnVtYmVyfSBpZFxuICogQFRPRE8gY2FzdCB0byB0aGUgX2lkIGJhc2VkIG9uIHNjaGVtYSBmb3IgcHJvcGVyIGNvbXBhcmlzb25cbiAqIEBhcGkgcHVibGljXG4gKi9cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5pZCA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgY2FzdGVkXG4gICAgLCBzaWRcbiAgICAsIF9pZDtcblxuICB0cnkge1xuICAgIHZhciBjYXN0ZWRfID0gT2JqZWN0SWRTY2hlbWEucHJvdG90eXBlLmNhc3QuY2FsbCh7fSwgaWQpO1xuICAgIGlmIChjYXN0ZWRfKSBjYXN0ZWQgPSBTdHJpbmcoY2FzdGVkXyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYXN0ZWQgPSBudWxsO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIF9pZCA9IHRoaXNbaV0uZ2V0KCdfaWQnKTtcblxuICAgIGlmIChfaWQgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkLl9pZCkgcmV0dXJuIHRoaXNbaV07XG4gICAgfSBlbHNlIGlmICghKF9pZCBpbnN0YW5jZW9mIE9iamVjdElEKSkge1xuICAgICAgc2lkIHx8IChzaWQgPSBTdHJpbmcoaWQpKTtcbiAgICAgIGlmIChzaWQgPT0gX2lkKSByZXR1cm4gdGhpc1tpXTtcbiAgICB9IGVsc2UgaWYgKGNhc3RlZCA9PSBfaWQpIHtcbiAgICAgIHJldHVybiB0aGlzW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmF0aXZlIGpzIEFycmF5IG9mIHBsYWluIGpzIG9iamVjdHNcbiAqXG4gKiAjIyMjTk9URTpcbiAqXG4gKiBfRWFjaCBzdWItZG9jdW1lbnQgaXMgY29udmVydGVkIHRvIGEgcGxhaW4gb2JqZWN0IGJ5IGNhbGxpbmcgaXRzIGAjdG9PYmplY3RgIG1ldGhvZC5fXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25hbCBvcHRpb25zIHRvIHBhc3MgdG8gZWFjaCBkb2N1bWVudHMgYHRvT2JqZWN0YCBtZXRob2QgY2FsbCBkdXJpbmcgY29udmVyc2lvblxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoZG9jKSB7XG4gICAgcmV0dXJuIGRvYyAmJiBkb2MudG9PYmplY3Qob3B0aW9ucykgfHwgbnVsbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWJkb2N1bWVudCBjYXN0ZWQgdG8gdGhpcyBzY2hlbWEuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FtZSBzdWJkb2N1bWVudCBjb25zdHJ1Y3RvciB1c2VkIGZvciBjYXN0aW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIHZhbHVlIHRvIGNhc3QgdG8gdGhpcyBhcnJheXMgU3ViRG9jdW1lbnQgc2NoZW1hXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblN0b3JhZ2VEb2N1bWVudEFycmF5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBuZXcgdGhpcy5fc2NoZW1hLmNhc3RlckNvbnN0cnVjdG9yKG9iaik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmbiB0aGF0IG5vdGlmaWVzIGFsbCBjaGlsZCBkb2NzIG9mIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5TdG9yYWdlRG9jdW1lbnRBcnJheS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24gbm90aWZ5IChldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiBub3RpZnkgKHZhbCkge1xuICAgIHZhciBpID0gc2VsZi5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKCFzZWxmW2ldKSBjb250aW51ZTtcbiAgICAgIHNlbGZbaV0udHJpZ2dlcihldmVudCwgdmFsKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qIVxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBTdG9yYWdlRG9jdW1lbnRBcnJheTtcbiIsIi8qIVxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRG9jdW1lbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudCcpO1xuXG4vKipcbiAqIEVtYmVkZGVkRG9jdW1lbnQgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEganMgb2JqZWN0IHJldHVybmVkIGZyb20gdGhlIGRiXG4gKiBAcGFyYW0ge01vbmdvb3NlRG9jdW1lbnRBcnJheX0gcGFyZW50QXJyIHRoZSBwYXJlbnQgYXJyYXkgb2YgdGhpcyBkb2N1bWVudFxuICogQGluaGVyaXRzIERvY3VtZW50XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRW1iZWRkZWREb2N1bWVudCAoIGRhdGEsIHBhcmVudEFyciApIHtcbiAgaWYgKHBhcmVudEFycikge1xuICAgIHRoaXMuX19wYXJlbnRBcnJheSA9IHBhcmVudEFycjtcbiAgICB0aGlzLl9fcGFyZW50ID0gcGFyZW50QXJyLl9wYXJlbnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX3BhcmVudEFycmF5ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX19wYXJlbnQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBEb2N1bWVudC5jYWxsKCB0aGlzLCBkYXRhLCB1bmRlZmluZWQgKTtcblxuICAvLyDQndGD0LbQvdC+INC00LvRjyDQv9GA0L7QsdGA0L7RgdCwINC40LfQvNC10L3QtdC90LjRjyDQt9C90LDRh9C10L3QuNGPINC40Lcg0YDQvtC00LjRgtC10LvRjNGB0LrQvtCz0L4g0LTQvtC60YPQvNC10L3RgtCwLCDQvdCw0L/RgNC40LzQtdGAINC/0YDQuCDRgdC+0YXRgNCw0L3QtdC90LjQuFxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub24oJ2lzTmV3JywgZnVuY3Rpb24gKHZhbCkge1xuICAgIHNlbGYuaXNOZXcgPSB2YWw7XG4gIH0pO1xufVxuXG4vKiFcbiAqIEluaGVyaXQgZnJvbSBEb2N1bWVudFxuICovXG5cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLl9fcHJvdG9fXyA9IERvY3VtZW50LnByb3RvdHlwZTtcblxuLyoqXG4gKiBNYXJrcyB0aGUgZW1iZWRkZWQgZG9jIG1vZGlmaWVkLlxuICpcbiAqICMjIyNFeGFtcGxlOlxuICpcbiAqICAgICB2YXIgZG9jID0gYmxvZ3Bvc3QuY29tbWVudHMuaWQoaGV4c3RyaW5nKTtcbiAqICAgICBkb2MubWl4ZWQudHlwZSA9ICdjaGFuZ2VkJztcbiAqICAgICBkb2MubWFya01vZGlmaWVkKCdtaXhlZC50eXBlJyk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGggd2hpY2ggY2hhbmdlZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUubWFya01vZGlmaWVkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybjtcblxuICB0aGlzLiRfXy5hY3RpdmVQYXRocy5tb2RpZnkocGF0aCk7XG5cbiAgaWYgKHRoaXMuaXNOZXcpIHtcbiAgICAvLyBNYXJrIHRoZSBXSE9MRSBwYXJlbnQgYXJyYXkgYXMgbW9kaWZpZWRcbiAgICAvLyBpZiB0aGlzIGlzIGEgbmV3IGRvY3VtZW50IChpLmUuLCB3ZSBhcmUgaW5pdGlhbGl6aW5nXG4gICAgLy8gYSBkb2N1bWVudCksXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQoKTtcbiAgfSBlbHNlXG4gICAgdGhpcy5fX3BhcmVudEFycmF5Ll9tYXJrTW9kaWZpZWQodGhpcywgcGF0aCk7XG59O1xuXG4vKipcbiAqIFVzZWQgYXMgYSBzdHViIGZvciBbaG9va3MuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ibm9ndWNoaS9ob29rcy1qcy90cmVlLzMxZWM1NzFjZWYwMzMyZTIxMTIxZWU3MTU3ZTBjZjk3Mjg1NzJjYzMpXG4gKlxuICogIyMjI05PVEU6XG4gKlxuICogX1RoaXMgaXMgYSBuby1vcC4gRG9lcyBub3QgYWN0dWFsbHkgc2F2ZSB0aGUgZG9jIHRvIHRoZSBkYi5fXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZWQgUHJvbWlzZVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgcHJvbWlzZSA9ICQuRGVmZXJyZWQoKS5kb25lKGZuKTtcbiAgcHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHN1YmRvY3VtZW50IGZyb20gaXRzIHBhcmVudCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgaWYgKCF0aGlzLl9fcGFyZW50QXJyYXkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBfaWQ7XG4gIGlmICghdGhpcy53aWxsUmVtb3ZlKSB7XG4gICAgX2lkID0gdGhpcy5fZG9jLl9pZDtcbiAgICBpZiAoIV9pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3IgeW91ciBvd24gZ29vZCwgTW9uZ29vc2UgZG9lcyBub3Qga25vdyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnaG93IHRvIHJlbW92ZSBhbiBFbWJlZGRlZERvY3VtZW50IHRoYXQgaGFzIG5vIF9pZCcpO1xuICAgIH1cbiAgICB0aGlzLl9fcGFyZW50QXJyYXkucHVsbCh7IF9pZDogX2lkIH0pO1xuICAgIHRoaXMud2lsbFJlbW92ZSA9IHRydWU7XG4gIH1cblxuICBpZiAoZm4pXG4gICAgZm4obnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlICN1cGRhdGUgbWV0aG9kIG9mIHBhcmVudCBkb2N1bWVudHMuXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSAjdXBkYXRlIG1ldGhvZCBpcyBub3QgYXZhaWxhYmxlIG9uIEVtYmVkZGVkRG9jdW1lbnRzJyk7XG59O1xuXG4vKipcbiAqIE1hcmtzIGEgcGF0aCBhcyBpbnZhbGlkLCBjYXVzaW5nIHZhbGlkYXRpb24gdG8gZmFpbC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgZmllbGQgdG8gaW52YWxpZGF0ZVxuICogQHBhcmFtIHtTdHJpbmd8RXJyb3J9IGVyciBlcnJvciB3aGljaCBzdGF0ZXMgdGhlIHJlYXNvbiBgcGF0aGAgd2FzIGludmFsaWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5pbnZhbGlkYXRlID0gZnVuY3Rpb24gKHBhdGgsIGVyciwgdmFsLCBmaXJzdCkge1xuICBpZiAoIXRoaXMuX19wYXJlbnQpIHtcbiAgICB2YXIgbXNnID0gJ1VuYWJsZSB0byBpbnZhbGlkYXRlIGEgc3ViZG9jdW1lbnQgdGhhdCBoYXMgbm90IGJlZW4gYWRkZWQgdG8gYW4gYXJyYXkuJ1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fX3BhcmVudEFycmF5LmluZGV4T2YodGhpcyk7XG4gIHZhciBwYXJlbnRQYXRoID0gdGhpcy5fX3BhcmVudEFycmF5Ll9wYXRoO1xuICB2YXIgZnVsbFBhdGggPSBbcGFyZW50UGF0aCwgaW5kZXgsIHBhdGhdLmpvaW4oJy4nKTtcblxuICAvLyBzbmlmZmluZyBhcmd1bWVudHM6XG4gIC8vIG5lZWQgdG8gY2hlY2sgaWYgdXNlciBwYXNzZWQgYSB2YWx1ZSB0byBrZWVwXG4gIC8vIG91ciBlcnJvciBtZXNzYWdlIGNsZWFuLlxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVyciwgdmFsKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fcGFyZW50LmludmFsaWRhdGUoZnVsbFBhdGgsIGVycik7XG4gIH1cblxuICBpZiAoZmlyc3QpXG4gICAgdGhpcy4kX18udmFsaWRhdGlvbkVycm9yID0gdGhpcy5vd25lckRvY3VtZW50KCkuJF9fLnZhbGlkYXRpb25FcnJvcjtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvcCBsZXZlbCBkb2N1bWVudCBvZiB0aGlzIHN1Yi1kb2N1bWVudC5cbiAqXG4gKiBAcmV0dXJuIHtEb2N1bWVudH1cbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUub3duZXJEb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuJF9fLm93bmVyRG9jdW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kX18ub3duZXJEb2N1bWVudDtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSB0aGlzLl9fcGFyZW50O1xuICBpZiAoIXBhcmVudCkgcmV0dXJuIHRoaXM7XG5cbiAgd2hpbGUgKHBhcmVudC5fX3BhcmVudCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5fX3BhcmVudDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLiRfXy5vd25lckRvY3VtZW50ID0gcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBmdWxsIHBhdGggdG8gdGhpcyBkb2N1bWVudC4gSWYgb3B0aW9uYWwgYHBhdGhgIGlzIHBhc3NlZCwgaXQgaXMgYXBwZW5kZWQgdG8gdGhlIGZ1bGwgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhdGhdXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBtZXRob2QgJF9fZnVsbFBhdGhcbiAqIEBtZW1iZXJPZiBFbWJlZGRlZERvY3VtZW50XG4gKi9cbkVtYmVkZGVkRG9jdW1lbnQucHJvdG90eXBlLiRfX2Z1bGxQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgaWYgKCF0aGlzLiRfXy5mdWxsUGF0aCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIGlmICghcGFyZW50Ll9fcGFyZW50KSByZXR1cm4gcGF0aDtcblxuICAgIHZhciBwYXRocyA9IFtdO1xuICAgIHdoaWxlIChwYXJlbnQuX19wYXJlbnQpIHtcbiAgICAgIHBhdGhzLnVuc2hpZnQocGFyZW50Ll9fcGFyZW50QXJyYXkuX3BhdGgpO1xuICAgICAgcGFyZW50ID0gcGFyZW50Ll9fcGFyZW50O1xuICAgIH1cblxuICAgIHRoaXMuJF9fLmZ1bGxQYXRoID0gcGF0aHMuam9pbignLicpO1xuXG4gICAgaWYgKCF0aGlzLiRfXy5vd25lckRvY3VtZW50KSB7XG4gICAgICAvLyBvcHRpbWl6YXRpb25cbiAgICAgIHRoaXMuJF9fLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGhcbiAgICA/IHRoaXMuJF9fLmZ1bGxQYXRoICsgJy4nICsgcGF0aFxuICAgIDogdGhpcy4kX18uZnVsbFBhdGg7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhpcyBzdWItZG9jdW1lbnRzIHBhcmVudCBkb2N1bWVudC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FbWJlZGRlZERvY3VtZW50LnByb3RvdHlwZS5wYXJlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoaXMgc3ViLWRvY3VtZW50cyBwYXJlbnQgYXJyYXkuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRW1iZWRkZWREb2N1bWVudC5wcm90b3R5cGUucGFyZW50QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9fcGFyZW50QXJyYXk7XG59O1xuXG4vKiFcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1iZWRkZWREb2N1bWVudDtcbiIsIlxuLyohXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5leHBvcnRzLkFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG5leHBvcnRzLkVtYmVkZGVkID0gcmVxdWlyZSgnLi9lbWJlZGRlZCcpO1xuXG5leHBvcnRzLkRvY3VtZW50QXJyYXkgPSByZXF1aXJlKCcuL2RvY3VtZW50YXJyYXknKTtcbmV4cG9ydHMuT2JqZWN0SWQgPSByZXF1aXJlKCcuL29iamVjdGlkJyk7XG4iLCIvLyBSZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBjaGVja3MgZm9yIGhleCB2YWx1ZVxudmFyIHJjaGVja0ZvckhleCA9IG5ldyBSZWdFeHAoXCJeWzAtOWEtZkEtRl17MjR9JFwiKTtcblxuLyoqXG4qIENyZWF0ZSBhIG5ldyBPYmplY3RJZCBpbnN0YW5jZVxuKlxuKiBAcGFyYW0ge1N0cmluZ30gW2lkXSBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcuXG4qIEByZXR1cm4ge09iamVjdH0gaW5zdGFuY2Ugb2YgT2JqZWN0SWQuXG4qL1xuZnVuY3Rpb24gT2JqZWN0SWQoIGlkICkge1xuICAvLyDQmtC+0L3RgdGC0YDRg9C60YLQvtGAINC80L7QttC90L4g0LjRgdC/0L7Qu9GM0LfQvtCy0LDRgtGMINCx0LXQtyBuZXdcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElkKSkgcmV0dXJuIG5ldyBPYmplY3RJZCggaWQgKTtcbiAgLy9pZiAoIGlkIGluc3RhbmNlb2YgT2JqZWN0SWQgKSByZXR1cm4gaWQ7XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3IgaWYgaXQncyBub3QgYSB2YWxpZCBzZXR1cFxuICBpZiAoIGlkICE9IG51bGwgJiYgdHlwZW9mIGlkICE9ICdzdHJpbmcnICYmIGlkLmxlbmd0aCAhPSAyNCApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudCBwYXNzZWQgaW4gbXVzdCBiZSBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVycycpO1xuXG4gIC8vIEdlbmVyYXRlIGlkXG4gIGlmICggaWQgPT0gbnVsbCApIHtcbiAgICB0aGlzLmlkID0gdGhpcy5nZW5lcmF0ZSgpO1xuXG4gIH0gZWxzZSBpZiggcmNoZWNrRm9ySGV4LnRlc3QoIGlkICkgKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBwYXNzZWQgaW4gaXMgbm90IGEgdmFsaWQgMjQgY2hhcmFjdGVyIGhleCBzdHJpbmcnKTtcbiAgfVxufVxuXG4vLyBQcml2YXRlIGFycmF5IG9mIGNoYXJzIHRvIHVzZVxuT2JqZWN0SWQucHJvdG90eXBlLkNIQVJTID0gJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCgnJyk7XG5cbi8vVE9ETzog0LzQvtC20L3QviDQu9C4INC40YHQv9C+0LvRjNC30L7QstCw0YLRjCDQsdC+0LvRjNGI0LjQtSDRgdC40LzQstC+0LvRiyBBLVo/XG4vLyBHZW5lcmF0ZSBhIHJhbmRvbSBPYmplY3RJZC5cbk9iamVjdElkLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBjaGFycyA9IHRoaXMuQ0hBUlMsIF9pZCA9IG5ldyBBcnJheSggMzYgKSwgcm5kID0gMCwgcjtcbiAgZm9yICggdmFyIGkgPSAwOyBpIDwgMjQ7IGkrKyApIHtcbiAgICBpZiAoIHJuZCA8PSAweDAyIClcbiAgICAgIHJuZCA9IDB4MjAwMDAwMCArIChNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwKSB8IDA7XG5cbiAgICByID0gcm5kICYgMHhmO1xuICAgIHJuZCA9IHJuZCA+PiA0O1xuICAgIF9pZFsgaSBdID0gY2hhcnNbKGkgPT0gMTkpID8gKHIgJiAweDMpIHwgMHg4IDogcl07XG4gIH1cblxuICByZXR1cm4gX2lkLmpvaW4oJycpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG4vKipcbiogUmV0dXJuIHRoZSBPYmplY3RJZCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuKlxuKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuKiBAYXBpIHB1YmxpY1xuKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0hleFN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5pZDtcbn07XG5cbi8qKlxuKiBDb252ZXJ0cyB0aGUgaWQgaW50byBhIDI0IGJ5dGUgaGV4IHN0cmluZyBmb3IgcHJpbnRpbmdcbipcbiogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiogQGFwaSBwcml2YXRlXG4qL1xuT2JqZWN0SWQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRvSGV4U3RyaW5nKCk7XG59O1xuXG4vKipcbiogQ29udmVydHMgdG8gaXRzIEpTT04gcmVwcmVzZW50YXRpb24uXG4qXG4qIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4qIEBhcGkgcHJpdmF0ZVxuKi9cbk9iamVjdElkLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9IZXhTdHJpbmcoKTtcbn07XG5cbi8qKlxuKiBDb21wYXJlcyB0aGUgZXF1YWxpdHkgb2YgdGhpcyBPYmplY3RJZCB3aXRoIGBvdGhlcklEYC5cbipcbiogQHBhcmFtIHtPYmplY3R9IG90aGVySUQgT2JqZWN0SWQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuKiBAcmV0dXJuIHtCb29sfSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SWQnc1xuKiBAYXBpIHB1YmxpY1xuKi9cbk9iamVjdElkLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMoIG90aGVySUQgKXtcbiAgdmFyIGlkID0gKCBvdGhlcklEIGluc3RhbmNlb2YgT2JqZWN0SWQgfHwgb3RoZXJJRC50b0hleFN0cmluZyApXG4gICAgPyBvdGhlcklELmlkXG4gICAgOiBuZXcgT2JqZWN0SWQoIG90aGVySUQgKS5pZDtcblxuICByZXR1cm4gdGhpcy5pZCA9PT0gaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdElkO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIE9iamVjdElkID0gcmVxdWlyZSgnLi90eXBlcy9vYmplY3RpZCcpXG4gICwgbXBhdGggPSByZXF1aXJlKCcuL21wYXRoJylcbiAgLCBTdG9yYWdlQXJyYXkgPSByZXF1aXJlKCcuL3R5cGVzJykuQXJyYXlcbiAgLCBEb2N1bWVudCA9IHJlcXVpcmUoJy4vZG9jdW1lbnQnKTtcblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIHJ1bGVzLlxuICpcbiAqIFRoZXNlIHJ1bGVzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICpcbiAqL1xuZXhwb3J0cy5wbHVyYWxpemF0aW9uID0gW1xuICBbLyhtKWFuJC9naSwgJyQxZW4nXSxcbiAgWy8ocGUpcnNvbiQvZ2ksICckMW9wbGUnXSxcbiAgWy8oY2hpbGQpJC9naSwgJyQxcmVuJ10sXG4gIFsvXihveCkkL2dpLCAnJDFlbiddLFxuICBbLyhheHx0ZXN0KWlzJC9naSwgJyQxZXMnXSxcbiAgWy8ob2N0b3B8dmlyKXVzJC9naSwgJyQxaSddLFxuICBbLyhhbGlhc3xzdGF0dXMpJC9naSwgJyQxZXMnXSxcbiAgWy8oYnUpcyQvZ2ksICckMXNlcyddLFxuICBbLyhidWZmYWx8dG9tYXR8cG90YXQpbyQvZ2ksICckMW9lcyddLFxuICBbLyhbdGldKXVtJC9naSwgJyQxYSddLFxuICBbL3NpcyQvZ2ksICdzZXMnXSxcbiAgWy8oPzooW15mXSlmZXwoW2xyXSlmKSQvZ2ksICckMSQydmVzJ10sXG4gIFsvKGhpdmUpJC9naSwgJyQxcyddLFxuICBbLyhbXmFlaW91eV18cXUpeSQvZ2ksICckMWllcyddLFxuICBbLyh4fGNofHNzfHNoKSQvZ2ksICckMWVzJ10sXG4gIFsvKG1hdHJ8dmVydHxpbmQpaXh8ZXgkL2dpLCAnJDFpY2VzJ10sXG4gIFsvKFttfGxdKW91c2UkL2dpLCAnJDFpY2UnXSxcbiAgWy8oa258d3xsKWlmZSQvZ2ksICckMWl2ZXMnXSxcbiAgWy8ocXVpeikkL2dpLCAnJDF6ZXMnXSxcbiAgWy9zJC9naSwgJ3MnXSxcbiAgWy8oW15hLXpdKSQvLCAnJDEnXSxcbiAgWy8kL2dpLCAncyddXG5dO1xudmFyIHJ1bGVzID0gZXhwb3J0cy5wbHVyYWxpemF0aW9uO1xuXG4vKipcbiAqIFVuY291bnRhYmxlIHdvcmRzLlxuICpcbiAqIFRoZXNlIHdvcmRzIGFyZSBhcHBsaWVkIHdoaWxlIHByb2Nlc3NpbmcgdGhlIGFyZ3VtZW50IHRvIGBwbHVyYWxpemVgLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0cy51bmNvdW50YWJsZXMgPSBbXG4gICdhZHZpY2UnLFxuICAnZW5lcmd5JyxcbiAgJ2V4Y3JldGlvbicsXG4gICdkaWdlc3Rpb24nLFxuICAnY29vcGVyYXRpb24nLFxuICAnaGVhbHRoJyxcbiAgJ2p1c3RpY2UnLFxuICAnbGFib3VyJyxcbiAgJ21hY2hpbmVyeScsXG4gICdlcXVpcG1lbnQnLFxuICAnaW5mb3JtYXRpb24nLFxuICAncG9sbHV0aW9uJyxcbiAgJ3Nld2FnZScsXG4gICdwYXBlcicsXG4gICdtb25leScsXG4gICdzcGVjaWVzJyxcbiAgJ3NlcmllcycsXG4gICdyYWluJyxcbiAgJ3JpY2UnLFxuICAnZmlzaCcsXG4gICdzaGVlcCcsXG4gICdtb29zZScsXG4gICdkZWVyJyxcbiAgJ25ld3MnLFxuICAnZXhwZXJ0aXNlJyxcbiAgJ3N0YXR1cycsXG4gICdtZWRpYSdcbl07XG52YXIgdW5jb3VudGFibGVzID0gZXhwb3J0cy51bmNvdW50YWJsZXM7XG5cbi8qIVxuICogUGx1cmFsaXplIGZ1bmN0aW9uLlxuICpcbiAqIEBhdXRob3IgVEogSG9sb3dheWNodWsgKGV4dHJhY3RlZCBmcm9tIF9leHQuanNfKVxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyB0byBwbHVyYWxpemVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGx1cmFsaXplID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgZm91bmQ7XG4gIGlmICghfnVuY291bnRhYmxlcy5pbmRleE9mKHN0ci50b0xvd2VyQ2FzZSgpKSl7XG4gICAgZm91bmQgPSBydWxlcy5maWx0ZXIoZnVuY3Rpb24ocnVsZSl7XG4gICAgICByZXR1cm4gc3RyLm1hdGNoKHJ1bGVbMF0pO1xuICAgIH0pO1xuICAgIGlmIChmb3VuZFswXSkgcmV0dXJuIHN0ci5yZXBsYWNlKGZvdW5kWzBdWzBdLCBmb3VuZFswXVsxXSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuLyohXG4gKiBEZXRlcm1pbmVzIGlmIGBhYCBhbmQgYGJgIGFyZSBkZWVwIGVxdWFsLlxuICpcbiAqIE1vZGlmaWVkIGZyb20gbm9kZS9saWIvYXNzZXJ0LmpzXG4gKiBNb2RpZmllZCBmcm9tIG1vbmdvb3NlL3V0aWxzLmpzXG4gKlxuICogQHBhcmFtIHthbnl9IGEgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBiYFxuICogQHBhcmFtIHthbnl9IGIgYSB2YWx1ZSB0byBjb21wYXJlIHRvIGBhYFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbCAoYSwgYikge1xuICBpZiAodXRpbHMuaXNTdG9yYWdlT2JqZWN0KGEpKSBhID0gYS50b09iamVjdCgpO1xuICBpZiAodXRpbHMuaXNTdG9yYWdlT2JqZWN0KGIpKSBiID0gYi50b09iamVjdCgpO1xuXG4gIHJldHVybiBfLmlzRXF1YWwoYSwgYik7XG59O1xuXG5cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gaXNSZWdFeHAgKG8pIHtcbiAgcmV0dXJuICdvYmplY3QnID09IHR5cGVvZiBvXG4gICAgICAmJiAnW29iamVjdCBSZWdFeHBdJyA9PSB0b1N0cmluZy5jYWxsKG8pO1xufVxuXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cCAocmVnZXhwKSB7XG4gIGlmICghaXNSZWdFeHAocmVnZXhwKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhIFJlZ0V4cCcpO1xuICB9XG5cbiAgdmFyIGZsYWdzID0gW107XG4gIGlmIChyZWdleHAuZ2xvYmFsKSBmbGFncy5wdXNoKCdnJyk7XG4gIGlmIChyZWdleHAubXVsdGlsaW5lKSBmbGFncy5wdXNoKCdtJyk7XG4gIGlmIChyZWdleHAuaWdub3JlQ2FzZSkgZmxhZ3MucHVzaCgnaScpO1xuICByZXR1cm4gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCBmbGFncy5qb2luKCcnKSk7XG59XG5cbi8qIVxuICogT2JqZWN0IGNsb25lIHdpdGggU3RvcmFnZSBuYXRpdmVzIHN1cHBvcnQuXG4gKlxuICogSWYgb3B0aW9ucy5taW5pbWl6ZSBpcyB0cnVlLCBjcmVhdGVzIGEgbWluaW1hbCBkYXRhIG9iamVjdC4gRW1wdHkgb2JqZWN0cyBhbmQgdW5kZWZpbmVkIHZhbHVlcyB3aWxsIG5vdCBiZSBjbG9uZWQuIFRoaXMgbWFrZXMgdGhlIGRhdGEgcGF5bG9hZCBzZW50IHRvIE1vbmdvREIgYXMgc21hbGwgYXMgcG9zc2libGUuXG4gKlxuICogRnVuY3Rpb25zIGFyZSBuZXZlciBjbG9uZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIGNsb25lXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fSB0aGUgY2xvbmVkIG9iamVjdFxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSAob2JqLCBvcHRpb25zKSB7XG4gIGlmIChvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGwpXG4gICAgcmV0dXJuIG9iajtcblxuICBpZiAoIF8uaXNBcnJheSggb2JqICkgKSB7XG4gICAgcmV0dXJuIGNsb25lQXJyYXkoIG9iaiwgb3B0aW9ucyApO1xuICB9XG5cbiAgaWYgKCBpc1N0b3JhZ2VPYmplY3QoIG9iaiApICkge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuanNvbiAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2Ygb2JqLnRvSlNPTikge1xuICAgICAgcmV0dXJuIG9iai50b0pTT04oIG9wdGlvbnMgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9iai50b09iamVjdCggb3B0aW9ucyApO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqLmNvbnN0cnVjdG9yICkge1xuICAgIHN3aXRjaCAob2JqLmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgIHJldHVybiBjbG9uZU9iamVjdChvYmosIG9wdGlvbnMpO1xuICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgIHJldHVybiBuZXcgb2JqLmNvbnN0cnVjdG9yKCArb2JqICk7XG4gICAgICBjYXNlICdSZWdFeHAnOlxuICAgICAgICByZXR1cm4gY2xvbmVSZWdFeHAoIG9iaiApO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICggb2JqIGluc3RhbmNlb2YgT2JqZWN0SWQgKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RJZCggb2JqLmlkICk7XG4gIH1cblxuICBpZiAoICFvYmouY29uc3RydWN0b3IgJiYgXy5pc09iamVjdCggb2JqICkgKSB7XG4gICAgLy8gb2JqZWN0IGNyZWF0ZWQgd2l0aCBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgcmV0dXJuIGNsb25lT2JqZWN0KCBvYmosIG9wdGlvbnMgKTtcbiAgfVxuXG4gIGlmICggb2JqLnZhbHVlT2YgKXtcbiAgICByZXR1cm4gb2JqLnZhbHVlT2YoKTtcbiAgfVxufTtcbnZhciBjbG9uZSA9IGV4cG9ydHMuY2xvbmU7XG5cbi8qIVxuICogaWdub3JlXG4gKi9cbmZ1bmN0aW9uIGNsb25lT2JqZWN0IChvYmosIG9wdGlvbnMpIHtcbiAgdmFyIHJldGFpbktleU9yZGVyID0gb3B0aW9ucyAmJiBvcHRpb25zLnJldGFpbktleU9yZGVyXG4gICAgLCBtaW5pbWl6ZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5taW5pbWl6ZVxuICAgICwgcmV0ID0ge31cbiAgICAsIGhhc0tleXNcbiAgICAsIGtleXNcbiAgICAsIHZhbFxuICAgICwga1xuICAgICwgaTtcblxuICBpZiAoIHJldGFpbktleU9yZGVyICkge1xuICAgIGZvciAoayBpbiBvYmopIHtcbiAgICAgIHZhbCA9IGNsb25lKCBvYmpba10sIG9wdGlvbnMgKTtcblxuICAgICAgaWYgKCAhbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSApIHtcbiAgICAgICAgaGFzS2V5cyB8fCAoaGFzS2V5cyA9IHRydWUpO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGZhc3RlclxuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKCBvYmogKTtcbiAgICBpID0ga2V5cy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrID0ga2V5c1tpXTtcbiAgICAgIHZhbCA9IGNsb25lKG9ialtrXSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmICghbWluaW1pemUgfHwgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsKSkge1xuICAgICAgICBpZiAoIWhhc0tleXMpIGhhc0tleXMgPSB0cnVlO1xuICAgICAgICByZXRba10gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbmltaXplXG4gICAgPyBoYXNLZXlzICYmIHJldFxuICAgIDogcmV0O1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5IChhcnIsIG9wdGlvbnMpIHtcbiAgdmFyIHJldCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICByZXQucHVzaCggY2xvbmUoIGFycltpXSwgb3B0aW9ucyApICk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyohXG4gKiBNZXJnZXMgYGZyb21gIGludG8gYHRvYCB3aXRob3V0IG92ZXJ3cml0aW5nIGV4aXN0aW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZSAodG8sIGZyb20pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKVxuICAgICwgaSA9IGtleXMubGVuZ3RoXG4gICAgLCBrZXk7XG5cbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdG9ba2V5XSkge1xuICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcbiAgICB9IGVsc2UgaWYgKCBfLmlzT2JqZWN0KGZyb21ba2V5XSkgKSB7XG4gICAgICBtZXJnZSh0b1trZXldLCBmcm9tW2tleV0pO1xuICAgIH1cbiAgfVxufTtcblxuLyohXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gc3RyaW5nXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5yYW5kb20gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDMpO1xufTtcblxuXG4vKiFcbiAqIFJldHVybnMgaWYgYHZgIGlzIGEgc3RvcmFnZSBvYmplY3QgdGhhdCBoYXMgYSBgdG9PYmplY3QoKWAgbWV0aG9kIHdlIGNhbiB1c2UuXG4gKlxuICogVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGxpYnMgbGlrZSBEYXRlLmpzIHdoaWNoIGRvIGZvb2xpc2ggdGhpbmdzIHRvIE5hdGl2ZXMuXG4gKlxuICogQHBhcmFtIHthbnl9IHZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnRzLmlzU3RvcmFnZU9iamVjdCA9IGZ1bmN0aW9uICggdiApIHtcbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBEb2N1bWVudCB8fFxuICAgICAgICAgdiBpbnN0YW5jZW9mIFN0b3JhZ2VBcnJheTtcbn07XG52YXIgaXNTdG9yYWdlT2JqZWN0ID0gZXhwb3J0cy5pc1N0b3JhZ2VPYmplY3Q7XG5cbi8qIVxuICogUmV0dXJuIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuZXhwb3J0cy5nZXRWYWx1ZSA9IGZ1bmN0aW9uIChwYXRoLCBvYmosIG1hcCkge1xuICByZXR1cm4gbXBhdGguZ2V0KHBhdGgsIG9iaiwgJ19kb2MnLCBtYXApO1xufTtcblxuLyohXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBgb2JqYCBhdCB0aGUgZ2l2ZW4gYHBhdGhgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge0FueXRoaW5nfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqL1xuXG5leHBvcnRzLnNldFZhbHVlID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgb2JqLCBtYXApIHtcbiAgbXBhdGguc2V0KHBhdGgsIHZhbCwgb2JqLCAnX2RvYycsIG1hcCk7XG59O1xuXG5leHBvcnRzLnNldEltbWVkaWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgLy8g0JTQu9GPINC/0L7QtNC00LXRgNC20LrQuCDRgtC10YHRgtC+0LIgKNC+0LrRgNGD0LbQtdC90LjQtSBub2RlLmpzKVxuICBpZiAoIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIHByb2Nlc3MubmV4dFRpY2sgKSByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgLy8g0JXRgdC70Lgg0LIg0LHRgNCw0YPQt9C10YDQtSDRg9C20LUg0YDQtdCw0LvQuNC30L7QstCw0L0g0Y3RgtC+0YIg0LzQtdGC0L7QtFxuICBpZiAoIHdpbmRvdy5zZXRJbW1lZGlhdGUgKSByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZTtcblxuICB2YXIgaGVhZCA9IHsgfSwgdGFpbCA9IGhlYWQ7IC8vINC+0YfQtdGA0LXQtNGMINCy0YvQt9C+0LLQvtCyLCAxLdGB0LLRj9C30L3Ri9C5INGB0L/QuNGB0L7QulxuXG4gIHZhciBJRCA9IE1hdGgucmFuZG9tKCk7IC8vINGD0L3QuNC60LDQu9GM0L3Ri9C5INC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAXG5cbiAgZnVuY3Rpb24gb25tZXNzYWdlKGUpIHtcbiAgICBpZihlLmRhdGEgIT0gSUQpIHJldHVybjsgLy8g0L3QtSDQvdCw0YjQtSDRgdC+0L7QsdGJ0LXQvdC40LVcbiAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgIHZhciBmdW5jID0gaGVhZC5mdW5jO1xuICAgIGRlbGV0ZSBoZWFkLmZ1bmM7XG4gICAgZnVuYygpO1xuICB9XG5cbiAgaWYod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHsgLy8gSUU5Kywg0LTRgNGD0LPQuNC1INCx0YDQsNGD0LfQtdGA0YtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9ubWVzc2FnZSwgZmFsc2UpO1xuICB9IGVsc2UgeyAvLyBJRThcbiAgICB3aW5kb3cuYXR0YWNoRXZlbnQoICdvbm1lc3NhZ2UnLCBvbm1lc3NhZ2UgKTtcbiAgfVxuXG4gIHJldHVybiB3aW5kb3cucG9zdE1lc3NhZ2UgPyBmdW5jdGlvbihmdW5jKSB7XG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHsgZnVuYzogZnVuYyB9O1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShJRCwgXCIqXCIpO1xuICB9IDpcbiAgZnVuY3Rpb24oZnVuYykgeyAvLyBJRTw4XG4gICAgc2V0VGltZW91dChmdW5jLCAwKTtcbiAgfTtcbn0oKSk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlxyXG4vKipcclxuICogVmlydHVhbFR5cGUgY29uc3RydWN0b3JcclxuICpcclxuICogVGhpcyBpcyB3aGF0IG1vbmdvb3NlIHVzZXMgdG8gZGVmaW5lIHZpcnR1YWwgYXR0cmlidXRlcyB2aWEgYFNjaGVtYS5wcm90b3R5cGUudmlydHVhbGAuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIGZ1bGxuYW1lID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XHJcbiAqICAgICBmdWxsbmFtZSBpbnN0YW5jZW9mIG1vbmdvb3NlLlZpcnR1YWxUeXBlIC8vIHRydWVcclxuICpcclxuICogQHBhcm1hIHtPYmplY3R9IG9wdGlvbnNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBWaXJ0dWFsVHlwZSAob3B0aW9ucywgbmFtZSkge1xyXG4gIHRoaXMucGF0aCA9IG5hbWU7XHJcbiAgdGhpcy5nZXR0ZXJzID0gW107XHJcbiAgdGhpcy5zZXR0ZXJzID0gW107XHJcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYSBnZXR0ZXIuXHJcbiAqXHJcbiAqICMjIyNFeGFtcGxlOlxyXG4gKlxyXG4gKiAgICAgdmFyIHZpcnR1YWwgPSBzY2hlbWEudmlydHVhbCgnZnVsbG5hbWUnKTtcclxuICogICAgIHZpcnR1YWwuZ2V0KGZ1bmN0aW9uICgpIHtcclxuICogICAgICAgcmV0dXJuIHRoaXMubmFtZS5maXJzdCArICcgJyArIHRoaXMubmFtZS5sYXN0O1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIHRoaXMuZ2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgc2V0dGVyLlxyXG4gKlxyXG4gKiAjIyMjRXhhbXBsZTpcclxuICpcclxuICogICAgIHZhciB2aXJ0dWFsID0gc2NoZW1hLnZpcnR1YWwoJ2Z1bGxuYW1lJyk7XHJcbiAqICAgICB2aXJ0dWFsLnNldChmdW5jdGlvbiAodikge1xyXG4gKiAgICAgICB2YXIgcGFydHMgPSB2LnNwbGl0KCcgJyk7XHJcbiAqICAgICAgIHRoaXMubmFtZS5maXJzdCA9IHBhcnRzWzBdO1xyXG4gKiAgICAgICB0aGlzLm5hbWUubGFzdCA9IHBhcnRzWzFdO1xyXG4gKiAgICAgfSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge1ZpcnR1YWxUeXBlfSB0aGlzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmbikge1xyXG4gIHRoaXMuc2V0dGVycy5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIGdldHRlcnMgdG8gYHZhbHVlYCB1c2luZyBvcHRpb25hbCBgc2NvcGVgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcclxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXHJcbiAqIEByZXR1cm4ge2FueX0gdGhlIHZhbHVlIGFmdGVyIGFwcGx5aW5nIGFsbCBnZXR0ZXJzXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuVmlydHVhbFR5cGUucHJvdG90eXBlLmFwcGx5R2V0dGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUpIHtcclxuICB2YXIgdiA9IHZhbHVlO1xyXG4gIGZvciAodmFyIGwgPSB0aGlzLmdldHRlcnMubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0pIHtcclxuICAgIHYgPSB0aGlzLmdldHRlcnNbbF0uY2FsbChzY29wZSwgdiwgdGhpcyk7XHJcbiAgfVxyXG4gIHJldHVybiB2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgc2V0dGVycyB0byBgdmFsdWVgIHVzaW5nIG9wdGlvbmFsIGBzY29wZWAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gc2NvcGVcclxuICogQHJldHVybiB7YW55fSB0aGUgdmFsdWUgYWZ0ZXIgYXBwbHlpbmcgYWxsIHNldHRlcnNcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5WaXJ0dWFsVHlwZS5wcm90b3R5cGUuYXBwbHlTZXR0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBzY29wZSkge1xyXG4gIHZhciB2ID0gdmFsdWU7XHJcbiAgZm9yICh2YXIgbCA9IHRoaXMuc2V0dGVycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSkge1xyXG4gICAgdiA9IHRoaXMuc2V0dGVyc1tsXS5jYWxsKHNjb3BlLCB2LCB0aGlzKTtcclxuICB9XHJcbiAgcmV0dXJuIHY7XHJcbn07XHJcblxyXG4vKiFcclxuICogZXhwb3J0c1xyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFR5cGU7XHJcbiJdfQ==
        (24)
});;