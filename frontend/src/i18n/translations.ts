// Define translations
export const translations = {
  warnings: {
    invalidFormat: {
      title: {
        en: 'Invalid Format',
        ja: '無効なフォーマット',
      },
      description: {
        en: 'The format of the Ads.txt entry is invalid and could not be parsed correctly.',
        ja: 'Ads.txtエントリのフォーマットが無効で、正しく解析できませんでした。',
      },
      recommendation: {
        en: 'Ensure the entry follows the correct format: domain.com, account_id, DIRECT|RESELLER, certification_authority_id',
        ja: 'エントリが正しいフォーマットに従っていることを確認してください: domain.com, account_id, DIRECT|RESELLER, certification_authority_id',
      },
    },
    missingFields: {
      title: {
        en: 'Missing Fields',
        ja: '必須フィールドの欠落',
      },
      description: {
        en: 'The Ads.txt entry is missing one or more required fields.',
        ja: 'Ads.txtエントリに1つ以上の必須フィールドがありません。',
      },
      recommendation: {
        en: 'Make sure your entry includes domain, account ID, and account type.',
        ja: 'エントリにドメイン、アカウントID、アカウントタイプが含まれていることを確認してください。',
      },
    },
    invalidRelationship: {
      title: {
        en: 'Invalid Relationship',
        ja: '無効な関係タイプ',
      },
      description: {
        en: 'The relationship type must be either DIRECT or RESELLER.',
        ja: '関係タイプはDIRECTまたはRESELLERのいずれかである必要があります。',
      },
      recommendation: {
        en: 'Change the relationship type to either DIRECT or RESELLER.',
        ja: '関係タイプをDIRECTまたはRESELLERに変更してください。',
      },
    },
    misspelledRelationship: {
      title: {
        en: 'Misspelled Relationship',
        ja: 'スペルミスのある関係タイプ',
      },
      description: {
        en: '{{value}} appears to be a misspelled relationship type.',
        ja: '{{value}}は関係タイプのスペルミスと思われます。',
      },
      recommendation: {
        en: 'Relationship types are case-sensitive and must be exactly DIRECT or RESELLER.',
        ja: '関係タイプは大文字と小文字が区別され、正確にDIRECTまたはRESELLERである必要があります。',
      },
    },
    invalidRootDomain: {
      title: {
        en: 'Invalid Root Domain',
        ja: '無効なルートドメイン',
      },
      description: {
        en: 'Domain must be a valid root domain (e.g., example.com, not sub.example.com)',
        ja: 'ドメインは有効なルートドメインである必要があります（例：example.com、sub.example.comではない）',
      },
      recommendation: {
        en: 'Use a root domain instead of a subdomain for proper validation.',
        ja: '適切な検証のためにサブドメインではなくルートドメインを使用してください。',
      },
    },
    emptyAccountId: {
      title: {
        en: 'Empty Account ID',
        ja: '空のアカウントID',
      },
      description: {
        en: 'Account ID must not be empty.',
        ja: 'アカウントIDは空であってはなりません。',
      },
      recommendation: {
        en: "Provide a valid account ID, which should be the publisher's ID in the advertising system.",
        ja: '広告システムでのパブリッシャーのIDである有効なアカウントIDを提供してください。',
      },
    },
    duplicateEntry: {
      title: {
        en: 'Duplicate Entry',
        ja: '重複エントリ',
      },
      description: {
        en: "Duplicate entry found in publisher's ads.txt ({{domain}})",
        ja: 'パブリッシャーのads.txt（{{domain}}）に重複エントリが見つかりました',
      },
      recommendation: {
        en: 'Remove the duplicate entry to maintain a cleaner ads.txt file.',
        ja: 'よりクリーンなads.txtファイルを維持するために、重複エントリを削除してください。',
      },
    },
    duplicateEntryCaseInsensitive: {
      title: {
        en: 'Case-Insensitive Duplicate',
        ja: '大文字小文字を区別しない重複',
      },
      description: {
        en: 'Duplicate entry found with different case formatting ({{domain}})',
        ja: '大文字小文字の違いを除いて重複するエントリが見つかりました（{{domain}}）',
      },
      recommendation: {
        en: 'Consolidate entries with consistent capitalization.',
        ja: '一貫した大文字小文字でエントリを統合してください。',
      },
    },
    noSellersJson: {
      title: {
        en: 'No Sellers.json Found',
        ja: 'Sellers.jsonが見つかりません',
      },
      description: {
        en: 'No sellers.json file found for domain {{domain}}',
        ja: 'ドメイン{{domain}}のsellers.jsonファイルが見つかりません',
      },
      recommendation: {
        en: 'The advertising system should provide a valid sellers.json file at their domain root.',
        ja: '広告システムはドメインルートに有効なsellers.jsonファイルを提供する必要があります。',
      },
    },
    directAccountIdNotInSellersJson: {
      title: {
        en: 'Account ID Not Found (DIRECT)',
        ja: 'アカウントIDが見つかりません（DIRECT）',
      },
      description: {
        en: 'Publisher account ID {{account_id}} not found in sellers.json for {{domain}}',
        ja: 'パブリッシャーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません',
      },
      recommendation: {
        en: 'Verify the account ID or contact the advertising system to update their sellers.json.',
        ja: 'アカウントIDを確認するか、sellers.jsonを更新するために広告システムに連絡してください。',
      },
    },
    resellerAccountIdNotInSellersJson: {
      title: {
        en: 'Account ID Not Found (RESELLER)',
        ja: 'アカウントIDが見つかりません（RESELLER）',
      },
      description: {
        en: 'Reseller account ID {{account_id}} not found in sellers.json for {{domain}}',
        ja: 'リセラーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません',
      },
      recommendation: {
        en: 'Verify the account ID or contact the reseller to ensure they are registered.',
        ja: 'アカウントIDを確認するか、リセラーに連絡して登録を確認してください。',
      },
    },
    domainMismatch: {
      title: {
        en: 'Domain Mismatch',
        ja: 'ドメインの不一致',
      },
      description: {
        en: "The sellers.json domain ({{seller_domain}}) doesn't match the publisher domain ({{publisher_domain}})",
        ja: 'sellers.jsonドメイン（{{seller_domain}}）がパブリッシャードメイン（{{publisher_domain}}）と一致しません',
      },
      recommendation: {
        en: 'For DIRECT relationships, the domains should match. Verify with the advertising system.',
        ja: 'DIRECT関係の場合、ドメインは一致する必要があります。広告システムで確認してください。',
      },
    },
    directNotPublisher: {
      title: {
        en: 'Seller Not Marked as PUBLISHER',
        ja: 'セラーがPUBLISHERとしてマークされていない',
      },
      description: {
        en: 'Seller {{account_id}} is not marked as PUBLISHER in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでPUBLISHERとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      recommendation: {
        en: 'For DIRECT relationships, the seller type should be PUBLISHER in sellers.json.',
        ja: 'DIRECT関係の場合、sellers.jsonでセラータイプはPUBLISHERであるべきです。',
      },
    },
    sellerIdNotUnique: {
      title: {
        en: 'Non-Unique Seller ID',
        ja: '一意でないセラーID',
      },
      description: {
        en: 'Seller ID {{account_id}} appears multiple times in sellers.json for {{domain}}',
        ja: 'セラーID {{account_id}} が {{domain}} のsellers.jsonに複数回表示されています',
      },
      recommendation: {
        en: 'Contact the advertising system to clarify which entry is correct.',
        ja: 'どのエントリが正しいかを明確にするために広告システムに連絡してください。',
      },
    },
    resellerNotIntermediary: {
      title: {
        en: 'Reseller Not Marked as INTERMEDIARY',
        ja: 'リセラーがINTERMEDIARYとしてマークされていない',
      },
      description: {
        en: 'Seller {{account_id}} is not marked as INTERMEDIARY in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでINTERMEDIARYとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      recommendation: {
        en: 'For RESELLER relationships, the seller type should be INTERMEDIARY in sellers.json.',
        ja: 'RESELLER関係の場合、sellers.jsonでセラータイプはINTERMEDIARYであるべきです。',
      },
    },
    sellersJsonValidationError: {
      title: {
        en: 'Sellers.json Validation Error',
        ja: 'Sellers.json検証エラー',
      },
      description: {
        en: 'Error validating against sellers.json for {{domain}}: {{message}}',
        ja: '{{domain}} のsellers.jsonとの検証中にエラーが発生しました: {{message}}',
      },
      recommendation: {
        en: 'This is usually a temporary error. You can proceed but full validation was not possible.',
        ja: 'これは通常、一時的なエラーです。続行できますが、完全な検証はできませんでした。',
      },
    },
  },
  common: {
    recommendation: {
      en: 'Recommendation',
      ja: '推奨事項',
    },
    learnMore: {
      en: 'Learn More',
      ja: '詳細を見る',
    },
    home: {
      en: 'Home',
      ja: 'ホーム',
    },
    back: {
      en: 'Back',
      ja: '戻る',
    },
    search: {
      en: 'Search',
      ja: '検索',
    },
    email: {
      en: 'Email',
      ja: 'メールアドレス',
    },
    process: {
      en: 'Upload',
      ja: 'アップロード',
    },
    contentRequired: {
      en: 'Please enter some content',
      ja: 'コンテンツを入力してください',
    },
    status: {
      pending: {
        en: 'Pending',
        ja: '保留中',
      },
      approved: {
        en: 'Approved',
        ja: '承認済み',
      },
      rejected: {
        en: 'Rejected',
        ja: '却下',
      },
      updated: {
        en: 'Updated',
        ja: '更新済み',
      },
    },
    role: {
      publisher: {
        en: 'Publisher',
        ja: 'パブリッシャー',
      },
      requester: {
        en: 'Requester',
        ja: 'リクエスター',
      },
    },
    error: {
      en: 'Error',
      ja: 'エラー',
    },
    errorOccurred: {
      en: 'An error occurred',
      ja: 'エラーが発生しました',
    },
    backToHome: {
      en: 'Back to Home',
      ja: 'ホームに戻る',
    },
    upload: {
      en: 'Upload',
      ja: 'アップロード',
    },
    clear: {
      en: 'Clear',
      ja: 'クリア',
    },
    parseError: {
      en: 'An error occurred while parsing the file',
      ja: 'ファイルの解析中にエラーが発生しました',
    },
    termsOfService: {
      en: 'Terms of Service',
      ja: '利用規約',
    },
    privacyPolicy: {
      en: 'Privacy Policy',
      ja: 'プライバシーポリシー',
    },
    contact: {
      en: 'Contact Us',
      ja: 'お問い合わせ',
    },
    approve: {
      en: 'Approve',
      ja: '承認',
    },
    reject: {
      en: 'Reject',
      ja: '却下',
    },
    valid: {
      en: 'Valid',
      ja: '有効',
    },
    invalid: {
      en: 'Invalid',
      ja: '無効',
    },
    warning: {
      en: 'Warning',
      ja: '警告',
    },
    send: {
      en: 'Send',
      ja: '送信',
    },
    required: {
      en: 'Required fields',
      ja: '必須項目',
    },
    success: {
      en: 'Success',
      ja: '成功',
    },
    submit: {
      en: 'Submit',
      ja: '送信',
    },
    view: {
      en: 'View',
      ja: '表示',
    },
  },
  errors: {
    adsTxtValidation: {
      invalidFormat: {
        en: 'Invalid format. Expected comma-separated values',
        ja: '無効な形式です。カンマ区切りの値が必要です',
      },
      missingFields: {
        en: 'Line must contain at least domain, account ID, and account type',
        ja: 'ラインには少なくともドメイン、アカウントID、アカウントタイプが必要です',
      },
      invalidRelationship: {
        en: 'Relationship type must be either DIRECT or RESELLER',
        ja: '関係タイプはDIRECTまたはRESELLERのいずれかである必要があります',
      },
      misspelledRelationship: {
        en: '"{{value}}" appears to be a misspelled relationship type. Must be either DIRECT or RESELLER',
        ja: '「{{value}}」は関係タイプのスペルミスと思われます。DIRECTまたはRESELLERが必要です',
      },
      invalidRootDomain: {
        en: 'Domain must be a valid root domain (e.g., example.com, not sub.example.com)',
        ja: 'ドメインは有効なルートドメインである必要があります（例：example.com、sub.example.comではない）',
      },
      emptyAccountId: {
        en: 'Account ID must not be empty',
        ja: 'アカウントIDは空であってはなりません',
      },
      duplicateEntry: {
        en: "Duplicate entry found in publisher's ads.txt ({{domain}})",
        ja: 'パブリッシャーのads.txt（{{domain}}）に重複エントリが見つかりました',
      },
      duplicateEntryCaseInsensitive: {
        en: "Duplicate entry found in publisher's ads.txt with different case formatting ({{domain}})",
        ja: 'パブリッシャーのads.txt（{{domain}}）に大文字小文字の違いを除いて重複するエントリが見つかりました',
      },
      noSellersJson: {
        en: 'No sellers.json file found for domain {{domain}}',
        ja: 'ドメイン{{domain}}のsellers.jsonファイルが見つかりません',
      },
      directAccountIdNotInSellersJson: {
        en: 'Publisher account ID {{account_id}} not found in sellers.json for {{domain}}',
        ja: 'パブリッシャーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません',
      },
      resellerAccountIdNotInSellersJson: {
        en: 'Reseller account ID {{account_id}} not found in sellers.json for {{domain}}',
        ja: 'リセラーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません',
      },
      domainMismatch: {
        en: "The sellers.json domain ({{seller_domain}}) doesn't match the publisher domain ({{publisher_domain}})",
        ja: 'sellers.jsonドメイン（{{seller_domain}}）がパブリッシャードメイン（{{publisher_domain}}）と一致しません',
      },
      directNotPublisher: {
        en: 'Seller {{account_id}} is not marked as PUBLISHER in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでPUBLISHERとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      sellerIdNotUnique: {
        en: 'Seller ID {{account_id}} appears multiple times in sellers.json for {{domain}}',
        ja: 'セラーID {{account_id}} が {{domain}} のsellers.jsonに複数回表示されています',
      },
      resellerNotIntermediary: {
        en: 'Seller {{account_id}} is not marked as INTERMEDIARY in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでINTERMEDIARYとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      sellersJsonValidationError: {
        en: 'Error validating against sellers.json for {{domain}}: {{message}}',
        ja: '{{domain}} のsellers.jsonとの検証中にエラーが発生しました: {{message}}',
      },
    },
  },
  newRequestPage: {
    breadcrumb: {
      en: 'New Request',
      ja: '新規リクエスト',
    },
  },
  requests: {
    form: {
      title: {
        en: 'Create New Request',
        ja: '新規リクエスト作成',
      },
      description: {
        en: "Fill out this form to request changes to a publisher's ads.txt file.",
        ja: 'パブリッシャーのads.txtファイルへの変更をリクエストするにはこのフォームに記入してください。',
      },
      basicInfo: {
        en: 'Basic Information',
        ja: '基本情報',
      },
      publisherEmail: {
        en: 'Publisher Email',
        ja: 'パブリッシャーのメールアドレス',
      },
      publisherName: {
        en: 'Publisher Name (Optional)',
        ja: 'パブリッシャー名（任意）',
      },
      publisherDomain: {
        en: 'Publisher Domain (Optional)',
        ja: 'パブリッシャードメイン（任意）',
      },
      requesterEmail: {
        en: 'Requester Email',
        ja: 'リクエスターのメールアドレス',
      },
      requesterName: {
        en: 'Requester Name',
        ja: 'リクエスター名',
      },
      adsTxtRecords: {
        en: 'Ads.txt Records',
        ja: 'Ads.txtレコード',
      },
      uploadTab: {
        en: 'Upload Records',
        ja: 'レコードのアップロード',
      },
      selectedRecordsTab: {
        en: 'Selected Records',
        ja: '選択されたレコード',
      },
      selectedRecords: {
        en: 'Selected Ads.txt Records',
        ja: '選択されたAds.txtレコード',
      },
      noRecordsSelected: {
        en: 'No records have been selected yet.',
        ja: 'まだレコードが選択されていません。',
      },
      submitRequest: {
        en: 'Submit Request',
        ja: 'リクエストを送信',
      },
      invalidRecordsWarning: {
        en: 'Please fix invalid records before submitting the request.',
        ja: 'リクエストを送信する前に無効なレコードを修正してください。',
      },
      requiredFieldsError: {
        en: 'Please fill out all required fields.',
        ja: 'すべての必須フィールドに入力してください。',
      },
      recordsRequiredError: {
        en: 'Please add at least one ads.txt record.',
        ja: '少なくとも1つのads.txtレコードを追加してください。',
      },
      processingError: {
        en: 'An error occurred while processing your request.',
        ja: 'リクエストの処理中にエラーが発生しました。',
      },
      domainValidation: {
        loading: {
          en: 'Validating...',
          ja: '検証中...',
        },
        success: {
          en: 'Valid domain',
          ja: '有効なドメイン',
        },
        error: {
          en: 'Failed to validate domain',
          ja: 'ドメインの検証に失敗しました',
        },
        invalidFormat: {
          en: 'Invalid domain format',
          ja: '無効なドメイン形式',
        },
      },
    },
    success: {
      title: {
        en: 'Request Submitted Successfully',
        ja: 'リクエストが正常に送信されました',
      },
      message: {
        en: 'Your request has been submitted and an email notification has been sent to the publisher.',
        ja: 'リクエストが送信され、パブリッシャーにメール通知が送信されました。',
      },
      requestId: {
        en: 'Request ID',
        ja: 'リクエストID',
      },
      accessToken: {
        en: 'Access Token',
        ja: 'アクセストークン',
      },
      saveInfo: {
        en: 'Please save this information to check the status of your request later.',
        ja: '後でリクエストのステータスを確認するためにこの情報を保存してください。',
      },
      viewRequest: {
        en: 'View Request',
        ja: 'リクエストを表示',
      },
    },
  },
  homePage: {
    title: {
      en: 'Ads.txt Manager',
      ja: 'Ads.txt マネージャー',
    },
    description: {
      en: 'Ads.txt Manager is a web application that simplifies the Ads.txt update process between publishers and advertising services/agencies. Easily manage Ads.txt updates without the hassle of email exchanges.',
      ja: 'Ads.txt Managerは、パブリッシャーと広告サービス・代理店間のAds.txt更新プロセスを簡素化するためのウェブアプリケーションです。メールによる面倒なやり取りなしにAds.txtの更新を簡単に管理できます。',
    },
    createRequest: {
      title: {
        en: 'Create Request',
        ja: 'リクエストを作成',
      },
      description: {
        en: "As an advertising service or agency, request an update to a publisher's Ads.txt file. Simply manually enter records to apply.",
        ja: '広告サービスや代理店として、パブリッシャーにAds.txtファイルの更新をリクエストします。レコードを手動で入力するだけで簡単に申請できます。',
      },
      button: {
        en: 'Create New Request',
        ja: '新規リクエスト作成',
      },
    },
    checkRequest: {
      title: {
        en: 'Check Requests',
        ja: 'リクエストを確認',
      },
      description: {
        en: 'As a publisher or requester, check the status of existing requests. Enter your email address to see all related requests.',
        ja: 'パブリッシャーまたはリクエスト作成者として、既存のリクエストのステータスを確認します。メールアドレスを入力して関連するすべてのリクエストを表示します。',
      },
      button: {
        en: 'Search Requests',
        ja: 'リクエストを検索',
      },
    },
    errors: {
      emailRequired: {
        en: 'Please enter an email address',
        ja: 'メールアドレスを入力してください',
      },
      noRequests: {
        en: 'No requests were found for this email address',
        ja: 'このメールアドレスに関連するリクエストはありません',
      },
      fetchError: {
        en: 'An error occurred while retrieving requests',
        ja: 'リクエストの取得中にエラーが発生しました',
      },
    },
  },
  errorMessage: {
    defaultTitle: {
      en: 'An error occurred',
      ja: 'エラーが発生しました',
    },
  },
  footer: {
    copyright: {
      en: '© {{year}} Ads.txt Manager. All rights reserved.',
      ja: '© {{year}} Ads.txt Manager. All rights reserved.',
    },
  },
  adsTxt: {
    input: {
      title: {
        en: 'Ads.txt Input',
        ja: 'Ads.txtの入力',
      },
      label: {
        en: 'Ads.txt Content',
        ja: 'Ads.txtの内容',
      },
      placeholder: {
        en: 'Enter Ads.txt content here...',
        ja: 'Ads.txtの内容をここに入力してください...',
      },
      example: {
        en: 'Example',
        ja: '例',
      },
    },
    textInput: {
      stats: {
        en: 'Total: {{total}}, Valid: {{valid}}, Invalid: {{invalid}}',
        ja: '合計: {{total}}, 有効: {{valid}}, 無効: {{invalid}}',
      },
      invalidRecordsWarning: {
        en: 'Some records are invalid and will not be included in your request.',
        ja: '一部のレコードが無効なため、リクエストに含まれません。',
      },
    },
    recordList: {
      title: {
        en: 'Ads.txt Records',
        ja: 'Ads.txtレコード',
      },
      noRecords: {
        en: 'No records found',
        ja: 'レコードが見つかりません',
      },
      searchLabel: {
        en: 'Search Records',
        ja: 'レコードを検索',
      },
      searchPlaceholder: {
        en: 'Search by domain, account ID...',
        ja: 'ドメイン、アカウントIDで検索...',
      },
      noMatchingRecords: {
        en: 'No matching records found',
        ja: '一致するレコードが見つかりません',
      },
      totalRecords: {
        en: 'Total records: {{count}}',
        ja: '合計レコード数: {{count}}',
      },
    },
    recordItem: {
      accountId: {
        en: 'Account ID',
        ja: 'アカウントID',
      },
      relationship: {
        en: 'Relationship',
        ja: '関係',
      },
      certificationAuthorityId: {
        en: 'Certification Authority ID',
        ja: '認証局ID',
      },
      sellerInfo: {
        en: 'Seller Info',
        ja: 'セラー情報',
      },
      confidential: {
        en: 'Confidential',
        ja: '機密',
      },
      sellerDomain: {
        en: 'Seller Domain',
        ja: 'セラードメイン',
      },
      sellerType: {
        en: 'Seller Type',
        ja: 'セラータイプ',
      },
      noSellerInfo: {
        en: 'No seller information found',
        ja: 'セラー情報が見つかりません',
      },
      errorFetchingSellerInfo: {
        en: 'Error fetching seller information',
        ja: 'セラー情報の取得中にエラーが発生しました',
      },
      fetchingSellerInfo: {
        en: 'Fetching seller information...',
        ja: 'セラー情報を取得中...',
      },
    },
  },
};

// Create a translation helper function
export const t = (key: string, language: string, params?: Record<string, any>): string => {
  // Parse the key into path components
  let path: string[];

  // 'errors:' or 'errors.' format
  if (key.startsWith('errors:') || key.startsWith('errors.')) {
    // Normalize key format by replacing 'errors:' with 'errors.'
    const normalizedKey = key.replace('errors:', 'errors.');
    const keyParts = normalizedKey.split('.');

    // Remove 'errors' and process the rest of the path
    keyParts.shift();
    path = ['errors', ...keyParts];
  } else {
    path = key.split('.');
  }

  // Start from the root translations object
  let value: any = translations;

  // Navigate through the nested objects
  for (const k of path) {
    if (!value || value[k] === undefined) {
      console.warn(`Translation key not found: ${key}, failed at part: ${k}`);
      return key;
    }
    value = value[k];
  }

  // Value should now be either a string or an object with language keys
  let translation: string;

  if (typeof value === 'string') {
    // If it's already a string, use it directly
    translation = value;
  } else if (value && typeof value === 'object') {
    // If it's an object, try to get the translation for the current language or fall back to English
    translation = value[language] || value['en'];
  } else {
    console.warn(`No translation found for key: ${key}`);
    return key;
  }

  if (!translation) {
    console.warn(`Translation not found for key: ${key} in language: ${language}`);
    return key;
  }

  // Replace parameters if they exist
  if (params) {
    const result = Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      const replaced = str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      return replaced;
    }, translation);
    return result;
  }

  return translation;
};
