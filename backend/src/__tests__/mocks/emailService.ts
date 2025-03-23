// Mock for the email service
// This export makes Jest not treat this as a test file
export const __IGNORED__ = true;

const emailServiceMock = {
  sendPublisherRequestNotification: jest.fn().mockResolvedValue(true),
  sendRequesterConfirmation: jest.fn().mockResolvedValue(true),
  sendStatusUpdateNotification: jest.fn().mockResolvedValue(true),
  sendMessageNotification: jest.fn().mockResolvedValue(true),
};

// Export the mock for use in tests
export default emailServiceMock;
