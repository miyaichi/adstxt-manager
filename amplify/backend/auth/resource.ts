import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: false,
    username: false,
    externalProviders: {
      google: false,
      apple: false,
      facebook: false,
      amazon: false,
    },
  },
  userAttributes: {
    standard: {
      givenName: {
        required: true,
        mutable: true,
      },
      familyName: {
        required: true,
        mutable: true,
      },
    },
    custom: {
      company: {
        required: false,
        mutable: true,
      },
    },
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
  },
  multifactor: {
    mode: 'OPTIONAL',
    sms: {
      enabled: true,
    },
    totp: {
      enabled: true,
    },
  },
  verificationMessages: {
    email: {
      subject: 'Ads.txt Manager - Verification Code',
    },
    sms: {
      message: 'Your Ads.txt Manager verification code is {####}',
    },
  },
});