// 개발용 브라우저 모킹 진입점. 클라이언트 공용 배럴(index.ts)에 msw/browser가 섞이지 않게 따로 공개한다.
export { startWorker } from './mocks/browser';
