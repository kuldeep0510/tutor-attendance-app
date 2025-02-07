FROM ghcr.io/puppeteer/puppeteer:21.5.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Copy package files and install dependencies from server directory
COPY server/package*.json ./

# Install dependencies as root
RUN npm install

# Copy server source code
COPY server/ .

# Build TypeScript
RUN npm run build

# Create a non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/src/app

# Set permissions for npm cache and other directories
RUN mkdir -p /home/pptruser/.npm && chown -R pptruser:pptruser /home/pptruser/.npm \
    && mkdir -p /.npm && chown -R pptruser:pptruser /.npm \
    && chown -R pptruser:pptruser /usr/src/app/node_modules

# Switch to non-root user
USER pptruser

# Expose port
EXPOSE 3001

# Start the server with chrome flags
CMD ["node", "dist/index.js", "--no-sandbox", "--disable-setuid-sandbox"]
