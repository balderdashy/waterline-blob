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
