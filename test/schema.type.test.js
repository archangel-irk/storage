/**
 * Module dependencies.
 */
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

describe('schematype', function(){
  // selected не реализовано
  /*it('honors the selected option', function(done){
    var s = new Schema({ thought: { type: String, select: false }});
    assert.equal(false, s.path('thought').selected);

    var a = new Schema({ thought: { type: String, select: true }});
    assert.equal(true, a.path('thought').selected);

    done();
  });*/

  // _index не реализовано и не нужно
  /*it('properly handles specifying index in combination with unique or sparse', function(done){
    var s = new Schema({ name: { type: String, index: true, unique: true }});
    assert.deepEqual(s.path('name')._index, { unique: true });
    var s = new Schema({ name: { type: String, unique: true, index: true }});
    assert.deepEqual(s.path('name')._index, { unique: true });
    var s = new Schema({ name: { type: String, index: true, sparse: true }});
    assert.deepEqual(s.path('name')._index, { sparse: true });
    var s = new Schema({ name: { type: String, sparse: true, index: true }});
    assert.deepEqual(s.path('name')._index, { sparse: true });

    done();
  });*/
});
