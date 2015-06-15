uploadcare-node
===============

Node module for uploadcare.com that allows API interaction as well as local file upload.

Usage
-----------
```javascript
    var uploadcare = require('../lib/main')('public_key', 'private_key'),
        fs = require('fs');

    //
    //API interaction
    uploadcare.files.info('file_id', handler);
    uploadcare.files.store('file_id', handler);
    uploadcare.files.remove('file_id', handler);

    //
    //Upload from file
    uploadcare.file.upload(fs.createReadStream(path), function(err,res){
        //Res should contain returned file ID
        console.log(err,res);
    });
    
    //
    //Upload from URL
    uploadcare.file.fromUrl('http://host/image/path', function(err,res){
        //Res should contain returned file ID
        console.log(err,res);
    })
    
```
Installation
-----------

    npm install uploadcare

