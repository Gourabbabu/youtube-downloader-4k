FROM node:22-alpine

# Install ffmpeg and python3 (required for yt-dlp merging)
RUN apk update && apk add --no-cache ffmpeg python3

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the Astro SSR app
RUN npm run build

# Set environment variables for production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port Astro will run on
EXPOSE 8080

# Start the Node.js standalone server
CMD ["node", "./dist/server/entry.mjs"]
