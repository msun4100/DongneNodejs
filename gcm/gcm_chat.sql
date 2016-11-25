-- phpMyAdmin SQL Dump
-- version 4.4.10
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Generation Time: Feb 09, 2016 at 07:38 AM
-- Server version: 5.5.42
-- PHP Version: 5.6.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `gcm_chat`
--

-- --------------------------------------------------------

--
-- Table structure for table `chat_rooms`
--

CREATE TABLE `chat_rooms` (
  `chat_room_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `chat_rooms`
--

INSERT INTO `chat_rooms` (`chat_room_id`, `name`, `created_at`) VALUES
(1, 'Material Design', '2016-01-06 06:57:40'),
(2, 'Android Snackbar', '2016-01-06 06:57:40'),
(3, 'Google Cloud Messaging', '2016-01-06 06:57:40'),
(4, 'Android Marshmallow', '2016-01-06 06:57:40'),
(5, 'Wallpapers App', '2016-01-06 06:57:40'),
(6, 'Android Support Design Library', '2016-01-06 06:58:46'),
(7, 'Android Studio', '2016-01-06 06:58:46'),
(8, 'Realtime Chat App', '2016-01-06 06:58:46');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL,
  `chat_room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `gcm_registration_id` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD PRIMARY KEY (`chat_room_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `chat_room_id` (`chat_room_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chat_rooms`
--
ALTER TABLE `chat_rooms`
  MODIFY `chat_room_id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=9;
--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=18;
--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=32;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms` (`chat_room_id`);

  
-- Custom queries
CREATE TABLE `univ` (
  `univ_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB, DEFAULT CHARSET=utf8;
  
CREATE TABLE `dept` (
  `dept_id` int(11) NOT NULL,
  `univ_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB, DEFAULT CHARSET=utf8;  

-- Indexes for table `chat_rooms`
--
ALTER TABLE `univ`
  ADD PRIMARY KEY (`univ_id`);
  
ALTER TABLE `dept`
  ADD PRIMARY KEY (`dept_id`),
  ADD UNIQUE KEY `dept_idx1` (`univ_id`, `name`);
  

ALTER TABLE `univ`
  MODIFY `univ_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `dept`
  MODIFY `dept_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `dept`
  ADD CONSTRAINT `dept_ibfk_2` FOREIGN KEY (`univ_id`) REFERENCES `univ` (`univ_id`) ON DELETE CASCADE ON UPDATE CASCADE;
  
INSERT INTO `univ` (`name`) VALUES
('인하대'),
('서울대'),
('세종대'),
('한양대');

INSERT INTO `dept` (`univ_id`, `name`) VALUES
(1, '컴퓨터공학'),
(1, '컴퓨터정보공학'),
(1, '컴퓨터정보공학과'),
(1, '컴공'),
(1, '호텔경영'),
(1, '경영학과'),
(1, '정보통신공학과'),
(2, '컴퓨터공학'),
(2, '컴퓨터정보공학'),
(2, '컴퓨터정보공학과'),
(2, '컴공'),
(2, '호텔경영'),
(2, '호텔경영학과'),
(2, '경영학과'),
(2, '호텔관광경영');
--end of sql queries---------------------------------------------------------------




-- -- 채팅 관련 쿼리들 (이 부분은 복사해서 수행하면 안 됨.)
-- -- 라스트메시지 구하기
-- SELECT chat_room_id, message, message_id, m.created_at
-- FROM  `messages` as m
-- WHERE m.created_at = (select MAX(m2.created_at) from `messages` as m2 GROUP BY m2.chat_room_id HAVING m2.chat_room_id = m.chat_room_id)
-- ORDER BY m.created_at DESC

-- -- 챗룸리스트 + 라스트메시지 보내기
-- SELECT c.chat_room_id, m.message AS last_msg, m.message_id, m.created_at
-- FROM  `chat_rooms` as c LEFT JOIN `messages` as m ON c.chat_room_id = m.chat_room_id
-- WHERE m.created_at = (select MAX(m2.created_at) from `messages` as m2 GROUP BY m2.chat_room_id HAVING m2.chat_room_id = m.chat_room_id)
-- ORDER BY m.created_at DESC

-- -- 언리드 카운트 구하기
-- SELECT chat_room_id, message_id, message, created_at, COUNT( message_id ) AS unread_count
-- FROM  `messages` 
-- WHERE created_at >  '2016-11-11 06:25:16'
-- GROUP BY chat_room_id

-- -- 챗룸리스트 + 라스트메시지 + 언리드카운트
-- SELECT c.chat_room_id, m.message AS last_msg, m.message_id, m.created_at
-- FROM  `chat_rooms` as c LEFT JOIN `messages` as m ON c.chat_room_id = m.chat_room_id
-- LEFT JOIN (SELECT chat_room_id, message_id, message, created_at, COUNT( message_id ) AS unread_count
-- 	FROM  `messages` 
-- 	WHERE created_at >  '2016-11-11 06:25:16'
-- 	GROUP BY chat_room_id) as mm ON c.chat_room_id = mm.chat_room_id
-- WHERE m.created_at = (select MAX(m2.created_at) from `messages` as m2 GROUP BY m2.chat_room_id HAVING m2.chat_room_id = m.chat_room_id) AND c.chat_room_id = 10
-- ORDER BY m.created_at DESC
-- -- 챗룸+라스트메시지 구하고 언리드카운트 구한 테이블을 조인해서 생성.
-- -- 서버로 쿼리 옮길때 수정될 부분은 조인부분의 타임스탬프랑 웨어절의 c.chat_room_id = ?  