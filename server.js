// Server Entry Point - Enterprise Architecture
const App = require('./app');

// Create and start application
const app = new App();
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
