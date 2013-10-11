/**
 * Module dependencies
 */
var Stream = require('stream');


module.exports = {
	
	// Whether a stream is valid
	isValidStream: function (stream) {
		return stream && stream instanceof Stream;
	},


	// Trim trailing slash off of pathPrefix
	sanitizePathPrefix: function (pathPrefix) {
		pathPrefix = pathPrefix.replace(/\/*$/, '');
		// pathPrefix = pathPrefix.replace(/^([^/])/, '/$1');
		return pathPrefix;
	}
};

