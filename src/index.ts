import "reflect-metadata";
import { User } from "./entities/user.entity.js";
import { Employee } from "./entities/employee.entity.js";
import { DB } from "./core/db.js";
import { MySqlDriver } from "./drivers/mysql.drivers.js";
import { PostgreSqlDriver } from "./drivers/postgresql.driver.js";

async function createMysqlSchema(driver: MySqlDriver): Promise<void> {
  await driver.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id            INT PRIMARY KEY,
            name          VARCHAR(255) NOT NULL,
            address       TEXT,
            date_of_birth DATE,
            email         VARCHAR(255),
            createdAt     DATETIME,
            createdBy     INT,
            updatedAt     DATETIME,
            updatedBy     INT
        )
    `);
  await driver.execute(`
        CREATE TABLE IF NOT EXISTS employees (
            id          INT PRIMARY KEY,
            name        VARCHAR(255) NOT NULL,
            position    VARCHAR(255),
            department  VARCHAR(255),
            salary      DECIMAL(10, 2),
            createdAt   DATETIME,
            createdBy   INT,
            updatedAt   DATETIME,
            updatedBy   INT
        )
    `);
  console.log(" MySQL schema ready\n");
}

async function createPostgresSchema(driver: PostgreSqlDriver): Promise<void> {
  await driver.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id            INT PRIMARY KEY,
            name          VARCHAR(255) NOT NULL,
            address       TEXT,
            date_of_birth DATE,
            email         VARCHAR(255),
            createdat     TIMESTAMP,
            createdby     INT,
            updatedat     TIMESTAMP,
            updatedby     INT
        )
    `);
  await driver.execute(`
        CREATE TABLE IF NOT EXISTS employees (
            id          INT PRIMARY KEY,
            name        VARCHAR(255) NOT NULL,
            position    VARCHAR(255),
            department  VARCHAR(255),
            salary      DECIMAL(10, 2),
            createdat   TIMESTAMP,
            createdby   INT,
            updatedat   TIMESTAMP,
            updatedby   INT
        )
    `);
  console.log("PostgreSQL schema ready\n");
}

// MySQL Test

console.log("\n========== MYSQL DATABASE TEST ==========\n");

const mysqlDriver = new MySqlDriver({
  host: "localhost",
  port: 3307,
  user: "user",
  password: "user_password",
  database: "my_orm_db",
});

DB.setDriver(mysqlDriver);
await mysqlDriver.connect();
console.log("Connected to MySQL\n");

try {
  await createMysqlSchema(mysqlDriver);

  const newUser = new User({
    id: 1,
    name: "John Doe",
    address: "123 Main St",
    dob: new Date("1990-01-01"),
    email: "john.doe@example.com",
    createdAt: new Date(),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
  });

  console.log("Creating and saving User (MySQL)...");
  await newUser.save();
  console.log("User saved successfully!\n");

  console.log("Retrieving User by ID (MySQL)...");
  const foundUser = await User.findById(1);
  console.log("User found:");
  console.log(foundUser);
  console.log();

  const newEmployee = new Employee({
    id: 1,
    name: "Jane Smith",
    position: "Software Engineer",
    department: "Engineering",
    salary: 90000,
    createdAt: new Date(),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
  });

  console.log("Creating and saving Employee (MySQL)...");
  await newEmployee.save();
  console.log("Employee saved successfully!\n");

  console.log("Retrieving Employee by ID (MySQL)...");
  const foundEmployee = await Employee.findById(1);
  console.log("Employee found:");
  console.log(foundEmployee);
  console.log();

  const userCount = await User.count();
  console.log(`Total users in MySQL: ${userCount}\n`);
} catch (error) {
  console.error(" MySQL Error:", error);
} finally {
  await mysqlDriver.disconnect();
  console.log("Disconnected from MySQL\n");
}

// PostgreSQL Test

console.log("========== POSTGRESQL DATABASE TEST ==========\n");

const postgresDriver = new PostgreSqlDriver({
  host: "localhost",
  port: 5432,
  user: "postgres_user",
  password: "postgres_password",
  database: "postgres_orm_db",
});

DB.setDriver(postgresDriver);

try {
  await postgresDriver.connect();
  console.log("Connected to PostgreSQL\n");

  await createPostgresSchema(postgresDriver);

  const newUser = new User({
    id: 2,
    name: "Jane Doe",
    address: "456 Oak Ave",
    dob: new Date("1992-05-15"),
    email: "jane.doe@example.com",
    createdAt: new Date(),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
  });

  console.log("Creating and saving User (PostgreSQL)...");
  await newUser.save();
  console.log("User saved to PostgreSQL successfully!\n");

  console.log("Retrieving User by ID (PostgreSQL)...");
  const foundUser = await User.findById(2);
  console.log("User found from PostgreSQL:");
  console.log(foundUser);
  console.log();

  const newEmployee = new Employee({
    id: 2,
    name: "Bob Johnson",
    position: "DevOps Engineer",
    department: "Infrastructure",
    salary: 95000,
    createdAt: new Date(),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
  });

  console.log("Creating and saving Employee (PostgreSQL)...");
  await newEmployee.save();
  console.log("Employee saved to PostgreSQL successfully!\n");

  console.log("Retrieving Employee by ID (PostgreSQL)...");
  const foundEmployee = await Employee.findById(2);
  console.log("Employee found from PostgreSQL:");
  console.log(foundEmployee);
  console.log();

  const userCount = await User.count();
  console.log(`Total users in PostgreSQL: ${userCount}\n`);
} catch (error) {
  console.error("PostgreSQL Error:", error);
} finally {
  await postgresDriver.disconnect();
  console.log("Disconnected from PostgreSQL\n");
}

console.log("All tests completed successfully!");
