FROM node:23.3.0-bullseye AS clientbuild

WORKDIR /app
COPY /package.json .
COPY /package-lock.json .
RUN npm install

COPY /src/ ./src
COPY /static/ ./static
COPY /svelte.config.js .
COPY /tsconfig.json .
COPY /vite.config.ts .

RUN npm run build

EXPOSE 5174

ENTRYPOINT ["npm", "run", "host"]