// var uploadcare = require('uploadcare')('public_key', 'private_key');
 var uploadcare = require('uploadcare')('public_key', 'private_key'),
     fs = require('fs');

function handler(error, response) {
  if(error) {
    console.log('Error: ' + JSON.stringify(response));
  } else {
    console.log('Response: ' + JSON.stringify(response));
  }
}

var path = './test-file.jpg';
// Upload file
uploadcare.file.upload(fs.createReadStream(path), function(err,res){
	// Store the file
    uploadcare.files.store(res.file, handler);
    // Info on file
    uploadcare.files.info(res.file, handler);
    // Remove the file
    uploadcare.files.remove(res.file, handler);
});