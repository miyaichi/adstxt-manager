import { parseAdsTxtLine, crossCheckAdsTxtRecords } from './validation';

// テスト関数
async function testFixedValidation() {
  // テスト用のレコードを作成
  const record1 = parseAdsTxtLine('openx.com,540838151,RESELLER,6a698e2ec38604c6', 1);

  console.log('Testing with publisher domain: nikkei.com');
  console.log('Testing record:', record1);

  if (record1) {
    // 検証を実行
    const validatedRecords = await crossCheckAdsTxtRecords('nikkei.com', [record1]);

    // 結果の表示
    console.log('\n=== Validation Results ===');
    console.log(`Has warning: ${validatedRecords[0].has_warning}`);
    console.log(`Warning: ${validatedRecords[0].warning}`);

    // 詳細な検証結果を表示
    if (validatedRecords[0].validation_results) {
      console.log('\nDetailed validation results:');
      console.log(`- hasSellerJson: ${validatedRecords[0].validation_results.hasSellerJson}`);
      console.log(
        `- accountIdInSellersJson: ${validatedRecords[0].validation_results.accountIdInSellersJson}`
      );
      console.log(
        `- resellerAccountIdInSellersJson: ${validatedRecords[0].validation_results.resellerAccountIdInSellersJson}`
      );
      console.log(
        `- resellerEntryHasIntermediaryType: ${validatedRecords[0].validation_results.resellerEntryHasIntermediaryType}`
      );
      console.log(
        `- resellerSellerIdIsUnique: ${validatedRecords[0].validation_results.resellerSellerIdIsUnique}`
      );
    }

    // 警告リストがあれば表示
    if (validatedRecords[0].all_warnings) {
      console.log('\nAll warnings:');
      validatedRecords[0].all_warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.key}`);
        if (warning.params) {
          console.log(`   Parameters: ${JSON.stringify(warning.params)}`);
        }
      });
    }
  }
}

// テスト実行
testFixedValidation().catch(console.error);
