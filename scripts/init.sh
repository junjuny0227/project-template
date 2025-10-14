#!/bin/bash

echo "Next.js 프로젝트 템플릿 설정을 시작합니다."
echo "사용할 아키텍처를 선택해주세요."
echo

options=("layered" "fsd")
selected=0
total=${#options[@]}

tput civis

print_options() {
  local idx=0
  for opt in "${options[@]}"; do
    if [ $idx -eq $selected ]; then
      echo -e "\033[32m> $opt\033[0m"
    else
      echo "  $opt"
    fi
    idx=$((idx + 1))
  done
}

while true; do
  tput sc
  
  print_options
  
  read -sn1 key

  tput rc
  for ((i=0; i<$total; i++)); do
    tput el
    tput cud1
  done
  tput rc

  case $key in
    "A")
      if [ $selected -gt 0 ]; then
        selected=$((selected - 1))
      fi
      ;;
    "B")
      if [ $selected -lt $((total - 1)) ]; then
        selected=$((selected + 1))
      fi
      ;;
    "")
      STRUCTURE=${options[$selected]}
      break
      ;;
  esac
done

tput cnorm

echo "선택된 아키텍처: $STRUCTURE"
echo

echo "[1/4] $STRUCTURE 아키텍처 구조를 복사하는 중..."
mkdir -p src
cp -R "./architecture/$STRUCTURE/src/"* ./src/
echo "$STRUCTURE 구조 복사 완료."
echo

spinner() {
  local frames='-\|/'
  local pid=$1
  local i=0
  tput civis
  while kill -0 $pid 2>/dev/null; do
    i=$(( (i+1) % ${#frames} ))
    printf "\r[2/4] pnpm으로 패키지를 설치하는 중... %c" "${frames:$i:1}"
    sleep 0.1
  done
  tput cnorm
  printf "\n"
}

pnpm install > pnpm.log 2>&1 &
pid=$!

spinner $pid

wait $pid
if [ $? -ne 0 ]; then
  echo "패키지 설치 중 오류가 발생했습니다. pnpm.log 파일을 확인해주세요."
  exit 1
else
  rm -f pnpm.log
  echo "패키지 설치 완료."
fi
echo

if [ ! -f ".env.local" ]; then
  echo "[3/4] 환경 변수 파일(.env.local) 생성 중..."
  echo "NEXT_PUBLIC_API_BASE_URL=api_base_url" > .env.local
  echo "환경 변수 파일 생성 완료."
else
  echo "[3/4] .env.local 파일이 이미 존재하므로 생성하지 않습니다."
fi
echo

echo "[4/4] 설정 파일 정리 중..."
rm -rf ./architecture
rm -rf ./scripts
echo "정리 완료."
echo

echo "설정이 완료되었습니다."
echo ".env.local 파일의 환경 변수를 실제 값으로 수정해주세요."
echo "이제 'pnpm dev' 명령어로 개발 서버를 시작할 수 있습니다."
