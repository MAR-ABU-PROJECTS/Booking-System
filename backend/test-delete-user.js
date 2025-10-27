// Simple test script to verify soft delete functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5050/api/v1';

// You'll need to replace this with an actual admin JWT token
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with real admin token

async function testDeleteCustomerByEmail(email) {
  try {
    console.log(`\n🧪 Testing delete customer by email: ${email}`);
    
    const response = await fetch(`${BASE_URL}/admin/users/by-email/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response:`, JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Customer deleted successfully (soft delete)');
    } else {
      console.log('❌ Delete failed:', result.message);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Test with a customer email (you'll need to use a real customer email from your DB)
// testDeleteCustomerByEmail('test-customer@example.com');

console.log(`
📝 To test the delete API:

1. First, get an admin JWT token by logging in:
   POST ${BASE_URL}/auth/verify-otp?interface=admin

2. Replace ADMIN_TOKEN in this script with the real token

3. Replace 'test-customer@example.com' with a real customer email

4. Uncomment the test line and run:
   node test-delete-user.js

✨ The API will now use SOFT DELETE instead of hard delete!
   - User status will be set to DELETED
   - Personal data will be anonymized  
   - Referential integrity will be preserved
   - Historical bookings will remain intact
`);