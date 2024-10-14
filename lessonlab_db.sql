-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 14, 2024 at 05:47 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `AdditionalSpecifications`
--

CREATE TABLE IF NOT EXISTS `AdditionalSpecifications` (
  `AdditionalSpecID` char(36) NOT NULL,
  `SpecificationID` char(36) NOT NULL,
  `SpecificationText` text,
  `PrevID` char(36) DEFAULT NULL,
  `NextID` char(36) DEFAULT NULL,
  PRIMARY KEY (`AdditionalSpecID`),
  KEY `SpecificationID` (`SpecificationID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Answers`
--

CREATE TABLE IF NOT EXISTS `Answers` (
  `AnswerID` int NOT NULL AUTO_INCREMENT,
  `QuestionID` int DEFAULT NULL,
  `Content` text,
  PRIMARY KEY (`AnswerID`),
  KEY `QuestionID` (`QuestionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ChatHistory`
--

CREATE TABLE IF NOT EXISTS `ChatHistory` (
  `MessageID` char(36) NOT NULL,
  `Content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Role` enum('user','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'user',
  `Type` enum('standard','action') NOT NULL DEFAULT 'standard',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`MessageID`),
  KEY `ChatHistory_ibfk_1` (`WorkspaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Documents`
--

CREATE TABLE IF NOT EXISTS `Documents` (
  `DocumentID` char(36) NOT NULL,
  `DocumentName` varchar(255) DEFAULT NULL,
  `DocumentData` longblob,
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `DocumentType` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`DocumentID`),
  KEY `Documents_ibfk_1` (`WorkspaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_ModuleClosureTable`
--

CREATE TABLE IF NOT EXISTS `module_ModuleClosureTable` (
  `ModuleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Ancestor` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Descendant` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Depth` int NOT NULL,
  `Position` int NOT NULL,
  PRIMARY KEY (`Ancestor`,`Descendant`),
  KEY `ModuleClosureTable_ibfk_2` (`Descendant`),
  KEY `ModuleClosureTable_ibfk_3` (`ModuleID`)
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

CREATE TABLE IF NOT EXISTS `module_ModuleNodes` (
  `ModuleNodeID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreateAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ModuleID` char(36) NOT NULL,
  PRIMARY KEY (`ModuleNodeID`),
  KEY `module_ibfk_2` (`ModuleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_Modules`
--

CREATE TABLE IF NOT EXISTS `module_Modules` (
  `ModuleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `WorkspaceID` char(36) NOT NULL,
  PRIMARY KEY (`ModuleID`),
  KEY `fk_workspace_id` (`WorkspaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Questions`
--

CREATE TABLE IF NOT EXISTS `Questions` (
  `QuestionID` int NOT NULL AUTO_INCREMENT,
  `QuestionType` enum('ESSAY','MULTIPLE_CHOICE','BOOLEAN','NUMERIC') DEFAULT NULL,
  `QuizID` char(36) DEFAULT NULL,
  PRIMARY KEY (`QuestionID`),
  KEY `QuizID` (`QuizID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Quizzes`
--

CREATE TABLE IF NOT EXISTS `Quizzes` (
  `QuizID` char(36) NOT NULL,
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`QuizID`),
  UNIQUE KEY `MaterialID` (`WorkspaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Specifications`
--

CREATE TABLE IF NOT EXISTS `Specifications` (
  `SpecificationID` char(36) NOT NULL,
  `Name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `Topic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `WritingLevel` enum('Elementary','High-school','College','Professional') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Elementary',
  `ComprehensionLevel` enum('Simple','Standard','Comprehensive') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Simple',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`SpecificationID`),
  KEY `MaterialID` (`WorkspaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE IF NOT EXISTS `Users` (
  `UserID` char(36) NOT NULL,
  `UserType` enum('STUDENT','TEACHER') DEFAULT 'STUDENT',
  `Name` varchar(255) DEFAULT NULL,
  `Username` varchar(255) DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Tokens` int DEFAULT '0',
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `unique_username` (`Username`),
  UNIQUE KEY `unique_email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Workspaces`
--

CREATE TABLE IF NOT EXISTS `Workspaces` (
  `WorkspaceID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `WorkspaceName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UserID` char(36) DEFAULT NULL,
  PRIMARY KEY (`WorkspaceID`),
  KEY `Materials_ibfk_1` (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  ADD CONSTRAINT `ChatHistory_ibfk_1` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Documents`
--
ALTER TABLE `Documents`
  ADD CONSTRAINT `Documents_ibfk_1` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_ModuleClosureTable`
--
ALTER TABLE `module_ModuleClosureTable`
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_1` FOREIGN KEY (`Ancestor`) REFERENCES `module_ModuleNodes` (`ModuleNodeID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_2` FOREIGN KEY (`Descendant`) REFERENCES `module_ModuleNodes` (`ModuleNodeID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `module_ModuleClosureTable_ibfk_3` FOREIGN KEY (`ModuleID`) REFERENCES `module_Modules` (`ModuleID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_ModuleNodes`
--
ALTER TABLE `module_ModuleNodes`
  ADD CONSTRAINT `module_ibfk_2` FOREIGN KEY (`ModuleID`) REFERENCES `module_Modules` (`ModuleID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_Modules`
--
ALTER TABLE `module_Modules`
  ADD CONSTRAINT `fk_workspace_id` FOREIGN KEY (`WorkspaceID`) REFERENCES `Workspaces` (`WorkspaceID`) ON DELETE CASCADE ON UPDATE CASCADE;

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
