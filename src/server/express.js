const express = require('express');
const { fetchTTNList, API_URL, createRequestData } = require('../api/novaPoshta');

const app = express();

// Serve static files from the public directory
app.use(express.static('public'));

// Serve the HTML page at root
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/public/index.html');
});

// SSE endpoint for TTN data
app.get('/events', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client closed connection');
  });

  try {
    // Try to fetch the TTN list
    const ttnList = await fetchTTNList(API_URL, createRequestData());
    // Send the loaded data
    res.write(`data: ${ttnList.replace(/\n/g, '<br>')}\n\n`);
  } catch (error) {
    // Handle errors and send a meaningful response
    res.write(`event: error\ndata: ${error.message}\n\n`);
  } finally {
    // Send a completion event before closing
    res.write('event: complete\ndata: done\n\n');
    res.end();
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
