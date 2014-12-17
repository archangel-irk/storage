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
    var a = new StorageArray();

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

      [tobi, loki, jane].forEach(function(pet){
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
      a.save(function( docObj ){
        assert.ok( docObj._id );
        assert.equal( docObj.numbers.length, 4 );
        assert.equal( docObj.numbers[0], 4 );
        assert.equal( docObj.numbers[1], 5 );
        assert.equal( docObj.numbers[2], 6 );
        assert.equal( docObj.numbers[3], 7 );

        var removed = a.numbers.splice(1, 1, '10');
        assert.deepEqual(removed, [5]);
        assert.equal('number', typeof a.numbers[1]);
        assert.deepEqual(a.numbers.toObject(),[4,10,6,7]);

        a.save(function( doc1Obj ){
          assert.equal( doc1Obj._id, undefined );
          assert.equal( doc1Obj.numbers.length, 4 );
          assert.equal( doc1Obj.numbers[0], 4 );
          assert.equal( doc1Obj.numbers[1], 10 );
          assert.equal( doc1Obj.numbers[2], 6 );
          assert.equal( doc1Obj.numbers[3], 7 );

          done();
        });
      });
    });

    it('on embedded docs', function(done){
      var schema = new Schema({ types: [new Schema({ type: String }) ]})
        , A = storage.createCollection('splicetestEmbeddedDoc', schema );

      var a = A.add({ types: [{type:'bird'},{type:'boy'},{type:'frog'},{type:'cloud'}] });
      a.save(function( docObj ){
        assert.equal( docObj.types[0].type, 'bird' );
        assert.equal( docObj.types[1].type, 'boy' );
        assert.equal( docObj.types[2].type, 'frog' );
        assert.equal( docObj.types[3].type, 'cloud' );

        var removed = a.types.splice(1, 1);
        assert.equal(removed.length,1);
        assert.equal(removed[0].type,'boy');

        var obj = a.types.toObject();
        assert.equal(obj.length, 3);
        assert.equal(obj[0].type,'bird');
        assert.equal(obj[1].type,'frog');
        assert.equal(obj[2].type,'cloud');

        a.save(function( doc1Obj ){
          assert.equal(doc1Obj.types.length, 3);
          assert.equal(doc1Obj.types[0].type,'bird');
          assert.equal(doc1Obj.types[1].type,'frog');
          assert.equal(doc1Obj.types[2].type,'cloud');

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

      a.save(function( docObj ){
        assert.equal( docObj.strs.length, 3 );
        assert.equal( docObj.strs[0], 'one' );
        assert.equal( docObj.strs[1], 'two' );
        assert.equal( docObj.strs[2], 'three' );
        assert.equal( docObj.nums.length, 3 );
        assert.equal( docObj.nums[0], 1 );
        assert.equal( docObj.nums[1], 2 );
        assert.equal( docObj.nums[2], 3 );
        assert.equal( docObj.types.length, 4 );
        assert.equal( docObj.types[0].type, 'bird' );
        assert.equal( docObj.types[1].type, 'boy' );
        assert.equal( docObj.types[2].type, 'frog' );
        assert.equal( docObj.types[3].type, 'cloud' );

        var tlen = a.types.unshift({type:'tree'});
        var nlen = a.nums.unshift(0);
        var slen = a.strs.unshift('zero');

        assert.equal(tlen,5);
        assert.equal(nlen,4);
        assert.equal(slen,4);

        a.types.push({type:'worm'});
        var obj = a.types.toObject();
        assert.equal(obj[0].type,'tree');
        assert.equal(obj[1].type,'bird');
        assert.equal(obj[2].type,'boy');
        assert.equal(obj[3].type,'frog');
        assert.equal(obj[4].type,'cloud');
        assert.equal(obj[5].type,'worm');

        obj = a.nums.toObject();
        assert.equal(obj[0].valueOf(),0);
        assert.equal(obj[1].valueOf(),1);
        assert.equal(obj[2].valueOf(),2);
        assert.equal(obj[3].valueOf(),3);

        obj = a.strs.toObject();
        assert.equal(obj[0],'zero');
        assert.equal(obj[1],'one');
        assert.equal(obj[2],'two');
        assert.equal(obj[3],'three');

        a.save(function( doc1Obj ){
          assert.equal( doc1Obj.strs.length, 4 );
          assert.equal( doc1Obj.strs[0], 'zero' );
          assert.equal( doc1Obj.strs[1], 'one' );
          assert.equal( doc1Obj.strs[2], 'two' );
          assert.equal( doc1Obj.strs[3], 'three' );
          assert.equal( doc1Obj.nums.length, 4 );
          assert.equal( doc1Obj.nums[0], 0 );
          assert.equal( doc1Obj.nums[1], 1 );
          assert.equal( doc1Obj.nums[2], 2 );
          assert.equal( doc1Obj.nums[3], 3 );
          assert.equal( doc1Obj.types.length, 6 );
          assert.equal( doc1Obj.types[0].type,'tree');
          assert.equal( doc1Obj.types[1].type,'bird');
          assert.equal( doc1Obj.types[2].type,'boy');
          assert.equal( doc1Obj.types[3].type,'frog');
          assert.equal( doc1Obj.types[4].type,'cloud');
          assert.equal( doc1Obj.types[5].type,'worm');

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

      a.save(function( docObj ){
        assert.equal( docObj.strs.length, 3 );
        assert.equal( docObj.strs[0], 'one' );
        assert.equal( docObj.strs[1], 'two' );
        assert.equal( docObj.strs[2], 'three' );
        assert.equal( docObj.nums.length, 3 );
        assert.equal( docObj.nums[0], 1 );
        assert.equal( docObj.nums[1], 2 );
        assert.equal( docObj.nums[2], 3 );
        assert.equal( docObj.types.length, 4 );
        assert.equal( docObj.types[0].type, 'bird' );
        assert.equal( docObj.types[1].type, 'boy' );
        assert.equal( docObj.types[2].type, 'frog' );
        assert.equal( docObj.types[3].type, 'cloud' );

        var t = a.types.shift();
        var n = a.nums.shift();
        var s = a.strs.shift();

        assert.equal(t.type,'bird');
        assert.equal(n,1);
        assert.equal(s,'one');

        var obj = a.types.toObject();
        assert.equal(obj[0].type,'boy');
        assert.equal(obj[1].type,'frog');
        assert.equal(obj[2].type,'cloud');

        a.nums.push(4);
        obj = a.nums.toObject();
        assert.equal(2, obj[0].valueOf());
        assert.equal(obj[1].valueOf(),3);
        assert.equal(obj[2].valueOf(),4);

        obj = a.strs.toObject();
        assert.equal(obj[0],'two');
        assert.equal(obj[1],'three');

        a.save(function( doc1Obj ){
          assert.equal( doc1Obj.strs.length, 2 );
          assert.equal( doc1Obj.strs[0], 'two' );
          assert.equal( doc1Obj.strs[1], 'three' );
          assert.equal( doc1Obj.nums.length, 3 );
          assert.equal( doc1Obj.nums[0], 2 );
          assert.equal( doc1Obj.nums[1], 3 );
          assert.equal( doc1Obj.nums[2], 4 );
          assert.equal( doc1Obj.types.length, 3 );
          assert.equal( doc1Obj.types[0].type, 'boy' );
          assert.equal( doc1Obj.types[1].type, 'frog' );
          assert.equal( doc1Obj.types[2].type, 'cloud' );

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

      a.save(function( docObj ){
        assert.equal( docObj.strs.length, 3 );
        assert.equal( docObj.strs[0], 'one' );
        assert.equal( docObj.strs[1], 'two' );
        assert.equal( docObj.strs[2], 'three' );
        assert.equal( docObj.nums.length, 3 );
        assert.equal( docObj.nums[0], 1 );
        assert.equal( docObj.nums[1], 2 );
        assert.equal( docObj.nums[2], 3 );
        assert.equal( docObj.types.length, 4 );
        assert.equal( docObj.types[0].type, 'bird' );
        assert.equal( docObj.types[1].type, 'boy' );
        assert.equal( docObj.types[2].type, 'frog' );
        assert.equal( docObj.types[3].type, 'cloud' );

        var t = a.types.pop();
        var n = a.nums.pop();
        var s = a.strs.pop();

        assert.equal(t.type,'cloud');
        assert.equal(n,3);
        assert.equal(s,'three');

        var obj = a.types.toObject();
        assert.equal(obj[0].type,'bird');
        assert.equal(obj[1].type,'boy');
        assert.equal(obj[2].type,'frog');

        a.nums.push(4);
        obj = a.nums.toObject();
        assert.equal(obj[0].valueOf(),1);
        assert.equal(obj[1].valueOf(),2);
        assert.equal(obj[2].valueOf(),4);

        obj = a.strs.toObject();
        assert.equal(obj[0],'one');
        assert.equal(obj[1],'two');

        a.save(function( doc1Obj ){
          assert.equal( doc1Obj.strs.length, 2 );
          assert.equal( doc1Obj.strs[0], 'one' );
          assert.equal( doc1Obj.strs[1], 'two' );
          assert.equal( doc1Obj.nums.length, 3 );
          assert.equal( doc1Obj.nums[0], 1 );
          assert.equal( doc1Obj.nums[1], 2 );
          assert.equal( doc1Obj.nums[2], 4 );
          assert.equal( doc1Obj.types.length, 3 );
          assert.equal( doc1Obj.types[0].type, 'bird' );
          assert.equal( doc1Obj.types[1].type, 'boy' );
          assert.equal( doc1Obj.types[2].type, 'frog' );

          done();
        });
      });
    });
  });

  describe('pull()', function(){
    it('works', function( done ){
      var catSchema = new Schema({ name: String });
      var Cat = storage.createCollection('Cat', catSchema);
      var schema = new Schema({
          a: [{ type: Schema.ObjectId, ref: 'Cat' }]
      });
      var A = storage.createCollection('TestPull', schema);
      var cat  = Cat.add({ name: 'peanut' });

      cat.save(function( catObj ){
        var a = A.add({ a: [ catObj._id ] });

        a.save(function( docObj ){
          assert.equal(1, docObj.a.length);

          a.a.pull( cat.id );
          assert.equal(a.a.length,0);

          done();
        });
      });
    });
  });

  describe('addToSet()', function(){
    it('works', function( done ){
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

      var d1 = new Date();
      var d2 = new Date( +d1 + 60000);
      var d3 = new Date( +d1 + 30000);
      var d4 = new Date( +d1 + 20000);
      var d5 = new Date( +d1 + 90000);
      var d6 = new Date( +d1 + 10000);
      doc.date.push(d1, d2);

      var id1 = new storage.Types.ObjectId();
      var id2 = new storage.Types.ObjectId();
      var id3 = new storage.Types.ObjectId();
      var id4 = new storage.Types.ObjectId();
      var id5 = new storage.Types.ObjectId();
      var id6 = new storage.Types.ObjectId();

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

      doc.save(function( docObj ){
        assert.equal(docObj.num.length,5);
        assert.ok(docObj.num.indexOf(1) === 0);
        assert.ok(docObj.num.indexOf(2) === 1);
        assert.ok(docObj.num.indexOf(3) === 2);
        assert.ok(docObj.num.indexOf(4) === 3);
        assert.ok(docObj.num.indexOf(5) === 4);

        assert.equal(docObj.str.length,5);
        assert.ok(docObj.str.indexOf('one') === 0);
        assert.ok(docObj.str.indexOf('two') === 1);
        assert.ok(docObj.str.indexOf('tres') === 2);
        assert.ok(docObj.str.indexOf('four') === 3);
        assert.ok(docObj.str.indexOf('five') === 4);

        assert.equal(docObj.id.length, 3);
        assert.ok(docObj.id.indexOf(id1.toString()) === 0);
        assert.ok(docObj.id.indexOf(id2.toString()) === 1);
        assert.ok(docObj.id.indexOf(id3.toString()) === 2);

        assert.equal(docObj.date.length, 3);
        assert.ok(docObj.date[ 0 ].toString() === d1.toString());
        assert.ok(docObj.date[ 1 ].toString() === d2.toString());
        assert.ok(docObj.date[ 2 ].toString() === d3.toString());

        assert.equal(docObj.doc.length, 3);
        assert.ok(docObj.doc.some(function(v){return v.name === 'Waltz';}));
        assert.ok(docObj.doc.some(function(v){return v.name === 'Dubstep';}));
        assert.ok(docObj.doc.some(function(v){return v.name === 'Polka';}));

        // test single $addToSet
        doc.num.addToSet( 3, 4, 5, 6 );
        assert.equal(doc.num.length, 6);
        doc.str.addToSet('four', 'five', 'two', 'six');
        assert.equal(doc.str.length, 6);
        doc.id.addToSet(id2, id3, id4);
        assert.equal(doc.id.length, 4);

        doc.date.addToSet(d1, d3, d4);
        assert.equal(doc.date.length, 4);

        doc.doc.addToSet(doc.doc[0], { name: '8bit' });
        assert.equal(doc.doc.length, 4);

        doc.save(function( docObj1 ){
          assert.equal(docObj1.num.length, 6);
          assert.ok(docObj1.num.indexOf(1) === 0);
          assert.ok(docObj1.num.indexOf(2) === 1);
          assert.ok(docObj1.num.indexOf(3) === 2);
          assert.ok(docObj1.num.indexOf(4) === 3);
          assert.ok(docObj1.num.indexOf(5) === 4);
          assert.ok(docObj1.num.indexOf(6) === 5);

          assert.equal(docObj1.str.length, 6);
          assert.ok(docObj1.str.indexOf('one') === 0);
          assert.ok(docObj1.str.indexOf('two') === 1);
          assert.ok(docObj1.str.indexOf('tres') === 2);
          assert.ok(docObj1.str.indexOf('four') === 3);
          assert.ok(docObj1.str.indexOf('five') === 4);
          assert.ok(docObj1.str.indexOf('six') === 5);

          assert.equal(docObj1.id.length, 4);
          assert.ok(docObj1.id.indexOf(id1.toString()) === 0);
          assert.ok(docObj1.id.indexOf(id2.toString()) === 1);
          assert.ok(docObj1.id.indexOf(id3.toString()) === 2);
          assert.ok(docObj1.id.indexOf(id4.toString()) === 3);

          assert.equal(docObj1.date.length, 4);
          assert.ok(docObj1.date[ 0 ].toString() === d1.toString());
          assert.ok(docObj1.date[ 1 ].toString() === d2.toString());
          assert.ok(docObj1.date[ 2 ].toString() === d3.toString());
          assert.ok(docObj1.date[ 3 ].toString() === d4.toString());

          assert.equal(docObj1.doc.length, 4);
          assert.ok(docObj1.doc.some(function(v){return v.name === 'Waltz';}));
          assert.ok(docObj1.doc.some(function(v){return v.name === 'Dubstep';}));
          assert.ok(docObj1.doc.some(function(v){return v.name === 'Polka';}));
          assert.ok(docObj1.doc.some(function(v){return v.name === '8bit';}));

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

          doc.save(function( docObj2 ){
            assert.equal(docObj2.num.length, 8);
            assert.ok(docObj2.num.indexOf(1) === 0);
            assert.ok(docObj2.num.indexOf(2) === 1);
            assert.ok(docObj2.num.indexOf(3) === 2);
            assert.ok(docObj2.num.indexOf(4) === 3);
            assert.ok(docObj2.num.indexOf(5) === 4);
            assert.ok(docObj2.num.indexOf(6) === 5);
            assert.ok(docObj2.num.indexOf(7) === 6);
            assert.ok(docObj2.num.indexOf(8) === 7);

            assert.equal(docObj2.str.length,8);
            assert.ok(docObj2.str.indexOf('one') === 0);
            assert.ok(docObj2.str.indexOf('two') === 1);
            assert.ok(docObj2.str.indexOf('tres') === 2);
            assert.ok(docObj2.str.indexOf('four') === 3);
            assert.ok(docObj2.str.indexOf('five') === 4);
            assert.ok(docObj2.str.indexOf('six') === 5);
            assert.ok(docObj2.str.indexOf('seven') === 6);
            assert.ok(docObj2.str.indexOf('eight') === 7);

            assert.equal(docObj2.id.length,6);
            assert.ok(docObj2.id.indexOf(id1.toString()) === 0);
            assert.ok(docObj2.id.indexOf(id2.toString()) === 1);
            assert.ok(docObj2.id.indexOf(id3.toString()) === 2);
            assert.ok(docObj2.id.indexOf(id4.toString()) === 3);
            assert.ok(docObj2.id.indexOf(id5.toString()) === 4);
            assert.ok(docObj2.id.indexOf(id6.toString()) === 5);

            assert.equal(docObj2.date.length,6);
            assert.ok(docObj2.date[ 0 ].toString() === d1.toString());
            assert.ok(docObj2.date[ 1 ].toString() === d2.toString());
            assert.ok(docObj2.date[ 2 ].toString() === d3.toString());
            assert.ok(docObj2.date[ 3 ].toString() === d4.toString());
            assert.ok(docObj2.date[ 4 ].toString() === d5.toString());
            assert.ok(docObj2.date[ 5 ].toString() === d6.toString());

            assert.equal(docObj2.doc.length,6);
            assert.ok(docObj2.doc.some(function(v){return v.name === 'Waltz';}));
            assert.ok(docObj2.doc.some(function(v){return v.name === 'Dubstep';}));
            assert.ok(docObj2.doc.some(function(v){return v.name === 'Polka';}));
            assert.ok(docObj2.doc.some(function(v){return v.name === '8bit';}));
            assert.ok(docObj2.doc.some(function(v){return v.name === 'BigBeat';}));
            assert.ok(docObj2.doc.some(function(v){return v.name === 'Funk';}));
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
      m.save(function( mObj ){
        assert.equal(1, mObj.doc.length);
        assert.equal('Rap', mObj.doc[0].name);

        m.doc.addToSet({ name: 'House' });
        assert.equal(2, m.doc.length);

        m.save(function( mObj1 ){
          assert.equal(2, mObj1.doc.length);
          assert.ok(mObj1.doc.some(function(v) { return v.name === 'Rap'; }));
          assert.ok(mObj1.doc.some(function(v) { return v.name === 'House'; }));

          done();
        });
      });
    });
  });

  describe('sort()', function(){
    it('order should be saved', function(done){
      var M = storage.createCollection('ArraySortOrder', new Schema({ x: [Number] }));
      var m = M.add({ x: [1,4,3,2] });
      m.save(function( mObj ){
        assert.equal(1, mObj.x[0]);
        assert.equal(4, mObj.x[1]);
        assert.equal(3, mObj.x[2]);
        assert.equal(2, mObj.x[3]);

        m.x.sort();

        m.save(function( m1Obj ){

          assert.equal(1, m1Obj.x[0]);
          assert.equal(2, m1Obj.x[1]);
          assert.equal(3, m1Obj.x[2]);
          assert.equal(4, m1Obj.x[3]);

          m.x.sort(function(a,b){
            return b - a;
          });

          m.save(function( m2Obj ) {
            assert.equal(4, m2Obj.x[0]);
            assert.equal(3, m2Obj.x[1]);
            assert.equal(2, m2Obj.x[2]);
            assert.equal(1, m2Obj.x[3]);
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
      }, true);
    }

    before(function(done){
      N = storage.createCollection('arraySet', new Schema({ arr: [Number] }));
      S = storage.createCollection('arraySetString', new Schema({ arr: [String] }));
      M = storage.createCollection('arraySetMixed', new Schema({ arr: [] }));
      D = storage.createCollection('arraySetSubDocs', new Schema({ arr: [{ name: String}] }));
      done();
    });

    it('works combined with other ops', function(done){
      var m = N.add({ arr: [3,4,5,6] });
      save(m, function( docObj ){
        assert.equal(4, docObj.arr.length);
        m.arr.push(20);
        m.arr.set(2, 10);
        assert.equal(5, m.arr.length);
        assert.equal(10, m.arr[2]);
        assert.equal(20, m.arr[4]);

        save(m, function( docObj1 ){
          assert.equal(5, docObj1.arr.length);
          assert.equal(3, docObj1.arr[0]);
          assert.equal(4, docObj1.arr[1]);
          assert.equal(10, docObj1.arr[2]);
          assert.equal(6, docObj1.arr[3]);
          assert.equal(20, docObj1.arr[4]);

          m.arr.set(4, 99);
          assert.equal(5, m.arr.length);
          assert.equal(99, m.arr[4]);
          m.arr.remove(10);
          assert.equal(4, m.arr.length);
          assert.equal(3, m.arr[0]);
          assert.equal(4, m.arr[1]);
          assert.equal(6, m.arr[2]);
          assert.equal(99, m.arr[3]);

          var obj = m.toObject();
          assert.equal(4, obj.arr.length);
          assert.equal(3, obj.arr[0]);
          assert.equal(4, obj.arr[1]);
          assert.equal(6, obj.arr[2]);
          assert.equal(99, obj.arr[3]);

          save(m, function( docObj2 ){
            assert.equal(4, docObj2.arr.length);
            assert.equal(3, docObj2.arr[0]);
            assert.equal(4, docObj2.arr[1]);
            assert.equal(6, docObj2.arr[2]);
            assert.equal(99, docObj2.arr[3]);

            assert.equal( docObj2['arr.4'], undefined );
            done();
          });
        });
      });

      // after this works go back to finishing doc.populate() branch
    });

    it('works with numbers', function(done){
      var m = N.add({ arr: [3,4,5,6] });
      save(m, function( docObj ){
        assert.equal(4, docObj.arr.length);

        m.arr.set(2, 10);
        assert.equal(4, m.arr.length);
        assert.equal(10, m.arr[2]);
        m.arr.set(m.arr.length, 11);
        assert.equal(5, m.arr.length);
        assert.equal(11, m.arr[4]);

        var obj = m.toObject();
        assert.equal(5, obj.arr.length);
        assert.equal(3, obj.arr[0]);
        assert.equal(4, obj.arr[1]);
        assert.equal(10, obj.arr[2]);
        assert.equal(6, obj.arr[3]);
        assert.equal(11, obj.arr[4]);

        save(m, function( docObj1 ){
          assert.equal(docObj1['arr.2'], 10);
          assert.equal(docObj1['arr.4'],  11);

          // casting + setting beyond current array length
          m.arr.set(8, '1');
          assert.equal(9, m.arr.length);
          assert.strictEqual(1, m.arr[8]);
          assert.equal(undefined, m.arr[7]);

          var obj = m.toObject();
          assert.equal(9, obj.arr.length);
          assert.equal(3, obj.arr[0]);
          assert.equal(4, obj.arr[1]);
          assert.equal(10, obj.arr[2]);
          assert.equal(6, obj.arr[3]);
          assert.equal(11, obj.arr[4]);
          assert.equal(null, obj.arr[5]);
          assert.equal(null, obj.arr[6]);
          assert.equal(null, obj.arr[7]);
          assert.strictEqual(1, obj.arr[8]);

          save(m, function( docObj2 ){
            assert.equal(docObj2['arr.8'], 1);

            done();
          });
        });
      });
    });

    it('works with strings', function(done){
      var m = S.add({ arr: [3,4,5,6] });
      save(m, function( docObj ){
        assert.equal('4', docObj.arr.length);

        m.arr.set(2, 10);
        assert.equal(4, m.arr.length);
        assert.equal('10', m.arr[2]);
        m.arr.set(m.arr.length, '11');
        assert.equal(5, m.arr.length);
        assert.equal('11', m.arr[4]);

        var obj = m.toObject();
        assert.equal(5, obj.arr.length);
        assert.equal('3', obj.arr[0]);
        assert.equal('4', obj.arr[1]);
        assert.equal('10', obj.arr[2]);
        assert.equal('6', obj.arr[3]);
        assert.equal('11', obj.arr[4]);

        save(m, function( docObj1 ){
          assert.equal('10', docObj1['arr.2']);
          assert.equal('11', docObj1['arr.4']);

          // casting + setting beyond current array length
          m.arr.set(8, 'yo');
          assert.equal(9, m.arr.length);
          assert.strictEqual('yo', m.arr[8]);
          assert.equal(undefined, m.arr[7]);

          var obj = m.toObject();
          assert.equal('9', obj.arr.length);
          assert.equal('3', obj.arr[0]);
          assert.equal('4', obj.arr[1]);
          assert.equal('10', obj.arr[2]);
          assert.equal('6', obj.arr[3]);
          assert.equal('11', obj.arr[4]);
          assert.equal(null, obj.arr[5]);
          assert.equal(null, obj.arr[6]);
          assert.equal(null, obj.arr[7]);
          assert.strictEqual('yo', obj.arr[8]);

          save(m, function( docObj2 ){
            assert.strictEqual('yo', docObj2['arr.8']);

            done();
          });
        });
      });
    });

    it('works with mixed', function(done){
      var m = M.add({ arr: [3,{x:1},'yes', [5]] });
      save(m, function( docObj ){
        assert.equal(4, docObj.arr.length);

        m.arr.set(2, null);
        assert.equal(4, m.arr.length);
        assert.equal(null, m.arr[2]);
        m.arr.set(m.arr.length, 'last');
        assert.equal(5, m.arr.length);
        assert.equal('last', m.arr[4]);

        var obj = m.toObject();
        assert.equal(5, obj.arr.length);
        assert.equal(3, obj.arr[0]);
        assert.strictEqual(1, obj.arr[1].x);
        assert.equal(null, obj.arr[2]);
        assert.ok(Array.isArray(obj.arr[3]));
        assert.equal(5, obj.arr[3][0]);
        assert.equal(null, obj.arr[2]);
        assert.equal('last', obj.arr[4]);

        save(m, function( docObj1 ){
          assert.equal(null, docObj1['arr.2']);
          assert.equal('last', docObj1['arr.4']);

          m.arr.set(8, Infinity);
          assert.equal(9, m.arr.length);
          assert.strictEqual(Infinity, m.arr[8]);
          assert.equal(undefined, m.arr[7]);
          assert.equal(9, m.arr.length);

          var obj = m.toObject();
          assert.equal(9, obj.arr.length);
          assert.equal(3, obj.arr[0]);
          assert.strictEqual(1, obj.arr[1].x);
          assert.equal(null, obj.arr[2]);
          assert.ok(Array.isArray(obj.arr[3]));
          assert.equal(5, obj.arr[3][0]);
          assert.equal('last', obj.arr[4]);

          save(m, function( docObj2 ){
            assert.strictEqual(Infinity, docObj2['arr.8']);

            done();
          });
        });
      });
    });

    it('works with sub-docs', function(done){
      var m = D.add({ arr: [{name:'aaron'}, {name:'moombahton '}] });
      save(m, function( docObj ){
        assert.equal(2, docObj.arr.length);

        m.arr.set(0, {name:'vdrums'});
        assert.equal(2, m.arr.length);
        assert.equal('vdrums', m.arr[0].name);

        m.arr.set(m.arr.length, {name:'Restrepo'});
        assert.equal(3, m.arr.length);
        assert.equal('Restrepo', m.arr[2].name);

        save(m, function( docObj1 ){
          // validate
          assert.equal(3, docObj1.arr.length);
          assert.equal('vdrums', docObj1.arr[0].name);
          assert.equal('moombahton ', docObj1.arr[1].name);
          assert.equal('Restrepo', docObj1.arr[2].name);

          m.arr.set(10, { name: 'temple of doom' });
          assert.equal(11, m.arr.length);
          assert.equal('temple of doom', m.arr[10].name);
          assert.equal(null, m.arr[9]);

          save(m, function( docObj2 ){
            // validate
            assert.equal(11, docObj2.arr.length);
            assert.equal('vdrums', docObj2.arr[0].name);
            assert.equal('moombahton ', docObj2.arr[1].name);
            assert.equal('Restrepo', docObj2.arr[2].name);
            assert.equal(null, docObj2.arr[3]);
            assert.equal(null, docObj2.arr[9]);
            assert.equal('temple of doom', docObj2.arr[10].name);

            m.arr.remove(m.arr[0]);
            m.arr.set(7, { name: 7 });
            assert.strictEqual('7', m.arr[7].name);
            assert.equal(10, m.arr.length);

            save(m, function( docObj3 ){
              assert.equal(10, docObj3.arr.length);
              assert.equal('moombahton ', docObj3.arr[0].name);
              assert.equal('Restrepo', docObj3.arr[1].name);
              assert.equal(null, docObj3.arr[2]);
              assert.ok(docObj3.arr[7]);
              assert.strictEqual('7', docObj3.arr[7].name);
              assert.equal(null, docObj3.arr[8]);
              assert.equal('temple of doom', docObj3.arr[9].name);

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

      d.save(function( dObj ){
        var n = d.em1.slice();
        n[2].name = 'position two';
        var x = [];
        x[1] = n[2];
        x[2] = n[1];
        x = x.filter(Boolean);
        d.em1 = x;

        d.save(function( dObj1 ){
          assert.equal(dObj1.em1[0].name,'position two');
          assert.equal(dObj1.em1[1].name,'pos1');

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

      d.save(function( dObj ){
        d.account.role = 'president';
        d.account.roles = ['president', 'janitor'];
        d.em[0].name = 'memorable';
        d.em = [{ name: 'frida' }];

        d.save(function( dObj1 ){
          assert.equal(dObj1['account.role'],'president');
          assert.equal(dObj1['account.roles'].length, 2);
          assert.equal(dObj1['account.roles'][0], 'president');
          assert.equal(dObj1['account.roles'][1], 'janitor');
          assert.equal(dObj1.em.length, 1);
          assert.equal(dObj1.em[0].name, 'frida');
          assert.equal(dObj1['em.0.name'], 'frida');
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
      m.save(function(){
        // undefined is not allowed
        var mNew = M.add({ x: [1, undefined, 3] });
        mNew.save( true ).fail(function (err) {
          assert.ok(err);
          done();
        });
      });
    });
  });

  it('modifying subdoc props and manipulating the array works (gh-842)', function(done){
    var schema = new Schema({ em: [new Schema({ username: String })]});
    var M = storage.createCollection('modifyingSubDocAndPushing', schema);
    var m = M.add({ em: [ { username: 'Arrietty' }]});

    m.save(function( mObj ){
      assert.equal(mObj.em[0].username, 'Arrietty');

      m.em[0].username = 'Shawn';
      m.em.push({ username: 'Homily' });
      m.save(function( mObj1 ){
        assert.equal(mObj1.em.length, 2);
        assert.equal(mObj1.em[0].username, 'Shawn');
        assert.equal(mObj1.em[1].username, 'Homily');

        m.em[0].username = 'Arrietty';
        m.em[1].remove();
        m.save(function( mObj2 ){
          assert.equal(mObj2.em.length, 1);
          assert.equal(mObj2.em[0].username, 'Arrietty');
          done();
        });
      });
    });
  });

  it('pushing top level arrays and subarrays works (gh-1073)', function(done){
    var schema = new Schema({ em: [new Schema({ sub: [String] })]});
    var M = storage.createCollection('gh1073', schema);
    var m = M.add({ em: [ { sub: [] }]});
    m.save(function( mObj ){
      m.em[ m.em.length-1 ].sub.push('a');
      m.em.push({ sub: [] });

      assert.equal(2, m.em.length);
      assert.equal(1, m.em[0].sub.length);

      m.save(function( mObj1 ){
        assert.equal(2, mObj1.em.length);
        assert.equal(1, mObj1.em[0].sub.length);
        assert.equal('a', mObj1.em[0].sub[0]);
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
        arr.num1.push({ x: 1 });
        arr.num1.push(9);
        arr.num1.push('woah');
      } catch (err) {
        threw1 = true;
      }

      assert.equal(threw1, false);

      try {
        arr.num2.push({ x: 1 });
        arr.num2.push(9);
        arr.num2.push('woah');
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
      var schema = new Schema({
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

      post.save(function( docObj ){
        post.numbers.remove('1');
        post.save(function( docObj1 ){
          assert.equal( docObj1.numbers.length, 2);
          post.numbers.remove('2', '3');

          post.save(function( docObj2 ){
            assert.equal(0, docObj2.numbers.length);
            done();
          });
        });
      });
    });

    describe('with subdocs', function(){
      function docs (arr) {
        return arr.map(function (val) {
          return { _id: val };
        });
      }

      it('supports passing strings', function(done){
        var post = B.add({ stringIds: docs('a b c d'.split(' ')) });
        post.save(function( postObj ){
          post.stringIds.remove('b');

          post.save(function( postObj1 ){
            assert.equal(3, postObj1.stringIds.length);
            assert.ok(!post.stringIds.id('b'));
            done();
          });
        });
      });

      it('supports passing numbers', function(done){
        var post = B.add({ numberIds: docs([1,2,3,4]) });
        post.save(function( postObj ){
          post.numberIds.remove( 2, 4 );

          post.save(function( postObj1 ){
            assert.equal(2, postObj1.numberIds.length);
            assert.ok(!post.numberIds.id(2));
            assert.ok(!post.numberIds.id(4));
            done();
          });
        });
      });

      it('supports passing objectids', function(done){
        var OID = storage.Types.ObjectId;
        var a = new OID();
        var b = new OID();
        var c = new OID();
        var post = B.add({ oidIds: docs([a,b,c]) });
        post.save(function( postObj ){
          post.oidIds.remove(a,c);

          post.save(function( postObj1 ){
            assert.equal(1, postObj1.oidIds.length);
            assert.ok(!post.oidIds.id(a));
            assert.ok(!post.oidIds.id(c));
            done();
          });
        });
      });
    });
  });
});

