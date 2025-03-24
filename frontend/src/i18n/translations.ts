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
