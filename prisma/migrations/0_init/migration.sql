-- CreateTable
CREATE TABLE `customers` (
    `customerNumber` INTEGER NOT NULL,
    `customerName` VARCHAR(50) NOT NULL,
    `contactLastName` VARCHAR(50) NOT NULL,
    `contactFirstName` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `addressLine1` VARCHAR(50) NOT NULL,
    `addressLine2` VARCHAR(50) NULL,
    `city` VARCHAR(50) NOT NULL,
    `state` VARCHAR(50) NULL,
    `postalCode` VARCHAR(15) NULL,
    `country` VARCHAR(50) NOT NULL,
    `salesRepEmployeeNumber` INTEGER NULL,
    `creditLimit` DECIMAL(10, 2) NULL,

    INDEX `salesRepEmployeeNumber`(`salesRepEmployeeNumber`),
    PRIMARY KEY (`customerNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `employeeNumber` INTEGER NOT NULL,
    `lastName` VARCHAR(50) NOT NULL,
    `firstName` VARCHAR(50) NOT NULL,
    `extension` VARCHAR(10) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `officeCode` VARCHAR(10) NOT NULL,
    `reportsTo` INTEGER NULL,
    `jobTitle` VARCHAR(50) NOT NULL,

    INDEX `officeCode`(`officeCode`),
    INDEX `reportsTo`(`reportsTo`),
    PRIMARY KEY (`employeeNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offices` (
    `officeCode` VARCHAR(10) NOT NULL,
    `city` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `addressLine1` VARCHAR(50) NOT NULL,
    `addressLine2` VARCHAR(50) NULL,
    `state` VARCHAR(50) NULL,
    `country` VARCHAR(50) NOT NULL,
    `postalCode` VARCHAR(15) NOT NULL,
    `territory` VARCHAR(10) NOT NULL,

    PRIMARY KEY (`officeCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orderdetails` (
    `orderNumber` INTEGER NOT NULL,
    `productCode` VARCHAR(15) NOT NULL,
    `quantityOrdered` INTEGER NOT NULL,
    `priceEach` DECIMAL(10, 2) NOT NULL,
    `orderLineNumber` SMALLINT NOT NULL,

    INDEX `productCode`(`productCode`),
    PRIMARY KEY (`orderNumber`, `productCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `orderNumber` INTEGER NOT NULL,
    `orderDate` DATE NOT NULL,
    `requiredDate` DATE NOT NULL,
    `shippedDate` DATE NULL,
    `status` VARCHAR(15) NOT NULL,
    `comments` TEXT NULL,
    `customerNumber` INTEGER NOT NULL,

    INDEX `customerNumber`(`customerNumber`),
    PRIMARY KEY (`orderNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `customerNumber` INTEGER NOT NULL,
    `checkNumber` VARCHAR(50) NOT NULL,
    `paymentDate` DATE NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`customerNumber`, `checkNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productlines` (
    `productLine` VARCHAR(50) NOT NULL,
    `textDescription` VARCHAR(4000) NULL,
    `htmlDescription` MEDIUMTEXT NULL,
    `image` MEDIUMBLOB NULL,

    PRIMARY KEY (`productLine`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `productCode` VARCHAR(15) NOT NULL,
    `productName` VARCHAR(70) NOT NULL,
    `productLine` VARCHAR(50) NOT NULL,
    `productScale` VARCHAR(10) NOT NULL,
    `productVendor` VARCHAR(50) NOT NULL,
    `productDescription` TEXT NOT NULL,
    `quantityInStock` SMALLINT NOT NULL,
    `buyPrice` DECIMAL(10, 2) NOT NULL,
    `MSRP` DECIMAL(10, 2) NOT NULL,

    INDEX `productLine`(`productLine`),
    PRIMARY KEY (`productCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`salesRepEmployeeNumber`) REFERENCES `employees`(`employeeNumber`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`reportsTo`) REFERENCES `employees`(`employeeNumber`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`officeCode`) REFERENCES `offices`(`officeCode`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orderdetails` ADD CONSTRAINT `orderdetails_ibfk_1` FOREIGN KEY (`orderNumber`) REFERENCES `orders`(`orderNumber`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orderdetails` ADD CONSTRAINT `orderdetails_ibfk_2` FOREIGN KEY (`productCode`) REFERENCES `products`(`productCode`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customerNumber`) REFERENCES `customers`(`customerNumber`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`customerNumber`) REFERENCES `customers`(`customerNumber`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`productLine`) REFERENCES `productlines`(`productLine`) ON DELETE RESTRICT ON UPDATE RESTRICT;

