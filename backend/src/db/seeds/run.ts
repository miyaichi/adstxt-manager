import AdsTxtRecordModel from '../../models/AdsTxtRecord';
import MessageModel from '../../models/Message';
import RequestModel from '../../models/Request';
import tokenService from '../../services/tokenService';

async function seedDatabase() {
  console.log('Seeding database with sample data...');
  
  try {
    // Create a sample request
    const requestId = tokenService.generateRequestId();
    const token = tokenService.generateToken(requestId, 'publisher@example.com');
    
    const request = {
      id: requestId,
      publisher_email: 'publisher@example.com',
      requester_email: 'advertiser@example.com',
      requester_name: 'Sample Advertiser',
      publisher_name: 'Sample Publisher',
      publisher_domain: 'example.com',
      status: 'pending',
      token,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert the request directly using SQL to avoid model validation
    await RequestModel.create({
      publisher_email: request.publisher_email,
      requester_email: request.requester_email,
      requester_name: request.requester_name,
      publisher_name: request.publisher_name,
      publisher_domain: request.publisher_domain
    });
    
    // Create sample Ads.txt records
    const records = [
      {
        request_id: requestId,
        domain: 'google.com',
        account_id: 'pub-1234567890',
        account_type: 'DIRECT',
        relationship: 'DIRECT' as const
      },
      {
        request_id: requestId,
        domain: 'adnetwork.com',
        account_id: 'abcd1234',
        account_type: 'RESELLER',
        certification_authority_id: 'f08c47fec0942fa0',
        relationship: 'RESELLER' as const
      }
    ];
    
    await AdsTxtRecordModel.bulkCreate(records);
    
    // Create sample messages
    await MessageModel.create({
      request_id: requestId,
      sender_email: 'advertiser@example.com',
      content: 'Please review our request to update your Ads.txt file.'
    });
    
    await MessageModel.create({
      request_id: requestId,
      sender_email: 'publisher@example.com',
      content: 'I\'ve reviewed the request and will approve it soon.'
    });
    
    console.log('Database seeded successfully');
    console.log(`Sample request created with ID: ${requestId}`);
    console.log(`Access token for the request: ${token}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed when script is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;