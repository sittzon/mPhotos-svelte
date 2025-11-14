FROM node:24.11.1-trixie-slim AS build

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY /package.json .
COPY /package-lock.json .

COPY /src/ ./src
COPY /static/ ./static
COPY /svelte.config.js .
COPY /tsconfig.json .
COPY /vite.config.ts .

RUN npm ci
RUN npm run build

EXPOSE 5174

CMD ["npm", "run", "host"]
