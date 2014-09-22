var Schema = storage.Schema
  , utils = storage.utils
  , random = utils.random;

var StorageArray = storage.Types.Array
  , collection = 'avengers_'+random();

var UserSchemaArrayTest = new Schema({
    name: String
  , pets: [Schema.ObjectId]
});

var UserCollection = storage.createCollection('UserArrayTest', UserSchemaArrayTest);

var PetSchema = new Schema({
  name: String
});

var PetCollection = storage.createCollection('Pet', PetSchema);

/**
 * Test.
 */
describe('types array', function(){
  it('behaves and quacks like an Array', function(done){
    var a = new StorageArray;

    assert.ok( a instanceof Array );
    assert.ok( a.isStorageArray );
    assert.equal(true, Array.isArray(a));
    done();
  });

  describe('indexOf()', function(){
    it('works', function(done){
      var tj = UserCollection.add({ name: 'tj' })
        , tobi = PetCollection.add({ name: 'tobi' })
        , loki = PetCollection.add({ name: 'loki' })
        , jane = PetCollection.add({ name: 'jane' });

      tj.pets.push(tobi);
      tj.pets.push(loki);
      tj.pets.push(jane);

      var pending = 3;

      ;[tobi, loki, jane].forEach(function(pet){
        pet.save(function(){
          --pending || cb();
        });
      });

      function cb() {
        tj.save(function(){
          assert.equal(tj.pets.length, 3);
          assert.equal(tj.pets.indexOf(tobi.id),0);
          assert.equal(tj.pets.indexOf(loki.id),1);
          assert.equal(tj.pets.indexOf(jane.id),2);
          assert.equal(tj.pets.indexOf(tobi._id),0);
          assert.equal(tj.pets.indexOf(loki._id),1);
          assert.equal(tj.pets.indexOf(jane._id),2);
          done();
        });
      }
    });
  });

  describe('splice()', function(){
    it('works', function(done){
      var schema = new Schema({ numbers: [Number] })
        , A = storage.createCollection('splicetestNumber', schema );

      var a = A.add({ numbers: [4,5,6,7] });
      a.save(function ( doc ) {
        var removed = doc.numbers.splice(1, 1, "10");
        assert.deepEqual(removed, [5]);
        assert.equal('number', typeof doc.numbers[1]);
        assert.deepEqual(doc.numbers.toObject(),[4,10,6,7]);
        doc.save(function (doc1) {
          assert.deepEqual(doc1.numbers.toObject(), [4,10,6,7]);

          done();
        });
      });
    });

    it('on embedded docs', function(done){
      var schema = new Schema({ types: [new Schema({ type: String }) ]})
        , A = storage.createCollection('splicetestEmbeddedDoc', schema );

      var a = A.add({ types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}] });
      a.save(function (doc) {
        var removed = doc.types.splice(1, 1);
        assert.equal(removed.length,1);
        assert.equal(removed[0].type,'boy');

        var obj = doc.types.toObject();
        assert.equal(obj[0].type,'bird');
        assert.equal(obj[1].type,'frog');

        doc.save(function ( doc1 ) {
          var obj = doc1.types.toObject();
          assert.equal(obj[0].type,'bird');
          assert.equal(obj[1].type,'frog');
          done();
        });
      });
    });
  });

  describe('unshift()', function(){
    it('works', function(done){
      var schema = new Schema({
              types: [new Schema({ type: String })]
            , nums: [Number]
            , strs: [String]
          })
        , A = storage.createCollection('unshift', schema);

      var a = A.add({
          types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}]
        , nums: [1,2,3]
        , strs: 'one two three'.split(' ')
      });

      a.save(function ( doc ) {
        var tlen = doc.types.unshift({type:'tree'});
        var nlen = doc.nums.unshift(0);
        var slen = doc.strs.unshift('zero');

        assert.equal(tlen,5);
        assert.equal(nlen,4);
        assert.equal(slen,4);

        doc.types.push({type:'worm'});
        var obj = doc.types.toObject();
        assert.equal(obj[0].type,'tree');
        assert.equal(obj[1].type,'bird');
        assert.equal(obj[2].type,'boy');
        assert.equal(obj[3].type,'frog');
        assert.equal(obj[4].type,'cloud');
        assert.equal(obj[5].type,'worm');

        obj = doc.nums.toObject();
        assert.equal(obj[0].valueOf(),0);
        assert.equal(obj[1].valueOf(),1);
        assert.equal(obj[2].valueOf(),2);
        assert.equal(obj[3].valueOf(),3);

        obj = doc.strs.toObject();
        assert.equal(obj[0],'zero');
        assert.equal(obj[1],'one');
        assert.equal(obj[2],'two');
        assert.equal(obj[3],'three');

        doc.save(function (doc1) {
          var obj = doc1.types.toObject();
          assert.equal(obj[0].type,'tree');
          assert.equal(obj[1].type,'bird');
          assert.equal(obj[2].type,'boy');
          assert.equal(obj[3].type,'frog');
          assert.equal(obj[4].type,'cloud');
          assert.equal(obj[5].type,'worm');

          obj = doc1.nums.toObject();
          assert.equal(obj[0].valueOf(),0);
          assert.equal(obj[1].valueOf(),1);
          assert.equal(obj[2].valueOf(),2);
          assert.equal(obj[3].valueOf(),3);

          obj = doc1.strs.toObject();
          assert.equal(obj[0],'zero');
          assert.equal(obj[1],'one');
          assert.equal(obj[2],'two');
          assert.equal(obj[3],'three');
          done();
        });
      });
    });
  });

  describe('shift()', function(){
    it('works', function(done){
      var schema = new Schema({
              types: [new Schema({ type: String })]
            , nums: [Number]
            , strs: [String]
          });

      var A = storage.createCollection('shift', schema );

      var a = A.add({
          types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}]
        , nums: [1,2,3]
        , strs: 'one two three'.split(' ')
      });

      a.save(function (doc) {
        var t = doc.types.shift();
        var n = doc.nums.shift();
        var s = doc.strs.shift();

        assert.equal(t.type,'bird');
        assert.equal(n,1);
        assert.equal(s,'one');

        var obj = doc.types.toObject();
        assert.equal(obj[0].type,'boy');
        assert.equal(obj[1].type,'frog');
        assert.equal(obj[2].type,'cloud');

        doc.nums.push(4);
        obj = doc.nums.toObject();
        assert.equal(2, obj[0].valueOf());
        assert.equal(obj[1].valueOf(),3);
        assert.equal(obj[2].valueOf(),4);

        obj = doc.strs.toObject();
        assert.equal(obj[0],'two');
        assert.equal(obj[1],'three');

        doc.save(function (doc1) {
          var obj = doc1.types.toObject();
          assert.equal(obj[0].type,'boy');
          assert.equal(obj[1].type,'frog');
          assert.equal(obj[2].type,'cloud');

          obj = doc1.nums.toObject();
          assert.equal(obj[0].valueOf(),2);
          assert.equal(obj[1].valueOf(),3);
          assert.equal(obj[2].valueOf(),4);

          obj = doc1.strs.toObject();
          assert.equal(obj[0],'two');
          assert.equal(obj[1],'three');
          done();
        });
      });
    });
  });

  describe('pop()', function(){
    it('works', function(done){
      var schema = new Schema({
              types: [new Schema({ type: String })]
            , nums: [Number]
            , strs: [String]
          });

      var A = storage.createCollection('pop', schema);

      var a = A.add({
          types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}]
        , nums: [1,2,3]
        , strs: 'one two three'.split(' ')
      });

      a.save(function (doc) {
        var t = doc.types.pop();
        var n = doc.nums.pop();
        var s = doc.strs.pop();

        assert.equal(t.type,'cloud');
        assert.equal(n,3);
        assert.equal(s,'three');

        var obj = doc.types.toObject();
        assert.equal(obj[0].type,'bird');
        assert.equal(obj[1].type,'boy');
        assert.equal(obj[2].type,'frog');

        doc.nums.push(4);
        obj = doc.nums.toObject();
        assert.equal(obj[0].valueOf(),1);
        assert.equal(obj[1].valueOf(),2);
        assert.equal(obj[2].valueOf(),4);

        obj = doc.strs.toObject();
        assert.equal(obj[0],'one');
        assert.equal(obj[1],'two');

        doc.save(function (doc1) {
          var obj = doc1.types.toObject();
          assert.equal(obj[0].type,'bird');
          assert.equal(obj[1].type,'boy');
          assert.equal(obj[2].type,'frog');

          obj = doc1.nums.toObject();
          assert.equal(obj[0].valueOf(),1);
          assert.equal(obj[1].valueOf(),2);
          assert.equal(obj[2].valueOf(),4);

          obj = doc1.strs.toObject();
          assert.equal(obj[0],'one');
          assert.equal(obj[1],'two');
          done();
        });
      });
    });
  });

  describe('pull()', function(){
    it('works', function(done){
      var catSchema = new Schema({ name: String })
      var Cat = storage.createCollection('Cat', catSchema);
      var schema = new Schema({
          a: [{ type: Schema.ObjectId, ref: 'Cat' }]
      });
      var A = storage.createCollection('TestPull', schema);
      var cat  = Cat.add({ name: 'peanut' });

      cat.save(function () {
        var a = A.add({ a: [cat._id] });

        a.save(function ( doc ) {
          assert.equal(1, doc.a.length);
          doc.a.pull(cat.id);
          assert.equal(doc.a.length,0);
          done();
        });
      });
    });
  });

  describe('addToSet()', function(){
    it('works', function(done){
      var e = new Schema({ name: String, arr: [] })
        , schema = new Schema({
            num: [Number]
          , str: [String]
          , doc: [e]
          , date: [Date]
          , id:  [Schema.ObjectId]
        });

      var collection = storage.createCollection('testAddToSet', schema);
      var doc = collection.add();

      doc.num.push(1,2,3);
      doc.str.push('one','two','tres');
      doc.doc.push({ name: 'Dubstep', arr: [1] }, { name: 'Polka', arr: [{ x: 3 }]});

      var d1 = new Date;
      var d2 = new Date( +d1 + 60000);
      var d3 = new Date( +d1 + 30000);
      var d4 = new Date( +d1 + 20000);
      var d5 = new Date( +d1 + 90000);
      var d6 = new Date( +d1 + 10000);
      doc.date.push(d1, d2);

      var id1 = new storage.Types.ObjectId;
      var id2 = new storage.Types.ObjectId;
      var id3 = new storage.Types.ObjectId;
      var id4 = new storage.Types.ObjectId;
      var id5 = new storage.Types.ObjectId;
      var id6 = new storage.Types.ObjectId;

      doc.id.push(id1, id2);

      doc.num.addToSet(3,4,5);
      assert.equal(5, doc.num.length);
      doc.str.addToSet('four', 'five', 'two');
      assert.equal(doc.str.length,5);
      doc.id.addToSet(id2, id3);
      assert.equal(doc.id.length,3);
      doc.doc.addToSet(doc.doc[0]);
      assert.equal(doc.doc.length,2);
      doc.doc.addToSet({ name: 'Waltz', arr: [1] }, doc.doc[0]);
      assert.equal(doc.doc.length,3);
      assert.equal(doc.date.length,2);
      doc.date.addToSet(d1);
      assert.equal(doc.date.length,2);
      doc.date.addToSet(d3);
      assert.equal(doc.date.length,3);

      doc.save(function (doc) {
        assert.equal(doc.num.length,5);
        assert.ok(~doc.num.indexOf(1));
        assert.ok(~doc.num.indexOf(2));
        assert.ok(~doc.num.indexOf(3));
        assert.ok(~doc.num.indexOf(4));
        assert.ok(~doc.num.indexOf(5));

        assert.equal(doc.str.length,5);
        assert.ok(~doc.str.indexOf('one'));
        assert.ok(~doc.str.indexOf('two'));
        assert.ok(~doc.str.indexOf('tres'));
        assert.ok(~doc.str.indexOf('four'));
        assert.ok(~doc.str.indexOf('five'));

        assert.equal(doc.id.length,3);
        assert.ok(~doc.id.indexOf(id1));
        assert.ok(~doc.id.indexOf(id2));
        assert.ok(~doc.id.indexOf(id3));

        assert.equal(doc.date.length,3);
        assert.ok(~doc.date.indexOf(d1.toString()));
        assert.ok(~doc.date.indexOf(d2.toString()));
        assert.ok(~doc.date.indexOf(d3.toString()));

        assert.equal(doc.doc.length,3);
        assert.ok(doc.doc.some(function(v){return v.name === 'Waltz'}))
        assert.ok(doc.doc.some(function(v){return v.name === 'Dubstep'}))
        assert.ok(doc.doc.some(function(v){return v.name === 'Polka'}))

        // test single $addToSet
        doc.num.addToSet(3,4,5,6);
        assert.equal(doc.num.length,6);
        doc.str.addToSet('four', 'five', 'two', 'six');
        assert.equal(doc.str.length,6);
        doc.id.addToSet(id2, id3, id4);
        assert.equal(doc.id.length,4);

        doc.date.addToSet(d1, d3, d4);
        assert.equal(doc.date.length,4);

        doc.doc.addToSet(doc.doc[0], { name: '8bit' });
        assert.equal(doc.doc.length,4);

        doc.save(function (doc) {
          assert.equal(doc.num.length,6);
          assert.ok(~doc.num.indexOf(1));
          assert.ok(~doc.num.indexOf(2));
          assert.ok(~doc.num.indexOf(3));
          assert.ok(~doc.num.indexOf(4));
          assert.ok(~doc.num.indexOf(5));
          assert.ok(~doc.num.indexOf(6));

          assert.equal(doc.str.length,6);
          assert.ok(~doc.str.indexOf('one'));
          assert.ok(~doc.str.indexOf('two'));
          assert.ok(~doc.str.indexOf('tres'));
          assert.ok(~doc.str.indexOf('four'));
          assert.ok(~doc.str.indexOf('five'));
          assert.ok(~doc.str.indexOf('six'));

          assert.equal(doc.id.length,4);
          assert.ok(~doc.id.indexOf(id1));
          assert.ok(~doc.id.indexOf(id2));
          assert.ok(~doc.id.indexOf(id3));
          assert.ok(~doc.id.indexOf(id4));

          assert.equal(doc.date.length,4);
          assert.ok(~doc.date.indexOf(d1.toString()));
          assert.ok(~doc.date.indexOf(d2.toString()));
          assert.ok(~doc.date.indexOf(d3.toString()));
          assert.ok(~doc.date.indexOf(d4.toString()));

          assert.equal(doc.doc.length,4);
          assert.ok(doc.doc.some(function(v){return v.name === 'Waltz'}));
          assert.ok(doc.doc.some(function(v){return v.name === 'Dubstep'}));
          assert.ok(doc.doc.some(function(v){return v.name === 'Polka'}));
          assert.ok(doc.doc.some(function(v){return v.name === '8bit'}));

          // test multiple $addToSet
          doc.num.addToSet(7,8);
          assert.equal(doc.num.length,8);
          doc.str.addToSet('seven', 'eight');
          assert.equal(doc.str.length,8);
          doc.id.addToSet(id5, id6);
          assert.equal(doc.id.length,6);

          doc.date.addToSet(d5, d6);
          assert.equal(doc.date.length,6);

          doc.doc.addToSet(doc.doc[1], { name: 'BigBeat' }, { name: 'Funk' });
          assert.equal(doc.doc.length,6);

          doc.save(function (doc) {
            assert.equal(doc.num.length,8);
            assert.ok(~doc.num.indexOf(1));
            assert.ok(~doc.num.indexOf(2));
            assert.ok(~doc.num.indexOf(3));
            assert.ok(~doc.num.indexOf(4));
            assert.ok(~doc.num.indexOf(5));
            assert.ok(~doc.num.indexOf(6));
            assert.ok(~doc.num.indexOf(7));
            assert.ok(~doc.num.indexOf(8));

            assert.equal(doc.str.length,8);
            assert.ok(~doc.str.indexOf('one'));
            assert.ok(~doc.str.indexOf('two'));
            assert.ok(~doc.str.indexOf('tres'));
            assert.ok(~doc.str.indexOf('four'));
            assert.ok(~doc.str.indexOf('five'));
            assert.ok(~doc.str.indexOf('six'));
            assert.ok(~doc.str.indexOf('seven'));
            assert.ok(~doc.str.indexOf('eight'));

            assert.equal(doc.id.length,6);
            assert.ok(~doc.id.indexOf(id1));
            assert.ok(~doc.id.indexOf(id2));
            assert.ok(~doc.id.indexOf(id3));
            assert.ok(~doc.id.indexOf(id4));
            assert.ok(~doc.id.indexOf(id5));
            assert.ok(~doc.id.indexOf(id6));

            assert.equal(doc.date.length,6);
            assert.ok(~doc.date.indexOf(d1.toString()));
            assert.ok(~doc.date.indexOf(d2.toString()));
            assert.ok(~doc.date.indexOf(d3.toString()));
            assert.ok(~doc.date.indexOf(d4.toString()));
            assert.ok(~doc.date.indexOf(d5.toString()));
            assert.ok(~doc.date.indexOf(d6.toString()));

            assert.equal(doc.doc.length,6);
            assert.ok(doc.doc.some(function(v){return v.name === 'Waltz'}));
            assert.ok(doc.doc.some(function(v){return v.name === 'Dubstep'}));
            assert.ok(doc.doc.some(function(v){return v.name === 'Polka'}));
            assert.ok(doc.doc.some(function(v){return v.name === '8bit'}));
            assert.ok(doc.doc.some(function(v){return v.name === 'BigBeat'}));
            assert.ok(doc.doc.some(function(v){return v.name === 'Funk'}));
            done();
          });
        });
      });
    });

    it('handles sub-documents that do not have an _id gh-1973', function(done) {
      var e = new Schema({ name: String, arr: [] }, { _id: false })
        , schema = new Schema({
          doc: [e]
        });

      var M = storage.createCollection('gh1973', schema);
      var m = M.add();

      m.doc.addToSet({ name: 'Rap' });
      m.save(function(m) {
        assert.equal(1, m.doc.length);
        assert.equal('Rap', m.doc[0].name);
        m.doc.addToSet({ name: 'House' });
        assert.equal(2, m.doc.length);
        m.save(function(m) {
          assert.equal(2, m.doc.length);
          assert.ok(m.doc.some(function(v) { return v.name === 'Rap' }));
          assert.ok(m.doc.some(function(v) { return v.name === 'House' }));
          done();
        });
      });
    });
  });

  describe('sort()', function(){
    it('order should be saved', function(done){
      var M = storage.createCollection('ArraySortOrder', new Schema({ x: [Number] }));
      var m = M.add({ x: [1,4,3,2] });
      m.save(function (m) {
        assert.equal(1, m.x[0]);
        assert.equal(4, m.x[1]);
        assert.equal(3, m.x[2]);
        assert.equal(2, m.x[3]);

        m.x.sort();

        m.save(function (m1) {

          assert.equal(1, m1.x[0]);
          assert.equal(2, m1.x[1]);
          assert.equal(3, m1.x[2]);
          assert.equal(4, m1.x[3]);

          m1.x.sort(function(a,b){
            return b - a;
          });

          m1.save(function (m2) {
            assert.equal(4, m2.x[0]);
            assert.equal(3, m2.x[1]);
            assert.equal(2, m2.x[2]);
            assert.equal(1, m2.x[3]);
            done();
          });
        });
      });
    });
  });

  describe('set()', function(){
    var N, S, B, M, D;

    function save (doc, cb) {
      doc.save(function (doc) {
        cb( doc );
      }, true)
    }

    before(function(done){
      N = storage.createCollection('arraySet', Schema({ arr: [Number] }));
      S = storage.createCollection('arraySetString', Schema({ arr: [String] }));
      M = storage.createCollection('arraySetMixed', Schema({ arr: [] }));
      D = storage.createCollection('arraySetSubDocs', Schema({ arr: [{ name: String}] }));
      done();
    });

    it('works combined with other ops', function(done){
      var m = N.add({ arr: [3,4,5,6] });
      save(m, function (doc) {
        assert.equal(4, doc.arr.length);
        doc.arr.push(20);
        doc.arr.set(2, 10);
        assert.equal(5, doc.arr.length);
        assert.equal(10, doc.arr[2]);
        assert.equal(20, doc.arr[4]);

        save(doc, function (doc) {
          assert.equal(5, doc.arr.length);
          assert.equal(3, doc.arr[0]);
          assert.equal(4, doc.arr[1]);
          assert.equal(10, doc.arr[2]);
          assert.equal(6, doc.arr[3]);
          assert.equal(20, doc.arr[4]);

          doc.arr.set(4, 99);
          assert.equal(5, doc.arr.length);
          assert.equal(99, doc.arr[4]);
          doc.arr.remove(10);
          assert.equal(4, doc.arr.length);
          assert.equal(3, doc.arr[0]);
          assert.equal(4, doc.arr[1]);
          assert.equal(6, doc.arr[2]);
          assert.equal(99, doc.arr[3]);

          save(doc, function (doc) {
            assert.equal(4, doc.arr.length);
            assert.equal(3, doc.arr[0]);
            assert.equal(4, doc.arr[1]);
            assert.equal(6, doc.arr[2]);
            assert.equal(99, doc.arr[3]);
            done();
          });
        });
      });

      // after this works go back to finishing doc.populate() branch
    });

    it('works with numbers', function(done){
      var m = N.add({ arr: [3,4,5,6] });
      save(m, function (doc) {
        assert.equal(4, doc.arr.length);
        doc.arr.set(2, 10);
        assert.equal(4, doc.arr.length);
        assert.equal(10, doc.arr[2]);
        doc.arr.set(doc.arr.length, 11);
        assert.equal(5, doc.arr.length);
        assert.equal(11, doc.arr[4]);

        save(doc, function ( doc) {
          assert.equal(5, doc.arr.length);
          assert.equal(3, doc.arr[0]);
          assert.equal(4, doc.arr[1]);
          assert.equal(10, doc.arr[2]);
          assert.equal(6, doc.arr[3]);
          assert.equal(11, doc.arr[4]);

          // casting + setting beyond current array length
          doc.arr.set(8, "1");
          assert.equal(9, doc.arr.length);
          assert.strictEqual(1, doc.arr[8]);
          assert.equal(undefined, doc.arr[7]);

          save(doc, function ( doc) {
            assert.equal(9, doc.arr.length);
            assert.equal(3, doc.arr[0]);
            assert.equal(4, doc.arr[1]);
            assert.equal(10, doc.arr[2]);
            assert.equal(6, doc.arr[3]);
            assert.equal(11, doc.arr[4]);
            assert.equal(null, doc.arr[5]);
            assert.equal(null, doc.arr[6]);
            assert.equal(null, doc.arr[7]);
            assert.strictEqual(1, doc.arr[8]);
            done();
          })
        });
      });
    });

    it('works with strings', function(done){
      var m = S.add({ arr: [3,4,5,6] });
      save(m, function (doc) {
        assert.equal('4', doc.arr.length);
        doc.arr.set(2, 10);
        assert.equal(4, doc.arr.length);
        assert.equal('10', doc.arr[2]);
        doc.arr.set(doc.arr.length, '11');
        assert.equal(5, doc.arr.length);
        assert.equal('11', doc.arr[4]);

        save(doc, function (doc) {
          assert.equal(5, doc.arr.length);
          assert.equal('3', doc.arr[0]);
          assert.equal('4', doc.arr[1]);
          assert.equal('10', doc.arr[2]);
          assert.equal('6', doc.arr[3]);
          assert.equal('11', doc.arr[4]);

          // casting + setting beyond current array length
          doc.arr.set(8, "yo");
          assert.equal(9, doc.arr.length);
          assert.strictEqual("yo", doc.arr[8]);
          assert.equal(undefined, doc.arr[7]);

          save(doc, function (doc) {
            assert.equal('9', doc.arr.length);
            assert.equal('3', doc.arr[0]);
            assert.equal('4', doc.arr[1]);
            assert.equal('10', doc.arr[2]);
            assert.equal('6', doc.arr[3]);
            assert.equal('11', doc.arr[4]);
            assert.equal(null, doc.arr[5]);
            assert.equal(null, doc.arr[6]);
            assert.equal(null, doc.arr[7]);
            assert.strictEqual('yo', doc.arr[8]);
            done();
          })
        });
      });
    });

    it('works with mixed', function(done){
      var m = M.add({ arr: [3,{x:1},'yes', [5]] });
      save(m, function (doc) {
        assert.equal(4, doc.arr.length);
        doc.arr.set(2, null);
        assert.equal(4, doc.arr.length);
        assert.equal(null, doc.arr[2]);
        doc.arr.set(doc.arr.length, "last");
        assert.equal(5, doc.arr.length);
        assert.equal("last", doc.arr[4]);

        save(doc, function (doc) {
          assert.equal(5, doc.arr.length);
          assert.equal(3, doc.arr[0]);
          assert.strictEqual(1, doc.arr[1].x);
          assert.equal(null, doc.arr[2]);
          assert.ok(Array.isArray(doc.arr[3]));
          assert.equal(5, doc.arr[3][0]);
          assert.equal("last", doc.arr[4]);

          doc.arr.set(8, Infinity);
          assert.equal(9, doc.arr.length);
          assert.strictEqual(Infinity, doc.arr[8]);
          assert.equal(undefined, doc.arr[7]);
          assert.equal(9, doc.arr.length);

          save(doc, function (doc) {
            assert.equal(9, doc.arr.length);
            assert.equal(3, doc.arr[0]);
            assert.strictEqual(1, doc.arr[1].x);
            assert.equal(null, doc.arr[2]);
            assert.ok(Array.isArray(doc.arr[3]));
            assert.equal(5, doc.arr[3][0]);
            assert.equal("last", doc.arr[4]);

            assert.strictEqual(undefined, doc.arr[5]);
            assert.strictEqual(undefined, doc.arr[6]);
            assert.strictEqual(undefined, doc.arr[7]);
            assert.strictEqual(Infinity, doc.arr[8]);

            done();
          })
        });
      });
    });

    it('works with sub-docs', function(done){
      var m = D.add({ arr: [{name:'aaron'}, {name:'moombahton '}] });
      save(m, function (doc) {
        assert.equal(2, doc.arr.length);
        doc.arr.set(0, {name:'vdrums'});
        assert.equal(2, doc.arr.length);
        assert.equal('vdrums', doc.arr[0].name);
        doc.arr.set(doc.arr.length, {name:"Restrepo"});
        assert.equal(3, doc.arr.length);
        assert.equal("Restrepo", doc.arr[2].name);

        save(doc, function (doc) {
          // validate
          assert.equal(3, doc.arr.length);
          assert.equal('vdrums', doc.arr[0].name);
          assert.equal("moombahton ", doc.arr[1].name);
          assert.equal("Restrepo", doc.arr[2].name);

          doc.arr.set(10, { name: 'temple of doom' })
          assert.equal(11, doc.arr.length);
          assert.equal('temple of doom', doc.arr[10].name);
          assert.equal(null, doc.arr[9]);

          save(doc, function (doc) {
            // validate
            assert.equal(11, doc.arr.length);
            assert.equal('vdrums', doc.arr[0].name);
            assert.equal("moombahton ", doc.arr[1].name);
            assert.equal("Restrepo", doc.arr[2].name);
            assert.equal(null, doc.arr[3]);
            assert.equal(null, doc.arr[9]);
            assert.equal('temple of doom', doc.arr[10].name);

            doc.arr.remove(doc.arr[0]);
            doc.arr.set(7, { name: 7 })
            assert.strictEqual("7", doc.arr[7].name);
            assert.equal(10, doc.arr.length);

            save(doc, function (doc) {
              assert.equal(10, doc.arr.length);
              assert.equal("moombahton ", doc.arr[0].name);
              assert.equal("Restrepo", doc.arr[1].name);
              assert.equal(null, doc.arr[2]);
              assert.ok(doc.arr[7]);
              assert.strictEqual("7", doc.arr[7].name);
              assert.equal(null, doc.arr[8]);
              assert.equal('temple of doom', doc.arr[9].name);

              done();

            });
          });

        });
      });
    });
  });

  describe('setting a doc array', function(){
    it('should adjust path positions', function(done){
      var D = storage.createCollection('subDocPositions', new Schema({
          em1: [new Schema({ name: String })]
      }));

      var d = D.add({
          em1: [
              { name: 'pos0' }
            , { name: 'pos1' }
            , { name: 'pos2' }
          ]
      });

      d.save(function (d) {
        var n = d.em1.slice();
        n[2].name = 'position two';
        var x = [];
        x[1] = n[2];
        x[2] = n[1];
        x = x.filter(Boolean);
        d.em1 = x;

        d.save(function (d) {
          assert.equal(d.em1[0].name,'position two');
          assert.equal(d.em1[1].name,'pos1');
          done();
        });
      });
    });
  });

  describe('paths with similar names', function(){
    it('should be saved', function(done){
      var D = storage.createCollection('similarPathNames', new Schema({
          account: {
              role: String
            , roles: [String]
          }
        , em: [new Schema({ name: String })]
      }));

      var d = D.add({
          account: { role: 'teacher', roles: ['teacher', 'admin'] }
        , em: [{ name: 'bob' }]
      });

      d.save(function (d) {
        d.account.role = 'president';
        d.account.roles = ['president', 'janitor'];
        d.em[0].name = 'memorable';
        d.em = [{ name: 'frida' }];

        d.save(function (d) {
          assert.equal(d.account.role,'president');
          assert.equal(d.account.roles.length, 2);
          assert.equal(d.account.roles[0], 'president');
          assert.equal(d.account.roles[1], 'janitor');
          assert.equal(d.em.length, 1);
          assert.equal(d.em[0].name, 'frida');
          done();
        });
      });
    });
  });

  describe('of number', function(){
    it('allows nulls', function(done){
      var schema = new Schema({ x: [Number] });
      var M = storage.createCollection('nullsareallowed', schema);
      var m;

      m = M.add({ x: [1, null, 3] });
      m.save(function () {
        // undefined is not allowed
        m = M.add({ x: [1, undefined, 3] });
        m.save( true ).fail(function (err) {
          assert.ok(err);
          done();
        });
      });
    })
  });

  it('modifying subdoc props and manipulating the array works (gh-842)', function(done){
    var schema = new Schema({ em: [new Schema({ username: String })]});
    var M = storage.createCollection('modifyingSubDocAndPushing', schema);
    var m = M.add({ em: [ { username: 'Arrietty' }]});

    m.save(function (m) {
      assert.equal(m.em[0].username, 'Arrietty');

      m.em[0].username = 'Shawn';
      m.em.push({ username: 'Homily' });
      m.save(function (m) {
        assert.equal(m.em.length, 2);
        assert.equal(m.em[0].username, 'Shawn');
        assert.equal(m.em[1].username, 'Homily');

        m.em[0].username = 'Arrietty';
        m.em[1].remove();
        m.save(function (m) {
          assert.equal(m.em.length, 1);
          assert.equal(m.em[0].username, 'Arrietty');
          done();
        });
      });
    });
  });

  it('pushing top level arrays and subarrays works (gh-1073)', function(done){
    var schema = new Schema({ em: [new Schema({ sub: [String] })]});
    var M = storage.createCollection('gh1073', schema);
    var m = M.add({ em: [ { sub: [] }]});
    m.save(function (m) {
      m.em[m.em.length-1].sub.push("a");
      m.em.push({ sub: [] });

      assert.equal(2, m.em.length);
      assert.equal(1, m.em[0].sub.length);

      m.save(function (m) {
        assert.equal(2, m.em.length);
        assert.equal(1, m.em[0].sub.length);
        assert.equal('a', m.em[0].sub[0]);
        done();
      });
    });
  });

  describe('default type', function(){
    it('casts to Mixed', function(done){
      var DefaultArraySchema = new Schema({
            num1: Array,
            num2: []
          });

      var DefaultArray = storage.createCollection('DefaultArraySchema', DefaultArraySchema);
      var arr = DefaultArray.add();

      assert.equal(arr.get('num1').length, 0);
      assert.equal(arr.get('num2').length, 0);

      var threw1 = false
        , threw2 = false;

      try {
        arr.num1.push({ x: 1 })
        arr.num1.push(9)
        arr.num1.push("woah")
      } catch (err) {
        threw1 = true;
      }

      assert.equal(threw1, false);

      try {
        arr.num2.push({ x: 1 })
        arr.num2.push(9)
        arr.num2.push("woah")
      } catch (err) {
        threw2 = true;
      }

      assert.equal(threw2, false);
      done();
    });
  });

  describe('removing from an array atomically using StorageArray#remove', function(){
    var B;

    before(function(done){
      var schema = Schema({
          numbers: ['number']
        , numberIds: [{ _id: 'number', name: 'string' }]
        , stringIds: [{ _id: 'string', name: 'string' }]
        , oidIds:    [{ name: 'string' }]
      });

      B = storage.createCollection('BlogPost', schema);
      done();
    });

    it('works', function(done){
      var post = B.add();
      post.numbers.push(1, 2, 3);

      post.save(function (doc) {
        doc.numbers.remove('1');
        doc.save(function (doc) {
          assert.equal(doc.numbers.length, 2);
          doc.numbers.remove('2', '3');

          doc.save(function (doc) {
            assert.equal(0, doc.numbers.length);
            done();
          });
        });
      });
    });

    describe('with subdocs', function(){
      function docs (arr) {
        return arr.map(function (val) {
          return { _id: val }
        });
      }

      it('supports passing strings', function(done){
        var post = B.add({ stringIds: docs('a b c d'.split(' ')) });
        post.save(function (post) {
          post.stringIds.remove('b');
          post.save(function (post) {
            assert.equal(3, post.stringIds.length);
            assert.ok(!post.stringIds.id('b'));
            done();
          });
        });
      });

      it('supports passing numbers', function(done){
        var post = B.add({ numberIds: docs([1,2,3,4]) });
        post.save(function (post) {
          post.numberIds.remove(2,4);
          post.save(function (post) {
            assert.equal(2, post.numberIds.length);
            assert.ok(!post.numberIds.id(2));
            assert.ok(!post.numberIds.id(4));
            done();
          });
        });
      });

      it('supports passing objectids', function(done){
        var OID = storage.Types.ObjectId;
        var a = new OID;
        var b = new OID;
        var c = new OID;
        var post = B.add({ oidIds: docs([a,b,c]) });
        post.save(function (post) {
          post.oidIds.remove(a,c);
          post.save(function (post) {
            assert.equal(1, post.oidIds.length);
            assert.ok(!post.oidIds.id(a));
            assert.ok(!post.oidIds.id(c));
            done();
          });
        });
      });
    });
  });
});

