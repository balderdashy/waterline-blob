/**
 * Module dependencies
 */
var Stream = require('stream');

module.exports = function isValidStream (stream) {
	return stream && stream instanceof Stream;
};
