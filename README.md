# roles-auths-web-api-node-client

Client for Asiointivaltuudet Web API made with Node.js.

How to run
----------
Save your id and secrets to /config.json. Set also other properties.

`{
    "useSsl": false,
    "hostname": "localhost",
    "port": 8903,
    "webApiHostname": "localhost",
    "webApiPort": 8102,
    "clientId": "[MY_CLIENT_ID]",
    "clientSecret": "[MY_CLIENT_SECRET]",
    "apiOauthSecret": "[MY_OAUTH_API_SECRET]"
}`

Run `npm install` and `node WebApiClient.js`.
