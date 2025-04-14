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
   * @param publisherName - The name of the publisher (optional)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendPublisherRequestNotification(
    publisherEmail: string,
    requestId: string,
    requesterName: string,
    requesterEmail: string,
    token: string,
    language: string = 'en',
    role: string = 'publisher',
    publisherName: string = ''
  ) {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Publisher notification language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      publisherEmail,
      publisherName,
      requesterName,
    });

    // Always add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}${langParam}`;

    // Use domain as publisher name if not provided
    const displayPublisherName = publisherName || publisherEmail.split('@')[1] || publisherEmail;

    // Debug translation keys
    const translations = {
      subject: i18next.t('email:request.publisher.subject', { requesterName, lng: validLanguage }),
      title: i18next.t('email:request.publisher.title', { lng: validLanguage }),
      greeting: i18next.t('email:request.publisher.greeting', {
        publisherName: displayPublisherName,
        lng: validLanguage,
      }),
      message: i18next.t('email:request.publisher.message', {
        requesterName,
        requesterEmail,
        lng: validLanguage,
      }),
      action: i18next.t('email:request.publisher.action', { lng: validLanguage }),
      linkText: i18next.t('email:request.publisher.linkText', { lng: validLanguage }),
      warning: i18next.t('email:request.publisher.warning', { lng: validLanguage }),
      signature: i18next.t('email:request.publisher.signature', {
        appUrl: config.server.appUrl,
        lng: validLanguage,
      }),
    };

    const subject = translations.subject;
    const html = `
      <h1>${translations.title}</h1>
      <p>${translations.greeting}</p>
      <p>${translations.message}</p>
      <p>${translations.action}</p>
      <p><a href="${requestUrl}">${translations.linkText}</a></p>
      <p>${translations.warning}</p>
      <p>${translations.signature}</p>
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
    role: string = 'requester',
    publisherName: string = ''
  ) {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Requester confirmation language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      requesterEmail,
      requesterName,
      publisherName,
    });

    // Always add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}${langParam}`;

    // Use domain as publisher name if not provided
    const displayPublisherName = publisherName || publisherEmail.split('@')[1] || publisherEmail;

    // Debug translation keys
    const translations = {
      subject: i18next.t('email:request.requester.subject', { lng: validLanguage }),
      title: i18next.t('email:request.requester.title', { lng: validLanguage }),
      greeting: i18next.t('email:request.requester.greeting', {
        requesterName,
        lng: validLanguage,
      }),
      message: i18next.t('email:request.requester.message', {
        publisherEmail,
        publisherName: displayPublisherName,
        lng: validLanguage,
      }),
      action: i18next.t('email:request.requester.action', { lng: validLanguage }),
      linkText: i18next.t('email:request.requester.linkText', { lng: validLanguage }),
      warning: i18next.t('email:request.requester.warning', { lng: validLanguage }),
      signature: i18next.t('email:request.requester.signature', {
        appUrl: config.server.appUrl,
        lng: validLanguage,
      }),
    };

    const subject = translations.subject;
    const html = `
      <h1>${translations.title}</h1>
      <p>${translations.greeting}</p>
      <p>${translations.message}</p>
      <p>${translations.action}</p>
      <p><a href="${requestUrl}">${translations.linkText}</a></p>
      <p>${translations.warning}</p>
      <p>${translations.signature}</p>
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
   * @param publisherName - The name of the publisher (optional)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendStatusUpdateNotification(
    email: string,
    requestId: string,
    status: string,
    token: string,
    language: string = 'en',
    role: string = 'requester',
    publisherName: string = ''
  ) {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Status update notification language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      email,
      status,
      publisherName,
    });

    // Always add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}${langParam}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    // Use domain as publisher name if not provided
    const displayPublisherName = publisherName || email.split('@')[1] || email;

    // Debug translation keys
    const translations = {
      subject: i18next.t('email:statusUpdate.subject', { status: statusText, lng: validLanguage }),
      title: i18next.t('email:statusUpdate.title', { lng: validLanguage }),
      message: i18next.t('email:statusUpdate.message', {
        status: statusText,
        publisherName: displayPublisherName,
        lng: validLanguage,
      }),
      action: i18next.t('email:statusUpdate.action', { lng: validLanguage }),
      linkText: i18next.t('email:statusUpdate.linkText', { lng: validLanguage }),
      signature: i18next.t('email:statusUpdate.signature', {
        appUrl: config.server.appUrl,
        lng: validLanguage,
      }),
    };

    const subject = translations.subject;
    const html = `
      <h1>${translations.title}</h1>
      <p>${translations.message}</p>
      <p>${translations.action}</p>
      <p><a href="${requestUrl}">${translations.linkText}</a></p>
      <p>${translations.signature}</p>
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
   * @param publisherName - The name of the publisher (optional)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendMessageNotification(
    email: string,
    requestId: string,
    senderName: string,
    token: string,
    language: string = 'en',
    role?: string,
    publisherName: string = ''
  ) {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Message notification language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      recipientEmail: email,
      senderName,
      publisherName,
      availableTranslations: Object.keys(i18next.store.data),
    });

    // If role is not specified, don't add it to the URL to maintain backward compatibility
    const roleParam = role ? `&role=${role}` : '';
    // Always add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}${roleParam}${langParam}`;

    // Use domain as publisher name if not provided
    const displayPublisherName = publisherName || email.split('@')[1] || email;

    // Debug translation keys to ensure they're working
    const translations = {
      subject: i18next.t('email:message.subject', { lng: validLanguage }),
      title: i18next.t('email:message.title', { lng: validLanguage }),
      message: i18next.t('email:message.message', {
        senderName,
        publisherName: displayPublisherName,
        lng: validLanguage,
      }),
      action: i18next.t('email:message.action', { lng: validLanguage }),
      linkText: i18next.t('email:message.linkText', { lng: validLanguage }),
      signature: i18next.t('email:message.signature', {
        appUrl: config.server.appUrl,
        lng: validLanguage,
      }),
    };

    console.log('Email translations:', translations);

    const subject = translations.subject;
    const html = `
      <h1>${translations.title}</h1>
      <p>${translations.message}</p>
      <p>${translations.action}</p>
      <p><a href="${requestUrl}">${translations.linkText}</a></p>
      <p>${translations.signature}</p>
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
   * @param publisherName - The name of the publisher (optional)
   * @returns Promise resolving to the nodemailer info object
   */
  async sendRequestUpdateNotification(
    publisherEmail: string,
    requestId: string,
    requesterName: string,
    requesterEmail: string,
    token: string,
    language: string = 'en',
    role: string = 'publisher',
    publisherName: string = ''
  ) {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Request update notification language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      publisherEmail,
      publisherName,
      requesterName,
    });

    // Always add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;
    const requestUrl = `${config.server.appUrl}/request/${requestId}?token=${token}&role=${role}${langParam}`;

    // Use domain as publisher name if not provided
    const displayPublisherName = publisherName || publisherEmail.split('@')[1] || publisherEmail;

    // Debug translation keys
    const translations = {
      subject: i18next.t('email:request.update.subject', { requesterName, lng: validLanguage }),
      title: i18next.t('email:request.update.title', { lng: validLanguage }),
      greeting: i18next.t('email:request.update.greeting', {
        publisherName: displayPublisherName,
        lng: validLanguage,
      }),
      message: i18next.t('email:request.update.message', {
        requesterName,
        requesterEmail,
        lng: validLanguage,
      }),
      action: i18next.t('email:request.update.action', { lng: validLanguage }),
      linkText: i18next.t('email:request.update.linkText', { lng: validLanguage }),
      warning: i18next.t('email:request.update.warning', { lng: validLanguage }),
      signature: i18next.t('email:request.update.signature', {
        appUrl: config.server.appUrl,
        lng: validLanguage,
      }),
    };

    const subject = translations.subject;
    const html = `
      <h1>${translations.title}</h1>
      <p>${translations.greeting}</p>
      <p>${translations.message}</p>
      <p>${translations.action}</p>
      <p><a href="${requestUrl}">${translations.linkText}</a></p>
      <p>${translations.warning}</p>
      <p>${translations.signature}</p>
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
   * Send an email notification about a contact form submission
   * @param senderEmail - The email address of the person submitting the form
   * @param message - The message content from the contact form
   * @returns Promise resolving to the nodemailer info object
   */
  async sendContactFormEmail(senderEmail: string, message: string) {
    const subject = `New Contact Form Submission from ${senderEmail}`;
    const html = `
      <h1>New Contact Form Submission</h1>
      <p><strong>From:</strong> ${senderEmail}</p>
      <h2>Message:</h2>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: config.email.contactRecipient || config.email.from, // Send to designated contact recipient or fallback to the from address
      replyTo: senderEmail, // Set reply-to as the sender's email for easy response
      subject,
      html,
    };

    return transporter.sendMail(mailOptions);
  }

  /**
   * Send an email verification link for accessing request list
   * @param email - The email address to verify
   * @param token - The verification token
   * @param language - The language code to use for the email
   * @returns Promise resolving to the nodemailer info object
   */
  async sendEmailVerificationLink(email: string, token: string, language: string = 'en') {
    // Validate language before using it
    const validLanguage = ['en', 'ja'].includes(language) ? language : 'en';

    // Debug language selection
    console.log(`Email service - Email verification language: ${validLanguage}`, {
      originalLanguage: language,
      validatedLanguage: validLanguage,
      email,
    });

    // Add language parameter to URL to maintain language across pages
    const langParam = `&lang=${validLanguage}`;

    // リクエスト一覧ページに直接リンクするように設定
    const encodedToken = encodeURIComponent(token);
    const encodedEmail = encodeURIComponent(email);

    // リクエスト一覧ページへリンク
    const verificationUrl = `${config.server.appUrl}/requests?email=${encodedEmail}&token=${encodedToken}${langParam}`;

    // デバッグログ
    console.log(`Verification URL: ${verificationUrl}`);

    const subject = 'メールアドレス確認 - Ads.txt Manager';
    const html = `
      <h1>メールアドレスの確認</h1>
      <p>Ads.txt Managerでリクエスト一覧にアクセスするためのメールアドレス確認です。</p>
      <p>下記のリンクをクリックして、リクエスト一覧にアクセスしてください。</p>
      <p><a href="${verificationUrl}">リクエスト一覧を表示</a></p>
      <p>※このリンクには有効期限があります。期限切れの場合は再度認証をお試しください。</p>
      <p>Ads.txt Manager チーム</p>
    `;

    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject,
      html,
    };

    console.log(`Sending verification email to ${email}`);
    return transporter.sendMail(mailOptions);
  }
}

// Instance of the email service
const emailService = new EmailService();

// Named export for the contact form email function
export const sendContactFormEmail = (senderEmail: string, message: string) => {
  return emailService.sendContactFormEmail(senderEmail, message);
};

export default emailService;
