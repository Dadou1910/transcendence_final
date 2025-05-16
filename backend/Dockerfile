# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .


# Build TypeScript code
RUN npm run build

# Expose port HTTPS
EXPOSE 443

# Command to start the server
CMD ["npm", "start"]