FROM ghcr.io/puppeteer/puppeteer:21.5.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Set up directories and permissions first
RUN mkdir -p /usr/src/app && \
    chown -R root:root /usr/src/app && \
    chmod -R 755 /usr/src/app && \
    mkdir -p /.npm && \
    chown -R root:root /.npm && \
    chmod -R 755 /.npm

# Copy package files and install dependencies from server directory
COPY server/package*.json ./

# Install dependencies with correct permissions
RUN npm install --unsafe-perm

# Copy server source code
COPY server/ .

# Build TypeScript
RUN npm run build

# Create a non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && mkdir -p /home/pptruser/.npm \
    && chown -R pptruser:pptruser /home/pptruser/.npm \
    && chown -R pptruser:pptruser /usr/src/app/node_modules \
    && chown -R pptruser:pptruser /usr/src/app

# Switch to non-root user
USER pptruser

# Expose port
EXPOSE 3001

# Start the server with chrome flags
CMD ["node", "dist/index.js", "--no-sandbox", "--disable-setuid-sandbox"]
