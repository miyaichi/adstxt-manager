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
      created_at: a.datetime().required(),
      updated_at: a.datetime(),
      // リレーションシップの定義
      messages: a.hasMany('Message'),
      adsTxtRecords: a.hasMany('AdsTxtRecord')
    })
    .authorization((allow) => [allow.apiKey()]),

  Message: a
    .model({
      content: a.string().required(),
      sender_email: a.string().required(),
      request_id: a.string().required(),
      created_at: a.datetime().required(),
      updated_at: a.datetime(),
      // リレーションシップの定義
      request: a.belongsTo('Request')
    })
    .authorization((allow) => [allow.apiKey()]),

  AdsTxtRecord: a
    .model({
      domain: a.string().required(),
      account_id: a.string().required(),
      account_type: a.string().required(),
      relationship: a.string().required(),
      certification_authority_id: a.string(),
      status: a.string().required(),
      request_id: a.string().required(),
      created_at: a.datetime().required(),
      updated_at: a.datetime(),
      // リレーションシップの定義
      request: a.belongsTo('Request')
    })
    .authorization((allow) => [allow.apiKey()]),

  AdsTxtCache: a
    .model({
      domain: a.string().required().indexed(), // インデックス付き検索用
      content: a.string().required(),
      status: a.string().required(),
      error_message: a.string(),
      last_updated: a.datetime().required(),
      created_at: a.datetime().required(),
      updated_at: a.datetime(),
    })
    .authorization((allow) => [allow.apiKey()]),

  SellersJsonCache: a
    .model({
      domain: a.string().required().indexed(), // インデックス付き検索用
      content: a.string().required(),
      status: a.string().required(),
      error_message: a.string(),
      last_updated: a.datetime().required(),
      created_at: a.datetime().required(),
      updated_at: a.datetime(),
    })
    .authorization((allow) => [allow.apiKey()]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365, // APIキーの有効期限を1年に設定
    },
  },
});