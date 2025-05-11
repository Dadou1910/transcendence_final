# Stage 1: Build
FROM node:20 as builder

# Set working directory
WORKDIR /app

# Add build argument for API_IP
ARG API_IP
ENV API_IP=$API_IP

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and .env file
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 80 443

# Command to start the server
CMD ["npm", "start"]

# Stage 2: Serve with Nginx over HTTPS
FROM nginx:alpine

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy SSL certificates from the correct path
COPY ssl/cert.pem /etc/ssl/certs/cert.pem
COPY ssl/key.pem /etc/ssl/private/key.pem

# Copy custom Nginx config
COPY nginx-https.conf /etc/nginx/nginx.conf

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]