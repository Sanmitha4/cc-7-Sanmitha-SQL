import { BaseEntity, type IBaseEntity } from "./core/base.entity.js";
import { Column } from "./core/column.decorator.js";
import { Table } from "./core/table.decorator.js";

export interface IUser extends IBaseEntity {
    name: string;
    address: string;
    dob: Date;
    email: string;
}

@Table("users")
export class User extends BaseEntity implements IUser {
    @Column()
    name: string;

    @Column()
    address: string;

    // DB column is date_of_birth; raw SELECT rows come back with that key
    @Column("date_of_birth")
    dob: Date;

    @Column()
    email: string;

    constructor(user: Record<string, any>) {
        super(user);
        this.name    = user["name"];
        this.address = user["address"];
        // Accept either the TS name (dob) or the raw DB column name (date_of_birth)
        this.dob     = user["dob"] ?? user["date_of_birth"];
        this.email   = user["email"];
    }
}