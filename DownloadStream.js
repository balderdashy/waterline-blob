/**
 * Module dependencies
 */

var inherits	= require('util').inherits,
	Stream		= require('stream'),
	_			= require('lodash'),
	archiver	= require('archiver'),
	mime		= require('mime');


// TODO: 
// implement https://npmjs.org/package/lazystream
// to deal with `too many open files` issues that are likely to come up in production


/**
 * Errors
 */

var errors = {
	unexpectedFile: new Error('Unexpected file detected after download timeout')
};



/**
 * Expose stream constructor
 *
 * NOTE: DownloadStreams are paused upon initialization
 */

module.exports = DownloadStream;




/**
* DownloadStream
*
* A paused binary file stream from a storage adapter. 
*
* Paused on initiatialization (resume with `streamInstance.resume()`)
* Resumed automatically by `res.download`, `res.sendfile`, and `res.save`
*
* @implements Readable
* @implements Resumable
* @extends {Stream}
*/

inherits(DownloadStream, Stream);
function DownloadStream () {

	this.writable = true;
	_.bindAll(this);

	// Grab a logger (use sails.log if available)
	var log = typeof sails !== 'undefined' ? sails.log : {
		verbose: console.log,
		warn: console.warn,
		error: console.error
	};

	// If multiple files are downloaded as a zip, the filename for the archive
	var archiveFileName = 'download.zip';

	var self = this;

	// Keep track of # of files downloaded
	var fileCount = 0;

	// Optional limit for # of files
	// Set automatically to 1 if determination of this 
	// being a single file download is made.
	var limitFileCount = false;

	// Keep track of first file in case this is a single-file download
	var firstFile;

	// If the download timer expires, we must assume no other files are coming
	// so send back the single file
	var downloadTimer = setTimeout(function expire () {
		log.verbose('Download timer expired-- only one file will be downloaded.');
		self.onlyOneFile();
	}, 50);


	/**
	 * Emit data
	 */
	this.write = function (data) {
		log.verbose('Writing ' + (data && data.length) + 'bytes to download stream...');
		var args = Array.prototype.slice.call(arguments, 0);
		args.unshift('data');
		this.emit.apply(this, args);
	};


	/**
	 * End the stream
	 */
	this.end = function () {
		log('Ending download stream...');
		this.emit('end');
	};

	// File exceeds download count limit, 
	// or violates a consistentcy expectation
	this.unexpectedFile = function () {
		this.emit('error', errors.unexpectedFile);
	};


	// If no more files arive, start streaming the bytes 
	// of the first file immediately
	this.onlyOneFile = function () {

		// Clear download timer
		clearTimeout(downloadTimer);

		// Prevent any unexpected additional downloads from surprising us
		// (also serves as mutex)
		limitFileCount = 1;

		// If no files were uploaded, do nothing
		if (!firstFile) {
			return;
		}

		// Replay the buffered bytes onto the downloadStream
		else {
			log('Replaying buffered bytes and downloading the first file...');
			firstFile.pipe(self);
			// firstFile.resume();
		}

	};

	// If no files were found,
	this.noFiles = function () {
		
		// Clear download timer
		clearTimeout(downloadTimer);

		// emit a `notfound` event on the stream
		self.emit('notfound');

		// End stream
		self.end();
	};



	/**
	 * Signal that all files have been found
	 */

	this.once('glob_done', function noMoreFiles () {

		log.verbose('All matching files located.');

		if (fileCount === 0) {
			this.noFiles();
			return;
		}

		if (fileCount === 1) {
			this.onlyOneFile();
			return;
		}

		// if > 1 file is being downloaded,
		// when they are all finished, the zip can be finalized at this point
		log('Finalizing zip of ' + fileCount + ' files...');
		self.zipstream.finalize(function(err, written) {
			if (err) throw err;
			log(written + ' total bytes written to zip archive.');
		});
	});



	/**
	 * Receive a file on the download stream
	 */

	this.on('file', function (incomingFileStream) {

		incomingFileStream.index = fileCount;
		log('Discovered file #' + incomingFileStream.index + ' (' + incomingFileStream.filename + ')');

		// Manage file count and limits
		if (limitFileCount && fileCount >= limitFileCount ) {
			return this.unexpectedFile();
		}
		fileCount++;


		// If this is the first file
		if (fileCount === 1) {

			// Track the stream
			firstFile = incomingFileStream;

			log.verbose('Started buffering file stream...', incomingFileStream);
			
			// Continue buffering the first file until:
			//
			//	+ we find more files, then create a zip
			//	-or-
			//	+ the stream ends, so we download the first file
			//	-or-
			//	+ multiple download timeout expires (50ms) 
			//	  so we download the first file

			return;
		}

		// If this is the second file, this is the moment where, for the first time,
		// we can be certain that more than one file is being downloaded.
		// Immediately stop buffering the first file and set up the .zip
		if (fileCount === 2) {
			
			// Clear download timer
			// (since we are now sure that > 1 file is being downloaded)
			clearTimeout(downloadTimer);

			// Since multiple files are detected, create an archive
			// and start zipping them up
			this.zipstream = archiver('zip');

			// Handle name and MIME type if stream supports it
			log.verbose('Creating zip...');
			if (this.destinationStream.set) {
				log.verbose('Setting headers...');
				var mimetype = mime.lookup('.zip');
				this.destinationStream.set({
					'Content-type': mimetype,
					'Content-disposition': 'attachment; filename=' + archiveFileName
				});
			}

			// Set up zipstream to pipe to download
			this.zipstream.on('error', function(err) {
			  throw err;
			});
			this.zipstream.pipe(self);


			// Replay buffered bytes of first file into zip
			log('Writing ' + firstFile.filename + ' to zipstream...');
			this.zipstream.append( firstFile , { name: firstFile.filename });
			log('Replaying buffered bytes and zipping the rest of the first file...');
			// firstFile.resume();
		}


		// For every file discovered after the first, just zip and stream it
		log('Writing ' + incomingFileStream.filename + ' to zipstream...');
		this.zipstream.append( incomingFileStream , { name: incomingFileStream.filename }, function (err) {
			console.log('File #' + incomingFileStream.index +'  (' + incomingFileStream.filename + ') written successfully!', err);
		});

	});

	
}