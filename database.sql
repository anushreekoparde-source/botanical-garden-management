-- Database: `botanical_garden`
CREATE DATABASE IF NOT EXISTS `botanical_garden`;
USE `botanical_garden`;

-- Table structure for table `plants`
CREATE TABLE IF NOT EXISTS `plants` (
  `plant_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `scientific_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `quantity` INT DEFAULT 0,
  `location` VARCHAR(255) NOT NULL,
  `date_added` DATE NOT NULL,
  `image` VARCHAR(255) DEFAULT NULL
);

-- Table structure for table `staff`
CREATE TABLE IF NOT EXISTS `staff` (
  `staff_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `contact` VARCHAR(100) NOT NULL
);

-- Table structure for table `visitors`
CREATE TABLE IF NOT EXISTS `visitors` (
  `visitor_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `visit_date` DATE NOT NULL,
  `contact` VARCHAR(100) NOT NULL
);

-- Table structure for table `events`
CREATE TABLE IF NOT EXISTS `events` (
  `event_id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT NOT NULL
);

-- Table structure for table `admin`
CREATE TABLE IF NOT EXISTS `admin` (
  `admin_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL
);

-- Insert default admin user
-- Using simple MD5 for demonstration given simple backend requirement, but in real case should use password_hash
-- Here password is plain 'admin123' as requested, though I will structure PHP to check properly or we can insert plain and check plain for absolute simplicity.
INSERT INTO `admin` (`username`, `password`) VALUES ('admin', 'admin123') ON DUPLICATE KEY UPDATE `username`='admin';
