## v0.5.1 / 2015-09-21
* up to version 3.8.27-3.8.35, 3.9.6 of mongoose;

from mongoose (3.8.27-3.8.35 and 3.9.6):
* fixed; proper handling for toJSON options #2910
* checked; Handle JSON.stringify properly for nested docs #2990
* fixed; handling for minimize on nested objects #2930
* fixed; don't crash when schema.path.options undefined #1824
* fixed; subdocument toObject() transforms #2447
* added; ability to set field with validators to undefined #1594
* added; castErrors in validation #1013
* added; correctly run validators on each element of array when entire array is modified #661 #1227

## v0.5.0 / 2015-07-05
* up to version 3.9.3, 3.9.4, 3.9.5 of mongoose;
* added; ability to set single populated paths to documents

## v0.4.0 / 2015-05-03
* up to version 3.8.25, 3.8.26, 3.8.27, 3.9.0, 3.9.1, 3.9.2 of mongoose;
* added; custom fields for validators

## v0.3.2 / 2015-04-13
* fixed bugs for version 3.8.21, 3.8.22, 3.8.23, 3.8.24 of mongoose;
* browserify -> webpack
* improved inheritance docs

## v0.3.1 / 2014-12-21
* fixed bugs for version 3.8.20 of mongoose;
* added; tests for schema inheritance;
* update reserved words of schema;
* fixed; discriminator; Improved the logic of creating the schema, it influenced the discriminator. Now when inheritance schema, stored validation for fields and similar options field.

## v0.3.0 / 2014-12-17
* save callback arguments is changed: now this plain object with modified data ready to save;
* fixed: retainKeyOrder (mongoose gh-2340);
* add; alias storage.addCollection for storage.createCollection;
* improve Deferred;
* update Buffer (by browserify);
* cleanup repo;
* fixed; bugs with rest-api-client;
* fixed bugs for 3.8.18 (mongoose);
* update tests;

## v0.2.0 / 2014-11-15
* removed; we are freed from dependence on jquery

## v0.1.1 / 2014-11-14
* fixed; did not work creation schemes in the minified version #2

## v0.1.0 / 2014-11-09
* Initial version with only very basic features
* Numbering in accordance with http://semver.org/
