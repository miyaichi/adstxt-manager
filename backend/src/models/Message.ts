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
  /**
   * Create a new message
   * @param messageData - The data for the new message
   * @returns Promise with the created message
   */
  create(messageData: CreateMessageDTO): Promise<Message> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const message: Message = {
        id,
        request_id: messageData.request_id,
        sender_email: messageData.sender_email,
        content: messageData.content,
        created_at: now
      };

      db.run(
        'INSERT INTO messages (id, request_id, sender_email, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [message.id, message.request_id, message.sender_email, message.content, message.created_at],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(message);
        }
      );
    });
  }

  /**
   * Get all messages for a request
   * @param requestId - The request ID
   * @returns Promise with an array of messages
   */
  getByRequestId(requestId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM messages WHERE request_id = ? ORDER BY created_at ASC',
        [requestId],
        (err, rows: Message[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get a message by ID
   * @param id - The message ID
   * @returns Promise with the message or null if not found
   */
  getById(id: string): Promise<Message | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM messages WHERE id = ?',
        [id],
        (err, row: Message) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }
          resolve(row);
        }
      );
    });
  }
}

export default new MessageModel();