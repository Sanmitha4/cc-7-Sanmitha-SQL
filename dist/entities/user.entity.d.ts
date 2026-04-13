import { BaseEntity, type IBaseEntity } from "./base.entity.js";
export interface IUser extends IBaseEntity {
    name: string;
    address: string;
    dob: Date;
    email: string;
}
export declare class User extends BaseEntity implements IUser {
    name: string;
    address: string;
    dob: Date;
    email: string;
    constructor(user: IUser);
}
//# sourceMappingURL=user.entity.d.ts.map