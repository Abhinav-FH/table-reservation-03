/*
  Warnings:

  - You are about to drop the column `owner_id` on the `refresh_tokens` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `fk_refresh_admin`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `fk_refresh_customer`;

-- DropIndex
DROP INDEX `refresh_tokens_owner_id_owner_type_idx` ON `refresh_tokens`;

-- AlterTable
ALTER TABLE `refresh_tokens` DROP COLUMN `owner_id`,
    ADD COLUMN `admin_id` BIGINT NULL,
    ADD COLUMN `customer_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
