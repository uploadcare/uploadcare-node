"use strict";

var http = require('http'),
    https = require('https'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    FormData = require('form-data');

function setup_response_handler(res, callback) {
    if(typeof callback !== 'function') {
        return;
    }
    var response = '';
    res.setEncoding('utf8');
    res.on('data',
        function(chunk) {
            response += chunk;
        });
    res.on('end',
        function(error) {
                var err = 200 == res.statusCode ? 0 : res.statusCode;
            try {
                response = JSON.parse(response);
            }
            catch(e) {
                callback({ error : { message : 'Invalid JSON from uploadcare.com' } });
                return;
            }
            callback(err, response);
        });
}

module.exports = function (public_key, private_key, options) {
    var defaults = options || {};

    function _request(method, path, options, callback){
        var request_data = JSON.stringify(options.data);
        if(!options.data) { request_data = ''; }

        //Prepare headers
        var content_type = 'application/json',
            //Hash private key
            content_hash = crypto.createHash('md5').update(request_data).digest('hex'),
            date = new Date().toUTCString(),
            sign_string = [method, content_hash, content_type, date, path].join('\n'),
            sign = crypto.createHmac('sha1', private_key).update(sign_string).digest('hex'),
            request_options = {
                host: 'api.uploadcare.com',
                port: (options.ssl ? 443 : 80),
                path: path,
                method: method,
                headers: {
                    'Authentication': 'UploadCare ' + public_key + ':' + sign,
                    'X-Uploadcare-Date': date,
                    'Content-Type': content_type,
                    'Content-Length': request_data.length
                }
            };

        var req = (options.ssl ? https.request(request_options) : http.request(request_options));

        req.on('response',function(res){
            setup_response_handler(res, callback);
        });

        req.write(request_data);
        req.end();
    }

    function _submit( path, form, callback){
        form.submit({
            host: 'upload.uploadcare.com',
            port: '443',
            path: path,
            protocol: 'https:'
        }, function(err, res) {
            if(err) console.log(err);
            setup_response_handler(res, callback);
        });
    }

    function post(path, options, callback) {
        if(options.form){
            _submit(path, options.data, callback);
        } else {
            _request('POST', path, options, callback);
        }
    }

    function put(path, options, callback) {
        _request('PUT', path, options, callback);
    }

    function get(path, callback) {
        _request('GET', path, {},  callback);
    }

    //
    // this is a special case when uploading image from URL
    // you have to check status until you receive a success
    function upload_fromurl_get_status(token, callback) {
        var path='/from_url/status/?token='+token+'&_='+Date.now()
        https.get('https://upload.uploadcare.com'+path, function(res) {
            setup_response_handler(res, callback);
        })
    }

    function remove(path, callback) {
        _request('DELETE', path, {}, callback);
    }

    return {
        file: {
            upload: function (fileStream, callback) {
                var form = new FormData();
                form.append( 'UPLOADCARE_PUB_KEY', public_key );
                form.append( 'file', fileStream );
                post('/base/', {
                    data:   form,
                    ssl:    true,
                    form:   true
                }, callback);
            },
            fromUrl: function (fileUrl, callback) {
                //
                // prepend 'http:' when url is simply starting by '//'
                if(fileUrl.indexOf('//')===0){
                    fileUrl='http:'+fileUrl
                }
                var form = new FormData();
                form.append( 'store', 'auto' );
                form.append( 'pub_key', public_key );
                form.append( 'source_url', fileUrl );
                //filename
                post('/from_url/', {
                    data:   form,
                    ssl:    true,
                    form:   true
                }, function (err, res) {
                    if(err){
                        return callback(err)
                    }
                    //
                    // we get a token, just wait for file UUID
                    function tick(){
                        upload_fromurl_get_status(res.token,function (err,file) {
                            if(err){
                                return callback(err)
                            }
                            if(file.status==='error'){
                                return callback(file.error,file)                                
                            }
                            if(file.status==='success'){
                                return callback(err,file)
                            }
                            setTimeout(tick, 100);
                        })
                    }
                    setTimeout(tick, 100);


                });
            }
        },
        files: {
            store: function(fileId, callback) {
                post('/files/' + fileId + '/storage/', {}, callback);
            },
            info: function (fileId, callback) {
                get('/files/' + fileId + '/', callback);
            },
            remove: function (fileId, callback) {
                remove('/files/' + fileId + '/', callback);
            }
        }
    };
}
