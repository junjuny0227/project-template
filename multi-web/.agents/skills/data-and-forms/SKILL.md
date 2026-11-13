---
name: data-and-forms
description: TanStack Query로 서버 데이터를 조회·변경하고 zod와 react-hook-form으로 폼을 만드는 이 프로젝트의 패턴. query key factory, 훅 네이밍, RSC prefetch와 HydrationBoundary, 무효화 범위, 폼 스키마 네이밍, mutation 제출, ApiError를 폼 에러로 바꾸는 법을 다룬다.
---

# data-and-forms

이 문서의 `src/`, `app/`, `@/` 경로는 웹 앱 기준이다. 단일 앱에서는 프로젝트 루트, 모노레포에서는 각 웹 앱 폴더(`apps/web/`, `apps/client/`, `apps/admin/`) 아래에 대응한다.

API 호출 자체(인스턴스, `get`/`post`…, `ApiError`)는 `AGENTS.md §API`에 있다. 이 스킬은 그 위에서 데이터를 다루는 방법이다. 아래 예의 `user`, `edit-profile`, `/users/:id`는 설명용 이름이며 템플릿에 없는 코드다.

## 어디에 두는가

| 무엇                           | 위치                                           |
| ------------------------------ | ---------------------------------------------- |
| 응답 타입                      | 소유 entity의 `model/`                         |
| URL 상수, query key factory    | 소유 entity의 `api/`                           |
| 조회 훅 (`useGet...`)          | 소유 entity의 `api/`                           |
| 서버 전용 조회 함수            | 소유 entity의 `api/`, `index.server.ts`로 공개 |
| 사용자 동작의 mutation 훅      | 그 동작을 담당하는 feature의 `api/`            |
| 폼 스키마와 요청 타입          | feature의 `model/`                             |
| 폼 컴포넌트                    | feature의 `ui/`                                |
| prefetch와 `HydrationBoundary` | `src/_pages/<slice>/ui/`의 페이지 컴포넌트     |

entity가 아직 없고 한 feature만 쓰는 데이터라면 feature 안에 둔다. 두 번째 소비처가 생기면 entity로 옮긴다.

## query key factory

리소스마다 factory 하나를 두고, 모든 key는 `all()`에서 시작하는 계층 배열로 만든다.

```ts
// src/entities/user/api/userQueryKeys.ts
export const userQueryKeys = {
  all: () => ['users'] as const,
  lists: () => [...userQueryKeys.all(), 'list'] as const,
  list: (params: { page: number }) => [...userQueryKeys.lists(), params] as const,
  details: () => [...userQueryKeys.all(), 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
};
```

- key를 문자열 배열로 직접 쓰지 않는다. 항상 factory를 거친다.
- 필터·페이지 같은 조회 조건은 key의 마지막 요소(객체)로 넣는다.

## 훅 네이밍

| 동작      | 이름                | TanStack 훅   |
| --------- | ------------------- | ------------- |
| 조회      | `useGet<리소스>`    | `useQuery`    |
| 생성      | `usePost<리소스>`   | `useMutation` |
| 부분 수정 | `usePatch<리소스>`  | `useMutation` |
| 전체 수정 | `usePut<리소스>`    | `useMutation` |
| 삭제      | `useDelete<리소스>` | `useMutation` |

HTTP 메서드와 이름을 맞춘다(`patch` 요청이면 `usePatch...`).

```ts
// src/entities/user/api/useGetUser.ts
import { useQuery } from '@tanstack/react-query';

import { get } from '@/shared/api';

import type { UserResponse } from '../model/types';
import { userQueryKeys } from './userQueryKeys';
import { USER_URL } from './userUrl';

export const useGetUser = (id: string) =>
  useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => get<UserResponse>(USER_URL.detail(id)),
  });
```

## RSC prefetch와 HydrationBoundary

첫 화면 데이터를 서버에서 미리 받아 클라이언트 캐시에 넣는다.

1. 서버 전용 조회 함수를 entity의 `index.server.ts`로 공개한다. 서버에서는 `/backend` 경로를 쓸 수 없으므로 `@/shared/api/index.server`의 메서드를 쓴다.

   ```ts
   // src/entities/user/api/getUserOnServer.ts
   import { get } from '@/shared/api/index.server';

   import type { UserResponse } from '../model/types';
   import { USER_URL } from './userUrl';

   export const getUserOnServer = (id: string) => get<UserResponse>(USER_URL.detail(id));
   ```

2. `src/_pages/<slice>/ui/`의 async Server Component에서 `@/shared/api`의 `getQueryClient()`로 QueryClient를 만들고, **클라이언트 훅과 같은 key**로 prefetch한 뒤 `HydrationBoundary`로 감싼다. 루트 `app/` 라우트는 페이지를 재수출만 한다.

   ```tsx
   // src/_pages/user/ui/UserPage.tsx
   import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

   import { UserDetails, userQueryKeys } from '@/entities/user';
   import { getUserOnServer } from '@/entities/user/index.server';
   import { getQueryClient } from '@/shared/api';

   export const UserPage = async ({ params }: PageProps<'/users/[id]'>) => {
     const { id } = await params;
     const queryClient = getQueryClient();

     await queryClient.prefetchQuery({
       queryKey: userQueryKeys.detail(id),
       queryFn: () => getUserOnServer(id),
     });

     return (
       <HydrationBoundary state={dehydrate(queryClient)}>
         <UserDetails userId={id} />
       </HydrationBoundary>
     );
   };

   // src/_pages/user/index.ts
   export { UserPage } from './ui/UserPage';

   // app/users/[id]/page.tsx
   export { UserPage as default } from '@/_pages/user';
   ```

3. 클라이언트 컴포넌트는 평소처럼 `useGetUser(id)`를 쓴다. 캐시에 데이터가 있고 `staleTime`(60초) 안이면 다시 요청하지 않는다.

- `prefetchQuery`는 `await`한다. 현재 QueryClient 설정은 진행 중인 쿼리를 dehydrate하지 않는다.
- 서버의 `getQueryClient()`는 호출할 때마다 새 인스턴스를 만든다. 페이지 컴포넌트에서 한 번만 불러 같은 인스턴스로 prefetch하고 dehydrate한다.
- `prefetchQuery`는 실패해도 throw하지 않는다. 실패하면 클라이언트 훅이 다시 요청하고, 그 에러는 훅의 `error`로 받는다.
- `UserDetails`는 `useGetUser(id)`를 사용하는 entity의 클라이언트 UI 예시다. prefetch·`HydrationBoundary`·데이터 가공·분기는 `_pages` 이하에 두고, 루트 라우트는 재수출만 한다.
- `getQueryClient`는 서버·클라이언트 공용이다. `@/shared/api` 배럴에는 `server-only`나 서버 환경 변수 import를 섞지 않는다.

## mutation과 무효화 범위

성공한 mutation은 **영향을 받는 가장 좁은 key**만 무효화한다.

```ts
// src/features/edit-profile/api/usePatchProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { USER_URL, userQueryKeys, type UserResponse } from '@/entities/user';
import { patch } from '@/shared/api';

import type { EditProfileRequest } from '../model/editProfileSchema';

export const usePatchProfile = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: EditProfileRequest) =>
      patch<UserResponse, EditProfileRequest>(USER_URL.detail(userId), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(userId) }),
  });
};
```

| 변경                  | 무효화할 key                                      |
| --------------------- | ------------------------------------------------- |
| 항목 하나의 필드 수정 | `detail(id)`, 목록에 그 필드가 보이면 `lists()`도 |
| 생성·삭제             | `lists()`                                         |
| 리소스 전체에 영향    | `all()`                                           |

- `onSuccess`에서 `invalidateQueries`의 Promise를 돌려준다. 그래야 다시 받아 올 때까지 mutation이 pending으로 남는다.
- 응답으로 최신 데이터를 받았고 그 key 하나만 바뀐다면 `setQueryData`로 바로 넣어도 된다.
- 근거 없이 `queryClient.invalidateQueries()`(전체)를 쓰지 않는다.

## 폼

zod 스키마가 검증과 타입을 함께 정한다.

```ts
// src/features/edit-profile/model/editProfileSchema.ts
import { z } from 'zod';

export const EditProfileSchema = z.object({
  nickname: z.string().trim().min(2, '닉네임은 2자 이상이어야 합니다.').max(20),
});

export type EditProfileRequest = z.infer<typeof EditProfileSchema>;
```

- 스키마는 `<동작/리소스>Schema`, 추론한 요청 타입은 `<동작/리소스>Request`으로 이름 짓는다. 스키마와 같은 요청 타입을 손으로 다시 쓰지 않는다.
- 에러 메시지는 사용자에게 보이는 한국어 문장으로 스키마에 둔다.

폼은 `zodResolver`로 스키마를 연결하고, 제출은 mutation으로 한다.

```tsx
// src/features/edit-profile/ui/EditProfileForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ApiError } from '@/shared/api';

import { usePatchProfile } from '../api/usePatchProfile';
import { type EditProfileRequest, EditProfileSchema } from '../model/editProfileSchema';

interface EditProfileFormProps {
  userId: string;
  defaultValues: EditProfileRequest;
}

// 서버 에러 code를 필드에 연결한다. 없는 code는 폼 전체 에러로 보여 준다.
const FIELD_BY_ERROR_CODE: Partial<Record<string, keyof EditProfileRequest>> = {
  NICKNAME_TAKEN: 'nickname',
};

export const EditProfileForm = ({ userId, defaultValues }: EditProfileFormProps) => {
  const { mutateAsync, isPending } = usePatchProfile(userId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(EditProfileSchema),
    defaultValues,
  });

  const onSubmit = async (values: EditProfileRequest) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      const field = FIELD_BY_ERROR_CODE[error.code];
      setError(field ?? 'root.server', { message: error.message });
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <label htmlFor="nickname">닉네임</label>
      <input id="nickname" {...register('nickname')} aria-invalid={Boolean(errors.nickname)} />
      {errors.nickname && <p role="alert">{errors.nickname.message}</p>}
      {errors.root?.server && <p role="alert">{errors.root.server.message}</p>}
      <button type="submit" disabled={isPending}>
        저장
      </button>
    </form>
  );
};
```

- `useForm`에 제네릭을 직접 주지 않는다. `zodResolver(Schema)`에서 입력·출력 타입이 추론된다.
- `onSubmit={handleSubmit(onSubmit)}`는 Promise를 돌려주는 함수라서 ESLint `no-misused-promises`에 걸린다. 위처럼 `void`로 감싼다.
- `ApiError`가 아닌 에러는 삼키지 않고 다시 던진다.
- `ApiError`에는 필드별 에러 목록이 없다. 필드에 연결할 수 있는 것은 `code`뿐이므로 `code → 필드` 표를 폼 옆에 둔다. API가 필드별 에러를 준다면 `toApiError`를 넓힐지 먼저 사용자와 정한다.
- 401은 인터셉터의 `onUnauthorized`가 처리한다. 폼에서 따로 로그인 이동을 하지 않는다.
- 접근성: 입력마다 `label`을 연결하고, 에러는 `aria-invalid`와 `role="alert"`로 알린다.

## 테스트

- query key factory와 스키마는 순수 함수라 단위 테스트가 쉽다. 경계 값(빈 문자열, 최대 길이)을 확인한다.
- 폼 컴포넌트 테스트는 Testing Library로 입력·제출하고, mutation 함수는 모듈 mock으로 바꾼다. 네트워크에 의존하지 않는다.
