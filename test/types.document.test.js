// портирован
var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

var EmbeddedDocument = storage.Types.Embedded
  , DocumentArray = storage.Types.DocumentArray
  , SchemaType = storage.SchemaType
  , ValidationError = storage.Error.ValidationError;

/**
 * Setup.
 */

function Dummy () {
  storage.Document.call(this, {});
}
Dummy.prototype = Object.create( storage.Document.prototype );
Dummy.prototype.constructor = Dummy;

Dummy.prototype.$__setSchema(new Schema);

function Subdocument () {
  var arr = new DocumentArray;
  arr._path = 'jsconf.ar';
  arr._parent = new Dummy;
  arr[0] = this;
  EmbeddedDocument.call(this, {}, arr);
}

/**
 * Inherits from EmbeddedDocument.
 */
Subdocument.prototype = Object.create( EmbeddedDocument.prototype );
Subdocument.prototype.constructor = Subdocument;


/**
 * Set schema.
 */

Subdocument.prototype.$__setSchema(new Schema({
    test: { type: String, required: true }
  , work: { type: String, validate: /^good/ }
}));

/**
 * Schema.
 */

var RatingSchema = new Schema({
    stars: Number
  , description: { source: { url: String, time: Date }}
});

var MovieSchema = new Schema({
    title: String
  , ratings: [RatingSchema]
});

storage.createCollection('Movie', MovieSchema);

/**
 * Test.
 */

describe('types.document', function(){

  it('test that save fires errors', function(done){
    var a = new Subdocument();
    a.set('test', '');
    a.set('work', 'nope');

    a.validate(function(){
      assert.ok(a.__parent.$__.validationError instanceof ValidationError);
      assert.equal(a.__parent.errors['jsconf.ar.0.work'].name, 'ValidatorError');

      assert.equal(a.__parent.errors['jsconf.ar.0.work'].message, 'Validator failed for path `work` with value `nope`');
      assert.equal(a.__parent.errors['jsconf.ar.0.test'].message, 'Path `test` is required.');
      done();
    });
  });

  it('objects can be passed to #set', function (done) {
    var a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam'});
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
    done();
  });

  it('Subdocuments can be passed to #set', function (done) {
    var a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam'});
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
    var b = new Subdocument();
    b.set(a);
    assert.equal(b.test, 'paradiddle');
    assert.equal(b.work, 'good flam');
    done();
  });

  it('cached _ids', function (done) {
    var Movie = storage.createCollection('Movie');
    var m = Movie.add();

    assert.equal(m.id, m.$__._id);
    var old = m.id;
    m._id = new storage.Types.ObjectId;
    assert.equal(m.id, m.$__._id);
    assert.strictEqual(true, old !== m.$__._id);

    var m2= Movie.add();
    delete m2._doc._id;
    m2.init({ _id: new storage.Types.ObjectId });
    assert.equal(m2.id, m2.$__._id);
    assert.strictEqual(true, m.$__._id !== m2.$__._id);
    assert.strictEqual(true, m.id !== m2.id);
    assert.strictEqual(true, m.$__._id !== m2.$__._id);
    done();
  });

  it('Subdocument#remove (gh-531)', function (done) {
    var Movie = storage.createCollection('Movie');

    var super8 = Movie.add({ title: 'Super 8' });

    var id1 = '4e3d5fc7da5d7eb635063c96';
    var id2 = '4e3d5fc7da5d7eb635063c97';
    var id3 = '4e3d5fc7da5d7eb635063c98';
    var id4 = '4e3d5fc7da5d7eb635063c99';

    super8.ratings.push({ stars: 9, _id: id1 });
    super8.ratings.push({ stars: 8, _id: id2 });
    super8.ratings.push({ stars: 7, _id: id3 });
    super8.ratings.push({ stars: 6, _id: id4 });

    super8.save(function ( movie ) {
      assert.equal(movie.title, 'Super 8');
      assert.equal(movie.ratings.id(id1).stars.valueOf(), 9);
      assert.equal(movie.ratings.id(id2).stars.valueOf(), 8);
      assert.equal(movie.ratings.id(id3).stars.valueOf(), 7);
      assert.equal(movie.ratings.id(id4).stars.valueOf(), 6);

      movie.ratings.id(id1).stars = 5;
      movie.ratings.id(id2).remove();
      movie.ratings.id(id3).stars = 4;
      movie.ratings.id(id4).stars = 3;

      movie.save(function ( movie ) {
        assert.equal(movie.title, 'Super 8');
        assert.equal(movie.ratings.length,3);
        assert.equal(movie.ratings.id(id1).stars.valueOf(), 5);
        assert.equal(movie.ratings.id(id3).stars.valueOf(), 4);
        assert.equal(movie.ratings.id(id4).stars.valueOf(), 3);

        movie.ratings.id(id1).stars = 2;
        movie.ratings.id(id3).remove();
        movie.ratings.id(id4).stars = 1;

        movie.save(function ( movie ) {
          assert.equal(movie.ratings.length,2);
          assert.equal(movie.ratings.id(id1).stars.valueOf(), 2);
          assert.equal(movie.ratings.id(id4).stars.valueOf(), 1);

          // gh-531
          movie.ratings[0].remove();
          movie.ratings[0].remove();

          movie.save(function ( movie ) {
            assert.equal(0, movie.ratings.length);
            done();
          });
        });
      });
    });
  });

  describe('setting nested objects', function(){
    it('works (gh-1394)', function(done){
      var Movie = storage.createCollection('Movie');

      var LifeOfPi = Movie.add({
        title: 'Life of Pi',
        ratings: [{
          description: {
            source: {
              url: 'http://www.imdb.com/title/tt0454876/',
              time: new Date
            }
          }
        }]
      });

      LifeOfPi.save(function ( movie ) {
        assert.ok(movie.ratings[0].description.source.time instanceof Date);
        movie.ratings[0].description.source = { url: 'http://www.lifeofpimovie.com/' };

        movie.save(function ( movie ) {
          assert.equal('http://www.lifeofpimovie.com/', movie.ratings[0].description.source.url);

          // overwritten date
          assert.equal(undefined, movie.ratings[0].description.source.time);

          var newDate = new Date;
          movie.ratings[0].set('description.source.time', newDate, { merge: true });
          movie.save(function ( movie ) {
            assert.equal(String(newDate), movie.ratings[0].description.source.time);
            // url not overwritten using merge
            assert.equal('http://www.lifeofpimovie.com/', movie.ratings[0].description.source.url);
            done();
          });
        })
      });
    });
  });

});
