import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import MessageModel, { CreateMessageDTO } from '../models/Message';
import RequestModel from '../models/Request';
import emailService from '../services/emailService';
import { createLogger } from '../utils/logger';
import { isValidEmail } from '../utils/validation';

/**
 * Create a new message
 * @route POST /api/messages
 */
export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  const { request_id, sender_email, content, token } = req.body;

  // Validate required fields
  if (!request_id || !sender_email || !content || !token) {
    throw new ApiError(
      400,
      'Request ID, sender email, content, and token are required',
      'errors:missingFields.message'
    );
  }

  // Validate email address
  if (!isValidEmail(sender_email)) {
    throw new ApiError(400, 'Invalid sender email address', 'errors:invalidSenderEmail');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(request_id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
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

    // Get the preferred language from the request header
    const language = req.language || 'en';

    await emailService.sendMessageNotification(
      recipientEmail,
      request_id,
      senderName,
      request.token,
      language
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
