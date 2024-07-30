const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let stocks = [];

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/stock', async (req, res) => {
  const { symbol } = req.query;

  if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({ message: 'Invalid stock symbol' });
  }

  try {
    const response = await axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${API_KEY}`);
    const data = response.data;

    if (data['Time Series (1min)']) {
      const timeSeries = data['Time Series (1min)'];
      const stockData = Object.keys(timeSeries).map(key => ({
        timestamp: key,
        price: parseFloat(timeSeries[key]['1. open']),
      }));

      res.json({
        symbol: data['Meta Data']['2. Symbol'],
        name: data['Meta Data']['1. Information'],
        stockData: stockData,
      });
    } else {
      res.status(404).json({ message: 'No data available for this symbol' });
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ message: 'Error fetching stock data' });
  }
});

// Inicia el servidor
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Configurar socket.io
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('stocks', stocks);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
