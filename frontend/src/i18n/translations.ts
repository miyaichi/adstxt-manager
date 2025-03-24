export const translations = {
  common: {
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
    selectFile: {
      en: 'Selected file:',
      ja: '選択ファイル:',
    },
    dropFileHere: {
      en: 'Click or drag and drop files here',
      ja: 'ファイルをクリックまたはドラッグ＆ドロップしてください',
    },
    fileRequired: {
      en: 'Please select a file',
      ja: 'ファイルを選択してください',
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
        en: "As an advertising service or agency, request an update to a publisher's Ads.txt file. Simply upload a CSV file or manually enter records to apply.",
        ja: '広告サービスや代理店として、パブリッシャーにAds.txtファイルの更新をリクエストします。CSVファイルをアップロードするか、レコードを手動で入力するだけで簡単に申請できます。',
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
  newRequestPage: {
    breadcrumb: {
      en: 'New Request',
      ja: '新規リクエスト',
    },
  },
  notFoundPage: {
    title: {
      en: 'Page Not Found',
      ja: 'ページが見つかりません',
    },
    description: {
      en: 'The page you are looking for may not exist or may have been moved.',
      ja: 'お探しのページは存在しないか、移動された可能性があります。',
    },
    button: {
      en: 'Return to Home',
      ja: 'ホームに戻る',
    },
  },
  requestDetailPage: {
    breadcrumb: {
      en: 'Request Details',
      ja: 'リクエスト詳細',
    },
    errors: {
      noId: {
        en: 'No Request ID',
        ja: 'リクエストIDがありません',
      },
      noIdDescription: {
        en: 'No request ID has been specified. Please check the URL.',
        ja: 'リクエストIDが指定されていません。URLを確認してください',
      },
      noToken: {
        en: 'No Token',
        ja: 'トークンがありません',
      },
      noTokenDescription: {
        en: 'No access token has been specified. Please check the URL.',
        ja: 'アクセストークンが指定されていません。URLを確認してください',
      },
    },
  },
  requestListPage: {
    breadcrumb: {
      en: 'Request List',
      ja: 'リクエスト一覧',
    },
    title: {
      en: 'Request List',
      ja: 'リクエスト一覧',
    },
    emailLabel: {
      en: 'Email Address:',
      ja: 'メールアドレス:',
    },
    searchPlaceholder: {
      en: 'Enter search terms',
      ja: '検索内容を入力',
    },
    searchLabel: {
      en: 'Search Requests',
      ja: 'リクエスト検索',
    },
    totalRequests: {
      en: 'Total {{count}} requests',
      ja: '合計 {{count}} 件のリクエスト',
    },
    noRequests: {
      en: 'No requests found',
      ja: 'リクエストが見つかりませんでした',
    },
    changeSearch: {
      en: 'Please change your search criteria',
      ja: '検索条件を変更してください',
    },
    pendingTitle: {
      en: 'Pending ({{count}})',
      ja: '保留中 ({{count}})',
    },
    approvedTitle: {
      en: 'Approved ({{count}})',
      ja: '承認済み ({{count}})',
    },
    rejectedTitle: {
      en: 'Rejected ({{count}})',
      ja: '却下 ({{count}})',
    },
    updatedTitle: {
      en: 'Updated ({{count}})',
      ja: '更新済み ({{count}})',
    },
    errors: {
      noEmail: {
        en: 'No Email Address Specified',
        ja: 'メールアドレスが指定されていません',
      },
      noEmailDescription: {
        en: 'An email address is required to view requests',
        ja: 'リクエスト表示にはメールアドレスが必要です',
      },
      fetchError: {
        en: 'An error occurred while retrieving requests',
        ja: 'リクエストの取得中にエラーが発生しました',
      },
    },
  },
  adsTxt: {
    fileUpload: {
      title: {
        en: 'Ads.txt File Upload',
        ja: 'Ads.txtファイルアップロード',
      },
      stats: {
        en: 'Records: {{total}} | Valid: {{valid}} | Invalid: {{invalid}}',
        ja: 'レコード数: {{total}} | 有効: {{valid}} | 無効: {{invalid}}',
      },
    },
    recordItem: {
      domain: {
        en: 'Domain',
        ja: 'ドメイン',
      },
      accountId: {
        en: 'Account ID',
        ja: 'アカウントID',
      },
      accountType: {
        en: 'Account Type',
        ja: 'アカウントタイプ',
      },
      relationship: {
        en: 'Relationship',
        ja: '関係',
      },
      certificationAuthorityId: {
        en: 'Certification Authority ID',
        ja: '認証局ID',
      },
    },
    recordList: {
      title: {
        en: 'Ads.txt Records',
        ja: 'Ads.txtレコード',
      },
      searchLabel: {
        en: 'Search Records',
        ja: 'レコードを検索',
      },
      searchPlaceholder: {
        en: 'Enter domain or account ID',
        ja: 'ドメインやアカウントIDを入力',
      },
      noRecords: {
        en: 'No records',
        ja: 'レコードがありません',
      },
      noMatchingRecords: {
        en: 'No records match your search criteria',
        ja: '検索条件に一致するレコードはありません',
      },
      totalRecords: {
        en: 'Total {{count}} records',
        ja: '合計 {{count}} 件のレコード',
      },
    },
  },
  messages: {
    form: {
      title: {
        en: 'New Message',
        ja: '新規メッセージ',
      },
      emailLabel: {
        en: 'Email Address',
        ja: 'メールアドレス',
      },
      messageLabel: {
        en: 'Message',
        ja: 'メッセージ',
      },
      messagePlaceholder: {
        en: 'Enter your message here...',
        ja: 'メッセージ内容を入力してください...',
      },
      requiredFields: {
        en: 'Message content and email address are required',
        ja: 'メッセージ内容とメールアドレスは必須です',
      },
      sendError: {
        en: 'An error occurred while sending the message',
        ja: 'メッセージの送信中にエラーが発生しました',
      },
      sendSuccess: {
        en: 'Message sent successfully',
        ja: 'メッセージが送信されました',
      },
    },
    list: {
      title: {
        en: 'Message History',
        ja: 'メッセージ履歴',
      },
      noMessages: {
        en: 'No messages yet',
        ja: 'まだメッセージはありません',
      },
      fetchError: {
        en: 'An error occurred while retrieving messages',
        ja: 'メッセージの取得中にエラーが発生しました',
      },
    },
    item: {
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
  requests: {
    form: {
      title: {
        en: 'Create New Request',
        ja: '新規リクエスト作成',
      },
      description: {
        en: 'This form creates a request to update the Ads.txt file. The request will be sent to the publisher for review.',
        ja: 'このフォームはAds.txtファイル更新のリクエストを作成します。パブリッシャーにリクエストが送信され、確認されます。',
      },
      basicInfo: {
        en: 'Basic Information',
        ja: '基本情報',
      },
      publisherEmail: {
        en: "Publisher's Email Address *",
        ja: 'パブリッシャーのメールアドレス *',
      },
      publisherName: {
        en: 'Publisher Name',
        ja: 'パブリッシャー名',
      },
      publisherDomain: {
        en: 'Publisher Domain',
        ja: 'パブリッシャードメイン',
      },
      requesterEmail: {
        en: "Requester's Email Address *",
        ja: 'リクエスターのメールアドレス *',
      },
      requesterName: {
        en: 'Requester Name *',
        ja: 'リクエスター名 *',
      },
      adsTxtRecords: {
        en: 'Ads.txt Records',
        ja: 'Ads.txtレコード',
      },
      fileUploadTab: {
        en: 'File Upload',
        ja: 'ファイルアップロード',
      },
      selectedRecordsTab: {
        en: 'Selected Records',
        ja: '選択レコード',
      },
      selectedRecords: {
        en: 'Selected Records',
        ja: '選択レコード',
      },
      noRecordsSelected: {
        en: 'No records selected. Please upload a file to select records.',
        ja: 'レコードが選択されていません。ファイルアップロードしてレコードを選択してください。',
      },
      submitRequest: {
        en: 'Submit Request',
        ja: 'リクエスト送信',
      },
      requiredFieldsError: {
        en: "Publisher's email, requester's email, and requester name are required",
        ja: 'パブリッシャーのメールアドレス、リクエスターのメールアドレス、リクエスター名は必須です',
      },
      recordsRequiredError: {
        en: 'Please select at least one Ads.txt record',
        ja: '少なくとも1つのAds.txtレコードを選択してください',
      },
      processingError: {
        en: 'An error occurred while processing your request',
        ja: 'リクエスト処理中にエラーが発生しました',
      },
    },
    success: {
      title: {
        en: 'Request Submitted Successfully',
        ja: 'リクエスト送信完了',
      },
      message: {
        en: 'The request has been sent to the publisher. Please save the Request ID and Access Token.',
        ja: 'リクエストがパブリッシャーに送信されました。リクエストIDとトークンを保存してください。',
      },
      requestId: {
        en: 'Request ID:',
        ja: 'リクエストID:',
      },
      accessToken: {
        en: 'Access Token:',
        ja: 'アクセストークン:',
      },
      saveInfo: {
        en: 'You will need this information to check or update your request.',
        ja: 'リクエストの確認や更新のためにこの情報が必要になります。',
      },
      viewRequest: {
        en: 'View Request',
        ja: 'リクエストを表示',
      },
    },
    detail: {
      title: {
        en: 'Request Details',
        ja: 'リクエスト詳細',
      },
      status: {
        en: 'Status:',
        ja: 'ステータス:',
      },
      created: {
        en: 'Created:',
        ja: '作成日時:',
      },
      updated: {
        en: 'Last Updated:',
        ja: '最終更新:',
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
      records: {
        title: {
          en: 'Ads.txt Records',
          ja: 'Ads.txtレコード',
        },
      },
      actions: {
        title: {
          en: 'Actions',
          ja: 'アクション',
        },
        approve: {
          en: 'Approve Request',
          ja: 'リクエストを承認',
        },
        reject: {
          en: 'Reject Request',
          ja: 'リクエストを却下',
        },
        download: {
          en: 'Download Ads.txt',
          ja: 'Ads.txtをダウンロード',
        },
        approveConfirm: {
          en: 'Are you sure you want to approve this request?',
          ja: 'このリクエストを承認してもよろしいですか？',
        },
        rejectConfirm: {
          en: 'Are you sure you want to reject this request?',
          ja: 'このリクエストを却下してもよろしいですか？',
        },
      },
      loading: {
        en: 'Loading request details...',
        ja: 'リクエスト詳細を読み込み中...',
      },
      error: {
        fetchError: {
          en: 'Failed to fetch request details',
          ja: 'リクエスト詳細の取得に失敗しました',
        },
        updateError: {
          en: 'Failed to update request status',
          ja: 'リクエストステータスの更新に失敗しました',
        },
      },
    },
    item: {
      status: {
        en: 'Status:',
        ja: 'ステータス:',
      },
      created: {
        en: 'Created:',
        ja: '作成日時:',
      },
      publisher: {
        en: 'Publisher:',
        ja: 'パブリッシャー:',
      },
      requester: {
        en: 'Requester:',
        ja: 'リクエスター:',
      },
      domain: {
        en: 'Domain:',
        ja: 'ドメイン:',
      },
      recordCount: {
        en: 'Records: {{count}}',
        ja: 'レコード数: {{count}}',
      },
      viewDetails: {
        en: 'View Details',
        ja: '詳細を表示',
      },
    },
  },
  footer: {
    copyright: {
      en: '© {{year}} Ads.txt Manager',
      ja: '© {{year}} Ads.txt マネージャー',
    },
  },
  errorMessage: {
    defaultTitle: {
      en: 'An error occurred',
      ja: 'エラーが発生しました',
    },
  }
};

// Create a translation helper function
export const t = (key: string, language: string, params?: Record<string, any>): string => {
  const keys = key.split('.');
  let value: any = translations;

  // Navigate through the nested objects
  for (const k of keys) {
    if (value[k] === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    value = value[k];
  }

  // Get the translation for the specified language or fallback to English
  const translation = value[language] || value['en'];
  if (!translation) {
    console.warn(`Translation not found for key: ${key} in language: ${language}`);
    return key;
  }

  // Replace parameters if they exist
  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    }, translation);
  }

  return translation;
};
