FROM node:16-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"] 