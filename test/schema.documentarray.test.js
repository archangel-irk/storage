/**
 * Module dependencies.
 */
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

/**
 * Test.
 */
describe('schema.documentarray', function(){
  it('defaults should be preserved', function(done){
    var child = new Schema({ title: String });

    var schema1 = new Schema({ x: { type: [child], default: [{ title: 'Prometheus'}] }});
    var schema2 = new Schema({ x: { type: [child], default: { title: 'Prometheus'} }});
    var schema3 = new Schema({ x: { type: [child], default: function(){return [{ title: 'Prometheus'}]} }});

    var M = storage.createCollection('DefaultDocArrays1', schema1);
    var N = storage.createCollection('DefaultDocArrays2', schema2);
    var O = storage.createCollection('DefaultDocArrays3', schema3);

    [M,N,O].forEach(function (M) {
      var m = M.add();
      assert.ok(Array.isArray(m.x));
      assert.equal(1, m.x.length);
      assert.equal('Prometheus', m.x[0].title);
    });

    done();
  });
});
