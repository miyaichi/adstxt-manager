#!/bin/bash

# Bulk translation refactoring script
# Processes multiple files efficiently

echo "Starting bulk translation refactoring..."

# List of files to process (excluding already done ones)
files=(
  "src/pages/EditRequestPage.tsx"
  "src/pages/RequestListPage.tsx"
  "src/components/adsTxt/AdsTxtRecordList.tsx"
  "src/pages/ContactPage.tsx"
  "src/components/requests/RequestItem.tsx"
  "src/pages/HomePage.tsx"
  "src/pages/RequestDetailPage.tsx"
  "src/components/adsTxt/ValidationSummary.tsx"
  "src/pages/StatusPage.tsx"
  "src/components/adsTxt/AdsTxtTextInput.tsx"
  "src/components/adsTxt/AdsTxtRecordItem.tsx"
  "src/components/messages/MessageForm.tsx"
  "src/pages/MarkdownPage.tsx"
  "src/components/messages/MessageList.tsx"
  "src/components/common/Header.tsx"
  "src/components/common/Footer.tsx"
  "src/pages/NotFoundPage.tsx"
  "src/pages/NewRequestPage.tsx"
  "src/components/messages/MessageItem.tsx"
  "src/components/common/WarningPopover.tsx"
  "src/components/common/ErrorMessage.tsx"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]] && grep -q "t('.*', language" "$file"; then
    echo "Processing: $file"
    
    # 1. Replace imports
    if grep -q "import.*useApp.*AppContext" "$file" && grep -q "import.*t.*translations" "$file"; then
      sed -i '' 's/import { useApp } from.*AppContext.*;//g' "$file"
      sed -i '' 's/import { t } from.*translations.*;//g' "$file" 
      # Add new import at the top
      sed -i '' '1i\
import { useTranslation } from '\''../../hooks/useTranslation'\'';' "$file"
      # Clean up duplicate imports
      sed -i '' '/^import { useTranslation.*$/N; s/import { useTranslation.*\nimport { useTranslation.*/import { useTranslation } from '\''..\/..\/hooks\/useTranslation'\'';/' "$file"
    elif grep -q "import.*t.*translations" "$file"; then
      # Handle relative path based on file location
      if [[ "$file" == src/pages/* ]]; then
        sed -i '' 's/import { t } from.*translations.*/import { useTranslation } from '\''..\/hooks\/useTranslation'\'';/' "$file"
      else
        sed -i '' 's/import { t } from.*translations.*/import { useTranslation } from '\''..\/..\/hooks\/useTranslation'\'';/' "$file"
      fi
    fi
    
    # 2. Replace const { language } = useApp() with const translate = useTranslation()
    sed -i '' 's/const { language } = useApp();/const translate = useTranslation();/' "$file"
    
    # 3. Replace translation calls
    sed -i '' "s/t('/translate('/g" "$file"
    sed -i '' "s/', language)/')/g" "$file"
    sed -i '' "s/', language,/', [/g" "$file"
    sed -i '' "s/{ message:.*}/[&]/g" "$file"
    
    echo "✓ Completed: $file"
  else
    echo "⚠ Skipped: $file (not found or no translations)"
  fi
done

echo ""
echo "Bulk refactoring completed!"
echo "Running build test..."

# Test build
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful! All files refactored correctly."
else
  echo "❌ Build failed. Please check the errors above."
fi