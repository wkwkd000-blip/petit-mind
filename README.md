# 키워라! 내 안의 쁘띠

픽셀 육성 시뮬레이션 게임. 정적 HTML/CSS/JavaScript로 동작하며, 인터넷 연결 없이도 로컬 기록과 엔딩 앨범을 사용할 수 있습니다. Supabase를 설정하면 성장 저장 데이터와 엔딩 앨범이 계정에 연결된 익명 프로필로 동기화됩니다.

## 로컬 실행

`index.html`을 브라우저에서 엽니다. Supabase를 설정하지 않아도 게임은 LocalStorage로 동작합니다. 외부 CDN과 Supabase를 사용하는 기능은 인터넷 연결이 필요합니다.

## Supabase 설정

1. Supabase 프로젝트를 만들고 Authentication에서 Anonymous Sign-Ins를 활성화합니다.
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. 프로젝트 URL과 anon/publishable key를 [`supabase-config.js`](supabase-config.js)에 입력합니다. `service_role` 키는 브라우저 코드에 넣지 않습니다.

테이블은 RLS를 사용하며 익명 로그인 사용자 본인의 저장 데이터와 엔딩만 읽고 쓸 수 있습니다. 계정 쿠키를 지우면 익명 프로필을 복구하기 어려우므로, 장기 계정 복구가 필요하면 Supabase 이메일/OAuth 로그인을 추가해야 합니다.

## Vercel 배포

GitHub 저장소를 Vercel에 연결하고 Framework Preset은 **Other**, Build Command는 비우고 Output Directory는 `.`으로 둡니다. `index.html`, `portfolio.js`, `supabase-config.js`가 같은 디렉터리에 배포되어야 합니다. Supabase 미설정으로 배포해도 게임은 로컬 저장 모드로 동작합니다.

## 주요 기능

- 캐릭터 선택, 픽셀 성장 장면, 25개 활동과 직업 엔딩
- 호흡 게임의 실제 초록 신호, 반복 숫자 입력을 허용하는 기억 게임, Web Audio 기반 청각 게임
- 정답을 단정하지 않는 가치관 기록과 다양한 스탯을 함께 반영하는 직업 추천
- 날짜별 성장 일기 및 메모, 엔딩 앨범
- LocalStorage 오프라인 저장 및 선택적 Supabase 동기화
