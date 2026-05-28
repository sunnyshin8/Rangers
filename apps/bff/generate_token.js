import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'leak-radar-dev-secret-change-in-production-min-32-chars';
const token = jwt.sign({ sub: 'admin', tenantId: 'demo', email: 'admin@demo.local', role: 'admin' }, secret, { expiresIn: '1h' });
console.log(token);
