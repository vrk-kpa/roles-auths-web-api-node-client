var http = require("http"),
    url = require("url"),
    crypto = require("crypto"),
    moment = require("moment"),
    buffer = require('buffer'),
    port = process.argv[2] || 9999;

WEB_API_HOSTNAME = 'localhost';
WEB_API_PORT = 8102;
CLIENT_ID = '[PUT_HERE_CLIENT_ID]';
CLIENT_SECRET = '[PUT_HERE_CLIENT_SECRET]';
API_OAUTH_SECRET = '[PUT_HERE_OAUTH_SECRET]';
CALLBACK_URI_HPA = encodeURI('http://localhost:9999/callback/hpa');
CALLBACK_URI_YPA = encodeURI('http://localhost:9999/callback/ypa');
HETU_HPA = '010180-9026';
HETU_YPA = '010180-9026';

sessionId = '';
principalId = '';

http.createServer(function(request, response) {
    if (request.url.substring(0, 13) === '/callback/hpa') {
        handleHpaCallback(request, response);
    } else if (request.url.substring(0, 13) === '/callback/ypa') {
        handleYpaCallback(request, response);
    } else if (request.url === '/hpa') {
        handleReqistration('hpa', request, response);
    } else if (request.url === '/ypa') {
        handleReqistration('ypa', request, response);
    }

}).listen(9999);

console.log("server running at\n  => http://localhost:" + 9999);

function handleReqistration(mode, request, response) {
    console.log("Registering WEB API session...");

    if (mode === 'hpa') {
        var delegateHetu = HETU_HPA;
        var callbackUri = CALLBACK_URI_HPA;
    } else if (mode === 'ypa') {
        var delegateHetu = HETU_YPA;
        var callbackUri = CALLBACK_URI_YPA;
    }

    var path = '/service/' + mode + '/user/register/' + CLIENT_ID + '/' + delegateHetu + '?requestId=nodeClient&endUserId=nodeEndUser';

    console.log('Adding X-AsiointivaltuudetAuthorization header...')
    var checksumHeaderValue = xAuthorizationHeader(path);

    var options = {
        method: 'GET',
        hostname: WEB_API_HOSTNAME,
        port: WEB_API_PORT,
        path: path,
        headers: {
            'X-AsiointivaltuudetAuthorization': checksumHeaderValue
        }
    };

    var req = http.request(options, function(res) {
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
                    var authorizeUrl = 'http://' + WEB_API_HOSTNAME + ':' + WEB_API_PORT + '/oauth/authorize?client_id=' +  CLIENT_ID + 't&response_type=code&redirect_uri=' + callbackUri + '&user=' + data.userId;
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

function xAuthorizationHeader(path) {
    var timestamp = moment().format();
    var checksum = crypto.createHmac('sha256', CLIENT_SECRET)
        .update(path + ' ' + timestamp)
        .digest('base64');
    return CLIENT_ID + ' ' + timestamp + ' ' + checksum;
}

function handleHpaCallback(request, response) {
    var urlParts = url.parse(request.url, true);
    console.log('OAuth autorization endpoint returned code: ' + urlParts.query.code);
    response.end();
    changeCodeToToken(urlParts.query.code, CALLBACK_URI_HPA, getDelegate);
}

function handleYpaCallback(request, response) {
    var urlParts = url.parse(request.url, true);
    console.log('OAuth autorization endpoint returned code: ' + urlParts.query.code);
    response.end();
    changeCodeToToken(urlParts.query.code, CALLBACK_URI_YPA, getRoles);
}

function changeCodeToToken(code, callbackUri, apiCallFunction) {
    console.log('Exchaning authorization code to access token...');
    var options = {
        method: 'POST',
        hostname: WEB_API_HOSTNAME,
        port: WEB_API_PORT,
        headers: {
            'Authorization': basicAuthorizationHeader(CLIENT_ID, API_OAUTH_SECRET)
        },
        path: '/oauth/token?code=' + code + '&grant_type=authorization_code&redirect_uri=' + callbackUri
    };
    var req = http.request(options, function(res) {
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
                apiCallFunction(accessToken);
            } catch (er) {
                console.log(er);
            }
        });
    });

    req.on('error', function(e) {
        console.log(`problem with request: ${e.message}`);
    });

    req.end();
}


function basicAuthorizationHeader(clientId, clientSecret) {
    var encoded = new Buffer(clientId + ':' + clientSecret).toString('base64');
    return "Basic " + encoded;
}

function getDelegate(accessToken) {
    var resourceUrl = '/service/hpa/api/delegate/' + sessionId + '?requestId=nodeRequestID&endUserId=nodeEndUser';
    console.log('Get ' + resourceUrl);
    var options = {
        method: 'GET',
        hostname: WEB_API_HOSTNAME,
        port: WEB_API_PORT,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        path: resourceUrl
    };

    var req = http.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var data = JSON.parse(body);
            console.log("Response from " + resourceUrl + ': ' + body);
        });

    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    req.end();
}

function testCallingUnauthorized(accessToken) {
    var resourceUrl = '/service/hpa/principals/';

    var options = {
        method: 'GET',
        hostname: WEB_API_HOSTNAME,
        port: WEB_API_PORT,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        path: resourceUrl
    };

    var req = http.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var data = JSON.parse(body);
            console.log("Response from " + resourceUrl + ': ' + body);
        });

    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    req.end();

}

function getRoles(accessToken) {
    var resourceUrl = '/service/ypa/api/organizationRoles/' + sessionId + '/123456-1' + '?requestId=nodeRequestID&endUserId=nodeEndUser';
    console.log('Get ' + resourceUrl);
    var options = {
        method: 'GET',
        hostname: WEB_API_HOSTNAME,
        port: WEB_API_PORT,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        path: resourceUrl
    };

    var req = http.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
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