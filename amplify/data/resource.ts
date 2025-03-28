import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Request: a
    .model({
      publisher_email: a.string().required(),
      requester_email: a.string().required(),
      requester_name: a.string().required(),
      publisher_name: a.string(),
      publisher_domain: a.string(),
      status: a.string().required(),
      token: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  Message: a
    .model({
      content: a.string().required(),
      sender_email: a.string().required(),
      requestId: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  AdsTxtRecord: a
    .model({
      domain: a.string().required(),
      account_id: a.string().required(),
      account_type: a.string().required(),
      relationship: a.string().required(),
      certification_authority_id: a.string(),
      status: a.string().required(),
      requestId: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  AdsTxtCache: a
    .model({
      domain: a.string().required(),
      content: a.string().required(),
      status: a.string().required(),
      error_message: a.string(),
      last_updated: a.datetime().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  SellersJsonCache: a
    .model({
      domain: a.string().required(),
      content: a.string().required(),
      status: a.string().required(),
      error_message: a.string(),
      last_updated: a.datetime().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});