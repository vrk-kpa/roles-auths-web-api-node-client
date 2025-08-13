# roles-auths-web-api-node-client

Test client for Suomi.fi-Valtuudet Web API made with Node.js.

How to run
----------
Save your id and secrets to ./config.json. Set also other properties.

```
{
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

If you need to use https for testing, you may add ssl-configuration section to your ./config.json file, assuming that you name the pk and certificate files as in the example further below.
```
    ...
    "ssl": {
        "privateKey": "./key.pem",
        "certificate": "./cert.pem",
        "passPhrase": "[MY_CERT_PASSWORD]"
    },
    ...
```

You can create a self-signed certificate using openssl for local testing, for example, as follows:

```
openssl genrsa -out key.pem 2048
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
```

You will be prompted for some meta-data for your certificate as well as the passphrase that can also be left empty.
After creating the certificate, you still need to add an exception for your browser to accept it.

If you use some other domain than localhost for testing, you can set used base url using the following setting:
```
    ...
    "clientBaseUrl": "https://example.com:8080",
    ...
```
