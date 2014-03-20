uploadcare-node
===============

Node module for uploadcare.com that allows API interaction as well as local file upload.

Usage
-----------

    var uploadcare = require('../lib/main')('public_key', 'private_key'),
        fs = require('fs');

    //API interaction
    uploadcare.files.info('file_id', handler);
    uploadcare.files.keep('file_id', handler);
    uploadcare.files.remove('file_id', handler);

    //Upload
    uploadcare.file.upload(fs.createReadStream(path), function(err,res){
        //Res should contain returned file ID
        console.log(err,res);
    })

Installation
-----------

    npm install uploadcare

