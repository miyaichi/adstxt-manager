/* eslint-disable */
// GraphQLミューテーション定義
export const createRequest = /* GraphQL */ `
  mutation CreateRequest($input: CreateRequestInput!) {
    createRequest(input: $input) {
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
    }
  }
`;

export const updateRequest = /* GraphQL */ `
  mutation UpdateRequest($input: UpdateRequestInput!) {
    updateRequest(input: $input) {
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
    }
  }
`;

export const updateRequestStatus = /* GraphQL */ `
  mutation UpdateRequestStatus($id: ID!, $status: String!, $updated_at: AWSDateTime!) {
    updateRequest(input: {
      id: $id,
      status: $status,
      updated_at: $updated_at
    }) {
      id
      status
      updated_at
    }
  }
`;

export const updatePublisherInfo = /* GraphQL */ `
  mutation UpdatePublisherInfo(
    $id: ID!, 
    $publisher_name: String!, 
    $publisher_domain: String!, 
    $updated_at: AWSDateTime!
  ) {
    updateRequest(input: {
      id: $id,
      publisher_name: $publisher_name,
      publisher_domain: $publisher_domain,
      updated_at: $updated_at
    }) {
      id
      publisher_name
      publisher_domain
      updated_at
    }
  }
`;

export const createMessage = /* GraphQL */ `
  mutation CreateMessage($input: CreateMessageInput!) {
    createMessage(input: $input) {
      id
      content
      sender_email
      request_id
      created_at
      updated_at
    }
  }
`;

export const createAdsTxtRecord = /* GraphQL */ `
  mutation CreateAdsTxtRecord($input: CreateAdsTxtRecordInput!) {
    createAdsTxtRecord(input: $input) {
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
    }
  }
`;

export const updateAdsTxtRecordStatus = /* GraphQL */ `
  mutation UpdateAdsTxtRecordStatus($id: ID!, $status: String!, $updated_at: AWSDateTime!) {
    updateAdsTxtRecord(input: {
      id: $id,
      status: $status,
      updated_at: $updated_at
    }) {
      id
      status
      updated_at
    }
  }
`;

export const createAdsTxtCache = /* GraphQL */ `
  mutation CreateAdsTxtCache($input: CreateAdsTxtCacheInput!) {
    createAdsTxtCache(input: $input) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
    }
  }
`;

export const updateAdsTxtCache = /* GraphQL */ `
  mutation UpdateAdsTxtCache($input: UpdateAdsTxtCacheInput!) {
    updateAdsTxtCache(input: $input) {
      id
      domain
      content
      status
      error_message
      last_updated
      updated_at
    }
  }
`;

export const createSellersJsonCache = /* GraphQL */ `
  mutation CreateSellersJsonCache($input: CreateSellersJsonCacheInput!) {
    createSellersJsonCache(input: $input) {
      id
      domain
      content
      status
      error_message
      last_updated
      created_at
      updated_at
    }
  }
`;

export const updateSellersJsonCache = /* GraphQL */ `
  mutation UpdateSellersJsonCache($input: UpdateSellersJsonCacheInput!) {
    updateSellersJsonCache(input: $input) {
      id
      domain
      content
      status
      error_message
      last_updated
      updated_at
    }
  }
`;