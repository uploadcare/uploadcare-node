"use strict";

var http = require('http'),
    https = require('https'),
    querystring = require('querystring'),
    crypto = require('crypto'),
    FormData = require('form-data');

var async = require('async');
var url = require('url');

function mergeObjects(obj1, obj2){
    for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
    return obj1;
};

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
        function() {
          var err;

          if (res.statusCode > 201) {
              err = new Error('Unexpected status ' + res.statusCode + ' from uploadcare.com');
          }

          try {
              response = JSON.parse(response);
          }
          catch(e) {
              return callback(new Error('Invalid JSON from uploadcare.com'));
          }

          callback(err, response);
        });
};

function ListCursor(handle, options) {
    this.handle = handle;
    this.options = options || {};
};

ListCursor.prototype.next = function(callback) {
    this.handle.list(this.options, function(err, result) {
        if (typeof result === 'object' && result.results) {
            this.results = result.results;
            if (typeof result.next === 'string') {
                var parsed = url.parse(result.next, true);
                mergeObjects(this.options, parsed.query);
                callback(null, true);
            } else {
                callback(null, false);
            }
        } else {
            this.results = [];
            callback(err, false);
        }
    }.bind(this));
};

module.exports = function(public_key, private_key, options) {
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

    function _submit(path, form, callback){
        form.submit({
            host: 'upload.uploadcare.com',
            port: '443',
            path: path,
            protocol: 'https:'
        }, function(err, res) {
            if(err) {
              callback(err);
            } else {
              setup_response_handler(res, callback);
            }
        });
    }

    function post(path, options, callback) {
        if (options.form){
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
        });
    }

    function remove(path, callback) {
        _request('DELETE', path, {}, callback);
    }

    var api = {
        file: {
            upload: function(fileStream, options, callback) {
                if (typeof options === 'function') callback = options, options = {};
                options = options || {};
                var file = {};
                if (options.filename) file.filename = options.filename;
                if (options.contentType) file.contentType = options.contentType;
                if (options.knownLength) file.knownLength = options.knownLength;
                var form = new FormData();
                form.append( 'UPLOADCARE_PUB_KEY', public_key );

                if (options.store === false) {
                    form.append( 'UPLOADCARE_STORE', 0 );
                } else if (options.store === true) {
                    form.append( 'UPLOADCARE_STORE', 1 );
                } else {
                    form.append( 'UPLOADCARE_STORE', 'auto' );
                }
                form.append( 'file', fileStream, file);

                post('/base/', {
                    data:   form,
                    ssl:    true,
                    form:   true
                }, callback);
            },
            fromUrl: function(fileUrl, options, callback) {
                if (typeof options === 'function') callback = options, options = {};
                options = options || {};
                // prepend 'http:' when url is simply starting by '//'
                if(fileUrl.indexOf('//')===0){
                    fileUrl='http:'+fileUrl
                }
                var form = new FormData();
                if (options.store === false) {
                    form.append( 'store', 0 );
                } else if (options.store === true) {
                    form.append( 'store', 1 );
                } else {
                    form.append( 'store', 'auto' );
                }
                form.append( 'pub_key', public_key );
                form.append( 'source_url', fileUrl );
                //filename
                post('/from_url/', {
                    data:   form,
                    ssl:    true,
                    form:   true
                }, function(err, res) {
                    if(err){
                        return callback(err)
                    }
                    //
                    // we get a token, just wait for file UUID
                    function tick(){
                        upload_fromurl_get_status(res.token,function(err,file) {
                            if(err){
                                return callback(err)
                            }
                            if(file.status==='error'){
                                return callback(file.error,file)
                            }
                            if(file.status==='success'){
                                if(options.waitUntilReady){
                                    if(file.is_ready){
                                        return callback(err,file)
                                    }
                                }else{
                                    return callback(err,file)
                                }
                            }
                            setTimeout(tick, 100);
                        })
                    }
                    setTimeout(tick, 100);


                });
            }
        },
        files: {
            list: function(options, callback) {
                var qs = querystring.stringify(options);
                get('/files/' + (qs ? '?' + qs : ''), callback);
            },
            store: function(fileId, callback) {
                post('/files/' + fileId + '/storage/', {}, callback);
            },
            storeCustom: function(fileId, target, callback) {
                post('/files/', { data: { source: fileId, target: target } }, callback);
            },
            info: function(fileId, callback) {
                get('/files/' + fileId + '/', callback);
            },
            remove: function(fileId, callback) {
                remove('/files/' + fileId + '/', callback);
            },
            removeMultiple: function(fileIds, callback) {
                _request('DELETE', '/files/storage/', { data: fileIds }, callback);
            },
            cursor: function(options) {
                return new ListCursor(this, options || {});
            },
            iterate: function(iteratorFn, doneFn, options) {
                if (typeof doneFn === 'object') doneFn = null, options = {};
                options = mergeObjects({}, options);
                var maxLimit = typeof options.max === 'number' ? options.max : -1;
                var cursor = this.cursor(options);
                var count = 0;
                async.during(function(next) {
                    if (cursor.results) count += cursor.results.length;
                    if (maxLimit > -1 && count >= maxLimit) {
                        next(null, false);
                    } else {
                        cursor.next(next);
                    }
                }, function(done) {
                    iteratorFn(cursor.results || [], done);
                }, doneFn);
            }
        },
        group: {
            fromFiles: function(files, options, callback) {
                if (typeof options === 'function') callback = options, options = {};
                files = [].concat(files || []);
                options = options || {};
                var form = new FormData();
                form.append( 'pub_key', public_key );
                for (var i = 0; i < files.length; i++) {
                    form.append('files[' + i + ']', files[i]);
                }
                post('/group/', {
                    data:   form,
                    ssl:    true,
                    form:   true
                }, callback);
            }
        },
        groups: {
            list: function(options, callback) {
                var qs = querystring.stringify(options);
                get('/groups/' + (qs ? '?' + qs : ''), callback);
            },
            info: function(groupId, callback) {
                get('/groups/' + groupId + '/', callback);
            },
            store: function(groupId, callback) {
                put('/groups/' + groupId + '/storage/', {}, callback);
            },
            remove: function(groupId, callback) {
                this.info(groupId, function(err, info) {
                    if (!err && (!info || !info.files)) {
                        err = new Error('Unexpected error');
                    }
                    if (err) return callback(err);
                    var fileIds = [];
                    for (var i = 0; i < info.files.length; i++) {
                        if (typeof info.files[i] === 'object' && info.files[i].uuid) {
                            fileIds.push(info.files[i].uuid);
                        }
                    }
                    _request('DELETE', '/files/storage/', { data: fileIds }, function(err, res) {
                        callback(err, info, res);
                    });
                });
            }
        }
    };
    return api;
}
