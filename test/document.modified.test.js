// Полностью портирован
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

var ObjectId = Schema.ObjectId
  , Document = storage.Document
  , DocumentObjectId = storage.Types.ObjectId;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPostSchema = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , owners    : [ObjectId]
  , comments  : [Comments]
  , nested    : { array: [Number] }
});

BlogPostSchema
.path('title')
.get(function(v) {
  if (v) return v.toUpperCase();
});

BlogPostSchema
.virtual('titleWithAuthor')
.get(function () {
  return this.get('title') + ' by ' + this.get('author');
})
.set(function (val) {
  var split = val.split(' by ');
  this.set('title', split[0]);
  this.set('author', split[1]);
});

BlogPostSchema.method('cool', function(){
  return this;
});

BlogPostSchema.static('woot', function(){
  return this;
});

var collectionName = 'docuemnt.modified.blogpost';

describe('document modified', function(){
  describe('modified states', function(){
    it('reset after save', function(done){
      var B = storage.createCollection(collectionName, BlogPostSchema)
        , pending = 2;

      var b = B.add();

      b.numbers.push(3);
      b.save(function () {
        --pending || find();
      });

      b.numbers.push(3);
      b.save(function () {
        --pending || find();
      });

      function find () {
        assert.equal(2, b.numbers.length);
        done();
      }
    });

    it('of embedded docs reset after save', function(done){
      var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

      var post = BlogPost.add({ title: 'hocus pocus' });
      post.comments.push({ title: 'Humpty Dumpty', comments: [{title: 'nested'}] });
      post.save(function(){
        var mFlag = post.comments[0].isModified('title');
        assert.equal(false, mFlag);
        assert.equal(false, post.isModified('title'));
        done();
      }).fail(function( e ){
        console.log( e );
      });
    })
  });

  describe('isModified', function(){
    it('should not throw with no argument', function(done){
      var BlogPost = storage.createCollection(collectionName, BlogPostSchema);
      var post = BlogPost.add();

      var threw = false;
      try {
        post.isModified();
      } catch (err) {
        threw = true;
      }

      assert.equal(false, threw);
      done();
    });

    it('when modifying keys', function(done){
      var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

      var post = BlogPost.add();
      post.init({
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
      });

      assert.equal(false, post.isModified('title'));
      post.set('title', 'test');
      assert.equal(true, post.isModified('title'));

      assert.equal(false, post.isModified('date'));
      post.set('date', new Date(post.date + 10));
      assert.equal(true, post.isModified('date'));

      assert.equal(false, post.isModified('meta.date'));
      done();
    });

    it('setting a key identically to its current value should not dirty the key', function(done){
      var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

      var post = BlogPost.add();
      post.init({
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
      });

      assert.equal(false, post.isModified('title'));
      post.set('title', 'Test');
      assert.equal(false, post.isModified('title'));
      done();
    });

    describe('on DocumentArray', function(){
      it('work', function (done) {
        var BlogPost = storage.createCollection(collectionName, BlogPostSchema);
        var post = BlogPost.add();
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
        });

        assert.equal(false, post.isModified('comments.0.title'));
        post.get('comments')[0].set('title', 'Woot');
        assert.equal(true, post.isModified('comments'));
        assert.equal(false, post.isDirectModified('comments'));
        assert.equal(true, post.isModified('comments.0.title'));
        assert.equal(true, post.isDirectModified('comments.0.title'));

        done();
      });
      it('with accessors', function(done){
        var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

        var post = BlogPost.add();
        post.init({
            title       : 'Test'
          , slug        : 'test'
          , comments    : [ { title: 'Test', date: new Date, body: 'Test' } ]
        });

        assert.equal(false, post.isModified('comments.0.body'));
        post.get('comments')[0].body = 'Woot';
        assert.equal(true, post.isModified('comments'));
        assert.equal(false, post.isDirectModified('comments'));
        assert.equal(true, post.isModified('comments.0.body'));
        assert.equal(true, post.isDirectModified('comments.0.body'));
        done();
      });
    });

    describe('on StorageArray', function(){
      it('atomic methods', function(done){
        // COMPLETEME
        var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

        var post = BlogPost.add();
        assert.equal(false, post.isModified('owners'));
        post.get('owners').push(new DocumentObjectId);
        assert.equal(true, post.isModified('owners'));
        done();
      });
      it('native methods', function(done){
        // COMPLETEME
        var BlogPost = storage.createCollection(collectionName, BlogPostSchema);

        var post = BlogPost.add();
        assert.equal(false, post.isModified('owners'));
        done();
      });
    });

    it('on entire document', function(done){
      var B = storage.createCollection(collectionName, BlogPostSchema);

      var doc = B.add({
          title       : 'Test'
        , slug        : 'test'
        , date        : new Date
        , meta        : {
              date      : new Date
            , visitors  : 5
          }
        , published   : true
        , mixed       : { x: [ { y: [1,'yes', 2] } ] }
        , numbers     : []
        , owners      : [new DocumentObjectId, new DocumentObjectId]
        , comments    : [
            { title: 'Test', date: new Date, body: 'Test' }
          , { title: 'Super', date: new Date, body: 'Cool' }
          ]
      });

      doc.save(function(post){
        //set the same data again back to the document.
        //expected result, nothing should be set to modified
        assert.equal(false, post.isModified('comments'));
        assert.equal(false, post.isNew);
        post.set(post.toObject());

        assert.equal(false, post.isModified('title'));
        assert.equal(false, post.isModified('slug'));
        assert.equal(false, post.isModified('date'));
        assert.equal(false, post.isModified('meta.date'));
        assert.equal(false, post.isModified('meta.visitors'));
        assert.equal(false, post.isModified('published'));
        assert.equal(false, post.isModified('mixed'));
        assert.equal(false, post.isModified('numbers'));
        assert.equal(false, post.isModified('owners'));
        assert.equal(false, post.isModified('comments'));

        var arr = post.comments.slice();
        arr[2] = post.comments.create({ title: 'index' });
        post.comments = arr;

        assert.equal(true, post.isModified('comments'));
        done();
      }, true );
    });

    it('should support setting mixed paths by string (gh-1418)', function(done){
      var BlogPost = storage.createCollection('1418', new Schema({ mixed: {} }));
      var b = BlogPost.add();
      b.init({ mixed: {} });

      var path = 'mixed.path';
      assert.ok(!b.isModified(path));

      b.set(path, 3);
      assert.ok(b.isModified(path));
      assert.equal(3, b.get(path));

      b = BlogPost.add();
      b.init({ mixed: {} });
      path = 'mixed.9a';
      b.set(path, 4);
      assert.ok(b.isModified(path));
      assert.equal(4, b.get(path));

      b = BlogPost.add({ mixed: {} });
      b.save(function(){
        path = 'mixed.9a.x';
        b.set(path, 8);
        assert.ok(b.isModified(path));
        assert.equal(8, b.get(path));

        b.save(function (doc) {
          assert.equal(8, doc.get(path));
          done();
        });
      });
    });
  });
});
