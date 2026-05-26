FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY index.js ./
EXPOSE 3001
CMD ["node", "index.js"]
