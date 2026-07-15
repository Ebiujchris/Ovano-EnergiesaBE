import { SetMetadata } from '@nestjs/common';
import { PageKey } from '../../../common/page-permissions';

export const REQUIRE_PAGE_KEY = 'require_page';
export const REQUIRE_ANY_PAGE_KEY = 'require_any_page';

export const RequirePage = (page: PageKey) => SetMetadata(REQUIRE_PAGE_KEY, page);

export const RequireAnyPage = (...pages: PageKey[]) =>
  SetMetadata(REQUIRE_ANY_PAGE_KEY, pages);
