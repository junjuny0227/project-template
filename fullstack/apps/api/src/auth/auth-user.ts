// JwtStrategy.validate가 검증한 뒤 request.user에 넣는 로그인 사용자다.
// 토큰을 발급하는 코드가 클레임을 더하면 이 타입과 JwtStrategy.validate를 함께 넓힌다.
export interface AuthUser {
  sub: string;
}
