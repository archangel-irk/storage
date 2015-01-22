# Storage

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/archangel-irk/storage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/archangel-irk/storage.svg?branch=master)](https://travis-ci.org/archangel-irk/storage)
[![Sauce Test Status](https://saucelabs.com/buildstatus/archangel_irk)](https://saucelabs.com/u/archangel_irk)
[![Code Climate](https://codeclimate.com/github/archangel-irk/storage/badges/gpa.svg)](https://codeclimate.com/github/archangel-irk/storage)
[![Coverage Status](https://img.shields.io/coveralls/archangel-irk/storage.svg)](https://coveralls.io/r/archangel-irk/storage?branch=master)

Use mongoose-like schema validation, collections and documents on browser.  

The library provides the most complete compatibility with [mongoose](http://mongoosejs.com/).

[![Sauce Test Status](https://saucelabs.com/browser-matrix/archangel_irk.svg)](https://saucelabs.com/u/archangel_irk)

## Documentation
[API reference](http://archangel-irk.github.io/storage/)

## Differences from mongoose

coming soon

## Installation
Dependencies:
* lodash  

```html
<script src="lodash.js"></script>
<script src="storage.js"></script>
```

## Usage
### Defining your schema
Everything in Storage starts with a Schema. Each schema maps to a Storage collection and defines the shape of the documents within that collection.

```javascript
var userSchema = new Schema('User', {
  name: { type: String, required: true }
});

// or

var blogSchema = new Schema('Blog', {
  title:  String,
  author: String,
  body:   String,
  comments: [{ body: String, date: Date }],
  date: { type: Date, default: Date.now },
  hidden: Boolean,
  meta: {
    votes: Number,
    favs:  Number
  }
});
```

*If you want to add additional keys later, use the `Schema#add` method.*

Each key in our `blogSchema` defines a property in our documents which will be cast to its associated SchemaType. For example, we've defined a `title` which will be cast to the `String` SchemaType and `date` which will be cast to a `Date` SchemaType. Keys may also be assigned nested objects containing further key/type definitions *(e.g. the `meta` property above).*

The permitted SchemaTypes are

* String
* Number
* Date
* Buffer
* Boolean
* Mixed
* ObjectId
* Array

Schemas not only define the structure of your document and casting of properties, they also define document instance methods and static methods.

### Create a collection
```javascript
storage.createCollection('users', userSchema );
```

### Create a document
```javascript
var user = storage.users.add({name: 'Constantine'});

console.log( user.name );  // "Constantine"
```

### Create a document without collection
```javascript
var userSchema = new Schema('User', {
  name: { type: String, required: true }
});
var user = storage.Document({name: 'Constantine'}, userSchema );

console.log( user.name );  // "Constantine"
```

### Create an empty document without collection
```javascript
var userSchema = new Schema('User', {
   name: { type: String, required: true }
});
var user = storage.Document( userSchema );

console.log( user.name );  // undefined
```

### Validation
```javascript
user.name = undefined;

user.validate(function( err ){
  if ( err ) {
    console.log( err ); // ValidationError object
  }
});
```

### Validation sync coming soon

### Virtuals
Virtuals are document properties that you can get and set but that do not get persisted to Storage. The getters are useful for formatting or combining fields, while settings are useful for de-composing a single value into multiple values for storage.

```javascript
// define a schema
var personSchema = new Schema({
  name: {
    first: String,
    last: String
  }
});

// create our collection
var persons = storage.createCollection('Person', personSchema);

// create a document
var bad = persons.add({
    name: { first: 'Walter', last: 'White' }
});
```
Suppose we want to log the full name of bad. We could do this manually like so:

```javascript
console.log(bad.name.first + ' ' + bad.name.last); // Walter White
```
Or we could define a virtual property getter on our `personSchema` so we don't need to write out this string concatenation mess each time:
```javascript
personSchema.virtual('name.full').get(function () {
  return this.name.first + ' ' + this.name.last;
});
```
Now, when we access our virtual "name.full" property, our getter function will be invoked and the value returned:
```javascript
console.log('%s is insane', bad.name.full); // Walter White is insane
```
Note that if the resulting record is converted to an object or JSON, virtuals are not included by default. Pass `virtuals : true` to either toObject() or to toJSON() to have them returned.

It would also be nice to be able to set `this.name.first` and `this.name.last` by setting `this.name.full`. For example, if we wanted to change `bad`'s `name.first` and `name.last` to 'Breaking' and 'Bad' respectively, it'd be nice to just:
```javascript
bad.name.full = 'Breaking Bad';
```
Storage lets you do this as well through its virtual property setters:
```javascript
personSchema.virtual('name.full').set(function (name) {
  var split = name.split(' ');
  this.name.first = split[0];
  this.name.last = split[1];
});

...

bad.name.full = 'Breaking Bad';
console.log(bad.name.first); // Breaking
console.log(bad.name.last);  // Bad
```
Virtual property setters are applied before other validation. So the example above would still work even if the `first` and `last` name fields were required.

### Schema options
`Schema`'s have a few configurable options which can be passed to the constructor or `set` directly:
```javascript
new Schema(<name>, {..}, <options>);

// or

var schema = new Schema(<name>, {..});
schema.set(option, value);
```
Valid options:

* id
* _id
* strict
* minimize
* toJSON
* toObject
* versionKey
* discriminatorKey

#### option: id
Storage assigns each of your schemas an `id` virtual getter by default which returns the documents `_id` field cast to a string, or in the case of ObjectIds, its hexString. If you don't want an `id` getter added to your schema, you may disable it passing this option at schema construction time.
```javascript
// default behavior
var schema = new Schema({ name: String });
var pages = storage.createCollection('Page', schema);
var p = pages.add({ name: 'mongodb.org' });
console.log(p.id); // '50341373e894ad16347efe01'

// disabled id
var schema = new Schema({ name: String }, { id: false });
var pages = storage.createCollection('Page', schema);
var p = pages.add({ name: 'mongodb.org' });
console.log(p.id); // undefined
```
#### option: _id
Storage assigns each of your schemas an `_id` field by default if one is not passed into the Schema constructor. The type assiged is an ObjectId to coincide with MongoDBs default behavior. If you don't want an `_id` added to your schema at all, you may disable it using this option.

Pass this option *during schema construction* to prevent documents from getting an `_id` created by Storage (parent documents will still have an `_id`). *Passing the option later using Schema.set('_id', false) will not work. See issue [#1512](https://github.com/LearnBoost/mongoose/issues/1512).*
```javascript
// default behavior
var schema = new Schema({ name: String });
var pages = storage.createCollection('Page', schema);
var p = pages.add({ name: 'mongodb.org' });
console.log(p); // { _id: '50341373e894ad16347efe01', name: 'mongodb.org' }

// disabled _id
var schema = new Schema({ name: String }, { _id: false });

// Don't set _id to false after schema construction as in
// var schema = new Schema({ name: String });
// schema.set('_id', false);

var pages = storage.createCollection('Page', schema);
var p = pages.add({ name: 'mongodb.org' });
console.log(p); // { name: 'mongodb.org' }
```
Note that currently you must disable the `_id`

#### option: strict
The strict option, (enabled by default), ensures that values passed to our document constructor that were not specified in our schema do not get saved to the document.
```javascript
var thingSchema = new Schema({..})
var things = storage.createCollection('Thing', thingSchema);
var thing = things.add({ iAmNotInTheSchema: true });
console.log( thing.iAmNotInTheSchema ); // undefined

// set to false..
var thingSchema = new Schema({..}, { strict: false });
var thing = things.add({ iAmNotInTheSchema: true });
console.log( thing.iAmNotInTheSchema ); // undefined
console.log( thing.toObject() ); // Object {iAmNotInTheSchema: true, _id: ObjectId}
```
This also affects the use of `doc.set()` to set a property value.
```javascript
var thingSchema = new Schema({..})
var things = storage.createCollection('Thing', thingSchema);
var thing = things.add();
thing.set('iAmNotInTheSchema', true);
console.log( thing.toObject() ); // Object {iAmNotInTheSchema: true, _id: ObjectId}
```
This value can be overridden at the model instance level by passing a second boolean argument:
```javascript
var things = storage.createCollection('Thing');
var thing = things.add(doc, true);  // enables strict mode
var thing = things.add(doc, false); // disables strict mode
```
The `strict` option may also be set to `"throw"` which will cause errors to be produced instead of dropping the bad data.

*NOTE: do not set to false unless you have good reason.*

*NOTE: Any key/val set on the instance that does not exist in your schema is always ignored, regardless of schema option.*
```javascript
var thingSchema = new Schema({..})
var things = storage.createCollection('Thing', thingSchema);
var thing = things.add();
thing.iAmNotInTheSchema = true;
console.log( thing.iAmNotInTheSchema ); // true
console.log( thing.toObject() ); // Object {_id: ObjectId}
```

#### option: toJSON
Exactly the same as the toObject option but only applies when the documents `toJSON` method is called.
```javascript
var schema = new Schema({ name: String });
schema.path('name').get(function (v) {
  return v + ' is my name';
});
schema.set('toJSON', { getters: true, virtuals: false });
var persons = storage.createCollection('Person', schema);
var person = persons.add({ name: 'Max Headroom' });
console.log( person.toObject() ); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom' }
console.log( person.toJSON() ); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom is my name' }
// since we know toJSON is called whenever a js object is stringified:
console.log(JSON.stringify( person )); // { "_id": "504e0cd7dd992d9be2f20b6f", "name": "Max Headroom is my name" }
```

#### option: toObject
Documents have a toObject method which converts the mongoose document into a plain javascript object. This method accepts a few options. Instead of applying these options on a per-document basis we may declare the options here and have it applied to all of this schemas documents by default.

To have all virtuals show up in your `console.log` output, set the `toObject` option to `{ getters: true }`:
```javascript
var schema = new Schema({ name: String });
schema.path('name').get(function (v) {
  return v + ' is my name';
});
schema.set('toObject', { getters: true });
var persons = storage.createCollection('Person', schema);
var person = persons.add({ name: 'Max Headroom' });
console.log( person.toObject() ); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom is my name' }
```

## Storage has Schema Inheritance via Discriminator functionality:
```javascript
var PersonSchema = new Schema('Person', {
  name: String,
  createdAt: Date
});

var BossSchema = new Schema('Boss', PersonSchema, { department: String });
 ```

## Building from sources
1. **Clone the repo from GitHub**

        git clone https://github.com/archangel-irk/storage.git
        cd storage
        
2. **Acquire build dependencies.** Make sure you have [Node.js](http://nodejs.org/) installed on your workstation. Now run:

        npm install -g grunt-cli
        npm install

    The first `npm` command sets up the popular [Grunt](http://gruntjs.com/) build tool. You might need to run this command with `sudo` if you're on Linux or Mac OS X, or in an Administrator command prompt on Windows. The second `npm` command fetches the remaining build dependencies.

3. **Run the build tool**

        grunt

    Now you'll find the built file in `dist/storage.js`.
    
## Running the tests
After `npm install` you have the [karma test runner](https://github.com/karma-runner/karma) locally, now run:

	grunt test

Also you can see the code coverage in `test/coverage/`.

## License
MIT license - [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)

## Todo
* tests and docs for schema inheritance (discriminator)
* assert.ifError(err) -> move to .fail(function( err ){});
