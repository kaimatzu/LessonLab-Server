-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 19, 2024 at 12:42 PM
-- Server version: 8.0.39-0ubuntu0.22.04.1
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
CREATE DATABASE IF NOT EXISTS `lessonlab_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `lessonlab_db`;

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
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_ModuleClosureTable`
--

CREATE TABLE `module_ModuleClosureTable` (
  `ModuleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Ancestor` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Descendant` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Depth` int NOT NULL,
  `Position` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Triggers `module_ModuleClosureTable`
--
DELIMITER $$
CREATE TRIGGER `delete_module_and_modulenodes` AFTER DELETE ON `module_ModuleClosureTable` FOR EACH ROW BEGIN
    IF OLD.Depth = 0 THEN
        -- Deletes all descendants nodes including itself for root nodes
        DELETE FROM module_ModuleNodes WHERE ModuleNodeID IN (
            SELECT Descendant FROM module_ModuleClosureTable
            WHERE ModuleID = OLD.ModuleID
        );
        -- Deletes the node itself
        DELETE FROM module_ModuleNodes WHERE ModuleNodeID = OLD.Descendant;
        DELETE FROM module_Modules WHERE ModuleID = OLD.ModuleID;
    ELSE
        DELETE FROM module_ModuleNodes WHERE ModuleNodeID IN (
            SELECT descendant FROM module_ModuleClosureTable 
            WHERE ancestor = OLD.Descendant AND ModuleID = OLD.ModuleID
        );
        -- Deletes the node itself
		DELETE FROM module_ModuleNodes WHERE ModuleNodeID = OLD.Descendant; 
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `module_ModuleNodes`
--

CREATE TABLE `module_ModuleNodes` (
  `ModuleNodeID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_Modules`
--

CREATE TABLE `module_Modules` (
  `ModuleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UserID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Pages`
--

CREATE TABLE `Pages` (
  `PageID` char(36) NOT NULL,
  `PageTitle` varchar(255) DEFAULT NULL,
  `Content` longtext,
  `LessonID` char(36) DEFAULT NULL,
  `PrevID` char(36) DEFAULT NULL,
  `NextID` char(36) DEFAULT NULL
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
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Specifications`
--

CREATE TABLE `Specifications` (
  `SpecificationID` char(36) NOT NULL,
  `Name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `Topic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `WritingLevel` enum('Elementary','High-school','College','Professional') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Elementary',
  `ComprehensionLevel` enum('Simple','Standard','Comprehensive') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Simple',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

-- --------------------------------------------------------

--
-- Table structure for table `Workspaces`
--

CREATE TABLE `Workspaces` (
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `WorkspaceName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UserID` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  ADD UNIQUE KEY `MaterialID` (`WorkspaceID`);

--
-- Indexes for table `module_ModuleClosureTable`
--
ALTER TABLE `module_ModuleClosureTable`
  ADD PRIMARY KEY (`Ancestor`,`Descendant`),
  ADD KEY `ModuleClosureTable_ibfk_2` (`Descendant`),
  ADD KEY `ModuleClosureTable_ibfk_3` (`ModuleID`);

--
-- Indexes for table `module_ModuleNodes`
--
ALTER TABLE `module_ModuleNodes`
  ADD PRIMARY KEY (`ModuleNodeID`);

--
-- Indexes for table `module_Modules`
--
ALTER TABLE `module_Modules`
  ADD PRIMARY KEY (`ModuleID`),
  ADD KEY `fk_user_id` (`UserID`);

--
-- Indexes for table `Pages`
--
ALTER TABLE `Pages`
  ADD PRIMARY KEY (`PageID`);

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
  ADD UNIQUE KEY `MaterialID` (`WorkspaceID`);

--
-- Indexes for table `Specifications`
--
ALTER TABLE `Specifications`
  ADD PRIMARY KEY (`SpecificationID`),
  ADD KEY `MaterialID` (`WorkspaceID`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `unique_username` (`Username`),
  ADD UNIQUE KEY `unique_email` (`Email`);

--
-- Indexes for table `Workspaces`
--
ALTER TABLE `Workspaces`
  ADD PRIMARY KEY (`WorkspaceID`),
  ADD KEY `Materials_ibfk_1` (`UserID`);

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
  ADD CONSTRAINT `ChatHistory_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Workspaces` (`WorkspaceID`);

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
  ADD CONSTRAINT `Documents_ibfk_1` FOREIGN KEY (`MaterialID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Lessons`
--
ALTER TABLE `Lessons`
  ADD CONSTRAINT `Lessons_ibfk_1` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_ModuleClosureTable`
--
ALTER TABLE `module_ModuleClosureTable`
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_1` FOREIGN KEY (`Ancestor`) REFERENCES `module_ModuleNodes` (`ModuleNodeID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_2` FOREIGN KEY (`Descendant`) REFERENCES `module_ModuleNodes` (`ModuleNodeID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_3` FOREIGN KEY (`ModuleID`) REFERENCES `module_Modules` (`ModuleID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_Modules`
--
ALTER TABLE `module_Modules`
  ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`);

--
-- Constraints for table `Questions`
--
ALTER TABLE `Questions`
  ADD CONSTRAINT `Questions_ibfk_1` FOREIGN KEY (`QuizID`) REFERENCES `Quizzes` (`QuizID`);

--
-- Constraints for table `Quizzes`
--
ALTER TABLE `Quizzes`
  ADD CONSTRAINT `Quizzes_ibfk_1` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Specifications`
--
ALTER TABLE `Specifications`
  ADD CONSTRAINT `Specifications_ibfk_1` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Workspaces`
--
ALTER TABLE `Workspaces`
  ADD CONSTRAINT `Workspaces_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
