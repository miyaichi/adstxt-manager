// Mock for the email service
const emailServiceMock = {
  sendPublisherRequestNotification: jest.fn().mockResolvedValue(true),
  sendRequesterConfirmation: jest.fn().mockResolvedValue(true),
  sendStatusUpdateNotification: jest.fn().mockResolvedValue(true),
  sendMessageNotification: jest.fn().mockResolvedValue(true)
};

// Export the mock for use in tests
export default emailServiceMock;