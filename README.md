**⚠️ This package is DEPRECATED ⚠️**

Please use [`@uploadcare/upload-client` or `@uploadcare/rest-client`](https://github.com/uploadcare/uploadcare-js-api-clients/#readme) instead.


uploadcare-node
===============

Node module for uploadcare.com that allows API interaction as well as local file upload.

Usage
-----------
```javascript
    var uploadcare = require('../lib/main')('public_key', 'private_key'),
        fs = require('fs');


    // handler is a callback function
    // in the form function(err, data) { // code to handle response }


    //API interaction
    uploadcare.files.info('file_id', handler);
    uploadcare.files.store('file_id', handler);
    uploadcare.files.remove('file_id', handler);
    uploadcare.groups.info('group_id', handler);

    //
    //Paginated list of files/groups info
    uploadcare.files.list({page: 1, limit: 100}, handler);
    uploadcare.groups.list({page: 1, limit: 100}, handler);

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


CLI
---
Install uploadcare globally (`npm install -g uploadcare`) and you have a CLI tool for interacting with the REST API.

## Commands

### `info` / `i`
Get info for an uploadcare file or group.

```sh
# Single file
uc info --pub=demopublickey --priv=demoprivatekey 1b53f25b-ac5e-46e7-9a76-8bf77d755c55
# Group of files
uc info --pub=demopublickey --priv=demoprivatekey 80077b0a-3882-4bbc-b4f4-aabf45ff8fb7~3
```

## Options

* `-u, --pub` Public key to use (REQUIRED)
* `-r, --priv` Private key to use (REQUIRED)
* `-p, --pretty` Pretty print the response
