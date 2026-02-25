# sesac-semi

## 개요

- 회사 내부 포털 시스템 (게시판, 공지)

## MVP

- 로그인
- 게시글 작성/조회
- 파일 업로드

## 추가 기능

- 관리자 페이지
- 채팅
    - DM (1:1)
    - 채팅방 (다수)

---

# Stack

## Application

### Frontend

**Vite + React (TypeScript)**

- AI를 최대한 활용할 예정 → 낮은 오류율과 많은 레퍼런스
- 짧은 시간 내 MVP 구현에 유리
- 빌드 결과물이 정적파일 → 빠른 배포/서빙

### Backend

**FastAPI (Python)**

- AI 활용 시 높은 생산성
- 직관적이고 빠른 API 설계
- gunicorn+uvicorn worker

**SQLAlchemy/SQLModel + Alembic (마이그레이션)**

**JWT 기반 인증**

## AWS Infra

### **Compute + Runtime**

**EC2 (Ubuntu)**

- systemd를 통한 프로세스 관리 (FastAPI)
- 컨테이너보다 낮은 구현 난이도

**Reverse Proxy (Nginx)**

- 정적 서빙 + FastAPI 프록시
- 직접 FastAPI를 띄우는 것보다 좋은 운영/보안/확장성
- :80 → /api 프록시 패스 → 127.0.0.1:8000

### Database

**PostgreSQL (EC2 내부)**

- RDS보다 EC2 내부 운영이 비용적 측면에서 유리
- 게시판 확장 시 PG의 쿼리/기능 범용성이 좋음
- EC2 내부 작동이기 때문에 백업 솔루션 필요
    - pg_dump 주기적 백업 → S3 업로드 (cron)
    - S3의 dump 다운로드 → psql로 복구
- 외부 공개 X (localhost만 사용)

### Object Storage

**S3 + Presigned URL**

- PUT presigned URL 발급 → 클라이언트가 S3에 직접 업로드 → 서버는 object key만 DB에 저장
- 서버가 파일을 직접 받지 않음 → 구현 단순
- EC2 내부 저장 회피
- 높은 확장성

## Operating / Config

### IAM

- EC2 Instance Profile (IAM Role) 부여
- s3: PutObject / s3: GetObject (prefix 제한 설정)

### IaC

**Terraform**

- 각종 AWS 리소스를 코드로 남겨 재활용 가능

### Elastic IP

**미사용**

- 비용 절약
- EC2 stop/start 시 Public IP 변경 가능 → 프론트 .env의 API_BASE_URL 갱신 필요

### CI / CD

**미구현 (수동 배포)**

- 높은 구현 리스크 (시간 부족)
- SSH로 Pull → systemd restart로 단순화

---

## **Day 1 체크리스트**

목표: **AWS에서 서비스 골격이 올라가고** http://<EC2_IP>/로 접근 시 프론트/백/프록시가 최소 동작

### **A. 로컬 준비**

- AWS CLI 로그인/프로파일 확인 (aws sts get-caller-identity)
    - 검증: 계정/ARN 출력
- 로컬에 Terraform 설치 확인 (terraform -version)
- 로컬 SSH 키 준비(이미 있으면 재사용)
    - 검증: ~/.ssh/<key> 존재, 권한 600
- 프로젝트 레포 구조 만들기
    - 예: infra/(terraform), backend/, frontend/, docs/

### **B. Terraform(최소 리소스만) – 인프라 생성**

> 기본 VPC 사용 전제
> 
- Provider 설정(리전, 자격증명)
- EC2용 Security Group 생성
    - 인바운드:
        - 22/tcp: 내 공인 IP만 허용(가능하면)
        - 80/tcp: 0.0.0.0/0
    - 아웃바운드:
        - all allow(기본)
    - 검증: SG가 생성되고 룰이 정확
- S3 버킷 생성
    - Public access block ON
    - 버킷 이름 고정(환경별 suffix)
    - 검증: 콘솔에서 버킷 존재, 퍼블릭 차단
- IAM Role(EC2 Instance Profile) 생성
    - EC2 AssumeRole 정책
    - S3 PutObject/GetObject 권한 **prefix 제한**(예: uploads/*)
    - 검증: Role 생성 + EC2에 attach 가능
- EC2 인스턴스 생성(최소 스펙)
    - Ubuntu 22.04 AMI
    - Key pair 연결
    - Instance Profile 연결(IAM Role)
    - 퍼블릭 서브넷(기본 VPC) + Public IP 부여
    - 검증: terraform apply 성공, output에 Public IP
- Terraform outputs 정리
    - ec2_public_ip
    - s3_bucket_name
    - 검증: terraform output로 값 확인

### **C. EC2 초기 세팅(수동)**

- SSH 접속 확인
    - 검증: ssh -i ... ubuntu@<ip> 접속 성공
- 패키지 업데이트
    - apt update && apt upgrade -y
- 기본 유틸 설치
    - git, curl, unzip, nginx, python3-venv, python3-pip
    - 검증: 각 커맨드 실행됨

### **D. Backend(최소 헬스체크) 배포**

- /opt/app/backend 디렉토리 생성, 권한 정리
- FastAPI 최소 앱 생성
    - /api/health → 200 JSON
    - 검증: EC2에서 curl 127.0.0.1:8000/api/health 200
- gunicorn+uvicorn 설치 및 실행 확인
    - 검증: gunicorn으로 기동, 응답 OK
- systemd 서비스 작성
    - backend.service
    - Restart=always
    - WorkingDirectory, ExecStart 정확
    - 검증:
        - systemctl start backend
        - systemctl status backend active
        - 재부팅 후 자동 기동(reboot 후 status)

### **E. Nginx 프록시 최소 구성**

- Nginx에서 /api 프록시 설정
    - location /api { proxy_pass http://127.0.0.1:8000; ... }
    - 검증: 외부에서 curl http://<ip>/api/health 200
- (선택) 기본 루트 /는 임시 index.html
    - 검증: http://<ip>/ 접속 시 화면 뜸

### **Day 1 완료 기준(필수)**

- http://<EC2_IP>/api/health가 **브라우저에서 200**
- systemctl status backend **active**
- Terraform 리소스가 재현 가능(코드로 다시 만들 수 있음)

---

## **Day 2 체크리스트**

목표: **PostgreSQL + 게시글 CRUD(백/프론트) 동작**

### **A. PostgreSQL 설치/보안 기본**

- PostgreSQL 설치
- DB/유저 생성
    - 예: db=intra, user=app, pw=...
- 외부 공개 금지 확인
    - listen_addresses='localhost'
    - pg_hba.conf 로컬만 허용
    - 검증: 외부에서 5432 접속 불가(기본)
- 연결 확인
    - 검증: EC2에서 psql -U app -d intra -h 127.0.0.1

### **B. Backend DB 연결 + 마이그레이션**

- .env(또는 환경변수)로 DB URL 분리
- SQLAlchemy/SQLModel 적용
- Alembic 초기화
    - base metadata 연결
- 첫 마이그레이션 생성/적용
    - 검증: alembic upgrade head 성공, 테이블 생성 확인

### **C. 게시글 API 구현(최소)**

> 댓글/검색/관리자 제외
> 
- 모델: Post
    - 필드 예: id, title, content, created_at, updated_at, image_key(nullable)
- API
    - POST /api/posts
    - GET /api/posts (페이징은 있으면 좋지만 없으면 생략 가능)
    - GET /api/posts/{id}
    - PUT /api/posts/{id}
    - DELETE /api/posts/{id}
- 입력 검증(Pydantic) 최소 적용
- 예외 처리(404 등) 최소 적용
- API 문서 확인(/docs)
    - 검증: 외부에서 http://<ip>/api/docs 접근 가능(보안상 추후 막아도 됨)

### **D. Frontend(React) 최소 UI**

- Vite+React 프로젝트 생성(로컬)
- .env로 VITE_API_BASE_URL 분리
    - 값: http://<EC2_IP> (ElasticIP 없으니 바뀔 수 있음)
- 페이지/기능
    - 글 목록
    - 글 상세
    - 글 작성/수정 폼(최소)
- API 연동(fetch/axios)
    - 검증: 로컬에서 프론트 실행 시 EC2 API로 CRUD 가능

### **E. 프론트 배포(정적 빌드)**

- npm run build
- 빌드 산출물 EC2로 업로드 (dist/ 복사)
- Nginx로 정적 서빙 설정
    - / → dist/
    - SPA 라우팅이면 try_files $uri /index.html
    - 검증: http://<ip>/에서 프론트 화면 + CRUD 동작

### **Day 2 완료 기준(필수)**

- 웹에서 글 작성 → 목록/상세 조회가 **끝까지 동작**
- DB 테이블 생성/마이그레이션이 재현 가능(Alembic)
- DB는 외부 공개되지 않음(localhost만)

---

## **Day 3 체크리스트**

목표: **S3 이미지 업로드(프리사인드) + 로그인(최소) + 백업 1회 성공**

### **A. S3 업로드(서버는 presign만)**

- 버킷 CORS 설정(브라우저 PUT 허용)
    - AllowedMethods: PUT, GET(선택)
    - AllowedHeaders: 필요 헤더 포함
    - AllowedOrigins: 개발 중엔 http://localhost:5173 + http://<EC2_IP>
    - 검증: 프론트에서 S3 PUT 성공
- Backend: presigned PUT 발급 API
    - POST /api/uploads/presign → {url, key}
    - key 규칙 고정: uploads/<uuid>.<ext>
- Frontend: 업로드 플로우
    - 파일 선택 → presign 호출 → S3 PUT → key 확보
    - 글 작성/수정 요청에 image_key 포함
- 이미지 표시 정책 결정
    - (단순) public read는 비추
    - (권장) presigned GET 엔드포인트 추가
        - GET /api/uploads/presign-get?key=...
- 게시글 상세에서 이미지 표시
    - 검증: 업로드 후 상세 페이지에서 이미지 실제 로드

### **B. 로그인(JWT 최소 버전)**

> 3일 MVP 기준: “로그인만”, 회원가입/권한관리 제외 권장
> 
- DB: users 테이블
    - id, email, password_hash, created_at
- Backend: 로그인 API
    - POST /api/auth/login → JWT 발급
    - 보호 API 1개 이상 적용(예: POST /api/posts)
- Frontend: 로그인 화면 + 토큰 저장(단순화)
    - localStorage에 저장(3일 MVP 현실안)
    - 요청 시 Authorization 헤더 부착
- 검증: 로그인 전에는 글 작성 실패, 로그인 후 성공

### **C. 백업/복구 최소 실습(운영 연습 핵심)**

- pg_dump 수동 실행 1회
    - 파일 생성 확인
- S3로 업로드 1회
    - 검증: 버킷에 dump 파일 존재
- (가능하면) 복구 리허설(선택)
    - 테스트 DB에 restore 1회
    - 검증: 글 데이터 복구됨
- (시간 남으면) cron 등록
    - 매일 03:00 같은 고정 시간
    - 검증: crontab -l로 등록 확인

### **D. 문서화/마무리**

- Notion/README에 “재현 절차” 정리
    - terraform apply
    - EC2 프로비저닝 단계(수동 명령)
    - backend systemd
    - nginx 설정
    - S3 CORS/policy
- 트러블슈팅 로그(막힌 포인트와 해결) 5-10줄이라도 기록

### **Day 3 완료 기준(필수)**

- 글 작성 + 이미지 업로드 + 이미지 표시까지 **E2E 동작**
- 로그인(최소) 동작
- pg_dump→S3 백업 1회 성공(크론은 옵션)

---

## **실패 방지 “중요 제한선”(반드시 지키기)**

- Terraform으로 VPC/NAT까지 확장하지 않기(기본 VPC 사용)
- 업로드는 반드시 **presigned PUT**(서버 직접 업로드 금지)
- 기능 욕심 금지: 댓글/검색/관리자/채팅은 3일 범위 밖
- Elastic IP 미사용이므로 IP 바뀔 수 있음 → 프론트 .env로만 관리
