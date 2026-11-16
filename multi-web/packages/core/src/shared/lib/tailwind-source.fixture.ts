// CSS 소스 탐색 검증 전용 컴포넌트다. 앱 빌드 CSS가 core의 클래스를 수집하는지 확인한다. 세그먼트 공개 진입점에서는 내보내지 않는다.
export const TailwindSourceFixture = () => {
  return '<div class="z-[314159]">CSS source fixture</div>';
};
