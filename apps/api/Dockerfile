FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm install --workspace=@carbonroute/shared --workspace=@carbonroute/api --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV PORT=43124
EXPOSE 43124

CMD ["npm", "run", "start"]
