// Configuration for different environments
const config = {
  // WhatsApp server URL - Use rewrite path in production, direct URL in development
  whatsappServer: process.env.NODE_ENV === 'production' 
    ? '/whatsapp-api'
    : process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3001',
  
  // Connection settings
  connection: {
    statusCheckInterval: 3000, // 3 seconds between status checks
    maxRetries: 100, // Allow more retries for longer connection window
  },
  
  // Version check interval (in milliseconds)
  versionCheckInterval: 30 * 60 * 1000, // 30 minutes
}

export default config
