# TutorTrack - Tuition Management System

A comprehensive system for managing student attendance, billing, and WhatsApp communication.

## Project Structure

The project consists of two main parts:
1. Next.js Frontend (main directory)
2. WhatsApp Server (server directory)

## Deployment Instructions

### 1. Frontend Deployment (Vercel)

1. Push your code to a GitHub repository

2. In Vercel:
   - Connect your GitHub repository
   - Configure environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     NEXT_PUBLIC_WHATSAPP_SERVER_URL=your_whatsapp_server_url
     ```
   - Deploy the project

### 2. WhatsApp Server Deployment

The WhatsApp server requires a dedicated server with persistent storage and system-level access. You can deploy it on platforms like DigitalOcean, AWS EC2, or similar.

1. Set up a server with Node.js installed

2. Clone the repository and navigate to the server directory:
   ```bash
   cd server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a systemd service for automatic startup:
   ```bash
   sudo nano /etc/systemd/system/whatsapp-server.service
   ```
   Add the following content:
   ```ini
   [Unit]
   Description=WhatsApp Server
   After=network.target

   [Service]
   Type=simple
   User=your_username
   WorkingDirectory=/path/to/server
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=3001

   [Install]
   WantedBy=multi-user.target
   ```

5. Enable and start the service:
   ```bash
   sudo systemctl enable whatsapp-server
   sudo systemctl start whatsapp-server
   ```

6. Set up Nginx as a reverse proxy (optional but recommended):
   ```bash
   sudo nano /etc/nginx/sites-available/whatsapp-server
   ```
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. Enable the Nginx site and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/whatsapp-server /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

### Database Setup

1. Create a new project in Supabase

2. Run the migration SQL script in Supabase SQL editor:
   ```sql
   -- Copy contents of migrations/app_versions.sql
   ```

3. Configure RLS policies as needed

## Environment Configuration

### Development
Create `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WHATSAPP_SERVER_URL=http://localhost:3001
```

### Production
Configure the following environment variables in Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WHATSAPP_SERVER_URL=https://your-whatsapp-server-domain.com
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Start the WhatsApp server (in another terminal):
   ```bash
   cd server
   npm run dev
   ```

## Version Management

The system includes a built-in version management system:
1. Admins can manage versions through the Settings page
2. Users receive notifications for updates
3. Critical updates can force users to refresh

## Security Notes

1. Always use HTTPS in production
2. Set up CORS properly on the WhatsApp server
3. Configure Supabase RLS policies appropriately
4. Keep environment variables secure
5. Use strong authentication
