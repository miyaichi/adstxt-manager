#!/bin/bash

gh workflow list --json name,id | jq -c '.[]' | while read -r workflow; do
  WORKFLOW_NAME=$(echo "$workflow" | jq -r '.name')
  WORKFLOW_ID=$(echo "$workflow" | jq -r '.id')

  LATEST_RUN_ID=$(gh run list --workflow "$WORKFLOW_NAME" --limit 1 --json databaseId --jq '.[0].databaseId')

  if [ -n "$LATEST_RUN_ID" ] && [ "$LATEST_RUN_ID" != "null" ]; then
    echo "$LATEST_RUN_ID $WORKFLOW_NAME"
  fi
done
