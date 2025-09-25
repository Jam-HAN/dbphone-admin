# DBPhone Admin (Static GitHub Pages)
**빌드 없이** 바로 GitHub에 올려서 쓸 수 있는 관리자 메인 페이지입니다.  
데이터는 **Google Sheets + Apps Script Web App**에서 가져옵니다.

## 1) config.js 설정
`config.js`에서 `API_BASE`만 실제 배포 URL로 바꿔주세요.
```js
window.DBP_CONFIG = {
  API_BASE: "https://script.google.com/macros/s/PUT_YOUR_DEPLOY_ID/exec",
  AUTH_KEY: "" // (선택) 쓰기 API 보호용
};
```

## 2) 필요한 백엔드 엔드포인트 (Apps Script)
- `GET  /inventory/summary` → `{ ok:true, data:{ total, inboundToday, outboundToday, lowStock } }`
- `GET  /activation/summary` → `{ ok:true, data:{ today, pending, rejected, byAgent:[{name,count}] } }`
- `GET  /activation/recent?limit=20` → `{ ok:true, data:[ {처리일자,이름,전화,모델명,요금제,처리자,상태}, ... ] }`
- `GET  /tasks/pending?limit=20` → `{ ok:true, data:[ {createdAt,type,title,assignee,status}, ... ] }`
- `POST /inventory/intake` → body:{ 거래처, 입고지점, 바코드 } → `{ ok:true, parsed:{ 모델명, 색상, 일련번호 } }`

### CORS 헤더 예시 (GAS)
모든 응답에 아래 헤더가 포함되도록 처리하세요.
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 3) 사용법 (GitHub에 업로드)
1. 이 폴더 통째로 GitHub 저장소에 업로드
2. 저장소 → Settings → Pages → Deploy from a branch → (main / root 선택)
3. 수 분 후 `https://<username>.github.io/<repo>/` 에서 접속

## 4) 로컬 테스트 (선택)
브라우저로 `index.html`을 직접 열어도 되지만, CORS 정책으로 일부 API가 막힐 수 있습니다.  
가급적 GitHub Pages에서 테스트하세요.
