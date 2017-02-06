/**
 * The MIT License
 * Copyright (c) 2016 Population Register Centre
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var http = require("http");;
var url = require("url");
var fs = require("fs");
var headerUtils = require("./lib/HeaderUtils.js");
var port = 9999;

var config = {};
var sessionId = '';

function init() {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    config.callbackUriHpa = encodeURI(config.callbackUriHpa);
    config.callbackUriYpa = encodeURI(config.callbackUriYpa);
    CLIENT_SECRET = config.clientSecret;
    CLIENT_ID = config.clientId;
    if (config.requireSsl) {
        http = require("https");
    }
    console.log("using the following config:\n" + JSON.stringify(config));
}

init();

http.createServer(function (request, response) {
    if (request.url.substring(0, 13) === '/callback/hpa') {
        handleHpaCallback(request, response);
    } else if (request.url.substring(0, 13) === '/callback/ypa') {
        handleYpaCallback(request, response);
    } else if (request.url === '/hpa') {
        handleReqistration('hpa', request, response);
    } else if (request.url === '/ypa') {
        handleReqistration('ypa', request, response);
    }

}).listen(config.port || 9999);

function handleReqistration(mode, request, response) {
    console.log("Registering WEB API session...");

    if (mode === 'hpa') {
        var delegateHetu = config.hetuHpa;
        var callbackUri = config.callbackUriHpa;
    } else if (mode === 'ypa') {
        var delegateHetu = config.hetuYpa;
        var callbackUri = config.callbackUriYpa;
    }

    var registerPath = '/service/' + mode + '/user/register/' + config.clientId + '/' + delegateHetu + '?requestId=nodeClient&endUserId=nodeEndUser';

    console.log('Adding X-AsiointivaltuudetAuthorization header...')
    var checksumHeaderValue = headerUtils.xAuthorizationHeader(registerPath);

    var options = {
        method: 'GET',
        hostname: config.webApiHostname,
        port: config.webApiPort,
        path: registerPath,
        headers: {
            'X-AsiointivaltuudetAuthorization': checksumHeaderValue
        }
    };

    var req = http.request(options, function (res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    var data = JSON.parse(body);
                    sessionId = data.sessionId;
                    var authorizeUrl = 'http://' + config.webApiHostname + ':' + config.webApiPort + '/oauth/authorize?client_id=' + config.clientId + '&response_type=code&redirect_uri=' + callbackUri + '&user=' + data.userId;
                    console.log("Got sessionId=" + sessionId);
                    console.log('Redirecting user-agent to: ' + authorizeUrl);
                    response.writeHead(302, {
                        'Location': authorizeUrl
                    });
                } catch (er) {
                    response.writeHead(500);
                }
            } else {
                console.log('Response status code: ' + res.statusCode);
                console.log('Response status message: ' + res.statusMessage);
                console.log(body);
                response.writeHead(500);
            }
            response.end();
        });
    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    req.end();
}

function handleHpaCallback(request, response) {
    var urlParts = url.parse(request.url, true);
    console.log('OAuth autorization endpoint returned code: ' + urlParts.query.code);
    // response.end();

    changeCodeToToken(urlParts.query.code, config.callbackUriHpa)
        .then(getDelegate)
        .then((authArgs) => {
            for (var i = 0; i < authArgs.principals.length; i++) {
                getAuthorization(authArgs.accessToken, authArgs.principals[i].personId).then((data) => { response.write(data); response.end(); });
            }
            // response.end();
        });
}

function handleYpaCallback(request, response) {
    var urlParts = url.parse(request.url, true);
    console.log('OAuth autorization endpoint returned code: ' + urlParts.query.code);
    response.end();
    changeCodeToToken(urlParts.query.code, config.callbackUriYpa).then(getRoles);
}

function changeCodeToToken(code, callbackUri) {
    return new Promise(
        (resolve, reject) => {
            console.log('Exchaning authorization code to access token...');
            var options = {
                method: 'POST',
                hostname: config.webApiHostname,
                port: config.webApiPort,
                headers: {
                    'Authorization': headerUtils.basicAuthorizationHeader(config.clientId, config.apiOauthSecret)
                },
                path: '/oauth/token?code=' + code + '&grant_type=authorization_code&redirect_uri=' + callbackUri
            };
            var req = http.request(options, function (res) {
                var body = '';
                res.setEncoding('utf8');

                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    try {
                        var data = JSON.parse(body);
                        console.log('Status from OAuth token endpoint: ' + res.statusCode);
                        console.log("Response from OAuth token endpoint: " + body);
                        //{"access_token":"12ea9653-814b-4b1f-a877-4aeecd92d2ba","token_type":"bearer","refresh_token":"77543b3a-8823-49ea-929e-a9b6b63a9403","expires_in":599,"scope":"read write trust"}
                        var accessToken = data.access_token;
                        console.log('access_token=' + accessToken);
                        resolve(accessToken);
                    } catch (er) {
                        console.log(er);
                        reject();
                    }
                });
            });

            req.on('error', function (e) {
                console.log(`problem with request: ${e.message}`);
            });

            req.end();
        }
    );
}

function getDelegate(accessToken) {
    return new Promise((resolve, reject) => {
        var resourceUrl = '/service/hpa/api/delegate/' + sessionId + '?requestId=nodeRequestID&endUserId=nodeEndUser';
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(resourceUrl);
        console.log('Get ' + resourceUrl);
        var options = {
            method: 'GET',
            hostname: config.webApiHostname,
            port: config.webApiPort,
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'X-AsiointivaltuudetAuthorization': checksumHeaderValue
            },
            path: resourceUrl
        };

        var req = http.request(options, function (res) {
            var body = '';
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                console.log(body);
                var principals = JSON.parse(body);
                console.log("Response from " + resourceUrl + ': ' + body);
                var result = {
                    accessToken: accessToken,
                    principals: principals
                };
                resolve(result);
            });

        });

        req.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
            reject();
        });

        req.end();
    });

}


function getAuthorization(accessToken, principalId) {
    return new Promise((resolve, reject) => {
        var resourceUrl = '/service/hpa/api/authorization/' + sessionId + '/' + principalId + '?requestId=nodeRequestID&endUserId=nodeEndUser';
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(resourceUrl);
        console.log('Get ' + resourceUrl);
        var options = {
            method: 'GET',
            hostname: config.webApiHostname,
            port: config.webApiPort,
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'X-AsiointivaltuudetAuthorization': checksumHeaderValue
            },
            path: resourceUrl
        };

        var req = http.request(options, function (res) {
            var body = '';
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                console.log(body);
                var data = JSON.parse(body);
                resolve(data);
            });

        });

        req.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
        });

        req.end();
    });
}

function getRoles(accessToken) {
    var resourceUrl = '/service/ypa/api/organizationRoles/' + sessionId + '/123456-1' + '?requestId=nodeRequestID&endUserId=nodeEndUser';
    var checksumHeaderValue = headerUtils.xAuthorizationHeader(resourceUrl);
    console.log('Get ' + resourceUrl);
    var options = {
        method: 'GET',
        hostname: config.webApiHostname,
        port: config.webApiPort,
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'X-AsiointivaltuudetAuthorization': checksumHeaderValue
        },
        path: resourceUrl
    };

    var req = http.request(options, function (res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var data = JSON.parse(body);
            console.log("Status from " + resourceUrl + ': ' + res.statusCode);
            console.log("Response from " + resourceUrl + ': ' + body);
        });

    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    req.end();

}
