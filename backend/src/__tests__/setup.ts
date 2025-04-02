// Jest setup file - not a test suite
import dotenv from 'dotenv';
import i18next from '../i18n';

// This export makes Jest not treat this as a test file
export const __IGNORED__ = true;

// Configure environment for tests
dotenv.config({ path: '.env.test' });

// Mock i18next
jest.mock('../i18n', () => ({
  t: (key: string, options?: any) => {
    // Map known translation keys used in tests
    const translations: Record<string, string> = {
      'errors:domain_required': 'Domain is required',
      'email:request.publisher.subject': 'New Ads.txt Update Request from {{requesterName}}',
      'email:request.requester.subject': 'Your Ads.txt Request Has Been Submitted',
      'email:statusUpdate.subject': 'Ads.txt Request Status: {{status}}',
      'email:message.subject': 'New Message on Ads.txt Request',
      'email:request.publisher.title': 'Ads.txt Update Request',
      'email:request.publisher.greeting': 'Hello,',
      'email:request.publisher.message':
        '{{requesterName}} ({{requesterEmail}}) has requested to update your Ads.txt file',
      'email:request.publisher.action': 'Please review the request by clicking the link below:',
      'email:request.publisher.linkText': 'View Request',
      'email:request.publisher.warning': 'Do not share this link with others.',
      'email:request.publisher.signature': 'Ads.txt Manager Team',
      'email:request.requester.title': 'Ads.txt Update Request Submitted',
      'email:request.requester.greeting': 'Hello {{requesterName}},',
      'email:request.requester.message':
        'Your request to update ads.txt for publisher {{publisherEmail}} has been submitted.',
      'email:request.requester.action':
        'You can track the status of your request by clicking the link below:',
      'email:request.requester.linkText': 'View Request Status',
      'email:request.requester.warning': 'Do not share this link with others.',
      'email:request.requester.signature': 'Ads.txt Manager Team',
      'email:statusUpdate.title': 'Ads.txt Request Status Update',
      'email:statusUpdate.message':
        'Your ads.txt request has been updated to: <strong>{{status}}</strong>',
      'email:statusUpdate.action': 'You can view the details by clicking the link below:',
      'email:statusUpdate.linkText': 'View Request Details',
      'email:statusUpdate.signature': 'Ads.txt Manager Team',
      'email:message.title': 'New Message on Your Ads.txt Request',
      'email:message.message': 'You have received a new message from {{senderName}}',
      'email:message.action': 'You can view the message by clicking the link below:',
      'email:message.linkText': 'View Message',
      'email:message.signature': 'Ads.txt Manager Team',
    };

    // Look up translation or return the key if not found
    const baseKey = key.includes(':') ? key : `common:${key}`;
    let translation = translations[baseKey] || key;

    // Replace any variables
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        translation = translation.replace(`{{${key}}}`, value as string);
      });
    }

    return translation;
  },
  changeLanguage: jest.fn(),
  language: 'en',
  exists: jest.fn().mockReturnValue(true),
  createInstance: jest.fn(),
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(null),
}));

// Global beforeAll hook
beforeAll(() => {
  // Any global setup operations can go here
  console.log('Running tests in test environment');
});

// Global afterAll hook
afterAll(() => {
  // Any global cleanup operations can go here
});

// Setup global mocks if needed
jest.setTimeout(10000); // Set a default timeout for all tests
