var uploadcare = require('uploadcare')('public_key', 'private_key'),
    fs = require('fs');

function handler(method) {
  return function(error, response) {
    if(error) {
      console.log('Error in ' + method + ': ' + JSON.stringify(response));
    } else {
      console.log('Response from ' + method + ': ' + JSON.stringify(response));
    }
  };
}

var path = './test-file.jpg';
// Upload file
uploadcare.file.upload(fs.createReadStream(path), function(err,res){
    // The only thing returned when uploading is the file property.

    // Store the file
    uploadcare.files.store(res.file, handler('file.upload.store'));
    // Info on file
    uploadcare.files.info(res.file, handler('file.upload.info'));
    // Remove the file
    uploadcare.files.remove(res.file, handler('file.upload.remove'));
});

uploadcare.file.fromUrl('http://i.imgur.com/L4lmrVu.jpg', function(err, res){
    // file.fromUrl's response has file_id or uuid, it does not contain the "file" property like upload.

    // Store the file
    uploadcare.files.store(res.uuid, handler('file.fromUrl.store'));
    // Info on file
    uploadcare.files.info(res.uuid, handler('file.fromUrl.store'));
    // Remove the file
    uploadcare.files.remove(res.uuid, handler('file.fromUrl.store'));
});