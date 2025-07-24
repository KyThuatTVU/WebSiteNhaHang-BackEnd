// Server Entry Point - Enterprise Architecture
const App = require('./app');

// Create application instance
const appInstance = new App();

// For local development
if (require.main === module) {
  // Start application directly when this file is run directly
  appInstance.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

// For Vercel serverless deployment
module.exports = (req, res) => {
  // Initialize the app if not already initialized
  if (!global.appInitialized) {
    appInstance.app.listen = () => {}; // Override listen to do nothing in serverless
    appInstance.start().catch(error => {
      console.error('Failed to initialize application:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to initialize application',
        error: error.message
      });
    });
    global.appInitialized = true;
  }

  // Handle the request with the Express app
  return appInstance.app(req, res);
};
