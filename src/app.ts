import express from 'express';
import mongoose from 'mongoose';
import reportsRouter from './routes/reports';

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error', err));

app.get('/health', (_, res) => res.json({ status: 'healthy' }));
app.use('/api/reports', reportsRouter);

export default app;