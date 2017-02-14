# roles-auths-web-api-node-client

Example code how to connect Asiointivaltuudet Web API. This is example code and it should not be used in production environment.

How to run
----------
Save your id and secrets to /config.json. Set also other properties.

`{
    "port": 8904,
    "webApiUrl": "https://asiointivaltuustarkastus.qa.suomi.fi",
    "ssl": {
        "privateKey": "[MY_PRIVATE_KEY_PATH]",
        "certificate": "[MY_CERTIFICATE_PATH]",
        "passPhrase": "[MY_PASS_PHRASE]"
    },
    "clientId": "[MY_CLIENT_ID]",
    "clientSecret": "[MY_CLIENT_SECRET]",
    "apiOauthSecret": "[MY_OAUTH_API_SECRET]"
}`

Run `npm install` and `node WebApiClient.js`.

To get authorization for a delegate with `[HETU]` go with your browser to register URL. Go to `/register/hpa/[HETU]` for HPA case and go to `/register/ypa/[HETU]` for YPA case.
