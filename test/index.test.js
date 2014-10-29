'use strict';

var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

/**
 * Test.
 */

describe('storage', function(){

  describe('exports', function(){
    function test ( storage ) {
      assert.equal('string', typeof storage.version);
      assert.equal('function', typeof storage.Storage);
      assert.equal('function', typeof storage.Collection);
      assert.equal('function', typeof storage.Schema);
      assert.equal('function', typeof storage.SchemaType);
      assert.equal('function', typeof storage.Document);
      assert.equal('function', typeof storage.Error);
      assert.equal('function', typeof storage.Error.CastError);
      assert.equal('function', typeof storage.Error.ValidationError);
      assert.equal('function', typeof storage.Error.ValidatorError);
    }

    it('of module', function(done){
      test(storage);
      done();
    });

    it('of new Storage instances', function(done){
      test( new storage.Storage() );
      done();
    });
  });

  it('createCollection', function(done){
    done();
  });

  it('getCollectionNames', function(done){
    done();
  });
});