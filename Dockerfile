FROM node:6.9-alpine

ENV deploy_dir /data00/deploy/
RUN mkdir -p ${deploy_dir}
WORKDIR ${deploy_dir}

ADD *.json ${deploy_dir}/
ADD *.js ${deploy_dir}/
ADD ./lib/ ${deploy_dir}/lib

RUN npm update 

EXPOSE 8080

ENTRYPOINT ["node", "./WebApiClient.js"]

