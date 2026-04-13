import { BaseEntity, type IBaseEntity } from "./base.entity.js";
export interface IEmployee extends IBaseEntity {
    name: string;
    position: string;
    department: string;
    salary: number;
}
export declare class Employee extends BaseEntity implements IEmployee {
    name: string;
    position: string;
    department: string;
    salary: number;
    constructor(employee: IEmployee);
}
//# sourceMappingURL=employee.entity.d.ts.map