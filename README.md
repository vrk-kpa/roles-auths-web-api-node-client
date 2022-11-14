# roles-auths-web-api-node-client

Client for Asiointivaltuudet Web API made with Node.js.

How to run
----------
Save your id and secrets to /config.json. Set also other properties.

```
{
    "hostname": "localhost",
    "port": [MY_ALLOWED_REDIRECT_PORT],
    "webApiUrl": "http://localhost:8102",
    "clientId": "[MY_CLIENT_ID]",
    "clientSecret": "[MY_CLIENT_SECRET]",
    "apiOauthSecret": "[MY_OAUTH_API_SECRET]"
}
```

Run `npm install` and `node WebApiClient.js`.

To get authorization for a delegate with `[PERSON_ID]` go with your browser to register URL. Go to `/register/hpa/[PERSON_ID]` for HPA case and go to `/register/ypa/[PERSON_ID]` for YPA case.
To get authorizationlist for a delegate with `[PERSON_ID]` go with your browser to register URL '/register/hpalist/[PERSON_ID]`.
