// Define translations
export const translations = {
  validation: {
    summary: {
      title: {
        en: 'Validation Summary',
        ja: '検証サマリー',
      },
      total: {
        en: 'Total',
        ja: '総数',
      },
      errors: {
        en: 'Errors',
        ja: 'エラー',
      },
      warnings: {
        en: 'Warnings',
        ja: '警告',
      },
      info: {
        en: 'Info',
        ja: '情報',
      },
      codes: {
        en: 'Codes',
        ja: 'コード',
      },
      learnMore: {
        en: 'Learn more',
        ja: '詳細を見る',
      },
      overallValid: {
        en: 'Overall Valid',
        ja: '全体的に有効',
      },
      overallInvalid: {
        en: 'Overall Invalid',
        ja: '全体的に無効',
      },
      noRecords: {
        en: 'No records to validate',
        ja: '検証するレコードがありません',
      },
    },
  },
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
        en: 'Ensure the entry follows the format: domain.com, account_id, DIRECT|RESELLER, certification_authority_id',
        ja: 'エントリが`domain.com, account_id, DIRECT|RESELLER, certification_authority_id`というフォーマットに従っていることを確認してください。',
      },
    },
    missingFields: {
      title: {
        en: 'Missing Required Fields',
        ja: '必須フィールドの欠落',
      },
      description: {
        en: 'The ads.txt entry is missing the three required fields.',
        ja: 'ads.txtエントリに必要な3つのフィールドがありません。',
      },
      recommendation: {
        en: 'Make sure your entry includes domain, account ID, and account type (DIRECT or RESELLER).',
        ja: 'エントリにドメイン、アカウントID、およびアカウントタイプ（DIRECTまたはRESELLER）が含まれていることを確認してください。',
      },
    },
    invalidRelationship: {
      title: {
        en: 'Invalid Relationship',
        ja: '無効な関係タイプ',
      },
      description: {
        en: 'The third required field must contain either DIRECT or RESELLER.',
        ja: '3番目の必須フィールドには「DIRECT」または「RESELLER」のいずれかが含まれている必要があります。',
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
        en: 'The advertising system domain is not a valid domain.',
        ja: '広告システムドメインが有効なドメインではありません。',
      },
      recommendation: {
        en: 'Ensure that the domain name of the advertising system is a valid domain.',
        ja: '広告システムのドメイン名が有効なドメインであることを確認してください。',
      },
    },
    emptyAccountId: {
      title: {
        en: 'Empty Account ID',
        ja: '空のアカウントID',
      },
      description: {
        en: 'The account ID field is empty.',
        ja: 'アカウントIDフィールドが空です。',
      },
      recommendation: {
        en: "Provide a valid account ID, which should be the publisher's ID in the advertising system.",
        ja: '広告システムのプラットフォームでのパブリッシャーIDである有効なアカウントIDを提供してください。',
      },
    },
    implimentedEntry: {
      title: {
        en: 'Implemented Entry',
        ja: '実施済みエントリ',
      },
      description: {
        en: 'An identical entry already exists in the Ads.txt file for the specified domain.',
        ja: 'パブリッシャーのads.txt（{{domain}}）にすでに実施済みのエントリが見つかりました',
      },
      recommendation: {
        en: 'You do not need to include the implemented entry in the new entry. The existing entry is already valid.',
        ja: '新規エントリに実施済みエントリを含める必要はありません。既存のエントリはすでに有効です。',
      },
    },
    noSellersJson: {
      title: {
        en: 'No Sellers.json File',
        ja: 'Sellers.jsonファイルがない',
      },
      description: {
        en: 'No sellers.json file was found for the specified advertising system domain {{domain}}.',
        ja: '指定された広告システムドメイン{{domain}}のsellers.jsonファイルが見つかりませんでした。',
      },
      recommendation: {
        en: 'Contact your selling partner to ask them to implement sellers.json.',
        ja: '販売パートナーに連絡して、sellers.jsonを実装するよう依頼してください。',
      },
    },
    directAccountIdNotInSellersJson: {
      title: {
        en: 'DIRECT: Account ID Not in Sellers.json',
        ja: 'DIRECT: アカウントIDがSellers.jsonにない',
      },
      description: {
        en: 'Publisher account ID {{account_id}} not found in sellers.json for {{domain}}.',
        ja: 'パブリッシャーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません。',
      },
      recommendation: {
        en: 'Remove this entry if you no longer work with the seller, or verify the account ID and contact the advertising system.',
        ja: '販売者と連携していない場合は、ファイルからこのエントリを削除してください。またはアカウントIDを確認し、広告システムに連絡してください。',
      },
    },
    resellerAccountIdNotInSellersJson: {
      title: {
        en: 'RESELLER: Account ID Not in Sellers.json',
        ja: 'RESELLER: アカウントIDがSellers.jsonにない',
      },
      description: {
        en: 'Reseller account ID {{account_id}} not found in sellers.json for {{domain}}.',
        ja: 'リセラーアカウントID {{account_id}} が {{domain}} のsellers.jsonに見つかりません。',
      },
      recommendation: {
        en: 'Remove this entry if you no longer work with the seller, or verify the account ID and contact the reseller.',
        ja: '販売者と連携していない場合は、ファイルからこのエントリを削除してください。またはアカウントIDを確認し、リセラーに連絡してください。',
      },
    },
    domainMismatch: {
      title: {
        en: 'Domain Mismatch',
        ja: 'ドメインの不一致',
      },
      description: {
        en: "The sellers.json domain ({{seller_domain}}) doesn't match the OWNERDOMAIN/MANAGERDOMAIN or publisher domain ({{publisher_domain}}).",
        ja: 'sellers.jsonドメイン（{{seller_domain}}）がOWNERDOMAIN/MANAGERDOMAINまたはパブリッシャードメイン（{{publisher_domain}}）と一致しません。',
      },
      recommendation: {
        en: 'Confirm that you are listed as expected. The domain should match with your OWNERDOMAIN, MANAGERDOMAIN, or publisher domain.',
        ja: '期待通りにリストされていることを確認してください。ドメインはOWNERDOMAIN、MANAGERDOMAIN、またはパブリッシャードメインと一致する必要があります。',
      },
    },
    directNotPublisher: {
      title: {
        en: 'DIRECT: Seller Not Marked as PUBLISHER。',
        ja: 'DIRECT: セラーがPUBLISHERとしてマークされていません。',
      },
      description: {
        en: 'For a DIRECT relationship, the seller in sellers.json is listed as BOTH or INTERMEDIARY instead of PUBLISHER.',
        ja: 'DIRECT関係の場合、sellers.jsonファイル内のセラーがPUBLISHERではなくBOTHまたはINTERMEDIARYとしてリストされています。',
      },
      recommendation: {
        en: 'If this is incorrect, work with your selling partner to ensure files display the correct relationship.',
        ja: 'これが正しくない場合は、ファイルが正しい関係を表示するように販売パートナーと協力してください。',
      },
    },
    sellerIdNotUnique: {
      title: {
        en: 'Seller ID Not Unique.',
        ja: 'セラーIDが一意ではありません。',
      },
      description: {
        en: 'Seller ID {{account_id}} appears multiple times in sellers.json for {{domain}}.',
        ja: 'セラーID {{account_id}} が {{domain}} のsellers.jsonに複数回表示されています。',
      },
      recommendation: {
        en: 'Review the other selling partners using this ID and contact your selling partner for clarification.',
        ja: 'このIDを使用している他の販売パートナーを確認し、在庫がどのように販売されているかをより理解するために販売パートナーに連絡してください。',
      },
    },
    resellerNotIntermediary: {
      title: {
        en: 'RESELLER: Seller Not Marked as INTERMEDIARY.',
        ja: 'RESELLER: セラーがINTERMEDIARYとしてマークされていません。',
      },
      description: {
        en: 'Seller {{account_id}} is not marked as INTERMEDIARY/BOTH in sellers.json (current type: {{seller_type}}).',
        ja: 'セラー {{account_id}} がsellers.jsonでINTERMEDIARY/BOTHとしてマークされていません（現在のタイプ: {{seller_type}}）。',
      },
      recommendation: {
        en: 'If this is incorrect, work with your selling partner to ensure files display the correct relationship.',
        ja: 'これが正しくない場合は、ファイルが正しい関係を表示するように販売パートナーと協力してください。',
      },
    },
    sellersJsonValidationError: {
      title: {
        en: 'Sellers.json Validation Error.',
        ja: 'Sellers.json検証エラー。',
      },
      description: {
        en: 'Error validating against sellers.json for {{domain}}: {{message}}',
        ja: '{{domain}} のsellers.jsonとの検証中にエラーが発生しました: {{message}}',
      },
      recommendation: {
        en: 'This is usually a temporary error. You can proceed but full validation was not possible.',
        ja: 'これは通常、一時的または技術的なエラーです。エントリを続行できますが、sellers.jsonとの完全な検証ができませんでした。',
      },
    },
  },
  common: {
    recommendation: {
      en: 'Recommendation',
      ja: '推奨事項',
    },
    details: {
      en: 'Details',
      ja: '詳細',
    },
    andMore: {
      en: 'and {{count}} more',
      ja: '他 {{count}} 件',
    },
    learnMore: {
      en: 'Learn More',
      ja: '詳細を見る',
    },
    help: {
      en: 'Help',
      ja: 'ヘルプ',
    },
    loading: {
      en: 'Loading...',
      ja: '読み込み中...',
    },
    loadingError: {
      en: 'Failed to load content. Please try again later.',
      ja: 'コンテンツの読み込みに失敗しました。後でもう一度お試しください。',
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
    value: {
      en: 'Value',
      ja: '値',
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
    optimizeError: {
      en: 'An error occurred while optimizing the content',
      ja: 'コンテンツの最適化中にエラーが発生しました',
    },
    cancel: {
      en: 'Cancel',
      ja: 'キャンセル',
    },
    updating: {
      en: 'Updating...',
      ja: '更新中...',
    },
    sending: {
      en: 'Sending...',
      ja: '送信中...',
    },
    selectTabToViewMessages: {
      en: 'Select tab to view messages',
      ja: 'メッセージを表示するタブを選択してください',
    },
    loadMessages: {
      en: 'Load Messages',
      ja: 'メッセージを読み込む',
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
    roles: {
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
  errors: {},
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
      emailNotification: {
        en: 'Email notifications with links to access this request have been sent to both parties.',
        ja: 'このリクエストにアクセスするためのリンクを含むメール通知が両当事者に送信されました。',
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
    optimizeAdsTxt: {
      title: {
        en: 'Optimize Ads.txt',
        ja: 'Ads.txtを最適化',
      },
      description: {
        en: 'Clean up and optimize your Ads.txt file. Remove duplicates, standardize format, and ensure compliance with the Ads.txt specification.',
        ja: 'Ads.txtファイルをクリーンアップして最適化します。重複を削除し、フォーマットを標準化し、Ads.txt仕様への準拠を確保します。',
      },
      button: {
        en: 'Go to Optimizer',
        ja: '最適化ツールへ',
      },
    },
    siteAnalysis: {
      title: {
        en: 'Site Analysis',
        ja: 'サイト分析',
      },
      description: {
        en: 'Analyze publisher metadata using the OpenSincera API. Get detailed information about publisher verification status, categories, and operational data.',
        ja: 'OpenSincera APIを使用してパブリッシャーメタデータを分析します。パブリッシャーの認証ステータス、カテゴリ、運用データの詳細情報を取得できます。',
      },
      button: {
        en: 'Go to Site Analysis',
        ja: 'サイト分析へ',
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
      authRequired: {
        en: 'Authentication required. Please check your email.',
        ja: '認証が必要です。メールを確認してください。',
      },
    },
    verification: {
      title: {
        en: 'Verification Required',
        ja: '認証が必要です',
      },
      description: {
        en: 'Email verification is required to access the requests. Please check your email.',
        ja: 'リクエストにアクセスするにはメールアドレスの認証が必要です。',
      },
      emailSent: {
        en: 'A verification email has been sent. Please check your inbox and click the link to verify your email.',
        ja: '認証メールを送信しました。メールを確認して、リンクをクリックしてメールアドレスを認証してください。',
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
  optimizerPage: {
    breadcrumb: {
      en: 'Ads.txt Optimizer',
      ja: 'Ads.txt 最適化ツール',
    },
    title: {
      en: 'Ads.txt Optimizer',
      ja: 'Ads.txt 最適化ツール',
    },
    description: {
      en: 'Optimize your Ads.txt file by removing duplicates, standardizing format, and ensuring compliance with the specification.',
      ja: '重複を削除し、フォーマットを標準化し、仕様への準拠を確保することで、Ads.txtファイルを最適化します。',
    },
    inputSection: {
      title: {
        en: 'Input',
        ja: '入力',
      },
      tabs: {
        text: {
          en: 'Enter Text',
          ja: 'テキスト入力',
        },
        url: {
          en: 'Fetch from URL',
          ja: 'URLから取得',
        },
        file: {
          en: 'Upload File',
          ja: 'ファイルをアップロード',
        },
      },
      textLabel: {
        en: 'Ads.txt Content',
        ja: 'Ads.txtの内容',
      },
      textPlaceholder: {
        en: 'Paste your Ads.txt content here...',
        ja: 'Ads.txtの内容をここに貼り付けてください...',
      },
      urlLabel: {
        en: 'Publisher Domain',
        ja: 'パブリッシャードメイン',
      },
      urlPlaceholder: {
        en: 'example.com',
        ja: 'example.com',
      },
      urlHelperText: {
        en: 'We will fetch ads.txt from this domain',
        ja: 'このドメインからads.txtを取得します',
      },
      fileLabel: {
        en: 'Ads.txt File',
        ja: 'Ads.txtファイル',
      },
      filePlaceholder: {
        en: 'Choose file...',
        ja: 'ファイルを選択...',
      },
      optimizeButton: {
        en: 'Optimize',
        ja: '最適化',
      },
      cancelButton: {
        en: 'Cancel',
        ja: 'キャンセル',
      },
      downloadButton: {
        en: 'Download Optimized File',
        ja: '最適化ファイルをダウンロード',
      },
      copyButton: {
        en: 'Copy to Clipboard',
        ja: 'クリップボードにコピー',
      },
    },
    optimizationLevels: {
      label: {
        en: 'Optimization Level',
        ja: '最適化レベル',
      },
      level1: {
        title: {
          en: 'Level 1: Basic',
          ja: 'レベル1: 基本',
        },
        description: {
          en: 'Remove duplicates, standardize format, group records by domain',
          ja: '重複を削除、フォーマットを標準化、ドメインごとにレコードをグループ化',
        },
      },
      level2: {
        title: {
          en: 'Level 2: Advanced (Takes time)',
          ja: 'レベル2: 高度（時間がかかります）',
        },
        description: {
          en: 'Level 1 + categorize by seller type, completion of Certification IDs',
          ja: 'レベル1 + カテゴリ分け、認証IDの補完',
        },
      },
    },
    resultSection: {
      title: {
        en: 'Optimized Result',
        ja: '最適化結果',
      },
      beforeLabel: {
        en: 'Before',
        ja: '最適化前',
      },
      afterLabel: {
        en: 'After',
        ja: '最適化後',
      },
      statsLabel: {
        en: 'Optimization Statistics',
        ja: '最適化統計',
      },
      categoriesLabel: {
        en: 'Category Breakdown',
        ja: 'カテゴリ内訳',
      },
      recordsBefore: {
        en: 'Records before: {{count}}',
        ja: '最適化前のレコード数: {{count}}',
      },
      recordsAfter: {
        en: 'Records after: {{count}}',
        ja: '最適化後のレコード数: {{count}}',
      },
      duplicatesRemoved: {
        en: 'Duplicates removed: {{count}}',
        ja: '削除された重複: {{count}}',
      },
      variablesOrganized: {
        en: 'Variables organized: {{count}}',
        ja: '整理された変数: {{count}}',
      },
      categoryOther: {
        en: 'Standard Records: {{count}}',
        ja: '標準レコード: {{count}}',
      },
      categoryConfidential: {
        en: 'Confidential Sellers: {{count}}',
        ja: '機密セラー: {{count}}',
      },
      categoryMissingSellerId: {
        en: 'Not in Sellers.json: {{count}}',
        ja: 'Sellers.jsonに未登録: {{count}}',
      },
      categoryNoSellerJson: {
        en: 'No Sellers.json: {{count}}',
        ja: 'Sellers.jsonなし: {{count}}',
      },
    },
    phase: {
      fetchingAdsTxt: {
        en: 'Fetching ads.txt from domain...',
        ja: 'ドメインからads.txtを取得中...',
      },
      parsingAdsTxt: {
        en: 'Parsing ads.txt content...',
        ja: 'ads.txtを解析中...',
      },
      fetchingSellersJson: {
        en: 'Fetching sellers.json data...',
        ja: 'sellers.jsonデータを取得中...',
      },
      optimizingAdsTxt: {
        en: 'Optimizing ads.txt content...',
        ja: 'ads.txtを最適化中...',
      },
      completed: {
        en: 'Optimization completed!',
        ja: '最適化が完了しました！',
      },
    },
    loadingMessage: {
      en: 'Processing...',
      ja: '処理中...',
    },
    errors: {
      emptyContent: {
        en: 'Please enter some Ads.txt content',
        ja: 'Ads.txtの内容を入力してください',
      },
      invalidDomain: {
        en: 'Please enter a valid domain',
        ja: '有効なドメインを入力してください',
      },
      fetchFailed: {
        en: 'Failed to fetch Ads.txt from the domain',
        ja: 'ドメインからのAds.txt取得に失敗しました',
      },
      optimizeFailed: {
        en: 'Failed to optimize Ads.txt content. Please try again later.',
        ja: 'Ads.txt内容の最適化に失敗しました。しばらく待ってから、もう一度お試しください',
      },
      invalidFile: {
        en: 'Please select a valid Ads.txt file',
        ja: '有効なAds.txtファイルを選択してください',
      },
    },
    success: {
      copySuccess: {
        en: 'Copied to clipboard!',
        ja: 'クリップボードにコピーしました！',
      },
      optimizeSuccess: {
        en: 'Ads.txt successfully optimized!',
        ja: 'Ads.txtの最適化に成功しました！',
      },
      operationCancelled: {
        en: 'Operation cancelled',
        ja: '処理をキャンセルしました',
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
  contact: {
    title: {
      en: 'Contact Us',
      ja: 'お問い合わせ',
    },
    description: {
      en: 'Have questions or need help? Fill out the form below and our team will get back to you as soon as possible.',
      ja: 'ご質問やサポートが必要ですか？以下のフォームにご記入いただければ、チームができるだけ早くご連絡いたします。',
    },
    form: {
      emailLabel: {
        en: 'Your Email',
        ja: 'メールアドレス',
      },
      emailPlaceholder: {
        en: 'Enter your email address',
        ja: 'メールアドレスを入力してください',
      },
      messageLabel: {
        en: 'Message',
        ja: 'メッセージ',
      },
      messagePlaceholder: {
        en: 'What would you like to ask or tell us?',
        ja: 'お問い合わせ内容を入力してください',
      },
      submitButton: {
        en: 'Send Message',
        ja: 'メッセージを送信',
      },
      emailRequired: {
        en: 'Please enter your email address',
        ja: 'メールアドレスを入力してください',
      },
      messageRequired: {
        en: 'Please enter a message',
        ja: 'メッセージを入力してください',
      },
      invalidEmail: {
        en: 'Please enter a valid email address',
        ja: '有効なメールアドレスを入力してください',
      },
      submitError: {
        en: 'An error occurred while sending your message. Please try again later.',
        ja: 'メッセージの送信中にエラーが発生しました。後でもう一度お試しください。',
      },
    },
    success: {
      title: {
        en: 'Message Sent',
        ja: 'メッセージを送信しました',
      },
      message: {
        en: 'Thank you for contacting us! We have received your message and will respond to your inquiry as soon as possible.',
        ja: 'お問い合わせありがとうございます！メッセージを受け取りました。できるだけ早くお返事いたします。',
      },
      newMessage: {
        en: 'Send Another Message',
        ja: '別のメッセージを送信',
      },
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
      optimize: {
        en: 'Optimize',
        ja: '最適化',
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
  siteAnalysis: {
    pageTitle: {
      en: 'Site Analysis',
      ja: 'サイト分析',
    },
    subtitle: {
      en: 'Analyze publisher metadata using OpenSincera API',
      ja: 'OpenSincera APIを使用してパブリッシャーメタデータを分析',
    },
    searchForm: {
      title: {
        en: 'Search Publisher Information',
        ja: 'パブリッシャー情報を検索',
      },
      domainLabel: {
        en: 'Publisher Domain',
        ja: 'パブリッシャードメイン',
      },
      domainPlaceholder: {
        en: 'Enter domain (e.g., example.com)',
        ja: 'ドメインを入力 (例: example.com)',
      },
      publisherIdLabel: {
        en: 'Publisher ID',
        ja: 'パブリッシャーID',
      },
      publisherIdPlaceholder: {
        en: 'Enter publisher ID',
        ja: 'パブリッシャーIDを入力',
      },
      searchButton: {
        en: 'Search',
        ja: '検索',
      },
      clearButton: {
        en: 'Clear',
        ja: 'クリア',
      },
      searchType: {
        en: 'Search by',
        ja: '検索方法',
      },
      searchByDomain: {
        en: 'Domain',
        ja: 'ドメイン',
      },
      searchByPublisherId: {
        en: 'Publisher ID',
        ja: 'パブリッシャーID',
      },
    },
    results: {
      title: {
        en: 'Publisher Information',
        ja: 'パブリッシャー情報',
      },
      noResults: {
        en: 'No publisher information found for the specified criteria.',
        ja: '指定された条件でパブリッシャー情報が見つかりませんでした。',
      },
      publisherId: {
        en: 'Publisher ID',
        ja: 'パブリッシャーID',
      },
      publisherName: {
        en: 'Publisher Name',
        ja: 'パブリッシャー名',
      },
      publisherDomain: {
        en: 'Publisher Domain',
        ja: 'パブリッシャードメイン',
      },
      status: {
        en: 'Status',
        ja: 'ステータス',
      },
      verificationStatus: {
        en: 'Verification Status',
        ja: '認証ステータス',
      },
      lastUpdated: {
        en: 'Last Updated',
        ja: '最終更新',
      },
      contactEmail: {
        en: 'Contact Email',
        ja: '連絡先メール',
      },
      categories: {
        en: 'Categories',
        ja: 'カテゴリ',
      },
      additionalMetadata: {
        en: 'Additional Metadata',
        ja: '追加メタデータ',
      },
    },
    fieldDescriptions: {
      publisherId: {
        en: 'Unique identifier for the publisher in the OpenSincera system',
        ja: 'OpenSinceraシステム内でのパブリッシャーの一意識別子',
      },
      publisherName: {
        en: 'Display name of the publisher or website',
        ja: 'パブリッシャーまたはウェブサイトの表示名',
      },
      publisherDomain: {
        en: 'Primary domain associated with the publisher',
        ja: 'パブリッシャーに関連付けられたプライマリドメイン',
      },
      status: {
        en: 'Current operational status of the publisher account',
        ja: 'パブリッシャーアカウントの現在の運用ステータス',
      },
      verificationStatus: {
        en: 'Verification level indicating the reliability of publisher information',
        ja: 'パブリッシャー情報の信頼性を示す認証レベル',
      },
      lastUpdated: {
        en: 'Date and time when the publisher information was last modified',
        ja: 'パブリッシャー情報が最後に更新された日時',
      },
      contactEmail: {
        en: 'Email address for contacting the publisher',
        ja: 'パブリッシャーへの連絡用メールアドレス',
      },
      categories: {
        en: 'Content categories or industry verticals associated with the publisher',
        ja: 'パブリッシャーに関連付けられたコンテンツカテゴリまたは業界セクター',
      },
    },
    statusValues: {
      active: {
        en: 'Active',
        ja: 'アクティブ',
      },
      inactive: {
        en: 'Inactive',
        ja: '非アクティブ',
      },
      suspended: {
        en: 'Suspended',
        ja: '停止中',
      },
    },
    verificationValues: {
      verified: {
        en: 'Verified',
        ja: '認証済み',
      },
      pending: {
        en: 'Pending',
        ja: '認証待ち',
      },
      unverified: {
        en: 'Unverified',
        ja: '未認証',
      },
    },
    statusDescriptions: {
      active: {
        en: 'The publisher account is currently active and operational',
        ja: 'パブリッシャーアカウントは現在アクティブで運用中です',
      },
      inactive: {
        en: 'The publisher account is inactive and not currently operational',
        ja: 'パブリッシャーアカウントは非アクティブで現在運用されていません',
      },
      suspended: {
        en: 'The publisher account has been suspended and requires attention',
        ja: 'パブリッシャーアカウントは停止されており、対応が必要です',
      },
    },
    verificationDescriptions: {
      verified: {
        en: 'Publisher information has been verified and confirmed as accurate',
        ja: 'パブリッシャー情報は認証済みで正確であることが確認されています',
      },
      pending: {
        en: 'Publisher verification is currently in progress',
        ja: 'パブリッシャーの認証は現在進行中です',
      },
      unverified: {
        en: 'Publisher information has not been verified',
        ja: 'パブリッシャー情報は認証されていません',
      },
    },
    metadataDescriptions: {
      description: {
        en: "Description or summary of the publisher's content and services",
        ja: 'パブリッシャーのコンテンツとサービスの説明または概要',
      },
      primarySupplyType: {
        en: 'Primary type of advertising inventory supply (e.g., web, mobile, video)',
        ja: '広告インベントリサプライの主要タイプ（例：ウェブ、モバイル、ビデオ）',
      },
      avgAdsToContentRatio: {
        en: 'Ads to Content Ratio(A2CR) measures the percentage of the viewport that is dedicated to ads versus the percentage dedicated to content. The number shown is the max value found on the publisher.\nA2CR is calculated when a Synthetic User visits a property or streaming channel and measures the total ad-renderable real estate (in pixels) as a percentage of the visible content. Synthetic Users scroll and interact with content to ensure the A2CR reflects the typical user experience.\n\nCampaigns that run on high A2CR properties have significantly worse performance. By overloading the Ad Experience (and increasing A2CRs) publishers annoy users, but will risk being optimized off of a media plan.',
        ja: 'Ads to Content Ratio(A2CR) は、ビューポートのうち、広告に割り当てられている割合とコンテンツに割り当てられている割合の比率です。表示されている数値は、パブリッシャーで検出された最大値です。\nA2CR は、仮想ユーザーがプロパティまたはストリーミングチャンネルを訪問したときに計算され、表示可能な広告の合計面積（ピクセル単位）を、表示されているコンテンツの割合として測定します。仮想ユーザーは、A2CR が一般的なユーザーエクスペリエンスを確実に反映するように、コンテンツをスクロールして操作します。\n\nA2CR の高いプロパティで実行されるキャンペーンは、パフォーマンスが大幅に低下します。広告エクスペリエンスに過負荷をかけ（A2CR を増加させる）、パブリッシャーはユーザーに不快感を与えるだけでなく、メディアプランから最適化の対象から外されるリスクも生じます。',
      },
      avgAdsInView: {
        en: 'Ads in View tracks how many ads are "viewable" by the user. This number changes as the user scrolls through a webpage and the ad experience adjusts. Sincera provides initial, average, and maximum values to capture these changes.\nAs the Synthetic User scrolls the content on a URL, it notes how many ad units are in the viewport. Sincera takes this data and creates an average across multiple visits to the publisher.\n\nCrowded ad environments hurt Click, Conversion, and Recall rates. Consumers find them off-putting, and buyers risk their message getting lost.',
        ja: 'Ads in View は、ユーザーによって「表示可能」な広告の数を追跡します。この数は、ユーザーがウェブページをスクロールし、広告の表示が調整されるにつれて変化します。Sincera は、これらの変化を把握するために、初期値、平均値、および最大値を提供します。\n仮想ユーザーは、URL のコンテンツをスクロールしながら、ビューポート内に表示されている広告ユニットの数を記録します。Sincera はこのデータを使用して、パブリッシャーへの複数の訪問の平均値を算出します。\n\n広告が密集した環境は、クリック率、コンバージョン率、リコール率を低下させます。消費者はこれらを不快に感じ、広告主はメッセージが埋もれてしまうリスクがあります。',
      },
      avgAdRefresh: {
        en: "Ad Refresh is the average of time, in seconds, an ad will display on a publisher before refreshing.\nSincera's Synthetic User will wait on a given URL and count the seconds between refresh events - a costly, but highly accurate way of determining ad refresh.\n\nFast ad refresh rates hurt campaign performance and carry reputational risk for publishers. Buyers should avoid running on these ad placements, and publishers should avoid blending fast-refreshing ad placements among overall slower refresh ad units.",
        ja: 'Ad Refreshとは、パブリッシャーで広告がリフレッシュされるまでの平均表示時間（秒）のことです。\nSincera の仮装ユーザーは、指定された URL で待機し、リフレッシュイベント間の秒数をカウントします。これは、コストはかかるものの、広告のリフレッシュを非常に正確に測定できる方法です。\n\nAd Refreshが速すぎると、キャンペーンのパフォーマンスが低下し、パブリッシャーの評判が損なわれるリスクがあります。購入者は、このような広告プレースメントでの掲載は避けるべきであり、パブリッシャーは、リフレッシュの遅い広告ユニット全体に、リフレッシュの速い広告プレースメントを混ぜて使用することは避けるべきです。',
      },
      totalUniqueGpids: {
        en: 'Total number of unique Global Publisher Identifiers (GPIDs) associated with the publisher.\n\nGPIDs provide essential transparency and standardization across the programmatic advertising ecosystem. A higher number of unique GPIDs indicates better inventory organization and clearer supply chain visibility, enabling buyers to make more informed decisions and reducing the risk of fraud or misrepresented inventory.',
        ja: 'パブリッシャーに関連付けられた一意のグローバルパブリッシャー識別子（GPID）の総数。\n\nGPIDは、プログラマティック広告エコシステム全体で不可欠な透明性と標準化を提供します。一意のGPIDの数が多いほど、インベントリの整理が良好で、サプライチェーンの可視性が明確であることを示し、購入者がより情報に基づいた決定を下せるようになり、詐欺や偽装されたインベントリのリスクを軽減できます。',
      },
      idAbsorptionRate: {
        en: 'The Id Absorption Rate, a metric developed by Sincera, measures how effectively SSPs append identifiers to their outgoing bid requests. It focuses on the success rate when an identifier is already present, not the overall enrichment rate. A higher score indicates that a larger proportion of real-time bidding (RTB) traffic includes user identifiers.\n\nHigher ID absorption rates enable more effective audience targeting and attribution while maintaining user privacy standards. This improves campaign performance for advertisers and increases revenue potential for publishers, creating a more efficient and sustainable advertising ecosystem.',
        ja: 'Sinceraが開発した指標である Id Absorption Rate は、SSPが送信する入札リクエストに識別子を付加する効果を測定します。この指標は、識別子が既に存在する場合の成功率に焦点を当てており、全体の識別子付加率ではありません。スコアが高いほど、リアルタイム入札（RTB）トラフィックにユーザー識別子が含まれる割合が高くなります。\n\nId Absorption Rateが高いほど、ユーザーのプライバシー基準を維持しながら、より効果的なオーディエンスターゲティングと属性分析が可能になります。これにより広告主のキャンペーンパフォーマンスが向上し、パブリッシャーの収益ポテンシャルが増加し、より効率的で持続可能な広告エコシステムが構築されます。',
      },
      avgPageWeight: {
        en: 'The average file size in MB for a given URL, which is a signal that inversely correlates with ad performance.\n\nHeavy page weights slow down loading times and degrade user experience, leading to higher bounce rates and lower ad viewability. Publishers with optimized page weights create better user experiences, improve ad performance, and contribute to a more sustainable and user-friendly web ecosystem.',
        ja: 'コンテンツ、画像、広告を含むページの平均総サイズ（KB または MB）。これは、広告パフォーマンスと逆相関する指標です。\n\nページが重いと読み込み時間が遅くなり、ユーザーエクスペリエンスが低下し、直帰率の増加と広告視認性の低下を招きます。最適化されたページウェイトを持つパブリッシャーは、より良いユーザーエクスペリエンスを提供し、広告パフォーマンスを向上させ、より持続可能でユーザーフレンドリーなウェブエコシステムに貢献します。',
      },
      avgCpu: {
        en: 'The average CPU usage for a given URL, which is a signal that inversely correlates with ad performance. CPU usage is measured in seconds.\n\nHigh CPU usage indicates resource-intensive pages that can slow down devices and drain battery life, particularly on mobile devices. Lower CPU usage ensures better user experience, improved ad performance, and supports accessibility across different device capabilities and internet speeds.',
        ja: 'ページレンダリングのための平均CPU使用率または処理要件。これは、広告パフォーマンスと逆相関する指標です。CPU使用率は秒単位で測定されます。\n\n高いCPU使用率は、デバイスの動作を遅くし、特にモバイルデバイスでバッテリー寿命を短縮する可能性があるリソース集約的なページを示します。低いCPU使用率により、より良いユーザーエクスペリエンス、向上した広告パフォーマンスが保証され、異なるデバイス性能とインターネット速度にわたるアクセシビリティがサポートされます。',
      },
      totalSupplyPaths: {
        en: "The total number of supply paths an ad takes from the advertiser to the publisher's website or app where it is displayed. It includes the series of intermediaries involved in the selling and delivery of the ad inventory, such as ad exchanges, SSPs, and other resellers.\n\nMultiple supply paths can increase costs and reduce transparency in the advertising supply chain. Publishers with fewer, more direct supply paths offer better value for advertisers and clearer attribution, promoting a more efficient and trustworthy programmatic advertising ecosystem.",
        ja: '広告が広告主からパブリッシャーのウェブサイトやアプリに表示されるまでのサプライパスの総数。広告インベントリの販売と配信に関与する一連の中間業者（広告交換、SSP、その他のリセラーなど）を含みます。\n\n複数のサプライパスは、広告サプライチェーンにおけるコストの増加と透明性の低下を招く可能性があります。より少ない、より直接的なサプライパスを持つパブリッシャーは、広告主により良い価値を提供し、より明確な属性分析を可能にし、より効率的で信頼できるプログラマティック広告エコシステムを促進します。',
      },
      resellerCount: {
        en: "Number of resellers or intermediaries involved in the publisher's advertising supply chain.\n\nFewer intermediaries mean lower fees, better transparency, and more revenue flowing to content creators. Publishers with streamlined supply chains offer better value to advertisers and contribute to a more direct, efficient, and sustainable advertising ecosystem that benefits both buyers and sellers.",
        ja: 'パブリッシャーの広告サプライチェーンに関わるリセラーまたは中間業者の数。\n\n中間業者が少ないほど、手数料が低くなり、透明性が向上し、コンテンツクリエイターにより多くの収益が流れます。合理化されたサプライチェーンを持つパブリッシャーは、広告主により良い価値を提供し、買い手と売り手の両方に利益をもたらす、より直接的で効率的かつ持続可能な広告エコシステムに貢献します。',
      },
      slug: {
        en: 'URL-friendly identifier or slug for the publisher.',
        ja: 'パブリッシャーのURL対応識別子またはスラッグ。',
      },
    },
    errors: {
      searchRequired: {
        en: 'Please enter either a domain or publisher ID to search',
        ja: '検索するにはドメインまたはパブリッシャーIDを入力してください',
      },
      invalidDomain: {
        en: 'Please enter a valid domain format (e.g., example.com)',
        ja: '有効なドメイン形式を入力してください (例: example.com)',
      },
      searchFailed: {
        en: 'Search failed. Please try again later.',
        ja: '検索に失敗しました。後でもう一度お試しください。',
      },
      networkError: {
        en: 'Network error. Please check your connection and try again.',
        ja: 'ネットワークエラー。接続を確認してもう一度お試しください。',
      },
      apiError: {
        en: 'API error: {{message}}',
        ja: 'APIエラー: {{message}}',
      },
    },
    loading: {
      searching: {
        en: 'Searching publisher information...',
        ja: 'パブリッシャー情報を検索中...',
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
