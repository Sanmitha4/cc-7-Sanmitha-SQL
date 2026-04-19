import { User } from "./entities/user.entity.js";
import { Employee } from "./entities/employee.entity.js";
import { DB } from "./entities/core/db.js";
import { MySqlDriver } from "./entities/drivers/mysql.drivers.js";
import { PostgreSqlDriver } from "./entities/drivers/postgresql.driver.js";

// ============ MySQL Test ============
console.log("\n========== MYSQL DATABASE TEST ==========\n");

const mysqlDriver = new MySqlDriver({
    host: 'localhost',
    user: 'user',
    password: 'user_password',
    database: 'my_orm_db'
});

DB.setDriver(mysqlDriver);
await mysqlDriver.connect();
console.log("✅ Connected to MySQL\n");

try {
    const newUser = new User({
        id: 1,
        name: 'John Doe',
        address: '123 Main St',
        dob: new Date('1990-01-01'),
        email: 'john.doe@example.com',
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 1
    });
    
    console.log("Creating and saving User...");
    await newUser.save();
    console.log("✅ User saved successfully!\n");

    console.log("Retrieving User by ID...");
    const foundUser = await User.findById(1);
    console.log("✅ User found:");
    console.log(foundUser);
    console.log();

    const newEmployee = new Employee({
        id: 1,
        name: 'Jane Smith',
        position: 'Software Engineer',
        department: 'Engineering',
        salary: 90000,
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 1
    });

    console.log("Creating and saving Employee...");
    await newEmployee.save();
    console.log("✅ Employee saved successfully!\n");

    console.log("Retrieving Employee by ID...");
    const foundEmployee = await Employee.findById(1);
    console.log("✅ Employee found:");
    console.log(foundEmployee);
    console.log();

} catch (error) {
    console.error("❌ MySQL Error:", error);
} finally {
    await mysqlDriver.disconnect();
    console.log("Disconnected from MySQL\n");
}

// ============ PostgreSQL Test ============
console.log("========== POSTGRESQL DATABASE TEST ==========\n");

const postgresDriver = new PostgreSqlDriver({
    host: 'localhost',
    port: 5432,
    user: 'postgres_user',
    password: 'postgres_password',
    database: 'postgres_orm_db'
});

DB.setDriver(postgresDriver);

try {
    await postgresDriver.connect();
    console.log("✅ Connected to PostgreSQL\n");

    const newUser = new User({
        id: 2,
        name: 'Jane Doe',
        address: '456 Oak Ave',
        dob: new Date('1992-05-15'),
        email: 'jane.doe@example.com',
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 1
    });

    console.log("Creating and saving User to PostgreSQL...");
    await newUser.save();
    console.log("✅ User saved to PostgreSQL successfully!\n");

    console.log("Retrieving User by ID from PostgreSQL...");
    const foundUser = await User.findById(2);
    console.log("✅ User found from PostgreSQL:");
    console.log(foundUser);
    console.log();

    const newEmployee = new Employee({
        id: 2,
        name: 'Bob Johnson',
        position: 'DevOps Engineer',
        department: 'Infrastructure',
        salary: 95000,
        createdAt: new Date(),
        createdBy: 1,
        updatedAt: new Date(),
        updatedBy: 1
    });

    console.log("Creating and saving Employee to PostgreSQL...");
    await newEmployee.save();
    console.log("✅ Employee saved to PostgreSQL successfully!\n");

    console.log("Retrieving Employee by ID from PostgreSQL...");
    const foundEmployee = await Employee.findById(2);
    console.log("✅ Employee found from PostgreSQL:");
    console.log(foundEmployee);
    console.log();

} catch (error) {
    console.error("❌ PostgreSQL Error:", error);
} finally {
    await postgresDriver.disconnect();
    console.log("Disconnected from PostgreSQL\n");
}

console.log("✅ All tests completed successfully!")
