import { Request, Response } from 'express';
import axios from 'axios';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import SellersJsonCacheModel, {
  SellersJsonContent,
  SellersJsonCacheStatus,
} from '../models/SellersJsonCache';
import { logger } from '../utils/logger';
import { Readable } from 'stream';
import { createParser } from 'stream-json/Parser';
import { streamArray } from 'stream-json/streamers/StreamArray';

import fs from 'fs';
import path from 'path';

/**
 * Special domains with non-standard sellers.json URLs
 */
const SPECIAL_DOMAINS: Record<string, string> = {
  'google.com': 'https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json',
  'advertising.com': 'https://dragon-advertising.com/sellers.json',
};

/**
 * 事前にダウンロードしたsellers.jsonファイルを使用するドメインリスト
 */
const PREFETCHED_DOMAINS = [
  'ad-generation.jp',
  'google.com',
  'openx.com',
  'appnexus.com',
  'pubmatic.com',
  'rubiconproject.com',
  'smartadserver.com',
  'spotx.tv',
  'mediamath.com',
];

/**
 * 事前にダウンロードしたsellers.jsonファイルのパスを取得
 */
const getPrefetchedFilePath = (domain: string): string => {
  return path.join(process.cwd(), 'data', 'sellers_json', `${domain}.json`);
};

/**
 * Fetch sellers.json from a domain and return cached or fresh data
 * @route GET /api/sellersjson/:domain
 */
/**
 * Get a specific seller from a domain's sellers.json by seller_id
 * Uses streaming to efficiently process large files
 * @route GET /api/sellersjson/:domain/seller/:sellerId
 */
export const getSellerById = asyncHandler(async (req: Request, res: Response) => {
  const { domain, sellerId } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  if (!sellerId) {
    throw new ApiError(400, 'Seller ID parameter is required', 'errors:sellerIdRequired');
  }

  // sellerId は様々な型（文字列や数値）で提供されることがあるため、
  // 比較のために文字列に変換されたsellerIdを用意（不要な空白も除去）
  const normalizedSellerId = String(sellerId).trim();

  try {
    // Determine URL to fetch
    let url: string;

    // 標準のURL形式を使用（デフォルト）
    url = `https://${domain}/sellers.json`;

    // 一部のドメインは特別なURLが必要
    if (domain in SPECIAL_DOMAINS) {
      url = SPECIAL_DOMAINS[domain];
      logger.info(`Using special URL for ${domain}: ${url}`);
    }

    logger.info(`Streaming sellers.json from ${url} to find seller_id: ${normalizedSellerId}`);

    // デバッグ情報を追加
    logger.debug(
      `Request details: domain=${domain}, sellerId=${sellerId}, normalizedSellerId=${normalizedSellerId}`
    );

    // 取得前にデバッグ情報を記録
    logger.debug(`Making request to URL: ${url} for seller_id: ${normalizedSellerId}`);

    // 事前にダウンロードしたファイルがあるか確認
    if (PREFETCHED_DOMAINS.includes(domain)) {
      const filePath = getPrefetchedFilePath(domain);

      logger.info(`Checking for pre-fetched sellers.json file at ${filePath}`);

      // ファイルが存在するか確認
      if (fs.existsSync(filePath)) {
        try {
          logger.info(`Using pre-fetched sellers.json for ${domain}`);

          // ファイルを読み込む
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const sellerData = JSON.parse(fileContent);

          if (sellerData && Array.isArray(sellerData.sellers)) {
            // seller_idに一致するセラーを探す
            const targetSeller = sellerData.sellers.find(
              (seller: any) => String(seller.seller_id).trim() === normalizedSellerId
            );

            logger.info(
              `Found ${sellerData.sellers.length} sellers in pre-fetched file for ${domain}`
            );

            if (targetSeller) {
              // セラーが見つかった場合
              logger.info(
                `Found seller with ID ${normalizedSellerId} in pre-fetched file for ${domain}`
              );

              const result = {
                contact_email: sellerData.contact_email,
                version: sellerData.version,
                identifiers: sellerData.identifiers || [],
                seller: targetSeller,
              };

              return res.status(200).json({
                success: true,
                data: result,
              });
            } else {
              logger.warn(
                `Seller ID ${normalizedSellerId} not found in pre-fetched file for ${domain}`
              );

              // セラーIDが見つからない場合は、エラーではなく「見つからない」という情報を返す
              return res.status(200).json({
                success: true,
                data: {
                  found: false,
                  message: `Seller ID ${normalizedSellerId} not found in pre-fetched file for ${domain}`,
                  sellerId: normalizedSellerId,
                },
              });
            }
          }
        } catch (error: any) {
          logger.error(`Error reading pre-fetched sellers.json for ${domain}: ${error.message}`);
          // エラーが発生した場合は、APIからの取得を試みる
        }
      } else {
        logger.warn(`No pre-fetched sellers.json file found for ${domain} at ${filePath}`);
      }
    }

    // Use streaming with Axios (デフォルトのアプローチまたはフォールバック)
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'AdsTxtManager/1.0',
        Accept: 'application/json',
      },
    });

    const stream = response.data;

    // Create JSON streaming parser pipeline for sellers array
    let sellerFound = false;
    let contactInfo: Record<string, string> = {};
    let identifiers: Array<Record<string, string>> = [];
    let version = '';
    let inMetadata = true; // Flag to track if we're in metadata section

    // Initialize a promise that will resolve when we find the seller or finish processing
    const processingPromise = new Promise<any>((resolve, reject) => {
      // Create parser pipeline
      const parser = createParser({
        // パースエラーに関する詳細なデバッグ情報を有効化
        jsonStreaming: true,
        packValues: true,
        packKeys: true,
      });
      let currentPath: string[] = [];
      let currentKey: string | null = null;
      let currentObject: Record<string, any> = {};

      // ストリームデータ受信のデバッグ用
      stream.on('data', (chunk) => {
        logger.debug(`Received data chunk from ${url} (${chunk.length} bytes)`);
      });

      // Setup parser event handlers
      parser.on('startObject', () => {
        currentObject = {};
      });

      parser.on('startArray', () => {
        const currentPathStr = currentPath.join('.');
        if (currentPathStr === 'sellers') {
          inMetadata = false;
        }
      });

      parser.on('keyValue', ({ key, value }: { key: string; value: any }) => {
        const currentPathStr = currentPath.join('.');

        if (inMetadata) {
          // Process metadata fields
          if (key === 'contact_email' || key === 'contact_address' || key === 'version') {
            contactInfo[key] = value;
            if (key === 'version') version = value;
          } else if (currentPathStr === 'identifiers') {
            currentObject[key] = value;
          }
        } else if (currentPathStr === 'sellers') {
          // We're inside a seller object in the sellers array
          currentObject[key] = value;

          // Check if this is the seller we're looking for
          // 文字列として比較して、seller_idが数値の場合にも対応
          if (key === 'seller_id' && String(value).trim() === normalizedSellerId) {
            sellerFound = true;
          }
        }

        currentKey = key;
      });

      parser.on('endObject', () => {
        const currentPathStr = currentPath.join('.');

        if (currentPathStr === 'identifiers') {
          identifiers.push(currentObject);
        } else if (sellerFound && currentPathStr === 'sellers') {
          // We found our seller, we can stop streaming and return the result
          stream.destroy(); // Stop the stream

          // Construct the response object
          const result = {
            ...contactInfo,
            version,
            identifiers,
            seller: currentObject,
          };

          resolve(result);
        }

        currentObject = {};
      });

      parser.on('startKey', () => {
        if (currentKey) {
          currentPath.push(currentKey);
        }
      });

      parser.on('endKey', () => {
        if (currentPath.length > 0) {
          currentPath.pop();
        }
      });

      parser.on('end', () => {
        if (!sellerFound) {
          // セラーが見つからない場合は、エラーではなく空のセラー情報を返す
          resolve({
            error: null,
            found: false,
            message: 'Seller ID not found in sellers.json',
            sellerId,
          });
        }
      });

      parser.on('error', (err) => {
        logger.error(`JSON parsing error for ${url}: ${err.message}`);

        // Node.jsのストリームはcloneNodeメソッドを持たないので、別の方法でエラーを記録
        logger.error(
          `JSON parse error details: ${JSON.stringify(
            {
              url,
              sellerId: normalizedSellerId,
              errorType: err.name,
              errorMessage: err.message,
              errorStack: err.stack,
            },
            null,
            2
          )}`
        );

        reject(new Error(`Error parsing sellers.json: ${err.message}`));
      });

      // Feed the stream into the parser
      stream.pipe(parser);
    });

    // Wait for the processing to complete
    const result = await processingPromise;

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error(`Error fetching seller ${sellerId} from ${domain}:`, error);
    throw new ApiError(
      500,
      `Error fetching seller information: ${error.message}`,
      'errors:sellersFetchError',
      { message: error.message }
    );
  }
});

/**
 * Fetch sellers.json from a domain and return cached or fresh data
 * @route GET /api/sellersjson/:domain
 */
export const getSellersJson = asyncHandler(async (req: Request, res: Response) => {
  const { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'errors:domainRequired');
  }

  try {
    // Check if we have a cached version
    const cachedData = await SellersJsonCacheModel.getByDomain(domain);

    // If we have cached data and it's not expired, return it
    if (cachedData && !SellersJsonCacheModel.isCacheExpired(cachedData.updated_at)) {
      logger.info(`Serving cached sellers.json for domain: ${domain}`);

      return res.status(200).json({
        success: true,
        data: {
          domain,
          content: cachedData.content ? JSON.parse(cachedData.content) : null,
          status: cachedData.status,
          status_code: cachedData.status_code,
          error_message: cachedData.error_message,
          cached: true,
          updated_at: cachedData.updated_at,
        },
      });
    }

    // Either no cache or cache expired, fetch fresh data
    logger.info(`Fetching fresh sellers.json for domain: ${domain}`);

    // Determine URL to fetch
    let url: string;

    // 標準のURL形式を使用（デフォルト）
    url = `https://${domain}/sellers.json`;

    // 一部のドメインは特別なURLが必要
    if (domain in SPECIAL_DOMAINS) {
      url = SPECIAL_DOMAINS[domain];
      logger.info(`Using special URL for ${domain}: ${url}`);
    }

    // Fetch the sellers.json
    let response;
    try {
      logger.info(`Fetching from URL: ${url}`);
      response = await axios.get(url, {
        timeout: 30000, // Increase timeout for large files
        validateStatus: () => true, // Allow any status code
        maxContentLength: 200 * 1024 * 1024, // 200MB to handle Google's ~114MB file
        decompress: true, // Handle gzipped responses
      });
    } catch (error: any) {
      logger.error(`Error fetching from ${url}: ${error.message}`);
      throw new Error(`Failed to fetch sellers.json: ${error.message}`);
    }

    // Prepare cache record
    let cacheRecord: {
      domain: string;
      content: string | null;
      status: SellersJsonCacheStatus;
      status_code: number | null;
      error_message: string | null;
    } = {
      domain,
      content: null,
      status: 'error',
      status_code: response.status,
      error_message: null,
    };

    // Process response based on status code
    if (response.status === 200) {
      try {
        const contentType = response.headers['content-type'];

        // Check if response is JSON
        if (contentType && contentType.includes('application/json')) {
          // Validate that it's a sellers.json format (should have sellers array or other required fields)
          const jsonData: SellersJsonContent = response.data;

          if (
            jsonData &&
            (Array.isArray(jsonData.sellers) || jsonData.contact_email || jsonData.identifiers)
          ) {
            cacheRecord.status = 'success';
            cacheRecord.content = JSON.stringify(jsonData);
          } else {
            cacheRecord.status = 'invalid_format';
            cacheRecord.error_message =
              'Response is JSON but does not contain required sellers.json fields';
          }
        } else {
          cacheRecord.status = 'invalid_format';
          cacheRecord.error_message = `Invalid content type: ${contentType}`;
        }
      } catch (error) {
        cacheRecord.status = 'invalid_format';
        cacheRecord.error_message = 'Failed to parse JSON response';
      }
    } else if (response.status === 404) {
      cacheRecord.status = 'not_found';
      cacheRecord.error_message = 'sellers.json file not found';
    } else {
      cacheRecord.error_message = `HTTP error ${response.status}`;
    }

    // Save to cache
    const savedCache = await SellersJsonCacheModel.saveCache(cacheRecord);

    // Return response
    return res.status(200).json({
      success: true,
      data: {
        domain,
        url: url,
        content: savedCache.content ? JSON.parse(savedCache.content) : null,
        status: savedCache.status,
        status_code: savedCache.status_code,
        error_message: savedCache.error_message,
        cached: false,
        updated_at: savedCache.updated_at,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching sellers.json for domain ${domain}:`, error);

    // Save error to cache
    const errorMessage = error.message || 'Unknown error';
    await SellersJsonCacheModel.saveCache({
      domain,
      content: null,
      status: 'error',
      status_code: error.response?.status || null,
      error_message: errorMessage,
    });

    throw new ApiError(
      500,
      `Error fetching sellers.json: ${errorMessage}`,
      'errors:sellersFetchError',
      { message: errorMessage }
    );
  }
});
