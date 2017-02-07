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
var express = require('express')
var cookieParser = require('cookie-parser')
var headerUtils = require("./lib/HeaderUtils.js");

var app = express();
app.use(cookieParser());
var config = {};

function init() {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    config.callbackUriHpa = encodeURI(config.callbackUriHpa);
    config.callbackUriYpa = encodeURI(config.callbackUriYpa);
    if (config.requireSsl) {
        http = require("https");
    }
    console.log("using the following config:\n" + JSON.stringify(config));
}

init();

app.get('/register/hpa/:hetu', function (request, response) {
    // test hetu 010180-9026
    reqister('hpa', request.params.hetu, config.callbackUriHpa, response).
        then(redirectToWebApiSelection).
        catch(function (reason) {
            response.status(500).send(reason);
        });
});

app.get('/callback/hpa', function (request, response) {
    var urlParts = url.parse(request.url, true);
    changeCodeToToken(request.cookies.webApiSessionId, urlParts.query.code, config.callbackUriHpa).
        then(getDelegate).
        then(getAuthorizations).
        then(function (authorizations) {
            response.status(200).send(authorizations);
        }).
        catch(function (reason) {
            response.status(500).send(reason);
        });
});



app.get('/register/ypa/:hetu', function (request, response) {
    // test hetu 010180-9026
    reqister('ypa', request.params.hetu, config.callbackUriYpa, response).
        then(redirectToWebApiSelection).
        catch(function (reason) {
            response.status(500).send(reason);
        });
});

app.get('/callback/ypa', function (request, response) {
    var urlParts = url.parse(request.url, true);
    changeCodeToToken(request.cookies.webApiSessionId, urlParts.query.code, config.callbackUriYpa).
        then(getRoles).
        then(function (roles) {
            response.status(200).send(roles);
        }).
        catch(function (reason) {
            response.status(500).send(reason);
        });
});

app.listen(config.port || 9999, function () {
    console.log('App listening on port ' + config.port || 9999);
});

function reqister(mode, delegateHetu, callbackUri, response) {
    return new Promise(function (resolve, reject) {
        //Registering WEB API session
        var registerPath = '/service/' + mode + '/user/register/' + config.clientId + '/' + delegateHetu + '?requestId=nodeClient&endUserId=nodeEndUser';

        // Adding X-AsiointivaltuudetAuthorization header
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(config.clientId, config.clientSecret, registerPath);

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

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                if (res.statusCode === 200) {
                    try {
                        var data = JSON.parse(body);
                        //Don't do this in production. Don't expose webApiSessionId to the user.
                        response.cookie("webApiSessionId", data.sessionId);
                        resolve({ userId: data.userId, response: response, callbackUri: callbackUri });
                    } catch (e) {
                        reject(e.stack);
                    }
                } else {
                    reject(body)
                }
            });
        });

        req.on('error', function (e) {
            console.error(`problem with request: ${e.message}`);
            reject(e.stack);
        });

        req.end();

    });
}

function redirectToWebApiSelection(args) {
    return new Promise(function (resolve, reject) {
        var authorizeUrl = 'http://' + config.webApiHostname + ':' + config.webApiPort + '/oauth/authorize?client_id=' + config.clientId + '&response_type=code&redirect_uri=' + args.callbackUri + '&user=' + args.userId;
        args.response.writeHead(302, {
            'Location': authorizeUrl
        });
        args.response.end();
        resolve();
    });
}

function changeCodeToToken(webApiSessionId, code, callbackUri) {
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

                res.on('data', function (chunk) {
                    body += chunk;
                });

                res.on('end', function () {
                    if (res.statusCode === 200) {
                        try {
                            var data = JSON.parse(body);
                            //{"access_token":"12ea9653-814b-4b1f-a877-4aeecd92d2ba","token_type":"bearer","refresh_token":"77543b3a-8823-49ea-929e-a9b6b63a9403","expires_in":599,"scope":"read write trust"}
                            var args = {};
                            args.accessToken = data.access_token;
                            args.webApiSessionId = webApiSessionId;
                            resolve(args);
                        } catch (e) {
                            console.error(e);
                            reject(e);
                        }
                    } else {
                        reject(body);
                    }
                });
            });

            req.on('error', function (e) {
                reject(e.stack);
            });

            req.end();
        }
    );
}

function getDelegate(args) {
    return new Promise(function (resolve, reject) {
        var resourceUrl = '/service/hpa/api/delegate/' + args.webApiSessionId + '?requestId=nodeRequestID&endUserId=nodeEndUser';
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(config.clientId, config.clientSecret, resourceUrl);
        console.log('Get ' + resourceUrl);
        var options = {
            method: 'GET',
            hostname: config.webApiHostname,
            port: config.webApiPort,
            headers: {
                'Authorization': 'Bearer ' + args.accessToken,
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
                if (res.statusCode === 200) {
                    try {
                        var principals = JSON.parse(body);
                        console.log("Response from " + resourceUrl + ': ' + body);
                        var result = {
                            webApiSessionId: args.webApiSessionId,
                            accessToken: args.accessToken,
                            principals: principals
                        };
                        resolve(result);
                    } catch (e) {
                        reject(e.stack);
                    }
                } else {
                    reject(body);
                }
            });

        });

        req.on('error', function (e) {
            reject(e.stack);
        });

        req.end();
    });

}

function getAuthorizations(authArgs) {
    return new Promise(function (resolve, reject) {
        var promises = [];
        for (var i = 0; i < authArgs.principals.length; i++) {
            promises.push(getAuthorization(authArgs.webApiSessionId, authArgs.accessToken, authArgs.principals[i]));
        }
        Promise.all(promises).then(function (values) {
            var authorizations = [];
            try {
                for (var j = 0; j < values.length; j++) {
                    if (values[j].errorMessage) {
                        reject(values[j].errorMessage);
                    }
                    authorizations.push(values[j]);
                }
                resolve(authorizations)
            } catch (e) {
                reject(e.stack);
            }
        }).catch(function (reason) {
            reject(reason);
        });
    });
}

function getAuthorization(webApiSessionId, accessToken, principal) {
    return new Promise(function (resolve, reject) {
        var resourceUrl = '/service/hpa/api/authorization/' + webApiSessionId + '/' + principal.personId + '?requestId=nodeRequestID&endUserId=nodeEndUser';
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(config.clientId, config.clientSecret, resourceUrl);
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
                if (res.statusCode === 200) {
                    try {
                        var data = JSON.parse(body);
                        data.principal = principal;
                        resolve(data);
                    } catch (e) {
                        reject(e.stack);
                    }
                } else {
                    reject(body)
                }

            });

        });

        req.on('error', function (e) {
            console.log(`problem with request: ${e.message}`);
            reject(e.stack);
        });

        req.end();
    });
}

function getRoles(args) {
    return new Promise(function (resolve, reject) {
        var resourceUrl = '/service/ypa/api/organizationRoles/' + args.webApiSessionId + '/123456-1' + '?requestId=nodeRequestID&endUserId=nodeEndUser';
        var checksumHeaderValue = headerUtils.xAuthorizationHeader(config.clientId, config.clientSecret, resourceUrl);
        console.log('Get ' + resourceUrl);
        var options = {
            method: 'GET',
            hostname: config.webApiHostname,
            port: config.webApiPort,
            headers: {
                'Authorization': 'Bearer ' + args.accessToken,
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
                if (res.statusCode === 200) {
                    try {
                        var data = JSON.parse(body);
                        resolve(data);
                    } catch (e) {
                        reject(e.stack);
                    }
                } else {
                    reject("Status from " + resourceUrl + ': ' + res.statusCode);
                }
            });

        });

        req.on('error', function (e) {
            reject(e.stack);
        });

        req.end();
    });
}
