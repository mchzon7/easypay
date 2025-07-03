require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const flash = require('connect-flash');
const methodOverride = require('method-override');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cardRoutes = require('./routes/cardRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Connect to database
const connectDB = require('./config/db');
connectDB();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(
  session({
    secret: "faucet",
    resave: false,
    saveUninitialized: false,
  })
);


// Flash messages
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/payments', paymentRoutes);
app.use('/cards', cardRoutes);
app.use('/transactions', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err.message });
});

app.locals.getBankName = (code) => {
  const banks = {
    '033': 'UBA',
    '063': 'Access Bank',
    '050': 'Ecobank',
    '070': 'Fidelity',
    '011': 'First Bank',
    '214': 'FCMB',
    '058': 'GTB',
    '030': 'Heritage',
    '301': 'Jaiz',
    '082': 'Keystone',
    '076': 'Polaris',
    '101': 'Providus',
    '221': 'Stanbic',
    '068': 'Standard Chartered',
    '232': 'Sterling',
    '100': 'Suntrust',
    '032': 'Union',
    '215': 'Unity',
    '035': 'Wema',
    '057': 'Zenith'
  };
  return banks[code] || 'Unknown Bank';
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));