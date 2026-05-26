const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./src/routes/auth'));
app.use('/plans', require('./src/routes/plans'));
app.use('/customers', require('./src/routes/customers'));
app.use('/subscriptions', require('./src/routes/subscriptions'));
app.use('/payments', require('./src/routes/payments'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('SubMan API running on port ' + PORT);
});
