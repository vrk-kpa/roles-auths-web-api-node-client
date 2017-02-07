# roles-auths-web-api-node-client

Client for Asiointivaltuudet Web API made with Node.js.

How to run
----------
Save your id and secrets to /config.json. Set also other properties.

`{
    "port": 9999,
    "webApiHostname": "localhost",
    "useSsl": false,
    "webApiPort": 8102,
    "clientId": "[MY_CLIENT_ID]",
    "clientSecret": "[MY_CLIENT_SECRET]",
    "apiOauthSecret": "[MY_OAUTH_API_SECRET]",
    "callbackUriHpa": "http://localhost:9999/callback/hpa",
    "callbackUriYpa": "http://localhost:9999/callback/ypa"
}`

Run `npm install` and `node WebApiClient.js`.
