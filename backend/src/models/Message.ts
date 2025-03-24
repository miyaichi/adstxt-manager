import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export interface Message {
  id: string;
  request_id: string;
  sender_email: string;
  content: string;
  created_at: string;
}

export interface CreateMessageDTO {
  request_id: string;
  sender_email: string;
  content: string;
}

class MessageModel {
  private readonly tableName = 'messages';

  /**
   * Create a new message
   * @param messageData - The data for the new message
   * @returns Promise with the created message
   */
  async create(messageData: CreateMessageDTO): Promise<Message> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const message: Message = {
      id,
      request_id: messageData.request_id,
      sender_email: messageData.sender_email,
      content: messageData.content,
      created_at: now,
    };

    return await (db as any).insert(this.tableName, message) as Message;
  }

  /**
   * Get all messages for a request
   * @param requestId - The request ID
   * @returns Promise with an array of messages
   */
  async getByRequestId(requestId: string): Promise<Message[]> {
    return await (db as any).query(this.tableName, {
      where: { request_id: requestId },
      order: { field: 'created_at', direction: 'ASC' }
    }) as Message[];
  }

  /**
   * Get a message by ID
   * @param id - The message ID
   * @returns Promise with the message or null if not found
   */
  async getById(id: string): Promise<Message | null> {
    return await (db as any).getById(this.tableName, id) as Message | null;
  }
}

export default new MessageModel();