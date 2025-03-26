// These are the Amplify model classes that would be generated by the Amplify CLI
// For a real project, these would be code-generated based on the schema

export class Request {
  constructor(init: Partial<Request>) {
    Object.assign(this, init);
  }

  static copyOf(source: Request, mutator: (draft: Request) => void): Request {
    const copy = new Request({ ...source });
    mutator(copy);
    return copy;
  }

  id!: string;
  publisher_email!: string;
  requester_email!: string;
  requester_name!: string;
  publisher_name?: string;
  publisher_domain?: string;
  status!: string;
  token!: string;
  created_at!: string;
  updated_at?: string;
}

export class Message {
  constructor(init: Partial<Message>) {
    Object.assign(this, init);
  }

  static copyOf(source: Message, mutator: (draft: Message) => void): Message {
    const copy = new Message({ ...source });
    mutator(copy);
    return copy;
  }

  id!: string;
  request_id!: string;
  content!: string;
  sender_email!: string;
  created_at!: string;
  updated_at?: string;
}

export class AdsTxtRecord {
  constructor(init: Partial<AdsTxtRecord>) {
    Object.assign(this, init);
  }

  static copyOf(source: AdsTxtRecord, mutator: (draft: AdsTxtRecord) => void): AdsTxtRecord {
    const copy = new AdsTxtRecord({ ...source });
    mutator(copy);
    return copy;
  }

  id!: string;
  request_id!: string;
  domain!: string;
  account_id!: string;
  account_type!: string;
  relationship!: string;
  certification_authority_id?: string;
  status!: string;
  created_at!: string;
  updated_at?: string;
}

export class AdsTxtCache {
  constructor(init: Partial<AdsTxtCache>) {
    Object.assign(this, init);
  }

  static copyOf(source: AdsTxtCache, mutator: (draft: AdsTxtCache) => void): AdsTxtCache {
    const copy = new AdsTxtCache({ ...source });
    mutator(copy);
    return copy;
  }

  id!: string;
  domain!: string;
  content!: string;
  status!: string;
  error_message?: string;
  last_updated!: string;
  created_at!: string;
  updated_at?: string;
}

export class SellersJsonCache {
  constructor(init: Partial<SellersJsonCache>) {
    Object.assign(this, init);
  }

  static copyOf(
    source: SellersJsonCache,
    mutator: (draft: SellersJsonCache) => void
  ): SellersJsonCache {
    const copy = new SellersJsonCache({ ...source });
    mutator(copy);
    return copy;
  }

  id!: string;
  domain!: string;
  content!: string;
  status!: string;
  error_message?: string;
  last_updated!: string;
  created_at!: string;
  updated_at?: string;
}
