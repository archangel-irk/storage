# Storage

Use mongoose-like schema validation, collections and documents on browser.


## Installation
```html
<script src="storage.js"></script>
```
## Usage
Create Schema
```javascript
var User = new Schema('User', {
  name: { type: String, required: true }
});
```

Create Collection
```javascript
storage.createCollection('users', User );
```

Create Document
```javascript
var user = storage.users.add({name: 'Constantine'});

console.log( user.name );  // "Constantine"
```

Validation
```javascript
user.name = undefined;

user.validate(function( err ){
  if ( err ) {
    console.log( err ); // ValidationError object
  }
});
```

Validation sync coming soon

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

    Now you'll find the built file in `./storage.js`.
    
## Running the tests
After `npm install` you have the [karma test runner](https://github.com/karma-runner/karma) locally, now run:

	./node_modules/karma/bin/karma start karma.local.conf.js
	
Or install `karma-cli` globally

	npm install -g karma-cli
	
and run:

	karma start karma.local.conf.js

Also you can see the code coverage in `./coverage/`.

## License
MIT license - [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)
