// import mysql from 'mysql2/promise';
// export class AppDBManager {
//     private static instance: mysql.Pool | null = null;
//     private constructor() {}
//     public static getInstance(): mysql.Pool {
//         if (!AppDBManager.instance) {
//             console.log("Initializing Database Connection Pool...");
//             AppDBManager.instance = mysql.createPool({
//                 host: 'localhost',
//                 user: 'root',      
//                 password: 'my_sql',      
//                 database: 'sql_project', 
//                 waitForConnections: true,
//                 connectionLimit: 10,
//                 queueLimit: 0
//             });
//         }
//         return AppDBManager.instance;
//     }
// }
// export const db = AppDBManager.getInstance();
import mysql from 'mysql2/promise';
export class AppDBManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!AppDBManager.instance) {
            console.log("Initializing Database Connection Pool...");
            AppDBManager.instance = mysql.createPool({
                host: '127.0.0.1',
                user: 'root', // Replace with your MySQL username
                password: 'password', // Replace with your MySQL password
                database: 'codecraft_db', // Ensure this DB exists in MySQL
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
        }
        return AppDBManager.instance;
    }
}
//# sourceMappingURL=db.js.map