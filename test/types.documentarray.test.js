var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

var setValue = utils.setValue
  , StorageArray = storage.Types.Array
  , StorageDocumentArray = storage.Types.DocumentArray
  , EmbeddedDocument = storage.Types.Embedded
  , collection = 'types.documentarray_' + random();

/**
 * Setup.
 */

function TestDoc (schema) {
  var Subdocument = function () {
    EmbeddedDocument.call(this, {}, new StorageDocumentArray);
  };

  /**
   * Inherits from EmbeddedDocument.
   */
  Subdocument.prototype = Object.create( EmbeddedDocument.prototype );
  Subdocument.prototype.constructor = Subdocument;

  /**
   * Set schema.
   */

  var SubSchema = new Schema({
      title: { type: String }
  });

  Subdocument.prototype.$__setSchema(schema || SubSchema);

  return Subdocument;
}

/**
 * Test.
 */


describe('types.documentarray', function(){
  it('behaves and quacks like an array', function(done){
    var a = new StorageDocumentArray();

    assert.ok(a instanceof Array);
    assert.ok( a.isStorageArray );
    assert.ok( a.isStorageDocumentArray );
    assert.ok(Array.isArray(a));
    assert.equal('object', typeof a);

    var b = new StorageArray([1,2,3,4]);
    assert.equal('object', typeof b);
    assert.equal(Object.keys(b.toObject()).length,4);
    done();
  });

  it('#id', function(done){
    var Subdocument = TestDoc();

    var sub1 = new Subdocument();
    sub1.title = 'Hello again to all my friends';
    var id = sub1.id;

    var a = new StorageDocumentArray([sub1]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');
    assert.equal(a.id(sub1._id).title, 'Hello again to all my friends');

    // test with custom string _id
    var Custom = new Schema({
        title: { type: String }
      , _id:   { type: String, required: true }
    });

    var Subdocument = TestDoc(Custom);

    var sub2 = new Subdocument();
    sub2.title = 'together we can play some rock-n-roll';
    sub2._id = 'a25';
    var id2 = sub2.id;

    var a = new StorageDocumentArray([sub2]);
    assert.equal(a.id(id2).title, 'together we can play some rock-n-roll');
    assert.equal(a.id(sub2._id).title, 'together we can play some rock-n-roll');

    // test with custom number _id
    var CustNumber = new Schema({
        title: { type: String }
      , _id:   { type: Number, required: true }
    });

    var Subdocument = TestDoc(CustNumber);

    var sub3 = new Subdocument();
    sub3.title = 'rock-n-roll';
    sub3._id = 1995;
    var id3 = sub3.id;

    var a = new StorageDocumentArray([sub3]);
    assert.equal(a.id(id3).title, 'rock-n-roll');
    assert.equal(a.id(sub3._id).title, 'rock-n-roll');

    // test with no _id
    var NoId = new Schema({
        title: { type: String }
    }, { noId: true });

    var Subdocument = TestDoc(NoId);

    var sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    var a = new StorageDocumentArray([sub4])
      , threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(false, threw);

    // test the _id option, noId is deprecated
    var NoId = new Schema({
        title: { type: String }
    }, { _id: false });

    var Subdocument = TestDoc(NoId);

    var sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    var a = new StorageDocumentArray([sub4])
      , threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(false, threw);

    // test when _id is a populated document
    var Custom = new Schema({
        title: { type: String }
    });

    var Custom1 = new Schema({}, { id: false });

    var Subdocument = TestDoc(Custom);
    var Subdocument1 = TestDoc(Custom1);

    var sub = new Subdocument1();
    var sub1 = new Subdocument1();
    sub.title = 'Hello again to all my friends';
    var id = sub1._id.toString();
    setValue('_id', sub1 , sub);

    var a = new StorageDocumentArray([sub]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');

    done();
  });

  describe('toObject', function(){
    it('works with bad data', function(done){
      var threw = false;
      var a = new StorageDocumentArray([null]);
      try {
        a.toObject();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);
      done();
    });
    it('uses the correct transform (gh-1412)', function(done){
      var FirstSchema = new Schema({
        second: [SecondSchema]
      });

      FirstSchema.set('toObject', {
      transform: function first(doc, ret, options) {
          ret.firstToObject = true;
          return ret;
        }
      });

      var SecondSchema = new Schema({});

      SecondSchema.set('toObject', {
        transform: function second(doc, ret, options) {
          ret.secondToObject = true;
          return ret;
        }
      });

      var First = storage.createCollection('first', FirstSchema);
      var Second = storage.createCollection('second', SecondSchema);

      var first = First.add();

      first.second.push(Second.add());
      first.second.push(Second.add());
      var obj = first.toObject();

      assert.ok(obj.firstToObject);
      assert.ok(obj.second[0].secondToObject);
      assert.ok(obj.second[1].secondToObject);
      assert.ok(!obj.second[0].firstToObject);
      assert.ok(!obj.second[1].firstToObject);
      done();
    });
  });

  describe('create()', function(){
    it('works', function(done){
      var a = new StorageDocumentArray([]);
      assert.equal('function', typeof a.create);

      var schema = new Schema({ docs: [new Schema({ name: 'string' })] });
      var C = storage.createCollection('embeddedDocument#create_test', schema );
      var t = C.add();
      assert.equal('function', typeof t.docs.create);
      var subdoc = t.docs.create({ name: 100 });
      assert.ok(subdoc._id);
      assert.equal(subdoc.name, '100');
      assert.ok(subdoc instanceof EmbeddedDocument);
      done();
    });
  });

  describe('push()', function(){
    // нет хуков
    /*it('does not re-cast instances of its embedded doc', function(done){
      var child = new Schema({ name: String, date: Date });
      child.pre('save', function (next) {
        this.date = new Date;
        next();
      });

      var schema = Schema({ children: [child] });
      var C = storage.createCollection('embeddedDocArray-push-re-cast', schema );
      var m = C.add();

      m.save(function (err) {
        assert.ifError(err);
        M.findById(m._id, function (err, doc) {
          assert.ifError(err);
          var c = doc.children.create({ name: 'first' });
          assert.equal(undefined, c.date);
          doc.children.push(c);
          assert.equal(undefined, c.date);
          doc.save(function (err) {
            assert.ifError(err);
            assert.ok(doc.children[doc.children.length-1].date);
            assert.equal(c.date, doc.children[doc.children.length-1].date);

            doc.children.push(c);
            doc.children.push(c);

            doc.save(function (err) {
              assert.ifError(err);
              M.findById(m._id, function (err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal(3, doc.children.length);
                doc.children.forEach(function (child) {
                  assert.equal(doc.children[0].id, child.id);
                });
                done();
              })
            })
          })
        })
      })
    });*/

    it('corrects #ownerDocument() if value was created with array.create() (gh-1385)', function(done){
      var C = storage.createCollection('1385', new Schema({ docs: [{ name: String }] }) );
      var m = C.add();
      var doc = m.docs.create({ name: 'test 1385' });
      assert.notEqual(String(doc.ownerDocument()._id), String(m._id));
      m.docs.push(doc);
      assert.equal(doc.ownerDocument()._id, String(m._id));
      done();
    });
  });

  it('#push should work on EmbeddedDocuments more than 2 levels deep', function (done) {
    var Comments = new Schema;
    Comments.add({
        title     : String
      , comments  : [Comments]
    });
    var BlogPost = new Schema({
        title     : String
      , comments  : [Comments]
    });

    var Post = storage.createCollection('docarray-BlogPost', BlogPost);

    var p = Post.add({ title: "comment nesting" });
    var c1 = p.comments.create({ title: "c1" });
    var c2 = p.comments.create({ title: "c2" });
    var c3 = p.comments.create({ title: "c3" });

    p.comments.push(c1);
    c1.comments.push(c2);
    c2.comments.push(c3);

    var c4 = p.comments.create({ title: "c4" });
    p.comments[0].comments[0].comments[0].comments.push(c4);

    assert.equal(p.comments[0].comments[0].comments[0].comments[0].title, 'c4');
    done();
  });

  describe('invalidate()', function(){
    it('works', function(done){
      var schema = Schema({ docs: [{ name: 'string' }] });
      var T = storage.createCollection('embeddedDocument#invalidate_test', schema, 'asdfasdfa'+ random());
      var t = T.add({});

      t.docs.push({ name: 100 });
      var subdoc = t.docs[t.docs.length-1];
      subdoc.invalidate('name', 'boo boo', '%');

      subdoc = t.docs.create({ name: 'yep' });
      assert.throws(function(){
        // has no parent array
        subdoc.invalidate('name', 'crap', 47);
      }, /^Unable to invalidate a subdocument/);

      t.validate(function (err) {
        var e = t.errors['docs.0.name'];
        assert.ok(e);
        assert.equal(e.path, 'docs.0.name');
        assert.equal(e.type, 'user defined');
        assert.equal(e.message, 'boo boo');
        assert.equal(e.value, '%');
        done();
      });
    });

    it('handles validation failures', function(done){
      var nested = Schema({ v: { type: Number, max: 30 }});
      var schema = Schema({
          docs: [nested]
      }, { collection: 'embedded-invalidate-'+random() });

      var M = storage.createCollection('embedded-invalidate', schema);
      var m = M.add({ docs: [{ v: 900 }] });
      m.save( true ).fail(function (err) {
        assert.equal(900, err.errors['docs.0.v'].value);
        done();
      });
    });
  });

  it('removes attached event listeners when creating new doc array', function(done) {
    var nested = Schema({ v: { type: Number }});
    var schema = Schema({
      docs: [nested]
    }, { collection: 'gh-2159' });
    var M = storage.createCollection('gh-2159', schema);

    var m = M.add({ docs: [{v: 900}] });
    m.save(function( m ){
      m.shouldPrint = true;
      var numListeners = m._events.save.length;
      assert.ok(numListeners > 0);
      m.docs = [{ v: 9000 }];
      m.save(function( m ) {
        assert.equal(numListeners, m._events.save.length);
        done();
      });
    });
  });

});

