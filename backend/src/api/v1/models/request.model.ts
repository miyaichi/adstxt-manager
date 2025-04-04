/**
 * Interface representing an ads.txt change request
 */
export interface ApiRequest {
  id: string;
  domain: string;
  email: string;
  changes: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}