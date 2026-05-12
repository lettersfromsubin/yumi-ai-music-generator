FROM node:22-slim

WORKDIR /app

ENV PORT=7860

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 7860

CMD ["npm", "run", "start"]
