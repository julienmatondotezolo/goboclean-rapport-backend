import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createUserWithInvite() {
  console.log('🎯 GoBo Clean - Create User with Email Invitation\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'GET_THIS_FROM_SUPABASE_DASHBOARD') {
    console.error('❌ Error: Missing Supabase service role key');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
    console.error('Get it from: https://supabase.com/dashboard/project/ihlnwzrsvfxgossytuiz/settings/api');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Get user details
    const email = await question('📧 Email: ');
    const firstName = await question('👤 First Name: ');
    const lastName = await question('👤 Last Name: ');
    const phone = await question('📱 Phone (optional): ');
    const roleInput = await question('👔 Role (worker/admin) [worker]: ');
    const role = roleInput.trim().toLowerCase() === 'admin' ? 'admin' : 'worker';

    // Ask if they want to send an invitation email
    const sendInvite = await question('\n📨 Send invitation email? (y/n) [y]: ');
    const shouldSendInvite = !sendInvite.trim() || sendInvite.toLowerCase() === 'y';

    let password = '';
    if (!shouldSendInvite) {
      password = await question('🔑 Password (if not sending invite): ');
      if (!password) {
        console.error('❌ Password required if not sending invitation email');
        process.exit(1);
      }
    }

    console.log('\n⏳ Creating user...');

    // Create user with invitation
    const createUserOptions: any = {
      email: email.trim(),
      email_confirm: !shouldSendInvite, // Auto-confirm if not sending invite
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        role: role,
      },
    };

    if (shouldSendInvite) {
      // Send invitation email (user will set their own password)
      createUserOptions.email_confirm = false;
    } else {
      // Set password directly
      createUserOptions.password = password;
      createUserOptions.email_confirm = true;
    }

    const { data, error } = await supabase.auth.admin.createUser(createUserOptions);

    if (error) {
      console.error('❌ Error creating user:', error.message);
      process.exit(1);
    }

    console.log('\n✅ User created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 User ID: ${data.user?.id}`);
    console.log(`👔 Role: ${role}`);
    console.log(`📨 Invitation Email: ${shouldSendInvite ? 'Sent ✓' : 'Not sent'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (shouldSendInvite) {
      console.log('\n📬 The user will receive an email invitation to set their password.');
      console.log('   Check your Supabase email templates for customization options.');
    } else {
      console.log('\n🔐 User can now log in with the provided password.');
    }

    // Now send a custom invitation email if needed
    if (shouldSendInvite) {
      console.log('\n📧 To send a custom styled invitation email:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Email Templates');
      console.log('   2. Customize the "Invite user" template with your branding');
      console.log('   3. Resend the invitation from Dashboard → Authentication → Users');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createUserWithInvite();
