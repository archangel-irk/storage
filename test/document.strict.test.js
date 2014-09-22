/**
 * Test dependencies.
 */
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

var SchemaType = storage.SchemaType
  , CastError = storage.Error.CastError
  , ValidatorError = storage.Error.ValidatorError
  , ValidationError = storage.Error.ValidationError
  , ObjectId = Schema.Types.ObjectId
  , DocumentObjectId = storage.Types.ObjectId
  , DocumentArray = storage.Types.DocumentArray
  , EmbeddedDocument = storage.Types.Embedded;

describe('document: strict mode:', function(){
  it('should work', function(done){
    var raw = {
        ts  : { type: Date, default: Date.now }
      , content: String
      , mixed: {}
      , deepMixed: { '4a': {}}
      , arrayMixed: []
    };

    var lax = new Schema(raw, { strict: false });
    var strict = new Schema(raw);

    var Lax = storage.createCollection('Lax', lax);
    var Strict = storage.createCollection('Strict', strict);

    var l = Lax.add({content: 'sample', rouge: 'data'});
    assert.equal(false, l.$__.strictMode);
    l = l.toObject();
    assert.ok('ts' in l);
    assert.equal('sample', l.content);
    assert.equal('data', l.rouge);

    var s = Strict.add({content: 'sample', rouge: 'data'});
    assert.equal(true, s.$__.strictMode);
    s = s.toObject();
    assert.ok('ts' in s);
    assert.equal('sample', s.content);
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // instance override
    var instance = Lax.add({content: 'sample', rouge: 'data'}, true);
    assert.ok(instance.$__.strictMode);
    instance = instance.toObject();
    assert.equal('sample', instance.content);
    assert.ok(!instance.rouge);
    assert.ok('ts' in instance);

    // hydrate works as normal, but supports the schema level flag.
    var s2 = Strict.add({content: 'sample', rouge: 'data'}, false);
    assert.equal(false, s2.$__.strictMode);
    s2 = s2.toObject();
    assert.ok('ts' in s2);
    assert.equal('sample', s2.content);
    assert.ok('rouge' in s2);

    // testing init
    var s3 = Strict.add();
    s3.init({content: 'sample', rouge: 'data'});
    var s3obj = s3.toObject();
    assert.equal('sample', s3.content);
    assert.ok(!('rouge' in s3));
    assert.ok(!s3.rouge);

    done();
  });

  it('nested doc', function(done){
    var lax = new Schema({
        name: { last: String }
    }, { strict: false });

    var strict = new Schema({
        name: { last: String }
    });

    var Lax = storage.createCollection('NestedLax', lax, 'nestdoc'+random());
    var Strict = storage.createCollection('NestedStrict', strict, 'nestdoc'+random());

    var l = Lax.add();
    l.set('name', { last: 'goose', hack: 'xx' });
    l = l.toObject();
    assert.equal('goose', l.name.last);
    assert.equal('xx', l.name.hack);

    var s = Strict.add();
    s.set({ name: { last: 'goose', hack: 'xx' }});
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);

    s = Strict.add();
    s.set('name', { last: 'goose', hack: 'xx' });
    s.set('shouldnt.exist', ':(');
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);
    assert.ok(!s.shouldnt);

    done();
  });

  it('sub doc', function(done){
    var lax = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    }, { strict: false });

    var strict = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    });

    var Lax = storage.createCollection('EmbeddedLax', new Schema({ dox: [lax] }, { strict: false }), 'embdoc'+random());
    var Strict = storage.createCollection('EmbeddedStrict', new Schema({ dox: [strict] }, { strict: false }), 'embdoc'+random());

    var l = Lax.add({ dox: [{content: 'sample', rouge: 'data'}] });
    assert.equal(false, l.dox[0].$__.strictMode);
    l = l.dox[0].toObject();
    assert.equal('sample', l.content);
    assert.equal('data', l.rouge);
    assert.ok(l.rouge);

    var s = Strict.add({ dox: [{content: 'sample', rouge: 'data'}] });
    assert.equal(true, s.dox[0].$__.strictMode);
    s = s.dox[0].toObject();
    assert.ok('ts' in s);
    assert.equal('sample', s.content);
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // testing init
    var s3 = Strict.add();
    s3.init({dox: [{content: 'sample', rouge: 'data'}]});
    var s3obj = s3.toObject();
    assert.equal('sample', s3.dox[0].content);
    assert.ok(!('rouge' in s3.dox[0]));
    assert.ok(!s3.dox[0].rouge);

    done();
  });

  it('virtuals', function(done){
    var getCount = 0
      , setCount = 0;

    var strictSchema = new Schema({
        email: String
      , prop: String
    });

    strictSchema
    .virtual('myvirtual')
    .get(function() {
      getCount++;
      return 'ok';
    })
    .set(function(v) {
      setCount++;
      this.prop = v;
    });

    var StrictModel = storage.createCollection('StrictVirtual', strictSchema);

    var strictInstance = StrictModel.add({
        email: 'hunter@skookum.com'
      , myvirtual: 'test'
    });

    assert.equal(0, getCount);
    assert.equal(1, setCount);

    strictInstance.myvirtual = 'anotherone';
    var myvirtual = strictInstance.myvirtual;

    assert.equal(1, getCount);
    assert.equal(2, setCount);

    done();
  });

  // todo
  /*it('can be overridden during set()', function(done){
    var strict = new Schema({
        bool: Boolean
    });

    var Strict = storage.createCollection('Strict', strict);
    var s = Strict.add({ bool: true });

    // insert non-schema property
    var doc = s.toObject();
    doc.notInSchema = true;

    Strict.collection.insert(doc, { w: 1 }, function (err) {
      assert.ifError(err);
      Strict.findById(doc._id, function (err, doc) {
        assert.ifError(err);
        assert.equal(true, doc._doc.bool);
        assert.equal(true, doc._doc.notInSchema);
        doc.bool = undefined;
        doc.set('notInSchema', undefined, { strict: false });

        doc.save(function (err) {
          Strict.findById(doc._id, function (err, doc) {
            assert.ifError(err);
            assert.equal(undefined, doc._doc.bool);
            assert.equal(undefined, doc._doc.notInSchema);
            done();
          });
        });
      });
    });
  });*/

  // todo
  /*it('can be overridden during update()', function(done){
    var strict = new Schema({
        bool: Boolean
    });

    var Strict = storage.createCollection('Strict', strict);
    var s = Strict.add({ bool: true });

    // insert non-schema property
    var doc = s.toObject();
    doc.notInSchema = true;

    Strict.collection.insert(doc, { w: 1 }, function (err) {
      assert.ifError(err);

      Strict.findById(doc._id, function (err, doc) {
        assert.ifError(err);
        assert.equal(true, doc._doc.bool);
        assert.equal(true, doc._doc.notInSchema);

        Strict.update(
            { _id: doc._id }
          , { $unset: { bool: 1, notInSchema: 1 }}
          , { strict: false, w: 1 }
          , function (err) {

          assert.ifError(err);

          Strict.findById(doc._id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(undefined, doc._doc.bool);
            assert.equal(undefined, doc._doc.notInSchema);
            done();
          });
        });
      });
    });
  });*/

  describe('"throws" mode', function(){
    it('throws on set() of unknown property', function(done){
      var schema = Schema({ n: String, docs:[{x:[{y:String}]}] });
      schema.set('strict', 'throw');

      var M = storage.createCollection('throwStrictSet', schema, 'tss_'+random());
      var m = M.add();

      var badField = /Field `[\w\.]+` is not in schema/;

      assert.throws(function(){
        m.set('unknown.stuff.is.here', 3);
      }, badField);

      assert.throws(function(){
        m.set('n.something', 3);
      }, badField);

      assert.throws(function(){
        m.set('n.3', 3);
      }, badField);

      assert.throws(function(){
        m.set('z', 3);
      }, badField);

      assert.throws(function(){
        m.set('docs.z', 3);
      }, badField);

      assert.throws(function(){
        m.set('docs.0.z', 3);
      }, badField);

      assert.throws(function(){
        m.set('docs.0.x.z', 3);
      }, badField);

      assert.throws(function(){
        m.set('docs.0.x.4.z', 3);
      }, badField);

      assert.throws(function(){
        m.set('docs.0.x.4.y.z', 3);
      }, badField);

      done();
    });

    it('fails with extra fields', function (done) {
      // Simple schema with throws option
      var FooSchema = Schema({
          name: { type: String }
      }, {strict: "throw"});

      // Create the model
      var Foo = storage.createCollection('Foo', FooSchema);

      assert.doesNotThrow(function(){
        Foo.add({name: 'bar'});
      });

      assert.throws(function(){
        // The extra baz field should throw
        Foo.add({name: 'bar', baz: 'bam'});
      }, /Field `baz` is not in schema/);

      done();
    });
  });
});
