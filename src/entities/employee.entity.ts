import { BaseEntity, type IBaseEntity } from "./core/base.entity.js";
import { Column } from "./core/column.decorator.js";
import { Table } from "./core/table.decorator.js";
 
export interface IEmployee extends IBaseEntity {
    name: string;
    position: string;
    department: string;
    salary: number;
}
 
@Table("employees")
export class Employee extends BaseEntity implements IEmployee {
    @Column() name: string;
    @Column() position: string;
    @Column() department: string;
    @Column() salary: number;
 
    constructor(employee: Record<string, any>) {
        super(employee);
        this.name       = employee["name"];
        this.position   = employee["position"];
        this.department = employee["department"];
        this.salary     = Number(employee["salary"]);  // pg returns DECIMAL as string
    }
}
 