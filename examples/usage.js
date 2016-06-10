var uploadcare = require('../lib/main.js')('demopublickey', 'demoprivatekey'),
    fs = require('fs');

function handler(method) {
  return function(error, response) {
    if(error) {
      console.log('Error in ' + method);
      console.log('Error: ' + error);
      console.log('Response: ' + JSON.stringify(response));
    } else {
      console.log('Success: ' + method);
    }
  };
}

var path = './test-file.jpg';
// Upload file
uploadcare.file.upload(fs.createReadStream(path), function(err,res){
    handler('file.upload')(err, res);
    if(err) return;
    
    // The only thing returned when uploading is the file property.

    uploadcare.files.store(res.file, function(error, response) {
        handler('file.upload.store')(error, response);
        
        setTimeout(function() {
            // Store to S3
            uploadcare.files.storeCustom(res.file, 'uploadcare-node-test', function(error, response) {
                handler('file.upload.storeCustom')(error, response);
                
                // Remove the file
                uploadcare.files.remove(res.file, handler('file.upload.remove'));
            });
        }, 2000);
    });

    // Info on file
    uploadcare.files.info(res.file, handler('file.upload.info'));
});

uploadcare.file.fromUrl('http://i.imgur.com/L4lmrVu.jpg', function(err, res){
    handler('file.fromUrl')(err, res);
    if(err) return;

    // file.fromUrl's response has file_id or uuid, it does not contain the "file" property like upload.

    // Store the file
    uploadcare.files.store(res.uuid, handler('file.fromUrl.store'));
    // Info on file
    uploadcare.files.info(res.uuid, handler('file.fromUrl.info'));
    // Remove the file
    uploadcare.files.remove(res.uuid, handler('file.fromUrl.remove'));
});