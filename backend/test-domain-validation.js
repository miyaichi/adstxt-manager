const psl = require('psl');

// Test domains
const domains = [
  'example.com',          // root domain - should be valid
  'sub.example.com',      // subdomain - should be invalid
  'www.example.com',      // www subdomain - should be invalid
  'example.co.uk',        // UK domain - should be valid
  'sub.example.co.uk',    // UK subdomain - should be invalid
  'domain-with-dash.com', // domain with dash - should be valid
  'example.io',           // short TLD - should be valid
  'xn--bcher-kva.tld',    // IDN - should be valid
  'example',              // No TLD - should be invalid
  '192.168.1.1'           // IP address - should be invalid
];

domains.forEach(domain => {
  const isValid = psl.isValid(domain);
  const parsed = psl.parse(domain);
  
  const isRootDomain = isValid && 
                     parsed && 
                     'domain' in parsed && 
                     parsed.domain === domain;
  
  console.log(`Domain: ${domain}`);
  console.log(`  Valid: ${isValid}`);
  console.log(`  Parsed: ${JSON.stringify(parsed)}`);
  console.log(`  Is Root Domain: ${isRootDomain}`);
  console.log('---');
});

