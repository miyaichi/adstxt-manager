import config from '../config/config';
import transporter from '../config/email';

/**
 * Service to handle email sending functionality
 */
class EmailService {
  /**
   * Send a notification email to a publisher about a new request
   * @param publisherEmail - The recipient's email address
   * @param requesterId - The ID of the requester
   * @param requesterName - The name of the requester
   * @param requesterEmail - The email of the requester
   * @param token - The secure token for accessing the request
   * @returns Promise resolving to the nodemailer info object
   */
  async sendPublisherRequestNotification(
    publisherEmail: string,
    requestId: string,
    requesterName: string,
    requesterEmail: string,
    token: string
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}`;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: publisherEmail,
      subject: `New Ads.txt Update Request from ${requesterName}`,
      html: `
        <h1>New Ads.txt Update Request</h1>
        <p>Dear Publisher,</p>
        <p>${requesterName} (${requesterEmail}) has requested to update your Ads.txt file.</p>
        <p>To review this request, please click the link below:</p>
        <p><a href="${requestUrl}">View Request</a></p>
        <p>This link is unique to you and should not be shared with others.</p>
        <p>Thank you,<br>Ads.txt Manager</p>
      `
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email to a requester that their request has been submitted
   * @param requesterEmail - The recipient's email address
   * @param requesterName - The name of the requester
   * @param publisherEmail - The email of the publisher
   * @param requestId - The ID of the request
   * @param token - The secure token for accessing the request
   * @returns Promise resolving to the nodemailer info object
   */
  async sendRequesterConfirmation(
    requesterEmail: string,
    requesterName: string,
    publisherEmail: string,
    requestId: string,
    token: string
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}`;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: requesterEmail,
      subject: `Your Ads.txt Request Has Been Submitted`,
      html: `
        <h1>Ads.txt Update Request Submitted</h1>
        <p>Hello ${requesterName},</p>
        <p>Your request to update the Ads.txt file for publisher ${publisherEmail} has been submitted successfully.</p>
        <p>You can track the status of your request using the link below:</p>
        <p><a href="${requestUrl}">View Request Status</a></p>
        <p>This link is unique to you and should not be shared with others.</p>
        <p>Thank you,<br>Ads.txt Manager</p>
      `
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email about a status change
   * @param email - The recipient's email address
   * @param requestId - The ID of the request
   * @param status - The new status
   * @param token - The secure token for accessing the request
   * @returns Promise resolving to the nodemailer info object
   */
  async sendStatusUpdateNotification(
    email: string,
    requestId: string,
    status: string,
    token: string
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject: `Ads.txt Request Status: ${statusText}`,
      html: `
        <h1>Ads.txt Request Status Update</h1>
        <p>The status of an Ads.txt request has been updated to: <strong>${statusText}</strong>.</p>
        <p>To view the request details, please click the link below:</p>
        <p><a href="${requestUrl}">View Request</a></p>
        <p>Thank you,<br>Ads.txt Manager</p>
      `
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email about a new message
   * @param email - The recipient's email address
   * @param requestId - The ID of the request
   * @param senderName - The name of the message sender
   * @param token - The secure token for accessing the request
   * @returns Promise resolving to the nodemailer info object
   */
  async sendMessageNotification(
    email: string,
    requestId: string,
    senderName: string,
    token: string
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}`;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject: `New Message on Ads.txt Request`,
      html: `
        <h1>New Message Received</h1>
        <p>You have received a new message from ${senderName} regarding an Ads.txt request.</p>
        <p>To view the message, please click the link below:</p>
        <p><a href="${requestUrl}">View Message</a></p>
        <p>Thank you,<br>Ads.txt Manager</p>
      `
    };

    return transporter.sendMail(mailOptions);
  }
}

export default new EmailService();