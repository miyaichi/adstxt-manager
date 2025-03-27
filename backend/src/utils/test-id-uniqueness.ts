import * as fs from 'fs';
import * as path from 'path';

// seller_idの重複チェックをテストする関数
function testSellerIdUniqueness(domainName: string) {
  const dataPath = path.join(__dirname, '../../data/sellers_json', `${domainName}.json`);

  try {
    // ファイルを読み込む
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const sellersData = JSON.parse(fileContent);

    if (!sellersData.sellers || !Array.isArray(sellersData.sellers)) {
      console.log(`No valid sellers array found in ${domainName}.json`);
      return;
    }

    // seller_idのカウントを記録するMap
    const sellerIdCounts = new Map<string, number>();

    // 各seller_idをカウント
    sellersData.sellers.forEach((seller: any) => {
      if (seller.seller_id) {
        const sellerId = seller.seller_id.toString().trim();
        sellerIdCounts.set(sellerId, (sellerIdCounts.get(sellerId) || 0) + 1);
      }
    });

    console.log(`Total unique seller_ids in ${domainName}.json: ${sellerIdCounts.size}`);

    // 複数回出現するseller_idを見つける
    const duplicates = Array.from(sellerIdCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicated seller_ids in ${domainName}.json:`);
      duplicates.forEach((dup) => {
        console.log(`  - seller_id "${dup.id}" appears ${dup.count} times`);
      });
    } else {
      console.log(`No duplicated seller_ids found in ${domainName}.json`);
    }

    // 特定のseller_idの詳細を表示
    const targetId = '540838151';
    const occurrences = sellersData.sellers.filter(
      (seller: any) => seller.seller_id && seller.seller_id.toString().trim() === targetId
    );

    if (occurrences.length > 0) {
      console.log(
        `\nFound ${occurrences.length} occurrences of seller_id "${targetId}" in ${domainName}.json:`
      );
      occurrences.forEach((seller: any, index: number) => {
        console.log(`  Occurrence #${index + 1}:`);
        console.log(`    name: ${seller.name}`);
        console.log(`    domain: ${seller.domain}`);
        console.log(`    seller_type: ${seller.seller_type}`);
      });
    } else {
      console.log(`\nseller_id "${targetId}" not found in ${domainName}.json`);
    }
  } catch (error) {
    console.error(`Error processing ${domainName}.json:`, error);
  }
}

// テスト実行
testSellerIdUniqueness('openx.com');
