import emailService from '../../services/emailService';
import transporter from '../../config/email';
import config from '../../config/config';

// Mock the nodemailer transporter
jest.mock('../../config/email', () => ({
  sendMail: jest.fn().mockImplementation((mailOptions) =>
    Promise.resolve({
      messageId: 'test-message-id',
      envelope: {
        from: mailOptions.from,
        to: [mailOptions.to],
      },
      accepted: [mailOptions.to],
      rejected: [],
      response: '250 Message accepted',
    })
  ),
}));

describe('EmailService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPublisherRequestNotification', () => {
    it('should send a notification email to the publisher', async () => {
      // Arrange
      const publisherEmail = 'publisher@example.com';
      const requestId = 'request-123';
      const requesterName = 'John Doe';
      const requesterEmail = 'johndoe@example.com';
      const token = 'secure-token-123';

      // Act
      const result = await emailService.sendPublisherRequestNotification(
        publisherEmail,
        requestId,
        requesterName,
        requesterEmail,
        token
      );

      // Assert
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = (transporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(mailOptions.from).toBe(`"${config.email.fromName}" <${config.email.from}>`);
      expect(mailOptions.to).toBe(publisherEmail);
      expect(mailOptions.subject).toBe(`New Ads.txt Update Request from ${requesterName}`);
      expect(mailOptions.html).toContain(
        `${requesterName} (${requesterEmail}) has requested to update your Ads.txt file`
      );
      expect(mailOptions.html).toContain(
        `${config.server.appUrl}/request/${requestId}?token=${token}`
      );

      expect(result).toEqual(
        expect.objectContaining({
          messageId: 'test-message-id',
          envelope: expect.any(Object),
          accepted: [publisherEmail],
          rejected: [],
          response: '250 Message accepted',
        })
      );
    });
  });

  describe('sendRequesterConfirmation', () => {
    it('should send a confirmation email to the requester', async () => {
      // Arrange
      const requesterEmail = 'johndoe@example.com';
      const requesterName = 'John Doe';
      const publisherEmail = 'publisher@example.com';
      const requestId = 'request-123';
      const token = 'secure-token-123';

      // Act
      const result = await emailService.sendRequesterConfirmation(
        requesterEmail,
        requesterName,
        publisherEmail,
        requestId,
        token
      );

      // Assert
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = (transporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(mailOptions.from).toBe(`"${config.email.fromName}" <${config.email.from}>`);
      expect(mailOptions.to).toBe(requesterEmail);
      expect(mailOptions.subject).toBe('Your Ads.txt Request Has Been Submitted');
      expect(mailOptions.html).toContain(`Hello ${requesterName}`);
      expect(mailOptions.html).toContain(`publisher ${publisherEmail}`);
      expect(mailOptions.html).toContain(
        `${config.server.appUrl}/request/${requestId}?token=${token}`
      );

      expect(result).toEqual(
        expect.objectContaining({
          messageId: 'test-message-id',
          envelope: expect.any(Object),
          accepted: [requesterEmail],
          rejected: [],
          response: '250 Message accepted',
        })
      );
    });
  });

  describe('sendStatusUpdateNotification', () => {
    it('should send a status update notification email', async () => {
      // Arrange
      const email = 'user@example.com';
      const requestId = 'request-123';
      const status = 'approved';
      const token = 'secure-token-123';

      // Act
      const result = await emailService.sendStatusUpdateNotification(
        email,
        requestId,
        status,
        token
      );

      // Assert
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = (transporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(mailOptions.from).toBe(`"${config.email.fromName}" <${config.email.from}>`);
      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toBe('Ads.txt Request Status: Approved');
      expect(mailOptions.html).toContain('has been updated to: <strong>Approved</strong>');
      expect(mailOptions.html).toContain(
        `${config.server.appUrl}/request/${requestId}?token=${token}`
      );

      expect(result).toEqual(
        expect.objectContaining({
          messageId: 'test-message-id',
          envelope: expect.any(Object),
          accepted: [email],
          rejected: [],
          response: '250 Message accepted',
        })
      );
    });

    it('should properly capitalize the status in the subject and body', async () => {
      // Arrange
      const email = 'user@example.com';
      const requestId = 'request-123';
      const status = 'rejected';
      const token = 'secure-token-123';

      // Act
      await emailService.sendStatusUpdateNotification(email, requestId, status, token);

      // Assert
      const mailOptions = (transporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(mailOptions.subject).toBe('Ads.txt Request Status: Rejected');
      expect(mailOptions.html).toContain('<strong>Rejected</strong>');
    });
  });

  describe('sendMessageNotification', () => {
    it('should send a message notification email', async () => {
      // Arrange
      const email = 'user@example.com';
      const requestId = 'request-123';
      const senderName = 'Jane Smith';
      const token = 'secure-token-123';

      // Act
      const result = await emailService.sendMessageNotification(
        email,
        requestId,
        senderName,
        token
      );

      // Assert
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      const mailOptions = (transporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(mailOptions.from).toBe(`"${config.email.fromName}" <${config.email.from}>`);
      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toBe('New Message on Ads.txt Request');
      expect(mailOptions.html).toContain(`received a new message from ${senderName}`);
      expect(mailOptions.html).toContain(
        `${config.server.appUrl}/request/${requestId}?token=${token}`
      );

      expect(result).toEqual(
        expect.objectContaining({
          messageId: 'test-message-id',
          envelope: expect.any(Object),
          accepted: [email],
          rejected: [],
          response: '250 Message accepted',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from the mail transport', async () => {
      // Arrange
      (transporter.sendMail as jest.Mock).mockRejectedValueOnce(new Error('SMTP error'));

      // Act & Assert
      await expect(
        emailService.sendMessageNotification(
          'user@example.com',
          'request-123',
          'Jane Smith',
          'secure-token-123'
        )
      ).rejects.toThrow('SMTP error');
    });
  });
});
