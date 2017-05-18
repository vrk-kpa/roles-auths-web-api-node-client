/**
 * The MIT License
 * Copyright (c) 2017 Population Register Centre
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
var request = require('request');
var fs = require('fs');
var process = require('process');

function getConfigAndStartClient() {
    //http://localhost:8888/roles-auths-web-api-node-client.json
    var configUrl = getConfigUrl();
    console.log("Loading config.json from " + configUrl);
    request(configUrl,
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                fs.writeFile('config.json', body, 'utf8', function (err) {
                    if (err) {
                        console.error(err);
                    } else {
                        require("./WebApiClient");
                    }
                });
            } else {
                console.error(error || body);
            }
        });
}

function getConfigUrl() {
    if(process.argv.length < 3) {
        console.info('Usage: node ' + process.argv[1] + " URL_TO_CONFIG");
        process.exit(0);
    }
    return process.argv[2];
}

getConfigAndStartClient();