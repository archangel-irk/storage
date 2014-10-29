/**
 * Адаптер для использования библиотеки knockout и knockout-es5
 * Нужен для возможности two-way bindings
 *
 * Если подойдёт и односторонняя привязка из html в js,
 * то (предположительно) можно обойтись без адаптера
 *
 * ko.getObservable( doc, 'location.city') - так можно получать observable
 */
!function () {
'use strict';

storage.setAdapter({
  documentDefineProperty: function( doc, prototype, prop, prefix, path ){
    // Поддержка Knockout
    var allObservablesForObject = ko.es5.getAllObservablesForObject( doc, true ),
      schema = prototype.schema || prototype.constructor.schema,
      isArray = schema.path( path ) instanceof storage.SchemaTypes.Array,
      observable = isArray ? ko.observableArray()
        : ko.observable();

    // Поддержка Knockout.Validation
    /*var validators = schema.path(path) && schema.path(path).validators;
    if(validators && validators.length){
      var i = validators.length;
      while(i--){
        var validator = validators[i][0]
          , message = validators[i][1]
          , type = validators[i][2];

        //if( type = 'required' )
        observable.extend({  // custom validator
          validation: {
            validator: validator,
            message: message
          }
        })
      }
    }*/

    // Поддержка Knockout
    allObservablesForObject[ path ] = observable;

    if ( isArray ) {
      //todo: а действительно нужен вызов этого метода?
      ko.es5.notifyWhenPresentOrFutureArrayValuesMutate( ko, observable );
    }
  },

  documentSetInitialValue: function( doc, path, value ){
    var observable = ko.getObservable( doc, path );

    // Заставить геттер сработать и создать observable
    if ( observable == null ){
      storage.utils.mpath.get( path, doc );
      observable = ko.getObservable( doc, path );
    }

    // Установить начальное значение
    observable && observable( value );
  },

  /**
   * observable у свойств вложенных объектов будет null до первого обращения
   * @param doc
   * @param path
   */
  documentGetValue: function( doc, path ){
    var observable = ko.getObservable( doc, path );

    // Заставить геттер сработать и создать observable
    if ( observable == null ){
      storage.utils.mpath.get( path, doc );
      observable = ko.getObservable( doc, path );
    }

    observable && observable();
  },

  documentSetValue: function( doc, path, value ){
    var observable = ko.getObservable( doc, path );

    // Заставить геттер сработать и создать observable
    if ( observable == null ){
      storage.utils.mpath.get( path, doc );
      observable = ko.getObservable( doc, path );
    }

    // Обновим observable (чтобы работали привязки)
    observable && observable( value );
  }
});
}();