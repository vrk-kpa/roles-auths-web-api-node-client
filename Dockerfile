FROM node:6.9-alpine

RUN apk upgrade --update && \
    apk add --update curl ca-certificates bash

ENV deploy_dir /data00/deploy/
RUN mkdir -p ${deploy_dir}
WORKDIR ${deploy_dir}

ADD ./node_modules/ ${deploy_dir}/node_modules
ADD *.json ${deploy_dir}/
ADD *.js ${deploy_dir}/
ADD ./lib/ ${deploy_dir}/lib

EXPOSE 8080

ENTRYPOINT ["node", "./ConfiguredWebApiClient.js", "http://10.35.33.66:8889/roles-auths-web-api-node-client-itest.json"]
