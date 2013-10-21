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
	
	// Merge in any other methods from def. which aren't covered
	// e.g. registerCollection
	_.defaults(adapter, adapterDefinition);

	return {

		/**
		 * Run when collection is instantiated
		 *
		 * TODO: completely wipe this stuff when this is in waterline core
		 */
		registerCollection: function (collection, cb) {
			if (adapter.registerCollection) {
				return adapter.registerCollection(collection, cb);
			}
			return cb();
		},




		/**
		 * `Adapter.write()`
		 *
		 * Pipe initial FieldStreams (files) into a destination stream,
		 * then set up events to automatically pipe the FieldStream of any newly detected file
		 * from the UploadStream to the destination stream
		 *
		 * @param {Stream} `incomingStream`	::	contains paused field streams 
		 *										and emits `data` event when new ones are added
		 * @param {Object} `options`
		 *			pathPrefix		: {String} directory path where file(s) should be stored
		 *			maxBytes		: {Integer} Maximum combined size of all files together (default 1GB)
		 *			maxBytesPerFile	: {Integer} Maximum file size for each individual file (default 25MB)
		 */

		write: function (collectionName) {
			var args = Array.prototype.slice.call(arguments, 0);

			// Call underlying method
			adapter.write.apply(this, args);
		},



		/**
		 * Adapter.rm(cid, options, cb)
		 *
		 * Delete/unlink a file from the connected filesystem.
		 */
		rm: function (collectionName, options, cb) {
			// Stub response
			setTimeout(cb, 1);
		},




	};

};


