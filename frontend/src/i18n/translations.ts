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
    invalidDomain: {
      title: {
        en: 'Invalid Domain',
        ja: '無効なドメイン',
      },
      description: {
        en: 'Domain must be a valid domain (e.g., example.com).',
        ja: 'ドメインは有効なドメインである必要があります（例：example.com）。',
      },
      recommendation: {
        en: 'Check that the domain name of the advertising system is a valid domain.',
        ja: '広告システムのドメイン名が有効なドメインであることを確認してください。',
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
        en: 'Seller {{account_id}} is not marked as PUBLISHER/BOTH in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでPUBLISHER/BOTHとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      recommendation: {
        en: 'For DIRECT relationships, the seller type should be PUBLISHER/BOTH in sellers.json.',
        ja: 'DIRECT関係の場合、sellers.jsonでセラータイプはPUBLISHER/BOTHであるべきです。',
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
        en: 'Seller {{account_id}} is not marked as INTERMEDIARY/BOTH in sellers.json (current type: {{seller_type}})',
        ja: 'セラー {{account_id}} がsellers.jsonでINTERMEDIARY/BOTHとしてマークされていません（現在のタイプ: {{seller_type}}）',
      },
      recommendation: {
        en: 'For RESELLER relationships, the seller type should be INTERMEDIARY/BOTH in sellers.json.',
        ja: 'RESELLER関係の場合、sellers.jsonでセラータイプはINTERMEDIARY/BOTHであるべきです。',
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
    cancel: {
      en: 'Cancel',
      ja: 'キャンセル',
    },
    loading: {
      en: 'Loading...',
      ja: '読み込み中...',
    },
    updating: {
      en: 'Updating...',
      ja: '更新中...',
    },
    iAmRequester: {
      en: 'I am the requester',
      ja: '私がリクエスターです',
    },
    selectTabToViewMessages: {
      en: 'Select tab to view messages',
      ja: 'メッセージを表示するタブを選択してください',
    },
    loadMessages: {
      en: 'Load Messages',
      ja: 'メッセージを読み込む',
    },
    areYouRequester: {
      en: 'Are you the requester ({email}) for this request?',
      ja: 'あなたはこのリクエストのリクエスター（{email}）ですか？',
    },
    identifiedAsRequester: {
      en: 'You have been identified as the requester ({email})',
      ja: 'あなたはリクエスター（{email}）として識別されました',
    },
    copySuccess: {
      en: 'Copied to clipboard!',
      ja: 'クリップボードにコピーしました！',
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
      invalidDomain: {
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
    item: {
      publisher: {
        en: 'Publisher',
        ja: 'パブリッシャー',
      },
      domain: {
        en: 'Domain',
        ja: 'ドメイン',
      },
      requester: {
        en: 'Requester',
        ja: 'リクエスター',
      },
      recordCount: {
        en: 'Records: {{count}}',
        ja: 'レコード数: {{count}}',
      },
      status: {
        en: 'Status',
        ja: 'ステータス',
      },
      created: {
        en: 'Created',
        ja: '作成日時',
      },
      viewDetails: {
        en: 'View Details',
        ja: '詳細を表示',
      },
    },
    detail: {
      title: {
        en: 'Request Details',
        ja: 'リクエスト詳細',
      },
      publisher: {
        title: {
          en: 'Publisher Information',
          ja: 'パブリッシャー情報',
        },
        email: {
          en: 'Email:',
          ja: 'メールアドレス:',
        },
        name: {
          en: 'Name:',
          ja: '名前:',
        },
        domain: {
          en: 'Domain:',
          ja: 'ドメイン:',
        },
      },
      requester: {
        title: {
          en: 'Requester Information',
          ja: 'リクエスター情報',
        },
        email: {
          en: 'Email:',
          ja: 'メールアドレス:',
        },
        name: {
          en: 'Name:',
          ja: '名前:',
        },
      },
      created: {
        en: 'Created:',
        ja: '作成日時:',
      },
      updated: {
        en: 'Updated:',
        ja: '更新日時:',
      },
      records: {
        title: {
          en: 'Records',
          ja: 'レコード',
        },
      },
      actions: {
        approve: {
          en: 'Approve Request',
          ja: 'リクエストを承認',
        },
        reject: {
          en: 'Reject Request',
          ja: 'リクエストを拒否',
        },
        edit: {
          en: 'Edit Request',
          ja: 'リクエストを編集',
        },
        approveConfirm: {
          en: 'Are you sure you want to approve this request?',
          ja: 'このリクエストを承認してもよろしいですか？',
        },
        rejectConfirm: {
          en: 'Are you sure you want to reject this request?',
          ja: 'このリクエストを拒否してもよろしいですか？',
        },
        showContent: {
          en: 'Show Content',
          ja: 'コンテンツを表示',
        },
        copyToClipboard: {
          en: 'Copy to Clipboard',
          ja: 'クリップボードにコピー',
        },
        download: {
          en: 'Download',
          ja: 'ダウンロード',
        },
      },
      approvedContent: {
        en: 'Approved Ads.txt Content',
        ja: '承認済みAds.txtコンテンツ',
      },
      approvedContentDescription: {
        en: 'The following entries have been approved and are ready to be added to your ads.txt file.',
        ja: '以下のエントリが承認され、ads.txtファイルに追加する準備ができています。',
      },
      copySuccess: {
        en: 'Copied to clipboard!',
        ja: 'クリップボードにコピーしました！',
      },
      contentHelp: {
        en: 'This content includes approved entries with metadata comments. You can add these lines to your existing ads.txt file.',
        ja: 'このコンテンツには、メタデータコメント付きの承認されたエントリが含まれています。これらの行を既存のads.txtファイルに追加できます。',
      },
      loading: {
        en: 'Loading messages...',
        ja: 'メッセージを読み込んでいます...',
      },
      error: {
        fetchError: {
          en: 'Failed to fetch request details',
          ja: 'リクエストの詳細の取得に失敗しました',
        },
        updateError: {
          en: 'Failed to update request status',
          ja: 'リクエストステータスの更新に失敗しました',
        },
        generateError: {
          en: 'Failed to generate ads.txt content',
          ja: 'ads.txtコンテンツの生成に失敗しました',
        },
      },
    },
  },
  messages: {
    list: {
      title: {
        en: 'Messages',
        ja: 'メッセージ',
      },
      noMessages: {
        en: 'No messages yet',
        ja: 'まだメッセージはありません',
      },
      loading: {
        en: 'Loading messages...',
        ja: 'メッセージを読み込み中...',
      },
      fetchError: {
        en: 'Failed to fetch messages',
        ja: 'メッセージの取得に失敗しました',
      },
    },
    form: {
      title: {
        en: 'Send Message',
        ja: 'メッセージを送信',
      },
      placeholder: {
        en: 'Type your message here...',
        ja: 'メッセージをここに入力してください...',
      },
      messagePlaceholder: {
        en: 'Type your message here...',
        ja: 'メッセージをここに入力してください...',
      },
      send: {
        en: 'Send',
        ja: '送信',
      },
      requiredFields: {
        en: 'Please fill all required fields',
        ja: '必須項目をすべて入力してください',
      },
      sendError: {
        en: 'Failed to send message',
        ja: 'メッセージの送信に失敗しました',
      },
      sendSuccess: {
        en: 'Message sent successfully',
        ja: 'メッセージが正常に送信されました',
      },
      emailLabel: {
        en: 'Your Email',
        ja: 'あなたのメールアドレス',
      },
      messageLabel: {
        en: 'Message',
        ja: 'メッセージ',
      },
    },
    item: {
      publisher: {
        en: 'Publisher',
        ja: 'パブリッシャー',
      },
      requester: {
        en: 'Requester',
        ja: 'リクエスター',
      },
      sent: {
        en: 'Sent',
        ja: '送信日時',
      },
      sender: {
        en: 'From:',
        ja: '送信者:',
      },
      sentAt: {
        en: 'Sent:',
        ja: '送信日時:',
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
  requestListPage: {
    breadcrumb: {
      en: 'Requests',
      ja: 'リクエスト一覧',
    },
    title: {
      en: 'Requests',
      ja: 'リクエスト一覧',
    },
    emailLabel: {
      en: 'Email:',
      ja: 'メールアドレス:',
    },
    searchLabel: {
      en: 'Search Requests',
      ja: 'リクエストを検索',
    },
    searchPlaceholder: {
      en: 'Search by ID, email, name, domain, status...',
      ja: 'ID、メールアドレス、名前、ドメイン、ステータスなどで検索...',
    },
    noRequests: {
      en: 'No requests found',
      ja: 'リクエストが見つかりません',
    },
    changeSearch: {
      en: 'Try changing your search criteria',
      ja: '検索条件を変更してみてください',
    },
    totalRequests: {
      en: 'Total: {{count}} requests',
      ja: '合計: {{count}} 件のリクエスト',
    },
    pendingTitle: {
      en: 'Pending Requests ({{count}})',
      ja: '保留中のリクエスト ({{count}}件)',
    },
    updatedTitle: {
      en: 'Updated Requests ({{count}})',
      ja: '更新済みのリクエスト ({{count}}件)',
    },
    approvedTitle: {
      en: 'Approved Requests ({{count}})',
      ja: '承認済みのリクエスト ({{count}}件)',
    },
    rejectedTitle: {
      en: 'Rejected Requests ({{count}})',
      ja: '拒否されたリクエスト ({{count}}件)',
    },
    errors: {
      noEmail: {
        en: 'No Email Provided',
        ja: 'メールアドレスが提供されていません',
      },
      noEmailDescription: {
        en: 'Please provide an email address to view requests',
        ja: 'リクエストを表示するにはメールアドレスを提供してください',
      },
      fetchError: {
        en: 'Failed to fetch requests',
        ja: 'リクエストの取得に失敗しました',
      },
    },
  },
  requestDetailPage: {
    breadcrumb: {
      en: 'Request Details',
      ja: 'リクエスト詳細',
    },
    errors: {
      noId: {
        en: 'No Request ID Provided',
        ja: 'リクエストIDが提供されていません',
      },
      noIdDescription: {
        en: 'Please provide a request ID to view its details',
        ja: '詳細を表示するにはリクエストIDを提供してください',
      },
      noToken: {
        en: 'No Access Token Provided',
        ja: 'アクセストークンが提供されていません',
      },
      noTokenDescription: {
        en: 'Please provide an access token to view this request',
        ja: 'このリクエストを表示するにはアクセストークンを提供してください',
      },
    },
  },
  errorMessage: {
    defaultTitle: {
      en: 'An error occurred',
      ja: 'エラーが発生しました',
    },
  },
  notFoundPage: {
    title: {
      en: 'Page Not Found',
      ja: 'ページが見つかりません',
    },
    description: {
      en: 'The page you are looking for does not exist or has been moved.',
      ja: 'お探しのページは存在しないか、移動されました。',
    },
    button: {
      en: 'Back to Home',
      ja: 'ホームに戻る',
    },
  },
  helpPage: {
    loading: {
      en: 'Loading help content...',
      ja: 'ヘルプコンテンツを読み込んでいます...',
    },
    error: {
      en: 'Failed to load help content. Please try again later.',
      ja: 'ヘルプコンテンツの読み込みに失敗しました。後でもう一度お試しください。',
    },
  },
  editRequest: {
    breadcrumb: {
      en: 'Edit Request',
      ja: 'リクエストを編集',
    },
    title: {
      en: 'Edit Request',
      ja: 'リクエストを編集',
    },
    publisherInfo: {
      en: 'Publisher Information',
      ja: 'パブリッシャー情報',
    },
    requesterInfo: {
      en: 'Requester Information',
      ja: 'リクエスター情報',
    },
    records: {
      en: 'Edit Ads.txt Records',
      ja: 'Ads.txtレコードを編集',
    },
    submitButton: {
      en: 'Update Request',
      ja: 'リクエストを更新',
    },
    success: {
      en: 'Request updated successfully! Redirecting...',
      ja: 'リクエストが正常に更新されました！リダイレクトしています...',
    },
    error: {
      missingParams: {
        en: 'Missing Parameters',
        ja: 'パラメータが不足しています',
      },
      missingParamsDescription: {
        en: 'Request ID and token are required to edit a request',
        ja: 'リクエストを編集するにはリクエストIDとトークンが必要です',
      },
      fetchFailed: {
        en: 'Failed to fetch request details',
        ja: 'リクエスト詳細の取得に失敗しました',
      },
      notFound: {
        en: 'Request Not Found',
        ja: 'リクエストが見つかりません',
      },
      notFoundDescription: {
        en: 'The requested record could not be found or you may not have permission to view it',
        ja: 'リクエストされたレコードが見つからないか、表示する権限がない可能性があります',
      },
      cannotEdit: {
        en: 'Cannot Edit Request',
        ja: 'リクエストを編集できません',
      },
      cannotEditDescription: {
        en: 'This request cannot be edited because it has already been approved or updated',
        ja: 'このリクエストは既に承認または更新されているため、編集できません',
      },
      noRecords: {
        en: 'Please add at least one record',
        ja: '少なくとも1つのレコードを追加してください',
      },
      updateFailed: {
        en: 'Failed to update request',
        ja: 'リクエストの更新に失敗しました',
      },
    },
  },
  statusPage: {
    title: {
      en: 'System Status',
      ja: 'システム状態',
    },
    frontend: {
      title: {
        en: 'Frontend Status',
        ja: 'フロントエンド状態',
      },
      status: {
        en: 'Status:',
        ja: '状態:',
      },
    },
    backend: {
      title: {
        en: 'Backend Status',
        ja: 'バックエンド状態',
      },
      status: {
        en: 'Status:',
        ja: '状態:',
      },
      database: {
        en: 'Database:',
        ja: 'データベース:',
      },
      connected: {
        en: 'Connected',
        ja: '接続済み',
      },
      disconnected: {
        en: 'Disconnected',
        ja: '未接続',
      },
      error: {
        en: 'Error:',
        ja: 'エラー:',
      },
      lastChecked: {
        en: 'Last checked:',
        ja: '最終確認日時:',
      },
      couldNotConnect: {
        en: 'Could not connect to backend',
        ja: 'バックエンドに接続できませんでした',
      },
    },
    environment: {
      title: {
        en: 'Environment Variables',
        ja: '環境変数',
      },
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
      confidentialInfo: {
        en: 'Seller information is confidential',
        ja: 'セラー情報は非公開です',
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
        en: 'No seller information available',
        ja: 'セラー情報がありません',
      },
      fetchingSellerInfo: {
        en: 'Fetching seller information...',
        ja: 'セラー情報を取得中...',
      },
      cached: {
        en: 'Cached',
        ja: 'キャッシュ済み',
      },
      sellersCount: {
        en: 'Total sellers: {{count}}',
        ja: 'セラー総数: {{count}}',
      },
      version: {
        en: 'Version',
        ja: 'バージョン',
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
