import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './schema';

export const backend = defineBackend({
  auth,
  data
});