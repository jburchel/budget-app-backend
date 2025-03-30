import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import dotenv from 'dotenv';

dotenv.config();

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

// Determine Plaid environment based on variable
const plaidEnvironment = PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox;

if (!PLAID_CLIENT_ID) {
  console.error('Error: PLAID_CLIENT_ID is not set in environment variables.');
  // process.exit(1); // Consider exiting if keys are essential for startup
}
if (!PLAID_SECRET) {
  console.error('Error: PLAID_SECRET is not set in environment variables.');
  // process.exit(1);
}

const configuration = new Configuration({
  basePath: plaidEnvironment,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14', // Use a specific Plaid API version
    },
  },
});

const plaidClient = new PlaidApi(configuration);

console.log(`Plaid client configured for ${PLAID_ENV} environment.`);

export default plaidClient; 