"use strict";

var http = require('http'),
    querystring = require('querystring'),
    crypto = require('crypto');

function setup_response_handler(req, callback) {
  if(typeof callback !== 'function') {
    return;
  }

  req.on('response',
    function(res) {
      var response = '';
      res.setEncoding('utf8');
      res.on('data',
        function(chunk) {
          response += chunk;
        });
      res.on('end',
        function() {
          var err = 200 == res.statusCode ? 0 : res.statusCode;
          try {
            response = JSON.parse(response);
          }
          catch(e) {
            err = 1;
            response = { error : { message : 'Invalid JSON from uploadcare.com' } };
          }
          callback(err, response);
        });
    });
}

module.exports = function (public_key, private_key, options) {
  var defaults = options || {};

  function _request(method, path, callback, data) {
    var request_data = JSON.stringify(data);
    if(!data) {
      request_data = '';
    }

    var content_type = 'application/json';
    var content_hash = crypto.createHash('md5').update(request_data).digest('hex');
    var date = new Date().toUTCString();
    var sign_string = [method, content_hash, content_type, date, path].join('\n');
    var sign = crypto.createHmac('sha1', private_key).update(sign_string).digest('hex');

    var request_options = {
      host: 'api.uploadcare.com',
      port: '80',
      path: path,
      method: method,
      headers: {
        'Authentication': 'UploadCare ' + public_key + ':' + sign,
        'X-Uploadcare-Date': date,
        'Content-Type': content_type,
        'Content-Length': request_data.length
      }
    };

    var req = http.request(request_options);
    setup_response_handler(req, callback);
    req.write(request_data);
    req.end();
  }

  function post(path, data, callback) {
    _request('POST', path, callback, data);
  }

  function put(path, data, callback) {
    _request('PUT', path, callback, data);
  }

  function get(path, callback) {
    _request('GET', path, callback);
  }

  function remove(path, callback) {
    _request('DELETE', path, callback);
  }

  return {
    files: {
        keep: function (fileId, cb) {
          console.log('"keep" method in uploadcare is deprecated. It will be deleted.');
          post('/files/' + fileId + '/', {keep: 1}, cb);
        },
        store: function(fileId, cb) {
          post('/files/' + fileId + '/storage/', {}, cb);
        },
        info: function (fileId, cb) {
          get('/files/' + fileId + '/', cb);
        },
        remove: function (fileId, cb) {
          remove('/files/' + fileId + '/', cb);
        }
      },
      groups: {
          info: function (groupId, cb) {
            get('/groups/' + groupId + '/', cb);
          }
        }
  };
}
