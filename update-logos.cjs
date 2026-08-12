const fs = require('fs');
const files = [
  'client/src/pages/verify-email.tsx',
  'client/src/pages/user-register.tsx',
  'client/src/pages/user-login.tsx',
  'client/src/pages/user-layout.tsx',
  'client/src/pages/terms-of-service.tsx',
  'client/src/pages/privacy-policy.tsx',
  'client/src/pages/landing.tsx',
  'client/src/pages/forgot-password.tsx',
  'client/src/pages/beli.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('HeaderLogo')) {
    content = content.replace(/(import .*?;[\r\n]+)/, "$1import { HeaderLogo } from \"@/components/header-logo\";\n");
  }

  const regex1 = /<div className="w-8 h-8 rounded-lg bg-kv-primary-container flex items-center justify-center text-kv-on-primary-container">[\s\n]*<span className="material-symbols-outlined.*?>token<\/span>[\s\n]*<\/div>/g;
  content = content.replace(regex1, '<HeaderLogo size="sm" className="rounded-lg" />');

  const regex2 = /<div className="w-16 h-16 rounded-full bg-kv-primary-container flex items-center justify-center text-kv-on-primary-container flex-shrink-0">[\s\n]*<span className="material-symbols-outlined.*?>token<\/span>[\s\n]*<\/div>/g;
  content = content.replace(regex2, '<HeaderLogo size="xl" className="flex-shrink-0" />');

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
}
