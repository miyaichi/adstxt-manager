const psl = require('psl');

function extractRootDomain(domain) {
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  const parsed = psl.parse(domain);
  if (parsed && 'domain' in parsed && parsed.domain) {
    return parsed.domain;
  }
  return domain;
}

console.log('Normal domain:', extractRootDomain('www.example.com'));
console.log('Complex domain:', extractRootDomain('blog.travel.co.uk'));
console.log('IP address:', extractRootDomain('192.168.1.1'));
console.log('With path:', extractRootDomain('www.example.com/path?query=123'));

