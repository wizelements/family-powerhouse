#!/usr/bin/env node

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

function checkEnvVars() {
  const missing = [];
  const present = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (process.env[envVar]) {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  console.log('\n🔍 Environment Variable Check\n');

  if (present.length > 0) {
    console.log('✅ Present:');
    for (const envVar of present) {
      console.log(`   - ${envVar}`);
    }
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing:');
    for (const envVar of missing) {
      console.log(`   - ${envVar}`);
    }
    console.log('\n💡 Tip: Copy .env.example to .env.local and fill in the values.\n');
    process.exit(1);
  }

  console.log('\n✨ All required environment variables are set!\n');
  process.exit(0);
}

checkEnvVars();
