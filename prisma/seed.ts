import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Generate a master API key
  const apiKey = randomBytes(32).toString('hex');
  const keyHash = await bcrypt.hash(apiKey, 10);

  // Create master API key
  const masterKey = await prisma.apiKey.create({
    data: {
      keyHash,
      name: 'Master API Key',
      serviceName: 'system',
      permissions: { '*': true },
      isActive: true,
    },
  });

  console.log('✅ Created Master API Key:');
  console.log(`   ID: ${masterKey.id}`);
  console.log(`   Key: ${apiKey}`);
  console.log('   ⚠️  SAVE THIS KEY SECURELY! You will need it to access the API.\n');

  // Create sample templates
  const emailTemplate = await prisma.template.create({
    data: {
      name: 'welcome_email',
      channel: 'email',
      subjectTemplate: 'Welcome to {{companyName}}, {{firstName}}!',
      bodyTemplate:
        'Hi {{firstName}},\n\nWelcome to {{companyName}}! We\'re excited to have you on board.\n\nBest regards,\nThe {{companyName}} Team',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to {{companyName}}!</h1>
          <p>Hi {{firstName}},</p>
          <p>Welcome to {{companyName}}! We're excited to have you on board.</p>
          <p>Best regards,<br>The {{companyName}} Team</p>
        </div>
      `,
      variables: ['firstName', 'companyName'],
      isActive: true,
    },
  });

  console.log('✅ Created email template:', emailTemplate.name);

  const smsTemplate = await prisma.template.create({
    data: {
      name: 'verification_sms',
      channel: 'sms',
      bodyTemplate: 'Your {{companyName}} verification code is: {{code}}. Valid for {{expiryMinutes}} minutes.',
      variables: ['companyName', 'code', 'expiryMinutes'],
      isActive: true,
    },
  });

  console.log('✅ Created SMS template:', smsTemplate.name);

  const whatsappTemplate = await prisma.template.create({
    data: {
      name: 'order_confirmation',
      channel: 'whatsapp',
      bodyTemplate:
        'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. Total: ${{amount}}. Expected delivery: {{deliveryDate}}.',
      variables: ['customerName', 'orderNumber', 'amount', 'deliveryDate'],
      isActive: true,
    },
  });

  console.log('✅ Created WhatsApp template:', whatsappTemplate.name);

  // Create sample contact
  const sampleContact = await prisma.contact.create({
    data: {
      email: 'sample@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      metadata: {
        source: 'seed',
        createdBy: 'system',
      },
      preferences: {
        preferredChannel: 'email',
        optOutSms: false,
        optOutEmail: false,
        optOutWhatsapp: false,
      },
    },
  });

  console.log('✅ Created sample contact:', sampleContact.email);

  // Create a demo API key for testing
  const demoApiKey = randomBytes(32).toString('hex');
  const demoKeyHash = await bcrypt.hash(demoApiKey, 10);

  const demoKey = await prisma.apiKey.create({
    data: {
      keyHash: demoKeyHash,
      name: 'Demo API Key',
      serviceName: 'demo-app',
      permissions: {
        'messages:send': true,
        'messages:read': true,
        'contacts:read': true,
        'contacts:write': true,
      },
      isActive: true,
    },
  });

  console.log('\n✅ Created Demo API Key:');
  console.log(`   ID: ${demoKey.id}`);
  console.log(`   Key: ${demoApiKey}`);
  console.log('   Permissions: Limited (messages, contacts)');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Next steps:');
  console.log('1. Save your API keys securely');
  console.log('2. Start the API server: npm run dev');
  console.log('3. Test the API: curl http://localhost:3000/api/v1/health');
  console.log('4. Send a test message using the examples in examples/');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
