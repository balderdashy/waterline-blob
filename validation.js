/**
 * Module dependencies
 */
var Stream = require('stream');


module.exports = {
	
	// Whether a stream is valid
	isValidStream: function (stream) {
		return stream && stream instanceof Stream;
	},


	/**
	 * 
	 * @param  {[type]} pathPrefix [description]
	 * @return {[type]}            [description]
	 */
	sanitizePathPrefix: function (pathPrefix) {

		// Trim trailing slash off of pathPrefix
		pathPrefix = pathPrefix.replace(/\/*$/, '');

		// And make sure it has a leading slash
		// TODO: figure out whether this should be here or not
		// pathPrefix = pathPrefix.replace(/^([^/])/, '/$1');

		return pathPrefix;
	}
};

