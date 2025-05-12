FROM node:latest

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
WORKDIR /app
RUN npm install

COPY server.js /app/server.js
COPY public/ /app/public
COPY mail_templates/ /app/mail_templates

ENTRYPOINT ["node", "server.js"]
