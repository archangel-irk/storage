/**
 * User: Constantine Melnikov
 * Email: ka.melnikov@gmail.com
 * Date: 21.03.14
 * Time: 17:38
 */

/**
 * The default built-in validator error messages. These may be customized.
 *
 *     // customize within each schema or globally like so
 *     var mongoose = require('mongoose');
 *     mongoose.Error.messages.String.enum  = "Your custom message for {PATH}.";
 *
 * As you might have noticed, error messages support basic templating
 *
 * - `{PATH}` is replaced with the invalid document path
 * - `{VALUE}` is replaced with the invalid value
 * - `{TYPE}` is replaced with the validator type such as "regexp", "min", or "user defined"
 * - `{MIN}` is replaced with the declared min value for the Number.min validator
 * - `{MAX}` is replaced with the declared max value for the Number.max validator
 *
 * Click the "show code" link below to see all defaults.
 *
 * @property messages
 * @receiver MongooseError
 * @api public
 */
var errorMessages = {};
errorMessages.general = {};
errorMessages.general.default = "Validator failed for path `{PATH}` with value `{VALUE}`";
errorMessages.general.required = "Path `{PATH}` is required.";

errorMessages.Number = {};
errorMessages.Number.min = "Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).";
errorMessages.Number.max = "Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).";

errorMessages.String = {};
errorMessages.String.enum = "`{VALUE}` is not a valid enum value for path `{PATH}`.";
errorMessages.String.match = "Path `{PATH}` is invalid ({VALUE}).";

/**
 * StorageError constructor
 *
 * @param {String} msg - Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 * http://stackoverflow.com/questions/783818/how-do-i-create-a-custom-error-in-javascript
 */
function StorageError ( msg ) {
  this.message = msg;
  this.name = 'StorageError';
}
StorageError.prototype = new Error();


/*!
 * Formats error messages
 */
StorageError.prototype.formatMessage = function (msg, path, type, val) {
  if (!msg) throw new TypeError('message is required');

  return msg.replace(/{PATH}/, path)
            .replace(/{VALUE}/, String(val||''))
            .replace(/{TYPE}/, type || 'declared type');
};



function CastError( type, value, path ) {
  this.message = 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"';
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
}
CastError.prototype = StorageError.prototype;

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits MongooseError
 */
function ValidationError (instance) {
  StorageError.call(this, "Validation failed");
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
}
ValidationError.prototype = StorageError.prototype;

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String} type
 * @param {String|Number|any} val
 * @inherits StorageError
 * @api private
 */
function ValidatorError (path, msg, type, val) {
  if (!msg) msg = errorMessages.general.default;
  var message = this.formatMessage(msg, path, type, val);
  StorageError.call(this, message);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
}
ValidatorError.prototype = StorageError.prototype;
