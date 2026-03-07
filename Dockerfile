FROM node:20-alpine
WORKDIR /app
COPY . .
RUN cd web && npm install
RUN cd web && npx prisma generate --schema=../prisma/schema.prisma
RUN cd web && npm run build
EXPOSE 3000
CMD ["sh", "-c", "cd web && npx prisma migrate deploy --schema=../prisma/schema.prisma && npm run docker-start"]
