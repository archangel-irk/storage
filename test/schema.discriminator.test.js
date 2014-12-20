/* jshint strict: false */
/* global describe, before, it */
/**
 * Module dependencies.
 */
var
  Schema = storage.Schema,
  utils = storage.utils,
  random = utils.random;

var
  clone = utils.clone,
  Document = storage.Document;

/**
 * Setup
 */
var PersonSchema = new Schema('Person', {
  name: { first: String, last: String },
  gender: String
});

PersonSchema.methods.getFullName = function() {
  return this.name.first + ' ' + this.name.last;
};
PersonSchema.statics.findByGender = function(gender, cb) {};
PersonSchema.virtual('name.full').get(function () {
  return this.name.first + ' ' + this.name.last;
});
PersonSchema.virtual('name.full').set(function (name) {
  var split = name.split(' ');
  this.name.first = split[0];
  this.name.last = split[1];
});
PersonSchema.path('gender').validate(function(value) {
  return /[A-Z]/.test(value);
}, 'Invalid name');
PersonSchema.post('save', function (next) {
  next();
});
PersonSchema.set('toObject', { getters: true, virtuals: true });
PersonSchema.set('toJSON',   { getters: true, virtuals: true });

var EmployeeSchema = new Schema('Employee', PersonSchema, { department: String });
EmployeeSchema.methods.getDepartment = function() {
  return this.department;
};
EmployeeSchema.statics.findByDepartment = function(department, cb) {};
EmployeeSchema.path('department').validate(function(value) {
  return /[a-zA-Z]/.test(value);
}, 'Invalid name');
var employeeSchemaPreSaveFn = function (next) {
  next();
};
EmployeeSchema.pre('save', employeeSchemaPreSaveFn);
EmployeeSchema.set('toObject', { getters: true, virtuals: false });
EmployeeSchema.set('toJSON',   { getters: false, virtuals: true });

describe('schema', function() {
  describe('discriminator()', function() {
    var personCollection, employeeCollection;
    var person, employee;

    before(function(){
      personCollection = storage.createCollection('model-discriminator-person', PersonSchema);
      employeeCollection = storage.createCollection('model-discriminator-employee', EmployeeSchema);

      person = personCollection.add();
      employee = employeeCollection.add();
    });

    it('model defaults without discriminator', function(done) {
      var schemaDefaults = new Schema();
      assert.equal(schemaDefaults.discriminators, undefined);
      done();
    });

    it('can define static and instance methods', function(done) {
      var PersonSchema = new Schema('Person' + Math.random(), {
        name: String,
        createdAt: Date
      });

      var BossSchema = new Schema('Boss' + Math.random(), PersonSchema, { department: String });
      BossSchema.methods.myName = function(){
        return this.name;
      };
      BossSchema.statics.currentPresident = function(){
        return 'Putin';
      };

      var boss = new Document({name:'Bernenke'}, BossSchema);

      assert.equal(boss.myName(), 'Bernenke');
      assert.equal(boss.notInstanceMethod, undefined);
      assert.equal(boss.currentPresident(), 'Putin');
      assert.equal(boss.notStaticMethod, undefined);
      done();
    });

    it('call discriminator method directly', function(done) {
      var PersonSchema = new Schema('Person' + Math.random(), {
        name: String,
        createdAt: Date
      });

      var BossSchema = new Schema('Boss' + Math.random(), { department: String });
      BossSchema.methods.myName = function(){
        return this.name;
      };
      BossSchema.statics.currentPresident = function(){
        return 'Putin';
      };

      PersonSchema.discriminator( BossSchema.name, BossSchema );

      var boss = new Document({name:'Bernenke'}, BossSchema);

      assert.equal(boss.myName(), 'Bernenke');
      assert.equal(boss.notInstanceMethod, undefined);
      assert.equal(boss.currentPresident(), 'Putin');
      assert.equal(boss.notStaticMethod, undefined);
      done();
    });

    it('sets schema root discriminator mapping', function(done) {
      assert.deepEqual(PersonSchema.discriminatorMapping, { key: '__t', value: null, isRoot: true });
      done();
    });

    it('sets schema discriminator type mapping', function(done) {
      assert.deepEqual(EmployeeSchema.discriminatorMapping, { key: '__t', value: 'Employee', isRoot: false });
      done();
    });

    it('adds discriminatorKey to schema with default as name', function(done) {
      var type = EmployeeSchema.paths.__t;
      assert.equal(type.options.type, String);
      assert.equal(type.options.default, 'Employee');
      done();
    });

    it('adds discriminator to Schema.discriminators object', function(done) {
      assert.equal(Object.keys(PersonSchema.discriminators).length, 1);
      assert.equal(PersonSchema.discriminators.Employee, EmployeeSchema);

      var newName = 'model-discriminator-' + random();
      var newDiscriminatorSchema = new Schema( newName, PersonSchema );

      assert.equal(Object.keys(PersonSchema.discriminators).length, 2);
      assert.equal(PersonSchema.discriminators[newName], newDiscriminatorSchema);
      done();
    });

    it('throws error on invalid schema', function(done) {
      assert.throws(
        function() {
          PersonSchema.discriminator('Foo');
        },
        /You must pass a valid discriminator Schema/
      );
      done();
    });

    it('throws error when attempting to nest discriminators', function(done) {
      assert.throws(
        function() {
          EmployeeSchema.discriminator('model-discriminator-foo', new Schema());
        },
        /Discriminator "model-discriminator-foo" can only be a discriminator of the root model/
      );
      done();
    });

    it('throws error when discriminator has mapped discriminator key in schema', function(done) {
      assert.throws(
        function() {
          PersonSchema.discriminator('model-discriminator-foo', new Schema({ __t: String }));
        },
        /Discriminator "model-discriminator-foo" cannot have field with name "__t"/
      );
      done();
    });

    it('throws error when discriminator has mapped discriminator key in schema with discriminatorKey option set', function(done) {
      assert.throws(
        function() {
          var FooSchema = new Schema('model-discriminator-'+random(), {}, { discriminatorKey: '_type' });
          FooSchema.discriminator('model-discriminator-bar', new Schema({ _type: String }));
        },
        /Discriminator "model-discriminator-bar" cannot have field with name "_type"/
      );
      done();
    });

    it('throws error when discriminator with taken name is added', function(done) {
      var Foo = new Schema('model-discriminator-'+random(), {});
      Foo.discriminator('model-discriminator-taken', new Schema());
      assert.throws(
        function() {
          Foo.discriminator('model-discriminator-taken', new Schema());
        },
        /Discriminator with name "model-discriminator-taken" already exists/
      );
      done();
    });

    describe('options', function() {
      it('allows toObject to be overridden', function(done) {
        assert.notDeepEqual(EmployeeSchema.get('toObject'), PersonSchema.get('toObject'));
        assert.deepEqual(EmployeeSchema.get('toObject'), { getters: true, virtuals: false });
        done();
      });

      it('allows toJSON to be overridden', function(done) {
        assert.notDeepEqual(EmployeeSchema.get('toJSON'), PersonSchema.get('toJSON'));
        assert.deepEqual(EmployeeSchema.get('toJSON'), { getters: false, virtuals: true });
        done();
      });

      it('is not customizable', function(done) {
        var errorMessage
          , CustomizedSchema = new Schema({}, { capped: true });
        try {
          PersonSchema.discriminator('model-discriminator-custom', CustomizedSchema);
        } catch (e) {
          errorMessage = e.message;
        }

        assert.equal(errorMessage, 'Discriminator options are not customizable (except toJSON & toObject)');
        done();
      });
    });

    describe('root schema inheritance', function() {
      it('inherits field mappings', function(done) {
        assert.deepEqual(EmployeeSchema.path('name'), PersonSchema.path('name')); // is undefined
        assert.strictEqual(EmployeeSchema.path('gender'), PersonSchema.path('gender'));
        assert.equal(PersonSchema.paths.department, undefined);
        done();
      });

      it('inherits validators', function(done) {
        assert.deepEqual(EmployeeSchema.path('gender').validators, PersonSchema.path('gender').validators);
        assert.deepEqual(EmployeeSchema.path('department').validators, EmployeeSchema.path('department').validators);
        done();
      });

      it('does not inherit and override fields that exist', function(done) {
        var FemaleSchema = new Schema({ gender: { type: String, default: 'F' }})
          , Female = PersonSchema.discriminator('model-discriminator-female', FemaleSchema);

        var gender = Female.paths.gender;

        assert.notStrictEqual(gender, PersonSchema.paths.gender);
        assert.equal(gender.instance, 'String');
        assert.equal(gender.options.default, 'F');
        done();
      });

      it('inherits methods', function(done) {
        assert.strictEqual(EmployeeSchema.methods.getFullName, PersonSchema.methods.getFullName);
        assert.strictEqual(employee.getFullName, PersonSchema.methods.getFullName);
        assert.strictEqual(employee.getDepartment, EmployeeSchema.methods.getDepartment);
        assert.equal( person.getDepartment, undefined);
        done();
      });

      it('inherits statics', function(done) {
        assert.strictEqual(employee.findByGender, EmployeeSchema.statics.findByGender);
        assert.strictEqual(employee.findByDepartment, EmployeeSchema.statics.findByDepartment);
        assert.equal(person.findByDepartment, undefined);
        done();
      });

      it('inherits virtual (g.s)etters', function(done) {
        var employee = employeeCollection.add();
        employee.name.full = 'John Doe';
        assert.equal(employee.name.full, 'John Doe');
        done();
      });

      it('merges callQueue with base queue defined before discriminator types callQueue', function(done) {
        assert.equal(EmployeeSchema.callQueue.length, 2);
        // PersonSchema.post('save')
        assert.strictEqual(EmployeeSchema.callQueue[0], PersonSchema.callQueue[0]);

        // EmployeeSchema.pre('save')
        assert.strictEqual(EmployeeSchema.callQueue[1][0], 'pre');
        assert.strictEqual(EmployeeSchema.callQueue[1][1]['0'], 'save');
        assert.strictEqual(EmployeeSchema.callQueue[1][1]['1'], employeeSchemaPreSaveFn);
        done();
      });

      it('gets options overridden by root options except toJSON and toObject', function(done) {
        var personOptions = clone(person.schema.options)
          , employeeOptions = clone(employee.schema.options);

        delete personOptions.toJSON;
        delete personOptions.toObject;
        delete employeeOptions.toJSON;
        delete employeeOptions.toObject;

        assert.deepEqual(personOptions, employeeOptions);
        done();
      });
    });
  });
});