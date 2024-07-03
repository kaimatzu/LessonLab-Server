-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 03, 2024 at 08:14 AM
-- Server version: 8.0.37-0ubuntu0.22.04.3
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lessonlab_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `AdditionalSpecifications`
--

CREATE TABLE `AdditionalSpecifications` (
  `AdditionalSpecID` char(36) NOT NULL,
  `SpecificationID` char(36) NOT NULL,
  `SpecificationText` text,
  `PrevID` char(36) DEFAULT NULL,
  `NextID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `AdditionalSpecifications`
--

INSERT INTO `AdditionalSpecifications` (`AdditionalSpecID`, `SpecificationID`, `SpecificationText`, `PrevID`, `NextID`) VALUES
('362916b0-5435-41c5-a3a5-59646ae737e7', '4f436a28-146b-4923-b8ed-0c1c5842a375', 'hhhh', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Answers`
--

CREATE TABLE `Answers` (
  `AnswerID` int NOT NULL,
  `QuestionID` int DEFAULT NULL,
  `Content` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ChatHistory`
--

CREATE TABLE `ChatHistory` (
  `ChatID` int NOT NULL,
  `Message` text,
  `Role` enum('USER','SYSTEM') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'USER',
  `Timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `MaterialID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Classes`
--

CREATE TABLE `Classes` (
  `ClassID` char(36) NOT NULL,
  `TeacherID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ClassStudents`
--

CREATE TABLE `ClassStudents` (
  `StudentID` char(36) DEFAULT NULL,
  `ClassID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Documents`
--

CREATE TABLE `Documents` (
  `DocumentID` char(36) NOT NULL,
  `DocumentName` varchar(255) DEFAULT NULL,
  `DocumentData` longblob,
  `MaterialID` char(36) DEFAULT NULL,
  `DocumentType` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Lessons`
--

CREATE TABLE `Lessons` (
  `LessonID` char(36) NOT NULL,
  `MaterialID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `Lessons`
--

INSERT INTO `Lessons` (`LessonID`, `MaterialID`) VALUES
('819bc9c3-2838-4a5b-89e8-4b97948fdf26', '0b2d0251-a469-419f-bfd0-035664256a78');

-- --------------------------------------------------------

--
-- Table structure for table `Materials`
--

CREATE TABLE `Materials` (
  `MaterialID` char(36) NOT NULL,
  `MaterialName` varchar(255) DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UserID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `Materials`
--

INSERT INTO `Materials` (`MaterialID`, `MaterialName`, `CreatedAt`, `UserID`) VALUES
('0b2d0251-a469-419f-bfd0-035664256a78', 'Test Lesson', '2024-07-02 09:09:46', '4444bb63-7212-4c3d-a031-836355e6c630'),
('67d30e08-11ae-4a04-9c86-3b2cf23a16de', 'Test Quiz', '2024-07-02 13:47:35', '4444bb63-7212-4c3d-a031-836355e6c630');

-- --------------------------------------------------------

--
-- Table structure for table `Pages`
--

CREATE TABLE `Pages` (
  `PageID` int NOT NULL,
  `PageTitle` varchar(255) DEFAULT NULL,
  `Content` longtext,
  `LessonID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Questions`
--

CREATE TABLE `Questions` (
  `QuestionID` int NOT NULL,
  `QuestionType` enum('ESSAY','MULTIPLE_CHOICE','BOOLEAN','NUMERIC') DEFAULT NULL,
  `QuizID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Quizzes`
--

CREATE TABLE `Quizzes` (
  `QuizID` char(36) NOT NULL,
  `MaterialID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `Quizzes`
--

INSERT INTO `Quizzes` (`QuizID`, `MaterialID`) VALUES
('b569da5d-ebc1-427d-948c-c84bc7ef1ddf', '67d30e08-11ae-4a04-9c86-3b2cf23a16de');

-- --------------------------------------------------------

--
-- Table structure for table `Specifications`
--

CREATE TABLE `Specifications` (
  `SpecificationID` char(36) NOT NULL,
  `Name` varchar(255) NOT NULL,
  `Topic` varchar(255) NOT NULL,
  `WritingLevel` enum('Elementary','High-school','College','Professional') NOT NULL,
  `ComprehensionLevel` enum('Simple','Standard','Comprehensive') NOT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MaterialID` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `Specifications`
--

INSERT INTO `Specifications` (`SpecificationID`, `Name`, `Topic`, `WritingLevel`, `ComprehensionLevel`, `CreatedAt`, `MaterialID`) VALUES
('4f436a28-146b-4923-b8ed-0c1c5842a375', 'Update', 'Topic', 'College', 'Standard', '2024-07-02 09:09:46', '0b2d0251-a469-419f-bfd0-035664256a78'),
('da196736-6d6a-4ecb-b6f7-8f193953798d', 'HASHDAKJQW', '', 'Elementary', 'Simple', '2024-07-02 13:47:35', '67d30e08-11ae-4a04-9c86-3b2cf23a16de');

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `UserID` char(36) NOT NULL,
  `UserType` enum('STUDENT','TEACHER') DEFAULT 'STUDENT',
  `Name` varchar(255) DEFAULT NULL,
  `Username` varchar(255) DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Tokens` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`UserID`, `UserType`, `Name`, `Username`, `Password`, `Email`, `Tokens`) VALUES
('2c2aef87-6fb4-416d-9320-cae8a6e1d80b', 'TEACHER', 'Teacher 1', 'testteacher', '$2a$10$pgX2b7i8olMA8B2gfw3/Mef7cP5fyCok34uLJJU.DwJ9jFIjVHGIC', 'teacher@email.com', 0),
('32e09da0-5cd2-4df3-b36a-e0e03fc77f3a', 'TEACHER', 'Karl', 'karlito', '$2a$10$/7mQc4d8eYiGtvDPYZ8rpOzOyRSpV9oBonNNncmeZLc5FXV853Fj6', 'karl@gmail.com', 0),
('4444bb63-7212-4c3d-a031-836355e6c630', 'STUDENT', 'John Doe', 'johndoe', '$2a$10$g6neBEM8KLSX.5bQQowMqubj7UXY64034GjXTX4DH3iabcgUHvq/m', 'johndoe@example.com', 0),
('ea9aa28d-239a-4aa6-a2b7-6e92d2f30ce6', 'STUDENT', 'John Doe 2', 'johndoe2', '$2a$10$cKkEGiIzcQq9/9dIAxBUde7jmSofBkZ.DoLs5fY5bGS54KIO91qay', 'johndoe2@example.com', 0),
('f3dded87-4916-410e-8331-c687ee98132e', 'TEACHER', 'kkkk', 'kkkk', '$2a$10$0XJRDLpgqWdIsUyr.JtYluwNk98Binq48ZzsBbwlx6vEREE3W5doK', 'kkkk@email.com', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AdditionalSpecifications`
--
ALTER TABLE `AdditionalSpecifications`
  ADD PRIMARY KEY (`AdditionalSpecID`),
  ADD KEY `SpecificationID` (`SpecificationID`);

--
-- Indexes for table `Answers`
--
ALTER TABLE `Answers`
  ADD PRIMARY KEY (`AnswerID`),
  ADD KEY `QuestionID` (`QuestionID`);

--
-- Indexes for table `ChatHistory`
--
ALTER TABLE `ChatHistory`
  ADD PRIMARY KEY (`ChatID`),
  ADD KEY `MaterialID` (`MaterialID`);

--
-- Indexes for table `Classes`
--
ALTER TABLE `Classes`
  ADD PRIMARY KEY (`ClassID`),
  ADD KEY `TeacherID` (`TeacherID`);

--
-- Indexes for table `ClassStudents`
--
ALTER TABLE `ClassStudents`
  ADD UNIQUE KEY `unique_class_student` (`StudentID`,`ClassID`),
  ADD KEY `ClassID` (`ClassID`);

--
-- Indexes for table `Documents`
--
ALTER TABLE `Documents`
  ADD PRIMARY KEY (`DocumentID`),
  ADD KEY `Documents_ibfk_1` (`MaterialID`);

--
-- Indexes for table `Lessons`
--
ALTER TABLE `Lessons`
  ADD PRIMARY KEY (`LessonID`),
  ADD UNIQUE KEY `MaterialID` (`MaterialID`);

--
-- Indexes for table `Materials`
--
ALTER TABLE `Materials`
  ADD PRIMARY KEY (`MaterialID`),
  ADD KEY `Materials_ibfk_1` (`UserID`);

--
-- Indexes for table `Pages`
--
ALTER TABLE `Pages`
  ADD PRIMARY KEY (`PageID`),
  ADD KEY `Pages_ibfk_1` (`LessonID`);

--
-- Indexes for table `Questions`
--
ALTER TABLE `Questions`
  ADD PRIMARY KEY (`QuestionID`),
  ADD KEY `QuizID` (`QuizID`);

--
-- Indexes for table `Quizzes`
--
ALTER TABLE `Quizzes`
  ADD PRIMARY KEY (`QuizID`),
  ADD UNIQUE KEY `MaterialID` (`MaterialID`);

--
-- Indexes for table `Specifications`
--
ALTER TABLE `Specifications`
  ADD PRIMARY KEY (`SpecificationID`),
  ADD KEY `MaterialID` (`MaterialID`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `unique_username` (`Username`),
  ADD UNIQUE KEY `unique_email` (`Email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Answers`
--
ALTER TABLE `Answers`
  MODIFY `AnswerID` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ChatHistory`
--
ALTER TABLE `ChatHistory`
  MODIFY `ChatID` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Pages`
--
ALTER TABLE `Pages`
  MODIFY `PageID` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Questions`
--
ALTER TABLE `Questions`
  MODIFY `QuestionID` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AdditionalSpecifications`
--
ALTER TABLE `AdditionalSpecifications`
  ADD CONSTRAINT `AdditionalSpecifications_ibfk_1` FOREIGN KEY (`SpecificationID`) REFERENCES `Specifications` (`SpecificationID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Answers`
--
ALTER TABLE `Answers`
  ADD CONSTRAINT `Answers_ibfk_1` FOREIGN KEY (`QuestionID`) REFERENCES `Questions` (`QuestionID`);

--
-- Constraints for table `ChatHistory`
--
ALTER TABLE `ChatHistory`
  ADD CONSTRAINT `ChatHistory_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Materials` (`MaterialID`);

--
-- Constraints for table `Classes`
--
ALTER TABLE `Classes`
  ADD CONSTRAINT `Classes_ibfk_1` FOREIGN KEY (`TeacherID`) REFERENCES `Users` (`UserID`);

--
-- Constraints for table `ClassStudents`
--
ALTER TABLE `ClassStudents`
  ADD CONSTRAINT `ClassStudents_ibfk_1` FOREIGN KEY (`StudentID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClassStudents_ibfk_2` FOREIGN KEY (`ClassID`) REFERENCES `Classes` (`ClassID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Documents`
--
ALTER TABLE `Documents`
  ADD CONSTRAINT `Documents_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Materials` (`MaterialID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Lessons`
--
ALTER TABLE `Lessons`
  ADD CONSTRAINT `Lessons_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Materials` (`MaterialID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Materials`
--
ALTER TABLE `Materials`
  ADD CONSTRAINT `Materials_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Pages`
--
ALTER TABLE `Pages`
  ADD CONSTRAINT `Pages_ibfk_1` FOREIGN KEY (`LessonID`) REFERENCES `Lessons` (`LessonID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Questions`
--
ALTER TABLE `Questions`
  ADD CONSTRAINT `Questions_ibfk_1` FOREIGN KEY (`QuizID`) REFERENCES `Quizzes` (`QuizID`);

--
-- Constraints for table `Quizzes`
--
ALTER TABLE `Quizzes`
  ADD CONSTRAINT `Quizzes_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Materials` (`MaterialID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Specifications`
--
ALTER TABLE `Specifications`
  ADD CONSTRAINT `Specifications_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Materials` (`MaterialID`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
