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

async function createAdminUser() {
  console.log('🔧 GoBo Clean - Create Admin User\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase configuration');
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
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
    const password = await question('🔑 Password: ');
    const firstName = await question('👤 First Name: ');
    const lastName = await question('👤 Last Name: ');
    const phone = await question('📱 Phone (optional): ');

    console.log('\n⏳ Creating admin user...');

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          role: 'admin',
        },
      });

    if (authError) {
      console.error('❌ Error creating user:', authError.message);
      process.exit(1);
    }

    console.log('✅ User created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 User ID: ${authData.user?.id}`);
    console.log(`👑 Role: admin`);
    console.log('\n✨ The admin user can now log in to the application.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminUser();
