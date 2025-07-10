import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import MessageModel, { CreateMessageDTO } from '../models/Message';
import RequestModel from '../models/Request';
import emailService from '../services/emailService';
import { createLogger } from '../utils/logger';
import { isValidEmail } from '@adstxt-manager/ads-txt-validator';

/**
 * Create a new message
 * @route POST /api/messages
 */
export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  const { request_id, content, token } = req.body;

  // Validate required fields
  if (!request_id || !content || !token) {
    throw new ApiError(
      400,
      'Request ID, content, and token are required',
      'errors:missingFields.message'
    );
  }

  // Verify the token and request
  const requestResult = await RequestModel.getByIdWithToken(request_id, token);

  if (!requestResult) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  const { request, role } = requestResult;

  // Determine sender email based on token/role
  let sender_email: string;

  if (role === 'publisher') {
    sender_email = request.publisher_email;
  } else if (role === 'requester') {
    sender_email = request.requester_email;
  } else {
    throw new ApiError(400, 'Could not determine sender from token', 'errors:invalidToken');
  }

  // Create the message
  const messageData: CreateMessageDTO = {
    request_id,
    sender_email,
    content,
  };

  const message = await MessageModel.create(messageData);

  // Send email notification to the other party
  try {
    const recipientEmail =
      sender_email === request.publisher_email ? request.requester_email : request.publisher_email;

    const senderName =
      sender_email === request.publisher_email
        ? request.publisher_name || 'Publisher'
        : request.requester_name;

    // Explicitly prioritize query parameter to fix language selection issue
    const queryLang =
      typeof req.query.lang === 'string' && ['en', 'ja'].includes(req.query.lang as string)
        ? (req.query.lang as string)
        : null;
    // Then check i18next detected language
    const i18nextLang = req.language;
    // Then check Accept-Language header
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptLangCode = acceptLanguage.split(',')[0]?.split('-')[0];

    // Determine final language with priority order
    const userLanguage =
      queryLang ||
      (i18nextLang && ['en', 'ja'].includes(i18nextLang) ? i18nextLang : null) ||
      (acceptLangCode && ['en', 'ja'].includes(acceptLangCode) ? acceptLangCode : null) ||
      'en';

    console.log('Message notification language detection (detailed):', {
      urlParam: req.query.lang,
      queryLang,
      i18nextLang: i18nextLang,
      acceptLanguageHeader: acceptLanguage,
      extractedAcceptLang: acceptLangCode,
      finalLanguage: userLanguage,
      explicitly_using: queryLang
        ? 'query parameter'
        : i18nextLang
          ? 'i18next detected'
          : acceptLangCode
            ? 'accept-language header'
            : 'default',
      queryParams: req.query,
      senderEmail: sender_email,
      recipientEmail,
    });

    // Force lang parameter to request object to ensure i18next detects it correctly
    req.query.lang = userLanguage;

    // Determine recipient role and token
    const recipientRole = sender_email === request.publisher_email ? 'requester' : 'publisher';
    const recipientToken =
      recipientRole === 'publisher'
        ? request.publisher_token || request.token || ''
        : request.requester_token || request.token || '';

    await emailService.sendMessageNotification(
      recipientEmail,
      request_id,
      senderName,
      recipientToken,
      userLanguage,
      recipientRole,
      request.publisher_name || ''
    );
  } catch (error) {
    console.error('Error sending message notification email:', error);
    // Continue even if emails fail
  }

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * Get all messages for a request
 * @route GET /api/messages/:requestId
 */
const logger = createLogger('MessageController');

export const getMessagesByRequestId = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { token } = req.query;

  logger.debug('getMessagesByRequestId called with:', {
    requestId,
    token: token?.toString().substring(0, 5) + '...',
  });

  if (!token || typeof token !== 'string') {
    logger.warn('Error: Access token is required');
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(requestId, token);

  if (!request) {
    logger.warn('Error: Request not found or invalid token', { requestId });
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get all messages for the request
  const messages = await MessageModel.getByRequestId(requestId);
  logger.debug(`Found ${messages.length} messages for request ${requestId}`, {
    messageIds: messages.map((m) => m.id),
  });

  res.status(200).json({
    success: true,
    data: messages,
  });
});
