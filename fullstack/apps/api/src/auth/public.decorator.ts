import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

// 전역 JwtAuthGuard를 건너뛰는 공개 엔드포인트에만 붙인다.
export const Public = () => SetMetadata(PUBLIC_KEY, true);
