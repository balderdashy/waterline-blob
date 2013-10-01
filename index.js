/*---------------------------------------------------------------
	:: Blob Adapter Factory
	:: waterline-blob

	Factory for generating waterline-compatible custom adapter
	definitions from simple blob adapter definitions.

	Mixes-in blob read/write support to waterline.
	TODO: merge this into core

---------------------------------------------------------------*/

/**
 * Module dependencies
 */
var _ = require('lodash'),
	GenericBlobAdapter = require('./GenericBlobAdapter');

/**
 * @param {Adapter} adapterDefinition
 *		The blob adapter definition
 */
module.exports = function generateWaterlineAdapter (adapterDefinition) {

	// Instantiates a GenericBlobAdapter, using the blob adapter def.
	// to configure the logic.  `adapter` is now a Waterline-compatible 
	// adapter definition.
	var adapter = new GenericBlobAdapter ( adapterDefinition );

	return {

		registerCollection: function (collection, cb) {
			cb();
		},




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

		write: function (collectionName) {
			// Slice off first argument (collectionName)
			var args = Array.prototype.slice.call(arguments, 0);
			args.shift();

			// Call underlying method
			adapter.write.apply(this, args);
		},


		/**
		 * Adapter.read()
		 * Adapter.read(destinationStream)
		 * Adapter.read(cb)
		 * Adapter.read({})
		 * Adapter.read({}, cb)
		 * Adapter.read({}, destinationStream)
		 */

		read: function (collectionName) {

			// Slice off first argument (collectionName)
			var args = Array.prototype.slice.call(arguments, 0);
			args.shift();

			// Call underlying method
			adapter.read.apply(this, args);	
		}
	};

};


