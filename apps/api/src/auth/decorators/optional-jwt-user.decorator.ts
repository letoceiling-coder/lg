import { SetMetadata } from '@nestjs/common';

/** С @Public(): если передан Bearer JWT — заполняется `request.user`, ошибки нет. */
export const OPTIONAL_JWT_USER_KEY = 'optionalJwtUser';
export const OptionalJwtUser = () => SetMetadata(OPTIONAL_JWT_USER_KEY, true);
