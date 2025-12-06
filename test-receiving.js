require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testReceiving() {
  console.log('Testing Resend Receiving API...\n');

  try {
    // Test 1: List all received emails
    console.log('1. Listing all received emails...');
    const { data: emails, error: listError } = await resend.emails.receiving.list();

    if (listError) {
      console.error('❌ Error listing emails:', listError);
      return;
    }

    console.log('✅ Successfully fetched emails');
    console.log(`Found ${emails?.length || 0} received emails\n`);

    if (emails && emails.length > 0) {
      emails.forEach((email, index) => {
        console.log(`Email ${index + 1}:`);
        console.log(`  ID: ${email.id}`);
        console.log(`  From: ${email.from}`);
        console.log(`  To: ${email.to?.join(', ')}`);
        console.log(`  Subject: ${email.subject || '(no subject)'}`);
        console.log(`  Received: ${email.created_at || email.received_at}`);
        console.log('---');
      });
    } else {
      console.log('ℹ️  No received emails found.');
      console.log('\nPossible reasons:');
      console.log('1. Inbound email routing is not configured in Resend dashboard');
      console.log('2. No emails have been sent to your Resend inbound addresses');
      console.log('3. MX records are not properly configured for your domain');
    }

    // Test 2: Try to get specific email if ID is provided
    const emailId = 'b940d1c2-fd1b-4090-9118-9cdea4ee3d53';
    console.log(`\n2. Trying to fetch specific email: ${emailId}...`);
    const { data: specificEmail, error: getError } = await resend.emails.receiving.get(emailId);

    if (getError) {
      console.error(`❌ Error fetching email ${emailId}:`, getError.message);
    } else if (specificEmail) {
      console.log('✅ Email found:');
      console.log(JSON.stringify(specificEmail, null, 2));
    } else {
      console.log(`❌ Email ${emailId} not found in receiving inbox`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testReceiving();
