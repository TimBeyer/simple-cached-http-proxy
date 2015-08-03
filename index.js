var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var _ = require('lodash');
var bodyParser = require('body-parser');
var express = require('express');

var startProxy = function (options) {
    var app = express();
    app.use(bodyParser.json());

    var cache = {};

    var getCacheKey = function (req) {
        var method = req.method;
        var url = req.url;
        var body = !_.isEmpty(req.body) ? JSON.stringify(req.body) : undefined;
        return _.compact([method, url, body]).join(':::');
    };

    var totalReqs = 0;
    app.all('*', function (req, res) {
        totalReqs++;
        var startTime = Date.now();
        var cacheKey = getCacheKey(req);
        if (cacheKey in cache) {
            console.log('Cache hit', cacheKey);
            res.send(cache[cacheKey]);
            var endTime = Date.now();
            console.log(totalReqs, 'Served in ', endTime - startTime);
        } else {
            console.log('Cache miss', cacheKey);
            var requestData = _.pick(req, ['url', 'headers', 'method']);
            requestData.url = options.url + req.url;
            requestData.headers = _.omit(requestData.headers, ['host', 'connection', 'accept-encoding', 'accept-language', 'referer', 'user-agent', 'pragma', 'cache-control']);
            if (!_.isEmpty(req.body)) {
                requestData.body = req.body;
                requestData.json = true;
            }
            request(requestData).spread(function (request, body) {
                if (req.url.indexOf('/orders') == -1) {
                    cache[cacheKey] = body;
                }
                res.send(body);
                var endTime = Date.now();
                console.log(totalReqs, 'Served in ', endTime - startTime);
            });
        }
    })

    app.listen(options.port);
    console.log('Proxy listening on Port %s', options.port);
};

module.exports = startProxy;
