/**
 * Module dependencies.
 */
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

describe('schematype', function(){
  describe('boolean', function(){
    it('null default is permitted (gh-523)', function(done){
      var s1 = new Schema({ b: { type: Boolean, default: null }})
        , M1 = storage.createCollection('NullDateDefaultIsAllowed1', s1)
        , s2 = new Schema({ b: { type: Boolean, default: false }})
        , M2 = storage.createCollection('NullDateDefaultIsAllowed2', s2)
        , s3 = new Schema({ b: { type: Boolean, default: true }})
        , M3 = storage.createCollection('NullDateDefaultIsAllowed3', s3);

      var m1 = M1.add();
      assert.strictEqual(null, m1.b);
      var m2 = M2.add();
      assert.strictEqual(false, m2.b);
      var m3 = M3.add();
      assert.strictEqual(true, m3.b);
      done();
    });
  });
});
