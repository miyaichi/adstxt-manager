/* eslint-disable */
// GraphQLクエリ定義
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
        }
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
        }
      }
    }
  }
`;

export const listRequestsByEmail = /* GraphQL */ `
  query ListRequests($email: String!, $role: String) {
    listRequests(
      filter: {
        or: [
          { publisher_email: { eq: $email } }
          { requester_email: { eq: $email } }
        ]
      }
    ) {
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
      }
    }
  }
`;

export const listMessagesByRequestId = /* GraphQL */ `
  query ListMessages($requestId: String!) {
    listMessages(filter: { request_id: { eq: $requestId } }) {
      items {
        id
        content
        sender_email
        request_id
        created_at
        updated_at
      }
    }
  }
`;

export const listAdsTxtRecordsByRequestId = /* GraphQL */ `
  query ListAdsTxtRecords($requestId: String!) {
    listAdsTxtRecords(filter: { request_id: { eq: $requestId } }) {
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
      }
    }
  }
`;

export const getAdsTxtCacheByDomain = /* GraphQL */ `
  query AdsTxtCacheByDomain($domain: String!) {
    adsTxtCacheByDomain(domain: $domain) {
      items {
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
  }
`;

export const getSellersJsonCacheByDomain = /* GraphQL */ `
  query SellersJsonCacheByDomain($domain: String!) {
    sellersJsonCacheByDomain(domain: $domain) {
      items {
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
  }
`;