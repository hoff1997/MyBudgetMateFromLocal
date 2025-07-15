# My Budget Mate - VS Code Development Setup

## Demo Data File for VS Code Development

I've created a comprehensive `demo-data.json` file containing all the demo data from your Replit application. This includes:

### 📊 Complete Dataset (39 Envelopes + Categories)

**✅ Envelope Categories (7 categories):**
- Income, Essential Expenses, Lifestyle & Discretionary  
- Personal Care & Health, Transportation & Travel
- Utilities & Services, Savings & Investments

**✅ Comprehensive Envelopes (39 total):**
- **5 Income envelopes**: Greg's Salary, Deb's Salary, Bonus, Other Income, Investment Returns
- **8 Essential expenses**: Rent, Groceries, Power, Water, Internet, Phone, Insurance, Rates  
- **7 Lifestyle items**: Entertainment, Dining, Hobbies, Spending, Clothing, Gifts, Coffee
- **5 Personal care**: Healthcare, Dental, Personal Care, Gym, Supplements
- **5 Transportation**: Petrol, Maintenance, Insurance, Registration, Travel
- **4 Utilities**: Banking, Subscriptions, Software, Professional Services
- **5 Savings**: Emergency Fund, House Deposit, KiwiSaver, Investments, Holiday Fund

**✅ Realistic NZ Budget Data:**
- Fortnightly salaries ($3,200 + $2,800)
- Monthly expenses with realistic amounts
- Annual bills and savings goals
- Current balances showing usage patterns
- Due dates and payment frequencies

**✅ Sample Transactions:**
- 3 unmatched transactions for testing reconciliation
- Countdown grocery shopping ($45.67)
- BP petrol station ($65.00)  
- Coffee Club lunch ($25.50)

**✅ Additional Data:**
- Demo user account with NZ settings
- ASB Everyday Account setup
- Transaction labels for categorization
- Monitoring flags for key envelopes

## How to Use This Demo Data in VS Code

### Option 1: Manual Data Population
1. Copy the `demo-data.json` file to your VS Code project
2. Create a data seeding script to populate your database
3. Import the JSON data during development initialization

### Option 2: Database Seeding Script
Create a script in your VS Code project:

```javascript
// scripts/seed-demo-data.js
const fs = require('fs');
const demoData = JSON.parse(fs.readFileSync('./demo-data.json', 'utf8'));

async function seedDatabase() {
  // Create user
  await createUser(demoData.user);
  
  // Create categories
  for (const category of demoData.envelopeCategories) {
    await createEnvelopeCategory(category);
  }
  
  // Create envelopes
  for (const envelope of demoData.envelopes) {
    await createEnvelope(envelope);
  }
  
  // Create accounts and transactions
  for (const account of demoData.accounts) {
    await createAccount(account);
  }
  
  for (const transaction of demoData.transactions) {
    await createTransaction(transaction);
  }
  
  console.log('Demo data seeded successfully!');
}
```

### Option 3: Import Into Storage Layer
Modify your storage implementation to load demo data:

```javascript
// In your storage class constructor or initialization
async initializeDemoData() {
  const demoData = require('./demo-data.json');
  
  // Populate your storage with demo data
  this.users.set(1, demoData.user);
  
  demoData.envelopeCategories.forEach(cat => {
    this.envelopeCategories.set(cat.id, cat);
  });
  
  demoData.envelopes.forEach(env => {
    this.envelopes.set(env.id, env);
  });
  
  // Continue for accounts, transactions, etc.
}
```

## Benefits of This Demo Data

**🎯 Complete Testing Environment:**
- Test all envelope functionality with realistic data
- Verify budget calculations across different frequencies  
- Test transaction reconciliation workflow
- Validate reporting and export features

**💰 Realistic NZ Financial Scenario:**
- Actual New Zealand salary amounts
- Real NZ expense categories and amounts
- Proper frequency patterns (fortnightly pay, monthly bills)
- Realistic savings goals and targets

**📊 Comprehensive Feature Coverage:**
- Income and expense envelope types
- Multiple payment frequencies (weekly/fortnightly/monthly/quarterly/annually)
- Monitoring flags for key envelopes
- Due dates and target amounts
- Opening balances and current balances

Your VS Code development environment will have the exact same rich dataset as your working Replit application!

## File Location
The demo data file is now available as: `demo-data.json`

This gives you complete data portability between Replit and VS Code development environments.