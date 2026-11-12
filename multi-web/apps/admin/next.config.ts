import { createNextConfig } from '@repo/next-config';

import { env } from './src/shared/config';

// 공통 설정(모킹 플래그 고정, /backend rewrite, agentRules 등)은 @repo/next-config에 있다.
// 이 앱에만 필요한 설정은 두 번째 인자로 넘긴다.
export default createNextConfig(env);
