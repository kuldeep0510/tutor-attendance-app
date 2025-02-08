FROM node:18-slim

# Install required dependencies for Puppeteer and file system operations
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && apt-get install -y procps \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and session storage
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app/.wwebjs_auth
RUN mkdir -p /usr/src/app/.wwebjs_cache
RUN chmod -R 777 /usr/src/app/.wwebjs_auth
RUN chmod -R 777 /usr/src/app/.wwebjs_cache

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Set cache directories as volumes
VOLUME ["/usr/src/app/.wwebjs_auth", "/usr/src/app/.wwebjs_cache"]

# Use tini as init system to handle signals properly
RUN apt-get update && apt-get install -y tini
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the server
CMD ["node", "dist/index.js"]
