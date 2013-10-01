/**
 * Module dependencies
 */

var _		= require('lodash'),
	Stream	= require('stream'),
	DownloadStream = require('./DownloadStream'),
	isValidStream = require('./isValidStream');

var errors = {

	read: {
		invalidContainer: new Error('Invalid container!'),
		usage			: new Error('Adapter.read() :: Invalid usage!')
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



/**
 * 
 * Upload file with specified field name:
 * ========================================
 *
 * Adapter.upload( uploadStream, options, cb )
 *
 *	@param {Stream} uploadStream :: A paused stream listening for one file
 *									e.g. req.param('file_fieldname')
 *	@param {Object} options :: 
 *						=> path or bucket or something
 *						=> fileName (if string, use the string as the name to save the file as)
 *							( true means that some crazy unique cryptographic (probably sha1) hash will be used instead)
 *							 ( default: false, which means file's `filename` will be used--)
 *	@param {?} cb :: Any supported waterline asynchronous handling shit
 *
 */

 /**
 * 
 * Multiple file upload:
 * ========================================
 *
 * Adapter.upload( uploadStream, options, cb )
 *
 *	@param {string} uploadStream :: A paused stream listening for ALL files
 *									e.g. req.files
 *	@param {Object} options :: 
 *						=> path or bucket or something
 *						=> fileName (default: false, which means file's `filename` will be used-- true means that some crazy unique cryptographic (probably sha1) hash will be used instead)
 *	@param {?} cb :: Any supported waterline asynchronous handling shit
 *
 */

var Adapter = function (adapter) {

	 /**
	 * `Adapter.write()`
	 *
	 * Pipe initial FieldStreams (files) into a destination stream,
	 * then set up events to automatically pipe the FieldStream of any newly detected file
	 * from the UploadStream to the destination stream
	 *
	 * @param {Stream} `uploadStream`	::	contains pausd field streams 
	 *										and fires when new ones are added
	 * @param {Object} `options`
	 *			container		: {String} directory path where file(s) sould be stored
	 *			maxBytes		: {Integer} Maximum combined size of all files together (default 1GB)
	 *			maxBytesPerFile	: {Integer} Maximum file size for each individual file (default 25MB)
	 */

	this.write = function (uploadStream, options, cb) {

		// Usage
		if (!_.isFunction(cb) && _.isFunction(options)) {
			cb = options;
			options = {};
		}
		cb = cb || function () {};

		// No valid upload stream means no files
		if ( ! isValidStream(uploadStream) ) {
			return cb(null, []);
		}


		// If no container is set, default to '.tmp/' (in your app's cwd)
		// but log a warning
		if (!options.container) {
			// options.container = '/Users/mike/Desktop/';
			// console.warn('Uploading to default container, `',options.container,'`');
			// 'No destination container specified for file upload!'
			return cb(errors.read.invalidContainer);
		}

		// Default options
		_.defaults(options, {
			maxBytes: 1000 * 1000 * 1000, // 1GB
			maxBytesPerFile: 1000 * 1000 * 25 // 25MB
		});

		// Apply options to upload stream
		_.extend(uploadStream, options);

		// console.log('\n\n', 'uploadstream:',uploadStream);

		// Call the wrapped adapter upload logic
		////////////////////////////////////////////////////////////
		adapter.write(uploadStream, options, cb);
		////////////////////////////////////////////////////////////

		// Resume specified uploadStream, replaying its buffers and immediately
		// receiving any queued signals.  This also allows us to receive file uploads
		// which haven't happened yet
		// console.log('* adapter resuming upload stream...');
		uploadStream._resume();

		// Return uploadStream to allow for chaining
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

	this.read = function () {

		var options, cb, destinationStream;
		var err;

		// Optional callback
		cb = cb || function readComplete () {};

		// Ensure valid usage
		var arg0 = arguments[0],
			arg1 = arguments[1],
			arg2 = arguments[2];

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
		else if ( _.isUndefined (arg0) ) { }

		else {
			// Usage error occurred
			cb(errors.read.usage);

			// Return dummy stream that will error out
			return errors.stream(errors.read.usage);			
		}

		// Normalize options object
		// (split filename and container path)
		if ( _.isString(options) ) {
			var path = options;
			options = {
				// Container path
				container: path.match(/(.+)\/[^/]+\/?$/)[1],
				// File name
				filename: path.match(/\/([^/]+)\/?$/)[1]
			};
		}
		if ( !_.isPlainObject(options) ) {
			options = {};
		}
		if (!_.isString(options.container)) {
			return cb(errors.read.invalidContainer);
		}

		if ( _.isString(options.container) ) {
			// Trim trailing slash off of container path
			options.container = options.container.replace(/\/*$/, '');
			// and make sure it has a leading slash
			options.container = options.container.replace(/^([^/])/, '/$1');
		}

		// If no filename specified, select all files
		if (!options.filename) {
			options.filename = '*';
		}

		// Default encoding to uft8
		options.decoding = options.decoding || 'utf8';

		// Get source stream from adapter
		var downloadStream = adapter.read(new DownloadStream(), options, cb);

		// If destination stream was passed in, pipe data directly to it
		if (destinationStream) {
			downloadStream.pipe(destinationStream);

			// Save reference to destination stream for compatibility checking
			downloadStream.destinationStream = destinationStream;
		}

		// Call the wrapped adapter upload logic
		// Return file stream to allow for chaining
		////////////////////////////////////////////////////////////
		return downloadStream;
		////////////////////////////////////////////////////////////

	};
};



/**
 * Expose adapter wrapper
 */

module.exports = Adapter;

