if (typeof window === 'undefined') {
  const globalEnv = process.env;

  const nextAuthKey = 'NEXTAUTH_URL';
  const nextauthUrl = globalEnv[nextAuthKey];
  if (nextauthUrl) {
    try {
      new URL(nextauthUrl);
    } catch (e) {
      console.warn('Invalid NEXTAUTH_URL found, sanitizing...');
      const vercelKey = 'VERCEL_URL';
      if (globalEnv[vercelKey]) {
        globalEnv[nextAuthKey] = `https://${globalEnv[vercelKey]}`;
      } else {
        globalEnv[nextAuthKey] = 'http://localhost:3000';
      }
    }
  }

  const appUrlKey = 'NEXT_PUBLIC_APP_URL';
  const publicAppUrl = globalEnv[appUrlKey];
  if (publicAppUrl) {
    try {
      new URL(publicAppUrl);
    } catch (e) {
      console.warn('Invalid NEXT_PUBLIC_APP_URL found, sanitizing...');
      const vercelKey = 'VERCEL_URL';
      if (globalEnv[vercelKey]) {
        globalEnv[appUrlKey] = `https://${globalEnv[vercelKey]}`;
      } else {
        globalEnv[appUrlKey] = 'http://localhost:3000';
      }
    }
  }
}
