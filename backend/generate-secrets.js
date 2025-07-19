// JWT Secret Generator Script
// Run this in Node.js to generate secure JWT secrets

const crypto = require('crypto');

console.log('🔐 MAR ABU PROJECTS - JWT Secret Generator\n');

// Method 1: Generate random base64 secrets (Recommended)
const jwtSecret = crypto.randomBytes(64).toString('base64');
const refreshSecret = crypto.randomBytes(64).toString('base64');

console.log('🎯 COPY THESE TO YOUR .env FILE:\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
console.log(`JWT_EXPIRES_IN=24h`);
console.log(`JWT_REFRESH_EXPIRES_IN=30d`);

console.log('\n📋 Alternative Method - Hex Secrets:');
const jwtSecretHex = crypto.randomBytes(32).toString('hex');
const refreshSecretHex = crypto.randomBytes(32).toString('hex');

console.log(`JWT_SECRET=${jwtSecretHex}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecretHex}`);

console.log('\n🔍 What each variable means:');
console.log('JWT_SECRET: Signs access tokens (keep this super secret!)');
console.log('JWT_REFRESH_SECRET: Signs refresh tokens (different from access token secret)');
console.log('JWT_EXPIRES_IN: How long access tokens last (24h = 24 hours)');
console.log('JWT_REFRESH_EXPIRES_IN: How long refresh tokens last (30d = 30 days)');

console.log('\n⚠️  SECURITY NOTES:');
console.log('- Never commit these secrets to version control');
console.log('- Use different secrets for development/staging/production');
console.log('- Store production secrets in secure environment variable services');
console.log('- Rotate secrets periodically in production');