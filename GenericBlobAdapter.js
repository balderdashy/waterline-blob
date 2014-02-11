/**
 * Module dependencies
 */

var _		= require('lodash'),
	Stream	= require('stream'),
	DownloadStream = require('./DownloadStream'),
	util = require('util'),
	Validation = require('./validation');





var errors = {

	read: {
		invalidPathPrefix	: function (pathPrefix) {
			return new Error(util.format('Adapter.read() :: Invalid `pathPrefix` (%s) specified!', pathPrefix));
		},
		usage				: function () {
			return new Error('Adapter.read() :: Invalid usage!');
		},
	},

	invalidUploadStream: function (uploadStream) {
		return new Error(util.format('Adapter :: Invalid upload stream for field: `%s`.', uploadStream.fieldName));
	},

	// Emit dummy stream that just errors out immediately
	// using the specified `err`
	stream: function (err) {
		var s = new Stream();
		setTimeout(emitError, 1);
		return s;
		function emitError () {
			s.emit('error', err);
		}
	}
};




var Adapter = function ( childAdapter ) {

	// Connection configurations
	var _connections = {};


	/**
	 * registerConnection
	 *
	 * Wrapper for childAdapter's registerConnection.
	 * 
	 * @param  {Object}   connection
	 * @param  {Object}   collections
	 * @param  {Function} cb         [description]
	 * @return {[type]}              [description]
	 */
	this.registerConnection = function (connection, collections, cb) {

		// Build connection config and mix in default options
		var config = _.cloneDeep(connection);
		_.defaults(config, {
			maxBytes: 1000 * 1000 * 1000, // 1GB
			maxBytesPerFile: 1000 * 1000 * 25, // 25MB
			saveAs: function (filename) {
				return filename;
			},
			decoding: 'utf8'
		});

		// Store each connection config for later
		_connections[connection.identity] = {
			config: config,
			collections: collections
		};
		
		if ( !childAdapter.registerConnection ) return cb();
		return childAdapter.registerConnection(connection, collections, cb);
	};


	 /**
	 * `Adapter.write()`
	 *
	 * Pipe initial FieldStreams (files) into a destination stream,
	 * then set up events to automatically pipe the FieldStream of any newly detected file
	 * from the UploadStream to the destination stream
	 *
	 * @param {Stream} `uploadStream`	::	contains paused field streams 
	 *										and fires when new ones are added
	 * @param {Object} `options`
	 *			pathPrefix		: {String} directory path where file(s) should be stored
	 *			maxBytes		: {Integer} Maximum combined size of all files together (default 1GB)
	 *			maxBytesPerFile	: {Integer} Maximum file size for each individual file (default 25MB)
	 */

	this.write = function (connectionID, collectionID, uploadStream, options, cb) {

		// Usage
		if (!_.isFunction(cb) && _.isFunction(options)) {
			cb = options;
			options = {};
		}
		cb = cb || function () {};

		// No valid upload stream means no files
		if ( ! Validation.isValidStream(uploadStream) ) {
			return cb(null, []);
		}

		// Apply collection/adapter default options
		options = _extendOptions(connectionID, options);

		
		// For now, just error out
		if (! _.isString(options.pathPrefix) ) {
			return cb(errors.read.invalidPathPrefix(options.pathPrefix));
		}

		// Sanitize path prefix
		options.pathPrefix = Validation.sanitizePathPrefix(options.pathPrefix);

		// Apply options to upload stream
		// TODO: consider namespacing this...
		_.extend(uploadStream, options);

		// Track that this uploadStream is being deliberately consumed
		// by a blob adapter by marking it with
		if ( !uploadStream.connectedTo || typeof uploadStream.connectedTo.length === 'undefined' ) {
			console.log(uploadStream);
			return cb(errors.invalidUploadStream(uploadStream));
		}
		uploadStream.connectedTo.push(connectionID);

		// console.log('\n\n', 'uploadstream:',uploadStream);

		// Call the wrapped adapter upload logic
		////////////////////////////////////////////////////////////
		childAdapter.write(uploadStream, options, cb);
		////////////////////////////////////////////////////////////

		// Resume specified uploadStream, replaying its buffers and immediately
		// receiving any queued signals.  This also allows us to receive file uploads
		// which haven't happened yet
		// console.log('* adapter resuming upload stream...');
		uploadStream._resume();

		// Return uploadStream to allow for piping
		return uploadStream;
	};




	/**
	 * Adapter.read()
	 * Adapter.read(destinationStream)
	 * Adapter.read(cb)
	 * Adapter.read({})
	 * Adapter.read({}, cb)
	 * Adapter.read({}, destinationStream)
	 * Adapter.read({}, destinationStream, cb)
	 */

	this.read = function (connectionID, collectionID) {

		var options, cb, destinationStream;
		var err;


		// Optional callback
		cb = cb || function readComplete () {};

		// Ensure valid usage
		var arg0 = arguments[1],
			arg1 = arguments[2],
			arg2 = arguments[3];

		// Adapter.read({Object|String}, {Function})
		if ( (_.isPlainObject(arg0) || _.isString(arg0)) &&
			_.isFunction(arg1) ) {
			options = arg0;
			cb = arg1;
		}

		// Adapter.read({Object|String}, {Stream}, {Function} )
		else if ( (_.isPlainObject(arg0) || _.isString(arg0)) &&
				arg1 instanceof Stream && _.isFunction(arg2) ) {
			options = arg0;
			destinationStream = arg1;
			cb = arg2;
		}

		// Adapter.read({Object|String}, {Stream} )
		else if ( (_.isPlainObject(arg0) || _.isString(arg0)) &&
				arg1 instanceof Stream ) {
			options = arg0;
			destinationStream = arg1;
		}

		
		// Adapter.read({Object|String})
		else if ( (_.isPlainObject(arg0) || _.isString(arg0)) ) {
			options = arg0;
		}

		// Adapter.read({Function})
		else if ( _.isFunction(arg0) ) {
			cb = arg0;
		}

		// Adapter.read({Stream})
		else if ( arg0 instanceof Stream ) {
			destinationStream = arg0;
		}

		// Adapter.read()
		// else if ( _.isUndefined (arg0) ) { }

		else {
			console.error('Invalid usage of .read() ::',errors.read.usage());

			// Usage error occurred
			cb(errors.read.usage());

			// Return dummy stream that will error out
			return errors.stream(errors.read.usage());			
		}


		// Normalize options object
		// (split filename and pathPrefix path)
		if ( _.isString(options) ) {
			var path = options;

			// Dereference matches out here to be safe
			var _pathPrefix = path.match(/(.+)\/[^/]+\/?$/);
			_pathPrefix = _pathPrefix && _pathPrefix[1];

			var _filename = path.match(/\/([^/]+)\/?$/);
			_filename = _filename && _filename[1];

			options = {
				pathPrefix: _pathPrefix,
				filename: _filename
			};
		}
		if ( !_.isPlainObject(options) ) {
			options = {};
		}

		// Apply collection/adapter default options
		options = _extendOptions(connectionID, options);
		

		if ( _.isString(options.pathPrefix) ) {
			// Trim trailing slash off of pathPrefix
			options.pathPrefix = options.pathPrefix.replace(/\/*$/, '');
			// and make sure it has a leading slash
			options.pathPrefix = options.pathPrefix.replace(/^([^/])/, '/$1');
		}


		// Call the childAdapter's download logic
		// (gets source stream from adapter)
		////////////////////////////////////////////////////////////
		var downloadStream = childAdapter.read(new DownloadStream(), options, cb);
		////////////////////////////////////////////////////////////
		
		// If destination stream was passed in, pipe data directly to it
		if (destinationStream) {
			downloadStream.pipe(destinationStream);

			// Save reference to destination stream for compatibility checking
			downloadStream.destinationStream = destinationStream;
		}

		// Return download stream to allow for piping
		return downloadStream;
	};








	/**
	 * Extend usage options with collection configuration
	 * (which also includes adapter defaults)
	 *
	 * @param  {[type]} connectionID [description]
	 * @param  {[type]} options      [description]
	 * @return {[type]}              [description]
	 * 
	 * @api private
	 */

	function _extendOptions (connectionID, options) {

		// Ignore unexpected options argument, use {} instead
		options = _.isPlainObject(options) ? options : {};

		// Apply collection defaults, if relevant
		if (connectionID) {
			options = _.merge({}, _connections[connectionID].config, options);
		}
		
		// Clone options
		options = _.cloneDeep(options);

		// console.log('\n\n****************\nIN GENERICBLOBADAPTER.write() :: options ::\n', options);

		return options;
	}
};




/**
 * Expose adapter wrapper
 */

module.exports = Adapter;



