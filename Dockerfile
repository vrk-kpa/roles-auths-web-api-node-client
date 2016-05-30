# Pull base image
FROM ubuntu:latest

# Install common tools
RUN \
  apt-get update && \
  apt-get -y install curl && \
  apt-get -y install vim

# Install NodeJs
RUN \
   curl -sL https://deb.nodesource.com/setup_4.x | bash - && \
   apt-get install -y nodejs && \
   apt-get install -y build-essential

# Clean up
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Deploy project
WORKDIR /root/
ADD package.json /root/
ADD app.js /root/

RUN \
   cd /root/ && \
   npm update

ENTRYPOINT ["bash"]

