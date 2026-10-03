import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 워크스페이스 패키지를 TS 소스 그대로 가져온다
  transpilePackages: ['@gbti/db'],
};

export default nextConfig;
