FROM node:20-alpine
WORKDIR /app
COPY . .
RUN cd web && npm install
RUN cd web && npx prisma generate --schema=../prisma/schema.prisma
RUN cd web && npm run build
EXPOSE 3000
CMD ["sh", "-c", "cd web && npm run docker-start"]
