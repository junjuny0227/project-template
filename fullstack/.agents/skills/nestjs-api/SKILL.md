---
name: nestjs-api
description: NestJS API(`apps/api`)에 기능 모듈, 엔드포인트, DTO, Prisma 모델을 새로 만들거나 바꿀 때 쓴다. 파일·클래스 이름, 모듈 구조, REST 경로와 상태 코드, 검증, 예외, 인증, 설정, Prisma, 테스트의 기준과 예시를 담는다.
---

# nestjs-api

이 문서의 경로는 `apps/api/` 기준이다. 기준은 NestJS 공식 문서(Modules, Controllers, Providers, Validation, Exception filters, Mapped types, Configuration)와 Prisma 공식 문서, 널리 쓰이는 REST 관례다. 이 프로젝트에서 이미 정한 인프라 규칙(로깅, 예외 필터, JWT 가드, env 검증)은 `AGENTS.md`의 백엔드 절이 우선한다.

## 1. 모듈 구조

기능(리소스)마다 폴더 하나를 두고, 그 안에 모듈·컨트롤러·서비스·DTO를 모은다. `nest g resource`가 만드는 구조와 같다.

```text
src/
├── posts/
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   ├── posts.service.spec.ts
│   └── dto/
│       ├── create-post.dto.ts
│       ├── update-post.dto.ts
│       └── list-posts-query.dto.ts
├── auth/  common/  config/  health/  prisma/   ← 이미 있는 인프라
└── app.module.ts                               ← 새 모듈을 imports에 추가
```

| 파일              | 하는 일                                                           | 하지 않는 일                          |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------- |
| `*.controller.ts` | 경로·HTTP 메서드·상태 코드, 파라미터와 DTO 받기, 서비스 호출      | 비즈니스 규칙, Prisma 호출, try/catch |
| `*.service.ts`    | 비즈니스 규칙, 권한(소유자) 확인, Prisma 호출, 도메인 예외 던지기 | `Request`·`Response` 객체 다루기      |
| `*.module.ts`     | 컨트롤러·서비스 등록, 다른 모듈이 쓸 서비스만 `exports`           | 로직                                  |
| `dto/*.dto.ts`    | 요청 형태와 검증 규칙, Swagger 문서                               | 로직, Prisma 타입 재사용              |

- 다른 모듈의 기능이 필요하면 그 모듈을 `imports`에 넣고 `exports`된 서비스를 주입받는다. 다른 모듈의 파일을 직접 import해서 쓰지 않는다.
- 순환 의존(`forwardRef`)이 필요해지면 모듈 경계가 잘못된 신호다. 공통 부분을 새 모듈로 빼는 것을 먼저 검토한다.
- 리포지토리 계층은 따로 두지 않는다. Prisma Client가 이미 데이터 접근 계층이므로 서비스가 `PrismaService`를 직접 쓴다. 같은 쿼리가 여러 서비스에서 반복될 때만 분리를 검토한다.
- 로컬 import에는 `.js` 확장자를 붙인다(ESM).

## 2. 이름

| 대상                   | 규칙                                                 | 예                                                 |
| ---------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| 기능 폴더              | kebab-case, 리소스 복수형                            | `posts/`, `order-items/`                           |
| 파일                   | kebab-case + `.<종류>.ts`                            | `posts.service.ts`, `create-post.dto.ts`           |
| 클래스                 | PascalCase + 종류 접미사                             | `PostsService`, `CreatePostDto`                    |
| DTO                    | `<동작><대상>Dto`                                    | `CreatePostDto`, `ListPostsQueryDto`               |
| 컨트롤러·서비스 메서드 | camelCase 동사                                       | `findAll`, `findOne`, `create`, `update`, `remove` |
| 테스트                 | 단위 `*.spec.ts`(대상 옆), 통합 `test/*.e2e-spec.ts` | `posts.service.spec.ts`                            |

## 3. REST 경로와 상태 코드

- 경로는 리소스 명사의 복수형, kebab-case다: `/posts`, `/posts/:id`, `/order-items`. 동사를 넣지 않는다(`/getPosts` ❌).
- 하위 리소스는 한 단계만 중첩한다: `/posts/:postId/comments`. 더 깊어지면 최상위 리소스로 뺀다.
- CRUD로 표현되지 않는 동작은 `POST /posts/:id/publish`처럼 하위 경로의 동사로 둔다.
- JSON 필드는 camelCase다. 성공 응답은 래퍼(`{ data: ... }`) 없이 리소스를 그대로 돌려준다.

| 동작      | 메서드·경로         | 성공 상태 | 메서드 이름 |
| --------- | ------------------- | --------- | ----------- |
| 목록      | `GET /posts`        | 200       | `findAll`   |
| 단건      | `GET /posts/:id`    | 200       | `findOne`   |
| 생성      | `POST /posts`       | 201       | `create`    |
| 부분 수정 | `PATCH /posts/:id`  | 200       | `update`    |
| 삭제      | `DELETE /posts/:id` | 204       | `remove`    |

- Nest는 `POST`에 201, 나머지에 200을 기본으로 준다. 삭제는 `@HttpCode(HttpStatus.NO_CONTENT)`로 204를 명시하고 본문을 돌려주지 않는다.
- 전체 교체(`PUT`)는 정말 전체를 바꾸는 경우에만 쓴다. 일반 수정은 `PATCH`다.
- 목록은 처음부터 페이지네이션을 둔다. 기본은 `?page=1&limit=20`이고 `limit` 최댓값을 정한다. 무한 스크롤처럼 계속 이어지는 목록은 커서 방식(`?cursor=<id>&limit=20`)을 쓴다.

## 4. DTO와 검증

전역 `ValidationPipe`가 `whitelist`, `forbidNonWhitelisted`, `transform`을 켜고 암묵 변환은 끈다. 그래서 다음을 지킨다.

- **DTO의 모든 필드에 class-validator 데코레이터를 단다.** 데코레이터가 없는 필드는 화이트리스트 밖으로 취급되어, 그 필드를 보낸 요청이 400으로 거부된다.
- 선택 필드는 `@IsOptional()`을 함께 단다. 중첩 객체는 `@ValidateNested()`와 `@Type(() => 하위Dto)`를 쓴다.
- 쿼리 문자열은 모두 문자열로 들어온다. 숫자 쿼리는 `@Type(() => Number)`와 `@IsInt()`를 함께 단다.
- 경로 파라미터는 파이프로 검증한다: UUID는 `ParseUUIDPipe`, 정수는 `ParseIntPipe`.
- 수정 DTO는 `PartialType(CreatePostDto)`로 만든다. `@nestjs/swagger`에서 가져와야 Swagger 문서도 이어진다.
- Swagger CLI 플러그인을 켜지 않았으므로 문서에 나올 필드에는 `@ApiProperty()`·`@ApiPropertyOptional()`을 단다. 컨트롤러에는 `@ApiTags('posts')`를 단다.
- Prisma가 만든 타입을 요청 DTO로 쓰지 않는다. 검증 데코레이터를 달 수 없고, DB 구조가 그대로 API 계약이 된다.
- 응답에 비밀번호 해시, 토큰, 내부 플래그 같은 필드가 섞이지 않게 Prisma `select`로 돌려줄 필드를 고른다.

## 5. 예외

- 서비스에서 Nest 내장 예외를 던진다: `NotFoundException`(404), `BadRequestException`(400), `ConflictException`(409), `ForbiddenException`(403), `UnauthorizedException`(401). 메시지는 클라이언트에 보여도 되는 문장으로 쓴다.
- 컨트롤러에서 try/catch로 감싸지 않는다. 전역 `HttpExceptionFilter`가 모든 예외를 `{ status, code, message }`로 바꾸고 5xx는 stack과 함께 로그를 남긴다.
- Prisma 오류 중 예상할 수 있는 것은 서비스에서 HTTP 예외로 바꾼다. 나머지는 그대로 던져 500이 되게 한다.

  | Prisma 코드 | 뜻                        | 바꿀 예외             |
  | ----------- | ------------------------- | --------------------- |
  | `P2002`     | unique 제약 위반          | `ConflictException`   |
  | `P2025`     | 수정·삭제할 레코드가 없음 | `NotFoundException`   |
  | `P2003`     | 외래 키 대상이 없음       | `BadRequestException` |

- 오류를 잡아서 로그만 남기고 삼키지 않는다.
- 응답의 `code`는 지금 `HTTP_<status>`로 고정이다. 화면이 같은 상태 코드 안에서 원인을 나눠야 하면(예: 409 안에서 이메일 중복과 닉네임 중복) 예외 필터에 도메인 코드를 추가하는 작업을 먼저 사용자와 정한다.

## 6. 인증과 권한

- 전역 `JwtAuthGuard` 때문에 모든 엔드포인트는 기본적으로 로그인이 필요하다. `@Public()`은 로그인 없이 열어야 하는 엔드포인트에만 붙이고, 왜 공개인지 PR에 적는다.
- 로그인 사용자는 `@CurrentUser() user: AuthUser`로 받는다(`auth/auth-user.ts`). 컨트롤러마다 사용자 타입을 따로 선언하지 않는다. 요청 본문이나 쿼리로 받은 사용자 ID를 믿지 않는다.
- "로그인했는가"(인증)와 "이 리소스를 바꿀 수 있는가"(권한)는 다르다. 소유자 확인 같은 권한 검사는 서비스에서 한다. 남의 리소스는 존재를 숨겨야 하면 404, 숨길 필요가 없으면 403을 준다.

## 7. 설정, 로깅

- 설정은 `ConfigService.getOrThrow('KEY')`로 읽는다. `NODE_ENV`를 포함해 `process.env`를 직접 읽지 않는다. 새 변수는 `src/config/env.ts`의 `validateEnv`, `.env.example`, CI `env`에 함께 추가한다.
- 로그는 `PinoLogger`를 주입해서 남긴다. 메시지와 함께 맥락을 객체로 넘긴다: `this.logger.info({ postId }, '게시글 생성')`. 쿠키, 토큰, 비밀번호, 개인 정보 원문을 로그에 넣지 않는다.

## 8. Prisma

- 모델 이름은 PascalCase 단수(`Post`), 필드는 camelCase다. 테이블·컬럼을 snake_case로 두려면 `@@map("posts")`, `@map("created_at")`을 쓴다. 한 프로젝트 안에서 하나로 통일한다.
- 모든 모델에 `createdAt DateTime @default(now())`와 `updatedAt DateTime @updatedAt`을 둔다.
- 기본 키는 `String @id @default(uuid())`를 기본으로 한다. URL에 순번이 드러나지 않는다.
- 자주 조회·정렬하는 필드와 외래 키에 `@@index`를 둔다.
- 스키마를 바꾸면 `pnpm --filter @repo/api exec prisma migrate dev --name <변경-내용>`으로 migration을 만들고 함께 커밋한다. 이미 커밋된 migration 파일은 고치지 않고 새 migration을 만든다.
- 여러 테이블을 함께 쓰는 변경은 `this.prisma.$transaction(...)`으로 묶는다.
- `src/generated/prisma`는 생성 파일이다. 고치거나 커밋하지 않는다.

## 9. 예시

```prisma
// prisma/schema.prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
}
```

```ts
// src/posts/dto/create-post.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;
}
```

```ts
// src/posts/dto/update-post.dto.ts
import { PartialType } from '@nestjs/swagger';

import { CreatePostDto } from './create-post.dto.js';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

```ts
// src/posts/dto/list-posts-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListPostsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
```

```ts
// src/posts/posts.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { ListPostsQueryDto } from './dto/list-posts-query.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostsService } from './posts.service.js';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  findAll(@Query() query: ListPostsQueryDto) {
    return this.posts.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.posts.remove(user.sub, id);
  }
}
```

```ts
// src/posts/posts.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePostDto } from './dto/create-post.dto.js';
import type { ListPostsQueryDto } from './dto/list-posts-query.dto.js';
import type { UpdatePostDto } from './dto/update-post.dto.js';

const postSelect = {
  id: true,
  title: true,
  content: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll({ page, limit }: ListPostsQueryDto) {
    return this.prisma.post.findMany({
      select: postSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, select: postSelect });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return post;
  }

  create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({ data: { ...dto, authorId }, select: postSelect });
  }

  async update(userId: string, id: string, dto: UpdatePostDto) {
    await this.assertOwner(userId, id);
    return this.prisma.post.update({ where: { id }, data: dto, select: postSelect });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.post.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string) {
    const post = await this.findOne(id);
    if (post.authorId !== userId) throw new ForbiddenException('작성자만 바꿀 수 있습니다.');
  }
}
```

```ts
// src/posts/posts.module.ts
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({ imports: [PrismaModule], controllers: [PostsController], providers: [PostsService] })
export class PostsModule {}
```

- `PrismaService`를 쓰는 모듈은 `PrismaModule`을 `imports`에 넣는다(전역 모듈이 아니다).
- 새 모듈은 `app.module.ts`의 `imports`에 추가한다.

## 10. 테스트

- 서비스의 분기(없음 → 404, 남의 것 → 403, 중복 → 409)는 단위 테스트(`*.service.spec.ts`)로 확인한다. `PrismaService`는 필요한 메서드만 가진 가짜 객체로 바꾼다.
- 엔드포인트의 경로, 상태 코드, 검증(잘못된 본문 → 400, 로그인 없음 → 401)은 `test/*.e2e-spec.ts`에서 `supertest`로 확인한다. e2e는 Compose DB를 쓴다.
- 새 엔드포인트를 만들면 최소한 성공 1건과 검증 실패 1건, 공개 여부(401 또는 `@Public()` 동작)를 e2e로 남긴다.

## 11. 새 기능을 넣는 순서

1. Prisma 모델을 추가하고 migration을 만든다.
2. `src/<resource>/`에 DTO → 서비스 → 컨트롤러 → 모듈 순으로 만든다.
3. `app.module.ts`의 `imports`에 모듈을 추가한다.
4. 서비스 단위 테스트와 e2e를 추가한다.
5. 프로젝트 루트에서 `pnpm lint`, `pnpm check-types`, `pnpm test`, `pnpm test:e2e`를 실행한다.
6. `/docs`에서 새 엔드포인트와 DTO가 문서에 나오는지 확인한다.
