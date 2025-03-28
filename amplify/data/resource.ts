import { defineData } from '@aws-amplify/backend';

// Define GraphQL schema as a string
const schemaSDL = `
  type Request @model @auth(rules: [{allow: public}]) {
    id: ID!
    publisher_email: String!
    requester_email: String!
    requester_name: String!
    publisher_name: String
    publisher_domain: String
    status: String!
    token: String!
    created_at: AWSDateTime!
    updated_at: AWSDateTime
    messages: [Message] @hasMany
    adsTxtRecords: [AdsTxtRecord] @hasMany
  }

  type Message @model @auth(rules: [{allow: public}]) {
    id: ID!
    content: String!
    sender_email: String!
    request_id: String!
    created_at: AWSDateTime!
    updated_at: AWSDateTime
    request: Request @belongsTo
  }

  type AdsTxtRecord @model @auth(rules: [{allow: public}]) {
    id: ID!
    domain: String!
    account_id: String!
    account_type: String!
    relationship: String!
    certification_authority_id: String
    status: String!
    request_id: String!
    created_at: AWSDateTime!
    updated_at: AWSDateTime
    request: Request @belongsTo
  }

  type AdsTxtCache @model @auth(rules: [{allow: public}]) {
    id: ID!
    domain: String!
    content: String!
    status: String!
    error_message: String
    last_updated: AWSDateTime!
    created_at: AWSDateTime!
    updated_at: AWSDateTime
  }

  type SellersJsonCache @model @auth(rules: [{allow: public}]) {
    id: ID!
    domain: String!
    content: String!
    status: String!
    error_message: String
    last_updated: AWSDateTime!
    created_at: AWSDateTime!
    updated_at: AWSDateTime
  }
`;

export const data = defineData({
  schema: schemaSDL,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});