import { IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  // Role values come from the portal's role <select>, which only offers ADMIN and MEMBER
  @IsString()
  role: string;
}
