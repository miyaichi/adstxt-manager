/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateRequestInput = {
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  status: string;
  token: string;
  created_at: string;
  updated_at?: string | null;
};

export type ModelRequestConditionInput = {
  publisher_email?: ModelStringInput | null;
  requester_email?: ModelStringInput | null;
  requester_name?: ModelStringInput | null;
  publisher_name?: ModelStringInput | null;
  publisher_domain?: ModelStringInput | null;
  status?: ModelStringInput | null;
  token?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelRequestConditionInput | null> | null;
  or?: Array<ModelRequestConditionInput | null> | null;
  not?: ModelRequestConditionInput | null;
};

export type ModelStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}

export type ModelSizeInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
};

export type Request = {
  __typename: "Request";
  id: string;
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  status: string;
  token: string;
  created_at: string;
  updated_at?: string | null;
  messages?: ModelMessageConnection | null;
  adsTxtRecords?: ModelAdsTxtRecordConnection | null;
  createdAt: string;
  updatedAt: string;
};

export type ModelMessageConnection = {
  __typename: "ModelMessageConnection";
  items: Array<Message | null>;
  nextToken?: string | null;
};

export type Message = {
  __typename: "Message";
  id: string;
  content: string;
  sender_email: string;
  request_id: string;
  created_at: string;
  updated_at?: string | null;
  request?: Request | null;
  createdAt: string;
  updatedAt: string;
};

export type ModelAdsTxtRecordConnection = {
  __typename: "ModelAdsTxtRecordConnection";
  items: Array<AdsTxtRecord | null>;
  nextToken?: string | null;
};

export type AdsTxtRecord = {
  __typename: "AdsTxtRecord";
  id: string;
  domain: string;
  account_id: string;
  account_type: string;
  relationship: string;
  certification_authority_id?: string | null;
  status: string;
  request_id: string;
  created_at: string;
  updated_at?: string | null;
  request?: Request | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateRequestInput = {
  id: string;
  publisher_email?: string | null;
  requester_email?: string | null;
  requester_name?: string | null;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  status?: string | null;
  token?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeleteRequestInput = {
  id: string;
};

export type CreateMessageInput = {
  content: string;
  sender_email: string;
  request_id: string;
  created_at: string;
  updated_at?: string | null;
};

export type ModelMessageConditionInput = {
  content?: ModelStringInput | null;
  sender_email?: ModelStringInput | null;
  request_id?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelMessageConditionInput | null> | null;
  or?: Array<ModelMessageConditionInput | null> | null;
  not?: ModelMessageConditionInput | null;
};

export type UpdateMessageInput = {
  id: string;
  content?: string | null;
  sender_email?: string | null;
  request_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeleteMessageInput = {
  id: string;
};

export type CreateAdsTxtRecordInput = {
  domain: string;
  account_id: string;
  account_type: string;
  relationship: string;
  certification_authority_id?: string | null;
  status: string;
  request_id: string;
  created_at: string;
  updated_at?: string | null;
};

export type ModelAdsTxtRecordConditionInput = {
  domain?: ModelStringInput | null;
  account_id?: ModelStringInput | null;
  account_type?: ModelStringInput | null;
  relationship?: ModelStringInput | null;
  certification_authority_id?: ModelStringInput | null;
  status?: ModelStringInput | null;
  request_id?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelAdsTxtRecordConditionInput | null> | null;
  or?: Array<ModelAdsTxtRecordConditionInput | null> | null;
  not?: ModelAdsTxtRecordConditionInput | null;
};

export type UpdateAdsTxtRecordInput = {
  id: string;
  domain?: string | null;
  account_id?: string | null;
  account_type?: string | null;
  relationship?: string | null;
  certification_authority_id?: string | null;
  status?: string | null;
  request_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeleteAdsTxtRecordInput = {
  id: string;
};

export type CreateAdsTxtCacheInput = {
  domain: string;
  content: string;
  status: string;
  error_message?: string | null;
  last_updated: string;
  created_at: string;
  updated_at?: string | null;
};

export type ModelAdsTxtCacheConditionInput = {
  domain?: ModelStringInput | null;
  content?: ModelStringInput | null;
  status?: ModelStringInput | null;
  error_message?: ModelStringInput | null;
  last_updated?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelAdsTxtCacheConditionInput | null> | null;
  or?: Array<ModelAdsTxtCacheConditionInput | null> | null;
  not?: ModelAdsTxtCacheConditionInput | null;
};

export type AdsTxtCache = {
  __typename: "AdsTxtCache";
  id: string;
  domain: string;
  content: string;
  status: string;
  error_message?: string | null;
  last_updated: string;
  created_at: string;
  updated_at?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateAdsTxtCacheInput = {
  id: string;
  domain?: string | null;
  content?: string | null;
  status?: string | null;
  error_message?: string | null;
  last_updated?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeleteAdsTxtCacheInput = {
  id: string;
};

export type CreateSellersJsonCacheInput = {
  domain: string;
  content: string;
  status: string;
  error_message?: string | null;
  last_updated: string;
  created_at: string;
  updated_at?: string | null;
};

export type ModelSellersJsonCacheConditionInput = {
  domain?: ModelStringInput | null;
  content?: ModelStringInput | null;
  status?: ModelStringInput | null;
  error_message?: ModelStringInput | null;
  last_updated?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelSellersJsonCacheConditionInput | null> | null;
  or?: Array<ModelSellersJsonCacheConditionInput | null> | null;
  not?: ModelSellersJsonCacheConditionInput | null;
};

export type SellersJsonCache = {
  __typename: "SellersJsonCache";
  id: string;
  domain: string;
  content: string;
  status: string;
  error_message?: string | null;
  last_updated: string;
  created_at: string;
  updated_at?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSellersJsonCacheInput = {
  id: string;
  domain?: string | null;
  content?: string | null;
  status?: string | null;
  error_message?: string | null;
  last_updated?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeleteSellersJsonCacheInput = {
  id: string;
};

export type ModelRequestFilterInput = {
  id?: ModelIDInput | null;
  publisher_email?: ModelStringInput | null;
  requester_email?: ModelStringInput | null;
  requester_name?: ModelStringInput | null;
  publisher_name?: ModelStringInput | null;
  publisher_domain?: ModelStringInput | null;
  status?: ModelStringInput | null;
  token?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelRequestFilterInput | null> | null;
  or?: Array<ModelRequestFilterInput | null> | null;
  not?: ModelRequestFilterInput | null;
};

export type ModelIDInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export type ModelRequestConnection = {
  __typename: "ModelRequestConnection";
  items: Array<Request | null>;
  nextToken?: string | null;
};

export type ModelMessageFilterInput = {
  id?: ModelIDInput | null;
  content?: ModelStringInput | null;
  sender_email?: ModelStringInput | null;
  request_id?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelMessageFilterInput | null> | null;
  or?: Array<ModelMessageFilterInput | null> | null;
  not?: ModelMessageFilterInput | null;
};

export type ModelAdsTxtRecordFilterInput = {
  id?: ModelIDInput | null;
  domain?: ModelStringInput | null;
  account_id?: ModelStringInput | null;
  account_type?: ModelStringInput | null;
  relationship?: ModelStringInput | null;
  certification_authority_id?: ModelStringInput | null;
  status?: ModelStringInput | null;
  request_id?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelAdsTxtRecordFilterInput | null> | null;
  or?: Array<ModelAdsTxtRecordFilterInput | null> | null;
  not?: ModelAdsTxtRecordFilterInput | null;
};

export type ModelAdsTxtCacheFilterInput = {
  id?: ModelIDInput | null;
  domain?: ModelStringInput | null;
  content?: ModelStringInput | null;
  status?: ModelStringInput | null;
  error_message?: ModelStringInput | null;
  last_updated?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelAdsTxtCacheFilterInput | null> | null;
  or?: Array<ModelAdsTxtCacheFilterInput | null> | null;
  not?: ModelAdsTxtCacheFilterInput | null;
};

export type ModelAdsTxtCacheConnection = {
  __typename: "ModelAdsTxtCacheConnection";
  items: Array<AdsTxtCache | null>;
  nextToken?: string | null;
};

export type ModelSellersJsonCacheFilterInput = {
  id?: ModelIDInput | null;
  domain?: ModelStringInput | null;
  content?: ModelStringInput | null;
  status?: ModelStringInput | null;
  error_message?: ModelStringInput | null;
  last_updated?: ModelStringInput | null;
  created_at?: ModelStringInput | null;
  updated_at?: ModelStringInput | null;
  and?: Array<ModelSellersJsonCacheFilterInput | null> | null;
  or?: Array<ModelSellersJsonCacheFilterInput | null> | null;
  not?: ModelSellersJsonCacheFilterInput | null;
};

export type ModelSellersJsonCacheConnection = {
  __typename: "ModelSellersJsonCacheConnection";
  items: Array<SellersJsonCache | null>;
  nextToken?: string | null;
};

export type ModelStringKeyConditionInput = {
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export type QueryAdsTxtCacheByDomainQueryVariables = {
  domain: string;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelAdsTxtCacheFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type QueryAdsTxtCacheByDomainQuery = {
  adsTxtCacheByDomain?: {
    __typename: "ModelAdsTxtCacheConnection";
    items: Array<{
      __typename: "AdsTxtCache";
      id: string;
      domain: string;
      content: string;
      status: string;
      error_message?: string | null;
      last_updated: string;
      created_at: string;
      updated_at?: string | null;
      createdAt: string;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type QuerySellersJsonCacheByDomainQueryVariables = {
  domain: string;
  sortDirection?: ModelSortDirection | null;
  filter?: ModelSellersJsonCacheFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type QuerySellersJsonCacheByDomainQuery = {
  sellersJsonCacheByDomain?: {
    __typename: "ModelSellersJsonCacheConnection";
    items: Array<{
      __typename: "SellersJsonCache";
      id: string;
      domain: string;
      content: string;
      status: string;
      error_message?: string | null;
      last_updated: string;
      created_at: string;
      updated_at?: string | null;
      createdAt: string;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

// GraphQLクエリとミューテーションの文字列定義
export const createRequest = /* GraphQL */ `
  mutation CreateRequest(
    $input: CreateRequestInput!
    $condition: ModelRequestConditionInput
  ) {
    createRequest(input: $input, condition: $condition) {
      id
      publisher_email
      requester_email
      requester_name
      publisher_name
      publisher_domain
      status
      token
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const updateRequest = /* GraphQL */ `
  mutation UpdateRequest(
    $input: UpdateRequestInput!
    $condition: ModelRequestConditionInput
  ) {
    updateRequest(input: $input, condition: $condition) {
      id
      publisher_email
      requester_email
      requester_name
      publisher_name
      publisher_domain
      status
      token
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const createMessage = /* GraphQL */ `
  mutation CreateMessage(
    $input: CreateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    createMessage(input: $input, condition: $condition) {
      id
      content
      sender_email
      request_id
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const createAdsTxtRecord = /* GraphQL */ `
  mutation CreateAdsTxtRecord(
    $input: CreateAdsTxtRecordInput!
    $condition: ModelAdsTxtRecordConditionInput
  ) {
    createAdsTxtRecord(input: $input, condition: $condition) {
      id
      domain
      account_id
      account_type
      relationship
      certification_authority_id
      status
      request_id
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const updateAdsTxtRecord = /* GraphQL */ `
  mutation UpdateAdsTxtRecord(
    $input: UpdateAdsTxtRecordInput!
    $condition: ModelAdsTxtRecordConditionInput
  ) {
    updateAdsTxtRecord(input: $input, condition: $condition) {
      id
      domain
      account_id
      account_type
      relationship
      certification_authority_id
      status
      request_id
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const createAdsTxtCache = /* GraphQL */ `
  mutation CreateAdsTxtCache(
    $input: CreateAdsTxtCacheInput!
    $condition: ModelAdsTxtCacheConditionInput
  ) {
    createAdsTxtCache(input: $input, condition: $condition) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const updateAdsTxtCache = /* GraphQL */ `
  mutation UpdateAdsTxtCache(
    $input: UpdateAdsTxtCacheInput!
    $condition: ModelAdsTxtCacheConditionInput
  ) {
    updateAdsTxtCache(input: $input, condition: $condition) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const createSellersJsonCache = /* GraphQL */ `
  mutation CreateSellersJsonCache(
    $input: CreateSellersJsonCacheInput!
    $condition: ModelSellersJsonCacheConditionInput
  ) {
    createSellersJsonCache(input: $input, condition: $condition) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const updateSellersJsonCache = /* GraphQL */ `
  mutation UpdateSellersJsonCache(
    $input: UpdateSellersJsonCacheInput!
    $condition: ModelSellersJsonCacheConditionInput
  ) {
    updateSellersJsonCache(input: $input, condition: $condition) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const getRequest = /* GraphQL */ `
  query GetRequest($id: ID!) {
    getRequest(id: $id) {
      id
      publisher_email
      requester_email
      requester_name
      publisher_name
      publisher_domain
      status
      token
      created_at
      updated_at
      messages {
        items {
          id
          content
          sender_email
          request_id
          created_at
          updated_at
          createdAt
          updatedAt
        }
        nextToken
      }
      adsTxtRecords {
        items {
          id
          domain
          account_id
          account_type
          relationship
          certification_authority_id
          status
          request_id
          created_at
          updated_at
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`;

export const listRequests = /* GraphQL */ `
  query ListRequests(
    $filter: ModelRequestFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listRequests(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        publisher_email
        requester_email
        requester_name
        publisher_name
        publisher_domain
        status
        token
        created_at
        updated_at
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const getMessage = /* GraphQL */ `
  query GetMessage($id: ID!) {
    getMessage(id: $id) {
      id
      content
      sender_email
      request_id
      created_at
      updated_at
      request {
        id
        publisher_email
        requester_email
        requester_name
        publisher_name
        publisher_domain
        status
        token
        created_at
        updated_at
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const listMessages = /* GraphQL */ `
  query ListMessages(
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        content
        sender_email
        request_id
        created_at
        updated_at
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const getAdsTxtCache = /* GraphQL */ `
  query GetAdsTxtCache($id: ID!) {
    getAdsTxtCache(id: $id) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const adsTxtCacheByDomain = /* GraphQL */ `
  query AdsTxtCacheByDomain(
    $domain: String!
    $sortDirection: ModelSortDirection
    $filter: ModelAdsTxtCacheFilterInput
    $limit: Int
    $nextToken: String
  ) {
    adsTxtCacheByDomain(
      domain: $domain
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        domain
        content
        status
        error_message
        last_updated
        created_at
        updated_at
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export const getSellersJsonCache = /* GraphQL */ `
  query GetSellersJsonCache($id: ID!) {
    getSellersJsonCache(id: $id) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
      createdAt
      updatedAt
    }
  }
`;

export const sellersJsonCacheByDomain = /* GraphQL */ `
  query SellersJsonCacheByDomain(
    $domain: String!
    $sortDirection: ModelSortDirection
    $filter: ModelSellersJsonCacheFilterInput
    $limit: Int
    $nextToken: String
  ) {
    sellersJsonCacheByDomain(
      domain: $domain
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        domain
        content
        status
        error_message
        last_updated
        created_at
        updated_at
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;