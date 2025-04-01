# Ads.txt Validation Warnings

This document describes all the validation warnings that may appear in the Ads.txt Manager application. Each warning includes an explanation of the issue and recommendations on how to fix it.

## Invalid Format Errors

<a id="invalid-format"></a>

### Invalid Format

**Description**: The format of the Ads.txt entry is invalid and could not be parsed correctly. Ads.txt entries must follow a specific comma-separated format.

**Recommendation**: Ensure the entry follows the format `domain.com, account_id, DIRECT|RESELLER, certification_authority_id`. The certification authority ID is optional.

---

<a id="missing-fields"></a>

### Missing Required Fields

**Description**: The Ads.txt entry is missing one or more required fields. At minimum, each entry must contain a domain, account ID, and account type.

**Recommendation**: Make sure your entry includes all required fields in the format `domain.com, account_id, DIRECT|RESELLER, certification_authority_id`.

---

## Relationship Warnings

<a id="invalid-relationship"></a>

### Invalid Relationship

**Description**: The relationship type specified in the Ads.txt entry is invalid. The relationship must be either DIRECT or RESELLER.

**Recommendation**: Change the relationship type to either DIRECT or RESELLER. DIRECT indicates that you have a direct business relationship with the specified advertising system. RESELLER indicates that you have a relationship with an intermediary.

---

<a id="misspelled-relationship"></a>

### Misspelled Relationship

**Description**: The relationship type appears to be misspelled (for example, "Direct" instead of "DIRECT").

**Recommendation**: Relationship types are case-sensitive and must be exactly DIRECT or RESELLER. Correct the spelling and capitalization.

---

## Domain Warnings

<a id="invalid-root-domain"></a>

### Invalid Root Domain

**Description**: The domain in the entry is not a valid root domain. Subdomains are not recommended in Ads.txt entries.

**Recommendation**: Use a root domain (e.g., example.com) instead of a subdomain (sub.example.com). This ensures proper validation with the sellers.json files.

---

<a id="empty-account-id"></a>

### Empty Account ID

**Description**: The account ID field is empty. Every Ads.txt entry must include an account ID.

**Recommendation**: Provide a valid account ID, which should be the publisher's ID in the advertising system's platform.

---

## Duplicate Entry Warnings

<a id="duplicate-entry"></a>

### Duplicate Entry

**Description**: An identical entry already exists in the Ads.txt file for the specified domain.

**Recommendation**: Remove the duplicate entry to avoid confusion and maintain a cleaner Ads.txt file.

---

<a id="duplicate-entry-case-insensitive"></a>

### Duplicate Entry (Case Insensitive)

**Description**: An entry with the same values but different capitalization already exists in the Ads.txt file.

**Recommendation**: Consolidate the entries into a single entry with consistent capitalization. While Ads.txt files are case-insensitive for validation purposes, keeping consistent formatting improves readability.

---

## Sellers.json Validation Warnings

<a id="no-sellers-json"></a>

### No Sellers.json File

**Description**: No sellers.json file was found for the specified advertising system domain.

**Recommendation**: This is an informational warning. The advertising system should provide a valid sellers.json file at the domain root. You can continue with the entry, but cross-validation with sellers.json is not possible.

---

<a id="direct-account-id-not-in-sellers-json"></a>

### DIRECT: Account ID Not in Sellers.json

**Description**: The account ID for a DIRECT relationship was not found in the advertising system's sellers.json file.

**Recommendation**: Verify the account ID is correct. If the relationship is truly DIRECT, the advertising system should include your publisher ID in their sellers.json file. Consider reaching out to the advertising system to update their sellers.json file.

---

<a id="reseller-account-id-not-in-sellers-json"></a>

### RESELLER: Account ID Not in Sellers.json

**Description**: The account ID for a RESELLER relationship was not found in the advertising system's sellers.json file.

**Recommendation**: Verify the account ID is correct. If you're using a reseller, their ID should be included in the advertising system's sellers.json file. Consider contacting the reseller to ensure they're properly registered with the advertising system.

---

<a id="domain-mismatch"></a>

### Domain Mismatch

**Description**: For a DIRECT relationship, the domain in your Ads.txt file doesn't match the domain listed for your publisher ID in the seller's sellers.json file.

**Recommendation**: For DIRECT relationships, the domain in your Ads.txt file should match the domain listed in the advertising system's sellers.json file for your publisher ID. Verify the correct domain with the advertising system.

---

<a id="direct-not-publisher"></a>

### DIRECT: Seller Not Marked as PUBLISHER

**Description**: For a DIRECT relationship, the seller type in the sellers.json file is not set to PUBLISHER.

**Recommendation**: For DIRECT relationships, the seller type in the advertising system's sellers.json file should be PUBLISHER. Contact the advertising system to update their sellers.json file if the relationship is truly direct.

---

<a id="seller-id-not-unique"></a>

### Seller ID Not Unique

**Description**: The seller ID (account ID) appears multiple times in the advertising system's sellers.json file.

**Recommendation**: This is unusual and may indicate an issue with the advertising system's sellers.json file. Contact the advertising system for clarification on which entry is correct for your relationship.

---

<a id="reseller-not-intermediary"></a>

### RESELLER: Seller Not Marked as INTERMEDIARY

**Description**: For a RESELLER relationship, the seller type in the sellers.json file is not set to INTERMEDIARY.

**Recommendation**: For RESELLER relationships, the seller type in the advertising system's sellers.json file should be INTERMEDIARY. Verify the relationship type with the reseller and contact the advertising system if necessary.

---

<a id="sellers-json-validation-error"></a>

### Sellers.json Validation Error

**Description**: An error occurred while validating against the advertising system's sellers.json file.

**Recommendation**: This is usually a temporary or technical error. You can proceed with the entry, but be aware that full validation against sellers.json was not possible. Consider retrying later.
