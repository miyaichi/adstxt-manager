import config from '../config/config';
import transporter from '../config/email';
import i18next from '../i18n';

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
   * @param language - The language code to use for the email
   * @param role - The role of the recipient (publisher)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendPublisherRequestNotification(
    publisherEmail: string,
    requestId: string,
    requesterName: string,
    requesterEmail: string,
    token: string,
    language: string = 'en',
    role: string = 'publisher'
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}`;

    const subject = i18next.t('email:request.publisher.subject', { requesterName, lng: language });
    const html = `
      <h1>${i18next.t('email:request.publisher.title', { lng: language })}</h1>
      <p>${i18next.t('email:request.publisher.greeting', { lng: language })}</p>
      <p>${i18next.t('email:request.publisher.message', { requesterName, requesterEmail, lng: language })}</p>
      <p>${i18next.t('email:request.publisher.action', { lng: language })}</p>
      <p><a href="${requestUrl}">${i18next.t('email:request.publisher.linkText', { lng: language })}</a></p>
      <p>${i18next.t('email:request.publisher.warning', { lng: language })}</p>
      <p>${i18next.t('email:request.publisher.signature', { lng: language })}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: publisherEmail,
      subject,
      html,
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
   * @param language - The language code to use for the email
   * @param role - The role of the recipient (requester)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendRequesterConfirmation(
    requesterEmail: string,
    requesterName: string,
    publisherEmail: string,
    requestId: string,
    token: string,
    language: string = 'en',
    role: string = 'requester'
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}`;

    const subject = i18next.t('email:request.requester.subject', { lng: language });
    const html = `
      <h1>${i18next.t('email:request.requester.title', { lng: language })}</h1>
      <p>${i18next.t('email:request.requester.greeting', { requesterName, lng: language })}</p>
      <p>${i18next.t('email:request.requester.message', { publisherEmail, lng: language })}</p>
      <p>${i18next.t('email:request.requester.action', { lng: language })}</p>
      <p><a href="${requestUrl}">${i18next.t('email:request.requester.linkText', { lng: language })}</a></p>
      <p>${i18next.t('email:request.requester.warning', { lng: language })}</p>
      <p>${i18next.t('email:request.requester.signature', { lng: language })}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: requesterEmail,
      subject,
      html,
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email about a status change
   * @param email - The recipient's email address
   * @param requestId - The ID of the request
   * @param status - The new status
   * @param token - The secure token for accessing the request
   * @param language - The language code to use for the email
   * @param role - The role of the recipient
   * @returns Promise resolving to the nodemailer info object
   */
  async sendStatusUpdateNotification(
    email: string,
    requestId: string,
    status: string,
    token: string,
    language: string = 'en',
    role: string = 'requester'
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    const subject = i18next.t('email:statusUpdate.subject', { status: statusText, lng: language });
    const html = `
      <h1>${i18next.t('email:statusUpdate.title', { lng: language })}</h1>
      <p>${i18next.t('email:statusUpdate.message', { status: statusText, lng: language })}</p>
      <p>${i18next.t('email:statusUpdate.action', { lng: language })}</p>
      <p><a href="${requestUrl}">${i18next.t('email:statusUpdate.linkText', { lng: language })}</a></p>
      <p>${i18next.t('email:statusUpdate.signature', { lng: language })}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject,
      html,
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email about a new message
   * @param email - The recipient's email address
   * @param requestId - The ID of the request
   * @param senderName - The name of the message sender
   * @param token - The secure token for accessing the request
   * @param language - The language code to use for the email
   * @param role - The role of the recipient
   * @returns Promise resolving to the nodemailer info object
   */
  async sendMessageNotification(
    email: string,
    requestId: string,
    senderName: string,
    token: string,
    language: string = 'en',
    role?: string
  ) {
    // If role is not specified, don't add it to the URL to maintain backward compatibility
    const roleParam = role ? `&role=${role}` : '';
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}${roleParam}`;

    const subject = i18next.t('email:message.subject', { lng: language });
    const html = `
      <h1>${i18next.t('email:message.title', { lng: language })}</h1>
      <p>${i18next.t('email:message.message', { senderName, lng: language })}</p>
      <p>${i18next.t('email:message.action', { lng: language })}</p>
      <p><a href="${requestUrl}">${i18next.t('email:message.linkText', { lng: language })}</a></p>
      <p>${i18next.t('email:message.signature', { lng: language })}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject,
      html,
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send a notification email about a request update
   * @param publisherEmail - The publisher's email address
   * @param requestId - The ID of the request
   * @param requesterName - The name of the requester
   * @param requesterEmail - The email of the requester
   * @param token - The secure token for accessing the request
   * @param language - The language code to use for the email
   * @param role - The role of the recipient (publisher)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendRequestUpdateNotification(
    publisherEmail: string,
    requestId: string,
    requesterName: string,
    requesterEmail: string,
    token: string,
    language: string = 'en',
    role: string = 'publisher'
  ) {
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}`;

    const subject = i18next.t('email:request.update.subject', { requesterName, lng: language });
    const html = `
      <h1>${i18next.t('email:request.update.title', { lng: language })}</h1>
      <p>${i18next.t('email:request.update.greeting', { lng: language })}</p>
      <p>${i18next.t('email:request.update.message', { requesterName, requesterEmail, lng: language })}</p>
      <p>${i18next.t('email:request.update.action', { lng: language })}</p>
      <p><a href="${requestUrl}">${i18next.t('email:request.update.linkText', { lng: language })}</a></p>
      <p>${i18next.t('email:request.update.warning', { lng: language })}</p>
      <p>${i18next.t('email:request.update.signature', { lng: language })}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: publisherEmail,
      subject,
      html,
    };

    return transporter.sendMail(mailOptions);
  }
}

export default new EmailService();
