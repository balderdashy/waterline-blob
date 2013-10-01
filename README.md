#waterline-blob

Factory method which generates waterline adapter definitions from blob adapter definitions

> This should eventually be dmerge into waterline core


### Usage

```javascript

// Your blob adapter definition
// (should have methods `read` and `write`)
var BlobAdapterDefinition = { /* ... */ };

// **BAM**
var AdapterFactory = require('waterline-blob');

// Your ready-to-go sails/waterline-compatible adapter definition
var AdapterDef = AdapterFactory( BlobAdapterDefinition );
```



### Writing Your Own Blob Adapter

You can export up to two methods from a BlobAdapter definition: `write()` and `read()`.


```javascript
 /**
	 * `Adapter.write( uploadStream, [options], [cb] )`
	 *
	 * Pipe initial FieldStreams (files) into a destination stream,
	 * then set up events to automatically pipe the FieldStream of any newly detected file
	 * from the UploadStream to the destination stream
	 *
	 * @param {Stream} `uploadStream`	::	contains paused field streams 
	 *										and fires when new ones are added
	 * @param {Object} `options`
	 *			container		: {String} directory path where file(s) sould be stored
	 *			maxBytes		: {Integer} Maximum combined size of all files together (default 1GB)
	 *			maxBytesPerFile	: {Integer} Maximum file size for each individual file (default 25MB)
	 */
```

```javascript
/**
 * Usages:
 * 
 * Adapter.read()
 * Adapter.read(destinationStream)
 * Adapter.read(cb)
 * Adapter.read({})
 * Adapter.read({}, cb)
 * Adapter.read({}, destinationStream)
 * Adapter.read({}, destinationStream, cb)
 */
 ```
