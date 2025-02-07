// Configuration for different environments
const config = {
  // WhatsApp server URL
  whatsappServer: process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3001',
  
  // Version check interval (in milliseconds)
  versionCheckInterval: 30 * 60 * 1000, // 30 minutes
  
  // Other environment-specific configurations can be added here
}

export default config
