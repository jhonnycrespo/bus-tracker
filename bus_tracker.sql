/*
Navicat MySQL Data Transfer

Source Server         : local_mysql
Source Server Version : 50539
Source Host           : localhost:3306
Source Database       : bus_tracker

Target Server Type    : MYSQL
Target Server Version : 50539
File Encoding         : 65001

Date: 2017-11-14 21:16:47
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for record
-- ----------------------------
DROP TABLE IF EXISTS `record`;
CREATE TABLE `record` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plate` varchar(255) COLLATE utf8_unicode_ci NOT NULL DEFAULT '2609HAL',
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `persons_up` int(11) NOT NULL,
  `persons_down` int(11) NOT NULL,
  `initial_persons` int(11) NOT NULL,
  `date` date NOT NULL,
  `time` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
