#!/bin/bash

# Translation refactoring script
# Converts t('key', language) to translate('key') pattern

echo "Starting translation refactoring..."

# Find all TSX and TS files that use the old translation pattern
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Skip the translations file itself and the new hook
  if [[ "$file" == *"translations.ts"* ]] || [[ "$file" == *"useTranslation.ts"* ]]; then
    continue
  fi
  
  # Check if file contains the old pattern
  if grep -q "t('.*', language" "$file"; then
    echo "Processing: $file"
    
    # Add import for useTranslation if t() is used and useApp is imported
    if grep -q "import.*useApp" "$file" && grep -q "import.*t.*from.*translations" "$file"; then
      # Replace the imports
      sed -i '' 's/import { useApp } from/import { useTranslation } from '\''..\/hooks\/useTranslation'\''; import { useApp } from/g' "$file"
      sed -i '' 's/import { t } from.*translations.*;//g' "$file"
      sed -i '' 's/import { useTranslation.*useApp } from.*AppContext.*;//g' "$file"
      sed -i '' 's/import { useTranslation.*from.*useTranslation.*; import { useApp } from.*AppContext.*/import { useTranslation } from '\''..\/hooks\/useTranslation'\'';/g' "$file"
    fi
    
    # Handle cases where only t is imported
    if grep -q "import.*t.*from.*translations" "$file" && ! grep -q "useApp" "$file"; then
      sed -i '' 's/import { t } from.*translations.*/import { useTranslation } from '\''..\/hooks\/useTranslation'\'';/g' "$file"
    fi
    
    # Add useTranslation hook if component uses t()
    if grep -q "const.*=.*useApp()" "$file"; then
      sed -i '' 's/const { language } = useApp();/const translate = useTranslation();/g' "$file"
    elif grep -q "const.*useApp.*=" "$file"; then
      # If useApp is used for other purposes, add translate separately
      sed -i '' '/const.*useApp.*=/a\
  const translate = useTranslation();' "$file"
    else
      # If no useApp, add translate at the beginning of component
      sed -i '' '/const.*: React.FC.*= () => {/a\
  const translate = useTranslation();' "$file"
    fi
    
    # Replace all t(' with translate('
    sed -i '' "s/t('/translate('/g" "$file"
    
    # Remove , language) patterns but preserve placeholders
    sed -i '' "s/', language)/')/g" "$file"
    sed -i '' "s/', language,/', /g" "$file"
    
    echo "Completed: $file"
  fi
done

echo "Translation refactoring completed!"
echo "Please review the changes and test the application."