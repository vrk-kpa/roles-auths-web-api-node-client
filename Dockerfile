FROM node:20-alpine

ENV deploy_dir /data00/deploy/
RUN mkdir -p ${deploy_dir}
WORKDIR ${deploy_dir}

ADD ./node_modules/ ${deploy_dir}/node_modules
ADD *.json ${deploy_dir}/
ADD *.js ${deploy_dir}/
ADD ./lib/ ${deploy_dir}/lib

EXPOSE 8904

ENTRYPOINT ["node", "./ConfiguredWebApiClient.js"]
