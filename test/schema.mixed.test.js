/**
 * Module dependencies.
 */
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

describe('schematype mixed', function(){
  describe('empty object defaults (gh-1380)', function(){
    it('are interpreted as fns that return new empty objects', function(done){
      var s = Schema({ mix: { type: Schema.Types.Mixed, default: {} }})
      var M = storage.createCollection('M1', s);

      var m1 = M.add();
      var m2 = M.add();

      m1.mix.val = 3;
      assert.equal(3, m1.mix.val);
      assert.equal(undefined, m2.mix.val);

      done();
    });

    it('can be forced to share the object between documents', function(done){
      // silly but necessary for backwards compatibility
      var s = Schema({ mix: { type: Schema.Types.Mixed, default: {}, shared: true }})
      var M = storage.createCollection('M2', s);

      var m1 = M.add();
      var m2 = M.add();

      m1.mix.val = 3;
      assert.equal(3, m1.mix.val);
      assert.equal(3, m2.mix.val);

      done();

    });
  });
});
